/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/colour.js
   The colour a person sees from a spectrum: CIE 1931 2° colour
   matching functions (the multi-lobe Gaussian fit of Wyman,
   Sloan & Shirley, JCGT 2(2), 1 (2013), within about 1 % of the
   tabulated functions), the CIE D65 daylight illuminant
   (10 nm table), XYZ → linear sRGB (IEC 61966-2-1) and gamma.
   Used for the colour of a colloid in a cuvette (transmitted
   light) and in dark field (scattered light).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const CO = RNBX.colour = {};

const g = (x, mu, s1, s2) => { const t = (x - mu) / (x < mu ? s1 : s2); return Math.exp(-0.5 * t * t); };
/* CIE 1931 x̄, ȳ, z̄ at λ (nm) */
CO.cmf = l => [
  1.056 * g(l, 599.8, 37.9, 31.0) + 0.362 * g(l, 442.0, 16.0, 26.7) - 0.065 * g(l, 501.1, 20.4, 26.2),
  0.821 * g(l, 568.8, 46.9, 40.5) + 0.286 * g(l, 530.9, 16.3, 31.1),
  1.217 * g(l, 437.0, 11.8, 36.0) + 0.681 * g(l, 459.0, 26.0, 13.8),
];
/* CIE standard illuminant D65, relative power, 380–780 nm every 10 nm */
const D65 = [49.98, 54.65, 82.75, 91.49, 93.43, 86.68, 104.86, 117.01, 117.81, 114.86, 115.92, 108.81, 109.35, 107.80, 104.79, 107.69, 104.41, 104.05, 100.00, 96.33, 95.79, 88.69, 90.01, 89.60, 87.70, 83.29, 83.70, 80.03, 80.21, 82.28, 78.28, 69.72, 71.61, 74.35, 61.60, 69.89, 75.09, 63.59, 46.42, 66.81, 63.38];
CO.d65 = l => { const t = (l - 380) / 10; if (t <= 0) return D65[0]; if (t >= 40) return D65[40]; const i = Math.floor(t), f = t - i; return D65[i] + (D65[i + 1] - D65[i]) * f; };

/* XYZ of a reflectance / transmittance spectrum f(λ) (0–1) under D65, normalised so a perfect
   white has Y = 1 */
CO.xyz = f => {
  let X = 0, Y = 0, Z = 0, N = 0;
  for (let l = 380; l <= 780; l += 2) { const c = CO.cmf(l), e = CO.d65(l), v = f(l); X += c[0] * e * v; Y += c[1] * e * v; Z += c[2] * e * v; N += c[1] * e; }
  return [X / N, Y / N, Z / N];
};
/* XYZ → sRGB (0–255), with the sRGB transfer curve; out-of-gamut colours are clipped */
CO.srgb = xyz => {
  const [X, Y, Z] = xyz, lin = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
  return lin.map(v => { v = Math.min(1, Math.max(0, v)); return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); });
};
CO.hex = rgb => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
CO.chromaticity = xyz => { const s = xyz[0] + xyz[1] + xyz[2] || 1; return [xyz[0] / s, xyz[1] / s]; };
/* colour of a spectrum given as arrays (x in nm, y), linearly interpolated (0 outside) */
CO.interp = (x, y) => l => { if (l < x[0] || l > x[x.length - 1]) return null; let i = 0; while (i < x.length - 2 && x[i + 1] < l) i++; const t = (l - x[i]) / ((x[i + 1] - x[i]) || 1); return y[i] + (y[i + 1] - y[i]) * t; };
/* a colloid in a cuvette: transmittance 10^(−A(λ)), A scaled so the peak absorbance is od;
   wavelengths outside the calculated range count as fully transmitted */
CO.transmitted = (x, ext, od) => {
  const mx = Math.max(...ext) || 1, f = CO.interp(x, ext);
  const xyz = CO.xyz(l => { const e = f(l); return e == null ? 1 : Math.pow(10, -od * e / mx); });
  return { xyz, rgb: CO.srgb(xyz), hex: CO.hex(CO.srgb(xyz)), xy: CO.chromaticity(xyz) };
};
/* scattered light (dark field): the colour of the scattering spectrum under white light,
   brightness normalised (only the hue and saturation are meaningful) */
CO.scattered = (x, sca) => {
  const mx = Math.max(...sca) || 1, f = CO.interp(x, sca);
  const xyz = CO.xyz(l => { const e = f(l); return e == null ? 0 : e / mx; }), k = 0.9 / Math.max(1e-9, ...CO.srgbLinear(xyz));
  const xyz2 = xyz.map(v => v * k);
  return { xyz: xyz2, rgb: CO.srgb(xyz2), hex: CO.hex(CO.srgb(xyz2)), xy: CO.chromaticity(xyz) };
};
CO.srgbLinear = xyz => { const [X, Y, Z] = xyz; return [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z]; };
})();
