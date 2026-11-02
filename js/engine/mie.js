/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/mie.js
   Exact light scattering by spheres (Mie theory) and by two spheres
   on a common axis (generalised multi-sphere Mie theory).

   • Single spheres and core–shell (any number of shells): the
     coefficients aₙ, bₙ, extinction / scattering / absorption
     cross-sections, and the near field.
   • Dimers (and single particles) in one framework: each particle's
     scattered field is a sum of outgoing vector spherical wave
     functions M̄, N̄ (normalised associated Legendre functions);
     the field scattered by one particle is re-expanded about the
     other with axial translation coefficients, and the coupled
     equations are solved order by order in m. This is exact up to
     the multipole order kept, so it resolves the field in gaps of
     a nanometre (the SERS hot spot) when enough orders are kept.

   Convention: time dependence e^{−iωt}, refractive index n + ik,
   h = h⁽¹⁾. Lengths in nm. The host medium is lossless.
   The geometry: particles on the z axis, light travelling along +x
   (perpendicular to the axis), polarised along z (along the axis,
   the hot-spot polarisation) or along y (across it).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const MIE = RNBX.mie = {};

/* ---------- complex numbers as [re, im] ---------- */
const cadd = (a, b) => [a[0] + b[0], a[1] + b[1]], csub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cscale = (a, s) => [a[0] * s, a[1] * s];
const csin = z => [Math.sin(z[0]) * Math.cosh(z[1]), Math.cos(z[0]) * Math.sinh(z[1])];
const ccos = z => [Math.cos(z[0]) * Math.cosh(z[1]), -Math.sin(z[0]) * Math.sinh(z[1])];
const IPOW = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const ipow = n => IPOW[((n % 4) + 4) % 4];
MIE.c = { cadd, csub, cmul, cdiv, cscale };

/* ---------- Riccati–Bessel functions of complex argument ----------
   ψₙ(z) = z jₙ(z), χₙ(z) = −z yₙ(z), ξₙ = ψₙ − iχₙ = z hₙ⁽¹⁾(z); with derivatives. */
const riccati = (z, N) => {
  const az = Math.hypot(z[0], z[1]), nst = Math.max(N + 16, Math.ceil(az + 4 * Math.cbrt(az) + 16));
  // logarithmic derivative Dₙ = ψₙ'/ψₙ, downward (stable)
  const D = new Array(nst + 1); D[nst] = [0, 0];
  for (let n = nst; n > 0; n--) { const nz = cdiv([n, 0], z); D[n - 1] = csub(nz, cdiv([1, 0], cadd(D[n], nz))); }
  const psi = [csin(z)], chi = [ccos(z)];
  chi[1] = cadd(cdiv(chi[0], z), csin(z));            // χ = −z y: χ₀ = cos z, χ₁ = cos z / z + sin z
  for (let n = 1; n <= N; n++) psi[n] = cdiv(psi[n - 1], cadd(D[n], cdiv([n, 0], z)));
  for (let n = 2; n <= N; n++) chi[n] = csub(cmul(cdiv([2 * n - 1, 0], z), chi[n - 1]), chi[n - 2]);
  const dpsi = [], dchi = [];
  for (let n = 0; n <= N; n++) {
    dpsi[n] = cmul(D[n], psi[n]);
    dchi[n] = n === 0 ? cscale(csin(z), -1) : csub(chi[n - 1], cmul(cdiv([n, 0], z), chi[n]));
  }
  return { psi, chi, dpsi, dchi };
};
MIE.riccati = riccati;

/* ---------- Mie coefficients of a layered sphere ----------
   layers: [{ r (outer radius, nm), n: [re, im] }] from the core outwards; nMed real; λ in nm.
   Returns { a: [..], b: [..] } (index 1..N), a = TM (electric), b = TE (magnetic). */
MIE.coeffs = (layers, nMed, lam, N) => {
  const k = 2 * Math.PI * nMed / lam, a = [null], b = [null];
  const rel = layers.map(L => ({ x: k * L.r, m: [L.n[0] / nMed, L.n[1] / nMed] }));
  // ratios R (TE: m f'/f, TM: f'/(m f)) carried outwards through the layers
  let RE = null, RM = null;
  rel.forEach((L, li) => {
    const zo = cscale(L.m, L.x), fo = riccati(zo, N);
    if (li === 0) {
      RE = []; RM = [];
      for (let n = 1; n <= N; n++) { const Dn = cdiv(fo.dpsi[n], fo.psi[n]); RE[n] = cmul(L.m, Dn); RM[n] = cdiv(Dn, L.m); }
      return;
    }
    const zi = cscale(L.m, rel[li - 1].x), fi = riccati(zi, N);
    const nRE = [], nRM = [];
    for (let n = 1; n <= N; n++) {
      // inner boundary: m (Aψ' + Bχ')/(Aψ + Bχ) = R  →  B/A = (R ψ − m ψ')/(m χ' − R χ)
      const bE = cdiv(csub(cmul(RE[n], fi.psi[n]), cmul(L.m, fi.dpsi[n])), csub(cmul(L.m, fi.dchi[n]), cmul(RE[n], fi.chi[n])));
      const mR = cmul(L.m, RM[n]);  // TM: (Aψ'+Bχ')/(m(Aψ+Bχ)) = R  →  B/A = (mR ψ − ψ')/(χ' − mR χ)
      const bM = cdiv(csub(cmul(mR, fi.psi[n]), fi.dpsi[n]), csub(fi.dchi[n], cmul(mR, fi.chi[n])));
      const fE = cadd(fo.psi[n], cmul(bE, fo.chi[n])), dE = cadd(fo.dpsi[n], cmul(bE, fo.dchi[n]));
      const fM = cadd(fo.psi[n], cmul(bM, fo.chi[n])), dM = cadd(fo.dpsi[n], cmul(bM, fo.dchi[n]));
      nRE[n] = cdiv(cmul(L.m, dE), fE); nRM[n] = cdiv(dM, cmul(L.m, fM));
    }
    RE = nRE; RM = nRM;
  });
  const X = rel[rel.length - 1].x, f = riccati([X, 0], N);
  for (let n = 1; n <= N; n++) {
    const xi = csub(f.psi[n], cmul([0, 1], f.chi[n])), dxi = csub(f.dpsi[n], cmul([0, 1], f.dchi[n]));
    b[n] = cdiv(csub(f.dpsi[n], cmul(RE[n], f.psi[n])), csub(dxi, cmul(RE[n], xi)));
    a[n] = cdiv(csub(f.dpsi[n], cmul(RM[n], f.psi[n])), csub(dxi, cmul(RM[n], xi)));
  }
  return { a, b, x: X, k };
};
/* multipole order kept for a size parameter x (Wiscombe) */
MIE.order = x => Math.max(3, Math.ceil(x + 4.05 * Math.cbrt(x) + 2));
/* efficiencies and cross-sections of one (layered) sphere */
MIE.sphere = (layers, nMed, lam, N) => {
  const R = layers[layers.length - 1].r, k0 = 2 * Math.PI * nMed / lam, x = k0 * R;
  N = N || MIE.order(x);
  const c = MIE.coeffs(layers, nMed, lam, N);
  let qe = 0, qs = 0;
  for (let n = 1; n <= N; n++) { const f = 2 * n + 1; qe += f * (c.a[n][0] + c.b[n][0]); qs += f * (c.a[n][0] ** 2 + c.a[n][1] ** 2 + c.b[n][0] ** 2 + c.b[n][1] ** 2); }
  qe *= 2 / (x * x); qs *= 2 / (x * x);
  const G = Math.PI * R * R;
  return { Qext: qe, Qsca: qs, Qabs: qe - qs, Cext: qe * G, Csca: qs * G, Cabs: (qe - qs) * G, N, a: c.a, b: c.b };
};

/* ---------- normalised associated Legendre functions ----------
   P̄ₙᵐ (∫ P̄² dx = 1 over [−1, 1], Condon–Shortley phase), with P̄ₙᵐ / sin θ and
   τ̄ = dP̄ₙᵐ/dθ, finite on the axis. Arrays indexed [m][n], 0 ≤ m ≤ n ≤ N. */
const legCoef = {};
const legTables = N => {
  if (legCoef[N]) return legCoef[N];
  const A = [], B = [], C = new Float64Array(N + 2);
  let cmm = 1 / Math.SQRT2;
  for (let m = 0; m <= N + 1; m++) {
    if (m > 0) cmm *= -Math.sqrt((2 * m + 1) / (2 * m));
    C[m] = cmm;
    const an = new Float64Array(N + 2), bn = new Float64Array(N + 2);
    for (let n = m + 2; n <= N + 1; n++) { an[n] = Math.sqrt((4 * n * n - 1) / (n * n - m * m)); bn[n] = Math.sqrt(((n - 1) * (n - 1) - m * m) / (4 * (n - 1) * (n - 1) - 1)); }
    A.push(an); B.push(bn);
  }
  const UP = [], DN = [];
  for (let m = 0; m <= N; m++) { const u = new Float64Array(N + 1), d = new Float64Array(N + 1); for (let n = Math.max(m, 1); n <= N; n++) { u[n] = 0.5 * Math.sqrt((n - m) * (n + m + 1)); d[n] = 0.5 * Math.sqrt((n + m) * (n - m + 1)); } UP.push(u); DN.push(d); }
  return (legCoef[N] = { A, B, C, UP, DN });
};
const legendre = (x, N) => {
  const s = Math.sqrt(Math.max(0, 1 - x * x)), tb = legTables(N), P = [], Q = [], T = [];
  let sm = 1, sm1 = 0;
  for (let m = 0; m <= N + 1; m++) {
    if (m === 1) { sm1 = 1; sm = s; } else if (m > 1) { sm1 = sm; sm *= s; }
    const p = new Float64Array(N + 2), q = new Float64Array(N + 2), an = tb.A[m], bn = tb.B[m];
    let r2 = tb.C[m], r1 = m + 1 <= N + 1 ? Math.sqrt(2 * m + 3) * x * r2 : 0;
    p[m] = sm * r2; q[m] = sm1 * r2;
    if (m + 1 <= N + 1) { p[m + 1] = sm * r1; q[m + 1] = sm1 * r1; }
    for (let n = m + 2; n <= N + 1; n++) { const r = an[n] * (x * r1 - bn[n] * r2); r2 = r1; r1 = r; p[n] = sm * r; q[n] = sm1 * r; }
    P.push(p); Q.push(q);
  }
  for (let m = 0; m <= N; m++) {
    const t = new Float64Array(N + 1), up = tb.UP[m], dn = tb.DN[m], Pu = P[m + 1], Pd = m === 0 ? null : P[m - 1], P1 = P[1];
    for (let n = Math.max(m, 1); n <= N; n++) t[n] = up[n] * (m + 1 <= n ? Pu[n] : 0) - dn[n] * (m === 0 ? -P1[n] : Pd[n]);
    T.push(t);
  }
  return { P, Q, T };
};
MIE.legendre = legendre;

/* Gauss–Legendre nodes and weights on [−1, 1] */
const gauss = n => {
  const x = new Float64Array(n), w = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let z = Math.cos(Math.PI * (i + 0.75) / (n + 0.5)), pp = 0;
    for (let it = 0; it < 100; it++) {
      let p1 = 1, p2 = 0;
      for (let j = 1; j <= n; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
      pp = n * (z * p1 - p2) / (z * z - 1);
      const z1 = z; z = z1 - p1 / pp; if (Math.abs(z - z1) < 1e-15) break;
    }
    x[i] = z; w[i] = 2 / ((1 - z * z) * pp * pp);
  }
  return { x, w };
};
MIE.gauss = gauss;

/* spherical Bessel jₙ (real x), yₙ, and hₙ⁽¹⁾ = jₙ + i yₙ, n = 0..N */
const sbessel = (x, N) => {
  const f = riccati([x, 0], N), j = [], y = [];
  for (let n = 0; n <= N; n++) { j[n] = f.psi[n][0] / x; y[n] = -f.chi[n][0] / x; }
  return { j, y };
};
MIE.sbessel = sbessel;
/* Bessel Jₘ(a), m = 0..M (real a ≥ 0), Miller's downward recurrence */
const besselJ = (a, M) => {
  const out = new Float64Array(M + 1);
  if (a === 0) { out[0] = 1; return out; }
  const start = 2 * Math.ceil((Math.max(M, a) + 20 + Math.sqrt(40 * Math.max(M, a))) / 2);
  let jp = 0, j = 1e-300, sum = 0; const tmp = new Float64Array(start + 2);
  for (let m = start; m > 0; m--) { const jm = 2 * m / a * j - jp; jp = j; j = jm; if (m - 1 <= M + 1) tmp[m - 1] = j; if ((m - 1) % 2 === 0 && m - 1 > 0) sum += 2 * j; if (Math.abs(j) > 1e250) { j *= 1e-250; jp *= 1e-250; sum *= 1e-250; for (let q = 0; q <= Math.min(M + 1, start); q++) tmp[q] *= 1e-250; } }
  sum += j; // J0 + 2ΣJ_{2k} = 1
  for (let m = 0; m <= M; m++) out[m] = tmp[m] / sum;
  return out;
};
MIE.besselJ = besselJ;

/* ---------- the incident plane wave in M̄, N̄ (regular, about the origin) ----------
   k̂ = +x; polarisation 'z' (along the particle axis) or 'y'. Coefficients p (M̄), q (N̄)
   do not depend on k. Found by projecting r̂·E and r̂·∇×E on a sphere with kR = n + ½,
   using the Jacobi–Anger expansion in φ and Gauss quadrature in θ. Cached. */
const incCache = {};
MIE.incident = (N, pol) => {
  const key = N + pol; if (incCache[key]) return incCache[key];
  const p = {}, q = {}, G = gauss(2 * N + 48);
  for (let n = 1; n <= N; n++) {
    const kR = n + 0.5, jn = sbessel(kR, n).j[n], den = n * (n + 1) * jn / kR;
    for (let m = -n; m <= n; m++) { p[m + ',' + n] = [0, 0]; q[m + ',' + n] = [0, 0]; }
    for (let g = 0; g < G.x.length; g++) {
      const x = G.x[g], st = Math.sqrt(1 - x * x), J = besselJ(kR * st, n + 2), L = legendre(x, n);
      // Fourier coefficient c_m of e^{ia cos φ} is iᵐ Jₘ(a); J₋ₘ = (−1)ᵐ Jₘ
      const Jm = m => (m >= 0 ? J[m] : (m % 2 ? -J[-m] : J[-m])), E = m => cmul(ipow(m), [Jm(m), 0]);
      // cos φ · e^{ia cos φ} → (c_{m−1} + c_{m+1})/2 ; sin φ · e^{ia cos φ} → (c_{m−1} − c_{m+1})/(2i)
      const cosC = m => cscale(cadd(E(m - 1), E(m + 1)), 0.5), sinC = m => cdiv(csub(E(m - 1), E(m + 1)), [0, 2]);
      for (let m = -n; m <= n; m++) {
        const Pb = (m < 0 && (-m) % 2 ? -1 : 1) * L.P[Math.abs(m)][n], w = G.w[g] * Pb;
        // r̂ = (sinθ cosφ, sinθ sinφ, cosθ); E = ê e^{ik·r}; i k̂ × ê for k̂ = x̂: ê = ẑ → −i ŷ ; ê = ŷ → i ẑ
        let fr, gr;
        if (pol === 'z') { fr = cscale(E(m), x); gr = cmul([0, -1], cscale(sinC(m), st)); }
        else { fr = cscale(sinC(m), st); gr = cmul([0, 1], cscale(E(m), x)); }
        q[m + ',' + n] = cadd(q[m + ',' + n], cscale(fr, w / den));
        p[m + ',' + n] = cadd(p[m + ',' + n], cscale(gr, w / den));
      }
    }
  }
  return (incCache[key] = { p, q });
};

/* ---------- axial translation of outgoing waves ----------
   ū⁽³⁾ₘₙ(r − cⱼ) = Σᵥ ᾱᵥₙ ū⁽¹⁾ₘᵥ(r − cᵢ), s = (cᵢ − cⱼ)·ẑ, valid for |r − cᵢ| < |s|.
   ᾱᵥₙ = Σₚ i^{ν+p−n} (2p+1) hₚ(k|s|) (sgn s)ᵖ ∫ P̄ₙᵐ P̄ᵥᵐ Pₚ dx.
   Vector: M̄⁽³⁾ₘₙ = Σᵥ Āᵥₙ M̄⁽¹⁾ₘᵥ + B̄ᵥₙ N̄⁽¹⁾ₘᵥ, N̄⁽³⁾ₘₙ = Σᵥ B̄ᵥₙ M̄⁽¹⁾ₘᵥ + Āᵥₙ N̄⁽¹⁾ₘᵥ, with
   Āᵥₙ = ᾱᵥₙ + ks[√((ν+1−m)(ν+1+m)/((2ν+1)(2ν+3)))/(ν+1) ᾱᵥ₊₁,ₙ + √((ν−m)(ν+m)/((2ν−1)(2ν+1)))/ν ᾱᵥ₋₁,ₙ],
   B̄ᵥₙ = i m k s /(ν(ν+1)) ᾱᵥₙ  (from ∇×(ẑ ū) = …, derived for this basis). */
const gaunt = (() => {
  const cache = {};
  return (N, m) => {
    const key = N + ',' + m; if (cache[key]) return cache[key];
    const nq = 2 * N + 6, G = gauss(nq), out = {}, Lx = [], Pp = [];
    const nodes = cache['L' + N] || (cache['L' + N] = Array.from(G.x, x => legendre(x, N + 1).P));
    for (let g = 0; g < nq; g++) {
      Lx.push(nodes[g][Math.abs(m)]);
      const pl = new Float64Array(2 * N + 3); pl[0] = 1; pl[1] = G.x[g];
      for (let p = 2; p <= 2 * N + 2; p++) pl[p] = ((2 * p - 1) * G.x[g] * pl[p - 1] - (p - 1) * pl[p - 2]) / p;
      Pp.push(pl);
    }
    for (let n = Math.abs(m); n <= N + 1; n++) for (let v = Math.abs(m); v <= N + 1; v++) {
      const arr = new Float64Array(n + v + 1);
      for (let p = Math.abs(n - v); p <= n + v; p += 2) { let s = 0; for (let g = 0; g < nq; g++) s += G.w[g] * Lx[g][n] * Lx[g][v] * Pp[g][p]; arr[p] = s; }
      out[n + ',' + v] = arr;
    }
    return (cache[key] = out);
  };
})();
MIE.translation = (N, m, ks) => {
  const am = Math.abs(m), sg = ks < 0 ? -1 : 1, h = sbessel(Math.abs(ks), 2 * N + 2), Gt = gaunt(N, m);
  const alpha = (v, n) => {
    if (v < am || n < am) return [0, 0];
    const g = Gt[n + ',' + v]; let s = [0, 0];
    for (let p = Math.abs(n - v); p <= n + v; p += 2) {
      const f = (2 * p + 1) * g[p] * (p % 2 && sg < 0 ? -1 : 1);
      s = cadd(s, cmul(ipow(v + p - n), [f * h.j[p], f * h.y[p]]));
    }
    return s;
  };
  // Ā in closed form (a sum of positive-weight terms, no cancellation): weight [n(n+1) + ν(ν+1) − p(p+1)] / (2ν(ν+1))
  const A = {}, B = {};
  for (let n = Math.max(am, 1); n <= N; n++) for (let v = Math.max(am, 1); v <= N; v++) {
    const g = Gt[n + ',' + v]; let t = [0, 0];
    for (let p = Math.abs(n - v); p <= n + v; p += 2) {
      const f = (2 * p + 1) * g[p] * (p % 2 && sg < 0 ? -1 : 1) * (n * (n + 1) + v * (v + 1) - p * (p + 1)) / (2 * v * (v + 1));
      t = cadd(t, cmul(ipow(v + p - n), [f * h.j[p], f * h.y[p]]));
    }
    A[v + ',' + n] = t;
    B[v + ',' + n] = cmul([0, m * ks / (v * (v + 1))], alpha(v, n));
  }
  return { A, B, alpha };
};

/* ---------- vector spherical wave functions at a point ---------- */
/* E (θ, φ, r components, complex) of Σ f M̄ₘₙ + g N̄ₘₙ about a centre; kind 1 = regular, 3 = outgoing */
MIE.waveSum = (coef, N, kr, ct, phi, kind) => {
  const L = legendre(ct, N), f = riccati([kr, 0], N), out = { r: [0, 0], t: [0, 0], p: [0, 0] };
  for (let n = 1; n <= N; n++) {
    // zₙ, and (1/ρ) d(ρ zₙ)/dρ
    let z, dz;
    if (kind === 1) { z = [f.psi[n][0] / kr, 0]; dz = [f.dpsi[n][0] / kr, 0]; }
    else { z = [f.psi[n][0] / kr, f.chi[n][0] / kr]; z[1] = -f.chi[n][0] / kr; dz = [f.dpsi[n][0] / kr, -f.dchi[n][0] / kr]; }
    for (let m = -n; m <= n; m++) {
      const c = coef(m, n); if (!c) continue;
      const am = Math.abs(m), sg = m < 0 && am % 2 ? -1 : 1;
      const P = sg * L.P[am][n], pi = sg * m * L.Q[am][n], tau = sg * L.T[am][n], e = [Math.cos(m * phi), Math.sin(m * phi)];
      const fM = c[0], gN = c[1];
      // M̄ = z [θ̂ i π − φ̂ τ] e^{imφ};  N̄ = r̂ n(n+1) z/ρ P e^{imφ} + dz [θ̂ τ + φ̂ i π] e^{imφ}
      const fe = cmul(fM, e), ge = cmul(gN, e);
      out.t = cadd(out.t, cadd(cmul(fe, cmul(z, [0, pi])), cmul(ge, cscale(dz, tau))));
      out.p = cadd(out.p, cadd(cmul(fe, cscale(z, -tau)), cmul(ge, cmul(dz, [0, pi]))));
      out.r = cadd(out.r, cmul(ge, cscale(z, n * (n + 1) * P / kr)));
    }
  }
  return out;
};

/* ---------- particles on the z axis: solve, cross-sections, near field ----------
   parts: [{ z (centre, nm), layers: [{ r, n: [re, im] }] }]; nMed; λ; pol 'z' | 'y'; N (orders). */
MIE.solve = (parts, nMed, lam, pol = 'z', Nopt) => {
  const k = 2 * Math.PI * nMed / lam;
  const N = Nopt || MIE.autoOrder(parts, lam, nMed);
  const T = parts.map(P => MIE.coeffs(P.layers, nMed, lam, N));
  const inc = MIE.incident(N, pol);
  // scale: ẽ = e / |hₙ(k a)| keeps every matrix entry of order (a / distance)^(n+ν)
  const sc = parts.map(P => { const hb = sbessel(k * P.layers[P.layers.length - 1].r, N); return hb.j.map((j, n) => 1 / Math.hypot(j, hb.y[n])); });
  const sol = parts.map(() => ({})), exc = parts.map(() => ({}));       // [i][m][n] = [M̄, N̄] coefficients
  for (let m = -N; m <= N; m++) {
    const ns = []; for (let n = Math.max(1, Math.abs(m)); n <= N; n++) ns.push(n);
    const L = ns.length, P = parts.length, dim = 2 * L * P;
    if (!L) continue;
    // unknowns ẽ(i, type, n); equations  e_i − Σⱼ Tr(j→i) Tⱼ eⱼ = p_i   (T: −bₙ for M̄, −aₙ for N̄)
    const Are = new Float64Array(dim * dim), Aim = new Float64Array(dim * dim), bre = new Float64Array(dim), bim = new Float64Array(dim);
    const idx = (i, t, li) => (i * 2 + t) * L + li;
    for (let i = 0; i < P; i++) for (let li = 0; li < L; li++) {
      const n = ns[li], rf = idx(i, 0, li), rg = idx(i, 1, li), si = sc[i][n];
      Are[rf * dim + rf] = 1; Are[rg * dim + rg] = 1;
      const pc = cscale(inc.p[m + ',' + n], si), qc = cscale(inc.q[m + ',' + n], si);
      bre[rf] = pc[0]; bim[rf] = pc[1]; bre[rg] = qc[0]; bim[rg] = qc[1];
      for (let j = 0; j < P; j++) {
        if (j === i) continue;
        const tr = trCache(N, m, k * (parts[i].z - parts[j].z));
        for (let lv = 0; lv < L; lv++) {
          const v = ns[lv], Ac = tr.A[n + ',' + v], Bc = tr.B[n + ',' + v], sj = sc[j][v];
          const tb = cscale(T[j].b[v], -si / sj), ta = cscale(T[j].a[v], -si / sj);
          const cf = idx(j, 0, lv), cg = idx(j, 1, lv);
          // e_i(M̄ₙ) gets A·(−bᵥ e_j(M̄ᵥ)) + B·(−aᵥ e_j(N̄ᵥ)); e_i(N̄ₙ) gets B·(−bᵥ e_j(M̄ᵥ)) + A·(−aᵥ e_j(N̄ᵥ))
          const t1 = cmul(Ac, tb), t2 = cmul(Bc, ta), t3 = cmul(Bc, tb), t4 = cmul(Ac, ta);
          Are[rf * dim + cf] -= t1[0]; Aim[rf * dim + cf] -= t1[1];
          Are[rf * dim + cg] -= t2[0]; Aim[rf * dim + cg] -= t2[1];
          Are[rg * dim + cf] -= t3[0]; Aim[rg * dim + cf] -= t3[1];
          Are[rg * dim + cg] -= t4[0]; Aim[rg * dim + cg] -= t4[1];
        }
      }
    }
    const x = csolve(dim, Are, Aim, bre, bim);
    for (let i = 0; i < P; i++) {
      sol[i][m] = {}; exc[i][m] = {};
      for (let li = 0; li < L; li++) {
        const n = ns[li], s0 = sc[i][n], eM = [x.re[idx(i, 0, li)] / s0, x.im[idx(i, 0, li)] / s0], eN = [x.re[idx(i, 1, li)] / s0, x.im[idx(i, 1, li)] / s0];
        exc[i][m][n] = [eM, eN];
        sol[i][m][n] = [cmul(cscale(T[i].b[n], -1), eM), cmul(cscale(T[i].a[n], -1), eN)];
      }
    }
  }
  return { parts, nMed, lam, pol, k, N, sol, exc, T, inc };
};
/* cross-sections from the coefficients (nm²): extinction against the incident wave, absorption per particle
   against its exciting field; weights n(n+1) for this basis */
MIE.cross = S => {
  const w = 2 * Math.PI / (S.k * S.k);
  let Cext = 0; const Cabs = S.parts.map(() => 0);
  S.parts.forEach((P, i) => {
    for (let n = 1; n <= S.N; n++) for (let m = -n; m <= n; m++) {
      const f = S.sol[i][m] && S.sol[i][m][n]; if (!f) continue;
      const e = S.exc[i][m][n], p = S.inc.p[m + ',' + n], q = S.inc.q[m + ',' + n], nn = n * (n + 1);
      Cext += nn * -((f[0][0] * p[0] + f[0][1] * p[1]) + (f[1][0] * q[0] + f[1][1] * q[1]));
      Cabs[i] += nn * (-(f[0][0] * e[0][0] + f[0][1] * e[0][1]) - (f[0][0] ** 2 + f[0][1] ** 2) - (f[1][0] * e[1][0] + f[1][1] * e[1][1]) - (f[1][0] ** 2 + f[1][1] ** 2));
    }
  });
  const ca = Cabs.reduce((a, b) => a + b, 0) * w;
  return { Cext: Cext * w, Cabs: ca, Csca: Cext * w - ca, perParticle: Cabs.map(v => v * w) };
};
const trMemo = new Map();
const trCache = (N, m, ks) => { const key = N + '|' + m + '|' + ks.toPrecision(12); let t = trMemo.get(key); if (!t) { t = MIE.translation(N, m, ks); if (trMemo.size > 4000) trMemo.clear(); trMemo.set(key, t); } return t; };
/* complex dense solve, Gaussian elimination with partial pivoting */
const csolve = (n, Ar, Ai, br, bi) => {
  const ar = Float64Array.from(Ar), ai = Float64Array.from(Ai), xr = Float64Array.from(br), xi = Float64Array.from(bi);
  for (let c = 0; c < n; c++) {
    let piv = c, best = -1;
    for (let r = c; r < n; r++) { const v = ar[r * n + c] ** 2 + ai[r * n + c] ** 2; if (v > best) { best = v; piv = r; } }
    if (piv !== c) { for (let q = 0; q < n; q++) { let t = ar[c * n + q]; ar[c * n + q] = ar[piv * n + q]; ar[piv * n + q] = t; t = ai[c * n + q]; ai[c * n + q] = ai[piv * n + q]; ai[piv * n + q] = t; } let t = xr[c]; xr[c] = xr[piv]; xr[piv] = t; t = xi[c]; xi[c] = xi[piv]; xi[piv] = t; }
    const pr = ar[c * n + c], pi = ai[c * n + c], d = pr * pr + pi * pi;
    for (let r = c + 1; r < n; r++) {
      const er = ar[r * n + c], ei = ai[r * n + c]; if (!er && !ei) continue;
      const fr = (er * pr + ei * pi) / d, fi = (ei * pr - er * pi) / d;
      for (let q = c; q < n; q++) { const ur = ar[c * n + q], ui = ai[c * n + q]; ar[r * n + q] -= fr * ur - fi * ui; ai[r * n + q] -= fr * ui + fi * ur; }
      xr[r] -= fr * xr[c] - fi * xi[c]; xi[r] -= fr * xi[c] + fi * xr[c];
    }
  }
  for (let r = n - 1; r >= 0; r--) {
    let sr = xr[r], si = xi[r];
    for (let q = r + 1; q < n; q++) { const ur = ar[r * n + q], ui = ai[r * n + q]; sr -= ur * xr[q] - ui * xi[q]; si -= ur * xi[q] + ui * xr[q]; }
    const pr = ar[r * n + r], pi = ai[r * n + r], d = pr * pr + pi * pi;
    xr[r] = (sr * pr + si * pi) / d; xi[r] = (si * pr - sr * pi) / d;
  }
  return { re: xr, im: xi };
};
MIE.csolve = csolve;
/* orders needed: the size parameter, plus more for narrow gaps (field in the gap converges ~ like √(R/g)) */
MIE.autoOrder = (parts, lam, nMed) => {
  const k = 2 * Math.PI * nMed / lam; let N = 0;
  parts.forEach(P => { N = Math.max(N, MIE.order(k * P.layers[P.layers.length - 1].r)); });
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const Ri = parts[i].layers[parts[i].layers.length - 1].r, Rj = parts[j].layers[parts[j].layers.length - 1].r, g = Math.abs(parts[i].z - parts[j].z) - Ri - Rj, R = Math.min(Ri, Rj);
    N = Math.max(N, Math.ceil(4 + 6 * Math.sqrt(R / Math.max(g, 0.2))));   // ≈1 % on the gap field (tested against 50 orders)
  }
  return Math.min(N, 50);
};

/* coefficients flattened for fast field sums: [fRe, fIm, gRe, gIm] at 4·(n(n+1)+m) */
const flatSol = (S, i) => {
  if (S._flat && S._flat[i]) return S._flat[i];
  const N = S.N, F = new Float64Array(4 * (N + 1) * (N + 2));
  for (let n = 1; n <= N; n++) for (let m = -n; m <= n; m++) { const c = S.sol[i][m] && S.sol[i][m][n]; if (!c) continue; const o = 4 * (n * (n + 1) + m); F[o] = c[0][0]; F[o + 1] = c[0][1]; F[o + 2] = c[1][0]; F[o + 3] = c[1][1]; }
  (S._flat = S._flat || [])[i] = F; return F;
};
/* outgoing field of one particle at (r, cos θ, φ) about its centre: Cartesian components [xr, xi, yr, yi, zr, zi] */
const outField = (S, i, r, ct, phi, out) => {
  const N = S.N, F = flatSol(S, i), kr = S.k * r, L = legendre(ct, N), f = riccati([kr, 0], N);
  let Rr = 0, Ri = 0, Tr = 0, Ti = 0, Pr = 0, Pi = 0;
  const cm = new Float64Array(2 * N + 1), sm = new Float64Array(2 * N + 1);
  for (let m = -N; m <= N; m++) { cm[m + N] = Math.cos(m * phi); sm[m + N] = Math.sin(m * phi); }
  for (let n = 1; n <= N; n++) {
    const zr = f.psi[n][0] / kr, zi = -f.chi[n][0] / kr, dr = f.dpsi[n][0] / kr, di = -f.dchi[n][0] / kr, nn = n * (n + 1) / kr;
    for (let m = -n; m <= n; m++) {
      const o = 4 * (n * (n + 1) + m), fr0 = F[o], fi0 = F[o + 1], gr0 = F[o + 2], gi0 = F[o + 3];
      if (!fr0 && !fi0 && !gr0 && !gi0) continue;
      const am = m < 0 ? -m : m, sg = m < 0 && am % 2 ? -1 : 1, P = sg * L.P[am][n], pi = sg * m * L.Q[am][n], tau = sg * L.T[am][n], er = cm[m + N], ei = sm[m + N];
      const fr = fr0 * er - fi0 * ei, fi = fr0 * ei + fi0 * er, gr = gr0 * er - gi0 * ei, gi = gr0 * ei + gi0 * er;
      // M̄: θ̂ i π z − φ̂ τ z ;  N̄: r̂ n(n+1)/ρ P z + θ̂ τ dz + φ̂ i π dz
      const fzr = fr * zr - fi * zi, fzi = fr * zi + fi * zr, gdr = gr * dr - gi * di, gdi = gr * di + gi * dr, gzr = gr * zr - gi * zi, gzi = gr * zi + gi * zr;
      Tr += -pi * fzi + tau * gdr; Ti += pi * fzr + tau * gdi;
      Pr += -tau * fzr - pi * gdi; Pi += -tau * fzi + pi * gdr;
      Rr += nn * P * gzr; Ri += nn * P * gzi;
    }
  }
  const st = Math.sqrt(Math.max(0, 1 - ct * ct)), cp = Math.cos(phi), sp = Math.sin(phi);
  out[0] += Rr * st * cp + Tr * ct * cp - Pr * sp; out[1] += Ri * st * cp + Ti * ct * cp - Pi * sp;
  out[2] += Rr * st * sp + Tr * ct * sp + Pr * cp; out[3] += Ri * st * sp + Ti * ct * sp + Pi * cp;
  out[4] += Rr * ct - Tr * st; out[5] += Ri * ct - Ti * st;
};
/* scattered + incident field at a point (x, y, z in nm) → Cartesian complex components, relative to |E₀| = 1;
   null inside a particle */
MIE.field = (S, x, y, z) => {
  for (const P of S.parts) { const R = P.layers[P.layers.length - 1].r; if ((x * x + y * y + (z - P.z) * (z - P.z)) < R * R) return null; }
  const c = Math.cos(S.k * x), s = Math.sin(S.k * x), out = new Float64Array(6);
  if (S.pol === 'z') { out[4] = c; out[5] = s; } else { out[2] = c; out[3] = s; }
  S.parts.forEach((P, i) => { const dz = z - P.z, r = Math.sqrt(x * x + y * y + dz * dz); outField(S, i, r, dz / r, Math.atan2(y, x), out); });
  return { x: [out[0], out[1]], y: [out[2], out[3]], z: [out[4], out[5]] };
};
MIE.intensity = E => (E ? E.x[0] ** 2 + E.x[1] ** 2 + E.y[0] ** 2 + E.y[1] ** 2 + E.z[0] ** 2 + E.z[1] ** 2 : NaN);

/* far-field amplitude X(θ, φ) about the origin (scattered field ≈ e^{ikr}/(−ikr) X) */
MIE.farField = (S, ct, phi) => {
  const L = legendre(ct, S.N), st = Math.sqrt(Math.max(0, 1 - ct * ct));
  let Xt = [0, 0], Xp = [0, 0];
  S.parts.forEach((P, i) => {
    const phase = [Math.cos(-S.k * P.z * ct), Math.sin(-S.k * P.z * ct)];
    for (let n = 1; n <= S.N; n++) for (let m = -n; m <= n; m++) {
      const c = S.sol[i][m] && S.sol[i][m][n]; if (!c) continue;
      const am = Math.abs(m), sg = m < 0 && am % 2 ? -1 : 1, pi = sg * m * L.Q[am][n], tau = sg * L.T[am][n], e = cmul([Math.cos(m * phi), Math.sin(m * phi)], phase);
      // h ~ (−i)^{n+1} e^{ix}/x ; (1/x)(x h)' ~ (−i)^n e^{ix}/x ; X = −i × (amplitude)
      const fm = cmul(cmul(c[0], e), cmul([0, -1], ipow(-(n + 1)))), gn = cmul(cmul(c[1], e), cmul([0, -1], ipow(-n)));
      Xt = cadd(Xt, cadd(cmul(fm, [0, pi]), cscale(gn, tau)));
      Xp = cadd(Xp, cadd(cscale(fm, -tau), cmul(gn, [0, pi])));
    }
  });
  return { t: Xt, p: Xp };
};
/* the same from the far field (optical theorem and integrated |X|², slow; for tests) */
MIE.crossFar = S => {
  const k = S.k, fw = MIE.farField(S, 0, 0);   // forward = +x: θ = π/2 → ct = 0, φ = 0; θ̂ = −ẑ, φ̂ = ŷ
  const Cext = 4 * Math.PI / (k * k) * (S.pol === 'z' ? -fw.t[0] : fw.p[0]);
  const G = gauss(Math.max(24, 2 * S.N + 8)), nph = Math.max(24, 4 * S.N + 8);
  let Csca = 0;
  for (let g = 0; g < G.x.length; g++) for (let q = 0; q < nph; q++) {
    const X = MIE.farField(S, G.x[g], 2 * Math.PI * q / nph);
    Csca += G.w[g] * (2 * Math.PI / nph) * (X.t[0] ** 2 + X.t[1] ** 2 + X.p[0] ** 2 + X.p[1] ** 2);
  }
  Csca /= k * k;
  return { Cext, Csca, Cabs: Cext - Csca };
};

/* ---------- nanorods: spheroids in the long-wavelength approximation ----------
   A rod of length ℓ (tip to tip) and diameter D is modelled as a prolate spheroid with
   semi-axes a = ℓ/2 (along z) and b = D/2. Polarisability with the size corrections of
   Kuwata et al., Appl. Phys. Lett. 83, 4625 (2003) — dynamic depolarisation and radiation
   damping, x = π × (length along the field) / λ₀ — which matches exact Mie theory for spheres
   and gives the longitudinal and transverse plasmons of rods.
   eps: particle permittivity [re, im]; em: host permittivity (real); lengths in nm; λ in vacuum. */
MIE.depol = (a, b) => {
  if (Math.abs(a - b) < 1e-9 * a) return 1 / 3;
  if (a > b) { const e = Math.sqrt(1 - (b * b) / (a * a)); return (1 - e * e) / (e * e) * (Math.log((1 + e) / (1 - e)) / (2 * e) - 1); }
  const g = Math.sqrt((b * b) / (a * a) - 1); return (1 + g * g) / (g * g) * (1 - Math.atan(g) / g);
};
MIE.spheroid = (eps, em, a, b, lam) => {
  const V = 4 / 3 * Math.PI * a * b * b, La = MIE.depol(a, b), Lb = (1 - La) / 2, k = 2 * Math.PI * Math.sqrt(em) / lam;
  const one = (L, len) => {
    const x = Math.PI * len / lam, A = -0.4865 * L - 1.046 * L * L + 0.8481 * L * L * L, B = 0.01909 * L + 0.1999 * L * L + 0.6077 * L * L * L;
    const den = cadd(cadd([L, 0], cdiv([em, 0], csub(eps, [em, 0]))), [A * em * x * x + B * em * em * x * x * x * x, -4 * Math.PI * Math.PI * Math.pow(em, 1.5) / 3 * V / (lam * lam * lam)]);
    const alpha = cdiv([V, 0], den), Cext = k * alpha[1], Csca = Math.pow(k, 4) / (6 * Math.PI) * (alpha[0] * alpha[0] + alpha[1] * alpha[1]);
    // uniform field inside (from p = α E₀ = V (ε − εm)/εm · E_in in these units) and the field just outside, normal to the surface
    const Ein = cdiv(cscale(alpha, em), cscale(csub(eps, [em, 0]), V)), Esurf = cscale(cmul(eps, Ein), 1 / em);
    return { alpha, Cext, Csca, Cabs: Cext - Csca, Ein, Esurf, L };
  };
  return { long: one(La, 2 * a), trans: one(Lb, 2 * b), V };
};
/* near field of a prolate spheroid (quasi-static solution in spheroidal coordinates, driven by the corrected
   internal field E_in): |E|² / |E₀|² at (x, z) in the plane through the axis; pol 'long' (E ∥ z) or 'trans' (E ∥ x); null inside */
MIE.spheroidField = (a, b, Ein, pol, x, z) => {
  if ((x * x) / (b * b) + (z * z) / (a * a) < 1) return null;
  const f = Math.sqrt(Math.max(1e-12, a * a - b * b)), xi0 = a / f;
  const Q1 = xi => xi / 2 * Math.log((xi + 1) / (xi - 1)) - 1, Q11 = xi => Math.sqrt(xi * xi - 1) * (0.5 * Math.log((xi + 1) / (xi - 1)) - xi / (xi * xi - 1));
  const C = pol === 'long' ? cscale(csub([1, 0], Ein), xi0 / Q1(xi0)) : cscale(csub([1, 0], Ein), Math.sqrt(xi0 * xi0 - 1) / Q11(xi0));
  const phi = (X, Z) => {
    const rho = Math.abs(X), r1 = Math.hypot(rho, Z + f), r2 = Math.hypot(rho, Z - f), xi = Math.max(1 + 1e-12, (r1 + r2) / (2 * f)), eta = U_clamp((r1 - r2) / (2 * f));
    if (pol === 'long') return cscale(csub([xi, 0], cscale(C, Q1(xi))), -f * eta);
    return cscale(csub([Math.sqrt(xi * xi - 1), 0], cscale(C, Q11(xi))), -f * Math.sqrt(Math.max(0, 1 - eta * eta)) * (X < 0 ? -1 : 1));
  };
  const h = 1e-3 * Math.min(a, b), ex = cscale(csub(phi(x + h, z), phi(x - h, z)), -1 / (2 * h)), ez = cscale(csub(phi(x, z + h), phi(x, z - h)), -1 / (2 * h));
  return ex[0] * ex[0] + ex[1] * ex[1] + ez[0] * ez[0] + ez[1] * ez[1];
};
const U_clamp = v => (v > 1 ? 1 : v < -1 ? -1 : v);
})();
