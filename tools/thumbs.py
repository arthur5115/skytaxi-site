import sys
from playwright.sync_api import sync_playwright
from PIL import Image
B='http://localhost:8766/review/'
T={'overview':B+'overview/','01':B+'m/01/','route':'http://localhost:8771/','34':B+'m/34/','11':B+'m/11/',
 'bim':B+'bim/','05':B+'m/05/','33':B+'m/33/','24':B+'m/24/','27':B+'m/27/','t3p':B+'t3-platform-3d/',
 '08':B+'m/08/','25':B+'m/25/','26':B+'m/26/','park':'http://localhost:8773/','04':B+'m/04/','02':B+'m/02/','20':B+'m/20/'}
keys=sys.argv[1:] or list(T)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for k in keys:
        pg=b.new_page(viewport={'width':1280,'height':800})
        try:
            pg.goto(T[k],timeout=90000,wait_until='load'); pg.wait_for_timeout(10000)
            f=f'/home/claude/shots/th_{k}.png'; pg.screenshot(path=f)
            Image.open(f).convert('RGB').resize((720,450),Image.LANCZOS).save(f'/home/claude/skytaxi-site/review/thumbs/{k}.jpg',quality=80,optimize=True,progressive=True)
            print('ok',k)
        except Exception as e: print('ERR',k,str(e)[:100])
        pg.close()
    b.close()
