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

/* ---------- laser ----------
   One part, several bodies: a lab laser head, a He–Ne tube on
   cradles, a diode module in a finned heat sink, an ultrafast
   oscillator enclosure, a fibre laser, a QCL on a heat sink and a
   tunable laser with a tuning knob. "Automatic" picks one from the
   wavelength, text and size, so older figures get a fitting body. */
const LASER_BODIES = [['auto', 'Automatic (from wavelength and text)'], ['head', 'Laser head (box)'], ['tube', 'He–Ne tube on cradles'], ['diode', 'Diode module with heat sink'],
  ['ultrafast', 'Ultrafast oscillator enclosure'], ['fibre', 'Fibre laser (box + collimator)'], ['qcl', 'QCL on a finned heat sink'], ['tunable', 'Tunable laser (with knob)']];
const laserBody = p => {
  if (p.body && p.body !== 'auto') return p.body;
  const t = String(p.text || '');
  if (/he.?ne/i.test(t) || Math.abs(p.lambda - 632.8) < 0.5 || Math.abs(p.lambda - 543.5) < 0.5) return 'tube';
  if (/qcl/i.test(t) || p.lambda >= 3000) return 'qcl';
  if (/ti:?sa|^fs$|^ps$|femto|ultrafast/i.test(t) || p.pulsed) return 'ultrafast';
  if (/fib/i.test(t)) return 'fibre';
  if (/tun/i.test(t)) return 'tunable';
  if (p.L <= 9) return 'diode';
  return 'head';
};
lib.laserBody = laserBody;
function laserSolid(p, bh) {
  const L = p.L, h = p.H, x0 = -L / 2, x1 = L / 2, col = { color: lib.colorOf(null, p.lambda, p.color) };
  const stripe = (xa, w, y, z) => ({ kind: 'box', x: [xa, xa + w], y: [-y - 0.02, y + 0.02], z: [0.01, z + 0.02], mat: col, decal: true });
  const aperture = (x, r = 1.1) => ({ kind: 'cyl', x: [x, x1 + 0.9], r: [r, r], mat: 'metal' });
  // with a high beam the body sits on a riser block and a base plate, as on a real table
  const riser = (zb, w) => zb < 1 ? [] : [
    { kind: 'box', x: [x0 + L * 0.15, x1 - L * 0.15], y: [-w * 0.7, w * 0.7], z: [0.45, zb], mat: 'anod' },
    { kind: 'box', x: [x0 - 0.3, x1 + 0.3], y: [-w - 0.8, w + 0.8], z: [0, 0.45], mat: 'anod' }];
  switch (laserBody(p)) {
    case 'tube': {   // cylindrical tube held in two V-cradles
      const R = h / 2;
      return [
        { kind: 'cyl', x: [x0, x1 - 0.5], r: [R, R], mat: 'laserhead' },
        { kind: 'cyl', x: [x0 - 0.5, x0], r: [R * 0.9, R * 0.9], mat: 'black' },
        { kind: 'cyl', x: [x1 - 0.5, x1], r: [R * 0.92, R * 0.75], mat: 'black' },
        { kind: 'cyl', x: [x1 - 3.4, x1 - 2.6], r: [R + 0.03, R + 0.03], mat: col, decal: true },
        { kind: 'cyl', x: [x0 - 1.8, x0 - 0.5], r: [0.35, 0.35], mat: 'black' },
        ...[-0.3, 0.3].map(f => ({ kind: 'box', x: [L * f - 0.7, L * f + 0.7], y: [-R * 0.95, R * 0.95], z: [0, Math.max(0.4, bh - R * 0.55)], mat: 'anod' })),
        aperture(x1, 0.7),
      ];
    }
    case 'diode': {  // barrel in a finned heat-sink block on a pillar
      const bx = x1 - L * 0.3, hb = h * 0.75, out = [
        { kind: 'box', x: [x0, bx], y: [-hb, hb], z: [bh - hb, bh + hb], mat: 'dark' },
        { kind: 'box', x: [x0 + 0.4, bx - 0.4], y: [-hb * 0.55, hb * 0.55], z: [0, bh - hb], mat: 'anod' },
        { kind: 'box', x: [x0 - 0.3, bx + 0.3], y: [-hb * 1.3, hb * 1.3], z: [0, 0.4], mat: 'anod' },
        { kind: 'cyl', x: [bx, x1], r: [h * 0.36, h * 0.36], mat: 'metal' },
        { kind: 'cyl', x: [x1 - 0.6, x1], r: [h * 0.4, h * 0.4], mat: 'black' },
        { kind: 'cyl', x: [x0 - 1.4, x0], r: [0.3, 0.3], mat: 'black' },
      ];
      for (let i = 0; i < 5; i++) { const y = -hb + 0.15 + i * (2 * hb - 0.3) / 4; out.push({ kind: 'box', x: [x0, bx], y: [y - 0.13, y + 0.13], z: [bh + hb, bh + hb + h * 0.4], mat: 'dark' }); }
      out.push({ kind: 'box', x: [bx - 1, bx - 0.4], y: [-hb - 0.02, hb + 0.02], z: [bh - hb, bh + hb + 0.02], mat: col, decal: true });
      return out;
    }
    case 'ultrafast': {   // wide, low enclosure with a lid and handles
      const w = Math.max(h / 2, L * 0.32), top = bh + h * 0.4, zb = Math.max(0, bh - h);
      return [...riser(zb, w),
        { kind: 'box', x: [x0, x1], y: [-w, w], z: [zb, top], mat: 'laserhead' },
        { kind: 'box', x: [x0 - 0.15, x1 + 0.15], y: [-w - 0.15, w + 0.15], z: [zb, zb + 0.9], mat: 'laser' },
        { kind: 'box', x: [x0 + 0.5, x1 - 0.5], y: [-w + 0.5, w - 0.5], z: [top, top + 0.35], mat: 'body' },
        ...[-1, 1].map(sg => ({ kind: 'box', x: [x0 + L * 0.2, x1 - L * 0.2], y: [sg * w * 0.55 - 0.25, sg * w * 0.55 + 0.25], z: [top + 0.35, top + 0.95], mat: 'laser' })),
        stripe(x1 - Math.min(4, L * 0.2), Math.min(1.2, L * 0.06), w, top),
        { kind: 'box', x: [x1 - 0.3, x1], y: [-1.4, 1.4], z: [bh - 1.4, bh + 1.4], mat: 'black' },
        aperture(x1, 0.9),
      ];
    }
    case 'fibre': {   // flat box, armoured fibre to a collimator at the output
      const top = bh + h * 0.2, w = h * 0.75, zb = Math.max(0, bh - h * 0.9);
      return [...riser(zb, w),
        { kind: 'box', x: [x0, x1 - 3], y: [-w, w], z: [zb, top], mat: 'laserhead' },
        { kind: 'box', x: [x0 + 0.6, x1 - 3.6], y: [-w * 0.5, w * 0.5], z: [top, top + 0.06], mat: 'laser', decal: true },
        stripe(x1 - 4.4, 0.8, w, top),
        { kind: 'cyl', x: [x1 - 3, x1 - 1.2], r: [0.35, 0.35], mat: { color: '#e8b739', spec: 0.5 } },
        { kind: 'box', x: [x1 - 1.6, x1 - 0.4], y: [-0.9, 0.9], z: [0, bh - 0.9], mat: 'anod' },
        { kind: 'cyl', x: [x1 - 1.4, x1], r: [0.9, 0.9], mat: 'metal' },
        aperture(x1, 0.6),
      ];
    }
    case 'qcl': {   // small dark housing with a window, on a finned heat sink
      const w = h * 0.6, fz = bh - h * 0.5, zf = Math.max(0, fz - 0.4 - 2), out = [...riser(zf, w),
        { kind: 'box', x: [x0, x1], y: [-w, w], z: [fz, bh + h * 0.45], mat: 'laser' },
        { kind: 'box', x: [x0 - 0.3, x1 + 0.1], y: [-w - 0.3, w + 0.3], z: [fz - 0.4, fz], mat: 'metal' },
        { kind: 'cyl', x: [x1, x1 + 0.5], r: [1.2, 1.2], mat: 'gold' },
        stripe(x1 - Math.min(2.6, L * 0.25), 0.8, w, bh + h * 0.45),
      ];
      for (let i = 0; i < 6; i++) { const x = x0 + 0.2 + i * (L - 0.4) / 5; out.push({ kind: 'box', x: [x - 0.18, x + 0.18], y: [-w - 0.3, w + 0.3], z: [zf, fz - 0.4], mat: 'metal' }); }
      out.push(aperture(x1 + 0.5, 0.8));
      return out;
    }
    case 'tunable': {   // laser head with a display and a tuning knob on top
      const top = bh + h * 0.55, w = h / 2, zb = Math.max(0, bh - h * 0.9);
      return [...riser(zb, w),
        { kind: 'box', x: [x0, x1], y: [-w, w], z: [zb, top], mat: 'laserhead' },
        { kind: 'box', x: [x0 + 0.8, x0 + L * 0.5], y: [-w * 0.6, w * 0.6], z: [top, top + 0.05], mat: { color: '#1f2a37', spec: 0.9 }, decal: true },
        { kind: 'vcyl', cx: x0 + L * 0.7, cy: 0, r: Math.min(1.5, w * 0.62), z: [top, top + 1.8], mat: 'black' },
        stripe(x1 - Math.min(3.2, L * 0.22), Math.min(1.1, L * 0.08), w, top),
        aperture(x1),
      ];
    }
    default: {   // lab laser head: body on a darker foot, front bezel, output aperture
      const top = bh + h * 0.55, w = h / 2, zb = Math.max(0, bh - h * 0.9);
      return [...riser(zb, w),
        { kind: 'box', x: [x0, x1 - 0.4], y: [-w, w], z: [zb + 0.5, top], mat: 'laserhead' },
        { kind: 'box', x: [x0 - 0.3, x1 + 0.1], y: [-w - 0.3, w + 0.3], z: [zb, zb + 0.5], mat: 'laser' },
        { kind: 'box', x: [x1 - 0.4, x1], y: [-w, w], z: [zb + 0.5, top], mat: 'laser' },
        { kind: 'box', x: [x0 + 0.6, x0 + Math.min(4, L * 0.3)], y: [-w * 0.5, w * 0.5], z: [top, top + 0.04], mat: 'laser', decal: true },
        stripe(x1 - Math.min(3.2, L * 0.22), Math.min(1.1, L * 0.08), w, top),
        aperture(x1),
      ];
    }
  }
}

lib.register({
  type: 'laser', name: 'Laser (CW)', abbr: 'Laser', category: 'Sources', labelTemplate: 'Laser {lambda} nm',
  keywords: 'laser source cw diode helium neon nd yag',
  defaults: { lambda: 532, extra: '', power: 10, beamWidth: 0.7, divergence: 0, pol: 'H', polAngle: 0, pulsed: false, color: '', L: 16, H: 6, text: '', body: 'auto' },
  params: [
    { key: 'lambda', label: 'Wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 12000, step: 1 },
    { key: 'extra', label: 'Extra lines (nm, comma-separated)', type: 'text', placeholder: 'e.g. 1064' },
    { key: 'pulsed', label: 'Pulsed (animates as pulses)', type: 'bool' },
    ...polParams, ...beamParams,
    { key: 'L', label: 'Body length', type: 'number', unit: 'mm', min: 4, max: 60, step: 0.5 },
    { key: 'H', label: 'Body height', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 },
    { key: 'text', label: 'Text on body', type: 'text' },
    { key: 'body', label: 'Body (look)', type: 'select', options: LASER_BODIES },
  ],
  variants: [
    { name: 'Pulsed / ultrafast laser', props: { pulsed: true, lambda: 800, text: 'fs', L: 18, body: 'ultrafast' }, keywords: 'femtosecond ti sapphire pulsed ultrafast' },
    { name: 'Diode laser', props: { L: 8, H: 4.5, lambda: 785, power: 100, body: 'diode' }, keywords: 'diode 785 raman' },
    { name: 'He–Ne laser', props: { L: 22, H: 5, lambda: 632.8, power: 2, body: 'tube' }, keywords: 'hene helium neon' },
  ],
  labelPos: [0, 6.2],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2 + 0.9, p.H / 2],
  draw(p, S) {
    const L = p.L, h = p.H, c = lib.colorOf(S.doc, p.lambda, p.color), body = laserBody(p);
    const r = body === 'tube' ? h / 2 : Math.min(1, h * 0.18);
    let s = '';
    if (body === 'diode') {
      // finned heat-sink block with the barrel sticking out
      const bx = L / 2 - L * 0.3;
      s += H.rect(S, -L / 2, -h / 2, bx + L / 2, h, S.fill('dark'), `rx="${n(r)}"`);
      for (let i = 1; i < 5; i++) s += H.line(S, -L / 2 + i * (bx + L / 2) / 5, -h / 2, -L / 2 + i * (bx + L / 2) / 5, h / 2, '', 0.5, S.shaded ? '#7d848e' : S.ink);
      s += H.rect(S, bx, -h * 0.36, L / 2 - bx, h * 0.72, S.fill('metal'));
      s += `<rect x="${n(bx - 0.9)}" y="${n(-h / 2)}" width="0.6" height="${n(h)}" fill="${c}" opacity="0.9" stroke="none"/>`;
      s += H.rect(S, L / 2, -Math.min(1.1, h * 0.22), 0.9, Math.min(2.2, h * 0.44), S.fill('metal'));
      return s;
    }
    if (body === 'qcl') {
      s += H.rect(S, -L / 2, h * 0.3, L, h * 0.2, S.fill('metal'));
      for (let i = 0; i <= 5; i++) s += H.line(S, -L / 2 + 0.3 + i * (L - 0.6) / 5, h * 0.3, -L / 2 + 0.3 + i * (L - 0.6) / 5, h / 2, '', 0.5);
      s += H.rect(S, -L / 2, -h / 2, L, h * 0.8, S.fill('dark'), `rx="${n(r)}"`);
      s += H.rect(S, L / 2, -h * 0.25, 0.5, h * 0.5, S.fill('gold'));
      s += `<rect x="${n(L / 2 - Math.min(2.6, L * 0.25))}" y="${n(-h / 2)}" width="0.8" height="${n(h * 0.8)}" fill="${c}" opacity="0.9" stroke="none"/>`;
      if (p.text) s += H.text(S, -1.2, -h * 0.1, p.text, { color: S.shaded ? '#f2f4f7' : S.ink, size: Math.min(h * 0.4, S.fs * 0.95), bold: true });
      return s;
    }
    s += H.rect(S, -L / 2, -h / 2, L, h, S.shaded ? S.fill('dark') : S.flat('body'), `rx="${n(r)}"`);
    if (body === 'tube') s += H.rect(S, -L / 2, -h / 2, 1, h, S.fill('black'), `rx="${n(Math.min(0.5, h / 2))}"`) + H.rect(S, L / 2 - 1, -h / 2, 1, h, S.fill('black'), `rx="${n(Math.min(0.5, h / 2))}"`);
    if (body === 'ultrafast' || body === 'head') s += `<rect x="${n(-L / 2)}" y="${n(h / 2 - Math.min(0.8, h * 0.14))}" width="${n(L)}" height="${n(Math.min(0.8, h * 0.14))}" fill="${S.shaded ? '#1d2025' : S.ink}" stroke="none"/>`;
    if (body === 'tunable') s += H.circle(S, L * 0.2, -h * 0.05, Math.min(h * 0.24, 1.4), S.fill('black'));
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
  solid: laserSolid,
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
