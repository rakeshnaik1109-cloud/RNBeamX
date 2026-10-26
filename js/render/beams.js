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

/* Envelope polygons for a segment. Splits at a focus so the beam
   pinches to a waist instead of inverting. */
B.envelope = (seg, wScale = 1) => {
  const d = V.norm(V.sub(seg.b, seg.a)), p = V.perp(d);
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

B.isCollimated = seg => Math.abs(seg.dw * seg.len) < 0.02;

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
  segs.forEach(s => { if (s.len < 1e-4) return; s.canon = canon(s); const k = key(s); (by.get(k) || by.set(k, []).get(k)).push(s); });
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
B.signalScale = 1;     // relative width of emitted (Raman / fluorescence) beams

B.draw2D = (trace, doc, opt = {}) => {
  const st = doc.style, segs = trace.segments;
  const lineMode = st.beamStyle === 'line';
  const dark = RNBX.isDarkPage(doc.page);
  const glow = st.beamGlow || opt.forceGlow;
  const groups = B.groups(segs);
  let halo = '', core = '', deco = '';
  const lineW = Math.max(0.2, st.beamWidth * 0.5);
  for (const seg of segs) {
    if (seg.len < 1e-4) continue;
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
      const w = (lineMode ? lineW : Math.max(WMIN * 2, 2 * Math.abs(seg.w0))) * k;
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
    if (st.beamArrows && seg.kind === 'beam' && seg.len > 9 && !(g && g.i > 0)) deco += B.arrow(seg, g ? '#555b66' : col, op, lineMode ? lineW : 2 * Math.abs(seg.w0 + seg.dw * seg.len / 2));
    if (st.polarization && seg.kind === 'beam' && seg.len > 7 && !g) deco += B.polMarker(seg, col, doc);
  }
  let flow = '';
  if (opt.time != null && B.hasMotion(doc, segs, opt.motion)) flow = B.flow2D(trace, doc, opt.time, lineMode ? lineW : null, opt.motion);
  return `<g class="rbx-beams" pointer-events="none">${halo}${core}${flow}${deco}</g>`;
};

/* light moves when flow/pulses are switched on, and pulsed lasers
   show their pulses whenever the animation is actually running */
B.hasMotion = (doc, segs, motion) => doc.animation.flow || doc.animation.pulses || (motion && segs.some(s => s.pulsed));
B.isPulsed = (doc, seg, motion) => doc.animation.pulses || (seg.pulsed && (motion || doc.animation.flow));

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

/* Animated light: CW beams get travelling highlights, pulsed
   beams get discrete wave packets. Phase follows the cumulative
   optical path, so light visibly flows around corners. */
B.flow2D = (trace, doc, t, lineW, motion) => {
  const an = doc.animation, v = an.flowSpeed || 25;
  const dark = RNBX.isDarkPage(doc.page);
  let s = '';
  for (const seg of trace.segments) {
    if (seg.len < 0.05) continue;
    const pulsed = B.isPulsed(doc, seg, motion);
    if (!pulsed && !an.flow) continue;
    const col = B.color(doc, seg), d = V.norm(V.sub(seg.b, seg.a));
    const wMid = lineW || Math.max(0.25, 2 * Math.abs(seg.w0 + seg.dw * seg.len / 2));
    if (pulsed) {
      const spacing = 14, plen = Math.max(1.6, wMid * 2.2);
      let u = ((v * t - seg.s0) % spacing + spacing) % spacing;
      for (; u < seg.len; u += spacing) {
        const c = V.add(seg.a, V.mul(d, u));
        const w = Math.max(0.3, lineW || 2 * Math.abs(seg.w0 + seg.dw * u)) * 1.25;
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
