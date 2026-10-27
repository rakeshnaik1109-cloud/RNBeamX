/* Ray bundles, real glass lenses, and the active / fibre parts (OPO, AOM, circulator, WDM, spatial filter) */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · ray bundles, real lenses and active parts');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const out = {};
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const run = objs => { const d = RNBX.newDocument(); d.objects = objs; return RNBX.trace(d); };
    // axis crossings of the rays leaving a lens at x0 (beyond its last surface)
    const crossings = (t, xMin, y0) => t.segments.filter(s => s.ray && s.kind === 'beam' && s.a[0] > xMin && Math.abs(s.b[1] - s.a[1]) > 1e-9)
      .map(s => ({ lam: s.lambda, h: Math.abs(s.a[1] - y0), x: s.a[0] + (y0 - s.a[1]) / (s.b[1] - s.a[1]) * (s.b[0] - s.a[0]) }));
    const lensRight = (lens, doc) => { const g = RNBX.lib.lensReal(lens.props, doc); return g ? lens.x + Math.min(g[g.length - 1].x, g[g.length - 1].xe) - 1e-6 : lens.x - 1e-6; };
    const bundle = (lensProps, src) => {
      const lens = mk('lens', 40, 50, 0, Object.assign({ f: 250, d: 12 }, lensProps)), d = RNBX.newDocument();
      d.objects = [mk('raysource', 20, 50, 0, Object.assign({ mode: 'parallel', h: 10, rays: 11 }, src || {})), lens];
      return crossings(RNBX.trace(d), lensRight(lens, d), 50);
    };
    const par = (cs, lam) => cs.filter(c => (!lam || c.lam === lam)).sort((a, b) => a.h - b.h)[0];
    // paraxial focus: thin vs real (small bundle)
    out.thinF = par(bundle({}, { h: 0.2 })).x;
    out.realF = par(bundle({ model: 'real' }, { h: 0.2 })).x;
    // spherical aberration: edge rays of a real singlet cross before the paraxial ones
    { const cs = bundle({ model: 'real' }).filter(c => c.lam === 587.56).sort((a, b) => a.h - b.h); out.sa = [cs[0].x, cs[cs.length - 1].x]; }
    // longitudinal colour: singlet ≈ f/V, doublet much less
    const lca = shape => { const cs = bundle({ model: 'real', shape }, { h: 0.2, colors: 'fdc' }); return par(cs, 656.27).x - par(cs, 486.13).x; };
    out.lcaSinglet = lca('biconvex'); out.lcaDoublet = lca('doublet');
    // ball lens: effective focal length n·D / (4(n − 1)) from its centre
    { const n = RNBX.optics.index('N-BK7', 587.56), r = 2; const cs = bundle({ shape: 'ball', d: 2 * r, model: 'real' }, { h: 0.1 }); out.ball = [par(cs).x - 40, n * 2 * r / (4 * (n - 1))]; }
    // an object at 2f is imaged at 2f, inverted and the same size; the screen reports the spot
    { const scr = mk('screen', 100, 50, 0, { d: 16 }); const t = run([mk('raysource', 20, 50, 0, { mode: 'arrow', h: 4, rays: 7, fan: 8 }), mk('lens', 60, 50, 0, { f: 200, d: 14 }), scr]);
      const rs = t.hits[scr.id].rays, tip = rs.filter(q => q.y > 1), m = tip.reduce((a, q) => a + q.y, 0) / tip.length;
      out.image = [m, Math.max(...tip.map(q => Math.abs(q.y - m))), rs.length]; }
    // OPO: idler from photon energy, powers shared by photon energy
    { const D = mk('pd', 90, 50, 0, {}); const t = run([mk('laser', 20, 50, 0, { lambda: 532, power: 10 }), mk('opo', 50, 50, 0, { signal: 1550, eff: 0.4 }), D]);
      const L = t.hits[D.id].lambdas, ks = Object.keys(L).map(Number); out.opo = { idler: ks.find(k => k > 700 && k < 900), Ps: L[1550], Pi: L[ks.find(k => k > 700 && k < 900)], Pp: L[532] }; }
    // AOM at 80 MHz in TeO2: θ = λf / v
    { const t = run([mk('laser', 20, 50, 0, { lambda: 633 }), mk('aom', 50, 50, 0, { drive: 'rf', rf: 80, vel: 4200, eff: 0.8 })]);
      const s = t.segments.filter(q => q.a[0] > 49.9 && Math.abs(q.b[1] - q.a[1]) > 1e-6)[0]; out.aom = s ? Math.abs(Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0])) * 180 / Math.PI : null; }
    // circulator: port 1 → 2; the reflection coming back into port 2 leaves at port 3
    { const P3 = mk('pd', 60, 70, 90, {}); const t = run([mk('laser', 20, 50, 0, { lambda: 1550, power: 1 }), mk('circulator', 60, 50, 0, { T: 0.9 }), mk('mirror', 90, 50, 0, {}), P3]); out.circ = t.hits[P3.id] ? t.hits[P3.id].P : 0; }
    // WDM: 980 nm to the side port, 1550 nm straight through
    { const A = mk('pd', 90, 50, 0, {}), B = mk('pd', 60, 30, -90, {}); const t = run([mk('laser', 20, 50, 0, { lambda: 980, extra: '1550', power: 2 }), mk('fibersplit', 60, 50, 0, { mode: 'wdm', edge: 1200 }), A, B]);
      out.wdm = [Object.keys(t.hits[A.id].lambdas), Object.keys(t.hits[B.id].lambdas)]; }
    // spatial filter: on-axis light passes and is expanded; light at an angle is stopped by the pinhole
    { const S1 = mk('screen', 110, 50, 0, { d: 30 }); const t = run([mk('laser', 20, 50, 0, { beamWidth: 1 }), mk('spatialfilter', 60, 50, 0, { mag: 4 }), S1]);
      const s = t.segments.filter(q => q.a[0] > 71.5 && q.kind === 'beam')[0]; out.sfMag = s ? Math.abs(s.w0 / 0.5) : null; }
    for (const tilt of [0, 2]) { const S1 = mk('screen', 110, 50, 0, { d: 30 }); const t = run([mk('raysource', 30, 50, 0, { mode: 'parallel', h: 0.6, rays: 3, tilt }), mk('spatialfilter', 60, 50, 0, { mag: 4 }), S1]); out['sf' + tilt] = t.hits[S1.id] ? t.hits[S1.id].rays.length : 0; }
    // supercontinuum fibre: broadband output
    { const D = mk('screen', 90, 50, 0, {}); const t = run([mk('laser', 20, 50, 0, { lambda: 1064 }), mk('scfiber', 50, 50, 0, { count: 8 }), D]); out.sc = Object.keys(t.hits[D.id].lambdas).length; }
    return out;
  });
  const fd = 25;
  H.near('real lens: paraxial focus matches the ideal lens (within the lens thickness)', r.realF - r.thinF, 0, 1.2);
  H.check('real singlet: edge rays focus short of the paraxial focus (spherical aberration)', r.sa[1] < r.sa[0] - 0.3, r.sa.map(v => v.toFixed(2)));
  H.near('real N-BK7 singlet: red focuses f/V beyond blue (drawn mm)', r.lcaSinglet, fd / 64.17, fd / 64.17 * 0.15);
  H.check('achromatic doublet: colour focus shift under 10 % of the singlet', Math.abs(r.lcaDoublet) < 0.1 * r.lcaSinglet, [r.lcaDoublet.toFixed(4), r.lcaSinglet.toFixed(4)]);
  H.near('ball lens: focal length n·D / 4(n − 1) from the centre', r.ball[0], r.ball[1], r.ball[1] * 0.02);
  H.near('object at 2f: image inverted, same size (tip lands at +h)', r.image[0], 4, 0.05);
  H.check('object at 2f: all tip rays meet in one image point', r.image[1] < 0.02, r.image[1]);
  H.near('OPO: idler wavelength from 1/λp = 1/λs + 1/λi (nm)', r.opo.idler, 1 / (1 / 532 - 1 / 1550), 0.1);
  H.check('OPO: signal and idler share power in proportion to photon energy', Math.abs(r.opo.Ps + r.opo.Pi - 4) < 1e-6 && Math.abs(r.opo.Ps / r.opo.Pi - r.opo.idler / 1550) < 1e-6, r.opo);
  H.near('AOM driven at 80 MHz in TeO₂ deflects by λf/v (°)', r.aom, 633e-9 * 80e6 / 4200 * 180 / Math.PI, 0.002);
  H.near('circulator: the reflection from port 2 leaves at port 3', r.circ, 0.81, 1e-6);
  H.check('WDM: 1550 nm straight through, 980 nm to the side port', r.wdm[0].join() === '1550' && r.wdm[1].join() === '980', r.wdm);
  H.near('spatial filter: beam expanded by the set factor', r.sfMag, 4, 0.05);
  H.check('spatial filter: on-axis rays pass, rays at 2° are stopped by the pinhole', r.sf0 === 3 && r.sf2 === 0, [r.sf0, r.sf2]);
  H.check('supercontinuum fibre: broadband output plus the residual pump', r.sc === 9, r.sc);
  // the spot readout appears for a detector hit by rays
  await page.evaluate(() => { RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'aberration').build()); RNBX.canvas.fit(); });
  await page.waitForTimeout(300);
  const spot = await page.evaluate(() => {
    const scr = RNBX.state.doc.objects.find(o => o.type === 'screen'); RNBX.select([scr.id]); RNBX.inspector.build();
    return document.querySelector('#inspector .readout') ? document.querySelector('#inspector .readout').textContent : '';
  });
  H.check('screen hit by a ray bundle shows the RMS ray spot per colour', /Ray spot/.test(spot) && /486\.1 nm/.test(spot), spot.slice(0, 120));
  for (const id of ['aberration', 'fourf']) {
    await page.evaluate(i => { RNBX.setDocument(RNBX.templates.list.find(t => t.id === i).build()); RNBX.canvas.fit(); }, id);
    await page.waitForTimeout(250); await H.shot(page, 'imaging-' + id, '#stage');
  }
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
