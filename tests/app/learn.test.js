/* Learn: every page builds, its demo traces, the physics checks out, and the dialog works */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Learn optics pages');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const ids = RNBX.learn.ids(), bad = [], noMath = [];
    const optical = RNBX.lib.all().filter(d => !d.hidden && d.optics && !d.annotation && !d.connection && d.type !== 'custom').map(d => d.type);
    ids.forEach(id => {
      const e = RNBX.learnContent.entries[id];
      try { const d = RNBX.learn.demoDoc(id); const s = RNBX.render.build(d).svg; if (s.length < 300 || /NaN|undefined/.test(s)) bad.push(id); } catch (err) { bad.push(id + ': ' + err.message); }
      if (!e.one || !(e.how || []).length) bad.push(id + ' (no text)');
      if (e.demo && !(e.math || []).length && !['screen', 'beamdump', 'chamber', 'module', 'hotplate', 'cagecube', 'cageplate', 'posstage', 'stage'].includes(id)) noMath.push(id);
    });
    const rd = id => Object.fromEntries(RNBX.learn.readings(RNBX.learn.demoDoc(id)).map(([n, P]) => [n, +P.toFixed(3)]));
    return { n: ids.length, basics: ids.filter(i => i.startsWith('c-')).length, bad, noMath, missing: optical.filter(t => !ids.includes(t)),
      malus: rd('c-pol'), hwp: rd('hwp'), bs: rd('bscube'), eom: rd('eom') };
  });
  H.check('Learn has the basics and a page for every optical part', r.basics >= 6 && r.missing.length === 0 && r.n > 60, { n: r.n, missing: r.missing });
  H.check('every page has text and a demo or picture that renders cleanly', r.bad.length === 0, r.bad);
  H.check('pages with a demo carry equations', r.noMath.length === 0, r.noMath);
  H.near('Malus’s law demo: H light through a polariser at 60° → 10 mW × cos²60° = 2.5 mW', r.malus.Detector, 2.5, 1e-3);
  H.check('λ/2 at 22.5° + PBS splits 5 / 5 mW; a 50:50 cube 5 / 5 mW; EOM at Vπ rotates H to V (10 mW through)', r.hwp.V === 5 && r.hwp.H === 5 && r.bs.Reflected === 5 && r.eom['Power meter'] === 10, r);
  const ui = await page.evaluate(async () => {
    document.querySelector('#btnLearn').click();
    await new Promise(res => setTimeout(res, 100));
    const first = document.querySelector('.learn-art h2').textContent;
    const s = document.querySelector('.learn-search'); s.value = 'quarter'; s.dispatchEvent(new Event('input'));
    const found = [...document.querySelectorAll('.learn-list button')].map(b => b.textContent);
    s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise(res => setTimeout(res, 50));
    const title = document.querySelector('.learn-art h2').textContent, eqs = document.querySelectorAll('.learn-eq').length;
    [...document.querySelectorAll('.learn-acts button')].find(b => /Open this demo/.test(b.textContent)).click();
    await new Promise(res => setTimeout(res, 50));
    return { first, found, title, eqs, open: !!document.querySelector('.learn-modal'), objs: RNBX.state.doc.objects.map(o => o.type).join(',') };
  });
  H.check('Learn button opens on the basics; search finds the quarter-wave plate; Enter opens it with its equations', ui.first.startsWith('Light') && ui.found.some(t => /Quarter/.test(t)) && /Quarter/.test(ui.title) && ui.eqs >= 2, ui);
  H.check('"Open this demo as a figure" loads the demo into the editor', !ui.open && /qwp/.test(ui.objs) && /pbs/.test(ui.objs), ui.objs);
  await page.evaluate(() => RNBX.learn.open('hwp')); await page.waitForTimeout(200); await H.shot(page, 'learn-hwp');
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
