/* The app loads, every library part and every template works in every style */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · smoke (every part, every template)');
  const page = await H.openApp(await getBrowser(), base);
  H.check('app loads without errors', page.errors.length === 0, page.errors.join(' | '));
  const parts = await page.evaluate(() => {
    const bad = [];
    const entries = RNBX.lib.entries();
    entries.forEach(e => {
      try {
        const thumb = RNBX.dom.thumb(e.type, e.props, 'shaded');
        const d = RNBX.newDocument('nature-2'); RNBX.setDocument(d);
        const o = RNBX.createObject(e.type, 60, 40); if (e.props) Object.assign(o.props, JSON.parse(JSON.stringify(e.props)));
        RNBX.state.doc.objects.push(o);
        for (const mode of ['schematic', 'shaded', '3d']) { RNBX.state.doc.style.mode = mode; const svg = RNBX.render.build(RNBX.state.doc).svg; if (!/<svg/.test(svg) || /NaN|undefined/.test(svg)) throw new Error(mode + ' render has NaN/undefined'); }
        if (!thumb) throw new Error('no thumbnail');
      } catch (err) { bad.push(e.type + (e.name ? ' (' + e.name + ')' : '') + ': ' + err.message); }
    });
    return { n: entries.length, bad };
  });
  H.check(`all ${parts.n} library parts create, render (2D, shaded, 3D) and have thumbnails`, parts.bad.length === 0, parts.bad.slice(0, 5).join(' | '));
  const tpl = await page.evaluate(() => RNBX.templates.list.map(t => {
    try {
      RNBX.setDocument(t.build());
      const tr = RNBX.trace(RNBX.state.doc), out = { id: t.id, segs: tr.segments.length, hits: Object.keys(tr.hits).length, bad: '' };
      for (const mode of ['schematic', 'shaded', '3d']) { RNBX.state.doc.style.mode = mode; const svg = RNBX.render.build(RNBX.state.doc).svg; if (/NaN/.test(svg)) out.bad = mode + ' NaN'; }
      return out;
    } catch (e) { return { id: t.id, bad: e.message }; }
  }));
  tpl.forEach(t => H.check(`template "${t.id}" builds and renders in all styles`, !t.bad, t.bad || `${t.segs} segments, ${t.hits} detectors hit`));
  const optical = tpl.filter(t => !['absorber'].includes(t.id));
  H.check('every optical template traces beams to at least one detector', optical.every(t => t.hits > 0), optical.filter(t => !t.hits).map(t => t.id).join(','));
  // building a setup by clicking library tiles
  await page.evaluate(() => RNBX.setDocument(RNBX.newDocument('nature-2')));
  await page.click('[data-empty="laser"]');
  for (const name of ['Mirror', 'Lens', 'Photodiode']) { await page.locator('.tile', { hasText: new RegExp('^' + name) }).first().click(); await page.waitForTimeout(60); }
  const built = await page.evaluate(() => ({ types: RNBX.state.doc.objects.map(o => o.type), hit: Object.keys(RNBX.canvas.trace.hits).map(k => RNBX.getObj(k).type) }));
  H.check('clicking Laser, Mirror, Lens, Photodiode builds a working setup', built.hit.includes('pd'), JSON.stringify(built));
  await H.shot(page, 'smoke-clickbuild', '#stage');
  H.check('no errors during the smoke test', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
