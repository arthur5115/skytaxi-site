'use strict';

const stations = {
  t1: { en: 'THE GATEWAY', title: '新化之門\n每段美好，從這裡開始。', description: '以銅色波浪屋頂與紅磚語彙迎接旅人，串聯入口廣場、商店街與空中旅程。讓抵達本身，就成為值得放慢腳步的第一站。', image: 'station-t1.webp', alt: '新化之門銅色波浪屋頂與紅磚站體設計意象', caption: 'T1 新化之門｜既有設計意象', features: ['入口廣場與旅客服務', '在地選物與風味餐飲', '空中旅程的出發門戶'] },
  t2: { en: 'A LAKESIDE RETREAT', title: '湖濱旅館站\n把時間，留給湖光。', description: '以湖景旅宿為核心，將車站與酒店的抵達體驗整合。從到站、入住到安靜停留，構想一段貼近自然、保有私密感的度假時光。', image: 'station-t2.webp', alt: '湖濱旅館及空中軌道的既有設計意象', caption: 'T2 湖濱旅館站｜既有設計意象', features: ['湖景住宿與私密休憩', '車站與旅館整合抵達', '從容餐飲與雙人假期'] },
  t3: { en: 'LIFE ON THE HILLSIDE', title: '湖濱山城站\n相聚，是最好的風景。', description: '以丘陵基地的綠意與遠景為背景，整合度假住宿、餐飲、宴會及文化體驗。讓家庭旅行、朋友相聚與重要時刻，都有自在停留的空間。', image: 'station-t3.webp', alt: '丘陵中的湖濱山城站建築材質意象', caption: 'T3 湖濱山城站｜既有建築材質意象', features: ['度假住宿與家庭體驗', '會議、宴會與餐飲構想', '丘陵景觀與公共藝術'] },
  t4: { en: 'AT HOME IN THE FOREST', title: '新化林場站\n讓森林，成為日常。', description: '第二階段規劃延伸至新化林場，以森林漫步、自然觀察與較長時間的停留為體驗方向。在樹影與鳥聲之間，找回不被催促的生活感。', image: 'forest.webp', alt: '新化林場入口草地與樹木的真實風景', caption: '新化林場現況實景｜T4 為第二階段規劃', features: ['第二階段路線延伸', '森林散步與自然探索', '深度休憩與長住體驗構想'] }
};
const trips = {
  day: {label: '一日漫遊', duration: 'ONE DAY', title: '一日，剛剛好的出走。', steps: [ ['上午','從新化之門出發','逛一段商店街，喝一杯咖啡，讓自己切換到旅行模式。'], ['午間','向湖而行，慢享午餐','以空中旅程串聯湖濱風景，為一頓在地午餐留足時間。'], ['午後','山城散步與藝術時光','走進湖濱山城，在綠意、展陳與茶點之間自在停留。'] ] },
  stay: {label: '兩天一夜', duration: 'TWO DAYS · ONE NIGHT', title: '多留一晚，把步調放慢。', steps: [ ['首日午後','抵達，先留一點空白','從新化之門展開空中旅程，依喜好選擇湖畔或山城住宿。'], ['首日晚間','好好吃飯，安心休息','享受風土晚餐，把晚上的時間留給家人與自己。'], ['次日早晨','在自然裡，慢慢醒來','用早餐、輕散步與安靜閱讀開啟一天，不急著出發。'], ['次日午後','帶一份地方記憶回家','回到新化之門逛選物與商店街，為旅程留下自在的結尾。'] ] },
  slow: {label: '森林慢旅', duration: 'A FOREST ESCAPE', title: '走進森林，住進時間。', steps: [ ['準備','先找到適合自己的步調','依體力選擇活動，準備飲水與適合步行的衣鞋。'], ['漫步','用感官認識一座森林','構想由 T4 串接林場體驗，慢慢觀察樹木、光影與鳥聲。'], ['停留','把行程留白','為靜坐、閱讀與共同用餐保留時間，享受較長的休憩。'], ['提醒','第二階段體驗構想','T4 與相關服務尚未開放；現有林場資訊請以管理單位公告為準。'] ] }
};

const details = {
  lakeside: { eyebrow:'T2 · LAKESIDE RETREAT', title:'湖光，是最好的陪伴。', image:'station-t2.webp', alt:'湖濱旅館站既有設計意象', body:'<p>湖濱旅館站的住宿構想，以安靜、景觀與抵達的從容感為核心。將站旅共構納入體驗，讓旅人從空中風景延續至入住時光。</p><h3>適合的旅行</h3><ul><li>兩人一起放慢步調的假期。</li><li>希望保留閱讀、散步與獨處時間的旅人。</li><li>以住宿品質與景觀感受為重點的深度休息。</li></ul><h3>一天可以這樣過</h3><p>午後抵達 → 湖畔停留 → 風土晚餐 → 好好休息 → 從容早餐。把飯店本身，當作值得享受的目的地。</p><p class="footnote">本站不提供即時房況或訂房。圖片為既有設計意象，並非完工實景；房型、設施、價格與開放日以正式公告為準。</p>' },
  hillside: { eyebrow:'T3 · HILLSIDE RETREAT', title:'在山城，為相聚留一個位置。', image:'station-t3.webp', alt:'湖濱山城站既有材質意象', body:'<p>湖濱山城站位於丘陵環境，網站以山城度假與多元相聚為主軸，呈現住宿、餐飲、宴會與文化活動的整合構想。</p><h3>適合的旅行</h3><ul><li>讓不同世代各得其樂的家庭假期。</li><li>與朋友共享餐桌、散步與活動的週末。</li><li>以自然為背景的會議、宴會與重要聚會。</li></ul><h3>讓活動與休息都有空間</h3><p>在完整的停留體驗中，安排共同相聚，也保留個人休息。以丘陵綠意、公共藝術與地方文化，形成山城獨有的記憶。</p><p class="footnote">本圖為既有建築材質意象，非核定施工方案。T3 為丘陵基地，並非緊鄰湖岸；本站未以示意圖承諾每間客房的湖景。</p>' },
  'lake-story': { eyebrow:'LAKESIDE NOTES', title:'把一個下午，交給湖光。', image:'lake-detail.webp', alt:'虎頭埤虎月吊橋與湖中小島空拍', body:'<p>來到湖邊，不一定要立刻出發。先找一個能看見水面的地方，看看光如何落在湖上，看看樹影如何隨風改變。</p><p>虎頭埤的慢旅提案，從這樣一段簡單的停留開始：不追趕景點，不把風景當作背景，而是讓眼前的一切，成為旅行真正的內容。</p><p>一杯茶、一段步行、一頓從容的午餐，就可以是一個完整的下午。</p><p class="footnote">本文為原創品牌生活提案。景觀照片來源：交通部觀光署西拉雅國家風景區管理處。</p>' },
  'forest-story': { eyebrow:'FOREST JOURNAL', title:'走慢一點，才能看見更多。', image:'trail.webp', alt:'新化林場林蔭步道', body:'<p>走進森林，把目的地暫時放在一旁。試著辨認一片葉子的輪廓，留意腳下的光影，也聽聽遠近不同的聲音。</p><p>我們構想的森林生活，不以走得多遠為目標。短短一段路，也能留下一段專注、安靜而有陪伴的時光。</p><p>與孩子一起觀察、陪長輩輕鬆散步，或獨自停下來閱讀。每一種步調，都有它適合的位置。</p><p class="footnote">本篇為旅行靈感，非指定步道承諾。請依現場開放狀況與自身體力選擇路線。景觀照片來源：交通部觀光署西拉雅國家風景區管理處。</p>' },
  'gateway-story': { eyebrow:'ARCHITECTURAL VISION', title:'從一座車站，開始一場旅行。', image:'station-t1.webp', alt:'新化之門站體既有設計意象', body:'<p>車站，是抵達一個地方的第一印象。新化之門的設計意象，以銅色波浪屋頂、紅磚量體與中央開放空間，構想一個有辨識度、也能自在停留的入口。</p><p>在這裡，交通與地方生活交會。旅人可以停下來逛逛、用餐、見面，再繼續自己的湖森旅程。</p><p>讓一段移動，不只是在兩個地點之間往返，也成為認識新化、走近虎頭埤的開場。</p><p class="footnote">圖片為專案既有設計意象，非完工實景，亦不替代工程設計與正式核定文件。</p>' },
  sources: { eyebrow:'ABOUT THIS WEBSITE', title:'圖像與內容說明', body:'<h3>景觀照片</h3><p>景觀照片來源：<a href="https://www.siraya-nsa.gov.tw/" target="_blank" rel="noopener noreferrer">交通部觀光署西拉雅國家風景區管理處</a>。虎頭埤照片取自<a href="https://www.siraya-nsa.gov.tw/zh-tw/attractions/detail/22" target="_blank" rel="noopener noreferrer">虎頭埤景點介紹</a>，森林照片取自<a href="https://www.siraya-nsa.gov.tw/zh-tw/attractions/detail/12" target="_blank" rel="noopener noreferrer">新化林場景點介紹</a>，依其<a href="https://www.siraya-nsa.gov.tw/zh-tw/siteinformation/copyright" target="_blank" rel="noopener noreferrer">版權宣告</a>註明出處使用。圖片來源不代表主管機關對本提案的認可或背書。</p><h3>建築意象</h3><p>沿用專案既有 T1 站體、T2 湖濱旅館及 T3 建築材質意象，均在圖旁標示。圖片不作為完工狀態、核准設計、房型或實際景觀的承諾。</p><h3>網站內容</h3><p>網站以虎頭埤四站一線、湖畔旅宿、山城聚會與森林休憩為專案定位，搭配本次原創品牌文案、六種體驗與行程提案。旅宿設施、活動細節及預訂服務仍屬規劃內容。</p><p>設計參考：<a href="https://kenkonomori.co.jp/zh-tw/" target="_blank" rel="noopener noreferrer">大自然阿蘇 健康之森</a>的自然停留敘事與體驗內容架構。本站未使用該站照片、品牌標誌、文案或醫療背書。</p><p class="footnote">版本：2026.10.10 · V1.0 網站設計提案。</p>' },
  privacy: { eyebrow:'PRIVACY', title:'把個人空間，留給你。', body:'<p>本網站的「規劃我的旅程」在你的瀏覽器中產生旅程文字檔，不要求姓名、電話或電子郵件，也不將旅行偏好提交至伺服器。</p><p>本站未設置廣告追蹤或訪客分析程式，亦未使用表單建立訂房或付款。關閉或重新整理頁面後，當次選擇不會持續保存。</p><p>地圖與官方資訊連結會開啟外部網站，其服務依各自的隱私政策運作。網站託管與存取驗證另依平台適用政策處理。</p>' }
};

function setStation(key) {
  const item = stations[key];
  document.querySelectorAll('[data-station]').forEach(b => { const selected = b.dataset.station === key; b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; });
  const panel = document.querySelector('#station-panel');
  panel.setAttribute('aria-labelledby', `tab-${key}`);
  document.querySelector('#station-en').textContent = item.en;
  const title = document.querySelector('#station-title');
  title.replaceChildren(...item.title.split('\n').flatMap((text, i) => i ? [document.createElement('br'), document.createTextNode(text)] : [document.createTextNode(text)]));
  document.querySelector('#station-description').textContent = item.description;
  const image = document.querySelector('#station-image'); image.src = `assets/${item.image}`; image.alt = item.alt;
  document.querySelector('#station-caption').textContent = item.caption;
  document.querySelector('#station-features').replaceChildren(...item.features.map(text => {const li = document.createElement('li'); li.textContent = text; return li;}));
}
function makeTimeline(steps) {
  return steps.map(([time, title, description]) => {
    const li = document.createElement('li'), span = document.createElement('span'), div = document.createElement('div'), h = document.createElement('h4'), p = document.createElement('p');
    span.textContent = time; h.textContent = title; p.textContent = description;
    div.append(h, p); li.append(span, div); return li;
  });
}
function setTrip(key) {
  const item = trips[key];
  document.querySelectorAll('[data-trip]').forEach(b => { const selected = b.dataset.trip === key; b.setAttribute('aria-selected', String(selected)); b.tabIndex = selected ? 0 : -1; });
  document.querySelector('#trip-panel').setAttribute('aria-labelledby', `trip-tab-${key}`);
  document.querySelector('#trip-duration').textContent = item.duration;
  document.querySelector('#trip-title').textContent = item.title;
  document.querySelector('#trip-timeline').replaceChildren(...makeTimeline(item.steps));
  document.querySelector('#plan-duration').value = key;
}
function wireTabs(selector, datasetKey, update) {
  const buttons = Array.from(document.querySelectorAll(selector));
  buttons.forEach((button, index) => {
    button.addEventListener('click', () => update(button.dataset[datasetKey]));
    button.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') target = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = buttons.length - 1;
      else return;
      event.preventDefault(); buttons[target].focus(); update(buttons[target].dataset[datasetKey]);
    });
  });
}
wireTabs('[data-station]', 'station', setStation);
wireTabs('[data-trip]', 'trip', setTrip);

const menuButton = document.querySelector('.menu-toggle'), mobileNav = document.querySelector('#mobile-nav');
function closeMenu() { mobileNav.hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', '開啟導覽選單'); }
menuButton.addEventListener('click', () => {const open = menuButton.getAttribute('aria-expanded') !== 'true'; mobileNav.hidden = !open; menuButton.setAttribute('aria-expanded', String(open)); menuButton.setAttribute('aria-label', open ? '關閉導覽選單' : '開啟導覽選單'); });
mobileNav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => {if(e.key === 'Escape' && !mobileNav.hidden) {closeMenu(); menuButton.focus();}});

function openDialog(dialog) { closeMenu(); dialog.showModal(); document.body.classList.add('modal-open'); }
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => document.body.classList.remove('modal-open'));
  dialog.addEventListener('click', e => {if(e.target === dialog) {const r = dialog.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();}});
});
document.querySelectorAll('[data-detail]').forEach(button => button.addEventListener('click', () => {
  const item = details[button.dataset.detail], container = document.querySelector('#detail-content');
  container.innerHTML = `<p class="eyebrow">${item.eyebrow}</p><h2 id="detail-title">${item.title}</h2>${item.image ? `<img src="assets/${item.image}" alt="${item.alt}">` : ''}${item.body}`;
  const dialog = document.querySelector('#detail-dialog'); dialog.setAttribute('aria-labelledby', 'detail-title'); openDialog(dialog);
}));

const planner = document.querySelector('#planner-dialog'), form = document.querySelector('#planner-form'), result = document.querySelector('#planner-result');
document.querySelectorAll('[data-planner]').forEach(button => button.addEventListener('click', () => {form.hidden = false; result.hidden = true; openDialog(planner);}));
let currentPlan = '';
form.addEventListener('submit', event => {
  event.preventDefault();
  const key = document.querySelector('#plan-duration').value, trip = trips[key];
  const interests = Array.from(form.querySelectorAll('input[name="interest"]:checked')).map(i => i.value);
  const preference = interests.length ? interests.join('、') : '自在探索';
  document.querySelector('#plan-summary').textContent = `${trip.label} · ${preference}`;
  document.querySelector('#plan-result-list').replaceChildren(...trip.steps.map(([time,title,description])=>{const li=document.createElement('li'); li.textContent=`${time}｜${title}：${description}`; return li;}));
  currentPlan = `虎頭埤｜我的慢旅草案\n${trip.label}\n旅行偏好：${preference}\n\n${trip.steps.map(([time,title,description])=>`${time}｜${title}\n${description}`).join('\n\n')}\n\n本草案為未來營運情境提案，非預訂確認。新建纜車、旅宿及相關服務尚未開放；服務、價格及日期以正式公告為準。\n本草案由瀏覽器產生，未提交個人資料。\n`;
  form.hidden = true; result.hidden = false;
  result.setAttribute('tabindex', '-1'); result.focus();
});
document.querySelector('#edit-plan').addEventListener('click', () => {result.hidden = true; form.hidden = false; document.querySelector('#plan-duration').focus();});
document.querySelector('#download-plan').addEventListener('click', () => {
  if(!currentPlan) return;
  const url = URL.createObjectURL(new Blob(['\ufeff', currentPlan], {type:'text/plain;charset=utf-8'})), anchor = document.createElement('a');
  anchor.href = url; anchor.download = '虎頭埤_我的慢旅草案.txt'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
