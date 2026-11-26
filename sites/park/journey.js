import { timeRange } from "./cable-planner.js?v=one-opening";
import {
  createActivity, effectiveDay, fromPreset, itineraryReport, makePlan, MAX_ACTIVITIES,
  resultSummary, roomSummary, validateDraft,
} from "./journey-model.js?v=one-opening";

const STORAGE_KEY = "hutoupi-visitor-journey";
const htmlEntities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = value => String(value).replace(/[&<>"']/g, character => htmlEntities[character]);
const currency = value => `NT$${value.toLocaleString("en-US")}`;

function activityPhoto(photo, title, withCredit = false) {
  if (!photo) return "";
  const credit = withCredit && photo.credit
    ? `<span class="photo-credit">攝影來源 <a href="${escape(photo.source)}">${escape(photo.credit)}</a> · <a href="${escape(photo.licenseUrl)}">${escape(photo.license)}</a> · 網頁縮圖</span>`
    : "";
  return `<figure class="visitor-photo">
    <a class="visitor-photo-link" href="${escape(photo.src)}" aria-label="放大圖片 · ${escape(title)}"><img src="${escape(photo.src)}" alt="${escape(photo.alt)}" loading="lazy" decoding="async"></a>
    <figcaption><span class="photo-label">${escape(photo.label)}</span>${credit}</figcaption>
  </figure>`;
}

export function initialDraft(search, saved, config) {
  const query = new URLSearchParams(search);
  const requestedMode = query.get("mode");
  const requestedPreset = query.get("preset");
  const requestedRoom = query.get("room");
  const requestedActivity = query.get("activity");
  const hasRoom = Object.hasOwn(config.rooms, requestedRoom);
  const hasActivity = Object.hasOwn(config.activities, requestedActivity);
  const base = requestedMode === "stay" || hasRoom ? "stay" : "day";
  const previous = validateDraft(saved, config);
  const draft = Object.hasOwn(config.presets, requestedPreset)
    ? fromPreset(requestedPreset, config)
    : previous ?? fromPreset(base, config);
  let message = "";

  if (requestedMode === "day" || requestedMode === "stay") draft.mode = requestedMode;
  if (hasRoom) {
    draft.mode = "stay";
    draft.room = requestedRoom;
    message = `已選擇 ${config.stations[config.rooms[requestedRoom].station].title} ${config.rooms[requestedRoom].title}。`;
  }
  if (hasActivity) {
    const activity = config.activities[requestedActivity];
    if (!previous && !requestedPreset && !requestedMode) draft.items = [];
    if (draft.items.some(item => item.id === requestedActivity)) {
      message = `${activity.title} 已在行程中。`;
    } else if (draft.items.length >= MAX_ACTIVITIES) {
      message = `行程已達 ${MAX_ACTIVITIES} 項。移除一項後即可加入 ${activity.title}。`;
    } else {
      draft.items.push(createActivity(requestedActivity, config));
      message = `已加入 ${activity.title}。`;
    }
  }
  return { draft, message };
}

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function saveDraft(draft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

function timelineHTML(plan, config) {
  const room = roomSummary(plan, config);
  const summary = `<div class="journey-summary">
    <p><strong>${escape(resultSummary(plan))}</strong></p>
    <p>${escape(plan.scenario)}</p>
    ${config.basis ? `<p class="journey-hint">${escape(config.basis)}</p>` : ""}
    ${room ? `<p>${escape(room)}</p><p class="journey-hint">平日 ${plan.cost.weekday} 晚、假日 ${plan.cost.holidays} 晚。未稅純房費，票券、餐飲與課程另依公告。</p>` : ""}
  </div>`;
  const days = plan.days.map(day => {
    const warnings = day.warnings.length
      ? `<div class="journey-warnings"><strong>這一天有時間衝突</strong><ul>${day.warnings.map(warning => `<li>${escape(warning)}</li>`).join("")}</ul></div>`
      : "";
    const events = day.events.map(event => {
      const title = event.path
        ? `<a href="${escape(event.path)}">${escape(event.title)}</a>` : escape(event.title);
      const finish = event.finish ? ` · 結束 ${escape(timeRange(event.finish))}` : "";
      return `<li><span class="journey-time">${escape(timeRange(event.time))}</span>
        <div class="journey-event"><strong>${title}</strong><p>${escape(event.detail)}${finish}</p></div></li>`;
    }).join("");
    return `<section class="day-result"><h3>第 ${day.number} 天</h3>${warnings}<ol class="journey-timeline">${events}</ol></section>`;
  }).join("");
  return summary + days;
}

function itemHTML(item, index, draft, config) {
  const activity = config.activities[item.id];
  const day = effectiveDay(item, draft);
  const dayOptions = Array.from({ length: draft.mode === "stay" ? draft.nights + 1 : 1 }, (_, dayIndex) => {
    const number = dayIndex + 1;
    return `<option value="${number}"${number === day ? " selected" : ""}>第 ${number} 天</option>`;
  }).join("");
  return `<article class="journey-item" data-index="${index}">
    <div class="journey-item-top">
      <div class="journey-item-name">
        ${activityPhoto(activity.photo, activity.title, true)}
        <h3><a href="${escape(activity.path)}">${escape(config.stations[activity.station].title)} · ${escape(activity.title)}</a></h3>
      </div>
      <div class="item-tools">
        <button type="button" data-edit="up" aria-label="往前移動 ${escape(activity.title)}"${index === 0 ? " disabled" : ""}>↑</button>
        <button type="button" data-edit="down" aria-label="往後移動 ${escape(activity.title)}"${index + 1 === draft.items.length ? " disabled" : ""}>↓</button>
        <button type="button" data-edit="remove" aria-label="移除 ${escape(activity.title)}">移除</button>
      </div>
    </div>
    <div class="journey-fields">
      <label>活動日期<select data-field="day"${draft.mode === "day" ? " disabled" : ""}>${dayOptions}</select></label>
      <label>報到時間（選填）<input type="time" data-field="report" value="${escape(item.report)}"></label>
      <label>停留（分鐘）<input type="number" inputmode="numeric" min="5" max="240" data-field="duration" value="${item.duration}" required></label>
      <label>轉場步行（分鐘）<input type="number" inputmode="numeric" min="0" max="90" data-field="walk" value="${item.walk}" required></label>
    </div>
  </article>`;
}

function mount(root, config) {
  const initial = initialDraft(location.search, readDraft(), config);
  let draft = initial.draft;
  let result;
  let pdfURL;
  let revision = 0;
  const form = root.querySelector("#journey-settings");
  const fields = form.elements;
  const lodging = root.querySelector("[data-lodging]");
  const itemList = root.querySelector("[data-journey-items]");
  const activitySelect = root.querySelector("#journey-activity");
  const activityPreview = root.querySelector("[data-activity-preview]");
  const presetStrip = document.querySelector("[data-plan-photos]");
  const announce = root.querySelector("[data-journey-announcement]");
  const downloadButton = root.querySelector("[data-save-itinerary]");
  const pdfLink = root.querySelector("[data-view-itinerary]");
  const status = root.querySelector("[data-download-status]");

  function setMessage(text) {
    announce.textContent = text;
  }

  function updateRoomPreview() {
    const room = config.rooms[draft.room];
    const station = config.stations[room.station];
    root.querySelector("[data-room-preview]").innerHTML = `
      <img src="${escape(room.image)}" alt="客房配置示意">
      <div><a href="${escape(room.path)}">${escape(station.title)} · ${escape(room.title)}</a>
      <small>${room.guests} 人 · ${escape(room.beds)} · 客房配置示意</small>
      <small>平日 ${currency(room.weekday)}／假日 ${currency(room.holiday)} · 每房晚參考價</small></div>`;
  }

  function updateActivityPreview() {
    const activity = config.activities[activitySelect.value];
    activityPreview.innerHTML = activityPhoto(activity.photo, activity.title, true);
  }

  function updateInputs() {
    if (fields.holidays.options.length !== draft.nights + 1) {
      fields.holidays.replaceChildren(...Array.from({ length: draft.nights + 1 }, (_, nights) => new Option(`${nights} 晚`, nights)));
    }
    for (const key of ["mode", "start", "cutoff", "wait", "access", "nights", "room", "holidays", "checkIn", "checkOut"]) {
      fields[key].value = draft[key];
    }
    lodging.hidden = draft.mode !== "stay";
    lodging.disabled = draft.mode !== "stay";
    if (draft.mode === "stay") updateRoomPreview();
  }

  function updateItems() {
    itemList.innerHTML = draft.items.length
      ? draft.items.map((item, index) => itemHTML(item, index, draft, config)).join("")
      : '<p class="journey-hint">選擇一項想參加的活動，再加入行程。</p>';
  }

  function updateResult() {
    result = makePlan(draft, config);
    revision += 1;
    if (pdfURL) URL.revokeObjectURL(pdfURL);
    pdfURL = null;
    pdfLink.hidden = true;
    pdfLink.removeAttribute("href");
    status.textContent = "";
    root.querySelector("[data-journey-result]").innerHTML = timelineHTML(result, config);
    return saveDraft(draft);
  }

  form.addEventListener("submit", event => event.preventDefault());
  activitySelect.addEventListener("change", updateActivityPreview);
  form.addEventListener("change", event => {
    const field = event.target;
    const key = field.name;
    if (!Object.hasOwn(draft, key)) return;
    if (!field.validity.valid) {
      field.value = draft[key];
      field.reportValidity();
      return;
    }
    draft[key] = ["access", "nights", "holidays"].includes(key) ? Number(field.value) : field.value;
    if (key === "nights") {
      draft.holidays = Math.min(draft.holidays, draft.nights);
      const moved = draft.items.some(item => item.day > draft.nights + 1);
      if (moved) setMessage("超過住宿天數的活動已改排到最後一天。");
    }
    if (key === "mode") setMessage("已切換旅程，保留你選的景點與活動。");
    updateInputs();
    if (key === "mode" || key === "nights") updateItems();
    updateResult();
  });

  root.querySelector("[data-add-activity]").addEventListener("click", () => {
    if (draft.items.length >= MAX_ACTIVITIES) {
      setMessage(`行程最多可加入 ${MAX_ACTIVITIES} 項活動。`);
      return;
    }
    const identifier = activitySelect.value;
    draft.items.push(createActivity(identifier, config));
    updateItems();
    updateResult();
    setMessage(`已加入 ${config.activities[identifier].title}。`);
  });

  function updateItemInput(event) {
    const input = event.target;
    const key = input.dataset.field;
    if (!key) return;
    const item = draft.items[Number(input.closest("[data-index]").dataset.index)];
    if (!input.validity.valid) {
      if (event.type === "change") input.value = item[key];
      return;
    }
    const value = key === "report" ? input.value : Number(input.value);
    if (item[key] === value) return;
    item[key] = value;
    updateResult();
  }
  itemList.addEventListener("change", updateItemInput);
  itemList.addEventListener("input", updateItemInput);

  itemList.addEventListener("click", event => {
    const button = event.target.closest("button[data-edit]");
    if (!button) return;
    const index = Number(button.closest("[data-index]").dataset.index);
    const command = button.dataset.edit;
    const title = config.activities[draft.items[index].id].title;
    if (command === "remove") {
      draft.items.splice(index, 1);
    } else {
      const newIndex = index + (command === "up" ? -1 : 1);
      [draft.items[index], draft.items[newIndex]] = [draft.items[newIndex], draft.items[index]];
    }
    updateItems();
    updateResult();
    const next = command === "remove" ? Math.min(index, draft.items.length - 1) : index + (command === "up" ? -1 : 1);
    const nextItem = itemList.querySelector(`[data-index="${next}"]`);
    (nextItem?.querySelector(`[data-edit="${command}"]:not([disabled])`) ?? nextItem?.querySelector("a") ?? activitySelect).focus();
    setMessage(command === "remove" ? `已移除 ${title}。` : `已調整 ${title} 的順序。`);
  });

  for (const button of presetStrip.querySelectorAll("[data-preset]")) {
    button.addEventListener("click", () => {
      draft = fromPreset(button.dataset.preset, config);
      updateInputs();
      updateItems();
      updateResult();
      setMessage(`已套用 ${config.presets[button.dataset.preset].title}。`);
      const settings = form.querySelector("input:checked");
      settings.focus({ preventScroll: true });
      form.scrollIntoView({ block: "start" });
    });
  }

  downloadButton.addEventListener("click", async () => {
    if (pdfURL) {
      const { downloadFile } = await import("./itinerary-pdf.js");
      downloadFile(pdfURL, "虎頭埤我的行程.pdf");
      return;
    }
    const current = revision;
    const report = itineraryReport(result, config, draft.mode === "stay" ? "我的健康旅居" : "我的四站一日遊");
    downloadButton.disabled = true;
    status.textContent = "正在產生 PDF…";
    try {
      const { createBrowserPdf, downloadFile } = await import("./itinerary-pdf.js");
      const blob = await createBrowserPdf(report);
      if (current !== revision) return;
      pdfURL = URL.createObjectURL(blob);
      pdfLink.href = pdfURL;
      pdfLink.hidden = false;
      downloadFile(pdfURL, "虎頭埤我的行程.pdf");
      status.textContent = "PDF 已產生。也可選「開啟 PDF」直接查看。";
    } catch (error) {
      console.error(error);
      if (current === revision) status.textContent = "PDF 產生失敗。請重試，或開啟行程範例 PDF。";
    } finally {
      downloadButton.disabled = false;
    }
  });

  updateInputs();
  updateActivityPreview();
  updateItems();
  if (updateResult() && location.search) history.replaceState(null, "", location.pathname + location.hash);
  root.hidden = false;
  presetStrip.hidden = false;
  if (initial.message) {
    setMessage(initial.message);
    const notice = document.createElement("p");
    notice.className = "journey-summary";
    notice.textContent = initial.message;
    root.querySelector(".journey-controls").prepend(notice);
  }
}

async function start() {
  const root = document.querySelector("[data-journey]");
  if (!root) return;
  const loading = document.querySelector("[data-plan-loading]");
  try {
    const response = await fetch("/plan/config.json");
    if (!response.ok) throw new Error(`Journey settings: ${response.status}`);
    mount(root, await response.json());
    loading.hidden = true;
  } catch (error) {
    console.error(error);
    loading.firstChild.textContent = "行程工具載入失敗，可重新整理或";
  }
}

if (typeof document !== "undefined") start();
