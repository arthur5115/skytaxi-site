import { text as tr } from "./site-language.js?v=1.4";
import { chainage, decimal } from "./model.js?v=1.4";
import { eventTime, inputs, timesAtStation } from "./operation.js?v=1.5";

const byId = id => document.getElementById(id);
const view = Object.fromEntries([
  "op-version", "calc-metrics", "calc-formula", "pattern-stop", "pattern-dir", "patterns", "event-train",
  "event-detail", "run-breakdown", "calc-inputs", "reference-detail", "calc-reference"
].map(id => [id, byId(id)]));

const seconds = n => decimal(n) + tr(" 秒"," s");
const zoneLabel = zone => tr(zone.label, zone.kind === "main" ? "Main line"
  : zone.id + (zone.kind === "portal" ? " portal" : " station zone"));

export function clockTime(n) {
  const ticks = Math.round(n * 10);
  const mm = String(Math.floor(ticks / 600)).padStart(2,"0");
  const ss = String(Math.floor(ticks / 10) % 60).padStart(2,"0");
  return mm + ":" + ss + "." + (ticks % 10);
}


function table(headers, rows) {
  return '<table class="op-table"><thead><tr>' + headers.map(v => '<th scope="col">' + v + "</th>").join("")
    + "</tr></thead><tbody>" + rows.map(row => '<tr><th scope="row">' + row[0] + "</th>"
      + row.slice(1).map(v => "<td>" + v + "</td>").join("") + "</tr>").join("") + "</tbody></table>";
}

function options(select, items, selected = select.value) {
  select.replaceChildren(...items.map(([value,label]) => new Option(label,value)));
  if (items.some(([value]) => String(value) === selected)) select.value = selected;
}

function jumpButton(time, label, train, className = "time-mark", note = "") {
  const name = tr("定位 ","Locate ") + train.label + " " + clockTime(time) + note;
  return '<button type="button" class="' + className + '" data-jump="' + time + '" data-jump-train="'
    + train.id + '" aria-label="' + name + '">' + label + "</button>";
}

export function renderStation(plan) {
  const stop = view["pattern-stop"].value;
  const direction = Number(view["pattern-dir"].value);
  view.patterns.innerHTML = [
    ["departures",tr("出發","Departures")],["arrivals",tr("到站","Arrivals")]
  ].flatMap(([kind,label]) => {
    const rows = timesAtStation(plan,stop,direction,kind);
    if (!rows.length) return [];
    const items = rows.map(r => jumpButton(r.time, '<strong>' + r.label + '</strong> <time>' + clockTime(r.time)
      + '</time><small>' + tr("隔 ","Next in ") + seconds(r.gap) + '</small>',
      r,"pattern-item",tr("，隔 ",", next in ") + seconds(r.gap)));
    return ['<div class="pattern-box"><h4>' + label + ' <small>' + tr("循環時點與下一列間隔","Cycle time and gap to next train")
      + '</small></h4><div class="pattern-items">' + items.join("") + "</div></div>"];
  }).join("");
  if (!view.patterns.innerHTML) view.patterns.innerHTML = '<p class="calc-help">'
    + tr("端站折返後，列車由另一方向出發。","At a terminal, trains reverse and depart in the opposite direction.") + "</p>";
}

export function renderEvents(plan, keepRun = false) {
  const train = plan.trains.find(t => t.id === view["event-train"].value) ?? plan.trains[0];
  const rows = train.events.map((e,i) => {
    const time = eventTime(plan,train,e);
    if (e.type === "run") {
      const limits = [...new Set(e.phases.map(p => p.zone.speed))].sort((a,b) => b-a);
      const distance = Math.abs(e.to.ch - e.from.ch);
      return [
        e.from.id + " → " + e.to.id,
        jumpButton(time,clockTime(time),train),
        seconds(e.duration),
        decimal(distance) + " m · " + limits.join(tr("／"," / ")) + ' km/h <button class="time-mark" type="button" data-run="'
          + i + '">' + tr("分段","By zone") + '</button>'
      ];
    }
    const extra = e.duration - inputs.turnaround;
    return [
      e.stop.id + (e.type === "turn" ? tr(" 折返"," turnaround") : tr(" 停站"," dwell")),
      jumpButton(time,clockTime(time),train),
      seconds(e.duration),
      e.type === "dwell" ? tr("固定停站","Fixed dwell")
        : (tr("基本折返 ","Base turnaround ") + seconds(inputs.turnaround)
          + (extra > 0.05 ? tr(" ＋ 成對等候 "," + paired departure wait ") + seconds(extra) : ""))
    ];
  });
  view["event-detail"].innerHTML = table(
    [tr("運行事件","Event"),tr("起始時點","Start"),tr("歷時","Duration"),tr("里程／時間構成","Distance / time components")],rows);
  const breakdown = view["run-breakdown"];
  if (keepRun && breakdown.dataset.index !== undefined) {
    renderRun(plan,Number(breakdown.dataset.index),false);
  } else {
    breakdown.replaceChildren();
    delete breakdown.dataset.index;
  }
}

export function renderRun(plan, index, scroll = true) {
  const train = plan.trains.find(t => t.id === view["event-train"].value) ?? plan.trains[0];
  const e = train.events[index];
  if (e?.type !== "run") return;
  const groups = [];
  for (const phase of e.phases) {
    const current = groups.at(-1);
    const end = phase.ch + e.direction*phase.length;
    if (current?.zone === phase.zone) {
      current.to = end;
      current.end = phase.end;
    } else groups.push({ zone: phase.zone, from: phase.ch, to: end,
      start: phase.start, end: phase.end });
  }
  const rows = groups.map(p => [
    zoneLabel(p.zone),
    chainage(p.from) + " → " + chainage(p.to),
    p.zone.speed + " km/h",
    seconds(p.end - p.start)
  ]);
  const heading = train.label + " · " + e.from.id + " → " + e.to.id + tr(" · 合計 "," · Total ") + seconds(e.duration);
  const breakdown = view["run-breakdown"];
  breakdown.dataset.index = String(index);
  breakdown.innerHTML = '<p class="calc-help"><strong>' + heading + '</strong></p><div class="op-table-wrap">'
    + table([tr("區段","Zone"),tr("通過里程","Chainage"),tr("速度上限","Speed limit"),tr("歷時","Duration")],rows) + "</div>";
  if (scroll) breakdown.scrollIntoView({block:"nearest"});
}

function renderParameters(plan) {
  const paired = plan.mode === "paired";
  const slash = tr("／"," / ");
  const values = [
    [tr("主線／門架／站區上限","Main line / portal / station limits"),Object.values(inputs.speeds).join(slash) + " km/h"],
    [tr("加速／減速","Acceleration / braking magnitude"),decimal(inputs.acceleration) + slash + decimal(inputs.deceleration) + " m/s²"],
    [tr("中途站停站／基本折返","Intermediate dwell / base turnaround"),inputs.dwell + slash + seconds(inputs.turnaround)],
    [tr("同線追蹤下限","Minimum same-line following interval"),seconds(inputs.tracking)],
    [tr("端站車位間距","Terminal berth spacing"),decimal(inputs.berthSpacing) + " m"],
    [tr("普通座位配置","Standard seating"),inputs.seats + tr(" 座／車"," seats per car")],
    [tr("雙線錯開","Offset between lines"),seconds(plan.offset)]
  ];
  if (paired) values.push([tr("同線去程／返程發車間隔","Same-line outward / return departure gap"),
    plan.gaps.map(g => decimal(g)).join(slash) + tr(" 秒"," s")]);

  const zones = plan.zones.map(z => [zoneLabel(z),chainage(z.from) + " – " + chainage(z.to),z.speed + " km/h"]);
  const reach = inputs.zoneReach;
  const spacing = decimal(inputs.berthSpacing);
  const format = '<p class="calc-help">' + tr(
    "限速區以站點或門架為中心各延伸 " + reach + " m。端站站區延及所用車位，近端停車點暫以路線站點為準"
      + (paired ? "，遠端向外移 " + spacing + " m" : "") + "。站區全段套用 18 km/h。各區起訖與實際停車標仍須套合行車圖。",
    "The model assumes speed zones extend " + reach + " m on either side of a station or portal. Terminal zones extend to the modelled berths. The near berth uses the route point"
      + (paired ? " and the far berth is " + spacing + " m beyond it" : "")
      + ". A limit of 18 km/h applies throughout station zones. Zone boundaries and stopping points still need to be matched to the operations drawing."
  ) + '</p>';
  const method = tr(
    "按限速區界分段，從停車點以定加減速推算可達速度，逐段累計加速、等速及減速時間。成對等待依端站車位順序計入。跨距清空以車輛參考點檢核。",
    "Each speed zone is modelled using constant acceleration and braking from the stopping points. Running time sums acceleration, cruising and braking in each zone. The terminal berth sequence determines the paired departure wait. Span clearance uses a train reference point."
  );
  view["calc-inputs"].innerHTML = '<div class="op-table-wrap">'
    + table([tr("參數","Input"),tr("採用值","Model value")],values) + "</div>" + format
    + '<div class="op-table-wrap">'
    + table([tr("限速區段","Speed zone"),tr("試算起訖","Modelled extent"),tr("上限","Limit")],zones) + "</div>"
    + '<p class="calc-help">' + method + "</p>";
}

function renderReference(plan) {
  const ref = plan.reference;
  view["reference-detail"].hidden = !ref;
  if (!ref) return;
  const refHeadway = ref.cycle / plan.departuresPerCycle;
  const refCapacity = 3600 * plan.departuresPerCycle * plan.seats / ref.cycle;
  const terminals = timesAtStation(plan,plan.stops.at(-1).id,1,"arrivals");
  const middle = timesAtStation(plan,plan.stops[1].id,1,"arrivals");
  const gaps = entries => [...new Set(entries.map(e => decimal(e.gap)))].join(tr("／"," / ")) + tr(" 秒"," s");
  const referenceGaps = numbers => gaps(numbers.map(gap => ({gap})));
  const rows = [
    [tr("共同循環","Common cycle"),seconds(plan.cycle),seconds(ref.cycle)],
    [tr("雙線平均班距","Average headway across both lines"),seconds(plan.headway),seconds(refHeadway)],
    [tr("單方向席位／小時","Seats per hour per direction"),decimal(plan.capacity),decimal(refCapacity)]
  ];
  if (ref.terminalGaps) rows.push(
    [tr("端站到車間隔（去程）","Terminal arrival gaps (outbound)"),gaps(terminals),referenceGaps(ref.terminalGaps)],
    [tr("T2 到車間隔（去程）","T2 arrival gaps (outbound)"),gaps(middle),referenceGaps(ref.intermediateGaps)]
  );
  view["calc-reference"].innerHTML = '<div class="op-table-wrap">'
    + table([tr("項目","Metric"),tr("本頁試算","Interactive model"),tr("規劃基準","Planning baseline")],rows) + '</div><p class="calc-help">'
    + tr("平均班距及席位依目前編組換算。本頁試算採上列限速區界、停車點及成對等待條件。",
      "Average headway and capacity use the selected consist. The interactive model uses the speed zones, stopping points and paired departure waits above.")
    + "</p>";
}

export function renderOperation(plan, keepRun = false) {
  const mode = plan.mode === "paired" ? tr("每線兩列","Two trains per line") : tr("每線一列","One train per line");
  view["op-version"].textContent = tr("方案 B","Option B") + " · " + mode + " · " + tr(inputs.version,"Route model V1.1");
  const longest = Math.max(...timesAtStation(plan,plan.stops[0].id,1,"departures").map(t => t.gap));
  const kpis = [
    [tr("共同循環","Common cycle"),seconds(plan.cycle),tr("同線同列從出發到下次同向出發","Time between a train’s same-direction departures")],
    [tr("雙線平均班距（試算）","Average headway across both lines (simulated)"),seconds(plan.headway),tr("T1 最長發車間隔 ","Longest T1 departure gap ") + seconds(longest)],
    [tr("單方向理論運能（試算）","Theoretical capacity per direction (simulated)"),decimal(plan.capacity) + tr(" 席／小時"," seats/h"),
      plan.seats + tr(" 席／列 · "," seats/train · ") + plan.departuresPerCycle + tr(" 班／循環"," departures/cycle")]
  ];
  view["calc-metrics"].innerHTML = kpis.map(([name,value,note]) => "<div><dt>" + name + "</dt><dd><strong>"
    + value + "</strong><small>" + note + "</small></dd></div>").join("");
  const cycle = decimal(plan.cycle);
  view["calc-formula"].textContent = tr("班距 ","Headway ") + cycle + " ÷ " + plan.departuresPerCycle
    + tr("。運能 ",". Capacity ") + "3,600 × " + plan.departuresPerCycle + " × " + plan.seats + " ÷ " + cycle
    + tr("。按未進位循環秒數計算。",". Calculated using the unrounded cycle time.");
  options(view["pattern-stop"],plan.stops.map(stop => [stop.id,stop.id + " " + tr(stop.name,stop.nameEn)]));
  options(view["pattern-dir"],[[1,tr("往 ","To ") + plan.stops.at(-1).id],[-1,tr("往 T1","To T1")]]);
  options(view["event-train"],plan.trains.map(train => [train.id,train.label]));
  renderStation(plan);
  renderEvents(plan,keepRun);
  renderParameters(plan);
  renderReference(plan);
}
