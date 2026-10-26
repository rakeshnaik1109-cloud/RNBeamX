/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/optics.js
   Passive optics: mirrors, beam splitters, lenses, objectives,
   polarisation optics, filters, gratings, prisms, apertures,
   modulators and nonlinear crystals.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n, P = lib.P;

/* 3D helper: a round optic in a black anodised ring mount */
const roundOptic = (x0, x1, r, mat, bh, ring = true) => {
  const parts = [{ kind: 'cyl', x: [x0, x1], r: [r, r], mat }];
  if (ring) parts.push({ kind: 'cyl', x: [x1, x1 + 0.9], r: [r + 0.7, r + 0.7], mat: 'anod' });
  return parts;
};
const plateMount = (x, d, bh) => ({ kind: 'box', x: [x, x + 1.1], y: [-d / 2 - 0.9, d / 2 + 0.9], z: [bh - d / 2 - 0.9, bh + d / 2 + 0.9], mat: 'anod' });

/* ================= Mirrors & splitters ================= */
lib.register({
  type: 'mirror', name: 'Mirror', abbr: 'M', category: 'Mirrors & splitters', keywords: 'mirror dielectric silver gold steering',
  defaults: { d: 8, t: 1.3, R: 1, coating: 'silver' },
  params: [P.diameter(), P.thick(), { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'coating', label: 'Look', type: 'select', options: [['silver', 'Silver / dielectric'], ['gold', 'Gold'], ['dark', 'Dark substrate']] }],
  variants: [{ name: 'Gold mirror', props: { coating: 'gold' }, keywords: 'gold infrared' }],
  snap: 'mirror', mount: true, labelPos: [0, 7],
  bbox: p => [-0.2, -p.d / 2, p.t, p.d / 2],
  draw(p, S) {
    const body = p.coating === 'gold' ? S.fill('gold') : p.coating === 'dark' ? S.fill('dark') : S.fill('mirror');
    let s = H.rect(S, 0, -p.d / 2, p.t, p.d, body);
    s += H.sheen(S, 0, -p.d / 2, p.t, p.d * 0.4);
    // reflective face: a heavier front line in the line-art tradition
    s += H.line(S, 0, -p.d / 2, 0, p.d / 2, '', 2.2, p.coating === 'gold' ? '#8a6a12' : S.ink);
    if (!S.shaded) for (let y = -p.d / 2 + 1; y < p.d / 2 - 0.2; y += 1.1) s += H.line(S, p.t, y, p.t + 0.8, y - 0.8, '', 0.7);
    return s;
  },
  optics: p => [{ kind: 'mirror', a: [0, -p.d / 2], b: [0, p.d / 2], R: p.R }],
  solid: (p, bh) => [{ kind: 'cyl', x: [0, p.t], r: [p.d / 2, p.d / 2], mat: p.coating === 'gold' ? 'gold' : 'mirror' }, plateMount(p.t, p.d, bh)],
});

lib.register({
  type: 'cmirror', name: 'Concave mirror', abbr: 'CM', category: 'Mirrors & splitters', keywords: 'concave curved spherical focusing mirror',
  defaults: { d: 9, t: 1.6, f: 100, R: 1 },
  params: [P.diameter(9), P.thick(1.6), { key: 'f', label: 'Focal length (R/2)', type: 'number', unit: 'mm', min: -5000, max: 5000, step: 1, hint: 'Physical mm; drawn scale set in Figure ▸ Scale' },
    { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01 }],
  snap: 'mirror', mount: true, labelPos: [0, 7.5],
  bbox: p => [0, -p.d / 2, p.t + 0.6, p.d / 2],
  draw(p, S) {
    const r = p.d / 2, sag = Math.min(1.1, p.d * 0.1) * Math.sign(p.f || 1);
    let s = `<path d="M 0 ${n(-r)} Q ${n(2 * sag)} 0 0 ${n(r)} L ${n(p.t + 0.6)} ${n(r)} L ${n(p.t + 0.6)} ${n(-r)} Z" fill="${S.fill('mirror')}" ${H.stroke(S)}/>`;
    s += `<path d="M 0 ${n(-r)} Q ${n(2 * sag)} 0 0 ${n(r)}" fill="none" ${H.stroke(S, 2.2)}/>`;
    return s;
  },
  optics: p => [{ kind: 'mirror', a: [0, -p.d / 2], b: [0, p.d / 2], R: p.R, f: p.f }],
  solid: (p, bh) => [{ kind: 'cyl', x: [0, p.t + 0.6], r: [p.d / 2, p.d / 2], mat: 'mirror' }, plateMount(p.t + 0.6, p.d, bh)],
});

lib.register({
  type: 'bsplate', name: 'Beam splitter (plate)', abbr: 'BS', category: 'Mirrors & splitters', keywords: 'beam splitter plate partial reflector 50:50',
  defaults: { d: 8, t: 0.8, R: 0.5 },
  params: [P.diameter(), P.thick(0.8), { key: 'R', label: 'Reflectance R (T = 1 − R)', type: 'range', min: 0, max: 1, step: 0.01 }],
  snap: 'mirror', mount: true, labelPos: [0, 7],
  bbox: p => [-0.2, -p.d / 2, p.t, p.d / 2],
  draw(p, S) {
    let s = H.rect(S, 0, -p.d / 2, p.t, p.d, S.fill('glass'), S.shaded ? '' : 'fill-opacity="0.85"');
    s += H.line(S, 0, -p.d / 2, 0, p.d / 2, '', 1.8, '#5a6b80');
    return s;
  },
  optics: p => [{ kind: 'splitter', a: [0, -p.d / 2], b: [0, p.d / 2], R: p.R }],
  solid: (p, bh) => [{ kind: 'cyl', x: [0, p.t], r: [p.d / 2, p.d / 2], mat: 'glass' }, plateMount(p.t, p.d, bh)],
});

const cube = (type, name, abbr, kind, extra = {}) => lib.register(Object.assign({
  type, name, abbr, category: 'Mirrors & splitters',
  defaults: { s: 6, R: 0.5 },
  params: [{ key: 's', label: 'Cube size', type: 'number', unit: 'mm', min: 2, max: 40, step: 0.5 }].concat(kind === 'splitter' ? [{ key: 'R', label: 'Reflectance R', type: 'range', min: 0, max: 1, step: 0.01 }] : []),
  snap: 'cube', labelPos: [0, 6.5],
  bbox: p => [-p.s / 2, -p.s / 2, p.s / 2, p.s / 2],
  draw(p, S) {
    const h = p.s / 2;
    let s = H.rect(S, -h, -h, p.s, p.s, S.fill('glass'), S.shaded ? '' : 'fill-opacity="0.85"');
    s += H.sheen(S, -h, -h, p.s, p.s * 0.35);
    s += H.line(S, -h, h, h, -h, '', kind === 'pbs' ? 1.6 : 1.1, kind === 'pbs' ? '#3d5a80' : S.ink);
    if (kind === 'pbs' && !S.shaded) s += H.line(S, -h + 0.45, h, h, -h + 0.45, 'stroke-dasharray="0.6 0.5"', 0.6);
    return s;
  },
  optics: p => [{ kind, a: [-p.s / 2, p.s / 2], b: [p.s / 2, -p.s / 2], R: p.R }],
  solid: (p, bh) => [{ kind: 'box', x: [-p.s / 2, p.s / 2], y: [-p.s / 2, p.s / 2], z: [bh - p.s / 2, bh + p.s / 2], mat: 'glass', diag: true }],
  mount: true, postR: 0.9,
}, extra));
cube('bscube', 'Beam splitter cube', 'BS', 'splitter', { keywords: 'non polarizing beam splitter cube npbs 50:50' });
cube('pbs', 'Polarising beam splitter', 'PBS', 'pbs', { keywords: 'polarizing beam splitter cube pbs', defaults: { s: 6 } });

lib.register({
  type: 'dichroic', name: 'Dichroic mirror', abbr: 'DM', category: 'Mirrors & splitters', keywords: 'dichroic long pass short pass beamsplitter raman fluorescence',
  defaults: { d: 9, t: 0.9, edge: 550, mode: 'longpass' },
  params: [P.diameter(9), P.thick(0.9),
    { key: 'mode', label: 'Transmits', type: 'select', options: [['longpass', 'Long wavelengths (long-pass)'], ['shortpass', 'Short wavelengths (short-pass)']] },
    { key: 'edge', label: 'Edge wavelength', type: 'wavelength', unit: 'nm', min: 200, max: 3000, step: 1 }],
  snap: 'mirror', mount: true, labelPos: [0, 7.5],
  bbox: p => [-0.2, -p.d / 2, p.t, p.d / 2],
  draw(p, S) {
    const c = U.wavelengthColor(p.mode === 'longpass' ? p.edge + 40 : p.edge - 40);
    let s = H.rect(S, 0, -p.d / 2, p.t, p.d, U.lighten(c, S.shaded ? 0.35 : 0.6));
    s += H.sheen(S, 0, -p.d / 2, p.t, p.d * 0.4);
    s += H.line(S, 0, -p.d / 2, 0, p.d / 2, '', 1.8, U.darken(c, 0.2));
    return s;
  },
  optics: p => [{ kind: 'dichroic', a: [0, -p.d / 2], b: [0, p.d / 2], edge: p.edge, mode: p.mode }],
  solid: (p, bh) => [{ kind: 'cyl', x: [0, p.t], r: [p.d / 2, p.d / 2], mat: { color: U.lighten(U.wavelengthColor(p.mode === 'longpass' ? p.edge + 40 : p.edge - 40), 0.35), alpha: 0.6 } }, plateMount(p.t, p.d, bh)],
});

lib.register({
  type: 'retro', name: 'Retroreflector', abbr: 'RR', category: 'Mirrors & splitters', keywords: 'retroreflector corner cube delay line hollow roof',
  defaults: { d: 8 },
  params: [P.diameter()],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [0, -p.d / 2, p.d * 0.55, p.d / 2],
  draw(p, S) {
    const r = p.d / 2;
    return `<path d="M 0 ${n(-r)} L ${n(r * 1.05)} 0 L 0 ${n(r)} L ${n(r * 0.28)} ${n(r)} L ${n(r * 1.05 + 0.3)} 0 L ${n(r * 0.28)} ${n(-r)} Z" fill="${S.fill('mirror')}" ${H.stroke(S)}/>` +
      `<path d="M 0 ${n(-r)} L ${n(r * 1.05)} 0 L 0 ${n(r)}" fill="none" ${H.stroke(S, 1.8)}/>`;
  },
  optics: p => [{ kind: 'retro', a: [0, -p.d / 2], b: [0, p.d / 2] }],
  solid: (p, bh) => [{ kind: 'poly', pts: [[0, -p.d / 2], [p.d * 0.55, 0], [0, p.d / 2]], z: [bh - p.d / 2, bh + p.d / 2], mat: 'mirror' }],
});

lib.register({
  type: 'slm', name: 'Spatial light modulator', abbr: 'SLM', category: 'Mirrors & splitters', keywords: 'slm spatial light modulator dmd phase hologram liquid crystal lcos',
  defaults: { w: 11, t: 2.6, R: 1, pattern: 'phase' },
  params: [{ key: 'w', label: 'Panel width', type: 'number', unit: 'mm', min: 3, max: 50, step: 0.5 }, P.thick(2.6),
    { key: 'pattern', label: 'Front pattern', type: 'select', options: [['phase', 'Phase grating'], ['pixels', 'Pixel grid'], ['none', 'Plain']] }],
  variants: [{ name: 'Digital micromirror device (DMD)', abbr: 'DMD', props: { pattern: 'pixels' }, keywords: 'dmd micromirror' }],
  snap: 'mirror', labelPos: [0, 8],
  bbox: p => [-0.5, -p.w / 2, p.t, p.w / 2],
  draw(p, S) {
    let s = H.rect(S, 0, -p.w / 2, p.t, p.w, S.fill('dark'), 'rx="0.3"');
    s += H.sheen(S, 0, -p.w / 2, p.t, p.w * 0.4);
    const k = 10, dy = p.w / k;
    let face = '';
    for (let i = 0; i < k; i++) {
      const y = -p.w / 2 + i * dy;
      const shade = p.pattern === 'phase' ? U.mix('#2a3b55', '#c9d6ea', (i % 4) / 3) : p.pattern === 'pixels' ? (i % 2 ? '#9fb0c6' : '#5f7190') : '#8c9bb0';
      face += `<rect x="${n(-0.5)}" y="${n(y)}" width="0.5" height="${n(dy)}" fill="${shade}" stroke="none"/>`;
    }
    return s + face + H.line(S, 0, -p.w / 2, 0, p.w / 2, '', 1.2);
  },
  optics: p => [{ kind: 'mirror', a: [0, -p.w / 2], b: [0, p.w / 2], R: p.R }],
  solid: (p, bh) => [{ kind: 'box', x: [0, p.t], y: [-p.w / 2, p.w / 2], z: [bh - p.w * 0.4, bh + p.w * 0.4], mat: 'dark' }, { kind: 'box', x: [-0.12, 0], y: [-p.w / 2 + 0.5, p.w / 2 - 0.5], z: [bh - p.w * 0.35, bh + p.w * 0.35], mat: 'mirror' }],
  mount: true,
});

/* ================= Lenses & objectives ================= */
lib.register({
  type: 'lens', name: 'Lens', abbr: 'L', category: 'Lenses & objectives', keywords: 'lens convex concave focusing collimating achromat',
  defaults: { d: 8, f: 100, shape: 'biconvex', t: 1.6 },
  params: [P.diameter(),
    { key: 'f', label: 'Focal length', type: 'number', unit: 'mm', min: -10000, max: 10000, step: 1, hint: 'Physical mm. Drawn focus = f ÷ figure scale' },
    { key: 'shape', label: 'Shape', type: 'select', options: [['biconvex', 'Biconvex'], ['planoconvex', 'Plano-convex'], ['biconcave', 'Biconcave'], ['planoconcave', 'Plano-concave']] },
    { key: 't', label: 'Drawn thickness', type: 'number', unit: 'mm', min: 0.4, max: 8, step: 0.1 }],
  variants: [
    { name: 'Plano-convex lens', props: { shape: 'planoconvex' } },
    { name: 'Concave (diverging) lens', props: { shape: 'biconcave', f: -100 }, keywords: 'negative diverging' },
  ],
  snap: 'perp', mount: true, labelPos: [0, 7],
  init(obj) { obj.label.text = obj.label.text; },
  bbox: p => [-p.t / 2 - 0.4, -p.d / 2, p.t / 2 + 0.4, p.d / 2],
  draw(p, S) {
    const r = p.d / 2;
    let s = `<path d="${H.lensPath(p.shape, r, p.t)}" fill="${S.fill('glass')}" ${S.shaded ? '' : 'fill-opacity="0.85"'} ${H.stroke(S)}/>`;
    if (S.shaded) s += `<path d="M ${n(-p.t * 0.12)} ${n(-r * 0.7)} Q ${n(p.t * 0.25)} ${n(-r * 0.2)} ${n(-p.t * 0.05)} ${n(r * 0.35)}" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="${n(S.lw * 1.4)}" stroke-linecap="round"/>`;
    return s;
  },
  optics: p => [{ kind: 'lens', a: [0, -p.d / 2], b: [0, p.d / 2], f: /concave/.test(p.shape) ? -Math.abs(p.f) : p.f }],
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.t / 2, p.t / 2], r: [p.d / 2, p.d / 2], mat: 'glass', lens: p.shape }, { kind: 'cyl', x: [-p.t / 2 - 0.35, -p.t / 2], r: [p.d / 2 + 0.7, p.d / 2 + 0.7], mat: 'anod', ring: true }],
});

lib.register({
  type: 'objective', name: 'Microscope objective', abbr: 'OBJ', category: 'Lenses & objectives', keywords: 'objective microscope na immersion confocal focusing',
  defaults: { fd: 3, L: 9, D1: 6, D2: 3, mag: '50×', band: 'auto', f: 0 },
  params: [
    { key: 'fd', label: 'Working distance (drawn)', type: 'number', unit: 'mm', min: 0.2, max: 40, step: 0.1, hint: 'Distance from the nose to the focus on the page' },
    { key: 'mag', label: 'Magnification (engraved)', type: 'text' },
    { key: 'L', label: 'Barrel length', type: 'number', unit: 'mm', min: 3, max: 30, step: 0.5 },
    { key: 'D1', label: 'Back diameter', type: 'number', unit: 'mm', min: 2, max: 20, step: 0.5 },
    { key: 'D2', label: 'Nose diameter', type: 'number', unit: 'mm', min: 1, max: 20, step: 0.5 },
    { key: 'band', label: 'Colour band', type: 'select', options: [['auto', 'From magnification'], ['#d62828', 'Red (4×)'], ['#f1c40f', 'Yellow (10×)'], ['#2a9d8f', 'Green (20×)'], ['#3a86ff', 'Light blue (40–50×)'], ['#1d3557', 'Dark blue (60×)'], ['#f8f9fa', 'White (100×)']] },
  ],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.L / 2, -p.D1 / 2, p.L / 2 + 0.6, p.D1 / 2],
  draw(p, S) {
    const L = p.L, a = p.D1 / 2, b = p.D2 / 2;
    const m = parseFloat(p.mag) || 50;
    const band = p.band !== 'auto' ? p.band : m <= 5 ? '#d62828' : m <= 10 ? '#f1c40f' : m <= 20 ? '#2a9d8f' : m <= 50 ? '#3a86ff' : m <= 63 ? '#1d3557' : '#f8f9fa';
    const x0 = -L / 2, x1 = L * 0.12, x2 = L / 2;
    let s = `<path d="M ${n(x0)} ${n(-a)} L ${n(x1)} ${n(-a)} L ${n(x2)} ${n(-b)} L ${n(x2)} ${n(b)} L ${n(x1)} ${n(a)} L ${n(x0)} ${n(a)} Z" fill="${S.fill('metal')}" ${H.stroke(S)}/>`;
    s += H.sheen(S, x0, -a, L * 0.62, a * 0.8);
    s += `<rect x="${n(x0 + L * 0.3)}" y="${n(-a)}" width="${n(L * 0.12)}" height="${n(2 * a)}" fill="${band}" stroke="none"/>`;
    s += H.line(S, x0 + L * 0.3, -a, x0 + L * 0.3, a, '', 0.6) + H.line(S, x0 + L * 0.42, -a, x0 + L * 0.42, a, '', 0.6);
    s += `<path d="M ${n(x2)} ${n(-b * 0.8)} Q ${n(x2 + 0.9)} 0 ${n(x2)} ${n(b * 0.8)} Z" fill="${S.fill('glass')}" ${H.stroke(S, 0.8)}/>`;
    return s;
  },
  optics: (p, obj, doc) => [{ kind: 'lens', a: [p.L / 2, -p.D1 / 2], b: [p.L / 2, p.D1 / 2], f: (p.fd || 3) * (doc ? doc.style.scale : 10) }],
  solid: (p, bh) => [
    { kind: 'cyl', x: [-p.L / 2, p.L * 0.12], r: [p.D1 / 2, p.D1 / 2], mat: 'metal' },
    { kind: 'cyl', x: [p.L * 0.12, p.L / 2], r: [p.D1 / 2, p.D2 / 2], mat: 'metal' },
    { kind: 'cyl', x: [-p.L / 2 + p.L * 0.3, -p.L / 2 + p.L * 0.42], r: [p.D1 / 2 + 0.03, p.D1 / 2 + 0.03], mat: { color: '#3a86ff' }, decal: true },
  ],
});

/* ================= Polarisation ================= */
const plate = (type, name, abbr, fillName, kind, defaults, params, extra = {}) => lib.register(Object.assign({
  type, name, abbr, category: 'Polarisation',
  defaults: Object.assign({ d: 8, t: 0.9 }, defaults),
  params: [P.diameter(), P.thick(0.9)].concat(params),
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2, p.d / 2],
  draw(p, S) {
    let s = H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d, S.fill(fillName));
    s += H.sheen(S, -p.t / 2, -p.d / 2, p.t, p.d * 0.4);
    if (kind === 'polarizer') for (let y = -p.d / 2 + 0.9; y < p.d / 2 - 0.3; y += 0.9) s += H.line(S, -p.t / 2, y, p.t / 2, y, '', 0.5);
    return s;
  },
  optics: p => [Object.assign({ kind, a: [0, -p.d / 2], b: [0, p.d / 2] }, p)],
  solid: (p, bh) => roundOptic(-p.t / 2, p.t / 2, p.d / 2, fillName === 'polar' ? { color: '#5b6470', alpha: 0.75 } : fillName, bh),
}, extra));
plate('hwp', 'Half-wave plate (λ/2)', 'HWP', 'wph', 'waveplate', { angle: 22.5, retardance: 180 },
  [{ key: 'angle', label: 'Fast-axis angle', type: 'number', unit: '°', min: -180, max: 180, step: 0.5, animatable: true },
    { key: 'retardance', label: 'Retardance', type: 'number', unit: '°', min: 0, max: 360, step: 1 }], { keywords: 'half wave plate lambda/2 retarder rotate polarization' });
plate('qwp', 'Quarter-wave plate (λ/4)', 'QWP', 'wpq', 'waveplate', { angle: 45, retardance: 90 },
  [{ key: 'angle', label: 'Fast-axis angle', type: 'number', unit: '°', min: -180, max: 180, step: 0.5, animatable: true },
    { key: 'retardance', label: 'Retardance', type: 'number', unit: '°', min: 0, max: 360, step: 1 }], { keywords: 'quarter wave plate lambda/4 circular' });
plate('polarizer', 'Linear polariser', 'Pol', 'polar', 'polarizer', { angle: 0 },
  [{ key: 'angle', label: 'Transmission axis', type: 'number', unit: '°', min: -180, max: 180, step: 0.5, hint: '0° = p (in the table plane), 90° = s', animatable: true }],
  { keywords: 'polarizer polariser glan analyzer analyser' });

const boxDevice = (type, name, abbr, category, cfg) => lib.register(Object.assign({
  type, name, abbr, category,
  defaults: Object.assign({ L: 9, H: 5.5 }, cfg.defaults),
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 2, max: 40, step: 0.5 }].concat(cfg.params || []),
  snap: 'perp', labelPos: [0, 6.5],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2, p.H / 2],
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [bh - p.H / 2, bh + p.H / 2], mat: cfg.mat3d || 'dark' }],
  mount: true, postR: 1,
}, cfg, {
  defaults: Object.assign({ L: 9, H: 5.5 }, cfg.defaults),
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 2, max: 40, step: 0.5 }].concat(cfg.params || []),
}));
lib.H.arrowGlyph = (S, x, y, len, color) => `<path d="M ${n(x - len / 2)} ${n(y)} L ${n(x + len / 2)} ${n(y)} M ${n(x + len / 2 - 0.9)} ${n(y - 0.6)} L ${n(x + len / 2)} ${n(y)} L ${n(x + len / 2 - 0.9)} ${n(y + 0.6)}" fill="none" ${H.stroke(S, 1, color)}/>`;

boxDevice('faraday', 'Faraday rotator', 'FR', 'Polarisation', {
  keywords: 'faraday rotator magneto optic',
  defaults: { angle: 45 }, params: [{ key: 'angle', label: 'Rotation', type: 'number', unit: '°', min: -180, max: 180, step: 1 }],
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.H / 2, p.L, p.H, S.fill('dark'), 'rx="0.6"') + H.sheen(S, -p.L / 2, -p.H / 2, p.L, p.H * 0.45, 0.6);
    return s + `<circle cx="0" cy="0" r="${n(p.H * 0.25)}" fill="none" ${H.stroke(S, 1, S.shaded ? '#e9eef5' : '#ffffff')} stroke-dasharray="${n(p.H * 0.9)} ${n(p.H * 0.4)}"/>`;
  },
  optics: p => [{ kind: 'rotator', a: [0, -p.H / 2], b: [0, p.H / 2], angle: p.angle }],
});
boxDevice('isolator', 'Optical isolator', 'ISO', 'Polarisation', {
  keywords: 'optical isolator faraday one way',
  defaults: { L: 10, H: 5 },
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.H / 2, p.L, p.H, S.fill('dark'), 'rx="1"') + H.sheen(S, -p.L / 2, -p.H / 2, p.L, p.H * 0.45, 1);
    return s + H.arrowGlyph(S, 0, 0, p.L * 0.55, S.shaded ? '#f2f4f7' : '#ffffff');
  },
  optics: p => [{ kind: 'rotator', a: [0, -p.H / 2], b: [0, p.H / 2], angle: 0, isolator: true, axis: [1, 0] }],
});

/* ================= Filters & dispersion ================= */
lib.register({
  type: 'filter', name: 'Optical filter', abbr: 'F', category: 'Filters & dispersion', keywords: 'filter bandpass longpass notch interference',
  defaults: { d: 8, t: 1, mode: 'bandpass', center: 532, width: 10, edge: 550, od: 1, T: 0.95 },
  params: [P.diameter(), P.thick(1),
    { key: 'mode', label: 'Type', type: 'select', options: [['bandpass', 'Band-pass'], ['longpass', 'Long-pass'], ['shortpass', 'Short-pass'], ['notch', 'Notch'], ['nd', 'Neutral density']] },
    { key: 'center', label: 'Centre wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.mode === 'bandpass' || p.mode === 'notch' },
    { key: 'width', label: 'Bandwidth (FWHM)', type: 'number', unit: 'nm', min: 0.1, max: 2000, step: 0.5, show: p => p.mode === 'bandpass' || p.mode === 'notch' },
    { key: 'edge', label: 'Edge wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.mode === 'longpass' || p.mode === 'shortpass' },
    { key: 'od', label: 'Optical density', type: 'number', min: 0, max: 8, step: 0.1, show: p => p.mode === 'nd' },
    { key: 'T', label: 'Peak transmission', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.mode !== 'nd' }],
  variants: [
    { name: 'Neutral density filter', abbr: 'ND', props: { mode: 'nd', od: 1 }, keywords: 'nd attenuator neutral density' },
    { name: 'Long-pass filter', abbr: 'LP', props: { mode: 'longpass', edge: 550 }, keywords: 'long pass edge raman' },
    { name: 'Notch filter', abbr: 'NF', props: { mode: 'notch', center: 532, width: 20 }, keywords: 'notch rayleigh raman' },
  ],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2, p.d / 2],
  tint: p => p.mode === 'nd' ? '#6f747b' : U.wavelengthColor(p.mode === 'longpass' ? p.edge + 60 : p.mode === 'shortpass' ? p.edge - 60 : p.center),
  draw(p, S) {
    const c = lib.get('filter').tint(p);
    let s = H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d, p.mode === 'nd' ? (S.shaded ? 'url(#rbx-nd)' : '#8c9198') : U.lighten(c, S.shaded ? 0.15 : 0.45));
    return s + H.sheen(S, -p.t / 2, -p.d / 2, p.t, p.d * 0.4);
  },
  optics: p => [Object.assign({ kind: 'filter', a: [0, -p.d / 2], b: [0, p.d / 2] }, p)],
  solid: (p, bh) => roundOptic(-p.t / 2, p.t / 2, p.d / 2, { color: lib.get('filter').tint(p), alpha: p.mode === 'nd' ? 0.8 : 0.6 }, bh),
});

lib.register({
  type: 'grating', name: 'Diffraction grating', abbr: 'G', category: 'Filters & dispersion', keywords: 'grating diffraction blazed reflective transmission spectrometer',
  defaults: { w: 11, t: 2.4, G: 1200, orders: '-1,0,1', eff0: 0.15, transmit: false },
  params: [{ key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 3, max: 60, step: 0.5 }, P.thick(2.4),
    { key: 'G', label: 'Groove density', type: 'number', unit: 'lines/mm', min: 1, max: 5000, step: 1 },
    { key: 'orders', label: 'Orders traced', type: 'text', placeholder: '-1,0,1' },
    { key: 'eff0', label: 'Zero-order fraction', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'transmit', label: 'Transmission grating', type: 'bool' }],
  variants: [{ name: 'Transmission grating', props: { transmit: true, t: 0.8, G: 600 }, keywords: 'transmission grating' }],
  snap: 'grating', mount: true, labelPos: [0, 8],
  bbox: p => [-0.6, -p.w / 2, p.t, p.w / 2],
  draw(p, S) {
    const k = Math.max(6, Math.round(p.w / 0.9)), dy = p.w / k;
    let teeth = `M 0 ${n(-p.w / 2)}`;
    for (let i = 0; i < k; i++) { const y = -p.w / 2 + i * dy; teeth += ` L ${n(-0.55)} ${n(y + dy * 0.75)} L 0 ${n(y + dy)}`; }
    if (p.transmit) {
      return H.rect(S, 0, -p.w / 2, p.t, p.w, S.fill('glass')) + `<path d="${teeth}" fill="none" ${H.stroke(S, 0.8)}/>`;
    }
    let s = H.rect(S, 0, -p.w / 2, p.t, p.w, S.fill('gold'));
    s += H.sheen(S, 0, -p.w / 2, p.t, p.w * 0.4);
    return s + `<path d="${teeth} Z" fill="${S.shaded ? 'url(#rbx-rainbow)' : '#c9b46a'}" ${H.stroke(S, 0.8)}/>`;
  },
  optics: p => [{ kind: 'grating', a: [0, -p.w / 2], b: [0, p.w / 2], G: p.G, orders: p.orders, eff0: p.eff0, transmit: p.transmit }],
  solid: (p, bh) => [{ kind: 'box', x: [0, p.t], y: [-p.w / 2, p.w / 2], z: [bh - p.w * 0.4, bh + p.w * 0.4], mat: p.transmit ? 'glass' : 'grating' }],
});

lib.register({
  type: 'prism', name: 'Dispersive prism', abbr: 'PR', category: 'Filters & dispersion', keywords: 'prism dispersive equilateral refraction',
  defaults: { s: 10, mat: 'SF11', n: 1.6, apex: 60 },
  params: [{ key: 's', label: 'Side length', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 },
    { key: 'apex', label: 'Apex angle', type: 'number', unit: '°', min: 10, max: 120, step: 1 },
    P.material(), { key: 'n', label: 'Refractive index', type: 'number', min: 1, max: 4, step: 0.01, show: p => p.mat === 'custom' }],
  labelPos: [0, 8],
  geom(p) {
    const a = U.rad(p.apex || 60) / 2, h = p.s * Math.cos(a), half = p.s * Math.sin(a);
    return [[0, -h * 2 / 3], [half, h / 3], [-half, h / 3]];
  },
  bbox(p) { const g = lib.get('prism').geom(p); return [g[2][0], g[0][1], g[1][0], g[1][1]]; },
  draw(p, S) {
    const g = lib.get('prism').geom(p);
    let s = `<path d="M ${g.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${S.fill('glass')}" ${S.shaded ? '' : 'fill-opacity="0.85"'} ${H.stroke(S)}/>`;
    if (S.shaded) s += `<path d="M ${n(g[0][0] - 0.3)} ${n(g[0][1] + 1.2)} L ${n(g[2][0] * 0.55)} ${n(g[2][1] * 0.6)}" stroke="#fff" stroke-opacity="0.8" stroke-width="${n(S.lw * 1.5)}" stroke-linecap="round"/>`;
    return s;
  },
  optics: p => [{ poly: lib.get('prism').geom(p), mat: p.mat, n: p.n }],
  solid: (p, bh) => [{ kind: 'poly', pts: lib.get('prism').geom(p), z: [bh - p.s * 0.45, bh + p.s * 0.45], mat: 'glass' }],
});

lib.register({
  type: 'window', name: 'Window / plate', abbr: 'W', category: 'Filters & dispersion', keywords: 'window plate glass slab refraction lateral shift cover',
  defaults: { d: 8, t: 2, mat: 'N-BK7', n: 1.5 },
  params: [P.diameter(), P.thick(2), P.material(), { key: 'n', label: 'Refractive index', type: 'number', min: 1, max: 4, step: 0.01, show: p => p.mat === 'custom' }],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2, p.d / 2],
  draw: (p, S) => H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d, S.fill('glass'), S.shaded ? '' : 'fill-opacity="0.8"') + H.sheen(S, -p.t / 2, -p.d / 2, p.t, p.d * 0.4),
  optics: p => [{ poly: [[-p.t / 2, -p.d / 2], [p.t / 2, -p.d / 2], [p.t / 2, p.d / 2], [-p.t / 2, p.d / 2]], mat: p.mat, n: p.n }],
  solid: (p, bh) => roundOptic(-p.t / 2, p.t / 2, p.d / 2, 'glass', bh),
});

lib.register({
  type: 'iris', name: 'Iris / aperture', abbr: 'I', category: 'Filters & dispersion', keywords: 'iris aperture diaphragm pinhole slit spatial filter',
  defaults: { d: 9, r: 1.2, t: 0.6 },
  params: [P.diameter(9), { key: 'r', label: 'Opening radius (drawn)', type: 'number', unit: 'mm', min: 0.05, max: 30, step: 0.05 }, P.thick(0.6)],
  variants: [{ name: 'Pinhole', abbr: 'PH', props: { r: 0.25, d: 7 }, keywords: 'pinhole spatial filter confocal' }, { name: 'Slit', abbr: 'Slit', props: { r: 0.3, d: 8, t: 0.9 }, keywords: 'slit entrance spectrometer' }],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2, p.d / 2],
  draw(p, S) {
    const r = Math.min(p.r, p.d / 2 - 0.3);
    return H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d / 2 - r, S.fill('black')) + H.rect(S, -p.t / 2, r, p.t, p.d / 2 - r, S.fill('black'));
  },
  optics: p => [{ kind: 'aperture', a: [0, -p.d / 2], b: [0, p.d / 2], r: p.r }],
  solid: (p, bh) => [{ kind: 'box', x: [-p.t / 2, p.t / 2], y: [-p.d / 2, -p.r], z: [bh - p.d / 2, bh + p.d / 2], mat: 'anod' }, { kind: 'box', x: [-p.t / 2, p.t / 2], y: [p.r, p.d / 2], z: [bh - p.d / 2, bh + p.d / 2], mat: 'anod' }],
});

/* ================= Modulators & nonlinear ================= */
boxDevice('aom', 'Acousto-optic modulator', 'AOM', 'Modulators & nonlinear', {
  keywords: 'aom acousto optic modulator deflector frequency shifter bragg',
  defaults: { L: 9, H: 5.5, angle: 4, eff: 0.8, order: 1 },
  params: [{ key: 'angle', label: 'Deflection angle', type: 'number', unit: '°', min: 0.1, max: 30, step: 0.1 },
    { key: 'order', label: 'Diffraction order', type: 'select', options: [[1, '+1'], [-1, '−1']] },
    { key: 'eff', label: 'First-order efficiency', type: 'range', min: 0, max: 1, step: 0.01 }],
  mat3d: 'glass',
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.H / 2, p.L, p.H, S.fill('glass'), S.shaded ? '' : 'fill-opacity="0.85"');
    s += H.rect(S, -p.L / 2, p.H / 2, p.L, 1, S.fill('gold'));
    for (let i = 1; i < 6; i++) s += H.line(S, -p.L / 2 + i * p.L / 6, -p.H / 2 + 0.6, -p.L / 2 + i * p.L / 6, p.H / 2 - 0.4, 'stroke-dasharray="0.5 0.45"', 0.5, '#5b7fa6');
    return s;
  },
  optics: p => [{ kind: 'aom', a: [0, -p.H / 2], b: [0, p.H / 2], angle: p.angle, eff: p.eff, order: Number(p.order) }],
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [bh - p.H / 2, bh + p.H / 2], mat: 'glass' }, { kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [bh + p.H / 2, bh + p.H / 2 + 0.8], mat: 'gold' }],
});
boxDevice('eom', 'Electro-optic modulator', 'EOM', 'Modulators & nonlinear', {
  keywords: 'eom electro optic modulator pockels cell phase',
  defaults: { L: 11, H: 5, retardance: 90, angle: 45 },
  params: [{ key: 'retardance', label: 'Induced retardance', type: 'number', unit: '°', min: 0, max: 360, step: 1, animatable: true },
    { key: 'angle', label: 'Crystal axis', type: 'number', unit: '°', min: -180, max: 180, step: 1 }],
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.H / 2, p.L, p.H, S.fill('crystal'));
    s += H.rect(S, -p.L / 2 + 1, -p.H / 2 - 0.7, p.L - 2, 0.7, S.fill('gold')) + H.rect(S, -p.L / 2 + 1, p.H / 2, p.L - 2, 0.7, S.fill('gold'));
    return s;
  },
  mat3d: 'crystal',
  optics: p => [{ kind: 'waveplate', a: [0, -p.H / 2], b: [0, p.H / 2], angle: p.angle, retardance: p.retardance }],
});
boxDevice('crystal', 'Nonlinear crystal', 'BBO', 'Modulators & nonlinear', {
  keywords: 'nonlinear crystal shg bbo lbo ktp ppln harmonic generation frequency doubling',
  defaults: { L: 5, H: 5, eff: 0.3, harmonic: 2 },
  params: [{ key: 'harmonic', label: 'Harmonic order', type: 'select', options: [[2, 'Second (SHG, λ/2)'], [3, 'Third (THG, λ/3)']] },
    { key: 'eff', label: 'Conversion efficiency', type: 'range', min: 0, max: 1, step: 0.01 }],
  variants: [{ name: 'PPLN crystal', abbr: 'PPLN', props: { L: 12, H: 3 }, keywords: 'ppln periodically poled' }],
  mat3d: 'crystal',
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.H / 2, p.L, p.H, S.fill('crystal'));
    for (let x = -p.L / 2 + 0.9; x < p.L / 2; x += 0.9) s += H.line(S, x, -p.H / 2, x - 0.6, p.H / 2, '', 0.35, '#b56f93');
    return s + H.sheen(S, -p.L / 2, -p.H / 2, p.L, p.H * 0.4);
  },
  optics: p => [{ kind: 'shg', a: [0, -p.H / 2], b: [0, p.H / 2], eff: p.eff, harmonic: Number(p.harmonic) }],
});
lib.register({
  type: 'chopper', name: 'Optical chopper', abbr: 'CH', category: 'Modulators & nonlinear', keywords: 'chopper lock in modulation wheel',
  defaults: { r: 5 }, params: [{ key: 'r', label: 'Wheel radius', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 }],
  labelPos: [0, 8],
  bbox: p => [-0.6, -p.r * 2, 0.6, 0.6],
  draw(p, S) {
    // edge-on wheel above the beam with a motor body
    let s = H.rect(S, -0.35, -p.r * 2, 0.7, p.r * 2 + 0.3, S.fill('black'));
    s += H.rect(S, 0.35, -p.r - 1.2, 2.2, 2.4, S.fill('dark'), 'rx="0.4"');
    return s;
  },
  optics: () => [],
  solid: (p, bh) => [{ kind: 'cyl', x: [-0.25, 0.25], r: [p.r, p.r], mat: 'anod', cz: bh + p.r * 0.75 }, { kind: 'box', x: [0.25, 2.6], y: [-1.2, 1.2], z: [bh + p.r * 0.75 - 1.2, bh + p.r * 0.75 + 1.2], mat: 'dark' }],
});
})();
