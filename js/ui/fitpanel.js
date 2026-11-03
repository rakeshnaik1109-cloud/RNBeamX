/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/fitpanel.js
   Layer Studio ▸ Layers ▸ Fit to a measurement.

   Load a measured R, T or A spectrum (file, paste, or the spectrum
   handed over from RNSpectraX), tick what may change — thickness of
   any film, n and k of custom films, a scale factor and an offset —
   and fit (engine/fit.js: Levenberg–Marquardt from several starting
   points, with standard errors). The fitted values are written into
   the design as one undoable step; the measurement is drawn over
   the calculated spectrum.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, D = RNBX.dom, el = D.el;
const LF = RNBX.layerFit = {};
const KEY = 'rnbx-layerfit-v1';
const ST = () => RNBX.studio, TF = () => RNBX.thinfilm, UI = () => RNBX.studio.ui;

/* state: the measurement (kept between sessions) and the fit settings */
let meas = null, opts = null, result = null, running = 0, host = null;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ meas, opts })); } catch (e) { /* optional */ } };
(() => { try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); if (v && v.meas) { meas = v.meas; opts = v.opts; } } catch (e) { /* none */ } })();
const defaults = () => ({ series: 0, q: 'R', xkind: 'nm', ypct: false, xmin: null, xmax: null, free: {}, bounds: {}, scale: false, offset: false });

/* the films of a design that can be fitted, in list order (repeat groups: the film once, it repeats) */
const filmsOf = dd => { const out = []; const walk = (items, path) => items.forEach((it, i) => { if (it.group) walk(it.items, path.concat((it.name || 'Repeat') + ' ×' + it.repeat)); else out.push({ f: it, label: path.concat(it.name || TF().name(it.mat)).join(' ▸ ') }); }); walk(dd.items, []); return out; };
/* parameters: [{ key, label, get(dd), set(dd, v), lo, hi, unit }] */
LF.params = dd => {
  const fs = filmsOf(dd), P = [];
  fs.forEach((x, i) => {
    P.push({ key: 't' + i, label: x.label + ' — thickness', unit: 'nm', get: d2 => +filmsOf(d2)[i].f.nm || 0, set: (d2, v) => { filmsOf(d2)[i].f.nm = v; }, lo: v => Math.max(0, v * 0.5), hi: v => Math.max(v * 1.5, v + 20) });
    if (x.f.mat === 'custom') {
      P.push({ key: 'n' + i, label: x.label + ' — n', unit: '', get: d2 => +filmsOf(d2)[i].f.n || 1.5, set: (d2, v) => { filmsOf(d2)[i].f.n = v; }, lo: v => Math.max(1, v - 0.5), hi: v => v + 0.5 });
      P.push({ key: 'k' + i, label: x.label + ' — k', unit: '', get: d2 => +filmsOf(d2)[i].f.k || 0, set: (d2, v) => { filmsOf(d2)[i].f.k = v; }, lo: () => 0, hi: v => Math.max(0.5, v * 3) });
    }
  });
  P.push({ key: 'scale', label: 'Scale factor (measurement calibration)', unit: '×', get: () => 1, set: null, lo: () => 0.7, hi: () => 1.3 });
  P.push({ key: 'offset', label: 'Offset (stray light, background)', unit: '', get: () => 0, set: null, lo: () => -0.1, hi: () => 0.1 });
  return P;
};
/* the measured points used (in nm or degrees, as fractions) */
LF.points = () => {
  if (!meas) return null;
  const s = meas.series[opts.series] || meas.series[0]; if (!s) return null;
  const k = opts.xkind === 'um' ? 1000 : 1, f = opts.ypct ? 0.01 : 1, lo = opts.xmin == null ? -Infinity : +opts.xmin, hi = opts.xmax == null ? Infinity : +opts.xmax;
  const pts = []; s.x.forEach((x, i) => { const X = x * k; if (X >= lo * (opts.xkind === 'um' ? 1000 : 1) && X <= hi * (opts.xkind === 'um' ? 1000 : 1) && isFinite(s.y[i])) pts.push([X, s.y[i] * f]); });
  pts.sort((a, b) => a[0] - b[0]);
  // at most 300 points for the fit (evenly thinned)
  const step = Math.max(1, Math.ceil(pts.length / 300));
  return { all: pts, fit: pts.filter((p, i) => i % step === 0), angle: opts.xkind === 'deg' };
};
/* model values at the points for a design and scale / offset */
LF.model = (dd, pts, sc = 1, off = 0) => {
  const st = ST().stack(dd), c = dd.calc, q = opts.q;
  return pts.map(p => { const r = pts.angle ? TF().response(st, +c.lambda, Math.min(89.99, p[0]), c.pol) : TF().response(st, p[0], +c.angle || 0, c.pol); return sc * r[q] + off; });
};
/* the measurement over the calculated spectrum (called by the Layers tab) */
LF.overlay = () => {
  const P = meas && opts && LF.points(); if (!P || !P.all.length) return null;
  // shown corrected for a fitted scale and offset, so it lies on the model
  const sc = result ? (result.free.find(x => x.key === 'scale') || { v: 1 }).v : 1, off = result ? (result.free.find(x => x.key === 'offset') || { v: 0 }).v : 0;
  return { x: P.all.map(p => p[0]), y: P.all.map(p => (p[1] - off) / sc), q: opts.q, angle: P.angle, corrected: sc !== 1 || off !== 0 };
};

/* fit: returns { values: { key: v }, sigma, rms, ... } */
LF.fit = async (dd, onStep) => {
  const P = LF.points(); if (!P || P.fit.length < 3) throw new Error('Load a measured spectrum first (at least 3 points in the range)');
  const all = LF.params(dd), free = all.filter(p => opts.free[p.key] || (p.key === 'scale' && opts.scale) || (p.key === 'offset' && opts.offset));
  if (!free.length) throw new Error('Tick at least one parameter to fit');
  const p0 = free.map(p => p.get(dd)), b = opts.bounds || {};
  const lo = free.map((p, i) => (b[p.key] && isFinite(b[p.key][0]) ? +b[p.key][0] : p.lo(p0[i]))), hi = free.map((p, i) => (b[p.key] && isFinite(b[p.key][1]) ? +b[p.key][1] : p.hi(p0[i])));
  const work = JSON.parse(JSON.stringify(dd)), pts = P.fit; pts.angle = P.angle;
  const f = pv => {
    let sc = 1, off = 0;
    free.forEach((p, i) => { if (p.key === 'scale') sc = pv[i]; else if (p.key === 'offset') off = pv[i]; else p.set(work, pv[i]); });
    const m = LF.model(work, pts, sc, off); return m.map((v, i) => v - pts[i][1]);
  };
  const r0 = f(p0), rms0 = Math.sqrt(r0.reduce((a, v) => a + v * v, 0) / r0.length);
  const res = await RNBX.fit.global(f, p0, lo, hi, { onStep });
  const ybar = pts.reduce((a, p) => a + p[1], 0) / pts.length, sst = pts.reduce((a, p) => a + (p[1] - ybar) ** 2, 0);
  return { free: free.map((p, i) => ({ key: p.key, label: p.label, unit: p.unit, v0: p0[i], v: res.p[i], s: res.sigma[i], lo: lo[i], hi: hi[i], atBound: Math.abs(res.p[i] - lo[i]) < 1e-6 * (hi[i] - lo[i] || 1) || Math.abs(res.p[i] - hi[i]) < 1e-6 * (hi[i] - lo[i] || 1) })), rms: res.rms, rms0, r2: 1 - res.ssr / (sst || 1), n: pts.length };
};
/* write fitted thicknesses / n / k into a copy of the design (scale and offset stay with the fit) */
LF.apply = (dd, fr) => { const out = JSON.parse(JSON.stringify(dd)), all = LF.params(out); fr.free.forEach(x => { const p = all.find(q => q.key === x.key); if (p && p.set) p.set(out, +x.v.toPrecision(6)); }); return out; };

/* ---------- loading ---------- */
const take = (data, name) => {
  meas = { name: name || 'Measurement', series: data.series.map(s => ({ name: s.name, x: s.x.slice(), y: s.y.slice() })) };
  const s = meas.series[0], d = ST().design(), xmax = Math.max(...s.x), ymax = Math.max(...s.y.map(Math.abs));
  opts = Object.assign(defaults(), opts ? { free: opts.free, bounds: {} } : {});
  opts.ypct = ymax > 1.5;
  opts.xkind = d.calc.scan === 'angle' ? 'deg' : xmax < 30 ? 'um' : 'nm';
  opts.q = (d.calc.show || 'R').replace(/[^RTA]/g, '')[0] || 'R';
  result = null; save(); LF.render(); ST().rerender();
};
LF.load = (data, name) => take(data, name);
const fromFile = () => RNBX.project.pickFile('.csv,.txt,.dat,.tsv,text/plain', f => f.text().then(t => take(RNBX.plotData.parse(t), f.name)).catch(e => RNBX.toast(e.message || String(e), 'error')));
const fromPaste = () => {
  const ta = el('textarea', { rows: 10, style: { width: '100%', fontFamily: 'monospace' }, placeholder: 'wavelength, value\n400, 0.12\n405, 0.13\n…' });
  const m = D.modal({ title: 'Paste a measured spectrum', sub: 'Two columns: x and the measured value (fraction or %)', body: ta, foot: [el('button', { class: 'btn primary', type: 'button', text: 'Use', onclick: () => { try { take(RNBX.plotData.parse(ta.value), 'Pasted'); m.close(); } catch (e) { RNBX.toast(e.message, 'error'); } } })] });
};
const fromSpectraX = () => { const h = RNBX.plotData.readHandoff(); if (!h) { RNBX.toast('Nothing received yet: in RNSpectraX open Export ▾ and press “→ RNBeamX”.'); return; } take(h, 'From RNSpectraX'); };

/* ---------- the panel ---------- */
const fld = (label, input) => el('label', { class: 'st-f' }, el('span', { text: label }), input);
const sel = (options, get, set) => { const s = el('select', { onchange: () => { set(s.value); result = null; save(); LF.render(); ST().rerender(); } }, options.map(o => el('option', { value: o[0], text: o[1] }))); s.value = String(get()); return s; };
const numIn = (get, set, o = {}) => { const i = el('input', { type: 'number', value: get() == null ? '' : get(), step: o.step || 'any', placeholder: o.ph || '', style: { width: o.w || '72px' }, onchange: () => { set(i.value === '' ? null : +i.value); save(); if (o.redraw) { LF.render(); ST().rerender(); } } }); return i; };
LF.panel = () => { host = el('div', { class: 'lf-panel' }); LF.render(); return host; };
LF.render = () => {
  if (!host) return;
  host.innerHTML = '';
  host.append(el('div', { class: 'ps-addrow' },
    el('button', { class: 'btn small', type: 'button', text: 'Load measured…', title: 'CSV or text: x and the measured value', onclick: fromFile }),
    el('button', { class: 'btn small', type: 'button', text: 'Paste…', onclick: fromPaste }),
    el('button', { class: 'btn small', type: 'button', text: 'From RNSpectraX', title: 'The spectrum sent with Export ▾ → RNBeamX', onclick: fromSpectraX }),
    meas ? el('button', { class: 'btn small ghost', type: 'button', text: 'Remove the measurement', onclick: () => { meas = null; result = null; save(); LF.render(); ST().rerender(); } }) : el('span')));
  if (!meas) { host.append(el('div', { class: 'hint', text: 'Load a measured reflectance, transmittance or absorptance spectrum to compare it with the design and fit the film thicknesses (and n, k of custom films). Two columns: wavelength (or angle) and the value, as a fraction or in %.' })); return; }
  opts = Object.assign(defaults(), opts || {});
  const s = meas.series[opts.series] || meas.series[0], d = ST().design();
  const g = [];
  if (meas.series.length > 1) g.push(fld('Series', sel(meas.series.map((q, i) => [String(i), q.name]), () => opts.series, v => { opts.series = +v; })));
  g.push(fld('Measured', sel([['R', 'Reflectance R'], ['T', 'Transmittance T'], ['A', 'Absorptance A']], () => opts.q, v => { opts.q = v; })),
    fld('x is', sel([['nm', 'Wavelength (nm)'], ['um', 'Wavelength (µm)'], ['deg', 'Angle of incidence (°)']], () => opts.xkind, v => { opts.xkind = v; })),
    fld('Values in', sel([['0', 'Fraction (0–1)'], ['1', 'Per cent']], () => (opts.ypct ? '1' : '0'), v => { opts.ypct = v === '1'; })),
    fld('Fit from', numIn(() => opts.xmin, v => { opts.xmin = v; }, { ph: String(Math.min(...s.x)), redraw: true })), fld('to', numIn(() => opts.xmax, v => { opts.xmax = v; }, { ph: String(Math.max(...s.x)), redraw: true })));
  host.append(el('div', { class: 'st-grid' }, ...g));
  const P = LF.points();
  const wl = opts.xkind !== 'deg';
  host.append(el('div', { class: 'hint', text: `${U.esc(meas.name)}: ${s.x.length} points${P ? `, ${P.all.length} in the range (${P.fit.length} used in the fit)` : ''}. The model uses the design's ${wl ? `angle ${d.calc.angle || 0}°` : `wavelength ${d.calc.lambda} nm`} and ${d.calc.pol === 'avg' ? 'unpolarised' : d.calc.pol + '-polarised'} light (Optical response settings).${(wl && d.calc.scan !== 'wl') || (!wl && d.calc.scan !== 'angle') ? ' Set the Optical response to the same axis to see the overlay.' : ''}` }));
  // parameters
  const all = LF.params(d), tbl = el('table', { class: 'st-tab lf-tab' }, el('tr', {}, el('th', { text: 'Fit' }), el('th', { text: 'Parameter' }), el('th', { text: 'Now' }), el('th', { text: 'Min' }), el('th', { text: 'Max' })));
  all.forEach(p => {
    const on = p.key === 'scale' ? opts.scale : p.key === 'offset' ? opts.offset : !!opts.free[p.key], v = p.get(d), b = (opts.bounds || {})[p.key] || [];
    const cb = el('input', { type: 'checkbox', checked: on, onchange: () => { if (p.key === 'scale') opts.scale = cb.checked; else if (p.key === 'offset') opts.offset = cb.checked; else opts.free[p.key] = cb.checked; save(); } });
    const bset = (k, val) => { opts.bounds = opts.bounds || {}; const cur = opts.bounds[p.key] || [null, null]; cur[k] = val; opts.bounds[p.key] = cur; };
    tbl.append(el('tr', {}, el('td', {}, cb), el('td', { text: p.label }), el('td', { text: UI().f1(v, p.unit === 'nm' ? 1 : 3) + (p.unit === 'nm' ? ' nm' : '') }),
      el('td', {}, numIn(() => b[0], val => bset(0, val), { ph: UI().f1(p.lo(v), p.unit === 'nm' ? 0 : 2), w: '62px' })), el('td', {}, numIn(() => b[1], val => bset(1, val), { ph: UI().f1(p.hi(v), p.unit === 'nm' ? 0 : 2), w: '62px' }))));
  });
  host.append(tbl, el('div', { class: 'hint', text: 'Empty min / max = the default range (thickness 0.5× to 1.5×, n ± 0.5). Wide ranges are searched from several starting points, so a fit does not stop on the wrong interference fringe.' }));
  const status = el('div', { class: 'hint' });
  const go = el('button', { class: 'btn small primary', type: 'button', text: 'Fit', onclick: async () => {
    const run = ++running; go.disabled = true; status.textContent = 'Fitting… 0 %';
    try {
      const fr = await LF.fit(ST().design(), async fr2 => { status.textContent = `Fitting… ${Math.round(fr2 * 100)} %`; await new Promise(r => setTimeout(r, 0)); });
      if (run !== running) return;
      result = fr;
      ST().setDesign(LF.apply(ST().design(), fr));
      RNBX.toast(`Fitted: RMS ${UI().f1(fr.rms * 100, 2)} % (was ${UI().f1(fr.rms0 * 100, 2)} %). Ctrl+Z undoes it.`);
    } catch (e) { status.textContent = e.message || String(e); go.disabled = false; }
  } });
  host.append(el('div', { class: 'row', style: { gap: '8px', alignItems: 'center', margin: '6px 0' } }, go, status));
  if (result) {
    const rows = result.free.map(x => `<tr><td>${U.esc(x.label)}</td><td><b>${fmtV(x.v, x.unit)}</b> ± ${fmtV(x.s, x.unit)}</td><td>${fmtV(x.v0, x.unit)}</td><td>${x.atBound ? '<span style="color:var(--danger)">at a limit</span>' : ''}</td></tr>`).join('');
    host.append(el('div', { class: 'readout', html: `Fit to ${result.n} points: RMS deviation ${UI().f1(result.rms * 100, 2)} % (was ${UI().f1(result.rms0 * 100, 2)} %), R² = ${UI().f1(result.r2, 4)}.<table class="st-tab"><tr><th>Parameter</th><th>Fitted ± 1σ</th><th>Before</th><th></th></tr>${rows}</table><span class="hint" style="margin:0">The values are in the design (Ctrl+Z restores the old ones). σ comes from the fit's covariance and assumes the material data are exact; a value at a limit means the range should be widened. Scale and offset describe the measurement, not the sample.</span>` }));
    drawResidual();
  }
};
const fmtV = (v, unit) => (!isFinite(v) ? '–' : unit === 'nm' ? UI().f1(v, Math.abs(v) < 10 ? 2 : 1) + ' nm' : UI().f1(v, 4));
function drawResidual() {
  const P = LF.points(); if (!P || !result) return;
  const d = ST().design(), sc = (result.free.find(x => x.key === 'scale') || { v: 1 }).v, off = (result.free.find(x => x.key === 'offset') || { v: 0 }).v;
  const pts = P.all.slice(); pts.angle = P.angle;
  const m = LF.model(d, pts, sc, off), res = pts.map((p, i) => (p[1] - m[i]) * 100), w = Math.max(280, host.clientWidth || 400), mx = Math.max(0.5, ...res.map(Math.abs));
  const ch = UI().chart({ id: 'lf-res', w, h: 130, xr: [pts[0][0], pts[pts.length - 1][0]], yr: [-mx * 1.1, mx * 1.1], xlabel: P.angle ? 'Angle (°)' : 'Wavelength (nm)', ylabel: 'Residual (%)', series: [{ x: pts.map(p => p[0]), y: res, color: '#7f7f7f', w: 1.2 }],
    over: (X, Y) => `<line x1="${X(pts[0][0])}" x2="${X(pts[pts.length - 1][0])}" y1="${Y(0)}" y2="${Y(0)}" stroke="#d62728" stroke-dasharray="3 3"/>` });
  host.append(el('div', { html: ch.svg }));
}
})();
