/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/renderer3d.js
   "3D" figure style: the same layout and the same traced beams,
   shown on an optical table from any camera angle.

   Orthographic camera:  yaw φ about the table normal, then pitch θ.
     x1 = X cosφ − Y sinφ,  y1 = X sinφ + Y cosφ
     u  = x1,  v = y1 sinθ − z cosθ,  depth = y1 cosθ + z sinθ
   Components become small convex meshes (cylinders, boxes,
   extruded polygons) with flat Lambert + specular shading, drawn
   back-to-front together with beam chunks (painter's algorithm).
   Output is pure vector SVG.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, n = v => U.round(v, 3);
const R3 = RNBX.render3d = {};

const MATS = {
  mirror: { color: '#dfe5ec', spec: 0.9 }, glass: { color: '#bfe1f8', alpha: 0.42, spec: 0.8, edge: '#7fa9cc' },
  metal: { color: '#c3c8cf', spec: 0.6 }, anod: { color: '#2f343b', spec: 0.35 }, dark: { color: '#3e444d', spec: 0.4 },
  black: { color: '#1f2226', spec: 0.3 }, body: { color: '#eceef1', spec: 0.25 }, laser: { color: '#30353d', spec: 0.45 }, laserhead: { color: '#dfe3e9', spec: 0.55 },
  crystal: { color: '#f2b3cf', alpha: 0.7, spec: 0.7 }, gold: { color: '#e2bb57', spec: 0.8 }, grating: { color: '#c9a64a', spec: 0.9, iri: true },
  wph: { color: '#cbb4ec', alpha: 0.72, spec: 0.6 }, wpq: { color: '#a7d8e4', alpha: 0.72, spec: 0.6 }, polar: { color: '#5d6672', alpha: 0.78, spec: 0.5 },
  post: { color: '#c8ccd2', spec: 0.7 },
};
const mat = m => typeof m === 'object' && m ? Object.assign({ spec: 0.4 }, m) : (MATS[m] || MATS.body);

const LIGHT = (() => { const l = [-0.45, 0.35, 0.82], k = Math.hypot(...l); return l.map(v => v / k); })();

/* ---------- camera ---------- */
R3.camera = (doc) => {
  const v3 = doc.view3d, W = doc.page.width, H = doc.page.height;
  const phi = U.rad(v3.yaw), th = U.rad(U.clamp(v3.pitch, 5, 90));
  const cf = Math.cos(phi), sf = Math.sin(phi), ct = Math.cos(th), sth = Math.sin(th);
  const cx = W / 2, cy = H / 2;
  const raw = (x, y, z) => {
    const X = x - cx, Y = y - cy;
    const x1 = X * cf - Y * sf, y1 = X * sf + Y * cf;
    return [x1, y1 * sth - z * ct, y1 * ct + z * sth];
  };
  // frame the table (page area) plus headroom for tall parts
  const zt = (v3.beamHeight || 6) * 2.2;
  const pts = [];
  [[0, 0], [W, 0], [W, H], [0, H]].forEach(([x, y]) => { pts.push(raw(x, y, -2.5)); pts.push(raw(x, y, zt)); });
  const us = pts.map(p => p[0]), vs = pts.map(p => p[1]);
  const u0 = Math.min(...us), u1 = Math.max(...us), w0 = Math.min(...vs), w1 = Math.max(...vs);
  const m = Math.min(W, H) * 0.04;
  const k = Math.min((W - 2 * m) / (u1 - u0), (H - 2 * m) / (w1 - w0)) * (v3.zoom || 1);
  const uc = (u0 + u1) / 2, vc = (w0 + w1) / 2;
  const ox = W / 2 + (v3.panX || 0), oy = H / 2 + (v3.panY || 0);
  const cam = {
    k, phi, th, raw,
    p(x, y, z) { const r = raw(x, y, z); return [ox + (r[0] - uc) * k, oy + (r[1] - vc) * k, r[2]]; },
    /* screen point → table-plane point at height z (for dragging in 3D) */
    unproject(sx, sy, z) {
      const u = (sx - ox) / k + uc, v = (sy - oy) / k + vc;
      const y1 = (v + z * ct) / sth, x1 = u;
      const X = x1 * cf + y1 * sf, Y = -x1 * sf + y1 * cf;
      return [X + cx, Y + cy];
    },
    facing(nrm) { return (nrm[0] * sf + nrm[1] * cf) * ct + nrm[2] * sth; },
  };
  return cam;
};

/* ---------- meshes ---------- */
const SEG = 22;
function cylX(x0, x1, r0, r1, cy, cz) {
  const ring = (x, r) => { const a = []; for (let i = 0; i < SEG; i++) { const t = i / SEG * 2 * Math.PI; a.push([x, cy + r * Math.cos(t), cz + r * Math.sin(t)]); } return a; };
  const A = ring(x0, r0), B = ring(x1, r1), faces = [A.slice().reverse(), B];
  for (let i = 0; i < SEG; i++) { const j = (i + 1) % SEG; faces.push([A[i], A[j], B[j], B[i]]); }
  return faces;
}
/* disc of radius r and thickness t, centred at c, axis along a (any direction) */
function diskAxis(c, a, r, t, seg = 22) {
  const l = Math.hypot(a[0], a[1], a[2]) || 1, ax = a.map(v => v / l);
  const ref = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const cr = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
  let u = cr(ax, ref); const ul = Math.hypot(...u); u = u.map(v => v / ul);
  const v = cr(ax, u);
  const ring = off => { const out = []; for (let i = 0; i < seg; i++) { const th = i / seg * 2 * Math.PI, co = Math.cos(th) * r, si = Math.sin(th) * r; out.push([0, 1, 2].map(k => c[k] + ax[k] * off + u[k] * co + v[k] * si)); } return out; };
  const A = ring(-t / 2), B = ring(t / 2), faces = [A.slice().reverse(), B];
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; faces.push([A[i], A[j], B[j], B[i]]); }
  return faces;
}
function vcyl(cx, cy, r, z0, z1, seg = 16) {
  const ring = z => { const a = []; for (let i = 0; i < seg; i++) { const t = i / seg * 2 * Math.PI; a.push([cx + r * Math.cos(t), cy + r * Math.sin(t), z]); } return a; };
  const A = ring(z0), B = ring(z1), faces = [A.slice().reverse(), B];
  for (let i = 0; i < seg; i++) { const j = (i + 1) % seg; faces.push([A[i], A[j], B[j], B[i]]); }
  return faces;
}
function extrude(pts, z0, z1) {
  const A = pts.map(p => [p[0], p[1], z0]), B = pts.map(p => [p[0], p[1], z1]);
  const faces = [A.slice().reverse(), B];
  for (let i = 0; i < pts.length; i++) { const j = (i + 1) % pts.length; faces.push([A[i], A[j], B[j], B[i]]); }
  return faces;
}
const boxFaces = (x, y, z) => extrude([[x[0], y[0]], [x[1], y[0]], [x[1], y[1]], [x[0], y[1]]], z[0], z[1]);

function newell(pts) {
  let nx = 0, ny = 0, nz = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/* default solid when a component defines none: its footprint as a block */
function fallbackSolid(def, p, bh) {
  const b = def.bbox ? def.bbox(p) : [-2, -2, 2, 2];
  return [{ kind: 'box', x: [b[0], b[2]], y: [b[1], b[3]], z: [0, bh + 2], mat: 'body' }];
}

/* world-space faces for one object */
R3.objectFaces = (obj, doc) => {
  const def = lib.get(obj.type), bh = doc.view3d.beamHeight || 6, s = obj.scale || 1;
  const parts = (def.solid ? def.solid(obj.props, bh) : fallbackSolid(def, obj.props, bh)) || [];
  const out = [];
  const zc = bh + (obj.z || 0);
  const vert = RNBX.isVertical(obj), dir = obj.axis === 'down' ? -1 : 1;
  const zmap = z => Math.max(0, zc + (z - bh) * s);
  // vertical-axis parts: the local optical axis (+x) becomes the world z axis
  const W = vert
    ? (p) => { const w = U.toWorld(obj, [p[2] - bh, p[1]]); return [w[0], w[1], zc + p[0] * s * dir]; }
    : (p) => { const w = U.toWorld(obj, [p[0], p[1]]); return [w[0], w[1], zmap(p[2])]; };
  let r0max = 0;
  for (const part of parts) {
    let faces;
    switch (part.kind) {
      case 'cyl': faces = cylX(part.x[0], part.x[1], part.r[0], part.r[1], part.cy || 0, part.cz == null ? bh : part.cz); r0max = Math.max(r0max, part.r[0], part.r[1]); break;
      case 'vcyl': faces = vcyl(part.cx, part.cy, part.r, part.z[0], part.z[1], 28); break;
      case 'disk3': faces = diskAxis(part.c, part.nrm, part.r, part.t || 1); r0max = Math.max(r0max, part.r); break;
      case 'poly': faces = extrude(part.pts, part.z[0], part.z[1]); r0max = Math.max(r0max, (part.z[1] - part.z[0]) / 2); break;
      default: faces = boxFaces(part.x, part.y, part.z); if (part.z[0] > 0.5) r0max = Math.max(r0max, (part.z[1] - part.z[0]) / 2);
    }
    const wf = faces.map(f => f.map(W));
    const cen = [0, 1, 2].map(i => wf.reduce((a, f) => a + f.reduce((b, q) => b + q[i], 0) / f.length, 0) / wf.length);
    for (const f of wf) {
      let nrm = newell(f);
      const fc = [0, 1, 2].map(i => f.reduce((a, q) => a + q[i], 0) / f.length);
      if ((fc[0] - cen[0]) * nrm[0] + (fc[1] - cen[1]) * nrm[1] + (fc[2] - cen[2]) * nrm[2] < 0) nrm = nrm.map(v => -v);
      out.push({ pts: f, n: nrm, m: mat(part.mat), part, decal: !!part.decal });
    }
  }
  void r0max;
  // post + base for mounted optics (a side rod for optics lying flat in a tower)
  if (def.mount && !def.noPost && doc.view3d.posts !== false) {
    let zmin = Infinity, rad = 0;
    out.forEach(f => f.pts.forEach(q => { zmin = Math.min(zmin, q[2]); rad = Math.max(rad, Math.hypot(q[0] - obj.x, q[1] - obj.y)); }));
    const pr = (def.postR || 0.6) * s;
    const c = vert ? U.toWorld(obj, [0, rad + pr + 0.3]) : U.toWorld(obj, [0, 0]);
    const top = vert ? zc + 0.5 : Math.max(0, zmin - 0.1);
    const add = (faces, m) => {
      const cen = [c[0], c[1], top / 2];
      faces.forEach(f => {
        let nrm = newell(f);
        const fc = [0, 1, 2].map(i => f.reduce((a, q) => a + q[i], 0) / f.length);
        if ((fc[0] - cen[0]) * nrm[0] + (fc[1] - cen[1]) * nrm[1] + (fc[2] - cen[2]) * nrm[2] < 0) nrm = nrm.map(v => -v);
        out.push({ pts: f, n: nrm, m: mat(m) });
      });
    };
    if (top > 0.3) add(vcyl(c[0], c[1], pr, 0.6, top, 12), 'post');
    add(vcyl(c[0], c[1], pr * 2.1, 0, 0.6, 14), 'anod');
  }
  return out;
};

function shadeColor(face, cam) {
  const m = face.m, nrm = face.n;
  const lam = Math.max(0, nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1] + nrm[2] * LIGHT[2]);
  let k = 0.5 + 0.62 * lam;
  let c = U.shadeRgb(m.color, Math.min(1.25, k));
  // specular: light reflected toward the viewer
  const view = [Math.sin(cam.phi) * Math.cos(cam.th), Math.cos(cam.phi) * Math.cos(cam.th), Math.sin(cam.th)];
  const h = [LIGHT[0] + view[0], LIGHT[1] + view[1], LIGHT[2] + view[2]], hl = Math.hypot(...h);
  const sp = Math.pow(Math.max(0, (nrm[0] * h[0] + nrm[1] * h[1] + nrm[2] * h[2]) / hl), 24) * (m.spec || 0);
  if (sp > 0.02) c = U.mix(c, '#ffffff', Math.min(0.85, sp));
  if (m.iri) c = U.mix(c, ['#7a5cff', '#22c38e', '#ff8a3d'][Math.abs(Math.round(nrm[0] * 3 + nrm[1] * 2)) % 3], 0.35);
  return c;
}

/* ---------- scene ---------- */
R3.scene = (doc, trace, S, opt = {}) => {
  const cam = R3.camera(doc);
  const v3 = doc.view3d, W = doc.page.width, H = doc.page.height, bh = v3.beamHeight || 6, k = cam.k;
  const I = opt.interactive;
  let table = '';
  // table slab
  if (v3.table !== false) {
    const tc = v3.tableColor || '#2c3036', th = 2.5;
    const top = [[0, 0], [W, 0], [W, H], [0, H]].map(q => cam.p(q[0], q[1], 0));
    const bot = [[0, 0], [W, 0], [W, H], [0, H]].map(q => cam.p(q[0], q[1], -th));
    const sides = [];
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const a = [[0, 0], [W, 0], [W, H], [0, H]][i], b = [[0, 0], [W, 0], [W, H], [0, H]][j];
      const nx = (b[1] - a[1]), ny = -(b[0] - a[0]), l = Math.hypot(nx, ny);
      const nrm = [nx / l, ny / l, 0];
      if (cam.facing(nrm) > 0) sides.push(`<path d="M ${[top[i], top[j], bot[j], bot[i]].map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${U.shadeRgb(tc, 0.65 + 0.25 * Math.max(0, nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1]))}"/>`);
    }
    table += sides.join('');
    table += `<path d="M ${top.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="${tc}"/>`;
    if (v3.holes !== false) {
      const pitch = 5, rx = Math.max(0.08, 0.3 * k), ry = rx * Math.sin(cam.th);
      let d = '';
      for (let x = pitch / 2; x < W; x += pitch) for (let y = pitch / 2; y < H; y += pitch) {
        const q = cam.p(x, y, 0);
        d += `M ${n(q[0] - rx)} ${n(q[1])} a ${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0 a ${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0 `;
      }
      table += `<path d="${d}" fill="${U.darken(tc, 0.45)}" fill-opacity="0.9"/>`;
    }
    // a soft sheen across the table top
    table += `<defs><linearGradient id="rbx-tablesheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.10"/><stop offset="0.6" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs><path d="M ${top.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ')} Z" fill="url(#rbx-tablesheen)"/>`;
  }

  const items = [];
  let shadows = '';
  let labels = '';
  const dark3 = RNBX.isDarkPage(doc.page);
  for (const obj of (lib.expandIfNeeded ? lib.expandIfNeeded(doc.objects) : doc.objects)) {
    const def = lib.get(obj.type);
    if (!def || obj.hidden || def.annotation || def.special) continue;
    if (def.connection) {
      // fibres and wires lie on the table surface
      const g = def.geometry(obj, doc);
      if (!g) continue;
      const pts = [];
      if (g.c1) { for (let i = 0; i <= 24; i++) { const t = i / 24, mt = 1 - t; pts.push([0, 1].map(j => mt * mt * mt * g.a[j] + 3 * mt * mt * t * g.c1[j] + 3 * mt * t * t * g.c2[j] + t * t * t * g.b[j])); } } else pts.push(...g.pts);
      const sc = pts.map(q => cam.p(q[0], q[1], 0.4));
      let col = obj.type === 'fiber' ? (obj.props.color || doc.style.fiberColor) : (obj.props.color || '#9aa1ab');
      if (obj.type === 'fiber' && obj.props.colorMode === 'light' && trace.fiberLight[obj.id]) { const fl = trace.fiberLight[obj.id]; col = lib.colorOf(doc, Number(Object.keys(fl).sort((a, b) => fl[b] - fl[a])[0])); }
      const d = 'M ' + sc.map(q => n(q[0]) + ' ' + n(q[1])).join(' L ');
      items.push({ z: -1e6, svg: `<g ${I ? `data-id="${obj.id}"` : ''}><path d="${d}" fill="none" stroke="${U.darken(col, 0.3)}" stroke-width="${n(Math.max(0.3, U.pt2mm(obj.props.width || 0.8) * k * 1.6))}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${n(Math.max(0.2, U.pt2mm(obj.props.width || 0.8) * k))}" stroke-linecap="round" stroke-linejoin="round"/></g>` });
      continue;
    }
    const faces = R3.objectFaces(obj, doc);
    if (!faces.length) continue;
    // depth of the object's optical centre
    const c3 = cam.p(obj.x, obj.y, bh + (obj.z || 0));
    let zmax = 0;
    faces.forEach(f => f.pts.forEach(q => { if (q[2] > zmax) zmax = q[2]; }));
    // projected faces
    const proj = faces.map(f => {
      const sp = f.pts.map(q => cam.p(q[0], q[1], q[2]));
      return { f, sp, depth: sp.reduce((a, q) => a + q[2], 0) / sp.length, vis: cam.facing(f.n) > 0 };
    });
    const opaque = proj.filter(q => !q.f.m.alpha && q.vis);
    const trans = proj.filter(q => q.f.m.alpha);
    let svg = '';
    trans.filter(q => !q.vis).sort((a, b) => a.depth - b.depth).forEach(q => { svg += facePath(q, cam, 0.55); });
    // decals (stripes, bands) sit on a body's surface, so they go after it
    opaque.sort((a, b) => (a.f.decal - b.f.decal) || (a.depth - b.depth)).forEach(q => { svg += facePath(q, cam, 1); });
    trans.filter(q => q.vis).sort((a, b) => a.depth - b.depth).forEach(q => { svg += facePath(q, cam, 1); });
    items.push({ z: c3[2], svg: `<g ${I ? `data-id="${obj._group || obj.id}"` : ''}>${svg}</g>` });
    // contact shadow
    if (v3.shadow !== false) {
      const b = def.bbox ? def.bbox(obj.props) : [-2, -2, 2, 2];
      const rr = Math.max(1.2, Math.max(b[2] - b[0], b[3] - b[1]) * 0.55 * (obj.scale || 1));
      const sc = cam.p(obj.x + 0.6, obj.y + 0.9, 0);
      shadows += `<ellipse cx="${n(sc[0])}" cy="${n(sc[1])}" rx="${n(rr * k)}" ry="${n(rr * k * Math.sin(cam.th) * 0.75)}" fill="#000" fill-opacity="0.28"/>`;
    }
    // label above the part
    if (obj.label && obj.label.show && doc.style.showLabels && obj.label.text) {
      const lp = cam.p(obj.x, obj.y, zmax + 2.2);
      const lx = lp[0] + (obj.label.dx3 || 0), ly = lp[1] + (obj.label.dy3 || 0);
      if (obj.label.leader3 && RNBX.labels) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        proj.forEach(q => q.sp.forEach(p2 => { x0 = Math.min(x0, p2[0]); y0 = Math.min(y0, p2[1]); x1 = Math.max(x1, p2[0]); y1 = Math.max(y1, p2[1]); }));
        const sz = RNBX.labels.size(obj, doc);
        const rect = [lx - sz.w / 2, ly + sz.fs * 0.32 - sz.h, lx + sz.w / 2, ly + sz.fs * 0.32];
        labels += RNBX.labels.leader([x0, y0, x1, y1], rect, dark3 ? '#d5dbe4' : '#4b5563', 0.14);
      }
      labels += label3d(obj, doc, lx, ly, I);
    }
  }

  // beams, chunked for correct ordering against components
  const dark = RNBX.isDarkPage(doc.page);
  RNBX.beams.setContext(doc);
  const groups = RNBX.beams.groups(trace.segments);
  const at = (seg, u) => seg.vertical
    ? [seg.a[0], seg.a[1], bh + seg.za + (seg.zb - seg.za) * u / (seg.len || 1)]
    : [seg.a[0] + (seg.b[0] - seg.a[0]) * u / seg.len, seg.a[1] + (seg.b[1] - seg.a[1]) * u / seg.len, bh + (seg.za || 0)];
  for (const seg of trace.segments) {
    if (seg.len < 1e-4) continue;
    const grp = groups.get(seg);
    // three or more wavelengths on one path read as white light in 3D;
    // two (e.g. fundamental + second harmonic) are drawn side by side
    if (grp && (grp.skip || (grp.k > 2 && grp.i > 0))) continue;
    const white = grp && grp.k > 2;
    const col = white ? '#f4f1ea' : RNBX.beams.color(doc, seg), op = RNBX.beams.opacity(doc, seg);
    const sk = (seg.emitted ? RNBX.beams.signalScale : 1) * (grp && !white ? 1 / grp.k : 1);
    const band = grp && !white ? (grp.i - (grp.k - 1) / 2) / grp.k : 0;
    const steps = Math.max(1, Math.ceil(seg.len / 3));
    for (let i = 0; i < steps; i++) {
      const s0 = seg.len * i / steps, s1 = seg.len * (i + 1) / steps;
      const a = at(seg, s0), b = at(seg, s1);
      let pa = cam.p(a[0], a[1], a[2]), pb = cam.p(b[0], b[1], b[2]);
      const wm = (doc.style.beamStyle === 'line' ? doc.style.beamWidth * 0.5 : doc.style.beamStyle === 'ribbon' ? (doc.style.ribbonWidth || 3) * 0.7 : Math.max(0.1, 2 * RNBX.beams.hw(seg, (s0 + s1) / 2))) * sk * (seg.ghost ? 0.4 : 1);
      const w = Math.max(0.12, wm * k);
      if (seg.ghost) {
        items.push({ z: (pa[2] + pb[2]) / 2 + 0.01, svg: `<line x1="${n(pa[0])}" y1="${n(pa[1])}" x2="${n(pb[0])}" y2="${n(pb[1])}" stroke="${col}" stroke-opacity="${n(Math.max(0.35, op))}" stroke-width="${n(w)}" stroke-dasharray="${n(w * 3)} ${n(w * 3)}"/>` });
        continue;
      }
      if (band) {
        const dx = pb[0] - pa[0], dy = pb[1] - pa[1], l = Math.hypot(dx, dy) || 1, off = band * w * 2;
        const ox = -dy / l * off, oy = dx / l * off;
        pa = [pa[0] + ox, pa[1] + oy, pa[2]]; pb = [pb[0] + ox, pb[1] + oy, pb[2]];
      }
      const g = `x1="${n(pa[0])}" y1="${n(pa[1])}" x2="${n(pb[0])}" y2="${n(pb[1])}"`;
      let svg = `<line ${g} stroke="${col}" stroke-opacity="${n(0.1 * op)}" stroke-width="${n(w * 4.5 + 0.5)}" stroke-linecap="round"/>` +
        `<line ${g} stroke="${col}" stroke-opacity="${n(0.25 * op)}" stroke-width="${n(w * 2.2)}" stroke-linecap="round"/>` +
        `<line ${g} stroke="${U.lighten(col, 0.2)}" stroke-opacity="${n(op)}" stroke-width="${n(w)}" stroke-linecap="round"/>`;
      if (dark || doc.style.beamGlow) svg += `<line ${g} stroke="#ffffff" stroke-opacity="${n(0.6 * op)}" stroke-width="${n(w * 0.3)}" stroke-linecap="round"/>`;
      items.push({ z: (pa[2] + pb[2]) / 2 + 0.01, svg });
    }
  }
  // animated flow / pulses in 3D
  if (opt.time != null && RNBX.beams.hasMotion(doc, trace.segments, opt.motion)) {
    const an = doc.animation, v = an.flowSpeed || 25;
    for (const seg of trace.segments) {
      const pulsed = RNBX.beams.isPulsed(doc, seg, opt.motion);
      if ((!pulsed && !an.flow) || seg.len < 0.05 || seg.ghost) continue;
      const col = RNBX.beams.color(doc, seg), spacing = pulsed ? 14 : 7.7, plen = pulsed ? 2 : 2.2;
      let u = ((v * opt.time - seg.s0) % spacing + spacing) % spacing;
      for (; u < seg.len; u += spacing) {
        const a = Math.max(0, u - plen / 2), b = Math.min(seg.len, u + plen / 2);
        const A = at(seg, a), Bq = at(seg, b);
        const pa = cam.p(A[0], A[1], A[2]), pb = cam.p(Bq[0], Bq[1], Bq[2]);
        const w = Math.max(0.25, 2 * RNBX.beams.hw(seg, u) * k) * (pulsed ? 1.4 : 0.8);
        const g = `x1="${n(pa[0])}" y1="${n(pa[1])}" x2="${n(pb[0])}" y2="${n(pb[1])}"`;
        items.push({ z: (pa[2] + pb[2]) / 2 + 0.02, svg: `<line ${g} stroke="${col}" stroke-opacity="0.4" stroke-width="${n(w * 3)}" stroke-linecap="round"/><line ${g} stroke="#ffffff" stroke-opacity="0.92" stroke-width="${n(w)}" stroke-linecap="round"/>` });
      }
    }
  }
  items.sort((a, b) => a.z - b.z);
  return { markup: table + shadows + items.map(i => i.svg).join(''), labels, camera: cam };
};

function facePath(q, cam, alphaK) {
  const m = q.f.m;
  const fill = shadeColor(q.f, cam);
  const d = 'M ' + q.sp.map(p => n(p[0]) + ' ' + n(p[1])).join(' L ') + ' Z';
  if (m.alpha) return `<path d="${d}" fill="${fill}" fill-opacity="${n(m.alpha * alphaK)}" stroke="${m.edge || U.darken(m.color, 0.3)}" stroke-opacity="${n(0.35 * alphaK)}" stroke-width="0.06" stroke-linejoin="round"/>`;
  // a hairline in the face colour hides anti-aliasing seams between facets
  return `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="0.05" stroke-linejoin="round"/>`;
}

function label3d(obj, doc, x, y, interactive) {
  const fs = U.pt2mm(obj.label.size || doc.style.fontSizePt || 7);
  const lines = RNBX.render.labelText(obj).split('\n');
  const dark = RNBX.isDarkPage(doc.page);
  const col = obj.label.color || (dark ? '#f4f6f8' : RNBX.render.labelColor(doc));
  const halo = dark ? '#000000' : '#ffffff';
  const y0 = y - (lines.length - 1) * fs * 1.2;
  return `<g ${interactive ? `data-label="${obj.id}"` : ''} font-family="${U.esc(doc.style.font)}" font-size="${n(fs)}" fill="${col}" stroke="${halo}" stroke-opacity="0.6" stroke-width="${n(fs * 0.13)}" stroke-linejoin="round" paint-order="stroke">` +
    lines.map((l, i) => `<text x="${n(x)}" y="${n(y0 + i * fs * 1.2)}" text-anchor="middle">${RNBX.text.markup(l, fs)}</text>`).join('') + '</g>';
}
})();
