"""Five spans, fixed-horizontal-force comparison. Python standard library only."""
from pathlib import Path
import csv, json, math

ROOT=Path(__file__).resolve().parent
NODES=[{'name':n,'CH_m':ch,'EL_m':z,'type':t} for n,ch,z,t in [
 ('T1',0,52.6,'錨碇端'),('P2',446,63.1,'中間支承'),('T2',796,67.6,'錨碇介面'),
 ('T3',1139,68.,'錨碇介面'),('P4',1545,85.,'中間支承'),('T4',1947,66.,'錨碇端')]]
SPAN_INFO=[
 ('第一跨','丘1飛越；維持446 m完整跨距', [{'x_m':70.,'ground_el_m':40.,'control_el_m':50.,'label':'丘1算例','source':'附錄C：x=70 m；地形40＋規劃控制10 m'}]),
 ('第二跨','環湖道路／開放水域／T2站前介面',[]),
 ('第三跨','丘3飛越；兩旅館站之間', [{'x_m':171.5,'ground_el_m':53.,'control_el_m':63.,'label':'丘3跨中示例','source':'正文丘3約位於跨中；以343/2=171.5 m示例，非實測精確位置'}]),
 ('第四跨','上坡／迎風／谷地／P4支承',[]),
 ('第五跨','下坡／林地／T4端站',[])]
W=.29642727656848483
SPANS=[]
for i,(title,context,controls) in enumerate(SPAN_INFO):
 a,b=NODES[i:i+2]; L=b['CH_m']-a['CH_m']
 SPANS.append({'id':a['name']+'-'+b['name'],'index':i+1,'title':title,'start':a,'end':b,
 'length_m':L,'context':context,'controls':controls,'scenario':{'H':1000.,'w':W,'P':5.88,'a':70. if i==0 else L/2,'d':0.}})
BASE={'version':'R1','date':'2026-10-05','status':'待審核','nodes':NODES,'spans':SPANS,
 'source':{'name':'CH02-P12-R5_第二章土地使用與興建計畫統一修訂版.docx','version':14,'modified':'2026-09-15','sections':['正文2.3','附錄B','附錄C.1']},
 'comparison_basis':'第2至5跨沿用第1跨H、w、P以比較幾何影響；非各跨選定張力、材料重量或供貨分析。',
 'limits':['固定H之理想柔索拋物線近似；未解EI、EA、溫度、風振或滑鞍相容。','P2及P4為中間支承，五跨分別計算，未解跨間相容。','移動點載包絡由不同車位取極值，不能作同時軌道線或行車坡度。','d=0代表尚未納入車體與額外包絡；控制面不可重複計入同一偏置。','僅對已輸入控制點求餘裕；不虛構連續地形或全跨淨空。']}

def values(span,x,s=None):
 s=s or span['scenario']; L=span['length_m']; za=span['start']['EL_m'];zb=span['end']['EL_m']
 if not all(math.isfinite(v) for v in [x,*s.values()]) or not(0<=x<=L and 0<=s['a']<=L and s['H']>0 and min(s['w'],s['P'],s['d'])>=0): raise ValueError('Invalid comparison inputs')
 H,w,P,a,d=(s[k] for k in ['H','w','P','a','d'])
 chord=za+(zb-za)*x/L; fq=w*x*(L-x)/(2*H);fp=P*min(x,a)*(L-max(x,a))/(H*L); ep=P*x*(L-x)/(H*L)
 return {'x_m':x,'global_CH_m':span['start']['CH_m']+x,'chord_el_m':chord,'uniform_el_m':chord-fq,'actual_el_m':chord-fq-fp,'envelope_el_m':chord-fq-ep,'lower_el_m':chord-fq-ep-d}

def minimum(span,s=None,envelope=False):
 s=s or span['scenario'];L=span['length_m'];m=(span['end']['EL_m']-span['start']['EL_m'])/L;H,w,P,a=(s[k] for k in ['H','w','P','a']);xs=[0.,float(L)]
 if envelope:
  k=w/(2*H)+P/(H*L)
  if k>0:xs.append(max(0,min(L,(L-m/k)/2)))
 else:
  xs.append(a)
  if w>0:
   l=(w*L/2+P*(L-a)/L-H*m)/w;r=(w*L/2-P*a/L-H*m)/w
   if 0<=l<=a:xs.append(l)
   if a<=r<=L:xs.append(r)
 key='envelope_el_m' if envelope else 'actual_el_m'
 return min((values(span,x,s) for x in xs),key=lambda v:v[key])

def control_results(span,s=None):
 return [{**c,**values(span,c['x_m'],s),'margin_m':values(span,c['x_m'],s)['lower_el_m']-c['control_el_m']} for c in span['controls']]

def summary(span):
 return {'id':span['id'],'length_m':span['length_m'],'chord_grade_pct':100*(span['end']['EL_m']-span['start']['EL_m'])/span['length_m'],'actual_min':minimum(span),'envelope_min':minimum(span,envelope=True),'controls':control_results(span)}

def build():
 (ROOT/'baseline.json').write_text(json.dumps(BASE,ensure_ascii=False,indent=2))
 (ROOT/'summary.json').write_text(json.dumps([summary(s) for s in SPANS],ensure_ascii=False,indent=2))
 for span in SPANS:
  xs=sorted(set([*range(span['length_m']+1),span['scenario']['a'],*(c['x_m'] for c in span['controls'])]))
  rows=[]
  for x in xs:
   v=values(span,x); c=next((c for c in span['controls'] if c['x_m']==x),None)
   rows.append({'span':span['id'],**v,'ground_el_m':c['ground_el_m'] if c else '', 'control_el_m':c['control_el_m'] if c else '', 'margin_m':v['lower_el_m']-c['control_el_m'] if c else '',**span['scenario'],'status':'conditional_comparison_not_design_release'})
  with (ROOT/(span['id']+'_profile.csv')).open('w',encoding='utf-8-sig',newline='') as f:
   wr=csv.DictWriter(f,fieldnames=list(rows[0]));wr.writeheader();wr.writerows(rows)
  with (ROOT/(span['id']+'_control_points.csv')).open('w',encoding='utf-8-sig',newline='') as f:
   wr=csv.DictWriter(f,fieldnames=['x_m','ground_el_m','control_el_m'],extrasaction='ignore');wr.writeheader();wr.writerows(span['controls'])
 return [summary(s) for s in SPANS]

if __name__=='__main__': print(json.dumps(build(),ensure_ascii=False,indent=2))
