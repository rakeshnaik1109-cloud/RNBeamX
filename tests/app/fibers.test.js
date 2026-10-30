/* Fibre types (look and physics) and fibres fading in with their ends during a build-up */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · fibre types and build-up');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const T = RNBX.templates.helpers, out = {};
    const run = ft => {
      const d = T.base('nature-15', 120, 40, ''), las = T.mk('laser', 14, 12, 0, { lambda: 633, pol: 'H', power: 10 }), c1 = T.mk('coupler', 34, 12, 180, {}), c2 = T.mk('coupler', 62, 20, 0, {}), pol = T.mk('polarizer', 82, 20, 0, { angle: 0 }), pd = T.mk('pd', 106, 20, 0, {});
      const f = T.link('fiber', c1, c2, { fiberType: ft, eff: 0.8 }); d.objects.push(las, c1, c2, f, pol, pd);
      const t = RNBX.trace(d), seg = t.segments.find(s => Math.abs(s.a[0] - c2.x) < 6 && s.b[0] > c2.x + 5);
      return { P: +(t.hits[pd.id] ? t.hits[pd.id].P : 0).toFixed(3), M2: seg ? seg.M2 || 1 : null, w: seg ? seg.w0 : null, svg: RNBX.render.build(d).svg };
    };
    Object.keys(RNBX.lib.FIBER_TYPES).forEach(k => { out[k] = run(k); });
    // build-up: the fibre is invisible until its ends appear, in 2D and in 3D
    const tpl = RNBX.templates.list.find(t => t.build().objects.some(o => o.type === 'fiber'));
    RNBX.setDocument(RNBX.normalizeDocument(tpl.build()));
    const P = RNBX.animPresets; P.apply(P.list.find(q => q.id === 'build'), null, { grow: 4, dur: 6 });
    const doc = RNBX.state.doc, fib = doc.objects.find(o => o.type === 'fiber').id, has = (t, m) => { doc.style.mode = m; return RNBX.render.build(doc, { time: t, interactive: true }).svg.includes('data-id="' + fib + '"'); };
    out.build = [has(0, 'schematic'), has(6, 'schematic'), has(0, '3d'), has(6, '3d')];
    return Object.assign({}, out, { svgs: Object.keys(RNBX.lib.FIBER_TYPES).map(k => out[k].svg) });
  });
  H.check('nine fibre types', Object.keys(r).filter(k => !['build', 'svgs'].includes(k)).length === 9);
  H.check('PM fibre keeps the polarisation (8 mW through a polariser); SMF and multimode scramble it (4 mW)', r.pm.P === 8 && r.smf.P === 4 && r.mmf.P === 4, [r.pm.P, r.smf.P, r.mmf.P]);
  H.check('multimode output: larger beam and worse beam quality than single-mode', r.mmf.M2 > 5 && r.mmf.w > r.smf.w && r.smf.M2 === 1, { smf: [r.smf.M2, r.smf.w], mmf: [r.mmf.M2, r.mmf.w] });
  H.check('fibre types look different (jacket, thickness, pattern) and render cleanly', new Set(r.svgs).size === 9 && r.svgs.every(s => !/NaN|undefined/.test(s)));
  H.check('build-up: the fibre appears with its ends (hidden at the start, shown at the end, 2D and 3D)', r.build.join() === 'false,true,false,true', r.build);
  // fibre Raman probe: laser through band-pass, dichroic and nose; Raman back via fold mirror and long-pass into the spectrometer
  const rp = await page.evaluate(() => {
    const build = mod => { const d = RNBX.normalizeDocument(RNBX.templates.list.find(t => t.id === 'ramanprobe').build()); if (mod) mod(d); return d; };
    const run = d => { const t = RNBX.trace(d), get = ty => { const o = d.objects.find(q => q.type === ty); return t.hits[o.id] || { P: 0, lambdas: {} }; }; return { chip: get('sample'), spec: get('spectrometer') }; };
    const a = run(build());
    const wrongLaser = run(build(d => { d.objects.find(o => o.type === 'benchlaser').props.lambda = 633; }));
    const noLP = build(); const pr = noLP.objects.find(o => o.type === 'module');
    const fibs = noLP.objects.filter(o => o.type === 'fiber').map(f => RNBX.lib.get('fiber').geometry(f, noLP));
    const ends = fibs.map(g => g.b ? [g.a, g.b] : null);
    return { chip: +a.chip.P.toFixed(3), chipL: Object.keys(a.chip.lambdas), spec: +a.spec.P.toFixed(3), specL: Object.keys(a.spec.lambdas), wrong: +wrongLaser.chip.P.toFixed(3),
      portsApart: ends[0] && ends[1] && Math.hypot(ends[0][1][0] - ends[1][0][0], ends[0][1][1] - ends[1][0][1]) > 3 };
  });
  H.near('Raman probe: 50 mW × fibre 0.8 × band-pass 0.95 = 38 mW of 785 nm on the SERS chip', rp.chip, 38, 1e-3);
  H.check('Raman probe: only the 830 nm Raman light reaches the spectrometer (dichroic reflects it, fold mirror, long-pass, collection fibre)', rp.spec > 1 && rp.specL.join() === '830', rp);
  H.check('Raman probe: the band-pass blocks a laser that is not on the design line', rp.wrong === 0, rp.wrong);
  H.check('Raman probe: laser-in and signal-out fibres attach at two separate ports', rp.portsApart, rp);
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
