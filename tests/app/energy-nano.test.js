/* Energy & band diagrams and Nanomaterials: every part and option draws in both styles */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · energy diagrams and nanomaterials');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const lib = RNBX.lib, U = RNBX.util, bad = [], cats = ['Energy & band diagrams', 'Nanomaterials'];
    const types = lib.all().filter(d => cats.includes(d.category)).map(d => d.type), variants = [];
    types.forEach(t => {
      const d = lib.get(t); variants.push([t, {}]);
      (d.variants || []).forEach(v => variants.push([t, v.props]));
      d.params.filter(q => q.type === 'select').forEach(q => (typeof q.options === 'function' ? q.options() : q.options).forEach(o => variants.push([t, { [q.key]: o[0] }])));
      d.params.filter(q => q.type === 'bool').forEach(q => variants.push([t, { [q.key]: !d.defaults[q.key] }]));
    });
    ['schematic', 'shaded'].forEach(mode => variants.forEach(([t, ov]) => {
      const def = lib.get(t), p = Object.assign(U.deepClone(def.defaults), ov), S = lib.style(RNBX.state.doc, { mode });
      try { const b = def.bbox(p), svg = def.draw(p, S, { id: 'e' + t }); if (!b.every(Number.isFinite) || svg.length < 100 || /NaN|undefined|Infinity/.test(svg)) bad.push(mode + ':' + t + JSON.stringify(ov)); } catch (e) { bad.push(mode + ':' + t + JSON.stringify(ov) + ' ' + e.message); }
    }));
    // the level-diagram text parser
    const L = RNBX.parseLevels('level a 0 ground\nlevel b 2 col=1 excited\nup a b 532 nm pump\nwavy b a\ntransfer a zz ignored\nnonsense line');
    // a page of all of them renders in each view
    const d = RNBX.newDocument(); d.objects = types.map((t, i) => RNBX.createObject(t, 40 + (i % 4) * 90, 40 + Math.floor(i / 4) * 70)); RNBX.setDocument(RNBX.normalizeDocument(d));
    let ok = true; ['schematic', 'shaded', '3d'].forEach(m => { RNBX.state.doc.style.mode = m; try { const out = RNBX.render.build(RNBX.state.doc); if (m !== '3d' && /NaN/.test(out.svg)) ok = false; } catch (e) { ok = false; } });
    // physics sanity of the band diagrams: p side above n side; E–k conduction band opens upwards
    const B = lib.get('bands'), Sx = lib.style(RNBX.state.doc, { mode: 'schematic' });
    const pn = B.draw(Object.assign(U.deepClone(B.defaults), { mode: 'pn', carriers: false, light: false }), Sx);
    const cb = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + pn + '</svg>', 'image/svg+xml').querySelector(`path[stroke="${B.defaults.cbC}"]`).getAttribute('d').match(/-?[\d.]+/g).map(Number);
    const ek = B.draw(Object.assign(U.deepClone(B.defaults), { mode: 'ek', carriers: false, light: false }), Sx);
    const ec = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + ek + '</svg>', 'image/svg+xml').querySelector(`path[stroke="${B.defaults.cbC}"]`).getAttribute('d').match(/-?[\d.]+/g).map(Number);
    const ys = ec.filter((v, i) => i % 2), mid = ys[Math.floor(ys.length / 2)];
    return { n: types.length, variants: variants.length, bad, L: { levels: Object.keys(L.L).length, tr: L.tr.length, col: L.L.b.col, lab: L.tr[0].label }, ok, pnUp: cb[1] < cb[cb.length - 1], ekUp: mid > ys[0] && mid > ys[ys.length - 1] };
  });
  H.check('energy and nanomaterial parts are registered', r.n >= 10, r.n);
  H.check(`every part, variant and option draws in Schematic and Shaded (${r.variants} cases)`, !r.bad.length, r.bad.slice(0, 8));
  H.check('level text: levels, columns and transitions parsed; unknown levels and lines ignored', r.L.levels === 2 && r.L.tr === 2 && r.L.col === 1 && r.L.lab === '532 nm pump', r.L);
  H.check('a page of them renders in Schematic, Shaded and 3D', r.ok);
  H.check('p–n junction: bands on the p side lie higher in energy', r.pnUp);
  H.check('E–k: the conduction band opens upwards (minimum in the middle)', r.ekUp);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
