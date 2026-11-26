(() => {
  const data = window.hutoupiSiteMap;
  const NS = "http://www.w3.org/2000/svg";
  const offline = document.querySelector("#offline-map");
  const googleHost = document.querySelector("#google-map");
  const side = document.querySelector("#place-detail");
  const summary = side.innerHTML;
  const zoomIn = document.querySelector("#zoom-in");
  const zoomOut = document.querySelector("#zoom-out");
  const keyField = document.querySelector("#google-key");
  const loadGoogle = document.querySelector("#load-google");
  const showOffline = document.querySelector("#show-offline");
  const status = document.querySelector("#google-status");
  const credit = document.querySelector("#map-credit");
  const offlineCredit = credit.textContent;
  const layerInputs = Array.from(document.querySelectorAll("[data-layer]"));
  const colors = {
    route: "#76edef",
    axis: "#fdf9f0",
    building: "#ffc279",
    cad: "#b7edff",
    point: "#fffaf0",
  };
  let active = "all";
  let svg;
  let zoom = 1;
  let camera;
  let dragging;
  let googleMap;
  let googleVisible = false;
  let googleImages = [];
  let googleTimer;
  let googleModeLoaded = false;

  function node(tag, attributes) {
    const element = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    return element;
  }

  function cameraView() {
    const {width, height} = data.views[active];
    const w = width / zoom;
    const h = height / zoom;
    camera.x = Math.min(width - w, Math.max(0, camera.x));
    camera.y = Math.min(height - h, Math.max(0, camera.y));
    svg.setAttribute("viewBox", [camera.x, camera.y, w, h].join(" "));
    zoomOut.disabled = zoom <= 1;
    zoomIn.disabled = zoom >= 4;
    offline.dataset.pannable = String(zoom > 1);
  }

  function changeZoom(amount) {
    const {width, height} = data.views[active];
    const oldZoom = zoom;
    zoom = Math.max(1, Math.min(4, zoom * amount));
    camera.x += (width / oldZoom - width / zoom) / 2;
    camera.y += (height / oldZoom - height / zoom) / 2;
    cameraView();
  }

  function renderOffline() {
    const region = data.views[active];
    const {width, height, bounds} = region;
    const [west, south, east, north] = bounds;
    const project = ([x, y]) => [width * (x - west) / (east - west), height * (north - y) / (north - south)];
    const position = coords => project(coords).map(value => value.toFixed(2)).join(",");
    svg = node("svg", {role:"group","aria-label":"可選取站點的規劃地圖"});
    svg.append(node("image", {href:"assets/map-" + active.toLowerCase() + ".webp", width, height}));
    const groups = {};
    for (const field of ["route", "material", "building", "cad", "point"]) {
      groups[field] = node("g", {"data-map-layer":field});
      svg.append(groups[field]);
    }
    for (const [station, bounds] of Object.entries(data.render_bounds)) {
      if (active !== "all" && station !== active) continue;
      const [x, y] = project([bounds[0], bounds[3]]);
      const [right, bottom] = project([bounds[2], bounds[1]]);
      groups.material.append(node("image", {
        href:"assets/" + station.toLowerCase() + "-roof.webp",
        x, y, width:right - x, height:bottom - y,
      }));
    }
    for (const feature of data.projected) {
      const {layer, station, name} = feature.properties;
      const {type, coordinates} = feature.geometry;
      if (station && active !== "all" && station !== active) continue;
      if (type === "Point") {
        const [cx, cy] = project(coordinates);
        const selectable = Boolean(data.stations[station]);
        const mark = node("g", {transform:"translate(" + cx + " " + cy + ")"});
        const title = node("title", {});
        title.textContent = name;
        mark.append(title);
        if (selectable) {
          mark.setAttribute("class", "point-control");
          mark.setAttribute("data-location", station);
          mark.setAttribute("role", "button");
          mark.setAttribute("aria-label", name + " 航照放大");
          mark.setAttribute("tabindex", "0");
        }
        mark.append(node("circle", {r:4, fill:colors.point, stroke:"#213b33", "stroke-width":1.2}));
        const dy = station.startsWith("P") ? 8 : -20;
        mark.append(node("rect",{x:7,y:dy,width:23,height:14,rx:2,class:"point-card",
          fill:"#213b33",stroke:"#fdf9f0","stroke-width":.65}));
        const label = node("text", {x:11, y:dy+10.5, fill:colors.point, "font-size":9, "font-weight":750});
        label.textContent = station;
        mark.append(label);
        groups.point.append(mark);
        continue;
      }
      const strokeWidth = {route:1.05, axis:.65, building:1.2, cad:.80}[layer];
      const style = {stroke:colors[layer], "stroke-width":strokeWidth, "stroke-linejoin":"round",
        "stroke-linecap":"round", fill:"none", opacity:layer === "axis" ? .7 : .93};
      if (type === "Polygon") {
        const path = coordinates.map(ring => "M" + ring.map(position).join(" L") + " Z").join(" ");
        groups.building.append(node("path", {...style, d:path, fill:colors.building, "fill-opacity":.11,
          "fill-rule":"evenodd"}));
      } else {
        groups[layer === "axis" ? "route" : layer].append(
          node("polyline", {...style, points:coordinates.map(position).join(" ")}));
      }
    }
    offline.replaceChildren(svg);
    offline.setAttribute("aria-label", active === "all" ? "全線航照與規劃線形" :
      active + " " + data.stations[active].name + " 航照與規劃疊位");
    offline.removeAttribute("role");
    zoom = 1;
    camera = {x:0,y:0};
    cameraView();
    applyLayers();
  }

  function esc(value) {
    return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;")
      .replaceAll(">","&gt;").replaceAll('"',"&quot;");
  }

  function renderDetail() {
    if (active === "all") {
      side.innerHTML = summary;
      return;
    }
    const site = data.stations[active];
    const {wgs84_lon_lat:[lon, lat], twd97:[east, north]} = data.nodes.find(x => x.code === active);
    const code = active.toLowerCase();
    const caption = active + " " + site.name;
    const query = encodeURIComponent(lat.toFixed(8) + "," + lon.toFixed(8));
    side.innerHTML =
      '<h2>' + esc(caption) + '</h2><img class="location-hero" src="assets/' + code +
      '-finish.webp" alt="' + esc(caption) + '外觀材質模擬"><dl><dt>線形里程</dt><dd>CH ' +
      site.chain_m.toLocaleString("en-US", {minimumFractionDigits:1}) + ' m</dd><dt>CAD 疊圖</dt><dd>' +
      esc(site.drawing) + ' · EL ' + site.elevation.toFixed(2) + ' m</dd><dt>TWD97 TM2</dt><dd>E ' +
      east.toFixed(1) + '　N ' + north.toFixed(1) + '</dd><dt>WGS84 經緯度</dt><dd>' +
      lat.toFixed(7) + '° N<br>' + lon.toFixed(7) + '° E</dd></dl><div class="place-links">' +
      '<a class="action primary" href="stations/' + code + '.html">查看本站 CAD 與材質</a>' +
      '<a class="action" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;query=' +
      query + '">在 Google 地圖查看站位 ↗</a></div>';
  }

  function layerStates() {
    return Object.fromEntries(layerInputs.map(input => [input.dataset.layer, input.checked]));
  }

  function applyLayers() {
    const layers = layerStates();
    for (const group of offline.querySelectorAll("[data-map-layer]")) {
      group.style.display = layers[group.dataset.mapLayer] ? "" : "none";
    }
    if (!googleMap) return;
    googleMap.data.setStyle(feature => {
      const layer = feature.getProperty("layer");
      const station = feature.getProperty("station");
      return {
        visible: layers[layer === "axis" ? "route" : layer] &&
          (!station || active === "all" || station === active),
        strokeColor:colors[layer], strokeWeight:layer === "route" ? 2.3 : 1.35,
        strokeOpacity:layer === "axis" ? .60 : .95,
        fillColor:colors[layer], fillOpacity:googleVisible && layers.material ? .13 : .45,
        title:feature.getProperty("name"),
        zIndex:layer === "point" ? 8 : layer === "cad" ? 5 : 2,
      };
    });
    for (const item of googleImages) {
      item.overlay.setMap(googleVisible && layers.material && (active === "all" || active === item.code)
        ? googleMap : null);
    }
  }

  function fitGoogle() {
    if (googleMap && googleVisible) googleMap.fitBounds(data.views[active].google_bounds, 24);
  }

  function select(code, updateAddress) {
    if (!data.views[code]) return;
    active = code;
    for (const tab of document.querySelectorAll(".map-views [data-location]")) {
      tab.setAttribute("aria-pressed", String(tab.dataset.location === active));
    }
    renderDetail();
    renderOffline();
    fitGoogle();
    if (updateAddress && location.hash.slice(1) !== code) location.hash = code;
  }

  function showGoogle(value) {
    googleVisible = value;
    googleHost.hidden = !value;
    offline.hidden = value;
    document.querySelector("#offline-tools").hidden = value;
    document.querySelector("#offline-north").hidden = value;
    showOffline.hidden = !value;
    loadGoogle.disabled = value;
    credit.textContent = value ? "Google 即時衛星底圖。規劃圖層採 CS-02 和四站 V1.6 站體模型。" : offlineCredit;
    applyLayers();
    fitGoogle();
  }

  function googleError(message) {
    clearTimeout(googleTimer);
    keyField.value = "";
    loadGoogle.disabled = false;
    if (googleVisible) showGoogle(false);
    status.textContent = message;
  }

  window.gm_authFailure = () => googleError("Google 未接受此金鑰。請確認 API、帳單與網域設定後重新整理。");

  window.initHutoupiGoogleMap = async () => {
    try {
      await google.maps.importLibrary("maps");
      clearTimeout(googleTimer);
      googleMap = new google.maps.Map(googleHost, {
        center:{lat:23.0299,lng:120.3445}, zoom:15, mapTypeId:"satellite",
        tilt:0, heading:0, streetViewControl:false, rotateControl:false, gestureHandling:"cooperative",
      });
      googleMap.data.addGeoJson(data.geographic);
      googleMap.data.addListener("click", ({feature}) => {
        const station = feature.getProperty("station");
        if (feature.getProperty("layer") === "point" && data.stations[station]) select(station, true);
      });
      googleImages = Object.entries(data.google_roofs).map(([code, bounds]) => ({
        code, overlay:new google.maps.GroundOverlay(
          new URL("assets/" + code.toLowerCase() + "-roof-mercator.webp", document.baseURI).href, bounds),
      }));
      googleModeLoaded = true;
      keyField.value = "";
      keyField.required = false;
      status.textContent = "已切換 Google 衛星。可切換上方站別與圖層。";
      loadGoogle.textContent = "切換到 Google 衛星";
      showGoogle(true);
    } catch {
      googleError("Google 地圖初始化失敗。仍可在 Google 我的地圖匯入 KML。");
    }
  };

  document.querySelector("#google-form").addEventListener("submit", event => {
    event.preventDefault();
    if (googleModeLoaded) {
      showGoogle(true);
      return;
    }
    if (location.protocol === "file:") {
      status.textContent = "即時衛星底圖需從網站載入。現在可使用上方航照或把 KML 匯入 Google 我的地圖。";
      return;
    }
    const secret = keyField.value.trim();
    if (!secret) return;
    status.textContent = "載入 Google 衛星底圖中。";
    loadGoogle.disabled = true;
    const script = document.createElement("script");
    const endpoint = new URL("https://maps.googleapis.com/maps/api/js");
    endpoint.search = new URLSearchParams({key:secret, loading:"async", callback:"initHutoupiGoogleMap",
      v:"weekly", language:"zh-TW", region:"TW"});
    script.src = endpoint.href;
    script.async = true;
    script.onerror = () => {
      script.remove();
      googleError("衛星底圖連線失敗。請確認網路後重試。");
    };
    googleTimer = setTimeout(() => {
      script.remove();
      googleError("衛星底圖連線逾時。請重新整理後再試。");
    },20000);
    document.head.append(script);
  });
  showOffline.addEventListener("click", () => showGoogle(false));

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-location]");
    if (!button) return;
    select(button.dataset.location, true);
    if (!button.isConnected) document.querySelector('.map-views [aria-pressed="true"]').focus();
  });
  offline.addEventListener("keydown", event => {
    const button = event.target.closest("[data-location]");
    if (button && ["Enter", " "].includes(event.key)) {
      event.preventDefault();
      select(button.dataset.location, true);
      document.querySelector('.map-views [aria-pressed="true"]').focus();
    }
  });
  for (const control of layerInputs) control.addEventListener("change", applyLayers);
  zoomIn.addEventListener("click", () => changeZoom(1.45));
  zoomOut.addEventListener("click", () => changeZoom(1 / 1.45));
  offline.addEventListener("pointerdown", event => {
    if (zoom === 1 || event.button !== 0 || event.target.closest("[data-location]")) return;
    const scale = svg.getScreenCTM().a;
    dragging = {id:event.pointerId, x:event.clientX, y:event.clientY, scale};
    offline.setPointerCapture(event.pointerId);
    offline.classList.add("dragging");
  });
  offline.addEventListener("pointermove", event => {
    if (!dragging || dragging.id !== event.pointerId) return;
    camera.x += (dragging.x - event.clientX) / dragging.scale;
    camera.y += (dragging.y - event.clientY) / dragging.scale;
    dragging.x = event.clientX;
    dragging.y = event.clientY;
    cameraView();
  });
  offline.addEventListener("lostpointercapture", () => {
    dragging = null;
    offline.classList.remove("dragging");
  });
  window.addEventListener("hashchange", () => {
    const code = location.hash.slice(1);
    if (active !== code) select(data.views[code] ? code : "all", false);
  });
  const initial = location.hash.slice(1);
  select(data.views[initial] ? initial : "all", false);
})();
