/* Guided modes: slab waveguides, surface plasmons, gap plasmons */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · guided modes of a stack');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js']), TF = RNBX.thinfilm;
  const c = (n, k = 0) => ({ mat: 'custom', n, k }), slab = { inc: c(1), layers: [{ m: c(1.5), d: 1000 }], sub: c(1) };
  // exact values from the transcendental slab equations (bisection, double precision)
  const te = TF.modes(slab, 633, 's').map(m => m.n[0]), tm = TF.modes(slab, 633, 'p').map(m => m.n[0]);
  const TE = [1.475906, 1.402149, 1.274418, 1.090463], TM = [1.471234, 1.383358, 1.23432, 1.051207];
  H.check('symmetric slab (n 1.5, 1 µm, 633 nm): all four TE modes, n_eff to 1e-6', te.length === 4 && te.every((v, i) => Math.abs(v - TE[i]) < 2e-6), te);
  H.check('… and all four TM modes', tm.length === 4 && tm.every((v, i) => Math.abs(v - TM[i]) < 2e-6), tm);
  const a = TF.nk({ mat: 'Au' }, 633), er = a.n * a.n - a.k * a.k, ei = 2 * a.n * a.k, dr = er + 1, d2 = dr * dr + ei * ei, qr = (er * dr + ei * ei) / d2, qi = (ei * dr - er * ei) / d2, mm = Math.hypot(qr, qi);
  const spp = TF.modes({ inc: { mat: 'air' }, layers: [], sub: { mat: 'Au' } }, 633, 'p');
  H.check('surface plasmon on gold: n_eff = √(ε ε_d / (ε + ε_d)), complex, exact', spp.length === 1 && Math.abs(spp[0].n[0] - Math.sqrt((mm + qr) / 2)) < 1e-9 && Math.abs(spp[0].n[1] - Math.sqrt((mm - qr) / 2)) < 1e-9, spp[0] && spp[0].n);
  H.check('no TE surface plasmon', TF.modes({ inc: { mat: 'air' }, layers: [], sub: { mat: 'Au' } }, 633, 's').length === 0);
  const mim = TF.modes({ inc: { mat: 'Ag' }, layers: [{ m: c(1), d: 20 }], sub: { mat: 'Ag' } }, 633, 'p');
  H.check('Ag / 20 nm air / Ag gap plasmon: slow (n_eff ≈ 1.9) and lossy', mim.length >= 1 && mim[0].n[0] > 1.7 && mim[0].n[0] < 2.1 && mim[0].n[1] > 0 && isFinite(mim[0].Lprop), mim[0]);
  const thin = TF.modes({ inc: { mat: 'air' }, layers: [{ m: c(1.5), d: 50 }], sub: c(1.45) }, 1550, 's');
  H.check('an asymmetric guide below cut-off has no mode', thin.length === 0, thin);
  const wg = { inc: { mat: 'air' }, layers: [{ m: c(2), d: 400 }], sub: c(1.45) }, m0 = TF.modes(wg, 1000, 's')[0], f = TF.modeField(wg, 1000, m0);
  const inside = f.f.filter((v, i) => f.layer[i] === 0), outside = [f.f[0], f.f[f.f.length - 1]];
  H.check('fundamental mode profile: peak in the core, decaying on both sides', Math.max(...inside) > 0.99 && outside.every(v => v < 0.02), outside);
};
