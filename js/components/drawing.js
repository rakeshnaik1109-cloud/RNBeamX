/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/drawing.js
   Free drawing: a path you draw yourself (pen, line, polyline,
   curve) or a hand-drawn beam. It is a drawing only: light never
   interacts with it, and it never moves with the physics. Points
   are stored in the part's own frame, so it moves, rotates and
   scales like any other object; each point has a handle.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = v => U.round(v, 3);

const parse = s => String(s || '').split(/[;\n]+/).map(t => t.trim().split(/[\s,]+/).map(Number)).filter(q => q.length >= 2 && isFinite(q[0]) && isFinite(q[1]));
const fmt = P => P.map(q => U.round(q[0], 2) + ',' + U.round(q[1], 2)).join('; ');
/* smooth curve through the points (Catmull–Rom written as cubic Béziers) */
const smooth = (P, closed) => {
  if (P.length < 3) return 'M ' + P.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + (closed ? ' Z' : '');
  const at = i => closed ? P[(i + P.length) % P.length] : P[Math.max(0, Math.min(P.length - 1, i))];
  let d = `M ${n(P[0][0])} ${n(P[0][1])}`;
  const last = closed ? P.length : P.length - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    d += ` C ${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (closed ? ' Z' : '');
};
const pathOf = p => { const P = parse(p.pts); return P.length < 2 ? '' : p.smooth ? smooth(P, p.closed) : 'M ' + P.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + (p.closed ? ' Z' : ''); };
/* direction at the ends (for arrowheads), following the curve when smoothed */
const endDir = (P, atEnd) => {
  const a = atEnd ? P[P.length - 2] : P[1], b = atEnd ? P[P.length - 1] : P[0];
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
};

const colourOf = p => p.lambda > 0 ? lib.colorOf((RNBX.state && RNBX.state.doc) || { style: {} }, p.lambda, '') : (p.stroke || '#222222');

lib.register({
  type: 'drawing', name: 'Free drawing (path or beam)', abbr: '', category: 'Annotations', annotation: true, autoLabel: false,
  keywords: 'draw drawing pen freehand sketch path line polyline curve manual beam hand drawn custom',
  defaults: { pts: '0,0; 20,0', smooth: false, closed: false, look: 'line', stroke: '#222222', width: 0.6, fill: '', fillOpacity: 0.35, dash: false,
    head: 'none', headSize: 1.6, lambda: 0, beamWidth: 1.2, glow: true, midArrow: false },
  params: [
    { key: 'look', label: 'Drawn as', type: 'select', options: [['line', 'Line / outline'], ['beam', 'Beam (hand-drawn, not traced)']] },
    { key: 'pts', label: 'Points x, y in mm (one pair per line or separated by ;)', type: 'textarea', hint: 'Drag the round handles on the canvas to move a point.' },
    { key: 'smooth', label: 'Smooth curve through the points', type: 'bool' }, { key: 'closed', label: 'Closed shape', type: 'bool' },
    { key: 'lambda', label: 'Wavelength colour (0 = use the colour below)', type: 'number', unit: 'nm', min: 0, max: 12000, step: 1, show: p => p.look === 'beam' },
    { key: 'stroke', label: 'Colour', type: 'color', allowEmpty: true },
    { key: 'width', label: 'Line weight', type: 'number', unit: 'pt', min: 0.05, max: 20, step: 0.05, show: p => p.look !== 'beam' },
    { key: 'beamWidth', label: 'Beam width', type: 'number', unit: 'mm', min: 0.05, max: 20, step: 0.05, show: p => p.look === 'beam' },
    { key: 'glow', label: 'Glow', type: 'bool', show: p => p.look === 'beam' },
    { key: 'midArrow', label: 'Direction arrow in the middle', type: 'bool', show: p => p.look === 'beam' },
    { key: 'dash', label: 'Dashed', type: 'bool' },
    { key: 'fill', label: 'Fill', type: 'color', allowEmpty: true, show: p => p.closed && p.look !== 'beam' },
    { key: 'fillOpacity', label: 'Fill opacity', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.closed && p.fill && p.look !== 'beam' },
    { key: 'head', label: 'Arrowheads', type: 'select', options: [['none', 'None'], ['end', 'End'], ['start', 'Start'], ['both', 'Both']], show: p => !p.closed },
    { key: 'headSize', label: 'Head size', type: 'number', unit: 'mm', min: 0.3, max: 12, step: 0.1, show: p => !p.closed && p.head !== 'none' }],
  variants: [{ name: 'Hand-drawn beam', props: { look: 'beam', pts: '0,0; 25,0', lambda: 633, stroke: '#e63946' }, keywords: 'manual beam drawn beam fake beam illustration ray' }],
  bbox: p => {
    const P = parse(p.pts); if (!P.length) return [-2, -2, 2, 2];
    const m = Math.max(1, p.look === 'beam' ? p.beamWidth : 0.5, p.head !== 'none' ? p.headSize : 0);
    return [Math.min(...P.map(q => q[0])) - m, Math.min(...P.map(q => q[1])) - m, Math.max(...P.map(q => q[0])) + m, Math.max(...P.map(q => q[1])) + m];
  },
  draw(p) {
    const P = parse(p.pts);
    if (P.length < 2) return '';
    const d = pathOf(p), col = colourOf(p);
    let s = '';
    if (p.look === 'beam') {
      const w = Math.max(0.05, p.beamWidth || 1.2), dash = p.dash ? ` stroke-dasharray="${n(w * 2)} ${n(w * 1.4)}"` : '';
      if (p.glow) s += `<path d="${d}" fill="none" stroke="${col}" stroke-opacity="0.18" stroke-width="${n(w * 3)}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<path d="${d}" fill="none" stroke="${col}" stroke-opacity="0.3" stroke-width="${n(w * 1.8)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-opacity="0.92" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
      if (p.glow) s += `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="${n(w * 0.25)}" stroke-linecap="round" stroke-linejoin="round"/>`;
      if (p.midArrow) {
        // at half the polyline length
        let L = 0; const seg = []; for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); L += l; }
        let acc = 0, i = 0; while (i < seg.length - 1 && acc + seg[i] < L / 2) acc += seg[i++];
        const t = seg[i] ? (L / 2 - acc) / seg[i] : 0, a = P[i], b = P[i + 1];
        s += H.arrowHead(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0]), Math.max(1.2, w * 1.8), U.darken(col, 0.2));
      }
    } else {
      const w = U.pt2mm(p.width || 0.6);
      const fill = p.closed && p.fill ? p.fill : 'none';
      s += `<path d="${d}" fill="${fill}" fill-opacity="${p.fillOpacity}" stroke="${p.stroke || 'none'}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"${p.dash ? ` stroke-dasharray="${n(Math.max(w, 0.2) * 4)} ${n(Math.max(w, 0.2) * 3)}"` : ''}/>`;
    }
    if (!p.closed && p.head && p.head !== 'none') {
      const hc = p.look === 'beam' ? U.darken(col, 0.2) : (p.stroke || '#222222'), hs = p.headSize || 1.6;
      if (p.head === 'end' || p.head === 'both') s += H.arrowHead(P[P.length - 1][0], P[P.length - 1][1], endDir(P, true), hs, hc);
      if (p.head === 'start' || p.head === 'both') s += H.arrowHead(P[0][0], P[0][1], endDir(P, false), hs, hc);
    }
    return s;
  },
  // a handle on every point
  extraHandles: p => parse(p.pts).map((q, i) => ({ key: 'v' + i, x: q[0], y: q[1], title: 'Point ' + (i + 1) })),
  dragHandle(p, key, q) {
    const P = parse(p.pts), i = +key.slice(1);
    if (P[i]) { P[i] = [U.round(q[0], 2), U.round(q[1], 2)]; p.pts = fmt(P); }
  },
});
lib.drawingPts = { parse, fmt };
})();
