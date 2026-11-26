import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RasterRenderer } from './raster-renderer.js';
import { sourceGroup, siteGeometry } from './stations.js';
import { features, modelFeature, shellElement } from './studio-data.js';
import { assembleComponents, componentFor, elevationDatum } from './component-catalog.js';

const UP = new THREE.Vector3(0, 1, 0);
const CONTEXT_TINT = new THREE.Color(0xb8c9c0);
const HIGHLIGHT = 0xe39628;
const CORNERS = [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1], [1, 0, 0], [1, 0, 1], [1, 1, 0], [1, 1, 1]];

function materialsOf(mesh) {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

export function disposeSource(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(node => {
    if (!node.isMesh) return;
    geometries.add(node.geometry);
    for (const material of materialsOf(node)) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value?.isTexture) textures.add(value);
      }
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) texture.dispose();
}

function modelEntries(root, station) {
  const keyedLayers = new Map(station.layers.flatMap(layer => layer.groups.map(group => [group, layer.key])));
  const entries = [];
  root.updateMatrixWorld(true);
  root.traverse(node => {
    if (!node.isMesh) return;
    const source = sourceGroup(node, root, station);
    const feature = modelFeature(node, source);
    node.geometry.computeBoundingBox();
    entries.push({
      source,
      layer: keyedLayers.get(source),
      site: siteGeometry(node, source, station),
      feature,
      component: componentFor(node, source, station, feature),
      shell: shellElement(node, source),
      mesh: node,
      bounds: node.geometry.boundingBox.clone().applyMatrix4(node.matrixWorld),
    });
  });
  return entries;
}

function interpolateCut(a, b, sa, sb, vertices) {
  if ((sa < 0) === (sb < 0)) return;
  const t = sa / (sa - sb);
  vertices.push(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y), a.z + t * (b.z - a.z));
}

function cutEdges(entries, axis, cut) {
  const vertices = [];
  const points = Array.from({length: 3}, () => new THREE.Vector3());
  for (const entry of entries) {
    if (entry.bounds.min[axis] >= cut || entry.bounds.max[axis] <= cut) continue;
    if (materialsOf(entry.mesh).every(material => material.transparent)) continue;
    const position = entry.mesh.geometry.attributes.position;
    const index = entry.mesh.geometry.index;
    const count = index?.count ?? position.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const [a, b, c] = points;
      for (let j = 0; j < 3; j++) {
        points[j].fromBufferAttribute(position, index ? index.getX(i + j) : i + j).applyMatrix4(entry.mesh.matrixWorld);
      }
      const sa = a[axis] - cut;
      const sb = b[axis] - cut;
      const sc = c[axis] - cut;
      if ((sa < 0) === (sb < 0) && (sa < 0) === (sc < 0)) continue;
      interpolateCut(a, b, sa, sb, vertices);
      interpolateCut(b, c, sb, sc, vertices);
      interpolateCut(c, a, sc, sa, vertices);
    }
  }
  return new THREE.Float32BufferAttribute(vertices, 3);
}

class Surface {
  constructor(host, scale, theme) {
    this.host = host;
    this.scale = scale;
    this.theme = theme;
    this.scene = new THREE.Scene();
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .05, 3000);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2', {alpha: true, antialias: true});
    this.renderer = context
      ? new THREE.WebGLRenderer({canvas, context, alpha: true, antialias: true})
      : new RasterRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.canvas = this.renderer.domElement;
    this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label', theme === 'section' ? '操作剖切三維模型' : '操作外觀三維模型');
    host.append(this.canvas);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = false;
    this.controls.autoRotateSpeed = 0.8;
    this.controls.minZoom = .22;
    this.controls.maxZoom = 16;
    this.controls.listenToKeyEvents(this.canvas);

    this.hemisphere = new THREE.HemisphereLight(0xf8faf5, 0x938c74, 2);
    this.keyLight = new THREE.DirectionalLight(0xfff4dd, 2.2);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1536, 1536);
    this.keyLight.shadow.bias = -0.00018;
    this.keyLight.shadow.normalBias = 0.034;
    this.keyLight.shadow.radius = 2.5;
    this.fillLight = new THREE.DirectionalLight(0xc4dbeb, .9);
    this.scene.add(this.hemisphere, this.keyLight, this.keyLight.target, this.fillLight);

    this.grid = new THREE.GridHelper(1000, 200, 0x969e8e, 0x869486);
    this.grid.material.transparent = true;
    this.grid.material.depthWrite = false;
    this.grid.material.opacity = .28;
    if (this.renderer instanceof RasterRenderer) this.renderer.grid = this.grid;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.ShadowMaterial({opacity: .19}));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.receiveShadow = true;
    this.scene.add(this.grid, this.shadow);
    this.setLight(theme);
  }

  setLight(theme) {
    this.renderer.theme = theme;
    const dusk = theme === 'dusk';
    this.hemisphere.color.set(dusk ? 0xb6cceb : 0xf8faf5);
    this.hemisphere.groundColor.set(dusk ? 0x747c85 : 0x938c74);
    this.hemisphere.intensity = dusk ? 1.38 : 1.83;
    this.keyLight.color.set(dusk ? 0xffd8a5 : 0xfff2dc);
    this.keyLight.intensity = dusk ? 1.4 : 2.04;
    this.fillLight.intensity = dusk ? .70 : .87;
    this.grid.material.color.set(dusk ? 0xb9c9d2 : 0x849385);
    this.grid.material.opacity = dusk ? .13 : .17;
    this.shadow.material.opacity = dusk ? .31 : .19;
    this.renderer.toneMappingExposure = dusk ? 0.97 : 1.07;
    this.dirtyShadow();
  }

  resize() {
    this.width = Math.max(1, this.host.clientWidth);
    this.height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(this.width, this.height, false);
  }

  get visible() {
    return this.host.clientWidth > 0 && this.host.clientHeight > 0;
  }

  setScale(unitsPerPixel) {
    this.unitsPerPixel = unitsPerPixel;
    const camera = this.camera;
    camera.left = -this.width * unitsPerPixel / 2;
    camera.right = -camera.left;
    camera.bottom = -this.height * unitsPerPixel / 2;
    camera.top = -camera.bottom;
    camera.updateProjectionMatrix();
  }

  frameLights(bounds, ground) {
    const center = bounds.getCenter(new THREE.Vector3());
    const span = Math.max(20, bounds.getSize(new THREE.Vector3()).length());
    const shadowCamera = this.keyLight.shadow.camera;
    const shadowHalf = .55 * span;
    this.keyLight.position.copy(center).add(new THREE.Vector3(-.47, .89, .57).multiplyScalar(span));
    this.keyLight.target.position.copy(center);
    this.fillLight.position.copy(center).add(new THREE.Vector3(.7, .45, -.8).multiplyScalar(span));
    Object.assign(shadowCamera, {left: -shadowHalf, right: shadowHalf, bottom: -shadowHalf, top: shadowHalf, near: 1, far: span * 2.5});
    shadowCamera.updateProjectionMatrix();
    this.grid.position.set(Math.round(center.x / 5) * 5, ground - .07, Math.round(center.z / 5) * 5);
    this.shadow.position.set(center.x, ground - .04, center.z);
    this.dirtyShadow();
  }

  dirtyShadow() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    const step = this.unitsPerPixel / this.camera.zoom;
    const goal = step * 52;
    const order = 10 ** Math.floor(Math.log10(goal));
    const metres = [1, 2, 5, 10].map(m => m * order).find(m => m >= goal);
    this.scale.querySelector('span').textContent = `${Number(metres.toPrecision(2))} m`;
    this.scale.querySelector('i').style.width = `${(metres / step).toFixed(1)}px`;
  }
}

export class StationView {
  constructor(dom, events) {
    this.dom = dom;
    this.events = events;
    this.surfaces = [
      new Surface(dom.left, dom.leftScale, 'section'),
      new Surface(dom.right, dom.rightScale, 'dusk'),
    ];
    [this.left, this.right] = this.surfaces;
    this.raycaster = new THREE.Raycaster();
    this.cutPlane = new THREE.Plane();
    this.cutOutline = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({
      color: 0x34483e, transparent: true, opacity: .73, depthWrite: false,
    }));
    this.cutOutline.frustumCulled = false;
    this.cutOutline.renderOrder = 3;
    this.cutOutline.visible = false;
    this.left.scene.add(this.cutOutline);

    this.sync = true;
    this.unitsPerPixel = .4;
    this.frame = 0;
    this.pendingSurfaces = new Set();
    this.draw = this.draw.bind(this);
    for (const surface of this.surfaces) {
      surface.controls.addEventListener('change', () => this.cameraChanged(surface));
      surface.canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        events.contextLost();
      });
      surface.canvas.addEventListener('webglcontextrestored', () => events.contextRestored());
      this.configurePicking(surface);
    }
    this.configureExplodeDrag();
    this.resize = new ResizeObserver(() => {
      if (!this.station) return;
      this.fit(this.direction());
    });
    this.resize.observe(dom.left);
    this.resize.observe(dom.right);
  }

  load(root, station, state) {
    this.clear();
    this.source = root;
    this.station = station;
    this.state = {...state};
    this.entries = modelEntries(root, station);
    this.components = assembleComponents(this.entries);
    this.sectionBounds = this.entries.reduce(
      (bounds, entry) => entry.site || station.hidden.includes(entry.layer) ? bounds : bounds.union(entry.bounds),
      new THREE.Box3(),
    );
    this.updateVisibility();
    this.fit();
  }

  clear() {
    this.station = null;
    this.entries = [];
    this.components = new Map();
    this.cutOutline.visible = false;
    for (const surface of this.surfaces) this.clearSurface(surface);
    if (this.source) disposeSource(this.source);
    this.source = null;
    this.requestFrame();
  }

  clearSurface(surface) {
    const materials = new Set();
    surface.root.traverse(node => {
      if (node.isMesh) for (const material of materialsOf(node)) materials.add(material);
    });
    surface.root.clear();
    for (const material of materials) material.dispose();
  }

  addEntries(root, entries, planes, selectedPart = null) {
    const materialCopies = new Map();
    for (const entry of entries) {
      const raw = entry.mesh;
      const glass = this.state.cutaway && entry.shell;
      const accent = this.state.featureFocus && entry.feature;
      const selected = entry.component.id === selectedPart;
      const materials = materialsOf(raw).map(material => {
        const key = `${material.uuid}:${glass}:${accent || ''}:${selected}`;
        if (!materialCopies.has(key)) {
          const copy = material.clone();
          copy.clippingPlanes = planes;
          copy.clipShadows = planes.length > 0;
          if (glass) {
            copy.transparent = true;
            copy.opacity = Math.min(copy.opacity, .24);
            copy.depthWrite = false;
          }
          if (accent && copy.color) copy.color.set(features[accent][1]);
          if (selectedPart) {
            copy.map = null;
            copy.vertexColors = false;
            copy.metalness = 0;
            if (selected) {
              copy.color?.set(HIGHLIGHT);
              copy.emissive?.set(0x3d2608);
              copy.transparent = false;
              copy.depthWrite = true;
              copy.opacity = 1;
            } else {
              copy.color?.lerp(CONTEXT_TINT, .68);
              copy.transparent = true;
              copy.depthWrite = false;
              copy.opacity = Math.min(copy.opacity, .22);
            }
          }
          materialCopies.set(key, copy);
        }
        return materialCopies.get(key);
      });
      const item = new THREE.Mesh(raw.geometry, Array.isArray(raw.material) ? materials : materials[0]);
      item.matrix.copy(raw.matrixWorld);
      item.matrixAutoUpdate = false;
      item.castShadow = materials.some(material => !material.transparent);
      item.receiveShadow = true;
      item.userData.entry = entry;
      root.add(item);
    }
  }

  valid(entry, side, overrideHidden = false) {
    if (this.state.hiddenFeatures.includes(entry.feature)) return false;
    if (this.state.focus && this.station.focus?.includes(entry.source)) return false;
    if (entry.site && !this.state.terrain && !overrideHidden) return false;
    if (this.station.hidden.includes(entry.layer) && !overrideHidden) {
      return side === 'left' && this.state.underground;
    }
    return true;
  }

  layersFor(key, single = false) {
    const floor = this.station.floorSpecs.find(floor => floor.key === key);
    const band = floor?.band ?? this.station.bands?.[key];
    const spansFloors = this.station.id === 'T1' && band;
    const groundSite = key === 'ground' && single;
    const entries = this.entries.filter(entry => {
      if (!this.valid(entry, 'left', single)) return false;
      if (entry.site) return groundSite && this.state.terrain;
      if (spansFloors && entry.layer === 'piles') return false;
      if (spansFloors) return entry.bounds.min.y < band[1] && entry.bounds.max.y > band[0];
      if (entry.layer) return entry.layer === key;
      return band && entry.bounds.min.y < band[1] && entry.bounds.max.y > band[0];
    });
    const group = new THREE.Group();
    const planes = [];
    const bottom = band && Number.isFinite(band[0]) ? new THREE.Plane(UP.clone(), -band[0]) : null;
    const top = band && Number.isFinite(band[1]) ? new THREE.Plane(UP.clone().negate(), band[1]) : null;
    if (bottom) planes.push(bottom);
    if (top) planes.push(top);
    this.addEntries(group, entries, planes);
    const bounds = new THREE.Box3();
    for (const entry of entries) bounds.union(entry.bounds);
    if (entries.length && band) {
      bounds.min.y = Math.max(bounds.min.y, band[0]);
      bounds.max.y = Math.min(bounds.max.y, band[1]);
    }
    return {group, band, bottom, top, bounds};
  }

  updateVisibility() {
    if (!this.station) return;
    this.clearSurface(this.left);
    this.clearSurface(this.right);
    this.left.canvas.dataset.mode = this.state.mode;
    this.right.canvas.dataset.mode = this.state.mode === 'inspect' ? 'inspect' : '';
    this.left.canvas.dataset.orbit = String(this.state.explodeTool === 'orbit');
    this.rightEntries = this.entries.filter(entry => this.valid(entry, 'right'));
    this.planFloor = null;
    if (this.state.mode === 'plan') {
      if (this.state.compare) {
        this.planFloor = this.layersFor(this.state.floor, true);
        this.right.root.add(this.planFloor.group);
      }
    } else if (this.state.compare) this.addEntries(this.right.root, this.rightEntries, []);
    const inspect = this.state.mode === 'inspect';
    const selected = inspect ? this.state.partId : null;
    this.leftEntries = this.entries.filter(entry => {
      if (entry.component.id === selected) return true;
      return !(inspect && selected && this.state.partOnly) && this.valid(entry, 'left');
    });
    this.layerObjects = [];
    switch (this.state.mode) {
      case 'floor': {
        const floor = this.layersFor(this.state.floor, true);
        this.left.root.add(floor.group);
        this.layerObjects = [floor];
        break;
      }
      case 'explode': {
        const looseTerrain = this.leftEntries.filter(entry => entry.site || this.station.id === 'T4' &&
          ['structure', 'foundations'].includes(entry.layer) || this.station.id === 'T1' && entry.layer === 'piles');
        this.addEntries(this.left.root, looseTerrain, []);
        this.layerObjects = this.station.floorSpecs.map(layer => this.layersFor(layer.key)).filter(layer => !layer.bounds.isEmpty());
        for (const layer of this.layerObjects) this.left.root.add(layer.group);
        this.setSpacing(this.state.spacing);
        break;
      }
      case 'plan':
        break;
      default:
        this.addEntries(this.left.root, this.leftEntries, this.state.mode === 'section' ? [this.cutPlane] : [], selected);
    }
    this.cutOutline.visible = this.state.mode === 'section';
    if (this.cutOutline.visible) this.setSection(this.state);
    for (const surface of this.surfaces) surface.dirtyShadow();
    this.requestFrame();
  }

  updateState(patch) {
    if (!this.station) return;
    Object.assign(this.state, patch);
    this.updateVisibility();
  }

  setSection({axis, depth, opposite}) {
    if (!this.station) return;
    Object.assign(this.state, {axis, depth, opposite});
    const cut = THREE.MathUtils.lerp(this.sectionBounds.min[axis], this.sectionBounds.max[axis], depth / 100);
    const normal = new THREE.Vector3();
    normal[axis] = opposite ? 1 : -1;
    this.cutPlane.set(normal, -cut * normal[axis]);
    this.cutOutline.position.copy(normal).multiplyScalar(.025);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', cutEdges(this.leftEntries, axis, cut));
    this.cutOutline.geometry.dispose();
    this.cutOutline.geometry = geometry;
    this.left.dirtyShadow();
    this.requestFrame(this.left);
  }

  setSpacing(spacing) {
    if (!this.station || this.state.mode !== 'explode') return;
    this.state.spacing = spacing;
    this.layerObjects.forEach((layer, index) => {
      const y = index * spacing;
      layer.group.position.y = y;
      if (layer.bottom) layer.bottom.constant = -(layer.band[0] + y);
      if (layer.top) layer.top.constant = layer.band[1] + y;
    });
    this.left.dirtyShadow();
    this.requestFrame(this.left);
  }

  sectionPercent(axis) {
    const length = this.sectionBounds.max[axis] - this.sectionBounds.min[axis];
    return Math.max(0, Math.min(100, Math.round(100 * (this.station.cut[axis] - this.sectionBounds.min[axis]) / length)));
  }

  framingEntries() {
    const entries = this.rightEntries.filter(entry => this.station.id !== 'T4' || !entry.site);
    if (this.state.underground) {
      for (const entry of this.leftEntries) {
        if (this.station.hidden.includes(entry.layer)) entries.push(entry);
      }
    }
    return entries;
  }

  frameBoxes(surface) {
    if (surface === this.right) {
      if (this.planFloor) return [this.planFloor.bounds];
      return this.rightEntries.filter(entry => !entry.site).map(entry => entry.bounds);
    }
    if (this.state.mode === 'floor') return this.layerObjects.map(layer => layer.bounds);
    if (this.state.mode === 'explode') {
      return this.layerObjects.map(layer => layer.bounds.clone().translate(layer.group.position));
    }
    if (this.partFramed) {
      const component = this.components.get(this.state.partId);
      if (component) return [component.bounds];
    }
    return this.framingEntries().map(entry => entry.bounds);
  }

  get partFramed() {
    return this.state.mode === 'inspect' && (this.state.partFocus || this.state.partOnly);
  }

  direction() {
    return this.left.camera.position.clone().sub(this.left.controls.target).normalize();
  }

  fit(direction = null) {
    if (!this.station) return;
    const visible = this.surfaces.filter(surface => surface.visible);
    const fallback = new THREE.Vector3(...this.station.direction).normalize();
    const offsets = this.state.mode === 'plan' ? new THREE.Vector3(0, 1, .0001).normalize()
      : direction?.lengthSq() ? direction.clone().normalize() : fallback;
    const viewMatrix = new THREE.Matrix4().lookAt(offsets, new THREE.Vector3(), UP);
    const inverse = viewMatrix.clone().transpose();
    const corner = new THREE.Vector3();
    this.updatingCameras = true;
    const linked = visible.length === 2 && this.sync && this.state.mode !== 'plan' && !this.partFramed;
    const common = linked ? visible.flatMap(surface => this.frameBoxes(surface)) : [];
    for (const surface of visible) {
      surface.resize();
      const screenBounds = new THREE.Box3();
      const worldBounds = new THREE.Box3();
      for (const box of linked ? common : this.frameBoxes(surface)) {
        if (box.isEmpty()) continue;
        worldBounds.union(box);
        for (const [x, y, z] of CORNERS) {
          corner.set(x ? box.max.x : box.min.x, y ? box.max.y : box.min.y, z ? box.max.z : box.min.z);
          screenBounds.expandByPoint(corner.applyMatrix4(inverse));
        }
      }
      if (worldBounds.isEmpty()) continue;
      const size = screenBounds.getSize(new THREE.Vector3());
      const center = screenBounds.getCenter(new THREE.Vector3()).applyMatrix4(viewMatrix);
      const distance = Math.max(120, worldBounds.getSize(new THREE.Vector3()).length() * 2);
      const width = linked ? Math.min(...visible.map(item => item.host.clientWidth)) : surface.width;
      const height = linked ? Math.min(...visible.map(item => item.host.clientHeight)) : surface.height;
      const scale = Math.max(size.x / (width * .86), size.y / (height * .82));
      surface.camera.position.copy(center).addScaledVector(offsets, distance);
      surface.camera.zoom = 1;
      surface.controls.target.copy(center);
      surface.setScale(Math.max(.0001, scale));
      surface.controls.update();
      const ground = surface === this.left && (this.partFramed || this.state.underground || this.state.mode === 'floor')
        ? Math.min(this.station.ground, worldBounds.min.y - .08)
        : this.station.ground;
      surface.frameLights(worldBounds, ground);
    }
    this.updatingCameras = false;
    this.requestFrame();
  }

  preset(preset) {
    if (!this.station) return;
    if (preset === 'front') this.fit(new THREE.Vector3(0, 0, 1));
    else if (preset === 'top') this.fit(new THREE.Vector3(0, 1, .0001));
    else this.fit();
  }

  cameraChanged(surface) {
    if (this.updatingCameras || !this.station) return;
    if (this.sync && this.state.compare && this.state.mode !== 'plan' && !this.partFramed) {
      const other = surface === this.left ? this.right : this.left;
      this.updatingCameras = true;
      other.camera.position.copy(surface.camera.position);
      other.camera.zoom = surface.camera.zoom;
      other.controls.target.copy(surface.controls.target);
      other.camera.updateProjectionMatrix();
      other.controls.update();
      this.updatingCameras = false;
    }
    this.requestFrame(this.sync ? null : surface);
  }

  setSync(sync) {
    this.sync = sync;
    this.cameraChanged(this.left);
  }

  setDusk(dusk) {
    this.right.setLight(dusk ? 'dusk' : 'day');
    this.requestFrame(this.right);
  }

  setRotation(rotate) {
    this.rotate = rotate;
    this.left.controls.autoRotate = rotate;
    this.right.controls.autoRotate = rotate && !this.sync;
    this.requestFrame();
  }

  requestFrame(surface = null) {
    if (surface) this.pendingSurfaces.add(surface);
    else for (const target of this.surfaces) this.pendingSurfaces.add(target);
    if (!this.frame) this.frame = requestAnimationFrame(this.draw);
  }

  draw(time) {
    this.frame = 0;
    if (!this.station) {
      for (const surface of this.surfaces) surface.renderer.clear();
      this.pendingSurfaces.clear();
      this.lastTime = null;
      return;
    }
    if (this.rotate) {
      const dt = Math.min(.05, Math.max(0, (time - (this.lastTime ?? time)) * .001));
      this.left.controls.update(dt);
      if (!this.sync) this.right.controls.update(dt);
      this.lastTime = time;
    } else {
      this.lastTime = null;
    }
    for (const surface of this.pendingSurfaces) if (surface.visible) surface.render();
    this.pendingSurfaces.clear();
    if (this.rotate && !this.frame) this.frame = requestAnimationFrame(this.draw);
  }

  configurePicking(surface) {
    let origin;
    surface.canvas.addEventListener('pointerdown', event => {
      if (this.state?.mode === 'inspect' && event.button === 0) origin = [event.clientX, event.clientY];
    });
    surface.canvas.addEventListener('pointerup', event => {
      if (!origin) return;
      const distance = Math.hypot(event.clientX - origin[0], event.clientY - origin[1]);
      origin = null;
      if (this.state?.mode === 'inspect' && distance < 5) this.pick(surface, event);
    });
    surface.canvas.addEventListener('pointercancel', () => { origin = null; });
  }

  pick(surface, event) {
    const rect = surface.canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height);
    this.raycaster.setFromCamera(pointer, surface.camera);
    const hit = this.raycaster.intersectObject(surface.root, true)[0];
    const entry = hit?.object.userData.entry;
    if (!entry) return;
    const floors = this.station.floorSpecs;
    const floor = floors.find(level => level.key === entry.layer) ?? floors.find(level => {
      const band = level.band ?? this.station.bands?.[level.key];
      return band && hit.point.y >= band[0] && hit.point.y < band[1];
    });
    this.events.select(entry.component.id, {
      floor: floor?.short,
      elevation: (hit.point.y + elevationDatum[this.station.id]).toFixed(2),
    });
  }

  configureExplodeDrag() {
    const canvas = this.left.canvas;
    let drag;
    canvas.addEventListener('pointerdown', event => {
      if (this.state?.mode !== 'explode' || this.state.explodeTool === 'orbit' || event.shiftKey || event.button !== 0) return;
      if (drag) return;
      drag = {id: event.pointerId, start: event.clientY, spacing: this.state.spacing};
      canvas.setPointerCapture(event.pointerId);
      event.stopImmediatePropagation();
    }, {capture: true});
    canvas.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      const spacing = Math.max(0, Math.min(12, Math.round((drag.spacing + (drag.start - event.clientY) * .035) * 10) / 10));
      this.events.spacing(spacing);
      event.stopImmediatePropagation();
    }, {capture: true});
    const finish = event => {
      if (drag?.id !== event.pointerId) return;
      drag = null;
      this.fit(this.direction());
      event.stopImmediatePropagation();
    };
    canvas.addEventListener('pointerup', finish, {capture: true});
    canvas.addEventListener('pointercancel', finish, {capture: true});
  }
}
