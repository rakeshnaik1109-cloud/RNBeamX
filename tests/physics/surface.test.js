/* Ellipsometry, effective-medium mixtures, thick substrates, and a sphere above a substrate (NPoM) */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · ellipsometry, mixtures, substrates, particle on a mirror');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js', 'engine/mie.js', 'engine/npom.js']), TF = RNBX.thinfilm, MIE = RNBX.mie, NP = RNBX.npom;
  const c = (n, k = 0) => ({ mat: 'custom', n, k }), bare = m => ({ inc: { mat: 'air' }, layers: [], sub: m });
  // ellipsometry, in the convention of commercial instruments
  const si = TF.ellips(bare(c(3.88, 0.019)), 633, 70), au = TF.ellips(bare(c(0.18, 3.4)), 633, 70);
  H.near('Si at 70°, 633 nm: Ψ (Fresnel)', si.psi, 10.558, 0.002);
  H.near('Si at 70°, 633 nm: Δ just below 180°', si.delta, 179.228, 0.002);
  H.near('Au at 70°: Δ between 0 and 180° (107.68°)', au.delta, 107.68, 0.01);
  const below = TF.ellips(bare(c(1.5)), 633, 40), above = TF.ellips(bare(c(1.5)), 633, 70), brew = TF.ellips(bare(c(1.5)), 633, 56.31);
  H.check('glass: Δ = 180° below Brewster’s angle, 0° above, Ψ → 0 at it', Math.abs(below.delta - 180) < 1e-6 && Math.abs(above.delta) < 1e-6 && brew.psi < 0.01, [below.delta, above.delta, brew.psi]);
  const ox = d => TF.ellips({ inc: { mat: 'air' }, layers: [{ m: { mat: 'SiO2' }, d }], sub: { mat: 'Si' } }, 633, 70).delta;
  H.check('a 2 nm native oxide on Si lowers Δ by several degrees (thin-film sensitivity)', ox(0) - ox(2) > 2 && ox(0) - ox(2) < 10, [ox(0), ox(2)]);
  // effective-medium mixtures
  const E = (a, b, f, model) => TF.emaNk({ a, b, f, model }, 633);
  const g = c(1.5), air = { mat: 'air' };
  const s1 = E(g, air, 0.3, 'bruggeman'), s2 = E(air, g, 0.7, 'bruggeman');
  H.check('Bruggeman is symmetric (A+30 % B = B+70 % A)', Math.abs(s1.n - s2.n) < 1e-12 && Math.abs(s1.k - s2.k) < 1e-12, [s1, s2]);
  H.check('limits: f = 0 gives A, f = 1 gives B (Bruggeman, Maxwell Garnett)', Math.abs(E(g, air, 0, 'bruggeman').n - 1.5) < 1e-12 && Math.abs(E(g, air, 1, 'bruggeman').n - 1) < 1e-12 && Math.abs(E(g, air, 0, 'mg').n - 1.5) < 1e-12 && Math.abs(E(g, air, 1, 'mg').n - 1) < 1e-12);
  const mg = E(g, c(2.5), 0.03, 'mg'), br = E(g, c(2.5), 0.03, 'bruggeman'), auG = E(g, c(0.2, 3.4), 0.03, 'mg');
  H.check('dilute TiO₂-like grains in glass: Bruggeman ≈ Maxwell Garnett', Math.abs(mg.n - br.n) < 0.003, [mg.n, br.n]);
  H.check('a few % gold in glass absorbs (Maxwell Garnett, plasmon-like)', auG.k > 0.005, auG);
  const por = E(g, air, 0.5, 'bruggeman');
  H.check('50 % porous glass lies between the linear-ε and Maxwell Garnett values', por.n < E(g, air, 0.5, 'linear').n && por.n > E(g, air, 0.5, 'mg').n - 0.05, por.n);
  // thick substrate: both faces of a glass slide
  const slide = Object.assign({ back: { d: 1e6 } }, bare(c(1.5))), r1 = TF.response(slide, 633, 0, 's');
  H.near('1 mm glass slide at normal incidence: R = 2R₁/(1+R₁) = 7.69 %', r1.R, 2 * 0.04 / 1.04, 1e-9);
  const lossy = TF.response(Object.assign({ back: { d: 1e6 } }, bare(c(1.5, 1e-3))), 633, 0, 's');
  H.check('an absorbing thick substrate hides its back face (R = front only)', Math.abs(lossy.R - 0.04) < 1e-4 && lossy.T < 1e-6, lossy);
  const film = Object.assign({ back: { d: 5e5 } }, { inc: { mat: 'air' }, layers: [{ m: { mat: 'TiO2' }, d: 80 }], sub: c(1.52) }), rf = TF.response(film, 550, 30, 'p');
  H.near('energy is conserved with the incoherent back side', rf.R + rf.T + rf.A, 1, 1e-12);
  // a sphere above a substrate (multipole images)
  const lay = [{ r: 10, n: [0.2, 3] }], iso = NP.solve({ layers: lay, nMed: 1, lam: 520, nSub: [1, 0], gap: 2, pol: 'z' }), mie = MIE.sphere(lay, 1, 520, 10);
  H.check('no substrate (β = 0): the particle’s extinction is Mie’s (dipole term, within 2 %)', Math.abs(iso.Cext / mie.Cext - 1) < 0.02, [iso.Cext, mie.Cext]);
  const far = NP.solve({ layers: lay, nMed: 1, lam: 520, nSub: [0.2, 3], gap: 300, pol: 'z' });
  H.check('a far-away mirror does not change the particle', Math.abs(far.Cext / iso.Cext - 1) < 0.01, [far.Cext, iso.Cext]);
  let worst = 0;
  [520, 560, 620].forEach(lam => {
    const nk = TF.nk({ mat: 'Au' }, lam), L2 = [{ r: 10, n: [nk.n, nk.k] }];
    const np = NP.solve({ layers: L2, nMed: 1, lam, nSub: [0, 1000], gap: 1, pol: 'z' }), Ep = NP.intensity(np, 0, -np.S / 2 + 1e-4);
    const parts = [{ z: -11, layers: L2 }, { z: 11, layers: L2 }], Sx = MIE.solve(parts, 1, lam, 'z', MIE.autoOrder(parts, lam, 1)), Ed = MIE.intensity(MIE.field(Sx, 0, 0, 0));
    worst = Math.max(worst, Math.abs(Ep / Ed - 1));
  });
  H.check('perfect mirror ≡ dimer: the gap field matches exact two-sphere Mie theory within 6 %', worst < 0.06, worst);
  const conv = L => NP.solve({ layers: [{ r: 40, n: [0.2, 4.8] }], nMed: 1.45, lam: 800, nSub: [0.2, 4.8], gap: 1, pol: 'z', L }).E2gap;
  [[40, 1], [40, 0.3], [20, 5]].forEach(([R0, g0]) => { const f = L => NP.solve({ layers: [{ r: R0, n: [0.2, 4.8] }], nMed: 1.45, lam: 800, nSub: [0.2, 4.8], gap: g0, pol: 'z', L }).E2gap; const Lauto = NP.order(R0, g0); H.check(`automatic order (${Lauto}) converged for R ${R0} nm, gap ${g0} nm (vs 300)`, Math.abs(f(Lauto) / f(300) - 1) < 1e-5, [f(Lauto), f(300)]); });
  H.check('a too-low order is visibly wrong (the check above means something)', Math.abs(conv(20) / conv(300) - 1) > 1e-3);
  const peak = g => { let best = [0, 0]; for (let lam = 550; lam <= 1000; lam += 10) { const nk = TF.nk({ mat: 'Au' }, lam), r = NP.solve({ layers: [{ r: 40, n: [nk.n, nk.k] }], nMed: 1.45, lam, nSub: [nk.n, nk.k], gap: g, pol: 'z' }); if (r.Csca > best[1]) best = [lam, r.Csca]; } return best[0]; };
  const p1 = peak(1), p3 = peak(3);
  H.check('Au 80 nm on a Au mirror, n = 1.45: the gap mode near 800 nm for 1 nm, bluer for 3 nm', p1 >= 760 && p1 <= 850 && p3 < p1 - 40, [p1, p3]);
};
