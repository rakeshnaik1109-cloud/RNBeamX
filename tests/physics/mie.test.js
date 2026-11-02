/* Mie and multi-sphere Mie theory against independent physics */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · nanoparticles (Mie, dimers)');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js', 'engine/mie.js']), M = RNBX.mie, TF = RNBX.thinfilm, c = M.c;
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
};
