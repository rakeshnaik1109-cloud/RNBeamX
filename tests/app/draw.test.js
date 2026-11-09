/* Draw mode: hand-drawn shapes and beams that ignore the physics; "Ignore light" on parts */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · draw by hand (no physics)');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const out = {}, sig = t => t.segments.map(s => s.a.concat(s.b).map(v => v.toFixed(2)).join(',')).join('|');
    // 1. a drawing across the beam changes nothing in the trace
    { const d = RNBX.newDocument(); d.objects = [mk('laser', 20, 50, 0, { lambda: 633 }), mk('pd', 120, 50, 0, {})];
      const before = sig(RNBX.trace(d));
      d.objects.push(RNBX.draw.makePath([[60, 30], [60, 70], [80, 70]]), RNBX.draw.makePath([[50, 40], [90, 60]], { beam: true }));
      out.noPhys = before === sig(RNBX.trace(d)); out.svgHas = /stroke-width/.test(RNBX.render.build(d, {}).svg) && RNBX.render.build(d, { labels: false }).svg.split('<path').length > 4; }
    // 2. "Ignore light" on a mirror lets the beam pass; on a laser, no beam
    { const d = RNBX.newDocument(); const m = mk('mirror', 70, 50, 45, {}); d.objects = [mk('laser', 20, 50, 0, { lambda: 633 }), m];
      const turned = RNBX.trace(d).segments.some(s => Math.abs(s.b[0] - s.a[0]) < 0.5 && s.len > 3);
      m.drawOnly = true; const t2 = RNBX.trace(d), straight = t2.segments.every(s => Math.abs(s.b[1] - s.a[1]) < 0.01);
      d.objects[0].drawOnly = true; out.ignore = { turned, straight, none: RNBX.trace(d).segments.length === 0 }; }
    // 3. geometry helpers: centred points, simplification, point handles
    { const o = RNBX.draw.makePath([[10, 10], [30, 10], [30, 20]]), def = RNBX.lib.get('drawing');
      const P0 = RNBX.lib.drawingPts.parse(o.props.pts);
      def.dragHandle(o.props, 'v1', [5, -5]);
      const P1 = RNBX.lib.drawingPts.parse(o.props.pts);
      const wig = []; for (let i = 0; i <= 100; i++) wig.push([i * 0.2, i < 50 ? 0 : (i - 50) * 0.2]);
      out.geo = { x: o.x, y: o.y, p0: P0[0], moved: P1[1], handles: def.extraHandles(o.props).length, simp: RNBX.draw.simplify(wig, 0.05).length }; }
    return out;
  });
  H.check('a hand-drawn path or beam across the light leaves the trace unchanged, and is drawn', r.noPhys && r.svgHas, r);
  H.check('"Ignore light": a mirror lets the beam through; a source stops emitting', r.ignore.turned && r.ignore.straight && r.ignore.none, r.ignore);
  H.check('drawn points are stored around the drawing\'s centre; every point has a handle that moves it', r.geo.x === 20 && r.geo.y === 15 && r.geo.p0[0] === -10 && r.geo.moved[0] === 5 && r.geo.moved[1] === -5 && r.geo.handles === 3, r.geo);
  H.check('freehand strokes are simplified (a bent line of 101 samples keeps 3 points)', r.geo.simp === 3, r.geo);
  // 4. the tools, with the mouse
  await page.evaluate(() => { try { localStorage.removeItem('rnbx_drawstyle'); } catch (e) { /* */ } RNBX.setDocument(RNBX.newDocument('nature-2'), true); RNBX.canvas.fit(); });
  await page.waitForTimeout(200);
  const pg = await page.evaluate(() => { const s = document.getElementById('canvas').getBoundingClientRect(); const a = RNBX.canvas.toPage(s.left, s.top), b = RNBX.canvas.toPage(s.right, s.bottom); return { s: [s.left, s.top, s.width, s.height], a, b }; });
  const at = (x, y) => [pg.s[0] + (x - pg.a[0]) / (pg.b[0] - pg.a[0]) * pg.s[2], pg.s[1] + (y - pg.a[1]) / (pg.b[1] - pg.a[1]) * pg.s[3]];
  await page.keyboard.press('d');
  const barShown = await page.evaluate(() => !document.getElementById('drawBar').hidden);
  await page.click('[data-dt="poly"]');
  for (const q of [[30, 30], [60, 30], [60, 60]]) { const [x, y] = at(...q); await page.mouse.click(x, y); await page.waitForTimeout(380); }
  await page.keyboard.press('Enter');
  await page.click('[data-dt="pen"]');
  { const [x, y] = at(90, 40); await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 20; i++) await page.mouse.move(x + i * 5, y + Math.sin(i / 3) * 15); await page.mouse.up(); }
  await page.click('[data-dt="ellipse"]');
  { const [x, y] = at(120, 60), [x2, y2] = at(150, 80); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 4 }); await page.mouse.up(); }
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  const ui = await page.evaluate(() => ({ objs: RNBX.state.doc.objects.map(o => o.type), poly: (RNBX.state.doc.objects.find(o => o.type === 'drawing') || { props: {} }).props.pts, tool: RNBX.draw.tool, bar: !document.getElementById('drawBar').hidden }));
  H.check('Draw toolbar: polyline (Enter), pen stroke and ellipse drawn with the mouse; Esc leaves the tool', barShown && ui.objs.join(',') === 'drawing,drawing,ellipse' && ui.poly.split(';').length === 3 && ui.tool === null, ui);
  await page.evaluate(() => RNBX.history.undo());
  const undone = await page.evaluate(() => RNBX.state.doc.objects.length);
  H.check('each drawing is one undo step', undone === 2, undone);
  await page.close();
};
