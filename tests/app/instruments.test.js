/* Lab instruments & computing: 2D in both styles, 3D bodies, screens showing a plot of the figure, cables */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · lab instruments & computing');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const lib = RNBX.lib, U = RNBX.util, types = lib.all().filter(d => d.category === 'Lab instruments & computing').map(d => d.type), bad = [], no3d = [];
    ['schematic', 'shaded'].forEach(mode => types.forEach(t => {
      const def = lib.get(t), p = U.deepClone(def.defaults), S = lib.style(RNBX.state.doc, { mode });
      try { const b = def.bbox(p), svg = def.draw(p, S, { id: 'i' + t }); if (!b.every(Number.isFinite) || svg.length < 150 || /NaN|undefined/.test(svg)) bad.push(mode + ':' + t); } catch (e) { bad.push(mode + ':' + t + ' ' + e.message); }
    }));
    types.forEach(t => { const parts = lib.get(t).solid ? lib.get(t).solid(U.deepClone(lib.get(t).defaults), 10) : []; if (!parts.length) no3d.push(t); });
    // a laptop shows a data plot of the figure
    const d = RNBX.newDocument(), plot = RNBX.createObject('plot', 50, 50); RNBX.plotData.apply(plot, { series: [{ name: 'A', x: [0, 1, 2], y: [1, 3, 2] }] }); plot.props.ylabel = 'Counts';
    const lap = RNBX.createObject('laptop', 120, 50); lap.props.screen = 'figure'; d.objects = [plot, lap]; RNBX.setDocument(RNBX.normalizeDocument(d));
    const S = lib.style(RNBX.state.doc, { mode: 'shaded' }), svg = lib.get('laptop').draw(lap.props, S, lap);
    RNBX.state.doc.style.mode = '3d'; let ok3d = true; try { RNBX.render.build(RNBX.state.doc); } catch (e) { ok3d = false; }
    return { types: types.length, bad, no3d, screenPlot: svg.includes('Counts'), ok3d };
  });
  H.check('no two parts share a type name', await page.evaluate(() => !(RNBX.lib.duplicates || []).length), await page.evaluate(() => RNBX.lib.duplicates || []));
  H.check('every instrument draws in Schematic and Shaded', r.types >= 20 && !r.bad.length, r);
  H.check('every instrument has a 3D body', !r.no3d.length, r.no3d);
  H.check('a laptop screen can show a data plot of the figure, and it all draws in 3D', r.screenPlot && r.ok3d, r);
  const t = await page.evaluate(() => { const d = RNBX.normalizeDocument(RNBX.templates.list.find(q => q.id === 'lockinbench').build()); RNBX.setDocument(d); const tr = RNBX.trace(RNBX.state.doc), pd = d.objects.find(o => o.type === 'pd'); return { pdHit: !!(tr.hits[pd.id] && tr.hits[pd.id].P > 0), wires: d.objects.filter(o => o.type === 'wire').every(w => RNBX.lib.get('wire').geometry(w, d)) }; });
  H.check('template: the photodiode sees the laser and the instruments are cabled', t.pdHit && t.wires, t);
  await page.close();
};
