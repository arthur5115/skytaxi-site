# 纜車搭乘與遊園 形象版 (deep) -> review/m/04/brand/index.html
from brand_lib import *

def build():
    I = Imgs(ROOT + '/review/m/04/brand/img'); A = lambda n: I(PA + n + '.webp'); R = lambda n: I(RA + n + '.webp')
    S = []
    S.append(f'''<section class="sec" id="start"><div class="wrap">
{head('HUTOUPI CABLE CAR', '從新化之門出發，<br>沿湖穿過山城，一路走進森林', '從入口轉乘、湖畔住宿，到山城聚會與森林散步。')}
{about_row([(R('guide/t1-water-mirror'), '虎埤水鏡實景模擬', '新化之門　虎埤水鏡'), (R('guide/t2-public-lobby'), '湖濱旅館公共站廳實景模擬', '湖濱旅館　公共站廳'), (R('guide/t4-canopy'), '林冠實景模擬', '新化林場　林冠')])}
{prose(['虎頭埤纜車以四座車站串起老街、湖岸、山城與林場。每一站都有不同的玩法：在入口逛街、在湖邊住一晚、到山城團聚，或走進森林。',
        '纜車尚未開放搭乘。這一頁先把每一站可以做什麼、到站後怎麼走、適合怎麼安排，整理成開放後的行程構想；開放日期、票價與服務時間，以營運方正式公告為準。'])}
</div></section>''')

    S.append(f'''<section class="sec alt" id="ride"><div class="wrap">
{head('THE RIDE', '跨湖、過山城、入林', '一條線，四段風景。')}
{poem(A('route-lake-view'), '纜車跨越虎頭埤示意', '沿線的風景', ['從新化之門的光舟月台出發，', '先掠過虎頭埤的水面，', '停靠湖濱旅館，', '再爬升到湖濱山城，', '最後穿過林地，', '抵達新化林場。', '途中停靠的兩站，', '可以下車，', '也可以留在車上。'])}
{subh('四段風景', 'ALONG THE LINE')}
{gallery([(A('route-lake-view'), '跨湖段示意', '跨湖段', '', True), (A('route-mountain-view'), '山城段示意', '山城段'), (A('route-forest-view'), '林地段示意', '林地段'),
          (A('unicar-cabin-passengers'), '座艙示意', '座艙'), (A('t3-station-span-3-4'), '弦軌側視示意', '弦軌銜接山城站')])}
</div></section>''')

    G = {
      't1': dict(code='T1', name='新化之門站', sub='主要入口與轉乘站', main=R('t1-render-1123'),
        lead='把新化老街、在地展售與纜車行程接在一起。沒有要搭車，也可以把迎賓廣場與商店街當作停留點；從地面到空中通廊，門戶站本身就值得留一段時間。',
        exp=[('迎賓廣場', '在地面安排集合、等候同行者或拍照；不必為了逛廣場而搭車。'), ('階梯商店街', '沿南北兩段商店街看地方展售，再分段走回地面。攤商與營業時間以公告為準。'), ('虎埤水鏡', '站體下方的水鏡是看倒影的景點；遇活動時，廣場用途可能隨活動調整。')],
        pics=[(R('guide/t1-welcome-plaza'), '迎賓廣場實景模擬', '迎賓廣場'), (R('guide/t1-skywalk'), '空中通廊實景模擬', '空中通廊'), (R('guide/t1-experience'), '商店街實景模擬', '階梯商店街')],
        walk=[('進站搭車', '由地面迎賓廣場進入，先找旅客服務、票務及候乘指引，再往月台。'), ('下車逛街', '從月台出閘，經空中通廊接到階梯商店街，再步行至地面。'), ('只逛不搭', '由地面開始和返回，廣場是方便集合的起點，不需進入候乘區。')],
        trip=[('老街＋門戶散策', '先在新化老街逛街、用餐，再留時間看迎賓廣場、水鏡和地方展售。'), ('門戶＋森林親子行', '在新化之門集合，搭車往林場端，安排一段適合同行者腳程的散步。')],
        svc=[('集合與轉乘', '開放後留意旅客服務中心的候乘、停車和接駁資訊；勿把現有園區交通當成纜車接駁。'), ('長輩與嬰兒車', '出發前先確認無障礙入口、電梯及嬰兒車搭乘規則。'), ('活動日安排', '參加市集或團體活動，先確認集合點和廣場使用公告。')]),
      't2': dict(code='T2', name='湖濱旅館站', sub='在湖畔多留一晚', main=R('t2-render-1123'),
        lead='面湖旅宿與公共湖岸空間是兩種不同的玩法。不入住，可以安排湖岸散步；住宿另循住客動線。先分清楚公共體驗與住客設施，再決定是來看湖，還是住一晚。',
        exp=[('公共湖岸空間', '湖岸步道串起藝術茶庭與閱讀庭，適合不住宿的旅客短暫休息。'), ('站廳與湖景餐飲', '公共站廳、文史湖廊與湖側餐廳組成一段湖景停留；餐期另行公告。'), ('住客與婚禮', '旅館面向水庫；泳池、健身為住客設施。湖畔婚禮及團體服務待業者公布後洽詢。')],
        pics=[(R('guide/t2-arrival-court'), '到達庭實景模擬', '到達庭'), (R('guide/t2-public-lobby'), '公共站廳實景模擬', '公共站廳'), (R('guide/t2-experience'), '湖岸實景模擬', '湖岸空間')],
        walk=[('搭車入住', '由月台走室內連通路徑，依旅館指引進入住客通道。'), ('不住宿看湖', '由公共站廳往湖側空間和公共步道，不到客房或住客設施。'), ('自駕到訪', '由東側車道進入到達庭落客；停車名額未公布。')],
        trip=[('半日湖岸散步', '從公共站廳到湖廊與步道，挑一處庭園坐一坐，再視開放的餐飲安排停留。'), ('湖邊住一晚', '到站先入住，下午走湖邊，隔天再視腳程到山城或林場。')],
        svc=[('想住宿或辦婚禮', '待業者公布房型、入住與活動聯絡方式，再核對訂金、取消辦法及停車。'), ('要帶行李或輪椅', '開放前先確認站內電梯、月台到大廳的無障礙動線，以及大件行李上車規則。'), ('只想吃飯或散步', '公共步道與餐廳開放時間可能不同；確認是否接受非住客用餐、是否需訂位。')]),
      't3': dict(code='T3', name='湖濱山城站', sub='旅宿與聚會在同一站', main=R('t3-render-1123'),
        lead='適合家庭度假、山城聚餐、婚宴或會議。站廳通往公共餐飲和湖景平台，不住宿也有停留選擇；不同活動安排在不同區域，按同行者的目的選擇。',
        exp=[('餐飲與湖景平台', '不住宿也可從站廳安排公共餐飲及面湖平台，不需進入客房區。'), ('親子與雨天', '規劃室內 XR 體驗及戶外遊戲區；遇雨可優先考慮室內活動。'), ('婚宴與會議', '婚禮堂、宴會與會議空間可依活動分開使用；容量與費用待業者公告。')],
        pics=[(R('guide/t3-lakeside-outlook'), '湖景平台實景模擬', '湖景平台'), (R('guide/t3-experience'), '山城實景模擬', '山城'), (A('t3-xr-flying-theater'), '飛行劇場規劃示意', '室內 XR 飛行劇場')],
        walk=[('搭車入住', '由月台經轉乘大廳，依旅館指引前往客房翼。'), ('只用餐或看湖', '從站廳往公共餐飲或湖景平台，不用經過客房。'), ('參加婚宴會議', '自駕或接送來賓由前庭落客，依活動通知走獨立動線進入宴會區。')],
        trip=[('家庭度假', '先留用餐時間。好天氣安排面湖平台或戶外遊戲；下雨先查室內體驗。'), ('婚宴或會議來賓', '先確認宴會集合點，再安排住宿、接送與散場，不與散客候車時間重疊。')],
        svc=[('活動主辦人', '核對場地進出、落客與大客車安排、無障礙席位、雨天替代空間與撤場方式。'), ('家庭與親子', '確認室內體驗的預約、適用年齡與陪同規則。'), ('住宿和餐飲', '確認入住、團體用餐、行李及特殊飲食需求。')]),
      't4': dict(code='T4', name='新化林場站', sub='由纜車走進林間', main=R('t4-render-1123'),
        lead='全線的森林端。以林場驛站作起點，依腳程選擇觀景、自然解說或一段森林步行。這一站以自然觀察與慢行為主，不把它當作大型遊樂區。',
        exp=[('林場驛站', '候車、林場資訊、輕食和寄物；各項服務有不同的開放條件。'), ('林冠觀景', '由觀景平台看林相，透過展示認識林場生態與林業歷史。'), ('林間活動', '林間平台規劃展演與自然教育；森林療癒以體驗為主，不是醫療服務。')],
        pics=[(R('guide/t4-canopy'), '林冠實景模擬', '林冠平台'), (R('guide/t4-forest-waiting'), '森林候車實景模擬', '林間候車'), (R('guide/t4-experience'), '林間實景模擬', '林間步道')],
        walk=[('先在驛站集合', '看當天開放和步道指引，再決定同行者適合走多遠。'), ('林緣與植物園步道', '依標示走林緣段，體力允許再接植物園步道。'), ('循環線回站', '以驛站為返回點，保留候車時間；封閉或雨天依現場指示折返。')],
        trip=[('親子自然觀察', '從驛站走到可及的觀景點，沿途觀察樹冠和季節變化，再回驛站集合。'), ('步行加小團體體驗', '日後開放預約時，可搭配自然解說或小團體森林活動，另留回程候車時間。')],
        svc=[('開放與天候', '出發前查看步道開放、雨後路況和回程搭乘公告；林間穿止滑鞋。'), ('長輩與行動需求', '先核對坡度、地面與無障礙路段，不把景觀步道一概當作輪椅可通行。'), ('小團體與寄物', '森林體驗規劃採小團體預約；寄物、輕食與活動時間待正式公布。')]),
    }
    blocks = []
    for k in ['t1', 't2', 't3', 't4']:
        g = G[k]
        blocks.append(station(g['code'], g['name'], g['sub'], g['main'], g['name'] + '實景模擬', g['lead'], [(n, '', d) for n, d in g['exp']], g['pics']))
        blocks.append('<div class="st-body" style="margin-top:40px">'
                      + '<div>' + subh('到站後怎麼走', 'WALK').replace('class="subh"', 'class="subh" style="margin:0 0 20px;font-size:19px"') + lst([(n, d, None) for n, d in g['walk']]) + '</div>'
                      + '<div>' + subh('出發前確認', 'CHECK').replace('class="subh"', 'class="subh" style="margin:0 0 20px;font-size:19px"') + lst([(n, d, None) for n, d in g['svc']]) + '</div></div>')
    S.append(f'''<section class="sec" id="stations"><div class="wrap">
{head('FOUR STATIONS', '從哪一站開始', '選一站，看看有哪些體驗。')}
{''.join(blocks)}
</div></section>''')

    S.append(band(A('route-forest-view'), '新化林場林相示意', '走進森林', 'FOREST'))

    trips = []
    for k, imgs, tag in [('t1', [R('guide/t1-welcome-plaza'), R('guide/t1-experience')], '新化之門'), ('t2', [R('guide/t2-experience'), R('guide/t2-arrival-court')], '湖濱旅館'),
                         ('t3', [A('t3-outdoor-play'), A('visit-group-dining')], '湖濱山城'), ('t4', [A('visit-forest-nature'), A('visit-forest-walk')], '新化林場')]:
        for (n, d), img_ in zip(G[k]['trip'], imgs):
            trips.append((None, img_, n, f'{T(G[k]["code"])}　{tag}', n, d))
    S.append(f'''<section class="sec alt" id="trips"><div class="wrap">
{head('TRIPS', '想怎麼玩虎頭埤', '先按興趣挑選，以下是開放後的行程構想。')}
{tiles(trips).replace('class="tiles"', 'class="tiles c4"', 1)}
</div></section>''')

    S.append(f'''<section class="sec" id="visit"><div class="wrap">
{head('BEFORE YOU GO', '出發前先確認')}
{lst([('現在可以搭嗎', '還不行。開放日期、票價、售票方式與服務時間，以營運方正式公告為準。', None),
      ('從哪裡上車', '新化之門站是主要入口與轉乘站，搭乘動線、上下客位置及停車資訊於開放前另行公布。', None),
      ('無障礙與同行者', '開放後請先確認各站無障礙進出、上下車協助、輪椅或嬰兒車搭乘規則。', None),
      ('預約與訂房', '本站不接受預訂；開放資訊與服務內容，由各服務業者公告。', None),
      ('現在去虎頭埤', '門票、開園時間與園區交通，請以虎頭埤風景區官方資訊為準。', None)])}
{subh('也可以看看', 'MORE', right=True)}
{lst([('分站深度導覽', '資料版的四站導覽與沿線動畫。', '../#guide'), ('長壽生活園區', '纜車沿線的健康旅居：訓練、恢復與營養。', 'https://park.skytaxi.com.tw/brand/'), ('Skytaxi 雲天新能源', '虎頭埤纜車的興建與營運團隊。', 'https://www.skytaxi.com.tw/brand/')])}
</div></section>''')

    foot = '''<div><h4>虎頭埤纜車</h4><p>從新化之門出發，沿湖穿過山城，一路走進森林。</p><p style="margin-top:12px">纜車尚未開放搭乘。</p></div>
<div><h4>四站</h4><ul><li><a href="#stations">新化之門站</a></li><li><a href="#stations">湖濱旅館站</a></li><li><a href="#stations">湖濱山城站</a></li><li><a href="#stations">新化林場站</a></li></ul></div>
<div><h4>導覽</h4><ul><li><a href="../#route">從哪一站開始</a></li><li><a href="../#ride">沿線動畫</a></li><li><a href="../#guide">分站深度導覽</a></li><li><a href="../#trips">行程構想</a></li></ul></div>
<div><h4>更多</h4><ul><li><a href="https://park.skytaxi.com.tw/brand/">長壽生活園區</a></li><li><a href="https://www.skytaxi.com.tw/brand/">Skytaxi 雲天新能源</a></li><li><a href="../">切換資料版</a></li></ul></div>'''
    cfg = dict(title='虎頭埤纜車｜搭乘與遊園　形象版', brand='虎頭埤纜車', brand_sub='HUTOUPI CABLE CAR', data_href='../', side=('#stations', '分站導覽'),
               menu=[('start', '虎頭埤纜車'), ('ride', '沿線風景'), ('stations', '四座車站'), ('trips', '行程構想'), ('visit', '出發前')],
               menu_note='纜車尚未開放搭乘<br>開放資訊以營運方正式公告為準',
               hero=dict(img=R('hero-1123'), alt='虎頭埤鳥瞰實景模擬', kicker='HUTOUPI CABLE CAR', h1='虎頭埤纜車', sub='沿湖穿過山城，一路走進森林'),
               body='\n'.join(S), foot=foot, copy='© 2026 雲天新能源科技股份有限公司', disclaimer='圖片為實景模擬與規劃示意，非現況；纜車尚未開放搭乘。')
    open(ROOT + '/review/m/04/brand/index.html', 'w', encoding='utf-8').write(page(cfg))
    return I.flush()

if __name__ == '__main__':
    print('ride', build())
