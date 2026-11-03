/* ═══════════════════════════════════════════════════════════
   RNBeamX — engine/thinfilm.js
   Optical response of planar layer stacks: the transfer-matrix
   (characteristic-matrix) method for isotropic films, with
   measured n, k from engine/nkdata.js.

   Conventions: time dependence e^(−iωt), so N = n + ik with k ≥ 0
   for absorbing media. Light arrives from the incident medium
   (lossless, real index) at angle θ, crosses the layers in order,
   and leaves into the semi-infinite substrate. Admittances are the
   tilted ones of Macleod: η_s = N cosθ, η_p = N / cosθ.

   Each layer matrix is scaled by e^(−Im δ) before it is multiplied,
   so thick metal or absorbing layers never overflow; the scale is
   restored for the transmittance, and cancels for the reflectance.

   This is exact for flat films. Gratings and other laterally
   structured layers need RCWA or FDTD; the stack component says so.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util;
const TF = RNBX.thinfilm = {};

/* ---------- materials ---------- */
const DATA = {};
(window.RNBX_NK || []).forEach(m => { DATA[m.id] = m; });
TF.data = DATA;
const GLASS = { 'N-BK7': 'N-BK7 glass', FS: 'Fused silica (Sellmeier)', SF11: 'SF11 glass', CaF2: 'CaF₂ (Sellmeier)', Sapphire: 'Sapphire (o-ray)' };
TF.GROUPS = [['metal', 'Metals'], ['dielectric', 'Dielectrics'], ['semiconductor', 'Semiconductors'], ['polymer', 'Polymers'], ['liquid', 'Liquids'], ['glass', 'Optical glasses']];
/* select options: [[id, label]] with group headings as disabled entries */
TF.options = (withCustom = true) => {
  const out = [['air', 'Air / vacuum (n = 1)']];
  TF.GROUPS.forEach(([g, title]) => {
    const list = g === 'glass' ? Object.keys(GLASS).map(id => ['glass:' + id, GLASS[id]]) : Object.values(DATA).filter(m => m.kind === g).map(m => [m.id, m.name]);
    if (list.length) out.push(['', '— ' + title + ' —', true], ...list);
  });
  if (withCustom) out.push(['custom', 'Custom n, k…']);
  return out;
};
TF.name = id => id === 'air' ? 'Air' : id === 'custom' ? 'Custom' : id === 'ema' ? 'Mixture (EMA)' : id && id.startsWith('glass:') ? GLASS[id.slice(6)] : DATA[id] ? DATA[id].name : String(id);
TF.ref = id => DATA[id] ? `${DATA[id].src}. ${DATA[id].ref}` : id && id.startsWith('glass:') ? 'Sellmeier formula (manufacturer data).' : '';

/* n, k of a material at a wavelength in nm. m: { mat, n, k } (n, k for custom).
   Outside the tabulated range the end value is used and `out` is set. */
TF.nk = (m, nm) => {
  const id = m && m.mat;
  if (!id || id === 'air') return { n: 1, k: 0 };
  if (id === 'custom') return { n: +m.n || 1, k: Math.max(0, +m.k || 0) };
  if (id === 'ema') return TF.emaNk(m.ema || {}, nm);
  if (id.startsWith('glass:')) return { n: RNBX.optics.index(id.slice(6), nm), k: 0 };
  const d = DATA[id];
  if (!d) return { n: 1, k: 0, missing: true };
  const a = d.d, um = nm / 1000, N = a.length / 3;
  if (um <= a[0]) return { n: a[1], k: a[2], out: um < a[0] * 0.995 };
  if (um >= a[(N - 1) * 3]) return { n: a[(N - 1) * 3 + 1], k: a[(N - 1) * 3 + 2], out: um > a[(N - 1) * 3] * 1.005 };
  let lo = 0, hi = N - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (a[mid * 3] > um) hi = mid; else lo = mid; }
  const t = (um - a[lo * 3]) / (a[hi * 3] - a[lo * 3]);
  return { n: a[lo * 3 + 1] + t * (a[hi * 3 + 1] - a[lo * 3 + 1]), k: a[lo * 3 + 2] + t * (a[hi * 3 + 2] - a[lo * 3 + 2]) };
};
TF.range = m => { const d = m && DATA[m.mat]; return d ? [d.range[0] * 1000, d.range[1] * 1000] : null; };

/* ---------- effective-medium mixtures ----------
   ema: { a: material, b: material, f: volume fraction of b, model: 'bruggeman' | 'mg' | 'linear' }
   Bruggeman (symmetric; also the usual model of surface roughness, 50 % voids),
   Maxwell Garnett (b as small inclusions in host a) or a linear average of ε. */
TF.EMA_MODELS = [['bruggeman', 'Bruggeman'], ['mg', 'Maxwell Garnett (B inside A)'], ['linear', 'Linear (ε average)']];
TF.emaEps = (ea, eb, f, model) => {
  f = Math.min(1, Math.max(0, +f || 0));
  if (model === 'linear') return add(mul([1 - f, 0], ea), mul([f, 0], eb));
  if (model === 'mg') { const d = sub(eb, ea), num = add(add(eb, mul([2, 0], ea)), mul([2 * f, 0], d)), den = sub(add(eb, mul([2, 0], ea)), mul([f, 0], d)); return mul(ea, div(num, den)); }
  // Bruggeman: 2ε² − Bε − εa εb = 0 with B = (3fa − 1) εa + (3fb − 1) εb; the root with Im ε ≥ 0
  const B = add(mul([3 * (1 - f) - 1, 0], ea), mul([3 * f - 1, 0], eb)), rt = csqrt(add(mul(B, B), mul([8, 0], mul(ea, eb))));
  const r1 = mul([0.25, 0], add(B, rt)), r2 = mul([0.25, 0], sub(B, rt));
  if (r1[1] < -1e-12 && r2[1] >= -1e-12) return r2;
  if (r2[1] < -1e-12 && r1[1] >= -1e-12) return r1;
  return r1[0] >= r2[0] ? r1 : r2;
};
TF.emaNk = (e, nm) => {
  const A = TF.nk(e.a || { mat: 'air' }, nm), B = TF.nk(e.b || { mat: 'air' }, nm);
  const eps = TF.emaEps(mul([A.n, A.k], [A.n, A.k]), mul([B.n, B.k], [B.n, B.k]), e.f, e.model);
  const N = csqrt(eps);
  return { n: N[0], k: Math.max(0, N[1]), out: A.out || B.out };
};

/* ---------- complex arithmetic on [re, im] ---------- */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const abs2 = a => a[0] * a[0] + a[1] * a[1];
const csqrt = a => { const r = Math.hypot(a[0], a[1]), re = Math.sqrt(Math.max(0, (r + a[0]) / 2)), im = Math.sqrt(Math.max(0, (r - a[0]) / 2)); return [re, a[1] < 0 ? -im : im]; };
/* z-component of the normalised wavevector: q = sqrt(N² − Kx²), decaying / forward branch */
const qz = (N, Kx) => { let q = csqrt(sub(mul(N, N), [Kx * Kx, 0])); if (q[1] < 0 || (Math.abs(q[1]) < 1e-12 && q[0] < 0)) q = [-q[0], -q[1]]; return q; };

/* Reflectance, transmittance and absorptance of one stack at one
   wavelength (nm), angle (degrees, in the incident medium) and
   polarisation 's' or 'p'. stack: { inc, layers: [{ m, d (nm) }], sub } */
TF.solve = (stack, nm, thetaDeg, pol) => {
  const n0 = TF.nk(stack.inc, nm).n;
  const N0 = [n0, 0], th = U.rad(thetaDeg), Kx = n0 * Math.sin(th);
  const eta = (N, q) => pol === 'p' ? div(mul(N, N), q) : q;
  const q0 = qz(N0, Kx), eta0 = eta(N0, q0);
  const sk = TF.nk(stack.sub, nm), Ns = [sk.n, sk.k], qs = qz(Ns, Kx), etas = eta(Ns, qs);
  // M = Π M_j, kept as [[a, b], [c, d]] with a running log scale
  let a = [1, 0], b = [0, 0], c = [0, 0], d = [1, 0], logS = 0;
  for (const L of stack.layers) {
    if (!(L.d > 0)) continue;
    const nk = TF.nk(L.m, nm), N = [nk.n, nk.k], q = qz(N, Kx), e = eta(N, q);
    const del = [2 * Math.PI * q[0] * L.d / nm, 2 * Math.PI * q[1] * L.d / nm];
    // scaled cos δ and sin δ (× e^(−|Im δ|))
    const x = del[0], y = Math.abs(del[1]), ey = Math.exp(-2 * y);
    const ch = (1 + ey) / 2, sh = (1 - ey) / 2 * Math.sign(del[1] || 1);
    const cs = [Math.cos(x) * ch, -Math.sin(x) * sh], sn = [Math.sin(x) * ch, Math.cos(x) * sh];
    logS += y;
    // with N = n + ik the off-diagonal terms carry −i (Macleod's n − ik form has +i)
    const m11 = cs, m12 = div(mul([0, -1], sn), e), m21 = mul(mul([0, -1], e), sn), m22 = cs;
    const na = add(mul(a, m11), mul(b, m21)), nb = add(mul(a, m12), mul(b, m22));
    const nc = add(mul(c, m11), mul(d, m21)), nd = add(mul(c, m12), mul(d, m22));
    a = na; b = nb; c = nc; d = nd;
  }
  const B = add(a, mul(b, etas)), Cc = add(c, mul(d, etas));
  const den = add(mul(eta0, B), Cc);
  const r = div(sub(mul(eta0, B), Cc), den);
  const R = Math.min(1, abs2(r));
  let T = 4 * eta0[0] * etas[0] / abs2(den) * Math.exp(-2 * logS);
  if (!isFinite(T) || T < 0) T = 0;
  T = Math.min(1 - R, T);
  return { R, T, A: Math.max(0, 1 - R - T), r };
};
/* A thick substrate (stack.back = { d: nm, exit: material }) adds its back-side reflection
   incoherently (intensities, multiple passes, absorption in the substrate):
     R = Rf + Tf² a² Rb / (1 − Rf′ Rb a²),  T = Tf a Tb / (1 − Rf′ Rb a²),  a = e^(−α d / cos θs).
   Rf′ is the stack seen from inside the substrate; Tf is the same both ways (reciprocity). */
TF.solveThick = (stack, nm, thetaDeg, pol) => {
  const f = TF.solve(stack, nm, thetaDeg, pol), bk = stack.back;
  if (!bk || !(bk.d > 0)) return f;
  const n0 = TF.nk(stack.inc, nm).n, sk = TF.nk(stack.sub, nm), ns = sk.n, Kx = n0 * Math.sin(U.rad(thetaDeg));
  if (Kx >= ns) return f;   // totally reflected at the front: no light reaches the back
  const ths = Math.asin(Kx / ns), cs = Math.cos(ths), a = Math.exp(-4 * Math.PI * sk.k * bk.d / (nm * cs));
  const back = TF.solve({ inc: { mat: 'custom', n: ns, k: 0 }, layers: [], sub: bk.exit || { mat: 'air' } }, nm, U.deg(ths), pol);
  const rev = TF.solve({ inc: { mat: 'custom', n: ns, k: 0 }, layers: stack.layers.slice().reverse(), sub: stack.inc }, nm, U.deg(ths), pol);
  const den = 1 - rev.R * back.R * a * a;
  const R = f.R + f.T * f.T * a * a * back.R / den, T = f.T * a * back.T / den;
  return { R: Math.min(1, R), T: Math.max(0, T), A: Math.max(0, 1 - R - T), r: f.r };
};
/* polarisation 's', 'p' or 'avg' (unpolarised) */
TF.response = (stack, nm, thetaDeg, pol) => {
  if (pol !== 'avg') return TF.solveThick(stack, nm, thetaDeg, pol);
  const s = TF.solveThick(stack, nm, thetaDeg, 's'), p = TF.solveThick(stack, nm, thetaDeg, 'p');
  return { R: (s.R + p.R) / 2, T: (s.T + p.T) / 2, A: (s.A + p.A) / 2 };
};
/* Spectroscopic ellipsometry: ρ = rp / rs = tan Ψ · e^{iΔ}, in the convention of commercial
   instruments (Δ = 180° for a bare dielectric below Brewster's angle, 0° above; metals 0–180°).
   Coherent reflection from the front; the back side of a thick substrate is assumed suppressed. */
TF.ellips = (stack, nm, thetaDeg) => {
  const rs = TF.solve(stack, nm, thetaDeg, 's').r, rp = mul([-1, 0], TF.solve(stack, nm, thetaDeg, 'p').r);   // admittance rp → Fresnel rp
  const rho = div(rp, rs);
  let delta = -U.deg(Math.atan2(rho[1], rho[0]));
  delta = ((delta % 360) + 360) % 360;
  return { psi: U.deg(Math.atan(Math.hypot(rho[0], rho[1]))), delta, rho };
};

/* ---------- field inside the stack ----------
   |E|² (relative to the incident field) from a little above the stack,
   through every film, into the medium behind it. z in nm, 0 = first
   interface, positive going in the direction of the light.
   Same matrices as TF.solve, built without scaling: the field is
   sampled through each film from its back face, where it is known. */
const cosC = (x, y) => [Math.cos(x) * Math.cosh(y), -Math.sin(x) * Math.sinh(y)];
const sinC = (x, y) => [Math.sin(x) * Math.cosh(y), Math.cos(x) * Math.sinh(y)];
const expI = (x, y) => { const e = Math.exp(-y); return [Math.cos(x) * e, Math.sin(x) * e]; };   // e^{i(x + iy)}
/* [E, H] at the front of a slab from [E, H] at its back */
const slab = (q, e, t, nm, v) => {
  const x = 2 * Math.PI * q[0] * t / nm, y = 2 * Math.PI * q[1] * t / nm, cs = cosC(x, y), sn = sinC(x, y);
  return [add(mul(cs, v[0]), mul(div(mul([0, -1], sn), e), v[1])), add(mul(mul(mul([0, -1], e), sn), v[0]), mul(cs, v[1]))];
};
TF.field = (stack, nm, thetaDeg, pol, opt = {}) => {
  const n0 = TF.nk(stack.inc, nm).n, th = U.rad(thetaDeg), Kx = n0 * Math.sin(th), N0 = [n0, 0];
  const eta = (N, q) => (pol === 'p' ? div(mul(N, N), q) : q);
  const q0 = qz(N0, Kx), eta0 = eta(N0, q0);
  const sk = TF.nk(stack.sub, nm), Ns = [sk.n, sk.k], qs = qz(Ns, Kx), etas = eta(Ns, qs);
  const L = stack.layers.filter(l => l.d > 0).map(l => { const nk = TF.nk(l.m, nm), N = [nk.n, nk.k], q = qz(N, Kx); return { N, q, e: eta(N, q), d: +l.d }; });
  // back to front
  let v = [[1, 0], etas];
  const back = [];
  for (let j = L.length - 1; j >= 0; j--) { back[j] = v; v = slab(L[j].q, L[j].e, L[j].d, nm, v); }
  const B = v[0], C = v[1], r = div(sub(mul(eta0, B), C), add(mul(eta0, B), C));
  const ct = pol === 'p' ? Math.cos(th) : 1, scale = div(mul([ct, 0], add([1, 0], r)), B);
  const E2 = (w, N) => { const Et = mul(scale, w[0]); if (pol !== 'p') return abs2(Et); const H = mul(scale, w[1]), N2 = abs2(mul(N, N)); return abs2(Et) + Kx * Kx * abs2(H) / N2; };
  const total = L.reduce((a, l) => a + l.d, 0), pad = opt.pad != null ? opt.pad : Math.max(nm * 0.5, total * 0.25);
  const step = opt.step || Math.max(0.25, (total + 2 * pad) / (opt.points || 600));
  const z = [], e2 = [], layer = [];
  for (let h = pad; h > 1e-9; h -= step) { z.push(-h); e2.push(E2(slab(q0, eta0, h, nm, v), N0)); layer.push(-1); }
  let z0 = 0;
  L.forEach((l, j) => {
    const m = Math.max(2, Math.ceil(l.d / step));
    for (let i = 0; i <= m; i++) { const t = l.d * i / m; z.push(z0 + t); e2.push(E2(slab(l.q, l.e, l.d - t, nm, back[j]), l.N)); layer.push(j); }
    z0 += l.d;
  });
  for (let h = step; h <= pad + 1e-9; h += step) {
    const ph = expI(2 * Math.PI * qs[0] * h / nm, 2 * Math.PI * qs[1] * h / nm), w = [ph, mul(etas, ph)];
    z.push(z0 + h); e2.push(E2(w, Ns)); layer.push(L.length);
  }
  // absorbed fraction in each film: (2π/λ) ∫ Im(N²) |E|² dz / (n0 cos θ0)
  const absorbed = L.map((l, j) => {
    const m = Math.max(40, Math.ceil(l.d / Math.min(step, l.d / 40))), im = 2 * l.N[0] * l.N[1];
    let s = 0; for (let i = 0; i <= m; i++) { const t = l.d * i / m, w = i === 0 || i === m ? 0.5 : 1; s += w * E2(slab(l.q, l.e, l.d - t, nm, back[j]), l.N); }
    return 2 * Math.PI / nm * im * s * (l.d / m) / (n0 * Math.cos(th));
  });
  return { z, e2, layer, total, absorbed, R: abs2(r) };
};
/* ---------- wavelength × angle map ----------
   o: { lmin, lmax, amin, amax, nl, na, pol, show: 'R' | 'T' | 'A' } → { v: Float32Array (row = angle), … } */
TF.map = (stack, o) => {
  const nl = U.clamp(Math.round(o.nl) || 120, 4, 600), na = U.clamp(Math.round(o.na) || 90, 4, 400), v = new Float32Array(nl * na), q = o.show || 'R';
  for (let j = 0; j < na; j++) {
    const a = Math.min(89.9, o.amin + (o.amax - o.amin) * j / (na - 1));
    for (let i = 0; i < nl; i++) { const r = TF.response(stack, o.lmin + (o.lmax - o.lmin) * i / (nl - 1), a, o.pol || 'p'); v[j * nl + i] = r[q]; }
  }
  return { v, nl, na, lmin: o.lmin, lmax: o.lmax, amin: o.amin, amax: o.amax, show: q, pol: o.pol || 'p' };
};

/* ---------- scans ---------- */
TF.DEFAULT_CALC = { scan: 'wl', lmin: 400, lmax: 900, angle: 0, amin: 0, amax: 89, lambda: 633, pol: 'avg', show: 'RTA', points: 301, unit: 'nm' };
/* returns { x, series: { R, T, A }, xlabel, warn } */
TF.scan = (stack, calc) => {
  const c = Object.assign({}, TF.DEFAULT_CALC, calc || {}), N = U.clamp(Math.round(c.points) || 301, 11, 2001);
  const x = [], R = [], T = [], A = [], P = [], Dl = [];
  const wl = c.scan === 'wl', ell = /[PD]/.test(c.show || '');
  const lo = wl ? +c.lmin : +c.amin, hi = wl ? +c.lmax : +c.amax;
  for (let i = 0; i < N; i++) {
    const v = lo + (hi - lo) * i / (N - 1), lam = wl ? v : +c.lambda, th = wl ? +c.angle || 0 : Math.min(89.99, v);
    x.push(wl && c.unit === 'um' ? v / 1000 : v);
    if (ell) { const e = TF.ellips(stack, lam, th); P.push(e.psi); Dl.push(e.delta); continue; }
    const res = TF.response(stack, lam, th, c.pol);
    R.push(res.R); T.push(res.T); A.push(res.A);
  }
  // wavelengths outside a material's measured range
  const mats = [stack.inc, stack.sub].concat(stack.layers.map(l => l.m));
  const lam = wl ? [lo, hi] : [+c.lambda, +c.lambda];
  const warn = [...new Set(mats.filter(m => { const r = TF.range(m); return r && (lam[0] < r[0] * 0.995 || lam[1] > r[1] * 1.005); }).map(m => `${TF.name(m.mat)} (data ${U.fmt(TF.range(m)[0], 0)}–${U.fmt(TF.range(m)[1], 0)} nm)`))];
  const xlabel = wl ? (c.unit === 'um' ? 'Wavelength (µm)' : 'Wavelength (nm)') : 'Angle of incidence (°)';
  return { x, series: ell ? { P, D: Dl } : { R, T, A }, xlabel, warn, calc: c, ellips: ell };
};
/* deepest minimum of R (SPR dip) or highest maximum of A, refined by a parabola */
TF.extremum = (x, y, kind = 'min') => {
  if (!x.length) return null;
  let j = 0;
  for (let i = 1; i < y.length; i++) if (kind === 'min' ? y[i] < y[j] : y[i] > y[j]) j = i;
  if (j === 0 || j === y.length - 1) return { x: x[j], y: y[j], edge: true };
  const y0 = y[j - 1], y1 = y[j], y2 = y[j + 1], den = y0 - 2 * y1 + y2;
  const t = den ? 0.5 * (y0 - y2) / den : 0, dx = x[j + 1] - x[j];
  return { x: x[j] + t * dx, y: y1 - 0.25 * (y0 - y2) * t, edge: false };
};
/* full width at half depth of a dip (or half height of a peak) */
TF.width = (x, y, kind = 'min') => {
  const e = TF.extremum(x, y, kind);
  if (!e || e.edge) return null;
  const base = kind === 'min' ? Math.max(y[0], y[y.length - 1]) : Math.min(y[0], y[y.length - 1]);
  const half = (base + e.y) / 2, j = x.indexOf(x.reduce((p, v) => Math.abs(v - e.x) < Math.abs(p - e.x) ? v : p));
  const cross = (dir) => { for (let i = j; i > 0 && i < x.length - 1; i += dir) { const a = y[i] - half, b = y[i + dir] - half; if (a * b <= 0) return x[i] + (x[i + dir] - x[i]) * a / (a - b); } return null; };
  const l = cross(-1), r = cross(1);
  return l != null && r != null ? Math.abs(r - l) : null;
};

/* text summary of the curve for the inspector and captions */
TF.summary = res => {
  const c = res.calc, unit = c.scan === 'wl' ? (c.unit === 'um' ? ' µm' : ' nm') : '°', dig = c.scan === 'wl' ? (c.unit === 'um' ? 3 : 1) : 2;
  const out = [];
  if (c.show.includes('R')) { const e = TF.extremum(res.x, res.series.R, 'min'); if (e && !e.edge) { const w = TF.width(res.x, res.series.R, 'min'); out.push(`R minimum ${U.fmt(e.y * 100, 1)} % at ${U.fmt(e.x, dig)}${unit}` + (w ? ` (FWHM ${U.fmt(w, dig)}${unit})` : '')); } }
  if (c.show.includes('A')) { const e = TF.extremum(res.x, res.series.A, 'max'); if (e && !e.edge) out.push(`A maximum ${U.fmt(e.y * 100, 1)} % at ${U.fmt(e.x, dig)}${unit}`); }
  return out;
};

/* cache: the plot panel recomputes while you edit or animate, so
   identical requests are served from memory */
const cache = new Map();
TF.cached = (stack, calc) => {
  const key = JSON.stringify([stack, calc]);
  if (cache.has(key)) return cache.get(key);
  const res = TF.scan(stack, calc);
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(key, res);
  return res;
};
})();
