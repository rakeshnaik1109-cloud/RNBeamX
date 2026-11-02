/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/pattern.js
   Layer Studio ▸ Pattern: one unit cell of a periodic (1D)
   structure — gratings, wire grids, guided-mode resonance
   filters, slanted and blazed gratings, metal-strip
   metasurfaces — calculated rigorously (RCWA, engine/rcwa.js).

   A design is the period, the medium above, the substrate and a
   list of layers from the top down. Each layer is a film of one
   material with shapes in it (ridge / trapezoid / slanted ridge,
   sinusoid, sawtooth). Shapes are edited with numbers or by
   dragging them in the cross-section.
   Views: the cross-section, the diffraction orders at one
   wavelength and angle, R / T / A against wavelength or angle,
   and a wavelength × angle map (on request: it is the slow one).
   "Insert" puts it on the figure as a Patterned structure.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el;
const PS = RNBX.patternStudio = {};
const KEY = 'rnbx-pattern-v1';
const ST = () => RNBX.studio, UI = () => RNBX.studio.ui, RC = () => RNBX.rcwa, TF = () => RNBX.thinfilm;

/* ---------- designs ---------- */
const col = m => UI().colorOf(m), nm = m => UI().shortName(m);
const ridge = (mat, x, wb, extra) => Object.assign({ kind: 'trap', x, wb, wt: wb, shift: 0, mat, name: nm(mat), color: col(mat) }, extra || {});
const film = (mat, t, shapes, extra) => Object.assign({ name: mat === 'air' ? 'Air' : nm(mat), mat, color: mat === 'air' ? '#ffffff' : col(mat), nm: t, shapes: shapes || [] }, extra || {});
const rgroup = (repeat, items, name) => ({ group: true, repeat, name: name || 'Repeat', items });
const design = (name, period, layers, extra) => Object.assign({
  name, period, ambient: 'air', ambientN: 1.33, side: 'top', substrate: { mat: 'glass:N-BK7', name: 'Glass', color: '#cfe6f2' }, layers, orders: 15, slices: 12,
  calc: { scan: 'wl', lmin: 400, lmax: 1000, angle: 0, amin: 0, amax: 80, lambda: 633, pol: 'p', show: 'RTA', points: 101 },
  probe: { nm: 633, angle: 0, pol: 'p' }, map: { show: 'R', pol: 'p', lmin: 400, lmax: 1000, amin: 0, amax: 60, res: 'low' }, view: { periods: 3, vex: 0 },
}, extra || {});
const calc = o => ({ calc: Object.assign({ scan: 'wl', lmin: 400, lmax: 1000, angle: 0, amin: 0, amax: 80, lambda: 633, pol: 'p', show: 'RTA', points: 101 }, o) });
const PRESETS = [
  { id: 'lamellar', name: 'Lamellar grating (TiO₂ lines on glass)', make: () => design('Lamellar grating', 400, [film('air', 150, [ridge('TiO2', 200, 200)])]) },
  { id: 'gmr', name: 'Guided-mode resonance filter', make: () => design('GMR filter', 380, [film('air', 60, [ridge('TiO2', 190, 190)], { name: 'Grating' }), film('TiO2', 100, [], { name: 'Waveguide' })],
    Object.assign(calc({ lmin: 600, lmax: 800, pol: 's', points: 201 }), { probe: { nm: 713.5, angle: 0, pol: 's' }, map: { show: 'R', pol: 's', lmin: 600, lmax: 800, amin: 0, amax: 15, res: 'low' } })) },
  { id: 'wire', name: 'Wire-grid polariser (Al)', make: () => design('Wire-grid polariser', 140, [film('air', 150, [ridge('Al', 70, 70)])], Object.assign(calc({ lmin: 400, lmax: 1000, pol: 'p' }), { probe: { nm: 600, angle: 0, pol: 'p' } })) },
  { id: 'gap', name: 'Gap-plasmon absorber (Au strips / SiO₂ / Au)', make: () => design('Gap-plasmon absorber', 400, [film('air', 30, [ridge('Au', 200, 150)], { name: 'Strips' }), film('SiO2', 10, [], { name: 'Spacer' }), film('Au', 100, [], { name: 'Mirror' })],
    Object.assign(calc({ lmin: 700, lmax: 1800, pol: 'p', points: 101 }), { orders: 20, probe: { nm: 1270, angle: 0, pol: 'p' }, map: { show: 'R', pol: 'p', lmin: 700, lmax: 1800, amin: 0, amax: 60, res: 'low' } })) },
  { id: 'sine', name: 'Sinusoidal Au grating (plasmon coupling)', make: () => design('Sinusoidal Au grating', 600, [film('air', 60, [{ kind: 'sine', x: 300, mat: 'Au', name: 'Au', color: col('Au') }], { name: 'Profile' }), film('Au', 150, [], { name: 'Au' })],
    Object.assign(calc({ scan: 'angle', amin: 0, amax: 40, lambda: 633, pol: 'p', points: 161 }), { probe: { nm: 633, angle: 0.5, pol: 'p' }, map: { show: 'R', pol: 'p', lmin: 500, lmax: 900, amin: 0, amax: 40, res: 'low' } })) },
  { id: 'blazed', name: 'Blazed grating (Al, 1200 lines/mm)', make: () => design('Blazed grating', 833, [film('air', 320, [{ kind: 'saw', x: 0, dir: 1, mat: 'Al', name: 'Al', color: col('Al') }], { name: 'Teeth' }), film('Al', 150, [], { name: 'Al' })],
    Object.assign(calc({ lmin: 400, lmax: 900, pol: 's' }), { orders: 20, slices: 16, probe: { nm: 600, angle: 0, pol: 's' } })) },
  { id: 'slanted', name: 'Slanted grating (waveguide coupler)', make: () => design('Slanted grating', 400, [film('air', 300, [ridge('TiO2', 150, 200, { shift: 150 })])], Object.assign(calc({ lmin: 450, lmax: 700, pol: 's' }), { probe: { nm: 550, angle: 0, pol: 's' } })) },
  { id: 'trap', name: 'Trapezoid ridges (Si on SiO₂)', make: () => design('Trapezoid grating', 600, [film('air', 220, [ridge('Si', 300, 360, { wt: 220 })])], { substrate: { mat: 'SiO2', name: 'SiO₂', color: col('SiO2') } }) },
  { id: 'two', name: 'Two ridges per period', make: () => design('Two-ridge cell', 600, [film('air', 200, [ridge('TiO2', 150, 160), ridge('TiO2', 420, 70)])]) },
  { id: 'step', name: 'Two-level (stepped) grating', make: () => design('Stepped grating', 600, [film('air', 120, [ridge('SiO2', 225, 150)], { name: 'Upper step' }), film('air', 120, [ridge('SiO2', 300, 300)], { name: 'Lower step' })]) },
  { id: 'bsw', name: 'Grating on a Bragg mirror (Bloch surface wave)', make: () => design('Grating on a Bragg mirror', 500, [film('air', 40, [ridge('TiO2', 250, 250)], { name: 'Grating' }), film('SiO2', 60, [], { name: 'Top layer' }), rgroup(6, [film('TiO2', 62), film('SiO2', 103)], 'Pair')],
    Object.assign(calc({ lmin: 450, lmax: 800, pol: 's', points: 201 }), { probe: { nm: 600, angle: 0, pol: 's' }, map: { show: 'R', pol: 's', lmin: 450, lmax: 800, amin: 0, amax: 30, res: 'low' } })) },
  { id: 'gcspr', name: 'Grating-coupled SPR (Au grating on Au film)', make: () => design('Grating-coupled SPR', 600, [film('air', 30, [ridge('Au', 300, 300)], { name: 'Au grating' }), film('Au', 100, [], { name: 'Au film' })],
    Object.assign(calc({ scan: 'angle', amin: 0, amax: 30, lambda: 633, pol: 'p', points: 151 }), { orders: 20, probe: { nm: 633, angle: 3, pol: 'p' }, map: { show: 'R', pol: 'p', lmin: 500, lmax: 900, amin: 0, amax: 30, res: 'low' } })) },
  { id: 'coupler', name: 'Grating coupler on a Si₃N₄ waveguide', make: () => design('Waveguide grating coupler', 450, [film('air', 60, [ridge('Si3N4', 225, 225)], { name: 'Grating' }), film('Si3N4', 200, [], { name: 'Waveguide' })],
    Object.assign({ substrate: { mat: 'SiO2', name: 'SiO₂', color: col('SiO2') } }, calc({ scan: 'angle', amin: 0, amax: 40, lambda: 633, pol: 's', points: 161 }), { probe: { nm: 633, angle: 10, pol: 's' }, map: { show: 'R', pol: 's', lmin: 500, lmax: 800, amin: 0, amax: 40, res: 'low' } })) },
  { id: 'coated', name: 'Au evaporated over SiO₂ ridges (coating helper)', make: () => { const dd = design('Au-coated ridges', 500, [film('air', 120, [ridge('SiO2', 250, 220, { wt: 180 })], { name: 'Ridges' })], Object.assign(calc({ lmin: 450, lmax: 1000, pol: 'p' }), { orders: 20, probe: { nm: 700, angle: 0, pol: 'p' } })); PS.coat(dd, dd.layers[0], { mode: 'top', mat: 'Au', t: 40 }); return dd; } },
];
/* 2D arrays (crossed gratings): rectangular cell px × py, shapes with vertical walls */
const shape2 = (kind, mat, o) => Object.assign({ kind, x: 0, y: 0, mat, name: nm(mat), color: col(mat) }, o);
const design2 = (name, px, py, layers, extra) => Object.assign(design(name, px, layers), { dim: 2, px, py, mx: 3, my: 3, phi: 0,
  calc: { scan: 'wl', lmin: 450, lmax: 900, angle: 0, amin: 0, amax: 60, lambda: 633, pol: 'p', show: 'RTA', points: 41 },
  map: { show: 'R', pol: 'p', lmin: 450, lmax: 900, amin: 0, amax: 40, res: 'low' }, view: { periods: 2, vex: 0, cutY: py / 2, plane: 'xz', fieldZ: null, log: false } }, extra || {});
const H3 = Math.sqrt(3);
PRESETS.push(
  { id: 'disks', dim: 2, name: 'TiO₂ nanodisk array (metasurface)', make: () => design2('TiO₂ nanodisks', 400, 400, [film('air', 120, [shape2('disk', 'TiO2', { x: 200, y: 200, rx: 110, ry: 110 })], { name: 'Disks' })], { probe: { nm: 600, angle: 0, pol: 'p' } }) },
  { id: 'hex', dim: 2, name: 'Hexagonal Si pillar array', make: () => design2('Hexagonal pillars', 400, Math.round(400 * H3), [film('air', 150, [shape2('disk', 'Si', { x: 0, y: 0, rx: 90, ry: 90 }), shape2('disk', 'Si', { x: 200, y: Math.round(200 * H3), rx: 90, ry: 90 })], { name: 'Pillars' })],
    { substrate: { mat: 'SiO2', name: 'SiO₂', color: col('SiO2') }, mx: 3, my: 2, view: { periods: 2, vex: 0, cutY: 0, plane: 'xz', fieldZ: null, log: false }, probe: { nm: 650, angle: 0, pol: 'p' } }) },
  { id: 'ellipse', dim: 2, name: 'Elliptical pillars (form birefringence)', make: () => design2('Elliptical pillars', 400, 400, [film('air', 300, [shape2('disk', 'TiO2', { x: 200, y: 200, rx: 150, ry: 70 })], { name: 'Pillars' })], { probe: { nm: 600, angle: 0, pol: 's' } }) },
  { id: 'phc', dim: 2, name: 'Photonic-crystal slab (holes in Si₃N₄)', make: () => design2('Photonic-crystal slab', 450, 450, [film('Si3N4', 200, [shape2('disk', 'air', { x: 225, y: 225, rx: 120, ry: 120, name: 'Hole', color: '#ffffff' })], { name: 'Si₃N₄ slab' })],
    { calc: { scan: 'wl', lmin: 550, lmax: 800, angle: 0, amin: 0, amax: 40, lambda: 633, pol: 'p', show: 'RTA', points: 61 }, probe: { nm: 650, angle: 0, pol: 'p' } }) },
  { id: 'holes', dim: 2, name: 'Hole array in Au film (extraordinary transmission)', make: () => design2('Au hole array', 500, 500, [film('Au', 100, [shape2('disk', 'air', { x: 250, y: 250, rx: 110, ry: 110, name: 'Hole', color: '#ffffff' })], { name: 'Au film' })],
    { calc: { scan: 'wl', lmin: 500, lmax: 1100, angle: 0, amin: 0, amax: 40, lambda: 633, pol: 'p', show: 'RTA', points: 41 }, probe: { nm: 800, angle: 0, pol: 'p' } }) },
  { id: 'cross', dim: 2, name: 'Au cross absorber (cross / SiO₂ / Au)', make: () => design2('Cross absorber', 400, 400, [film('air', 40, [shape2('cross', 'Au', { x: 200, y: 200, L: 300, w: 60 })], { name: 'Crosses' }), film('SiO2', 40, [], { name: 'Spacer' }), film('Au', 100, [], { name: 'Mirror' })],
    { calc: { scan: 'wl', lmin: 600, lmax: 1600, angle: 0, amin: 0, amax: 40, lambda: 633, pol: 'p', show: 'RTA', points: 41 }, probe: { nm: 1100, angle: 0, pol: 'p' } }) },
  { id: 'squares', dim: 2, name: 'Square Ag nanopatches', make: () => design2('Ag nanopatches', 300, 300, [film('air', 50, [shape2('rect', 'Ag', { x: 150, y: 150, wx: 120, wy: 120 })], { name: 'Patches' })], { probe: { nm: 600, angle: 0, pol: 'p' } }) },
  { id: 'rings', dim: 2, name: 'Si nanoring array', make: () => design2('Si rings', 500, 500, [film('air', 150, [shape2('ring', 'Si', { x: 250, y: 250, r: 180, rin: 100 })], { name: 'Rings' })], { substrate: { mat: 'SiO2', name: 'SiO₂', color: col('SiO2') }, probe: { nm: 700, angle: 0, pol: 'p' } }) },
  { id: 'diskdbr', dim: 2, name: 'Au nanodisks on a Bragg mirror', make: () => design2('Au disks on a Bragg mirror', 300, 300, [film('air', 30, [shape2('disk', 'Au', { x: 150, y: 150, rx: 60, ry: 60 })], { name: 'Disks' }), film('SiO2', 20, [], { name: 'Spacer' }), rgroup(5, [film('TiO2', 62), film('SiO2', 103)], 'Pair')],
    { calc: { scan: 'wl', lmin: 450, lmax: 900, angle: 0, amin: 0, amax: 40, lambda: 633, pol: 'p', show: 'RTA', points: 41 }, probe: { nm: 650, angle: 0, pol: 'p' } }) },
);
PS.PRESETS = PRESETS;
const is2 = (dd = d) => dd && dd.dim === 2;
/* the layers written out (repeat groups expanded; copies are the same objects), and the distinct ones */
const FL = (dd = d) => RC().flatLayers(dd.layers);
const uniqL = (dd = d) => [...new Set(FL(dd))];
const canon = li => { const f = FL(); return f[li] ? f.indexOf(f[li]) : li; };
const sameL = (a, b) => { const f = FL(); return !!f[a] && f[a] === f[b]; };

/* ---------- state ---------- */
let d = null, target = null, root = null, undo = [], redo = [], lastKey = '', lastAt = 0, sel = { li: 0, si: 0 };
let fieldRes = null, fieldJob = null, fieldStale = true, fieldT = 0, specRes = null, specJob = null, specProg = null, specT = 0, mapRes = null, mapJob = null, mapProg = null, mapStale = true, views = {};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage is optional */ } };
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && Array.isArray(v.layers) ? v : null; } catch (e) { return null; } };
PS.loaded = () => !!d;
PS.design = () => d;
PS.load = obj => {
  target = obj && obj.type === 'ucell' ? obj : null;
  d = target ? Object.assign(PRESETS[0].make(), U.deepClone(target.props.pattern || {})) : (d || load() || PRESETS[0].make());
  if (target) { const c = target.props.calc || {}; d.calc = Object.assign({}, d.calc, { scan: c.scan || d.calc.scan, lmin: c.lmin, lmax: c.lmax, angle: c.angle, amin: c.amin, amax: c.amax, lambda: c.lambda, pol: c.pol || d.calc.pol }); }
  undo = []; redo = []; sel = { li: 0, si: 0 }; specRes = null; mapRes = null; mapStale = true;
};
PS.setDesign = v => { step(); d = v; sel = { li: 0, si: 0 }; mapRes = null; mapStale = true; specRes = null; fieldRes = null; save(); if (root) PS.render(root); };
PS.closed = () => { [specJob, mapJob, fieldJob].forEach(j => j && j.cancel()); specJob = mapJob = fieldJob = null; root = null; };
const step = key => {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastAt < 900)) { undo.push(JSON.stringify(d)); if (undo.length > 120) undo.shift(); redo = []; }
  lastKey = key || ''; lastAt = now;
};
PS.undo = () => { if (!undo.length) return; redo.push(JSON.stringify(d)); d = JSON.parse(undo.pop()); lastKey = ''; save(); geomChanged(); PS.render(root); };
PS.redo = () => { if (!redo.length) return; undo.push(JSON.stringify(d)); d = JSON.parse(redo.pop()); lastKey = ''; save(); geomChanged(); PS.render(root); };
const geomChanged = () => { mapStale = true; fieldStale = true; };
/* fn changes d; what: 'list' rebuilds the left column, 'all' everything, else only the views */
const change = (fn, key, what) => { step(key); fn(); save(); geomChanged(); if (what === 'all') PS.render(root); else { if (what === 'list') buildList(); refresh(); } };
const viewChange = (fn, key) => { step(key); fn(); save(); refresh(true); };

/* ---------- small controls ---------- */
const fld = (label, input) => el('label', { class: 'st-f' }, el('span', { text: label }), input);
const num = (get, set, o = {}) => { const i = el('input', { type: 'number', value: get(), step: o.step || 1, min: o.min, max: o.max, title: o.title || '', oninput: () => { const v = parseFloat(i.value); if (isFinite(v)) (o.view ? viewChange : change)(() => set(o.min != null ? Math.max(o.min, o.max != null ? Math.min(o.max, v) : v) : v), o.key || 'n' + Math.random(), o.what); } }); return i; };
const sel1 = (opts, get, set, key, what, view) => { const s = el('select', { onchange: () => (view ? viewChange : change)(() => set(s.value), key, what) }, opts.map(q => el('option', { value: q[0], text: q[1], disabled: !!q[2] }))); s.value = String(get()); return s; };
const matSel = (get, set, key, what) => sel1(TF().options(), get, set, key, what || 'list');

/* ---------- layout ---------- */
PS.render = host => {
  root = host;
  if (!root) return;
  root.innerHTML = '';
  const presetBtn = el('button', { class: 'btn small', type: 'button', text: 'Start from ▾', onclick: ev => { const r = ev.currentTarget.getBoundingClientRect(); D.menu([{ title: 'Lines (1D gratings)' }].concat(PRESETS.filter(p => !p.dim).map(p => ({ label: p.name, action: () => PS.setDesign(p.make()) })), ['-', { title: '2D arrays (crossed gratings)' }], PRESETS.filter(p => p.dim === 2).map(p => ({ label: p.name, action: () => PS.setDesign(p.make()) }))), r.left, r.bottom + 4, ev.currentTarget); } });
  const name = el('input', { type: 'text', class: 'st-name', value: d.name || '', title: 'Name of the design', oninput: () => { step('name'); d.name = name.value; save(); } });
  root.append(el('div', { class: 'st-head' },
    el('div', { class: 'st-title' }, el('b', { text: 'Layer Studio' }), el('span', { class: 'st-sub', text: target ? 'editing a patterned structure in the figure' : 'periodic structures (one unit cell)' })),
    ST().tabs(), name, presetBtn,
    D.iconBtn('undo', 'Undo (Ctrl+Z)', PS.undo), D.iconBtn('redo', 'Redo (Ctrl+Y)', PS.redo),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Open…', title: 'Open a saved unit cell (.rnbxpattern.json)', onclick: openFile }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Save', title: 'Save this unit cell as a file', onclick: saveFile }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'CSV', title: 'Spectrum and diffraction orders as CSV', onclick: csv }),
    el('span', { class: 'st-grow' }),
    el('button', { class: 'btn primary', type: 'button', text: target ? 'Update the structure' : 'Insert into figure', onclick: insertDialog }),
    D.iconBtn('close', 'Close (Esc): the design is kept for next time', ST().close)));
  views = { list: el('div', { class: 'st-list' }), cross: el('div', { class: 'st-cross' }), side: el('div', { class: 'st-cross' }), field: el('div', { class: 'st-field' }), orders: el('div', { class: 'st-orders' }), spec: el('div', { class: 'st-spec' }), map: el('div', { class: 'st-map' }) };
  const left = el('section', { class: 'st-col st-left' }, el('h4', { text: 'Unit cell' }), cellControls(), views.list,
    el('div', { class: 'hint', text: is2() ? 'Top of the list = top of the structure. Each layer is a film of its own material with shapes in it (pillars, or holes when the shape is air); later shapes cover earlier ones. In the top view drag a shape to move it and its handles to resize it; drag the dashed line to choose where the side view and the near field are cut.' : 'Top of the list = top of the structure. Each layer is a film of its own material with shapes in it; later shapes cover earlier ones. Drag a shape in the cross-section to move it, its round handles to change the widths, the square one to slant it, the triangle to change the layer height.' }));
  const mid = is2()
    ? el('section', { class: 'st-col st-mid' }, el('h4', { text: 'Top view (selected layer)' }), crossControls(), views.cross, el('h4', { text: 'Side view (cut along x)' }), views.side,
      el('h4', { text: 'Near field |E|²' }), probeControls(), fieldControls(), views.field, el('h4', { text: 'Diffraction orders' }), views.orders)
    : el('section', { class: 'st-col st-mid' }, el('h4', { text: 'Cross-section' }), crossControls(), views.cross,
      el('h4', { text: 'Near field |E|²' }), probeControls(), fieldControls(), views.field, el('h4', { text: 'Diffraction orders' }), views.orders);
  const right = el('section', { class: 'st-col st-right' }, el('h4', { text: 'Optical response (RCWA)' }), specControls(), views.spec, el('h4', { text: 'Wavelength × angle map' }), mapControls(), views.map);
  root.append(el('div', { class: 'st-body' }, left, mid, right));
  buildList();
  refresh();
};

function cellControls() {
  const lat = fld('Structure', sel1([['1', 'Lines (1D grating)'], ['2', '2D array']], () => (is2() ? '2' : '1'), v => { convertDim(+v); }, 'dim', 'all'));
  if (is2()) {
    const k2 = [lat, fld('Period Λx (nm)', num(() => d.px, v => { d.px = v; d.period = v; }, { min: 10, max: 1e5, key: 'px' })), fld('Period Λy (nm)', num(() => d.py, v => { d.py = v; }, { min: 10, max: 1e5, key: 'py' })),
      fld('Light arrives from', sel1([['top', 'Above'], ['bottom', 'Below (through the substrate)']], () => d.side, v => { d.side = v; }, 'side', 'all')),
      fld('Medium above', sel1(TF().options(false), () => d.ambient, v => { d.ambient = v; }, 'amb', 'all'))];
    if (d.ambient === 'custom') k2.push(fld('Its index n', num(() => d.ambientN, v => { d.ambientN = v; }, { step: 0.001, min: 1, key: 'ambn' })));
    k2.push(fld('Orders ±Mx', sel1([1, 2, 3, 4, 5, 6, 7, 8].map(v => [String(v), String(v)]), () => d.mx, v => { d.mx = +v; }, 'mx')),
      fld('Orders ±My', sel1([0, 1, 2, 3, 4, 5, 6, 7, 8].map(v => [String(v), String(v)]), () => d.my, v => { d.my = +v; }, 'my')),
      fld('Azimuth φ (°)', num(() => d.phi || 0, v => { d.phi = v; }, { min: -180, max: 180, key: 'phi', title: 'Plane of incidence: 0° = along x' })));
    return el('div', { class: 'st-grid' }, ...k2, el('div', { class: 'hint', style: { width: '100%', margin: '2px 0 0' }, text: `${(2 * d.mx + 1) * (2 * d.my + 1)} orders: each wavelength takes about ${UI().f1(0.37e-6 * Math.pow(2 * (2 * d.mx + 1) * (2 * d.my + 1), 3) + 0.02, 1)} s per worker. Start with ±3, then check convergence.` }));
  }
  const k = [lat, fld('Period Λ (nm)', num(() => d.period, v => { d.period = v; }, { min: 10, max: 1e5, key: 'per' })),
    fld('Light arrives from', sel1([['top', 'Above'], ['bottom', 'Below (through the substrate)']], () => d.side, v => { d.side = v; }, 'side', 'all')),
    fld('Medium above', sel1(TF().options(false), () => d.ambient, v => { d.ambient = v; }, 'amb', 'all'))];
  if (d.ambient === 'custom') k.push(fld('Its index n', num(() => d.ambientN, v => { d.ambientN = v; }, { step: 0.001, min: 1, key: 'ambn' })));
  k.push(fld('Orders ±N', sel1([5, 10, 15, 20, 30, 40].map(v => [String(v), String(v)]), () => d.orders, v => { d.orders = +v; }, 'ord')),
    fld('Profile slices', num(() => d.slices, v => { d.slices = Math.round(v); }, { min: 2, max: 60, key: 'sli', title: 'Sloped and curved profiles are cut into this many flat slices' })));
  return el('div', { class: 'st-grid' }, ...k);
}

/* lines ⇄ 2D array, keeping what can be kept */
function convertDim(to) {
  if ((to === 2) === is2()) return;
  if (to === 2) {
    const P = d.period;
    d.dim = 2; d.px = P; d.py = P; d.mx = 3; d.my = 3; d.phi = 0;
    uniqL().forEach(L => { L.shapes = (L.shapes || []).map(sh => shape2('rect', sh.mat, { x: sh.x, y: P / 2, wx: sh.kind === 'trap' ? +sh.wb || P / 2 : P / 2, wy: P * 0.999, name: sh.name, color: sh.color, n: sh.n, k: sh.k })); });
    d.calc.points = Math.min(d.calc.points, 41); d.view = Object.assign({ periods: 2, vex: 0, cutY: P / 2, plane: 'xz', fieldZ: null, log: false }, d.view, { cutY: P / 2 });
  } else {
    d.dim = 1; d.period = d.px;
    uniqL().forEach(L => { L.shapes = (L.shapes || []).filter(sh => sh.kind === 'rect' || sh.kind === 'disk').map(sh => ridge(sh.mat, sh.x, sh.kind === 'rect' ? sh.wx : 2 * (sh.rx || 50), { name: sh.name, color: sh.color, n: sh.n, k: sh.k })); });
  }
  sel = { li: 0, si: 0 }; specRes = null; mapRes = null; fieldRes = null;
}

/* ---------- repeat groups, the Layers-tab stack, coatings ---------- */
/* a group written out as separate (independent) layers */
const ungroup = g => { const out = []; for (let k = 0; k < Math.max(1, Math.round(+g.repeat) || 1); k++) out.push(...U.deepClone(RC().flatLayers(g.items))); return out; };
/* Layers-tab items → Pattern layers: films get no shapes; nested groups are written out inside their outer group */
PS.fromFilms = items => (items || []).map(it => it.group
  ? { group: true, repeat: Math.max(1, Math.round(+it.repeat) || 1), name: it.name || 'Repeat', items: RC().flatLayers(PS.fromFilms(it.items)).map(L => U.deepClone(L)) }
  : film(it.mat, +it.nm || 0, [], { name: it.name || (it.mat === 'air' ? 'Air' : nm(it.mat)), color: it.color || col(it.mat), n: it.n, k: it.k }));
function importFilms() {
  const fd = ST().design && ST().design();
  if (!fd || !(fd.items || []).length) { RNBX.toast('The Layers tab has no films yet', 'error'); return; }
  change(() => {
    d.layers.push(...PS.fromFilms(U.deepClone(fd.items)));
    if (fd.substrate) d.substrate = { mat: fd.substrate.mat, name: fd.substrate.name || nm(fd.substrate.mat), color: fd.substrate.color || col(fd.substrate.mat), n: fd.substrate.n, k: fd.substrate.k };
  }, null, 'list');
  RNBX.toast(`Added “${fd.name || 'the stack'}” from the Layers tab under the unit cell (substrate: ${d.substrate.name})`);
}

/* Coat a patterned layer. mode:
   'conformal' — the film grows the same thickness on every surface (tops, side walls, the bottoms of the gaps);
   'top'       — line-of-sight deposition from above (evaporation): tops and gap bottoms only, side walls bare;
   'fill'      — the gaps are filled up to the top of the layer (spin-coat, planarise), plus an optional film over it.
   Shapes are ridges / pillars (solid in an open background) or holes (open in a solid film); 'open' is air or the
   medium above. Returns a message, or throws when the layer cannot be coated that way. */
PS.coat = (dd, L, o) => {
  const t = Math.max(0, +o.t || 0), M = o.mat, two = is2(dd), i = dd.layers.indexOf(L), H = +L.nm || 0;
  if (i < 0) throw new Error('Only a layer outside a repeat group can be coated (ungroup it first)');
  const open = m => m === 'air' || m === dd.ambient, bgOpen = open(L.mat);
  const C = (sh, extra) => Object.assign(U.deepClone(sh), { mat: M, name: nm(M), color: col(M) }, extra || {});
  const curved = (L.shapes || []).some(sh => sh.kind === 'sine' || sh.kind === 'saw');
  const coatFilm = () => film(M, t, [], { name: nm(M) + ' coating' });
  if (o.mode === 'fill' || curved) {
    if (o.mode !== 'fill') throw new Error('Sinusoidal and sawtooth profiles can only be filled (choose “Fill the gaps”)');
    if (bgOpen) { L.mat = M; L.color = col(M); L.name = (L.name || 'Layer') + ' + ' + nm(M); }
    L.shapes.forEach(sh => { if (open(sh.mat)) Object.assign(sh, { mat: M, name: nm(M), color: col(M) }); });
    if (t > 0) dd.layers.splice(i, 0, coatFilm());
    return t > 0 ? `Gaps filled with ${nm(M)} and ${t} nm over the top` : `Gaps filled with ${nm(M)}`;
  }
  if (!(t > 0)) throw new Error('Give the coating a thickness');
  // grow (δ > 0) or shrink a shape's outline by δ
  const grow = (sh, dl) => {
    const g = U.deepClone(sh), p2 = v => Math.max(0, v);
    if (two) {
      if (g.kind === 'disk') { g.rx = p2((g.rx || g.r || 0) + dl); g.ry = p2((g.ry || g.rx || 0) + dl); }
      else if (g.kind === 'rect') { g.wx = p2(g.wx + 2 * dl); g.wy = p2(g.wy + 2 * dl); }
      else if (g.kind === 'ring') { g.r = p2(g.r + dl); g.rin = p2((g.rin || 0) - dl); }
      else if (g.kind === 'cross') { g.L = p2(g.L + 2 * dl); g.w = p2(g.w + 2 * dl); }
    } else { g.wb = p2((+g.wb || 0) + 2 * dl); g.wt = p2((g.wt == null ? +g.wb : +g.wt) + 2 * dl); }
    return g;
  };
  const topOf = sh => (two ? U.deepClone(sh) : Object.assign(U.deepClone(sh), { x: +sh.x + (+sh.shift || 0), wb: sh.wt == null ? +sh.wb : +sh.wt, wt: sh.wt == null ? +sh.wb : +sh.wt, shift: 0 }));
  const exposed = sh => open(sh.mat) !== bgOpen;   // a ridge in an open layer, or a hole in a solid film
  // 1D: split a trapezoid at height fraction u from the bottom
  const lowerPart = (sh, u) => { if (two) return U.deepClone(sh); const wb = +sh.wb || 0, wt = sh.wt == null ? wb : +sh.wt, s = +sh.shift || 0; return Object.assign(U.deepClone(sh), { wt: U.round(wb + (wt - wb) * u, 2), shift: U.round(s * u, 2) }); };
  const upperPart = (sh, u) => { if (two) return U.deepClone(sh); const wb = +sh.wb || 0, wt = sh.wt == null ? wb : +sh.wt, s = +sh.shift || 0; return Object.assign(U.deepClone(sh), { x: U.round(+sh.x + s * u, 2), wb: U.round(wb + (wt - wb) * u, 2), shift: U.round(s * (1 - u), 2) }); };
  const tb = Math.min(t, H), u = H > 0 ? tb / H : 1;
  // the bottom of the gaps: everything open becomes coating
  const lower = Object.assign(U.deepClone(L), { nm: tb, name: (L.name || 'Layer') + ' (coated base)' });
  if (bgOpen) Object.assign(lower, { mat: M, color: col(M) });
  lower.shapes = L.shapes.map(sh => (open(sh.mat) ? C(lowerPart(sh, u)) : lowerPart(sh, u)));
  // the rest of the layer: side walls coated when conformal
  const upper = Object.assign(U.deepClone(L), { nm: H - tb });
  upper.shapes = [];
  L.shapes.forEach(sh => {
    const up = upperPart(sh, u);
    if (o.mode === 'conformal' && exposed(sh)) {
      if (open(sh.mat)) upper.shapes.push(C(up), grow(up, -t));      // hole: wall coating, then the narrower hole
      else upper.shapes.push(C(grow(up, t)), up);                     // ridge: a coating shell, then the ridge
    } else upper.shapes.push(up);
  });
  // the cap over the top surfaces
  const cap = film(bgOpen ? L.mat : M, t, [], { name: nm(M) + ' on top', color: bgOpen ? L.color : col(M) });
  L.shapes.forEach(sh => {
    if (!exposed(sh)) return;
    const tp = topOf(sh), g = o.mode === 'conformal' ? grow(tp, open(sh.mat) ? -t : t) : tp;
    cap.shapes.push(open(sh.mat) ? Object.assign(g, { mat: sh.mat, name: sh.name, color: sh.color }) : C(g));
  });
  dd.layers.splice(i, 1, ...[cap].concat(H - tb > 0 ? [upper] : [], [lower]));
  return `${t} nm of ${nm(M)} ${o.mode === 'conformal' ? 'on every surface' : 'deposited from above'}: ${H - tb > 0 ? 3 : 2} layers replace “${L.name || 'the layer'}”`;
};
function coatDialog(L) {
  const o = { mode: 'top', mat: 'Au', t: 30 };
  const modeSel = el('select', { onchange: () => { o.mode = modeSel.value; } }, [['top', 'From above (evaporation, line of sight)'], ['conformal', 'Conformal (every surface: ALD, CVD, sputtering)'], ['fill', 'Fill the gaps (spin-coat, planarise)']].map(q => el('option', { value: q[0], text: q[1] })));
  const matS = el('select', { onchange: () => { o.mat = matS.value; } }, TF().options().map(q => el('option', { value: q[0], text: q[1], disabled: !!q[2] }))); matS.value = o.mat;
  const tI = el('input', { type: 'number', min: 0, step: 1, value: o.t, oninput: () => { o.t = Math.max(0, +tI.value || 0); } });
  const body = el('div', {},
    el('label', { class: 'field' }, el('span', { text: 'How it is deposited' }), modeSel),
    el('label', { class: 'field' }, el('span', { text: 'Material' }), matS),
    el('label', { class: 'field' }, el('span', { text: 'Thickness (nm)' }), tI),
    el('div', { class: 'hint', text: 'The coating is written as ordinary layers (a cap over the tops, a coated base in the gaps, and for a conformal coat a shell on the side walls), so you can edit them afterwards. With “Fill the gaps” the thickness is an extra film over the top (0 for none). Side walls are treated as vertical when coating from above.' }));
  const m = D.modal({ title: 'Coat “' + (L.name || 'layer') + '”', sub: is2() ? 'Pillars and holes are grown or shrunk by the coating thickness' : 'Ridges keep their slope; the side-wall shell follows it', body, foot: [
    el('button', { class: 'btn', type: 'button', text: 'Cancel', onclick: () => m.close() }),
    el('button', { class: 'btn primary', type: 'button', text: 'Coat', onclick: () => { try { let msg = ''; change(() => { msg = PS.coat(d, L, o); sel = { li: 0, si: 0 }; }, null, 'list'); m.close(); RNBX.toast(msg); } catch (e) { RNBX.toast(e.message || String(e), 'error'); } } })] });
}

/* ---------- the layer list ---------- */
const moveIn = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; arr.splice(j, 0, arr.splice(i, 1)[0]); };
function shapeCard(L, li, sh, si) {
  if (is2()) return shapeCard2(L, li, sh, si);
  const k = 's' + li + '-' + si + '-';
  const c = el('input', { type: 'color', value: (sh.color || '#cccccc').slice(0, 7), title: 'Colour', oninput: () => change(() => { sh.color = c.value; }, k + 'c') });
  const kind = sel1([['trap', 'Ridge / trapezoid'], ['sine', 'Sinusoid'], ['saw', 'Sawtooth (blazed)']], () => sh.kind, v => { sh.kind = v; if (v === 'trap') { sh.wb = sh.wb || d.period / 2; sh.wt = sh.wt == null ? sh.wb : sh.wt; sh.shift = sh.shift || 0; } if (v === 'saw') sh.dir = sh.dir || 1; }, k + 'k', 'list');
  const mat = matSel(() => sh.mat, v => { if (sh.name === nm(sh.mat) || !sh.name) sh.name = nm(v); if ((sh.color || '').toLowerCase() === col(sh.mat)) sh.color = col(v); sh.mat = v; }, k + 'm');
  const row2 = [el('span', { class: 'hint', style: { margin: 0 }, text: sh.kind === 'sine' ? 'crest at' : 'x' }), num(() => U.round(sh.x, 2), v => { sh.x = v; }, { key: k + 'x', title: 'Position in the period (nm)' })];
  if (sh.kind === 'trap') row2.push(el('span', { class: 'hint', style: { margin: 0 }, text: 'w' }), num(() => U.round(sh.wb, 2), v => { sh.wb = Math.max(0, v); }, { min: 0, key: k + 'wb', title: 'Width at the bottom (nm)' }),
    el('span', { class: 'hint', style: { margin: 0 }, text: 'top' }), num(() => U.round(sh.wt == null ? sh.wb : sh.wt, 2), v => { sh.wt = Math.max(0, v); }, { min: 0, key: k + 'wt', title: 'Width at the top (nm): smaller for a trapezoid, 0 for a triangle' }),
    el('span', { class: 'hint', style: { margin: 0 }, text: 'slant' }), num(() => U.round(sh.shift || 0, 2), v => { sh.shift = v; }, { key: k + 'sh', title: 'How far the top is moved sideways (nm)' }));
  if (sh.kind === 'saw') row2.push(sel1([['1', 'rising →'], ['-1', '← rising']], () => String(sh.dir || 1), v => { sh.dir = +v; }, k + 'd'));
  row2.push(el('span', { class: 'st-grow' }),
    el('button', { class: 'icon-btn', type: 'button', text: '⧉', title: 'Duplicate (half a period along)', onclick: ev => { ev.stopPropagation(); change(() => { const c2 = U.deepClone(sh); c2.x = (sh.x + d.period / 2) % d.period; L.shapes.splice(si + 1, 0, c2); sel = { li, si: si + 1 }; }, null, 'list'); } }),
    D.iconBtn('trash', 'Remove the shape', ev => { if (ev) ev.stopPropagation(); change(() => { L.shapes.splice(si, 1); sel = { li, si: -1 }; }, null, 'list'); }));
  const card = el('div', { class: 'st-shape' + (sel.li === li && sel.si === si ? ' sel' : ''), onclick: () => { if (sel.li === li && sel.si === si) return; sel = { li, si }; markSel(); drawCross(); } },
    el('div', { class: 'st-row' }, c, kind, mat), el('div', { class: 'st-row2' }, ...row2));
  card.dataset.li = li; card.dataset.si = si;
  if (sh.mat === 'custom') card.append(nkRow(sh, k));
  return card;
}
function shapeCard2(L, li, sh, si) {
  const k = 'q' + li + '-' + si + '-', lab = t => el('span', { class: 'hint', style: { margin: 0 }, text: t });
  const c = el('input', { type: 'color', value: (sh.color || '#cccccc').slice(0, 7), title: 'Colour', oninput: () => change(() => { sh.color = c.value; }, k + 'c') });
  const kind = sel1([['disk', 'Disk / ellipse'], ['rect', 'Rectangle'], ['ring', 'Ring'], ['cross', 'Cross']], () => sh.kind, v => {
    const a = Math.min(d.px, d.py); sh.kind = v;
    if (v === 'disk') { sh.rx = sh.rx || a / 4; sh.ry = sh.ry || sh.rx; } if (v === 'rect') { sh.wx = sh.wx || a / 2; sh.wy = sh.wy || a / 2; }
    if (v === 'ring') { sh.r = sh.r || a / 3; sh.rin = sh.rin || a / 6; } if (v === 'cross') { sh.L = sh.L || a * 0.7; sh.w = sh.w || a / 8; } }, k + 'k', 'list');
  const mat = matSel(() => sh.mat, v => { if (sh.name === nm(sh.mat) || sh.name === 'Hole' || !sh.name) sh.name = v === 'air' ? 'Hole' : nm(v); if ((sh.color || '').toLowerCase() === col(sh.mat) || sh.mat === 'air') sh.color = v === 'air' ? '#ffffff' : col(v); sh.mat = v; }, k + 'm');
  mat.title = 'Material (air = a hole in the film)';
  const f2 = (key, t, title) => [lab(t), num(() => U.round(+sh[key] || 0, 2), v => { sh[key] = key === 'x' || key === 'y' ? v : Math.max(0, v); }, { key: k + key, title })];
  const row2 = [...f2('x', 'x', 'Centre x (nm)'), ...f2('y', 'y', 'Centre y (nm)')];
  if (sh.kind === 'disk') row2.push(...f2('rx', 'rx', 'Radius along x (nm)'), ...f2('ry', 'ry', 'Radius along y (nm)'));
  if (sh.kind === 'rect') row2.push(...f2('wx', 'wx', 'Width along x (nm)'), ...f2('wy', 'wy', 'Width along y (nm)'));
  if (sh.kind === 'ring') row2.push(...f2('r', 'r', 'Outer radius (nm)'), ...f2('rin', 'rᵢ', 'Inner radius (nm)'));
  if (sh.kind === 'cross') row2.push(...f2('L', 'L', 'Arm length, tip to tip (nm)'), ...f2('w', 'w', 'Arm width (nm)'));
  row2.push(el('span', { class: 'st-grow' }),
    el('button', { class: 'icon-btn', type: 'button', text: '⧉', title: 'Duplicate (half a cell along x)', onclick: ev => { ev.stopPropagation(); change(() => { const c2 = U.deepClone(sh); c2.x = (sh.x + d.px / 2) % d.px; L.shapes.splice(si + 1, 0, c2); sel = { li, si: si + 1 }; }, null, 'list'); } }),
    D.iconBtn('trash', 'Remove the shape', ev => { if (ev) ev.stopPropagation(); change(() => { L.shapes.splice(si, 1); sel = { li, si: -1 }; }, null, 'list'); }));
  const card = el('div', { class: 'st-shape' + (sel.li === li && sel.si === si ? ' sel' : ''), onclick: () => { if (sel.li === li && sel.si === si) return; sel = { li, si }; markSel(); drawCross(); } },
    el('div', { class: 'st-row' }, c, kind, mat), el('div', { class: 'st-row2' }, ...row2));
  card.dataset.li = li; card.dataset.si = si;
  if (sh.mat === 'custom') card.append(nkRow(sh, k));
  return card;
}
const nkRow = (o, k) => el('div', { class: 'st-row2' }, el('span', { text: 'n' }), num(() => o.n == null ? 1.5 : o.n, v => { o.n = v; }, { step: 0.001, key: k + 'n' }), el('span', { text: 'k' }), num(() => o.k || 0, v => { o.k = Math.max(0, v); }, { step: 0.001, min: 0, key: k + 'kk' }));
const markSel = () => { if (!views.list) return; views.list.querySelectorAll('.st-shape').forEach(c => c.classList.toggle('sel', +c.dataset.li === sel.li && +c.dataset.si === sel.si)); };
/* top-level films ticked for a repeat group */
let ticked = new Set();
function layerCard(L, arr, i, li, inGroup) {
  const k = 'L' + li + '-';
  const c = el('input', { type: 'color', value: (L.color || '#ffffff').slice(0, 7), title: 'Colour of the film', oninput: () => change(() => { L.color = c.value; }, k + 'c') });
  const nmI = el('input', { type: 'text', value: L.name || '', title: 'Name', oninput: () => change(() => { L.name = nmI.value; }, k + 'n') });
  const mat = matSel(() => L.mat, v => { if (L.name === nm(L.mat) || L.name === 'Air' || !L.name) L.name = v === 'air' ? 'Air' : nm(v); if ((L.color || '').toLowerCase() === (L.mat === 'air' ? '#ffffff' : col(L.mat))) L.color = v === 'air' ? '#ffffff' : col(v); L.mat = v; }, k + 'm');
  mat.title = 'Material of the film around the shapes';
  const chk = inGroup ? null : el('input', { type: 'checkbox', title: 'Tick films, then press “Repeat ticked” to make a repeat group', checked: ticked.has(L), onchange: () => { chk.checked ? ticked.add(L) : ticked.delete(L); grpBtnState(); } });
  const addBtns = is2() ? [['disk', '+ disk'], ['rect', '+ rect'], ['ring', '+ ring'], ['cross', '+ cross']].map(([kd, t]) => el('button', { class: 'btn small ghost', type: 'button', text: t, onclick: () => change(() => {
    const a = Math.min(d.px, d.py), m = L.mat === 'air' ? 'TiO2' : 'air', o = { x: d.px / 2, y: d.py / 2 };
    Object.assign(o, kd === 'disk' ? { rx: a / 4, ry: a / 4 } : kd === 'rect' ? { wx: a / 2, wy: a / 2 } : kd === 'ring' ? { r: a / 3, rin: a / 6 } : { L: a * 0.7, w: a / 8 });
    L.shapes.push(shape2(kd, m, Object.assign(o, m === 'air' ? { name: 'Hole', color: '#ffffff' } : {}))); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') })) : [
    el('button', { class: 'btn small ghost', type: 'button', text: '+ ridge', title: 'Add a ridge (rectangle, trapezoid or slanted)', onclick: () => change(() => { L.shapes.push(ridge(L.mat === 'TiO2' ? 'SiO2' : 'TiO2', d.period / 2, d.period / 2)); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') }),
    el('button', { class: 'btn small ghost', type: 'button', text: '+ sine', onclick: () => change(() => { L.shapes.push({ kind: 'sine', x: d.period / 2, mat: 'Au', name: 'Au', color: col('Au') }); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') }),
    el('button', { class: 'btn small ghost', type: 'button', text: '+ saw', onclick: () => change(() => { L.shapes.push({ kind: 'saw', x: 0, dir: 1, mat: 'Al', name: 'Al', color: col('Al') }); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') })];
  const coatBtn = (L.shapes || []).length && !inGroup ? el('button', { class: 'btn small ghost', type: 'button', text: 'Coat…', title: 'Deposit a film over this patterned layer: conformal, from above (evaporation) or filling the gaps', onclick: () => coatDialog(L) }) : null;
  const box = el('div', { class: 'st-group st-player' },
    el('div', { class: chk ? 'st-row ps-rowck' : 'st-row' }, chk, c, nmI, mat),
    el('div', { class: 'st-row2' }, num(() => L.nm, v => { L.nm = Math.max(0, v); }, { min: 0, key: k + 't', title: 'Height of the layer (nm)' }), el('span', { class: 'hint', style: { margin: 0 }, text: 'nm' }), el('span', { class: 'st-grow' }),
      ...addBtns, coatBtn,
      D.iconBtn('up', 'Move up', () => change(() => moveIn(arr, i, -1), null, 'list')),
      D.iconBtn('down', 'Move down', () => change(() => moveIn(arr, i, 1), null, 'list')),
      el('button', { class: 'icon-btn', type: 'button', text: '⧉', title: 'Duplicate the layer', onclick: () => change(() => arr.splice(i + 1, 0, U.deepClone(L)), null, 'list') }),
      D.iconBtn('trash', 'Remove the layer', () => change(() => { arr.splice(i, 1); ticked.delete(L); sel = { li: 0, si: 0 }; }, null, 'list'))));
  if (L.mat === 'custom') box.append(nkRow(L, k));
  (L.shapes || []).forEach((sh, si) => box.append(shapeCard(L, li, sh, si)));
  if (!(L.shapes || []).length) box.append(el('div', { class: 'hint', style: { margin: '4px 2px' }, text: 'A flat film (no shapes).' }));
  return box;
}
let grpBtn = null;
const grpBtnState = () => { if (grpBtn) grpBtn.disabled = !ticked.size; };
function buildList() {
  const host = views.list; if (!host) return; host.innerHTML = '';
  const f = FL();
  ticked = new Set([...ticked].filter(L => d.layers.includes(L)));
  host.append(el('div', { class: 'st-cap', text: 'Medium above: ' + TF().name(d.ambient) }));
  d.layers.forEach((it, i) => {
    if (!it.group) { host.append(layerCard(it, d.layers, i, f.indexOf(it), false)); return; }
    const gk = 'G' + i + '-', inner = RC().flatLayers(it.items), per = inner.reduce((a, L) => a + (+L.nm || 0), 0);
    const gname = el('input', { type: 'text', class: 'st-gname', value: it.name || '', title: 'Name of the group', oninput: () => change(() => { it.name = gname.value; }, gk + 'n') });
    const rep = num(() => it.repeat, v => { it.repeat = U.clamp(Math.round(v), 1, 60); }, { min: 1, max: 60, key: gk + 'r', what: 'list', title: 'How many times the group repeats' });
    rep.classList.add('st-rep');
    const box = el('div', { class: 'st-group ps-rgroup' },
      el('div', { class: 'st-ghead' }, gname, el('span', { text: '×', title: 'repeats' }), rep, el('span', { class: 'hint', style: { margin: 0 }, text: UI().f1(per, 0) + ' nm each, ' + UI().f1(per * Math.max(1, Math.round(it.repeat) || 1), 0) + ' nm in all' }), el('span', { class: 'st-grow' }),
        D.iconBtn('up', 'Move the group up', () => change(() => moveIn(d.layers, i, -1), null, 'list')),
        D.iconBtn('down', 'Move the group down', () => change(() => moveIn(d.layers, i, 1), null, 'list')),
        el('button', { class: 'btn small ghost', type: 'button', text: 'Ungroup', title: 'Write the repeats out as separate layers', onclick: () => change(() => d.layers.splice(i, 1, ...ungroup(it)), null, 'list') }),
        D.iconBtn('trash', 'Remove the group', () => change(() => { d.layers.splice(i, 1); sel = { li: 0, si: 0 }; }, null, 'list'))));
    it.items.forEach((L, j) => box.append(layerCard(L, it.items, j, f.indexOf(L), true)));
    if (!it.items.length) box.append(el('div', { class: 'hint', text: 'Empty group.' }));
    host.append(box);
  });
  grpBtn = el('button', { class: 'btn small', type: 'button', text: 'Repeat ticked', title: 'Put the ticked films (one after another in the list) in a group that repeats N times', disabled: !ticked.size, onclick: () => change(() => {
    const idx = [...ticked].map(L => d.layers.indexOf(L)).filter(x => x >= 0).sort((a, b) => a - b);
    if (!idx.length) return;
    const a = idx[0], b = idx[idx.length - 1];
    if (d.layers.slice(a, b + 1).some(x => x.group)) { RNBX.toast('A repeat group cannot contain another group: untick across the group, or ungroup it first', 'error'); return; }
    d.layers.splice(a, b - a + 1, { group: true, repeat: 4, name: 'Period', items: d.layers.slice(a, b + 1) });
    ticked.clear();
  }, null, 'list') });
  host.append(el('div', { class: 'ps-addrow' },
    el('button', { class: 'btn small primary', type: 'button', text: '+ Patterned layer on top', onclick: () => change(() => { d.layers.unshift(film('air', 100, [is2() ? shape2('disk', 'TiO2', { x: d.px / 2, y: d.py / 2, rx: Math.min(d.px, d.py) / 4, ry: Math.min(d.px, d.py) / 4 }) : ridge('TiO2', d.period / 2, d.period / 2)])); sel = { li: 0, si: 0 }; }, null, 'list') }),
    el('button', { class: 'btn small', type: 'button', text: '+ Film at the bottom', onclick: () => change(() => d.layers.push(film('SiO2', 100)), null, 'list') }),
    grpBtn,
    el('button', { class: 'btn small', type: 'button', text: '+ Stack from the Layers tab', title: 'Add the films (and repeat groups) designed in the Layers tab under this unit cell, with its substrate', onclick: importFilms })));
  const s = d.substrate;
  const sc = el('input', { type: 'color', value: (s.color || '#cccccc').slice(0, 7), oninput: () => change(() => { s.color = sc.value; }, 'subc') });
  const sn = el('input', { type: 'text', value: s.name || '', oninput: () => change(() => { s.name = sn.value; }, 'subn') });
  const sm = matSel(() => s.mat, v => { s.mat = v; s.name = v === 'air' ? 'Air' : nm(v); s.color = col(v); }, 'subm');
  const card = el('div', { class: 'st-layer st-sub' }, el('div', { class: 'st-row' }, sc, sn, sm), el('div', { class: 'st-row2' }, el('span', { class: 'hint', style: { margin: 0 }, text: 'Substrate (thick, semi-infinite)' })));
  if (s.mat === 'custom') card.append(nkRow(s, 'sub'));
  host.append(el('div', { class: 'st-cap', text: 'Substrate' }), card);
}

/* ---------- controls of the views ---------- */
function crossControls() {
  if (is2()) return el('div', { class: 'st-grid' },
    fld('Periods in the side view', sel1([1, 2, 3, 4].map(v => [String(v), String(v)]), () => d.view.periods, v => { d.view.periods = +v; }, 'vp', null, true)),
    fld('Height scale', sel1([['0', 'Automatic'], ['1', 'True (×1)'], ['2', '×2'], ['5', '×5'], ['10', '×10']], () => String(d.view.vex || 0), v => { d.view.vex = +v; }, 'vx', null, true)));
  return el('div', { class: 'st-grid' },
    fld('Periods shown', sel1([1, 2, 3, 4, 5, 6].map(v => [String(v), String(v)]), () => d.view.periods, v => { d.view.periods = +v; }, 'vp', null, true)),
    fld('Height scale', sel1([['0', 'Automatic'], ['1', 'True (×1)'], ['2', '×2'], ['5', '×5'], ['10', '×10']], () => String(d.view.vex || 0), v => { d.view.vex = +v; }, 'vx', null, true)));
}
function probeControls() {
  const p = d.probe;
  return el('div', { class: 'st-grid' },
    fld('Wavelength (nm)', num(() => p.nm, v => { p.nm = v; }, { min: 100, max: 30000, key: 'pnm', view: true })),
    fld('Angle (°)', num(() => p.angle, v => { p.angle = v; }, { min: -89, max: 89, step: 0.5, key: 'pan', view: true })),
    fld('Polarisation', sel1([['p', 'p (TM)'], ['s', 's (TE)']], () => p.pol, v => { p.pol = v; }, 'ppol', null, true)));
}
function specControls() {
  const c = d.calc, wl = c.scan === 'wl', o = { view: true };
  const k = [fld('Against', sel1([['wl', 'Wavelength'], ['angle', 'Angle']], () => c.scan, v => { c.scan = v; }, 'scan', 'all'))];
  if (wl) k.push(fld('From (nm)', num(() => c.lmin, v => { c.lmin = v; }, Object.assign({ min: 100, key: 'lmin' }, o))), fld('To (nm)', num(() => c.lmax, v => { c.lmax = v; }, Object.assign({ min: 100, key: 'lmax' }, o))), fld('Angle (°)', num(() => c.angle, v => { c.angle = v; }, Object.assign({ min: 0, max: 89.9, step: 0.5, key: 'cang' }, o))));
  else k.push(fld('From (°)', num(() => c.amin, v => { c.amin = v; }, Object.assign({ min: 0, max: 89.9, key: 'amin' }, o))), fld('To (°)', num(() => c.amax, v => { c.amax = v; }, Object.assign({ min: 0, max: 89.9, key: 'amax' }, o))), fld('Wavelength (nm)', num(() => c.lambda, v => { c.lambda = v; }, Object.assign({ min: 100, key: 'clam' }, o))));
  k.push(fld('Polarisation', sel1([['p', 'p (TM)'], ['s', 's (TE)'], ['avg', 'Unpolarised']], () => c.pol, v => { c.pol = v; }, 'cpol', null, true)),
    fld('Points', sel1([...new Set([51, 101, 161, 201, 401, +c.points])].sort((a, b) => a - b).map(v => [String(v), String(v)]), () => String(c.points), v => { c.points = +v; }, 'cpts', null, true)),
    fld('Curves', sel1([['RTA', 'R, T, A'], ['R', 'R'], ['T', 'T'], ['A', 'A'], ['RT', 'R, T']], () => c.show, v => { c.show = v; }, 'cshow', null, true)),
    el('button', { class: 'btn small', type: 'button', text: 'Check convergence', title: 'Recalculate a few points with 1.5× the orders and compare', onclick: convergence }));
  return el('div', { class: 'st-grid' }, ...k);
}
function mapControls() {
  const m = d.map, o = { view: true };
  return el('div', { class: 'st-grid' },
    fld('Show', sel1([['R', 'R'], ['T', 'T'], ['A', 'A']], () => m.show, v => { m.show = v; }, 'ms', null, true)),
    fld('Polarisation', sel1([['p', 'p (TM)'], ['s', 's (TE)']], () => m.pol, v => { m.pol = v; }, 'mp', null, true)),
    fld('λ from', num(() => m.lmin, v => { m.lmin = v; }, Object.assign({ min: 100, key: 'mlmin' }, o))), fld('λ to', num(() => m.lmax, v => { m.lmax = v; }, Object.assign({ min: 100, key: 'mlmax' }, o))),
    fld('θ from', num(() => m.amin, v => { m.amin = v; }, Object.assign({ min: 0, max: 89, key: 'mamin' }, o))), fld('θ to', num(() => m.amax, v => { m.amax = v; }, Object.assign({ min: 1, max: 89.9, key: 'mamax' }, o))),
    fld('Detail', sel1([['low', 'Quick (60 × 30)'], ['high', 'Fine (120 × 60)']], () => m.res, v => { m.res = v; }, 'mres', null, true)),
    el('button', { class: 'btn small primary', type: 'button', text: 'Calculate map', onclick: runMap }));
}

/* ---------- calculations ---------- */
PS.geo = (dd = d) => (is2(dd) ? RC().fromPattern2(dd, { mx: dd.mx, my: dd.my }) : RC().fromPattern(dd, { orders: dd.orders, slices: dd.slices }));
const pbAt = (g, lam) => (g.dim === 2 ? RC().problemAt2(g, lam) : RC().problemAt(g, lam));
const incN = () => TF().nk(d.side === 'bottom' ? d.substrate : { mat: d.ambient, n: d.ambientN }, d.probe.nm).n;
const outN = () => TF().nk(d.side === 'bottom' ? { mat: d.ambient, n: d.ambientN } : d.substrate, d.probe.nm).n;
/* orders labelled the textbook way: n sin θₘ = n₁ sin θ + m λ / Λ (the solver counts them the other way round) */
const flipOrders = r => { const f = q => Object.assign({}, q, { m: q.m ? -q.m : 0 }, q.n != null ? { n: q.n ? -q.n : 0 } : {}); return Object.assign({}, r, { Rn: r.Rn.map(f), Tn: r.Tn.map(f) }); };
PS.orders = (dd = d) => { const g = PS.geo(dd), p = dd.probe, pb = pbAt(g, p.nm); return flipOrders(g.dim === 2 ? RC().core.solve2(pb, p.nm, p.angle, dd.phi || 0, p.pol) : RC().core.solve(pb, p.nm, p.angle, p.pol)); };
const angleOf = (m, n) => RC().orderAngle(incN(), d.probe.angle, -m, d.probe.nm, d.period, n);
/* 2D: polar angle θ and azimuth φ of order (m, n) in a medium of index nn */
const angle2 = (m, n, nn) => { const p = d.probe, nI = incN(), st = Math.sin(p.angle * Math.PI / 180), ph = (d.phi || 0) * Math.PI / 180;
  const ax = nI * st * Math.cos(ph) + m * p.nm / d.px, ay = nI * st * Math.sin(ph) + n * p.nm / d.py, k = Math.hypot(ax, ay) / nn;
  return k <= 1 ? { th: Math.asin(k) * 180 / Math.PI, ph: Math.atan2(ay, ax) * 180 / Math.PI } : null; };
let refreshT = 0;
function refresh(viewOnly) {
  if (!root) return;
  clearTimeout(refreshT);
  refreshT = setTimeout(() => { drawCross(); scheduleField(); scheduleSpec(); drawMap(); }, viewOnly ? 10 : 30);
}
function scheduleSpec() {
  clearTimeout(specT);
  if (specJob) { specJob.cancel(); specJob = null; }
  specProg = 0; drawSpec();
  specT = setTimeout(() => {
    const c = d.calc, wl = c.scan === 'wl', N = U.clamp(Math.round(c.points) || 101, 3, 801), lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax, pts = [];
    for (let i = 0; i < N; i++) { const v = lo + (hi - lo) * i / (N - 1); pts.push({ lam: wl ? v : +c.lambda, th: wl ? +c.angle || 0 : Math.min(89.9, v), x: v }); }
    const key = JSON.stringify([PS.geo(), c]);
    const job = specJob = RC().batch(PS.geo(), pts, c.pol, p => { specProg = p; drawSpec(); }, { phi: d.phi || 0 });
    job.promise.then(vals => { if (specJob !== job) return; specJob = null; specProg = null; specRes = { key, x: pts.map(q => q.x), R: vals.map(v => v[0]), T: vals.map(v => v[1]), A: vals.map(v => Math.max(0, 1 - v[0] - v[1])), wl, calc: Object.assign({}, c) }; drawSpec(); });
  }, is2() ? 450 : 250);
}
function drawSpec() {
  const host = views.spec; if (!host) return;
  const w = Math.max(280, host.clientWidth || 420), h = 230, c = d.calc, r = specRes;
  if (!r) { host.innerHTML = `<div class="hint">Calculating (RCWA)… ${Math.round((specProg || 0) * 100)} %</div>`; return; }
  const q = c.show.split('').filter(v => UI().QCOL[v]);
  const cross = r.wl ? (Math.abs(d.probe.angle - (+r.calc.angle || 0)) < 1e-6 ? d.probe.nm : null) : (Math.abs(d.probe.nm - r.calc.lambda) < 1e-6 ? d.probe.angle : null);
  const ch = UI().chart({ id: 'ps-spec', w, h, xr: [r.x[0], r.x[r.x.length - 1]], yr: [0, 1], xlabel: r.wl ? 'Wavelength (nm)' : 'Angle of incidence (°)', ylabel: q.length === 1 ? UI().QNAME[q[0]] : 'R, T, A',
    series: q.map(k => ({ x: r.x, y: r[k], color: UI().QCOL[k] })), legend: q.length > 1 ? q.map(k => ({ name: UI().QNAME[k], color: UI().QCOL[k] })) : null, cross });
  host.innerHTML = ch.svg;
  const lines = [];
  const ext = (y, kind) => TF().extremum(r.x, y, kind);
  const e1 = ext(r.R, 'min'), e2 = ext(r.R, 'max'), u = r.wl ? ' nm' : '°';
  if (e1 && !e1.edge) lines.push(`R minimum ${UI().f1(U.clamp(e1.y, 0, 1) * 100)} % at ${UI().f1(e1.x, r.wl ? 1 : 2)}${u}`);
  if (e2 && !e2.edge) lines.push(`R maximum ${UI().f1(U.clamp(e2.y, 0, 1) * 100)} % at ${UI().f1(e2.x, r.wl ? 1 : 2)}${u}`);
  host.append(el('div', { class: 'readout', html: (lines.length ? lines.join('<br>') : 'No dip or peak inside this range.') + (specProg != null ? `<br><span class="hint" style="margin:0">updating… ${Math.round(specProg * 100)} %</span>` : '') +
    `<br><span class="hint" style="margin:0">${is2() ? (2 * d.mx + 1) * (2 * d.my + 1) + ' orders (±' + d.mx + ' × ±' + d.my + ')' : '±' + d.orders + ' orders'}, ${c.pol === 'avg' ? 'unpolarised' : c.pol + '-polarised'}. Click the curve to see the orders there.</span>` }));
  const svg = host.querySelector('svg'); svg.style.cursor = 'crosshair';
  svg.onclick = e => { const b = svg.getBoundingClientRect(), v = ch.inv((e.clientX - b.left) * w / b.width); viewChange(() => { if (r.wl) { d.probe.nm = U.round(v, 1); d.probe.angle = +r.calc.angle || 0; } else { d.probe.angle = U.round(U.clamp(v, -89, 89), 2); d.probe.nm = +r.calc.lambda; } if (r.calc.pol !== 'avg') d.probe.pol = r.calc.pol; }); };
}
function convergence(ev) {
  const btn = ev.currentTarget, c = d.calc, wl = c.scan === 'wl', lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax;
  btn.disabled = true; btn.textContent = 'Checking…';
  if (is2()) {
    const g1 = PS.geo(), g2 = RC().fromPattern2(d, { mx: d.mx + 1, my: d.my ? d.my + 1 : 0 }), pol = c.pol === 'avg' ? 'p' : c.pol, pts = [0.3, 0.7].map(f => lo + (hi - lo) * f);
    const jobs = [];
    pts.forEach(v => { const lam = wl ? v : +c.lambda, th = wl ? +c.angle || 0 : v; [g1, g2].forEach(g => jobs.push(RC().call('solve2', [pbAt(g, lam), lam, th, d.phi || 0, pol]).promise)); });
    Promise.all(jobs).then(r => {
      let worst = 0; for (let i = 0; i < r.length; i += 2) worst = Math.max(worst, Math.abs(r[i].R - r[i + 1].R), Math.abs(r[i].T - r[i + 1].T));
      btn.disabled = false; btn.textContent = 'Check convergence';
      RNBX.toast(worst < 0.01 ? `Converged: ±${d.mx} and ±${d.mx + 1} orders agree within ${U.fmt(worst * 100, 2)} %` : `Not converged yet: results change by up to ${U.fmt(worst * 100, 1)} % from ±${d.mx} to ±${d.mx + 1} orders. Raise “Orders ±Mx / ±My” (metal shapes need many; 2D uses the plain Fourier rule, so metals converge slowly).`, worst < 0.01 ? '' : 'error');
    }).catch(e => { btn.disabled = false; btn.textContent = 'Check convergence'; RNBX.toast(String(e.message || e), 'error'); });
    return;
  }
  setTimeout(() => {
    const g1 = PS.geo(), g2 = Object.assign({}, g1, { orders: Math.min(60, Math.round(g1.orders * 1.5)) });
    let worst = 0;
    [0.2, 0.5, 0.8].forEach(f => { const v = lo + (hi - lo) * f, lam = wl ? v : +c.lambda, th = wl ? +c.angle || 0 : v, pol = c.pol === 'avg' ? 'p' : c.pol;
      const a = RC().core.solve(RC().problemAt(g1, lam), lam, th, pol), b = RC().core.solve(RC().problemAt(g2, lam), lam, th, pol); worst = Math.max(worst, Math.abs(a.R - b.R), Math.abs(a.T - b.T)); });
    btn.disabled = false; btn.textContent = 'Check convergence';
    RNBX.toast(worst < 0.01 ? `Converged: ±${g1.orders} and ±${g2.orders} orders agree within ${U.fmt(worst * 100, 2)} %` : `Not converged yet: results change by up to ${U.fmt(worst * 100, 1)} % with ±${g2.orders} orders. Raise “Orders ±N” (metal structures need many).`, worst < 0.01 ? '' : 'error');
  }, 30);
}

/* diffraction orders at the probe wavelength and angle */
function drawOrders() {
  const host = views.orders; if (!host) return;
  const r = fieldRes && fieldRes.orders;
  if (!r) { host.innerHTML = `<div class="hint">${fieldJob ? 'Calculating the orders…' : 'Waiting for the calculation…'}</div>`; return; }
  const p = d.probe, nI = incN(), nO = outN(), w = Math.max(280, host.clientWidth || 420), h = 190, two = is2();
  const key = q => (two ? q.m + ',' + q.n : String(q.m)), lab = q => (two ? `(${q.m}, ${q.n})` : q.m > 0 ? '+' + q.m : String(q.m));
  const map = new Map();
  r.Rn.forEach(q => { const k = key(q); map.set(k, Object.assign(map.get(k) || { q }, { R: q.eff })); });
  r.Tn.forEach(q => { const k = key(q); map.set(k, Object.assign(map.get(k) || { q }, { T: q.eff })); });
  let all = [...map.values()].sort((a, b) => a.q.m - b.q.m || (a.q.n || 0) - (b.q.n || 0));
  const bars = two ? all.filter(o => (o.R || 0) + (o.T || 0) > 0.002).sort((a, b) => ((b.R || 0) + (b.T || 0)) - ((a.R || 0) + (a.T || 0))).slice(0, 11).sort((a, b) => a.q.m - b.q.m || a.q.n - b.q.n) : all;
  const L = 40, Rr = w - 10, mid = h / 2, bw = Math.min(26, (Rr - L) / Math.max(1, bars.length) / 2.6), hh = mid - 26;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
  s += `<line x1="${L}" y1="${mid}" x2="${Rr}" y2="${mid}" stroke="currentColor" stroke-width="0.8"/><text x="6" y="${mid - hh / 2}" fill="currentColor">R</text><text x="6" y="${mid + hh / 2 + 4}" fill="currentColor">T</text>`;
  bars.forEach((o, i) => {
    const cx = L + (i + 0.5) * (Rr - L) / bars.length, er = o.R || 0, et = o.T || 0;
    s += `<rect x="${cx - bw / 2}" y="${mid - er * hh}" width="${bw}" height="${er * hh}" fill="#1f77b4"/><rect x="${cx - bw / 2}" y="${mid}" width="${bw}" height="${et * hh}" fill="#2ca02c"/>`;
    if (er > 0.005) s += `<text x="${cx}" y="${mid - er * hh - 3}" text-anchor="middle" fill="currentColor">${UI().f1(er * 100)}</text>`;
    if (et > 0.005) s += `<text x="${cx}" y="${mid + et * hh + 11}" text-anchor="middle" fill="currentColor">${UI().f1(et * 100)}</text>`;
    s += `<text x="${cx}" y="${h - 4}" text-anchor="middle" fill="currentColor" font-weight="700" font-size="${two ? 9 : 10.5}">${lab(o.q)}</text>`;
  });
  s += `<text x="${Rr}" y="12" text-anchor="end" fill="currentColor">efficiency in %, order ${two ? '(m, n)' : 'm'} below</text>`;
  host.innerHTML = s + '</svg>';
  const shown = two ? all.filter(o => (o.R || 0) + (o.T || 0) > 1e-4) : all;
  const ang = (o, n) => { if (two) { const a = angle2(o.q.m, o.q.n, n); return a ? `${UI().f1(a.th, 1)}° / ${UI().f1(a.ph, 0)}°` : '–'; } const a = angleOf(o.q.m, n); return a == null ? '–' : UI().f1(a, 1) + '°'; };
  const rows = shown.map(o => `<tr><td><b>${lab(o.q)}</b></td><td>${o.R != null ? UI().f1(o.R * 100, 2) + ' %' : '–'}</td><td>${o.R != null ? ang(o, nI) : '–'}</td><td>${o.T != null ? UI().f1(o.T * 100, 2) + ' %' : '–'}</td><td>${o.T != null ? ang(o, nO) : '–'}</td></tr>`).join('');
  host.append(el('div', { class: 'readout', html: `At ${UI().f1(p.nm, 1)} nm, ${UI().f1(p.angle, 1)}°${two ? ', φ ' + UI().f1(d.phi || 0, 0) + '°' : ''}, ${p.pol}: R ${UI().f1(r.R * 100)} %, T ${UI().f1(r.T * 100)} %, A ${UI().f1(Math.max(0, r.A) * 100)} %.` +
    `<table class="st-tab"><tr><th>${two ? '(m, n)' : 'm'}</th><th>R</th><th>${two ? 'θ / φ' : 'angle'}</th><th>T</th><th>${two ? 'θ / φ' : 'angle'}</th></tr>${rows}</table><span class="hint" style="margin:0">${two ? 'k∥ = k₁∥ + m G_x + n G_y (G = 2π/Λ); θ from the normal, φ from x.' : 'Grating equation: n sin θₘ = n₁ sin θ + m λ / Λ.'} Angles from the surface normal.</span>` }));
}

/* ---------- near field |E|² (and the orders) at the probe, in the background ---------- */
const INFERNO = ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'].map(U.hexToRgb);
const hot = v => { const t = U.clamp(v, 0, 1) * (INFERNO.length - 1), i = Math.min(INFERNO.length - 2, Math.floor(t)), u = t - i, a = INFERNO[i], b = INFERNO[i + 1]; return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * u)); };
/* layers in the order the light meets them (z = 0 at the illuminated surface) */
const lightLayers = () => (d.side === 'bottom' ? FL().reverse() : FL());
const totalNm = () => FL().reduce((a, L) => a + (+L.nm || 0), 0);
const fieldPad = () => U.clamp(0.35 * totalNm(), 40, 250);
const defaultZ = () => { let z = 0; for (const L of lightLayers()) { if ((L.shapes || []).length) return z + (+L.nm || 0) / 2; z += +L.nm || 0; } return totalNm() / 2; };
function fieldControls() {
  const v = d.view, k = [];
  if (is2()) {
    k.push(fld('Plane', sel1([['xz', 'Side cut (x–z at the dashed line)'], ['xy', 'Top cut (x–y at a depth)']], () => v.plane || 'xz', x => { v.plane = x; }, 'fpl', 'all', true)));
    if ((v.plane || 'xz') === 'xy') k.push(fld('Depth z (nm)', num(() => U.round(v.fieldZ == null ? defaultZ() : v.fieldZ, 1), x => { v.fieldZ = x; }, { key: 'fz', view: true, title: 'From the illuminated surface into the structure' })));
  }
  k.push(fld('Colour scale', sel1([['lin', 'Linear'], ['log', 'Logarithmic (3 decades)']], () => (v.log ? 'log' : 'lin'), x => { v.log = x === 'log'; }, 'flog', null, true)),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Field CSV', title: 'The |E|² map as CSV', onclick: fieldCsv }));
  return el('div', { class: 'st-grid' }, ...k);
}
function scheduleField() {
  clearTimeout(fieldT);
  if (fieldJob) { fieldJob.cancel(); fieldJob = null; }
  drawField(); drawOrders();
  fieldT = setTimeout(() => {
    const g = PS.geo(), p = d.probe, pb = pbAt(g, p.nm), pad = fieldPad(), tot = totalNm(), v = d.view;
    const nz = is2() ? 80 : 110, zs = Array.from({ length: nz }, (_, i) => -pad + (tot + 2 * pad) * (i + 0.5) / nz);
    let job, spec;
    if (!is2()) {
      const nx = 96, xs = Array.from({ length: nx }, (_, i) => (i + 0.5) / nx * d.period);
      job = RC().call('field1', [pb, p.nm, p.angle, p.pol, xs, zs]); spec = { kind: 'xz', nx, nz, zs, ext: d.period };
    } else if ((v.plane || 'xz') === 'xz') {
      const nx = 56, y = ((v.cutY == null ? d.py / 2 : v.cutY) % d.py + d.py) % d.py, pts = Array.from({ length: nx }, (_, i) => [(i + 0.5) / nx * d.px, y]);
      job = RC().call('field2', [pb, p.nm, p.angle, d.phi || 0, p.pol, zs, pts]); spec = { kind: 'xz', nx, nz, zs, ext: d.px };
    } else {
      const nx = 48, ny = U.clamp(Math.round(48 * d.py / d.px), 16, 96), z = v.fieldZ == null ? defaultZ() : v.fieldZ, pts = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) pts.push([(i + 0.5) / nx * d.px, (j + 0.5) / ny * d.py]);
      job = RC().call('field2', [pb, p.nm, p.angle, d.phi || 0, p.pol, [z], pts]); spec = { kind: 'xy', nx, ny, z };
    }
    fieldJob = job; drawField(); drawOrders();
    job.promise.then(r => {
      if (fieldJob !== job) return;
      fieldJob = null; fieldStale = false;
      fieldRes = Object.assign(spec, { map: r.map, orders: flipOrders(r.R), lam: p.nm, angle: p.angle, pol: p.pol, two: is2() });
      drawField(); drawOrders();
    }).catch(e => { if (fieldJob === job) { fieldJob = null; if (views.field) views.field.textContent = 'Calculation failed: ' + (e.message || e); } });
  }, is2() ? 450 : 200);
}
/* outlines of a 2D shape (nm) for the top views */
const outline2 = sh => {
  const ring = (r1, r2, k = 40) => Array.from({ length: k }, (_, i) => { const a = 2 * Math.PI * i / k; return [sh.x + r1 * Math.cos(a), sh.y + r2 * Math.sin(a)]; });
  if (sh.kind === 'rect') return [[[sh.x - sh.wx / 2, sh.y - sh.wy / 2], [sh.x + sh.wx / 2, sh.y - sh.wy / 2], [sh.x + sh.wx / 2, sh.y + sh.wy / 2], [sh.x - sh.wx / 2, sh.y + sh.wy / 2]]];
  if (sh.kind === 'cross') { const a = sh.L / 2, b = sh.w / 2, x = sh.x, y = sh.y; return [[[x - b, y - a], [x + b, y - a], [x + b, y - b], [x + a, y - b], [x + a, y + b], [x + b, y + b], [x + b, y + a], [x - b, y + a], [x - b, y + b], [x - a, y + b], [x - a, y - b], [x - b, y - b]]]; }
  if (sh.kind === 'ring') return [ring(sh.r, sh.r), ring(sh.rin || 0, sh.rin || 0)];
  return [ring(sh.rx || 1, sh.ry || sh.rx || 1)];
};
const pathOf = (polys, X, Y) => polys.filter(p => p.length > 2).map(p => 'M ' + p.map(q => X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join(' L ') + ' Z').join(' ');
function drawField() {
  const host = views.field; if (!host) return;
  const r = fieldRes;
  if (!r || r.two !== is2()) { host.innerHTML = `<div class="hint">${fieldJob ? 'Calculating the near field…' : 'Waiting for the calculation…'}</div>`; return; }
  const w = Math.max(300, host.clientWidth || 460), T = 10, L = 46, R = w - 60, tiles = r.kind === 'xy' ? 2 : Math.max(1, Math.min(3, d.view.periods || 2));
  let vmax = 0; for (let i = 0; i < r.map.length; i++) if (r.map[i] > vmax) vmax = r.map[i];
  const norm = v => (d.view.log ? 1 + Math.log10(Math.max(v, vmax * 1e-3) / vmax) / 3 : v / (vmax || 1));
  const cols = r.nx * tiles, rows = r.kind === 'xy' ? r.ny * 2 : r.nz, cv = document.createElement('canvas'); cv.width = cols; cv.height = rows;
  const cx = cv.getContext('2d'), im = cx.createImageData(cols, rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const v = r.kind === 'xy' ? r.map[(j % r.ny) * r.nx + (i % r.nx)] : r.map[j * r.nx + (i % r.nx)], c = hot(norm(v)), o = (j * cols + i) * 4;
    im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  let s, h;
  if (r.kind === 'xz') {
    const ext = r.ext * tiles, z0 = r.zs[0] - (r.zs[1] - r.zs[0]) / 2, z1 = r.zs[r.zs.length - 1] + (r.zs[1] - r.zs[0]) / 2;
    h = Math.round(U.clamp((R - L) * (z1 - z0) / ext, 150, 380)) + T + 32;
    const B = h - 30, X = x => L + x / ext * (R - L), Y = z => T + (z - z0) / (z1 - z0) * (B - T);
    s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
    s += `<image href="${cv.toDataURL()}" x="${L}" y="${T}" width="${R - L}" height="${B - T}" preserveAspectRatio="none"/>`;
    // layer boundaries and shape outlines (light order, depth downwards)
    let zc = 0; const lines = [0];
    const ol = '#ffffff', dash = 'stroke-dasharray="3 2"';
    lightLayers().forEach(Lr => {
      const hL = +Lr.nm || 0, flipZ = d.side === 'bottom';
      if (!is2()) RC().pattern.copies(Lr, 0, d.period, tiles).forEach(cp => {
        s += `<path d="M ${cp.pts.map(q => X(q[0]).toFixed(1) + ' ' + Y(zc + (flipZ ? q[1] : hL - q[1])).toFixed(1)).join(' L ')} Z" fill="none" stroke="${ol}" stroke-opacity="0.75" stroke-width="0.9"/>`;
      });
      else if ((Lr.shapes || []).length) {
        const y = ((d.view.cutY == null ? d.py / 2 : d.view.cutY) % d.py + d.py) % d.py, n = 400;
        let prev = null;
        for (let i = 0; i <= n; i++) {
          const x = i / n * ext, xm = ((x % d.px) + d.px) % d.px;
          let m = -1; Lr.shapes.forEach((sh, si) => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (RC().pattern2.inside(sh, xm + a * d.px, y + b * d.py)) m = si; });
          if (prev != null && m !== prev) s += `<line x1="${X(x)}" y1="${Y(zc)}" x2="${X(x)}" y2="${Y(zc + hL)}" stroke="${ol}" stroke-opacity="0.75" stroke-width="0.9"/>`;
          prev = m;
        }
      }
      zc += hL; lines.push(zc);
    });
    lines.forEach(z => { s += `<line x1="${L}" y1="${Y(z)}" x2="${R}" y2="${Y(z)}" stroke="${ol}" stroke-opacity="0.6" stroke-width="0.7" ${dash}/>`; });
    const xt = UI().ticks(0, ext, 5), zt = UI().ticks(z0, z1, 5);
    s += `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="none" stroke="currentColor"/>`;
    xt.out.forEach(v => { if (v > ext + 1e-9) return; s += `<line x1="${X(v)}" y1="${B}" x2="${X(v)}" y2="${B + 4}" stroke="currentColor"/><text x="${X(v)}" y="${B + 14}" text-anchor="middle" fill="currentColor">${UI().fmt(v, xt.st)}</text>`; });
    zt.out.forEach(v => { if (v < z0 || v > z1) return; s += `<line x1="${L}" y1="${Y(v)}" x2="${L - 4}" y2="${Y(v)}" stroke="currentColor"/><text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" fill="currentColor">${UI().fmt(v, zt.st)}</text>`; });
    s += `<text x="${(L + R) / 2}" y="${h - 3}" text-anchor="middle" fill="currentColor">x (nm)${is2() ? ' at y = ' + UI().f1(d.view.cutY == null ? d.py / 2 : d.view.cutY, 0) + ' nm' : ''}</text><text transform="translate(11 ${(T + B) / 2}) rotate(-90)" text-anchor="middle" fill="currentColor">depth z (nm)</text>`;
  } else {
    const ext = d.px * 2, exy = d.py * 2;
    h = Math.round(U.clamp((R - L) * exy / ext, 150, 420)) + T + 32;
    const B = h - 30, X = x => L + x / ext * (R - L), Y = y => T + y / exy * (B - T);
    s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
    s += `<image href="${cv.toDataURL()}" x="${L}" y="${T}" width="${R - L}" height="${B - T}" preserveAspectRatio="none"/>`;
    // outlines of the layer at this depth
    let zc = 0, Lz = null; lightLayers().forEach(Lr => { if (r.z >= zc && r.z <= zc + (+Lr.nm || 0) && !Lz) Lz = Lr; zc += +Lr.nm || 0; });
    if (Lz) (Lz.shapes || []).forEach(sh => { for (let a = -1; a <= 2; a++) for (let b = -1; b <= 2; b++) { const c2 = Object.assign({}, sh, { x: ((sh.x % d.px) + d.px) % d.px + a * d.px, y: ((sh.y % d.py) + d.py) % d.py + b * d.py }); s += `<path d="${pathOf(outline2(c2), X, Y)}" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="0.9" fill-rule="evenodd" clip-path="url(#ps-fclip)"/>`; } });
    s += `<defs><clipPath id="ps-fclip"><rect x="${L}" y="${T}" width="${R - L}" height="${B - T}"/></clipPath></defs><rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="none" stroke="currentColor"/>`;
    const xt = UI().ticks(0, ext, 5), yt = UI().ticks(0, exy, 5);
    xt.out.forEach(v => { if (v > ext + 1e-9) return; s += `<text x="${X(v)}" y="${B + 14}" text-anchor="middle" fill="currentColor">${UI().fmt(v, xt.st)}</text>`; });
    yt.out.forEach(v => { if (v > exy + 1e-9) return; s += `<text x="${L - 6}" y="${Y(v) + 4}" text-anchor="end" fill="currentColor">${UI().fmt(v, yt.st)}</text>`; });
    s += `<text x="${(L + R) / 2}" y="${h - 3}" text-anchor="middle" fill="currentColor">x (nm), at depth ${UI().f1(r.z, 0)} nm${Lz ? ' (' + U.esc(Lz.name || '') + ')' : ''}</text><text transform="translate(11 ${(T + B) / 2}) rotate(-90)" text-anchor="middle" fill="currentColor">y (nm)</text>`;
  }
  // colour bar
  const cb = R + 14, B2 = h - 30;
  for (let k = 0; k < 40; k++) { const c = hot(1 - k / 39); s += `<rect x="${cb}" y="${T + (B2 - T) * k / 40}" width="10" height="${(B2 - T) / 40 + 0.6}" fill="rgb(${c})"/>`; }
  s += `<rect x="${cb}" y="${T}" width="10" height="${B2 - T}" fill="none" stroke="currentColor"/>`;
  const lab = v => (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2));
  s += `<text x="${cb + 13}" y="${T + 8}" fill="currentColor">${lab(vmax)}</text><text x="${cb + 13}" y="${B2}" fill="currentColor">${d.view.log ? lab(vmax / 1000) : '0'}</text>`;
  host.innerHTML = s + '</svg>';
  host.append(el('div', { class: 'hint', text: `|E|² / |E₀|² at ${UI().f1(r.lam, 1)} nm, ${UI().f1(r.angle, 1)}°, ${r.pol}-polarised${is2() ? ', φ ' + UI().f1(d.phi || 0, 0) + '°' : ''}; peak ${lab(vmax)}. Light from ${d.side === 'bottom' ? 'below (drawn with the light entering at the top)' : 'above'}. ${fieldJob ? 'Updating…' : fieldStale ? '' : ''}` }));
}
function fieldCsv() {
  const r = fieldRes; if (!r) return;
  const rows = [`# |E|^2/|E0|^2 at ${r.lam} nm, ${r.angle} deg, ${r.pol}` + (r.two ? `, phi ${d.phi || 0} deg` : '')];
  if (r.kind === 'xz') { const xs = Array.from({ length: r.nx }, (_, i) => U.round((i + 0.5) / r.nx * r.ext, 3)); rows.push('z (nm) / x (nm),' + xs.join(',')); r.zs.forEach((z, j) => rows.push([U.round(z, 3)].concat(Array.from(r.map.slice(j * r.nx, (j + 1) * r.nx), v => v.toPrecision(5))).join(','))); }
  else { const xs = Array.from({ length: r.nx }, (_, i) => U.round((i + 0.5) / r.nx * d.px, 3)); rows.push(`# plane at depth ${r.z} nm`, 'y (nm) / x (nm),' + xs.join(',')); for (let j = 0; j < r.ny; j++) rows.push([U.round((j + 0.5) / r.ny * d.py, 3)].concat(Array.from(r.map.slice(j * r.nx, (j + 1) * r.nx), v => v.toPrecision(5))).join(',')); }
  U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(d.name || 'unit-cell') + '_near-field.csv');
}

/* map in the background, on request */
function runMap() {
  if (mapJob) mapJob.cancel();
  const m = d.map, [nl, na] = is2() ? (m.res === 'high' ? [48, 24] : [30, 15]) : m.res === 'high' ? [120, 60] : [60, 30];
  const lmin = Math.min(m.lmin, m.lmax - 1), lmax = Math.max(m.lmax, m.lmin + 1), amin = U.clamp(Math.min(m.amin, m.amax - 0.5), 0, 89), amax = U.clamp(Math.max(m.amax, m.amin + 0.5), 0.5, 89.9);
  const pts = [];
  for (let j = 0; j < na; j++) for (let i = 0; i < nl; i++) pts.push({ lam: lmin + (lmax - lmin) * i / (nl - 1), th: amin + (amax - amin) * j / (na - 1) });
  mapProg = 0; drawMap();
  const job = mapJob = RC().batch(PS.geo(), pts, m.pol, p => { mapProg = p; drawMap(); }, { phi: d.phi || 0 });
  job.promise.then(vals => {
    if (mapJob !== job) return;
    mapJob = null; mapProg = null; mapStale = false;
    const v = new Float32Array(nl * na); vals.forEach((q, i) => { v[i] = m.show === 'R' ? q[0] : m.show === 'T' ? q[1] : Math.max(0, 1 - q[0] - q[1]); });
    mapRes = { v, nl, na, lmin, lmax, amin, amax, show: m.show, pol: m.pol };
    drawMap();
  });
}
function drawMap() {
  const host = views.map; if (!host) return;
  const w = Math.max(280, host.clientWidth || 420), h = 260;
  if (mapProg != null) { host.innerHTML = `<div class="hint">Calculating the map (RCWA)… ${Math.round(mapProg * 100)} %</div>`; return; }
  if (!mapRes) { host.innerHTML = '<div class="hint">Press “Calculate map”: every point is a full grating calculation, so it takes a few seconds to a minute.</div>'; return; }
  const ch = UI().mapChart(mapRes, w, h, [d.probe.nm, d.probe.angle]);
  host.innerHTML = ch.svg;
  host.append(el('div', { class: 'hint', text: (mapStale ? 'Out of date: the structure has changed. Press “Calculate map” again. ' : '') + `${UI().QNAME[mapRes.show]}, ${mapRes.pol}-polarised. Lines that bend with angle are diffraction (Rayleigh) edges, guided-mode and plasmon resonances; click to see the orders there.` }));
  const svg = host.querySelector('svg'); svg.style.cursor = 'crosshair';
  svg.onclick = e => { const b = svg.getBoundingClientRect(), x = (e.clientX - b.left) * w / b.width, y = (e.clientY - b.top) * h / b.height; viewChange(() => { d.probe.nm = U.round(U.clamp(ch.inv(x), mapRes.lmin, mapRes.lmax), 1); d.probe.angle = U.round(U.clamp(ch.invY(y), mapRes.amin, mapRes.amax), 1); d.probe.pol = mapRes.pol; }); };
}

/* ---------- the cross-section, with handles ---------- */
let geomCache = null;
function layout(w) {
  const N = d.view.periods || 3, P = d.period, tot = FL().reduce((a, L) => a + (+L.nm || 0), 0) || 1;
  const L = 12, R = w - 12, sx = (R - L) / (N * P);
  let vex = +d.view.vex || 0;
  if (!vex) vex = Math.max(1, Math.min(20, Math.ceil(110 / (tot * sx))));
  let sz = sx * vex;
  if (tot * sz > 340) sz = 340 / tot;
  const amb = 30, sub = 40, top = 10 + amb, Hs = tot * sz, h = Math.round(top + Hs + sub + 26);
  let y = top; const lay = FL().map(Lr => { const r = { y0: y, y1: y + (+Lr.nm || 0) * sz }; y = r.y1; return r; });
  return { N, P, L, R, sx, sz, vex: sz / sx, top, Hs, h, lay, sub, amb };
}
function drawCross() {
  if (is2()) { drawTop(); drawSide(); return; }
  const host = views.cross; if (!host) return;
  const w = Math.max(300, host.clientWidth || 460), g = layout(w), X = x => g.L + x * g.sx, flip = d.side === 'bottom';
  const ink = '#111', ambCol = d.ambient === 'air' ? '#f7f9fc' : UI().colorOf(d.ambient);
  let s = `<svg viewBox="0 0 ${w} ${g.h}" width="${w}" height="${g.h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart ps-cross">`;
  s += `<rect x="${g.L}" y="${g.top - g.amb}" width="${g.R - g.L}" height="${g.amb}" fill="${ambCol}" fill-opacity="0.6"/>`;
  s += `<rect x="${g.L}" y="${g.top + g.Hs}" width="${g.R - g.L}" height="${g.sub}" fill="${d.substrate.color || '#cfe6f2'}" fill-opacity="${d.substrate.mat === 'air' ? 0.3 : 0.75}" stroke="#00000033" stroke-width="0.5"/>`;
  s += `<text x="${g.L + 4}" y="${g.top - g.amb + 13}" fill="#333">${U.esc(TF().name(d.ambient))}</text><text x="${g.L + 4}" y="${g.top + g.Hs + 15}" fill="#333">${U.esc(d.substrate.name || TF().name(d.substrate.mat))}</text>`;
  const polys = [];
  FL().forEach((Lr, li) => {
    const ly = g.lay[li], hpx = ly.y1 - ly.y0;
    s += `<rect x="${g.L}" y="${ly.y0}" width="${g.R - g.L}" height="${Math.max(0.5, hpx)}" fill="${Lr.mat === 'air' ? ambCol : (Lr.color || UI().colorOf(Lr.mat))}" fill-opacity="${Lr.mat === 'air' ? 0.6 : 1}" stroke="#00000033" stroke-width="0.5"/>`;
    RC().pattern.copies(Lr, li, g.P, g.N).forEach(cp => {
      const pts = cp.pts.map(q => [X(q[0]), ly.y1 - q[1] * g.sz]), isSel = sameL(sel.li, li) && sel.si === cp.si;
      polys.push({ li, si: cp.si, pts });
      const fill = cp.sh.mat === 'air' ? ambCol : (cp.sh.color || UI().colorOf(cp.sh.mat));
      s += `<path d="M ${pts.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join(' L ')} Z" fill="${fill}" stroke="${isSel ? 'var(--accent)' : '#00000088'}" stroke-width="${isSel ? 1.8 : 0.7}"/>`;
    });
    if (hpx >= 11) s += `<text x="${g.R - 4}" y="${(ly.y0 + ly.y1) / 2 + 4}" text-anchor="end" fill="${ink}" font-weight="700" stroke="#ffffff" stroke-width="3" paint-order="stroke">${U.esc((Lr.name || '') + '  ' + UI().f1(Lr.nm, Lr.nm < 10 ? 1 : 0) + ' nm')}</text>`;
  });
  // periods and the period marker
  for (let k = 0; k <= g.N; k++) s += `<line x1="${X(k * g.P)}" y1="${g.top - g.amb}" x2="${X(k * g.P)}" y2="${g.top + g.Hs + g.sub}" stroke="#00000055" stroke-dasharray="3 3" stroke-width="0.8"/>`;
  const kc = Math.floor((g.N - 1) / 2), ya = g.top - g.amb + 22;
  s += `<line x1="${X(kc * g.P) + 2}" y1="${ya}" x2="${X((kc + 1) * g.P) - 2}" y2="${ya}" stroke="${ink}" stroke-width="1" marker-start="url(#ps-ar)" marker-end="url(#ps-ar)"/><text x="${X((kc + 0.5) * g.P)}" y="${ya - 4}" text-anchor="middle" fill="${ink}">Λ = ${UI().f1(g.P, 0)} nm</text>`;
  s += `<defs><marker id="ps-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${ink}"/></marker></defs>`;
  // light
  const ax = g.L + 26, ay0 = flip ? g.top + g.Hs + g.sub - 2 : g.top - g.amb + 2, ay1 = flip ? g.top + g.Hs + 6 : g.top - 6;
  s += `<line x1="${ax}" y1="${ay0}" x2="${ax}" y2="${ay1}" stroke="#d62728" stroke-width="2" marker-end="url(#ps-ar2)"/><defs><marker id="ps-ar2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#d62728"/></marker></defs>`;
  // handles of the selected shape (in the marked period)
  const hs = handles(g, kc);
  hs.forEach(hd => {
    if (hd.type === 'h') s += `<path d="M ${hd.x - 6} ${hd.y + 4} L ${hd.x + 6} ${hd.y + 4} L ${hd.x} ${hd.y - 6} Z" fill="var(--accent)" stroke="#fff" stroke-width="1"/>`;
    else if (hd.type === 'shift') s += `<rect x="${hd.x - 5}" y="${hd.y - 5}" width="10" height="10" fill="var(--accent)" stroke="#fff" stroke-width="1"/>`;
    else s += `<circle cx="${hd.x}" cy="${hd.y}" r="5.5" fill="var(--accent)" stroke="#fff" stroke-width="1.2"/>`;
  });
  s += `<text x="${g.R}" y="${g.h - 6}" text-anchor="end" fill="#666">${g.vex > 1.05 || g.vex < 0.95 ? 'heights ×' + UI().f1(g.vex, g.vex < 2 ? 1 : 0) : 'true proportions'} · ${g.N} period${g.N > 1 ? 's' : ''}</text>`;
  host.innerHTML = s + '</svg>';
  geomCache = { g, polys, hs, w, kc };
  const svg = host.querySelector('svg');
  svg.style.touchAction = 'none';
  svg.onpointerdown = onDown;
}
function handles(g, kc) {
  const L = FL()[sel.li]; if (!L) return [];
  const ly = g.lay[sel.li], X = x => g.L + x * g.sx, Y = z => ly.y1 - z * g.sz, h = +L.nm || 0, out = [{ type: 'h', x: g.R - 18, y: ly.y0 }];
  const sh = (L.shapes || [])[sel.si];
  if (!sh || sh.kind !== 'trap') return out;
  const x = ((sh.x % d.period) + d.period) % d.period + kc * d.period, wb = +sh.wb || 0, wt = sh.wt == null ? wb : +sh.wt, s = +sh.shift || 0;
  out.push({ type: 'wb', x: X(x + wb / 2), y: Y(0) }, { type: 'wt', x: X(x + s + wt / 2), y: Y(h) }, { type: 'shift', x: X(x + s), y: Y(h) });
  return out;
}
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > pt[1]) !== (b[1] > pt[1]) && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
function onDown(e) {
  const svg = e.currentTarget, b = svg.getBoundingClientRect(), gc = geomCache; if (!gc) return;
  const k = gc.w / b.width, px = (e.clientX - b.left) * k, py = (e.clientY - b.top) * k;
  let mode = null;
  const hd = gc.hs.find(q => Math.hypot(q.x - px, q.y - py) < 9);
  if (hd) mode = hd.type;
  else {
    const hit = gc.polys.slice().reverse().find(q => inside([px, py], q.pts));
    if (hit) { sel = { li: canon(hit.li), si: hit.si }; mode = 'move'; }
    else { const li = gc.g.lay.findIndex(l => py >= l.y0 && py <= l.y1); if (li >= 0) { sel = { li: canon(li), si: -1 }; } markSel(); drawCross(); return; }
  }
  e.preventDefault();
  markSel();
  const L = FL()[sel.li], sh = (L.shapes || [])[sel.si], g = gc.g;
  const start = { px, py, x: sh ? +sh.x : 0, wb: sh ? +sh.wb : 0, wt: sh ? (sh.wt == null ? +sh.wb : +sh.wt) : 0, shift: sh ? +sh.shift || 0 : 0, h: +L.nm || 0 };
  step('drag' + Date.now());
  const move = ev => {
    const qx = (ev.clientX - b.left) * k, qy = (ev.clientY - b.top) * k, dx = (qx - start.px) / g.sx, dz = -(qy - start.py) / g.sz;
    const r1 = v => Math.round(v);
    if (mode === 'move' && sh) sh.x = r1(start.x + dx);
    else if (mode === 'wb' && sh) { sh.wb = U.clamp(r1(start.wb + 2 * dx), 1, d.period); if (start.wt === start.wb && !start.shift) sh.wt = sh.wb; }
    else if (mode === 'wt' && sh) sh.wt = U.clamp(r1(start.wt + 2 * dx), 0, d.period);
    else if (mode === 'shift' && sh) sh.shift = r1(start.shift + dx);
    else if (mode === 'h') L.nm = Math.max(1, r1(start.h + dz * (g.sz > 0 ? 1 : 1)));
    save(); geomChanged(); drawCross(); scheduleField(); scheduleSpec();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); buildList(); drawMap(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}

/* ---------- 2D: top view of one layer (editable) and the side cut ---------- */
let topCache = null;
const wrapX = x => ((x % d.px) + d.px) % d.px, wrapY = y => ((y % d.py) + d.py) % d.py;
function drawTop() {
  const host = views.cross; if (!host) return;
  if (!FL()[sel.li]) sel = { li: Math.max(0, FL().findIndex(L => (L.shapes || []).length)), si: 0 };
  const L = FL()[sel.li] || FL()[0]; if (!L) { host.innerHTML = ''; return; }
  const w = Math.max(300, host.clientWidth || 460), x0 = -d.px / 2, y0 = -d.py / 2, ex = 2 * d.px, ey = 2 * d.py;
  const sc = Math.min((w - 24) / ex, 330 / ey), h = Math.round(ey * sc) + 34, ox = (w - ex * sc) / 2, oy = 8;
  const X = x => ox + (x - x0) * sc, Y = y => oy + (y - y0) * sc;
  const amb = '#f7f9fc', bg = L.mat === 'air' ? amb : (L.color || UI().colorOf(L.mat));
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart ps-cross">`;
  s += `<defs><clipPath id="ps-tclip"><rect x="${X(x0)}" y="${Y(y0)}" width="${ex * sc}" height="${ey * sc}"/></clipPath></defs><rect x="${X(x0)}" y="${Y(y0)}" width="${ex * sc}" height="${ey * sc}" fill="${bg}"/>`;
  s += '<g clip-path="url(#ps-tclip)">';
  (L.shapes || []).forEach((sh, si) => {
    const isSel = si === sel.si, fill = sh.mat === 'air' ? amb : (sh.color || UI().colorOf(sh.mat));
    for (let a = -1; a <= 2; a++) for (let b = -1; b <= 2; b++) {
      const c2 = Object.assign({}, sh, { x: wrapX(sh.x) + a * d.px, y: wrapY(sh.y) + b * d.py }), central = a === 0 && b === 0;
      s += `<path d="${pathOf(outline2(c2), X, Y)}" fill="${fill}" fill-rule="evenodd" stroke="${isSel && central ? 'var(--accent)' : '#00000077'}" stroke-width="${isSel && central ? 1.8 : 0.7}" ${central ? '' : 'fill-opacity="0.75"'}/>`;
    }
  });
  s += '</g>';
  s += `<rect x="${X(0)}" y="${Y(0)}" width="${d.px * sc}" height="${d.py * sc}" fill="none" stroke="var(--accent)" stroke-dasharray="5 3" stroke-width="1"/>`;
  const cy = wrapY(d.view.cutY == null ? d.py / 2 : d.view.cutY);
  s += `<line x1="${X(x0)}" y1="${Y(cy)}" x2="${X(x0 + ex)}" y2="${Y(cy)}" stroke="#d62728" stroke-width="1.2" stroke-dasharray="6 3"/><text x="${X(x0 + ex) - 4}" y="${Y(cy) - 4}" text-anchor="end" fill="#d62728">cut</text>`;
  const hs = handles2(L, X, Y);
  hs.forEach(hd => { s += `<circle cx="${hd.x}" cy="${hd.y}" r="5.5" fill="var(--accent)" stroke="#fff" stroke-width="1.2"/>`; });
  s += `<text x="${w / 2}" y="${h - 8}" text-anchor="middle" fill="#666">${U.esc(L.name || '')} · cell Λx ${UI().f1(d.px, 0)} × Λy ${UI().f1(d.py, 0)} nm (dashed) · x → , y ↓</text>`;
  host.innerHTML = s + '</svg>';
  topCache = { X, Y, sc, w, hs, L, cy };
  const svg = host.querySelector('svg'); svg.style.touchAction = 'none'; svg.onpointerdown = onDownTop;
}
function handles2(L, X, Y) {
  const sh = (L.shapes || [])[sel.si]; if (!sh) return [];
  const x = wrapX(sh.x), y = wrapY(sh.y), out = [];
  if (sh.kind === 'disk') out.push({ type: 'rx', x: X(x + (sh.rx || 0)), y: Y(y) }, { type: 'ry', x: X(x), y: Y(y + (sh.ry || 0)) });
  if (sh.kind === 'rect') out.push({ type: 'wh', x: X(x + sh.wx / 2), y: Y(y + sh.wy / 2) });
  if (sh.kind === 'ring') out.push({ type: 'r', x: X(x + sh.r), y: Y(y) }, { type: 'rin', x: X(x + (sh.rin || 0)), y: Y(y) });
  if (sh.kind === 'cross') out.push({ type: 'L', x: X(x + sh.L / 2), y: Y(y) }, { type: 'w', x: X(x), y: Y(y + sh.w / 2) });
  return out;
}
function onDownTop(e) {
  const svg = e.currentTarget, b = svg.getBoundingClientRect(), tc = topCache; if (!tc) return;
  const k = tc.w / b.width, px = (e.clientX - b.left) * k, py = (e.clientY - b.top) * k;
  const toNm = (qx, qy) => [(qx - tc.X(0)) / tc.sc, (qy - tc.Y(0)) / tc.sc];
  const [nx0, ny0] = toNm(px, py), L = tc.L;
  let mode = null; const hd = tc.hs.find(q => Math.hypot(q.x - px, q.y - py) < 9);
  if (hd) mode = hd.type;
  else {
    let hit = -1; (L.shapes || []).forEach((sh, si) => { for (let a = -2; a <= 2; a++) for (let c = -2; c <= 2; c++) if (RC().pattern2.inside(Object.assign({}, sh, { x: wrapX(sh.x), y: wrapY(sh.y) }), nx0 + a * d.px, ny0 + c * d.py)) hit = si; });
    if (Math.abs(py - tc.Y(tc.cy)) < 6 && hit < 0) mode = 'cut';
    else if (hit >= 0) { sel = { li: sel.li, si: hit }; mode = 'move'; markSel(); }
    else if (Math.abs(py - tc.Y(tc.cy)) < 9) mode = 'cut';
    else return;
  }
  e.preventDefault();
  const sh = (L.shapes || [])[sel.si], st = sh ? JSON.parse(JSON.stringify(sh)) : null, cut0 = tc.cy;
  step('drag2' + Date.now());
  const r1 = v => Math.round(v);
  const move = ev => {
    const [qx, qy] = toNm((ev.clientX - b.left) * k, (ev.clientY - b.top) * k), dx = qx - nx0, dy = qy - ny0;
    if (mode === 'cut') d.view.cutY = r1(wrapY(cut0 + dy));
    else if (sh) {
      if (mode === 'move') { sh.x = r1(st.x + dx); sh.y = r1(st.y + dy); }
      if (mode === 'rx') { sh.rx = Math.max(1, r1(st.rx + dx)); if (st.rx === st.ry) sh.ry = sh.rx; }
      if (mode === 'ry') sh.ry = Math.max(1, r1(st.ry + dy));
      if (mode === 'wh') { sh.wx = U.clamp(r1(st.wx + 2 * dx), 1, d.px); sh.wy = U.clamp(r1(st.wy + 2 * dy), 1, d.py); }
      if (mode === 'r') sh.r = Math.max((sh.rin || 0) + 1, r1(st.r + dx));
      if (mode === 'rin') sh.rin = U.clamp(r1(st.rin + dx), 0, sh.r - 1);
      if (mode === 'L') sh.L = Math.max(sh.w, r1(st.L + 2 * dx));
      if (mode === 'w') sh.w = U.clamp(r1(st.w + 2 * dy), 1, sh.L);
    }
    save(); geomChanged(); drawTop(); drawSide();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); buildList(); scheduleField(); scheduleSpec(); drawMap(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
}
function drawSide() {
  const host = views.side; if (!host) return;
  const w = Math.max(300, host.clientWidth || 460), g = layout(w), X = x => g.L + x * g.sx, y = wrapY(d.view.cutY == null ? d.py / 2 : d.view.cutY), ambCol = d.ambient === 'air' ? '#f7f9fc' : UI().colorOf(d.ambient);
  let s = `<svg viewBox="0 0 ${w} ${g.h}" width="${w}" height="${g.h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
  s += `<rect x="${g.L}" y="${g.top - g.amb}" width="${g.R - g.L}" height="${g.amb}" fill="${ambCol}" fill-opacity="0.6"/>`;
  s += `<rect x="${g.L}" y="${g.top + g.Hs}" width="${g.R - g.L}" height="${g.sub}" fill="${d.substrate.color || '#cfe6f2'}" fill-opacity="0.75" stroke="#00000033" stroke-width="0.5"/>`;
  s += `<text x="${g.L + 4}" y="${g.top - g.amb + 13}" fill="#333">${U.esc(TF().name(d.ambient))}</text><text x="${g.L + 4}" y="${g.top + g.Hs + 15}" fill="#333">${U.esc(d.substrate.name || TF().name(d.substrate.mat))}</text>`;
  FL().forEach((Lr, li) => {
    const ly = g.lay[li], n = Math.round(g.R - g.L);
    const colAt = x => { const xm = wrapX(x); let c = Lr.mat === 'air' ? ambCol : (Lr.color || UI().colorOf(Lr.mat)); (Lr.shapes || []).forEach(sh => { for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (RC().pattern2.inside(sh, xm + a * d.px, y + b * d.py)) c = sh.mat === 'air' ? ambCol : (sh.color || UI().colorOf(sh.mat)); }); return c; };
    let start = 0, cur = colAt(0);
    for (let i = 1; i <= n; i++) {
      const c = i < n ? colAt(i / g.sx) : null;
      if (c !== cur) { s += `<rect x="${g.L + start}" y="${ly.y0}" width="${i - start}" height="${Math.max(0.5, ly.y1 - ly.y0)}" fill="${cur}" stroke="${cur}" stroke-width="0.3"/>`; start = i; cur = c; }
    }
    s += `<rect x="${g.L}" y="${ly.y0}" width="${g.R - g.L}" height="${Math.max(0.5, ly.y1 - ly.y0)}" fill="none" stroke="${sameL(sel.li, li) ? 'var(--accent)' : '#00000044'}" stroke-width="${sameL(sel.li, li) ? 1.4 : 0.5}"/>`;
    if (ly.y1 - ly.y0 >= 11) s += `<text x="${g.R - 4}" y="${(ly.y0 + ly.y1) / 2 + 4}" text-anchor="end" fill="#111" font-weight="700" stroke="#ffffff" stroke-width="3" paint-order="stroke">${U.esc((Lr.name || '') + '  ' + UI().f1(Lr.nm, 0) + ' nm')}</text>`;
  });
  for (let k = 0; k <= g.N; k++) s += `<line x1="${X(k * d.px)}" y1="${g.top - g.amb}" x2="${X(k * d.px)}" y2="${g.top + g.Hs + g.sub}" stroke="#00000055" stroke-dasharray="3 3" stroke-width="0.8"/>`;
  s += `<text x="${g.R}" y="${g.h - 6}" text-anchor="end" fill="#666">cut at y = ${UI().f1(y, 0)} nm · ${g.vex > 1.05 || g.vex < 0.95 ? 'heights ×' + UI().f1(g.vex, g.vex < 2 ? 1 : 0) : 'true proportions'} · click a layer to edit it in the top view</text>`;
  host.innerHTML = s + '</svg>';
  const svg = host.querySelector('svg');
  svg.onclick = e => { const b = svg.getBoundingClientRect(), py = (e.clientY - b.top) * w / b.width, li = g.lay.findIndex(l => py >= l.y0 && py <= l.y1); if (li >= 0 && !sameL(li, sel.li)) { sel = { li: canon(li), si: 0 }; markSel(); drawTop(); drawSide(); } };
}

/* ---------- files ---------- */
function saveFile() { U.download(new Blob([JSON.stringify({ rnbeamx: 'pattern', version: 1, design: d }, null, 1)], { type: 'application/json' }), U.slug(d.name || 'unit-cell') + '.rnbxpattern.json'); }
function openFile() {
  RNBX.project.pickFile('.json,application/json', f => f.text().then(t => {
    const j = JSON.parse(t), v = j.design || j;
    if (!v || !Array.isArray(v.layers) || !v.period) throw new Error('This is not a Pattern design');
    PS.setDesign(Object.assign(PRESETS[0].make(), v));
  }).catch(e => RNBX.toast(e.message || String(e), 'error')));
}
function csv() {
  const rows = ['# ' + (d.name || 'Unit cell') + ' — Layer Studio ▸ Pattern (RNBeamX), RCWA ' + (is2() ? `2D, ±${d.mx} × ±${d.my} orders, cell ${d.px} × ${d.py} nm` : `with ±${d.orders} orders, period ${d.period} nm`)];
  if (specRes) rows.push('# Spectrum (' + (specRes.calc.pol === 'avg' ? 'unpolarised' : specRes.calc.pol) + ')', [specRes.wl ? 'Wavelength (nm)' : 'Angle (deg)', 'R', 'T', 'A'].join(','), ...specRes.x.map((x, i) => [U.round(x, 4), specRes.R[i].toPrecision(6), specRes.T[i].toPrecision(6), specRes.A[i].toPrecision(6)].join(',')), '');
  const r = (fieldRes && fieldRes.orders) || PS.orders(), p = d.probe, two = is2();
  rows.push(`# Diffraction orders at ${p.nm} nm, ${p.angle} deg, ${p.pol}` + (two ? `, phi ${d.phi || 0} deg` : ''), two ? 'm,n,R efficiency,R theta (deg),R phi (deg),T efficiency,T theta (deg),T phi (deg)' : 'Order,R efficiency,R angle (deg),T efficiency,T angle (deg)');
  const k = q => (two ? q.m + ',' + q.n : String(q.m)), all = new Map();
  r.Rn.forEach(q => all.set(k(q), Object.assign(all.get(k(q)) || { q }, { R: q.eff }))); r.Tn.forEach(q => all.set(k(q), Object.assign(all.get(k(q)) || { q }, { T: q.eff })));
  [...all.values()].sort((a, b) => a.q.m - b.q.m || (a.q.n || 0) - (b.q.n || 0)).forEach(o => {
    if (two) { const aR = o.R != null ? angle2(o.q.m, o.q.n, incN()) : null, aT = o.T != null ? angle2(o.q.m, o.q.n, outN()) : null;
      rows.push([o.q.m, o.q.n, o.R != null ? o.R.toPrecision(5) : '', aR ? aR.th.toFixed(2) : '', aR ? aR.ph.toFixed(1) : '', o.T != null ? o.T.toPrecision(5) : '', aT ? aT.th.toFixed(2) : '', aT ? aT.ph.toFixed(1) : ''].join(',')); }
    else { const aR = o.R != null ? angleOf(o.q.m, incN()) : null, aT = o.T != null ? angleOf(o.q.m, outN()) : null;
      rows.push([o.q.m, o.R != null ? o.R.toPrecision(5) : '', aR == null ? '' : aR.toFixed(2), o.T != null ? o.T.toPrecision(5) : '', aT == null ? '' : aT.toFixed(2)].join(',')); }
  });
  U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(d.name || 'unit-cell') + '_pattern.csv');
}

/* ---------- into the figure ---------- */
PS.toProps = () => ({ pattern: U.deepClone(d), calc: Object.assign({}, d.calc, { method: 'auto', orders: d.orders, slices: d.slices, rpoints: d.calc.points, unit: 'nm', show: d.calc.show }, is2() ? { phi: d.phi || 0 } : {}) });
PS.insert = (opt = {}) => {
  const doc = S.doc, W = doc.page.width, H = doc.page.height, props = PS.toProps();
  RNBX.history.checkpoint();
  let obj;
  UI().quiet(() => {
    if (target && !opt.asNew && doc.objects.includes(target)) { obj = target; Object.assign(obj.props, props); }
    else {
      const boxes = doc.objects.filter(o => RNBX.lib.get(o.type) && !RNBX.lib.get(o.type).connection && o.type !== 'panel').map(o => RNBX.lib.worldBox(o));
      let x = W / 2, y = H / 2 + 8;
      if (boxes.length) {
        const right = Math.max(...boxes.map(q => q[2])), bottom = Math.max(...boxes.map(q => q[3]));
        if (W - right > 70) { x = right + (W - right) / 2 - 8; y = H / 2 + 10; } else { doc.page.height = Math.max(H, bottom + 60); doc.page.preset = 'custom'; x = W / 2 - 10; y = bottom + 48; }
      }
      obj = RNBX.createObject('ucell', x, y);
      Object.assign(obj.props, props);
      doc.objects.push(obj);
    }
    if (opt.periods) obj.props.periods = opt.periods;
    if (opt.labels != null) obj.props.labels = !!opt.labels;
    if (opt.panel && !doc.objects.some(o => o.type === 'plot' && o.props.link === obj.id)) RNBX.plotData.addCalcPanel(obj);
    if (opt.map && mapRes) {
      const w = 420, h = 260, svg = UI().mapChart(mapRes, w, h, null).svg.replace(/var\(--panel\)/g, '#ffffff').replace(/currentColor/g, '#111111');
      const pl = RNBX.arrange.addDataPanel(), im = RNBX.createObject('image', pl.x, pl.y);
      Object.assign(im.props, { href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), w: pl.props.w, h: pl.props.w * h / w, aspect: w / h });
      doc.objects.splice(doc.objects.indexOf(pl), 1, im);
    }
  });
  RNBX.select([obj.id]); RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build();
  U.track('pattern-insert');
  return obj;
};
function insertDialog() {
  const o = { periods: target ? target.props.periods : 5, panel: !target, map: false, labels: false };
  const box = (k, label, hint) => { const i = el('input', { type: 'checkbox', checked: o[k], onchange: () => { o[k] = i.checked; } }); return el('label', { class: 'field row' }, i, el('span', { text: label }), hint ? el('span', { class: 'hint', style: { margin: '0 0 0 6px' }, text: hint }) : null); };
  const per = el('input', { type: 'number', min: 1, max: 40, value: o.periods, oninput: () => { o.periods = U.clamp(Math.round(+per.value) || 5, 1, 40); } });
  const body = el('div', {}, el('label', { class: 'field' }, el('span', { text: 'Periods drawn in the figure' }), per),
    box('labels', 'Layer names on the front'), box('panel', 'Linked R, T, A panel', 'calculated with RCWA'), box('map', 'Wavelength × angle map', mapRes ? '' : '(calculate the map first)'),
    el('div', { class: 'hint', text: 'The part keeps the whole unit cell in real units: select it and press “Open in Layer Studio” to change it. Ctrl+Z in the figure undoes the insert.' }));
  const foot = [];
  if (target) foot.push(el('button', { class: 'btn', type: 'button', text: 'Insert as a new structure', onclick: () => { m.close(); PS.insert(Object.assign({}, o, { asNew: true })); ST().close(); RNBX.toast('Structure inserted'); } }));
  foot.push(el('button', { class: 'btn primary', type: 'button', text: target ? 'Update the structure' : 'Insert', onclick: () => { m.close(); PS.insert(o); ST().close(); RNBX.toast(target ? 'Structure updated' : 'Structure inserted: drag it where you want it'); } }));
  const m = D.modal({ title: target ? 'Update the structure in the figure' : 'Insert into the figure', sub: d.name || '', body, foot });
}
})();
