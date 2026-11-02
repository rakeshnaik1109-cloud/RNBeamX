/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/built.js
   Parts made in Layer Studio ▸ Part (the Part Builder).

   A design (props.design, mm, in the part's own frame where light
   travels along +x) is:
     shapes  — closed shapes combined in order, each added to or cut
               from the body: rect (w, h, r), ellipse (rx, ry), polygon
               (pts), lens (D, tc, R1, R2: + convex, − concave, 0 flat),
               each with x, y, rot
     curves  — thin open surfaces: line (L), arc (spherical, R, A),
               parabola (f, A, offset); role mirror / splitter / absorber
     body    — what the body does: glass (mat or n), opaque (absorbs),
               mirror (all faces reflect) or none (drawing only);
               faces { "shapeId:face": role } override single faces
     sources — beams that leave the part: x, y, angle, λ, power, width
     d3      — 3D: extrude (height) or revolve (round parts)
     look    — colour, finish (glass, metal, matte, mirror), opacity

   The outline comes from signed distance functions combined with
   min / max (add / cut) and contoured by marching squares, so any
   combination is valid; every edge knows which face of which shape
   it belongs to.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const G = RNBX.partGeo = {};

/* ---------- signed distance of one shape (negative inside) ---------- */
const local = (sh, x, y) => { const a = -(sh.rot || 0) * Math.PI / 180, dx = x - (sh.x || 0), dy = y - (sh.y || 0); return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; };
const segDist = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, t = U.clamp(((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy || 1), 0, 1); return Math.hypot(px - ax - t * vx, py - ay - t * vy); };
G.sdf = (sh, x, y) => {
  const [u, v] = local(sh, x, y);
  if (sh.kind === 'rect') {
    const r = Math.min(+sh.r || 0, sh.w / 2, sh.h / 2), qx = Math.abs(u) - sh.w / 2 + r, qy = Math.abs(v) - sh.h / 2 + r;
    const d = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
    return { d, f: qx > qy ? (u > 0 ? 'right' : 'left') : (v > 0 ? 'bottom' : 'top') };
  }
  if (sh.kind === 'ellipse') { const rx = Math.max(1e-3, sh.rx), ry = Math.max(1e-3, sh.ry), k = Math.hypot(u / rx, v / ry); return { d: (k - 1) * Math.min(rx, ry), f: 'rim' }; }
  if (sh.kind === 'polygon') {
    const p = sh.pts || []; let d = Infinity, f = 0, c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const e = segDist(u, v, p[j][0], p[j][1], p[i][0], p[i][1]); if (e < d) { d = e; f = j; }
      if ((p[i][1] > v) !== (p[j][1] > v) && u < (p[j][0] - p[i][0]) * (v - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c;
    }
    return { d: c ? -d : d, f: 'e' + f };
  }
  if (sh.kind === 'lens') {
    const tc = Math.max(0.05, +sh.tc || 3), D = Math.max(0.1, +sh.D || 10), R1 = +sh.R1 || 0, R2 = +sh.R2 || 0;
    const front = R1 > 0 ? Math.hypot(u - (-tc / 2 + R1), v) - R1 : R1 < 0 ? -R1 - Math.hypot(u - (-tc / 2 + R1), v) : -tc / 2 - u;
    const back = R2 > 0 ? Math.hypot(u - (tc / 2 - R2), v) - R2 : R2 < 0 ? -R2 - Math.hypot(u - (tc / 2 - R2), v) : u - tc / 2;
    const rim = Math.abs(v) - D / 2;
    if (front >= back && front >= rim) return { d: front, f: 'front' };
    return back >= rim ? { d: back, f: 'back' } : { d: rim, f: 'rim' };
  }
  return { d: 1e9, f: '' };
};
/* outward unit normal of face f ("shapeId:face") at a point: gradient of that shape's distance */
G.normal = (shapes, f, p) => {
  const id = f.split(':')[0], sh = shapes.find(q => q.id === id); if (!sh) return null;
  const e = 1e-4, g = (x, y) => G.sdf(sh, x, y).d;
  let gx = (g(p[0] + e, p[1]) - g(p[0] - e, p[1])) / (2 * e), gy = (g(p[0], p[1] + e) - g(p[0], p[1] - e)) / (2 * e);
  if (sh.op === 'cut') { gx = -gx; gy = -gy; }
  const l = Math.hypot(gx, gy); return l > 1e-9 ? [gx / l, gy / l] : null;
};
/* all shapes, in order: add = union, cut = difference */
G.eval = (shapes, x, y) => {
  let d = 1e9, f = '';
  shapes.forEach(sh => {
    const r = G.sdf(sh, x, y);
    if (sh.op === 'cut') { if (-r.d > d) { d = -r.d; f = sh.id + ':' + r.f; } }
    else if (r.d < d) { d = r.d; f = sh.id + ':' + r.f; }
  });
  return { d, f };
};
G.shapeBox = sh => {
  const ext = sh.kind === 'rect' ? [sh.w / 2, sh.h / 2] : sh.kind === 'ellipse' ? [sh.rx, sh.ry] : sh.kind === 'lens' ? [(+sh.tc || 3) / 2 + (sh.D || 10) / 2, (sh.D || 10) / 2]
    : [Math.max(...(sh.pts || [[0, 0]]).map(p => Math.abs(p[0]))), Math.max(...(sh.pts || [[0, 0]]).map(p => Math.abs(p[1])))];
  const r = Math.hypot(ext[0], ext[1]) + 0.5;
  return [(sh.x || 0) - r, (sh.y || 0) - r, (sh.x || 0) + r, (sh.y || 0) + r];
};

/* ---------- marching squares → closed outlines with face labels ---------- */
const rdp = (pts, tol) => {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let best = -1, bi = -1;
    for (let i = a + 1; i < b; i++) { const e = segDist(pts[i][0], pts[i][1], pts[a][0], pts[a][1], pts[b][0], pts[b][1]); if (e > best) { best = e; bi = i; } }
    if (best > tol) { keep[bi] = 1; st.push([a, bi], [bi, b]); }
  }
  return pts.filter((p, i) => keep[i]);
};
const cache = new Map();
G.outline = shapes => {
  const adds = (shapes || []).filter(s => s.op !== 'cut');
  if (!adds.length) return { rings: [], box: [-1, -1, 1, 1] };
  const key = JSON.stringify(shapes);
  if (cache.has(key)) return cache.get(key);
  const bs = adds.map(G.shapeBox), x0 = Math.min(...bs.map(b => b[0])) - 1, y0 = Math.min(...bs.map(b => b[1])) - 1, x1 = Math.max(...bs.map(b => b[2])) + 1, y1 = Math.max(...bs.map(b => b[3])) + 1;
  const h = Math.max((Math.max(x1 - x0, y1 - y0)) / 420, 0.004), nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1;
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) v[j * nx + i] = G.eval(shapes, x0 + i * h, y0 + j * h).d;
  const P = new Map(), adj = new Map();
  const pt = (k, ax, ay, va, bx, by, vb) => { if (!P.has(k)) { const t = va / (va - vb); P.set(k, [ax + (bx - ax) * t, ay + (by - ay) * t]); } return k; };
  const link = (a, b) => { (adj.get(a) || adj.set(a, []).get(a)).push(b); (adj.get(b) || adj.set(b, []).get(b)).push(a); };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = v[j * nx + i], b = v[j * nx + i + 1], c = v[(j + 1) * nx + i + 1], d = v[(j + 1) * nx + i];
    const ia = a < 0, ib = b < 0, ic = c < 0, id = d < 0;
    if (ia === ib && ib === ic && ic === id) continue;
    const X = x0 + i * h, Y = y0 + j * h, E = [];
    if (ia !== ib) E[0] = pt('h' + i + ',' + j, X, Y, a, X + h, Y, b);
    if (ib !== ic) E[1] = pt('v' + (i + 1) + ',' + j, X + h, Y, b, X + h, Y + h, c);
    if (ic !== id) E[2] = pt('h' + i + ',' + (j + 1), X + h, Y + h, c, X, Y + h, d);
    if (id !== ia) E[3] = pt('v' + i + ',' + j, X, Y + h, d, X, Y, a);
    const es = E.map((k, q) => (k ? q : -1)).filter(q => q >= 0);
    if (es.length === 2) link(E[es[0]], E[es[1]]);
    else if (es.length === 4) {
      const cen = (a + b + c + d) / 4 < 0;
      if (cen === ia) { link(E[0], E[1]); link(E[2], E[3]); } else { link(E[0], E[3]); link(E[1], E[2]); }
    }
  }
  // walk the loops
  const seen = new Set(), loops = [];
  adj.forEach((nb, start) => {
    if (seen.has(start)) return;
    const loop = []; let prev = null, cur = start;
    while (cur != null && !seen.has(cur)) { seen.add(cur); loop.push(P.get(cur)); const nx2 = adj.get(cur).find(q => q !== prev && !seen.has(q)); prev = cur; cur = nx2; }
    if (loop.length >= 3) loops.push(loop);
  });
  // simplify, keeping corners where the face changes
  const tol = h * 0.06;
  const rings = loops.map(loop => {
    const faces = loop.map((p, i) => { const q = loop[(i + 1) % loop.length]; return G.eval(shapes, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2).f; });
    let breaks = []; faces.forEach((f, i) => { if (f !== faces[(i - 1 + faces.length) % faces.length]) breaks.push(i); });
    if (!breaks.length) { let far = 0, fd = -1; loop.forEach((p, i) => { const e = Math.hypot(p[0] - loop[0][0], p[1] - loop[0][1]); if (e > fd) { fd = e; far = i; } }); breaks = [0, far]; }
    const out = [], of = [];
    breaks.forEach((b, k) => {
      const e = breaks[(k + 1) % breaks.length], chain = [];
      for (let i = b; ; i = (i + 1) % loop.length) { chain.push(loop[i]); if (i === e) break; if (chain.length > loop.length + 1) break; }
      const simp = rdp(chain, tol);
      simp.slice(0, -1).forEach((p, i) => { out.push(p); const q = simp[i + 1]; of.push(G.eval(shapes, (p[0] + q[0]) / 2, (p[1] + q[1]) / 2).f); });
    });
    // exact normals at both ends of every edge, from the shape the edge belongs to,
    // so curved faces refract and reflect as smooth surfaces
    const pts = out.map(p => [U.round(p[0], 5), U.round(p[1], 5)]);
    const nrm = pts.map((p, i) => { const f = of[i], q = pts[(i + 1) % pts.length]; return [G.normal(shapes, f, p), G.normal(shapes, f, q)]; });
    return { pts, faces: of, nrm };
  }).filter(r => r.pts.length >= 3);
  // holes: rings inside an odd number of other rings
  const inside = (q, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > q[1]) !== (r[j][1] > q[1]) && q[0] < (r[j][0] - r[i][0]) * (q[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  rings.forEach((r, i) => { r.hole = rings.filter((o, j) => j !== i && inside(r.pts[0], o.pts)).length % 2 === 1; });
  const all = rings.flatMap(r => r.pts), box = all.length ? [Math.min(...all.map(p => p[0])), Math.min(...all.map(p => p[1])), Math.max(...all.map(p => p[0])), Math.max(...all.map(p => p[1]))] : [-1, -1, 1, 1];
  const res = { rings, box, h };
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(key, res);
  return res;
};
/* the faces of the outline: { key, label, len } (for the face list) */
G.faces = res => {
  const m = new Map();
  res.rings.forEach(r => r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length], k = r.faces[i]; m.set(k, (m.get(k) || 0) + Math.hypot(q[0] - p[0], q[1] - p[1])); }));
  return [...m.entries()].filter(e => e[1] > 1e-3).map(([key, len]) => ({ key, len }));
};

/* ---------- thin curves: polylines in the part frame ---------- */
G.curvePts = c => {
  const out = [], tr = (u, v) => { const a = (c.rot || 0) * Math.PI / 180; return [(c.x || 0) + u * Math.cos(a) - v * Math.sin(a), (c.y || 0) + u * Math.sin(a) + v * Math.cos(a)]; };
  if (c.kind === 'line') { out.push(tr(0, -c.L / 2), tr(0, c.L / 2)); return out; }
  if (c.kind === 'arc') {
    const R = +c.R || 50, A = Math.min(Math.abs(R) * 1.98, +c.A || 10), pm = Math.asin(A / 2 / Math.abs(R)), N = Math.max(24, Math.ceil(A / 0.15));
    for (let i = 0; i <= N; i++) { const p = -pm + 2 * pm * i / N; out.push(tr(-R + R * Math.cos(p), Math.abs(R) * Math.sin(p))); }
    return out;
  }
  if (c.kind === 'parabola') {
    const f = Math.max(0.1, +c.f || 25), A = +c.A || 10, o = +c.offset || 0, N = Math.max(24, Math.ceil(A / 0.15));
    for (let i = 0; i <= N; i++) { const y = o - A / 2 + A * i / N; out.push(tr(-y * y / (4 * f), y)); }
    return out;
  }
  return out;
};
const ROLE = { mirror: { kind: 'mirror', R: 1 }, absorb: { kind: 'absorb' }, pass: { kind: 'pass' } };
const roleOf = (r, R) => (r === 'splitter' ? { kind: 'splitter', R: R == null ? 0.5 : R } : ROLE[r] || null);

/* ---------- the part's optics ---------- */
G.optics = ds => {
  const res = G.outline(ds.shapes), b = ds.body || {}, out = [], faces = b.faces || {};
  if (b.kind === 'glass' && res.rings.length) {
    const edgeKinds = res.rings.map(r => r.faces.map(f => { const o = faces[f]; return o && o !== 'glass' ? roleOf(o, (b.faceR || {})[f]) : null; }));
    out.push({ rings: res.rings.map(r => r.pts), normals: res.rings.map(r => r.nrm), mat: b.mat === 'custom' ? 'custom' : b.mat || 'N-BK7', n: +b.n || 1.5, edgeKinds });
  } else if ((b.kind === 'opaque' || b.kind === 'mirror') && res.rings.length) {
    const dflt = b.kind === 'mirror' ? 'mirror' : 'absorb';
    res.rings.forEach(r => r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length], k = roleOf(faces[r.faces[i]] && faces[r.faces[i]] !== 'glass' ? faces[r.faces[i]] : dflt, (b.faceR || {})[r.faces[i]]); if (k) out.push(Object.assign({ a: p, b: q, nA: r.nrm[i][0], nB: r.nrm[i][1] }, k)); }));
  }
  const glassAt = b.kind === 'glass' && res.rings.length ? 0 : null;   // curves inside the glass are seen from inside it too
  (ds.curves || []).forEach(c => {
    const k = roleOf(c.role || 'mirror', c.R); if (!k) return;
    const pts = G.curvePts(c), nv = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; };
    for (let i = 0; i < pts.length - 1; i++) out.push(Object.assign({ a: pts[i], b: pts[i + 1], nA: nv(i), nB: nv(i + 1), withinIdx: glassAt }, k));
  });
  return out;
};

/* ---------- 3D ---------- */
const capWithHoles = (outer, holes) => {
  // join every hole to the outline by a zero-width slit, so the cap is one polygon
  let poly = outer.slice();
  holes.forEach(hole => {
    let bi = 0, bj = 0, bd = Infinity;
    hole.forEach((p, i) => poly.forEach((q, j) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd) { bd = d; bi = i; bj = j; } }));
    const h2 = hole.slice(bi).concat(hole.slice(0, bi + 1));
    poly = poly.slice(0, bj + 1).concat(h2, [poly[bj]], poly.slice(bj + 1));
  });
  return poly;
};
G.solid = (ds, bh) => {
  const res = G.outline(ds.shapes), d3 = ds.d3 || {}, hh = Math.max(0.1, +d3.h || 10) / 2, z0 = bh - hh, z1 = bh + hh, look = ds.look || {}, faces = [];
  const inside = (q, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > q[1]) !== (r[j][1] > q[1]) && q[0] < (r[j][0] - r[i][0]) * (q[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c; return c; };
  if (d3.mode === 'revolve') {
    // the half with y ≥ 0, turned about the x axis
    const K = 32;
    res.rings.forEach(r => {
      const pts = r.pts;
      for (let i = 0; i < pts.length; i++) {
        let a = pts[i], b = pts[(i + 1) % pts.length];
        if (a[1] < 0 && b[1] < 0) continue;
        if (a[1] < 0 || b[1] < 0) { const t = a[1] / (a[1] - b[1]), m = [a[0] + (b[0] - a[0]) * t, 0]; if (a[1] < 0) a = m; else b = m; }
        if (Math.abs(a[1]) < 1e-6 && Math.abs(b[1]) < 1e-6) continue;
        for (let k = 0; k < K; k++) {
          const p1 = 2 * Math.PI * k / K, p2 = 2 * Math.PI * (k + 1) / K, at = (q, p) => [q[0], q[1] * Math.cos(p), bh + q[1] * Math.sin(p)];
          faces.push([at(a, p1), at(b, p1), at(b, p2), at(a, p2)]);
        }
      }
    });
  } else {
    res.rings.forEach(r => r.pts.forEach((p, i) => { const q = r.pts[(i + 1) % r.pts.length]; faces.push([[p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z1], [p[0], p[1], z1]]); }));
    res.rings.filter(r => !r.hole).forEach(o => {
      const holes = res.rings.filter(r => r.hole && inside(r.pts[0], o.pts)).map(r => r.pts);
      const cap = capWithHoles(o.pts, holes);
      faces.push(cap.map(p => [p[0], p[1], z1]), cap.map(p => [p[0], p[1], z0]).reverse());
    });
  }
  const fin = look.finish || (ds.body && ds.body.kind === 'glass' ? 'glass' : 'matte'), col = look.color;
  const mat = fin === 'glass' ? (col ? { color: col, alpha: look.alpha == null ? 0.35 : look.alpha, spec: 0.6 } : 'glass') : fin === 'mirror' ? 'mirror' : fin === 'metal' ? { color: col || '#b9bec6', spec: 0.8 } : { color: col || '#4b525c' };
  const parts = faces.length ? [{ kind: 'faces', faces, mat }] : [];
  (ds.curves || []).forEach(c => {
    const pts = G.curvePts(c), t = Math.max(0.2, +c.t || 1), m2 = c.role === 'absorb' ? { color: '#22252a' } : c.role === 'splitter' ? 'glass' : 'mirror';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = dy / l * t, ny = -dx / l * t;
      parts.push({ kind: 'faces', faces: [[[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], [[a[0] + nx, a[1] + ny, z0], [b[0] + nx, b[1] + ny, z0], [b[0] + nx, b[1] + ny, z1], [a[0] + nx, a[1] + ny, z1]],
        [[a[0], a[1], z1], [b[0], b[1], z1], [b[0] + nx, b[1] + ny, z1], [a[0] + nx, a[1] + ny, z1]]], mat: m2 });
    }
  });
  return parts;
};

/* ---------- the component ---------- */
const DEFAULT = {
  name: 'Plano-convex lens',
  shapes: [{ id: 's1', kind: 'lens', op: 'add', x: 0, y: 0, rot: 0, D: 20, tc: 5, R1: 25, R2: 0 }],
  curves: [], sources: [],
  body: { kind: 'glass', mat: 'N-BK7', n: 1.5, faces: {} },
  d3: { mode: 'revolve', h: 20 }, look: { finish: 'glass', color: '', alpha: 0.35 },
};
G.DEFAULT = DEFAULT;
lib.register({
  type: 'built', name: 'Built part', category: 'Samples & mechanics', abbr: 'BP', labelTemplate: '',
  keywords: 'part builder custom shape own component lens prism mirror housing glass body extrude revolve',
  defaults: { design: DEFAULT, title: 'Built part' },
  params: [{ key: 'title', label: 'Name', type: 'text' }],
  hint: 'Made in Layer Studio ▸ Part: select it and press “Open in the Part Builder” to change it.',
  snap: 'perp', labelPos: [0, 9], mount: true,
  bbox: p => { const r = G.outline((p.design || DEFAULT).shapes), b = r.box.slice(); (p.design.curves || []).forEach(c => G.curvePts(c).forEach(q => { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); })); return [b[0] - 0.3, b[1] - 0.3, b[2] + 0.3, b[3] + 0.3]; },
  draw(p, S) {
    const ds = p.design || DEFAULT, res = G.outline(ds.shapes), look = ds.look || {}, b = ds.body || {}, lw = n(S.lw);
    const fin = look.finish || (b.kind === 'glass' ? 'glass' : 'matte');
    const fill = fin === 'glass' ? (look.color ? look.color : S.fill('glass')) : fin === 'mirror' ? S.fill('mirror') : (look.color || (fin === 'metal' ? '#b9bec6' : '#4b525c'));
    const path = res.rings.map(r => 'M ' + r.pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ') + ' Z').join(' ');
    let s = path ? `<path d="${path}" fill="${fill}" fill-rule="evenodd" ${fin === 'glass' && look.color ? `fill-opacity="${look.alpha == null ? 0.35 : look.alpha}"` : ''} stroke="${S.ink}" stroke-width="${lw}" stroke-linejoin="round"/>` : '';
    // coated faces
    const faces = b.faces || {};
    res.rings.forEach(r => r.pts.forEach((q, i) => {
      const role = faces[r.faces[i]]; if (!role || role === 'glass') return;
      const t = r.pts[(i + 1) % r.pts.length];
      s += `<line x1="${n(q[0])}" y1="${n(q[1])}" x2="${n(t[0])}" y2="${n(t[1])}" stroke="${role === 'mirror' ? '#8c96a3' : role === 'absorb' ? '#16181c' : '#6d8fb3'}" stroke-width="${n(S.lw * 3)}" stroke-linecap="round" ${role === 'splitter' ? `stroke-dasharray="${n(S.lw * 3)} ${n(S.lw * 2)}"` : ''}/>`;
    }));
    // thin surfaces, with the back of a mirror hatched
    (ds.curves || []).forEach(c => {
      const pts = G.curvePts(c), dd = 'M ' + pts.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ');
      const col = c.role === 'absorb' ? '#16181c' : c.role === 'splitter' ? '#6d8fb3' : c.role === 'pass' ? '#9aa1ab' : '#5d6670';
      s += `<path d="${dd}" fill="none" stroke="${col}" stroke-width="${n(S.lw * 2.6)}" stroke-linecap="round" ${c.role === 'splitter' ? `stroke-dasharray="${n(S.lw * 3)} ${n(S.lw * 2)}"` : ''}/>`;
      if (c.role === 'mirror' || !c.role) {
        const step = Math.max(1, Math.round(pts.length / 12)), t = Math.max(0.4, +c.t || 1);
        for (let i = 0; i < pts.length - 1; i += step) { const a = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], dx = q[0] - a[0], dy = q[1] - a[1], l = Math.hypot(dx, dy) || 1; s += `<line x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(a[0] + dy / l * t + dx / l * t * 0.6)}" y2="${n(a[1] - dx / l * t + dy / l * t * 0.6)}" stroke="${S.ink}" stroke-width="${n(S.lw * 0.6)}"/>`; }
      }
    });
    return s || H.text(S, 0, 0, 'Empty part', { size: S.fs, color: '#6b7280' });
  },
  optics: p => G.optics(p.design || DEFAULT),
  source: p => ((p.design || DEFAULT).sources || []).map(q => { const a = (q.angle || 0) * Math.PI / 180, P = +q.power || 1;
    return { o: [q.x || 0, q.y || 0], d: [Math.cos(a), Math.sin(a)], lambda: +q.lambda || 633, P, E: RNBX.optics.scaleJ(RNBX.optics.jones('H'), Math.sqrt(P)), w: (+q.width || 0.7) / 2, dw: Math.tan((+q.div || 0) * Math.PI / 180) }; }),
  solid: (p, bh) => G.solid(p.design || DEFAULT, bh),
});
})();
