"""Build review/showcase/: landing + T1–T4 station viewer pages.

Run after tools/ifc2show.py has produced review/showcase/t*/data.json + model.glb.
"""
import json, re, html, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SC = os.path.join(ROOT, 'review', 'showcase')
ATLAS = os.path.join(ROOT, 'review', 'atlas', 'planning', 'index.html')

items = {}
for m in re.finditer(r'\{"k":"[^{}]*\}', open(ATLAS, encoding='utf-8').read()):
    it = json.loads(m.group(0)); items[it['k']] = (it['k'], it['c'], it['t'])
S = lambda *ks: [list(items[k]) for k in ks if k in items]
DB = {r[1]: r for r in json.load(open(os.path.join(ROOT, 'review', 'atlas', 'design', 'sheets.json'), encoding='utf-8'))}
D = lambda *cs: [[DB[c][0], c, DB[c][2], 'design'] for c in cs if c in DB]
FLOOR_DB = {'t1': {'G': ['A-07'], 'L2': ['A-08'], 'L3': ['A-09'], 'L4': ['A-10'], 'PL': ['A-11', 'A-05', 'F-01'], 'RF': ['A-13']},
            't2': {'B1': ['A-04'], '1F': ['A-05'], '2F': ['A-06'], '3F': ['A-07'], '4F': ['A-08'], '5F': ['A-08'], '6F': ['A-09'], 'R5': ['A-10', 'F-01'], 'RF-H': ['A-11'], 'RF-S': ['A-11']},
            't3': {'B2': ['A-14'], 'B1': ['A-15'], '1F': ['A-16'], '2F': ['A-08'], '3F': ['A-17'], '4F': ['A-17'], 'PL': ['A-07', 'F-01'], '5F': ['A-07'], '6F': ['A-18'], 'RF': ['A-19']},
            't4': {'GF': ['A-06'], 'ML': ['A-07'], 'CL': ['A-08'], 'PL': ['A-05', 'F-01'], 'RF': ['A-11']}}
def station_db(T):
    T = T.upper()
    return D(*[r[1] for r in DB.values() if r[0].startswith(T) and (r[1] in (T + '-M02', T + '-CONCEPT', T + '-A-01') or
              (r[3] in ('剖面與構造詳圖', '各向立面') and r[1].split('-')[1] in ('A', 'S')))])

ST = {
 't1': dict(name='新化之門站', role='起站・商店街與光舟月台', platform='PL',
   blurb='新化端的起站。迎賓廣場與水鏡在地面層，階梯店街一路爬升四層到光舟月台，屋頂是可走的天空步道。',
   sheets=S('010', '014', '020', '021', '022', '034', '074'),
   floors={'G': dict(short='迎賓廣場・水鏡', sheets=S('046', '041', '076', '077')),
           'L2': dict(short='店街・旅遊服務', sheets=S('047', '078')),
           'L3': dict(short='店街・站務後勤', sheets=S('048')),
           'L4': dict(short='店街上段', sheets=S('049', '079')),
           'PL': dict(short='光舟月台・出站', note='旅客由此上下車廂。月台門沿弦線一字排開，出站後經階梯店街下行到迎賓廣場。', sheets=S('050', '080')),
           'RF': dict(short='天空步道', sheets=S('051'))}),
 't2': dict(name='湖濱旅館站', role='中間站・湖濱旅館', platform='R5',
   blurb='車站與湖濱旅館共構。旅館客房與公共翼疊在下方，纜車月台抬到 R5，兩側式月台分上下行。',
   sheets=S('011', '015', '018', '023', '024', '025', '035', '042', '087'),
   floors={'B1': dict(short='地下停車・機電', sheets=S('052')),
           '1F': dict(short='站廳・旅館大廳', sheets=S('053', '081')),
           '2F': dict(short='客房・湖側餐廳', sheets=S('054', '082', '083', '084')),
           '3F': dict(short='客房・受控站旅口', sheets=S('055', '085', '084')),
           '4F': dict(short='客房・公共翼', sheets=S('056', '084')),
           '5F': dict(short='客房・公共翼', sheets=S('056', '084')),
           '6F': dict(short='客房・公共轉乘', sheets=S('057', '084')),
           'RF-H': dict(short='旅館綠屋頂', sheets=S('059')),
           'R5': dict(short='雙側式月台', note='兩側式月台，上行與下行各用一側。售驗票界面與受控轉乘口在月台層完成，旅客不需進入旅館區。', sheets=S('058', '086')),
           'RF-S': dict(short='站房摺板屋面', sheets=S('059'))}),
 't3': dict(name='湖濱山城站', role='中間站・山城旅館與宴會', platform='PL',
   blurb='旅宿與聚會在同一站。宴會、會議、餐飲與 XR 樂園分層配置，月台在 4F 與 5F 之間，上方是轉乘大廳與雲端餐廳。',
   sheets=S('012', '016', '019', '026', '027', '028', '036', '043', '060', '075', '095'),
   floors={'B2': dict(short='湖景宴會・面湖平台', sheets=S('061', '088')),
           'B1': dict(short='會議層', sheets=S('062', '089')),
           '1F': dict(short='全日餐廳・宴會前廳', sheets=S('063', '090')),
           '2F': dict(short='大廳・前庭落客', sheets=S('064', '091')),
           '3F': dict(short='XR 樂園・SPA', sheets=S('065', '092', '093')),
           '4F': dict(short='健身・XR 挑空', sheets=S('094', '065')),
           'PL': dict(short='A／B 線月台', note='A／B 兩線雙側式月台，旅客上下車後經 5F 轉乘大廳分流到旅館、餐飲與宴會。', sheets=S('066', '096')),
           '5F': dict(short='轉乘大廳・候車廊', sheets=S('066', '096')),
           '6F': dict(short='跨線連通・雲端餐廳', sheets=S('067', '097')),
           'RF': dict(short='摺板屋面', sheets=S('068'))}),
 't4': dict(name='新化林場站', role='終點站・林場與林冠步道', platform='PL',
   blurb='森林端的終點站。地面是林場驛站，中間層為展示與生態教室，林冠層接觀景平台與步道，月台架在最上方。',
   sheets=S('013', '017', '029', '030', '031', '037', '044'),
   floors={'FND': dict(short='基礎・樁帽', sheets=S('030')),
           'GF': dict(short='林場驛站・到達層', sheets=S('069', '098')),
           'ML': dict(short='多功能展示', sheets=S('070', '099')),
           'CL': dict(short='林冠展示・觀景平台', sheets=S('071', '100')),
           'PL': dict(short='森林側 A 線・服務側 B 線', note='森林側 A 線與服務側 B 線月台，兩線之間設檢修走道（MNT）。驗票與站務在月台層。', sheets=S('072', '101')),
           'RF': dict(short='屋頂植栽', sheets=S('073'))}),
}
ORDER = ['t1', 't2', 't3', 't4']
E = html.escape

def station_page(sid):
    st = ST[sid]; code = sid.upper()
    floors = {c: dict(f, design=D(*[f'{code}-{x}' for x in FLOOR_DB[sid].get(c, [])])) for c, f in st['floors'].items()}
    meta = dict(id=sid, name=st['name'], platform=st['platform'], blurb=st['blurb'], sheets=st['sheets'], design=station_db(sid), floors=floors)
    nav = ''.join(f'<a href="../{t}/"{" aria-current=page" if t == sid else ""}>{t.upper()}<span> {E(ST[t]["name"])}</span></a>' for t in ORDER)
    return f'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{code} {E(st["name"])}｜站體展示館</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' rx='3' fill='%23176a63'/%3E%3Cpath d='M3 11h10M5 8h6M7 5h2' stroke='%23fff' stroke-width='1.4'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../app.css">
<script type="importmap">{{"imports":{{"three":"../vendor/three.module.min.js"}}}}</script>
</head>
<body data-time="day">
<canvas id="gl" aria-label="{code} {E(st["name"])} 3D 站體模型"></canvas>
<div id="rl" class="rlabels" aria-hidden="false"></div>
<div id="pins" class="pins"></div>
<header class="top">
  <a class="back" href="../">站體展示館</a>
  <div class="ttl"><span class="code">{code}</span><h1>{E(st["name"])}</h1></div>
  <nav class="stn" aria-label="切換車站">{nav}</nav>
  <div class="ctrls">
    <div class="seg" role="group" aria-label="瀏覽模式"><button type="button" id="m-orbit" aria-pressed="true">環視</button><button type="button" id="m-walk" aria-pressed="false">漫遊</button></div>
    <div class="seg" role="group" aria-label="時段"><button type="button" data-time="day" aria-pressed="true">日</button><button type="button" data-time="dusk" aria-pressed="false">昏</button><button type="button" data-time="night" aria-pressed="false">夜</button></div>
  </div>
</header>
<aside id="panel" class="panel" aria-label="樓層與構件">
  <button type="button" id="ph" class="ph" aria-expanded="false" aria-controls="pb"><span id="sum"></span><span class="tog">樓層與構件</span></button>
  <div class="opts">
    <label><input type="checkbox" id="pins-t" checked>樓層標籤</label>
    <label><input type="checkbox" id="site-t" checked>基地環境</label>
    <label><input type="checkbox" id="iso-t">只顯示聚焦樓層</label>
    <label><input type="checkbox" id="int-t" checked>室內配置</label>
    <div class="rg"><label for="exp">樓層分離</label><input type="range" id="exp" min="0" max="1" step="0.01" value="0"></div>
    <div class="rg"><label for="vcut">縱向剖切</label><input type="range" id="vcut" min="0" max="100" step="1" value="100"></div>
  </div>
  <div id="pb" class="pb"></div>
</aside>
<div id="ruler" class="ruler" aria-label="標高尺：點樓層聚焦，拖曳左側刻度剖切">
  <div class="r-head">標高 EL m</div>
  <div class="r-track"><div class="r-grab" title="拖曳設定水平剖切高度"></div></div>
  <button type="button" id="cut-off" hidden>取消剖切</button>
</div>
<div id="compass" class="compass" aria-hidden="true"><i>N</i></div>
<nav id="views" class="views" aria-label="預設視角"></nav>
<section id="info" class="info" hidden aria-live="polite"></section>
<div class="walk">
  <div class="joy" id="joy" aria-label="移動搖桿"><b id="knob"></b></div>
  <div class="tp-wrap"><span>傳送到樓層</span><div id="tp" class="tp"></div><p class="hint">WASD 或方向鍵移動，拖曳畫面轉向，Shift 加速，Q／E 升降</p></div>
</div>
<div id="load" class="load" role="status">載入站體模型…</div>
<div id="fail" class="fail" hidden><p>這個瀏覽器無法啟動 3D 繪圖（WebGL）。請改用新版 Chrome、Safari 或 Edge 開啟。</p></div>
<script type="application/json" id="meta">{json.dumps(meta, ensure_ascii=False)}</script>
<script>if(/[?&]shot=1/.test(location.search)){{document.body.classList.add('shot');var m=document.getElementById('meta'),o=JSON.parse(m.textContent);o.shot=1;m.textContent=JSON.stringify(o);}}</script>
<script type="module" src="../app.js"></script>
</body>
</html>
'''

def landing():
    D = {t: json.load(open(os.path.join(SC, t, 'data.json'), encoding='utf-8')) for t in ORDER}
    lo, hi = 30, 82
    W, H = 1200, 560
    top, bot = 46, 30
    ys = lambda el: top + (hi - el) / (hi - lo) * (H - top - bot)
    colw = (W - 90) / 4
    svg = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="xs-t" class="xs"><title id="xs-t">四站樓層標高對照，點選任一樓層進入該層</title>']
    for v in range(lo, hi + 1, 5):
        y = ys(v)
        svg.append(f'<line x1="70" x2="{W - 10}" y1="{y:.1f}" y2="{y:.1f}" class="g"/><text x="60" y="{y + 4:.1f}" class="gt">{v}</text>')
    svg.append(f'<text x="60" y="{top - 22}" class="gt">EL m</text>')
    pls = []
    for i, t in enumerate(ORDER):
        d = D[t]; st = ST[t]; x0 = 90 + i * colw; cx = x0 + colw / 2
        sts = sorted(d['storeys'], key=lambda s: s['el'])
        spans = [max(abs(s['box'][3] - s['box'][0]), abs(s['box'][5] - s['box'][2])) if s.get('box') else 20 for s in sts]
        mx = max(spans)
        svg.append(f'<a href="{t}/" class="sh"><text x="{cx:.1f}" y="{top - 22}" text-anchor="middle"><tspan class="sc">{t.upper()}</tspan> {E(st["name"])}</text></a>')
        lasty = None
        for s, sp in zip(sts, spans):
            w = 40 + (colw - 70) * min(sp / mx, 1)
            y = ys(s['el']); pl = s['code'] == st['platform']
            right = lasty is not None and abs(lasty - y) < 12
            lasty = None if right else y
            href = f'{t}/#v=platform' if pl else f'{t}/#f={s["code"]}'
            cls = 'fl pl' if pl else 'fl'
            svg.append(f'<a href="{href}" class="{cls}"><title>{t.upper()} {s["code"]}　EL {s["el"]:.2f}　{E(s["use"])}</title>'
                       f'<rect x="{cx - w / 2:.1f}" y="{y - (3 if pl else 2):.1f}" width="{w:.1f}" height="{6 if pl else 4}" rx="1.5"/>'
                       + (f'<text x="{cx + w / 2 + 6:.1f}" y="{y + 4:.1f}" text-anchor="start" class="fc">{E(s["code"])}</text></a>' if right else f'<text x="{cx - w / 2 - 6:.1f}" y="{y + 4:.1f}" text-anchor="end" class="fc">{E(s["code"])}</text></a>'))
            if pl: pls.append((cx, y, s['el']))
    path = ' '.join(f'{"M" if j == 0 else "L"}{x:.1f},{y:.1f}' for j, (x, y, _) in enumerate(pls))
    svg.insert(1, f'<path d="{path}" class="cable"/>')
    for x, y, e in pls:
        svg.append(f'<text x="{x:.1f}" y="{y - 10:.1f}" text-anchor="middle" class="plt">月台 {e:.2f}</text>')
    svg.append('</svg>')

    cards = []
    for t in ORDER:
        d = D[t]; st = ST[t]; sts = sorted(d['storeys'], key=lambda s: -s['el'])
        pl = next(s for s in sts if s['code'] == st['platform'])
        rows = ''.join(
            f'<li class="{"pl" if s["code"] == st["platform"] else ""}"><a href="{t}/#{"v=platform" if s["code"] == st["platform"] else "f=" + s["code"]}"><b>{E(s["code"])}</b><span>{E(st["floors"].get(s["code"], {}).get("short") or s["use"])}</span><em>{s["el"]:.2f}</em></a>'
            f'<a class="pv" href="{t}/#f={s["code"]}&amp;v=plan" aria-label="{t.upper()} {E(s["code"])} 平面切視">切視</a></li>' for s in sts)
        cards.append(f'''<article class="card" id="{t}">
  <a class="shot" href="{t}/"><img src="shots/{t}.webp" alt="{t.upper()} {E(st["name"])} 站體模型全景" width="960" height="600" loading="lazy"></a>
  <div class="cb">
    <h2><a href="{t}/"><span class="sc">{t.upper()}</span>{E(st["name"])}</a></h2>
    <p class="role">{E(st["role"])}</p>
    <p>{E(st["blurb"])}</p>
    <dl><div><dt>樓層</dt><dd>{len(sts)}</dd></div><div><dt>構件</dt><dd>{len(d["elements"]):,}</dd></div><div><dt>月台</dt><dd>{E(pl["code"])}　EL {pl["el"]:.2f}</dd></div></dl>
    <div class="go"><a href="{t}/#v=platform" class="b pl">看月台</a><a href="{t}/" class="b">進入站體</a><a href="{t}/#m=walk" class="b">漫遊</a></div>
    <ol class="fls">{rows}</ol>
  </div>
</article>''')

    return f'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>站體展示館｜虎頭埤纜車四站</title>
<style>
:root{{--ink:#1c2e30;--muted:#5b6d6e;--line:rgba(28,46,48,.14);--jade:#176a63;--jade2:#e2efeb;--amber:#c8871a;--amber2:#f6ead2;--bg:#eef2f0;
  font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",system-ui,sans-serif;color:var(--ink);background:var(--bg)}}
*{{box-sizing:border-box}} body{{margin:0;font-variant-numeric:tabular-nums}} a{{color:var(--jade)}}
:focus-visible{{outline:2px solid var(--jade);outline-offset:2px}}
.wrap{{max-width:1240px;margin:0 auto;padding:0 24px}}
header{{padding:28px 0 8px}}
.crumb{{font-size:13px;color:var(--muted);text-decoration:none}}
h1{{font-size:34px;letter-spacing:.08em;margin:10px 0 6px;font-weight:800}}
.lede{{max-width:62ch;color:#33484a;line-height:1.8;margin:0 0 18px}}
.xs-box{{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px 10px 6px;overflow-x:auto}}
.xs{{display:block;width:100%;min-width:760px;height:auto}}
.xs .g{{stroke:rgba(28,46,48,.08)}} .xs .gt{{font-size:11px;fill:var(--muted);text-anchor:end}}
.xs .sh text{{font-size:15px;font-weight:700;fill:var(--ink)}} .xs .sc{{fill:var(--jade);font-weight:800}}
.xs .fl rect{{fill:#9fb0ae;transition:fill .15s}} .xs .fl .fc{{font-size:10.5px;fill:var(--muted)}}
.xs .fl:hover rect,.xs .fl:focus rect{{fill:var(--jade)}} .xs .fl:hover .fc{{fill:var(--ink)}}
.xs .pl rect{{fill:var(--amber)}} .xs .pl .fc{{fill:#8a5a0c;font-weight:700}}
.xs .cable{{fill:none;stroke:var(--amber);stroke-width:1.4;stroke-dasharray:5 5;opacity:.75}}
.xs .plt{{font-size:11px;fill:#8a5a0c;font-weight:700}}
.cap{{font-size:12.5px;color:var(--muted);margin:8px 4px 0}}
.cards{{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin:28px 0 48px}}
.card{{background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}}
.shot img{{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;background:linear-gradient(#c3d5d8,#e5ebe7)}}
.cb{{padding:16px 20px 18px}}
.card h2{{margin:0;font-size:22px;letter-spacing:.05em}} .card h2 a{{color:var(--ink);text-decoration:none}}
.card h2 .sc{{font-size:14px;color:#fff;background:var(--jade);border-radius:6px;padding:1px 7px;margin-right:10px;vertical-align:3px}}
.role{{margin:4px 0 8px;color:var(--muted);font-size:13px}}
.cb>p{{line-height:1.75;font-size:14.5px;margin:0 0 12px}}
.cb dl{{display:flex;gap:22px;margin:0 0 12px}} .cb dt{{font-size:11.5px;color:var(--muted)}} .cb dd{{margin:0;font-weight:700;font-size:16px}}
.go{{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}}
.b{{text-decoration:none;border:1px solid rgba(28,46,48,.26);border-radius:9px;padding:6px 14px;font-size:13.5px;color:var(--ink)}}
.b:hover{{border-color:var(--jade)}} .b.pl{{background:var(--amber);border-color:var(--amber);color:#fff}}
.fls{{list-style:none;margin:0;padding:0;border-top:1px solid var(--line)}}
.fls li{{display:flex;border-bottom:1px solid var(--line)}}
.fls li>a:first-child{{flex:1;display:grid;grid-template-columns:52px 1fr auto;gap:10px;padding:7px 4px;text-decoration:none;color:var(--ink);font-size:13.5px}}
.fls li>a:first-child:hover{{background:var(--jade2)}}
.fls em{{font-style:normal;color:var(--muted);font-size:12.5px}}
.fls .pl>a:first-child{{background:var(--amber2)}} .fls .pl b{{color:#8a5a0c}}
.pv{{font-size:12px;padding:7px 10px;text-decoration:none;border-left:1px solid var(--line);color:var(--muted)}} .pv:hover{{color:var(--jade)}}
.how{{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin:0 0 56px;font-size:13.5px;line-height:1.75;color:#33484a}}
.how h3{{font-size:14px;margin:0 0 4px;color:var(--ink)}}
footer{{font-size:12px;color:var(--muted);padding:0 0 30px}}
@media (max-width:860px){{.cards,.how{{grid-template-columns:1fr}} h1{{font-size:27px}}}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <a class="crumb" href="../">← 回審查目錄</a>
  <h1>站體展示館</h1>
  <p class="lede">四座車站的 BIM V1.6 模型，可在瀏覽器內環視、漫遊與剖切。下圖依實際標高排列每一層樓板，琥珀色為月台層；點任一層直接進入該站、該層。進站後可再點選任一構件，查看編號、高程與來源圖說。</p>
</header>
<div class="xs-box">{''.join(svg)}</div>
<p class="cap">樓板寬度依該層構件水平範圍等比繪製；月台之間的虛線只示意四站月台標高的連接順序，不代表纜線路徑。</p>
<section class="cards">{''.join(cards)}</section>
<section class="how">
  <div><h3>站、月台、樓層</h3>每站可看全景，或直接進入月台；右側標高尺列出每一層，點選後其他樓層轉為透明，只留本層與本層圖說。</div>
  <div><h3>剖切與分離</h3>拖曳標高尺左側刻度做水平剖切，「平面切視」會在樓板上方 1.5 m 切開並由正上方俯視。樓層分離可把各層上下拉開。</div>
  <div><h3>構件與圖說</h3>點模型任一表面即顯示該構件的編號、材料群組、BIM 分類、高程範圍與來源圖說；每層附彩色平面圖，連到規劃配置圖冊原圖。</div>
</section>
<footer>模型來源：T1–T4 BIM V1.6（IFC4），工程協調級，原模材質與色彩供辨識。平面圖取自整體規劃與配置圖冊。</footer>
</div>
</body>
</html>
'''

for t in ORDER:
    open(os.path.join(SC, t, 'index.html'), 'w', encoding='utf-8').write(station_page(t))
open(os.path.join(SC, 'index.html'), 'w', encoding='utf-8').write(landing())
print('ok')
