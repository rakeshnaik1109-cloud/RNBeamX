/* Layer Studio ▸ Particles: spectra, near field, hot spot, gap sweep, insert */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Layer Studio ▸ Particles');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio');
  await page.click('.st-tabs >> text=Particles');
  await page.waitForFunction(() => /wavelengths/.test((document.querySelector('.st-right .hint') || {}).textContent || '') && /SERS enhancement/.test(document.body.textContent), null, { timeout: 90000 });
  const a = await page.evaluate(() => ({ spec: !!document.querySelector('.st-spec svg path'), field: !!document.querySelector('.st-field svg image'), ef: /≈/.test(document.querySelector('.st-right .readout').textContent) }));
  H.check('Particles tab: spectrum, near-field map and SERS enhancement of the Au dimer', a.spec && a.field && a.ef, a);
  // every preset gives a finite, positive spectrum point and hot spot
  const pres = await page.evaluate(() => RNBX.particleStudio.PRESETS.map(p => { const d = p.make(), r = RNBX.particleStudio.point(d, d.probe.nm); return { id: p.id, ok: r.Cext > 0 && r.Cabs >= -1e-6 * r.Cext && (p.id === 'rodside' ? !isFinite(r.E2) : isFinite(r.E2) && r.E2 > 0) }; }));
  H.check('every particle design calculates', pres.every(p => p.ok), pres);
  // a nanorod: spectrum, tip hot spot and near-field map
  const rod = await page.evaluate(async () => {
    const PT = RNBX.particleStudio; PT.setDesign(PT.PRESETS.find(p => p.id === 'rod4').make());
    for (let i = 0; i < 200 && !/boundary elements/.test((document.querySelector('.st-right .hint') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 100));
    for (let i = 0; i < 100 && !/beyond the tip/.test(document.body.textContent); i++) await new Promise(r => setTimeout(r, 100));
    const p = PT.point(PT.design(), 780);
    return { spec: /boundary elements/.test(document.querySelector('.st-right .hint').textContent), tip: /beyond the tip/.test(document.body.textContent), map: !!document.querySelector('.st-field svg image'), E2: p.E2, ok: p.Cext > 0 };
  });
  H.check('nanorod: spectrum, tip hot spot (|E|² > 10³ at the plasmon) and near-field map', rod.spec && rod.tip && rod.map && rod.ok && rod.E2 > 1e3, rod);
  const rd = await page.evaluate(async () => {
    const PT = RNBX.particleStudio, wait = async re => { for (let i = 0; i < 300 && !re.test((document.querySelector('.st-right .hint') || {}).textContent || ''); i++) await new Promise(r => setTimeout(r, 100)); };
    PT.setDesign(PT.PRESETS.find(p => p.id === 'rodtip').make()); await wait(/boundary elements/);
    for (let i = 0; i < 200 && !document.querySelector('.st-field svg image'); i++) await new Promise(r => setTimeout(r, 100));
    const tip = PT.point(PT.design(), 890), single = PT.point(Object.assign(JSON.parse(JSON.stringify(PT.design())), { rod: { L: 40, D: 10, ends: 'round', pair: 'one' } }), 890);
    const map = !!document.querySelector('.st-field svg image');
    PT.setDesign(PT.PRESETS.find(p => p.id === 'rodside').make()); await wait(/coupled spheroids/);
    const side = PT.point(PT.design(), 740);
    return { gap: tip.E2, tipSingle: single.E2, map, sideOk: side.Cext > 0 && !isFinite(side.E2), noField: /gives the spectrum/.test(document.querySelector('.st-field').textContent) };
  });
  H.check('rod dimers: end-to-end gap field ≫ single-rod tip, map drawn; side by side gives spectra only', rd.gap > 10 * rd.tipSingle && rd.map && rd.sideOk && rd.noField, rd);
  await page.evaluate(() => { const PT = RNBX.particleStudio; PT.setDesign(PT.PRESETS.find(p => p.id === 'dimer').make()); });
  await page.waitForFunction(() => /multipole orders\./.test((document.querySelector('.st-right .hint') || {}).textContent || ''), null, { timeout: 90000 });
  // gap sweep: the field grows as the gap closes
  await page.click('text=Calculate gap sweep');
  await page.waitForFunction(() => /At \d/.test((document.querySelectorAll('.st-right .hint')[2] || {}).textContent || '') && !/calculating/.test(document.querySelectorAll('.st-right .hint')[2].textContent), null, { timeout: 120000 });
  // insert the panels and the map
  const ins = await page.evaluate(async () => {
    const made = RNBX.particleStudio.insert({ spec: true, hot: true, field: true, sweep: true }); RNBX.studio.close();
    const doc = RNBX.state.doc, svg = RNBX.render.build(doc).svg;
    return { n: made.length, plots: doc.objects.filter(o => o.type === 'plot').length, img: doc.objects.some(o => o.type === 'image'), nan: /NaN/.test(svg) };
  });
  H.check('insert: three data panels and the near-field picture, drawn without errors', ins.n === 4 && ins.plots === 3 && ins.img && !ins.nan, ins);
  await page.close();
};
