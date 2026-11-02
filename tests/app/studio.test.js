/* Layer Studio: presets, live views, insert / update in the figure, keyboard isolation */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Layer Studio');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.removeItem('rnbx-studio-v1'); } catch (e) { /* none */ } RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio');
  await page.waitForTimeout(600);
  const open = await page.evaluate(() => ({ open: RNBX.studio.isOpen(), charts: document.querySelectorAll('.studio svg.st-chart').length }));
  H.check('Studio button opens the workspace with live charts', open.open && open.charts >= 2, open);
  // every preset calculates
  const pres = await page.evaluate(() => RNBX.studio.PRESETS.map(p => { const d = p.make(), st = RNBX.studio.stack(d), r = RNBX.thinfilm.scan(st, d.calc), f = RNBX.studio.fieldOf(d);
    return { id: p.id, ok: r.x.length > 10 && r.series.R.every(isFinite) && f.e2.every(isFinite), films: RNBX.studio.flat(d).length }; }));
  H.check('all designs calculate (spectrum and field)', pres.every(p => p.ok), pres);
  const cavity = pres.find(p => p.id === 'cavity');
  H.check('repeat groups expand: microcavity has 21 films', cavity.films === 21, cavity);
  // a design with groups → figure → back keeps the groups
  const r = await page.evaluate(() => {
    const ST = RNBX.studio, d = ST.PRESETS.find(p => p.id === 'cavity').make();
    ST.setDesign(d);
    const obj = ST.insert({ panel: true });
    const doc = RNBX.state.doc, panel = doc.objects.find(o => o.type === 'plot' && o.props.link === obj.id);
    const back = ST.fromProps(obj.props);
    const res = RNBX.plotData.calcResult(obj, doc), mine = RNBX.thinfilm.scan(ST.stack(d), d.calc);
    return { type: obj.type, layers: obj.props.layers.length, panel: !!panel, groups: back.items.filter(i => i.group).length, open: ST.isOpen(), same: Math.abs(res.series.R[100] - mine.series.R[100]) < 1e-9 };
  });
  H.check('insert: Multilayer stack with substrate + 21 films and a linked panel', r.type === 'layers' && r.layers === 22 && r.panel, r);
  H.check('the figure calculates the same spectrum as the Studio', r.same);
  H.check('the stack reopens with its repeat groups', r.groups === 2, r);
  // update in place from the inspector, and Ctrl+Z in the figure undoes it
  const u = await page.evaluate(() => {
    const ST = RNBX.studio, obj = RNBX.state.doc.objects.find(o => o.type === 'layers');
    ST.close(); ST.open(obj);
    const d = ST.design(); d.items[1].nm = 300; ST.setDesign(d);
    const n0 = RNBX.state.doc.objects.length;
    ST.insert({}); ST.close();
    const o2 = RNBX.state.doc.objects.find(o => o.id === obj.id), cav = o2.props.layers.find(l => l.name === 'Cavity');
    const updated = cav.nm === 300 && RNBX.state.doc.objects.length === n0;
    RNBX.history.undo();
    const o3 = RNBX.state.doc.objects.find(o => o.id === obj.id);
    return { updated, undone: o3.props.layers.find(l => l.name === 'Cavity').nm < 300 };
  });
  H.check('“Update the stack” changes the same part, Ctrl+Z restores it', u.updated && u.undone, u);
  // the figure's shortcuts are off while the Studio is open
  const k = await page.evaluate(async () => {
    const obj = RNBX.state.doc.objects.find(o => o.type === 'layers'); RNBX.select([obj.id]);
    RNBX.studio.open();
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
    await new Promise(res => setTimeout(res, 50));
    const kept = RNBX.state.doc.objects.some(o => o.id === obj.id);
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return { kept, closed: !RNBX.studio.isOpen() };
  });
  H.check('Delete in the Studio does not touch the figure; Esc closes it', k.kept && k.closed, k);
  await page.close();
};
