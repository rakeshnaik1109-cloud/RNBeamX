/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/annotations.js
   Connections (optical fibres, electrical wires), figure
   annotations (text, arrows, boxes, panel letters, insets, scale
   bars, abbreviation key) and graphical-abstract elements.

   Annotations live in page space: in the 3D view they stay flat
   on top of the rendered scene, exactly where they were placed.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib, H = lib.H, n = H.n;

/* arrowhead at (x, y) pointing along angle a (radians) */
H.arrowHead = (x, y, a, size, color) => {
  const w = size * 0.42;
  const p1 = [x - Math.cos(a) * size + Math.sin(a) * w, y - Math.sin(a) * size - Math.cos(a) * w];
  const p2 = [x - Math.cos(a) * size - Math.sin(a) * w, y - Math.sin(a) * size + Math.cos(a) * w];
  return `<path d="M ${n(x)} ${n(y)} L ${n(p1[0])} ${n(p1[1])} L ${n(p2[0])} ${n(p2[1])} Z" fill="${color}" stroke="none"/>`;
};

/* world-space axis-aligned box of a component */
lib.worldBox = obj => {
  const def = lib.get(obj.type);
  if (!def || !def.bbox) return [obj.x, obj.y, obj.x, obj.y];
  const b = lib.objBox(obj);
  const pts = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].map(p => U.toWorld(obj, p));
  return [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
};
const boxExit = (c, d, box) => {
  let t = Infinity;
  if (d[0] > 1e-9) t = Math.min(t, (box[2] - c[0]) / d[0]);
  if (d[0] < -1e-9) t = Math.min(t, (box[0] - c[0]) / d[0]);
  if (d[1] > 1e-9) t = Math.min(t, (box[3] - c[1]) / d[1]);
  if (d[1] < -1e-9) t = Math.min(t, (box[1] - c[1]) / d[1]);
  return isFinite(t) ? V.add(c, V.mul(d, t)) : c;
};

/* ================= Connections ================= */
/* fibre types: look (jacket colour, thickness, pattern) and what they do to the light.
   m2 = beam quality of the light leaving the far end (single-mode ≈ 1), wk = output beam
   size factor, pm = keeps the polarisation (every other fibre scrambles it) */
lib.FIBER_TYPES = {
  smf: { name: 'Single-mode (SMF, 9/125 µm)', color: null, k: 1, m2: 1, wk: 1, core: '9 µm', na: 0.14 },
  mmf: { name: 'Multimode OM1/OM2 (62.5 or 50 µm, orange)', color: '#f08a24', k: 1.15, m2: 12, wk: 1.6, core: '50–62.5 µm', na: 0.2 },
  om3: { name: 'Multimode OM3/OM4 (50 µm laser-optimised, aqua)', color: '#35bfc8', k: 1.15, m2: 10, wk: 1.5, core: '50 µm', na: 0.2 },
  lmmf: { name: 'Large-core multimode (105–400 µm, NA 0.22)', color: '#d9661f', k: 1.35, m2: 40, wk: 2.2, core: '105–400 µm', na: 0.22 },
  pm: { name: 'Polarisation-maintaining (PANDA)', color: '#3a6fb5', k: 1, m2: 1, wk: 1, pm: true, pattern: 'stripe', core: '6 µm', na: 0.12 },
  pcf: { name: 'Photonic-crystal / hollow-core', color: '#8a63d2', k: 1.1, m2: 1.1, wk: 1, pattern: 'double', core: '5–30 µm', na: 0.05 },
  bundle: { name: 'Fibre bundle (imaging / collection)', color: '#2b2f36', k: 2.4, m2: 60, wk: 2.5, pattern: 'ribs', core: 'many fibres', na: 0.22 },
  armoured: { name: 'Armoured patch cable (steel spiral)', color: '#8f969f', k: 2, m2: 1, wk: 1, pattern: 'spiral', core: 'SMF inside', na: 0.14 },
  pof: { name: 'Plastic optical fibre (POF, 1 mm)', color: '#1d1f23', k: 1.6, m2: 80, wk: 2.5, core: '980 µm', na: 0.5 },
};
lib.fiberType = p => lib.FIBER_TYPES[p.fiberType] || lib.FIBER_TYPES.smf;

lib.register({
  type: 'fiber', name: 'Optical fibre', abbr: '', category: 'Connections', connection: true, autoLabel: false,
  keywords: 'fiber fibre patch cable single mode multimode pm om3 om4 large core bundle armoured pcf hollow core plastic pof',
  tool: 'fiber', hint: 'Click a fibre coupler, then a second coupler.',
  defaults: { from: '', to: '', fiberType: 'smf', eff: 0.8, colorMode: 'light', color: '', width: 0.9, bend: 0.45, coil: false, length: 40, boots: false },
  params: [
    { key: 'fiberType', label: 'Fibre type', type: 'select', options: () => Object.entries(lib.FIBER_TYPES).map(([k, t]) => [k, t.name]), hint: 'PM keeps the polarisation; multimode fibres give a larger, less coherent output beam' },
    { key: 'eff', label: 'Coupling efficiency', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'colorMode', label: 'Colour', type: 'select', options: [['light', 'Colour of the light inside'], ['jacket', 'Jacket colour']] },
    { key: 'color', label: 'Jacket colour', type: 'color', allowEmpty: true },
    { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.25, max: 6, step: 0.05 },
    { key: 'bend', label: 'Curvature', type: 'range', min: 0, max: 1.5, step: 0.01 },
    { key: 'coil', label: 'Draw a fibre coil', type: 'bool' },
    { key: 'boots', label: 'Connector boots at the ends', type: 'bool', hint: 'thick strain-relief boots, as on patch cables' },
  ],
  geometry(obj, doc) {
    const A = RNBX.getObjIn(doc, obj.props.from), B = RNBX.getObjIn(doc, obj.props.to);
    if (!A || !B) return null;
    const end = o => {
      const d = lib.get(o.type);
      const lp = d && d.fiberPort ? d.fiberPort(o.props) : [0, 0];
      return { p: U.toWorld(o, lp), d: U.dirToWorld(o, d && d.fiberDir ? d.fiberDir(o.props) : [-1, 0]) };
    };
    const a = end(A), b = end(B);
    const D = Math.max(6, V.dist(a.p, b.p)) * obj.props.bend;
    const c1 = V.add(a.p, V.mul(a.d, D)), c2 = V.add(b.p, V.mul(b.d, D));
    return { a: a.p, b: b.p, c1, c2, d: `M ${n(a.p[0])} ${n(a.p[1])} C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(b.p[0])} ${n(b.p[1])}` };
  },
  drawConn(obj, doc, S, trace) {
    const g = this.geometry(obj, doc);
    if (!g) return '';
    const p = obj.props;
    const ft = lib.fiberType(p);
    let col = p.color || ft.color || doc.style.fiberColor || '#f2b705';
    if (p.colorMode === 'light' && trace && trace.fiberLight[obj.id]) {
      const fl = trace.fiberLight[obj.id];
      const best = Object.keys(fl).sort((x, y) => fl[y] - fl[x])[0];
      col = lib.colorOf(doc, Number(best));
    }
    const w = U.pt2mm(p.width || 0.9) * ft.k;
    let s = `<path d="${g.d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
    if (S.shaded) s = `<path d="${g.d}" fill="none" stroke="${U.darken(col, 0.35)}" stroke-width="${n(w * 1.5)}" stroke-linecap="round"/>` + s + `<path d="${g.d}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${n(w * 0.35)}" stroke-linecap="round"/>`;
    // type patterns: PM key stripe, hollow / photonic-crystal double wall, bundle ribs, armour spiral
    if (ft.pattern === 'stripe') s += `<path d="${g.d}" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="${n(w * 0.22)}" stroke-dasharray="${n(w * 2.5)} ${n(w * 1.5)}"/>`;
    if (ft.pattern === 'double') s += `<path d="${g.d}" fill="none" stroke="#ffffff" stroke-opacity="0.9" stroke-width="${n(w * 0.45)}"/><path d="${g.d}" fill="none" stroke="${col}" stroke-width="${n(w * 0.18)}"/>`;
    if (ft.pattern === 'ribs') s += `<path d="${g.d}" fill="none" stroke="#9aa1ab" stroke-opacity="0.8" stroke-width="${n(w * 0.8)}" stroke-dasharray="${n(w * 0.18)} ${n(w * 0.32)}"/>`;
    if (ft.pattern === 'spiral') s += `<path d="${g.d}" fill="none" stroke="#3d434b" stroke-opacity="0.75" stroke-width="${n(w * 0.95)}" stroke-dasharray="${n(w * 0.2)} ${n(w * 0.45)}"/>`;
    if (p.boots) {
      // strain-relief boots: short thick sections leaving each end along the cable
      const boot = (P, C) => { const dx = C[0] - P[0], dy = C[1] - P[1], L = Math.hypot(dx, dy) || 1, l = Math.min(3, L * 0.6), e = [P[0] + dx / L * l, P[1] + dy / L * l]; return `<line x1="${n(P[0])}" y1="${n(P[1])}" x2="${n(e[0])}" y2="${n(e[1])}" stroke="#16181c" stroke-width="${n(Math.max(w * 3.2, 1.1))}" stroke-linecap="round"/>`; };
      s += boot(g.a, g.c1) + boot(g.b, g.c2);
    }
    if (p.coil) {
      // a small spool at the curve midpoint
      const t = 0.5, mt = 1 - t;
      const m = [0, 1].map(i => mt * mt * mt * g.a[i] + 3 * mt * mt * t * g.c1[i] + 3 * mt * t * t * g.c2[i] + t * t * t * g.b[i]);
      for (let k = 0; k < 3; k++) s += `<circle cx="${n(m[0] + (k - 1) * 0.9)}" cy="${n(m[1] - 2.2)}" r="2.2" fill="none" stroke="${col}" stroke-width="${n(w)}"/>`;
    }
    return s;
  },
});

lib.register({
  type: 'wire', name: 'Electrical connection', abbr: '', category: 'Connections', connection: true, autoLabel: false,
  keywords: 'wire cable signal electrical trigger bnc connection',
  tool: 'wire', hint: 'Click the first object, then the second.',
  defaults: { from: '', to: '', route: 'hv', arrow: 'end', dashed: false, color: '', width: 0.5, sag: 0.5 },
  params: [
    { key: 'route', label: 'Routing', type: 'select', options: [['hv', 'Horizontal → vertical'], ['vh', 'Vertical → horizontal'], ['hvh', 'Horizontal–vertical–horizontal'], ['straight', 'Straight'], ['curve', 'Hanging cable (smooth curve)']] },
    { key: 'sag', label: 'Cable sag', type: 'range', min: -1.5, max: 1.5, step: 0.01, show: p => p.route === 'curve', hint: 'negative arches upwards' },
    { key: 'arrow', label: 'Arrowheads', type: 'select', options: [['end', 'At end'], ['start', 'At start'], ['both', 'Both ends'], ['none', 'None']] },
    { key: 'dashed', label: 'Dashed', type: 'bool' },
    { key: 'color', label: 'Colour', type: 'color', allowEmpty: true },
    { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.25, max: 4, step: 0.05 },
  ],
  geometry(obj, doc) {
    const A = RNBX.getObjIn(doc, obj.props.from), B = RNBX.getObjIn(doc, obj.props.to);
    if (!A || !B) return null;
    const ba = lib.worldBox(A), bb = lib.worldBox(B);
    const ca = [(ba[0] + ba[2]) / 2, (ba[1] + ba[3]) / 2], cb = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
    const sgn = v => (v >= 0 ? 1 : -1);
    let pts;
    switch (obj.props.route) {
      case 'vh': {
        const a = boxExit(ca, [0, sgn(cb[1] - ca[1])], ba), b = boxExit(cb, [sgn(ca[0] - cb[0]), 0], bb);
        pts = [a, [a[0], b[1]], b];
        break;
      }
      case 'hvh': {
        const a = boxExit(ca, [sgn(cb[0] - ca[0]), 0], ba), b = boxExit(cb, [sgn(ca[0] - cb[0]), 0], bb), mx = (a[0] + b[0]) / 2;
        pts = [a, [mx, a[1]], [mx, b[1]], b];
        break;
      }
      case 'straight': {
        const dir = V.norm(V.sub(cb, ca));
        pts = [boxExit(ca, dir, ba), boxExit(cb, V.mul(dir, -1), bb)];
        break;
      }
      case 'curve': {
        // a cable hanging between the two parts (cubic curve that sags downwards)
        const dir = V.norm(V.sub(cb, ca)), a = boxExit(ca, dir, ba), b = boxExit(cb, V.mul(dir, -1), bb), L = V.dist(a, b), sag = (obj.props.sag == null ? 0.5 : obj.props.sag) * L * 0.6;
        const c1 = [a[0] + (b[0] - a[0]) * 0.15, a[1] + sag], c2 = [b[0] - (b[0] - a[0]) * 0.15, b[1] + sag];
        return { pts: [a, c1, c2, b], d: `M ${n(a[0])} ${n(a[1])} C ${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(b[0])} ${n(b[1])}` };
      }
      default: {
        const a = boxExit(ca, [sgn(cb[0] - ca[0]), 0], ba), b = boxExit(cb, [0, sgn(ca[1] - cb[1])], bb);
        pts = [a, [b[0], a[1]], b];
      }
    }
    return { pts, d: 'M ' + pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') };
  },
  drawConn(obj, doc, S) {
    const g = this.geometry(obj, doc);
    if (!g) return '';
    const p = obj.props, col = p.color || doc.style.wireColor || '#3a3d42', w = U.pt2mm(p.width || 0.5);
    let s = `<path d="${g.d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linejoin="round" ${p.dashed ? `stroke-dasharray="${n(w * 4)} ${n(w * 3)}"` : ''}/>`;
    const hs = Math.max(1.1, w * 5), P = g.pts;
    const head = (a, b) => H.arrowHead(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), hs, col);
    if (p.arrow === 'end' || p.arrow === 'both') s += head(P[P.length - 2], P[P.length - 1]);
    if (p.arrow === 'start' || p.arrow === 'both') s += head(P[1], P[0]);
    return s;
  },
});

/* ================= Annotations ================= */
const ann = (cfg) => lib.register(Object.assign({ category: 'Annotations', annotation: true, autoLabel: false, abbr: '' }, cfg));
const font = S => U.esc(S.font);

ann({
  type: 'text', name: 'Text', keywords: 'text label caption title equation',
  defaults: { text: 'Label', size: 7, color: '#111111', bold: false, italic: false, anchor: 'middle', bg: '', font: '' },
  params: [{ key: 'text', label: 'Text', type: 'textarea', hint: 'Markup: x_2, x^2, _{sub}, ^{sup}, \\lambda, \\omega, *italic*, **bold**' },
    { key: 'size', label: 'Size', type: 'number', unit: 'pt', min: 3, max: 96, step: 0.5 },
    { key: 'color', label: 'Colour', type: 'color' },
    { key: 'bold', label: 'Bold', type: 'bool' }, { key: 'italic', label: 'Italic', type: 'bool' },
    { key: 'anchor', label: 'Alignment', type: 'select', options: [['start', 'Left'], ['middle', 'Centre'], ['end', 'Right']] },
    { key: 'bg', label: 'Background', type: 'color', allowEmpty: true },
    { key: 'font', label: 'Font (blank = figure font)', type: 'select', options: [['', 'Figure font'], ['Arial, Helvetica, sans-serif', 'Arial / Helvetica'], ['"Times New Roman", Times, serif', 'Times'], ['"Courier New", monospace', 'Courier'], ['Georgia, serif', 'Georgia']] }],
  variants: [{ name: 'Title text', props: { text: 'Title', size: 12, bold: true }, category: 'Graphical abstract' }],
  bbox(p) {
    const fs = U.pt2mm(p.size), lines = String(p.text).split('\n');
    const w = Math.max(...lines.map(l => RNBX.text ? RNBX.text.measure(l, fs) : l.length * fs * 0.55));
    const x0 = p.anchor === 'start' ? 0 : p.anchor === 'end' ? -w : -w / 2;
    return [x0 - 0.5, -fs * 0.7, x0 + w + 0.5, -fs * 0.7 + lines.length * fs * 1.2 + 0.2];
  },
  draw(p, S) {
    const fs = U.pt2mm(p.size), lines = String(p.text).split('\n');
    let s = '';
    if (p.bg) { const b = this.bbox(p); s += `<rect x="${n(b[0] - 0.6)}" y="${n(b[1] - 0.4)}" width="${n(b[2] - b[0] + 1.2)}" height="${n(b[3] - b[1] + 0.6)}" rx="0.8" fill="${p.bg}" stroke="none"/>`; }
    lines.forEach((l, i) => {
      s += `<text x="0" y="${n(i * fs * 1.2)}" font-family="${U.esc(p.font || S.font)}" font-size="${n(fs)}" fill="${p.color}" text-anchor="${p.anchor}" dominant-baseline="central" ${p.bold ? 'font-weight="700"' : ''} ${p.italic ? 'font-style="italic"' : ''}>${RNBX.text.markup(l, fs)}</text>`;
    });
    return s;
  },
});

ann({
  type: 'panel', name: 'Panel letter (a, b, c…)', keywords: 'panel letter label figure part',
  defaults: { text: 'a', size: 8, color: '#000000', bold: true },
  params: [{ key: 'text', label: 'Letter', type: 'text' }, { key: 'size', label: 'Size', type: 'number', unit: 'pt', min: 4, max: 40, step: 0.5, hint: 'Nature: 8 pt bold, lower case' }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'bold', label: 'Bold', type: 'bool' }],
  init(obj, doc) {
    const k = doc.objects.filter(o => o.type === 'panel').length;
    obj.props.text = 'abcdefghijklmnopqrstuvwxyz'[k % 26];
  },
  bbox: p => { const fs = U.pt2mm(p.size); return [-0.3, -fs * 0.85, fs * 0.75 * String(p.text).length + 0.3, fs * 0.25]; },
  draw: (p, S) => `<text x="0" y="0" font-family="${font(S)}" font-size="${n(U.pt2mm(p.size))}" fill="${p.color}" ${p.bold ? 'font-weight="700"' : ''}>${U.esc(p.text)}</text>`,
});

ann({
  type: 'arrow', name: 'Arrow / line', keywords: 'arrow line pointer callout curve',
  defaults: { dx: 18, dy: 0, color: '#222222', width: 0.6, head: 'end', headSize: 1.6, bend: 0, dash: false, label: '', labelSize: 7, labelSide: 1, style: 'line', shaft: 2.4 },
  params: [{ key: 'dx', label: 'Length x', type: 'number', unit: 'mm', step: 0.5 }, { key: 'dy', label: 'Length y', type: 'number', unit: 'mm', step: 0.5 },
    { key: 'style', label: 'Style', type: 'select', options: [['line', 'Line with arrowhead'], ['block', 'Block arrow (wide, filled)']] },
    { key: 'shaft', label: 'Block width', type: 'number', unit: 'mm', min: 0.3, max: 40, step: 0.1, show: p => p.style === 'block' },
    { key: 'bend', label: 'Curvature', type: 'number', unit: 'mm', min: -100, max: 100, step: 0.5 },
    { key: 'head', label: 'Arrowheads', type: 'select', options: [['end', 'End'], ['start', 'Start'], ['both', 'Both'], ['none', 'None (line)']] },
    { key: 'headSize', label: 'Head size', type: 'number', unit: 'mm', min: 0.3, max: 10, step: 0.1 },
    { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 12, step: 0.05 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'dash', label: 'Dashed', type: 'bool' },
    { key: 'label', label: 'Text along the arrow', type: 'text', placeholder: 'e.g. Incident light, Annealing 300 °C' },
    { key: 'labelSize', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 40, step: 0.5, show: p => !!p.label },
    { key: 'labelSide', label: 'Text side', type: 'select', options: [[1, 'Above / left'], [-1, 'Below / right']], show: p => !!p.label }],
  variants: [{ name: 'Line', props: { head: 'none' } }, { name: 'Curved arrow', props: { bend: -6 }, category: 'Graphical abstract' },
    { name: 'Block arrow', props: { style: 'block', dx: 0, dy: 12, shaft: 2.4, headSize: 4, color: '#d9704a' }, category: 'Graphical abstract', keywords: 'block arrow fat thick wide filled light in out direction' },
    { name: 'Process arrow with text', category: 'Graphical abstract', keywords: 'process step fabrication flow arrow text', props: { label: 'Step', width: 1.2, headSize: 2.2 } }],
  bbox: p => { const c = [p.dx / 2 - p.dy / (Math.hypot(p.dx, p.dy) || 1) * p.bend, p.dy / 2 + p.dx / (Math.hypot(p.dx, p.dy) || 1) * p.bend]; const m = 0.8 + (p.label ? U.pt2mm(p.labelSize || 7) * 1.5 : 0); return [Math.min(0, p.dx, c[0]) - m, Math.min(0, p.dy, c[1]) - m, Math.max(0, p.dx, c[0]) + m, Math.max(0, p.dy, c[1]) + m]; },
  handles: p => [{ key: 'end', x: p.dx, y: p.dy }],
  draw(p, S) {
    const L = Math.hypot(p.dx, p.dy) || 1, w = U.pt2mm(p.width);
    if (p.style === 'block') {
      // straight filled arrow: shaft of width "shaft", head twice as wide
      const ux = p.dx / L, uy = p.dy / L, nx = -uy, ny = ux, sw = p.shaft / 2, hw = Math.max(sw * 1.9, sw + 0.4), hl = Math.min(L * 0.6, p.headSize * 1.2);
      const pt = (a, b) => [a * ux + b * nx, a * uy + b * ny], hs = p.head === 'start' || p.head === 'both', he = p.head === 'end' || p.head === 'both', q = [];
      if (hs) q.push(pt(0, 0), pt(hl, -hw), pt(hl, -sw)); else q.push(pt(0, -sw));
      if (he) q.push(pt(L - hl, -sw), pt(L - hl, -hw), pt(L, 0), pt(L - hl, hw), pt(L - hl, sw)); else q.push(pt(L, -sw), pt(L, sw));
      if (hs) q.push(pt(hl, sw), pt(hl, hw)); else q.push(pt(0, sw));
      return `<path d="M ${q.map(v => n(v[0]) + ' ' + n(v[1])).join(' L ')} Z" fill="${p.color}" ${p.dash ? `fill-opacity="0.6"` : ''}/>`;
    }
    const c = [p.dx / 2 - p.dy / L * p.bend, p.dy / 2 + p.dx / L * p.bend];
    const hs = p.headSize;
    // shorten the shaft under the heads so the tips stay sharp
    const aEnd = Math.atan2(p.dy - c[1], p.dx - c[0]), aStart = Math.atan2(0 - c[1], 0 - c[0]);
    const e = (p.head === 'end' || p.head === 'both') ? [p.dx - Math.cos(aEnd) * hs * 0.7, p.dy - Math.sin(aEnd) * hs * 0.7] : [p.dx, p.dy];
    const st = (p.head === 'start' || p.head === 'both') ? [-Math.cos(aStart) * hs * 0.7, -Math.sin(aStart) * hs * 0.7] : [0, 0];
    let s = `<path d="M ${n(st[0])} ${n(st[1])} Q ${n(c[0])} ${n(c[1])} ${n(e[0])} ${n(e[1])}" fill="none" stroke="${p.color}" stroke-width="${n(w)}" stroke-linecap="round" ${p.dash ? `stroke-dasharray="${n(w * 4)} ${n(w * 3)}"` : ''}/>`;
    if (p.head === 'end' || p.head === 'both') s += H.arrowHead(p.dx, p.dy, aEnd, hs, p.color);
    if (p.head === 'start' || p.head === 'both') s += H.arrowHead(0, 0, aStart, hs, p.color);
    if (p.label) {
      // text at the curve's midpoint, offset to one side and kept upright
      const m = [0.25 * 0 + 0.5 * c[0] + 0.25 * p.dx, 0.25 * 0 + 0.5 * c[1] + 0.25 * p.dy], fs = U.pt2mm(p.labelSize || 7);
      let ang = U.deg(Math.atan2(p.dy, p.dx)); const flip = ang > 90 || ang < -90; if (flip) ang -= 180 * Math.sign(ang);
      const nx = p.dy / L, ny = -p.dx / L, sg = (+p.labelSide || 1) * (flip ? -1 : 1), off = w / 2 + fs * 0.75;
      const x = m[0] + nx * off * sg, y = m[1] + ny * off * sg;
      s += `<text x="${n(x)}" y="${n(y)}" font-family="${font(S)}" font-size="${n(fs)}" fill="${p.color}" text-anchor="middle" dominant-baseline="central" transform="rotate(${n(ang)} ${n(x)} ${n(y)})">${RNBX.text.markup(p.label, fs)}</text>`;
    }
    return s;
  },
});

const shapeParams = [
  { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 0.5, max: 400, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 0.5, max: 400, step: 0.5 },
  { key: 'fill', label: 'Fill', type: 'color', allowEmpty: true }, { key: 'fillOpacity', label: 'Fill opacity', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'stroke', label: 'Outline', type: 'color', allowEmpty: true }, { key: 'width', label: 'Outline weight', type: 'number', unit: 'pt', min: 0, max: 12, step: 0.05 },
  { key: 'dash', label: 'Dashed outline', type: 'bool' },
];
const shapeDraw = (tag) => (p) => {
  const w = U.pt2mm(p.width), fill = p.fill || 'none', st = p.stroke || 'none';
  const common = `fill="${fill}" fill-opacity="${p.fillOpacity}" stroke="${st}" stroke-width="${n(w)}" ${p.dash ? `stroke-dasharray="${n(Math.max(w, 0.2) * 4)} ${n(Math.max(w, 0.2) * 3)}"` : ''}`;
  return tag === 'rect'
    ? `<rect x="${n(-p.w / 2)}" y="${n(-p.h / 2)}" width="${n(p.w)}" height="${n(p.h)}" rx="${n(p.rx || 0)}" ${common}/>`
    : `<ellipse cx="0" cy="0" rx="${n(p.w / 2)}" ry="${n(p.h / 2)}" ${common}/>`;
};
ann({
  type: 'rect', name: 'Rectangle / region', keywords: 'rectangle box region frame enclosure highlight dashed',
  defaults: { w: 30, h: 18, fill: '', fillOpacity: 1, stroke: '#5b6470', width: 0.5, dash: true, rx: 1.5 },
  params: shapeParams.concat([{ key: 'rx', label: 'Corner radius', type: 'number', unit: 'mm', min: 0, max: 50, step: 0.1 }]),
  resizable: true, under: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw: shapeDraw('rect'),
});
ann({
  type: 'ellipse', name: 'Ellipse / circle', keywords: 'ellipse circle oval highlight',
  defaults: { w: 16, h: 16, fill: '', fillOpacity: 1, stroke: '#5b6470', width: 0.5, dash: false },
  params: shapeParams, resizable: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw: shapeDraw('ellipse'),
});

ann({
  type: 'image', name: 'Image (PNG / JPG / SVG)', keywords: 'image picture photo import logo micrograph',
  defaults: { href: '', w: 30, h: 20, opacity: 1, aspect: 1.5 },
  params: [{ key: 'href', label: 'Image', type: 'image' }, { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 1, max: 500, step: 0.5 },
    { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 1, max: 500, step: 0.5 }, { key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 }],
  resizable: true, keepAspect: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    if (!p.href) return `<rect x="${n(-p.w / 2)}" y="${n(-p.h / 2)}" width="${n(p.w)}" height="${n(p.h)}" fill="#f1f3f5" stroke="#9aa1ab" stroke-width="0.2" stroke-dasharray="1 0.8"/>` + H.text(S, 0, 0, 'Choose an image in the inspector', { size: Math.min(2.4, p.w / 12), color: '#6b7280' });
    return `<image href="${U.esc(p.href)}" x="${n(-p.w / 2)}" y="${n(-p.h / 2)}" width="${n(p.w)}" height="${n(p.h)}" opacity="${p.opacity}" preserveAspectRatio="none"/>`;
  },
});

ann({
  type: 'inset', name: 'Zoom inset (magnifier)', keywords: 'inset zoom magnify callout detail circle',
  defaults: { r: 3, dx: 26, dy: -14, R: 11, color: '#4b5563', width: 0.5, shape: 'circle', show3d: false },
  params: [{ key: 'r', label: 'Source radius', type: 'number', unit: 'mm', min: 0.3, max: 80, step: 0.1 },
    { key: 'R', label: 'Inset radius', type: 'number', unit: 'mm', min: 1, max: 120, step: 0.5 },
    { key: 'dx', label: 'Inset offset x', type: 'number', unit: 'mm', step: 0.5 }, { key: 'dy', label: 'Inset offset y', type: 'number', unit: 'mm', step: 0.5 },
    { key: 'shape', label: 'Shape', type: 'select', options: [['circle', 'Circle'], ['square', 'Square']] },
    { key: 'color', label: 'Outline colour', type: 'color' }, { key: 'width', label: 'Outline weight', type: 'number', unit: 'pt', min: 0.1, max: 6, step: 0.05 },
    { key: 'show3d', label: 'Show in 3D view', type: 'bool', hint: 'the inset magnifies the page region under its source circle' }],
  special: 'inset',
  bbox: p => [Math.min(-p.r, p.dx - p.R), Math.min(-p.r, p.dy - p.R), Math.max(p.r, p.dx + p.R), Math.max(p.r, p.dy + p.R)],
  handles: p => [{ key: 'target', x: p.dx, y: p.dy }],
});

ann({
  type: 'scalebar', name: 'Scale bar', keywords: 'scale bar length dimension',
  defaults: { len: 10, color: '#111111', width: 1, label: 'auto', size: 6 },
  params: [{ key: 'len', label: 'Drawn length', type: 'number', unit: 'mm', min: 0.5, max: 300, step: 0.5 },
    { key: 'label', label: 'Label ("auto" uses figure scale)', type: 'text' },
    { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5 },
    { key: 'width', label: 'Bar weight', type: 'number', unit: 'pt', min: 0.25, max: 10, step: 0.05 }, { key: 'color', label: 'Colour', type: 'color' }],
  bbox: p => [-p.len / 2 - 0.5, -U.pt2mm(p.size) * 1.6, p.len / 2 + 0.5, 1],
  draw(p, S) {
    const phys = p.len * (S.doc.style.scale || 10);
    const auto = phys >= 1000 ? U.fmt(phys / 1000, 2) + ' m' : phys >= 10 ? U.fmt(phys / 10, 2) + ' cm' : U.fmt(phys, 2) + ' mm';
    const lab = p.label === 'auto' ? auto : p.label, w = U.pt2mm(p.width), fs = U.pt2mm(p.size);
    return `<line x1="${n(-p.len / 2)}" y1="0" x2="${n(p.len / 2)}" y2="0" stroke="${p.color}" stroke-width="${n(w)}"/>` +
      `<line x1="${n(-p.len / 2)}" y1="${n(-0.6)}" x2="${n(-p.len / 2)}" y2="0.6" stroke="${p.color}" stroke-width="${n(w * 0.8)}"/><line x1="${n(p.len / 2)}" y1="-0.6" x2="${n(p.len / 2)}" y2="0.6" stroke="${p.color}" stroke-width="${n(w * 0.8)}"/>` +
      `<text x="0" y="${n(-fs * 0.75)}" font-family="${font(S)}" font-size="${n(fs)}" fill="${p.color}" text-anchor="middle">${U.esc(lab)}</text>`;
  },
});

ann({
  type: 'legend', name: 'Abbreviation key', keywords: 'legend key abbreviations list glossary',
  defaults: { size: 6, color: '#222222', cols: 2, frame: true },
  params: [{ key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 20, step: 0.5 }, { key: 'cols', label: 'Columns', type: 'number', min: 1, max: 6, step: 1 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'frame', label: 'Frame', type: 'bool' }],
  hint: 'Lists the abbreviations used in this figure, ready for the caption too (Figure ▸ Caption helper).',
  entries: doc => RNBX.abbreviations(doc),
  layout(p, doc) {
    const e = this.entries(doc), fs = U.pt2mm(p.size), cols = Math.max(1, p.cols | 0), rows = Math.ceil(e.length / cols) || 1;
    const colW = Math.max(18, ...e.map(x => (RNBX.text ? RNBX.text.measure(x[0] + '  ' + x[1], fs) : 20) + 2));
    return { e, fs, cols, rows, colW, w: cols * colW + 1.5, h: rows * fs * 1.35 + 1.5 };
  },
  bbox(p, obj, doc) { const L = this.layout(p, doc || RNBX.state.doc); return [0, 0, L.w, L.h]; },
  draw(p, S) {
    const L = this.layout(p, S.doc);
    let s = p.frame ? `<rect x="0" y="0" width="${n(L.w)}" height="${n(L.h)}" rx="0.8" fill="#ffffff" fill-opacity="0.9" stroke="${p.color}" stroke-width="${n(S.lw * 0.8)}"/>` : '';
    L.e.forEach((x, i) => {
      const c = Math.floor(i / L.rows), r = i % L.rows;
      s += `<text x="${n(0.9 + c * L.colW)}" y="${n(0.75 + (r + 0.5) * L.fs * 1.35)}" font-family="${font(S)}" font-size="${n(L.fs)}" fill="${p.color}" dominant-baseline="central"><tspan font-weight="700">${U.esc(x[0])}</tspan>  ${U.esc(x[1])}</text>`;
    });
    if (!L.e.length) s += H.text(S, 9, 2, 'Add components to fill the key', { size: L.fs, color: '#888' });
    return s;
  },
});

/* ---------- interference fringes linked to a detector ---------- */
ann({
  type: 'fringes', name: 'Interference fringes', keywords: 'interference fringes rings pattern michelson mach zehnder visibility phase',
  defaults: { detector: '', pattern: 'rings', size: 14, density: 5, color: '', showValue: true, frame: true },
  params: [
    { key: 'detector', label: 'Detector', type: 'select', options: () => [['', '— choose —']].concat(RNBX.state.doc.objects.filter(o => { const d = lib.get(o.type); return d && d.category === 'Detectors'; }).map(o => [o.id, (o.label && o.label.text ? RNBX.text.fill(o.label.text, o.props) : lib.get(o.type).name)])) },
    { key: 'pattern', label: 'Pattern', type: 'select', options: [['rings', 'Circular (Michelson / tilt-free)'], ['lines', 'Straight (slight tilt)']] },
    { key: 'density', label: 'Fringe density', type: 'number', min: 0.5, max: 40, step: 0.5 },
    { key: 'size', label: 'Size', type: 'number', unit: 'mm', min: 3, max: 100, step: 0.5 },
    { key: 'color', label: 'Colour (blank = wavelength)', type: 'color', allowEmpty: true },
    { key: 'showValue', label: 'Show Δφ and visibility', type: 'bool' }, { key: 'frame', label: 'Frame', type: 'bool' }],
  hint: 'Shows the pattern a camera would see at the linked detector. Animate a mirror’s piezo displacement to make the fringes move.',
  bbox: p => [-p.size / 2, -p.size / 2, p.size / 2, p.size / 2 + (p.showValue ? 3.2 : 0)],
  draw(p, S, obj) {
    const R = p.size / 2, h = S.trace && p.detector ? S.trace.hits[p.detector] : null;
    const I = h && h.interf;
    let s = '';
    if (!I) {
      s += `<rect x="${n(-R)}" y="${n(-R)}" width="${n(2 * R)}" height="${n(2 * R)}" fill="#f1f3f5" stroke="#9aa1ab" stroke-width="0.2" stroke-dasharray="1 0.8"/>`;
      return s + H.text(S, 0, 0, p.detector ? 'No interfering beams here' : 'Link a detector', { size: Math.min(2.2, R / 4), color: '#6b7280' });
    }
    const col = p.color || lib.colorOf(S.doc, I.lambda);
    const a = Math.sqrt(I.I1), b = Math.sqrt(I.I2), Imax = (a + b) * (a + b) || 1;
    const val = x => (I.I1 + I.I2 + 2 * a * b * I.overlap * Math.cos(I.dphi + x)) / Imax;
    const cid = 'rbx-fr-' + (obj ? obj.id : 'x');
    s += `<defs><clipPath id="${cid}">${p.pattern === 'rings' ? `<circle cx="0" cy="0" r="${n(R)}"/>` : `<rect x="${n(-R)}" y="${n(-R)}" width="${n(2 * R)}" height="${n(2 * R)}"/>`}</clipPath></defs><g clip-path="url(#${cid})">`;
    if (p.pattern === 'rings') {
      const N = 64;
      for (let i = N; i >= 1; i--) {
        const r = R * i / N, ph = Math.PI * p.density * Math.pow(i / N, 2) * 2;
        s += `<circle cx="0" cy="0" r="${n(r)}" fill="${U.mix('#000000', col, U.clamp(val(ph), 0, 1))}"/>`;
      }
    } else {
      const N = 72, w = 2 * R / N;
      for (let i = 0; i < N; i++) {
        const x = -R + (i + 0.5) * w, ph = 2 * Math.PI * p.density * (x / (2 * R));
        s += `<rect x="${n(-R + i * w)}" y="${n(-R)}" width="${n(w + 0.02)}" height="${n(2 * R)}" fill="${U.mix('#000000', col, U.clamp(val(ph), 0, 1))}"/>`;
      }
    }
    s += '</g>';
    if (p.frame) s += p.pattern === 'rings' ? `<circle cx="0" cy="0" r="${n(R)}" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw)}"/>` : `<rect x="${n(-R)}" y="${n(-R)}" width="${n(2 * R)}" height="${n(2 * R)}" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw)}"/>`;
    if (p.showValue) {
      const deg = ((U.deg(I.dphi) % 360) + 360) % 360;
      s += `<text x="0" y="${n(R + 2.4)}" font-family="${U.esc(S.font)}" font-size="${n(S.fs * 0.85)}" fill="${RNBX.isDarkPage(S.doc.page) ? '#e8ecf2' : S.ink}" text-anchor="middle">${RNBX.text.markup(`Δφ = ${U.fmt(deg, 0)}° · V = ${U.fmt(I.vis, 2)}`)}</text>`;
    }
    return s;
  },
});

/* ================= Graphical-abstract elements ================= */
const ga = cfg => lib.register(Object.assign({ category: 'Graphical abstract', annotation: true, autoLabel: false, abbr: '' }, cfg));
ga({
  type: 'glow', name: 'Glow / focal spot', keywords: 'glow spot focus sparkle light bloom flare',
  defaults: { r: 4, color: '#46c3ff', strength: 0.9 },
  params: [{ key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 0.3, max: 120, step: 0.1 }, { key: 'color', label: 'Colour', type: 'color' }, { key: 'strength', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.01 }],
  bbox: p => [-p.r, -p.r, p.r, p.r],
  draw(p, S, obj) {
    const id = 'rbx-glow-' + (obj ? obj.id : 'x');
    return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="#ffffff" stop-opacity="${p.strength}"/><stop offset="0.18" stop-color="${p.color}" stop-opacity="${p.strength}"/><stop offset="0.55" stop-color="${p.color}" stop-opacity="${p.strength * 0.3}"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></radialGradient></defs><circle cx="0" cy="0" r="${n(p.r)}" fill="url(#${id})"/>`;
  },
});
ga({
  type: 'pulse', name: 'Light pulse (wave packet)', keywords: 'pulse wave packet ultrafast femtosecond oscillation',
  defaults: { L: 18, A: 3, cycles: 9, color: '#e52521', width: 0.8, envelope: true },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 2, max: 200, step: 0.5 }, { key: 'A', label: 'Amplitude', type: 'number', unit: 'mm', min: 0.2, max: 60, step: 0.1 },
    { key: 'cycles', label: 'Optical cycles', type: 'number', min: 1, max: 60, step: 0.5 }, { key: 'envelope', label: 'Gaussian envelope', type: 'bool' },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 8, step: 0.05 }],
  bbox: p => [-p.L / 2, -p.A, p.L / 2, p.A],
  draw(p) {
    let d = '';
    const N = Math.max(60, Math.round(p.cycles * 24));
    for (let i = 0; i <= N; i++) {
      const u = i / N, x = -p.L / 2 + p.L * u;
      const env = p.envelope ? Math.exp(-Math.pow((u - 0.5) / 0.2, 2)) : 1;
      d += (i ? ' L ' : 'M ') + n(x) + ' ' + n(-p.A * env * Math.sin(u * p.cycles * 2 * Math.PI));
    }
    return `<path d="${d}" fill="none" stroke="${p.color}" stroke-width="${n(U.pt2mm(p.width))}" stroke-linejoin="round" stroke-linecap="round"/>`;
  },
});
ga({
  type: 'photon', name: 'Photon (wavy arrow, hν)', keywords: 'photon wavy arrow h nu emission excitation',
  defaults: { L: 14, A: 0.9, cycles: 5, color: '#1fae3e', width: 0.7, label: 'hν' },
  params: [{ key: 'L', label: 'Length', type: 'number', unit: 'mm', min: 2, max: 120, step: 0.5 }, { key: 'A', label: 'Amplitude', type: 'number', unit: 'mm', min: 0.1, max: 10, step: 0.1 },
    { key: 'cycles', label: 'Waves', type: 'number', min: 1, max: 30, step: 0.5 }, { key: 'label', label: 'Label', type: 'text' },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 8, step: 0.05 }],
  bbox: p => [-p.L / 2, -p.A - 3, p.L / 2, p.A + 0.5],
  draw(p, S) {
    let d = '';
    const N = Math.round(p.cycles * 20), L = p.L - 1.6;
    for (let i = 0; i <= N; i++) { const u = i / N; d += (i ? ' L ' : 'M ') + n(-p.L / 2 + L * u) + ' ' + n(p.A * Math.sin(u * p.cycles * 2 * Math.PI)); }
    const w = U.pt2mm(p.width);
    return `<path d="${d}" fill="none" stroke="${p.color}" stroke-width="${n(w)}" stroke-linecap="round"/>` + `<line x1="${n(p.L / 2 - 1.8)}" y1="0" x2="${n(p.L / 2 - 1.2)}" y2="0" stroke="${p.color}" stroke-width="${n(w)}"/>` + H.arrowHead(p.L / 2, 0, 0, 1.6, p.color) +
      (p.label ? `<text x="0" y="${n(-p.A - 1.2)}" font-family="${font(S)}" font-size="${n(S.fs)}" font-style="italic" fill="${p.color}" text-anchor="middle">${RNBX.text.markup(p.label)}</text>` : '');
  },
});
ga({
  type: 'sphere', name: 'Nanoparticle / sphere', keywords: 'nanoparticle sphere gold silver ball atom molecule bead',
  defaults: { r: 2.5, color: '#e3b341' },
  params: [{ key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 0.2, max: 60, step: 0.1 }, { key: 'color', label: 'Colour', type: 'color' }],
  variants: [{ name: 'Silver nanoparticle', props: { color: '#c9ced6' } }],
  bbox: p => [-p.r, -p.r, p.r, p.r],
  draw(p, S, obj) {
    const id = 'rbx-sph-' + (obj ? obj.id : 'x');
    return `<defs><radialGradient id="${id}" cx="0.35" cy="0.32" r="0.75"><stop offset="0" stop-color="#ffffff"/><stop offset="0.25" stop-color="${U.lighten(p.color, 0.35)}"/><stop offset="0.75" stop-color="${p.color}"/><stop offset="1" stop-color="${U.darken(p.color, 0.45)}"/></radialGradient></defs><circle cx="0" cy="0" r="${n(p.r)}" fill="url(#${id})"/>`;
  },
});
})();
