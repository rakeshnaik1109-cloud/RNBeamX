/* Layer Studio: ellipsometry (Ψ, Δ) and its fit, roughness, mixtures, thick substrates;
   Particles: a sphere on a mirror (NPoM) */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Layer Studio ellipsometry, roughness, mixtures; particle on a mirror');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio');
  const r = await page.evaluate(async () => {
    const ST = RNBX.studio, TF = RNBX.thinfilm, wait = ms => new Promise(res => setTimeout(res, ms)), out = {};
    const d = ST.PRESETS.find(p => p.id === 'film').make();
    d.items = [{ name: 'SiO₂', color: '#8fc9b9', mat: 'SiO2', nm: 100, tag: '', rough: 1 }]; d.substrate = { name: 'Si', color: '#6c7a89', mat: 'Si', nm: 0, tag: '' };
    d.calc = Object.assign(d.calc, { scan: 'wl', lmin: 400, lmax: 1000, angle: 70, show: 'PD', points: 301 });
    ST.setDesign(d); await wait(150);
    out.chart = /Δ \(right axis\)/.test(document.querySelector('.st-spec').textContent);
    out.roughBand = /roughness/.test(document.querySelector('.st-cross').textContent);
    out.layers = ST.stack(ST.design()).layers.length;
    // synthetic ellipsometry of a "true" sample: 123.4 nm with 3.2 nm roughness
    const t = JSON.parse(JSON.stringify(d)); t.items[0].nm = 123.4; t.items[0].rough = 3.2;
    const st = ST.stack(t), rows = ['wavelength,Psi,Delta'];
    for (let l = 400; l <= 1000; l += 5) { const e = TF.ellips(st, l, 70); rows.push(l + ',' + e.psi.toFixed(4) + ',' + e.delta.toFixed(4)); }
    RNBX.layerFit.load(RNBX.plotData.parse(rows.join('\n')), 'ellipsometry.csv'); await wait(200);
    out.q = [...document.querySelectorAll('.lf-panel select')].map(s => s.value);
    [...document.querySelectorAll('.lf-tab input[type=checkbox]')].forEach(b => b.click());
    [...document.querySelectorAll('.studio button')].find(b => b.textContent === 'Fit').click();
    for (let i = 0; i < 400 && !document.querySelector('.lf-panel .readout'); i++) await wait(100);
    const f = ST.flat(ST.design())[0]; out.fit = [f.nm, f.rough];
    // a porous (mixture) film and the back side of a thick glass substrate
    const g = ST.PRESETS.find(p => p.id === 'film').make();
    g.items = [{ name: 'Porous', color: '#cccccc', mat: 'ema', nm: 120, tag: '', ema: { a: 'SiO2', b: 'air', f: 0.4, model: 'bruggeman' } }];
    g.calc = Object.assign(g.calc, { show: 'R', angle: 0, pol: 's' });
    ST.setDesign(g); await wait(150);
    out.emaRow = !!document.querySelector('.st-ema');
    const R0 = TF.response(ST.stack(ST.design()), 550, 0, 's').R;
    g.substrate.back = true; g.substrate.thick = 1; ST.setDesign(g); await wait(100);
    out.back = [R0, TF.response(ST.stack(ST.design()), 550, 0, 's').R];
    // into the figure: the Multilayer part keeps the mixture and the back side
    const props = ST.toProps(ST.design()), part = RNBX.lib.get('layers'), sf = part.stack(props);
    out.figure = Math.abs(TF.response(sf, 550, 0, 's').R - out.back[1]) < 1e-12;
    // Particles: Au nanoparticle on a Au mirror
    ST.mode = 'particles'; const PT = RNBX.particleStudio; PT.load(); PT.setDesign(PT.PRESETS.find(p => p.id === 'npom').make()); ST.rerender();
    const P = PT.point(PT.design(), 800), P2 = PT.point(Object.assign(JSON.parse(JSON.stringify(PT.design())), { gap: 4 }), 800);
    out.npom = { E2: P.E2, E2wide: P2.E2, Csca: P.Csca };
    for (let i = 0; i < 300 && !document.querySelector('.st-field svg'); i++) await wait(100);
    out.field = !!document.querySelector('.st-field svg') && /substrate/.test(document.querySelector('.st-field').textContent);
    return out;
  });
  H.check('Ψ and Δ are plotted (two axes)', r.chart);
  H.check('roughness is a layer of the solver and is drawn in the cross-section', r.layers === 2 && r.roughBand, r);
  H.check('a three-column file (λ, Ψ, Δ) is read as ellipsometry', r.q.includes('PD'), r.q);
  H.check('ellipsometry fit recovers thickness 123.4 nm and roughness 3.2 nm', Math.abs(r.fit[0] - 123.4) < 0.05 && Math.abs(r.fit[1] - 3.2) < 0.05, r.fit);
  H.check('a mixture film shows its parts, fraction and model', r.emaRow);
  H.check('the back side of a 1 mm glass substrate adds reflection', r.back[1] > r.back[0] + 0.02, r.back);
  H.check('inserted into the figure, the Multilayer part keeps mixture and back side', r.figure);
  H.check('NPoM: gap field ~10⁵ at 1 nm, falling as the gap opens', r.npom.E2 > 3e4 && r.npom.E2 < 1e6 && r.npom.E2wide < r.npom.E2 / 5, r.npom);
  H.check('NPoM near-field map drawn with the substrate', r.field);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
