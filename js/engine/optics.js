/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/optics.js
   Physical models used by the tracer:
   - Jones calculus in the (p, s) basis: p = in the table plane,
     s = perpendicular to the table. "H" ≡ p and "V" ≡ s.
   - Sellmeier dispersion for common optical glasses.
   - Polarisation state classification for figure markers.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const U = RNBX.util, C = U.C;
const O = RNBX.optics = {};

/* ---------- Jones vectors ---------- */
const R2 = Math.SQRT1_2;
O.POLARIZATIONS = [
  { id: 'H', name: 'Horizontal (p)' }, { id: 'V', name: 'Vertical (s)' },
  { id: 'D', name: 'Diagonal +45°' }, { id: 'A', name: 'Anti-diagonal −45°' },
  { id: 'R', name: 'Right circular' }, { id: 'L', name: 'Left circular' },
  { id: 'lin', name: 'Linear at angle…' }, { id: 'unpol', name: 'Unpolarised' },
];
O.jones = (pol, angleDeg = 0) => {
  switch (pol) {
    case 'H': return [C.c(1), C.c(0)];
    case 'V': return [C.c(0), C.c(1)];
    case 'D': return [C.c(R2), C.c(R2)];
    case 'A': return [C.c(R2), C.c(-R2)];
    case 'R': return [C.c(R2), C.c(0, -R2)];
    case 'L': return [C.c(R2), C.c(0, R2)];
    case 'lin': { const a = U.rad(angleDeg); return [C.c(Math.cos(a)), C.c(Math.sin(a))]; }
    default: return null; // unpolarised
  }
};
O.scaleJ = (E, k) => E && [C.scale(E[0], k), C.scale(E[1], k)];
O.powerJ = E => C.abs2(E[0]) + C.abs2(E[1]);
O.applyM = (M, E) => [C.add(C.mul(M[0][0], E[0]), C.mul(M[0][1], E[1])), C.add(C.mul(M[1][0], E[0]), C.mul(M[1][1], E[1]))];

/* Retarder with fast axis at θ from p and retardance Γ. */
O.waveplate = (thetaDeg, gamma) => {
  const t = U.rad(thetaDeg), c = Math.cos(t), s = Math.sin(t), e = C.expi(gamma);
  const one = C.c(1), om = C.add(one, C.scale(e, -1));
  return [
    [C.add(C.c(c * c), C.scale(e, s * s)), C.scale(om, c * s)],
    [C.scale(om, c * s), C.add(C.c(s * s), C.scale(e, c * c))],
  ];
};
O.polarizer = thetaDeg => {
  const t = U.rad(thetaDeg), c = Math.cos(t), s = Math.sin(t);
  return [[C.c(c * c), C.c(c * s)], [C.c(c * s), C.c(s * s)]];
};
O.rotator = deg => {
  const t = U.rad(deg), c = Math.cos(t), s = Math.sin(t);
  return [[C.c(c), C.c(-s)], [C.c(s), C.c(c)]];
};

/* Classify a Jones vector for drawing polarisation markers. */
O.describe = E => {
  if (!E) return { kind: 'unpol' };
  const p = E[0], s = E[1];
  const S0 = C.abs2(p) + C.abs2(s);
  if (S0 < 1e-15) return { kind: 'none' };
  const S1 = C.abs2(p) - C.abs2(s);
  const ps = C.mul(p, C.conj(s));
  const S2 = 2 * ps.re, S3 = -2 * ps.im;
  const ell = S3 / S0;
  const psi = 0.5 * U.deg(Math.atan2(S2, S1));
  if (Math.abs(ell) > 0.85) return { kind: 'circ', hand: ell > 0 ? 'R' : 'L', psi };
  if (Math.abs(ell) > 0.2) return { kind: 'ellip', psi, ell };
  const a = Math.abs(psi);
  if (a < 12) return { kind: 'p', psi };
  if (a > 78) return { kind: 's', psi };
  return { kind: 'diag', psi };
};

/* ---------- materials (Sellmeier, λ in µm) ---------- */
O.MATERIALS = {
  'N-BK7': { name: 'N-BK7', B: [1.03961212, 0.231792344, 1.01046945], C: [0.00600069867, 0.0200179144, 103.560653] },
  'FS': { name: 'Fused silica', B: [0.6961663, 0.4079426, 0.8974794], C: [0.00467914826, 0.0135120631, 97.9340025] },
  'SF11': { name: 'SF11 (dense flint)', B: [1.73759695, 0.313747346, 1.89878101], C: [0.013188707, 0.0623068142, 155.23629] },
  'CaF2': { name: 'CaF₂', B: [0.5675888, 0.4710914, 3.8484723], C: [0.00252643, 0.0100783, 1200.556] },
  'Sapphire': { name: 'Sapphire (o-ray)', B: [1.4313493, 0.65054713, 5.3414021], C: [0.00527992, 0.0142383, 325.0178] },
  'N-SF5': { name: 'N-SF5 (flint)', B: [1.52481889, 0.187085527, 1.42729015], C: [0.011254756, 0.0588995392, 129.141675] },
  'N-F2': { name: 'N-F2 (flint)', B: [1.39757037, 0.159201403, 1.2686543], C: [0.00995906143, 0.0546931752, 119.248346] },
  'custom': { name: 'Custom index' },
};
O.index = (mat, nm, custom = 1.5) => {
  const m = O.MATERIALS[mat];
  if (!m || !m.B) return custom;
  const l2 = Math.pow(nm / 1000, 2);
  let n2 = 1;
  for (let i = 0; i < 3; i++) n2 += m.B[i] * l2 / (l2 - m.C[i]);
  return Math.sqrt(Math.max(1, n2));
};

/* Snell refraction. d: unit direction; n: unit normal facing the
   incoming ray (d·n < 0); eta = n1/n2. Returns null on TIR. */
O.refract = (d, n, eta) => {
  const cosi = -(d[0] * n[0] + d[1] * n[1]);
  const k = 1 - eta * eta * (1 - cosi * cosi);
  if (k < 0) return null;
  const a = eta * cosi - Math.sqrt(k);
  return U.v.norm([eta * d[0] + a * n[0], eta * d[1] + a * n[1]]);
};

/* Fresnel amplitude coefficients for a planar interface.
   cosi: cosine of incidence; returns {rs, rp, ts, tp, Rs, Rp, tir}. */
O.fresnel = (cosi, n1, n2) => {
  cosi = Math.min(1, Math.abs(cosi));
  const sint2 = Math.pow(n1 / n2, 2) * (1 - cosi * cosi);
  if (sint2 >= 1) return { rs: 1, rp: 1, Rs: 1, Rp: 1, tir: true };
  const cost = Math.sqrt(1 - sint2);
  const rs = (n1 * cosi - n2 * cost) / (n1 * cosi + n2 * cost);
  const rp = (n2 * cosi - n1 * cost) / (n2 * cosi + n1 * cost);
  return { rs, rp, Rs: rs * rs, Rp: rp * rp, tir: false };
};
/* Brewster angle in degrees */
O.brewster = (n1, n2) => U.deg(Math.atan(n2 / n1));

/* ---------- Gaussian beams (complex q parameter, physical mm) ----------
   1/q = 1/R − i·M²·λ / (π·n·w²)                                         */
const cdiv = (a, b) => { const d = b.re * b.re + b.im * b.im || 1e-300; return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }; };
O.cdiv = cdiv;
O.qWaist = (w0, lamMm, M2 = 1, n = 1) => ({ re: 0, im: Math.PI * n * w0 * w0 / (M2 * lamMm) });
O.qProp = (q, L) => ({ re: q.re + L, im: q.im });
O.qLens = (q, f) => { const inv = cdiv({ re: 1, im: 0 }, q); return cdiv({ re: 1, im: 0 }, { re: inv.re - 1 / f, im: inv.im }); };
O.qRadius = (q, lamMm, M2 = 1, n = 1) => {
  const inv = cdiv({ re: 1, im: 0 }, q);
  return inv.im >= 0 ? Infinity : Math.sqrt(-M2 * lamMm / (Math.PI * n * inv.im));
};
/* waist radius and its distance ahead (+) or behind (−) of the current point */
O.qWaistInfo = (q, lamMm, M2 = 1, n = 1) => ({ zToWaist: -q.re, zR: q.im, w0: Math.sqrt(Math.max(0, q.im) * M2 * lamMm / (Math.PI * n)) });

/* ---------- real lenses (spherical surfaces) ----------
   Designs a lens of the given shape, drawn focal length fd, clear
   radius r and minimum drawn thickness, in the part's own frame
   (optical axis +x, centred on x = 0). Radii are chosen from the
   thin-lens formulas and then rescaled so that the paraxial focal
   length at 587.6 nm is exactly fd. Returns the surfaces from left
   to right: {x (vertex), c (curvature 1/R, 0 = flat), mat after}. */
const ND = 587.56;
O.paraxialEFL = (surfs, lam = ND, nc = 1.5) => {
  // y–nu ray trace of a ray parallel to the axis at height 1
  let y = 1, nu = 0, nPrev = 1;
  for (let i = 0; i < surfs.length; i++) {
    const S = surfs[i], n2 = S.mat === 'air' ? 1 : O.index(S.mat, lam, nc);
    nu = nu - y * (n2 - nPrev) * S.c;
    if (i < surfs.length - 1) y += (surfs[i + 1].x - S.x) * nu / n2;
    nPrev = n2;
  }
  return nu === 0 ? Infinity : -1 / nu;
};
const sagOf = (c, h) => { if (!c) return 0; const R = 1 / c; return R - Math.sign(R) * Math.sqrt(Math.max(0, R * R - h * h)); };
O.lensDesign = (shape, fd, r, tMin, mat = 'N-BK7', nc = 1.5) => {
  const n = O.index(mat, ND, nc), fl = 'N-SF5';
  const margin = Math.max(0.12, r * 0.04);
  const build = (k, dc = 0) => {
    // k scales every curvature; thicknesses follow from the sags
    let cs, mats;
    if (shape === 'ball') { cs = [1 / r, -1 / r]; mats = [mat, 'air']; }
    else if (shape === 'doublet') {
      const n1 = n, n2 = O.index(fl, ND), V1 = (n1 - 1) / (O.index(mat, 486.13, nc) - O.index(mat, 656.27, nc)), V2 = (n2 - 1) / (O.index(fl, 486.13) - O.index(fl, 656.27));
      const phi = 1 / fd, p1 = phi * V1 / (V1 - V2), p2 = -phi * V2 / (V1 - V2);
      const c1 = p1 / (2 * (n1 - 1)), c2 = -c1, c3 = c2 - p2 / (n2 - 1);
      cs = [c1, c2, c3 + dc]; mats = [mat, fl, 'air'];
    } else {
      const conc = /concave/.test(shape), f = conc ? -Math.abs(fd) : Math.abs(fd);
      if (shape === 'biconvex' || shape === 'biconcave') { const c = 1 / (2 * (n - 1) * f); cs = [c, -c]; }
      else cs = [1 / ((n - 1) * f), 0];                        // plano: curved side towards the incoming light
      mats = [mat, 'air'];
    }
    cs = cs.map(c => c * k);
    if (shape === 'ball') cs = [1 / r, -1 / r];
    // centre thicknesses so that no element gets thinner than the margin at its rim
    const xs = [0];
    for (let i = 0; i < cs.length - 1; i++) {
      const edge = sagOf(cs[i + 1], r) - sagOf(cs[i], r);       // centre minus edge thickness, up to sign
      const tc = shape === 'ball' ? 2 * r : Math.max(i === 0 ? tMin * (cs.length > 2 ? 0.6 : 1) : tMin * 0.4, margin - edge, margin);
      xs.push(xs[i] + tc);
    }
    const mid = xs[xs.length - 1] / 2;
    return cs.map((c, i) => ({ x: xs[i] - mid, c, mat: mats[i] }));
  };
  if (shape === 'ball') return build(1);
  // rescale curvatures until the paraxial focal length is exact
  const fit = dc => {
    let k = 1, surfs = build(k, dc);
    for (let it = 0; it < 30; it++) {
      const e = O.paraxialEFL(surfs, ND, nc);
      if (!isFinite(e) || Math.abs(e / fd - 1) < 1e-10) break;
      k *= e / fd; surfs = build(k, dc);
    }
    return surfs;
  };
  let surfs = fit(0);
  if (shape === 'doublet') {
    // thick elements spoil the thin-lens achromat: retouch the last curvature so that F and C focus together
    const err = dc => { const S = fit(dc); return O.paraxialEFL(S, 486.13, nc) - O.paraxialEFL(S, 656.27, nc); };
    let a = 0, b = 0.02 / fd, ea = err(a), eb = err(b);
    for (let it = 0; it < 25 && Math.abs(eb) > 1e-9 * Math.abs(fd) && eb !== ea; it++) { const c = b - eb * (b - a) / (eb - ea); a = b; ea = eb; b = c; eb = err(b); }
    const S1 = fit(b), ok = Math.abs(O.paraxialEFL(S1, ND, nc) / fd - 1) < 1e-6 && S1.every(q => !q.c || Math.abs(1 / q.c) > r);
    if (ok && Math.abs(eb) < Math.abs(err(0))) surfs = S1;
  }
  // a surface steeper than a hemisphere cannot reach the clear aperture
  surfs.forEach(S => { if (S.c && Math.abs(1 / S.c) < r) S.tooSteep = true; });
  return surfs;
};

/* Spectral transmission of filters and dichroics (sharp-edge model). */
O.filterT = (p, nm) => {
  switch (p.mode) {
    case 'longpass': return nm >= p.edge ? p.T : 0;
    case 'shortpass': return nm <= p.edge ? p.T : 0;
    case 'notch': return Math.abs(nm - p.center) <= p.width / 2 ? 0 : p.T;
    case 'nd': return Math.pow(10, -(p.od || 0));
    default: return Math.abs(nm - p.center) <= p.width / 2 ? p.T : 0; // bandpass
  }
};
})();
