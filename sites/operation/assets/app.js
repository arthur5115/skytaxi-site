import { bindModelDrag } from "./model-drag.js?v=1.4";
import { getLanguage, text as tr, sectionUrl, onLanguageChange } from "./site-language.js?v=1.4";
import { nodes, spans, total, firstSpan, water, clearancePoints, groundPoints, parts, lineColor,
  railElevation, chainage, decimal, range } from "./model.js?v=1.4";
import { inputs, schedule, trainState, timeAt } from "./operation.js?v=1.4";
import { clockTime, renderEvents, renderOperation, renderRun, renderStation } from "./operation-view.js?v=1.4";
import { canvasContext, paintScene } from "./scene.js?v=1.4";

const byId = id => document.getElementById(id);
const ui = Object.fromEntries([
  "route-list","animation","scene","scene-tags","scene-title","scene-kicker","scene-note","profile","profile-position","chainage",
  "views","zoom-in","zoom-out","reset-view","scope-ch","engineering","explode","explode-value","components",
  "component-info","isolate","assemble","service","mode","cars","speed","play","restart","time","clock","trains","operations","pattern-stop","pattern-dir","event-train",
  "op-note","model-drag"
].map(id => [id, byId(id)]));
const state = { span: null, view: "orbit", yaw: -.48, pitch: .64, zoom: 1, focus: 360, explode: 0,
  selection: null, isolate: false, follow: null, playing: false, speed: 8, service: "through", mode: "paired", cars: inputs.maxCars };
let plan = schedule(state.service,state.mode,state.cars);
let time = timeAt(plan, 225, "A");
let frameId = 0, previousFrame = 0, dirty = true, lastTrainText = {};

const nodesById = Object.fromEntries(nodes.map(n => [n.id, n]));
const viewNotes = {
  orbit: ["沿里程展開 · 地貌與軌道示意", "Route by chainage · Schematic terrain and rails"],
  side: ["側視 · 高程放大示意", "Side view · Exaggerated elevations"],
  plan: ["里程展開俯視 · 站位與水域區間", "Plan view by chainage · Stations and water crossings"],
  detail: ["比例近景 · 車體下置，走行輪接觸軌頭", "Close-up · Carbody below the rails, running wheels on the railheads"]
};
const statuses = {
  "乘降停站": "Station dwell",
  "端站折返": "Terminal turnaround",
  "待成對發車": "Waiting for paired departure",
  "門架限速": "Portal speed limit",
  "站區限速": "Station speed limit",
  "加速": "Accelerating",
  "減速": "Braking",
  "行駛": "Running"
};
const trainStatus = t => tr(t.status,statuses[t.status]);

const tagMap = new Map();
const tagNodes = [...nodes, ...plan.trains.map(t => ({
  id:t.id, label:t.label, name:t.label + " 列車", nameEn:"Train " + t.label
}))];
for (const n of tagNodes) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = n.label ?? n.id;
  button.dataset.tag = n.id;
  button.className = "scene-tag" + (n.type === "pier" ? " pier" : "");
  button.hidden = true;
  ui["scene-tags"].append(button);
  tagMap.set(n.id, button);
}

function refreshTagLabels() {
  for (const n of tagNodes) {
    const name = tr(n.name,n.nameEn);
    tagMap.get(n.id).setAttribute("aria-label", n.type === "pier" ? n.id + " " + name : name);
  }
}

function routeButton(label, detail, index, pack) {
  const active = index === (state.span?.number ?? 0);
  const notOpen = pack === 2 && state.service === "phased";
  return `<button class="route-entry${notOpen ? " inactive" : ""}" type="button" data-span="${index}" data-package="${pack}" aria-current="${active}"><i></i><span><strong>${label}</strong><small>${detail}</small></span></button>`;
}

const fullRoute = () => tr("T1–T4 全線","T1–T4 full route");
const spanLabel = s => tr("跨 " + s.number, "Span " + s.number) + " · " + s.start.id + "–" + s.end.id;

function refreshRoute() {
  ui["route-list"].innerHTML = routeButton(fullRoute(),tr("四站、五跨","4 stations, 5 spans"),0,0)
    + spans.map(s => routeButton(spanLabel(s),decimal(s.length) + " m",s.number,s.pack)).join("");
}

function measurements(entries) {
  return '<dl class="engineering-list">' + entries.map(([label,value]) =>
    `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("") + "</dl>";
}

function controlSummary(point) {
  const name = tr(point.name,point.nameEn);
  const ground = tr("地面 EL","Ground EL") + decimal(point.ground,2);
  const rail = point.rail ? tr("，軌頂 EL",", railhead EL") + decimal(point.rail,2) : "";
  const margin = tr("營運餘裕 ","Operating clearance margin ") + tr(point.margin,point.marginEn ?? point.margin);
  return `<div class="control-card"><strong>${name} · ${chainage(point.ch).replace(".0","")}</strong>
    <p>${ground}${rail}${tr("。",".")}<br>${margin}${tr("。",".")}</p>
    <button type="button" class="ghost" data-locate="${point.ch}">${tr("定位至控制點","Locate control point")}</button></div>`;
}

function refreshEngineering() {
  const s = state.span;
  const overview = state.service === "phased" ? tr("T1–T3 先行營運","T1–T3 initial service") : fullRoute();
  ui["scene-title"].textContent = s ? spanLabel(s) + " · " + decimal(s.length) + " m" : overview;
  ui["scene-kicker"].textContent = s ? tr("工程包" + (s.pack === 1 ? "一" : "二"),"Work package " + s.pack)
    : tr("沿線展開","Route overview");
  ui["scope-ch"].textContent = s ? chainage(s.start.ch) + "–" + chainage(s.end.ch) : tr("全線","Overview");
  if (!s) {
    ui.engineering.innerHTML = `<p class="detail-kicker">${tr("規劃全線","Planned route")}</p>
      <h3>${tr("四站、五跨與兩座門架","Four stations, five spans and two portals")}</h3>
      <p>${tr("沿路線定位車站及支承，點選第一跨可查閱跨湖區間與淨空控制點。",
        "Select stations and supports along the route. Open the first span to inspect the lake crossing and clearance control point.")}</p>`
      + measurements([
        [tr("路線里程","Route length"),"1,874.6 m"],[tr("兩座門架","Portal supports"),"P1 / P2"],
        [tr("工程包一","Work package 1"),"T1–T3"],[tr("工程包二","Work package 2"),"T3–T4"]
      ])
      + `<div class="control-card"><strong>${tr("第一跨","First span")} · T1–P1</strong>
        <p>${tr("446.0 m 跨湖段及 CH360 淨空控制點。","446.0 m lake crossing and CH360 clearance control point.")}</p>
        <button type="button" class="ghost" data-open-first>${tr("拆解第一跨","Inspect first span")}</button></div>`;
  } else {
    const bands = water.filter(w => w.start >= s.start.ch && w.end <= s.end.ch);
    const endPoint = s.end.type === "pier" ? [[s.end.id + tr(" 門架高"," portal height"),decimal(s.end.height) + " m"]] : [];
    const data = [[tr("節點間距","Span length"),decimal(s.length) + " m"],
      [tr("起點地面 EL","Start ground EL"),decimal(s.start.ground,2) + " m"],
      [tr("迄點地面 EL","End ground EL"),decimal(s.end.ground,2) + " m"],
      ...endPoint, ...bands.map(b => [bands.length === 1 ? tr("水域里程","Water chainage") : tr(b.label,b.labelEn),`CH${b.start}–${b.end}`])];
    if (s.number === 1) data.splice(3, 0,
      [tr("T1 軌頂參考","T1 reference railhead"),"EL52.60"],[tr("P1 圓弧軌頂參考","P1 curved railhead reference"),"EL65.528"]);
    const controls = clearancePoints.filter(p => p.ch > s.start.ch && p.ch < s.end.ch);
    const station = [s.end,s.start].find(n => n.type === "station");
    const stationLink = sectionUrl("/stations/",{station:station.id});
    ui.engineering.innerHTML = `<p class="detail-kicker">${spanLabel(s)}</p><h3>${tr(s.title,s.titleEn)}</h3>
      <p>${tr(s.summary,s.summaryEn)}</p>` + measurements(data) + controls.map(controlSummary).join("")
      + `<a class="ghost station-link" href="${stationLink}">${tr("查看 " + station.id + " 站體","Open " + station.id + " station model")} ↗</a>`;
  }
  ui["profile-position"].min = s?.start.ch ?? 0;
  ui["profile-position"].max = s?.end.ch ?? total;
}

function refreshParts() {
  if (ui.components.dataset.lang !== getLanguage()) {
    ui.components.dataset.lang = getLanguage();
    ui.components.innerHTML = parts.map(p =>
      `<button type="button" data-part="${p.id}"><i style="--part-color:${p.color}"></i>${tr(p.name,p.nameEn)}</button>`).join("");
  }
  for (const button of ui.components.children) button.setAttribute("aria-pressed",button.dataset.part === state.selection);
  const p = parts.find(x => x.id === state.selection);
  ui["component-info"].textContent = p ? tr(p.description,p.descriptionEn)
    : tr("直接拖曳畫面展開構件，也可點選構件查看說明。","Drag the model to separate its parts, or select a part to inspect it.");
  ui.isolate.disabled = !p;
  ui.isolate.setAttribute("aria-pressed",state.isolate);
  ui.isolate.textContent = state.isolate ? tr("顯示全部","Show all") : tr("單獨顯示","Isolate");
  refreshExplosion();
}

function refreshExplosion() {
  ui.explode.value = Math.round(state.explode * 100);
  ui["explode-value"].textContent = ui.explode.value + "%";
}

function setExplosion(value) {
  state.explode = range(value,0,1);
  refreshExplosion();
  requestFrame();
}

function refreshControls() {
  for (const el of ui.views.querySelectorAll("button")) el.setAttribute("aria-pressed",el.dataset.view === state.view);
  for (const el of ui.trains.querySelectorAll("button")) el.setAttribute("aria-pressed",el.dataset.follow === state.follow);
  ui.play.textContent = state.playing ? tr("Ⅱ 暫停列車","Ⅱ Pause trains") : tr("▶ 播放列車","▶ Play trains");
  ui.time.max = plan.cycle;
  ui["op-note"].textContent = (state.service === "through"
    ? tr("T2、T3 中途停靠，T1、T4 原線折返。","Trains stop at T2 and T3 and reverse on their own lines at T1 and T4.")
    : tr("先行營運以每線一列試算，T2 中途停靠，列車抵 T3 原線折返。",
      "Initial service models one train per line, with a stop at T2 and a turnaround at T3."))
    + tr(" 動畫、班距與運能採同一試算。限速區界及停車標假設見下方。",
      " The animation, headways and capacity use one model. The speed zone and stopping-point assumptions are below.");
}

function resetCamera(view = "orbit") {
  state.view = view;
  state.yaw = view === "detail" ? -.56 : -.48;
  state.pitch = view === "detail" ? .43 : .64;
  state.zoom = 1;
}

function chooseSpan(n) {
  state.span = n > 0 ? spans[n - 1] : null;
  state.follow = null;
  state.isolate = false;
  state.selection = null;
  state.explode = 0;
  state.focus = state.span ? (n === 1 ? 360 : (state.span.start.ch + state.span.end.ch) / 2) : 360;
  resetCamera();
  if (state.span && state.span.start.ch < plan.end) {
    const at = state.span.start.ch + state.span.length * .54;
    time = timeAt(plan,Math.min(plan.end - .01,at),"A");
  }
  refreshRoute();
  refreshEngineering();
  refreshParts();
  refreshControls();
  requestFrame();
}

function follow(train) {
  state.follow = train;
  state.isolate = false;
  state.selection = null;
  resetCamera(train ? "detail" : "orbit");
  refreshControls();
  refreshParts();
  requestFrame();
}

function selectPart(part) {
  state.selection = state.selection === part ? null : part;
  state.isolate = false;
  if (state.view === "detail" && part !== "train" && part !== "rails") {
    state.follow = null;
    resetCamera();
    refreshControls();
  }
  refreshParts();
  requestFrame();
}

function locate(ch) {
  const a = state.span?.start.ch ?? 0, b = state.span?.end.ch ?? total;
  state.follow = null;
  state.focus = range(ch,a,b);
  refreshControls();
  requestFrame();
}

function graphGeometry(width,height) {
  const min = state.span?.start.ch ?? 0, max = state.span?.end.ch ?? total;
  const points = groundPoints.filter(p => p.ch >= min && p.ch <= max + .11);
  const low = Math.floor((Math.min(...points.map(p=>p.ground),railElevation(min)) - 3)/10)*10;
  const high = Math.ceil((Math.max(...points.map(p=>railElevation(p.ch)),railElevation(max)) + 3)/10)*10;
  const left = 31, right = width - 13, top = 12, bottom = height - 20;
  const x = ch => left + (range(ch,min,max) - min)/(max - min)*(right - left);
  const y = el => bottom - (el-low)/(high-low)*(bottom-top);
  return {min,max,points,low,high,left,right,top,bottom,x,y};
}

function paintProfile(trains) {
  const {ctx,width,height} = canvasContext(ui.profile);
  if (width <= 42) return;
  const g = graphGeometry(width,height);
  ctx.clearRect(0,0,width,height);
  ctx.font = '11px "Instrument Sans", sans-serif';
  ctx.textBaseline = "middle";
  for (const band of water) {
    const lo = Math.max(g.min,band.start), hi = Math.min(g.max,band.end);
    if (hi <= lo) continue;
    ctx.fillStyle = "#2b596b66";
    ctx.fillRect(g.x(lo),g.top,g.x(hi)-g.x(lo),g.bottom-g.top);
  }
  for (let el = g.low; el <= g.high; el += state.span ? 10 : 20) {
    ctx.strokeStyle = "#32464e";
    ctx.lineWidth = 1;
    ctx.beginPath();ctx.moveTo(g.left,g.y(el));ctx.lineTo(g.right,g.y(el));ctx.stroke();
    ctx.fillStyle = "#a7bab9";
    ctx.fillText(String(el),4,g.y(el));
  }
  ctx.strokeStyle = "#b1e1cb";
  ctx.lineWidth = 1.75;
  ctx.setLineDash([5,4]);
  ctx.beginPath();
  for (let i = 0; i <= 144; i++) {
    const ch = g.min+(g.max-g.min)*i/144;
    const x = g.x(ch), y = g.y(railElevation(ch));
    if (i === 0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  for (const p of g.points) {
    const x = g.x(p.ch), y = g.y(p.ground);
    ctx.fillStyle = "#e4e8bb";
    ctx.beginPath();ctx.arc(x,y,3,0,2*Math.PI);ctx.fill();
    if (p.rail !== undefined && p.ch <= g.max) {
      ctx.strokeStyle = "#edca84";
      ctx.lineWidth = 1;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,g.y(p.rail));ctx.stroke();
      ctx.fillStyle = "#ffe2a6";
      ctx.fillRect(x-2,g.y(p.rail)-2,4,4);
    }
  }
  const focus = state.follow ? trains[state.follow].ch : state.focus;
  if (focus >= g.min && focus <= g.max) {
    const x = g.x(focus);
    ctx.strokeStyle = "#d8ca88";
    ctx.lineWidth = 1;
    ctx.setLineDash([3,3]);
    ctx.beginPath();ctx.moveTo(x,g.top);ctx.lineTo(x,g.bottom);ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const train of Object.values(trains)) {
    if (train.ch < g.min || train.ch > g.max) continue;
    const x=g.x(train.ch),y=g.y(railElevation(train.ch));
    ctx.fillStyle = lineColor[train.line];
    ctx.strokeStyle = "#17252c";
    ctx.lineWidth = 1.4;
    ctx.beginPath();ctx.arc(x,y,4.6,0,2*Math.PI);ctx.fill();ctx.stroke();
  }
  ctx.fillStyle = "#9fb3b3";
  const labels = state.span ? [[g.min,state.span.start.id],[g.max,state.span.end.id]] : nodes.map(n=>[n.ch,n.id]);
  for (const [ch,id] of labels) {
    const x = g.x(ch);
    ctx.fillText(id,range(x-5,g.left-1,g.right-8),height-7);
  }
}

function refreshTrains() {
  ui.trains.innerHTML = plan.trains.map(t => '<button type="button" class="train train-'
    + t.line.toLowerCase() + '" data-follow="' + t.id + '" aria-pressed="false"><span class="train-id">'
    + t.label + '</span><span class="train-state" data-status="' + t.id
    + '"></span><span class="follow">' + tr("跟車","Follow") + "</span></button>").join("");
  lastTrainText = {};
}

function updateTrainLabels(trains) {
  for (const [id,t] of Object.entries(trains)) {
    const stop = nodesById[t.stop];
    const where = stop ? t.stop + " " + tr(stop.name,stop.nameEn) + (t.berth ? " · " + tr(t.berth,"Far berth") : "")
      : chainage(t.ch) + tr(" · 往 "," · To ") + t.next;
    const speed = t.kind === "run" ? " · " + decimal(t.speed,1) + " km/h" : "";
    const label = where + " · " + trainStatus(t) + speed;
    if (lastTrainText[id] !== label) {
      ui.trains.querySelector('[data-status="' + id + '"]').textContent = label;
      lastTrainText[id] = label;
    }
  }
}

function updateTags(tags) {
  const active = new Set(tags.map(p=>p.id));
  for (const [id,element] of tagMap) if (!active.has(id)) element.hidden = true;
  for (const p of tags) {
    const tag = tagMap.get(p.id);
    tag.style.left = Math.round(p.x) + "px";
    tag.style.top = Math.round(p.y) + "px";
    tag.hidden = false;
  }
}

function refreshSceneNote(trains, tags) {
  const train = trains[state.follow];
  const status = state.playing ? tr("播放中","Playing") : tr("已暫停","Paused");
  const visibleTrain = tags.some(tag => Object.hasOwn(trains, tag.id));
  const detail = train ? tr("跟隨 ","Following ") + train.label + " · " + trainStatus(train)
    : state.playing && !visibleTrain ? tr("此視角暫無列車","No trains in this view")
    : !state.playing && ui.scene.dataset.dragMode === "explode"
      ? tr("右拉展開 · 左拉合攏","Drag right to expand · Left to close") : tr(...viewNotes[state.view]);
  const note = status + " · " + detail;
  if (ui["scene-note"].textContent !== note) ui["scene-note"].textContent = note;
}

function refreshClock() {
  ui.clock.textContent = clockTime(time);
  ui.time.value = time;
}

function requestFrame() {
  dirty = true;
  if (!frameId) frameId = requestAnimationFrame(frame);
}

function frame(timestamp) {
  frameId = 0;
  if (state.playing && previousFrame && timestamp - previousFrame < 28) {
    frameId = requestAnimationFrame(frame);
    return;
  }
  if (state.playing && previousFrame) {
    time = (time + Math.min(.125,(timestamp-previousFrame)/1000)*state.speed) % plan.cycle;
  }
  previousFrame = state.playing ? timestamp : 0;
  if (dirty || state.playing) {
    const trains = Object.fromEntries(plan.trains.map(t => [t.id,trainState(plan,time,t.id)]));
    const tags = paintScene(ui.scene,state,trains,plan.end);
    updateTags(tags);
    refreshSceneNote(trains,tags);
    paintProfile(trains);
    const ch = state.follow ? trains[state.follow].ch : state.focus;
    ui.chainage.textContent = chainage(ch);
    ui["profile-position"].value = ch;
    refreshClock();
    updateTrainLabels(trains);
    dirty = false;
  }
  if (state.playing) frameId = requestAnimationFrame(frame);
}

ui["route-list"].addEventListener("click", event => {
  const clicked = event.target.closest("button[data-span]");
  if (clicked) chooseSpan(Number(clicked.dataset.span));
});
ui.engineering.addEventListener("click",event => {
  if (event.target.closest("[data-open-first]")) chooseSpan(1);
  const el = event.target.closest("button[data-locate]");
  if (el) locate(Number(el.dataset.locate));
});
ui["scene-tags"].addEventListener("click",event => {
  const id = event.target.closest("button[data-tag]")?.dataset.tag;
  if (!id) return;
  if (plan.trains.some(t => t.id === id)) follow(state.follow === id ? null : id);
  else {
    const n = nodes.find(item=>item.id===id);
    const span = spans.find(item=>item.end===n) ?? firstSpan;
    chooseSpan(span.number);
    locate(n.ch);
  }
});
ui.views.addEventListener("click",event => {
  const view = event.target.closest("button[data-view]")?.dataset.view;
  if (!view) return;
  const tracked = state.follow;
  state.follow = null;
  resetCamera(view);
  if (view === "detail") {
    state.isolate = false;
    if (state.playing) {
      state.follow = tracked;
      preparePlaybackView();
    } else {
      const hasPortal = state.span?.end.type === "pier" && state.span.end.ch <= plan.end;
      const point = hasPortal ? state.span.end.ch - 11 : trainState(plan,time,"A").ch;
      if (hasPortal) seekTime(timeAt(plan,point,"A"));
      state.focus = point;
    }
  }
  refreshControls();
  refreshParts();
  requestFrame();
});
ui.components.addEventListener("click",event => {
  const part = event.target.closest("button[data-part]")?.dataset.part;
  if (part) selectPart(part);
});
ui.isolate.addEventListener("click",() => {
  state.isolate = !state.isolate;
  refreshParts();
  requestFrame();
});
ui.assemble.addEventListener("click",() => {
  state.explode=0;
  state.isolate=false;
  state.selection=null;
  refreshParts();
  requestFrame();
});
ui.explode.addEventListener("input",event => setExplosion(Number(event.target.value)/100));
ui["profile-position"].addEventListener("input",event=>locate(Number(event.target.value)));
ui.profile.addEventListener("pointerdown",event => {
  const box=ui.profile.getBoundingClientRect(), g=graphGeometry(box.width,box.height);
  const relocate = e => locate(g.min+range((e.clientX-box.left-g.left)/(g.right-g.left),0,1)*(g.max-g.min));
  relocate(event);
  ui.profile.setPointerCapture(event.pointerId);
  ui.profile.onpointermove = relocate;
  const end = () => { ui.profile.onpointermove=null; };
  ui.profile.onpointerup=end;
  ui.profile.onpointercancel=end;
});
function refreshPlan(restart) {
  plan = schedule(state.service,state.mode,state.cars);
  if (restart) {
    time = 0;
    previousFrame = 0;
  }
  if (state.follow && !plan.trains.some(t => t.id === state.follow)) {
    state.follow = plan.trains.find(t => t.line === state.follow[0])?.id ?? null;
  }
  if (restart && state.playing) preparePlaybackView();
  ui.mode.disabled = state.service === "phased";
  ui.mode.value = plan.mode;
  refreshTrains();
  refreshRoute();
  if (restart) refreshEngineering();
  refreshControls();
  renderOperation(plan);
  requestFrame();
}

ui.service.addEventListener("change",event => {
  state.service = event.target.value;
  refreshPlan(true);
});
ui.mode.addEventListener("change",event => {
  state.mode = event.target.value;
  refreshPlan(true);
});
ui.cars.addEventListener("change",event => {
  state.cars = Number(event.target.value);
  refreshPlan(false);
});
for (const id of ["pattern-stop","pattern-dir"]) ui[id].addEventListener("change",() => renderStation(plan));
ui["event-train"].addEventListener("change",() => renderEvents(plan));
ui.operations.addEventListener("click",event => {
  const run = event.target.closest("button[data-run]");
  if (run) renderRun(plan,Number(run.dataset.run));
  const jump = event.target.closest("button[data-jump]");
  if (!jump) return;
  state.playing = false;
  seekTime(Number(jump.dataset.jump));
  follow(jump.dataset.jumpTrain);
  ui.animation.scrollIntoView({block:"nearest"});
});
ui.speed.addEventListener("change",event => { state.speed=Number(event.target.value); });

function preparePlaybackView() {
  const trains = plan.trains.map(t => trainState(plan,time,t.id));
  const span = state.span;
  if (!state.follow && span) {
    const outsideService = span.start.ch >= plan.end;
    const visible = trains.some(t => t.ch >= span.start.ch && t.ch <= span.end.ch);
    if (outsideService || (!visible && state.view !== "detail")) chooseSpan(0);
  }
  if (state.isolate) {
    state.isolate = false;
    refreshParts();
  }
  if (state.view === "detail" && !state.follow) {
    const distance = t => Math.abs(t.ch - state.focus);
    state.follow = trains.reduce((closest, t) => distance(t) < distance(closest) ? t : closest).id;
  }
}

function seekTime(at) {
  time = range(at,0,plan.cycle - .00001);
  previousFrame = 0;
  refreshClock();
  requestFrame();
}

ui.play.addEventListener("click",() => {
  state.playing = !state.playing;
  previousFrame = 0;
  if (state.playing) {
    preparePlaybackView();
    ui.animation.scrollIntoView({block:"nearest"});
  }
  refreshControls();
  requestFrame();
});
ui.restart.addEventListener("click",() => seekTime(0));
ui.time.addEventListener("input",event => {
  state.playing = false;
  seekTime(Number(event.target.value));
  refreshControls();
});
ui.trains.addEventListener("click",event => {
  const line=event.target.closest("[data-follow]")?.dataset.follow;
  if (!line) return;
  follow(state.follow === line ? null : line);
  ui.animation.scrollIntoView({block:"nearest"});
});

function changeZoom(multiplier) {
  state.zoom=range(state.zoom*multiplier,.55,4);
  requestFrame();
}
ui["zoom-in"].addEventListener("click",()=>changeZoom(1.24));
ui["zoom-out"].addEventListener("click",()=>changeZoom(1/1.24));
ui["reset-view"].addEventListener("click",() => {
  state.follow=null;
  resetCamera();
  refreshControls();
  requestFrame();
});
ui.scene.addEventListener("wheel",event => {
  event.preventDefault();
  changeZoom(event.deltaY < 0 ? 1.13 : 1/1.13);
},{passive:false});
bindModelDrag(ui.scene, ui["model-drag"], {
  explode: delta => setExplosion(state.explode + delta),
  rotate: (dx,dy) => {
    if (state.view === "side" || state.view === "plan") resetCamera();
    state.yaw += dx * .007;
    state.pitch = range(state.pitch + dy * .006,.08,1.43);
    refreshControls();
    requestFrame();
  }
});
ui["model-drag"].addEventListener("click",requestFrame);

new ResizeObserver(requestFrame).observe(ui.scene);
new ResizeObserver(requestFrame).observe(ui.profile);
refreshTagLabels();
refreshEngineering();
refreshParts();
refreshPlan(false);

onLanguageChange(() => {
  refreshTagLabels();
  refreshRoute();
  refreshEngineering();
  refreshParts();
  refreshTrains();
  refreshControls();
  renderOperation(plan,true);
  requestFrame();
});
