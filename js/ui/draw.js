/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/draw.js
   Draw mode: draw your own shapes and beams by hand. Nothing drawn
   here takes part in the physics.

     Pen        drag; the stroke is simplified and smoothed
     Line       drag
     Polyline   click points; double-click, Enter or click the first point to finish
     Curve      as polyline, drawn as a smooth curve
     Beam       as polyline, drawn as a glowing beam (not traced)
     Rectangle, Ellipse, Arrow   drag
     Text       click

   Shift keeps lines at multiples of 45° (and rectangles square).
   Backspace removes the last point; Esc cancels, then leaves draw mode.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, lib = RNBX.lib;
const DR = RNBX.draw = {};
const NS = 'http://www.w3.org/2000/svg';

const TOOLS = [
  ['pen', 'Pen (freehand)', '<path d="M4 20c3-1 4-6 7-9s6-4 9-7"/><path d="m16 4 4 4"/>'],
  ['line', 'Line', '<path d="M5 19 19 5"/>'],
  ['poly', 'Polyline: click points, double-click to finish', '<path d="M4 18 9 7l6 8 5-10"/>'],
  ['curve', 'Curve: click points, double-click to finish', '<path d="M4 18C7 4 12 4 13 12s6 7 7-5"/>'],
  ['beam', 'Beam drawn by hand (not traced): click points, double-click to finish', '<path d="M3 16h8l6-9h4" stroke-width="3.2" stroke="#e63946" opacity=".9"/>'],
  ['rect', 'Rectangle', '<rect x="4" y="6" width="16" height="12" rx="1.5"/>'],
  ['ellipse', 'Ellipse', '<ellipse cx="12" cy="12" rx="8" ry="6"/>'],
  ['arrow', 'Arrow', '<path d="M4 19 19 5M11 5h8v8"/>'],
  ['text', 'Text', '<path d="M5 6h14M12 6v13"/>'],
];
DR.style = { stroke: '#222222', width: 0.6, fill: '', dash: false, head: 'none', lambda: 633, beamWidth: 1.2 };
try { Object.assign(DR.style, JSON.parse(localStorage.getItem('rnbx_drawstyle') || '{}')); } catch (e) { /* defaults */ }
const saveStyle = () => { try { localStorage.setItem('rnbx_drawstyle', JSON.stringify(DR.style)); } catch (e) { /* ignore */ } };

DR.tool = null;
let cur = null;          // the shape being drawn: { tool, pts, p0, p1 }
let bar = null, prev = null;

const snapAngle = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(dx, dy); return [a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L]; };
/* Ramer–Douglas–Peucker: keep the points that matter */
const simplify = (P, eps) => {
  if (P.length < 3) return P;
  const a = P[0], b = P[P.length - 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-9;
  let iMax = 0, dMax = 0;
  for (let i = 1; i < P.length - 1; i++) { const d = Math.abs((b[0] - a[0]) * (a[1] - P[i][1]) - (a[0] - P[i][0]) * (b[1] - a[1])) / L; if (d > dMax) { dMax = d; iMax = i; } }
  if (dMax <= eps) return [a, b];
  return simplify(P.slice(0, iMax + 1), eps).slice(0, -1).concat(simplify(P.slice(iMax), eps));
};
DR.simplify = simplify;

/* ---------- objects ---------- */
const centreOf = P => { const xs = P.map(q => q[0]), ys = P.map(q => q[1]); return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]; };
/* page points → a drawing object (points relative to its centre) */
DR.makePath = (P, opt = {}) => {
  const c = centreOf(P), st = DR.style;
  const o = RNBX.createObject('drawing', U.round(c[0], 2), U.round(c[1], 2));
  Object.assign(o.props, {
    pts: lib.drawingPts.fmt(P.map(q => [q[0] - c[0], q[1] - c[1]])), smooth: !!opt.smooth, closed: !!opt.closed,
    look: opt.beam ? 'beam' : 'line', stroke: opt.beam ? (st.lambda > 0 ? '' : st.stroke) : st.stroke, width: st.width, fill: opt.closed ? st.fill : '', dash: st.dash,
    head: opt.closed ? 'none' : (opt.beam ? 'none' : st.head), lambda: opt.beam ? st.lambda : 0, beamWidth: st.beamWidth, midArrow: !!opt.beam,
  });
  if (opt.beam && !(st.lambda > 0)) o.props.stroke = st.stroke;
  return o;
};
DR.makeBox = (type, a, b) => {
  const st = DR.style, o = RNBX.createObject(type, U.round((a[0] + b[0]) / 2, 2), U.round((a[1] + b[1]) / 2, 2));
  Object.assign(o.props, { w: U.round(Math.max(0.5, Math.abs(b[0] - a[0])), 2), h: U.round(Math.max(0.5, Math.abs(b[1] - a[1])), 2), stroke: st.stroke, width: st.width, fill: st.fill, dash: st.dash });
  return o;
};
DR.makeArrow = (a, b) => {
  const st = DR.style, o = RNBX.createObject('arrow', U.round(a[0], 2), U.round(a[1], 2));
  Object.assign(o.props, { dx: U.round(b[0] - a[0], 2), dy: U.round(b[1] - a[1], 2), color: st.stroke, width: st.width, dash: st.dash, head: st.head === 'none' ? 'end' : st.head });
  return o;
};

const add = o => { RNBX.addObject(o); U.track && U.track('draw-' + (o.props.look || o.type)); };
const finish = () => {
  if (!cur) return;
  const c = cur; cur = null;
  const t = c.tool;
  if (t === 'pen') {
    if (c.pts.length > 1) { const P = simplify(c.pts, 0.12); if (P.length >= 2) add(DR.makePath(P, { smooth: P.length > 2 })); }
  } else if (t === 'poly' || t === 'curve' || t === 'beam') {
    const P = c.pts.slice();
    if (P.length >= 2) add(DR.makePath(P, { smooth: t === 'curve', closed: !!c.closed, beam: t === 'beam' }));
  } else if (t === 'line' && c.p1 && Math.hypot(c.p1[0] - c.p0[0], c.p1[1] - c.p0[1]) > 0.3) add(DR.makePath([c.p0, c.p1]));
  else if ((t === 'rect' || t === 'ellipse') && c.p1 && Math.abs(c.p1[0] - c.p0[0]) + Math.abs(c.p1[1] - c.p0[1]) > 0.6) add(DR.makeBox(t, c.p0, c.p1));
  else if (t === 'arrow' && c.p1 && Math.hypot(c.p1[0] - c.p0[0], c.p1[1] - c.p0[1]) > 0.5) add(DR.makeArrow(c.p0, c.p1));
  render();
};
const cancel = () => { cur = null; render(); };

/* ---------- preview ---------- */
const render = () => {
  const svg = document.getElementById('canvas');
  if (!svg) return;
  if (!prev || !prev.isConnected) { prev = document.createElementNS(NS, 'g'); prev.setAttribute('id', 'drawPreview'); prev.setAttribute('pointer-events', 'none'); svg.append(prev); }
  prev.innerHTML = '';
  if (!cur) return;
  const st = DR.style, col = cur.tool === 'beam' ? (st.lambda > 0 ? lib.colorOf(S.doc, st.lambda, '') : st.stroke) : st.stroke;
  const w = cur.tool === 'beam' ? st.beamWidth : Math.max(0.15, U.pt2mm(st.width));
  let d = '';
  const P = cur.pts ? cur.pts.concat(cur.hover ? [cur.hover] : []) : null;
  if (P && P.length) d = 'M ' + P.map(q => q[0] + ' ' + q[1]).join(' L ');
  else if (cur.p1) {
    const a = cur.p0, b = cur.p1;
    if (cur.tool === 'rect') d = `M ${a[0]} ${a[1]} H ${b[0]} V ${b[1]} H ${a[0]} Z`;
    else if (cur.tool === 'ellipse') { const cx = (a[0] + b[0]) / 2, cy = (a[1] + b[1]) / 2, rx = Math.abs(b[0] - a[0]) / 2, ry = Math.abs(b[1] - a[1]) / 2; d = `M ${cx - rx} ${cy} a ${rx} ${ry} 0 1 0 ${2 * rx} 0 a ${rx} ${ry} 0 1 0 ${-2 * rx} 0`; }
    else d = `M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`;
  }
  if (!d) return;
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d); path.setAttribute('fill', 'none'); path.setAttribute('stroke', col); path.setAttribute('stroke-width', w);
  path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round'); path.setAttribute('opacity', cur.tool === 'beam' ? 0.8 : 0.9);
  if (st.dash) path.setAttribute('stroke-dasharray', `${w * 4} ${w * 3}`);
  prev.append(path);
  (cur.pts || []).forEach((q, i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', q[0]); c.setAttribute('cy', q[1]); c.setAttribute('r', i === 0 && cur.pts.length > 2 ? 0.9 : 0.5); c.setAttribute('fill', '#ffffff'); c.setAttribute('stroke', '#4f46e5'); c.setAttribute('stroke-width', 0.2); prev.append(c); });
};

/* ---------- pointer ---------- */
const pageAt = e => RNBX.canvas.toPage(e.clientX, e.clientY);
const onCanvas = e => { const svg = document.getElementById('canvas'); return svg && svg.contains(e.target); };
const CLICK_TOOLS = new Set(['poly', 'curve', 'beam']);
let lastClick = 0;
function down(e) {
  if (!DR.tool || !onCanvas(e) || e.button !== 0) return;
  e.stopPropagation(); e.preventDefault();
  let p = pageAt(e);
  const t = DR.tool;
  if (t === 'text') {
    const o = RNBX.createObject('text', U.round(p[0], 2), U.round(p[1], 2)); o.props.color = DR.style.stroke;
    add(o); DR.setTool(null); RNBX.emit('focusText', o.id); return;
  }
  if (CLICK_TOOLS.has(t)) {
    const now = Date.now(), dbl = now - lastClick < 320; lastClick = now;
    if (!cur) { cur = { tool: t, pts: [p] }; render(); return; }
    if (e.shiftKey) p = snapAngle(cur.pts[cur.pts.length - 1], p);
    const first = cur.pts[0], k = RNBX.canvas.pxToMm ? RNBX.canvas.pxToMm(8) : 1.2;
    if (t !== 'beam' && cur.pts.length > 2 && Math.hypot(p[0] - first[0], p[1] - first[1]) < k) { cur.closed = true; cur.hover = null; finish(); return; }
    if (dbl) { cur.hover = null; finish(); return; }
    cur.pts.push(p); render(); return;
  }
  cur = { tool: t, p0: p, p1: null, pts: t === 'pen' ? [p] : null };
  try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  render();
}
function move(e) {
  if (!DR.tool || !cur) return;
  if (!onCanvas(e) && !CLICK_TOOLS.has(cur.tool)) return;
  e.stopPropagation();
  let p = pageAt(e);
  if (CLICK_TOOLS.has(cur.tool)) { cur.hover = e.shiftKey ? snapAngle(cur.pts[cur.pts.length - 1], p) : p; render(); return; }
  if (cur.tool === 'pen') { const l = cur.pts[cur.pts.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 0.08) cur.pts.push(p); }
  else {
    if (e.shiftKey && (cur.tool === 'line' || cur.tool === 'arrow')) p = snapAngle(cur.p0, p);
    if (e.shiftKey && (cur.tool === 'rect' || cur.tool === 'ellipse')) { const s = Math.max(Math.abs(p[0] - cur.p0[0]), Math.abs(p[1] - cur.p0[1])); p = [cur.p0[0] + Math.sign(p[0] - cur.p0[0] || 1) * s, cur.p0[1] + Math.sign(p[1] - cur.p0[1] || 1) * s]; }
    cur.p1 = p;
  }
  render();
}
function up(e) {
  if (!DR.tool || !cur || CLICK_TOOLS.has(cur.tool)) return;
  e.stopPropagation();
  finish();
}
function key(e) {
  if (!DR.tool || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)) return;
  if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (cur) cancel(); else DR.setTool(null); }
  else if (e.key === 'Enter' && cur) { e.stopPropagation(); e.preventDefault(); cur.hover = null; finish(); }
  else if (e.key === 'Backspace' && cur && cur.pts && cur.pts.length > 1 && CLICK_TOOLS.has(cur.tool)) { e.stopPropagation(); e.preventDefault(); cur.pts.pop(); render(); }
}

/* ---------- toolbar ---------- */
const syncBar = () => {
  if (!bar) return;
  bar.querySelectorAll('[data-dt]').forEach(b => b.classList.toggle('active', b.dataset.dt === DR.tool));
  const svg = document.getElementById('canvas'); if (svg) svg.classList.toggle('drawing', !!DR.tool);
  const btn = document.getElementById('tDraw'); if (btn) btn.classList.toggle('active', !!bar && !bar.hidden);
  bar.querySelectorAll('[data-for]').forEach(x => { const f = x.dataset.for.split(' '); x.hidden = !f.includes(DR.tool || 'none') && !f.includes('all'); });
};
DR.setTool = t => { if (cur) cancel(); DR.tool = t || null; if (t && S.selection.length) RNBX.select([]); syncBar(); };
const buildBar = () => {
  const D = RNBX.dom, el = D.el, st = DR.style;
  bar = el('div', { class: 'draw-bar', id: 'drawBar', hidden: true, role: 'toolbar', 'aria-label': 'Drawing tools' });
  bar.append(el('span', { class: 'db-title', text: 'Draw' }));
  TOOLS.forEach(([id, title, icon]) => bar.append(el('button', { type: 'button', class: 'icon-btn', title, 'data-dt': id, html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icon}</svg>`, onclick: () => DR.setTool(DR.tool === id ? null : id) })));
  const sep = () => el('span', { class: 'sep' });
  const colour = el('input', { type: 'color', value: st.stroke, title: 'Colour', oninput: () => { st.stroke = colour.value; saveStyle(); } });
  const width = el('select', { title: 'Line weight', onchange: () => { st.width = +width.value; saveStyle(); } }, [0.25, 0.4, 0.6, 1, 1.5, 2.5, 4].map(v => el('option', { value: v, text: v + ' pt' })));
  width.value = String(st.width);
  const bw = el('select', { title: 'Beam width', onchange: () => { st.beamWidth = +bw.value; saveStyle(); } }, [0.4, 0.8, 1.2, 2, 3, 5].map(v => el('option', { value: v, text: v + ' mm' })));
  bw.value = String(st.beamWidth);
  const lam = el('select', { title: 'Beam colour by wavelength', onchange: () => { st.lambda = +lam.value; saveStyle(); } },
    [[0, 'Colour picker'], [405, '405 nm'], [450, '450 nm'], [532, '532 nm'], [589, '589 nm'], [633, '633 nm'], [785, '785 nm'], [1064, '1064 nm']].map(v => el('option', { value: v[0], text: v[1] })));
  lam.value = String(st.lambda);
  const fillCb = el('input', { type: 'checkbox', checked: !!st.fill, onchange: () => { st.fill = fillCb.checked ? fillCol.value : ''; saveStyle(); } });
  const fillCol = el('input', { type: 'color', value: st.fill || '#b9c8de', title: 'Fill colour', oninput: () => { if (fillCb.checked) { st.fill = fillCol.value; saveStyle(); } } });
  const dash = el('input', { type: 'checkbox', checked: !!st.dash, onchange: () => { st.dash = dash.checked; saveStyle(); } });
  const head = el('select', { title: 'Arrowheads', onchange: () => { st.head = head.value; saveStyle(); } }, [['none', 'No arrow'], ['end', 'Arrow at end'], ['start', 'Arrow at start'], ['both', 'Both ends']].map(v => el('option', { value: v[0], text: v[1] })));
  head.value = st.head;
  bar.append(sep(), colour,
    el('span', { 'data-for': 'pen line poly curve rect ellipse arrow none' }, width),
    el('span', { 'data-for': 'beam' }, lam, bw),
    el('label', { class: 'check', 'data-for': 'poly curve rect ellipse', title: 'Fill closed shapes' }, fillCb, 'Fill', fillCol),
    el('label', { class: 'check', 'data-for': 'all' }, dash, 'Dashed'),
    el('span', { 'data-for': 'pen line poly curve arrow' }, head),
    sep(),
    el('span', { class: 'db-hint', 'data-for': 'poly curve beam', text: 'Click points · double-click or Enter to finish', title: 'Backspace removes the last point; Shift keeps 45° steps; Esc cancels' }),
    el('span', { class: 'db-hint', 'data-for': 'none', text: 'Pick a tool. Drawings never interact with light.' }),
    el('button', { type: 'button', class: 'btn small', text: 'Done', onclick: () => DR.toggle(false) }));
  document.getElementById('stage').append(bar);
};
DR.toggle = on => {
  if (!bar) buildBar();
  const show = on == null ? bar.hidden : !!on;
  bar.hidden = !show;
  if (!show) DR.setTool(null); else syncBar();
  syncBar();
};

DR.init = () => {
  const stage = document.getElementById('stage');
  if (!stage) return;
  stage.addEventListener('pointerdown', down, true);
  stage.addEventListener('pointermove', move, true);
  stage.addEventListener('pointerup', up, true);
  stage.addEventListener('dblclick', e => { if (DR.tool) { e.stopPropagation(); e.preventDefault(); } }, true);
  window.addEventListener('keydown', key, true);
  const tools = document.getElementById('topTools');
  if (tools) {
    const b = RNBX.dom.iconBtn('wand', 'Draw by hand: pen, lines, curves, shapes and beams that ignore the physics (D)', () => DR.toggle(), { id: 'tDraw' });
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c3-1 4-6 7-9s6-4 9-7"/><path d="m16 4 4 4"/></svg>';
    const fit = tools.querySelector('[title^="Fit page"]');
    tools.insertBefore(b, fit ? fit.previousSibling : null);
  }
};
})();
