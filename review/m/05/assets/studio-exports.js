import { Vector3 } from 'three';

export function downloadFile(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], {type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function downloadImage(panels, title, subheading) {
  const output = document.createElement('canvas');
  const widths = panels.map(panel => panel.canvas.clientWidth);
  const width = widths.reduce((sum, value) => sum + value, 0);
  const ratio = Math.max(1, 1600 / width);
  const drawingHeight = Math.max(...panels.map(panel => panel.canvas.clientHeight));
  output.width = Math.round(width * ratio);
  output.height = Math.round(drawingHeight * ratio) + 102;
  const context = output.getContext('2d');
  context.fillStyle = '#f6f9f7';
  context.fillRect(0, 0, output.width, output.height);
  let x = 0;
  for (const [i, panel] of panels.entries()) {
    panel.render();
    const w = Math.round(widths[i] * ratio);
    context.fillStyle = panel.fill;
    context.fillRect(x, 102, w, output.height - 102);
    context.drawImage(panel.canvas, x, 102, w, Math.round(panel.canvas.clientHeight * ratio));
    x += w;
  }
  context.fillStyle = '#19352d';
  context.font = '700 28px "Noto Sans TC", sans-serif';
  context.fillText(title, 28, 43);
  context.fillStyle = '#476058';
  context.font = '17px "Noto Sans TC", sans-serif';
  context.fillText(subheading, 28, 74);
  const result = await new Promise(resolve => output.toBlob(resolve, 'image/png'));
  if (!result) throw new Error('Image export failed');
  downloadFile(result, title + '.png', 'image/png');
}

const toFixed = v => String(Number(v.toFixed(5)) || 0);
const vertex = new Vector3();

function meshParts(root) {
  const parts = [];
  root.updateMatrixWorld(true);
  root.traverse(mesh => {
    if (!mesh.isMesh || !mesh.geometry.attributes.position) return;
    const { geometry } = mesh;
    const { position } = geometry.attributes;
    const index = geometry.index;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const ranges = geometry.groups.length ? geometry.groups
      : [{ start: 0, count: index?.count ?? position.count, materialIndex: 0 }];
    for (const {start, count, materialIndex} of ranges) {
      if (count < 3) continue;
      const points = [];
      const indices = [];
      const lookup = new Map();
      for (let i = start; i + 2 < start + count; i += 3) {
        for (let j = 0; j < 3; j++) {
          const id = index ? index.getX(i + j) : i + j;
          if (!lookup.has(id)) {
            lookup.set(id, points.length);
            vertex.fromBufferAttribute(position, id).applyMatrix4(mesh.matrixWorld);
            points.push([toFixed(vertex.x),toFixed(vertex.y),toFixed(vertex.z)]);
          }
          indices.push(lookup.get(id));
        }
      }
      parts.push({points, indices, material:materials[materialIndex] || materials[0]});
    }
  });
  if (!parts.length) throw new Error('No model faces to export');
  return parts;
}

export function makeObj(root, station) {
  const result = [`# Hutoupi ${station} station model; units: metres, Y up\n`];
  let offset = 1;
  for (const [i, chunk] of meshParts(root).entries()) {
    result.push(`o ${station}_mesh_${i + 1}\n`);
    result.push(chunk.points.map(point => `v ${point.join(' ')}\n`).join(''));
    const faces = [];
    for (let f = 0; f < chunk.indices.length; f += 3) {
      const [a,b,c] = chunk.indices.slice(f,f+3);
      faces.push(`f ${a + offset} ${b + offset} ${c + offset}\n`);
    }
    result.push(faces.join(''));
    offset += chunk.points.length;
  }
  return result.join('');
}

function makeUsda(root, station) {
  const chunks = meshParts(root);
  const materials = Array.from(new Set(chunks.map(chunk => chunk.material)));
  const materialIds = new Map(materials.map((material, i) => [material, i]));
  const result = [`#usda 1.0
(
    defaultPrim = "${station}"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "${station}" {
    def Scope "Materials" {
`];
  for (const [i, material] of materials.entries()) {
    const rgb = material.color?.toArray().map(toFixed).join(', ') || '0.7, 0.7, 0.7';
    const opacity = material.transparent ? material.opacity : 1;
    result.push(`        def Material "m${i}" {
            token outputs:surface.connect = </${station}/Materials/m${i}/Shader.outputs:surface>
            def Shader "Shader" {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${rgb})
                float inputs:opacity = ${toFixed(opacity)}
                float inputs:roughness = ${toFixed(material.roughness ?? .75)}
                float inputs:metallic = ${toFixed(material.metalness ?? 0)}
                token outputs:surface
            }
        }
`);
  }
  result.push('    }\n');
  for (const [i, part] of chunks.entries()) {
    result.push(`    def Mesh "mesh_${i + 1}" (
        prepend apiSchemas = ["MaterialBindingAPI"]
    ) {
        uniform token subdivisionScheme = "none"
        uniform bool doubleSided = 1
        point3f[] points = [${part.points.map(p => '(' + p.join(',') + ')').join(',')}]
        int[] faceVertexCounts = [${'3,'.repeat(part.indices.length / 3).slice(0,-1)}]
        int[] faceVertexIndices = [${part.indices.join(',')}]
        rel material:binding = </${station}/Materials/m${materialIds.get(part.material)}>
    }
`);
  }
  result.push('}\n');
  return result.join('');
}

function crc32(bytes) {
  const table = Uint32Array.from({length:256}, (_, i) => {
    for (let bit = 0; bit < 8; bit++) i = (i >>> 1) ^ ((i & 1) ? 0xedb88320 : 0);
    return i;
  });
  let sum = 0xffffffff;
  for (const byte of bytes) sum = (sum >>> 8) ^ table[(sum ^ byte) & 0xff];
  return (sum ^ 0xffffffff) >>> 0;
}

export function makeUsdz(root, station) {
  // A USDZ archive uses ZIP stored entries with 64-byte-aligned payloads.
  const encode = new TextEncoder();
  const filename = encode.encode(station + '.usda');
  const data = encode.encode(makeUsda(root, station));
  const checksum = crc32(data);
  const header = 30;
  const dataOffset = Math.ceil((header + filename.length + 4) / 64) * 64;
  const directory = dataOffset + data.length;
  const directoryLength = 46 + filename.length;
  const end = directory + directoryLength;
  const bytes = new Uint8Array(end + 22);
  const view = new DataView(bytes.buffer);
  const u16 = (offset, value) => view.setUint16(offset, value, true);
  const u32 = (offset, value) => view.setUint32(offset, value, true);
  const extra = dataOffset - header - filename.length;
  u32(0, 0x04034b50); u16(4, 20); u16(12, 33);
  u32(14, checksum); u32(18, data.length); u32(22, data.length);
  u16(26, filename.length); u16(28, extra);
  bytes.set(filename, header);
  u16(header + filename.length, 0x1986);
  u16(header + filename.length + 2, extra - 4);
  bytes.set(data, dataOffset);
  u32(directory, 0x02014b50); u16(directory + 4, 20); u16(directory + 6, 20);
  u16(directory + 14, 33); u32(directory + 16, checksum);
  u32(directory + 20, data.length); u32(directory + 24, data.length);
  u16(directory + 28, filename.length);
  bytes.set(filename, directory + 46);
  u32(end, 0x06054b50); u16(end + 8, 1); u16(end + 10, 1);
  u32(end + 12, directoryLength); u32(end + 16, directory);
  return bytes;
}
