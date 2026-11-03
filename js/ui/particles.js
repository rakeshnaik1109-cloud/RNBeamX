/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/particles.js
   Layer Studio ▸ Particles: nanoparticles and SERS hot spots.

   A design is one particle or a dimer of two identical particles
   on the z axis (gap g), each a core with any number of shells,
   in a host medium. Calculated exactly (engine/mie.js: Mie theory,
   and multi-sphere Mie theory for the dimer):
   • extinction, scattering and absorption against wavelength;
   • the near field |E|² around the particles at one wavelength;
   • the hot-spot field |E|² (gap centre, or 0.5 nm from the
     particle surface on the polarisation axis) and the SERS
     enhancement |E(λ)|²·|E(λ_Raman)|² for a Raman shift;
   • for a dimer, the hot-spot field against the gap size.
   Light travels along x; polarisation along the dimer axis (z,
   the hot-spot polarisation) or across it (y).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el;
const PT = RNBX.particleStudio = {};
const KEY = 'rnbx-particles-v1';
const ST = () => RNBX.studio, UI = () => RNBX.studio.ui, TF = () => RNBX.thinfilm, MIE = () => RNBX.mie, BEM = () => RNBX.bem;

/* ---------- designs ---------- */
const shell = (mat, t) => ({ mat, t });
const design = (name, o) => Object.assign({
  name, kind: 'single', core: { mat: 'Au', d: 40 }, shells: [], medium: 'H2O', mediumN: 1.33, gap: 2, pol: 'z', orders: 0, rod: { L: 40, D: 10 }, orient: 'random',
  calc: { lmin: 400, lmax: 900, points: 51, show: 'C' }, probe: { nm: 633, shift: 1000 }, view: { span: 0, log: true, res: 'medium' }, sweep: { gmin: 0.5, gmax: 20 },
}, o || {});
const PRESETS = [
  { id: 'au40', name: 'Au nanosphere, 40 nm, in water', make: () => design('Au nanosphere 40 nm', { probe: { nm: 530, shift: 1000 } }) },
  { id: 'ag60', name: 'Ag nanosphere, 60 nm, in water', make: () => design('Ag nanosphere 60 nm', { core: { mat: 'Ag', d: 60 }, calc: { lmin: 300, lmax: 800, points: 51, show: 'C' }, probe: { nm: 420, shift: 1000 } }) },
  { id: 'shell', name: 'Au nanoshell (SiO₂ core 120 nm, Au 15 nm)', make: () => design('Au nanoshell', { core: { mat: 'SiO2', d: 120 }, shells: [shell('Au', 15)], calc: { lmin: 500, lmax: 1200, points: 51, show: 'C' }, probe: { nm: 785, shift: 1000 } }) },
  { id: 'auag', name: 'Au@Ag core–shell (30 nm Au, 8 nm Ag)', make: () => design('Au@Ag core–shell', { core: { mat: 'Au', d: 30 }, shells: [shell('Ag', 8)], calc: { lmin: 300, lmax: 800, points: 51, show: 'C' }, probe: { nm: 450, shift: 1000 } }) },
  { id: 'shin', name: 'Shell-isolated Au@SiO₂ (SHINERS, 55 nm + 2 nm)', make: () => design('Au@SiO₂ (SHINERS)', { core: { mat: 'Au', d: 55 }, shells: [shell('SiO2', 2)], probe: { nm: 633, shift: 1000 } }) },
  { id: 'dimer', name: 'Au dimer, 40 nm, 2 nm gap (SERS hot spot)', make: () => design('Au dimer, 2 nm gap', { kind: 'dimer', gap: 2, probe: { nm: 633, shift: 1000 } }) },
  { id: 'agdimer', name: 'Ag dimer, 60 nm, 1 nm gap', make: () => design('Ag dimer, 1 nm gap', { kind: 'dimer', core: { mat: 'Ag', d: 60 }, gap: 1, calc: { lmin: 350, lmax: 900, points: 41, show: 'C' }, probe: { nm: 532, shift: 1000 } }) },
  { id: 'rod4', name: 'Au nanorod 40 × 10 nm (aspect ratio 4)', make: () => design('Au nanorod 40 × 10 nm', { kind: 'rod', rod: { L: 40, D: 10 }, calc: { lmin: 400, lmax: 1100, points: 141, show: 'C' }, probe: { nm: 785, shift: 1000 } }) },
  { id: 'rod2', name: 'Au nanorod 50 × 25 nm (aspect ratio 2)', make: () => design('Au nanorod 50 × 25 nm', { kind: 'rod', rod: { L: 50, D: 25 }, calc: { lmin: 400, lmax: 900, points: 101, show: 'C' }, probe: { nm: 633, shift: 1000 } }) },
  { id: 'rod3', name: 'Au nanorod 75 × 25 nm, aligned (aspect ratio 3)', make: () => design('Au nanorod 75 × 25 nm', { kind: 'rod', rod: { L: 75, D: 25 }, orient: 'long', calc: { lmin: 400, lmax: 1000, points: 121, show: 'C' }, probe: { nm: 700, shift: 1000 } }) },
  { id: 'rodtip', name: 'Au nanorod dimer, end to end, 2 nm gap', make: () => design('Au rods end to end, 2 nm gap', { kind: 'rod', rod: { L: 40, D: 10, ends: 'round', pair: 'tip', gap: 2 }, orient: 'long', calc: { lmin: 500, lmax: 1200, points: 71, show: 'C' }, probe: { nm: 900, shift: 1000 } }) },
  { id: 'rodside', name: 'Au nanorods side by side, 5 nm gap', make: () => design('Au rods side by side, 5 nm gap', { kind: 'rod', rod: { L: 40, D: 10, ends: 'round', pair: 'side', gap: 5 }, orient: 'long', calc: { lmin: 500, lmax: 1100, points: 121, show: 'C' }, probe: { nm: 785, shift: 1000 } }) },
  { id: 'agrod', name: 'Ag nanorod 60 × 20 nm', make: () => design('Ag nanorod 60 × 20 nm', { kind: 'rod', core: { mat: 'Ag', d: 20 }, rod: { L: 60, D: 20 }, calc: { lmin: 300, lmax: 900, points: 121, show: 'C' }, probe: { nm: 633, shift: 1000 } }) },
  { id: 'audimer80', name: 'Au dimer, 80 nm, 5 nm gap (785 nm excitation)', make: () => design('Au dimer 80 nm', { kind: 'dimer', core: { mat: 'Au', d: 80 }, gap: 5, calc: { lmin: 450, lmax: 1000, points: 41, show: 'C' }, probe: { nm: 785, shift: 1000 } }) },
];
PT.PRESETS = PRESETS;

/* ---------- the physics model of a design ---------- */
const nkOf = (m, lam) => { const q = TF().nk(m, lam); return [q.n, q.k]; };
const medN = (dd, lam) => (dd.medium === 'custom' ? +dd.mediumN || 1.33 : TF().nk({ mat: dd.medium }, lam).n);
const outerR = dd => (dd.kind === 'rod' ? Math.cbrt(rodOf(dd).a * rodOf(dd).b * rodOf(dd).b) : dd.core.d / 2 + dd.shells.reduce((a, s) => a + (+s.t || 0), 0));   // rods: the equal-volume radius
PT.parts = (dd, lam) => {
  let r = dd.core.d / 2; const layers = [{ r, n: nkOf(dd.core, lam) }];
  dd.shells.forEach(s => { r += +s.t || 0; if (+s.t > 0) layers.push({ r, n: nkOf(s, lam) }); });
  if (dd.kind !== 'dimer') return [{ z: 0, layers }];
  const c = r + Math.max(0.05, +dd.gap || 0) / 2;
  return [{ z: -c, layers }, { z: c, layers }];
};
/* nanorods (prolate spheroid model): cross-sections for the orientation and the tip (or side) field 0.5 nm out */
const rodOf = dd => { const rd = dd.rod || { L: 40, D: 10 }, L = Math.max(+rd.L || 1, +rd.D || 1); return { a: L / 2, b: (+rd.D || 1) / 2 }; };
const epsOf = (m, lam) => { const q = TF().nk(m, lam); return [q.n * q.n - q.k * q.k, 2 * q.n * q.k]; };
/* rods: one, two end to end (tip to tip) or two side by side; ends rounded (hemispherical) or spheroidal */
const rodOpt = dd => { const rd = dd.rod || {}; return { ends: rd.ends || 'round', pair: rd.pair || 'one', gap: Math.max(0.1, +rd.gap || 2) }; };
const geoCache = new Map();
/* boundary-element geometry of the rod(s) along z (cached) */
PT.rodGeom = (dd, gapOv) => {
  const { a, b } = rodOf(dd), o = rodOpt(dd), g = gapOv != null ? gapOv : o.gap, key = JSON.stringify([a, b, o.ends, o.pair, o.pair === 'tip' ? g : 0]);
  let G = geoCache.get(key); if (G) return G;
  const mk = z0 => (o.ends === 'round' ? BEM().capsule(2 * a, b, z0) : BEM().spheroid(a, b, z0));
  G = BEM().build(o.pair === 'tip' ? [mk(a + g / 2), mk(-(a + g / 2))] : [mk(0)], o.pair === 'tip' ? 110 : 120);
  if (geoCache.size > 40) geoCache.clear(); geoCache.set(key, G); return G;
};
/* two parallel rods side by side, centres 2b + g apart: coupled point dipoles (approximate) */
const sideBySide = (sp, a, b, g, lam, em) => {
  const k = 2 * Math.PI * Math.sqrt(em) / lam, alpha = sp.long.alpha, p = MIE().sideBySide(sp, a, b, 2 * b + g, lam, em), c = MIE().c;
  const inv = c.cdiv([1, 0], alpha), p2 = p[0] * p[0] + p[1] * p[1];
  const Cext = 2 * k * p[1], Cabs = 2 * k * p2 * (-inv[1] - k * k * k / (6 * Math.PI));
  return { Cext, Cabs, Csca: Cext - Cabs };
};
PT.rodPoint = (dd, lam, gapOv) => {
  const { a, b } = rodOf(dd), n = medN(dd, lam), em = n * n, eps = epsOf(dd.core, lam), o = dd.orient || 'random', ro = rodOpt(dd), g = gapOv != null ? gapOv : ro.gap;
  const sp = MIE().spheroid(eps, em, a, b, lam), two = ro.pair === 'one' ? 1 : 2;
  let long, E2 = NaN, bem = null;
  if (ro.pair === 'side') long = sideBySide(sp, a, b, g, lam, em);
  else if (ro.pair === 'one' && ro.ends === 'spheroid') { long = sp.long; E2 = MIE().spheroidField(a, b, sp.long.Ein, 'long', 0, a + 0.5); }
  else { const G = PT.rodGeom(dd, g), r = BEM().response(G, eps, em, lam); long = r; bem = { G, r }; E2 = ro.pair === 'tip' ? BEM().field(G, r, 0, 0) : BEM().field(G, r, 0, a + 0.5); }
  // across the rods: uncoupled spheroids (the transverse plasmon couples weakly)
  const tr = k => two * sp.trans[k], pick = k => (o === 'long' ? long[k] : o === 'trans' ? tr(k) : (long[k] + 2 * tr(k)) / 3);
  if (o === 'trans') E2 = ro.pair === 'one' ? MIE().spheroidField(a, b, sp.trans.Ein, 'trans', b + 0.5, 0) : NaN;
  return { lam, Cext: pick('Cext'), Csca: pick('Csca'), Cabs: pick('Cabs'), E2, rod: sp, bem };
};
PT.rodModel = dd => { const ro = rodOpt(dd); return ro.pair === 'side' ? 'coupled spheroids (approximate)' : ro.pair === 'one' && ro.ends === 'spheroid' ? 'spheroid model with size corrections' : 'boundary elements (exact shape) with size corrections'; };
/* the hot spot: gap centre, or 0.5 nm outside the surface on the polarisation axis */
PT.hotSpot = dd => (dd.kind === 'dimer' ? [0, 0, 0] : dd.pol === 'z' ? [0, 0, outerR(dd) + 0.5] : [0, outerR(dd) + 0.5, 0]);
PT.order = (dd, lam) => (dd.kind === 'rod' ? 0 : +dd.orders > 0 ? +dd.orders : MIE().autoOrder(PT.parts(dd, lam), lam, medN(dd, lam)));
/* one wavelength: cross-sections (nm²) and the hot-spot |E|² */
PT.point = (dd, lam, N) => {
  if (dd.kind === 'rod') return PT.rodPoint(dd, lam, dd._gap);
  const parts = PT.parts(dd, lam), nm = medN(dd, lam);
  const Sx = MIE().solve(parts, nm, lam, dd.pol, N || PT.order(dd, Math.min(lam, dd.calc.lmin)));
  const c = MIE().cross(Sx), hs = PT.hotSpot(dd), E2 = MIE().intensity(MIE().field(Sx, hs[0], hs[1], hs[2]));
  return { lam, Cext: c.Cext, Csca: c.Csca, Cabs: c.Cabs, E2, S: Sx };
};
const ramanNm = (lam, shift) => 1 / (1 / lam - shift * 1e-7);
PT.sig = dd => JSON.stringify([dd.kind, dd.core, dd.shells, dd.medium, dd.mediumN, dd.gap, dd.pol, dd.orders, dd.rod, dd.orient]);

/* ---------- state ---------- */
let d = null, root = null, undo = [], redo = [], lastKey = '', lastAt = 0, views = {};
let spec = null, specRun = 0, field = null, fieldRun = 0, sweep = null, sweepRun = 0, raman = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* optional */ } };
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.core ? v : null; } catch (e) { return null; } };
PT.loaded = () => !!d;
PT.design = () => d;
PT.load = () => { d = d || load() || PRESETS.find(p => p.id === 'dimer').make(); undo = []; redo = []; };
PT.setDesign = v => { step(); d = v; save(); dirty(); if (root) PT.render(root); };
PT.closed = () => { specRun++; fieldRun++; sweepRun++; root = null; };
const step = key => { const now = Date.now(); if (!(key && key === lastKey && now - lastAt < 900)) { undo.push(JSON.stringify(d)); if (undo.length > 120) undo.shift(); redo = []; } lastKey = key || ''; lastAt = now; };
PT.undo = () => { if (!undo.length) return; redo.push(JSON.stringify(d)); d = JSON.parse(undo.pop()); save(); dirty(); PT.render(root); };
PT.redo = () => { if (!redo.length) return; undo.push(JSON.stringify(d)); d = JSON.parse(redo.pop()); save(); dirty(); PT.render(root); };
const dirty = () => { spec = null; field = null; sweep = null; raman = null; specRun++; fieldRun++; sweepRun++; };
let tmr = 0;
const change = (fn, key, what) => { step(key); fn(); save(); dirty(); if (what === 'all') PT.render(root); else { if (what === 'list') buildLeft(); drawSketch(); clearTimeout(tmr); tmr = setTimeout(runAll, 250); } };
const probeChange = (fn, key) => { step(key); fn(); save(); field = null; raman = null; fieldRun++; drawSpec(); drawField(); clearTimeout(tmr); tmr = setTimeout(runRaman, 200); };

/* ---------- small controls ---------- */
const fld = (label, input) => el('label', { class: 'st-f' }, el('span', { text: label }), input);
const num = (get, set, o = {}) => { const i = el('input', { type: 'number', value: get(), step: o.step || 1, min: o.min, max: o.max, title: o.title || '', oninput: () => { const v = parseFloat(i.value); if (isFinite(v)) (o.probe ? probeChange : change)(() => set(o.min != null ? Math.max(o.min, o.max != null ? Math.min(o.max, v) : v) : v), o.key || 'n', o.what); } }); return i; };
const sel1 = (opts, get, set, key, what) => { const s = el('select', { onchange: () => change(() => set(s.value), key, what) }, opts.map(q => el('option', { value: q[0], text: q[1], disabled: !!q[2] }))); s.value = String(get()); return s; };
const matSel = (get, set, key) => sel1(TF().options(), get, set, key, 'list');

/* ---------- layout ---------- */
PT.render = host => {
  root = host; if (!root) return;
  root.innerHTML = '';
  const presetBtn = el('button', { class: 'btn small', type: 'button', text: 'Start from ▾', onclick: ev => { const r = ev.currentTarget.getBoundingClientRect(); D.menu([{ title: 'Particles' }].concat(PRESETS.map(p => ({ label: p.name, action: () => PT.setDesign(p.make()) }))), r.left, r.bottom + 4, ev.currentTarget); } });
  const name = el('input', { type: 'text', class: 'st-name', value: d.name || '', title: 'Name of the design', oninput: () => { step('name'); d.name = name.value; save(); } });
  root.append(el('div', { class: 'st-head' },
    el('div', { class: 'st-title' }, el('b', { text: 'Layer Studio' }), el('span', { class: 'st-sub', text: 'nanoparticles and SERS hot spots (exact Mie theory)' })),
    ST().tabs(), name, presetBtn,
    D.iconBtn('undo', 'Undo (Ctrl+Z)', PT.undo), D.iconBtn('redo', 'Redo (Ctrl+Y)', PT.redo),
    el('button', { class: 'btn small ghost', type: 'button', text: 'CSV', title: 'Spectrum, hot-spot field and gap sweep as CSV', onclick: csv }),
    el('span', { class: 'st-grow' }),
    el('button', { class: 'btn primary', type: 'button', text: 'Insert into figure', onclick: insertDialog }),
    D.iconBtn('close', 'Close (Esc): the design is kept for next time', ST().close)));
  views = { left: el('div', {}), sketch: el('div', { class: 'st-cross' }), field: el('div', { class: 'st-field' }), fieldInfo: el('div', { class: 'readout' }), spec: el('div', { class: 'st-spec' }), hot: el('div', { class: 'st-spec' }), sweep: el('div', { class: 'st-spec' }), status: el('div', { class: 'hint' }) };
  const left = el('section', { class: 'st-col st-left' }, el('h4', { text: 'Particle' }), views.left);
  const mid = el('section', { class: 'st-col st-mid' }, el('h4', { text: 'Geometry' }), views.sketch, el('h4', { text: 'Near field |E|²' }), probeControls(), views.field, views.fieldInfo);
  const right = el('section', { class: 'st-col st-right' }, el('h4', { text: 'Extinction, scattering, absorption' }), specControls(), views.status, views.spec,
    el('h4', { text: 'Hot spot and SERS enhancement' }), views.hot, hasGap() ? el('h4', { text: 'Field against the gap' }) : null, hasGap() ? sweepControls() : null, hasGap() ? views.sweep : null);
  root.append(el('div', { class: 'st-body' }, left, mid, right));
  buildLeft(); drawSketch(); drawSpec(); drawField(); drawSweep();
  runAll();
};
const hasGap = () => d.kind === 'dimer' || (d.kind === 'rod' && rodOpt(d).pair === 'tip');
function buildLeft() {
  const host = views.left; if (!host) return; host.innerHTML = '';
  const g = [
    fld('Particles', sel1([['single', 'One sphere (or core–shell)'], ['dimer', 'Dimer (two spheres, with a gap)'], ['rod', 'Nanorod']], () => d.kind, v => { d.kind = v; if (v === 'rod' && !d.rod) d.rod = { L: 40, D: 10 }; }, 'kind', 'all')),
    fld('Medium around', sel1(TF().options(true), () => d.medium, v => { d.medium = v; }, 'med', 'list'))];
  if (d.medium === 'custom') g.push(fld('Its index n', num(() => d.mediumN, v => { d.mediumN = v; }, { step: 0.001, min: 1, key: 'medn' })));
  if (d.kind === 'dimer') g.push(fld('Gap g (nm)', num(() => d.gap, v => { d.gap = v; }, { step: 0.1, min: 0.1, max: 500, key: 'gap', title: 'Surface-to-surface distance' })));
  if (d.kind === 'rod') {
    d.rod = d.rod || { L: 40, D: 10 };
    const ro = rodOpt(d);
    g.push(fld('Rods', sel1([['one', 'One rod'], ['tip', 'Two, end to end (tip gap)'], ['side', 'Two, side by side']], () => ro.pair, v => { d.rod.pair = v; if (v !== 'one' && !(+d.rod.gap > 0)) d.rod.gap = 2; if (v !== 'one') d.orient = 'long'; }, 'pair', 'all')),
      fld('Ends', sel1([['round', 'Rounded (hemispherical caps)'], ['spheroid', 'Spheroid']], () => ro.ends, v => { d.rod.ends = v; }, 'ends')),
      fld('Orientation', sel1([['random', 'Random (in solution)'], ['long', 'Light polarised along the rods'], ['trans', 'Polarised across the rods']], () => d.orient || 'random', v => { d.orient = v; }, 'ori')));
    if (ro.pair !== 'one') g.push(fld('Gap g (nm)', num(() => ro.gap, v => { d.rod.gap = Math.max(0.1, v); }, { step: 0.1, min: 0.1, max: 500, key: 'rgap', title: ro.pair === 'tip' ? 'Tip-to-tip distance' : 'Side-to-side distance' })));
    host.append(el('div', { class: 'st-grid' }, ...g));
    const box = el('div', { class: 'st-group st-player' }, el('div', { class: 'st-cap', text: ro.pair === 'one' ? 'Rod' : 'Each rod' }),
      el('div', { class: 'st-row2' }, matSel(() => d.core.mat, v => { d.core.mat = v; }, 'rodm')),
      el('div', { class: 'st-row2' }, el('span', { class: 'hint', style: { margin: 0 }, text: 'length' }), num(() => d.rod.L, v => { d.rod.L = Math.max(1, v); }, { step: 1, min: 1, key: 'rodL', title: 'Tip to tip (nm)' }),
        el('span', { class: 'hint', style: { margin: 0 }, text: 'diameter' }), num(() => d.rod.D, v => { d.rod.D = Math.max(1, v); }, { step: 0.5, min: 1, key: 'rodD', title: 'Width (nm)' }), el('span', { class: 'hint', style: { margin: 0 }, text: 'nm' })));
    if (d.core.mat === 'custom') box.append(el('div', { class: 'st-row2' }, el('span', { text: 'n' }), num(() => d.core.n == null ? 1.5 : d.core.n, v => { d.core.n = v; }, { step: 0.001, key: 'rn' }), el('span', { text: 'k' }), num(() => d.core.k || 0, v => { d.core.k = Math.max(0, v); }, { step: 0.001, min: 0, key: 'rk' })));
    host.append(box);
    const r = rodOf(d);
    const model = ro.pair === 'side'
      ? 'Side by side: each rod (a size-corrected spheroid) is driven by the incident light plus the voltage that the other rod’s polarisation puts across its ends (exact static field of the spheroid). Approximate: it gives the spectrum and the blue shift, not the field between the rods.'
      : ro.pair === 'one' && ro.ends === 'spheroid'
        ? 'Prolate spheroid in the long-wavelength approximation with size corrections (dynamic depolarisation, radiation damping; Kuwata et al. 2003).'
        : 'Boundary-element solution of the exact shape (the surface charge on the rod' + (ro.pair === 'tip' ? 's, including the field in the gap' : '') + '), with the same size corrections as a spheroid. Checked against exact theory for spheres and sphere dimers (peak within a few nm, gap field within about 10 %).';
    host.append(el('div', { class: 'hint', text: `Aspect ratio ${UI().f1(r.a / r.b, 2)}. ${model} Light polarised across the rods uses uncoupled spheroids. Random orientation averages one longitudinal and two transverse responses.` }));
    return;
  }
  g.push(fld('Polarisation', sel1([['z', d.kind === 'dimer' ? 'Along the dimer axis (hot spot)' : 'Along z'], ['y', d.kind === 'dimer' ? 'Across the axis' : 'Along y']], () => d.pol, v => { d.pol = v; }, 'pol')),
    fld('Multipole orders', sel1([['0', 'Automatic'], ['10', '10'], ['15', '15'], ['20', '20'], ['30', '30'], ['40', '40'], ['50', '50']], () => String(d.orders || 0), v => { d.orders = +v; }, 'ord')));
  host.append(el('div', { class: 'st-grid' }, ...g));
  // core and shells, inside → out
  const card = (title, o, isCore, i) => {
    const row = el('div', { class: 'st-row2' },
      matSel(() => o.mat, v => { o.mat = v; }, (isCore ? 'core' : 'sh' + i) + 'm'),
      num(() => isCore ? o.d : o.t, v => { if (isCore) o.d = Math.max(0.5, v); else o.t = Math.max(0, v); }, { step: 0.5, min: isCore ? 0.5 : 0, key: (isCore ? 'core' : 'sh' + i) + 't', title: isCore ? 'Diameter of the core (nm)' : 'Thickness of the shell (nm)' }),
      el('span', { class: 'hint', style: { margin: 0 }, text: isCore ? 'nm ⌀' : 'nm' }), el('span', { class: 'st-grow' }),
      isCore ? null : D.iconBtn('trash', 'Remove the shell', () => change(() => d.shells.splice(i, 1), null, 'list')));
    const box = el('div', { class: 'st-group st-player' }, el('div', { class: 'st-cap', text: title }), row);
    if (o.mat === 'custom') box.append(el('div', { class: 'st-row2' }, el('span', { text: 'n' }), num(() => o.n == null ? 1.5 : o.n, v => { o.n = v; }, { step: 0.001, key: 'cn' + i }), el('span', { text: 'k' }), num(() => o.k || 0, v => { o.k = Math.max(0, v); }, { step: 0.001, min: 0, key: 'ck' + i })));
    return box;
  };
  host.append(card('Core', d.core, true, -1));
  d.shells.forEach((s, i) => host.append(card('Shell ' + (i + 1), s, false, i)));
  host.append(el('div', { class: 'ps-addrow' },
    el('button', { class: 'btn small', type: 'button', text: '+ Shell', title: 'Add a shell outside the particle', onclick: () => change(() => d.shells.push(shell('SiO2', 5)), null, 'list') }),
    el('span', {})));
  const R = outerR(d);
  host.append(el('div', { class: 'hint', text: `Outer diameter ${UI().f1(2 * R, 1)} nm${d.kind === 'dimer' ? `, centre-to-centre ${UI().f1(2 * R + (+d.gap || 0), 1)} nm` : ''}. Exact solution: Mie theory${d.kind === 'dimer' ? ' with the coupling of the two particles (multi-sphere Mie theory); narrow gaps need many multipole orders, chosen automatically (check by setting more)' : ''}. Light travels along x.` }));
}
function probeControls() {
  return el('div', { class: 'st-grid' },
    fld('Wavelength (nm)', num(() => d.probe.nm, v => { d.probe.nm = v; }, { probe: true, min: 200, max: 3000, step: 1, key: 'pnm' })),
    fld('Raman shift (cm⁻¹)', num(() => d.probe.shift, v => { d.probe.shift = v; }, { probe: true, min: 0, max: 4000, step: 10, key: 'psh', title: 'For the SERS enhancement |E(λ)|²·|E(λ_Raman)|²' })),
    fld('Colour scale', (() => { const s = el('select', { onchange: () => { d.view.log = s.value === 'log'; save(); drawField(); } }, [['log', 'Logarithmic'], ['lin', 'Linear']].map(q => el('option', { value: q[0], text: q[1] }))); s.value = d.view.log ? 'log' : 'lin'; return s; })()),
    fld('Detail', (() => { const s = el('select', { onchange: () => { d.view.res = s.value; save(); field = null; runField(); } }, [['low', 'Quick'], ['medium', 'Medium'], ['high', 'Fine']].map(q => el('option', { value: q[0], text: q[1] }))); s.value = d.view.res || 'medium'; return s; })()));
}
function specControls() {
  return el('div', { class: 'st-grid' },
    fld('From (nm)', num(() => d.calc.lmin, v => { d.calc.lmin = v; }, { min: 200, max: 3000, key: 'lmin' })),
    fld('To (nm)', num(() => d.calc.lmax, v => { d.calc.lmax = v; }, { min: 200, max: 3000, key: 'lmax' })),
    fld('Points', sel1([...new Set([21, 41, 51, 81, 101, 141, 201, +d.calc.points])].sort((x, y) => x - y).map(v => [String(v), String(v)]), () => String(d.calc.points), v => { d.calc.points = +v; }, 'pts')),
    fld('Show', (() => { const s = el('select', { onchange: () => { d.calc.show = s.value; save(); drawSpec(); } }, [['C', 'Cross-sections (nm²)'], ['Q', 'Efficiencies Q = C / πR²']].map(q => el('option', { value: q[0], text: q[1] }))); s.value = d.calc.show; return s; })()));
}
function sweepControls() {
  return el('div', { class: 'st-grid' },
    fld('Gap from (nm)', num(() => d.sweep.gmin, v => { d.sweep.gmin = Math.max(0.1, v); }, { step: 0.1, min: 0.1, key: 'gmin' })),
    fld('to (nm)', num(() => d.sweep.gmax, v => { d.sweep.gmax = v; }, { step: 1, min: 0.2, key: 'gmax' })),
    el('button', { class: 'btn small primary', type: 'button', text: 'Calculate gap sweep', onclick: runSweep }));
}

/* ---------- calculations (in slices, so the page stays responsive) ---------- */
const later = () => new Promise(r => setTimeout(r, 0));
function runAll() { runSpec(); runRaman(); }
async function runSpec() {
  const run = ++specRun, dd = d, n = Math.max(3, d.calc.points), lo = Math.min(d.calc.lmin, d.calc.lmax), hi = Math.max(d.calc.lmin, d.calc.lmax);
  const N = PT.order(dd, lo), out = { x: [], Cext: [], Csca: [], Cabs: [], E2: [], R: outerR(dd), N, done: false };
  spec = out;
  for (let i = 0; i < n; i++) {
    if (run !== specRun) return;
    const lam = lo + (hi - lo) * i / (n - 1), p = PT.point(dd, lam, N);
    out.x.push(lam); out.Cext.push(p.Cext); out.Csca.push(p.Csca); out.Cabs.push(p.Cabs); out.E2.push(p.E2);
    if (views.status) views.status.textContent = `Calculating… ${Math.round(100 * (i + 1) / n)} %` + (dd.kind === 'rod' ? '' : ` (${N} multipole orders)`);
    if (i % 3 === 2 || i === n - 1) { drawSpec(); await later(); }
  }
  out.done = true; if (views.status) views.status.textContent = `${n} wavelengths, ` + (dd.kind === 'rod' ? PT.rodModel(dd) + '.' : `${N} multipole orders.`); drawSpec();
}
async function runRaman() {
  const run = ++fieldRun, dd = d; await later(); if (run !== fieldRun) return;
  const lam = d.probe.nm, lr = ramanNm(lam, d.probe.shift), N = PT.order(dd, Math.min(lam, d.calc.lmin));
  const a = PT.point(dd, lam, N), b = d.probe.shift > 0 ? PT.point(dd, lr, N) : a;
  if (run !== fieldRun) return;
  raman = { lam, lr, E2a: a.E2, E2b: b.E2, EF: a.E2 * b.E2, Cext: a.Cext };
  drawHot();
  runField(true);
}
const RES = { low: 64, medium: 110, high: 170 };
async function runField(keep) {
  if (d.kind === 'rod') return runRodField(keep);
  const run = keep ? fieldRun : ++fieldRun, dd = d, lam = d.probe.nm, N = PT.order(dd, Math.min(lam, d.calc.lmin));
  const Sx = MIE().solve(PT.parts(dd, lam), medN(dd, lam), lam, dd.pol, N);
  const R = outerR(dd), zc = dd.kind === 'dimer' ? R + (+dd.gap || 0) / 2 : 0, hz = zc + R * 1.6, hx = R * 1.6;
  const nz = RES[dd.view.res] || 110, nx = Math.max(24, Math.round(nz * hx / hz)), map = new Float64Array(nx * nz).fill(NaN);
  const out = { nx, nz, hx, hz, map, lam, done: false, max: 0 };
  field = out;
  for (let j = 0; j < nx; j++) {
    if (run !== fieldRun) return;
    const x = -hx + 2 * hx * (j + 0.5) / nx;
    for (let i = 0; i < nz; i++) { const z = -hz + 2 * hz * (i + 0.5) / nz, v = MIE().intensity(MIE().field(Sx, x, 0, z)); map[j * nz + i] = v; if (v > out.max) out.max = v; }
    if (j % 6 === 5) { drawField(); await later(); }
  }
  out.done = true; drawField();
}
async function runRodField(keep) {
  const run = keep ? fieldRun : ++fieldRun, dd = d, lam = d.probe.nm, { a, b } = rodOf(dd), ro = rodOpt(dd), o = dd.orient || 'random';
  if (ro.pair === 'side' || (ro.pair === 'tip' && o === 'trans')) { field = { none: true, lam }; drawField(); return; }
  await later(); if (run !== fieldRun) return;
  const pt = PT.rodPoint(dd, lam), useBem = !!pt.bem && o !== 'trans', pol = o === 'trans' ? 'trans' : 'long';
  const half = ro.pair === 'tip' ? 2 * a + ro.gap / 2 : a, hz = half * 1.25 + 4, hx = Math.max(b * 3, hz * 0.32);
  const nz = RES[dd.view.res] || 110, nx = Math.max(24, Math.round(nz * hx / hz)), map = new Float64Array(nx * nz).fill(NaN);
  const out = { nx, nz, hx, hz, map, lam, done: false, max: 0, pol };
  field = out;
  for (let j = 0; j < nx; j++) {
    if (run !== fieldRun) return;
    const x = -hx + 2 * hx * (j + 0.5) / nx;
    for (let i = 0; i < nz; i++) {
      const z = -hz + 2 * hz * (i + 0.5) / nz, v = useBem ? BEM().field(pt.bem.G, pt.bem.r, x, z) : MIE().spheroidField(a, b, pt.rod[pol].Ein, pol, x, z);
      map[j * nz + i] = v == null ? NaN : v; if (v > out.max) out.max = v;
    }
    if (j % 4 === 3) { drawField(); await later(); }
  }
  out.done = true; drawField();
}
async function runSweep() {
  const run = ++sweepRun, dd = JSON.parse(JSON.stringify(d)), lam = d.probe.nm, n = 14;
  const g0 = Math.max(0.1, Math.min(d.sweep.gmin, d.sweep.gmax)), g1 = Math.max(g0 * 1.01, Math.max(d.sweep.gmin, d.sweep.gmax));
  const out = { g: [], E2: [], EF: [], lam, done: false }; sweep = out;
  for (let i = 0; i < n; i++) {
    if (run !== sweepRun) return;
    const g = g0 * Math.pow(g1 / g0, i / (n - 1)); if (dd.kind === 'rod') dd._gap = g; else dd.gap = g;
    const N = PT.order(dd, lam), a = PT.point(dd, lam, N), lr = ramanNm(lam, d.probe.shift), b = d.probe.shift > 0 ? PT.point(dd, lr, N) : a;
    out.g.push(g); out.E2.push(a.E2); out.EF.push(a.E2 * b.E2);
    drawSweep(); await later();
  }
  out.done = true; drawSweep();
}

/* ---------- drawings ---------- */
const COL = { Cext: '#1f77b4', Csca: '#2ca02c', Cabs: '#d62728', E2: '#9467bd', EF: '#ff7f0e' };
function drawSketch() {
  const host = views.sketch; if (!host) return;
  if (d.kind === 'rod') return drawRodSketch(host);
  const w = Math.max(300, host.clientWidth || 440), h = 150, R = outerR(d), parts = d.kind === 'dimer' ? [-1, 1] : [0];
  const c = d.kind === 'dimer' ? R + (+d.gap || 0) / 2 : 0, sc = Math.min((w - 120) / ((c + R) * 2), (h - 40) / (2 * R)), cx = w / 2, cy = h / 2 + 4;
  const rs = [d.core.d / 2]; d.shells.forEach(s => rs.push(rs[rs.length - 1] + (+s.t || 0)));
  const mats = [d.core].concat(d.shells);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
  s += `<rect x="0" y="0" width="${w}" height="${h}" fill="${d.medium === 'air' ? '#f7f9fc' : UI().colorOf(d.medium)}" fill-opacity="0.25"/>`;
  parts.forEach(sg => { for (let k = rs.length - 1; k >= 0; k--) s += `<circle cx="${cx + sg * c * sc}" cy="${cy}" r="${Math.max(0.8, rs[k] * sc)}" fill="${UI().colorOf(mats[k].mat)}" stroke="#00000066" stroke-width="0.7"/>`; });
  if (d.kind === 'dimer') s += `<text x="${cx}" y="${cy - R * sc - 8}" text-anchor="middle" fill="#333">g = ${UI().f1(+d.gap, d.gap < 10 ? 1 : 0)} nm</text>`;
  // light: along x (down the page), polarisation arrow
  s += `<line x1="18" y1="14" x2="18" y2="${h - 22}" stroke="#d62728" stroke-width="2" marker-end="url(#pt-ar)"/><text x="24" y="24" fill="#d62728">k</text>`;
  s += d.pol === 'z' ? `<line x1="34" y1="${h - 14}" x2="70" y2="${h - 14}" stroke="#d62728" stroke-width="1.6" marker-end="url(#pt-ar)" marker-start="url(#pt-ar)"/><text x="76" y="${h - 10}" fill="#d62728">E</text>` : `<circle cx="44" cy="${h - 16}" r="5" fill="none" stroke="#d62728" stroke-width="1.4"/><circle cx="44" cy="${h - 16}" r="1.6" fill="#d62728"/><text x="54" y="${h - 12}" fill="#d62728">E (out of page)</text>`;
  s += `<defs><marker id="pt-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#d62728"/></marker></defs>`;
  s += `<text x="${w - 8}" y="${h - 8}" text-anchor="end" fill="#666">${U.esc(mats.map(m => TF().name(m.mat)).join(' / '))} in ${U.esc(TF().name(d.medium))}</text>`;
  host.innerHTML = s + '</svg>';
}
const capsulePath = (cx, cy, a, b, sc, ends) => (ends === 'spheroid'
  ? `<ellipse cx="${cx}" cy="${cy}" rx="${a * sc}" ry="${b * sc}"`
  : `<rect x="${cx - a * sc}" y="${cy - b * sc}" width="${2 * a * sc}" height="${2 * b * sc}" rx="${b * sc}" ry="${b * sc}"`);
function drawRodSketch(host) {
  const w = Math.max(300, host.clientWidth || 440), h = 150, { a, b } = rodOf(d), ro = rodOpt(d), o = d.orient || 'random';
  const tot = ro.pair === 'tip' ? 4 * a + ro.gap : 2 * a, hgt = ro.pair === 'side' ? 4 * b + ro.gap : 2 * b, sc = Math.min((w - 140) / tot, (h - 44) / hgt), cx = w / 2, cy = h / 2 + 4;
  const fill = UI().colorOf(d.core.mat);
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
  s += `<rect x="0" y="0" width="${w}" height="${h}" fill="${d.medium === 'air' ? '#f7f9fc' : UI().colorOf(d.medium)}" fill-opacity="0.25"/>`;
  const centres = ro.pair === 'tip' ? [[-(a + ro.gap / 2), 0], [a + ro.gap / 2, 0]] : ro.pair === 'side' ? [[0, -(b + ro.gap / 2)], [0, b + ro.gap / 2]] : [[0, 0]];
  centres.forEach(([zc, xc]) => { s += capsulePath(cx + zc * sc, cy + xc * sc, a, b, sc, ro.ends) + ` fill="${fill}" stroke="#00000066" stroke-width="0.7"/>`; });
  s += `<text x="${cx}" y="16" text-anchor="middle" fill="#333">${UI().f1(2 * a, 0)} × ${UI().f1(2 * b, 0)} nm${ro.pair !== 'one' ? `, g = ${UI().f1(ro.gap, ro.gap < 10 ? 1 : 0)} nm` : ''}</text>`;
  if (o !== 'random') s += o === 'long' ? `<line x1="34" y1="${h - 14}" x2="70" y2="${h - 14}" stroke="#d62728" stroke-width="1.6" marker-end="url(#pt-ar)" marker-start="url(#pt-ar)"/><text x="76" y="${h - 10}" fill="#d62728">E</text>` : `<line x1="44" y1="${h - 34}" x2="44" y2="${h - 6}" stroke="#d62728" stroke-width="1.6" marker-end="url(#pt-ar)" marker-start="url(#pt-ar)"/><text x="50" y="${h - 14}" fill="#d62728">E</text>`;
  else s += `<text x="16" y="${h - 10}" fill="#d62728">random orientation</text>`;
  s += `<defs><marker id="pt-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#d62728"/></marker></defs>`;
  s += `<text x="${w - 8}" y="${h - 8}" text-anchor="end" fill="#666">${U.esc(TF().name(d.core.mat))} rod${ro.pair === 'one' ? '' : 's'} in ${U.esc(TF().name(d.medium))}</text>`;
  host.innerHTML = s + '</svg>';
}
function drawSpec() {
  const host = views.spec; if (!host) return;
  if (!spec || !spec.x.length) { host.innerHTML = '<div class="hint">Calculating…</div>'; drawHot(); return; }
  const w = Math.max(300, host.clientWidth || 440), h = 230, q = d.calc.show === 'Q', G = Math.PI * spec.R * spec.R * (d.kind === 'dimer' || (d.kind === 'rod' && rodOpt(d).pair !== 'one') ? 2 : 1), f = v => (q ? v / G : v);
  const keys = ['Cext', 'Csca', 'Cabs'], ys = keys.flatMap(k => spec[k].map(f)), ymax = Math.max(...ys, 1e-9);
  const lo = Math.min(d.calc.lmin, d.calc.lmax), hi = Math.max(d.calc.lmin, d.calc.lmax);
  const ch = UI().chart({ id: 'pt-spec', w, h, xr: [lo, hi], yr: [0, ymax * 1.08], xlabel: 'Wavelength (nm)', ylabel: q ? 'Efficiency Q' : 'Cross-section (nm²)', cross: d.probe.nm,
    series: keys.map(k => ({ x: spec.x, y: spec[k].map(f), color: COL[k] })), legend: [{ name: 'Extinction', color: COL.Cext }, { name: 'Scattering', color: COL.Csca }, { name: 'Absorption', color: COL.Cabs }] });
  host.innerHTML = ch.svg;
  const i = spec.Cext.indexOf(Math.max(...spec.Cext));
  host.append(el('div', { class: 'hint', text: `Extinction peak ${UI().f1(spec.x[i], 1)} nm (${q ? 'Q ' + UI().f1(f(spec.Cext[i]), 2) : UI().f1(spec.Cext[i], 0) + ' nm²'}). Click the plot to choose the near-field wavelength.` }));
  const svg = host.querySelector('svg'); svg.style.cursor = 'crosshair';
  svg.onclick = e => { const b = svg.getBoundingClientRect(), x = (e.clientX - b.left) * w / b.width; probeChange(() => { d.probe.nm = U.round(U.clamp(ch.inv(x), lo, hi), 1); }); };
  drawHot();
}
function drawHot() {
  const host = views.hot; if (!host) return;
  if (!spec || !spec.x.length) { host.innerHTML = ''; return; }
  const w = Math.max(300, host.clientWidth || 440), h = 200, lo = Math.min(d.calc.lmin, d.calc.lmax), hi = Math.max(d.calc.lmin, d.calc.lmax);
  if (!spec.E2.some(v => isFinite(v))) { host.innerHTML = '<div class="hint">No hot-spot field for this arrangement (' + (d.kind === 'rod' && rodOpt(d).pair === 'side' ? 'the side-by-side model gives spectra only' : 'light polarised across the rods') + ').</div>'; return; }
  const lg = spec.E2.map(v => Math.log10(Math.max(v, 1e-6))), ef = spec.E2.map(v => Math.log10(Math.max(v * v, 1e-6)));
  const ymin = Math.floor(Math.min(...lg, 0)), ymax = Math.ceil(Math.max(...ef, 1));
  const ch = UI().chart({ id: 'pt-hot', w, h, xr: [lo, hi], yr: [ymin, ymax], xlabel: 'Wavelength (nm)', ylabel: 'log₁₀', cross: d.probe.nm,
    series: [{ x: spec.x, y: lg, color: COL.E2 }, { x: spec.x, y: ef, color: COL.EF }], legend: [{ name: '|E|² hot spot', color: COL.E2 }, { name: '|E|⁴ (SERS EF)', color: COL.EF }] });
  host.innerHTML = ch.svg;
  const where = d.kind === 'dimer' ? 'at the centre of the gap' : d.kind === 'rod' ? (rodOpt(d).pair === 'side' ? 'not resolved by the side-by-side (coupled-spheroid) model' : (d.orient || 'random') === 'trans' ? (rodOpt(d).pair === 'one' ? '0.5 nm from the side of the rod (light polarised across it)' : 'calculated for light polarised along the rods') : rodOpt(d).pair === 'tip' ? 'at the centre of the gap between the tips (light polarised along the rods)' : '0.5 nm beyond the tip (light polarised along the rod)') : `0.5 nm from the surface, on the ${d.pol === 'z' ? 'z' : 'y'} axis`;
  const r = raman;
  host.append(el('div', { class: 'readout', html: r ? `Hot spot ${where}: at ${UI().f1(r.lam, 1)} nm |E|² = <b>${fmtE(r.E2a)}</b>; at the Raman line ${UI().f1(r.lr, 1)} nm (${d.probe.shift} cm⁻¹) |E|² = ${fmtE(r.E2b)}.<br>SERS enhancement |E(λ)|²·|E(λ<sub>R</sub>)|² ≈ <b>${fmtE(r.EF)}</b> (the |E|⁴ approximation; chemical enhancement not included).` : 'Calculating the hot spot…' }));
}
const fmtE = v => (!isFinite(v) ? '–' : v >= 1e4 || v < 0.01 ? v.toExponential(2).replace('e+', ' × 10^').replace(/\^(\d+)/, (m, e) => '<sup>' + e + '</sup>').replace('e-', ' × 10^-') : UI().f1(v, v < 10 ? 2 : 0));
const INFERNO = ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'].map(U.hexToRgb);
const hot = v => { const t = U.clamp(v, 0, 1) * (INFERNO.length - 1), i = Math.min(INFERNO.length - 2, Math.floor(t)), u = t - i, a = INFERNO[i], b = INFERNO[i + 1]; return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * u)); };
PT.fieldImage = (r, log, partCol) => {
  const cv = document.createElement('canvas'); cv.width = r.nz; cv.height = r.nx;
  const cx = cv.getContext('2d'), im = cx.createImageData(r.nz, r.nx), vmax = r.max || 1, pc = U.hexToRgb(partCol || '#c9a227');
  const norm = v => (log ? U.clamp(Math.log10(Math.max(v, 1e-3)) / Math.log10(Math.max(vmax, 10)), 0, 1) : v / vmax);
  for (let j = 0; j < r.nx; j++) for (let i = 0; i < r.nz; i++) {
    const v = r.map[j * r.nz + i], o = (j * r.nz + i) * 4, c = isNaN(v) ? pc : hot(norm(v));
    im.data[o] = c[0]; im.data[o + 1] = c[1]; im.data[o + 2] = c[2]; im.data[o + 3] = 255;
  }
  cx.putImageData(im, 0, 0);
  return cv;
};
function drawField() {
  const host = views.field; if (!host) return;
  const r = field;
  if (!r) { host.innerHTML = '<div class="hint">Calculating the near field…</div>'; return; }
  if (r.none) { host.innerHTML = '<div class="hint">' + (rodOpt(d).pair === 'side' ? 'The side-by-side model (coupled spheroids) gives the spectrum but not the field between the rods.' : 'The near field is calculated for light polarised along the rods.') + '</div>'; if (views.fieldInfo) views.fieldInfo.innerHTML = ''; return; }
  const w = Math.max(300, host.clientWidth || 440), L = 46, R = w - 64, T = 10, hh = Math.round((R - L) * r.hx / r.hz), B = T + hh, h = B + 34;
  const cv = PT.fieldImage(r, d.view.log, UI().colorOf(d.shells.length ? d.shells[d.shells.length - 1].mat : d.core.mat));
  const X = z => L + (z + r.hz) / (2 * r.hz) * (R - L), Y = x => T + (x + r.hx) / (2 * r.hx) * hh;
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="10.5" class="st-chart">`;
  s += `<image href="${cv.toDataURL()}" x="${L}" y="${T}" width="${R - L}" height="${hh}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`;
  // particle outlines
  const Rr = outerR(d), cz = d.kind === 'dimer' ? [-(Rr + (+d.gap || 0) / 2), Rr + (+d.gap || 0) / 2] : [0], sx = (R - L) / (2 * r.hz);
  if (d.kind === 'rod') { const rb = rodOf(d), ro = rodOpt(d); (ro.pair === 'tip' ? [-(rb.a + ro.gap / 2), rb.a + ro.gap / 2] : [0]).forEach(zc => { s += capsulePath(X(zc), Y(0), rb.a, rb.b, sx, ro.ends) + ` fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="0.8"/>`; }); }
  else { const rs = [d.core.d / 2]; d.shells.forEach(q => rs.push(rs[rs.length - 1] + (+q.t || 0)));
    cz.forEach(z => rs.forEach(rr => { s += `<circle cx="${X(z)}" cy="${Y(0)}" r="${rr * sx}" fill="none" stroke="#ffffff" stroke-opacity="0.8" stroke-width="0.8"/>`; })); }
  s += `<rect x="${L}" y="${T}" width="${R - L}" height="${hh}" fill="none" stroke="currentColor"/>`;
  [-r.hz, 0, r.hz].forEach(z => { s += `<text x="${X(z)}" y="${B + 13}" text-anchor="middle" fill="currentColor">${UI().f1(z, 0)}</text>`; });
  [-r.hx, 0, r.hx].forEach(x => { s += `<text x="${L - 4}" y="${Y(x) + 4}" text-anchor="end" fill="currentColor">${UI().f1(x, 0)}</text>`; });
  s += `<text x="${(L + R) / 2}" y="${h - 4}" text-anchor="middle" fill="currentColor">z (nm) · ${d.kind === 'dimer' ? 'dimer axis' : d.kind === 'rod' ? 'rod axis' : 'particle centre at 0'}</text><text transform="translate(12 ${T + hh / 2}) rotate(-90)" text-anchor="middle" fill="currentColor">x (nm)${d.kind === 'rod' ? '' : ', light ↓'}</text>`;
  // colour bar
  const cbx = R + 10, cbw = 10;
  for (let k = 0; k < 40; k++) { const c = hot(1 - k / 39); s += `<rect x="${cbx}" y="${T + k * hh / 40}" width="${cbw}" height="${hh / 40 + 0.5}" fill="rgb(${c})"/>`; }
  s += `<text x="${cbx + cbw + 3}" y="${T + 9}" fill="currentColor">${fmtTxt(r.max)}</text><text x="${cbx + cbw + 3}" y="${B}" fill="currentColor">${d.view.log ? '1' : '0'}</text>`;
  host.innerHTML = s + '</svg>';
  if (views.fieldInfo) views.fieldInfo.innerHTML = d.kind === 'rod' ? `|E|² / |E₀|² at ${UI().f1(r.lam, 1)} nm around the rod${rodOpt(d).pair === 'tip' ? 's' : ''}, polarised ${r.pol === 'long' ? 'along' : 'across'} ${rodOpt(d).pair === 'tip' ? 'them' : 'it'} (${r.pol === 'long' && !(rodOpt(d).pair === 'one' && rodOpt(d).ends === 'spheroid') ? 'boundary-element solution of the exact shape, with size corrections' : 'quasi-static field of the spheroid, driven by the size-corrected internal field'})${r.done ? '' : ' (calculating…)'}; peak ${fmtE(r.max)}${d.view.log ? ', logarithmic scale' : ''}.` : `|E|² / |E₀|² at ${UI().f1(r.lam, 1)} nm, ${d.pol === 'z' ? 'polarised along z' : 'polarised along y'}, in the x–z plane through the particle${d.kind === 'dimer' ? 's' : ''}${r.done ? '' : ' (calculating…)'}; peak ${fmtE(r.max)}${d.view.log ? ', logarithmic scale' : ''}.`;
}
const fmtTxt = v => (v >= 1e4 ? v.toExponential(1) : UI().f1(v, v < 10 ? 1 : 0));
function drawSweep() {
  const host = views.sweep; if (!host) return;
  if (!sweep) { host.innerHTML = '<div class="hint">Press “Calculate gap sweep”: the hot-spot field at the chosen wavelength for gaps from the smallest to the largest.</div>'; return; }
  const w = Math.max(300, host.clientWidth || 440), h = 210, lx = sweep.g.map(Math.log10), le = sweep.E2.map(v => Math.log10(Math.max(v, 1e-6))), lf = sweep.EF.map(v => Math.log10(Math.max(v, 1e-6)));
  const x0 = Math.log10(Math.max(0.1, Math.min(d.sweep.gmin, d.sweep.gmax))), x1 = Math.log10(Math.max(d.sweep.gmin, d.sweep.gmax));
  const ch = UI().chart({ id: 'pt-sw', w, h, xr: [x0, x1 > x0 ? x1 : x0 + 1], yr: [Math.floor(Math.min(...le, 0)), Math.ceil(Math.max(...lf, 1))], xlabel: 'log₁₀ gap (nm)', ylabel: 'log₁₀',
    series: [{ x: lx, y: le, color: COL.E2 }, { x: lx, y: lf, color: COL.EF }], legend: [{ name: '|E|² gap centre', color: COL.E2 }, { name: 'SERS EF', color: COL.EF }] });
  host.innerHTML = ch.svg;
  host.append(el('div', { class: 'hint', text: `At ${UI().f1(sweep.lam, 1)} nm${sweep.done ? '' : ' (calculating…)'}. The enhancement rises steeply as the gap closes; below about 0.5 nm electron tunnelling (not included here) quenches it.` }));
}

/* ---------- export ---------- */
function csv() {
  const rows = ['# ' + (d.name || 'Particles') + ' — Layer Studio ▸ Particles (RNBeamX), exact Mie / multi-sphere Mie theory'];
  if (spec) rows.push('# Spectrum' + (spec.done ? '' : ' (incomplete)'), 'Wavelength (nm),C_ext (nm2),C_sca (nm2),C_abs (nm2),|E|2 hot spot', ...spec.x.map((x, i) => [x.toFixed(2), spec.Cext[i].toPrecision(6), spec.Csca[i].toPrecision(6), spec.Cabs[i].toPrecision(6), spec.E2[i].toPrecision(6)].join(',')));
  if (raman) rows.push(`# SERS at ${raman.lam} nm, Raman shift ${d.probe.shift} cm-1 (${raman.lr.toFixed(2)} nm): |E|2 ${raman.E2a.toPrecision(5)}, ${raman.E2b.toPrecision(5)}, EF ${raman.EF.toPrecision(5)}`);
  if (sweep) rows.push('# Gap sweep at ' + sweep.lam + ' nm', 'Gap (nm),|E|2 gap centre,SERS EF', ...sweep.g.map((g, i) => [g.toFixed(3), sweep.E2[i].toPrecision(6), sweep.EF[i].toPrecision(6)].join(',')));
  U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(d.name || 'particles') + '_mie.csv');
}
PT.insert = (o = {}) => {
  const doc = S.doc, made = [];
  if (o.spec && spec) made.push(RNBX.arrange.addDataPanel({ series: [{ name: 'Extinction', x: spec.x, y: spec.Cext, color: COL.Cext }, { name: 'Scattering', x: spec.x, y: spec.Csca, color: COL.Csca }, { name: 'Absorption', x: spec.x, y: spec.Cabs, color: COL.Cabs }], xlabel: 'Wavelength (nm)', ylabel: 'Cross-section (nm^{2})' }));
  if (o.hot && spec) made.push(RNBX.arrange.addDataPanel({ series: [{ name: '|E|^{2}', x: spec.x, y: spec.E2.map(v => Math.log10(v)), color: COL.E2 }, { name: '|E|^{4}', x: spec.x, y: spec.E2.map(v => 2 * Math.log10(v)), color: COL.EF }], xlabel: 'Wavelength (nm)', ylabel: 'log_{10} enhancement' }));
  if (o.sweep && sweep) made.push(RNBX.arrange.addDataPanel({ series: [{ name: '|E|^{2}', x: sweep.g.map(Math.log10), y: sweep.E2.map(v => Math.log10(v)), color: COL.E2 }, { name: 'SERS EF', x: sweep.g.map(Math.log10), y: sweep.EF.map(v => Math.log10(v)), color: COL.EF }], xlabel: 'log_{10} gap (nm)', ylabel: 'log_{10} enhancement' }));
  if (o.field && field) {
    const pl = RNBX.arrange.addDataPanel(), im = RNBX.createObject('image', pl.x, pl.y), cv = PT.fieldImage(field, d.view.log, UI().colorOf(d.shells.length ? d.shells[d.shells.length - 1].mat : d.core.mat));
    const asp = field.hz / field.hx;
    Object.assign(im.props, { href: cv.toDataURL('image/png'), w: pl.props.w, h: pl.props.w / asp, aspect: asp });
    doc.objects.splice(doc.objects.indexOf(pl), 1, im); made.push(im);
  }
  RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build();
  return made;
};
function insertDialog() {
  const o = { spec: true, hot: true, field: !!field, sweep: !!sweep };
  const box = (k, label, hint, dis) => { const i = el('input', { type: 'checkbox', checked: o[k] && !dis, disabled: !!dis, onchange: () => { o[k] = i.checked; } }); return el('label', { class: 'field row' }, i, el('span', { text: label }), hint ? el('span', { class: 'hint', style: { margin: '0 0 0 6px' }, text: hint }) : null); };
  const body = el('div', {}, box('spec', 'Extinction, scattering, absorption panel'), box('hot', 'Hot-spot |E|² and |E|⁴ panel'), box('field', 'Near-field map (image)', field ? '' : '(not calculated yet)', !field), box('sweep', 'Gap sweep panel', sweep ? '' : '(press “Calculate gap sweep” first)', !sweep),
    el('div', { class: 'hint', text: 'Panels are data plots you can restyle like any other; the near-field map is placed as a picture. Ctrl+Z in the figure undoes the insert.' }));
  const m = D.modal({ title: 'Insert into the figure', sub: d.name || '', body, foot: [el('button', { class: 'btn primary', type: 'button', text: 'Insert', onclick: () => { m.close(); const n = PT.insert(o).length; ST().close(); RNBX.toast(n ? `${n} panel${n > 1 ? 's' : ''} inserted` : 'Nothing to insert yet'); } })] });
}
})();
