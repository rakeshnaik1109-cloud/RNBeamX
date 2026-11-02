/* Layer Studio ▸ Pattern: unit-cell editor, background RCWA, orders, drag handles, insert / update */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Layer Studio ▸ Pattern');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio');
  await page.click('.st-tabs >> text=Pattern');
  await page.waitForFunction(() => document.querySelector('.st-spec svg') && document.querySelectorAll('.st-orders tr').length >= 2, null, { timeout: 30000 });
  const a = await page.evaluate(() => ({ mode: RNBX.studio.mode, cross: !!document.querySelector('.ps-cross'), orders: document.querySelectorAll('.st-orders tr').length, spec: !!document.querySelector('.st-spec svg') }));
  H.check('Pattern tab: cross-section, orders table and a background RCWA spectrum', a.mode === 'pattern' && a.cross && a.orders >= 2 && a.spec, a);
  // every preset builds a valid grating
  const pres = await page.evaluate(() => RNBX.patternStudio.PRESETS.map(p => { const d = p.make(), g = RNBX.patternStudio.geo(d), r = RNBX.patternStudio.orders(d);
    return { id: p.id, ok: g.slices.length > 0 && isFinite(r.R) && r.R >= -1e-6 && r.R + r.T <= 1 + 1e-6 }; }));
  H.check('all unit-cell designs calculate', pres.every(p => p.ok), pres);
  // drag the width handle of the selected ridge
  const before = await page.evaluate(() => RNBX.patternStudio.design().layers[0].shapes[0].wb);
  const hd = await page.evaluate(() => { const c = [...document.querySelectorAll('.ps-cross circle')][0], b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.move(hd.x, hd.y); await page.mouse.down(); await page.mouse.move(hd.x + 30, hd.y, { steps: 4 }); await page.mouse.up();
  const after = await page.evaluate(() => RNBX.patternStudio.design().layers[0].shapes[0].wb);
  H.check('dragging the round handle widens the ridge', after > before + 10, { before, after });
  await page.keyboard.press('Control+z');
  const undone = await page.evaluate(() => RNBX.patternStudio.design().layers[0].shapes[0].wb);
  H.check('Ctrl+Z in the Studio undoes the drag', undone === before, { undone, before });
  // a quick map
  const map = await page.evaluate(async () => {
    const PS = RNBX.patternStudio, d = PS.PRESETS.find(p => p.id === 'lamellar').make(); d.orders = 5; d.map = Object.assign(d.map, { lmin: 500, lmax: 700, amin: 0, amax: 20, res: 'low' }); PS.setDesign(d);
    [...document.querySelectorAll('.studio button')].find(b => b.textContent === 'Calculate map').click();
    for (let i = 0; i < 300 && !document.querySelector('.st-map svg'); i++) await new Promise(r => setTimeout(r, 100));
    return !!document.querySelector('.st-map svg image');
  });
  H.check('the wavelength × angle map is calculated in the background', map);
  // insert, linked panel calculates the same R
  const ins = await page.evaluate(async () => {
    const PS = RNBX.patternStudio; PS.setDesign(PS.PRESETS.find(p => p.id === 'wire').make());
    const obj = PS.insert({ panel: true, periods: 6 }); RNBX.studio.close();
    const doc = RNBX.state.doc, panel = doc.objects.find(o => o.type === 'plot' && o.props.link === obj.id);
    let res; for (let i = 0; i < 400; i++) { res = RNBX.plotData.calcResult(obj, doc); if (res && res.x && !res.pending) break; await new Promise(r => setTimeout(r, 100)); }
    const g = RNBX.lib.get('ucell').grating(obj.props), lam = res.x[20], one = RNBX.rcwa.core.solve(RNBX.rcwa.problemAt(g, lam), lam, obj.props.calc.angle || 0, obj.props.calc.pol);
    const svg = RNBX.render.build(doc).svg;
    return { type: obj.type, periods: obj.props.periods, panel: !!panel, same: Math.abs(res.series.T[20] - one.T) < 1e-9, drawn: svg.length > 2000 };
  });
  H.check('insert: a Patterned structure with a linked RCWA panel that agrees with the Studio', ins.type === 'ucell' && ins.periods === 6 && ins.panel && ins.same && ins.drawn, ins);
  // near field (1D), drawn in the background with outlines
  const nf = await page.evaluate(async () => {
    const PS = RNBX.patternStudio; RNBX.studio.open(null, 'pattern'); PS.setDesign(PS.PRESETS.find(p => p.id === 'gmr').make());
    for (let i = 0; i < 200 && !document.querySelector('.st-field svg image'); i++) await new Promise(r => setTimeout(r, 100));
    return { img: !!document.querySelector('.st-field svg image'), outlines: document.querySelectorAll('.st-field svg path').length };
  });
  H.check('1D near field |E|² map with the structure outlined', nf.img && nf.outlines >= 3, nf);
  // 2D arrays: switch, top view, side view, near field, (m, n) orders, drag a handle
  const two = await page.evaluate(async () => {
    const PS = RNBX.patternStudio, d = PS.PRESETS.find(p => p.id === 'disks').make(); d.mx = 1; d.my = 1; d.calc.points = 5; PS.setDesign(d);
    for (let i = 0; i < 300 && !(document.querySelector('.st-field svg image') && document.querySelector('.st-spec svg') && document.querySelectorAll('.st-orders tr').length > 1); i++) await new Promise(r => setTimeout(r, 100));
    return { top: !!document.querySelector('.st-cross .ps-cross'), side: document.querySelectorAll('.st-cross').length >= 2, field: !!document.querySelector('.st-field svg image'), spec: !!document.querySelector('.st-spec svg'), mn: /\(0, 0\)/.test(document.querySelector('.st-orders').textContent) };
  });
  H.check('2D array: top view, side cut, near field, spectrum and (m, n) orders', Object.values(two).every(Boolean), two);
  const rx0 = await page.evaluate(() => RNBX.patternStudio.design().layers[0].shapes[0].rx);
  const hd2 = await page.evaluate(() => { const c = [...document.querySelectorAll('.ps-cross circle')][0], b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.move(hd2.x, hd2.y); await page.mouse.down(); await page.mouse.move(hd2.x + 20, hd2.y, { steps: 4 }); await page.mouse.up();
  const rx1 = await page.evaluate(() => RNBX.patternStudio.design().layers[0].shapes[0]);
  H.check('dragging a disk handle in the top view resizes it (and keeps it round)', rx1.rx > rx0 + 5 && rx1.ry === rx1.rx, { rx0, rx: rx1.rx, ry: rx1.ry });
  const xy = await page.evaluate(async () => {
    const sel = [...document.querySelectorAll('.st-field')].length && [...document.querySelectorAll('.studio select')].find(s => [...s.options].some(o => o.value === 'xy'));
    sel.value = 'xy'; sel.dispatchEvent(new Event('change'));
    for (let i = 0; i < 300; i++) { const t = document.querySelector('.st-field svg text:last-of-type'); if (document.querySelector('.st-field svg image') && /at depth/.test(document.querySelector('.st-field').textContent)) return true; await new Promise(r => setTimeout(r, 100)); }
    return false;
  });
  H.check('2D near field in a plane at a chosen depth (x–y)', xy);
  const ins2 = await page.evaluate(async () => {
    const PS = RNBX.patternStudio, obj = PS.insert({ panel: true, periods: 3 }); RNBX.studio.close();
    obj.props.calc.rpoints = 5;
    const doc = RNBX.state.doc; let res;
    for (let i = 0; i < 600; i++) { res = RNBX.plotData.calcResult(obj, doc); if (res && res.x && !res.pending) break; await new Promise(r => setTimeout(r, 100)); }
    const g = RNBX.lib.get('ucell').grating(obj.props), lam = res.x[2], one = RNBX.rcwa.core.solve2(RNBX.rcwa.problemAt2(g, lam), lam, 0, 0, obj.props.calc.pol);
    return { dim: obj.props.pattern.dim, same: Math.abs(res.series.R[2] - one.R) < 1e-9, drawn: RNBX.render.build(doc).svg.length > 2000 };
  });
  H.check('insert a 2D array: drawn, and its linked panel is calculated with the 2D solver', ins2.dim === 2 && ins2.same && ins2.drawn, ins2);
  // update in place from the figure
  const up = await page.evaluate(() => {
    const obj = RNBX.state.doc.objects.find(o => o.type === 'ucell' && o.props.pattern.dim !== 2), n0 = RNBX.state.doc.objects.length;
    RNBX.studio.open(obj);
    const mode = RNBX.studio.mode, d = RNBX.patternStudio.design(); d.layers[0].shapes[0].wb = 50; RNBX.patternStudio.setDesign(d);
    RNBX.patternStudio.insert({}); RNBX.studio.close();
    const o2 = RNBX.state.doc.objects.find(o => o.id === obj.id);
    const ok = o2.props.pattern.layers[0].shapes[0].wb === 50 && RNBX.state.doc.objects.length === n0;
    RNBX.history.undo();
    return { mode, ok, undone: RNBX.state.doc.objects.find(o => o.id === obj.id).props.pattern.layers[0].shapes[0].wb === 70 };
  });
  H.check('“Open in Layer Studio” on a structure opens the Pattern tab and updates the same part (Ctrl+Z restores)', up.mode === 'pattern' && up.ok && up.undone, up);
  await page.close();
};
