"""Deterministic 16:9 engineering drawings; atomic, fully decoded RGB PNGs."""
from pathlib import Path
import os, json, shutil
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
import model as m

ROOT=Path(__file__).resolve().parent
for p in (ROOT/'assets').glob('*.otf'):fm.fontManager.addfont(str(p))
plt.rcParams.update({'font.family':'Noto Sans CJK TC','axes.unicode_minus':False,'svg.fonttype':'none','font.size':10})
G='#174E42';C='#A46842';BLUE='#356885';GRAY='#6B7777';LIGHT='#DCE4DF';INK='#203431';RED='#B24538'
checks=[]

def save(fig,stem):
 target=ROOT/(stem+'_9600x5400.png');temporary=ROOT/'render-full.tmp.png';checked=ROOT/'render-checked.tmp.png'
 fig.savefig(temporary,dpi=500,facecolor='white',format='png')
 with Image.open(temporary) as im:
  im.load();assert im.size==(9600,5400);im.convert('RGB').save(checked,format='PNG')
 with Image.open(checked) as im:
  im.load();assert im.mode=='RGB' and im.size==(9600,5400)
 assert checked.read_bytes()[-12:]==b'\x00\x00\x00\x00IEND\xaeB`\x82'
 os.replace(checked,target);temporary.unlink()
 fig.savefig(ROOT/(stem+'.svg'),facecolor='white')
 fig.savefig(ROOT/(stem+'_preview.png'),dpi=100,facecolor='white')
 checks.append({'file':target.name,'full_decode':True,'IEND':True,'size':[9600,5400],'mode':'RGB','bytes':target.stat().st_size})
 plt.close(fig);print('Verified '+target.name,flush=True)

def plate(sp):
 L=sp['length_m'];start,end=sp['start'],sp['end'];s=sp['scenario'];su=m.summary(sp);ctrl=su['controls'];n=sp['index']
 fig=plt.figure(figsize=(19.2,10.8),facecolor='white')
 def txt(x,y,t,size=10,color=INK,weight='normal',**kw):return fig.text(x,y,t,fontsize=size,color=color,fontweight=weight,**kw)
 txt(.04,.943,f'{start["name"]}—{end["name"]} {sp["title"]} {L} m',26,G,'bold')
 txt(.04,.907,'縱斷面與淨空模型｜既定幾何 × 共同比較工況',13)
 txt(.96,.948,f'{sp["id"]}-LP-0{n}  /  R1',12,G,'bold',ha='right')
 txt(.96,.918,'2026.10.05　｜　待審核　｜　單位：m、tf',10,GRAY,ha='right')
 strip=fig.add_axes([.068,.807,.655,.067]);strip.set_xlim(-45,1992);strip.set_ylim(-1,1);strip.axis('off')
 strip.plot([0,1947],[0,0],color=LIGHT,lw=2)
 strip.plot([start['CH_m'],end['CH_m']],[0,0],color=G,lw=4)
 for nd in m.NODES:
  xx=nd['CH_m'];strip.plot(xx,0,'o',color=G if start['CH_m']<=xx<=end['CH_m'] else GRAY,ms=5)
  strip.text(xx,.3,nd['name'],ha='center',color=G,fontsize=10,fontweight='bold')
  strip.text(xx,-.75,f'CH {xx}',ha='center',color=GRAY,fontsize=8)
 txt(.762,.853,f'本跨：CH {start["CH_m"]}—{end["CH_m"]}',11,G,'bold')
 txt(.762,.823,'P2、P4為中間支承；五跨分別計算',9,GRAY)
 ax=fig.add_axes([.068,.357,.655,.425]);xs=np.linspace(0,L,1601);vs=[m.values(sp,float(x)) for x in xs]
 low=min([v['envelope_el_m'] for v in vs]+[c['ground_el_m'] for c in ctrl]);high=max(start['EL_m'],end['EL_m'])
 ymin=np.floor((low-3)/5)*5;ymax=np.ceil((high+4)/5)*5
 ax.set_xlim(-L*.022,L*1.022);ax.set_ylim(ymin,ymax);ax.grid(True,color=LIGHT,lw=.55)
 ticks=sorted(set([0,*[v for v in range(50,L,50) if abs(v-L/2)>L*.035 and abs(v-L)>L*.035],L/2,L]));ax.set_xticks(ticks);ax.set_yticks(np.arange(ymin,ymax+1,5));ax.tick_params(labelsize=8.5,colors=GRAY)
 for spine in ax.spines.values():spine.set_color(LIGHT)
 ax.set_xlabel(f'自{start["name"]}起算局部里程 x（m）；全線 CH＝{start["CH_m"]}＋x',fontsize=10,color=INK,labelpad=9)
 ax.set_ylabel('軌道中心／控制點高程 EL.（m）',fontsize=10,color=INK,labelpad=8)
 for key,color,ls,lw,label in [('chord_el_m',GRAY,'--',1.1,'端點弦線'),('uniform_el_m',BLUE,'-',1.4,'僅均布荷載'),('actual_el_m',G,'-',1.8,f'固定車位 x={s["a"]:g}'),('envelope_el_m',C,(0,(3,2)),2,'移動點載下緣包絡')]:
  ax.plot(xs,[v[key] for v in vs],color=color,ls=ls,lw=lw,label=label)
 ax.fill_between(xs,[v['actual_el_m'] for v in vs],[v['envelope_el_m'] for v in vs],color=C,alpha=.07)
 for xx,nd,ha,dx in [(0,start,'left',L*.014),(L,end,'right',-L*.014)]:
  ax.scatter([xx],[nd['EL_m']],color=G,s=36,zorder=6);ax.text(xx+dx,nd['EL_m']+1.1,f'{nd["name"]}｜EL.{nd["EL_m"]:.2f}',fontsize=10,color=G,fontweight='bold',ha=ha)
 av=m.values(sp,s['a'])
 ax.annotate(f'P＝5.88 tf｜a＝{s["a"]:g} m',xy=(s['a'],av['actual_el_m']),xytext=(s['a'],av['actual_el_m']+(ymax-ymin)*.27),fontsize=9,color=G,ha='center',arrowprops={'arrowstyle':'-|>','color':G,'lw':1.1},bbox={'facecolor':'white','edgecolor':'none','pad':2})
 ev=su['envelope_min'];xe,ye=ev['x_m'],ev['envelope_el_m']
 ax.scatter([xe],[ye],s=28,color=C,zorder=6)
 if not ctrl:
  ax.annotate(f'包絡最低點 x={xe:.2f}\nEL.{ye:.3f}',xy=(xe,ye),xytext=(L*.1,ymin+(ymax-ymin)*.13),fontsize=10,color=C,arrowprops={'arrowstyle':'-','color':C,'lw':.9},bbox={'facecolor':'white','edgecolor':'none','pad':2})
  ax.text(L*.57,ymin+(ymax-ymin)*.045,'未輸入數值控制面；不推算淨空結論',fontsize=9,color=GRAY,ha='center')
 else:
  c=ctrl[0];xx=c['x_m'];gg=c['ground_el_m'];cc=c['control_el_m']
  ax.scatter([xx],[gg],marker='s',s=26,color=GRAY,zorder=6);ax.plot([xx,xx],[gg,cc],color=GRAY,lw=1,ls=':');ax.plot([xx-9,xx+9],[cc,cc],color=RED,lw=2)
  ax.text(xx+7,gg-.9,'丘3地形約 EL.53.00',fontsize=9,color=GRAY)
  ax.text(xx+7,(gg+cc)/2,'規劃控制＋10.00',fontsize=9,color=GRAY)
  ax.annotate(f'丘3跨中示例｜控制面 EL.63.00\n包絡 EL.{c["envelope_el_m"]:.3f}；餘裕 {c["margin_m"]:+.3f} m',xy=(xx,cc),xytext=(L*.035,ymin+(ymax-ymin)*.17),fontsize=10,color=INK,arrowprops={'arrowstyle':'-','color':C,'lw':.9},bbox={'facecolor':'white','edgecolor':'none','pad':2})
  ax.text(L*.5,ymax-.8,'丘3位置為跨中示例，非實測精確樁號',fontsize=9,color=GRAY,ha='center')
 ax.legend(loc='upper left',bbox_to_anchor=(0,1.075),ncol=4,frameon=False,fontsize=9,handlelength=2,columnspacing=1.3)
 vex=(.425*10.8/(ymax-ymin))/(.655*19.2/(L*1.044))
 txt(.72,.326,f'縱向比例放大約{vex:.1f}倍；圖上長度請依標註讀取',8.5,GRAY,ha='right')
 txt(.762,.757,'01　鎖定幾何',13,G,'bold')
 for yy,t in zip([.726,.699,.672],[f'L＝{L:.2f}　｜　ΔEL＝{end["EL_m"]-start["EL_m"]:+.2f}',f'弦線平均坡度＝{su["chord_grade_pct"]:+.3f}%',sp['context']]):txt(.762,yy,t,10)
 txt(.762,.626,'02　共同比較工況',13,G,'bold')
 for yy,t in zip([.595,.568,.541,.514],['H＝1,000 tf　｜　P＝5.88 tf','w＝0.296427… tf/m',f'a＝{s["a"]:g} m；額外扣減 d＝0','沿用首跨條件；非本跨選定設計值']):txt(.762,yy,t,10)
 txt(.762,.47,'03　控制結果',13,G,'bold')
 if ctrl:
  txt(.762,.43,f'剩餘餘裕  {ctrl[0]["margin_m"]:+.3f} m',18,RED,'bold')
  txt(.762,.397,'僅此共同比較工況出現局部負餘裕。',10,RED)
 else:
  txt(.762,.43,'控制面尚未輸入',17,GRAY,'bold')
  txt(.762,.397,'可由CSV匯入本跨實際控制斷面。',10,GRAY)
 txt(.762,.369,'d＝0：尚未納入車體及額外包絡。',9,GRAY)
 txt(.762,.342,'未作全跨安全或施工放行判定。',9,GRAY)
 points=[0,L*.125,L*.25,L*.375,L*.5,L*.625,L*.75,L*.875,L]
 rows=[['局部 x（m）']+[f'{x:g}' for x in points],['全線 CH（m）']+[f'{start["CH_m"]+x:.3f}'.rstrip('0').rstrip('.') for x in points],['弦線高程']+[f'{m.values(sp,x)["chord_el_m"]:.2f}' for x in points],['固定車位軌道線']+[f'{m.values(sp,x)["actual_el_m"]:.2f}' for x in points],['移動點載包絡']+[f'{m.values(sp,x)["envelope_el_m"]:.2f}' for x in points],['控制面／餘裕']+[(f'{ctrl[0]["control_el_m"]:.2f}／{ctrl[0]["margin_m"]:+.3f}' if ctrl and x==ctrl[0]['x_m'] else '—') for x in points]]
 tb=fig.add_axes([.04,.112,.92,.176]);tb.axis('off');t=tb.table(cellText=rows,cellLoc='center',loc='center',colWidths=[.15]+[.85/9]*9);t.auto_set_font_size(False);t.set_fontsize(9);t.scale(1,1.4)
 for (r,c),cell in t.get_celld().items():
  cell.set_edgecolor(LIGHT);cell.set_linewidth(.55)
  if r==0:cell.set_facecolor(G);cell.set_text_props(color='white',weight='bold')
  elif c==0:cell.set_facecolor('#F0F5F1');cell.set_text_props(color=G)
  elif ctrl and c==5:cell.set_facecolor('#FBF1E9');cell.set_text_props(color=INK)
  else:cell.set_text_props(color=INK)
 txt(.04,.302,'逐點高程登錄',12,G,'bold');txt(.96,.302,'「—」表示未輸入該點控制面，不代表餘裕為零或通過檢核',9,GRAY,ha='right')
 txt(.04,.072,'計算：固定H之理想柔索近似。包絡來自不同車位，並非同時線形；未解EI、EA、溫度、風振及中間支承相容。',9,GRAY)
 txt(.04,.046,'基準：CH02-P12-R5（版本14）正文2.3、附錄B與C.1。合併受力單元比較；正式車型維持U4-430。',9,GRAY)
 txt(.96,.046,'9600 × 5400 PNG',9,G,ha='right')
 save(fig,f'{sp["id"]}_{L}m_縱斷面與淨空模型_R1')

def overview():
 fig=plt.figure(figsize=(19.2,10.8),facecolor='white')
 def txt(x,y,t,size=10,color=INK,**kw):fig.text(x,y,t,fontsize=size,color=color,**kw)
 txt(.045,.938,'虎頭埤｜五跨縱斷面共同比較',28,G,fontweight='bold')
 txt(.045,.897,'T1—P2—T2—T3—P4—T4　／　全長1,947 m　／　既定端點與高程',14)
 txt(.955,.944,'全線總覽  /  R1',12,G,ha='right',fontweight='bold');txt(.955,.912,'2026.10.05　｜　待審核',10,GRAY,ha='right')
 ax=fig.add_axes([.066,.385,.89,.44]);ax.set_xlim(-25,1972);ax.set_ylim(35,92);ax.grid(True,color=LIGHT,lw=.6)
 for sp in m.SPANS:
  xs=np.linspace(0,sp['length_m'],601);vs=[m.values(sp,float(x)) for x in xs];ch=xs+sp['start']['CH_m']
  ax.axvspan(sp['start']['CH_m'],sp['end']['CH_m'],color=G,alpha=.025 if sp['index']%2 else .065)
  for key,col,ls,label in [('chord_el_m',GRAY,'--','端點弦線'),('actual_el_m',G,'-','固定車位軌道線'),('envelope_el_m',C,(0,(3,2)),'移動點載包絡')]:
   ax.plot(ch,[v[key] for v in vs],color=col,lw=1.6,ls=ls,label=label if sp['index']==1 else None)
  ax.text((sp['start']['CH_m']+sp['end']['CH_m'])/2,88.3,f'{sp["title"]}｜{sp["length_m"]} m',ha='center',fontsize=11,color=G,fontweight='bold')
  for c in m.control_results(sp):
   xx=c['global_CH_m'];ax.scatter([xx],[c['ground_el_m']],s=25,color=GRAY,marker='s');ax.plot([xx,xx],[c['ground_el_m'],c['control_el_m']],color=GRAY,ls=':',lw=1);ax.plot([xx-12,xx+12],[c['control_el_m']]*2,color=RED,lw=2)
   ax.annotate(f'{c["label"]}\nC={c["control_el_m"]:.0f}；M={c["margin_m"]:+.3f}',xy=(xx,c['control_el_m']),xytext=(xx+90,c['control_el_m']-8),color=RED,fontsize=10,arrowprops={'arrowstyle':'-','color':RED,'lw':.8})
 for nd in m.NODES:
  ax.scatter([nd['CH_m']],[nd['EL_m']],s=38,color=G,zorder=6)
  ha='right' if nd['name']=='T4' else 'left'
  ax.text(nd['CH_m']+(-10 if ha=='right' else 10),nd['EL_m']+1.8,f'{nd["name"]}\nEL.{nd["EL_m"]:.2f}',fontsize=10,color=G,ha=ha,fontweight='bold')
 ax.set_xticks([n['CH_m'] for n in m.NODES]);ax.tick_params(colors=GRAY);ax.set_xlabel('全線水平里程 CH（m）',labelpad=10);ax.set_ylabel('高程 EL.（m）',labelpad=9)
 for spine in ax.spines.values():spine.set_color(LIGHT)
 ax.legend(loc='upper left',bbox_to_anchor=(0,1.075),ncol=3,frameon=False,fontsize=10)
 txt(.066,.334,'H＝1,000 tf　｜　w＝0.296427… tf/m　｜　P＝5.88 tf　｜　d＝0',13,G,fontweight='bold')
 txt(.066,.3,'相同參數用於比較各跨幾何影響；第一跨固定車位x=70 m，其餘各跨取跨中。非各跨採用設計值。',10,GRAY)
 rows=[['跨段','跨距（m）','CH範圍','端點EL.（m）','弦線坡度','控制點餘裕（m）']]
 for sp in m.SPANS:
  su=m.summary(sp);cs=su['controls'];rows.append([sp['id'],str(sp['length_m']),f'{sp["start"]["CH_m"]}—{sp["end"]["CH_m"]}',f'{sp["start"]["EL_m"]:.2f} → {sp["end"]["EL_m"]:.2f}',f'{su["chord_grade_pct"]:+.3f}%',f'{cs[0]["margin_m"]:+.3f}（{cs[0]["label"]}）' if cs else '未輸入數值控制面'])
 tb=fig.add_axes([.05,.10,.91,.18]);tb.axis('off');t=tb.table(cellText=rows,cellLoc='center',colWidths=[.13,.13,.18,.2,.13,.23],loc='center');t.auto_set_font_size(False);t.set_fontsize(10);t.scale(1,1.5)
 for (r,c),cell in t.get_celld().items():
  cell.set_edgecolor(LIGHT);cell.set_linewidth(.5);cell.set_facecolor(G if r==0 else ('#F0F5F1' if r%2 else 'white'));cell.set_text_props(color='white' if r==0 else INK)
 txt(.05,.06,'僅列既有離散控制點；丘3為跨中位置示例。五跨分別求解，未解P2、P4兩側的變形相容與支承作用。',9,GRAY)
 txt(.05,.033,'來源：CH02-P12-R5 版本14。d=0未納入車體及額外包絡；包絡不是同時軌道線，不作全線安全判定。',9,GRAY)
 save(fig,'虎頭埤_五跨縱斷面總覽_R1')

if __name__=='__main__':
 m.build()
 # Retain the existing first-span calculation/drawing exactly.
 old=ROOT/'first_span_source'
 if not (ROOT/'T1-P2_446m_縱斷面與淨空模型_R1_9600x5400.png').exists():
  import subprocess,sys
  subprocess.run([sys.executable,str(old/'render.py')],check=True)
 for suffix in ['_9600x5400.png','.svg']:
  p=old/('T1-P2_446m_縱斷面與淨空模型_R1'+suffix)
  if p.exists():shutil.copy2(p,ROOT/p.name)
 for sp in m.SPANS[1:]:plate(sp)
 overview()
 (ROOT/'png_validation.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
