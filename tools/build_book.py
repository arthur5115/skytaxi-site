# Generic atlas/book page builder for review/atlas/<slug>/
# Usage: python3 tools/build_book.py tools/books/<slug>.json
# Config: root, title, full, sub, date, cover, groups[{id,name,desc,pdf?}], sheets[{k,c,t,g,s,cat,src,png}], downloads?[{label,href}], note?
import json, os, sys, html
from PIL import Image
E = html.escape
C = json.load(open(sys.argv[1], encoding='utf-8'))
ROOT = C['root']
CFG = {k: C[k] for k in ('title', 'full', 'sub', 'date')}
sheets = C['sheets']
for n, s in enumerate(sheets):
    s['n'] = n + 1
    s['w'], s['h'] = Image.open(f"{ROOT}/p/{s['k']}.webp").size
total = len(sheets)
groups = [{'no': f'{i+1:02d}', 'name': g['name'], 'id': g['id']} for i, g in enumerate(C['groups'])]
data = json.dumps({'sheets': sheets, 'groups': groups}, ensure_ascii=False, separators=(',', ':'))
json.dump([[s['k'], s['c'], s['t'], s['cat']] for s in sheets], open(os.path.join(ROOT, 'sheets.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
cats = []
for s in sheets:
    if s['cat'] not in cats: cats.append(s['cat'])
def mb(h): return os.path.getsize(os.path.join(ROOT, h)) / 1e6
sections = []
for gi, g in enumerate(groups):
    gc = C['groups'][gi]
    items = [s for s in sheets if s['g'] == gi]
    tiles = []
    for s in items:
        tw, th = (560, round(560 * s['h'] / s['w'])) if s['w'] >= s['h'] else (round(560 * s['w'] / s['h']), 560)
        tiles.append(f'''<li data-s="{s['s']}" data-c="{E(s['cat'])}" data-q="{E((s['c'] + ' ' + s['t'] + ' ' + s['cat']).lower())}"><a href="#s={s['k']}" data-k="{s['k']}"><span class="th"><img src="p/{s['k']}_t.webp" alt="" loading="lazy" decoding="async" width="{tw}" height="{th}"></span><span class="cd">{E(s['c'])}<span class="ct">{E(s['cat'])}</span></span><span class="tt">{E(s['t'])}</span></a></li>''')
    vol = f'<a class="vol" href="{E(gc["pdf"])}" download>下載本冊 PDF<span>{mb(gc["pdf"]):.1f} MB</span></a>' if gc.get('pdf') else f'<span class="vol">{len(items)} 張</span>'
    sections.append(f'''<section class="grp" id="g{g['no']}" aria-labelledby="g{g['no']}h">
  <header class="grp-h"><span class="no">{g['no']}</span><h2 id="g{g['no']}h">{E(g['name'])}</h2><p>{E(gc.get('desc', ''))}</p>{vol}</header>
  <ul class="sheets">{''.join(tiles)}</ul>
  <p class="none" hidden>這一冊沒有符合篩選條件的圖。</p>
</section>''')
grp_opts = ''.join(f'<option value="g{g["no"]}">{g["no"]} {E(g["name"])}</option>' for g in groups)
cat_opts = ''.join(f'<option value="{E(c)}">{E(c)}（{sum(1 for s in sheets if s["cat"]==c)}）</option>' for c in cats)
chip_vals = [v for v in ['全區', 'T1', 'T2', 'T3', 'T4'] if any(s['s'] == v for s in sheets)]
chips = '<button type="button" data-f="" aria-pressed="true">全部</button>' + ''.join(f'<button type="button" data-f="{v}" aria-pressed="false">{v}</button>' for v in chip_vals)
cover = C['cover']; cs = next(s for s in sheets if s['k'] == cover)
cover_h = round(560 * cs['h'] / cs['w'])
dls = C.get('downloads') or []
dl_html = ''
if dls:
    dl_html = '<div class="dl" id="dl"><section><h2>下載</h2>' + (f'<p class="note">{E(C["note"])}</p>' if C.get('note') else '') + '<ul>' + ''.join(
        f'<li><a href="{E(d["href"])}" download>{E(d["label"])}</a><span>{mb(d["href"]):.1f} MB</span></li>' for d in dls) + '</ul></section></div>'
units = C.get('unit', '冊')

page = f'''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{E(CFG['title'])}｜虎頭埤纜車 審查資料｜Skytaxi</title>
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

.cd .ct{{font-weight:500;color:var(--muted);font-size:12.5px}}
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
        <p class="meta"><b>{total} 張</b>圖，分 <b>{len(groups)} {units}</b>、{len(cats)} 種圖類，{E(CFG['date'])}</p>
        <div class="actions"><a class="btn pri" href="#s={sheets[0]['k']}" data-k="{sheets[0]['k']}">從第一張開始翻閱</a>{'<a class="btn sec" href="#dl">下載 PDF</a>' if dls else ''}</div>
      </div>
      <a class="cover" href="#s={cover}" data-k="{cover}" aria-label="開啟 {E(cs['c'])}"><img src="p/{cover}_t.webp" alt="{E(cs['t'])}" width="560" height="{cover_h}"></a>
    </div>
  </div>
</div>

<div class="tools" role="search"><div class="wrap">
  <div class="chips" role="group" aria-label="依站別篩選">
    {chips}
  </div>
  <label class="search"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#5d6b66" stroke-width="1.6"/><path d="M11 11l4 4" stroke="#5d6b66" stroke-width="1.6"/></svg><input type="search" id="q" placeholder="搜尋圖號或圖名，例如 T3-A-05、客房" aria-label="搜尋圖號或圖名"></label>
  <select class="jump" id="cat" aria-label="依圖類篩選"><option value="">全部圖類</option>{cat_opts}</select>
  <select class="jump" id="jump" aria-label="跳到分冊"><option value="">跳到分{units}</option>{grp_opts}</select>
  <span class="count" id="count" aria-live="polite">{total} 張</span>
</div></div>

<main class="wrap">
{''.join(sections)}
<p class="empty" id="empty" hidden>沒有符合的圖，請換個關鍵字或改選「全部」。</p>

{dl_html}
</main>
<footer><div class="wrap"><span>雲天新能源科技股份有限公司　Skytaxi</span><a href="../../">回審查資料區</a></div></footer>

<div class="vw" id="vw" role="dialog" aria-modal="true" aria-labelledby="vwt" hidden>
  <div class="vw-top">
    <div class="vw-cap" id="vwt"><b id="vc"></b><span id="vn"></span><small id="vg"></small></div>
    <div class="vw-btns">
      <button class="ib opt" type="button" id="zo" aria-label="縮小">－</button>
      <button class="ib" type="button" id="zf">符合畫面</button>
      <button class="ib opt" type="button" id="zi" aria-label="放大">＋</button>
      <button class="ib opt" type="button" id="dlh">下載本張 PNG</button>
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
var filt='',q='',cat='';
function apply(){{
  var n=0;
  document.querySelectorAll('.grp').forEach(function(g){{
    var m=0;
    g.querySelectorAll('li').forEach(function(li){{
      var ok=(!filt||li.dataset.s===filt)&&(!cat||li.dataset.c===cat)&&(!q||li.dataset.q.indexOf(q)>-1);
      li.hidden=!ok; if(ok)m++;
    }});
    g.hidden=!m&&!!(filt||q||cat); g.querySelector('.none').hidden=true; n+=m;
  }});
  $('count').textContent=(filt||q||cat)?('符合 '+n+' 張，共 '+S.length+' 張'):(S.length+' 張');
  $('empty').hidden=n>0;
}}
document.querySelectorAll('.chips button').forEach(function(b){{
  b.addEventListener('click',function(){{
    document.querySelectorAll('.chips button').forEach(function(x){{x.setAttribute('aria-pressed','false');}});
    b.setAttribute('aria-pressed','true'); filt=b.dataset.f; apply();
  }});
}});
$('cat').addEventListener('change',function(e){{cat=e.target.value;apply();}});
$('q').addEventListener('input',function(e){{q=e.target.value.trim().toLowerCase();apply();}});
$('jump').addEventListener('change',function(e){{if(e.target.value){{var el=$(e.target.value);if(el){{el.hidden=false;el.scrollIntoView();}}e.target.value='';}}}});

/* ---------- viewer ---------- */
var vw=$('vw'),st=$('stage'),im=$('vi'),cur=null,sc=1,fit=1,tx=0,ty=0,lastFocus=null;
function visibleList(){{
  if(!filt&&!q&&!cat) return S;
  return S.filter(function(s){{var t=(s.c+' '+s.t).toLowerCase();return (!filt||s.s===filt)&&(!cat||s.cat===cat)&&(!q||(t+' '+s.cat.toLowerCase()).indexOf(q)>-1);}});
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
  var g=G[s.g]; $('vg').textContent=g.no+'　'+g.name+'　'+s.cat+'　來源：'+s.src;
  var L=visibleList(),i=L.indexOf(s);
  $('vp').disabled=i<=0; $('vnx').disabled=i<0||i>=L.length-1;
  $('vpos').textContent='第 '+(s.i+1)+' 張，共 '+S.length+' 張';
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
$('dlh').onclick=function(){{
  var b=$('dlh'),img=new Image(),s=cur;b.disabled=true;b.textContent='準備中…';
  img.onload=function(){{var c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);
    c.toBlob(function(bl){{var a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download=s.png;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){{URL.revokeObjectURL(a.href);}},4000);b.disabled=false;b.textContent='下載本張 PNG';}},'image/png');}};
  img.onerror=function(){{b.disabled=false;b.textContent='下載本張 PNG';}};
  img.src='p/'+s.k+'.webp';
}};
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
print(C['root'].split('/')[-1], 'sheets', total)
