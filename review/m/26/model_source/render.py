"""Render an exact 9600x5400 engineering plate from model.py."""
from pathlib import Path
import os
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
import numpy as np
import model as m

ROOT=Path(__file__).resolve().parent
for p in (ROOT/'assets').glob('*.otf'): fm.fontManager.addfont(str(p))
plt.rcParams.update({'font.family':'Noto Sans CJK TC','axes.unicode_minus':False,'svg.fonttype':'none','font.size':10})
G='#174E42'; C='#A46842'; BLUE='#356885'; GRAY='#6B7777'; LIGHT='#DCE4DF'; INK='#203431'; RED='#B24538'
fig=plt.figure(figsize=(19.2,10.8),facecolor='white')
def txt(x,y,t,size=10,color=INK,weight='normal',**kw):return fig.text(x,y,t,fontsize=size,color=color,fontweight=weight,**kw)
txt(.04,.943,'T1—P2 第一跨 446 m',26,G,'bold')
txt(.04,.907,'縱斷面與淨空模型｜既定幾何 × 附錄C條件式比較',13)
txt(.96,.948,'T1-P2-LP-01  /  R1',12,G,'bold',ha='right')
txt(.96,.918,'2026.10.05　｜　16:9　｜　單位：m、tf',10,GRAY,ha='right')

# Relationship strip: chainage diagram, explicitly not a map or second-span solution.
strip=fig.add_axes([.065,.808,.65,.064]);strip.set_xlim(-15,815);strip.set_ylim(-1,1);strip.axis('off')
strip.plot([0,446],[0,0],color=G,lw=3);strip.plot([446,796],[0,0],color=GRAY,lw=1.5,ls='--')
for x,n,z in [(0,'T1 錨碇端','52.60'),(446,'P2 中間支承','63.10'),(796,'T2 錨碇介面','67.60')]:
    strip.plot(x,0,'o',color=G,ms=6)
    strip.text(x,.37,n,ha='center',fontsize=10,color=G)
    strip.text(x,-.75,f'CH {x:03d}｜EL.{z}',ha='center',fontsize=9,color=GRAY)
strip.text(223,.08,'本圖計算範圍 446 m',ha='center',va='bottom',fontsize=9,color=G)
strip.text(621,.08,'銜接第二跨 350 m',ha='center',va='bottom',fontsize=9,color=GRAY)
txt(.765,.853,'第一運行區段：T1—P2—T2',11,G,'bold')
txt(.765,.823,'支承連接關係示意；P2兩跨兼容另建模型',9,GRAY)

ax=fig.add_axes([.068,.357,.655,.425]);x=np.linspace(0,m.L,1601)
data=[m.values(float(t)) for t in x]
zc=np.array([d['chord_el_m'] for d in data]);zu=zc-np.array([d['uniform_sag_m'] for d in data])
za=np.array([d['loaded_track_center_el_m'] for d in data]);ze=np.array([d['moving_load_envelope_el_m'] for d in data])
ax.set_xlim(-10,456);ax.set_ylim(35,68)
ax.set_xticks([0,50,70,100,150,200,223,250,300,350,400,446]);ax.set_yticks(np.arange(35,70,5))
ax.tick_params(axis='both',labelsize=9,colors=GRAY);ax.grid(True,color=LIGHT,lw=.55)
for spine in ax.spines.values():spine.set_color(LIGHT)
ax.set_xlabel('自T1起算水平里程 x（m）',fontsize=10,color=INK,labelpad=10)
ax.set_ylabel('軌道中心／控制點高程 EL.（m）',fontsize=10,color=INK,labelpad=8)
ax.plot(x,zc,color=GRAY,ls=(0,(6,3)),lw=1.1,label='端點弦線')
ax.plot(x,zu,color=BLUE,lw=1.4,label='僅均布荷載')
ax.plot(x,za,color=G,lw=1.8,label='點載位於CH70')
ax.plot(x,ze,color=C,lw=2,ls=(0,(3,2)),label='移動點載下緣包絡')
ax.fill_between(x,za,ze,color=C,alpha=.075)
ax.scatter([0,446],[52.6,63.1],s=36,color=G,zorder=6)
ax.text(7,55.0,'T1｜EL.52.60',fontsize=10,color=G,fontweight='bold')
ax.text(440,64.3,'P2｜EL.63.10',fontsize=10,color=G,fontweight='bold',ha='right')
ax.plot([0,0],[37,52.6],color=GRAY,lw=.9)
ax.scatter([0,70],[37,40],marker='s',s=25,color=GRAY,zorder=5)
ax.text(5,36.8,'T1地面約37.00',fontsize=8,color=GRAY)
ax.text(78,39.4,'丘1算例地形40.00',fontsize=9,color=GRAY)
ax.plot([60,80],[50,50],color=RED,lw=2)
ax.plot([70,70],[40,50],color=GRAY,lw=1,ls=':')
ax.text(77,44.1,'規劃控制 +10.00',fontsize=9,color=GRAY)
ax.plot([70,70],[50,m.chord(70)],color=C,lw=.9)
ax.annotate('丘1 CH70｜控制面50.00\n弦線54.248；包絡50.000',xy=(70,50),xytext=(113,58.5),fontsize=10,color=INK,
            arrowprops={'arrowstyle':'-','color':C,'lw':.9},bbox={'facecolor':'white','edgecolor':'none','pad':3})
ax.annotate('P＝5.88 tf 等效點載',xy=(70,m.values(70)['loaded_track_center_el_m']),xytext=(70,62.4),ha='center',fontsize=9,color=G,
            arrowprops={'arrowstyle':'-|>','color':G,'lw':1.2})
s=m.summary();xe=s['envelope_lowest_x_m'];ye=s['envelope_lowest_el_m']
ax.scatter([xe],[ye],s=30,color=C,zorder=5)
ax.annotate(f'包絡最低點\nCH {xe:.2f}｜EL.{ye:.2f}',xy=(xe,ye),xytext=(192,41.9),fontsize=10,color=C,
            arrowprops={'arrowstyle':'-','color':C,'lw':.9})
ax.text(270,37.1,'地形僅列既有離散點，未連成實測地形線',fontsize=9,color=GRAY,ha='center')
ax.legend(loc='upper left',bbox_to_anchor=(0,1.075),ncol=4,frameon=False,fontsize=9,handlelength=2,columnspacing=1.5)
txt(.72,.326,'縱向比例放大約5.2倍；圖上長度請依標註讀取',8.5,GRAY,ha='right')

# Right notes: meaningful engineering information, no certification badge.
txt(.762,.757,'01　鎖定幾何',13,G,'bold')
for y,t in zip([.726,.699,.672],['L＝446.00　｜　ΔEL＝＋10.50','弦線平均坡度＝＋2.354%','丘1飛越；P2為中間支承']):txt(.762,y,t,10.5)
txt(.762,.626,'02　附錄C比較工況',13,G,'bold')
for y,t in zip([.595,.568,.541,.514],['H＝1,000 tf　｜　P＝5.88 tf','w＝0.296427… tf/m','點載位置 a＝70 m；額外扣減 d＝0','P、w、H均屬同一合併受力單元']):txt(.762,y,t,10)
txt(.762,.47,'03　丘1控制結果',13,G,'bold')
txt(.762,.43,'剩餘餘裕  0.000 m',18,RED,'bold')
txt(.762,.397,'邊界算例；d＞0時，餘裕即為負值。',10,RED)
txt(.762,.369,'d＝0表示尚未納入車體及額外包絡。',9,GRAY)
txt(.762,.342,'本圖不作全跨安全或施工放行判定。',9,GRAY)

# Aligned numerical register, derived from same calculation engine.
tbl=fig.add_axes([.04,.117,.92,.164]);tbl.axis('off')
points=[0,50,70,100,150,200,223,250,300,350,400,446]
rows=[['里程 x']+[str(v) for v in points],
      ['弦線高程']+[f'{m.chord(v):.2f}' for v in points],
      ['CH70點載軌道線']+[f'{m.values(v)["loaded_track_center_el_m"]:.2f}' for v in points],
      ['移動點載包絡']+[f'{m.values(v)["moving_load_envelope_el_m"]:.2f}' for v in points],
      ['控制面／餘裕']+['50.00／0.00' if v==70 else '—' for v in points]]
t=tbl.table(cellText=rows,cellLoc='center',loc='center',colWidths=[.145]+[.855/12]*12)
t.auto_set_font_size(False);t.set_fontsize(9);t.scale(1,1.46)
for (r,c),cell in t.get_celld().items():
    cell.set_edgecolor(LIGHT);cell.set_linewidth(.55)
    if r==0:cell.set_facecolor(G);cell.set_text_props(color='white',weight='bold')
    elif c==0:cell.set_facecolor('#F0F5F1');cell.set_text_props(color=G)
    elif c==3:cell.set_facecolor('#FBF1E9');cell.set_text_props(color=INK)
    else:cell.set_text_props(color=INK)
txt(.04,.302,'逐點高程登錄',12,G,'bold')
txt(.96,.302,'「—」表示該里程未輸入控制面，沒有計算淨空結論',9,GRAY,ha='right')
txt(.04,.072,'計算：固定H之理想柔索近似。包絡來自不同車位，並非同時線形；未解溫度、風振、EI、EA及P2滑鞍兼容。',9,GRAY)
txt(.04,.046,'基準：CH02-P12-R5（版本14）正文2.3、附錄B與C.1。H及w為條件式比較輸入；車型維持U4-430。',9,GRAY)
txt(.96,.046,'9600 × 5400 PNG',9,G,ha='right')
target=ROOT/'T1-P2_446m_縱斷面與淨空模型_R1_9600x5400.png'
temporary=ROOT/'render-full.tmp.png'
checked=ROOT/'render-checked.tmp.png'
fig.savefig(temporary,dpi=500,facecolor='white',format='png')
with Image.open(temporary) as im:
    im.load()
    assert im.size == (9600,5400)
    im.convert('RGB').save(checked,format='PNG')
with Image.open(checked) as im:
    im.load()
    assert im.mode == 'RGB' and im.size == (9600,5400)
assert checked.read_bytes()[-12:] == b'\x00\x00\x00\x00IEND\xaeB`\x82'
os.replace(checked,target)
temporary.unlink()
fig.savefig(ROOT/'T1-P2_446m_縱斷面與淨空模型_R1.svg',facecolor='white')
fig.savefig(ROOT/'preview.png',dpi=100,facecolor='white')
print('Rendered PNG, SVG and preview')
