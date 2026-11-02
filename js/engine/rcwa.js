/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/rcwa.js
   Rigorous coupled-wave analysis (RCWA, Fourier modal method) for
   1D gratings: layered structures periodic in x, light in the
   x–z plane, TE (s) or TM (p) polarisation.

   • Each layer is a slice with piecewise-constant ε(x); curved
     profiles (sinusoids, conformal coatings) are cut into slices
     (staircase), and identical consecutive slices are merged, so
     lamellar gratings are represented exactly.
   • TM uses Li's inverse rule (Toeplitz of 1/ε), which makes metal
     gratings converge.
   • Layers are combined with scattering matrices and a gap medium
     (Rumpf, PIER B 35, 241 (2011)), which stays stable for thick
     and absorbing layers.
   • Convention e^(+jωt): ε = (n − jk)². Diffraction efficiencies of
     every propagating order; R, T and A = 1 − R − T.

   The numerical core is one self-contained function, so the same
   code runs on the main thread and inside a Web Worker.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util;

/* ================= numerical core (no outside references) ================= */
function rcwaCore() {
  // complex n×n matrices: { n, re: Float64Array, im: Float64Array }, row-major
  const M = n => ({ n, re: new Float64Array(n * n), im: new Float64Array(n * n) });
  const eye = n => { const A = M(n); for (let i = 0; i < n; i++) A.re[i * n + i] = 1; return A; };
  const diag = (dr, di) => { const n = dr.length, A = M(n); for (let i = 0; i < n; i++) { A.re[i * n + i] = dr[i]; A.im[i * n + i] = di[i]; } return A; };
  const mul = (A, B) => {
    const n = A.n, C = M(n), ar = A.re, ai = A.im, br = B.re, bi = B.im, cr = C.re, ci = C.im;
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) {
      const xr = ar[i * n + k], xi = ai[i * n + k];
      if (xr === 0 && xi === 0) continue;
      const o = i * n, p = k * n;
      for (let j = 0; j < n; j++) { const yr = br[p + j], yi = bi[p + j]; cr[o + j] += xr * yr - xi * yi; ci[o + j] += xr * yi + xi * yr; }
    }
    return C;
  };
  const lin = (A, a, B, b) => { const n = A.n, C = M(n); for (let i = 0; i < n * n; i++) { C.re[i] = a * A.re[i] + b * B.re[i]; C.im[i] = a * A.im[i] + b * B.im[i]; } return C; };
  const add = (A, B) => lin(A, 1, B, 1), sub = (A, B) => lin(A, 1, B, -1), scl = (A, s) => lin(A, s, A, 0);
  // left- / right-multiply by a diagonal (dr + j di)
  const dmulL = (dr, di, A) => { const n = A.n, C = M(n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = i * n + j; C.re[k] = dr[i] * A.re[k] - di[i] * A.im[k]; C.im[k] = dr[i] * A.im[k] + di[i] * A.re[k]; } return C; };
  const dmulR = (A, dr, di) => { const n = A.n, C = M(n); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const k = i * n + j; C.re[k] = A.re[k] * dr[j] - A.im[k] * di[j]; C.im[k] = A.re[k] * di[j] + A.im[k] * dr[j]; } return C; };
  const inv = A0 => {
    // Gauss–Jordan with partial pivoting
    const n = A0.n, ar = Float64Array.from(A0.re), ai = Float64Array.from(A0.im), I = eye(n), br = I.re, bi = I.im;
    for (let c = 0; c < n; c++) {
      let p = c, best = -1;
      for (let r = c; r < n; r++) { const m = ar[r * n + c] ** 2 + ai[r * n + c] ** 2; if (m > best) { best = m; p = r; } }
      if (best === 0) { ar[c * n + c] = 1e-300; best = 1e-600; }
      if (p !== c) for (let j = 0; j < n; j++) { let t = ar[c * n + j]; ar[c * n + j] = ar[p * n + j]; ar[p * n + j] = t; t = ai[c * n + j]; ai[c * n + j] = ai[p * n + j]; ai[p * n + j] = t; t = br[c * n + j]; br[c * n + j] = br[p * n + j]; br[p * n + j] = t; t = bi[c * n + j]; bi[c * n + j] = bi[p * n + j]; bi[p * n + j] = t; }
      const pr = ar[c * n + c], pi = ai[c * n + c], d = pr * pr + pi * pi, qr = pr / d, qi = -pi / d;
      for (let j = 0; j < n; j++) {
        let xr = ar[c * n + j], xi = ai[c * n + j]; ar[c * n + j] = xr * qr - xi * qi; ai[c * n + j] = xr * qi + xi * qr;
        xr = br[c * n + j]; xi = bi[c * n + j]; br[c * n + j] = xr * qr - xi * qi; bi[c * n + j] = xr * qi + xi * qr;
      }
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const fr = ar[r * n + c], fi = ai[r * n + c];
        if (fr === 0 && fi === 0) continue;
        for (let j = 0; j < n; j++) {
          const xr = ar[c * n + j], xi = ai[c * n + j]; ar[r * n + j] -= fr * xr - fi * xi; ai[r * n + j] -= fr * xi + fi * xr;
          const yr = br[c * n + j], yi = bi[c * n + j]; br[r * n + j] -= fr * yr - fi * yi; bi[r * n + j] -= fr * yi + fi * yr;
        }
      }
    }
    return I;
  };
  /* eigen-decomposition of a general complex matrix: Householder reduction
     to Hessenberg form, shifted QR (Givens) to the Schur form T = Z* A Z,
     then eigenvectors by back-substitution in T. */
  const eig = A0 => {
    const n = A0.n, hr = Float64Array.from(A0.re), hi = Float64Array.from(A0.im), Z = eye(n), zr = Z.re, zi = Z.im;
    const H = (i, j) => i * n + j;
    for (let k = 0; k < n - 2; k++) {
      let norm = 0; for (let i = k + 1; i < n; i++) norm += hr[H(i, k)] ** 2 + hi[H(i, k)] ** 2;
      norm = Math.sqrt(norm);
      if (norm < 1e-300) continue;
      const x0r = hr[H(k + 1, k)], x0i = hi[H(k + 1, k)], x0a = Math.hypot(x0r, x0i);
      const ph = x0a > 0 ? [x0r / x0a, x0i / x0a] : [1, 0];
      const vr = new Float64Array(n), vi = new Float64Array(n);
      for (let i = k + 1; i < n; i++) { vr[i] = hr[H(i, k)]; vi[i] = hi[H(i, k)]; }
      vr[k + 1] += ph[0] * norm; vi[k + 1] += ph[1] * norm;
      let vn = 0; for (let i = k + 1; i < n; i++) vn += vr[i] ** 2 + vi[i] ** 2;
      vn = Math.sqrt(vn); if (vn < 1e-300) continue;
      for (let i = k + 1; i < n; i++) { vr[i] /= vn; vi[i] /= vn; }
      // H ← (I − 2vv*) H
      for (let j = 0; j < n; j++) {
        let sr = 0, si = 0;
        for (let i = k + 1; i < n; i++) { sr += vr[i] * hr[H(i, j)] + vi[i] * hi[H(i, j)]; si += vr[i] * hi[H(i, j)] - vi[i] * hr[H(i, j)]; }
        for (let i = k + 1; i < n; i++) { hr[H(i, j)] -= 2 * (vr[i] * sr - vi[i] * si); hi[H(i, j)] -= 2 * (vr[i] * si + vi[i] * sr); }
      }
      // H ← H (I − 2vv*),  Z ← Z (I − 2vv*)
      const right = (ar, ai) => {
        for (let i = 0; i < n; i++) {
          let sr = 0, si = 0;
          for (let j = k + 1; j < n; j++) { sr += ar[H(i, j)] * vr[j] - ai[H(i, j)] * vi[j]; si += ar[H(i, j)] * vi[j] + ai[H(i, j)] * vr[j]; }
          for (let j = k + 1; j < n; j++) { ar[H(i, j)] -= 2 * (sr * vr[j] + si * vi[j]); ai[H(i, j)] -= 2 * (si * vr[j] - sr * vi[j]); }
        }
      };
      right(hr, hi); right(zr, zi);
      for (let i = k + 2; i < n; i++) { hr[H(i, k)] = 0; hi[H(i, k)] = 0; }
    }
    // shifted QR on the Hessenberg matrix
    let top = n - 1, iter = 0;
    const cs = new Float64Array(4 * n);
    while (top > 0) {
      let l = top;
      while (l > 0) {
        const s = Math.hypot(hr[H(l - 1, l - 1)], hi[H(l - 1, l - 1)]) + Math.hypot(hr[H(l, l)], hi[H(l, l)]);
        if (Math.hypot(hr[H(l, l - 1)], hi[H(l, l - 1)]) <= 1e-15 * (s || 1)) { hr[H(l, l - 1)] = 0; hi[H(l, l - 1)] = 0; break; }
        l--;
      }
      if (l === top) { top--; iter = 0; continue; }
      if (++iter > 60 * n) break;
      // Wilkinson shift from the trailing 2×2 block (exceptional shifts now and then)
      const ar = hr[H(top - 1, top - 1)], ai = hi[H(top - 1, top - 1)], br = hr[H(top - 1, top)], bi = hi[H(top - 1, top)];
      const cr = hr[H(top, top - 1)], ci = hi[H(top, top - 1)], dr = hr[H(top, top)], di = hi[H(top, top)];
      let mr, mi;
      if (iter % 11 === 10) { mr = dr + Math.abs(cr) * 0.75; mi = di + Math.abs(ci) * 0.75; }
      else {
        const tr = (ar + dr) / 2, ti = (ai + di) / 2;
        const qr = (ar - dr) / 2, qi = (ai - di) / 2;
        // disc = q² + bc
        const discr = qr * qr - qi * qi + br * cr - bi * ci, disci = 2 * qr * qi + br * ci + bi * cr;
        const m = Math.hypot(discr, disci), sr = Math.sqrt(Math.max(0, (m + discr) / 2)), si = (disci < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (m - discr) / 2));
        const e1r = tr + sr, e1i = ti + si, e2r = tr - sr, e2i = ti - si;
        if (Math.hypot(e1r - dr, e1i - di) < Math.hypot(e2r - dr, e2i - di)) { mr = e1r; mi = e1i; } else { mr = e2r; mi = e2i; }
      }
      for (let i = l; i <= top; i++) { hr[H(i, i)] -= mr; hi[H(i, i)] -= mi; }
      for (let k = l; k < top; k++) {
        const xr = hr[H(k, k)], xi = hi[H(k, k)], yr = hr[H(k + 1, k)], yi = hi[H(k + 1, k)];
        const r = Math.sqrt(xr * xr + xi * xi + yr * yr + yi * yi) || 1;
        const c0 = xr / r, c1 = xi / r, s0 = yr / r, s1 = yi / r;
        cs[4 * k] = c0; cs[4 * k + 1] = c1; cs[4 * k + 2] = s0; cs[4 * k + 3] = s1;
        for (let j = k; j < n; j++) {
          const ur = hr[H(k, j)], ui = hi[H(k, j)], wr = hr[H(k + 1, j)], wi = hi[H(k + 1, j)];
          // row k ← c̄ u + s̄ w ; row k+1 ← −s u + c w
          hr[H(k, j)] = c0 * ur + c1 * ui + s0 * wr + s1 * wi; hi[H(k, j)] = c0 * ui - c1 * ur + s0 * wi - s1 * wr;
          hr[H(k + 1, j)] = -(s0 * ur - s1 * ui) + (c0 * wr - c1 * wi); hi[H(k + 1, j)] = -(s0 * ui + s1 * ur) + (c0 * wi + c1 * wr);
        }
      }
      for (let k = l; k < top; k++) {
        const c0 = cs[4 * k], c1 = cs[4 * k + 1], s0 = cs[4 * k + 2], s1 = cs[4 * k + 3];
        const colrot = (ar2, ai2, rows) => {
          for (let i = 0; i <= rows; i++) {
            const ur = ar2[H(i, k)], ui = ai2[H(i, k)], wr = ar2[H(i, k + 1)], wi = ai2[H(i, k + 1)];
            // col k ← u c + w s ; col k+1 ← −u s̄ + w c̄
            ar2[H(i, k)] = ur * c0 - ui * c1 + wr * s0 - wi * s1; ai2[H(i, k)] = ur * c1 + ui * c0 + wr * s1 + wi * s0;
            ar2[H(i, k + 1)] = -(ur * s0 + ui * s1) + (wr * c0 + wi * c1); ai2[H(i, k + 1)] = -(ui * s0 - ur * s1) + (wi * c0 - wr * c1);
          }
        };
        colrot(hr, hi, Math.min(k + 2, top)); colrot(zr, zi, n - 1);
      }
      for (let i = l; i <= top; i++) { hr[H(i, i)] += mr; hi[H(i, i)] += mi; }
    }
    // eigenvalues and eigenvectors of the triangular T, then x = Z y
    const lr = new Float64Array(n), li = new Float64Array(n);
    for (let i = 0; i < n; i++) { lr[i] = hr[H(i, i)]; li[i] = hi[H(i, i)]; }
    const Y = M(n);
    let tn = 0; for (let i = 0; i < n * n; i++) tn = Math.max(tn, Math.abs(hr[i]) + Math.abs(hi[i]));
    const small = 1e-14 * (tn || 1);
    for (let k = 0; k < n; k++) {
      Y.re[k * n + k] = 1;
      for (let i = k - 1; i >= 0; i--) {
        let sr = 0, si = 0;
        for (let j = i + 1; j <= k; j++) { const tr = hr[H(i, j)], ti = hi[H(i, j)], yr = Y.re[j * n + k], yi = Y.im[j * n + k]; sr += tr * yr - ti * yi; si += tr * yi + ti * yr; }
        let dr = lr[i] - lr[k], di = li[i] - li[k];
        if (Math.hypot(dr, di) < small) { dr = small; di = 0; }
        const d = dr * dr + di * di;
        Y.re[i * n + k] = -(sr * dr + si * di) / d; Y.im[i * n + k] = -(si * dr - sr * di) / d;
      }
    }
    const X = mul(Z, Y);
    for (let k = 0; k < n; k++) { let s = 0; for (let i = 0; i < n; i++) s += X.re[i * n + k] ** 2 + X.im[i * n + k] ** 2; s = Math.sqrt(s) || 1; for (let i = 0; i < n; i++) { X.re[i * n + k] /= s; X.im[i * n + k] /= s; } }
    return { lr, li, vec: X };
  };
  /* √(kx² − ε) for a mode e^(−q k0 z): Re q ≥ 0 (decaying); nearly propagating
     modes (λ on the negative real axis up to round-off) get Im q > 0, i.e. a
     forward wave, whatever the sign of the round-off in Im λ */
  const csqrt = (a, b) => {
    if (a < 0 && Math.abs(b) < 1e-9 * -a) return [Math.max(0, b) / (2 * Math.sqrt(-a)), Math.sqrt(-a)];
    const m = Math.hypot(a, b); let r = Math.sqrt(Math.max(0, (m + a) / 2)), i = (b < 0 ? -1 : 1) * Math.sqrt(Math.max(0, (m - a) / 2));
    if (Math.abs(r) < 1e-12 * (m || 1) && i < 0) { r = -r; i = -i; }
    return [r, i];
  };
  // Fourier coefficients ε_h, h = −2M…2M, of piecewise-constant runs over one period [0, 1)
  const fourier = (runs, val, H2) => {
    const re = new Float64Array(2 * H2 + 1), im = new Float64Array(2 * H2 + 1);
    for (const r of runs) {
      const [vr, vi] = val(r.m);
      for (let h = -H2; h <= H2; h++) {
        let cr, ci;
        if (h === 0) { cr = r.b - r.a; ci = 0; }
        else { const w = 2 * Math.PI * h; cr = (Math.sin(w * r.b) - Math.sin(w * r.a)) / w; ci = (Math.cos(w * r.b) - Math.cos(w * r.a)) / w; } // ∫ e^{−j w x} dx
        re[h + H2] += vr * cr - vi * ci; im[h + H2] += vr * ci + vi * cr;
      }
    }
    return { re, im };
  };
  const toeplitz = (f, N, H2) => { const A = M(N); for (let i = 0; i < N; i++) for (let p = 0; p < N; p++) { const h = i - p + H2; A.re[i * N + p] = f.re[h]; A.im[i * N + p] = f.im[h]; } return A; };
  const star = (A, B, I) => {
    const D = mul(A.S12, inv(sub(I, mul(B.S11, A.S22))));
    const F = mul(B.S21, inv(sub(I, mul(A.S22, B.S11))));
    return { S11: add(A.S11, mul(mul(D, B.S11), A.S21)), S12: mul(D, B.S12), S21: mul(F, A.S21), S22: add(B.S22, mul(mul(F, A.S22), B.S12)) };
  };

  /* problem: { period (nm), slices: [{ d (nm), runs: [{ a, b, m }] }] top → bottom,
     eps: [[re, im] per material], inc: material index (lossless), sub: index, orders }
     returns { R, T, A, Rn: [{ m, eff }], Tn } */
  function solve(pb, lam, thetaDeg, pol) {
    const Mo = Math.max(0, Math.round(pb.orders)), N = 2 * Mo + 1, H2 = 2 * Mo, k0 = 2 * Math.PI / lam, TM = pol === 'p';
    const e = i => pb.eps[i];
    const nI = Math.sqrt(Math.max(1e-12, e(pb.inc)[0])), th = thetaDeg * Math.PI / 180;
    const kx = new Float64Array(N);
    for (let i = 0; i < N; i++) kx[i] = nI * Math.sin(th) - (i - Mo) * lam / pb.period;
    const I = eye(N), z0 = new Float64Array(N);
    // homogeneous medium: q = √(kx² − ε), W = I, V = q (TE) or q/ε (TM)
    const homo = ([er, ei]) => {
      const qr = new Float64Array(N), qi = new Float64Array(N), vr = new Float64Array(N), vi = new Float64Array(N);
      for (let i = 0; i < N; i++) {
        const [a, b] = csqrt(kx[i] * kx[i] - er, -ei);
        qr[i] = a; qi[i] = b;
        if (TM) { const d = er * er + ei * ei; vr[i] = (a * er + b * ei) / d; vi[i] = (b * er - a * ei) / d; } else { vr[i] = a; vi[i] = b; }
      }
      return { qr, qi, W: I, V: diag(vr, vi), Wi: I, Vi: inv(diag(vr, vi)) };
    };
    const gap = homo([1.21, -0.07]);
    const V0 = gap.V;
    const Ssub = (L) => {
      // Rumpf layer S-matrix (symmetric), mode amplitudes e^(−q k0 z)
      const A = add(L.Wi, mul(L.Vi, V0)), B = sub(L.Wi, mul(L.Vi, V0));
      const xr = new Float64Array(N), xi = new Float64Array(N);
      for (let i = 0; i < N; i++) { const m = Math.exp(-L.qr[i] * k0 * L.d), ph = -L.qi[i] * k0 * L.d; xr[i] = m * Math.cos(ph); xi[i] = m * Math.sin(ph); }
      const Ai = inv(A), XB = dmulL(xr, xi, B), XBAiX = dmulR(mul(XB, Ai), xr, xi);
      const D = sub(A, mul(XBAiX, B)), Di = inv(D);
      const S11 = mul(Di, sub(mul(XBAiX, A), B));
      const S12 = mul(Di, dmulL(xr, xi, sub(A, mul(mul(B, Ai), B))));
      return { S11, S12, S21: S12, S22: S11 };
    };
    // reflection side
    const ref = homo(e(pb.inc)), trn = homo(e(pb.sub));
    let S;
    {
      const A = add(I, mul(inv(V0), ref.V)), B = sub(I, mul(inv(V0), ref.V)), Ai = inv(A);
      S = { S11: scl(mul(Ai, B), -1), S12: scl(Ai, 2), S21: scl(sub(A, mul(mul(B, Ai), B)), 0.5), S22: mul(B, Ai) };
    }
    for (const sl of pb.slices) {
      if (!(sl.d > 0)) continue;
      let L;
      if (sl.runs.length === 1) { L = homo(e(sl.runs[0].m)); }
      else {
        const fe = fourier(sl.runs, e, H2), Ee = toeplitz(fe, N, H2);
        const K2 = new Float64Array(N); for (let i = 0; i < N; i++) K2[i] = kx[i] * kx[i];
        let Om, Aa = null;
        if (!TM) Om = sub(diag(K2, z0), Ee);
        else {
          const fa = fourier(sl.runs, i => { const [a, b] = e(i), d = a * a + b * b; return [a / d, -b / d]; }, H2);
          Aa = toeplitz(fa, N, H2);
          const Ei = inv(Ee), B = sub(dmulR(dmulL(kx, z0, Ei), kx, z0), I);
          Om = mul(inv(Aa), B);
        }
        const ev = eig(Om), qr = new Float64Array(N), qi = new Float64Array(N);
        for (let i = 0; i < N; i++) { const [a, b] = csqrt(ev.lr[i], ev.li[i]); qr[i] = a; qi[i] = b; }
        const W = ev.vec, V = TM ? dmulR(mul(Aa, W), qr, qi) : dmulR(W, qr, qi);
        L = { qr, qi, W, V, Wi: inv(W), Vi: inv(V) };
      }
      L.d = sl.d;
      S = star(S, Ssub(L), I);
    }
    {
      const A = add(I, mul(inv(V0), trn.V)), B = sub(I, mul(inv(V0), trn.V)), Ai = inv(A);
      S = star(S, { S11: mul(B, Ai), S12: scl(sub(A, mul(mul(B, Ai), B)), 0.5), S21: scl(Ai, 2), S22: scl(mul(Ai, B), -1) }, I);
    }
    // incident: unit amplitude in order 0 (E_y for TE, H_y for TM)
    const c0 = Mo;
    const [eIr] = e(pb.inc), [eTr, eTi] = e(pb.sub);
    const kzI0 = Math.sqrt(Math.max(0, eIr - kx[c0] * kx[c0]));
    let R = 0, T = 0;
    const Rn = [], Tn = [];
    for (let i = 0; i < N; i++) {
      const rr = S.S11.re[i * N + c0], ri = S.S11.im[i * N + c0], tr = S.S21.re[i * N + c0], ti = S.S21.im[i * N + c0];
      // kz = −j q; Re(kz) = Im(q)
      const kzr = ref.qi[i], kzt_r = trn.qi[i], kzt_i = -trn.qr[i];
      let effR, effT;
      if (!TM) { effR = (rr * rr + ri * ri) * kzr / kzI0; effT = (tr * tr + ti * ti) * kzt_r / kzI0; }
      else {
        effR = (rr * rr + ri * ri) * (kzr / eIr) / (kzI0 / eIr);
        const d = eTr * eTr + eTi * eTi, re = (kzt_r * eTr + kzt_i * eTi) / d;
        effT = (tr * tr + ti * ti) * re / (kzI0 / eIr);
      }
      if (kzr > 1e-9) { R += effR; Rn.push({ m: i - Mo, eff: effR }); }
      if (kzt_r > 1e-9) { T += effT; Tn.push({ m: i - Mo, eff: effT }); }
    }
    return { R, T, A: 1 - R - T, Rn, Tn };
  }
  return { solve, eig, inv, mul, M };
}
const core = rcwaCore();
const RC = RNBX.rcwa = { core, solve: core.solve };

/* ---------- materials → ε (e^(+jωt) convention) ---------- */
RC.eps = (m, nm) => { const q = RNBX.thinfilm.nk(m, nm); return [q.n * q.n - q.k * q.k, -2 * q.n * q.k]; };

/* geometry → problem at one wavelength */
RC.problemAt = (geo, nm) => ({ period: geo.period, slices: geo.slices, orders: geo.orders, inc: 0, sub: 1, eps: geo.mats.map(m => RC.eps(m, nm)) });

/* ---------- unit cells (Layer Studio ▸ Pattern) ----------
   pat: { period (nm), ambient, ambientN, side, substrate: { mat, n, k },
          layers (top → bottom): [{ mat, n, k, nm, shapes: [shape] }] }
   A layer is a film of its own material (the background) with shapes in it:
     trap  { x, wb, wt, shift } — rectangle, trapezoid or slanted ridge
           (bottom width wb, top width wt, top centre moved by shift)
     sine  { x }                — sinusoidal surface, crest at x, depth = layer
     saw   { x, dir }           — blazed sawtooth, one tooth per period
   Each shape has its own material. Later shapes cover earlier ones. */
const PT = RC.pattern = {};
/* where a shape is solid at height u (0 = bottom of its layer, 1 = top): [l, r] in nm, or null */
PT.span = (sh, u, P) => {
  if (sh.kind === 'sine') { const c = U.clamp(2 * u - 1, -1, 1), hw = P * Math.acos(c) / (2 * Math.PI); return hw > 1e-9 ? [sh.x - hw, sh.x + hw] : null; }
  if (sh.kind === 'saw') return sh.dir === -1 ? (u < 1 ? [sh.x, sh.x + (1 - u) * P] : null) : (u < 1 ? [sh.x + u * P, sh.x + P] : null);
  const w = (+sh.wb || 0) + ((sh.wt == null ? +sh.wb : +sh.wt) - (+sh.wb || 0)) * u, c = +sh.x + (+sh.shift || 0) * u;
  return w > 1e-9 ? [c - w / 2, c + w / 2] : null;
};
PT.isFlat = sh => sh.kind !== 'sine' && sh.kind !== 'saw' && (sh.wt == null || Math.abs(+sh.wt - +sh.wb) < 1e-9) && !(+sh.shift);
/* runs [{ a, b, m }] (fractions of the period) of one slice */
PT.runs = (bg, items, P) => {
  // items: [{ l, r, m }] in nm, painted in order over the background bg
  const segs = [];
  items.forEach(it => {
    let w = it.r - it.l;
    if (!(w > 1e-9)) return;
    if (w >= P - 1e-9) { segs.push({ l: 0, r: P, m: it.m }); return; }
    const l = ((it.l % P) + P) % P, r = l + w;
    if (r <= P + 1e-9) segs.push({ l, r: Math.min(P, r), m: it.m }); else { segs.push({ l, r: P, m: it.m }); segs.push({ l: 0, r: r - P, m: it.m }); }
  });
  const cuts = [...new Set([0, P].concat(...segs.map(q => [q.l, q.r])).map(v => U.round(v, 9)))].sort((a, b) => a - b);
  const runs = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const a = cuts[i], b = cuts[i + 1];
    if (b - a < 1e-9) continue;
    const mid = (a + b) / 2;
    let m = bg; segs.forEach(q => { if (mid > q.l && mid < q.r) m = q.m; });
    const last = runs[runs.length - 1];
    if (last && last.m === m) last.b = b / P; else runs.push({ a: a / P, b: b / P, m });
  }
  return runs;
};
/* outline of one copy of a shape (nm; x along the period, z up from the bottom of its layer) */
PT.poly = (sh, h, P) => {
  if (sh.kind === 'sine') { const out = []; for (let i = 0; i <= 48; i++) { const x = sh.x - P / 2 + P * i / 48; out.push([x, h * (0.5 + 0.5 * Math.cos(2 * Math.PI * (x - sh.x) / P))]); } return out; }
  if (sh.kind === 'saw') return sh.dir === -1 ? [[sh.x, 0], [sh.x, h], [sh.x + P, 0]] : [[sh.x, 0], [sh.x + P, h], [sh.x + P, 0]];
  const wb = +sh.wb || 0, wt = sh.wt == null ? wb : +sh.wt, s = +sh.shift || 0, x = +sh.x;
  return [[x - wb / 2, 0], [x + wb / 2, 0], [x + s + wt / 2, h], [x + s - wt / 2, h]];
};
/* keep the part of a polygon with a ≤ x ≤ b */
PT.clipX = (poly, a, b) => {
  const cut = (pts, inside, at) => {
    const out = [];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length], pi = inside(p), qi = inside(q);
      if (pi) out.push(p);
      if (pi !== qi) { const t = (at - p[0]) / (q[0] - p[0]); out.push([at, p[1] + (q[1] - p[1]) * t]); }
    });
    return out;
  };
  let r = cut(poly, p => p[0] >= a, a);
  if (r.length) r = cut(r, p => p[0] <= b, b);
  return r.length >= 3 ? r : null;
};
/* every copy of every shape over n periods: [{ li, si, k, pts }] with pts in nm, z from the layer bottom */
PT.copies = (L, li, P, n) => {
  const out = [];
  (L.shapes || []).forEach((sh, si) => {
    const base = PT.poly(sh, +L.nm || 0, P);
    for (let k = -2; k <= n + 1; k++) { const c = PT.clipX(base.map(q => [q[0] + k * P, q[1]]), 0, n * P); if (c) out.push({ li, si, k, pts: c, sh }); }
  });
  return out;
};
const mkey = m => JSON.stringify([m.mat || 'air', m.mat === 'custom' ? +m.n : 0, m.mat === 'custom' ? +m.k || 0 : 0]);
RC.fromPattern = (pat, opt = {}) => {
  const P = Math.max(1, +pat.period || 500), S = U.clamp(Math.round(opt.slices || pat.slices || 12), 2, 60);
  const amb = { mat: pat.ambient || 'air', n: pat.ambientN, k: 0 }, sub = pat.substrate || { mat: 'air' };
  const top = pat.side === 'bottom' ? sub : amb, bot = pat.side === 'bottom' ? amb : sub;
  const mats = [top, bot], idx = new Map([[mkey(top), 0]]);
  if (!idx.has(mkey(bot))) idx.set(mkey(bot), 1);
  const mi = m => { const k = mkey(m); if (!idx.has(k)) idx.set(k, mats.push({ mat: m.mat, n: m.n, k: m.k }) - 1); return idx.get(k); };
  const slices = [];
  (pat.layers || []).forEach(L => {
    const h = +L.nm || 0;
    if (!(h > 0)) return;
    const bg = mi(L), shapes = L.shapes || [], flat = shapes.every(PT.isFlat), n = flat ? 1 : S;
    for (let j = 0; j < n; j++) {
      const u = flat ? 0.5 : 1 - (j + 0.5) / n;   // top slice first
      const runs = PT.runs(bg, shapes.map(sh => { const sp = PT.span(sh, u, P); return sp ? { l: sp[0], r: sp[1], m: mi(sh) } : null; }).filter(Boolean), P);
      const prev = slices[slices.length - 1], d = h / n;
      if (prev && JSON.stringify(prev.runs) === JSON.stringify(runs)) prev.d += d; else slices.push({ d, runs });
    }
  });
  const geo = { period: P, orders: U.clamp(Math.round(opt.orders || pat.orders || 15), 1, 60), mats, slices };
  if (pat.side === 'bottom') geo.slices = geo.slices.slice().reverse();
  return geo;
};
/* angle of diffraction order m (degrees) into a medium of index n, or null if evanescent;
   same sign convention as the solver: kx = n_inc sin θ − m λ / Λ */
RC.orderAngle = (nInc, theta, m, lam, P, n) => { const s = (nInc * Math.sin(theta * Math.PI / 180) - m * lam / P) / n; return Math.abs(s) <= 1 ? Math.asin(s) * 180 / Math.PI : null; };

/* scan: synchronous (tests, workers unavailable) */
RC.scanSync = (geo, calc) => {
  const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, calc || {});
  const N = U.clamp(Math.round(c.points) || 101, 3, 2001), wl = c.scan === 'wl';
  const lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax;
  const x = [], R = [], T = [], A = [];
  for (let i = 0; i < N; i++) {
    const v = lo + (hi - lo) * i / (N - 1), lam = wl ? v : +c.lambda, th = wl ? +c.angle || 0 : Math.min(89.9, v);
    const pb = RC.problemAt(geo, lam);
    let r;
    if (c.pol === 'avg') { const a = core.solve(pb, lam, th, 's'), b = core.solve(pb, lam, th, 'p'); r = { R: (a.R + b.R) / 2, T: (a.T + b.T) / 2 }; }
    else r = core.solve(pb, lam, th, c.pol);
    x.push(wl && c.unit === 'um' ? v / 1000 : v); R.push(r.R); T.push(r.T); A.push(Math.max(0, 1 - r.R - r.T));
  }
  return { x, series: { R, T, A }, xlabel: wl ? (c.unit === 'um' ? 'Wavelength (µm)' : 'Wavelength (nm)') : 'Angle of incidence (°)', warn: [], calc: c, method: 'rcwa' };
};

/* ---------- background scans in a Web Worker ---------- */
let worker = null, workerFailed = false, jobSeq = 0;
const jobs = new Map();
const workerSrc = () => `const core = (${rcwaCore.toString()})();
onmessage = ev => {
  const { id, items, period, slices, orders, pol } = ev.data, out = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i], pb = { period, slices, orders, inc: 0, sub: 1, eps: it.eps };
    let r;
    if (pol === 'avg') { const a = core.solve(pb, it.lam, it.th, 's'), b = core.solve(pb, it.lam, it.th, 'p'); r = { R: (a.R + b.R) / 2, T: (a.T + b.T) / 2 }; }
    else r = core.solve(pb, it.lam, it.th, pol);
    out.push([r.R, r.T]);
    if (i % 4 === 3 || i === items.length - 1) postMessage({ id, done: i + 1, total: items.length, part: out.splice(0) });
  }
};`;
const getWorker = () => {
  if (worker || workerFailed) return worker;
  try {
    worker = new Worker(URL.createObjectURL(new Blob([workerSrc()], { type: 'text/javascript' })));
    worker.onmessage = ev => {
      const j = jobs.get(ev.data.id); if (!j) return;
      j.vals.push(...ev.data.part); j.progress = ev.data.done / ev.data.total;
      if (ev.data.done === ev.data.total) { j.finish(); jobs.delete(ev.data.id); }
      else if (j.onProgress) j.onProgress(j.progress);
    };
    worker.onerror = () => { workerFailed = true; worker = null; };
  } catch (e) { workerFailed = true; worker = null; }
  return worker;
};

/* cached, asynchronous: returns the finished result, or { pending, progress }
   and calls onUpdate when there is news (progress or the result) */
const cache = new Map();
RC.cached = (geo, calc, onUpdate) => {
  const c = Object.assign({}, RNBX.thinfilm.DEFAULT_CALC, calc || {});
  const key = JSON.stringify([geo, c]);
  const hit = cache.get(key);
  if (hit && hit.result) return hit.result;
  if (hit) { if (onUpdate) hit.listeners.add(onUpdate); return { pending: true, progress: hit.progress || 0, calc: c }; }
  const entry = { listeners: new Set(onUpdate ? [onUpdate] : []), progress: 0 };
  cache.set(key, entry);
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  const N = U.clamp(Math.round(c.points) || 101, 3, 2001), wl = c.scan === 'wl', lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax;
  const xs = [], items = [];
  for (let i = 0; i < N; i++) { const v = lo + (hi - lo) * i / (N - 1), lam = wl ? v : +c.lambda; xs.push(v); items.push({ lam, th: wl ? +c.angle || 0 : Math.min(89.9, v), eps: geo.mats.map(m => RC.eps(m, lam)) }); }
  const finish = vals => {
    const R = vals.map(v => v[0]), T = vals.map(v => v[1]);
    entry.result = { x: xs.map(v => wl && c.unit === 'um' ? v / 1000 : v), series: { R, T, A: R.map((r, i) => Math.max(0, 1 - r - T[i])) }, xlabel: wl ? (c.unit === 'um' ? 'Wavelength (µm)' : 'Wavelength (nm)') : 'Angle of incidence (°)', warn: [], calc: c, method: 'rcwa' };
    entry.listeners.forEach(f => f()); entry.listeners.clear();
  };
  const w = getWorker();
  if (w) {
    const id = ++jobSeq, vals = [];
    jobs.set(id, { vals, finish: () => finish(vals), onProgress: p => { entry.progress = p; entry.listeners.forEach(f => f(p)); } });
    w.postMessage({ id, items, period: geo.period, slices: geo.slices, orders: geo.orders, pol: c.pol });
  } else {
    // no worker (very old browser): compute in small chunks on the main thread
    const vals = []; let i = 0;
    const step = () => {
      const t0 = Date.now();
      while (i < items.length && Date.now() - t0 < 30) {
        const it = items[i++], pb = { period: geo.period, slices: geo.slices, orders: geo.orders, inc: 0, sub: 1, eps: it.eps };
        let r; if (c.pol === 'avg') { const a = core.solve(pb, it.lam, it.th, 's'), b = core.solve(pb, it.lam, it.th, 'p'); r = { R: (a.R + b.R) / 2, T: (a.T + b.T) / 2 }; } else r = core.solve(pb, it.lam, it.th, c.pol);
        vals.push([r.R, r.T]);
      }
      entry.progress = i / items.length;
      if (i < items.length) { entry.listeners.forEach(f => f(entry.progress)); setTimeout(step, 0); } else finish(vals);
    };
    setTimeout(step, 0);
  }
  return { pending: true, progress: 0, calc: c };
};

/* any set of (λ, θ) points in the background: RC.batch(geo, [{ lam, th }], pol, onProgress)
   → { promise (resolves to [[R, T]…]), cancel } */
/* (each batch has a worker of its own, so a superseded calculation can be stopped at once) */
let workerUrl = null;
RC.batch = (geo, pts, pol, onProgress) => {
  const items = pts.map(q => ({ lam: q.lam, th: q.th, eps: geo.mats.map(m => RC.eps(m, q.lam)) }));
  let cancelled = false, w = null;
  const promise = new Promise(resolve => {
    if (!workerFailed) { try { workerUrl = workerUrl || URL.createObjectURL(new Blob([workerSrc()], { type: 'text/javascript' })); w = new Worker(workerUrl); } catch (e) { w = null; } }
    if (w) {
      const id = ++jobSeq, vals = [];
      w.onmessage = ev => {
        if (cancelled) return;
        vals.push(...ev.data.part);
        if (ev.data.done === ev.data.total) { w.terminate(); w = null; resolve(vals); } else if (onProgress) onProgress(ev.data.done / ev.data.total);
      };
      w.postMessage({ id, items, period: geo.period, slices: geo.slices, orders: geo.orders, pol });
    } else {
      const vals = []; let i = 0;
      const step = () => {
        if (cancelled) return;
        const t0 = Date.now();
        while (i < items.length && Date.now() - t0 < 30) {
          const it = items[i++], pb = { period: geo.period, slices: geo.slices, orders: geo.orders, inc: 0, sub: 1, eps: it.eps };
          let r; if (pol === 'avg') { const a = core.solve(pb, it.lam, it.th, 's'), b = core.solve(pb, it.lam, it.th, 'p'); r = { R: (a.R + b.R) / 2, T: (a.T + b.T) / 2 }; } else r = core.solve(pb, it.lam, it.th, pol);
          vals.push([r.R, r.T]);
        }
        if (onProgress) onProgress(i / items.length);
        if (i < items.length) setTimeout(step, 0); else resolve(vals);
      };
      setTimeout(step, 0);
    }
  });
  return { promise, cancel: () => { cancelled = true; if (w) { w.terminate(); w = null; } } };
};
})();
