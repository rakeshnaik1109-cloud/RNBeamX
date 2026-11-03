/* Command palette, version history and the new templates */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · command palette, versions, templates');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument()); });
  // palette by keyboard
  await page.keyboard.press('Control+k');
  await page.waitForSelector('.cmd-pal .cmd-input');
  await page.keyboard.type('mirror conc');
  const first = await page.evaluate(() => document.querySelector('.cmd-row.on .cmd-label').textContent);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  const added = await page.evaluate(() => RNBX.state.doc.objects.map(o => o.type));
  const r = await page.evaluate(async () => {
    const CP = RNBX.command, cmds = CP.commands(), out = {};
    out.n = cmds.length;
    out.groups = [...new Set(cmds.map(c => c.group))];
    out.export = CP.search(cmds, 'export')[0].label;
    out.tpl = CP.search(cmds, 'dark field microscope')[0].label;
    out.jab = CP.search(cmds, 'jablonski')[0];
    out.jab = out.jab && out.jab.group + ':' + out.jab.label;
    out.none = CP.search(cmds, 'qqqzzz').length;
    // versions
    const VS = RNBX.versions;
    (await VS.list()).forEach(v => VS.remove(v.id));
    await new Promise(r2 => setTimeout(r2, 50));
    const v1 = await VS.save('first');
    RNBX.state.doc.objects.push(RNBX.createObject('lens', 40, 40)); RNBX.changed();
    const auto = await VS.tick(true);
    const list = await VS.list();
    out.versions = list.map(v => [v.name, v.auto, v.n, !!v.thumb && v.thumb.startsWith('data:image/jpeg')]);
    await VS.restore(v1.id);
    out.restored = RNBX.state.doc.objects.length;
    RNBX.history.undo();
    out.undone = RNBX.state.doc.objects.length;
    await VS.rename(auto.id, 'kept'); out.renamed = (await VS.list()).find(v => v.id === auto.id).auto === false;
    await VS.remove(v1.id); out.left = (await VS.list()).length;
    // the new templates trace without errors and are in the gallery
    out.tpls = ['uvvis', 'darkfield', 'evaporator', 'results', 'biosensor'].map(id => { const t = RNBX.templates.list.find(q => q.id === id); RNBX.setDocument(RNBX.normalizeDocument(t.build())); const svg = RNBX.render.build(RNBX.state.doc).svg; return [id, RNBX.templates.groupOf(id), svg.length > 2000 && !/NaN/.test(svg)]; });
    const df = RNBX.templates.list.find(q => q.id === 'darkfield'); RNBX.setDocument(RNBX.normalizeDocument(df.build()));
    const tr = RNBX.trace(RNBX.state.doc), spec = RNBX.state.doc.objects.find(o => o.type === 'spectrometer');
    out.dfLight = !!(tr.hits[spec.id] && tr.hits[spec.id].P > 0);
    return out;
  });
  H.check('Ctrl+K opens the palette; typing “mirror conc” and Enter adds a concave mirror', /concave/i.test(first) && added.includes('cmirror'), { first, added });
  H.check('the palette lists menu commands, styles, Studio tabs, templates and components', r.n > 300 && ['File', 'Edit', 'View', 'Studio', 'Template', 'Add'].every(g => r.groups.includes(g)), { n: r.n, groups: r.groups });
  H.check('search finds Export, the dark-field template and the Jablonski diagram', /Export/.test(r.export) && /Dark-field/.test(r.tpl) && /Add:Jablonski/.test(r.jab), [r.export, r.tpl, r.jab]);
  H.check('no match shows nothing', r.none === 0);
  H.check('a named and an automatic version are kept, each with a picture', r.versions.length === 2 && r.versions.every(v => v[3]) && r.versions.some(v => v[0] === 'first' && !v[1]) && r.versions.some(v => v[1]), r.versions);
  H.check('restoring a version is one step that Ctrl+Z takes back', r.restored === 1 && r.undone === 2, [r.restored, r.undone]);
  H.check('an automatic version can be kept by naming it; versions can be deleted', r.renamed && r.left === 1, r);
  H.check('five new templates render and sit in their gallery groups', r.tpls.every(t => t[2]) && r.tpls.find(t => t[0] === 'results')[1] === 'Results figures', r.tpls);
  H.check('dark-field template: the scattered light reaches the spectrometer', r.dfLight);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
