# Shared template + components for the 形象版 (brand) pages, v2.
import html, os
from PIL import Image
E = html.escape
ROOT = '/home/claude/skytaxi-site'
PA = ROOT + '/sites/park/assets/'
RA = ROOT + '/review/m/04/assets/'
BIG = {'hero', 'hero-1123', 'route-aerial-hutoupi', 'route-lake-view', 'route-forest-view', 'route-mountain-view',
       'unicar-cabin-passengers', 't3-xr-flying-theater', 'room-t2-lake', 't1-gate-aerial'}

REG = {}  # key -> source width (filled when an image is registered)
STEPS = (1280, 2560)
Q = 86

class Imgs:
    """Registers source images and writes WebP variants (1280, 2560, full source width) into the page's img/ folder."""
    def __init__(self, outdir): self.outdir, self.reg = outdir, {}
    def __call__(self, src):
        key = os.path.splitext(os.path.basename(src))[0]
        self.reg[key] = src
        REG[key] = Image.open(src).width
        return f'img/{key}.webp'
    def flush(self):
        os.makedirs(self.outdir, exist_ok=True)
        keep = set()
        for key, src in self.reg.items():
            im = None; sw = REG[key]
            targets = [(f'{key}.webp', sw)] + [(f'{key}-{w}.webp', w) for w in STEPS if w < sw]
            for name, w in targets:
                out = f'{self.outdir}/{name}'; keep.add(name)
                if os.path.exists(out) and os.path.getmtime(out) > max(os.path.getmtime(src), os.path.getmtime(__file__)): continue
                if im is None: im = Image.open(src).convert('RGB')
                o = im if w == im.width else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
                o.save(out, 'WEBP', quality=Q, method=6)
        for f in os.listdir(self.outdir):
            if f not in keep: os.remove(os.path.join(self.outdir, f))
        tot = sum(os.path.getsize(os.path.join(self.outdir, f)) for f in os.listdir(self.outdir))
        return len(self.reg), round(tot / 1e6, 1)

def srcset(src):
    key = os.path.splitext(os.path.basename(src))[0]; sw = REG.get(key)
    if not sw: return ''
    parts = [f'img/{key}-{w}.webp {w}w' for w in STEPS if w < sw] + [f'img/{key}.webp {sw}w']
    return ', '.join(parts)

CSS = open(os.path.join(os.path.dirname(__file__), 'brand.css'), encoding='utf-8').read()
JS = open(os.path.join(os.path.dirname(__file__), 'brand.js'), encoding='utf-8').read()

def T(c): return f'<span class="tcy">{c}</span>'

SZ = {'full': '100vw', 'big': '(max-width:900px) 100vw, 75vw', 'half': '(max-width:900px) 100vw, 58vw',
      'third': '(max-width:900px) 100vw, 34vw', 'quarter': '(max-width:900px) 50vw, 26vw', 'pair': '(max-width:900px) 50vw, 34vw'}

def img(src, alt='', cls='rv', w=1500, h=1000, eager=False, sz='half'):
    ss = srcset(src)
    s = f' srcset="{ss}" sizes="{SZ[sz]}"' if ss else ''
    return f'<img class="{cls}" src="{E(src)}"{s} alt="{E(alt)}" width="{w}" height="{h}"{"" if eager else " loading=\"lazy\""} decoding="async">'

def fig(src, alt, cap='', credit='', sz='pair'):
    c = f'<figcaption>{E(cap)}{f"<small>{E(credit)}</small>" if credit else ""}</figcaption>' if (cap or credit) else ''
    return f'<figure>{img(src, alt, sz=sz)}{c}</figure>'

def head(eyebrow, h2, lead='', center=True):
    ld = f'<p class="lead">{lead}</p>' if lead else ''
    return f'<header class="head{" c" if center else ""}"><span class="eyebrow">{E(eyebrow)}</span><h2 class="h2">{h2}</h2>{ld}</header>'

def subh(text, small='', right=False):
    sm = f'<small>{E(small)}</small>' if small else ''
    return f'<h3 class="subh{" r" if right else ""}"><span>{sm}{text}</span></h3>'

def prose(paras, narrow=True):
    return f'<div class="prose{" narrow" if narrow else ""}">' + ''.join(f'<p>{p}</p>' for p in paras) + '</div>'

def about_row(items):
    return '<div class="about-row">' + ''.join(fig(s, a, c, sz='pair') for s, a, c in items) + '</div>'

def poem(image, alt, title, lines, rev=False):
    return (f'<div class="poem{" rev" if rev else ""}"><div class="ph">{img(image, alt, "rv", 1200, 1500, sz="half")}</div>'
            f'<div class="vtx"><h3>{title}</h3><p>{"<br>".join(lines)}</p></div></div>')

def feat(no, h3, paras, image, alt, link=None, rev=False):
    ps = ''.join(f'<p>{p}</p>' for p in paras)
    lk = f'<a class="more" href="{E(link[1])}">{E(link[0])}</a>' if link else ''
    return f'<div class="feat{" rev" if rev else ""}"><div class="ph">{img(image, alt)}</div><div class="tx"><p class="no">{no}</p><h3>{h3}</h3>{ps}{lk}</div></div>'

def facts(items):
    return '<div class="facts">' + ''.join(f'<div><b>{b}</b><span>{E(s)}</span></div>' for b, s in items) + '</div>'

def gallery(items, cols=4):
    out = []
    for it in items:
        src, alt, cap = it[:3]; credit = it[3] if len(it) > 3 else ''; wide = len(it) > 4 and it[4]
        c = f'<figcaption>{E(cap)}{f"<small>{E(credit)}</small>" if credit else ""}</figcaption>'
        out.append(f'<figure{" class=w2" if wide else ""}>{img(src, alt, sz="half" if wide else "quarter")}{c}</figure>')
    return f'<div class="gal{" g3" if cols == 3 else ""}">' + ''.join(out) + '</div>'

def band(image, alt, t, small=''):
    sm = f'<small>{E(small)}</small>' if small else ''
    return f'<div class="band">{img(image, alt, "rv", 2400, 1350, sz="full")}<p class="bt">{sm}{t}</p></div>'

def station(code, name, sub, main, alt, lead, facs, pics, link=None):
    fl = ''.join(f'<li><b>{E(n)}</b><i>{E(t)}</i><span>{d}</span></li>' for n, t, d in facs)
    pc = ''.join(fig(s, a, c, sz='half' if i == 0 else 'quarter') for i, (s, a, c) in enumerate(pics))
    lk = f'<a class="more" href="{E(link[1])}">{E(link[0])}</a>' if link else ''
    return (f'<article class="st"><div class="st-head"><h3 class="st-code"><small>{E(sub)}</small>{T(code)}　{E(name)}</h3>'
            f'<div><div class="st-main">{img(main, alt, "rv", 2000, 1125, sz="big")}</div><p class="st-lead">{lead}</p>{lk}</div></div>'
            f'<div class="st-body"><ul class="fac">{fl}</ul><div class="st-pics">{pc}</div></div></article>')

def trio(items):
    return '<div class="trio">' + ''.join(f'<article>{img(i, a, "rv", 1200, 1500, sz="third")}<h3>{h}</h3><p class="sub">{s}</p><p>{p}</p></article>' for i, a, h, s, p in items) + '</div>'

def tiles(items):
    out = []
    for it in items:
        href, im, alt, tag, h, p = it[:6]; ul = it[6] if len(it) > 6 else None
        li = ('<ul>' + ''.join(f'<li>{x}</li>' for x in ul) + '</ul>') if ul else ''
        inner = f'<div class="im">{img(im, alt, sz="third")}</div><p class="tag">{tag}</p><h3>{h}</h3><p>{p}</p>{li}'
        out.append(f'<a href="{E(href)}">{inner}</a>' if href else f'<article>{inner}</article>')
    return '<div class="tiles">' + ''.join(out) + '</div>'

def rooms(items):
    out = []
    for im, alt, st, name, bed, desc, wk, we, n in items:
        out.append(f'<article class="room">{img(im, alt, sz="third")}<p class="rs">{st}</p><h3>{E(name)}</h3><p class="bed">{E(bed)}</p><p>{desc}</p>'
                   f'<dl><dt>平日</dt><dd>NT${wk:,}</dd><dt>假日</dt><dd>NT${we:,}</dd><dt>房數</dt><dd>{n} 房</dd></dl></article>')
    return '<div class="rooms">' + ''.join(out) + '</div>'

def lst(rows):
    out = []
    for k, v, href in rows:
        if href: out.append(f'<a href="{E(href)}"><span class="k">{k}</span><span class="v">{v}</span><span class="go">開啟</span></a>')
        else: out.append(f'<div class="row"><span class="k">{k}</span><span class="v">{v}</span><span></span></div>')
    return '<div class="list">' + ''.join(out) + '</div>'

def spots(items):
    out = []
    for i, (im, alt, credit, name, tip, desc) in enumerate(items):
        cr = f'<p class="credit">{E(credit)}</p>' if credit else ''
        out.append(f'<div class="spot{" rev" if i % 2 else ""}"><div class="ph">{img(im, alt)}{cr}</div><div><h3>{E(name)}</h3><p class="tip">{E(tip)}</p><p>{desc}</p></div></div>')
    return ''.join(out)

def spacer(): return '<div style="height:clamp(70px,9vw,120px)"></div>'

def page(cfg):
    menu = ''.join(f'<li><a href="#{i}"><small>{n:02d}</small>{E(t)}</a></li>' for n, (i, t) in enumerate(cfg['menu'], 1))
    hero = cfg['hero']
    disc = cfg.get('disclaimer', '圖片為規劃示意，非現況；價格、場次與開放時間依正式營運公告。')
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
<link rel="preload" as="image" href="{E(hero['img'])}" imagesrcset="{srcset(hero['img'])}" imagesizes="100vw">
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
<nav class="menu" id="menu" aria-label="頁面目錄"><ol>{menu}</ol><p class="addr">{cfg['menu_note']}</p></nav>
<a class="side" href="{E(cfg['side'][0])}">{E(cfg['side'][1])}</a>

<section class="hero" id="top">
  {img(hero['img'], hero['alt'], '', 2400, 1350, eager=True, sz='full')}
  <div class="hero-t"><p class="k">{E(hero['kicker'])}</p><h1>{hero['h1']}</h1><p>{E(hero['sub'])}</p></div>
  <a class="scroll" href="#{cfg['menu'][0][0]}">scroll</a>
</section>

<main>
{cfg['body']}
</main>

<footer class="foot"><div class="wrap">{cfg['foot']}<div class="copy"><span>{E(cfg['copy'])}</span><span>{E(disc)}</span></div></div></footer>
<script>{JS}</script>
</body>
</html>'''
