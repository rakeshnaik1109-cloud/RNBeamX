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
