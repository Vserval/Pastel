# -*- coding: utf-8 -*-
import os
import re
import shutil
import tempfile
import traceback

import maya.cmds as cmds


def repair_parent_inserted_transforms(
    roots=None,
    cleanup_weight_files=True,
    verbose=True,
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
        4) スケルトン全体を Freeze Transform
        5) 余計な transform を除去し、joint を元の親へ re-parent
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
    }

    temp_dir = tempfile.mkdtemp(prefix="maya_skel_repair_")
    report["weightDir"] = temp_dir

    try:
        cmds.undoInfo(openChunk=True, chunkName='repair_parent_inserted_transforms')

        all_joints = _collect_joints_from_roots(roots)
        bad_transforms = _find_inserted_transforms(roots)

        if verbose:
            print(u'[INFO] joints: {}'.format(len(all_joints)))
            print(u'[INFO] inserted transforms: {}'.format(len(bad_transforms)))

        if not bad_transforms:
            if verbose:
                print(u'[INFO] 修正対象の transform は見つかりませんでした。')
            return report

        skin_data = _collect_related_skin_data(all_joints)
        report["skinClusters"] = [d["skinCluster"] for d in skin_data]

        if verbose:
            print(u'[INFO] related skinClusters: {}'.format(len(skin_data)))

        _export_and_unbind_skinclusters(skin_data, temp_dir, verbose=verbose)
        _delete_connected_bindposes(all_joints, verbose=verbose)
        _freeze_skeletons(roots, verbose=verbose)

        repaired = _repair_inserted_transforms(bad_transforms, verbose=verbose)
        report["repairedTransforms"] = repaired

        _rebind_and_restore_weights(skin_data, temp_dir, verbose=verbose)

        if verbose:
            print(u'[DONE] 修復完了')
            print(u'  repaired transforms : {}'.format(len(repaired)))
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
    joint の下にある「shape を持たない transform」で、
    子に joint を持つものを中間 transform とみなして返す。
    深い階層から処理するため、パス深度の降順で返す。
    """
    candidates = []

    for root in roots:
        if not cmds.objExists(root):
            continue

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
    """
    ルートだけでなく配下 joint 全体に対して Freeze を実行する。
    """
    all_joints = _collect_joints_from_roots(roots)

    if verbose:
        print(u'[FREEZE] joints: {}'.format(len(all_joints)))

    for jnt in all_joints:
        if not cmds.objExists(jnt):
            continue
        try:
            cmds.makeIdentity(
                jnt,
                apply=True,
                translate=True,
                rotate=True,
                scale=True,
                jointOrient=False,
            )
        except Exception as e:
            cmds.warning(u'Freeze失敗: {} / {}'.format(jnt, e))


def _repair_inserted_transforms(bad_transforms, verbose=True):
    """
    中間 transform を削除し、子 joint を元の親 joint に戻す。
    再ペアレント時は relative=True を使い、transform の再生成を防ぐ。
    """
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
            continue

        # 主に joint を対象にする
        target_children = [c for c in children if cmds.objExists(c) and cmds.nodeType(c) == 'joint']
        if not target_children:
            continue

        if verbose:
            print(u'[REPAIR] delete inserted transform: {}'.format(tr))

        detached_children = []

        # まず world に外す
        for child in target_children:
            try:
                new_child = cmds.parent(child, world=True)[0]
                new_child = (cmds.ls(new_child, long=True) or [new_child])[0]
                detached_children.append(new_child)
            except Exception as e:
                cmds.warning(u'world への解除に失敗: {} / {}'.format(child, e))

        # 空になった transform を削除
        if cmds.objExists(tr):
            try:
                cmds.delete(tr)
            except Exception as e:
                cmds.warning(u'transform 削除失敗: {} / {}'.format(tr, e))
                continue

        # 元の joint に relative で戻す
        reparented_children = []
        for child in detached_children:
            if not cmds.objExists(child):
                continue
            try:
                new_child = cmds.parent(child, original_parent, relative=True)[0]
                new_child = (cmds.ls(new_child, long=True) or [new_child])[0]
                reparented_children.append(new_child)
            except Exception as e:
                cmds.warning(u're-parent 失敗: {} -> {} / {}'.format(child, original_parent, e))

        # 念のため、もし再生成された transform があれば潰す
        for child in reparented_children:
            if not cmds.objExists(child):
                continue

            current_parent = cmds.listRelatives(child, parent=True, fullPath=True) or []
            if not current_parent:
                continue

            p = current_parent[0]
            if cmds.nodeType(p) != 'transform':
                continue

            pp = cmds.listRelatives(p, parent=True, fullPath=True) or []
            if not pp:
                continue

            if pp[0] != original_parent:
                continue

            shapes = cmds.listRelatives(p, shapes=True, fullPath=True) or []
            siblings = cmds.listRelatives(p, children=True, fullPath=True) or []

            # shape なし、子がこの joint だけなら中間 transform と判断して削除
            if not shapes and len(siblings) == 1 and siblings[0] == child:
                try:
                    temp = cmds.parent(child, world=True)[0]
                    temp = (cmds.ls(temp, long=True) or [temp])[0]

                    if cmds.objExists(p):
                        cmds.delete(p)

                    cmds.parent(temp, original_parent, relative=True)
                except Exception as e:
                    cmds.warning(u'再生成 transform の除去失敗: {} / {}'.format(p, e))

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
# 2) 下を実行
report = repair_parent_inserted_transforms()
print(report)