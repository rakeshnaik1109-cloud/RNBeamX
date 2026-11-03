/* Colorimetry: CIE 1931 / D65, and the colour of gold and silver colloids from Mie theory */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · colour of spectra and colloids');
  const RNBX = H.loadEngine(['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js', 'engine/mie.js', 'engine/colour.js']), CO = RNBX.colour, TF = RNBX.thinfilm, MIE = RNBX.mie;
  const w = CO.xyz(() => 1), xy = CO.chromaticity(w);
  H.check('a perfect white under D65 has the D65 white point (0.3127, 0.3290)', Math.abs(xy[0] - 0.3127) < 0.0005 && Math.abs(xy[1] - 0.3290) < 0.0005, xy);
  H.check('… and is sRGB white', CO.srgb(w).join() === '255,255,255', CO.srgb(w));
  H.near('ȳ peaks at 1 near 555 nm (photopic luminosity)', CO.cmf(556)[1], 1, 0.02);
  const spec = (mat, dnm) => { const x = [], ext = [], sca = []; for (let l = 380; l <= 800; l += 5) { const nk = TF.nk({ mat }, l), s = MIE.sphere([{ r: dnm / 2, n: [nk.n, nk.k] }], 1.333, l, 12); x.push(l); ext.push(s.Cext); sca.push(s.Csca); } return { x, ext, sca }; };
  const au = spec('Au', 40), ag = spec('Ag', 60);
  const ta = CO.transmitted(au.x, au.ext, 1).rgb, sa = CO.scattered(au.x, au.sca).rgb, tg = CO.transmitted(ag.x, ag.ext, 1).rgb, sg = CO.scattered(ag.x, ag.sca).rgb;
  H.check('40 nm gold colloid: red in transmission, green in dark field', ta[0] > ta[1] + 60 && sa[1] > sa[0] && sa[1] > sa[2], { ta, sa });
  H.check('60 nm silver colloid: yellow in transmission, blue–violet in dark field', tg[0] > tg[2] + 40 && tg[1] > tg[2] + 40 && sg[2] > sg[0] && sg[2] > sg[1], { tg, sg });
  const dense = CO.transmitted(au.x, au.ext, 3).xyz[1], thin = CO.transmitted(au.x, au.ext, 0.3).xyz[1];
  H.check('a denser colloid lets less light through', dense < thin, [dense, thin]);
};
