/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/illustration.js
   Scientific-illustration parts for figures that are more than
   an optical table: device cross-sections, molecules, lab
   equipment and measurement geometry.

   • Structures: multilayer / grating stack (conformal coatings on
     a sine, square or trapezoid grating), 3D cylinder, block.
   • Molecules: ball-and-stick, presets or your own XYZ.
   • Lab: hot plate, lab jack / tilt stage, thermal camera, laptop,
     pipette, flow cell, light bulb.
   • Geometry: angle marker (θ), dimension line (Λ = …), angle fan.

   Solid-looking parts use an oblique ("cabinet") projection: the
   front face keeps its true shape, depth recedes up and to the
   right, and the top and right faces are shaded from one light.
   Everything is vector with editable text.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT_S = 'Structures & molecules', CAT_L = 'Lab & illustration';
lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT_S, CAT_L);

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

/* ================= Molecules ================= */
const EL = {
  H: { r: 0.31, c: '#f4f4f4' }, C: { r: 0.5, c: '#4d4d4d' }, N: { r: 0.48, c: '#3050f8' }, O: { r: 0.48, c: '#e0302f' }, F: { r: 0.42, c: '#90e050' },
  S: { r: 0.6, c: '#e6c229' }, P: { r: 0.6, c: '#ff8000' }, Cl: { r: 0.58, c: '#1fbf1f' }, Br: { r: 0.62, c: '#a62929' }, I: { r: 0.7, c: '#940094' },
  Si: { r: 0.6, c: '#d2b48c' }, Ag: { r: 0.72, c: '#c0c6ce' }, Au: { r: 0.72, c: '#e3b341' }, Ti: { r: 0.66, c: '#9aa1aa' }, Na: { r: 0.7, c: '#ab5cf2' },
};
const COV = { H: 0.31, C: 0.76, N: 0.71, O: 0.66, F: 0.57, S: 1.05, P: 1.07, Cl: 1.02, Br: 1.2, I: 1.39, Si: 1.11, Ag: 1.45, Au: 1.36, Ti: 1.6, Na: 1.66 };
const MOLS = {
  water: 'O 0 0 0\nH 0.757 0.586 0\nH -0.757 0.586 0',
  ethanol: 'C 0 0 0\nC 1.52 0 0\nO 2.03 1.35 0\nH 2.98 1.30 0\nH -0.37 -1.03 0\nH -0.37 0.51 0.89\nH -0.37 0.51 -0.89\nH 1.89 -0.52 0.89\nH 1.89 -0.52 -0.89',
  methanol: 'C 0 0 0\nO 1.43 0 0\nH 1.75 0.9 0\nH -0.36 1.03 0\nH -0.36 -0.51 0.89\nH -0.36 -0.51 -0.89',
  co2: 'C 0 0 0\nO 1.16 0 0\nO -1.16 0 0',
  methane: 'C 0 0 0\nH 0.63 0.63 0.63\nH -0.63 -0.63 0.63\nH -0.63 0.63 -0.63\nH 0.63 -0.63 -0.63',
  ammonia: 'N 0 0 0\nH 0.94 0 -0.38\nH -0.47 0.81 -0.38\nH -0.47 -0.81 -0.38',
  benzene: [...Array(6)].map((_, i) => { const a = i * Math.PI / 3; return `C ${(1.39 * Math.cos(a)).toFixed(3)} ${(1.39 * Math.sin(a)).toFixed(3)} 0`; }).concat([...Array(6)].map((_, i) => { const a = i * Math.PI / 3; return `H ${(2.47 * Math.cos(a)).toFixed(3)} ${(2.47 * Math.sin(a)).toFixed(3)} 0`; })).join('\n'),
  acetone: 'C 0 0 0\nO 0 1.21 0\nC 1.28 -0.78 0\nC -1.28 -0.78 0\nH 2.13 -0.1 0\nH 1.33 -1.42 0.88\nH 1.33 -1.42 -0.88\nH -2.13 -0.1 0\nH -1.33 -1.42 0.88\nH -1.33 -1.42 -0.88',
  cyanide: 'C 0 0 0\nN 1.16 0 0',
};
const DOUBLE = { co2: [[0, 1], [0, 2]], acetone: [[0, 1]], cyanide: [[0, 1, 3]] };
lib.molParse = txt2 => String(txt2 || '').split(/\r?\n/).map(l => l.trim().split(/\s+/)).filter(a => a.length >= 4 && EL[a[0]] !== undefined || (a.length >= 4 && /^[A-Z][a-z]?$/.test(a[0]))).map(a => ({ el: a[0], p: [parseFloat(a[1]), parseFloat(a[2]), parseFloat(a[3])] })).filter(a => a.p.every(isFinite));
lib.register({
  type: 'molecule', name: 'Molecule (ball and stick)', category: CAT_S, annotation: true, autoLabel: false, abbr: '',
  keywords: 'molecule ball stick atom chemistry water ethanol methanol benzene analyte co2 ammonia acetone cyanide',
  defaults: { preset: 'ethanol', xyz: '', size: 3.2, rx: 10, ry: -15, rz: 0, carbon: '#3f86c9', scheme: 'cpk', symbols: false, ball: 1 },
  params: [
    { key: 'preset', label: 'Molecule', type: 'select', options: [['water', 'Water (H₂O)'], ['ethanol', 'Ethanol'], ['methanol', 'Methanol'], ['acetone', 'Acetone'], ['co2', 'Carbon dioxide'], ['methane', 'Methane'], ['ammonia', 'Ammonia'], ['benzene', 'Benzene'], ['cyanide', 'Cyanide (CN⁻)'], ['custom', 'Custom (XYZ)…']] },
    { key: 'xyz', label: 'Atoms: element x y z (Å), one per line', type: 'textarea', show: p => p.preset === 'custom' },
    { key: 'rx', label: 'Rotate about x', type: 'range', min: -180, max: 180, step: 1, animatable: true }, { key: 'ry', label: 'Rotate about y', type: 'range', min: -180, max: 180, step: 1, animatable: true },
    { key: 'rz', label: 'Rotate about z', type: 'range', min: -180, max: 180, step: 1, animatable: true },
    { key: 'size', label: 'Scale (mm per Å)', type: 'number', min: 0.2, max: 20, step: 0.1 }, { key: 'ball', label: 'Ball size', type: 'range', min: 0.4, max: 2, step: 0.01 },
    { key: 'scheme', label: 'Colours', type: 'select', options: [['cpk', 'CPK (grey carbon)'], ['vivid', 'Coloured carbon']] },
    { key: 'carbon', label: 'Carbon colour', type: 'color', show: p => p.scheme === 'vivid' }, { key: 'symbols', label: 'Element symbols', type: 'bool' }],
  variants: [{ name: 'Water molecule', props: { preset: 'water', rx: 0, ry: 0 } }, { name: 'Benzene', props: { preset: 'benzene', rx: 55, ry: 0 } }],
  model(p) {
    const atoms = lib.molParse(p.preset === 'custom' ? p.xyz : MOLS[p.preset] || MOLS.water);
    const c = atoms.reduce((a, t) => [a[0] + t.p[0], a[1] + t.p[1], a[2] + t.p[2]], [0, 0, 0]).map(v => v / (atoms.length || 1));
    const R = (v, ax, deg) => { const a = U.rad(deg), cs = Math.cos(a), sn = Math.sin(a); const [x, y, z] = v; return ax === 0 ? [x, y * cs - z * sn, y * sn + z * cs] : ax === 1 ? [x * cs + z * sn, y, -x * sn + z * cs] : [x * cs - y * sn, x * sn + y * cs, z]; };
    const pos = atoms.map(t => R(R(R([t.p[0] - c[0], t.p[1] - c[1], t.p[2] - c[2]], 0, p.rx), 1, p.ry), 2, p.rz));
    const bonds = [];
    for (let i = 0; i < atoms.length; i++) for (let j = i + 1; j < atoms.length; j++) {
      const d = Math.hypot(...[0, 1, 2].map(k => atoms[i].p[k] - atoms[j].p[k]));
      if (d < 1.2 * ((COV[atoms[i].el] || 0.8) + (COV[atoms[j].el] || 0.8))) {
        const mult = (DOUBLE[p.preset] || []).find(b => (b[0] === i && b[1] === j) || (b[0] === j && b[1] === i));
        bonds.push({ i, j, order: mult ? (mult[2] || 2) : 1 });
      }
    }
    return { atoms, pos, bonds };
  },
  bbox(p) {
    const m = this.model(p), s = p.size;
    if (!m.pos.length) return [-3, -3, 3, 3];
    const xs = m.pos.map(q => q[0] * s), ys = m.pos.map(q => -q[1] * s), pad = 0.8 * s * p.ball;
    return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  },
  draw(p, S, obj) {
    const m = this.model(p), s = p.size, items = [];
    const col = el => el === 'C' && p.scheme === 'vivid' ? p.carbon : (EL[el] || EL.C).c;
    const gid = c => 'rbx-atom-' + c.replace('#', '') + '-' + (obj ? obj.id : 'x');
    const used = new Set();
    m.bonds.forEach(b => {
      const A = m.pos[b.i], B = m.pos[b.j];
      const a = [A[0] * s, -A[1] * s], e = [B[0] * s, -B[1] * s];
      const len = Math.hypot(e[0] - a[0], e[1] - a[1]) || 1, px = -(e[1] - a[1]) / len, py = (e[0] - a[0]) / len;
      const w = 0.16 * s * p.ball;
      let svg = '';
      const offs = b.order === 1 ? [0] : b.order === 2 ? [-0.8, 0.8] : [-1.4, 0, 1.4];
      offs.forEach(o => {
        const ox = px * w * o, oy = py * w * o;
        svg += `<line x1="${n(a[0] + ox)}" y1="${n(a[1] + oy)}" x2="${n(e[0] + ox)}" y2="${n(e[1] + oy)}" stroke="#6b7079" stroke-width="${n(w * (b.order > 1 ? 0.8 : 1) + 0.12)}" stroke-linecap="round"/>` +
          `<line x1="${n(a[0] + ox)}" y1="${n(a[1] + oy)}" x2="${n(e[0] + ox)}" y2="${n(e[1] + oy)}" stroke="#c9ccd2" stroke-width="${n(w * (b.order > 1 ? 0.8 : 1) * 0.55)}" stroke-linecap="round"/>`;
      });
      items.push({ z: (A[2] + B[2]) / 2 - 0.01, svg });
    });
    m.atoms.forEach((t, i) => {
      const q = m.pos[i], c = col(t.el), r = (EL[t.el] || EL.C).r * s * p.ball;
      used.add(c);
      let svg = `<circle cx="${n(q[0] * s)}" cy="${n(-q[1] * s)}" r="${n(r)}" fill="url(#${gid(c)})" stroke="${U.darken(c, 0.45)}" stroke-width="${n(Math.max(0.06, S.lw * 0.4))}"/>`;
      if (p.symbols) svg += txt(S, q[0] * s, -q[1] * s, t.el, r * 0.95, contrast(c), 'font-weight="700"');
      items.push({ z: q[2], svg });
    });
    items.sort((a, b) => a.z - b.z);
    const defs = [...used].map(c => `<radialGradient id="${gid(c)}" cx="0.36" cy="0.32" r="0.72"><stop offset="0" stop-color="#ffffff"/><stop offset="0.28" stop-color="${U.lighten(c, 0.3)}"/><stop offset="0.8" stop-color="${c}"/><stop offset="1" stop-color="${U.darken(c, 0.4)}"/></radialGradient>`).join('');
    return `<defs>${defs}</defs>` + items.map(x => x.svg).join('');
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
lib.register({
  type: 'fan', name: 'Angle fan (θ arrows)', category: 'Annotations', annotation: true, autoLabel: false, abbr: '',
  keywords: 'angle fan observation angles arrows detection angular emission scan theta',
  defaults: { r: 24, angles: '0,15,30,45,60', zero: 180, sense: 'cw', fmt: '{a}°', arc: true, arcLabel: 'θ', color: '#111111', width: 0.7, size: 7 },
  params: [{ key: 'angles', label: 'Angles (comma-separated)', type: 'text' }, { key: 'fmt', label: 'Label format ({a} = angle)', type: 'text' },
    { key: 'zero', label: 'Direction of 0° on the page', type: 'number', unit: '°', step: 1, hint: '0 = right, 180 = left' },
    { key: 'sense', label: 'Angles increase', type: 'select', options: [['cw', 'Upwards from 0°'], ['ccw', 'Downwards from 0°']] },
    { key: 'r', label: 'Arrow length', type: 'number', unit: 'mm', min: 2, max: 200, step: 0.5 },
    { key: 'arc', label: 'Arc with arrow', type: 'bool' }, { key: 'arcLabel', label: 'Arc label', type: 'text', show: p => p.arc },
    { key: 'size', label: 'Label size', type: 'number', unit: 'pt', min: 3, max: 40, step: 0.5 }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 6, step: 0.05 }],
  bbox: p => { const R = p.r + 6; return [-R, -R, R, R]; },
  draw(p, S) {
    const w = U.pt2mm(p.width), fs = U.pt2mm(p.size), sg = p.sense === 'cw' ? 1 : -1;
    const list = String(p.angles).split(/[,;\s]+/).map(Number).filter(isFinite);
    const dir = a => U.rad(p.zero + sg * (p.zero > 90 && p.zero < 270 ? 1 : -1) * a);
    let s = '';
    list.forEach(a => {
      const t = dir(a), e = [Math.cos(t) * p.r, Math.sin(t) * p.r];
      s += `<line x1="0" y1="0" x2="${n(e[0] * 0.97)}" y2="${n(e[1] * 0.97)}" stroke="${p.color}" stroke-width="${n(w)}"/>` + H.arrowHead(e[0], e[1], t, 1.6, p.color);
      s += txt(S, Math.cos(t) * (p.r + fs * 1.2), Math.sin(t) * (p.r + fs * 1.2), p.fmt.replace('{a}', a), fs, p.color, 'font-weight="700"');
    });
    if (p.arc && list.length > 1) {
      const t0 = dir(Math.min(...list)), t1 = dir(Math.max(...list)), R = p.r * 0.55;
      const A = [Math.cos(t0) * R, Math.sin(t0) * R], B = [Math.cos(t1) * R, Math.sin(t1) * R];
      const sweep = (t1 - t0) > 0 ? 1 : 0;
      s += `<path d="M ${n(A[0])} ${n(A[1])} A ${n(R)} ${n(R)} 0 0 ${sweep} ${n(B[0])} ${n(B[1])}" fill="none" stroke="${p.color}" stroke-width="${n(w * 1.4)}"/>` + H.arrowHead(B[0], B[1], t1 + (sweep ? Math.PI / 2 : -Math.PI / 2), 1.6, p.color);
      if (p.arcLabel) { const tm = (t0 + t1) / 2; s += txt(S, Math.cos(tm) * (R + fs * 1.3), Math.sin(tm) * (R + fs * 1.3), p.arcLabel, fs * 1.1, p.color, 'font-style="italic"'); }
    }
    return s;
  },
});

/* ================= Lab equipment ================= */
const lab = cfg => lib.register(Object.assign({ category: CAT_L, annotation: true, autoLabel: false, abbr: '' }, cfg));
lab({
  type: 'hotplate', name: 'Hot plate', keywords: 'hot plate heater heating stage temperature thermal emission',
  defaults: { W: 30, Hh: 9, D: 20, color: '#5b6573', plate: '#efe4cc', temp: '60 °C', ang: 32, depthK: 0.55, glow: true },
  params: [{ key: 'temp', label: 'Display', type: 'text' }, { key: 'color', label: 'Body colour', type: 'color' }, { key: 'plate', label: 'Plate colour', type: 'color' }, { key: 'glow', label: 'Hot glow', type: 'bool' },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 200, step: 0.5 }, { key: 'Hh', label: 'Height', type: 'number', unit: 'mm', min: 2, max: 100, step: 0.5 }, { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 2, max: 200, step: 0.5 }, ...obliqueParams],
  bbox(p) { const c = OB.cam(p.ang, p.depthK); return [-p.W / 2, -p.Hh - p.D * c.ky - 1, p.W / 2 + p.D * c.kx, p.Hh * 0.9]; },
  draw(p, S) {
    const c = OB.cam(p.ang, p.depthK), P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] - p.W / 2, q[1]]; };
    let s = `<g transform="translate(${n(-p.W / 2)} 0)">${OB.box(c, 0, 0, p.W, p.Hh, p.D, p.color, S)}</g>`;
    const t = [P(p.W * 0.06, p.Hh, p.D * 0.1), P(p.W * 0.94, p.Hh, p.D * 0.1), P(p.W * 0.94, p.Hh, p.D * 0.92), P(p.W * 0.06, p.Hh, p.D * 0.92)];
    s += `<defs><radialGradient id="rbx-hot"><stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="${p.plate}"/><stop offset="1" stop-color="${U.darken(p.plate, 0.25)}"/></radialGradient></defs>` + OB.poly(t, 'url(#rbx-hot)', `stroke="${U.darken(p.plate, 0.4)}" stroke-width="${n(S.lw * 0.5)}"`);
    if (p.glow) { const m = P(p.W / 2, p.Hh + 0.5, p.D / 2); s += `<ellipse cx="${n(m[0])}" cy="${n(m[1])}" rx="${n(p.W * 0.45)}" ry="${n(p.D * c.ky * 0.6)}" fill="#ffd27a" fill-opacity="0.35"/>`; }
    // front panel: display and knob
    const pw = p.W * 0.62, ph = p.Hh * 0.62, px = -p.W / 2 + p.W * 0.08, py = -p.Hh * 0.82;
    s += `<rect x="${n(px)}" y="${n(py)}" width="${n(pw)}" height="${n(ph)}" rx="0.6" fill="#d9dde3" stroke="${U.darken('#d9dde3', 0.4)}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(px + pw * 0.12)}" y="${n(py + ph * 0.22)}" width="${n(pw * 0.5)}" height="${n(ph * 0.56)}" fill="#1f2933" stroke="#333" stroke-width="${n(S.lw * 0.6)}"/>` + txt(S, px + pw * 0.37, py + ph * 0.5, p.temp, Math.min(ph * 0.4, S.fs), '#8ef0a0', 'font-weight="700"');
    const kx = px + pw * 0.8, ky = py + ph * 0.5, kr = Math.min(ph, pw) * 0.25;
    s += `<circle cx="${n(kx)}" cy="${n(ky)}" r="${n(kr)}" fill="#4b5563" stroke="#1f2933" stroke-width="${n(S.lw * 0.6)}"/><path d="M ${n(kx)} ${n(ky)} L ${n(kx + kr * 0.8)} ${n(ky - kr * 0.6)}" stroke="#f3f4f6" stroke-width="${n(kr * 0.3)}" stroke-linecap="round"/>`;
    return s;
  },
});
lab({
  type: 'labjack', name: 'Lab jack / tilt stage', keywords: 'lab jack scissor lift tilt stage platform height adjust goniometer',
  defaults: { W: 28, Hh: 18, D: 18, tilt: 22, color: '#8a8f97', top: '#6e737b', ang: 32, depthK: 0.5, tiltTop: true },
  params: [{ key: 'tiltTop', label: 'Tilting top plate', type: 'bool' }, { key: 'tilt', label: 'Tilt angle', type: 'range', min: 0, max: 60, step: 1, show: p => p.tiltTop, animatable: true },
    { key: 'color', label: 'Frame colour', type: 'color' }, { key: 'top', label: 'Plate colour', type: 'color' },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 200, step: 0.5 }, { key: 'Hh', label: 'Height', type: 'number', unit: 'mm', min: 4, max: 200, step: 0.5 }, { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 2, max: 200, step: 0.5 }, ...obliqueParams],
  bbox(p) { const c = OB.cam(p.ang, p.depthK); return [-p.W / 2, -p.Hh - p.D * c.ky - (p.tiltTop ? p.W * Math.sin(U.rad(p.tilt)) + 2 : 2), p.W / 2 + p.D * c.kx, 0.5]; },
  draw(p, S) {
    const c = OB.cam(p.ang, p.depthK), x0 = -p.W / 2, plate = Math.max(1, p.Hh * 0.08);
    const P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + x0, q[1]]; };
    let s = `<g transform="translate(${n(x0)} 0)">${OB.box(c, 0, 0, p.W, plate, p.D, p.color, S)}</g>`;
    // scissor legs (front and back pairs)
    const legs = d => { const a = P(p.W * 0.08, plate, d), b = P(p.W * 0.92, p.Hh - plate, d), e = P(p.W * 0.92, plate, d), f = P(p.W * 0.08, p.Hh - plate, d); return `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${U.darken(p.color, 0.35)}" stroke-width="${n(Math.max(0.5, p.W * 0.035))}" stroke-linecap="round"/><line x1="${n(e[0])}" y1="${n(e[1])}" x2="${n(f[0])}" y2="${n(f[1])}" stroke="${U.darken(p.color, 0.35)}" stroke-width="${n(Math.max(0.5, p.W * 0.035))}" stroke-linecap="round"/>`; };
    s += legs(p.D * 0.8) + legs(p.D * 0.2);
    const pv = P(p.W / 2, p.Hh / 2, p.D * 0.2); s += `<circle cx="${n(pv[0])}" cy="${n(pv[1])}" r="${n(p.W * 0.05)}" fill="#222"/>`;
    const sc = P(p.W * 0.97, p.Hh * 0.45, p.D * 0.5); s += `<circle cx="${n(sc[0])}" cy="${n(sc[1])}" r="${n(p.Hh * 0.13)}" fill="#1d1f23"/>`;
    s += `<g transform="translate(${n(x0)} ${n(-(p.Hh - plate))})">${OB.box(c, 0, 0, p.W, plate, p.D, p.top, S)}</g>`;
    if (p.tiltTop) {
      const hinge = P(0, p.Hh, p.D / 2), a = -p.tilt;
      s += `<g transform="rotate(${n(a)} ${n(hinge[0])} ${n(hinge[1])})"><g transform="translate(${n(x0)} ${n(-p.Hh - 0.15)})">${OB.box(c, 0, 0, p.W * 0.95, plate * 0.8, p.D * 0.9, U.lighten(p.top, 0.15), S)}</g></g>`;
    }
    return s;
  },
});
lab({
  type: 'ircam', name: 'Thermal / IR camera', keywords: 'thermal camera flir infrared imager ir camera bolometer',
  defaults: { W: 16, Hh: 9, D: 12, color: '#c9ced6', text: 'IR camera', ang: 32, depthK: 0.55 },
  params: [{ key: 'text', label: 'Text', type: 'text' }, { key: 'color', label: 'Colour', type: 'color' },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 4, max: 100, step: 0.5 }, { key: 'Hh', label: 'Height', type: 'number', unit: 'mm', min: 2, max: 100, step: 0.5 }, { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 2, max: 100, step: 0.5 }, ...obliqueParams],
  bbox(p) { const c = OB.cam(p.ang, p.depthK); return [-p.W / 2, -p.Hh / 2 - p.D * c.ky, p.W / 2 + p.D * c.kx, p.Hh / 2]; },
  draw(p, S) {
    const c = OB.cam(p.ang, p.depthK);
    let s = `<g transform="translate(${n(-p.W / 2)} ${n(p.Hh / 2)})">${OB.box(c, 0, 0, p.W, p.Hh, p.D, p.color, S)}</g>`;
    [-0.22, 0.22].forEach(k => { const cx = p.W * k, r = Math.min(p.Hh, p.W) * 0.3; s += `<circle cx="${n(cx)}" cy="0" r="${n(r)}" fill="#20232a" stroke="#0d0f12" stroke-width="${n(S.lw * 0.6)}"/><circle cx="${n(cx)}" cy="0" r="${n(r * 0.55)}" fill="#3c4250"/><circle cx="${n(cx - r * 0.25)}" cy="${n(-r * 0.25)}" r="${n(r * 0.15)}" fill="#fff" opacity="0.5"/>`; });
    if (p.text) { // lying on the top face: x along the width, text "up" along the depth
      const q = OB.P(c, p.W / 2, p.Hh / 2, p.D * 0.5), fs = Math.min(p.D * 0.42, p.W * 1.7 / Math.max(4, p.text.length));
      s += `<text transform="matrix(1 0 ${n(-c.kx)} ${n(c.ky)} ${n(q[0] - p.W / 2)} ${n(q[1])})" font-family="${U.esc(S.font)}" font-size="${n(fs)}" fill="#111" text-anchor="middle" dominant-baseline="central" font-weight="700">${RNBX.text.markup(p.text, fs)}</text>`;
    }
    return s;
  },
});
lab({
  type: 'laptop', name: 'Laptop / computer', keywords: 'laptop computer pc acquisition software screen spectrum plot',
  defaults: { W: 24, color: '#7a8090', screen: '#eaf2fb', curves: '#c0392b, #1f77b4, #7d3c98', ang: 30, depthK: 0.6, open: 105 },
  params: [{ key: 'color', label: 'Body colour', type: 'color' }, { key: 'screen', label: 'Screen colour', type: 'color' }, { key: 'curves', label: 'Curve colours (comma)', type: 'text' },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 6, max: 150, step: 0.5 }, { key: 'open', label: 'Lid angle', type: 'range', min: 80, max: 140, step: 1 }, ...obliqueParams],
  bbox(p) { const c = OB.cam(p.ang, p.depthK), D = p.W * 0.62; return [-p.W / 2, -p.W * 0.62 - D * c.ky, p.W / 2 + D * c.kx, 1]; },
  draw(p, S) {
    const c = OB.cam(p.ang, p.depthK), W = p.W, D = W * 0.62, Hs = W * 0.6, t = Math.max(0.5, W * 0.03), x0 = -W / 2;
    const P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + x0, q[1]]; };
    let s = `<g transform="translate(${n(x0)} 0)">${OB.box(c, 0, 0, W, t, D, p.color, S)}</g>`;
    // keyboard
    s += OB.poly([P(W * 0.1, t, D * 0.15), P(W * 0.9, t, D * 0.15), P(W * 0.9, t, D * 0.7), P(W * 0.1, t, D * 0.7)], U.darken(p.color, 0.3), `stroke="none"`);
    // lid: leaning back by (open − 90)
    const lean = Math.cos(U.rad(p.open)) * -1;
    const Lp = (x, z) => P(x, t + z, D + lean * z * 0.8);
    s += OB.poly([Lp(0, 0), Lp(W, 0), Lp(W, Hs), Lp(0, Hs)], U.darken(p.color, 0.15), `stroke="${U.darken(p.color, 0.5)}" stroke-width="${n(S.lw * 0.6)}"`);
    const scr = [Lp(W * 0.05, Hs * 0.06), Lp(W * 0.95, Hs * 0.06), Lp(W * 0.95, Hs * 0.94), Lp(W * 0.05, Hs * 0.94)];
    s += OB.poly(scr, p.screen, `stroke="none"`);
    String(p.curves).split(/[,;\s]+/).filter(x => /^#/.test(x)).forEach((col, k) => {
      let d = '';
      for (let i = 0; i <= 40; i++) { const u = i / 40, v = 0.25 + 0.5 * Math.exp(-Math.pow((u - 0.35 - k * 0.12) / 0.07, 2)) + 0.12 * k; const q = Lp(W * (0.1 + 0.8 * u), Hs * (0.12 + 0.75 * (1 - v) * 0.6 + 0.12)); d += (i ? ' L ' : 'M ') + n(q[0]) + ' ' + n(q[1]); }
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(Math.max(0.12, W * 0.008))}"/>`;
    });
    return s;
  },
});
lab({
  type: 'pipette', name: 'Pipette with droplet', keywords: 'pipette micropipette drop casting droplet analyte dispense liquid',
  defaults: { L: 26, color: '#9aa5b3', drop: '#5fa8d3', tilt: -28, showDrop: true },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 5, max: 150, step: 0.5 }, { key: 'color', label: 'Body colour', type: 'color' },
    { key: 'showDrop', label: 'Droplet', type: 'bool' }, { key: 'drop', label: 'Droplet colour', type: 'color', show: p => p.showDrop }, { key: 'tilt', label: 'Tilt', type: 'range', min: -90, max: 90, step: 1 }],
  bbox: p => [-p.L * 0.45, -p.L * 0.55, p.L * 0.45, p.L * 0.6],
  draw(p, S) {
    const L = p.L, w = L * 0.11;
    let g = '';
    g += `<rect x="${n(-w * 0.35)}" y="${n(-L * 0.55)}" width="${n(w * 0.7)}" height="${n(L * 0.12)}" rx="${n(w * 0.2)}" fill="#e9ecf1" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    g += `<rect x="${n(-w / 2)}" y="${n(-L * 0.43)}" width="${n(w)}" height="${n(L * 0.48)}" rx="${n(w * 0.35)}" fill="url(#rbx-pip)" stroke="${U.darken(p.color, 0.4)}" stroke-width="${n(S.lw * 0.6)}"/>`;
    g += `<defs><linearGradient id="rbx-pip" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${U.lighten(p.color, 0.3)}"/><stop offset="0.5" stop-color="${p.color}"/><stop offset="1" stop-color="${U.darken(p.color, 0.3)}"/></linearGradient></defs>`;
    g += `<rect x="${n(-w * 0.62)}" y="${n(-L * 0.36)}" width="${n(w * 1.24)}" height="${n(L * 0.05)}" rx="${n(w * 0.1)}" fill="${U.darken(p.color, 0.25)}"/>`;
    g += `<path d="M ${n(-w * 0.32)} ${n(L * 0.05)} L ${n(w * 0.32)} ${n(L * 0.05)} L ${n(w * 0.06)} ${n(L * 0.42)} L ${n(-w * 0.06)} ${n(L * 0.42)} Z" fill="#f3f5f8" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    if (p.showDrop) { const r = w * 0.32, y = L * 0.42 + r * 1.6; g += `<path d="M 0 ${n(y - r * 1.9)} C ${n(r * 0.3)} ${n(y - r * 1.2)} ${n(r)} ${n(y - r * 0.6)} ${n(r)} ${n(y)} A ${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(y)} C ${n(-r)} ${n(y - r * 0.6)} ${n(-r * 0.3)} ${n(y - r * 1.2)} 0 ${n(y - r * 1.9)} Z" fill="${p.drop}" stroke="${U.darken(p.drop, 0.35)}" stroke-width="${n(S.lw * 0.5)}"/>`; }
    return `<g transform="rotate(${n(p.tilt)})">${g}</g>`;
  },
});
lab({
  type: 'flowcell', name: 'Flow cell (inlet / outlet)', keywords: 'flow cell microfluidic channel inlet outlet liquid cell sensor',
  defaults: { W: 30, Hh: 5, D: 16, color: '#d6eaf3', fluid: '#4f9fd1', ang: 32, depthK: 0.5, title: 'Flow cell', labels: true },
  params: [{ key: 'title', label: 'Text', type: 'text' }, { key: 'labels', label: 'Inlet / outlet labels', type: 'bool' }, { key: 'color', label: 'Cell colour', type: 'color' }, { key: 'fluid', label: 'Fluid colour', type: 'color' },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 200, step: 0.5 }, { key: 'Hh', label: 'Height', type: 'number', unit: 'mm', min: 1, max: 60, step: 0.5 }, { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 2, max: 200, step: 0.5 }, ...obliqueParams],
  bbox(p) { const c = OB.cam(p.ang, p.depthK); return [-p.W / 2 - 9, -p.Hh / 2 - p.D * c.ky - 6, p.W / 2 + p.D * c.kx + 9, p.Hh / 2 + 1]; },
  draw(p, S) {
    const c = OB.cam(p.ang, p.depthK), x0 = -p.W / 2, z0 = -p.Hh / 2;
    const P = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + x0, q[1] - z0]; };
    let s = `<g transform="translate(${n(x0)} ${n(-z0)})">${OB.box(c, 0, 0, p.W, p.Hh, p.D, p.color, S)}</g>`;
    // fluid channel seen on the front: a row of droplets
    for (let i = 0; i < 7; i++) { const q = P(p.W * (0.1 + i * 0.13), p.Hh * 0.2, 0); s += `<path d="M ${n(q[0])} ${n(q[1] - p.Hh * 0.5)} q ${n(p.W * 0.04)} ${n(p.Hh * 0.3)} 0 ${n(p.Hh * 0.5)} q ${n(-p.W * 0.04)} ${n(-p.Hh * 0.2)} 0 ${n(-p.Hh * 0.5)} Z" fill="${p.fluid}" opacity="0.85"/>`; }
    // tubes
    [[0.12, 'Inlet', -1], [0.88, 'Outlet', 1]].forEach(([u, lab2, sg]) => {
      const b = P(p.W * u, p.Hh, p.D * 0.5), t = [b[0], b[1] - 4];
      s += `<rect x="${n(b[0] - 0.7)}" y="${n(t[1])}" width="1.4" height="${n(b[1] - t[1])}" fill="#d9a441" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
      if (p.labels) s += `<line x1="${n(b[0] + sg * 1.5)}" y1="${n(t[1] + 1)}" x2="${n(b[0] + sg * 6)}" y2="${n(t[1] + 1)}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>` + H.arrowHead(b[0] + sg * (sg > 0 ? 6 : 1.5), t[1] + 1, sg > 0 ? 0 : Math.PI, 1, S.ink) + `<text x="${n(b[0] + sg * 6.6)}" y="${n(t[1] + 1)}" font-family="${U.esc(S.font)}" font-size="${n(S.fs * 0.85)}" fill="${S.ink}" text-anchor="${sg > 0 ? 'start' : 'end'}" dominant-baseline="central">${lab2}</text>`;
    });
    if (p.title) { const q = P(p.W * 0.5, p.Hh * 0.75, 0); s += txt(S, q[0], q[1], p.title, Math.min(S.fs, p.Hh * 0.45), '#1d3a4a', 'font-weight="700"'); }
    return s;
  },
});
lib.register({
  type: 'bulb', name: 'Light bulb', category: 'Graphical abstract', annotation: true, autoLabel: false, abbr: '',
  keywords: 'light bulb lamp source glow illumination incandescent',
  defaults: { r: 6, glow: '#ffe27a', on: true, rot: 0 },
  params: [{ key: 'r', label: 'Size', type: 'number', unit: 'mm', min: 1, max: 80, step: 0.5 }, { key: 'on', label: 'Glowing', type: 'bool' }, { key: 'glow', label: 'Glow colour', type: 'color' }],
  bbox: p => [-p.r * (p.on ? 2 : 1.1), -p.r * (p.on ? 2 : 1.1), p.r * (p.on ? 2 : 1.1), p.r * 2.6],
  draw(p, S, obj) {
    const r = p.r, id = 'rbx-bulb-' + (obj ? obj.id : 'x');
    let s = '';
    if (p.on) s += `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.35" stop-color="${p.glow}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient></defs><circle cx="0" cy="0" r="${n(r * 2.1)}" fill="url(#${id})"/>`;
    s += `<path d="M ${n(-r * 0.42)} ${n(r * 0.95)} C ${n(-r * 0.5)} ${n(r * 0.55)} ${n(-r)} ${n(r * 0.3)} ${n(-r)} ${n(-r * 0.15)} A ${n(r)} ${n(r)} 0 1 1 ${n(r)} ${n(-r * 0.15)} C ${n(r)} ${n(r * 0.3)} ${n(r * 0.5)} ${n(r * 0.55)} ${n(r * 0.42)} ${n(r * 0.95)} Z" fill="${p.on ? U.lighten(p.glow, 0.55) : '#f4f6f8'}" fill-opacity="0.92" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    s += `<path d="M ${n(-r * 0.25)} ${n(r * 0.9)} L ${n(-r * 0.18)} ${n(-r * 0.1)} L 0 ${n(-r * 0.4)} L ${n(r * 0.18)} ${n(-r * 0.1)} L ${n(r * 0.25)} ${n(r * 0.9)} M ${n(-r * 0.18)} ${n(-r * 0.1)} L ${n(-r * 0.35)} ${n(-r * 0.55)} M ${n(r * 0.18)} ${n(-r * 0.1)} L ${n(r * 0.35)} ${n(-r * 0.55)}" fill="none" stroke="${p.on ? '#9a5b00' : '#666'}" stroke-width="${n(S.lw)}" stroke-linecap="round"/>`;
    for (let i = 0; i < 3; i++) s += `<rect x="${n(-r * 0.45)}" y="${n(r * (0.98 + i * 0.32))}" width="${n(r * 0.9)}" height="${n(r * 0.28)}" rx="${n(r * 0.1)}" fill="${i === 2 ? '#3a3d42' : '#b9bec6'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    return s;
  },
});
})();
