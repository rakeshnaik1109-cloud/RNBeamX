/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/sources.js
   Light sources: CW / pulsed lasers, broadband lamps, LEDs.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;

lib.colorOf = (doc, nm, override) => {
  if (override) return override;
  if (doc && doc.style.colorMode === 'mono') return RNBX.isDarkPage && RNBX.isDarkPage(doc.page) ? '#f2f4f7' : '#1f2125';
  return doc && doc.style.colorMode === 'safe' ? U.wavelengthColorSafe(nm) : U.wavelengthColor(nm);
};

const polParams = [
  { key: 'pol', label: 'Polarisation', type: 'select', options: () => RNBX.optics.POLARIZATIONS.map(p => [p.id, p.name]) },
  { key: 'polAngle', label: 'Polarisation angle', type: 'number', unit: '°', min: -180, max: 180, step: 1, show: p => p.pol === 'lin' },
];
const beamParams = [
  { key: 'beamWidth', label: 'Beam diameter (drawn)', type: 'number', unit: 'mm', min: 0.05, max: 10, step: 0.05 },
  { key: 'divergence', label: 'Divergence (half-angle)', type: 'number', unit: '°', min: -30, max: 45, step: 0.1 },
  { key: 'power', label: 'Power', type: 'number', unit: 'mW', min: 0, max: 1e6, step: 0.1 },
  { key: 'M2', label: 'Beam quality M²', type: 'number', min: 1, max: 100, step: 0.1, hint: 'Gaussian model' },
  { key: 'color', label: 'Beam colour override', type: 'color', allowEmpty: true },
  { key: 'bundle', label: 'Draw as a ray bundle (rays, 0 = off)', type: 'number', min: 0, max: 41, step: 1, hint: 'parallel rays across the beam; shows aberrations of real lenses' },
];

function rays(p, lambdas, o = [0, 0]) {
  const P = (p.power == null ? 1 : p.power) / lambdas.length;
  const N = Math.round(p.bundle || 0);
  if (N >= 2) {
    // ray bundle: N parallel rays spread over the beam diameter
    const W = (p.beamWidth || 0.7) / 2, dv = Math.tan(U.rad(p.divergence || 0));
    return lambdas.flatMap(l => Array.from({ length: N }, (_, i) => {
      const f = -1 + 2 * i / (N - 1), J = RNBX.optics.jones(p.pol, p.polAngle);
      return { o: [o[0], o[1] + f * W], d: [1, f * dv], lambda: l, P: P / N, E: J ? RNBX.optics.scaleJ(J, Math.sqrt(P / N)) : null, w: 0, dw: 0, ray: true, pulsed: !!p.pulsed, color: p.color || null };
    }));
  }
  return lambdas.map(l => {
    const J = RNBX.optics.jones(p.pol, p.polAngle);
    return { o, d: [1, 0], lambda: l, P, M2: p.M2 || 1, E: J ? RNBX.optics.scaleJ(J, Math.sqrt(P)) : null, w: (p.beamWidth || 0.7) / 2, dw: Math.tan(U.rad(p.divergence || 0)), pulsed: !!p.pulsed, color: p.color || null };
  });
}

/* ---------- laser ---------- */
lib.register({
  type: 'laser', name: 'Laser (CW)', abbr: 'Laser', category: 'Sources', labelTemplate: 'Laser {lambda} nm',
  keywords: 'laser source cw diode helium neon nd yag',
  defaults: { lambda: 532, extra: '', power: 10, beamWidth: 0.7, divergence: 0, pol: 'H', polAngle: 0, pulsed: false, color: '', L: 16, H: 6, text: '' },
  params: [
    { key: 'lambda', label: 'Wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 12000, step: 1 },
    { key: 'extra', label: 'Extra lines (nm, comma-separated)', type: 'text', placeholder: 'e.g. 1064' },
    { key: 'pulsed', label: 'Pulsed (animates as pulses)', type: 'bool' },
    ...polParams, ...beamParams,
    { key: 'L', label: 'Body length', type: 'number', unit: 'mm', min: 4, max: 60, step: 0.5 },
    { key: 'H', label: 'Body height', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 },
    { key: 'text', label: 'Text on body', type: 'text' },
  ],
  variants: [
    { name: 'Pulsed / ultrafast laser', props: { pulsed: true, lambda: 800, text: 'fs', L: 18 }, keywords: 'femtosecond ti sapphire pulsed ultrafast' },
    { name: 'Diode laser', props: { L: 8, H: 4.5, lambda: 785, power: 100 }, keywords: 'diode 785 raman' },
    { name: 'He–Ne laser', props: { L: 22, H: 5, lambda: 632.8, power: 2 }, keywords: 'hene helium neon' },
  ],
  labelPos: [0, 6.2],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2 + 0.9, p.H / 2],
  draw(p, S) {
    const L = p.L, h = p.H, c = lib.colorOf(S.doc, p.lambda, p.color);
    const r = Math.min(1, h * 0.18);
    let s = H.rect(S, -L / 2, -h / 2, L, h, S.shaded ? S.fill('dark') : S.flat('body'), `rx="${n(r)}"`);
    s += H.sheen(S, -L / 2, -h / 2, L, h * 0.45, r);
    // wavelength stripe and output aperture
    s += `<rect x="${n(L / 2 - Math.min(3.2, L * 0.22))}" y="${n(-h / 2)}" width="${n(Math.min(1.1, L * 0.08))}" height="${n(h)}" fill="${c}" opacity="0.9" stroke="none"/>`;
    s += H.rect(S, L / 2, -Math.min(1.1, h * 0.22), 0.9, Math.min(2.2, h * 0.44), S.fill('metal'));
    if (p.pulsed && !p.text) s += `<path d="M ${n(-L * 0.3)} 0 l ${n(L * 0.08)} 0 l ${n(L * 0.04)} ${n(-h * 0.22)} l ${n(L * 0.04)} ${n(h * 0.22)} l ${n(L * 0.08)} 0" fill="none" ${H.stroke(S, 1.1, S.shaded ? '#e9eef5' : S.ink)}/>`;
    if (p.text) s += H.text(S, -1.2, 0, p.text, { color: S.shaded ? '#f2f4f7' : S.ink, size: Math.min(h * 0.5, S.fs * 0.95), bold: true });
    return s;
  },
  optics: p => H.boxAbsorb(-p.L / 2, -p.H / 2, p.L / 2 + 0.9, p.H / 2),
  source(p) {
    const ls = [p.lambda].concat(String(p.extra || '').split(/[,;\s]+/).map(Number).filter(v => v > 0));
    return rays(p, ls, [p.L / 2 + 0.95, 0]);
  },
  solid: (p, bh) => [
    { kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [0, bh + p.H * 0.55], mat: 'laserhead' },
    { kind: 'box', x: [p.L / 2 - Math.min(3.2, p.L * 0.22), p.L / 2 - Math.min(3.2, p.L * 0.22) + Math.min(1.1, p.L * 0.08)], y: [-p.H / 2 - 0.02, p.H / 2 + 0.02], z: [0.01, bh + p.H * 0.55 + 0.02], mat: { color: lib.colorOf(null, p.lambda, p.color) }, decal: true },
    { kind: 'cyl', x: [p.L / 2, p.L / 2 + 0.9], r: [1.1, 1.1], mat: 'metal' },
  ],
});

/* ---------- benchtop box (isometric front view) ----------
   used by the benchtop laser and the instrument boxes: a front face
   with a display, status lights and an optional knob, plus the top
   and right faces so it reads as a 3D box. */
H.benchDepth = (w, h) => Math.min(w, h) * 0.32;
H.bench = (S, w, h, o = {}) => {
  const c = o.color || '#c9ced6', dx = H.benchDepth(w, h) * 0.8, dy = H.benchDepth(w, h) * 0.6;
  const x0 = -w / 2, y0 = -h / 2, edge = `stroke="${U.darken(c, 0.45)}" stroke-width="${n(S.lw * 0.8)}" stroke-linejoin="round"`;
  let s = `<path d="M ${n(x0)} ${n(y0)} L ${n(x0 + dx)} ${n(y0 - dy)} L ${n(-x0 + dx)} ${n(y0 - dy)} L ${n(-x0)} ${n(y0)} Z" fill="${U.lighten(c, 0.28)}" ${edge}/>`;
  s += `<path d="M ${n(-x0)} ${n(y0)} L ${n(-x0 + dx)} ${n(y0 - dy)} L ${n(-x0 + dx)} ${n(-y0 - dy)} L ${n(-x0)} ${n(-y0)} Z" fill="${U.darken(c, 0.2)}" ${edge}/>`;
  s += `<rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" fill="${c}" ${edge}/>`;
  if (S.shaded) s += `<rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h * 0.45)}" fill="#ffffff" fill-opacity="0.12"/>`;
  // display
  const dw = Math.min(w * 0.62, w - 2), dh = Math.min(h * 0.3, 3.4), dxp = o.knob ? -w * 0.12 : 0, dyp = -h * 0.12;
  if (o.display !== false) {
    s += `<rect x="${n(dxp - dw / 2)}" y="${n(dyp - dh / 2)}" width="${n(dw)}" height="${n(dh)}" rx="0.25" fill="${o.displayColor || '#1f2a37'}" stroke="${U.darken(c, 0.5)}" stroke-width="${n(S.lw * 0.5)}"/>`;
    if (o.text) s += `<text x="${n(dxp)}" y="${n(dyp)}" font-family="${U.esc(S.font)}" font-size="${n(Math.min(dh * 0.62, S.fs * 1.1, dw / Math.max(3, String(o.text).length) * 1.7))}" fill="${o.textColor || '#ffffff'}" text-anchor="middle" dominant-baseline="central" font-weight="700">${RNBX.text ? RNBX.text.markup(o.text) : U.esc(o.text)}</text>`;
  }
  // status lights and knob
  const ly = h / 2 - Math.min(1.4, h * 0.18), lr = Math.min(0.42, h * 0.06);
  (o.leds || ['#e5484d', '#e6c44a', '#30a46c']).forEach((col, i) => { s += `<circle cx="${n(x0 + 1.4 + i * lr * 3)}" cy="${n(ly)}" r="${n(lr)}" fill="${col}" stroke="${U.darken(col, 0.4)}" stroke-width="${n(S.lw * 0.4)}"/>`; });
  if (o.knob) { const kr = Math.min(h * 0.2, w * 0.1); s += `<circle cx="${n(w / 2 - kr - 1.2)}" cy="${n(dyp)}" r="${n(kr)}" fill="#1d1f23" stroke="#000" stroke-width="${n(S.lw * 0.4)}"/><circle cx="${n(w / 2 - kr - 1.2 - kr * 0.3)}" cy="${n(dyp - kr * 0.3)}" r="${n(kr * 0.25)}" fill="#ffffff" fill-opacity="0.35"/>`; }
  return s;
};

/* ---------- benchtop laser (free-space or fibre output) ---------- */
lib.register({
  type: 'benchlaser', name: 'Laser source (benchtop, fibre output)', abbr: 'Laser', category: 'Sources', labelTemplate: '{lambda} nm laser',
  keywords: 'benchtop laser source unit fibre fiber coupled pigtailed diode laser driver box display knob',
  defaults: { lambda: 650, power: 5, beamWidth: 0.8, divergence: 0, pol: 'unpol', polAngle: 0, color: '', boxColor: '#c9ced6', w: 14, h: 9, text: '', output: 'fiber', bundle: 0, M2: 1 },
  params: [
    { key: 'lambda', label: 'Wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 12000, step: 1 },
    { key: 'output', label: 'Output', type: 'select', options: [['fiber', 'Through a fibre (connect it to a fibre end with the Fibre tool)'], ['free', 'Free-space beam from the side']] },
    ...polParams, ...beamParams,
    { key: 'text', label: 'Display text', type: 'text', placeholder: 'e.g. 650 nm (blank = wavelength)' },
    { key: 'boxColor', label: 'Box colour', type: 'color' },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 4, max: 60, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }],
  hint: 'Fibre output: pick Optical fibre in Connections, click this box, then a fibre end (Fibre optics ▸ Bare fibre end, or a collimator). The light leaves there.',
  labelPos: [0, 8],
  bbox: p => [-p.w / 2, -p.h / 2 - H.benchDepth(p.w, p.h) * 0.6, p.w / 2 + H.benchDepth(p.w, p.h) * 0.8 + 0.6, p.h / 2],
  fiberPort: p => [p.w / 2 + H.benchDepth(p.w, p.h) * 0.4, p.h * 0.18],
  fiberDir: () => [1, 0],
  fiberOut: true,
  draw(p, S) {
    let s = H.bench(S, p.w, p.h, { color: p.boxColor, text: p.text || `${U.fmt(p.lambda, 4)} nm`, knob: true, displayColor: '#13202b', textColor: lib.colorOf(S.doc, p.lambda, p.color) });
    const port = [p.w / 2 + H.benchDepth(p.w, p.h) * 0.4, p.h * 0.18];
    s += `<circle cx="${n(port[0])}" cy="${n(port[1])}" r="0.55" fill="#2b2f36" stroke="#000" stroke-width="${n(S.lw * 0.4)}"/>`;
    return s;
  },
  optics: p => H.boxAbsorb(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2),
  source(p) {
    const ls = [p.lambda];
    return rays(p, ls, [p.w / 2 + H.benchDepth(p.w, p.h) * 0.8 + 0.6, 0]);
  },
  solid: (p, bh) => [{ kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.h / 2, p.h / 2], z: [0, p.h * 0.75], mat: { color: p.boxColor } }],
  noPost: true,
});

/* ---------- broadband / white-light lamp ---------- */
lib.register({
  type: 'lamp', name: 'Broadband / white-light source', abbr: 'WL', category: 'Sources', labelTemplate: 'White light',
  keywords: 'white light lamp halogen supercontinuum broadband xenon',
  defaults: { lmin: 420, lmax: 680, count: 7, power: 10, beamWidth: 1.4, divergence: 0, pol: 'unpol', polAngle: 0, color: '', L: 12, H: 8 },
  params: [
    { key: 'lmin', label: 'Shortest wavelength', type: 'number', unit: 'nm', min: 150, max: 5000, step: 5 },
    { key: 'lmax', label: 'Longest wavelength', type: 'number', unit: 'nm', min: 150, max: 5000, step: 5 },
    { key: 'count', label: 'Spectral samples', type: 'number', min: 1, max: 24, step: 1 },
    ...polParams, ...beamParams,
  ],
  variants: [{ name: 'Supercontinuum source', props: { lmin: 450, lmax: 750, count: 9, beamWidth: 0.8, L: 16, H: 6 }, keywords: 'supercontinuum photonic crystal fibre' }],
  labelPos: [0, 7.5],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2 + 1, p.H / 2],
  draw(p, S) {
    const L = p.L, h = p.H;
    let s = H.rect(S, -L / 2, -h / 2, L, h, S.shaded ? S.fill('dark') : S.flat('body'), 'rx="1"');
    s += H.sheen(S, -L / 2, -h / 2, L, h * 0.45, 1);
    const cx = -L * 0.08, r = h * 0.28;
    s += `<defs><radialGradient id="rbx-lampglow-${n(cx)}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe6"/><stop offset="0.55" stop-color="#ffd76a"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient></defs>`;
    s += `<circle cx="${n(cx)}" cy="0" r="${n(r * 1.6)}" fill="url(#rbx-lampglow-${n(cx)})" stroke="none"/>`;
    s += H.circle(S, cx, 0, r, '#fff6cf');
    // spectrum strip near the output
    const sw = Math.min(1.4, L * 0.1), x0 = L / 2 - sw - 0.8;
    s += `<defs><linearGradient id="rbx-spec-strip" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6236d8"/><stop offset="0.25" stop-color="#1b7fe6"/><stop offset="0.45" stop-color="#1fae3e"/><stop offset="0.62" stop-color="#d4c400"/><stop offset="0.8" stop-color="#f46a00"/><stop offset="1" stop-color="#cc1222"/></linearGradient></defs>`;
    s += `<rect x="${n(x0)}" y="${n(-h / 2)}" width="${n(sw)}" height="${n(h)}" fill="url(#rbx-spec-strip)" stroke="none"/>`;
    s += H.rect(S, L / 2, -1.2, 1, 2.4, S.fill('metal'));
    return s;
  },
  optics: p => H.boxAbsorb(-p.L / 2, -p.H / 2, p.L / 2 + 1, p.H / 2),
  source(p) {
    const k = Math.max(1, Math.round(p.count || 7)), ls = [];
    for (let i = 0; i < k; i++) ls.push(k === 1 ? p.lmin : p.lmin + (p.lmax - p.lmin) * i / (k - 1));
    return rays(p, ls, [p.L / 2 + 1.05, 0]);
  },
  solid: (p, bh) => [
    { kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [0, bh + p.H * 0.5], mat: 'laser' },
    { kind: 'cyl', x: [p.L / 2, p.L / 2 + 1], r: [1.3, 1.3], mat: 'metal' },
  ],
});

/* ---------- LED ---------- */
lib.register({
  type: 'led', name: 'LED', abbr: 'LED', category: 'Sources', labelTemplate: 'LED {lambda} nm', keywords: 'led light emitting diode incoherent',
  defaults: { lambda: 470, power: 5, beamWidth: 1.6, divergence: 14, pol: 'unpol', polAngle: 0, color: '', s: 4 },
  params: [{ key: 'lambda', label: 'Centre wavelength', type: 'wavelength', unit: 'nm', min: 200, max: 2000, step: 1 }, ...polParams, ...beamParams],
  labelPos: [0, 5],
  bbox: p => [-p.s / 2 - 1.5, -p.s / 2, p.s / 2 + 0.6, p.s / 2],
  draw(p, S) {
    const s0 = p.s, c = lib.colorOf(S.doc, p.lambda, p.color);
    let s = H.rect(S, -s0 / 2 - 1.5, -s0 / 2 - 0.3, 1.5, s0 + 0.6, S.fill('metal'));
    s += `<path d="M ${n(-s0 / 2)} ${n(-s0 / 2)} L ${n(0)} ${n(-s0 / 2)} A ${n(s0 / 2)} ${n(s0 / 2)} 0 0 1 ${n(0)} ${n(s0 / 2)} L ${n(-s0 / 2)} ${n(s0 / 2)} Z" fill="${U.lighten(c, S.shaded ? 0.25 : 0.55)}" ${H.stroke(S)}/>`;
    if (S.shaded) s += `<ellipse cx="${n(-s0 * 0.05)}" cy="${n(-s0 * 0.18)}" rx="${n(s0 * 0.22)}" ry="${n(s0 * 0.1)}" fill="#fff" opacity="0.6"/>`;
    return s;
  },
  optics: p => H.boxAbsorb(-p.s / 2 - 1.5, -p.s / 2, p.s / 2 - 0.2, p.s / 2),
  source: p => rays(p, [p.lambda], [p.s / 2, 0]),
  solid: (p, bh) => [
    { kind: 'cyl', x: [-p.s / 2 - 1.5, -p.s / 2], r: [p.s / 2 + 0.3, p.s / 2 + 0.3], mat: 'metal' },
    { kind: 'cyl', x: [-p.s / 2, p.s / 2], r: [p.s / 2, p.s * 0.3], mat: { color: U.lighten(lib.colorOf(null, p.lambda, p.color), 0.3), alpha: 0.85 } },
  ],
  mount: true,
});
})();
