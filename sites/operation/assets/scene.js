import { nodes, total, groundPoints, groundElevation, railElevation, lineColor, lineZ,
  railSpacing, trainGeometry, water, waterAt, waterReference, lerp } from "./model.js?v=1.4";

const cos = Math.cos, sin = Math.sin;
const rim = ["#304a40", "#385448", "#416050", "#496652", "#536e56"];

export function canvasContext(canvas) {
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const resolution = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(width * resolution), h = Math.round(height * resolution);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
  return { ctx, width, height };
}

function viewFor(state, trains, planEnd) {
  const s = state.span;
  const defaultRange = s ? [s.start.ch - 45, s.end.ch + 38] : [-100, planEnd + 80];
  if (s?.number === 1) defaultRange[0] = -100;
  const tracked = state.follow ? trains[state.follow].ch : state.focus;
  let start = defaultRange[0], end = defaultRange[1];
  if (state.follow || state.view === "detail") {
    const span = state.view === "detail" ? 34 : 103;
    start = tracked - span;
    end = tracked + span;
  }
  const local = state.view === "detail", plan = state.view === "plan", side = state.view === "side";
  const pad = local ? 14 : state.follow ? 56 : s ? 70 : 106;
  return { start, end, tracked, local, lateral: pad,
    yaw: plan || side ? 0 : state.yaw,
    pitch: plan ? Math.PI / 2 : side ? 0 : state.pitch,
    relief: plan ? 1 : local || state.follow ? 1 : s ? 1.4 : 3.1 };
}

function projectFor(v, zoom, width, height) {
  const floor = [], ceiling = [];
  for (let i = 0; i <= 12; i++) {
    const x = lerp(v.start, v.end, i / 12);
    floor.push(groundElevation(x));
    ceiling.push(railElevation(x));
  }
  let low = Math.min(...floor) - 7, high = Math.max(...ceiling) + 13;
  if (v.local) {
    low = railElevation(v.tracked) - 9;
    high = railElevation(v.tracked) + 7;
  }
  const cx = (v.start + v.end) / 2, cy = (low + high) / 2;
  const cyaw = cos(v.yaw), syaw = sin(v.yaw), cpitch = cos(v.pitch), spitch = sin(v.pitch);
  const tilt = ([x, y, z]) => {
    const dx = x - cx, dy = (y - cy) * v.relief;
    const along = dx * syaw + z * cyaw;
    return [dx * cyaw - z * syaw, along * spitch - dy * cpitch, along * cpitch + dy * spitch];
  };
  const corners = [];
  for (const x of [v.start, v.end]) for (const y of [low, high]) {
    for (const z of [-v.lateral, v.lateral]) corners.push(tilt([x, y, z]));
  }
  const box = [0, 1].map(axis => Math.max(...corners.map(p => p[axis])) - Math.min(...corners.map(p => p[axis])));
  const scale = Math.min((width - 24) / Math.max(box[0], 1), (height - 32) / Math.max(box[1], 1)) * zoom;
  const project = item => {
    const [x, y, depth] = tilt(item);
    return { x: width / 2 + x * scale, y: height / 2 + y * scale + 5, depth };
  };
  return { project, scale };
}

const offsets = {
  terrain: [-1.7, 0], foundation: [-1.05, 0], station: [-.15, -1.05], anchor: [-.32, -2.2],
  rails: [0, .8], train: [-.78, 1.45], saddle: [.95, 0], portal: [1.8, 0]
};

class MeshFrame {
  constructor(context, project, state, size) {
    this.ctx = context;
    this.project = project;
    this.state = state;
    this.size = size;
    this.paint = [];
  }

  allow(part) { return !this.state.isolate || this.state.selection === part; }

  point(item, part) {
    const [x, y, z] = item;
    const [dy, dz] = offsets[part] ?? [0, 0];
    return this.project([x, y + dy * this.size, z + dz * this.size]);
  }

  polygon(points, color, part) {
    if (!this.allow(part)) return;
    const shape = points.map(point => this.point(point, part));
    const depth = shape.reduce((sum, p) => sum + p.depth, 0) / shape.length;
    this.paint.push({ shape, color, depth, part });
  }

  edge(points, color, width, part, dashed = false) {
    if (!this.allow(part)) return;
    const shape = points.map(point => this.point(point, part));
    const depth = shape.reduce((sum, p) => sum + p.depth, 0) / shape.length;
    this.paint.push({ shape, color, depth, width, part, dashed });
  }

  box(x0, x1, y0, y1, z0, z1, colors, part, ySlope = 0) {
    const p = [[x0,y0,z0],[x1,y0+ySlope,z0],[x1,y0+ySlope,z1],[x0,y0,z1],
      [x0,y1,z0],[x1,y1+ySlope,z0],[x1,y1+ySlope,z1],[x0,y1,z1]];
    const sides = [[0,1,2,3],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7],[4,5,6,7]];
    for (let i = 0; i < sides.length; i++) {
      this.polygon(sides[i].map(k => p[k]), colors[i % colors.length], part);
    }
  }

  flush() {
    const ctx = this.ctx;
    this.paint.sort((a, b) => a.depth - b.depth);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const entry of this.paint) {
      const { shape, color, width, part, dashed } = entry;
      ctx.globalAlpha = this.state.selection && this.state.selection !== part && part !== "terrain" ? .48 : 1;
      ctx.beginPath();
      ctx.moveTo(shape[0].x, shape[0].y);
      for (const p of shape.slice(1)) ctx.lineTo(p.x, p.y);
      if (width) {
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        if (dashed) ctx.setLineDash([3, 4]);
        ctx.stroke();
        if (dashed) ctx.setLineDash([]);
      } else {
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    this.paint.length = 0;
  }
}

function terrainHeight(x, z) {
  const hill = 3.0 * cos(x / 44 + z / 43) * Math.min(1, Math.abs(z) / 36)
    + 4 * sin(x / 170) * Math.min(1, Math.abs(z) / 33);
  const y = groundElevation(x) + hill;
  return waterAt(x) ? Math.min(y, waterReference - 1.25) : y;
}

function groundMesh(frame, v) {
  if (!frame.allow("terrain") || v.local) return;
  const a = Math.max(-120, v.start), b = Math.min(total + 96, v.end);
  const left = -v.lateral, right = v.lateral;
  const step = v.end - v.start > 900 ? 28 : 13;
  const critical = [
    a, b, ...groundPoints.map(p => p.ch),
    ...water.flatMap(w => [w.start, w.end]),
    ...Array.from({ length: Math.max(0, Math.ceil((b - a) / step) - 1) }, (_, i) => a + (i + 1) * step)
  ].filter(x => x >= a && x <= b).sort((x, y) => x - y);
  const xValues = [...new Set(critical)];
  const zValues = [left, left * .72, left * .45, left * .15, 0, right * .15, right * .45, right * .72, right];
  const vertex = (x, z) => [x, terrainHeight(x, z), z];
  for (let i = 1; i < xValues.length; i++) {
    const x0 = xValues[i - 1], x1 = xValues[i];
    for (let j = 1; j < zValues.length; j++) {
      const z0 = zValues[j - 1], z1 = zValues[j];
      const tint = (j + Math.floor(x0 / 70) + 40) % rim.length;
      frame.polygon([vertex(x0,z0), vertex(x1,z0), vertex(x1,z1), vertex(x0,z1)], rim[tint], "terrain");
    }
    for (const z of [left, right]) {
      frame.polygon([vertex(x0,z), vertex(x1,z), [x1,22,z], [x0,22,z]], "#253c36", "terrain");
    }
  }
  for (const band of water) {
    const x0 = Math.max(a, band.start), x1 = Math.min(b, band.end);
    if (x1 <= x0) continue;
    const xs = [x0, lerp(x0,x1,.24), lerp(x0,x1,.74), x1];
    const widths = [.49,.86,.73,.53].map(x => x * v.lateral);
    for (let i = 1; i < xs.length; i++) {
      const y = waterReference;
      frame.polygon([[xs[i-1],y,-widths[i-1]],[xs[i],y,-widths[i]],[xs[i],y,widths[i]],[xs[i-1],y,widths[i-1]]], "#315d70", "terrain");
      frame.edge([[xs[i-1],y+.13,4],[xs[i],y+.13,4]], "#73b3c479", .75, "terrain");
    }
  }
  frame.flush();
}

function openTrack(frame, v, planEnd, scale) {
  if (!frame.allow("rails")) return;
  const start = Math.max(-100, v.start), end = Math.min(total + 58, v.end);
  const stride = v.local ? 1.5 : 9;
  const t = [...Array.from({ length: Math.max(0, Math.ceil((end-start) / stride)) }, (_, i) => start + i * stride),
    ...nodes.map(n => n.ch).filter(n => n > start && n < end), end].sort((a,b)=>a-b);
  const stripe = Math.max(.62, Math.min(2.4, scale * .16));
  for (const [line, z] of Object.entries(lineZ)) {
    for (const lateral of [-railSpacing/2, railSpacing/2]) {
      for (let i = 1; i < t.length; i++) {
        const a = t[i-1], b = t[i];
        const running = planEnd === total || b <= planEnd;
        const color = running ? (v.local ? "#d4e2e3" : lineColor[line]) : "#a7b29e7a";
        if (v.local) {
          const y = railElevation(a);
          frame.box(a,b,y-.22,y,z+lateral-.1,z+lateral+.1,[color,"#83989f"],"rails",railElevation(b)-y);
        } else {
          frame.edge([[a, railElevation(a), z+lateral], [b, railElevation(b), z+lateral]], color, stripe, "rails", !running);
        }
      }
    }
  }
}

const solid = ["#77919b","#92abb3","#acc1c4","#819fa9","#9fb5b8","#d0dcd8"];
const concrete = ["#795c4a","#a38a72","#b9a084","#8d7766","#ac977f","#d0b795"];
const timber = ["#7c735d","#a99b7a","#b2a48a","#9a8a67","#aa9772","#d5c4a0"];
const glass = ["#436672","#719996","#96b8b2","#547d7d","#638e8e","#adc8be"];

function portal(frame, n, local) {
  const x = n.ch, top = n.ground + n.height, base = n.ground, y = n.rail;
  if (!local) {
    for (const z of [-4.6, 4.6]) {
      frame.box(x-2.55,x+2.55,base-1.6,base+.30,z-2.5,z+2.5,concrete,"foundation");
      frame.box(x-.95,x+.95,base+.3,top,z-.70,z+.70,solid,"portal");
    }
  } else {
    for (const z of [-4.6, 4.6]) frame.box(x-.95,x+.95,y-8.5,top,z-.70,z+.70,solid,"portal");
  }
  frame.box(x-1.05,x+1.05,top-1.25,top,-5.4,5.4,solid,"portal");
  for (const side of [-1,1]) {
    const bottom = local ? y - 7.5 : base + n.height * .48;
    frame.edge([[x+.05,bottom,side*4.6],[x+.05,top-1.1,-side*4.6]],"#b6c3c0",local?2.2:1.2,"portal");
  }
  const reach = n.id === "P1" ? 8.5 : 12.55;
  for (const z of Object.values(lineZ)) {
    const low = y+.82, high = top-1.14;
    for (const sign of [-1,1]) {
      frame.edge([[x,high,z],[x+sign*reach*.60,low,z]],"#e6b98c",local?2.4:1.4,"saddle");
    }
    for (let i = 1; i <= 12; i++) {
      const a = x - reach + (i - 1) * reach / 6, b = x - reach + i * reach / 6;
      frame.edge([[a,railElevation(a)+.66,z],[b,railElevation(b)+.66,z]],"#f7d5a8",local?2.4:1.55,"saddle");
      if (i % 2 === 0) {
        for (const d of [-railSpacing/2,railSpacing/2]) frame.edge([[b,railElevation(b)+.66,z],[b,railElevation(b)+.04,z+d]],"#d7b499",1,"saddle");
      }
    }
  }
}

function station(frame, n) {
  const x = n.ch, base = n.ground, y = n.rail;
  const [west,east,across] = {
    T1: [-59,13,14], T2: [-33,26,19], T3: [-37,31,25], T4: [-18,46,13]
  }[n.id];
  for (const z of [-across/2, across/2]) {
    frame.box(x+west+4,x+east-3,base,y-4,z-4,z+4,n.id==="T1"?timber:concrete,"station");
  }
  frame.box(x+west,x+east,y-3,y-2.05,-across*.69,across*.69,solid,"station");
  for (const z of [-across*.55, across*.55]) {
    frame.box(x+west+1,x+east-1,y-2.05,y+2.55,z-1.2,z+1.2,glass,"station");
  }
  frame.box(x+west+1,x+east-1,y+3.0,y+3.65,-across*.72,across*.72,n.id==="T1"?timber:solid,"station");
  const anchors = n.id === "T1" ? [x - 85] : [x + west + 3, x + east - 3];
  for (const anchor of anchors) {
    const z = across * .52;
    frame.box(anchor-4,anchor+4,base-.4,base+1.9,-z,z,concrete,"anchor");
    for (const side of [-1,1]) {
      const lateral = side * z * .74;
      frame.box(anchor-1.35,anchor+1.15,base+1.85,y+.5,lateral-1,lateral+1,concrete,"anchor");
      frame.polygon([[anchor+1.1,base+1.9,lateral+.89],[anchor+5.4,base+1.9,lateral+.89],
        [anchor+1.1,y-.45,lateral+.89]],"#c4a687","anchor");
    }
    frame.box(anchor-1.35,anchor+1.15,y-.3,y+1.28,-z,z,concrete,"anchor");
  }
}

function cabin(frame, center, z, local) {
  const g = trainGeometry, r = g.width/2, half = g.length/2;
  const section = [[-.57,-g.under], [.57,-g.under], [r,-1.58], [r,-.72],
    [r*.86,-.36], [.48,-.12], [-.48,-.12], [-r*.86,-.36], [-r,-.72], [-r,-1.58]];
  const profile = (s, taper) => section.map(([zv,y]) => [center+s,railElevation(center+s)+y*taper,z+zv*taper]);
  const rings = [profile(-half,.49),profile(-half+.78,1),profile(half-.78,1),profile(half,.49)];
  const paint = ["#c1d1d2","#e1ebe7","#dce9e8","#243c4a","#183342","#f4f4ec","#ecf2e8","#183342","#243c4a","#d3e4e2"];
  frame.polygon(rings[0],"#dbe9e7","train");
  frame.polygon(rings.at(-1),"#e6efea","train");
  for (let i = 1; i < rings.length; i++) {
    for (let j = 0; j < section.length; j++) {
      const k = (j+1)%section.length, l = rings[i-1], r = rings[i];
      frame.polygon([l[j],r[j],r[k],l[k]],paint[j],"train");
    }
  }
  const stripeHeight = -.84;
  for (const sign of [-1,1]) frame.edge([[-half+.78,sign],[half-.78,sign]].map(([x,s]) =>
    [center+x,railElevation(center+x)+stripeHeight,z+s*(g.width/2+.002)]),"#688eb4",local?1.4:.8,"train");
  const y = railElevation(center-.59);
  frame.box(center-.59,center+.59,y-.1,y+g.cover,z-.29,z+.29,solid,"train",railElevation(center+.59)-y);
  if (local) {
    for (const p of [-.83,.83]) for (const k of [-railSpacing/2,railSpacing/2]) {
      const w = center + p, level = railElevation(w-.23);
      frame.box(w-.23,w+.23,level,level+.36,z+k-.10,z+k+.10,["#415961","#506976","#bccdcd"],"train",railElevation(w+.23)-level);
    }
  }
}

function trainMesh(frame, v, trains, scale) {
  if (!frame.allow("train")) return;
  for (const train of Object.values(trains)) {
    if (train.ch < v.start - 17 || train.ch > v.end + 17) continue;
    const z = lineZ[train.line];
    if (scale < .52) {
      const l = ((train.cars - 1)*trainGeometry.pitch + trainGeometry.length)/2;
      const color = lineColor[train.line];
      frame.edge([[train.ch-l,railElevation(train.ch-l)-1,z],[train.ch+l,railElevation(train.ch+l)-1,z]],
        color,Math.max(3.4,scale*3.7),"train");
    } else {
      for (let i = 0; i < train.cars; i++) {
        cabin(frame, train.ch + (i - (train.cars - 1)/2)*trainGeometry.pitch,z,v.local);
      }
    }
  }
}

export function paintScene(canvas, state, trains, planEnd) {
  const {ctx,width,height} = canvasContext(canvas);
  if (width < 2 || height < 2) return [];
  const shade = ctx.createLinearGradient(0,0,0,height);
  shade.addColorStop(0,"#223940");
  shade.addColorStop(1,"#111f25");
  ctx.fillStyle = shade;
  ctx.fillRect(0,0,width,height);
  const v = viewFor(state, trains, planEnd), {project,scale} = projectFor(v,state.zoom,width,height);
  const size = state.explode * (v.local ? 5 : 15);
  const frame = new MeshFrame(ctx,project,state,size);
  groundMesh(frame,v);
  openTrack(frame,v,planEnd,scale);
  for (const n of nodes) {
    if (n.ch < v.start-34 || n.ch > v.end+48) continue;
    if (n.type === "station") station(frame,n);
    else portal(frame,n,v.local);
  }
  trainMesh(frame,v,trains,scale);
  frame.flush();
  const focus = state.follow ? trains[state.follow].ch : state.focus;
  if (!state.isolate && !v.local && focus >= v.start && focus <= v.end) {
    const pt = project([focus, railElevation(focus)+.28, 0]);
    const down = project([focus, waterAt(focus) ? waterReference : groundElevation(focus), 0]);
    ctx.strokeStyle="#eae3ad";ctx.lineWidth=1.2;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(pt.x,pt.y);ctx.lineTo(down.x,down.y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle="#eee2ad";ctx.beginPath();ctx.arc(pt.x,pt.y,3.2,0,Math.PI*2);ctx.fill();
  }
  const tags = [];
  if (!state.isolate || ["portal","station","saddle","foundation"].includes(state.selection)) {
    for (const n of nodes) {
      if (n.ch < v.start || n.ch > v.end || (v.local && n.type==="station")) continue;
      if (state.isolate && ((n.type === "station") !== (state.selection === "station"))) continue;
      const y = n.type==="pier" ? n.ground+n.height+.7 : n.rail+5.7;
      tags.push({id:n.id,...project([n.ch,y,0])});
    }
  }
  if (frame.allow("train")) {
    for (const t of Object.values(trains)) {
      if (t.ch >= v.start && t.ch <= v.end) {
        tags.push({id:t.id,...frame.point([t.ch,railElevation(t.ch)-4,lineZ[t.line]+1.5],"train")});
      }
    }
  }
  return tags.filter(p=>p.x>=17 && p.x<=width-17 && p.y>=36 && p.y<=height-32);
}
