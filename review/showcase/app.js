// 站體展示館 — station / platform / floor / element viewer (Hutoupi T1–T4, IFC4 V1.6)
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const META = JSON.parse(document.getElementById('meta').textContent);
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => Number(n).toLocaleString('zh-Hant');
const elf = v => (v == null ? '—' : Number(v).toFixed(2));
const SITE = new Set(['基地底板', '水面', '泳池水面', '草地', '石材鋪面', '道路鋪面', '樹幹', '樹冠']);
const GLOW = new Set(['玻璃', '車窗玻璃', '光舟網殼外皮（木格＋ETFE）']);
const norm = g => String(g).replace(/\s\d+$/, '');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------- renderer
const canvas = $('#gl');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!META.shot });
} catch (e) { $('#fail').hidden = false; throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.3, 4000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495;
controls.screenSpacePanning = true;

const hemi = new THREE.HemisphereLight(0xdfeef2, 0x8c8a7a, 1.1);
const sun = new THREE.DirectionalLight(0xfff6e5, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
const fill = new THREE.DirectionalLight(0xe8f0f4, 0.9);
const amb = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(hemi, sun, sun.target, fill, amb);

const ghostMat = new THREE.MeshStandardMaterial({ color: 0xa9b8b6, transparent: true, opacity: 0.09, depthWrite: false, roughness: 1 });
const pickMat = new THREE.MeshBasicMaterial({ color: 0xe4572e, transparent: true, opacity: 0.82, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.DoubleSide });

const hPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
const vPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
renderer.localClippingEnabled = false;

// ---------------------------------------------------------------- state
window.__show = () => ({ renderer, scene, sun, camera, controls, meshes });
const S = { interior: true, focus: null, isolate: false, cutEL: null, vcut: null, explode: 0, hidden: new Set(), site: true, mode: 'orbit', time: 'day', picked: null, pins: true };
let intr = null, data, meshes = [], storeys = [], byCode = {}, groupsAll = [], bld = new THREE.Box3(), zero = 0, platform = META.platform;

const loadEl = $('#load');
const loader = new GLTFLoader();
Promise.all([
  fetch('data.json').then(r => r.json()),
  new Promise((res, rej) => loader.load('model.glb', res, ev => { if (ev.total) loadEl.textContent = `載入站體模型 ${Math.round(ev.loaded / ev.total * 100)}%`; }, rej)),
]).then(([d, gltf]) => init(d, gltf)).catch(err => {
  loadEl.classList.add('err');
  loadEl.innerHTML = '模型載入失敗，請重新整理頁面。<button type="button">重新整理</button>';
  loadEl.querySelector('button').onclick = () => location.reload();
  console.error(err);
});

function init(d, gltf) {
  data = d; zero = d.zeroEL;
  storeys = d.storeys.slice().sort((a, b) => a.el - b.el);
  storeys.forEach((s, i) => { s.i = i; s.y = s.el - zero; s.box3 = new THREE.Box3(); byCode[s.code] = s; s.meta = (META.floors || {})[s.code] || {}; });
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const ex = o.userData || {};
    o.userData.storey = ex.storey; o.userData.group = norm(ex.group);
    const m = o.material;
    if (!m.userData.prepped) {
      m.userData.prepped = true;
      m.color.convertSRGBToLinear();
      m.side = THREE.DoubleSide;
      if (m.transparent) { m.depthWrite = false; m.opacity = Math.max(m.opacity, 0.32); }
    }
    o.userData.base = m;
    o.castShadow = !m.transparent; o.receiveShadow = true;
    o.geometry.computeBoundingBox();
    const s = byCode[ex.storey];
    if (s && !SITE.has(o.userData.group)) s.box3.union(o.geometry.boundingBox);
    if (!SITE.has(o.userData.group)) bld.union(o.geometry.boundingBox);
    meshes.push(o);
  });
  scene.add(gltf.scene);
  storeys.forEach(s => { if (s.box3.isEmpty() && s.box) s.box3.set(new THREE.Vector3(...s.box.slice(0, 3)), new THREE.Vector3(...s.box.slice(3))); });
  const gm = new Map();
  d.groups.forEach(([g, n, c]) => { const k = norm(g); const v = gm.get(k) || { n: 0, c }; v.n += n; gm.set(k, v); });
  groupsAll = [...gm].map(([g, v]) => ({ g, n: v.n, c: v.c || '#999' }));

  // shadows bound to building
  const c = bld.getCenter(new THREE.Vector3()), sz = bld.getSize(new THREE.Vector3());
  const R = Math.max(sz.x, sz.z) * 0.75 + 20;
  Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: R * 4 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.copy(c);

  resize();
  buildUI();
  applyTime('day', true);
  readHash();
  loadEl.classList.add('out');
  setTimeout(() => loadEl.hidden = true, 700);
  resize();
  requestAnimationFrame(tick);
  if (META.shot) setTimeout(() => document.body.dataset.ready = '1', 600);
  loadInterior();
}

// ---------------------------------------------------------------- interior fit-out from floor DXF
function loadInterior() {
  Promise.all([
    fetch('interior.json').then(r => (r.ok ? r.json() : null)).catch(() => null),
    new Promise(res => loader.load('interior.glb', res, undefined, () => res(null))),
  ]).then(([j, g]) => {
    if (!j || !g) return;
    intr = j;
    const cnt = new Map();
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      const ex = o.userData || {};
      o.userData.storey = ex.storey; o.userData.group = ex.group; o.userData.interior = ex.interior;
      const m = o.material;
      if (!m.userData.prepped) { m.userData.prepped = true; m.side = THREE.DoubleSide; if (m.transparent) m.depthWrite = false; }
      o.userData.base = m;
      o.castShadow = ex.interior !== 'floor' && !m.transparent; o.receiveShadow = true;
      o.geometry.computeBoundingBox();
      meshes.push(o);
      const k = ex.storey + '|' + ex.group; cnt.set(k, (cnt.get(k) || 0) + 1);
    });
    scene.add(g.scene);
    const gc = new Map();
    for (const [k, n] of cnt) {
      const [code, grp] = k.split('|'), s = byCode[code];
      if (s) s.groups = (s.groups || []).concat([[grp, n]]);
      gc.set(grp, (gc.get(grp) || 0) + n);
    }
    const IC = { '室內・空間地坪': '#e9d6b4', '室內・牆體': '#e6e0d6', '室內・隔間': '#f2efe8', '室內・柱': '#d6d1c7', '室內・玻璃隔間': '#9ecbd8', '室內・樓板外緣': '#5c6a69', '室內・樓梯電梯': '#736b5e', '室內・月台': '#dcb873' };
    for (const [grp, n] of gc) groupsAll.push({ g: grp, n, c: IC[grp] || '#bbb' });
    $('#sum').innerHTML += `<b>${fmt(intr.rooms.length)}</b> 空間`;
    applyTime(S.time, true);
    $('#pb').dataset.key = ''; apply();
  });
}
function roomTitle(r) { return r[1] || r[3] || '未命名空間'; }
function pickRoom(ri, frame = false) {
  clearPick(false);
  const r = intr.rooms[ri]; if (!r) return;
  const parts = [];
  for (const m of meshes) {
    if (m.userData.interior !== 'floor' || m.userData.storey !== r[0]) continue;
    const tri = trisOf(m, ri, '_room'); if (!tri.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', m.geometry.attributes.position); g.setIndex(tri);
    const hl = new THREE.Mesh(g, pickMat); hl.renderOrder = 10; m.add(hl); parts.push(hl);
  }
  const box = new THREE.Box3();
  parts.forEach(p => { p.geometry.computeBoundingBox(); const b = p.geometry.boundingBox.clone(); b.min.y += p.parent.position.y; b.max.y += p.parent.position.y + 2.5; box.union(b); });
  S.picked = { room: ri, parts, box };
  showRoom(ri);
  if (frame && !box.isEmpty()) {
    const c = box.getCenter(new THREE.Vector3()), rad = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 4);
    flyTo(c.clone().add(new THREE.Vector3(0.35, 1, 0.55).normalize().multiplyScalar(rad * 2.6 + 8)), c);
  }
  document.querySelectorAll('.rooms li[aria-current]').forEach(x => x.removeAttribute('aria-current'));
  const li = document.querySelector(`.rooms li[data-r="${ri}"]`); if (li) li.setAttribute('aria-current', 'true');
}
function showRoom(ri) {
  const r = intr.rooms[ri], st = byCode[r[0]];
  const box = $('#info'); box.hidden = false;
  box.innerHTML = `<div class="info-h"><b><i class="sw" style="background:${esc(r[10])}"></i>${esc(roomTitle(r))}</b><button type="button" class="x" aria-label="關閉空間資訊">×</button></div>
  ${r[2] ? `<p class="info-d">${esc(r[2])}</p>` : ''}
  <dl>
    <div><dt>樓層</dt><dd>${esc(r[0])}${st ? `　EL ${elf(st.el)}` : ''}</dd></div>
    <div><dt>面積</dt><dd>約 ${fmt(Math.round(r[5]))} m²</dd></div>
    ${r[3] && r[1] ? `<div><dt>用途分類</dt><dd>${esc(r[3])}</dd></div>` : ''}
    ${r[4] ? `<div><dt>編號</dt><dd>${esc(r[4])}</dd></div>` : ''}
    <div><dt>來源平面</dt><dd>${esc(r[9])}</dd></div>
  </dl>
  <div class="info-a">${st && S.focus !== r[0] ? `<button type="button" data-f="${esc(r[0])}">看 ${esc(r[0])} 層</button>` : ''}<button type="button" data-z>拉近空間</button><button type="button" data-w>走進這裡</button></div>`;
  box.querySelector('.x').onclick = () => clearPick();
  box.querySelector('[data-z]').onclick = () => pickRoom(ri, true);
  box.querySelector('[data-w]').onclick = () => walkTo(ri);
  const f = box.querySelector('[data-f]'); if (f) f.onclick = () => { focusFloor(f.dataset.f); pickRoom(ri, true); };
}
function walkTo(ri) {
  const r = intr.rooms[ri], s = byCode[r[0]]; if (!s) return;
  clearPick(); S.walkInit = true; if (S.mode !== 'walk') setMode('walk');
  camera.position.set(r[6], s.y + 1.6 + s.i * S.explode * 9, r[8]);
  S.walkFloor = r[0]; syncWalk();
}

// ---------------------------------------------------------------- visibility, ghosting, explode, cuts
function apply() {
  for (const m of meshes) {
    const g = m.userData.group, s = m.userData.storey;
    let vis = !S.hidden.has(g) && (S.site || !SITE.has(g));
    let mat = m.userData.base;
    if (S.focus && s !== S.focus) {
      if (S.isolate || m.userData.interior) vis = false;
      mat = ghostMat;
    }
    if (m.userData.interior && !S.interior) vis = false;
    m.visible = vis; m.material = mat;
    m.userData.pickable = vis && mat !== ghostMat;
    const st = byCode[s];
    m.position.y = st ? st.i * S.explode * 9 : 0;
  }
  const planes = [];
  if (S.cutEL != null && !S.explode) { hPlane.constant = S.cutEL - zero; planes.push(hPlane); }
  if (S.vcut != null && !S.explode) { vPlane.constant = THREE.MathUtils.lerp(bld.min.x - 1, bld.max.x + 1, S.vcut); planes.push(vPlane); }
  renderer.clippingPlanes = planes;
  syncRuler(); syncPanel(); writeHash();
}

// ---------------------------------------------------------------- camera moves
let tween = null;
function flyTo(pos, target, ms = 700) {
  if (S.mode === 'walk') setMode('orbit');
  if (reduce || ms === 0) { camera.position.copy(pos); controls.target.copy(target); controls.update(); return; }
  tween = { t0: performance.now(), ms, p0: camera.position.clone(), q0: controls.target.clone(), p1: pos.clone(), q1: target.clone() };
}
function frameBox(box, dir = new THREE.Vector3(1, 0.62, 1.15), pad = 1.1) {
  const c = box.getCenter(new THREE.Vector3()), r = box.getBoundingSphere(new THREE.Sphere()).radius * pad;
  const vf = THREE.MathUtils.degToRad(camera.fov / 2), hf = Math.atan(Math.tan(vf) * camera.aspect);
  const dist = r / Math.sin(Math.min(vf, hf));
  flyTo(c.clone().add(dir.clone().normalize().multiplyScalar(dist)), c);
}
const VIEWS = {
  all: { t: '全景', f() { setFocus(null); setCut(null); frameBox(bld); } },
  bird: { t: '鳥瞰', f() { frameBox(scopeBox(), new THREE.Vector3(0.001, 1, 0.12), 0.95); } },
  front: { t: '立面', f() { const n = northDir(); frameBox(scopeBox(), new THREE.Vector3(-n.z, 0.12, n.x)); } },
  side: { t: '側面', f() { const n = northDir(); frameBox(scopeBox(), new THREE.Vector3(n.x, 0.12, n.z)); } },
  platform: { t: '月台', f() { platformView(); } },
  plan: { t: '平面切視', f() { planView(S.focus || platform); } },
};
function scopeBox() { return S.focus ? byCode[S.focus].box3 : bld; }
function northDir() { const [nx, ny] = data.north || [0, 1]; return new THREE.Vector3(nx || 0, 0, -(ny ?? 1)).normalize(); }
function platformView() {
  const p = byCode[platform]; if (!p) return;
  S.isolate = false; setFocus(platform, false); setCut(p.el + 2.6, false); apply();
  const b = p.box3, sz = b.getSize(new THREE.Vector3());
  const along = sz.x > sz.z ? new THREE.Vector3(0.35, 0.95, 0.8) : new THREE.Vector3(0.8, 0.95, 0.35);
  frameBox(b, along, 0.9); markView('platform');
}
function planView(code) {
  const s = byCode[code]; if (!s) return;
  S.isolate = true; setFocus(code, false); setCut(s.el + 1.5, false); apply();
  frameBox(s.box3, new THREE.Vector3(0.001, 1, 0.06), 0.85); markView('plan');
}

// ---------------------------------------------------------------- focus / cut
function setFocus(code, ap = true) {
  S.focus = code || null;
  if (!code) S.isolate = false;
  clearPick(false);
  if (ap) apply();
}
function setCut(v, ap = true) { S.cutEL = v; if (ap) apply(); }

// ---------------------------------------------------------------- picking
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', e => {
  if (!down || S.mode === 'walk') return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
  if (moved > 5) return;
  const r = canvas.getBoundingClientRect();
  ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(meshes.filter(m => m.userData.pickable && !SITE.has(m.userData.group)), false);
  const planes = renderer.clippingPlanes;
  for (const h of hits) {
    if (!planes.every(p => p.distanceToPoint(h.point) >= -0.01)) continue;
    const o = h.object;
    if (o.userData.interior) {
      if (o.userData.interior === 'floor') { pickRoom(o.geometry.attributes._room.getX(h.face.a)); return; }
      continue;
    }
    pick(o.geometry.attributes._elem.getX(h.face.a), o); return;
  }
  clearPick();
});
function trisOf(mesh, ei, attr = '_elem') {
  const g = mesh.geometry, cache = g.userData['by' + attr] || (g.userData['by' + attr] = new Map());
  if (!cache.size) {
    const idx = g.index.array, at = g.attributes[attr].array;
    for (let t = 0; t < idx.length; t += 3) { const k = at[idx[t]]; let a = cache.get(k); if (!a) cache.set(k, a = []); a.push(idx[t], idx[t + 1], idx[t + 2]); }
  }
  return cache.get(ei) || [];
}
function pick(ei, mesh, frame = false) {
  clearPick(false);
  const row = data.elements[ei];
  if (!mesh) mesh = meshes.find(m => !m.userData.interior && m.userData.storey === row[6] && m.userData.group === norm(row[2]) && trisOf(m, ei).length);
  const parts = [];
  for (const m of meshes) {
    if (m.userData.interior || m.userData.storey !== row[6] || m.userData.group !== norm(row[2])) continue;
    const tri = trisOf(m, ei); if (!tri.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', m.geometry.attributes.position);
    g.setIndex(tri);
    const hl = new THREE.Mesh(g, pickMat); hl.renderOrder = 10; m.add(hl); parts.push(hl);
  }
  const box = new THREE.Box3();
  parts.forEach(p => { p.geometry.computeBoundingBox(); const b = p.geometry.boundingBox.clone(); b.min.y += p.parent.position.y; b.max.y += p.parent.position.y; box.union(b); });
  S.picked = { ei, row, parts, box };
  showInfo(row, ei);
  if (frame && !box.isEmpty()) {
    const c = box.getCenter(new THREE.Vector3()), r = Math.max(box.getBoundingSphere(new THREE.Sphere()).radius, 2.5);
    const dir = camera.position.clone().sub(controls.target).normalize();
    flyTo(c.clone().add(dir.multiplyScalar(r * 3.2 + 6)), c);
  }
  document.querySelectorAll('.el-list li[aria-current]').forEach(x => x.removeAttribute('aria-current'));
  const li = document.querySelector(`.el-list li[data-e="${ei}"]`); if (li) li.setAttribute('aria-current', 'true');
}
function clearPick(hideCard = true) {
  if (S.picked) { S.picked.parts.forEach(p => { p.parent.remove(p); p.geometry.dispose(); }); S.picked = null; }
  if (hideCard) $('#info').hidden = true;
}
function showInfo(r, ei) {
  const C = data.elemCols, o = {}; C.forEach((k, i) => o[k] = r[i]);
  const st = byCode[o.storey];
  const box = $('#info'); box.hidden = false;
  box.innerHTML = `<div class="info-h"><b>${esc(o.id)}</b><button type="button" class="x" aria-label="關閉構件資訊">×</button></div>
  <p class="info-d">${esc(o.desc)}</p>
  <dl>
    <div><dt>樓層</dt><dd>${esc(o.storey)}${st ? `　EL ${elf(st.el)}` : ''}</dd></div>
    <div><dt>高程範圍</dt><dd>EL ${elf(o.elMin)} – ${elf(o.elMax)} m</dd></div>
    <div><dt>材料群組</dt><dd>${esc(norm(o.group))}</dd></div>
    <div><dt>BIM 分類</dt><dd>${esc(o.cat || '—')}　${esc(o.cls)}</dd></div>
    <div><dt>拆解層</dt><dd>${esc(o.layer || '—')}</dd></div>
    <div><dt>來源圖說</dt><dd>${esc(o.src || '—')}</dd></div>
  </dl>
  <div class="info-a">${st && S.focus !== o.storey ? `<button type="button" data-f="${esc(o.storey)}">看 ${esc(o.storey)} 層</button>` : ''}<button type="button" data-z>拉近構件</button><button type="button" data-g="${esc(norm(o.group))}">隱藏此材料群組</button></div>`;
  box.querySelector('.x').onclick = () => clearPick();
  box.querySelector('[data-z]').onclick = () => pick(ei, null, true);
  box.querySelector('[data-g]').onclick = e => { S.hidden.add(e.target.dataset.g); clearPick(); apply(); };
  const f = box.querySelector('[data-f]'); if (f) f.onclick = () => { focusFloor(f.dataset.f); pick(ei, null, true); };
}

// ---------------------------------------------------------------- walk mode
const keys = new Set();
let yaw = 0, pitch = 0, joy = { x: 0, y: 0 }, look = null;
const down3 = new THREE.Raycaster(); down3.far = 8;
function setMode(m) {
  S.mode = m; document.body.classList.toggle('walking', m === 'walk');
  $('#m-orbit').setAttribute('aria-pressed', m === 'orbit'); $('#m-walk').setAttribute('aria-pressed', m === 'walk');
  controls.enabled = m === 'orbit';
  if (m === 'walk') {
    const d = controls.target.clone().sub(camera.position); yaw = Math.atan2(-d.x, -d.z); pitch = 0;
    if (!S.walkInit) teleport(S.focus || platform);
  } else {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    controls.target.copy(camera.position).add(fwd.multiplyScalar(14)); controls.update();
  }
  writeHash();
}
function teleport(code) {
  const s = byCode[code]; if (!s) return;
  S.walkInit = true;
  if (S.mode !== 'walk') setMode('walk');
  const b = s.box3, c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
  const off = sz.x > sz.z ? new THREE.Vector3(-sz.x * 0.32, 0, 0) : new THREE.Vector3(0, 0, -sz.z * 0.32);
  camera.position.set(c.x + off.x, s.y + 1.6 + s.i * S.explode * 9, c.z + off.z);
  yaw = Math.atan2(off.x, off.z); pitch = -0.04;
  S.walkFloor = code; syncWalk();
}
addEventListener('keydown', e => {
  if (e.target.closest('input,textarea')) return;
  if (e.key === 'Escape') { clearPick(); return; }
  if (S.mode === 'walk') { keys.add(e.code); if (/Arrow|Space/.test(e.code)) e.preventDefault(); }
});
addEventListener('keyup', e => keys.delete(e.code));
canvas.addEventListener('pointerdown', e => { if (S.mode === 'walk') { look = { x: e.clientX, y: e.clientY, id: e.pointerId }; canvas.setPointerCapture(e.pointerId); } });
canvas.addEventListener('pointermove', e => {
  if (S.mode !== 'walk' || !look || look.id !== e.pointerId) return;
  yaw -= (e.clientX - look.x) * 0.0042; pitch = THREE.MathUtils.clamp(pitch - (e.clientY - look.y) * 0.0035, -1.3, 1.3);
  look.x = e.clientX; look.y = e.clientY;
});
canvas.addEventListener('pointerup', () => look = null);
canvas.addEventListener('pointercancel', () => look = null);
function walkStep(dt) {
  const fw = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - joy.y;
  const st = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joy.x;
  const up = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
  const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9 : 3.6) * dt;
  const f = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
  camera.position.addScaledVector(f, fw * sp).addScaledVector(r, st * sp);
  if (up) camera.position.y += up * sp;
  else {
    down3.set(camera.position.clone().add(new THREE.Vector3(0, -0.9, 0)), new THREE.Vector3(0, -1, 0));
    const p = camera.position;
    const cand = meshes.filter(m => { if (!m.visible || m.material === ghostMat) return false; const b = m.geometry.boundingBox; return p.x >= b.min.x - 0.5 && p.x <= b.max.x + 0.5 && p.z >= b.min.z - 0.5 && p.z <= b.max.z + 0.5 && p.y - m.position.y >= b.min.y - 1; });
    const hit = down3.intersectObjects(cand, false)[0];
    if (hit) camera.position.y += (hit.point.y + 1.6 - camera.position.y) * Math.min(1, dt * 10);
  }
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
}
(function joystick() {
  const pad = $('#joy'), knob = $('#knob'); let id = null, c = null;
  pad.addEventListener('pointerdown', e => { id = e.pointerId; pad.setPointerCapture(id); const r = pad.getBoundingClientRect(); c = { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 }; mv(e); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
  const end = () => { id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  function mv(e) { let dx = (e.clientX - c.x) / c.R, dy = (e.clientY - c.y) / c.R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } joy.x = dx; joy.y = dy; knob.style.transform = `translate(${dx * c.R * 0.55}px,${dy * c.R * 0.55}px)`; }
})();

// ---------------------------------------------------------------- time of day
const TIMES = {
  day: { hemi: [0xe6f0f2, 0xb5ae9c, 1.5], sun: [0xfff4e0, 2.6, 140, 52], fill: 0.9, amb: 0.4, exp: 1.08, glow: 0 },
  dusk: { hemi: [0xa9aed0, 0x6c584a, 0.95], sun: [0xffa45e, 2.0, 250, 10], fill: 0.45, amb: 0.25, exp: 1.08, glow: 0.5 },
  night: { hemi: [0x4a5a86, 0x1a1f2a, 0.6], sun: [0x9db0ff, 0.35, 300, 38], fill: 0.2, amb: 0.18, exp: 1.2, glow: 1.15 },
};
function applyTime(t, quiet) {
  S.time = t; const T = TIMES[t];
  hemi.color.set(T.hemi[0]); hemi.groundColor.set(T.hemi[1]); hemi.intensity = T.hemi[2];
  sun.color.set(T.sun[0]); sun.intensity = T.sun[1];
  const c = bld.getCenter(new THREE.Vector3()), R = bld.getSize(new THREE.Vector3()).length();
  const az = THREE.MathUtils.degToRad(T.sun[2]), alt = THREE.MathUtils.degToRad(T.sun[3]);
  sun.position.set(c.x + Math.cos(az) * Math.cos(alt) * R, c.y + Math.sin(alt) * R, c.z + Math.sin(az) * Math.cos(alt) * R);
  fill.position.set(c.x - Math.cos(az) * R, c.y + R * 0.35, c.z - Math.sin(az) * R); fill.intensity = T.fill; amb.intensity = T.amb;
  renderer.toneMappingExposure = T.exp;
  for (const m of meshes) {
    const b = m.userData.base;
    if (GLOW.has(m.userData.group)) { b.emissive.set(0xffc46b); b.emissiveIntensity = T.glow; }
    else if (m.userData.interior === 'floor' || m.userData.interior === 'prtn') { b.emissive.set(0xffd9a0); b.emissiveIntensity = T.glow * 0.22; }
  }
  document.body.dataset.time = t;
  document.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed', b.dataset.time === t));
  if (!quiet) writeHash();
}

// ---------------------------------------------------------------- UI build
function buildUI() {
  const total = data.elements.length;
  $('#sum').innerHTML = `<b>${storeys.length}</b> 層<b>${fmt(total)}</b> 構件`;
  // ruler
  const els = storeys.map(s => s.el).concat(Object.values(data.addEL || {}));
  const lo = Math.floor(Math.min(...els) - 1.5), hi = Math.ceil(Math.max(...els) + 3);
  const ruler = $('#ruler'), track = $('.r-track', ruler);
  const pct = v => (1 - (v - lo) / (hi - lo)) * 100;
  ruler.dataset.lo = lo; ruler.dataset.hi = hi;
  for (let v = Math.ceil(lo / 5) * 5; v <= hi; v += 5) track.append(Object.assign(el('span', 'r-grid', `<i>${v}</i>`), { style: `top:${pct(v)}%` }));
  Object.entries(data.addEL || {}).forEach(([k, v]) => {
    const [code, ...rest] = k.split(' '); const label = rest.join(' ').split('｜')[0];
    const near = storeys.some(s => Math.abs(s.el - v) < (hi - lo) * 0.035);
    const t = el('span', 'r-add', near ? '' : `<i>${esc(code)}</i>`); t.style.top = pct(v) + '%'; t.title = `${code} ${label}　EL ${elf(v)}`; track.append(t);
  });
  storeys.forEach(s => {
    const b = el('button', 'r-st' + (s.code === platform ? ' is-pl' : ''), `<span class="c">${esc(s.code)}</span><span class="v">${elf(s.el)}</span>`);
    b.type = 'button'; b.style.top = pct(s.el) + '%'; b.dataset.code = s.code; b.title = `${s.code}　${s.use}`;
    b.onclick = () => focusFloor(s.code === S.focus ? null : s.code);
    track.append(b);
  });
  const cut = el('div', 'r-cut', '<span class="r-cut-l"></span>'); cut.hidden = true; track.append(cut);
  ruler.pct = pct;
  // drag on track to cut
  let drag = false;
  const setFromY = y => { const r = track.getBoundingClientRect(); const f = THREE.MathUtils.clamp((y - r.top) / r.height, 0, 1); setCut(+(hi - f * (hi - lo)).toFixed(2)); };
  $('.r-grab', ruler).addEventListener('pointerdown', e => { drag = true; e.currentTarget.setPointerCapture(e.pointerId); setFromY(e.clientY); });
  $('.r-grab', ruler).addEventListener('pointermove', e => { if (drag) setFromY(e.clientY); });
  $('.r-grab', ruler).addEventListener('pointerup', () => drag = false);
  $('#cut-off').onclick = () => setCut(null);
  // views
  const vb = $('#views');
  Object.entries(VIEWS).forEach(([k, v]) => { const b = el('button', '', v.t); b.type = 'button'; b.dataset.v = k; b.onclick = () => { v.f(); markView(k); }; vb.append(b); });
  // modes & time
  $('#m-orbit').onclick = () => setMode('orbit');
  $('#m-walk').onclick = () => setMode('walk');
  document.querySelectorAll('[data-time]').forEach(b => b.onclick = () => applyTime(b.dataset.time));
  // walk teleports
  const tp = $('#tp');
  storeys.slice().reverse().forEach(s => { const b = el('button', s.code === platform ? 'is-pl' : '', `${esc(s.code)}<small>${elf(s.el)}</small>`); b.type = 'button'; b.dataset.code = s.code; b.onclick = () => teleport(s.code); tp.append(b); });
  // panel toggles
  $('#ph').onclick = () => { const o = $('#panel').classList.toggle('open'); $('#ph').setAttribute('aria-expanded', o); document.body.classList.toggle('sheet-open', o); };
  // pins
  const pins = $('#pins');
  storeys.forEach(s => {
    if (s.box3.isEmpty()) return;
    const p = el('button', 'pin' + (s.code === platform ? ' is-pl' : ''), `<i>${esc(s.code)}</i><span>${esc(s.meta.short || s.use)}</span>`);
    p.type = 'button'; p.dataset.code = s.code; p.onclick = () => focusFloor(s.code); s.pin = p; pins.append(p);
  });
  $('#pins-t').onchange = e => { S.pins = e.target.checked; pins.hidden = !S.pins; };
  $('#site-t').onchange = e => { S.site = e.target.checked; apply(); };
  $('#iso-t').onchange = e => { S.isolate = e.target.checked; apply(); };
  $('#int-t').onchange = e => { S.interior = e.target.checked; if (!S.interior && S.picked?.room != null) clearPick(); apply(); };
  $('#exp').oninput = e => { S.explode = +e.target.value; if (S.explode) { S.cutEL = null; S.vcut = null; $('#vcut').value = 100; } apply(); };
  $('#vcut').oninput = e => { const v = +e.target.value; S.vcut = v >= 100 ? null : v / 100; if (S.vcut != null) { S.explode = 0; $('#exp').value = 0; } apply(); };
  frameBox(bld, undefined, 1.05); if (tween) { camera.position.copy(tween.p1); controls.target.copy(tween.q1); tween = null; } controls.update();
}
function focusFloor(code) {
  if (code) { setCut(null, false); setFocus(code); frameBox(byCode[code].box3); markView(null); }
  else { setFocus(null); frameBox(bld); }
}
function markView(k) { document.querySelectorAll('#views button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === k)); S.view = k; writeHash(); }

function syncRuler() {
  const ruler = $('#ruler'); if (!ruler.pct) return;
  ruler.querySelectorAll('.r-st').forEach(b => b.setAttribute('aria-pressed', b.dataset.code === S.focus));
  const cut = $('.r-cut', ruler);
  cut.hidden = S.cutEL == null;
  if (S.cutEL != null) { cut.style.top = ruler.pct(S.cutEL) + '%'; $('.r-cut-l', cut).textContent = `剖切 EL ${elf(S.cutEL)}`; }
  $('#cut-off').hidden = S.cutEL == null;
}
function syncWalk() { document.querySelectorAll('#tp button').forEach(b => b.setAttribute('aria-pressed', b.dataset.code === S.walkFloor)); }

const sheet = k => `../../atlas/planning/#s=${k}`;
const thumb = k => `../../atlas/planning/p/${k}_t.webp`;
function sheetCards(list) {
  return `<ul class="sheets">${list.map(([k, code, t]) => `<li><a href="${sheet(k)}" target="_blank" rel="noopener"><img src="${thumb(k)}" alt="" loading="lazy" width="160" height="113"><span><b>${esc(code)}</b>${esc(t)}</span></a></li>`).join('')}</ul>`;
}
function syncPanel() {
  const body = $('#pb');
  const f = S.focus && byCode[S.focus];
  const key = f ? f.code : '_';
  if (body.dataset.key === key) { syncGroups(); return; }
  body.dataset.key = key;
  let h = '';
  if (!f) {
    const pl = byCode[platform];
    h += `<section class="scope"><p class="lede">${esc(META.blurb)}</p>
      <dl class="facts">
        <div><dt>樓層</dt><dd>${storeys.length}<small>層</small></dd></div>
        <div><dt>構件</dt><dd>${fmt(data.elements.length)}<small>件</small></dd></div>
        <div><dt>標高範圍</dt><dd>${elf(storeys[0].el)}<small>–</small>${elf(storeys[storeys.length - 1].el)}</dd></div>
        <div><dt>月台層</dt><dd>${esc(platform)}<small>EL ${pl ? elf(pl.el) : '—'}</small></dd></div>
      </dl></section>
      <section><h2>樓層</h2><ol class="floors">${storeys.slice().reverse().map(s => `<li><button type="button" data-f="${esc(s.code)}" class="${s.code === platform ? 'is-pl' : ''}"><b>${esc(s.code)}</b><span>${esc(s.use)}</span><em>EL ${elf(s.el)}</em><small>${fmt(s.n)} 件</small></button></li>`).join('')}</ol></section>`;
    if (META.sheets?.length) h += `<section><h2>全站圖說</h2>${sheetCards(META.sheets)}</section>`;
  } else {
    const idx = storeys.indexOf(f), below = storeys[idx - 1], above = storeys[idx + 1];
    const cats = f.cats.map(([c, n]) => `<li><span>${esc(c || '未分類')}</span><b style="--w:${Math.round(n / f.n * 100)}%">${fmt(n)}</b></li>`).join('');
    h += `<section class="scope floor-scope${f.code === platform ? ' is-pl' : ''}">
      <div class="fs-h"><span class="fs-code">${esc(f.code)}</span><div><h2>${esc(f.use)}</h2><p>EL ${elf(f.el)} m　圖說 ${esc(f.dwg || '—')}${above ? `　層高 ${(above.el - f.el).toFixed(2)} m` : ''}</p></div></div>
      ${f.meta.note ? `<p class="lede">${esc(f.meta.note)}</p>` : ''}
      <div class="acts">
        <button type="button" data-act="plan">平面切視</button>
        <button type="button" data-act="walk">走進本層</button>
        <button type="button" data-act="all">全部樓層</button>
      </div>
      <div class="stepper">${below ? `<button type="button" data-f="${esc(below.code)}">↓ ${esc(below.code)}</button>` : '<span></span>'}${above ? `<button type="button" data-f="${esc(above.code)}">${esc(above.code)} ↑</button>` : '<span></span>'}</div>
    </section>
    ${roomList(f)}
    <section><h2>構件分類 <small>${fmt(f.n)} 件</small></h2><ul class="bars">${cats}</ul></section>`;
    if (f.meta.sheets?.length) h += `<section><h2>本層圖說</h2>${sheetCards(f.meta.sheets)}</section>`;
    if (f.code === platform && Object.keys(data.addEL || {}).length) h += `<section><h2>月台控制標高</h2><ul class="addel">${Object.entries(data.addEL).map(([k, v]) => `<li><span>${esc(k.split('｜')[0])}</span><b>EL ${elf(v)}</b><small>${esc(k.split('｜')[1] || '')}</small></li>`).join('')}</ul></section>`;
  }
  h += `<section><h2>材料群組 <small>點選開關</small></h2><ul class="groups"></ul></section>`;
  h += `<section><h2>${f ? '本層構件' : '全站構件'} <small class="el-n"></small></h2><input type="search" class="el-q" placeholder="搜尋編號或名稱，例如 月台門、${esc(META.id.toUpperCase())}-G" aria-label="搜尋構件"><ul class="el-list"></ul></section>`;
  body.innerHTML = h;
  body.querySelectorAll('[data-f]').forEach(b => b.onclick = () => focusFloor(b.dataset.f));
  body.querySelectorAll('.rooms li[data-r]').forEach(li => li.onclick = () => { if (!S.interior) { S.interior = true; $('#int-t').checked = true; apply(); } pickRoom(+li.dataset.r, true); });
  const rq = $('.room-q', body); if (rq) rq.oninput = () => { const q = rq.value.trim(); body.querySelectorAll('.rooms li[data-r]').forEach(li => li.hidden = !!q && !li.textContent.includes(q)); };
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const a = b.dataset.act;
    if (a === 'plan') planView(S.focus); else if (a === 'walk') teleport(S.focus); else focusFloor(null);
  });
  const q = $('.el-q', body);
  q.oninput = () => listEls(q.value);
  listEls('');
  syncGroups();
}
function roomList(f) {
  if (!intr) return '';
  const rs = intr.rooms.map((r, i) => [r, i]).filter(([r]) => r[0] === f.code && (r[1] || r[3]) && r[5] >= 2);
  if (!rs.length) return '';
  rs.sort((a, b) => (!!b[0][1] - !!a[0][1]) || b[0][5] - a[0][5]);
  const src = (intr.src[f.code] || []).join('、');
  return `<section><h2>空間配置 <small>${fmt(rs.length)} 處　平面 ${esc(src)}</small></h2>
    ${rs.length > 12 ? '<input type="search" class="room-q" placeholder="搜尋空間，例如 廁所、站務" aria-label="搜尋空間">' : ''}
    <ul class="rooms">${rs.map(([r, i]) => `<li data-r="${i}"><button type="button"><i style="background:${esc(r[10])}"></i><span>${esc(roomTitle(r))}${r[4] ? ` <em>${esc(r[4])}</em>` : ''}</span><small>${fmt(Math.round(r[5]))} m²</small></button></li>`).join('')}</ul></section>`;
}
function listEls(q) {
  const ul = $('#pb .el-list'); if (!ul) return;
  const qq = q.trim().toLowerCase();
  const out = [];
  data.elements.forEach((r, i) => {
    if (S.focus && r[6] !== S.focus) return;
    if (SITE.has(norm(r[2]))) return;
    if (qq && !(`${r[0]} ${r[1]} ${r[2]}`.toLowerCase().includes(qq))) return;
    out.push(i);
  });
  $('#pb .el-n').textContent = `${fmt(out.length)} 件`;
  ul.innerHTML = out.slice(0, 240).map(i => { const r = data.elements[i]; return `<li data-e="${i}"><button type="button"><b>${esc(r[0])}</b><span>${esc(r[1])}</span><small>${esc(norm(r[2]))}${S.focus ? '' : '　' + esc(r[6])}</small></button></li>`; }).join('') + (out.length > 240 ? `<li class="more">另有 ${fmt(out.length - 240)} 件，請輸入關鍵字縮小範圍</li>` : '');
  ul.querySelectorAll('li[data-e]').forEach(li => li.onclick = () => {
    const i = +li.dataset.e, r = data.elements[i];
    if (S.focus && S.focus !== r[6]) focusFloor(r[6]);
    if (S.hidden.has(norm(r[2]))) { S.hidden.delete(norm(r[2])); apply(); }
    pick(i, null, true);
  });
}
function syncGroups() {
  const ul = $('#pb .groups'); if (!ul) return;
  let list = groupsAll;
  if (S.focus) {
    const c = new Map(); byCode[S.focus].groups.forEach(([g, n]) => c.set(norm(g), (c.get(norm(g)) || 0) + n));
    list = groupsAll.filter(x => c.has(x.g)).map(x => ({ ...x, n: c.get(x.g) }));
  }
  ul.innerHTML = list.filter(x => S.site || !SITE.has(x.g)).map(x => `<li><button type="button" data-g="${esc(x.g)}" aria-pressed="${!S.hidden.has(x.g)}"><i style="background:${x.c}"></i>${esc(x.g)}<small>${fmt(x.n)}</small></button></li>`).join('');
  ul.querySelectorAll('button').forEach(b => b.onclick = () => { const g = b.dataset.g; S.hidden.has(g) ? S.hidden.delete(g) : S.hidden.add(g); apply(); });
}

// ---------------------------------------------------------------- hash
function writeHash() {
  if (!data) return;
  const p = new URLSearchParams();
  if (S.focus) p.set('f', S.focus);
  if (S.view && S.view !== 'all') p.set('v', S.view);
  if (S.mode === 'walk') p.set('m', 'walk');
  if (S.time !== 'day') p.set('t', S.time);
  const h = p.toString(); const want = h ? '#' + h : location.pathname + location.search;
  if (('#' + h) !== location.hash && !(h === '' && !location.hash)) history.replaceState(null, '', want);
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('t') && TIMES[p.get('t')]) applyTime(p.get('t'), true);
  const f = p.get('f'), v = p.get('v'), m = p.get('m');
  if (v === 'platform') { platformView(); ff(); }
  else if (v === 'plan') { planView(f && byCode[f] ? f : platform); ff(); }
  else if (f && byCode[f]) { focusFloor(f); ff(); }
  else apply();
  if (m === 'walk') teleport(f && byCode[f] ? f : platform);
  function ff() { if (tween) { camera.position.copy(tween.p1); controls.target.copy(tween.q1); tween = null; controls.update(); } }
}
addEventListener('hashchange', () => { if (data) readHash(); });

// ---------------------------------------------------------------- room labels
let rlCode = null, rlEls = [];
const rlBox = $('#rl'), v4 = new THREE.Vector3();
function syncLabels() {
  const code = S.mode === 'walk' ? S.walkFloor : S.focus;
  const on = intr && S.interior && S.pins && code && intr.labels[code];
  if (!on) { if (rlCode) { rlBox.innerHTML = ''; rlCode = null; rlEls = []; } return; }
  if (rlCode !== code) {
    rlBox.innerHTML = '';
    rlEls = intr.labels[code].map(([t, x, y, z, k, ri]) => {
      const b = el(ri >= 0 ? 'button' : 'span', 'rlab k' + k, esc(t));
      if (ri >= 0) { b.type = 'button'; b.onclick = () => pickRoom(ri, false); }
      rlBox.append(b); return { b, p: new THREE.Vector3(x, y, z), k, w: 0, h: 0 };
    }).sort((a, b) => ({ 2: 0, 3: 1, 1: 2 }[a.k] - { 2: 0, 3: 1, 1: 2 }[b.k]));
    rlCode = code;
  }
  const s = byCode[code], dy = s.i * S.explode * 9, W = canvas.clientWidth, H = canvas.clientHeight, kept = [];
  const walk = S.mode === 'walk';
  for (const L of rlEls) {
    v4.copy(L.p); v4.y += dy;
    const d = camera.position.distanceTo(v4);
    let vis = !(S.cutEL != null && L.p.y > S.cutEL - zero) && kept.length < 70;
    if (vis) vis = walk ? d < 38 : (L.k === 1 ? d < 110 : L.k === 3 ? d < 320 : true);
    if (vis) { v4.project(camera); vis = v4.z < 1 && Math.abs(v4.x) < 1.02 && Math.abs(v4.y) < 1.02; }
    if (vis) {
      const x = (v4.x + 1) / 2 * W, y = (1 - v4.y) / 2 * H;
      if (!L.w) { L.b.hidden = false; L.w = L.b.offsetWidth || 60; L.h = L.b.offsetHeight || 18; }
      const r = { x: x - L.w / 2, y: y - L.h / 2, w: L.w, h: L.h };
      if (kept.some(k => r.x < k.x + k.w + 2 && k.x < r.x + r.w + 2 && r.y < k.y + k.h && k.y < r.y + r.h)) vis = false;
      else { kept.push(r); L.b.style.transform = `translate(${r.x}px,${r.y}px)`; }
    }
    L.b.hidden = !vis;
  }
}

// ---------------------------------------------------------------- loop
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
const v3 = new THREE.Vector3();
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (tween) {
    const k = Math.min(1, (now - tween.t0) / tween.ms), e = 1 - Math.pow(1 - k, 3);
    camera.position.lerpVectors(tween.p0, tween.p1, e); controls.target.lerpVectors(tween.q0, tween.q1, e);
    if (k >= 1) tween = null;
  }
  if (S.mode === 'walk') walkStep(dt); else controls.update();
  renderer.render(scene, camera);
  // pins
  if (S.pins && S.mode === 'orbit') {
    const W = canvas.clientWidth, H = canvas.clientHeight, kept = [];
    const order = storeys.slice().sort((a, b) => (b.code === S.focus) - (a.code === S.focus) || (b.code === platform) - (a.code === platform) || b.n - a.n);
    for (const s of order) {
      if (!s.pin) continue;
      const show = (!S.focus || s.code === S.focus) && s.code !== rlCode;
      const c = s.box3.getCenter(v3); v3.y = s.y + 1.4 + s.i * S.explode * 9;
      if (S.cutEL != null && v3.y > S.cutEL - zero + 0.2 && s.code !== S.focus) { s.pin.hidden = true; continue; }
      v3.project(camera);
      const vis = show && v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
      s.pin.hidden = !vis;
      if (!vis) continue;
      const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H, w = s.pinW || (s.pinW = s.pin.offsetWidth || 120);
      if (kept.some(k => Math.abs(k.y - y) < 24 && x < k.x + k.w && k.x < x + w)) { s.pin.hidden = true; continue; }
      kept.push({ x, y, w });
      s.pin.style.transform = `translate(${x}px,${y}px) translate(-12px,-50%)`;
    }
  } else storeys.forEach(s => s.pin && (s.pin.hidden = true));
  syncLabels();
  // compass
  const n = northDir(), f = new THREE.Vector3(); camera.getWorldDirection(f);
  const ang = Math.atan2(n.x, -n.z) - Math.atan2(f.x, -f.z);
  $('#compass i').style.transform = `rotate(${ang}rad)`;
  requestAnimationFrame(tick);
}
