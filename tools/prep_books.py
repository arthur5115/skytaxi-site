import csv, json, os, re, shutil, io
from multiprocessing import Pool
from PIL import Image
import pymupdf as fitz
Image.MAX_IMAGE_PIXELS = None
SITE = '/home/claude/skytaxi-site'
ST = {'T1': '新化之門站', 'T2': '湖濱旅館站', 'T3': '湖濱山城站', 'T4': '新化林場站'}
def save(im, out, k, maxw=4096):
    im = im.convert('RGB')
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(f'{out}/p/{k}.webp', 'WEBP', quality=82, method=5)
    t = im.copy(); t.thumbnail((560, 560), Image.LANCZOS); t.save(f'{out}/p/{k}_t.webp', 'WEBP', quality=78, method=6)

# ---------- 105 renders
R = f'{SITE}/review/atlas/stations'; os.makedirs(R + '/p', exist_ok=True)
rows = list(csv.DictReader(open('/home/claude/b105/圖檔索引.csv', encoding='utf-8-sig')))
def j105(r):
    k = r['圖號'].replace('-', '')
    if not os.path.exists(f'{R}/p/{k}_t.webp'): save(Image.open('/home/claude/b105/' + r['相對路徑']), R, k)
    return k
order = ['T1', 'T2', 'T3', 'T4']
sh = []
for r in rows:
    st = r['圖號'][:2]; gi = order.index(st)
    t = r['圖名'] + (f"（{r['樓層高程']}）" if r['樓層高程'] and r['樓層高程'] != '全站' else '')
    src = r['對照資料'] + (f"；原圖 {r['像素']} px" if r['像素'] else '') + (f"；{r['附註']}" if r['附註'] else '')
    sh.append({'k': r['圖號'].replace('-', ''), 'c': r['圖號'], 't': t, 'g': gi, 's': st, 'cat': r['圖種'], 'src': src, 'png': r['相對路徑'].split('/')[-1]})
sh.sort(key=lambda s: s['g'])  # keep csv order inside station
cfg = {'root': R, 'title': '四站站體與樓層圖檔', 'full': '虎頭埤纜車　四站站體與樓層圖檔', 'date': '2026-11-24 版',
       'sub': '四站整站外觀與分層拆解、逐層 3D 配置，以及站內各空間的寫實透視，依站別整理，可直接放大檢視。',
       'cover': next(s['k'] for s in sh if s['cat'] == '整站外觀'),
       'groups': [{'id': s, 'name': f'{s} {ST[s]}', 'desc': ''} for s in order], 'sheets': sh,
       'note': ''}
for g in cfg['groups']:
    n = [s for s in sh if s['s'] == g['id']]
    from collections import Counter
    c = Counter(s['cat'] for s in n); g['desc'] = '、'.join(f'{k} {v} 張' for k, v in c.items())
json.dump(cfg, open(f'{SITE}/tools/books/stations.json', 'w'), ensure_ascii=False, indent=0)

# ---------- 尺寸圖冊 (33 + 8)
D = f'{SITE}/review/atlas/dims'; os.makedirs(D + '/p', exist_ok=True); os.makedirs(D + '/pdf', exist_ok=True)
BOOKS = [('PD', '四站平面尺寸圖冊', '/mnt/user-data/uploads/a5c40db9-_____BOT__________33__A3_20261124.pdf', 'pdf/Hutoupi_四站平面尺寸圖冊_33張_A3_20261124.pdf'),
         ('SD', '四站剖面尺寸圖冊', '/mnt/user-data/uploads/e2908ece-_____BOT__________8__A3_20261124.pdf', 'pdf/Hutoupi_四站剖面尺寸圖冊_8張_A3_20261124.pdf')]
dsh = []
for gi, (code, name, src, pdfrel) in enumerate(BOOKS):
    shutil.copy(src, f'{D}/{pdfrel}')
    doc = fitz.open(src)
    for lvl, t, p in doc.get_toc():
        if lvl != 2: continue
        c, _, title = t.partition('　')
        k = c.replace('-', '')
        if not os.path.exists(f'{D}/p/{k}_t.webp'):
            imgs = doc[p - 1].get_images()
            if len(imgs) == 1:
                im = Image.open(io.BytesIO(doc.extract_image(imgs[0][0])['image']))
            else:
                pix = doc[p - 1].get_pixmap(dpi=220); im = Image.open(io.BytesIO(pix.tobytes('png')))
            save(im, D, k)
        dsh.append({'k': k, 'c': c, 't': title.strip(), 'g': gi, 's': c[:2], 'cat': name.replace('四站', ''), 'src': f'{name} PDF 第 {p} 頁',
                    'png': f'{c}_{title.strip()}.png'.replace('/', '／')})
cfg = {'root': D, 'title': '平面與剖面尺寸圖冊', 'full': '虎頭埤纜車　平面與剖面尺寸圖冊', 'date': '2026-11-24 版',
       'sub': '投資計畫書四站平面尺寸圖 33 張與剖面尺寸圖 8 張，A3 圖面逐張放大量讀尺寸，並可下載原 PDF。',
       'cover': 'T3PD07', 'unit': '冊',
       'groups': [{'id': b[0], 'name': b[1], 'desc': f'T1 至 T4 四站，共 {sum(1 for s in dsh if s["g"]==i)} 張。', 'pdf': b[3]} for i, b in enumerate(BOOKS)],
       'sheets': dsh, 'downloads': [{'label': b[1] + '（A3 PDF）', 'href': b[3]} for b in BOOKS],
       'note': 'A3 掃描原檔，含封面與圖目。'}
json.dump(cfg, open(f'{SITE}/tools/books/dims.json', 'w'), ensure_ascii=False, indent=0)
if __name__ == '__main__':
    with Pool(2) as p: print(len(p.map(j105, rows)))
    print('dims', len(dsh))
