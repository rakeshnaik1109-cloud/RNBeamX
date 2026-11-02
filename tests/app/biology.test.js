/* Biology & medicine and safety signs: every item and every sign symbol draws in both styles */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · biology & medicine, safety signs');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const lib = RNBX.lib, U = RNBX.util, bad = [];
    const bio = lib.all().filter(d => d.category === 'Biology & medicine').map(d => d.type), signs = lib.all().filter(d => d.category === 'Safety signs').map(d => d.type);
    const variants = [];
    bio.forEach(t => { variants.push([t, {}]); (lib.get(t).params || []).filter(q => q.type === 'select').forEach(q => q.options.forEach(o => variants.push([t, { [q.key]: o[0] }]))); });
    signs.forEach(t => lib.SIGN_SYMBOLS[t].forEach(sym => variants.push([t, { symbol: sym }])));
    ['schematic', 'shaded'].forEach(mode => variants.forEach(([t, ov]) => {
      const def = lib.get(t), p = Object.assign(U.deepClone(def.defaults), ov), S = lib.style(RNBX.state.doc, { mode });
      try { const b = def.bbox(p), svg = def.draw(p, S, { id: 'b' + t }); if (!b.every(Number.isFinite) || svg.length < 100 || /NaN|undefined/.test(svg) || !def.annotation) bad.push(mode + ':' + t + JSON.stringify(ov)); } catch (e) { bad.push(mode + ':' + t + JSON.stringify(ov) + ' ' + e.message); }
    }));
    const g = lib.get('ghs'), p0 = U.deepClone(g.defaults), p1 = Object.assign(U.deepClone(g.defaults), { caption: 'Flammable' });
    const capOk = g.bbox(p1)[3] > g.bbox(p0)[3] && g.draw(p1, lib.style(RNBX.state.doc, { mode: 'schematic' }), { id: 'c' }).includes('Flammable');
    const d = RNBX.newDocument(); d.objects = bio.concat(signs).map((t, i) => RNBX.createObject(t, 20 + (i % 8) * 30, 20 + Math.floor(i / 8) * 40)); RNBX.setDocument(RNBX.normalizeDocument(d));
    let ok = true; ['schematic', 'shaded', '3d'].forEach(m => { RNBX.state.doc.style.mode = m; try { const out = RNBX.render.build(RNBX.state.doc); if (m !== '3d' && /NaN/.test(out.svg)) ok = false; } catch (e) { ok = false; } });
    return { bio: bio.length, signs: signs.length, symbols: Object.values(lib.SIGN_SYMBOLS).reduce((a, b) => a + b.length, 0), bad, capOk, ok };
  });
  H.check('no two parts share a type name', await page.evaluate(() => !(RNBX.lib.duplicates || []).length), await page.evaluate(() => RNBX.lib.duplicates || []));
  H.check('every biology item and option draws in Schematic and Shaded', r.bio >= 12 && !r.bad.filter(b => !/ghs|warnsign|mandsign/.test(b)).length, r);
  H.check('every safety sign symbol draws in both styles', r.signs === 3 && r.symbols >= 24 && !r.bad.length, r.bad);
  H.check('a sign caption is drawn and grows the bounds', r.capOk);
  H.check('a page of them renders in Schematic, Shaded and 3D', r.ok, r);
  await page.close();
};
