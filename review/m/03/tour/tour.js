"use strict";

const header = document.querySelector(".site-header");
const showMotion = window.matchMedia("(prefers-reduced-motion: no-preference)");
const desktop = window.matchMedia("(min-width: 42rem)");
const archiveEntry = location.protocol === "file:" ? "../index.html" : "../";
const planDialog = document.querySelector("#plan-dialog");
const dialogImage = planDialog.querySelector("img");
const zoomButton = planDialog.querySelector("[data-plan-zoom]");
const navigation = [...document.querySelectorAll(".site-nav a, .route a")];
const stationNames = {
  T1: "新化之門站",
  T2: "湖濱旅館站",
  T3: "湖濱山城站",
  T4: "新化林場站",
};
const defaultFloor = { T1: "G", T2: "3F", T3: "3F", T4: "CL" };

function readData(id) {
  try {
    return JSON.parse(document.getElementById(id).textContent);
  } catch {
    return {};
  }
}

function bimHref(station, floor) {
  const query = new URLSearchParams({ station });
  if (floor) query.set("floor", floor);
  return archiveEntry + "?" + query.toString();
}

for (const link of document.querySelectorAll("[data-bim-home]")) link.href = archiveEntry;
for (const link of document.querySelectorAll("[data-bim-station]")) {
  link.href = bimHref(link.dataset.bimStation);
}

const filmData = readData("film-cue-data");
const chapters = [...document.querySelectorAll(".chapter")].map((section) => {
  const station = section.id.toUpperCase();
  const cueData = Array.isArray(filmData[station]) ? filmData[station] : [];
  const cues = [...section.querySelectorAll("[data-cue]")];
  for (const [i, cue] of cues.entries()) {
    const data = cueData[i];
    if (data?.label) cue.firstElementChild.textContent = data.label;
    if (data?.title) cue.lastElementChild.textContent = data.title;
  }
  return {
    station, section, cues, cueData,
    video: section.querySelector("video"),
    caption: section.querySelector("[data-frame-caption]"),
    play: section.querySelector("[data-play]"),
    sound: section.querySelector("[data-sound]"),
    scroll: section.querySelector("[data-auto-scroll]"),
    status: section.querySelector("[data-film-status]"),
    download: section.querySelector("[data-film-download]"),
    linkScroll: showMotion.matches && desktop.matches,
    requested: false,
    warmed: false,
    failed: false,
    pendingCue: null,
    lastScrollTime: 0,
    nextScrollTime: null,
    activeCue: -1,
  };
});

function cueStart(chapter, index) {
  const start = chapter.cueData[index]?.start;
  if (Number.isFinite(start) && start >= 0) return start;
  return chapter.video.duration * index / chapter.cues.length;
}

function updateCue(chapter, index) {
  if (chapter.activeCue === index) return;
  chapter.activeCue = index;
  chapter.cues.forEach((button, i) => button.setAttribute("aria-pressed", String(index === i)));
  chapter.caption.textContent = chapter.cues[index].querySelector(".cue-title").textContent;
}

function updateCueFromTime(chapter) {
  if (!Number.isFinite(chapter.video.duration)) return;
  let index = 0;
  for (let i = 1; i < chapter.cues.length; i++) {
    if (chapter.video.currentTime + 0.04 >= cueStart(chapter, i)) index = i;
  }
  updateCue(chapter, index);
}

function filmStatus(chapter, message, fallback = false) {
  chapter.status.textContent = message || "";
  chapter.status.hidden = !message;
  chapter.download.hidden = !fallback;
}

function updateMotionButton(chapter) {
  chapter.scroll.setAttribute("aria-pressed", String(chapter.linkScroll));
}

function seekFilm(chapter, time) {
  if (!Number.isFinite(chapter.video.duration) || !Number.isFinite(time)) return;
  const end = Math.max(0, chapter.video.duration - 0.05);
  chapter.video.currentTime = Math.min(end, Math.max(0, time));
}

function warmFilm(chapter) {
  if (chapter.warmed) return;
  chapter.warmed = true;
  chapter.video.preload = "metadata";
  if (!chapter.video.readyState && chapter.video.networkState !== HTMLMediaElement.NETWORK_LOADING) {
    chapter.video.load();
  }
}

function updatePlayButton(chapter) {
  const playing = !chapter.video.paused && !chapter.video.ended;
  chapter.play.setAttribute("aria-pressed", String(playing));
  chapter.play.querySelector("[data-play-label]").textContent = playing ? "暫停本站影片" : "播放本站影片";
}

function updateSoundButton(chapter) {
  const audible = !chapter.video.muted && chapter.video.volume > 0;
  chapter.sound.setAttribute("aria-pressed", String(audible));
  chapter.sound.querySelector("[data-sound-label]").textContent = audible ? "開啟" : "靜音";
}

function seekWhenScrolling(chapter, time) {
  const video = chapter.video;
  if (!video.paused || !chapter.linkScroll || planDialog.open) return;
  if (!Number.isFinite(video.duration) || Math.abs(video.currentTime - time) < .12) return;
  const now = performance.now();
  if (video.seeking || now - chapter.lastScrollTime < 100) {
    chapter.nextScrollTime = time;
    return;
  }
  chapter.nextScrollTime = null;
  chapter.lastScrollTime = now;
  seekFilm(chapter, time);
}

for (const chapter of chapters) {
  const { video, status } = chapter;
  status.setAttribute("role", "status");
  updateCue(chapter, 0);
  updateMotionButton(chapter);
  updateSoundButton(chapter);
  chapter.play.addEventListener("click", async () => {
    chapter.requested = true;
    chapter.nextScrollTime = null;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (chapter.failed) {
      chapter.failed = false;
      video.load();
    }
    if (video.ended || (Number.isFinite(video.duration) && video.currentTime > video.duration - 0.2)) {
      seekFilm(chapter, 0);
    }
    filmStatus(chapter, video.readyState >= 2 ? "" : "影片載入中。");
    try {
      await video.play();
    } catch (err) {
      if (err?.name !== "AbortError") filmStatus(chapter, "影片未能播放。", true);
    }
    updatePlayButton(chapter);
  });
  chapter.sound.addEventListener("click", () => {
    const shouldUnmute = video.muted || video.volume === 0;
    if (shouldUnmute && video.volume === 0) video.volume = 1;
    video.muted = !shouldUnmute;
    updateSoundButton(chapter);
  });
  video.addEventListener("volumechange", () => updateSoundButton(chapter));
  chapter.scroll.addEventListener("click", () => {
    chapter.linkScroll = !chapter.linkScroll;
    chapter.nextScrollTime = null;
    updateMotionButton(chapter);
    if (chapter.linkScroll) {
      if (!video.paused) video.pause();
      warmFilm(chapter);
      scheduleScroll();
    }
  });
  chapter.cues.forEach((button, index) => {
    button.addEventListener("click", () => {
      chapter.requested = true;
      chapter.nextScrollTime = null;
      chapter.linkScroll = false;
      updateMotionButton(chapter);
      updateCue(chapter, index);
      if (Number.isFinite(video.duration)) {
        seekFilm(chapter, cueStart(chapter, index));
      } else {
        chapter.pendingCue = index;
        filmStatus(chapter, "影片載入中。");
        warmFilm(chapter);
      }
    });
  });
  video.addEventListener("loadedmetadata", () => {
    if (chapter.pendingCue !== null) {
      seekFilm(chapter, cueStart(chapter, chapter.pendingCue));
      chapter.pendingCue = null;
    }
    filmStatus(chapter, "");
    scheduleScroll();
  });
  video.addEventListener("play", () => {
    chapter.nextScrollTime = null;
    chapter.linkScroll = false;
    updateMotionButton(chapter);
    for (const other of chapters) if (chapter !== other && !other.video.paused) other.video.pause();
    updatePlayButton(chapter);
  });
  video.addEventListener("pause", () => updatePlayButton(chapter));
  video.addEventListener("ended", () => updatePlayButton(chapter));
  video.addEventListener("timeupdate", () => updateCueFromTime(chapter));
  video.addEventListener("seeked", () => {
    updateCueFromTime(chapter);
    if (chapter.nextScrollTime !== null) {
      setTimeout(() => {
        if (chapter.nextScrollTime !== null && chapter === activeChapter) {
          seekWhenScrolling(chapter, chapter.nextScrollTime);
        }
      }, 105);
    }
  });
  video.addEventListener("error", () => {
    chapter.failed = true;
    filmStatus(chapter, "影片載入失敗。", true);
  });
  video.addEventListener("canplay", () => filmStatus(chapter, ""));
  video.addEventListener("waiting", () => {
    if (chapter.requested && !video.paused) filmStatus(chapter, "影片載入中。");
  });
}

let activeChapter = null;
let scrollFrame = null;

function updateScroll() {
  scrollFrame = null;
  const reach = header.offsetHeight + window.innerHeight * .25;
  const active = chapters.find((chapter) => {
    const bounds = chapter.section.getBoundingClientRect();
    return bounds.top <= reach && bounds.bottom > reach;
  }) || null;

  if (activeChapter !== active) {
    if (activeChapter) activeChapter.nextScrollTime = null;
    activeChapter = active;
    for (const link of navigation) {
      if (link.hash === "#" + active?.section.id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  }
  if (!active || !active.linkScroll || active.failed || planDialog.open || !active.video.paused) return;
  warmFilm(active);
  if (!Number.isFinite(active.video.duration)) return;
  const rect = active.section.getBoundingClientRect();
  const span = Math.max(260, rect.height - Math.min(window.innerHeight * .5, 450));
  const progress = (header.offsetHeight + 14 - rect.top) / span;
  const time = Math.min(1, Math.max(0, progress)) * Math.max(0, active.video.duration - .06);
  seekWhenScrolling(active, time);
}

function scheduleScroll() {
  if (scrollFrame === null) scrollFrame = requestAnimationFrame(updateScroll);
}
window.addEventListener("scroll", scheduleScroll, { passive: true });
window.addEventListener("resize", scheduleScroll, { passive: true });
window.addEventListener("hashchange", scheduleScroll);
showMotion.addEventListener("change", () => {
  for (const chapter of chapters) {
    if (!showMotion.matches) chapter.linkScroll = false;
    updateMotionButton(chapter);
  }
});
scheduleScroll();

function elevationText(plan) {
  if (Number.isFinite(plan.elevation)) return "EL " + plan.elevation.toFixed(2) + " m";
  if (Array.isArray(plan.elevations)) {
    return "EL " + plan.elevations.filter(Number.isFinite).map((value) => value.toFixed(2)).join("／") + " m";
  }
  return "";
}

function openPlan(plan, station) {
  const title = stationNames[station] + " " + plan.label;
  document.querySelector("#plan-dialog-title").textContent = title;
  planDialog.querySelector("[data-dialog-description]").textContent =
    [elevationText(plan), plan.source].filter(Boolean).join(" · ");
  dialogImage.alt = title;
  dialogImage.src = plan.src;
  dialogImage.parentElement.classList.remove("actual-size");
  zoomButton.setAttribute("aria-pressed", "false");
  zoomButton.textContent = "原尺寸";
  if (typeof planDialog.showModal === "function") planDialog.showModal();
  else window.open(plan.src, "_blank", "noopener");
}

zoomButton.addEventListener("click", () => {
  const actual = dialogImage.parentElement.classList.toggle("actual-size");
  zoomButton.setAttribute("aria-pressed", String(actual));
  zoomButton.textContent = actual ? "配合視窗" : "原尺寸";
});
planDialog.addEventListener("click", (event) => {
  if (event.target !== planDialog) return;
  const r = planDialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) {
    planDialog.close();
  }
});

function setupPlans(chapter, plans) {
  const panel = chapter.section.querySelector("[data-floor-panel]");
  if (!plans.length) {
    panel.textContent = "樓層圖目前無法載入。";
    return;
  }
  const select = document.createElement("select");
  select.setAttribute("aria-label", stationNames[chapter.station] + "樓層");
  plans.forEach((plan, i) => {
    const level = plan.level ? plan.level + " · " : "";
    select.add(new Option(level + plan.label, String(i)));
  });
  select.value = String(Math.max(0, plans.findIndex((plan) => plan.level === defaultFloor[chapter.station])));
  const thumbnail = document.createElement("button");
  thumbnail.className = "plan-thumb";
  thumbnail.type = "button";
  const image = new Image();
  image.loading = "lazy";
  image.decoding = "async";
  image.alt = "";
  thumbnail.append(image);
  const buttons = document.createElement("div");
  buttons.className = "plan-actions";
  const zoom = document.createElement("button");
  zoom.type = "button";
  zoom.textContent = "查看大圖";
  const link = document.createElement("a");
  link.textContent = "在 BIM 查看此層";
  buttons.append(zoom, link);
  const note = document.createElement("p");
  note.className = "plan-note";
  function selection() { return plans[Number(select.value)]; }
  function update() {
    const plan = selection();
    image.src = plan.src;
    thumbnail.setAttribute("aria-label", "查看 " + plan.label + " 大圖");
    note.textContent = [elevationText(plan), plan.source].filter(Boolean).join(" · ");
    link.hidden = !plan.level || plan.referenceOnly;
    link.href = bimHref(chapter.station, plan.level);
    thumbnail.hidden = false;
    zoom.hidden = false;
  }
  image.addEventListener("error", () => {
    thumbnail.hidden = true;
    zoom.hidden = true;
    note.textContent = "此張平面圖載入失敗。";
  });
  select.addEventListener("change", update);
  thumbnail.addEventListener("click", () => openPlan(selection(), chapter.station));
  zoom.addEventListener("click", () => openPlan(selection(), chapter.station));
  panel.replaceChildren(select, thumbnail, buttons, note);
  panel.removeAttribute("aria-live");
  update();
}

async function loadPlans() {
  let plans = readData("floor-plan-data");
  if (!Object.keys(plans).length) {
    try {
      const response = await fetch("./plans/plans.json");
      if (!response.ok) throw new Error("Floor plan manifest unavailable");
      plans = await response.json();
    } catch {
      plans = {};
    }
  }
  for (const chapter of chapters) {
    const entries = Array.isArray(plans[chapter.station]) ? plans[chapter.station] : [];
    setupPlans(chapter, entries.filter((plan) => typeof plan?.src === "string" && plan.src.startsWith("./plans/")));
  }
}

loadPlans();
