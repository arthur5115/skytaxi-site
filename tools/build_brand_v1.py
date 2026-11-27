# Builds the 形象版 (brand) pages for three sites from one template.
#   www/brand/index.html          公司首頁 形象版
#   sites/park/brand/index.html   長壽生活園區 形象版
#   review/m/04/brand/index.html  纜車搭乘與遊園 形象版
import html, os
E = html.escape
ROOT = '/home/claude/skytaxi-site'

CSS = r'''
:root{--bg:#121614;--bg2:#181e1b;--fg:#e8ebe6;--mut:#a3aba5;--dim:#7d8680;--line:rgba(232,235,230,.18);--amber:#d9a441;
--serif:"Noto Serif TC","Songti TC","PMingLiU",serif}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--bg);color:var(--fg);font:300 16px/2.05 var(--serif);letter-spacing:.05em;-webkit-font-smoothing:antialiased}
a{color:inherit}
img{display:block;max-width:100%;height:auto}
:focus-visible{outline:2px solid var(--amber);outline-offset:4px}
.tcy{text-combine-upright:all}

/* top bar */
.top{position:fixed;inset:0 0 auto;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:22px 34px;transition:background .4s}
.top.solid{background:rgba(18,22,20,.86);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.brand{text-decoration:none;font-weight:500;font-size:17px;letter-spacing:.14em}
.brand small{display:block;font-size:11px;letter-spacing:.3em;color:var(--mut);font-weight:300;line-height:1.4}
.top-r{display:flex;align-items:center;gap:22px}
.switch{display:inline-flex;white-space:nowrap;flex:none;border:1px solid var(--line);border-radius:999px;font-size:13px;letter-spacing:.1em;overflow:hidden}
.switch a,.switch span{padding:4px 14px;text-decoration:none;line-height:1.8}
.switch span{background:var(--fg);color:var(--bg);font-weight:500}
.switch a:hover{background:rgba(232,235,230,.1)}
.burger{width:40px;height:40px;border:0;background:none;cursor:pointer;position:relative;padding:0}
.burger i{position:absolute;left:6px;right:6px;height:1px;background:var(--fg);transition:transform .3s,top .3s}
.burger i:nth-child(1){top:14px}.burger i:nth-child(2){top:20px}.burger i:nth-child(3){top:26px}
.menu-open .burger i:nth-child(1){top:20px;transform:rotate(45deg)}.menu-open .burger i:nth-child(2){opacity:0}.menu-open .burger i:nth-child(3){top:20px;transform:rotate(-45deg)}
.menu{position:fixed;inset:0;z-index:25;background:rgba(14,17,15,.97);display:flex;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity .35s,visibility .35s}
.menu-open .menu{opacity:1;visibility:visible}
.menu ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:row-reverse;gap:clamp(22px,4vw,56px);writing-mode:horizontal-tb}
.menu li a{writing-mode:vertical-rl;text-decoration:none;font-size:clamp(18px,2vw,24px);letter-spacing:.32em;font-weight:400;display:block;padding:10px 0;border-top:1px solid var(--line)}
.menu li a:hover{color:var(--amber)}
.menu li small{display:block;writing-mode:horizontal-tb;font-size:11px;color:var(--dim);letter-spacing:.1em;margin-bottom:8px}

/* side CTA */
.side{position:fixed;right:0;top:50%;transform:translateY(-50%);z-index:20;writing-mode:vertical-rl;text-decoration:none;font-size:14px;letter-spacing:.4em;padding:18px 14px;background:rgba(18,22,20,.55);border-left:1px solid var(--line)}
.side::before,.side::after{content:"";display:block;width:1px;height:22px;background:var(--fg);margin:0 auto 10px}
.side::after{margin:10px auto 0}
.side:hover{color:var(--amber)}

/* hero */
.hero{position:relative;height:100vh;height:100svh;min-height:560px;overflow:hidden;display:grid;place-items:center;text-align:center}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(18,22,20,.35) 0%,rgba(18,22,20,.15) 40%,rgba(18,22,20,.55) 78%,var(--bg) 100%)}
.hero-t{position:relative;z-index:1;padding:0 24px;text-shadow:0 2px 24px rgba(0,0,0,.35)}
.hero-t .k{font-size:14px;letter-spacing:.5em;margin:0 0 18px;color:#f1f3ef}
.hero-t h1{font-weight:500;font-size:clamp(34px,5.6vw,76px);line-height:1.35;letter-spacing:.16em;margin:0}
.hero-t p{font-size:clamp(15px,1.5vw,19px);letter-spacing:.3em;margin:18px 0 0;font-weight:400}
.scroll{position:absolute;z-index:1;left:50%;bottom:26px;transform:translateX(-50%);font-size:11px;letter-spacing:.3em;writing-mode:vertical-rl;color:#dfe3de;text-decoration:none}
.scroll::after{content:"";display:block;width:1px;height:70px;background:linear-gradient(var(--fg),transparent);margin:10px auto 0}

/* sections */
.sec{padding:clamp(110px,14vw,190px) 0 0}
.wrap{max-width:1240px;margin:0 auto;padding:0 clamp(22px,5vw,64px)}
.vt{writing-mode:vertical-rl}
.ttl{font-weight:500;font-size:clamp(24px,2.4vw,32px);letter-spacing:.3em;line-height:1.6;margin:0}
.ttl small{display:block;font-size:12px;letter-spacing:.32em;color:var(--amber);font-weight:400;margin-left:10px}
.lede{font-size:17px;line-height:2.3;color:#d5dad4}
.lede.vt{max-height:27em;letter-spacing:.18em}
.mut{color:var(--mut)}
.rule{border:0;border-top:1px solid var(--line);margin:0}

.intro{display:flex;flex-direction:row-reverse;justify-content:center;gap:clamp(36px,6vw,96px);align-items:flex-start}
.intro .lede{margin:0}

.feat{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,4fr);gap:clamp(32px,6vw,96px);align-items:center;margin-top:clamp(80px,10vw,150px)}
.feat.rev{grid-template-columns:minmax(0,4fr) minmax(0,7fr)}
.feat.rev .ph{order:2}
.feat .ph{position:relative}
.feat .ph img{width:100%;aspect-ratio:3/2;object-fit:cover}
.feat .ph .cap{position:absolute;left:0;bottom:-30px;font-size:12px;color:var(--dim);letter-spacing:.12em}
.feat .tx{display:flex;flex-direction:row-reverse;gap:30px;align-items:flex-start}
.feat .tx .body{flex:1;min-width:0}
.feat .no{font-size:13px;letter-spacing:.3em;color:var(--amber);margin:0 0 4px}
.feat h3{font-weight:500;font-size:22px;letter-spacing:.24em;margin:0 0 14px;line-height:1.6}
.feat p{margin:0 0 12px;font-size:15.5px;color:#cdd3cd}
.more{display:inline-flex;align-items:center;gap:14px;margin-top:10px;font-size:14px;letter-spacing:.2em;text-decoration:none;color:var(--fg)}
.more::after{content:"";width:46px;height:1px;background:currentColor;transition:width .3s}
.more:hover{color:var(--amber)} .more:hover::after{width:70px}

.band{position:relative;margin-top:clamp(110px,14vw,190px);height:min(78vh,760px);overflow:hidden}
.band img{width:100%;height:100%;object-fit:cover}
.band .bt{position:absolute;right:clamp(22px,8vw,120px);top:50%;transform:translateY(-50%);writing-mode:vertical-rl;font-size:clamp(22px,2.6vw,34px);letter-spacing:.4em;font-weight:500;text-shadow:0 2px 20px rgba(0,0,0,.5)}
.band .bt small{display:block;font-size:14px;letter-spacing:.3em;font-weight:300;margin-left:16px;color:#e6eae5}
.band::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 40%,rgba(18,22,20,.45))}
.band .bt{z-index:1}

.trio{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(22px,3vw,44px);margin-top:70px}
.trio article:nth-child(2){margin-top:90px}
.trio article:nth-child(3){margin-top:30px}
.trio img{aspect-ratio:4/5;object-fit:cover;width:100%}
.trio h3{font-weight:500;font-size:21px;letter-spacing:.3em;margin:22px 0 2px}
.trio .sub{font-size:13px;color:var(--amber);letter-spacing:.2em;margin:0 0 8px}
.trio p{font-size:15px;color:#cdd3cd;margin:0}

.tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:56px clamp(22px,3vw,40px);margin-top:70px}
.tiles a{text-decoration:none;display:block}
.tiles .im{overflow:hidden}
.tiles img{aspect-ratio:3/2;object-fit:cover;width:100%;transition:transform 1.2s ease}
.tiles a:hover img{transform:scale(1.04)}
.tiles h3{font-weight:500;font-size:19px;letter-spacing:.22em;margin:18px 0 4px}
.tiles p{font-size:14.5px;color:var(--mut);margin:0;line-height:1.95}
.tiles .tag{font-size:12.5px;color:var(--amber);letter-spacing:.18em;margin:0 0 2px}
.tiles a:hover h3{color:var(--amber)}

.pair{display:grid;grid-template-columns:1fr 1fr;gap:clamp(28px,5vw,80px);margin-top:70px}
.pair article:nth-child(2){margin-top:120px}
.pair img{aspect-ratio:4/3;object-fit:cover;width:100%}
.pair h3{font-weight:500;font-size:22px;letter-spacing:.24em;margin:24px 0 6px}
.pair p{font-size:15px;color:#cdd3cd;margin:0 0 8px}
.price{font-size:14px;color:var(--amber);letter-spacing:.12em}

.list{margin-top:60px;border-top:1px solid var(--line)}
.list a,.list div.row{display:grid;grid-template-columns:minmax(0,15em) minmax(0,1fr) auto;gap:20px;align-items:baseline;padding:24px 4px;border-bottom:1px solid var(--line);text-decoration:none}
.list .k{font-size:17px;letter-spacing:.2em;font-weight:500}
.list .v{font-size:14.5px;color:var(--mut)}
.list .go{font-size:13px;letter-spacing:.2em;color:var(--dim)}
.list a:hover .k{color:var(--amber)} .list a:hover .go{color:var(--amber)}

.split{display:grid;grid-template-columns:auto minmax(0,1fr);gap:clamp(36px,6vw,100px);align-items:start}

.foot{margin-top:clamp(120px,14vw,200px);border-top:1px solid var(--line);padding:70px 0 50px}
.foot .wrap{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr) minmax(0,1fr);gap:40px}
.foot h4{font-weight:500;font-size:15px;letter-spacing:.3em;margin:0 0 14px}
.foot p,.foot li{font-size:13.5px;color:var(--mut);line-height:2.1;margin:0}
.foot ul{list-style:none;margin:0;padding:0}
.foot a{text-decoration:none} .foot a:hover{color:var(--amber)}
.copy{grid-column:1/-1;border-top:1px solid var(--line);padding-top:24px;font-size:12px;color:var(--dim);letter-spacing:.12em;display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px}

.rv{opacity:0;transition:opacity 1.3s ease}
.rv.in{opacity:1}
@media (prefers-reduced-motion:reduce){.rv{opacity:1;transition:none}.tiles img{transition:none}}

@media (max-width:820px){
  .top{padding:14px 18px}
  .top .switch{font-size:12px} .switch a,.switch span{padding:3px 10px} .brand{font-size:15px;letter-spacing:.08em} .brand small{display:none} .top-r{gap:10px}
  .intro{flex-direction:column;align-items:stretch}
  .ttl.vt,.lede.vt,.feat .ttl.vt{writing-mode:horizontal-tb;max-height:none}
  .ttl small{margin:0 0 6px}
  .feat,.feat.rev{grid-template-columns:1fr}
  .feat.rev .ph{order:0}
  .feat .tx{flex-direction:column;gap:14px}
  .trio,.tiles{grid-template-columns:1fr} .trio article{margin-top:0!important}
  .pair{grid-template-columns:1fr} .pair article:nth-child(2){margin-top:0}
  .list a,.list div.row{grid-template-columns:1fr;gap:4px}
  .split{grid-template-columns:1fr}
  .foot .wrap{grid-template-columns:1fr}
  .band{height:62vh}
  .side{font-size:12px;padding:12px 9px;letter-spacing:.3em}
  .menu ol{flex-direction:column;gap:6px} .menu li a{writing-mode:horizontal-tb;border-top:0;border-bottom:1px solid var(--line);padding:12px 0;font-size:20px}
}
'''

JS = r'''
(function(){
  var top=document.querySelector('.top'),b=document.querySelector('.burger');
  function onS(){top.classList.toggle('solid',window.scrollY>window.innerHeight*0.6);}
  window.addEventListener('scroll',onS,{passive:true});onS();
  b.addEventListener('click',function(){var o=document.body.classList.toggle('menu-open');b.setAttribute('aria-expanded',o);});
  document.querySelectorAll('.menu a').forEach(function(a){a.addEventListener('click',function(){document.body.classList.remove('menu-open');b.setAttribute('aria-expanded','false');});});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.body.classList.contains('menu-open')){document.body.classList.remove('menu-open');b.setAttribute('aria-expanded','false');b.focus();}});
  if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches){document.querySelectorAll('.rv').forEach(function(x){x.classList.add('in');});return;}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{rootMargin:'0px 0px -12% 0px'});
  document.querySelectorAll('.rv').forEach(function(x){io.observe(x);});
})();
'''

def img(src, alt='', cls='rv', w=1800, h=1200, eager=False):
    return f'<img class="{cls}" src="{E(src)}" alt="{E(alt)}" width="{w}" height="{h}"{"" if eager else " loading=\"lazy\""} decoding="async">'

def vt_title(t, small=''):
    sm = f'<small>{E(small)}</small>' if small else ''
    return f'<h2 class="ttl vt">{sm}{t}</h2>'

def intro(id_, title, small, lede_vt, extra=''):
    return f'''<section class="sec" id="{id_}"><div class="wrap"><div class="intro">{vt_title(title, small)}<p class="lede vt">{lede_vt}</p></div>{extra}</div></section>'''

def feat(no, h3, paras, image, alt, link=None, rev=False, cap=''):
    ps = ''.join(f'<p>{p}</p>' for p in paras)
    lk = f'<a class="more" href="{E(link[1])}">{E(link[0])}</a>' if link else ''
    cp = f'<span class="cap">{E(cap)}</span>' if cap else ''
    return f'''<div class="feat{' rev' if rev else ''}"><div class="ph">{img(image, alt)}{cp}</div><div class="tx"><div class="body"><p class="no">{no}</p><h3>{h3}</h3>{ps}{lk}</div></div></div>'''

def band(image, alt, t, small=''):
    sm = f'<small>{E(small)}</small>' if small else ''
    return f'<div class="band">{img(image, alt, "rv", 2560, 1440)}<p class="bt">{sm}{t}</p></div>'

def trio(items):
    return '<div class="trio">' + ''.join(f'<article>{img(i, a, "rv", 1200, 1500)}<h3>{h}</h3><p class="sub">{s}</p><p>{p}</p></article>' for i, a, h, s, p in items) + '</div>'

def tiles(items):
    out = []
    for href, im, alt, tag, h, p in items:
        out.append(f'<a href="{E(href)}"><div class="im">{img(im, alt)}</div><p class="tag">{tag}</p><h3>{h}</h3><p>{p}</p></a>')
    return '<div class="tiles">' + ''.join(out) + '</div>'

def pair(items):
    return '<div class="pair">' + ''.join(f'<article>{img(i, a, "rv", 1600, 1200)}<h3>{h}</h3><p>{p}</p><p class="price">{pr}</p>{f"""<a class="more" href="{E(l[1])}">{E(l[0])}</a>""" if l else ""}</article>' for i, a, h, p, pr, l in items) + '</div>'

def lst(rows):
    out = []
    for k, v, href in rows:
        if href:
            out.append(f'<a href="{E(href)}"><span class="k">{k}</span><span class="v">{v}</span><span class="go">開啟</span></a>')
        else:
            out.append(f'<div class="row"><span class="k">{k}</span><span class="v">{v}</span><span></span></div>')
    return '<div class="list">' + ''.join(out) + '</div>'

def page(cfg):
    menu = ''.join(f'<li><a href="#{i}"><small>{n:02d}</small>{E(t)}</a></li>' for n, (i, t) in enumerate(cfg['menu'], 1))
    hero = cfg['hero']
    return f'''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>{E(cfg['title'])}</title>
<meta name="theme-color" content="#121614">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@300;400;500;700&display=swap" rel="stylesheet">
<link rel="preload" as="image" href="{E(hero['img'])}">
<style>{CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="#top">{cfg['brand']}<small>{E(cfg['brand_sub'])}</small></a>
  <div class="top-r">
    <span class="switch" role="group" aria-label="版本切換"><a href="{E(cfg['data_href'])}">資料版</a><span aria-current="page">形象版</span></span>
    <button class="burger" type="button" aria-label="選單" aria-expanded="false" aria-controls="menu"><i></i><i></i><i></i></button>
  </div>
</header>
<nav class="menu" id="menu" aria-label="頁面目錄"><ol>{menu}</ol></nav>
<a class="side" href="{E(cfg['side'][0])}">{E(cfg['side'][1])}</a>

<section class="hero" id="top">
  {img(hero['img'], hero['alt'], '', 2560, 1440, eager=True)}
  <div class="hero-t"><p class="k">{E(hero['kicker'])}</p><h1>{hero['h1']}</h1><p>{E(hero['sub'])}</p></div>
  <a class="scroll" href="#{cfg['menu'][0][0]}">scroll</a>
</section>

<main>
{cfg['body']}
</main>

<footer class="foot"><div class="wrap">{cfg['foot']}<div class="copy"><span>{E(cfg['copy'])}</span><span>圖片為規劃示意，非現況。</span></div></div></footer>
<script>{JS}</script>
</body>
</html>'''

# ---------------------------------------------------------------- 公司首頁
I = 'img/'
www_body = (
  intro('idea', '低擾動的立體交通', 'PHILOSOPHY',
        '讓交通走在樹梢之上，<br>把土地留給湖光山色。<br>以弦軌運輸串起車站、旅宿<br>與在地商業，做可長期營運<br>的觀光交通建設。')
  + band(I + 'route-lake-view.webp', '纜車弦軌跨越湖面的示意', '跨湖而行', 'OVER THE LAKE')
  + '<section class="sec" id="work"><div class="wrap">'
  + '<div class="split">' + vt_title('我們做的事', 'WHAT WE DO') + '<div>'
  + trio([
      (I + 't1-skywalk.webp', '新化之門光舟天空步道示意', '弦軌立體交通', 'LOW-IMPACT TRANSIT', '以預力弦軌架設輕量化車廂，跨越湖面與丘陵，地面只需少量墩柱，降低對林地與水域的擾動。'),
      (I + 't2-station-concept.webp', '湖濱旅館站示意', '站旅共構開發', 'STATION ＋ STAY', '車站與旅館、商業設施整合設計，讓交通節點同時成為停留、住宿與消費的目的地。'),
      (I + 't4-station-forest.webp', '新化林場站示意', '促參長期營運', 'BUILD · OPERATE · TRANSFER', '依《促進民間參與公共建設法》推動興建、營運、移轉，以長期營運服務地方與遊客。'),
    ])
  + '</div></div></div></section>'
  + '<section class="sec" id="hutoupi"><div class="wrap">'
  + '<div class="intro">' + vt_title('臺南虎頭埤纜車', 'HUTOUPI SKYWAY') + '<p class="lede vt">以虎頭埤風景區為核心，<br>串連新化老街、湖濱與新化林場，<br>四站全線以弦軌連通，<br>一日可遊，也可留宿。</p></div>'
  + feat('<span class="tcy">T1</span>　新化之門', '光舟與階梯商店街', ['旅程的入口。光舟月台架在迎賓廣場之上，兩條階梯商店街迎向湖面。'], I + 't1-gate-aerial.webp', '新化之門站鳥瞰示意', ('進入纜車網站', '../hutoupi/'))
  + feat('<span class="tcy">T2</span>　湖濱旅館', '退台向湖的旅居', ['車站與旅館共構，客房逐層退台面向虎頭埤，到站即是湖岸。'], I + 't2-station-concept.webp', '湖濱旅館站示意', None, rev=True)
  + feat('<span class="tcy">T3</span>　湖濱山城', '站廳即是山城大廳', ['纜車抵達即入館，宴會、會議、旅館與室內 XR 樂園在同一座山城。'], I + 't3-station-concept.webp', '湖濱山城站示意')
  + feat('<span class="tcy">T4</span>　新化林場', '走進林冠', ['架空站房跨越道路，林場驛站與林冠平台迎接森林遊憩。'], I + 't4-station-concept.webp', '新化林場站示意', None, rev=True)
  + '</div></section>'
  + band(I + 'route-aerial-hutoupi.webp', '虎頭埤全線鳥瞰示意', '四站一線', 'FOUR STATIONS · ONE LINE')
  + '<section class="sec" id="showcase"><div class="wrap"><div class="split">' + vt_title('互動展示', 'INTERACTIVE') + lst([
      ('營運動態模擬', '三維實景中觀看全線車廂隨需發車與運行', '../sim/3d/'),
      ('纜車如何運行', '側立面動態圖解，說明車廂進出站與往返', '../sim/how/'),
      ('全天候隨需發車', '以路線圖呈現 24 小時的發車節奏', '../sim/classic/'),
      ('四站 BIM 互動檢視', 'T1 至 T4 IFC4 模型，可旋轉並查詢構件', 'https://review.skytaxi.com.tw/bim/'),
      ('長壽生活園區', '四站、六大生態、住宿與行程', 'https://park.skytaxi.com.tw/brand/'),
      ('全部互動模型與網站', '審查資料區：模型、圖冊與原始檔', 'https://review.skytaxi.com.tw/'),
    ]) + '</div></div></section>'
)
www_foot = '''<div><h4>雲天新能源科技股份有限公司</h4><p>臺南虎頭埤纜車 BOT 案民間申請人，專注綠色立體交通系統的規劃、興建與營運。</p></div>
<div><h4>虎頭埤纜車</h4><ul><li><a href="../hutoupi/">纜車網站</a></li><li><a href="https://park.skytaxi.com.tw/brand/">長壽生活園區</a></li><li><a href="https://review.skytaxi.com.tw/m/04/brand/">纜車搭乘與遊園</a></li></ul></div>
<div><h4>資料</h4><ul><li><a href="https://review.skytaxi.com.tw/">審查資料區</a></li><li><a href="https://review.skytaxi.com.tw/atlas/planning/">整體規劃與配置圖冊</a></li><li><a href="../">切換資料版</a></li></ul></div>'''
WWW = dict(title='雲天新能源科技｜Skytaxi　形象版', brand='Skytaxi 雲天新能源', brand_sub='GREEN SKYWAY TRANSIT',
  data_href='../', side=('#hutoupi', '探索四站'),
  menu=[('idea', '理念'), ('work', '我們做的事'), ('hutoupi', '虎頭埤纜車'), ('showcase', '互動展示')],
  hero=dict(img=I + 'hero.webp', alt='虎頭埤晨光湖景示意', kicker='SKYTAXI', h1='讓交通<br>走在樹梢之上', sub='把土地留給湖光山色'),
  body=www_body, foot=www_foot, copy='© 2026 雲天新能源科技股份有限公司')

# ---------------------------------------------------------------- 長壽生活園區
park_body = (
  intro('concept', '練習健康的日常', 'CONCEPT',
        '搭纜車遊湖，<br>在山城練習肌力與平衡，<br>到湖岸舒展休息，<br>帶一道新化食材做的料理回家。')
  + '<section class="sec" id="three"><div class="wrap"><div class="split">' + vt_title('一次旅居<br>三種日常', 'THREE HABITS') + '<div>'
  + trio([
      (I + 'visit-small-class.webp', '小班肌力課程示意', '訓練', '<span class="tcy">T3</span> 活力學院', '從熱身、肌力與平衡入門，選幾個回家也能練的動作。'),
      (I + 'visit-lakeside-movement.webp', '湖岸舒展示意', '恢復', '<span class="tcy">T2</span> 湖岸旅居', '上課後回到湖岸舒展、休息，練習安排晚間作息。'),
      (I + 'visit-nutrition.webp', '營養餐食示意', '營養', '<span class="tcy">T1</span> 共享廚房', '認識新化食材與料理，帶回一道能在家重做的餐食。'),
    ]) + '</div></div></div></section>'
  + band(I + 'route-lake-view.webp', '纜車跨越虎頭埤示意', '跨湖的纜車', 'SKYWAY')
  + '<section class="sec" id="stations"><div class="wrap">'
  + '<div class="intro">' + vt_title('走進四座車站', 'FOUR STATIONS') + '<p class="lede vt">從新化之門出發，<br>沿湖到旅館與山城，<br>一路走進森林。</p></div>'
  + feat('<span class="tcy">T1</span>　新化之門', '健康旅程的入口', ['光舟與階梯商店街構成入口。從新化食材、風土餐桌與共享廚房開始，認識可以帶回日常的用餐做法。'], I + 't1-gate-aerial.webp', '新化之門站鳥瞰示意', ('看 T1 新化之門', '/stations/t1/'))
  + feat('<span class="tcy">T2</span>　湖濱旅館', '湖岸恢復與旅居', ['到 T3 上完課後，可回 T2 舒展、休息、練習作息並用餐。日間旅客也能依時段安排停留。'], I + 't2-station-concept.webp', '湖濱旅館站示意', ('看 T2 湖濱旅館', '/stations/t2/'), rev=True)
  + feat('<span class="tcy">T3</span>　湖濱山城', '活力學院與山城共食', ['肌力、平衡與小班教學。課後在山城共食，親子可安排站廳館三樓的「虎埤傳說」室內 XR 樂園。'], I + 't3-station-concept.webp', '湖濱山城站示意', ('看 T3 湖濱山城', '/stations/t3/'))
  + feat('<span class="tcy">T4</span>　新化林場', '森林療癒的終點', ['沿開放林徑慢行、觀察林相與靜休，把湖岸恢復的體驗接到林間。'], I + 't4-station-concept.webp', '新化林場站示意', ('看 T4 新化林場', '/stations/t4/'), rev=True)
  + '</div></section>'
  + '<section class="sec" id="stay"><div class="wrap"><div class="split">' + vt_title('住進湖岸<br>或山城', 'STAY') + '<div>'
  + pair([
      (I + 'room-t2-lake.webp', '湖濱旅館湖景房示意', '在湖岸住幾晚', '從 T3 上課回來，在湖岸安排舒展、用餐與休息。三天兩夜方案在這裡連住兩晚。', '平日每房晚 NT$6,500 起　規劃參考', ('看 T2 房型', '/stays/')),
      (I + 'room-t3-course.webp', '湖濱山城課程長住房示意', '住在山城上課', '在活力學院上課，與同行者共食。可選團旅、課程長住與彈性友善房。', '平日每房晚 NT$4,700 起　規劃參考', ('看 T3 房型', '/stays/')),
    ]) + '</div></div></div></section>'
  + '<section class="sec" id="eco"><div class="wrap">'
  + '<div class="intro">' + vt_title('四站<br>六大生態', 'ECOSYSTEM') + '<p class="lede vt">醫療、運動、飲食、保養與選品，<br>分布在四座車站，<br>搭一段纜車就能接上。</p></div>'
  + tiles([
      ('/ecosystems/wellness-centre/', I + 'ecosystem-wellness.webp', '健康中心示意', '<span class="tcy">T3</span>・<span class="tcy">T2</span>', '健康中心', '以活力學院的肌力與平衡訓練為核心，課後在湖岸舒展與休息。'),
      ('/ecosystems/healthy-dining/', I + 'ecosystem-dining.webp', '健康餐飲示意', '<span class="tcy">T1</span>・<span class="tcy">T2</span>・<span class="tcy">T3</span>', '健康餐飲', '從食材與料理練習出發，在湖岸旅居和課後共食體驗餐食安排。'),
      ('/ecosystems/longevity-clinic/', I + 'ecosystem-clinic.webp', '長壽診所示意', '<span class="tcy">T1</span>', '長壽診所', '由進駐院所提供預防門診、健康檢查與後續追蹤。'),
      ('/ecosystems/medical-allied/', I + 'ecosystem-medical.webp', '醫事專業服務示意', '<span class="tcy">T1</span>', '醫療與醫事專業', '門診、復健、物理治療與個別營養服務，依核准範圍承作。'),
      ('/ecosystems/beauty-care/', I + 'ecosystem-beauty.webp', '身體保養示意', '<span class="tcy">T2</span>', '美容與身體保養', '非侵入式日常保養與放鬆，可按日間停留或住宿時段選擇。'),
      ('/ecosystems/curated-retail/', I + 'ecosystem-retail.webp', '精選零售示意', '<span class="tcy">T1</span>・<span class="tcy">T2</span>', '精選零售', '選購新化在地食材與生活用品，了解日常保養選品的使用方式。'),
    ]) + '</div></section>'
  + band(I + 'route-forest-view.webp', '新化林場林相示意', '走進森林', 'FOREST')
  + '<section class="sec" id="journeys"><div class="wrap">'
  + '<div class="intro">' + vt_title('選一趟<br>湖山旅程', 'JOURNEYS') + '<p class="lede vt">九十分鐘到三天兩夜，<br>依時間與同行者挑選。</p></div>'
  + tiles([
      ('/journeys/lakeside-retreat/', I + 'room-t2-lake.webp', '湖岸旅居示意', '三天兩夜', '湖岸健康旅居', '住在 T2，串聯 T1 食農、T3 肌力與平衡，整理一份帶回家的練習計畫。'),
      ('/journeys/family-half-day/', I + 't3-xr-flying-theater.webp', '室內 XR 樂園示意', '親子半日', '食農與室內樂園', '先在 T1 共享廚房認識食材，再到 T3 體驗「虎埤傳說」室內 XR 樂園。'),
      ('/journeys/lakeside-90/', I + 'visit-tea.webp', '湖畔喝茶示意', '九十分鐘', '湖畔初體驗', '從新化食材與市集選品出發，搭纜車到湖濱旅館站散步、喝茶。'),
      ('/journeys/full-park-day/', I + 'route-aerial-hutoupi.webp', '四站全線鳥瞰示意', '一日', '四站纜車一日遊', '湖岸用餐、山城活動、林場步行，最後由 T4 直返 T1。'),
      ('/journeys/forest-half-day/', I + 'visit-forest-walk.webp', '森林慢行示意', '半日', '森林慢行', '搭纜車直達 T4，參加小團森林步行、自然觀察與林間靜休。'),
      ('/plan/', I + 'hero.webp', '虎頭埤晨光示意', '自己安排', '排我的行程', '選擇起訖站與時段，組合一份自己的湖山行程。'),
    ]) + '</div></section>'
  + '<section class="sec" id="cabin"><div class="wrap">'
  + feat('uSky Unicar U4‑430', '從月台走進座艙', ['電動弦軌車輛由車頂走行裝置沿上方弦軌行走。透過車門看座椅與走道，再按路段查看跨湖、山城與林地的景觀。'], I + 'unicar-cabin-passengers.webp', '座艙內乘客示意', ('看車型展示', '/cableway/vehicle/'))
  + '</div></section>'
)
park_foot = '''<div><h4>虎頭埤長壽生活園區</h4><p>四站纜車串起湖岸、山城與森林，在旅程中練習訓練、恢復與營養三種日常。</p></div>
<div><h4>園區</h4><ul><li><a href="/stations/">四座車站</a></li><li><a href="/ecosystems/">六大生態</a></li><li><a href="/stays/">住宿與房價</a></li><li><a href="/journeys/">行程</a></li></ul></div>
<div><h4>纜車與行前</h4><ul><li><a href="/cableway/">園區纜車</a></li><li><a href="/cableway/boarding/">搭乘與無障礙</a></li><li><a href="/plan/">排我的行程</a></li><li><a href="/">切換資料版</a></li></ul></div>'''
PARK = dict(title='虎頭埤長壽生活園區　形象版', brand='虎頭埤長壽生活園區', brand_sub='HUTOUPI HEALTHSPAN',
  data_href='/', side=('/plan/', '排我的行程'),
  menu=[('concept', '理念'), ('three', '三種日常'), ('stations', '四座車站'), ('stay', '住宿'), ('eco', '六大生態'), ('journeys', '旅程'), ('cabin', '座艙')],
  hero=dict(img=I + 'hero.webp', alt='虎頭埤晨光湖景示意', kicker='HUTOUPI HEALTHSPAN', h1='湖岸與山城', sub='練習健康的日常'),
  body=park_body, foot=park_foot, copy='© 2026 虎頭埤長壽生活園區　雲天新能源科技股份有限公司')

# ---------------------------------------------------------------- 纜車搭乘與遊園
ride_body = (
  intro('start', '從哪一站開始', 'FOUR STATIONS',
        '從入口轉乘、湖畔住宿，<br>到山城聚會與森林散步。<br>選一站，看看有哪些體驗。')
  + '<section class="sec" id="stations"><div class="wrap">'
  + feat('<span class="tcy">T1</span>　新化之門站', '小鎮的入口', ['主要入口與轉乘站。先逛新化老街、嚐在地小吃，再到迎賓廣場與商店街停留。'], I + 't1-render-1123.webp', '新化之門站實景模擬', ('看分站導覽', '../#guide'))
  + feat('<span class="tcy">T2</span>　湖濱旅館站', '在湖邊留一晚', ['預留一段湖畔散步，把湖景、住宿與悠閒的隔日串成一趟小旅行。'], I + 't2-render-1123.webp', '湖濱旅館站實景模擬', ('看分站導覽', '../#guide'), rev=True)
  + feat('<span class="tcy">T3</span>　湖濱山城站', '到山城團聚', ['想找聚餐、宴會或會議場地，可以先認識山城的旅宿與會展機能。'], I + 't3-render-1123.webp', '湖濱山城站實景模擬', ('看分站導覽', '../#guide'))
  + feat('<span class="tcy">T4</span>　新化林場站', '走進森林', ['由新化之門認識在地特色，再到新化林場安排林間漫步與自然觀察。'], I + 't4-render-1123.webp', '新化林場站實景模擬', ('看分站導覽', '../#guide'), rev=True)
  + '</div></section>'
  + band(I + 'route-lake-view.webp', '纜車跨越虎頭埤示意', '先搭一趟', 'RIDE')
  + '<section class="sec" id="trips"><div class="wrap">'
  + '<div class="intro">' + vt_title('想怎麼玩<br>虎頭埤', 'TRIPS') + '<p class="lede vt">先按興趣挑選，<br>以下是開放後的行程構想。</p></div>'
  + tiles([
      ('../#trips', I + 't1-welcome-plaza.webp', '迎賓廣場實景模擬', '老街', '從新化出發', '逛新化老街、嚐在地小吃，再到迎賓廣場與商店街停留。'),
      ('../#trips', I + 't2-arrival-court.webp', '湖濱旅館到達庭實景模擬', '湖畔', '在湖邊留一個晚上', '湖景、住宿與悠閒的隔日，串成一趟小旅行。'),
      ('../#trips', I + 't3-lakeside-outlook.webp', '山城湖景平台實景模擬', '團聚', '到山城安排團聚', '聚餐、宴會或會議，先認識山城的旅宿與會展機能。'),
    ]) + '</div></section>'
  + band(I + 'route-forest-view.webp', '新化林場林相示意', '林間漫步', 'FOREST')
  + '<section class="sec" id="visit"><div class="wrap"><div class="split">' + vt_title('出發前<br>先確認', 'BEFORE YOU GO') + lst([
      ('現在可以搭嗎', '還不行。開放日期、票價、售票方式與服務時間，以營運方正式公告為準。', None),
      ('從哪裡上車', '新化之門站是主要入口與轉乘站，搭乘動線、上下客位置及停車資訊開放前另行公布。', None),
      ('無障礙與同行者', '開放後請先確認各站無障礙進出、上下車協助、輪椅或嬰兒車搭乘規則。', None),
      ('預約與訂房', '本站不接受預訂；開放資訊與服務內容，由各服務業者公告。', None),
      ('現在去虎頭埤', '門票、開園時間與園區交通，請以風景區官方資訊為準。', None),
    ]) + '</div></div></section>'
)
ride_foot = '''<div><h4>虎頭埤纜車</h4><p>從新化之門出發，沿湖穿過山城，一路走進森林。纜車尚未開放搭乘。</p></div>
<div><h4>導覽</h4><ul><li><a href="../#route">從哪一站開始</a></li><li><a href="../#ride">沿線動畫</a></li><li><a href="../#guide">分站深度導覽</a></li><li><a href="../#trips">行程構想</a></li></ul></div>
<div><h4>更多</h4><ul><li><a href="https://park.skytaxi.com.tw/brand/">長壽生活園區</a></li><li><a href="https://www.skytaxi.com.tw/brand/">Skytaxi 雲天新能源</a></li><li><a href="../">切換資料版</a></li></ul></div>'''
RIDE = dict(title='虎頭埤纜車｜搭乘與遊園　形象版', brand='虎頭埤纜車', brand_sub='HUTOUPI CABLE CAR',
  data_href='../', side=('../#guide', '分站導覽'),
  menu=[('start', '從哪一站開始'), ('stations', '四站'), ('trips', '行程構想'), ('visit', '出發前')],
  hero=dict(img=I + 'hero-1123.webp', alt='虎頭埤鳥瞰實景模擬', kicker='HUTOUPI CABLE CAR', h1='虎頭埤纜車', sub='沿湖穿過山城，一路走進森林'),
  body=ride_body, foot=ride_foot, copy='© 2026 雲天新能源科技股份有限公司　纜車尚未開放搭乘')

for path, cfg in [('www/brand/index.html', WWW), ('sites/park/brand/index.html', PARK), ('review/m/04/brand/index.html', RIDE)]:
    open(os.path.join(ROOT, path), 'w', encoding='utf-8').write(page(cfg))
    print('wrote', path)
