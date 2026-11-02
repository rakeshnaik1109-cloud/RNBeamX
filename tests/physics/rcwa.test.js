/* Grating solver (RCWA) against independent physics */
'use strict';
module.exports = async ({ H }) => {
  H.suite('physics · gratings (RCWA)');
  const RNBX = H.loadEngine(), TF = RNBX.thinfilm, solve = RNBX.rcwa.core.solve;
  const eps = (n, k = 0) => [n * n - k * k, -2 * n * k];
  // 1. no grating: identical to the transfer-matrix method
  const ag = TF.nk({ mat: 'Ag' }, 600), ti = TF.nk({ mat: 'TiO2' }, 600);
  const pb = { period: 500, orders: 5, inc: 0, sub: 1, eps: [eps(1), eps(1.5), eps(ag.n, ag.k), eps(ti.n, ti.k)], slices: [{ d: 30, runs: [{ a: 0, b: 1, m: 2 }] }, { d: 80, runs: [{ a: 0, b: 1, m: 3 }] }] };
  const st = { inc: { mat: 'air' }, layers: [{ m: { mat: 'Ag' }, d: 30 }, { m: { mat: 'TiO2' }, d: 80 }], sub: { mat: 'custom', n: 1.5, k: 0 } };
  for (const th of [0, 40]) for (const pol of ['s', 'p']) { const a = solve(pb, 600, th, pol), b = TF.solve(st, 600, th, pol); H.near(`flat layers = transfer matrix (R, ${pol}, ${th}°)`, a.R, b.R, 1e-9); H.near(`flat layers = transfer matrix (T, ${pol}, ${th}°)`, a.T, b.T, 1e-9); }
  // 2. lossless grating: energy conservation with several orders
  const g = { period: 900, orders: 12, inc: 0, sub: 1, eps: [eps(1), eps(1.5), eps(2.2)], slices: [{ d: 250, runs: [{ a: 0, b: 0.4, m: 2 }, { a: 0.4, b: 1, m: 0 }] }] };
  for (const pol of ['s', 'p']) { const r = solve(g, 633, 20, pol); H.near(`lossless grating: R + T = 1 (${pol})`, r.R + r.T, 1, 1e-8); H.check(`several diffraction orders propagate (${pol})`, r.Tn.length >= 3, r.Tn.map(o => o.m).join(',')); }
  // 3. effective-medium limit
  const f = 0.5, nTE = Math.sqrt(f * 4 + (1 - f)), nTM = Math.sqrt(1 / (f / 4 + (1 - f)));
  const emt = { period: 30, orders: 15, inc: 0, sub: 1, eps: [eps(1), eps(1.5), eps(2)], slices: [{ d: 300, runs: [{ a: 0, b: f, m: 2 }, { a: f, b: 1, m: 0 }] }] };
  const flat = n => TF.solve({ inc: { mat: 'air' }, layers: [{ m: { mat: 'custom', n, k: 0 }, d: 300 }], sub: { mat: 'custom', n: 1.5, k: 0 } }, 1500, 0, 's').R;
  H.near('sub-wavelength grating = effective medium (TE)', solve(emt, 1500, 0, 's').R, flat(nTE), 2e-3);
  H.near('sub-wavelength grating = effective medium (TM, inverse rule)', solve(emt, 1500, 0, 'p').R, flat(nTM), 2e-3);
  // 4. symmetry
  const sy = { period: 700, orders: 10, inc: 0, sub: 1, eps: [eps(1), eps(1.5), eps(ag.n, ag.k)], slices: [{ d: 60, runs: [{ a: 0, b: 0.25, m: 0 }, { a: 0.25, b: 0.75, m: 2 }, { a: 0.75, b: 1, m: 0 }] }] };
  H.near('symmetric grating: R(+15°) = R(−15°)', solve(sy, 650, 15, 'p').R, solve(sy, 650, -15, 'p').R, 1e-8);
  H.near('lossless metal-like grating conserves energy', (() => { const r = solve(Object.assign({}, sy, { eps: [eps(1), eps(1.5), [-50, 0]] }), 650, 0, 'p'); return r.R + r.T; })(), 1, 1e-8);
  // 5. surface plasmon on a shallow sinusoidal silver grating
  const Lam = 600, amp = 25, NS = 12, slices = [];
  for (let s = 0; s < NS; s++) { const z = amp * (1 - (s + 0.5) / NS), runs = []; let cur = null; for (let i = 0; i < 400; i++) { const x = (i + 0.5) / 400, m = amp * (0.5 - 0.5 * Math.cos(2 * Math.PI * x)) >= z ? 2 : 0; if (!cur || cur.m !== m) { cur = { a: i / 400, b: (i + 1) / 400, m }; runs.push(cur); } else cur.b = (i + 1) / 400; } slices.push({ d: amp / NS, runs }); }
  const spp = { period: Lam, orders: 15, inc: 0, sub: 2, slices };
  let best = { A: 0 };
  for (let lam = 590; lam <= 650; lam += 1) { const a = TF.nk({ mat: 'Ag' }, lam); spp.eps = [eps(1), eps(1.5), eps(a.n, a.k)]; const r = solve(spp, lam, 0, 'p'); if (r.A > best.A) best = { A: r.A, lam }; }
  const a = TF.nk({ mat: 'Ag' }, best.lam), e = eps(a.n, a.k), d = (e[0] + 1) ** 2 + e[1] ** 2, qr = (e[0] * (e[0] + 1) + e[1] * e[1]) / d, qi = (e[1] * (e[0] + 1) - e[0] * e[1]) / d;
  const predicted = Lam * Math.sqrt((Math.hypot(qr, qi) + qr) / 2);
  H.near('surface-plasmon absorption at the grating-equation wavelength (nm)', best.lam, predicted, 4);
  H.check('the plasmon absorbs strongly in TM', best.A > 0.5, best.A.toFixed(3));
  spp.eps = [eps(1), eps(1.5), eps(a.n, a.k)];
  H.check('and not in TE', solve(spp, best.lam, 0, 's').A < 0.05);

  // unit cells from Layer Studio ▸ Pattern
  const RC = RNBX.rcwa, TFm = RNBX.thinfilm;
  const at = (pat, lam, th, pol, o) => RC.core.solve(RC.problemAt(RC.fromPattern(pat, o), lam), lam, th, pol);
  const full = { period: 400, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, layers: [{ mat: 'air', nm: 120, shapes: [{ kind: 'trap', x: 200, wb: 400, wt: 400, mat: 'TiO2' }] }] };
  H.near('a shape filling the whole period is a flat film (RCWA = transfer matrix)', at(full, 600, 20, 'p').R, TFm.solve({ inc: { mat: 'air' }, layers: [{ m: { mat: 'TiO2' }, d: 120 }], sub: { mat: 'glass:N-BK7' } }, 600, 20, 'p').R, 1e-9);
  const wrap = { period: 400, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, layers: [{ mat: 'air', nm: 150, shapes: [{ kind: 'trap', x: 0, wb: 200, mat: 'TiO2' }] }] }, cen = { period: 400, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, layers: [{ mat: 'air', nm: 150, shapes: [{ kind: 'trap', x: 200, wb: 200, mat: 'TiO2' }] }] };
  H.near('a ridge across the cell edge wraps round (same R as a centred ridge)', at(wrap, 650, 0, 's').R, at(cen, 650, 0, 's').R, 1e-9);
  const gmr = { period: 380, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, layers: [{ mat: 'air', nm: 60, shapes: [{ kind: 'trap', x: 190, wb: 190, mat: 'TiO2' }] }, { mat: 'TiO2', nm: 100, shapes: [] }] };
  const g1 = at(gmr, 640, 10, 'p');
  H.near('lossless unit cell conserves energy (R + T = 1)', g1.R + g1.T, 1, 1e-6);
  let peak = 0; for (let l = 700; l <= 725; l += 0.5) peak = Math.max(peak, at(gmr, l, 0, 's').R);
  H.check('guided-mode resonance filter reflects almost all light at its resonance', peak > 0.98, peak.toFixed(4));
  const wg = { period: 140, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, orders: 20, layers: [{ mat: 'air', nm: 150, shapes: [{ kind: 'trap', x: 70, wb: 70, mat: 'Al' }] }] };
  H.check('wire-grid polariser: TM passes, TE is blocked', at(wg, 600, 0, 'p').T > 0.7 && at(wg, 600, 0, 's').T < 0.01, { TM: at(wg, 600, 0, 'p').T, TE: at(wg, 600, 0, 's').T });
  const sl = { period: 400, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, layers: [{ mat: 'air', nm: 300, shapes: [{ kind: 'trap', x: 150, wb: 200, wt: 200, shift: 150, mat: 'TiO2' }] }] };
  const so = at(sl, 550, 0, "s"), top1 = so.Tn.reduce((a, b) => (b.eff > a.eff ? b : a));
  H.check('slanted grating sends most light into one first order', Math.abs(top1.m) === 1 && top1.eff > 0.7, so.Tn);
  const gap = { period: 400, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, orders: 20, layers: [{ mat: 'air', nm: 30, shapes: [{ kind: 'trap', x: 200, wb: 150, mat: 'Au' }] }, { mat: 'SiO2', nm: 10, shapes: [] }, { mat: 'Au', nm: 100, shapes: [] }] };
  let gmin = 1, glam = 0; for (let l = 1240; l <= 1300; l += 2) { const r = at(gap, l, 0, "p").R; if (r < gmin) { gmin = r; glam = l; } }
  H.check('gap-plasmon absorber (Au strips / 10 nm SiO₂ / Au): near-perfect TM absorption', gmin < 0.03 && at(gap, glam, 0, 's').R > 0.9, { R: gmin, lam: glam });
  const sine = { period: 600, ambient: 'air', substrate: { mat: 'glass:N-BK7' }, slices: 16, layers: [{ mat: 'air', nm: 60, shapes: [{ kind: 'sine', x: 300, mat: 'Au' }] }, { mat: 'Au', nm: 150, shapes: [] }] };
  H.check('sinusoidal and sawtooth profiles are sliced into steps', RC.fromPattern(sine).slices.length >= 10 && RC.fromPattern({ period: 833, layers: [{ mat: 'air', nm: 300, shapes: [{ kind: 'saw', x: 0, dir: 1, mat: 'Al' }] }], substrate: { mat: 'Al' } }, { slices: 12 }).slices.length === 12);
  H.near('grating equation: first order at 30° for λ = Λ/2', RC.orderAngle(1, 0, -1, 500, 1000, 1), 30, 1e-9);
};
