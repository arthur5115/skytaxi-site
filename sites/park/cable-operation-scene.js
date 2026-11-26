import * as T from "./vendor/three-r170.module.min.js";

const nodes = [
  [-99, 10, 27], [-55, 12, 11], [-19, 14, -4],
  [12, 14.4, -19], [49, 18, -22], [97, 14, -33],
].map(values => new T.Vector3(...values));
const stopNodes = [0, 2, 3, 5];
const landEdge = [[-155, 59], [-100, 47], [-65, 38], [-24, 28], [18, 17], [61, 9], [155, 1]];
const lineOffsets = [-3.45, 3.45];
const railOffsets = [-1.24, 1.24];
const lerp = T.MathUtils.lerp;

function randomSequence(seed = 4301947) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function interpolate(list, x) {
  const next = list.findIndex(([position]) => position >= x);
  if (next <= 0) return list[next === 0 ? 0 : list.length - 1][1];
  const [a, b] = list.slice(next - 1, next + 1);
  return lerp(a[1], b[1], (x - a[0]) / (b[0] - a[0]));
}

const routePlan = nodes.map(p => [p.x, p.z]);
const shore = x => interpolate(landEdge, x) + 2.3 * Math.sin(x * .085) + 1.1 * Math.sin(x * .18);
const routeZ = x => interpolate(routePlan, x);
const hill = (x, z, cx, cz, width, depth, peak) =>
  peak * Math.exp(-(((x - cx) / width) ** 2 + ((z - cz) / depth) ** 2));

function height(x, z) {
  const back = shore(x) - z;
  if (back <= 0) return -.5;
  const hills = 2.2 + hill(x, z, -119, -39, 41, 46, 17)
    + hill(x, z, -57, -83, 47, 37, 28)
    + hill(x, z, 22, -71, 37, 31, 29)
    + hill(x, z, 97, -87, 48, 46, 33)
    + Math.sin(x * .12 + z * .12) + Math.cos(z * .22 - x * .07) * .7;
  const towardHills = T.MathUtils.smoothstep(Math.abs(z - routeZ(x)), 6, 25);
  return Math.min(back / 5, 1) * lerp(2.1 + (x + 104) * .013, hills, towardHills) - .35;
}

function rgb(base, factor = 1) {
  return `rgb(${base.map(x => Math.min(255, Math.max(0, Math.round(x * factor)))).join(" ")})`;
}

function terrainTiles() {
  const result = [];
  const green = [90, 119, 73], sandy = [170, 169, 115];
  const step = 5;
  for (let x = -165; x < 165; x += step) {
    for (let z = -134; z < 63; z += step) {
      const corners = [[x, z], [x + step, z], [x + step, z + step], [x, z + step]];
      if (corners.every(([px, pz]) => pz >= shore(px))) continue;
      const ground = corners.map(([px, pz]) => {
        const edge = Math.min(pz, shore(px));
        return new T.Vector3(px, height(px, edge), edge);
      });
      const shade = (height(x + step, z) - height(x, z) + height(x, z) - height(x, z + step)) * .026;
      const texture = .9 + (Math.sin(x * .115 + z * .13) + Math.cos(z * .19 - x * .09) + 2) * .06;
      const shoreline = 1 - T.MathUtils.clamp((shore(x) - z) / 10, 0, 1);
      result.push({
        corners: ground, center: new T.Vector3(x + 2.5, height(x + 2.5, z + 2.5), z + 2.5),
        color: rgb(green.map((v, i) => lerp(v, sandy[i], shoreline * .76)), texture + shade),
      });
    }
  }
  return result;
}

function forest() {
  const rand = randomSequence();
  const trees = [];
  const colors = [[44, 83, 53], [63, 101, 60], [73, 111, 62], [57, 94, 58], [83, 115, 67], [89, 117, 63]];
  for (let n = 0; n < 3000; n++) {
    const x = -158 + rand() * 316;
    const z = -129 + rand() * 179;
    if (z > shore(x) - 3 || Math.abs(z - routeZ(x)) < 7.5 ||
        stopNodes.some(index => Math.abs(nodes[index].x - x) < 11 && Math.abs(nodes[index].z - z) < 14)) continue;
    const y = height(x, z);
    const size = 1.2 + rand() * 3.4;
    trees.push({
      base: new T.Vector3(x, y, z), top: new T.Vector3(x, y + size, z),
      size, color: colors[Math.floor(rand() * colors.length)], seed: rand(),
    });
  }
  return trees;
}

function makeTrack(stationMeters, supportMeters) {
  const [t1, t2, t3, t4] = stationMeters;
  const [p1, p2] = supportMeters;
  const meters = [t1, p1, t2, t3, p2, t4];
  const last = meters.length - 1;
  const spline = new T.CatmullRomCurve3(nodes);
  return (distance, offset) => {
    const d = T.MathUtils.clamp(distance, 0, meters[last]);
    const next = meters.findIndex(meter => meter > d);
    const i = next === -1 ? last - 1 : next - 1;
    const f = (d - meters[i]) / (meters[i + 1] - meters[i]);
    const t = (i + f) / last;
    const point = spline.getPoint(t);
    const forward = spline.getTangent(t).setY(0).normalize();
    const side = new T.Vector3(-forward.z, 0, forward.x);
    point.y -= Math.sin(Math.PI * f) * .24;
    point.addScaledVector(forward, (distance - d) * .1).addScaledVector(side, offset);
    return { point, forward, side };
  };
}

const concrete = [[185, 182, 157], [151, 152, 134], [123, 135, 122]];
const glass = [[92, 132, 124], [71, 112, 108], [54, 89, 87]];
const timber = [[154, 116, 79], [125, 91, 61], [112, 79, 52]];
const roof = [[169, 178, 147], [132, 145, 124], [103, 124, 107]];
const shades = {
  shell: [[250, 248, 229], [235, 238, 225], [184, 204, 194]],
  windows: [[44, 69, 67], [30, 50, 54], [25, 44, 50]],
  metal: [[166, 181, 168], [126, 146, 137], [89, 112, 107]],
};
const v = (...coordinates) => new T.Vector3(...coordinates);

function cuboid(size, center, palette) {
  const [x, y, z] = size.map(value => value / 2);
  const points = [[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]
    .map(p => v(...p).add(center));
  return [
    [[7,6,2,3], palette[0]], [[3,2,1,0], palette[2]], [[5,6,7,4], palette[1]],
    [[4,7,3,0], palette[1]], [[2,6,5,1], palette[2]], [[1,5,4,0], palette[2]],
  ].map(([ids, color]) => ({ points: ids.map(id => points[id]), color: rgb(color) }));
}

function makeStation(basis, index) {
  const { point: center } = basis;
  const platform = [];
  const building = [];
  const add = (size, point, palette) => building.push(...cuboid(size, v(...point), palette));
  const addPlatform = (size, point, palette) => platform.push(...cuboid(size, v(...point), palette));
  const floors = [1, 3, 4, 1][index];
  const floor = center.y - 2.83 - height(center.x, center.z - 6.5);
  // Keep the running channels clear and the deck below the cabin floor.
  addPlatform([15, .42, 12.8], [0, -3.58, 0], concrete);
  addPlatform([15, .52, 3.75], [0, -2.92, 0], concrete);
  for (const z of [-5.66, 5.66]) {
    addPlatform([15, .52, 1.48], [0, -2.92, z], concrete);
  }
  addPlatform([15, .03, .11], [0, -2.64, 5.22], [[230, 201, 123], [210, 171, 96], [173, 141, 74]]);
  add([11.7, floor, 6], [0, -2.83 - floor / 2, -8], timber);
  for (let i = 0; i < floors; i++) {
    const span = 15.6 - i * .6;
    const y = -2.95 + i * 1.12;
    add([span, .25, 6.5], [0, y, -7.8], concrete);
    add([span - 1.05, .83, 5.9], [0, y + .55, -7.9], glass);
    for (const x of [-4.5, -1.5, 1.5, 4.5]) add([.12, .81, .13], [x, y + .55, -4.88], timber);
  }
  add([15.9 - (floors - 1) * .6, .3, 6.8], [0, -3.01 + floors * 1.12, -7.9], roof);
  for (const x of [-7, 7]) for (const z of [-5.9, 5.9]) add([.29, 3.55, .29], [x, -.98, z], concrete);
  add([15.5, .23, 1.45], [0, .88, 5.8], roof);
  add([15.5, .23, 1.4], [0, .88, -5.8], roof);
  const place = face => placeFace(face, basis, center);
  return { platform: platform.map(place), building: building.map(place) };
}

function placeFace(face, { forward, side }, center) {
  return {
    color: face.color,
    points: face.points.map(point => center.clone().addScaledVector(forward, point.x)
      .addScaledVector(side, point.z).setY(center.y + point.y)),
  };
}

function makeSupport(center) {
  const parts = [];
  for (const offset of [-6.7, 6.7]) {
    const z = center.z + offset;
    const bottom = height(center.x, z);
    const rise = center.y + .48 - bottom;
    parts.push(...cuboid([.78, rise, .8], v(center.x, bottom + rise / 2, z), concrete));
    parts.push(...cuboid([1.8, .46, 1.8], v(center.x, bottom + .18, z), concrete));
  }
  parts.push(...cuboid([.96, .57, 14.05], center.clone().add(v(0,.46,0)), concrete));
  return parts;
}

function podFaces() {
  const rings = 16;
  const profile = [
    [-2.48, .40, .72], [-2.25, .81, .91], [-1.62, 1.04, 1.04], [-1.13, 1.11, 1.07],
    [1.13, 1.11, 1.07], [1.62, 1.04, 1.04], [2.25, .81, .91], [2.48, .4, .72],
  ];
  const layers = profile.map(([x, y, z]) => Array.from({length:rings}, (_, i) => {
    const angle = i * 2 * Math.PI / rings;
    return v(x, y * Math.cos(angle), z * Math.sin(angle));
  }));
  const faces = [];
  for (let a = 1; a < layers.length; a++) {
    for (let j = 0; j < rings; j++) {
      const n = (j + 1) % rings;
      const mat = (j >= 2 && j < 6) || (j >= 10 && j < 14) ? shades.windows : shades.shell;
      const tint = j < 4 || j >= 12 ? 0 : j < 8 ? 1 : 2;
      faces.push({ points: [layers[a-1][j], layers[a-1][n], layers[a][n], layers[a][j]], color: rgb(mat[tint]) });
    }
  }
  faces.push({ points: layers[0].slice().reverse(), color: rgb(shades.windows[1]) });
  faces.push({ points: layers.at(-1), color: rgb(shades.windows[1]) });
  for (const side of [-1, 1]) {
    for (const x of [-.83, 0, .83]) {
      faces.push(...cuboid([.065,.83,.025],v(x,.005,side*1.063),shades.metal));
    }
    faces.push(...cuboid([2.42,.14,.31],v(0,1.105,side*1.03),shades.metal));
    for (const x of [-.69,.69]) {
      faces.push(...cuboid([.48,.17,.37],v(x,1.235,side*1.23),shades.metal));
    }
  }
  return faces;
}

function shape(ctx, points, color, seam = false) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  if (seam) {
    ctx.strokeStyle = color;
    ctx.lineWidth = .42;
    ctx.stroke();
  }
}

function trace(ctx, a, b, color, size) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineWidth = size;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function lakeGeometry() {
  const shoreline = Array.from({ length: 64 }, (_, i) => {
    const x = -165 + i * 330 / 63;
    return v(x, -.46, shore(x));
  });
  const rand = randomSequence(9871);
  const ripples = Array.from({ length: 180 }, (_, i) => {
    const x = -153 + rand() * 306;
    const z = shore(x) + 2.7 + rand() * 93;
    return { a: v(x, -.42, z), b: v(x + 1 + rand() * 5, -.42, z),
             color: i % 4 === 0 ? "#b4d7bd67" : "#9ec7b24d" };
  });
  return { boundary: [...shoreline, v(440, -.46, 350), v(-440, -.46, 350)], ripples };
}

export function createScene(canvas, stationMeters, supportMeters, markers) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Canvas unavailable");
  const terrain = terrainTiles();
  const trees = forest();
  const lake = lakeGeometry();
  const track = makeTrack(stationMeters, supportMeters);
  const pod = podFaces();
  const stations = stationMeters.map((meters, i) => makeStation(track(meters, 0), i));
  const platforms = stations.flatMap(station => station.platform);
  const staticFaces = stations.flatMap(station => station.building)
    .concat(makeSupport(nodes[1]), makeSupport(nodes[4]));
  const anchors = stopNodes.map(index => nodes[index].clone().add(v(0,3.6,.4)));
  const rails = [];
  const length = stationMeters.at(-1);
  for (const [i, offset] of lineOffsets.entries()) {
    for (const side of railOffsets) {
      const color = i === 0 ? "#e4c787" : "#a0cfca";
      for (let d = -12; d < length + 12; d += 16) {
        rails.push({ a:track(d, offset + side).point, b:track(Math.min(d + 16, length + 12), offset + side).point, color });
      }
    }
  }

  const camera = new T.PerspectiveCamera(39, 1, 1, 700);
  const target = v(0, 0, 0);
  const projection = new T.Matrix4();
  const frustum = new T.Frustum();
  const scratch = new T.Vector4();
  const near = 1.05;
  const backdrop = document.createElement("canvas");
  const background = backdrop.getContext("2d", { alpha: false });
  if (!background) throw new Error("Canvas unavailable");
  let cameraView;
  let cameraMeters;
  let width = 1;
  let heightPx = 1;
  let ratio = 1;
  let staticQueue = [];
  let cameraDirty = true;

  function resize() {
    const nextWidth = Math.max(1, canvas.clientWidth || canvas.parentElement.clientWidth);
    const nextHeight = Math.max(1, canvas.clientHeight || canvas.parentElement.clientHeight);
    const nextRatio = Math.min(window.devicePixelRatio || 1, 1.65);
    if (nextWidth === width && nextHeight === heightPx && nextRatio === ratio && !cameraDirty) return;
    width = nextWidth;
    heightPx = nextHeight;
    ratio = nextRatio;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(heightPx * ratio);
    backdrop.width = canvas.width;
    backdrop.height = canvas.height;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    background.setTransform(ratio, 0, 0, ratio, 0, 0);
    camera.aspect = width / heightPx;
    camera.updateProjectionMatrix();
    cameraDirty = true;
  }

  function project(point) {
    scratch.set(point.x, point.y, point.z, 1).applyMatrix4(projection);
    const scale = 1 / Math.max(near, scratch.w);
    return { x: (scratch.x * scale + 1) * width / 2, y: (1 - scratch.y * scale) * heightPx / 2, depth: scratch.w };
  }

  function clipEdge(from, to, fromDepth, toDepth) {
    return project(from.clone().lerp(to, (near - fromDepth) / (toDepth - fromDepth)));
  }

  function projectPolygon(points) {
    const dots = points.map(project);
    if (dots.every(point => point.depth >= near)) return dots;
    if (dots.every(point => point.depth < near)) return [];
    const result = [];
    for (const [index, current] of dots.entries()) {
      const previousIndex = (index + dots.length - 1) % dots.length;
      const previous = dots[previousIndex];
      const visible = current.depth >= near;
      if ((previous.depth >= near) !== visible) {
        result.push(clipEdge(points[previousIndex], points[index], previous.depth, current.depth));
      }
      if (visible) result.push(current);
    }
    return result;
  }

  function updateCamera(meters, view) {
    if (view === "follow") {
      const leader = track(meters, lineOffsets[0]);
      const wide = Math.max(0, 1.8 - camera.aspect) * 4;
      // Stay on the lake side of the same rigid car when it reverses at a terminal.
      camera.position.copy(leader.point).addScaledVector(leader.side, 17 + wide)
        .addScaledVector(leader.forward, -8);
      camera.position.y += 7.7;
      target.copy(leader.point).addScaledVector(leader.forward, 1);
      target.y -= 1.46;
    } else {
      const distance = Math.max(1, 1.95 / camera.aspect);
      target.set(-15, 4, -11);
      camera.position.set(-20, 4 + 87 * distance, -11 + 179 * distance);
    }
    camera.lookAt(target);
    camera.updateMatrixWorld();
    projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projection);
  }

  function onScreen(points) {
    return points.some(p => p.x >= -2) && points.some(p => p.x <= width + 2) &&
      points.some(p => p.y >= -2) && points.some(p => p.y <= heightPx + 2);
  }

  function pathEntry(f) {
    const dots = projectPolygon(f.points);
    if (dots.length < 3 || !onScreen(dots)) return null;
    // The downward canvas Y axis gives camera-facing polygons negative signed area.
    const winding = dots.reduce((sum, point, index) => {
      const next = dots[(index + 1) % dots.length];
      return sum + point.x * next.y - point.y * next.x;
    }, 0);
    if (winding >= 0) return null;
    const depth = dots.reduce((sum, point) => sum + point.depth, 0) / dots.length;
    return { depth, draw: surface => shape(surface, dots, f.color, true) };
  }

  function treeEntry(tree, detailed) {
    const center = project(tree.top);
    if (center.depth < 2 || center.x < -30 || center.x > width + 30 || center.y < -28 || center.y > heightPx + 35) return null;
    const base = project(tree.base);
    const r = Math.min(65, tree.size * heightPx / (center.depth * 1.52));
    if (r < .55) return null;
    const color = tree.color;
    return { depth: center.depth, draw: surface => {
      if (r > 3.2) trace(surface, base, center, "#635b42", Math.max(.6, r * .105));
      surface.fillStyle = rgb(color, .83);
      surface.beginPath();
      surface.ellipse(center.x, center.y + r * .12, r, r * .7, 0, 0, Math.PI * 2);
      surface.fill();
      if (detailed || r > 2.1) {
        surface.fillStyle = rgb(color, 1.13);
        surface.beginPath();
        surface.ellipse(center.x - r * .26, center.y - r * .19, r * .73, r * .56, tree.seed * .8, 0, Math.PI * 2);
        surface.fill();
      }
    }};
  }

  function railEntry(segment) {
    let a = project(segment.a), b = project(segment.b);
    if (a.depth < near && b.depth < near) return null;
    if (a.depth < near) a = clipEdge(segment.a, segment.b, a.depth, b.depth);
    if (b.depth < near) b = clipEdge(segment.a, segment.b, a.depth, b.depth);
    if (!onScreen([a, b])) return null;
    const depth = (a.depth + b.depth) / 2;
    return { depth, draw: surface => {
      const size = Math.min(8, Math.max(1.15, heightPx * .39 / Math.max(depth, 2)));
      trace(surface, a, b, "#3f5550", size + .85);
      trace(surface, a, b, segment.color, size * .65);
    }};
  }

  function drawBackdrop(surface) {
    const sky = surface.createLinearGradient(0, 0, 0, heightPx);
    sky.addColorStop(0, "#8eaeae");
    sky.addColorStop(.42, "#b6c7a8");
    sky.addColorStop(1, "#79a69a");
    surface.fillStyle = sky;
    surface.fillRect(0, 0, width, heightPx);

    const water = surface.createLinearGradient(0, heightPx * .42, 0, heightPx);
    water.addColorStop(0, "#73a49b");
    water.addColorStop(.63, "#467e7c");
    water.addColorStop(1, "#2c6569");
    const waterShape = projectPolygon(lake.boundary);
    if (waterShape.length >= 3) shape(surface, waterShape, water, true);
    for (const ripple of lake.ripples) {
      const a = project(ripple.a);
      const b = project(ripple.b);
      if (a.depth >= near && b.depth >= near && a.x > -20 && a.x < width && a.y < heightPx) {
        trace(surface, a, b, ripple.color, .55);
      }
    }

    const sorted = terrain.filter(tile => frustum.planes.every(plane => plane.distanceToPoint(tile.center) > -9))
      .map(tile => ({ ...tile, depth: project(tile.center).depth })).sort((a,b) => b.depth - a.depth);
    for (const tile of sorted) {
      const dots = projectPolygon(tile.corners);
      if (dots.length < 3 || !onScreen(dots)) continue;
      shape(surface, dots, tile.color, true);
    }
    // At platform level a single large face can sort ahead of the car even
    // though it is below it. Composite the decks before the vehicle layer.
    for (const part of platforms.map(pathEntry).filter(Boolean).sort((a,b) => b.depth - a.depth)) {
      part.draw(surface);
    }
  }

  function prepareStatic(view) {
    const entries = staticFaces.map(pathEntry).concat(rails.map(railEntry), trees.map(tree => treeEntry(tree, view === "follow")));
    return entries.filter(Boolean).sort((a,b) => b.depth - a.depth);
  }

  function drawVehicles(trips) {
    return trips.flatMap((trip, i) => {
      const basis = track(trip.meters, lineOffsets[i]);
      const center = basis.point.clone().add(v(0,-1.43,0));
      const volume = new T.Sphere(center, 3);
      if (!frustum.intersectsSphere(volume)) return [];
      return pod.map(face => pathEntry(placeFace(face, basis, center)));
    }).filter(Boolean).sort((a,b) => b.depth - a.depth);
  }

  function drawScene(trips, view) {
    const meters = trips[0].meters;
    if (cameraDirty || view !== cameraView || (view === "follow" && meters !== cameraMeters)) {
      updateCamera(meters, view);
      drawBackdrop(background);
      staticQueue = prepareStatic(view);
      cameraView = view;
      cameraMeters = meters;
      cameraDirty = false;
      if (view === "overview") {
        for (const [i, marker] of markers.entries()) {
          const point = project(anchors[i]);
          marker.style.left = `${point.x}px`;
          marker.style.top = `${point.y}px`;
        }
      }
    }
    ctx.drawImage(backdrop, 0, 0, width, heightPx);

    const vehicles = drawVehicles(trips);
    let i = 0;
    for (const part of staticQueue) {
      while (i < vehicles.length && vehicles[i].depth > part.depth) vehicles[i++].draw(ctx);
      part.draw(ctx);
    }
    for (; i < vehicles.length; i++) vehicles[i].draw(ctx);
  }

  resize();
  return { draw: drawScene, resize };
}
