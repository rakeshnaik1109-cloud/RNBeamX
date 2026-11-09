/* "Show what it records": detector images computed from the traced beams */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · detector images: spots, beam size, fringes from the traced beams');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const SN = RNBX.sensor, out = {}, doc = RNBX.newDocument();
    const lam = 633, a = 0.5 * Math.PI / 180, E = [{ re: 1, im: 0 }, { re: 0, im: 0 }], Es = [{ re: 0, im: 0 }, { re: 1, im: 0 }];
    const beam = (ang, extra) => Object.assign({ o: [50, 50], d: [Math.cos(ang), Math.sin(ang)], P: 1, lambda: lam, src: 's1', ph: 0, E, w: 1 }, extra || {});
    // 1. two beams crossing at ±0.5°: fringe period λ / (2 sin 0.5°) = 36.3 µm
    { const B = SN.beams({ img: [beam(a), beam(-a)] }, doc), im = SN.image(B, 0.3);
      // brightest-to-darkest contrast along the centre row
      const N = Math.round(Math.sqrt(im.I.length)), row = Array.from(im.I.slice((N >> 1) * N, (N >> 1) * N + N));
      out.fr = { period: im.period, expect: lam * 1e-6 / (2 * Math.sin(a)), vis: (Math.max(...row) - Math.min(...row)) / (Math.max(...row) + Math.min(...row)) }; }
    // 2. orthogonal polarisations, or two different sources: no fringes
    { const im1 = SN.image(SN.beams({ img: [beam(a), beam(-a, { E: Es })] }, doc), 0.3), im2 = SN.image(SN.beams({ img: [beam(a), beam(-a, { src: 's2' })] }, doc), 0.3);
      const flat = im => { const N = Math.round(Math.sqrt(im.I.length)), row = Array.from(im.I.slice((N >> 1) * N + 40, (N >> 1) * N + 56)); return (Math.max(...row) - Math.min(...row)) / Math.max(...row); };
      out.inc = { p1: im1.period, p2: im2.period, f1: flat(im1), f2: flat(im2) }; }
    // 3. fringes much finer than a pixel wash out (a real camera averages them)
    { const im = SN.image(SN.beams({ img: [beam(10 * Math.PI / 180), beam(-10 * Math.PI / 180)] }, doc), 0);
      out.wash = { period: im.period }; }
    // 4. a single Gaussian spot: 1/e² radius read from the intensity
    { const im = SN.image(SN.beams({ img: [beam(0, { w: 0.4 })] }, doc), 2), N = Math.round(Math.sqrt(im.I.length)), row = Array.from(im.I.slice((N >> 1) * N, (N >> 1) * N + N));
      const mx = Math.max(...row), half = row.filter(v => v >= mx * Math.exp(-2)).length * (2 / N) / 2; out.gw = half; }
    // 5. in a figure: laser → camera with "Show what it records"
    { const d = RNBX.newDocument(); const cam = mk('camera', 80, 50, 0, { showImage: true });
      d.objects = [mk('laser', 20, 50, 0, { lambda: 633 }), cam]; d.style.showLabels = true;
      const svg = RNBX.render.build(d, { layers: true }).svg, clean = RNBX.render.build(d, { labels: false }).svg;
      const t = RNBX.trace(d), info = SN.draw(cam, d, t, false).info;
      out.fig = { img: /<image[^>]+data:image\/png/.test(svg), cap: /field · w = /.test(svg), capInLabels: /id="rbx-labels"[\s\S]*field · w =/.test(svg),
        cleanImg: /<image/.test(clean), cleanCap: /field/.test(clean), w: info && info.w };
      cam.props.showImage = false; out.fig.off = !/<image/.test(RNBX.render.build(d, {}).svg);
      // blocked: a beam dump in front of the camera
      cam.props.showImage = true; d.objects.push(mk('beamdump', 50, 50, 0, {})); out.fig.dark = /no light/.test(RNBX.render.build(d, {}).svg); }
    return out;
  });
  H.check('two beams at ±0.5°: fringe period λ / 2 sin θ = 36.3 µm, full contrast', Math.abs(r.fr.period - r.fr.expect) / r.fr.expect < 1e-6 && r.fr.vis > 0.95, r.fr);
  H.check('orthogonal polarisations or different sources: no fringes', r.inc.p1 === null && r.inc.p2 === null && r.inc.f1 < 0.2 && r.inc.f2 < 0.2, r.inc);
  H.check('fringes finer than a pixel average out (no false pattern)', r.wash.period === null, r.wash);
  H.check('a single Gaussian spot has the beam\'s 1/e² radius (0.4 mm)', Math.abs(r.gw - 0.4) < 0.03, r.gw);
  H.check('camera with "Show what it records": computed image and caption drawn beside it', r.fig.img && r.fig.cap && r.fig.w > 0 && r.fig.off, r.fig);
  H.check('the caption is lettering: in the Labels layer, left out of an unlabelled export (image kept)', r.fig.capInLabels && r.fig.cleanImg && !r.fig.cleanCap, r.fig);
  H.check('a blocked camera shows no light', r.fig.dark, r.fig);
  await page.close();
};
