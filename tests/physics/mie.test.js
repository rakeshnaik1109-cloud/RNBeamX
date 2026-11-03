/* Mie and multi-sphere Mie theory against independent physics */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · nanoparticles (Mie, dimers)');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js', 'engine/mie.js', 'engine/bem.js']), M = RNBX.mie, Bm = RNBX.bem, TF = RNBX.thinfilm, c = M.c;
  const au = lam => { const q = TF.nk({ mat: 'Au' }, lam); return [q.n, q.k]; };
  // 1. Rayleigh limit: Q_abs = 4x Im((m²−1)/(m²+2))
  { const m = [1.5, 0.1], q = M.sphere([{ r: 2, n: m }], 1, 600), x = 2 * Math.PI * 2 / 600, m2 = c.cmul(m, m), f = c.cdiv(c.csub(m2, [1, 0]), c.cadd(m2, [2, 0]));
    H.near('small sphere: Rayleigh absorption', q.Qabs, 4 * x * f[1], 1e-3 * q.Qabs); }
  // 2. the plane wave is rebuilt from its multipole expansion
  { const N = 25, inc = M.incident(N, 'z'), pt = [0.8, -0.5, 1.1], r = Math.hypot(...pt), w = M.waveSum((m, n) => [inc.p[m + ',' + n], inc.q[m + ',' + n]], N, r, pt[2] / r, Math.atan2(pt[1], pt[0]), 1);
    const st = Math.sqrt(1 - (pt[2] / r) ** 2), Ez = c.csub(c.cscale(w.r, pt[2] / r), c.cscale(w.t, st));
    H.near('plane wave from vector spherical waves (Re Ez)', Ez[0], Math.cos(pt[0]), 1e-10); H.near('… (Im Ez)', Ez[1], Math.sin(pt[0]), 1e-10); }
  // 3. axial translation theorem, point by point
  { const N = 14, s0 = 3, m = 1, n = 2, tr = M.translation(N, m, s0), pt = [0.4, 0.3, s0 - 0.5];
    const sp = (x, y, z) => { const r = Math.hypot(x, y, z); return { r, ct: z / r, phi: Math.atan2(y, x) }; }, a = sp(...pt), b = sp(pt[0], pt[1], pt[2] - s0);
    const d1 = M.waveSum((mm, nn) => (mm === m && nn === n ? [[0, 0], [1, 0]] : null), N, a.r, a.ct, a.phi, 3), d2 = M.waveSum((mm, v) => (mm === m && tr.A[v + ',' + n] ? [tr.B[v + ',' + n], tr.A[v + ',' + n]] : null), N, b.r, b.ct, b.phi, 1);
    const mag = w => Math.hypot(...w.r, ...w.t, ...w.p);
    H.near('translation of an outgoing wave to another centre (|E|)', mag(d2), mag(d1), 1e-6); }
  // 4. one particle through the coupled solver = classical Mie (both polarisations, off-centre too)
  for (const [R, lam, z] of [[20, 530, 0], [80, 700, 0], [30, 550, 47]]) {
    const L = [{ r: R, n: au(lam) }], ref = M.sphere(L, 1.33, lam);
    for (const pol of ['z', 'y']) { const cr = M.cross(M.solve([{ z, layers: L }], 1.33, lam, pol, ref.N + 2)); H.near(`coupled solver = Mie, Au ${2 * R} nm, ${lam} nm, ${pol}${z ? ', off-centre' : ''}`, cr.Cext / ref.Cext, 1, 1e-8); }
  }
  // 5. two particles far apart extinguish twice as much as one
  { const L = [{ r: 20, n: au(530) }], ref = M.sphere(L, 1.33, 530), cr = M.cross(M.solve([{ z: -2000, layers: L }, { z: 2000, layers: L }], 1.33, 530, 'z', 10)); H.near('dimer 4 µm apart = 2 × single', cr.Cext / (2 * ref.Cext), 1, 2e-3); }
  // 6. optical theorem / integrated far field agree with the coefficient formulas; lossless dimer absorbs nothing
  { const L = [{ r: 20, n: au(600) }], S = M.solve([{ z: -21, layers: L }, { z: 21, layers: L }], 1.33, 600, 'z', 12), a = M.cross(S), b = M.crossFar(S);
    H.near('dimer: extinction (coefficients) = optical theorem', a.Cext, b.Cext, 1e-6 * a.Cext); H.near('dimer: scattering (coefficients) = integrated far field', a.Csca, b.Csca, 1e-4 * a.Csca);
    const D = [{ r: 40, n: [1.6, 0] }], z = M.cross(M.solve([{ z: -45, layers: D }, { z: 45, layers: D }], 1.0, 500, 'z')); H.near('lossless dielectric dimer: no absorption', z.Cabs / z.Cext, 0, 1e-8); }
  // 7. a shell of the core's own material changes nothing; layered spheres
  { const lam = 620, a = M.sphere([{ r: 20, n: au(lam) }, { r: 40, n: au(lam) }], 1.33, lam).Qext, b = M.sphere([{ r: 40, n: au(lam) }], 1.33, lam).Qext; H.near('core–shell of one material = solid sphere', a, b, 1e-10); }
  // 8. SERS hot spot of a 40 nm Au dimer with a 2 nm gap in water
  { let best = { I: 0 }; for (let lam = 560; lam <= 660; lam += 10) { const L = [{ r: 20, n: au(lam) }], parts = [{ z: -21, layers: L }, { z: 21, layers: L }], I = M.intensity(M.field(M.solve(parts, 1.33, lam, 'z'), 0, 0, 0)); if (I > best.I) best = { I, lam }; }
    const single = M.sphere([{ r: 20, n: au(530) }], 1.33, 530);
    H.check('Au dimer (40 nm, 2 nm gap): coupled plasmon near 600 nm, gap |E|² ≈ 2 × 10⁴', best.lam >= 580 && best.lam <= 620 && best.I > 1e4 && best.I < 5e4, best);
    const g40 = (N) => { const L = [{ r: 20, n: au(633) }]; return M.intensity(M.field(M.solve([{ z: -20.5, layers: L }, { z: 20.5, layers: L }], 1.33, 633, 'z', N), 0, 0, 0)); };
    H.near('1 nm gap: the gap field converges with the multipole order (40 vs 50)', g40(40) / g40(50), 1, 0.01);
    H.check('single 40 nm Au sphere resonance near 530 nm', single.Qext > 1, single.Qext); }
  // 9. nanorods (spheroid model with size corrections)
  { const c2 = M.c, em = 1.33 * 1.33, epsAu = lam => { const q = TF.nk({ mat: 'Au' }, lam); return c2.cmul([q.n, q.k], [q.n, q.k]); };
    // a sphere: the corrected polarisability reproduces the exact Mie dipole
    let worst = 0; for (const lam of [500, 540, 600]) { const q = TF.nk({ mat: 'Au' }, lam), R = 25, ex = M.sphere([{ r: R, n: [q.n, q.k] }], 1.33, lam, 1).Cext, sp = M.spheroid(epsAu(lam), em, R, R, lam).long.Cext; worst = Math.max(worst, Math.abs(sp / ex - 1)); }
    H.check('sphere limit: size-corrected polarisability = Mie dipole (50 nm Au, within 3 %)', worst < 0.03, worst);
    let best = { C: 0 }; for (let lam = 600; lam <= 1000; lam += 2) { const C = M.spheroid(epsAu(lam), em, 20, 5, lam).long.Cext; if (C > best.C) best = { C, lam }; }
    H.check('Au rod 40 × 10 nm in water: longitudinal plasmon 760–800 nm', best.lam >= 760 && best.lam <= 800, best);
    let b2 = { C: 0 }; for (let lam = 500; lam <= 900; lam += 2) { const C = M.spheroid(epsAu(lam), em, 25, 12.5, lam).long.Cext; if (C > b2.C) b2 = { C, lam }; }
    H.check('aspect ratio 2 resonates bluer than 4 (≈ 600 nm)', b2.lam >= 580 && b2.lam <= 640 && b2.lam < best.lam, b2);
    const r = M.spheroid(epsAu(780), em, 20, 5, 780);
    H.near('rod near field → incident field far away', M.spheroidField(20, 5, r.long.Ein, 'long', 0, 3000), 1, 1e-3);
    H.near('tip field at the surface = ε E_in / εm', M.spheroidField(20, 5, r.long.Ein, 'long', 0, 20.002) / (r.long.Esurf[0] ** 2 + r.long.Esurf[1] ** 2), 1, 0.1);
    H.check('longitudinal plasmon far stronger than transverse at 780 nm', r.long.Cext > 50 * r.trans.Cext, [r.long.Cext, r.trans.Cext]); }
  // 10. boundary elements (bodies of revolution) and rod dimers
  { const c3 = M.c, em = 1.33 * 1.33, eAu = lam => { const q = TF.nk({ mat: 'Au' }, lam); return c3.cmul([q.n, q.k], [q.n, q.k]); }, nAu = lam => { const q = TF.nk({ mat: 'Au' }, lam); return [q.n, q.k]; };
    { const rho = 3, z = 1, rp = 2, zp = -0.5; let Fz = 0; const n = 20000; for (let i = 0; i < n; i++) { const f = 2 * Math.PI * (i + 0.5) / n, R = Math.sqrt(rho * rho + rp * rp - 2 * rho * rp * Math.cos(f) + (z - zp) ** 2); Fz += (z - zp) / R ** 3; } H.near('ring of charge: elliptic-integral field = direct integral', Bm.ring(rho, z, rp, zp).Fz, Fz * 2 * Math.PI / n, 1e-9); }
    const eps = [-8, 1.5];
    { const a = Bm.solveQS(Bm.build([Bm.spheroid(10, 10)], 120), eps, em).alpha, ex = c3.cscale(c3.cdiv(c3.csub(eps, [em, 0]), c3.cadd(eps, [2 * em, 0])), 4 * Math.PI * 1000); H.near('BEM sphere = analytic polarisability', a[0] / ex[0], 1, 1e-3); }
    { const a = Bm.solveQS(Bm.build([Bm.spheroid(20, 5)], 120), eps, em).alpha, L = M.depol(20, 5), V = 4 / 3 * Math.PI * 100 * 5, ex = c3.cdiv([V * 5 / 5, 0], c3.cadd([L, 0], c3.cdiv([em, 0], c3.csub(eps, [em, 0]))));
      const V2 = 4 / 3 * Math.PI * 20 * 25, ex2 = c3.cdiv([V2, 0], c3.cadd([L, 0], c3.cdiv([em, 0], c3.csub(eps, [em, 0])))); H.near('BEM spheroid (aspect ratio 4) = analytic polarisability', a[0] / ex2[0], 1, 1e-3); }
    // sphere dimers against exact two-sphere theory
    for (const [R, g, lam, tolE] of [[5, 1, 552, 0.03], [20, 2, 600, 0.15]]) {
      const G = Bm.build([Bm.spheroid(R, R, R + g / 2), Bm.spheroid(R, R, -(R + g / 2))], R === 5 ? 100 : 120), r = Bm.response(G, eAu(lam), em, lam), L = [{ r: R, n: nAu(lam) }];
      const S = M.solve([{ z: -(R + g / 2), layers: L }, { z: R + g / 2, layers: L }], 1.33, lam, 'z'); H.near(`BEM sphere dimer (${2 * R} nm, ${g} nm gap) gap |E|² = exact theory`, Bm.field(G, r, 0, 0) / M.intensity(M.field(S, 0, 0, 0)), 1, tolE); }
    const peak = (G, lo, hi) => { let b = { C: 0 }; for (let lam = lo; lam <= hi; lam += 4) { const r = Bm.response(G, eAu(lam), em, lam); if (r.Cext > b.C) b = { C: r.Cext, lam }; } return b.lam; };
    const p1 = peak(Bm.build([Bm.capsule(40, 5)], 100), 600, 1000);
    H.check('Au rod with rounded ends, 40 × 10 nm: 785–820 nm (measured ≈ 800)', p1 >= 785 && p1 <= 820, p1);
    const pg = [10, 2].map(g => peak(Bm.build([Bm.capsule(40, 5, 20 + g / 2), Bm.capsule(40, 5, -(20 + g / 2))], 80), 700, 1100));
    H.check('end-to-end rod dimer red-shifts as the gap closes', pg[0] > p1 && pg[1] > pg[0], [p1, ...pg]);
    const side = g => { let b = { C: 0 }; for (let lam = 600; lam <= 900; lam += 2) { const sp = M.spheroid(eAu(lam), em, 20, 5, lam), p = M.sideBySide(sp, 20, 5, 10 + g, lam, em); if (p[1] > b.C) b = { C: p[1], lam }; } return b.lam; };
    const s1 = side(1000), s2 = side(20), s3 = side(2);
    H.check('side-by-side rods blue-shift as the gap closes (and become single rods far apart)', Math.abs(s1 - 778) <= 4 && s2 < s1 && s3 < s2 && s1 - s3 < 80, [s1, s2, s3]); }
};
