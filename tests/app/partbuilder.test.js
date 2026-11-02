/* Part Builder (Layer Studio ▸ Part): geometry, optics of built parts, editor, figure, library */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Part Builder');
  const page = await H.openApp(await getBrowser(), base);
  // optics of built parts, traced in a small figure
  const r = await page.evaluate(() => {
    const P = RNBX.partBuilder, out = {};
    const run = (design, test) => {
      const d = RNBX.newDocument(); d.page.width = 300; d.page.height = 200;
      const part = RNBX.createObject('built', 150, 100); part.props.design = design;
      const src = RNBX.createObject('raysource', 150 + (test.x || -30), 100 + (test.y || 0)); Object.assign(src.props, { mode: 'parallel', h: test.h || 2, rays: test.rays || 3, tilt: 0, lambda: test.lambda || 587.56, colors: 'single' });
      d.objects = [part, src];
      const doc = RNBX.normalizeDocument(d), tr = RNBX.trace(doc);
      return { tr, part };
    };
    const cross = (tr, y0 = 100) => tr.segments.filter(s => s.end === 'open' && Math.abs(s.b[1] - s.a[1]) > 1e-9 && Math.abs(s.a[1] - y0) > 1e-6).map(s => { const t = (y0 - s.a[1]) / (s.b[1] - s.a[1]); return s.a[0] + t * (s.b[0] - s.a[0]) - 150; });
    // plano-convex lens, curved side to the light: back focal length = f − tc/n
    const pcx = P.PRESETS.find(p => p.id === 'pcx').make(), n = RNBX.optics.index('N-BK7', 587.56), f = 25 / (n - 1), bfl = f - 5 / n;
    const a = run(pcx, { h: 0.6, rays: 2 }); out.lens = { measured: cross(a.tr).map(x => x - 2.5), expected: bfl };
    // concave spherical mirror R = 50: focus at R/2 in front of it (small aperture)
    const cm = P.PRESETS.find(p => p.id === 'concave').make(); const b = run(cm, { h: 0.6, rays: 2 });
    out.mirror = cross(b.tr).map(x => -x);
    // off-axis parabola: every ray goes to the focus exactly
    const oap = P.PRESETS.find(p => p.id === 'oap').make(); const c = run(oap, { y: 24, h: 10, rays: 7, x: -40 });
    const fin = c.tr.segments.filter(s => s.end === 'open' && s.a[1] > 100), dist = fin.map(s => { const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l = Math.hypot(dx, dy), fx = 150 - 12, fy = 100; return Math.abs((fx - s.a[0]) * dy - (fy - s.a[1]) * dx) / l; });
    out.oap = { n: fin.length, worst: Math.max(...dist) };
    // cube beam splitter: half goes on, half is turned by 90°
    const cube = P.PRESETS.find(p => p.id === 'cube').make(); const e = run(cube, { h: 0.2, rays: 1 });
    const outs = e.tr.segments.filter(s => s.end === 'open' && !s.ghost), P0 = outs.reduce((q, s) => q + s.P, 0);
    out.cube = { n: outs.length, turned: outs.filter(s => Math.abs(s.b[0] - s.a[0]) < 1e-6).reduce((q, s) => q + s.P, 0) / P0 };
    // a glass block with a mirror-coated back face sends the light back
    const blk = { name: 'Block', shapes: [{ id: 'b1', kind: 'rect', op: 'add', x: 0, y: 0, rot: 0, w: 10, h: 10 }], curves: [], sources: [], body: { kind: 'glass', mat: 'N-BK7', faces: { 'b1:right': 'mirror' } }, d3: { mode: 'extrude', h: 10 }, look: {} };
    const g = run(blk, { h: 0.2, rays: 1 }); const back = g.tr.segments.filter(s => s.end === 'open');
    out.coated = back.length >= 1 && back.every(s => s.b[0] < s.a[0]);
    // opaque housing with a bore: only the light in the bore passes
    const hs = P.PRESETS.find(p => p.id === 'housing').make(); const k = run(hs, { h: 10, rays: 11 });
    out.housing = { through: k.tr.segments.filter(s => s.end === 'open' && s.b[0] > 250).length, absorbed: (k.tr.hits[k.part.id] || {}).P > 0 };
    // a part with its own beam source
    const lz = P.PRESETS.find(p => p.id === 'laser').make(), dl = RNBX.newDocument(); dl.page.width = 300; dl.page.height = 200; const pl = RNBX.createObject('built', 100, 100); pl.props.design = lz; dl.objects = [pl];
    const tl = RNBX.trace(RNBX.normalizeDocument(dl)); out.source = tl.segments.some(s => Math.abs(s.lambda - 532) < 1e-6 && s.b[0] > s.a[0]);
    // geometry: union and cut give the right faces and a hole
    const geo = RNBX.partGeo.outline([{ id: 'a', kind: 'rect', op: 'add', x: 0, y: 0, w: 10, h: 10 }, { id: 'h', kind: 'ellipse', op: 'cut', x: 0, y: 0, rx: 2, ry: 2 }]);
    out.geo = { rings: geo.rings.length, holes: geo.rings.filter(q => q.hole).length, faces: RNBX.partGeo.faces(geo).map(q => q.key).sort().join(',') };
    return out;
  });
  H.check('plano-convex lens: back focal length f − t/n (paraxial)', r.lens.measured.length === 2 && r.lens.measured.every(x => Math.abs(x - r.lens.expected) < 0.15), r.lens);
  H.check('spherical mirror: focus at R/2', r.mirror.length === 2 && r.mirror.every(x => Math.abs(x - 25) < 0.05), r.mirror);
  H.check('off-axis parabola: every ray through the focus', r.oap.n >= 7 && r.oap.worst < 0.02, r.oap);
  H.check('cube beam splitter: 50 % turned by 90°', r.cube.n === 4 && Math.abs(r.cube.turned - 0.5) < 0.02, r.cube);
  H.check('a mirror-coated face sends the light back', r.coated);
  H.check('opaque housing: only the bore lets light through', r.housing.through >= 1 && r.housing.through < 11 && r.housing.absorbed, r.housing);
  H.check('a built part can be a light source', r.source);
  H.check('cut shapes make holes; every face is named', r.geo.rings === 2 && r.geo.holes === 1 && r.geo.faces === 'a:bottom,a:left,a:right,a:top,h:rim', r.geo);
  // the editor
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } RNBX.setDocument(RNBX.newDocument()); });
  await page.click('#btnStudio'); await page.click('.st-tabs >> text="Part"');
  await page.waitForSelector('.pb-editor svg');
  const e1 = await page.evaluate(() => ({ mode: RNBX.studio.mode, faces: document.querySelectorAll('.pb-face').length, rays: document.querySelectorAll('.pb-editor line').length, d3: !!document.querySelector('.pb-3dview svg') || true }));
  H.check('Part tab: drawing, face list and test beam', e1.mode === 'part' && e1.faces === 3 && e1.rays > 10, e1);
  // draw a triangle: three clicks and Enter
  await page.click('text=+ Polygon');
  const box = await (await page.$('.pb-editor svg')).boundingBox();
  for (const [fx, fy] of [[0.2, 0.3], [0.2, 0.7], [0.35, 0.5]]) await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
  await page.keyboard.press('Enter');
  const poly = await page.evaluate(() => { const d = RNBX.partBuilder.design(); return { n: d.shapes.length, kind: d.shapes[d.shapes.length - 1].kind, pts: (d.shapes[d.shapes.length - 1].pts || []).length }; });
  H.check('drawing a polygon by clicking points', poly.n === 2 && poly.kind === 'polygon' && poly.pts === 3, poly);
  // drag a handle of the lens (its diameter)
  await page.evaluate(() => { const P = RNBX.partBuilder; P.setDesign(P.PRESETS.find(p => p.id === 'pcx').make()); });
  const D0 = await page.evaluate(() => RNBX.partBuilder.design().shapes[0].D);
  const hd = await page.evaluate(() => { const c = [...document.querySelectorAll('.pb-editor circle')].find(q => q.getAttribute('fill') === 'var(--accent)'), b = c.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  await page.mouse.move(hd.x, hd.y); await page.mouse.down(); await page.mouse.move(hd.x, hd.y + 25, { steps: 4 }); await page.mouse.up();
  const D1 = await page.evaluate(() => RNBX.partBuilder.design().shapes[0].D);
  H.check('dragging a handle resizes the shape', Math.abs(D1 - D0) > 1, { D0, D1 });
  await page.keyboard.press('Control+z');
  H.check('Ctrl+Z undoes it', (await page.evaluate(() => RNBX.partBuilder.design().shapes[0].D)) === D0);
  // give a face a job from the list
  const fr = await page.evaluate(() => { const s = document.querySelectorAll('.pb-face select')[2]; s.value = 'mirror'; s.dispatchEvent(new Event('change')); return RNBX.partBuilder.design().body.faces; });
  H.check('a face gets its own job (mirror coating)', Object.values(fr).includes('mirror'), fr);
  // to the figure, the library, and back
  const fig = await page.evaluate(() => {
    const P = RNBX.partBuilder, n0 = (RNBX.util.store.get('rnbx_mylib', []) || []).length;
    [...document.querySelectorAll('.studio button')].find(b => b.textContent === 'To My components').click();
    const lib = (RNBX.util.store.get('rnbx_mylib', []) || []).length === n0 + 1;
    const obj = P.insert(); RNBX.studio.close();
    const doc = RNBX.state.doc; doc.style.mode = '3d'; let ok3d = true; try { RNBX.render.build(doc); } catch (e) { ok3d = false; } doc.style.mode = 'schematic';
    RNBX.studio.open(obj); const mode = RNBX.studio.mode, d = P.design(); d.shapes[0].tc = 7; P.setDesign(d); P.insert(); RNBX.studio.close();
    const same = doc.objects.filter(o => o.type === 'built').length === 1 && doc.objects.find(o => o.type === 'built').props.design.shapes[0].tc === 7;
    return { type: obj.type, lib, ok3d, mode, same, svg: RNBX.render.build(doc).svg.length > 1000 };
  });
  H.check('insert into the figure, draw in 3D, save to My components, reopen and update', fig.type === 'built' && fig.lib && fig.ok3d && fig.mode === 'part' && fig.same && fig.svg, fig);
  await page.close();
};
