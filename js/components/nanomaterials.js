/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/nanomaterials.js
   Nanomaterials drawn in detail for figures and graphical
   abstracts: nanoparticles (sphere, rod, cube, star, prism,
   bipyramid, quantum dot) with shells, ligands and plasmonic
   hot spots; a biosensor surface (gold, thiol SAM, dextran,
   Protein G, streptavidin, antibodies, antigens, blocking);
   crystal unit cells; carbon nanotubes; liposomes, micelles and
   bilayers; polymers (coil, block copolymer, brush, dendrimer).
   Schematic (flat colours, ink lines) or Shaded (gradients).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Nanomaterials';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);
const reg = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const idOf = (obj, p, tag) => 'rbx-nm-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const rnd = seed => { let s = (seed * 2654435761) >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const T = (S, x, y, str, size, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size)}" fill="${o.color || S.ink}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central" ${o.bold ? 'font-weight="700"' : ''}>${RNBX.text ? RNBX.text.markup(String(str), size) : U.esc(str)}</text>`;
const pathOf = (pts, closed = true) => 'M ' + pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + (closed ? ' Z' : '');
const smooth = (P, closed = true) => {
  const N = P.length, at = i => P[closed ? (i + N) % N : U.clamp(i, 0, N - 1)];
  let d = `M ${n(P[0][0])} ${n(P[0][1])}`;
  for (let i = 0; i < (closed ? N : N - 1); i++) { const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2); d += ` C ${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`; }
  return d + (closed ? ' Z' : '');
};
const radial = (id, col, cx = 0.36, cy = 0.3, hi = 0.55) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.8"><stop offset="0" stop-color="${U.lighten(col, hi)}"/><stop offset="0.55" stop-color="${col}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.62)}"/></radialGradient>`;
const linear = (id, col, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 0}"><stop offset="0" stop-color="${U.lighten(col, 0.45)}"/><stop offset="0.45" stop-color="${col}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.6)}"/></linearGradient>`;
const edge = (S, col) => (S.shaded ? U.shadeRgb(col, 0.5) : S.ink);
const LW = (S, k = 0.8) => n(S.lw * k);
const ink = S => (RNBX.isDarkPage && RNBX.isDarkPage(S.doc.page) ? '#e8ecf2' : S.ink);

/* ================= nanoparticles ================= */
const MAT = { au: ['Gold', '#d9a520'], ag: ['Silver', '#c3c9d1'], pt: ['Platinum', '#a7a9ae'], cu: ['Copper', '#c87a4a'], sio2: ['Silica (SiO₂)', '#d5e8f4'], tio2: ['Titania (TiO₂)', '#f1f1ec'], fe3o4: ['Iron oxide (Fe₃O₄)', '#55504a'], cdse: ['CdSe', '#b5452f'], zns: ['ZnS', '#ece4c6'], polymer: ['Polymer (PS, PLGA)', '#9cc3e6'], lipid: ['Lipid / organic', '#f2c48d'] };
const matC = (key, custom) => custom || (MAT[key] || MAT.au)[1];
const MATS = Object.entries(MAT).map(([k, v]) => [k, v[0]]);
/* outline of each shape (closed polygon, counter-clockwise in screen space) and its hot-spot points */
const outline = p => {
  const r = p.r, out = [], N = 96;
  switch (p.shape) {
    case 'rod': { const L = Math.max(r, r * p.aspect) - r; for (let i = 0; i <= N / 2; i++) { const a = -Math.PI / 2 + Math.PI * i / (N / 2); out.push([L + r * Math.cos(a), r * Math.sin(a)]); } for (let i = 0; i <= N / 2; i++) { const a = Math.PI / 2 + Math.PI * i / (N / 2); out.push([-L + r * Math.cos(a), r * Math.sin(a)]); } return { pts: out, hot: [[L + r, 0], [-L - r, 0]] }; }
    case 'cube': { const a = r * 0.95, h = a * 0.5, w = a * 0.87; const P = [[0, -a], [w, -h], [w, h], [0, a], [-w, h], [-w, -h]]; return { pts: P, hot: P.slice(0) }; }
    case 'star': { const k = Math.max(4, Math.round(p.spikes || 7)), P = [], hot = []; for (let i = 0; i < k * 2; i++) { const a = -Math.PI / 2 + Math.PI * i / k, rr = i % 2 ? r * 0.48 : r; P.push([rr * Math.cos(a), rr * Math.sin(a)]); if (!(i % 2)) hot.push([r * Math.cos(a), r * Math.sin(a)]); } return { pts: P, hot, star: true }; }
    case 'prism': { const P = [], hot = []; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / 3; hot.push([r * 1.15 * Math.cos(a), r * 1.15 * Math.sin(a) * 0.8 + r * 0.1]); } const rc = r * 0.16; hot.forEach((v, i) => { const pv = hot[(i + 2) % 3], nx = hot[(i + 1) % 3]; const a1 = [v[0] + (pv[0] - v[0]) * rc / Math.hypot(pv[0] - v[0], pv[1] - v[1]), v[1] + (pv[1] - v[1]) * rc / Math.hypot(pv[0] - v[0], pv[1] - v[1])], a2 = [v[0] + (nx[0] - v[0]) * rc / Math.hypot(nx[0] - v[0], nx[1] - v[1]), v[1] + (nx[1] - v[1]) * rc / Math.hypot(nx[0] - v[0], nx[1] - v[1])]; for (let t = 0; t <= 6; t++) { const u = t / 6, q = [(1 - u) * (1 - u) * a1[0] + 2 * u * (1 - u) * v[0] + u * u * a2[0], (1 - u) * (1 - u) * a1[1] + 2 * u * (1 - u) * v[1] + u * u * a2[1]]; P.push(q); } }); return { pts: P, hot }; }
    case 'bipyramid': { const L = r * Math.max(1.2, p.aspect); const P = [[L, 0], [L * 0.1, r * 0.95], [-L * 0.1, r * 0.95], [-L, 0], [-L * 0.1, -r * 0.95], [L * 0.1, -r * 0.95]]; return { pts: P, hot: [[L, 0], [-L, 0]] }; }
    default: { for (let i = 0; i < N; i++) { const a = 2 * Math.PI * i / N; out.push([r * Math.cos(a), r * Math.sin(a)]); } return { pts: out, hot: [[r, 0], [-r, 0]] }; }
  }
};
/* polygon offset outwards by d (along vertex normals) */
const grow = (P, d) => P.map((q, i) => { const a = P[(i - 1 + P.length) % P.length], b = P[(i + 1) % P.length], tx = b[0] - a[0], ty = b[1] - a[1], L = Math.hypot(tx, ty) || 1; return [q[0] + ty / L * d, q[1] - tx / L * d]; }).map(q => q);
/* points spread evenly along a closed polygon with outward normals */
const along = (P, k) => {
  const seg = P.map((q, i) => { const b = P[(i + 1) % P.length]; return Math.hypot(b[0] - q[0], b[1] - q[1]); }), tot = seg.reduce((a, b) => a + b, 0), out = [];
  let i = 0, acc = 0;
  for (let j = 0; j < k; j++) {
    const t = (j + 0.5) / k * tot;
    while (i < P.length - 1 && acc + seg[i] < t) acc += seg[i++];
    const a = P[i], b = P[(i + 1) % P.length], f = (t - acc) / (seg[i] || 1), x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f, L = seg[i] || 1;
    out.push({ x, y, nx: (b[1] - a[1]) / L, ny: -(b[0] - a[0]) / L });
  }
  return out;
};
const signedArea = P => P.reduce((s, q, i) => { const b = P[(i + 1) % P.length]; return s + q[0] * b[1] - b[0] * q[1]; }, 0) / 2;
const LIG = [['none', 'None'], ['short', 'Short thiols / citrate'], ['long', 'Long alkyl chains (oleylamine)'], ['peg', 'PEG chains'], ['dna', 'DNA strands'], ['antibody', 'Antibodies']];
const ligand = (S, q, p, R) => {
  const L = p.ligLen, c = p.ligC, w = LW(S, 0.9), x0 = q.x, y0 = q.y, nx = q.nx, ny = q.ny, tx = -ny, ty = nx;
  const at = (s, o) => [x0 + nx * s + tx * o, y0 + ny * s + ty * o];
  let s = `<circle cx="${n(x0)}" cy="${n(y0)}" r="${n(Math.max(0.08, L * 0.07))}" fill="#e6c229"/>`;
  if (p.ligand === 'short') { const e = at(L * 0.6, 0); s += `<line x1="${n(x0)}" y1="${n(y0)}" x2="${n(e[0])}" y2="${n(e[1])}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/><circle cx="${n(e[0])}" cy="${n(e[1])}" r="${n(L * 0.09)}" fill="${U.shadeRgb(c, 0.8)}"/>`; }
  else if (p.ligand === 'long') { const pts = []; for (let i = 0; i <= 8; i++) pts.push(at(L * i / 8, (i % 2 ? 1 : -1) * L * 0.05 + Math.sin(i * 0.6 + R() * 6) * L * 0.08 * i / 8)); s += `<path d="${pathOf(pts, false)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linejoin="round"/>`; }
  else if (p.ligand === 'peg') { const pts = [], ph = R() * 6; for (let i = 0; i <= 16; i++) pts.push(at(L * 1.1 * i / 16, Math.sin(i * 1.6 + ph) * L * 0.1)); s += `<path d="${smooth(pts, false)}" fill="none" stroke="${c}" stroke-width="${w}"/>`; }
  else if (p.ligand === 'dna') { const g = L * 0.06; let d1 = [], d2 = []; for (let i = 0; i <= 10; i++) { const s1 = L * 1.2 * i / 10, o = Math.sin(i * 1.1) * g * 1.4; d1.push(at(s1, o - g)); d2.push(at(s1, o + g)); } s += `<path d="${smooth(d1, false)}" fill="none" stroke="${c}" stroke-width="${w}"/><path d="${smooth(d2, false)}" fill="none" stroke="${U.shadeRgb(c, 0.7)}" stroke-width="${w}"/>`; for (let i = 1; i < 10; i += 2) s += `<line x1="${n(d1[i][0])}" y1="${n(d1[i][1])}" x2="${n(d2[i][0])}" y2="${n(d2[i][1])}" stroke="${c}" stroke-width="${LW(S, 0.5)}"/>`; }
  else if (p.ligand === 'antibody') { const a = Math.atan2(ny, nx) * 180 / Math.PI + 90; s += `<g transform="translate(${n(x0)} ${n(y0)}) rotate(${n(a)})">${igY(L * 1.1, '#4c78a8', '#f28e2b', S)}</g>`; }
  return s;
};
/* antibody glyph: stem at (0,0) pointing down to the surface, arms up (−y), height h */
const igY = (h, heavy, light, S, antigen) => {
  const cw = h * 0.13, l = (x1, y1, x2, y2, c) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" stroke="${c}" stroke-width="${n(cw)}" stroke-linecap="round"/>`;
  let s = l(0, -cw * 0.4, 0, -h * 0.48, heavy) + l(0, -h * 0.48, -h * 0.34, -h * 0.9, heavy) + l(0, -h * 0.48, h * 0.34, -h * 0.9, heavy) + l(-cw * 1.1, -h * 0.6, -h * 0.42, -h * 0.8, light) + l(cw * 1.1, -h * 0.6, h * 0.42, -h * 0.8, light);
  if (antigen) antigen.forEach(sg => { if (sg) { const cx = sg * h * 0.42, cy = -h * 1.03, r = h * 0.12, pts = Array.from({ length: 10 }, (_, i) => { const a = i / 10 * 2 * Math.PI, rr = r * (i % 2 ? 0.62 : 1); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; }); s += `<path d="${pathOf(pts)}" fill="${antigen.color || '#54a24b'}" stroke="${U.shadeRgb(antigen.color || '#54a24b', 0.6)}" stroke-width="${n(cw * 0.25)}" stroke-linejoin="round"/>`; } });
  return s;
};
reg({
  type: 'nanoparticle', name: 'Nanoparticle (detailed)', keywords: 'nanoparticle gold silver nanorod nanocube nanostar nanoprism triangle bipyramid core shell quantum dot ligand peg dna thiol citrate hot spot plasmonic functionalised',
  defaults: { shape: 'sphere', r: 6, aspect: 3, spikes: 7, mat: 'au', color: '', shell: 0, shellMat: 'sio2', shellColor: '', ligand: 'short', nlig: 28, ligLen: 2.2, ligC: '#6b7280', hot: false, hotC: '#ffe14d', glow: '' },
  params: [
    { key: 'shape', label: 'Shape', type: 'select', options: [['sphere', 'Sphere'], ['rod', 'Rod'], ['cube', 'Cube'], ['star', 'Star (spiky)'], ['prism', 'Triangular prism / plate'], ['bipyramid', 'Bipyramid']] },
    { key: 'r', label: 'Radius / half-width', type: 'number', unit: 'mm', min: 0.5, max: 100, step: 0.1 },
    { key: 'aspect', label: 'Aspect ratio', type: 'number', min: 1, max: 12, step: 0.1, show: p => p.shape === 'rod' || p.shape === 'bipyramid' },
    { key: 'spikes', label: 'Spikes', type: 'number', min: 4, max: 16, step: 1, show: p => p.shape === 'star' },
    { key: 'mat', label: 'Material', type: 'select', options: MATS }, { key: 'color', label: 'Colour (blank = material)', type: 'color', allowEmpty: true },
    { key: 'shell', label: 'Shell thickness', type: 'number', unit: 'mm', min: 0, max: 50, step: 0.1, hint: '0 = no shell' },
    { key: 'shellMat', label: 'Shell material', type: 'select', options: MATS, show: p => p.shell > 0 }, { key: 'shellColor', label: 'Shell colour', type: 'color', allowEmpty: true, show: p => p.shell > 0 },
    { key: 'ligand', label: 'Surface ligands', type: 'select', options: LIG },
    { key: 'nlig', label: 'Number of ligands', type: 'number', min: 2, max: 200, step: 1, show: p => p.ligand !== 'none' }, { key: 'ligLen', label: 'Ligand length', type: 'number', unit: 'mm', min: 0.3, max: 40, step: 0.1, show: p => p.ligand !== 'none' },
    { key: 'ligC', label: 'Ligand colour', type: 'color', show: p => p.ligand !== 'none' },
    { key: 'hot', label: 'Plasmonic hot spots', type: 'bool' }, { key: 'hotC', label: 'Hot-spot colour', type: 'color', show: p => p.hot },
    { key: 'glow', label: 'Emission glow (quantum dot)', type: 'color', allowEmpty: true }],
  variants: [
    { name: 'Gold nanorod', props: { shape: 'rod', r: 3.5, aspect: 3.5, nlig: 30, ligLen: 1.6, hot: true } },
    { name: 'Gold nanostar', props: { shape: 'star', r: 8, ligand: 'none', hot: true } },
    { name: 'Silver nanocube', props: { shape: 'cube', mat: 'ag', r: 6, ligand: 'long', nlig: 30, ligLen: 1.8 } },
    { name: 'Silver nanoprism', props: { shape: 'prism', mat: 'ag', r: 7, ligand: 'none', hot: true } },
    { name: 'Gold bipyramid', props: { shape: 'bipyramid', r: 3, aspect: 3, ligand: 'none', hot: true } },
    { name: 'Core–shell Au@SiO₂', props: { shell: 2, shellMat: 'sio2', ligand: 'none' } },
    { name: 'PEGylated gold nanoparticle', props: { ligand: 'peg', nlig: 22, ligLen: 4, ligC: '#5b8db8' } },
    { name: 'DNA-functionalised gold nanoparticle', props: { ligand: 'dna', nlig: 16, ligLen: 4.5, ligC: '#d0533a' } },
    { name: 'Antibody-conjugated nanoparticle', props: { ligand: 'antibody', nlig: 10, ligLen: 4 } },
    { name: 'Quantum dot (CdSe/ZnS)', props: { mat: 'cdse', r: 3, shell: 1.2, shellMat: 'zns', ligand: 'long', nlig: 26, ligLen: 2, glow: '#ff6a2a' }, keywords: 'quantum dot qd cdse zns core shell emission' },
    { name: 'Magnetic nanoparticle (Fe₃O₄@SiO₂)', props: { mat: 'fe3o4', r: 4.5, shell: 1.8, shellMat: 'sio2', ligand: 'short', nlig: 24 } },
  ],
  bbox(p) {
    const o = outline(p), ext = Math.max(...o.pts.map(q => Math.abs(q[0]))), eyt = Math.max(...o.pts.map(q => Math.abs(q[1]))), m = (p.shell || 0) + (p.ligand !== 'none' ? p.ligLen * (p.ligand === 'antibody' ? 1.3 : 1.25) : 0) + (p.hot ? p.r * 0.35 : 0) + (p.glow ? p.r * 0.7 : 0) + 0.3;
    return [-ext - m, -eyt - m, ext + m, eyt + m];
  },
  draw(p, S, obj) {
    const uid = idOf(obj, p, 'np'), col = matC(p.mat, p.color), O = outline(p), core = O.pts, R = rnd(7);
    let s = '<defs>';
    if (S.shaded) { s += radial(uid + 'c', col); if (p.shell > 0) s += radial(uid + 's', matC(p.shellMat, p.shellColor), 0.36, 0.3, 0.35); }
    if (p.hot) s += `<radialGradient id="${uid}h"><stop offset="0" stop-color="#ffffff" stop-opacity="0.95"/><stop offset="0.25" stop-color="${p.hotC}" stop-opacity="0.9"/><stop offset="1" stop-color="${p.hotC}" stop-opacity="0"/></radialGradient>`;
    if (p.glow) s += `<radialGradient id="${uid}g"><stop offset="0.45" stop-color="${p.glow}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>`;
    s += '</defs>';
    const ext = Math.max(...core.map(q => Math.hypot(q[0], q[1])));
    if (p.glow) s += `<circle cx="0" cy="0" r="${n(ext + (p.shell || 0) + p.r * 0.7 + (p.ligand !== 'none' ? p.ligLen : 0))}" fill="url(#${uid}g)"/>`;
    const surf = p.shell > 0 ? grow(core, (signedArea(core) > 0 ? 1 : -1) * p.shell) : core;
    // ligands under the particle so their anchors tuck in
    if (p.ligand !== 'none') { const pts = along(surf, Math.max(2, Math.round(p.nlig))), sg = signedArea(surf) > 0 ? 1 : -1; pts.forEach(q => { s += ligand(S, { x: q.x, y: q.y, nx: q.nx * sg, ny: q.ny * sg }, p, R); }); }
    if (p.shell > 0) { const sc = matC(p.shellMat, p.shellColor); s += `<path d="${O.star ? smooth(surf) : pathOf(surf)}" fill="${S.shaded ? `url(#${uid}s)` : sc}" fill-opacity="${S.shaded ? 0.7 : 0.6}" stroke="${edge(S, sc)}" stroke-width="${LW(S, 0.6)}" stroke-linejoin="round"/>`; }
    const fill = S.shaded ? `url(#${uid}c)` : col;
    if (p.shape === 'cube') {
      const a = p.r * 0.95, h = a * 0.5, w = a * 0.87, top = [[0, -a], [w, -h], [0, 0], [-w, -h]], left = [[-w, -h], [0, 0], [0, a], [-w, h]], right = [[0, 0], [w, -h], [w, h], [0, a]];
      [[top, U.lighten(col, 0.3)], [left, col], [right, U.shadeRgb(col, 0.72)]].forEach(([P, c]) => { s += `<path d="${pathOf(P)}" fill="${c}" stroke="${edge(S, col)}" stroke-width="${LW(S, 0.7)}" stroke-linejoin="round"/>`; });
    } else if (p.shape === 'prism') {
      const th = p.r * 0.22, side = core.map(q => [q[0], q[1] + th]);
      s += `<path d="${pathOf(side)}" fill="${U.shadeRgb(col, 0.65)}" stroke="${edge(S, col)}" stroke-width="${LW(S, 0.7)}" stroke-linejoin="round"/>`;
      s += `<path d="${pathOf(core)}" fill="${S.shaded ? fill : U.lighten(col, 0.15)}" stroke="${edge(S, col)}" stroke-width="${LW(S, 0.7)}" stroke-linejoin="round"/>`;
    } else if (p.shape === 'bipyramid') {
      s += `<path d="${pathOf(core)}" fill="${fill}" stroke="${edge(S, col)}" stroke-width="${LW(S, 0.7)}" stroke-linejoin="round"/>`;
      const L = core[0][0];
      s += `<path d="M ${n(L)} 0 L ${n(L * 0.1)} ${n(p.r * 0.95)} L ${n(-L * 0.1)} ${n(p.r * 0.95)} L ${n(-L)} 0 Z" fill="${U.shadeRgb(col, 0.8)}" fill-opacity="0.6"/>`;
      s += `<path d="M ${n(L)} 0 L ${n(-L)} 0 M ${n(L * 0.1)} ${n(-p.r * 0.95)} L ${n(L * 0.1)} ${n(p.r * 0.95)} M ${n(-L * 0.1)} ${n(-p.r * 0.95)} L ${n(-L * 0.1)} ${n(p.r * 0.95)}" stroke="${edge(S, col)}" stroke-width="${LW(S, 0.4)}" fill="none" opacity="0.7"/>`;
    } else {
      s += `<path d="${O.star ? smooth(core) : pathOf(core)}" fill="${fill}" stroke="${edge(S, col)}" stroke-width="${LW(S, 0.7)}" stroke-linejoin="round"/>`;
      if (S.shaded && (p.shape === 'sphere' || p.shape === 'rod')) s += `<ellipse cx="${n(-p.r * 0.35 - (p.shape === 'rod' ? (p.r * p.aspect - p.r) * 0.4 : 0))}" cy="${n(-p.r * 0.42)}" rx="${n(p.r * (p.shape === 'rod' ? 0.25 * p.aspect : 0.28))}" ry="${n(p.r * 0.13)}" fill="#ffffff" opacity="0.5"/>`;
    }
    if (p.hot) O.hot.forEach(q => { s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(p.r * (p.shape === 'star' ? 0.28 : p.shape === 'prism' ? 0.34 : 0.45))}" fill="url(#${uid}h)"/>`; });
    return s;
  },
});

/* ================= biosensor surface (SAM + antibodies) ================= */
const CHEM = [['sam', 'Thiol SAM + EDC/NHS (random)'], ['dextran', 'Carboxymethyl dextran (random)'], ['proteinG', 'Protein A/G (oriented)'], ['streptavidin', 'Streptavidin–biotin (oriented)'], ['physisorb', 'Physical adsorption on gold']];
reg({
  type: 'biosurface', name: 'Biosensor surface (SAM + antibodies)', keywords: 'biosensor spr surface functionalization self assembled monolayer sam thiol gold antibody immobilization edc nhs dextran protein g streptavidin biotin bsa blocking antigen capture',
  hint: 'A cross-section of a sensor surface: gold, the linker chemistry, antibodies and captured antigens. Orientation follows the chemistry unless you set it.',
  defaults: { w: 70, chem: 'sam', orient: 'auto', n: 6, abH: 8, antigen: 0.6, block: true, labels: true, size: 5.5, seed: 4, goldC: '#d9a520', heavy: '#4c78a8', light: '#f28e2b', agC: '#54a24b', samC: '#7d858f' },
  params: [{ key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 20, max: 300, step: 0.5 }, { key: 'chem', label: 'Chemistry', type: 'select', options: CHEM },
    { key: 'orient', label: 'Antibody orientation', type: 'select', options: [['auto', 'Follows the chemistry'], ['up', 'All upright'], ['random', 'Random']] },
    { key: 'n', label: 'Antibodies', type: 'number', min: 1, max: 40, step: 1 }, { key: 'abH', label: 'Antibody height', type: 'number', unit: 'mm', min: 2, max: 60, step: 0.5 },
    { key: 'antigen', label: 'Antigen bound (fraction of free sites)', type: 'range', min: 0, max: 1, step: 0.05 }, { key: 'block', label: 'Blocking protein (BSA)', type: 'bool' },
    { key: 'labels', label: 'Labels', type: 'bool' }, { key: 'size', label: 'Label size', type: 'number', unit: 'pt', min: 3, max: 16, step: 0.5, show: p => p.labels },
    { key: 'seed', label: 'Arrangement', type: 'number', min: 1, max: 999, step: 1 },
    { key: 'goldC', label: 'Gold', type: 'color' }, { key: 'heavy', label: 'Heavy chains', type: 'color' }, { key: 'light', label: 'Light chains', type: 'color' }, { key: 'agC', label: 'Antigen', type: 'color' }, { key: 'samC', label: 'SAM chains', type: 'color' }],
  variants: CHEM.slice(1).map(([k, l]) => ({ name: 'Biosensor surface · ' + l.replace(/ \(.*\)/, ''), props: { chem: k } })),
  labW: p => p.labels ? U.pt2mm(p.size) * 11 : 0,
  bbox(p) { const top = p.abH * 1.25 + (p.chem === 'dextran' ? 6 : p.chem === 'proteinG' || p.chem === 'streptavidin' ? 3.6 : 2.6); return [-p.w / 2, -top, p.w / 2 + this.labW(p), 4.2]; },
  draw(p, S, obj) {
    const uid = idOf(obj, p, 'bs'), W = p.w, R = rnd(p.seed), c = ink(S), fs = U.pt2mm(p.size), h = p.abH;
    const up = p.orient === 'up' || (p.orient === 'auto' && (p.chem === 'proteinG' || p.chem === 'streptavidin'));
    let s = `<defs>${S.shaded ? linear(uid + 'g', p.goldC) : ''}</defs>`;
    s += `<rect x="${n(-W / 2)}" y="0" width="${n(W)}" height="4" fill="${S.shaded ? `url(#${uid}g)` : p.goldC}" stroke="${edge(S, p.goldC)}" stroke-width="${LW(S, 0.6)}"/>`;
    const lab = [], mark = (x, y, t) => lab.push([x, y, t]);
    mark(W / 2 - 3, 2, 'Au');
    // linker layer
    let base = 0;
    if (p.chem !== 'physisorb') {
      const sp = 0.85, L = p.chem === 'dextran' ? 1.6 : 2.4;
      for (let x = -W / 2 + 0.5; x <= W / 2 - 0.4; x += sp) {
        let d = `M ${n(x)} -0.15`; for (let k = 1; k <= 6; k++) d += ` L ${n(x + (k % 2 ? 0.18 : -0.18))} ${n(-0.15 - L * k / 6)}`;
        s += `<circle cx="${n(x)}" cy="-0.15" r="0.16" fill="#e6c229"/><path d="${d}" fill="none" stroke="${p.samC}" stroke-width="${LW(S, 0.55)}" stroke-linejoin="round"/>`;
        if (p.chem === 'sam') s += `<circle cx="${n(x)}" cy="${n(-L - 0.3)}" r="0.2" fill="#d1495b"/>`;
      }
      base = -L - 0.3; mark(W / 2 - 1.5, base / 2, p.chem === 'dextran' ? 'SAM' : 'SAM (thiol, –COOH)');
      if (p.chem === 'dextran') {
        for (let x = -W / 2 + 0.8; x < W / 2; x += 1.7) { const pts = [[x, base]]; let y = base, xx = x; for (let k = 0; k < 9; k++) { y -= 0.7; xx += (R() - 0.5) * 1.2; pts.push([xx, y]); } s += `<path d="${smooth(pts, false)}" fill="none" stroke="#9db7d8" stroke-width="${LW(S, 0.7)}" opacity="0.9"/>`; }
        mark(W / 2 - 1, base - 3, 'carboxymethyl dextran');
      }
    }
    // antibodies with their anchors
    const k = Math.max(1, Math.round(p.n)), pitch = W / k, anchorH = p.chem === 'proteinG' ? 2.6 : p.chem === 'streptavidin' ? 3.2 : 0;
    let freeSites = 0;
    const abs = [];
    for (let i = 0; i < k; i++) {
      const x = U.clamp(-W / 2 + pitch * (i + 0.5) + (R() - 0.5) * pitch * 0.3, -W / 2 + h * 0.65, W / 2 - h * 0.65);
      let ang = 0, y = base - anchorH, lying = false;
      if (!up) { const r = R(); ang = r < 0.35 ? (R() - 0.5) * 30 : r < 0.6 ? 180 + (R() - 0.5) * 20 : (R() < 0.5 ? -1 : 1) * (80 + R() * 25); lying = Math.abs(ang) > 60 && Math.abs(ang) < 120; if (Math.abs(ang) > 150) y -= h * 1.0; if (lying) y -= h * 0.12; }
      else ang = (R() - 0.5) * 16;
      if (p.chem === 'dextran') y -= R() * 3;
      abs.push({ x, y, ang, lying });
      if (p.chem === 'proteinG') s += `<ellipse cx="${n(x)}" cy="${n(base - 1.3)}" rx="1.5" ry="1.25" fill="#a98bd8" stroke="${edge(S, '#a98bd8')}" stroke-width="${LW(S, 0.5)}"/>`;
      if (p.chem === 'streptavidin') { s += `<line x1="${n(x)}" y1="${n(base)}" x2="${n(x)}" y2="${n(base - 1.2)}" stroke="${p.samC}" stroke-width="${LW(S, 0.6)}"/>`; [[-0.55, -1.75], [0.55, -1.75], [-0.55, -2.75], [0.55, -2.75]].forEach(([dx, dy]) => { s += `<circle cx="${n(x + dx)}" cy="${n(base + dy)}" r="0.55" fill="#7fb6a4" stroke="${edge(S, '#7fb6a4')}" stroke-width="${LW(S, 0.4)}"/>`; }); s += `<circle cx="${n(x)}" cy="${n(base - 3.25)}" r="0.22" fill="#e15759"/>`; }
    }
    if (p.block) for (let i = 0; i < k; i++) { const x = -W / 2 + pitch * (i + 1) - pitch * 0.02 + (R() - 0.5) * 0.6; if (x > W / 2 - 1) continue; s += `<path d="${smooth(Array.from({ length: 8 }, (_, j) => { const a = j / 8 * 2 * Math.PI, r = 0.9 + R() * 0.3; return [x + Math.cos(a) * r * 1.2, base - 0.95 + Math.sin(a) * r]; }))}" fill="#c9c9c9" stroke="${edge(S, '#c9c9c9')}" stroke-width="${LW(S, 0.4)}"/>`; }
    abs.forEach((a, i) => {
      // a binding site can catch antigen only if it faces the solution
      const tips = [-1, 1].map(sg => { const ang = (a.ang + sg * 25) * Math.PI / 180; return -Math.cos(ang) < -0.2; });
      const ag = tips.map(ok => ok && (freeSites++, R() < p.antigen) ? 1 : 0);
      const lst = [ag[0] ? -1 : 0, ag[1] ? 1 : 0]; lst.color = p.agC;
      s += `<g transform="translate(${n(a.x)} ${n(a.y)}) rotate(${n(a.ang)})">${igY(h, p.heavy, p.light, S, lst)}</g>`;
    });
    if (p.labels) {
      const lx = W / 2 + 1.2, items = lab.slice();
      const ab = abs.find(a => !a.lying && Math.abs(a.ang) < 40) || abs[0];
      if (ab) { items.push([ab.x + h * 0.15, ab.y - h * 0.5, 'antibody (IgG)']); if (p.antigen > 0) items.push([ab.x + h * 0.42, ab.y - h * 1.03, 'antigen']); }
      if (p.block) items.push([-W / 2 + pitch * 1, base - 0.95, 'BSA (blocking)']);
      if (p.chem === 'proteinG') items.push([abs[0].x + 1.2, base - 1.3, 'Protein G']);
      if (p.chem === 'streptavidin') items.push([abs[0].x + 0.9, base - 2.3, 'streptavidin–biotin']);
      // each label at the height of what it names, pushed apart where they would touch
      items.sort((a, b) => a[1] - b[1]);
      const gap = fs * 1.25, ys = items.map(it => it[1]);
      for (let j = 1; j < ys.length; j++) ys[j] = Math.max(ys[j], ys[j - 1] + gap);
      const over = ys.length ? ys[ys.length - 1] - 3.4 : 0; if (over > 0) for (let j = 0; j < ys.length; j++) ys[j] -= over;
      for (let j = ys.length - 2; j >= 0; j--) ys[j] = Math.min(ys[j], ys[j + 1] - gap);
      items.forEach((it, j) => { const ty = ys[j]; s += `<line x1="${n(it[0])}" y1="${n(it[1])}" x2="${n(lx - 0.3)}" y2="${n(ty)}" stroke="${c}" stroke-width="${LW(S, 0.35)}" opacity="0.6"/>` + T(S, lx, ty, it[2], fs, { anchor: 'start', color: c }); });
    }
    return s;
  },
});

/* ================= crystal unit cells ================= */
const LAT = {
  sc: { name: 'Simple cubic', A: [[0, 0, 0]], bonds: 1.01, names: ['Po'] },
  bcc: { name: 'Body-centred cubic (Fe, W)', A: [[0, 0, 0], [0.5, 0.5, 0.5]], bonds: 0, names: ['Fe'] },
  fcc: { name: 'Face-centred cubic (Au, Ag, Cu)', A: [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], bonds: 0, names: ['Au'] },
  cscl: { name: 'Caesium chloride', A: [[0, 0, 0]], B: [[0.5, 0.5, 0.5]], bonds: 0.87, names: ['Cs', 'Cl'] },
  nacl: { name: 'Rock salt (NaCl, MgO)', A: [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], B: [[0.5, 0, 0], [0, 0.5, 0], [0, 0, 0.5], [0.5, 0.5, 0.5]], bonds: 0.51, names: ['Na', 'Cl'] },
  perovskite: { name: 'Perovskite ABX₃ (CsPbBr₃, SrTiO₃)', A: [[0, 0, 0]], B: [[0.5, 0.5, 0.5]], X: [[0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], bonds: 0.51, bondPair: 'BX', names: ['Cs', 'Pb', 'Br'] },
  diamond: { name: 'Diamond / zinc blende (Si, GaAs)', A: [[0, 0, 0], [0.5, 0.5, 0], [0.5, 0, 0.5], [0, 0.5, 0.5]], B: [[0.25, 0.25, 0.25], [0.75, 0.75, 0.25], [0.75, 0.25, 0.75], [0.25, 0.75, 0.75]], bonds: 0.44, names: ['Si', 'Si'] },
};
reg({
  type: 'unitcell3d', name: 'Crystal unit cell', keywords: 'crystal lattice unit cell simple cubic bcc fcc rock salt nacl cscl perovskite abx3 diamond zinc blende silicon atoms bonds structure',
  defaults: { lattice: 'fcc', a: 18, cells: 1, yaw: 28, pitch: 18, rA: 0.14, rB: 0.11, rX: 0.09, cA: '#d9a520', cB: '#4c78a8', cX: '#c0392b', bonds: true, edges: true, legend: false, nameA: '', nameB: '', nameX: '', size: 6 },
  params: [{ key: 'lattice', label: 'Lattice', type: 'select', options: Object.entries(LAT).map(([k, v]) => [k, v.name]) },
    { key: 'a', label: 'Cell edge (drawn)', type: 'number', unit: 'mm', min: 3, max: 200, step: 0.5 }, { key: 'cells', label: 'Cells per edge', type: 'number', min: 1, max: 3, step: 1 },
    { key: 'yaw', label: 'Turn', type: 'range', min: -90, max: 90, step: 1 }, { key: 'pitch', label: 'Tilt', type: 'range', min: -60, max: 60, step: 1 },
    { key: 'rA', label: 'Atom A size (of a)', type: 'range', min: 0.03, max: 0.35, step: 0.005 }, { key: 'rB', label: 'Atom B size', type: 'range', min: 0.03, max: 0.35, step: 0.005, show: p => !!LAT[p.lattice].B }, { key: 'rX', label: 'Atom X size', type: 'range', min: 0.03, max: 0.35, step: 0.005, show: p => !!LAT[p.lattice].X },
    { key: 'cA', label: 'Atom A', type: 'color' }, { key: 'cB', label: 'Atom B', type: 'color', show: p => !!LAT[p.lattice].B }, { key: 'cX', label: 'Atom X', type: 'color', show: p => !!LAT[p.lattice].X },
    { key: 'bonds', label: 'Bonds', type: 'bool' }, { key: 'edges', label: 'Cell edges', type: 'bool' }, { key: 'legend', label: 'Element key', type: 'bool' },
    { key: 'nameA', label: 'Name A (blank = typical)', type: 'text', show: p => p.legend }, { key: 'nameB', label: 'Name B', type: 'text', show: p => p.legend && !!LAT[p.lattice].B }, { key: 'nameX', label: 'Name X', type: 'text', show: p => p.legend && !!LAT[p.lattice].X },
    { key: 'size', label: 'Key text size', type: 'number', unit: 'pt', min: 3, max: 16, step: 0.5, show: p => p.legend }],
  variants: [
    { name: 'Rock-salt unit cell (NaCl)', props: { lattice: 'nacl', cA: '#8e6cc2', cB: '#4caf50', rA: 0.1, rB: 0.15, legend: true } },
    { name: 'Perovskite unit cell (ABX₃)', props: { lattice: 'perovskite', cA: '#4caf50', cB: '#7f7f7f', cX: '#c0392b', rA: 0.16, rB: 0.1, rX: 0.09, legend: true } },
    { name: 'Diamond / silicon unit cell', props: { lattice: 'diamond', cA: '#8a98a8', cB: '#8a98a8', rA: 0.07, rB: 0.07 } },
    { name: 'Body-centred cubic cell', props: { lattice: 'bcc', cA: '#8a98a8', rA: 0.16, bonds: false } },
  ],
  geom(p) {
    const L = LAT[p.lattice] || LAT.fcc, N = Math.max(1, Math.min(3, Math.round(p.cells))), at = [], eps = 1e-6;
    const add = (list, t) => (list || []).forEach(f => { for (let i = -1; i <= N; i++) for (let j = -1; j <= N; j++) for (let k = -1; k <= N; k++) { const q = [f[0] + i, f[1] + j, f[2] + k]; if (q.every(v => v > -eps && v < N + eps)) at.push({ q, t }); } });
    add(L.A, 'A'); add(L.B, 'B'); add(L.X, 'X');
    const y = U.rad(p.yaw), x = U.rad(p.pitch), c = N / 2;
    const proj = q => { const X0 = q[0] - c, Y0 = q[1] - c, Z0 = q[2] - c; const X1 = X0 * Math.cos(y) - Y0 * Math.sin(y), Y1 = X0 * Math.sin(y) + Y0 * Math.cos(y); const Y2 = Y1 * Math.cos(x) - Z0 * Math.sin(x), Z2 = Y1 * Math.sin(x) + Z0 * Math.cos(x); return [X1 * p.a, -Z2 * p.a, Y2]; };
    return { L, N, at, proj };
  },
  bbox(p) { const r = p.a * Math.max(1, p.cells) * 0.9 + p.a * 0.35; const kw = p.legend ? U.pt2mm(p.size) * 6 : 0; return [-r, -r, r + kw, r]; },
  draw(p, S, obj) {
    const uid = idOf(obj, p, 'uc'), { L, N, at, proj } = this.geom(p), col = { A: p.cA, B: p.cB, X: p.cX }, rad = { A: p.rA, B: p.rB, X: p.rX }, c = ink(S);
    const items = [];
    if (p.edges) { const E = []; for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) { if (!((i === 0 || i === N) && (j === 0 || j === N))) continue; E.push([[i, j, 0], [i, j, N]], [[i, 0, j], [i, N, j]], [[0, i, j], [N, i, j]]); } E.forEach(([a, b]) => { const A = proj(a), B = proj(b); items.push({ z: (A[2] + B[2]) / 2 - 0.5, s: `<line x1="${n(A[0])}" y1="${n(A[1])}" x2="${n(B[0])}" y2="${n(B[1])}" stroke="${c}" stroke-width="${LW(S, 0.5)}" stroke-opacity="0.55"/>` }); }); }
    if (p.bonds && L.bonds) {
      for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) {
        const a = at[i], b = at[j];
        if (L.bondPair === 'BX' && !((a.t === 'B' && b.t === 'X') || (a.t === 'X' && b.t === 'B'))) continue;
        if (!L.bondPair && L.B && a.t === b.t && p.lattice !== 'sc') continue;
        const d = Math.hypot(a.q[0] - b.q[0], a.q[1] - b.q[1], a.q[2] - b.q[2]);
        if (d > L.bonds || d < 0.1) continue;
        const A = proj(a.q), B = proj(b.q);
        items.push({ z: (A[2] + B[2]) / 2, s: `<line x1="${n(A[0])}" y1="${n(A[1])}" x2="${n(B[0])}" y2="${n(B[1])}" stroke="${S.shaded ? '#9aa1ab' : c}" stroke-width="${n(Math.max(S.lw, p.a * 0.025))}" stroke-linecap="round"/>` });
      }
    }
    let defs = '';
    if (S.shaded) ['A', 'B', 'X'].forEach(t => { defs += radial(uid + t, col[t]); });
    at.forEach(a => { const P = proj(a.q), r = rad[a.t] * p.a, depth = 1 - 0.12 * (P[2] / N); items.push({ z: P[2] + 0.001, s: `<circle cx="${n(P[0])}" cy="${n(P[1])}" r="${n(r * depth)}" fill="${S.shaded ? `url(#${uid}${a.t})` : col[a.t]}" stroke="${edge(S, col[a.t])}" stroke-width="${LW(S, 0.5)}"/>` }); });
    items.sort((a, b) => b.z - a.z);
    let s = `<defs>${defs}</defs>` + items.map(i => i.s).join('');
    if (p.legend) {
      const fs = U.pt2mm(p.size), x = p.a * Math.max(1, p.cells) * 0.9 + 1, names = [p.nameA || L.names[0], p.nameB || L.names[1], p.nameX || L.names[2]];
      ['A', 'B', 'X'].filter((t, i) => (t === 'A' || L[t]) && names[i]).forEach((t, i) => { const y = -fs * 1.5 + i * fs * 1.5; s += `<circle cx="${n(x + fs * 0.4)}" cy="${n(y)}" r="${n(fs * 0.38)}" fill="${col[t]}" stroke="${edge(S, col[t])}" stroke-width="${LW(S, 0.5)}"/>` + T(S, x + fs * 1.1, y, names[['A', 'B', 'X'].indexOf(t)], fs, { anchor: 'start', color: c }); });
    }
    return s;
  },
});

/* ================= carbon nanotube ================= */
reg({
  type: 'cnt', name: 'Carbon nanotube', keywords: 'carbon nanotube cnt swcnt mwcnt graphene rolled armchair zigzag hexagonal lattice tube',
  defaults: { L: 40, r: 4, chir: 'armchair', bond: 0.62, color: '#3d4148', walls: 1, atoms: false, back: true },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 4, max: 300, step: 0.5 }, { key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 0.8, max: 40, step: 0.1 },
    { key: 'chir', label: 'Type', type: 'select', options: [['armchair', 'Armchair'], ['zigzag', 'Zigzag']] }, { key: 'bond', label: 'C–C bond (drawn)', type: 'number', unit: 'mm', min: 0.2, max: 4, step: 0.02 },
    { key: 'walls', label: 'Walls', type: 'number', min: 1, max: 4, step: 1 }, { key: 'atoms', label: 'Atoms as dots', type: 'bool' }, { key: 'back', label: 'Show the back wall', type: 'bool' }, { key: 'color', label: 'Colour', type: 'color' }],
  variants: [{ name: 'Multi-walled carbon nanotube', props: { walls: 3, r: 5, bond: 0.7 } }],
  bbox: p => [-p.L / 2 - 0.3, -p.r - 0.5, p.L / 2 + 0.3, p.r + 0.5],
  draw(p, S, obj) {
    const uid = idOf(obj, p, 'cnt'), out = [], walls = Math.max(1, Math.min(4, Math.round(p.walls)));
    let s = `<defs>${S.shaded ? `<linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="0.35" stop-color="#e9edf2" stop-opacity="0.8"/><stop offset="1" stop-color="#9aa3ad" stop-opacity="0.8"/></linearGradient>` : ''}</defs>`;
    s += `<rect x="${n(-p.L / 2)}" y="${n(-p.r)}" width="${n(p.L)}" height="${n(2 * p.r)}" rx="${n(p.r * 0.12)}" fill="${S.shaded ? `url(#${uid})` : '#eef1f4'}" opacity="0.9"/>`;
    for (let wI = walls - 1; wI >= 0; wI--) {
      const r = p.r * (1 - wI * 0.22), C = 2 * Math.PI * r, nC = Math.max(4, Math.round(C / (Math.sqrt(3) * p.bond))), b = C / (nC * Math.sqrt(3));
      const a1 = [Math.sqrt(3) * b, 0], a2 = [Math.sqrt(3) / 2 * b, 1.5 * b], d = [0, b], zig = p.chir === 'zigzag';
      const map = (u, v) => { const ph = u / r; return { x: v, y: r * Math.sin(ph), z: Math.cos(ph) }; };
      const rows = Math.ceil(p.L / (1.5 * b)) + 2, lines = [];
      for (let j = -1; j < rows; j++) for (let i = -1; i < nC + 1; i++) {
        const A = [i * a1[0] + j * a2[0], i * a1[1] + j * a2[1]], nb = [[d[0], d[1]], [d[0] - a2[0], d[1] - a2[1]], [d[0] - a2[0] + a1[0], d[1] - a2[1] + a1[1]]];
        nb.forEach(o => {
          const B = [A[0] + o[0], A[1] + o[1]];
          // lattice coordinates (u around, v along); zigzag tubes swap the two
          let ua = A[0], va = A[1] - p.L / 2, ub = B[0], vb = B[1] - p.L / 2;
          if (zig) { ua = A[1] * (C / (nC * 1.5 * b)) ; va = A[0] - p.L / 2; ub = B[1] * (C / (nC * 1.5 * b)); vb = B[0] - p.L / 2; }
          if (Math.min(va, vb) < -p.L / 2 || Math.max(va, vb) > p.L / 2) return;
          const P = map(ua, va), Q = map(ub, vb), z = (P.z + Q.z) / 2;
          if (z < 0 && !p.back) return;
          if (Math.abs(P.y - Q.y) > r) return;
          lines.push({ z, s: `<line x1="${n(P.x)}" y1="${n(P.y)}" x2="${n(Q.x)}" y2="${n(Q.y)}" stroke="${p.color}" stroke-width="${n(Math.max(S.lw * 0.5, b * 0.12) * (z < 0 ? 0.7 : 1))}" stroke-opacity="${z < 0 ? 0.22 : 0.6 + 0.4 * z}" stroke-linecap="round"/>` + (p.atoms && z >= 0 ? `<circle cx="${n(P.x)}" cy="${n(P.y)}" r="${n(b * 0.16)}" fill="${p.color}"/>` : '') });
        });
      }
      lines.sort((x, y) => x.z - y.z); out.push(lines.map(l => l.s).join(''));
      out.push(`<ellipse cx="${n(-p.L / 2)}" cy="0" rx="${n(r * 0.18)}" ry="${n(r)}" fill="none" stroke="${p.color}" stroke-width="${LW(S, 0.5)}" opacity="0.7"/><ellipse cx="${n(p.L / 2)}" cy="0" rx="${n(r * 0.18)}" ry="${n(r)}" fill="none" stroke="${p.color}" stroke-width="${LW(S, 0.5)}" opacity="0.7"/>`);
    }
    return s + out.join('');
  },
});

/* ================= liposomes, micelles and bilayers ================= */
const lipid = (x, y, nx, ny, hr, tl, S, p) => {
  const tx = -ny, ty = nx, e1 = [x - nx * tl + tx * hr * 0.45, y - ny * tl + ty * hr * 0.45], e2 = [x - nx * tl - tx * hr * 0.45, y - ny * tl - ty * hr * 0.45];
  const bx1 = x - nx * hr * 0.8 + tx * hr * 0.45, by1 = y - ny * hr * 0.8 + ty * hr * 0.45, bx2 = x - nx * hr * 0.8 - tx * hr * 0.45, by2 = y - ny * hr * 0.8 - ty * hr * 0.45;
  return `<path d="M ${n(bx1)} ${n(by1)} Q ${n((bx1 + e1[0]) / 2 + tx * hr * 0.25)} ${n((by1 + e1[1]) / 2 + ty * hr * 0.25)} ${n(e1[0])} ${n(e1[1])} M ${n(bx2)} ${n(by2)} L ${n(e2[0])} ${n(e2[1])}" fill="none" stroke="${p.tailC}" stroke-width="${n(Math.max(S.lw * 0.6, hr * 0.28))}" stroke-linecap="round"/>` +
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(hr)}" fill="${p.headC}" stroke="${edge(S, p.headC)}" stroke-width="${LW(S, 0.4)}"/>`;
};
reg({
  type: 'vesicle', name: 'Liposome / micelle / bilayer', keywords: 'liposome vesicle micelle lipid bilayer membrane phospholipid drug delivery nanocarrier peg stealth cargo amphiphile',
  defaults: { kind: 'liposome', r: 14, w: 50, hr: 0.7, tl: 2.4, headC: '#e5735c', tailC: '#d6b26a', cargo: true, cargoC: '#3a7bd5', peg: false, pegC: '#6aa6c9', seed: 3 },
  params: [{ key: 'kind', label: 'Structure', type: 'select', options: [['liposome', 'Liposome (bilayer vesicle)'], ['micelle', 'Micelle'], ['bilayer', 'Lipid bilayer (membrane patch)']] },
    { key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 3, max: 120, step: 0.5, show: p => p.kind !== 'bilayer' }, { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 300, step: 0.5, show: p => p.kind === 'bilayer' },
    { key: 'hr', label: 'Head-group size', type: 'number', unit: 'mm', min: 0.15, max: 5, step: 0.05 }, { key: 'tl', label: 'Tail length', type: 'number', unit: 'mm', min: 0.5, max: 15, step: 0.1 },
    { key: 'headC', label: 'Head groups', type: 'color' }, { key: 'tailC', label: 'Tails', type: 'color' },
    { key: 'cargo', label: 'Cargo (drug)', type: 'bool', show: p => p.kind !== 'bilayer' }, { key: 'cargoC', label: 'Cargo colour', type: 'color', show: p => p.cargo && p.kind !== 'bilayer' },
    { key: 'peg', label: 'PEG coating (stealth)', type: 'bool', show: p => p.kind === 'liposome' }, { key: 'pegC', label: 'PEG colour', type: 'color', show: p => p.peg && p.kind === 'liposome' },
    { key: 'seed', label: 'Pattern', type: 'number', min: 1, max: 999, step: 1 }],
  variants: [{ name: 'Micelle', props: { kind: 'micelle', r: 8, tl: 4 } }, { name: 'Lipid bilayer (membrane)', props: { kind: 'bilayer' } }, { name: 'Stealth (PEGylated) liposome', props: { peg: true } }],
  bbox: p => p.kind === 'bilayer' ? [-p.w / 2 - p.hr, -p.tl - 2 * p.hr - 0.3, p.w / 2 + p.hr, p.tl + 2 * p.hr + 0.3] : (q => [-q, -q, q, q])(p.r + p.hr + (p.peg && p.kind === 'liposome' ? p.r * 0.22 : 0) + 0.3),
  draw(p, S) {
    const R = rnd(p.seed), hr = p.hr, sp = hr * 2.15;
    let s = '';
    if (p.kind === 'bilayer') {
      const k = Math.floor(p.w / sp);
      for (let i = 0; i < k; i++) { const x = -p.w / 2 + (i + 0.5) * p.w / k; s += lipid(x, -p.tl - hr * 0.6, 0, -1, hr, p.tl, S, p) + lipid(x + (R() - 0.5) * 0.2, p.tl + hr * 0.6, 0, 1, hr, p.tl, S, p); }
      return s;
    }
    const Ro = p.r, ring = (rad, out) => { const k = Math.max(6, Math.floor(2 * Math.PI * rad / sp)), ph = R(); for (let i = 0; i < k; i++) { const a = (i + ph) / k * 2 * Math.PI, nx = Math.cos(a), ny = Math.sin(a); s += lipid(nx * rad, ny * rad, out ? nx : -nx, out ? ny : -ny, hr, p.tl, S, p); } };
    if (p.kind === 'liposome') {
      const Ri = Ro - 2 * p.tl - hr * 1.4;
      if (p.cargo) { s += `<circle cx="0" cy="0" r="${n(Math.max(0.5, Ri - hr))}" fill="${p.cargoC}" fill-opacity="0.12"/>`; for (let i = 0; i < Math.round(Ri * Ri / 6); i++) { const a = R() * 2 * Math.PI, rr = Math.sqrt(R()) * (Ri - hr * 2); s += `<circle cx="${n(Math.cos(a) * rr)}" cy="${n(Math.sin(a) * rr)}" r="${n(hr * 0.6)}" fill="${p.cargoC}"/>`; } }
      if (p.peg) { const k = Math.round(2 * Math.PI * Ro / (sp * 2.5)); for (let i = 0; i < k; i++) { const a = i / k * 2 * Math.PI + R() * 0.1, pts = []; for (let j = 0; j <= 10; j++) { const rr = Ro + hr + j / 10 * Ro * 0.2, aa = a + Math.sin(j * 1.5 + i) * 0.03; pts.push([Math.cos(aa) * rr, Math.sin(aa) * rr]); } s += `<path d="${smooth(pts, false)}" fill="none" stroke="${p.pegC}" stroke-width="${LW(S, 0.8)}"/>`; } }
      if (Ri > hr * 2) ring(Ri, false);
      ring(Ro, true);
    } else {
      if (p.cargo) for (let i = 0; i < Math.round(Ro * 0.8); i++) { const a = R() * 2 * Math.PI, rr = Math.sqrt(R()) * Math.max(0.3, Ro - p.tl - hr * 1.5); s += `<circle cx="${n(Math.cos(a) * rr)}" cy="${n(Math.sin(a) * rr)}" r="${n(hr * 0.55)}" fill="${p.cargoC}"/>`; }
      const k = Math.max(6, Math.floor(2 * Math.PI * Ro / sp)), ph = R();
      for (let i = 0; i < k; i++) { const a = (i + ph) / k * 2 * Math.PI, nx = Math.cos(a), ny = Math.sin(a); s += lipid(nx * Ro, ny * Ro, nx, ny, hr, Math.min(p.tl, Ro - hr), S, p); }
    }
    return s;
  },
});

/* ================= polymers ================= */
reg({
  type: 'polymer', name: 'Polymer (coil, block, brush, dendrimer)', keywords: 'polymer chain random coil block copolymer brush grafted dendrimer pamam generation macromolecule',
  defaults: { kind: 'coil', size: 14, beads: 40, gen: 3, c1: '#4c78a8', c2: '#e45756', bead: true, seed: 5, w: 40 },
  params: [{ key: 'kind', label: 'Kind', type: 'select', options: [['coil', 'Random coil'], ['block', 'Block copolymer'], ['brush', 'Polymer brush on a surface'], ['dendrimer', 'Dendrimer']] },
    { key: 'size', label: 'Size', type: 'number', unit: 'mm', min: 3, max: 150, step: 0.5, show: p => p.kind !== 'brush' }, { key: 'w', label: 'Surface width', type: 'number', unit: 'mm', min: 10, max: 300, step: 0.5, show: p => p.kind === 'brush' },
    { key: 'beads', label: 'Monomers per chain', type: 'number', min: 6, max: 200, step: 1, show: p => p.kind !== 'dendrimer' }, { key: 'gen', label: 'Generations', type: 'number', min: 1, max: 5, step: 1, show: p => p.kind === 'dendrimer' },
    { key: 'c1', label: 'Colour', type: 'color' }, { key: 'c2', label: 'Second colour (block / end groups)', type: 'color', show: p => p.kind !== 'coil' },
    { key: 'bead', label: 'Draw monomers as beads', type: 'bool' }, { key: 'seed', label: 'Shape', type: 'number', min: 1, max: 999, step: 1 }],
  variants: [{ name: 'Block copolymer', props: { kind: 'block' } }, { name: 'Polymer brush', props: { kind: 'brush', beads: 22 } }, { name: 'Dendrimer (PAMAM-like)', props: { kind: 'dendrimer', gen: 4, size: 16 } }],
  bbox: p => p.kind === 'brush' ? [-p.w / 2, -p.w * 0.38, p.w / 2, 1.6] : [-p.size / 2 - 0.5, -p.size / 2 - 0.5, p.size / 2 + 0.5, p.size / 2 + 0.5],
  draw(p, S) {
    const R = rnd(p.seed), bw = Math.max(S.lw, p.kind === 'brush' ? p.w * 0.005 : p.size * 0.012);
    const chain = (pts, cols) => {
      let s = '';
      if (!cols) s += `<path d="${smooth(pts, false)}" fill="none" stroke="${p.c1}" stroke-width="${n(bw * 1.4)}" stroke-linejoin="round" stroke-linecap="round"/>`;
      else { const half = Math.floor(pts.length / 2); s += `<path d="${smooth(pts.slice(0, half + 1), false)}" fill="none" stroke="${p.c1}" stroke-width="${n(bw * 1.4)}" stroke-linecap="round"/><path d="${smooth(pts.slice(half), false)}" fill="none" stroke="${p.c2}" stroke-width="${n(bw * 1.4)}" stroke-linecap="round"/>`; }
      if (p.bead) pts.forEach((q, i) => { const c = cols && i >= pts.length / 2 ? p.c2 : p.c1; s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(bw * 2.2)}" fill="${c}" stroke="${edge(S, c)}" stroke-width="${LW(S, 0.35)}"/>`; });
      return s;
    };
    const walk = (k, step, x0, y0, bias, lim) => { const pts = [[x0, y0]]; let a = bias != null ? bias : R() * 2 * Math.PI; for (let i = 1; i < k; i++) { a += (R() - 0.5) * 1.6; if (bias != null) a = a * 0.75 + bias * 0.25; let x = pts[i - 1][0] + Math.cos(a) * step, y = pts[i - 1][1] + Math.sin(a) * step; if (lim && Math.hypot(x, y) > lim) { a += Math.PI * 0.8; x = pts[i - 1][0] + Math.cos(a) * step; y = pts[i - 1][1] + Math.sin(a) * step; } pts.push([x, y]); } return pts; };
    if (p.kind === 'coil' || p.kind === 'block') {
      const k = Math.round(p.beads), lim = p.size / 2 - bw * 3, step = lim * 2.4 / Math.sqrt(k);
      let pts = walk(k, step, 0, 0, null, lim);
      const cx = pts.reduce((a, q) => a + q[0], 0) / k, cy = pts.reduce((a, q) => a + q[1], 0) / k; pts = pts.map(q => [U.clamp(q[0] - cx, -lim, lim), U.clamp(q[1] - cy, -lim, lim)]);
      return chain(pts, p.kind === 'block');
    }
    if (p.kind === 'brush') {
      let s = `<rect x="${n(-p.w / 2)}" y="0" width="${n(p.w)}" height="1.6" fill="#9aa1ab" stroke="${edge(S, '#9aa1ab')}" stroke-width="${LW(S, 0.5)}"/>`;
      const m = Math.max(3, Math.round(p.w / 3.2)), k = Math.round(p.beads), step = p.w * 0.3 / k * 1.25;
      for (let i = 0; i < m; i++) { const x0 = -p.w / 2 + (i + 0.5) * p.w / m, pts = walk(k, step, x0, -bw * 2, -Math.PI / 2, null).map(q => [U.clamp(q[0], -p.w / 2 + bw * 2, p.w / 2 - bw * 2), Math.max(-p.w * 0.38 + bw * 2, Math.min(-bw * 2, q[1]))]); s += chain(pts, false); s += `<circle cx="${n(pts[pts.length - 1][0])}" cy="${n(pts[pts.length - 1][1])}" r="${n(bw * 2.6)}" fill="${p.c2}"/>`; }
      return s;
    }
    // dendrimer: core, generations branching in two (three at the core)
    const G = Math.max(1, Math.min(5, Math.round(p.gen))), Rm = p.size / 2 - bw * 4, dr = Rm / G;
    let s = '';
    const grow2 = (x, y, a, g, spread) => { if (g > G) { s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(bw * 2.6)}" fill="${p.c2}" stroke="${edge(S, p.c2)}" stroke-width="${LW(S, 0.35)}"/>`; return; } [-1, 1].forEach(sg => { const aa = a + sg * spread / 2, r = g * dr, nx = Math.cos(aa) * r, ny = Math.sin(aa) * r; s += `<line x1="${n(x)}" y1="${n(y)}" x2="${n(nx)}" y2="${n(ny)}" stroke="${p.c1}" stroke-width="${n(bw * 1.3)}" stroke-linecap="round"/>`; if (p.bead) s += `<circle cx="${n(nx)}" cy="${n(ny)}" r="${n(bw * 1.7)}" fill="${p.c1}"/>`; grow2(nx, ny, aa, g + 1, spread / 2); }); };
    for (let i = 0; i < 3; i++) { const a = i * 2 * Math.PI / 3 - Math.PI / 2, x = Math.cos(a) * dr, y = Math.sin(a) * dr; s += `<line x1="0" y1="0" x2="${n(x)}" y2="${n(y)}" stroke="${p.c1}" stroke-width="${n(bw * 1.3)}"/>`; if (p.bead) s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(bw * 1.7)}" fill="${p.c1}"/>`; grow2(x, y, a, 2, 2 * Math.PI / 3); }
    s += `<circle cx="0" cy="0" r="${n(bw * 3.2)}" fill="${U.shadeRgb(p.c1, 0.7)}"/>`;
    return s;
  },
});
})();
