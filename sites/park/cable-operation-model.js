export function createOperationCycle(distances, speed, dwell, turnaround, start) {
  const stations = [0];
  for (const distance of distances) {
    stations.push(stations.at(-1) + distance);
  }
  const last = stations.length - 1;
  const opposite = start === 0 ? last : 0;
  const phases = [];
  const arrivals = new Map([[start, 0]]);
  let elapsed = 0;

  function add(phase, duration) {
    phases.push({ ...phase, startTime: elapsed, endTime: elapsed + duration });
    elapsed += duration;
  }

  function leg(from, to, recordArrivals) {
    const direction = Math.sign(to - from);
    for (let at = from; at !== to; at += direction) {
      const next = at + direction;
      const meters = Math.abs(stations[next] - stations[at]);
      add({ kind: "running", from: at, to: next, direction }, meters * 3.6 / speed);
      if (recordArrivals) arrivals.set(next, elapsed);
      const atTerminal = next === to;
      add({ kind: atTerminal ? "turnaround" : "stopped", from: next, to: next,
            direction: atTerminal ? -direction : direction }, atTerminal ? turnaround : dwell);
    }
  }

  leg(start, opposite, true);
  leg(opposite, start, false);
  return { stations, phases, duration: elapsed, arrivals };
}

export function operationAt(cycle, seconds) {
  const remainder = seconds % cycle.duration;
  const time = remainder < 0 ? remainder + cycle.duration : remainder;
  const phase = cycle.phases.find(item => time < item.endTime) ?? cycle.phases[0];
  const { from, to, kind } = phase;
  const fraction = (time - phase.startTime) / (phase.endTime - phase.startTime);
  // Ease the display at platforms while preserving the time assigned to the segment.
  const t = fraction * fraction * (3 - 2 * fraction);
  const meters = cycle.stations[from] + (cycle.stations[to] - cycle.stations[from]) * t;
  return { ...phase, meters, stopped: kind !== "running", secondsLeft: Math.max(0, phase.endTime - time) };
}
