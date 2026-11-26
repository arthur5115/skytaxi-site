export const componentCategories = {
  structure: '結構',
  transport: '乘車設備',
  openings: '樓梯門窗',
  space: '空間設施',
};

const names = {
  structure: {
    piling: '地下樁基與樁帽', anchorage: '錨碇核心', eastAnchor: '東端錨碇',
    westAnchor: '西端錨碇', supports: '支承構架', vColumns: 'V 形支承柱',
    seats: '柱座與鋼柱底座', shell: '木網殼與邊梁', etfe: 'ETFE 外皮',
    slab: '樓板與混凝土構造', walls: '牆體', core: '垂直動線核心',
    facade: '立面框架', roof: '站房屋面', roofEnergy: '屋頂光電預留',
  },
  transport: {
    railway: '雙線弦線與走行面', platform: '月台與候車帶', cars: 'Unicar 車組',
    runningGear: '車頂行走裝置', platformDoors: '月台門與乘降設備',
    railEquipment: '弦線端部與設備', crossing: '月台連接通廊',
  },
  openings: {
    stairs: '樓梯梯段與平台', lifts: '電梯井', doors: '門扇', glazing: '窗與玻璃',
  },
  space: {
    plaza: '入口廣場', water: '虎埤水鏡', northShops: '北側階梯商店街',
    southShops: '南側階梯商店街', skywalk: '屋頂天空步道',
    furniture: '站內家具', beds: '客房床組', site: '基地景觀與道路',
    parking: '地下停車場', mech: '機電空間', hotel: '旅館公共與客房空間',
    guestWings: '客房翼', hall: '站廳與公共空間', rooms: '湖景客房',
    terrace: '露臺與外廊', gardens: '屋頂與露臺植栽', wet: '客房衛浴',
    forestEntry: '地面林場驛站', forestMiddle: '中間層木構空間', canopy: '林冠展示與觀景平台',
  },
};

const t2Layers = {
  core: 'core', mech: 'mech', parking: 'parking', slab: 'slab', stop: 'railEquipment',
  wall: 'walls', concrete: 'slab', glass: 'glazing', hotel: 'hotel', public: 'hall',
  site: 'site', tree: 'site', garden: 'gardens', suite: 'rooms', terrace: 'terrace',
  walk: 'terrace', wood: 'terrace', bed: 'beds', door: 'doors', wet: 'wet', pv: 'roofEnergy',
  body: 'cars', platform: 'platform', rail: 'railway', rail_top: 'railway',
  vehicle_blue: 'cars', window: 'cars', roof: 'roof', roof_alt: 'roof',
};

const t3Groups = {
  guest_wings: 'guestWings', station_hall: 'hall', west_anchor: 'westAnchor',
  east_anchor: 'eastAnchor', platform: 'platform', rail: 'railway', vehicle: 'cars',
  facade: 'facade', site_context: 'site', roof: 'roof',
};

const t4Groups = {
  site: 'site', ground: 'forestEntry', middle: 'forestMiddle', canopy: 'canopy',
  core: 'core', anchor: 'anchorage', foundations: 'piling', structure: 'supports',
  platform: 'platform', track: 'railway', vehicles: 'cars', equipment: 'platformDoors',
  furnishing: 'furniture', roof: 'roof',
};

const t1Groups = {
  '北階梯商店街': 'northShops', '南階梯商店街': 'southShops',
  '屋頂天空步道': 'skywalk', '地下樁基示意': 'piling',
};

const metadata = new Map(Object.entries(names).flatMap(([category, parts]) =>
  Object.entries(parts).map(([id, name]) => [id, {id, name, category}])));

export const elevationDatum = {T1: 32.5, T2: 0, T3: 40, T4: 46.85};

function gatePart(name, group, feature) {
  switch (group) {
    case '廣場及虎埤水鏡':
      if (name.startsWith('water')) return 'water';
      return name === 'plaza' ? 'plaza' : 'seats';
    case '錨碇核心與 V 形柱':
      return name.startsWith('v-columns') ? 'vColumns' : 'anchorage';
    case '木網殼與 ETFE 外皮':
      return name.startsWith('etfe') ? 'etfe' : 'shell';
    case '雙線弦線與五車列隊':
      if (name.startsWith('車頂行走裝置')) return 'runningGear';
      return /^[AB]\d /.test(name) ? 'cars' : 'railway';
    case '兩側月台與通廊':
      if (/月台門|^ExitGates/.test(name)) return 'platformDoors';
      if (/^EscapeLanding|^EscapePosts|^StairGuard/.test(name)) return 'stairs';
      if (feature) return feature;
      if (/^RailAnchor|^RailBuffer|^EastSupport|西端轉向台/.test(name)) return 'railEquipment';
      if (/bridge|^ServiceWay/i.test(name)) return 'crossing';
      if (name.startsWith('Walls')) return 'walls';
      return 'platform';
    default:
      return t1Groups[group];
  }
}

export function componentFor(mesh, source, station, feature) {
  const name = mesh.userData.name || mesh.name;
  const material = mesh.material.name;
  let id;
  switch (station.id) {
    case 'T1':
      id = gatePart(name, source, feature);
      break;
    case 'T2':
      id = t2Layers[mesh.userData.drawing_layer];
      break;
    case 'T3':
      id = source === 'facade' && material === 'GW3' ? 'glazing' : t3Groups[source];
      break;
    case 'T4':
      id = material === '低反射玻璃' ? 'glazing'
        : source === 'equipment' && material === '液壓止衝器' ? 'railEquipment' : t4Groups[source];
      break;
  }
  return metadata.get(id)
    ?? {id: 'other', name: '其他模型構件', category: 'space'};
}

export function assembleComponents(entries) {
  const components = new Map();
  for (const entry of entries) {
    const {id} = entry.component;
    if (!components.has(id)) components.set(id, {...entry.component, bounds: entry.bounds.clone()});
    else components.get(id).bounds.union(entry.bounds);
  }
  return new Map([...metadata.keys(), 'other'].filter(id => components.has(id)).map(id => [id, components.get(id)]));
}
