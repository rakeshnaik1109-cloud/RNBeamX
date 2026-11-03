/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/npom.js
   A (layered) sphere above a flat substrate or mirror, gap g:
   nanoparticle-on-mirror (NPoM) gap plasmons, particles on glass
   or silicon.

   Quasi-static multipole image method (Wind, Vlieger & Bedeaux,
   Physica A 141, 33 (1987); Bedeaux & Vlieger, Optical Properties
   of Surfaces). The sphere's multipoles A_l (axis normal to the
   substrate) see the applied field plus the field of their own
   image in the substrate (image factor −β (−1)^{l+m},
   β = (εs − εm)/(εs + εm)), re-expanded about the sphere centre:
     (I − diag(α) M) A = α G₀,
     M_{l l'} = −β (−1)^{l'+m} (−1)^{l+m} (l+l')! / ((l+m)! (l'−m)!) / S^{l+l'+1}
   with lengths in units of the sphere radius and S = 2(R + g)/R.
   α_l are the static multipole responses of the layered sphere;
   the dipole term is replaced by the exact Mie dipole
   (−3i a₁ / 2x³), which keeps retardation (red shift with size)
   and radiation damping. The applied field E₀ is the local
   exciting field (incident plus reflected): normal to the
   substrate (m = 0, the gap mode) or parallel to it (m = 1).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const NP = RNBX.npom = {};

const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]];
const csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const eps = n => [n[0] * n[0] - n[1] * n[1], 2 * n[0] * n[1]];

let LF = [0];
const lfact = n => { while (LF.length <= n) LF.push(LF[LF.length - 1] + Math.log(LF.length)); return LF[n]; };

/* static l-pole response of a layered sphere (radii scaled so the outer radius is 1):
   outside φ = G (r^l + α r^{−l−1}) P_l^m; carried outwards with t = y / r^{2l+1} (no overflow) */
NP.alphaStatic = (layers, em, l) => {
  const R = layers[layers.length - 1].r;
  let t = [0, 0];
  for (let i = 0; i < layers.length; i++) {
    const ei = eps(layers[i].n), eo = i === layers.length - 1 ? [em, 0] : eps(layers[i + 1].n);
    const one = cadd([1, 0], t);
    const Q = cdiv(csub(cmul(eo, [l * one[0], l * one[1]]), cmul(ei, csub([l, 0], [(l + 1) * t[0], (l + 1) * t[1]]))), [eo[0] * (2 * l + 1), eo[1] * (2 * l + 1)]);
    t = cdiv(Q, csub(one, Q));
    if (i < layers.length - 1) { const k = Math.pow(layers[i].r / layers[i + 1].r, 2 * l + 1); t = [t[0] * k, t[1] * k]; }
  }
  void R;
  return t;
};
/* how many multipoles: the image coupling decays like (S − 1)^{−l} */
NP.order = (R, g) => { const q = 1 / (2 * (R + g) / R - 1); return Math.max(10, Math.min(260, Math.ceil(Math.log(1e-8) / (3 * Math.log(q))) + 10)); };   // checked: relative change < 1e-6 against 300 orders

/* opts: { layers: [{ r (nm), n: [n, k] }] (Mie convention), nMed, lam (nm), nSub: [n, k], gap (nm), pol: 'z' (normal) | 'x' (parallel), L } */
NP.solve = o => {
  const layers = o.layers, R = layers[layers.length - 1].r, em = o.nMed * o.nMed, m = o.pol === 'x' ? 1 : 0;
  const es = eps(o.nSub), beta = cdiv(csub(es, [em, 0]), cadd(es, [em, 0]));
  const S = 2 * (R + o.gap) / R, L = o.L || NP.order(R, o.gap), lnS = Math.log(S);
  const alpha = [];
  for (let l = 1; l <= L; l++) alpha[l] = NP.alphaStatic(layers, em, l);
  // the dipole from Mie theory (retarded, radiation-damped)
  const k = 2 * Math.PI * o.nMed / o.lam, x = k * R;
  if (RNBX.mie && o.retard !== false) { const N = RNBX.mie.order(x) + 2, c = RNBX.mie.coeffs(layers, o.nMed, o.lam, N), a1 = c.a[1], f = 3 / (2 * x * x * x); alpha[1] = [f * a1[1], -f * a1[0]]; /* −(3i/2x³) a₁ */ }
  // (I − diag(α) M) A = α G₀, G₀ = −1 at l = 1
  const n = L, Ar = new Float64Array(n * n), Ai = new Float64Array(n * n), br = new Float64Array(n), bi = new Float64Array(n);
  for (let l = 1; l <= L; l++) {
    const r = l - 1, al = alpha[l];
    for (let lp = 1; lp <= L; lp++) {
      const c = (((l + lp) % 2 === 0) ? 1 : -1) * Math.exp(lfact(l + lp) - lfact(l + m) - lfact(lp - m) - (l + lp + 1) * lnS);   // (−1)^{l'+m}(−1)^{l+m} = (−1)^{l+l'}
      const Mv = cmul([-beta[0] * c, -beta[1] * c], al);
      Ar[r * n + lp - 1] = (l === lp ? 1 : 0) - Mv[0]; Ai[r * n + lp - 1] = -Mv[1];
    }
    if (l === 1) { br[0] = -al[0]; bi[0] = -al[1]; }
  }
  const sol = RNBX.mie.csolve(n, Ar, Ai, br, bi), A = [null];
  for (let l = 1; l <= L; l++) A[l] = [sol.re[l - 1], sol.im[l - 1]];
  const img = l => { const s = -(((l + m) % 2 === 0) ? 1 : -1); return cmul([s * beta[0], s * beta[1]], A[l]); };   // −β (−1)^{l+m} A_l
  const A1 = A[1], Atot = cadd(A1, img(1)), R3 = R * R * R;
  const res = { A, L, m, beta, R, S, gap: o.gap, k, img,
    Cext: 4 * Math.PI * k * R3 * A1[1],
    Csca: 8 * Math.PI / 3 * Math.pow(k, 4) * R3 * R3 * (Atot[0] * Atot[0] + Atot[1] * Atot[1]),
    Csca0: 8 * Math.PI / 3 * Math.pow(k, 4) * R3 * R3 * (A1[0] * A1[0] + A1[1] * A1[1]) };
  res.Cabs = Math.max(0, res.Cext - res.Csca0);
  res.E2gap = NP.intensity(res, 0, -1 - o.gap / (2 * R));
  return res;
};

/* potential (units E₀R) at (x, z) in the y = 0 plane, lengths in units of R, sphere centre at 0;
   null inside the sphere or the substrate */
const legendre = (c, L) => { const P = [1, c], dP = [0, 1]; for (let l = 1; l < L; l++) { P[l + 1] = ((2 * l + 1) * c * P[l] - l * P[l - 1]) / (l + 1); dP[l + 1] = dP[l - 1] + (2 * l + 1) * P[l]; } return { P, dP }; };
NP.potential = (r, x, z) => {
  const zs = -r.S, u = Math.hypot(x, z);
  if (u < 1 || z < -r.S / 2) return null;
  const up = Math.hypot(x, z - zs), c = z / u, cp = (z - zs) / up, A = r.A, L = r.L;
  const P = legendre(c, L), Pp = legendre(cp, L);
  let re = 0, im = 0, ur = 1 / u, upr = 1 / up;
  for (let l = 1; l <= L; l++) {
    ur /= u; upr /= up;
    const ang = r.m === 0 ? P.P[l] : (x / u) * P.dP[l], angp = r.m === 0 ? Pp.P[l] : (x / up) * Pp.dP[l], I = r.img(l);
    re += A[l][0] * ur * ang + I[0] * upr * angp; im += A[l][1] * ur * ang + I[1] * upr * angp;
    if (ur < 1e-300) break;
  }
  return [re - (r.m === 0 ? z : x), im];
};
/* |E|² / |E₀|² by central differences */
NP.intensity = (r, x, z, h = 1e-4) => {
  const f = (a, b) => NP.potential(r, a, b);
  const px = f(x + h, z), mx = f(x - h, z), pz = f(x, z + h), mz = f(x, z - h);
  if (!px || !mx || !pz || !mz) return NaN;
  const ex = [(mx[0] - px[0]) / (2 * h), (mx[1] - px[1]) / (2 * h)], ez = [(mz[0] - pz[0]) / (2 * h), (mz[1] - pz[1]) / (2 * h)];
  return ex[0] * ex[0] + ex[1] * ex[1] + ez[0] * ez[0] + ez[1] * ez[1];
};
})();
