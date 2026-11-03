/* Birefringent films: Berreman 4 × 4 against the isotropic solver and wave-plate optics */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · birefringent (uniaxial) films, 4 × 4 method');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js']), TF = RNBX.thinfilm;
  const c = (n, k = 0) => ({ mat: 'custom', n, k }), uni = (no, ne, tilt, az, ko = 0, ke = 0) => ({ mat: 'aniso', no, ne, tilt, az, ko, ke });
  let worst = 0;
  [0, 35, 70].forEach(th => ['s', 'p'].forEach(pol => {
    const iso = { inc: c(1), layers: [{ m: c(1.7, 0.02), d: 250 }, { m: { mat: 'Ag' }, d: 25 }], sub: c(1.5) }, an = { inc: c(1), layers: [{ m: uni(1.7, 1.7, 40, 30, 0.02, 0.02), d: 250 }, { m: { mat: 'Ag' }, d: 25 }], sub: c(1.5) };
    const a = TF.solve(iso, 620, th, pol), b = TF.response(an, 620, th, pol);
    worst = Math.max(worst, Math.abs(a.R - b.R), Math.abs(a.T - b.T), Math.hypot(a.r[0] - b.r[0], a.r[1] - b.r[1]));
  }));
  H.check('n_o = n_e: the 4 × 4 result equals the isotropic transfer matrix (R, T, r; s and p; 0–70°)', worst < 1e-9, worst);
  const e1 = TF.ellips({ inc: c(1), layers: [{ m: c(1.6), d: 120 }], sub: { mat: 'Si' } }, 600, 70), e2 = TF.ellips({ inc: c(1), layers: [{ m: uni(1.6, 1.6, 20, 10), d: 120 }], sub: { mat: 'Si' } }, 600, 70);
  H.check('… and the same Ψ, Δ', Math.abs(e1.psi - e2.psi) < 1e-9 && Math.abs(e1.delta - e2.delta) < 1e-9, [e1, e2]);
  // an index-matched half-wave plate at 45°: s turns into p
  const hw = d => TF.solveAniso({ inc: c(1.53), layers: [{ m: uni(1.53, 1.71, 90, 45), d }], sub: c(1.53) }, 600, 0);
  const h = hw(600 / (2 * 0.18)), q = hw(600 / (4 * 0.18));
  H.check('half-wave LC plate at 45°: > 99 % of s light converted to p', h.Tx.s > 0.99 && h.Tx.s <= h.T.s + 1e-12, h.Tx.s);
  H.near('quarter-wave plate at 45°: half converted (circular light)', q.Tx.s / q.T.s, 0.5, 0.01);
  const ax = TF.solveAniso({ inc: c(1.53), layers: [{ m: uni(1.53, 1.71, 90, 0), d: 1667 }], sub: c(1.53) }, 600, 0);
  H.check('optic axis along the polarisation: no conversion', ax.Tx.s < 1e-12 && ax.Tx.p < 1e-12, ax.Tx);
  // optic axis along the normal: at normal incidence the film looks isotropic with n_o
  const cz = TF.solveAniso({ inc: c(1), layers: [{ m: uni(1.5, 1.8, 0, 0), d: 300 }], sub: c(1.45) }, 550, 0), io = TF.solve({ inc: c(1), layers: [{ m: c(1.5), d: 300 }], sub: c(1.45) }, 550, 0, 's');
  H.near('c-axis along the normal, normal incidence: behaves as n_o', cz.R.s, io.R, 1e-10);
  const ob = TF.solveAniso({ inc: c(1), layers: [{ m: uni(1.55, 1.75, 35, 60), d: 1200 }], sub: c(1.5) }, 700, 50);
  H.check('lossless film, axis tilted and turned, 50°: R + T = 1 for s and p', Math.abs(ob.R.s + ob.T.s - 1) < 1e-9 && Math.abs(ob.R.p + ob.T.p - 1) < 1e-9, ob);
  H.check('… with polarisation conversion in both directions', ob.Tx.s > 1e-4 && ob.Tx.p > 1e-4, ob.Tx);
};
