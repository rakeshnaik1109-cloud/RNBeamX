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
/* one entry point for every calculation: flat films (transfer matrix,
   instant) or a grating (RCWA, in the background: returns the last
   result with pending: true, or { pending, progress }, until done) */
const lastRcwa = new Map();
const notify = () => RNBX.changed();
DataIO.calcResult = (src, doc) => {
  const def = src && lib.get(src.type);
  if (!def || !def.stack || !RNBX.thinfilm) return null;
  const calc = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, src.props.calc || {});
  if (def.grating && RNBX.rcwa && calc.method !== 'tmm') {
    const geo = def.grating(src.props, src, doc);
    if (geo) {
      const c2 = Object.assign({}, calc, { points: calc.rpoints || 101 });
      const r = RNBX.rcwa.cached(geo, c2, notify);
      if (r.pending) { const last = lastRcwa.get(src.id); return last ? Object.assign({}, last, { pending: true, progress: r.progress }) : r; }
      lastRcwa.set(src.id, r);
      return r;
    }
  }
  return RNBX.thinfilm.cached(def.stack(src.props, src, doc), calc);
};
/* ---------- sensing: the resonance (dip of R, or peak of A), its
   sensitivity to the analyte index, and a sensorgram that follows the
   animation. Thin-film sources only (an RCWA grating is too slow to
   recompute every frame). ---------- */
const resCache = new Map();
DataIO.canSense = src => { const def = src && lib.get(src.type); return !!(def && def.stack && !(def.grating && RNBX.rcwa && (src.props.calc || {}).method !== 'tmm')); };
DataIO.resUnit = calc => (calc.scan === 'wl' ? (calc.unit === 'um' ? 'µm' : 'nm') : '°');
/* resonance position (x of the curve) with props overridden; null if it is not inside the range */
DataIO.resonance = (src, doc, props) => {
  if (!DataIO.canSense(src)) return null;
  const def = lib.get(src.type), p = props ? Object.assign({}, src.props, props) : src.props, TF = RNBX.thinfilm;
  const calc = Object.assign({}, TF.DEFAULT_CALC, p.calc || {}), st = def.stack(p, src, doc), key = JSON.stringify([st, calc]);
  if (resCache.has(key)) return resCache.get(key);
  const r = TF.scan(st, calc), dip = calc.show.includes('R') || !calc.show.includes('A');
  const e = TF.extremum(r.x, dip ? r.series.R : r.series.A, dip ? 'min' : 'max'), v = e && !e.edge ? e.x : null;
  if (resCache.size > 4000) resCache.delete(resCache.keys().next().value);
  resCache.set(key, v);
  return v;
};
/* SPR prism: the analyte index now (database liquids at the working wavelength) */
DataIO.analyteN = (src, props) => {
  const p = props ? Object.assign({}, src.props, props) : src.props;
  if (src.type !== 'prism') return null;
  if (p.analyte === 'custom') return +p.analyteN;
  const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, p.calc || {}), lam = c.scan === 'wl' ? (+c.lmin + +c.lmax) / 2 : +c.lambda;
  return RNBX.thinfilm.nk({ mat: p.analyte }, lam).n;
};
/* bulk sensitivity S = d(resonance)/dn, in nm/RIU or °/RIU */
DataIO.sensitivity = (src, doc) => {
  const n0 = DataIO.analyteN(src);
  if (n0 == null) return null;
  const dn = 0.002, a = DataIO.resonance(src, doc, { analyte: 'custom', analyteN: n0 - dn }), b = DataIO.resonance(src, doc, { analyte: 'custom', analyteN: n0 + dn });
  if (a == null || b == null) return null;
  const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, src.props.calc || {});
  return (b - a) / (2 * dn) * (c.scan === 'wl' && c.unit === 'um' ? 1000 : 1);
};
/* the sensorgram: resonance at evenly spaced times over the animation
   (so frames reuse the cache), cut at tNow plus the exact point there */
DataIO.sensorgram = (src, doc, tNow) => {
  const an = doc.animation || {}, keys = (an.tracks || {})[src.id], D = an.duration || 6, N = 150;
  const at = t => { const s = keys && keys.length ? RNBX.anim.sample(keys, t) : null; return s && s.props ? s.props : null; };
  const pt = t => { const pr = at(t); return { t, n: DataIO.analyteN(src, pr), r: DataIO.resonance(src, doc, pr) }; };
  const all = [];
  for (let i = 0; i <= N; i++) all.push(pt(D * i / N));
  const T = tNow == null ? D : U.clamp(tNow, 0, D), shown = all.filter(q => q.t <= T + 1e-9);
  if (!shown.length || shown[shown.length - 1].t < T - 1e-9) shown.push(pt(T));
  return { all, shown, now: shown[shown.length - 1], D, animated: !!(keys && keys.some(k => k.props)) };
};
DataIO.sensorCsv = plot => {
  const doc = RNBX.state.doc, src = doc.objects.find(o => o.id === plot.props.link);
  if (!src) return;
  const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, src.props.calc || {}), u = DataIO.resUnit(c), sg = DataIO.sensorgram(src, doc, null);
  const r0 = sg.all[0].r, head = ['Time (s)', 'Analyte index', 'Resonance (' + u + ')', 'Shift (' + u + ')'];
  const rows = sg.all.map(q => [U.round(q.t, 4), q.n == null ? '' : q.n.toFixed(5), q.r == null ? '' : q.r.toFixed(4), q.r == null || r0 == null ? '' : (q.r - r0).toFixed(4)].join(','));
  U.track('sensorgram-csv');
  U.download(new Blob([head.join(',') + '\n' + rows.join('\n') + '\n'], { type: 'text/csv' }), 'sensorgram.csv');
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
/* a sensorgram panel for an SPR chip or stack (opt.quiet: no undo step of its own, no toast) */
DataIO.addSensorPanel = (src, opt = {}) => {
  if (!DataIO.canSense(src)) return;
  const hist = RNBX.history, cp = hist.checkpoint;
  if (opt.quiet) hist.checkpoint = () => {};
  const doc = RNBX.state.doc, before = new Set(doc.objects.map(o => o.id));
  let plot;
  try { plot = RNBX.arrange.addDataPanel(); } finally { hist.checkpoint = cp; }
  // its panel letter: the next one after those already on the page
  const used = doc.objects.filter(o => o.type === 'panel' && before.has(o.id)).map(o => String(o.props.text || '').trim().toLowerCase()).filter(t => /^[a-z]$/.test(t));
  const fresh = doc.objects.filter(o => o.type === 'panel' && !before.has(o.id));
  if (used.length && fresh.length) fresh[fresh.length - 1].props.text = String.fromCharCode(Math.min(122, Math.max(...used.map(t => t.charCodeAt(0))) + 1));
  Object.assign(plot.props, { link: src.id, linkAuto: true, mode: 'sensor', series: [], legend: false, yNumbers: true, readout: true, showS: src.type === 'prism' });
  if (!opt.quiet) {
    RNBX.changed(); RNBX.inspector.build();
    RNBX.toast(A_HINT);
  }
  U.track('sensor-panel');
  return plot;
};
const A_HINT = 'Sensorgram added: animate the analyte index (Animate ▸ SPR sensing) and it tracks the resonance live';
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
    link: '', linkAuto: true, mode: 'curve', mark: false, readout: true, showS: false, sgX: 'time', sgY: 'abs',
  },
  params: [
    { key: 'series', label: 'Data', type: 'series' },
    { key: 'linkAuto', label: 'Axis titles from the calculation', type: 'bool', show: p => !!p.link },
    { key: 'mode', label: 'Show', type: 'select', options: [['curve', 'The calculated curve'], ['sensor', 'Sensorgram (resonance during the animation)']], show: p => !!p.link },
    { key: 'mark', label: 'Mark the resonance (live)', type: 'bool', show: p => !!p.link && p.mode !== 'sensor', hint: 'follows the dip while you edit or animate' },
    { key: 'sgX', label: 'Sensorgram x axis', type: 'select', options: [['time', 'Time'], ['n', 'Analyte index']], show: p => !!p.link && p.mode === 'sensor' },
    { key: 'sgY', label: 'Sensorgram y axis', type: 'select', options: [['abs', 'Resonance position'], ['shift', 'Shift from the start']], show: p => !!p.link && p.mode === 'sensor' },
    { key: 'readout', label: 'Values on the panel', type: 'bool', show: p => !!p.link && (p.mode === 'sensor' || p.mark) },
    { key: 'showS', label: 'Sensitivity S (nm/RIU)', type: 'bool', show: p => !!p.link && (p.mode === 'sensor' || p.mark) && p.readout },
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
    let series = (p.series || []).filter(s => s.x && s.x.length), lost = false, busy = null;
    let mark = null, dot = null, fix = null, info = [], msg = '', hintTxt = '';
    const src = p.link ? S.doc.objects.find(o => o.id === p.link) : null;
    if (p.link && p.mode === 'sensor' && src) {
      // sensorgram: the resonance as the animation runs (axes fixed to the whole run)
      const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, src.props.calc || {}), u = DataIO.resUnit(c), wl = c.scan === 'wl';
      series = [];
      if (!DataIO.canSense(src)) msg = 'A sensorgram needs a thin-film stack or SPR prism';
      else {
        const sg = DataIO.sensorgram(src, S.doc, S.time), useN = p.sgX === 'n' && src.type === 'prism', r0 = sg.all[0].r;
        const xv = q => (useN ? q.n : q.t), yv = q => (q.r == null || (p.sgY === 'shift' && r0 == null) ? null : p.sgY === 'shift' ? q.r - r0 : q.r);
        const ok = q => xv(q) != null && yv(q) != null, pts = sg.shown.filter(ok), full = sg.all.filter(ok);
        if (pts.length) series = [{ name: 'Resonance', x: pts.map(xv), y: pts.map(yv), color: '#d62728', dash: 'solid' }];
        if (full.length) {
          const fx = full.map(xv), fy = full.map(yv), yl = Math.min(...fy), yh = Math.max(...fy), sp = Math.max(yh - yl, wl ? 0.5 : 0.05);
          fix = { x: useN ? [Math.min(...fx), Math.max(...fx)] : [0, sg.D], y: [(yl + yh) / 2 - sp * 0.56, (yl + yh) / 2 + sp * 0.56] };
          if (fix.x[1] - fix.x[0] < 1e-6) fix.x = [fix.x[0] - (useN ? 0.001 : 0.5), fix.x[1] + (useN ? 0.001 : 0.5)];
        }
        const now = sg.now;
        if (ok(now)) dot = [xv(now), yv(now)];
        if (!pts.length) msg = 'No resonance inside the scan range';
        else if (!sg.animated && S.live) hintTxt = 'Animate → SPR sensing to run it';
        if (p.readout && now.r != null) {
          info.push((wl ? 'λ_{res}' : 'θ_{res}') + ' = ' + U.fmt(now.r, wl ? (c.unit === 'um' ? 4 : 2) : 3) + (u === '°' ? '°' : ' ' + u));
          if (r0 != null && sg.animated) info.push('Δ = ' + (now.r - r0 >= 0 ? '+' : '−') + U.fmt(Math.abs(now.r - r0), wl ? 2 : 3) + (u === '°' ? '°' : ' ' + u));
          if (now.n != null) info.push('n = ' + now.n.toFixed(4));
        }
        if (p.linkAuto) p = Object.assign({}, p, { xlabel: useN ? 'Analyte refractive index (RIU)' : 'Time (s)',
          ylabel: (p.sgY === 'shift' ? 'Shift Δ' : 'Resonance ') + (wl ? 'λ_{res}' : 'θ_{res}') + ' (' + u + ')' });
      }
    } else if (p.link) {
      // live: recomputed from the linked stack on every change and animation frame
      const res = src ? DataIO.calcResult(src, S.doc) : null;
      if (res && res.x) { series = DataIO.calcSeries(res); if (p.linkAuto) p = Object.assign({}, p, { xlabel: res.xlabel, ylabel: DataIO.calcYLabel(res) }); }
      else if (res && res.pending) { series = []; busy = res.progress || 0; }
      else { series = []; lost = true; }
      if (res && res.pending && res.x) busy = res.progress || 0;
      if (p.mark && res && res.x && !res.pending) {
        // live resonance marker: follows the dip as the stack changes or animates
        const c = res.calc, u = DataIO.resUnit(c), wl = c.scan === 'wl', dip = c.show.includes('R') || !c.show.includes('A');
        const e = RNBX.thinfilm.extremum(res.x, dip ? res.series.R : res.series.A, dip ? 'min' : 'max');
        if (e && !e.edge) {
          mark = e;
          if (p.readout) {
            info.push((wl ? 'λ_{res}' : 'θ_{res}') + ' = ' + U.fmt(e.x, wl ? (c.unit === 'um' ? 4 : 2) : 3) + (u === '°' ? '°' : ' ' + u));
            const nA = DataIO.analyteN(src);
            if (nA != null) info.push('n = ' + nA.toFixed(4));
            const Sv = p.showS && src.type === 'prism' ? DataIO.sensitivity(src, S.doc) : null;
            if (Sv != null) info.push('S = ' + U.fmt(Sv, wl ? 0 : 1) + ' ' + (u === '°' ? '°' : 'nm') + '/RIU');
          }
        }
      }
    }
    if (p.mode === 'sensor' && p.showS && src && src.type === 'prism' && p.readout && DataIO.canSense(src)) {
      const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, src.props.calc || {}), Sv = DataIO.sensitivity(src, S.doc);
      if (Sv != null) info.push('S = ' + U.fmt(Sv, c.scan === 'wl' ? 0 : 1) + ' ' + (c.scan === 'wl' ? 'nm' : '°') + '/RIU');
    }
    let xs = [], ys = [];
    const range = (s) => { const r = Math.max(...s.y) - Math.min(...s.y); return isFinite(r) ? r : 1; };
    const off = series.length ? p.offset * Math.max(...series.map(range)) : 0;
    series.forEach((s, i) => { xs = xs.concat([Math.min(...s.x), Math.max(...s.x)]); ys = ys.concat([Math.min(...s.y) + i * off, Math.max(...s.y) + i * off]); });
    if (!series.length) { xs = [0, 1]; ys = [0, 1]; }
    if (fix) { xs = fix.x; ys = fix.y; }
    const num = (v, d) => (v === '' || v == null || !isFinite(parseFloat(v)) ? d : parseFloat(v));
    let x0 = num(p.xmin, Math.min(...xs)), x1 = num(p.xmax, Math.max(...xs));
    let y0 = num(p.ymin, Math.min(...ys)), y1 = num(p.ymax, Math.max(...ys));
    if (p.ymin === '' && p.ymax === '' && !fix) { const pad = (y1 - y0 || 1) * 0.06; y0 -= pad; y1 += pad; }
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
    if (mark) s += `<line x1="${n(X(mark.x))}" y1="${n(T)}" x2="${n(X(mark.x))}" y2="${n(B)}" stroke="#d62728" stroke-width="${n(lw * 0.7)}" stroke-dasharray="${n(lw * 3)} ${n(lw * 2)}"/><circle cx="${n(X(mark.x))}" cy="${n(Y(mark.y))}" r="${n(lw * 1.6)}" fill="#d62728"/>`;
    if (dot) s += `<circle cx="${n(X(dot[0]))}" cy="${n(Y(dot[1]))}" r="${n(lw * 1.8)}" fill="#d62728" stroke="${RNBX.isDarkPage(S.doc.page) ? '#0b1020' : '#ffffff'}" stroke-width="${n(lw * 0.5)}"/>`;
    s += '</g>';
    // readout of the resonance: on the side away from the marker
    if (info.length) {
      const fr = fs * 0.85, right = mark ? X(mark.x) < (L + R) / 2 : false, tx = right ? R - fr * 0.6 : L + fr * 0.6;
      info.forEach((t, i) => { s += `<text x="${n(tx)}" y="${n(T + fr * (1.25 + i * 1.25))}" font-size="${n(fr)}" text-anchor="${right ? 'end' : 'start'}">${RNBX.text.markup(t, fr)}</text>`; });
    }
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
    if (!series.length) s += `<text x="${n((L + R) / 2)}" y="${n((T + B) / 2)}" text-anchor="middle" fill="#8a919c" font-size="${n(fs * 0.9)}">${msg ? U.esc(msg) : busy != null ? `Calculating (RCWA)… ${Math.round(busy * 100)} %` : lost ? 'The linked stack was deleted' : 'Import data in the inspector'}</text>`;
    else if (hintTxt) s += `<text x="${n(R - 1)}" y="${n(B - fs * 0.6)}" text-anchor="end" fill="#8a919c" font-size="${n(fs * 0.75)}">${U.esc(hintTxt)}</text>`;
    else if (busy != null && S.interactive !== false) s += `<text x="${n(R - 1)}" y="${n(T + fs * 0.9)}" text-anchor="end" fill="#8a919c" font-size="${n(fs * 0.8)}">updating ${Math.round(busy * 100)} %</text>`;
    return s + '</g>';
  },
});
})();
