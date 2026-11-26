export const range = (n, from, to) => Math.max(from, Math.min(to, n));
export const lerp = (from, to, t) => from + (to - from) * t;
const numberFormats = [0,1,2].map(digits => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: digits, maximumFractionDigits: digits
}));
export const decimal = (n, digits = 1) => numberFormats[digits].format(n);
export const chainage = n => "CH" + decimal(n);

export const nodes = [
  { id: "T1", name: "新化之門站", nameEn: "Xinhua Gate", ch: 0, ground: 32.5, rail: 52.60, type: "station" },
  { id: "P1", name: "丘 2 門架", nameEn: "Hill 2 portal", ch: 446, ground: 44.02, rail: 65.528, height: 27.1, type: "pier" },
  { id: "T2", name: "湖濱旅館站", nameEn: "Lakeside Hotel", ch: 796, ground: 40, rail: 68.60, type: "station" },
  { id: "T3", name: "湖濱山城站", nameEn: "Lakeside Hill", ch: 1095.2, ground: 43, rail: 69, type: "station" },
  { id: "P2", name: "丘 4 門架", nameEn: "Hill 4 portal", ch: 1424.6, ground: 69.9, rail: 86.2, height: 21, type: "pier" },
  { id: "T4", name: "新化林場站", nameEn: "Xinhua Forest", ch: 1874.6, ground: 46.85, rail: 66, type: "station" }
];

export const spans = [
  { length: 446, pack: 1, title: "虎頭埤主要跨湖段", titleEn: "Main Hutoupi lake crossing", summary: "T1 出站後跨越湖面，至丘 2 的 P1 門架。水域內無支柱。", summaryEn: "From T1 the line crosses the lake to the P1 portal on Hill 2. All supports stand on land." },
  { length: 350, pack: 1, title: "P1 至湖濱旅館站", titleEn: "P1 to Lakeside Hotel", summary: "由 P1 延伸至 T2，中途通過北岸段及旅館西側湖灣。", summaryEn: "The line runs from P1 to T2 along the north shore and across the cove west of the hotel." },
  { length: 299.2, pack: 1, title: "湖濱旅館至湖濱山城", titleEn: "Lakeside Hotel to Lakeside Hill", summary: "T2 出站後通過丘 3，進入 T3 湖濱山城站。", summaryEn: "The line crosses Hill 3 between T2 and T3 Lakeside Hill." },
  { length: 329.4, pack: 2, title: "山城站至丘 4 門架", titleEn: "Lakeside Hill to Hill 4 portal", summary: "T3 出站後線形延伸至 P2，銜接新化林場方向。", summaryEn: "The line leaves T3 for P2 and continues towards Xinhua Forest." },
  { length: 450, pack: 2, title: "P2 至新化林場站", titleEn: "P2 to Xinhua Forest", summary: "由丘 4 門架往新化林場站延伸，列車於 T4 端折返。", summaryEn: "The line runs from the Hill 4 portal to Xinhua Forest, where trains turn back at T4." }
].map((span, i) => ({ ...span, number: i + 1, start: nodes[i], end: nodes[i + 1] }));

export const total = nodes.at(-1).ch;
export const firstSpan = spans[0];
export const water = [
  { start: 78, end: 342, label: "虎頭埤湖面", labelEn: "Hutoupi Lake" },
  { start: 498, end: 589, label: "北岸水域", labelEn: "North-shore water crossing" },
  { start: 692, end: 724, label: "T2 西側湖灣", labelEn: "Cove west of T2" }
];
export const clearancePoints = [
  { ch: 360, ground: 47.12, rail: 58.29, name: "丘 2 西坡", nameEn: "Hill 2 west slope", margin: "1.17 m" },
  { ch: 912, ground: 54.44, name: "丘 3 頂", nameEn: "Hill 3 crest", margin: "約 0.6 m", marginEn: "approx. 0.6 m" },
  { ch: 1468, ground: 65.60, name: "丘 4 東坡", nameEn: "Hill 4 east slope", margin: "不小於 0.46 m", marginEn: "at least 0.46 m" }
];
export const groundPoints = [
  ...nodes.map(n => ({ ch: n.id === "P2" ? 1424.7 : n.ch, ground: n.ground, name: n.id })),
  ...clearancePoints
].sort((a, b) => a.ch - b.ch);

export const parts = [
  { id: "rails", name: "A／B 弦軌", nameEn: "A/B string rails", color: "#a8d9d4", description: "A、B 各有 L／R 兩條弦軌。單線兩軌中心距 280 mm。", descriptionEn: "Both lines have a left and right string rail, 280 mm apart on centres." },
  { id: "portal", name: "箱柱與頂梁", nameEn: "Box columns and crossbeam", color: "#9bbcca", description: "P1、P2 採門架式中間支承。P1 文件門架高 27.1 m。", descriptionEn: "P1 and P2 use intermediate portal supports. P1 has a documented portal height of 27.1 m." },
  { id: "saddle", name: "吊架與承托", nameEn: "Hangers and saddles", color: "#d4b183", description: "門架頂梁下，吊架與弧形承托座銜接弦軌。近景可查看兩線配置。", descriptionEn: "Hangers and curved saddles connect the string rails beneath the portal crossbeam. Use the close-up to inspect both lines." },
  { id: "foundation", name: "門架基礎", nameEn: "Portal foundations", color: "#c4a686", description: "P1、P2 基礎位於陸域。基礎外形為配置示意。", descriptionEn: "The P1 and P2 foundations are on land. Their geometry illustrates the layout." },
  { id: "anchor", name: "站端錨碇", nameEn: "Station-end anchorage", color: "#e7a578", description: "T1 獨立錨碇在站體西端，工程圖示採扶壁式構架。", descriptionEn: "The independent T1 anchorage is at the west end. The engineering diagram shows a buttressed structure." },
  { id: "station", name: "站體與月台", nameEn: "Station and platform", color: "#b9d0ab", description: "簡化站體標出停靠節點與軌道銜接。完整建築構件可回四站拆解。", descriptionEn: "The simplified stations show train stopping points and track connections. Open Four-station 3D for the building assemblies." },
  { id: "train", name: "列車編組", nameEn: "Train consist", color: "#e3ecee", description: "Unicar-T 車體在弦軌下，走行輪與上方軌頭接觸。車體長 4.7 m、寬 1.65 m。", descriptionEn: "The Unicar-T carbody sits below the string rails and the running wheels contact the railheads above. The body measures 4.7 m by 1.65 m." },
  { id: "terrain", name: "地表與水域", nameEn: "Terrain and water", color: "#6c9a86", description: "藍色表示跨水區域，地貌依地面控制點示意。", descriptionEn: "Blue indicates water crossings. The terrain is schematic and interpolated from ground control points." }
];

export const trainGeometry = { pitch: 5.68, length: 4.7, width: 1.65, under: 1.982, cover: 0.458 };
export const lineColor = { A: "#8fd6ff", B: "#f5c18b" };
export const lineZ = { A: 2.5, B: -2.5 };
export const railSpacing = 0.28;
export const waterReference = 37.4;

export function spanAt(ch) {
  return spans.find(span => ch < span.end.ch) ?? spans.at(-1);
}

export function waterAt(ch) {
  return water.find(band => ch >= band.start && ch <= band.end);
}

const dips = [0, 3.8, 4.1, 7.5, 15.1];
const westControlFraction = clearancePoints[0].ch / firstSpan.length;
dips[0] = (lerp(firstSpan.start.rail, firstSpan.end.rail, westControlFraction) - clearancePoints[0].rail)
  / (4 * westControlFraction * (1 - westControlFraction));

export function railElevation(ch) {
  const span = spanAt(ch);
  const t = range((ch - span.start.ch) / span.length, 0, 1);
  return lerp(span.start.rail, span.end.rail, t) - dips[span.number - 1] * 4 * t * (1 - t);
}

export function groundElevation(ch) {
  const right = groundPoints.findIndex(point => point.ch >= ch);
  if (right < 0) return groundPoints.at(-1).ground;
  if (right === 0) return groundPoints[0].ground;
  const a = groundPoints[right - 1], b = groundPoints[right];
  return lerp(a.ground, b.ground, (ch - a.ch) / (b.ch - a.ch));
}
