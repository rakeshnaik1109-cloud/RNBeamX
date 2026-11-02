/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/partbuilder.js
   Layer Studio ▸ Part: the Part Builder.

   Draw a component from shapes (rectangle, ellipse, polygon, lens
   profile) that are added to or cut from the body, and thin
   surfaces (line, spherical arc, off-axis parabola). Say what the
   body does to light (glass of any material, opaque, mirror) and
   give single faces their own job (mirror coating, blackened,
   beam splitter). Beam sources make it a light source. A test
   beam runs through it as you edit, with where the rays meet;
   a 3D preview shows the body (extruded or turned). Insert it, save
   it to My components, or share it as a file.
   The geometry and optics live in components/built.js.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el;
const PB = RNBX.partBuilder = {};
const KEY = 'rnbx-part-v1';
const ST = () => RNBX.studio, UI = () => RNBX.studio.ui, G = () => RNBX.partGeo;

/* ---------- designs ---------- */
let sid = 0;
const nid = (p = 's') => p + Date.now().toString(36) + (sid++);
const base = (name, shapes, extra) => Object.assign({
  name, shapes, curves: [], sources: [],
  body: { kind: 'glass', mat: 'N-BK7', n: 1.5, faces: {}, faceR: {} },
  d3: { mode: 'extrude', h: 12 }, look: { finish: '', color: '', alpha: 0.35 },
  test: { on: true, mode: 'parallel', h: 10, rays: 9, tilt: 0, lambda: 587.56, offset: 0 },
}, extra || {});
const sh = (kind, o) => Object.assign({ id: nid(), kind, op: 'add', x: 0, y: 0, rot: 0 }, o);
const cv = (kind, o) => Object.assign({ id: nid('c'), kind, x: 0, y: 0, rot: 0, role: 'mirror', R: 0.5, t: 1.2 }, o);
const PRESETS = [
  { id: 'pcx', name: 'Plano-convex lens', make: () => base('Plano-convex lens', [sh('lens', { D: 20, tc: 5, R1: 25, R2: 0 })], { d3: { mode: 'revolve', h: 20 } }) },
  { id: 'bicx', name: 'Biconvex lens', make: () => base('Biconvex lens', [sh('lens', { D: 25, tc: 6, R1: 40, R2: 40 })], { d3: { mode: 'revolve', h: 25 }, test: { on: true, mode: 'parallel', h: 18, rays: 11, tilt: 0, lambda: 587.56, offset: 0 } }) },
  { id: 'ncx', name: 'Plano-concave lens', make: () => base('Plano-concave lens', [sh('lens', { D: 20, tc: 2.5, R1: -30, R2: 0 })], { d3: { mode: 'revolve', h: 20 } }) },
  { id: 'ball', name: 'Ball lens', make: () => base('Ball lens', [sh('ellipse', { rx: 5, ry: 5 })], { d3: { mode: 'revolve', h: 10 }, test: { on: true, mode: 'parallel', h: 6, rays: 9, tilt: 0, lambda: 587.56, offset: 0 } }) },
  { id: 'axicon', name: 'Axicon (cone lens)', make: () => base('Axicon', [sh('polygon', { pts: [[-2, -10], [-1, -10], [2.2, 0], [-1, 10], [-2, 10]] })], { d3: { mode: 'revolve', h: 20 }, test: { on: true, mode: 'parallel', h: 16, rays: 11, tilt: 0, lambda: 587.56, offset: 0 } }) },
  { id: 'prism', name: 'Right-angle prism (total internal reflection)', make: () => base('Right-angle prism', [sh('polygon', { pts: [[-6, -6], [-6, 6], [6, 6]] })], { test: { on: true, mode: 'parallel', h: 6, rays: 7, tilt: 0, lambda: 587.56, offset: 1 } }) },
  { id: 'cube', name: 'Cube beam splitter', make: () => base('Cube beam splitter', [sh('rect', { w: 12, h: 12 })], { curves: [cv('line', { L: 16.97, rot: -45, role: 'splitter', R: 0.5, t: 0.3 })], test: { on: true, mode: 'parallel', h: 4, rays: 5, tilt: 0, lambda: 532, offset: 0 } }) },
  { id: 'pipe', name: 'Light pipe (guiding by total internal reflection)', make: () => base('Light pipe', [sh('rect', { w: 40, h: 4, r: 0 })], { test: { on: true, mode: 'point', h: 0.2, rays: 9, tilt: 0, lambda: 532, offset: 0, fan: 50 } }) },
  { id: 'oap', name: 'Off-axis parabolic mirror (90°)', make: () => base('Off-axis parabola', [sh('rect', { x: 2, y: 24, w: 6, h: 16 })], { body: { kind: 'opaque', mat: 'N-BK7', n: 1.5, faces: {}, faceR: {} }, curves: [cv('parabola', { f: 12, A: 14, offset: 24, t: 1.5 })], look: { finish: 'metal', color: '#c4c9d1', alpha: 1 }, test: { on: true, mode: 'parallel', h: 10, rays: 9, tilt: 0, lambda: 633, offset: 24 } }) },
  { id: 'concave', name: 'Concave mirror (spherical)', make: () => base('Concave mirror', [], { body: { kind: 'none', faces: {}, faceR: {} }, curves: [cv('arc', { R: 50, A: 25, t: 3 })], test: { on: true, mode: 'parallel', h: 18, rays: 9, tilt: 0, lambda: 633, offset: 0 } }) },
  { id: 'roof', name: 'Roof mirror (two mirrors at 90°)', make: () => base('Roof mirror', [], { body: { kind: 'none', faces: {}, faceR: {} }, curves: [cv('line', { x: -3, y: -3, L: 8.49, rot: -45 }), cv('line', { x: -3, y: 3, L: 8.49, rot: 45 })], test: { on: true, mode: 'parallel', h: 6, rays: 5, tilt: 0, lambda: 633, offset: 2 } }) },
  { id: 'housing', name: 'Housing with a bore (cut)', make: () => base('Housing', [sh('rect', { w: 24, h: 16, r: 1.5 }), sh('rect', { op: 'cut', w: 26, h: 4 })], { body: { kind: 'opaque', faces: {}, faceR: {} }, look: { finish: 'matte', color: '#3c434c', alpha: 1 }, test: { on: true, mode: 'parallel', h: 10, rays: 9, tilt: 0, lambda: 633, offset: 0 } }) },
  { id: 'laser', name: 'Laser head (a light source)', make: () => base('Laser head', [sh('rect', { w: 30, h: 10, r: 1.2 })], { body: { kind: 'opaque', faces: {}, faceR: {} }, sources: [{ x: 15.05, y: 0, angle: 0, lambda: 532, power: 5, width: 0.8, div: 0 }], look: { finish: 'matte', color: '#2f3a48', alpha: 1 }, test: { on: false, mode: 'parallel', h: 6, rays: 5, tilt: 0, lambda: 633, offset: 0 } }) },
];
PB.PRESETS = PRESETS;

/* ---------- state ---------- */
let d = null, target = null, root = null, undo = [], redo = [], lastKey = '', lastAt = 0, sel = null, face = null, drawPts = null, views = {}, view = null, prevT = 0, testRes = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* optional */ } };
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && Array.isArray(v.shapes) ? v : null; } catch (e) { return null; } };
PB.loaded = () => !!d;
PB.design = () => d;
PB.load = obj => {
  target = obj && obj.type === 'built' ? obj : null;
  d = target ? Object.assign(PRESETS[0].make(), U.deepClone(target.props.design)) : (d || load() || PRESETS[0].make());
  undo = []; redo = []; sel = d.shapes.length ? { t: 'shape', i: 0 } : null; face = null; drawPts = null; view = null;
};
PB.setDesign = v => { step(); d = v; sel = d.shapes.length ? { t: 'shape', i: 0 } : d.curves.length ? { t: 'curve', i: 0 } : null; face = null; drawPts = null; view = null; save(); if (root) PB.render(root); };
PB.closed = () => { root = null; drawPts = null; };
const step = key => {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastAt < 900)) { undo.push(JSON.stringify(d)); if (undo.length > 150) undo.shift(); redo = []; }
  lastKey = key || ''; lastAt = now;
};
PB.undo = () => { if (!undo.length) return; redo.push(JSON.stringify(d)); d = JSON.parse(undo.pop()); lastKey = ''; save(); PB.render(root); };
PB.redo = () => { if (!redo.length) return; undo.push(JSON.stringify(d)); d = JSON.parse(redo.pop()); lastKey = ''; save(); PB.render(root); };
/* keys while drawing a polygon: Enter finishes, Esc cancels, Backspace removes the last point */
PB.key = (e, typing) => {
  if (!drawPts || typing) return false;
  if (e.key === 'Enter') { finishPolygon(); return true; }
  if (e.key === 'Escape') { drawPts = null; drawEditor(); return true; }
  if (e.key === 'Backspace') { drawPts.pop(); drawEditor(); e.preventDefault(); return true; }
  return false;
};
/* what: 'list' rebuilds the side panels, 'all' everything, else the views */
const change = (fn, key, what) => { step(key); fn(); save(); if (what === 'all') PB.render(root); else { if (what === 'list') { buildLeft(); buildRight(); } refresh(); } };

/* ---------- small controls ---------- */
const fld = (label, input) => el('label', { class: 'st-f' }, el('span', { text: label }), input);
const num = (get, set, o = {}) => { const i = el('input', { type: 'number', value: get(), step: o.step || 0.1, min: o.min, max: o.max, title: o.title || '', oninput: () => { const v = parseFloat(i.value); if (isFinite(v)) change(() => set(o.min != null ? Math.max(o.min, o.max != null ? Math.min(o.max, v) : v) : v), o.key || 'n' + Math.random(), o.what); } }); return i; };
const sel1 = (opts, get, set, key, what) => { const s = el('select', { onchange: () => change(() => set(s.value), key, what) }, opts.map(q => el('option', { value: q[0], text: q[1] }))); s.value = String(get()); return s; };
const lab = t => el('span', { class: 'hint', style: { margin: 0 }, text: t });

/* ---------- layout ---------- */
PB.render = host => {
  root = host; if (!root) return;
  root.innerHTML = '';
  const presetBtn = el('button', { class: 'btn small', type: 'button', text: 'Start from ▾', onclick: ev => { const r = ev.currentTarget.getBoundingClientRect(); D.menu([{ title: 'Parts' }].concat(PRESETS.map(p => ({ label: p.name, action: () => PB.setDesign(p.make()) }))), r.left, r.bottom + 4, ev.currentTarget); } });
  const name = el('input', { type: 'text', class: 'st-name', value: d.name || '', title: 'Name of the part', oninput: () => { step('name'); d.name = name.value; save(); } });
  root.append(el('div', { class: 'st-head' },
    el('div', { class: 'st-title' }, el('b', { text: 'Layer Studio' }), el('span', { class: 'st-sub', text: target ? 'editing a part in the figure' : 'Part Builder: your own component' })),
    ST().tabs(), name, presetBtn,
    D.iconBtn('undo', 'Undo (Ctrl+Z)', PB.undo), D.iconBtn('redo', 'Redo (Ctrl+Y)', PB.redo),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Open…', title: 'Open a saved part (.rnbxpart.json)', onclick: openFile }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Save', title: 'Save this part as a file to share', onclick: saveFile }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'To My components', title: 'Keep it in the parts list (this browser)', onclick: toLibrary }),
    el('span', { class: 'st-grow' }),
    el('button', { class: 'btn primary', type: 'button', text: target ? 'Update the part' : 'Insert into figure', onclick: insert }),
    D.iconBtn('close', 'Close (Esc): the design is kept for next time', ST().close)));
  views = { left: el('div'), editor: el('div', { class: 'pb-editor' }), testCtl: el('div'), readout: el('div'), right: el('div'), d3: el('div', { class: 'pb-3d' }) };
  const left = el('section', { class: 'st-col st-left' }, el('h4', { text: 'Shapes and surfaces' }), views.left);
  const mid = el('section', { class: 'st-col st-mid' }, el('h4', { text: 'Drawing (mm, light travels →)' }), views.editor, el('h4', { text: 'Test beam' }), views.testCtl, views.readout);
  const right = el('section', { class: 'st-col st-right' }, el('h4', { text: 'Body, faces and look' }), views.right, el('h4', { text: '3D' }), views.d3);
  root.append(el('div', { class: 'st-body' }, left, mid, right));
  buildLeft(); buildRight(); buildTest(); refresh();
};

/* ---------- left: shapes, thin surfaces, sources ---------- */
const KINDS = { rect: 'Rectangle', ellipse: 'Ellipse / circle', polygon: 'Polygon', lens: 'Lens profile' };
const CKINDS = { line: 'Flat surface', arc: 'Spherical surface', parabola: 'Parabolic surface' };
const moveIn = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; arr.splice(j, 0, arr.splice(i, 1)[0]); };
const card = (isSel, onSel, ...kids) => { const c = el('div', { class: 'st-shape' + (isSel ? ' sel' : ''), onclick: onSel }, ...kids); return c; };
function buildLeft() {
  const host = views.left; if (!host) return; host.innerHTML = '';
  const add = (t, fn) => el('button', { class: 'btn small', type: 'button', text: t, onclick: fn });
  host.append(el('div', { class: 'st-cap', text: 'Body: shapes added to or cut from it, in order' }),
    el('div', { class: 'row', style: { gap: '5px', flexWrap: 'wrap', marginBottom: '6px' } },
      add('+ Rectangle', () => change(() => { d.shapes.push(sh('rect', { w: 10, h: 8 })); sel = { t: 'shape', i: d.shapes.length - 1 }; }, null, 'list')),
      add('+ Ellipse', () => change(() => { d.shapes.push(sh('ellipse', { rx: 4, ry: 4 })); sel = { t: 'shape', i: d.shapes.length - 1 }; }, null, 'list')),
      add('+ Lens', () => change(() => { d.shapes.push(sh('lens', { D: 16, tc: 4, R1: 30, R2: 30 })); sel = { t: 'shape', i: d.shapes.length - 1 }; }, null, 'list')),
      el('button', { class: 'btn small' + (drawPts ? ' primary' : ''), type: 'button', text: drawPts ? 'Drawing… (Enter)' : '+ Polygon', title: 'Click points in the drawing; click the first point, double-click or press Enter to close; Esc cancels', onclick: () => { drawPts = drawPts ? null : []; buildLeft(); drawEditor(); } })));
  d.shapes.forEach((s, i) => host.append(shapeCard(s, i)));
  if (!d.shapes.length) host.append(el('div', { class: 'hint', text: 'No body: add a shape, or use thin surfaces only (a mirror on its own).' }));
  host.append(el('div', { class: 'st-cap', text: 'Thin surfaces (mirrors, splitters, absorbers)' }),
    el('div', { class: 'row', style: { gap: '5px', flexWrap: 'wrap', marginBottom: '6px' } },
      add('+ Flat', () => change(() => { d.curves.push(cv('line', { L: 10 })); sel = { t: 'curve', i: d.curves.length - 1 }; }, null, 'list')),
      add('+ Spherical', () => change(() => { d.curves.push(cv('arc', { R: 40, A: 15, t: 2 })); sel = { t: 'curve', i: d.curves.length - 1 }; }, null, 'list')),
      add('+ Parabolic', () => change(() => { d.curves.push(cv('parabola', { f: 20, A: 12, offset: 0, t: 2 })); sel = { t: 'curve', i: d.curves.length - 1 }; }, null, 'list'))));
  d.curves.forEach((c, i) => host.append(curveCard(c, i)));
  host.append(el('div', { class: 'st-cap', text: 'Light sources in the part' }),
    el('div', { class: 'row', style: { gap: '5px', marginBottom: '6px' } }, add('+ Beam', () => change(() => { const b = G().outline(d.shapes).box; d.sources.push({ x: U.round(b[2] + 0.05, 2), y: 0, angle: 0, lambda: 532, power: 5, width: 0.8, div: 0 }); sel = { t: 'source', i: d.sources.length - 1 }; }, null, 'list'))));
  d.sources.forEach((q, i) => host.append(sourceCard(q, i)));
  host.append(el('div', { class: 'hint', text: 'Drag a shape in the drawing to move it, its round handles to resize it, the square one to turn it. Click a face (an edge of the body) to give it its own job on the right.' }));
}
const opBtns = (o, k) => sel1([['add', 'Add'], ['cut', 'Cut away']], () => o.op || 'add', v => { o.op = v; }, k + 'op', 'list');
const xyr = (o, k) => [lab('x'), num(() => U.round(o.x, 3), v => { o.x = v; }, { key: k + 'x' }), lab('y'), num(() => U.round(o.y, 3), v => { o.y = v; }, { key: k + 'y' }), lab('turn °'), num(() => U.round(o.rot || 0, 2), v => { o.rot = v; }, { key: k + 'r', step: 1 })];
const tools = (arr, i, t) => [el('span', { class: 'st-grow' }),
  D.iconBtn('up', 'Earlier', ev => { if (ev) ev.stopPropagation(); change(() => { moveIn(arr, i, -1); sel = { t, i: Math.max(0, i - 1) }; }, null, 'list'); }),
  D.iconBtn('down', 'Later', ev => { if (ev) ev.stopPropagation(); change(() => { moveIn(arr, i, 1); sel = { t, i: Math.min(arr.length - 1, i + 1) }; }, null, 'list'); }),
  el('button', { class: 'icon-btn', type: 'button', text: '⧉', title: 'Duplicate', onclick: ev => { ev.stopPropagation(); change(() => { const c = U.deepClone(arr[i]); if (c.id) c.id = nid(t === 'curve' ? 'c' : 's'); c.x = (c.x || 0) + 2; c.y = (c.y || 0) + 2; arr.splice(i + 1, 0, c); sel = { t, i: i + 1 }; }, null, 'list'); } }),
  D.iconBtn('trash', 'Remove', ev => { if (ev) ev.stopPropagation(); change(() => { arr.splice(i, 1); sel = null; }, null, 'list'); })];
function shapeCard(s, i) {
  const k = 'sh' + s.id, r2 = [];
  if (s.kind === 'rect') r2.push(lab('w'), num(() => s.w, v => { s.w = Math.max(0.05, v); }, { key: k + 'w', min: 0.05 }), lab('h'), num(() => s.h, v => { s.h = Math.max(0.05, v); }, { key: k + 'h', min: 0.05 }), lab('corner r'), num(() => s.r || 0, v => { s.r = Math.max(0, v); }, { key: k + 'c', min: 0 }));
  if (s.kind === 'ellipse') r2.push(lab('rx'), num(() => s.rx, v => { s.rx = Math.max(0.05, v); }, { key: k + 'rx', min: 0.05 }), lab('ry'), num(() => s.ry, v => { s.ry = Math.max(0.05, v); }, { key: k + 'ry', min: 0.05 }));
  if (s.kind === 'lens') r2.push(lab('Ø'), num(() => s.D, v => { s.D = Math.max(0.1, v); }, { key: k + 'D', min: 0.1 }), lab('centre t'), num(() => s.tc, v => { s.tc = Math.max(0.05, v); }, { key: k + 't', min: 0.05 }),
    lab('R₁'), num(() => s.R1, v => { s.R1 = v; }, { key: k + 'R1', title: 'Front radius: + convex, − concave, 0 flat' }), lab('R₂'), num(() => s.R2, v => { s.R2 = v; }, { key: k + 'R2', title: 'Back radius: + convex, − concave, 0 flat' }));
  if (s.kind === 'polygon') r2.push(lab(`${(s.pts || []).length} points: drag them in the drawing`));
  return card(sel && sel.t === 'shape' && sel.i === i, () => { if (sel && sel.t === 'shape' && sel.i === i) return; sel = { t: 'shape', i }; buildLeft(); drawEditor(); },
    el('div', { class: 'st-row' }, el('b', { text: KINDS[s.kind] || s.kind, style: { gridColumn: 'span 2' } }), opBtns(s, k)),
    el('div', { class: 'st-row2' }, ...r2), el('div', { class: 'st-row2' }, ...xyr(s, k), ...tools(d.shapes, i, 'shape')));
}
function curveCard(c, i) {
  const k = 'cv' + c.id, r2 = [];
  if (c.kind === 'line') r2.push(lab('length'), num(() => c.L, v => { c.L = Math.max(0.05, v); }, { key: k + 'L', min: 0.05 }));
  if (c.kind === 'arc') r2.push(lab('R'), num(() => c.R, v => { c.R = Math.abs(v) < 0.1 ? 0.1 : v; }, { key: k + 'R', title: 'Radius of curvature: + concave towards the light (focusing), − convex' }), lab('aperture'), num(() => c.A, v => { c.A = Math.max(0.05, v); }, { key: k + 'A', min: 0.05 }));
  if (c.kind === 'parabola') r2.push(lab('focal length'), num(() => c.f, v => { c.f = Math.max(0.1, v); }, { key: k + 'f', min: 0.1 }), lab('aperture'), num(() => c.A, v => { c.A = Math.max(0.05, v); }, { key: k + 'A', min: 0.05 }), lab('off-axis'), num(() => c.offset || 0, v => { c.offset = v; }, { key: k + 'o', title: 'Distance of the aperture centre from the axis (an off-axis parabola focuses to the side)' }));
  r2.push(lab('substrate'), num(() => c.t || 1, v => { c.t = Math.max(0.1, v); }, { key: k + 'th', min: 0.1, title: 'Drawn thickness behind the surface (mm)' }));
  const role = sel1([['mirror', 'Mirror'], ['splitter', 'Beam splitter'], ['absorb', 'Absorber'], ['pass', 'Drawing only']], () => c.role || 'mirror', v => { c.role = v; }, k + 'role', 'list');
  const rr = c.role === 'splitter' ? [lab('R'), num(() => c.R == null ? 0.5 : c.R, v => { c.R = U.clamp(v, 0, 1); }, { key: k + 'Rs', min: 0, max: 1, step: 0.01 })] : [];
  return card(sel && sel.t === 'curve' && sel.i === i, () => { if (sel && sel.t === 'curve' && sel.i === i) return; sel = { t: 'curve', i }; buildLeft(); drawEditor(); },
    el('div', { class: 'st-row' }, el('b', { text: CKINDS[c.kind] || c.kind, style: { gridColumn: 'span 2' } }), role),
    el('div', { class: 'st-row2' }, ...r2, ...rr), el('div', { class: 'st-row2' }, ...xyr(c, k), ...tools(d.curves, i, 'curve')));
}
function sourceCard(q, i) {
  const k = 'src' + i;
  return card(sel && sel.t === 'source' && sel.i === i, () => { if (sel && sel.t === 'source' && sel.i === i) return; sel = { t: 'source', i }; buildLeft(); drawEditor(); },
    el('div', { class: 'st-row2' }, el('b', { text: 'Beam' }), lab('λ (nm)'), num(() => q.lambda, v => { q.lambda = U.clamp(v, 150, 20000); }, { key: k + 'l', step: 1 }), lab('power (mW)'), num(() => q.power, v => { q.power = Math.max(0, v); }, { key: k + 'p', min: 0 })),
    el('div', { class: 'st-row2' }, lab('x'), num(() => q.x, v => { q.x = v; }, { key: k + 'x' }), lab('y'), num(() => q.y, v => { q.y = v; }, { key: k + 'y' }), lab('direction °'), num(() => q.angle, v => { q.angle = v; }, { key: k + 'a', step: 1 }),
      lab('Ø'), num(() => q.width, v => { q.width = Math.max(0.05, v); }, { key: k + 'w', min: 0.05 }), ...tools(d.sources, i, 'source').slice(3)));
}

/* ---------- right: body, faces, look, 3D ---------- */
const FACE_NAMES = { top: 'top', bottom: 'bottom', left: 'left', right: 'right', rim: 'edge', front: 'front surface', back: 'back surface' };
const faceLabel = key => { const [id, f] = key.split(':'), i = d.shapes.findIndex(s => s.id === id), s = d.shapes[i]; if (!s) return key; return `${KINDS[s.kind] || s.kind} ${i + 1}${s.op === 'cut' ? ' (cut)' : ''} · ${f[0] === 'e' && s.kind === 'polygon' ? 'side ' + (+f.slice(1) + 1) : FACE_NAMES[f] || f}`; };
function buildRight() {
  const host = views.right; if (!host) return; host.innerHTML = '';
  const b = d.body;
  const kids = [fld('What the body does to light', sel1([['glass', 'Glass (refracts)'], ['opaque', 'Opaque (absorbs)'], ['mirror', 'Mirror (every face reflects)'], ['none', 'Nothing (drawing only)']], () => b.kind, v => { b.kind = v; }, 'bk', 'list'))];
  if (b.kind === 'glass') {
    const mats = Object.keys(RNBX.optics.MATERIALS).map(k => [k, RNBX.optics.MATERIALS[k].name]).concat([['custom', 'Custom index n']]);
    kids.push(fld('Material', sel1(mats, () => b.mat || 'N-BK7', v => { b.mat = v; }, 'bm', 'list')));
    if (b.mat === 'custom') kids.push(fld('n', num(() => b.n || 1.5, v => { b.n = Math.max(1, v); }, { key: 'bn', min: 1, step: 0.01 })));
  }
  host.append(el('div', { class: 'st-grid' }, ...kids));
  // faces
  const res = G().outline(d.shapes), faces = G().faces(res);
  if (b.kind !== 'none' && faces.length) {
    const dflt = b.kind === 'glass' ? 'glass' : b.kind === 'mirror' ? 'mirror' : 'absorb';
    const opts = [['', 'As the body (' + ({ glass: 'glass', mirror: 'mirror', absorb: 'absorbs' })[dflt] + ')'], ['mirror', 'Mirror coating'], ['absorb', 'Blackened (absorbs)'], ['splitter', 'Beam-splitter coating']].concat(b.kind !== 'glass' ? [] : [['glass', 'Glass']]);
    const list = el('div', { class: 'pb-faces' });
    faces.forEach(f => {
      const cur = (b.faces || {})[f.key] || '';
      const s = el('select', { onchange: () => change(() => { b.faces = b.faces || {}; if (s.value) b.faces[f.key] = s.value; else delete b.faces[f.key]; }, 'face' + f.key, 'list') }, opts.map(q => el('option', { value: q[0], text: q[1] })));
      s.value = cur;
      const row = el('div', { class: 'pb-face' + (face === f.key ? ' sel' : ''), onmouseenter: () => { face = f.key; drawEditor(); }, onclick: () => { face = f.key; drawEditor(); } }, el('span', { text: faceLabel(f.key) + ` (${UI().f1(f.len, 1)} mm)` }), s);
      if (cur === 'splitter') row.append(el('span', { class: 'hint', style: { margin: 0 }, text: 'R' }), num(() => (b.faceR || {})[f.key] == null ? 0.5 : b.faceR[f.key], v => { b.faceR = b.faceR || {}; b.faceR[f.key] = U.clamp(v, 0, 1); }, { key: 'fr' + f.key, min: 0, max: 1, step: 0.01 }));
      list.append(row);
    });
    host.append(el('div', { class: 'st-cap', text: 'Faces (click one in the drawing to find it here)' }), list);
  }
  const lk = d.look;
  host.append(el('div', { class: 'st-cap', text: 'Look' }), el('div', { class: 'st-grid' },
    fld('Finish', sel1([['', 'Automatic'], ['glass', 'Glass'], ['metal', 'Metal'], ['matte', 'Matte'], ['mirror', 'Mirror']], () => lk.finish || '', v => { lk.finish = v; }, 'lf')),
    fld('Colour', (() => { const c = el('input', { type: 'color', value: (lk.color || '#9aa3ad').slice(0, 7), oninput: () => change(() => { lk.color = c.value; }, 'lc') }); return c; })()),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Default colour', onclick: () => change(() => { lk.color = ''; }, null, 'list') }),
    fld('Glass opacity', num(() => lk.alpha == null ? 0.35 : lk.alpha, v => { lk.alpha = U.clamp(v, 0.05, 1); }, { key: 'la', min: 0.05, max: 1, step: 0.05 }))));
  host.append(el('div', { class: 'st-cap', text: '3D body' }), el('div', { class: 'st-grid' },
    fld('Shape in 3D', sel1([['extrude', 'Extruded (a prism-like block)'], ['revolve', 'Turned about the axis (round)']], () => d.d3.mode, v => { d.d3.mode = v; }, 'dm')),
    fld('Height (mm)', num(() => d.d3.h, v => { d.d3.h = Math.max(0.2, v); }, { key: 'dh', min: 0.2, title: 'Extruded parts: height of the block' }))));
}
function buildTest() {
  const host = views.testCtl; if (!host) return; host.innerHTML = '';
  const t = d.test;
  host.append(el('div', { class: 'st-grid' },
    el('label', { class: 'st-f row' }, el('input', { type: 'checkbox', checked: !!t.on, onchange: e => change(() => { t.on = e.target.checked; }, null, 'test') }), el('span', { text: 'On' })),
    fld('Beam', sel1([['parallel', 'Parallel rays'], ['point', 'From a point']], () => t.mode, v => { t.mode = v; }, 'tm')),
    fld(t.mode === 'point' ? 'Fan angle (°)' : 'Width (mm)', num(() => (t.mode === 'point' ? t.fan || 20 : t.h), v => { if (t.mode === 'point') t.fan = U.clamp(v, 0.5, 170); else t.h = Math.max(0.1, v); }, { key: 'th', min: 0.1 })),
    fld('Rays', num(() => t.rays, v => { t.rays = U.clamp(Math.round(v), 1, 41); }, { key: 'tr', min: 1, max: 41, step: 1 })),
    fld('Angle (°)', num(() => t.tilt, v => { t.tilt = U.clamp(v, -60, 60); }, { key: 'tt', step: 1 })),
    fld('Height (mm)', num(() => t.offset || 0, v => { t.offset = v; }, { key: 'to', title: 'Shift the beam up or down' })),
    fld('λ (nm)', num(() => t.lambda, v => { t.lambda = U.clamp(v, 150, 20000); }, { key: 'tl', step: 1 }))));
}

/* ---------- the test bench: the part alone with a ray bundle ---------- */
const BENCH = [200, 120];
function bench(withTest) {
  const doc = RNBX.newDocument(); doc.page.width = 400; doc.page.height = 240; doc.style.ghosts = 'off';
  const part = RNBX.createObject('built', BENCH[0], BENCH[1]); part.props.design = U.deepClone(d); part.label = { text: '', dx: 0, dy: 0, show: false };
  doc.objects = [part];
  if (withTest && d.test.on) {
    const box = G().outline(d.shapes).box, cx = Math.min(box[0], ...d.curves.flatMap(c => G().curvePts(c).map(p => p[0]))), t = d.test;
    const src = RNBX.createObject('raysource', BENCH[0] + Math.min(-12, cx - 14), BENCH[1] + (+t.offset || 0));
    Object.assign(src.props, { mode: t.mode === 'point' ? 'point' : 'parallel', h: t.mode === 'point' ? 0.3 : t.h, rays: t.rays, fan: t.fan || 20, tilt: t.tilt || 0, lambda: t.lambda, colors: 'single' });
    src.label = { text: '', dx: 0, dy: 0, show: false };
    doc.objects.push(src);
  }
  return RNBX.normalizeDocument(doc);
}
PB.traceTest = () => { const doc = bench(true), tr = RNBX.trace(doc); return { doc, tr }; };
/* where the rays that leave the part meet (median crossing of neighbouring rays) */
function focusOf(tr) {
  const fin = tr.segments.filter(s => !s.vertical && s.end === 'open' && Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]) > 5);
  const xs = [];
  for (let i = 0; i < fin.length; i++) for (let j = i + 1; j < fin.length; j++) {
    const a = fin[i], b = fin[j], d1 = [a.b[0] - a.a[0], a.b[1] - a.a[1]], d2 = [b.b[0] - b.a[0], b.b[1] - b.a[1]], den = d1[0] * d2[1] - d1[1] * d2[0];
    if (Math.abs(den) < 1e-9) continue;
    const t = ((b.a[0] - a.a[0]) * d2[1] - (b.a[1] - a.a[1]) * d2[0]) / den, u = ((b.a[0] - a.a[0]) * d1[1] - (b.a[1] - a.a[1]) * d1[0]) / den;
    if (t > 0 && u > 0 && t < 1 && u < 1) xs.push([a.a[0] + t * d1[0], a.a[1] + t * d1[1]]);
  }
  if (xs.length < 2) return null;
  const med = k => xs.map(p => p[k]).sort((p, q) => p - q)[Math.floor(xs.length / 2)];
  const c = [med(0), med(1)], spread = Math.sqrt(xs.reduce((a, p) => a + (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2, 0) / xs.length);
  return { x: c[0] - BENCH[0], y: c[1] - BENCH[1], spread };
}

/* ---------- the editor ---------- */
let edCache = null, refreshT = 0;
function refresh() { clearTimeout(refreshT); drawEditor(); refreshT = setTimeout(draw3d, 120); }
const toPart = (o, u, v) => { const a = (o.rot || 0) * Math.PI / 180; return [(o.x || 0) + u * Math.cos(a) - v * Math.sin(a), (o.y || 0) + u * Math.sin(a) + v * Math.cos(a)]; };
const toLocal = (o, x, y) => { const a = -(o.rot || 0) * Math.PI / 180, dx = x - (o.x || 0), dy = y - (o.y || 0); return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; };
function extentOf(o) { if (o.kind === 'rect') return Math.max(o.w, o.h) / 2; if (o.kind === 'ellipse') return Math.max(o.rx, o.ry); if (o.kind === 'lens') return Math.max(o.D / 2, o.tc / 2); if (o.kind === 'polygon') return Math.max(...(o.pts || [[1, 1]]).map(p => Math.hypot(p[0], p[1]))); if (o.kind === 'line') return o.L / 2; return (o.A || 10) / 2 + Math.abs(o.offset || 0); }
function handlesOf() {
  if (!sel) return [];
  const out = [];
  if (sel.t === 'shape') {
    const o = d.shapes[sel.i]; if (!o) return [];
    const H = (type, u, v, extra) => out.push(Object.assign({ type, p: toPart(o, u, v) }, extra || {}));
    if (o.kind === 'rect') H('wh', o.w / 2, o.h / 2);
    if (o.kind === 'ellipse') { H('rx', o.rx, 0); H('ry', 0, o.ry); }
    if (o.kind === 'lens') { H('D', 0, o.D / 2); H('tc', o.tc / 2, 0); }
    if (o.kind === 'polygon') (o.pts || []).forEach((q, k) => H('pt', q[0], q[1], { k }));
    H('rot', 0, -(extentOf(o) + 2.5), { sq: true });
  } else if (sel.t === 'curve') {
    const o = d.curves[sel.i]; if (!o) return [];
    const pts = G().curvePts(o), e = pts[pts.length - 1];
    out.push({ type: 'cA', p: e });
    out.push({ type: 'rot', p: toPart(o, -3 - (o.t || 1), 0), sq: true });
  } else if (sel.t === 'source') {
    const q = d.sources[sel.i]; if (!q) return [];
    const a = (q.angle || 0) * Math.PI / 180;
    out.push({ type: 'dir', p: [q.x + 6 * Math.cos(a), q.y + 6 * Math.sin(a)], sq: true });
  }
  return out;
}
function drawEditor() {
  const host = views.editor; if (!host || !d) return;
  const w = Math.max(320, host.clientWidth || 520), h = Math.round(Math.min(520, Math.max(320, w * 0.72)));
  const res = G().outline(d.shapes);
  let tr = null, bdoc = null;
  try { const r = PB.traceTest(); tr = r.tr; bdoc = r.doc; } catch (e) { tr = null; }
  testRes = tr;
  // the view: the part with room around it (kept while editing, refitted on demand)
  const pts = res.rings.flatMap(r => r.pts).concat(d.curves.flatMap(c => G().curvePts(c)), d.sources.map(q => [q.x, q.y]));
  if (!view || view.stale) {
    const b = pts.length ? [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))] : [-10, -10, 10, 10];
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, span = Math.max(20, (b[2] - b[0]) * 1.6, (b[3] - b[1]) * 1.6 * w / h);
    view = { cx, cy, span };
  }
  const k = w / view.span, X = x => w / 2 + (x - view.cx) * k, Y = y => h / 2 + (y - view.cy) * k;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart pb-svg">`;
  // grid
  const step = UI().niceStep(view.span / 10, 1), x0 = view.cx - w / 2 / k, x1 = view.cx + w / 2 / k, y0 = view.cy - h / 2 / k, y1 = view.cy + h / 2 / k;
  for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) s += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${h}" stroke="${Math.abs(x) < 1e-9 ? '#00000040' : '#0000000f'}"/>`;
  for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) s += `<line x1="0" y1="${Y(y)}" x2="${w}" y2="${Y(y)}" stroke="${Math.abs(y) < 1e-9 ? '#00000040' : '#0000000f'}"/>`;
  s += `<text x="6" y="${h - 6}" fill="#777">grid ${UI().fmt(step, step)} mm</text>`;
  // cut shapes as dashed outlines, so they can be found
  d.shapes.forEach((o, i) => { if (o.op !== 'cut') return; const r2 = G().outline([Object.assign({}, o, { op: 'add' })]); r2.rings.forEach(r => { s += `<path d="M ${r.pts.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' L ')} Z" fill="none" stroke="#d62728" stroke-dasharray="4 3" stroke-width="${sel && sel.t === 'shape' && sel.i === i ? 1.6 : 0.8}"/>`; }); });
  // the part as it will be drawn (from its own component, at this scale)
  const look = Object.assign({}, d.look), fin = look.finish || (d.body.kind === 'glass' ? 'glass' : 'matte');
  const fill = fin === 'glass' ? (look.color || '#bfe0f2') : fin === 'mirror' ? '#d7dce2' : (look.color || (fin === 'metal' ? '#b9bec6' : '#4b525c'));
  const path = res.rings.map(r => 'M ' + r.pts.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' L ') + ' Z').join(' ');
  if (path) s += `<path d="${path}" fill="${fill}" fill-opacity="${fin === 'glass' ? 0.55 : 0.9}" fill-rule="evenodd" stroke="#1d1f23" stroke-width="1"/>`;
  const faces = d.body.faces || {};
  res.rings.forEach(r => r.pts.forEach((q, i) => {
    const t = r.pts[(i + 1) % r.pts.length], key = r.faces[i], role = faces[key];
    if (face === key) s += `<line x1="${X(q[0])}" y1="${Y(q[1])}" x2="${X(t[0])}" y2="${Y(t[1])}" stroke="var(--accent)" stroke-width="5" stroke-opacity="0.55" stroke-linecap="round"/>`;
    if (role && role !== 'glass') s += `<line x1="${X(q[0])}" y1="${Y(q[1])}" x2="${X(t[0])}" y2="${Y(t[1])}" stroke="${role === 'mirror' ? '#7d8794' : role === 'absorb' ? '#111' : '#3d7ab8'}" stroke-width="3" stroke-linecap="round" ${role === 'splitter' ? 'stroke-dasharray="5 3"' : ''}/>`;
  }));
  d.curves.forEach((c, i) => {
    const cp = G().curvePts(c), col = c.role === 'absorb' ? '#111' : c.role === 'splitter' ? '#3d7ab8' : c.role === 'pass' ? '#9aa1ab' : '#5d6670';
    s += `<path d="M ${cp.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' L ')}" fill="none" stroke="${col}" stroke-width="${sel && sel.t === 'curve' && sel.i === i ? 4.5 : 3}" stroke-linecap="round" ${c.role === 'splitter' ? 'stroke-dasharray="6 3"' : ''}/>`;
  });
  // rays of the test beam and of the part's own sources
  if (tr) {
    let rays = '';
    tr.segments.forEach(g => { if (g.vertical || g.ghost) return; const a = [g.a[0] - BENCH[0], g.a[1] - BENCH[1]], b = [g.b[0] - BENCH[0], g.b[1] - BENCH[1]]; rays += `<line x1="${X(a[0]).toFixed(1)}" y1="${Y(a[1]).toFixed(1)}" x2="${X(b[0]).toFixed(1)}" y2="${Y(b[1]).toFixed(1)}" stroke="${U.wavelengthColor(g.lambda)}" stroke-opacity="${U.clamp(0.25 + 0.75 * Math.sqrt(g.P / (g.P0 || g.P || 1)), 0.2, 1)}" stroke-width="1.1"/>`; });
    s += `<g>${rays}</g>`;
  }
  d.sources.forEach((q, i) => { const a = (q.angle || 0) * Math.PI / 180; s += `<circle cx="${X(q.x)}" cy="${Y(q.y)}" r="4" fill="#d62728" stroke="#fff"/><line x1="${X(q.x)}" y1="${Y(q.y)}" x2="${X(q.x + 4 * Math.cos(a))}" y2="${Y(q.y + 4 * Math.sin(a))}" stroke="#d62728" stroke-width="2"/>`; });
  // selection and handles
  if (sel && sel.t === 'shape' && d.shapes[sel.i] && d.shapes[sel.i].op !== 'cut') { const r2 = G().outline([Object.assign({}, d.shapes[sel.i], { op: 'add' })]); r2.rings.forEach(r => { s += `<path d="M ${r.pts.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' L ')} Z" fill="none" stroke="var(--accent)" stroke-dasharray="5 3" stroke-width="1.4"/>`; }); }
  const hs = handlesOf();
  hs.forEach(hd => { s += hd.sq ? `<rect x="${X(hd.p[0]) - 5}" y="${Y(hd.p[1]) - 5}" width="10" height="10" fill="var(--accent)" stroke="#fff" stroke-width="1.2"/>` : `<circle cx="${X(hd.p[0])}" cy="${Y(hd.p[1])}" r="5.5" fill="var(--accent)" stroke="#fff" stroke-width="1.2"/>`; });
  if (drawPts) {
    if (drawPts.length) s += `<path d="M ${drawPts.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' L ')}" fill="none" stroke="var(--accent)" stroke-width="1.6"/>` + drawPts.map((q, i) => `<circle cx="${X(q[0])}" cy="${Y(q[1])}" r="${i ? 3.5 : 5.5}" fill="${i ? 'var(--accent)' : '#fff'}" stroke="var(--accent)" stroke-width="1.5"/>`).join('');
    s += `<text x="${w / 2}" y="16" text-anchor="middle" fill="var(--accent)" font-weight="700">Click points; click the first point, double-click or press Enter to close (Esc cancels)</text>`;
  }
  s += `<text x="${w - 6}" y="${h - 6}" text-anchor="end" fill="#777">scroll to zoom · drag the background to pan · double-click the background to fit</text>`;
  host.innerHTML = s + '</svg>';
  edCache = { X, Y, k, w, h, res, hs };
  const svg = host.querySelector('svg'); svg.style.touchAction = 'none';
  svg.onpointerdown = onDown; svg.ondblclick = onDbl;
  svg.onwheel = e => { e.preventDefault(); const f = e.deltaY > 0 ? 1.15 : 1 / 1.15, b = svg.getBoundingClientRect(), px = (e.clientX - b.left) * w / b.width, py = (e.clientY - b.top) * w / b.width, mx = view.cx + (px - w / 2) / k, my = view.cy + (py - h / 2) / k;
    view.span *= f; view.cx = mx - (mx - view.cx) * f; view.cy = my - (my - view.cy) * f; drawEditor(); };
  readout(tr);
}
function readout(tr) {
  const host = views.readout; if (!host) return;
  const res = G().outline(d.shapes), b = res.box, lines = [];
  if (res.rings.length) lines.push(`Body ${UI().f1(b[2] - b[0], 2)} × ${UI().f1(b[3] - b[1], 2)} mm, ${G().faces(res).length} faces.`);
  if (tr && d.test.on) {
    const f = focusOf(tr);
    if (f && f.spread < 2) lines.push(`The rays meet at x = ${UI().f1(f.x, 2)} mm, y = ${UI().f1(f.y, 2)} mm (spread ${UI().f1(f.spread, 3)} mm)` + (res.rings.length ? `, ${UI().f1(f.x - b[2], 2)} mm after the back of the part.` : '.'));
    else if (f) lines.push('The outgoing rays do not meet in one point (spread ' + UI().f1(f.spread, 1) + ' mm).');
    const lost = Object.values(tr.hits || {}).reduce((a, h) => a + h.P, 0);
    if (lost > 1e-6) lines.push(`Absorbed in the part: ${UI().f1(lost, 3)} (units of the test beam).`);
  }
  host.innerHTML = `<div class="readout">${lines.join('<br>') || 'Add a shape or a surface.'}</div>`;
}
function onDbl(e) {
  if (drawPts) { finishPolygon(); return; }
  const tgt = e.target; if (tgt.tagName === 'svg' || tgt.tagName === 'line' || tgt.tagName === 'text') { view = null; drawEditor(); }
}
function finishPolygon() {
  const pts = (drawPts || []).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 1e-3);
  drawPts = null;
  if (pts.length < 3) { buildLeft(); drawEditor(); return; }
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  change(() => { d.shapes.push(sh('polygon', { x: U.round(cx, 3), y: U.round(cy, 3), pts: pts.map(p => [U.round(p[0] - cx, 3), U.round(p[1] - cy, 3)]) })); sel = { t: 'shape', i: d.shapes.length - 1 }; }, null, 'list');
}
const segD = (px, py, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1], t = U.clamp(((px - a[0]) * vx + (py - a[1]) * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(px - a[0] - t * vx, py - a[1] - t * vy); };
function onDown(e) {
  const svg = e.currentTarget, b = svg.getBoundingClientRect(), ec = edCache; if (!ec) return;
  const sc = ec.w / b.width, px = (e.clientX - b.left) * sc, py = (e.clientY - b.top) * sc;
  const mm = (qx, qy) => [view.cx + (qx - ec.w / 2) / ec.k, view.cy + (qy - ec.h / 2) / ec.k], p0 = mm(px, py);
  if (drawPts) {
    const snap = q => [U.round(q[0] * 10) / 10, U.round(q[1] * 10) / 10].map(v => Math.round(v * 10) / 10);
    if (drawPts.length >= 3 && Math.hypot(ec.X(drawPts[0][0]) - px, ec.Y(drawPts[0][1]) - py) < 8) { finishPolygon(); return; }
    drawPts.push(snap(p0)); drawEditor(); return;
  }
  let mode = null, idx = null;
  const hd = ec.hs.find(q => Math.hypot(ec.X(q.p[0]) - px, ec.Y(q.p[1]) - py) < 9);
  if (hd) { mode = hd.type; idx = hd.k; }
  else {
    // a face of the body?
    let best = null, bd = 6 / ec.k;
    ec.res.rings.forEach(r => r.pts.forEach((q, i) => { const t = r.pts[(i + 1) % r.pts.length], dd = segD(p0[0], p0[1], q, t); if (dd < bd) { bd = dd; best = r.faces[i]; } }));
    // thin surfaces and sources first, then shapes (topmost last)
    const ci = d.curves.findIndex(c => { const cp = G().curvePts(c); for (let i = 0; i < cp.length - 1; i++) if (segD(p0[0], p0[1], cp[i], cp[i + 1]) < 6 / ec.k) return true; return false; });
    const si = d.sources.findIndex(q => Math.hypot(q.x - p0[0], q.y - p0[1]) < 7 / ec.k);
    let shi = -1; d.shapes.forEach((o, i) => { if (G().sdf(o, p0[0], p0[1]).d < 0) shi = i; });
    if (si >= 0) { sel = { t: 'source', i: si }; mode = 'move'; }
    else if (ci >= 0) { sel = { t: 'curve', i: ci }; mode = 'move'; }
    else if (best && d.body.kind !== 'none') { face = best; const id = best.split(':')[0]; shi = d.shapes.findIndex(o => o.id === id); sel = shi >= 0 ? { t: 'shape', i: shi } : sel; buildLeft(); buildRight(); drawEditor(); const row = root.querySelector('.pb-face.sel'); if (row) row.scrollIntoView({ block: 'nearest' }); return; }
    else if (shi >= 0) { sel = { t: 'shape', i: shi }; mode = 'move'; }
    else { mode = 'pan'; }
    if (mode !== 'pan') { face = null; buildLeft(); }
  }
  e.preventDefault();
  const o = sel ? (sel.t === 'shape' ? d.shapes[sel.i] : sel.t === 'curve' ? d.curves[sel.i] : d.sources[sel.i]) : null;
  const st = o ? JSON.parse(JSON.stringify(o)) : null, v0 = Object.assign({}, view);
  if (mode !== 'pan') step('drag' + Date.now());
  const r3 = v => Math.round(v * 1000) / 1000, snap = v => (e.shiftKey ? v : Math.round(v * 20) / 20);
  const move = ev => {
    const p = mm((ev.clientX - b.left) * sc, (ev.clientY - b.top) * sc), dx = p[0] - p0[0], dy = p[1] - p0[1];
    if (mode === 'pan') { view.cx = v0.cx - (ev.clientX - e.clientX) * sc / ec.k; view.cy = v0.cy - (ev.clientY - e.clientY) * sc / ec.k; drawEditor(); return; }
    if (!o) return;
    if (mode === 'move') { o.x = r3(snap(st.x + dx)); o.y = r3(snap(st.y + dy)); }
    else if (mode === 'rot') { o.rot = Math.round(Math.atan2(p[1] - st.y, p[0] - st.x) * 180 / Math.PI + (sel.t === 'curve' ? 180 : 90)); }
    else if (mode === 'dir') { o.angle = Math.round(Math.atan2(p[1] - st.y, p[0] - st.x) * 180 / Math.PI); }
    else {
      const [u, v] = toLocal(st, p[0], p[1]);
      if (mode === 'wh') { o.w = r3(Math.max(0.1, snap(2 * Math.abs(u)))); o.h = r3(Math.max(0.1, snap(2 * Math.abs(v)))); }
      if (mode === 'rx') o.rx = r3(Math.max(0.05, snap(Math.abs(u))));
      if (mode === 'ry') o.ry = r3(Math.max(0.05, snap(Math.abs(v))));
      if (mode === 'D') o.D = r3(Math.max(0.1, snap(2 * Math.abs(v))));
      if (mode === 'tc') o.tc = r3(Math.max(0.05, snap(2 * Math.abs(u))));
      if (mode === 'pt') o.pts[idx] = [r3(snap(u)), r3(snap(v))];
      if (mode === 'cA') { if (o.kind === 'line') o.L = r3(Math.max(0.1, snap(2 * Math.abs(v)))); else o.A = r3(Math.max(0.1, snap(2 * Math.abs(v - (o.offset || 0))))); }
    }
    save(); drawEditor();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (mode !== 'pan') { buildLeft(); buildRight(); refresh(); } };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}

/* ---------- 3D preview ---------- */
let yaw = -35;
function draw3d() {
  const host = views.d3; if (!host || !d) return;
  const doc = bench(true);
  doc.style.mode = '3d';
  const res = G().outline(d.shapes), b = res.box, span = Math.max(20, b[2] - b[0], b[3] - b[1], (d.d3.h || 10)) * 2.2;
  doc.page.width = Math.round(span * 1.4); doc.page.height = Math.round(span);
  const dx = doc.page.width / 2 - BENCH[0], dy = doc.page.height / 2 - BENCH[1];
  doc.objects.forEach(o => { o.x += dx; o.y += dy; });
  Object.assign(doc.view3d, { yaw, pitch: 26, zoom: 1, panX: 0, panY: 0, table: false, holes: false, posts: false, beamHeight: Math.max(6, (d.d3.h || 10) / 2 + 1) });
  let svg = '';
  try { svg = RNBX.render.build(doc).svg; } catch (e) { svg = `<div class="hint">3D preview failed: ${U.esc(e.message)}</div>`; }
  host.innerHTML = '';
  const box = el('div', { class: 'pb-3dview', html: svg });
  const slider = el('input', { type: 'range', min: -180, max: 180, step: 1, value: yaw, oninput: () => { yaw = +slider.value; clearTimeout(prevT); prevT = setTimeout(draw3d, 16); } });
  host.append(box, el('label', { class: 'st-f row' }, el('span', { text: 'Turn' }), slider));
}

/* ---------- files, library, figure ---------- */
function saveFile() { U.download(new Blob([JSON.stringify({ rnbeamx: 'part', version: 1, design: d }, null, 1)], { type: 'application/json' }), U.slug(d.name || 'part') + '.rnbxpart.json'); }
function openFile() {
  RNBX.project.pickFile('.json,application/json', f => f.text().then(t => {
    const j = JSON.parse(t), v = j.design || (j.format === 'rnbeamx-component' && j.type === 'built' ? j.props.design : null) || j;
    if (!v || !Array.isArray(v.shapes)) throw new Error('This is not a Part Builder design');
    PB.setDesign(Object.assign(PRESETS[0].make(), v));
  }).catch(e => RNBX.toast(e.message || String(e), 'error')));
}
const asObject = () => { const o = RNBX.createObject('built', 0, 0); o.props.design = U.deepClone(d); o.props.title = d.name || 'Built part'; if (o.label) o.label.text = d.name || ''; return o; };
function toLibrary() {
  if (!RNBX.groups || !RNBX.groups.save) return;
  RNBX.groups.save(asObject(), d.name || 'Built part');
  RNBX.toast(`“${d.name || 'Built part'}” is in My components (parts list, this browser). Save writes a file to share it.`);
  U.track('part-library');
}
PB.insert = (opt = {}) => {
  const doc = S.doc, W = doc.page.width, H = doc.page.height;
  RNBX.history.checkpoint();
  let obj;
  if (target && !opt.asNew && doc.objects.includes(target)) { obj = target; obj.props.design = U.deepClone(d); obj.props.title = d.name || obj.props.title; }
  else {
    obj = asObject();
    const boxes = doc.objects.filter(o => RNBX.lib.get(o.type) && !RNBX.lib.get(o.type).connection && o.type !== 'panel').map(o => RNBX.lib.worldBox(o));
    obj.x = boxes.length ? Math.min(W - 20, Math.max(...boxes.map(q => q[2])) + 20) : W / 2; obj.y = H / 2;
    doc.objects.push(obj);
  }
  RNBX.select([obj.id]); RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build();
  U.track('part-insert');
  return obj;
};
function insert() {
  const was = !!target;
  PB.insert(); ST().close();
  RNBX.toast(was ? 'Part updated' : 'Part inserted: drag it into place, it works with the light like any other part');
}
})();
