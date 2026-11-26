import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { StationView, disposeSource } from './model-view.js?v=4';
import { stations } from './stations.js';
import { features, preferredFloors, stationFloors } from './studio-data.js';
import { componentCategories, elevationDatum } from './component-catalog.js';
import { PlanView } from './plan-view.js';
import { downloadFile, downloadImage, makeObj, makeUsdz } from './studio-exports.js';

const symbols = {
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  compare: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/>',
  download: '<path d="M12 3v13m-4-4 4 4 4-4M4 16v4h16v-4"/>',
  edit: '<path d="m14 6 4 4m-13 9 4-.6L20 7.5 16.5 4 5.6 15Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  link: '<path d="M10 13a4.6 4.6 0 0 0 6.8.6l3.1-3.1a4.6 4.6 0 0 0-6.5-6.5l-1.8 1.8"/><path d="M14 11a4.6 4.6 0 0 0-6.8-.6l-3.1 3.1a4.6 4.6 0 0 0 6.5 6.5l1.8-1.8"/>',
  maximize: '<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/>',
  sliders: '<path d="M4 7h5m4 0h7M4 17h9m4 0h3"/><circle cx="11" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
  section: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5m0 0v8.9"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9.5 9 5 9-5m-18 4.5 9 5 9-5"/>',
  floor: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M11 10v10m0-5h9"/>',
  info: '<circle cx="12" cy="12" r="8"/><path d="M12 11v5m0-8h.01"/>',
  rotate: '<path d="M20 11a8 8 0 1 1-2.55-5.86L20 7.5m0-4v4h-4"/>',
  reset: '<path d="M7 4H4v3m13-3h3v3M4 17v3h3m13-3v3h-3"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  moon: '<path d="M19.9 14.6a8.3 8.3 0 0 1-10.5-10.5A8.35 8.35 0 1 0 19.9 14.6Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
  pointer: '<path d="m6 4 13 8-6 1.3-2.3 5.7L6 4Z"/>',
};

const byId = id => document.getElementById(id);
const nav = byId('station-nav');
const studio = byId('studio');
const floorPicker = byId('floors');
const settings = byId('settings-content');
const modeButtons = [...studio.querySelectorAll('.tool[data-mode]')];
const modelExports = [...document.querySelectorAll('[data-export]')];
const statusLine = byId('workspace-status');
const loader = new GLTFLoader();
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pressed = value => String(Boolean(value));
const show = (id, value) => { byId(id).hidden = !value; };
const text = (id, value) => { byId(id).textContent = value; };
const studioViews = {
  plan:['樓層平面','平面圖設定'], whole:['整棟外觀','外觀設定'],
  explode:['樓層拆解','拆解設定'], floor:['單層檢視','單層設定'],
  section:['剖切檢視','剖切設定'], inspect:['構件檢視','站體構件'],
};
const initialMode = new URLSearchParams(location.search).get('view') === 'components' ? 'inspect' : 'explode';

const plansIndex = fetch(new URL('plans/index.json', import.meta.url))
  .then(response => response.ok ? response.json() : {}).catch(() => ({}));
let sheets = {};
let stationKey;
let station;
let state;
let request;
let ready = false;
let planReady = false;
let view;
let selectionPoint;
let dusk = false;
let exporting = false;
let cutFrame = 0;

for (const [key, data] of Object.entries(stations)) {
  const tab = document.createElement('a');
  tab.href = '#' + key;
  tab.className = 'station-tab';
  tab.dataset.station = key;
  tab.innerHTML = `<span class="tab-code">${data.id}</span><span>${data.name}</span>`;
  nav.append(tab);
}
for (const element of document.querySelectorAll('[data-icon]')) {
  element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${symbols[element.dataset.icon]}</svg>`;
}

const plan = new PlanView(byId('plan-canvas'), byId('plan-scale'), (message, drawingReady) => {
  planReady = drawingReady;
  if (state?.mode !== 'plan') return;
  for (const key of Object.keys(features)) plan.setLayer(key, !state.hiddenFeatures.includes(key));
  setLoad(message, {loading: message === '載入樓層平面圖'});
  updateAvailability();
});

function activeFloor() {
  return station.floorSpecs.find(item => item.key === state.floor);
}
function activeSheet() {
  return sheets[activeFloor().sheet];
}
function noteKey() {
  return `hutoupi-station-note:${stationKey}:${state.floor}`;
}
function readNote() {
  try { return localStorage.getItem(noteKey()) || ''; } catch { return ''; }
}
function status(message) {
  text('workspace-status', message);
}

function setLoad(message, {loading = false, retry = false, fallback = false} = {}) {
  show('load-state', Boolean(message));
  show('spinner', loading);
  show('retry', retry);
  byId('load-state').classList.toggle('is-fallback', fallback);
  text('load-label', message);
}

function updateAvailability() {
  const isPlan = state.mode === 'plan';
  const workable = isPlan ? planReady : ready;
  for (const control of modeButtons) control.disabled = control.dataset.mode !== 'plan' && !ready;
  byId('compare').disabled = !ready;
  byId('rotate').disabled = !ready || isPlan;
  for (const id of ['zoom-in','zoom-out','reset','export-png']) byId(id).disabled = !workable;
  for (const button of modelExports) button.disabled = !ready || exporting;
  show('left-scale', !isPlan && ready);
  show('right-scale', state.compare && ready);
  show('plan-scale', isPlan && planReady);
}

function readRoute() {
  const key = location.hash.slice(1).toLowerCase();
  return Object.hasOwn(stations, key) ? key : 't1';
}

function makeViewer() {
  try {
    view = new StationView({
      left: byId('left-canvas'), right: byId('right-canvas'),
      leftScale: byId('left-scale'), rightScale: byId('right-scale'),
    }, {
      spacing: setSpacing,
      select: selectPart,
      contextLost: useFallback,
      contextRestored: () => openStation(stationKey),
    });
  } catch (error) {
    console.error('3D viewer initialization failed', error);
  }
}

function useFallback() {
  ready = false;
  const host = byId('left-canvas');
  const img = document.createElement('img');
  img.src = `assets/posters/${stationKey}.webp`;
  img.alt = station.name + '站體軸測圖';
  host.querySelector('img')?.remove();
  host.append(img);
  if (state.mode !== 'plan') setLoad('3D 暫以軸測圖顯示，可切換 2D 平面。', {fallback:true});
  syncLayout();
}

async function openStation(key) {
  request?.abort();
  plan.clear();
  planReady = false;
  stationKey = key;
  station = {...stations[key], floorSpecs:stationFloors[key]};
  state = {
    mode: state?.mode ?? initialMode, floor: preferredFloors[key], compare: state?.compare ?? false, sync: false,
    spacing: state?.spacing ?? 2.4, explodeTool:'spacing', terrain: !station.hideTerrainInitially,
    underground: false, cutaway: false, preset:'iso', axis:'z', depth:50,
    depths:{x:50, z:50}, opposite:false, hiddenFeatures:[], featureFocus:false, showNotes:true, rotate:false,
    partCategory:'all', partId:null, partOnly:false, partFocus:false, planComponent:null,
  };
  ready = false;
  selectionPoint = null;
  for (const tab of nav.children) {
    if (tab.dataset.station === key) tab.setAttribute('aria-current','page');
    else tab.removeAttribute('aria-current');
  }
  text('station-code',station.id);
  text('station-title',station.name);
  text('station-description',station.description);
  document.title = `${station.id} ${station.name}｜虎頭埤四站站體工作台`;
  const file = new URL(`models/${key}.glb`, import.meta.url);
  byId('export-glb').href = file.href;
  byId('export-glb').download = `Hutoupi-${station.id}.glb`;
  status('');
  const controller = new AbortController();
  request = controller;
  view?.setRotation(false);
  view?.clear();
  byId('left-canvas').querySelector('img')?.remove();
  drawFloorPicker(true);
  syncLayout();
  drawSettings();
  if (state.mode !== 'plan') setLoad('載入站體模型', {loading:true});
  if (!view) useFallback();
  plansIndex.then(index => {
    if (controller.signal.aborted) return;
    sheets = index;
    updateSheetLinks();
    if (state.mode === 'inspect') drawPartPlan();
    if (state.mode === 'plan' && !plan.data && !planReady) openPlan();
  });
  if (!view) return;
  try {
    const response = await fetch(file, {signal:controller.signal});
    if (!response.ok) throw new Error('Station model HTTP ' + response.status);
    const gltf = await loader.parseAsync(await response.arrayBuffer(), new URL('.', file).href);
    if (controller.signal.aborted) { disposeSource(gltf.scene); return; }
    view.load(gltf.scene,station,state);
    state.depths = {x:view.sectionPercent('x'), z:view.sectionPercent('z')};
    state.depth = state.depths[state.axis];
    if (state.mode === 'section') view.setSection(state);
    view.setDusk(dusk);
    view.setSync(state.sync);
    ready = true;
    if (state.mode !== 'plan') setLoad('');
    syncLayout();
    view.preset(state.preset);
    drawSettings();
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error('Station model load failed', error);
    useFallback();
    if (state.mode !== 'plan') setLoad('站體模型載入失敗', {retry:true, fallback:true});
  }
}

function updateSheetLinks() {
  const floor = activeFloor();
  const sheet = activeSheet();
  for (const type of ['pdf','dxf']) {
    const link = byId('export-' + type);
    if (!sheet) { link.removeAttribute('href'); continue; }
    link.href = new URL(`plans/${sheet.file}.${type}`, import.meta.url).href;
    link.download = `Hutoupi-${station.id}-${floor.key}-${floor.sheet}.${type}`;
  }
  drawSettings();
}

function drawFloorPicker(rebuild = false) {
  const data = activeFloor();
  text('floor-count', `${station.floorSpecs.length} 層`);
  if (rebuild) {
    floorPicker.innerHTML = station.floorSpecs.slice().reverse().map(floor =>
      `<button type="button" class="floor-button" data-floor="${floor.key}" aria-pressed="false" aria-label="${esc(floor.short === floor.name ? floor.name : floor.short + ' ' + floor.name)}">
        <span class="floor-short">${esc(floor.short)}</span><span class="floor-el">${floor.short.startsWith('EL') ? esc(floor.name) : `EL ${floor.el} m`}</span>
      </button>`).join('');
  }
  for (const button of floorPicker.children) button.setAttribute('aria-pressed', pressed(button.dataset.floor === data.key));
  if (rebuild) requestAnimationFrame(() => {
    const selected = floorPicker.querySelector('[aria-pressed="true"]');
    if (!selected || floorPicker.scrollWidth <= floorPicker.clientWidth) return;
    const list = floorPicker.getBoundingClientRect();
    const button = selected.getBoundingClientRect();
    if (button.left < list.left || button.right > list.right) {
      floorPicker.scrollLeft += button.left - list.left - (list.width - button.width) / 2;
    }
  });
  text('floor-name', data.name);
  text('floor-description', data.details);
  text('note-button-label', readNote() ? '查看或編輯備註' : '樓層備註');
  updateSheetLinks();
}

function group(label, contents) {
  return `<div class="settings-group"><div class="control-label">${label}</div>${contents}</div>`;
}
function segmented(name, options, current) {
  return `<div class="segmented" role="group" aria-label="${name}">${options.map(([key, label]) =>
    `<button type="button" data-option="${key}" aria-pressed="${pressed(current === key)}">${label}</button>`).join('')}</div>`;
}
function check(id, label, current, enabled = true) {
  return `<label class="checkline"><input type="checkbox" id="${id}" ${current ? 'checked' : ''} ${enabled ? '' : 'disabled'}><span>${label}</span></label>`;
}
function range(id, label, value, max, step, unit) {
  return `<div class="settings-group"><label class="control-label" for="${id}">${label}
    <output for="${id}">${unit === 'm' ? value.toFixed(1) + ' m' : value + '%'}</output></label>
    <input type="range" class="range" id="${id}" min="0" max="${max}" step="${step}" value="${value}"></div>`;
}

function visibleFeatures() {
  if (state.mode === 'plan') return new Set(activeSheet()?.features ?? []);
  if (!ready) return new Set();
  if (state.mode === 'floor') {
    const list = new Set();
    view.layerObjects[0]?.group.traverse(item => {
      const feature = item.userData.entry?.feature;
      if (feature) list.add(feature);
    });
    // Hidden items remain available for re-enabling.
    for (const feature of state.hiddenFeatures) list.add(feature);
    return list;
  }
  return new Set(view.entries.map(entry => entry.feature).filter(Boolean));
}

function drawSettings() {
  if (!state) return;
  text('settings-title',studioViews[state.mode][1]);
  const isPlan = state.mode === 'plan';
  const availability = visibleFeatures();
  const layerToggles = Array.from(availability).sort((a, b) => Object.keys(features).indexOf(a) - Object.keys(features).indexOf(b)).map(key =>
    check('feature-' + key, features[key][0], !state.hiddenFeatures.includes(key))).join('');
  const opts = layerToggles
    ? group('顯示構件', `<div class="feature-control">${layerToggles}</div>` + check('show-features', '強調已標記構件', state.featureFocus))
    : '';
  const sheet = activeSheet();
  if (isPlan) {
    settings.innerHTML = (state.planComponent
      ? group('圖面構件', `<div class="part-plan-actions">
          <button type="button" class="plain-button" data-plan-action="complete">顯示完整平面</button>
          ${ready ? '<button type="button" class="plain-button" data-plan-action="back">返回構件</button>' : ''}
        </div>`)
      : '')
      + (sheet
      ? group(esc(activeFloor().sheet), `<p class="settings-copy">${esc(sheet.title)}</p>`)
      : '<p class="settings-copy">等待樓層圖說。</p>')
      + group('圖面', check('show-labels', '顯示尺寸與文字', state.showNotes))
      + opts;
    return;
  }
  if (!ready) { settings.replaceChildren(); return; }
  const preset = group('視角', segmented('預設視角', [['iso','軸測'],['front','正視'],['top','俯視']],state.preset));
  const options = check('show-terrain','基地與景觀',state.terrain)
    + check('transparent-shell','牆體透視',state.cutaway)
    + (['section','explode'].includes(state.mode) && station.hidden.length ? check('show-underground','地下構件',state.underground) : '')
    + (station.focus ? check('show-core','聚焦站廳',state.focus) : '')
    + (state.compare ? check('sync-view','同步雙視窗視角',state.sync) : '');

  if (state.mode === 'inspect') {
    drawInspector(preset + group('模型顯示', options) + opts);
    return;
  }

  let main = '';
  if (state.mode === 'explode') {
    main = range('layer-spacing','樓層間距',state.spacing,12,.1,'m')
      + group('拖曳操作', segmented('拖曳操作', [['spacing','拉開樓層'],['orbit','旋轉站體']],state.explodeTool));
  } else if (state.mode === 'section') {
    main = group('剖切方向',segmented('剖切方向',[['z','縱剖'],['x','橫剖']],state.axis))
      + range('cut-depth','剖切深度',state.depth,100,1,'%')
      + `<div class="settings-group"><button type="button" class="plain-button" id="opposite" aria-pressed="${pressed(state.opposite)}">保留另一側</button></div>`;
  }
  settings.innerHTML = main + preset + group('模型顯示',options) + opts;
}

function drawInspector(options) {
  const choices = [['all','全部構件'], ...Object.entries(componentCategories)];
  settings.innerHTML = `<div class="part-head">
      <label for="part-category">3D 構件</label>
      <span id="part-count"></span>
    </div>
    <select id="part-category">${choices.map(([value,label]) => `<option value="${value}" ${state.partCategory === value ? 'selected' : ''}>${label}</option>`).join('')}</select>
    <div class="part-list" id="part-list" role="group" aria-label="三維構件清單"></div>
    <div class="property part-property" id="property" aria-live="polite"></div>
    <div class="part-actions" role="group" aria-label="構件操作">
      <button type="button" class="plain-button" data-part-action="only" aria-pressed="false">單獨顯示</button>
      <button type="button" class="plain-button" data-part-action="frame">定位構件</button>
      <button type="button" class="text-button" data-part-action="clear">恢復全站</button>
    </div>
    <details class="part-details">
      <summary><span>2D 樓層構件</span><span class="part-detail-caption">樓梯、電梯、門窗</span></summary>
      <div class="part-details-body">
        <label for="part-plan-floor">圖面樓層</label>
        <select id="part-plan-floor">
          ${station.floorSpecs.map(floor =>
            `<option value="${esc(floor.key)}">${esc(floor.short)} · ${esc(floor.name)}</option>`).join('')}
        </select>
        <div id="part-plan-items"></div>
      </div>
    </details>
    <details class="part-details">
      <summary>視角與模型顯示</summary>
      <div class="part-details-body">${options}</div>
    </details>`;
  drawPartList();
  drawPartPlan();
}

function drawPartList() {
  const items = [...view.components.values()].filter(part => state.partCategory === 'all' || part.category === state.partCategory);
  text('part-count', `${items.length} 組`);
  byId('part-list').innerHTML = items.length
    ? items.map(part => `<button type="button" class="part-row" data-part="${part.id}" aria-pressed="false">${esc(part.name)}</button>`).join('')
    : '<p class="settings-copy">這一類在本模型無獨立構件。</p>';
  drawPartSelection();
}

function drawPartPlan() {
  const contents = byId('part-plan-items');
  if (!contents) return;
  byId('part-plan-floor').value = state.floor;
  const sheet = activeSheet();
  if (!sheet) {
    contents.textContent = '圖面資料準備中。';
    return;
  }
  const layers = Object.keys(features).filter(key => sheet.features.includes(key));
  const buttons = layers.map(key => `<button type="button" class="part-plan-item" data-plan-part="${key}">
      <i style="--part-color:${features[key][1]}" aria-hidden="true"></i>${features[key][0]}<span aria-hidden="true">↗</span>
    </button>`).join('');
  contents.innerHTML = `<p class="part-sheet">${esc(activeFloor().sheet)}</p>${buttons || '<p class="settings-copy">此圖面沒有可單獨標示的構件圖層。</p>'}`;
}

function drawPartSelection() {
  const property = byId('property');
  if (!property || state.mode !== 'inspect') return;
  const part = view.components.get(state.partId);
  for (const button of settings.querySelectorAll('[data-part]')) {
    button.setAttribute('aria-pressed', pressed(button.dataset.part === state.partId));
  }
  for (const button of settings.querySelectorAll('[data-part-action]')) {
    button.disabled = !part;
    if (button.dataset.partAction === 'only') {
      button.setAttribute('aria-pressed', pressed(state.partOnly));
      button.textContent = state.partOnly ? '顯示周邊' : '單獨顯示';
    }
  }
  const caption = byId('left-label');
  caption.classList.toggle('has-selection', Boolean(part));
  caption.textContent = part ? `${state.partOnly ? '單獨顯示' : '已選取'} · ${part.name}` : studioViews.inspect[0];
  if (!part) {
    property.textContent = '從清單選取，或直接點選模型。';
    return;
  }
  const datum = elevationDatum[station.id];
  const minimum = (part.bounds.min.y + datum).toFixed(2);
  const maximum = (part.bounds.max.y + datum).toFixed(2);
  const elevations = minimum === maximum ? minimum : `${minimum}–${maximum}`;
  const point = selectionPoint
    ? `<div>${selectionPoint.floor ? esc(selectionPoint.floor) + ' · ' : ''}點選 EL ${selectionPoint.elevation} m</div>`
    : '';
  property.innerHTML = `<strong>${esc(part.name)}</strong><div>模型高程 EL ${elevations} m</div>${point}`;
}

function selectPart(id, point = null) {
  if (!ready || state.mode !== 'inspect') return;
  const part = view.components.get(id);
  const previous = state.partId;
  const wasFramed = view.partFramed;
  state.partId = part?.id ?? null;
  selectionPoint = point;
  if (!part) {
    state.partOnly = false;
    state.partFocus = false;
  } else if (state.partCategory !== 'all' && part.category !== state.partCategory) {
    state.partCategory = part.category;
    byId('part-category').value = state.partCategory;
    drawPartList();
  }
  if (previous !== state.partId) {
    view.updateState(state);
    if (wasFramed || view.partFramed) view.fit(view.direction());
  }
  drawPartSelection();
}

function framePart(action) {
  if (!state.partId) return;
  if (action === 'clear') {
    selectPart(null);
    return;
  }
  if (action === 'only') state.partOnly = !state.partOnly;
  if (action === 'frame') state.partFocus = true;
  view.updateState(state);
  view.fit(view.direction());
  drawPartSelection();
  byId('left-panel').scrollIntoView({block:'nearest'});
}

function updateHint() {
  text('drag-hint', state.mode === 'plan' ? '拖曳平移，雙指或滾輪縮放'
    : state.mode === 'explode' && state.explodeTool === 'spacing' ? '垂直拖曳拆解，滾輪縮放'
    : '拖曳旋轉，右鍵平移，滾輪縮放');
}

function syncLayout() {
  const isPlan = state.mode === 'plan';
  studio.dataset.mode = state.mode;
  studio.dataset.compare = pressed(state.compare && ready);
  for (const button of modeButtons) button.setAttribute('aria-pressed', pressed(button.dataset.mode === state.mode));
  byId('left-label').classList.remove('has-selection');
  text('left-label', isPlan ? activeFloor().sheet + ' 平面圖' + (state.planComponent ? ' · ' + features[state.planComponent][0] : '') : studioViews[state.mode][0]);
  text('right-label', isPlan ? '同層 3D 俯視' : '完整外觀');
  text('compare-label', isPlan ? '對照同層 3D' : '外觀對照');
  byId('compare').setAttribute('aria-pressed', pressed(state.compare && ready));
  byId('rotate').setAttribute('aria-pressed', pressed(state.rotate));
  show('plan-canvas', isPlan);
  show('left-canvas', !isPlan);
  show('right-panel', state.compare && ready);
  show('light-toggle', !isPlan);
  byId('right-panel').dataset.light = !isPlan && dusk ? 'dusk' : 'day';
  updateHint();
  updateAvailability();
}

function openPlan() {
  planReady = false;
  const sheet = activeSheet();
  if (sheet) plan.open(sheet);
  else setLoad('平面圖資料準備中', {loading:true});
  plan.markFeatures(state.featureFocus);
  plan.showLabels(state.showNotes);
}

function switchMode(mode, force = false, planComponent = null) {
  if (!force && state.mode === mode) return;
  if (mode !== 'plan' && !ready) return;
  const leavingPlan = state.mode === 'plan';
  state.mode = mode;
  state.rotate = false;
  state.planComponent = planComponent;
  state.featureFocus = Boolean(planComponent);
  state.hiddenFeatures = planComponent ? Object.keys(features).filter(key => key !== planComponent) : [];
  state.partId = null;
  state.partOnly = false;
  state.partFocus = false;
  selectionPoint = null;
  if (leavingPlan && mode !== 'plan') { plan.clear(); planReady = false; }
  if (mode === 'plan') openPlan();
  else setLoad('');
  status('');
  syncLayout();
  if (ready) {
    view.setRotation(false);
    view.setDusk(mode !== 'plan' && dusk);
    view.updateState(state);
    view.preset(state.preset);
  }
  drawSettings();
}

function setSpacing(value) {
  state.spacing = value;
  const input = byId('layer-spacing');
  if (input) {
    input.value = value;
    settings.querySelector('output[for="layer-spacing"]').textContent = `${value.toFixed(1)} m`;
  }
  if (ready) view.setSpacing(value);
}

function updateSection() {
  if (cutFrame || !ready) return;
  cutFrame = requestAnimationFrame(() => {
    cutFrame = 0;
    if (ready && state.mode === 'section') view.setSection(state);
  });
}

function refreshModel() {
  if (!ready) return;
  view.updateState(state);
  drawPartSelection();
}

for (const button of modeButtons) button.addEventListener('click', () => switchMode(button.dataset.mode));
floorPicker.addEventListener('click', event => {
  const button = event.target.closest('[data-floor]');
  if (!button || state.floor === button.dataset.floor && ['plan','floor'].includes(state.mode)) return;
  state.floor = button.dataset.floor;
  drawFloorPicker();
  switchMode(state.mode === 'plan' || !ready ? 'plan' : 'floor', true);
});

settings.addEventListener('input', event => {
  if (event.target.id === 'layer-spacing') setSpacing(Number(event.target.value));
  if (event.target.id === 'cut-depth') {
    state.depth = Number(event.target.value);
    state.depths[state.axis] = state.depth;
    settings.querySelector('output[for="cut-depth"]').textContent = state.depth + '%';
    updateSection();
  }
});

settings.addEventListener('change', event => {
  const {id,checked} = event.target;
  if (id === 'part-category') {
    state.partCategory = event.target.value;
    drawPartList();
    return;
  }
  if (id === 'part-plan-floor') {
    state.floor = event.target.value;
    drawFloorPicker();
    drawPartPlan();
    return;
  }
  if (id === 'layer-spacing') {
    view.fit(view.direction());
    return;
  }
  if (id.startsWith('feature-')) {
    const feature = id.slice(8);
    state.hiddenFeatures = state.hiddenFeatures.filter(key => key !== feature);
    if (!checked) state.hiddenFeatures.push(feature);
    if (state.mode === 'plan') plan.setLayer(feature,checked);
    else refreshModel();
    return;
  }
  if (id === 'show-labels') {
    state.showNotes = checked;
    plan.showLabels(checked);
    return;
  }
  if (id === 'show-features') {
    state.featureFocus = checked;
    if (state.mode === 'plan') plan.markFeatures(checked);
    else refreshModel();
    return;
  }
  if (id === 'sync-view') {
    state.sync = checked;
    view.setSync(checked);
    view.fit(view.direction());
    return;
  }
  const keys = {'show-terrain':'terrain','show-underground':'underground','show-core':'focus','transparent-shell':'cutaway'};
  if (!keys[id]) return;
  state[keys[id]] = checked;
  refreshModel();
  if (id !== 'transparent-shell') view.fit(view.direction());
});

settings.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const {part,partAction,planPart,planAction,option} = button.dataset;
  if (planPart && activeSheet()?.features.includes(planPart)) {
    switchMode('plan', true, planPart);
    byId('left-panel').scrollIntoView({block:'nearest'});
    return;
  }
  if (planAction) {
    switchMode(planAction === 'back' ? 'inspect' : 'plan', true);
    return;
  }
  if (!ready) return;
  if (part) { selectPart(part); return; }
  if (partAction) { framePart(partAction); return; }
  if (button.id === 'opposite') {
    state.opposite = !state.opposite;
    button.setAttribute('aria-pressed',pressed(state.opposite));
    updateSection();
  }
  if (!option) return;
  if (option === 'x' || option === 'z') {
    state.axis = option;
    state.depth = state.depths[option];
    byId('cut-depth').value = state.depth;
    settings.querySelector('output[for="cut-depth"]').textContent = state.depth + '%';
    updateSection();
  } else if (option === 'spacing' || option === 'orbit') {
    state.explodeTool = option;
    refreshModel();
    updateHint();
  } else {
    state.preset = option;
    view.preset(option);
  }
  for (const peer of button.parentElement.children) peer.setAttribute('aria-pressed',pressed(peer === button));
});

byId('compare').addEventListener('click', () => {
  state.compare = !state.compare;
  syncLayout();
  refreshModel();
  view.preset(state.preset);
  drawSettings();
});
byId('light-toggle').addEventListener('click', () => {
  dusk = !dusk;
  byId('right-panel').dataset.light = dusk ? 'dusk' : 'day';
  byId('light-toggle').setAttribute('aria-pressed',pressed(dusk));
  view.setDusk(dusk);
});
byId('rotate').addEventListener('click', () => {
  state.rotate = !state.rotate;
  byId('rotate').setAttribute('aria-pressed',pressed(state.rotate));
  view.setRotation(state.rotate);
});
byId('reset').addEventListener('click', () => {
  if (state.mode === 'plan') { plan.fit(); return; }
  state.rotate = false;
  byId('rotate').setAttribute('aria-pressed','false');
  view.setRotation(false);
  state.preset = 'iso';
  view.preset('iso');
  drawSettings();
});
function zoomBy(factor) {
  if (state.mode === 'plan') { plan.zoomBy(factor); return; }
  const camera = view.left.camera;
  camera.zoom = Math.max(.22, Math.min(16,camera.zoom * factor));
  camera.updateProjectionMatrix();
  view.cameraChanged(view.left);
}
byId('zoom-in').addEventListener('click', () => zoomBy(1.25));
byId('zoom-out').addEventListener('click', () => zoomBy(.8));
byId('retry').addEventListener('click', () => openStation(stationKey));

const fullButton = byId('full-screen');
function fullscreenStatus() {
  const full = document.fullscreenElement === studio || studio.classList.contains('is-fullview');
  text('full-label', full ? '退出全螢幕' : '全螢幕');
  fullButton.setAttribute('aria-pressed',pressed(full));
}
fullButton.addEventListener('click', async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else if (studio.classList.contains('is-fullview')) studio.classList.remove('is-fullview');
  else if (document.fullscreenEnabled) {
    try { await studio.requestFullscreen(); } catch { studio.classList.add('is-fullview'); }
  } else studio.classList.add('is-fullview');
  fullscreenStatus();
});
document.addEventListener('fullscreenchange',fullscreenStatus);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && studio.classList.contains('is-fullview')) {
    studio.classList.remove('is-fullview');
    fullscreenStatus();
  }
  if (event.key === 'Escape' && byId('export-menu').open) {
    byId('export-menu').open = false;
    byId('export-menu').querySelector('summary').focus();
  }
});

const notes = byId('note-dialog');
byId('floor-note').addEventListener('click', () => {
  text('note-title', `${station.id} ${activeFloor().short}｜樓層備註`);
  byId('note-input').value = readNote();
  notes.showModal();
});
byId('close-note').addEventListener('click', () => notes.close());
byId('note-form').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const value = byId('note-input').value.trim();
    if (value) localStorage.setItem(noteKey(),value);
    else localStorage.removeItem(noteKey());
    notes.close();
    drawFloorPicker();
    status('樓層備註已儲存。');
  } catch { status('此瀏覽器目前無法儲存備註。'); }
});

const exportMenu = byId('export-menu');
document.addEventListener('click', event => {
  if (exportMenu.open && !exportMenu.contains(event.target)) exportMenu.open = false;
});
exportMenu.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (link) exportMenu.open = false;
});
byId('export-png').addEventListener('click', async () => {
  const isPlan = state.mode === 'plan';
  const file = `${station.id}-${activeFloor().short}-${studioViews[state.mode][0]}`;
  const subtitle = `${station.name} · ${isPlan ? activeFloor().sheet + ' 工程圖說 V1.6' : '樓層與站體檢視'}`;
  exportMenu.open = false;
  status('正在準備 PNG。');
  try {
    const panels = [isPlan ? {canvas:plan.canvas, render:() => plan.draw(), fill:'#f8fbf9'}
      : {canvas:view.left.canvas, render:() => view.left.render(), fill:'#e7eee8'}];
    if (state.compare && ready) panels.push({canvas:view.right.canvas, render:() => view.right.render(),
      fill:!isPlan && dusk ? '#2c4655' : '#e4ece7'});
    await downloadImage(panels,file,subtitle);
    status('PNG 已產生。');
  } catch { status('PNG 匯出失敗，請再試一次。'); }
});
for (const button of modelExports) button.addEventListener('click', async () => {
  if (!ready || exporting) return;
  const root = view.source;
  const id = station.id;
  const kind = button.dataset.export;
  exporting = true;
  updateAvailability();
  exportMenu.open = false;
  status(`正在準備整站 ${kind.toUpperCase()}。`);
  await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve,0)));
  try {
    if (view.source !== root) return;
    const obj = kind === 'obj';
    const data = obj ? makeObj(root,id) : makeUsdz(root,id);
    downloadFile(data,`Hutoupi-${id}.${kind}`,obj ? 'text/plain' : 'model/vnd.usdz+zip');
    status(`${kind.toUpperCase()} 已產生。`);
  } catch (error) {
    console.error('Model export failed',error);
    status(`${kind.toUpperCase()} 匯出失敗，請再試一次。`);
  } finally {
    exporting = false;
    updateAvailability();
  }
});

window.addEventListener('hashchange', () => {
  const key = readRoute();
  if (key !== stationKey) openStation(key);
});
makeViewer();
openStation(readRoute());
