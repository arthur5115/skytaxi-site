import os
from PIL import Image
P='sites/park/assets/'; R='review/m/04/assets/'
SETS={
 'www/brand/img': ['hero','route-lake-view','route-aerial-hutoupi','t1-gate-aerial','t2-station-concept','t3-station-concept','t4-station-concept','u4-430-guideway','t1-skywalk','t4-station-forest'],
 'sites/park/brand/img': ['hero','visit-small-class','visit-lakeside-movement','visit-nutrition','t1-gate-aerial','t2-station-concept','t3-station-concept','t4-station-concept',
   'room-t2-lake','room-t3-course','ecosystem-wellness','ecosystem-dining','ecosystem-clinic','ecosystem-medical','ecosystem-beauty','ecosystem-retail',
   'route-lake-view','visit-tea','t3-xr-flying-theater','visit-forest-walk','route-aerial-hutoupi','unicar-cabin-passengers','route-forest-view'],
 'review/m/04/brand/img': [R+'hero-1123',R+'t1-render-1123',R+'t2-render-1123',R+'t3-render-1123',R+'t4-render-1123',
   R+'guide/t1-welcome-plaza',R+'guide/t2-arrival-court',R+'guide/t3-lakeside-outlook',R+'guide/t4-canopy',P+'route-lake-view',P+'hero',P+'route-forest-view'],
}
for out,names in SETS.items():
    os.makedirs(out,exist_ok=True); tot=0
    for n in names:
        src=n if '/' in n else P+n
        im=Image.open(src+'.webp').convert('RGB'); key=os.path.basename(n)
        W=2560 if key in ('hero','hero-1123','route-aerial-hutoupi','route-lake-view','route-forest-view','unicar-cabin-passengers') else 1800
        if im.width>W: im=im.resize((W,round(im.height*W/im.width)),Image.LANCZOS)
        f=f'{out}/{key}.webp'; im.save(f,'WEBP',quality=76,method=5); tot+=os.path.getsize(f)
    print(out,len(names),round(tot/1e6,1),'MB')
