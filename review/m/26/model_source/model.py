"""T1–P2 prescribed-horizontal-tension comparison model; units m and tf.
This is NOT a thermal/nonlinear two-span cable or beam solution.
Run: python model.py (writes baseline.json, profile.csv, validation.json).
"""
import csv
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent
L, ZA, ZB = 446.0, 52.60, 63.10
X_CHECK, CONTROL = 70.0, 50.0
H_REF, P_REF = 1000.0, 5.88
def chord(x):
    return ZA + (ZB-ZA)*x/L
W_REF = ((chord(X_CHECK)-CONTROL)*H_REF - P_REF*X_CHECK*(L-X_CHECK)/L)*2/(X_CHECK*(L-X_CHECK))

BASE = {
    'drawing_id':'T1-P2-LP-01', 'version':'R1', 'date':'2026-10-05',
    'title':'T1—P2第一跨446 m縱斷面與淨空模型',
    'length_m':L, 'zA_m':ZA, 'zB_m':ZB,
    'nodes':[{'name':'T1','chainage_m':0,'track_center_el_m':52.6,'type':'錨碇端'},
             {'name':'P2／丘2','chainage_m':446,'track_center_el_m':63.1,'type':'中間支承'},
             {'name':'T2','chainage_m':796,'track_center_el_m':67.6,'type':'錨碇介面'}],
    'scenario':{'H_tf':H_REF,'w_tf_m':W_REF,'P_tf':P_REF,'a_m':70,'d_m':0,
                'scope':'附錄C合併受力單元比較；非每軌採用荷載',
                'type':'條件式邊界算例；非本案選定張力或自重'},
    'ground_points':[{'chainage_m':0,'ground_el_m':37.0,'source':'正文T1約值；站內不套用地形加10 m'},
                     {'chainage_m':70,'ground_el_m':40.0,'source':'附錄C丘1算例地形'}],
    'controls':[{'chainage_m':70,'ground_el_m':40,'control_el_m':50,'source':'附錄C丘1算例：地形加10 m'}],
    'vehicle':{'type':'U4-430','max_mass_kg':2940,'payload_kg':450,'nominal_persons':6},
    'source':{'name':'CH02-P12-R5_第二章土地使用與興建計畫統一修訂版.docx',
              'version':'14','modified':'2026-09-15',
              'library_file_id':'libfile_085ff18cfdd08191843aa875cb168955',
              'file_id':'file_0000000008ac81f5a2a9d5441c85a1fc',
              'sections':['2.3：第一區段與446公尺飛越丘1','附錄B：第一跨丘1控制面','附錄C.1：表2-C-1、表2-C-2']},
    'limits':['固定水平張力的理想柔索拋物線近似；未計EA、EI、滑鞍非線性及支承位移',
              '移動點載包絡由不同車位取極值，不是同一瞬間的實際軌道線',
              'd是軌道中心向下至控制外廓的額外扣減量；0表示未納入，不是車體高度為0',
              '只對已輸入控制點計算餘裕；沒有連續地形資料的里程不填淨空',
              'P2連接350 m第二跨；本模型展示連接關係，未求解兩跨兼容平衡',
              '參數變動為敏感度比較，不以H變動替代溫度、動力或安全驗證']
}

def validate_params(H,w,P,a,d):
    vals=(H,w,P,a,d)
    if not all(math.isfinite(v) for v in vals): raise ValueError('參數須為有限數值')
    if H<=0 or w<0 or P<0 or d<0 or not 0<=a<=L: raise ValueError('H>0；w、P、d≥0；0≤a≤446')

def values(x,H=H_REF,w=W_REF,P=P_REF,a=70,d=0):
    validate_params(H,w,P,a,d)
    if not 0<=x<=L: raise ValueError('里程超出第一跨')
    fq=w*x*(L-x)/(2*H)
    fp=P*min(x,a)*(L-max(x,a))/(H*L)
    envp=P*x*(L-x)/(H*L)
    return {'chainage_m':x,'chord_el_m':chord(x),'uniform_sag_m':fq,
            'point_sag_at_a_m':fp,'loaded_track_center_el_m':chord(x)-fq-fp,
            'moving_load_envelope_el_m':chord(x)-fq-envp,
            'envelope_minus_d_el_m':chord(x)-fq-envp-d}

def actual_min(H,w,P,a):
    candidates=[0,L,a]
    slope=(ZB-ZA)/L
    if w>0:
        left=(w*L/2+P*(L-a)/L-H*slope)/w
        right=(w*L/2-P*a/L-H*slope)/w
        if 0<=left<=a:candidates.append(left)
        if a<=right<=L:candidates.append(right)
    p=min((values(x,H,w,P,a) for x in candidates), key=lambda q:q['loaded_track_center_el_m'])
    return p['chainage_m'],p['loaded_track_center_el_m']

def summary(H=H_REF,w=W_REF,P=P_REF,a=70,d=0):
    validate_params(H,w,P,a,d)
    k=w/(2*H)+P/(H*L)
    xmin=max(0,min(L,(L-(ZB-ZA)/L/k)/2)) if k else 0
    local=values(70,H,w,P,a,d)
    amx,amz=actual_min(H,w,P,a)
    return {'chord_grade_pct':100*(ZB-ZA)/L,'local_chord_el_m':chord(70),
            'local_envelope_el_m':local['moving_load_envelope_el_m'],
            'local_margin_after_d_m':local['envelope_minus_d_el_m']-CONTROL,
            'actual_at_a_local_margin_m':local['loaded_track_center_el_m']-d-CONTROL,
            'envelope_mid_sag_m':k*L*L/4,
            'envelope_mid_el_m':values(L/2,H,w,P,a,d)['moving_load_envelope_el_m'],
            'envelope_lowest_x_m':xmin,'envelope_lowest_el_m':values(xmin,H,w,P,a,d)['moving_load_envelope_el_m'],
            'actual_lowest_x_m':amx,'actual_lowest_el_m':amz}

def export_profile(path,H=H_REF,w=W_REF,P=P_REF,a=70,d=0,controls=None):
    controls=BASE['controls'] if controls is None else controls
    lookup={p['chainage_m']:p for p in controls}
    xs=sorted(set([float(x) for x in range(447)]+[p['chainage_m'] for p in controls]+[a]))
    rows=[]
    for x in xs:
        r=values(x,H,w,P,a,d)
        c=lookup.get(x)
        r.update({'ground_el_m':c['ground_el_m'] if c else '',
                  'control_el_m':c['control_el_m'] if c else '',
                  'margin_after_d_m':r['envelope_minus_d_el_m']-c['control_el_m'] if c else '',
                  'H_tf':H,'w_tf_m':w,'P_tf':P,'a_m':a,'d_m':d,
                  'status':'conditional_appendix_C_comparison_not_design_release'})
        rows.append(r)
    with open(path,'w',encoding='utf-8-sig',newline='') as f:
        out=csv.DictWriter(f,fieldnames=rows[0].keys());out.writeheader();out.writerows(rows)
    return rows

def verify():
    tests={}
    tests['endpoint_A']=abs(values(0)['loaded_track_center_el_m']-ZA)<1e-12
    tests['endpoint_B']=abs(values(L)['loaded_track_center_el_m']-ZB)<1e-12
    tests['appendix_C_local_boundary']=abs(summary()['local_margin_after_d_m'])<1e-10
    tests['point_load_at_inspection']=abs(values(70)['point_sag_at_a_m']-P_REF*70*(L-70)/(H_REF*L))<1e-12
    tests['midpoint_point_load']=abs(values(L/2,a=L/2)['point_sag_at_a_m']-P_REF*L/(4*H_REF))<1e-12
    tests['d_reduces_margin']=abs(summary(d=1)['local_margin_after_d_m']+1)<1e-10
    tests['envelope_below_each_actual_shape']=all(values(x,a=a)['moving_load_envelope_el_m']<=values(x,a=a)['loaded_track_center_el_m']+1e-10 for x in range(0,447,7) for a in [0,70,150,223,400,446])
    tests['H_doubling_halves_sag']=abs(values(223,H=2000)['uniform_sag_m']*2-values(223)['uniform_sag_m'])<1e-12
    tests['zero_load_returns_chord']=abs(values(100,w=0,P=0)['loaded_track_center_el_m']-chord(100))<1e-12
    assert all(tests.values()),tests
    return {'passed':True,'checks':tests,'baseline_summary':summary()}

if __name__=='__main__':
    (ROOT/'baseline.json').write_text(json.dumps(BASE,ensure_ascii=False,indent=2),encoding='utf-8')
    export_profile(ROOT/'profile.csv')
    (ROOT/'validation.json').write_text(json.dumps(verify(),ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps(summary(),ensure_ascii=False,indent=2))
