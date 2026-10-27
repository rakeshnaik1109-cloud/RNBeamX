/* Editing features: reset and undo, groups, stacking, calculated panels, animation, layout, old files */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · editing features');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const S = RNBX.state, C = RNBX.canvas, out = {};
    const add = (t, x, y, props, rot) => { const o = RNBX.createObject(t, x, y); Object.assign(o.props, props || {}); if (rot != null) o.rot = rot; RNBX.addObject(o, false); return o; };
    // reset + undo
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'michelson').build());
    const n0 = S.doc.objects.length; document.getElementById('tReset').click();
    out.reset = [n0, S.doc.objects.length]; RNBX.history.undo(); out.reset.push(S.doc.objects.length);
    // groups keep optics working
    RNBX.setDocument(RNBX.newDocument('nature-2'));
    const L = add('laser', 20, 40), M = add('mirror', 60, 40, {}, 135), D = add('pd', 60, 70, {}, -90), sh = add('shape3d', 30, 20);
    const g = RNBX.groups.group([L.id, M.id, sh.id], 'Module');
    out.groupHit = !!RNBX.trace(S.doc).hits[D.id] && S.doc.objects.length === 2;
    RNBX.groups.ungroup([g.id]); out.ungroup = S.doc.objects.map(o => o.type).sort().join(',');
    RNBX.groups.save({ type: 'group', props: g.props }, 'Module'); out.mylib = document.getElementById('palette').textContent.includes('Module');
    // stacking blocks, conformal coating, calculation from the stack
    RNBX.setDocument(RNBX.newDocument('nature-2'));
    const s = C.placeNew({ type: 'nslab', props: { name: 'Glass', mat: 'glass:N-BK7' } }, [60, 50]); RNBX.select([s.id]);
    const au = C.placeNew({ type: 'ncoat', props: { name: 'Au', mat: 'Au', nm: 50 } }, [0, 0]);
    out.stack = [au.props.on === s.id, au.x === s.x];
    s.x += 10; RNBX.changed(); out.follows = au.x === s.x;
    const st = RNBX.lib.get('ncoat').stack(au.props, au, S.doc); out.stackLayers = st.layers.map(l => l.m.mat + ':' + l.d).join(',') + '|' + st.sub.mat;
    // linked data panel follows a change
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'spr').build());
    const pr = S.doc.objects.find(o => o.type === 'prism'), res1 = RNBX.plotData.calcResult(pr);
    pr.props.analyte = 'custom'; pr.props.analyteN = 1.343; RNBX.changed();
    const res2 = RNBX.plotData.calcResult(pr), TF = RNBX.thinfilm;
    out.sprShift = TF.extremum(res2.x, res2.series.R).x - TF.extremum(res1.x, res1.series.R).x;
    // animation interpolates nested settings
    const A = RNBX.anim; A.setTime(0); pr.props.analyteN = 1.333; A.addKey([pr.id]); A.setTime(4); pr.props.analyteN = 1.343; pr.props.calc = Object.assign({}, pr.props.calc, { angle: 53 }); A.addKey([pr.id]);
    A.setTime(2); const mid = S.doc.objects.find(o => o.id === pr.id); out.anim = [mid.props.analyteN, mid.props.calc.angle];
    // layout: tidy and fit-to-width
    RNBX.setDocument(RNBX.newDocument('nature-2'));
    add('laser', 20, 40); const f1 = add('filter', 50.6, 40.7), f2 = add('hwp', 79.2, 39.4), f3 = add('polarizer', 111, 40.3); add('pd', 140, 40);
    RNBX.layout.tidy(); out.tidy = [f1.y, f2.y, f3.y, f2.x];
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'gaussian').build());
    const w0 = Object.values(RNBX.trace(S.doc).hits)[0].w; RNBX.layout.scaleFigure(89 / S.doc.page.width, 'nature-1');
    out.fit = [S.doc.page.width, w0, Object.values(RNBX.trace(S.doc).hits)[0].w, S.doc.style.fontSizePt];
    const o = { x: 61.2, y: 50 }; RNBX.layout.smartSnap(o, [{ x: 20, y: 50 }, { x: 40, y: 50.5 }], 3); out.smart = o.x;
    // old files with removed parts still open
    const old = RNBX.newDocument(); old.objects = [{ id: 'a', type: 'molecule', x: 1, y: 1, props: {} }, RNBX.createObject('laser', 20, 20)];
    RNBX.setDocument(old); out.old = S.doc.objects.map(q => q.type).join(',');
    // custom SVG import is sanitised; data panel from CSV
    const im = RNBX.lib.importSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" onclick="alert(1)"/><script>alert(2)</script></svg>', 'x-');
    out.svgSafe = !/script|onclick/.test(im.svg);
    RNBX.setDocument(RNBX.newDocument('nature-2')); const pl = RNBX.arrange.addDataPanel(RNBX.plotData.parse('x,a,b\n1,2,3\n2,3,1\n3,1,2')); out.plot = pl.props.series.length;
    return out;
  });
  H.check('Reset empties the figure and Undo brings it back', r.reset[1] === 0 && r.reset[2] === r.reset[0], r.reset);
  H.check('a grouped laser and mirror still send the beam to the detector', r.groupHit);
  H.check('ungroup restores the parts', r.ungroup === 'laser,mirror,pd,shape3d', r.ungroup);
  H.check('a saved group appears in My components', r.mylib);
  H.check('a block clicked with a block selected stacks on it', r.stack.every(Boolean), r.stack);
  H.check('stacked blocks follow the block below', r.follows);
  H.check('the stack becomes a calculable film stack', r.stackLayers === 'Au:50|glass:N-BK7', r.stackLayers);
  H.check('a higher analyte index moves the SPR dip in the linked panel', r.sprShift > 3, r.sprShift);
  H.near('keyframes interpolate the analyte index', r.anim[0], 1.338, 1e-6);
  H.near('keyframes interpolate nested settings (calculation angle)', r.anim[1], (52.22 + 53) / 2, 0.2);
  H.check('Tidy puts optics exactly on the beam', r.tidy.slice(0, 3).every(y => Math.abs(y - 40) < 1e-6), r.tidy);
  H.check('Tidy evens out a nearly even run', Math.abs(r.tidy[3] - 80.8) < 0.01, r.tidy[3]);
  H.check('Fit to 89 mm keeps the physics (beam radius) and the type size', r.fit[0] === 89 && Math.abs(r.fit[2] - r.fit[1]) < 1e-4 && r.fit[3] === 7, r.fit);
  H.near('equal-spacing guide snaps to the repeated gap', r.smart, 60, 1e-9);
  H.check('old files with removed parts open without them', r.old === 'laser', r.old);
  H.check('imported SVG drawings are stripped of scripts and event handlers', r.svgSafe);
  H.check('a data panel is created from CSV', r.plot === 2, r.plot);
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
