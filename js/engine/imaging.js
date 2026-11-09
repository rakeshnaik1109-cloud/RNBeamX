/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/imaging.js
   Where does an object form its image, and how good is it?

   A "Ray bundle / object" part sends fans of rays (one per object point
   and wavelength). After the last optical element each ray is a
   straight line. The image of a fan is the point that minimises the sum
   of squared perpendicular distances to those lines (closed-form
   least squares); the RMS of the distances is the blur there, and it
   is real if the rays converge towards it, virtual if they only seem
   to come from it. With an object arrow, the images of its tip and base
   give the lateral magnification. The transverse ray-fan plot shows, for
   a detector, where each ray lands against its position in the pupil:
   a straight line is defocus, an S-shape spherical aberration, and an
   offset between colours lateral colour.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v;
const IM = RNBX.imaging = {};

const rot90 = d => [-d[1], d[0]];
const mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);

/* rays of one source, grouped per fan and wavelength: first and last segment of every ray */
const raysOf = (trace, srcId) => {
  const map = new Map();
  trace.segments.forEach(s => {
    if (s.src !== srcId || !s.ray || s.ghost || s.kind !== 'beam' || s.len < 1e-6 || s.pu == null) return;
    const key = s.fan + '|' + s.lambda + '|' + s.pu;
    const r = map.get(key) || { fan: s.fan, lambda: s.lambda, pu: s.pu, first: s, last: s, n: 0 };
    if (s.s0 < r.first.s0) r.first = s;
    if (s.s0 >= r.last.s0) r.last = s;
    r.n++; map.set(key, r);
  });
  const groups = new Map();
  map.forEach(r => { const k = r.fan + '|' + r.lambda; (groups.get(k) || groups.set(k, []).get(k)).push(r); });
  return groups;
};

/* least-squares intersection of lines (point a, unit direction d) */
const focusOf = lines => {
  let a11 = 0, a12 = 0, a22 = 0, b1 = 0, b2 = 0;
  lines.forEach(l => { const [dx, dy] = l.d, m11 = 1 - dx * dx, m12 = -dx * dy, m22 = 1 - dy * dy; a11 += m11; a12 += m12; a22 += m22; b1 += m11 * l.a[0] + m12 * l.a[1]; b2 += m12 * l.a[0] + m22 * l.a[1]; });
  const det = a11 * a22 - a12 * a12;
  if (Math.abs(det) < 1e-9 * lines.length * lines.length) return null;   // parallel rays: image at infinity
  const p = [(a22 * b1 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det];
  const dist = lines.map(l => { const v = V.sub(p, l.a); return Math.abs(v[0] * l.d[1] - v[1] * l.d[0]); });
  const ahead = lines.filter(l => V.dot(V.sub(p, l.a), l.d) > 0).length;
  return { p, rms: Math.sqrt(mean(dist.map(x => x * x))), real: ahead > lines.length / 2 };
};

/* image analysis for one ray-bundle part */
IM.analyse = (doc, trace, obj) => {
  const sc = doc.style.scale || 10, groups = raysOf(trace, obj.id), out = [];
  groups.forEach(rs => {
    if (rs.length < 3) return;
    const passed = rs.filter(r => r.last !== r.first);   // rays that met at least one element
    if (passed.length < 3) return;
    const lines = passed.map(r => ({ a: r.last.a, d: V.norm(V.sub(r.last.b, r.last.a)) }));
    const f = focusOf(lines), din = V.norm(rs.reduce((acc, r) => V.add(acc, V.norm(V.sub(r.first.b, r.first.a))), [0, 0])), dout = V.norm(lines.reduce((acc, l) => V.add(acc, l.d), [0, 0]));
    const half = arr => Math.max.apply(null, arr.map(d => Math.asin(Math.min(1, Math.abs(d[0] * dir(arr)[1] - d[1] * dir(arr)[0])))));
    const dirs0 = passed.map(r => V.norm(V.sub(r.first.b, r.first.a))), dirs1 = lines.map(l => l.d);
    out.push({ fan: rs[0].fan, lambda: rs[0].lambda, rays: rs.length, through: passed.length, focus: f, axisIn: din, axisOut: dout,
      naIn: Math.sin(half(dirs0)), naOut: Math.sin(half(dirs1)), sc });
  });
  // lateral magnification from the images of the arrow's tip and base (same wavelength)
  const mags = [];
  out.filter(g => g.fan === 'tip' && g.focus).forEach(t => {
    const b = out.find(g => g.fan === 'base' && g.lambda === t.lambda && g.focus); if (!b) return;
    const o0 = U.toWorld(obj, [0, 0]), o1 = U.toWorld(obj, [0, -obj.props.h]);
    const pin = rot90(b.axisIn), pout = rot90(b.axisOut), ho = V.dot(V.sub(o1, o0), pin), hi = V.dot(V.sub(t.focus.p, b.focus.p), pout);
    if (Math.abs(ho) > 1e-9) mags.push({ lambda: t.lambda, m: hi / ho });
  });
  // longitudinal colour: spread of the image positions along the axis between wavelengths
  const byFan = {}; out.forEach(g => { if (g.focus) (byFan[g.fan] = byFan[g.fan] || []).push(g); });
  let colour = null;
  Object.keys(byFan).forEach(k => { const gs = byFan[k]; if (gs.length < 2) return; const ax = gs[0].axisOut, z = gs.map(g => V.dot(g.focus.p, ax)); const sp = Math.max.apply(null, z) - Math.min.apply(null, z); if (colour == null || sp > colour) colour = sp; });
  return { groups: out, mags, colour, sc };
};
const dir = arr => V.norm(arr.reduce((a, d) => V.add(a, d), [0, 0]));

const fmtL = mm => Math.abs(mm) >= 1 ? U.fmt(mm, 3) + ' mm' : U.fmt(mm * 1000, 3) + ' µm';
IM.summaryHtml = (doc, trace, obj) => {
  const r = IM.analyse(doc, trace, obj), sc = r.sc;
  if (!r.groups.length) return '';
  const good = r.groups.filter(g => g.focus);
  if (!good.length) return '<br><b>Image</b>: the rays leave parallel — the image is at infinity.';
  const pick = gs => gs.slice().sort((a, b) => Math.abs(a.lambda - 587.56) - Math.abs(b.lambda - 587.56))[0];
  const g0 = pick(good.filter(g => g.fan !== 'tip')) || pick(good);
  let html = `<br><b>Image</b> (${g0.lambda.toFixed(1)} nm${g0.fan === 'base' ? ', arrow base' : ''}): ${g0.focus.real ? 'real' : 'virtual'}, at x ${U.fmt(g0.focus.p[0], 2)}, y ${U.fmt(g0.focus.p[1], 2)} (page mm) · blur RMS ${fmtL(g0.focus.rms * sc)}`;
  if (r.mags.length) html += ` · magnification <b>${U.fmt(r.mags[0].m, 3)}×</b>${r.mags[0].m < 0 ? ' (inverted)' : ''}`;
  html += `<br>NA in ${U.fmt(g0.naIn, 3)} · NA out ${U.fmt(g0.naOut, 3)}`;
  if (r.colour != null) html += ` · focus shift between colours <b>${fmtL(r.colour * sc)}</b>`;
  return html;
};

/* where to put a screen: at the image, facing the rays */
IM.placeScreen = (doc, trace, obj) => {
  const r = IM.analyse(doc, trace, obj), g = r.groups.find(q => q.focus && q.focus.real && q.fan !== 'tip') || r.groups.find(q => q.focus && q.focus.real);
  if (!g) return null;
  // centred on the whole image (both ends of an arrow), large enough to catch it
  const pts = r.groups.filter(q => q.focus && q.focus.real).map(q => q.focus.p), side = rot90(g.axisOut);
  const offs = pts.map(p => V.dot(V.sub(p, g.focus.p), side)), lo = Math.min.apply(null, offs.concat(0)), hi = Math.max.apply(null, offs.concat(0));
  const c = V.add(g.focus.p, V.mul(side, (lo + hi) / 2));
  const o = RNBX.createObject('screen', U.round(c[0], 3), U.round(c[1], 3));
  o.rot = U.round(U.deg(Math.atan2(g.axisOut[1], g.axisOut[0])), 2);
  o.props.d = U.round(Math.max(o.props.d || 10, (hi - lo) * 1.3 + 4), 1);
  return o;
};

/* canvas marker for "Mark the image" */
IM.marker = (doc, trace, obj) => {
  const r = IM.analyse(doc, trace, obj); let s = '';
  r.groups.forEach(g => {
    if (!g.focus) return;
    const [x, y] = g.focus.p, k = 1.1, col = RNBX.lib.colorOf(doc, g.lambda, obj.props.color);
    s += `<g stroke="${col}" stroke-width="0.3" ${g.focus.real ? '' : 'stroke-dasharray="0.5 0.4"'}><line x1="${U.round(x - k, 3)}" y1="${U.round(y - k, 3)}" x2="${U.round(x + k, 3)}" y2="${U.round(y + k, 3)}"/><line x1="${U.round(x - k, 3)}" y1="${U.round(y + k, 3)}" x2="${U.round(x + k, 3)}" y2="${U.round(y - k, 3)}"/></g>`;
  });
  return s;
};

/* transverse ray-fan plot (inline SVG) for the rays landing on a detector */
IM.fanPlot = (rays, sc) => {
  const rs = rays.filter(r => r.u != null);
  if (rs.length < 3) return '';
  const groups = {}; rs.forEach(r => { const k = r.fan + '|' + r.lambda; (groups[k] = groups[k] || []).push(r); });
  const allY = rs.map(r => r.y), my = mean(allY), span = Math.max(1e-9, Math.max.apply(null, allY.map(y => Math.abs(y - my))));
  const W = 250, H = 120, ox = 32, oy = 8, pw = W - ox - 8, ph = H - oy - 22;
  const X = u => ox + (u + 1) / 2 * pw, Y = y => oy + ph / 2 - (y - my) / span * ph / 2 * 0.92;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block;margin-top:4px" role="img" aria-label="Transverse ray-fan plot">`;
  s += `<rect x="${ox}" y="${oy}" width="${pw}" height="${ph}" fill="none" stroke="currentColor" stroke-opacity=".25"/><line x1="${ox}" x2="${ox + pw}" y1="${oy + ph / 2}" y2="${oy + ph / 2}" stroke="currentColor" stroke-opacity=".2"/><line x1="${ox + pw / 2}" x2="${ox + pw / 2}" y1="${oy}" y2="${oy + ph}" stroke="currentColor" stroke-opacity=".2"/>`;
  Object.keys(groups).forEach(k => {
    const g = groups[k].slice().sort((a, b) => a.u - b.u), col = RNBX.lib.colorOf(RNBX.state.doc, g[0].lambda, '');
    s += `<polyline fill="none" stroke="${col}" stroke-width="1.6" points="${g.map(r => X(r.u).toFixed(1) + ',' + Y(r.y).toFixed(1)).join(' ')}"/>` + g.map(r => `<circle cx="${X(r.u).toFixed(1)}" cy="${Y(r.y).toFixed(1)}" r="1.6" fill="${col}"/>`).join('');
  });
  s += `<text x="${ox + pw / 2}" y="${H - 6}" font-size="8.5" text-anchor="middle" fill="currentColor" opacity=".7">pupil position (−1 … +1)</text><text x="4" y="${oy + 8}" font-size="8.5" fill="currentColor" opacity=".7">±${fmtL(span * sc)}</text></svg>`;
  return s;
};
})();
