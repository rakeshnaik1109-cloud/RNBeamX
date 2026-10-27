/* Grating calculation inside the app: blocks → slices, background worker, linked panel */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · grating calculation (RCWA) from blocks');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const S = RNBX.state, C = RNBX.canvas, RC = RNBX.rcwa, L = RNBX.lib, out = {};
    RNBX.setDocument(RNBX.newDocument('nature-2'));
    const s = C.placeNew({ type: 'nslab', props: { mat: 'glass:N-BK7' } }, [60, 60]); RNBX.select([s.id]);
    const g = C.placeNew({ type: 'nridges', props: { mat: 'SiO2', periodNm: 600, heightNm: 200, duty: 0.5, profile: 'square' } }, [0, 0]);
    const geo = L.get('nridges').grating(g.props, g, S.doc), lam = 700;
    const nS = RNBX.thinfilm.nk({ mat: 'SiO2' }, lam).n, nG = RNBX.optics.index('N-BK7', lam);
    out.slices = geo.slices.length;
    out.blocks = RC.solve(RC.problemAt(geo, lam), lam, 10, 'p').R;
    out.manual = RC.solve({ period: 600, orders: geo.orders, inc: 0, sub: 1, eps: [[1, 0], [nG * nG, 0], [nS * nS, 0]], slices: [{ d: 200, runs: [{ a: 0.25, b: 0.75, m: 2 }, { a: 0.75, b: 1.25, m: 0 }] }] }, lam, 10, 'p').R;
    // background scan through the linked panel
    g.props.calc = Object.assign({}, g.props.calc, { scan: 'wl', lmin: 500, lmax: 900, pol: 'p', rpoints: 21, orders: 10 });
    RNBX.select([g.id]); RNBX.plotData.addCalcPanel(g);
    const first = RNBX.plotData.calcResult(g);
    out.pending = !!first.pending;
    return out;
  });
  H.check('a rectangular grating from blocks is one exact slice', r.slices === 1, r.slices);
  H.near('grating from blocks = the same grating written by hand', r.blocks, r.manual, 1e-9);
  H.check('the scan starts in the background', r.pending);
  await page.waitForFunction(() => { const g = RNBX.state.doc.objects.find(o => o.type === 'nridges'); const x = RNBX.plotData.calcResult(g); return x && x.x && !x.pending; }, null, { timeout: 60000 });
  const done = await page.evaluate(() => { const g = RNBX.state.doc.objects.find(o => o.type === 'nridges'), x = RNBX.plotData.calcResult(g); return { method: x.method, n: x.x.length, ok: x.series.R.every((v, i) => v >= 0 && v + x.series.T[i] <= 1 + 1e-6) }; });
  H.check('the background (Web Worker) scan finishes with RCWA results', done.method === 'rcwa' && done.n === 21, done);
  H.check('R and T are physical (0 ≤ R, R + T ≤ 1) for a lossless grating', done.ok);
  await H.shot(page, 'rcwa-panel', '#stage');
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
