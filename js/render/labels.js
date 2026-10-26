/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/labels.js
   Automatic label placement.

   Every component label gets a set of candidate positions around
   its component (below, above, sides, corners, and farther out
   with a leader line). Each candidate is scored by what it would
   cover: other labels, components, beams and the page edge. Labels
   are placed greedily, then refined in a few sweeps. Works in the
   2D views (page coordinates) and in 3D (screen coordinates of the
   projected scene). Manual positions are simply overwritten when
   you run it, and undo restores them.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib;
const L = RNBX.labels = {};

const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
/* does segment p→q cross rectangle r? (Liang–Barsky clip) */
const segHitsRect = (p, q, r) => {
  let t0 = 0, t1 = 1;
  const d = [q[0] - p[0], q[1] - p[1]];
  const chk = (pp, qq) => { if (pp === 0) return qq >= 0; const t = qq / pp; if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; } return true; };
  return chk(-d[0], p[0] - r[0]) && chk(d[0], r[2] - p[0]) && chk(-d[1], p[1] - r[1]) && chk(d[1], r[3] - p[1]) && t0 <= t1;
};

L.size = (obj, doc) => {
  const fs = U.pt2mm(obj.label.size || doc.style.fontSizePt || 7);
  const lines = RNBX.render.labelText(obj).split('\n');
  return { w: Math.max(...lines.map(l => RNBX.text.measure(l, fs))) + 0.6, h: lines.length * fs * 1.2, fs, lines: lines.length };
};

/* candidate centres around box B for a label of size w×h */
function candidates(B, w, h, gap) {
  const cx = (B[0] + B[2]) / 2, cy = (B[1] + B[3]) / 2, out = [];
  const add = (x, y, pref, far) => out.push({ x, y, pref, far });
  [[1, 0], [2.6, 1]].forEach(([k, far]) => {
    const g = gap * k + (far ? 3.5 : 0);
    add(cx, B[3] + g + h / 2, 0, far);                 // below
    add(cx, B[1] - g - h / 2, 0.4, far);               // above
    add(B[2] + g + w / 2, cy, 0.7, far);               // right
    add(B[0] - g - w / 2, cy, 0.7, far);               // left
    add(B[2] + g + w / 2, B[3] + g + h / 2, 1.6, far);  // corners
    add(B[0] - g - w / 2, B[3] + g + h / 2, 1.6, far);
    add(B[2] + g + w / 2, B[1] - g - h / 2, 1.8, far);
    add(B[0] - g - w / 2, B[1] - g - h / 2, 1.8, far);
  });
  return out;
}

/* core solver: items [{id, box, w, h, current:[x,y]}], obstacles boxes, beam lines, page */
function solve(items, boxes, lines, page) {
  const placed = {};
  const cost = (it, c) => {
    const r = [c.x - it.w / 2, c.y - it.h / 2, c.x + it.w / 2, c.y + it.h / 2];
    let k = c.pref * 3 + (c.far ? 14 : 0);
    // page edge
    const out = Math.max(0, page[0] - r[0]) + Math.max(0, r[2] - page[2]) + Math.max(0, page[1] - r[1]) + Math.max(0, r[3] - page[3]);
    k += out * 60;
    for (const id in placed) if (id !== it.id) k += overlap(r, placed[id]) * 45;
    for (const b of boxes) if (b.id !== it.id) k += overlap(r, b.box) * 30 + (overlap(r, b.box) > 0 ? 6 : 0);
    for (const ln of lines) if (segHitsRect(ln[0], ln[1], r)) k += 9;
    return { k, r };
  };
  const pick = it => {
    let best = null;
    for (const c of candidates(it.box, it.w, it.h, it.gap)) {
      const s = cost(it, c);
      if (!best || s.k < best.k) best = Object.assign({ c }, s);
    }
    placed[it.id] = best.r;
    it.result = best.c;
  };
  // crowded items first: they have the fewest good options
  items.forEach(it => { it.crowd = boxes.filter(b => b.id !== it.id && Math.hypot((b.box[0] + b.box[2]) / 2 - (it.box[0] + it.box[2]) / 2, (b.box[1] + b.box[3]) / 2 - (it.box[1] + it.box[3]) / 2) < 25).length; });
  items.slice().sort((a, b) => b.crowd - a.crowd).forEach(pick);
  for (let sweep = 0; sweep < 3; sweep++) items.forEach(it => { delete placed[it.id]; pick(it); });
  return items;
}

/* ---------- 2D ---------- */
L.arrange2D = doc => {
  const objs = doc.objects.filter(o => !o.hidden && o.label && o.label.show && o.label.text && lib.get(o.type) && !lib.get(o.type).annotation && !lib.get(o.type).connection);
  const boxes = doc.objects.filter(o => !o.hidden && lib.get(o.type) && !lib.get(o.type).connection && !lib.get(o.type).under)
    .map(o => ({ id: o.id, box: lib.worldBox(o) }));
  const tr = RNBX.trace(doc);
  const lines = tr.segments.filter(s => !s.vertical && s.len > 0.5).map(s => [s.a, s.b]);
  const items = objs.map(o => { const sz = L.size(o, doc); return { id: o.id, obj: o, box: lib.worldBox(o), w: sz.w, h: sz.h, gap: 1.1 }; });
  solve(items, boxes, lines, [0.5, 0.5, doc.page.width - 0.5, doc.page.height - 0.5]);
  items.forEach(it => {
    it.obj.label.dx = U.round(it.result.x - it.obj.x, 2);
    it.obj.label.dy = U.round(it.result.y - it.obj.y, 2);
    it.obj.label.leader = !!it.result.far;
  });
  return items.length;
};

/* place only one object's label, leaving every other label where it is */
L.placeOne = (doc, obj) => {
  if (!obj.label || !obj.label.show || !obj.label.text) return;
  const boxes = doc.objects.filter(o => !o.hidden && lib.get(o.type) && !lib.get(o.type).connection && !lib.get(o.type).under).map(o => ({ id: o.id, box: lib.worldBox(o) }));
  // existing labels count as obstacles too
  doc.objects.forEach(o => {
    if (o === obj || !o.label || !o.label.show || !o.label.text || !lib.get(o.type) || lib.get(o.type).annotation) return;
    const sz = L.size(o, doc), x = o.x + o.label.dx, y = o.y + o.label.dy;
    boxes.push({ id: 'lab:' + o.id, box: [x - sz.w / 2, y - sz.h / 2, x + sz.w / 2, y + sz.h / 2] });
  });
  const lines = RNBX.trace(doc).segments.filter(s => !s.vertical && s.len > 0.5).map(s => [s.a, s.b]);
  const sz = L.size(obj, doc);
  const it = { id: obj.id, box: lib.worldBox(obj), w: sz.w, h: sz.h, gap: 1.1 };
  solve([it], boxes, lines, [0.5, 0.5, doc.page.width - 0.5, doc.page.height - 0.5]);
  obj.label.dx = U.round(it.result.x - obj.x, 2);
  obj.label.dy = U.round(it.result.y - obj.y, 2);
  obj.label.leader = !!it.result.far;
};

/* ---------- 3D (screen space of the projected scene) ---------- */
L.arrange3D = doc => {
  const cam = RNBX.render3d.camera(doc);
  const bh = doc.view3d.beamHeight || 6;
  const info = {};
  doc.objects.forEach(o => {
    const def = lib.get(o.type);
    if (!def || o.hidden || def.annotation || def.connection || def.special) return;
    const faces = RNBX.render3d.objectFaces(o, doc);
    if (!faces.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, zmax = 0;
    faces.forEach(f => f.pts.forEach(q => { const s = cam.p(q[0], q[1], q[2]); x0 = Math.min(x0, s[0]); y0 = Math.min(y0, s[1]); x1 = Math.max(x1, s[0]); y1 = Math.max(y1, s[1]); zmax = Math.max(zmax, q[2]); }));
    info[o.id] = { box: [x0, y0, x1, y1], anchor: cam.p(o.x, o.y, zmax + 2.2) };
  });
  const tr = RNBX.trace(doc);
  const at = (s, u) => s.vertical ? cam.p(s.a[0], s.a[1], bh + s.za + (s.zb - s.za) * u) : cam.p(s.a[0] + (s.b[0] - s.a[0]) * u, s.a[1] + (s.b[1] - s.a[1]) * u, bh + (s.za || 0));
  const lines = tr.segments.filter(s => s.len > 0.5).map(s => [at(s, 0), at(s, 1)]);
  const objs = doc.objects.filter(o => info[o.id] && o.label && o.label.show && o.label.text);
  const boxes = Object.keys(info).map(id => ({ id, box: info[id].box }));
  const items = objs.map(o => { const sz = L.size(o, doc); return { id: o.id, obj: o, box: info[o.id].box, w: sz.w, h: sz.h, gap: 0.9, sz }; });
  solve(items, boxes, lines, [0.5, 0.5, doc.page.width - 0.5, doc.page.height - 0.5]);
  items.forEach(it => {
    // label3d draws the last line's baseline at the anchor; convert rect centre → anchor
    const a = info[it.id].anchor, fs = it.sz.fs;
    const baseY = it.result.y + it.h / 2 - fs * 0.32;
    it.obj.label.dx3 = U.round(it.result.x - a[0], 2);
    it.obj.label.dy3 = U.round(baseY - a[1], 2);
    it.obj.label.leader3 = !!it.result.far;
  });
  return items.length;
};

L.arrange = () => {
  const doc = RNBX.state.doc;
  RNBX.history.checkpoint();
  const n = doc.style.mode === '3d' ? L.arrange3D(doc) : L.arrange2D(doc);
  RNBX.changed();
  RNBX.toast(n ? `Arranged ${n} label${n === 1 ? '' : 's'} (Ctrl+Z to undo)` : 'No visible labels to arrange');
};

/* leader line from a component box to its label rectangle */
L.leader = (box, rect, color, width) => {
  const c = [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2], b = [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
  const clip = (from, to, r) => {
    const d = [to[0] - from[0], to[1] - from[1]];
    let t = 1;
    [[0, r[0]], [0, r[2]], [1, r[1]], [1, r[3]]].forEach(([i, edge]) => { if (Math.abs(d[i]) > 1e-9) { const tt = (edge - from[i]) / d[i]; if (tt > 0 && tt < t) { const o = from[1 - i] + d[1 - i] * tt; if (o >= r[i === 0 ? 1 : 0] - 1e-6 && o <= r[i === 0 ? 3 : 2] + 1e-6) t = tt; } } });
    return [from[0] + d[0] * t, from[1] + d[1] * t];
  };
  const p1 = clip(b, c, box), p2 = clip(c, b, rect);
  const pad = V.mul(V.norm(V.sub(p2, p1)), 0.4);
  const a = V.add(p1, pad), e = V.sub(p2, pad);
  if (V.dist(a, e) < 0.8) return '';
  return `<line x1="${U.round(a[0], 3)}" y1="${U.round(a[1], 3)}" x2="${U.round(e[0], 3)}" y2="${U.round(e[1], 3)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/><circle cx="${U.round(a[0], 3)}" cy="${U.round(a[1], 3)}" r="${U.round(width * 1.6, 3)}" fill="${color}"/>`;
};
})();
