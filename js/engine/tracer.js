/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/tracer.js
   Beam tracer.

   Every source emits one or more rays. Each ray carries:
     wavelength, power, Jones vector (null = unpolarised),
     signed half-width w and slope dw (geometric envelope),
     complex q parameter (Gaussian mode), optical path length and
     extra phase (for interference), height z above the beam plane,
     and vz ≠ 0 while it travels vertically.

   Horizontal rays are traced in the table plane against the
   objects at their height. Fold mirrors and periscopes turn rays
   vertical; vertical rays meet objects whose optical axis is
   vertical (stacked lenses, objectives, samples, detectors…).

   Output: straight segments for the renderers, plus the power
   (incoherent and coherent) that reaches every absorbing element.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const U = RNBX.util, V = U.v, O = RNBX.optics, C = U.C;

const MAX_SEGMENTS = 5000;
const MAX_DEPTH = 120;
const EPS = 1e-6;
const ZMAX = 80;                       // how far a free vertical beam is drawn

RNBX.isVertical = obj => obj && (obj.axis === 'up' || obj.axis === 'down');

/* half-size of an object, used for the height tolerance of horizontal hits */
function halfSize(obj) {
  const def = RNBX.lib.get(obj.type);
  if (!def || !def.bbox) return 3;
  try { const b = def.bbox(obj.props, obj); return Math.max(1.2, Math.abs(b[1]), Math.abs(b[3])) * (obj.scale || 1); } catch (e) { return 3; }
}

/* ---------- build world-space surfaces ---------- */
function buildScene(doc) {
  const surfaces = [], vertical = [], sources = [], fibers = {};
  const scale = doc.style.scale || 10;
  for (const obj of doc.objects) {
    if (obj.hidden) continue;
    const def = RNBX.lib.get(obj.type);
    if (!def) continue;
    if (obj.type === 'fiber' && obj.props.from && obj.props.to) fibers[obj.props.from] = obj;
    const z = obj.z || 0, hz = halfSize(obj);
    if (def.optics) {
      const list = def.optics(obj.props, obj, doc) || [];
      if (RNBX.isVertical(obj)) {
        // lying flat: the first optical surface defines its behaviour
        const s0 = list.find(s => !s.poly) || (list.length ? { kind: 'pass', a: [0, -3], b: [0, 3] } : null);
        if (s0) {
          const r = Math.max(0.8, V.dist(s0.a, s0.b) / 2 * (obj.scale || 1));
          const port = obj.axis === 'up' ? 1 : -1;
          // the surface sits where it is along the component's own axis (e.g. an objective's nose)
          const zc = z + (s0.a[0] + s0.b[0]) / 2 * (obj.scale || 1) * port;
          vertical.push(Object.assign({}, s0, { obj, r, zc, c: [obj.x, obj.y], scale, port }));
        }
      } else {
        list.forEach((s, k) => {
          if (s.poly) {
            const pts = s.poly.map(p => U.toWorld(obj, p));
            const key = obj.id + ':' + k;
            const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
            for (let i = 0; i < pts.length; i++) {
              const a = pts[i], b = pts[(i + 1) % pts.length];
              const t = V.norm(V.sub(b, a));
              let n = V.perp(t);
              const mid = V.mul(V.add(a, b), 0.5);
              if (V.dot(n, V.sub(mid, [cx, cy])) < 0) n = V.mul(n, -1);   // outward
              surfaces.push({ obj, kind: 'refract', a, b, t, n, c: mid, poly: key, mat: s.mat, nCustom: s.n, scale, z, hz });
            }
          } else {
            const a = U.toWorld(obj, s.a), b = U.toWorld(obj, s.b);
            const t = V.norm(V.sub(b, a));
            surfaces.push(Object.assign({}, s, { obj, a, b, t, n: V.perp(t), c: V.mul(V.add(a, b), 0.5), scale, z, hz }));
            // fold mirrors also act on vertical beams arriving at their height
            if (s.kind === 'vfold') vertical.push(Object.assign({}, s, { obj, r: Math.max(1, V.dist(s.a, s.b) / 2 * (obj.scale || 1)), zc: z, c: [obj.x, obj.y], scale, port: s.port }));
          }
        });
      }
    }
    if (def.source && !RNBX.isVertical(obj)) {
      (def.source(obj.props, obj, doc) || []).forEach(r => {
        sources.push(Object.assign({}, r, {
          o: U.toWorld(obj, r.o), d: V.norm(U.dirToWorld(obj, r.d)), src: obj.id, z,
          w: (r.w || 0) * (obj.scale || 1), dw: r.dw || 0, ignore: obj.id,
        }));
      });
    }
  }
  return { surfaces, vertical, sources, fibers, scale };
}

/* paraxial thin-lens deflection of the central ray */
function lensDeflect(d, s, hit, f) {
  let n = s.n;
  if (V.dot(d, n) < 0) n = V.mul(n, -1);
  const h = V.dot(V.sub(hit, s.c), s.t);
  const dn = V.dot(d, n), dt = V.dot(d, s.t);
  if (Math.abs(dn) < 1e-9) return d;
  const u = dt / dn - h / f;
  return V.norm(V.add(n, V.mul(s.t, u)));
}

function exitBox(o, d, box) {
  let t0 = -Infinity, t1 = Infinity;
  for (let i = 0; i < 2; i++) {
    const lo = box[i], hi = box[i + 2];
    if (Math.abs(d[i]) < 1e-12) { if (o[i] < lo || o[i] > hi) return 0; continue; }
    let ta = (lo - o[i]) / d[i], tb = (hi - o[i]) / d[i];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
  }
  return t1 > Math.max(t0, 0) ? t1 : 0;
}

const phaseOf = ray => 2 * Math.PI * ray.opl / (ray.lambda * 1e-6) + (ray.phx || 0);

RNBX.trace = function trace(doc) {
  const { surfaces, vertical, sources, fibers, scale } = buildScene(doc);
  const W = doc.page.width, H = doc.page.height, M = 4;
  const box = [-M, -M, W + M, H + M];
  const bh = (doc.view3d && doc.view3d.beamHeight) || 6;
  const gauss = doc.style.beamModel === 'gaussian';
  const gMag = doc.style.gaussMag || 10;            // drawn width exaggeration
  const ghosts = doc.style.ghosts && doc.style.ghosts !== 'off' ? doc.style.ghosts : null;
  const segments = [], hits = {}, fiberLight = {};

  const startQ = (r, lamNm, M2) => O.qWaist(Math.max(1e-4, Math.abs(r.w || 0.35) * scale / gMag), lamNm * 1e-6, M2 || 1);
  const queue = sources.map(r => Object.assign({ s: 0, depth: 0, last: -1, inside: null, P0: r.P, z: 0, vz: 0, opl: 0, phx: 0, nmed: 1 }, r,
    { q: gauss ? startQ(r, r.lambda, r.M2) : null, M2: r.M2 || 1 }));
  let guard = 0;

  const child = (ray, patch) => Object.assign({}, ray, { depth: ray.depth + 1 }, patch);
  const record = (obj, ray) => {
    const h = hits[obj.id] = hits[obj.id] || { P: 0, lambdas: {}, fields: {}, parts: {} };
    h.P += ray.P;
    h.lambdas[ray.lambda] = (h.lambdas[ray.lambda] || 0) + ray.P;
    // coherent bookkeeping: light from the same source and wavelength interferes
    const key = ray.src + '|' + U.round(ray.lambda, 4);
    const ph = C.expi(phaseOf(ray));
    const Ej = ray.E ? ray.E : [C.c(Math.sqrt(ray.P)), C.c(0)];
    const f = [C.mul(Ej[0], ph), C.mul(Ej[1], ph)];
    const acc = h.fields[key] = h.fields[key] || [C.c(0), C.c(0)];
    acc[0] = C.add(acc[0], f[0]); acc[1] = C.add(acc[1], f[1]);
    (h.parts[key] = h.parts[key] || []).push({ f, P: ray.P, lambda: ray.lambda });
    if (gauss && ray.q) h.w = O.qRadius(ray.q, ray.lambda * 1e-6, ray.M2, ray.nmed);
  };

  /* Fresnel ghost: a weak reflection at a glass surface */
  const ghostOf = (ray, base, dRefl, cosi, n2, vertical) => {
    if (!ghosts || ray.P < ray.P0 * 2e-3) return null;
    let Rs, Rp;
    if (ghosts === 'ar') { Rs = Rp = 0.0025; }
    else { const fr = O.fresnel(cosi, 1, n2 || 1.5); Rs = fr.Rs; Rp = fr.Rp; }
    let E = null, P;
    if (ray.E) { E = [C.scale(ray.E[0], Math.sqrt(Rp)), C.scale(ray.E[1], Math.sqrt(Rs))]; P = O.powerJ(E); }
    else P = ray.P * (Rs + Rp) / 2;
    if (P < ray.P0 * 1e-4) return null;
    const g = child(ray, Object.assign({}, base, { P, E, ghost: true, phx: (ray.phx || 0) + Math.PI }));
    if (vertical) g.vz = -ray.vz; else g.d = dRefl;
    return { g, Rs, Rp };
  };
  const afterGhost = (ray, gh) => {
    if (!gh) return {};
    if (ray.E) { const E = [C.scale(ray.E[0], Math.sqrt(1 - gh.Rp)), C.scale(ray.E[1], Math.sqrt(1 - gh.Rs))]; return { E, P: O.powerJ(E) }; }
    return { P: ray.P * (1 - (gh.Rs + gh.Rp) / 2) };
  };

  /* Shared interaction for horizontal (H) and vertical (Vt) rays.
     refl(): patch for a reflected ray; straight: transmitted. */
  const interact = (ray, s, hit, base, out, ctx) => {
    const vert = ctx.vertical;
    const d = ray.d;
    const refl = () => vert ? { vz: -ray.vz } : { d: V.reflect(d, s.n) };
    const cosi = vert ? 1 : Math.abs(V.dot(d, s.n));
    const w = base.w;
    // the beam as it arrives at this surface (q, path length) — not as it left the last one
    const qa = base.q;
    const rayAt = Object.assign({}, ray, { q: qa, opl: base.opl, w });
    const lensQ = f => (qa ? { q: O.qLens(qa, f * scale) } : {});
    switch (s.kind) {
      case 'mirror': {
        const R = s.R == null ? 1 : s.R;
        let patch = refl(), dw = ray.dw, q = {};
        if (s.f) { const f = s.f / scale; if (!vert) patch.d = lensDeflect(patch.d, s, hit, f); dw = dw - w / f; q = lensQ(f); }
        const piezo = (s.obj.props.piezo || 0) * 2e-6;   // nm → mm, double pass
        out.push(child(ray, Object.assign({}, base, patch, q, { dw, P: ray.P * R, E: O.scaleJ(ray.E, Math.sqrt(R)), opl: ray.opl + piezo, phx: ray.phx + Math.PI })));
        break;
      }
      case 'splitter': {
        const R = U.clamp(s.R == null ? 0.5 : s.R, 0, 1);
        if (R > 0) out.push(child(ray, Object.assign({}, base, refl(), { P: ray.P * R, E: O.scaleJ(ray.E, Math.sqrt(R)), phx: ray.phx + Math.PI / 2 })));
        if (R < 1) out.push(child(ray, Object.assign({}, base, { P: ray.P * (1 - R), E: O.scaleJ(ray.E, Math.sqrt(1 - R)) })));
        break;
      }
      case 'pbs': {
        let Et, Er;
        if (!ray.E) { const a = Math.sqrt(ray.P / 2); Et = [C.c(a), C.c(0)]; Er = [C.c(0), C.c(a)]; }
        else { Et = [ray.E[0], C.c(0)]; Er = [C.c(0), ray.E[1]]; }
        const Pt = O.powerJ(Et), Pr = O.powerJ(Er);
        if (Pt > 0) out.push(child(ray, Object.assign({}, base, { P: Pt, E: Et })));
        if (Pr > 0) out.push(child(ray, Object.assign({}, base, refl(), { P: Pr, E: Er, phx: ray.phx + Math.PI / 2 })));
        break;
      }
      case 'dichroic': {
        const pass = s.mode === 'shortpass' ? ray.lambda <= s.edge : ray.lambda >= s.edge;
        if (pass) out.push(child(ray, Object.assign({}, base)));
        else out.push(child(ray, Object.assign({}, base, refl(), { phx: ray.phx + Math.PI })));
        break;
      }
      case 'filter': {
        const T = O.filterT(s, ray.lambda);
        const gh = T > 0 ? ghostOf(ray, base, vert ? null : V.reflect(d, s.n), cosi, 1.5, vert) : null;
        if (gh) out.push(gh.g);
        const a = afterGhost(ray, gh), P0 = a.P == null ? ray.P : a.P, E0 = a.E || ray.E;
        if (T > 0) out.push(child(ray, Object.assign({}, base, { P: P0 * T, E: O.scaleJ(E0, Math.sqrt(T)) })));
        else record(s.obj, rayAt);
        break;
      }
      case 'lens': {
        const f = (s.f || 100) / scale;
        const gh = ghostOf(ray, base, vert ? null : V.reflect(d, s.n), cosi, 1.5, vert);
        if (gh) out.push(gh.g);
        out.push(child(ray, Object.assign({}, base, afterGhost(ray, gh), vert ? {} : { d: lensDeflect(d, s, hit, f) }, lensQ(f), { dw: ray.dw - w / f })));
        break;
      }
      case 'waveplate': {
        const E = ray.E ? O.applyM(O.waveplate(s.angle || 0, U.rad(s.retardance == null ? 180 : s.retardance)), ray.E) : null;
        const gh = ghostOf(ray, base, vert ? null : V.reflect(d, s.n), cosi, 1.5, vert);
        if (gh) out.push(gh.g);
        const a = afterGhost(Object.assign({}, ray, { E }), gh);
        out.push(child(ray, Object.assign({}, base, { E }, a)));
        break;
      }
      case 'polarizer': {
        let E;
        if (!ray.E) E = O.scaleJ(O.jones('lin', s.angle || 0), Math.sqrt(ray.P / 2));
        else E = O.applyM(O.polarizer(s.angle || 0), ray.E);
        const P = O.powerJ(E);
        if (P > 0) out.push(child(ray, Object.assign({}, base, { E, P })));
        break;
      }
      case 'rotator': {
        const axis = s.axis ? U.dirToWorld(s.obj, s.axis) : s.n;
        if (s.isolator && (vert ? ray.vz < 0 : V.dot(d, axis) < 0)) { record(s.obj, rayAt); break; }
        const E = ray.E ? O.applyM(O.rotator(s.angle == null ? 45 : s.angle), ray.E) : null;
        out.push(child(ray, Object.assign({}, base, { E })));
        break;
      }
      case 'grating': {
        if (vert) { out.push(child(ray, Object.assign({}, base, s.transmit ? {} : refl()))); break; }
        const G = s.G || 600, kt0 = V.dot(d, s.t), sn = Math.sign(V.dot(d, s.n)) || 1;
        const orders = String(s.orders || '-1,0,1').split(',').map(x => parseInt(x, 10)).filter(x => isFinite(x));
        const valid = [];
        orders.forEach(m => { const kt = kt0 + m * ray.lambda * 1e-6 * G; if (Math.abs(kt) <= 1) valid.push({ m, kt }); });
        const nz = valid.filter(v => v.m !== 0).length;
        const e0 = valid.some(v => v.m === 0) ? U.clamp(s.eff0 == null ? 0.2 : s.eff0, 0, 1) : 0;
        valid.forEach(v => {
          const frac = v.m === 0 ? e0 : (nz ? (1 - e0) / nz : 0);
          if (frac <= 0) return;
          const kn = Math.sqrt(1 - v.kt * v.kt) * (s.transmit ? sn : -sn);
          const nd = V.norm(V.add(V.mul(s.t, v.kt), V.mul(s.n, kn)));
          out.push(child(ray, Object.assign({}, base, { d: nd, P: ray.P * frac, E: O.scaleJ(ray.E, Math.sqrt(frac)) })));
        });
        break;
      }
      case 'refract': {
        const n = O.index(s.mat, ray.lambda, s.nCustom || 1.5);
        const entering = !ray.inside;
        const facing = entering ? s.n : V.mul(s.n, -1);
        const n1 = entering ? 1 : n, n2 = entering ? n : 1;
        const td = O.refract(d, facing, n1 / n2);
        const qn = qa ? { q: { re: qa.re * n2 / n1, im: qa.im * n2 / n1 } } : {};
        if (!td) { out.push(child(ray, Object.assign({}, base, { d: V.reflect(d, s.n), inside: ray.inside }))); break; }
        let tPatch = {};
        if (ghosts) {
          const fr = O.fresnel(Math.abs(V.dot(d, facing)), n1, n2);
          const R = ghosts === 'ar' ? { Rs: 0.0025, Rp: 0.0025 } : fr;
          let E = null, P;
          if (ray.E) { E = [C.scale(ray.E[0], Math.sqrt(R.Rp)), C.scale(ray.E[1], Math.sqrt(R.Rs))]; P = O.powerJ(E); }
          else P = ray.P * (R.Rs + R.Rp) / 2;
          if (P > ray.P0 * 1e-4) out.push(child(ray, Object.assign({}, base, { d: V.reflect(d, s.n), inside: ray.inside, P, E, ghost: true, phx: ray.phx + (entering ? Math.PI : 0) })));
          if (ray.E) { const Et = [C.scale(ray.E[0], Math.sqrt(1 - R.Rp)), C.scale(ray.E[1], Math.sqrt(1 - R.Rs))]; tPatch = { E: Et, P: O.powerJ(Et) }; }
          else tPatch = { P: ray.P * (1 - (R.Rs + R.Rp) / 2) };
        }
        out.push(child(ray, Object.assign({}, base, qn, tPatch, { d: td, inside: entering ? s.poly : null, nmed: n2 })));
        break;
      }
      case 'aom': {
        const eff = U.clamp(s.eff == null ? 0.8 : s.eff, 0, 1);
        if (eff < 1) out.push(child(ray, Object.assign({}, base, { P: ray.P * (1 - eff) })));
        if (eff > 0) out.push(child(ray, Object.assign({}, base, vert ? {} : { d: V.rot(d, (s.order || 1) * (s.angle || 3)) }, { P: ray.P * eff })));
        break;
      }
      case 'shg': {
        const eta = U.clamp(s.eff == null ? 0.3 : s.eff, 0, 1);
        if (eta < 1) out.push(child(ray, Object.assign({}, base, { P: ray.P * (1 - eta), E: O.scaleJ(ray.E, Math.sqrt(1 - eta)) })));
        if (eta > 0) {
          const E = ray.E ? O.scaleJ([C.scale(ray.E[1], -1), ray.E[0]], Math.sqrt(eta)) : null;
          const L2 = ray.lambda / (s.harmonic || 2);
          out.push(child(ray, Object.assign({}, base, { P: ray.P * eta, E, lambda: L2, color: null, q: qa ? O.qWaist(Math.max(1e-4, (O.qRadius(qa, ray.lambda * 1e-6, ray.M2) || 0.3) / Math.SQRT2), L2 * 1e-6, ray.M2) : null })));
        }
        break;
      }
      case 'sample': {
        const T = U.clamp(s.T == null ? 1 : s.T, 0, 1);
        if (T > 0) out.push(child(ray, Object.assign({}, base, { P: ray.P * T, E: O.scaleJ(ray.E, Math.sqrt(T)) })));
        else record(s.obj, rayAt);
        if (s.emit && !ray.emitted) {
          const em = { lambda: s.emitLambda || 560, P: ray.P * (s.emitFrac == null ? 0.5 : s.emitFrac), E: null, emitted: true, color: s.emitColor || null, pulsed: ray.pulsed, phx: 0 };
          const qBack = qa ? { q: { re: -qa.re, im: qa.im } } : {};
          if (s.emitDir !== 'forward') out.push(child(ray, Object.assign({}, base, em, qBack, vert ? { vz: -ray.vz } : { d: V.mul(d, -1) }, { dw: -ray.dw, last: -1, ignore: s.obj.id })));
          if (s.emitDir === 'forward' || s.emitDir === 'both') out.push(child(ray, Object.assign({}, base, em)));
        }
        break;
      }
      case 'retro': {
        if (vert) { out.push(child(ray, Object.assign({}, base, { vz: -ray.vz, phx: ray.phx + Math.PI }))); break; }
        const h = V.dot(V.sub(hit, s.c), s.t);
        const pOut = V.sub(s.c, V.mul(s.t, h));
        const L = Math.abs(2 * h);
        segments.push(seg(Object.assign({}, ray, { w: w, dw: 0 }), hit, pOut, L, 'inside', 'hit', base.s, base.opl));
        const piezo = (s.obj.props.piezo || 0) * 2e-6;
        out.push(child(ray, Object.assign({}, base, { o: pOut, d: V.mul(d, -1), s: base.s + L, opl: base.opl + L * scale + piezo, phx: ray.phx + Math.PI, last: ctx.index })));
        break;
      }
      case 'aperture': {
        const h = vert ? V.dist(hit, s.c) : Math.abs(V.dot(V.sub(hit, s.c), s.t));
        const r = (s.r || 1);
        if (h > r) { record(s.obj, rayAt); break; }
        const nw = Math.abs(w) > r ? Math.sign(w) * r : w;
        const P = Math.abs(w) > r ? ray.P * Math.pow(r / Math.abs(w), 2) : ray.P;
        out.push(child(ray, Object.assign({}, base, { w: nw, P })));
        break;
      }
      case 'fiberIn': {
        record(s.obj, rayAt);
        const link = fibers[s.obj.id];
        const target = link && RNBX.getObjIn(doc, link.props.to);
        if (!target || ray.depth > MAX_DEPTH - 4) break;
        const tdef = RNBX.lib.get(target.type);
        const port = tdef && tdef.port ? tdef.port(target.props) : { o: [4, 0], d: [1, 0] };
        const fl = fiberLight[link.id] = fiberLight[link.id] || {};
        fl[ray.lambda] = (fl[ray.lambda] || 0) + ray.P;
        const eff = U.clamp(link.props.eff == null ? 0.8 : link.props.eff, 0, 1);
        const keepPol = link.props.fiberType === 'pm';
        const wOut = (target.props.beamWidth || doc.style.beamWidth) / 2 * (target.scale || 1);
        out.push(child(ray, {
          o: U.toWorld(target, port.o), d: V.norm(U.dirToWorld(target, port.d)), last: -1, ignore: target.id, z: target.z || 0, vz: 0,
          s: base.s + (link.props.length || 40), opl: base.opl + (link.props.length || 40) * scale * 1.45,
          P: ray.P * eff, E: keepPol ? O.scaleJ(ray.E, Math.sqrt(eff)) : null,
          w: wOut, dw: Math.tan(U.rad(target.props.divergence || 0)), inside: null, nmed: 1,
          q: gauss ? startQ({ w: wOut }, ray.lambda, 1) : null, M2: 1,
        }));
        break;
      }
      case 'vfold': {
        // 45° fold mirror between the table plane and the vertical
        const hdir = U.dirToWorld(s.obj, [1, 0]);
        const R = s.mode === 'dichroic' ? ((s.foldMode === 'shortpass' ? ray.lambda <= s.edge : ray.lambda >= s.edge) ? 0 : 1) : s.mode === 'splitter' ? U.clamp(s.R == null ? 0.5 : s.R, 0, 1) : 1;
        const fromPort = vert ? ray.vz === -s.port : V.dot(d, hdir) < 0;
        if (!fromPort && R >= 1) { record(s.obj, rayAt); break; }
        if (R < 1) out.push(child(ray, Object.assign({}, base, { P: ray.P * (1 - R), E: O.scaleJ(ray.E, Math.sqrt(1 - R)) })));
        if (R > 0 && fromPort) {
          const turn = vert ? { vz: 0, d: hdir, o: s.c, z: s.zc } : { vz: s.port, o: [s.obj.x, s.obj.y] };
          out.push(child(ray, Object.assign({}, base, turn, { P: ray.P * R, E: O.scaleJ(ray.E, Math.sqrt(R)), phx: ray.phx + Math.PI, ignore: vert ? s.obj.id : null, vlast: vert ? null : s.obj.id })));
        }
        break;
      }
      case 'periscope': {
        // two stacked 45° mirrors: change height, then leave in the set direction
        const inDir = U.dirToWorld(s.obj, [1, 0]);
        if (V.dot(d, inDir) <= 0 || vert) { record(s.obj, rayAt); break; }
        const c = [s.obj.x, s.obj.y], z1 = (s.obj.z || 0) + (s.obj.props.rise || 10);
        const L1 = V.dist(hit, c), Lz = Math.abs(z1 - ray.z);
        segments.push(seg(ray, hit, c, L1, 'inside', 'hit', base.s, base.opl));
        segments.push(seg(Object.assign({}, ray, { w: w + ray.dw * L1 }), c, c, Lz, 'vertical', 'hit', base.s + L1, base.opl + L1 * scale, ray.z, z1));
        const outAng = { straight: 0, left: -90, right: 90, back: 180 }[s.obj.props.turn || 'straight'] || 0;
        const dOut = U.dirToWorld(s.obj, V.fromAngle(outAng));
        const Ltot = L1 + Lz;
        out.push(child(ray, {
          o: c, d: dOut, z: z1, vz: 0, s: base.s + Ltot, opl: base.opl + Ltot * scale, w: w + ray.dw * Ltot, last: -1, ignore: s.obj.id,
          q: qa ? O.qProp(qa, Ltot * scale) : null, phx: ray.phx + 2 * Math.PI, inside: null,
        }));
        break;
      }
      case 'cavity': case 'ring': {
        // Fabry–Pérot cavity or ring resonator on a chip: the light that is
        // transmitted (or through-port) leaves the far side of the element
        const o = s.obj, pp = o.props;
        const phi = 2 * Math.PI * ((pp.detune || 0) + (ray.lambda - (pp.lam0 || ray.lambda)) / Math.max(1e-9, pp.fsr || 1));
        let T, Rr = 0, Tdrop = 0;
        if (s.kind === 'cavity') {
          const R1 = U.clamp(pp.R1, 0, 0.99999), R2 = U.clamp(pp.R2, 0, 0.99999), g = Math.sqrt(R1 * R2);
          T = (1 - R1) * (1 - R2) / (Math.pow(1 - g, 2) + 4 * g * Math.pow(Math.sin(phi / 2), 2));
          Rr = Math.max(0, 1 - T);
        } else if (pp.ring === false) { T = U.clamp(pp.T == null ? 0.9 : pp.T, 0, 1); }
        else {
          const r = Math.sqrt(1 - U.clamp(pp.kappa == null ? 0.1 : pp.kappa, 0, 1)), a = U.clamp(pp.loss == null ? 0.98 : pp.loss, 0, 1), c = Math.cos(phi);
          const den = 1 - 2 * r * r * a * c + Math.pow(r, 4) * a * a;
          if (pp.drop) { T = (r * r * a * a - 2 * r * r * a * c + r * r) / den; Tdrop = Math.pow(1 - r * r, 2) * a / den; }
          else { T = (a * a - 2 * r * a * c + r * r) / (1 - 2 * a * r * c + r * r * a * a); }
        }
        const ax = U.dirToWorld(o, [1, 0]), fwd = vert ? 1 : Math.sign(V.dot(d, ax)) || 1;
        const span = (s.span || 0) * (o.scale || 1);
        if (T > 1e-6) {
          if (vert) out.push(child(ray, Object.assign({}, base, { P: ray.P * T, E: O.scaleJ(ray.E, Math.sqrt(T)) })));
          else {
            const exit = V.add(hit, V.mul(ax, fwd * span));
            segments.push(seg(Object.assign({}, ray, { w: w, dw: 0, q: null }), hit, exit, span, 'inside', 'hit', base.s, base.opl));
            out.push(child(ray, Object.assign({}, base, { o: exit, s: base.s + span, opl: base.opl + span * scale * 1.5, P: ray.P * T, E: O.scaleJ(ray.E, Math.sqrt(T)), ignore: o.id, last: -1 })));
          }
        }
        if (Rr > 1e-6) out.push(child(ray, Object.assign({}, base, refl(), { P: ray.P * Rr, E: O.scaleJ(ray.E, Math.sqrt(Rr)) })));
        if (Tdrop > 1e-6 && !vert && s.dropPort) {
          const dp = U.toWorld(o, s.dropPort.o), dd = U.dirToWorld(o, s.dropPort.d);
          out.push(child(ray, { o: dp, d: V.norm(dd), s: base.s + span, opl: base.opl + span * scale * 1.5, P: ray.P * Tdrop, E: O.scaleJ(ray.E, Math.sqrt(Tdrop)), w: w, ignore: o.id, last: -1, inside: null, q: base.q }));
        }
        if (T + Rr + Tdrop < 0.999) { const lost = Object.assign({}, rayAt, { P: ray.P * (1 - T - Rr - Tdrop) }); if (lost.P > 0) record(o, lost); }
        break;
      }
      case 'pass':
        out.push(child(ray, Object.assign({}, base)));
        break;
      case 'absorb':
      default:
        record(s.obj, rayAt);
    }
  };

  function seg(ray, a, b, len, kind, end, s0, opl0, za, zb) {
    return {
      a, b, len, s0: s0 == null ? ray.s : s0, opl0: opl0 == null ? ray.opl : opl0, lambda: ray.lambda, P: ray.P, P0: ray.P0,
      E: ray.E, w0: ray.w, dw: ray.dw, q0: ray.q || null, M2: ray.M2 || 1, nmed: ray.nmed || 1,
      src: ray.src, color: ray.color, pulsed: ray.pulsed, emitted: !!ray.emitted, ghost: !!ray.ghost,
      kind, end, za: za == null ? (ray.z || 0) : za, zb: zb == null ? (ray.z || 0) : zb, vertical: kind === 'vertical',
    };
  }

  while (queue.length && segments.length < MAX_SEGMENTS && guard++ < MAX_SEGMENTS * 3) {
    const ray = queue.shift();
    if (ray.P < ray.P0 * 1e-4 || ray.depth > MAX_DEPTH) continue;

    if (ray.vz) {
      /* ---------- vertical travel ---------- */
      let best = null;
      for (const v of vertical) {
        if (ray.ignore && v.obj.id === ray.ignore) continue;
        const dz = (v.zc - ray.z) * ray.vz;
        if (dz <= 1e-6 || V.dist(ray.o, v.c) > v.r + 0.3) continue;
        if (!best || dz < best.dz) best = { v, dz };
      }
      const zEnd = best ? best.v.zc : ray.vz > 0 ? ray.z + ZMAX : -bh;
      const L = Math.abs(zEnd - ray.z);
      segments.push(seg(ray, ray.o, ray.o, L, 'vertical', best ? 'hit' : ray.vz > 0 ? 'open' : 'hit', null, null, ray.z, zEnd));
      if (!best) continue;
      const w = ray.w + ray.dw * L;
      const base = { o: ray.o, z: zEnd, s: ray.s + L, opl: ray.opl + L * scale * (ray.nmed || 1), w, ignore: best.v.obj.id, last: -1, q: ray.q ? O.qProp(ray.q, L * scale) : null };
      const out = [];
      interact(ray, best.v, ray.o, base, out, { vertical: true });
      // a ray that keeps going vertically must not meet the same element again
      out.forEach(r => { if (r.vz) r.ignore = best.v.obj.id; queue.push(r); });
      continue;
    }

    /* ---------- horizontal travel ---------- */
    let best = null, bi = -1;
    for (let i = 0; i < surfaces.length; i++) {
      if (i === ray.last) continue;
      const s = surfaces[i];
      if (ray.inside) { if (s.poly !== ray.inside) continue; }
      if (ray.ignore && ray.ignore === s.obj.id) continue;
      if (ray.vlast && ray.vlast === s.obj.id) continue;
      if (Math.abs((ray.z || 0) - s.z) > s.hz) continue;          // passes above / below
      const h = U.raySeg(ray.o, ray.d, s.a, s.b);
      if (h && h.t > EPS && (!best || h.t < best.t)) { best = h; bi = i; }
    }
    const len = best ? best.t : exitBox(ray.o, ray.d, box);
    if (len <= 0) continue;
    const end = V.add(ray.o, V.mul(ray.d, len));
    segments.push(seg(ray, ray.o, end, len, ray.inside ? 'inside' : 'beam', best ? 'hit' : 'open'));
    if (!best) continue;

    const s = surfaces[bi];
    const w = ray.w + ray.dw * len;
    const nm = ray.inside ? (ray.nmed || 1) : 1;
    const base = { o: end, last: bi, s: ray.s + len, opl: ray.opl + len * scale * nm, w, ignore: null, vlast: null, q: ray.q ? O.qProp(ray.q, len * scale) : null };
    const out = [];
    interact(ray, s, end, base, out, { vertical: false, index: bi });
    for (const r of out) queue.push(r);
  }

  /* ---------- coherent detector readout ---------- */
  Object.keys(hits).forEach(id => {
    const h = hits[id];
    let Pc = 0, best = null;
    Object.keys(h.fields).forEach(k => {
      const F = h.fields[k];
      Pc += C.abs2(F[0]) + C.abs2(F[1]);
      const parts = h.parts[k];
      if (parts.length >= 2) {
        const sorted = parts.slice().sort((a, b) => b.P - a.P);
        const a = sorted[0], b = sorted[1];
        const inner = C.add(C.mul(b.f[0], C.conj(a.f[0])), C.mul(b.f[1], C.conj(a.f[1])));
        const I1 = C.abs2(a.f[0]) + C.abs2(a.f[1]), I2 = C.abs2(b.f[0]) + C.abs2(b.f[1]);
        const overlap = Math.sqrt(C.abs2(inner)) / Math.max(1e-30, Math.sqrt(I1 * I2));   // polarisation overlap
        const cand = { I1, I2, dphi: Math.atan2(inner.im, inner.re), vis: 2 * Math.sqrt(I1 * I2) * overlap / (I1 + I2), lambda: a.lambda, overlap };
        if (!best || I1 + I2 > best.I1 + best.I2) best = cand;
      }
    });
    h.Pcoh = Pc;
    h.interf = best;
    delete h.parts;
  });
  return { segments, hits, fiberLight, truncated: segments.length >= MAX_SEGMENTS };
};

RNBX.getObjIn = (doc, id) => doc.objects.find(o => o.id === id);
})();
