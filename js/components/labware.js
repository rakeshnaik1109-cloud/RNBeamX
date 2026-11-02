/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/labware.js
   Labware & chemistry: glassware with liquids, pipettes, syringes,
   tubes, well plates, petri dishes, bottles, a condenser, a test-
   tube rack, and fluid tubing between them.

   Every vessel is made from the right half of its outer profile
   (rim → bottom, mm, y down) and a wall thickness: the inner
   profile is the outer one moved inwards, mirrored to make the
   glass wall, the cavity and the liquid. Liquids have a level,
   a colour, a meniscus, an optional second phase, bubbles,
   particles and a precipitate.

   Two looks, following the figure style: Schematic (line art,
   flat colours) and Shaded (tinted glass with highlights, liquid
   gradients). They are figure graphics (annotations): they do not
   take part in the ray tracing.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Labware & chemistry';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);

/* ---------- small helpers ---------- */
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const idOf = (obj, p, tag) => 'rbx-lw-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const rnd = seed => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const P = pts => 'M ' + pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ');
const arc = (cx, cy, r, a0, a1, k = 14) => Array.from({ length: k + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / k; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
/* move a right-half profile (rim → axis) inwards by t */
const inset = (R, t) => {
  // every segment moved inwards by t, corners where neighbouring segments meet (mitred, limited)
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  const out = R.map((p, i) => {
    if (i === 0) { const m = nrm(R[0], R[1]); return [p[0] + m[0] * t, p[1] + m[1] * t]; }
    if (i === R.length - 1) { const m = nrm(R[i - 1], R[i]); return [p[0] + m[0] * t, p[1] + m[1] * t]; }
    const m1 = nrm(R[i - 1], p), m2 = nrm(p, R[i + 1]), bx = m1[0] + m2[0], by = m1[1] + m2[1], l = Math.hypot(bx, by);
    if (l < 1e-6) return [p[0] + m2[0] * t, p[1] + m2[1] * t];
    const ux = bx / l, uy = by / l, c = ux * m1[0] + uy * m1[1], k = t / Math.max(1 / 3, c);
    return [p[0] + ux * k, p[1] + uy * k];
  });
  out[0][1] = R[0][1];
  if (R[R.length - 1][0] <= 1e-9) out[out.length - 1][0] = 0;
  return out;
};
const mir = pts => pts.map(p => [-p[0], p[1]]);
/* glass wall, cavity and its extent from a right-half profile; open: the profile ends off the axis (funnels, burettes) */
const vesselGeo = (R, t) => {
  const I = inset(R, t), open = R[R.length - 1][0] > 1e-9;
  let walls, cavity;
  if (!open) {
    const oU = mir(R).concat(R.slice(0, -1).reverse()), iU = mir(I).concat(I.slice(0, -1).reverse());
    walls = [oU.concat(iU.slice().reverse())]; cavity = iU;
  } else {
    walls = [mir(R).concat(mir(I).reverse()), R.concat(I.slice().reverse())];
    cavity = mir(I).concat(I.slice().reverse());
  }
  const ys = cavity.map(p => p[1]);
  return { walls, cavity, inner: I, top: Math.min(...ys), bottom: Math.max(...ys), open };
};
/* half width of the cavity at height y (for the meniscus) */
const widthAt = (cav, y) => {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < cav.length; i++) { const a = cav[i], b = cav[(i + 1) % cav.length]; if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) { const x = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); lo = Math.min(lo, x); hi = Math.max(hi, x); } }
  return isFinite(lo) ? [lo, hi] : null;
};

/* ---------- liquids ---------- */
const LIQ_DEF = { fill: 0.6, liquid: '#5aa9e6', liqAlpha: 0.75, meniscus: true, phase2: 0, liquid2: '#e6b85a', bubbles: 0, particles: 0, partColor: '#b8442c', precipitate: false, precColor: '#8a6d4a' };
const LIQ = [
  { key: 'fill', label: 'Filled', type: 'range', min: 0, max: 1, step: 0.01, animatable: true },
  { key: 'liquid', label: 'Liquid colour', type: 'color', show: p => p.fill > 0 },
  { key: 'liqAlpha', label: 'Liquid opacity', type: 'range', min: 0.1, max: 1, step: 0.01, show: p => p.fill > 0 },
  { key: 'meniscus', label: 'Meniscus', type: 'bool', show: p => p.fill > 0 },
  { key: 'phase2', label: 'Lower phase (fraction)', type: 'range', min: 0, max: 0.95, step: 0.01, show: p => p.fill > 0, hint: 'two immiscible liquids' },
  { key: 'liquid2', label: 'Lower phase colour', type: 'color', show: p => p.fill > 0 && p.phase2 > 0 },
  { key: 'bubbles', label: 'Bubbles', type: 'number', min: 0, max: 60, step: 1, show: p => p.fill > 0 },
  { key: 'particles', label: 'Particles (e.g. nanoparticles)', type: 'number', min: 0, max: 400, step: 1, show: p => p.fill > 0 },
  { key: 'partColor', label: 'Particle colour', type: 'color', show: p => p.fill > 0 && p.particles > 0 },
  { key: 'precipitate', label: 'Precipitate at the bottom', type: 'bool', show: p => p.fill > 0 },
  { key: 'precColor', label: 'Precipitate colour', type: 'color', show: p => p.fill > 0 && p.precipitate },
];
const liquidGrad = (S, col, id) => S.shaded ? `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${U.shadeRgb(col, 0.78)}"/><stop offset="0.35" stop-color="${U.lighten(col, 0.18)}"/><stop offset="0.7" stop-color="${col}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.72)}"/></linearGradient>` : '';
function liquid(p, S, g, uid) {
  if (!(p.fill > 0)) return '';
  const top = g.top, bot = g.bottom, yl = bot - U.clamp(p.fill, 0, 1) * (bot - top), w = widthAt(g.cavity, yl) || [-1, 1];
  const m = p.meniscus ? Math.min(0.9, (w[1] - w[0]) * 0.08) : 0, xl = w[0] - 2, xr = w[1] + 2, x0 = Math.min(...g.cavity.map(q => q[0])) - 2, x1 = Math.max(...g.cavity.map(q => q[0])) + 2;
  const surf = `M ${n(xl)} ${n(yl - m)} Q ${n((w[0] + w[1]) / 2)} ${n(yl + m)} ${n(xr)} ${n(yl - m)}`;
  const clip = `${uid}-c`, g1 = `${uid}-l1`, g2 = `${uid}-l2`;
  let s = `<defs><clipPath id="${clip}"><path d="${P(g.cavity)} Z"/></clipPath>${liquidGrad(S, p.liquid, g1)}${p.phase2 > 0 ? liquidGrad(S, p.liquid2, g2) : ''}</defs><g clip-path="url(#${clip})">`;
  s += `<path d="${surf} L ${n(x1)} ${n(bot + 2)} L ${n(x0)} ${n(bot + 2)} L ${n(x0)} ${n(yl - m)} Z" fill="${S.shaded ? `url(#${g1})` : p.liquid}" fill-opacity="${p.liqAlpha}"/>`;
  if (p.phase2 > 0) { const y2 = bot - p.phase2 * (bot - yl); s += `<rect x="${n(x0)}" y="${n(y2)}" width="${n(x1 - x0)}" height="${n(bot - y2 + 2)}" fill="${S.shaded ? `url(#${g2})` : p.liquid2}" fill-opacity="${p.liqAlpha}"/><line x1="${n(x0)}" y1="${n(y2)}" x2="${n(x1)}" y2="${n(y2)}" stroke="${U.shadeRgb(p.liquid2, 0.6)}" stroke-width="${n(S.lw * 0.5)}"/>`; }
  if (p.precipitate) { const r = rnd(7), hp = Math.min(1.2, (bot - yl) * 0.25); s += `<path d="M ${n(x0)} ${n(bot + 1)} L ${n(x0)} ${n(bot - hp * 0.6)} Q ${n((x0 + x1) / 2)} ${n(bot - hp * 1.4)} ${n(x1)} ${n(bot - hp * 0.6)} L ${n(x1)} ${n(bot + 1)} Z" fill="${p.precColor}"/>`;
    for (let i = 0; i < 24; i++) s += `<circle cx="${n(x0 + (x1 - x0) * r())}" cy="${n(bot - hp * r())}" r="${n(0.12 + 0.12 * r())}" fill="${U.shadeRgb(p.precColor, 0.7)}"/>`; }
  const rr = rnd(13), inside = () => { for (let k = 0; k < 20; k++) { const y = yl + (bot - yl) * (0.06 + 0.9 * rr()), ww = widthAt(g.cavity, y); if (ww) return [ww[0] + (ww[1] - ww[0]) * (0.1 + 0.8 * rr()), y]; } return null; };
  for (let i = 0; i < (p.particles | 0); i++) { const q = inside(); if (q) s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(0.18)}" fill="${p.partColor}"/>`; }
  for (let i = 0; i < (p.bubbles | 0); i++) { const q = inside(); if (q) { const r = 0.2 + 0.35 * rr(); s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(r)}" fill="${S.shaded ? '#ffffff' : 'none'}" fill-opacity="0.35" stroke="${S.shaded ? '#ffffff' : S.ink}" stroke-opacity="${S.shaded ? 0.9 : 0.6}" stroke-width="${n(S.lw * 0.45)}"/>`; } }
  s += `<path d="${surf}" fill="none" stroke="${S.shaded ? U.lighten(p.liquid, 0.45) : U.shadeRgb(p.liquid, 0.55)}" stroke-width="${n(S.lw * (S.shaded ? 0.9 : 0.6))}"/>`;
  return s + '</g>';
}

/* ---------- glass ---------- */
const GLASS_DEF = { tint: '', amber: false };
const GLASS = [{ key: 'tint', label: 'Glass tint', type: 'color', allowEmpty: true }];
function glass(p, S, g, uid, opt = {}) {
  const tint = p.amber ? '#b5651d' : p.tint;
  const lw = n(S.lw * (opt.thin ? 0.7 : 0.9));
  let back = '', walls = '', hi = '';
  // the cavity: faint so the liquid reads; the back wall is a little darker in shaded mode
  if (S.shaded) back = `<path d="${P(g.cavity)} Z" fill="${tint || '#e8f3fb'}" fill-opacity="${tint ? 0.18 : 0.45}"/>`;
  else if (opt.white !== false) back = `<path d="${P(g.cavity)} Z" fill="${tint || '#ffffff'}" fill-opacity="${tint ? 0.12 : 1}"/>`;
  g.walls.forEach(w => {
    walls += S.shaded ? `<path d="${P(w)} Z" fill="${tint ? U.lighten(tint, 0.2) : 'url(#rbx-glass)'}" fill-opacity="${tint ? 0.85 : 1}" stroke="${tint ? U.shadeRgb(tint, 0.6) : '#5b7a95'}" stroke-width="${lw}" stroke-linejoin="round"/>`
      : `<path d="${P(w)} Z" fill="${tint ? U.lighten(tint, 0.5) : '#ffffff'}" stroke="${S.ink}" stroke-width="${lw}" stroke-linejoin="round"/>`;
  });
  if (S.shaded && !opt.noHighlight) {
    // a vertical highlight along the left of the cavity
    const xs = g.cavity.map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), w = x1 - x0, y0 = g.top + (g.bottom - g.top) * 0.08, y1 = g.top + (g.bottom - g.top) * (opt.hiEnd || 0.85);
    hi = `<defs><clipPath id="${uid}-h"><path d="${P(g.cavity)} Z"/></clipPath></defs><g clip-path="url(#${uid}-h)"><rect x="${n(x0 + w * 0.12)}" y="${n(y0)}" width="${n(Math.max(0.3, w * 0.09))}" height="${n(y1 - y0)}" rx="${n(w * 0.04)}" fill="#ffffff" fill-opacity="0.55"/><rect x="${n(x1 - w * 0.14)}" y="${n(y0)}" width="${n(Math.max(0.2, w * 0.03))}" height="${n(y1 - y0)}" fill="#ffffff" fill-opacity="0.35"/></g>`;
  }
  return { back, walls, hi };
}
/* graduation marks along the right of the cavity */
function marks(S, g, count, opt = {}) {
  if (!(count > 0)) return '';
  let s = '';
  const top = g.top + (g.bottom - g.top) * (opt.from || 0.15), bot = g.bottom - (g.bottom - g.top) * (opt.to || 0.08);
  for (let i = 0; i <= count; i++) {
    const y = bot - (bot - top) * i / count, w = widthAt(g.cavity, y); if (!w) continue;
    const L = (w[1] - w[0]) * (i % 2 ? 0.12 : 0.22);
    s += `<line x1="${n(w[1] - L)}" y1="${n(y)}" x2="${n(w[1])}" y2="${n(y)}" stroke="${S.shaded ? '#2e3a46' : S.ink}" stroke-opacity="0.7" stroke-width="${n(S.lw * 0.5)}"/>`;
    if (opt.labels && i % 2 === 0 && i > 0) s += `<text x="${n(w[1] - L - 0.4)}" y="${n(y + 0.5)}" font-family="${U.esc(S.font)}" font-size="${n(Math.min(1.6, (w[1] - w[0]) * 0.12))}" text-anchor="end" fill="${S.ink}" fill-opacity="0.75">${Math.round(opt.max * i / count)}</text>`;
  }
  return s;
}
/* a paper label on the glass, with markup (e.g. HAuCl_4) */
function label(p, S, g, y, w) {
  if (!p.text) return '';
  const fs = Math.min(p.textSize ? U.pt2mm(p.textSize) : S.fs, w * 0.22), h = fs * 2.1;
  return `<rect x="${n(-w / 2)}" y="${n(y - h / 2)}" width="${n(w)}" height="${n(h)}" rx="${n(h * 0.12)}" fill="${p.labelBg || '#ffffff'}" fill-opacity="0.95" stroke="${S.ink}" stroke-opacity="0.35" stroke-width="${n(S.lw * 0.4)}"/>` +
    `<text x="0" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(fs)}" text-anchor="middle" dominant-baseline="central" fill="#111">${RNBX.text.markup(p.text, fs)}</text>`;
}
const TEXT = [{ key: 'text', label: 'Label on the glass', type: 'text', hint: 'e.g. HAuCl_4, 1 M NaCl, Sample A' }];
/* a cap or stopper (screw cap with ridges in shaded mode) */
const cap = (S, x, y, w, h, col, ridges = true) => {
  let s = `<rect x="${n(x - w / 2)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(Math.min(w, h) * 0.18)}" fill="${S.shaded ? col : U.lighten(col, 0.25)}" stroke="${S.shaded ? U.shadeRgb(col, 0.55) : S.ink}" stroke-width="${n(S.lw * 0.8)}"/>`;
  if (ridges) for (let i = 1; i < 6; i++) s += `<line x1="${n(x - w / 2 + w * i / 6)}" y1="${n(y + h * 0.15)}" x2="${n(x - w / 2 + w * i / 6)}" y2="${n(y + h * 0.85)}" stroke="${U.shadeRgb(col, S.shaded ? 0.7 : 0.4)}" stroke-width="${n(S.lw * 0.4)}"/>`;
  if (S.shaded) s += `<rect x="${n(x - w / 2 + w * 0.12)}" y="${n(y + h * 0.1)}" width="${n(w * 0.12)}" height="${n(h * 0.8)}" fill="#ffffff" fill-opacity="0.35"/>`;
  return s;
};

/* ---------- a vessel component from a profile function ---------- */
const vessel = cfg => lib.register(Object.assign({
  category: CAT, annotation: true, autoLabel: false, abbr: '',
  bbox(p) { const R = cfg.profile(p), xs = R.map(q => q[0]), ys = R.map(q => q[1]), e = cfg.extra ? cfg.extra(p) : [0, 0, 0, 0], cy = cfg.center(p); return [-Math.max(...xs) - 0.6 - e[0], Math.min(...ys) - cy - 0.6 - e[1], Math.max(...xs) + 0.6 + e[2], Math.max(...ys) - cy + 0.6 + e[3]]; },
  draw(p, S, obj) {
    const uid = idOf(obj, p, cfg.type), cy = cfg.center(p), g = vesselGeo(cfg.profile(p), Math.max(0.15, p.wall || 0.5));
    const gl = glass(p, S, g, uid, cfg.glassOpt || {});
    let s = `<g transform="translate(0 ${n(-cy)})">`;
    s += (cfg.under ? cfg.under(p, S, g) : '') + gl.back + liquid(p, S, g, uid) + (cfg.inside ? cfg.inside(p, S, g) : '') + gl.walls + gl.hi;
    s += marks(S, g, p.marks || 0, Object.assign({ max: p.volume || 100 }, cfg.marksOpt || {}, { labels: p.markNumbers }));
    if (cfg.over) s += cfg.over(p, S, g);
    if (p.text) { const y = g.top + (g.bottom - g.top) * (cfg.labelAt || 0.55), w = widthAt(g.cavity, y); if (w) s += label(p, S, g, y, (w[1] - w[0]) * 0.8); }
    return s + '</g>';
  },
}, cfg, { defaults: Object.assign({ wall: 0.5, marks: 0, markNumbers: false, volume: 100, text: '' }, GLASS_DEF, LIQ_DEF, cfg.defaults),
  params: (cfg.params || []).concat(cfg.noLiquid ? [] : LIQ, GLASS, cfg.noText ? [] : TEXT, cfg.marksOff ? [] : [{ key: 'marks', label: 'Graduation marks', type: 'number', min: 0, max: 40, step: 1 }, { key: 'markNumbers', label: 'Numbers on the marks', type: 'bool', show: q => q.marks > 0 }, { key: 'volume', label: 'Volume at the top mark', type: 'number', min: 0, step: 1, show: q => q.marks > 0 && q.markNumbers }],
    [{ key: 'wall', label: 'Glass wall', type: 'number', unit: 'mm', min: 0.15, max: 3, step: 0.05 }]) }));
const dim = (key, label, min, max, step = 0.5) => ({ key, label, type: 'number', unit: 'mm', min, max, step });

/* ================= glassware ================= */
vessel({ type: 'beaker', name: 'Beaker', keywords: 'beaker glass vessel solution liquid chemistry lab',
  defaults: { w: 16, h: 20, marks: 8, fill: 0.55 },
  params: [dim('w', 'Width', 4, 120), dim('h', 'Height', 4, 160)],
  profile: p => [[p.w / 2 + 0.7, 0], [p.w / 2, 0.9], ...arc(p.w / 2 - 1.4, p.h - 1.4, 1.4, 0, Math.PI / 2, 6), [0, p.h]],
  center: p => p.h / 2,
  inside: (p, S, g) => p.stirbar ? `<rect x="${n(-p.w * 0.16)}" y="${n(g.bottom - 0.9)}" width="${n(p.w * 0.32)}" height="${n(0.75)}" rx="0.37" fill="${S.shaded ? '#f4f4f4' : '#fff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>` : '',
  variants: [{ name: 'Beaker with stir bar', props: { stirbar: true, fill: 0.5, liquid: '#b07bd8' } }] });
lib.get('beaker').params.push({ key: 'stirbar', label: 'Stir bar', type: 'bool' });
vessel({ type: 'gradcyl', name: 'Graduated cylinder', keywords: 'graduated measuring cylinder volume chemistry lab',
  defaults: { w: 7, h: 34, marks: 20, fill: 0.6 },
  params: [dim('w', 'Width', 2, 60), dim('h', 'Height', 6, 200)],
  profile: p => [[p.w / 2 + 0.7, 0], [p.w / 2, 0.9], ...arc(p.w / 2 - 0.6, p.h - 0.6, 0.6, 0, Math.PI / 2, 4), [0, p.h]],
  center: p => p.h / 2 + 0.8, extra: p => [p.w * 0.45, 0, p.w * 0.45, 1.8],
  under: () => '',
  over: (p, S, g) => { const bw = p.w * 1.9, y = g.bottom + 0.4; return `<path d="M ${n(-bw / 2)} ${n(y + 1.6)} L ${n(-bw / 2 + 0.8)} ${n(y)} L ${n(bw / 2 - 0.8)} ${n(y)} L ${n(bw / 2)} ${n(y + 1.6)} Z" fill="${S.shaded ? 'url(#rbx-glass)' : '#fff'}" stroke="${S.shaded ? '#5b7a95' : S.ink}" stroke-width="${n(S.lw * 0.8)}"/>`; },
  marksOpt: { from: 0.08, to: 0.04 } });
vessel({ type: 'testtube', name: 'Test tube', keywords: 'test tube glass chemistry biology sample',
  defaults: { w: 5, h: 26, fill: 0.5, stopper: false, stopperColor: '#c0392b' },
  params: [dim('w', 'Diameter', 1.5, 40), dim('h', 'Length', 5, 150), { key: 'stopper', label: 'Stopper', type: 'bool' }, { key: 'stopperColor', label: 'Stopper colour', type: 'color', show: p => p.stopper }],
  profile: p => [[p.w / 2 + 0.45, 0], [p.w / 2, 0.6], ...arc(0, p.h - p.w / 2, p.w / 2, 0, Math.PI / 2, 10)],
  center: p => p.h / 2, extra: p => [0.4, p.stopper ? 2.6 : 0, 0.4, 0],
  over: (p, S) => p.stopper ? `<path d="M ${n(-p.w * 0.62)} ${n(-2.4)} L ${n(p.w * 0.62)} ${n(-2.4)} L ${n(p.w * 0.46)} ${n(1.6)} L ${n(-p.w * 0.46)} ${n(1.6)} Z" fill="${p.stopperColor}" stroke="${S.shaded ? U.shadeRgb(p.stopperColor, 0.6) : S.ink}" stroke-width="${n(S.lw * 0.8)}"/>` : '' });
vessel({ type: 'erlenmeyer', name: 'Erlenmeyer (conical) flask', keywords: 'erlenmeyer conical flask titration chemistry',
  defaults: { w: 22, h: 26, neck: 6, neckH: 6, fill: 0.4, liquid: '#e67e9a' },
  params: [dim('w', 'Base width', 6, 120), dim('h', 'Height', 6, 160), dim('neck', 'Neck width', 1.5, 40), dim('neckH', 'Neck length', 1, 60)],
  profile: p => [[p.neck / 2 + 0.6, 0], [p.neck / 2, 0.8], [p.neck / 2, p.neckH], [p.w / 2 - 1.2, p.h - 1.6], ...arc(p.w / 2 - 1.6, p.h - 1.6, 1.6, -0.3, Math.PI / 2, 6), [0, p.h]],
  center: p => p.h / 2, labelAt: 0.75, marksOpt: { from: 0.45 } });
vessel({ type: 'roundflask', name: 'Round-bottom flask', keywords: 'round bottom flask synthesis reflux chemistry',
  defaults: { r: 10, neck: 5, neckH: 9, fill: 0.45, liquid: '#f2c14e' },
  params: [dim('r', 'Bulb radius', 2, 80), dim('neck', 'Neck width', 1, 30), dim('neckH', 'Neck length', 1, 80)],
  profile: p => { const a = Math.asin(Math.min(0.95, p.neck / 2 / p.r)), cyb = p.neckH + p.r * Math.cos(a); return [[p.neck / 2 + 0.7, 0], [p.neck / 2, 1], [p.neck / 2, p.neckH], ...arc(0, cyb, p.r, -Math.PI / 2 + a, Math.PI / 2, 22)]; },
  center: p => (p.neckH + p.r * 2) / 2, labelAt: 0.7, noText: false, marksOff: true });
vessel({ type: 'volflask', name: 'Volumetric flask', keywords: 'volumetric flask standard solution dilution chemistry',
  defaults: { r: 9, neck: 3.4, neckH: 20, fill: 0.62, liquid: '#7fc8a9', stopper: true, stopperColor: '#3b82c4' },
  params: [dim('r', 'Bulb radius', 2, 80), dim('neck', 'Neck width', 1, 30), dim('neckH', 'Neck length', 2, 120), { key: 'stopper', label: 'Stopper', type: 'bool' }, { key: 'stopperColor', label: 'Stopper colour', type: 'color', show: p => p.stopper }],
  profile: p => { const a = Math.asin(Math.min(0.95, p.neck / 2 / p.r)), cyb = p.neckH + p.r * Math.cos(a), b = Math.PI / 2 - 0.55; const pts = arc(0, cyb, p.r, -Math.PI / 2 + a, b, 20); const last = pts[pts.length - 1]; return [[p.neck / 2 + 0.6, 0], [p.neck / 2, 0.8], [p.neck / 2, p.neckH], ...pts, [last[0] * 0.95, last[1] + 0.25], [0, last[1] + 0.25]]; },
  center: p => (p.neckH + p.r * 1.85) / 2, labelAt: 0.75, marksOff: true, extra: p => [0, p.stopper ? 3 : 0, 0, 0],
  over: (p, S, g) => { let s = ''; const y = p.neckH * 0.45, w = widthAt(g.cavity, y); if (w) s += `<line x1="${n(-p.neck / 2 - 0.1)}" y1="${n(y)}" x2="${n(p.neck / 2 + 0.1)}" y2="${n(y)}" stroke="${S.shaded ? '#2e3a46' : S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    if (p.stopper) s += `<path d="M ${n(-p.neck * 0.75)} ${n(-2.6)} L ${n(p.neck * 0.75)} ${n(-2.6)} L ${n(p.neck * 0.75)} ${n(-1)} L ${n(p.neck * 0.5)} ${n(1.6)} L ${n(-p.neck * 0.5)} ${n(1.6)} L ${n(-p.neck * 0.75)} ${n(-1)} Z" fill="${p.stopperColor}" stroke="${S.shaded ? U.shadeRgb(p.stopperColor, 0.6) : S.ink}" stroke-width="${n(S.lw * 0.8)}"/>`;
    return s; } });
vessel({ type: 'cuvette', name: 'Cuvette', keywords: 'cuvette cell spectroscopy uv vis absorbance fluorescence quartz',
  defaults: { w: 6, h: 22, wall: 0.7, fill: 0.7, liquid: '#e05f5f', capOn: false, capColor: '#2b2f36', frosted: true },
  params: [dim('w', 'Width', 2, 40), dim('h', 'Height', 4, 120), { key: 'frosted', label: 'Frosted sides (shown as a band)', type: 'bool' }, { key: 'capOn', label: 'Cap', type: 'bool' }, { key: 'capColor', label: 'Cap colour', type: 'color', show: p => p.capOn }],
  profile: p => [[p.w / 2, 0], [p.w / 2, p.h], [0, p.h]],
  center: p => p.h / 2, extra: p => [0.4, p.capOn ? 2.6 : 0, 0.4, 0], glassOpt: { white: true },
  over: (p, S) => (p.frosted ? `<rect x="${n(-p.w / 2)}" y="${n(p.h * 0.04)}" width="${n(p.w)}" height="${n(p.h * 0.22)}" fill="#ffffff" fill-opacity="${S.shaded ? 0.55 : 0.8}" stroke="${S.ink}" stroke-opacity="0.3" stroke-width="${n(S.lw * 0.4)}"/>` : '') + (p.capOn ? cap(S, 0, -2.4, p.w + 0.8, 2.6, p.capColor, false) : '') });
vessel({ type: 'vial', name: 'Vial (screw cap)', keywords: 'vial sample bottle screw cap hplc storage',
  defaults: { w: 8, h: 16, fill: 0.55, liquid: '#c47ad6', capColor: '#2f6db5' },
  params: [dim('w', 'Diameter', 2, 60), dim('h', 'Height', 4, 120), { key: 'capColor', label: 'Cap colour', type: 'color' }],
  profile: p => [[p.w / 2 - 1.1, 0], [p.w / 2 - 1.1, 1.6], [p.w / 2, 3], [p.w / 2, p.h - 0.9], ...arc(p.w / 2 - 0.9, p.h - 0.9, 0.9, 0, Math.PI / 2, 4), [0, p.h]],
  center: p => p.h / 2, extra: p => [0, 3.4, 0, 0], labelAt: 0.62,
  over: (p, S) => cap(S, 0, -3.2, p.w - 0.6, 4, p.capColor) });
vessel({ type: 'bottle', name: 'Reagent bottle', keywords: 'reagent bottle chemical stock solution amber storage',
  defaults: { w: 16, h: 26, neck: 7, fill: 0.7, liquid: '#d9d9d9', liqAlpha: 0.45, capColor: '#2f6db5', amber: false, text: 'NaCl' },
  params: [dim('w', 'Width', 4, 120), dim('h', 'Height', 6, 160), dim('neck', 'Neck width', 1.5, 40), { key: 'amber', label: 'Amber glass', type: 'bool' }, { key: 'capColor', label: 'Cap colour', type: 'color' }],
  profile: p => [[p.neck / 2, 0], [p.neck / 2, 2.2], [p.w / 2 - 0.3, 2.2 + p.w * 0.22], [p.w / 2, 2.6 + p.w * 0.25], [p.w / 2, p.h - 1.2], ...arc(p.w / 2 - 1.2, p.h - 1.2, 1.2, 0, Math.PI / 2, 5), [0, p.h]],
  center: p => p.h / 2, extra: p => [0, 4.4, 0, 0], labelAt: 0.6, marksOff: true,
  over: (p, S) => cap(S, 0, -4.2, p.neck + 1.2, 4.6, p.capColor) });
vessel({ type: 'microtube', name: 'Microcentrifuge tube (1.5 mL)', keywords: 'eppendorf microcentrifuge tube 1.5 ml sample biology pcr',
  defaults: { w: 7, h: 26, wall: 0.4, fill: 0.45, liquid: '#f5d76e', tint: '#ffffff', capColor: '#f5f5f5', open: false },
  params: [dim('w', 'Diameter', 2, 30), dim('h', 'Length', 6, 100), { key: 'capColor', label: 'Cap colour', type: 'color' }, { key: 'open', label: 'Lid open', type: 'bool' }],
  profile: p => [[p.w / 2 + 0.5, 0], [p.w / 2, 0.8], [p.w / 2, p.h * 0.52], [p.w * 0.17, p.h * 0.95], ...arc(0, p.h * 0.95, p.w * 0.17, 0, Math.PI / 2, 4)],
  center: p => p.h / 2, extra: p => [0, 2.4, p.open ? p.w * 0.9 : 1.4, 0], labelAt: 0.3, marksOff: true,
  over: (p, S) => {
    const c = p.capColor, st = S.shaded ? U.shadeRgb(c, 0.6) : S.ink, lw = n(S.lw * 0.8);
    if (p.open) return `<path d="M ${n(p.w / 2 + 0.4)} ${n(0)} q ${n(p.w * 0.3)} ${n(-1.6)} ${n(p.w * 0.85)} ${n(-0.4)} l 0 ${n(1.6)} q ${n(-p.w * 0.4)} ${n(-0.6)} ${n(-p.w * 0.85)} ${n(0.4)} Z" fill="${c}" stroke="${st}" stroke-width="${lw}"/>`;
    return `<rect x="${n(-p.w / 2 - 0.7)}" y="${n(-1.9)}" width="${n(p.w + 1.4)}" height="${n(1.9)}" rx="0.5" fill="${c}" stroke="${st}" stroke-width="${lw}"/><path d="M ${n(p.w / 2 + 0.7)} ${n(-1.2)} q ${n(0.9)} ${n(0.2)} ${n(0.9)} ${n(1.4)} l ${n(-0.6)} 0" fill="none" stroke="${st}" stroke-width="${lw}"/>`;
  } });
vessel({ type: 'falcon', name: 'Conical centrifuge tube (15 / 50 mL)', keywords: 'falcon conical centrifuge tube 15 ml 50 ml cell culture biology',
  defaults: { w: 9, h: 36, wall: 0.4, fill: 0.5, liquid: '#f08080', liqAlpha: 0.6, capColor: '#2f6db5', marks: 10 },
  params: [dim('w', 'Diameter', 2, 60), dim('h', 'Length', 6, 200), { key: 'capColor', label: 'Cap colour', type: 'color' }],
  profile: p => [[p.w / 2, 0], [p.w / 2, p.h * 0.82], [p.w * 0.1, p.h], [0, p.h]],
  center: p => p.h / 2, extra: p => [0.4, 4, 0.4, 0], labelAt: 0.4, marksOpt: { from: 0.1, to: 0.2 },
  over: (p, S) => cap(S, 0, -3.8, p.w + 0.9, 4, p.capColor) });
vessel({ type: 'burette', name: 'Burette', keywords: 'burette titration stopcock analytical chemistry',
  defaults: { w: 3, h: 50, wall: 0.35, fill: 0.7, liquid: '#5aa9e6', marks: 25, drip: true },
  params: [dim('w', 'Tube width', 1, 20), dim('h', 'Tube length', 10, 250), { key: 'drip', label: 'Drop at the tip', type: 'bool' }],
  profile: p => [[p.w / 2, 0], [p.w / 2, p.h], [p.w * 0.3, p.h + 1.2], [p.w * 0.3, p.h + 3.5], [p.w * 0.16, p.h + 6.5]],
  center: p => (p.h + 6.5) / 2, extra: p => [2.4, 0, 2.6, p.drip ? 2 : 0], marksOpt: { from: 0.02, to: 0.16 }, glassOpt: { hiEnd: 0.8 },
  over: (p, S, g) => { const y = p.h + 2.2, c = S.shaded ? '#d8dde3' : '#fff'; let s = `<rect x="${n(-p.w * 0.9)}" y="${n(y - 0.9)}" width="${n(p.w * 1.8)}" height="${n(1.8)}" rx="0.5" fill="${c}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.8)}"/><rect x="${n(p.w * 0.9)}" y="${n(y - 0.35)}" width="${n(2.3)}" height="${n(0.7)}" rx="0.3" fill="${S.shaded ? '#2f6db5' : '#fff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    if (p.drip && p.fill > 0) s += `<path d="M 0 ${n(p.h + 7.2)} q 0.75 1.1 0 1.5 q -0.75 -0.4 0 -1.5 Z" fill="${p.liquid}" fill-opacity="${p.liqAlpha}" stroke="${U.shadeRgb(p.liquid, 0.6)}" stroke-width="${n(S.lw * 0.4)}"/>`;
    return s; } });
vessel({ type: 'funnel', name: 'Funnel (with filter paper)', keywords: 'funnel filtration filter paper chemistry',
  defaults: { w: 16, h: 12, stem: 2.2, stemH: 10, wall: 0.45, fill: 0, paper: true },
  params: [dim('w', 'Top width', 4, 120), dim('h', 'Cone height', 3, 100), dim('stem', 'Stem width', 0.5, 20), dim('stemH', 'Stem length', 0, 100), { key: 'paper', label: 'Filter paper', type: 'bool' }],
  profile: p => [[p.w / 2 + 0.5, 0], [p.w / 2, 0.6], [p.stem / 2, p.h], [p.stem / 2, p.h + p.stemH]],
  center: p => (p.h + p.stemH) / 2, marksOff: true,
  inside: (p, S) => p.paper ? `<path d="M ${n(-p.w * 0.47)} ${n(-0.6)} L 0 ${n(p.h * 0.92)} L ${n(p.w * 0.47)} ${n(-0.6)} Z" fill="#ffffff" fill-opacity="${S.shaded ? 0.85 : 1}" stroke="${S.ink}" stroke-opacity="0.55" stroke-width="${n(S.lw * 0.5)}" stroke-dasharray="${n(S.lw * 2)} ${n(S.lw * 1.4)}"/>` : '' });
vessel({ type: 'petri', name: 'Petri dish (side)', keywords: 'petri dish agar culture cells bacteria biology',
  defaults: { w: 26, h: 4, wall: 0.4, fill: 0.6, liquid: '#e9d38c', liqAlpha: 0.9, meniscus: false, lid: true },
  params: [dim('w', 'Diameter', 4, 200), dim('h', 'Height', 1, 40), { key: 'lid', label: 'Lid', type: 'bool' }],
  profile: p => [[p.w / 2, 0], [p.w / 2, p.h], [0, p.h]],
  center: p => p.h / 2, extra: p => [0.8, p.lid ? 1.6 : 0, 0.8, 0], marksOff: true, noText: true, glassOpt: { noHighlight: true },
  over: (p, S) => p.lid ? `<path d="M ${n(-p.w / 2 - 0.8)} ${n(p.h * 0.55)} L ${n(-p.w / 2 - 0.8)} ${n(-1.2)} L ${n(p.w / 2 + 0.8)} ${n(-1.2)} L ${n(p.w / 2 + 0.8)} ${n(p.h * 0.55)}" fill="none" stroke="${S.shaded ? '#5b7a95' : S.ink}" stroke-width="${n(S.lw * 0.9)}"/>` : '' });

/* ================= non-vessel labware ================= */
const ann = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));
const stroke = (S, c) => (S.shaded ? U.shadeRgb(c, 0.55) : S.ink);
const body = (S, c) => (S.shaded ? c : U.lighten(c, 0.3));

ann({ type: 'micropipette', name: 'Micropipette', keywords: 'micropipette pipette pipettor eppendorf gilson tip volume transfer biology chemistry',
  defaults: { L: 46, color: '#d7dde4', accent: '#2f6db5', volume: '200 µL', tip: true, tipFill: 0.4, liquid: '#5aa9e6', drop: true, angle: 0 },
  params: [dim('L', 'Length', 15, 200), { key: 'color', label: 'Body colour', type: 'color' }, { key: 'accent', label: 'Plunger colour', type: 'color' }, { key: 'volume', label: 'Volume on the display', type: 'text' },
    { key: 'tip', label: 'Tip', type: 'bool' }, { key: 'tipFill', label: 'Liquid in the tip', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.tip },
    { key: 'liquid', label: 'Liquid colour', type: 'color', show: p => p.tip }, { key: 'drop', label: 'Drop at the tip', type: 'bool', show: p => p.tip }],
  bbox: p => { const k = p.L / 46; return [-6 * k, -23 * k, 6.5 * k, (p.tip ? 34 : 18) * k]; },
  draw(p, S, obj) {
    const k = p.L / 46, uid = idOf(obj, p, 'mp'), c = p.color, lw = n(S.lw * 0.8), st = stroke(S, c), s0 = v => n(v * k);
    let s = `<g>`;
    // plunger button and rod
    s += `<rect x="${s0(-2.2)}" y="${s0(-23)}" width="${s0(4.4)}" height="${s0(2.6)}" rx="${s0(1)}" fill="${body(S, p.accent)}" stroke="${stroke(S, p.accent)}" stroke-width="${lw}"/><rect x="${s0(-0.8)}" y="${s0(-20.6)}" width="${s0(1.6)}" height="${s0(3)}" fill="${body(S, '#9aa3ad')}" stroke="${st}" stroke-width="${lw}"/>`;
    // body with finger hook and display
    s += `<path d="M ${s0(-3.3)} ${s0(-17.8)} Q ${s0(-3.6)} ${s0(-19)} ${s0(-2)} ${s0(-19)} L ${s0(2.2)} ${s0(-19)} Q ${s0(3.6)} ${s0(-19)} ${s0(3.4)} ${s0(-17.5)} L ${s0(2.8)} ${s0(4)} L ${s0(1.8)} ${s0(7)} L ${s0(-1.8)} ${s0(7)} L ${s0(-2.8)} ${s0(4)} Z" fill="${S.shaded ? `url(#${uid}-b)` : body(S, c)}" stroke="${st}" stroke-width="${lw}"/>`;
    s += `<path d="M ${s0(3.3)} ${s0(-14)} q ${s0(3.4)} ${s0(0.4)} ${s0(3.2)} ${s0(3.2)} q ${s0(-1.6)} ${s0(-1.2)} ${s0(-3.4)} ${s0(-0.8)} Z" fill="${body(S, c)}" stroke="${st}" stroke-width="${lw}"/>`;
    s += `<rect x="${s0(-1.9)}" y="${s0(-12)}" width="${s0(3.8)}" height="${s0(4.2)}" rx="${s0(0.4)}" fill="${S.shaded ? '#203040' : '#fff'}" stroke="${st}" stroke-width="${n(S.lw * 0.6)}"/><text x="0" y="${s0(-9.9)}" font-family="${U.esc(S.font)}" font-size="${s0(1.25)}" text-anchor="middle" dominant-baseline="central" fill="${S.shaded ? '#9fe6ff' : '#111'}" transform="rotate(-90 0 ${s0(-9.9)})">${U.esc(p.volume || '')}</text>`;
    // shaft and tip ejector
    s += `<path d="M ${s0(-1.2)} ${s0(7)} L ${s0(-0.8)} ${s0(17)} L ${s0(0.8)} ${s0(17)} L ${s0(1.2)} ${s0(7)} Z" fill="${body(S, '#c9ced6')}" stroke="${st}" stroke-width="${lw}"/><rect x="${s0(1.2)}" y="${s0(6)}" width="${s0(0.9)}" height="${s0(8)}" fill="${body(S, c)}" stroke="${st}" stroke-width="${n(S.lw * 0.6)}"/>`;
    if (p.tip) {
      const tip = [[-0.95, 16.4], [0.95, 16.4], [0.12, 33.5], [-0.12, 33.5]], yl = 33.5 - p.tipFill * 15;
      s += `<defs><clipPath id="${uid}-t"><path d="${P(tip.map(q => [q[0] * k, q[1] * k]))} Z"/></clipPath>${S.shaded ? `<linearGradient id="${uid}-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${U.shadeRgb(c, 0.8)}"/><stop offset="0.35" stop-color="${U.lighten(c, 0.25)}"/><stop offset="1" stop-color="${U.shadeRgb(c, 0.75)}"/></linearGradient>` : ''}</defs>`;
      s += `<path d="${P(tip.map(q => [q[0] * k, q[1] * k]))} Z" fill="${S.shaded ? '#f3f8fb' : '#fff'}" fill-opacity="${S.shaded ? 0.7 : 1}"/>`;
      if (p.tipFill > 0) s += `<rect x="${s0(-1)}" y="${s0(yl)}" width="${s0(2)}" height="${s0(33.6 - yl)}" fill="${p.liquid}" fill-opacity="0.8" clip-path="url(#${uid}-t)"/>`;
      s += `<path d="${P(tip.map(q => [q[0] * k, q[1] * k]))} Z" fill="none" stroke="${S.shaded ? '#7d93a6' : S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
      if (p.drop && p.tipFill > 0) s += `<path d="M 0 ${s0(33.7)} q ${s0(0.8)} ${s0(1.2)} 0 ${s0(1.7)} q ${s0(-0.8)} ${s0(-0.5)} 0 ${s0(-1.7)} Z" fill="${p.liquid}" stroke="${U.shadeRgb(p.liquid, 0.6)}" stroke-width="${n(S.lw * 0.4)}"/>`;
    } else if (S.shaded) s += `<defs><linearGradient id="${uid}-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${U.shadeRgb(c, 0.8)}"/><stop offset="0.35" stop-color="${U.lighten(c, 0.25)}"/><stop offset="1" stop-color="${U.shadeRgb(c, 0.75)}"/></linearGradient></defs>`;
    return s + '</g>';
  } });
ann({ type: 'pasteur', name: 'Pasteur pipette (dropper)', keywords: 'pasteur pipette dropper bulb transfer drop',
  defaults: { L: 34, bulb: '#d64541', fill: 0.35, liquid: '#5aa9e6', drop: true },
  params: [dim('L', 'Length', 10, 150), { key: 'bulb', label: 'Bulb colour', type: 'color' }, { key: 'fill', label: 'Liquid in it', type: 'range', min: 0, max: 1, step: 0.01 }, { key: 'liquid', label: 'Liquid colour', type: 'color' }, { key: 'drop', label: 'Drop at the tip', type: 'bool' }],
  bbox: p => { const k = p.L / 34; return [-2.6 * k, -17 * k, 2.6 * k, 19 * k]; },
  draw(p, S, obj) {
    const k = p.L / 34, s0 = v => n(v * k), uid = idOf(obj, p, 'pp');
    const tube = [[-1, -7], [1, -7], [1, 4], [0.25, 16.5], [-0.25, 16.5], [-1, 4]].map(q => [q[0] * k, q[1] * k]), yl = 16.5 - p.fill * 22;
    let s = `<defs><clipPath id="${uid}-c"><path d="${P(tube)} Z"/></clipPath></defs>`;
    s += `<path d="${P(tube)} Z" fill="${S.shaded ? '#eef6fb' : '#fff'}" fill-opacity="${S.shaded ? 0.75 : 1}"/>`;
    if (p.fill > 0) s += `<rect x="${s0(-1.2)}" y="${s0(yl)}" width="${s0(2.4)}" height="${s0(16.6 - yl)}" fill="${p.liquid}" fill-opacity="0.8" clip-path="url(#${uid}-c)"/>`;
    s += `<path d="${P(tube)} Z" fill="none" stroke="${S.shaded ? '#6f8aa0' : S.ink}" stroke-width="${n(S.lw * 0.7)}"/>`;
    s += `<path d="M ${s0(-1.3)} ${s0(-7)} L ${s0(-1.3)} ${s0(-9)} Q ${s0(-2.6)} ${s0(-11)} ${s0(-2.4)} ${s0(-13.5)} Q ${s0(-2)} ${s0(-17)} 0 ${s0(-17)} Q ${s0(2)} ${s0(-17)} ${s0(2.4)} ${s0(-13.5)} Q ${s0(2.6)} ${s0(-11)} ${s0(1.3)} ${s0(-9)} L ${s0(1.3)} ${s0(-7)} Z" fill="${body(S, p.bulb)}" stroke="${stroke(S, p.bulb)}" stroke-width="${n(S.lw * 0.8)}"/>`;
    if (S.shaded) s += `<ellipse cx="${s0(-0.9)}" cy="${s0(-13.6)}" rx="${s0(0.5)}" ry="${s0(1.8)}" fill="#ffffff" fill-opacity="0.35"/>`;
    if (p.drop && p.fill > 0) s += `<path d="M 0 ${s0(16.8)} q ${s0(0.8)} ${s0(1.2)} 0 ${s0(1.7)} q ${s0(-0.8)} ${s0(-0.5)} 0 ${s0(-1.7)} Z" fill="${p.liquid}" stroke="${U.shadeRgb(p.liquid, 0.6)}" stroke-width="${n(S.lw * 0.4)}"/>`;
    return s;
  } });
ann({ type: 'syringe', name: 'Syringe', keywords: 'syringe needle injection plunger luer dose',
  defaults: { L: 40, w: 5, fill: 0.6, liquid: '#5aa9e6', needle: true, marks: 10, plunger: '#2b2f36' },
  params: [dim('L', 'Barrel length', 8, 200), dim('w', 'Barrel width', 1.5, 40), { key: 'fill', label: 'Filled', type: 'range', min: 0, max: 1, step: 0.01, animatable: true }, { key: 'liquid', label: 'Liquid colour', type: 'color' },
    { key: 'needle', label: 'Needle', type: 'bool' }, { key: 'marks', label: 'Graduation marks', type: 'number', min: 0, max: 40, step: 1 }, { key: 'plunger', label: 'Plunger colour', type: 'color' }],
  bbox: p => [-p.L / 2 - p.L * 0.55 - 2, -p.w / 2 - 1.2, p.L / 2 + 3 + (p.needle ? p.L * 0.45 : 0), p.w / 2 + 1.2],
  draw(p, S, obj) {
    const L = p.L, w = p.w, x0 = -L / 2, x1 = L / 2, xp = x1 - p.fill * L, uid = idOf(obj, p, 'sy'), gs = S.shaded ? '#6f8aa0' : S.ink;
    let s = '';
    // plunger rod and thumb rest, then the rubber stopper
    s += `<rect x="${n(xp - L * 0.55)}" y="${n(-w * 0.12)}" width="${n(L * 0.55)}" height="${n(w * 0.24)}" fill="${body(S, '#cfd5dc')}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/><rect x="${n(xp - L * 0.55 - 1)}" y="${n(-w * 0.62)}" width="1" height="${n(w * 1.24)}" rx="0.3" fill="${body(S, '#cfd5dc')}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`;
    s += `<rect x="${n(x0)}" y="${n(-w / 2)}" width="${n(L)}" height="${n(w)}" fill="${S.shaded ? '#eef6fb' : '#fff'}" fill-opacity="${S.shaded ? 0.7 : 1}"/>`;
    if (p.fill > 0) s += `<rect x="${n(xp)}" y="${n(-w / 2)}" width="${n(x1 - xp)}" height="${n(w)}" fill="${p.liquid}" fill-opacity="0.75"/>`;
    s += `<rect x="${n(xp - 1.2)}" y="${n(-w / 2)}" width="1.2" height="${n(w)}" fill="${body(S, p.plunger)}" stroke="${stroke(S, p.plunger)}" stroke-width="${n(S.lw * 0.6)}"/>`;
    for (let i = 1; i < (p.marks | 0); i++) { const x = x1 - L * i / p.marks; s += `<line x1="${n(x)}" y1="${n(-w / 2)}" x2="${n(x)}" y2="${n(-w / 2 + (i % 5 ? w * 0.18 : w * 0.32))}" stroke="${S.ink}" stroke-opacity="0.7" stroke-width="${n(S.lw * 0.45)}"/>`; }
    s += `<rect x="${n(x0)}" y="${n(-w / 2)}" width="${n(L)}" height="${n(w)}" fill="none" stroke="${gs}" stroke-width="${n(S.lw * 0.9)}"/><rect x="${n(x0 - 0.8)}" y="${n(-w / 2 - 1)}" width="0.8" height="${n(w + 2)}" rx="0.3" fill="${S.shaded ? '#dce6ee' : '#fff'}" stroke="${gs}" stroke-width="${n(S.lw * 0.8)}"/>`;
    s += `<path d="M ${n(x1)} ${n(-w * 0.22)} L ${n(x1 + 2.2)} ${n(-w * 0.12)} L ${n(x1 + 2.2)} ${n(w * 0.12)} L ${n(x1)} ${n(w * 0.22)} Z" fill="${S.shaded ? '#dce6ee' : '#fff'}" stroke="${gs}" stroke-width="${n(S.lw * 0.7)}"/>`;
    if (p.needle) s += `<line x1="${n(x1 + 2.2)}" y1="0" x2="${n(x1 + 2.2 + L * 0.45)}" y2="0" stroke="${S.shaded ? '#8d959f' : S.ink}" stroke-width="${n(Math.max(S.lw * 0.6, w * 0.06))}" stroke-linecap="round"/>`;
    if (S.shaded) s += `<rect x="${n(x0 + 0.5)}" y="${n(-w * 0.36)}" width="${n(L - 1)}" height="${n(w * 0.1)}" fill="#ffffff" fill-opacity="0.5"/>`;
    void uid;
    return s;
  } });
ann({ type: 'wellplate', name: 'Well plate (6 / 24 / 96)', keywords: 'well plate microplate 96 well 24 well 6 well elisa assay cell culture',
  defaults: { rows: 8, cols: 12, w: 54, view: 'top', plate: '#f4f6f8', fillMode: 'gradient', color1: '#fde0dd', color2: '#c51b8a', wells: '', labels: true },
  params: [{ key: 'rows', label: 'Rows', type: 'number', min: 1, max: 32, step: 1 }, { key: 'cols', label: 'Columns', type: 'number', min: 1, max: 48, step: 1 }, dim('w', 'Width', 10, 300),
    { key: 'view', label: 'View', type: 'select', options: [['top', 'From above'], ['tilt', 'Tilted']] },
    { key: 'fillMode', label: 'Wells', type: 'select', options: [['gradient', 'Dilution series (colour 1 → 2 along the columns)'], ['rows', 'One colour per row (from 1 to 2)'], ['list', 'Listed wells only'], ['empty', 'Empty']] },
    { key: 'color1', label: 'Colour 1', type: 'color', show: p => p.fillMode !== 'empty' }, { key: 'color2', label: 'Colour 2', type: 'color', show: p => p.fillMode === 'gradient' || p.fillMode === 'rows' || p.fillMode === 'list' },
    { key: 'wells', label: 'Listed wells', type: 'text', show: p => p.fillMode === 'list', hint: 'e.g. A1-A6, B3, C1-C12; or A1=#ff0000' },
    { key: 'plate', label: 'Plate colour', type: 'color' }, { key: 'labels', label: 'Row and column labels', type: 'bool' }],
  geom(p) { const W = p.w, Hh = W * 0.665, tilt = p.view === 'tilt' ? 0.55 : 1; return { W, Hh, tilt }; },
  bbox(p) { const g = this.geom(p); return [-g.W / 2 - 2, -g.Hh * g.tilt / 2 - 2.5, g.W / 2 + 2, g.Hh * g.tilt / 2 + (p.view === 'tilt' ? 3 : 2)]; },
  draw(p, S) {
    const g = this.geom(p), W = g.W, Hh = g.Hh, t = g.tilt, rows = Math.max(1, p.rows | 0), cols = Math.max(1, p.cols | 0);
    const mx = W * 0.09, my = Hh * 0.11, px = (W - 2 * mx) / cols, py = (Hh - 2 * my) / rows, r = Math.min(px, py) * 0.4;
    const Y = y => y * t, colOf = (i, j) => {
      const mix = (a, b, u) => { const A = U.hexToRgb(a), B = U.hexToRgb(b); return '#' + [0, 1, 2].map(k => Math.round(A[k] + (B[k] - A[k]) * u).toString(16).padStart(2, '0')).join(''); };
      if (p.fillMode === 'empty') return null;
      if (p.fillMode === 'gradient') return mix(p.color1, p.color2, cols > 1 ? j / (cols - 1) : 1);
      if (p.fillMode === 'rows') return mix(p.color1, p.color2, rows > 1 ? i / (rows - 1) : 1);
      return listed[String.fromCharCode(65 + i) + (j + 1)] || null;
    };
    const listed = {};
    if (p.fillMode === 'list') String(p.wells || '').split(/[,;]+/).forEach(tok => { const m = tok.trim().match(/^([A-Za-z])(\d+)(?:\s*-\s*([A-Za-z])?(\d+))?(?:\s*=\s*(#[0-9a-fA-F]{3,6}))?$/); if (!m) return;
      const r0 = m[1].toUpperCase().charCodeAt(0) - 65, c0 = +m[2] - 1, r1 = m[3] ? m[3].toUpperCase().charCodeAt(0) - 65 : r0, c1 = m[4] ? +m[4] - 1 : c0;
      for (let i = Math.min(r0, r1); i <= Math.max(r0, r1); i++) for (let j = Math.min(c0, c1); j <= Math.max(c0, c1); j++) listed[String.fromCharCode(65 + i) + (j + 1)] = m[5] || p.color2; });
    let s = '';
    if (p.view === 'tilt') s += `<path d="M ${n(-W / 2)} ${n(Y(Hh / 2))} L ${n(-W / 2)} ${n(Y(Hh / 2) + 2.6)} L ${n(W / 2)} ${n(Y(Hh / 2) + 2.6)} L ${n(W / 2)} ${n(Y(Hh / 2))} Z" fill="${S.shaded ? U.shadeRgb(p.plate, 0.78) : '#fff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.8)}"/>`;
    const c = Math.min(W, Hh) * 0.06;
    s += `<path d="M ${n(-W / 2 + c)} ${n(Y(-Hh / 2))} L ${n(W / 2)} ${n(Y(-Hh / 2))} L ${n(W / 2)} ${n(Y(Hh / 2))} L ${n(-W / 2)} ${n(Y(Hh / 2))} L ${n(-W / 2)} ${n(Y(-Hh / 2 + c))} Z" fill="${S.shaded ? p.plate : '#fff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.9)}"/>`;
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) {
      const x = -W / 2 + mx + (j + 0.5) * px, y = Y(-Hh / 2 + my + (i + 0.5) * py), f = colOf(i, j);
      s += `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r)}" ry="${n(r * t)}" fill="${S.shaded ? U.shadeRgb(p.plate, 0.86) : '#fff'}" stroke="${S.ink}" stroke-opacity="0.75" stroke-width="${n(S.lw * 0.5)}"/>`;
      if (f) s += `<ellipse cx="${n(x)}" cy="${n(y + (p.view === 'tilt' ? r * 0.15 : 0))}" rx="${n(r * 0.82)}" ry="${n(r * 0.82 * t)}" fill="${f}"/>` + (S.shaded ? `<ellipse cx="${n(x - r * 0.25)}" cy="${n(y - r * 0.25 * t)}" rx="${n(r * 0.22)}" ry="${n(r * 0.14 * t)}" fill="#ffffff" fill-opacity="0.55"/>` : '');
    }
    if (p.labels) {
      const fs = Math.min(py * t * 0.55, px * 0.55, S.fs);
      for (let i = 0; i < rows; i++) s += `<text x="${n(-W / 2 + mx * 0.45)}" y="${n(Y(-Hh / 2 + my + (i + 0.5) * py))}" font-family="${U.esc(S.font)}" font-size="${n(fs)}" text-anchor="middle" dominant-baseline="central" fill="${S.ink}">${String.fromCharCode(65 + i)}</text>`;
      for (let j = 0; j < cols; j++) s += `<text x="${n(-W / 2 + mx + (j + 0.5) * px)}" y="${n(Y(-Hh / 2 + my * 0.5))}" font-family="${U.esc(S.font)}" font-size="${n(fs)}" text-anchor="middle" dominant-baseline="central" fill="${S.ink}">${j + 1}</text>`;
    }
    return s;
  },
  variants: [{ name: '24-well plate', props: { rows: 4, cols: 6 } }, { name: '6-well plate', props: { rows: 2, cols: 3, fillMode: 'list', wells: 'A1-A3=#f4a3b5, B1-B3=#9ad0f5' } }] });
ann({ type: 'petritop', name: 'Petri dish (top view, colonies)', keywords: 'petri dish agar plate colonies bacteria culture top view',
  defaults: { d: 26, medium: '#efd98f', colonies: 18, colony: '#f7f2e0', seed: 3, tilt: 1 },
  params: [dim('d', 'Diameter', 4, 200), { key: 'medium', label: 'Medium colour', type: 'color' }, { key: 'colonies', label: 'Colonies', type: 'number', min: 0, max: 400, step: 1 }, { key: 'colony', label: 'Colony colour', type: 'color', show: p => p.colonies > 0 },
    { key: 'seed', label: 'Pattern', type: 'number', min: 1, max: 999, step: 1, show: p => p.colonies > 0 }, { key: 'tilt', label: 'View (1 = from above)', type: 'range', min: 0.3, max: 1, step: 0.01 }],
  bbox: p => [-p.d / 2 - 0.6, -p.d * p.tilt / 2 - 0.6, p.d / 2 + 0.6, p.d * p.tilt / 2 + 0.6 + (p.tilt < 1 ? 1.4 : 0)],
  draw(p, S) {
    const R = p.d / 2, t = p.tilt, r = rnd(p.seed * 97 + 5);
    let s = t < 1 ? `<path d="M ${n(-R)} 0 L ${n(-R)} 1.4 A ${n(R)} ${n(R * t)} 0 0 0 ${n(R)} 1.4 L ${n(R)} 0 Z" fill="${S.shaded ? U.shadeRgb(p.medium, 0.8) : '#fff'}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.8)}"/>` : '';
    s += `<ellipse cx="0" cy="0" rx="${n(R)}" ry="${n(R * t)}" fill="${S.shaded ? '#f5fafd' : '#fff'}" stroke="${S.shaded ? '#6f8aa0' : S.ink}" stroke-width="${n(S.lw * 0.9)}"/><ellipse cx="0" cy="0" rx="${n(R * 0.94)}" ry="${n(R * 0.94 * t)}" fill="${p.medium}" fill-opacity="${S.shaded ? 0.9 : 0.6}"/>`;
    for (let i = 0; i < (p.colonies | 0); i++) { const a = r() * 2 * Math.PI, q = Math.sqrt(r()) * R * 0.85, cr = 0.35 + r() * R * 0.05; s += `<ellipse cx="${n(q * Math.cos(a))}" cy="${n(q * Math.sin(a) * t)}" rx="${n(cr)}" ry="${n(cr * t)}" fill="${p.colony}" stroke="${U.shadeRgb(p.colony, 0.7)}" stroke-width="${n(S.lw * 0.35)}"/>`; }
    if (S.shaded) s += `<path d="M ${n(-R * 0.7)} ${n(-R * 0.55 * t)} A ${n(R * 0.9)} ${n(R * 0.9 * t)} 0 0 1 ${n(R * 0.2)} ${n(-R * 0.88 * t)}" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="${n(R * 0.05)}" stroke-linecap="round"/>`;
    return s;
  } });
ann({ type: 'tuberack', name: 'Test-tube rack', keywords: 'test tube rack series samples dilution colours',
  defaults: { count: 5, w: 5, h: 22, colors: '#fde0dd, #fa9fb5, #f768a1, #c51b8a, #7a0177', fill: 0.55, rack: '#cfd8e3' },
  params: [{ key: 'count', label: 'Tubes', type: 'number', min: 1, max: 20, step: 1 }, dim('w', 'Tube diameter', 1.5, 30), dim('h', 'Tube length', 5, 120),
    { key: 'colors', label: 'Liquid colours (comma separated)', type: 'text' }, { key: 'fill', label: 'Filled', type: 'range', min: 0, max: 1, step: 0.01 }, { key: 'rack', label: 'Rack colour', type: 'color' }],
  bbox: p => { const W = p.count * p.w * 1.7 + 3; return [-W / 2, -p.h / 2 - 1, W / 2, p.h / 2 + 1.5]; },
  draw(p, S, obj) {
    const cols = String(p.colors || '').split(',').map(q => q.trim()).filter(q => /^#/.test(q)), N = Math.max(1, p.count | 0), gap = p.w * 1.7, W = N * gap + 3, tt = lib.get('testtube');
    let s = '';
    for (let i = 0; i < N; i++) {
      const x = -W / 2 + 1.5 + (i + 0.5) * gap, tp = Object.assign({}, tt.defaults, { w: p.w, h: p.h, fill: p.fill, liquid: cols[i % Math.max(1, cols.length)] || '#5aa9e6', meniscus: true });
      s += `<g transform="translate(${n(x)} 0)">${tt.draw(tp, S, obj ? { id: obj.id + '-' + i } : null)}</g>`;
    }
    const rc = p.rack, st = S.shaded ? U.shadeRgb(rc, 0.6) : S.ink;
    s += `<rect x="${n(-W / 2)}" y="${n(-p.h * 0.18)}" width="${n(W)}" height="${n(p.h * 0.1)}" rx="0.4" fill="${body(S, rc)}" fill-opacity="0.92" stroke="${st}" stroke-width="${n(S.lw * 0.8)}"/>`;
    s += `<rect x="${n(-W / 2)}" y="${n(p.h / 2 - 0.2)}" width="${n(W)}" height="1.6" rx="0.4" fill="${body(S, rc)}" stroke="${st}" stroke-width="${n(S.lw * 0.8)}"/>`;
    s += `<rect x="${n(-W / 2)}" y="${n(-p.h * 0.18)}" width="1" height="${n(p.h * 0.68 + 1.4)}" fill="${body(S, rc)}" stroke="${st}" stroke-width="${n(S.lw * 0.8)}"/><rect x="${n(W / 2 - 1)}" y="${n(-p.h * 0.18)}" width="1" height="${n(p.h * 0.68 + 1.4)}" fill="${body(S, rc)}" stroke="${st}" stroke-width="${n(S.lw * 0.8)}"/>`;
    return s;
  } });
ann({ type: 'condenser', name: 'Liebig condenser', keywords: 'condenser liebig reflux distillation cooling water jacket',
  defaults: { L: 40, w: 7, water: '#7cc4ef', arrows: true },
  params: [dim('L', 'Length', 10, 200), dim('w', 'Jacket width', 2, 40), { key: 'water', label: 'Cooling water colour', type: 'color' }, { key: 'arrows', label: 'Water in / out arrows', type: 'bool' }],
  bbox: p => [-p.w / 2 - 6, -p.L / 2 - 3, p.w / 2 + 6, p.L / 2 + 3],
  draw(p, S) {
    const L = p.L, w = p.w, gs = S.shaded ? '#5b7a95' : S.ink, gf = S.shaded ? 'url(#rbx-glass)' : '#fff', lw = n(S.lw * 0.9);
    let s = `<rect x="${n(-w / 2)}" y="${n(-L / 2 + 2)}" width="${n(w)}" height="${n(L - 4)}" rx="${n(w * 0.3)}" fill="${gf}" stroke="${gs}" stroke-width="${lw}"/>`;
    s += `<rect x="${n(-w / 2 + 0.6)}" y="${n(-L / 2 + 2.6)}" width="${n(w - 1.2)}" height="${n(L - 5.2)}" rx="${n(w * 0.25)}" fill="${p.water}" fill-opacity="${S.shaded ? 0.45 : 0.35}"/>`;
    s += `<rect x="${n(-w * 0.16)}" y="${n(-L / 2 - 2)}" width="${n(w * 0.32)}" height="${n(L + 4)}" fill="${S.shaded ? '#f4f9fc' : '#fff'}" stroke="${gs}" stroke-width="${lw}"/>`;
    const port = (y, side) => `<rect x="${n(side > 0 ? w / 2 - 0.2 : -w / 2 - 3.8)}" y="${n(y - 0.8)}" width="4" height="1.6" fill="${gf}" stroke="${gs}" stroke-width="${lw}"/>`;
    s += port(L / 2 - 5, 1) + port(-L / 2 + 5, -1);
    if (p.arrows) {
      const col = U.shadeRgb(p.water, 0.6);
      s += H.arrowHead(w / 2 + 3.8 - 4.6, L / 2 - 5, Math.PI, 1.2, col) + `<line x1="${n(w / 2 + 3.8)}" y1="${n(L / 2 - 5)}" x2="${n(w / 2 + 5.6)}" y2="${n(L / 2 - 5)}" stroke="${col}" stroke-width="${lw}"/>`;
      s += `<line x1="${n(-w / 2 - 3.8)}" y1="${n(-L / 2 + 5)}" x2="${n(-w / 2 - 5.6)}" y2="${n(-L / 2 + 5)}" stroke="${col}" stroke-width="${lw}"/>` + H.arrowHead(-w / 2 - 5.8, -L / 2 + 5, Math.PI, 1.2, col);
    }
    if (S.shaded) s += `<rect x="${n(-w / 2 + w * 0.12)}" y="${n(-L / 2 + 3)}" width="${n(w * 0.08)}" height="${n(L - 6)}" fill="#ffffff" fill-opacity="0.5"/>`;
    return s;
  } });

/* ================= fluid tubing ================= */
const sampleRoute = (g, k = 60) => {
  if (g.pts.length === 4 && /C/.test(g.d)) { const [a, b, c, d] = g.pts, out = []; for (let i = 0; i <= k; i++) { const t = i / k, u = 1 - t; out.push([u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0], u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1]]); } return out; }
  return g.pts;
};
lib.register({
  type: 'tube', name: 'Fluid tubing', abbr: '', category: 'Connections', connection: true, autoLabel: false,
  keywords: 'tubing tube fluid flow microfluidic hose pump liquid gas line connection',
  tool: 'tube', hint: 'Click the first object, then the second.',
  defaults: { from: '', to: '', route: 'curve', sag: 0.3, width: 1.6, wallColor: '#c8d3dd', liquid: '#5aa9e6', flow: 'end', arrows: 4, dashed: false },
  params: [
    { key: 'route', label: 'Routing', type: 'select', options: [['curve', 'Smooth curve'], ['hv', 'Horizontal → vertical'], ['vh', 'Vertical → horizontal'], ['hvh', 'Horizontal–vertical–horizontal'], ['straight', 'Straight']] },
    { key: 'sag', label: 'Sag', type: 'range', min: -1.5, max: 1.5, step: 0.01, show: p => p.route === 'curve' },
    { key: 'width', label: 'Tube diameter', type: 'number', unit: 'mm', min: 0.3, max: 10, step: 0.1 },
    { key: 'wallColor', label: 'Tube colour', type: 'color' },
    { key: 'liquid', label: 'Liquid colour', type: 'color', allowEmpty: true, hint: 'empty = an empty or gas line' },
    { key: 'flow', label: 'Flow direction', type: 'select', options: [['end', 'Towards the second object'], ['start', 'Towards the first object'], ['none', 'Not shown']] },
    { key: 'arrows', label: 'Flow arrows', type: 'number', min: 0, max: 20, step: 1, show: p => p.flow !== 'none' },
    { key: 'dashed', label: 'Dashed (gas line)', type: 'bool' },
  ],
  geometry(obj, doc) { return lib.get('wire').geometry(obj, doc); },
  drawConn(obj, doc, S) {
    const g = this.geometry(obj, doc); if (!g) return '';
    const p = obj.props, w = Math.max(0.3, +p.width || 1.6), shaded = S.shaded;
    let s = `<path d="${g.d}" fill="none" stroke="${shaded ? U.shadeRgb(p.wallColor, 0.7) : S.ink}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="${g.d}" fill="none" stroke="${shaded ? p.wallColor : '#ffffff'}" stroke-width="${n(w - Math.max(0.15, S.lw * 0.9))}" stroke-linecap="round" stroke-linejoin="round" ${p.dashed ? `stroke-dasharray="${n(w * 1.6)} ${n(w)}"` : ''}/>`;
    if (p.liquid) s += `<path d="${g.d}" fill="none" stroke="${p.liquid}" stroke-width="${n(w * 0.5)}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${shaded ? 0.95 : 0.85}"/>`;
    if (shaded) s += `<path d="${g.d}" fill="none" stroke="#ffffff" stroke-opacity="0.45" stroke-width="${n(w * 0.16)}" transform="translate(${n(-w * 0.18)} ${n(-w * 0.18)})" stroke-linecap="round"/>`;
    if (p.flow !== 'none' && p.arrows > 0) {
      const pts = sampleRoute(g), seg = [], col = p.liquid ? U.shadeRgb(p.liquid, 0.5) : S.ink; let L = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
      for (let k = 1; k <= p.arrows; k++) {
        let target = L * k / (p.arrows + 1), i = 0; while (i < seg.length - 1 && target > seg[i]) { target -= seg[i]; i++; }
        const a = pts[i], b = pts[i + 1], t = seg[i] ? target / seg[i] : 0, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        let ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (p.flow === 'start') ang += Math.PI;
        s += H.arrowHead(x + Math.cos(ang) * w * 0.6, y + Math.sin(ang) * w * 0.6, ang, w * 0.75, col);
      }
    }
    return s;
  },
});
})();
