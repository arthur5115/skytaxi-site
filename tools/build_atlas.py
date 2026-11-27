# Builds an atlas viewer page: review/atlas/<slug>/index.html
# Usage: python3 tools/build_atlas.py   (config below is for the 整體規劃與配置 atlas)
import json, os, re, html
import pymupdf as fitz

ROOT = '/home/claude/skytaxi-site/review/atlas/planning'
SRC = '/home/claude/atlas/atlas.pdf'
SIZES = json.load(open('/home/claude/atlas/sizes.json'))
E = html.escape

CFG = {
  'title': '整體規劃與配置',
  'full': '虎頭埤長壽生活園區　整體規劃與配置圖冊',
  'sub': '四站一線的全區總圖、量體、動線、景觀、樓層配置與典型單元，依投資計畫書第三章的八組順序編排。',
  'date': '2026-11-27 修正版',
  # extra sheets not in the PDF: inserted after page `after`
  'extra': [
    {'key': 'G20', 'code': 'G-20', 'title': '基地環境－風花圖', 'after': 8,
     'png': 'pdf/G-20_基地環境_風花圖.png'},
    {'key': 'G21', 'code': 'G-21', 'title': '基地環境－日照路徑圖', 'after': 8,
     'png': 'pdf/G-21_基地環境_日照路徑圖.png'},
  ],
  'hires': {32: 'pdf/PL-M01_全區動線系統總圖_8K.png', 38: 'pdf/PL-L01_全區景觀與開放空間總圖_8K.png'},
}

doc = fitz.open(SRC)
toc = doc.get_toc()
groups = []          # [{'no','name','first','last','pdf','sheets':[]}]
page_title = {}
for lvl, t, p in toc:
    t = t.replace('　', ' ').strip()
    if lvl == 1:
        m = re.match(r'(\d\d)\s+(.*)', t)
        if m:
            groups.append({'no': m.group(1), 'name': m.group(2), 'first': p})
        else:
            page_title.setdefault(p, ('', t))
    else:
        code, _, title = t.partition(' ')
        page_title[p] = (code, title.strip())
for i, g in enumerate(groups):
    g['last'] = groups[i + 1]['first'] - 1 if i + 1 < len(groups) else doc.page_count
pdfdir = os.path.join(ROOT, 'pdf')
for g in groups:
    f = [x for x in os.listdir(pdfdir) if x.startswith(f"Hutoupi_Planning_Atlas_{g['no']}_")][0]
    g['pdf'] = 'pdf/' + f
    g['pdf_mb'] = os.path.getsize(os.path.join(pdfdir, f)) / 1e6
    if g['no'] == '01':
        g['first_pdf'] = 1  # volume 01 also carries cover + index

def station(code):
    m = re.match(r'(T[1-4])', code)
    if m: return m.group(1)
    m = re.match(r'PL-U(\d)', code)
    if m and m.group(1) in '1234': return 'T' + m.group(1)
    return '全區'

sheets = []
def add(key, code, title, gi, extra=None):
    w, h = SIZES[key]
    d = {'k': key, 'c': code, 't': title, 'g': gi, 's': station(code), 'w': w, 'h': h}
    if extra: d.update(extra)
    sheets.append(d)

cover = []
for p in range(1, doc.page_count + 1):
    key = f'{p:03d}'
    code, title = page_title.get(p, ('', ''))
    gi = next((i for i, g in enumerate(groups) if g['first'] <= p <= g['last']), -1)
    if p == 1: code, title = '封面', '整體規劃與配置'
    if p == 2: code, title = 'PL-INDEX', '八組規劃圖索引'
    ex = {'p': p}
    if p in CFG['hires']: ex['hi'] = CFG['hires'][p]
    add(key, code, title, gi, ex)
    for x in CFG['extra']:
        if x['after'] == p:
            add(x['key'], x['code'], x['title'], gi, {'hi': x['png'], 'new': 1})

for s in sheets:
    s['n'] = sheets.index(s) + 1
total = len(sheets)

gjson = [{'no': g['no'], 'name': g['name'], 'pdf': g['pdf'], 'mb': round(g['pdf_mb'], 1)} for g in groups]
data = json.dumps({'sheets': sheets, 'groups': gjson}, ensure_ascii=False, separators=(',', ':'))

grp_desc = {}
idx = doc[1].get_text().split('\n')
for g in groups:
    try:
        i = idx.index(g['name']); grp_desc[g['no']] = idx[i + 1]
    except ValueError:
        grp_desc[g['no']] = ''

sections = []
front = {'no': '00', 'name': '封面與索引', 'pdf': groups[0]['pdf'], 'pdf_mb': groups[0]['pdf_mb']}
grp_desc['00'] = '圖冊封面與八組規劃圖索引，收於第 01 冊 PDF'
for gi, g in [(-1, front)] + list(enumerate(groups)):
    items = [s for s in sheets if s['g'] == gi]
    tiles = []
    for s in items:
        badge = '<span class="new">本次新增</span>' if s.get('new') else ''
        tiles.append(f'''<li data-s="{s['s']}" data-q="{E((s['c'] + ' ' + s['t']).lower())}"><a href="#s={s['k']}" data-k="{s['k']}"><span class="th"><img src="p/{s['k']}_t.webp" alt="" loading="lazy" decoding="async" width="{560 if s['w']>=s['h'] else round(560*s['w']/s['h'])}" height="{round(560*s['h']/s['w']) if s['w']>=s['h'] else 560}"></span><span class="cd">{E(s['c'])}{badge}</span><span class="tt">{E(s['t'])}</span></a></li>''')
    sections.append(f'''<section class="grp" id="g{g['no']}" aria-labelledby="g{g['no']}h">
  <header class="grp-h"><span class="no">{'' if g['no']=='00' else g['no']}</span><h2 id="g{g['no']}h">{E(g['name'])}</h2><p>{E(grp_desc.get(g['no'], ''))}</p><a class="vol" href="{E(g['pdf'])}" download>下載本組 PDF<span>{g['pdf_mb']:.1f} MB</span></a></header>
  <ul class="sheets">{''.join(tiles)}</ul>
  <p class="none" hidden>這一組沒有符合篩選條件的圖。</p>
</section>''')

grp_opts = '<option value="g00">封面與索引</option>' + ''.join(f'<option value="g{g["no"]}">{g["no"]} {E(g["name"])}</option>' for g in groups)
dl_vols = ''.join(f'<li><a href="{E(g["pdf"])}" download>{g["no"]}　{E(g["name"])}</a><span>{g["last"] - (1 if g["no"]=="01" else g["first"]) + 1} 頁，{g["pdf_mb"]:.1f} MB</span></li>' for g in groups)
dl_png = ''.join(f'<li><a href="{E(h)}" download>{E(lbl)}</a><span>{os.path.getsize(os.path.join(ROOT, h))/1e6:.1f} MB</span></li>' for lbl, h in [
    ('G-20　基地環境－風花圖（A3 300 dpi）', CFG['extra'][0]['png']),
    ('G-21　基地環境－日照路徑圖（A3 300 dpi）', CFG['extra'][1]['png']),
    ('PL-M01　全區動線系統總圖（8K）', CFG['hires'][32]),
    ('PL-L01　全區景觀與開放空間總圖（8K）', CFG['hires'][38]),
])

page = f'''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{E(CFG['title'])}圖冊｜虎頭埤纜車 審查資料｜Skytaxi</title>
<meta name="theme-color" content="#17302a">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@600;900&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
<style>
:root{{--forest:#17302a;--forest-2:#21423a;--lake:#2f6f78;--mist:#eef2ef;--paper:#fff;--ink:#1b2622;--muted:#5d6b66;--rule:#d5ddd9;--cabin:#d9a441;
--serif:"Noto Serif TC","Songti TC",serif;--sans:"Noto Sans TC",system-ui,sans-serif}}
*{{box-sizing:border-box}}
html{{scroll-padding-top:70px}}
body{{margin:0;font-family:var(--sans);color:var(--ink);background:var(--mist);line-height:1.7;-webkit-font-smoothing:antialiased}}
a{{color:inherit}}
:focus-visible{{outline:3px solid var(--cabin);outline-offset:3px;border-radius:2px}}
.wrap{{max-width:1280px;margin:0 auto;padding:0 28px}}
[hidden]{{display:none!important}}

.hero{{background:var(--forest);color:#eef4f0;padding:22px 0 40px}}
.bar{{display:flex;justify-content:space-between;gap:12px;font-size:14px;color:#b9cbc3}}
.bar a{{text-decoration:none}} .bar a:hover{{color:#fff;text-decoration:underline;text-underline-offset:4px}}
.hero-in{{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,460px);gap:48px;align-items:end;margin-top:36px}}
.kind{{font-size:15px;color:var(--cabin);font-weight:700;margin:0}}
h1{{font-family:var(--serif);font-weight:900;font-size:clamp(32px,4.6vw,56px);line-height:1.2;margin:6px 0 14px;letter-spacing:.04em}}
.lede{{color:#c9d8d1;font-size:16.5px;max-width:34em;margin:0}}
.meta{{color:#9fb7ad;font-size:14.5px;margin:14px 0 0}}
.meta b{{color:#fff;font-weight:500}}
.actions{{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}}
.btn{{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:4px;font-weight:700;font-size:15px;text-decoration:none;border:1px solid transparent;cursor:pointer;font-family:inherit}}
.btn.pri{{background:var(--cabin);color:#1b2622}}
.btn.pri:hover{{background:#e6b552}}
.btn.sec{{border-color:#5f7d71;color:#eef4f0;background:transparent}}
.btn.sec:hover{{border-color:#cfdcd6}}
.cover{{display:block;border-radius:4px;overflow:hidden;box-shadow:0 18px 40px rgba(0,0,0,.35);border:1px solid #2f5248}}
.cover img{{display:block;width:100%;height:auto}}

.tools{{position:sticky;top:0;z-index:20;background:rgba(238,242,239,.95);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border-bottom:1px solid var(--rule)}}
.tools .wrap{{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;padding-top:10px;padding-bottom:10px}}
.chips{{display:flex;gap:6px;flex-wrap:wrap}}
.chips button{{font:500 14.5px var(--sans);padding:5px 14px;border-radius:999px;border:1px solid var(--rule);background:var(--paper);color:var(--ink);cursor:pointer}}
.chips button[aria-pressed=true]{{background:var(--forest);border-color:var(--forest);color:#fff}}
.search{{flex:1 1 220px;display:flex;align-items:center;gap:8px;background:var(--paper);border:1px solid var(--rule);border-radius:4px;padding:0 12px;max-width:360px}}
.search input{{border:0;outline:0;font:15px var(--sans);padding:8px 0;width:100%;background:transparent;color:var(--ink)}}
.search:focus-within{{border-color:var(--lake)}}
.jump{{font:15px var(--sans);padding:7px 10px;border:1px solid var(--rule);border-radius:4px;background:var(--paper);color:var(--ink)}}
.count{{font-size:14px;color:var(--muted);margin-left:auto}}

main{{padding-bottom:30px}}
.grp{{padding-top:48px}}
.grp-h{{display:grid;grid-template-columns:auto auto 1fr auto;align-items:baseline;gap:6px 16px;border-bottom:2px solid var(--forest);padding-bottom:10px;margin-bottom:22px}}
.grp-h .no{{font:900 30px var(--serif);color:var(--lake)}} .grp-h .no:empty{{display:none}} #g00 .grp-h{{grid-template-columns:auto 1fr auto}}
.grp-h h2{{font:900 clamp(22px,2.4vw,28px) var(--serif);margin:0;letter-spacing:.03em}}
.grp-h p{{margin:0;color:var(--muted);font-size:15px}}
.vol{{font-size:14.5px;font-weight:700;color:var(--lake);text-underline-offset:4px;white-space:nowrap}}
.vol span{{font-weight:400;color:var(--muted);margin-left:6px}}
.sheets{{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:26px 22px}}
.sheets a{{display:flex;flex-direction:column;text-decoration:none}}
.th{{display:flex;align-items:center;justify-content:center;aspect-ratio:4/3;background:#e2e9e5;border:1px solid var(--rule);border-radius:3px;padding:8px;overflow:hidden}}
.th img{{max-width:100%;max-height:100%;width:auto;height:auto;display:block;box-shadow:0 1px 3px rgba(23,48,42,.18)}}
.cd{{font:700 13.5px var(--sans);color:var(--lake);margin-top:9px;display:flex;gap:8px;align-items:center}}
.new{{font-size:12px;font-weight:700;color:#7a5410;background:#f6e6c2;padding:0 7px;border-radius:3px}}
.tt{{font-size:15.5px;font-weight:500;line-height:1.5}}
.sheets a:hover .th{{border-color:var(--forest)}}
.sheets a:hover .tt{{text-decoration:underline;text-decoration-color:var(--cabin);text-decoration-thickness:2px;text-underline-offset:4px}}
.none{{color:var(--muted);font-size:15px}}
.empty{{padding:60px 0;color:var(--muted);text-align:center;font-size:16px}}

.dl{{margin-top:64px;display:grid;grid-template-columns:1fr 1fr;gap:48px}}
.dl h2{{font:900 24px var(--serif);margin:0 0 4px}}
.dl .note{{color:var(--muted);font-size:14.5px;margin:0 0 14px}}
.dl ul{{list-style:none;margin:0;padding:0}}
.dl li{{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--rule);font-size:15px}}
.dl li a{{text-underline-offset:3px;text-decoration-color:var(--rule)}} .dl li a:hover{{text-decoration-color:var(--cabin)}}
.dl li span{{color:var(--muted);font-size:13.5px;white-space:nowrap}}
footer{{margin-top:72px;background:var(--forest);color:#9fb7ad;font-size:14px}}
footer .wrap{{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:24px;padding-bottom:28px}}
footer a{{color:#e2ece7}}

/* viewer */
.vw{{position:fixed;inset:0;z-index:100;background:#0f201b;color:#e6eee9;display:grid;grid-template-rows:auto 1fr auto}}
.vw-top{{display:flex;align-items:center;gap:14px;padding:10px 16px;border-bottom:1px solid #26443b}}
.vw-cap{{min-width:0;flex:1}}
.vw-cap b{{font-weight:700;color:var(--cabin);margin-right:10px}}
.vw-cap span{{font-weight:500}}
.vw-cap small{{display:block;color:#93aba1;font-size:13px}}
.vw-btns{{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}}
.ib{{font:500 14px var(--sans);color:#e6eee9;background:#1d3830;border:1px solid #2f5248;border-radius:4px;padding:6px 12px;cursor:pointer;text-decoration:none;white-space:nowrap}}
.ib:hover{{border-color:#8fa69c}}
.ib.x{{background:transparent;font-size:15px}}
.stage{{position:relative;overflow:hidden;touch-action:none;cursor:grab}}
.stage.drag{{cursor:grabbing}}
.stage img{{position:absolute;left:0;top:0;transform-origin:0 0;user-select:none;-webkit-user-drag:none;background:#fff;box-shadow:0 10px 40px rgba(0,0,0,.5);max-width:none}}
.nav{{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:72px;border:0;border-radius:4px;background:rgba(15,32,27,.65);color:#fff;font-size:28px;cursor:pointer;z-index:2}}
.nav:hover{{background:rgba(29,56,48,.95)}}
.nav.prev{{left:12px}} .nav.next{{right:12px}}
.nav:disabled{{opacity:.25;cursor:default}}
.vw-bot{{display:flex;justify-content:space-between;gap:12px;padding:8px 16px;font-size:13px;color:#93aba1;border-top:1px solid #26443b}}
.zl{{font-variant-numeric:tabular-nums}}

@media (max-width:900px){{
  .hero-in{{grid-template-columns:1fr}} .cover{{max-width:520px}}
  .grp-h{{grid-template-columns:auto 1fr}} .grp-h p{{grid-column:1/-1}} .grp-h .vol{{grid-column:1/-1}}
  .dl{{grid-template-columns:1fr}}
  .count{{margin-left:0}}
}}
@media (max-width:600px){{
  .wrap{{padding:0 16px}}
  .sheets{{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 12px}}
  .tt{{font-size:14.5px}}
  .vw-top{{flex-wrap:wrap}} .vw-btns .opt{{display:none}}
  .nav{{width:38px;height:56px;font-size:22px}}
  .bar .tag{{display:none}}
  .tools{{position:static}}
  .vw-bot span:nth-child(2){{display:none}}
}}
@media (prefers-reduced-motion:no-preference){{.stage img.anim{{transition:transform .18s ease-out}}}}
</style>
</head>
<body>
<div class="hero">
  <div class="wrap">
    <div class="bar"><a href="../../">審查資料區　互動模型與網站</a><span class="tag">Skytaxi 雲天新能源，僅限受邀者瀏覽</span></div>
    <div class="hero-in">
      <div>
        <p class="kind">圖冊</p>
        <h1>{E(CFG['full'].split('　')[0])}<br>{E(CFG['title'])}</h1>
        <p class="lede">{E(CFG['sub'])}</p>
        <p class="meta"><b>{total} 張</b>圖，分 <b>{len(groups)} 組</b>，{E(CFG['date'])}</p>
        <div class="actions"><a class="btn pri" href="#s=001" data-k="001">從第一張開始翻閱</a><a class="btn sec" href="#dl">下載 PDF 分冊</a></div>
      </div>
      <a class="cover" href="#s=002" data-k="002" aria-label="開啟八組規劃圖索引"><img src="p/002_t.webp" alt="八組規劃圖索引" width="560" height="315"></a>
    </div>
  </div>
</div>

<div class="tools" role="search"><div class="wrap">
  <div class="chips" role="group" aria-label="依站別篩選">
    <button type="button" data-f="" aria-pressed="true">全部</button><button type="button" data-f="全區" aria-pressed="false">全區</button><button type="button" data-f="T1" aria-pressed="false">T1</button><button type="button" data-f="T2" aria-pressed="false">T2</button><button type="button" data-f="T3" aria-pressed="false">T3</button><button type="button" data-f="T4" aria-pressed="false">T4</button>
  </div>
  <label class="search"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#5d6b66" stroke-width="1.6"/><path d="M11 11l4 4" stroke="#5d6b66" stroke-width="1.6"/></svg><input type="search" id="q" placeholder="搜尋圖號或圖名，例如 T3-A-05、客房" aria-label="搜尋圖號或圖名"></label>
  <select class="jump" id="jump" aria-label="跳到圖組"><option value="">跳到圖組</option>{grp_opts}</select>
  <span class="count" id="count" aria-live="polite">{total} 張</span>
</div></div>

<main class="wrap">
{''.join(sections)}
<p class="empty" id="empty" hidden>沒有符合的圖，請換個關鍵字或改選「全部」。</p>

<div class="dl" id="dl">
  <section>
    <h2>PDF 分冊下載</h2>
    <p class="note">完整 PDF 為 68.6 MB，超過網站單檔上限，依八組分冊提供。第 01 冊含封面與索引。</p>
    <ul>{dl_vols}</ul>
  </section>
  <section>
    <h2>高解析圖檔</h2>
    <p class="note">G-20、G-21 為本次新增圖，PDF 尚未收錄；PL-M01、PL-L01 另附 8K 版。</p>
    <ul>{dl_png}</ul>
  </section>
</div>
</main>
<footer><div class="wrap"><span>雲天新能源科技股份有限公司　Skytaxi</span><a href="../../">回審查資料區</a></div></footer>

<div class="vw" id="vw" role="dialog" aria-modal="true" aria-labelledby="vwt" hidden>
  <div class="vw-top">
    <div class="vw-cap" id="vwt"><b id="vc"></b><span id="vn"></span><small id="vg"></small></div>
    <div class="vw-btns">
      <button class="ib opt" type="button" id="zo" aria-label="縮小">－</button>
      <button class="ib" type="button" id="zf">符合畫面</button>
      <button class="ib opt" type="button" id="zi" aria-label="放大">＋</button>
      <a class="ib opt" id="dlp" href="#" download>下載本組 PDF</a>
      <a class="ib opt" id="dlh" href="#" download hidden>下載高解析 PNG</a>
      <button class="ib x" type="button" id="vx">關閉</button>
    </div>
  </div>
  <div class="stage" id="stage">
    <img id="vi" alt="" draggable="false">
    <button class="nav prev" type="button" id="vp" aria-label="上一張">‹</button>
    <button class="nav next" type="button" id="vnx" aria-label="下一張">›</button>
  </div>
  <div class="vw-bot"><span id="vpos"></span><span>滾輪或雙指縮放，拖曳移動，雙擊放大；← → 換張，Esc 關閉</span><span class="zl" id="zl"></span></div>
</div>

<script id="atlas-data" type="application/json">{data}</script>
<script>
(function(){{
var D=JSON.parse(document.getElementById('atlas-data').textContent),S=D.sheets,G=D.groups,byK={{}};
S.forEach(function(s,i){{s.i=i;byK[s.k]=s;}});
var $=function(id){{return document.getElementById(id);}};

/* ---------- filter + search ---------- */
var filt='',q='';
function apply(){{
  var n=0;
  document.querySelectorAll('.grp').forEach(function(g){{
    var m=0;
    g.querySelectorAll('li').forEach(function(li){{
      var ok=(!filt||li.dataset.s===filt)&&(!q||li.dataset.q.indexOf(q)>-1);
      li.hidden=!ok; if(ok)m++;
    }});
    g.hidden=!m&&!!(filt||q); g.querySelector('.none').hidden=true; n+=m;
  }});
  $('count').textContent=(filt||q)?('符合 '+n+' 張，共 '+S.length+' 張'):(S.length+' 張');
  $('empty').hidden=n>0;
}}
document.querySelectorAll('.chips button').forEach(function(b){{
  b.addEventListener('click',function(){{
    document.querySelectorAll('.chips button').forEach(function(x){{x.setAttribute('aria-pressed','false');}});
    b.setAttribute('aria-pressed','true'); filt=b.dataset.f; apply();
  }});
}});
$('q').addEventListener('input',function(e){{q=e.target.value.trim().toLowerCase();apply();}});
$('jump').addEventListener('change',function(e){{if(e.target.value){{var el=$(e.target.value);if(el){{el.hidden=false;el.scrollIntoView();}}e.target.value='';}}}});

/* ---------- viewer ---------- */
var vw=$('vw'),st=$('stage'),im=$('vi'),cur=null,sc=1,fit=1,tx=0,ty=0,lastFocus=null;
function visibleList(){{
  if(!filt&&!q) return S;
  return S.filter(function(s){{var t=(s.c+' '+s.t).toLowerCase();return (!filt||s.s===filt)&&(!q||t.indexOf(q)>-1);}});
}}
function clamp(){{
  var W=st.clientWidth,H=st.clientHeight,iw=cur.w*sc,ih=cur.h*sc;
  tx=iw<=W?(W-iw)/2:Math.min(0,Math.max(W-iw,tx));
  ty=ih<=H?(H-ih)/2:Math.min(0,Math.max(H-ih,ty));
}}
function draw(anim){{
  clamp(); im.classList.toggle('anim',!!anim);
  im.style.width=cur.w+'px'; im.style.height=cur.h+'px';
  im.style.transform='translate('+tx+'px,'+ty+'px) scale('+sc+')';
  $('zl').textContent=Math.round(sc/fit*100)+'%';
}}
function fitView(anim){{
  var W=st.clientWidth-24,H=st.clientHeight-24;
  fit=Math.min(W/cur.w,H/cur.h); sc=fit; tx=0; ty=0; draw(anim);
}}
function zoomAt(f,cx,cy,anim){{
  var ns=Math.max(fit*0.5,Math.min(Math.max(1.5,fit*4),sc*f));
  var r=st.getBoundingClientRect(),x=cx-r.left,y=cy-r.top;
  tx=x-(x-tx)*ns/sc; ty=y-(y-ty)*ns/sc; sc=ns; draw(anim);
}}
function open(k,push){{
  var s=byK[k]; if(!s)return;
  if(vw.hidden){{lastFocus=document.activeElement;vw.hidden=false;document.body.style.overflow='hidden';}}
  cur=s;
  im.src='p/'+s.k+'_t.webp';
  var big=new Image(); big.onload=function(){{if(cur===s)im.src=big.src;}}; big.src='p/'+s.k+'.webp';
  $('vc').textContent=s.c; $('vn').textContent=s.t;
  var g=G[s.g]; $('vg').textContent=g?(g.no+'　'+g.name):'封面與索引';
  $('dlp').href=g?g.pdf:G[0].pdf;
  $('dlh').hidden=!s.hi; if(s.hi)$('dlh').href=s.hi;
  var L=visibleList(),i=L.indexOf(s);
  $('vp').disabled=i<=0; $('vnx').disabled=i<0||i>=L.length-1;
  $('vpos').textContent='第 '+(s.i+1)+' 張，共 '+S.length+' 張'+(s.p?'（PDF 第 '+s.p+' 頁）':'（PDF 未收錄，另附 PNG）');
  requestAnimationFrame(function(){{fitView(false);}});
  var h='#s='+s.k; if(location.hash!==h){{ if(push)history.pushState(null,'',h); else history.replaceState(null,'',h); }}
  $('vx').focus({{preventScroll:true}});
}}
function step(d){{var L=visibleList(),i=L.indexOf(cur);if(i<0)i=0;var n=L[i+d];if(n)open(n.k,false);}}
function close(){{
  vw.hidden=true; document.body.style.overflow=''; im.removeAttribute('src');
  if(location.hash.indexOf('#s=')===0)history.replaceState(null,'',location.pathname+location.search);
  if(lastFocus)lastFocus.focus({{preventScroll:true}});
}}
document.addEventListener('click',function(e){{
  var a=e.target.closest('a[data-k]'); if(!a)return; e.preventDefault(); open(a.dataset.k,true);
}});
$('vx').onclick=close; $('vp').onclick=function(){{step(-1);}}; $('vnx').onclick=function(){{step(1);}};
$('zf').onclick=function(){{fitView(true);}};
$('zi').onclick=function(){{var r=st.getBoundingClientRect();zoomAt(1.5,r.left+r.width/2,r.top+r.height/2,true);}};
$('zo').onclick=function(){{var r=st.getBoundingClientRect();zoomAt(1/1.5,r.left+r.width/2,r.top+r.height/2,true);}};
document.addEventListener('keydown',function(e){{
  if(vw.hidden)return;
  if(e.key==='Escape')close(); else if(e.key==='ArrowRight')step(1); else if(e.key==='ArrowLeft')step(-1);
  else if(e.key==='+'||e.key==='=')$('zi').click(); else if(e.key==='-')$('zo').click(); else if(e.key==='0')fitView(true);
  else if(e.key==='Tab'){{var f=[].slice.call(vw.querySelectorAll('button:not([disabled]),a[href]:not([hidden])'));var a=f[0],z=f[f.length-1];
    if(e.shiftKey&&document.activeElement===a){{e.preventDefault();z.focus();}} else if(!e.shiftKey&&document.activeElement===z){{e.preventDefault();a.focus();}}}}
}});
st.addEventListener('wheel',function(e){{e.preventDefault();zoomAt(Math.exp(-e.deltaY*0.0018),e.clientX,e.clientY,false);}},{{passive:false}});
st.addEventListener('dblclick',function(e){{if(e.target.closest('.nav'))return; if(sc>fit*1.05)fitView(true); else zoomAt(3,e.clientX,e.clientY,true);}});
var P={{}},pd=null;
st.addEventListener('pointerdown',function(e){{if(e.target.closest('.nav'))return;st.setPointerCapture(e.pointerId);P[e.pointerId]={{x:e.clientX,y:e.clientY}};
  var ks=Object.keys(P); if(ks.length===2){{var a=P[ks[0]],b=P[ks[1]];pd=Math.hypot(a.x-b.x,a.y-b.y);}} st.classList.add('drag');}});
st.addEventListener('pointermove',function(e){{var p=P[e.pointerId];if(!p)return;var ks=Object.keys(P);
  if(ks.length===2){{p.x=e.clientX;p.y=e.clientY;var a=P[ks[0]],b=P[ks[1]],d=Math.hypot(a.x-b.x,a.y-b.y);if(pd){{zoomAt(d/pd,(a.x+b.x)/2,(a.y+b.y)/2,false);}}pd=d;return;}}
  tx+=e.clientX-p.x;ty+=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;draw(false);}});
function up(e){{delete P[e.pointerId];if(Object.keys(P).length<2)pd=null;if(!Object.keys(P).length)st.classList.remove('drag');}}
st.addEventListener('pointerup',up);st.addEventListener('pointercancel',up);
window.addEventListener('resize',function(){{if(!vw.hidden)fitView(false);}});
function fromHash(){{var m=location.hash.match(/^#s=([\\w]+)/);if(m&&byK[m[1]])open(m[1],false);else if(!vw.hidden)close();}}
window.addEventListener('popstate',fromHash); fromHash();
}})();
</script>
</body>
</html>'''
open(os.path.join(ROOT, 'index.html'), 'w', encoding='utf-8').write(page)
print('sheets', total, 'groups', len(groups))
