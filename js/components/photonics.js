/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/photonics.js
   Resonators and integrated photonics, plus beam diagnostics:
   Fabry–Pérot cavity, ring resonator / waveguide chips, beam
   profiler, off-axis parabolic mirror, and the custom component.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n, P = lib.P;
const spectral = [
  { key: 'lam0', label: 'Resonant wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 0.1 },
  { key: 'fsr', label: 'Free spectral range', type: 'number', unit: 'nm', min: 0.001, max: 500, step: 0.1 },
  { key: 'detune', label: 'Detuning (fraction of FSR)', type: 'number', min: -10, max: 10, step: 0.01, animatable: true, hint: 'animate to scan the resonance' },
];

/* ---------- Fabry–Pérot cavity ---------- */
lib.register({
  type: 'cavity', name: 'Optical cavity (Fabry–Pérot)', abbr: 'FP', category: 'Modulators & nonlinear',
  keywords: 'cavity resonator fabry perot etalon interferometer finesse enhancement',
  defaults: { L: 12, d: 8, R1: 0.95, R2: 0.95, lam0: 1064, fsr: 1, detune: 0 },
  params: [{ key: 'L', label: 'Mirror spacing (drawn)', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5 }, P.diameter(),
    { key: 'R1', label: 'Input mirror R', type: 'range', min: 0, max: 0.9999, step: 0.001 },
    { key: 'R2', label: 'Output mirror R', type: 'range', min: 0, max: 0.9999, step: 0.001 }, ...spectral],
  hint: 'Transmission follows the Airy function: full transmission on resonance, reflection off resonance.',
  snap: 'perp', mount: true, labelPos: [0, 7.5],
  bbox: p => [-p.L / 2 - 1.5, -p.d / 2, p.L / 2 + 1.5, p.d / 2],
  draw(p, S) {
    const h = p.L / 2, r = p.d / 2, sag = Math.min(0.9, p.d * 0.1);
    let s = `<rect x="${n(-h)}" y="${n(-r * 0.75)}" width="${n(p.L)}" height="${n(r * 1.5)}" fill="${S.shaded ? '#eef2f7' : '#f5f7fa'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}" stroke-dasharray="${n(S.lw * 3)} ${n(S.lw * 2)}"/>`;
    s += `<path d="M ${n(-h)} ${n(-r)} Q ${n(-h + 2 * sag)} 0 ${n(-h)} ${n(r)} L ${n(-h - 1.5)} ${n(r)} L ${n(-h - 1.5)} ${n(-r)} Z" fill="${S.fill('mirror')}" ${H.stroke(S)}/>`;
    s += `<path d="M ${n(h)} ${n(-r)} Q ${n(h - 2 * sag)} 0 ${n(h)} ${n(r)} L ${n(h + 1.5)} ${n(r)} L ${n(h + 1.5)} ${n(-r)} Z" fill="${S.fill('mirror')}" ${H.stroke(S)}/>`;
    // standing-wave cue
    let d = '';
    for (let i = 0; i <= 48; i++) { const x = -h + 0.4 + (p.L - 0.8) * i / 48; d += (i ? ' L ' : 'M ') + n(x) + ' ' + n(Math.sin(i / 48 * Math.PI * 6) * r * 0.35); }
    return s + `<path d="${d}" fill="none" stroke="${U.wavelengthColor(p.lam0)}" stroke-width="${n(S.lw * 1.1)}" stroke-opacity="0.8"/>`;
  },
  optics: p => [{ kind: 'cavity', a: [-p.L / 2, -p.d / 2], b: [-p.L / 2, p.d / 2], span: p.L }],
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2 - 1.5, -p.L / 2], r: [p.d / 2, p.d / 2], mat: 'mirror' }, { kind: 'cyl', x: [p.L / 2, p.L / 2 + 1.5], r: [p.d / 2, p.d / 2], mat: 'mirror' }, { kind: 'cyl', x: [-p.L / 2, p.L / 2], r: [p.d * 0.18, p.d * 0.18], mat: { color: '#c8d3e0', alpha: 0.25 } }],
});

/* ---------- ring resonator / waveguide chip ---------- */
lib.register({
  type: 'ringchip', name: 'Ring resonator chip', abbr: 'MRR', category: 'Modulators & nonlinear',
  keywords: 'ring resonator microring photonic chip integrated waveguide silicon nitride add drop',
  defaults: { w: 18, h: 9, ring: true, drop: true, kappa: 0.1, loss: 0.98, lam0: 1550, fsr: 4, detune: 0, T: 0.9 },
  params: [{ key: 'ring', label: 'Ring resonator', type: 'bool' },
    { key: 'drop', label: 'Drop port (add–drop ring)', type: 'bool', show: p => p.ring },
    { key: 'kappa', label: 'Power coupling κ', type: 'range', min: 0.001, max: 1, step: 0.001, show: p => p.ring },
    { key: 'loss', label: 'Round-trip amplitude a', type: 'range', min: 0, max: 1, step: 0.001, show: p => p.ring },
    { key: 'T', label: 'Waveguide transmission', type: 'range', min: 0, max: 1, step: 0.01, show: p => !p.ring },
    ...spectral.map(q => Object.assign({}, q, { show: p => p.ring })),
    { key: 'w', label: 'Chip width', type: 'number', unit: 'mm', min: 4, max: 80, step: 0.5 }, { key: 'h', label: 'Chip height', type: 'number', unit: 'mm', min: 3, max: 60, step: 0.5 }],
  variants: [{ name: 'Waveguide chip', abbr: 'WG', props: { ring: false }, keywords: 'waveguide chip photonic integrated straight' }],
  hint: 'Light enters the left facet. Through port leaves the right facet; the drop port leaves the lower-left facet.',
  snap: 'perp', labelPos: [0, 8],
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    const w = p.w, h = p.h, y0 = -h * 0.22, y1 = h * 0.3, R = Math.min(h * 0.22, w * 0.14);
    let s = H.rect(S, -w / 2, -h / 2, w, h, S.shaded ? 'url(#rbx-wafer)' : '#d9d6e6', 'rx="0.4"');
    s += H.sheen(S, -w / 2, -h / 2, w, h * 0.35, 0.4);
    const wg = S.shaded ? '#f4f6ff' : '#5b5f8a', ww = n(Math.max(0.25, S.lw * 1.6));
    s += `<line x1="${n(-w / 2)}" y1="${n(y0)}" x2="${n(w / 2)}" y2="${n(y0)}" stroke="${wg}" stroke-width="${ww}"/>`;
    if (p.ring) {
      s += `<circle cx="0" cy="${n(y0 + R + 0.35)}" r="${n(R)}" fill="none" stroke="${wg}" stroke-width="${ww}"/>`;
      if (p.drop) s += `<line x1="${n(-w / 2)}" y1="${n(y0 + 2 * R + 0.7)}" x2="${n(w * 0.25)}" y2="${n(y0 + 2 * R + 0.7)}" stroke="${wg}" stroke-width="${ww}"/>`;
    }
    void y1;
    return s;
  },
  optics: p => {
    const y0 = -p.h * 0.22, R = Math.min(p.h * 0.22, p.w * 0.14);
    return [{ kind: 'ring', a: [-p.w / 2, y0 - 1.2], b: [-p.w / 2, y0 + 1.2], span: p.w, dropPort: p.ring && p.drop ? { o: [-p.w / 2 - 0.05, y0 + 2 * R + 0.7], d: [-1, 0] } : null }]
      .concat([{ kind: 'absorb', a: [-p.w / 2, -p.h / 2], b: [p.w / 2, -p.h / 2] }, { kind: 'absorb', a: [-p.w / 2, p.h / 2], b: [p.w / 2, p.h / 2] }]);
  },
  solid: (p, bh) => [{ kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.h / 2, p.h / 2], z: [bh - 0.6, bh + 0.1], mat: { color: '#8e8aa3' } }, { kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.h / 2, p.h / 2], z: [0, bh - 0.6], mat: 'anod' }],
  vertical: false,
});

/* ---------- beam profiler ---------- */
lib.register({
  type: 'profiler', name: 'Beam profiler', abbr: 'BP', category: 'Detectors', labelTemplate: 'Beam profiler',
  keywords: 'beam profiler camera spot size m2 waist measurement',
  defaults: { L: 9, H: 9 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }],
  hint: 'With the Gaussian beam model, the inspector reports the beam radius here.',
  snap: 'perp', labelPos: [0, 7.5],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2, p.H / 2],
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.H / 2, p.L, p.H, S.fill('dark'), 'rx="0.7"') + H.sheen(S, -p.L / 2, -p.H / 2, p.L, p.H * 0.45, 0.7);
    s += `<rect x="${n(-p.L / 2 - 0.1)}" y="${n(-p.H * 0.3)}" width="0.5" height="${n(p.H * 0.6)}" fill="${S.shaded ? 'url(#rbx-sensor)' : '#6d7b8f'}"/>`;
    let d = '';
    for (let i = 0; i <= 30; i++) { const y = -p.H * 0.3 + p.H * 0.6 * i / 30, x = Math.exp(-Math.pow((i - 15) / 6, 2)) * p.L * 0.45; d += (i ? ' L ' : 'M ') + n(-p.L * 0.2 + x) + ' ' + n(y); }
    return s + `<path d="${d}" fill="none" stroke="#ffd166" stroke-width="${n(S.lw * 1.2)}"/>`;
  },
  optics: p => H.boxAbsorb(-p.L / 2, -p.H / 2, p.L / 2, p.H / 2),
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [bh - p.H / 2, bh + p.H / 2], mat: 'dark' }],
  mount: true, postR: 1,
});

/* ---------- off-axis parabolic mirror ---------- */
lib.register({
  type: 'oap', name: 'Off-axis parabolic mirror', abbr: 'OAP', category: 'Mirrors & splitters',
  keywords: 'off axis parabolic mirror oap focusing reflective achromatic',
  defaults: { d: 9, f: 100, R: 1 },
  params: [P.diameter(9), { key: 'f', label: 'Reflected focal length', type: 'number', unit: 'mm', min: 1, max: 5000, step: 1 }, { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01 }],
  hint: 'Focuses a collimated beam at 90° without chromatic aberration.',
  variants: [{ name: 'Large parabolic mirror', abbr: 'PM', keywords: 'large parabolic mirror collector telescope ftir', props: { d: 22, f: 250 } }],
  snap: 'mirror', mount: true, labelPos: [0, 7.5],
  bbox: p => [-0.2, -p.d / 2, p.d * 0.6, p.d / 2],
  draw(p, S) {
    const r = p.d / 2;
    let s = `<path d="M 0 ${n(-r)} Q ${n(r * 0.55)} 0 0 ${n(r)} L ${n(p.d * 0.6)} ${n(r * 0.8)} L ${n(p.d * 0.6)} ${n(-r * 1.0)} Z" fill="${S.fill('metal')}" ${H.stroke(S)}/>`;
    s += H.sheen(S, 0, -r, p.d * 0.6, r * 0.8);
    return s + `<path d="M 0 ${n(-r)} Q ${n(r * 0.55)} 0 0 ${n(r)}" fill="none" ${H.stroke(S, 2)}/>`;
  },
  optics: p => [{ kind: 'mirror', a: [0, -p.d / 2], b: [0, p.d / 2], R: p.R, f: p.f }],
  solid: (p, bh) => [{ kind: 'box', x: [0, p.d * 0.6], y: [-p.d / 2, p.d / 2], z: [bh - p.d / 2, bh + p.d / 2], mat: 'metal' }],
});

/* ---------- custom component (your own drawing or photo) ---------- */
const BEHAVIOURS = [['none', 'Decorative (no optics)'], ['mirror', 'Mirror'], ['splitter', 'Beam splitter'], ['lens', 'Lens'], ['absorb', 'Detector / block'], ['filter', 'Filter (band-pass)'], ['pass', 'Transparent (passes light)'], ['sample', 'Sample (can emit)'], ['source', 'Light source']];
/* ---------- black-box module the beam passes through (FTIR, monochromator, …) ---------- */
/* ---------- fibre Raman probe (working optics) ----------
   Excitation on the probe axis (local y = 0): fibre in → collimating lens
   → laser-line band-pass → dichroic (passes the laser) → focusing nose →
   sample. The same nose collects the back-scattered Raman light; the
   dichroic reflects it to a fold mirror, it runs back parallel to the
   axis (local y = yc) through a long-pass filter (blocks the laser line)
   and a lens focuses it into the collection fibre. Every element below
   is a real traced surface; the sketch is drawn from the same geometry. */
const probeGeo = p => {
  const L = p.L, Hh = p.H, xl = -L / 2, k = Math.min(Hh * 0.13, L * 0.09);
  const stokes = (p.em || 830) >= (p.ex || 785);
  return { L, Hh, xl, k, yc: -Hh * 0.28, x0: xl + 0.25, xc: xl + L * 0.17, xf: xl + L * 0.42, xd: L / 2 - L * 0.2,
    edge: p.ex + ((p.em || p.ex + 45) - p.ex) * 0.4, bw: Math.max(2, Math.min(10, Math.abs((p.em || 830) - p.ex) * 0.5)), stokes };
};
const probeFull = p => p.inside === 'probe' && p.model === 'full';
lib.probeGeo = probeGeo;

lib.register({
  type: 'module', name: 'Optical module (beam passes through)', abbr: 'MOD', category: 'Samples & mechanics', autoLabel: false,
  keywords: 'module box instrument black box michelson interferometer ftir monochromator spectrometer unit pass through',
  defaults: { L: 22, H: 14, title: 'Module', color: '#f3f4f6', inside: 'none', snout: false, f: 0, ex: 785, em: 830, model: 'sketch', tags: false },
  params: [{ key: 'title', label: 'Text in the box', type: 'textarea' },
    { key: 'inside', label: 'Sketch inside', type: 'select', options: [['none', 'None'], ['michelson', 'Michelson interferometer'], ['grating', 'Grating monochromator'], ['probe', 'Fibre probe (excitation and collection paths)']] },
    { key: 'model', label: 'Probe optics', type: 'select', options: [['full', 'Working optics (traced: fibre in, filters, dichroic, fibre out)'], ['sketch', 'Sketch only (beam passes straight)']], show: p => p.inside === 'probe' },
    { key: 'ex', label: 'Laser (excitation) wavelength', type: 'wavelength', unit: 'nm', min: 200, max: 2000, step: 1, show: p => p.inside === 'probe', hint: 'sets the band-pass filter' },
    { key: 'em', label: 'Raman (collection) wavelength', type: 'wavelength', unit: 'nm', min: 200, max: 2000, step: 1, show: p => p.inside === 'probe', hint: 'dichroic and long-pass edge sit between the two' },
    { key: 'tags', label: 'Name the inner parts', type: 'bool', show: p => p.inside === 'probe' },
    { key: 'snout', label: 'Focusing nose at the exit', type: 'bool' },
    { key: 'f', label: 'Focus distance below the nose (drawn)', type: 'number', unit: 'mm', min: 0, max: 200, step: 0.5, show: p => p.snout, hint: '0 = the beam passes straight' },
    { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 200, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 2, max: 200, step: 0.5 },
    { key: 'color', label: 'Box colour', type: 'color' }],
  variants: [{ name: 'Fibre-optic Raman probe (working optics)', abbr: 'Probe', keywords: 'raman probe head fiber fibre optic probe excitation collection dichroic band pass long pass filter folding mirror', props: { title: '', inside: 'probe', model: 'full', L: 30, H: 20, color: '#e3eaf3', snout: true, f: 8, tags: true } },
    { name: 'Fibre-optic probe head (closed)', abbr: 'Probe', keywords: 'raman probe head handheld closed body', props: { title: '', inside: 'probe', model: 'full', L: 20, H: 13, color: '#4a4f57', snout: true, f: 6 } },
    { name: 'Michelson interferometer (FTIR)', abbr: 'FTIR', keywords: 'ftir fourier transform infrared michelson interferometer box', props: { title: 'Michelson\ninterferometer', inside: 'michelson', L: 26, H: 18, color: '#ffffff' } }],
  snap: 'perp', mount: false,
  // the working probe takes two fibres: the one arriving (laser in) and the one leaving (signal out)
  fiberPort: (p, role) => probeFull(p) ? [-p.L / 2 - 0.9, role === 'from' ? probeGeo(p).yc : 0] : [-p.L / 2, 0],
  fiberDir: () => [-1, 0],
  fiberOk: p => probeFull(p),
  port: p => { const g = probeGeo(p), r = Math.min(0.45, g.k * 0.4); return { o: [g.x0, 0], d: [1, 0], w: 0.04, div: U.deg(Math.atan(r / (g.xc - g.x0))) }; },
  portInside: true,   // light from the input fibre goes through the probe's own filter, dichroic and nose
  bbox: p => [-p.L / 2 - (probeFull(p) ? 1 : 0), -p.H / 2, p.L / 2 + (p.snout ? Math.min(p.H * 0.35, 5) : 0), p.H / 2],
  draw(p, S, obj) {
    const L = p.L, Hh = p.H, rot = obj ? obj.rot || 0 : 0;
    let s = '';
    if (p.snout) { const sl = Math.min(Hh * 0.35, 5), sw = Hh * 0.3; s += `<rect x="${n(L / 2 - 0.2)}" y="${n(-sw / 2)}" width="${n(sl + 0.2)}" height="${n(sw)}" rx="${n(sw * 0.12)}" fill="${S.fill('dark')}" ${H.stroke(S)}/>`; }
    const see = probeFull(p) && !/^#[0-4]/.test(p.color);   // inside view: the traced beams show through the body
    s += `<rect x="${n(-L / 2)}" y="${n(-Hh / 2)}" width="${n(L)}" height="${n(Hh)}" rx="${n(Math.min(L, Hh) * 0.04)}" fill="${p.color}"${see ? ' fill-opacity="0.55"' : ''} ${H.stroke(S, 1.4)}/>`;
    if (p.inside === 'michelson') {
      const k = Math.min(L, Hh) * 0.2, cx = -L * 0.1, cy = Hh * 0.2;
      s += `<line x1="${n(cx - k * 0.45)}" y1="${n(cy + k * 0.45)}" x2="${n(cx + k * 0.45)}" y2="${n(cy - k * 0.45)}" ${H.stroke(S, 1.6, '#4a7fb5')}/>`;
      s += `<rect x="${n(cx - k * 0.5)}" y="${n(cy - k * 1.45)}" width="${n(k)}" height="${n(k * 0.16)}" fill="${S.fill('mirror')}" ${H.stroke(S, 0.6)}/>`;
      s += `<rect x="${n(cx + k * 1.3)}" y="${n(cy - k * 0.5)}" width="${n(k * 0.16)}" height="${n(k)}" fill="${S.fill('mirror')}" ${H.stroke(S, 0.6)}/>`;
      s += H.arrowGlyph(S, cx + k * 1.38, cy + k * 0.75, k * 0.6, S.ink);
    }
    if (p.inside === 'probe') {
      const g = probeGeo(p), k = g.k, ce = U.wavelengthColor(p.ex), cm = U.wavelengthColor(p.em);
      const dark = U.luminance ? U.luminance(p.color) < 0.4 : /^#[0-4]/.test(p.color), ink = dark ? '#e9edf2' : S.ink;
      const nose = L / 2 + (p.snout ? Math.min(Hh * 0.35, 5) : 0);
      const dash = (pts, c) => `<path d="M ${pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')}" fill="none" stroke="${c}" stroke-width="${n(S.lw * 1.3)}" stroke-dasharray="${n(k * 0.35)} ${n(k * 0.25)}" stroke-linecap="round"/>`;
      // sketched light paths, only while no traced light runs through the probe (then the real beams show instead);
      // the two directions sit symmetrically about the axis
      const lit = S.trace && obj && S.trace.segments.some(sg => { const m = U.toLocal(obj, [(sg.a[0] + sg.b[0]) / 2, (sg.a[1] + sg.b[1]) / 2]); return m[0] > -L / 2 && m[0] < nose && Math.abs(m[1]) < Hh / 2; });
      if (!lit) { const e = k * 0.18; s += dash([[g.x0, -e], [nose, -e]], ce) + dash([[nose, e], [g.xd + e, e], [g.xd + e, g.yc + e], [g.x0, g.yc + e]], cm); }   // corners on the dichroic and fold-mirror lines
      // fibre ferrules at the back
      [0, g.yc].forEach(y => { s += `<rect x="${n(g.xl - 0.9)}" y="${n(y - k * 0.32)}" width="${n(1.15)}" height="${n(k * 0.64)}" rx="0.15" fill="${S.fill('dark')}" ${H.stroke(S, 0.5)}/>`; });
      const lens = (x, y) => `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(k * 0.28)}" ry="${n(k)}" fill="${S.shaded ? '#d9ecf8' : '#eef6fc'}" ${H.stroke(S, 0.55, dark ? '#cfd6df' : S.ink)}/>`;
      s += lens(g.xc, 0) + lens(g.xc, g.yc);
      s += `<rect x="${n(g.xf - 0.3)}" y="${n(-k)}" width="0.6" height="${n(2 * k)}" fill="${ce}" fill-opacity="0.85" ${H.stroke(S, 0.4)}/>`;
      s += `<rect x="${n(g.xf - 0.3)}" y="${n(g.yc - k)}" width="0.6" height="${n(2 * k)}" fill="#e8913a" fill-opacity="0.85" ${H.stroke(S, 0.4)}/>`;
      s += `<line x1="${n(g.xd - k)}" y1="${n(-k)}" x2="${n(g.xd + k)}" y2="${n(k)}" stroke="#e77f6d" stroke-width="${n(Math.max(0.45, k * 0.2))}" stroke-linecap="round"/>`;
      s += `<line x1="${n(g.xd - k)}" y1="${n(g.yc - k)}" x2="${n(g.xd + k)}" y2="${n(g.yc + k)}" stroke="#2f4f8a" stroke-width="${n(Math.max(0.45, k * 0.2))}" stroke-linecap="round"/>`;
      if (p.tags) {
        // names stay upright whatever the probe's rotation, and sit on the outer side of each path
        const fs = Math.min(S.fs * 0.62, k * 0.55);
        const side = sy => { const w = U.v.rot([0, sy], rot); return Math.abs(w[0]) > 0.3 ? (w[0] > 0 ? 'start' : 'end') : 'middle'; };
        const t = (x, y, str, sy) => `<text x="${n(x)}" y="${n(y)}" transform="rotate(${n(-rot)} ${n(x)} ${n(y)})" font-family="${U.esc(S.font)}" font-size="${n(fs)}" fill="${ink}" text-anchor="${side(sy)}" dominant-baseline="central">${U.esc(str)}</text>`;
        const o1 = Hh / 2 + fs * 0.7, o2 = -Hh / 2 - fs * 0.7;   // just outside the body, level with each part
        s += t(g.xc, o1, 'Collimating lens', 1) + t(g.xf, o1, 'Band-pass filter', 1) + t(g.xd, o1, 'Dichroic', 1);
        s += t(g.xc, o2, 'Focusing lens', -1) + t(g.xf, o2, 'Long-pass filter', -1) + t(g.xd, o2, 'Fold mirror', -1);
        s += t(g.xl + 0.2, o1, 'Laser in', 1) + t(g.xl + 0.2, o2, 'Signal out', -1);
      }
    }
    if (p.inside === 'grating') {
      const k = Math.min(L, Hh) * 0.22;
      s += `<path d="M ${n(-k)} ${n(-k)} l ${n(k * 0.3)} ${n(k * 0.3)}" ${H.stroke(S, 1.2)}/>`;
      for (let i = 0; i < 7; i++) s += `<line x1="${n(k * 0.6)}" y1="${n(-k + i * k * 0.3)}" x2="${n(k * 0.85)}" y2="${n(-k + i * k * 0.3 + k * 0.15)}" ${H.stroke(S, 0.6)}/>`;
    }
    if (p.title) {
      const lines = String(p.title).split('\n'), fs = Math.min(S.fs * 1.05, Hh / (lines.length + 1.5)), y0 = p.inside === 'none' ? -(lines.length - 1) * fs * 0.6 : -Hh / 2 + fs * 0.95;
      lines.forEach((ln, i) => { s += `<text x="0" y="${n(y0 + i * fs * 1.2)}" font-family="${U.esc(S.font)}" font-size="${n(fs)}" fill="${S.ink}" text-anchor="middle" dominant-baseline="central" font-weight="700">${RNBX.text.markup(ln, fs)}</text>`; });
    }
    return s;
  },
  optics: (p, obj, doc) => {
    const sc = (doc && doc.style.scale) || 10;
    if (probeFull(p)) {
      const g = probeGeo(p), k = g.k;
      const out = [
        { kind: 'lens', a: [g.xc, -k], b: [g.xc, k], f: (g.xc - g.x0) * sc },
        { kind: 'filter', a: [g.xf, -k], b: [g.xf, k], mode: 'bandpass', center: p.ex, width: g.bw, T: 0.95 },
        { kind: 'dichroic', a: [g.xd - k, -k], b: [g.xd + k, k], edge: g.edge, mode: g.stokes ? 'shortpass' : 'longpass' },
        { kind: 'mirror', a: [g.xd - k, g.yc - k], b: [g.xd + k, g.yc + k], R: 1 },
        { kind: 'filter', a: [g.xf, g.yc - k], b: [g.xf, g.yc + k], mode: g.stokes ? 'longpass' : 'shortpass', edge: g.edge, T: 0.95 },
        { kind: 'lens', a: [g.xc, g.yc - k], b: [g.xc, g.yc + k], f: (g.xc - g.x0) * sc },
        { kind: 'fiberIn', a: [g.x0, g.yc - k * 0.6], b: [g.x0, g.yc + k * 0.6] },
      ];
      if (p.snout && p.f > 0) { const sl = Math.min(p.H * 0.35, 5), sw = p.H * 0.3; out.push({ kind: 'lens', a: [p.L / 2 + sl, -sw / 2], b: [p.L / 2 + sl, sw / 2], f: p.f * sc }); }
      return out;
    }
    const out = [{ kind: 'pass', a: [0, -p.H / 2], b: [0, p.H / 2] }];
    if (p.snout && p.f > 0) { const sl = Math.min(p.H * 0.35, 5), sw = p.H * 0.3; out.push({ kind: 'lens', a: [p.L / 2 + sl, -sw / 2], b: [p.L / 2 + sl, sw / 2], f: p.f * ((doc && doc.style.scale) || 10) }); }
    return out;
  },
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [0, bh + Math.min(p.H, p.L) * 0.35], mat: { color: p.color, spec: 0.2 } }],
});

lib.register({
  type: 'custom', name: 'Custom component', abbr: 'X', category: 'Samples & mechanics',
  keywords: 'custom import svg png photo own drawing user component',
  defaults: { href: '', svg: '', vb: null, w: 12, h: 8, behaviour: 'none', R: 0.5, f: 100, lambda: 532, center: 532, width: 20, T: 0.95, emit: false, emitLambda: 560, emitFrac: 0.5, power: 10, beamWidth: 0.7, title: 'Custom' },
  params: [{ key: 'href', label: 'Drawing or photo (SVG stays vector)', type: 'image' },
    { key: 'title', label: 'Name', type: 'text' },
    { key: 'behaviour', label: 'Optical behaviour', type: 'select', options: BEHAVIOURS },
    { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.behaviour === 'splitter' },
    { key: 'f', label: 'Focal length', type: 'number', unit: 'mm', step: 1, show: p => p.behaviour === 'lens' },
    { key: 'center', label: 'Pass-band centre', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.behaviour === 'filter' },
    { key: 'width', label: 'Bandwidth', type: 'number', unit: 'nm', min: 0.1, max: 2000, step: 0.5, show: p => p.behaviour === 'filter' },
    { key: 'emit', label: 'Emits signal', type: 'bool', show: p => p.behaviour === 'sample' },
    { key: 'emitLambda', label: 'Signal wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.behaviour === 'sample' && p.emit },
    { key: 'lambda', label: 'Wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 12000, step: 1, show: p => p.behaviour === 'source' },
    { key: 'power', label: 'Power', type: 'number', unit: 'mW', min: 0, step: 0.1, show: p => p.behaviour === 'source' },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5 }],
  hint: 'The optical surface runs vertically through the centre of the drawing; beams travel left to right in its own frame. Save it to “My components” to reuse it.',
  resizable: true, keepAspect: true, snap: 'perp', mount: false, labelPos: [0, 7],
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S, obj) {
    if (p.svg && p.vb) {
      const k = Math.min(p.w / p.vb[2], p.h / p.vb[3]);
      return `<g transform="translate(${n(-p.vb[2] * k / 2)} ${n(-p.vb[3] * k / 2)}) scale(${n(k)}) translate(${n(-p.vb[0])} ${n(-p.vb[1])})">${p.svg}</g>`;
    }
    if (p.href) return `<image href="${U.esc(p.href)}" x="${n(-p.w / 2)}" y="${n(-p.h / 2)}" width="${n(p.w)}" height="${n(p.h)}" preserveAspectRatio="none"/>`;
    return H.rect(S, -p.w / 2, -p.h / 2, p.w, p.h, '#f4f5f7', 'rx="0.8" stroke-dasharray="1 0.7"') + H.text(S, 0, 0, p.title || 'Custom', { size: Math.min(S.fs, p.h * 0.3), color: '#6b7280' });
  },
  optics(p) {
    const seg = { a: [0, -p.h / 2], b: [0, p.h / 2] };
    switch (p.behaviour) {
      case 'mirror': return [Object.assign({ kind: 'mirror', R: 1 }, seg)];
      case 'splitter': return [Object.assign({ kind: 'splitter', R: p.R }, seg)];
      case 'lens': return [Object.assign({ kind: 'lens', f: p.f }, seg)];
      case 'absorb': return H.boxAbsorb(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2);
      case 'filter': return [Object.assign({ kind: 'filter', mode: 'bandpass', center: p.center, width: p.width, T: p.T }, seg)];
      case 'pass': return [Object.assign({ kind: 'pass' }, seg)];
      case 'sample': return [Object.assign({ kind: 'sample', T: 0, emit: p.emit, emitLambda: p.emitLambda, emitFrac: p.emitFrac, emitDir: 'back' }, seg)];
      case 'source': return H.boxAbsorb(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2);
      default: return [];
    }
  },
  source: p => p.behaviour === 'source' ? [{ o: [p.w / 2 + 0.05, 0], d: [1, 0], lambda: p.lambda, P: p.power, E: RNBX.optics.scaleJ(RNBX.optics.jones('H'), Math.sqrt(p.power)), w: (p.beamWidth || 0.7) / 2, dw: 0 }] : [],
  solid: (p, bh) => [{ kind: 'box', x: [-Math.min(p.w, 3) / 2, Math.min(p.w, 3) / 2], y: [-p.w / 2, p.w / 2], z: [0, bh + p.h / 2], mat: 'body' }],
});

/* Clean an uploaded SVG so it can be embedded inline (vector in every export). */
lib.importSvg = (text, idPrefix) => {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg') throw new Error('Not an SVG file');
  root.querySelectorAll('script, foreignObject, iframe, object, embed').forEach(e => e.remove());
  root.querySelectorAll('*').forEach(e => [...e.attributes].forEach(a => {
    if (/^on/i.test(a.name) || (/href$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) e.removeAttribute(a.name);
  }));
  let vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  if (vb.length !== 4 || vb.some(v => !isFinite(v))) vb = [0, 0, parseFloat(root.getAttribute('width')) || 100, parseFloat(root.getAttribute('height')) || 100];
  let inner = [...root.childNodes].map(c => new XMLSerializer().serializeToString(c)).join('');
  // keep ids unique inside the figure
  inner = inner.replace(/\bid="([^"]+)"/g, `id="${idPrefix}$1"`).replace(/url\(#([^)]+)\)/g, `url(#${idPrefix}$1)`).replace(/href="#([^"]+)"/g, `href="#${idPrefix}$1"`);
  inner = inner.replace(/\sxmlns(:\w+)?="[^"]*"/g, '');
  return { svg: inner, vb };
};
})();
