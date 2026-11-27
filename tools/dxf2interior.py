#!/usr/bin/env python3
"""Floor DXF -> review/showcase/tN/interior.glb + interior.json

Per storey: room hatches as coloured floor tiles (pickable, _ROOM index), walls / partitions /
columns extruded, glazing as transparent panes, stair / escalator / lift / outline linework as thin
strips, room-name labels.  CAD coords are taken into IFC model coords with the station's
registration transform (T2-A-10 R5 enlarged plan is fitted to the IFC platform-door rows).
"""
import json, math, re, struct, sys
from pathlib import Path
import numpy as np
import ezdxf
from ezdxf import path as zpath
from ezdxf.colors import aci2rgb
import mapbox_earcut as earcut
from shapely.geometry import Polygon, LineString, Point, MultiPolygon, GeometryCollection
from shapely.ops import unary_union
from shapely import affinity

ROOT = Path(__file__).resolve().parents[1]
DXF = Path('/home/claude/plans/dxf')
SHOW = ROOT / 'review/showcase'

def reg(i):
    j = json.load(open(f'/tmp/sa/source/stations/T{i}-registration.json'))['xy_transform']
    return np.array(j['rotation_matrix'], float), np.array(j['translation_m'], float)

# ---- R5 fit (T2-A-10 is drawn in chainage coords): platform-door rows in IFC vs DXF
th = math.atan2(10.99, 27.49)
R5 = (np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]]), np.array([-50.76, 45.85]), np.array([775.8, 0.0]))

# station -> list of (dxf, [storeys], special)
JOBS = {
    't1': [('t1-a-07', ['G']), ('t1-a-08', ['L2']), ('t1-a-09', ['L3']), ('t1-a-10', ['L4']), ('t1-a-11', ['PL'])],
    't2': [('t2-a-04', ['B1']), ('t2-a-05', ['1F']), ('t2-a-06', ['2F']), ('t2-a-07', ['3F']), ('t2-a-08', ['4F', '5F']),
           ('t2-a-09', ['6F']), ('t2-a-10', ['R5'])],
    't3': [('t3-a-14', ['B2']), ('t3-a-15', ['B1']), ('t3-a-16', ['1F']), ('t3-a-08', ['2F']), ('t3-a-17', ['3F', '4F']),
           ('t3-a-07', ['PL']), ('t3-a-18', ['6F'])],
    't4': [('t4-a-06', ['GF']), ('t4-a-07', ['ML']), ('t4-a-08', ['CL']), ('t4-a-05', ['PL'])],
}
SPLIT = {'t3-a-17': lambda x: '3F' if x < 45 else '4F'}           # two plans on one sheet
SHIFT = {('t3-a-17', '4F'): (-105.0, 0.0)}                        # 4F copy drawn 105 m to the right

SKIP_LAYER = re.compile(r'^(G-|C-|L-|A-GRID|A-ANNO-DIMS|A-ANNO-SYMB|S-FNDN|A-FLOR-LEVL|PD-)')
WALL_H_MAX = 4.2
BASE = {'t3': {'B2': 0.13, 'B1': 0.27}}   # IFC slab top above storey datum
COL = dict(wall=(0.90, 0.88, 0.84), prtn=(0.95, 0.94, 0.91), col=(0.84, 0.82, 0.78), glass=(0.62, 0.80, 0.86),
           line=(0.30, 0.36, 0.36), stair=(0.45, 0.42, 0.37), plat=(0.86, 0.72, 0.45))

def srgb2lin(c):
    c = np.asarray(c, float)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def ent_rgb(e, doc):
    if e.rgb: return tuple(v / 255 for v in e.rgb)
    aci = e.dxf.color
    if aci in (0, 256):
        lay = doc.layers.get(e.dxf.layer)
        if lay is not None:
            if lay.rgb: return tuple(v / 255 for v in lay.rgb)
            aci = lay.color
    aci = abs(aci) or 7
    if aci == 7: return (0.8, 0.8, 0.8)
    return tuple(v / 255 for v in aci2rgb(aci))

def hatch_poly(h):
    geom = None
    for p in zpath.from_hatch(h):
        pts = [(v.x, v.y) for v in p.flattening(0.05)]
        if len(pts) < 3: continue
        g = Polygon(pts).buffer(0)
        if g.is_empty: continue
        geom = g if geom is None else geom.symmetric_difference(g)
    return geom

def lw_pts(e):
    if e.dxftype() == 'LWPOLYLINE':
        pts = [(v.x, v.y) for v in zpath.make_path(e).flattening(0.05)]
        return pts, bool(e.closed)
    if e.dxftype() == 'LINE':
        return [(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)], False
    if e.dxftype() == 'CIRCLE':
        c, r = e.dxf.center, e.dxf.radius
        return [(c.x + r * math.cos(a), c.y + r * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 17)[:-1]], True
    return None, False

def text_center(e):
    t = e.dxf.text; h = e.dxf.height
    halign, valign = e.dxf.get('halign', 0), e.dxf.get('valign', 0)
    if halign or valign:
        p = e.dxf.get('align_point', e.dxf.insert)
        return (p.x, p.y)
    w = sum(1.0 if ord(ch) > 0x2e80 else 0.55 for ch in t) * h
    a = math.radians(e.dxf.get('rotation', 0))
    cx, cy = w / 2, h / 2
    p = e.dxf.insert
    return (p.x + cx * math.cos(a) - cy * math.sin(a), p.y + cx * math.sin(a) + cy * math.cos(a))

def polys_of(g):
    if g is None or g.is_empty: return []
    if isinstance(g, Polygon): return [g]
    if isinstance(g, (MultiPolygon, GeometryCollection)): return [p for x in g.geoms for p in polys_of(x)]
    return []

# ------------------------------------------------------------------ mesh buckets
class Bucket:
    def __init__(s): s.pos = []; s.nrm = []; s.col = []; s.room = []; s.idx = []; s.n = 0
    def add(s, pos, nrm, idx, col=None, room=None):
        pos = np.asarray(pos, np.float32)
        s.pos.append(pos); s.nrm.append(np.asarray(nrm, np.float32)); s.idx.append(np.asarray(idx, np.int64) + s.n)
        if col is not None: s.col.append(np.tile(np.asarray(col, np.float32), (len(pos), 1)))
        if room is not None: s.room.append(np.full(len(pos), room, np.uint16))
        s.n += len(pos)

def tri_poly(poly):
    """earcut a shapely polygon -> (verts2d, idx)"""
    poly = poly.simplify(0.005)
    if poly.is_empty or poly.geom_type != 'Polygon': return None, None
    rings = [np.asarray(poly.exterior.coords)[:-1]] + [np.asarray(r.coords)[:-1] for r in poly.interiors]
    rings = [r for r in rings if len(r) >= 3]
    if not rings: return None, None
    v = np.concatenate(rings); ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
    idx = earcut.triangulate_float64(v.astype(np.float64), ends)
    if len(idx) == 0: return None, None
    return v, idx.astype(np.int64)

def to_gl(xy, y):  # model (x, yIFC) + height -> glTF (x, y, -yIFC)
    xy = np.asarray(xy, float)
    return np.stack([xy[:, 0], np.full(len(xy), y), -xy[:, 1]], 1)

def add_cap(b, poly, y, col=None, room=None, up=True):
    v, idx = tri_poly(poly)
    if v is None: return 0
    p = to_gl(v, y)
    # earcut winding on (x,yIFC) CCW -> in glTF (x, -z) flips; force normal up via index order
    tri = idx.reshape(-1, 3)
    a, bb, c = p[tri[:, 0]], p[tri[:, 1]], p[tri[:, 2]]
    ny = np.cross(bb - a, c - a)[:, 1]
    tri[ny < 0] = tri[ny < 0][:, ::-1]
    b.add(p, np.tile([0, 1 if up else -1, 0], (len(p), 1)), tri.reshape(-1), col, room)
    return len(tri)

def add_prism(b, poly, y0, y1):
    for pg in polys_of(poly):
        pg = pg.simplify(0.005)
        if pg.is_empty or pg.area < 1e-4: continue
        add_cap(b, pg, y1)
        for ring in [pg.exterior] + list(pg.interiors):
            c = np.asarray(ring.coords)
            for i in range(len(c) - 1):
                (x0, z0), (x1, z1) = c[i], c[i + 1]
                if abs(x1 - x0) + abs(z1 - z0) < 1e-4: continue
                q = np.array([[x0, y0, -z0], [x1, y0, -z1], [x1, y1, -z1], [x0, y1, -z0]], np.float32)
                n = np.cross(q[1] - q[0], q[3] - q[0]); n /= (np.linalg.norm(n) or 1)
                b.add(q, np.tile(n, (4, 1)), [0, 1, 2, 0, 2, 3])

def strip(pts, w):
    ls = LineString(pts)
    if ls.length < 0.02: return None
    return ls.buffer(w / 2, cap_style=2, join_style=2)

# ------------------------------------------------------------------ main
def build(st):
    data = json.load(open(SHOW / st / 'data.json'))
    zero = data['zeroEL']
    S = {s['code']: s for s in data['storeys']}
    order = sorted(data['storeys'], key=lambda s: s['el'])
    nxt = {s['code']: (order[i + 1]['rel'] - s['rel'] if i + 1 < len(order) else 4.0) for i, s in enumerate(order)}
    def mbox(code, pad=5.0):  # storey box in model xy
        x0, y0, z0, x1, y1, z1 = S[code]['box']
        return (min(x0, x1) - pad, min(-z0, -z1) - pad, max(x0, x1) + pad, max(-z0, -z1) + pad)
    Rm, Tm = reg(int(st[1]))
    for code, off in BASE.get(st, {}).items(): S[code] = dict(S[code], rel=S[code]['rel'] + off)
    buckets = {}; rooms = []; labels = {}; legend = {}; srcs = {}
    def B(code, kind):
        return buckets.setdefault((code, kind), Bucket())

    for fn, codes in JOBS[st]:
        doc = ezdxf.readfile(DXF / f'{fn}.dxf'); msp = doc.modelspace()
        dwg = fn.upper()
        if fn == 't2-a-10':
            Rr, cI, cD = R5
            X = lambda p: (np.asarray(p, float) - cD) @ Rr.T + cI
        else:
            X = lambda p: np.asarray(p, float) @ Rm.T + Tm
        # legend from swatches outside the drawing area
        allbox = [mbox(c, 8) for c in S]
        def inside_any(p):
            return any(b[0] <= p[0] <= b[2] and b[1] <= p[1] <= b[3] for b in allbox)
        texts = [e for e in msp if e.dxftype() in ('TEXT', 'MTEXT')]
        tleg = [(text_center(e) if e.dxftype() == 'TEXT' else (e.dxf.insert.x, e.dxf.insert.y), e) for e in texts if e.dxf.layer.startswith('G-TTLB')]
        for h in msp.query('HATCH'):
            g = hatch_poly(h)
            if g is None or g.is_empty: continue
            c = g.centroid; bx = g.bounds
            if h.dxf.layer.startswith('G-') or (not inside_any(X([[c.x, c.y]])[0]) and bx[2] - bx[0] < 8):
                best = None
                for (tx, ty), e in tleg:
                    if bx[2] - 0.5 <= tx - 0 and tx - bx[2] < 16 and abs(ty - c.y) < 1.4:
                        d = tx - bx[2]
                        if best is None or d < best[0]: best = (d, e.dxf.text if e.dxftype() == 'TEXT' else e.plain_text())
                if best and not re.fullmatch(r'[0-9.,\s]+|[A-Za-z]|.*視點.*', best[1]):
                    legend[tuple(round(v, 2) for v in ent_rgb(h, doc))] = best[1]

        def target(code_list, p):  # model-coord point -> storey code(s)
            if fn in SPLIT: return [SPLIT[fn](p[0])]
            return code_list

        for code in codes:
            if code not in S: continue
            srcs.setdefault(code, []).append(dwg)
        for e in msp:
            L = e.dxf.layer
            if SKIP_LAYER.match(L): continue
            t = e.dxftype()
            if t == 'HATCH':
                if not L.startswith('A-AREA'): continue
                g = hatch_poly(h := e)
                if g is None or g.is_empty: continue
                c0 = g.centroid
                for code in target(codes, (c0.x, c0.y)):
                    if code not in S: continue
                    sh = SHIFT.get((fn, code), (0, 0))
                    gg = affinity.translate(g, *sh)
                    cm = X([[gg.centroid.x, gg.centroid.y]])[0]; bx = mbox(code)
                    if not (bx[0] <= cm[0] <= bx[2] and bx[1] <= cm[1] <= bx[3]): continue
                    gm = affinity.affine_transform(gg, [*Rmat(fn, Rm)[0], *Rmat(fn, Rm)[1], *Toff(fn, Tm)]) if True else gg
                    rgb = ent_rgb(e, doc)
                    r_, g_, b_ = rgb; lum = 0.3 * r_ + 0.59 * g_ + 0.11 * b_; grey = max(rgb) - min(rgb) < 0.06
                    if (r_ > 0.7 and g_ < 0.3 and b_ < 0.3) or '視點' in (legend.get(tuple(round(v, 2) for v in rgb)) or ''): continue
                    for pg in polys_of(gm.buffer(0)):
                        if pg.area < 0.25: continue
                        if grey and lum < 0.45:                       # poche = wall / column body
                            add_prism(B(code, 'wall'), pg, S[code]['rel'] + 0.03, S[code]['rel'] + max(2.4, min(nxt[code] - 0.35, WALL_H_MAX))); continue
                        if grey and lum < 0.7 and pg.area < 30:
                            add_prism(B(code, 'col'), pg, S[code]['rel'] + 0.03, S[code]['rel'] + max(2.4, min(nxt[code] - 0.35, WALL_H_MAX))); continue
                        if lum > 0.97 and pg.area < 8: continue
                        if pg.area > 3000: continue                    # site / terrain background
                        ri = len(rooms)
                        rooms.append(dict(st=code, poly=pg, rgb=rgb, area=pg.area, src=dwg, names=[], nums=[], cat=None))
            elif t in ('LWPOLYLINE', 'LINE', 'CIRCLE'):
                pts, closed = lw_pts(e)
                if not pts or len(pts) < 2: continue
                c0 = np.mean(pts, 0)
                for code in target(codes, c0):
                    if code not in S: continue
                    sh = np.array(SHIFT.get((fn, code), (0, 0)))
                    pm = X(np.asarray(pts) + sh); cm = pm.mean(0); bx = mbox(code)
                    if not (bx[0] <= cm[0] <= bx[2] and bx[1] <= cm[1] <= bx[3]): continue
                    kind = kind_of(L)
                    if kind: geo_add(B, code, kind, pm, closed, S[code]['rel'], nxt[code])
            elif t in ('TEXT', 'MTEXT') and L in ('A-AREA-IDEN', 'A-ANNO-TEXT', 'T-ANNO-TEXT'):
                txt = (e.dxf.text if t == 'TEXT' else e.plain_text()).strip().replace('　', ' ')
                if not txt: continue
                c0 = text_center(e) if t == 'TEXT' else (e.dxf.insert.x, e.dxf.insert.y)
                hgt = e.dxf.get('height', 1.0) if t == 'TEXT' else e.dxf.get('char_height', 1.0)
                for code in target(codes, c0):
                    if code not in S: continue
                    sh = np.array(SHIFT.get((fn, code), (0, 0)))
                    pm = X([np.asarray(c0) + sh])[0]; bx = mbox(code)
                    if not (bx[0] <= pm[0] <= bx[2] and bx[1] <= pm[1] <= bx[3]): continue
                    labels.setdefault(code, []).append(dict(t=txt, p=pm, h=hgt, layer=L))

    BAD = re.compile(r'^(EL ?[0-9.]+|[0-9.,]+|[A-Z]|.*圖 ?3\.\d.*|.*視點.*|.*眼高.*)$')
    # rooms: name from labels inside polygon
    for r in rooms:
        r['cat'] = legend.get(tuple(round(v, 2) for v in r['rgb']))
    for code, labs in labels.items():
        rs = [r for r in rooms if r['st'] == code]
        for lb in labs:
            if BAD.match(lb['t']): continue
            P = Point(*lb['p'])
            hit = [r for r in rs if r['poly'].contains(P)]
            if not hit: continue
            r = min(hit, key=lambda r: r['area'])
            (r['nums'] if re.fullmatch(r'[0-9A-Z]{1,4}', lb['t']) and not lb['t'] == 'WC' else r['names']).append(lb['t'])
            lb['room'] = rooms.index(r)
    keep = [r for r in rooms if not any('挑空' in n for n in r['names'][:1]) and not (r['cat'] or '').startswith('挑空')]
    for r in rooms:
        if r not in keep:
            for lb in [l for ls in labels.values() for l in ls if l.get('room') is not None and rooms[l['room']] is r]: lb['room'] = None
    remap = {id(r): i for i, r in enumerate(keep)}
    for ls in labels.values():
        for lb in ls:
            if lb.get('room') is not None: lb['room'] = remap.get(id(rooms[lb['room']]))
    rooms = keep
    for i, r in enumerate(rooms):
        rel = S[r['st']]['rel']
        lin = srgb2lin(r['rgb'])
        add_cap(B(r['st'], 'floor'), r['poly'], rel + 0.035 + 0.002 * (i % 5), col=lin, room=i)

    # ---- write GLB
    bin_ = bytearray(); views = []; accs = []; meshes = []; nodes = []
    def add_acc(arr, ctype, typ, target, minmax=False, normalized=False, stride=None):
        off = len(bin_); raw = arr.tobytes(); bin_.extend(raw)
        while len(bin_) % 4: bin_.append(0)
        v = dict(buffer=0, byteOffset=off, byteLength=len(raw), target=target)
        if stride: v['byteStride'] = stride
        views.append(v)
        a = dict(bufferView=len(views) - 1, componentType=ctype, count=int(arr.shape[0]), type=typ)
        if normalized: a['normalized'] = True
        if minmax: a['min'] = arr.min(0).tolist(); a['max'] = arr.max(0).tolist()
        accs.append(a); return len(accs) - 1
    MATS = ['floor', 'wall', 'prtn', 'col', 'glass', 'line', 'stair', 'plat']
    materials = []
    for k in MATS:
        if k == 'floor': c = (1, 1, 1, 1)
        else: c = (*srgb2lin(COL[k]).tolist(), 0.34 if k == 'glass' else 1)
        m = dict(name='int-' + k, doubleSided=True, pbrMetallicRoughness=dict(baseColorFactor=list(c), metallicFactor=0.0, roughnessFactor=0.2 if k == 'glass' else 0.9))
        if k == 'glass': m['alphaMode'] = 'BLEND'
        materials.append(m)
    GROUP = dict(floor='室內・空間地坪', wall='室內・牆體', prtn='室內・隔間', col='室內・柱', glass='室內・玻璃隔間',
                 line='室內・樓板外緣', stair='室內・樓梯電梯', plat='室內・月台')
    ntri = 0
    for (code, kind), b in sorted(buckets.items()):
        if not b.n: continue
        pos = np.concatenate(b.pos).astype(np.float32)
        nrm = np.concatenate(b.nrm).astype(np.float32)
        idx = np.concatenate(b.idx)
        it = 5125 if b.n > 65535 else 5123
        attrs = dict(POSITION=add_acc(pos, 5126, 'VEC3', 34962, True),
                     NORMAL=add_acc(np.concatenate([np.round(nrm * 127).astype(np.int8), np.zeros((len(nrm), 1), np.int8)], 1), 5120, 'VEC3', 34962, normalized=True, stride=4))
        if b.col:
            col = np.round(np.concatenate(b.col) * 255).astype(np.uint8)
            attrs['COLOR_0'] = add_acc(np.concatenate([col, np.full((len(col), 1), 255, np.uint8)], 1), 5121, 'VEC4', 34962, normalized=True)
        if b.room:
            attrs['_ROOM'] = add_acc(np.concatenate(b.room), 5123, 'SCALAR', 34962)
        meshes.append(dict(primitives=[dict(attributes=attrs, indices=add_acc(idx.astype(np.uint32 if it == 5125 else np.uint16), it, 'SCALAR', 34963), material=MATS.index(kind))]))
        nodes.append(dict(name=f'{code}|{kind}', mesh=len(meshes) - 1, extras=dict(storey=code, group=GROUP[kind], interior=kind)))
        ntri += len(idx) // 3
    gltf = dict(asset=dict(version='2.0', generator='skytaxi dxf2interior'), scene=0, scenes=[dict(nodes=list(range(len(nodes))))],
                nodes=nodes, meshes=meshes, materials=materials, accessors=accs, bufferViews=views, buffers=[dict(byteLength=len(bin_))],
                extensionsUsed=['KHR_mesh_quantization'], extensionsRequired=['KHR_mesh_quantization'])
    js = json.dumps(gltf, ensure_ascii=False, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(bin_), 0x004E4942) + bytes(bin_)
    (SHOW / st / 'interior.glb').write_bytes(out)

    # ---- json
    def pt(p, code, dy=1.2): return [round(float(p[0]), 2), round(S[code]['rel'] + dy, 2), round(-float(p[1]), 2)]
    J = dict(src=srcs, legend=sorted(set(legend.values())), rooms=[], labels={})
    for i, r in enumerate(rooms):
        c = r['poly'].representative_point()
        nm = list(dict.fromkeys(r['names']))
        J['rooms'].append([r['st'], nm[0] if nm else None, '、'.join(nm[1:]) or None, r['cat'], '、'.join(dict.fromkeys(r['nums'])) or None, round(r['area'], 1), *pt((c.x, c.y), r['st'], 0.1), r['src'],
                           '#%02x%02x%02x' % tuple(int(v * 255) for v in r['rgb'])])
    for code, labs in labels.items():
        seen = []; out_l = []
        for lb in sorted(labs, key=lambda l: -l['h']):
            t = lb['t']
            if BAD.match(t): continue
            num = bool(re.fullmatch(r'[0-9A-Z]{1,4}', t)) and t != 'WC'
            if any(s[0] == t and np.hypot(*(s[1] - lb['p'])) < 3 for s in seen): continue
            seen.append((t, lb['p']))
            out_l.append([t, *pt(lb['p'], code), 1 if num else (2 if lb['h'] >= 1.5 else 3), -1 if lb.get('room') is None else lb['room']])
        J['labels'][code] = out_l
    (SHOW / st / 'interior.json').write_text(json.dumps(J, ensure_ascii=False, separators=(',', ':')))
    print(st, 'rooms', len(rooms), 'tris', ntri, 'glb KB', len(out) // 1024, 'legend', J['legend'], {k: len(v) for k, v in J['labels'].items()})

def Rmat(fn, Rm):
    if fn == 't2-a-10':
        Rr = R5[0]; return [Rr[0, 0], Rr[0, 1]], [Rr[1, 0], Rr[1, 1]]
    return [Rm[0, 0], Rm[0, 1]], [Rm[1, 0], Rm[1, 1]]
def Toff(fn, Tm):
    if fn == 't2-a-10':
        Rr, cI, cD = R5; t = cI - Rr @ cD; return [t[0], t[1]]
    return [Tm[0], Tm[1]]

def kind_of(L):
    if L in ('A-WALL',): return 'wall'
    if L in ('A-WALL-PRTN',): return 'prtn'
    if L in ('A-COLS',): return 'col'
    if L in ('A-GLAZ',): return 'glass'
    if L in ('A-FLOR-STRS', 'A-FLOR-ESCL', 'A-FLOR-EVTR'): return 'stair'
    if L in ('A-FLOR-OTLN',): return 'line'
    return None

def geo_add(B, code, kind, pm, closed, rel, h):
    hh = max(2.4, min(h - 0.35, WALL_H_MAX))
    y0 = rel + 0.03
    if kind in ('wall', 'prtn', 'col'):
        top = rel + (hh if kind != 'prtn' else min(hh, 3.0))
        if closed and len(pm) >= 3:
            pg = Polygon(pm).buffer(0)
            if pg.is_empty: return
            thick = 2 * pg.area / max(pg.length, 1e-6)
            if thick <= 0.7 or (kind == 'col' and pg.area < 4):
                add_prism(B(code, kind), pg, y0, top)
            elif pg.length > 80:  # whole-floor envelope: draw as floor edge only
                g = strip(np.vstack([pm, pm[:1]]), 0.12)
                if g is not None: add_prism(B(code, 'line'), g, rel + 0.04, rel + 0.08)
            else:  # an enclosure outline, not a wall body: wall along its boundary
                add_prism(B(code, kind), pg.exterior.buffer(0.09 if kind == 'prtn' else 0.13, cap_style=2, join_style=2), y0, top)
        else:
            g = strip(pm, 0.12 if kind == 'prtn' else 0.24)
            if g is not None: add_prism(B(code, kind), g, y0, top)
    elif kind == 'glass':
        g = strip(pm if not closed else np.vstack([pm, pm[:1]]), 0.05)
        if g is not None: add_prism(B(code, 'glass'), g, y0, rel + min(hh, 3.2))
    else:  # linework as thin raised strips
        ring = np.vstack([pm, pm[:1]]) if closed else pm
        g = strip(ring, 0.06 if kind == 'stair' else 0.1)
        if g is not None: add_prism(B(code, kind), g, rel + 0.04, rel + (0.07 if kind == 'stair' else 0.06))

if __name__ == '__main__':
    for st in (sys.argv[1:] or ['t1', 't2', 't3', 't4']):
        build(st)
