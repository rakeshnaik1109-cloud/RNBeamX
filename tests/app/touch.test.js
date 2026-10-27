/* Tablets and phones: drag, pinch-zoom, long-press menu, touch toolbar, drawer */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · touch devices');
  const { devices } = require('playwright'), browser = await getBrowser();
  for (const [name, dev] of [['iPad', devices['iPad (gen 7) landscape']], ['phone', devices['iPhone 13']]]) {
    const page = await H.openApp(browser, base, { device: dev });
    await page.evaluate(() => RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'michelson').build()));
    await page.waitForTimeout(200);
    const res = await page.evaluate(async () => {
      const svg = document.getElementById('canvas'), r = svg.getBoundingClientRect();
      const fire = (type, id, x, y) => svg.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, button: 0, isPrimary: id === 1 }));
      const laser = RNBX.state.doc.objects.find(o => o.type === 'laser'), x0 = laser.x;
      const m = svg.getScreenCTM(), sx = m.a * laser.x + m.e, sy = m.d * laser.y + m.f, el = document.elementFromPoint(sx, sy);
      const ev = (type, x, y) => el.dispatchEvent(new PointerEvent(type, { pointerId: 3, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, button: 0 }));
      ev('pointerdown', sx, sy); for (let i = 1; i <= 6; i++) ev('pointermove', sx - i * 4, sy); ev('pointerup', sx - 24, sy);
      await new Promise(q => setTimeout(q, 50));
      const z0 = RNBX.canvas.zoomPct(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      fire('pointerdown', 1, cx - 60, cy); fire('pointerdown', 2, cx + 60, cy);
      for (let i = 1; i <= 5; i++) { fire('pointermove', 1, cx - 60 - i * 12, cy); fire('pointermove', 2, cx + 60 + i * 12, cy); }
      fire('pointerup', 1, cx - 120, cy); fire('pointerup', 2, cx + 120, cy);
      const z1 = RNBX.canvas.zoomPct();
      fire('pointerdown', 4, r.left + 20, r.bottom - 120); await new Promise(q => setTimeout(q, 700));
      const menu = !!document.querySelector('.menu'); fire('pointerup', 4, r.left + 20, r.bottom - 120); if (menu) RNBX.dom.closeMenu();
      return { moved: laser.x - x0, z0, z1, menu, bar: getComputedStyle(document.getElementById('touchBar')).display };
    });
    H.check(`${name}: one-finger drag moves a part`, res.moved < -2, res.moved.toFixed(2));
    H.check(`${name}: pinch zooms in`, res.z1 > res.z0, res.z0 + ' → ' + res.z1);
    H.check(`${name}: long press opens the context menu`, res.menu);
    H.check(`${name}: touch toolbar shown`, res.bar !== 'none', res.bar);
    if (await page.evaluate(() => getComputedStyle(document.getElementById('leftPanel')).display === 'none')) await page.click('#touchBar button[title="Components"]');
    await page.waitForTimeout(200);
    const n0 = await page.evaluate(() => RNBX.state.doc.objects.length);
    await page.locator('.tile', { hasText: /^Lens$/ }).first().tap(); await page.waitForTimeout(200);
    H.check(`${name}: tapping a library tile adds the part`, await page.evaluate(() => RNBX.state.doc.objects.length) === n0 + 1);
    await H.shot(page, 'touch-' + name.toLowerCase());
    H.check(`${name}: no errors`, page.errors.length === 0, page.errors.join(' | '));
    await page.context().close();
  }
};
