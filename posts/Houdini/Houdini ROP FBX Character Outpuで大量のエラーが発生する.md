# 単純な読み込みと書き出しができない
![[スクリーンショット 2026-03-18 202118.avif]]
FBX Character Import 
↓
ROP FBX Character Output

# 一時的な回避
![[スクリーンショット 2026-03-18 202400.avif]]

```Python
import hou

node = hou.pwd()
geo = node.geometry()

PRINT_LIMIT = 50

def get_input_geo(n, idx, required=True):
    try:
        g = n.inputGeometry(idx)
    except Exception:
        g = None

    if g is None and required:
        raise hou.NodeError("input{} が必要です。".format(idx))
    return g

def point_names(g, label):
    a = g.findPointAttrib("name")
    if a is None:
        raise hou.NodeError("{} に point string 'name' がありません。".format(label))
    return [p.stringAttribValue("name") for p in g.points()]

def has_point_attrib(g, name):
    return g.findPointAttrib(name) is not None

def print_list(title, values, limit=PRINT_LIMIT):
    print(title)
    if not values:
        print("  (none)")
        print("")
        return
    for v in values[:limit]:
        print("  {}".format(v))
    if len(values) > limit:
        print("  ... truncated ...")
    print("")

# --------------------------------------------------
# 入力
# input0 = Rest Geometry
# input1 = Capture Pose
# input2 = Animated Pose
# --------------------------------------------------
rest_geo = get_input_geo(node, 0, required=False)
cap_geo  = get_input_geo(node, 1, required=True)
anim_geo = get_input_geo(node, 2, required=True)

# 必須属性チェック
if not has_point_attrib(cap_geo, "name"):
    raise hou.NodeError("Capture Pose に point string 'name' がありません。")
if not has_point_attrib(cap_geo, "transform"):
    raise hou.NodeError("Capture Pose に point 'transform' がありません。")
if not has_point_attrib(anim_geo, "name"):
    raise hou.NodeError("Animated Pose に point string 'name' がありません。")
if not has_point_attrib(anim_geo, "transform"):
    raise hou.NodeError("Animated Pose に point 'transform' がありません。")

cap_names  = [p.stringAttribValue("name") for p in cap_geo.points()]
anim_names = [p.stringAttribValue("name") for p in anim_geo.points()]

cap_set  = set(cap_names)
anim_set = set(anim_names)

only_in_cap  = sorted(cap_set - anim_set)
only_in_anim = sorted(anim_set - cap_set)

print("==================================================")
print("COMPARE CAPTURE vs ANIMATED")
print("==================================================")
print("Capture count  :", len(cap_names))
print("Animated count :", len(anim_names))
print("Capture unique :", len(cap_set))
print("Animated unique:", len(anim_set))
print("Same set       :", cap_set == anim_set)
print("Same order     :", cap_names == anim_names)
print("")

print_list("Only in Capture:", only_in_cap)
print_list("Only in Animated:", only_in_anim)

# Animated 側に Capture の joint が足りないなら止める
if only_in_cap:
    raise hou.NodeError("Animated Pose に Capture Pose の joint が足りません。")

# --------------------------------------------------
# Capture Pose をテンプレートにして出力を作る
# --------------------------------------------------
geo.clear()
geo.merge(cap_geo)

# Animated Pose を name -> point で引く
anim_by_name = {}
for p in anim_geo.points():
    anim_by_name[p.stringAttribValue("name")] = p

out_name_attr = geo.findPointAttrib("name")
out_xform_attr = geo.findPointAttrib("transform")
out_p_attr = geo.findPointAttrib("P")
out_cd_attr = geo.findPointAttrib("Cd")

anim_xform_attr = anim_geo.findPointAttrib("transform")
anim_p_attr = anim_geo.findPointAttrib("P")
anim_cd_attr = anim_geo.findPointAttrib("Cd")

updated = 0
missing = []

for p in geo.points():
    name = p.stringAttribValue(out_name_attr)
    src = anim_by_name.get(name)

    if src is None:
        missing.append(name)
        continue

    # transform を Animated Pose からコピー
    p.setAttribValue(out_xform_attr, src.attribValue(anim_xform_attr))

    # P もあればコピー
    if out_p_attr is not None and anim_p_attr is not None:
        p.setAttribValue(out_p_attr, src.attribValue(anim_p_attr))

    # Cd も両方にあればコピー
    if out_cd_attr is not None and anim_cd_attr is not None:
        p.setAttribValue(out_cd_attr, src.attribValue(anim_cd_attr))

    updated += 1

# --------------------------------------------------
# 結果確認
# --------------------------------------------------
out_names = [p.stringAttribValue("name") for p in geo.points()]
out_set = set(out_names)

print("==================================================")
print("BUILD RESULT")
print("==================================================")
print("Updated joints        :", updated)
print("Output point count    :", len(out_names))
print("Output unique count   :", len(out_set))
print("Same set as Capture   :", out_set == cap_set)
print("Same order as Capture :", out_names == cap_names)
print("")

print_list("Missing during transfer (bad):", missing)

if geo.findPointAttrib("path") is not None:
    print("WARNING: output に point 'path' が残っています。")
if geo.findPointAttrib("fbx_node_type") is not None:
    print("WARNING: output に point 'fbx_node_type' が残っています。")
if geo.findPointAttrib("fbx_custom_attributes") is not None:
    print("WARNING: output に point 'fbx_custom_attributes' が残っています。")
if geo.findGlobalAttrib("clipinfo") is not None:
    print("WARNING: output に detail 'clipinfo' が残っています。")

print("")
print("==================================================")
print("FINAL STATUS")
print("==================================================")
if missing:
    print("WARNING: Animated Pose から transform 転送できない joint があります。")
elif out_set == cap_set and out_names == cap_names:
    print("OK: Capture Pose と同一トポロジの clean Animated Pose を構築しました。")
    print("OK: 余計な FBX ノード属性を持たない状態です。")
else:
    print("WARNING: まだ差分があります。")

# --------------------------------------------------
# debug_summary
# --------------------------------------------------
summary_lines = []
summary_lines.append("capture_count={}".format(len(cap_names)))
summary_lines.append("animated_count={}".format(len(anim_names)))
summary_lines.append("updated={}".format(updated))
summary_lines.append("same_set={}".format(out_set == cap_set))
summary_lines.append("same_order={}".format(out_names == cap_names))
summary_lines.append("only_in_animated={}".format(",".join(only_in_anim)))
summary_lines.append("missing={}".format(",".join(missing)))

if geo.findGlobalAttrib("debug_summary") is None:
    geo.addAttrib(hou.attribType.Global, "debug_summary", "")

geo.setGlobalAttribValue("debug_summary", "\n".join(summary_lines))
```



# Houdini `ROP FBX Character Output` 警告の詳細トラブルシューティング

## 問題概要

`/obj/geo1/rop_fbxcharacteroutput2` で FBX を出力した際、以下のような警告が大量に発生した。

* `'edgeRig_02_jnt1' does not exist in the Input FBX.`
* `Skipped unknown joint 'edgeRig_02_jnt1'`

同様の警告が `edgeRig_03_jnt1`, `edgeRig_04_jnt1` 以降にも連続して発生し、最終的に 96 warnings となった。

---

## 最初の症状

最初は、`ROP FBX Character Output` の **Animated Pose を接続したときだけ問題が出る** ように見えた。
一方で、Animated Pose を外すと出力できるケースがあったため、当初は **Animated Pose 側の joint 構成不一致** が主因だと推測した。

---

## 調査対象ノード構成

最終的な調査対象は次の構成。

* `fbxcharacterimport7`

  * output0 → Rest Geometry
  * output1 → Capture Pose
  * output2 → Animated Pose
* `python1`

  * output2 の補正用
* `rop_fbxcharacteroutput2`

  * input0 ← output0
  * input1 ← output1
  * input2 ← `python1`

---

## 調査の流れ

## 1. `fbxcharacterimport` の各出力が何なのか確認

最初は、`fbxcharacterimport` の output0 / 1 / 2 が本当に

* Rest Geometry
* Capture Pose
* Animated Pose

になっているか不明だったため、Python で各出力の属性構造を調査した。

### 調査結果

### OUT0

* Points: 81056
* Prims: 93437
* Point attribs: `P`, `boneCapture`
* Prim attribs: `name`, `shop_materialpath`, `fbx_material_name` など
* 判定: **mesh**

### OUT1

* Points: 159
* Prims: 156
* Point attribs: `P`, `name`, `transform`, `Cd`
* 判定: **skeleton**

### OUT2

* Points: 166
* Prims: 163
* Point attribs: `name`, `transform`, `path`, `fbx_node_type`, `fbx_custom_attributes` など
* Detail attribs: `clipinfo`
* 判定: **skeleton**

### 結論

`fbxcharacterimport7` の出力自体は正常で、

* `OUT0 = Rest Geometry`
* `OUT1 = Capture Pose`
* `OUT2 = Animated Pose`

と判断できた。

---

## 2. Capture Pose と Animated Pose の比較

次に、`OUT1` と `OUT2` の `point.name` を比較した。

### 比較結果

* Capture Pose: 159 joints

* Animated Pose: 166 joints

* 一致しない

* Animated Pose にのみ以下のノードが存在した

* `Armature`

* `persp1`

* `polySurface1601`

* `transform28`

* `transform29`

* `transform30`

* `transform31`

### 解釈

Animated Pose 側に **本来 skeleton に含まれるべきでない余計な FBX ノード** が混入していた。
この時点で、`Capture Pose` と `Animated Pose` の構成が一致していないことが確定した。

---

## 3. Animated Pose から余計なノードを削除

まずは `Animated Pose` をベースに、`Capture Pose` に存在しない `name` を持つ point を削除した。

### 結果

* 削除数: 7
* 削除後 point count: 159
* `Same set as Capture = True`
* `Same order as Capture = True`

### 中間結論

Animated Pose 側の構成不一致は解消できた。

---

## 4. それでも `edgeRig_*` 警告が残る

Animated Pose 側の joint 構成を一致させたあとも、`ROP FBX Character Output` では引き続き以下の警告が発生した。

* `edgeRig_02_jnt1 does not exist in the Input FBX`
* `Skipped unknown joint edgeRig_02_jnt1`

この段階で、問題は **Animated Pose 側だけではない** と判断した。

---

## 5. Rest Geometry 側の調査

次に `OUT0` の Rest Geometry を調査した。

### 見つかった点

* `boneCapture` が存在
* visible な string attrib / detail attrib / intrinsic には `edgeRig_*` が見つからない
* しかし `Capture Pose` の `name` には `edgeRig_*` が含まれていた

### 解釈

`edgeRig_*` は visible attribute ではなく、**Rest Geometry の `boneCapture` 内部 capture table** 側に残っている可能性が高いと判断した。

つまり、警告の本質は

* Skeleton 側の構成差
* Mesh 側の skin capture 参照

の両方が絡んでいた。

---

## 根本原因

## 原因1: Animated Pose 側に不要ノードが混入していた

Animated Pose には以下の不要ノードが含まれていた。

* `Armature`
* `persp1`
* `polySurface1601`
* `transform28`
* `transform29`
* `transform30`
* `transform31`

これにより、Capture Pose と Animated Pose の joint 構造が一致していなかった。

---

## 原因2: Rest Geometry の `boneCapture` が `edgeRig_*` を参照していた

Rest Geometry 側の skin capture 情報に、`edgeRig_*` 系 joint 参照が残っていた。
このため、ROP 出力時に

* skeleton 入力側に存在しない joint
* mesh の capture 情報側にだけ残っている joint

が発生し、`does not exist in the Input FBX` 警告につながっていた。

---

## 最終的に採用した解決策

## 解決策の考え方

Animated Pose を直接削って使うのではなく、

**Capture Pose をテンプレートにして、Animated Pose から `transform` だけを転送する**

方式に変更した。

この方式の利点は以下のとおり。

* joint 数が Capture Pose と完全一致する
* joint 順序が Capture Pose と完全一致する
* 余計な FBX ノードを持ち込まない
* `path`, `fbx_node_type`, `fbx_custom_attributes`, `clipinfo` などの差異を切り離せる

---

## 実際の接続構成

* `fbxcharacterimport7` output0 → `rop_fbxcharacteroutput2` input0
* `fbxcharacterimport7` output1 → `rop_fbxcharacteroutput2` input1
* `fbxcharacterimport7` output2 → `python1`
* `python1` output → `rop_fbxcharacteroutput2` input2

---

## 実装内容

`python1` では以下を行った。

1. input1 の Capture Pose をベースに出力 geometry を構築
2. input2 の Animated Pose から `name` 一致で point を引く
3. 各 joint の `transform` を Animated Pose から転送
4. 必要に応じて `P`, `Cd` も転送
5. Capture Pose に存在しない joint は一切出力しない

これにより、出力 skeleton は **Capture Pose と同一トポロジ** で、かつ **Animated Pose の transform を持つ clean skeleton** になった。

---

## 最終結果

この方式に切り替えたところ、**動作 OK** を確認した。

つまり、最終的には

* Capture Pose / Animated Pose の不一致
* Rest Geometry の capture 参照との不整合

を回避でき、`ROP FBX Character Output` が受け入れ可能な形に正規化できた。

---

# トラブルシューティング時に確認すべきポイント

## 1. `fbxcharacterimport` の各出力の型をまず確認する

見た目のポート名や想定だけで判断せず、必ず次を確認する。

* point 数
* prim 数
* `point.name` の有無
* `point.transform` の有無
* `boneCapture` の有無

### 判定の目安

* mesh

  * `boneCapture` がある
  * polygon が多い
  * `name` が prim 側
* skeleton

  * `point.name` がある
  * `point.transform` がある
  * point 数が比較的少ない

---

## 2. Capture Pose と Animated Pose の `point.name` を比較する

最低限以下を確認する。

* Same set
* Same order
* 片方にしかない joint 名

`ROP FBX Character Output` は joint 数や順序のズレに弱いので、集合一致だけでなく **順序一致** まで確認したほうが安全。

---

## 3. Animated Pose に余計な FBX ノードが混ざっていないか確認する

特に以下のような名前は要注意。

* `Armature`
* `persp*`
* `transform*`
* mesh 名
* DCC 側の補助ノード

これらが Animated Pose にだけあると、Capture Pose との不一致要因になる。

---

## 4. `edgeRig_*` 警告が残る場合は Rest Geometry を疑う

Skeleton 側が一致していても警告が残る場合は、Rest Geometry 側の `boneCapture` を疑う。

visible attribute に joint 名が見えなくても、**内部 capture table** に古い参照が残っていることがある。

---

## 5. 一番安定するのは「Capture Pose テンプレート方式」

Animated Pose をそのまま使うより、

* Capture Pose を骨格テンプレートにする
* Animated Pose から transform だけ転送する

ほうが圧倒的に安定する。

---

# 再発防止メモ

同様の問題を防ぐには、FBX import 後の段階で次を必ず確認するとよい。

* Rest / Capture / Animated の各出力型確認
* Capture と Animated の `point.name` 比較
* Animated に不要ノードが混ざっていないか
* mesh の `boneCapture` と skeleton の対応が取れているか

---

# まとめ

今回の問題は単純な 1 要因ではなく、次の複合要因だった。

* Animated Pose に余計な FBX ノードが含まれていた
* Rest Geometry 側の capture 情報と skeleton 側の joint 構成にズレがあった

最終的には、

**Capture Pose をテンプレートにして Animated Pose の transform のみ転送する**

方法で、`ROP FBX Character Output` に渡す skeleton を安定化させ、問題を解決した。

必要なら次に、これを
**社内メモ向けに簡潔に整えた版** か、
**手順書形式の箇条書き版** に整えます。
