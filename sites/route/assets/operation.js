import { nodes, total, range } from "./model.js?v=1.4";

const mps = kmh => kmh / 3.6;
function mod(n, period) {
  const rest = n % period;
  return rest < 0 ? rest + period : rest;
}
const stops = nodes.filter(node => node.type === "station");
const portals = nodes.filter(node => node.type === "pier");

export const inputs = Object.freeze({
  version: "路線試算 V1.1",
  speeds: Object.freeze({ main: 40, portal: 30, station: 18 }),
  acceleration: 1,
  deceleration: 1,
  dwell: 30,
  turnaround: 60,
  tracking: 58,
  seats: 6,
  maxCars: 5,
  berthSpacing: 33.6,
  zoneReach: 12,
  lineCount: 2
});

const references = {
  paired: { cycle: 806, terminalGaps: [58, 345], intermediateGaps: [61, 342] },
  single: { cycle: 684.2 }
};

function speedZones(activeStops, min, max) {
  const special = [
    ...activeStops.map(stop => ({
      id: stop.id,
      label: stop.id + " 站區",
      from: stop === activeStops[0] ? min : stop.ch - inputs.zoneReach,
      to: stop === activeStops.at(-1) ? max : stop.ch + inputs.zoneReach,
      speed: inputs.speeds.station,
      kind: "station"
    })),
    ...portals.filter(p => p.ch > min && p.ch < max).map(p => ({
      id: p.id,
      label: p.id + " 門架",
      from: p.ch - inputs.zoneReach,
      to: p.ch + inputs.zoneReach,
      speed: inputs.speeds.portal,
      kind: "portal"
    }))
  ].sort((a,b) => a.from - b.from);
  const zones = [];
  let start = min;
  for (const zone of special) {
    if (zone.from > start) zones.push({ label: "主線", from: start, to: zone.from, speed: inputs.speeds.main, kind: "main" });
    zones.push(zone);
    start = zone.to;
  }
  return zones;
}

// Work from the exact zone boundaries. The forward and backward passes cap the
// reachable speed at each boundary, including the zero-speed stopping points.
function runningProfile(from, to, zones) {
  const direction = Math.sign(to.ch - from.ch);
  const low = Math.min(from.ch, to.ch), high = Math.max(from.ch, to.ch);
  const pieces = zones.filter(z => z.to > low && z.from < high).map(zone => {
    const a = Math.max(zone.from, low), b = Math.min(zone.to, high);
    return { zone, distance: b - a, ch: direction > 0 ? a : b, cap: mps(zone.speed) };
  });
  if (direction < 0) pieces.reverse();
  const edges = [0, ...pieces.slice(1).map((p,i) => Math.min(p.cap, pieces[i].cap)), 0];
  const { acceleration, deceleration } = inputs;
  for (const [i,p] of pieces.entries()) {
    edges[i+1] = Math.min(edges[i+1], Math.sqrt(edges[i] ** 2 + 2 * acceleration * p.distance));
  }
  for (let i = pieces.length - 1; i >= 0; i--) {
    edges[i] = Math.min(edges[i], Math.sqrt(edges[i+1] ** 2 + 2 * deceleration * pieces[i].distance));
  }

  const phases = [];
  let elapsed = 0;
  for (const [i,p] of pieces.entries()) {
    const initial = edges[i], final = edges[i+1];
    const peak = Math.min(p.cap, Math.sqrt((2*p.distance + initial**2/acceleration + final**2/deceleration)
      / (1/acceleration + 1/deceleration)));
    const rise = (peak**2 - initial**2) / (2*acceleration);
    const fall = (peak**2 - final**2) / (2*deceleration);
    const cruise = Math.max(0, p.distance - rise - fall);
    let ch = p.ch;
    for (const [length, velocity, acc, duration] of [
      [rise, initial, acceleration, (peak - initial) / acceleration],
      [cruise, peak, 0, cruise / peak],
      [fall, peak, -deceleration, (peak - final) / deceleration]
    ]) {
      if (duration <= 1e-9) continue;
      phases.push({ ch, length, velocity, acc, duration, start: elapsed, end: elapsed + duration, zone: p.zone });
      elapsed += duration;
      ch += direction * length;
    }
  }
  return { type: "run", from, to, direction, duration: elapsed, phases };
}

function passage(run, ch) {
  if (ch === run.from.ch) return 0;
  if (ch === run.to.ch) return run.duration;
  const phase = run.phases.find(p => Math.abs(ch - p.ch) <= p.length + 1e-7 && (ch - p.ch)*run.direction >= -1e-7);
  const distance = range(Math.abs(ch - phase.ch), 0, phase.length);
  if (distance === 0) return phase.start;
  const endVelocity = Math.sqrt(Math.max(0, phase.velocity**2 + 2*phase.acc*distance));
  return phase.start + 2*distance / (phase.velocity + endVelocity);
}

function trip(orderedStops, zones) {
  const events = [];
  let time = 0;
  for (let i = 1; i < orderedStops.length; i++) {
    const run = runningProfile(orderedStops[i-1], orderedStops[i], zones);
    events.push({ ...run, start: time, end: time + run.duration });
    time += run.duration;
    if (i < orderedStops.length - 1) {
      events.push({ type: "dwell", stop: run.to, direction: run.direction,
        duration: inputs.dwell, start: time, end: time + inputs.dwell });
      time += inputs.dwell;
    }
  }
  return { events, time };
}

// Use the route nodes and intermediate stops as the trial block boundaries.
// Check reference-position clearance explicitly rather than assuming the tracking
// gap by itself clears a span. The actual interlocking boundaries come from OCC.
function blockTimes(journey) {
  return journey.events.flatMap(event => {
    if (event.type === "dwell") return [{ enter: event.start, exit: event.end }];
    const low = Math.min(event.from.ch,event.to.ch), high = Math.max(event.from.ch,event.to.ch);
    const boundaries = portals.filter(p => p.ch > low && p.ch < high).map(p => p.ch);
    if (event.direction < 0) boundaries.reverse();
    const elapsed = [0, ...boundaries.map(ch => passage(event,ch)), event.duration];
    return elapsed.slice(1).map((end,i) => ({ enter: event.start + elapsed[i], exit: event.start + end }));
  });
}

function startGap(lead, rear) {
  const leadBlocks = blockTimes(lead), rearBlocks = blockTimes(rear);
  return Math.max(inputs.tracking, ...leadBlocks.map((block,i) => {
    const rearEntry = rearBlocks[i].enter;
    return Math.max(block.exit, block.enter + inputs.tracking) - rearEntry;
  }));
}

function shifted(journey, start) {
  return journey.events.map(e => ({ ...e, start: e.start + start, end: e.end + start }));
}

function turning(stop, direction, start, end) {
  return { type: "turn", stop, direction, start, end, duration: end - start };
}

function singleLine(outbound, inbound, first, last) {
  const backAt = outbound.time + inputs.turnaround;
  const endAt = backAt + inbound.time;
  const cycle = endAt + inputs.turnaround;
  return { cycle, gaps: null, diagrams: [[
    ...outbound.events, turning(last, 1, outbound.time, backAt),
    ...shifted(inbound, backAt), turning(first, -1, endAt, cycle)
  ]] };
}

function pairedLine(activeStops, first, last, farFirst, farLast, zones) {
  const intermediate = activeStops.slice(1,-1);
  const outLead = trip([first, ...intermediate, farLast], zones);
  const outRear = trip([farFirst, ...intermediate, last], zones);
  const inLead = trip([last, ...intermediate.slice().reverse(), farFirst], zones);
  const inRear = trip([farLast, ...intermediate.slice().reverse(), first], zones);
  const outwardGap = startGap(outLead, outRear);
  const returnGap = startGap(inLead, inRear);
  const outRearArrives = outwardGap + outRear.time;
  const inLeadStarts = Math.max(outRearArrives, outLead.time) + inputs.turnaround;
  const inRearStarts = inLeadStarts + returnGap;
  const inLeadArrives = inLeadStarts + inLead.time;
  const inRearArrives = inRearStarts + inRear.time;
  const cycle = Math.max(inRearArrives, inLeadArrives) + inputs.turnaround;
  return { cycle, gaps: [outwardGap, returnGap], diagrams: [
    [...outLead.events, turning(farLast, 1, outLead.time, inRearStarts),
      ...shifted(inRear, inRearStarts), turning(first, -1, inRearArrives, cycle)],
    [...shifted(outRear, outwardGap), turning(last, 1, outRearArrives, inLeadStarts),
      ...shifted(inLead, inLeadStarts), turning(farFirst, -1, inLeadArrives, cycle + outwardGap)]
  ] };
}

export function schedule(mode, cars) {
  const activeStops = stops;
  const effectiveMode = mode === "paired" ? "paired" : "single";
  const paired = effectiveMode === "paired";
  const first = activeStops[0], last = activeStops.at(-1);
  const farFirst = { ...first, ch: first.ch - inputs.berthSpacing, berth: "遠端車位" };
  const farLast = { ...last, ch: last.ch + inputs.berthSpacing, berth: "遠端車位" };
  const zones = speedZones(activeStops, paired ? farFirst.ch : first.ch, paired ? farLast.ch : last.ch);
  const lineSchedule = paired
    ? pairedLine(activeStops, first, last, farFirst, farLast, zones)
    : singleLine(trip(activeStops, zones), trip(activeStops.slice().reverse(), zones), first, last);
  const { cycle, diagrams, gaps } = lineSchedule;
  const offset = cycle / inputs.lineCount;
  const trains = ["A","B"].flatMap((line,i) => diagrams.map((events,j) => ({
    id: line + (j ? "2" : ""), label: line + (j + 1), line, events, shift: i * offset
  })));
  return {
    mode: effectiveMode, stops: activeStops, end: last.ch, zones, cycle, gaps, offset, trains, cars,
    seats: cars * inputs.seats,
    departuresPerCycle: trains.length,
    headway: cycle / trains.length,
    capacity: 3600 * trains.length * cars * inputs.seats / cycle,
    reference: references[effectiveMode]
  };
}

export function trainState(plan, time, id) {
  const train = plan.trains.find(t => t.id === id);
  const events = train.events;
  const localTime = mod(time - train.shift - events[0].start, plan.cycle) + events[0].start;
  const e = events.find(event => localTime + 1e-8 < event.end) ?? events.at(-1);
  const base = { id, label: train.label, line: train.line, cars: plan.cars, kind: e.type, direction: e.direction };
  if (e.type !== "run") {
    const wait = localTime - e.start;
    const status = e.type === "dwell" ? "乘降停站" : wait < inputs.turnaround ? "端站折返" : "待成對發車";
    return { ...base, ch: e.stop.ch, speed: 0, status, stop: e.stop.id, berth: e.stop.berth, next: e.stop.id };
  }
  const elapsed = localTime - e.start;
  const phase = e.phases.find(p => elapsed < p.end) ?? e.phases.at(-1);
  const dt = range(elapsed - phase.start, 0, phase.duration);
  const distance = (phase.velocity + phase.acc*dt/2) * dt;
  const status = phase.zone.kind === "portal" ? "門架限速" : phase.zone.kind === "station" ? "站區限速"
    : phase.acc > 0 ? "加速" : phase.acc < 0 ? "減速" : "行駛";
  return { ...base, ch: phase.ch + e.direction*distance, speed: (phase.velocity + phase.acc*dt)*3.6,
    limit: phase.zone.speed, status, stop: null, next: e.to.id };
}

export function timeAt(plan, ch, id) {
  const train = plan.trains.find(t => t.id === id);
  const target = range(ch, 0, plan.end);
  const run = train.events.find(e => e.type === "run" && e.direction === 1 && e.from.ch <= target && e.to.ch >= target);
  return mod(run.start + passage(run, target) + train.shift, plan.cycle);
}

export function timesAtStation(plan, station, direction, kind) {
  const key = kind === "arrivals" ? "to" : "from";
  const timeKey = kind === "arrivals" ? "end" : "start";
  const times = plan.trains.flatMap(train => train.events.filter(e =>
    e.type === "run" && e.direction === direction && e[key].id === station
  ).map(e => ({ label: train.label, id: train.id, time: mod(e[timeKey] + train.shift, plan.cycle) })));
  times.sort((a,b) => a.time - b.time);
  return times.map((item, i) => ({
    ...item, gap: i === times.length - 1 ? times[0].time + plan.cycle - item.time : times[i+1].time - item.time
  }));
}

export function eventTime(plan, train, event) {
  return mod(event.start + train.shift, plan.cycle);
}
