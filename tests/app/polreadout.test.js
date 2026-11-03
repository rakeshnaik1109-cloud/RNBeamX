/* Optical bench: the polarisation state (Stokes, degree of polarisation) at a detector */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · polarisation readout at detectors');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const O = RNBX.optics, out = {};
    const st = (pols, unpolP = 0) => { const h = { pfields: {}, unpol: unpolP }; pols.forEach((E, i) => { h.pfields['k' + i] = E; }); return O.stokes(h); };
    const C = RNBX.util.C || null;
    const J = id => O.jones(id);
    out.H = st([J('H')]).s; out.V = st([J('V')]).s; out.D = st([J('D')]).s; out.R = st([J('R')]).s; out.L = st([J('L')]).s;
    out.lin30 = st([O.jones('lin', 30)]).azimuth;
    out.half = st([J('H')], 1).dop;
    out.txt = [O.describePol(st([J('R')])), O.describePol(st([O.jones('lin', 30)])), O.describePol(st([J('H')], 1))];
    // through the tracer: a laser, a quarter-wave plate at 45° and a detector → circular light
    const d = RNBX.newDocument();
    const L = RNBX.createObject('laser', 30, 50); L.props.pol = 'H';
    const Q = RNBX.createObject('qwp', 70, 50); Q.props.angle = 45;
    const P = RNBX.createObject('pd', 110, 50); P.rot = 180;
    d.objects.push(L, Q, P); RNBX.setDocument(RNBX.normalizeDocument(d));
    const tr = RNBX.trace(RNBX.state.doc), h = tr.hits[P.id];
    out.bench = h ? O.stokes(h) : null;
    out.props = { laser: Object.keys(L.props), qwp: Object.keys(Q.props) };
    return out;
  });
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
  H.check('Stokes of H, V, D: (1,0,0), (−1,0,0), (0,1,0)', near(r.H, [1, 0, 0]) && near(r.V, [-1, 0, 0]) && near(r.D, [0, 1, 0]), [r.H, r.V, r.D]);
  H.check('right / left circular: S₃ = +1 / −1', near(r.R, [0, 0, 1]) && near(r.L, [0, 0, -1]), [r.R, r.L]);
  H.near('linear at 30°: azimuth 30°', r.lin30, 30, 1e-9);
  H.near('equal polarised and unpolarised power: degree of polarisation 50 %', r.half, 0.5, 1e-12);
  H.check('described in words', /right circular/.test(r.txt[0]) && /linear at 30.0°/.test(r.txt[1]) && /partially polarised \(50 %\)/.test(r.txt[2]), r.txt);
  H.check('traced: horizontal laser through a quarter-wave plate at 45° arrives circular', r.bench && Math.abs(Math.abs(r.bench.s[2]) - 1) < 1e-6 && r.bench.dop > 0.999, { bench: r.bench, props: r.props });
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
