"""IFC4 (HTP V1.6) -> showcase GLB + JSON per station.

Usage: python3 tools/ifc2show.py <ifc> <outdir> <station_id>
Output: <outdir>/model.glb, <outdir>/data.json
- glTF Y-up: (x, y, z)_ifc -> (x, z, -y)
- one mesh per (storey, group, material); custom vertex attribute _ELEM = element index
"""
import json, struct, sys, collections, multiprocessing
import numpy as np
import ifcopenshell, ifcopenshell.geom, ifcopenshell.util.element as ue

ifc_path, outdir, sid = sys.argv[1], sys.argv[2], sys.argv[3]
m = ifcopenshell.open(ifc_path)

bld = m.by_type("IfcBuilding")[0]
bps = ue.get_psets(bld)
basis = bps.get("HTP_ModelBasis", {})
addel = {k: v for k, v in bps.get("HTP_AdditionalElevations", {}).items() if k != "id"}
coord = {}
for x in m.by_type("IfcSite") + m.by_type("IfcProject"):
    coord.update(ue.get_psets(x).get("HTP_CoordinateBasis", {}))
zero_el = float(coord.get("模型Z零點標高EL_m", 0))

storeys = []
el_storey = {}
for s in sorted(m.by_type("IfcBuildingStorey"), key=lambda s: s.Elevation or 0):
    p = ue.get_psets(s).get("HTP_StoreyControl", {})
    code = p.get("樓層代號") or s.Name.split()[0]
    storeys.append(dict(code=code, use=p.get("用途") or s.LongName, el=p.get("設計標高EL_m"),
                        rel=p.get("相對模型原點_m"), dwg=p.get("圖說編號")))
    for r in s.ContainsElements or []:
        for e in r.RelatedElements:
            el_storey[e.id()] = code

st = ifcopenshell.geom.settings()
st.set("use-world-coords", True)
it = ifcopenshell.geom.iterator(st, m, multiprocessing.cpu_count())

elements = []          # metadata rows
buckets = collections.OrderedDict()   # key -> dict(pos=[], nrm=[], idx=[], elem=[], n=0)
mats = {}              # (r,g,b,a) -> index
groups = collections.OrderedDict()
assert it.initialize()
while True:
    sh = it.get()
    e = m.by_id(sh.id)
    ps = ue.get_psets(e).get("HTP_SourceAndPlacement", {})
    sc = el_storey.get(e.id()) or ps.get("樓層或基地歸屬") or "?"
    grp = ps.get("母模群組名稱") or (e.Name or "").split("｜")[0]
    eidx = len(elements)
    elements.append([ps.get("模型元素編號") or e.GlobalId, e.ObjectType or e.Name or "", grp,
                     ps.get("母模拆解層", ""), ps.get("BIM分類", ""), ps.get("來源圖說", ""), sc,
                     ps.get("幾何最低EL_m"), ps.get("幾何最高EL_m"), e.is_a()[3:]])
    g = sh.geometry
    v = np.asarray(g.verts, dtype=np.float32).reshape(-1, 3)
    nrm = np.asarray(g.normals, dtype=np.float32).reshape(-1, 3)
    f = np.asarray(g.faces, dtype=np.int64).reshape(-1, 3)
    mids = np.asarray(g.material_ids, dtype=np.int64) if len(g.material_ids) else np.zeros(len(f), np.int64)
    gm = g.materials
    for mi in np.unique(mids):
        if len(gm):
            mm = gm[max(mi, 0)]
            col = (round(mm.diffuse.r(), 3), round(mm.diffuse.g(), 3), round(mm.diffuse.b(), 3),
                   round(1 - (mm.transparency or 0), 2))
        else:
            col = (0.8, 0.8, 0.8, 1.0)
        mat = mats.setdefault(col, len(mats))
        ff = f[mids == mi]
        # flat normals: split corners per face, then re-weld identical (position, normal) pairs
        tri = v[ff]                                   # (t,3,3)
        fn = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
        ln = np.linalg.norm(fn, axis=1, keepdims=True); ok = ln[:, 0] > 1e-12
        tri, fn = tri[ok], fn[ok] / ln[ok]
        if not len(tri): continue
        corners = np.concatenate([tri.reshape(-1, 3), np.repeat(fn, 3, 0)], 1)
        keyr = np.round(corners, 4)
        uniq, inv = np.unique(keyr, axis=0, return_inverse=True)
        key = (sc, grp, mat)
        b = buckets.setdefault(key, dict(pos=[], nrm=[], idx=[], elem=[], n=0))
        vv = uniq[:, :3]; nn = uniq[:, 3:]
        b["pos"].append(np.stack([vv[:, 0], vv[:, 2], -vv[:, 1]], 1))
        b["nrm"].append(np.stack([nn[:, 0], nn[:, 2], -nn[:, 1]], 1))
        b["idx"].append(inv.reshape(-1) + b["n"])
        b["elem"].append(np.full(len(uniq), eidx, np.uint16))
        b["n"] += len(uniq)
    gg = groups.setdefault(grp, dict(n=0, col=None))
    gg["n"] += 1
    if gg["col"] is None and len(gm):
        mm = gm[0]; gg["col"] = "#%02x%02x%02x" % tuple(int(c * 255) for c in (mm.diffuse.r(), mm.diffuse.g(), mm.diffuse.b()))
    if not it.next():
        break

# ---- GLB
bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
def add_view(arr, target, stride=None):
    off = len(bin_); data = arr.tobytes(); bin_.extend(data)
    while len(bin_) % 4: bin_.append(0)
    v = dict(buffer=0, byteOffset=off, byteLength=len(data), target=target)
    if stride: v["byteStride"] = stride
    views.append(v); return len(views) - 1
def add_acc(arr, ctype, typ, target, minmax=False, stride=None, normalized=False):
    a = dict(bufferView=add_view(arr, target, stride), componentType=ctype, count=int(arr.shape[0]), type=typ)
    if normalized: a["normalized"] = True
    if minmax:
        a["min"] = arr.min(0).tolist(); a["max"] = arr.max(0).tolist()
    accs.append(a); return len(accs) - 1

tris = 0; bbmin = np.full(3, 1e9); bbmax = np.full(3, -1e9)
for (sc, grp, mat), b in buckets.items():
    pos = np.concatenate(b["pos"]).astype(np.float32)
    nrm = np.concatenate(b["nrm"]).astype(np.float32)
    ln = np.linalg.norm(nrm, axis=1, keepdims=True); ln[ln == 0] = 1; nrm /= ln
    idx = np.concatenate(b["idx"]).reshape(-1)
    elem = np.concatenate(b["elem"])
    bbmin = np.minimum(bbmin, pos.min(0)); bbmax = np.maximum(bbmax, pos.max(0))
    it_ = 5125 if pos.shape[0] > 65535 else 5123
    idx = idx.astype(np.uint32 if it_ == 5125 else np.uint16)
    tris += len(idx) // 3
    prim = dict(attributes=dict(POSITION=add_acc(pos, 5126, "VEC3", 34962, True),
                                NORMAL=add_acc(np.concatenate([np.round(nrm * 127).astype(np.int8), np.zeros((len(nrm), 1), np.int8)], 1), 5120, "VEC3", 34962, stride=4, normalized=True),
                                _ELEM=add_acc(elem, 5123, "SCALAR", 34962)),
                indices=add_acc(idx, it_, "SCALAR", 34963), material=mat)
    meshes.append(dict(primitives=[prim]))
    nodes.append(dict(name=f"{sc}|{grp}|{mat}", mesh=len(meshes) - 1, extras=dict(storey=sc, group=grp)))

materials = []
for (r, g, bl, a), i in sorted(mats.items(), key=lambda kv: kv[1]):
    mt = dict(name=f"m{i}", doubleSided=True,
              pbrMetallicRoughness=dict(baseColorFactor=[r, g, bl, a], metallicFactor=0.0, roughnessFactor=0.85))
    if a < 0.99: mt["alphaMode"] = "BLEND"
    materials.append(mt)

gltf = dict(asset=dict(version="2.0", generator="skytaxi ifc2show"), scene=0,
            scenes=[dict(nodes=list(range(len(nodes))))], nodes=nodes, meshes=meshes,
            materials=materials, accessors=accs, extensionsUsed=["KHR_mesh_quantization"], extensionsRequired=["KHR_mesh_quantization"], bufferViews=views, buffers=[dict(byteLength=len(bin_))])
js = json.dumps(gltf, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
while len(js) % 4: js += b" "
glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_))
glb += struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(bin_), 0x004E4942) + bytes(bin_)
open(f"{outdir}/model.glb", "wb").write(glb)

# ---- per-storey stats and centroids (Y-up model coords)
stat = {s["code"]: dict(n=0, groups=collections.Counter(), cats=collections.Counter(), cls=collections.Counter()) for s in storeys}
for row in elements:
    s = stat.setdefault(row[6], dict(n=0, groups=collections.Counter(), cats=collections.Counter(), cls=collections.Counter()))
    s["n"] += 1; s["groups"][row[2]] += 1; s["cats"][row[4]] += 1; s["cls"][row[9]] += 1
box = {}
for (sc, grp, mat), b in buckets.items():
    p = np.concatenate(b["pos"]); lo, hi = p.min(0), p.max(0)
    if sc in box: box[sc] = (np.minimum(box[sc][0], lo), np.maximum(box[sc][1], hi))
    else: box[sc] = (lo, hi)
for s in storeys:
    c = s["code"]; st_ = stat.get(c)
    s["n"] = st_["n"] if st_ else 0
    s["groups"] = st_["groups"].most_common() if st_ else []
    s["cats"] = st_["cats"].most_common() if st_ else []
    s["cls"] = st_["cls"].most_common() if st_ else []
    if c in box:
        s["box"] = [round(float(x), 2) for x in list(box[c][0]) + list(box[c][1])]

data = dict(id=sid, version=basis.get("模型版本"), basis=basis.get("建模細度說明"), scope=basis.get("建模範圍"),
            zeroEL=zero_el, north=[coord.get("母模真北X"), coord.get("母模真北Y")], xBearing=coord.get("母模X軸真方位_度"),
            addEL=addel, storeys=storeys, groups=[[k, v["n"], v["col"]] for k, v in groups.items()],
            elemCols=["id", "desc", "group", "layer", "cat", "src", "storey", "elMin", "elMax", "cls"],
            elements=elements, bbox=[round(float(x), 2) for x in list(bbmin) + list(bbmax)], tris=tris)
json.dump(data, open(f"{outdir}/data.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(sid, len(elements), "elements", tris, "tris", len(meshes), "meshes", len(glb) // 1024, "KB glb")
