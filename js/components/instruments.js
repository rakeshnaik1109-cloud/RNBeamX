/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/instruments.js
   Lab instruments & computing: oscilloscope, function generator,
   power supply, lock-in amplifier, DAQ box, laptop, desktop
   computer, hot plate / stirrer, centrifuge, balance, syringe and
   peristaltic pumps, gas cylinder, vacuum pump and chamber,
   ultrasonic bath, fume hood, glovebox, freezer, retort stand.

   2D: the front of the instrument (w × h on the page), in the
   Schematic (flat, line art) or Shaded (gradients, highlights)
   style. 3D: a body w wide, d deep and h tall standing on the
   table, its front facing +y, so cables and tubing reach it.
   Screens can show spectra, code, text, or a data plot from the
   figure itself. Not optical: light passes them by.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Lab instruments & computing';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Connections'), 0, CAT);

const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const idOf = (obj, p, tag) => 'rbx-in-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const txt = (S, x, y, str, size, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${o.mono ? 'ui-monospace, Menlo, Consolas, monospace' : U.esc(S.font)}" font-size="${n(size)}" fill="${o.color || S.ink}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central" ${o.bold ? 'font-weight="700"' : ''}>${RNBX.text.markup(String(str == null ? '' : str), size)}</text>`;

/* ---------- drawing pieces (2D) ---------- */
const G = {};
G.grad = (S, col, id, dir = 'v') => S.shaded ? `<linearGradient id="${id}" x1="0" y1="0" x2="${dir === 'v' ? 0 : 1}" y2="${dir === 'v' ? 1 : 0}"><stop offset="0" stop-color="${U.lighten(col, 0.22)}"/><stop offset="0.55" stop-color="${col}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.82)}"/></linearGradient>` : '';
G.fill = (S, col, id) => (S.shaded ? `url(#${id})` : U.lighten(col, 0.18));
G.edge = (S, col) => (S.shaded ? U.shadeRgb(col, 0.55) : S.ink);
/* a panel (instrument face, cabinet) with rounded corners */
G.panel = (S, uid, x, y, w, h, col, r = 0.8, tag = 'p') => { const id = `${uid}-${tag}`; return `<defs>${G.grad(S, col, id)}</defs><rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(r)}" fill="${G.fill(S, col, id)}" stroke="${G.edge(S, col)}" stroke-width="${n(S.lw * 0.8)}"/>`; };
G.screen = (S, x, y, w, h, col = '#13202b') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) * 0.06)}" fill="${col}" stroke="${S.shaded ? '#0b0f14' : S.ink}" stroke-width="${n(S.lw * 0.6)}"/>` + (S.shaded ? `<path d="M ${n(x + w * 0.05)} ${n(y + h * 0.08)} L ${n(x + w * 0.45)} ${n(y + h * 0.08)} L ${n(x + w * 0.2)} ${n(y + h * 0.55)} L ${n(x + w * 0.05)} ${n(y + h * 0.55)} Z" fill="#ffffff" fill-opacity="0.06"/>` : '');
G.knob = (S, x, y, r, col = '#2b2f36') => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${S.shaded ? col : '#ffffff'}" stroke="${S.shaded ? U.shadeRgb(col, 0.5) : S.ink}" stroke-width="${n(S.lw * 0.7)}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.62)}" fill="${S.shaded ? U.lighten(col, 0.25) : '#ffffff'}" stroke="${S.shaded ? 'none' : S.ink}" stroke-width="${n(S.lw * 0.4)}"/><line x1="${n(x)}" y1="${n(y)}" x2="${n(x + r * 0.55)}" y2="${n(y - r * 0.55)}" stroke="${S.shaded ? '#e9ecef' : S.ink}" stroke-width="${n(S.lw * 0.7)}" stroke-linecap="round"/>`;
G.button = (S, x, y, w, h, col = '#9aa3ad') => `<rect x="${n(x - w / 2)}" y="${n(y - h / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) * 0.25)}" fill="${S.shaded ? col : '#ffffff'}" stroke="${S.shaded ? U.shadeRgb(col, 0.55) : S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
G.bnc = (S, x, y, r) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${S.shaded ? '#c9ced6' : '#ffffff'}" stroke="${S.shaded ? '#6b737c' : S.ink}" stroke-width="${n(S.lw * 0.6)}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.45)}" fill="${S.shaded ? '#d6b45c' : '#ffffff'}" stroke="${S.shaded ? '#7a6224' : S.ink}" stroke-width="${n(S.lw * 0.4)}"/>`;
G.term = (S, x, y, r, col) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${col}" stroke="${S.shaded ? U.shadeRgb(col, 0.5) : S.ink}" stroke-width="${n(S.lw * 0.6)}"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.35)}" fill="${S.shaded ? '#d6b45c' : '#ffffff'}"/>`;
G.led = (S, x, y, r, col) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${col}" stroke="${S.shaded ? U.shadeRgb(col, 0.5) : S.ink}" stroke-width="${n(S.lw * 0.4)}"/>` + (S.shaded ? `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 2.4)}" fill="${col}" fill-opacity="0.18"/>` : '');
G.digits = (S, x, y, w, h, text, col = '#ff6b5a') => G.screen(S, x, y, w, h, '#0e1216') + txt(S, x + w / 2, y + h / 2, text, Math.min(h * 0.62, w / Math.max(3, String(text).length) * 1.55), { mono: true, color: col, bold: true });
G.vents = (S, x, y, w, h, k = 6) => { let s = ''; for (let i = 0; i < k; i++) s += `<rect x="${n(x + w * i / k + w / k * 0.2)}" y="${n(y)}" width="${n(w / k * 0.55)}" height="${n(h)}" rx="${n(w / k * 0.2)}" fill="${S.shaded ? '#1d2126' : 'none'}" fill-opacity="0.45" stroke="${S.ink}" stroke-opacity="${S.shaded ? 0 : 0.6}" stroke-width="${n(S.lw * 0.4)}"/>`; return s; };

/* waveforms on a scope or in an icon: u in 0…1 → −1…1 */
const WAVES = {
  sine: (u, k) => Math.sin(2 * Math.PI * (2 * u + k * 0.13)),
  square: (u, k) => (Math.sin(2 * Math.PI * (2 * u + k * 0.13)) >= 0 ? 0.8 : -0.8),
  triangle: (u, k) => { const t = ((2 * u + k * 0.13) % 1 + 1) % 1; return 4 * Math.abs(t - 0.5) - 1; },
  pulse: (u, k) => { const t = ((3 * u + k * 0.11) % 1 + 1) % 1; return t < 0.08 ? 0.85 : -0.6; },
  decay: (u, k) => Math.exp(-4 * u) * Math.cos(2 * Math.PI * 7 * u + k) * 0.95,
  noise: (u, k) => { const r = Math.sin(u * 913.7 + k * 17.1) * 43758.5453; return (r - Math.floor(r) - 0.5) * 0.7 + 0.25 * Math.sin(2 * Math.PI * 2 * u); },
};
const WAVE_OPTS = [['sine', 'Sine'], ['square', 'Square'], ['triangle', 'Triangle'], ['pulse', 'Pulses'], ['decay', 'Decaying oscillation'], ['noise', 'Noisy signal']];
const CH_COL = ['#f7d24a', '#4fd3e3', '#e75fb0', '#5c8df0'];
function scopeScreen(S, x, y, w, h, p) {
  let s = G.screen(S, x, y, w, h, '#0c1a14');
  const gc = S.shaded ? '#3a5c4f' : '#7d8a86';
  for (let i = 1; i < 10; i++) s += `<line x1="${n(x + w * i / 10)}" y1="${n(y)}" x2="${n(x + w * i / 10)}" y2="${n(y + h)}" stroke="${gc}" stroke-width="${n(S.lw * (i === 5 ? 0.45 : 0.25))}"/>`;
  for (let i = 1; i < 8; i++) s += `<line x1="${n(x)}" y1="${n(y + h * i / 8)}" x2="${n(x + w)}" y2="${n(y + h * i / 8)}" stroke="${gc}" stroke-width="${n(S.lw * (i === 4 ? 0.45 : 0.25))}"/>`;
  const N = U.clamp(Math.round(p.channels) || 1, 1, 4), f = WAVES[p.wave] || WAVES.sine;
  for (let k = 0; k < N; k++) {
    const off = N > 1 ? (k - (N - 1) / 2) * h / (N + 0.6) * 0.9 : 0, amp = h * (N > 1 ? 0.16 : 0.32);
    let d = ''; for (let i = 0; i <= 160; i++) { const u = i / 160; d += (i ? ' L ' : 'M ') + n(x + w * u) + ' ' + n(y + h / 2 + off - amp * f(u, k)); }
    s += `<path d="${d}" fill="none" stroke="${CH_COL[k]}" stroke-width="${n(S.lw * 0.8)}" stroke-linejoin="round"/>`;
  }
  return s;
}

/* what a computer screen shows */
const SCREEN_OPTS = () => [['spectra', 'Spectra'], ['figure', 'A data plot from this figure'], ['code', 'Code'], ['text', 'Text'], ['scope', 'Oscilloscope traces'], ['blank', 'Nothing (dark)']];
const PLOT_OPTS = () => [['', '— the first data plot —']].concat((RNBX.state.doc.objects || []).filter(o => o.type === 'plot').map((o, i) => [o.id, (o.props.ylabel || 'Plot') + ' (' + (i + 1) + ')']));
function screenContent(S, x, y, w, h, p, obj) {
  const kind = p.screen || 'spectra';
  if (kind === 'blank') return G.screen(S, x, y, w, h, '#0f141a');
  if (kind === 'scope') return scopeScreen(S, x, y, w, h, { channels: 2, wave: 'sine' });
  let s = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#ffffff" stroke="${S.shaded ? '#0b0f14' : S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
  if (kind === 'figure') {
    // a plot of this figure, drawn small inside the screen
    const doc = S.doc || RNBX.state.doc, src = (doc.objects || []).find(o => o.type === 'plot' && (!p.plot || o.id === p.plot));
    if (src) {
      const def = lib.get('plot'), b = def.bbox(src.props), k = Math.min(w / (b[2] - b[0]), h / (b[3] - b[1])) * 0.96;
      let inner = ''; try { inner = def.draw(src.props, Object.assign({}, S, { interactive: false }), src); } catch (e) { inner = ''; }
      return s + `<g transform="translate(${n(x + w / 2)} ${n(y + h / 2)}) scale(${n(k)}) translate(${n(-(b[0] + b[2]) / 2)} ${n(-(b[1] + b[3]) / 2)})">${inner}</g>`;
    }
    return s + txt(S, x + w / 2, y + h / 2, 'Add a data plot to the figure', Math.min(h * 0.09, S.fs * 0.7), { color: '#888' });
  }
  if (kind === 'code') {
    const cols = ['#7b4fd8', '#2a9d4f', '#d62828', '#3a6fd8', '#8a8f98'], rows = 9;
    s = `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="#1e222a" stroke="${S.shaded ? '#0b0f14' : S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    for (let i = 0; i < rows; i++) { let cx = x + w * (0.06 + (i % 3 === 1 ? 0.05 : i % 3 === 2 ? 0.1 : 0)); for (let j = 0; j < 3; j++) { const L = w * (0.08 + ((i * 7 + j * 3) % 5) * 0.05); if (cx + L > x + w * 0.94) break; s += `<rect x="${n(cx)}" y="${n(y + h * (0.08 + i * 0.1))}" width="${n(L)}" height="${n(h * 0.045)}" rx="${n(h * 0.02)}" fill="${cols[(i + j) % cols.length]}" fill-opacity="0.9"/>`; cx += L + w * 0.03; } }
    return s;
  }
  if (kind === 'text') return s + txt(S, x + w / 2, y + h / 2, p.screenText || '', Math.min(h * 0.18, S.fs), { color: '#111' });
  // spectra: a few smooth curves with peaks on axes
  const ax = x + w * 0.12, ay = y + h * 0.86, aw = w * 0.8, ah = h * 0.72;
  s += `<path d="M ${n(ax)} ${n(ay - ah)} L ${n(ax)} ${n(ay)} L ${n(ax + aw)} ${n(ay)}" fill="none" stroke="#111" stroke-width="${n(S.lw * 0.5)}"/>`;
  const pal = ['#d62828', '#3a6fd8', '#2a9d4f', '#f08c00', '#7b4fd8'], N = U.clamp(Math.round(p.curves) || 3, 1, 5);
  for (let k = 0; k < N; k++) { let d = ''; for (let i = 0; i <= 60; i++) { const u = i / 60, g = (c, s2, a) => a * Math.exp(-Math.pow((u - c) / s2, 2)), v = 0.12 + k * 0.13 + g(0.3, 0.03, 0.35) + g(0.55, 0.05, 0.22) + g(0.78, 0.025, 0.3) * (1 - k * 0.15); d += (i ? ' L ' : 'M ') + n(ax + aw * u) + ' ' + n(ay - ah * Math.min(1, v)); } s += `<path d="${d}" fill="none" stroke="${pal[k]}" stroke-width="${n(S.lw * 0.6)}" stroke-linejoin="round"/>`; }
  return s;
}

/* ---------- 3D pieces ---------- */
const box = (x0, x1, y0, y1, z0, z1, mat, extra) => Object.assign({ kind: 'box', x: [x0, x1], y: [y0, y1], z: [z0, z1], mat }, extra || {});
const vcyl = (cx, cy, r, z0, z1, mat) => ({ kind: 'vcyl', cx, cy, r, z: [z0, z1], mat });
const disk = (c, nrm, r, t, mat) => ({ kind: 'disk3', c, nrm, r, t, mat });
const front = (x0, x1, y, z0, z1, mat) => box(x0, x1, y, y + 0.05, z0, z1, mat, { decal: true });
const feet = (w, d) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => box(a * w / 2 - (a > 0 ? 1.2 : 0), a * w / 2 + (a < 0 ? 1.2 : 0), b * d / 2 - (b > 0 ? 1.2 : 0), b * d / 2 + (b < 0 ? 1.2 : 0), 0, 0.4, 'black'));
/* a benchtop box with a front panel: screen rectangle, knobs, connectors */
const bench3 = (p, o = {}) => {
  const w = p.w, d = p.d || w * 0.6, h = p.h, z0 = 0.4, y1 = d / 2, col = p.color || '#c9ced6';
  const out = [...feet(w, d), box(-w / 2, w / 2, -d / 2, y1, z0, z0 + h, { color: col, spec: 0.3 }), box(-w / 2 + 0.2, w / 2 - 0.2, y1, y1 + 0.25, z0 + 0.2, z0 + h - 0.2, { color: U.shadeRgb(col, 0.82), spec: 0.35 })];
  (o.screens || []).forEach(sc => out.push(front(-w / 2 + w * sc[0], -w / 2 + w * sc[1], y1 + 0.25, z0 + h * sc[2], z0 + h * sc[3], { color: sc[4] || '#13202b', spec: 0.9 })));
  (o.knobs || []).forEach(k => { const c = [-w / 2 + w * k[0], y1 + 0.25, z0 + h * k[1]], r = Math.min(1.4, h * (k[2] || 0.08)); out.push(disk(c, [0, 1, 0], r * 0.6, r * 0.5, 'metal'), disk([c[0], c[1] + r * 0.55, c[2]], [0, 1, 0], r, r * 0.7, 'black')); });
  (o.dots || []).forEach(k => out.push(disk([-w / 2 + w * k[0], y1 + 0.27, z0 + h * k[1]], [0, 1, 0], k[2] || 0.5, 0.25, { color: k[3] || '#c9ced6', spec: 0.8 })));
  return out;
};

/* ---------- registration helper ---------- */
const DIM = (w, h, d) => [
  { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 4, max: 300, step: 0.5, def: w },
  { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 3, max: 300, step: 0.5, def: h },
  { key: 'd', label: 'Depth (3D)', type: 'number', unit: 'mm', min: 2, max: 300, step: 0.5, def: d },
];
const inst = cfg => {
  const dims = DIM(cfg.size[0], cfg.size[1], cfg.size[2]);
  lib.register(Object.assign({
    category: CAT, abbr: '', autoLabel: false, mount: false, noPost: true, labelPos: [0, cfg.size[1] / 2 + 3],
    bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  }, cfg, {
    defaults: Object.assign({ w: cfg.size[0], h: cfg.size[1], d: cfg.size[2], color: cfg.color || '#c9ced6' }, cfg.defaults || {}),
    params: (cfg.params || []).concat(cfg.noColor ? [] : [{ key: 'color', label: 'Body colour', type: 'color' }], dims),
    draw(p, S, obj) { return cfg.front(p, S, idOf(obj, p, cfg.type), obj); },
  }));
};

/* ================= electronics ================= */
inst({ type: 'scope', name: 'Oscilloscope', size: [32, 18, 20], color: '#c9ced6', keywords: 'oscilloscope scope traces waveform signal channels electronics measurement',
  defaults: { channels: 2, wave: 'sine', brand: '' },
  params: [{ key: 'channels', label: 'Channels shown', type: 'number', min: 1, max: 4, step: 1 }, { key: 'wave', label: 'Signal', type: 'select', options: WAVE_OPTS }, { key: 'brand', label: 'Text on the front', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = G.panel(S, uid, x0, y0, w, h, p.color);
    s += scopeScreen(S, x0 + w * 0.05, y0 + h * 0.1, w * 0.58, h * 0.72, p);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) s += G.knob(S, x0 + w * (0.72 + j * 0.13), y0 + h * (0.22 + i * 0.22), Math.min(w, h) * 0.045);
    for (let k = 0; k < 4; k++) { s += G.bnc(S, x0 + w * (0.69 + k * 0.075), y0 + h * 0.86, Math.min(w, h) * 0.035); s += `<rect x="${n(x0 + w * (0.675 + k * 0.075))}" y="${n(y0 + h * 0.72)}" width="${n(w * 0.03)}" height="${n(h * 0.04)}" fill="${CH_COL[k]}"/>`; }
    if (p.brand) s += txt(S, x0 + w * 0.05, y0 + h * 0.05, p.brand, h * 0.05, { anchor: 'start', color: S.shaded ? '#2b2f36' : S.ink, bold: true });
    return s;
  },
  solid: p => bench3(p, { screens: [[0.05, 0.63, 0.18, 0.9]], knobs: [[0.72, 0.75], [0.85, 0.75], [0.72, 0.5], [0.85, 0.5]], dots: [[0.7, 0.15, 0.5], [0.78, 0.15, 0.5], [0.86, 0.15, 0.5], [0.94, 0.15, 0.5]] }) });
inst({ type: 'fgen', name: 'Function generator', size: [28, 11, 20], color: '#c9ced6', keywords: 'function generator signal waveform awg rf generator frequency electronics',
  defaults: { readout: '1.000 kHz', wave: 'sine' },
  params: [{ key: 'readout', label: 'Display', type: 'text' }, { key: 'wave', label: 'Waveform symbol', type: 'select', options: WAVE_OPTS }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = G.panel(S, uid, x0, y0, w, h, p.color) + G.digits(S, x0 + w * 0.05, y0 + h * 0.2, w * 0.42, h * 0.42, p.readout, '#7fe0a8');
    const f = WAVES[p.wave] || WAVES.sine; let d = ''; for (let i = 0; i <= 40; i++) { const u = i / 40; d += (i ? ' L ' : 'M ') + n(x0 + w * 0.05 + w * 0.42 * u) + ' ' + n(y0 + h * 0.8 - h * 0.08 * f(u, 0)); }
    s += `<path d="${d}" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += G.knob(S, x0 + w * 0.6, y0 + h * 0.48, h * 0.17);
    for (let i = 0; i < 4; i++) s += G.button(S, x0 + w * (0.73 + (i % 2) * 0.08), y0 + h * (0.3 + Math.floor(i / 2) * 0.3), w * 0.06, h * 0.18);
    s += G.bnc(S, x0 + w * 0.92, y0 + h * 0.35, h * 0.09) + G.bnc(S, x0 + w * 0.92, y0 + h * 0.72, h * 0.09);
    return s;
  },
  solid: p => bench3(p, { screens: [[0.05, 0.47, 0.35, 0.8, '#0e1216']], knobs: [[0.6, 0.5, 0.17]], dots: [[0.92, 0.65, 0.55], [0.92, 0.28, 0.55]] }) });
inst({ type: 'psu', name: 'DC power supply', size: [26, 14, 22], color: '#3a3f47', keywords: 'power supply psu dc voltage current source bench electronics',
  defaults: { volts: '12.00 V', amps: '0.500 A' },
  params: [{ key: 'volts', label: 'Voltage display', type: 'text' }, { key: 'amps', label: 'Current display', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = G.panel(S, uid, x0, y0, w, h, p.color);
    s += G.digits(S, x0 + w * 0.06, y0 + h * 0.12, w * 0.4, h * 0.26, p.volts, '#ff6b5a') + G.digits(S, x0 + w * 0.54, y0 + h * 0.12, w * 0.4, h * 0.26, p.amps, '#ffb14a');
    s += G.knob(S, x0 + w * 0.26, y0 + h * 0.56, h * 0.11) + G.knob(S, x0 + w * 0.74, y0 + h * 0.56, h * 0.11);
    s += G.term(S, x0 + w * 0.36, y0 + h * 0.84, h * 0.07, '#d93a3a') + G.term(S, x0 + w * 0.5, y0 + h * 0.84, h * 0.07, '#1e2024') + G.term(S, x0 + w * 0.64, y0 + h * 0.84, h * 0.07, '#2e9b55');
    s += txt(S, x0 + w * 0.36, y0 + h * 0.7, '+', h * 0.08, { color: '#fff' }) + txt(S, x0 + w * 0.5, y0 + h * 0.7, '−', h * 0.08, { color: '#fff' });
    s += G.led(S, x0 + w * 0.1, y0 + h * 0.84, h * 0.03, '#40d27a');
    return s;
  },
  solid: p => bench3(p, { screens: [[0.06, 0.46, 0.62, 0.88, '#0e1216'], [0.54, 0.94, 0.62, 0.88, '#0e1216']], knobs: [[0.26, 0.44], [0.74, 0.44]], dots: [[0.36, 0.16, 0.6, '#d93a3a'], [0.5, 0.16, 0.6, '#1e2024'], [0.64, 0.16, 0.6, '#2e9b55']] }) });
inst({ type: 'lockin', name: 'Lock-in amplifier', size: [40, 10, 28], color: '#d6dade', keywords: 'lock-in amplifier phase sensitive detection reference signal rack electronics',
  defaults: { readout: 'X 1.234 mV   Y −0.05 mV' },
  params: [{ key: 'readout', label: 'Display', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = G.panel(S, uid, x0, y0, w, h, p.color, 0.4) + `<rect x="${n(x0)}" y="${n(y0)}" width="${n(w * 0.03)}" height="${n(h)}" fill="${S.shaded ? '#9aa3ad' : 'none'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/><rect x="${n(x0 + w * 0.97)}" y="${n(y0)}" width="${n(w * 0.03)}" height="${n(h)}" fill="${S.shaded ? '#9aa3ad' : 'none'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    s += G.digits(S, x0 + w * 0.06, y0 + h * 0.2, w * 0.42, h * 0.38, p.readout, '#7fe0a8');
    for (let i = 0; i < 6; i++) s += G.button(S, x0 + w * (0.08 + i * 0.07), y0 + h * 0.78, w * 0.045, h * 0.13);
    s += G.knob(S, x0 + w * 0.58, y0 + h * 0.45, h * 0.18) + G.knob(S, x0 + w * 0.68, y0 + h * 0.45, h * 0.18);
    ['SIG', 'REF', 'OUT'].forEach((t, i) => { s += G.bnc(S, x0 + w * (0.8 + i * 0.06), y0 + h * 0.48, h * 0.1) + txt(S, x0 + w * (0.8 + i * 0.06), y0 + h * 0.18, t, h * 0.11, { color: S.shaded ? '#3a3f46' : S.ink }); });
    return s;
  },
  solid: p => bench3(p, { screens: [[0.06, 0.48, 0.42, 0.8, '#0e1216']], knobs: [[0.58, 0.55, 0.15], [0.68, 0.55, 0.15]], dots: [[0.8, 0.52, 0.5], [0.86, 0.52, 0.5], [0.92, 0.52, 0.5]] }) });
inst({ type: 'daq', name: 'DAQ / USB interface', size: [18, 8, 12], color: '#2f6db5', keywords: 'daq data acquisition usb interface adc dac arduino controller terminal block',
  defaults: { text: 'DAQ' }, params: [{ key: 'text', label: 'Text', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = G.panel(S, uid, x0, y0, w, h, p.color, 1);
    s += `<rect x="${n(x0 + w * 0.06)}" y="${n(y0 + h * 0.62)}" width="${n(w * 0.88)}" height="${n(h * 0.28)}" rx="0.3" fill="${S.shaded ? '#2dbb5b' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    for (let i = 0; i < 8; i++) s += `<circle cx="${n(x0 + w * (0.11 + i * 0.111))}" cy="${n(y0 + h * 0.76)}" r="${n(h * 0.07)}" fill="${S.shaded ? '#cfd5dc' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.4)}"/><line x1="${n(x0 + w * (0.11 + i * 0.111) - h * 0.05)}" y1="${n(y0 + h * 0.76)}" x2="${n(x0 + w * (0.11 + i * 0.111) + h * 0.05)}" y2="${n(y0 + h * 0.76)}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.4)}"/>`;
    s += txt(S, x0 + w * 0.35, y0 + h * 0.3, p.text, h * 0.24, { color: S.shaded ? '#ffffff' : S.ink, bold: true }) + G.led(S, x0 + w * 0.82, y0 + h * 0.3, h * 0.06, '#40d27a');
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h, { color: p.color, spec: 0.4 }), front(-w / 2 + w * 0.06, w / 2 - w * 0.06, d / 2, h * 0.1, h * 0.38, { color: '#2dbb5b', spec: 0.3 }), disk([w * 0.32, d / 2 + 0.05, h * 0.7], [0, 1, 0], 0.4, 0.2, { color: '#40d27a', spec: 0.9 })]; } });

/* ================= computers ================= */
const SCREEN_PARAMS = [{ key: 'screen', label: 'Screen shows', type: 'select', options: SCREEN_OPTS },
  { key: 'plot', label: 'Which data plot', type: 'select', options: PLOT_OPTS, show: p => p.screen === 'figure' },
  { key: 'screenText', label: 'Text on the screen', type: 'text', show: p => p.screen === 'text' },
  { key: 'curves', label: 'Curves', type: 'number', min: 1, max: 5, step: 1, show: p => p.screen === 'spectra' }];
inst({ type: 'laptop', name: 'Laptop', size: [30, 21, 21], color: '#9aa1ab', keywords: 'laptop notebook computer screen software data acquisition analysis',
  defaults: { screen: 'spectra', plot: '', screenText: 'RNBeamX', curves: 3 }, params: SCREEN_PARAMS,
  front(p, S, uid, obj) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, sh = h * 0.72, sw = w * 0.86, sx = -sw / 2;
    let s = G.panel(S, uid, sx, y0, sw, sh, '#2b2f36', 1, 'lid');
    s += screenContent(S, sx + sw * 0.04, y0 + sh * 0.06, sw * 0.92, sh * 0.86, p, obj);
    s += `<defs>${G.grad(S, p.color, uid + '-b')}</defs><path d="M ${n(sx - w * 0.02)} ${n(y0 + sh)} L ${n(sx + sw + w * 0.02)} ${n(y0 + sh)} L ${n(w / 2)} ${n(h / 2 - h * 0.04)} L ${n(x0)} ${n(h / 2 - h * 0.04)} Z" fill="${G.fill(S, p.color, uid + '-b')}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.7)}"/>`;
    for (let r = 0; r < 3; r++) s += `<path d="M ${n(sx + sw * (0.05 - r * 0.012))} ${n(y0 + sh + h * (0.05 + r * 0.06))} L ${n(sx + sw * (0.95 + r * 0.012))} ${n(y0 + sh + h * (0.05 + r * 0.06))}" stroke="${S.shaded ? '#3a3f46' : S.ink}" stroke-opacity="0.5" stroke-width="${n(h * 0.035)}" stroke-dasharray="${n(w * 0.035)} ${n(w * 0.012)}"/>`;
    s += `<rect x="${n(x0)}" y="${n(h / 2 - h * 0.04)}" width="${n(w)}" height="${n(h * 0.04)}" rx="${n(h * 0.02)}" fill="${S.shaded ? U.shadeRgb(p.color, 0.7) : '#ffffff'}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.6)}"/>`;
    return s;
  },
  solid: p => {
    const w = p.w, d = p.d, t = 0.8, sh = p.h * 0.85, a = 15 * Math.PI / 180, yb = -d / 2 + 0.6;
    // the lid stands at the back of the base, tilted back by 15°
    const P = (x, u, z) => [x, yb - u * Math.sin(a), t + z * Math.cos(a)];
    const lid = [[-w * 0.45, 0, 0], [w * 0.45, 0, 0], [w * 0.45, 0, sh], [-w * 0.45, 0, sh]].map(q => P(q[0], 0, q[2]));
    const back = lid.map(q => [q[0], q[1] - 0.5, q[2]]);
    const scr = [[-w * 0.41, sh * 0.06], [w * 0.41, sh * 0.06], [w * 0.41, sh * 0.94], [-w * 0.41, sh * 0.94]].map(q => { const r = P(q[0], 0, q[1]); return [r[0], r[1] + 0.2, r[2]]; });
    return [box(-w / 2, w / 2, -d / 2, d / 2, 0, t, { color: p.color, spec: 0.5 }), box(-w * 0.42, w * 0.42, -d / 2 + 2, d * 0.15, t, t + 0.05, { color: '#2b2f36', spec: 0.2 }, { decal: true }),
      { kind: 'faces', faces: [lid, back.slice().reverse(), [lid[0], lid[1], back[1], back[0]], [lid[1], lid[2], back[2], back[1]], [lid[2], lid[3], back[3], back[2]], [lid[3], lid[0], back[0], back[3]]], mat: { color: '#2b2f36', spec: 0.4 } },
      { kind: 'faces', faces: [scr, scr.map(q => [q[0], q[1] - 0.12, q[2]]).reverse()], mat: { color: p.screen === 'blank' ? '#0f141a' : '#e8eef5', spec: 0.9 } }];   // a thin slab, so its front faces outwards
  } });
inst({ type: 'desktop', name: 'Desktop computer (monitor, tower, keyboard)', size: [40, 26, 22], color: '#3a3f47', keywords: 'desktop computer pc monitor screen tower workstation keyboard',
  defaults: { screen: 'spectra', plot: '', screenText: 'Data acquisition', curves: 3, tower: true }, params: SCREEN_PARAMS.concat([{ key: 'tower', label: 'Tower', type: 'bool' }]),
  front(p, S, uid, obj) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, mw = w * (p.tower ? 0.68 : 0.9), mx = p.tower ? x0 : -mw / 2, mh = h * 0.66;
    let s = G.panel(S, uid, mx, y0, mw, mh, p.color, 0.8, 'm') + screenContent(S, mx + mw * 0.035, y0 + mh * 0.05, mw * 0.93, mh * 0.86, p, obj);
    s += `<rect x="${n(mx + mw * 0.45)}" y="${n(y0 + mh)}" width="${n(mw * 0.1)}" height="${n(h * 0.12)}" fill="${S.shaded ? U.shadeRgb(p.color, 0.85) : '#ffffff'}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(mx + mw * 0.3)}" y="${n(y0 + mh + h * 0.12)}" width="${n(mw * 0.4)}" height="${n(h * 0.04)}" rx="0.4" fill="${S.shaded ? p.color : '#ffffff'}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(mx + mw * 0.12)}" y="${n(h / 2 - h * 0.08)}" width="${n(mw * 0.76)}" height="${n(h * 0.06)}" rx="0.5" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    if (p.tower) { const tx = x0 + w * 0.76, tw = w * 0.22, th = h * 0.7; s += G.panel(S, uid, tx, h / 2 - th, tw, th, p.color, 0.8, 't') + G.vents(S, tx + tw * 0.2, h / 2 - th * 0.85, tw * 0.6, th * 0.06, 4) + G.button(S, tx + tw / 2, h / 2 - th * 0.6, tw * 0.25, tw * 0.25, '#9aa3ad') + G.led(S, tx + tw / 2, h / 2 - th * 0.45, th * 0.015, '#40d27a'); }
    return s;
  },
  solid: p => {
    const w = p.w, d = p.d, h = p.h, mw = w * (p.tower ? 0.68 : 0.9), mx0 = p.tower ? -w / 2 : -mw / 2, my = -d * 0.15, mh = h * 0.62, zb = h * 0.16;
    const out = [box(mx0 + mw * 0.3, mx0 + mw * 0.7, my - 3, my + 1, 0, 0.6, { color: p.color, spec: 0.4 }), box(mx0 + mw * 0.46, mx0 + mw * 0.54, my - 1, my, 0.6, zb, { color: p.color, spec: 0.4 }),
      box(mx0, mx0 + mw, my, my + 1.2, zb, zb + mh, { color: p.color, spec: 0.4 }), front(mx0 + mw * 0.035, mx0 + mw * 0.965, my + 1.2, zb + mh * 0.06, zb + mh * 0.94, { color: p.screen === 'blank' ? '#0f141a' : '#e8eef5', spec: 0.9 }),
      box(mx0 + mw * 0.12, mx0 + mw * 0.88, d * 0.15, d * 0.15 + 5, 0, 0.7, { color: '#2b2f36', spec: 0.2 })];
    if (p.tower) out.push(box(w / 2 - w * 0.22, w / 2, -d / 2, d / 2, 0, h * 0.7, { color: p.color, spec: 0.35 }), disk([w / 2 - w * 0.11, d / 2 + 0.05, h * 0.42], [0, 1, 0], 0.7, 0.2, { color: '#9aa3ad', spec: 0.8 }));
    return out;
  } });

/* ================= bench equipment ================= */
const VESSEL_OPTS = [['none', 'Nothing'], ['beaker', 'Beaker'], ['erlenmeyer', 'Erlenmeyer flask'], ['roundflask', 'Round-bottom flask']];
const vesselOn = (S, p, x, yTop, w) => {
  if (!p.vessel || p.vessel === 'none') return '';
  const def = lib.get(p.vessel); if (!def) return '';
  const vp = Object.assign({}, def.defaults, p.vessel === 'beaker' ? { w: w * 0.55, h: w * 0.62, stirbar: !!p.stir } : p.vessel === 'erlenmeyer' ? { w: w * 0.6, h: w * 0.7, neck: w * 0.16, neckH: w * 0.15 } : { r: w * 0.28, neck: w * 0.13, neckH: w * 0.25 }, { fill: p.fill == null ? 0.5 : p.fill, liquid: p.liquid || '#5aa9e6', marks: 0, bubbles: p.heat ? 6 : 0 });
  const b = def.bbox(vp);
  return `<g transform="translate(${n(x)} ${n(yTop - b[3])})">${def.draw(vp, S, null)}</g>`;
};
inst({ type: 'stirplate', name: 'Hot plate / magnetic stirrer', size: [22, 9, 24], color: '#e7e9ec', keywords: 'hot plate magnetic stirrer heating stirring synthesis chemistry beaker',
  defaults: { temp: '120 °C', rpm: '600 rpm', heat: true, vessel: 'beaker', fill: 0.5, liquid: '#5aa9e6', stir: true },
  params: [{ key: 'temp', label: 'Temperature display', type: 'text' }, { key: 'rpm', label: 'Speed display', type: 'text' }, { key: 'heat', label: 'Hot (glowing plate)', type: 'bool' },
    { key: 'vessel', label: 'On the plate', type: 'select', options: VESSEL_OPTS }, { key: 'fill', label: 'Vessel filled', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.vessel !== 'none' },
    { key: 'liquid', label: 'Liquid colour', type: 'color', show: p => p.vessel !== 'none' }, { key: 'stir', label: 'Stir bar', type: 'bool', show: p => p.vessel === 'beaker' }],
  bbox: p => { const top = p.vessel && p.vessel !== 'none' ? p.w * 0.8 : 0; return [-p.w / 2, -p.h / 2 - top, p.w / 2, p.h / 2]; },
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = vesselOn(S, p, 0, y0 - h * 0.12, w);
    s += `<rect x="${n(x0 + w * 0.05)}" y="${n(y0 - h * 0.12)}" width="${n(w * 0.9)}" height="${n(h * 0.14)}" rx="${n(h * 0.05)}" fill="${p.heat ? (S.shaded ? '#d9572b' : '#f3a07e') : (S.shaded ? '#c9ced6' : '#ffffff')}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    if (p.heat && S.shaded) s += `<rect x="${n(x0 + w * 0.05)}" y="${n(y0 - h * 0.12)}" width="${n(w * 0.9)}" height="${n(h * 0.06)}" rx="${n(h * 0.03)}" fill="#ffb27a" fill-opacity="0.8"/>`;
    s += G.panel(S, uid, x0, y0, w, h, p.color, 1);
    s += G.digits(S, x0 + w * 0.08, y0 + h * 0.22, w * 0.32, h * 0.32, p.temp, '#ff6b5a') + G.digits(S, x0 + w * 0.08, y0 + h * 0.6, w * 0.32, h * 0.28, p.rpm, '#7fe0a8');
    s += G.knob(S, x0 + w * 0.58, y0 + h * 0.52, h * 0.22, '#d93a3a') + G.knob(S, x0 + w * 0.82, y0 + h * 0.52, h * 0.22, '#2f6db5');
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h, rv = Math.min(w, d) * 0.28, hv = w * 0.62, vs = p.vessel && p.vessel !== 'none';
    const vessel = vs ? [vcyl(0, -d * 0.05, rv * 0.96, h + 0.65, h + 0.65 + hv * (p.fill == null ? 0.5 : p.fill), { color: p.liquid || '#5aa9e6', alpha: 0.75, spec: 0.6 }), vcyl(0, -d * 0.05, rv, h + 0.6, h + 0.6 + hv, { color: '#dbeaf5', alpha: 0.25, spec: 0.9 })] : [];
    return [...vessel, box(-w / 2, w / 2, -d / 2, d / 2, 0, h, { color: p.color, spec: 0.35 }), vcyl(0, -d * 0.05, Math.min(w, d) * 0.4, h, h + 0.6, { color: p.heat ? '#d9572b' : '#c9ced6', spec: 0.6 }),
    front(-w / 2 + w * 0.08, -w / 2 + w * 0.4, d / 2, h * 0.5, h * 0.82, { color: '#0e1216', spec: 0.9 }), disk([w * 0.08, d / 2 + 0.05, h * 0.5], [0, 1, 0], h * 0.18, 0.6, { color: '#d93a3a', spec: 0.5 }), disk([w * 0.32, d / 2 + 0.05, h * 0.5], [0, 1, 0], h * 0.18, 0.6, { color: '#2f6db5', spec: 0.5 })]; } });
inst({ type: 'centrifuge', name: 'Centrifuge', size: [28, 16, 30], color: '#e7e9ec', keywords: 'centrifuge spin rotor rpm pellet sample preparation biology',
  defaults: { readout: '4000 rpm', lid: '#2f6db5' }, params: [{ key: 'readout', label: 'Display', type: 'text' }, { key: 'lid', label: 'Lid colour', type: 'color' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = `<defs>${G.grad(S, p.color, uid + '-c')}${G.grad(S, p.lid, uid + '-l')}</defs>`;
    s += `<path d="M ${n(x0)} ${n(h / 2)} L ${n(x0)} ${n(y0 + h * 0.4)} Q ${n(x0)} ${n(y0 + h * 0.18)} ${n(x0 + w * 0.12)} ${n(y0 + h * 0.18)} L ${n(w / 2 - w * 0.12)} ${n(y0 + h * 0.18)} Q ${n(w / 2)} ${n(y0 + h * 0.18)} ${n(w / 2)} ${n(y0 + h * 0.4)} L ${n(w / 2)} ${n(h / 2)} Z" fill="${G.fill(S, p.color, uid + '-c')}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.8)}"/>`;
    s += `<path d="M ${n(x0 + w * 0.1)} ${n(y0 + h * 0.18)} Q ${n(0)} ${n(y0 - h * 0.08)} ${n(w / 2 - w * 0.1)} ${n(y0 + h * 0.18)} Z" fill="${G.fill(S, p.lid, uid + '-l')}" stroke="${G.edge(S, p.lid)}" stroke-width="${n(S.lw * 0.8)}"/>`;
    s += G.digits(S, x0 + w * 0.12, y0 + h * 0.5, w * 0.36, h * 0.24, p.readout, '#7fe0a8') + G.button(S, x0 + w * 0.65, y0 + h * 0.62, w * 0.12, h * 0.16, '#2e9b55') + G.button(S, x0 + w * 0.82, y0 + h * 0.62, w * 0.12, h * 0.16, '#d93a3a');
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h * 0.82, { color: p.color, spec: 0.35 }), vcyl(0, 0, Math.min(w, d) * 0.42, h * 0.82, h, { color: p.lid, spec: 0.5 }), front(-w / 2 + w * 0.12, -w / 2 + w * 0.48, d / 2, h * 0.3, h * 0.55, { color: '#0e1216', spec: 0.9 })]; } });
inst({ type: 'balance', name: 'Analytical balance', size: [22, 24, 26], color: '#e7e9ec', keywords: 'analytical balance scale weighing mass draft shield powder',
  defaults: { readout: '12.3456 g', sample: true }, params: [{ key: 'readout', label: 'Display', type: 'text' }, { key: 'sample', label: 'Sample on the pan', type: 'bool' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, bh = h * 0.28, gy = y0, gh = h - bh;
    let s = `<rect x="${n(x0 + w * 0.05)}" y="${n(gy)}" width="${n(w * 0.9)}" height="${n(gh)}" fill="${S.shaded ? '#e8f3fb' : '#ffffff'}" fill-opacity="${S.shaded ? 0.5 : 1}" stroke="${S.shaded ? '#6f8aa0' : S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    s += `<line x1="${n(x0 + w * 0.05)}" y1="${n(gy + gh * 0.08)}" x2="${n(w / 2 - w * 0.05)}" y2="${n(gy + gh * 0.08)}" stroke="${S.shaded ? '#6f8aa0' : S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    s += `<rect x="${n(-w * 0.22)}" y="${n(gy + gh * 0.86)}" width="${n(w * 0.44)}" height="${n(gh * 0.05)}" rx="0.3" fill="${S.shaded ? '#c9ced6' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(-w * 0.03)}" y="${n(gy + gh * 0.91)}" width="${n(w * 0.06)}" height="${n(gh * 0.09)}" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    if (p.sample) s += `<path d="M ${n(-w * 0.12)} ${n(gy + gh * 0.86)} Q 0 ${n(gy + gh * 0.74)} ${n(w * 0.12)} ${n(gy + gh * 0.86)} Z" fill="${S.shaded ? '#f2efe6' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    if (S.shaded) s += `<rect x="${n(x0 + w * 0.12)}" y="${n(gy + gh * 0.12)}" width="${n(w * 0.04)}" height="${n(gh * 0.7)}" fill="#ffffff" fill-opacity="0.55"/>`;
    s += G.panel(S, uid, x0, h / 2 - bh, w, bh, p.color, 0.8);
    s += G.digits(S, x0 + w * 0.2, h / 2 - bh * 0.78, w * 0.6, bh * 0.42, p.readout, '#7fe0a8');
    for (let i = 0; i < 4; i++) s += G.button(S, x0 + w * (0.26 + i * 0.16), h / 2 - bh * 0.18, w * 0.1, bh * 0.14);
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h, bh = h * 0.28; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, bh, { color: p.color, spec: 0.35 }), box(-w * 0.45, w * 0.45, -d * 0.42, d * 0.42, bh, h, { color: '#dbeaf5', alpha: 0.25, spec: 0.9 }), vcyl(0, 0, Math.min(w, d) * 0.2, bh, bh + 0.4, 'metal'), front(-w * 0.3, w * 0.3, d / 2, bh * 0.4, bh * 0.85, { color: '#0e1216', spec: 0.9 })]; } });
inst({ type: 'syringepump', name: 'Syringe pump', size: [36, 10, 16], color: '#e7e9ec', keywords: 'syringe pump flow rate microfluidics infusion dosing',
  defaults: { readout: '10 µL/min', fill: 0.6, liquid: '#5aa9e6' },
  params: [{ key: 'readout', label: 'Display', type: 'text' }, { key: 'fill', label: 'Syringe filled', type: 'range', min: 0, max: 1, step: 0.01, animatable: true }, { key: 'liquid', label: 'Liquid colour', type: 'color' }],
  bbox: p => [-p.w / 2, -p.h / 2 - p.h * 0.55, p.w / 2 + p.w * 0.12, p.h / 2],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, sy = lib.get('syringe');
    const sp = Object.assign({}, sy.defaults, { L: w * 0.55, w: h * 0.42, fill: p.fill, liquid: p.liquid, needle: false, marks: 10 });
    let s = `<g transform="translate(${n(w * 0.12)} ${n(y0 - h * 0.25)})">${sy.draw(sp, S, null)}</g>`;
    const xp = w * 0.12 + sp.L / 2 - p.fill * sp.L - sp.L * 0.55 - 1.4;
    s += `<rect x="${n(xp - w * 0.06)}" y="${n(y0 - h * 0.55)}" width="${n(w * 0.06)}" height="${n(h * 0.6)}" rx="0.3" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += G.panel(S, uid, x0, y0, w, h, p.color, 0.8);
    s += G.digits(S, x0 + w * 0.06, y0 + h * 0.25, w * 0.3, h * 0.48, p.readout, '#7fe0a8');
    for (let i = 0; i < 4; i++) s += G.button(S, x0 + w * (0.46 + i * 0.1), y0 + h * 0.5, w * 0.07, h * 0.3);
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h, { color: p.color, spec: 0.35 }), { kind: 'cyl', x: [-w * 0.15, w * 0.4], r: [h * 0.22, h * 0.22], cz: h + h * 0.25, cy: 0, mat: { color: '#e8f3fb', alpha: 0.5, spec: 0.9 } },
    { kind: 'cyl', x: [w * 0.4 - p.fill * w * 0.55, w * 0.4], r: [h * 0.18, h * 0.18], cz: h + h * 0.25, cy: 0, mat: { color: p.liquid, spec: 0.5 } }, front(-w / 2 + w * 0.06, -w / 2 + w * 0.36, d / 2, h * 0.27, h * 0.75, { color: '#0e1216', spec: 0.9 })]; } });
inst({ type: 'peripump', name: 'Peristaltic pump', size: [22, 16, 18], color: '#d6dade', keywords: 'peristaltic pump tubing rollers flow circulation',
  defaults: { readout: '25 rpm', liquid: '#5aa9e6' }, params: [{ key: 'readout', label: 'Display', type: 'text' }, { key: 'liquid', label: 'Liquid in the tubing', type: 'color' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, cx = x0 + w * 0.62, cy = y0 + h * 0.45, R = Math.min(w, h) * 0.3;
    let s = G.panel(S, uid, x0, y0, w, h, p.color, 1);
    s += `<path d="M ${n(x0 - w * 0.05)} ${n(cy - R * 1.05)} L ${n(cx)} ${n(cy - R * 1.05)} A ${n(R * 1.05)} ${n(R * 1.05)} 0 0 1 ${n(cx)} ${n(cy + R * 1.05)} L ${n(x0 - w * 0.05)} ${n(cy + R * 1.05)}" fill="none" stroke="${S.shaded ? '#9fb3c2' : S.ink}" stroke-width="${n(R * 0.26)}" stroke-linecap="round"/><path d="M ${n(x0 - w * 0.05)} ${n(cy - R * 1.05)} L ${n(cx)} ${n(cy - R * 1.05)} A ${n(R * 1.05)} ${n(R * 1.05)} 0 0 1 ${n(cx)} ${n(cy + R * 1.05)} L ${n(x0 - w * 0.05)} ${n(cy + R * 1.05)}" fill="none" stroke="${p.liquid}" stroke-width="${n(R * 0.12)}" stroke-linecap="round"/>`;
    s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.85)}" fill="${S.shaded ? '#8f98a3' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    for (let k = 0; k < 3; k++) { const a = k * 2 * Math.PI / 3 + 0.4; s += `<circle cx="${n(cx + R * 0.72 * Math.cos(a))}" cy="${n(cy + R * 0.72 * Math.sin(a))}" r="${n(R * 0.22)}" fill="${S.shaded ? '#e7e9ec' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`; }
    s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(R * 0.15)}" fill="${S.ink}"/>` + G.digits(S, x0 + w * 0.06, y0 + h * 0.78, w * 0.32, h * 0.15, p.readout, '#7fe0a8');
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h, { color: p.color, spec: 0.35 }), disk([w * 0.12, d / 2 + 0.05, h * 0.55], [0, 1, 0], Math.min(w, h) * 0.26, 1.2, { color: '#8f98a3', spec: 0.6 }), front(-w / 2 + w * 0.06, -w / 2 + w * 0.38, d / 2, h * 0.08, h * 0.22, { color: '#0e1216', spec: 0.9 })]; } });

/* ================= gases and vacuum ================= */
const GASES = { N2: ['N₂', '#2b2f36'], Ar: ['Ar', '#2e7d4f'], He: ['He', '#8a5a2b'], O2: ['O₂', '#f2f2f2'], CO2: ['CO₂', '#7d858f'], H2: ['H₂', '#c0392b'], air: ['Air', '#d6dade'] };
inst({ type: 'gascyl', name: 'Gas cylinder with regulator', size: [9, 44, 9], color: '#5f6b78', keywords: 'gas cylinder bottle regulator nitrogen argon helium oxygen co2 hydrogen pressure',
  defaults: { gas: 'N2', label: '' },
  params: [{ key: 'gas', label: 'Gas (shoulder colour)', type: 'select', options: Object.entries(GASES).map(([k, v]) => [k, v[0]]) }, { key: 'label', label: 'Label (empty = the gas)', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, top = -h / 2 + h * 0.16, g = GASES[p.gas] || GASES.N2, r = w / 2;
    let s = `<defs>${G.grad(S, p.color, uid + '-b', 'h')}${G.grad(S, g[1], uid + '-s', 'h')}</defs>`;
    s += `<path d="M ${n(x0)} ${n(top + r)} Q ${n(x0)} ${n(top)} 0 ${n(top)} Q ${n(r)} ${n(top)} ${n(r)} ${n(top + r)} L ${n(r)} ${n(h / 2 - 1)} Q ${n(r)} ${n(h / 2)} ${n(r - 1)} ${n(h / 2)} L ${n(x0 + 1)} ${n(h / 2)} Q ${n(x0)} ${n(h / 2)} ${n(x0)} ${n(h / 2 - 1)} Z" fill="${G.fill(S, p.color, uid + '-b')}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.8)}"/>`;
    s += `<path d="M ${n(x0)} ${n(top + r)} Q ${n(x0)} ${n(top)} 0 ${n(top)} Q ${n(r)} ${n(top)} ${n(r)} ${n(top + r)} Z" fill="${G.fill(S, g[1], uid + '-s')}" stroke="${G.edge(S, g[1])}" stroke-width="${n(S.lw * 0.8)}"/>`;
    // valve, regulator body and two gauges
    const vy = top - h * 0.03;
    s += `<rect x="${n(-w * 0.12)}" y="${n(vy - h * 0.025)}" width="${n(w * 0.24)}" height="${n(h * 0.035)}" fill="${S.shaded ? '#c9a94a' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(-w * 0.3)}" y="${n(vy - h * 0.07)}" width="${n(w * 0.6)}" height="${n(h * 0.045)}" rx="0.4" fill="${S.shaded ? '#d6b45c' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    [-1, 1].forEach(sg => { const gx = sg * w * 0.55, gy = vy - h * 0.1, gr = w * 0.24; s += `<line x1="${n(sg * w * 0.3)}" y1="${n(vy - h * 0.05)}" x2="${n(gx)}" y2="${n(gy)}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.8)}"/><circle cx="${n(gx)}" cy="${n(gy)}" r="${n(gr)}" fill="#ffffff" stroke="${S.shaded ? '#6b737c' : S.ink}" stroke-width="${n(S.lw * 0.7)}"/><line x1="${n(gx)}" y1="${n(gy)}" x2="${n(gx + gr * 0.6 * Math.cos(-0.8 - sg * 0.5))}" y2="${n(gy + gr * 0.6 * Math.sin(-0.8 - sg * 0.5))}" stroke="#d93a3a" stroke-width="${n(S.lw * 0.6)}"/>`; });
    s += `<rect x="${n(x0 + w * 0.12)}" y="${n(top + h * 0.25)}" width="${n(w * 0.76)}" height="${n(h * 0.12)}" rx="0.3" fill="#ffffff" stroke="${S.ink}" stroke-opacity="0.4" stroke-width="${n(S.lw * 0.4)}"/>` + txt(S, 0, top + h * 0.31, p.label || g[0], Math.min(w * 0.3, S.fs), { bold: true, color: '#111' });
    if (S.shaded) s += `<rect x="${n(x0 + w * 0.15)}" y="${n(top + r)}" width="${n(w * 0.1)}" height="${n(h / 2 - top - r - 1.5)}" fill="#ffffff" fill-opacity="0.3"/>`;
    return s;
  },
  solid: p => { const r = p.w / 2, h = p.h, g = GASES[p.gas] || GASES.N2, top = h * 0.84; return [vcyl(0, 0, r, 0, top - r * 0.6, { color: p.color, spec: 0.5 }), vcyl(0, 0, r * 0.8, top - r * 0.6, top - r * 0.2, { color: g[1], spec: 0.5 }), vcyl(0, 0, r * 0.45, top - r * 0.2, top, { color: g[1], spec: 0.5 }), vcyl(0, 0, r * 0.2, top, h * 0.9, { color: '#c9a94a', spec: 0.8 }), box(-r * 0.6, r * 0.6, -0.6, 0.6, h * 0.9, h * 0.95, { color: '#d6b45c', spec: 0.8 }), disk([-r * 1.1, 0, h * 0.97], [0, 1, 0], r * 0.45, 0.4, { color: '#f4f4f4', spec: 0.5 }), disk([r * 1.1, 0, h * 0.97], [0, 1, 0], r * 0.45, 0.4, { color: '#f4f4f4', spec: 0.5 })]; } });
inst({ type: 'vacpump', name: 'Vacuum pump (rotary vane)', size: [30, 14, 14], color: '#3c6ea8', keywords: 'vacuum pump rotary vane roughing pump oil',
  defaults: {}, params: [],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = `<rect x="${n(x0 + w * 0.04)}" y="${n(h / 2 - h * 0.1)}" width="${n(w * 0.92)}" height="${n(h * 0.1)}" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += G.panel(S, uid, x0, y0 + h * 0.25, w * 0.52, h * 0.65, '#5f6b78', 2, 'm');
    for (let i = 1; i < 7; i++) s += `<line x1="${n(x0 + w * 0.52 * i / 7)}" y1="${n(y0 + h * 0.3)}" x2="${n(x0 + w * 0.52 * i / 7)}" y2="${n(y0 + h * 0.85)}" stroke="${S.ink}" stroke-opacity="0.45" stroke-width="${n(S.lw * 0.5)}"/>`;
    s += G.panel(S, uid, x0 + w * 0.5, y0 + h * 0.18, w * 0.5, h * 0.72, p.color, 1, 'p');
    s += `<circle cx="${n(x0 + w * 0.68)}" cy="${n(y0 + h * 0.6)}" r="${n(h * 0.1)}" fill="${S.shaded ? '#e2c46a' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(x0 + w * 0.82)}" y="${n(y0)}" width="${n(w * 0.08)}" height="${n(h * 0.2)}" fill="${S.shaded ? '#c9ced6' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(x0 + w * 0.79)}" y="${n(y0 - h * 0.03)}" width="${n(w * 0.14)}" height="${n(h * 0.06)}" rx="0.3" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h * 0.1, { color: '#2b2f36', spec: 0.3 }), { kind: 'cyl', x: [-w / 2, 0], r: [h * 0.33, h * 0.33], cz: h * 0.45, cy: 0, mat: { color: '#5f6b78', spec: 0.5 } }, box(0, w / 2, -d * 0.4, d * 0.4, h * 0.1, h * 0.82, { color: p.color, spec: 0.4 }), vcyl(w * 0.36, 0, h * 0.06, h * 0.82, h, 'metal')]; } });
inst({ type: 'vacchamber', name: 'Vacuum chamber', size: [34, 26, 26], color: '#c9ced6', keywords: 'vacuum chamber uhv flange viewport cf cryostat deposition',
  defaults: { window: true, gauge: true }, params: [{ key: 'window', label: 'Viewport', type: 'bool' }, { key: 'gauge', label: 'Gauge on top', type: 'bool' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, r = Math.min(w * 0.38, h * 0.38);
    let s = `<rect x="${n(x0 + w * 0.15)}" y="${n(h / 2 - h * 0.12)}" width="${n(w * 0.06)}" height="${n(h * 0.12)}" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(w / 2 - w * 0.21)}" y="${n(h / 2 - h * 0.12)}" width="${n(w * 0.06)}" height="${n(h * 0.12)}" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    [-1, 1].forEach(sg => { s += `<rect x="${n(sg > 0 ? r - 0.5 : -r - w * 0.12 + 0.5)}" y="${n(-h * 0.08)}" width="${n(w * 0.12)}" height="${n(h * 0.16)}" fill="${S.shaded ? '#b8bec6' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(sg > 0 ? r + w * 0.12 - 1 : -r - w * 0.12 - 0.5)}" y="${n(-h * 0.12)}" width="1.5" height="${n(h * 0.24)}" fill="${S.shaded ? '#d6dade' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`; });
    s += `<defs><radialGradient id="${uid}-g" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="${U.lighten(p.color, 0.4)}"/><stop offset="1" stop-color="${U.shadeRgb(p.color, 0.75)}"/></radialGradient></defs><circle cx="0" cy="${n(-h * 0.02)}" r="${n(r)}" fill="${S.shaded ? `url(#${uid}-g)` : '#ffffff'}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.9)}"/>`;
    if (p.window) { s += `<circle cx="0" cy="${n(-h * 0.02)}" r="${n(r * 0.5)}" fill="${S.shaded ? '#d6dade' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/><circle cx="0" cy="${n(-h * 0.02)}" r="${n(r * 0.36)}" fill="${S.shaded ? '#a9cbe4' : '#eef6fb'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`; for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; s += `<circle cx="${n(r * 0.43 * Math.cos(a))}" cy="${n(-h * 0.02 + r * 0.43 * Math.sin(a))}" r="${n(r * 0.03)}" fill="${S.ink}"/>`; } }
    if (p.gauge) s += `<rect x="${n(-w * 0.03)}" y="${n(-h * 0.02 - r - h * 0.12)}" width="${n(w * 0.06)}" height="${n(h * 0.12)}" fill="${S.shaded ? '#b8bec6' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(-w * 0.09)}" y="${n(y0)}" width="${n(w * 0.18)}" height="${n(h * 0.1)}" rx="0.5" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>` + txt(S, 0, y0 + h * 0.05, '1e-7', h * 0.05, { mono: true, color: S.shaded ? '#7fe0a8' : S.ink });
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h, r = Math.min(w * 0.38, h * 0.38), zc = h * 0.5; return [vcyl(0, 0, r, zc - r, zc + r, { color: p.color, spec: 0.7 }), box(-r * 0.6, -r * 0.4, -d * 0.1, d * 0.1, 0, zc - r, 'metal'), box(r * 0.4, r * 0.6, -d * 0.1, d * 0.1, 0, zc - r, 'metal'),
    { kind: 'cyl', x: [r - 0.5, r + w * 0.12], r: [h * 0.08, h * 0.08], cz: zc, cy: 0, mat: { color: '#b8bec6', spec: 0.7 } }, { kind: 'cyl', x: [-r - w * 0.12, -r + 0.5], r: [h * 0.08, h * 0.08], cz: zc, cy: 0, mat: { color: '#b8bec6', spec: 0.7 } },
    ...(p.window ? [disk([0, r - 0.2, zc], [0, 1, 0], r * 0.36, 0.5, { color: '#a9cbe4', alpha: 0.6, spec: 0.9 })] : []), ...(p.gauge ? [vcyl(0, 0, w * 0.03, zc + r, zc + r + h * 0.12, 'metal')] : [])]; } });

/* ================= sample preparation and safety ================= */
inst({ type: 'sonicator', name: 'Ultrasonic bath', size: [28, 14, 18], color: '#d6dade', keywords: 'ultrasonic bath sonicator sonication cleaning dispersion',
  defaults: { readout: '40 kHz', water: '#9cd2f0', waves: true }, params: [{ key: 'readout', label: 'Display', type: 'text' }, { key: 'water', label: 'Water colour', type: 'color' }, { key: 'waves', label: 'Ultrasound waves', type: 'bool' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = `<rect x="${n(x0 + w * 0.06)}" y="${n(y0)}" width="${n(w * 0.88)}" height="${n(h * 0.5)}" fill="${p.water}" fill-opacity="${S.shaded ? 0.6 : 0.45}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    if (p.waves) for (let k = 0; k < 3; k++) { let d = ''; for (let i = 0; i <= 30; i++) { const u = i / 30; d += (i ? ' L ' : 'M ') + n(x0 + w * (0.12 + 0.76 * u)) + ' ' + n(y0 + h * (0.12 + k * 0.12) + h * 0.025 * Math.sin(u * 2 * Math.PI * 6)); } s += `<path d="${d}" fill="none" stroke="${U.shadeRgb(p.water, 0.55)}" stroke-width="${n(S.lw * 0.5)}"/>`; }
    s += G.panel(S, uid, x0, y0 + h * 0.5, w, h * 0.5, p.color, 0.8) + G.digits(S, x0 + w * 0.08, y0 + h * 0.62, w * 0.3, h * 0.24, p.readout, '#7fe0a8') + G.knob(S, x0 + w * 0.6, y0 + h * 0.75, h * 0.12) + G.knob(S, x0 + w * 0.8, y0 + h * 0.75, h * 0.12);
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h * 0.5, { color: p.color, spec: 0.35 }), box(-w * 0.44, w * 0.44, -d * 0.4, d * 0.4, h * 0.5, h * 0.98, { color: '#c9ced6', spec: 0.7 }), box(-w * 0.42, w * 0.42, -d * 0.38, d * 0.38, h * 0.5, h * 0.9, { color: p.water, alpha: 0.6, spec: 0.9 }), front(-w / 2 + w * 0.08, -w / 2 + w * 0.38, d / 2, h * 0.14, h * 0.36, { color: '#0e1216', spec: 0.9 })]; } });
inst({ type: 'fumehood', name: 'Fume hood', size: [44, 46, 30], color: '#e7e9ec', keywords: 'fume hood extraction cabinet sash ventilation safety chemistry',
  defaults: { sash: 0.45, airflow: true }, params: [{ key: 'sash', label: 'Sash open', type: 'range', min: 0, max: 1, step: 0.01 }, { key: 'airflow', label: 'Airflow arrows', type: 'bool' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, wy0 = y0 + h * 0.14, wy1 = y0 + h * 0.66, open = (wy1 - wy0) * p.sash;
    let s = G.panel(S, uid, x0, y0, w, h, p.color, 0.6);
    s += `<rect x="${n(x0 + w * 0.06)}" y="${n(wy0)}" width="${n(w * 0.88)}" height="${n(wy1 - wy0)}" fill="${S.shaded ? '#f4f6f8' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(x0 + w * 0.06)}" y="${n(wy0)}" width="${n(w * 0.88)}" height="${n(wy1 - wy0 - open)}" fill="${S.shaded ? '#cfe3f1' : '#eef6fb'}" fill-opacity="${S.shaded ? 0.75 : 1}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/><rect x="${n(x0 + w * 0.06)}" y="${n(wy1 - open - h * 0.02)}" width="${n(w * 0.88)}" height="${n(h * 0.02)}" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(x0 + w * 0.04)}" y="${n(wy1)}" width="${n(w * 0.92)}" height="${n(h * 0.04)}" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>` + G.vents(S, x0 + w * 0.3, y0 + h * 0.04, w * 0.4, h * 0.05, 8);
    s += `<rect x="${n(x0 + w * 0.06)}" y="${n(wy1 + h * 0.06)}" width="${n(w * 0.88)}" height="${n(h * 0.24)}" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/><line x1="0" y1="${n(wy1 + h * 0.06)}" x2="0" y2="${n(wy1 + h * 0.3)}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    if (p.airflow) { const c = '#3a6fd8'; [0.3, 0.5, 0.7].forEach(f => { s += `<path d="M ${n(x0 + w * f)} ${n(wy1 - open * 0.3)} Q ${n(x0 + w * f)} ${n(wy0 + h * 0.06)} ${n(x0 + w * (0.5 + (f - 0.5) * 0.4))} ${n(y0 + h * 0.1)}" fill="none" stroke="${c}" stroke-width="${n(S.lw * 0.8)}" stroke-opacity="0.8"/>` + H.arrowHead(x0 + w * (0.5 + (f - 0.5) * 0.4), y0 + h * 0.1, -Math.PI / 2, 1.2, c); }); }
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h, t = 1; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h * 0.34, { color: p.color, spec: 0.3 }), box(-w / 2, -w / 2 + t, -d / 2, d / 2, h * 0.34, h, { color: p.color, spec: 0.3 }), box(w / 2 - t, w / 2, -d / 2, d / 2, h * 0.34, h, { color: p.color, spec: 0.3 }), box(-w / 2, w / 2, -d / 2, -d / 2 + t, h * 0.34, h, { color: p.color, spec: 0.3 }), box(-w / 2, w / 2, -d / 2, d / 2, h * 0.86, h, { color: p.color, spec: 0.3 }),
    box(-w / 2 + t, w / 2 - t, d / 2 - 0.4, d / 2, h * 0.34 + (h * 0.52) * p.sash, h * 0.86, { color: '#cfe3f1', alpha: 0.4, spec: 0.9 })]; } });
inst({ type: 'glovebox', name: 'Glovebox', size: [52, 30, 28], color: '#c9ced6', keywords: 'glovebox inert atmosphere argon nitrogen gloves antechamber air sensitive',
  defaults: { antechamber: true, readout: 'O₂ < 0.1 ppm' }, params: [{ key: 'antechamber', label: 'Antechamber', type: 'bool' }, { key: 'readout', label: 'Display', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2, bw = p.antechamber ? w * 0.82 : w;
    let s = G.panel(S, uid, x0, y0, bw, h, p.color, 1);
    s += `<rect x="${n(x0 + bw * 0.05)}" y="${n(y0 + h * 0.08)}" width="${n(bw * 0.9)}" height="${n(h * 0.62)}" rx="1" fill="${S.shaded ? '#cfe3f1' : '#eef6fb'}" fill-opacity="${S.shaded ? 0.8 : 1}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    [0.33, 0.67].forEach(f => { const cx = x0 + bw * f, cy = y0 + h * 0.48, r = h * 0.12; s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.8)}"/><path d="M ${n(cx - r * 0.6)} ${n(cy)} Q ${n(cx - r * 0.7)} ${n(cy - r * 1.8)} ${n(cx)} ${n(cy - r * 2)} Q ${n(cx + r * 0.7)} ${n(cy - r * 1.8)} ${n(cx + r * 0.6)} ${n(cy)} Z" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" fill-opacity="${S.shaded ? 0.85 : 1}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`; });
    s += G.digits(S, x0 + bw * 0.05, y0 + h * 0.78, bw * 0.3, h * 0.14, p.readout, '#7fe0a8');
    if (p.antechamber) { const ax = x0 + bw, ay = y0 + h * 0.3, aw = w - bw, ah = h * 0.36; s += `<rect x="${n(ax)}" y="${n(ay)}" width="${n(aw)}" height="${n(ah)}" rx="${n(ah * 0.5)}" fill="${S.shaded ? U.shadeRgb(p.color, 0.9) : '#ffffff'}" stroke="${G.edge(S, p.color)}" stroke-width="${n(S.lw * 0.8)}"/><circle cx="${n(ax + aw * 0.75)}" cy="${n(ay + ah / 2)}" r="${n(ah * 0.3)}" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`; }
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h, bw = p.antechamber ? w * 0.82 : w, x0 = -w / 2; const out = [box(x0, x0 + bw, -d / 2, d / 2, 0, h, { color: p.color, spec: 0.35 }), front(x0 + bw * 0.05, x0 + bw * 0.95, d / 2, h * 0.3, h * 0.92, { color: '#cfe3f1', spec: 0.9 }), ...[0.33, 0.67].map(f => disk([x0 + bw * f, d / 2 + 0.06, h * 0.52], [0, 1, 0], h * 0.12, 0.4, { color: '#2b2f36', spec: 0.3 }))];
    if (p.antechamber) out.push({ kind: 'cyl', x: [x0 + bw, w / 2], r: [h * 0.18, h * 0.18], cz: h * 0.52, cy: 0, mat: { color: U.shadeRgb(p.color, 0.9), spec: 0.5 } }); return out; } });
inst({ type: 'freezer', name: 'Freezer / fridge', size: [20, 36, 20], color: '#e7e9ec', keywords: 'freezer fridge refrigerator minus 80 storage samples cold',
  defaults: { readout: '−80 °C' }, params: [{ key: 'readout', label: 'Display', type: 'text' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, y0 = -h / 2;
    let s = G.panel(S, uid, x0, y0, w, h, p.color, 1) + `<rect x="${n(x0 + w * 0.05)}" y="${n(y0 + h * 0.03)}" width="${n(w * 0.9)}" height="${n(h * 0.9)}" rx="0.8" fill="none" stroke="${S.ink}" stroke-opacity="0.6" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += G.digits(S, x0 + w * 0.2, y0 + h * 0.08, w * 0.6, h * 0.08, p.readout, '#7fd3ff') + `<rect x="${n(w / 2 - w * 0.16)}" y="${n(y0 + h * 0.3)}" width="${n(w * 0.05)}" height="${n(h * 0.3)}" rx="0.4" fill="${S.shaded ? '#9aa3ad' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(x0 + w * 0.05)}" y="${n(h / 2 - h * 0.06)}" width="${n(w * 0.9)}" height="${n(h * 0.05)}" fill="${S.shaded ? '#3a3f46' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>` + G.vents(S, x0 + w * 0.15, h / 2 - h * 0.055, w * 0.7, h * 0.03, 8);
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, h, { color: p.color, spec: 0.3 }), front(-w * 0.3, w * 0.3, d / 2, h * 0.84, h * 0.92, { color: '#0e1216', spec: 0.9 }), box(w * 0.34, w * 0.39, d / 2, d / 2 + 0.6, h * 0.4, h * 0.7, 'metal')]; } });
inst({ type: 'stand', name: 'Retort stand with clamp', size: [16, 44, 12], color: '#5f6b78', noColor: false, keywords: 'retort stand clamp boss head rod support burette holder ring',
  defaults: { clampAt: 0.7, ring: false }, params: [{ key: 'clampAt', label: 'Clamp height', type: 'range', min: 0.15, max: 0.95, step: 0.01 }, { key: 'ring', label: 'Ring instead of a clamp', type: 'bool' }],
  front(p, S, uid) {
    const w = p.w, h = p.h, x0 = -w / 2, rx = x0 + w * 0.2, cy = h / 2 - h * p.clampAt, met = S.shaded ? '#b8bec6' : '#ffffff';
    let s = G.panel(S, uid, x0, h / 2 - h * 0.04, w, h * 0.04, p.color, 0.3) + `<rect x="${n(rx - 0.4)}" y="${n(-h / 2)}" width="0.8" height="${n(h * 0.96)}" fill="${met}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/>`;
    s += `<rect x="${n(rx - 1)}" y="${n(cy - 1)}" width="2" height="2" fill="${S.shaded ? '#2b2f36' : '#ffffff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.5)}"/><rect x="${n(rx + 1)}" y="${n(cy - 0.3)}" width="${n(w * 0.45)}" height="0.6" fill="${met}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.4)}"/>`;
    const ex = rx + 1 + w * 0.45;
    s += p.ring ? `<ellipse cx="${n(ex + w * 0.1)}" cy="${n(cy)}" rx="${n(w * 0.12)}" ry="${n(w * 0.03)}" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw * 0.9)}"/>` : `<path d="M ${n(ex)} ${n(cy - 1.4)} q ${n(w * 0.1)} 0 ${n(w * 0.1)} 1.4 q 0 1.4 ${n(-w * 0.1)} 1.4" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw * 0.9)}"/><path d="M ${n(ex + w * 0.16)} ${n(cy - 1.4)} q ${n(-w * 0.1)} 0 ${n(-w * 0.1)} 1.4 q 0 1.4 ${n(w * 0.1)} 1.4" fill="none" stroke="${S.ink}" stroke-width="${n(S.lw * 0.9)}"/>`;
    return s;
  },
  solid: p => { const w = p.w, d = p.d, h = p.h, rx = -w / 2 + w * 0.2, cz = h * p.clampAt; return [box(-w / 2, w / 2, -d / 2, d / 2, 0, 0.8, { color: p.color, spec: 0.4 }), vcyl(rx, 0, 0.4, 0.8, h, 'metal'), box(rx - 1, rx + 1, -1, 1, cz - 1, cz + 1, 'black'), box(rx + 1, rx + 1 + w * 0.45, -0.3, 0.3, cz - 0.3, cz + 0.3, 'metal')]; } });
})();
