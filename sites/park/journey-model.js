import { clockLabel, estimateTrip, reachesNextDay, rideDuration, scenarioLabel, timeRange, travelDirection } from "./cable-planner.js?v=one-opening";

const MINUTE = 60;
export const MAX_ACTIVITIES = 24;
export const PLAN_NOTE = "時間為臺灣當地時間的規劃試算。實際班表、費用、報到地點和開放範圍依各項營運公告。";

const validTime = value => typeof value === "string" && /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(value);
const minutesAt = value => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
const secondsAt = value => minutesAt(value) * MINUTE;
const money = amount => `NT$${amount.toLocaleString("en-US")}`;
const within = (value, min, max, fallback) =>
  Number.isInteger(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function createActivity(id, config, day = 1, report = "", duration = null) {
  const activity = config.activities[id];
  return { id, day, report, duration: duration ?? activity.minutes, walk: activity.walk };
}

export function fromPreset(key, config) {
  const preset = config.presets[key];
  return {
    mode: preset.nights ? "stay" : "day",
    nights: preset.nights || 2,
    room: preset.room ?? "t2-lake-view",
    holidays: 0,
    start: preset.start,
    cutoff: "17:30",
    checkIn: "15:00",
    checkOut: "09:00",
    wait: "normal",
    access: 3,
    items: preset.items.map(([id, day, report, duration]) => createActivity(id, config, day, report, duration)),
  };
}

export function validateDraft(draft, config) {
  if (!draft || !Array.isArray(draft.items)) return null;
  const defaults = fromPreset(draft.mode === "stay" ? "stay" : "day", config);
  const safe = { ...defaults };
  for (const key of ["start", "cutoff", "checkIn", "checkOut"]) {
    if (validTime(draft[key])) safe[key] = draft[key];
  }
  if (Object.hasOwn(config.rooms, draft.room)) safe.room = draft.room;
  if (Object.hasOwn(config.waitProfiles, draft.wait)) safe.wait = draft.wait;
  if ([3, 6, 10].includes(draft.access)) safe.access = draft.access;
  safe.nights = within(draft.nights, 1, 5, defaults.nights);
  safe.holidays = within(draft.holidays, 0, safe.nights, 0);
  safe.items = draft.items.filter(item => item && Object.hasOwn(config.activities, item.id))
    .slice(0, MAX_ACTIVITIES).map(item => {
      const base = createActivity(item.id, config);
      return {
        ...base,
        day: within(item.day, 1, safe.nights + 1, 1),
        report: validTime(item.report) ? item.report : "",
        duration: within(item.duration, 5, 240, base.duration),
        walk: within(item.walk, 0, 90, base.walk),
      };
    });
  return safe;
}

export function effectiveDay(item, draft) {
  return draft.mode === "day" ? 1 : Math.min(item.day, draft.nights + 1);
}

export function roomCost(draft, room) {
  const weekday = draft.nights - draft.holidays;
  return {
    weekday,
    holidays: draft.holidays,
    total: weekday * room.weekday + draft.holidays * room.holiday,
  };
}

function dayItinerary(index, count, draft, config) {
  const number = index + 1;
  const first = index === 0;
  const last = number === count;
  const room = count > 1 ? config.rooms[draft.room] : null;
  const hotel = room ? config.lodging[`T${room.station + 1}`] : null;
  const wait = config.waitProfiles[draft.wait].minutes;
  const start = !first && last
    ? Math.max(secondsAt(draft.start), secondsAt(draft.checkOut))
    : secondsAt(draft.start);
  let time = { early: start, late: start };
  let station = first ? 0 : room.station;
  let walkBack = first ? 0 : hotel.walk;
  let boardings = 0;
  const events = [];
  const warnings = [];
  const dayItems = draft.items.filter(item => effectiveDay(item, draft) === number);

  function step(title, detail = "", path = "", finish = null) {
    events.push({ time: { ...time }, title, detail, path, finish });
  }

  function advance(minutes) {
    time = { early: time.early + minutes * MINUTE, late: time.late + minutes * MINUTE };
  }

  function waitUntil(target) {
    time = { early: Math.max(time.early, target), late: Math.max(time.late, target) };
  }

  function returnToStation() {
    if (!walkBack) return;
    const minutes = walkBack;
    advance(minutes);
    step(`走回 ${config.stations[station].title} 公共動線`, `返站步行預留 ${minutes} 分鐘`, config.stations[station].path);
    walkBack = 0;
  }

  function travel(destination) {
    if (station === destination) return;
    returnToStation();
    const direction = travelDirection(destination > station);
    step(`${config.stations[station].title} 進站`, `${direction} · 進站步行 ${draft.access} 分鐘，候車預留 ${wait.join("–")} 分鐘`);
    const spread = time.late - time.early;
    const trip = estimateTrip({
      start: station, destination, departure: time.early, wait, access: draft.access,
      visits: {}, returnStay: null, deadline: null, activityWalk: 0,
    }, config);
    time = { early: trip.arrival.early, late: trip.arrival.late + spread };
    station = destination;
    boardings += 1;
    step(`抵達 ${config.stations[station].title} 月台`,
      `搭乘 ${direction} · 車程含途中停靠約 ${rideDuration(trip.outboundRideSeconds)}`,
      config.stations[station].path);
  }

  function goTo(destination, walk) {
    travel(destination);
    returnToStation();
    advance(walk);
    walkBack = walk;
  }

  if (first) {
    step(`${config.stations[0].title}集合`, "從迎賓廣場與旅客服務區開始", config.stations[0].path);
  } else if (last) {
    step("退房與整理行李", `於 ${hotel.meeting} 辦理 · 預留 15 分鐘`, hotel.link);
    advance(15);
  } else if (dayItems.length) {
    step(`由 ${hotel.meeting} 出發`, "住宿站為今日起點", hotel.link);
  } else {
    step(`留在 ${config.stations[station].title}`, "這一天留給休息，也可加入活動或跨站體驗。", hotel.link);
    return { number, events, warnings, boardings, arrival: { ...time } };
  }

  for (const item of dayItems) {
    const activity = config.activities[item.id];
    goTo(activity.station, item.walk);
    step(`到達 ${activity.meeting}`, `步行預留 ${item.walk} 分鐘。 ${activity.route}`, activity.path);
    if (item.report) {
      const target = secondsAt(item.report);
      if (time.late > target) {
        const delay = Math.ceil((time.late - target) / MINUTE);
        warnings.push(`${activity.title} 可能晚於 ${item.report} 報到 ${delay} 分鐘。可提早轉場，或改選 ${clockLabel(time.late)} 之後的場次。`);
      }
      waitUntil(target);
    }
    const finish = { early: time.early + item.duration * MINUTE, late: time.late + item.duration * MINUTE };
    step(activity.title, `停留 ${item.duration} 分鐘${item.report ? ` · 設定報到 ${item.report}` : ""}`, activity.path, finish);
    advance(item.duration);
  }

  if (last) {
    travel(0);
    returnToStation();
    if (boardings) advance(5);
    step("回到 T1 集合點／離園", boardings ? "由月台步行至地面集合點，預留 5 分鐘" : "由公共動線前往離園、取車或轉乘", config.stations[0].path);
    if (time.late > secondsAt(draft.cutoff)) {
      const delay = Math.ceil((time.late - secondsAt(draft.cutoff)) / MINUTE);
      warnings.push(`最晚估計 ${clockLabel(time.late)} 回到 T1，晚於你的 ${draft.cutoff} 目標 ${delay} 分鐘。可提早出發或縮短停留。`);
    }
  } else {
    goTo(room.station, hotel.walk);
    if (first) waitUntil(secondsAt(draft.checkIn));
    step(first ? `入住 · ${hotel.meeting}` : `返回住宿 · ${hotel.meeting}`,
      first ? `預計入住時段 ${draft.checkIn} 後 · 房型 ${room.title}` : `返回 ${room.title} 休息`, room.path);
  }

  if (reachesNextDay(time.late)) warnings.push("此日行程估計跨日，請縮短停留，並依正式班次查詢末班與回程。");
  return { number, events, warnings, boardings, arrival: { ...time } };
}

export function makePlan(draft, config) {
  const count = draft.mode === "stay" ? draft.nights + 1 : 1;
  const days = Array.from({ length: count }, (_, index) => dayItinerary(index, count, draft, config));
  const room = count > 1 ? config.rooms[draft.room] : null;
  const cost = room ? roomCost(draft, room) : null;
  const boardingCount = days.reduce((sum, day) => sum + day.boardings, 0);
  return { days, room, cost, boardingCount, scenario: scenarioLabel(), target: draft.cutoff, nights: room ? draft.nights : 0 };
}

export function roomSummary(plan, config) {
  if (!plan.room) return "";
  const { room, cost, nights } = plan;
  return `${config.stations[room.station].title} · ${room.title} · ${nights} 晚 · 每房 ${money(cost.total)} 規劃參考價`;
}

export function resultSummary(plan) {
  const label = plan.nights ? "最後一天回到 T1" : "回到 T1";
  return `${label} ${timeRange(plan.days.at(-1).arrival)} · 共搭乘 ${plan.boardingCount} 次`;
}

export function itineraryReport(plan, config, title) {
  const summary = [resultSummary(plan), plan.scenario, config.basis, PLAN_NOTE].filter(Boolean);
  if (plan.room) {
    summary.unshift(roomSummary(plan, config));
    summary.push(`平日 ${plan.cost.weekday} 晚、假日 ${plan.cost.holidays} 晚。未稅純房費，餐飲、票券與課程費用依公告。`);
  }
  return {
    title,
    summary,
    days: plan.days.map(day => ({
      title: `第 ${day.number} 天`,
      warnings: day.warnings,
      events: day.events.map(event => ({
        time: timeRange(event.time),
        title: event.title,
        detail: event.detail + (event.finish ? ` · 結束 ${timeRange(event.finish)}` : ""),
      })),
    })),
  };
}
