/* Porosity of a substrate from an image panel: synthetic pores of known size and number */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · porosity analysis');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(async () => {
    document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument());
    // 600 × 450 px: noisy bright solid, dark disks (pores) on a grid, and a black info bar below 400 px
    const W = 600, Hh = 450, c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
    const id = g.createImageData(W, Hh); let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const pores = []; for (let j = 0; j < 6; j++) for (let i = 0; i < 8; i++) pores.push([40 + i * 72, 35 + j * 66, 10 + ((i + j) % 3) * 4]);   // radii 10, 14, 18 px
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      let v = 200 + (rnd() - 0.5) * 50;
      if (y >= 400) v = 5; else if (pores.some(([cx, cy, rr]) => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= rr * rr)) v = 40 + (rnd() - 0.5) * 40;
      const k = (y * W + x) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = Math.max(0, Math.min(255, v)); id.data[k + 3] = 255;
    }
    g.putImageData(id, 0, 0);
    const f = new File([await new Promise(res => c.toBlob(res))], 'porous.png', { type: 'image/png' });
    const o = await RNBX.imgproc.create(f, 92, 50, 90); Object.assign(o.props, { calib: 'pixel', pix: 2, unit: 'nm', cy1: 400 / 450 }); RNBX.select([o.id]);
    RNBX.porosity.open(o);
    for (let i = 0; i < 100 && !(RNBX.porosity._last && RNBX.porosity._last.sum); i++) await new Promise(res => setTimeout(res, 50));
    await new Promise(res => setTimeout(res, 200));
    const L = RNBX.porosity._last, s = L.sum;
    const truePor = pores.reduce((a, q) => a + Math.PI * q[2] * q[2], 0) / (W * 400);
    const trueD = pores.reduce((a, q) => a + 2 * q[2], 0) / pores.length * 2;   // nm (2 nm per px)
    const out = { por: s.porosity, truePor, n: s.n, nPores: pores.length, eqd: s.eqd.mean, trueD, unit: s.unit, thr: s.thr, density: s.density, trueDensity: pores.length / (W * 400 * 4 / 1e6) };
    // a hand-set threshold at the solid level counts nearly everything as pore
    RNBX.porosity._d.o.auto = false; RNBX.porosity._d.o.thr = 250; await RNBX.porosity._d.run(); out.high = RNBX.porosity._last.sum.porosity;
    RNBX.porosity._d.o.auto = true; await RNBX.porosity._d.run();
    // a drawn region: only the top-left quarter
    RNBX.porosity._d.o.roiMode = 'rect'; RNBX.porosity._d.o.roi = [0, 0, 0.5, 0.5]; await RNBX.porosity._d.run(); out.rectN = RNBX.porosity._last.sum.n;
    RNBX.porosity._d.o.roiMode = 'crop'; await RNBX.porosity._d.run();
    out.panel = !!document.querySelector('.po-big') && !!document.querySelector('.ms-side svg');
    [...document.querySelectorAll('.ms-side button')].find(b => /pore map/.test(b.textContent)).click();
    RNBX.porosity._d.close();
    out.stored = o.props.poro && o.props.poro.result && +o.props.poro.result.porosity.toFixed(4);
    out.mapDrawn = o.props.poroShow && /data:image\/png/.test(o.props.poroMask) && RNBX.render.build(RNBX.state.doc, {}).svg.split('<image').length >= 3;
    return out;
  });
  H.check('Otsu threshold falls between pore and solid grey levels', r.thr > 60 && r.thr < 180, r.thr);
  H.near('porosity matches the true pore area fraction (info bar cropped out)', r.por, r.truePor, 0.006);
  H.check('every pore found, none split or merged', r.n === r.nPores, [r.n, r.nPores]);
  H.near('mean equivalent diameter (nm) of the pores', r.eqd, r.trueD, 1.5);
  H.near('pore density per µm²', r.density, r.trueDensity, r.trueDensity * 0.01);
  H.check('a threshold above the solid makes almost everything pore', r.high > 0.9, r.high);
  H.check('a drawn region analyses only its pores', r.rectN > 4 && r.rectN < r.nPores / 2 + 6, r.rectN);
  H.check('results, histogram and stored result; the pore map is drawn on the panel', r.panel && Math.abs(r.stored - r.por) < 1e-4 && r.mapDrawn, r);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
