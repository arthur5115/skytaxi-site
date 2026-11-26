const layer = (key, name, details, elevation, ...groups) => ({ key, name, details, elevation, groups });

export const stations = {
  t1: {
    id: 'T1',
    name: '新化之門站',
    description: '光舟站房、階梯商店街與虎埤水鏡',
    direction: [0.69, 0.67, 1],
    cut: { x: -56, z: 2.3 },
    ground: -0.49,
    spacing: 4.5,
    terrain: '廣場及虎埤水鏡',
    hidden: ['piles'],
    layers: [
      layer('piles', '地下樁基', '錨碇核心與站房支承下方的樁基。', null, '地下樁基示意'),
      layer('plaza', '廣場與水鏡', '入口開放空間與站房下方的虎埤水鏡。', '32.50', '廣場及虎埤水鏡'),
      layer('anchors', '錨碇與支承', '光舟站房的錨碇核心與 V 形柱。', null, '錨碇核心與 V 形柱'),
      layer('shops', '階梯商店街', '兩側店舖以五階平台連接廣場和站層。', '32.50–50.75', '北階梯商店街', '南階梯商店街'),
      layer('platform', '月台與列車', '兩側月台、連接通廊、雙線弦線與列車。', '50.75', '兩側月台與通廊', '雙線弦線與五車列隊'),
      layer('shell', '木網殼與外皮', '光舟站房的木網殼及 ETFE 外皮。', null, '木網殼與 ETFE 外皮'),
      layer('skywalk', '屋頂天空步道', '光舟站房上方的觀景步道。', '59.40', '屋頂天空步道'),
    ],
  },
  t2: {
    id: 'T2',
    name: '湖濱旅館站',
    description: '湖景客房、到達庭與高架月台',
    direction: [0.72, 0.62, 1],
    cut: { x: 2, z: -13 },
    ground: 39.51,
    spacing: 2.8,
    terrain: ['site', 'tree'],
    hidden: ['B1'],
    layers: [
      layer('B1', 'B1 停車與機電', '停車場、機電室與垂直動線。', '36.80', 'B1'),
      layer('1F', '1F 大廳與到達庭', '公共站廳、旅館大廳及到達庭。', '40.00', '1F'),
      layer('2F', '2F 湖景餐廳', '客房、湖景餐廳與廚房。', '44.40', '2F'),
      layer('3F', '3F 湖景客房', '客房、公共翼與站旅銜接。', '47.85', '3F'),
      layer('4F', '4F 客房與公共翼', '湖景客房與文化公共翼。', '51.30', '4F'),
      layer('5F', '5F 客房與公共翼', '湖景客房與文化公共翼。', '54.75', '5F'),
      layer('6F', '6F 公共轉乘', '客房與公共轉乘層。', '58.20', '6F'),
      layer('RF-H', '旅館屋頂', '綠屋頂及光電預留空間。', '61.65', 'RF-H'),
      layer('R5', 'R5 纜車月台', '雙側式月台、列車與弦線介面。', '66.75', 'R5'),
      layer('RF-S', '站房摺板屋面', '纜車站摺板屋面。', '74.00', 'RF-S'),
    ],
  },
  t3: {
    id: 'T3',
    name: '湖濱山城站',
    description: '四座客房翼、湖景宴會廳與轉乘站廳',
    direction: [0.80, 0.82, 1],
    cut: { x: 216, z: -221 },
    ground: 3.96,
    spacing: 3.4,
    terrain: 'site_context',
    focus: ['guest_wings', 'site_context'],
    hidden: [],
    layers: [
      layer('B2', 'B2 湖景宴會廳', '湖景宴會廳、前廳與面湖平台。', '46.80'),
      layer('B1', 'B1 會議層', '會議室與其服務空間。', '50.40'),
      layer('1F', '1F 餐廳及宴會前廳', '全日餐廳、新娘房、貴賓室與宴會前廳。', '54.00'),
      layer('2F', '2F 大廳與前庭', '大廳、前庭、落客圓環、中餐廳與酒廊。', '57.60'),
      layer('3F', '3F 遊樂、SPA 與客房', 'XR 沉浸式樂園、SPA 及客房翼。', '61.20'),
      layer('4F', '4F 健身及挑空', '外弧側健身中心及月台下方挑空。', '64.80'),
      layer('PL', '雙線側式月台', '側式月台及雙線弦線車組。', '67.15', 'platform', 'rail', 'vehicle'),
      layer('5F', '5F 轉乘大廳', '轉乘大廳、候車廊與旅館同層銜接。', '68.40'),
      layer('6F', '6F 跨線連通', '跨線連通及雲端餐廳。', '72.00'),
      layer('RF', '站房摺板屋面', '摺板屋脊、天窗及維修走道。', '78.60', 'roof'),
    ],
    // The full T3 model contains continuous structural elements. Use the
    // design elevations in the model's vertical datum for floor sections.
    bands: {
      B2: [-Infinity, 10.40], B1: [10.40, 14], '1F': [14, 17.60],
      '2F': [17.60, 21.20], '3F': [21.20, 24.80], '4F': [24.80, 28.40],
      '5F': [28.40, 32], '6F': [32, 35.60], RF: [35.60, Infinity],
    },
  },
  t4: {
    id: 'T4',
    name: '新化林場站',
    description: '林場驛站、林冠展示與高架月台',
    direction: [0.62, 0.57, 1],
    cut: { x: 30, z: 2.1 },
    ground: -0.38,
    spacing: 4.3,
    terrain: 'site',
    hideTerrainInitially: true,
    hidden: ['foundations'],
    layers: [
      layer('foundations', '地下基礎', '站外轉向構架與錨碇下方的樁基。', '44.85', 'foundations'),
      layer('site', '林地與道路', '保留林地、車行道路及基地周邊。', null, 'site'),
      layer('structure', '錨碇與支承', '梯核、端部錨碇及跨路支承構架。', null, 'core', 'anchor', 'structure'),
      layer('ground', '地面驛站', '林場驛站的地面休憩與到達空間。', '46.85', 'ground'),
      layer('middle', '中間層', '中間層的木構空間及配置。', '52.00', 'middle', 'furnishing'),
      layer('canopy', '林冠展示層', '林冠展示及觀景平台。', '57.00', 'canopy'),
      layer('platform', '月台與列車', '高架月台、雙線弦線與列車。', '64.15', 'platform', 'track', 'vehicles', 'equipment'),
      layer('roof', '屋頂', '覆蓋高架站層的金屬屋面。', '69.00', 'roof'),
    ],
  },
};

export function sourceGroup(mesh, root, station) {
  for (let node = mesh; node && node !== root; node = node.parent) {
    if (station.id === 'T1' && node.parent?.parent === root) return node.userData.name;
    if (station.id === 'T2' && node.userData.level_id) return node.userData.level_id;
    if (station.id === 'T3' && node.userData.group) return node.userData.group;
    if (station.id === 'T4' && node.parent === root) return node.userData.name;
  }
  return '';
}

export function siteGeometry(mesh, group, station) {
  if (station.id === 'T2') {
    return mesh.userData.level_id === '1F' && station.terrain.includes(mesh.userData.drawing_layer);
  }
  return group === station.terrain;
}
