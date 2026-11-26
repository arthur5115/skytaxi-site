const EPSILON = 1e-6;

export class PlanView {
  constructor(canvas, scale, report) {
    this.canvas = canvas;
    this.scale = scale;
    this.report = report;
    this.context = canvas.getContext('2d');
    this.layers = new Set();
    this.showNotes = true;
    this.highlight = false;
    this.pointers = new Map();
    this.frame = 0;
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(canvas);
    this.bind();
  }

  async open(sheet) {
    this.request?.abort();
    this.clear();
    const request = new AbortController();
    this.request = request;
    this.report('載入樓層平面圖', false);
    try {
      const response = await fetch(new URL(`plans/${sheet.file}.json`, import.meta.url), {signal: request.signal});
      if (!response.ok) throw new Error('Drawing unavailable');
      const drawing = await response.json();
      if (request.signal.aborted) return;
      this.data = drawing;
      this.layers = new Set(drawing.features);
      this.report('', true);
      this.fit();
    } catch (error) {
      if (!request.signal.aborted) this.report('平面圖載入失敗。可從匯出選單開啟原圖。', false);
    }
  }

  clear() {
    this.request?.abort();
    this.data = null;
    this.refresh();
  }

  fit() {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (!w || !h) return;
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(w * ratio);
    this.canvas.height = Math.round(h * ratio);
    this.width = w;
    this.height = h;
    this.ratio = ratio;
    if (this.data) {
      const [x0, y0, x1, y1] = this.data.extent;
      const margin = Math.min(70, w * .10, h * .12);
      this.fitScale = Math.min((w - 2 * margin) / (x1 - x0), (h - 2 * margin) / (y1 - y0));
      this.zoom = this.fitScale;
      this.x = w / 2 - (x0 + x1) / 2 * this.zoom;
      this.y = h / 2 + (y0 + y1) / 2 * this.zoom;
    }
    this.refresh();
  }

  zoomBy(factor, x = this.width / 2, y = this.height / 2) {
    if (!this.data) return;
    const next = Math.max(this.fitScale * .55, Math.min(this.fitScale * 18, this.zoom * factor));
    this.x = x - (x - this.x) * next / this.zoom;
    this.y = y - (y - this.y) * next / this.zoom;
    this.zoom = next;
    this.refresh();
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.refresh();
  }

  setLayer(key, visible) {
    if (visible) this.layers.add(key);
    else this.layers.delete(key);
    this.refresh();
  }

  markFeatures(visible) {
    this.highlight = visible;
    this.refresh();
  }

  showLabels(visible) {
    this.showNotes = visible;
    this.refresh();
  }

  refresh() {
    if (!this.frame) this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.draw();
    });
  }

  trace(points, closed = false) {
    const ctx = this.context;
    ctx.moveTo(points[0] * this.zoom + this.x, -points[1] * this.zoom + this.y);
    for (let i = 2; i < points.length; i += 2) {
      ctx.lineTo(points[i] * this.zoom + this.x, -points[i + 1] * this.zoom + this.y);
    }
    if (closed) ctx.closePath();
  }

  drawGrid() {
    const ctx = this.context;
    const unit = 10 ** Math.floor(Math.log10(76 / this.zoom));
    const step = [1, 2, 5, 10].map(d => d * unit).find(d => d * this.zoom >= 50);
    const pixels = step * this.zoom;
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e1e9e5';
    ctx.beginPath();
    for (let x = this.x % pixels; x < this.width; x += pixels) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = this.y % pixels; y < this.height; y += pixels) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
    this.scale.querySelector('span').textContent = `${Number(step.toPrecision(2))} m`;
    this.scale.querySelector('i').style.width = `${pixels}px`;
  }

  draw() {
    const ctx = this.context;
    ctx.setTransform(this.ratio || 1, 0, 0, this.ratio || 1, 0, 0);
    ctx.fillStyle = '#f8fbf9';
    ctx.fillRect(0, 0, this.width, this.height);
    if (!this.data || this.zoom < EPSILON) return;
    this.drawGrid();
    const enabled = key => !key || this.layers.has(key);
    for (const [color, key, outlines, opacity] of this.data.fills) {
      if (!enabled(key)) continue;
      ctx.fillStyle = color;
      ctx.globalAlpha = opacity * (this.highlight && !key ? .38 : 1);
      ctx.beginPath();
      outlines.forEach(points => this.trace(points, true));
      ctx.fill('evenodd');
    }
    ctx.lineJoin = 'round';
    for (const [color, key, weight, closed, points] of this.data.lines) {
      if (!enabled(key)) continue;
      ctx.strokeStyle = color;
      ctx.lineWidth = weight * (this.highlight && key ? 1.65 : 1);
      ctx.globalAlpha = this.highlight && !key ? .30 : 1;
      ctx.beginPath();
      this.trace(points, closed);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!this.showNotes) return;
    ctx.textBaseline = 'alphabetic';
    for (const [color, key, x, y, height, rotation, align, text] of this.data.labels) {
      if (!enabled(key) || height * this.zoom < 4.8) continue;
      ctx.save();
      ctx.translate(x * this.zoom + this.x, -y * this.zoom + this.y);
      if (rotation) ctx.rotate(-rotation * Math.PI / 180);
      ctx.fillStyle = color;
      ctx.globalAlpha = this.highlight && !key ? .50 : 1;
      ctx.font = `${height * 1.14 * this.zoom}px "Noto Sans TC", "Noto Sans CJK TC", sans-serif`;
      ctx.textAlign = align;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  bind() {
    const canvas = this.canvas;
    const position = event => {
      const rect = canvas.getBoundingClientRect();
      return [event.clientX - rect.left, event.clientY - rect.top];
    };
    canvas.addEventListener('wheel', event => {
      if (!this.data) return;
      event.preventDefault();
      this.zoomBy(Math.exp(-Math.sign(event.deltaY) * .13), ...position(event));
    }, {passive: false});
    canvas.addEventListener('pointerdown', event => {
      if (!this.data || event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      this.pointers.set(event.pointerId, position(event));
    });
    canvas.addEventListener('pointermove', event => {
      const before = this.pointers.get(event.pointerId);
      if (!before) return;
      const after = position(event);
      const partner = Array.from(this.pointers).find(([id]) => id !== event.pointerId)?.[1];
      if (partner) {
        const start = Math.hypot(before[0] - partner[0], before[1] - partner[1]);
        const end = Math.hypot(after[0] - partner[0], after[1] - partner[1]);
        this.zoomBy(end / Math.max(start, 4), (before[0] + partner[0]) / 2, (before[1] + partner[1]) / 2);
        this.move((after[0] - before[0]) / 2, (after[1] - before[1]) / 2);
      } else this.move(after[0] - before[0], after[1] - before[1]);
      this.pointers.set(event.pointerId, after);
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) {
      canvas.addEventListener(event, data => this.pointers.delete(data.pointerId));
    }
    const navigation = {
      '+': () => this.zoomBy(1.23), '=': () => this.zoomBy(1.23), '-': () => this.zoomBy(1 / 1.23),
      Home: () => this.fit(),
      ArrowLeft: () => this.move(30, 0), ArrowRight: () => this.move(-30, 0),
      ArrowUp: () => this.move(0, 30), ArrowDown: () => this.move(0, -30),
    };
    canvas.addEventListener('keydown', event => {
      if (!this.data || !Object.hasOwn(navigation, event.key)) return;
      event.preventDefault();
      navigation[event.key]();
    });
  }
}
