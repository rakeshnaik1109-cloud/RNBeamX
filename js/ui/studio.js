/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/studio.js
   Layer Studio: a full-screen workspace for thin-film and
   multilayer designs (MIM, MIMIM, Fabry–Pérot, Bragg mirrors,
   microcavities, Tamm structures, AR coatings, SPR chips).

   The design is a list of films from the top down, with repeat
   groups such as (TiO₂ / SiO₂) × 8, between the medium above and
   the substrate. Everything is calculated live with the exact
   transfer-matrix method (engine/thinfilm.js):
     · R, T, A against wavelength or angle,
     · |E|² through the stack and the power absorbed in each film,
     · a wavelength × angle map.
   "Insert" puts the design on the figure as a Multilayer stack
   (with a linked panel, a field profile and the map if wanted);
   a stack opened from the inspector is updated in place. The
   design keeps its groups in the stack (props.studio), so it
   reopens as it was built.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, lib = RNBX.lib;
const TF = () => RNBX.thinfilm;
const ST = RNBX.studio = {};
const KEY = 'rnbx-studio-v1';

/* ---------- materials: short names and drawing colours ---------- */
const SUB = { 2: '₂', 3: '₃', 4: '₄' };
const shortName = m => m === 'air' ? 'Air' : m === 'custom' ? 'Layer' : m === 'ema' ? 'Mixture' : m.startsWith('glass:') ? m.slice(6).replace('N-', '') : m.replace(/-IR$/, '').replace(/(\D)(\d)/g, (a, b, d) => b + (SUB[d] || d));
const COLORS = { Ag: '#b3bac4', 'Ag-IR': '#b3bac4', Au: '#d6a83a', 'Au-IR': '#d6a83a', Al: '#c9ced6', Cu: '#c8784a', Cr: '#8d939b', Ti: '#9aa0a8', Ni: '#a9a59a', Pt: '#c7c9cc', W: '#7d8189',
  SiO2: '#8fc9b9', TiO2: '#f0d27a', Al2O3: '#e8a13a', HfO2: '#c3a6e0', MgF2: '#bfe3f0', Si3N4: '#9fb7e3', 'Si3N4-IR': '#9fb7e3', ZnO: '#e9e3b0', ZnS: '#f2c7a5', CaF2: '#d6eef7',
  Si: '#6c7a89', Ge: '#59606b', H2O: '#bfdcf5', EtOH: '#d5e8f7', MeOH: '#d5e8f7', Acetone: '#dbe9f5', PDMS: '#d9ead3', PMMA: '#e6f0ea', air: '#ffffff', custom: '#c8c8c8' };
const colorOf = m => COLORS[m] || (String(m).startsWith('glass:') ? '#cfe6f2' : '#c8c8c8');
const layer = (mat, nm, extra) => Object.assign({ name: shortName(mat), color: colorOf(mat), mat, nm, tag: '' }, extra || {});
/* quarter-wave thickness of a material at a wavelength */
const qw = (mat, lam, f = 1, n) => U.round(f * lam / (4 * (mat === 'custom' ? +n || 1.5 : TF().nk({ mat }, lam).n)), 1);

/* ---------- designs ---------- */
const CALC = { scan: 'wl', lmin: 400, lmax: 1000, angle: 0, amin: 0, amax: 89, lambda: 633, pol: 'avg', show: 'RTA', points: 1201, unit: 'nm' };
const base = (name, items, extra) => Object.assign({
  name, ambient: 'air', ambientN: 1.33, side: 'top', substrate: layer('glass:N-BK7', 0, { name: 'Glass' }), items, lambda0: 600,
  calc: Object.assign({}, CALC), field: { nm: 633, angle: 0, pol: 's', show: true, scale: 'scale' }, map: { show: 'R', pol: 'p', lmin: 400, lmax: 1000, amin: 0, amax: 85, on: true },
}, extra || {});
const at = nm => ({ field: { nm, angle: 0, pol: 's', show: true, scale: 'scale' } });
const group = (repeat, items, name) => ({ group: true, repeat, name: name || 'Repeat', items });
const PRESETS = [
  { id: 'film', name: 'Single film on glass', make: () => base('Thin film', [layer('TiO2', 100)]) },
  { id: 'ar', name: 'Anti-reflection coating (λ/4 MgF₂)', make: () => base('AR coating', [layer('MgF2', qw('MgF2', 550))], { lambda0: 550 }) },
  { id: 'mim', name: 'MIM perfect absorber (Ni / SiO₂ / Al)', make: () => base('MIM absorber', [layer('Ni', 6, { tag: 'M₂' }), layer('SiO2', 120, { tag: 'I' }), layer('Al', 100, { tag: 'M₁' })], at(625)) },
  { id: 'mimim', name: 'MIMIM broadband absorber (two cavities)', make: () => base('MIMIM absorber', [layer('Ni', 5, { tag: 'M₃' }), layer('SiO2', 100, { tag: 'I₂' }), layer('Ni', 12, { tag: 'M₂' }), layer('SiO2', 100, { tag: 'I₁' }), layer('Al', 100, { tag: 'M₁' })], at(560)) },
  { id: 'mimag', name: 'MIM colour filter (Ag / SiO₂ / Ag)', make: () => base('MIM filter', [layer('Ag', 20, { tag: 'M₂' }), layer('SiO2', 160, { tag: 'I' }), layer('Ag', 100, { tag: 'M₁' })]) },
  { id: 'fp', name: 'Fabry–Pérot (metal mirrors)', make: () => base('Fabry–Pérot', [layer('Ag', 35), layer('SiO2', 250), layer('Ag', 35)]) },
  { id: 'dbr', name: 'Bragg mirror (TiO₂ / SiO₂) × 8', make: () => base('Bragg mirror', [group(8, [layer('TiO2', qw('TiO2', 600)), layer('SiO2', qw('SiO2', 600))], 'Pair')], at(600)) },
  // the high-index films face the cavity on both sides: (LH)ᴺ 2L (HL)ᴺ
  { id: 'cavity', name: 'Microcavity (Bragg – λ/2 – Bragg)', make: () => base('Microcavity', [group(5, [layer('SiO2', qw('SiO2', 600)), layer('TiO2', qw('TiO2', 600))], 'Top mirror'), layer('SiO2', qw('SiO2', 600, 2), { name: 'Cavity' }), group(5, [layer('TiO2', qw('TiO2', 600)), layer('SiO2', qw('SiO2', 600))], 'Bottom mirror')], at(600)) },
  { id: 'tamm', name: 'Tamm plasmon (Bragg mirror + Ag)', make: () => base('Tamm structure', [layer('Ag', 50), group(6, [layer('TiO2', qw('TiO2', 600)), layer('SiO2', qw('SiO2', 600))], 'Pair')], Object.assign({ side: 'bottom' }, at(671))) },
  { id: 'spr', name: 'SPR chip (Kretschmann, Au on Cr)', make: () => base('SPR chip', [layer('Au', 50), layer('Cr', 2)], { side: 'bottom', ambient: 'H2O', substrate: layer('glass:SF11', 0, { name: 'Prism' }),
    calc: Object.assign({}, CALC, { scan: 'angle', amin: 40, amax: 80, lambda: 633, pol: 'p', show: 'R' }), field: { nm: 633, angle: 55, pol: 'p', show: true, scale: 'scale' }, map: { show: 'R', pol: 'p', lmin: 500, lmax: 1000, amin: 40, amax: 80, on: true } }) },
];
ST.PRESETS = PRESETS;

/* films in the order top → bottom, repeats expanded */
const flat = items => items.reduce((a, it) => a.concat(it.group ? Array.from({ length: Math.max(1, Math.round(it.repeat) || 1) }, () => it.items).reduce((b, g) => b.concat(flat(g)), []) : [it]), []);
ST.flat = d => flat(d.items);
/* a film's material for the solver; a mixture (effective medium) carries its two parts */
const emaOf = l => { const e = l.ema || {}; return { a: { mat: e.a || 'SiO2', n: e.an, k: e.ak }, b: { mat: e.b || 'air', n: e.bn, k: e.bk }, f: e.f == null ? 0.3 : +e.f, model: e.model || 'bruggeman' }; };
const m = l => (l.mat === 'ema' ? { mat: 'ema', ema: emaOf(l) } : { mat: l.mat, n: l.n, k: l.k });
ST.EMA_DEFAULT = { a: 'SiO2', b: 'air', f: 0.3, model: 'bruggeman' };
/* roughness: a 50 % void Bruggeman layer between a film (or the substrate) and what lies above it */
const roughLayer = (below, above, nm, l) => ({ m: { mat: 'ema', ema: { a: below, b: above, f: 0.5, model: 'bruggeman' } }, d: nm, rough: true, l: { name: 'roughness', color: U.mix(l.color || colorOf(l.mat), '#ffffff', 0.55), mat: 'ema', nm } });
/* the films top → bottom as the solver sees them, roughness layers included */
const solverFilms = d => {
  const out = [];
  let above = { mat: d.ambient, n: d.ambientN, k: 0 };
  flat(d.items).filter(l => +l.nm > 0).forEach(l => { const ml = m(l); if (+l.rough > 0) out.push(roughLayer(ml, above, +l.rough, l)); out.push({ m: ml, d: +l.nm, l }); above = ml; });
  if (+d.substrate.rough > 0 && d.substrate.mat !== 'air') out.push(roughLayer(m(d.substrate), above, +d.substrate.rough, d.substrate));
  return out;
};
/* the stack the solver sees (same convention as the Multilayer stack part) */
ST.stack = d => {
  const films = solverFilms(d).map(f => ({ m: f.m, d: f.d }));
  const amb = { mat: d.ambient, n: d.ambientN, k: 0 }, sub = m(d.substrate);
  if (d.side === 'bottom') return { inc: sub, layers: films.slice().reverse(), sub: amb };
  const st = { inc: amb, layers: films, sub };
  // a thick substrate: its back side adds an incoherent reflection
  if (d.substrate.back && d.substrate.mat !== 'air') st.back = { d: (+d.substrate.thick || 1) * 1e6, exit: { mat: 'air' } };
  return st;
};
/* the stack of a Multilayer part made here (keeps roughness, mixtures and the substrate back side) */
ST.stackFromProps = p => {
  if (!p || !p.studio || !p.studio.items) return null;
  if (sig(ST.toProps(p.studio).layers) !== sig(p.layers || [])) return null;
  return ST.stack(Object.assign({}, p.studio, { ambient: p.ambient || 'air', ambientN: p.ambientN, side: p.side || 'top' }));
};

/* ---------- design ⇄ Multilayer stack part ---------- */
const drawnT = (films, mode) => {
  const mx = Math.max(1, ...films.map(l => +l.nm || 0));
  return films.map(l => mode === 'equal' ? 1.2 : mode === 'linear' ? U.clamp(+l.nm / mx * 4, 0.15, 6) : U.round(0.5 + 2.5 * Math.sqrt((+l.nm || 0) / mx), 2));
};
ST.toProps = (d, mode = 'compressed') => {
  const films = flat(d.items), t = drawnT(films, mode), air = d.substrate.mat === 'air';
  const lay = films.map((l, i) => ({ name: l.name, color: l.color, t: t[i], tag: l.tag || '', mat: l.mat, nm: +l.nm || 0, n: l.n, k: l.k, ema: l.ema, rough: l.rough })).reverse();
  if (!air) lay.unshift({ name: d.substrate.name, color: d.substrate.color, t: Math.max(3, Math.min(6, t.reduce((a, b) => a + b, 0) * 0.8)), tag: d.substrate.tag || '', mat: d.substrate.mat, nm: 0, n: d.substrate.n, k: d.substrate.k });
  return { layers: lay, ambient: d.ambient, ambientN: d.ambientN, side: d.side, bottomMode: air ? 'film' : 'semi', calc: Object.assign({}, d.calc), studio: U.deepClone(d) };
};
const sig = lay => JSON.stringify(lay.map(l => [l.mat, +l.nm || 0, l.n, l.k]));
ST.fromProps = p => {
  const L = p.layers || [], semi = p.bottomMode !== 'film';
  const sameFilms = p.studio && sig(ST.toProps(p.studio).layers) === sig(L);
  if (sameFilms) return Object.assign(U.deepClone(p.studio), { ambient: p.ambient || 'air', ambientN: p.ambientN, side: p.side || 'top', calc: Object.assign({}, CALC, p.calc) });
  const conv = l => ({ name: l.name || shortName(l.mat || lib.guessMat(l.name)), color: l.color || colorOf(l.mat), mat: l.mat || lib.guessMat(l.name), nm: +l.nm || 0, n: l.n, k: l.k, tag: l.tag || '' });
  const d = base('Stack', (semi ? L.slice(1) : L).slice().reverse().map(conv));
  d.substrate = semi && L[0] ? conv(L[0]) : layer('air', 0, { name: 'Air' });
  Object.assign(d, { ambient: p.ambient || 'air', ambientN: p.ambientN == null ? 1.33 : p.ambientN, side: p.side || 'top', calc: Object.assign({}, CALC, p.calc) });
  return d;
};

/* ---------- small helpers ---------- */
const niceStep = (span, target) => { const raw = span / Math.max(1, target), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; };
const ticks = (a, b, target) => { const st = niceStep(Math.abs(b - a) || 1, target), out = []; for (let v = Math.ceil(Math.min(a, b) / st) * st; v <= Math.max(a, b) + st * 1e-6; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v); return { st, out }; };
const fmt = (v, st) => { const dd = Math.max(0, -Math.floor(Math.log10(st) + 1e-9)); return v.toFixed(Math.min(4, dd)); };
const f1 = (v, d = 1) => (isFinite(v) ? (+v).toFixed(d) : '–');
const VIRIDIS = ['#440154', '#472c7a', '#3b518b', '#2c718e', '#21908d', '#27ad81', '#5cc863', '#aadc32', '#fde725'].map(U.hexToRgb);
const cmap = v => { const t = U.clamp(v, 0, 1) * (VIRIDIS.length - 1), i = Math.min(VIRIDIS.length - 2, Math.floor(t)), u = t - i, a = VIRIDIS[i], b = VIRIDIS[i + 1]; return [0, 1, 2].map(k => Math.round(a[k] + (b[k] - a[k]) * u)); };
const QCOL = { R: '#1f77b4', T: '#2ca02c', A: '#d62728' };
const QNAME = { R: 'Reflectance', T: 'Transmittance', A: 'Absorptance' };

/* an SVG chart in pixel units: { svg, X, Y, inv } */
const chart = o => {
  const w = o.w, h = o.h, fs = 11, L = 46, R = w - (o.rightPad || 12), T = 10, B = h - 34;
  const [x0, x1] = o.xr, [y0, y1] = o.yr;
  const X = v => L + (v - x0) / (x1 - x0 || 1) * (R - L), Y = v => B - (v - y0) / (y1 - y0 || 1) * (B - T);
  const xt = ticks(x0, x1, Math.max(3, Math.round((R - L) / 70))), yt = ticks(y0, y1, Math.max(3, Math.round((B - T) / 40)));
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="${fs}" class="st-chart">`;
  if (o.under) s += o.under(X, Y, L, R, T, B);
  s += `<defs><clipPath id="${o.id}-clip"><rect x="${L}" y="${T}" width="${R - L}" height="${B - T}"/></clipPath></defs><g clip-path="url(#${o.id}-clip)">`;
  (o.series || []).forEach(sr => { s += `<path d="M ${sr.x.map((v, i) => X(v).toFixed(1) + ' ' + Y(sr.y[i]).toFixed(1)).join(' L ')}" fill="none" stroke="${sr.color}" stroke-width="${sr.w || 1.6}" stroke-linejoin="round"/>`; });
  if (o.cross != null && o.cross >= Math.min(x0, x1) && o.cross <= Math.max(x0, x1)) s += `<line x1="${X(o.cross)}" y1="${T}" x2="${X(o.cross)}" y2="${B}" stroke="#d62728" stroke-dasharray="4 3" stroke-width="1"/>`;
  if (o.over) s += o.over(X, Y);
  s += '</g>';
  s += `<rect x="${L}" y="${T}" width="${R - L}" height="${B - T}" fill="none" stroke="currentColor" stroke-width="1"/>`;
  xt.out.forEach(v => { if (v < Math.min(x0, x1) - 1e-9 || v > Math.max(x0, x1) + 1e-9) return; s += `<line x1="${X(v)}" y1="${B}" x2="${X(v)}" y2="${B - 4}" stroke="currentColor"/><text x="${X(v)}" y="${B + 13}" text-anchor="middle" fill="currentColor">${fmt(v, xt.st)}</text>`; });
  yt.out.forEach(v => { if (v < Math.min(y0, y1) - 1e-9 || v > Math.max(y0, y1) + 1e-9) return; s += `<line x1="${L}" y1="${Y(v)}" x2="${L + 4}" y2="${Y(v)}" stroke="currentColor"/><text x="${L - 4}" y="${Y(v) + 4}" text-anchor="end" fill="currentColor">${fmt(v, yt.st)}</text>`; });
  s += `<text x="${(L + R) / 2}" y="${h - 4}" text-anchor="middle" fill="currentColor">${U.esc(o.xlabel)}</text>`;
  s += `<text transform="translate(12 ${(T + B) / 2}) rotate(-90)" text-anchor="middle" fill="currentColor">${U.esc(o.ylabel)}</text>`;
  if (o.legend) o.legend.forEach((g, i) => { const lx = R - 92, ly = T + 12 + i * 14; s += `<rect x="${lx - 4}" y="${ly - 9}" width="90" height="14" fill="var(--panel)" opacity="0.75"/><line x1="${lx}" y1="${ly - 3}" x2="${lx + 16}" y2="${ly - 3}" stroke="${g.color}" stroke-width="2"/><text x="${lx + 20}" y="${ly + 1}" fill="currentColor">${U.esc(g.name)}</text>`; });
  if (o.extra) s += o.extra(X, Y, L, R, T, B);
  return { svg: s + '</svg>', inv: px => x0 + (px - L) / (R - L) * (x1 - x0), invY: py => y0 + (B - py) / (B - T) * (y1 - y0), L, R, T, B };
};

/* ---------- state ---------- */
let d = null, target = null, root = null, undo = [], redo = [], lastKey = '', lastAt = 0, mapToken = 0, mapRes = null, sel = new Set();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* storage is optional */ } };
const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return v && v.items ? v : null; } catch (e) { return null; } };
/* record a step for Ctrl+Z (typing in one field counts as one step) */
const step = key => {
  const now = Date.now();
  if (!(key && key === lastKey && now - lastAt < 900)) { undo.push(JSON.stringify(d)); if (undo.length > 120) undo.shift(); redo = []; }
  lastKey = key || ''; lastAt = now;
};
const change = (fn, key, structural) => { step(key); fn(); save(); structural ? render() : refresh(); };

/* ---------- open / close ---------- */
ST.isOpen = () => !!root;
ST.mode = 'layers';
const PS = () => RNBX.patternStudio, PB = () => RNBX.partBuilder, PP = () => RNBX.particleStudio;
/* the workspace behind each tab other than Layers */
const WS = m => (m === 'pattern' ? PS() : m === 'part' ? PB() : m === 'particles' ? PP() : null);
ST.open = (obj, mode) => {
  if (root) ST.close();
  if (obj && obj.type === 'ucell') { ST.mode = 'pattern'; PS().load(obj); obj = null; } else if (obj && obj.type === 'built') { ST.mode = 'part'; PB().load(obj); obj = null; } else if (obj && obj.type === 'layers') ST.mode = 'layers'; else if (mode) ST.mode = mode;
  if (WS(ST.mode) && !WS(ST.mode).loaded()) WS(ST.mode).load(null);
  target = obj && obj.type === 'layers' ? obj : null;
  d = target ? ST.fromProps(target.props) : (d || load() || PRESETS.find(p => p.id === 'mim').make());
  undo = []; redo = []; sel = new Set();
  root = el('div', { class: 'studio', role: 'dialog', 'aria-label': 'Layer Studio' });
  document.body.append(root);
  document.addEventListener('keydown', onKey, true);
  render();
  U.track('studio-open');
};
ST.close = () => { if (!root) return; save(); if (PS()) PS().closed(); if (PB()) PB().closed(); if (PP()) PP().closed(); root.remove(); root = null; mapToken++; document.removeEventListener('keydown', onKey, true); };
ST.design = () => d;
ST.setDesign = v => { step(); d = v; save(); if (root) render(); };
const onKey = e => {
  if (!root) return;
  const typing = /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName);
  const ws = WS(ST.mode), un = ws ? ws.undo : doUndo, re = ws ? ws.redo : doRedo;
  if (ws && ws.key && ws.key(e, typing)) { e.stopPropagation(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.stopPropagation(); (e.shiftKey ? re : un)(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); e.stopPropagation(); re(); return; }
  if (e.key === 'Escape' && !document.querySelector('.modal-back')) { e.stopPropagation(); ST.close(); return; }
  // the figure's own shortcuts stay off while the studio is open
  if (!document.querySelector('.modal-back')) e.stopPropagation();
};
const doUndo = () => { if (!undo.length) return; redo.push(JSON.stringify(d)); d = JSON.parse(undo.pop()); lastKey = ''; save(); render(); };
const doRedo = () => { if (!redo.length) return; undo.push(JSON.stringify(d)); d = JSON.parse(redo.pop()); lastKey = ''; save(); render(); };

/* ---------- layout ---------- */
let views = {};
/* Layers | Pattern switch in the header */
ST.tabs = () => el('div', { class: 'seg st-tabs', role: 'tablist' }, [['layers', 'Layers'], ['pattern', 'Pattern'], ['particles', 'Particles'], ['part', 'Part']].map(([m, t]) =>
  el('button', { type: 'button', class: ST.mode === m ? 'active' : '', 'aria-selected': String(ST.mode === m), title: m === 'layers' ? 'Flat films and multilayers' : m === 'pattern' ? 'Periodic structures: gratings, metasurfaces (one unit cell)' : m === 'particles' ? 'Nanoparticles and dimers: exact Mie theory, near field, SERS hot spots' : 'Part Builder: draw your own component, give its faces an optical job, use it in the figure', text: t,
    onclick: () => { if (ST.mode === m) return; ST.mode = m; if (WS(m) && !WS(m).loaded()) WS(m).load(null); render(); } })));
ST.rerender = () => render();
function render() {
  if (!root) return;
  root.innerHTML = '';
  if (WS(ST.mode)) { root.setAttribute('aria-label', 'Layer Studio · ' + ST.mode); WS(ST.mode).render(root); return; }
  const presetBtn = el('button', { class: 'btn small', type: 'button', text: 'Start from ▾', onclick: ev => { const r = ev.currentTarget.getBoundingClientRect(); D.menu([{ title: 'Designs' }].concat(PRESETS.map(p => ({ label: p.name, action: () => { step(); d = p.make(); sel = new Set(); save(); render(); } }))), r.left, r.bottom + 4, ev.currentTarget); } });
  const name = el('input', { type: 'text', class: 'st-name', value: d.name || '', title: 'Name of the design', oninput: () => change(() => { d.name = name.value; }, 'name') });
  const head = el('div', { class: 'st-head' },
    el('div', { class: 'st-title' }, el('b', { text: 'Layer Studio' }), el('span', { class: 'st-sub', text: target ? 'editing a stack in the figure' : 'thin films and multilayers' })),
    ST.tabs(), name, presetBtn,
    D.iconBtn('undo', 'Undo (Ctrl+Z)', doUndo), D.iconBtn('redo', 'Redo (Ctrl+Y)', doRedo),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Open…', title: 'Open a saved design (.rnbxlayers.json)', onclick: openFile }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Save', title: 'Save this design as a file', onclick: saveFile }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'CSV', title: 'Spectrum, field profile and absorption per layer as CSV', onclick: csv }),
    el('span', { class: 'st-grow' }),
    el('button', { class: 'btn primary', type: 'button', text: target ? 'Update the stack' : 'Insert into figure', onclick: insertDialog }),
    D.iconBtn('close', 'Close (Esc): the design is kept for next time', ST.close));
  views = { list: el('div', { class: 'st-list' }), cross: el('div', { class: 'st-cross' }), spec: el('div', { class: 'st-spec' }), map: el('div', { class: 'st-map' }), absorb: el('div', { class: 'st-absorb' }), modes: el('div', { class: 'st-modes' }) };
  const left = el('section', { class: 'st-col st-left' }, el('h4', { text: 'Structure' }), sideControls(), views.list, substrateRow(), el('div', { class: 'hint', text: 'Top of the list = top of the stack. ⧉ duplicates, ↑↓ move, λ/4 sets a quarter-wave thickness at the design wavelength. Tick films and press “Repeat” for a periodic group.' }));
  const mid = el('section', { class: 'st-col st-mid' }, el('h4', { text: 'Cross-section and field |E|²' }), fieldControls(), views.cross, views.absorb, el('h4', { text: 'Guided modes' }), modeControls(), views.modes);
  const right = el('section', { class: 'st-col st-right' }, el('h4', { text: 'Optical response' }), specControls(), views.spec, el('h4', { text: 'Wavelength × angle map' }), mapControls(), views.map, el('h4', { text: 'Fit to a measurement' }), RNBX.layerFit ? RNBX.layerFit.panel() : null);
  root.append(head, el('div', { class: 'st-body' }, left, mid, right));
  buildList();
  refresh();
}

/* labelled control */
const fld = (label, input, wide) => el('label', { class: 'st-f' + (wide ? ' wide' : '') }, el('span', { text: label }), input);
const num = (get, set, o = {}) => { const i = el('input', { type: 'number', value: get(), step: o.step || 1, min: o.min, max: o.max, oninput: () => { const v = parseFloat(i.value); if (isFinite(v)) change(() => set(o.min != null ? Math.max(o.min, o.max != null ? Math.min(o.max, v) : v) : v), o.key || Math.random()); } }); return i; };
const sel1 = (opts, get, set, key, structural) => { const s = el('select', { onchange: () => change(() => set(s.value), key, structural) }, opts.map(q => el('option', { value: q[0], text: q[1], disabled: !!q[2] }))); s.value = get(); return s; };
const matSelect = (get, set, key, films) => sel1(films ? TF().options().concat([['ema', 'Mixture / porous film (effective medium)']]) : TF().options(), get, set, key, true);
/* the two parts of a mixture, the fraction of B and the model */
const emaRow = l => {
  l.ema = Object.assign({}, ST.EMA_DEFAULT, l.ema || {});
  const e = l.ema, mats = TF().options(false);
  return el('div', { class: 'st-row2 st-ema' },
    el('span', { text: 'A' }), sel1(mats, () => e.a, v => { e.a = v; }, 'ea' + Math.random(), true),
    el('span', { text: '+ B' }), sel1(mats, () => e.b, v => { e.b = v; }, 'eb' + Math.random(), true),
    num(() => U.round((e.f || 0) * 100, 2), v => { e.f = U.clamp(v / 100, 0, 1); }, { min: 0, max: 100, step: 1, key: 'ef' + Math.random() }), el('span', { class: 'hint', style: { margin: 0 }, text: '% B' }),
    sel1(TF().EMA_MODELS, () => e.model, v => { e.model = v; }, 'em' + Math.random()));
};

function sideControls() {
  const amb = sel1(TF().options(false), () => d.ambient, v => { d.ambient = v; }, 'amb', true);
  const kids = [fld('Light arrives from', sel1([['top', 'Above'], ['bottom', 'Below (through the substrate)']], () => d.side, v => { d.side = v; }, 'side', true)), fld('Medium above', amb)];
  if (d.ambient === 'custom') kids.push(fld('Its index n', num(() => d.ambientN, v => { d.ambientN = v; }, { step: 0.001, min: 1, key: 'ambn' })));
  kids.push(fld('Design wavelength λ₀ (nm)', num(() => d.lambda0, v => { d.lambda0 = v; }, { min: 100, max: 30000, key: 'l0' })));
  return el('div', { class: 'st-grid' }, ...kids);
}
function substrateRow() {
  const s = d.substrate;
  const c = el('input', { type: 'color', value: (s.color || '#cccccc').slice(0, 7), oninput: () => change(() => { s.color = c.value; }, 'subc') });
  const nmI = el('input', { type: 'text', value: s.name || '', oninput: () => change(() => { s.name = nmI.value; }, 'subn') });
  const ms = matSelect(() => s.mat, v => { s.mat = v; s.name = shortName(v); s.color = colorOf(v); }, 'subm');
  const card = el('div', { class: 'st-layer st-sub' }, el('div', { class: 'st-row' }, c, nmI, ms), el('div', { class: 'st-row2' }, el('span', { class: 'hint', style: { margin: 0 }, text: s.mat === 'air' ? 'No substrate: a free-standing film' : s.back && d.side !== 'bottom' ? 'Substrate (thick: both faces count)' : 'Substrate (thick, semi-infinite)' })));
  if (s.mat === 'custom') card.append(nkRow(s));
  if (s.mat !== 'air') {
    const rough = num(() => s.rough || 0, v => { s.rough = Math.max(0, v); }, { min: 0, max: 1000, step: 0.5, key: 'subr' });
    rough.className = 'st-rough'; rough.title = 'Roughness of the substrate surface (nm)';
    const back = el('input', { type: 'checkbox', checked: !!s.back, disabled: d.side === 'bottom', onchange: () => change(() => { s.back = back.checked; }, null, true) });
    const row = el('div', { class: 'st-row2' }, el('span', { class: 'hint', style: { margin: 0 }, text: 'rough' }), rough, el('span', { class: 'hint', style: { margin: 0 }, text: 'nm' }),
      el('label', { class: 'st-f row', title: 'Adds the reflection from the back face of a thick substrate (incoherent: no fringes). Off = the substrate continues for ever, as an index-matched or roughened back.' }, back, el('span', { text: 'Back-side reflection' })));
    if (s.back && d.side !== 'bottom') row.append(num(() => s.thick || 1, v => { s.thick = Math.max(0.001, v); }, { min: 0.001, max: 100, step: 0.1, key: 'subt' }), el('span', { class: 'hint', style: { margin: 0 }, text: 'mm thick' }));
    card.append(row);
  }
  return el('div', {}, el('div', { class: 'st-cap', text: 'Substrate' }), card);
}
const nkRow = l => el('div', { class: 'st-row2' }, el('span', { text: 'n' }), num(() => l.n == null ? 1.5 : l.n, v => { l.n = v; }, { step: 0.001, key: 'n' + Math.random() }), el('span', { text: 'k' }), num(() => l.k || 0, v => { l.k = Math.max(0, v); }, { step: 0.001, min: 0, key: 'k' + Math.random() }));

/* ---------- the layer list ---------- */
const moveIn = (arr, i, dir) => { const j = i + dir; if (j < 0 || j >= arr.length) return; arr.splice(j, 0, arr.splice(i, 1)[0]); };
function layerCard(l, arr, i, inGroup) {
  const k = 'L' + (inGroup ? 'g' : '') + i + Math.random().toString(36).slice(2, 5);
  const c = el('input', { type: 'color', value: (l.color || '#cccccc').slice(0, 7), title: 'Colour in the drawing', oninput: () => change(() => { l.color = c.value; }, k + 'c') });
  const nmI = el('input', { type: 'text', value: l.name || '', title: 'Name', oninput: () => change(() => { l.name = nmI.value; }, k + 'n') });
  const ms = matSelect(() => l.mat, v => { if (l.name === shortName(l.mat) || !l.name) l.name = v === 'ema' ? 'Porous film' : shortName(v); if ((l.color || '').toLowerCase() === colorOf(l.mat)) l.color = colorOf(v); l.mat = v; if (v === 'ema' && !l.ema) l.ema = Object.assign({}, ST.EMA_DEFAULT); }, k + 'm', true);
  const rough = num(() => l.rough || 0, v => { l.rough = Math.max(0, v); }, { min: 0, max: 1000, step: 0.5, key: k + 'r' });
  rough.className = 'st-rough'; rough.title = 'Roughness of the top surface (nm): a 50 % void Bruggeman layer above the film';
  const th = num(() => l.nm, v => { l.nm = Math.max(0, v); }, { min: 0, max: 1e6, key: k + 't' });
  th.title = 'Real thickness (nm)';
  const tag = el('input', { type: 'text', value: l.tag || '', placeholder: 'tag', title: 'Tag for the layer key, e.g. M₁', class: 'st-tag', oninput: () => change(() => { l.tag = tag.value; }, k + 'g') });
  const chk = inGroup ? null : el('input', { type: 'checkbox', title: 'Select for a repeat group', checked: sel.has(l), onchange: () => { chk.checked ? sel.add(l) : sel.delete(l); grpBtn(); } });
  const row2 = el('div', { class: 'st-row2' }, th, el('span', { class: 'hint', style: { margin: 0 }, text: 'nm' }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'λ/4', title: 'Quarter-wave thickness at λ₀', onclick: () => change(() => { l.nm = qw(l.mat, d.lambda0, 1, l.n); }, null, true) }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'λ/2', title: 'Half-wave thickness at λ₀', onclick: () => change(() => { l.nm = qw(l.mat, d.lambda0, 2, l.n); }, null, true) }),
    tag, el('span', { class: 'hint', style: { margin: 0 }, text: 'rough' }), rough, el('span', { class: 'st-grow' }), chk,
    D.iconBtn('up', 'Move up', () => change(() => moveIn(arr, i, -1), null, true)),
    D.iconBtn('down', 'Move down', () => change(() => moveIn(arr, i, 1), null, true)),
    el('button', { class: 'icon-btn', type: 'button', text: '⧉', title: 'Duplicate', onclick: () => change(() => arr.splice(i + 1, 0, U.deepClone(l)), null, true) }),
    D.iconBtn('trash', 'Remove', () => change(() => { arr.splice(i, 1); sel.delete(l); }, null, true)));
  const card = el('div', { class: 'st-layer' }, el('div', { class: 'st-row' }, c, nmI, ms), row2);
  if (l.mat === 'custom') card.append(nkRow(l));
  if (l.mat === 'ema') card.append(emaRow(l));
  return card;
}
let grpEl = null;
const grpBtn = () => { if (grpEl) grpEl.disabled = sel.size < 1; };
function buildList() {
  const host = views.list; host.innerHTML = '';
  host.append(el('div', { class: 'st-cap', text: 'Medium above: ' + TF().name(d.ambient) }));
  d.items.forEach((it, i) => {
    if (!it.group) { host.append(layerCard(it, d.items, i, false)); return; }
    const rep = num(() => it.repeat, v => { it.repeat = Math.round(v); }, { min: 1, max: 60, key: 'rep' + i });
    rep.className = 'st-rep';
    const gname = el('input', { type: 'text', value: it.name || '', class: 'st-gname', oninput: () => change(() => { it.name = gname.value; }, 'gn' + i) });
    const box = el('div', { class: 'st-group' },
      el('div', { class: 'st-ghead' }, gname, el('span', { text: '×', title: 'repeats' }), rep, el('span', { class: 'st-grow' }),
        el('button', { class: 'btn small ghost', type: 'button', text: '+ film', title: 'Add a film to the period', onclick: () => change(() => it.items.push(layer('SiO2', 100)), null, true) }),
        D.iconBtn('up', 'Move up', () => change(() => moveIn(d.items, i, -1), null, true)),
        D.iconBtn('down', 'Move down', () => change(() => moveIn(d.items, i, 1), null, true)),
        el('button', { class: 'btn small ghost', type: 'button', text: 'Ungroup', title: 'Write the repeats out as separate films', onclick: () => change(() => d.items.splice(i, 1, ...U.deepClone(flat([it]))), null, true) }),
        D.iconBtn('trash', 'Remove the group', () => change(() => d.items.splice(i, 1), null, true))));
    it.items.forEach((l, j) => box.append(layerCard(l, it.items, j, true)));
    host.append(box);
  });
  grpEl = el('button', { class: 'btn small', type: 'button', text: 'Repeat ticked', title: 'Put the ticked films in a group that repeats N times', disabled: sel.size < 1, onclick: () => change(() => {
    const idx = d.items.map((it, i) => (sel.has(it) ? i : -1)).filter(i => i >= 0);
    if (!idx.length) return;
    const g = group(4, idx.map(i => d.items[i]), 'Period');
    for (let k = idx.length - 1; k >= 0; k--) d.items.splice(idx[k], 1);
    d.items.splice(idx[0], 0, g); sel = new Set();
  }, null, true) });
  host.append(el('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', margin: '6px 0' } },
    el('button', { class: 'btn small primary', type: 'button', text: '+ Film at the bottom', onclick: () => change(() => d.items.push(layer('SiO2', 100)), null, true) }),
    el('button', { class: 'btn small', type: 'button', text: '+ Film on top', onclick: () => change(() => d.items.unshift(layer('Ag', 20)), null, true) }), grpEl));
}

/* ---------- controls of the three views ---------- */
function fieldControls() {
  const f = d.field;
  return el('div', { class: 'st-grid' },
    fld('Wavelength (nm)', num(() => f.nm, v => { f.nm = v; }, { min: 100, max: 30000, key: 'fnm' })),
    fld('Angle (°)', num(() => f.angle, v => { f.angle = v; }, { min: 0, max: 89.9, step: 0.5, key: 'fan' })),
    fld('Polarisation', sel1([['s', 's (TE)'], ['p', 'p (TM)'], ['avg', 'Unpolarised']], () => f.pol, v => { f.pol = v; }, 'fpol')),
    fld('Drawing', sel1([['scale', 'To scale (thin films widened)'], ['equal', 'Equal heights']], () => f.scale, v => { f.scale = v; }, 'fsc')),
    el('label', { class: 'st-f row' }, el('input', { type: 'checkbox', checked: f.show, onchange: e => change(() => { f.show = e.target.checked; }) }), el('span', { text: 'Show |E|²' })));
}
function specControls() {
  const c = d.calc, wl = c.scan === 'wl';
  const kids = [fld('Against', sel1([['wl', 'Wavelength'], ['angle', 'Angle']], () => c.scan, v => { c.scan = v; }, 'scan', true))];
  if (wl) kids.push(fld('From (nm)', num(() => c.lmin, v => { c.lmin = v; }, { min: 100, key: 'lmin' })), fld('To (nm)', num(() => c.lmax, v => { c.lmax = v; }, { min: 100, key: 'lmax' })), fld('Angle (°)', num(() => c.angle, v => { c.angle = v; }, { min: 0, max: 89.9, step: 0.5, key: 'cang' })));
  else kids.push(fld('From (°)', num(() => c.amin, v => { c.amin = v; }, { min: 0, max: 89.9, key: 'amin' })), fld('To (°)', num(() => c.amax, v => { c.amax = v; }, { min: 0, max: 89.9, key: 'amax' })), fld('Wavelength (nm)', num(() => c.lambda, v => { c.lambda = v; }, { min: 100, key: 'clam' })));
  kids.push(fld('Polarisation', sel1([['avg', 'Unpolarised'], ['p', 'p (TM)'], ['s', 's (TE)']], () => c.pol, v => { c.pol = v; }, 'cpol')),
    fld('Curves', sel1([['RTA', 'R, T, A'], ['R', 'R'], ['T', 'T'], ['A', 'A'], ['RT', 'R, T'], ['RA', 'R, A'], ['PD', 'Ψ, Δ (ellipsometry)']], () => c.show, v => { c.show = v; if (v === 'PD' && c.scan === 'wl' && !(+c.angle > 0)) c.angle = 70; }, 'cshow', true)),
    fld('Points', sel1([['301', '301'], ['1201', '1201'], ['4001', '4001 (sharp modes)']], () => String(c.points || 1201), v => { c.points = +v; }, 'cpts')));
  return el('div', { class: 'st-grid' }, ...kids);
}
function mapControls() {
  const mp = d.map;
  return el('div', { class: 'st-grid' },
    el('label', { class: 'st-f row' }, el('input', { type: 'checkbox', checked: mp.on, onchange: e => change(() => { mp.on = e.target.checked; }, null, true) }), el('span', { text: 'On' })),
    fld('Show', sel1([['R', 'R'], ['T', 'T'], ['A', 'A']], () => mp.show, v => { mp.show = v; }, 'mshow')),
    fld('Polarisation', sel1([['p', 'p (TM)'], ['s', 's (TE)'], ['avg', 'Unpolarised']], () => mp.pol, v => { mp.pol = v; }, 'mpol')),
    fld('λ from', num(() => mp.lmin, v => { mp.lmin = v; }, { min: 100, key: 'mlmin' })), fld('λ to', num(() => mp.lmax, v => { mp.lmax = v; }, { min: 100, key: 'mlmax' })),
    fld('θ from', num(() => mp.amin, v => { mp.amin = v; }, { min: 0, max: 89, key: 'mamin' })), fld('θ to', num(() => mp.amax, v => { mp.amax = v; }, { min: 1, max: 89.9, key: 'mamax' })));
}

/* ---------- guided modes ---------- */
const MD = () => (d.modes = Object.assign({ nm: d.field.nm || 633, pol: 'both', prism: 1.78, ain: 0, sel: 0, disp: false }, d.modes || {}));
function modeControls() {
  const o = MD();
  return el('div', { class: 'st-grid' },
    fld('Wavelength (nm)', num(() => o.nm, v => { o.nm = v; }, { min: 100, max: 30000, key: 'mnm' })),
    fld('Modes', sel1([['both', 'TE and TM'], ['s', 'TE (s)'], ['p', 'TM (p)']], () => o.pol, v => { o.pol = v; }, 'mpol')),
    fld('Prism index (coupling)', num(() => o.prism, v => { o.prism = v; }, { min: 1, max: 5, step: 0.01, key: 'mpr' })),
    fld('Grating: incidence (°)', num(() => o.ain, v => { o.ain = v; }, { min: -89, max: 89, step: 1, key: 'main' })),
    el('label', { class: 'st-f row' }, el('input', { type: 'checkbox', checked: !!o.disp, onchange: e => change(() => { o.disp = e.target.checked; }) }), el('span', { text: 'n_eff against wavelength' })));
}
ST.modesOf = (dd = d, nm, pol) => {
  const st = ST.stack(dd), out = [];
  (pol === 'both' ? ['s', 'p'] : [pol]).forEach(p => out.push(...TF().modes(st, nm, p)));
  // number the modes per polarisation: TE0, TE1 … (highest n_eff first)
  ['s', 'p'].forEach(p => out.filter(m => m.pol === p).sort((a, b) => b.n[0] - a.n[0]).forEach((m, i) => { m.name = (p === 's' ? 'TE' : 'TM') + i; }));
  return out.sort((a, b) => b.n[0] - a.n[0]);
};
const lenTxt = L => (!isFinite(L) ? 'lossless' : L >= 1e6 ? f1(L / 1e6, 2) + ' mm' : L >= 1e3 ? f1(L / 1e3, 1) + ' µm' : f1(L, 0) + ' nm');
let modeTok = 0;
function drawModes() {
  const host = views.modes, o = MD(), tok = ++modeTok; if (!host) return;
  host.innerHTML = '<div class="hint">Searching for modes…</div>';
  setTimeout(() => {
    if (tok !== modeTok || !root) return;
    let ms;
    try { ms = ST.modesOf(d, o.nm, o.pol); } catch (e) { host.textContent = 'Mode search failed: ' + e.message; return; }
    host.innerHTML = '';
    if (!ms.length) { host.append(el('div', { class: 'hint', text: `No guided mode at ${o.nm} nm: no film has a higher index than both sides, and no metal surface carries a plasmon. (Leaky modes, below the cladding index, are not listed.)` })); if (o.disp) drawDispersion(host); return; }
    o.sel = Math.min(o.sel || 0, ms.length - 1);
    const sinI = Math.sin(o.ain * Math.PI / 180), rows = ms.map((m, i) => {
      const ne = m.n[0], th = ne < o.prism ? Math.asin(ne / o.prism) * 180 / Math.PI : NaN, per = o.nm / (ne - sinI);
      return el('tr', { class: i === o.sel ? 'st-sel' : '', style: { cursor: 'pointer' }, onclick: () => { o.sel = i; save(); drawModes(); } },
        el('td', { html: `<b>${m.name}</b>` }), el('td', { text: ne.toFixed(5) + (m.n[1] > 0 ? ` + ${m.n[1].toExponential(2)}i` : '') }), el('td', { text: lenTxt(m.Lprop) }),
        el('td', { text: isFinite(th) ? f1(th, 2) + '°' : '—' }), el('td', { text: per > 0 && isFinite(per) ? f1(per, 1) + ' nm' : '—' }));
    });
    host.append(el('table', { class: 'st-tab' }, el('tr', {}, ...['Mode', 'n_eff', 'Propagation length (1/e power)', `Prism coupling angle (n = ${o.prism})`, `Grating period (1st order, ${o.ain}°)`].map(t => el('th', { text: t }))), ...rows));
    // profile of the chosen mode
    const m = ms[o.sel], st = ST.stack(d), fr = TF().modeField(st, o.nm, m), w = Math.max(300, host.clientWidth || 440), lo = lightOrder();
    const bands = []; let z0 = 0; lo.films.forEach(l => { bands.push([z0, z0 + +l.nm, l.color || colorOf(l.mat)]); z0 += +l.nm; });
    const ch = chart({ id: 'st-mode', w, h: 200, xr: [fr.z[0], fr.z[fr.z.length - 1]], yr: [0, 1.05], xlabel: 'Depth z (nm), light-entry side at 0', ylabel: m.pol === 'p' ? '|H_y|² (norm.)' : '|E_y|² (norm.)',
      under: (X, Y, L, R, T, B) => bands.map(b => `<rect x="${X(b[0])}" y="${T}" width="${Math.max(0.5, X(b[1]) - X(b[0]))}" height="${B - T}" fill="${b[2]}" fill-opacity="0.45"/>`).join(''),
      series: [{ x: fr.z, y: fr.f, color: m.pol === 'p' ? '#d62728' : '#1f77b4', w: 1.8 }] });
    host.append(el('div', { html: ch.svg }), el('div', { class: 'hint', text: `${m.name}: n_eff = ${m.n[0].toFixed(5)}${m.n[1] > 0 ? ` + ${m.n[1].toExponential(3)}i (lossy; propagation length ${lenTxt(m.Lprop)})` : ''}. The mode decays into both sides. Prism coupling (Otto / Kretschmann, attenuated total reflection) at sin θ = n_eff / n_prism; a grating couples it when n_eff = sin θ + λ/Λ. Exact zeros of the transfer-matrix dispersion relation; roughness layers and mixtures included.` }));
    if (o.disp) drawDispersion(host);
  }, 20);
}
function drawDispersion(host) {
  const o = MD(), c = d.calc, lo = Math.min(c.lmin, c.lmax), hi = Math.max(c.lmin, c.lmax), pts = { s: [], p: [] };
  for (let i = 0; i <= 30; i++) { const lam = lo + (hi - lo) * i / 30; ST.modesOf(d, lam, o.pol).forEach(m => pts[m.pol].push([lam, m.n[0]])); }
  const all = pts.s.concat(pts.p); if (!all.length) return;
  const y0 = Math.min(...all.map(q => q[1])), y1 = Math.max(...all.map(q => q[1])), pad = (y1 - y0) * 0.08 || 0.05, w = Math.max(300, host.clientWidth || 440);
  const dots = (X, Y) => ['s', 'p'].map(p => pts[p].map(q => `<circle cx="${X(q[0])}" cy="${Y(q[1])}" r="2.2" fill="${p === 's' ? '#1f77b4' : '#d62728'}"/>`).join('')).join('');
  const ch = chart({ id: 'st-disp', w, h: 200, xr: [lo, hi], yr: [y0 - pad, y1 + pad], xlabel: 'Wavelength (nm)', ylabel: 'n_eff', over: dots, legend: [{ name: 'TE', color: '#1f77b4' }, { name: 'TM', color: '#d62728' }] });
  host.append(el('div', { html: ch.svg }), el('div', { class: 'hint', text: `Guided modes from ${lo} to ${hi} nm (the Optical response range), 31 wavelengths.` }));
}

/* ---------- calculations ---------- */
ST.fieldOf = (dd = d) => {
  const st = ST.stack(dd), f = dd.field;
  if (f.pol !== 'avg') return TF().field(st, f.nm, f.angle, f.pol);
  const a = TF().field(st, f.nm, f.angle, 's'), b = TF().field(st, f.nm, f.angle, 'p');
  return Object.assign({}, a, { e2: a.e2.map((v, i) => (v + b.e2[i]) / 2), absorbed: a.absorbed.map((v, i) => (v + b.absorbed[i]) / 2), R: (a.R + b.R) / 2 });
};
const lightOrder = () => {
  const films = solverFilms(d).map(f => f.l), amb = { name: TF().name(d.ambient), color: colorOf(d.ambient), mat: d.ambient };
  return d.side === 'bottom' ? { inc: d.substrate, films: films.slice().reverse(), sub: amb } : { inc: amb, films, sub: d.substrate };
};

let refreshT = 0;
function refresh() {
  if (!root) return;
  clearTimeout(refreshT);
  refreshT = setTimeout(() => { drawSpectrum(); drawCross(); scheduleMap(); drawModes(); }, 30);
}

/* spectrum */
function drawSpectrum() {
  const c = d.calc, host = views.spec, w = Math.max(280, host.clientWidth || 420), h = 230;
  let res;
  try { res = TF().scan(ST.stack(d), c); } catch (e) { host.textContent = 'Calculation failed: ' + e.message; return; }
  if (res.ellips) { drawEllips(res); return; }
  const q = c.show.split('').filter(v => QCOL[v]), wl = c.scan === 'wl';
  const cross = wl ? (Math.abs((+d.field.angle || 0) - (+c.angle || 0)) < 1e-6 ? d.field.nm : null) : (Math.abs(d.field.nm - c.lambda) < 1e-6 ? d.field.angle : null);
  // a loaded measurement on the same axis (Fit to a measurement)
  const ov = RNBX.layerFit && RNBX.layerFit.overlay(), showOv = ov && ov.y && ov.angle === !wl;
  const ovSeries = showOv ? [{ x: ov.x.map(v => (wl && c.unit === 'um' ? v / 1000 : v)), y: ov.y, color: '#555555', w: 1.1 }] : [];
  const leg = q.map(k => ({ name: QNAME[k], color: QCOL[k] })).concat(showOv ? [{ name: 'Measured ' + ov.q, color: '#555555' }] : []);
  const ch = chart({ id: 'st-spec', w, h, xr: [res.x[0], res.x[res.x.length - 1]], yr: [0, 1], xlabel: res.xlabel, ylabel: q.length === 1 ? QNAME[q[0]] : 'R, T, A',
    series: ovSeries.concat(q.map(k => ({ x: res.x, y: res.series[k], color: QCOL[k] }))), legend: q.length > 1 || showOv ? leg : null, cross });
  host.innerHTML = ch.svg;
  const sum = TF().summary(res);
  host.append(el('div', { class: 'readout', html: (sum.length ? sum.map(U.esc).join('<br>') : 'No dip or peak inside this range.') + (res.warn.length ? `<br><span style="color:var(--danger)">Outside the measured data: ${U.esc(res.warn.join(', '))}</span>` : '') + `<br><span class="hint" style="margin:0">Click the curve to see the field at that ${wl ? 'wavelength' : 'angle'}.</span>` }));
  const svg = host.querySelector('svg');
  svg.style.cursor = 'crosshair';
  svg.onclick = e => { const r = svg.getBoundingClientRect(), v = ch.inv((e.clientX - r.left) * w / r.width); change(() => { if (wl) { d.field.nm = U.round(v, 1); d.field.angle = +c.angle || 0; } else { d.field.angle = U.round(U.clamp(v, 0, 89.9), 2); d.field.nm = +c.lambda; } }, null, true); };
}

/* ellipsometry: Ψ on the left axis (0–90°), Δ on the right (0–360°, drawn at a quarter scale) */
function drawEllips(res) {
  const c = d.calc, host = views.spec, w = Math.max(280, host.clientWidth || 420), h = 230, wl = c.scan === 'wl';
  const ov = RNBX.layerFit && RNBX.layerFit.overlay(), showOv = ov && ov.angle === !wl && (ov.q === 'PD' || ov.q === 'P' || ov.q === 'D');
  const ovS = [];
  if (showOv) { const x = ov.x.map(v => (wl && c.unit === 'um' ? v / 1000 : v)); if (ov.psi) ovS.push({ x, y: ov.psi, color: '#555555', w: 1.1 }); if (ov.delta) ovS.push({ x, y: ov.delta.map(v => v / 4), color: '#999999', w: 1.1 }); }
  const ch = chart({ id: 'st-spec', w, h, rightPad: 40, xr: [res.x[0], res.x[res.x.length - 1]], yr: [0, 90], xlabel: res.xlabel, ylabel: 'Ψ (°)',
    series: ovS.concat([{ x: res.x, y: res.series.P, color: '#6a3d9a' }, { x: res.x, y: res.series.D.map(v => v / 4), color: '#e08214' }]),
    legend: [{ name: 'Ψ', color: '#6a3d9a' }, { name: 'Δ (right axis)', color: '#e08214' }].concat(showOv ? [{ name: 'Measured', color: '#555555' }] : []),
    extra: (X, Y, L, R, T, B) => [0, 90, 180, 270, 360].map(v => `<line x1="${R}" y1="${Y(v / 4)}" x2="${R - 4}" y2="${Y(v / 4)}" stroke="currentColor"/><text x="${R + 4}" y="${Y(v / 4) + 4}" fill="#e08214">${v}</text>`).join('') + `<text transform="translate(${w - 6} ${(T + B) / 2}) rotate(90)" text-anchor="middle" fill="#e08214">Δ (°)</text>` });
  host.innerHTML = ch.svg;
  const at = wl ? `${f1(c.angle, 1)}°` : `${f1(c.lambda, 0)} nm`;
  host.append(el('div', { class: 'readout', html: `Spectroscopic ellipsometry at ${at}: ρ = r<sub>p</sub>/r<sub>s</sub> = tan Ψ · e<sup>iΔ</sup> (Δ = 180° for a bare dielectric below Brewster's angle). Reflection from the front only: the back side of a thick substrate is taken as suppressed.` + (res.warn.length ? `<br><span style="color:var(--danger)">Outside the measured data: ${U.esc(res.warn.join(', '))}</span>` : '') }));
}

/* cross-section with |E|² */
function drawCross() {
  const host = views.cross, w = Math.max(300, host.clientWidth || 460), h = 420;
  const f = d.field, o = lightOrder();
  let fr;
  try { fr = ST.fieldOf(); } catch (e) { host.textContent = 'Calculation failed: ' + e.message; return; }
  const total = fr.total, pad = fr.z[0] < 0 ? -fr.z[0] : 0;
  // bands in light order: incident medium, films, substrate
  const bands = [{ z0: -pad, z1: 0, l: o.inc, semi: true }].concat(o.films.map((l, i) => { const z0 = o.films.slice(0, i).reduce((a, q) => a + +q.nm, 0); return { z0, z1: z0 + +l.nm, l, i }; }), [{ z0: total, z1: total + pad, l: o.sub, semi: true }]);
  const top = 14, bot = h - 34, avail = bot - top;
  let ys;
  if (f.scale === 'equal') { const n = bands.length, hb = avail / (n - 2 + 2 * 1.2); let y = top; ys = bands.map((b, i) => { const hh = (i === 0 || i === n - 1) ? hb * 1.2 : hb, r = [y, y + hh]; y += hh; return r; }); }
  else {
    // to scale, but a film is never thinner than 9 px (the others give way)
    const hs = bands.map(b => b.z1 - b.z0), minH = Math.min(9, avail / bands.length * 0.8);
    let k = avail / (hs.reduce((a, b) => a + b, 0) || 1);
    for (let it = 0; it < 6; it++) { const small = hs.filter(v => v * k < minH), rest = hs.filter(v => v * k >= minH).reduce((a, b) => a + b, 0); k = (avail - small.length * minH) / (rest || 1); }
    let y = top; ys = hs.map(v => { const hh = Math.max(minH, v * k), r = [y, y + hh]; y += hh; return r; });
  }
  const flip = d.side === 'bottom', Yf = y => (flip ? top + bot - y : y);
  const zToY = z => { for (let i = 0; i < bands.length; i++) { const b = bands[i]; if (z <= b.z1 + 1e-9 || i === bands.length - 1) { const u = (z - b.z0) / ((b.z1 - b.z0) || 1); return Yf(ys[i][0] + U.clamp(u, 0, 1) * (ys[i][1] - ys[i][0])); } } return Yf(bot); };
  const L = 8, R = w - 8, fx0 = w * 0.42, fx1 = R - 6, mx = Math.max(1e-9, ...fr.e2), xm = niceStep(mx, 4) * Math.ceil(mx / niceStep(mx, 4));
  let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" font-family="Arial, Helvetica, sans-serif" font-size="11" class="st-chart">`;
  bands.forEach((b, i) => {
    const y0 = Math.min(Yf(ys[i][0]), Yf(ys[i][1])), y1 = Math.max(Yf(ys[i][0]), Yf(ys[i][1])), hh = y1 - y0, col = b.l.color || colorOf(b.l.mat);
    s += `<rect x="${L}" y="${y0}" width="${R - L}" height="${Math.max(0.6, hh)}" fill="${col}" ${b.semi ? 'fill-opacity="0.35"' : ''} stroke="#00000033" stroke-width="0.5"/>`;
    if (hh >= 8.5) {
      const txt = (b.l.name || shortName(b.l.mat)) + (b.semi ? '' : '  ' + f1(b.z1 - b.z0, (b.z1 - b.z0) < 10 ? 1 : 0) + ' nm');
      s += `<text x="${L + 6}" y="${(y0 + y1) / 2 + 4}" fill="#111" font-weight="${b.semi ? 400 : 700}">${U.esc(txt)}</text>`;
      if (!b.semi && fr.absorbed[b.i] > 0.0005) s += `<text x="${fx0 - 6}" y="${(y0 + y1) / 2 + 4}" text-anchor="end" fill="#7a1010">${f1(fr.absorbed[b.i] * 100, 1)} %</text>`;
    }
  });
  // light arrow
  const ay = flip ? bot - 4 : top + 4, ang = U.rad(f.angle), ax = w * 0.28;
  { const len = 30, dir = flip ? -1 : 1, x1 = ax, y1 = flip ? bot - 2 : top + (ys[0][1] - ys[0][0]) * 0.8, x0 = x1 - Math.sin(ang) * len, y0 = y1 - dir * Math.cos(ang) * len, a = Math.atan2(y1 - y0, x1 - x0);
    s += `<line x1="${x0}" y1="${y0}" x2="${x1 - Math.cos(a) * 6}" y2="${y1 - Math.sin(a) * 6}" stroke="#d62728" stroke-width="2.2"/><path d="M ${x1} ${y1} L ${x1 - Math.cos(a - 0.45) * 9} ${y1 - Math.sin(a - 0.45) * 9} L ${x1 - Math.cos(a + 0.45) * 9} ${y1 - Math.sin(a + 0.45) * 9} Z" fill="#d62728"/><text x="${x1 + 8}" y="${(y0 + y1) / 2}" fill="#d62728" font-size="10">light</text>`; }
  if (f.show) {
    s += `<rect x="${fx0}" y="${top}" width="${fx1 - fx0}" height="${bot - top}" fill="none" stroke="#00000022"/>`;
    const X = v => fx0 + v / xm * (fx1 - fx0);
    s += `<path d="M ${fr.z.map((z, i) => X(fr.e2[i]).toFixed(1) + ' ' + zToY(z).toFixed(1)).join(' L ')}" fill="none" stroke="#c0161d" stroke-width="1.8"/>`;
    const tt = ticks(0, xm, 4);
    tt.out.forEach(v => { s += `<line x1="${X(v)}" y1="${bot}" x2="${X(v)}" y2="${bot + 4}" stroke="currentColor"/><text x="${X(v)}" y="${bot + 15}" text-anchor="middle" fill="currentColor">${fmt(v, tt.st)}</text>`; });
    s += `<text x="${(fx0 + fx1) / 2}" y="${h - 4}" text-anchor="middle" fill="currentColor">|E|² / |E₀|²  at ${f1(f.nm, 0)} nm, ${f1(f.angle, 1)}°, ${f.pol === 'avg' ? 'unpolarised' : f.pol}</text>`;
  }
  host.innerHTML = s + '</svg>';
  const A = fr.absorbed.reduce((a, b) => a + b, 0), r = TF().response(ST.stack(d), f.nm, f.angle, f.pol);
  views.absorb.innerHTML = `<div class="readout">At ${f1(f.nm, 0)} nm, ${f1(f.angle, 1)}°: R ${f1(r.R * 100)} %, T ${f1(r.T * 100)} %, A ${f1(r.A * 100)} % (in the films ${f1(A * 100)} %). Peak |E|² ${f1(mx, 2)}. Total thickness ${f1(total, 0)} nm in ${o.films.length} film${o.films.length === 1 ? '' : 's'}.${d.side === 'bottom' ? ' Light from below: drawn with the substrate at the bottom, light entering from there.' : ''}</div>`;
}

/* wavelength × angle map, calculated in slices so the page stays responsive */
function scheduleMap() {
  const host = views.map, mp = d.map, tok = ++mapToken;
  if (!mp.on) { host.innerHTML = '<div class="hint">Switched off.</div>'; return; }
  const w = Math.max(280, host.clientWidth || 420), h = 260, nl = 140, na = 90, st = ST.stack(d), v = new Float32Array(nl * na);
  const lmin = Math.min(mp.lmin, mp.lmax - 1), lmax = Math.max(mp.lmax, mp.lmin + 1), amin = U.clamp(Math.min(mp.amin, mp.amax - 0.5), 0, 89), amax = U.clamp(Math.max(mp.amax, mp.amin + 0.5), 0.5, 89.9);
  let j = 0;
  if (!host.querySelector('svg')) host.innerHTML = '<div class="hint">Calculating…</div>';
  const slice = () => {
    if (tok !== mapToken || !root) return;
    const t0 = performance.now();
    while (j < na && performance.now() - t0 < 24) {
      const a = amin + (amax - amin) * j / (na - 1);
      for (let i = 0; i < nl; i++) v[j * nl + i] = TF().response(st, lmin + (lmax - lmin) * i / (nl - 1), a, mp.pol)[mp.show];
      j++;
    }
    if (j < na) { setTimeout(slice, 0); return; }
    mapRes = { v, nl, na, lmin, lmax, amin, amax, show: mp.show, pol: mp.pol };
    drawMap(w, h);
  };
  setTimeout(slice, 60);
}
ST.mapImage = (res, w, h, dark) => {
  const cv = document.createElement('canvas'); cv.width = res.nl; cv.height = res.na;
  const cx = cv.getContext('2d'), im = cx.createImageData(res.nl, res.na);
  for (let j = 0; j < res.na; j++) for (let i = 0; i < res.nl; i++) { const c = cmap(res.v[j * res.nl + i]), p = ((res.na - 1 - j) * res.nl + i) * 4; im.data[p] = c[0]; im.data[p + 1] = c[1]; im.data[p + 2] = c[2]; im.data[p + 3] = 255; }
  cx.putImageData(im, 0, 0);
  return cv.toDataURL('image/png');
};
const mapChart = (res, w, h, cross) => {
  const href = ST.mapImage(res);
  return chart({ id: 'st-map', w, h, rightPad: 52, xr: [res.lmin, res.lmax], yr: [res.amin, res.amax], xlabel: 'Wavelength (nm)', ylabel: 'Angle of incidence (°)',
    under: (X, Y, L, R, T, B) => `<image href="${href}" x="${L}" y="${T}" width="${R - L}" height="${B - T}" preserveAspectRatio="none"/>`,
    over: cross ? (X, Y) => `<circle cx="${X(cross[0])}" cy="${Y(cross[1])}" r="4.5" fill="none" stroke="#ffffff" stroke-width="1.6"/><circle cx="${X(cross[0])}" cy="${Y(cross[1])}" r="5.8" fill="none" stroke="#d62728" stroke-width="1"/>` : null,
    extra: (X, Y, L, R, T, B) => {
      let s = '', cb = R + 12;
      for (let k = 0; k < 40; k++) { const c = cmap(1 - k / 39); s += `<rect x="${cb}" y="${T + (B - T) * k / 40}" width="10" height="${(B - T) / 40 + 0.6}" fill="rgb(${c})"/>`; }
      s += `<rect x="${cb}" y="${T}" width="10" height="${B - T}" fill="none" stroke="currentColor"/>`;
      [0, 0.5, 1].forEach(v => { s += `<text x="${cb + 13}" y="${B - (B - T) * v + 4}" fill="currentColor">${v}</text>`; });
      return s + `<text x="${cb + 5}" y="${T - 2}" text-anchor="middle" fill="currentColor">${res.show}</text>`;
    } });
};
function drawMap(w, h) {
  const host = views.map, res = mapRes;
  if (!host || !res) return;
  const ch = mapChart(res, w, h, [d.field.nm, d.field.angle]);
  host.innerHTML = ch.svg;
  host.append(el('div', { class: 'hint', text: `${QNAME[res.show]}, ${res.pol === 'avg' ? 'unpolarised' : res.pol + '-polarised'}. Bright bands that bend with angle are guided or plasmonic modes; click the map to see the field there.` }));
  const svg = host.querySelector('svg');
  svg.style.cursor = 'crosshair';
  svg.onclick = e => { const r = svg.getBoundingClientRect(), x = (e.clientX - r.left) * w / r.width, y = (e.clientY - r.top) * h / r.height; change(() => { d.field.nm = U.round(U.clamp(ch.inv(x), res.lmin, res.lmax), 1); d.field.angle = U.round(U.clamp(ch.invY(y), res.amin, res.amax), 1); }, null, true); };
}

/* ---------- files ---------- */
function saveFile() { U.download(new Blob([JSON.stringify({ rnbeamx: 'layers', version: 1, design: d }, null, 1)], { type: 'application/json' }), U.slug(d.name || 'design') + '.rnbxlayers.json'); }
function openFile() {
  RNBX.project.pickFile('.json,application/json', f => f.text().then(t => {
    const j = JSON.parse(t), v = j.design || j;
    if (!v || !Array.isArray(v.items)) throw new Error('This is not a Layer Studio design');
    ST.setDesign(Object.assign(base(v.name || 'Design', []), v));
  }).catch(e => RNBX.toast(e.message || String(e), 'error')));
}
function csv() {
  const res = TF().scan(ST.stack(d), d.calc), fr = ST.fieldOf(), o = lightOrder();
  const rows = ['# ' + (d.name || 'Design') + ' — Layer Studio (RNBeamX), transfer-matrix method', '# Spectrum (' + (d.calc.pol === 'avg' ? 'unpolarised' : d.calc.pol) + ')', [res.xlabel, 'R', 'T', 'A'].join(',')]
    .concat(res.x.map((x, i) => [x, res.series.R[i].toPrecision(6), res.series.T[i].toPrecision(6), res.series.A[i].toPrecision(6)].join(',')))
    .concat(['', `# Field at ${d.field.nm} nm, ${d.field.angle} deg, ${d.field.pol}`, 'Depth z (nm),|E|^2/|E0|^2'], fr.z.map((z, i) => U.round(z, 3) + ',' + fr.e2[i].toPrecision(6)))
    .concat(['', '# Absorbed in each film (light order)', 'Film,Material,Thickness (nm),Absorbed'], o.films.map((l, i) => [JSON.stringify(l.name || ''), l.mat, l.nm, fr.absorbed[i].toPrecision(5)].join(',')));
  U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(d.name || 'design') + '_studio.csv');
}

/* ---------- into the figure ---------- */
const quiet = fn => { const h = RNBX.history, cp = h.checkpoint; h.checkpoint = () => {}; try { return fn(); } finally { h.checkpoint = cp; } };
ST.insert = (opt = {}) => {
  const doc = S.doc, W = doc.page.width, H = doc.page.height, props = ST.toProps(d, opt.drawing || 'compressed');
  RNBX.history.checkpoint();
  let obj;
  quiet(() => {
    if (target && !opt.asNew && doc.objects.includes(target)) {
      obj = target;
      Object.assign(obj.props, props);
    } else {
      const boxes = doc.objects.filter(o => lib.get(o.type) && !lib.get(o.type).connection && o.type !== 'panel').map(o => lib.worldBox(o));
      let x = W / 2, y = H / 2;
      if (boxes.length) {
        const right = Math.max(...boxes.map(b => b[2])), bottom = Math.max(...boxes.map(b => b[3]));
        if (W - right > 70) { x = right + (W - right) / 2 - 8; y = H / 2 + 10; }
        else { doc.page.height = Math.max(H, bottom + 60); doc.page.preset = 'custom'; x = W / 2 - 10; y = bottom + 45; }
      }
      obj = RNBX.createObject('layers', x, y);
      Object.assign(obj.props, props, { legend: !!opt.legend });
      doc.objects.push(obj);
    }
    if (opt.legend != null) obj.props.legend = !!opt.legend;
    if (opt.panel && !doc.objects.some(o => o.type === 'plot' && o.props.link === obj.id && o.props.mode !== 'sensor')) RNBX.plotData.addCalcPanel(obj);
    if (opt.fieldPanel) {
      const fr = ST.fieldOf();
      RNBX.arrange.addDataPanel({ series: [{ name: '|E|²', x: fr.z, y: fr.e2, color: '#c0161d' }], xlabel: 'Depth z (nm)', ylabel: '|E|^{2}/|E_{0}|^{2}' });
    }
    if (opt.map && mapRes) {
      const w = 420, h = 260, svg = mapChart(mapRes, w, h, null).svg.replace(/var\(--panel\)/g, '#ffffff').replace('<svg ', '<svg style="color:#111" ');
      const pl = RNBX.arrange.addDataPanel();
      const im = RNBX.createObject('image', pl.x, pl.y);
      Object.assign(im.props, { href: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/currentColor/g, '#111111')), w: pl.props.w, h: pl.props.w * h / w, aspect: w / h });
      doc.objects.splice(doc.objects.indexOf(pl), 1, im);
    }
  });
  RNBX.select([obj.id]);
  RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build();
  U.track('studio-insert');
  return obj;
};
function insertDialog() {
  const o = { drawing: 'compressed', panel: !target, fieldPanel: false, map: false, legend: d.items.some(it => (it.tag || '') !== '') || flat(d.items).some(l => l.tag) };
  const box = (k, label, hint) => { const i = el('input', { type: 'checkbox', checked: o[k], onchange: () => { o[k] = i.checked; } }); return el('label', { class: 'field row' }, i, el('span', { text: label }), hint ? el('span', { class: 'hint', style: { margin: '0 0 0 6px' }, text: hint }) : null); };
  const dr = el('select', { onchange: () => { o.drawing = dr.value; } }, [['compressed', 'Thicker films drawn thicker (compressed)'], ['linear', 'Proportional to the real thickness'], ['equal', 'All films the same']].map(q => el('option', { value: q[0], text: q[1] })));
  const body = el('div', {},
    el('label', { class: 'field' }, el('span', { text: 'Drawn thickness in the figure' }), dr),
    box('legend', 'Layer key with tags (M₁ / I / M₂ …)'),
    box('panel', 'Linked R, T, A panel', 'follows the stack'),
    box('fieldPanel', 'Field profile |E|² panel', `${d.field.nm} nm, ${d.field.angle}°`),
    box('map', 'Wavelength × angle map', mapRes ? '' : '(open the map first)'),
    el('div', { class: 'hint', text: 'The stack keeps its materials, real thicknesses and repeat groups: select it and press “Open in Layer Studio” to change it later. Ctrl+Z in the figure undoes the insert.' }));
  const foot = [];
  if (target) foot.push(el('button', { class: 'btn', type: 'button', text: 'Insert as a new stack', onclick: () => { m.close(); ST.insert(Object.assign({}, o, { asNew: true })); ST.close(); RNBX.toast('Stack inserted'); } }));
  foot.push(el('button', { class: 'btn primary', type: 'button', text: target ? 'Update the stack' : 'Insert', onclick: () => { m.close(); ST.insert(o); ST.close(); RNBX.toast(target ? 'Stack updated' : 'Stack inserted: drag it where you want it'); } }));
  const m = D.modal({ title: target ? 'Update the stack in the figure' : 'Insert into the figure', sub: d.name || '', body, foot });
}

ST.ui = { chart, ticks, niceStep, fmt, f1, cmap, colorOf, shortName, quiet, QCOL, QNAME, mapChart: (res, w, h, cross) => mapChart(res, w, h, cross) };
ST.init = () => { const b = D.$('#btnStudio'); if (b) b.onclick = () => ST.open(S.selection.map(id => RNBX.getObj(id)).find(o => o && (o.type === 'layers' || o.type === 'ucell' || o.type === 'built'))); };
})();
