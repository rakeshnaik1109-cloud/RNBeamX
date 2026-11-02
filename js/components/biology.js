/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/biology.js
   Biology & medicine: brain (lobes), neuron, animal and plant
   cells, bacteria, viruses, DNA, antibody, protein ribbon, blood
   cells, the eye (with light focusing on the retina), lab mouse
   and a human outline.

   Drawn as vector graphics from a few settings (colours, counts,
   a pattern seed), in the Schematic (flat colours, ink lines) or
   Shaded (gradients, highlights) style. Figure graphics: they do
   not take part in the ray tracing.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Biology & medicine';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);
const ann = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const idOf = (obj, p, tag) => 'rbx-bio-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const rnd = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const txt = (S, x, y, str, size, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size)}" fill="${o.color || S.ink}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central" ${o.bold ? 'font-weight="700"' : ''}>${RNBX.text.markup(String(str), size)}</text>`;
/* smooth closed curve through points (Catmull–Rom as cubic Béziers) */
const smooth = (pts, closed = true) => {
  const P = pts, N = P.length, at = i => P[closed ? (i + N) % N : U.clamp(i, 0, N - 1)];
  let d = `M ${n(P[0][0])} ${n(P[0][1])}`;
  for (let i = 0; i < (closed ? N : N - 1); i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += ` C ${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (closed ? ' Z' : '');
};
const rad = (S, col, id, cx = 0.38, cy = 0.32) => S.shaded ? `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.78"><stop offset="0" stop-color="${U.lighten(col, 0.45)}"/><stop offset="0.65" stop-color="${col}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.75)}"/></radialGradient>` : '';
const F = (S, col, id) => (S.shaded ? `url(#${id})` : col);
const E = (S, col) => (S.shaded ? U.shadeRgb(col, 0.55) : S.ink);
const LW = (S, k = 0.8) => n(S.lw * k);

/* ================= brain ================= */
const LOBES = [['frontal', 'Frontal lobe', '#f4a7a3'], ['parietal', 'Parietal lobe', '#f9d67a'], ['temporal', 'Temporal lobe', '#a3d9b1'], ['occipital', 'Occipital lobe', '#9cc6ec'], ['cerebellum', 'Cerebellum', '#c8b6e2'], ['stem', 'Brainstem', '#e0c3a3']];
const CEREBRUM = [[-0.98, 0.05], [-0.95, -0.3], [-0.75, -0.6], [-0.4, -0.76], [0.05, -0.79], [0.45, -0.69], [0.8, -0.46], [0.98, -0.12], [0.96, 0.15], [0.8, 0.3], [0.55, 0.3], [0.3, 0.36], [0.1, 0.48], [-0.15, 0.52], [-0.42, 0.45], [-0.56, 0.3], [-0.62, 0.22], [-0.8, 0.24], [-0.95, 0.18]];
const curve = (a, b, bend, k = 12) => Array.from({ length: k + 1 }, (_, i) => { const t = i / k, m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], nx = -(b[1] - a[1]), ny = b[0] - a[0]; return [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * (m[0] + nx * bend) + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * (m[1] + ny * bend) + t * t * b[1]]; });
ann({ type: 'brain', name: 'Brain (side view)', keywords: 'brain lobes cortex neuroscience frontal parietal temporal occipital cerebellum brainstem head',
  defaults: { w: 40, coloring: 'lobes', highlight: 'frontal', base: '#f2c4c0', gyri: 14, seed: 4, labels: false, colors: '' },
  params: [{ key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 6, max: 300, step: 0.5 },
    { key: 'coloring', label: 'Colours', type: 'select', options: [['lobes', 'Each lobe its own colour'], ['single', 'One colour'], ['highlight', 'Highlight one region']] },
    { key: 'highlight', label: 'Highlighted region', type: 'select', options: LOBES.map(l => [l[0], l[1]]), show: p => p.coloring === 'highlight' },
    { key: 'base', label: 'Brain colour', type: 'color', show: p => p.coloring !== 'lobes' },
    { key: 'colors', label: 'Lobe colours (comma separated, override)', type: 'text', show: p => p.coloring === 'lobes' },
    { key: 'gyri', label: 'Folds (gyri)', type: 'number', min: 0, max: 40, step: 1 }, { key: 'seed', label: 'Fold pattern', type: 'number', min: 1, max: 999, step: 1 },
    { key: 'labels', label: 'Region names', type: 'bool' }],
  bbox: p => { const k = p.w / 2; return [-k - (p.labels ? k * 0.15 : 0), -0.82 * k - (p.labels ? 2 : 0), k + (p.labels ? k * 0.15 : 0), 1.05 * k]; },
  draw(p, S, obj) {
    const k = p.w / 2, uid = idOf(obj, p, 'br'), sc = q => [q[0] * k, q[1] * k], user = String(p.colors || '').split(',').map(s => s.trim()).filter(s => /^#/.test(s));
    const col = id => { const i = LOBES.findIndex(l => l[0] === id); if (p.coloring === 'single') return p.base; if (p.coloring === 'highlight') return id === p.highlight ? '#e8524a' : U.lighten(p.base, 0.35); return user[i] || LOBES[i][2]; };
    const C = curve([0.02, -0.92], [-0.12, 0.05], -0.12), Sy = curve([-0.62, 0.22], [0.42, -0.08], 0.1), PO = curve([0.6, -0.95], [0.76, 0.42], 0.08);
    const M = [-0.12, 0.05], E2 = Sy[Sy.length - 1], poY = PO.findIndex(q => q[1] > -0.05), POu = PO.slice(0, poY + 1), POl = PO.slice(poY);
    const syM = Sy.findIndex(q => q[0] >= M[0]);
    const regions = {
      frontal: [[-1.3, -1.3], [0.02, -1.3]].concat(C, Sy.slice(0, syM + 1).reverse(), [[-1.3, 0.3]]),
      parietal: [[0.02, -1.3], [0.6, -1.3]].concat(POu, [E2], Sy.slice(syM).reverse(), C.slice().reverse()),
      temporal: [Sy[0]].concat(Sy, POl, [[0.76, 1.3], [-1.3, 1.3], [-1.3, 0.3]]),
      occipital: [[0.6, -1.3], [1.3, -1.3], [1.3, 1.3], [0.76, 1.3]].concat(PO.slice().reverse()),
    };
    let defs = `<clipPath id="${uid}-c"><path d="${smooth(CEREBRUM.map(sc))}"/></clipPath>`, s = '';
    LOBES.forEach(l => { defs += rad(S, col(l[0]), `${uid}-${l[0]}`); });
    // brainstem and cerebellum sit behind and below
    const stem = [[0.18, 0.4], [0.36, 0.42], [0.42, 0.7], [0.4, 1.0], [0.24, 1.02], [0.2, 0.72]].map(sc);
    s += `<path d="${smooth(stem)}" fill="${F(S, col('stem'), uid + '-stem')}" stroke="${E(S, col('stem'))}" stroke-width="${LW(S)}"/>`;
    const cb = [[0.42, 0.32], [0.72, 0.28], [0.92, 0.42], [0.86, 0.66], [0.6, 0.74], [0.42, 0.64], [0.36, 0.48]].map(sc);
    s += `<path d="${smooth(cb)}" fill="${F(S, col('cerebellum'), uid + '-cerebellum')}" stroke="${E(S, col('cerebellum'))}" stroke-width="${LW(S)}"/>`;
    for (let i = 1; i < 6; i++) { const y = 0.32 + i * 0.07; s += `<path d="M ${n(0.42 * k)} ${n(y * k)} Q ${n(0.66 * k)} ${n((y + 0.05) * k)} ${n((0.9 - Math.abs(i - 3) * 0.03) * k)} ${n((y + 0.02) * k)}" fill="none" stroke="${E(S, col('cerebellum'))}" stroke-opacity="0.6" stroke-width="${LW(S, 0.5)}"/>`; }
    // the lobes, clipped by the outline of the cerebrum
    s += `<g clip-path="url(#${uid}-c)">`;
    Object.entries(regions).forEach(([id, pts]) => { s += `<path d="M ${pts.map(q => n(q[0] * k) + ' ' + n(q[1] * k)).join(' L ')} Z" fill="${F(S, col(id), uid + '-' + id)}"/>`; });
    // folds: wiggly furrows, then the main fissures
    const r = rnd(p.seed);
    for (let i = 0; i < (p.gyri | 0); i++) {
      const x0 = -0.9 + 1.8 * r(), y0 = -0.7 + 1.1 * r(), a = r() * Math.PI, L = 0.18 + 0.25 * r(), pts = [];
      for (let j = 0; j <= 6; j++) { const t = j / 6, w = Math.sin(t * Math.PI * 2 + r()) * 0.04; pts.push([(x0 + Math.cos(a) * L * t - Math.sin(a) * w) * k, (y0 + Math.sin(a) * L * t + Math.cos(a) * w) * k]); }
      s += `<path d="${smooth(pts, false)}" fill="none" stroke="${S.shaded ? '#00000038' : S.ink}" stroke-opacity="${S.shaded ? 1 : 0.55}" stroke-width="${LW(S, 0.6)}" stroke-linecap="round"/>`;
    }
    [C, Sy, PO].forEach(cv => { s += `<path d="${smooth(cv.map(sc), false)}" fill="none" stroke="${S.shaded ? '#00000066' : S.ink}" stroke-width="${LW(S, 0.9)}" stroke-linecap="round"/>`; });
    if (S.shaded) s += `<path d="${smooth(CEREBRUM.map(sc))}" fill="url(#${uid}-sh)"/>`;
    s += '</g>';
    if (S.shaded) defs += `<radialGradient id="${uid}-sh" cx="0.35" cy="0.25" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.18"/></radialGradient>`;
    s += `<path d="${smooth(CEREBRUM.map(sc))}" fill="none" stroke="${S.shaded ? '#8a4b47' : S.ink}" stroke-width="${LW(S, 1)}"/>`;
    if (p.labels) {
      const fs = Math.min(S.fs, k * 0.11), L = { frontal: [-0.55, -0.3], parietal: [0.32, -0.45], temporal: [-0.15, 0.3], occipital: [0.82, -0.08], cerebellum: [0.66, 0.52], stem: [0.3, 0.86] };
      LOBES.forEach(l => { const q = L[l[0]]; s += txt(S, q[0] * k, q[1] * k, l[1].replace(' lobe', ''), fs, { color: '#222' }); });
    }
    return `<defs>${defs}</defs>` + s;
  } });

/* ================= neuron ================= */
ann({ type: 'neuron', name: 'Neuron', keywords: 'neuron nerve cell axon dendrite myelin synapse neuroscience signal action potential',
  defaults: { L: 50, color: '#f0a35e', myelin: '#f7e7b0', seed: 7, branches: 6, spike: true },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 10, max: 300, step: 0.5 }, { key: 'color', label: 'Cell colour', type: 'color' }, { key: 'myelin', label: 'Myelin colour', type: 'color', allowEmpty: true, hint: 'empty = unmyelinated axon' },
    { key: 'branches', label: 'Dendrites', type: 'number', min: 2, max: 12, step: 1 }, { key: 'seed', label: 'Branch pattern', type: 'number', min: 1, max: 999, step: 1 }, { key: 'spike', label: 'Signal arrow along the axon', type: 'bool' }],
  bbox: p => [-p.L * 0.32, -p.L * 0.22, p.L * 0.72, p.L * 0.22],
  draw(p, S, obj) {
    const L = p.L, uid = idOf(obj, p, 'ne'), r = rnd(p.seed), rs = L * 0.06, col = p.color, w = L * 0.012;
    let s = `<defs>${rad(S, col, uid + '-s')}</defs>`, den = '';
    const branch = (x, y, a, len, wd, depth) => {
      const x1 = x + Math.cos(a) * len, y1 = y + Math.sin(a) * len, mx = (x + x1) / 2 + (r() - 0.5) * len * 0.3, my = (y + y1) / 2 + (r() - 0.5) * len * 0.3;
      den += `<path d="M ${n(x)} ${n(y)} Q ${n(mx)} ${n(my)} ${n(x1)} ${n(y1)}" fill="none" stroke="${col}" stroke-width="${n(wd)}" stroke-linecap="round"/>`;
      if (depth > 0) for (let i = 0; i < 2; i++) branch(x1, y1, a + (i ? 1 : -1) * (0.3 + r() * 0.4), len * (0.55 + r() * 0.2), wd * 0.62, depth - 1);
    };
    const N = Math.max(2, p.branches | 0);
    for (let i = 0; i < N; i++) { const a = Math.PI * (0.55 + 0.9 * i / (N - 1)) + (r() - 0.5) * 0.25; branch(Math.cos(a) * rs * 0.8, Math.sin(a) * rs * 0.8, a, L * (0.08 + r() * 0.05), w * 2.4, 2); }
    // outline pass first (darker, thicker), then the colour, so branches read as one cell
    if (!S.shaded) s += den.replace(/stroke="[^"]+" stroke-width="([\d.]+)"/g, (m, ww) => `stroke="${S.ink}" stroke-width="${n(+ww + S.lw * 1.2)}"`);
    else s += den.replace(/stroke="[^"]+" stroke-width="([\d.]+)"/g, (m, ww) => `stroke="${U.shadeRgb(col, 0.6)}" stroke-width="${n(+ww + S.lw * 0.9)}"`);
    s += den;
    // axon with myelin sheaths and nodes, then terminals with boutons
    const ax0 = rs * 0.9, ax1 = L * 0.6;
    s += `<line x1="${n(ax0)}" y1="0" x2="${n(ax1)}" y2="0" stroke="${E(S, col)}" stroke-width="${n(w * 2 + S.lw)}"/><line x1="${n(ax0)}" y1="0" x2="${n(ax1)}" y2="0" stroke="${col}" stroke-width="${n(w * 2)}"/>`;
    if (p.myelin) { const segs = 5, sl = (ax1 - ax0 - L * 0.04) / segs; for (let i = 0; i < segs; i++) { const x = ax0 + L * 0.04 + i * sl; s += `<rect x="${n(x + sl * 0.06)}" y="${n(-w * 2.6)}" width="${n(sl * 0.88)}" height="${n(w * 5.2)}" rx="${n(w * 2.4)}" fill="${S.shaded ? `url(#${uid}-m)` : p.myelin}" stroke="${E(S, p.myelin)}" stroke-width="${LW(S, 0.6)}"/>`; } s = s.replace('</defs>', `${S.shaded ? `<linearGradient id="${uid}-m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.lighten(p.myelin, 0.3)}"/><stop offset="1" stop-color="${U.shadeRgb(p.myelin, 0.8)}"/></linearGradient>` : ''}</defs>`); }
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.35, x1 = ax1 + L * 0.08 * Math.cos(a), y1 = L * 0.08 * Math.sin(a) * 1.6;
      s += `<path d="M ${n(ax1)} 0 Q ${n(ax1 + L * 0.04)} ${n(y1 * 0.3)} ${n(x1)} ${n(y1)}" fill="none" stroke="${col}" stroke-width="${n(w * 1.2)}" stroke-linecap="round"/><circle cx="${n(x1)}" cy="${n(y1)}" r="${n(w * 2.2)}" fill="${F(S, col, uid + '-s')}" stroke="${E(S, col)}" stroke-width="${LW(S, 0.6)}"/>`; }
    // cell body with nucleus
    const body = Array.from({ length: 7 }, (_, i) => { const a = i / 7 * 2 * Math.PI, rr = rs * (0.85 + 0.3 * r()); return [Math.cos(a) * rr, Math.sin(a) * rr]; });
    s += `<path d="${smooth(body)}" fill="${F(S, col, uid + '-s')}" stroke="${E(S, col)}" stroke-width="${LW(S)}"/><circle cx="${n(-rs * 0.1)}" cy="${n(-rs * 0.1)}" r="${n(rs * 0.38)}" fill="${S.shaded ? U.shadeRgb(col, 0.7) : U.lighten(col, 0.5)}" stroke="${E(S, col)}" stroke-width="${LW(S, 0.6)}"/>`;
    if (p.spike) { const y = -L * 0.08; s += `<line x1="${n(L * 0.18)}" y1="${n(y)}" x2="${n(L * 0.5)}" y2="${n(y)}" stroke="#d62828" stroke-width="${LW(S, 1.1)}"/>` + H.arrowHead(L * 0.52, y, 0, 1.4, '#d62828'); }
    return s;
  } });

/* ================= cells ================= */
ann({ type: 'cell', name: 'Cell (animal or plant)', keywords: 'cell eukaryotic animal plant nucleus mitochondria organelles membrane chloroplast vacuole biology',
  defaults: { kind: 'animal', w: 34, color: '#f6d6c8', nucleus: '#a98bd6', seed: 5, organelles: true },
  params: [{ key: 'kind', label: 'Cell', type: 'select', options: [['animal', 'Animal cell'], ['plant', 'Plant cell']] }, { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 6, max: 300, step: 0.5 },
    { key: 'color', label: 'Cytoplasm colour', type: 'color' }, { key: 'nucleus', label: 'Nucleus colour', type: 'color' }, { key: 'organelles', label: 'Organelles', type: 'bool' }, { key: 'seed', label: 'Shape', type: 'number', min: 1, max: 999, step: 1 }],
  bbox: p => [-p.w / 2 - 0.5, -p.w * 0.38 - 0.5, p.w / 2 + 0.5, p.w * 0.38 + 0.5],
  draw(p, S, obj) {
    const a = p.w / 2, b = p.w * 0.36, uid = idOf(obj, p, 'ce'), r = rnd(p.seed), plant = p.kind === 'plant';
    let defs = rad(S, p.color, uid + '-c', 0.45, 0.4) + rad(S, p.nucleus, uid + '-n') + rad(S, '#f2a65a', uid + '-m') + rad(S, '#6fbf6a', uid + '-k'), s = '';
    if (plant) s += `<rect x="${n(-a)}" y="${n(-b)}" width="${n(2 * a)}" height="${n(2 * b)}" rx="${n(b * 0.18)}" fill="${S.shaded ? '#8bc47a' : '#cfe8c2'}" stroke="${E(S, '#6fa65d')}" stroke-width="${LW(S)}"/><rect x="${n(-a + 1.2)}" y="${n(-b + 1.2)}" width="${n(2 * a - 2.4)}" height="${n(2 * b - 2.4)}" rx="${n(b * 0.14)}" fill="${F(S, p.color, uid + '-c')}" stroke="${E(S, p.color)}" stroke-width="${LW(S, 0.6)}"/>`;
    else { const pts = Array.from({ length: 12 }, (_, i) => { const t = i / 12 * 2 * Math.PI, k = 0.94 + 0.1 * r(); return [Math.cos(t) * a * k, Math.sin(t) * b * k]; }); s += `<path d="${smooth(pts)}" fill="${F(S, p.color, uid + '-c')}" stroke="${E(S, p.color)}" stroke-width="${LW(S, 1)}"/>`; }
    if (plant) s += `<rect x="${n(-a * 0.15)}" y="${n(-b * 0.7)}" width="${n(a * 0.95)}" height="${n(b * 1.4)}" rx="${n(b * 0.4)}" fill="${S.shaded ? '#d9eefb' : '#eef7fd'}" fill-opacity="0.9" stroke="${E(S, '#9cc6ec')}" stroke-width="${LW(S, 0.6)}"/>`;
    const nx = plant ? -a * 0.5 : -a * 0.1, ny = plant ? -b * 0.2 : 0, nr = b * (plant ? 0.38 : 0.42);
    if (p.organelles) {
      if (!plant) for (let i = 0; i < 3; i++) { const t = -0.2 + i * 0.35; s += `<path d="M ${n(nx + nr * 1.25 * Math.cos(Math.PI * t - 0.6))} ${n(ny + nr * 1.25 * Math.sin(Math.PI * t - 0.6))} q ${n(nr * 0.3)} ${n(nr * 0.3)} ${n(nr * 0.1)} ${n(nr * 0.5)} q ${n(-nr * 0.25)} ${n(nr * 0.25)} ${n(nr * 0.05)} ${n(nr * 0.55)}" fill="none" stroke="${S.shaded ? '#6d8fb3' : S.ink}" stroke-width="${LW(S, 0.6)}"/>`; }
      const mito = (x, y, ang, L) => `<g transform="translate(${n(x)} ${n(y)}) rotate(${n(ang)})"><ellipse rx="${n(L)}" ry="${n(L * 0.45)}" fill="${F(S, '#f2a65a', uid + '-m')}" stroke="${E(S, '#f2a65a')}" stroke-width="${LW(S, 0.6)}"/><path d="M ${n(-L * 0.75)} 0 l ${n(L * 0.25)} ${n(-L * 0.25)} l ${n(L * 0.25)} ${n(L * 0.5)} l ${n(L * 0.25)} ${n(-L * 0.5)} l ${n(L * 0.25)} ${n(L * 0.5)} l ${n(L * 0.25)} ${n(-L * 0.25)}" fill="none" stroke="${E(S, '#f2a65a')}" stroke-width="${LW(S, 0.45)}"/></g>`;
      const spots = plant ? [[a * 0.1, b * 0.78, 10], [-a * 0.72, b * 0.55, -20]] : [[a * 0.5, -b * 0.45, 25], [a * 0.55, b * 0.35, -30], [-a * 0.6, b * 0.55, 10]];
      spots.forEach(q => { s += mito(q[0], q[1], q[2], b * 0.17); });
      if (plant) [[-a * 0.75, -b * 0.65], [a * 0.15, -b * 0.82], [-a * 0.82, b * 0.05], [a * 0.88, b * 0.55]].forEach((q, i) => { s += `<g transform="translate(${n(q[0])} ${n(q[1])}) rotate(${n(i * 35)})"><ellipse rx="${n(b * 0.2)}" ry="${n(b * 0.11)}" fill="${F(S, '#6fbf6a', uid + '-k')}" stroke="${E(S, '#6fbf6a')}" stroke-width="${LW(S, 0.6)}"/>${[-1, 0, 1].map(j => `<line x1="${n(j * b * 0.07)}" y1="${n(-b * 0.07)}" x2="${n(j * b * 0.07)}" y2="${n(b * 0.07)}" stroke="${E(S, '#6fbf6a')}" stroke-width="${LW(S, 0.5)}"/>`).join('')}</g>`; });
      else { // Golgi stack and vesicles
        for (let i = 0; i < 4; i++) s += `<path d="M ${n(-a * 0.75 + i * 0.6)} ${n(-b * 0.55)} q ${n(a * 0.15)} ${n(-b * 0.12)} ${n(a * 0.3)} 0" fill="none" stroke="${S.shaded ? '#d9708f' : S.ink}" stroke-width="${n(b * 0.045)}" stroke-linecap="round"/>`;
        for (let i = 0; i < 6; i++) { const t = r() * 2 * Math.PI, q = 0.65 + 0.2 * r(); s += `<circle cx="${n(Math.cos(t) * a * q)}" cy="${n(Math.sin(t) * b * q)}" r="${n(b * 0.05)}" fill="${S.shaded ? '#f7f3c9' : '#ffffff'}" stroke="${S.ink}" stroke-opacity="0.6" stroke-width="${LW(S, 0.4)}"/>`; }
      }
      for (let i = 0; i < 20; i++) { const t = r() * 2 * Math.PI, q = 0.3 + 0.6 * r(); s += `<circle cx="${n(Math.cos(t) * a * q)}" cy="${n(Math.sin(t) * b * q)}" r="${n(b * 0.018)}" fill="${S.ink}" fill-opacity="0.55"/>`; }
    }
    s += `<circle cx="${n(nx)}" cy="${n(ny)}" r="${n(nr)}" fill="${F(S, p.nucleus, uid + '-n')}" stroke="${E(S, p.nucleus)}" stroke-width="${LW(S, 0.9)}"/><circle cx="${n(nx)}" cy="${n(ny)}" r="${n(nr * 0.88)}" fill="none" stroke="${E(S, p.nucleus)}" stroke-opacity="0.5" stroke-width="${LW(S, 0.5)}"/><circle cx="${n(nx + nr * 0.2)}" cy="${n(ny - nr * 0.1)}" r="${n(nr * 0.3)}" fill="${U.shadeRgb(p.nucleus, 0.7)}"/>`;
    return `<defs>${defs}</defs>` + s;
  } });
ann({ type: 'bacterium', name: 'Bacterium', keywords: 'bacteria bacterium microbe e coli rod coccus spiral flagellum pili prokaryote',
  defaults: { shape: 'rod', L: 16, color: '#8fcf8a', flagella: 2, pili: true, seed: 3 },
  params: [{ key: 'shape', label: 'Shape', type: 'select', options: [['rod', 'Rod (bacillus)'], ['coccus', 'Sphere (coccus)'], ['spiral', 'Spiral (spirillum)']] }, { key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 3, max: 200, step: 0.5 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'flagella', label: 'Flagella', type: 'number', min: 0, max: 6, step: 1 }, { key: 'pili', label: 'Pili', type: 'bool' }, { key: 'seed', label: 'Pattern', type: 'number', min: 1, max: 999, step: 1 }],
  bbox: p => [-p.L / 2 - (p.flagella ? p.L * 0.75 : 0.6), -p.L * 0.42, p.L / 2 + 0.6, p.L * 0.42],
  draw(p, S, obj) {
    const L = p.L, w = p.shape === 'coccus' ? L * 0.5 : L * 0.36, uid = idOf(obj, p, 'ba'), r = rnd(p.seed), c = p.color;
    let s = `<defs>${rad(S, c, uid)}</defs>`;
    const left = p.shape === 'coccus' ? -L * 0.25 : -L / 2;
    for (let i = 0; i < (p.flagella | 0); i++) { const y0 = (i - (p.flagella - 1) / 2) * w * 0.25; let d = `M ${n(left + 0.2)} ${n(y0)}`; for (let j = 1; j <= 24; j++) { const t = j / 24; d += ` L ${n(left - L * 0.75 * t)} ${n(y0 + Math.sin(t * Math.PI * 4 + i) * w * 0.18 + y0 * t)}`; } s += `<path d="${d}" fill="none" stroke="${E(S, c)}" stroke-width="${LW(S, 0.7)}" stroke-linecap="round"/>`; }
    let body;
    if (p.shape === 'coccus') body = `<circle cx="0" cy="0" r="${n(L * 0.25)}"`;
    else if (p.shape === 'spiral') { let d = ''; const N = 30; const top = [], bot = []; for (let j = 0; j <= N; j++) { const t = j / N, x = -L / 2 + L * t, y = Math.sin(t * Math.PI * 3) * w * 0.55; top.push([x, y - w * 0.22]); bot.push([x, y + w * 0.22]); } d = 'M ' + top.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + ' L ' + bot.reverse().map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + ' Z'; body = `<path d="${d}"`; }
    else body = `<rect x="${n(-L / 2)}" y="${n(-w / 2)}" width="${n(L)}" height="${n(w)}" rx="${n(w / 2)}"`;
    if (p.pili && p.shape !== 'spiral') for (let i = 0; i < 14; i++) { const t = r() * 2 * Math.PI, x = p.shape === 'coccus' ? Math.cos(t) * L * 0.25 : U.clamp(Math.cos(t) * L * 0.55, -L / 2 + w / 2, L / 2 - w / 2), y = Math.sin(t) * (p.shape === 'coccus' ? L * 0.25 : w / 2); s += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(x * 1.12 + Math.cos(t) * 0.6)}" y2="${n(y * 1.25 + Math.sin(t) * 0.6)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.45)}"/>`; }
    s += `${body} fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.9)}"/>`;
    if (p.shape !== 'spiral') { let d = ''; const R = p.shape === 'coccus' ? L * 0.12 : L * 0.28; for (let j = 0; j <= 30; j++) { const t = j / 30 * 2 * Math.PI; d += (j ? ' L ' : 'M ') + n(Math.cos(t) * R * (0.7 + 0.3 * Math.sin(t * 5))) + ' ' + n(Math.sin(t) * w * 0.18 * (0.7 + 0.3 * Math.cos(t * 4))); } s += `<path d="${d}" fill="none" stroke="${U.shadeRgb(c, 0.5)}" stroke-width="${LW(S, 0.5)}"/>`;
      for (let i = 0; i < 12; i++) s += `<circle cx="${n((r() - 0.5) * (p.shape === 'coccus' ? L * 0.35 : L * 0.75))}" cy="${n((r() - 0.5) * w * 0.6)}" r="${n(w * 0.03)}" fill="${U.shadeRgb(c, 0.5)}"/>`; }
    return s;
  } });
ann({ type: 'virus', name: 'Virus', keywords: 'virus coronavirus spike capsid icosahedral bacteriophage phage virion',
  defaults: { kind: 'spiky', d: 16, color: '#e46b6b', spikes: 18 },
  params: [{ key: 'kind', label: 'Kind', type: 'select', options: [['spiky', 'Enveloped with spikes'], ['icosa', 'Icosahedral capsid'], ['phage', 'Bacteriophage']] }, { key: 'd', label: 'Size', type: 'number', unit: 'mm', min: 3, max: 200, step: 0.5 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'spikes', label: 'Spikes', type: 'number', min: 4, max: 60, step: 1, show: p => p.kind === 'spiky' }],
  bbox: p => (p.kind === 'phage' ? [-p.d * 0.4, -p.d * 0.55, p.d * 0.4, p.d * 0.95] : [-p.d * 0.62, -p.d * 0.62, p.d * 0.62, p.d * 0.62]),
  draw(p, S, obj) {
    const R = p.d * 0.4, uid = idOf(obj, p, 'vi'), c = p.color;
    let s = `<defs>${rad(S, c, uid)}</defs>`;
    if (p.kind === 'spiky') {
      const N = Math.max(4, p.spikes | 0);
      for (let i = 0; i < N; i++) { const a = i / N * 2 * Math.PI, x0 = Math.cos(a) * R, y0 = Math.sin(a) * R, x1 = Math.cos(a) * R * 1.35, y1 = Math.sin(a) * R * 1.35; s += `<line x1="${n(x0)}" y1="${n(y0)}" x2="${n(x1)}" y2="${n(y1)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/><circle cx="${n(x1)}" cy="${n(y1)}" r="${n(R * 0.09)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.5)}"/>`; }
      s += `<circle r="${n(R)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.9)}"/>`;
      for (let i = 0; i < 9; i++) { const a = i * 2.4, q = R * 0.55 * Math.sqrt((i + 0.5) / 9); s += `<circle cx="${n(Math.cos(a) * q)}" cy="${n(Math.sin(a) * q)}" r="${n(R * 0.07)}" fill="${U.shadeRgb(c, 0.75)}"/>`; }
      return s;
    }
    const hex = (cx, cy, rr) => { const v = Array.from({ length: 6 }, (_, i) => [cx + rr * Math.cos(i * Math.PI / 3 + Math.PI / 6), cy + rr * Math.sin(i * Math.PI / 3 + Math.PI / 6)]); let q = `<path d="M ${v.map(t => n(t[0]) + ' ' + n(t[1])).join(' L ')} Z" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.9)}"/>`;
      const inner = v.map((t, i) => [cx + (t[0] - cx) * 0.45 + (i % 2 ? 0 : 0), cy + (t[1] - cy) * 0.45]); q += `<path d="M ${inner.map(t => n(t[0]) + ' ' + n(t[1])).join(' L ')} Z" fill="${S.shaded ? U.lighten(c, 0.2) : 'none'}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.5)}"/>`;
      v.forEach((t, i) => { q += `<line x1="${n(t[0])}" y1="${n(t[1])}" x2="${n(inner[i][0])}" y2="${n(inner[i][1])}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.5)}"/>`; }); return q; };
    if (p.kind === 'icosa') return s + hex(0, 0, R);
    // phage: head, collar, tail sheath, base plate, legs
    const hy = -p.d * 0.25, hr = p.d * 0.25, ty0 = hy + hr * 0.9, ty1 = ty0 + p.d * 0.5;
    s += `<rect x="${n(-hr * 0.22)}" y="${n(ty0)}" width="${n(hr * 0.44)}" height="${n(ty1 - ty0)}" fill="${S.shaded ? U.shadeRgb(c, 0.85) : '#ffffff'}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.7)}"/>`;
    for (let i = 1; i < 8; i++) s += `<line x1="${n(-hr * 0.22)}" y1="${n(ty0 + (ty1 - ty0) * i / 8)}" x2="${n(hr * 0.22)}" y2="${n(ty0 + (ty1 - ty0) * i / 8)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.4)}"/>`;
    s += `<rect x="${n(-hr * 0.5)}" y="${n(ty1)}" width="${n(hr)}" height="${n(hr * 0.15)}" fill="${S.shaded ? U.shadeRgb(c, 0.7) : '#ffffff'}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.6)}"/>`;
    [-1, -0.4, 0.4, 1].forEach(f => { s += `<path d="M ${n(f * hr * 0.4)} ${n(ty1 + hr * 0.15)} L ${n(f * hr * 1.1)} ${n(ty1 + hr * 0.5)} L ${n(f * hr * 1.3)} ${n(ty1 + hr * 1.1)}" fill="none" stroke="${E(S, c)}" stroke-width="${LW(S, 0.7)}"/>`; });
    return s + hex(0, hy, hr);
  } });

/* ================= molecules ================= */
const BASE_COL = { A: '#e45756', T: '#4c78a8', G: '#54a24b', C: '#f2b701' };
ann({ type: 'dna', name: 'DNA double helix', keywords: 'dna double helix base pairs gene genome sequence nucleotides molecular biology',
  defaults: { L: 50, w: 10, turns: 2.5, strand1: '#3a6fd8', strand2: '#d65a8a', sequence: 'ATGCGTACCATG', basepairs: 30 },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 5, max: 400, step: 0.5 }, { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 1, max: 100, step: 0.5 },
    { key: 'turns', label: 'Turns', type: 'number', min: 0.5, max: 20, step: 0.5 }, { key: 'basepairs', label: 'Base pairs drawn', type: 'number', min: 0, max: 200, step: 1 },
    { key: 'sequence', label: 'Sequence (colours the base pairs)', type: 'text' }, { key: 'strand1', label: 'Strand 1', type: 'color' }, { key: 'strand2', label: 'Strand 2', type: 'color' }],
  bbox: p => [-p.L / 2 - 0.5, -p.w / 2 - 1, p.L / 2 + 0.5, p.w / 2 + 1],
  draw(p, S) {
    const L = p.L, A = p.w / 2, k = 2 * Math.PI * p.turns / L, seq = String(p.sequence || 'AT').toUpperCase().replace(/[^ATGC]/g, '') || 'AT', comp = { A: 'T', T: 'A', G: 'C', C: 'G' };
    const y1 = x => A * Math.sin(k * (x + L / 2)), y2 = x => A * Math.sin(k * (x + L / 2) + Math.PI);
    const front = (x, ph) => Math.cos(k * (x + L / 2) + ph) > 0;
    let s = '', back = '', fore = '';
    const N = Math.max(0, p.basepairs | 0);
    for (let i = 0; i < N; i++) {
      const x = -L / 2 + L * (i + 0.5) / N, a = y1(x), b = y2(x), base = seq[i % seq.length], m = (a + b) / 2;
      s += `<line x1="${n(x)}" y1="${n(a)}" x2="${n(x)}" y2="${n(m)}" stroke="${BASE_COL[base]}" stroke-width="${LW(S, 1.6)}"/><line x1="${n(x)}" y1="${n(m)}" x2="${n(x)}" y2="${n(b)}" stroke="${BASE_COL[comp[base]]}" stroke-width="${LW(S, 1.6)}"/>`;
    }
    const strand = (f, ph, col, wantFront) => {
      let out = '', seg = []; const M = 200, flush = () => { if (seg.length > 1) { const d = 'M ' + seg.map(q => n(q[0]) + ' ' + n(q[1])).join(' L '); out += `<path d="${d}" fill="none" stroke="${E(S, col)}" stroke-width="${n(A * 0.3 + S.lw)}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${wantFront ? col : U.shadeRgb(col, S.shaded ? 0.75 : 1)}" stroke-width="${n(A * 0.3)}" stroke-linecap="round"/>` + (S.shaded && wantFront ? `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="${n(A * 0.08)}" transform="translate(0 ${n(-A * 0.07)})" stroke-linecap="round"/>` : ''); } seg = []; };
      for (let j = 0; j <= M; j++) { const x = -L / 2 + L * j / M; if (front(x, ph) === wantFront) seg.push([x, f(x)]); else flush(); }
      flush(); return out;
    };
    back = strand(y1, 0, p.strand1, false) + strand(y2, Math.PI, p.strand2, false);
    fore = strand(y1, 0, p.strand1, true) + strand(y2, Math.PI, p.strand2, true);
    return back + s + fore;
  } });
ann({ type: 'antibody', name: 'Antibody (IgG)', keywords: 'antibody immunoglobulin igg y shape heavy light chain antigen immunology elisa',
  defaults: { h: 18, heavy: '#4c78a8', light: '#f28e2b', antigen: true, antigenColor: '#54a24b' },
  params: [{ key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 200, step: 0.5 }, { key: 'heavy', label: 'Heavy chains', type: 'color' }, { key: 'light', label: 'Light chains', type: 'color' }, { key: 'antigen', label: 'Antigens bound', type: 'bool' }, { key: 'antigenColor', label: 'Antigen colour', type: 'color', show: p => p.antigen }],
  bbox: p => [-p.h * 0.62, -p.h * 0.62, p.h * 0.62, p.h * 0.5],
  draw(p, S, obj) {
    const h = p.h, uid = idOf(obj, p, 'ab'), cw = h * 0.11;
    const cap = (x1, y1, x2, y2, col, id) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${E(S, col)}" stroke-width="${n(cw + S.lw * 1.2)}" stroke-linecap="round"/><line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${col}" stroke-width="${n(cw)}" stroke-linecap="round"/>` + (S.shaded ? `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="#ffffff" stroke-opacity="0.35" stroke-width="${n(cw * 0.25)}" stroke-linecap="round" transform="translate(${n(-cw * 0.15)} ${n(-cw * 0.15)})"/>` : '');
    let s = '';
    // stem (two heavy chains), arms (heavy) with light chains on the outside
    s += cap(-cw * 0.55, h * 0.45, -cw * 0.55, 0, p.heavy) + cap(cw * 0.55, h * 0.45, cw * 0.55, 0, p.heavy);
    s += cap(-cw * 0.55, 0, -h * 0.38, -h * 0.4, p.heavy) + cap(cw * 0.55, 0, h * 0.38, -h * 0.4, p.heavy);
    s += cap(-cw * 1.6, -cw * 0.4, -h * 0.47, -h * 0.3, p.light) + cap(cw * 1.6, -cw * 0.4, h * 0.47, -h * 0.3, p.light);
    if (p.antigen) [-1, 1].forEach(sg => { const cx = sg * h * 0.5, cy = -h * 0.5, r = h * 0.09, pts = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * 2 * Math.PI, rr = r * (i % 2 ? 0.6 : 1); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }); s += `<defs>${rad(S, p.antigenColor, uid + 'g')}</defs><path d="M ${pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${F(S, p.antigenColor, uid + 'g')}" stroke="${E(S, p.antigenColor)}" stroke-width="${LW(S, 0.7)}" stroke-linejoin="round"/>`; });
    return s;
  } });
ann({ type: 'protein', name: 'Protein (ribbon)', keywords: 'protein ribbon structure helix beta sheet enzyme fold',
  defaults: { w: 30, helix: '#d65a8a', sheet: '#f2b701', loop: '#7d858f' },
  params: [{ key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 200, step: 0.5 }, { key: 'helix', label: 'Helices', type: 'color' }, { key: 'sheet', label: 'β-sheets', type: 'color' }, { key: 'loop', label: 'Loops', type: 'color' }],
  bbox: p => [-p.w / 2 - 0.5, -p.w * 0.4, p.w / 2 + 0.5, p.w * 0.4],
  draw(p, S) {
    const k = p.w / 30, P = (x, y) => [x * k, y * k];
    let s = '';
    const loop = pts => `<path d="${smooth(pts.map(q => P(q[0], q[1])), false)}" fill="none" stroke="${p.loop}" stroke-width="${n(0.5 * k + S.lw * 0.3)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    // helix: a ribbon coiling about the axis (x0,y0)→(x1,y1); back half darker
    const helix = (x0, y0, x1, y1, turns) => { let q = ''; const N = Math.round(turns * 14), L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, R = 2.2;
      const at = t => { const a = t * turns * 2 * Math.PI, w = Math.sin(a) * R; return [x0 + (x1 - x0) * t - uy * w, y0 + (y1 - y0) * t + ux * w]; };
      const segs = [];
      for (let i = 0; i < N; i++) { const t0 = i / N, t1 = (i + 1) / N, am = (t0 + t1) / 2 * turns * 2 * Math.PI, front = Math.cos(am) > 0; segs.push({ front, A: P(...at(t0)), B: P(...at(t1)), w: 1.5 * k * (0.5 + 0.5 * Math.abs(Math.cos(am))) }); }
      segs.filter(g => !g.front).concat(segs.filter(g => g.front)).forEach(g => { q += `<line x1="${n(g.A[0])}" y1="${n(g.A[1])}" x2="${n(g.B[0])}" y2="${n(g.B[1])}" stroke="${g.front ? p.helix : U.shadeRgb(p.helix, 0.68)}" stroke-width="${n(g.w)}" stroke-linecap="round"/>`; });
      return q; };
    // β-strand: flat arrow from x0 to x1 (either direction)
    const arrow = (x0, y, x1) => { const d = Math.sign(x1 - x0) || 1, hx = x1 - d * 2.4, pts = [[x0, y - 1], [hx, y - 1], [hx, y - 2], [x1, y], [hx, y + 2], [hx, y + 1], [x0, y + 1]].map(q => P(q[0], q[1]));
      return `<path d="M ${pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${S.shaded ? p.sheet : U.lighten(p.sheet, 0.2)}" stroke="${E(S, p.sheet)}" stroke-width="${LW(S, 0.6)}" stroke-linejoin="round"/>`; };
    s += loop([[-14.5, -3], [-14, -7], [-11, -9]]) + loop([[3, -9], [7, -9.5], [9.5, -7], [9.5, -5]]) + loop([[11.5, 3], [11.5, 5.5], [9.5, 6.5], [6, 6.5]])
      + loop([[-9, 6.5], [-12.5, 6], [-13, 3], [-10, 1]]) + loop([[5, 1], [6.5, -1.5], [4, -4], [-2, -4.5], [-5, -3]]);
    s += arrow(6, 6.5, -9) + arrow(-10, 1, 5);
    s += helix(-11, -9, 3, -9, 3.5) + helix(9.5, -5, 11.5, 3, 2);
    return s;
  } });
ann({ type: 'bloodcell', name: 'Blood cell', keywords: 'blood cell red blood cell erythrocyte white blood cell leukocyte platelet hematology',
  defaults: { kind: 'red', d: 10, color: '' },
  params: [{ key: 'kind', label: 'Cell', type: 'select', options: [['red', 'Red blood cell'], ['redside', 'Red blood cell (edge on)'], ['white', 'White blood cell'], ['platelet', 'Platelet']] }, { key: 'd', label: 'Diameter', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5 }, { key: 'color', label: 'Colour (empty = natural)', type: 'color', allowEmpty: true }],
  bbox: p => [-p.d / 2 - 0.4, -p.d / 2 - 0.4, p.d / 2 + 0.4, p.d / 2 + 0.4],
  draw(p, S, obj) {
    const R = p.d / 2, uid = idOf(obj, p, 'bc');
    if (p.kind === 'redside') { const c = p.color || '#d64545'; return `<defs>${rad(S, c, uid)}</defs><path d="M ${n(-R)} 0 C ${n(-R)} ${n(-R * 0.5)} ${n(-R * 0.4)} ${n(-R * 0.45)} 0 ${n(-R * 0.18)} C ${n(R * 0.4)} ${n(-R * 0.45)} ${n(R)} ${n(-R * 0.5)} ${n(R)} 0 C ${n(R)} ${n(R * 0.5)} ${n(R * 0.4)} ${n(R * 0.45)} 0 ${n(R * 0.18)} C ${n(-R * 0.4)} ${n(R * 0.45)} ${n(-R)} ${n(R * 0.5)} ${n(-R)} 0 Z" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/>`; }
    if (p.kind === 'red') { const c = p.color || '#d64545'; return `<defs>${S.shaded ? `<radialGradient id="${uid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${U.shadeRgb(c, 0.78)}"/><stop offset="0.45" stop-color="${U.lighten(c, 0.1)}"/><stop offset="0.8" stop-color="${c}"/><stop offset="1" stop-color="${U.shadeRgb(c, 0.7)}"/></radialGradient>` : ''}</defs><circle r="${n(R)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/>` + (S.shaded ? '' : `<circle r="${n(R * 0.45)}" fill="${U.shadeRgb(c, 0.85)}"/>`); }
    if (p.kind === 'platelet') { const c = p.color || '#c9a1d8', pts = Array.from({ length: 8 }, (_, i) => { const a = i / 8 * 2 * Math.PI; return [Math.cos(a) * R * (0.7 + 0.3 * (i % 2)), Math.sin(a) * R * 0.6 * (0.7 + 0.3 * ((i + 1) % 2))]; }); return `<defs>${rad(S, c, uid)}</defs><path d="${smooth(pts)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/>`; }
    const c = p.color || '#e9e2f5', nc = '#7b4fb2';
    return `<defs>${rad(S, c, uid)}${rad(S, nc, uid + 'n')}</defs><circle r="${n(R)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/>` + [[-0.3, -0.2], [0.25, -0.25], [0.05, 0.28]].map(q => `<circle cx="${n(q[0] * R)}" cy="${n(q[1] * R)}" r="${n(R * 0.3)}" fill="${F(S, nc, uid + 'n')}" stroke="${E(S, nc)}" stroke-width="${LW(S, 0.5)}"/>`).join('');
  } });

/* ================= organs and organisms ================= */
ann({ type: 'eye', name: 'Human eye (cross-section)', keywords: 'eye cross section cornea lens retina iris optic nerve vision human eye ophthalmology',
  defaults: { d: 30, rays: true, labels: false, sclera: '#f6f1ea', iris: '#5b8fc7', retina: '#e8888f' },
  params: [{ key: 'd', label: 'Diameter', type: 'number', unit: 'mm', min: 5, max: 200, step: 0.5 }, { key: 'rays', label: 'Light focused on the retina', type: 'bool' }, { key: 'labels', label: 'Labels', type: 'bool' },
    { key: 'sclera', label: 'Sclera', type: 'color' }, { key: 'iris', label: 'Iris', type: 'color' }, { key: 'retina', label: 'Retina', type: 'color' }],
  bbox: p => [-p.d * (p.rays ? 0.95 : 0.62), -p.d * 0.55, p.d * 0.78, p.d * 0.55],
  draw(p, S, obj) {
    const R = p.d / 2, uid = idOf(obj, p, 'ey');
    let s = `<defs>${rad(S, p.sclera, uid)}</defs>`;
    // optic nerve, eyeball (sclera), retina lining, cornea bulge
    s += `<path d="M ${n(R * 0.85)} ${n(-R * 0.15)} L ${n(R * 1.5)} ${n(-R * 0.2)} L ${n(R * 1.5)} ${n(R * 0.2)} L ${n(R * 0.85)} ${n(R * 0.15)} Z" fill="${S.shaded ? '#f2d38c' : '#fff3d6'}" stroke="${S.ink}" stroke-width="${LW(S, 0.7)}"/>`;
    s += `<circle r="${n(R)}" fill="${F(S, p.sclera, uid)}" stroke="${S.ink}" stroke-width="${LW(S, 0.9)}"/>`;
    const a0 = 2.3, ret = `M ${n(R * 0.9 * Math.cos(a0))} ${n(-R * 0.9 * Math.sin(a0))} A ${n(R * 0.9)} ${n(R * 0.9)} 0 1 1 ${n(R * 0.9 * Math.cos(a0))} ${n(R * 0.9 * Math.sin(a0))}`;
    s += `<path d="${ret}" fill="none" stroke="${p.retina}" stroke-width="${n(R * 0.08)}"/>`;
    s += `<path d="M ${n(-R * 0.66)} ${n(-R * 0.75)} Q ${n(-R * 1.38)} 0 ${n(-R * 0.66)} ${n(R * 0.75)}" fill="${S.shaded ? '#e6f3fb' : '#ffffff'}" fill-opacity="0.85" stroke="${S.ink}" stroke-width="${LW(S, 0.8)}"/>`;
    // iris and lens
    s += `<path d="M ${n(-R * 0.72)} ${n(-R * 0.62)} L ${n(-R * 0.72)} ${n(-R * 0.22)}" stroke="${p.iris}" stroke-width="${n(R * 0.09)}" stroke-linecap="round"/><path d="M ${n(-R * 0.72)} ${n(R * 0.62)} L ${n(-R * 0.72)} ${n(R * 0.22)}" stroke="${p.iris}" stroke-width="${n(R * 0.09)}" stroke-linecap="round"/>`;
    s += `<ellipse cx="${n(-R * 0.52)}" cy="0" rx="${n(R * 0.17)}" ry="${n(R * 0.36)}" fill="${S.shaded ? '#cfe6f7' : '#eef7fd'}" stroke="${S.ink}" stroke-width="${LW(S, 0.7)}"/>`;
    s += `<circle cx="${n(R * 0.92)}" cy="${n(R * 0.05)}" r="${n(R * 0.05)}" fill="#e2b64c"/>`;
    if (p.rays) { const fx = R * 0.88, col = '#f2b705'; [-0.3, 0, 0.3].forEach(h => { const y = h * R; s += `<path d="M ${n(-R * 1.9)} ${n(y)} L ${n(-R * 0.52)} ${n(y)} L ${n(fx)} ${n(R * 0.04)}" fill="none" stroke="${col}" stroke-width="${LW(S, 0.9)}" stroke-opacity="0.9"/>`; }); s += H.arrowHead(-R * 1.25, 0, 0, 1.1, col); }
    if (p.labels) { const fs = Math.min(S.fs, R * 0.12); [['Cornea', -R * 1.05, -R * 0.82], ['Lens', -R * 0.5, -R * 0.48], ['Retina', R * 0.35, -R * 0.98], ['Optic nerve', R * 1.25, R * 0.35], ['Iris', -R * 0.95, R * 0.75]].forEach(t => { s += txt(S, t[1], t[2], t[0], fs); }); }
    return s;
  } });
ann({ type: 'mouse', name: 'Lab mouse', keywords: 'mouse lab mouse animal model rodent in vivo',
  defaults: { L: 26, color: '#e9e6e1', tail: '#f0b9b4' },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 4, max: 200, step: 0.5 }, { key: 'color', label: 'Fur', type: 'color' }, { key: 'tail', label: 'Tail, ears, feet', type: 'color' }],
  bbox: p => [-p.L * 0.55, -p.L * 0.3, p.L * 0.95, p.L * 0.24],
  draw(p, S, obj) {
    const k = p.L / 26, P = (x, y) => [x * k, y * k], uid = idOf(obj, p, 'mo'), c = p.color, t = p.tail;
    const body = [[-13, 0], [-11, -4], [-6, -6.2], [1, -6.5], [6, -5], [9, -3.5], [12.5, -2.8], [14, -1.2], [12.5, 0.2], [8, 2.4], [2, 3.4], [-6, 3.4], [-11, 2.6]].map(q => P(q[0], q[1]));
    let s = `<defs>${rad(S, c, uid, 0.4, 0.3)}</defs>`;
    s += `<path d="M ${n(-12.5 * k)} ${n(1 * k)} C ${n(-18 * k)} ${n(3 * k)} ${n(-20 * k)} ${n(-4 * k)} ${n(-14 * k)} ${n(-6 * k)}" fill="none" stroke="${t}" stroke-width="${n(0.7 * k)}" stroke-linecap="round"/>`;
    [[-6, 3], [5, 2.8]].forEach(q => { s += `<path d="M ${n(q[0] * k)} ${n(q[1] * k)} l ${n(-0.5 * k)} ${n(1.6 * k)} l ${n(1.5 * k)} 0" fill="none" stroke="${t}" stroke-width="${n(0.6 * k)}" stroke-linecap="round" stroke-linejoin="round"/>`; });
    s += `<path d="${smooth(body)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.9)}"/>`;
    s += `<ellipse cx="${n(6.6 * k)}" cy="${n(-6.4 * k)}" rx="${n(1.9 * k)}" ry="${n(2.4 * k)}" fill="${S.shaded ? t : U.lighten(t, 0.3)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.7)}"/>`;
    s += `<circle cx="${n(10.4 * k)}" cy="${n(-2.9 * k)}" r="${n(0.55 * k)}" fill="#111"/><circle cx="${n(14 * k)}" cy="${n(-1.2 * k)}" r="${n(0.45 * k)}" fill="${t}"/>`;
    [[0, -0.5], [0.4, 0.4]].forEach(q => { s += `<line x1="${n(13.4 * k)}" y1="${n(-1 * k)}" x2="${n((16.2 + q[1]) * k)}" y2="${n((-1.6 + q[0] * 3) * k)}" stroke="${S.ink}" stroke-opacity="0.5" stroke-width="${LW(S, 0.4)}"/>`; });
    return s;
  } });
ann({ type: 'human', name: 'Human figure', keywords: 'human person body people patient silhouette figure',
  defaults: { h: 40, color: '#7d9fc4', pose: 'stand' },
  params: [{ key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 5, max: 300, step: 0.5 }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'pose', label: 'Pose', type: 'select', options: [['stand', 'Standing'], ['arms', 'Arms raised']] }],
  bbox: p => [-p.h * 0.32, -p.h * 0.53, p.h * 0.32, p.h / 2],
  draw(p, S, obj) {
    const k = p.h / 40, uid = idOf(obj, p, 'hu'), c = p.color, up = p.pose === 'arms';
    const cap = (ax, ay, bx, by, r) => { const L = Math.hypot(bx - ax, by - ay) || 1e-9, nx = -(by - ay) / L * r, ny = (bx - ax) / L * r, Q = (x, y) => n(x * k) + ' ' + n(y * k);
      return `<path d="M ${Q(ax + nx, ay + ny)} L ${Q(bx + nx, by + ny)} A ${n(r * k)} ${n(r * k)} 0 0 0 ${Q(bx - nx, by - ny)} L ${Q(ax - nx, ay - ny)} A ${n(r * k)} ${n(r * k)} 0 0 0 ${Q(ax + nx, ay + ny)} Z" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/>`; };
    let s = `<defs>${rad(S, c, uid, 0.4, 0.3)}</defs>`;
    [-1, 1].forEach(sg => { s += up ? cap(sg * 6.2, -9.6, sg * 10.6, -19, 1.6) : cap(sg * 6.6, -9.4, sg * 8.6, 3, 1.6); });
    [-1, 1].forEach(sg => { s += cap(sg * 3, 1.5, sg * 3.4, 18.4, 2.05); });
    s += `<path d="M ${n(-4.6 * k)} ${n(-11.6 * k)} L ${n(4.6 * k)} ${n(-11.6 * k)} Q ${n(7.4 * k)} ${n(-11.6 * k)} ${n(7.4 * k)} ${n(-8.6 * k)} L ${n(6 * k)} ${n(3.6 * k)} L ${n(-6 * k)} ${n(3.6 * k)} L ${n(-7.4 * k)} ${n(-8.6 * k)} Q ${n(-7.4 * k)} ${n(-11.6 * k)} ${n(-4.6 * k)} ${n(-11.6 * k)} Z" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}" stroke-linejoin="round"/>`;
    s += `<circle cx="0" cy="${n(-15.8 * k)}" r="${n(3.6 * k)}" fill="${F(S, c, uid)}" stroke="${E(S, c)}" stroke-width="${LW(S, 0.8)}"/>`;
    return s;
  } });
})();
