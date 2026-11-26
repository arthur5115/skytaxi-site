import { Matrix3, Matrix4, Vector3, Color, BackSide, FrontSide } from 'three';

const light = new Vector3(-.47, .89, .57).normalize();
const fill = new Vector3(.7, .45, -.8).normalize();
const normal = new Vector3();
const eye = new Vector3();
const tone = new Uint8Array(1025);
for (let i = 0; i < tone.length; i++) {
  const linear = i / 1024;
  const srgb = linear <= .0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - .055;
  tone[i] = Math.round(srgb * 255);
}

function channel(linear) {
  return tone[Math.max(0, Math.min(1024, Math.round(linear * 1024)))];
}

function rgba(r, g, b, a = 255) {
  return (a << 24) | (b << 16) | (g << 8) | r;
}

function shadeFor(geometry, indices, matrix, material, dusk) {
  const attribute = geometry.attributes.normal;
  if (attribute) {
    const [a, b, c] = indices;
    normal.set(attribute.getX(a) + attribute.getX(b) + attribute.getX(c),
      attribute.getY(a) + attribute.getY(b) + attribute.getY(c),
      attribute.getZ(a) + attribute.getZ(b) + attribute.getZ(c)).applyMatrix3(matrix).normalize();
  } else normal.set(0, 1, 0);
  if (material.side !== FrontSide && normal.dot(eye) < 0) normal.negate();
  const brightness = (dusk ? .34 : .49) + (dusk ? .43 : .55) * Math.max(0, normal.dot(light))
    + .16 * Math.max(0, normal.dot(fill));
  const color = material.color ?? new Color(1, 1, 1);
  return [channel(color.r * brightness * (dusk ? 1.14 : 1.025)),
    channel(color.g * brightness),
    channel(color.b * brightness * (dusk ? .97 : 1.02)),
    Math.round(255 * (material.transparent ? material.opacity : 1))];
}

function mix(a, b, t) {
  return a.map((value, index) => value + (b[index] - value) * t);
}

function clipped(points, planes) {
  let polygon = points;
  for (let plane = 0; plane < planes; plane++) {
    const component = 5 + plane;
    if (polygon.every(point => point[component] >= 0)) continue;
    const next = [];
    for (let i = 0; i < polygon.length; i++) {
      const current = polygon[i];
      const previous = polygon[(i + polygon.length - 1) % polygon.length];
      const a = previous[component];
      const b = current[component];
      if ((a >= 0) !== (b >= 0)) next.push(mix(previous, current, a / (a - b)));
      if (b >= 0) next.push(current);
    }
    if (next.length < 3) return [];
    polygon = next;
  }
  return polygon;
}

// Canvas fallback for browsers without WebGL. It projects the same indexed
// meshes and clipping planes, with a depth buffer for occlusion.
export class RasterRenderer {
  constructor() {
    this.domElement = document.createElement('canvas');
    this.context = this.domElement.getContext('2d', {alpha: true});
    if (!this.context) throw new Error('Canvas is unavailable');
    this.bufferCanvas = document.createElement('canvas');
    this.bufferContext = this.bufferCanvas.getContext('2d', {alpha: true});
    this.shadowMap = {};
    this.cache = new WeakMap();
    this.textures = new WeakMap();
    this.projection = new Matrix4();
    this.modelProjection = new Matrix4();
    this.normalMatrix = new Matrix3();
    this.vector = new Vector3();
    this.begin = new Vector3();
    this.end = new Vector3();
  }

  setPixelRatio() {}

  setSize(width, height) {
    const ratio = Math.min(1, 820 / Math.max(width, height));
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
    if (width === this.width && height === this.height) return;
    this.width = this.domElement.width = this.bufferCanvas.width = width;
    this.height = this.domElement.height = this.bufferCanvas.height = height;
    this.image = this.bufferContext.createImageData(width, height);
    this.pixels = new Uint32Array(this.image.data.buffer);
    this.depth = new Float32Array(width * height);
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  project(point, matrix = this.projection) {
    point.applyMatrix4(matrix);
    point.x = (1 + point.x) * this.width / 2;
    point.y = (1 - point.y) * this.height / 2;
    return point;
  }

  drawGrid() {
    if (!this.grid) return;
    const {context, grid} = this;
    const pos = grid.geometry.attributes.position;
    const gradient = context.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(.20, 'transparent');
    gradient.addColorStop(.63, this.theme === 'dusk' ? '#becad11b' : '#76897921');
    gradient.addColorStop(1, this.theme === 'dusk' ? '#becad129' : '#7689792e');
    context.strokeStyle = gradient;
    context.beginPath();
    for (let i = 0; i < pos.count; i += 2) {
      const a = this.project(this.begin.fromBufferAttribute(pos, i).applyMatrix4(grid.matrixWorld));
      const b = this.project(this.end.fromBufferAttribute(pos, i + 1).applyMatrix4(grid.matrixWorld));
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
    }
    context.stroke();
  }

  textureFor(map) {
    if (!map?.image) return null;
    if (!this.textures.has(map)) {
      const image = map.image;
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d', {willReadFrequently: true});
      context.drawImage(image, 0, 0);
      this.textures.set(map, {width: image.width, height: image.height,
        data: context.getImageData(0, 0, image.width, image.height).data, flipY: map.flipY});
    }
    return this.textures.get(map);
  }

  vertices(mesh, planes) {
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    const cache = this.cache.get(mesh) ?? {vertices: []};
    this.cache.set(mesh, cache);
    const modelProjection = this.modelProjection.multiplyMatrices(this.projection, mesh.matrixWorld);
    const vector = this.vector;
    for (let i = 0; i < position.count; i++) {
      const at = cache.vertices[i] ?? (cache.vertices[i] = []);
      this.project(vector.fromBufferAttribute(position, i), modelProjection);
      at[0] = vector.x;
      at[1] = vector.y;
      at[2] = vector.z;
      at[3] = uv ? uv.getX(i) : 0;
      at[4] = uv ? uv.getY(i) : 0;
      if (planes.length) {
        vector.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
        for (let j = 0; j < planes.length; j++) at[5 + j] = planes[j].distanceToPoint(vector);
      }
    }
    return cache.vertices;
  }

  mesh(mesh, translucent) {
    const geometry = mesh.geometry;
    const index = geometry.index;
    const position = geometry.attributes.position;
    if (!position) return;
    const array = Array.isArray(mesh.material);
    const packets = array ? geometry.groups : [{start: 0, count: index?.count ?? position.count, materialIndex: 0}];
    this.normalMatrix.getNormalMatrix(mesh.matrixWorld);
    for (const packet of packets) {
      const material = array ? mesh.material[packet.materialIndex] : mesh.material;
      const planes = material.clippingPlanes ?? [];
      const points = this.vertices(mesh, planes);
      const texture = this.textureFor(material.map);
      for (let i = packet.start; i + 2 < packet.start + packet.count; i += 3) {
        const ai = index ? index.getX(i) : i;
        const bi = index ? index.getX(i + 1) : i + 1;
        const ci = index ? index.getX(i + 2) : i + 2;
        const a = points[ai];
        const b = points[bi];
        const c = points[ci];
        if (Math.min(a[0], b[0], c[0]) >= this.width || Math.max(a[0], b[0], c[0]) < 0
          || Math.min(a[1], b[1], c[1]) >= this.height || Math.max(a[1], b[1], c[1]) < 0) continue;
        const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (Math.abs(cross) < .02 || (material.side === FrontSide && cross > 0) || (material.side === BackSide && cross < 0)) continue;
        const polygon = planes.length ? clipped([a, b, c], planes.length) : [a, b, c];
        if (!polygon.length) continue;
        const shade = shadeFor(geometry, [ai, bi, ci], this.normalMatrix, material, this.theme === 'dusk');
        for (let j = 1; j + 1 < polygon.length; j++) {
          if (material.transparent) {
            const triangle = [polygon[0], polygon[j], polygon[j + 1]];
            const z = (triangle[0][2] + triangle[1][2] + triangle[2][2]) / 3;
            translucent.push({triangle, z, shade, texture});
          } else this.triangle(polygon[0], polygon[j], polygon[j + 1], shade, texture, true);
        }
      }
    }
  }

  composite(index, r, g, b, alpha) {
    const prior = this.pixels[index];
    const fraction = alpha / 255;
    const remaining = (1 - fraction) * (prior >>> 24);
    const combined = alpha + remaining;
    if (!combined) return;
    const src = alpha / combined;
    const dst = remaining / combined;
    this.pixels[index] = rgba(Math.round(r * src + (prior & 255) * dst),
      Math.round(g * src + ((prior >>> 8) & 255) * dst),
      Math.round(b * src + ((prior >>> 16) & 255) * dst), Math.round(combined));
  }

  triangle(a, b, c, color, texture, solid) {
    const width = this.width;
    const minX = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0])));
    const maxX = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
    const minY = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1])));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const denominator = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(denominator) < .02) return;
    const waDx = (b[1] - c[1]) / denominator;
    const wbDx = (c[1] - a[1]) / denominator;
    const waDy = (c[0] - b[0]) / denominator;
    const wbDy = (a[0] - c[0]) / denominator;
    let startA = waDx * (minX + .5 - c[0]) + waDy * (minY + .5 - c[1]);
    let startB = wbDx * (minX + .5 - c[0]) + wbDy * (minY + .5 - c[1]);
    const packed = rgba(color[0], color[1], color[2]);
    for (let y = minY; y <= maxY; y++, startA += waDy, startB += wbDy) {
      let wa = startA;
      let wb = startB;
      let index = y * width + minX;
      for (let x = minX; x <= maxX; x++, index++, wa += waDx, wb += wbDx) {
        const wc = 1 - wa - wb;
        if (wa < -.00001 || wb < -.00001 || wc < -.00001) continue;
        const z = wa * a[2] + wb * b[2] + wc * c[2];
        if (z < -1 || z > 1 || z > this.depth[index]) continue;
        if (solid) this.depth[index] = z;
        if (texture) {
          const u = wa * a[3] + wb * b[3] + wc * c[3];
          const v = wa * a[4] + wb * b[4] + wc * c[4];
          const tx = Math.min(texture.width - 1, Math.max(0, Math.floor(u * texture.width)));
          const ty = Math.min(texture.height - 1, Math.max(0, Math.floor((texture.flipY ? 1 - v : v) * texture.height)));
          const p = (ty * texture.width + tx) * 4;
          const tr = Math.round(color[0] * texture.data[p] / 255);
          const tg = Math.round(color[1] * texture.data[p + 1] / 255);
          const tb = Math.round(color[2] * texture.data[p + 2] / 255);
          if (solid) this.pixels[index] = rgba(tr, tg, tb);
          else this.composite(index, tr, tg, tb, Math.round(color[3] * texture.data[p + 3] / 255));
        } else if (solid) this.pixels[index] = packed;
        else this.composite(index, color[0], color[1], color[2], color[3]);
      }
    }
  }

  line(object) {
    const position = object.geometry.attributes.position;
    if (!position) return;
    const [r, g, b] = [object.material.color.r, object.material.color.g, object.material.color.b].map(channel);
    const alpha = Math.round(255 * object.material.opacity);
    const through = object.material.depthTest === false;
    const vertices = object.geometry.index;
    const count = vertices?.count ?? position.count;
    for (let i = 0; i + 1 < count; i += 2) {
      const start = vertices ? vertices.getX(i) : i;
      const end = vertices ? vertices.getX(i + 1) : i + 1;
      const a = this.project(this.begin.fromBufferAttribute(position, start).applyMatrix4(object.matrixWorld));
      const bPoint = this.project(this.end.fromBufferAttribute(position, end).applyMatrix4(object.matrixWorld));
      const length = Math.ceil(Math.max(Math.abs(a.x - bPoint.x), Math.abs(a.y - bPoint.y)));
      for (let j = 0; j <= length; j++) {
        const t = length ? j / length : 0;
        const x = Math.round(a.x + t * (bPoint.x - a.x));
        const y = Math.round(a.y + t * (bPoint.y - a.y));
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
        const index = y * this.width + x;
        if (through || a.z + t * (bPoint.z - a.z) <= this.depth[index] + .000055) this.composite(index, r, g, b, alpha);
      }
    }
  }

  render(scene, camera) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    eye.setFromMatrixColumn(camera.matrixWorld, 2);
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.clear();
    this.drawGrid();
    this.depth.fill(Infinity);
    this.pixels.fill(0);
    const translucent = [];
    const overlays = [];
    scene.traverseVisible(object => {
      if (object.isMesh && object.userData.entry) this.mesh(object, translucent);
      if (object.isLineSegments && object.renderOrder >= 3) overlays.push(object);
    });
    translucent.sort((a, b) => b.z - a.z);
    for (const {triangle, shade, texture} of translucent) this.triangle(...triangle, shade, texture, false);
    for (const line of overlays) this.line(line);
    this.bufferContext.putImageData(this.image, 0, 0);
    this.context.drawImage(this.bufferCanvas, 0, 0);
  }
}
