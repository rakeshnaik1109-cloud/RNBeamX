/* Setup from text: parsing, focal spacing along the folded beam, orientation, branches */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · setup from text');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const ST = RNBX.setupText, out = {};
    const pos = (doc, pred) => doc.objects.find(pred);
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    // 1. parsing
    { const p = ST.parse('HeNe → Pol 45° → L1 f=150 → 80 mm → QWP 22.5 deg → M2 down → "Sensor" CCD → Flux capacitor');
      const it = p.chains[0].items;
      out.parse = { types: it.filter(e => !e.gap).map(e => e.type).join(','), lam: it[0].props.lambda, polA: it[1].props.angle, f: it[2].props.f, lab: it[2].label,
        gap: it[3].gap, qwp: it[4].props.angle, mdir: it[5].dir, mlab: it[5].label, ccdLab: it[6].label, warn: p.warnings.some(w => /Flux capacitor/.test(w)) }; }
    // 2. telescope + camera at the focus, figure scale 10: L1–L2 = (100 + 200)/10, L2–CAM = 200/10
    { const b = ST.build('Laser 633 nm → L1 f=100 → L2 f=200 → CAM', { scale: 10 }), d = b.doc;
      const L = d.objects.filter(o => o.type === 'lens'), cam = pos(d, o => o.type === 'camera');
      const t = RNBX.trace(d);
      out.tele = { l12: dist(L[0], L[1]), l2c: dist(L[1], cam), hit: !!t.hits[cam.id], f: L.map(o => o.props.f), warn: b.warnings }; }
    // 3. a fold between two lenses keeps f1 + f2 along the beam
    { const b = ST.build('Laser → L1 f=100 → M → L2 f=100 → PD', { scale: 10 }), d = b.doc;
      const L = d.objects.filter(o => o.type === 'lens'), m = pos(d, o => o.type === 'mirror'), pd = pos(d, o => o.type === 'pd');
      out.fold = { path: dist(L[0], m) + dist(m, L[1]), turned: Math.abs(L[1].x - m.x) < 0.5 && L[1].y < m.y - 1, hit: !!RNBX.trace(d).hits[pd.id] }; }
    // 4. an explicit distance, and "M down"
    { const b = ST.build('Laser → 150 mm → L1 f=50 → M down → PD', { scale: 10 }), d = b.doc;
      const las = pos(d, o => o.type === 'laser'), L = pos(d, o => o.type === 'lens'), m = pos(d, o => o.type === 'mirror'), pd = pos(d, o => o.type === 'pd');
      const t = RNBX.trace(d), s0 = t.segments.find(s => s.kind === 'beam');   // measured from the laser's output port
      out.gap = { g: Math.hypot(L.x - s0.a[0], L.y - s0.a[1]), down: pd.y > m.y + 1, hit: !!t.hits[pd.id] }; }
    // 5. a branch from a beam splitter's reflected port
    { const b = ST.build('Laser 633 nm → BS1 → L1 f=100 → CCD\nBS1 down → M → PD'), d = b.doc, t = RNBX.trace(d);
      const pd = pos(d, o => o.type === 'pd'), cam = pos(d, o => o.type === 'camera'), bs = pos(d, o => o.type === 'bsplate');
      out.branch = { pd: !!t.hits[pd.id], cam: !!t.hits[cam.id], below: pd.y > bs.y + 1, warn: b.warnings }; }
    // 6. every example builds, fits the page, and its beam reaches the last part
    out.ex = ST.EXAMPLES.map(([name, txt]) => { const b = ST.build(txt), d = b.doc, t = RNBX.trace(d), last = d.objects[d.objects.length - 1];
      const inside = d.objects.every(o => { const bb = RNBX.lib.worldBox(o); return bb[0] >= -0.5 && bb[1] >= -0.5 && bb[2] <= d.page.width + 0.5 && bb[3] <= d.page.height + 0.5; });
      return { name, n: b.count, hit: !!t.hits[last.id], inside, warn: b.warnings.length }; });
    // 7. not starting with a source is reported
    out.nosrc = ST.build('L1 f=100 → CCD').warnings.some(w => /light source/.test(w));
    return out;
  });
  const p = r.parse;
  H.check('parsing: names, tags as labels, f=, nm, °, distances, directions, quoted labels', p.types === 'laser,polarizer,lens,qwp,mirror,camera' && p.lam === 633 && p.polA === 45 && p.f === 150 && p.lab === 'L1' && p.gap === 80 && p.qwp === 22.5 && p.mdir === 90 && p.mlab === 'M2' && p.ccdLab === 'Sensor', p);
  H.check('an unknown part name is reported, not guessed', p.warn, p);
  H.check('telescope: lenses f1 + f2 apart and the camera at the focus (figure scale applied)', Math.abs(r.tele.l12 - 30) < 0.01 && Math.abs(r.tele.l2c - 20) < 0.01 && r.tele.hit && !r.tele.warn.length, r.tele);
  H.check('a mirror between two lenses folds the beam and keeps f1 + f2 along it', Math.abs(r.fold.path - 20) < 0.05 && r.fold.turned && r.fold.hit, r.fold);
  H.check('an explicit distance fixes the gap (from the laser’s output); "M down" turns the beam down', Math.abs(r.gap.g - 15) < 0.01 && r.gap.down && r.gap.hit, r.gap);
  H.check('a branch line follows the splitter\'s reflected beam to its detector', r.branch.pd && r.branch.cam && r.branch.below && !r.branch.warn.length, r.branch);
  H.check('all examples build on the page, traced to their last part, without warnings', r.ex.every(e => e.n > 3 && e.hit && e.inside && !e.warn), r.ex);
  H.check('a chain without a light source is reported', r.nosrc, r.nosrc);
  await page.close();
};
