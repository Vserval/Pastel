# -*- coding: utf-8 -*-
import os
import re
import shutil
import tempfile
import traceback

import maya.cmds as cmds
import maya.api.OpenMaya as om2


def repair_parent_inserted_transforms(
    roots=None,
    cleanup_weight_files=True,
    verbose=True,
    max_passes=10,
):
    """
    Maya の joint-parent 時に挿入された余計な transform を自動修復します。

    想定している壊れ方:
        parentJoint
            insertedTransform   <- これを削除したい
                childJoint

    処理:
        1) 対象スケルトンに影響している skinCluster のウェイトを退避
        2) unbind
        3) bindPose を削除
        4) inserted transform を child joint の offsetParentMatrix に吸収しつつ再ペアレント
        5) 空になった inserted transform を削除
        6) skinCluster を再作成
        7) ウェイトを復元

    使い方:
        - ルート joint を選択して実行
        - または roots=["|root_jnt"] のように明示指定
    """
    if roots is None:
        roots = cmds.ls(sl=True, long=True, type='joint') or []

    roots = _unique_existing_long_names(roots)
    if not roots:
        raise RuntimeError(u'ルート joint を選択してください。')

    report = {
        "roots": roots,
        "skinClusters": [],
        "repairedTransforms": [],
        "weightDir": None,
        "passes": 0,
    }

    temp_dir = tempfile.mkdtemp(prefix="maya_skel_repair_")
    report["weightDir"] = temp_dir

    try:
        cmds.undoInfo(openChunk=True, chunkName='repair_parent_inserted_transforms')

        all_joints = _collect_joints_from_roots(roots)
        skin_data = _collect_related_skin_data(all_joints)
        report["skinClusters"] = [d["skinCluster"] for d in skin_data]

        if verbose:
            print(u'[INFO] joints: {}'.format(len(all_joints)))
            print(u'[INFO] related skinClusters: {}'.format(len(skin_data)))

        _export_and_unbind_skinclusters(skin_data, temp_dir, verbose=verbose)
        _delete_connected_bindposes(all_joints, verbose=verbose)

        # transform 親配下の root joint を含むケースで姿勢が崩れないよう、
        # スケルトン全体の Freeze Transform は行わない
        # _freeze_skeletons(roots, verbose=verbose)

        all_repaired = []

        for i in range(max_passes):
            bad_transforms = _find_inserted_transforms(roots)

            if verbose:
                print(u'[PASS {}] inserted transforms: {}'.format(i + 1, len(bad_transforms)))

            if not bad_transforms:
                report["passes"] = i + 1
                break

            repaired = _repair_inserted_transforms(bad_transforms, verbose=verbose)
            all_repaired.extend(repaired)

            # 何も直せなかったら無限ループ防止
            if not repaired:
                cmds.warning(u'これ以上修復できない transform が残っています。')
                report["passes"] = i + 1
                break
        else:
            report["passes"] = max_passes
            cmds.warning(u'max_passes に達しました。transform が残っている可能性があります。')

        report["repairedTransforms"] = _unique_existing_long_names(all_repaired)

        _delete_empty_inserted_transforms(roots, verbose=verbose)
        _rebind_and_restore_weights(skin_data, temp_dir, verbose=verbose)

        if verbose:
            remaining = _find_inserted_transforms(roots)
            print(u'[DONE] 修復完了')
            print(u'  repaired transforms : {}'.format(len(report["repairedTransforms"])))
            print(u'  remaining transforms: {}'.format(len(remaining)))
            print(u'  restored skinClusters: {}'.format(len(skin_data)))

        return report

    except Exception:
        traceback.print_exc()
        raise
    finally:
        try:
            cmds.undoInfo(closeChunk=True)
        except Exception:
            pass

        if cleanup_weight_files and report["weightDir"] and os.path.isdir(report["weightDir"]):
            shutil.rmtree(report["weightDir"], ignore_errors=True)


def _unique_existing_long_names(nodes):
    result = []
    seen = set()
    for n in nodes or []:
        if not cmds.objExists(n):
            continue
        long_name = cmds.ls(n, long=True) or []
        if not long_name:
            continue
        long_name = long_name[0]
        if long_name in seen:
            continue
        seen.add(long_name)
        result.append(long_name)
    return result


def _collect_joints_from_roots(roots):
    joints = []
    for root in roots:
        if cmds.nodeType(root) != 'joint':
            continue
        joints.append(root)
        descendants = cmds.listRelatives(root, ad=True, fullPath=True, type='joint') or []
        joints.extend(descendants)
    return _unique_existing_long_names(joints)


def _find_inserted_transforms(roots):
    """
    「joint の子なのに joint ではない transform / shapeなし / joint 子を持つ」を
    問題 transform とみなす。
    深い階層から処理したいので path 長の降順で返す。
    """
    candidates = []
    for root in roots:
        descendants = cmds.listRelatives(root, ad=True, fullPath=True, type='transform') or []
        for node in descendants:
            if not cmds.objExists(node):
                continue
            if cmds.nodeType(node) != 'transform':
                continue

            parent = cmds.listRelatives(node, parent=True, fullPath=True) or []
            if not parent:
                continue
            if cmds.nodeType(parent[0]) != 'joint':
                continue

            shapes = cmds.listRelatives(node, shapes=True, fullPath=True) or []
            if shapes:
                continue

            children = cmds.listRelatives(node, children=True, fullPath=True) or []
            if not children:
                continue

            joint_children = [c for c in children if cmds.nodeType(c) == 'joint']
            if not joint_children:
                continue

            candidates.append(node)

    candidates = _unique_existing_long_names(candidates)
    candidates.sort(key=lambda x: x.count('|'), reverse=True)
    return candidates


def _collect_related_skin_data(joints):
    joint_set = set(_unique_existing_long_names(joints))
    data = []

    for sc in cmds.ls(type='skinCluster') or []:
        sc_long = (cmds.ls(sc, long=True) or [sc])[0]

        try:
            influences = cmds.skinCluster(sc_long, q=True, influence=True) or []
        except Exception:
            continue

        influences = _unique_existing_long_names(influences)
        if not any(inf in joint_set for inf in influences):
            continue

        geos = cmds.skinCluster(sc_long, q=True, geometry=True) or []
        if not geos:
            continue

        geo_transforms = []
        for g in geos:
            if not cmds.objExists(g):
                continue
            if cmds.nodeType(g) in ('mesh', 'nurbsSurface', 'nurbsCurve', 'lattice'):
                parents = cmds.listRelatives(g, parent=True, fullPath=True) or []
                geo_transforms.append(parents[0] if parents else g)
            else:
                geo_transforms.append((cmds.ls(g, long=True) or [g])[0])

        item = {
            "skinCluster": sc_long,
            "skinClusterShort": sc,
            "fileName": _safe_file_name(sc) + ".xml",
            "influences": influences,
            "geometries": _unique_existing_long_names(geo_transforms),
            "maxInfluences": _safe_get_skin_attr(sc_long, "maximumInfluences", 5),
            "normalizeWeights": _safe_get_skin_attr(sc_long, "normalizeWeights", 1),
            "skinningMethod": _safe_get_attr(sc_long + ".skinningMethod", 0),
            "bindMethod": _safe_get_attr(sc_long + ".bindMethod", 0),
            "dropoffRate": _safe_get_attr(sc_long + ".dropoffRate", 4.0),
            "maintainMaxInfluences": _safe_get_attr(sc_long + ".maintainMaxInfluences", 0),
        }
        data.append(item)

    return data


def _safe_get_skin_attr(skin_cluster, query_flag, default):
    try:
        return cmds.skinCluster(skin_cluster, q=True, **{query_flag: True})
    except Exception:
        return default


def _safe_get_attr(attr, default):
    try:
        return cmds.getAttr(attr)
    except Exception:
        return default


def _safe_file_name(name):
    short_name = name.split('|')[-1]
    return re.sub(r'[^0-9A-Za-z_.-]+', '_', short_name)


def _export_and_unbind_skinclusters(skin_data, temp_dir, verbose=True):
    for item in skin_data:
        sc = item["skinCluster"]
        file_name = item["fileName"]

        if verbose:
            print(u'[EXPORT] {} -> {}'.format(sc, file_name))

        cmds.deformerWeights(
            file_name,
            export=True,
            deformer=sc,
            path=temp_dir,
            format='XML',
            defaultValue=-1.0,
            weightPrecision=8,
        )

        cmds.skinCluster(sc, e=True, unbind=True)


def _delete_connected_bindposes(joints, verbose=True):
    bindposes = cmds.ls(cmds.listConnections(joints, type='dagPose') or [], long=True) or []
    bindposes = list(sorted(set(bindposes)))
    if not bindposes:
        return

    if verbose:
        print(u'[DELETE] bindPoses: {}'.format(len(bindposes)))

    try:
        cmds.delete(bindposes)
    except Exception:
        pass


def _freeze_skeletons(roots, verbose=True):
    if verbose:
        print(u'[FREEZE] skeleton roots: {}'.format(len(roots)))

    for root in roots:
        if not cmds.objExists(root):
            continue
        cmds.makeIdentity(
            root,
            apply=True,
            translate=True,
            rotate=True,
            scale=True,
            jointOrient=False,
        )


def _get_matrix_attr(attr):
    v = cmds.getAttr(attr)
    if isinstance(v, (list, tuple)) and len(v) == 1:
        v = v[0]
    return om2.MMatrix(v)


def _set_matrix_attr(attr, m):
    cmds.setAttr(attr, *list(m), type='matrix')


def _has_offset_parent_matrix(node):
    return cmds.attributeQuery('offsetParentMatrix', node=node, exists=True)


def _delete_empty_inserted_transforms(roots, verbose=True):
    """
    joint の子にぶら下がっている shape なし空 transform を後処理で削除する。
    """
    deleted = []

    candidates = []
    for root in roots:
        descendants = cmds.listRelatives(root, ad=True, fullPath=True, type='transform') or []
        candidates.extend(descendants)

    candidates = _unique_existing_long_names(candidates)
    candidates.sort(key=lambda x: x.count('|'), reverse=True)

    for tr in candidates:
        if not cmds.objExists(tr):
            continue
        if cmds.nodeType(tr) != 'transform':
            continue

        parent = cmds.listRelatives(tr, parent=True, fullPath=True) or []
        if not parent or cmds.nodeType(parent[0]) != 'joint':
            continue

        shapes = cmds.listRelatives(tr, shapes=True, fullPath=True) or []
        if shapes:
            continue

        children = cmds.listRelatives(tr, children=True, fullPath=True) or []
        if children:
            continue

        try:
            cmds.delete(tr)
            deleted.append(tr)
            if verbose:
                print(u'[CLEANUP] delete empty transform: {}'.format(tr))
        except Exception as e:
            cmds.warning(u'empty transform 削除失敗: {} / {}'.format(tr, e))

    return deleted


def _repair_inserted_transforms(bad_transforms, verbose=True):
    repaired = []

    for tr in bad_transforms:
        if not cmds.objExists(tr):
            continue
        if cmds.nodeType(tr) != 'transform':
            continue

        parent = cmds.listRelatives(tr, parent=True, fullPath=True) or []
        if not parent:
            continue

        original_parent = parent[0]
        if not cmds.objExists(original_parent):
            continue
        if cmds.nodeType(original_parent) != 'joint':
            continue

        children = cmds.listRelatives(tr, children=True, fullPath=True) or []
        if not children:
            # もう空なら消すだけ
            try:
                cmds.delete(tr)
                repaired.append(tr)
            except Exception:
                pass
            continue

        joint_children = [c for c in children if cmds.objExists(c) and cmds.nodeType(c) == 'joint']
        other_children = [c for c in children if cmds.objExists(c) and cmds.nodeType(c) != 'joint']

        # joint 以外の子がいるなら危険なので触らない
        if other_children:
            cmds.warning(u'skip: {} has non-joint children'.format(tr))
            continue

        if not joint_children:
            continue

        if not _has_offset_parent_matrix(joint_children[0]):
            cmds.warning(u'offsetParentMatrix が使えない Maya なので skip: {}'.format(tr))
            continue

        if verbose:
            print(u'[REPAIR] absorb inserted transform into offsetParentMatrix: {}'.format(tr))

        # inserted transform の「親に対するローカル行列」
        tr_local_m = _get_matrix_attr(tr + '.matrix')

        ok_children = []

        for child in joint_children:
            if not cmds.objExists(child):
                continue

            try:
                # child が元から持っている OPM
                child_opm = _get_matrix_attr(child + '.offsetParentMatrix')

                # 先に direct parent 化する
                # absolute=True でワールド変換を維持したまま re-parent する
                # （world に外した直後の relative は、親行列が二重に掛かりやすい）
                new_child = cmds.parent(child, original_parent, absolute=True)[0]
                new_child = (cmds.ls(new_child, long=True) or [new_child])[0]

                # inserted transform 分を OPM に前掛けする
                # old: parent * tr * childOPM * childLocal
                # new: parent * newOPM * childLocal
                # => newOPM = tr * childOPM
                new_opm = tr_local_m * child_opm
                _set_matrix_attr(new_child + '.offsetParentMatrix', new_opm)

                ok_children.append(new_child)

                # 再ペアレント後に Maya が transform を挿し直したかどうかを検知だけしておく
                current_parent = cmds.listRelatives(new_child, parent=True, fullPath=True) or []
                if current_parent and cmds.nodeType(current_parent[0]) == 'transform':
                    if verbose:
                        print(u'[INFO] Maya regenerated transform: {} -> {}'.format(new_child, current_parent[0]))

            except Exception as e:
                cmds.warning(u'OPM reparent 失敗: {} / {}'.format(child, e))

        if cmds.objExists(tr):
            # 子が残っていなければ消す
            remain_children = cmds.listRelatives(tr, children=True, fullPath=True) or []
            if not remain_children:
                try:
                    cmds.delete(tr)
                except Exception as e:
                    cmds.warning(u'transform 削除失敗: {} / {}'.format(tr, e))
                    continue

        repaired.append(tr)

    return repaired


def _rebind_and_restore_weights(skin_data, temp_dir, verbose=True):
    for item in skin_data:
        influences = [i for i in item["influences"] if cmds.objExists(i)]
        geometries = [g for g in item["geometries"] if cmds.objExists(g)]

        if not influences or not geometries:
            cmds.warning(
                u'{} は influence または geometry が見つからないためスキップしました。'.format(
                    item["skinClusterShort"]
                )
            )
            continue

        bind_kwargs = dict(
            ignoreBindPose=True,
            maximumInfluences=int(item["maxInfluences"]) if item["maxInfluences"] is not None else 5,
            obeyMaxInfluences=bool(item["maintainMaxInfluences"]),
            normalizeWeights=int(item["normalizeWeights"]) if item["normalizeWeights"] is not None else 1,
            skinMethod=int(item["skinningMethod"]) if item["skinningMethod"] is not None else 0,
            bindMethod=int(item["bindMethod"]) if item["bindMethod"] is not None else 0,
            dropoffRate=float(item["dropoffRate"]) if item["dropoffRate"] is not None else 4.0,
        )

        try:
            new_sc = cmds.skinCluster(
                influences,
                geometries[0],
                name=item["skinClusterShort"],
                **bind_kwargs
            )[0]
        except Exception:
            new_sc = cmds.skinCluster(
                influences,
                geometries[0],
                **bind_kwargs
            )[0]

        if len(geometries) > 1:
            for extra_geo in geometries[1:]:
                try:
                    cmds.skinCluster(new_sc, e=True, geometry=extra_geo)
                except Exception:
                    cmds.warning(u'追加 geometry の再接続に失敗: {}'.format(extra_geo))

        if verbose:
            print(u'[IMPORT] {} <- {}'.format(new_sc, item["fileName"]))

        cmds.deformerWeights(
            item["fileName"],
            im=True,
            deformer=new_sc,
            path=temp_dir,
            method='index',
        )

        try:
            cmds.skinCluster(new_sc, e=True, recacheBindMatrices=True)
        except Exception:
            pass


# 実行例:
# 1) ルート joint を選択

report = repair_parent_inserted_transforms()
print(report)