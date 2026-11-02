/* Thin-film solver (transfer-matrix method) against textbook results */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · thin films (transfer matrix)');
  const RNBX = H.loadEngine(), TF = RNBX.thinfilm;
  const M = (mat, n, k) => ({ mat, n, k });
  const glass = { inc: M('air'), layers: [], sub: M('custom', 1.5, 0) };
  H.near('bare glass R at normal incidence', TF.solve(glass, 600, 0, 's').R, 0.04, 1e-9);
  H.near('bare glass T at normal incidence', TF.solve(glass, 600, 0, 's').T, 0.96, 1e-9);
  H.near('Brewster angle: Rp = 0', TF.solve(glass, 600, Math.atan(1.5) * 180 / Math.PI, 'p').R, 0, 1e-12);
  const fres = th => { const c1 = Math.cos(th), s2 = Math.sin(th) / 1.5, c2 = Math.sqrt(1 - s2 * s2); return { Rs: ((c1 - 1.5 * c2) / (c1 + 1.5 * c2)) ** 2, Rp: ((1.5 * c1 - c2) / (1.5 * c1 + c2)) ** 2 }; };
  H.near('Fresnel Rs at 50°', TF.solve(glass, 600, 50, 's').R, fres(50 * Math.PI / 180).Rs, 1e-12);
  H.near('Fresnel Rp at 50°', TF.solve(glass, 600, 50, 'p').R, fres(50 * Math.PI / 180).Rp, 1e-12);
  const nAR = Math.sqrt(1.5);
  H.near('quarter-wave antireflection coating: R = 0', TF.solve({ inc: M('air'), layers: [{ m: M('custom', nAR, 0), d: 600 / 4 / nAR }], sub: M('custom', 1.5, 0) }, 600, 0, 's').R, 0, 1e-12);
  const r = TF.solve({ inc: M('air'), layers: [{ m: M('custom', 2.3, 0), d: 70 }, { m: M('custom', 1.38, 0), d: 110 }, { m: M('custom', 2.3, 0), d: 70 }], sub: M('custom', 1.52, 0) }, 550, 37, 'p');
  H.near('lossless multilayer: R + T = 1', r.R + r.T, 1, 1e-12);
  const layers = []; for (let i = 0; i < 10; i++) layers.push({ m: M('custom', 2.35, 0), d: 600 / 4 / 2.35 }, { m: M('custom', 1.38, 0), d: 600 / 4 / 1.38 }); layers.push({ m: M('custom', 2.35, 0), d: 600 / 4 / 2.35 });
  const Y = (2.35 / 1.38) ** 20 * 2.35 * 2.35 / 1.52;
  H.near('Bragg mirror (10.5 pairs) matches the closed form', TF.solve({ inc: M('air'), layers, sub: M('custom', 1.52, 0) }, 600, 0, 's').R, ((1 - Y) / (1 + Y)) ** 2, 1e-9);
  H.near('total internal reflection: R = 1', TF.solve({ inc: M('custom', 1.5, 0), layers: [], sub: M('air') }, 600, 60, 's').R, 1, 1e-12);
  const bulk = TF.solve({ inc: M('air'), layers: [], sub: M('Ag') }, 600, 0, 's').R;
  H.near('1 mm of silver = bulk silver (no overflow)', TF.solve({ inc: M('air'), layers: [{ m: M('Ag'), d: 1e6 }], sub: M('custom', 1.5, 0) }, 600, 0, 's').R, bulk, 1e-9);
  const a = { inc: M('air'), layers: [{ m: M('Au'), d: 20 }, { m: M('custom', 2, 0), d: 80 }], sub: M('air') }, b = { inc: M('air'), layers: [{ m: M('custom', 2, 0), d: 80 }, { m: M('Au'), d: 20 }], sub: M('air') };
  H.near('reciprocity: T forwards = T backwards', TF.solve(a, 600, 25, 'p').T, TF.solve(b, 600, 25, 'p').T, 1e-12);
  const spr = (sub, lo, hi) => { const res = TF.scan({ inc: M('glass:N-BK7'), layers: [{ m: M('Au'), d: 50 }], sub }, { scan: 'angle', amin: lo, amax: hi, lambda: 633, pol: 'p', points: 2001 }); return TF.extremum(res.x, res.series.R); };
  H.near('SPR angle, BK7 / 50 nm Au / air, 633 nm (literature ≈ 43.7°)', spr(M('air'), 40, 50).x, 43.75, 0.4);
  H.near('SPR angle, BK7 / 50 nm Au / water, 633 nm (literature ≈ 72°)', spr(M('H2O'), 60, 80).x, 72.0, 0.8);
  const shift = n => spr(M('custom', n, 0), 60, 85).x;
  H.near('SPR angular sensitivity (deg/RIU, literature ≈ 130–150)', (shift(1.343) - shift(1.333)) / 0.01, 145, 15);

  // field inside the stack
  const bare = TF.field(glass, 600, 0, 's'), iz = bare.z.findIndex(z => z >= 0);
  H.near('field at a bare interface: |E|² = |1 + r|² = 0.64', bare.e2[iz], 0.64, 1e-9);
  const mim = { inc: M('air'), layers: [{ m: M('Ni'), d: 6 }, { m: M('SiO2'), d: 120 }, { m: M('Al'), d: 100 }], sub: M('glass:N-BK7') };
  [['s', 0], ['s', 40], ['p', 60]].forEach(([pol, th]) => {
    const fr = TF.field(mim, 620, th, pol), sv = TF.solve(mim, 620, th, pol);
    H.near(`absorption from the field integral equals A (${pol}, ${th}°)`, fr.absorbed.reduce((a, b) => a + b, 0), sv.A, 2e-3);
    H.near(`field R equals solver R (${pol}, ${th}°)`, fr.R, sv.R, 1e-12);
  });
  const qwL = []; for (let i = 0; i < 5; i++) qwL.push({ m: M('custom', 1.45, 0), d: 600 / 4 / 1.45 }, { m: M('custom', 2.4, 0), d: 600 / 4 / 2.4 });
  const cav = { inc: M('air'), layers: qwL.concat([{ m: M('custom', 1.45, 0), d: 600 / 2 / 1.45 }], qwL.slice().reverse()), sub: M('custom', 1.52, 0) };
  const fc = TF.field(cav, 600, 0, 's');
  H.check('microcavity (LH)⁵ 2L (HL)⁵: transmission peak at the design wavelength and field enhanced in the cavity', TF.solve(cav, 600, 0, 's').T > 0.9 && Math.max(...fc.e2) > 20, { T: TF.solve(cav, 600, 0, 's').T, peak: Math.max(...fc.e2) });
  const mp = TF.map(mim, { lmin: 400, lmax: 900, amin: 0, amax: 80, nl: 11, na: 5, pol: 'p', show: 'R' });
  H.near('wavelength × angle map agrees with the solver', mp.v[2 * 11 + 4], TF.response(mim, 600, 40, 'p').R, 1e-6);
};
