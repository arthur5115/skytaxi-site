import { stations } from './stations.js';

const floor = (key, short, name, el, sheet, details, band) => ({ key, short, name, el, sheet, details, band });

const t1 = [
  floor('ground', '地面', '地面層', '32.50', 'T1-A-07', '入口廣場、虎埤水鏡及階梯商店街起點。', [-.6, 4.5]),
  floor('el37', 'EL37.25', '商店街平台', '37.25', 'T1-A-08', '南北商店街平台與公共步行空間。', [4.5, 9]),
  floor('el41', 'EL41.75', '商店街平台', '41.75', 'T1-A-09', '南北商店街中段平台與垂直動線。', [9, 13.5]),
  floor('el46', 'EL46.25', '上層商店街', '46.25', 'T1-A-10', '近站層的商店街平台與通廊。', [13.5, 18]),
  floor('platform', '月台', '月台與出站層', '50.75', 'T1-A-11', '兩側月台、雙線軌道及通往階梯街的連接通廊。', [18, 23.5]),
  floor('skywalk', '屋頂', '屋頂及天空步道', '59.40', 'T1-A-13', '光舟木網殼、ETFE 外皮與屋頂天空步道。', [23.5, 80]),
];

function existingLayers(key, reference) {
  return stations[key].layers.filter(layer => reference[layer.key]).map(layer => {
    const short = (layer.key === 'PL' || layer.key === 'R5') ? (layer.key === 'R5' ? 'R5 月台' : '月台')
      : ({'RF-H':'旅館屋頂','RF-S':'站房屋頂',RF:'屋頂',ground:'地面',middle:'中間層',canopy:'林冠層',platform:'月台',roof:'屋頂'}[layer.key] ?? layer.key);
    const number = reference[layer.key];
    return floor(layer.key, short, layer.name.replace(/^(?:B[12]|[1-6]F|R5) /, ''), layer.elevation,
      `${key.toUpperCase()}-A-${String(number).padStart(2, '0')}`, layer.details);
  });
}

export const stationFloors = {
  t1,
  t2: existingLayers('t2', {B1:4,'1F':5,'2F':6,'3F':7,'4F':8,'5F':8,'6F':9,'RF-H':11,R5:10,'RF-S':11}),
  t3: existingLayers('t3', {B2:14,B1:15,'1F':16,'2F':8,'3F':17,'4F':17,PL:7,'5F':7,'6F':18,RF:19}),
  t4: existingLayers('t4', {ground:6,middle:7,canopy:8,platform:5,roof:11}),
};

export const preferredFloors = {t1:'platform', t2:'3F', t3:'3F', t4:'canopy'};

export const features = {
  stairs: ['樓梯／手扶梯', '#bc6d27'],
  lifts: ['電梯與梯井', '#9860a8'],
  doors: ['門扇', '#a37a34'],
  glazing: ['窗與玻璃', '#187b99'],
  furniture: ['家具', '#437c59'],
};

export function modelFeature(mesh, source) {
  if (/雙線弦線|^(vehicle|vehicles|rail|track)$/.test(source)) return '';
  const data = mesh.userData;
  const name = data.name || mesh.name;
  const layer = data.drawing_layer;
  if (/Seating|Furniture|Chair|桌椅/i.test(name) || source === 'furnishing' || layer === 'bed') return 'furniture';
  if (/Stair|Treads|梯段/i.test(name)) return 'stairs';
  if (/Lifts|Elevator/i.test(name)) return 'lifts';
  if (layer === 'door' || /(^|[-_])door/i.test(name)) return 'doors';
  if (layer === 'glass' || /[｜_]glass|window/i.test(name)) return 'glazing';
  return '';
}

export function shellElement(mesh, source) {
  const name = mesh.userData.name || mesh.name;
  const layer = mesh.userData.drawing_layer;
  return ['木網殼與 ETFE 外皮', 'roof', 'facade', 'RF-S'].includes(source)
    || ['wall','glass','roof','roof_alt'].includes(layer) || /Walls｜/.test(name);
}
