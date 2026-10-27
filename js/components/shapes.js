/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/shapes.js
   Generic drawing parts for building your own illustrations:
   instruments, stages, molecules, lamps… from simple pieces.

   • 3D shape: box, cylinder (upright or lying), tube, cone,
     pyramid, sphere, hemisphere, wedge, in the same oblique
     projection as the building blocks, shaded from one light.
   • Atom and bond: assemble ball-and-stick molecules by hand
     (bonds single, double, triple or dashed).
   • Free polygon / path: any outline from a list of points,
     straight or smoothed, open or closed.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n, OB = lib.oblique;
const CAT = 'Shapes';
lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);

const contrast = c => { const r = U.hexToRgb(c); return r[0] * 0.3 + r[1] * 0.59 + r[2] * 0.11 < 140 ? '#ffffff' : '#111111'; };
const pts = a => a.map(p => n(p[0]) + ' ' + n(p[1])).join(' L ');
const poly = (a, fill, extra = '') => `<path d="M ${pts(a)} Z" fill="${fill}" ${extra}/>`;
const hull = P => {
  const a = P.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cr = (o, p, q) => (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]);
  const lo = [], up = [];
  for (const p of a) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = a.length - 1; i >= 0; i--) { const p = a[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
};
const shape = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

/* ================= 3D shape ================= */
const SHAPES = [['box', 'Box'], ['cylinder', 'Cylinder (upright)'], ['rod', 'Cylinder (lying)'], ['tube', 'Tube (hollow)'], ['cone', 'Cone'], ['pyramid', 'Pyramid'], ['sphere', 'Sphere'], ['dome', 'Hemisphere'], ['wedge', 'Wedge / ramp']];
shape({
  type: 'shape3d', name: '3D shape',
  keywords: 'shape 3d box cube cuboid cylinder tube pipe cone pyramid sphere ball hemisphere dome wedge ramp primitive instrument stage housing build',
  defaults: { kind: 'box', W: 20, Hh: 8, D: 12, color: '#7f9cc0', opacity: 1, gloss: true, outline: true, text: '', textSize: 7, wall: 0.25, ang: 32, depthK: 0.55 },
  params: [
    { key: 'kind', label: 'Shape', type: 'select', options: SHAPES },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 0.2, max: 400, step: 0.5, animatable: true },
    { key: 'Hh', label: 'Height', type: 'number', unit: 'mm', min: 0.2, max: 400, step: 0.5, animatable: true },
    { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 0.2, max: 400, step: 0.5, animatable: true },
    { key: 'wall', label: 'Wall (fraction of radius)', type: 'range', min: 0.05, max: 0.9, step: 0.01, show: p => p.kind === 'tube' },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'opacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: 0.01 },
    { key: 'gloss', label: 'Glossy highlight', type: 'bool' }, { key: 'outline', label: 'Outline', type: 'bool' },
    { key: 'text', label: 'Text on the front', type: 'text' }, { key: 'textSize', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 40, step: 0.5, show: p => !!p.text },
    { key: 'ang', label: 'View angle', type: 'range', min: 5, max: 85, step: 1 }, { key: 'depthK', label: 'Depth scale', type: 'range', min: 0.1, max: 1.2, step: 0.01 },
  ],
  variants: [
    { name: 'Cylinder', props: { kind: 'cylinder', W: 10, Hh: 14, D: 10, color: '#9b8fc4' } },
    { name: 'Sphere', props: { kind: 'sphere', W: 10, Hh: 10, D: 10, color: '#6fb7a8' } },
    { name: 'Cone', props: { kind: 'cone', W: 10, Hh: 12, D: 10, color: '#d98f6a' } },
    { name: 'Tube', props: { kind: 'tube', W: 10, Hh: 16, D: 10, color: '#a7b4c4', wall: 0.2 } },
    { name: 'Lying cylinder', props: { kind: 'rod', W: 24, Hh: 6, D: 6, color: '#c4a35a' } },
  ],
  // origin: centre of the front-bottom edge; depth recedes up and to the right
  bbox(p) { const c = OB.cam(p.ang, p.depthK); return [-p.W / 2 - 0.4, -p.Hh - p.D * c.ky - 0.4, p.W / 2 + p.D * c.kx + 0.4, 0.4]; },
  draw(p, S, obj) {
    const c = OB.cam(p.ang, p.depthK), W = p.W, Hh = p.Hh, D = p.D, col = p.color, id = 'rbx-s3-' + (obj ? obj.id : 'x');
    const P = (x, z, d) => OB.P(c, x, z, d);
    const st = p.outline ? `stroke="${U.darken(col, 0.5)}" stroke-width="${n(S.lw * 0.6)}" stroke-linejoin="round"` : 'stroke="none"';
    const ell = (z, rx, rd, N = 40, xc = 0, dc = D / 2) => { const a = []; for (let i = 0; i < N; i++) { const t = i / N * 2 * Math.PI; a.push(P(xc + rx * Math.cos(t), z, dc + rd * Math.sin(t))); } return a; };
    const defs = `<defs><linearGradient id="${id}-h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${U.darken(col, 0.3)}"/><stop offset="0.38" stop-color="${U.lighten(col, p.gloss ? 0.35 : 0.15)}"/><stop offset="1" stop-color="${U.darken(col, 0.35)}"/></linearGradient>` +
      `<linearGradient id="${id}-v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.lighten(col, p.gloss ? 0.35 : 0.15)}"/><stop offset="0.45" stop-color="${col}"/><stop offset="1" stop-color="${U.darken(col, 0.4)}"/></linearGradient>` +
      `<radialGradient id="${id}-r" cx="0.35" cy="0.3" r="0.75"><stop offset="0" stop-color="${p.gloss ? '#ffffff' : U.lighten(col, 0.3)}"/><stop offset="0.3" stop-color="${U.lighten(col, 0.25)}"/><stop offset="0.85" stop-color="${col}"/><stop offset="1" stop-color="${U.darken(col, 0.45)}"/></radialGradient></defs>`;
    let s = '';
    const frontText = (z) => p.text ? `<text x="0" y="${n(-z)}" font-family="${U.esc(S.font)}" font-size="${n(U.pt2mm(p.textSize))}" fill="${contrast(col)}" text-anchor="middle" dominant-baseline="central" font-weight="700">${RNBX.text.markup(p.text, U.pt2mm(p.textSize))}</text>` : '';
    switch (p.kind) {
      case 'cylinder': case 'tube': {
        const B = ell(0, W / 2, D / 2), T = ell(Hh, W / 2, D / 2);
        s += poly(hull(B.concat(T)), `url(#${id}-h)`, st) + poly(T, U.lighten(col, 0.22), st);
        if (p.kind === 'tube') s += poly(ell(Hh, W / 2 * (1 - p.wall), D / 2 * (1 - p.wall)), U.darken(col, 0.45), st);
        s += frontText(Hh * 0.45);
        break;
      }
      case 'rod': {
        // axis along x; circular section in the z–depth plane
        const sec = x => { const a = []; for (let i = 0; i < 40; i++) { const t = i / 40 * 2 * Math.PI; a.push(P(x, Hh / 2 + Hh / 2 * Math.sin(t), D / 2 + D / 2 * Math.cos(t))); } return a; };
        const L = sec(-W / 2), R = sec(W / 2);
        s += poly(hull(L.concat(R)), `url(#${id}-v)`, st) + poly(R, U.shadeRgb(col, 0.82), st) + frontText(Hh / 2);
        break;
      }
      case 'cone': {
        s += poly(hull(ell(0, W / 2, D / 2).concat([P(0, Hh, D / 2)])), `url(#${id}-h)`, st);
        break;
      }
      case 'pyramid': {
        const A = P(0, Hh, D / 2), b = [P(-W / 2, 0, 0), P(W / 2, 0, 0), P(W / 2, 0, D), P(-W / 2, 0, D)];
        // back faces first, then the right and the front face
        s += poly([b[3], b[2], A], U.darken(col, 0.2), st) + poly([b[0], b[3], A], U.darken(col, 0.1), st) + poly([b[1], b[2], A], U.shadeRgb(col, 0.72), st) + poly([b[0], b[1], A], col, st);
        break;
      }
      case 'sphere': {
        const r = Math.min(W, Hh) / 2, q = P(0, r, D / 2);
        s += `<circle cx="${n(q[0])}" cy="${n(q[1])}" r="${n(r)}" fill="url(#${id}-r)" ${st}/>`;
        break;
      }
      case 'dome': {
        const sp = [];
        for (let i = 0; i <= 10; i++) for (let k = 0; k < 20; k++) { const th = i / 10 * Math.PI / 2, ph = k / 20 * 2 * Math.PI; sp.push(P(W / 2 * Math.sin(th) * Math.cos(ph), Hh * Math.cos(th), D / 2 + D / 2 * Math.sin(th) * Math.sin(ph))); }
        s += poly(hull(sp), `url(#${id}-r)`, st);
        break;
      }
      case 'wedge': {
        // high side on the left, sloping down to the right
        s += poly([P(-W / 2, Hh, 0), P(W / 2, 0, 0), P(W / 2, 0, D), P(-W / 2, Hh, D)], U.lighten(col, 0.18), st) + poly([P(-W / 2, 0, 0), P(W / 2, 0, 0), P(-W / 2, Hh, 0)], col, st) + frontText(Hh * 0.3);
        break;
      }
      default: { // box
        s += `<g transform="translate(${n(-W / 2)} 0)">${OB.box(c, 0, 0, W, Hh, D, col, S, p.outline ? {} : { stroke: false })}</g>`;
        if (p.gloss) s += poly([P(-W / 2, Hh, 0), P(W / 2, Hh, 0), P(W / 2, Hh, D), P(-W / 2, Hh, D)], `url(#${id}-v)`, 'opacity="0.35"');
        s += frontText(Hh / 2);
      }
    }
    return defs + (p.opacity < 1 ? `<g opacity="${n(p.opacity)}">${s}</g>` : s);
  },
});

/* ================= Atom and bond ================= */
shape({
  type: 'atom', name: 'Atom',
  keywords: 'atom ball sphere molecule chemistry element ball and stick build',
  defaults: { r: 1.8, color: '#8fa3c7', symbol: '', size: 6, gloss: true },
  params: [{ key: 'r', label: 'Radius', type: 'number', unit: 'mm', min: 0.1, max: 40, step: 0.1, animatable: true },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'symbol', label: 'Symbol (e.g. C, O, N)', type: 'text' },
    { key: 'size', label: 'Symbol size', type: 'number', unit: 'pt', min: 2, max: 30, step: 0.5, show: p => !!p.symbol }, { key: 'gloss', label: 'Glossy', type: 'bool' }],
  variants: [
    { name: 'Atom (dark)', props: { color: '#4b5563', r: 1.8 } },
    { name: 'Atom (warm)', props: { color: '#d9785b', r: 1.7 } },
    { name: 'Atom (small, light)', props: { color: '#e8ecf1', r: 1.0 } },
  ],
  bbox: p => [-p.r - 0.2, -p.r - 0.2, p.r + 0.2, p.r + 0.2],
  draw(p, S, obj) {
    const id = 'rbx-atom-' + (obj ? obj.id : 'x'), c = p.color;
    let s = `<defs><radialGradient id="${id}" cx="0.36" cy="0.32" r="0.72"><stop offset="0" stop-color="${p.gloss ? '#ffffff' : U.lighten(c, 0.3)}"/><stop offset="0.28" stop-color="${U.lighten(c, 0.28)}"/><stop offset="0.82" stop-color="${c}"/><stop offset="1" stop-color="${U.darken(c, 0.42)}"/></radialGradient></defs>` +
      `<circle cx="0" cy="0" r="${n(p.r)}" fill="url(#${id})" stroke="${U.darken(c, 0.5)}" stroke-width="${n(Math.max(0.05, S.lw * 0.4))}"/>`;
    if (p.symbol) s += `<text x="0" y="0" font-family="${U.esc(S.font)}" font-size="${n(Math.min(U.pt2mm(p.size), p.r * 1.3))}" fill="${contrast(c)}" text-anchor="middle" dominant-baseline="central" font-weight="700">${RNBX.text.markup(p.symbol)}</text>`;
    return s;
  },
});
shape({
  type: 'bond', name: 'Bond (stick)',
  keywords: 'bond stick line molecule chemistry single double triple hydrogen bond dashed interaction build',
  defaults: { dx: 6, dy: 0, order: 1, w: 0.5, color: '#9aa1ab', dashed: false, shaded: true },
  params: [{ key: 'order', label: 'Bond', type: 'select', options: [[1, 'Single'], [2, 'Double'], [3, 'Triple']] },
    { key: 'dashed', label: 'Dashed (e.g. hydrogen bond)', type: 'bool' }, { key: 'w', label: 'Thickness', type: 'number', unit: 'mm', min: 0.05, max: 10, step: 0.05 },
    { key: 'color', label: 'Colour', type: 'color' }, { key: 'shaded', label: 'Rounded (shaded)', type: 'bool', show: p => !p.dashed },
    { key: 'dx', label: 'Length x', type: 'number', unit: 'mm', step: 0.1 }, { key: 'dy', label: 'Length y', type: 'number', unit: 'mm', step: 0.1 }],
  variants: [{ name: 'Dashed bond', props: { dashed: true, color: '#5b8bd0', w: 0.35 } }],
  handles: p => [{ key: 'end', x: p.dx, y: p.dy }],
  bbox: p => { const m = p.w * (+p.order || 1) + 0.5; return [Math.min(0, p.dx) - m, Math.min(0, p.dy) - m, Math.max(0, p.dx) + m, Math.max(0, p.dy) + m]; },
  draw(p) {
    const L = Math.hypot(p.dx, p.dy) || 1, nx = -p.dy / L, ny = p.dx / L, ord = +p.order || 1;
    const offs = ord === 1 ? [0] : ord === 2 ? [-0.9, 0.9] : [-1.5, 0, 1.5];
    let s = '';
    offs.forEach(o => {
      const ox = nx * p.w * o, oy = ny * p.w * o, g = `x1="${n(ox)}" y1="${n(oy)}" x2="${n(p.dx + ox)}" y2="${n(p.dy + oy)}"`, w = ord > 1 ? p.w * 0.75 : p.w;
      if (p.dashed) s += `<line ${g} stroke="${p.color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-dasharray="${n(w * 1.6)} ${n(w * 1.8)}"/>`;
      else s += `<line ${g} stroke="${U.darken(p.color, 0.35)}" stroke-width="${n(w)}" stroke-linecap="round"/>` + (p.shaded ? `<line ${g} stroke="${U.lighten(p.color, 0.45)}" stroke-width="${n(w * 0.45)}" stroke-linecap="round"/>` : '');
    });
    return s;
  },
});

/* ================= Free polygon / path ================= */
const parsePts = t => String(t || '').split(/[;\n]+/).map(q => q.trim().split(/[\s,]+/).map(Number)).filter(q => q.length >= 2 && isFinite(q[0]) && isFinite(q[1]));
/* Catmull–Rom through the points → cubic Bézier path */
const smoothPath = (P, closed) => {
  if (P.length < 3) return 'M ' + pts(P);
  const get = i => closed ? P[(i + P.length) % P.length] : P[U.clamp(i, 0, P.length - 1)];
  let d = `M ${n(P[0][0])} ${n(P[0][1])}`;
  const N = closed ? P.length : P.length - 1;
  for (let i = 0; i < N; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += ` C ${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(p2[1] - (p3[1] - p1[1]) / 6)} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d + (closed ? ' Z' : '');
};
shape({
  type: 'polyshape', name: 'Free polygon / path',
  keywords: 'polygon path freeform outline shape custom points curve smooth bezier draw build',
  defaults: { pts: '0,0; 14,0; 18,-6; 4,-9', closed: true, smooth: false, fill: '#b9c8de', fillOpacity: 1, stroke: '#3b4656', width: 0.5, gradient: true, dash: false },
  params: [
    { key: 'pts', label: 'Points x, y in mm (one pair per line or separated by ;)', type: 'textarea' },
    { key: 'closed', label: 'Closed shape', type: 'bool' }, { key: 'smooth', label: 'Smooth curve through the points', type: 'bool' },
    { key: 'fill', label: 'Fill', type: 'color', allowEmpty: true }, { key: 'fillOpacity', label: 'Fill opacity', type: 'range', min: 0, max: 1, step: 0.01 },
    { key: 'gradient', label: 'Shaded fill', type: 'bool', show: p => !!p.fill },
    { key: 'stroke', label: 'Outline', type: 'color', allowEmpty: true }, { key: 'width', label: 'Outline weight', type: 'number', unit: 'pt', min: 0, max: 12, step: 0.05 },
    { key: 'dash', label: 'Dashed outline', type: 'bool' }],
  variants: [{ name: 'Smooth blob', props: { pts: '0,0; 8,-3; 16,0; 14,7; 5,8', smooth: true, fill: '#c9b8de' } }, { name: 'Open curve', props: { pts: '0,0; 6,-5; 12,0; 18,-5', closed: false, smooth: true, fill: '' } }],
  bbox: p => { const P = parsePts(p.pts); if (!P.length) return [-2, -2, 2, 2]; const xs = P.map(q => q[0]), ys = P.map(q => q[1]); return [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1]; },
  draw(p, S, obj) {
    const P = parsePts(p.pts);
    if (P.length < 2) return '';
    const d = p.smooth ? smoothPath(P, p.closed) : 'M ' + pts(P) + (p.closed ? ' Z' : '');
    const id = 'rbx-poly-' + (obj ? obj.id : 'x'), w = U.pt2mm(p.width);
    const fill = p.fill && p.closed ? (p.gradient ? `url(#${id})` : p.fill) : 'none';
    const defs = p.fill && p.gradient ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${U.lighten(p.fill, 0.3)}"/><stop offset="1" stop-color="${U.darken(p.fill, 0.18)}"/></linearGradient></defs>` : '';
    return defs + `<path d="${d}" fill="${fill}" fill-opacity="${p.fillOpacity}" stroke="${p.stroke || 'none'}" stroke-width="${n(w)}" stroke-linejoin="round" stroke-linecap="round" ${p.dash ? `stroke-dasharray="${n(Math.max(w, 0.2) * 4)} ${n(Math.max(w, 0.2) * 3)}"` : ''}/>`;
  },
});
})();
