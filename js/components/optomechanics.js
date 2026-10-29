/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/optomechanics.js
   Optomechanics and imaging hardware of the kind found on any
   optics bench, drawn in RNBeamX's own generic style (no product
   names or catalogue artwork). Parts that touch the beam are real
   optics for the tracer: mounted mirrors reflect, lens tubes and
   cage plates focus, the filter cube splits excitation from
   emission, prisms refract and totally reflect, shutters block.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const OM = 'Optomechanics', IM = 'Imaging';
lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Samples & mechanics'), 0, OM);
lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Lenses & objectives') + 1, 0, IM);

const rot = (p, deg) => { const a = U.rad(deg), c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const knob = (S, x, y, r) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${S.fill('metal')}" ${H.stroke(S, 0.7)}/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.45)}" fill="${S.shaded ? '#59616c' : '#ffffff'}" ${H.stroke(S, 0.5)}/>`;
const label = (S, x, y, t, size) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size || S.fs * 0.7)}" fill="${S.shaded ? '#e8ecf2' : S.ink}" text-anchor="middle" dominant-baseline="central">${RNBX.text.markup(t)}</text>`;
const anodBox = (x0, x1, y0, y1, z0, z1) => ({ kind: 'box', x: [x0, x1], y: [y0, y1], z: [z0, z1], mat: 'anod' });

/* ================= Mirror mounts ================= */
lib.register({
  type: 'kmount', name: 'Kinematic mirror mount', abbr: 'M', category: OM,
  keywords: 'kinematic mirror mount adjustable tip tilt steering mount screws gimbal flip',
  defaults: { d: 8, R: 1, style: 'kinematic', tilt: 0, flipped: false, piezo: 0 },
  params: [lib.P.diameter(), { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'style', label: 'Mount', type: 'select', options: [['kinematic', 'Kinematic (two adjusters)'], ['gimbal', 'Gimbal (centred pivot)'], ['flip', 'Flip mount (in / out of the beam)']] },
    { key: 'tilt', label: 'Fine tilt', type: 'number', unit: '°', min: -20, max: 20, step: 0.1, animatable: true, hint: 'turn the adjusters' },
    { key: 'flipped', label: 'Flipped out of the beam', type: 'bool', show: p => p.style === 'flip' },
    { key: 'piezo', label: 'Piezo displacement', type: 'number', unit: 'nm', step: 10, animatable: true }],
  variants: [{ name: 'Gimbal mirror mount', props: { style: 'gimbal' } }, { name: 'Flip mirror mount', props: { style: 'flip' }, keywords: 'flip mount flipper switch beam path' }],
  snap: 'mirror', mount: true, labelPos: [0, 7.5],
  bbox: p => [-0.4, -p.d / 2 - 1.6, 4.6, p.d / 2 + 1.6],
  draw(p, S) {
    const r = p.d / 2, out = p.style === 'flip' && p.flipped;
    let s = '';
    // mount plate behind the mirror, with adjusters (kinematic) or a pivot ring (gimbal)
    s += H.rect(S, 1.6, -r - 1.6, 2.4, p.d + 3.2, S.fill('anod'), 'rx="0.5"');
    if (p.style === 'kinematic') s += knob(S, 4.1, -r - 0.4, 0.75) + knob(S, 4.1, r + 0.4, 0.75);
    if (p.style === 'gimbal') s += `<circle cx="2.8" cy="0" r="${n(Math.min(1.4, r * 0.45))}" fill="none" ${H.stroke(S, 0.8, S.shaded ? '#c9ced6' : S.ink)}/>`;
    if (p.style === 'flip') s += H.rect(S, 1.2, r + 1.6, 3.2, 0.9, S.fill('metal')) + knob(S, 2.8, r + 2.05, 0.45);
    const g = `<g transform="rotate(${n(out ? -80 : p.tilt)} 0 ${n(out ? r + 1.6 : 0)})"${out ? ' opacity="0.45"' : ''}>` +
      H.rect(S, 0, -r, 1.3, p.d, S.fill('mirror')) + H.line(S, 0, -r, 0, r, '', 2.2) + '</g>';
    return s + g;
  },
  optics: p => {
    if (p.style === 'flip' && p.flipped) return [];
    const r = p.d / 2;
    return [{ kind: 'mirror', a: rot([0, -r], p.tilt || 0), b: rot([0, r], p.tilt || 0), R: p.R }];
  },
  solid: (p, bh) => [{ kind: 'cyl', x: [0, 1.3], r: [p.d / 2, p.d / 2], mat: 'mirror' }, anodBox(1.6, 4, -p.d / 2 - 1.6, p.d / 2 + 1.6, bh - p.d / 2 - 1.6, bh + p.d / 2 + 1.6)],
});

lib.register({
  type: 'galvo', name: 'Galvo scanning mirror', abbr: 'GM', category: OM,
  keywords: 'galvo galvanometer scanner scanning mirror laser scanning microscope raster resonant',
  defaults: { d: 6, scan: 0, R: 1 },
  params: [lib.P.diameter(6), { key: 'scan', label: 'Scan angle (mechanical)', type: 'number', unit: '°', min: -20, max: 20, step: 0.1, animatable: true, hint: 'keyframe it to scan the beam' },
    { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01 }],
  snap: 'mirror', mount: true, labelPos: [0, 8],
  bbox: p => [-0.6, -p.d / 2 - 0.6, 7, p.d / 2 + 0.6],
  draw(p, S) {
    const r = p.d / 2;
    let s = H.rect(S, 2.2, -2, 4.6, 4, S.fill('dark'), 'rx="0.8"') + H.rect(S, 1.2, -0.5, 1.2, 1, S.fill('metal'));
    s += `<g transform="rotate(${n(p.scan)})">${H.rect(S, 0, -r, 1, p.d, S.fill('mirror'))}${H.line(S, 0, -r, 0, r, '', 2)}</g>`;
    return s + `<path d="M ${n(-0.4)} ${n(-r - 0.4)} A ${n(r + 0.4)} ${n(r + 0.4)} 0 0 0 ${n(-0.4)} ${n(r + 0.4)}" fill="none" ${H.stroke(S, 0.5)} stroke-dasharray="0.5 0.5"/>`;
  },
  optics: p => [{ kind: 'mirror', a: rot([0, -p.d / 2], p.scan || 0), b: rot([0, p.d / 2], p.scan || 0), R: p.R }],
  solid: (p, bh) => [{ kind: 'cyl', x: [0, 1], r: [p.d / 2, p.d / 2], mat: 'mirror' }, { kind: 'cyl', x: [2.2, 6.8], r: [2, 2], mat: 'dark' }],
});

/* ================= Lens tubes and cage system ================= */
lib.register({
  type: 'lenstube', name: 'Lens tube', abbr: 'LT', category: OM,
  keywords: 'lens tube threaded tube beam expander telescope collimator enclosure',
  defaults: { L: 14, D: 7, content: 'lens', f: 100, mag: 3, center: 532, width: 10 },
  params: [{ key: 'content', label: 'Inside', type: 'select', options: [['empty', 'Empty (beam passes)'], ['lens', 'Lens'], ['expander', 'Beam expander (two lenses)'], ['filter', 'Band-pass filter']] },
    { key: 'f', label: 'Focal length', type: 'number', unit: 'mm', min: -5000, max: 5000, step: 1, show: p => p.content === 'lens' },
    { key: 'mag', label: 'Magnification', type: 'number', unit: '×', min: 0.1, max: 20, step: 0.1, show: p => p.content === 'expander', hint: 'beam diameter out ÷ in' },
    { key: 'center', label: 'Pass-band centre', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.content === 'filter' },
    { key: 'width', label: 'Bandwidth', type: 'number', unit: 'nm', min: 0.1, max: 2000, step: 0.5, show: p => p.content === 'filter' },
    { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 80, step: 0.5 }, { key: 'D', label: 'Diameter', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 }],
  variants: [{ name: 'Beam expander (tube)', props: { content: 'expander', L: 22, D: 8, mag: 3 }, keywords: 'beam expander galilean keplerian telescope' }],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.L / 2, -p.D / 2 - 0.4, p.L / 2, p.D / 2 + 0.4],
  draw(p, S) {
    const L = p.L, R = p.D / 2, x1 = -L * 0.32, x2 = L * 0.32;
    let s = H.rect(S, -L / 2, -R, L, p.D, S.shaded ? 'url(#rbx-metal)' : '#eef0f2', 'rx="0.4"');
    // threads at both ends
    for (const xe of [-L / 2, L / 2 - 1.2]) for (let k = 0; k < 4; k++) s += H.line(S, xe + k * 0.3 + 0.15, -R - 0.35, xe + k * 0.3 + 0.15, R + 0.35, '', 0.4);
    const lensAt = (x, sz, conv) => `<path d="${H.lensPath(conv ? 'biconvex' : 'biconcave', sz, 1.2)}" transform="translate(${n(x)} 0)" fill="${S.fill('glass')}" ${H.stroke(S, 0.7)}/>`;
    if (p.content === 'lens') s += lensAt(0, R * 0.8, p.f >= 0);
    if (p.content === 'expander') s += lensAt(x1, R * 0.45, true) + lensAt(x2, R * 0.8, true);
    if (p.content === 'filter') s += H.rect(S, -0.4, -R * 0.8, 0.8, R * 1.6, U.wavelengthColor(p.center));
    return s;
  },
  optics: (p, obj, doc) => {
    const R = p.D / 2 * 0.8;
    if (p.content === 'lens') return [{ kind: 'lens', a: [0, -R], b: [0, R], f: p.f }];
    if (p.content === 'filter') return [{ kind: 'filter', a: [0, -R], b: [0, R], mode: 'bandpass', center: p.center, width: p.width, T: 0.95 }];
    if (p.content === 'expander') {
      // Keplerian pair whose focal lengths fit the drawn spacing: f1 + f2 = spacing, f2 / f1 = magnification
      const sc = (doc && doc.style.scale) || 10, sep = p.L * 0.64 * sc, m = Math.max(0.05, p.mag), f1 = sep / (1 + m), f2 = m * f1;
      return [{ kind: 'lens', a: [-p.L * 0.32, -R], b: [-p.L * 0.32, R], f: f1 }, { kind: 'lens', a: [p.L * 0.32, -R], b: [p.L * 0.32, R], f: f2 }];
    }
    return [{ kind: 'pass', a: [0, -R], b: [0, R] }];
  },
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2, p.L / 2], r: [p.D / 2, p.D / 2], mat: 'metal' }],
});

lib.register({
  type: 'cagecube', name: 'Cage cube', abbr: 'CC', category: OM,
  keywords: 'cage cube system rods beam splitter turning mirror dichroic insert 30 mm 60 mm',
  defaults: { s: 8, insert: 'bs', R: 0.5, edge: 550, mode: 'longpass', look: 'flat' },
  params: [{ key: 'look', label: 'Drawn as', type: 'select', options: [['flat', 'Cage cube (side view)'], ['box3d', 'Metal cube (3D look)']] },
    { key: 'insert', label: 'Insert', type: 'select', options: [['bs', 'Beam splitter'], ['pbs', 'Polarising beam splitter'], ['mirror', 'Turning mirror'], ['dichroic', 'Dichroic mirror']] },
    { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.insert === 'bs' },
    { key: 'edge', label: 'Edge', type: 'wavelength', unit: 'nm', min: 200, max: 5000, step: 1, show: p => p.insert === 'dichroic' },
    { key: 'mode', label: 'Dichroic', type: 'select', options: [['longpass', 'Long-pass (reflects short)'], ['shortpass', 'Short-pass (reflects long)']], show: p => p.insert === 'dichroic' },
    { key: 's', label: 'Size', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }],
  variants: [{ name: 'Cage turning mirror', props: { insert: 'mirror' } }, { name: 'Cage dichroic cube', props: { insert: 'dichroic' } }, { name: 'Cage cube (3D look)', props: { look: 'box3d' }, keywords: 'cube 3d metal beam splitter cube housing perspective' }],
  snap: 'cube', mount: true, labelPos: [0, 7],
  bbox: p => (p.look === 'box3d' ? [-p.s / 2, -p.s / 2 - p.s * 0.28, p.s / 2 + p.s * 0.22, p.s / 2] : [-p.s / 2 - 0.8, -p.s / 2 - 0.8, p.s / 2 + 0.8, p.s / 2 + 0.8]),
  draw(p, S, obj) {
    const h = p.s / 2;
    if (p.look === 'box3d') {
      const dx = p.s * 0.22, dy = p.s * 0.28, id = 'rbx-cc3-' + (obj ? obj.id : 'x');
      let q = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0.3"><stop offset="0" stop-color="#eef0f3"/><stop offset="0.45" stop-color="#b7bcc4"/><stop offset="0.7" stop-color="#e3e6ea"/><stop offset="1" stop-color="#8d939c"/></linearGradient></defs>`;
      q += `<path d="M ${n(-h)} ${n(-h)} L ${n(-h + dx)} ${n(-h - dy)} L ${n(h + dx)} ${n(-h - dy)} L ${n(h)} ${n(-h)} Z" fill="#d9cdb6" stroke="#6b7078" stroke-width="${n(S.lw * 0.6)}"/>`;
      q += `<path d="M ${n(h)} ${n(-h)} L ${n(h + dx)} ${n(-h - dy)} L ${n(h + dx)} ${n(h - dy)} L ${n(h)} ${n(h)} Z" fill="#9aa0a8" stroke="#6b7078" stroke-width="${n(S.lw * 0.6)}"/>`;
      q += `<rect x="${n(-h)}" y="${n(-h)}" width="${n(p.s)}" height="${n(p.s)}" fill="url(#${id})" stroke="#6b7078" stroke-width="${n(S.lw * 0.6)}"/>`;
      return q + H.line(S, -h + 0.3, -h + 0.3, h - 0.3, h - 0.3, '', 1.2, '#ffffff') + H.line(S, -h + 0.3, -h + 0.3, h - 0.3, h - 0.3, '', 0.5, '#7d838c');
    }
    let s = H.rect(S, -h, -h, p.s, p.s, S.shaded ? 'url(#rbx-metal)' : '#f1f3f5', 'rx="0.6"');
    s += H.rect(S, -h + 1, -h + 1, p.s - 2, p.s - 2, S.shaded ? '#2b3038' : '#ffffff');
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { s += `<circle cx="${n(a * (h - 0.45))}" cy="${n(b * (h - 0.45))}" r="0.42" fill="${S.fill('metal')}" ${H.stroke(S, 0.5)}/>`; });
    const col = p.insert === 'mirror' ? S.ink : p.insert === 'pbs' ? '#3d5a80' : p.insert === 'dichroic' ? U.wavelengthColor(p.edge - 40) : '#4a7fb5';
    s += H.line(S, -h + 1, h - 1, h - 1, -h + 1, '', p.insert === 'mirror' ? 2 : 1.4, col);
    return s;
  },
  optics: p => {
    const h = p.s / 2 - 1, seg = { a: [-h, h], b: [h, -h] };
    if (p.insert === 'mirror') return [Object.assign({ kind: 'mirror', R: 1 }, seg)];
    if (p.insert === 'pbs') return [Object.assign({ kind: 'pbs' }, seg)];
    if (p.insert === 'dichroic') return [Object.assign({ kind: 'dichroic', edge: p.edge, mode: p.mode }, seg)];
    return [Object.assign({ kind: 'splitter', R: p.R }, seg)];
  },
  solid: (p, bh) => [anodBox(-p.s / 2, p.s / 2, -p.s / 2, p.s / 2, bh - p.s / 2, bh + p.s / 2)],
});

lib.register({
  type: 'cageplate', name: 'Cage plate', abbr: 'CP', category: OM,
  keywords: 'cage plate rods mount lens iris filter holder cage system',
  defaults: { s: 9, content: 'lens', f: 100, r: 1.2 },
  params: [{ key: 'content', label: 'Holds', type: 'select', options: [['lens', 'Lens'], ['iris', 'Iris'], ['empty', 'Nothing (beam passes)']] },
    { key: 'f', label: 'Focal length', type: 'number', unit: 'mm', min: -5000, max: 5000, step: 1, show: p => p.content === 'lens' },
    { key: 'r', label: 'Iris opening (drawn radius)', type: 'number', unit: 'mm', min: 0.05, max: 20, step: 0.05, show: p => p.content === 'iris' },
    { key: 's', label: 'Plate size', type: 'number', unit: 'mm', min: 4, max: 40, step: 0.5 }],
  snap: 'perp', mount: true, labelPos: [0, 7.5],
  bbox: p => [-1, -p.s / 2, 1, p.s / 2],
  draw(p, S) {
    const h = p.s / 2;
    let s = H.rect(S, -0.9, -h, 1.8, p.s, S.fill('anod'), 'rx="0.3"');
    s += H.rect(S, -2.6, -h + 0.3, 5.2, 0.6, S.fill('metal')) + H.rect(S, -2.6, h - 0.9, 5.2, 0.6, S.fill('metal'));   // rods
    if (p.content === 'lens') s += `<path d="${H.lensPath(p.f >= 0 ? 'biconvex' : 'biconcave', h * 0.6, 1.3)}" fill="${S.fill('glass')}" ${H.stroke(S, 0.7)}/>`;
    if (p.content === 'iris') { const o = Math.min(p.r, h * 0.7); s += H.rect(S, -0.3, -h * 0.75, 0.6, h * 0.75 - o, S.fill('dark')) + H.rect(S, -0.3, o, 0.6, h * 0.75 - o, S.fill('dark')); }
    return s;
  },
  optics: p => {
    const h = p.s / 2 * 0.75;
    if (p.content === 'lens') return [{ kind: 'lens', a: [0, -h], b: [0, h], f: p.f }];
    if (p.content === 'iris') return [{ kind: 'aperture', a: [0, -h], b: [0, h], r: p.r }];
    return [{ kind: 'pass', a: [0, -h], b: [0, h] }];
  },
  solid: (p, bh) => [anodBox(-0.9, 0.9, -p.s / 2, p.s / 2, bh - p.s / 2, bh + p.s / 2)],
});

/* ================= Shutter ================= */
lib.register({
  type: 'shutter', name: 'Beam shutter', abbr: 'SH', category: OM,
  keywords: 'shutter beam block safety electronic mechanical open closed',
  defaults: { d: 7, open: true },
  params: [lib.P.diameter(7), { key: 'open', label: 'Open', type: 'bool', animatable: true }],
  snap: 'perp', mount: true, labelPos: [0, 7.5],
  bbox: p => [-2.4, -p.d / 2 - 1.4, 2.4, p.d / 2 + 1.4],
  draw(p, S) {
    const r = p.d / 2;
    let s = H.rect(S, -2.2, -r - 1.2, 4.4, p.d + 2.4, S.fill('dark'), 'rx="0.7"');
    s += H.rect(S, -2.2, -r * 0.55, 4.4, r * 1.1, S.shaded ? '#14171c' : '#ffffff');
    if (!p.open) s += H.rect(S, -0.5, -r * 0.6, 1, r * 1.2, '#e2b33c');
    return s + label(S, 0, -r - 0.55, p.open ? 'open' : 'closed', 0.9);
  },
  optics: p => [{ kind: p.open ? 'pass' : 'absorb', a: [0, -p.d / 2 * 0.55], b: [0, p.d / 2 * 0.55] }],
  solid: (p, bh) => [{ kind: 'box', x: [-2.2, 2.2], y: [-p.d / 2 - 1.2, p.d / 2 + 1.2], z: [bh - p.d / 2 - 1.2, bh + p.d / 2 + 1.2], mat: 'dark' }],
});

/* ================= Breadboard, rail, stages ================= */
lib.register({
  type: 'breadboard', name: 'Optical breadboard', abbr: '', category: OM, annotation: true, under: true, autoLabel: false,
  keywords: 'breadboard optical table tapped holes grid honeycomb base plate',
  defaults: { w: 80, h: 50, pitch: 5, color: '#d7dbe0', holes: true },
  params: [{ key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 400, step: 1 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 5, max: 400, step: 1 },
    { key: 'pitch', label: 'Hole spacing (drawn)', type: 'number', unit: 'mm', min: 1, max: 30, step: 0.5 }, { key: 'holes', label: 'Show holes', type: 'bool' }, { key: 'color', label: 'Colour', type: 'color' }],
  resizable: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    let s = `<rect x="${n(-p.w / 2)}" y="${n(-p.h / 2)}" width="${n(p.w)}" height="${n(p.h)}" rx="1" fill="${p.color}" stroke="${U.darken(p.color, 0.3)}" stroke-width="${n(S.lw)}"/>`;
    if (p.holes) {
      const hole = U.darken(p.color, 0.35), r = Math.max(0.15, p.pitch * 0.11);
      let d = '';
      for (let x = -p.w / 2 + p.pitch / 2; x < p.w / 2; x += p.pitch) for (let y = -p.h / 2 + p.pitch / 2; y < p.h / 2; y += p.pitch) d += `M ${n(x + r)} ${n(y)} A ${n(r)} ${n(r)} 0 1 0 ${n(x - r)} ${n(y)} A ${n(r)} ${n(r)} 0 1 0 ${n(x + r)} ${n(y)} Z `;
      s += `<path d="${d}" fill="${hole}"/>`;
    }
    return s;
  },
});
lib.register({
  type: 'rail', name: 'Optical rail with carriers', abbr: '', category: OM, under: true, autoLabel: false,
  keywords: 'optical rail dovetail carrier bench slide ruler',
  defaults: { L: 60, W: 4, carriers: 3, ticks: true },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 10, max: 400, step: 1 }, { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 1, max: 20, step: 0.5 },
    { key: 'carriers', label: 'Carriers', type: 'number', min: 0, max: 12, step: 1 }, { key: 'ticks', label: 'Ruler marks', type: 'bool' }],
  bbox: p => [-p.L / 2, -p.W / 2 - 1, p.L / 2, p.W / 2 + 1],
  draw(p, S) {
    let s = H.rect(S, -p.L / 2, -p.W / 2, p.L, p.W, S.shaded ? 'url(#rbx-metal)' : '#eceff2', 'rx="0.4"');
    if (p.ticks) for (let x = -p.L / 2 + 2; x < p.L / 2 - 1; x += 2) s += H.line(S, x, p.W / 2 - (Math.round((x + p.L / 2) / 2) % 5 === 0 ? 1.4 : 0.8), x, p.W / 2, '', 0.35);
    const N = Math.round(p.carriers);
    for (let i = 0; i < N; i++) { const x = -p.L / 2 + p.L * (i + 0.5) / N; s += H.rect(S, x - 2, -p.W / 2 - 1, 4, p.W + 2, S.fill('anod'), 'rx="0.4"'); }
    return s;
  },
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.W / 2, p.W / 2], z: [0, 1.4], mat: 'metal' }],
  noPost: true,
});
lib.register({
  type: 'posstage', name: 'Rotation stage', abbr: '', category: OM, under: true, autoLabel: false,
  keywords: 'rotation stage goniometer xyz stage tilt platform kinematic platform micrometer positioner manual motorised',
  defaults: { kind: 'rotation', s: 14, angle: 0 },
  params: [{ key: 'kind', label: 'Type', type: 'select', options: [['rotation', 'Rotation stage'], ['xyz', 'XYZ stage (three micrometers)'], ['tilt', 'Tilt platform (three screws)']] },
    { key: 'angle', label: 'Dial angle', type: 'number', unit: '°', min: -360, max: 360, step: 1, animatable: true, show: p => p.kind === 'rotation' },
    { key: 's', label: 'Size', type: 'number', unit: 'mm', min: 5, max: 80, step: 0.5 }],
  variants: [{ name: 'XYZ stage', props: { kind: 'xyz' } }, { name: 'Tilt platform', props: { kind: 'tilt' } }],
  bbox: p => [-p.s / 2 - 3, -p.s / 2 - 3, p.s / 2 + 3, p.s / 2 + 3],
  draw(p, S) {
    const h = p.s / 2, metal = S.shaded ? 'url(#rbx-metal)' : '#eceff2';
    let s = '';
    const micro = (x, y, ang) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${ang})">${H.rect(S, 0, -0.8, 2.6, 1.6, S.fill('metal'))}${H.rect(S, 2.6, -1.1, 1.2, 2.2, S.fill('anod'))}</g>`;
    if (p.kind === 'rotation') {
      s += `<circle cx="0" cy="0" r="${n(h)}" fill="${metal}" ${H.stroke(S)}/><circle cx="0" cy="0" r="${n(h * 0.72)}" fill="${S.shaded ? '#3a4049' : '#ffffff'}" ${H.stroke(S, 0.7)}/>`;
      for (let a = 0; a < 360; a += 10) { const t = U.rad(a + p.angle), l = a % 30 === 0 ? 1.2 : 0.6; s += H.line(S, Math.cos(t) * h, Math.sin(t) * h, Math.cos(t) * (h - l), Math.sin(t) * (h - l), '', 0.4); }
      s += micro(h - 0.4, h * 0.45, 30);
    } else {
      s += H.rect(S, -h, -h, p.s, p.s, metal, 'rx="0.6"') + H.rect(S, -h * 0.75, -h * 0.75, p.s * 0.75, p.s * 0.75, S.shaded ? '#3a4049' : '#ffffff', 'rx="0.4"');
      if (p.kind === 'xyz') s += micro(h, -h * 0.3, 0) + micro(-h * 0.3, h, 90) + micro(-h, -h * 0.5, 180);
      else [[-0.55, -0.55], [0.55, -0.55], [0, 0.6]].forEach(([a, b]) => { s += knob(S, a * h, b * h, h * 0.13); });
    }
    return s;
  },
  optics: () => [],
  solid: (p, bh) => [{ kind: 'box', x: [-p.s / 2, p.s / 2], y: [-p.s / 2, p.s / 2], z: [0, 2], mat: 'metal' }],
  noPost: true,
});

/* ================= Prisms ================= */
const PRISMS = {
  rightangle: s => [[-s / 2, s / 2], [s / 2, s / 2], [-s / 2, -s / 2]],
  dove: s => [[-s, s * 0.25], [s, s * 0.25], [s * 0.5, -s * 0.25], [-s * 0.5, -s * 0.25]],
  wedge: s => [[-s * 0.14, -s / 2], [s * 0.14, -s / 2], [s * 0.05, s / 2], [-s * 0.14, s / 2]],
  axicon: s => [[-s * 0.35, -s / 2], [0, -s / 2], [s * 0.35, 0], [0, s / 2], [-s * 0.35, s / 2]],
};
lib.register({
  type: 'rprism', name: 'Right-angle prism', abbr: 'PR', category: 'Filters & dispersion',
  keywords: 'right angle prism reflecting total internal reflection dove image rotation wedge axicon bessel',
  defaults: { kind: 'rightangle', s: 8, mat: 'N-BK7', n: 1.5 },
  params: [{ key: 'kind', label: 'Shape', type: 'select', options: [['rightangle', 'Right-angle (90° turn by TIR)'], ['dove', 'Dove (image rotation)'], ['wedge', 'Wedge (beam steering)'], ['axicon', 'Axicon (Bessel beam)']] },
    { key: 's', label: 'Size', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 }, lib.P.material(), { key: 'n', label: 'Refractive index', type: 'number', min: 1, max: 4, step: 0.01, show: p => p.mat === 'custom' }],
  variants: [{ name: 'Dove prism', props: { kind: 'dove', s: 7 } }, { name: 'Wedge prism', props: { kind: 'wedge', s: 9 } }, { name: 'Axicon', props: { kind: 'axicon', s: 8 } }],
  labelPos: [0, 7.5],
  bbox(p) { const g = PRISMS[p.kind](p.s); return [Math.min(...g.map(q => q[0])), Math.min(...g.map(q => q[1])), Math.max(...g.map(q => q[0])), Math.max(...g.map(q => q[1]))]; },
  draw(p, S) {
    const g = PRISMS[p.kind](p.s);
    let s = `<path d="M ${g.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${S.fill('glass')}" ${S.shaded ? '' : 'fill-opacity="0.85"'} ${H.stroke(S)}/>`;
    if (S.shaded) s += `<path d="M ${n(g[0][0] + 0.6)} ${n(g[0][1] + (g[0][1] < 0 ? 0.8 : -0.8))} L ${n((g[0][0] + g[1][0]) / 2)} ${n((g[0][1] + g[1][1]) / 2 + (g[0][1] < 0 ? 0.8 : -0.8))}" stroke="#fff" stroke-opacity="0.7" stroke-width="${n(S.lw * 1.4)}" stroke-linecap="round"/>`;
    return s;
  },
  optics: p => [{ poly: PRISMS[p.kind](p.s), mat: p.mat, n: p.n }],
  solid: (p, bh) => [{ kind: 'poly', pts: PRISMS[p.kind](p.s), z: [bh - p.s * 0.4, bh + p.s * 0.4], mat: 'glass' }],
});

/* ================= Diffuser ================= */
lib.register({
  type: 'diffuser', name: 'Diffuser (ground glass)', abbr: 'D', category: 'Filters & dispersion',
  keywords: 'diffuser ground glass opal holographic engineered scatter homogenise speckle',
  defaults: { d: 8, t: 1, spread: 10 },
  params: [lib.P.diameter(), lib.P.thick(1), { key: 'spread', label: 'Spread (full angle)', type: 'number', unit: '°', min: 0.5, max: 80, step: 0.5 }],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.t / 2, -p.d / 2, p.t / 2, p.d / 2],
  draw(p, S) {
    let s = H.rect(S, -p.t / 2, -p.d / 2, p.t, p.d, S.shaded ? '#e9eef3' : '#f6f8fa');
    let d = '';
    for (let i = 0; i < Math.round(p.d * 3); i++) { const y = -p.d / 2 + (i + 0.5) * p.d / Math.round(p.d * 3), x = -p.t / 2 + ((i * 37) % 10) / 10 * p.t; d += `M ${n(x)} ${n(y)} h 0.05 `; }
    return s + `<path d="${d}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.9)}" stroke-linecap="round"/>`;
  },
  // the transmitted beam opens up: a diverging lens whose cone matches the spread for a 1 mm beam
  optics: (p, obj, doc) => [{ kind: 'lens', a: [0, -p.d / 2], b: [0, p.d / 2], f: -((doc && doc.style.scale) || 10) * 0.5 / Math.tan(U.rad(p.spread / 2)) }],
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.t / 2, p.t / 2], r: [p.d / 2, p.d / 2], mat: { color: '#eef2f6', alpha: 0.8 } }],
});

/* ================= Imaging ================= */
lib.register({
  type: 'filtercube', name: 'Fluorescence filter cube', abbr: 'FC', category: IM,
  keywords: 'fluorescence filter cube excitation emission dichroic epi microscope gfp dapi',
  defaults: { s: 9, exc: 488, excW: 20, edge: 505, em: 525, emW: 40 },
  params: [{ key: 'exc', label: 'Excitation filter centre', type: 'wavelength', unit: 'nm', min: 200, max: 2000, step: 1 }, { key: 'excW', label: 'Excitation bandwidth', type: 'number', unit: 'nm', min: 1, max: 300, step: 1 },
    { key: 'edge', label: 'Dichroic edge (reflects shorter)', type: 'wavelength', unit: 'nm', min: 200, max: 2000, step: 1 },
    { key: 'em', label: 'Emission filter centre', type: 'wavelength', unit: 'nm', min: 200, max: 2000, step: 1 }, { key: 'emW', label: 'Emission bandwidth', type: 'number', unit: 'nm', min: 1, max: 300, step: 1 },
    { key: 's', label: 'Size', type: 'number', unit: 'mm', min: 4, max: 40, step: 0.5 }],
  hint: 'Excitation enters from the left and is reflected up (towards the objective); fluorescence coming back down passes the dichroic and the emission filter at the bottom.',
  snap: 'cube', mount: true, labelPos: [0, 8],
  bbox: p => [-p.s / 2 - 0.6, -p.s / 2, p.s / 2, p.s / 2 + 0.6],
  draw(p, S) {
    const h = p.s / 2;
    let s = H.rect(S, -h, -h, p.s, p.s, S.fill('anod'), 'rx="0.6"') + H.rect(S, -h + 0.9, -h + 0.9, p.s - 1.8, p.s - 1.8, S.shaded ? '#22262d' : '#ffffff');
    s += H.rect(S, -h - 0.6, -h * 0.6, 0.9, h * 1.2, U.wavelengthColor(p.exc));
    s += H.rect(S, -h * 0.6, h - 0.3, h * 1.2, 0.9, U.wavelengthColor(p.em));
    s += H.line(S, -h + 1, h - 1, h - 1, -h + 1, '', 1.4, U.wavelengthColor(p.edge - 30));
    return s;
  },
  optics: p => {
    const h = p.s / 2, k = h - 1;
    return [
      { kind: 'filter', a: [-h - 0.2, -h * 0.6], b: [-h - 0.2, h * 0.6], mode: 'bandpass', center: p.exc, width: p.excW, T: 0.95 },
      { kind: 'dichroic', a: [-k, k], b: [k, -k], edge: p.edge, mode: 'longpass' },
      { kind: 'filter', a: [-h * 0.6, h + 0.2], b: [h * 0.6, h + 0.2], mode: 'bandpass', center: p.em, width: p.emW, T: 0.95 },
    ];
  },
  solid: (p, bh) => [anodBox(-p.s / 2, p.s / 2, -p.s / 2, p.s / 2, bh - p.s / 2, bh + p.s / 2)],
});
/* ray bundle for imaging diagrams: a point object, an object arrow or a parallel bundle */
const FDC = [486.13, 587.56, 656.27];
lib.register({
  type: 'raysource', name: 'Ray bundle / object', abbr: 'OB', category: IM, labelTemplate: 'Object',
  keywords: 'ray fan ray bundle object point source imaging ray diagram aberration chromatic spot field',
  defaults: { mode: 'arrow', h: 4, rays: 7, fan: 14, tilt: 0, colors: 'single', lambda: 587.56, color: '' },
  params: [{ key: 'mode', label: 'Type', type: 'select', options: [['arrow', 'Object arrow (fans from tip and base)'], ['point', 'Point source (one fan)'], ['parallel', 'Parallel bundle (object at infinity)']] },
    { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 0.2, max: 40, step: 0.1, hint: 'arrow height or bundle diameter (drawn)' },
    { key: 'rays', label: 'Rays per fan', type: 'number', min: 2, max: 41, step: 1 },
    { key: 'fan', label: 'Fan angle (full)', type: 'number', unit: '°', min: 0.1, max: 120, step: 0.5, show: p => p.mode !== 'parallel' },
    { key: 'tilt', label: 'Field angle', type: 'number', unit: '°', min: -45, max: 45, step: 0.5, animatable: true, hint: 'tilts the whole bundle' },
    { key: 'colors', label: 'Colours', type: 'select', options: [['single', 'One wavelength'], ['fdc', 'Blue, yellow, red (F, d, C lines)'], ['rgb', 'RGB lasers (450, 520, 638 nm)']] },
    { key: 'lambda', label: 'Wavelength', type: 'wavelength', unit: 'nm', min: 150, max: 12000, step: 1, show: p => p.colors === 'single' },
    { key: 'color', label: 'Ray colour override', type: 'color', allowEmpty: true }],
  variants: [{ name: 'Point source (ray fan)', props: { mode: 'point', h: 0.5 }, keywords: 'point source fan' }, { name: 'Parallel ray bundle', props: { mode: 'parallel', h: 5, rays: 9 }, keywords: 'collimated parallel rays infinity' }],
  hint: 'Pair it with lenses set to Real glass surfaces to see spherical and chromatic aberration; a screen or camera reports the spot size.',
  labelPos: [0, 6],
  bbox: p => p.mode === 'arrow' ? [-0.8, -p.h - 0.6, 0.8, 0.6] : [-0.8, -p.h / 2 - 0.4, 0.8, p.h / 2 + 0.4],
  draw(p, S) {
    const col = p.colors !== 'single' ? S.ink : lib.colorOf(S.doc, p.lambda, p.color);
    if (p.mode === 'arrow') return H.line(S, 0, 0, 0, -p.h + 0.8, '', 1.6, S.ink) + H.arrowHead(0, -p.h, -Math.PI / 2, 1.6, S.ink) + H.line(S, -0.9, 0, 0.9, 0, '', 0.8, S.ink);
    if (p.mode === 'point') return `<circle cx="0" cy="0" r="0.55" fill="${col}" ${H.stroke(S, 0.6)}/>`;
    let s = H.rect(S, -0.5, -p.h / 2, 0.5, p.h, S.fill('dark'));
    for (let k = 0; k < 5; k++) { const y = -p.h / 2 + p.h * (k + 0.5) / 5; s += H.line(S, 0, y, 0.7, y, '', 0.6, col); }
    return s;
  },
  source(p) {
    const ls = p.colors === 'fdc' ? FDC : p.colors === 'rgb' ? [450, 520, 638] : [p.lambda], N = Math.max(2, Math.round(p.rays)), out = [];
    const t0 = U.rad(p.tilt || 0), P = 1 / ls.length;
    const fan = (o, k) => { for (let i = 0; i < N; i++) { const a = t0 + U.rad(p.fan) * (i / (N - 1) - 0.5); out.push({ o, d: [Math.cos(a), Math.sin(a)], lambda: ls[k], P: P / N, E: null, w: 0, dw: 0, ray: true, color: p.color || null }); } };
    ls.forEach((l, k) => {
      if (p.mode === 'arrow') { fan([0, -p.h], k); fan([0, 0], k); }
      else if (p.mode === 'point') fan([0.6, 0], k);
      else for (let i = 0; i < N; i++) out.push({ o: [0.75, p.h * (i / (N - 1) - 0.5)], d: [Math.cos(t0), Math.sin(t0)], lambda: l, P: P / N, E: null, w: 0, dw: 0, ray: true, color: p.color || null });
    });
    return out;
  },
  solid: (p, bh) => [{ kind: 'box', x: [-0.4, 0.4], y: [-0.4, 0.4], z: [bh - 0.2, bh + (p.mode === 'arrow' ? p.h : 0.4)], mat: 'dark' }],
  noPost: true,
});

lib.register({
  type: 'eyepiece', name: 'Eyepiece', abbr: 'EP', category: IM,
  keywords: 'eyepiece ocular microscope telescope viewing',
  defaults: { L: 10, D: 6, f: 25, mag: '10×' },
  params: [{ key: 'f', label: 'Focal length', type: 'number', unit: 'mm', min: 1, max: 500, step: 1 }, { key: 'mag', label: 'Engraving', type: 'text' },
    { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'D', label: 'Diameter', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 }],
  snap: 'perp', mount: true, labelPos: [0, 7],
  bbox: p => [-p.L / 2, -p.D / 2 - 1, p.L / 2, p.D / 2 + 1],
  draw(p, S) {
    const L = p.L, R = p.D / 2;
    let s = H.rect(S, -L / 2, -R, L * 0.7, p.D, S.fill('dark'), 'rx="0.4"') + H.rect(S, L * 0.2, -R - 1, L * 0.3, p.D + 2, S.fill('dark'), 'rx="0.6"');
    s += `<path d="${H.lensPath('biconvex', R * 0.8, 1)}" transform="translate(${n(L * 0.42)} 0)" fill="${S.fill('glass')}" ${H.stroke(S, 0.6)}/>`;
    return s + (p.mag ? label(S, -L * 0.15, 0, p.mag, Math.min(R * 0.8, S.fs * 0.8)) : '');
  },
  optics: p => [{ kind: 'lens', a: [0, -p.D / 2 * 0.8], b: [0, p.D / 2 * 0.8], f: p.f }],
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2, p.L * 0.2], r: [p.D / 2, p.D / 2], mat: 'dark' }, { kind: 'cyl', x: [p.L * 0.2, p.L / 2], r: [p.D / 2 + 1, p.D / 2 + 1], mat: 'dark' }],
});
lib.register({
  type: 'cameralens', name: 'Camera lens', abbr: 'CL', category: IM,
  keywords: 'camera lens objective imaging lens c-mount machine vision zoom telecentric',
  defaults: { L: 9, D: 7, f: 50, text: 'f = 50 mm' },
  params: [{ key: 'f', label: 'Focal length', type: 'number', unit: 'mm', min: 1, max: 2000, step: 1 }, { key: 'text', label: 'Engraving', type: 'text' },
    { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'D', label: 'Diameter', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 }],
  variants: [{ name: 'Telecentric lens', props: { L: 16, D: 8, f: 100, text: 'telecentric' }, keywords: 'telecentric metrology' }],
  snap: 'perp', mount: true, labelPos: [0, 7.5],
  bbox: p => [-p.L / 2, -p.D / 2, p.L / 2, p.D / 2],
  draw(p, S) {
    const L = p.L, R = p.D / 2;
    let s = H.rect(S, -L / 2, -R, L, p.D, S.fill('dark'), 'rx="0.6"');
    for (const x of [-L * 0.2, L * 0.15]) for (let k = 0; k < 5; k++) s += H.line(S, x + k * 0.35, -R, x + k * 0.35, R, '', 0.35, S.shaded ? '#59616c' : S.ink);
    s += `<path d="M ${n(-L / 2)} ${n(-R * 0.7)} Q ${n(-L / 2 - 0.8)} 0 ${n(-L / 2)} ${n(R * 0.7)}" fill="${S.fill('glass')}" ${H.stroke(S, 0.6)}/>`;
    return s + (p.text ? `<text x="${n(L * 0.32)}" y="0" font-family="${U.esc(S.font)}" font-size="${n(Math.min(R * 0.55, S.fs * 0.6))}" fill="${S.shaded ? '#e8ecf2' : S.ink}" text-anchor="middle" dominant-baseline="central" transform="rotate(-90 ${n(L * 0.32)} 0)">${RNBX.text.markup(p.text)}</text>` : '');
  },
  optics: p => [{ kind: 'lens', a: [0, -p.D / 2 * 0.8], b: [0, p.D / 2 * 0.8], f: p.f }],
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2, p.L / 2], r: [p.D / 2, p.D / 2], mat: 'dark' }],
});
lib.register({
  type: 'intsphere', name: 'Integrating sphere', abbr: 'IS', category: 'Detectors',
  keywords: 'integrating sphere total reflectance transmittance diffuse uniform illumination power',
  defaults: { r: 6, ports: 2 },
  params: [{ key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 2, max: 40, step: 0.5 }, { key: 'ports', label: 'Extra ports', type: 'number', min: 0, max: 3, step: 1 }],
  snap: 'perp', labelPos: [0, 9],
  bbox: p => [-0.8, -p.r - 1, 2 * p.r + 1.4, p.r + 1],
  draw(p, S, obj) {
    const r = p.r, id = 'rbx-is-' + (obj ? obj.id : 'x');
    let s = `<defs><radialGradient id="${id}" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${S.shaded ? '#9aa3ad' : '#e6e9ed'}"/></radialGradient></defs>`;
    s += `<circle cx="${n(r + 0.6)}" cy="0" r="${n(r)}" fill="url(#${id})" ${H.stroke(S)}/>`;
    s += H.rect(S, -0.6, -1, 1.6, 2, S.fill('metal'));                       // entrance port
    const ang = [-60, 60, 180].slice(0, p.ports);
    ang.forEach(a => { const t = U.rad(a), x = r + 0.6 + Math.cos(t) * r, y = Math.sin(t) * r; s += `<g transform="translate(${n(x)} ${n(y)}) rotate(${a})">${H.rect(S, -0.2, -0.9, 1.4, 1.8, S.fill('metal'))}</g>`; });
    return s;
  },
  optics: () => [{ kind: 'absorb', a: [0, -1], b: [0, 1] }],
  // a sphere built from cone slices along the axis
  solid: (p) => { const N = 10, out = []; for (let i = 0; i < N; i++) { const a = Math.PI * i / N, b = Math.PI * (i + 1) / N; out.push({ kind: 'cyl', x: [0.6 + p.r * (1 - Math.cos(a)), 0.6 + p.r * (1 - Math.cos(b))], r: [Math.max(0.05, p.r * Math.sin(a)), Math.max(0.05, p.r * Math.sin(b))], mat: 'body' }); } return out; },
});

/* ================= Electromagnet ================= */
/* Front view of a laboratory electromagnet: two coils on a frame with pole
   pieces facing a central gap where the sample sits (origin = gap centre). */
lib.register({
  type: 'emagnet', name: 'Electromagnet (pole pieces)', abbr: 'EM', category: 'Samples & mechanics', autoLabel: false,
  keywords: 'electromagnet magnet coil pole pieces magnetic field magneto optic faraday kerr zeeman gap yoke helmholtz',
  defaults: { gap: 3, coilL: 12, coilR: 6, color: '#3b67b8', pole: 'cone', stand: true, field: false, fieldColor: '#d6336c' },
  params: [{ key: 'gap', label: 'Gap between the poles', type: 'number', unit: 'mm', min: 0.5, max: 60, step: 0.5, animatable: true },
    { key: 'pole', label: 'Pole pieces', type: 'select', options: [['cone', 'Tapered (cone)'], ['flat', 'Flat'], ['none', 'None (bare coils)']] },
    { key: 'coilL', label: 'Coil length', type: 'number', unit: 'mm', min: 3, max: 80, step: 0.5 },
    { key: 'coilR', label: 'Coil radius', type: 'number', unit: 'mm', min: 1.5, max: 40, step: 0.5 },
    { key: 'color', label: 'Coil colour', type: 'color' },
    { key: 'stand', label: 'Frame and base plate', type: 'bool' },
    { key: 'field', label: 'Field lines across the gap', type: 'bool' }, { key: 'fieldColor', label: 'Field-line colour', type: 'color', show: p => p.field }],
  variants: [{ name: 'Helmholtz coil pair', props: { pole: 'none', gap: 12, coilL: 3, coilR: 9, stand: true, color: '#c7782e' }, keywords: 'helmholtz coils pair uniform field' }],
  hint: 'Put the sample at the centre of the gap. Connect a power supply with the Electrical connection tool.',
  labelPos: [0, 13],
  geo: p => { const lc = p.pole === 'none' ? 0 : p.pole === 'flat' ? 1.2 : Math.max(2, p.coilR * 0.7); const x1 = p.gap / 2 + lc, x2 = x1 + p.coilL; return { lc, x1, x2, xe: x2 + Math.max(1, p.coilR * 0.25), base: p.coilR + Math.max(3, p.coilR * 0.7) }; },
  bbox(p) { const g = this.geo(p); return [-g.xe - 1.5, -p.coilR - 0.9, g.xe + 1.5, p.stand ? g.base + 1.3 : p.coilR + 0.9]; },
  draw(p, S, obj) {
    const g = this.geo(p), R = p.coilR, id = 'rbx-em-' + (obj ? obj.id : 'x');
    const cyl = (x0, x1, r, fillId, extra = '') => `<rect x="${n(x0)}" y="${n(-r)}" width="${n(x1 - x0)}" height="${n(2 * r)}" fill="url(#${fillId})" ${H.stroke(S, 0.7)} ${extra}/>`;
    const grad = (gid, c) => `<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.darken(c, 0.25)}"/><stop offset="0.22" stop-color="${U.lighten(c, 0.35)}"/><stop offset="0.5" stop-color="${c}"/><stop offset="1" stop-color="${U.darken(c, 0.45)}"/></linearGradient>`;
    let s = `<defs>${grad(id + 'c', p.color)}${grad(id + 'm', '#b9bec6')}${grad(id + 'd', '#8a9099')}</defs>`;
    // frame and base
    if (p.stand) {
      const yb = g.base, tw = 1.3;
      s += H.rect(S, -g.xe - 1.5, yb, 2 * g.xe + 3, tw, `url(#${id}m)`, 'rx="0.4"');
      [-1, 1].forEach(k => { const xc = k * (g.x1 + g.x2) / 2; s += H.rect(S, xc - 0.7, R, 1.4, yb - R, `url(#${id}d)`); });
      s += H.rect(S, -g.x2, R + 0.8, 2 * g.x2, 0.9, `url(#${id}d)`, 'rx="0.3"');
      s += H.rect(S, -1.1, R + 0.8, 2.2, yb - R - 0.8, `url(#${id}m)`);
      [-0.45, 0.45].forEach(x => { s += `<circle cx="${n(x)}" cy="${n(yb - 0.9)}" r="0.32" fill="#2b2f36"/>`; });
    }
    [-1, 1].forEach(k => {
      const sx = v => k * v;
      // back cap, coil with flanges, pole piece
      const a = Math.min(sx(g.x2), sx(g.xe)), b = Math.max(sx(g.x2), sx(g.xe));
      s += cyl(a, b, R * 0.42, id + 'm');
      const c0 = Math.min(sx(g.x1), sx(g.x2)), c1 = Math.max(sx(g.x1), sx(g.x2));
      s += cyl(c0, c1, R, id + 'c');
      for (let i = 1; i < 6; i++) { const x = c0 + (c1 - c0) * i / 6; s += H.line(S, x, -R, x, R, '', 0.3, U.darken(p.color, 0.3)); }
      [c0, c1 - 0.7].forEach(x => { s += `<rect x="${n(x)}" y="${n(-R - 0.6)}" width="0.7" height="${n(2 * R + 1.2)}" rx="0.2" fill="url(#${id}m)" ${H.stroke(S, 0.5)}/>`; });
      if (p.pole !== 'none') {
        const tip = p.pole === 'flat' ? R * 0.55 : Math.max(0.35, R * 0.12), base = R * 0.62;
        s += `<path d="M ${n(sx(g.x1))} ${n(-base)} L ${n(sx(p.gap / 2))} ${n(-tip)} L ${n(sx(p.gap / 2))} ${n(tip)} L ${n(sx(g.x1))} ${n(base)} Z" fill="url(#${id}m)" ${H.stroke(S, 0.6)}/>`;
      }
    });
    if (p.field && p.gap > 0.6) {
      let d = '';
      for (let i = -2; i <= 2; i++) { const y = i * Math.min(R * 0.12, p.gap * 0.25); d += `M ${n(-p.gap / 2 + 0.15)} ${n(y)} Q 0 ${n(y * 1.25)} ${n(p.gap / 2 - 0.15)} ${n(y)} `; }
      s += `<path d="${d}" fill="none" stroke="${p.fieldColor}" stroke-width="${n(S.lw * 0.8)}" stroke-dasharray="${n(S.lw * 2)} ${n(S.lw * 1.4)}"/>` + H.arrowHead(p.gap / 2 - 0.1, 0, 0, Math.min(1, p.gap * 0.3), p.fieldColor);
    }
    return s;
  },
  optics: () => [],
  solid(p, bh) {
    const g = this.geo(p), R = p.coilR, z = R + 1.6, out = [];
    [-1, 1].forEach(k => {
      const lo = (a, b) => [Math.min(k * a, k * b), Math.max(k * a, k * b)];
      out.push({ kind: 'cyl', x: lo(g.x1, g.x2), r: [R, R], mat: { color: p.color }, cz: z });
      out.push({ kind: 'cyl', x: lo(g.x2, g.xe), r: [R * 0.42, R * 0.42], mat: 'metal', cz: z });
      if (p.pole !== 'none') { const tip = p.pole === 'flat' ? R * 0.55 : Math.max(0.35, R * 0.12); out.push({ kind: 'cyl', x: lo(p.gap / 2, g.x1), r: k > 0 ? [tip, R * 0.62] : [R * 0.62, tip], mat: 'metal', cz: z }); }
    });
    if (p.stand) out.push({ kind: 'box', x: [-g.xe, g.xe], y: [-R * 0.8, R * 0.8], z: [0, 0.9], mat: 'metal' });
    return out;
  },
  noPost: true,
});

/* ================= Cage plate in perspective, cage rods ================= */
/* A cage plate seen at an angle (for exploded-view illustrations of cage
   systems): the beam runs along the part's own axis through the hole, so
   with the part turned 90° it reads as a plate lying across a vertical beam. */
lib.register({
  type: 'cageplate3d', name: 'Cage plate (perspective)', abbr: 'CP', category: OM,
  keywords: 'cage plate perspective exploded view 3d mount lens tube adapter sma fibre adapter filter holder rounded square plate',
  defaults: { s: 14, insert: 'lens', f: 100, r: 0.6, color: '#3a3f47', glass: '#cfe6f2', center: 532, width: 20, beamWidth: 0.4, divergence: 6 },
  params: [{ key: 'insert', label: 'Holds', type: 'select', options: [['lens', 'Lens'], ['filter', 'Filter'], ['iris', 'Iris'], ['fiber', 'Fibre adapter (cable comes in)'], ['empty', 'Nothing (open hole)']] },
    { key: 'f', label: 'Focal length', type: 'number', unit: 'mm', min: -5000, max: 5000, step: 1, show: p => p.insert === 'lens' },
    { key: 'center', label: 'Filter centre', type: 'wavelength', unit: 'nm', min: 150, max: 5000, step: 1, show: p => p.insert === 'filter' },
    { key: 'width', label: 'Filter bandwidth', type: 'number', unit: 'nm', min: 0.5, max: 2000, step: 0.5, show: p => p.insert === 'filter' },
    { key: 'r', label: 'Iris opening (drawn radius)', type: 'number', unit: 'mm', min: 0.05, max: 20, step: 0.05, show: p => p.insert === 'iris' },
    { key: 'divergence', label: 'Light leaving the fibre: divergence', type: 'number', unit: '°', min: 0, max: 45, step: 0.5, show: p => p.insert === 'fiber' },
    { key: 'beamWidth', label: 'Beam diameter at the fibre (drawn)', type: 'number', unit: 'mm', min: 0.02, max: 10, step: 0.02, show: p => p.insert === 'fiber' },
    { key: 's', label: 'Plate size', type: 'number', unit: 'mm', min: 4, max: 60, step: 0.5 },
    { key: 'color', label: 'Plate colour', type: 'color' }, { key: 'glass', label: 'Glass colour', type: 'color', show: p => p.insert === 'lens' || p.insert === 'filter' }],
  variants: [{ name: 'Cage plate with fibre adapter (perspective)', props: { insert: 'fiber' } }, { name: 'Cage plate with filter (perspective)', props: { insert: 'filter', glass: '#9ad0e6' } }],
  snap: 'perp', mount: true, labelPos: [0, 9],
  hint: 'With a fibre adapter it is a fibre end: connect a fibre-output laser (or a coupler) to it with the Fibre tool, and the light leaves along the cage axis.',
  // with a fibre adapter the plate is a fibre end: the cable enters at the top of the adapter, the light leaves along +x
  fiberPort: p => (p.insert === 'fiber' ? [-p.s * 0.42 - 0.4, 0] : [0, 0]),
  fiberDir: () => [-1, 0],
  fiberOk: p => p.insert === 'fiber',
  port: () => ({ o: [0.2, 0], d: [1, 0] }),
  bbox: p => [-p.s * 0.2 - (p.insert === 'fiber' ? p.s * 0.45 : 0), -p.s / 2, p.s * 0.2 + p.s * 0.12, p.s / 2],
  draw(p, S) {
    const s = p.s, k = 0.3, t = s * 0.12, rr = s * 0.18, c = p.color;
    // rounded square squashed along x (seen at an angle), extruded by t along +x
    const face = dx => { const a = s / 2, ry = rr, rx = rr * k, ax = a * k; return `M ${n(dx - ax + rx)} ${n(-a)} L ${n(dx + ax - rx)} ${n(-a)} Q ${n(dx + ax)} ${n(-a)} ${n(dx + ax)} ${n(-a + ry)} L ${n(dx + ax)} ${n(a - ry)} Q ${n(dx + ax)} ${n(a)} ${n(dx + ax - rx)} ${n(a)} L ${n(dx - ax + rx)} ${n(a)} Q ${n(dx - ax)} ${n(a)} ${n(dx - ax)} ${n(a - ry)} L ${n(dx - ax)} ${n(-a + ry)} Q ${n(dx - ax)} ${n(-a)} ${n(dx - ax + rx)} ${n(-a)} Z`; };
    const edge = `stroke="${U.darken(c, 0.5)}" stroke-width="${n(S.lw * 0.6)}" stroke-linejoin="round"`;
    let q = `<path d="${face(t)}" fill="${U.darken(c, 0.25)}" ${edge}/>`;
    q += `<rect x="${n(-s / 2 * k + 0.01)}" y="${n(-s / 2 + rr)}" width="${n(t)}" height="${n(s - 2 * rr)}" fill="${U.darken(c, 0.25)}"/>`;
    q += `<path d="${face(0)}" fill="${c}" ${edge}/>`;
    q += `<path d="${face(0)}" fill="none" stroke="${U.lighten(c, 0.35)}" stroke-width="${n(S.lw * 1.2)}" transform="translate(${n(-0.15)} 0) scale(0.97 0.97)"/>`;
    const hr = s * 0.3, hx = hr * k;
    q += `<ellipse cx="0" cy="0" rx="${n(hx)}" ry="${n(hr)}" fill="${U.darken(c, 0.55)}" ${edge}/>`;
    if (p.insert === 'lens' || p.insert === 'filter') {
      q += `<ellipse cx="0" cy="0" rx="${n(hx * 0.92)}" ry="${n(hr * 0.92)}" fill="${p.glass}" fill-opacity="${p.insert === 'lens' ? 0.9 : 0.85}" stroke="${U.darken(p.glass, 0.3)}" stroke-width="${n(S.lw * 0.5)}"/>`;
      for (let i = 1; i <= 3; i++) q += `<ellipse cx="0" cy="0" rx="${n(hx * 0.92 * i / 4)}" ry="${n(hr * 0.92 * i / 4)}" fill="none" stroke="#ffffff" stroke-opacity="${p.insert === 'lens' ? 0.6 : 0.25}" stroke-width="${n(S.lw * 0.6)}"/>`;
    } else if (p.insert === 'iris') {
      q += `<ellipse cx="0" cy="0" rx="${n(hx * 0.92)}" ry="${n(hr * 0.92)}" fill="#1d1f23"/><ellipse cx="0" cy="0" rx="${n(Math.min(hx * 0.9, p.r * k))}" ry="${n(Math.min(hr * 0.9, p.r))}" fill="#ffffff"/>`;
    } else if (p.insert === 'fiber') {
      // SMA-style adapter with a knurled collar and the boot of the incoming cable
      const cr = hr * 0.55, top = -s * 0.42;
      q += `<rect x="${n(top * 0.35)}" y="${n(-cr)}" width="${n(-top * 0.35)}" height="${n(2 * cr)}" fill="${U.darken(c, 0.15)}" ${edge}/>`;
      for (let i = 1; i < 6; i++) q += H.line(S, top * 0.35 * i / 6, -cr, top * 0.35 * i / 6, cr, '', 0.3, U.lighten(c, 0.3));
      q += `<ellipse cx="${n(top * 0.35)}" cy="0" rx="${n(cr * k)}" ry="${n(cr)}" fill="${U.lighten(c, 0.15)}" ${edge}/>`;
      q += `<path d="M ${n(top * 0.35)} ${n(-cr * 0.45)} C ${n(top * 0.6)} ${n(-cr * 0.55)} ${n(top)} ${n(-cr * 0.4)} ${n(top - 0.4)} 0 C ${n(top)} ${n(cr * 0.4)} ${n(top * 0.6)} ${n(cr * 0.55)} ${n(top * 0.35)} ${n(cr * 0.45)} Z" fill="#16181c"/>`;
    }
    return q;
  },
  optics: p => {
    const h = p.s * 0.28;
    if (p.insert === 'lens') return [{ kind: 'lens', a: [0, -h], b: [0, h], f: p.f }];
    if (p.insert === 'filter') return [{ kind: 'filter', a: [0, -h], b: [0, h], mode: 'bandpass', center: p.center, width: p.width, T: 0.95 }];
    if (p.insert === 'iris') return [{ kind: 'aperture', a: [0, -h], b: [0, h], r: p.r }];
    if (p.insert === 'fiber') return [{ kind: 'fiberIn', a: [-0.2, -h * 0.5], b: [-0.2, h * 0.5] }];
    return [{ kind: 'pass', a: [0, -h], b: [0, h] }];
  },
  solid: (p, bh) => [anodBox(-p.s * 0.06, p.s * 0.06, -p.s / 2, p.s / 2, bh - p.s / 2, bh + p.s / 2)],
});
lib.register({
  type: 'cagerods', name: 'Cage rods', abbr: '', category: OM, autoLabel: false,
  keywords: 'cage rods steel rods cage system 4 rods posts vertical assembly',
  defaults: { L: 40, gap: 8, r: 0.35 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 2, max: 400, step: 0.5 }, { key: 'gap', label: 'Rod spacing', type: 'number', unit: 'mm', min: 1, max: 80, step: 0.5 }, { key: 'r', label: 'Rod radius', type: 'number', unit: 'mm', min: 0.05, max: 5, step: 0.05 }],
  hint: 'Two rods along the part’s axis: rotate by 90° for a vertical cage, then stack cage plates and cubes along it.',
  bbox: p => [-p.L / 2, -p.gap / 2 - p.r, p.L / 2, p.gap / 2 + p.r],
  draw(p, S, obj) {
    const id = 'rbx-rod-' + (obj ? obj.id : 'x');
    let q = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d939c"/><stop offset="0.4" stop-color="#f4f6f8"/><stop offset="1" stop-color="#7d838c"/></linearGradient></defs>`;
    [-1, 1].forEach(k => { q += `<rect x="${n(-p.L / 2)}" y="${n(k * p.gap / 2 - p.r)}" width="${n(p.L)}" height="${n(2 * p.r)}" rx="${n(p.r)}" fill="${S.shaded ? `url(#${id})` : '#e5e7eb'}" ${H.stroke(S, 0.5)}/>`; });
    return q;
  },
  optics: () => [],
  solid: p => [-1, 1].map(k => ({ kind: 'cyl', x: [-p.L / 2, p.L / 2], r: [p.r, p.r], cy: k * p.gap / 2, mat: 'metal' })),
  noPost: true,
});

/* ================= Hot plate / heating stage ================= */
lib.register({
  type: 'hotplate', name: 'Hot plate / heating stage', abbr: 'HP', category: 'Samples & mechanics',
  keywords: 'hot plate hotplate heating stage heater stirrer temperature thermal sample heating',
  defaults: { w: 26, h: 9, body: '#344a7a', top: '#e4e6ea', plate: '#f4f4f2', disc: true, sample: true, sampleColor: '#5fae63', text: '150 °C', displayColor: '#1b0f12', textColor: '#ff5b4f', knob: '#2b2f36' },
  params: [{ key: 'text', label: 'Display', type: 'text', placeholder: 'e.g. 150 °C' },
    { key: 'disc', label: 'Round heating plate', type: 'bool' }, { key: 'sample', label: 'Sample on top', type: 'bool' }, { key: 'sampleColor', label: 'Sample colour', type: 'color', show: p => p.sample },
    { key: 'body', label: 'Body colour', type: 'color' }, { key: 'top', label: 'Top colour', type: 'color' }, { key: 'plate', label: 'Plate colour', type: 'color', show: p => p.disc },
    { key: 'displayColor', label: 'Display colour', type: 'color' }, { key: 'textColor', label: 'Display text colour', type: 'color' }, { key: 'knob', label: 'Knob colour', type: 'color' },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 6, max: 120, step: 0.5 }, { key: 'h', label: 'Body height', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 }],
  hint: 'Light from above stops on the sample (or the plate); use it under a probe, objective or fibre.',
  labelPos: [0, 9],
  geo: p => { const d = p.w * 0.36, top = -p.h / 2, py = top - d * 0.25, ph = Math.max(0.8, p.h * 0.2); return { d, top, py, ph, sy: p.disc ? py - ph : top - d * 0.25 }; },
  bbox(p) { const g = this.geo(p); return [-p.w / 2, g.sy - (p.sample ? 1.2 : 0) - g.d * 0.12, p.w / 2 + g.d * 0.35, p.h / 2]; },
  draw(p, S) {
    const w = p.w, h = p.h, g = this.geo(p), d = g.d, ox = d * 0.35, oy = d * 0.5;
    const edge = c => `stroke="${U.darken(c, 0.45)}" stroke-width="${n(S.lw * 0.6)}" stroke-linejoin="round"`;
    // top face (seen from above), front and side faces
    let q = `<path d="M ${n(-w / 2)} ${n(g.top)} L ${n(-w / 2 + ox)} ${n(g.top - oy)} L ${n(w / 2 + ox)} ${n(g.top - oy)} L ${n(w / 2)} ${n(g.top)} Z" fill="${p.top}" ${edge(p.top)}/>`;
    q += `<path d="M ${n(w / 2)} ${n(g.top)} L ${n(w / 2 + ox)} ${n(g.top - oy)} L ${n(w / 2 + ox)} ${n(h / 2 - oy)} L ${n(w / 2)} ${n(h / 2)} Z" fill="${U.darken(p.body, 0.25)}" ${edge(p.body)}/>`;
    q += `<rect x="${n(-w / 2)}" y="${n(g.top)}" width="${n(w)}" height="${n(h)}" fill="${p.body}" ${edge(p.body)}/>`;
    if (S.shaded) q += `<rect x="${n(-w / 2)}" y="${n(g.top)}" width="${n(w)}" height="${n(h * 0.4)}" fill="#ffffff" fill-opacity="0.1"/>`;
    // display and knob on the front
    const dw = w * 0.28, dh = h * 0.5;
    q += `<rect x="${n(-w / 2 + w * 0.06)}" y="${n(-dh / 2)}" width="${n(dw)}" height="${n(dh)}" rx="0.3" fill="${p.displayColor}" stroke="#000" stroke-width="${n(S.lw * 0.4)}"/>`;
    if (p.text) q += `<text x="${n(-w / 2 + w * 0.06 + dw / 2)}" y="0" font-family="${U.esc(S.font)}" font-size="${n(Math.min(dh * 0.55, dw / Math.max(3, p.text.length) * 1.8))}" fill="${p.textColor}" text-anchor="middle" dominant-baseline="central" font-weight="700">${U.esc(p.text)}</text>`;
    q += `<ellipse cx="${n(w * 0.22)}" cy="0" rx="${n(h * 0.22)}" ry="${n(h * 0.16)}" fill="${p.knob}" stroke="#000" stroke-width="${n(S.lw * 0.4)}"/>`;
    // round heating plate and sample
    const cx = ox / 2, cy = g.top - oy / 2, rx = w * 0.3, ry = rx * 0.32;
    if (p.disc) {
      q += `<path d="M ${n(cx - rx)} ${n(cy)} L ${n(cx - rx)} ${n(cy - g.ph)} A ${n(rx)} ${n(ry)} 0 0 1 ${n(cx + rx)} ${n(cy - g.ph)} L ${n(cx + rx)} ${n(cy)} A ${n(rx)} ${n(ry)} 0 0 1 ${n(cx - rx)} ${n(cy)} Z" fill="${U.darken(p.plate, 0.25)}" ${edge(p.plate)}/>`;
      q += `<ellipse cx="${n(cx)}" cy="${n(cy - g.ph)}" rx="${n(rx)}" ry="${n(ry)}" fill="${p.plate}" ${edge(p.plate)}/>`;
    }
    if (p.sample) {
      const sz = w * 0.13, sy0 = cy - (p.disc ? g.ph : 0), t = Math.max(0.35, h * 0.06);
      const pts = [[cx - sz, sy0], [cx, sy0 - sz * 0.32], [cx + sz, sy0], [cx, sy0 + sz * 0.32]];
      q += `<path d="M ${n(pts[0][0])} ${n(pts[0][1])} L ${n(pts[3][0])} ${n(pts[3][1])} L ${n(pts[2][0])} ${n(pts[2][1])} L ${n(pts[2][0])} ${n(pts[2][1] - t)} L ${n(pts[0][0])} ${n(pts[0][1] - t)} Z" fill="${U.darken(p.sampleColor, 0.35)}"/>`;
      q += `<path d="M ${pts.map(v => n(v[0]) + ' ' + n(v[1] - t)).join(' L ')} Z" fill="${p.sampleColor}" ${edge(p.sampleColor)}/>`;
    }
    return q;
  },
  optics(p) {
    // light from above stops on the sample (or the plate) surface
    const g = this.geo(p), cx = g.d * 0.35 / 2, cy = g.top - g.d * 0.5 / 2, y = cy - (p.disc ? g.ph : 0) - (p.sample ? Math.max(0.35, p.h * 0.06) : 0), r = p.sample ? p.w * 0.13 : p.w * 0.3;
    return [{ kind: 'absorb', a: [cx - r, y], b: [cx + r, y] }].concat(H.boxAbsorb(-p.w / 2, g.top, p.w / 2, p.h / 2));
  },
  solid: (p, bh) => [{ kind: 'box', x: [-p.w / 2, p.w / 2], y: [-p.w * 0.3, p.w * 0.3], z: [0, p.h], mat: { color: p.body } }, { kind: 'vcyl', cx: 0, cy: 0, r: p.w * 0.3, z: [p.h, p.h + 1], mat: { color: p.plate } }],
  noPost: true,
});

/* ================= Fibre-optic devices ================= */
const pigtail = (S, x0, y0, x1, y1) => `<path d="M ${n(x0)} ${n(y0)} L ${n(x1)} ${n(y1)}" stroke="${S.shaded ? '#f2b33d' : '#e0a030'}" stroke-width="${n(Math.max(0.35, S.lw * 2.2))}" stroke-linecap="round"/>`;
lib.register({
  type: 'circulator', name: 'Fibre circulator', abbr: 'CIR', category: 'Fibre optics',
  keywords: 'circulator fibre fiber optical circulator three port reflection isolate back reflected',
  defaults: { L: 9, H: 6, T: 0.9 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'T', label: 'Transmission per pass', type: 'range', min: 0, max: 1, step: 0.01 }],
  hint: 'Port 1 (left) → port 2 (right). Light coming back into port 2 leaves at port 3 (bottom), e.g. the reflection from a fibre Bragg grating or a sample.',
  snap: 'perp', mount: true, labelPos: [0, -6],
  bbox: p => [-p.L / 2 - 1.4, -p.H / 2, p.L / 2 + 1.4, p.H / 2 + 1.6],
  draw(p, S) {
    const L = p.L, h = p.H / 2, r = Math.min(L, p.H) * 0.26;
    let s = pigtail(S, -L / 2 - 1.4, 0, -L / 2, 0) + pigtail(S, L / 2, 0, L / 2 + 1.4, 0) + pigtail(S, 0, h, 0, h + 1.6);
    s += H.rect(S, -L / 2, -h, L, p.H, S.fill('dark'), 'rx="0.7"') + H.sheen(S, -L / 2, -h, L, h * 0.9, 0.7);
    const ink = S.shaded ? '#eef1f5' : '#ffffff';
    s += `<path d="M ${n(r)} ${n(-r * 0.15)} A ${n(r)} ${n(r)} 0 1 0 ${n(r * 0.2)} ${n(r * 0.98)}" fill="none" ${H.stroke(S, 0.9, ink)}/>` + H.arrowHead(r * 0.2, r * 0.98, Math.PI * 0.95, 0.9, ink);
    const fs = Math.min(1.3, h * 0.42), lab = (x, y, t) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(fs)}" fill="${ink}" text-anchor="middle" dominant-baseline="central">${t}</text>`;
    return s + lab(-L / 2 + fs * 0.8, -h + fs * 0.9, '1') + lab(L / 2 - fs * 0.8, -h + fs * 0.9, '2') + lab(fs * 1.4, h - fs * 0.8, '3');
  },
  optics: p => [{ kind: 'circulator', a: [0, -p.H / 2], b: [0, p.H / 2], T: p.T, port3: [0, p.H / 2 + 1.7] }],
  solid: (p, bh) => [anodBox(-p.L / 2, p.L / 2, -p.H / 2, p.H / 2, bh - p.H / 2, bh + p.H / 2)],
});
lib.register({
  type: 'fibersplit', name: 'Fibre splitter / WDM', abbr: 'FS', category: 'Fibre optics',
  keywords: 'fibre fiber coupler splitter 50 50 tap wdm wavelength division multiplexer combiner 2x2',
  defaults: { L: 10, H: 5, mode: 'split', R: 0.5, edge: 1000, pass: 'longpass' },
  params: [{ key: 'mode', label: 'Type', type: 'select', options: [['split', 'Power splitter'], ['wdm', 'WDM (by wavelength)']] },
    { key: 'R', label: 'Ratio to the side port', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.mode === 'split', hint: '0.5 = 50:50, 0.01 = 99:1 tap' },
    { key: 'edge', label: 'Crossover wavelength', type: 'wavelength', unit: 'nm', min: 200, max: 5000, step: 1, show: p => p.mode === 'wdm' },
    { key: 'pass', label: 'Straight through', type: 'select', options: [['longpass', 'Longer wavelengths'], ['shortpass', 'Shorter wavelengths']], show: p => p.mode === 'wdm' },
    { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 40, step: 0.5 }, { key: 'H', label: 'Height', type: 'number', unit: 'mm', min: 2, max: 30, step: 0.5 }],
  variants: [{ name: 'Fibre WDM', abbr: 'WDM', props: { mode: 'wdm', edge: 1000 }, keywords: 'wdm 980 1550 pump combiner' }],
  hint: 'Straight-through port on the right; the side port leaves upwards.',
  snap: 'perp', mount: true, labelPos: [0, 6],
  bbox: p => [-p.L / 2 - 1.4, -p.H / 2 - 1.6, p.L / 2 + 1.4, p.H / 2],
  draw(p, S) {
    const L = p.L, h = p.H / 2;
    let s = pigtail(S, -L / 2 - 1.4, 0, -L / 2, 0) + pigtail(S, L / 2, 0, L / 2 + 1.4, 0) + pigtail(S, 0, -h, 0, -h - 1.6);
    s += H.rect(S, -L / 2, -h, L, p.H, S.fill('metal'), 'rx="0.6"') + H.sheen(S, -L / 2, -h, L, h * 0.9, 0.6);
    // two fibre cores that come close in the middle (fused coupler)
    s += `<path d="M ${n(-L * 0.42)} 0 C ${n(-L * 0.1)} 0 ${n(-L * 0.1)} ${n(-h * 0.1)} 0 ${n(-h * 0.1)} C ${n(L * 0.1)} ${n(-h * 0.1)} ${n(L * 0.12)} 0 ${n(L * 0.42)} 0 M ${n(-L * 0.1)} ${n(-h * 0.25)} C 0 ${n(-h * 0.25)} 0 ${n(-h * 0.5)} 0 ${n(-h * 0.92)}" fill="none" stroke="${p.mode === 'wdm' ? U.wavelengthColor(p.edge > 780 ? 700 : p.edge) : '#3c6e9e'}" stroke-width="${n(S.lw * 1.4)}"/>`;
    return s;
  },
  optics: p => {
    const k = Math.min(p.L, p.H) * 0.45;
    return [p.mode === 'wdm' ? { kind: 'dichroic', a: [-k, k], b: [k, -k], edge: p.edge, mode: p.pass } : { kind: 'splitter', a: [-k, k], b: [k, -k], R: p.R }];
  },
  solid: (p, bh) => [{ kind: 'box', x: [-p.L / 2, p.L / 2], y: [-p.H / 2, p.H / 2], z: [bh - p.H / 2, bh + p.H / 2], mat: 'metal' }],
});

/* ================= Spatial filter (objective, pinhole, collimating lens) ================= */
lib.register({
  type: 'spatialfilter', name: 'Spatial filter assembly', abbr: 'SF', category: OM,
  keywords: 'spatial filter pinhole objective beam cleanup expander mode cleaning',
  defaults: { L: 26, D: 8, mag: 4, r: 0.12 },
  params: [{ key: 'mag', label: 'Expansion', type: 'number', unit: '×', min: 0.2, max: 20, step: 0.1, hint: 'output ÷ input diameter' },
    { key: 'r', label: 'Pinhole radius (drawn)', type: 'number', unit: 'mm', min: 0.02, max: 3, step: 0.01, hint: 'light beyond it is blocked' },
    { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 10, max: 120, step: 0.5 }, { key: 'D', label: 'Diameter', type: 'number', unit: 'mm', min: 3, max: 30, step: 0.5 }],
  snap: 'perp', mount: true, labelPos: [0, 7.5],
  bbox: p => [-p.L / 2, -p.D / 2 - 2, p.L / 2, p.D / 2 + 0.6],
  geo: (p, sc) => { const x1 = -p.L / 2 + 2.6, x2 = p.L / 2 - 1.2, sep = (x2 - x1) * sc, f1 = sep / (1 + p.mag); return { x1, x2, xp: x1 + f1 / sc, f1, f2: sep - f1 }; },
  draw(p, S) {
    const L = p.L, R = p.D / 2, g = lib.get('spatialfilter').geo(p, (S.doc && S.doc.style.scale) || 10);
    let s = '';
    // objective body, pinhole mount with two micrometers, tube to the output lens
    s += `<path d="M ${n(-L / 2)} ${n(-R * 0.6)} L ${n(g.x1 - 0.6)} ${n(-R * 0.6)} L ${n(g.x1)} ${n(-R * 0.35)} L ${n(g.x1)} ${n(R * 0.35)} L ${n(g.x1 - 0.6)} ${n(R * 0.6)} L ${n(-L / 2)} ${n(R * 0.6)} Z" fill="${S.fill('metal')}" ${H.stroke(S)}/>`;
    s += H.rect(S, g.x1, -R * 0.35, g.xp - g.x1 - 0.5, R * 0.7, S.shaded ? 'url(#rbx-metal)' : '#eef0f2');
    s += H.rect(S, g.xp - 0.5, -R - 0.6, 1, p.D + 1.2, S.fill('anod'), 'rx="0.3"') + knob(S, g.xp, -R - 1.3, 0.6);
    s += H.rect(S, g.xp + 0.5, -R, g.x2 - g.xp + 0.7, p.D, S.shaded ? 'url(#rbx-metal)' : '#eef0f2', 'rx="0.4"');
    s += `<path d="${H.lensPath('planoconvex', R * 0.85, 1.1)}" transform="translate(${n(g.x2)} 0) scale(-1 1)" fill="${S.fill('glass')}" ${H.stroke(S, 0.7)}/>`;
    return s;
  },
  optics: (p, obj, doc) => {
    const sc = (doc && doc.style.scale) || 10, g = lib.get('spatialfilter').geo(p, sc), R = p.D / 2 * 0.8;
    return [{ kind: 'lens', a: [g.x1, -R * 0.4], b: [g.x1, R * 0.4], f: g.f1 }, { kind: 'aperture', a: [g.xp, -R], b: [g.xp, R], r: p.r }, { kind: 'lens', a: [g.x2, -R], b: [g.x2, R], f: g.f2 }];
  },
  solid: (p, bh) => [{ kind: 'cyl', x: [-p.L / 2, -p.L / 2 + 2.6], r: [p.D * 0.3, p.D * 0.18], mat: 'metal' }, { kind: 'cyl', x: [-p.L / 2 + 2.6, p.L / 2], r: [p.D / 2, p.D / 2], mat: 'metal' }],
});

/* ================= more types of existing parts (variants) ================= */
const addVariants = (type, list) => { const d = lib.get(type); if (d) d.variants = (d.variants || []).concat(list); };
addVariants('laser', [
  { name: 'Tunable laser', props: { lambda: 1550, text: 'tunable', L: 18, H: 7, body: 'tunable' }, keywords: 'tunable laser external cavity telecom swept' },
  { name: 'Fibre laser', props: { lambda: 1064, text: 'fibre', L: 16, H: 5, body: 'fibre' }, keywords: 'fiber fibre laser ytterbium erbium' },
  { name: 'Ti:sapphire laser', props: { lambda: 800, pulsed: true, text: 'Ti:Sa', L: 24, H: 8, body: 'ultrafast' }, keywords: 'ti sapphire titanium femtosecond oscillator' },
  { name: 'Quantum cascade laser (mid-IR)', props: { lambda: 4500, text: 'QCL', L: 12, H: 6, body: 'qcl' }, keywords: 'qcl quantum cascade mid infrared' },
  { name: 'Laser diode module', props: { lambda: 405, L: 7, H: 4, power: 50, body: 'diode' }, keywords: 'laser diode module pointer violet blue' },
]);
addVariants('lamp', [
  { name: 'Xenon arc lamp', props: { lmin: 380, lmax: 750, count: 9, L: 14, H: 10 }, keywords: 'xenon arc lamp solar simulator' },
  { name: 'Halogen lamp', props: { lmin: 450, lmax: 900, count: 9, L: 12, H: 8 }, keywords: 'halogen tungsten lamp fibre illuminator' },
]);
addVariants('led', [{ name: 'Collimated LED (mounted)', props: {}, category: IM, keywords: 'mounted collimated led illumination microscope' }]);
addVariants('mirror', [
  { name: 'D-shaped pick-off mirror', props: { d: 5, t: 1 }, keywords: 'd shaped pickoff pick-off mirror' },
  { name: 'Broadband dielectric mirror', props: { coating: 'silver' }, keywords: 'dielectric broadband laser line mirror' },
]);
addVariants('bsplate', [
  { name: 'Pellicle beam splitter', props: { t: 0.15, R: 0.08 }, keywords: 'pellicle membrane ghost free splitter' },
  { name: 'Wedged sampler (pick-off)', props: { t: 1.4, R: 0.04 }, keywords: 'beam sampler pickoff wedge' },
]);
addVariants('dichroic', [
  { name: 'Hot mirror', props: { mode: 'shortpass', edge: 720 }, keywords: 'hot mirror reflects infrared' },
  { name: 'Cold mirror', props: { mode: 'longpass', edge: 700 }, keywords: 'cold mirror reflects visible' },
]);
addVariants('pd', [{ name: 'Quadrant photodiode', props: { sensor: 'quad' }, keywords: 'quadrant position sensing detector qpd psd alignment' }, { name: 'Balanced photodetector', props: { s: 5.5, sensor: 'balanced' }, keywords: 'balanced detector differential' }]);
addVariants('camera', [{ name: 'Wavefront sensor', props: { L: 9, H: 9, front: 'lenslet' }, keywords: 'shack hartmann wavefront sensor lenslet' }, { name: 'Scientific camera', props: { L: 12, H: 10 }, category: IM, keywords: 'scmos emccd scientific camera imaging' }]);
addVariants('instrument', [
  { name: 'Lock-in amplifier', props: { text: 'Lock-in', icon: 'meter', w: 18, h: 9 }, keywords: 'lock in amplifier demodulator' },
  { name: 'Laser diode driver', props: { text: 'LD driver', icon: 'meter', w: 16, h: 8 }, keywords: 'laser diode driver current controller' },
  { name: 'Temperature controller', props: { text: 'TEC', icon: 'meter', w: 14, h: 8 }, keywords: 'temperature controller tec peltier' },
  { name: 'Photodiode amplifier', props: { text: 'TIA', w: 12, h: 7 }, keywords: 'transimpedance amplifier photodiode amplifier' },
  { name: 'Motion controller', props: { text: 'Motion ctrl', icon: 'meter', w: 16, h: 8 }, keywords: 'motion controller stepper piezo driver' },
  { name: 'Power supply', props: { text: 'PSU', icon: 'meter', w: 14, h: 8 }, keywords: 'power supply dc' },
  { name: 'Data acquisition (DAQ)', props: { text: 'DAQ', w: 14, h: 8 }, keywords: 'daq data acquisition adc' },
]);
['hwp', 'qwp', 'polarizer'].forEach(t => { const d = lib.get(t); if (d) addVariants(t, [{ name: d.name.replace(/ \(.*\)$/, '') + ' in rotation mount', props: { mounted: true }, category: OM, keywords: 'rotation mount graduated ' + (d.keywords || '') }]); });
})();
