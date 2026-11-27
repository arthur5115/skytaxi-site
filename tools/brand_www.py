# 公司首頁 形象版 (deep) -> www/brand/index.html
from brand_lib import *

def build():
    I = Imgs(ROOT + '/www/brand/img'); A = lambda n: I(PA + n + '.webp')
    PARK = 'https://park.skytaxi.com.tw'
    S = []
    S.append(f'''<section class="sec" id="idea"><div class="wrap">
{head('PHILOSOPHY', '讓交通走在樹梢之上，<br>把土地留給湖光山色', '低碳、低擾動的立體交通。')}
{about_row([(A('route-lake-view'), '纜車跨越湖面示意', '跨湖段　規劃示意'), (A('t1-skywalk'), '天空步道示意', '新化之門　天空步道'), (A('route-forest-view'), '林地段示意', '林地段　規劃示意')])}
{subh('交通，也可以是風景的一部分', 'OUR IDEA')}
{prose(['雲天新能源科技以弦軌運輸系統發展立體交通。車廂懸在上方弦軌之下，跨越湖面與丘陵，地面只需少量墩柱。',
        '少開一條路，少砍一片林，讓湖岸與林地維持原本的樣子；旅客則在樹梢的高度，看見一座城市從未被看見的角度。',
        '我們把車站、旅宿與在地商業一起設計，讓交通節點成為停留、住宿與消費的目的地，再以民間參與公共建設的方式，承擔興建與長期營運。'])}
</div></section>''')

    S.append(f'''<section class="sec alt" id="tech"><div class="wrap">
{head('TECHNOLOGY', '弦軌立體交通', '車頂走行，座艙懸於軌下。')}
{poem(A('u4-430-guideway'), '上方弦軌與車頂走行示意', '懸在軌道之下', ['電力驅動的弦軌車輛，', '車頂走行裝置沿上方雙軌行走，', '白色封閉車體懸在軌道之下，', '深色連續窗帶，', '讓乘客在跨站途中，', '看湖岸、山城與林地。', '墩柱之間跨距長，', '地面留給原本的風景。'])}
{facts([('uSky Unicar', 'U4‑430 電動弦軌車輛'), ('單車 6 席', '封閉式座艙與側窗'), ('上方雙軌', '車頂整合走行裝置'), ('隨需發車', '日間依班表，夜間依需求派車')])}
{subh('車輛與試驗線', 'THE VEHICLE')}
{gallery([(A('unicar-cabin-passengers'), '座艙內乘客示意', '座艙與乘客', '規劃示意', True), (A('u4-430-expo'), 'U4-430 實車展示', 'U4‑430 實車', '2024 雅加達 ITS 亞太論壇展示車'), (A('u4-430-cabin-door'), '座艙車門', '座艙車門'),
          (A('u4-430-srti-windows'), '座艙側窗', '座艙側窗', 'SRTI Park 展示，2022｜影像來源 uSky Transport'), (A('u4-430-test-track'), '試驗線', '試驗線上的車軌關係', 'EcoTechnoPark 試驗線，2018｜SkyWay，CC BY 3.0')])}
{subh('低擾動的做法', 'LOW IMPACT', right=True)}
{lst([('少量墩柱', '以預力弦軌跨越湖面與丘陵，地面只需少量墩柱，降低對林地與水域的擾動。', None),
      ('既有路徑', '森林端的步行活動，沿核准使用且當日開放的既有林徑安排。', None),
      ('雙向直通', '全線雙向直通，中途站可原車續乘，減少轉乘與地面接駁。', None),
      ('隨需調度', '日間依班表行車，依平假日、活動散場與各方向候車量調整；夜間規劃以需求派車，配合分線維護。', None)])}
</div></section>''')

    S.append(f'''<section class="sec" id="work"><div class="wrap">
{head('WHAT WE DO', '從規劃、興建到營運', '以民間參與公共建設，把立體交通帶進風景區與城市節點。')}
{trio([(A('route-aerial-hutoupi'), '全線鳥瞰示意', '弦軌立體交通', 'LOW-IMPACT TRANSIT', '以預力弦軌架設輕量化車廂，跨越湖面與丘陵，地面只需少量墩柱。'),
       (A('t2-station-concept'), '湖濱旅館站示意', '站旅共構開發', 'STATION ＋ STAY', '車站與旅館、商業設施整合設計，讓交通節點同時成為停留、住宿與消費的目的地。'),
       (A('t4-station-forest'), '新化林場站示意', '促參長期營運', 'BUILD · OPERATE · TRANSFER', '依《促進民間參與公共建設法》推動興建、營運、移轉，以長期營運服務地方與遊客。')])}
{subh('一個案子的四個階段', 'HOW WE WORK')}
{lst([('規劃', '路線、站位與站體配置；結合地方食材、景點與住宿需求，整理可營運的服務內容。', None),
      ('興建', '弦軌、墩柱與四站站體分段施作，站體與旅宿共構。', None),
      ('營運', '纜車調度、站務、票務與旅客資訊由營運方統一發布；各站服務與旅宿依時段經營。', None),
      ('移轉', '依促參契約於營運期滿後移轉。', None)])}
</div></section>''')

    S.append(band(A('route-aerial-hutoupi'), '虎頭埤全線鳥瞰示意', '四站一線', 'FOUR STATIONS · ONE LINE'))

    S.append(f'''<section class="sec" id="hutoupi"><div class="wrap">
{head('FLAGSHIP PROJECT', '臺南虎頭埤纜車', '串連新化老街、湖濱與新化林場，一日可遊，也可留宿。')}
{prose(['以虎頭埤風景區為核心，四站全線以弦軌系統連通，搭配湖濱旅館與山城旅宿，形成一條湖山旅遊廊帶。', '旅客從新化之門出發，在湖岸用餐、住宿，到山城上課與聚會，最後走進新化林場的林間。'])}
{facts([('1,947 公尺', '全線長度'), ('4 站', '站旅共構'), ('184 房', 'T2 湖濱旅館 64 房、T3 湖濱山城 120 房'), ('BOT', '民間參與興建營運')])}
{feat(f'{T("T1")}　虎頭埤站｜新化之門', '光舟與階梯商店街', ['旅程的入口。光舟月台經空中通廊銜接階梯商店街上層，出閘即入街；光舟下方的虎埤水鏡保留地面公共穿越。', '健康生活市集、風土餐桌、共享廚房，以及由道路側獨立進入的長壽診所與醫事專業服務。'], A('t1-gate-aerial'), '新化之門站鳥瞰示意', ('看 T1 新化之門', PARK + '/stations/t1/'))}
{feat(f'{T("T2")}　湖濱旅館站', '退台向湖的旅居', ['車站與旅館共構，北側乘降，南側面湖。客房逐層退台，湖側有住客池庭。', '疊岸露台、藝術茶庭、閱讀庭與文史湖廊，日間旅客也能安排停留。'], A('t2-station-concept'), '湖濱旅館站示意', ('看 T2 湖濱旅館', PARK + '/stations/t2/'), rev=True)}
{feat(f'{T("T3")}　湖濱山城站', '站廳即是山城大廳', ['活力學院、可分隔研習廳、山城共食與 120 房山城旅館，在同一站。', '站廳館 3 樓規劃約 1,000 平方公尺的「虎埤傳說」室內 XR 樂園。'], A('t3-station-concept'), '湖濱山城站示意', ('看 T3 湖濱山城', PARK + '/stations/t3/'))}
{feat(f'{T("T4")}　新化林場站', '走進林冠', ['全線的森林端。站區報到、分團後，跟著導覽員沿既有林徑慢行與自然觀察。', '周邊為國立中興大學新化林場，有桃花心木林相與生態教學資源。'], A('t4-station-concept'), '新化林場站示意', ('看 T4 新化林場', PARK + '/stations/t4/'), rev=True)}
</div></section>''')

    S.append(f'''<section class="sec alt" id="park"><div class="wrap">
{head('HUTOUPI HEALTHSPAN', '虎頭埤長壽生活園區', '纜車沿線的健康旅居：訓練、恢復與營養。')}
{poem(A('visit-lakeside-movement'), '湖岸舒展示意', '練習健康的日常', ['用新化食材練習配餐，', '到山城練肌力與平衡，', '回到湖岸舒展與休息。', '把訓練、恢復與營養，', '排進同一趟旅程，', '帶回適合自己的', '日常練習。'], rev=True)}
{subh('四站，六大生態', 'ECOSYSTEM')}
{tiles([(PARK + '/ecosystems/wellness-centre/', A('ecosystem-wellness'), '健康中心示意', f'{T("T3")}・{T("T2")}', '健康中心', '活力學院的肌力與平衡訓練，課後湖岸舒展與休息。'),
        (PARK + '/ecosystems/healthy-dining/', A('ecosystem-dining'), '健康餐飲示意', f'{T("T1")}・{T("T2")}・{T("T3")}', '健康餐飲', '共享廚房、湖岸餐桌與山城共食。'),
        (PARK + '/ecosystems/longevity-clinic/', A('ecosystem-clinic'), '長壽診所示意', T('T1'), '長壽診所', '預防門診、健康檢查與追蹤。'),
        (PARK + '/ecosystems/medical-allied/', A('ecosystem-medical'), '醫事專業示意', T('T1'), '醫療與醫事專業', '門診、復健、物理治療與個別營養。'),
        (PARK + '/ecosystems/beauty-care/', A('ecosystem-beauty'), '保養示意', T('T2'), '美容與身體保養', '非侵入式日常保養與放鬆。'),
        (PARK + '/ecosystems/curated-retail/', A('ecosystem-retail'), '精選零售示意', f'{T("T1")}・{T("T2")}', '精選零售', '新化在地食材與生活用品。')])}
<p style="margin-top:50px"><a class="more" href="{PARK}/brand/">進入長壽生活園區</a></p>
</div></section>''')

    S.append(f'''<section class="sec" id="showcase"><div class="wrap">
{head('INTERACTIVE', '互動展示', '動態模擬、BIM 模型與圖冊，都能在瀏覽器裡直接操作。')}
{tiles([('../sim/3d/', A('route-mountain-view'), '山城段示意', '3D 模擬', '營運動態模擬', '在三維地形中觀看全線車廂的隨需發車與運行。'),
        ('../sim/how/', A('t3-station-span-3-4'), '弦軌側視示意', '原理說明', '纜車如何運行', '以側立面動態圖解，說明車廂進出站與往返方式。'),
        ('../sim/classic/', A('route-aerial-hutoupi'), '全線鳥瞰示意', '平面模擬', '全天候隨需發車', '以路線圖呈現 24 小時的發車節奏與載客情形。'),
        ('https://review.skytaxi.com.tw/bim/', A('t3-station-concept'), '湖濱山城站示意', 'BIM 模型', '四站 BIM 互動檢視', 'T1 至 T4 四站 IFC4 模型，可旋轉檢視並查詢構件屬性。'),
        ('https://review.skytaxi.com.tw/atlas/planning/', A('t1-market-plaza'), '市集廣場示意', '圖冊', '整體規劃與配置圖冊', '112 張規劃圖逐張翻閱、放大，並可下載分冊 PDF。'),
        ('https://review.skytaxi.com.tw/', A('t2-public-lobby'), '公共站廳示意', '全部資料', '審查資料區', '全案互動模型、圖說圖冊、舊版與原始檔。')])}
</div></section>''')

    S.append(f'''<section class="sec alt" id="company"><div class="wrap">
{head('COMPANY', '公司資訊')}
<div class="acc">
  <div><p class="addr">雲天新能源科技股份有限公司</p><p class="note" style="font-size:14.5px;margin:0">臺南虎頭埤纜車 BOT 案民間申請人，專注於綠色立體交通系統的規劃、興建與營運。</p>{img(A('hero'), '虎頭埤晨光示意')}</div>
  <dl>
    <dt>公司名稱</dt><dd>雲天新能源科技股份有限公司</dd>
    <dt>英文名稱</dt><dd>Sky Skytaxi New Energy Company Limited</dd>
    <dt>統一編號</dt><dd>24983781</dd>
    <dt>設立日期</dt><dd>民國 104 年 5 月 25 日</dd>
    <dt>公司地址</dt><dd>814 高雄市仁武區仁勇東巷 80 號</dd>
  </dl>
</div>
</div></section>''')

    foot = f'''<div><h4>雲天新能源科技股份有限公司</h4><p>讓交通走在樹梢之上，把土地留給湖光山色。</p><p style="margin-top:12px">814 高雄市仁武區仁勇東巷 80 號</p></div>
<div><h4>虎頭埤纜車</h4><ul><li><a href="../hutoupi/">纜車網站</a></li><li><a href="https://review.skytaxi.com.tw/m/04/brand/">搭乘與遊園</a></li><li><a href="{PARK}/brand/">長壽生活園區</a></li></ul></div>
<div><h4>互動展示</h4><ul><li><a href="../sim/3d/">營運動態模擬</a></li><li><a href="../sim/how/">纜車如何運行</a></li><li><a href="https://review.skytaxi.com.tw/bim/">四站 BIM</a></li></ul></div>
<div><h4>資料</h4><ul><li><a href="https://review.skytaxi.com.tw/">審查資料區</a></li><li><a href="https://review.skytaxi.com.tw/atlas/planning/">規劃配置圖冊</a></li><li><a href="../">切換資料版</a></li></ul></div>'''
    cfg = dict(title='雲天新能源科技｜Skytaxi　形象版', brand='Skytaxi 雲天新能源', brand_sub='GREEN SKYWAY TRANSIT', data_href='../', side=('#hutoupi', '探索四站'),
               menu=[('idea', '理念'), ('tech', '弦軌技術'), ('work', '我們做的事'), ('hutoupi', '虎頭埤纜車'), ('park', '長壽生活園區'), ('showcase', '互動展示'), ('company', '公司資訊')],
               menu_note='雲天新能源科技股份有限公司<br>814 高雄市仁武區仁勇東巷 80 號',
               hero=dict(img=A('hero'), alt='虎頭埤晨光湖景示意', kicker='SKYTAXI', h1='讓交通<br>走在樹梢之上', sub='把土地留給湖光山色'),
               body='\n'.join(S), foot=foot, copy='© 2026 雲天新能源科技股份有限公司', disclaimer='圖片為規劃示意，實際以核定設計為準。')
    open(ROOT + '/www/brand/index.html', 'w', encoding='utf-8').write(page(cfg))
    return I.flush()

if __name__ == '__main__':
    print('www', build())
