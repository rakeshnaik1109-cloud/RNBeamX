/* Layer Studio ▸ Layers ▸ Fit to a measurement */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Layer Studio: fit to a measurement');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio');
  const r = await page.evaluate(async () => {
    const ST = RNBX.studio, TF = RNBX.thinfilm; ST.setDesign(ST.PRESETS.find(p => p.id === 'mim').make());
    const d2 = JSON.parse(JSON.stringify(ST.design())), fl = ST.flat(d2); fl[0].nm = 7.5; fl[1].nm = 133;
    const st = ST.stack(d2), x = [], y = []; for (let l = 400; l <= 1000; l += 3) { x.push(l); y.push(97 * TF.response(st, l, d2.calc.angle || 0, d2.calc.pol).R); }
    // as a CSV file would arrive
    RNBX.layerFit.load(RNBX.plotData.parse('wavelength,R (%)\n' + x.map((v, i) => v + ',' + y[i].toFixed(4)).join('\n')), 'measured.csv');
    await new Promise(res => setTimeout(res, 300));
    const overlay = [...document.querySelectorAll('.st-spec svg path')].some(p => p.getAttribute('stroke') === '#555555');
    const boxes = [...document.querySelectorAll('.lf-tab input[type=checkbox]')];
    boxes[0].click(); boxes[1].click(); boxes[boxes.length - 2].click();
    [...document.querySelectorAll('.studio button')].find(b => b.textContent === 'Fit').click();
    for (let i = 0; i < 400 && !document.querySelector('.lf-panel .readout'); i++) await new Promise(res => setTimeout(res, 100));
    const f = ST.flat(ST.design()), pct = /Per cent/.test(document.querySelector('.lf-panel').textContent);
    // Ctrl+Z restores the design before the fit
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    await new Promise(res => setTimeout(res, 100));
    return { ni: f[0].nm, sio2: f[1].nm, overlay, pct, undone: ST.flat(ST.design())[1].nm, readout: !!document.querySelector('.lf-panel .readout') };
  });
  H.check('a measured spectrum in % is recognised and drawn over the calculated one', r.overlay && r.pct, r);
  H.check('fit: Ni 7.5 nm and SiO₂ 133 nm recovered (with a 0.97 calibration scale) and written into the design', Math.abs(r.ni - 7.5) < 0.05 && Math.abs(r.sio2 - 133) < 0.1, r);
  H.check('Ctrl+Z restores the thicknesses before the fit', r.undone === 120, r.undone);
  await page.close();
};
