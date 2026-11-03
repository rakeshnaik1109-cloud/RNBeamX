/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/fit.js
   Least-squares fitting: bounded Levenberg–Marquardt with a
   numerical Jacobian, several starting points (thin-film spectra
   have many local minima: each interference fringe is one), and
   standard errors from the covariance s²(JᵀJ)⁻¹.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const FIT = RNBX.fit = {};

const clampv = (p, lo, hi) => p.map((v, i) => Math.min(hi[i], Math.max(lo[i], v)));
const ssr = r => r.reduce((a, v) => a + v * v, 0);
/* solve (A + λ diag A) x = b, symmetric positive (Cholesky with a fallback) */
const solveSym = (A, b, n) => {
  const L = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i * n + j]; for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
    if (i === j) { if (s <= 0) return null; L[i * n + i] = Math.sqrt(s); } else L[i * n + j] = s / L[j * n + j];
  }
  const y = new Float64Array(n), x = new Float64Array(n);
  for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k]; y[i] = s / L[i * n + i]; }
  for (let i = n - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k]; x[i] = s / L[i * n + i]; }
  return x;
};
const invSym = (A, n) => { const out = new Float64Array(n * n); for (let j = 0; j < n; j++) { const e = new Float64Array(n); e[j] = 1; const c = solveSym(A, e, n); if (!c) return null; for (let i = 0; i < n; i++) out[i * n + j] = c[i]; } return out; };

const jacobian = (f, p, r0, lo, hi) => {
  const P = p.length, M = r0.length, J = new Float64Array(M * P);
  for (let j = 0; j < P; j++) {
    const h = Math.max(1e-7, 1e-5 * Math.max(Math.abs(p[j]), (hi[j] - lo[j]) * 1e-3));
    const q = p.slice(); let dir = 1;
    if (q[j] + h > hi[j]) dir = -1;
    q[j] += dir * h;
    const r1 = f(q);
    for (let i = 0; i < M; i++) J[i * P + j] = (r1[i] - r0[i]) / (dir * h);
  }
  return J;
};
/* one Levenberg–Marquardt run. f(p) → residuals. Returns { p, r, ssr, iter } */
FIT.lm = (f, p0, lo, hi, opt = {}) => {
  let p = clampv(p0.slice(), lo, hi), r = f(p), S = ssr(r), lam = 1e-3, iter = 0;
  const P = p.length, maxIter = opt.maxIter || 60;
  for (; iter < maxIter; iter++) {
    const J = jacobian(f, p, r, lo, hi), M = r.length, A = new Float64Array(P * P), g = new Float64Array(P);
    for (let i = 0; i < M; i++) for (let a = 0; a < P; a++) { const ja = J[i * P + a]; g[a] -= ja * r[i]; for (let b = 0; b <= a; b++) A[a * P + b] += ja * J[i * P + b]; }
    for (let a = 0; a < P; a++) for (let b = 0; b < a; b++) A[b * P + a] = A[a * P + b];
    let improved = false;
    for (let t = 0; t < 12; t++) {
      const B = Float64Array.from(A); for (let a = 0; a < P; a++) B[a * P + a] += lam * (A[a * P + a] || 1e-12);
      const dx = solveSym(B, g, P);
      if (!dx) { lam *= 10; continue; }
      const q = clampv(p.map((v, k) => v + dx[k]), lo, hi), rq = f(q), Sq = ssr(rq);
      if (Sq < S) { const rel = (S - Sq) / Math.max(S, 1e-300); p = q; r = rq; S = Sq; lam = Math.max(1e-9, lam / 5); improved = true; if (rel < 1e-10) iter = maxIter; break; }
      lam *= 8;
    }
    if (!improved) break;
  }
  return { p, r, ssr: S, iter };
};
/* standard errors of the parameters at the optimum */
FIT.errors = (f, res, lo, hi) => {
  const P = res.p.length, M = res.r.length, J = jacobian(f, res.p, res.r, lo, hi), A = new Float64Array(P * P);
  for (let i = 0; i < M; i++) for (let a = 0; a < P; a++) for (let b = 0; b < P; b++) A[a * P + b] += J[i * P + a] * J[i * P + b];
  const C = invSym(A, P), s2 = res.ssr / Math.max(1, M - P);
  return res.p.map((v, i) => (C && C[i * P + i] > 0 ? Math.sqrt(s2 * C[i * P + i]) : NaN));
};
/* deterministic pseudo-random numbers */
const rng = seed => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
/* several starts (the given one first, then a scrambled grid over the bounds), the best few refined.
   onStep(fraction) may return a promise (to keep a page responsive). */
FIT.global = async (f, p0, lo, hi, opt = {}) => {
  const P = p0.length, nStart = opt.starts || Math.min(24, 6 + 4 * P), R = rng(opt.seed || 7), runs = [];
  const starts = [clampv(p0.slice(), lo, hi)];
  // Latin hypercube over the bounds: every parameter sampled in every stratum, independently shuffled
  const perms = p0.map(() => { const a = Array.from({ length: nStart - 1 }, (_, i) => i); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; });
  for (let s = 1; s < nStart; s++) starts.push(p0.map((v, i) => lo[i] + (hi[i] - lo[i]) * (perms[i][s - 1] + R()) / (nStart - 1)));
  for (let s = 0; s < starts.length; s++) {
    runs.push(FIT.lm(f, starts[s], lo, hi, { maxIter: opt.screenIter || 15 }));
    if (opt.onStep) await opt.onStep(0.7 * (s + 1) / starts.length);
  }
  runs.sort((a, b) => a.ssr - b.ssr);
  let best = null;
  const top = runs.slice(0, 3);
  for (let i = 0; i < top.length; i++) { const r = FIT.lm(f, top[i].p, lo, hi, { maxIter: opt.maxIter || 80 }); if (!best || r.ssr < best.ssr) best = r; if (opt.onStep) await opt.onStep(0.7 + 0.3 * (i + 1) / top.length); }
  best.sigma = FIT.errors(f, best, lo, hi);
  best.rms = Math.sqrt(best.ssr / best.r.length);
  return best;
};
})();
