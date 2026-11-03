/* Particles: size distributions and the colloid colour panel */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · particle size distribution and colloid colour');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } document.querySelectorAll('.modal-back').forEach(m => m.remove()); });
  await page.click('#btnStudio');
  const r = await page.evaluate(async () => {
    const PT = RNBX.particleStudio, ST = RNBX.studio; ST.mode = 'particles'; PT.load();
    const run = async dd => { PT.setDesign(dd); ST.rerender(); for (let i = 0; i < 400 && !PT.colour(); i++) await new Promise(r2 => setTimeout(r2, 50)); };
    const width = dd => { const xs = [], ys = []; for (let l = 450; l <= 650; l += 2) { const p = PT.ensemble(dd, l); xs.push(l); ys.push(p.Cext); } const m = Math.max(...ys), half = ys.filter(v => v > m / 2).length * 2; return { peak: xs[ys.indexOf(m)], half, m }; };
    const mono = PT.PRESETS.find(p => p.id === 'au40').make(), poly = Object.assign(JSON.parse(JSON.stringify(mono)), { spread: 25, core: { mat: 'Au', d: 60 } }), mono60 = Object.assign(JSON.parse(JSON.stringify(mono)), { core: { mat: 'Au', d: 60 } });
    const a = width(mono60), b = width(poly);
    await run(mono);
    const c = PT.colour(), panel = !!document.querySelector('.pt-colour svg');
    const before = RNBX.state.doc.objects.length; [...document.querySelectorAll('.pt-colour button')].find(x => /cuvette/.test(x.textContent)).click();
    const cuv = RNBX.state.doc.objects.find(o => o.type === 'cuvette');
    return { a, b, samples: PT.samples(poly).length, colour: c && c.t.hex, panel, cuvette: cuv && cuv.props.liquid, added: RNBX.state.doc.objects.length - before };
  });
  H.check('a size spread averages over 11 sizes', r.samples === 11, r.samples);
  H.check('σ = 25 % broadens the plasmon band (big particles weigh more, ~d³)', r.b.half > r.a.half + 6, [r.a, r.b]);
  H.check('the colour panel shows the cuvette and dark-field swatches', r.panel && /^#[0-9a-f]{6}$/.test(r.colour), r.colour);
  H.check('“Add a cuvette” puts a cuvette with that colour into the figure', r.added === 1 && r.cuvette === r.colour, r);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
