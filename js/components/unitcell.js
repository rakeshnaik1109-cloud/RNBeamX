/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/unitcell.js
   Patterned structure: a periodic (1D) structure designed in
   Layer Studio ▸ Pattern, drawn as a few periods in the same
   oblique view as the other device sketches. The unit cell
   (props.pattern, real units in nm) is also what the grating
   calculation (RCWA) uses, so a linked panel shows its R, T, A.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const flatL = ls => (window.RNBX.rcwa ? window.RNBX.rcwa.flatLayers(ls) : (ls || []).filter(L => L && !L.group));
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n, OB = lib.oblique;
const PT = () => RNBX.rcwa.pattern;

const DEFAULT = { name: 'Lamellar grating', period: 400, ambient: 'air', ambientN: 1.33, side: 'top', orders: 15, slices: 12,
  substrate: { mat: 'glass:N-BK7', name: 'Glass', color: '#cfe6f2' },
  layers: [{ name: 'Lines', mat: 'air', color: '#ffffff', nm: 150, shapes: [{ kind: 'trap', x: 200, wb: 200, wt: 200, shift: 0, mat: 'TiO2', name: 'TiO₂', color: '#f0d27a' }] }] };
const AIRISH = m => !m || m === 'air';

/* a 2D array in the oblique view: rows of extruded shapes, drawn back to front */
const outline2 = sh => {
  const ring = (r1, r2, k = 32) => Array.from({ length: k }, (_, i) => { const a = 2 * Math.PI * i / k; return [sh.x + r1 * Math.cos(a), sh.y + r2 * Math.sin(a)]; });
  if (sh.kind === 'rect') return [[sh.x - sh.wx / 2, sh.y - sh.wy / 2], [sh.x + sh.wx / 2, sh.y - sh.wy / 2], [sh.x + sh.wx / 2, sh.y + sh.wy / 2], [sh.x - sh.wx / 2, sh.y + sh.wy / 2]];
  if (sh.kind === 'cross') { const a = sh.L / 2, b = sh.w / 2, x = sh.x, y = sh.y; return [[x - b, y - a], [x + b, y - a], [x + b, y - b], [x + a, y - b], [x + a, y + b], [x + b, y + b], [x + b, y + a], [x - b, y + a], [x - b, y + b], [x - a, y + b], [x - a, y - b], [x - b, y - b]]; }
  if (sh.kind === 'ring') return ring(sh.r, sh.r);
  return ring(sh.rx || sh.r || 1, sh.ry || sh.rx || sh.r || 1);
};
function draw2(p, S, g) {
  const c = g.c, ox = -p.W / 2, ink = S.ink, lw = n(S.lw * 0.5), W = p.W, D = g.D, sx = g.sx, py = Math.max(1, +g.pat.py || g.P);
  const Pp = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + ox, q[1]]; };
  const edge = `stroke="${ink}" stroke-opacity="0.45" stroke-width="${lw}" stroke-linejoin="round"`;
  const poly = (a, fill, extra = edge) => OB.poly(a, fill, extra);
  const bgPage = RNBX.isDarkPage(S.doc.page) ? '#0b1020' : '#ffffff';
  const area = q => { let a = 0; q.forEach((u, i) => { const v = q[(i + 1) % q.length]; a += u[0] * v[1] - v[0] * u[1]; }); return a / 2; };
  let s = OB.box(c, ox, 0, W, g.subT, D, (g.pat.substrate || {}).color || '#cfe6f2', S, { stroke: ink }), uid = 0;
  const id0 = 'rbx-uc2-' + Math.round((p.W + g.top) * 100) + '-';
  g.L.forEach(({ q, z0, z1 }) => {
    const solid = !AIRISH(q.mat), col = q.color || '#c8c8c8';
    if (solid) s += OB.box(c, ox, z0, W, z1 - z0, D, col, S, { stroke: ink });
    const inst = [];
    for (let j = g.rows - 1; j >= 0; j--) for (let i = 0; i < g.N; i++) (q.shapes || []).forEach(sh => {
      // outline in (x, depth) mm, depth measured from the front
      const pts = outline2(sh).map(([x, y]) => [(x - sh.x + (((sh.x % g.P) + g.P) % g.P) + i * g.P) * sx, (y - sh.y + (((sh.y % py) + py) % py) + j * py) * sx]);
      if (pts.some(t => t[0] < -1e-6 || t[0] > W + 1e-6 || t[1] < -1e-6 || t[1] > D + 1e-6)) return;
      inst.push({ sh, pts: area(pts) < 0 ? pts.slice().reverse() : pts, dmin: Math.min(...pts.map(t => t[1])) });
    });
    inst.sort((a, b) => b.dmin - a.dmin);
    inst.forEach(({ sh, pts }) => {
      const air = AIRISH(sh.mat), sc = sh.color || '#c8c8c8';
      const top = pts.map(t => Pp(t[0], z1, t[1])), bot = pts.map(t => Pp(t[0], z0, t[1]));
      const sides = (want) => pts.map((a, k) => { const b = pts[(k + 1) % pts.length], quad = [Pp(a[0], z0, a[1]), Pp(b[0], z0, b[1]), Pp(b[0], z1, b[1]), Pp(a[0], z1, a[1])], ar = area(quad);
        if (want * ar <= 0) return ''; const nx = (b[1] - a[1]), nd = -(b[0] - a[0]), l = Math.hypot(nx, nd) || 1, k2 = 0.72 + 0.2 * (nx / l) - 0.12 * (nd / l);
        return poly(quad, U.shadeRgb(air ? col : sc, k2), `stroke="${U.shadeRgb(air ? col : sc, k2)}" stroke-width="0.04"`); }).join('');
      if (air && solid) {
        // a hole: its floor and far walls, seen through the opening
        const cid = id0 + (uid++);
        s += `<defs><clipPath id="${cid}"><path d="M ${top.map(t => n(t[0]) + ' ' + n(t[1])).join(' L ')} Z"/></clipPath></defs><g clip-path="url(#${cid})">` +
          poly(bot, U.shadeRgb(col, 0.55), 'stroke="none"') + sides(1) + '</g>';
      } else if (!air) {
        s += sides(-1) + poly(top, U.lighten(sc, 0.14));
        if (sh.kind === 'ring' && sh.rin > 0) {
          // the hole of a ring: floor and far inner wall, seen through it
          const off = [pts.reduce((a, t) => a + t[0], 0) / pts.length, pts.reduce((a, t) => a + t[1], 0) / pts.length];
          const inner = Array.from({ length: 32 }, (_, k) => { const a = 2 * Math.PI * k / 32; return [off[0] + sh.rin * sx * Math.cos(a), off[1] + sh.rin * sx * Math.sin(a)]; });
          const itop = inner.map(t => Pp(t[0], z1, t[1])), cid = id0 + (uid++);
          const walls = inner.map((a, k2) => { const b = inner[(k2 + 1) % inner.length], quad = [Pp(a[0], z0, a[1]), Pp(b[0], z0, b[1]), Pp(b[0], z1, b[1]), Pp(a[0], z1, a[1])]; return area(quad) > 0 ? poly(quad, U.shadeRgb(sc, 0.62), 'stroke="none"') : ''; }).join('');
          s += `<defs><clipPath id="${cid}"><path d="M ${itop.map(t => n(t[0]) + ' ' + n(t[1])).join(' L ')} Z"/></clipPath></defs><g clip-path="url(#${cid})">` + poly(inner.map(t => Pp(t[0], z0, t[1])), U.shadeRgb(solid ? col : '#9aa3ad', 0.6), 'stroke="none"') + walls + '</g>' + poly(itop, 'none');
        }
      }
    });
    if (p.labels && q.name && (z1 - z0) > S.fs * 0.8) s += `<text x="${n(Pp(W, (z0 + z1) / 2, 0)[0] - 1)}" y="${n(Pp(W, (z0 + z1) / 2, 0)[1])}" font-family="${U.esc(S.font)}" font-size="${n(Math.min(S.fs, (z1 - z0) * 0.8))}" text-anchor="end" dominant-baseline="central" fill="${ink}">${RNBX.text.markup(q.name)}</text>`;
  });
  return s;
}

lib.register({
  type: 'ucell', name: 'Patterned structure (unit cell)', category: 'Nanostructures & films', annotation: true, autoLabel: false, abbr: '',
  keywords: 'grating unit cell periodic pattern metasurface lamellar trapezoid slanted blazed sawtooth sinusoidal wire grid gmr rcwa layer studio',
  defaults: { pattern: DEFAULT, periods: 5, rows: 4, W: 50, D: 16, ang: 32, depthK: 0.55, vex: 0, labels: false,
    calc: { scan: 'wl', lmin: 400, lmax: 1000, angle: 0, pol: 'p', show: 'RTA', points: 151, unit: 'nm', amin: 0, amax: 89, lambda: 633, method: 'auto', orders: 15, slices: 12, rpoints: 151 } },
  params: [
    { key: 'periods', label: 'Periods drawn', type: 'number', min: 1, max: 40, step: 1 },
    { key: 'W', label: 'Width', type: 'number', unit: 'mm', min: 5, max: 300, step: 0.5 },
    { key: 'D', label: 'Depth', type: 'number', unit: 'mm', min: 1, max: 200, step: 0.5, show: p => (p.pattern || {}).dim !== 2 },
    { key: 'rows', label: 'Rows drawn (in depth)', type: 'number', min: 1, max: 30, step: 1, show: p => (p.pattern || {}).dim === 2 },
    { key: 'vex', label: 'Height scale (0 = automatic)', type: 'number', min: 0, max: 50, step: 0.5, hint: 'heights are stretched when the structure is very flat' },
    { key: 'labels', label: 'Layer names on the front', type: 'bool' },
    { key: 'ang', label: 'View angle', type: 'range', min: 5, max: 85, step: 1 },
    { key: 'depthK', label: 'Depth scale', type: 'range', min: 0.1, max: 1.2, step: 0.01 },
  ],
  calcParams: [],
  grating: p => {
    if (!RNBX.rcwa) return null;
    const pat = p.pattern || DEFAULT, c = p.calc || {};
    if (pat.dim === 2) { const m = +c.orders2 || 0; return RNBX.rcwa.fromPattern2(pat, { mx: m || pat.mx, my: m || pat.my }); }
    return RNBX.rcwa.fromPattern(pat, { orders: c.orders, slices: c.slices });
  },
  /* without RCWA: the layers as flat films of their own (background) material */
  stack: p => {
    const pat = p.pattern || DEFAULT, films = flatL(pat.layers).filter(L => +L.nm > 0).map(L => ({ m: { mat: L.mat, n: L.n, k: L.k }, d: +L.nm }));
    const amb = { mat: pat.ambient || 'air', n: pat.ambientN, k: 0 }, sub = pat.substrate || { mat: 'air' };
    return pat.side === 'bottom' ? { inc: sub, layers: films.slice().reverse(), sub: amb } : { inc: amb, layers: films, sub };
  },
  calcNote: p => (p.pattern || {}).dim === 2 ? `2D unit cell ${U.fmt(p.pattern.px, 0)} × ${U.fmt(p.pattern.py, 0)} nm. Open it in Layer Studio ▸ Pattern to change the shapes, check convergence and see the near field.` : `Unit cell: period ${U.fmt((p.pattern || DEFAULT).period, 0)} nm. Open it in Layer Studio ▸ Pattern to change the shapes; there you also get the diffraction orders and a wavelength × angle map.`,
  resizable: false,
  geom(p) {
    const pat = p.pattern || DEFAULT, dim2 = pat.dim === 2, P = Math.max(1, +(dim2 ? pat.px : pat.period) || 400), N = Math.max(1, Math.round(p.periods) || 1);
    const sx = p.W / (N * P), tot = flatL(pat.layers).reduce((a, L) => a + (+L.nm || 0), 0) || 1;
    const vex = +p.vex > 0 ? +p.vex : Math.max(1, Math.min(20, Math.round((p.W * 0.22) / (tot * sx)))), sz = sx * vex;
    const subT = Math.max(2, p.W * 0.16), c = OB.cam(p.ang, p.depthK);
    const layers = flatL(pat.layers).slice().reverse();   // bottom → top
    let z = subT; const L = layers.map(q => { const r = { q, z0: z, z1: z + (+q.nm || 0) * sz }; z = r.z1; return r; });
    const rows = Math.max(1, Math.round(p.rows) || 4), D = dim2 ? rows * Math.max(1, +pat.py || P) * sx : p.D;
    return { pat, P, N, sx, sz, vex, subT, c, L, top: z, dim2, rows, D };
  },
  bbox(p) { const g = this.geom(p); return [-p.W / 2 - 0.5, -g.top - g.D * g.c.ky - 1, p.W / 2 + g.D * g.c.kx + 0.5, 0.5]; },
  draw(p, S) {
    const g = this.geom(p), c = g.c, D = g.D, ox = -p.W / 2, P = g.P, ink = S.ink, lw = n(S.lw * 0.55);
    if (g.dim2) return draw2(p, S, g);
    const Pp = (x, z, d) => { const q = OB.P(c, x, z, d); return [q[0] + ox, q[1]]; };
    const edge = `stroke="${ink}" stroke-opacity="0.5" stroke-width="${lw}" stroke-linejoin="round"`;
    const poly = (a, fill, extra = edge) => OB.poly(a, fill, extra);
    const bgPage = RNBX.isDarkPage(S.doc.page) ? '#0b1020' : '#ffffff';
    const colOf = q => q.color || '#c8c8c8';
    let s = OB.box(c, ox, 0, p.W, g.subT, D, (g.pat.substrate || {}).color || '#cfe6f2', S, { stroke: ink });
    // extruded faces of one outline (pts in mm, front plane), shaded by facing
    const faces = (pts, col, keep) => {
      let out = '';
      pts.forEach((a, i) => {
        const b = pts[(i + 1) % pts.length], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
        if (l < 1e-6) return;
        const nx = dz / l, nz = -dx / l;              // outward normal for a counter-clockwise outline
        if (!keep(nx, nz, a, b)) return;
        const k = 0.78 + 0.32 * nz + 0.08 * nx;
        out += poly([Pp(a[0], a[1], 0), Pp(b[0], b[1], 0), Pp(b[0], b[1], D), Pp(a[0], a[1], D)], U.shadeRgb(nz > 0.5 ? U.lighten(col, 0.12) : col, k), `stroke="${U.shadeRgb(col, k)}" stroke-width="0.04"`);
      });
      return out;
    };
    const ccw = pts => { let a = 0; pts.forEach((q, i) => { const r = pts[(i + 1) % pts.length]; a += q[0] * r[1] - r[0] * q[1]; }); return a < 0 ? pts.slice().reverse() : pts; };
    g.L.forEach(({ q, z0, z1 }) => {
      const solidBg = !AIRISH(q.mat), copies = PT().copies(q, 0, P, g.N).sort((a, b) => Math.min(...a.pts.map(t => t[0])) - Math.min(...b.pts.map(t => t[0])));
      const mm = pts => ccw(pts.map(t => [t[0] * g.sx, z0 + t[1] * g.sz]));
      const W = g.N * P * g.sx;
      // background film of this layer
      if (solidBg) {
        s += poly([Pp(W, z0, 0), Pp(W, z0, D), Pp(W, z1, D), Pp(W, z1, 0)], U.shadeRgb(colOf(q), 0.72));
        s += poly([Pp(0, z1, 0), Pp(W, z1, 0), Pp(W, z1, D), Pp(0, z1, D)], U.lighten(colOf(q), 0.16));
      }
      let fronts = '';
      copies.forEach(cp => {
        const pts = mm(cp.pts), sh = cp.sh, col = colOf(sh), air = AIRISH(sh.mat);
        if (air && solidBg) {
          // a groove: its opening, the floor and the wall that faces the viewer
          const top = pts.filter(t => Math.abs(t[1] - z1) < 1e-6);
          if (top.length >= 2) { const xa = Math.min(...top.map(t => t[0])), xb = Math.max(...top.map(t => t[0])); s += poly([Pp(xa, z1, 0), Pp(xb, z1, 0), Pp(xb, z1, D), Pp(xa, z1, D)], bgPage, 'stroke="none"'); }
          s += faces(pts.slice().reverse(), colOf(q), (nx, nz) => nz > 0.3 || nx > 0.3);
          fronts += poly(pts.map(t => Pp(t[0], t[1], 0)), bgPage);
        } else if (!air) {
          s += faces(pts, col, (nx, nz, a, b) => (solidBg ? Math.abs(a[1] - z1) < 1e-6 && Math.abs(b[1] - z1) < 1e-6 : nz > 0.02 || nx > 0.02));
          fronts += poly(pts.map(t => Pp(t[0], t[1], 0)), col);
        }
      });
      if (solidBg) s += poly([Pp(0, z0, 0), Pp(W, z0, 0), Pp(W, z1, 0), Pp(0, z1, 0)], colOf(q));
      s += fronts;
      if (p.labels && q.name && (z1 - z0) > S.fs * 0.8) s += `<text x="${n(Pp(W, (z0 + z1) / 2, 0)[0] - 1)}" y="${n(Pp(W, (z0 + z1) / 2, 0)[1])}" font-family="${U.esc(S.font)}" font-size="${n(Math.min(S.fs, (z1 - z0) * 0.8))}" text-anchor="end" dominant-baseline="central" fill="${ink}">${RNBX.text.markup(q.name)}</text>`;
    });
    return s;
  },
});
})();
