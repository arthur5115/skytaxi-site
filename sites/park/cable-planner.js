const MINUTE = 60;
const DAY_MINUTES = 24 * 60;

export function clockLabel(seconds, round = Math.ceil) {
  const minutes = round(seconds / MINUTE);
  const day = Math.floor(minutes / DAY_MINUTES);
  const hours = String(Math.floor((minutes % DAY_MINUTES) / 60)).padStart(2, "0");
  const rest = String(minutes % 60).padStart(2, "0");
  const prefix = day > 1 ? `第 ${day + 1} 日 ` : day === 1 ? "次日 " : "";
  return `${prefix}${hours}:${rest}`;
}

export function timeRange(time) {
  const early = clockLabel(time.early);
  const late = clockLabel(time.late);
  return early === late ? early : `${early}–${late}`;
}

export function reachesNextDay(seconds) {
  return Math.ceil(seconds / MINUTE) >= DAY_MINUTES;
}

export function rideDuration(seconds) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / MINUTE);
  const remainder = total % MINUTE;
  return minutes ? `${minutes} 分 ${String(remainder).padStart(2, "0")} 秒` : `${remainder} 秒`;
}

export function scenarioLabel() {
  return "T1 至 T4 規劃一次通車";
}

export function travelDirection(eastbound) {
  return eastbound ? "往新化林場方向" : "往虎頭埤方向";
}

export function estimateTrip(input, config) {
  const { start, destination, departure, wait, access, visits, returnStay, deadline, activityWalk } = input;
  const stations = config.stations;
  const runningSeconds = config.distances.map(distance => distance * 3.6 / config.speed);
  const direction = Math.sign(destination - start);
  const stops = Object.keys(visits).map(Number).sort((a, b) => direction * (a - b));
  const clock = { early: departure, late: departure };
  const timeline = [];
  let rideSeconds = 0;
  let boardings = 0;

  function addTime(early, late = early) {
    clock.early += early;
    clock.late += late;
  }

  function mark(station, kind, detail) {
    timeline.push({ station: stations[station].title, kind, detail, time: { ...clock } });
  }

  function ride(from, to, arrivalKind, arrivalDetail) {
    const step = Math.sign(to - from);
    const heading = travelDirection(step > 0);
    addTime((access + wait[0]) * MINUTE, (access + wait[1]) * MINUTE);
    boardings += 1;
    mark(from, "搭車", `${heading} · 含進站步行及候車`);

    for (let here = from + step; here !== to + step; here += step) {
      const running = runningSeconds[Math.min(here, here - step)];
      addTime(running);
      rideSeconds += running;
      if (here !== to) {
        mark(here, "中途停靠", "留在車上續乘");
        addTime(config.dwell);
        rideSeconds += config.dwell;
      }
    }
    mark(to, arrivalKind, arrivalDetail);
  }

  mark(start, "行程起點", "到達車站入口");
  let lastStop = start;
  for (const stop of stops) {
    ride(lastStop, stop, "下車遊園", `預留 ${visits[stop]} 分鐘，再進站續程`);
    addTime(visits[stop] * MINUTE);
    lastStop = stop;
  }
  ride(lastStop, destination, "抵達目的站", returnStay === null ? "抵達月台" : `抵達月台，回程前停留 ${returnStay} 分鐘`);
  const arrival = { ...clock };
  const outboundRideSeconds = rideSeconds;

  const checkIn = deadline === null ? null : {
    time: { early: arrival.early + activityWalk * MINUTE, late: arrival.late + activityWalk * MINUTE },
    target: deadline,
    latestStart: deadline - (arrival.late - departure) - activityWalk * MINUTE,
  };

  let returnArrival = null;
  if (returnStay !== null) {
    addTime(returnStay * MINUTE);
    ride(destination, start, "返回起點", "抵達月台，可依離園動線轉乘");
    returnArrival = { ...clock };
  }

  const latestTime = Math.max(clock.late, checkIn?.time.late ?? 0);
  const crossesDay = reachesNextDay(latestTime);
  return { arrival, returnArrival, timeline, outboundRideSeconds, boardings, checkIn, crossesDay };
}

function timeValue(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return (hours * 60 + minutes) * MINUTE;
}

function mountPlanner(root) {
  const config = JSON.parse(document.querySelector("#cable-trip-data").textContent);
  const form = root.querySelector("form");
  const fields = form.elements;
  const results = root.querySelector("[data-trip-results]");
  const summary = root.querySelector("[data-trip-summary]");
  const nextDay = root.querySelector("[data-trip-next-day]");
  const timeline = root.querySelector("[data-trip-timeline]");
  const stopRows = [...form.querySelectorAll("[data-visit]")];
  const returnField = form.querySelector("[data-return-stay]");
  const reportField = form.querySelector("[data-report-walk]");
  const download = root.querySelector("[data-trip-download]");
  const pdfLink = root.querySelector("[data-trip-pdf-view]");
  const pdfStatus = root.querySelector("[data-trip-pdf-status]");
  const stale = root.querySelector("[data-trip-stale]");
  const presetButtons = [...root.querySelectorAll("[data-trip-preset]")];
  let currentPlan;
  let pdfURL;
  let generatingPDF = false;

  function resetDownload() {
    if (pdfURL) URL.revokeObjectURL(pdfURL);
    pdfURL = null;
    pdfLink.hidden = true;
    pdfLink.removeAttribute("href");
    pdfStatus.textContent = "";
  }

  function revealOnMobile() {
    if (window.matchMedia("(max-width: 850px)").matches) results.scrollIntoView({ block: "start" });
  }

  function syncForm() {
    const start = Number(fields.start.value);
    const destination = Number(fields.destination.value);
    fields.destination.setCustomValidity(start === destination ? "請選擇不同的起點與目的站。" : "");
    let visible = false;
    for (const row of stopRows) {
      const index = Number(row.dataset.visit);
      const allowed = index > Math.min(start, destination) && index < Math.max(start, destination);
      const [select, minutes] = row.querySelectorAll("input");
      row.hidden = !allowed;
      select.disabled = !allowed;
      minutes.disabled = !allowed || !select.checked;
      visible ||= allowed;
    }
    form.querySelector("[data-no-visits]").hidden = visible;
    returnField.hidden = !fields.return.checked;
    fields.returnStay.disabled = !fields.return.checked;
    reportField.hidden = !fields.deadline.value;
    fields.activityWalk.disabled = !fields.deadline.value;
  }

  function readPlan() {
    const data = new FormData(form);
    const visits = {};
    for (const row of stopRows) {
      const index = Number(row.dataset.visit);
      if (data.has(`visit-${index}`)) visits[index] = Number(data.get(`stay-${index}`));
    }
    return {
      start: Number(data.get("start")),
      destination: Number(data.get("destination")),
      departure: timeValue(data.get("departure")),
      wait: config.waitProfiles[data.get("wait")].minutes,
      access: Number(data.get("access")),
      visits,
      returnStay: data.has("returnStay") ? Number(data.get("returnStay")) : null,
      deadline: timeValue(data.get("deadline")),
      activityWalk: Number(data.get("activityWalk")),
    };
  }

  function checkInAdvice(checkIn) {
    const range = timeRange(checkIn.time);
    const goal = clockLabel(checkIn.target);
    const when = checkIn.time.late <= checkIn.target
      ? "所選情境下可趕上"
      : checkIn.time.early > checkIn.target ? "試算會超過報到時間" : "遇較長候車可能超過報到時間";
    const suggestion = checkIn.latestStart < 0
      ? "可改選較晚的活動場次，或於前一日抵達。"
      : `依較長候車估算，建議最晚 ${clockLabel(checkIn.latestStart, Math.floor)} 抵達起點站入口。`;
    return { title: when, detail: `預計 ${range} 抵達活動報到點，目標 ${goal}。${suggestion}`, risk: checkIn.time.late > checkIn.target };
  }

  function render(input, plan) {
    const stationName = config.stations[input.destination].title;
    const stationETA = timeRange(plan.arrival);
    const returnETA = plan.returnArrival ? timeRange(plan.returnArrival) : "";
    const scenario = scenarioLabel();
    root.querySelector("[data-trip-arrival]").textContent = stationETA;
    root.querySelector("[data-trip-destination]").textContent = `${stationName} · 抵達月台`;
    root.querySelector("[data-trip-scenario]").textContent = scenario;
    root.querySelector("[data-trip-total]").textContent = `去程乘車約 ${rideDuration(plan.outboundRideSeconds)}，全程搭車 ${plan.boardings} 次。每次進站另留 ${input.access} 分鐘步行及 ${input.wait.join("–")} 分鐘候車。`;
    const returnNote = root.querySelector("[data-trip-return]");
    returnNote.hidden = !returnETA;
    returnNote.textContent = returnETA ? `預計 ${returnETA} 返回 ${config.stations[input.start].title}` : "";
    nextDay.hidden = !plan.crossesDay;

    const report = root.querySelector("[data-trip-report]");
    const advice = plan.checkIn ? checkInAdvice(plan.checkIn) : null;
    report.hidden = !advice;
    if (advice) {
      report.dataset.risk = String(advice.risk);
      report.querySelector("strong").textContent = advice.title;
      report.querySelector("p").textContent = advice.detail;
    }

    timeline.replaceChildren(...plan.timeline.map(row => {
      const item = document.createElement("li");
      const time = document.createElement("span");
      const content = document.createElement("div");
      const heading = document.createElement("h3");
      const detail = document.createElement("p");
      time.textContent = timeRange(row.time);
      heading.textContent = `${row.station} · ${row.kind}`;
      detail.textContent = row.detail;
      content.append(heading, detail);
      item.append(time, content);
      return item;
    }));
    stale.hidden = true;
    resetDownload();
    download.disabled = generatingPDF;
    results.hidden = false;
    const announcedReturn = returnETA ? `${returnNote.textContent}。` : "";
    summary.textContent = `預計 ${stationETA} 抵達 ${stationName}。${announcedReturn}${plan.crossesDay ? nextDay.textContent : ""}`;
    currentPlan = { plan, advice, scenario };
  }

  function applyPreset(name) {
    const preset = config.presets[name];
    fields.start.value = preset.start;
    fields.destination.value = preset.destination;
    fields.departure.value = preset.departure;
    fields.wait.value = "normal";
    fields.access.value = 3;
    fields.return.checked = preset.returnStay !== null;
    fields.returnStay.value = preset.returnStay ?? 60;
    fields.deadline.value = "";
    fields.activityWalk.value = 5;
    for (const row of stopRows) {
      const [select, minutes] = row.querySelectorAll("input");
      select.checked = Object.hasOwn(preset.visits, row.dataset.visit);
      minutes.value = preset.visits[row.dataset.visit] ?? 45;
    }
    for (const button of presetButtons) {
      button.setAttribute("aria-pressed", String(button.dataset.tripPreset === name));
    }
    syncForm();
    form.requestSubmit();
  }

  form.addEventListener("input", () => {
    stale.hidden = false;
    download.disabled = true;
    resetDownload();
    for (const button of presetButtons) button.setAttribute("aria-pressed", "false");
  });
  form.addEventListener("change", syncForm);
  form.addEventListener("submit", event => {
    event.preventDefault();
    syncForm();
    if (!form.reportValidity()) return;
    const input = readPlan();
    render(input, estimateTrip(input, config));
    if (event.submitter) revealOnMobile();
  });
  root.querySelector("[data-swap-stations]").addEventListener("click", () => {
    [fields.start.value, fields.destination.value] = [fields.destination.value, fields.start.value];
    syncForm();
    form.requestSubmit();
  });
  for (const preset of presetButtons) {
    preset.addEventListener("click", () => {
      applyPreset(preset.dataset.tripPreset);
      revealOnMobile();
    });
  }
  download.addEventListener("click", async () => {
    const original = currentPlan;
    const { plan, advice, scenario } = original;
    generatingPDF = true;
    download.disabled = true;
    pdfStatus.textContent = "正在產生 PDF…";
    try {
      const { createBrowserPdf, downloadFile } = await import("./itinerary-pdf.js");
      if (!pdfURL) {
        const warnings = advice ? [advice.detail] : [];
        if (plan.crossesDay) warnings.push(nextDay.textContent);
        const blob = await createBrowserPdf({
          title: "纜車抵達時間試算",
          summary: [scenario, config.basis, "時間為臺灣當地時間。實際班次及票券依營運公告。"].filter(Boolean),
          days: [{
            title: "逐站時間",
            warnings,
            events: plan.timeline.map(row => ({
              time: timeRange(row.time), title: `${row.station} · ${row.kind}`, detail: row.detail,
            })),
          }],
        });
        if (currentPlan !== original || !stale.hidden) return;
        pdfURL = URL.createObjectURL(blob);
        pdfLink.href = pdfURL;
        pdfLink.hidden = false;
      }
      downloadFile(pdfURL, "虎頭埤纜車行程.pdf");
      pdfStatus.textContent = "PDF 已產生。也可選「開啟 PDF」直接查看。";
    } catch (error) {
      console.error(error);
      if (currentPlan === original && stale.hidden) pdfStatus.textContent = "PDF 產生失敗，請重試。";
    } finally {
      generatingPDF = false;
      download.disabled = !stale.hidden;
    }
  });
  root.hidden = false;
  applyPreset("core");
}

if (typeof document !== "undefined") {
  const planner = document.querySelector("[data-cable-planner]");
  if (planner) mountPlanner(planner);
}
