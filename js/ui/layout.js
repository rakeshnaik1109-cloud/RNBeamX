/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/layout.js
   Smarter layout:
   • Tidy setup: optics sitting slightly off their beam are put
     exactly on it; parts along one straight beam that are almost
     evenly spaced (within 15 %) become evenly spaced; labels are
     re-placed. Parts never move by more than that, so lens
     distances (the optics) stay as you set them.
   • Fit to a journal width: scales the whole figure to a column
     width while type sizes and line weights stay as they are; the
     figure scale is adjusted so the optics stay identical.
   • Equal-spacing guides while dragging (see smartSnap).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib, S = RNBX.state;
const LY = RNBX.layout = {};

/* ---------- Tidy ---------- */
LY.tidy = () => {
  const doc = S.doc;
  if (doc.style.mode === '3d') { RNBX.toast('Tidy works in the 2D views (Schematic or Shaded)'); return; }
  RNBX.history.checkpoint();
  const tr = RNBX.trace(doc);
  const segs = tr.segments.filter(s => !s.ghost && !s.vertical && s.len > 2 && s.kind === 'beam');
  const parts = doc.objects.filter(o => { const d = lib.get(o.type); return d && !o.locked && !o.hidden && !d.annotation && !d.connection && (d.snap || d.source) && !(o.axis && o.axis !== 'h'); });
  let snapped = 0, runs = 0;
  // 1. which beam line each part sits on
  const lines = [];
  parts.forEach(o => {
    let best = null;
    segs.forEach(s => {
      const d = V.norm(V.sub(s.b, s.a)), t = V.dot(V.sub([o.x, o.y], s.a), d);
      if (t < -1 || t > s.len + 1) return;
      const q = V.add(s.a, V.mul(d, t)), off = V.dist(q, [o.x, o.y]);
      if (off < 1.5 && (!best || off < best.off)) best = { s, d, q, off };
    });
    if (!best) return;
    if (best.off > 1e-3) { o.x = U.round(best.q[0], 3); o.y = U.round(best.q[1], 3); snapped++; }
    // group by the infinite line (direction and offset)
    const ang = ((Math.atan2(best.d[1], best.d[0]) * 180 / Math.PI) + 360) % 180, nrm = [-Math.sin(ang * Math.PI / 180), Math.cos(ang * Math.PI / 180)], c = V.dot(nrm, best.q);
    let L = lines.find(l => Math.abs(l.ang - ang) < 0.5 && Math.abs(l.c - c) < 0.5);
    if (!L) lines.push(L = { ang, c, dir: [Math.cos(ang * Math.PI / 180), Math.sin(ang * Math.PI / 180)], items: [] });
    L.items.push(o);
  });
  // 2. even spacing where it is nearly even already
  lines.forEach(L => {
    if (L.items.length < 3) return;
    const ts = L.items.map(o => ({ o, t: V.dot([o.x, o.y], L.dir) })).sort((a, b) => a.t - b.t);
    const gaps = ts.slice(1).map((e, i) => e.t - ts[i].t), mean = (ts[ts.length - 1].t - ts[0].t) / gaps.length;
    if (mean < 2 || gaps.some(g => Math.abs(g - mean) > 0.15 * mean)) return;
    if (gaps.every(g => Math.abs(g - mean) < 0.01)) return;
    const p0 = [ts[0].o.x, ts[0].o.y];
    ts.forEach((e, i) => { if (i === 0 || i === ts.length - 1) return; const q = V.add(p0, V.mul(L.dir, mean * i)); e.o.x = U.round(q[0], 3); e.o.y = U.round(q[1], 3); });
    runs++;
  });
  RNBX.anim.touch(parts.map(o => o.id));
  const nl = RNBX.labels ? RNBX.labels.arrange2D(doc) : 0;
  RNBX.changed();
  RNBX.toast(`Tidied: ${snapped} part${snapped === 1 ? '' : 's'} put exactly on the beam, ${runs} run${runs === 1 ? '' : 's'} evenly spaced, ${nl} label${nl === 1 ? '' : 's'} placed. Ctrl+Z to undo.`);
  U.track('tidy');
};

/* ---------- fit to a journal width ---------- */
LY.scaleFigure = (f, presetId) => {
  const doc = S.doc;
  if (!(f > 0) || Math.abs(f - 1) < 1e-6) return;
  RNBX.history.checkpoint();
  const sc = v => U.round(v * f, 3);
  const scaleObj = o => {
    const def = lib.get(o.type);
    if (!def || def.connection) return;
    o.x = sc(o.x); o.y = sc(o.y);
    if (o.label) { o.label.dx = sc(o.label.dx || 0); o.label.dy = sc(o.label.dy || 0); if (o.label.dx3 != null) o.label.dx3 = sc(o.label.dx3); if (o.label.dy3 != null) o.label.dy3 = sc(o.label.dy3); }
    if (o.props.on) return;               // stacked blocks follow the block below
    if (o.type === 'text' || o.type === 'panel' || o.type === 'legend') return;   // type stays its size
    if (def.resizable && o.props.w != null) { o.props.w = sc(o.props.w); o.props.h = sc(o.props.h); return; }
    if (def.special === 'inset') { ['dx', 'dy', 'r', 'R'].forEach(k => { if (typeof o.props[k] === 'number') o.props[k] = sc(o.props[k]); }); return; }
    if (def.handles && typeof o.props.dx === 'number') { o.props.dx = sc(o.props.dx); o.props.dy = sc(o.props.dy); return; }
    o.scale = U.round((o.scale || 1) * f, 4);
  };
  doc.objects.forEach(scaleObj);
  Object.values(doc.animation.tracks).forEach(keys => keys.forEach(k => { if (k.x != null) k.x = sc(k.x); if (k.y != null) k.y = sc(k.y); if (k.scale != null) k.scale = U.round(k.scale * f, 4); }));
  doc.page.width = sc(doc.page.width); doc.page.height = sc(doc.page.height);
  if (presetId) doc.page.preset = presetId; else doc.page.preset = 'custom';
  // physical distances unchanged: one drawn mm now stands for 1/f as many real mm
  doc.style.scale = U.round((doc.style.scale || 10) / f, 6);
  RNBX.changed();
  setTimeout(() => RNBX.canvas.fit(), 30);
};
LY.fitDialog = () => {
  const D = RNBX.dom, el = D.el, doc = S.doc;
  const presets = RNBX.PRESETS.filter(p => p.group === 'Journal figure');
  const sel = el('select', {}, presets.map(p => el('option', { value: p.id, text: `${p.name} — ${p.w} mm` })), el('option', { value: 'custom', text: 'Custom width…' }));
  const cur = presets.find(p => Math.abs(p.w - doc.page.width) < 0.6);
  sel.value = cur ? cur.id : presets[0].id;
  const custom = el('input', { type: 'number', min: 20, max: 500, step: 0.5, value: U.round(doc.page.width, 1), style: { display: 'none' } });
  sel.onchange = () => { custom.style.display = sel.value === 'custom' ? '' : 'none'; info(); };
  const note = el('div', { class: 'note' });
  const target = () => sel.value === 'custom' ? +custom.value : presets.find(p => p.id === sel.value).w;
  const info = () => { const f = target() / doc.page.width; note.textContent = `Everything is scaled by ${U.fmt(f, 3)} (page ${U.fmt(doc.page.width, 1)} → ${U.fmt(target(), 1)} mm wide). Type sizes and line weights stay as they are, so text keeps its printed size; the figure scale changes so focal lengths and beams stay the same.`; };
  custom.oninput = info; info();
  const m = D.modal({ title: 'Fit to a journal width', sub: 'Design at final size: fonts and lines print exactly as set', body: [el('div', { class: 'field' }, el('label', {}, 'Width'), sel, custom), note],
    foot: [el('button', { class: 'btn primary', type: 'button', text: 'Fit', onclick: () => { const w = target(); if (w > 5) { LY.scaleFigure(w / doc.page.width, sel.value === 'custom' ? null : sel.value); m.close(); RNBX.toast('Figure fitted. Ctrl+Z to undo.'); } } })] });
};

/* ---------- equal-spacing guides while dragging ----------
   Called by the canvas with the dragged object and the others; snaps to
   the midpoint between two neighbours, or to repeat the gap of a pair. */
LY.smartSnap = (o, others, tol, allow = { x: true, y: true }) => {
  const guides = [];
  const axisSnap = (ax, cross) => {
    const row = others.filter(q => Math.abs(q[cross] - o[cross]) < tol * 2 && q !== o);
    if (row.length < 2) return false;
    const v = o[ax], sorted = row.slice().sort((a, b) => a[ax] - b[ax]);
    const left = sorted.filter(q => q[ax] < v - 0.5), right = sorted.filter(q => q[ax] > v + 0.5);
    const L = left[left.length - 1], LL = left[left.length - 2], R = right[0], RR = right[1];
    const cands = [];
    if (L && R) cands.push({ v: (L[ax] + R[ax]) / 2, pairs: [[L, o], [o, R]] });
    if (L && LL) cands.push({ v: L[ax] + (L[ax] - LL[ax]), pairs: [[LL, L], [L, o]] });
    if (R && RR) cands.push({ v: R[ax] - (RR[ax] - R[ax]), pairs: [[o, R], [R, RR]] });
    const best = cands.filter(c => Math.abs(c.v - v) < tol).sort((a, b) => Math.abs(a.v - v) - Math.abs(b.v - v))[0];
    if (!best) return false;
    o[ax] = best.v;
    // guide: a dimension-like tick line over each equal gap
    best.pairs.forEach(([a, b]) => {
      const off = -6;
      if (ax === 'x') guides.push({ x1: a.x, y1: o.y + off, x2: b.x, y2: o.y + off, eq: true });
      else guides.push({ x1: o.x + off, y1: a.y, x2: o.x + off, y2: b.y, eq: true });
    });
    return true;
  };
  const sx = allow.x && axisSnap('x', 'y'), sy = allow.y && axisSnap('y', 'x');
  return { guides, sx, sy };
};
})();
