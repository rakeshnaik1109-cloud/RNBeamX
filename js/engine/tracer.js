/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/tracer.js
   2D sequential/non-sequential beam tracer.

   Every source emits one or more rays. Each ray carries:
     wavelength, power, Jones vector (null = unpolarised),
     signed half-width w and its slope dw (paraxial envelope),
     cumulative path length s (used for animation phase).
   At every surface the ray interacts according to the surface
   kind (mirror, splitter, PBS, lens, grating, refraction, …) and
   may spawn child rays. The result is a flat list of straight
   segments that the renderers draw, plus the power that reaches
   every detector.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const U = RNBX.util, V = U.v, O = RNBX.optics;

const MAX_SEGMENTS = 4000;
const MAX_DEPTH = 96;
const EPS = 1e-6;

/* ---------- build world-space surfaces ---------- */
function buildScene(doc) {
  const surfaces = [], sources = [], fibers = {};
  const scale = doc.style.scale || 10;
  for (const obj of doc.objects) {
    if (obj.hidden) continue;
    const def = RNBX.lib.get(obj.type);
    if (!def) continue;
    if (obj.type === 'fiber' && obj.props.from && obj.props.to) fibers[obj.props.from] = obj;
    if (def.optics) {
      const list = def.optics(obj.props, obj, doc) || [];
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
            surfaces.push({ obj, kind: 'refract', a, b, t, n, c: mid, poly: key, mat: s.mat, nCustom: s.n, scale });
          }
        } else {
          const a = U.toWorld(obj, s.a), b = U.toWorld(obj, s.b);
          const t = V.norm(V.sub(b, a));
          surfaces.push(Object.assign({}, s, { obj, a, b, t, n: V.perp(t), c: V.mul(V.add(a, b), 0.5), scale }));
        }
      });
    }
    if (def.source) {
      (def.source(obj.props, obj, doc) || []).forEach(r => {
        sources.push(Object.assign({}, r, {
          o: U.toWorld(obj, r.o), d: V.norm(U.dirToWorld(obj, r.d)), src: obj.id,
          w: (r.w || 0) * (obj.scale || 1), dw: r.dw || 0,
        }));
      });
    }
  }
  return { surfaces, sources, fibers };
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

RNBX.trace = function trace(doc) {
  const { surfaces, sources, fibers } = buildScene(doc);
  const W = doc.page.width, H = doc.page.height, M = 4;
  const box = [-M, -M, W + M, H + M];
  const segments = [], hits = {}, fiberLight = {};
  const queue = sources.map(r => Object.assign({ s: 0, depth: 0, last: -1, inside: null, P0: r.P }, r));
  let guard = 0;

  const child = (ray, patch) => Object.assign({}, ray, { depth: ray.depth + 1 }, patch);
  const record = (obj, ray) => {
    const h = hits[obj.id] = hits[obj.id] || { P: 0, lambdas: {} };
    h.P += ray.P;
    h.lambdas[ray.lambda] = (h.lambdas[ray.lambda] || 0) + ray.P;
  };

  while (queue.length && segments.length < MAX_SEGMENTS && guard++ < MAX_SEGMENTS * 2) {
    const ray = queue.shift();
    if (ray.P < ray.P0 * 1e-4 || ray.depth > MAX_DEPTH) continue;

    // nearest hit
    let best = null, bi = -1;
    for (let i = 0; i < surfaces.length; i++) {
      if (i === ray.last) continue;
      const s = surfaces[i];
      if (ray.inside) { if (s.poly !== ray.inside) continue; }
      if (ray.ignore && ray.ignore === s.obj.id) continue;
      const h = U.raySeg(ray.o, ray.d, s.a, s.b);
      if (h && h.t > EPS && (!best || h.t < best.t)) { best = h; bi = i; }
    }
    let len = best ? best.t : exitBox(ray.o, ray.d, box);
    if (len <= 0) continue;
    const end = V.add(ray.o, V.mul(ray.d, len));
    segments.push({
      a: ray.o, b: end, len, s0: ray.s, lambda: ray.lambda, P: ray.P, P0: ray.P0,
      E: ray.E, w0: ray.w, dw: ray.dw, src: ray.src, color: ray.color, pulsed: ray.pulsed, emitted: !!ray.emitted,
      kind: ray.inside ? 'inside' : 'beam', end: best ? 'hit' : 'open',
    });
    if (!best) continue;

    const s = surfaces[bi];
    const hit = end;
    const w = ray.w + ray.dw * len;
    const base = { o: hit, last: bi, s: ray.s + len, w, ignore: null };
    const out = [];
    const d = ray.d;
    const p = s;  // surface parameters live on the surface record

    switch (s.kind) {
      case 'mirror': {
        let nd = V.reflect(d, s.n);
        let dw = ray.dw;
        if (p.f) { const f = p.f / s.scale; nd = lensDeflect(nd, s, hit, f); dw = dw - w / f; }
        out.push(child(ray, Object.assign({}, base, { d: nd, dw, P: ray.P * (p.R == null ? 1 : p.R), E: O.scaleJ(ray.E, Math.sqrt(p.R == null ? 1 : p.R)) })));
        break;
      }
      case 'splitter': {
        const R = U.clamp(p.R == null ? 0.5 : p.R, 0, 1);
        if (R > 0) out.push(child(ray, Object.assign({}, base, { d: V.reflect(d, s.n), P: ray.P * R, E: O.scaleJ(ray.E, Math.sqrt(R)) })));
        if (R < 1) out.push(child(ray, Object.assign({}, base, { d, P: ray.P * (1 - R), E: O.scaleJ(ray.E, Math.sqrt(1 - R)) })));
        break;
      }
      case 'pbs': {
        let Et, Er;
        if (!ray.E) { const a = Math.sqrt(ray.P / 2); Et = [U.C.c(a), U.C.c(0)]; Er = [U.C.c(0), U.C.c(a)]; }
        else { Et = [ray.E[0], U.C.c(0)]; Er = [U.C.c(0), ray.E[1]]; }
        const Pt = O.powerJ(Et), Pr = O.powerJ(Er);
        if (Pt > 0) out.push(child(ray, Object.assign({}, base, { d, P: Pt, E: Et })));
        if (Pr > 0) out.push(child(ray, Object.assign({}, base, { d: V.reflect(d, s.n), P: Pr, E: Er })));
        break;
      }
      case 'dichroic': {
        const pass = p.mode === 'shortpass' ? ray.lambda <= p.edge : ray.lambda >= p.edge;
        if (pass) out.push(child(ray, Object.assign({}, base, { d })));
        else out.push(child(ray, Object.assign({}, base, { d: V.reflect(d, s.n) })));
        break;
      }
      case 'filter': {
        const T = O.filterT(p, ray.lambda);
        if (T > 0) out.push(child(ray, Object.assign({}, base, { d, P: ray.P * T, E: O.scaleJ(ray.E, Math.sqrt(T)) })));
        else record(s.obj, ray);
        break;
      }
      case 'lens': {
        const f = (p.f || 100) / s.scale;
        out.push(child(ray, Object.assign({}, base, { d: lensDeflect(d, s, hit, f), dw: ray.dw - w / f })));
        break;
      }
      case 'waveplate': {
        const E = ray.E ? O.applyM(O.waveplate(p.angle || 0, U.rad(p.retardance == null ? 180 : p.retardance)), ray.E) : null;
        out.push(child(ray, Object.assign({}, base, { d, E })));
        break;
      }
      case 'polarizer': {
        let E;
        if (!ray.E) E = O.scaleJ(O.jones('lin', p.angle || 0), Math.sqrt(ray.P / 2));
        else E = O.applyM(O.polarizer(p.angle || 0), ray.E);
        const P = O.powerJ(E);
        if (P > 0) out.push(child(ray, Object.assign({}, base, { d, E, P })));
        break;
      }
      case 'rotator': {
        if (p.isolator && V.dot(d, s.axis ? U.dirToWorld(s.obj, s.axis) : s.n) < 0) { record(s.obj, ray); break; }
        const E = ray.E ? O.applyM(O.rotator(p.angle == null ? 45 : p.angle), ray.E) : null;
        out.push(child(ray, Object.assign({}, base, { d, E })));
        break;
      }
      case 'grating': {
        const G = p.G || 600, kt0 = V.dot(d, s.t), sn = Math.sign(V.dot(d, s.n)) || 1;
        const orders = String(p.orders || '-1,0,1').split(',').map(x => parseInt(x, 10)).filter(x => isFinite(x));
        const valid = [];
        orders.forEach(m => {
          const kt = kt0 + m * ray.lambda * 1e-6 * G;
          if (Math.abs(kt) <= 1) valid.push({ m, kt });
        });
        const nz = valid.filter(v => v.m !== 0).length;
        const e0 = valid.some(v => v.m === 0) ? U.clamp(p.eff0 == null ? 0.2 : p.eff0, 0, 1) : 0;
        valid.forEach(v => {
          const frac = v.m === 0 ? e0 : (nz ? (1 - e0) / nz : 0);
          if (frac <= 0) return;
          const kn = Math.sqrt(1 - v.kt * v.kt) * (p.transmit ? sn : -sn);
          const nd = V.norm(V.add(V.mul(s.t, v.kt), V.mul(s.n, kn)));
          out.push(child(ray, Object.assign({}, base, { d: nd, P: ray.P * frac, E: O.scaleJ(ray.E, Math.sqrt(frac)) })));
        });
        break;
      }
      case 'refract': {
        const n = O.index(s.mat, ray.lambda, s.nCustom || 1.5);
        const entering = !ray.inside;
        // s.n points outward, so it faces a ray arriving from outside
        const facing = entering ? s.n : V.mul(s.n, -1);
        const eta = entering ? 1 / n : n;
        const td = O.refract(d, facing, eta);
        if (td) out.push(child(ray, Object.assign({}, base, { d: td, inside: entering ? s.poly : null })));
        else out.push(child(ray, Object.assign({}, base, { d: V.reflect(d, s.n), inside: ray.inside })));
        break;
      }
      case 'aom': {
        const eff = U.clamp(p.eff == null ? 0.8 : p.eff, 0, 1);
        if (eff < 1) out.push(child(ray, Object.assign({}, base, { d, P: ray.P * (1 - eff) })));
        if (eff > 0) out.push(child(ray, Object.assign({}, base, { d: V.rot(d, (p.order || 1) * (p.angle || 3)), P: ray.P * eff })));
        break;
      }
      case 'shg': {
        const eta = U.clamp(p.eff == null ? 0.3 : p.eff, 0, 1);
        if (eta < 1) out.push(child(ray, Object.assign({}, base, { d, P: ray.P * (1 - eta), E: O.scaleJ(ray.E, Math.sqrt(1 - eta)) })));
        if (eta > 0) {
          const E = ray.E ? O.scaleJ([U.C.scale(ray.E[1], -1), ray.E[0]], Math.sqrt(eta)) : null;
          out.push(child(ray, Object.assign({}, base, { d, P: ray.P * eta, E, lambda: ray.lambda / (p.harmonic || 2), color: null })));
        }
        break;
      }
      case 'sample': {
        const T = U.clamp(p.T == null ? 1 : p.T, 0, 1);
        if (T > 0) out.push(child(ray, Object.assign({}, base, { d, P: ray.P * T, E: O.scaleJ(ray.E, Math.sqrt(T)) })));
        else record(s.obj, ray);
        if (p.emit && !ray.emitted) {
          const em = { lambda: p.emitLambda || 560, P: ray.P * (p.emitFrac == null ? 0.5 : p.emitFrac), E: null, emitted: true, color: p.emitColor || null, pulsed: ray.pulsed };
          if (p.emitDir !== 'forward') out.push(child(ray, Object.assign({}, base, em, { d: V.mul(d, -1), dw: -ray.dw, last: -1, ignore: s.obj.id })));
          if (p.emitDir === 'forward' || p.emitDir === 'both') out.push(child(ray, Object.assign({}, base, em, { d, last: bi })));
        }
        break;
      }
      case 'retro': {
        const h = V.dot(V.sub(hit, s.c), s.t);
        const pOut = V.sub(s.c, V.mul(s.t, h));
        segments.push({ a: hit, b: pOut, len: Math.abs(2 * h), s0: ray.s + len, lambda: ray.lambda, P: ray.P, P0: ray.P0, E: ray.E, w0: w, dw: 0, src: ray.src, color: ray.color, pulsed: ray.pulsed, kind: 'inside' });
        out.push(child(ray, Object.assign({}, base, { o: pOut, d: V.mul(d, -1), s: ray.s + len + Math.abs(2 * h), last: bi })));
        break;
      }
      case 'aperture': {
        const h = Math.abs(V.dot(V.sub(hit, s.c), s.t));
        const r = (p.r || 1);
        if (h > r) { record(s.obj, ray); break; }
        const nw = Math.abs(w) > r ? Math.sign(w) * r : w;
        const P = Math.abs(w) > r ? ray.P * Math.pow(r / Math.abs(w), 2) : ray.P;
        out.push(child(ray, Object.assign({}, base, { d, w: nw, P })));
        break;
      }
      case 'fiberIn': {
        record(s.obj, ray);
        const link = fibers[s.obj.id];
        const target = link && RNBX.getObjIn(doc, link.props.to);
        if (!target || ray.depth > MAX_DEPTH - 4) break;
        const tdef = RNBX.lib.get(target.type);
        const port = tdef && tdef.port ? tdef.port(target.props) : { o: [4, 0], d: [1, 0] };
        const fl = fiberLight[link.id] = fiberLight[link.id] || {};
        fl[ray.lambda] = (fl[ray.lambda] || 0) + ray.P;
        const eff = U.clamp(link.props.eff == null ? 0.8 : link.props.eff, 0, 1);
        const keepPol = link.props.fiberType === 'pm';
        out.push(child(ray, {
          o: U.toWorld(target, port.o), d: V.norm(U.dirToWorld(target, port.d)), last: -1, ignore: target.id,
          s: ray.s + len + (link.props.length || 40), P: ray.P * eff, E: keepPol ? O.scaleJ(ray.E, Math.sqrt(eff)) : null,
          w: (target.props.beamWidth || doc.style.beamWidth) / 2 * (target.scale || 1), dw: Math.tan(U.rad(target.props.divergence || 0)),
          inside: null,
        }));
        break;
      }
      case 'pass':
        out.push(child(ray, Object.assign({}, base, { d })));
        break;
      case 'absorb':
      default:
        record(s.obj, ray);
    }
    for (const r of out) queue.push(r);
  }
  return { segments, hits, fiberLight, truncated: segments.length >= MAX_SEGMENTS };
};

RNBX.getObjIn = (doc, id) => doc.objects.find(o => o.id === id);
})();
