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
];
PS.PRESETS = PRESETS;

/* ---------- state ---------- */
let d = null, target = null, root = null, undo = [], redo = [], lastKey = '', lastAt = 0, sel = { li: 0, si: 0 };
let specRes = null, specJob = null, specProg = null, specT = 0, mapRes = null, mapJob = null, mapProg = null, mapStale = true, views = {};
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
PS.setDesign = v => { step(); d = v; sel = { li: 0, si: 0 }; mapRes = null; mapStale = true; specRes = null; save(); if (root) PS.render(root); };
PS.closed = () => { if (specJob) specJob.cancel(); if (mapJob) mapJob.cancel(); specJob = mapJob = null; root = null; };
const step = key => {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastAt < 900)) { undo.push(JSON.stringify(d)); if (undo.length > 120) undo.shift(); redo = []; }
  lastKey = key || ''; lastAt = now;
};
PS.undo = () => { if (!undo.length) return; redo.push(JSON.stringify(d)); d = JSON.parse(undo.pop()); lastKey = ''; save(); geomChanged(); PS.render(root); };
PS.redo = () => { if (!redo.length) return; undo.push(JSON.stringify(d)); d = JSON.parse(redo.pop()); lastKey = ''; save(); geomChanged(); PS.render(root); };
const geomChanged = () => { mapStale = true; };
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
  const presetBtn = el('button', { class: 'btn small', type: 'button', text: 'Start from ▾', onclick: ev => { const r = ev.currentTarget.getBoundingClientRect(); D.menu([{ title: 'Periodic structures' }].concat(PRESETS.map(p => ({ label: p.name, action: () => PS.setDesign(p.make()) }))), r.left, r.bottom + 4, ev.currentTarget); } });
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
  views = { list: el('div', { class: 'st-list' }), cross: el('div', { class: 'st-cross' }), orders: el('div', { class: 'st-orders' }), spec: el('div', { class: 'st-spec' }), map: el('div', { class: 'st-map' }) };
  const left = el('section', { class: 'st-col st-left' }, el('h4', { text: 'Unit cell' }), cellControls(), views.list,
    el('div', { class: 'hint', text: 'Top of the list = top of the structure. Each layer is a film of its own material with shapes in it; later shapes cover earlier ones. Drag a shape in the cross-section to move it, its round handles to change the widths, the square one to slant it, the triangle to change the layer height.' }));
  const mid = el('section', { class: 'st-col st-mid' }, el('h4', { text: 'Cross-section' }), crossControls(), views.cross, el('h4', { text: 'Diffraction orders' }), probeControls(), views.orders);
  const right = el('section', { class: 'st-col st-right' }, el('h4', { text: 'Optical response (RCWA)' }), specControls(), views.spec, el('h4', { text: 'Wavelength × angle map' }), mapControls(), views.map);
  root.append(el('div', { class: 'st-body' }, left, mid, right));
  buildList();
  refresh();
};

function cellControls() {
  const k = [fld('Period Λ (nm)', num(() => d.period, v => { d.period = v; }, { min: 10, max: 1e5, key: 'per' })),
    fld('Light arrives from', sel1([['top', 'Above'], ['bottom', 'Below (through the substrate)']], () => d.side, v => { d.side = v; }, 'side', 'all')),
    fld('Medium above', sel1(TF().options(false), () => d.ambient, v => { d.ambient = v; }, 'amb', 'all'))];
  if (d.ambient === 'custom') k.push(fld('Its index n', num(() => d.ambientN, v => { d.ambientN = v; }, { step: 0.001, min: 1, key: 'ambn' })));
  k.push(fld('Orders ±N', sel1([5, 10, 15, 20, 30, 40].map(v => [String(v), String(v)]), () => d.orders, v => { d.orders = +v; }, 'ord')),
    fld('Profile slices', num(() => d.slices, v => { d.slices = Math.round(v); }, { min: 2, max: 60, key: 'sli', title: 'Sloped and curved profiles are cut into this many flat slices' })));
  return el('div', { class: 'st-grid' }, ...k);
}

/* ---------- the layer list ---------- */
const moveIn = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; arr.splice(j, 0, arr.splice(i, 1)[0]); };
function shapeCard(L, li, sh, si) {
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
const nkRow = (o, k) => el('div', { class: 'st-row2' }, el('span', { text: 'n' }), num(() => o.n == null ? 1.5 : o.n, v => { o.n = v; }, { step: 0.001, key: k + 'n' }), el('span', { text: 'k' }), num(() => o.k || 0, v => { o.k = Math.max(0, v); }, { step: 0.001, min: 0, key: k + 'kk' }));
const markSel = () => { if (!views.list) return; views.list.querySelectorAll('.st-shape').forEach(c => c.classList.toggle('sel', +c.dataset.li === sel.li && +c.dataset.si === sel.si)); };
function buildList() {
  const host = views.list; if (!host) return; host.innerHTML = '';
  host.append(el('div', { class: 'st-cap', text: 'Medium above: ' + TF().name(d.ambient) }));
  d.layers.forEach((L, li) => {
    const k = 'L' + li + '-';
    const c = el('input', { type: 'color', value: (L.color || '#ffffff').slice(0, 7), title: 'Colour of the film', oninput: () => change(() => { L.color = c.value; }, k + 'c') });
    const nmI = el('input', { type: 'text', value: L.name || '', title: 'Name', oninput: () => change(() => { L.name = nmI.value; }, k + 'n') });
    const mat = matSel(() => L.mat, v => { if (L.name === nm(L.mat) || L.name === 'Air' || !L.name) L.name = v === 'air' ? 'Air' : nm(v); if ((L.color || '').toLowerCase() === (L.mat === 'air' ? '#ffffff' : col(L.mat))) L.color = v === 'air' ? '#ffffff' : col(v); L.mat = v; }, k + 'm');
    mat.title = 'Material of the film around the shapes';
    const box = el('div', { class: 'st-group st-player' },
      el('div', { class: 'st-row' }, c, nmI, mat),
      el('div', { class: 'st-row2' }, num(() => L.nm, v => { L.nm = Math.max(0, v); }, { min: 0, key: k + 't', title: 'Height of the layer (nm)' }), el('span', { class: 'hint', style: { margin: 0 }, text: 'nm' }), el('span', { class: 'st-grow' }),
        el('button', { class: 'btn small ghost', type: 'button', text: '+ ridge', title: 'Add a ridge (rectangle, trapezoid or slanted)', onclick: () => change(() => { L.shapes.push(ridge(L.mat === 'TiO2' ? 'SiO2' : 'TiO2', d.period / 2, d.period / 2)); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') }),
        el('button', { class: 'btn small ghost', type: 'button', text: '+ sine', onclick: () => change(() => { L.shapes.push({ kind: 'sine', x: d.period / 2, mat: 'Au', name: 'Au', color: col('Au') }); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') }),
        el('button', { class: 'btn small ghost', type: 'button', text: '+ saw', onclick: () => change(() => { L.shapes.push({ kind: 'saw', x: 0, dir: 1, mat: 'Al', name: 'Al', color: col('Al') }); sel = { li, si: L.shapes.length - 1 }; }, null, 'list') }),
        D.iconBtn('up', 'Move up', () => change(() => moveIn(d.layers, li, -1), null, 'list')),
        D.iconBtn('down', 'Move down', () => change(() => moveIn(d.layers, li, 1), null, 'list')),
        el('button', { class: 'icon-btn', type: 'button', text: '⧉', title: 'Duplicate the layer', onclick: () => change(() => d.layers.splice(li + 1, 0, U.deepClone(L)), null, 'list') }),
        D.iconBtn('trash', 'Remove the layer', () => change(() => { d.layers.splice(li, 1); sel = { li: 0, si: 0 }; }, null, 'list'))));
    if (L.mat === 'custom') box.append(nkRow(L, k));
    (L.shapes || []).forEach((sh, si) => box.append(shapeCard(L, li, sh, si)));
    if (!(L.shapes || []).length) box.append(el('div', { class: 'hint', style: { margin: '4px 2px' }, text: 'A flat film (no shapes).' }));
    host.append(box);
  });
  host.append(el('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', margin: '6px 0' } },
    el('button', { class: 'btn small primary', type: 'button', text: '+ Patterned layer on top', onclick: () => change(() => { d.layers.unshift(film('air', 100, [ridge('TiO2', d.period / 2, d.period / 2)])); sel = { li: 0, si: 0 }; }, null, 'list') }),
    el('button', { class: 'btn small', type: 'button', text: '+ Film at the bottom', onclick: () => change(() => d.layers.push(film('SiO2', 100)), null, 'list') })));
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
PS.geo = (dd = d) => RC().fromPattern(dd, { orders: dd.orders, slices: dd.slices });
const incN = () => TF().nk(d.side === 'bottom' ? d.substrate : { mat: d.ambient, n: d.ambientN }, d.probe.nm).n;
const outN = () => TF().nk(d.side === 'bottom' ? { mat: d.ambient, n: d.ambientN } : d.substrate, d.probe.nm).n;
/* orders labelled the textbook way: n sin θₘ = n₁ sin θ + m λ / Λ (the solver counts them the other way round) */
PS.orders = (dd = d) => { const g = PS.geo(dd), p = dd.probe, r = RC().core.solve(RC().problemAt(g, p.nm), p.nm, p.angle, p.pol), f = q => ({ m: q.m === 0 ? 0 : -q.m, eff: q.eff }); return Object.assign({}, r, { Rn: r.Rn.map(f), Tn: r.Tn.map(f) }); };
const angleOf = (m, n) => RC().orderAngle(incN(), d.probe.angle, -m, d.probe.nm, d.period, n);
let refreshT = 0;
function refresh(viewOnly) {
  if (!root) return;
  clearTimeout(refreshT);
  refreshT = setTimeout(() => { drawCross(); drawOrders(); scheduleSpec(); drawMap(); }, viewOnly ? 10 : 30);
}
function scheduleSpec() {
  clearTimeout(specT);
  if (specJob) { specJob.cancel(); specJob = null; }
  specProg = 0; drawSpec();
  specT = setTimeout(() => {
    const c = d.calc, wl = c.scan === 'wl', N = U.clamp(Math.round(c.points) || 101, 3, 801), lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax, pts = [];
    for (let i = 0; i < N; i++) { const v = lo + (hi - lo) * i / (N - 1); pts.push({ lam: wl ? v : +c.lambda, th: wl ? +c.angle || 0 : Math.min(89.9, v), x: v }); }
    const key = JSON.stringify([PS.geo(), c]);
    const job = specJob = RC().batch(PS.geo(), pts, c.pol, p => { specProg = p; drawSpec(); });
    job.promise.then(vals => { if (specJob !== job) return; specJob = null; specProg = null; specRes = { key, x: pts.map(q => q.x), R: vals.map(v => v[0]), T: vals.map(v => v[1]), A: vals.map(v => Math.max(0, 1 - v[0] - v[1])), wl, calc: Object.assign({}, c) }; drawSpec(); });
  }, 250);
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
    `<br><span class="hint" style="margin:0">±${d.orders} orders, ${c.pol === 'avg' ? 'unpolarised' : c.pol + '-polarised'}. Click the curve to see the orders there.</span>` }));
  const svg = host.querySelector('svg'); svg.style.cursor = 'crosshair';
  svg.onclick = e => { const b = svg.getBoundingClientRect(), v = ch.inv((e.clientX - b.left) * w / b.width); viewChange(() => { if (r.wl) { d.probe.nm = U.round(v, 1); d.probe.angle = +r.calc.angle || 0; } else { d.probe.angle = U.round(U.clamp(v, -89, 89), 2); d.probe.nm = +r.calc.lambda; } if (r.calc.pol !== 'avg') d.probe.pol = r.calc.pol; }); };
}
function convergence(ev) {
  const btn = ev.currentTarget, c = d.calc, wl = c.scan === 'wl', lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax;
  btn.disabled = true; btn.textContent = 'Checking…';
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
  let r;
  try { r = PS.orders(); } catch (e) { host.textContent = 'Calculation failed: ' + e.message; return; }
  const p = d.probe, nI = incN(), nO = outN(), w = Math.max(280, host.clientWidth || 420), h = 190;
  const all = [...new Set(r.Rn.map(q => q.m).concat(r.Tn.map(q => q.m)))].sort((a, b) => a - b);
  const R = new Map(r.Rn.map(q => [q.m, q.eff])), T = new Map(r.Tn.map(q => [q.m, q.eff]));
  const L = 40, Rr = w - 10, mid = h / 2, bw = Math.min(26, (Rr - L) / Math.max(1, all.length) / 2.6), hh = mid - 26;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
  s += `<line x1="${L}" y1="${mid}" x2="${Rr}" y2="${mid}" stroke="currentColor" stroke-width="0.8"/><text x="6" y="${mid - hh / 2}" fill="currentColor">R</text><text x="6" y="${mid + hh / 2 + 4}" fill="currentColor">T</text>`;
  all.forEach((m, i) => {
    const cx = L + (i + 0.5) * (Rr - L) / all.length, er = R.get(m) || 0, et = T.get(m) || 0;
    s += `<rect x="${cx - bw / 2}" y="${mid - er * hh}" width="${bw}" height="${er * hh}" fill="#1f77b4"/><rect x="${cx - bw / 2}" y="${mid}" width="${bw}" height="${et * hh}" fill="#2ca02c"/>`;
    if (er > 0.005) s += `<text x="${cx}" y="${mid - er * hh - 3}" text-anchor="middle" fill="currentColor">${UI().f1(er * 100)}</text>`;
    if (et > 0.005) s += `<text x="${cx}" y="${mid + et * hh + 11}" text-anchor="middle" fill="currentColor">${UI().f1(et * 100)}</text>`;
    s += `<text x="${cx}" y="${h - 4}" text-anchor="middle" fill="currentColor" font-weight="700">${m > 0 ? '+' + m : m}</text>`;
  });
  s += `<text x="${Rr}" y="12" text-anchor="end" fill="currentColor">efficiency in %, order m below</text>`;
  host.innerHTML = s + '</svg>';
  const rows = all.map(m => {
    const aR = R.has(m) ? angleOf(m, nI) : null, aT = T.has(m) ? angleOf(m, nO) : null;
    return `<tr><td><b>${m > 0 ? '+' + m : m}</b></td><td>${R.has(m) ? UI().f1(R.get(m) * 100, 2) + ' %' : '–'}</td><td>${aR == null ? '–' : UI().f1(aR, 1) + '°'}</td><td>${T.has(m) ? UI().f1(T.get(m) * 100, 2) + ' %' : '–'}</td><td>${aT == null ? '–' : UI().f1(aT, 1) + '°'}</td></tr>`;
  }).join('');
  host.append(el('div', { class: 'readout', html: `At ${UI().f1(p.nm, 1)} nm, ${UI().f1(p.angle, 1)}°, ${p.pol}: R ${UI().f1(r.R * 100)} %, T ${UI().f1(r.T * 100)} %, A ${UI().f1(Math.max(0, r.A) * 100)} %.` +
    `<table class="st-tab"><tr><th>m</th><th>R</th><th>angle</th><th>T</th><th>angle</th></tr>${rows}</table><span class="hint" style="margin:0">Grating equation: n sin θₘ = n₁ sin θ + m λ / Λ. Angles from the surface normal.</span>` }));
}

/* map in the background, on request */
function runMap() {
  if (mapJob) mapJob.cancel();
  const m = d.map, [nl, na] = m.res === 'high' ? [120, 60] : [60, 30];
  const lmin = Math.min(m.lmin, m.lmax - 1), lmax = Math.max(m.lmax, m.lmin + 1), amin = U.clamp(Math.min(m.amin, m.amax - 0.5), 0, 89), amax = U.clamp(Math.max(m.amax, m.amin + 0.5), 0.5, 89.9);
  const pts = [];
  for (let j = 0; j < na; j++) for (let i = 0; i < nl; i++) pts.push({ lam: lmin + (lmax - lmin) * i / (nl - 1), th: amin + (amax - amin) * j / (na - 1) });
  mapProg = 0; drawMap();
  const job = mapJob = RC().batch(PS.geo(), pts, m.pol, p => { mapProg = p; drawMap(); });
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
  const N = d.view.periods || 3, P = d.period, tot = d.layers.reduce((a, L) => a + (+L.nm || 0), 0) || 1;
  const L = 12, R = w - 12, sx = (R - L) / (N * P);
  let vex = +d.view.vex || 0;
  if (!vex) vex = Math.max(1, Math.min(20, Math.ceil(110 / (tot * sx))));
  let sz = sx * vex;
  if (tot * sz > 340) sz = 340 / tot;
  const amb = 30, sub = 40, top = 10 + amb, Hs = tot * sz, h = Math.round(top + Hs + sub + 26);
  let y = top; const lay = d.layers.map(Lr => { const r = { y0: y, y1: y + (+Lr.nm || 0) * sz }; y = r.y1; return r; });
  return { N, P, L, R, sx, sz, vex: sz / sx, top, Hs, h, lay, sub, amb };
}
function drawCross() {
  const host = views.cross; if (!host) return;
  const w = Math.max(300, host.clientWidth || 460), g = layout(w), X = x => g.L + x * g.sx, flip = d.side === 'bottom';
  const ink = '#111', ambCol = d.ambient === 'air' ? '#f7f9fc' : UI().colorOf(d.ambient);
  let s = `<svg viewBox="0 0 ${w} ${g.h}" width="${w}" height="${g.h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart ps-cross">`;
  s += `<rect x="${g.L}" y="${g.top - g.amb}" width="${g.R - g.L}" height="${g.amb}" fill="${ambCol}" fill-opacity="0.6"/>`;
  s += `<rect x="${g.L}" y="${g.top + g.Hs}" width="${g.R - g.L}" height="${g.sub}" fill="${d.substrate.color || '#cfe6f2'}" fill-opacity="${d.substrate.mat === 'air' ? 0.3 : 0.75}" stroke="#00000033" stroke-width="0.5"/>`;
  s += `<text x="${g.L + 4}" y="${g.top - g.amb + 13}" fill="#333">${U.esc(TF().name(d.ambient))}</text><text x="${g.L + 4}" y="${g.top + g.Hs + 15}" fill="#333">${U.esc(d.substrate.name || TF().name(d.substrate.mat))}</text>`;
  const polys = [];
  d.layers.forEach((Lr, li) => {
    const ly = g.lay[li], hpx = ly.y1 - ly.y0;
    s += `<rect x="${g.L}" y="${ly.y0}" width="${g.R - g.L}" height="${Math.max(0.5, hpx)}" fill="${Lr.mat === 'air' ? ambCol : (Lr.color || UI().colorOf(Lr.mat))}" fill-opacity="${Lr.mat === 'air' ? 0.6 : 1}" stroke="#00000033" stroke-width="0.5"/>`;
    RC().pattern.copies(Lr, li, g.P, g.N).forEach(cp => {
      const pts = cp.pts.map(q => [X(q[0]), ly.y1 - q[1] * g.sz]), isSel = sel.li === li && sel.si === cp.si;
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
  const L = d.layers[sel.li]; if (!L) return [];
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
    if (hit) { sel = { li: hit.li, si: hit.si }; mode = 'move'; }
    else { const li = gc.g.lay.findIndex(l => py >= l.y0 && py <= l.y1); if (li >= 0) { sel = { li, si: -1 }; } markSel(); drawCross(); return; }
  }
  e.preventDefault();
  markSel();
  const L = d.layers[sel.li], sh = (L.shapes || [])[sel.si], g = gc.g;
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
    save(); geomChanged(); drawCross(); drawOrders(); scheduleSpec();
  };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); buildList(); drawMap(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
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
  const rows = ['# ' + (d.name || 'Unit cell') + ' — Layer Studio ▸ Pattern (RNBeamX), RCWA with ±' + d.orders + ' orders, period ' + d.period + ' nm'];
  if (specRes) rows.push('# Spectrum (' + (specRes.calc.pol === 'avg' ? 'unpolarised' : specRes.calc.pol) + ')', [specRes.wl ? 'Wavelength (nm)' : 'Angle (deg)', 'R', 'T', 'A'].join(','), ...specRes.x.map((x, i) => [U.round(x, 4), specRes.R[i].toPrecision(6), specRes.T[i].toPrecision(6), specRes.A[i].toPrecision(6)].join(',')), '');
  const r = PS.orders(), p = d.probe;
  rows.push(`# Diffraction orders at ${p.nm} nm, ${p.angle} deg, ${p.pol}`, 'Order,R efficiency,R angle (deg),T efficiency,T angle (deg)');
  const ms = [...new Set(r.Rn.map(q => q.m).concat(r.Tn.map(q => q.m)))].sort((a, b) => a - b);
  ms.forEach(m => { const a = r.Rn.find(q => q.m === m), b = r.Tn.find(q => q.m === m), aR = a ? angleOf(m, incN()) : null, aT = b ? angleOf(m, outN()) : null;
    rows.push([m, a ? a.eff.toPrecision(5) : '', aR == null ? '' : aR.toFixed(2), b ? b.eff.toPrecision(5) : '', aT == null ? '' : aT.toFixed(2)].join(',')); });
  U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(d.name || 'unit-cell') + '_pattern.csv');
}

/* ---------- into the figure ---------- */
PS.toProps = () => ({ pattern: U.deepClone(d), calc: Object.assign({}, d.calc, { method: 'auto', orders: d.orders, slices: d.slices, rpoints: d.calc.points, unit: 'nm', show: d.calc.show }) });
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
