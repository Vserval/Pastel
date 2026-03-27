
# Python GUI
まずは、PythonSOPで実行
```Python
import hou

node = hou.selectedNodes()[0]   # Python SOPを選択してから実行

ptg = node.parmTemplateGroup()

# 既存同名パラメータを消す
for name in ["search", "aimaxis", "rollaxis", "useparentforleaf", "origin"]:
    try:
        ptg.remove(name)
    except:
        pass

folder = hou.FolderParmTemplate("pythonsop_ui", "Python SOP")

# search
search_parm = hou.StringParmTemplate(
    "search",
    "search",
    1,
    default_value=(r"*skirt*",)
)

# Aim Axis
aim_parm = hou.MenuParmTemplate(
    "aimaxis",
    "Aim Axis",
    menu_items=("x", "-x", "y", "-y", "z", "-z"),
    menu_labels=("x", "-x", "y", "-y", "z", "-z"),
    default_value=0
)

# Roll Axis
roll_parm = hou.MenuParmTemplate(
    "rollaxis",
    "Roll Axis",
    menu_items=("x", "-x", "y", "-y", "z", "-z"),
    menu_labels=("x", "-x", "y", "-y", "z", "-z"),
    default_value=4   # z
)

# Use Parent For Leaf
leaf_parm = hou.ToggleParmTemplate(
    "useparentforleaf",
    "Use Parent For Leaf",
    default_value=True
)

# Origin
origin_parm = hou.FloatParmTemplate(
    "origin",
    "Origin",
    3,
    default_value=(0.0, 0.0, 0.0)
)

folder.addParmTemplate(search_parm)
folder.addParmTemplate(aim_parm)
folder.addParmTemplate(roll_parm)
folder.addParmTemplate(leaf_parm)
folder.addParmTemplate(origin_parm)

ptg.append(folder)
node.setParmTemplateGroup(ptg)
```

# Python SOP本体コード
```Python
import hou

node = hou.pwd()
geo = node.geometry()

EPS = 1e-8


def normalize(v):
    l = v.length()
    if l < EPS:
        return None
    return v / l


def project_onto_plane(v, n):
    return v - n * v.dot(n)


def safe_orthogonal(axis):
    test = hou.Vector3(0, 1, 0)
    if abs(axis.dot(test)) > 0.99:
        test = hou.Vector3(1, 0, 0)
    out = project_onto_plane(test, axis)
    out = normalize(out)
    if out is None:
        test = hou.Vector3(0, 0, 1)
        out = project_onto_plane(test, axis)
        out = normalize(out)
    return out


def rows_from_transform_tuple(t):
    return [
        hou.Vector3(t[0], t[1], t[2]),
        hou.Vector3(t[3], t[4], t[5]),
        hou.Vector3(t[6], t[7], t[8]),
    ]


def matrix3_from_tuple(t):
    return hou.Matrix3((
        (t[0], t[1], t[2]),
        (t[3], t[4], t[5]),
        (t[6], t[7], t[8]),
    ))


def token_to_base_sign(token):
    token = token.strip().lower()
    if token.startswith("-"):
        return token[1:], -1.0
    return token, 1.0


def build_basis_from_aim_and_roll(aim_world, roll_world, aim_token, roll_token):
    aim_base, aim_sign = token_to_base_sign(aim_token)
    roll_base, roll_sign = token_to_base_sign(roll_token)

    xw = None
    yw = None
    zw = None

    aim_vec = aim_world * aim_sign
    roll_vec = roll_world * roll_sign

    if aim_base == "x":
        xw = aim_vec
    elif aim_base == "y":
        yw = aim_vec
    elif aim_base == "z":
        zw = aim_vec
    else:
        raise hou.NodeError("Aim Axis は x, -x, y, -y, z, -z のどれかにしてください。")

    if roll_base == "x":
        xw = roll_vec
    elif roll_base == "y":
        yw = roll_vec
    elif roll_base == "z":
        zw = roll_vec
    else:
        raise hou.NodeError("Roll Axis は x, -x, y, -y, z, -z のどれかにしてください。")

    if xw is not None and zw is not None and yw is None:
        yw = normalize(zw.cross(xw))
        if yw is None:
            yw = safe_orthogonal(xw)
        zw = normalize(xw.cross(yw))

    elif xw is not None and yw is not None and zw is None:
        zw = normalize(xw.cross(yw))
        if zw is None:
            zw = safe_orthogonal(xw)
        yw = normalize(zw.cross(xw))

    elif yw is not None and zw is not None and xw is None:
        xw = normalize(yw.cross(zw))
        if xw is None:
            xw = safe_orthogonal(yw)
        zw = normalize(xw.cross(yw))

    else:
        raise hou.NodeError("Aim Axis と Roll Axis は別軸にしてください。")

    xw = normalize(xw)
    yw = normalize(yw)
    zw = normalize(zw)

    if xw is None or yw is None or zw is None:
        return None, None, None

    yw = normalize(zw.cross(xw))
    zw = normalize(xw.cross(yw))
    xw = normalize(xw)

    return xw, yw, zw


def build_hierarchy(points, geo):
    allowed = set(pt.number() for pt in points)

    pt_by_num = {pt.number(): pt for pt in points}
    parent_of = {}
    children_of = {pt.number(): [] for pt in points}

    for prim in geo.prims():
        verts = prim.vertices()
        if len(verts) < 2:
            continue

        nums = [v.point().number() for v in verts]
        for a, b in zip(nums[:-1], nums[1:]):
            if a in allowed and b in allowed:
                parent_of[b] = a
                children_of.setdefault(a, []).append(b)

    return pt_by_num, parent_of, children_of


def compute_depth(ptnum, parent_of, memo):
    if ptnum in memo:
        return memo[ptnum]
    if ptnum not in parent_of:
        memo[ptnum] = 0
        return 0
    d = compute_depth(parent_of[ptnum], parent_of, memo) + 1
    memo[ptnum] = d
    return d


def parse_patterns(raw):
    raw = raw.strip()
    if not raw:
        return []
    parts = [s.strip() for s in raw.replace("\n", ",").split(",")]
    return [p for p in parts if p]


if geo.findPointAttrib("transform") is None:
    raise hou.NodeError("point attrib 'transform' が必要です。")

has_local = geo.findPointAttrib("localtransform") is not None

# ----------------------------
# GUI parameters
# ----------------------------
search_pattern = node.evalParm("search").strip()
aim_token = node.parm("aimaxis").evalAsString().strip().lower()
roll_token = node.parm("rollaxis").evalAsString().strip().lower()
use_leaf_parent = bool(node.evalParm("useparentforleaf"))
origin = hou.Vector3(node.parmTuple("origin").eval())

points = geo.points()

# search が入っている場合は name attribute で簡易フィルタ
# 例: *skirt* / skirt, skirt_01, skirt_02
patterns = parse_patterns(search_pattern)
if patterns:
    name_attrib = geo.findPointAttrib("name")
    if name_attrib is None:
        raise hou.NodeError("search を使うには point string attrib 'name' が必要です。")

    filtered = []
    for pt in points:
        bone_name = str(pt.attribValue("name"))
        if any(hou.text.patternMatch(pat, bone_name) for pat in patterns):
            filtered.append(pt)
    points = filtered

pt_by_num, parent_of, children_of = build_hierarchy(points, geo)

depth_memo = {}
ordered_points = sorted(points, key=lambda pt: compute_depth(pt.number(), parent_of, depth_memo))

world_xform = {}

# ----------------------------
# pass 1: 中間ジョイントの world transform を作る
# ----------------------------
for pt in ordered_points:
    ptnum = pt.number()
    p = pt.position()
    child_ids = [cid for cid in children_of.get(ptnum, []) if cid in pt_by_num]

    if not child_ids:
        continue

    t = pt.attribValue("transform")
    cur_rows = rows_from_transform_tuple(t)

    sx = cur_rows[0].length()
    sy = cur_rows[1].length()
    sz = cur_rows[2].length()

    if sx < EPS:
        sx = 1.0
    if sy < EPS:
        sy = 1.0
    if sz < EPS:
        sz = 1.0

    acc = hou.Vector3(0, 0, 0)
    for cid in child_ids:
        acc += pt_by_num[cid].position()
    child_center = acc / float(len(child_ids))

    aim_world = normalize(child_center - p)
    if aim_world is None:
        continue

    outward = normalize(project_onto_plane(p - origin, aim_world))
    if outward is None:
        outward = safe_orthogonal(aim_world)

    xw, yw, zw = build_basis_from_aim_and_roll(
        aim_world, outward, aim_token, roll_token
    )

    if xw is None or yw is None or zw is None:
        continue

    radial_check = normalize(project_onto_plane(p - origin, aim_world))
    if radial_check is not None and zw.dot(radial_check) < 0:
        yw = yw * -1.0
        zw = zw * -1.0

    xw *= sx
    yw *= sy
    zw *= sz

    m = hou.Matrix3((
        (xw[0], xw[1], xw[2]),
        (yw[0], yw[1], yw[2]),
        (zw[0], zw[1], zw[2]),
    ))

    world_xform[ptnum] = m

# ----------------------------
# pass 2: 末端は親の final world transform を丸ごとコピー
# ----------------------------
if use_leaf_parent:
    for pt in ordered_points:
        ptnum = pt.number()
        child_ids = [cid for cid in children_of.get(ptnum, []) if cid in pt_by_num]

        if child_ids:
            continue
        if ptnum not in parent_of:
            continue

        parent_num = parent_of[ptnum]

        if parent_num in world_xform:
            world_xform[ptnum] = hou.Matrix3(world_xform[parent_num].asTuple())
        else:
            parent_t = pt_by_num[parent_num].attribValue("transform")
            world_xform[ptnum] = matrix3_from_tuple(parent_t)

# ----------------------------
# pass 3: transform / localtransform を両方更新
# ----------------------------
for pt in ordered_points:
    ptnum = pt.number()

    if ptnum not in world_xform:
        continue

    world_m = world_xform[ptnum]
    pt.setAttribValue("transform", world_m.asTuple())

    if has_local:
        if ptnum in parent_of:
            parent_num = parent_of[ptnum]

            if parent_num in world_xform:
                parent_world = world_xform[parent_num]
            else:
                parent_world = matrix3_from_tuple(pt_by_num[parent_num].attribValue("transform"))

            local_m = world_m * parent_world.inverted()
        else:
            local_m = hou.Matrix3(world_m.asTuple())

        pt.setAttribValue("localtransform", local_m.asTuple())
```