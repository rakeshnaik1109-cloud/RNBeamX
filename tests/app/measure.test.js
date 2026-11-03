/* Measuring on image panels (lengths, widths, statistics, aspect ratio) and the draggable scale bar */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · measuring on image panels');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(async () => {
    document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument());
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d'); g.fillStyle = '#ccc'; g.fillRect(0, 0, 400, 300);
    const f = new File([await new Promise(r => c.toBlob(r))], 'rods.png', { type: 'image/png' });
    const o = await RNBX.imgproc.create(f, 92, 50, 80); Object.assign(o.props, { calib: 'pixel', pix: 0.5, unit: 'nm' }); RNBX.select([o.id]); window._o = o;
    RNBX.measure.open(o);
  });
  await page.waitForTimeout(500);
  // one line drawn with the mouse: 100 px → 50 nm
  const box = await (await page.$('.ms-canvas')).boundingBox();
  const at = async (u, v) => { const p = await page.evaluate(([u, v]) => RNBX.measure._t.scr([u, v]), [u, v]); return [box.x + p[0], box.y + p[1]]; };
  const A = await at(50, 100), B = await at(150, 100);
  await page.mouse.move(A[0], A[1]); await page.mouse.down(); await page.mouse.move(B[0], B[1], { steps: 5 }); await page.mouse.up();
  const r = await page.evaluate(async () => {
    const IP = RNBX.imgproc, MS = RNBX.measure, out = {}, p = window._o.props;
    out.drawn = p.meas.length === 1 ? +IP.measValue(p, p.meas[0]).v.toFixed(2) : null;
    // more lengths and widths, an area, an angle and counts through the dialog's API
    [120, 140, 160].forEach(L => MS._t.add({ type: 'line', pts: [[10, 10], [10 + L, 10]] }));
    MS._t.setTool('line'); const s = document.querySelector('.ms-side select'); s.value = 'Width'; s.dispatchEvent(new Event('change'));
    [40, 40, 40, 40].forEach(w => MS._t.add({ type: 'line', pts: [[20, 20], [20, 20 + w]], cls: 'Width' }));
    MS._t.setTool('area'); MS._t.add({ type: 'area', pts: [[0, 0], [20, 0], [20, 20], [0, 20]], cls: 'Area' });
    MS._t.setTool('angle'); MS._t.add({ type: 'angle', pts: [[10, 0], [0, 0], [0, 10]], cls: 'Angle' });
    MS._t.setTool('poly'); MS._t.add({ type: 'poly', pts: [[0, 0], [30, 40], [60, 0]], cls: 'Bent' });
    const st = IP.measStats(p), g = n => st.find(x => x.cls === n);
    out.len = [g('Length').n, +g('Length').mean.toFixed(3), +g('Length').sd.toFixed(3), g('Length').unit];
    out.wid = [g('Width').n, g('Width').mean, g('Width').sd];
    out.area = [+g('Area').mean.toFixed(3), g('Area').unit, +g('Area').eqd.mean.toFixed(3)];
    out.angle = g('Angle').mean; out.bent = g('Bent').mean;
    out.aspect = IP.aspect(st); out.aspect = out.aspect && +out.aspect.r.toFixed(4);
    out.statsTable = /Mean ± SD/.test(document.querySelector('.ms-stats').textContent) && !!document.querySelector('.ms-hist svg');
    out.list = document.querySelectorAll('.ms-item').length;
    MS._t.close();
    // drawn on the panel; the scale bar can move anywhere
    const svg = RNBX.render.build(RNBX.state.doc, {}).svg;
    out.overlay = (svg.match(/stroke="#2bd4ff"/g) || []).length;
    const def = RNBX.lib.get('micrograph'), hs = def.extraHandles(p);
    out.handles = hs.map(h => h.key);
    def.dragHandle(p, 'sb', [-RNBX.imgproc.sbHandleDx(p, p.w, p.h), 0]);
    out.sb = [p.sbPos, p.sbX, p.sbY];
    out.summary = IP.summaryText(st);
    return out;
  });
  H.near('a line drawn with the mouse: 100 px at 0.5 nm/px = 50 nm', r.drawn, 50, 0.6);
  H.check('lengths: n, mean and sample SD', r.len[0] === 4 && Math.abs(r.len[1] - (50 + 60 + 70 + 80) / 4) < 0.2 && Math.abs(r.len[2] - 12.91) < 0.3 && r.len[3] === 'nm', r.len);
  H.check('widths: 20 nm, SD 0', r.wid[0] === 4 && r.wid[1] === 20 && r.wid[2] === 0, r.wid);
  H.check('area of a 20 × 20 px square = 100 nm², equivalent diameter 11.28 nm', Math.abs(r.area[0] - 100) < 1e-9 && r.area[1] === 'nm²' && Math.abs(r.area[2] - 11.284) < 0.01, r.area);
  H.near('angle of two perpendicular arms', r.angle, 90, 1e-9);
  H.near('segmented length (two 50 px segments) = 50 nm', r.bent, 50, 1e-9);
  H.check('aspect ratio length / width', Math.abs(r.aspect - r.len[1] / 20) < 0.01, r.aspect);
  H.check('the dialog shows the statistics table, histogram and list', r.statsTable && r.list >= 11, r);
  H.check('measurements are drawn on the panel', r.overlay >= 8, r.overlay);
  H.check('yellow handles for the scale bar; dragging puts it anywhere', r.handles.includes('sb') && r.sb[0] === 'free' && Math.abs(r.sb[1] - 0.5) < 1e-9 && Math.abs(r.sb[2] - 0.5) < 1e-9, r);
  H.check('a one-line summary per class (mean ± SD, n)', r.summary.some(t => /^Length: .* ± .* nm \(n = 4\)$/.test(t)) && r.summary.some(t => /^Angle: 90.00° \(n = 1\)$/.test(t)), r.summary);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
