import { createOperationCycle, operationAt } from "./cable-operation-model.js";

const assetVersion = new URL(import.meta.url).search;
const demo = document.querySelector("[data-operation-demo]");
if (demo) mountOperation(demo);

function formatClock(seconds) {
  const whole = Math.max(0, Math.floor(seconds + .0001));
  return `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
}

function mountOperation(root) {
  const names = [
    "config", "canvas", "scene", "panorama", "follow-label", "play", "time", "speed", "duration",
    "photo", "photo-label", "stop-type", "stop-name", "stop-detail", "stop-link", "status", "direction",
    "secondary", "clock", "announcement", "visual-message", "reset", "vista", "vista-label", "quick-play",
    "progress", "progress-clock", "playback-state",
  ];
  const controls = Object.fromEntries(names.map(name => [name, root.querySelector(`[data-operation-${name}]`)]));
  const { stations, segmentIds, panoramaPoints, distances, supports, speed, dwell, turnaround, animationRate } = JSON.parse(controls.config.textContent);
  const last = stations.length - 1;
  const cycles = [0, last].map(start => createOperationCycle(distances, speed, dwell, turnaround, start));
  const duration = cycles[0].duration;
  const routeLength = cycles[0].stations[last];
  const panoramaDistances = [0, supports[0], cycles[0].stations[1], cycles[0].stations[2], supports[1], routeLength];
  const stops = [...root.querySelectorAll("[data-operation-stop]")];
  const viewButtons = [...root.querySelectorAll("[data-operation-view]")];
  const cars = [...root.querySelectorAll("[data-operation-car]")];
  const mapCars = [...root.querySelectorAll("[data-operation-map-car]")];
  const startLink = document.querySelector("[data-operation-start]");
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let elapsed = 0;
  let playing = false;
  let inView = true;
  let lastTimestamp = null;
  let frame = null;
  let renderedStation = -1;
  let renderedSegment = -1;
  let view = "overview";
  let scene;
  let scenePending = false;
  let redraw = true;
  let resize = false;

  controls.duration.textContent = formatClock(duration);

  function setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }

  function setPlaying(next) {
    playing = next;
    lastTimestamp = null;
    setText(controls.play, next ? "暫停" : "播放");
    controls.play.setAttribute("aria-label", next ? "暫停運行" : "播放運行");
    setText(controls["quick-play"], next ? "暫停四站運行" : "播放四站運行");
    setText(controls["playback-state"], next ? "播放中" : "已暫停");
    root.classList.toggle("is-playing", next);
    schedule();
  }

  function startPlayback(reveal = false) {
    setPlaying(true);
    if (reveal) {
      const bounds = controls.progress.getBoundingClientRect();
      if (bounds.top < 0 || bounds.bottom > document.documentElement.clientHeight) {
        root.scrollIntoView({ block: "start", behavior: motion.matches ? "instant" : "smooth" });
        controls["quick-play"].focus({ preventScroll: true });
      }
    }
  }

  function togglePlayback() {
    if (playing) setPlaying(false);
    else startPlayback(true);
  }

  function brief(trip) {
    const here = stations[trip.from].code;
    if (trip.kind === "running") return `${here} → ${stations[trip.to].code} 行駛中`;
    return `${here} ${trip.kind === "stopped" ? "中途停靠" : "端站折返"}`;
  }

  function showStation(index) {
    if (renderedStation === index) return;
    renderedStation = index;
    const station = stations[index];
    controls.photo.src = station.photo;
    controls.photo.alt = station.alt;
    setText(controls["photo-label"], station.label);
    setText(controls["stop-type"], station.stopType);
    setText(controls["stop-name"], `${station.code} ${station.name}`);
    setText(controls["stop-detail"], station.detail);
    controls["stop-link"].href = station.url;
    for (const [i, button] of stops.entries()) {
      if (i === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    }
  }

  function updateScenicLink(trip) {
    const segment = trip.kind === "running" ? Math.min(trip.from, trip.to)
      : Math.min(last - 1, Math.max(0, trip.from + (trip.direction < 0 ? -1 : 0)));
    if (renderedSegment === segment) return;
    renderedSegment = segment;
    controls.vista.hash = segmentIds[segment];
    setText(controls["vista-label"], `看 ${stations[segment].code}–${stations[segment + 1].code} 車窗景觀`);
  }

  function positionMapCar(car, trip, index) {
    const nextIndex = panoramaDistances.findIndex(distance => distance > trip.meters);
    const to = nextIndex === -1 ? panoramaDistances.length - 1 : nextIndex;
    const from = to - 1;
    const progress = (trip.meters - panoramaDistances[from]) / (panoramaDistances[to] - panoramaDistances[from]);
    const [startX, startY] = panoramaPoints[from];
    const [endX, endY] = panoramaPoints[to];
    const offset = index === 0 ? -.6 : .6;
    car.style.left = `${startX + (endX - startX) * progress + offset}%`;
    car.style.top = `${startY + (endY - startY) * progress}%`;
    car.classList.toggle("stopped", trip.stopped);
  }

  function render(trips) {
    const leader = trips[0];
    const from = stations[leader.from];
    const to = stations[leader.to];
    const direction = stations[leader.direction > 0 ? last : 0].name;
    const countdown = Math.ceil(leader.secondsLeft);
    const heading = elapsed === 0 ? `${from.code} ${from.name}準備出發`
      : leader.kind === "running" ? `${from.code} → ${to.code} 行駛中`
        : `${from.code} ${from.name}${leader.kind === "stopped" ? "停靠" : "折返"}`;
    const directionText = leader.kind === "stopped" ? `可下車或原車續乘 · ${countdown} 秒後發車`
      : leader.kind === "turnaround" ? `${countdown} 秒後往${direction}出發` : `往${direction} · ${countdown} 秒後到站`;
    setText(controls.status, heading);
    setText(controls.direction, elapsed === 0 ? `往${direction}` : directionText);
    setText(controls.secondary, elapsed === 0 ? "由 T4 準備出發" : brief(trips[1]));
    const clock = formatClock(elapsed);
    setText(controls.clock, clock);
    setText(controls["progress-clock"], clock);
    const value = String(Math.round(elapsed / duration * 1000));
    if (controls.time.value !== value) controls.time.value = value;
    const description = `${clock}，${heading}`;
    if (controls.time.getAttribute("aria-valuetext") !== description) controls.time.setAttribute("aria-valuetext", description);
    showStation(leader.from);
    updateScenicLink(leader);
    for (const [index, trip] of trips.entries()) {
      cars[index].style.left = `${trip.meters * 100 / routeLength}%`;
      cars[index].classList.toggle("reverse", trip.direction < 0);
      cars[index].classList.toggle("stopped", trip.kind !== "running");
      positionMapCar(mapCars[index], trip, index);
    }
  }

  const currentTrips = () => cycles.map(cycle => operationAt(cycle, elapsed));

  function schedule() {
    if (frame === null && !document.hidden && (redraw || (playing && inView))) frame = requestAnimationFrame(tick);
  }

  function tick(timestamp) {
    frame = null;
    const moving = playing && inView;
    const sinceLast = lastTimestamp === null ? 0 : timestamp - lastTimestamp;
    if (!redraw && (!moving || (lastTimestamp !== null && sinceLast < 1000 / 24))) {
      schedule();
      return;
    }
    if (moving) elapsed = (elapsed + sinceLast / 1000 * animationRate * Number(controls.speed.value)) % duration;
    lastTimestamp = moving ? timestamp : null;
    redraw = false;
    const trips = currentTrips();
    render(trips);
    if (view === "follow" && scene) {
      try {
        if (resize) scene.resize();
        scene.draw(trips, "follow");
      } catch {
        fallbackView();
      }
    }
    resize = false;
    schedule();
  }

  function seek(value, announce = false) {
    setPlaying(false);
    elapsed = value;
    render(currentTrips());
    if (announce) setText(controls.announcement, controls.status.textContent);
    redraw = true;
    schedule();
  }

  function showView(next) {
    view = next;
    const following = next === "follow" && Boolean(scene);
    controls.canvas.hidden = !following;
    controls.panorama.hidden = following;
    controls["follow-label"].hidden = !following;
    for (const button of viewButtons) button.setAttribute("aria-pressed", String(button.dataset.operationView === next));
    resize = true;
    redraw = true;
    schedule();
  }

  function fallbackView() {
    showView("overview");
    const followButton = viewButtons.find(button => button.dataset.operationView === "follow");
    if (document.activeElement === followButton) viewButtons[0].focus();
    followButton.hidden = true;
    controls["visual-message"].textContent = "此裝置使用全線總覽。播放、停靠與選站可照常操作。";
    controls["visual-message"].hidden = false;
  }

  async function changeView(next) {
    showView(next);
    if (next !== "follow" || scene || scenePending) return;
    scenePending = true;
    const message = controls["visual-message"];
    message.textContent = "載入立體跟車畫面…";
    message.hidden = false;
    try {
      const { createScene } = await import(`./cable-operation-scene.js${assetVersion}`);
      scene = createScene(controls.canvas, cycles[0].stations, supports, []);
      message.hidden = true;
      showView(view);
    } catch {
      fallbackView();
    } finally {
      scenePending = false;
    }
  }

  startLink?.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey) return;
    startPlayback();
    controls["quick-play"].focus({ preventScroll: true });
  });
  controls.play.addEventListener("click", togglePlayback);
  controls["quick-play"].addEventListener("click", togglePlayback);
  controls.reset.addEventListener("click", () => {
    seek(0, true);
    startPlayback(true);
  });
  controls.time.addEventListener("pointerdown", () => setPlaying(false));
  controls.time.addEventListener("input", () => seek(Math.min(duration - .01, Number(controls.time.value) * duration / 1000)));
  controls.time.addEventListener("change", () => setText(controls.announcement, controls.status.textContent));
  controls.speed.addEventListener("change", () => {
    lastTimestamp = null;
    redraw = true;
    schedule();
  });
  stops.forEach((button, index) => {
    const time = index === 0 ? 0 : cycles[0].arrivals.get(index);
    button.addEventListener("click", () => seek(time, true));
  });
  viewButtons.forEach(button => button.addEventListener("click", () => changeView(button.dataset.operationView)));

  document.addEventListener("visibilitychange", () => {
    lastTimestamp = null;
    schedule();
  });
  motion.addEventListener?.("change", event => {
    if (event.matches) setPlaying(false);
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      lastTimestamp = null;
      schedule();
    }).observe(root);
  }
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      resize = true;
      redraw = true;
      schedule();
    }).observe(controls.scene);
  }

  root.querySelectorAll("[data-operation-interactive]").forEach(part => { part.hidden = false; });
  showView("overview");
  render(currentTrips());
  if (startLink && location.hash === startLink.hash && !motion.matches) startPlayback();
}
