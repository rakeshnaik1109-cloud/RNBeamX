/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/bem.js
   Boundary-element solution for particles that are bodies of
   revolution about the z axis (rods with rounded ends, spheroids,
   spheres, and any number of them on the axis — end-to-end rod
   dimers), with the field along the axis.

   Quasi-static surface-charge formulation: the induced surface
   charge σ obeys  Λ σ − I[σ] = E₀·n̂,  Λ = (ε + εm) / (2(ε − εm)),
   where I is the normal field of σ (principal value). Rings of
   charge are integrated in closed form (complete elliptic
   integrals); curved panels, log-singular self terms by a
   u² substitution. This gives the exact electrostatic response of
   the real shape, including the field in nanometre gaps.

   Size corrections (retardation): the response is written as an
   effective polarisability α_qs = V / (L_eff + εm/(ε − εm)) and
   corrected like a spheroid (dynamic depolarisation and radiation
   damping, Kuwata et al. 2003); the scattered near field is scaled
   by α / α_qs. For one spheroid this reproduces engine/mie.js.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const B = RNBX.bem = {};

/* complete elliptic integrals K(m), E(m), parameter m = k² (AGM) */
const ellipKE = m => {
  if (m < 0) m = 0;
  if (m >= 1) m = 1 - 1e-16;
  let a = 1, b = Math.sqrt(1 - m), c = Math.sqrt(m), sum = m / 2, p = 0.5;
  for (let i = 0; i < 40 && Math.abs(c) > 1e-16; i++) { const an = (a + b) / 2, bn = Math.sqrt(a * b); c = (a - b) / 2; a = an; b = bn; p *= 2; sum += p * c * c; }
  const K = Math.PI / (2 * a);
  return { K, E: K * (1 - sum) };
};
B.ellipKE = ellipKE;
/* ring of radius ρ' at height z' (∫ over φ'): G0 = ∫dφ/R and the field kernels
   Fρ = ∫(ρ − ρ' cos φ)/R³ dφ, Fz = ∫(z − z')/R³ dφ at the point (ρ, z) */
const ring = (rho, z, rp, zp) => {
  const dz = z - zp, Q = (rho + rp) * (rho + rp) + dz * dz, m = 4 * rho * rp / Q, sq = Math.sqrt(Q), ke = ellipKE(m);
  const dK = m < 1e-9 ? Math.PI / 8 : (ke.E - (1 - m) * ke.K) / (2 * m * (1 - m));
  const dmr = 4 * rp / Q - 4 * rho * rp * 2 * (rho + rp) / (Q * Q), dmz = -4 * rho * rp * 2 * dz / (Q * Q);
  const dGr = 4 * (dK * dmr / sq - ke.K * (rho + rp) / (Q * sq)), dGz = 4 * (dK * dmz / sq - ke.K * dz / (Q * sq));
  return { G0: 4 * ke.K / sq, Fr: -dGr, Fz: -dGz };
};
B.ring = ring;

/* Gauss–Legendre on [0, 1] */
const GL = (() => { const c = {}; return n => { if (c[n]) return c[n]; const x = [], w = []; for (let i = 0; i < n; i++) { let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 0; for (let it = 0; it < 100; it++) { let p1 = 1, p2 = 0; for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; } pp = n * (z * p1 - p2) / (z * z - 1); const z1 = z; z = z1 - p1 / pp; if (Math.abs(z - z1) < 1e-15) break; } x.push((1 - z) / 2); w.push(1 / ((1 - z * z) * pp * pp)); } return (c[n] = { x, w }); }; })();

/* ---------- shapes (generating curves t ∈ [0, 1], from the top of the axis to the bottom) ---------- */
/* rod with hemispherical ends: length ℓ (tip to tip), radius r, centre z0 */
B.capsule = (len, r, z0 = 0) => {
  r = Math.min(r, len / 2); const cyl = len - 2 * r, arc = Math.PI * r / 2, S = 2 * arc + cyl;
  const at = t => {
    const s = t * S;
    if (s <= arc) { const th = s / r; return [r * Math.sin(th), z0 + cyl / 2 + r * Math.cos(th)]; }
    if (s <= arc + cyl) return [r, z0 + cyl / 2 - (s - arc)];
    const th = (s - arc - cyl) / r; return [r * Math.cos(th), z0 - cyl / 2 - r * Math.sin(th)];
  };
  return { at, S, V: Math.PI * r * r * cyl + 4 / 3 * Math.PI * r * r * r, top: z0 + len / 2, bot: z0 - len / 2, r, len, z0, kind: 'capsule' };
};
/* spheroid with semi-axes a (along z) and b */
B.spheroid = (a, b, z0 = 0) => ({ at: t => { const th = Math.PI * t; return [b * Math.sin(th), z0 + a * Math.cos(th)]; }, V: 4 / 3 * Math.PI * a * b * b, top: z0 + a, bot: z0 - a, a, b, z0, kind: 'spheroid' });

/* panels on a shape, clustered towards both ends of the axis (where tips and gaps are) */
B.mesh = (shapes, nPer = 120, beta = 0.94) => {
  const P = [];
  shapes.forEach((sh, si) => {
    const map = u => u - beta * Math.sin(2 * Math.PI * u) / (2 * Math.PI);
    for (let i = 0; i < nPer; i++) {
      const t0 = map(i / nPer), t1 = map((i + 1) / nPer), tc = map((i + 0.5) / nPer);
      const c = sh.at(tc), h = 1e-6, a = sh.at(Math.max(0, tc - h)), b = sh.at(Math.min(1, tc + h));
      let tr = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tr, tz); tr /= tl; tz /= tl;
      // going from the top to the bottom along the curve, the outward normal is (−t_z, t_r)… rotated: n = (−tz, tr)
      let nr = -tz, nz = tr; if (nr * c[0] + nz * (c[1] - sh.z0) < 0) { nr = -nr; nz = -nz; }
      P.push({ sh: si, t0, t1, tc, rho: c[0], z: c[1], nr, nz, shape: sh });
    }
  });
  return P;
};
/* integrate f(ρ', z', ds') over a panel's piece [ta, tb] with n Gauss points (curved, exact shape) */
const quadPiece = (sh, ta, tb, n, f) => {
  const g = GL(n);
  for (let k = 0; k < n; k++) {
    const t = ta + (tb - ta) * g.x[k], h = 1e-7, p = sh.at(t), a = sh.at(Math.max(0, t - h)), b = sh.at(Math.min(1, t + h));
    const ds = Math.hypot(b[0] - a[0], b[1] - a[1]) / ((Math.min(1, t + h) - Math.max(0, t - h))) * (tb - ta) * g.w[k];
    f(p[0], p[1], ds);
  }
};
/* singular piece: t = tc ± Δ u² (removes the logarithm) */
const quadSing = (sh, tc, te, n, f) => {
  const g = GL(n), D = te - tc;
  for (let k = 0; k < n; k++) {
    const u = g.x[k], t = tc + D * u * u, h = 1e-7, p = sh.at(t), a = sh.at(Math.max(0, t - h)), b = sh.at(Math.min(1, t + h));
    const sp = Math.hypot(b[0] - a[0], b[1] - a[1]) / (Math.min(1, t + h) - Math.max(0, t - h));
    f(p[0], p[1], sp * Math.abs(2 * D * u) * g.w[k]);
  }
};
/* the field of unit surface charge on panel j at a point (ρ, z): [Eρ, Ez]; self = collocation point of panel j */
const panelField = (pj, rho, z, self, panelLen) => {
  let Er = 0, Ez = 0;
  const add = (rp, zp, ds) => { if (rp < 1e-12) return; const k = ring(rho, z, rp, zp); Er += k.Fr * rp * ds; Ez += k.Fz * rp * ds; };
  if (self) { quadSing(pj.shape, pj.tc, pj.t0, 16, add); quadSing(pj.shape, pj.tc, pj.t1, 16, add); }
  else {
    const dist = Math.hypot(rho - pj.rho, z - pj.z), L = panelLen;
    if (dist > 4 * L) quadPiece(pj.shape, pj.t0, pj.t1, 4, add);
    else if (dist > 1.2 * L) quadPiece(pj.shape, pj.t0, pj.t1, 10, add);
    else { const nsub = 6; for (let s = 0; s < nsub; s++) quadPiece(pj.shape, pj.t0 + (pj.t1 - pj.t0) * s / nsub, pj.t0 + (pj.t1 - pj.t0) * (s + 1) / nsub, 10, add); }
  }
  return [Er / (4 * Math.PI), Ez / (4 * Math.PI)];
};
const lenOf = p => { const a = p.shape.at(p.t0), b = p.shape.at(p.t1); return Math.hypot(b[0] - a[0], b[1] - a[1]); };

/* geometry: mesh + the real matrix of normal fields (computed once per shape) */
B.build = (shapes, nPer) => {
  const P = B.mesh(shapes, nPer), n = P.length, Kn = new Float64Array(n * n), lens = P.map(lenOf);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const e = panelField(P[j], P[i].rho, P[i].z, i === j, lens[j]);
    Kn[i * n + j] = P[i].nr * e[0] + P[i].nz * e[1];
  }
  // panel areas for the dipole moment, 2π ρ ds (exact curve)
  const area = P.map(p => { let A = 0; quadPiece(p.shape, p.t0, p.t1, 6, (rp, zp, ds) => { A += 2 * Math.PI * rp * ds; }); return A; });
  const zbar = P.map(p => { let A = 0, Z = 0; quadPiece(p.shape, p.t0, p.t1, 6, (rp, zp, ds) => { A += rp * ds; Z += rp * ds * zp; }); return Z / A; });
  return { P, n, Kn, lens, area, zbar, V: shapes.reduce((a, s) => a + s.V, 0), shapes, len: Math.max(...shapes.map(s => s.top)) - Math.min(...shapes.map(s => s.bot)) };
};
/* quasi-static response for permittivities eps [re, im] (particle) and em (host, real): σ, α_qs */
B.solveQS = (G, eps, em) => {
  const n = G.n, dr = eps[0] - em, di = eps[1], d2 = dr * dr + di * di;
  // Λ = (ε + εm) / (2(ε − εm))
  const nr = eps[0] + em, ni = eps[1], Lr = (nr * dr + ni * di) / (2 * d2), Li = (ni * dr - nr * di) / (2 * d2);
  const Ar = new Float64Array(n * n), Ai = new Float64Array(n * n), br = new Float64Array(n), bi = new Float64Array(n);
  for (let i = 0; i < n; i++) { for (let j = 0; j < n; j++) Ar[i * n + j] = -G.Kn[i * n + j]; Ar[i * n + i] += Lr; Ai[i * n + i] += Li; br[i] = G.P[i].nz; }
  const x = RNBX.mie.csolve(n, Ar, Ai, br, bi);
  let pr = 0, pi = 0; for (let i = 0; i < n; i++) { pr += x.re[i] * G.area[i] * G.zbar[i]; pi += x.im[i] * G.area[i] * G.zbar[i]; }
  return { sr: x.re, si: x.im, alpha: [pr, pi] };
};
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
/* with the size corrections: α, cross-sections (nm²) and the factor that scales the scattered near field */
B.response = (G, eps, em, lam) => {
  const qs = B.solveQS(G, eps, em), V = G.V, k = 2 * Math.PI * Math.sqrt(em) / lam;
  // L_eff from 1/α_qs = (L + εm/(ε − εm)) / V
  const inv = cdiv([V, 0], qs.alpha), t = cdiv([em, 0], [eps[0] - em, eps[1]]), Leff = Math.min(1 / 3, Math.max(0.005, inv[0] - t[0]));
  const x = Math.PI * G.len / lam, A = -0.4865 * Leff - 1.046 * Leff * Leff + 0.8481 * Leff ** 3, Bc = 0.01909 * Leff + 0.1999 * Leff * Leff + 0.6077 * Leff ** 3;
  const den = [inv[0] + A * em * x * x + Bc * em * em * x ** 4, inv[1] - 4 * Math.PI * Math.PI * Math.pow(em, 1.5) / 3 * V / lam ** 3];
  const alpha = cdiv([V, 0], den), scale = cdiv(alpha, qs.alpha);
  const Cext = k * alpha[1], Csca = Math.pow(k, 4) / (6 * Math.PI) * (alpha[0] * alpha[0] + alpha[1] * alpha[1]);
  return { qs, alpha, scale, Cext, Csca, Cabs: Cext - Csca, Leff };
};
/* |E|² at (x, z) in a plane through the axis (E₀ = 1 along z), or null inside a particle */
B.inside = (G, rho, z) => G.shapes.some(sh => {
  if (z > sh.top || z < sh.bot) return false;
  if (sh.kind === 'spheroid') return (rho * rho) / (sh.b * sh.b) + ((z - sh.z0) * (z - sh.z0)) / (sh.a * sh.a) < 1;
  const cyl = sh.len / 2 - sh.r, dz = Math.max(0, Math.abs(z - sh.z0) - cyl); return rho * rho + dz * dz < sh.r * sh.r;
});
B.field = (G, R, x, z) => {
  const rho = Math.abs(x); if (B.inside(G, rho, z)) return null;
  let Er = [0, 0], Ez = [0, 0];
  for (let j = 0; j < G.n; j++) {
    const e = panelField(G.P[j], rho, z, false, G.lens[j]), sr = R.qs.sr[j], si = R.qs.si[j];
    Er = [Er[0] + e[0] * sr, Er[1] + e[0] * si]; Ez = [Ez[0] + e[1] * sr, Ez[1] + e[1] * si];
  }
  const s = R.scale, sc = v => [v[0] * s[0] - v[1] * s[1], v[0] * s[1] + v[1] * s[0]];
  const er = sc(Er), ez = sc(Ez); ez[0] += 1;
  return er[0] * er[0] + er[1] * er[1] + ez[0] * ez[0] + ez[1] * ez[1];
};
})();
