# Builds review/index.html — unified directory for review.skytaxi.com.tw
import html, json
OUT = '/home/claude/skytaxi-site/review/index.html'

E = html.escape
# (href, thumb, format, title, desc)
SECTIONS = [
 ('route-sec', '全案與路線', '從全線看起：整合模型、運行展示與基地位置。', [
   ('m/01/', '01', '3D 模型', '全案互動模型 V1.0', '四站、全線與基地整合在同一個模型，可切換站別、樓層與構件類別，支援分層拆解與中英切換。'),
   ('https://route.skytaxi.com.tw/', 'route', '網站，中英文', '四站與路線互動展示 V1.6', '四站五跨、全線同步列車動畫、縱斷面定位與四站構件拆解。'),
   ('m/34/', '34', '航照疊位', '四站基地航照疊位', '沿線航照疊合弦軌、BIM 外廓、CAD 平面與完工屋頂，可下載 KML、PDF 圖冊與 8K 圖。'),
   ('m/11/', '11', '地圖', '四站基地互動地圖', '四站基地位置與站點查詢，套疊國土測繪中心底圖。'),
 ]),
 ('station-sec', '車站與建築', '四站 BIM、站體建築與月台空間。', [
   ('bim/', 'bim', 'BIM，IFC4', '四站 BIM 互動檢視 V1.6', 'T1 至 T4 四站 BIM 模型，可旋轉、依樓層篩選、搜尋構件並查看屬性；IFC 原始檔見頁尾下載。'),
   ('m/05/', '05', '3D 建築', '四站站體工作台', '同一視角看外觀、縱剖、橫剖、剖切深度與地下構件。'),
   ('m/33/', '33', '3D 建築', 'T3 湖濱山城站　建築與空間', 'T3 站建築、月台與空間配置的 3D 檢視。'),
   ('t3-platform-3d/', 't3p', '3D 模型', 'T3 月台關係', '雙線側式月台、吊掛車廂、大廳與跨軌連通動線。'),
   ('m/24/', '24', '3D 模型', 'T4 新化林場站　站體 R1', 'T4 站體模型，可旋轉檢視。'),
   ('m/27/', '27', 'CAD，STEP', 'T1 新化之門　逐層三維 CAD V0.5', '一樓至屋頂逐層檢視，附各樓層 STEP 檔下載。'),
 ]),
 ('eng-sec', '結構與工程', '站體構件拆解與纜索縱斷面計算。', [
   ('m/08/', '08', '3D 結構', '四站 3D 結構拆解 V1.1', '四站構件分層展示，雙語、分層與剖切，可逐層查看構件數量與尺寸。'),
   ('m/25/', '25', '計算模型', '五跨縱斷面與淨空 R1', '全線五跨縱斷面與淨空的互動計算，可調整張力與荷重檢核。'),
   ('m/26/', '26', '計算模型', 'T1 至 P2 第一跨 446 m', '第一跨縱斷面與淨空的互動計算。'),
 ]),
 ('life-sec', '體驗與園區', '旅客看到的纜車、園區與站內空間。', [
   ('https://park.skytaxi.com.tw/', 'park', '完整網站', '長壽生活園區', '園區主題網站：四站、六大生態、園區纜車、住宿與行前指南。'),
   ('m/04/', '04', '網站', '纜車搭乘與遊園', '旅客網站：四站介紹、站內體驗、動線、遊程與到訪服務。'),
   ('m/02/', '02', '360° 全景', '室內 360° 導覽', 'T2 湖濱旅館站與 T3 湖濱山城站室內全景。', [('m/20/', 'XR 空間與 310 客房')]),
 ]),
]

ARCHIVE = [
 ('已由現行版取代', [
   ('路線與運行拆解 V1.4', [('https://operation.skytaxi.com.tw/', '開啟')], '現行版：四站與路線 V1.6'),
   ('四站 BIM 網站版檢視器', [('m/03/', '開啟')], '現行版：四站 BIM V1.6'),
   ('四站 3D 結構拆解　獨立版', [('m/22/', '開啟')], '現行版：結構拆解 V1.1'),
   ('四站結構拆解　原始版', [('m/30/', '入口'), ('stations/t1/', 'T1'), ('stations/t2/', 'T2'), ('stations/t3/', 'T3'), ('stations/t4/', 'T4')], '現行版：結構拆解 V1.1'),
   ('湖山長健園區', [('m/09/', '開啟')], '現行版：長壽生活園區'),
   ('湖與森林　網站提案', [('m/12/', '開啟')], '現行版：長壽生活園區'),
   ('四站長壽生活解構', [('m/31/', '入口'), ('longevity/portal/', 'T1'), ('longevity/lakeside/', 'T2'), ('longevity/academy/', 'T3'), ('longevity/forest/', 'T4')], '現行版：長壽生活園區'),
   ('長壽之湖網站', [('m/32/', '開啟')], '現行版：長壽生活園區'),
   ('動態資料離線合集 2026-11-24', [('m/23/', '開啟')], '現行索引：最終資料總覽'),
 ]),
 ('T1 站方案比選', [
   ('T1 新化之門　中央單梁概念 CAD V0.4', [('m/28/', '開啟')], '附 GLB、STEP'),
   ('T1 新化之門　U4-430 概念 CAD V0.2', [('m/29/', '開啟')], '附 GLB、STEP'),
 ]),
 ('公司首頁展示', [
   ('虎頭埤纜車　對外營業網站', [('https://www.skytaxi.com.tw/hutoupi/', '開啟')], ''),
   ('營運動態模擬', [('https://www.skytaxi.com.tw/sim/3d/', '三維實景'), ('https://www.skytaxi.com.tw/sim/how/', '如何運行'), ('https://www.skytaxi.com.tw/sim/classic/', '平面')], ''),
 ]),
]

DOWNLOADS = [
 ('四站 BIM（IFC4 V1.6）', [
   ('bim/IFC4/T1_新化之門站_BIM_V1.6.ifc', 'T1 新化之門站', '5.6 MB'),
   ('bim/IFC4/T2_湖濱旅館站_BIM_V1.6.ifc', 'T2 湖濱旅館站', '5.1 MB'),
   ('bim/IFC4/T3_湖濱山城站_BIM_V1.6.ifc', 'T3 湖濱山城站', '9.5 MB'),
   ('bim/IFC4/T4_新化林場站_BIM_V1.6.ifc', 'T4 新化林場站', '3.5 MB'),
 ]),
 ('基地航照疊位', [
   ('m/34/downloads/Hutoupi_Google_Maps_Overlay.kml', 'Google 地圖疊圖 KML', '155 KB'),
   ('m/34/downloads/Hutoupi_Site_Alignment_Atlas.pdf', 'PDF 圖冊', '18.6 MB'),
   ('m/34/downloads/Hutoupi_Site_Alignment_8K.png', '8K 航照疊位圖 PNG', '23.8 MB'),
 ]),
 ('T1 站體 CAD（STEP）', [
   ('m/27/', '逐層 STEP V0.5，於頁內下載', ''),
   ('m/28/', '中央單梁概念 V0.4', ''),
   ('m/29/', 'U4-430 概念 V0.2', ''),
 ]),
]

def ext(h): return h.startswith('http')
def a_attrs(h): return f'href="{E(h)}"'

def card(it, lead=False):
    href, th, fmt, t, d = it[:5]
    extra = it[5] if len(it) > 5 else []
    more = ''.join(f'<a class="more" {a_attrs(h)}>另見：{E(l)}</a>' for h, l in extra)
    w, hgt = (720, 450)
    return f'''<article class="tile{' lead' if lead else ''}">
  <a class="hit" {a_attrs(href)}>
    <span class="shot"><img src="thumbs/{th}.jpg" alt="" width="{w}" height="{hgt}" loading="lazy" decoding="async"></span>
    <span class="fmt">{E(fmt)}</span>
    <span class="ttl">{E(t)}</span>
    <span class="dsc">{E(d)}</span>
  </a>{more}
</article>'''

n_current = sum(len(s[3]) for s in SECTIONS)
n_archive = sum(len(g[1]) for g in ARCHIVE)

secs = []
for sid, name, sub, items in SECTIONS:
    tiles = '\n'.join(card(it, i == 0) for i, it in enumerate(items))
    secs.append(f'''<section class="cat" id="{sid}" aria-labelledby="{sid}-h">
  <header class="cat-h"><h2 id="{sid}-h">{E(name)}</h2><p>{E(sub)}</p><span class="cnt">{len(items)} 項</span></header>
  <div class="tiles">
{tiles}
  </div>
</section>''')

arch = []
for g, rows in ARCHIVE:
    lis = []
    for t, links, note in rows:
        ls = ''.join(f'<a {a_attrs(h)}>{E(l)}</a>' for h, l in links)
        lis.append(f'<li><span class="at">{E(t)}</span><span class="al">{ls}</span><span class="an">{E(note)}</span></li>')
    arch.append(f'<div class="ag"><h3>{E(g)}</h3><ul>{"".join(lis)}</ul></div>')

dl = []
for g, rows in DOWNLOADS:
    lis = ''.join(f'<li><a {a_attrs(h)}{"" if h.endswith("/") else " download"}>{E(l)}</a><span>{E(s)}</span></li>' for h, l, s in rows)
    dl.append(f'<div class="dg"><h3>{E(g)}</h3><ul>{lis}</ul></div>')

nav = ''.join(f'<li><a href="#{sid}"><i></i>{E(name)}</a></li>' for sid, name, _, _ in SECTIONS)

# ---- longitudinal profile (CH / EL from 五跨縱斷面 R1) ----
PTS = [('T1', '新化之門', 0, 52.6, 's'), ('P2', '', 446, 63.1, 'p'), ('T2', '湖濱旅館', 796, 67.6, 's'),
       ('T3', '湖濱山城', 1139, 68.0, 's'), ('P4', '', 1545, 85.0, 'p'), ('T4', '新化林場', 1947, 66.0, 's')]
X = lambda ch: 60 + ch / 1947 * 1080
Y = lambda el: 250 - (el - 40) * 3.4
pts = [(c, n, X(ch), Y(el), k) for c, n, ch, el, k in PTS]
cable = f'M{pts[0][2]:.1f},{pts[0][3]:.1f}'
for a, b in zip(pts, pts[1:]):
    sag = (b[2] - a[2]) * 0.045
    cable += f' Q{(a[2]+b[2])/2:.1f},{(a[3]+b[3])/2 + sag:.1f} {b[2]:.1f},{b[3]:.1f}'
svg_marks = []
for c, n, x, y, k in pts:
    if k == 's':
        svg_marks.append(f'<g class="st"><line x1="{x:.1f}" y1="{y+14:.1f}" x2="{x:.1f}" y2="300"/><rect x="{x-20:.1f}" y="{y-8:.1f}" width="40" height="22" rx="3"/>'
                         f'<text class="code" x="{x:.1f}" y="{y-20:.1f}">{c}</text><text class="nm" x="{x:.1f}" y="{y-40:.1f}">{n}</text></g>')
    else:
        svg_marks.append(f'<g class="tw"><path d="M{x-7:.1f},300 L{x:.1f},{y:.1f} L{x+7:.1f},300"/>'
                         f'<text x="{x:.1f}" y="{y-12:.1f}">{c}</text></g>')
terrain = ('M0,300 L0,214 C30,210 50,206 70,208 C120,214 160,196 200,186 C250,172 300,170 340,176 '
           'C380,182 396,204 420,226 C470,248 600,250 640,226 C660,204 680,190 700,184 C740,176 760,190 780,196 '
           'C820,196 860,160 900,130 C930,110 960,104 980,112 C1020,128 1060,156 1100,168 C1130,176 1160,172 1200,170 L1200,300 Z')
lake = 'M360,216 L700,216 L700,300 L360,300 Z'

page = f'''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>虎頭埤纜車　互動模型與網站｜Skytaxi 審查資料</title>
<meta name="theme-color" content="#17302a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;900&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{{
  --forest:#17302a; --forest-2:#21423a; --lake:#2f6f78; --mist:#eef2ef; --paper:#fff;
  --ink:#1b2622; --muted:#5d6b66; --rule:#d5ddd9; --cabin:#d9a441;
  --serif:"Noto Serif TC","Songti TC",serif; --sans:"Noto Sans TC",system-ui,sans-serif;
}}
*{{box-sizing:border-box}}
html{{scroll-behavior:smooth;scroll-padding-top:64px}}
@media (prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}}}
body{{margin:0;font-family:var(--sans);color:var(--ink);background:var(--mist);line-height:1.7;-webkit-font-smoothing:antialiased;font-size:16px}}
a{{color:inherit}}
:focus-visible{{outline:3px solid var(--cabin);outline-offset:3px;border-radius:2px}}
.wrap{{max-width:1200px;margin:0 auto;padding:0 28px}}

/* hero */
.hero{{background:var(--forest);color:#eef4f0;padding:22px 0 0;overflow:hidden}}
.bar{{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#b9cbc3}}
.bar a{{text-decoration:none}} .bar a:hover{{color:#fff}}
.brand{{font-weight:700;color:#fff;letter-spacing:.02em}}
.hero h1{{font-family:var(--serif);font-weight:900;font-size:clamp(34px,5.4vw,64px);line-height:1.18;margin:44px 0 14px;letter-spacing:.04em}}
.lede{{max-width:36em;color:#c9d8d1;font-size:17px;margin:0}}
.facts{{margin:14px 0 0;color:#9fb7ad;font-size:14.5px}}
.facts b{{color:#fff;font-weight:500}}
.profile{{display:block;width:100%;height:auto;margin-top:26px}}
.profile .ground{{fill:var(--forest-2)}}
.profile .water{{fill:#3d7f86}}
.profile .cable{{fill:none;stroke:#cfdcd6;stroke-width:1.6}}
.profile .st rect{{fill:#e9efe9}} .profile .st line{{stroke:#5f7d71;stroke-width:3}}
.profile .st .code{{font:700 17px var(--serif);fill:#fff;text-anchor:middle}}
.profile .st .nm{{font:500 14px var(--sans);fill:#b9cbc3;text-anchor:middle}}
.profile .tw path{{fill:none;stroke:#8fa69c;stroke-width:1.4}}
.profile .tw text{{font:500 12px var(--sans);fill:#8fa69c;text-anchor:middle}}
.profile .cabin rect{{fill:var(--cabin)}} .profile .cabin line{{stroke:var(--cabin);stroke-width:1.4}}
.cap{{font-size:12.5px;color:#86a095;padding:6px 0 14px;text-align:right}}

/* start here */
.start{{background:var(--paper);border-bottom:1px solid var(--rule)}}
.start a{{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:32px;align-items:center;text-decoration:none;padding:26px 0}}
.start .k{{font-size:14px;color:var(--lake);font-weight:700}}
.start .t{{font-family:var(--serif);font-weight:900;font-size:26px;line-height:1.35;display:block;margin:2px 0 6px}}
.start .d{{color:var(--muted);font-size:15px;max-width:40em;display:block}}
.start img{{width:100%;height:auto;display:block;border-radius:4px;border:1px solid var(--rule)}}
.start a:hover .t{{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px;text-decoration-color:var(--cabin)}}

/* line nav */
.line{{position:sticky;top:0;z-index:10;background:rgba(238,242,239,.94);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}}
.line ol{{list-style:none;margin:0 auto;padding:0 28px;max-width:1200px;display:flex;overflow-x:auto;position:relative}}
.line li{{flex:1 0 auto;position:relative}}
.line li::before{{content:"";position:absolute;left:0;right:0;top:50%;border-top:2px solid var(--rule)}}
.line li:first-child::before{{left:18px}} .line li:last-child::before{{right:auto;width:18px}}
.line a{{position:relative;display:inline-flex;align-items:center;gap:8px;padding:13px 16px 13px 10px;font-size:15px;font-weight:500;text-decoration:none;background:var(--mist)}}
.line i{{width:12px;height:12px;border-radius:50%;border:2px solid var(--forest);background:var(--mist);flex:none}}
.line a:hover i,.line a[aria-current] i{{background:var(--cabin);border-color:var(--cabin)}}
.line a[aria-current]{{font-weight:700}}
.line .arch-l{{flex:0 0 auto}} .line .arch-l::before{{display:none}}
.line .arch-l a{{color:var(--muted);font-size:14px}}

/* categories */
main{{padding:8px 0 40px}}
.cat{{padding:56px 0 8px}}
.cat-h{{display:grid;grid-template-columns:auto 1fr auto;align-items:baseline;gap:18px;border-bottom:2px solid var(--forest);padding-bottom:10px;margin-bottom:26px}}
.cat-h h2{{font-family:var(--serif);font-weight:900;font-size:clamp(24px,2.6vw,32px);margin:0;letter-spacing:.03em}}
.cat-h p{{margin:0;color:var(--muted);font-size:15px}}
.cnt{{font-size:14px;color:var(--muted)}}
.tiles{{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px 28px}}
.tile.lead{{grid-column:1/-1;margin-bottom:10px}}
.lead .hit{{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1fr);grid-template-rows:1fr auto auto 1fr;column-gap:40px}}
.lead .shot{{grid-column:1;grid-row:1/5;aspect-ratio:16/9}}
.lead .fmt{{grid-column:2;grid-row:1;align-self:end;margin-top:0}}
.lead .ttl{{grid-column:2;grid-row:2}}
.lead .dsc{{grid-column:2;grid-row:3;align-self:start}}
.lead .more{{margin-left:calc(66.6% + 14px)}}
.hit{{display:flex;flex-direction:column;text-decoration:none}}
.shot{{display:block;aspect-ratio:16/10;overflow:hidden;border-radius:4px;background:#dfe6e2;border:1px solid var(--rule)}}
.shot img{{width:100%;height:100%;object-fit:cover;object-position:top left;display:block}}
.fmt{{font-size:13px;color:var(--lake);font-weight:700;margin-top:12px}}
.ttl{{font-weight:700;font-size:18px;line-height:1.45;margin-top:2px}}
.lead .ttl{{font-family:var(--serif);font-weight:900;font-size:clamp(22px,2.2vw,28px)}}
.dsc{{color:var(--muted);font-size:14.5px;margin-top:4px;max-width:38em}}
.lead .dsc{{font-size:15.5px}}
.hit:hover .ttl{{text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:5px;text-decoration-color:var(--cabin)}}
.hit:hover .shot{{border-color:var(--forest)}}
.more{{display:inline-block;margin-top:6px;font-size:14px;color:var(--lake);font-weight:500}}

/* archive + downloads */
.lower{{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:48px;padding-top:72px}}
.lower h2{{font-family:var(--serif);font-weight:900;font-size:24px;margin:0 0 4px}}
.lower .note{{color:var(--muted);font-size:14.5px;margin:0 0 18px}}
details{{background:var(--paper);border:1px solid var(--rule);border-radius:6px}}
summary{{cursor:pointer;padding:16px 20px;font-weight:700;list-style:none;display:flex;justify-content:space-between;gap:12px}}
summary::-webkit-details-marker{{display:none}}
summary::after{{content:"展開";font-weight:500;color:var(--lake);font-size:14px}}
details[open] summary::after{{content:"收合"}}
details[open] summary{{border-bottom:1px solid var(--rule)}}
.ag{{padding:6px 20px 14px}}
.ag h3,.dg h3{{font-size:14px;color:var(--muted);font-weight:700;margin:12px 0 4px}}
.ag ul,.dg ul{{list-style:none;margin:0;padding:0}}
.ag li{{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 14px;padding:9px 0;border-top:1px solid var(--mist);font-size:15px}}
.ag li:first-child{{border-top:0}}
.al{{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}}
.al a{{color:var(--lake);font-weight:500;text-underline-offset:3px}}
.an{{grid-column:1/-1;font-size:13px;color:var(--muted)}}
.an:empty{{display:none}}
.dg{{margin-bottom:18px}}
.dg li{{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--rule);font-size:15px}}
.dg li a{{color:var(--ink);text-underline-offset:3px;text-decoration-color:var(--rule)}}
.dg li a:hover{{text-decoration-color:var(--cabin)}}
.dg li span{{color:var(--muted);font-size:13.5px;white-space:nowrap}}

footer{{margin-top:72px;background:var(--forest);color:#9fb7ad;font-size:14px}}
footer .wrap{{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:26px;padding-bottom:30px}}
footer a{{color:#e2ece7}}

@media (max-width:900px){{
  .tiles{{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .lead .hit{{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);column-gap:24px}}
  .lower{{grid-template-columns:1fr}}
  .start a{{grid-template-columns:1fr 200px}}
}}
@media (max-width:600px){{
  .wrap{{padding:0 18px}}
  .tiles{{grid-template-columns:1fr;gap:30px}}
  .lead .hit{{display:flex}} .lead .fmt,.lead .dsc{{align-self:auto}} .lead .fmt{{margin-top:12px}} .lead .more{{margin-left:0}}
  .cat-h{{grid-template-columns:1fr auto}} .cat-h p{{grid-column:1/-1;grid-row:2}}
  .start a{{grid-template-columns:1fr}} .start img{{display:none}}
  .profile .st .nm,.profile .tw text{{display:none}}
  .profile .st .code{{font-size:26px}}
  .bar .tag{{display:none}}
}}
</style>
</head>
<body>
<div class="hero">
  <div class="wrap">
    <div class="bar"><a class="brand" href="https://www.skytaxi.com.tw/">Skytaxi 雲天新能源</a><span class="tag">審查資料區，僅限受邀者瀏覽</span></div>
    <h1>虎頭埤纜車<br>互動模型與網站</h1>
    <p class="lede">全案現行版的 3D 模型、BIM、工程計算與網站。點選即可在瀏覽器開啟，舊版與原始檔收在頁尾。</p>
    <p class="facts">全線 <b>1,874.6 公尺</b>，<b>四站五跨</b>，現行版 <b>{n_current + 1} 項</b></p>
  </div>
  <div class="wrap">
    <svg class="profile" viewBox="0 70 1200 230" role="img" aria-label="虎頭埤纜車縱斷面示意：T1 新化之門、T2 湖濱旅館、T3 湖濱山城、T4 新化林場，中間設 P2、P4 兩座支柱">
      <path class="water" d="{lake}"/>
      <path class="ground" d="{terrain}"/>
      <path id="cable" class="cable" d="{cable}"/>
      {''.join(svg_marks)}
      <g class="cabin" id="cabin" transform="translate({pts[0][2]:.1f},{pts[0][3]:.1f})"><line x1="0" y1="0" x2="0" y2="9"/><rect x="-9" y="9" width="18" height="14" rx="3"/></g>
    </svg>
    <div class="cap">縱斷面示意，站位與高程依五跨縱斷面計算模型 R1</div>
  </div>
</div>

<div class="start">
  <div class="wrap">
    <a href="overview/">
      <span><span class="k">從這裡開始</span><span class="t">虎頭埤纜車 BOT 案　最終資料總覽</span><span class="d">投資計畫書、工程圖說與圖冊、動態模擬、簡報與融資文件的總索引，附全案現行控制值。</span></span>
      <img src="thumbs/overview.jpg" alt="" width="720" height="450" loading="lazy">
    </a>
  </div>
</div>

<nav class="line" aria-label="分類"><ol>{nav}<li class="arch-l"><a href="#lower">歷史版本與下載</a></li></ol></nav>

<main class="wrap">
{''.join(secs)}

<div class="lower" id="lower">
  <section aria-labelledby="arch-h">
    <h2 id="arch-h">歷史版本與原始頁</h2>
    <p class="note">已被現行版取代或屬方案比選的頁面，保留供追溯，內容不再更新。</p>
    <details><summary>{n_archive} 項，依取代關係分組</summary>{''.join(arch)}</details>
  </section>
  <section aria-labelledby="dl-h">
    <h2 id="dl-h">原始檔下載</h2>
    <p class="note">模型與圖冊原始檔，可直接以專業軟體開啟。</p>
    {''.join(dl)}
  </section>
</div>
</main>

<footer><div class="wrap"><span>雲天新能源科技股份有限公司　Skytaxi</span><a href="https://www.skytaxi.com.tw/">公司首頁</a></div></footer>

<script>
(function(){{
  var p=document.getElementById('cable'),c=document.getElementById('cabin');
  if(!p||!c||!p.getTotalLength)return;
  var L=p.getTotalLength();
  function put(t){{var q=p.getPointAtLength(L*t);c.setAttribute('transform','translate('+q.x.toFixed(1)+','+q.y.toFixed(1)+')');}}
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){{put(.43);return;}}
  var D=9000,s=null;
  function e(t){{return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;}}
  function f(ts){{if(s===null)s=ts;var t=Math.min(1,(ts-s)/D);put(e(t));if(t<1)requestAnimationFrame(f);}}
  requestAnimationFrame(f);
}})();
(function(){{
  var links=[].slice.call(document.querySelectorAll('.line a')),map={{}};
  links.forEach(function(a){{map[a.getAttribute('href').slice(1)]=a;}});
  if(!('IntersectionObserver' in window))return;
  var io=new IntersectionObserver(function(es){{es.forEach(function(en){{
    if(en.isIntersecting){{links.forEach(function(a){{a.removeAttribute('aria-current');}});var a=map[en.target.id];if(a)a.setAttribute('aria-current','true');}}
  }});}},{{rootMargin:'-40% 0px -55% 0px'}});
  document.querySelectorAll('.cat,#lower').forEach(function(s){{io.observe(s);}});
}})();
</script>
</body>
</html>'''
open(OUT, 'w', encoding='utf-8').write(page)
print('current', n_current, 'archive', n_archive)
