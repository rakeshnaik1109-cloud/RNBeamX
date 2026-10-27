/* ═══════════════════════════════════════════════════════════
   RNBeamX — core/utils.js
   Shared helpers: 2D vector math, complex numbers (for Jones
   calculus), colour handling, wavelength → colour, XML escaping,
   number formatting and file download.
   Everything here is pure (no DOM state) so every other module
   can depend on it.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const U = RNBX.util = {};

/* ---------- units ----------
   The drawing unit is the millimetre on the final printed page.
   Journals specify line weights and type in points. */
U.PT = 25.4 / 72;            // mm per point
U.pt2mm = pt => pt * U.PT;
U.mm2pt = mm => mm / U.PT;

U.uid = () => 'o' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
U.clamp = (v, a, b) => Math.min(b, Math.max(a, v));
U.lerp = (a, b, t) => a + (b - a) * t;
U.rad = d => d * Math.PI / 180;
U.deg = r => r * 180 / Math.PI;
U.normDeg = d => ((d % 360) + 540) % 360 - 180;   // → (-180, 180]
U.deepClone = o => JSON.parse(JSON.stringify(o));
U.round = (v, d = 3) => { const k = Math.pow(10, d); return Math.round(v * k) / k; };
U.fmt = (v, d = 2) => (Math.abs(v) < 1e-9 ? '0' : String(U.round(v, d)));

/* ---------- 2D vectors (arrays [x, y]) ---------- */
const V = U.v = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, k) => [a[0] * k, a[1] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
  cross: (a, b) => a[0] * b[1] - a[1] * b[0],
  len: a => Math.hypot(a[0], a[1]),
  dist: (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
  norm: a => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
  perp: a => [-a[1], a[0]],
  rot: (a, deg) => { const c = Math.cos(U.rad(deg)), s = Math.sin(U.rad(deg)); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; },
  angle: a => U.deg(Math.atan2(a[1], a[0])),
  fromAngle: deg => [Math.cos(U.rad(deg)), Math.sin(U.rad(deg))],
  reflect: (d, n) => { const k = 2 * (d[0] * n[0] + d[1] * n[1]); return [d[0] - k * n[0], d[1] - k * n[1]]; },
};

/* Object-local → world. Local frame: optical axis along +x,
   rotation in degrees clockwise on screen (SVG y points down). */
U.toWorld = (obj, p) => {
  const s = obj.scale || 1, r = V.rot([p[0] * s, p[1] * s], obj.rot || 0);
  return [obj.x + r[0], obj.y + r[1]];
};
U.dirToWorld = (obj, d) => V.rot(d, obj.rot || 0);
U.toLocal = (obj, p) => {
  const s = obj.scale || 1, r = V.rot([p[0] - obj.x, p[1] - obj.y], -(obj.rot || 0));
  return [r[0] / s, r[1] / s];
};

/* Ray p + t·d against segment a→b. Returns {t, u} or null. */
U.raySeg = (p, d, a, b) => {
  const e = [b[0] - a[0], b[1] - a[1]];
  const den = d[0] * e[1] - d[1] * e[0];
  if (Math.abs(den) < 1e-12) return null;
  const ap = [a[0] - p[0], a[1] - p[1]];
  const t = (ap[0] * e[1] - ap[1] * e[0]) / den;
  const u = (ap[0] * d[1] - ap[1] * d[0]) / den;
  if (u < -1e-9 || u > 1 + 1e-9) return null;
  return { t, u };
};

/* Distance from point to segment, and the closest point on it. */
U.pointSeg = (p, a, b) => {
  const e = V.sub(b, a), l2 = V.dot(e, e) || 1e-12;
  const u = U.clamp(V.dot(V.sub(p, a), e) / l2, 0, 1);
  const q = V.add(a, V.mul(e, u));
  return { d: V.dist(p, q), q, u };
};

/* ---------- complex numbers (Jones vectors) ---------- */
const C = U.C = {
  c: (re, im = 0) => ({ re, im }),
  add: (a, b) => ({ re: a.re + b.re, im: a.im + b.im }),
  mul: (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }),
  scale: (a, k) => ({ re: a.re * k, im: a.im * k }),
  abs2: a => a.re * a.re + a.im * a.im,
  expi: phi => ({ re: Math.cos(phi), im: Math.sin(phi) }),
  conj: a => ({ re: a.re, im: -a.im }),
};

/* ---------- colour ---------- */
U.hexToRgb = hex => {
  let h = String(hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
U.rgbToHex = rgb => '#' + rgb.map(v => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
U.mix = (a, b, t) => { const A = U.hexToRgb(a), B = U.hexToRgb(b); return U.rgbToHex(A.map((v, i) => U.lerp(v, B[i], t))); };
U.lighten = (c, t) => U.mix(c, '#ffffff', t);
U.darken = (c, t) => U.mix(c, '#000000', t);
U.shadeRgb = (c, k) => { const A = U.hexToRgb(c); return U.rgbToHex(A.map(v => v * k)); };

/* Wavelength → print-safe colour.
   Pure spectral conversions (Bruton) give neon lime greens that
   print poorly; these anchors are tuned to look like the beams
   in published figures while keeping hue order physical. */
const WL = [
  [360, '#7b1fa2'], [380, '#7a1fb0'], [405, '#6236d8'], [440, '#2f45e0'],
  [470, '#1b7fe6'], [488, '#00a3e0'], [505, '#00b39a'], [520, '#14b04a'],
  [532, '#1fae3e'], [550, '#7cbf1f'], [570, '#d4c400'], [590, '#f4a300'],
  [610, '#f46a00'], [633, '#e52521'], [660, '#cc1222'], [700, '#a8001c'],
  [780, '#82001a'],
];
U.wavelengthColor = nm => {
  if (!isFinite(nm)) return '#e52521';
  if (nm <= WL[0][0]) return WL[0][1];
  if (nm >= 780) return '#8e1538';           // NIR / IR: deep crimson by convention
  for (let i = 1; i < WL.length; i++) {
    if (nm <= WL[i][0]) {
      const [a, ca] = WL[i - 1], [b, cb] = WL[i];
      return U.mix(ca, cb, (nm - a) / (b - a));
    }
  }
  return '#8e1538';
};
/* Okabe–Ito colour-blind-safe palette, bucketed by wavelength so the
   ordering short→long still reads as "blue → red". */
U.wavelengthColorSafe = nm => {
  if (nm < 470) return '#0072B2';
  if (nm < 505) return '#56B4E9';
  if (nm < 560) return '#009E73';
  if (nm < 590) return '#E6B800';
  if (nm < 620) return '#E69F00';
  if (nm < 750) return '#D55E00';
  return '#CC79A7';
};
U.bandName = nm => nm < 380 ? 'UV' : nm <= 750 ? 'visible' : nm <= 1400 ? 'NIR' : 'IR';

/* ---------- strings ---------- */
U.esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
U.attrs = o => Object.keys(o).filter(k => o[k] !== undefined && o[k] !== null && o[k] !== false)
  .map(k => `${k}="${U.esc(o[k])}"`).join(' ');

/* ---------- browser helpers ---------- */
U.download = (blob, name) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
};
U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
U.store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};
U.loadScript = src => new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src));
  document.head.appendChild(s);
});
/* Anonymous feature-usage count (GoatCounter: no cookies, no personal data).
   Each feature is counted at most once per visit and only its name is sent,
   never figure content, file names or settings. Does nothing when GoatCounter
   is not loaded (offline, file://, blocked). */
const tracked = new Set();
U.track = feature => {
  if (tracked.has(feature)) return;
  tracked.add(feature);
  try {
    if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: 'rnbeamx-feature/' + feature, title: 'RNBeamX: ' + feature, event: true });
  } catch (e) { /* counting must never break the app */ }
};
U.slug = s => String(s || 'figure').trim().replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').slice(0, 60) || 'figure';
})();
