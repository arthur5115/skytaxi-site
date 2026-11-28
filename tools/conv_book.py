import csv, os, sys
from multiprocessing import Pool
from PIL import Image
SRC='/home/claude/designbook'; OUT='/home/claude/skytaxi-site/review/atlas/design/p'
os.makedirs(OUT, exist_ok=True)
VOL={'全案總圖與纜車系統':'SYS','新化之門站':'T1','湖濱旅館站':'T2','湖濱山城站':'T3','新化林場站':'T4'}
rows=list(csv.DictReader(open(f'{SRC}/00_圖號對照.csv',encoding='utf-8-sig')))
def job(r):
    k=VOL[r['圖冊']]+r['頁碼']
    if os.path.exists(f'{OUT}/{k}_t.webp') and os.path.exists(f'{OUT}/{k}.webp'): return k
    im=Image.open(f"{SRC}/{r['PNG 檔案']}").convert('RGB')
    im.save(f'{OUT}/{k}.webp','WEBP',quality=80,method=5)
    t=im.copy(); t.thumbnail((560,560),Image.LANCZOS); t.save(f'{OUT}/{k}_t.webp','WEBP',quality=78,method=6)
    return k
if __name__=='__main__':
    with Pool(os.cpu_count()) as p:
        for i,k in enumerate(p.imap_unordered(job,rows)):
            if i%25==0: print(i,k,flush=True)
    print('done')
