/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/diagrams.js
   Diagrams & AI: neural networks (fully connected, CNN,
   Transformer), flowchart boxes and a flow connector that stays
   attached to its boxes.

   Everything is generated from a few settings, e.g. layer sizes
   "3, 5, 5, 2" or a CNN spec "Input:32x32x3, Conv:30x30x16, …",
   and follows the figure style: Schematic (flat fills, ink lines)
   or Shaded (soft gradients, a shadow). Figure graphics: they do
   not take part in the ray tracing.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Diagrams & AI';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);
const ann = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const idOf = (obj, p, tag) => 'rbx-dg-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const rnd = seed => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const txt = (S, x, y, str, size, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size)}" fill="${o.color || S.ink}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central" ${o.bold ? 'font-weight="700"' : ''} ${o.italic ? 'font-style="italic"' : ''} ${o.extra || ''}>${RNBX.text.markup(str, size)}</text>`;
/* several lines of text centred on (x, y) */
const lines = (S, x, y, str, size, o = {}) => { const L = String(str == null ? '' : str).split(/\n|\\n/), h = size * 1.2; return L.map((t, i) => txt(S, x, y + (i - (L.length - 1) / 2) * h, t, size, o)).join(''); };
const palette = (str, k, dflt) => { const a = String(str || '').split(',').map(q => q.trim()).filter(q => /^#[0-9a-fA-F]{3,6}$/.test(q)); return a.length ? a[Math.min(k, a.length - 1)] : dflt; };
/* a shaded look for any fill: vertical gradient, defined once per colour */
const grad = (S, col, id) => S.shaded ? `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.lighten(col, 0.28)}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.86)}"/></linearGradient>` : '';
const ballGrad = (S, col, id) => S.shaded ? `<radialGradient id="${id}" cx="0.36" cy="0.32" r="0.75"><stop offset="0" stop-color="${U.lighten(col, 0.55)}"/><stop offset="0.6" stop-color="${col}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.72)}"/></radialGradient>` : '';
const cid = col => String(col).replace('#', '');

/* ================= fully connected network ================= */
const parseSizes = s => String(s || '').split(/[,;\s]+/).map(v => Math.max(1, Math.round(+v) || 0)).filter(v => v > 0);
ann({ type: 'nnet', name: 'Neural network (fully connected)', keywords: 'neural network mlp perceptron deep learning ai machine learning layers nodes neurons autoencoder',
  defaults: { layers: '3, 5, 5, 2', titles: 'Input, Hidden, Hidden, Output', colors: '#7fb3d5, #a3d9b1, #a3d9b1, #f5b7b1', r: 2.2, gap: 1.6, spacing: 18, maxShow: 7,
    links: 'all', linkColor: '#6b7480', linkAlpha: 0.45, linkWidth: 0.35, weights: false, seed: 2, inLabels: true, outLabels: true, symbol: '', orient: 'h', counts: true, bias: false },
  params: [
    { key: 'layers', label: 'Nodes per layer', type: 'text', hint: 'e.g. 3, 5, 5, 2 (an autoencoder: 8, 4, 2, 4, 8)' },
    { key: 'titles', label: 'Layer names (comma separated)', type: 'text' },
    { key: 'colors', label: 'Layer colours (comma separated)', type: 'text' },
    { key: 'orient', label: 'Direction', type: 'select', options: [['h', 'Left to right'], ['v', 'Bottom to top']] },
    { key: 'r', label: 'Node radius', type: 'number', unit: 'mm', min: 0.3, max: 20, step: 0.1 },
    { key: 'gap', label: 'Gap between nodes', type: 'number', unit: 'mm', min: 0, max: 30, step: 0.1 },
    { key: 'spacing', label: 'Distance between layers', type: 'number', unit: 'mm', min: 3, max: 120, step: 0.5 },
    { key: 'maxShow', label: 'Nodes shown per layer at most', type: 'number', min: 3, max: 40, step: 1, hint: 'bigger layers are folded with ⋮ and their size is written below' },
    { key: 'links', label: 'Connections', type: 'select', options: [['all', 'Every node to every node'], ['none', 'None'], ['bundle', 'One band per layer pair']] },
    { key: 'weights', label: 'Weights as colour and thickness (+ blue, − red)', type: 'bool', show: p => p.links === 'all' },
    { key: 'seed', label: 'Weight pattern', type: 'number', min: 1, max: 999, step: 1, show: p => p.links === 'all' && p.weights },
    { key: 'linkColor', label: 'Connection colour', type: 'color', show: p => p.links !== 'none' && !p.weights },
    { key: 'linkAlpha', label: 'Connection opacity', type: 'range', min: 0.05, max: 1, step: 0.01, show: p => p.links !== 'none' },
    { key: 'linkWidth', label: 'Connection weight', type: 'number', unit: 'pt', min: 0.1, max: 3, step: 0.05, show: p => p.links !== 'none' },
    { key: 'inLabels', label: 'Input labels x₁ … xₙ', type: 'bool' }, { key: 'outLabels', label: 'Output labels ŷ₁ … ŷₙ', type: 'bool' },
    { key: 'symbol', label: 'Symbol in hidden nodes', type: 'text', placeholder: 'e.g. σ or Σ' },
    { key: 'bias', label: 'Bias nodes (+1)', type: 'bool' },
    { key: 'counts', label: 'Layer size under folded layers', type: 'bool' },
  ],
  geom(p) {
    const sizes = parseSizes(p.layers); if (!sizes.length) sizes.push(1);
    const step = p.r * 2 + p.gap, maxN = Math.max(3, p.maxShow | 0);
    const layers = sizes.map((N, li) => {
      const fold = N > maxN, k = fold ? maxN : N, top = fold ? Math.ceil((maxN - 1) / 2) : k;
      const slots = []; for (let i = 0; i < k; i++) slots.push(fold && i === top ? { dots: true } : { idx: fold && i > top ? N - (k - i) : i });
      const bias = p.bias && li < sizes.length - 1;
      const all = bias ? [{ bias: true }].concat(slots) : slots;
      return { N, fold, nodes: all.map((s, i) => Object.assign(s, { u: (i - (all.length - 1) / 2) * step })) };
    });
    const span = Math.max(...layers.map(L => L.nodes.length)) * step;
    return { layers, step, span, len: (sizes.length - 1) * p.spacing };
  },
  bbox(p) { const g = this.geom(p), pad = p.r + 6; return p.orient === 'v' ? [-g.span / 2 - pad - 4, -g.len / 2 - pad - 3, g.span / 2 + pad + 4, g.len / 2 + pad + 3] : [-g.len / 2 - pad - 3, -g.span / 2 - pad, g.len / 2 + pad + 3, g.span / 2 + pad + 4]; },
  draw(p, S, obj) {
    const g = this.geom(p), uid = idOf(obj, p, 'nn'), vert = p.orient === 'v', titles = String(p.titles || '').split(',').map(t => t.trim());
    const at = (li, u) => { const t = -g.len / 2 + li * p.spacing; return vert ? [u, -t] : [t, u]; };
    const fs = Math.min(S.fs, p.r * 1.2), r = rnd(p.seed * 7919 + 1), real = L => L.nodes.filter(q => !q.dots);
    let defs = '', s = '', links = '';
    // connections
    if (p.links === 'all') {
      for (let li = 0; li < g.layers.length - 1; li++) real(g.layers[li]).forEach(a => real(g.layers[li + 1]).forEach(b => {
        if (b.bias) return;
        const A = at(li, a.u), B = at(li + 1, b.u);
        let col = p.linkColor, w = U.pt2mm(p.linkWidth), op = p.linkAlpha;
        if (p.weights) { const v = r() * 2 - 1; col = v >= 0 ? '#2e6fd8' : '#d6452e'; w = U.pt2mm(p.linkWidth) * (0.4 + 2.2 * Math.abs(v)); op = Math.min(1, p.linkAlpha * (0.5 + Math.abs(v))); }
        links += `<line x1="${n(A[0])}" y1="${n(A[1])}" x2="${n(B[0])}" y2="${n(B[1])}" stroke="${col}" stroke-opacity="${n(op)}" stroke-width="${n(w)}"/>`;
      }));
    } else if (p.links === 'bundle') {
      for (let li = 0; li < g.layers.length - 1; li++) {
        const a = real(g.layers[li]), b = real(g.layers[li + 1]), A0 = at(li, a[0].u), A1 = at(li, a[a.length - 1].u), B0 = at(li + 1, b[0].u), B1 = at(li + 1, b[b.length - 1].u);
        links += `<path d="M ${n(A0[0])} ${n(A0[1])} L ${n(B0[0])} ${n(B0[1])} L ${n(B1[0])} ${n(B1[1])} L ${n(A1[0])} ${n(A1[1])} Z" fill="${p.linkColor}" fill-opacity="${n(p.linkAlpha * 0.5)}" stroke="none"/>`;
      }
    }
    s += links;
    // nodes
    g.layers.forEach((L, li) => {
      const col = palette(p.colors, li, '#a3d9b1'), gid = `${uid}-n${li}`;
      defs += ballGrad(S, col, gid);
      L.nodes.forEach(q => {
        const c = at(li, q.u);
        if (q.dots) { s += txt(S, c[0], c[1], vert ? '⋯' : '⋮', p.r * 2.2, { color: S.ink }); return; }
        if (q.bias) { s += `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(p.r * 0.85)}" fill="#ffffff" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}" stroke-dasharray="${n(S.lw * 2)} ${n(S.lw * 1.4)}"/>` + txt(S, c[0], c[1], '+1', fs * 0.85); return; }
        s += `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(p.r)}" fill="${S.shaded ? `url(#${gid})` : col}" stroke="${S.shaded ? U.shadeRgb(col, 0.6) : S.ink}" stroke-width="${n(S.lw * 0.8)}"/>`;
        const last = li === g.layers.length - 1;
        if (li === 0 && p.inLabels) s += txt(S, c[0], c[1], `x_{${q.idx + 1}}`, fs, { italic: true });
        else if (last && p.outLabels) s += txt(S, c[0], c[1], `ŷ_{${q.idx + 1}}`, fs, { italic: true });
        else if (li > 0 && !last && p.symbol) s += txt(S, c[0], c[1], p.symbol, fs);
      });
      // layer name and size
      const ext = Math.max(...L.nodes.map(q => q.u)) + p.r, t = titles[li] || '';
      const lp = vert ? [ext + 2.4, -(-g.len / 2 + li * p.spacing)] : [-g.len / 2 + li * p.spacing, ext + 2.6];
      if (t) s += txt(S, lp[0], lp[1], t, S.fs * 0.95, { anchor: vert ? 'start' : 'middle' });
      if (p.counts && L.fold) s += txt(S, lp[0], lp[1] + (vert ? S.fs * 1.1 : S.fs * 1.15), `n = ${L.N}`, S.fs * 0.8, { color: '#666', anchor: vert ? 'start' : 'middle' });
    });
    return (defs ? `<defs>${defs}</defs>` : '') + s;
  },
  variants: [
    { name: 'Autoencoder', props: { maxShow: 8, layers: '8, 4, 2, 4, 8', titles: 'Input, Encoder, Code, Decoder, Output', colors: '#7fb3d5, #a3d9b1, #f9d67a, #a3d9b1, #f5b7b1', outLabels: false } },
    { name: 'Deep network (folded layers)', props: { layers: '784, 256, 128, 10', titles: 'Input, Hidden 1, Hidden 2, Output', maxShow: 7, links: 'all', linkAlpha: 0.25, inLabels: false } },
  ] });

/* ================= convolutional network ================= */
const KIND_COL = { input: '#c9d6e3', conv: '#7fb3d5', pool: '#f0a07a', norm: '#c3b1e1', fc: '#a3d9b1', dense: '#a3d9b1', out: '#f5b7b1', output: '#f5b7b1', softmax: '#f5b7b1', flatten: '#d9d9d9', drop: '#e0e0e0' };
const parseCNN = s => String(s || '').split(/[,;\n]+/).map(t => t.trim()).filter(Boolean).map(t => {
  const m = t.match(/^([^:]+):\s*(.+)$/), name = (m ? m[1] : t).trim(), dims = (m ? m[2] : '').split(/[x×*]/i).map(v => +v.trim()).filter(v => v > 0);
  const kind = Object.keys(KIND_COL).find(k => name.toLowerCase().startsWith(k)) || 'conv';
  return { name, dims, kind };
});
ann({ type: 'cnn', name: 'Convolutional network (CNN)', keywords: 'cnn convolutional neural network feature maps conv pool fully connected deep learning image classification',
  defaults: { spec: 'Input: 32x32x3, Conv: 30x30x16, Pool: 15x15x16, Conv: 13x13x32, Pool: 6x6x32, FC: 128, Output: 10', size: 26, depth: 0.35, gap: 7, kernels: true, colors: '', dims: true, ang: 35 },
  params: [
    { key: 'spec', label: 'Layers (name: width x height x channels)', type: 'textarea', hint: 'Input, Conv, Pool, Norm, Flatten, FC / Dense, Output: colours follow the name' },
    { key: 'size', label: 'Height of the largest map', type: 'number', unit: 'mm', min: 4, max: 120, step: 0.5 },
    { key: 'depth', label: 'Depth per channel (log scale)', type: 'range', min: 0.05, max: 1.5, step: 0.01 },
    { key: 'gap', label: 'Gap between layers', type: 'number', unit: 'mm', min: 1, max: 60, step: 0.5 },
    { key: 'ang', label: 'View angle', type: 'range', min: 10, max: 70, step: 1 },
    { key: 'kernels', label: 'Kernel projections', type: 'bool' }, { key: 'dims', label: 'Sizes under the layers', type: 'bool' },
    { key: 'colors', label: 'Colours (comma separated, override)', type: 'text' },
  ],
  geom(p) {
    const L = parseCNN(p.spec), maxS = Math.max(1, ...L.filter(q => q.dims.length >= 2).map(q => Math.max(q.dims[0], q.dims[1])));
    const a = p.ang * Math.PI / 180, kx = Math.cos(a), ky = Math.sin(a);
    let x = 0;
    const blocks = L.map(q => {
      let w, h, d;
      if (q.dims.length >= 2) { h = p.size * Math.pow(q.dims[1] / maxS, 0.7); w = p.size * Math.pow(q.dims[0] / maxS, 0.7); d = Math.max(0.6, p.depth * 4 * Math.log2(1 + (q.dims[2] || 1))); }
      else { h = Math.max(4, p.size * 0.9 * Math.pow((q.dims[0] || 10) / 512, 0.35)); w = 1.4; d = 1.4; }
      const b = { q, x0: x, w: d, h, depth: w * 0.55 };
      x += d + w * 0.55 * kx + p.gap;
      return b;
    });
    return { blocks, kx, ky, total: x - p.gap };
  },
  bbox(p) { const g = this.geom(p), hmax = Math.max(4, ...g.blocks.map(b => b.h)), dmax = Math.max(1, ...g.blocks.map(b => b.depth)); return [-g.total / 2 - 1, -hmax / 2 - dmax * g.ky - 1, g.total / 2 + 1, hmax / 2 + (p.dims ? S0 * 3.4 : 1.5)]; },
  draw(p, S, obj) {
    const g = this.geom(p), uid = idOf(obj, p, 'cnn'), ox = -g.total / 2;
    const P = (x, y, d) => [ox + x + d * g.kx, y - d * g.ky];
    const poly = (pts, fill, st) => `<path d="M ${pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${fill}" stroke="${st}" stroke-width="${n(S.lw * 0.7)}" stroke-linejoin="round"/>`;
    let s = '', defs = '';
    g.blocks.forEach((b, i) => {
      const col = palette(p.colors, i, KIND_COL[b.q.kind] || '#7fb3d5'), st = S.shaded ? U.shadeRgb(col, 0.55) : S.ink, x0 = b.x0, x1 = b.x0 + b.w, y0 = -b.h / 2, y1 = b.h / 2, D = b.depth;
      // top, side (towards the viewer on the right) and front faces of a feature-map block
      s += poly([P(x0, y0, 0), P(x1, y0, 0), P(x1, y0, D), P(x0, y0, D)], S.shaded ? U.lighten(col, 0.25) : U.lighten(col, 0.35), st);
      s += poly([P(x1, y0, 0), P(x1, y1, 0), P(x1, y1, D), P(x1, y0, D)], S.shaded ? U.shadeRgb(col, 0.8) : col, st);
      const gid = `${uid}-f${cid(col)}`; defs += grad(S, col, gid);
      s += poly([P(x0, y0, 0), P(x1, y0, 0), P(x1, y1, 0), P(x0, y1, 0)], S.shaded ? `url(#${gid})` : col, st);
      // channel slices on the front of thick blocks
      if (b.q.dims.length >= 3 && b.w > 1.2) { const k = Math.min(8, Math.round(b.w / 0.7)); for (let j = 1; j < k; j++) { const x = x0 + b.w * j / k; s += `<line x1="${n(P(x, y0, 0)[0])}" y1="${n(y0)}" x2="${n(P(x, y0, D)[0])}" y2="${n(P(x, y0, D)[1])}" stroke="${st}" stroke-opacity="0.35" stroke-width="${n(S.lw * 0.45)}"/>`; } }
      // a kernel on this block and its projection onto the next one
      const nx = g.blocks[i + 1];
      if (p.kernels && nx && b.q.dims.length >= 2 && (nx.q.kind === 'conv' || nx.q.kind === 'pool')) {
        const ks = Math.min(b.h, b.depth) * 0.28, kd = b.depth * 0.62, ky0 = -ks * 0.2, k0 = [P(x1, ky0, kd), P(x1, ky0 + ks, kd), P(x1, ky0 + ks, kd - ks), P(x1, ky0, kd - ks)];
        const tgt = P(nx.x0 + nx.w, -nx.h * 0.05, nx.depth * 0.55);
        s += `<path d="M ${k0.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="#ffffff" fill-opacity="0.55" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
        k0.forEach(q => { s += `<line x1="${n(q[0])}" y1="${n(q[1])}" x2="${n(tgt[0])}" y2="${n(tgt[1])}" stroke="${S.ink}" stroke-opacity="0.45" stroke-width="${n(S.lw * 0.45)}" stroke-dasharray="${n(S.lw * 2)} ${n(S.lw * 1.5)}"/>`; });
      }
      if (p.dims) {
        const lx = ox + x0 + (b.w + D * g.kx) / 2, ly = Math.max(...g.blocks.map(q => q.h)) / 2 + S.fs * 1.1;
        s += txt(S, lx, ly, b.q.name, S.fs * 0.9, { bold: true }) + txt(S, lx, ly + S.fs * 1.1, b.q.dims.join('×'), S.fs * 0.75, { color: '#555' });
      }
    });
    return (defs ? `<defs>${defs}</defs>` : '') + s;
  } });
const S0 = 2.47;   // 7 pt in mm, for bounding boxes drawn before a style is known

/* ================= Transformer block diagram ================= */
const TF_COL = { att: '#f6c9a8', norm: '#f8eaa6', ff: '#a9d3f0', emb: '#f5c0c0', lin: '#cfc4ee', soft: '#b9e3c6' };
ann({ type: 'transformer', name: 'Transformer (block diagram)', keywords: 'transformer attention encoder decoder llm language model bert gpt self-attention multi-head deep learning',
  defaults: { mode: 'encdec', layersN: 'N', w: 26, colors: '', residual: true },
  params: [{ key: 'mode', label: 'Model', type: 'select', options: [['encdec', 'Encoder and decoder'], ['enc', 'Encoder only'], ['dec', 'Decoder only']] },
    { key: 'layersN', label: 'Repeats (label)', type: 'text' }, { key: 'w', label: 'Block width', type: 'number', unit: 'mm', min: 10, max: 100, step: 0.5 },
    { key: 'residual', label: 'Residual connections', type: 'bool' }],
  stacks(p) {
    const enc = [['emb', 'Input embedding'], ['pos'], ['att', 'Multi-head\nattention'], ['norm', 'Add & norm'], ['ff', 'Feed forward'], ['norm', 'Add & norm']];
    const dec = [['emb', 'Output embedding'], ['pos'], ['att', 'Masked multi-head\nattention'], ['norm', 'Add & norm']].concat(p.mode === 'encdec' ? [['att', 'Cross-attention'], ['norm', 'Add & norm']] : [], [['ff', 'Feed forward'], ['norm', 'Add & norm'], ['lin', 'Linear'], ['soft', 'Softmax']]);
    return p.mode === 'enc' ? [enc] : p.mode === 'dec' ? [dec] : [enc, dec];
  },
  hOf: k => (k === 'pos' ? 5 : k === 'norm' ? 4 : k === 'att' ? 8 : 6.5),
  bbox(p) { const st = this.stacks(p), h = Math.max(...st.map(c => c.reduce((a, q) => a + this.hOf(q[0]) + 2.6, 0))), w = st.length * (p.w + 14); return [-w / 2 - 4, -h / 2 - 7, w / 2 + 4, h / 2 + 4]; },
  draw(p, S, obj) {
    const st = this.stacks(p), uid = idOf(obj, p, 'tf'), colW = p.w + 14, ink = S.ink;
    const H0 = Math.max(...st.map(c => c.reduce((a, q) => a + this.hOf(q[0]) + 2.6, 0)));
    let s = '', defs = '';
    const box = (x, y, w, h, col, label) => { const gid = `${uid}-${cid(col)}`; if (!defs.includes(gid)) defs += grad(S, col, gid); return `<rect x="${n(x - w / 2)}" y="${n(y - h / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(1.2)}" fill="${S.shaded ? `url(#${gid})` : col}" stroke="${S.shaded ? U.shadeRgb(col, 0.6) : ink}" stroke-width="${n(S.lw * 0.8)}"/>` + lines(S, x, y, label, Math.min(S.fs * 0.9, h * 0.38)); };
    const arrow = (x1, y1, x2, y2) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2 + 0.9)}" stroke="${ink}" stroke-width="${n(S.lw * 0.8)}"/>` + H.arrowHead(x2, y2, Math.atan2(y2 - y1, x2 - x1), 1.1, ink);
    const tops = [];
    st.forEach((col, ci) => {
      const cx = (ci - (st.length - 1) / 2) * colW;
      let y = H0 / 2;
      const pos = [], block = [];
      col.forEach((q, k) => {
        const h = this.hOf(q[0]); y -= h / 2;
        if (q[0] === 'pos') {
          s += `<circle cx="${n(cx)}" cy="${n(y)}" r="2" fill="#ffffff" stroke="${ink}" stroke-width="${n(S.lw * 0.8)}"/><line x1="${n(cx - 1.3)}" y1="${n(y)}" x2="${n(cx + 1.3)}" y2="${n(y)}" stroke="${ink}" stroke-width="${n(S.lw * 0.8)}"/><line x1="${n(cx)}" y1="${n(y - 1.3)}" x2="${n(cx)}" y2="${n(y + 1.3)}" stroke="${ink}" stroke-width="${n(S.lw * 0.8)}"/>`;
          const sx = ci === 0 && st.length > 1 ? cx - p.w / 2 - 3.5 : cx + p.w / 2 + 3.5;
          s += `<path d="M ${n(sx - 2.4)} ${n(y)} q 0.6 -1.6 1.2 0 t 1.2 0 t 1.2 0 t 1.2 0" fill="none" stroke="${ink}" stroke-width="${n(S.lw * 0.7)}"/>` + `<line x1="${n(sx + (sx < cx ? 2.6 : -2.6))}" y1="${n(y)}" x2="${n(cx + (sx < cx ? -2.1 : 2.1))}" y2="${n(y)}" stroke="${ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
          s += txt(S, sx, y + 3, 'Positional', S.fs * 0.7, { color: '#555' }) + txt(S, sx, y + 3 + S.fs * 0.8, 'encoding', S.fs * 0.7, { color: '#555' });
        } else s += box(cx, y, p.w, h, palette(p.colors, k, TF_COL[q[0]]), q[1]);
        pos.push({ y, h, kind: q[0] });
        if (['att', 'norm', 'ff'].includes(q[0])) block.push({ y, h });
        y -= h / 2 + 2.6;
      });
      // arrows up the stack
      for (let k = 0; k < pos.length - 1; k++) s += arrow(cx, pos[k].y - pos[k].h / 2, cx, pos[k + 1].y + pos[k + 1].h / 2);
      const last = pos[pos.length - 1]; s += arrow(cx, last.y - last.h / 2, cx, last.y - last.h / 2 - 3.5);
      tops.push({ cx, y: last.y - last.h / 2 - 3.5, block });
      // the repeated block, with its label and residual paths
      if (block.length) {
        const yt = Math.min(...block.map(b => b.y - b.h / 2)) - 1.4, yb = Math.max(...block.map(b => b.y + b.h / 2)) + 1.4, bx = cx - p.w / 2 - 2.2, bw = p.w + 4.4;
        s = `<rect x="${n(bx)}" y="${n(yt)}" width="${n(bw)}" height="${n(yb - yt)}" rx="2" fill="${S.shaded ? '#f4f6f9' : 'none'}" stroke="${ink}" stroke-opacity="0.6" stroke-width="${n(S.lw * 0.8)}"/>` + s;
        if (p.layersN) s += txt(S, ci === 0 && st.length > 1 ? bx - 1.2 : bx + bw + 1.2, (yt + yb) / 2, p.layersN + '×', S.fs, { anchor: ci === 0 && st.length > 1 ? 'end' : 'start', bold: true });
        if (p.residual) {
          const rx = ci === 0 && st.length > 1 ? cx - p.w / 2 - 1.1 : cx + p.w / 2 + 1.1;
          for (let k = 1; k < pos.length; k++) if (pos[k].kind === 'norm') {
            const from = pos[k - 1].y + pos[k - 1].h / 2 + 1.3, to = pos[k].y;
            s += `<path d="M ${n(cx)} ${n(from)} L ${n(rx)} ${n(from)} L ${n(rx)} ${n(to)} L ${n(rx + (rx < cx ? 1.0 : -1.0))} ${n(to)}" fill="none" stroke="${ink}" stroke-width="${n(S.lw * 0.6)}"/>` + H.arrowHead(cx + (rx < cx ? -p.w / 2 : p.w / 2), to, rx < cx ? 0 : Math.PI, 0.9, ink);
          }
        }
      }
    });
    if (st.length === 2) {
      // encoder output into the decoder's cross-attention
      const enc = tops[0], dec = st[1], cx = tops[1].cx; let y = H0 / 2, yc = null;
      dec.forEach((q, k) => { const h = this.hOf(q[0]); y -= h / 2; if (q[1] === 'Cross-attention') yc = y; y -= h / 2 + 2.6; });
      if (yc != null) s += `<path d="M ${n(enc.cx)} ${n(enc.y)} L ${n(enc.cx)} ${n(enc.y - 2)} L ${n((enc.cx + cx) / 2)} ${n(enc.y - 2)} L ${n((enc.cx + cx) / 2)} ${n(yc)} L ${n(cx - p.w / 2 - 0.9)} ${n(yc)}" fill="none" stroke="${ink}" stroke-width="${n(S.lw * 0.8)}"/>` + H.arrowHead(cx - p.w / 2, yc, 0, 1.1, ink);
    }
    return (defs ? `<defs>${defs}</defs>` : '') + s;
  } });

/* ================= flowchart boxes ================= */
const SHAPES = [['process', 'Process (rectangle)'], ['rounded', 'Rounded box'], ['terminal', 'Start / end (pill)'], ['decision', 'Decision (diamond)'], ['io', 'Input / output (parallelogram)'], ['document', 'Document'], ['database', 'Database (cylinder)'], ['subroutine', 'Sub-process'], ['prep', 'Preparation (hexagon)'], ['circle', 'Circle / junction']];
const outline = (k, w, h) => {
  const a = w / 2, b = h / 2;
  switch (k) {
    case 'decision': return `M 0 ${n(-b)} L ${n(a)} 0 L 0 ${n(b)} L ${n(-a)} 0 Z`;
    case 'io': { const s = Math.min(h * 0.4, w * 0.2); return `M ${n(-a + s)} ${n(-b)} L ${n(a)} ${n(-b)} L ${n(a - s)} ${n(b)} L ${n(-a)} ${n(b)} Z`; }
    case 'terminal': return `M ${n(-a + b)} ${n(-b)} L ${n(a - b)} ${n(-b)} A ${n(b)} ${n(b)} 0 0 1 ${n(a - b)} ${n(b)} L ${n(-a + b)} ${n(b)} A ${n(b)} ${n(b)} 0 0 1 ${n(-a + b)} ${n(-b)} Z`;
    case 'document': return `M ${n(-a)} ${n(-b)} L ${n(a)} ${n(-b)} L ${n(a)} ${n(b * 0.7)} Q ${n(a / 2)} ${n(b * 0.35)} 0 ${n(b * 0.75)} T ${n(-a)} ${n(b * 0.8)} Z`;
    case 'prep': { const s = Math.min(h * 0.4, w * 0.18); return `M ${n(-a + s)} ${n(-b)} L ${n(a - s)} ${n(-b)} L ${n(a)} 0 L ${n(a - s)} ${n(b)} L ${n(-a + s)} ${n(b)} L ${n(-a)} 0 Z`; }
    case 'circle': { const r = Math.min(a, b); return `M ${n(-r)} 0 A ${n(r)} ${n(r)} 0 1 0 ${n(r)} 0 A ${n(r)} ${n(r)} 0 1 0 ${n(-r)} 0 Z`; }
    case 'database': { const e = Math.min(h * 0.14, 3); return `M ${n(-a)} ${n(-b + e)} A ${n(a)} ${n(e)} 0 0 1 ${n(a)} ${n(-b + e)} L ${n(a)} ${n(b - e)} A ${n(a)} ${n(e)} 0 0 1 ${n(-a)} ${n(b - e)} Z`; }
    case 'rounded': { const r = Math.min(h, w) * 0.22; return `M ${n(-a + r)} ${n(-b)} L ${n(a - r)} ${n(-b)} Q ${n(a)} ${n(-b)} ${n(a)} ${n(-b + r)} L ${n(a)} ${n(b - r)} Q ${n(a)} ${n(b)} ${n(a - r)} ${n(b)} L ${n(-a + r)} ${n(b)} Q ${n(-a)} ${n(b)} ${n(-a)} ${n(b - r)} L ${n(-a)} ${n(-b + r)} Q ${n(-a)} ${n(-b)} ${n(-a + r)} ${n(-b)} Z`; }
    default: return `M ${n(-a)} ${n(-b)} L ${n(a)} ${n(-b)} L ${n(a)} ${n(b)} L ${n(-a)} ${n(b)} Z`;
  }
};
ann({ type: 'fcbox', name: 'Flowchart box', keywords: 'flowchart box process decision diamond start end terminator block diagram step database document workflow pipeline',
  defaults: { shape: 'process', w: 30, h: 12, text: 'Step', size: 7, fill: '#dbe9f6', stroke: '', textColor: '#111111', bold: false, shadow: true },
  params: [{ key: 'shape', label: 'Shape', type: 'select', options: SHAPES }, { key: 'text', label: 'Text', type: 'textarea', hint: 'new lines with Enter; markup such as x_2, λ, **bold**' },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 3, max: 300, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 300, step: 0.5 },
    { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 40, step: 0.5 }, { key: 'bold', label: 'Bold', type: 'bool' },
    { key: 'fill', label: 'Fill', type: 'color', allowEmpty: true }, { key: 'stroke', label: 'Outline (empty = figure ink)', type: 'color', allowEmpty: true }, { key: 'textColor', label: 'Text colour', type: 'color' },
    { key: 'shadow', label: 'Shadow (shaded style)', type: 'bool' }],
  resizable: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S, obj) {
    const d = outline(p.shape, p.w, p.h), uid = idOf(obj, p, 'fc'), fill = p.fill || 'none', st = p.stroke || (S.shaded && p.fill ? U.shadeRgb(p.fill, 0.55) : S.ink);
    let s = '';
    if (S.shaded && p.fill) s += `<defs>${grad(S, p.fill, uid)}</defs>`;
    if (S.shaded && p.shadow) s += `<path d="${d}" transform="translate(0.5 0.6)" fill="#000000" fill-opacity="0.13"/>`;
    s += `<path d="${d}" fill="${S.shaded && p.fill ? `url(#${uid})` : fill}" stroke="${st}" stroke-width="${n(S.lw)}" stroke-linejoin="round"/>`;
    if (p.shape === 'subroutine') { const x = p.w / 2 - Math.min(2.4, p.w * 0.08); s += `<line x1="${n(-x)}" y1="${n(-p.h / 2)}" x2="${n(-x)}" y2="${n(p.h / 2)}" stroke="${st}" stroke-width="${n(S.lw)}"/><line x1="${n(x)}" y1="${n(-p.h / 2)}" x2="${n(x)}" y2="${n(p.h / 2)}" stroke="${st}" stroke-width="${n(S.lw)}"/>`; }
    if (p.shape === 'database') { const e = Math.min(p.h * 0.14, 3); s += `<path d="M ${n(-p.w / 2)} ${n(-p.h / 2 + e)} A ${n(p.w / 2)} ${n(e)} 0 0 0 ${n(p.w / 2)} ${n(-p.h / 2 + e)}" fill="none" stroke="${st}" stroke-width="${n(S.lw)}"/>`; }
    const fs = U.pt2mm(p.size || 7);
    s += lines(S, 0, p.shape === 'document' ? -p.h * 0.06 : 0, p.text, fs, { color: p.textColor, bold: p.bold });
    return s;
  },
  variants: [
    { name: 'Start / end', props: { shape: 'terminal', text: 'Start', fill: '#d8f0dc', w: 26, h: 10 } },
    { name: 'Decision', props: { shape: 'decision', text: 'Converged?', fill: '#fdebc8', w: 30, h: 16 } },
    { name: 'Input / output', props: { shape: 'io', text: 'Load data', fill: '#e6def5' } },
    { name: 'Database', props: { shape: 'database', text: 'Spectra\ndatabase', fill: '#e4e7eb', w: 22, h: 16 } },
    { name: 'Document', props: { shape: 'document', text: 'Report', fill: '#fff4d6' } },
  ] });

/* ================= flow connector ================= */
const exitPt = (c, d, box) => {
  let t = Infinity;
  if (d[0] > 1e-9) t = Math.min(t, (box[2] - c[0]) / d[0]); if (d[0] < -1e-9) t = Math.min(t, (box[0] - c[0]) / d[0]);
  if (d[1] > 1e-9) t = Math.min(t, (box[3] - c[1]) / d[1]); if (d[1] < -1e-9) t = Math.min(t, (box[1] - c[1]) / d[1]);
  return isFinite(t) ? V.add(c, V.mul(d, t)) : c;
};
lib.register({
  type: 'flow', name: 'Flow connector', abbr: '', category: CAT, connection: true, autoLabel: false,
  keywords: 'connector flow arrow flowchart link edge yes no stays attached diagram',
  tool: 'flow', hint: 'Click the first box, then the second.',
  defaults: { from: '', to: '', route: 'auto', label: '', labelSize: 6.5, color: '', width: 0.6, head: 'end', dashed: false, bend: 0.35 },
  params: [
    { key: 'route', label: 'Routing', type: 'select', options: [['auto', 'Automatic (right angles)'], ['vhv', 'Vertical – horizontal – vertical'], ['hvh', 'Horizontal – vertical – horizontal'], ['hv', 'Horizontal, then vertical'], ['vh', 'Vertical, then horizontal'], ['straight', 'Straight'], ['curve', 'Curved']] },
    { key: 'bend', label: 'Curvature', type: 'range', min: -1, max: 1, step: 0.01, show: p => p.route === 'curve' },
    { key: 'label', label: 'Label', type: 'text', placeholder: 'e.g. yes / no' }, { key: 'labelSize', label: 'Label size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5, show: p => !!p.label },
    { key: 'head', label: 'Arrowheads', type: 'select', options: [['end', 'At the second box'], ['start', 'At the first box'], ['both', 'Both'], ['none', 'None']] },
    { key: 'dashed', label: 'Dashed', type: 'bool' }, { key: 'color', label: 'Colour', type: 'color', allowEmpty: true },
    { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.2, max: 4, step: 0.05 },
  ],
  geometry(obj, doc) {
    const A = RNBX.getObjIn(doc, obj.props.from), B = RNBX.getObjIn(doc, obj.props.to);
    if (!A || !B) return null;
    const ba = lib.worldBox(A), bb = lib.worldBox(B), ca = [(ba[0] + ba[2]) / 2, (ba[1] + ba[3]) / 2], cb = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2];
    const sg = v => (v >= 0 ? 1 : -1), dx = cb[0] - ca[0], dy = cb[1] - ca[1];
    let r = obj.props.route;
    if (r === 'auto') {
      // straight when the boxes line up, otherwise right angles along the main direction
      const overX = Math.min(ba[2], bb[2]) - Math.max(ba[0], bb[0]), overY = Math.min(ba[3], bb[3]) - Math.max(ba[1], bb[1]);
      if (overX > 1 && Math.abs(dy) > Math.abs(dx) * 0.2) { const x = (Math.max(ba[0], bb[0]) + Math.min(ba[2], bb[2])) / 2; const a = [x, dy > 0 ? ba[3] : ba[1]], b = [x, dy > 0 ? bb[1] : bb[3]]; return { pts: [a, b], d: `M ${n(a[0])} ${n(a[1])} L ${n(b[0])} ${n(b[1])}` }; }
      if (overY > 1) { const y = (Math.max(ba[1], bb[1]) + Math.min(ba[3], bb[3])) / 2; const a = [dx > 0 ? ba[2] : ba[0], y], b = [dx > 0 ? bb[0] : bb[2], y]; return { pts: [a, b], d: `M ${n(a[0])} ${n(a[1])} L ${n(b[0])} ${n(b[1])}` }; }
      r = Math.abs(dy) >= Math.abs(dx) ? 'vhv' : 'hvh';
    }
    let pts;
    if (r === 'vhv') { const a = exitPt(ca, [0, sg(dy)], ba), b = exitPt(cb, [0, -sg(dy)], bb), my = (a[1] + b[1]) / 2; pts = [a, [a[0], my], [b[0], my], b]; }
    else if (r === 'hvh') { const a = exitPt(ca, [sg(dx), 0], ba), b = exitPt(cb, [-sg(dx), 0], bb), mx = (a[0] + b[0]) / 2; pts = [a, [mx, a[1]], [mx, b[1]], b]; }
    else if (r === 'hv') { const a = exitPt(ca, [sg(dx), 0], ba), b = exitPt(cb, [0, -sg(dy)], bb); pts = [a, [b[0], a[1]], b]; }
    else if (r === 'vh') { const a = exitPt(ca, [0, sg(dy)], ba), b = exitPt(cb, [-sg(dx), 0], bb); pts = [a, [a[0], b[1]], b]; }
    else if (r === 'curve') {
      const dir = V.norm([dx, dy]), a = exitPt(ca, dir, ba), b = exitPt(cb, V.mul(dir, -1), bb), m = V.mul(V.add(a, b), 0.5), nrm = [-dir[1], dir[0]], k = (obj.props.bend || 0) * V.dist(a, b), c = V.add(m, V.mul(nrm, k));
      return { pts: [a, c, b], quad: true, d: `M ${n(a[0])} ${n(a[1])} Q ${n(c[0])} ${n(c[1])} ${n(b[0])} ${n(b[1])}` };
    } else { const dir = V.norm([dx, dy]); pts = [exitPt(ca, dir, ba), exitPt(cb, V.mul(dir, -1), bb)]; }
    return { pts, d: 'M ' + pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') };
  },
  drawConn(obj, doc, S) {
    const g = this.geometry(obj, doc); if (!g) return '';
    const p = obj.props, col = p.color || S.ink, w = U.pt2mm(p.width || 0.6), hs = Math.max(1.1, w * 4.5), P = g.pts;
    const end = g.quad ? [P[1], P[2]] : [P[P.length - 2], P[P.length - 1]], start = g.quad ? [P[1], P[0]] : [P[1], P[0]];
    // stop the line at the arrowhead, so its tip stays sharp
    const trim = (a, b) => { const d = V.norm(V.sub(b, a)); return V.sub(b, V.mul(d, hs * 0.8)); };
    let d = g.d;
    if (!g.quad && (p.head === 'end' || p.head === 'both')) { const q = P.slice(); q[q.length - 1] = trim(end[0], end[1]); d = 'M ' + q.map(t => n(t[0]) + ' ' + n(t[1])).join(' L '); }
    let s = `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(w)}" stroke-linejoin="round" ${p.dashed ? `stroke-dasharray="${n(w * 4)} ${n(w * 3)}"` : ''}/>`;
    const head = (a, b) => H.arrowHead(b[0], b[1], Math.atan2(b[1] - a[1], b[0] - a[0]), hs, col);
    if (p.head === 'end' || p.head === 'both') s += head(end[0], end[1]);
    if (p.head === 'start' || p.head === 'both') s += head(start[0], start[1]);
    if (p.label) {
      // at the middle of the path, on a small white background
      const segs = []; let L = 0; for (let i = 1; i < P.length; i++) { const l = V.dist(P[i - 1], P[i]); segs.push(l); L += l; }
      let t = L / 2, i = 0; while (i < segs.length - 1 && t > segs[i]) { t -= segs[i]; i++; }
      const a = P[i], b = P[i + 1] || a, u = segs[i] ? t / segs[i] : 0, m = g.quad ? [0.25 * P[0][0] + 0.5 * P[1][0] + 0.25 * P[2][0], 0.25 * P[0][1] + 0.5 * P[1][1] + 0.25 * P[2][1]] : [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
      const fs = U.pt2mm(p.labelSize || 6.5), tw = RNBX.text.measure(p.label, fs) + fs * 0.8;
      s += `<rect x="${n(m[0] - tw / 2)}" y="${n(m[1] - fs * 0.7)}" width="${n(tw)}" height="${n(fs * 1.4)}" rx="${n(fs * 0.3)}" fill="${RNBX.isDarkPage(doc.page) ? '#0b1020' : '#ffffff'}"/>` + txt(S, m[0], m[1], p.label, fs, { color: col });
    }
    return s;
  },
});
})();
