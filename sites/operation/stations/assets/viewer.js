import { bindModelDrag } from "../../assets/model-drag.js?v=1.4";
import { getLanguage, onLanguageChange } from "../../assets/site-language.js?v=1.4";
import { t1Native } from "./t1-geometry.js";

const galleryAssets={"t1-aerial":"assets/t1-aerial.webp","t1-long":"assets/t1-long.webp","t1-section":"assets/t1-section.webp","t1-plan":"assets/t1-plan.webp","t1-platform":"assets/t1-platform.webp","t1-roof":"assets/t1-roof.webp","t1-structure":"assets/t1-structure.webp","t2-aerial":"assets/t2-aerial.webp","t2-basement":"assets/t2-basement.webp","t2-podium":"assets/t2-podium.webp","t2-level6":"assets/t2-level6.webp","t2-r5":"assets/t2-r5.webp","t2-north":"assets/t2-north.webp","t2-platform":"assets/t2-platform.webp","t2-structure":"assets/t2-structure.webp","t3-site":"assets/t3-site.webp","t3-aerial":"assets/t3-aerial.webp","t3-long":"assets/t3-long.webp","t3-cross":"assets/t3-cross.webp","t3-wing":"assets/t3-wing.webp","t3-platform":"assets/t3-platform.webp","t3-lake":"assets/t3-lake.webp","t3-structure":"assets/t3-structure.webp","t4-aerial":"assets/t4-aerial.webp","t4-forest":"assets/t4-forest.webp"};
const vec = {
  sub: (a, b) => a.map((v, i) => v - b[i]),
  add: (a, b) => a.map((v, i) => v + b[i]),
  scale: (a, s) => a.map(v => v * s),
  dot: (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0),
  cross: (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ],
  unit: a => vec.scale(a, 1 / (Math.hypot(...a) || 1)),
};

const parseColor = hex => {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
};

function rotation(x, z, angle) {
  return [x * Math.cos(angle) - z * Math.sin(angle), x * Math.sin(angle) + z * Math.cos(angle)];
}

class Mesh {
  constructor() {
    this.opaque = [];
    this.translucent = [];
  }

  tri(a, b, c, hex, opacity = 1) {
    const n = vec.unit(vec.cross(vec.sub(b, a), vec.sub(c, a)));
    const color = parseColor(hex);
    const vertices = opacity < 1 ? this.translucent : this.opaque;
    for (const p of [a, b, c]) vertices.push(...p, ...n, ...color, opacity);
  }

  quad(a, b, c, d, color, opacity = 1) {
    this.tri(a, b, c, color, opacity);
    this.tri(a, c, d, color, opacity);
  }

  prism(points, low, high, color, options = {}) {
    const {top = color, alpha = 1} = options;
    const foot = points.map(([x, z]) => [x, low, z]);
    const roof = points.map(([x, z]) => [x, high, z]);
    for (let i = 1; i + 1 < points.length; i++) {
      this.tri(roof[0], roof[i + 1], roof[i], top, alpha);
      this.tri(foot[0], foot[i], foot[i + 1], color, alpha);
    }
    for (let i = 0; i < points.length; i++) {
      const next = (i + 1) % points.length;
      this.quad(foot[i], roof[i], roof[next], foot[next], color, alpha);
    }
  }

  box(x, y, z, w, h, d, color, options = {}) {
    const {angle = 0} = options;
    const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
      .map(([a, b]) => rotation(a, b, angle)).map(([a, b]) => [a + x, b + z]);
    this.prism(corners, y, y + h, color, options);
  }

  ellipse(x, y, z, rx, rz, h, color, options = {}) {
    const points = Array.from({length: 34}, (_, i) => {
      const t = i * Math.PI * 2 / 34;
      return [x + rx * Math.cos(t), z + rz * Math.sin(t)];
    });
    this.prism(points, y, y + h, color, options);
  }

  tube(a, b, radius, color, ends = 7, r2 = radius) {
    const axis = vec.unit(vec.sub(b, a));
    const ref = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = vec.unit(vec.cross(axis, ref));
    const v = vec.cross(axis, u);
    const ring = (p, r, i) => {
      const t = 2 * Math.PI * i / ends;
      return vec.add(p, vec.add(vec.scale(u, r * Math.cos(t)), vec.scale(v, r * Math.sin(t))));
    };
    for (let i = 0; i < ends; i++) {
      const lo = ring(a, radius, i);
      const loNext = ring(a, radius, i + 1);
      const hi = ring(b, r2, i);
      const hiNext = ring(b, r2, i + 1);
      this.quad(lo, loNext, hiNext, hi, color);
      this.tri(a, loNext, lo, color);
      this.tri(b, hi, hiNext, color);
    }
  }

  strip(path, width, y, color, depth = .22, top = color) {
    for (let i = 1; i < path.length; i++) {
      const [ax, az] = path[i - 1];
      const [bx, bz] = path[i];
      this.box((ax + bx) / 2, y, (az + bz) / 2, Math.hypot(bx - ax, bz - az) + .1, depth, width, color,
        {angle: Math.atan2(bz - az, bx - ax), top});
    }
  }

  path3(path, radius, color, ends = 5) {
    for (let i = 1; i < path.length; i++) this.tube(path[i - 1], path[i], radius, color, ends);
  }
}

const vertexSource = [
  "attribute vec3 a_position, a_normal;",
  "attribute vec4 a_color;",
  "uniform vec3 u_center, u_shift, u_right, u_up, u_forward;",
  "uniform vec2 u_scale;",
  "varying vec3 v_world, v_normal;",
  "varying vec4 v_color;",
  "void main(){",
  "  vec3 q = a_position + u_shift - u_center;",
  "  gl_Position = vec4(dot(q,u_right)*u_scale.x,dot(q,u_up)*u_scale.y,-dot(q,u_forward)*.002,1.);",
  "  v_world = a_position;",
  "  v_normal = a_normal;",
  "  v_color = a_color;",
  "}",
].join("\n");

const fragmentSource = [
  "precision mediump float;",
  "varying vec3 v_world, v_normal;",
  "varying vec4 v_color;",
  "uniform vec2 u_cut;",
  "uniform float u_strength;",
  "void main(){",
  "  if (v_world.y > u_cut.x || v_world.z > u_cut.y) discard;",
  "  vec3 normal = normalize(v_normal);",
  "  float lambert = max(0.,dot(normal,normalize(vec3(-.46,.84,.48))));",
  "  float bounced = max(0.,dot(normal,normalize(vec3(.65,.26,-.91))));",
  "  float light = .64 + lambert*.35 + bounced*.08;",
  "  vec3 color = v_color.rgb * light;",
  "  color = mix(color * vec3(.46,.53,.58), color, u_strength);",
  "  gl_FragColor = vec4(color,v_color.a);",
  "}",
].join("\n");

function shader(gl, kind, source) {
  const handle = gl.createShader(kind);
  gl.shaderSource(handle, source);
  gl.compileShader(handle);
  if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(handle));
  return handle;
}

function meshBounds(mesh) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity,-Infinity,-Infinity];
  for (const values of [mesh.opaque, mesh.translucent]) {
    for (let i = 0; i < values.length; i += 10) {
      for (let axis=0; axis<3; axis++) {
        min[axis] = Math.min(min[axis], values[i+axis]);
        max[axis] = Math.max(max[axis], values[i+axis]);
      }
    }
  }
  return {min, max, center:min.map((v,i)=>(v+max[i])/2)};
}

function boundsCorners(bounds, offset) {
  const {min,max}=bounds;
  return [min[0],max[0]].flatMap(x => [min[1],max[1]].flatMap(y =>
    [min[2],max[2]].map(z => [x+offset[0],y+offset[1],z+offset[2]])));
}

function partOffset(part, state, shifts) {
  const parent = vec.scale(shifts[part.group],state.explode);
  if (!state.detached.has(part.key)) return parent;
  return vec.add(parent, part.move ?? [0,7,0]);
}

function partStrength(part, state) {
  if (state.scope) return 1;
  if (state.picked) return state.picked === part.key ? 1 : .20;
  return state.active === null || state.active === part.group ? 1 : .25;
}

class Viewport {
  constructor(canvas, fallback) {
    this.canvas = canvas;
    this.fallback = fallback;
    const gl = canvas.getContext("webgl", {alpha: true, antialias: true, premultipliedAlpha: false});
    this.gl = gl;
    if (!gl) {
      canvas.hidden = true;
      fallback.hidden = false;
      this.canvas = fallback;
      this.context = fallback.getContext("2d");
      return;
    }
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(prog, shader(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    this.attrs = ["a_position", "a_normal", "a_color"].map(name => gl.getAttribLocation(prog, name));
    this.uniforms = Object.fromEntries(
      ["center", "shift", "right", "up", "forward", "scale", "cut", "strength"]
        .map(name => [name, gl.getUniformLocation(prog, "u_" + name)])
    );
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }

  setModel(model) {
    this.model = model;
    for (const part of model.parts) part.bounds ??= meshBounds(part.mesh);
    if (!this.gl) return;
    const gl = this.gl;
    for (const band of this.buffers || []) gl.deleteBuffer(band.buffer);
    this.buffers = model.parts.flatMap(part =>
      ["opaque", "translucent"].filter(key => part.mesh[key].length).map(key => {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.mesh[key]), gl.STATIC_DRAW);
        return {buffer, part, key, length: part.mesh[key].length / 10};
      })
    );
  }

  prepare(state) {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    const dpr = this.gl ? Math.min(2, window.devicePixelRatio || 1) : 1;
    if (this.canvas.width !== Math.round(width * dpr) || this.canvas.height !== Math.round(height * dpr)) {
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
    }
    const {yaw, pitch, explode, zoom, cut, section, active, picked, scope} = state;
    const forward = [Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)];
    const right = [Math.cos(yaw), 0, -Math.sin(yaw)];
    const up = vec.cross(forward, right);
    const {center: pivot, span, shifts, sectionZ} = this.model;
    let center = [pivot[0], pivot[1] + 8 * explode, pivot[2]];
    let pixels = Math.min(width / span, height / (span * .66)) * (1 - .10 * explode);
    const offsets = new Map(this.model.parts.map(part => [part.key,partOffset(part,state,shifts)]));
    const parts = this.model.parts.filter(part => {
      if (scope) return scope.has(part.key);
      return !part.buried || part.key === picked || (part.group === active && explode > .16)
        || state.detached.has(part.key);
    });
    const focus = scope ?? (picked && state.focus ? new Set([picked]) : null);
    if (focus) {
      const corners = parts.filter(part=>focus.has(part.key))
        .flatMap(part=>boundsCorners(part.bounds,offsets.get(part.key)));
      if (corners.length) {
        center = [0,1,2].map(axis => {
          const coords = corners.map(p=>p[axis]);
          return (Math.min(...coords)+Math.max(...coords))/2;
        });
        const along = corners.map(p=>vec.dot(p,right));
        const above = corners.map(p=>vec.dot(p,up));
        const dx = Math.max(...along)-Math.min(...along);
        const dy = Math.max(...above)-Math.min(...above);
        pixels = Math.min(width/(Math.max(8,dx)*1.28),height/(Math.max(8,dy)*1.43));
      }
    }
    if (state.scopeMode === "difference") {
      center = this.model.levelDifference.center;
      pixels = Math.min(width / 40,height / 23);
    }
    this.frame = {
      width, height, dpr, forward, right, up, center, pixels:pixels*zoom, offsets, active, picked, parts,
      visible:new Map(parts.map(part => [part.key,partStrength(part,state)])),
      cut: [cut ?? 900, section ? sectionZ : 900],
    };
  }

  project(position, offset = [0, 0, 0]) {
    const {center, forward, right, up, width, height, pixels} = this.frame;
    const p = vec.sub(vec.add(position, offset), center);
    return [
      width / 2 + vec.dot(p, right) * pixels,
      height / 2 - vec.dot(p, up) * pixels,
      vec.dot(p, forward),
    ];
  }

  draw(state) {
    this.prepare(state);
    if (this.gl) this.drawWebGL();
    else this.drawCanvas();
    return this.frame;
  }

  pick(x, y) {
    if (!this.frame) return null;
    const {offsets, cut, parts} = this.frame;
    let nearest = -Infinity, target = null;
    for (const part of parts) {
      const offset = offsets.get(part.key);
      const box = boundsCorners(part.bounds,offset).map(p=>this.project(p));
      if (box.every(p=>p[0]<x) || box.every(p=>p[0]>x) || box.every(p=>p[1]<y)
          || box.every(p=>p[1]>y) || box.every(p=>p[2]<nearest)) continue;
      for (const values of [part.mesh.opaque,part.mesh.translucent]) {
        for (let i=0;i<values.length;i+=30) {
          const w = [values.slice(i,i+3),values.slice(i+10,i+13),values.slice(i+20,i+23)];
          const [a,b,c] = w.map(p=>this.project(p,offset));
          const u0=b[0]-a[0],v0=b[1]-a[1],u1=c[0]-a[0],v1=c[1]-a[1];
          const det=u0*v1-u1*v0;
          if (Math.abs(det)<1e-6) continue;
          const dx=x-a[0],dy=y-a[1];
          const u=(dx*v1-dy*u1)/det, v=(dy*u0-dx*v0)/det;
          const t=1-u-v;
          if (u<0 || v<0 || t<0) continue;
          if (t*w[0][1]+u*w[1][1]+v*w[2][1]>cut[0] || t*w[0][2]+u*w[1][2]+v*w[2][2]>cut[1]) continue;
          const z=t*a[2]+u*b[2]+v*c[2];
          if (z>nearest) {
            nearest=z;
            target=part.group===0 ? null : part.key;
          }
        }
      }
    }
    return target;
  }

  drawWebGL() {
    const gl = this.gl;
    const {forward, right, up, center, pixels, width, height, cut, offsets, visible} = this.frame;
    const u = this.uniforms;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform3fv(u.forward, forward);
    gl.uniform3fv(u.right, right);
    gl.uniform3fv(u.up, up);
    gl.uniform3fv(u.center, center);
    gl.uniform2f(u.scale, pixels * 2 / width, pixels * 2 / height);
    gl.uniform2fv(u.cut, cut);
    for (const key of ["opaque", "translucent"]) {
      gl.depthMask(key === "opaque");
      for (const band of this.buffers) {
        const id=band.part.key;
        if (band.key !== key || !visible.has(id)) continue;
        gl.uniform3fv(u.shift, offsets.get(id));
        gl.uniform1f(u.strength,visible.get(id));
        gl.bindBuffer(gl.ARRAY_BUFFER, band.buffer);
        for (const [i, size, start] of [[0, 3, 0], [1, 3, 12], [2, 4, 24]]) {
          gl.enableVertexAttribArray(this.attrs[i]);
          gl.vertexAttribPointer(this.attrs[i], size, gl.FLOAT, false, 40, start);
        }
        gl.drawArrays(gl.TRIANGLES, 0, band.length);
      }
    }
    gl.depthMask(true);
  }

  drawCanvas() {
    const ctx = this.context;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const {offsets, cut, parts, visible} = this.frame;
    if (!this.raster || this.raster.width !== width || this.raster.height !== height) {
      this.raster = ctx.createImageData(width, height);
      this.depth = new Float32Array(width * height);
    }
    this.raster.data.fill(0);
    this.depth.fill(-1e6);
    for (const key of ["opaque","translucent"]) {
      for (const part of parts) {
        const values = part.mesh[key];
        const muted=.48+.52*visible.get(part.key);
        for (let i = 0; i < values.length; i += 30) {
          const world = [values.slice(i, i + 3), values.slice(i + 10, i + 13), values.slice(i + 20, i + 23)];
          let polygon = clipPlane(world, 1, cut[0]);
          polygon = clipPlane(polygon, 2, cut[1]);
          if (polygon.length < 3) continue;
          const screen = polygon.map(p => this.project(p, offsets.get(part.key)));
          const n = values.slice(i + 3, i + 6);
          const light = .63 + Math.max(0, vec.dot(n, [-.45, .8, .42])) * .34;
          const rgb = values.slice(i + 6, i + 9).map(v => Math.round(v * light * muted * 255));
          for (let j = 1; j + 1 < screen.length; j++) {
            paintTriangle(this.raster, this.depth, screen[0], screen[j], screen[j+1], rgb, values[i + 9]);
          }
        }
      }
    }
    ctx.putImageData(this.raster, 0, 0);
  }
}

function paintTriangle(image, depth, a, b, c, color, opacity) {
  const {width, height, data} = image;
  const left = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
  const right = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
  const top = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
  const bottom = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
  const ax = b[0] - a[0], ay = b[1] - a[1];
  const bx = c[0] - a[0], by = c[1] - a[1];
  const determinant = ax * by - ay * bx;
  if (Math.abs(determinant) < .001) return;
  const uStep = by / determinant;
  const vStep = -ay / determinant;
  const dz1 = b[2] - a[2], dz2 = c[2] - a[2];
  for (let y = top; y <= bottom; y++) {
    const dy = y + .5 - a[1];
    const dx = left + .5 - a[0];
    let u = dx * uStep - dy * bx / determinant;
    let v = dx * vStep + dy * ax / determinant;
    for (let x = left; x <= right; x++, u += uStep, v += vStep) {
      if (u < -.000001 || v < -.000001 || u + v > 1.000001) continue;
      const index = y * width + x;
      const z = a[2] + u * dz1 + v * dz2;
      if (z < depth[index] - .0001) continue;
      const p = index * 4;
      if (opacity >= 1) {
        depth[index] = z;
        data[p] = color[0];
        data[p + 1] = color[1];
        data[p + 2] = color[2];
        data[p + 3] = 255;
      } else {
        const rear = data[p + 3] / 255 * (1 - opacity);
        const sum = opacity + rear;
        for (let j = 0; j < 3; j++) data[p + j] = (color[j] * opacity + data[p + j] * rear) / sum;
        data[p + 3] = sum * 255;
      }
    }
  }
}

function clipPlane(poly, axis, threshold) {
  if (!poly.length || threshold > 500) return poly;
  const result = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const da = threshold - a[axis];
    const db = threshold - b[axis];
    if (da >= 0) result.push(a);
    if ((da >= 0) !== (db >= 0)) result.push(vec.add(a, vec.scale(vec.sub(b, a), da / (da - db))));
  }
  return result;
}

const bi = (zh, en) => ({zh, en});
const level = (zh, en, modelY, el) => ({name: bi(zh, en), modelY, el});
const layer = (zh, en, color, facts, cost) => ({name: bi(zh, en), color, facts, cost});

const stations = [
  {
    id: "T1", name: bi("新化之門站", "Xinhua Gate"),
    title: bi("光舟與階梯商店街", "Light Ark & Stepped Shopping Streets"),
    description: bi("光舟架空於迎賓廣場，兩座空中通廊在月台同高銜接南北階梯商店街。", "The raised Light Ark connects to the north and south stepped shopping streets by level skybridges."),
    phase: bi("第一階段", "Phase I"),
    stats: [
      {value: "EL50.75", name: bi("月台完成面", "Platform level")},
      {value: "91.25 m", name: bi("光舟站體長", "Gridshell length")},
      {value: "5,235 m²", name: bi("南北街總樓地板", "Shopping street floor area")},
    ],
    levels: [level("廣場", "Plaza", .08, "32.50"), level("第 4 段", "Terrace 4", 4.82, "37.25"),
      level("第 3 段", "Terrace 3", 9.32, "41.75"), level("第 2 段", "Terrace 2", 13.82, "46.25"),
      level("月台", "Platforms", 18.34, "50.75"), level("天空步道", "Skywalk", 27.06, "59.40")],
    layers: [
      layer("廣場、水鏡與機電房", "Plaza, water mirror & plant rooms", "#6ea3b7", [
        bi("水鏡約 742 m²，水深約 2 cm，可排乾。", "The drainable water mirror covers about 742 m² and is about 2 cm deep."),
        bi("西端四間機電房約 136 m²，位於 CH−89～−72。", "Four plant rooms at CH−89 to −72 total about 136 m²."),
      ], 6328.6),
      layer("基礎與 V 形柱", "Foundations & V-columns", "#c4c1ae", [
        bi("十處柱基承托 20 支鋼管混凝土 V 形柱，柱徑 0.9 m。", "Ten footings support 20 concrete-filled steel V-columns, 0.9 m in diameter."),
        bi("柱基下 20 支基樁，規劃 Ø1.2 m、長 25 m。", "The 20 concept piles beneath the footings are Ø1.2 m and 25 m long."),
      ], 4010),
      layer("站層、月台與通廊", "Station deck, platforms & bridges", "#80b6a9", [
        bi("RC 站層約 1,377 m²，結構底 EL49.40，月台 EL50.75。", "The RC deck is about 1,377 m², with a soffit at EL49.40 and platforms at EL50.75."),
        bi("兩座側式月台各寬 3.20 m，經同高通廊抵達各側第 1 段商店街。", "Each side platform is 3.20 m wide and connects to Terrace 1 via a level bridge."),
      ], 7458.9),
      layer("光舟木構網殼與天空步道", "Timber gridshell & skywalk", "#dfa66a", [
        bi("集成材斜交網殼約 3,945 m²，外覆雙層 ETFE 氣枕。", "The glulam gridshell covers about 3,945 m² under double-layer ETFE cushions."),
        bi("天空步道位於 EL59.40，範圍 CH−79～−23，約 280 m²。", "The 280 m² skywalk lies at EL59.40 from CH−79 to −23."),
      ], 16701),
      layer("南北階梯商店街", "North & south shopping streets", "#bc806e", [
        bi("南北兩街各五段，由東端 EL50.75 逐段下至西端 EL32.50。", "Both streets descend through five terraces from EL50.75 in the east to EL32.50 in the west."),
        bi("北街 2,334 m²、南街 2,901 m²。", "North street totals 2,334 m² and south street 2,901 m²."),
      ], 44087.5),
      layer("弦線、錨碇與站端承托", "Guideways, anchors & terminal support", "#8198ad", [
        bi("兩線中心距 5.10 m，弦線頂 EL52.60。前、後車位各 30 m。", "Track centres are 5.10 m apart with rail top at EL52.60. Front and rear bays are 30 m each."),
        bi("西端獨立錨碇及東端承托座屬纜車系統工程。", "The west anchor and east terminal support are part of the cable transit works."),
      ]),
    ],
    total: 105892, subtotal: 78586, subtotalName: bi("直接工程費", "Direct construction costs"),
    costNote: bi("2026 年價格，含 5% 不可預見費。五層金額依參考成品分組，與原估價直接工程費勾稽。", "2026 prices, with 5% contingency. The five-layer allocation follows the reference artifact and reconciles to the original direct cost."),
    gallery: [
      ["t1-aerial", bi("東南側鳥瞰", "Southeast aerial")],
      ["t1-section", bi("光舟橫剖面", "Light Ark cross-section")],
      ["t1-platform", bi("月台層實景模擬", "Platform rendering")],
    ],
  },
  {
    id: "T2", name: bi("湖濱旅館站", "Lakeside Hotel"),
    title: bi("疊岸露台與站旅共構", "Stepped Terraces & Integrated Station"),
    description: bi("站體與公共翼在北、客房與池庭在南。6F 公共轉乘層經核心上達 R5 月台。", "Public spaces and the station sit to the north, lake-view rooms and the pool court to the south. Level 6 connects to the R5 platforms above."),
    phase: bi("第一階段", "Phase I"),
    stats: [
      {value: "EL66.75", name: bi("R5 月台完成面", "R5 platform level")},
      {value: "100", name: bi("南向面湖客房", "Lake-facing rooms")},
      {value: "91", name: bi("B1 與地面停車席", "Parking spaces")},
    ],
    levels: [level("B1", "B1", -3.10, "36.80"), level("1F", "1F", .27, "40.00"),
      level("2F", "2F", 4.58, "44.40"), level("3F", "3F", 8.04, "47.85"),
      level("4F", "4F", 11.49, "51.30"), level("5F", "5F", 14.94, "54.75"),
      level("6F", "6F", 18.40, "58.20"), level("R5", "R5", 27.05, "66.75")],
    layers: [
      layer("整地、筏基與 B1", "Site works, raft & basement", "#a69a87", [
        bi("B1 樓地板 4,029.85 m²，停車 63 席；筏基底約 EL35.00。", "B1 provides 4,029.85 m² and 63 stalls. The raft underside is about EL35.00."),
        bi("東南角沿百年猢猻樹保護區退縮。", "The southeast corner follows the tree protection setback."),
      ]),
      layer("1F 基座、公共翼與核心", "Podium, public wing & cores", "#c2bba4", [
        bi("1F 基座 80.9 × 62.6 m，配置公共站廳、湖廊、接待及後勤。", "The 80.9 × 62.6 m podium houses the public lobby, lake gallery, reception and loading."),
        bi("東西核心與站體柱列承托 R5，經 1F 轉換梁將荷重傳至 B1 與筏基。", "The east and west cores carry R5 and transfer loads through the level 1 beams to the raft."),
      ]),
      layer("南向客房與退台露台", "Guest rooms & stepped terraces", "#c89968", [
        bi("2F～6F 每層 20 房，共 100 房，逐層向北退台約 2 m。", "There are 20 rooms on each floor from level 2 to level 6, stepping back about 2 m per floor."),
        bi("3F 設受控站旅口；6F 公共轉乘層為 EL58.20。", "Level 3 has a controlled hotel link. The public transfer floor on level 6 is at EL58.20."),
      ]),
      layer("R5 月台與摺板站頂", "R5 platforms & folded roof", "#6d9caf", [
        bi("站層 CH743～811.5，全長 68.5 m；月台 EL66.75。", "The station deck spans CH743 to 811.5 (68.5 m). Platforms are at EL66.75."),
        bi("兩座側式月台、南側專用梯與電梯，摺板屋脊 EL74.00。", "Two side platforms, a dedicated south stair and lift, and a folded roof ridge at EL74.00."),
      ]),
      layer("湖岸步道、池庭與落客", "Lakeside path, pool court & drop-off", "#90a982", [
        bi("住客池庭 1,518.6 m²、泳池 20 × 6 m；公共步道沿東、南岸連續。", "The controlled pool court is 1,518.6 m² with a 20 × 6 m pool and a continuous east/south public shoreline path."),
        bi("東側車道通達落客庭；地面另設 28 席。", "The eastern drive serves the drop-off court and 28 surface parking spaces."),
      ]),
      layer("雙線與系統介面", "Dual guideways & system interfaces", "#8198ad", [
        bi("弦線頂 EL68.60，中心距 4.80 m；停靠區長 30 m。", "Rail top is EL68.60, with 4.80 m track centres and a 30 m stopping zone."),
        bi("錨具、弦線、月台門及充電設備列纜車系統，端部構架土建列 T2。", "Anchorage hardware, guideways, gates and charging are transit items. The terminal frame civil works belong to T2."),
      ]),
    ],
    total: 130000, subtotal: 119000, subtotalName: bi("前六項工程費小計", "Subtotal of the first six work items"),
    costs: [
      [bi("既有建物拆除與整地", "Demolition and site prep"), 1500],
      [bi("基礎與 B1", "Foundations and B1"), 16300],
      [bi("主體結構，含站體承托與端部構架", "Main structure, including supports and end frames"), 36000],
      [bi("建築外殼與裝修", "Envelope and fit-out"), 35500],
      [bi("機電、消防與給排水", "MEP, fire services and plumbing"), 23000],
      [bi("景觀、泳池與外部工程", "Landscape, pool and external works"), 6700],
      [bi("間接工程成本", "Indirect costs"), 4500],
      [bi("不可預見費", "Contingency"), 6500],
    ],
    costNote: bi("依表3.5-16 工種編列。主體結構、外殼及機電橫跨數層構造，金額以原工項為單位。", "Amounts follow Table 3.5-16. Main structure, envelope and services span several model layers."),
    gallery: [
      ["t2-aerial", bi("東南湖面鳥瞰", "Southeast aerial")],
      ["t2-north", bi("北側鳥瞰站頂", "North aerial")],
      ["t2-platform", bi("R5 月台實景模擬", "R5 platform rendering")],
    ],
  },
  {
    id: "T3", name: bi("湖濱山城站", "Lakeside Hill"),
    title: bi("站廳館、四翼與宴會基座", "Station Hall, Four Wings & Banquet Podium"),
    description: bi("Λ 形站廳館銜接四座客房翼。北側前庭處理落客與停車，南側面湖平台連接宴會及泳池。", "An angular station hall links four hotel wings. The northern forecourt serves arrivals and parking, while the south terrace connects the banquet hall and pool."),
    phase: bi("第一階段", "Phase I"),
    stats: [
      {value: "EL67.15", name: bi("月台完成面", "Platform level")},
      {value: "EL68.40", name: bi("5F 轉乘大廳", "Level 5 transfer hall")},
      {value: "300", name: bi("四翼合計客房", "Guest rooms across four wings")},
    ],
    levels: [
      level("B2", "B2", .25, "46.80"), level("B1", "B1", 3.85, "50.40"),
      level("1F", "1F", 7.45, "54.00"), level("2F", "2F", 11.06, "57.60"),
      level("3F", "3F", 14.66, "61.20"), level("4F", "4F", 18.25, "64.80"),
      level("月台", "Platforms", 20.60, "67.15"), level("5F", "5F", 21.85, "68.40"),
      level("6F", "6F", 25.47, "72.00"),
    ],
    layers: [
      layer("擋土、兩層停車與前庭", "Retaining works, parking & forecourt", "#a39889", [
        bi("前庭 EL57.60，與站廳館 2F 同層；兩層停車約 216 輛。", "The forecourt at EL57.60 is level with the hall's second floor. The two decks hold about 216 cars."),
        bi("前庭停車層高程為 EL53.60 與 EL50.00。", "The parking levels are at EL53.60 and EL50.00."),
      ]),
      layer("宴會基座與會議層", "Banquet podium & meeting floor", "#c6896e", [
        bi("B2 湖景宴會廳 1,001 m²，挑高至 EL54.00。", "The 1,001 m² B2 lake-view banquet hall spans to EL54.00."),
        bi("B1 有 8 間會議室。宴會層銜接南側面湖平台與泳池。", "B1 has eight meeting rooms. The banquet floor connects to the southern terrace and pool."),
      ]),
      layer("Λ 形站廳館與公共層", "Angular station hall & public floors", "#c6a978", [
        bi("2F 接北側前庭，設大廳及中餐廳；3F 配置 XR 與 SPA。", "Level 2 connects to the forecourt and houses the lobby and restaurant. Level 3 includes XR and spa."),
        bi("4F 健身中心位於外弧。6F 設跨線連通及雲端餐廳。", "Level 4 fitness is on the outer curve. Level 6 contains the cross-track connection and sky restaurant."),
      ]),
      layer("四座客房翼與接站樓", "Four hotel wings & link building", "#91a788", [
        bi("西翼 77 房、東翼 74 房、西北翼 101 房、東北翼 48 房。", "77 rooms in the west wing, 74 east, 101 northwest and 48 northeast."),
        bi("西翼經接站樓連接 5F 大廳，東翼由外弧大廳銜接。", "The west wing joins the level 5 hall by a link building. The east wing meets the outer hall."),
      ]),
      layer("轉乘大廳、側式月台與摺板屋面", "Transfer hall, side platforms & folded roof", "#74a7ba", [
        bi("5F 轉乘大廳 EL68.40；側式月台 EL67.15，兩者高差 1.25 m。", "The level 5 transfer hall is at EL68.40 and the side platforms at EL67.15, a 1.25 m difference."),
        bi("站廳館屋脊 EL78.60。", "The station hall roof ridge is at EL78.60."),
      ]),
      layer("弦線與站端介面", "Guideways & terminal interfaces", "#8198ad", [
        bi("弦線頂 EL69.00，兩線各設側式月台。", "Rail top is EL69.00 with one side platform for each line."),
        bi("端部構架土建全額列站體，弦線及錨具列纜車系統。", "End frame civil works belong to the station. Guideways and anchorage hardware are transit items."),
      ]),
    ],
    total: 251810, subtotalName: bi("扣除不可預見費約 23.92 億元", "About NT$2.392bn before contingency"),
    costs: [
      [bi("擋土", "Retaining works"), 14400],
      [bi("整地與借土", "Grading and imported fill"), 2800],
      [bi("站廳館端部構架與筏基加強", "End frames and raft reinforcement"), 6000],
      [bi("宴會廳大跨鋼桁架", "Banquet hall long-span steel truss"), 3500],
      [bi("前庭停車兩層", "Two forecourt parking decks"), 22700],
    ],
    costNote: bi("上述分項為概算，涵蓋部分工程包。", "These estimates cover part of the works package."),
    gallery: [
      ["t3-aerial", bi("東南高空鳥瞰", "Southeast aerial")],
      ["t3-platform", bi("5F 與月台層平面", "Level 5 and platform plan")],
      ["t3-lake", bi("湖側實景模擬", "Lakeside rendering")],
    ],
  },
  {
    id: "T4", name: bi("新化林場站", "Xinhua Forest"),
    title: bi("林場驛站與跨路站房", "Forest Station & Road-Spanning Platform"),
    description: bi("站房沿弦線設於林場西緣，東南段以鋼桁架跨越南 173 線。本站屬第二階段，須符合用地條件並完成相關審議。", "The station follows the guideways on the forest's western edge. Its southeast segment spans Route 173. Phase II is subject to land-use requirements and review."),
    phase: bi("第二階段", "Phase II"),
    stats: [
      {value: "EL64.15", name: bi("月台完成面", "Platform level")},
      {value: "85 × 15.2 m", name: bi("站房長 × 寬", "Station length × width")},
      {value: "CH1873.6–1958.6", name: bi("站房里程", "Station chainage")},
    ],
    levels: [level("驛站", "Forest building", 13.2), level("月台", "Platform deck", 18.18, "64.15")],
    layers: [
      layer("林地、道路與落客空間", "Forest, road and drop-off", "#84a184", [
        bi("站位於新化林場西緣，東北側配置停車場與落客帶。", "The station sits at the forest's western edge, with drop-off and parking to the northeast."),
        bi("南 173 線通過站房東南段下方。", "Route 173 passes under the southeast portion of the station."),
      ]),
      layer("林場驛站、梯核與觀景平台", "Forest building, stair cores & lookout", "#c1a476", [
        bi("月台下為三層林場驛站，配置木質鰭片及玻璃立面。", "The three-storey forest building below the platforms features timber fins and glazing."),
        bi("西北端兩座梯核塔，東北側設木質林冠觀景平台。", "Two stair cores sit at the northwest end. A timber lookout projects to the northeast."),
      ]),
      layer("跨南 173 線鋼桁架", "Route 173 steel truss", "#a8a9a2", [
        bi("深色鋼桁架承接站房東南段並跨越道路。", "A dark steel truss supports the southeast segment over the road."),
      ]),
      layer("高架月台與深簷屋面", "Elevated platforms & metal roof", "#6997a9", [
        bi("長條站房 85 × 15.2 m，月台面 EL64.15。", "The 85 × 15.2 m station has platforms at EL64.15."),
        bi("月台設玻璃圍護及深綠灰金屬屋面。", "Glazed enclosure and a dark green-grey metal roof shelter the platforms."),
      ]),
      layer("轉向構架、斜撐與弦線", "Deflection frame, braces & guideways", "#8198ad", [
        bi("西北端為 RC 轉向構架及斜撐，兩組弦線自構架向西北延伸。", "A braced RC deflection frame stands at the northwest end and guides both lines into the forest."),
        bi("模型顯示五輛車停靠。", "The model shows five stopped vehicles."),
      ]),
    ],
    total: null,
    costNote: bi("T4 站房與轉向構架依各自工程範圍列示，本站工項金額待估。", "The station and the guideway structure have separate scopes. The T4 cost estimate is pending."),
    gallery: [
      ["t4-aerial", bi("東南高空鳥瞰底圖", "Southeast aerial base image")],
      ["t4-forest", bi("森林側人視底圖", "Forest-side base image")],
    ],
  },
];

const component = (key, zh, en, sheet, zhDetail, enDetail, links = [], options = {}) => ({
  key, name: bi(zh, en), sheet, detail: bi(zhDetail, enDetail), links, ...options,
});

const sectionDrawings = {
  "t1-aerial": bi("東南側鳥瞰", "Southeast aerial"),
  "t1-long": bi("光舟縱剖面", "Light Ark longitudinal section"),
  "t1-section": bi("光舟橫剖面", "Light Ark cross-section"),
  "t1-plan": bi("站層放大平面", "Enlarged station plan"),
  "t1-roof": bi("屋頂層平面", "Roof plan"),
  "t1-structure": bi("結構與傳力路徑", "Structure and load paths"),
  "t2-aerial": bi("東南側鳥瞰", "Southeast aerial"),
  "t2-basement": bi("B1 停車層平面", "Basement parking plan"),
  "t2-podium": bi("1F 平面", "Ground-floor plan"),
  "t2-level6": bi("6F 客房與公共轉乘層", "Level 6 guest and transfer floor"),
  "t2-r5": bi("R5 月台層放大平面", "Enlarged R5 platform plan"),
  "t2-structure": bi("結構與傳力路徑", "Structure and load paths"),
  "t3-site": bi("總配置圖", "Site plan"),
  "t3-long": bi("站廳館縱剖面", "Hall longitudinal section"),
  "t3-cross": bi("站廳館橫剖面", "Hall cross-section"),
  "t3-wing": bi("客房翼標準層平面與房型", "Typical hotel floor and room types"),
  "t3-platform": bi("5F 大廳與月台平面", "Level 5 transfer and platform plan"),
  "t3-structure": bi("結構與錨碇傳力路徑", "Structure and anchorage load paths"),
  "t4-aerial": bi("東南高空鳥瞰底圖", "Southeast aerial base image"),
  "t4-forest": bi("森林側人視底圖", "Forest-side base image"),
};

const t1StreetNodes = (side, zh, en) => {
  const levels = ["50.75","46.25","41.75","37.25","32.50"];
  const bridge = side + "-bridge";
  const spacing = side === "north" ? "15.52" : "12.31";
  return levels.map((elevation, i) => {
    const number = i + 1;
    const connection = i === 0 ? bridge : side + "-terrace-" + i;
    return component(side + "-terrace-" + number, zh + "第 " + number + " 段", en + " terrace " + number,
      i === 0 ? "t1-section" : "t1-aerial",
      "台階 EL" + elevation + "，分段長 " + spacing + " m。" + (i === 0 ? "與同側空中通廊同高銜接。" : "與相鄰台階段銜接，各段為獨立結構單元。"),
      "Terrace EL" + elevation + ", length " + spacing + " m. " + (i === 0 ? "The skybridge meets it at the same level." : "It joins the adjacent terrace as a separate structural unit."),
      i === 4 ? [connection, "plaza"] : [connection, side + "-terrace-" + (number + 1)],
      {move:[0,5+(4-i)*.7,side === "north"?-7:7]});
  });
};

const t2Rooms = ["44.40","47.85","51.30","54.75","58.20"].map((elevation, i) =>
  component("hotel-"+(i+2), (i+2)+"F 退台客房", "Level "+(i+2)+" stepped guest rooms",
    i === 4 ? "t2-level6" : "t2-aerial",
    "EL"+elevation+"，本層 20 房。客房帶逐層向北退約 2 m，柱列傳力至 1F 轉換梁。"+(i === 1 ? "3F 設受控站旅口與住客橋。" : ""),
    "EL"+elevation+", 20 rooms. Successive floors step back about 2 m to the north, with columns bearing on the level 1 transfer beams."
      +(i === 1 ? " Level 3 has a controlled hotel entrance and guest bridge." : ""),
    ["transfer-beams", i === 4 ? "transfer-6f" : "public-wings"], {move:[0,6+i*2,8]}));

const t3Wings = [
  ["west","西翼","West wing",77,"6,416","接站樓通往站廳館，西北翼經西翼走廊到達。","The link leads to the station hall. The northwest wing connects via the west corridor.","link"],
  ["east","東翼","East wing",74,"5,756","南向面湖，由外弧大廳同層銜接 5F。","Faces the lake to the south and joins the level 5 hall at the outer curve.","transfer-hall"],
  ["northwest","西北翼","Northwest wing",101,"5,332","由西翼銜接，2F 為林間 SPA。","Connects to the west wing and houses the forest spa on level 2.","west"],
  ["northeast","東北翼","Northeast wing",48,"3,870","由東翼梯核銜接，東側林緣為玻璃婚禮堂。","Connects via the east wing core, with a glass wedding chapel to the east.","east"],
].map(([key, zh, en, count, area, desc, descEn, next]) =>
  component(key, zh, en, "t3-site", count+" 房，"+area+" m²。獨立 RC 構架。"+desc,
    count+" rooms, "+area+" m² on an independent reinforced concrete frame. "+descEn,
    [next],{move:[key==="west"||key==="northwest"?-8:8,10,key.includes("north")?-10:4]}));

const detailCatalog = [
  [
    [
      component("plaza","迎賓廣場鋪面","Plaza paving","t1-aerial","光舟下方的迎賓廣場以 EL32.50 為基準，銜接兩側商店街落地端。","The main plaza under the Light Ark is at EL32.50 and joins both streets at their lower ends.",["water","south-terrace-5","north-terrace-5"]),
      component("water","虎埤水鏡","Water mirror","t1-aerial","面積約 742 m²，水深約 2 cm。位於光舟下方，可排乾。","About 742 m² and 2 cm deep, under the gridshell. It can be drained.",["plaza","column-bases"]),
      component("plant","西端機電房","West plant rooms","t1-plan","CH−89～−72 的四室，面積約 136 m²。與西端站層設備區對讀。","Four plant rooms totalling about 136 m² between CH−89 and −72.",["deck","anchor-wall"]),
    ],
    [
      component("piles","柱下基樁","Column piles","t1-structure","每座柱基下 2 支，共 20 支。樁徑 1.2 m，長 25 m。柱基至樁群的展閱位置依縱橫剖面示意。","Two piles per column base (20 total), Ø1.2 m and 25 m long. The viewer shows the footing-to-pile arrangement schematically.",["column-bases"],{buried:true,move:[0,-8,0]}),
      component("column-bases","石材圓座與柱基","Circular column bases","t1-structure","10 座直徑 2.4 m 的石材圓座，分置 CH−62、−50、−38、−26、−14，南北各一。向上接 V 形柱，向下接基樁。","Ten circular stone bases, Ø2.4 m, in pairs at CH−62, −50, −38, −26 and −14. They link the V-columns to the piles.",["piles","v-columns"],{move:[0,5,0]}),
      component("v-columns","鋼管混凝土 V 形柱","Concrete-filled steel V-columns","t1-structure","20 支，柱徑 0.9 m，長約 16.6 m。每座柱基分兩支斜柱上接站層邊梁。","Twenty columns, Ø0.9 m and about 16.6 m long. Each base carries two inclined columns supporting the station edge beam.",["column-bases","edge-beam","deck"],{move:[0,7,0]}),
    ],
    [
      component("deck","RC 站層梁版","RC station deck","t1-long","站層面積約 1,377 m²，結構底 EL49.40。梁版承接兩側站台，經 V 形柱下傳。","The deck covers about 1,377 m² with soffit at EL49.40. It supports both platforms and transfers load to the V-columns.",["v-columns","edge-beam","north-platform","south-platform"]),
      component("north-platform","A 線北側月台","Line A north platform","t1-plan","EL50.75，寬 3.20 m，前後車位各長 30 m。北側經北通廊出站。","EL50.75, 3.20 m wide, with two 30 m berths. The north bridge serves this platform.",["deck","north-bridge","line-a"],{move:[0,4,-6]}),
      component("south-platform","B 線南側月台","Line B south platform","t1-plan","EL50.75，寬 3.20 m。南側經南通廊銜接南商店街。","EL50.75 and 3.20 m wide. The south bridge links it to the south street.",["deck","south-bridge","line-b"],{move:[0,4,6]}),
      component("north-bridge","北空中通廊","North skybridge","t1-section","CH−36.0，長 10.6 m、寬 3.5 m、EL50.75。兩端分別接站層與北街第一段，一端固定、一端滑動。","At CH−36.0, 10.6 m by 3.5 m, EL50.75. The deck and Terrace 1 support it at its fixed and sliding ends.",["north-platform","north-terrace-1"],{move:[0,5,-9]}),
      component("south-bridge","南空中通廊","South skybridge","t1-plan","CH−58.0，長 18.4 m、寬 3.5 m、EL50.75。銜接南月台與南街第一段。","At CH−58.0, 18.4 m by 3.5 m, EL50.75. It joins the south platform and Terrace 1.",["south-platform","south-terrace-1"],{move:[0,5,9]}),
      component("east-stairs","東端避難梯","East escape stairs","t1-plan","位於站層東端，供東端月台避難。模型呈現兩側梯區的相對位置。","Escape routes at the east platform end. The model shows the relative stair zones on both sides.",["north-platform","south-platform"],{move:[8,4,0]}),
    ],
    [
      component("edge-beam","網殼邊梁與端部收邊","Gridshell edge beams and trim","t1-structure","木構網殼支承於站層邊梁，外皮荷重經網格及節點傳至站層。","The edge beams support the gridshell, which transfers envelope loads through its grid and nodes to the deck.",["timber-shell","deck","v-columns"]),
      component("timber-shell","集成材斜交網殼","Glulam gridshell","t1-section","由集成材斜交網格與鋼節點組成，外皮面積約 3,945 m²。下接站層邊梁，上承透光外皮。","Diagonal glulam grid with steel nodes, below about 3,945 m² of envelope. It bears on the deck edge beams.",["edge-beam","etfe"],{move:[0,8,0]}),
      component("etfe","ETFE 氣枕與端部玻璃","ETFE cushions and end glass","t1-section","雙層透光氣枕覆於網殼，端部配玻璃面。使用原 B1 外皮網格呈現包覆關係。","Double-layer translucent cushions cover the timber shell, with glazed ends. The original B1 skin shows the enclosure.",["timber-shell"],{move:[0,11,0]}),
      component("skywalk","屋頂天空步道","Roof skywalk","t1-roof","EL59.40，CH−79～−23，寬 5 m，約 280 m²。木甲板與玻璃欄杆。","EL59.40, CH−79 to −23, 5 m wide and about 280 m², with timber decking and glass balustrades.",["timber-shell","edge-beam"],{move:[0,12,-4]}),
    ],
    [
      ...t1StreetNodes("north","北街","North"),
      component("north-trim","北街立面收邊","North street façade trim","t1-aerial","北側弧形街屋的連續立面收邊，對應北街五個結構單元。","Continuous façade trim along the five north street terraces.",["north-terrace-1","north-terrace-5"],{move:[0,5,-11]}),
      ...t1StreetNodes("south","南街","South"),
      component("south-trim","南街立面收邊","South street façade trim","t1-aerial","南側弧形街屋的連續立面收邊，對應南街五個結構單元。","Continuous façade trim along the five south street terraces.",["south-terrace-1","south-terrace-5"],{move:[0,5,11]}),
    ],
    [
      component("anchor-cap","西端錨碇樁帽","West anchorage pile cap","t1-structure","24 × 16 × 3 m，CH−92～−68。屬獨立錨碇系統，原圖標列 24 支群樁。","24 × 16 × 3 m at CH−92 to −68. It supports the independent anchor, whose drawing indicates 24 piles.",["anchor-wall"],{move:[-4,4,0]}),
      component("anchor-wall","西端扶壁式錨碇構架","West buttressed anchorage","t1-structure","RC 柱牆 CH−91.5～−89.5，與站層設伸縮縫。弦線錨碇力經構架下傳至樁帽。","The RC wall at CH−91.5 to −89.5 is separated from the deck by an expansion joint. Anchorage loads go to its pile cap.",["anchor-cap","line-a","line-b","deck"],{move:[-9,5,0]}),
      component("east-support","東端出站承托座","East terminal support","t1-long","CH−4.75～＋2.65，承托弦線出站段，屬纜車系統工程。","It carries the departure guideways from CH−4.75 to +2.65 and is part of the cable transit works.",["line-a","line-b"],{move:[12,6,0]}),
      component("line-a","A 線弦線","Line A guideway","t1-plan","弦線頂 EL52.60，與 B 線中心距 5.10 m。對應北側月台與東端承托座。","Rail top EL52.60, 5.10 m from line B. It adjoins the north platform and east terminal support.",["north-platform","east-support","anchor-wall"],{move:[0,5,-7]}),
      component("line-b","B 線弦線","Line B guideway","t1-plan","弦線頂 EL52.60，與 A 線中心距 5.10 m。對應南側月台與東端承托座。","Rail top EL52.60, 5.10 m from line A. It adjoins the south platform and east terminal support.",["south-platform","east-support","anchor-wall"],{move:[0,5,7]}),
    ],
  ],
  [
    [
      component("raft","筏式基礎","Raft foundation","t2-structure","筏基底約 EL35.0，承接由 B1 柱位下傳的站體與客房帶荷重。","Raft underside about EL35.0; it receives station and guest-wing loads from the basement columns.",["b1-columns","transfer-beams"],{move:[0,-6,0]}),
      component("b1-deck","B1 停車層板","B1 parking deck","t2-basement","地坪 EL36.80，面積 4,029.85 m²，配置 63 席及機電等設施。","Basement floor EL36.80, 4,029.85 m², with 63 parking spaces and service rooms.",["b1-columns","raft"]),
      component("b1-columns","B1 柱列","Basement column grid","t2-structure","上接 1F 轉換梁，下接筏式基礎。展閱模型以柱列示意傳力方向。","The basement columns connect the level 1 transfer beams to the raft. The model indicates their load path.",["raft","transfer-beams"],{move:[0,6,-5]}),
    ],
    [
      component("podium","1F 基座與公共站廳","Level 1 podium and public hall","t2-podium","EL40.00，基座 80.9 × 62.6 m，含公共站廳、湖廊、旅館接待及卸貨。","EL40.00. The 80.9 × 62.6 m podium contains the public hall, lake gallery, hotel reception and loading.",["transfer-beams","public-wings"]),
      component("transfer-beams","1F 轉換梁","Level 1 transfer beams","t2-structure","將站體柱列及退台客房柱列對位至 B1 柱位。按傳力圖表示位置。","These beams align station and stepped guest-wing columns with the B1 grid. Their position follows the load-path diagram.",["station-columns","west-core","east-core","b1-columns"],{move:[0,8,0]}),
      component("public-wings","2F–5F 公共翼","Public wings, levels 2–5","t2-aerial","公共翼與客房帶疊合於基座上方，銜接 6F 公共轉乘。","The public and guest wings sit above the podium and connect into level 6 public transfer.",["podium","transfer-6f"]),
      component("transfer-6f","6F 公共轉乘層","Level 6 public transfer floor","t2-level6","EL58.20，與 R5 月台相差 8.55 m，由東西核心及相應樓梯電梯銜接。","EL58.20, 8.55 m below R5 platforms, accessed via the east and west cores and associated stairs and lifts.",["west-core","east-core","r5-deck"],{move:[0,9,8]}),
      component("west-core","西核心剪力牆","West core shear wall","t2-structure","北側西公共核心 CH752～759，鄰接西端端部構架，向下接 1F 轉換。","North-side public core at CH752 to 759, adjoining the west end frame and transferring loads towards level 1.",["west-frame","transfer-6f","transfer-beams"],{move:[-9,5,-4]}),
      component("east-core","東核心剪力牆","East core shear wall","t2-structure","北側東核心 CH793～801，與東端承托座通道錯開。向下接 1F 轉換。","North-side core at CH793 to 801, offset from the east terminal support passage and bearing on the level 1 transfer system.",["east-frame","transfer-6f","transfer-beams"],{move:[9,5,-4]}),
      component("station-columns","站體柱列","Station columns","t2-structure","站體柱列 0.70 × 0.70 m，自站層下接 1F 轉換梁。客房柱列另承其垂直荷重。","Station columns are 0.70 × 0.70 m, connecting station level to level 1 transfer beams. Guest-wing columns carry the hotel loads.",["r5-deck","transfer-beams"]),
    ],
    t2Rooms,
    [
      component("r5-deck","R5 站層梁版","R5 station deck","t2-r5","站體沿線全長 68.5 m，範圍 CH743～811.5。經端部構架、東西核心及站體柱列傳力。","The station runs 68.5 m from CH743 to 811.5 and is carried by the end frames, cores and columns.",["platform-a","platform-b","station-columns","transfer-6f"]),
      component("platform-a","A 側月台","Platform A","t2-r5","月台面 EL66.75。對應 A 線停靠區及月台門。","Platform level EL66.75, adjoining the line A stopping zone and doors.",["r5-deck","line-a"],{move:[0,6,-8]}),
      component("platform-b","B 側月台","Platform B","t2-r5","月台面 EL66.75。對應 B 線停靠區，南側設專用梯、電梯與避難梯。","Platform level EL66.75 and line B stopping zone. The south side includes a dedicated stair, lift and escape stair.",["r5-deck","line-b","transfer-6f"],{move:[0,6,8]}),
      component("glazing","R5 玻璃圍護","R5 glazing enclosure","t2-r5","月台兩側玻璃圍護連接站層與上方摺板屋面。","The glazed enclosure rises from the station deck to the folded roof.",["r5-deck","folded-roof"],{move:[0,10,-7]}),
      component("folded-roof","鋼構摺板屋頂","Folded steel roof","t2-structure","屋面板 EL72.40～72.80，屋脊 EL74.00。端部構架橫梁位於屋面下方。","Roof plates at EL72.40–72.80 and ridge at EL74.00. The end frame crossbeams sit below.",["glazing","west-frame","east-frame"],{move:[0,13,0]}),
      component("west-frame","西端端部構架","West end frame","t2-structure","圖示軸位 CH756.25。構架柱 1.40 × 0.70 m，橫向大梁 EL70.70～71.15，接西核心及站體柱列。","Drawing axis CH756.25. Columns are 1.40 × 0.70 m; the crossbeam at EL70.70–71.15 connects into the west core and station columns.",["west-core","station-columns","line-a","line-b"],{move:[-12,5,0]}),
      component("east-frame","東端端部構架","East end frame","t2-structure","圖示軸位 CH802.35。端部構架將作用力傳至東核心剪力牆及站體柱列。","Drawing axis CH802.35. It transfers load to the east core shear wall and station columns.",["east-core","station-columns","line-a","line-b"],{move:[12,5,0]}),
    ],
    [
      component("shore","湖岸公共步道","Public lakeside walk","t2-aerial","沿基地東、南岸連續，與旅館受控池庭分流。","A continuous route along the east and south shores, outside the controlled pool court.",["pool","drop-off"]),
      component("pool","住客池庭與泳池","Guest pool court","t2-aerial","池庭 1,518.6 m²，內設 20 × 6 m 泳池。","The 1,518.6 m² guest court contains a 20 × 6 m pool.",["shore","hotel-2"]),
      component("drop-off","東側落客庭","East drop-off court","t2-podium","東側車道通達落客庭，建築東南角沿百年猢猻樹保護區退縮。","The east drive reaches the drop-off court, next to the southeast tree protection setback.",["surface-parking","podium"]),
      component("surface-parking","地面停車區","Surface parking","t2-aerial","地面 28 席，與 B1 63 席合計 91 席。","28 surface spaces and 63 basement spaces, for 91 in total.",["drop-off","b1-deck"]),
    ],
    [
      component("line-a","A 線弦線","Line A guideway","t2-r5","弦線頂 EL68.60，與 B 線中心距 4.80 m，停靠區長 30 m。","Rail top EL68.60, 4.80 m track spacing and a 30 m stopping zone.",["platform-a","west-frame","east-frame"],{move:[0,6,-7]}),
      component("line-b","B 線弦線","Line B guideway","t2-r5","弦線頂 EL68.60，對應 B 側月台及站端構架。","Rail top EL68.60, adjoining platform B and the terminal frames.",["platform-b","west-frame","east-frame"],{move:[0,6,7]}),
    ],
  ],
  [
    [
      component("retaining","地坪與地下擋土介面","Grade and basement retaining interface","t3-structure","站廳館北側及停車層北側地下外牆兼擋土，展閱以底層量體顯示與前庭的相對位置。","North basement walls retain the ground behind the hall and parking. The model shows their position relative to the forecourt.",["parking-b2","banquet"]),
      component("parking-b2","B2 停車層","B2 parking deck","t3-cross","前庭下層停車，EL50.00。兩層停車約 216 輛。","The lower forecourt parking floor is at EL50.00. The two floors accommodate about 216 vehicles.",["parking-b1","retaining"],{move:[0,5,-10]}),
      component("parking-b1","B1 停車層","B1 parking deck","t3-cross","前庭上層停車，EL53.60，位於北側前庭 EL57.60 下方。","The upper parking level at EL53.60 sits below the forecourt at EL57.60.",["parking-b2","forecourt"],{move:[0,10,-7]}),
      component("forecourt","北側前庭與落客環","North forecourt and drop-off loop","t3-site","前庭 EL57.60，與 2F 大廳同高，並覆於兩個停車層上方。","The forecourt at EL57.60 matches the level 2 lobby and covers the two parking floors.",["parking-b1","public-2f"],{move:[0,13,-7]}),
    ],
    [
      component("banquet","B2 宴會基座","B2 banquet podium","t3-cross","B2 EL46.80，湖景宴會廳 1,001 m²，挑高至 EL54.00。上方 1F 樓板由長跨鋼桁架承托。","At EL46.80, the 1,001 m² banquet hall rises to EL54.00. A long-span steel truss supports the level 1 slab.",["meeting","banquet-trusses","pool-terrace"]),
      component("meeting","B1 會議層","B1 meeting floor","t3-long","B1 樓面 EL50.40，規劃 8 間會議室、約 700 m²。樓層構件可與宴會基座分開查看。","B1 at EL50.40 has eight meeting rooms (about 700 m²). The floor can be inspected beside the banquet podium.",["banquet","public-1f"],{move:[0,10,-4]}),
      component("banquet-trusses","宴會廳大跨鋼桁架","Banquet hall long-span trusses","t3-structure","原圖標示約 47 m 無柱大跨，鋼桁架承托 1F 樓板。桁架示意依原圖排列。","The drawings show an approximately 47 m clear span, with steel trusses supporting level 1. The truss arrangement is schematic.",["banquet","public-1f"],{move:[0,9,0]}),
      component("pool-terrace","池畔與面湖平台","Pools and lakeside terrace","t3-site","EL46.80，面湖平台與 B2 宴會層相接，泳池 26 × 7 m。","At EL46.80, the lakeside terrace joins the B2 banquet floor and includes a 26 × 7 m pool.",["banquet"],{move:[0,3,10]}),
    ],
    [
      component("public-1f","1F 餐廳與宴會前廳","Level 1 restaurant and banquet lobby","t3-cross","EL54.00，含全日餐廳、新娘房、貴賓室與宴會前廳。位於 B2 宴會廳挑高區上方。","EL54.00, containing the all-day restaurant and banquet lobby over the double-height B2 banquet hall.",["banquet-trusses","public-2f"]),
      component("public-2f","2F 大廳與餐飲","Level 2 lobby and dining","t3-cross","EL57.60，與北側前庭同高。可由此上下至會議宴會與車站層。","EL57.60, level with the north forecourt. Vertical routes connect this lobby to the event and station levels.",["forecourt","public-3f","hall-columns"]),
      component("public-3f","3F XR 與 SPA","Level 3 XR and spa","t3-long","EL61.20，配置 XR 沉浸式樂園與 SPA 療程室。","EL61.20 houses the XR experience and spa treatment rooms.",["public-2f","public-4f"]),
      component("public-4f","4F 健身與挑空邊界","Level 4 fitness and atrium edge","t3-long","EL64.80，健身設於外弧側，內弧挑空。","EL64.80, with the fitness centre along the outer curve and the inner curve open to the atrium.",["public-3f","transfer-hall"]),
      component("hall-columns","站廳館核心與柱列","Station hall core and columns","t3-structure","站廳館 RC 核心與柱列與兩端構架、筏基形成傳力系統。","The hall RC cores and columns connect the end frames to the raft foundation.",["west-frame","east-frame","public-2f"],{move:[0,8,-8]}),
    ],
    [
      ...t3Wings,
      component("link","西翼接站樓","West wing link building","t3-platform","接站樓約 464 m²。5F 與轉乘大廳同高接西翼，站廳館側設滑動支承。","About 464 m². Level 5 joins the west wing and the transfer hall; the hall end has a sliding support.",["west","transfer-hall"],{move:[0,8,-10]}),
      component("chapel","玻璃婚禮堂","Glass wedding chapel","t3-site","位於東北翼東側林緣，約 350 m²，地坪 EL57.60。","About 350 m² at EL57.60 on the forest edge east of the northeast wing.",["northeast","forecourt"],{move:[9,5,-6]}),
    ],
    [
      component("platform-deck","側式月台承托層","Side-platform supporting deck","t3-platform","月台位於 5F 夾層與西側停靠區，月台完成面 EL67.15。","The side-platform deck lies on the level 5 mezzanine at the west stopping zone, EL67.15.",["platform-a","platform-b","west-frame"]),
      component("platform-a","A 線側式月台","Line A side platform","t3-platform","EL67.15，月台寬 3.20 m。站廳所在側由坡道及階梯上至 5F 轉乘大廳。","EL67.15 and 3.20 m wide. The hall-side platform reaches the transfer hall via a ramp and stairs.",["level-ramp","level-stair","transfer-hall","line-a"],{move:[0,6,-8]}),
      component("platform-b","B 線側式月台","Line B side platform","t3-platform","EL67.15。對側月台以樓梯及無障礙電梯上至 6F 跨線連通。","EL67.15. The opposite platform connects to the level 6 crossover via stairs and an accessible lift.",["crossing-6f","line-b"],{move:[0,6,8]}),
      component("transfer-hall","5F 轉乘大廳","Level 5 transfer hall","t3-platform","EL68.40，比側式月台高 1.25 m，並與客房 5F 同高。經接站樓、外弧大廳分別進入西翼與東翼。","EL68.40, 1.25 m above the platforms and level with hotel level 5. It connects to the west and east wings.",["platform-a","level-ramp","level-stair","link","east"],{move:[0,8,-5]}),
      component("level-ramp","站廳側銜接坡道","Hall-side access ramp","t3-platform","EL67.15 上至 EL68.40，高差 1.25 m，坡度 1:12，長約 15 m，設中間平台。","Connects EL67.15 to EL68.40 over a rise of 1.25 m, at 1:12 for about 15 m, with an intermediate landing.",["platform-a","transfer-hall"],{move:[0,5,-11]}),
      component("level-stair","站廳側銜接階梯","Hall-side access stair","t3-platform","8 級階梯，與坡道並列，銜接月台與高出 1.25 m 的轉乘大廳。","Eight steps connect the platform to the transfer hall 1.25 m above, beside the ramp.",["platform-a","transfer-hall","level-ramp"],{move:[0,5,8]}),
      component("crossing-6f","6F 跨線連通","Level 6 crossover","t3-long","EL72.00，供對側月台跨線後經外弧大廳回到轉乘大廳。","At EL72.00, the crossover leads from the opposite platform via the outer hall to level 5.",["platform-b","transfer-hall"],{move:[0,11,0]}),
      component("glazing","站層玻璃圍護","Station level glazing","t3-long","圍護沿 Λ 形站廳館輪廓，銜接站層梁版及鋼構屋面。","The glazed enclosure follows the angular hall between its deck and steel roof.",["platform-deck","roof"]),
      component("roof","鋼構摺板屋面","Folded steel roof","t3-long","屋脊 EL78.60，摺板鋼構屋面跨於弦線上方。","Roof ridge EL78.60. The folded steel roof spans above the guideways.",["glazing","hall-columns"],{move:[0,14,0]}),
    ],
    [
      component("west-frame","西端端部構架","West end frame","t3-structure","CH1,041.15。構架將錨碇力傳至站廳館核心、柱列及筏基。","At CH1,041.15. The frame transfers anchorage loads into the hall cores, columns and raft.",["hall-columns","line-a","line-b"],{move:[-10,5,5]}),
      component("east-frame","東端端部構架","East end frame","t3-structure","CH1,134.45。與站廳館核心及筏基共同形成承力系統。","At CH1,134.45. It forms a load-resisting system with the hall core and raft.",["hall-columns","line-a","line-b"],{move:[10,5,5]}),
      component("line-a","A 線弦線","Line A guideway","t3-platform","弦線頂 EL69.00，對應 A 線側式月台與兩端構架。","Rail top EL69.00, adjoining the line A platform and terminal frames.",["platform-a","west-frame","east-frame"],{move:[0,6,-8]}),
      component("line-b","B 線弦線","Line B guideway","t3-platform","弦線頂 EL69.00，對應 B 線側式月台與兩端構架。","Rail top EL69.00, adjoining the line B platform and terminal frames.",["platform-b","west-frame","east-frame"],{move:[0,6,8]}),
    ],
  ],
  [
    [
      component("forest","林地與林間步道","Wooded site and paths","t4-aerial","新化林場西緣。步道與林場驛站相接，場地關係依圖說示意。","At the forest’s western edge, paths connect to the forest building. Site relationships follow the reference view.",["forest-1f","drop-off"]),
      component("road","南 173 線道路","Route 173","t4-aerial","從站房東南段下方通過。道路與跨路上構、兩側支承可分開檢視。","Passes beneath the southeast station segment. Inspect the road alongside the truss and its supports.",["truss-lower","support-inner","support-outer"],{move:[0,0,10]}),
      component("drop-off","東北落客與停車帶","Northeast drop-off and parking","t4-forest","位於站房東北側，林冠觀景平台伸出於其上方。","Northeast of the station, below the projecting canopy lookout.",["lookout","forest-1f"]),
    ],
    [
      ...[1,2,3].map((i) => component("forest-"+i+"f", "林場驛站 "+i+"F", "Forest building level "+i, "t4-forest",
        "驛站三層中的第 "+i+" 層，木質鰭片與玻璃量體可獨立檢視。樓面細部依底圖示意。",
        "Level "+i+" of the three-storey timber-finned and glazed forest building, shown schematically.",
        [i===1?"forest-2f":"forest-"+(i-1)+"f","core-northeast"],{move:[0,5+i*2,6]})),
      component("core-northeast","西北端靠落客側梯核","Northwest core, drop-off side","t4-aerial","位於西北端兩座梯核之一，靠近東北落客帶。","One of the two northwest stair cores, on the side nearest the northeast drop-off.",["platform-deck","drop-off"],{move:[-7,7,-6]}),
      component("core-southwest","西北端另一側梯核","Northwest core, opposite side","t4-aerial","西北端另一座木質梯核，連接下部驛站與上部月台層。","The opposite timber-finished core at the northwest end links the lower building to the station level.",["platform-deck","forest-1f"],{move:[-7,7,6]}),
      component("lookout","林冠觀景平台","Canopy lookout","t4-forest","木質觀景平台向東北側突出，與林冠步道及驛站中段相接。","The timber lookout projects northeast, adjoining the canopy walkway and intermediate forest level.",["forest-3f","drop-off"],{move:[0,7,-9]}),
    ],
    [
      component("truss-upper","跨路桁架上弦","Upper chords of road truss","t4-aerial","承接東南段站層。上弦與腹桿可以分開檢視，桿件細部依底圖示意。","Carries the southeast deck. The upper chords and webs can be inspected separately, with member detail shown schematically.",["truss-web","platform-deck"],{move:[0,11,0]}),
      component("truss-lower","跨路桁架下弦","Lower chords of road truss","t4-forest","位於跨路上構底側，和上弦、腹桿及兩端支承對讀。","At the base of the road-span truss, to be viewed with the upper chords, web and end supports.",["truss-upper","truss-web","support-inner","support-outer"],{move:[0,5,0]}),
      component("truss-web","桁架腹桿","Truss web members","t4-forest","連接上、下弦的腹桿可分離查看。桿件分格為圖說示意。","Web members link the upper and lower chords. Their divisions are schematic.",["truss-upper","truss-lower"],{move:[0,8,8]}),
      component("support-inner","靠驛站側支承","Forest-building side support","t4-aerial","靠驛站側的跨路支承，位置按底圖示意。","The road-span support on the forest building side, positioned schematically from the reference view.",["truss-lower","road"],{move:[-9,4,1]}),
      component("support-outer","道路外側支承","Outer road-side support","t4-aerial","跨南 173 線另一側的支承。與靠驛站側支承分開檢視。","The support across Route 173 from the forest building, selectable separately from the inner support.",["truss-lower","road"],{move:[10,4,1]}),
    ],
    [
      component("platform-deck","高架站層板","Elevated station deck","t4-aerial","站房 85 × 15.2 m。東南端站層坐於跨路鋼桁架上方。","The station is 85 × 15.2 m, with its southeast deck over the steel road truss.",["truss-upper","core-northeast","platform-a","platform-b"]),
      component("platform-a","A 側月台","Platform A","t4-forest","月台完成面 EL64.15。選取可對照相鄰 A 線弦線。","Platform finish EL64.15. Select it together with the adjoining line A guideway.",["platform-deck","line-a"],{move:[0,6,-7]}),
      component("platform-b","B 側月台","Platform B","t4-forest","月台完成面 EL64.15。選取可對照相鄰 B 線弦線。","Platform finish EL64.15. Select it together with the adjoining line B guideway.",["platform-deck","line-b"],{move:[0,6,7]}),
      component("glazing","月台層玻璃圍護","Platform level glazing","t4-forest","玻璃圍護在高架站層與深簷金屬屋面之間。","Glazed enclosure between the elevated deck and the metal roof with deep eaves.",["platform-deck","metal-roof"],{move:[0,10,8]}),
      component("metal-roof","深綠灰金屬屋面","Green-grey metal roof","t4-aerial","站房上部連續深簷屋面，連同跨路段覆蓋。","The continuous deep-eaved metal roof covers the station and road-span segment.",["glazing","platform-deck"],{move:[0,13,-1]}),
    ],
    [
      component("deflection-frame","RC 轉向構架柱與頂梁","RC deflection portal","t4-aerial","西北端白色 RC 轉向構架。弦線自構架向西北延伸，兩側有斜撐。","The white RC deflection portal at the northwest end leads both guideways into the forest and is braced on both sides.",["diagonal-braces","line-a","line-b"],{move:[-10,7,0]}),
      component("diagonal-braces","轉向構架斜撐","Deflection frame braces","t4-aerial","連接 RC 構架及下方支座，展閱可獨立檢視構架與斜撐的相對位置。","Braces connect the RC portal to low supports and can be inspected separately from the frame.",["deflection-frame","brace-bases"],{move:[-6,4,8]}),
      component("brace-bases","斜撐下座","Brace footings","t4-aerial","表示斜撐接地下部介面。基礎細部按底圖示意。","The base interface under the braces. Foundation details are schematic.",["diagonal-braces"],{move:[-7,3,0]}),
      component("line-a","A 線弦線","Line A guideway","t4-aerial","弦線經西北端 RC 轉向構架進入長條站房，對應 A 側月台。","The line enters the long station through the northwest RC portal and serves platform A.",["deflection-frame","platform-a"],{move:[0,5,-7]}),
      component("line-b","B 線弦線","Line B guideway","t4-aerial","B 線由西北端入站，對應 B 側月台。","Line B enters from the northwest and serves platform B.",["deflection-frame","platform-b"],{move:[0,5,7]}),
    ],
  ],
];

const componentIndex = detailCatalog.map(groups => new Map(groups.flatMap((group, number) =>
  group.map(item => [item.key, {...item, group:number+1}]))));

const material = {
  limestone: "#d1cbbd", stone: "#a9af9f", deck: "#e2ddcd", wood: "#ba946e", travertine: "#bfb09a",
  landscape: "#5b7873", planted: "#779278", grove: "#456869", shrub: "#759681",
  glass: "#608898", darkGlass: "#57727e", metal: "#4b606e", bronze: "#a18567",
  rail: "#a7c1cf", structure: "#778b99", water: "#365d6d", pool: "#62a5b1",
};

function scene(index, center, span, shifts, sectionZ = 0) {
  const base = {key:"base", group:0, mesh:new Mesh()};
  const parts = [base, ...Array.from(componentIndex[index].values(), item => ({...item, mesh:new Mesh()}))];
  const byKey = new Map(parts.map(part => [part.key, part]));
  const mesh = Object.fromEntries(parts.map(part => [part.key,part.mesh]));
  return {parts, byKey, mesh, center, span, shifts, sectionZ, labels: []};
}

function mark(model, id, position, zh, en) {
  model.labels.push({id, position, name: bi(zh, en)});
}

function facade(mesh, x, z, w, d, y, height, options = {}) {
  const {angle = 0, bays = Math.max(4, Math.round(w / 3.8)), glass = material.glass,
    frame = material.wood, slab = material.deck, terrace = .8} = options;
  const at = (a, b) => {
    const [u, v] = rotation(a, b, angle);
    return [x + u, z + v];
  };
  const lowerSlabY = y - .26;
  mesh.box(x, lowerSlabY, z, w + .38, .31, d + terrace * 2, slab, {angle});
  mesh.box(x, y + .05, z, w - .2, height - .35, d - .16, glass, {angle});
  for (const side of [-1, 1]) {
    for (let i = 0; i <= bays; i++) {
      const [px, pz] = at(-w / 2 + i * w / bays, d * side / 2);
      mesh.box(px, y, pz, .17, height - .14, .3, frame, {angle});
    }
    const [px, pz] = at(0, side * (d / 2 + .08));
    mesh.box(px, y + 1.04, pz, w, .10, .16, frame, {angle});
  }
  for (const side of [-1, 1]) {
    for (const position of [-.48, 0, .48]) {
      const [px, pz] = at(w * side / 2, d * position);
      mesh.box(px, y, pz, .23, height - .13, .24, frame, {angle});
    }
  }
  mesh.box(x, y + height - .22, z, w + .42, .22, d + terrace * 2, slab, {angle});
}

function glassBay(slab, glazing, path, deck, top, width) {
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const dx = bx - ax;
    const dz = bz - az;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dz, dx);
    const cx = (ax + bx) / 2;
    const cz = (az + bz) / 2;
    const at = (x, z) => {
      const q = rotation(x, z, angle);
      return [cx + q[0], cz + q[1]];
    };
    slab.box(cx, deck - .52, cz, length + .15, .52, width, material.deck, {angle});
    for (const side of [-1, 1]) {
      const [x, z] = at(0, side * width / 2);
      glazing.box(x, deck + .12, z, length + .16, top - deck - .13, .12, "#83aec2", {angle, alpha: .31});
      const count = Math.ceil(length / 2.65);
      for (let j = 0; j <= count; j++) {
        const [px, pz] = at(length * (j / count - .5), side * width / 2);
        glazing.box(px, deck, pz, .085, top - deck + .15, .14, material.bronze, {angle});
      }
      glazing.box(x, deck + 1.03, z, length, .075, .16, material.structure, {angle});
    }
  }
}

function foldedRoof(mesh, path, base, peak, width) {
  for (let i = 1; i < path.length; i++) {
    const [ax, az] = path[i - 1];
    const [bx, bz] = path[i];
    const angle = Math.atan2(bz - az, bx - ax);
    const length = Math.hypot(bx - ax, bz - az);
    const count = Math.max(2, Math.round(length / 8.5));
    const at = (x, y, z) => [
      ax + x * Math.cos(angle) - z * Math.sin(angle),
      y,
      az + x * Math.sin(angle) + z * Math.cos(angle),
    ];
    for (let j = 0; j < count; j++) {
      const a = length * j / count;
      const b = length * (j + .50) / count;
      const c = length * (j + 1) / count;
      mesh.quad(at(a, base, -width / 2), at(b, peak, -width / 2), at(b, peak, width / 2), at(a, base, width / 2), "#71818a");
      mesh.quad(at(b, peak, -width / 2), at(c, base, -width / 2), at(c, base, width / 2), at(b, peak, width / 2), "#4b626e");
      for (const side of [-1, 1]) {
        mesh.tri(at(a, base, side * width / 2), at(b, peak, side * width / 2), at(c, base, side * width / 2), "#394f5a");
      }
    }
  }
}

function railPaths(lineA, lineB, path, y, spacing) {
  for (const side of [-1, 1]) {
    const points = path.map(([x, z], i) => {
      const a = path[Math.max(0, i - 1)];
      const b = path[Math.min(path.length - 1, i + 1)];
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const distance = side * spacing / 2;
      return [x - distance * Math.sin(angle), y-.15, z + distance * Math.cos(angle)];
    });
    (side === -1 ? lineA : lineB).path3(points, .15, material.rail, 6);
  }
}

function tree(mesh, x, z, y, scale, seed = 0) {
  const tones = ["#668b72", "#547c6d", "#779b7d", "#476d5f", "#77947d"];
  mesh.tube([x, y, z], [x, y + scale * 2.7, z], scale * .11, "#766b55", 5, scale * .07);
  const center = [x, y + scale * 3.65, z];
  const radii = [1.42, 1.15, 1.22, 1.51, 1.06, 1.33, 1.12].map(r => r * scale);
  const apex = [x - scale * .23, y + scale * 4.76, z + scale * .15];
  const bottom = [x + scale * .21, y + scale * 2.32, z];
  const ring = radii.map((r, i) => {
    const a = (i + seed * .57) * Math.PI * 2 / radii.length;
    return [center[0] + r * Math.cos(a), center[1] + (i % 3 - 1) * scale * .25, center[2] + r * Math.sin(a)];
  });
  ring.forEach((p, i) => {
    const next = ring[(i + 1) % ring.length];
    mesh.tri(apex, next, p, tones[(i + seed) % tones.length]);
    mesh.tri(bottom, p, next, tones[(i + seed + 2) % tones.length]);
  });
}

function plants(mesh, points, y = .09) {
  points.forEach(([x, z, height], i) => tree(mesh, x, z, y, height ?? 1.2 + (i % 6) * .16, i));
}

function parking(mesh, x, z, w, d, y, bays = 10, angle = 0) {
  mesh.box(x, y, z, w, .12, d, "#556268", {angle});
  for (let j = 0; j <= bays; j++) {
    for (const side of [-1, 1]) {
      const [sx, sz] = rotation((j / bays - .5) * (w - 3.6), side * d * .33, angle);
      mesh.box(x + sx, y + .13, z + sz, .095, .025, d * .30, "#d7d6c5", {angle});
    }
  }
}

function ground(mesh, shape, y, color, thickness = 2.3) {
  mesh.prism(shape, y - thickness, y, "#465953", {top: color});
  mesh.prism(shape, y - thickness - .16, y - thickness + .08, "#71847a");
}

function deckRamp(mesh, a, b, width, color) {
  const horizontal = vec.unit([b[2] - a[2], 0, a[0] - b[0]]);
  const v = vec.scale(horizontal, width / 2);
  mesh.quad(vec.add(a, v), vec.sub(a, v), vec.sub(b, v), vec.add(b, v), color);
}

function buildT1() {
  const model = scene(0, [-53, 10.4, -4], 170,
    [[0, 0, 0], [-6, 1.1, 6], [0, 7.5, 0], [0, 16, 3], [0, 28, -4], [-8, 6.5, 11], [5, 13, -6]]);
  const m = model.mesh;
  const site = m.base;
  for (const [name, group] of Object.entries(t1Native)) {
    for (const key of ["opaque", "translucent"]) {
      const bits = Uint8Array.from(atob(group[key]), c => c.charCodeAt(0));
      m[name][key] = Array.from(new Float32Array(bits.buffer));
    }
  }
  ground(site, [[-129,-65],[7,-67],[32,-38],[33,32],[20,57],[-104,55],[-132,31]], -.28, "#9ba79a");
  site.prism([[10,-55],[27,-46],[32,-38],[33,32],[20,57],[6,51],[9,34],[18,13],[14,-9],[5,-24]],
    -.27, -.13, material.water);
  parking(site, -79, -51, 54, 16, -.17, 15, -.04);
  plants(site, [[-122,30],[-126,12],[-111,45],[-97,47],[-84,42],[-29,38],[-14,38],[-4,37],
    [-37,-48],[-18,-41],[-17,-31],[-6,-29],[0,-19],[-119,-49],[-109,-57],[-48,-58]]);
  for (const zone of [-1, 1]) {
    for (const x of [-84.8, -76.3]) {
      m.plant.box(x, .03, zone * 5.7, 7.7, 3.45, 3.95, material.stone, {top: material.deck});
      m.plant.box(x, .35, zone * 7.69, 2, 2.32, .11, material.metal);
    }
    for (const x of [-62, -50, -38, -26, -14]) {
      const z = zone * 3.6;
      m["column-bases"].ellipse(x, -.62, z, 1.22, 1.22, .68, material.limestone);
      for (const side of [-.68,.68]) {
        m.piles.tube([x,-.62,z+side],[x,-25.62,z+side],.60,material.travertine,12);
      }
    }
    const stairs = m["east-stairs"];
    stairs.box(-9.0, .21, zone * 9.5, 5.6, 18.04, 2.8, material.bronze, {alpha: .42});
    for (const x of [-11.65, -6.3]) {
      stairs.box(x, .1, zone * 10.84, .14, 18.2, .14, material.wood);
    }
    const platform = m[zone === -1 ? "north-platform" : "south-platform"];
    platform.box(-36.0, 18.17, zone * 5.05, 62.0, .10, 3.2, "#bbcfc7");
    for (const bx of [-67, -35]) {
      for (let i = 0; i < 5; i++) {
        const x = bx + 2.8 + i * 5.68;
        platform.box(x, 18.255, zone * 3.47, 1.8, .013, .18, "#dca570");
      }
    }
  }
  m["anchor-cap"].box(-80, -2.6, 0, 24, 3, 16, "#778998");
  m["anchor-wall"].box(-90.5, .4, 0, 2, 18.6, 12, "#889ca9");
  m["east-support"].box(-1.05, 17.55, 0, 7.4, .7, 8, "#859da8");
  railPaths(m["line-a"],m["line-b"],[[-94.4, 0],[-4.75, 0],[2.65, 0],[28, -.75]], 20.1, 5.1);
  mark(model, 1, [-31,.1,1], "虎埤水鏡", "Water mirror");
  mark(model, 1, [-82,3.2,6], "西端機電房", "West plant rooms");
  mark(model, 2, [-25,8.3,5.4], "V 形柱", "V-columns");
  mark(model, 3, [-23,18.36,5], "月台 EL50.75", "Platforms EL50.75");
  mark(model, 4, [-54,24,6.75], "集成材網殼", "Glulam gridshell");
  mark(model, 4, [-50,27.15,-1], "天空步道 EL59.40", "Skywalk EL59.40");
  mark(model, 5, [-51,18.5,-29], "北階梯商店街", "North stepped street");
  mark(model, 5, [-70,15.7,28], "南階梯商店街", "South stepped street");
  mark(model, 6, [-.8,19.7,2.5], "東端承托座", "East terminal support");
  return model;
}

function buildT2() {
  const model = scene(1, [0, 11.7, 4], 153,
    [[0, 0, 0], [-5, -6.5, 1], [-2.5, 7.5, 0], [4, 17, 7], [-1.4, 31, -4], [5, 1, 12], [5, 21, -10]], -8);
  const m = model.mesh;
  const site = m.base;
  const podium = m.podium;
  ground(site, [[-56,-45],[45,-45],[61,-30],[61,-7],[52,23],[38,43],[22,60],[-16,64],[-31,52],[-42,38],[-51,12],[-59,-22]],
    -.1, "#798f78");
  site.prism([[-60,-44],[61,-44],[70,-6],[60,32],[40,67],[-19,74],[-46,50],[-66,19]], -1.35, -.68, material.water);
  site.strip([[-54,-44],[-17,-45],[24,-44],[51,-34],[57,-15]], 5.4, .01, "#7e8b86", .13);
  const plate = [[-40.45,-31.3],[40.45,-31.3],[40.45,-4],[35.8,2],[33.1,8],[31,17.2],[25,23.7],[20,31.3],[-40.45,31.3]];
  m.raft.prism(plate,-5,-4.17, material.stone, {top:"#abb6b2"});
  m["b1-deck"].prism(plate,-3.52,-3.20, material.structure, {top:"#bcc6be"});
  for (const x of [-35,-23,-11,1,13,25,35]) {
    for (const z of [-25,-10,6,20]) {
      if (x > 29 && z > 10) continue;
      m["b1-columns"].box(x,-4.16,z,.75,3.9,.7, material.limestone);
      for (let space = 0; space < 4; space++) {
        m["b1-deck"].box(x + space * 2.6 - 3.8,-3.18,z + 1.1,.08,.025,4.05,"#ecdfbc");
      }
    }
  }
  podium.prism(plate, -.04, 4.4, material.darkGlass, {top:material.deck});
  podium.prism(plate, -.30, .05, material.limestone);
  for (let x = -37; x <= 26; x += 3.25) {
    podium.box(x,.2,31.35,.17,3.97,.22, material.wood);
    podium.box(x,.2,-31.38,.17,3.97,.22, material.wood);
  }
  for (const [key,x,z] of [["west-core",-22,-23],["east-core",19.8,-27]]) {
    const support = m[key];
    support.box(x,0,z,5.45,26.75,5.2, material.limestone);
    support.box(x,.18,z + 2.63,3.05,25.8,.14, "#a9b1ad");
    for (let j = 4.4; j < 25; j += 3.45) {
      support.box(x,j,z + 2.77,3.05,.14,.24,material.deck);
    }
  }
  for (const [x,z] of [[-30,-29.2],[-11,-29.2],[8,-29.2],[26,-29.2],[-14,-10],[14,-17]]) {
    m["station-columns"].box(x,0,z,.7,26.23,.7,material.limestone);
  }
  for (const z of [-25,-10,6,18]) {
    m["transfer-beams"].box(-.5,-.38,z,z>10?65:72,.70,.68,"#a5b5ad");
  }
  for (const [i,y] of [4.4,7.85,11.30,14.75,18.20].entries()) {
    const cz = 15.8 - i * 2;
    const w = 70.8 - (i < 2 ? 0 : 2.5);
    const guest = m["hotel-"+(i+2)];
    const publicFloor = m[i===4?"transfer-6f":"public-wings"];
    facade(guest,-3.7,cz,w,13.60,y,3.45,{terrace: 1.17, bays:19});
    facade(publicFloor,-5.2,cz - 13.9,67.3,13.2,y,3.45,{frame:"#a9a68f",terrace: .3, glass:"#7e9799"});
    facade(publicFloor,31.2, -7.25, 15.0, 34, y, 3.45,{frame:material.limestone,terrace: .35});
  }
  m["hotel-6"].box(-3.7,21.65,7.8,68.4,.24,14.9,material.planted);
  m["transfer-6f"].box(31.2,21.65,-7.25,15.35,.22,34.4,material.planted);
  const axis = [[-34.25,-22],[-5.7,-22],[17.6,-22],[26.4,-23.6],[34.25,-27.4]];
  glassBay(m["r5-deck"],m.glazing,axis,26.73,32.52,16.3);
  foldedRoof(m["folded-roof"],axis,32.53,34,17.05);
  for (const [key,x,sz] of [["west-frame",-21.,-22],["east-frame",25.10,-23.36]]) {
    const frame = m[key];
    for (const offset of [-6.9,6.9]) frame.box(x,24.7,sz+offset,1.4,6.45,.7,material.limestone);
    frame.box(x,30.7,sz,1.45,.45,14.5,material.limestone);
  }
  for (const side of [-1,1]) {
    const platform = m[side===-1?"platform-a":"platform-b"];
    platform.box(-2.25,26.65,-22+side*4.7,30,.1,3.2,"#c6d1c8");
    for(let i=0;i<5;i++)platform.box(-16.15 + i*5.68,26.755,-22+side*3.12,1.8,.08,.16,"#e0bc73");
  }
  railPaths(m["line-a"],m["line-b"],[[-60,-21],...axis,[57,-41]],28.60,4.80);
  m.shore.strip([[-41,29],[-30,45],[-15,57],[13,57],[30,48],[48,28],[56,5],[56,-15]],2.45,.02,"#d3d1b9",.12);
  m.pool.box(-5,.01,40,24,.22,10,material.travertine,{angle:-.26});
  m.pool.box(-5,.24,40,20,.035,6,material.pool,{angle:-.26});
  m["drop-off"].ellipse(42,.02,19,14.2,14.2,.16,"#899599");
  m["drop-off"].ellipse(42,.19,19,9,9,.20,"#7d946f");
  tree(m["drop-off"],42,19,.25,2.4,4);
  parking(m["surface-parking"],49,-3,29,10,.01,12,Math.PI/2);
  plants(site,[[-49,-30],[-50,-1],[-46,13],[-38,33],[-33,40],[-24,50],[-9,60],[14,58],[26,53],[34,42],[46,31],[53,11],[53,-12],[-37,49]]);
  mark(model, 1, [-24,-3.1,-3], "B1 · 63 席", "B1 · 63 spaces");
  mark(model, 2, [20,16,-28], "站體核心", "Station core");
  mark(model, 2, [0,18.25,-5], "6F 公共轉乘層", "Level 6 public transfer");
  mark(model, 3, [-11,15.1,17], "南向疊岸露台", "South stepped terraces");
  mark(model, 4, [-8,27.05,-17], "R5 月台 EL66.75", "R5 platforms EL66.75");
  mark(model, 4, [7,34,-23], "摺板屋面", "Folded roof");
  mark(model, 5, [-5,.27,40], "住客池庭", "Pool court");
  mark(model, 6, [42,28.6,-32], "雙線弦線", "Dual guideways");
  return model;
}

function wing(mesh, x, z, width, depth, angle, bottomEL, floors) {
  const lower = bottomEL - 46.80;
  for (let i = 0; i < floors; i++) {
    facade(mesh,x,z,width,depth,lower + i * 3.6,3.6,
      {angle, glass:i%2?"#617882":"#75868a", frame:"#b9a68a", terrace:.37});
  }
  mesh.box(x,lower+floors*3.6,z,width + .6,.30,depth + .6,"#b9baaa",{angle});
  mesh.box(x,lower+floors*3.6+.31,z,width - 1.2,.09,depth - 1.05,"#9fa890",{angle});
}

function buildT3() {
  const model = scene(2, [-1, 12.7, -14], 192,
    [[0,0,0], [-5,0,-8], [-2,5,7], [0,14,0], [10,13,-11], [0,30,-2], [-4,16,0]], -5);
  const m = model.mesh;
  const site = m.base;
  ground(site, [[-82,-58],[-56,-83],[-13,-94],[47,-87],[82,-65],[85,-17],[75,31],[58,49],[-52,54],[-80,39]], -.15, "#83967e");
  for (const [i,z] of [-72,-66,-60,20,25,30,35,40,45].entries()) {
    site.strip([[-72,z-1],[-48,z+2],[-22,z],[7,z-2],[32,z+1],[58,z+2],[69,z-1]], .17, -.12 + i * .006,"#9bac8c",.025);
  }
  const upperShape = [[-70,-71],[-13,-81],[70,-69],[71,-36],[51,-21],[31,-25],[12,-19],[-47,-16],[-70,-24]];
  m.retaining.prism(upperShape, -.14, 2.4, "#8d9b88");
  for (const [key, y, tone] of [["parking-b2",3.2,"#747f7d"],["parking-b1",6.8,"#88948b"]]) {
    const deck = m[key];
    deck.box(-8,y-.23,-48,88,.23,36,tone);
    parking(deck,-8,-48,79,25,y,22);
    for (const x of [-48,-37,-26,-15,-4,7,18,29,40]) {
      deck.box(x,y,-59,.47,3.55,.48,material.limestone);
      deck.box(x,y,-38,.47,3.55,.48,material.limestone);
    }
  }
  m.forecourt.box(-8,10.48,-48,88,.32,36, "#b3b8a8");
  m.forecourt.ellipse(-4,10.79,-51,16,15,.14,"#7b8d8e");
  m.forecourt.ellipse(-4,10.95,-51,10,10,.18,"#718a71");
  m.forecourt.strip([[-2,-51],[29,-61],[62,-62],[78,-55]],7,10.75,"#7b8986",.14);
  plants(m.forecourt,[[-8,-52],[1,-52]],11.02);
  const hall = [[-50,7],[-18,-17],[5,-24],[24,-21],[53,1],[42,22],[-29,31]];
  m.banquet.prism(hall,0,7.2,material.travertine,{top:material.deck});
  m.meeting.prism([[-34,-.9],[-17,-15.8],[5,-22],[23,-19],[37,-10],[18,-2],[-17,2]],3.36,3.60,"#a2a99d");
  m["public-1f"].prism(hall,7.0,7.3,material.deck);
  for (let i=0; i<5; i++) {
    const x = -22 + i * 7.2, z = 9 - i * 1.15;
    const start = [x-19,6.78,z+13.83], end = [x+19,6.78,z-13.83];
    const upperStart = [start[0],7.02,start[2]], upperEnd = [end[0],7.02,end[2]];
    m["banquet-trusses"].tube(start,end,.11,material.structure,6);
    m["banquet-trusses"].tube(upperStart,upperEnd,.11,material.structure,6);
    for (let j=0; j<8; j++) {
      const d = vec.sub(end,start);
      const a = vec.add(start,vec.scale(d,j/8));
      const b = vec.add(upperStart,vec.scale(d,(j+1)/8));
      m["banquet-trusses"].tube(a,b,.075,material.bronze,5);
    }
  }
  for (let x=-37;x<40;x+=2.1) {
    const z=x<0 ? 30.96+0.12*(x+29):30.96-.126*(x+29);
    m.banquet.box(x,.18,z,.19,6.86,.23,material.wood);
  }
  m["pool-terrace"].box(-26,.02,34,67,.21,8,"#c3beaa",{angle:-.12});
  m["pool-terrace"].box(-47,.05,40.7,31,.18,12,material.travertine,{angle:.1});
  m["pool-terrace"].box(-47,.235,40.7,26,.025,7,material.pool,{angle:.1});
  for (const [i, y] of [7.2,10.8,14.4,18.0].entries()) {
    const floor = m["public-"+(i+1)+"f"];
    const plate = i===3 ? [[-43,9],[-17,-5],[22,-10],[48,.2],[42,22],[-29,31]] : hall;
    floor.prism(plate,y,y + 3.37,i===3?"#6d9199":"#948a73",{top:material.deck});
    floor.prism(plate,y+3.35,y+3.59,material.deck);
  }
  for (const x of [-30,-17,-4,9,22,35]) m["hall-columns"].box(x,7.17,-14,.58,14.45,.58,material.limestone);
  wing(m.west,-36,-21.5,53.2,21.5,0,54,5);
  wing(m.northwest,-55.6,-54,50,21.5,Math.PI/2,57.6,5);
  wing(m.east,49,-15.8,49.4,21.5,0,54,5);
  wing(m.northeast,54,-43,30.5,21.5,Math.PI/2,54,6);
  facade(m.link,-22,-9.8,10,8.1,21.6,3.6,{bays:4});
  facade(m.chapel,72.5,-32,17.5,15.05,10.8,4.9,{glass:"#6d939b",bays:5});
  const axis = [[-41,12],[-11,-7],[3,-11],[18,-8],[42,7]];
  glassBay(m["platform-deck"],m.glazing,axis,20.33,28.28,18.2);
  foldedRoof(m.roof,axis,28.33,31.8,21.50);
  m["crossing-6f"].strip([[-10,-12],[-1,-8],[4,-5]],3.2,24.91,material.limestone,.29);
  const angle = Math.atan2(-19,30);
  const west = (run, offset, y) => {
    const [x,z] = rotation(run,offset,angle);
    return [x-41,y,z+12];
  };
  const inPlan = ([x,,z]) => [x,z];
  const hallPath = [inPlan(west(0,-10.15,0)),inPlan(west(35,-10.15,0)),[2,-20.0],[18,-18.0],[37,-6]];
  m["transfer-hall"].strip(hallPath,6.55,21.30,"#94b4aa",.30,"#c4d7cd");
  const [landingX,,landingZ] = west(28.8,-7.7,21.60);
  m["transfer-hall"].box(landingX,21.30,landingZ,2.6,.30,3.35,"#94b4aa",{angle,top:"#c4d7cd"});
  for (const [key, offset] of [["platform-a",-4.8],["platform-b",4.8]]) {
    const [x,,z] = west(16,offset,20.35);
    m[key].box(x,20.13,z,30,.22,3.2,"#9cc6cf",{angle});
  }
  const ramp = m["level-ramp"];
  for (const [a,b,low,high] of [[11,18.5,20.35,20.975],[18.5,20.0,20.975,20.975],[20.0,27.5,20.975,21.60]]) {
    deckRamp(ramp,west(a,-6.1,low+.02),west(b,-6.1,high+.02),1.46,"#c4a46e");
  }
  for (let j=0; j<8; j++) {
    const y = 20.35 + 1.25 * (j+1)/8;
    const [x,,z] = west(25.25+j*.30,-7.52,y);
    m["level-stair"].box(x,20.35,z,.30,y-20.35,1.15,"#d0b287",{angle});
  }
  model.levelDifference = {
    keys:["platform-a","transfer-hall","level-ramp","level-stair"],
    center:west(19.5,-7.7,20.72),
    dimension:[west(5.5,-9.4,20.35),west(5.5,-9.4,21.60)],
    labels:[
      {key:"platform-a",position:west(7,-4.8,20.37),name:bi("月台 EL67.15","Platform EL67.15")},
      {key:"transfer-hall",position:west(29,-10.15,21.60),name:bi("5F 大廳 EL68.40","Level 5 hall EL68.40")},
      {key:"level-ramp",position:west(18.9,-6.1,21.0),name:bi("銜接坡道","Access ramp")},
    ],
  };
  for (const [key,x,z] of [["west-frame",-46,15],["east-frame",46,10.4]]) {
    m[key].box(x,.02,z,2.22,24.7,7.8,material.limestone);
    m[key].box(x,24.5,z,2.25,.65,15,material.limestone);
  }
  railPaths(m["line-a"],m["line-b"],[[-72,34],...axis,[71,30]],22.20,4.8);
  plants(site,[[-75,-29],[-72,-16],[-68,10],[-67,24],[-60,33],[-34,43],[-21,44],[-2,45],[12,42],[31,40],
    [48,33],[58,29],[66,23],[73,9],[78,-4],[78,-16],[69,-68],[46,-76],[23,-78],[-23,-81],[-37,-72]]);
  mark(model,1,[-3,11.05,-52],"北側前庭 EL57.60","North forecourt EL57.60");
  mark(model,1,[-17,6.9,-40],"前庭下兩層停車","Two parking decks");
  mark(model,2,[-16,6.8,30],"湖景宴會基座","Banquet podium");
  mark(model,3,[33,14.4,15],"站廳館公共層","Public levels");
  mark(model,4,[-48,25.25,-52],"西北翼","Northwest wing");
  mark(model,4,[46,25.25,-20],"東翼・東北翼","East and northeast wings");
  mark(model,5,[-24,20.37,13],"月台 EL67.15","Platforms EL67.15");
  mark(model,5,[8,23.1,-5],"5F 大廳 EL68.40","Level 5 hall EL68.40");
  mark(model,6,[57,22.2,19],"站端弦線","Terminal guideways");
  return model;
}

function buildT4() {
  const model = scene(3, [-4, 10, -1], 140,
    [[0,0,0], [0,1.3,-6], [-5,9,6], [7,15,8], [0,29,-3], [-10,14,-3]]);
  const m = model.mesh;
  ground(m.base, [[-65,-37],[-21,-49],[34,-43],[59,-25],[62,14],[47,41],[-22,43],[-60,28]], -.14, "#718b76");
  m.road.strip([[22,-42],[24,-22],[27,-3],[32,17],[35,41]],8.4,.02,"#606f73",.17);
  m.road.strip([[17,-40],[20,-22],[22,-3],[27,17],[30,39]],.36,.18,"#c6beb0",.03);
  m.road.strip([[26,-40],[29,-22],[32,-3],[37,17],[40,39]],.36,.18,"#c6beb0",.03);
  parking(m["drop-off"],5,-19,39,12,.09,12,-.02);
  m.forest.strip([[-50,-12],[-26,-18],[-10,-20],[7,-22],[19,-24]],3.3,.11,"#c9c5aa",.12);
  m.forest.strip([[-55,19],[-34,14],[-18,19],[-8,22],[16,24]],2.85,.11,"#c4c3a8",.12);
  plants(m.forest,[[-58,-21],[-53,-29],[-50,-15],[-47,11],[-54,23],[-58,15],[-50,27],[-41,32],[-33,28],
    [-20,33],[-14,36],[-5,29],[5,35],[18,33],[11,25],[20,19],[44,31],[47,24],[53,16],[53,7],[55,-1],
    [49,-10],[49,-18],[39,-29],[34,-32],[15,-36],[4,-38],[-7,-31],[-18,-34],[-28,-30],[-39,-36]]);
  for (const [i,y] of [.16,4.32,8.44].entries()) {
    facade(m["forest-"+(i+1)+"f"],-12,0,50.2-i*1.9,14.3,y,4.16,{glass:"#64828c",frame:"#bb9e7b",terrace:.38});
  }
  for (const z of [-5.0,5.0]) {
    const core = m[z<0?"core-northeast":"core-southwest"];
    facade(core,-37.5,z,5.8,3.1,.15,18.18,{glass:"#879998",frame:"#af9674",bays:4,terrace:.18});
    for (let i=0; i<5;i++) {
      core.box(-40.35 + 1.42*i,.35,z+(z>0?1.61:-1.61),.17,17.52,.19,material.wood);
    }
  }
  m.lookout.box(1,8.30,-10.1,19.4,.4,7.8,material.wood);
  for (let x=-8.4; x<10.5; x+=1.55) m.lookout.box(x,8.69,-13.95,.10,1.12,.14,material.bronze);
  m.lookout.box(1,9.81,-13.95,19.1,.12,.16,material.wood);
  for (const z of [-6.8,6.8]) {
    m["truss-lower"].box(28,13.0,z,29,.47,.44,material.metal);
    m["truss-upper"].box(28,17.8,z,29,.47,.44,material.metal);
    for (const x of [13.5,19.3,25.1,30.9,36.7,42.5]) {
      m["truss-web"].box(x,13.25,z,.35,4.56,.36,material.metal);
      if (x<42) m["truss-web"].tube([x,13.28,z],[x+5.8,17.98,z],.19,"#526c7a");
    }
    for (const [key,x] of [["support-inner",15.1],["support-outer",41.3]]) {
      m[key].box(x,.12,z,.72,13.1,.79,"#718287");
      m[key].box(x-.6,.09,z-.54,2.0,.34,1.5,"#7f9389");
    }
  }
  glassBay(m["platform-deck"],m.glazing,[[-42.5,0],[12.0,0]],18.15,22.51,15.2);
  m["platform-deck"].box(28.25,17.73,0,28.5,.42,15.2,material.deck);
  m["metal-roof"].box(0,22.52,0,85,.38,15.2,"#4a625e");
  for(let i=0;i<=24;i++) m["metal-roof"].box(-42.5 + i*85/24,22.91,0,.09,.05,15.22,"#708582");
  m["metal-roof"].box(-2.5,22.99,0,12.4,.08,7.3,"#789882");
  for (const [key,z] of [["platform-a",-4.85],["platform-b",4.85]]) m[key].box(-8,18.16,z,55,.13,3.2,"#becec6");
  for (const z of [-6.6,6.6]) {
    m["deflection-frame"].box(-47.5,.04,z,1.5,20.8,1.50,material.limestone);
    m["diagonal-braces"].tube([-56,.28,z+Math.sign(z)*3.0],[-47.5,17.8,z],.52,material.limestone);
    m["brace-bases"].box(-55.8,-.58,z+Math.sign(z)*3.0,3.4,.64,2.9,material.stone);
  }
  m["deflection-frame"].box(-47.5,19.91,0,1.62,.66,14.7,material.limestone);
  railPaths(m["line-a"],m["line-b"],[[-63,-5],[-47.5,0],[-42.5,0],[36,0]],19.94,4.8);
  mark(model,1,[7,.38,-23],"東北落客帶","Northeast drop-off");
  mark(model,1,[33,.25,25],"南 173 線","Route 173");
  mark(model,2,[-22,8.8,7.8],"三層林場驛站","Three-storey forest building");
  mark(model,2,[3,8.83,-13.9],"林冠觀景平台","Canopy lookout");
  mark(model,3,[28,15.1,7.1],"跨路鋼桁架","Road-spanning truss");
  mark(model,4,[-5,18.5,5.1],"月台 EL64.15","Platforms EL64.15");
  mark(model,4,[17,23,1.5],"深綠灰金屬屋面","Green-grey metal roof");
  mark(model,5,[-47,19.77,6.6],"西北轉向構架","Northwest deflection frame");
  return model;
}

const modelBuilders = [buildT1, buildT2, buildT3, buildT4];

const ui = {
  compare: bi("四站對照", "Compare stations"),
  layers: bi("構造分層", "Structure layers"),
  all: bi("全站復位", "Reset assembly"),
  view: bi("檢視", "View"),
  component: bi("構件", "Part"),
  cost: bi("經費", "Cost"),
  drawings: bi("圖說", "Drawings"),
  tour: bi("循層導覽", "Layer tour"),
  stop: bi("停止導覽", "Stop tour"),
  animate: bi("自動拆解", "Auto-explode"),
  hold: bi("暫停拆解", "Pause"),
  explode: bi("整站拆解", "Explode station"),
  perspective: bi("軸測", "Axonometric"),
  front: bi("正視", "Front"),
  end: bi("側視", "Side"),
  top: bi("鳥瞰", "Top"),
  orbit: bi("自由視角", "Orbit"),
  viewpoints: bi("視角", "Viewpoint"),
  cutting: bi("高程剖切", "Level cut"),
  whole: bi("全站", "All levels"),
  display: bi("顯示", "Display"),
  cross: bi("中線剖切", "Centre cut"),
  labels: bi("構件標籤", "Labels"),
  total: bi("站別工程包", "Station works package"),
  amountUnit: bi("萬元", "×10⁴ NTD"),
  missingCost: bi("T4 同版工項估價待補", "T4 cost estimate pending"),
  structure: bi("站體構成", "Structure"),
  station: bi("車站", "Station"),
  value: bi("月台完成面", "Platform level"),
  compareNote: bi("各站經費依各自工程包範圍列示。", "Costs use the scope stated for each station package."),
  choose: bi("展開左側分項或點選 3D 模型，以檢視個別構件與對應圖說。", "Expand a layer or click the 3D model to inspect a part and its drawing."),
  detach: bi("拆開構件", "Detach"),
  reattach: bi("構件復位", "Reassemble"),
  isolate: bi("單獨顯示", "Isolate"),
  allContext: bi("顯示全站", "Show station"),
  zoomPart: bi("聚焦構件", "Focus part"),
  zoomAll: bi("回到全站視距", "Reset framing"),
  connect: bi("相接構件", "Connected parts"),
  viewConnections: bi("同時顯示介面", "Show interfaces"),
  detailDrawing: bi("對應圖說", "Engineering drawing"),
  difference: bi("T3 月台與大廳高差", "T3 platform–hall level difference"),
  closeDifference: bi("回到全站", "Return to station"),
  foot: bi("構件位置、剖切和未定規格細節按圖說示意。", "Component positions, section cuts and unspecified details are schematic."),
  release: bi("V1.4 · 2026.11.17", "V1.4 · 2026.11.17"),
};

const angles = {
  perspective: [.68, .49],
  front: [0, .025],
  end: [Math.PI / 2, .035],
  top: [0, Math.PI / 2 - .002],
};
const orbitByStation = [[.58,.48],[.64,.47],[.66,.51],[.57,.49]];
const state = {
  station: 0, active: null, view: "perspective", yaw: orbitByStation[0][0], pitch: orbitByStation[0][1],
  explode: 0, zoom: 1, cutIndex: -1, cut: null, section: false, names: true, lang: getLanguage(),
  mode: "view", motion: null, motionStart: 0, motionStartExplode: 0,
  picked: null, expanded: null, detached: new Set(), scope: null, scopeMode: null, focus: false,
};
const stationModels = new Map();
const $ = id => document.getElementById(id);
const stage = $("canvas-area");
const modal = $("modal");
const numbers = new Intl.NumberFormat("en-US", {maximumFractionDigits: 1});
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[c]);
const text = value => state.lang === "en" ? value.en : value.zh;
const phrase = value => escape(text(value));
const tr = key => phrase(ui[key]);
const current = () => stations[state.station];
const detailFor = key => componentIndex[state.station].get(key);
const press = value => ' aria-pressed="' + Boolean(value) + '"';
const fmt = value => numbers.format(value);
const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

const renderer = new Viewport($("orbit-canvas"), $("fallback-canvas"));
let marks = [];
let frameRequest = 0;
let motionRequest = 0;

function refreshText() {
  for (const label of document.querySelectorAll("[data-label]")) {
    if (label.dataset.label in ui) label.innerHTML = tr(label.dataset.label);
  }
  refreshMotionButtons();
}

function renderNav() {
  $("station-nav").innerHTML = stations.map((station, i) =>
    '<button class="station-tab" type="button" data-station="' + i + '"' + press(i === state.station) + '>'
    + '<span class="station-id">' + station.id + "</span>"
    + "<strong>" + phrase(station.name) + "</strong>"
    + (i === 3 ? '<span class="phase-short">' + escape(text(station.phase)) + "</span>" : "")
    + "</button>"
  ).join("");
}

function renderHeader() {
  const station = current();
  $("station-title").innerHTML = phrase(station.title);
  $("station-lead").innerHTML = phrase(station.description);
  $("station-phase").innerHTML = phrase(station.phase);
  $("station-phase").classList.toggle("is-second", state.station === 3);
  $("station-stats").innerHTML = station.stats.map(stat => '<div class="stat"><dt>' + phrase(stat.name)
    + "</dt><dd>" + escape(stat.value) + "</dd></div>").join("");
}

function renderLayers() {
  const station = current();
  const scroller = $("layer-list");
  const scroll = scroller.scrollTop;
  const priorFocus = document.activeElement?.dataset ?? {};
  scroller.innerHTML = station.layers.map((item, i) => {
    const id = i + 1;
    const picked = id === state.active;
    const open = id === state.expanded;
    const components = detailCatalog[state.station][i];
    const more = open
      ? '<div class="layer-more" id="layer-detail-' + id + '">' + item.facts.slice(1).map(phrase).join(" ")
        + (item.cost === undefined ? "" : '<span class="layer-price">' + fmt(item.cost) + " " + tr("amountUnit") + "</span>")
        + "</div>"
      : "";
    const children = open ? '<ul class="part-list" id="parts-' + id + '">' + components.map(part => {
      const expanded = state.detached.has(part.key);
      return '<li><button type="button" class="part-list-item" data-component="' + part.key + '"' + press(state.picked === part.key)
        + '><span class="part-dot" aria-hidden="true"></span><span class="part-list-name">' + phrase(part.name)
        + "</span>" + (expanded ? '<span class="part-moved" aria-hidden="true">↗</span>' : "") + "</button></li>";
    }).join("") + "</ul>" : "";
    return '<div class="layer-card' + (picked ? " is-active" : "") + '" style="--layer:' + item.color + '">'
      + '<button type="button" class="layer-group" data-layer="' + id + '" aria-expanded="' + open + '">'
      + '<span class="layer-idx">' + id + '</span><span class="layer-title">' + phrase(item.name)
      + '</span><span class="layer-count">' + components.length
      + '</span><span class="layer-chevron" aria-hidden="true">' + (open?"▾":"›") + "</span></button>"
      + '<p class="layer-summary">' + phrase(item.facts[0]) + "</p>" + more + children + "</div>";
  }).join("");
  scroller.scrollTop = scroll;
  if (priorFocus.component) scroller.querySelector('[data-component="' + priorFocus.component + '"]')?.focus({preventScroll:true});
  else if (priorFocus.layer) scroller.querySelector('[data-layer="' + priorFocus.layer + '"]')?.focus({preventScroll:true});
}

function group(title, content, extra = "") {
  return '<section class="control-group"><h3>' + tr(title) + '</h3><div class="options ' + extra + '">' + content + "</div></section>";
}

function renderInspector() {
  const station = current();
  for (const button of $("inspector-nav").querySelectorAll("button")) {
    button.setAttribute("aria-pressed", button.dataset.mode === state.mode);
  }
  const pane = $("inspector-content");
  if (state.mode === "drawings") {
    const drawings = new Map(station.gallery);
    for (const part of componentIndex[state.station].values()) drawings.set(part.sheet,sectionDrawings[part.sheet]);
    pane.innerHTML = '<div class="drawings-list">' + [...drawings].map(([key, label]) =>
      '<button type="button" class="drawing-link" data-sheet="' + key + '">'
      + '<img loading="lazy" alt="" src="' + galleryAssets[key] + '"><span>' + phrase(label) + "</span></button>").join("") + "</div>";
  } else if (state.mode === "cost") {
    pane.innerHTML = renderCosts(station);
  } else if (state.mode === "component") {
    pane.innerHTML = renderComponent();
  } else {
    const views = Object.keys(angles).map(id => '<button type="button" data-view="' + id + '"' + press(state.view === id) + ">" + tr(id) + "</button>");
    const levels = ['<button type="button" data-level="-1"' + press(state.cutIndex === -1) + ">" + tr("whole") + "</button>"];
    station.levels.forEach((item, i) => levels.push('<button type="button" data-level="' + i + '"' + press(state.cutIndex === i)
      + ">" + phrase(item.name) + (item.el ? "<small>EL" + item.el + "</small>" : "") + "</button>"));
    const modes = ['<button type="button" data-toggle="section"' + press(state.section) + ">" + tr("cross") + "</button>",
      '<button type="button" data-toggle="names"' + press(state.names) + ">" + tr("labels") + "</button>"].join("");
    const estimate = station.total === null
      ? '<p class="muted">' + tr("missingCost") + "</p>"
      : '<span class="cost-total-label">' + tr("total") + '</span><div class="cost-total"><strong>' + fmt(station.total) + "</strong><span>" + tr("amountUnit") + "</span></div>";
    const difference = renderer.model.levelDifference ? '<button class="difference-link" type="button" data-part-action="difference">'
      + tr("difference") + '<strong>1.25 m</strong></button>' : "";
    pane.innerHTML = group("viewpoints", views.join("")) + group("cutting", levels.join(""),"levels")
      + group("display", modes) + difference + estimate;
  }
  pane.scrollTop = 0;
}

function renderComponent() {
  if (state.scopeMode === "difference") {
    return '<h3 class="component-title">' + tr("difference") + '</h3><dl class="rise-panel">'
      + '<dt>' + phrase(bi("側式月台","Side platform")) + '</dt><dd>EL67.15</dd><dt>'
      + phrase(bi("5F 轉乘大廳","Level 5 transfer hall")) + '</dt><dd>EL68.40</dd><dt>'
      + phrase(bi("高差","Rise")) + '</dt><dd class="rise-value">1.25 m</dd></dl><p class="component-note">'
      + phrase(bi("坡道 1:12，設中間平台，旁設 8 級階梯。可分別點選坡道、階梯與兩個樓面。","The 1:12 ramp has an intermediate landing and eight adjacent steps. Select each access element and level in the model."))
      + '</p><button class="sheet-button" type="button" data-sheet="t3-platform">' + phrase(sectionDrawings["t3-platform"])
      + '</button><button class="button" type="button" data-part-action="restore">' + tr("closeDifference") + "</button>";
  }
  const part = detailFor(state.picked);
  if (!part) return '<p class="component-note">' + tr("choose") + "</p>";
  const color = current().layers[part.group-1].color;
  const isolated = state.scopeMode === "isolate";
  const connected = state.scopeMode === "links";
  const detached = state.detached.has(part.key);
  const controls = [["move",detached?"reattach":"detach",detached],["isolate",isolated?"allContext":"isolate",isolated]];
  if (!state.scope) controls.push(["focus",state.focus?"zoomAll":"zoomPart",state.focus]);
  if (part.links.length) controls.push(["links",connected?"allContext":"viewConnections",connected]);
  const actions = controls.map(([action,label,on]) => '<button class="button" type="button" data-part-action="' + action + '"' + press(on)
    + ">" + tr(label) + "</button>").join("");
  const links = part.links.map(key => '<button type="button" data-component="' + key + '" class="component-link">'
    + phrase(detailFor(key).name) + '<span aria-hidden="true">›</span></button>').join("");
  return '<div class="component-category" style="--part-color:' + color + '">' + phrase(current().layers[part.group-1].name) + '</div>'
    + '<h3 class="component-title">' + phrase(part.name) + "</h3>"
    + '<p class="component-note">' + phrase(part.detail) + "</p>"
    + '<div class="component-actions">' + actions + "</div>"
    + '<section class="component-drawing"><h4>' + tr("detailDrawing") + '</h4>'
    + '<button class="sheet-button" type="button" data-sheet="' + part.sheet + '">'
    + phrase(sectionDrawings[part.sheet]) + "</button>"
    + "</section>"
    + (links ? '<section class="component-links"><h4>' + tr("connect") + "</h4>" + links + "</section>" : "")
    + (renderer.model.levelDifference && renderer.model.levelDifference.keys.includes(part.key)
      ? '<button class="difference-link" type="button" data-part-action="difference">'
        + tr("difference") + '<strong>1.25 m</strong></button>' : "");
}

function renderCosts(station) {
  if (station.total === null) return '<h3 class="panel-title">' + tr("missingCost") + '</h3><p class="cost-note">' + phrase(station.costNote) + "</p>";
  const layerCosts = station.layers.filter(layer => layer.cost !== undefined);
  const parts = layerCosts.length
    ? '<div class="cost-bar" aria-hidden="true">' + layerCosts.map(item =>
      '<i style="background:' + item.color + ";width:" + (100 * item.cost / station.subtotal) + '%"></i>').join("") + "</div>"
    : "";
  const rows = station.costs ?? layerCosts.map(x => [x.name, x.cost, x.color]);
  return '<p class="cost-total-label">' + tr("total") + '</p><div class="cost-total"><strong>' + fmt(station.total)
    + '</strong><span>' + tr("amountUnit") + '</span></div><p class="muted">' + phrase(station.subtotalName)
    + (typeof station.subtotal === "number" ? " · " + fmt(station.subtotal) + " " + tr("amountUnit") : "") + "</p>"
    + parts + rows.map(([name,value,color]) => '<div class="cost-row"><span>'
      + (color ? '<i class="swatch" style="background:' + color + '"></i>' : "")
      + phrase(name) + "</span><span>" + fmt(value) + "</span></div>").join("")
    + '<p class="cost-note">' + phrase(station.costNote) + "</p>";
}

function refreshInspectorSelection() {
  if (state.mode !== "view") return;
  for (const button of $("inspector-content").querySelectorAll("[data-view]")) {
    button.setAttribute("aria-pressed", state.view === button.dataset.view);
  }
  for (const button of $("inspector-content").querySelectorAll("[data-level]")) {
    button.setAttribute("aria-pressed", state.cutIndex === Number(button.dataset.level));
  }
  for (const button of $("inspector-content").querySelectorAll("[data-toggle]")) {
    button.setAttribute("aria-pressed", Boolean(state[button.dataset.toggle]));
  }
}

function buildMarkers() {
  $("markers").replaceChildren();
  const station = current();
  const model = renderer.model;
  let entries = model.labels;
  if (state.scopeMode === "difference") entries = model.levelDifference.labels;
  else if (state.picked) {
    const keys = state.scope ? [...state.scope] : [state.picked];
    entries = keys.map(key => {
      const part = model.byKey.get(key);
      const pos = part.bounds.center.slice();
      pos[1] = part.bounds.max[1];
      return {key,position:pos,name:part.name};
    });
  }
  marks = entries.map(mark => {
    const pin = document.createElement("i");
    const line = document.createElement("i");
    const label = document.createElement("button");
    pin.className = "model-pin";
    line.className = "model-connector";
    label.className = "model-label";
    label.type = "button";
    if (mark.key) label.dataset.component = mark.key;
    else label.dataset.marker = String(mark.id);
    label.innerHTML = phrase(mark.name);
    const group = mark.key ? detailFor(mark.key).group : mark.id;
    for (const element of [pin, line, label]) element.style.setProperty("--key", station.layers[group-1].color);
    $("markers").append(pin, line, label);
    return {...mark, pin, line, label};
  });
}

function drawMarks(frame) {
  const {width, height, cut, offsets} = frame;
  const occupied = [];
  const isSmall = width < 470 && state.active === null;
  let visible = 0;
  for (const mark of marks) {
    const {id, position, label, line, pin} = mark;
    const offset = mark.key ? offsets.get(mark.key) : vec.scale(renderer.model.shifts[id],state.explode);
    const [x, y] = renderer.project(position,offset);
    const eligible = state.names && (mark.key || state.active === null || state.active === id)
      && position[1] <= cut[0] + .05 && position[2] <= cut[1] + .05
      && x > 12 && x < width - 12 && y > 47 && y < height - 24
      && (!isSmall || visible < 4);
    [pin.hidden, line.hidden, label.hidden] = [!eligible, !eligible, !eligible];
    if (!eligible) continue;
    const lw = label.offsetWidth;
    const lh = label.offsetHeight;
    let placed = false;
    for (const [dx, dy] of [[12,-20],[-lw - 12,-20],[10,6],[-lw - 9,6],[-lw / 2,-39],[-lw / 2,21]]) {
      const a = clamp(x + dx, 5, width - lw - 5);
      const b = clamp(y + dy, 41, height - lh - 17);
      const bounds = [a - 3, b - 3, a + lw + 4, b + lh + 4];
      if (occupied.some(r => bounds[0] < r[2] && bounds[2] > r[0] && bounds[1] < r[3] && bounds[3] > r[1])) continue;
      occupied.push(bounds);
      label.style.left = a + "px";
      label.style.top = b + "px";
      pin.style.left = x + "px";
      pin.style.top = y + "px";
      const cx = clamp(x, a, a + lw) - x;
      const cy = clamp(y, b, b + lh) - y;
      line.style.left = x + "px";
      line.style.top = y + "px";
      line.style.width = Math.hypot(cx,cy) + "px";
      line.style.transform = "rotate(" + Math.atan2(cy,cx) + "rad)";
      visible++;
      placed = true;
      break;
    }
    if (!placed) [pin.hidden,line.hidden,label.hidden] = [true,true,true];
  }
  drawRiseDimension(frame);
}

function drawRiseDimension({width,height}) {
  const dimension = $("rise-dimension");
  dimension.hidden = true;
  if (state.scopeMode !== "difference" || !state.names) return;
  const [[x, low],[,high]] = renderer.model.levelDifference.dimension.map(p=>renderer.project(p));
  if (x<60 || x>width-12 || high<28 || low>height-24 || low-high<9) return;
  dimension.style.left = x+"px";
  dimension.style.top = high+"px";
  dimension.style.height = (low-high)+"px";
  dimension.hidden = false;
}

function queueFrame() {
  if (frameRequest) return;
  frameRequest = requestAnimationFrame(() => {
    frameRequest = 0;
    drawMarks(renderer.draw(state));
  });
}

function syncControls() {
  const percentage = Math.round(state.explode * 100);
  $("explode-value").textContent = percentage + "%";
  $("explode-slider").value = percentage;
  const view = ui[state.view];
  const mode = state.scopeMode === "difference" ? " · Δ 1.25 m"
    : state.scopeMode === "links" ? " · " + text(ui.connect)
    : state.scopeMode === "isolate" ? " · " + text(ui.isolate)
    : state.section ? " · " + text(ui.cross) : "";
  $("view-status").textContent = text(view) + mode;
  stage.dataset.view = state.view;
  stage.dataset.exploded = String(percentage);
  stage.dataset.part = state.picked ?? "";
  stage.dataset.detached = String(state.detached.size);
  $("all-layers").disabled = !state.picked && !state.expanded && !state.detached.size && !state.explode
    && !state.scope && state.cutIndex === -1 && !state.section;
  refreshInspectorSelection();
  queueFrame();
}

function refreshMotionButtons() {
  const tour = state.motion === "tour";
  const auto = state.motion === "auto";
  $("tour").querySelector("[data-label]").innerHTML = tr(tour ? "stop" : "tour");
  $("animate").querySelector("[data-label]").innerHTML = tr(auto ? "hold" : "animate");
  $("tour").setAttribute("aria-pressed", tour);
  $("animate").setAttribute("aria-pressed", auto);
}

function stopMotion() {
  state.motion = null;
  cancelAnimationFrame(motionRequest);
  refreshMotionButtons();
}

function clearScope() {
  state.scope = null;
  state.scopeMode = null;
  state.focus = false;
  state.zoom = 1;
}

function clearCuts() {
  state.cut = null;
  state.cutIndex = -1;
  state.section = false;
}

function setLayer(id) {
  stopMotion();
  state.expanded = id === state.expanded ? null : id;
  state.active = state.expanded;
  state.picked = null;
  clearScope();
  refreshSelection();
}

function refreshSelection() {
  renderLayers();
  renderInspector();
  buildMarkers();
  syncControls();
}

function selectComponent(key) {
  const part = detailFor(key);
  if (!part) return;
  stopMotion();
  state.picked = key;
  state.expanded = part.group;
  state.active = part.group;
  state.mode = "component";
  clearScope();
  if (part.buried) {
    clearCuts();
    state.scope = new Set([key]);
    state.scopeMode = "isolate";
  }
  refreshSelection();
}

function partAction(action) {
  if (action === "restore") {
    activateStation(state.station);
    return;
  }
  stopMotion();
  if (action === "difference") {
    state.mode = "component";
    state.picked = null;
    state.expanded = 5;
    state.active = 5;
    state.explode = 0;
    state.detached.clear();
    clearCuts();
    clearScope();
    state.scope = new Set(renderer.model.levelDifference.keys);
    state.scopeMode = "difference";
    state.view = "orbit";
    state.yaw = .58;
    state.pitch = .32;
    refreshSelection();
    return;
  }
  const part = detailFor(state.picked);
  if (!part) return;
  if (action === "move") {
    clearCuts();
    if (!state.detached.delete(part.key)) state.detached.add(part.key);
  } else if (action === "focus") {
    state.focus = !state.focus;
    state.zoom = 1;
  } else if (action === "isolate" || action === "links") {
    const wasActive = state.scopeMode === action;
    clearScope();
    if (!wasActive) {
      clearCuts();
      state.scope = new Set(action === "isolate" ? [part.key] : [part.key,...part.links]);
      state.scopeMode = action;
    }
  }
  refreshSelection();
  $("inspector-content").querySelector('[data-part-action="' + action + '"]')?.focus({preventScroll:true});
}

function stepMotion(now) {
  if (!state.motion) return;
  const elapsed = now - state.motionStart;
  if (state.motion === "auto") {
    const progress = clamp(elapsed / 1800,0,1);
    state.explode = state.motionStartExplode + (1 - state.motionStartExplode) * (1 - (1 - progress) ** 3);
    if (progress === 1) stopMotion();
  } else {
    const duration = 2900;
    const next = 1 + Math.floor(elapsed / duration);
    if (next > current().layers.length) {
      state.active = null;
      state.expanded = null;
      state.explode = 0;
      stopMotion();
      renderLayers();
      syncControls();
      return;
    }
    if (next !== state.active) {
      state.active = next;
      state.expanded = next;
      renderLayers();
      const scroller = $("layer-list");
      const active = scroller.querySelector(".is-active");
      if (active) {
        const box = active.getBoundingClientRect();
        const bounds = scroller.getBoundingClientRect();
        if (scroller.scrollHeight > scroller.clientHeight && box.bottom > bounds.bottom) {
          scroller.scrollTop += box.bottom - bounds.bottom + 7;
        }
      }
    }
    const phase = (elapsed % duration) / duration;
    state.explode = .36 + .34 * Math.sin(Math.PI * phase);
  }
  syncControls();
  if (state.motion) motionRequest = requestAnimationFrame(stepMotion);
}

function startMotion(kind) {
  const old = state.motion;
  stopMotion();
  if (old === kind || (kind === "auto" && state.explode === 1)) return;
  state.motion = kind;
  state.motionStart = performance.now();
  state.motionStartExplode = kind === "auto" ? state.explode : 0;
  clearCuts();
  clearScope();
  state.active = null;
  state.expanded = null;
  state.picked = null;
  state.detached.clear();
  state.explode = state.motionStartExplode;
  state.mode = "view";
  refreshSelection();
  motionRequest = requestAnimationFrame(stepMotion);
}

function setView(name) {
  state.view = name;
  const [yaw, pitch] = name === "perspective" ? orbitByStation[state.station] : angles[name];
  Object.assign(state,{yaw,pitch,zoom:1});
  syncControls();
}

function activateStation(index) {
  stopMotion();
  state.station = index;
  state.active = null;
  state.expanded = null;
  state.picked = null;
  state.detached.clear();
  clearCuts();
  clearScope();
  state.explode = 0;
  if (state.mode === "component") state.mode = "view";
  if (!stationModels.has(index)) stationModels.set(index, modelBuilders[index]());
  renderer.setModel(stationModels.get(index));
  renderNav();
  renderHeader();
  renderLayers();
  $("layer-list").scrollTop = 0;
  renderInspector();
  buildMarkers();
  setView("perspective");
}

function setLanguage(lang) {
  state.lang = lang;
  refreshText();
  renderNav();
  renderHeader();
  renderLayers();
  renderInspector();
  buildMarkers();
  syncControls();
}

function openModal(title, content) {
  $("modal-title").innerHTML = title;
  $("modal-content").innerHTML = content;
  modal.showModal();
}

function showSheet(key) {
  const name = sectionDrawings[key] ?? new Map(current().gallery).get(key);
  openModal(phrase(name), '<figure><img src="' + galleryAssets[key] + '" alt="' + escape(text(name)) + '"></figure>');
}

function showComparison() {
  const heads = ["station","value","structure","total"].map(key => "<th scope=col>" + tr(key) + "</th>").join("");
  const rows = stations.map(station => "<tr><th scope=row>" + station.id + " " + phrase(station.name)
    + "</th><td>" + station.stats[0].value
    + "</td><td>" + phrase(station.title) + "</td><td>"
    + (station.total === null ? tr("missingCost") : fmt(station.total) + " " + tr("amountUnit")) + "</td></tr>").join("");
  openModal(tr("compare"), '<table class="comparison"><thead><tr>' + heads + "</tr></thead><tbody>" + rows
    + '</tbody></table><p class="muted compare-note">' + tr("compareNote") + "</p>");
}

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const d = button.dataset;
  if (d.station !== undefined) {
    const index = Number(d.station);
    activateStation(index);
    $("station-nav").querySelector('[data-station="' + index + '"]').focus({preventScroll:true});
    const url = new URL(location.href);
    url.searchParams.set("station", stations[index].id);
    history.replaceState(history.state,"",url);
  } else if (d.layer || d.marker) {
    setLayer(Number(d.layer || d.marker));
  } else if (d.component) {
    selectComponent(d.component);
  } else if (d.partAction || button.id === "all-layers") {
    partAction(d.partAction ?? "restore");
  } else if (d.mode) {
    state.mode = d.mode;
    renderInspector();
  } else if (d.view) {
    setView(d.view);
  } else if (d.level !== undefined) {
    stopMotion();
    clearScope();
    state.detached.clear();
    state.cutIndex = Number(d.level);
    state.cut = current().levels[state.cutIndex]?.modelY ?? null;
    state.explode = 0;
    state.active = null;
    state.picked = null;
    state.expanded = null;
    refreshSelection();
  } else if (d.toggle) {
    state[d.toggle] = !state[d.toggle];
    if (d.toggle === "section") {
      stopMotion();
      state.explode = 0;
    }
    syncControls();
  } else if (d.camera) {
    if (d.camera === "reset") setView("perspective");
    else {
      state.zoom = clamp(state.zoom * (d.camera === "in" ? 1.16 : 1 / 1.16), .56, 3.2);
      queueFrame();
    }
  } else if (d.sheet) {
    showSheet(d.sheet);
  } else if (button.id === "tour") startMotion("tour");
  else if (button.id === "animate") startMotion("auto");
  else if (button.id === "compare") showComparison();
});

function setExplosion(value) {
  if (state.motion) stopMotion();
  if (state.scopeMode === "difference") {
    clearScope();
    state.mode = "view";
    buildMarkers();
    renderInspector();
  }
  state.explode = clamp(value,0,1);
  syncControls();
}

$("explode-slider").addEventListener("input", event => setExplosion(Number(event.currentTarget.value) / 100));

bindModelDrag(stage,$("model-drag"),{
  explode: delta => setExplosion(state.explode + delta),
  rotate: (dx,dy) => {
    if (state.motion) stopMotion();
    state.view = "orbit";
    state.yaw -= dx * .009;
    state.pitch = clamp(state.pitch + dy * .009, -.75, Math.PI / 2 - .002);
    syncControls();
  },
  select: (x,y) => {
    const bounds = stage.getBoundingClientRect();
    const picked = renderer.pick(x-bounds.left,y-bounds.top);
    if (picked) selectComponent(picked);
  }
});
stage.addEventListener("wheel", event => {
  event.preventDefault();
  state.zoom = clamp(state.zoom * Math.exp(-event.deltaY * .00105), .56, 3.2);
  queueFrame();
}, {passive:false});

modal.addEventListener("click", event => {
  if (event.target === modal) {
    const bounds = modal.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
  }
});
new ResizeObserver(queueFrame).observe(stage);
onLanguageChange(setLanguage);
refreshText();
const requestedStation = new URLSearchParams(location.search).get("station");
activateStation(Math.max(0,stations.findIndex(station => station.id === requestedStation)));
