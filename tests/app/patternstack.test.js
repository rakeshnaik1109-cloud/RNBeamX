/* Layer Studio ▸ Pattern: multilayer + patterned stacks — repeat groups, the Layers-tab stack, coatings */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Pattern: repeat groups, stacks and coatings');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio');
  await page.click('.st-tabs >> text=Pattern');
  await page.waitForFunction(() => document.querySelector('.st-spec svg'), null, { timeout: 30000 });

  // a repeat group gives exactly the same answer as the same films written out
  const same = await page.evaluate(() => {
    const PS = RNBX.patternStudio, RC = RNBX.rcwa, d = PS.PRESETS.find(p => p.id === 'bsw').make();
    const flat = JSON.parse(JSON.stringify(d)); flat.layers = RC.flatLayers(d.layers).map(L => JSON.parse(JSON.stringify(L)));
    const a = PS.orders(d), b = PS.orders(flat), n = RC.flatLayers(d.layers).length;
    const tot = RC.flatLayers(d.layers).reduce((s, L) => s + L.nm, 0), geoT = PS.geo(d).slices.reduce((s, q) => s + q.d, 0);
    return { n, dR: Math.abs(a.R - b.R), dT: Math.abs(a.T - b.T), tot, geoT };
  });
  H.check('a repeat group (×6) solves exactly like the films written out', same.n === 14 && same.dR < 1e-9 && same.dT < 1e-9 && Math.abs(same.tot - same.geoT) < 1e-6, same);

  // tick two films, group them, change the repeat, ungroup
  const ui = await page.evaluate(async () => {
    const PS = RNBX.patternStudio, wait = () => new Promise(r => setTimeout(r, 60));
    PS.setDesign(PS.PRESETS.find(p => p.id === 'lamellar').make());
    const btn = t => [...document.querySelectorAll('.studio button')].find(b => b.textContent === t);
    btn('+ Film at the bottom').click(); await wait(); btn('+ Film at the bottom').click(); await wait();
    const boxes = [...document.querySelectorAll('.st-list .ps-rowck input[type=checkbox]')];
    boxes[1].click(); boxes[2].click(); await wait();
    btn('Repeat ticked').click(); await wait();
    const d = PS.design(), grouped = d.layers.length === 2 && d.layers[1].group && d.layers[1].items.length === 2;
    const rep = document.querySelector('.ps-rgroup input.st-rep'); rep.value = '5'; rep.dispatchEvent(new Event('input')); await wait();
    const flatN = RNBX.rcwa.flatLayers(PS.design().layers).length;
    btn('Ungroup').click(); await wait();
    const after = PS.design().layers.length, independent = PS.design().layers[1] !== PS.design().layers[3];
    return { grouped, flatN, after, independent };
  });
  H.check('ticked films become a repeat group; ×5 gives 11 layers; Ungroup writes them out', ui.grouped && ui.flatN === 11 && ui.after === 11 && ui.independent, ui);

  // the Layers-tab stack, with its repeat group and substrate
  const imp = await page.evaluate(async () => {
    const ST = RNBX.studio, PS = RNBX.patternStudio;
    ST.setDesign(ST.PRESETS.find(p => p.id === 'dbr').make());
    PS.setDesign(PS.PRESETS.find(p => p.id === 'lamellar').make());
    [...document.querySelectorAll('.studio button')].find(b => b.textContent === '+ Stack from the Layers tab').click();
    await new Promise(r => setTimeout(r, 60));
    const d = PS.design(), g = d.layers[d.layers.length - 1], o = PS.orders(d);
    return { group: !!g.group, repeat: g.repeat, items: g.items.length, shapes: (g.items[0].shapes || []).length, ok: isFinite(o.R) && o.R + o.T <= 1 + 1e-6 };
  });
  H.check('“Stack from the Layers tab” brings in the films and their repeat group', imp.group && imp.repeat === 8 && imp.items === 2 && imp.shapes === 0 && imp.ok, imp);

  // coatings in every mode, 1D ridges and 2D holes
  const coat = await page.evaluate(() => {
    const PS = RNBX.patternStudio, out = {};
    const run = (id, o) => { const d = PS.PRESETS.find(p => p.id === id).make(), L = d.layers[0], msg = PS.coat(d, L, o), r = PS.orders(d); return { n: d.layers.length, shapes: d.layers.map(q => (q.shapes || []).length), ok: isFinite(r.R) && r.R >= -1e-6 && r.R + r.T <= 1 + 1e-6, msg: !!msg, d }; };
    const top = run('lamellar', { mode: 'top', mat: 'Au', t: 30 });
    out.top = { n: top.n, shapes: top.shapes, ok: top.ok, capW: top.d.layers[0].shapes[0].wb, baseMat: top.d.layers[2].mat };
    const conf = run('lamellar', { mode: 'conformal', mat: 'Al2O3', t: 20 });
    out.conf = { n: conf.n, shapes: conf.shapes, ok: conf.ok, shell: conf.d.layers[1].shapes[0].wb, core: conf.d.layers[1].shapes[1].wb, cap: conf.d.layers[0].shapes[0].wb };
    const fill = run('lamellar', { mode: 'fill', mat: 'SiO2', t: 50 });
    out.fill = { n: fill.n, ok: fill.ok, mat: fill.d.layers[1].mat };
    const holes = run('holes', { mode: 'conformal', mat: 'SiO2', t: 15 });
    out.holes = { n: holes.n, ok: holes.ok, inner: holes.d.layers[1].shapes[1].rx, outer: holes.d.layers[1].shapes[0].rx };
    let threw = false; try { const d = PS.PRESETS.find(p => p.id === 'sine').make(); PS.coat(d, d.layers[0], { mode: 'top', mat: 'Au', t: 10 }); } catch (e) { threw = true; }
    out.sineRefused = threw;
    return out;
  });
  H.check('coating from above: a cap on the ridge tops and a coated base, ridge width kept', coat.top.n === 3 && coat.top.ok && coat.top.capW === 200 && coat.top.baseMat === 'Au', coat.top);
  H.check('conformal coating: a 20 nm shell round the ridge and a wider cap', coat.conf.ok && coat.conf.shell === coat.conf.core + 40 && coat.conf.cap === 240, coat.conf);
  H.check('fill: the gaps become the coating material, plus a film on top', coat.fill.n === 2 && coat.fill.ok && coat.fill.mat === 'SiO2', coat.fill);
  H.check('conformal coating of holes in a metal film narrows the holes', coat.holes.ok && coat.holes.outer - coat.holes.inner === 15, coat.holes);
  H.check('a sinusoidal profile can only be filled', coat.sineRefused);

  // a grouped design goes into the figure and draws
  const fig = await page.evaluate(() => {
    const PS = RNBX.patternStudio; PS.setDesign(PS.PRESETS.find(p => p.id === 'bsw').make());
    const obj = PS.insert({ periods: 4, panel: false }); RNBX.studio.close();
    const svg = RNBX.render.build(RNBX.state.doc).svg, st = RNBX.lib.get('ucell').stack(obj.props);
    return { nan: /NaN/.test(svg), films: st.layers.length };
  });
  H.check('a design with repeat groups inserts and draws in the figure', !fig.nan && fig.films === 14, fig);
  await page.close();
};
