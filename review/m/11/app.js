'use strict';
// Geographic positions are reference points retained from the user's original website.
// Yellow overlays are source-traced approximate geographic polygons; not survey vectors.
const STATIONS = [
 {id:'T1',name:'虎頭埤站',subtitle:'湖畔門戶 · 西側起點',lat:23.02712,lng:120.33603,area:21510,section:'新化段王公廟小段',fig:2,aerial:3,page:5,zoom:18,intro:'從風景區正門出發。基地分布於北側停車場與南側商業、廣場用地。',note:'北側 1105 地號為 7,118 m²；南側其餘 10 筆合計 14,392 m²，兩區分開呈現於公告圖 2。',parcels:[['1105',7118,'停車場用地'],['1106-1',185,'商業區'],['1106-2',7,'商業區'],['1107',1494,'商業區'],['1107-7',4233,'廣場用地'],['1107-1',497,'部分商業區、部分廣場用地'],['1107-8',708,'部分商業區、部分廣場用地'],['1107-9',1103,'廣場用地'],['1107-13',665,'部分商業區、廣場及道路用地'],['1107-15',821,'廣場用地'],['1090-12',4679,'廣場用地']]},
 {id:'T2',name:'湖濱旅館站',subtitle:'湖灣半島 · 旅遊服務基地',lat:23.02975,lng:120.34330,area:13654,section:'礁坑子段',fig:4,aerial:5,page:6,zoom:18,intro:'湖灣半島上的旅遊服務基地，位於原青年活動中心一帶。公告以一筆土地界定範圍。',note:'公告僅包含 589-174。西側凹口的 590、589-173、589-175 不在公告表 2 的土地清單內。',parcels:[['589-174',13654,'旅遊服務區']]},
 {id:'T3',name:'湖濱山城站',subtitle:'山城節點 · 第一種旅館區',lat:23.03185,lng:120.34615,area:26000,section:'礁坑子段',fig:6,aerial:7,page:8,zoom:18,intro:'沿湖畔進入北側山城，基地由東、西兩筆旅館區土地組成。',note:'公告表 3 與圖 6 為 589-165、589-168 兩筆。正文重複列出 589-168，本頁依表格及圖示整理。',parcels:[['589-165',8362,'第一種旅館區 · 圖中②'],['589-168',17638,'第一種旅館區 · 圖中①']]},
 {id:'T4',name:'新化林場站',subtitle:'山林入口 · 東側終點',lat:23.02735,lng:120.35225,area:195153,section:'礁坑子段',fig:8,aerial:9,page:9,zoom:17,intro:'串聯新化林場周邊，基地包含南側農業區與北側大面積公園用地。',note:'589-2 公園用地達 184,555 m²。公告圖 8 北側與西側超出圖幅；589-2 依公開地籍圖補繪完整約略範圍，以黃色虛線區別。',parcels:[['589-145',10598,'農業區 · 圖中①'],['589-2',184555,'公園用地 · 圖中②']]}
];
const NODES = [{id:'T1',lat:23.02712,lng:120.33603},{id:'P2',lat:23.02865,lng:120.33995},{id:'T2',lat:23.02975,lng:120.34330},{id:'T3',lat:23.03185,lng:120.34615},{id:'P4',lat:23.02955,lng:120.34925},{id:'T4',lat:23.02735,lng:120.35225}];
const FIGURES = {1:[2032,1418,3],2:[2033,1353,5],3:[2033,1261,5],4:[2033,1308,6],5:[2033,1352,7],6:[2024,1331,8],7:[2033,1359,8],8:[2033,1345,9],9:[2033,1339,10]};
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('zh-TW');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
let selected = 'overview', view = 'live', figureType = 'boundary', baseType = 'photo', figureOverlay, figureBounds, toastTimer;
const liveMap = L.map('liveMap',{zoomControl:false,minZoom:12,maxZoom:19,zoomSnap:.5,scrollWheelZoom:true});
liveMap.attributionControl.setPrefix('<a href="https://leafletjs.com/" target="_blank" rel="noopener">Leaflet</a>');
L.control.zoom({position:'bottomright',zoomInTitle:'放大',zoomOutTitle:'縮小'}).addTo(liveMap);
L.control.scale({position:'bottomleft',imperial:false,maxWidth:90}).addTo(liveMap);
const wmts = id => `https://wmts.nlsc.gov.tw/wmts/${id}/default/GoogleMapsCompatible/{z}/{y}/{x}`;
const attribution = '<a href="https://maps.nlsc.gov.tw/" target="_blank" rel="noopener">內政部國土測繪中心</a>';
const tileOptions = {maxZoom:19,maxNativeZoom:19,attribution,keepBuffer:2};
const photo = L.tileLayer(wmts('PHOTO2'),tileOptions);
const street = L.tileLayer(wmts('EMAP'),tileOptions);
const labels = L.tileLayer(wmts('EMAP2'),{...tileOptions,opacity:.9});
const cadastre = L.tileLayer(wmts('LAND_OPENDATA'),{...tileOptions,opacity:.85});
photo.addTo(liveMap); labels.addTo(liveMap);
const tileHealth = new Map();
[photo,street].forEach(layer => {
 const stats={loaded:0,errors:0};tileHealth.set(layer,stats);
 layer.on('tileload',()=>{stats.loaded++;if(liveMap.hasLayer(layer))$('tileNotice').hidden=true;});
 layer.on('tileerror',()=>{stats.errors++;if(liveMap.hasLayer(layer)&&stats.errors>3&&stats.loaded===0)showTileNotice();});
});
const cadHealth={loaded:0,errors:0}; cadastre.on('tileload',()=>cadHealth.loaded++); cadastre.on('tileerror',()=>{cadHealth.errors++;if(liveMap.hasLayer(cadastre)&&cadHealth.errors===5&&cadHealth.loaded===0)showToast('公有土地地籍暫時無法載入，可先查看公告原圖。');});
function showTileNotice(){if(view!=='live')return;$('tileNotice').innerHTML='線上底圖尚未載入。請確認網路，或先 <button id="offlinePolicy">查看公告原圖</button>。';$('tileNotice').hidden=false;$('offlinePolicy').onclick=()=>setView('policy');}
setTimeout(()=>{const active=baseType==='photo'?photo:street;if(tileHealth.get(active).loaded===0)showTileNotice();},14000);
liveMap.createPane('boundaries');liveMap.getPane('boundaries').style.zIndex=410;
const boundaryLayers={};
STATIONS.forEach(s=>{
 boundaryLayers[s.id]=L.geoJSON(window.STATION_BOUNDARIES,{filter:f=>f.properties.station===s.id,pane:'boundaries',style:f=>({color:'#ffe448',weight:2.5,opacity:1,fillColor:'#ffdf32',fillOpacity:.29,dashArray:f.properties.method==='public_cadastre_trace'?'7 5':null}),onEachFeature:(f,layer)=>{
  const p=f.properties,source=p.method==='policy_affine'?`公告圖 ${p.figure} 描繪並定位`:'公開地籍圖補繪（公告圖幅外範圍）';
  layer.bindPopup(`<strong>${s.id} ${s.name}｜${p.parcel}</strong><p>公告面積：${fmt(p.official_area_m2)} m²<br>${source}<br><small>黃色範圍為影像描繪，非測量界址。</small></p>`);
  layer.bindTooltip(`${s.id} · ${p.parcel}`,{permanent:false,direction:'center',className:'boundary-label'});
 }});
});
function updateBoundaries(){
 Object.entries(boundaryLayers).forEach(([id,layer])=>{
  const visible=$('boundaryToggle').checked&&(selected==='overview'||selected===id);
  if(visible){layer.addTo(liveMap);layer.setStyle({fillOpacity:selected==='overview'?.22:.29,color:baseType==='street'?'#b38b00':'#ffe448'});}else liveMap.removeLayer(layer);
 });
 $('boundaryLegend').hidden=!$('boundaryToggle').checked;
}
const route = L.layerGroup().addTo(liveMap);
const coordinates = NODES.map(s=>[s.lat,s.lng]);
L.polyline(coordinates,{color:'#0a2d24',weight:8,opacity:.65,interactive:false}).addTo(route);
L.polyline(coordinates,{color:'#62e3c4',weight:3,opacity:1,dashArray:'9 9',lineCap:'round'}).bindPopup('<strong>六節點參考連線</strong><p>沿用原網站參考位置，折線約 1,973 m。<br>興建計畫里程為 1,947 m；正式工程線形待測量套合。</p>').addTo(route);
NODES.filter(s=>s.id.startsWith('P')).forEach(s=>L.circleMarker([s.lat,s.lng],{radius:5,color:'#fff',weight:2,fillColor:'#173d31',fillOpacity:1}).bindTooltip(s.id+' 參考',{permanent:true,direction:'bottom',offset:[0,7],className:'support-label'}).bindPopup(`<strong>${s.id} 參考位置</strong><p>原網站座標：${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}<br>尚未確認為正式工程控制點。</p>`).addTo(route));
const markers={};
function pinIcon(s,active=false){return L.divIcon({className:'station-marker',html:`<div class="station-pin${active?' selected':''}"><span class="pin-circle">${s.id}</span><span class="pin-name">${s.name}</span></div>`,iconSize:[36,36],iconAnchor:[18,18]});}
STATIONS.forEach(s=>{markers[s.id]=L.marker([s.lat,s.lng],{icon:pinIcon(s),title:`${s.id} ${s.name}（參考位置）`,alt:`切換至 ${s.name}`,riseOnHover:true}).addTo(liveMap).on('click',()=>selectStation(s.id));});
const policyMap = L.map('policyMap',{crs:L.CRS.Simple,zoomControl:false,minZoom:-4,maxZoom:1.5,zoomSnap:.25,zoomDelta:.5,attributionControl:false});
L.control.zoom({position:'bottomright',zoomInTitle:'放大原圖',zoomOutTitle:'縮小原圖'}).addTo(policyMap);
function currentStation(){return STATIONS.find(s=>s.id===selected);}
function currentFigure(){const s=currentStation();return s?(figureType==='aerial'?s.aerial:s.fig):1;}
function renderSidebar(){
 const s=currentStation();
 if(!s){$('stationInfo').innerHTML=`<span class="eyebrow">THE FOUR STATIONS</span><div class="detail-heading"><h2>一線串聯<br>湖畔與山林</h2><span class="index">04</span></div><p class="intro">沿著虎頭埤與新化林場，探索四站基地的位置、公告用地與周邊環境。</p><div class="statrow"><div><strong>4<small>站</small></strong><label>預設場站</label></div><div><strong>16<small>筆</small></strong><label>公告土地</label></div><div><strong>25.63<small>ha</small></strong><label>公告面積合計</label></div></div><div class="section-label">探索場站<span>點選查看基地 →</span></div><div class="station-list">${STATIONS.map(s=>`<button class="station-card" data-select="${s.id}"><span class="mini-badge">${s.id}</span><span><strong>${s.name}</strong><small>${fmt(s.area)} m² · ${s.parcels.length} 筆土地</small></span><span class="arrow">↗</span></button>`).join('')}</div><div class="section-label">公告路線與基地區位<span>圖 1</span></div>${sourceCard(1,'全線公告原圖')}<div class="plan-route"><h3>興建計畫標示里程 <strong>1,947 m</strong></h3><div class="plan-line">${NODES.map(s=>`<span>${s.id}</span>`).join('')}</div><p>地圖顯示參考座標連線；計畫里程與實際工程線形仍需套合。</p></div>`;
 }else{
 const rows=s.parcels.map(p=>`<tr><td>${p[0]}<small>${p[2]}</small></td><td>${fmt(p[1])}</td></tr>`).join('');
 $('stationInfo').innerHTML=`<span class="eyebrow">STATION ${s.id.substring(1)} · ${s.subtitle}</span><div class="detail-heading"><h2>${s.name}</h2><span class="index">0${s.id.substring(1)}</span></div><p class="intro">${s.intro}</p><div class="statrow"><div><strong>${fmt(s.area)}<small>m²</small></strong><label>公告基地面積</label></div><div><strong>${s.parcels.length}<small>筆</small></strong><label>公告土地</label></div></div><div class="section-label">公告基地地籍圖<span>圖 ${s.fig} · 正文 p.${s.page}</span></div>${sourceCard(s.fig,'放大查看地籍原圖')}<div class="overlay-status"><i></i>黃色基地範圍已套疊於地圖<small>${s.id==='T4'?'實線：公告描繪；虛線：公開地籍補繪。':'依公告黃色範圍描繪並定位。'}可點選範圍查看地號。</small></div><p class="highlight-note">${s.note}</p><details class="table-details" ${s.parcels.length<4?'open':''}><summary>公告地號與面積（${s.parcels.length} 筆）</summary><p class="land-heading">${s.section}</p><table class="land-table"><thead><tr><th scope="col">地號／使用分區</th><th scope="col">面積 m²</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>合計</td><td>${fmt(s.area)}</td></tr></tfoot></table></details><div class="coord-card"><button id="copyCoord">複製座標</button>原網站參考位置 · WGS84<br><code>${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}</code><br>用於瀏覽定位；正式站點待測量確認。</div>`;
 $('copyCoord').onclick=async()=>{try{await navigator.clipboard.writeText(`${s.lat.toFixed(6)}, ${s.lng.toFixed(6)}`);showToast('已複製參考座標（非測量控制點）');}catch{showToast('請選取座標文字複製。');}};
 }
 document.querySelectorAll('[data-select]').forEach(b=>b.onclick=()=>selectStation(b.dataset.select));
 $('sourceCard').onclick=()=>{figureType='boundary';setView('policy');};
}
function sourceCard(n,label){return `<button class="source-card" id="sourceCard"><img src="assets/policy-fig-${n}.jpg" alt="政策公告圖 ${n}：${selected==='overview'?'場站基地區位及路線':'基地地籍示意圖'}" loading="lazy"><span class="image-tag">113.09 政策公告</span><span class="source-card-label">${label}<span>⛶</span></span></button>`;}
function selectStation(id,updateHash=true){
 if(id!=='overview'&&!STATIONS.some(s=>s.id===id))id='overview';
 selected=id;figureType='boundary';
 document.querySelectorAll('[data-station]').forEach(b=>{const active=b.dataset.station===id;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',active);});
 STATIONS.forEach(s=>markers[s.id].setIcon(pinIcon(s,s.id===id)));
 $('boundaryToggle').checked=true;updateBoundaries();renderSidebar();$('mapHeading').hidden=id!=='overview'||view!=='live';
 if(view==='policy')showFigure();else fitCurrent();
 if(updateHash)history.replaceState(null,'',`#${id}`);
}
function fitCurrent(){
 if(view==='policy'){if(figureBounds)policyMap.fitBounds(figureBounds,{paddingTopLeft:[24,130],paddingBottomRight:[24,85],animate:false});return;}
 const s=currentStation();
 const narrow=liveMap.getSize().x<600,bounds=s?boundaryLayers[s.id].getBounds():L.latLngBounds(coordinates);
 if(!s)Object.values(boundaryLayers).forEach(layer=>bounds.extend(layer.getBounds()));
 liveMap.fitBounds(bounds,{paddingTopLeft:narrow?[24,115]:[55,s?105:170],paddingBottomRight:narrow?[24,100]:[55,100],maxZoom:s?19:16.5,animate:false});
}
function showFigure(){
 const n=currentFigure(),[w,h,page]=FIGURES[n];figureBounds=[[0,0],[h,w]];
 if(figureOverlay)policyMap.removeLayer(figureOverlay);
 figureOverlay=L.imageOverlay(`assets/policy-fig-${n}.jpg`,figureBounds,{alt:`政策公告圖 ${n}`,interactive:false}).addTo(policyMap);
 figureOverlay.on('error',()=>showToast('公告圖片載入失敗，請重新整理頁面。'));
 const s=currentStation();
 $('policyCaption').innerHTML=`<b>公告圖 ${n}｜${s?s.name+' · '+(figureType==='aerial'?'現況空照圖':'基地地籍示意圖'):'本案場站基地區位及路線示意圖'}</b><span>113.09 政策公告 · 正文第 ${page} 頁 · 原圖可拖曳縮放${n===8?' · 北、西側圖幅截斷':''}</span>`;
 $('downloadFigure').href=`assets/policy-fig-${n}.jpg`;$('downloadFigure').download=`虎頭埤政策公告_圖${n}.jpg`;
 document.querySelectorAll('[data-figure]').forEach(b=>{b.disabled=!s;b.classList.toggle('active',b.dataset.figure===figureType);b.setAttribute('aria-pressed',b.dataset.figure===figureType);});
 requestAnimationFrame(()=>{policyMap.invalidateSize();fitCurrent();});
}
function setView(next){
 view=next;const isLive=next==='live';
 $('liveMap').hidden=!isLive;$('policyMap').hidden=isLive;
 ['liveControls','mapLegend','north','coordinate'].forEach(id=>$(id).hidden=!isLive);
 ['policyControls','policyCaption'].forEach(id=>$(id).hidden=isLive);
 $('mapHeading').hidden=!isLive||selected!=='overview';$('tileNotice').hidden=true;
 $('liveViewButton').classList.toggle('active',isLive);$('liveViewButton').setAttribute('aria-pressed',isLive);
 $('policyViewButton').classList.toggle('active',!isLive);$('policyViewButton').setAttribute('aria-pressed',!isLive);
 if(isLive)requestAnimationFrame(()=>{liveMap.invalidateSize();fitCurrent();const h=tileHealth.get(baseType==='photo'?photo:street);if(h.errors>3&&h.loaded===0)showTileNotice();});else showFigure();
}
function changeBase(type){
 baseType=type;liveMap.removeLayer(type==='photo'?street:photo);(type==='photo'?photo:street).addTo(liveMap).bringToBack();
 if(type==='street'){liveMap.removeLayer(labels);$('labelsToggle').disabled=true;}else{$('labelsToggle').disabled=false;if($('labelsToggle').checked)labels.addTo(liveMap);}
 if(liveMap.hasLayer(cadastre))cadastre.bringToFront();updateBoundaries();
 document.querySelectorAll('[data-base]').forEach(b=>{b.classList.toggle('active',b.dataset.base===type);b.setAttribute('aria-pressed',b.dataset.base===type);});
 $('tileNotice').hidden=true;
}
function showToast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
document.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>selectStation(b.dataset.station));
document.querySelectorAll('[data-base]').forEach(b=>b.onclick=()=>changeBase(b.dataset.base));
document.querySelectorAll('[data-figure]').forEach(b=>b.onclick=()=>{figureType=b.dataset.figure;showFigure();});
$('boundaryToggle').onchange=updateBoundaries;
$('routeToggle').onchange=e=>e.target.checked?route.addTo(liveMap):liveMap.removeLayer(route);
$('cadToggle').onchange=e=>{e.target.checked?cadastre.addTo(liveMap):liveMap.removeLayer(cadastre);$('cadLegend').hidden=!e.target.checked;};
$('labelsToggle').onchange=e=>e.target.checked&&baseType==='photo'?labels.addTo(liveMap):liveMap.removeLayer(labels);
$('fitButton').onclick=fitCurrent;$('liveViewButton').onclick=()=>setView('live');$('policyViewButton').onclick=()=>setView('policy');
function toggleExpanded(force){const shell=document.querySelector('.map-shell'),next=force===undefined?!shell.classList.contains('expanded'):force;shell.classList.toggle('expanded',next);$('fullButton').setAttribute('aria-label',next?'收合地圖':'展開地圖');$('fullButton').textContent=next?'×':'⤢';requestAnimationFrame(()=>{liveMap.invalidateSize();policyMap.invalidateSize();fitCurrent();});}
$('fullButton').onclick=()=>toggleExpanded();
document.addEventListener('keydown',e=>{if(e.key==='Escape')toggleExpanded(false);});
$('sourcesButton').onclick=$('sourceTextButton').onclick=()=>$('sourceDialog').showModal();
$('closeSources').onclick=()=>$('sourceDialog').close();
$('sourceDialog').addEventListener('click',e=>{if(e.target===$('sourceDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
liveMap.on('mousemove',e=>$('coordinate').textContent=`${e.latlng.lat.toFixed(5)}° N  ${e.latlng.lng.toFixed(5)}° E`);
liveMap.on('mouseout',()=>$('coordinate').textContent='WGS84 · 參考位置');
window.addEventListener('hashchange',()=>selectStation(location.hash.slice(1),false));
window.addEventListener('resize',()=>{liveMap.invalidateSize();policyMap.invalidateSize();fitCurrent();});
selectStation(location.hash.slice(1)||'overview',false);


requestAnimationFrame(()=>{liveMap.invalidateSize();fitCurrent();});
