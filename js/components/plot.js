/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/plot.js
   Data plot panel, so a setup (panel a) and its data (panel b,
   e.g. a Raman spectrum) can sit in one figure. Drawn as plain
   vector SVG with editable text, like the rest of the figure.

   Data come from CSV / TXT files (including RNSpectraX's
   "Plotted CSV"), pasted text, or straight from RNSpectraX
   via its "→ RNBeamX" button.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, n = lib.H.n;
const PALETTE = ['#1f77b4', '#d62728', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2', '#17becf', '#bcbd22', '#000000'];

/* ---------- data import ---------- */
const DataIO = RNBX.plotData = {};
DataIO.parse = text => {
  const rows = String(text).split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^[#%]/.test(l));
  if (!rows.length) throw new Error('No data found');
  const split = l => l.split(/\s*[,;\t]\s*|\s+/).filter(x => x !== '');
  let header = null;
  const first = split(rows[0]);
  if (first.some(v => !isFinite(parseFloat(v)))) { header = first; rows.shift(); }
  const data = rows.map(split).map(r => r.map(v => parseFloat(v)));
  const ncol = Math.max(...data.map(r => r.length));
  if (ncol < 2) throw new Error('Need at least two columns (x, y)');
  const col = j => data.map(r => r[j]);
  const series = [];
  // RNSpectraX "Plotted CSV": name__X, name__Y (+ __Yerr / __Xerr) column pairs
  if (header && header.some(h => /__X$/.test(h))) {
    header.forEach((h, j) => {
      if (!/__X$/.test(h)) return;
      const name = h.replace(/__X$/, ''), jy = header.indexOf(name + '__Y');
      if (jy < 0) return;
      const xs = col(j), ys = col(jy), x = [], y = [];
      xs.forEach((v, i) => { if (isFinite(v) && isFinite(ys[i])) { x.push(v); y.push(ys[i]); } });
      series.push({ name, x, y });
    });
  } else {
    const xs = col(0);
    for (let j = 1; j < ncol; j++) {
      const ys = col(j), x = [], y = [];
      xs.forEach((v, i) => { if (isFinite(v) && isFinite(ys[i])) { x.push(v); y.push(ys[i]); } });
      if (x.length) series.push({ name: header && header[j] ? header[j] : 'Series ' + j, x, y });
    }
  }
  if (!series.length) throw new Error('No numeric x–y columns found');
  return { series, xlabel: header && !header.some(h => /__X$/.test(h)) ? header[0] : '', ylabel: '' };
};
/* Plotly-style HTML in axis titles → RNBeamX text markup */
DataIO.fromHtml = t => String(t || '').replace(/<sup>(.*?)<\/sup>/gi, '^{$1}').replace(/<sub>(.*?)<\/sub>/gi, '_{$1}').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
/* data handed over by RNSpectraX (same site → shared browser storage) */
DataIO.HANDOFF_KEY = 'rnfamily_handoff';
DataIO.readHandoff = () => {
  const h = U.store.get(DataIO.HANDOFF_KEY, null);
  if (!h || !Array.isArray(h.series) || !h.series.length) return null;
  return { series: h.series.map(s => ({ name: s.name, x: s.x, y: s.y, color: s.color, dash: s.dash })), xlabel: DataIO.fromHtml(h.xlabel), ylabel: DataIO.fromHtml(h.ylabel), xreverse: !!h.xreverse, title: h.title, time: h.time };
};
DataIO.apply = (obj, d) => {
  obj.props.series = d.series.map((s, i) => ({ name: s.name || 'Series ' + (i + 1), x: s.x, y: s.y, color: s.color || PALETTE[i % PALETTE.length], dash: s.dash || 'solid' }));
  if (d.xlabel) obj.props.xlabel = d.xlabel;
  if (d.ylabel) obj.props.ylabel = d.ylabel;
  if (d.xreverse != null) obj.props.xreverse = d.xreverse;
};

/* ---------- panels calculated live from a layer stack or SPR prism ---------- */
const CALC_STYLE = { R: ['Reflectance', '#1f77b4'], T: ['Transmittance', '#2ca02c'], A: ['Absorptance', '#d62728'] };
DataIO.calcResult = (src, doc) => {
  const def = src && lib.get(src.type);
  if (!def || !def.stack || !RNBX.thinfilm) return null;
  return RNBX.thinfilm.cached(def.stack(src.props, src, doc), Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, src.props.calc || {}));
};
DataIO.calcSeries = res => res.calc.show.split('').filter(q => CALC_STYLE[q]).map(q => ({ name: CALC_STYLE[q][0], x: res.x, y: res.series[q], color: CALC_STYLE[q][1], dash: 'solid' }));
DataIO.calcYLabel = res => { const q = res.calc.show.split('').filter(v => CALC_STYLE[v]); return q.length === 1 ? CALC_STYLE[q[0]][0] : q.join(', '); };
DataIO.addCalcPanel = src => {
  const res = DataIO.calcResult(src);
  if (!res) return;
  const plot = RNBX.arrange.addDataPanel();
  Object.assign(plot.props, { link: src.id, linkAuto: true, series: [], legend: true, legendPos: res.calc.scan === 'angle' ? 'bl' : 'tr', yNumbers: true });
  RNBX.changed(); RNBX.inspector.build();
  RNBX.toast('Data panel linked: it follows every change to the stack');
  U.track('calc-panel-' + src.type);
  return plot;
};
DataIO.downloadCsv = src => {
  const res = DataIO.calcResult(src);
  if (!res) return;
  const q = ['R', 'T', 'A'], head = [res.xlabel].concat(q.map(k => CALC_STYLE[k][0] + ' (' + res.calc.pol + ')'));
  const rows = res.x.map((x, i) => [x].concat(q.map(k => res.series[k][i].toPrecision(6))).join(','));
  U.track('calc-csv');
  U.download(new Blob([head.join(',') + '\n' + rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(src.kindName || lib.get(src.type).name) + '_response.csv');
};
DataIO.sourcesDialog = src => {
  const def = lib.get(src.type), st = def.stack(src.props, src), TF = RNBX.thinfilm, D = RNBX.dom, el = D.el;
  const mats = [...new Set([st.inc, st.sub].concat(st.layers.map(l => l.m)).map(m => m.mat))].filter(m => m && m !== 'air' && m !== 'custom');
  D.modal({ title: 'Optical constants used', sub: 'Measured n, k from the refractiveindex.info database (public domain)',
    body: [el('ul', { class: 'check-list' }, mats.map(m => el('li', {}, el('i', { class: 'ok', text: 'n,k' }), el('span', {}, el('b', { text: TF.name(m) + '. ' }), TF.ref(m))))),
      el('div', { class: 'note', html: 'Cite the original measurement in your paper, and the database: M. N. Polyanskiy, <i>Sci. Data</i> <b>11</b>, 94 (2024). The calculation is the transfer-matrix method for flat, isotropic films (exact for planar stacks).' })] });
};

/* ---------- axes ---------- */
const niceStep = (span, target) => {
  const raw = span / Math.max(1, target), p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
};
const ticks = (a, b, target) => {
  const st = niceStep(Math.abs(b - a) || 1, target), out = [];
  for (let v = Math.ceil(Math.min(a, b) / st) * st; v <= Math.max(a, b) + st * 1e-6; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
  return { st, out };
};
const fmtTick = (v, st) => { const d = Math.max(0, -Math.floor(Math.log10(st) + 1e-9)); return Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(1) : v.toFixed(d); };
/* keep path size sane: min–max decimation into ≤ N buckets */
const decimate = (x, y, N = 900) => {
  if (x.length <= N * 2) return x.map((v, i) => [v, y[i]]);
  const out = [], k = x.length / N;
  for (let b = 0; b < N; b++) {
    let lo = Infinity, hi = -Infinity, il = 0, ih = 0;
    for (let i = Math.floor(b * k); i < Math.min(x.length, Math.floor((b + 1) * k)); i++) { if (y[i] < lo) { lo = y[i]; il = i; } if (y[i] > hi) { hi = y[i]; ih = i; } }
    if (il <= ih) out.push([x[il], y[il]], [x[ih], y[ih]]); else out.push([x[ih], y[ih]], [x[il], y[il]]);
  }
  return out;
};

lib.register({
  type: 'plot', name: 'Data plot', category: 'Annotations', annotation: true, autoLabel: false, abbr: '',
  keywords: 'plot graph spectrum data chart panel csv rnspectrax raman curve',
  defaults: {
    w: 70, h: 46, series: [], xlabel: 'Raman shift (cm^{−1})', ylabel: 'Intensity (a.u.)', xmin: '', xmax: '', ymin: '', ymax: '',
    xreverse: false, yNumbers: true, legend: true, legendPos: 'tr', frame: 'box', fontSize: 7, lineWidth: 0.8, offset: 0, ticksIn: true,
    link: '', linkAuto: true,
  },
  params: [
    { key: 'series', label: 'Data', type: 'series' },
    { key: 'linkAuto', label: 'Axis titles from the calculation', type: 'bool', show: p => !!p.link },
    { key: 'xlabel', label: 'x-axis title', type: 'text', show: p => !p.link || !p.linkAuto }, { key: 'ylabel', label: 'y-axis title', type: 'text', show: p => !p.link || !p.linkAuto },
    { key: 'xmin', label: 'x min', type: 'text', placeholder: 'auto' }, { key: 'xmax', label: 'x max', type: 'text', placeholder: 'auto' },
    { key: 'ymin', label: 'y min', type: 'text', placeholder: 'auto' }, { key: 'ymax', label: 'y max', type: 'text', placeholder: 'auto' },
    { key: 'offset', label: 'Stack offset (fraction of range)', type: 'range', min: 0, max: 1.5, step: 0.01, hint: 'spreads spectra vertically' },
    { key: 'xreverse', label: 'Reverse x axis', type: 'bool' }, { key: 'yNumbers', label: 'y tick numbers', type: 'bool', hint: 'off for a.u.' },
    { key: 'legend', label: 'Legend', type: 'bool' },
    { key: 'legendPos', label: 'Legend position', type: 'select', options: [['tr', 'Top right'], ['tl', 'Top left'], ['br', 'Bottom right'], ['bl', 'Bottom left']], show: p => p.legend },
    { key: 'frame', label: 'Axes', type: 'select', options: [['box', 'Box'], ['L', 'Left and bottom']] },
    { key: 'ticksIn', label: 'Ticks inside', type: 'bool' },
    { key: 'fontSize', label: 'Text size', type: 'number', unit: 'pt', min: 4, max: 24, step: 0.5 },
    { key: 'lineWidth', label: 'Line weight', type: 'number', unit: 'pt', min: 0.2, max: 4, step: 0.05 },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 15, max: 300, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 10, max: 300, step: 0.5 },
  ],
  resizable: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    const fs = U.pt2mm(p.fontSize), lw = U.pt2mm(p.lineWidth), ink = RNBX.isDarkPage(S.doc.page) ? '#e8ecf2' : '#111111', axw = U.pt2mm(0.6);
    let series = (p.series || []).filter(s => s.x && s.x.length), lost = false;
    if (p.link) {
      // live: recomputed from the linked stack on every change and animation frame
      const src = S.doc.objects.find(o => o.id === p.link), res = src ? DataIO.calcResult(src, S.doc) : null;
      if (res) { series = DataIO.calcSeries(res); if (p.linkAuto) p = Object.assign({}, p, { xlabel: res.xlabel, ylabel: DataIO.calcYLabel(res) }); }
      else { series = []; lost = true; }
    }
    let xs = [], ys = [];
    const range = (s) => { const r = Math.max(...s.y) - Math.min(...s.y); return isFinite(r) ? r : 1; };
    const off = series.length ? p.offset * Math.max(...series.map(range)) : 0;
    series.forEach((s, i) => { xs = xs.concat([Math.min(...s.x), Math.max(...s.x)]); ys = ys.concat([Math.min(...s.y) + i * off, Math.max(...s.y) + i * off]); });
    if (!series.length) { xs = [0, 1]; ys = [0, 1]; }
    const num = (v, d) => (v === '' || v == null || !isFinite(parseFloat(v)) ? d : parseFloat(v));
    let x0 = num(p.xmin, Math.min(...xs)), x1 = num(p.xmax, Math.max(...xs));
    let y0 = num(p.ymin, Math.min(...ys)), y1 = num(p.ymax, Math.max(...ys));
    if (p.ymin === '' && p.ymax === '') { const pad = (y1 - y0 || 1) * 0.06; y0 -= pad; y1 += pad; }
    if (x1 === x0) x1 = x0 + 1; if (y1 === y0) y1 = y0 + 1;
    const xt = ticks(x0, x1, Math.max(3, Math.round(p.w / 14))), yt = ticks(y0, y1, Math.max(3, Math.round(p.h / 10)));
    const yLabW = p.yNumbers ? Math.max(...yt.out.map(v => RNBX.text.measure(fmtTick(v, yt.st), fs))) + 1.2 : 0.5;
    const L = -p.w / 2 + fs * 2.1 + yLabW, R = p.w / 2 - 1.2, T = -p.h / 2 + 1.2, B = p.h / 2 - fs * 2.6;
    const X = v => p.xreverse ? R - (v - x0) / (x1 - x0) * (R - L) : L + (v - x0) / (x1 - x0) * (R - L);
    const Y = v => B - (v - y0) / (y1 - y0) * (B - T);
    const tk = fs * 0.4 * (p.ticksIn ? -1 : 1);
    let s = `<g font-family="${U.esc(S.font)}" font-size="${n(fs)}" fill="${ink}">`;
    const cid = 'rbx-plotclip-' + Math.round((p.w + p.h) * 1000 + series.length);
    s += `<defs><clipPath id="${cid}"><rect x="${n(L)}" y="${n(T)}" width="${n(R - L)}" height="${n(B - T)}"/></clipPath></defs>`;
    // data
    s += `<g clip-path="url(#${cid})">`;
    series.forEach((sr, i) => {
      const pts = decimate(sr.x, sr.y);
      const d = 'M ' + pts.map(q => n(X(q[0])) + ' ' + n(Y(q[1] + i * off))).join(' L ');
      const dash = sr.dash === 'dash' ? `stroke-dasharray="${n(lw * 5)} ${n(lw * 3)}"` : sr.dash === 'dot' ? `stroke-dasharray="${n(lw)} ${n(lw * 2.5)}"` : '';
      s += `<path d="${d}" fill="none" stroke="${sr.color || PALETTE[i % PALETTE.length]}" stroke-width="${n(lw)}" stroke-linejoin="round" stroke-linecap="round" ${dash}/>`;
    });
    s += '</g>';
    // axes
    s += p.frame === 'box' ? `<rect x="${n(L)}" y="${n(T)}" width="${n(R - L)}" height="${n(B - T)}" fill="none" stroke="${ink}" stroke-width="${n(axw)}"/>`
      : `<path d="M ${n(L)} ${n(T)} L ${n(L)} ${n(B)} L ${n(R)} ${n(B)}" fill="none" stroke="${ink}" stroke-width="${n(axw)}"/>`;
    xt.out.forEach(v => { if (v < Math.min(x0, x1) - 1e-12 || v > Math.max(x0, x1) + 1e-12) return; const x = X(v); s += `<line x1="${n(x)}" y1="${n(B)}" x2="${n(x)}" y2="${n(B + tk)}" stroke="${ink}" stroke-width="${n(axw)}"/><text x="${n(x)}" y="${n(B + fs * 1.05)}" text-anchor="middle">${U.esc(fmtTick(v, xt.st))}</text>`; });
    yt.out.forEach(v => { if (v < y0 - 1e-12 || v > y1 + 1e-12) return; const y = Y(v); s += `<line x1="${n(L)}" y1="${n(y)}" x2="${n(L - tk)}" y2="${n(y)}" stroke="${ink}" stroke-width="${n(axw)}"/>` + (p.yNumbers ? `<text x="${n(L - fs * 0.45)}" y="${n(y + fs * 0.35)}" text-anchor="end">${U.esc(fmtTick(v, yt.st))}</text>` : ''); });
    s += `<text x="${n((L + R) / 2)}" y="${n(B + fs * 2.3)}" text-anchor="middle">${RNBX.text.markup(p.xlabel, fs)}</text>`;
    s += `<text transform="translate(${n(-p.w / 2 + fs * 0.85)} ${n((T + B) / 2)}) rotate(-90)" text-anchor="middle">${RNBX.text.markup(p.ylabel, fs)}</text>`;
    // legend
    if (p.legend && series.length > 1) {
      const fl = fs * 0.9, rowH = fl * 1.3, wL = Math.max(...series.map(q => RNBX.text.measure(q.name, fl))) + fl * 2.6;
      const lx = p.legendPos[1] === 'r' ? R - wL - 1 : L + 1, ly = p.legendPos[0] === 't' ? T + 1 : B - 1 - series.length * rowH;
      series.forEach((sr, i) => {
        const yy = ly + (i + 0.5) * rowH;
        s += `<line x1="${n(lx)}" y1="${n(yy)}" x2="${n(lx + fl * 1.8)}" y2="${n(yy)}" stroke="${sr.color || PALETTE[i % PALETTE.length]}" stroke-width="${n(lw * 1.4)}"/><text x="${n(lx + fl * 2.3)}" y="${n(yy + fl * 0.35)}" font-size="${n(fl)}">${U.esc(sr.name)}</text>`;
      });
    }
    if (!series.length) s += `<text x="${n((L + R) / 2)}" y="${n((T + B) / 2)}" text-anchor="middle" fill="#8a919c" font-size="${n(fs * 0.9)}">${lost ? 'The linked stack was deleted' : 'Import data in the inspector'}</text>`;
    return s + '</g>';
  },
});
})();
