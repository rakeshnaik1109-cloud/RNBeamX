/* Spectrum fitting: recovering film thicknesses from noisy synthetic spectra */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · fitting measured spectra');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js', 'engine/fit.js']), TF = RNBX.thinfilm, FIT = RNBX.fit;
  const stack = ts => ({ inc: { mat: 'air' }, layers: ts.map(([m, d]) => ({ m: { mat: m }, d })), sub: { mat: 'glass:N-BK7' } });
  let seed = 3; const noise = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 - 0.5; };
  const xs = Array.from({ length: 160 }, (_, i) => 400 + i * 3.5);
  const run = async (truth, start, lo, hi) => {
    const meas = xs.map(x => TF.response(stack(truth), x, 0, 's').R + 0.003 * noise());
    return FIT.global(p => xs.map((x, i) => TF.response(stack(truth.map(([m], j) => [m, p[j]])), x, 0, 's').R - meas[i]), start, lo, hi, {});
  };
  const a = await run([['TiO2', 123]], [70], [40], [250]);
  H.near('one film, started on another fringe (70 nm): TiO₂ 123 nm recovered', a.p[0], 123, 0.2);
  H.check('… with a small standard error', a.sigma[0] > 0 && a.sigma[0] < 0.2, a.sigma);
  const b = await run([['SiO2', 85], ['TiO2', 60]], [60, 90], [20, 20], [200, 200]);
  H.check('two films: SiO₂ 85 / TiO₂ 60 nm recovered', Math.abs(b.p[0] - 85) < 0.3 && Math.abs(b.p[1] - 60) < 0.3, b.p);
  const c = await run([['Ag', 22], ['SiO2', 150], ['Ag', 100]], [15, 110, 100], [5, 50, 100], [40, 300, 100]);
  H.check('MIM Ag / SiO₂ / Ag: 22 / 150 nm recovered', Math.abs(c.p[0] - 22) < 0.3 && Math.abs(c.p[1] - 150) < 0.5, c.p);
  H.check('residual RMS matches the added noise (≈ 0.09 %)', c.rms > 5e-4 && c.rms < 1.2e-3, c.rms);
  // bounds are respected
  const d = FIT.lm(p => [p[0] - 10], [0.5], [0], [3]);
  H.near('Levenberg–Marquardt stays inside the bounds', d.p[0], 3, 1e-9);
};
