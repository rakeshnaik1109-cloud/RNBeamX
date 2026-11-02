/* Labware & chemistry: every item draws in both styles, liquids, well plates, fluid tubing */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · labware & chemistry');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const lib = RNBX.lib, types = lib.all().filter(d => d.category === 'Labware & chemistry').map(d => d.type), bad = [];
    ['schematic', 'shaded'].forEach(mode => types.forEach(t => {
      const def = lib.get(t), p = RNBX.util.deepClone(def.defaults), S = lib.style(RNBX.state.doc, { mode });
      try { const b = def.bbox(p, null), svg = def.draw(p, S, { id: 'x' + t }); if (!b.every(Number.isFinite) || b[2] <= b[0] || b[3] <= b[1] || svg.length < 100 || /NaN|undefined/.test(svg)) bad.push(mode + ':' + t); } catch (e) { bad.push(mode + ':' + t + ' ' + e.message); }
    }));
    // a liquid follows its level, and an empty vessel has none
    const S = lib.style(RNBX.state.doc, { mode: 'shaded' }), bk = lib.get('beaker'), base = RNBX.util.deepClone(bk.defaults);
    const lvl = f => { const svg = bk.draw(Object.assign({}, base, { fill: f, meniscus: false }), S, { id: 'lv' }); const m = svg.match(/<path d="M [-\d.]+ ([-\d.]+) Q/); return m ? +m[1] : null; };
    const empty = !/clip-path="url\(#rbx-lw-beaker-lv-c\)"/.test(bk.draw(Object.assign({}, base, { fill: 0 }), S, { id: 'lv' }));
    // listed wells
    const wp = lib.get('wellplate'), svg = wp.draw(Object.assign({}, wp.defaults, { fillMode: 'list', wells: 'A1-A3=#ff0000, B2' }), S);
    return { types: types.length, bad, low: lvl(0.2), high: lvl(0.8), empty, red: (svg.match(/fill="#ff0000"/g) || []).length, listed: (svg.match(/fill="#c51b8a"/g) || []).length };
  });
  H.check('every labware item draws in Schematic and Shaded', r.types >= 20 && !r.bad.length, r);
  H.check('the liquid surface follows the fill level; an empty vessel has no liquid', r.low > r.high && r.empty, r);
  H.check('well plate: listed wells and ranges get their colours', r.red === 3 && r.listed === 1, r);
  // fluid tubing: the connection tool joins two objects
  const t = await page.evaluate(() => {
    const d = RNBX.newDocument(); const a = RNBX.createObject('bottle', 40, 50), b = RNBX.createObject('beaker', 120, 50); d.objects = [a, b]; RNBX.setDocument(RNBX.normalizeDocument(d));
    RNBX.canvas.setTool('tube'); return [a.id, b.id];
  });
  for (const id of t) await page.click(`#figure [data-id="${id}"]`);
  const tube = await page.evaluate(() => { const o = RNBX.state.doc.objects.find(q => q.type === 'tube'); return o ? { from: !!o.props.from, to: !!o.props.to, arrows: (RNBX.render.build(RNBX.state.doc).svg.match(/<path d="M[^"]*Z" fill="#/g) || []).length } : null; });
  H.check('fluid tubing connects two objects and shows the flow', tube && tube.from && tube.to && tube.arrows >= 4, tube);
  const three = await page.evaluate(() => { const d = RNBX.state.doc; d.style.mode = '3d'; let ok = true; try { RNBX.render.build(d); } catch (e) { ok = false; } d.style.mode = 'schematic'; return ok; });
  H.check('a figure with labware and tubing also draws in 3D', three);
  await page.close();
};
