/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/detectors.js
   Fibre couplers, detectors, samples, mechanics, electronics.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;

/* ================= Fibre optics ================= */
lib.register({
  type: 'coupler', name: 'Fibre coupler / collimator', abbr: 'FC', category: 'Fibre optics',
  keywords: 'fiber fibre coupler collimator launch output port',
  defaults: { L: 6, D: 3.2, beamWidth: 0.7, divergence: 0 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 },
    { key: 'D', label: 'Diameter', type: 'number', unit: 'mm', min: 1, max: 15, step: 0.1 },
    { key: 'beamWidth', label: 'Output beam diameter (drawn)', type: 'number', unit: 'mm', min: 0.05, max: 10, step: 0.05 },
    { key: 'divergence', label: 'Output divergence', type: 'number', unit: '°', min: -30, max: 45, step: 0.1 }],
  hint: 'Connect two couplers with the Fibre tool. Light entering the first leaves the second.',
  snap: 'face', mount: true, labelPos: [0, 5.5],
  bbox: p => [-p.L / 2 - 1.2, -p.D / 2, p.L / 2 + 0.5, p.D / 2],
  fiberPort: p => [-p.L / 2 - 1.2, 0],
  port: p => ({ o: [p.L / 2 + 0.55, 0], d: [1, 0] }),
  draw(p, S) {
    const L = p.L, r = p.D / 2;
    let s = H.rect(S, -L / 2, -r, L, 2 * r, S.fill('metal'), 'rx="0.35"');
    s += H.sheen(S, -L / 2, -r, L, r * 0.8, 0.35);
    s += H.rect(S, -L / 2 - 1.2, -r * 0.45, 1.2, r * 0.9, S.fill('dark'));
    s += `<path d="M ${n(L / 2)} ${n(-r * 0.75)} Q ${n(L / 2 + 1)} 0 ${n(L / 2)} ${n(r * 0.75)} Z" fill="${S.fill('glass')}" ${H.stroke(S, 0.8)}/>`;
    return s;
  },
  optics: p => [{ kind: 'fiberIn', a: [p.L / 2 + 0.5, -p.D / 2], b: [p.L / 2 + 0.5, p.D / 2] }].concat(H.boxAbsorb(-p.L / 2 - 1.2, -p.D / 2, p.L / 2, p.D / 2)),
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2, p.L / 2], r: [p.D / 2, p.D / 2], mat: 'metal' }, { kind: 'cyl', x: [-p.L / 2 - 1.2, -p.L / 2], r: [p.D * 0.22, p.D * 0.22], mat: 'dark' }, { kind: 'cyl', x: [p.L / 2, p.L / 2 + 0.5], r: [p.D * 0.38, p.D * 0.2], mat: 'glass' }],
});

/* ================= Detectors ================= */
const det = (type, name, abbr, cfg) => lib.register(Object.assign({
  type, name, abbr, category: 'Detectors', snap: 'perp', labelPos: [0, 6.5],
}, cfg));

det('pd', 'Photodiode', 'PD', {
  keywords: 'photodiode detector apd spad balanced',
  defaults: { s: 4.6, sensor: 'single' },
  params: [{ key: 's', label: 'Size', type: 'number', unit: 'mm', min: 1.5, max: 30, step: 0.1 },
    { key: 'sensor', label: 'Sensor', type: 'select', options: [['single', 'Single element'], ['quad', 'Quadrant (four cells)'], ['balanced', 'Balanced (two inputs)']] }],
  variants: [{ name: 'Avalanche photodiode / SPAD', abbr: 'SPAD', props: { s: 4 }, keywords: 'apd spad single photon avalanche' }],
  bbox: p => [-p.s / 2, -p.s / 2, p.s / 2, p.s / 2],
  draw(p, S) {
    const h = p.s / 2;
    let s = `<path d="M ${n(-h)} ${n(-h)} L ${n(0)} ${n(-h)} A ${n(h)} ${n(h)} 0 0 1 ${n(0)} ${n(h)} L ${n(-h)} ${n(h)} Z" fill="${S.fill('black')}" ${H.stroke(S)}/>`;
    s += H.sheen(S, -h, -h, h * 1.6, h * 0.8);
    s += `<rect x="${n(-h - 0.05)}" y="${n(-h * 0.55)}" width="${n(0.45)}" height="${n(h * 1.1)}" fill="${S.shaded ? 'url(#rbx-sensor)' : '#6d7b8f'}" stroke="none"/>`;
    if (p.sensor === 'quad') s += H.line(S, -h - 0.05, 0, -h + 0.4, 0, '', 0.6, '#ffffff');
    if (p.sensor === 'balanced') s += `<rect x="${n(-h * 0.55)}" y="${n(-h - 0.05)}" width="${n(h * 0.7)}" height="${n(0.45)}" fill="${S.shaded ? 'url(#rbx-sensor)' : '#6d7b8f'}" stroke="none"/>`;
    return s;
  },
  optics: p => H.boxAbsorb(-p.s / 2, -p.s / 2, p.s / 2, p.s / 2),
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.s / 2, p.s / 2], r: [p.s / 2, p.s / 2], mat: 'black' }],
  mount: true,
});

det('camera', 'Camera (CCD / CMOS)', 'CAM', {
  keywords: 'camera ccd cmos emccd scmos imaging sensor',
  defaults: { L: 10, H: 8, front: 'plain' },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 },
    { key: 'front', label: 'Front', type: 'select', options: [['plain', 'Lens mount'], ['lenslet', 'Lenslet array (wavefront sensor)']] }],
  labelPos: [0, 7.5],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2, p.H / 2],
  draw(p, S) {
    const L = p.L, h = p.H, nose = Math.min(2.2, L * 0.25);
    let s = H.rect(S, -L / 2 + nose, -h / 2, L - nose, h, S.fill('dark'), 'rx="0.7"');
    s += H.sheen(S, -L / 2 + nose, -h / 2, L - nose, h * 0.45, 0.7);
    s += H.rect(S, -L / 2, -h * 0.3, nose, h * 0.6, S.fill('black'));
    if (p.front === 'lenslet') { const r = h * 0.6 / 10; let d = ''; for (let k = 0; k < 5; k++) { const y = -h * 0.3 + (2 * k + 1) * r; d += `M ${n(-L / 2)} ${n(y - r)} A ${n(r)} ${n(r)} 0 0 0 ${n(-L / 2)} ${n(y + r)} `; } s += `<path d="${d}" fill="${S.fill('glass')}" ${H.stroke(S, 0.5)}/>`; }
    for (let i = 1; i <= 3; i++) s += H.line(S, L / 2 - i * 1, -h / 2 + 0.8, L / 2 - i * 1, h / 2 - 0.8, '', 0.6, S.shaded ? '#7a828e' : '#ffffff');
    return s;
  },
  optics: p => H.boxAbsorb(-p.L / 2, -p.H / 2, p.L / 2, p.H / 2),
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2 + Math.min(2.2, p.L * 0.25), p.L / 2], y: [-p.H / 2, p.H / 2], z: [bh - p.H / 2, bh + p.H / 2], mat: 'dark' }, { kind: 'cyl', x: [-p.L / 2, -p.L / 2 + Math.min(2.2, p.L * 0.25)], r: [p.H * 0.3, p.H * 0.3], mat: 'black' }],
  mount: true, postR: 1.1,
});

det('spectrometer', 'Spectrometer', 'Spec', {
  keywords: 'spectrometer spectrograph monochromator raman detector',
  labelTemplate: 'Spectrometer', defaults: { L: 18, H: 10 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 6, max: 60, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 4, max: 40, step: 0.5 }],
  labelPos: [0, 8.5],
  bbox: p => [-p.L / 2, -p.H / 2, p.L / 2, p.H / 2],
  draw(p, S) {
    const L = p.L, h = p.H;
    let s = H.rect(S, -L / 2, -h / 2, L, h, S.shaded ? S.fill('body') : S.flat('body'), 'rx="0.8"');
    s += H.sheen(S, -L / 2, -h / 2, L, h * 0.4, 0.8);
    s += H.rect(S, -L / 2 - 0.2, -0.9, 0.6, 1.8, S.fill('black'));
    // dispersed fan glyph
    const cx = -L * 0.18, cy = 0, cols = ['#6236d8', '#1b7fe6', '#1fae3e', '#d4c400', '#f46a00', '#cc1222'];
    cols.forEach((c, i) => {
      const a = U.rad(-28 + i * 11), len = L * 0.48;
      s += `<line x1="${n(cx)}" y1="${n(cy)}" x2="${n(cx + Math.cos(a) * len)}" y2="${n(cy + Math.sin(a) * len)}" stroke="${c}" stroke-width="${n(S.lw * 1.6)}" stroke-linecap="round"/>`;
    });
    s += H.rect(S, cx - 0.9, -h * 0.28, 0.9, h * 0.56, S.fill('gold'));
    return s;
  },
  optics: p => H.boxAbsorb(-p.L / 2, -p.H / 2, p.L / 2, p.H / 2),
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [0, bh + 3], mat: 'body' }],
});

det('pmt', 'Photomultiplier tube', 'PMT', {
  keywords: 'pmt photomultiplier tube photon counting',
  defaults: { L: 11, D: 5 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'D', label: 'Diameter', type: 'number', unit: 'mm', min: 2, max: 20, step: 0.5 }],
  bbox: p => [-p.L / 2, -p.D / 2, p.L / 2, p.D / 2],
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.D / 2, p.L, p.D, S.fill('dark'), `rx="${n(p.D / 2)}"`);
    s += H.sheen(S, -p.L / 2, -p.D / 2, p.L, p.D * 0.45, p.D / 2);
    return s + H.rect(S, -p.L / 2, -p.D * 0.32, 0.6, p.D * 0.64, S.shaded ? 'url(#rbx-sensor)' : '#6d7b8f');
  },
  optics: p => H.boxAbsorb(-p.L / 2, -p.D / 2, p.L / 2, p.D / 2),
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2, p.L / 2], r: [p.D / 2, p.D / 2], mat: 'dark' }],
  mount: true,
});

det('powermeter', 'Power meter', 'PM', {
  keywords: 'power meter thermal sensor energy',
  defaults: { d: 7, t: 2 },
  params: [lib.P.diameter(7), lib.P.thick(2)],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2 + 1.2, p.d / 2],
  draw(p, S) {
    let s = H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d, S.fill('black'), 'rx="0.4"');
    s += H.rect(S, -p.t / 2 - 0.1, -p.d * 0.36, 0.45, p.d * 0.72, S.shaded ? 'url(#rbx-gold)' : '#c9a640');
    return s + H.rect(S, p.t / 2, -0.5, 1.2, 1, S.fill('dark'));
  },
  optics: p => H.boxAbsorb(-p.t / 2, -p.d / 2, p.t / 2, p.d / 2),
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.t / 2, p.t / 2], r: [p.d / 2, p.d / 2], mat: 'black' }],
  mount: true,
});

det('beamdump', 'Beam dump / block', 'BD', {
  keywords: 'beam dump block stop trap absorber',
  defaults: { s: 4 }, labelShow: false,
  params: [{ key: 's', label: 'Size', type: 'number', unit: 'mm', min: 1, max: 20, step: 0.5 }],
  bbox: p => [-p.s / 2, -p.s / 2, p.s / 2, p.s / 2],
  draw(p, S) {
    const h = p.s / 2;
    return `<path d="M ${n(-h)} ${n(-h)} L ${n(h)} ${n(-h * 0.5)} L ${n(h)} ${n(h * 0.5)} L ${n(-h)} ${n(h)} Z" fill="${S.fill('black')}" ${H.stroke(S)}/>` +
      `<path d="M ${n(-h)} ${n(-h * 0.55)} L ${n(h * 0.2)} 0 L ${n(-h)} ${n(h * 0.55)}" fill="none" ${H.stroke(S, 0.7, '#8a9099')}/>`;
  },
  optics: p => H.boxAbsorb(-p.s / 2, -p.s / 2, p.s / 2, p.s / 2),
  solid: (p, bh) => [{ kind: 'box', x: [-p.s / 2, p.s / 2], y: [-p.s / 2, p.s / 2], z: [bh - p.s / 2, bh + p.s / 2], mat: 'black' }],
  mount: true,
});

det('screen', 'Screen / card', 'Scr', {
  keywords: 'screen viewing card target white board',
  defaults: { d: 10, t: 0.6 }, params: [lib.P.diameter(10), lib.P.thick(0.6)],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2, p.d / 2],
  draw: (p, S) => H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d, S.flat('screen')),
  optics: p => [{ kind: 'absorb', a: [0, -p.d / 2], b: [0, p.d / 2] }],
  solid: (p, bh) => [{ kind: 'box', x: [-p.t / 2, p.t / 2], y: [-p.d / 2, p.d / 2], z: [bh - p.d / 2, bh + p.d / 2], mat: 'body' }],
  mount: true,
});

/* ================= Samples & mechanics ================= */
lib.register({
  type: 'sample', name: 'Sample', abbr: 'S', category: 'Samples & mechanics',
  keywords: 'sample slide substrate cuvette sers chip cell raman fluorescence emission',
  defaults: { look: 'slide', w: 1.2, h: 9, T: 0, emit: false, emitLambda: 560, emitFrac: 0.5, emitDir: 'back', emitColor: '', spot: '#e07a5f' },
  params: [
    { key: 'look', label: 'Appearance', type: 'select', options: [['slide', 'Glass slide'], ['cuvette', 'Cuvette'], ['chip', 'SERS / nanostructured chip'], ['wafer', 'Wafer / substrate'], ['droplet', 'Droplet on slide']] },
    { key: 'w', label: 'Thickness', type: 'number', unit: 'mm', min: 0.2, max: 30, step: 0.1 },
    { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 1, max: 60, step: 0.5 },
    { key: 'T', label: 'Transmission', type: 'range', min: 0, max: 1, step: 0.01, hint: '0 = opaque (light stops here)' },
    { key: 'spot', label: 'Sample colour', type: 'color' },
    { key: 'emit', label: 'Emits signal (Raman / fluorescence / SHG)', type: 'bool' },
    { key: 'emitLambda', label: 'Signal wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.emit },
    { key: 'emitFrac', label: 'Signal strength (relative)', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.emit },
    { key: 'emitDir', label: 'Signal direction', type: 'select', options: [['back', 'Back (epi)'], ['forward', 'Forward'], ['both', 'Both']], show: p => p.emit },
    { key: 'emitColor', label: 'Signal colour override', type: 'color', allowEmpty: true, show: p => p.emit },
  ],
  variants: [
    { name: 'Cuvette', props: { look: 'cuvette', w: 5, h: 5, T: 1, spot: '#9ad1d4' }, keywords: 'cuvette liquid solution' },
    { name: 'SERS chip (emits Raman)', props: { look: 'chip', w: 1.4, h: 9, emit: true, emitLambda: 560 }, keywords: 'sers raman substrate nanoparticle' },
  ],
  snap: 'perp', mount: true, labelPos: [0, 7.5],
  bbox: p => [-p.w / 2 - (p.look === 'droplet' ? 1.4 : 0), -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    const w = p.w, h = p.h;
    let s = '';
    if (p.look === 'cuvette') {
      s += H.rect(S, -w / 2, -h / 2, w, h, S.fill('glass'), S.shaded ? '' : 'fill-opacity="0.7"');
      s += `<rect x="${n(-w / 2 + 0.45)}" y="${n(-h / 2 + h * 0.18)}" width="${n(w - 0.9)}" height="${n(h * 0.82 - 0.45)}" fill="${p.spot}" fill-opacity="0.65" stroke="none"/>`;
    } else if (p.look === 'chip') {
      s += H.rect(S, -w / 2, -h / 2, w, h, S.shaded ? 'url(#rbx-dark)' : '#5b6370');
      for (let y = -h / 2 + 0.7; y < h / 2 - 0.3; y += 0.85) s += `<circle cx="${n(-w / 2)}" cy="${n(y)}" r="0.32" fill="${S.shaded ? 'url(#rbx-gold)' : '#d4a72c'}" stroke="none"/>`;
    } else if (p.look === 'wafer') {
      s += H.rect(S, -w / 2, -h / 2, w, h, S.shaded ? 'url(#rbx-wafer)' : '#8e8aa3');
    } else {
      s += H.rect(S, -w / 2, -h / 2, w, h, S.fill('glass'), S.shaded ? '' : 'fill-opacity="0.8"');
      if (p.look === 'droplet') s += `<path d="M ${n(-w / 2)} ${n(-1.4)} A 1.4 1.4 0 0 0 ${n(-w / 2)} ${n(1.4)} Z" fill="${p.spot}" fill-opacity="0.8" ${H.stroke(S, 0.6)}/>`;
      else s += `<rect x="${n(-w / 2 - 0.25)}" y="-1.1" width="0.25" height="2.2" fill="${p.spot}" stroke="none"/>`;
    }
    return s + H.sheen(S, -w / 2, -h / 2, w, h * 0.4);
  },
  optics: p => [Object.assign({ kind: 'sample', a: [-p.w / 2, -p.h / 2], b: [-p.w / 2, p.h / 2] }, p)],
  solid: (p, bh) => p.look === 'cuvette'
    ? [{ kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.h / 2, p.h / 2], z: [bh - p.h / 2, bh + p.h * 0.6], mat: 'glass' }, { kind: 'box', x: [-p.w / 2 + 0.3, p.w / 2 - 0.3], y: [-p.h / 2 + 0.3, p.h / 2 - 0.3], z: [bh - p.h / 2 + 0.3, bh + p.h * 0.25], mat: { color: p.spot, alpha: 0.6 } }]
    : [{ kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.h / 2, p.h / 2], z: [bh - p.h / 2, bh + p.h / 2], mat: p.look === 'chip' ? 'dark' : p.look === 'wafer' ? { color: '#8e8aa3' } : 'glass' }],
});

lib.register({
  type: 'stage', name: 'Translation stage', abbr: '', category: 'Samples & mechanics', autoLabel: false,
  keywords: 'translation stage delay line linear motorized piezo xyz',
  defaults: { L: 14, W: 9, arrow: true },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 4, max: 80, step: 0.5 }, { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 }, { key: 'arrow', label: 'Show travel arrow', type: 'bool' }],
  under: true, labelPos: [0, 8],
  bbox: p => [-p.L / 2, -p.W / 2, p.L / 2 + 2.2, p.W / 2 + (p.arrow ? 2.2 : 0)],
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.W / 2, p.L, p.W, S.shaded ? 'url(#rbx-metal)' : '#e6e8eb', 'rx="0.6" stroke-dasharray="none"');
    s += H.rect(S, p.L / 2, -1, 2.2, 2, S.fill('metal'), 'rx="0.4"');
    if (p.arrow) s += `<path d="M ${n(-p.L * 0.35)} ${n(p.W / 2 + 1.4)} L ${n(p.L * 0.35)} ${n(p.W / 2 + 1.4)} M ${n(-p.L * 0.35 + 1)} ${n(p.W / 2 + 0.7)} L ${n(-p.L * 0.35)} ${n(p.W / 2 + 1.4)} L ${n(-p.L * 0.35 + 1)} ${n(p.W / 2 + 2.1)} M ${n(p.L * 0.35 - 1)} ${n(p.W / 2 + 0.7)} L ${n(p.L * 0.35)} ${n(p.W / 2 + 1.4)} L ${n(p.L * 0.35 - 1)} ${n(p.W / 2 + 2.1)}" fill="none" ${H.stroke(S, 1.1)}/>`;
    return s;
  },
  optics: () => [],
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.W / 2, p.W / 2], z: [0, 1.6], mat: 'metal' }, { kind: 'cyl', x: [p.L / 2, p.L / 2 + 2.2], r: [0.9, 0.9], mat: 'metal', cz: 0.9 }],
  noPost: true,
});

lib.register({
  type: 'chamber', name: 'Cryostat / vacuum chamber', abbr: 'Cryostat', category: 'Samples & mechanics', labelTemplate: 'Cryostat',
  keywords: 'cryostat vacuum chamber enclosure window cell oven',
  defaults: { r: 9, win: 3.5, shape: 'round' },
  params: [{ key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 3, max: 60, step: 0.5 }, { key: 'win', label: 'Window size', type: 'number', unit: 'mm', min: 0.5, max: 30, step: 0.5 },
    { key: 'shape', label: 'Shape', type: 'select', options: [['round', 'Round'], ['square', 'Square']] }],
  under: true, labelPos: [0, 12],
  bbox: p => [-p.r, -p.r, p.r, p.r],
  draw(p, S) {
    const r = p.r, w = p.win / 2;
    const shape = q => p.shape === 'square'
      ? `<rect x="${n(-q)}" y="${n(-q)}" width="${n(2 * q)}" height="${n(2 * q)}" rx="1.2"`
      : `<circle cx="0" cy="0" r="${n(q)}"`;
    let s = `${shape(r)} fill="${S.shaded ? 'url(#rbx-metal)' : '#eef0f2'}" fill-opacity="${S.shaded ? 0.55 : 0.6}" ${H.stroke(S, 1.4)}/>`;
    s += `${shape(r - 0.9)} fill="#ffffff" fill-opacity="${S.shaded ? 0.35 : 0.85}" ${H.stroke(S, 0.6)}/>`;
    s += H.rect(S, -r - 0.3, -w, 1.5, 2 * w, S.fill('glass')) + H.rect(S, r - 1.2, -w, 1.5, 2 * w, S.fill('glass'));
    return s;
  },
  optics: () => [],
  solid: (p, bh) => [{ kind: 'vcyl', cx: 0, cy: 0, r: p.r, z: [0, bh + p.r * 0.5], mat: { color: '#b9bfc7', alpha: 0.22 } }],
  noPost: true,
});

/* ================= Electronics ================= */
lib.register({
  type: 'instrument', name: 'Instrument / electronics box', abbr: '', category: 'Electronics', autoLabel: false,
  keywords: 'lock in amplifier computer pc oscilloscope function generator driver controller daq electronics box',
  defaults: { w: 16, h: 8, text: 'Lock-in', icon: 'generic' },
  params: [{ key: 'text', label: 'Text', type: 'text' },
    { key: 'icon', label: 'Icon', type: 'select', options: [['generic', 'None'], ['computer', 'Computer'], ['scope', 'Oscilloscope'], ['fgen', 'Signal generator'], ['meter', 'Meter / controller']] },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 4, max: 80, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 60, step: 0.5 }],
  variants: [
    { name: 'Computer', props: { text: 'PC', icon: 'computer', w: 12, h: 10 }, keywords: 'computer pc laptop' },
    { name: 'Oscilloscope', props: { text: 'Oscilloscope', icon: 'scope', w: 18, h: 10 }, keywords: 'oscilloscope scope' },
    { name: 'Signal generator', props: { text: 'Function gen.', icon: 'fgen', w: 18, h: 9 }, keywords: 'function signal generator rf awg' },
  ],
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    const w = p.w, h = p.h;
    let s = H.rect(S, -w / 2, -h / 2, w, h, S.shaded ? 'url(#rbx-body)' : '#ffffff', 'rx="0.9"');
    s += H.sheen(S, -w / 2, -h / 2, w, h * 0.4, 0.9);
    let ty = 0;
    if (p.icon !== 'generic') {
      const sw = Math.min(w * 0.55, 9), sh = Math.min(h * 0.42, 4.2), sy = -h / 2 + 1;
      s += `<rect x="${n(-sw / 2)}" y="${n(sy)}" width="${n(sw)}" height="${n(sh)}" rx="0.3" fill="${S.shaded ? '#1f2a37' : '#eef3f8'}" ${H.stroke(S, 0.7)}/>`;
      const mid = sy + sh / 2, col = S.shaded ? '#7fe0a8' : '#1f6f4a';
      if (p.icon === 'scope' || p.icon === 'fgen') {
        let d = '';
        for (let i = 0; i <= 24; i++) { const x = -sw / 2 + 0.5 + (sw - 1) * i / 24; const y = mid + Math.sin(i / 24 * Math.PI * (p.icon === 'scope' ? 4 : 3)) * sh * 0.3 * (p.icon === 'scope' ? Math.exp(-i / 24) : 1); d += (i ? ' L ' : 'M ') + n(x) + ' ' + n(y); }
        s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(S.lw)}"/>`;
      } else if (p.icon === 'computer') {
        s += `<path d="M ${n(-sw * 0.3)} ${n(mid + sh * 0.2)} L ${n(-sw * 0.1)} ${n(mid - sh * 0.2)} L ${n(sw * 0.05)} ${n(mid + sh * 0.05)} L ${n(sw * 0.3)} ${n(mid - sh * 0.25)}" fill="none" stroke="${col}" stroke-width="${n(S.lw)}"/>`;
      } else {
        s += H.text(S, 0, mid, '88.8', { color: col, size: sh * 0.6, bold: true });
      }
      ty = sy + sh + (h / 2 - (sy + sh)) / 2;
    }
    if (p.text) s += `<text x="0" y="${n(ty)}" font-family="${U.esc(S.font)}" font-size="${n(Math.min(S.fs, h * 0.38))}" fill="${S.ink}" text-anchor="middle" dominant-baseline="central">${RNBX.text ? RNBX.text.markup(p.text) : U.esc(p.text)}</text>`;
    return s;
  },
  optics: p => H.boxAbsorb(-p.w / 2, -p.h / 2, p.w / 2, p.h / 2),
  solid: (p, bh) => [{ kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.h / 2, p.h / 2], z: [0, Math.max(bh + 2, p.h * 0.6)], mat: 'body' }],
  noPost: true,
});
})();
