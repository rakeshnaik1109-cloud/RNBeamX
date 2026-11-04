/* Layer Studio stacks and the 'layers' part interact with traced beams */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · multilayer stacks in the beam path');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const run = objs => { const d = RNBX.newDocument(); d.objects = objs; return RNBX.trace(d); };
    const U = RNBX.util, out = {};
    // the stack's top face turned towards a laser coming along +x, tilted to 45°
    for (const rot of [-90, -45]) {
      const lay = mk('layers', 80, 50, rot, { layers: [{ name: 'Glass', mat: 'glass:N-BK7', t: 6, nm: 0, color: '#cfe3ef' }, { name: 'TiO₂', mat: 'TiO2', t: 3, nm: 60, color: '#e9e2c5' }] });
      const t = run([mk('laser', 20, 50, 0, { lambda: 532, power: 1, pol: 'V' }), lay]);
      const up = U.dirToWorld(lay, [0, -1]);
      const th = U.deg(Math.acos(Math.abs(up[0])));
      const st = RNBX.lib.get('layers').stack(Object.assign({}, lay.props, { side: 'top' }));
      const exp = (RNBX.thinfilm.solveThick || RNBX.thinfilm.solve)(st, 532, th, 's');
      const back = t.segments.filter(s => { const L = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]); return L > 1 && (s.b[0] - s.a[0]) / L < 0.9; });
      const Rtr = back.reduce((a, s) => Math.max(a, s.P), 0);
      out[rot] = { Rtr, R: exp.R, T: exp.T, th, n: t.segments.length };
    }
    // a design inserted from Layer Studio (its own stack, with the substrate back side)
    { const ST = RNBX.studio; ST.setDesign(ST.PRESETS.find(p => p.id === 'mim').make());
      RNBX.setDocument(RNBX.newDocument()); ST.insert({ asNew: true });
      const lay = RNBX.state.doc.objects.find(o => o.type === 'layers'); lay.rot = -90;
      const las = mk('laser', lay.x - 60, lay.y, 0, { lambda: 633, power: 1, pol: 'V' });
      const t = run([las, lay]), st = RNBX.studio.stackFromProps(Object.assign({}, lay.props, { side: 'top' }));
      const R = (RNBX.thinfilm.solveThick || RNBX.thinfilm.solve)(st, 633, 0, 's').R;
      const back = t.segments.filter(s => s.b[0] < s.a[0] - 1).reduce((a, s) => Math.max(a, s.P), 0);
      out.studio = { R, back }; }
    const off = mk('layers', 80, 50, -90, { traced: false });
    out.off = run([mk('laser', 20, 50, 0, { lambda: 532, power: 1 }), off]).segments.length;
    return out;
  });
  const near = (a, b) => Math.abs(a - b) < 0.02 * Math.max(b, 0.01);
  H.check('normal incidence on a TiO₂ / glass stack: the reflected beam carries the thin-film R', near(r[-90].Rtr, r[-90].R) && r[-90].R > 0.05, r[-90]);
  H.check('45° incidence: reflected beam with the s-polarised thin-film R', near(r[-45].Rtr, r[-45].R) && Math.abs(r[-45].th - 45) < 0.5, r[-45]);
  H.check('a stack inserted from Layer Studio reflects with its calculated R (MIM absorber: R ≈ 0.1 %)', !!r.studio && r.studio.back > 0 && near(r.studio.back, r.studio.R), r.studio);
  H.check('"Beams interact" off: the stack is an illustration again (the beam passes)', r.off === 1, r.off);
  await page.close();
};
