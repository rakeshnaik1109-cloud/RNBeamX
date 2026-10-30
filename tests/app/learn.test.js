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
  // Learn is its own page (like the guide): the button links to it in a new tab
  const btn = await page.evaluate(() => { const b = document.querySelector('#btnLearn'); return { tag: b.tagName, href: b.getAttribute('href'), target: b.target }; });
  H.check('the Learn button opens learn.html in a new tab', btn.tag === 'A' && btn.href === 'learn.html' && btn.target === '_blank', btn);
  const lp = await page.context().newPage();
  const lerr = []; lp.on('pageerror', e => lerr.push(e.message));
  await lp.goto(base.replace(/index\.html.*$/, '').replace(/\/?$/, '/') + 'learn.html#qwp');
  await lp.waitForTimeout(400);
  const ui = await lp.evaluate(async () => {
    const title = document.querySelector('.learn-art h2').textContent, eqs = document.querySelectorAll('.learn-eq').length;
    const svg = document.querySelector('.learn-svg svg'), clip = svg.querySelector('g[clip-path]');
    const ownClip = clip ? !!svg.querySelector('[id="' + clip.getAttribute('clip-path').slice(5, -1) + '"]') : true;
    const s = document.querySelector('.learn-search'); s.value = 'quarter'; s.dispatchEvent(new Event('input'));
    s.value = 'polariser'; s.dispatchEvent(new Event('input')); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await new Promise(r => setTimeout(r, 50));
    const demo = document.querySelector('.learn-acts a');
    return { title, eqs, ownClip, after: document.querySelector('.learn-art h2').textContent, hash: location.hash, demoHref: demo && demo.getAttribute('href') };
  });
  H.check('learn.html#qwp opens the quarter-wave plate page with its equations; each drawing uses its own clip path', /Quarter/.test(ui.title) && ui.eqs >= 2 && ui.ownClip, ui);
  H.check('search + Enter opens the best match and the address follows it (deep links)', /polariser/i.test(ui.after) && ui.hash === '#polarizer', ui);
  H.check('"Open this demo" links to the editor with the demo', /index\.html\?learn=polarizer/.test(ui.demoHref || ''), ui.demoHref);
  H.check('Learn page: no errors', lerr.length === 0, lerr.join(' | '));
  await lp.goto(base.replace(/index\.html.*$/, '').replace(/\/?$/, '/') + 'index.html?learn=hwp');
  await lp.waitForTimeout(600);
  const ed = await lp.evaluate(() => ({ types: RNBX.state.doc.objects.map(o => o.type).join(','), url: location.search, undo: RNBX.history && RNBX.history.canUndo ? RNBX.history.canUndo() : null }));
  H.check('index.html?learn=hwp opens that demo in the editor (and cleans the address)', /hwp/.test(ed.types) && /pbs/.test(ed.types) && ed.url === '', ed);
  await lp.close();
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
