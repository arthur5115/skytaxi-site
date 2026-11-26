// Visitor illustrations are schematic: they show choices and sequences, not site geometry.
window.HUTOUPI_VISUALS=(()=>{
const data={
 t1:{
  experience:['新化之門北側階梯商店街','t1-experience.webp'],
  walk:['廣場到月台｜下車也能逛街',[['進站','廣場/票務候乘/月台','gate train'],['下車','月台/空中通廊/商店街','train shop'],['只逛','廣場/商店街/回地面','gate shop']]],
  itinerary:['從老街出發，兩種玩法',[['老街散策','新化老街/迎賓廣場/虎埤水鏡','shop lake'],['親子森林行','新化之門/搭乘纜車/新化林場','train forest']]],
  service:['行前先看三件事',[['轉乘','找集合點與接駁公告','sign'],['好走','先確認電梯及無障礙入口','access'],['活動','查廣場活動及集合安排','calendar']]]
 },
 t2:{
  experience:['湖濱旅館住客池庭（非公共泳池）','t2-experience.webp'],
  walk:['住客、散步旅客、自駕分開走',[['搭車入住','月台/室內連通/住客通道','train bed'],['不住宿','公共站廳/湖廊/公共步道','gate lake'],['自駕','東側車道/到達庭落客','car gate']]],
  itinerary:['湖岸半日與湖景住宿',[['半日散步','站廳/湖廊/步道與庭園','walk lake'],['湖邊過夜','入住/湖邊散步/隔日出遊','bed forest']]],
  service:['湖濱到訪前確認',[['住宿與婚禮','待公告房型及活動聯絡方式','bed'],['行李與輪椅','先查電梯及行李規則','bag'],['湖岸餐飲','先查開放、訂位與非住客規則','meal']]]
 },
 t3:{
  experience:['湖濱山城前庭與落客區','t3-experience.webp'],
  walk:['月台和前庭接往不同目的地',[['住客','月台/轉乘大廳/客房翼','train bed'],['遊客','站廳/餐飲或湖景平台','meal lake'],['活動來賓','前庭落客/宴會區','car event']]],
  itinerary:['家庭度假與團體聚會',[['家庭度假','先用餐/晴天看湖或雨天查室內體驗','meal play'],['婚宴或會議','確認集合點/安排住宿與散場','event bed']]],
  service:['依來訪目的核對',[['活動主辦','確認落客、交通和雨備','event'],['親子同行','確認室內體驗的年齡與陪同規則','play'],['旅宿餐飲','確認入住和特殊飲食需求','meal']]]
 },
 t4:{
  experience:['新化林場林間展演平台','t4-experience.webp'],
  walk:['以林場驛站為去回集合點',[['起點','林場驛站/看當日步道指引','gate sign'],['林間','林緣段/視腳程接植物園步道','walk forest'],['回程','循環線或折返/回驛站候車','walk train']]],
  itinerary:['親子短走或小團體慢行',[['短走看林','驛站/可及的觀景點/驛站','forest gate'],['自然解說','確認是否開放/參加解說/留回程時間','sign train']]],
  service:['在林間慢行，先顧回程',[['天候','查雨後路況與步道開放','rain'],['好走','核對坡度、路面與無障礙路段','walk'],['團體體驗','留意預約、寄物和輕食公告','bag']]]
 }
};
const marks={
 gate:'<path d="M9 52V22h12v22h22V22h12v30M8 22h48M23 36h18M7 53h50M21 28v15m22-15v15"/>',
 train:'<rect x="13" y="12" width="38" height="36" rx="9"/><path d="M13 32h38m-29 8h2m16 0h2m-20 8-7 9m27-9 7 9M20 21h24m-24 33h24"/>',
 shop:'<path d="M13 28v25h38V28M9 26l6-14h34l6 14v5H9zm12 27V37h10v16m7-15h8v8h-8zM23 13l-4 14m13-14v14m9-14 4 14"/>',
 lake:'<path d="M8 49q6-6 12 0t12 0 12 0 12 0M8 57q6-6 12 0t12 0 12 0 12 0M13 37l14-12 11 9 10-15 9 17"/><circle cx="19" cy="17" r="6"/>',
 forest:'<path d="m23 10-13 16h7L7 42h32L29 26h7zm0 32v12M44 19l-10 13h6l-7 13h24l-8-13h5zm0 26v10M7 56h51"/>',
 walk:'<circle cx="35" cy="11" r="5"/><path d="m22 31 9-10 8 5 4 8 8 2m-20-15-2 17-10 16m10-16 12 6 3 11M9 57h46"/>',
 sign:'<path d="M31 12v44M16 15h29l8 6-8 6H16zm0 19h32v11H16l-7-5zm8 22h14"/>',
 access:'<circle cx="31" cy="11" r="5"/><path d="m31 21 3 17h12l7 13 5-4M34 29h11"/><path d="M26 28a15 15 0 1 0 16 19"/>',
 calendar:'<rect x="11" y="15" width="42" height="39" rx="4"/><path d="M11 27h42M22 11v9m20-9v9m-20 17h2m10 0h2m10 0h2m-26 8h2m10 0h2"/>',
 bed:'<path d="M8 48V19m0 21h49v8M9 27h48v13M11 24h13v11H11m13-8h14c6 0 9 4 9 8H24m-16 13v5m49-5v5"/>',
 car:'<path d="m12 32 6-14h28l6 14M9 35l3-3h40l3 3v13H9zm6 13v6h6v-6m22 0v6h6v-6m-32-8h7m16 0h7"/>',
 bag:'<rect x="17" y="21" width="30" height="32" rx="5"/><path d="M26 21V12h12v9m-12 8v16m12-16v16m-15 8v5m18-5v5"/>',
 meal:'<path d="M14 12v14c0 8 13 8 13 0V12m-7 0v43M47 12c-9 6-10 17-4 22h5m0-22v43"/><path d="M31 17c3-3 7-4 10-4m-11 36c4 3 8 3 12 1"/>',
 event:'<path d="M9 52h46V32L32 13 9 32zm9-15v15m28-15v15m-21 0V37h14v15M32 12V5m-5 3h10"/>',
 play:'<rect x="9" y="19" width="46" height="27" rx="10"/><path d="M17 32h13m-6-6v12m17-8h2m5 7h2M16 47l-6 6m38-6 6 6"/>',
 rain:'<path d="M18 40c-12 0-12-15-3-17 1-12 19-13 23-3 14-3 18 20 3 20zm1 6-4 7m16-7-4 7m16-7-4 7"/>'
};
const palettes={t1:['#f0e8d7','#d4ab69','#63452f'],t2:['#e2eeeb','#50968c','#1a5452'],t3:['#eee8eb','#a37e90','#5f415d'],t4:['#e3eddf','#7b9e69','#2e5139']};
return {data, marks,palettes};
})();
