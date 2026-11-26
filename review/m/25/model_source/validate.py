"""Model identities, independent sample checks, file completeness and JS parity."""
import csv,io,json,math,random,zipfile
from pathlib import Path
from PIL import Image
import model as m
ROOT=Path(__file__).resolve().parent
checks=[];rng=random.Random(430)
assert sum(s['length_m'] for s in m.SPANS)==1947
for sp in m.SPANS:
 L=sp['length_m'];s=sp['scenario']
 for x,z in [(0,sp['start']['EL_m']),(L,sp['end']['EL_m'])]:
  v=m.values(sp,x);assert all(abs(v[k]-z)<1e-9 for k in ['chord_el_m','uniform_el_m','actual_el_m','envelope_el_m'])
 for j in range(100):
  x=rng.random()*L;a=rng.random()*L;p={**s,'a':a};v=m.values(sp,x,p)
  assert v['envelope_el_m']<=v['actual_el_m']+1e-9
  assert abs(m.values(sp,x,{**p,'a':x})['actual_el_m']-v['envelope_el_m'])<1e-9
 for p in [s,{**s,'w':0,'P':0},{**s,'a':0},{**s,'a':L}]:
  amin=m.minimum(sp,p)['actual_el_m'];emin=m.minimum(sp,p,True)['envelope_el_m']
  for x in [L*k/1000 for k in range(1001)]:
   v=m.values(sp,x,p);assert amin<=v['actual_el_m']+1e-9 and emin<=v['envelope_el_m']+1e-9
 rows=list(csv.DictReader((ROOT/(sp['id']+'_profile.csv')).open(encoding='utf-8-sig')))
 if not sp['controls']:assert all(r['margin_m']=='' and r['control_el_m']=='' for r in rows)
 assert float(rows[-1]['global_CH_m'])==sp['end']['CH_m']
 checks.append(sp['id']+': endpoints, envelope, extrema, CSV')
assert abs(m.control_results(m.SPANS[0])[0]['margin_m'])<1e-10
assert abs(m.control_results(m.SPANS[2])[0]['margin_m']+.06350658262571329)<1e-10
assert m.minimum(m.SPANS[-1],{**m.SPANS[-1]['scenario'],'w':0,'P':0})['x_m']==402
js=json.loads((ROOT/'interface_validation.json').read_text());assert js['passed'];errors=[]
for r in js['python_parity_samples']:
 sp=next(s for s in m.SPANS if s['id']==r['spanId']);v=m.values(sp,r['x'])
 for a,b in [('CH','global_CH_m'),('chord','chord_el_m'),('uniform','uniform_el_m'),('actual','actual_el_m'),('envelope','envelope_el_m'),('lower','lower_el_m')]:errors.append(abs(r[a]-v[b]))
assert max(errors)<1e-10
png=[]
for p in sorted(ROOT.glob('*_9600x5400.png')):
 with Image.open(p) as im:im.load();assert im.size==(9600,5400) and im.mode=='RGB'
 assert p.read_bytes()[-12:]==b'\x00\x00\x00\x00IEND\xaeB`\x82'
 png.append({'file':p.name,'fully_decoded':True,'IEND':True,'size':[9600,5400],'bytes':p.stat().st_size})
assert len(png)==6
result={'passed':True,'checks':checks,'python_JS_max_error_m':max(errors),'PNGs':png,'interface_real_browser_layout_test':False}
(ROOT/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False))
