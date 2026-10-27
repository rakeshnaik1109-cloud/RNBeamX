/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/illustration.js
   Scientific-illustration parts for figures that are more than
   an optical table: device cross-sections and measurement
   geometry.

   • Structures: multilayer / grating stack (conformal coatings on
     a sine, square or trapezoid grating), 3D cylinder, block.
   • Geometry: angle marker (θ), dimension line (Λ = …).

   Solid-looking parts use an oblique ("cabinet") projection: the
   front face keeps its true shape, depth recedes up and to the
   right, and the top and right faces are shaded from one light.
   Everything is vector with editable text.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT_S = 'Structures';
lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT_S);

/* ---------- oblique projection kit ---------- */
const OB = lib.oblique = {};
/* x right, z up, d depth (into the page) → page coords (mm) */
OB.cam = (ang = 30, k = 0.55) => { const a = U.rad(ang); return { kx: Math.cos(a) * k, ky: Math.sin(a) * k }; };
OB.P = (c, x, z, d) => [x + d * c.kx, -z - d * c.ky];
const pts = a => a.map(p => n(p[0]) + ' ' + n(p[1])).join(' L ');
OB.poly = (a, fill, extra = '') => `<path d="M ${pts(a)} Z" fill="${fill}" ${extra}/>`;
/* a box from (x0,z0,d0) of size w×h×dep with shaded faces */
OB.box = (c, x0, z0, w, h, dep, color, S, opt = {}) => {
  const P = (x, z, d) => OB.P(c, x, z, d);
  const st = opt.stroke === false ? 'stroke="none"' : `stroke="${opt.stroke || U.darken(color, 0.45)}" stroke-width="${n(S.lw * 0.7)}" stroke-linejoin="round"`;
  let s = '';
  s += OB.poly([P(x0 + w, z0, 0), P(x0 + w, z0, dep), P(x0 + w, z0 + h, dep), P(x0 + w, z0 + h, 0)], U.shadeRgb(color, 0.72), st);  // right
  s += OB.poly([P(x0, z0 + h, 0), P(x0 + w, z0 + h, 0), P(x0 + w, z0 + h, dep), P(x0, z0 + h, dep)], U.lighten(color, 0.18), st);    // top
  s += OB.poly([P(x0, z0, 0), P(x0 + w, z0, 0), P(x0 + w, z0 + h, 0), P(x0, z0 + h, 0)], color, st);                                // front
  return s;
};
const contrast = c => { const r = U.hexToRgb(c); return r[0] * 0.3 + r[1] * 0.59 + r[2] * 0.11 < 140 ? '#ffffff' : '#111111'; };
const txt = (S, x, y, str, size, color, extra = '') => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size)}" fill="${color}" text-anchor="middle" dominant-baseline="central" ${extra}>${RNBX.text.markup(str, size)}</text>`;
const obliqueParams = [
  { key: 'ang', label: 'View angle', type: 'range', min: 5, max: 85, step: 1 },
  { key: 'depthK', label: 'Depth scale', type: 'range', min: 0.1, max: 1.2, step: 0.01 },
];

/* ================= Multilayer / grating stack ================= */
/* mat / nm: material and real thickness for the thin-film calculation
   (t is only the drawn thickness) */
const LAYER_PRESETS = {
  film: [{ name: 'Glass', color: '#cfe6f2', t: 6, tag: '', mat: 'glass:N-BK7', nm: 0 }, { name: 'Gold', color: '#d6a83a', t: 1.2, tag: '', mat: 'Au', nm: 40 }, { name: 'SiO₂', color: '#8fc9b9', t: 1.6, tag: '', mat: 'SiO2', nm: 100 }],
  mim: [{ name: 'Polymer', color: '#d9ead3', t: 6, tag: '', mat: 'PDMS', nm: 0 }, { name: 'Metal', color: '#b3bac4', t: 1.2, tag: '', mat: 'Ag', nm: 100 }, { name: 'Dielectric', color: '#e8a13a', t: 1.2, tag: '', mat: 'Al2O3', nm: 60 }, { name: 'Metal', color: '#b3bac4', t: 1.2, tag: '', mat: 'Ag', nm: 20 }],
  corrugated: [{ name: 'Polymer', color: '#d9ead3', t: 6, tag: '', mat: 'PDMS', nm: 0 }, { name: 'Metal', color: '#b3bac4', t: 1.2, tag: '', mat: 'Au', nm: 80 }, { name: 'Oxide', color: '#8fc9b9', t: 1.4, tag: '', mat: 'SiO2', nm: 50 }],
  chip: [{ name: 'Glass', color: '#cfe6f2', t: 5, tag: '', mat: 'glass:N-BK7', nm: 0 }, { name: 'Au', color: '#d6a83a', t: 0.8, tag: '', mat: 'Au', nm: 50 }],
};
/* guess a material from a layer name (old projects, new layers) */
lib.guessMat = name => {
  const s = String(name || '').toLowerCase().replace(/[₀-₉]/g, d => '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(d)]);
  const table = [[/silver|^ag\b/, 'Ag'], [/gold|^au\b/, 'Au'], [/alumin(i)?um|^al\b/, 'Al'], [/copper|^cu\b/, 'Cu'], [/chrom|^cr\b/, 'Cr'], [/titanium$|^ti\b/, 'Ti'], [/platin|^pt\b/, 'Pt'], [/nickel|^ni\b/, 'Ni'], [/tungsten|^w\b/, 'W'],
    [/tio2|titania/, 'TiO2'], [/sio2|silica|quartz/, 'SiO2'], [/al2o3|alumina|sapphire/, 'Al2O3'], [/hfo2/, 'HfO2'], [/mgf2/, 'MgF2'], [/si3n4|nitride/, 'Si3N4'], [/zno/, 'ZnO'], [/zns/, 'ZnS'], [/caf2/, 'CaF2'],
    [/silicon|^si\b/, 'Si'], [/germanium|^ge\b/, 'Ge'], [/pdms/, 'PDMS'], [/pmma/, 'PMMA'], [/water|h2o/, 'H2O'], [/ethanol/, 'EtOH'], [/methanol/, 'MeOH'], [/acetone/, 'Acetone'],
    [/sf11/, 'glass:SF11'], [/bk7|glass/, 'glass:N-BK7'], [/air|vacuum/, 'air']];
  const hit = table.find(t => t[0].test(s));
  return hit ? hit[1] : 'custom';
};
/* the planar stack seen by the thin-film solver */
const layerStack = p => {
  const L = (p.layers || []).map(l => ({ m: { mat: l.mat || lib.guessMat(l.name), n: l.n, k: l.k }, d: +l.nm || 0 }));
  if (!L.length) return null;
  const amb = { mat: p.ambient || 'air', n: p.ambientN, k: 0 };
  const semi = p.bottomMode !== 'film';
  const bottom = semi ? L[0].m : { mat: 'air' };
  const films = semi ? L.slice(1) : L;
  return p.side === 'bottom'
    ? { inc: bottom, layers: films, sub: amb }
    : { inc: amb, layers: films.slice().reverse(), sub: bottom };
};
lib.register({
  type: 'layers', name: 'Multilayer / grating stack', category: CAT_S, annotation: true, autoLabel: false, abbr: '',
  keywords: 'multilayer stack thin film metasurface grating corrugated substrate device cross section mim absorber layers pdms silver tio2',
  defaults: { W: 46, D: 24, ang: 32, depthK: 0.55, profile: 'flat', period: 8, duty: 0.5, amp: 1.6, layers: LAYER_PRESETS.film, labels: 'front', legend: false,
    showPeriod: true, periodLabel: 'Λ', dutyLabel: 'w', edge: true, sheen: true,
    ambient: 'air', ambientN: 1.33, side: 'top', bottomMode: 'semi', calc: { scan: 'wl', lmin: 400, lmax: 1500, angle: 0, pol: 'avg', show: 'RTA', points: 301, unit: 'nm', amin: 0, amax: 89, lambda: 633 } },
  params: [
    { key: 'layers', label: 'Layers (bottom → top)', type: 'layers' },
    { key: 'profile', label: 'Surface profile', type: 'select', options: [['flat', 'Flat'], ['sine', 'Sinusoidal grating'], ['trapezoid', 'Trapezoid grating'], ['square', 'Square grating']] },
    { key: 'period', label: 'Period (drawn)', type: 'number', unit: 'mm', min: 0.5, max: 100, step: 0.1, show: p => p.profile !== 'flat' },
    { key: 'duty', label: 'Ridge fraction (a/Λ)', type: 'range', min: 0.05, max: 0.95, step: 0.01, show: p => p.profile === 'square' || p.profile === 'trapezoid' },
    { key: 'amp', label: 'Grating depth (drawn)', type: 'number', unit: 'mm', min: 0, max: 30, step: 0.1, show: p => p.profile !== 'flat' },
    { key: 'showPeriod', label: 'Show Λ and a dimensions', type: 'bool', show: p => p.profile !== 'flat' },
    { key: 'periodLabel', label: 'Period label', type: 'text', show: p => p.showPeriod && p.profile !== 'flat' },
    { key: 'dutyLabel', label: 'Ridge label', type: 'text', show: p => p.showPeriod && p.profile !== 'flat' },
    { key: 'labels', label: 'Layer names', type: 'select', options: [['front', 'On the front face'], ['none', 'Hidden']] },
    { key: 'legend', label: 'Layer key (stack with tags)', type: 'bool' },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 300, step: 0.5 }, { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5 },
    ...obliqueParams, { key: 'sheen', label: 'Metallic sheen', type: 'bool' },
  ],
  /* thin-film calculation (inspector section "Optical response") */
  calcParams: [
    { key: 'ambient', label: 'Medium above the stack', type: 'select', options: () => RNBX.thinfilm.options() },
    { key: 'ambientN', label: 'Its refractive index', type: 'number', min: 1, max: 4, step: 0.001, animatable: true, show: p => p.ambient === 'custom' },
    { key: 'side', label: 'Light arrives from', type: 'select', options: [['top', 'Above (through the top layer)'], ['bottom', 'Below (through the substrate)']] },
    { key: 'bottomMode', label: 'Bottom layer', type: 'select', options: [['semi', 'Thick substrate (semi-infinite)'], ['film', 'Thin film, air below']] },
  ],
  stack: layerStack,
  calcNote: p => p.profile !== 'flat' ? 'The grating profile is not part of this calculation: it treats the layers as flat films. Grating and gap-plasmon resonances need RCWA or FDTD; import such spectra as data.' : '',
  variants: [
    { name: 'MIM grating stack', props: { layers: LAYER_PRESETS.mim, profile: 'square', period: 8, duty: 0.5, amp: 1.6, legend: true } },
    { name: 'Corrugated film stack', props: { layers: LAYER_PRESETS.corrugated, profile: 'sine', period: 8, amp: 2, showPeriod: false } },
    { name: 'Sensor chip (thin film)', props: { layers: LAYER_PRESETS.chip, profile: 'flat', W: 34, D: 20 } },
  ],
  resizable: false,
  geom(p) {
    const c = OB.cam(p.ang, p.depthK), W = p.W, per = Math.max(0.5, p.period);
    const f = x => {
      if (p.profile === 'flat' || !p.amp) return 0;
      const u = ((x % per) + per) % per / per;
      if (p.profile === 'sine') return p.amp * (0.5 + 0.5 * Math.cos(2 * Math.PI * u));
      const ramp = p.profile === 'square' ? 0.025 : 0.14, a = p.duty;
      // ridge centred at u = 0, edges ramped
      const dist = Math.min(u, 1 - u);           // distance from ridge centre (in periods)
      const half = a / 2;
      if (dist <= half) return p.amp;
      if (dist >= half + ramp) return 0;
      const v = (dist - half) / ramp; return p.amp * (1 - (v * v * (3 - 2 * v)));
    };
    const N = Math.min(700, Math.max(40, Math.round(W / per * 40)));
    const xs = []; for (let i = 0; i <= N; i++) xs.push(W * i / N);
    const L = p.layers && p.layers.length ? p.layers : LAYER_PRESETS.film;
    // boundaries: z[0] flat bottom; substrate top patterned; coatings conformal
    const bounds = [xs.map(() => 0)];
    let cum = 0;
    L.forEach((ly, i) => { cum += Math.max(0.05, ly.t); bounds.push(xs.map(x => cum + (i === 0 ? f(x) : f(x)))); });
    bounds[1] = xs.map(x => L[0].t + f(x));
    for (let i = 2; i < bounds.length; i++) { let acc = L[0].t; for (let j = 1; j < i; j++) acc += Math.max(0.05, L[j].t); bounds[i] = xs.map(x => acc + f(x)); }
    return { c, xs, bounds, L, f };
  },
  bbox(p) {
    const g = this.geom(p), top = Math.max(...g.bounds[g.bounds.length - 1]);
    const x0 = -p.W / 2, legendW = p.legend ? 30 : 0;
    return [x0 - 1, -top - p.D * g.c.ky - 7, p.W / 2 + p.D * g.c.kx + legendW, 3];
  },
  draw(p, S) {
    const g = this.geom(p), c = g.c, D = p.D, ox = -p.W / 2;
    const P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + ox, q[1]]; };
    const ink = S.ink, lw = n(S.lw * 0.6), xs = g.xs, last = g.bounds.length - 1;
    const edge = `stroke="${ink}" stroke-opacity="0.55" stroke-width="${lw}" stroke-linejoin="round"`;
    let s = '';
    // right side faces
    g.L.forEach((ly, i) => {
      const z0 = g.bounds[i][xs.length - 1], z1 = g.bounds[i + 1][xs.length - 1];
      s += OB.poly([P(p.W, z0, 0), P(p.W, z0, D), P(p.W, z1, D), P(p.W, z1, 0)], U.shadeRgb(ly.color, 0.7), edge);
    });
    // top surface strips, shaded by slope (light from the upper left)
    const top = g.bounds[last], col = g.L[g.L.length - 1].color;
    for (let j = 0; j < xs.length - 1; j++) {
      const slope = (top[j + 1] - top[j]) / (xs[j + 1] - xs[j]);
      const k = 1.02 + 0.3 * slope / Math.sqrt(1 + slope * slope);
      const fill = U.shadeRgb(U.lighten(col, 0.12), k);
      s += OB.poly([P(xs[j], top[j], 0), P(xs[j + 1], top[j + 1], 0), P(xs[j + 1], top[j + 1], D), P(xs[j], top[j], D)], fill, `stroke="${fill}" stroke-width="0.05"`);
    }
    if (p.sheen) s += `<defs><linearGradient id="rbx-lay-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
      OB.poly([P(0, top[0], 0), ...xs.map((x, j) => P(x, top[j], 0)), P(p.W, top[xs.length - 1], D), ...xs.slice().reverse().map((x, j) => P(x, top[xs.length - 1 - j], D))], 'url(#rbx-lay-sheen)');
    // outline of the top surface
    s += `<path d="M ${pts(xs.map((x, j) => P(x, top[j], D)))}" fill="none" ${edge}/>`;
    s += `<path d="M ${pts([P(0, top[0], 0), P(0, top[0], D)])}" fill="none" ${edge}/>`;
    // front faces
    g.L.forEach((ly, i) => {
      const lo = g.bounds[i], hi = g.bounds[i + 1];
      const poly = xs.map((x, j) => P(x, hi[j], 0)).concat(xs.slice().reverse().map((x, j) => P(x, lo[xs.length - 1 - j], 0)));
      s += OB.poly(poly, ly.color, edge);
    });
    // names on the front face
    if (p.labels === 'front') g.L.forEach((ly, i) => {
      const th = Math.max(0.05, ly.t), fs = Math.min(S.fs, th * 0.85);
      if (fs < S.fs * 0.45) return;
      const zc = (i === 0 ? th / 2 : g.bounds[i][0] + th / 2 - g.f(0)) , pos = P(p.W * 0.82, zc, 0);
      s += txt(S, pos[0], pos[1], ly.name, fs, contrast(ly.color), 'font-weight="700"');
    });
    // period and ridge dimensions along the front top edge
    if (p.showPeriod && p.profile !== 'flat') {
      const per = p.period, k0 = Math.max(0, Math.ceil(p.W * 0.28 / per)), lift = Math.max(...top) + 1.4;
      const dimLine = (a, b, z, label, side) => {
        const A = P(a, z, 0), B = P(b, z, 0), col2 = S.ink;
        const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
        let t = `<line x1="${n(A[0])}" y1="${n(A[1])}" x2="${n(B[0])}" y2="${n(B[1])}" stroke="${col2}" stroke-width="${lw}"/>` + H.arrowHead(B[0], B[1], ang, 1.1, col2) + H.arrowHead(A[0], A[1], ang + Math.PI, 1.1, col2);
        if (label) t += side ? `<text x="${n(B[0] + 1.2)}" y="${n(B[1])}" font-family="${U.esc(S.font)}" font-size="${n(S.fs * 0.85)}" fill="${col2}" dominant-baseline="central">${RNBX.text.markup(label)}</text>`
          : txt(S, (A[0] + B[0]) / 2, A[1] - S.fs * 0.7, label, S.fs * 0.9, col2);
        return t;
      };
      if ((k0 + 1) * per <= p.W) s += dimLine(k0 * per, (k0 + 1) * per, lift + S.fs * 1.6, p.periodLabel || 'Λ');
      if (p.profile !== 'sine' && (k0 + 1) * per + p.duty * per / 2 <= p.W) s += dimLine((k0 + 1) * per - p.duty * per / 2, (k0 + 1) * per + p.duty * per / 2, lift, p.dutyLabel, true);
    }
    // layer key with tags (as in device sketches: M₂ / I / M₁)
    if (p.legend) {
      const kx = p.W / 2 + D * c.kx + 3, rows = g.L.slice().reverse(), rh = Math.max(2.6, S.fs * 1.25), ky = -Math.max(...top) - D * c.ky - 2;
      rows.forEach((ly, i) => {
        const y = ky + i * rh;
        s += `<rect x="${n(kx)}" y="${n(y)}" width="15" height="${n(rh)}" fill="${ly.color}" stroke="${ink}" stroke-width="${lw}"/>` + txt(S, kx + 7.5, y + rh / 2, ly.name, S.fs * 0.85, contrast(ly.color), 'font-weight="700"');
        if (ly.tag) s += `<line x1="${n(kx + 17)}" y1="${n(y + 0.3)}" x2="${n(kx + 17)}" y2="${n(y + rh - 0.3)}" stroke="${ink}" stroke-width="${lw}"/>` + H.arrowHead(kx + 17, y + 0.2, -Math.PI / 2, 0.8, ink) + H.arrowHead(kx + 17, y + rh - 0.2, Math.PI / 2, 0.8, ink) +
          `<text x="${n(kx + 18.6)}" y="${n(y + rh / 2)}" font-family="${U.esc(S.font)}" font-size="${n(S.fs * 0.95)}" fill="${ink}" dominant-baseline="central" font-weight="700">${RNBX.text.markup(ly.tag)}</text>`;
      });
    }
    return s;
  },
});

/* ================= 3D cylinder and block ================= */
lib.register({
  type: 'cylinder3d', name: '3D cylinder (rings)', category: CAT_S, annotation: true, autoLabel: false, abbr: '',
  keywords: 'cylinder detector tube rod fibre 3d rings coaxial absorber housing',
  defaults: { L: 26, r: 9, tilt: 0.45, body: '#5a7db3', rings: '#d8dde4, #8f99a6', core: '', coreR: 0.18, text: '' },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5 }, { key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 0.5, max: 100, step: 0.5 },
    { key: 'tilt', label: 'End-face tilt', type: 'range', min: 0.15, max: 1, step: 0.01 },
    { key: 'body', label: 'Body colour', type: 'color' }, { key: 'rings', label: 'Face rings (outer → inner, comma-separated)', type: 'text' },
    { key: 'core', label: 'Centre colour', type: 'color', allowEmpty: true }, { key: 'coreR', label: 'Centre size', type: 'range', min: 0, max: 1, step: 0.01 }, { key: 'text', label: 'Text on face', type: 'text' }],
  bbox: p => [-p.L / 2 - p.r * p.tilt, -p.r, p.L / 2 + p.r * p.tilt, p.r],
  draw(p, S) {
    const rx = p.r * p.tilt, L = p.L, r = p.r;
    const body = `<path d="M ${n(L / 2)} ${n(-r)} L ${n(-L / 2)} ${n(-r)} A ${n(rx)} ${n(r)} 0 0 0 ${n(-L / 2)} ${n(r)} L ${n(L / 2)} ${n(r)} Z" fill="url(#rbx-cyl-${p.body.slice(1)})" stroke="${U.darken(p.body, 0.4)}" stroke-width="${n(S.lw * 0.7)}"/>`;
    let s = `<defs><linearGradient id="rbx-cyl-${p.body.slice(1)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.lighten(p.body, 0.35)}"/><stop offset="0.45" stop-color="${p.body}"/><stop offset="1" stop-color="${U.darken(p.body, 0.4)}"/></linearGradient></defs>` + body;
    const rings = String(p.rings || '').split(/[,;\s]+/).filter(x => /^#/.test(x));
    const all = [U.darken(p.body, 0.1)].concat(rings);
    all.forEach((col, i) => { const k = 1 - i / (all.length + (p.core ? 1.2 : 0.4)) * 0.85; s += `<ellipse cx="${n(L / 2)}" cy="0" rx="${n(rx * k)}" ry="${n(r * k)}" fill="${col}" stroke="${U.darken(col, 0.3)}" stroke-width="${n(S.lw * 0.5)}"/>`; });
    if (p.core) s += `<defs><radialGradient id="rbx-core-${p.core.slice(1)}"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="${p.core}"/><stop offset="1" stop-color="${p.core}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${n(L / 2)}" cy="0" rx="${n(rx * p.coreR * 1.6)}" ry="${n(r * p.coreR * 1.6)}" fill="url(#rbx-core-${p.core.slice(1)})"/>`;
    if (p.text) s += txt(S, L / 2, -r * 0.38, p.text, Math.min(S.fs, r * 0.22), '#ffffff', `transform="rotate(-62 ${n(L / 2)} ${n(-r * 0.38)})"`);
    return s;
  },
});
lib.register({
  type: 'block3d', name: '3D block / slab', category: CAT_S, annotation: true, autoLabel: false, abbr: '',
  keywords: 'block slab cuboid box substrate chip wafer 3d',
  defaults: { W: 24, Hh: 4, D: 16, color: '#8fb7d6', ang: 32, depthK: 0.55, text: '' },
  params: [{ key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 0.5, max: 300, step: 0.5 }, { key: 'Hh', label: 'Height', type: 'number', unit: 'mm', min: 0.1, max: 300, step: 0.1 }, { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 0.5, max: 300, step: 0.5 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'text', label: 'Text on front', type: 'text' }, ...obliqueParams],
  bbox(p) { const c = OB.cam(p.ang, p.depthK); return [-p.W / 2, -p.Hh / 2 - p.D * c.ky, p.W / 2 + p.D * c.kx, p.Hh / 2]; },
  draw(p, S) {
    const c = OB.cam(p.ang, p.depthK);
    let s = `<g transform="translate(${n(-p.W / 2)} ${n(p.Hh / 2)})">${OB.box(c, 0, 0, p.W, p.Hh, p.D, p.color, S)}</g>`;
    if (p.text) s += txt(S, 0, 0, p.text, Math.min(S.fs, p.Hh * 0.7), contrast(p.color), 'font-weight="700"');
    return s;
  },
});

/* ================= Measurement geometry ================= */
lib.register({
  type: 'angle', name: 'Angle marker (θ)', category: 'Annotations', annotation: true, autoLabel: false, abbr: '',
  keywords: 'angle theta incidence arc marker degrees normal',
  defaults: { r: 6, a1: -90, a2: -40, label: 'θ_i', color: '#111111', width: 0.6, arrow: false, ref: true, refLen: 14, size: 8, italic: true },
  params: [{ key: 'label', label: 'Label', type: 'text' }, { key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 0.5, max: 100, step: 0.5 },
    { key: 'a1', label: 'From (° on page, 0 = right, −90 = up)', type: 'number', unit: '°', step: 1 }, { key: 'a2', label: 'To', type: 'number', unit: '°', step: 1 },
    { key: 'ref', label: 'Dashed reference line (normal)', type: 'bool' }, { key: 'refLen', label: 'Reference length', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5, show: p => p.ref },
    { key: 'arrow', label: 'Arrowhead', type: 'bool' }, { key: 'size', label: 'Label size', type: 'number', unit: 'pt', min: 3, max: 40, step: 0.5 },
    { key: 'italic', label: 'Italic label', type: 'bool' }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 6, step: 0.05 }],
  bbox: p => { const R = Math.max(p.r, p.ref ? p.refLen : 0) + 3; return [-R, -R, R, R]; },
  draw(p, S) {
    const a1 = U.rad(p.a1), a2 = U.rad(p.a2), r = p.r, w = U.pt2mm(p.width);
    const P = a => [Math.cos(a) * r, Math.sin(a) * r];
    const A = P(a1), B = P(a2), large = Math.abs(p.a2 - p.a1) > 180 ? 1 : 0, sweep = p.a2 > p.a1 ? 1 : 0;
    let s = '';
    if (p.ref) s += `<line x1="0" y1="0" x2="${n(Math.cos(a1) * p.refLen)}" y2="${n(Math.sin(a1) * p.refLen)}" stroke="${p.color}" stroke-width="${n(w)}" stroke-dasharray="${n(w * 4)} ${n(w * 3)}"/>`;
    s += `<path d="M ${n(A[0])} ${n(A[1])} A ${n(r)} ${n(r)} 0 ${large} ${sweep} ${n(B[0])} ${n(B[1])}" fill="none" stroke="${p.color}" stroke-width="${n(w)}"/>`;
    if (p.arrow) s += H.arrowHead(B[0], B[1], a2 + (sweep ? Math.PI / 2 : -Math.PI / 2), 1.2, p.color);
    const am = (a1 + a2) / 2, fs = U.pt2mm(p.size), L = [Math.cos(am) * (r + fs * 0.9), Math.sin(am) * (r + fs * 0.9)];
    return s + txt(S, L[0], L[1], p.label, fs, p.color, p.italic ? 'font-style="italic"' : '');
  },
});
lib.register({
  type: 'dimension', name: 'Dimension line (Λ = …)', category: 'Annotations', annotation: true, autoLabel: false, abbr: '',
  keywords: 'dimension length period distance measure double arrow lambda',
  defaults: { dx: 20, dy: 0, label: 'L', offset: -2.2, ends: 'arrows', color: '#111111', width: 0.5, size: 7, tilt: true },
  params: [{ key: 'label', label: 'Label', type: 'text' }, { key: 'dx', label: 'Length x', type: 'number', unit: 'mm', step: 0.5 }, { key: 'dy', label: 'Length y', type: 'number', unit: 'mm', step: 0.5 },
    { key: 'offset', label: 'Label offset', type: 'number', unit: 'mm', step: 0.2 }, { key: 'tilt', label: 'Label follows the line', type: 'bool' },
    { key: 'ends', label: 'Ends', type: 'select', options: [['arrows', 'Arrows'], ['ticks', 'Ticks'], ['both', 'Arrows and ticks']] },
    { key: 'size', label: 'Label size', type: 'number', unit: 'pt', min: 3, max: 40, step: 0.5 }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 6, step: 0.05 }],
  handles: p => [{ key: 'end', x: p.dx, y: p.dy }],
  bbox: p => [Math.min(0, p.dx) - 2, Math.min(0, p.dy) - 4, Math.max(0, p.dx) + 2, Math.max(0, p.dy) + 4],
  draw(p, S) {
    const L = Math.hypot(p.dx, p.dy) || 1, ux = p.dx / L, uy = p.dy / L, w = U.pt2mm(p.width), ang = Math.atan2(p.dy, p.dx);
    let s = `<line x1="0" y1="0" x2="${n(p.dx)}" y2="${n(p.dy)}" stroke="${p.color}" stroke-width="${n(w)}"/>`;
    if (p.ends !== 'ticks') s += H.arrowHead(p.dx, p.dy, ang, 1.3, p.color) + H.arrowHead(0, 0, ang + Math.PI, 1.3, p.color);
    if (p.ends !== 'arrows') [[0, 0], [p.dx, p.dy]].forEach(q => { s += `<line x1="${n(q[0] - uy * 1.2)}" y1="${n(q[1] + ux * 1.2)}" x2="${n(q[0] + uy * 1.2)}" y2="${n(q[1] - ux * 1.2)}" stroke="${p.color}" stroke-width="${n(w)}"/>`; });
    const mx = p.dx / 2 - uy * p.offset, my = p.dy / 2 + ux * p.offset;
    let deg = U.deg(ang); if (deg > 90) deg -= 180; if (deg < -90) deg += 180;
    return s + txt(S, mx, my, p.label, U.pt2mm(p.size), p.color, p.tilt ? `transform="rotate(${n(deg)} ${n(mx)} ${n(my)})"` : '');
  },
});
})();
