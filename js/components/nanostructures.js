/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/nanostructures.js
   Building blocks for device and metasurface sketches, assembled
   one part at a time: substrate / film slabs, grating ridges,
   conformal coatings, nano-object arrays, 2D-material sheets and
   a separate layer key.

   Stacking: a block dropped (or clicked in the library while a
   block is selected) onto the top of another block attaches to
   it (props.on = id of the block below). Attached blocks share
   the bottom block's position, width, depth and view, start
   where the block below ends, and follow it when it moves or
   changes size. Coatings follow the surface below (a coating on
   a grating is corrugated too). Drag a block away to detach it.

   Every block uses the same oblique ("cabinet") projection as
   the multilayer stack: x right, z up, depth receding up-right.
   The origin of a stack is the front-bottom centre of its lowest
   block. Slabs and coatings carry a material and real thickness,
   so a stack of them can be calculated (Optical response).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n, OB = lib.oblique;
const CAT = 'Nanostructures & films';
lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Structures'), 0, CAT);

const contrast = c => { const r = U.hexToRgb(c); return r[0] * 0.3 + r[1] * 0.59 + r[2] * 0.11 < 140 ? '#ffffff' : '#111111'; };
const pts = a => a.map(p => n(p[0]) + ' ' + n(p[1])).join(' L ');
const poly = (a, fill, extra = '') => `<path d="M ${pts(a)} Z" fill="${fill}" ${extra}/>`;
const txt = (S, x, y, str, size, color, extra = '') => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size)}" fill="${color}" text-anchor="middle" dominant-baseline="central" ${extra}>${RNBX.text.markup(str, size)}</text>`;

/* ---------- surfaces ----------
   A surface is { z, prof, grow }: a periodic profile { kind, period,
   duty, amp } (or none), raised by z and grown outwards by `grow`
   (the total thickness of conformal coatings on it, measured along
   the surface normal, so sidewalls are coated too). Growing by a and
   then b equals growing by a + b, so coatings simply add up. */
const FLAT = { z: 0, prof: null };
const profileFn = pr => {
  if (!pr || !(pr.amp > 0)) return () => 0;
  const per = Math.max(0.3, +pr.period || 1), a = U.clamp(+pr.duty || 0.5, 0.02, 0.98), A = +pr.amp, sh = +pr.shift || 0;
  return x => {
    const u = ((((x - sh) / per) % 1) + 1) % 1;
    switch (pr.kind) {
      case 'sine': return A * (0.5 - 0.5 * Math.cos(2 * Math.PI * u));
      case 'triangle': return A * (1 - Math.abs(2 * u - 1));
      case 'sawtooth': return A * u;
      default: {
        // ridges centred in each period; trapezoids get sloped walls
        const ramp = pr.kind === 'trapezoid' ? Math.min(0.18, (1 - a) / 2) : 0.012;
        const dist = Math.abs(u - 0.5), half = a / 2;
        if (dist <= half - ramp / 2) return A;
        if (dist >= half + ramp / 2) return 0;
        return A * (half + ramp / 2 - dist) / ramp;
      }
    }
  };
};
const surfFn = s => {
  const f = profileFn(s && s.prof), z = s ? +s.z || 0 : 0, g = s ? +s.grow || 0 : 0;
  if (!(g > 0)) return x => z + f(x);
  if (!s.prof || !(s.prof.amp > 0)) return () => z + g;
  // Minkowski growth by a disc of radius g: max over |u| ≤ g of f(x + u) + √(g² − u²)
  const K = 24;
  return x => { let m = -Infinity; for (let i = -K; i <= K; i++) { const u = g * i / K, v = f(x + u) + Math.sqrt(Math.max(0, g * g - u * u)); if (v > m) m = v; } return z + m; };
};
const surfMax = s => (s ? +s.z || 0 : 0) + (s && s.prof ? +s.prof.amp || 0 : 0) + (s ? +s.grow || 0 : 0);
const samplesFor = (W, prof) => {
  const per = prof && prof.amp > 0 ? Math.max(0.3, prof.period) : W;
  const N = U.clamp(Math.round(W / per * 48), 2, 900);
  const xs = []; for (let i = 0; i <= N; i++) xs.push(W * i / N);
  return xs;
};

/* a solid between a lower and an upper height profile: right face,
   top surface strips shaded by slope (light from the upper left), front face */
function solid(c, W, D, xs, lo, hi, color, S, opt = {}) {
  const ox = -W / 2, P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + ox, q[1]]; };
  const N = xs.length - 1, ink = S.ink, lw = n(S.lw * 0.6);
  const edge = `stroke="${opt.stroke || ink}" stroke-opacity="${opt.edgeOpacity == null ? 0.55 : opt.edgeOpacity}" stroke-width="${lw}" stroke-linejoin="round"`;
  let s = '';
  if (hi[N] - lo[N] > 1e-4) s += poly([P(W, lo[N], 0), P(W, lo[N], D), P(W, hi[N], D), P(W, hi[N], 0)], U.shadeRgb(color, 0.72), edge);
  const topCol = U.lighten(color, 0.12);
  for (let j = 0; j < N; j++) {
    const slope = (hi[j + 1] - hi[j]) / (xs[j + 1] - xs[j]);
    const k = 1.02 + 0.3 * slope / Math.sqrt(1 + slope * slope);
    const fill = U.shadeRgb(topCol, k);
    s += poly([P(xs[j], hi[j], 0), P(xs[j + 1], hi[j + 1], 0), P(xs[j + 1], hi[j + 1], D), P(xs[j], hi[j], D)], fill, `stroke="${fill}" stroke-width="0.05"`);
  }
  if (opt.sheen) {
    const id = 'rbx-nsheen-' + opt.id;
    s += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
      poly(xs.map((x, j) => P(x, hi[j], 0)).concat(xs.slice().reverse().map((x, j) => P(x, hi[N - j], D))), `url(#${id})`);
  }
  s += `<path d="M ${pts(xs.map((x, j) => P(x, hi[j], D)))}" fill="none" ${edge}/>`;
  s += `<path d="M ${pts([P(0, hi[0], 0), P(0, hi[0], D)])}" fill="none" ${edge}/>`;
  const front = xs.map((x, j) => P(x, hi[j], 0)).concat(xs.slice().reverse().map((x, j) => P(x, lo[N - j], 0)));
  s += poly(front, color, edge);
  return s;
}
const frontText = (c, W, xs, lo, hi, label, S, color, size) => {
  if (!label) return '';
  // centre of the thickest part of the front face
  let best = 0, bj = 0;
  xs.forEach((x, j) => { const t = hi[j] - lo[j]; if (t > best) { best = t; bj = j; } });
  const fs = Math.min(size || S.fs, best * 0.8);
  if (fs < S.fs * 0.45) return '';
  const x = xs.length > 3 ? W * 0.5 : xs[bj], j = Math.round(x / W * (xs.length - 1));
  const q = OB.P(c, x, (lo[j] + hi[j]) / 2, 0);
  return txt(S, q[0] - W / 2, q[1], label, fs, contrast(color), 'font-weight="700"');
};

/* ---------- shared parameters ---------- */
const VIEW = [
  { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 2, max: 300, step: 0.5, show: p => !p.on },
  { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5, show: p => !p.on },
  { key: 'ang', label: 'View angle', type: 'range', min: 5, max: 85, step: 1, show: p => !p.on },
  { key: 'depthK', label: 'Depth scale', type: 'range', min: 0.1, max: 1.2, step: 0.01, show: p => !p.on },
];
const VIEW_DEF = { W: 44, D: 26, ang: 32, depthK: 0.55, on: '', base: null };
const MAT = (label = 'Material (for Optical response)') => ({ key: 'mat', label, type: 'select', options: () => RNBX.thinfilm ? RNBX.thinfilm.options() : [['custom', 'Custom']] });
const NM = { key: 'nm', label: 'Real thickness', type: 'number', unit: 'nm', min: 0, max: 1e6, step: 1, animatable: true, show: p => !!p.on };
const NK = [{ key: 'n', label: 'Refractive index n', type: 'number', min: 1, max: 6, step: 0.001, show: p => p.mat === 'custom' }, { key: 'k', label: 'Extinction k', type: 'number', min: 0, max: 20, step: 0.001, show: p => p.mat === 'custom' }];
const cam = p => OB.cam(p.ang, p.depthK);
const baseOf = p => p.base || FLAT;

/* ---------- the stack calculation from a chain of blocks ---------- */
const getDoc = doc => doc || RNBX.state.doc;
lib.stackChain = (obj, doc) => {
  doc = getDoc(doc);
  const by = id => doc.objects.find(o => o.id === id);
  const down = [];
  let cur = obj, guard = 0;
  while (cur && guard++ < 60) { down.unshift(cur); cur = cur.props.on ? by(cur.props.on) : null; }
  cur = obj; guard = 0;
  while (guard++ < 60) { const up = doc.objects.find(o => o.props && o.props.on === cur.id && lib.get(o.type) && lib.get(o.type).stackable); if (!up || down.includes(up)) break; down.push(up); cur = up; }
  return down;
};
const chainStack = (p, obj, doc) => {
  const chain = obj ? lib.stackChain(obj, doc) : [];
  if (!chain.length) return { inc: { mat: p.ambient || 'air' }, layers: [], sub: { mat: p.mat, n: p.n, k: p.k } };
  const root = chain[0], films = [];
  chain.slice(1).forEach(o => { if (o.type === 'nslab' || o.type === 'ncoat') films.push({ m: { mat: o.props.mat, n: o.props.n, k: o.props.k }, d: +o.props.nm || 0 }); });
  const sub = root.type === 'nslab' || root.type === 'ncoat' ? { mat: root.props.mat, n: root.props.n, k: root.props.k } : { mat: 'air' };
  const amb = { mat: p.ambient || 'air', n: p.ambientN, k: 0 };
  return p.side === 'bottom' ? { inc: sub, layers: films, sub: amb } : { inc: amb, layers: films.slice().reverse(), sub };
};
const chainNote = (p, obj) => {
  const chain = obj ? lib.stackChain(obj) : [];
  const skipped = chain.filter(o => !['nslab', 'ncoat'].includes(o.type));
  const corrugated = chain.some(o => o.type === 'ncoat' && o.props.base && o.props.base.prof);
  const out = ['Stack: ' + chain.map(o => (o.props.name || lib.get(o.type).name) + (o === chain[0] ? ' (substrate)' : o.props.nm ? ` ${o.props.nm} nm` : '')).join(' → ') + '.'];
  if (skipped.length) out.push('Not included (laterally structured): ' + skipped.map(o => o.props.name || lib.get(o.type).name).join(', ') + '. Their resonances need RCWA or FDTD.');
  else if (corrugated) out.push('Coatings on a grating are calculated as flat films.');
  return out.join(' ');
};
const CALC = {
  calcParams: [
    { key: 'ambient', label: 'Medium above the stack', type: 'select', options: () => RNBX.thinfilm.options() },
    { key: 'ambientN', label: 'Its refractive index', type: 'number', min: 1, max: 4, step: 0.001, animatable: true, show: p => p.ambient === 'custom' },
    { key: 'side', label: 'Light arrives from', type: 'select', options: [['top', 'Above'], ['bottom', 'Below (through the substrate)']] },
  ],
  stack: chainStack,
  calcNote: chainNote,
};
const CALC_DEF = { ambient: 'air', ambientN: 1.333, side: 'top', calc: { scan: 'wl', lmin: 400, lmax: 1200, angle: 0, pol: 'avg', show: 'RTA', points: 301, unit: 'nm', amin: 0, amax: 89, lambda: 633 } };

const block = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '', stackable: true, resizable: false }, CALC, cfg,
  { defaults: Object.assign({}, VIEW_DEF, CALC_DEF, cfg.defaults) }));

/* bbox from the lowest and highest point of the block */
const bboxFor = (p, zTop) => {
  const c = cam(p), b = baseOf(p).z || 0;
  return [-p.W / 2 - 0.3, -zTop - p.D * c.ky - 0.5, p.W / 2 + p.D * c.kx + 0.3, -b + 0.3];
};

/* ================= Slab: substrate or film ================= */
block({
  type: 'nslab', name: 'Substrate / film (slab)',
  keywords: 'substrate slab film layer wafer glass silicon polymer pdms block planar building block stack',
  defaults: { t: 5, color: '#cfe2ee', name: 'Substrate', label: true, mat: 'glass:N-BK7', nm: 100, n: 1.5, k: 0, sheen: false },
  params: [
    { key: 'name', label: 'Name', type: 'text' }, { key: 'label', label: 'Name on the front face', type: 'bool' },
    { key: 't', label: 'Drawn thickness', type: 'number', unit: 'mm', min: 0.1, max: 200, step: 0.1 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'sheen', label: 'Sheen', type: 'bool' },
    MAT(), ...NK, NM, ...VIEW],
  variants: [
    { name: 'Glass substrate', props: { name: 'Glass', color: '#cfe6f2', mat: 'glass:N-BK7' } },
    { name: 'Silicon wafer', props: { name: 'Si', color: '#6b7785', mat: 'Si', t: 3 } },
    { name: 'Polymer substrate', props: { name: 'Polymer', color: '#d9ead3', mat: 'PDMS', t: 6 } },
    { name: 'Thin film (slab)', props: { name: 'Film', color: '#8fc9b9', mat: 'SiO2', t: 1.4, nm: 100 } },
  ],
  top: p => ({ z: surfMax(baseOf(p)) + p.t, prof: null }),
  bbox(p) { return bboxFor(p, surfMax(baseOf(p)) + p.t); },
  draw(p, S, obj) {
    const c = cam(p), b = baseOf(p), xs = samplesFor(p.W, b.prof), f = surfFn(b), top = surfMax(b) + p.t;
    const lo = xs.map(f), hi = xs.map(() => top);
    return solid(c, p.W, p.D, xs, lo, hi, p.color, S, { sheen: p.sheen, id: obj ? obj.id : 'x' }) + (p.label ? frontText(c, p.W, xs, lo, hi, p.name, S, p.color) : '');
  },
});

/* ================= Grating ridges ================= */
block({
  type: 'nridges', name: 'Grating ridges',
  keywords: 'grating ridges lines periodic corrugation 1d metasurface lamellar trapezoid sinusoidal blazed sawtooth nanoimprint building block',
  defaults: { profile: 'square', period: 6, duty: 0.5, amp: 2.4, resid: 0, color: '#a3b6d9', name: 'Grating', mat: 'PDMS' },
  params: [
    { key: 'profile', label: 'Profile', type: 'select', options: [['square', 'Rectangular'], ['trapezoid', 'Trapezoid'], ['sine', 'Sinusoidal'], ['triangle', 'Triangular'], ['sawtooth', 'Blazed (sawtooth)']] },
    { key: 'period', label: 'Period (drawn)', type: 'number', unit: 'mm', min: 0.3, max: 100, step: 0.1 },
    { key: 'duty', label: 'Ridge fraction', type: 'range', min: 0.05, max: 0.95, step: 0.01, show: p => p.profile === 'square' || p.profile === 'trapezoid' },
    { key: 'amp', label: 'Ridge height (drawn)', type: 'number', unit: 'mm', min: 0.05, max: 60, step: 0.1, animatable: true },
    { key: 'resid', label: 'Residual layer under the ridges', type: 'number', unit: 'mm', min: 0, max: 60, step: 0.1 },
    { key: 'name', label: 'Name', type: 'text' }, { key: 'color', label: 'Colour', type: 'color' }, ...VIEW],
  variants: [
    { name: 'Sinusoidal grating', props: { profile: 'sine', period: 7, amp: 2 } },
    { name: 'Blazed grating', props: { profile: 'sawtooth', period: 6, amp: 2.2 } },
  ],
  // pattern centred on the block, so both cut edges look alike
  prof: p => ({ kind: p.profile, period: p.period, duty: p.duty, amp: p.amp, shift: (p.W % Math.max(0.3, p.period)) / 2 }),
  top(p) { return { z: surfMax(baseOf(p)) + p.resid, prof: this.prof(p) }; },
  bbox(p) { return bboxFor(p, surfMax(baseOf(p)) + p.resid + p.amp); },
  draw(p, S) {
    const c = cam(p), b = baseOf(p), pr = this.prof(p), xs = samplesFor(p.W, pr), fb = surfFn(b), z0 = surfMax(b) + p.resid, fp = profileFn(pr);
    const lo = xs.map(fb), hi = xs.map(x => z0 + fp(x));
    return solid(c, p.W, p.D, xs, lo, hi, p.color, S);
  },
});

/* ================= Conformal coating ================= */
block({
  type: 'ncoat', name: 'Conformal coating',
  keywords: 'coating conformal film metal oxide deposited sputtered evaporated thin layer silver gold tio2 sio2 al2o3 building block',
  defaults: { t: 0.9, color: '#b3bac4', name: 'Metal', label: false, mat: 'Ag', nm: 50, n: 1.5, k: 0, sheen: true },
  params: [
    { key: 'name', label: 'Name', type: 'text' }, { key: 'label', label: 'Name on the front face', type: 'bool' },
    { key: 't', label: 'Drawn thickness', type: 'number', unit: 'mm', min: 0.05, max: 60, step: 0.05, animatable: true },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'sheen', label: 'Metallic sheen', type: 'bool' },
    MAT(), ...NK, NM, ...VIEW],
  variants: [
    { name: 'Gold coating', props: { name: 'Au', color: '#d6a83a', mat: 'Au' } },
    { name: 'Oxide coating', props: { name: 'Oxide', color: '#e8a13a', mat: 'TiO2', sheen: false, t: 1.2, nm: 80 } },
    { name: 'Silica coating', props: { name: 'SiO₂', color: '#8fc9b9', mat: 'SiO2', sheen: false, t: 1.2, nm: 100 } },
  ],
  top: p => { const b = baseOf(p); return { z: +b.z || 0, prof: b.prof, grow: (+b.grow || 0) + p.t }; },
  bbox(p) { return bboxFor(p, surfMax(baseOf(p)) + p.t); },
  draw(p, S, obj) {
    const c = cam(p), b = baseOf(p), xs = samplesFor(p.W, b.prof), f = surfFn(b), g = surfFn(this.top(p));
    const lo = xs.map(f), hi = xs.map(g);
    return solid(c, p.W, p.D, xs, lo, hi, p.color, S, { sheen: p.sheen, id: obj ? obj.id : 'x', edgeOpacity: 0.45 }) + (p.label ? frontText(c, p.W, xs, lo, hi, p.name, S, p.color) : '');
  },
});

/* ================= Nano-object arrays ================= */
/* 2D convex hull (monotone chain) of page points */
const hull = P => {
  const a = P.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lower = [], upper = [];
  for (const p of a) { while (lower.length >= 2 && cr(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = a.length - 1; i >= 0; i--) { const p = a[i]; while (upper.length >= 2 && cr(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
};
const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; };
block({
  type: 'narray', name: 'Nano-object array',
  keywords: 'nanodisk nanopillar nanoparticle nanorod cone pyramid sphere core shell array lattice metasurface meta-atom plasmonic random building block',
  defaults: { shape: 'disk', layout: 'square', nx: 6, ny: 4, r: 1.6, h: 1.2, len: 4, count: 18, seed: 7, color: '#d6a83a', shell: '#9fd0e6', name: 'Nanodisks' },
  params: [
    { key: 'shape', label: 'Shape', type: 'select', options: [['disk', 'Disk / pillar (cylinder)'], ['box', 'Block (cuboid)'], ['cone', 'Cone'], ['dome', 'Hemisphere'], ['sphere', 'Sphere'], ['coreshell', 'Core–shell sphere'], ['rod', 'Rod (lying)']] },
    { key: 'layout', label: 'Arrangement', type: 'select', options: [['square', 'Square lattice'], ['hex', 'Hexagonal lattice'], ['random', 'Random']] },
    { key: 'nx', label: 'Columns', type: 'number', min: 1, max: 60, step: 1, show: p => p.layout !== 'random' },
    { key: 'ny', label: 'Rows (in depth)', type: 'number', min: 1, max: 40, step: 1, show: p => p.layout !== 'random' },
    { key: 'count', label: 'Number of objects', type: 'number', min: 1, max: 400, step: 1, show: p => p.layout === 'random' },
    { key: 'seed', label: 'Random pattern', type: 'number', min: 1, max: 9999, step: 1, show: p => p.layout === 'random' },
    { key: 'r', label: 'Radius / half-width (drawn)', type: 'number', unit: 'mm', min: 0.05, max: 40, step: 0.05, animatable: true },
    { key: 'h', label: 'Height (drawn)', type: 'number', unit: 'mm', min: 0.05, max: 60, step: 0.05, animatable: true, show: p => ['disk', 'box', 'cone'].includes(p.shape) },
    { key: 'len', label: 'Rod length (drawn)', type: 'number', unit: 'mm', min: 0.2, max: 60, step: 0.1, show: p => p.shape === 'rod' },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'shell', label: 'Shell colour', type: 'color', show: p => p.shape === 'coreshell' },
    { key: 'name', label: 'Name', type: 'text' }, ...VIEW],
  variants: [
    { name: 'Nanopillar array', props: { shape: 'disk', r: 1, h: 3.2, color: '#9aa6b5', name: 'Nanopillars', nx: 8, ny: 5 } },
    { name: 'Nanoparticles (random)', props: { shape: 'sphere', layout: 'random', r: 1.1, color: '#d6a83a', name: 'Nanoparticles' } },
    { name: 'Core–shell particles', props: { shape: 'coreshell', layout: 'hex', r: 1.5, nx: 6, ny: 4, color: '#d6a83a', name: 'Core–shell' } },
    { name: 'Nanorods', props: { shape: 'rod', layout: 'random', r: 0.6, len: 4, count: 14, color: '#d6a83a', name: 'Nanorods' } },
    { name: 'Nanocone array', props: { shape: 'cone', r: 1.4, h: 3, color: '#7e9cc4', name: 'Nanocones' } },
  ],
  sites(p) {
    const out = [], W = p.W, D = p.D;
    if (p.layout === 'random') {
      const R = rng(p.seed), m = p.shape === 'rod' ? p.len / 2 : p.r;
      for (let i = 0; i < p.count; i++) out.push({ x: m + R() * Math.max(0, W - 2 * m), d: p.r + R() * Math.max(0, D - 2 * p.r), a: R() * Math.PI });
    } else {
      const nx = Math.max(1, Math.round(p.nx)), ny = Math.max(1, Math.round(p.ny));
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const sh = p.layout === 'hex' && j % 2 ? 0.5 : 0;
        const x = (i + 0.5 + sh) * W / (nx + (p.layout === 'hex' ? 0.5 : 0));
        out.push({ x, d: (j + 0.5) * D / ny, a: 0 });
      }
    }
    return out;
  },
  height: p => ({ disk: p.h, box: p.h, cone: p.h, dome: p.r, sphere: 2 * p.r, coreshell: 2 * p.r, rod: 2 * p.r }[p.shape] || p.h),
  top(p) { return { z: surfMax(baseOf(p)) + this.height(p), prof: null }; },
  bbox(p) { return bboxFor(p, surfMax(baseOf(p)) + this.height(p) + 0.5); },
  draw(p, S, obj) {
    const c = cam(p), z0 = surfMax(baseOf(p)), W = p.W, r = p.r, ox = -W / 2, id = obj ? obj.id : 'x';
    const P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + ox, q[1]]; };
    const ink = S.ink, lw = n(S.lw * 0.5), stroke = `stroke="${U.darken(p.color, 0.45)}" stroke-width="${lw}" stroke-linejoin="round"`;
    const circ = (x, z, d, rr, N = 28) => { const a = []; for (let i = 0; i < N; i++) { const t = i / N * 2 * Math.PI; a.push(P(x + rr * Math.cos(t), z, d + rr * Math.sin(t))); } return a; };
    const gid = 'rbx-na-' + id;
    let defs = `<linearGradient id="${gid}-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${U.darken(p.color, 0.3)}"/><stop offset="0.35" stop-color="${U.lighten(p.color, 0.3)}"/><stop offset="1" stop-color="${U.darken(p.color, 0.35)}"/></linearGradient>` +
      `<radialGradient id="${gid}-ball" cx="0.35" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="${U.lighten(p.color, 0.3)}"/><stop offset="0.85" stop-color="${p.color}"/><stop offset="1" stop-color="${U.darken(p.color, 0.4)}"/></radialGradient>` +
      `<radialGradient id="${gid}-shell" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.8"/><stop offset="0.5" stop-color="${p.shell}" stop-opacity="0.45"/><stop offset="1" stop-color="${U.darken(p.shell, 0.3)}" stop-opacity="0.7"/></radialGradient>`;
    // painter's order: back rows first
    const sites = this.sites(p).sort((a, b) => b.d - a.d || a.x - b.x);
    let s = '';
    sites.forEach(st => {
      const { x, d } = st;
      switch (p.shape) {
        case 'box': {
          const q = OB.P(c, 0, 0, d - r);
          s += `<g transform="translate(${n(ox + q[0])} ${n(q[1])})">${OB.box(c, x - r, z0, 2 * r, p.h, 2 * r, p.color, S, { stroke: U.darken(p.color, 0.45) })}</g>`;
          break;
        }
        case 'cone': {
          s += poly(hull(circ(x, z0, d, r).concat([P(x, z0 + p.h, d)])), `url(#${gid}-side)`, stroke);
          break;
        }
        case 'dome': {
          const sp = [];
          for (let i = 0; i <= 8; i++) for (let k = 0; k < 16; k++) { const th = i / 8 * Math.PI / 2, ph = k / 16 * 2 * Math.PI; sp.push(P(x + r * Math.sin(th) * Math.cos(ph), z0 + r * Math.cos(th), d + r * Math.sin(th) * Math.sin(ph))); }
          s += poly(hull(sp), `url(#${gid}-ball)`, stroke);
          break;
        }
        case 'sphere': case 'coreshell': {
          const q = P(x, z0 + r, d);
          if (p.shape === 'coreshell') s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(r * 0.62)}" fill="url(#${gid}-ball)" ${stroke}/><circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(r)}" fill="url(#${gid}-shell)" stroke="${U.darken(p.shell, 0.4)}" stroke-width="${lw}"/>`;
          else s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(r)}" fill="url(#${gid}-ball)" ${stroke}/>`;
          break;
        }
        case 'rod': {
          // capsule lying on the surface, axis in the x–depth plane
          const L = p.len / 2, ca = Math.cos(st.a), sa = Math.sin(st.a);
          const A = P(x - L * ca, z0 + r, d - L * sa * 0.6), B = P(x + L * ca, z0 + r, d + L * sa * 0.6);
          s += `<line x1="${n(A[0])}" y1="${n(A[1])}" x2="${n(B[0])}" y2="${n(B[1])}" stroke="${U.darken(p.color, 0.45)}" stroke-width="${n(2 * r + S.lw * 0.5)}" stroke-linecap="round"/>` +
            `<line x1="${n(A[0])}" y1="${n(A[1])}" x2="${n(B[0])}" y2="${n(B[1])}" stroke="${p.color}" stroke-width="${n(2 * r)}" stroke-linecap="round"/>` +
            `<line x1="${n(A[0])}" y1="${n(A[1] - r * 0.4)}" x2="${n(B[0])}" y2="${n(B[1] - r * 0.4)}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="${n(r * 0.5)}" stroke-linecap="round"/>`;
          break;
        }
        default: { // disk / pillar
          const B = circ(x, z0, d, r), T = circ(x, z0 + p.h, d, r);
          s += poly(hull(B.concat(T)), `url(#${gid}-side)`, stroke) + poly(T, U.lighten(p.color, 0.25), stroke);
        }
      }
    });
    void ink;
    return `<defs>${defs}</defs>` + s;
  },
});

/* ================= 2D-material sheet ================= */
const SHEETS = {
  graphene: { a: ['#4a4f57', '#4a4f57'], name: 'Graphene' },
  hbn: { a: ['#e88b8b', '#5b7fd6'], name: 'hBN' },
  mos2: { a: ['#6aa0d8', '#e8c547'], name: 'MoS₂', tri: true },
};
block({
  type: 'nsheet', name: '2D material sheet',
  keywords: 'graphene hbn boron nitride mos2 tmd 2d material monolayer honeycomb lattice sheet van der waals building block',
  defaults: { kind: 'graphene', a: 2.2, atom: 0.32, bond: 0.14, name: 'Graphene', colorA: '', colorB: '' },
  params: [
    { key: 'kind', label: 'Material', type: 'select', options: [['graphene', 'Graphene'], ['hbn', 'Hexagonal boron nitride'], ['mos2', 'MoS₂ (transition-metal dichalcogenide)']] },
    { key: 'a', label: 'Lattice constant (drawn)', type: 'number', unit: 'mm', min: 0.4, max: 20, step: 0.1 },
    { key: 'atom', label: 'Atom size', type: 'number', unit: 'mm', min: 0.05, max: 5, step: 0.01 },
    { key: 'bond', label: 'Bond width', type: 'number', unit: 'mm', min: 0, max: 2, step: 0.01 },
    { key: 'colorA', label: 'Atom colour 1', type: 'color', allowEmpty: true }, { key: 'colorB', label: 'Atom colour 2', type: 'color', allowEmpty: true },
    { key: 'name', label: 'Name', type: 'text' }, ...VIEW],
  variants: [{ name: 'hBN sheet', props: { kind: 'hbn', name: 'hBN' } }, { name: 'MoS₂ monolayer', props: { kind: 'mos2', name: 'MoS₂', a: 2.6 } }],
  thick: p => p.kind === 'mos2' ? p.a * 0.6 : p.atom * 2,
  top(p) { return { z: surfMax(baseOf(p)) + this.thick(p), prof: null }; },
  bbox(p) { return bboxFor(p, surfMax(baseOf(p)) + this.thick(p) + p.atom); },
  draw(p, S) {
    const c = cam(p), K = SHEETS[p.kind] || SHEETS.graphene, a = Math.max(0.4, p.a), W = p.W, D = p.D, ox = -W / 2;
    const zc = surfMax(baseOf(p)) + this.thick(p) / 2;
    const P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + ox, q[1]]; };
    const colA = p.colorA || K.a[0], colB = p.colorB || K.a[1];
    // honeycomb: lattice vectors (a, 0) and (a/2, a√3/2) in the x–depth plane, two-atom basis
    const atoms = [], s3 = Math.sqrt(3), bl = a / s3;
    for (let j = -1; j * a * s3 / 2 <= D + a; j++) for (let i = -2; i * a <= W + a; i++) {
      const x0 = i * a + (j % 2 ? a / 2 : 0), d0 = j * a * s3 / 2;
      [[0, 0, 0], [a / 2, bl / 2, 1]].forEach(([dx, dd, t]) => { const x = x0 + dx, d = d0 + dd; if (x >= 0 && x <= W && d >= 0 && d <= D) atoms.push({ x, d, t }); });
    }
    let s = '';
    const lineAt = (A, B, z1, z2) => { const p1 = P(A.x, z1, A.d), p2 = P(B.x, z2, B.d); return `<line x1="${n(p1[0])}" y1="${n(p1[1])}" x2="${n(p2[0])}" y2="${n(p2[1])}" stroke="#7d838c" stroke-width="${n(p.bond)}" stroke-linecap="round"/>`; };
    const ball = (x, z, d, col, rr) => { const q = P(x, z, d); return `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(rr)}" fill="${col}" stroke="${U.darken(col, 0.45)}" stroke-width="${n(S.lw * 0.35)}"/>`; };
    const dz = K.tri ? a * 0.3 : 0;
    // bonds between nearest neighbours (back to front)
    const sorted = atoms.slice().sort((A, B) => B.d - A.d || A.x - B.x);
    if (p.bond > 0) for (let i = 0; i < sorted.length; i++) for (let k = i + 1; k < sorted.length; k++) {
      const A = sorted[i], B = sorted[k];
      if (A.t === B.t || Math.abs(Math.hypot(A.x - B.x, A.d - B.d) - bl) > bl * 0.08) continue;
      if (K.tri) { const m = A.t ? A : B, s2 = A.t ? B : A; s += lineAt(s2, m, zc, zc + dz) + lineAt(s2, m, zc, zc - dz); } else s += lineAt(A, B, zc, zc);
    }
    sorted.forEach(A => {
      if (K.tri && A.t) s += ball(A.x, zc - dz, A.d, colB, p.atom * 0.85) + ball(A.x, zc + dz, A.d, colB, p.atom * 0.85);
      else s += ball(A.x, zc, A.d, A.t ? colB : colA, p.atom * (K.tri ? 1.15 : 1));
    });
    return s;
  },
});

/* ================= Layer key ================= */
lib.register({
  type: 'layerkey', name: 'Layer key', category: CAT, annotation: true, autoLabel: false, abbr: '',
  keywords: 'legend key layers stack colour code tags m1 i m2 building block',
  defaults: { rows: [{ name: 'Substrate', color: '#cfe2ee', tag: '' }, { name: 'Metal', color: '#b3bac4', tag: '' }, { name: 'Dielectric', color: '#e8a13a', tag: '' }, { name: 'Metal', color: '#b3bac4', tag: '' }], w: 16, rowH: 3, size: 6.5, tags: true },
  params: [{ key: 'rows', label: 'Rows', type: 'layers', simple: true }, { key: 'w', label: 'Swatch width', type: 'number', unit: 'mm', min: 2, max: 80, step: 0.5 },
    { key: 'rowH', label: 'Row height', type: 'number', unit: 'mm', min: 1, max: 20, step: 0.1 }, { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5 }, { key: 'tags', label: 'Tags with brackets', type: 'bool' }],
  bbox: p => [-0.5, -0.5, p.w + (p.tags ? 12 : 0.5), (p.rows || []).length * p.rowH + 0.5],
  draw(p, S) {
    const ink = S.ink, lw = n(S.lw * 0.6), fs = U.pt2mm(p.size), rh = p.rowH;
    let s = '';
    // stored bottom → top, like the stack editor; drawn top row first
    (p.rows || []).slice().reverse().forEach((ly, i) => {
      const y = i * rh;
      s += `<rect x="0" y="${n(y)}" width="${n(p.w)}" height="${n(rh)}" fill="${ly.color}" stroke="${ink}" stroke-width="${lw}"/>` + txt(S, p.w / 2, y + rh / 2, ly.name, Math.min(fs, rh * 0.8), contrast(ly.color), 'font-weight="700"');
      if (p.tags && ly.tag) s += `<line x1="${n(p.w + 2)}" y1="${n(y + 0.3)}" x2="${n(p.w + 2)}" y2="${n(y + rh - 0.3)}" stroke="${ink}" stroke-width="${lw}"/>` + H.arrowHead(p.w + 2, y + 0.2, -Math.PI / 2, 0.8, ink) + H.arrowHead(p.w + 2, y + rh - 0.2, Math.PI / 2, 0.8, ink) +
        `<text x="${n(p.w + 3.6)}" y="${n(y + rh / 2)}" font-family="${U.esc(S.font)}" font-size="${n(fs)}" fill="${ink}" dominant-baseline="central" font-weight="700">${RNBX.text.markup(ly.tag)}</text>`;
    });
    return s;
  },
});

/* ---------- keeping stacks together ----------
   Runs on every change: attached blocks take the position, size and
   view of the block below, and start on its top surface. */
const SHARED = ['W', 'D', 'ang', 'depthK'];
lib.stackRelayout = doc => {
  if (!doc) return;
  const by = new Map(doc.objects.map(o => [o.id, o]));
  const isBlock = o => o && lib.get(o.type) && lib.get(o.type).stackable;
  const depthOf = (o, seen = new Set()) => { if (!o.props.on) return 0; if (seen.has(o.id)) return -1; seen.add(o.id); const b = by.get(o.props.on); if (!isBlock(b)) return -1; const d = depthOf(b, seen); return d < 0 ? -1 : d + 1; };
  const list = doc.objects.filter(o => isBlock(o) && o.props.on).map(o => ({ o, d: depthOf(o) }));
  list.forEach(({ o, d }) => { if (d < 0) { o.props.on = ''; o.props.base = null; } });
  list.filter(e => e.d > 0).sort((a, b) => a.d - b.d).forEach(({ o }) => {
    const b = by.get(o.props.on), bd = lib.get(b.type);
    const top = bd.top.call(bd, b.props);
    if (o.x !== b.x) o.x = b.x;
    if (o.y !== b.y) o.y = b.y;
    if ((o.rot || 0) !== (b.rot || 0)) o.rot = b.rot || 0;
    if ((o.scale || 1) !== (b.scale || 1)) o.scale = b.scale || 1;
    SHARED.forEach(k => { if (o.props[k] !== b.props[k]) o.props[k] = b.props[k]; });
    if (JSON.stringify(o.props.base) !== JSON.stringify(top)) o.props.base = top;
    // drawn above the block below
    const io = doc.objects.indexOf(o), ib = doc.objects.indexOf(b);
    if (io < ib) { doc.objects.splice(io, 1); doc.objects.splice(doc.objects.indexOf(b) + 1, 0, o); }
  });
  doc.objects.filter(o => isBlock(o) && !o.props.on && o.props.base).forEach(o => { o.props.base = null; });
};
RNBX.on('change', () => lib.stackRelayout(RNBX.state.doc));
RNBX.on('document', () => lib.stackRelayout(RNBX.state.doc));

/* where a block dropped at point q would attach: the block whose top
   front centre is nearest (not the block itself or anything above it) */
lib.stackAnchor = (obj, q, doc, tol) => {
  doc = getDoc(doc);
  const above = new Set([obj.id]);
  let grew = true;
  while (grew) { grew = false; doc.objects.forEach(o => { if (o.props && o.props.on && above.has(o.props.on) && !above.has(o.id)) { above.add(o.id); grew = true; } }); }
  let best = null;
  doc.objects.forEach(o => {
    const def = lib.get(o.type);
    if (!def || !def.stackable || above.has(o.id) || o.hidden) return;
    // only the top of a stack takes new blocks
    if (doc.objects.some(u => u.props && u.props.on === o.id && !above.has(u.id))) return;
    const t = def.top.call(def, o.props), pt = [o.x, o.y - surfMax(t) * (o.scale || 1)];
    const dd = Math.hypot(q[0] - pt[0], q[1] - pt[1]);
    if (dd < tol && (!best || dd < best.d)) best = { o, d: dd, pt };
  });
  return best;
};
lib.surfMax = surfMax;
/* top block of the stack that contains obj */
lib.stackTop = (obj, doc) => { const ch = lib.stackChain(obj, doc); return ch[ch.length - 1]; };
})();
