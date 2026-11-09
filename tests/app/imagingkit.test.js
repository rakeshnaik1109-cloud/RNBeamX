/* Imaging toolkit: glass catalogue, image finder, magnification, ray-fan plot */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · imaging toolkit');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const out = {}, O = RNBX.optics;
    out.nd = ['N-SF6', 'N-BAF10', 'N-LASF9', 'N-K5', 'N-SF57'].map(k => [k, O.index(k, 587.56)]);
    const lensAt = (x, props) => mk('lens', x, 50, 0, Object.assign({ f: 100, model: 'thin', d: 14 }, props || {}));
    // 1. object at 2f (200 mm = 20 drawn mm at scale 10): real, inverted image at 2f behind, m = −1
    { const d = RNBX.newDocument(); d.style.scale = 10; const src = mk('raysource', 30, 50, 0, { mode: 'arrow', h: 2, fan: 12, rays: 9 });
      d.objects = [src, lensAt(50)]; const t = RNBX.trace(d), a = RNBX.imaging.analyse(d, t, src);
      const base = a.groups.find(g => g.fan === 'base'); out.two = { x: base && base.focus.p[0], y: base && base.focus.p[1], real: base && base.focus.real, m: a.mags[0] && a.mags[0].m, html: RNBX.imaging.summaryHtml(d, t, src) }; }
    // 2. object inside f (50 mm): virtual, upright image at −100 mm, m = +2
    { const d = RNBX.newDocument(); d.style.scale = 10; const src = mk('raysource', 45, 50, 0, { mode: 'arrow', h: 1, fan: 10, rays: 9 });
      d.objects = [src, lensAt(50)]; const t = RNBX.trace(d), a = RNBX.imaging.analyse(d, t, src);
      const base = a.groups.find(g => g.fan === 'base'); out.virt = { x: base && base.focus.p[0], real: base && base.focus.real, m: a.mags[0] && a.mags[0].m }; }
    // 3. a real N-BK7 biconvex lens, parallel F/d/C bundle: spherical aberration and focus shift between colours; screen at the image
    { const d = RNBX.newDocument(); d.style.scale = 10; const src = mk('raysource', 20, 50, 0, { mode: 'parallel', h: 9, rays: 11, colors: 'fdc' });
      const L = lensAt(40, { model: 'real', shape: 'biconvex', mat: 'N-BK7', d: 12 });
      d.objects = [src, L]; let t = RNBX.trace(d); const a = RNBX.imaging.analyse(d, t, src);
      const scr = RNBX.imaging.placeScreen(d, t, src); d.objects.push(scr); t = RNBX.trace(d);
      const h = t.hits[scr.id], rd = (h && h.rays || []).filter(q => Math.abs(q.lambda - 587.56) < 0.1).sort((p, q) => p.u - q.u);
      // non-linearity of y(u): residual after removing a straight line, relative to the spread
      const n = rd.length, mu = rd.reduce((s, q) => s + q.u, 0) / n, my = rd.reduce((s, q) => s + q.y, 0) / n, b = rd.reduce((s, q) => s + (q.u - mu) * (q.y - my), 0) / rd.reduce((s, q) => s + (q.u - mu) ** 2, 0) || 0;
      const res = Math.sqrt(rd.reduce((s, q) => s + (q.y - my - b * (q.u - mu)) ** 2, 0) / n);
      out.real = { colour: a.colour * 10, through: a.groups.map(g => g.through), screenHit: n, res, svg: RNBX.imaging.fanPlot(h ? h.rays : [], 10).length, at: scr.x, efl: (100) };
      // paraxial EFL of the same lens (inspector's calculation) for comparison
      out.real.marker = (() => { src.props.markImage = true; return (RNBX.render.build(d, {}).svg.match(/stroke-dasharray="0.5 0.4"|<line x1="[\d.]+" y1="[\d.]+" x2="[\d.]+" y2="[\d.]+"\/><line/g) || []).length; })();
    }
    return out;
  });
  H.check('new glasses reproduce their catalogue n_d (N-SF6 1.80518, N-BAF10 1.67003, N-LASF9 1.85025, N-K5 1.52249, N-SF57 1.84666)', r.nd.every((q, i) => Math.abs(q[1] - [1.80518, 1.67003, 1.85025, 1.52249, 1.84666][i]) < 2e-5), r.nd);
  H.check('object at 2f: real image at 2f behind the lens, magnification −1', Math.abs(r.two.x - 70) < 0.05 && Math.abs(r.two.y - 50) < 0.05 && r.two.real && Math.abs(r.two.m + 1) < 0.01 && /real/.test(r.two.html), r.two);
  H.check('object inside the focal length: virtual, upright image, magnification +2', Math.abs(r.virt.x - 40) < 0.05 && r.virt.real === false && Math.abs(r.virt.m - 2) < 0.02, r.virt);
  H.check('real N-BK7 lens: blue and red focus apart; a screen placed at the image catches every ray', r.real.colour > 0.5 && r.real.screenHit === 11, r.real);
  H.check('the ray fan of a real spherical lens is not a straight line (spherical aberration) and is plotted', r.real.res > 1e-4 && r.real.svg > 200, r.real);
  H.check('"Mark the image" draws a cross at each focus', r.real.marker >= 3, r.real);
  await page.close();
};
