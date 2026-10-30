/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/beams.js
   Draws traced beam segments in 2D: true-width envelopes that
   converge through foci, optional vector glow (no SVG filters,
   so PDFs match the screen), direction arrows, polarisation
   markers and animated flow / pulses.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, n = v => U.round(v, 3);
const B = RNBX.beams = {};

const WMIN = 0.05;   // waist drawn at a focus (mm)

B.color = (doc, seg) => RNBX.lib.colorOf(doc, seg.lambda, seg.color);
B.opacity = (doc, seg) => {
  const base = doc.style.beamOpacity == null ? 0.92 : doc.style.beamOpacity;
  if (!doc.style.beamFade || !seg.P0) return base;
  const f = U.clamp(seg.P / seg.P0, 0, 1);
  return base * (0.3 + 0.7 * Math.pow(f, 0.45));
};

/* drawing context: figure scale and Gaussian width exaggeration */
B.ctx = { scale: 10, gMag: 10 };
B.setContext = doc => { B.ctx = { scale: doc.style.scale || 10, gMag: doc.style.gaussMag || 10 }; };

/* drawn half-width at distance s along a segment */
B.hw = (seg, s) => {
  if (seg.q0) {
    const c = B.ctx, q = { re: seg.q0.re + s * c.scale, im: seg.q0.im };
    const w = RNBX.optics.qRadius(q, seg.lambda * 1e-6, seg.M2, seg.nmed);
    return U.clamp(w * c.gMag / c.scale, WMIN, 60);
  }
  return Math.max(WMIN, Math.abs(seg.w0 + seg.dw * s));
};

/* Envelope polygons for a segment. Geometric beams split at a
   focus so they pinch to a waist; Gaussian beams are sampled
   along the hyperbolic profile. */
B.envelope = (seg, wScale = 1) => {
  const d = V.norm(V.sub(seg.b, seg.a)), p = V.perp(d);
  if (seg.q0) {
    const L = seg.len, cuts = [];
    const N = 18;
    for (let i = 0; i <= N; i++) cuts.push(L * i / N);
    const sw = -seg.q0.re / B.ctx.scale;
    if (sw > 0 && sw < L) cuts.push(sw);
    cuts.sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < cuts.length - 1; i++) {
      const s0 = cuts[i], s1 = cuts[i + 1];
      if (s1 - s0 < 1e-6) continue;
      const h0 = B.hw(seg, s0) * wScale, h1 = B.hw(seg, s1) * wScale;
      const A = V.add(seg.a, V.mul(d, s0)), Bp = V.add(seg.a, V.mul(d, s1));
      out.push({ A, B: Bp, h0, h1, pts: [V.add(A, V.mul(p, h0)), V.add(Bp, V.mul(p, h1)), V.sub(Bp, V.mul(p, h1)), V.sub(A, V.mul(p, h0))] });
    }
    return out;
  }
  const w0 = seg.w0 * wScale, dw = seg.dw * wScale, L = seg.len;
  const pieces = [];
  const sF = Math.abs(dw) > 1e-9 ? -w0 / dw : -1;
  const cuts = [0];
  if (sF > 1e-6 && sF < L - 1e-6) cuts.push(sF);
  cuts.push(L);
  for (let i = 0; i < cuts.length - 1; i++) {
    const s0 = cuts[i], s1 = cuts[i + 1];
    const h0 = Math.max(WMIN, Math.abs(w0 + dw * s0)), h1 = Math.max(WMIN, Math.abs(w0 + dw * s1));
    const A = V.add(seg.a, V.mul(d, s0)), Bp = V.add(seg.a, V.mul(d, s1));
    pieces.push({ A, B: Bp, h0, h1, pts: [V.add(A, V.mul(p, h0)), V.add(Bp, V.mul(p, h1)), V.sub(Bp, V.mul(p, h1)), V.sub(A, V.mul(p, h0))] });
  }
  return pieces;
};
const poly = pts => 'M ' + pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + ' Z';

B.isCollimated = seg => {
  if (seg.q0) { const a = B.hw(seg, 0), b = B.hw(seg, seg.len / 2), c = B.hw(seg, seg.len); return Math.max(a, b, c) - Math.min(a, b, c) < 0.015; }
  return Math.abs(seg.dw * seg.len) < 0.02;
};

/* glow halo layers drawn beneath the core beam */
const GLOW = [[5.5, 0.06], [3.2, 0.11], [1.9, 0.2]];

/* Beams of different wavelengths sharing one path (white light,
   SHG + fundamental, multi-line lasers) are drawn as a ribbon of
   side-by-side bands instead of hiding under the last colour.
   Returns Map(segment → {i, k}). */
B.groups = segs => {
  // direction-independent key: light going out and signal coming back share a path
  const canon = s => (s.a[0] < s.b[0] - 1e-6) || (Math.abs(s.a[0] - s.b[0]) <= 1e-6 && s.a[1] <= s.b[1]);
  const key = s => { const c = canon(s), p = c ? [s.a, s.b] : [s.b, s.a]; return [p[0][0], p[0][1], p[1][0], p[1][1]].map(v => Math.round(v * 50)).join(','); };
  const by = new Map();
  segs.forEach(s => { if (s.len < 1e-4 || s.vertical || s.ghost || s.ray) return; s.canon = canon(s); const k = key(s); (by.get(k) || by.set(k, []).get(k)).push(s); });
  const out = new Map();
  by.forEach(list => {
    const ls = [...new Set(list.map(s => s.lambda))];
    if (ls.length < 2) return;
    const uniq = [];
    list.slice().sort((a, b) => a.lambda - b.lambda).forEach(s => { if (!uniq.some(u => u.lambda === s.lambda)) uniq.push(s); });
    uniq.forEach((s, i) => out.set(s, { i, k: uniq.length }));
    list.forEach(s => { if (!out.has(s)) out.set(s, { skip: true }); });
  });
  return out;
};
/* single rays of a ray bundle: fine lines of a fixed width */
B.rayLine = (doc, seg) => `<line x1="${n(seg.a[0])}" y1="${n(seg.a[1])}" x2="${n(seg.b[0])}" y2="${n(seg.b[1])}" stroke="${B.color(doc, seg)}" stroke-opacity="${n(Math.min(1, B.opacity(doc, seg) + 0.05))}" stroke-width="${n(doc.style.rayWidth || 0.16)}" stroke-linecap="round"/>`;
B.signalScale = 1;     // relative width of emitted (Raman / fluorescence) beams

B.draw2D = (trace, doc, opt = {}) => {
  const st = doc.style, segs = trace.segments;
  const lineMode = st.beamStyle === 'line';
  const dark = RNBX.isDarkPage(doc.page);
  const glow = st.beamGlow || opt.forceGlow;
  B.setContext(doc);
  const groups = B.groups(segs);
  let halo = '', core = '', deco = '';
  const lineW = Math.max(0.2, st.beamWidth * 0.5);
  if (st.beamStyle === 'ribbon') return B.ribbon2D(trace, doc, opt);
  for (const seg of segs) {
    if (seg.len < 1e-4 || seg.vertical) continue;
    if (seg.ray) { core += B.rayLine(doc, seg); continue; }
    if (seg.ghost) {
      // ghost reflections: thin dashed lines, as reviewers expect to see them
      const w = Math.max(0.12, (lineMode ? lineW : 2 * B.hw(seg, 0)) * 0.45);
      core += `<line x1="${n(seg.a[0])}" y1="${n(seg.a[1])}" x2="${n(seg.b[0])}" y2="${n(seg.b[1])}" stroke="${B.color(doc, seg)}" stroke-opacity="${n(Math.max(0.35, B.opacity(doc, seg)))}" stroke-width="${n(w)}" stroke-dasharray="${n(w * 4)} ${n(w * 3)}"/>`;
      continue;
    }
    const g = groups.get(seg);
    if (g && g.skip) continue;
    const col = B.color(doc, seg), op = B.opacity(doc, seg);
    const coreCol = dark && glow ? U.lighten(col, 0.25) : col;
    const k = seg.emitted ? B.signalScale : 1;
    if (g) {
      // one band of a multi-wavelength ribbon
      // bands are laid out across the canonical direction so reversed beams line up
      const f0 = seg.canon ? g.i / g.k : 1 - (g.i + 1) / g.k, f1 = seg.canon ? (g.i + 1) / g.k : 1 - g.i / g.k;
      const pieces = lineMode ? B.envelope(Object.assign({}, seg, { w0: lineW / 2, dw: 0 })) : B.envelope(seg);
      const d = V.norm(V.sub(seg.b, seg.a)), pp = V.perp(d);
      for (const pc of pieces) {
        const band = [V.add(pc.A, V.mul(pp, pc.h0 * (1 - 2 * f0))), V.add(pc.B, V.mul(pp, pc.h1 * (1 - 2 * f0))), V.add(pc.B, V.mul(pp, pc.h1 * (1 - 2 * f1))), V.add(pc.A, V.mul(pp, pc.h0 * (1 - 2 * f1)))];
        if (glow && g.i === 0) GLOW.forEach(([kk, a]) => { halo += `<path d="${poly(pc.pts)}" fill="#ffffff" fill-opacity="${n(a * op)}" stroke="#ffffff" stroke-opacity="${n(a * op)}" stroke-width="${n(Math.max(pc.h0, pc.h1) * kk)}" stroke-linejoin="round"/>`; });
        core += `<path d="${poly(band)}" fill="${coreCol}" fill-opacity="${n(op)}" stroke="${coreCol}" stroke-opacity="${n(op)}" stroke-width="0.02"/>`;
      }
    } else if (lineMode || B.isCollimated(seg)) {
      const w = (lineMode ? lineW : 2 * B.hw(seg, 0)) * k;
      const geo = `x1="${n(seg.a[0])}" y1="${n(seg.a[1])}" x2="${n(seg.b[0])}" y2="${n(seg.b[1])}"`;
      if (glow) GLOW.forEach(([kk, a]) => { halo += `<line ${geo} stroke="${col}" stroke-opacity="${n(a * op)}" stroke-width="${n(w * kk + 0.6)}" stroke-linecap="round"/>`; });
      core += `<line ${geo} stroke="${coreCol}" stroke-opacity="${n(op)}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
      if (glow && dark) core += `<line ${geo} stroke="#ffffff" stroke-opacity="${n(0.55 * op)}" stroke-width="${n(w * 0.32)}" stroke-linecap="round"/>`;
    } else {
      const sg = k === 1 ? seg : Object.assign({}, seg, { w0: seg.w0 * k, dw: seg.dw * k });
      for (const pc of B.envelope(sg)) {
        const d = poly(pc.pts);
        if (glow) GLOW.forEach(([kk, a]) => { halo += `<path d="${d}" fill="${col}" fill-opacity="${n(a * op)}" stroke="${col}" stroke-opacity="${n(a * op)}" stroke-width="${n(Math.max(pc.h0, pc.h1) * kk)}" stroke-linejoin="round"/>`; });
        core += `<path d="${d}" fill="${coreCol}" fill-opacity="${n(op * 0.88)}" stroke="none"/>`;
      }
    }
    if (st.beamArrows && seg.kind === 'beam' && seg.len > 9 && !(g && g.i > 0)) deco += B.arrow(seg, g ? '#555b66' : col, op, lineMode ? lineW : 2 * B.hw(seg, seg.len / 2));
    if (st.polarization && seg.kind === 'beam' && seg.len > 7 && !g) deco += B.polMarker(seg, col, doc);
    if (st.waistLabels && seg.q0 && seg.kind === 'beam' && !(g && g.i > 0)) deco += B.waistLabel(seg, doc);
  }
  let flow = '';
  if (opt.time != null && B.hasMotion(doc, segs, opt.motion)) flow = B.flow2D(trace, doc, opt.time, lineMode ? lineW : null, opt.motion);
  return `<g class="rbx-beams" pointer-events="none">${halo}${core}${flow}${deco}</g>`;
};

/* Ribbon style: wide translucent bands of constant width, as in
   instrument beam-path sketches (FTIR, telescopes). All segments of
   one colour form a single path inside an opacity group, so a band
   never darkens where its own pieces meet at a mirror, and the
   darker edge stays crisp. Different beams that cross do overlap. */
B.ribbon2D = (trace, doc, opt = {}) => {
  const st = doc.style, W = st.ribbonWidth || 3, byCol = new Map();
  let ghosts = '', deco = '';
  for (const seg of trace.segments) {
    if (seg.len < 1e-4 || seg.vertical) continue;
    if (seg.ray) { ghosts += B.rayLine(doc, seg); continue; }
    const col = B.color(doc, seg);
    if (seg.ghost) { ghosts += `<line x1="${n(seg.a[0])}" y1="${n(seg.a[1])}" x2="${n(seg.b[0])}" y2="${n(seg.b[1])}" stroke="${col}" stroke-opacity="0.45" stroke-width="${n(Math.max(0.15, W * 0.12))}" stroke-dasharray="${n(W * 0.4)} ${n(W * 0.3)}"/>`; continue; }
    const k = (seg.emitted ? B.signalScale : 1);
    const key = col + '|' + k;
    if (!byCol.has(key)) byCol.set(key, { col, k, d: '', op: 0 });
    const e = byCol.get(key);
    e.d += `M ${n(seg.a[0])} ${n(seg.a[1])} L ${n(seg.b[0])} ${n(seg.b[1])} `;
    e.op = Math.max(e.op, B.opacity(doc, seg));
    if (st.beamArrows && seg.kind === 'beam' && seg.len > 12) deco += B.arrow(seg, U.darken(col, 0.25), 0.9, W * 0.28);
  }
  let core = '';
  byCol.forEach(e => {
    const w = W * e.k, edge = Math.max(0.12, w * 0.07);
    core += `<g opacity="${n(Math.min(0.75, e.op * 0.6))}"><path d="${e.d}" fill="none" stroke="${U.darken(e.col, 0.25)}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${e.d}" fill="none" stroke="${U.lighten(e.col, 0.2)}" stroke-width="${n(w - 2 * edge)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  });
  let flow = '';
  if (opt.time != null && B.hasMotion(doc, trace.segments, opt.motion)) flow = B.flow2D(trace, doc, opt.time, null, opt.motion);
  return `<g class="rbx-beams" pointer-events="none">${core}${ghosts}${flow}${deco}</g>`;
};

/* light moves when flow/pulses are switched on, and pulsed lasers
   show their pulses whenever the animation is actually running */
B.hasMotion = (doc, segs, motion) => doc.animation.flow || doc.animation.pulses || (motion && segs.some(s => s.pulsed));
B.isPulsed = (doc, seg, motion) => doc.animation.pulses || (seg.pulsed && (motion || doc.animation.flow));

/* "2w₀ = 12 µm" at a Gaussian focus that lies inside the segment */
B.waistLabel = (seg, doc) => {
  const sw = -seg.q0.re / B.ctx.scale;
  if (!(sw > 0.5 && sw < seg.len - 0.5)) return '';
  const info = RNBX.optics.qWaistInfo(seg.q0, seg.lambda * 1e-6, seg.M2, seg.nmed);
  const um = 2 * info.w0 * 1000;
  const txt = um >= 1000 ? `2w₀ = ${U.fmt(um / 1000, 2)} mm` : `2w₀ = ${U.fmt(um, um < 10 ? 2 : 1)} µm`;
  const d = V.norm(V.sub(seg.b, seg.a)), p = V.perp(d), at = V.add(seg.a, V.mul(d, sw));
  const off = B.hw(seg, sw) + 1.6, q = V.sub(at, V.mul(p[1] > 0 ? p : V.mul(p, -1), off));
  const fs = U.pt2mm(Math.max(5, (doc.style.fontSizePt || 7) - 1));
  const ink = RNBX.isDarkPage(doc.page) ? '#e8ecf2' : '#333';
  return `<text x="${n(q[0])}" y="${n(q[1])}" font-family="${U.esc(doc.style.font)}" font-size="${n(fs)}" fill="${ink}" text-anchor="middle">${RNBX.text.markup(txt, fs)}</text>` +
    `<line x1="${n(at[0])}" y1="${n(at[1])}" x2="${n(q[0])}" y2="${n(q[1] + fs * 0.35)}" stroke="${ink}" stroke-width="0.12" stroke-dasharray="0.4 0.4"/>`;
};

B.arrow = (seg, col, op, w) => {
  const d = V.norm(V.sub(seg.b, seg.a)), m = V.add(seg.a, V.mul(d, seg.len * 0.5));
  const size = Math.max(1.3, w * 2.4);
  return `<g opacity="${n(op)}">${RNBX.lib.H.arrowHead(m[0] + d[0] * size / 2, m[1] + d[1] * size / 2, Math.atan2(d[1], d[0]), size, U.darken(col, 0.15))}</g>`;
};

B.polMarker = (seg, col, doc) => {
  const info = RNBX.optics.describe(seg.E);
  if (info.kind === 'none') return '';
  const d = V.norm(V.sub(seg.b, seg.a)), p = V.perp(d);
  const at = V.add(seg.a, V.mul(d, Math.min(seg.len * 0.5, Math.max(4, seg.len * 0.3))));
  const ink = RNBX.isDarkPage(doc.page) ? '#f4f6f8' : U.darken(col, 0.45), w = 0.22, L = 1.5;
  const dbl = (dir) => {
    const a = V.add(at, V.mul(dir, L)), b = V.sub(at, V.mul(dir, L));
    const ang = Math.atan2(dir[1], dir[0]);
    return `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}" stroke="${ink}" stroke-width="${w}"/>` +
      RNBX.lib.H.arrowHead(a[0], a[1], ang, 0.7, ink) + RNBX.lib.H.arrowHead(b[0], b[1], ang + Math.PI, 0.7, ink);
  };
  const dot = (r = 0.42) => `<circle cx="${n(at[0])}" cy="${n(at[1])}" r="${r}" fill="${ink}"/>` + `<circle cx="${n(at[0])}" cy="${n(at[1])}" r="${r + 0.35}" fill="none" stroke="${ink}" stroke-width="0.16"/>`;
  switch (info.kind) {
    case 'p': return dbl(p);
    case 's': return dot();
    case 'diag': return dbl(V.norm(V.add(p, V.mul(d, info.psi > 0 ? 0.7 : -0.7))));
    case 'circ': case 'ellip': {
      const r = 0.95, ry = info.kind === 'circ' ? r : r * Math.max(0.35, Math.abs(info.ell));
      const ang = U.deg(Math.atan2(p[1], p[0]));
      const sgn = info.kind === 'circ' ? (info.hand === 'R' ? 1 : -1) : Math.sign(info.ell);
      const tip = V.add(at, V.mul(p, r));
      return `<ellipse cx="${n(at[0])}" cy="${n(at[1])}" rx="${n(r)}" ry="${n(ry)}" transform="rotate(${n(ang)} ${n(at[0])} ${n(at[1])})" fill="none" stroke="${ink}" stroke-width="${w}"/>` +
        RNBX.lib.H.arrowHead(tip[0], tip[1], Math.atan2(d[1] * sgn, d[0] * sgn), 0.75, ink);
    }
    default: return dbl(p) + `<circle cx="${n(at[0])}" cy="${n(at[1])}" r="0.38" fill="${ink}"/>`; // unpolarised
  }
};

/* ---------- pulse shapes ----------
   'packet': a few optical cycles under a Gaussian envelope (the carrier
   period follows the wavelength, so a 400 nm pump wiggles faster than
   an 800 nm probe); 'gauss': a smooth bell-shaped bump; 'bar': the
   older rounded bar. Returns points [along, across] relative to the
   pulse centre, clipped to the segment (u = centre position on it). */
B.PULSE_SHAPES = [['packet', 'Wave packet'], ['gauss', 'Gaussian'], ['bar', 'Bar']];
B.pulseShape = doc => (doc.animation && doc.animation.pulseShape) || 'packet';
B.pulseOutline = (shape, seg, u, w) => {
  const lp = U.clamp(0.9 * (seg.lambda || 800) / 800, 0.35, 1.6);
  const A = Math.max(0.55, w * 1.3);
  const sig = shape === 'gauss' ? Math.max(0.9, w * 1.1) * 1.2 : 1.25 * lp, half = 2.6 * sig;
  const inside = s => u + s >= 0 && u + s <= seg.len;
  const env = s => Math.exp(-s * s / (2 * sig * sig));
  const step = shape === 'gauss' ? half / 14 : lp / 12;
  const xs = []; for (let s = -half; s <= half + 1e-9; s += step) if (inside(s)) xs.push(s);
  if (xs.length < 2) return null;
  if (shape === 'gauss') {
    const top = xs.map(s => [s, A * 1.1 * env(s)]), bot = xs.slice().reverse().map(s => [s, -A * 1.1 * env(s)]);
    const core = xs.map(s => [s, A * 0.45 * env(s)]), coreB = xs.slice().reverse().map(s => [s, -A * 0.45 * env(s)]);
    return { fill: top.concat(bot), core: core.concat(coreB), A };
  }
  return { line: xs.map(s => [s, A * env(s) * Math.cos(2 * Math.PI * s / lp)]), A };
};

/* Animated light: CW beams get travelling highlights, pulsed
   beams get discrete wave packets. Phase follows the cumulative
   optical path, so light visibly flows around corners. */
B.flow2D = (trace, doc, t, lineW, motion) => {
  const an = doc.animation, v = an.flowSpeed || 25;
  const dark = RNBX.isDarkPage(doc.page);
  let s = '';
  for (const seg of trace.segments) {
    if (seg.len < 0.05 || seg.vertical || seg.ghost) continue;
    const pulsed = B.isPulsed(doc, seg, motion);
    if (!pulsed && !an.flow) continue;
    const col = B.color(doc, seg), d = V.norm(V.sub(seg.b, seg.a));
    const wMid = lineW || Math.max(0.25, 2 * B.hw(seg, seg.len / 2));
    const shape = B.pulseShape(doc);
    if (pulsed && shape !== 'bar') {
      const spacing = 14, nrm = [-d[1], d[0]];
      const P = q => { const c = V.add(V.add(seg.a, V.mul(d, q[0])), V.mul(nrm, q[1])); return n(c[0]) + ' ' + n(c[1]); };
      let u = ((v * t - seg.s0) % spacing + spacing) % spacing;
      for (; u < seg.len; u += spacing) {
        const w = Math.max(0.3, lineW || 2 * B.hw(seg, u));
        const o = B.pulseOutline(shape, seg, u, w);
        if (!o) continue;
        const sh = q => [q[0] + u, q[1]];
        if (o.fill) {
          s += `<path d="M ${o.fill.map(q => P(sh(q))).join(' L ')} Z" fill="${col}" fill-opacity="0.45" stroke="${col}" stroke-width="${n(Math.max(0.08, o.A * 0.08))}" stroke-linejoin="round"/>`;
          s += `<path d="M ${o.core.map(q => P(sh(q))).join(' L ')} Z" fill="${dark ? '#ffffff' : U.lighten(col, 0.55)}" fill-opacity="0.9" stroke="none"/>`;
        } else {
          const dd = 'M ' + o.line.map(q => P(sh(q))).join(' L ');
          s += `<path d="${dd}" fill="none" stroke="${col}" stroke-opacity="0.28" stroke-width="${n(o.A * 0.7)}" stroke-linecap="round" stroke-linejoin="round"/>`;
          s += `<path d="${dd}" fill="none" stroke="${col}" stroke-width="${n(Math.max(0.12, o.A * 0.22))}" stroke-linecap="round" stroke-linejoin="round"/>`;
          if (dark) s += `<path d="${dd}" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="${n(Math.max(0.05, o.A * 0.08))}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
      }
    } else if (pulsed) {
      const spacing = 14, plen = Math.max(1.6, wMid * 2.2);
      let u = ((v * t - seg.s0) % spacing + spacing) % spacing;
      for (; u < seg.len; u += spacing) {
        const c = V.add(seg.a, V.mul(d, u));
        const w = Math.max(0.3, lineW || 2 * B.hw(seg, u)) * 1.25;
        const a = V.sub(c, V.mul(d, Math.min(plen / 2, u))), b = V.add(c, V.mul(d, Math.min(plen / 2, seg.len - u)));
        const g = `x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}"`;
        s += `<line ${g} stroke="${col}" stroke-opacity="0.35" stroke-width="${n(w * 3)}" stroke-linecap="round"/>`;
        s += `<line ${g} stroke="${dark ? '#ffffff' : U.lighten(col, 0.55)}" stroke-opacity="0.95" stroke-width="${n(w)}" stroke-linecap="round"/>`;
      }
    } else {
      const dash = 2.2, gap = 5.5, per = dash + gap;
      const off = -((v * t - seg.s0) % per);
      s += `<line x1="${n(seg.a[0])}" y1="${n(seg.a[1])}" x2="${n(seg.b[0])}" y2="${n(seg.b[1])}" stroke="${dark ? '#ffffff' : U.lighten(col, 0.65)}" stroke-opacity="0.85" stroke-width="${n(wMid * 0.6)}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${n(off)}" stroke-linecap="round"/>`;
    }
  }
  return s;
};
})();
