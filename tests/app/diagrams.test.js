/* Diagrams & AI: neural networks, CNN, Transformer, flowchart boxes, flow connectors that stay attached */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · diagrams & AI');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const lib = RNBX.lib, U = RNBX.util, types = lib.all().filter(d => d.category === 'Diagrams & AI' && !d.connection).map(d => d.type), bad = [];
    ['schematic', 'shaded'].forEach(mode => types.forEach(t => {
      const def = lib.get(t), S = lib.style(RNBX.state.doc, { mode });
      [def.defaults].concat((def.variants || []).map(v => Object.assign({}, def.defaults, v.props))).forEach((p0, k) => {
        const p = U.deepClone(p0);
        try { const b = def.bbox(p), svg = def.draw(p, S, { id: 't' + t + k }); if (!b.every(Number.isFinite) || svg.length < 200 || /NaN|undefined/.test(svg)) bad.push(mode + ':' + t + k); } catch (e) { bad.push(mode + ':' + t + k + ' ' + e.message); }
      });
    }));
    const S = lib.style(RNBX.state.doc, { mode: 'schematic' }), nn = lib.get('nnet');
    const circles = p => (nn.draw(Object.assign({}, nn.defaults, p), S, { id: 'c' }).match(/<circle /g) || []).length;
    const folded = nn.draw(Object.assign({}, nn.defaults, { layers: '784, 10', maxShow: 7 }), S, { id: 'f' });
    const cnn = lib.get('cnn').geom(lib.get('cnn').defaults), tf = lib.get('transformer');
    return { types: types.length, bad, small: circles({ layers: '3, 5, 2', bias: false }), bias: circles({ layers: '3, 5, 2', bias: true }), fold: /n = 784/.test(folded) && (folded.match(/<circle /g) || []).length === 12,
      cnn: cnn.blocks.length, enc: tf.draw(Object.assign({}, tf.defaults, { mode: 'enc' }), S, { id: 'e' }).includes('Cross'), encdec: tf.draw(tf.defaults, S, { id: 'd' }).includes('Cross-attention') };
  });
  H.check('every diagram item (and its variants) draws in Schematic and Shaded', r.types >= 4 && !r.bad.length, r);
  H.check('neural network: one circle per node (bias nodes added on request)', r.small === 10 && r.bias === 12, r);
  H.check('big layers fold with ⋮ and show their size', r.fold, r);
  H.check('CNN from its spec; Transformer encoder / encoder–decoder', r.cnn === 7 && !r.enc && r.encdec, r);
  // connectors: the tool joins two boxes and the line follows when a box moves
  const ids = await page.evaluate(() => {
    const d = RNBX.newDocument(); const a = RNBX.createObject('fcbox', 40, 30), b = RNBX.createObject('fcbox', 40, 70); d.objects = [a, b]; RNBX.setDocument(RNBX.normalizeDocument(d)); RNBX.canvas.setTool('flow'); return [a.id, b.id];
  });
  for (const id of ids) await page.click(`#figure [data-id="${id}"]`);
  const c = await page.evaluate(() => {
    const doc = RNBX.state.doc, f = doc.objects.find(o => o.type === 'flow'); if (!f) return null;
    const g1 = RNBX.lib.get('flow').geometry(f, doc), b = doc.objects.find(o => o.id === f.props.to);
    b.x += 40; b.y += 10; const g2 = RNBX.lib.get('flow').geometry(f, doc), box = RNBX.lib.worldBox(b);
    const end = g2.pts[g2.pts.length - 1], onBox = Math.abs(end[0] - box[0]) < 1e-6 || Math.abs(end[0] - box[2]) < 1e-6 || Math.abs(end[1] - box[1]) < 1e-6 || Math.abs(end[1] - box[3]) < 1e-6;
    return { straight: g1.pts.length === 2 && Math.abs(g1.pts[0][0] - g1.pts[1][0]) < 1e-9, followed: onBox, elbow: g2.pts.length === 4 };
  });
  H.check('flow connector: straight when boxes line up, follows a moved box with right angles', c && c.straight && c.followed && c.elbow, c);
  await page.close();
};
