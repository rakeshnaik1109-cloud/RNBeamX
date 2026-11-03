/* Images & panels: microscope image panels (calibrated scale bar, crop, LUT, colour bar,
   zoom inset) and the multi-panel layout */
'use strict';
const fs = require('fs'), path = require('path');
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · image panels and figure layout');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { try { localStorage.clear(); } catch (e) { /* none */ } document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument()); });
  const r = await page.evaluate(async () => {
    const IP = RNBX.imgproc, PN = RNBX.panels, S = RNBX.state, wait = ms => new Promise(res => setTimeout(res, ms));
    // a synthetic "SEM" image: grey gradient, an info bar at the bottom with a 100 px bar in it
    const mk = (w, h, draw) => new Promise(res => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); c.toBlob(b => res(new File([b], 'img.png', { type: 'image/png' }))); });
    const sem = await mk(400, 300, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#202020'); gr.addColorStop(1, '#d0d0d0'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; g.fillRect(0, 264, w, 36); g.fillStyle = '#fff'; g.fillRect(20, 280, 100, 4); });
    const sq = await mk(200, 200, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); });
    const out = {};
    const a = await IP.create(sem, 60, 40, 40);
    out.px = [a.props.pxW, a.props.pxH];
    out.noBarUncal = !RNBX.render.build(S.doc, {}).svg.includes('mg-bar');
    // calibrate by measuring the burnt-in bar, and crop the info bar off
    RNBX.select([a.id]); PN.calibrate(a);
    for (let i = 0; i < 60 && !PN._cal.ready(); i++) await wait(50);
    PN._cal.setLine([20, 282, 120, 282]); PN._cal.setLen(1, 'µm'); PN._cal.setCrop([0, 0, 1, 0.88]); PN._cal.apply();
    out.cal = { pix: a.props.pix, unit: a.props.unit, h: a.props.h };
    const bar = () => { const svg = RNBX.render.build(S.doc, {}).svg, d = new DOMParser().parseFromString(svg, 'image/svg+xml'), b = d.querySelector('rect.mg-bar'); return b ? { w: +b.getAttribute('width'), text: b.nextElementSibling && b.nextElementSibling.textContent } : null; };
    out.bar1 = bar();
    a.props.w = 80; out.bar2 = bar();
    // colour map: the cached image is recoloured
    a.props.cmap = 'viridis'; RNBX.render.build(S.doc, {}); await IP.ready();
    const href = IP.get(a.props.href, a.props), img = await IP.decode(href), px = IP.pixels(img).data.data;
    out.lut = { changed: href !== a.props.href, mid: [px[(150 * 400 + 200) * 4], px[(150 * 400 + 200) * 4 + 1], px[(150 * 400 + 200) * 4 + 2]] };
    out.auto = await IP.autoLevels(a.props.href);
    // zoom inset and colour bar render, note avoids the inset's corner
    Object.assign(a.props, { zoom: true, cbar: true, cbMin: 0, cbMax: 30, cbLabel: 'Height (nm)', note: 'SEM' });
    const svg = RNBX.render.build(S.doc, {}).svg;
    out.zoom = (svg.match(/<image /g) || []).length;
    out.clip = /clipPath id="rbx-mg-[^"]+-z"/.test(svg);
    // layout: a micrograph (4:3 after crop ≈ 1.52), a square one and a plot, at 183 mm, 3 columns
    const b = await IP.create(sq, 150, 40, 30);
    Object.assign(b.props, { calib: 'fov', fov: 2, unit: 'µm' }); Object.assign(a.props, { zoom: false, cbar: false });
    const pl = RNBX.createObject('plot', 120, 120); S.doc.objects.push(pl);
    const before = JSON.stringify(S.doc.objects.map(o => [o.x, o.y]));
    PN.layout(PN.readingOrder([pl, b, a]), { width: 183, cols: 3, gap: 2, letters: 'a', matchBars: true });
    const bx = [a, b, pl].map(o => RNBX.lib.worldBox(o));
    out.layout = { page: [S.doc.page.width, S.doc.page.height], heights: bx.map(q => +(q[3] - q[1]).toFixed(2)), left: +Math.min(...bx.map(q => q[0])).toFixed(2), right: +Math.max(...bx.map(q => q[2])).toFixed(2), letters: [a.props.letter, b.props.letter], plotLetter: (S.doc.objects.find(o => o.type === 'panel' && o.props.of === pl.id) || {}).props };
    out.match = [IP.toNm(a.props.sbLen, a.props.unit), IP.toNm(b.props.sbLen, b.props.unit)];
    RNBX.history.undo();
    out.undo = JSON.stringify(S.doc.objects.filter(o => o.type !== 'panel').map(o => [o.x, o.y])) === before;
    // empty grid; filling one panel
    RNBX.setDocument(RNBX.newDocument());
    const g = PN.grid(2, 2, { width: 89, gap: 1.5 });
    out.grid = { n: g.length, letters: g.map(o => o.props.letter).join(''), w: S.doc.page.width };
    await IP.fill(g[3], sq); out.filled = !!g[3].props.href && g[3].props.pxW === 200;
    // project round trip and export
    g[3].props.calib = 'pixel'; g[3].props.pix = 5; g[3].props.unit = 'nm'; g[3].props.cmap = 'inferno';
    RNBX.setDocument(JSON.parse(JSON.stringify(S.doc))); await wait(50); RNBX.render.build(S.doc, {}); await IP.ready();
    const X = RNBX.exporter, s2 = X.svgString();
    out.svg = { bar: s2.includes('mg-bar'), label: />200 nm</.test(s2) || />500 nm</.test(s2) || />100 nm</.test(s2), png: /data:image\/png/.test(s2) };
    out.pdf = (await X.pdfBlob()).size;
    const c = document.createElement('canvas');
    return out;
  });
  H.check('an image file fills a panel with its pixel size read', r.px[0] === 400 && r.px[1] === 300, r.px);
  H.check('no scale bar until the panel is calibrated', r.noBarUncal);
  H.check('measuring the burnt-in bar sets the pixel size (100 px = 1 µm → 0.01 µm)', Math.abs(r.cal.pix - 0.01) < 1e-9 && r.cal.unit === 'µm', r.cal);
  H.check('cropping the info bar changes the panel height (40 mm × 264/400)', Math.abs(r.cal.h - 26.4) < 0.01, r.cal.h);
  H.near('scale bar: 500 nm of a 4 µm field is 1/8 of a 40 mm panel', r.bar1 && r.bar1.w, 5, 0.01);
  H.check('scale bar label reads 500 nm', r.bar1 && r.bar1.text === '500 nm', r.bar1);
  H.near('resizing the panel to 80 mm doubles the bar', r.bar2 && r.bar2.w, 10, 0.01);
  H.check('colour map recolours the image (mid-grey → viridis teal/green)', r.lut.changed && r.lut.mid[1] > r.lut.mid[0] + 40, r.lut.mid);
  H.check('auto contrast finds black and white points', r.auto.lo < r.auto.hi && r.auto.lo < 0.05, r.auto);
  H.check('zoom inset draws the image twice, clipped', r.zoom === 2 && r.clip, r.zoom);
  H.check('layout: page 183 mm wide, rows fill it between 1 mm margins', r.layout.page[0] === 183 && Math.abs(r.layout.left - 1) < 0.05 && Math.abs(r.layout.right - 182) < 0.05, r.layout);
  H.check('layout: panels in a row have the same height', Math.max(...r.layout.heights) - Math.min(...r.layout.heights) < 0.05, r.layout.heights);
  H.check('layout: letters a, b in the image panels, c as a panel letter for the plot', r.layout.letters.join('') === 'ab' && r.layout.plotLetter && r.layout.plotLetter.text === 'c', r.layout);
  H.check('same scale-bar length in every image panel', r.match[0] > 0 && Math.abs(r.match[0] - r.match[1]) < 1e-6, r.match);
  H.check('one undo restores the panels before the layout', r.undo);
  H.check('empty grid: 4 panels lettered abcd at 89 mm', r.grid.n === 4 && r.grid.letters === 'abcd' && r.grid.w === 89, r.grid);
  H.check('an image dropped into an empty panel fills it', r.filled);
  H.check('saved project reloads with its scale bar; SVG export embeds the processed image', r.svg.bar && r.svg.label && r.svg.png, r.svg);
  H.check('PDF export with image panels', r.pdf > 3000, r.pdf + ' bytes');
  H.check('no errors', !page.errors || !page.errors.length, page.errors);
  await page.close();
};
