/* Phone layout and keyboard / screen-reader access */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · phone layout and accessibility');
  const browser = await getBrowser();
  const page = await H.openApp(browser, base);
  // 1. every icon button has an accessible name
  const unnamed = await page.evaluate(() => [...document.querySelectorAll('button.icon-btn')].filter(b => b.offsetParent !== null && !(b.getAttribute('aria-label') || b.textContent.trim())).map(b => b.title || b.id || b.outerHTML.slice(0, 60)));
  H.check('every visible icon button has an accessible name', unnamed.length === 0, unnamed);
  // 2. menus work from the keyboard
  await page.focus('#menus button');
  await page.keyboard.press('Enter'); await page.waitForTimeout(80);
  const m1 = await page.evaluate(() => ({ role: document.activeElement.getAttribute('role'), text: document.activeElement.textContent.trim(), exp: document.querySelector('#menus button').getAttribute('aria-expanded') }));
  await page.keyboard.press('ArrowDown'); const m2 = await page.evaluate(() => document.activeElement.textContent.trim());
  await page.keyboard.press('Escape'); await page.waitForTimeout(50);
  const m3 = await page.evaluate(() => ({ back: document.activeElement === document.querySelector('#menus button'), open: !!document.querySelector('.menu'), exp: document.querySelector('#menus button').getAttribute('aria-expanded') }));
  H.check('menu: Enter opens with focus on the first item, arrows move, Escape closes and returns focus', m1.role === 'menuitem' && m1.exp === 'true' && m2 !== m1.text && m3.back && !m3.open && m3.exp === 'false', { m1, m2, m3 });
  // 3. dialogs take and return focus, and keep Tab inside
  await page.focus('#btnExport'); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  const d1 = await page.evaluate(() => { const m = document.querySelector('.modal'); return { inside: !!m && m.contains(document.activeElement), label: m && m.getAttribute('aria-label') }; });
  let trapped = true;
  for (let i = 0; i < 60; i++) { await page.keyboard.press('Tab'); if (!(await page.evaluate(() => { const m = document.querySelector('.modal'); return !!m && m.contains(document.activeElement); }))) { trapped = false; break; } }
  await page.keyboard.press('Escape'); await page.waitForTimeout(80);
  const d2 = await page.evaluate(() => ({ gone: !document.querySelector('.modal'), back: document.activeElement && document.activeElement.id }));
  H.check('dialog: focus moves in, Tab stays inside, Escape returns focus to the button', d1.inside && d1.label === 'Export figure' && trapped && d2.gone && d2.back === 'btnExport', { d1, trapped, d2 });
  // 4. canvas: Tab steps through objects and each is announced
  await page.evaluate(() => { const d = RNBX.newDocument(); const a = RNBX.createObject('laser', 30, 50), m = RNBX.createObject('mirror', 90, 50); m.rot = 45; d.objects = [a, m]; RNBX.setDocument(d, true); RNBX.select([]); });
  await page.focus('#canvas');
  await page.keyboard.press('Tab'); await page.waitForTimeout(60);
  const c1 = await page.evaluate(() => ({ sel: RNBX.state.selection.map(id => RNBX.getObj(id).type), live: document.getElementById('a11yLive').textContent, focus: document.activeElement.id }));
  await page.keyboard.press('Tab'); await page.waitForTimeout(60);
  const c2 = await page.evaluate(() => ({ sel: RNBX.state.selection.map(id => RNBX.getObj(id).type), live: document.getElementById('a11yLive').textContent }));
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(40);
  const moved = await page.evaluate(() => RNBX.getObj(RNBX.state.selection[0]).x);
  await page.keyboard.press('Tab'); await page.waitForTimeout(60);
  const c3 = await page.evaluate(() => ({ sel: RNBX.state.selection.length, focus: document.activeElement.id }));
  H.check('canvas: Tab selects the next object and announces it (name, position)', c1.sel[0] === 'laser' && /Laser/.test(c1.live) && /x 30/.test(c1.live) && c1.focus === 'canvas' && c2.sel[0] === 'mirror' && /rotated 45°/.test(c2.live), { c1, c2 });
  H.check('canvas: arrow keys move the selection; Tab after the last object leaves the canvas', moved > 90 && c3.sel === 0 && c3.focus !== 'canvas', { moved, c3 });
  H.check('no errors while driving the app by keyboard', page.errors.length === 0, page.errors);
  await page.close();
  // 5. phone
  const { devices } = require('playwright');
  const ph = await H.openApp(browser, base, { device: devices['iPhone 13'] });
  const p1 = await ph.evaluate(() => { const v = id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); return e.offsetParent !== null && r.left >= 0 && r.right <= innerWidth; }; return { w: innerWidth, sw: document.documentElement.scrollWidth, exp: v('btnExport'), more: v('btnMore'), theme: v('btnTheme') }; });
  await ph.tap('#btnMore'); await ph.waitForTimeout(150);
  const items = await ph.evaluate(() => [...document.querySelectorAll('.menu button')].map(b => b.textContent.trim()));
  await ph.tap('.menu >> text=File…'); await ph.waitForTimeout(150);
  const file = await ph.evaluate(() => [...document.querySelectorAll('.menu button')].map(b => b.textContent.trim()).slice(0, 3));
  await ph.evaluate(() => RNBX.dom.closeMenu());
  await ph.tap('#touchBar [aria-label="Components"]'); await ph.waitForTimeout(200);
  const drawer = await ph.evaluate(() => document.getElementById('app').classList.contains('drawer-open') && getComputedStyle(document.getElementById('leftPanel')).display !== 'none');
  await ph.tap('.drawer-scrim', { position: { x: 370, y: 300 } }); await ph.waitForTimeout(100);
  await ph.tap('#tbProps'); await ph.waitForTimeout(100);
  const props = await ph.evaluate(() => getComputedStyle(document.getElementById('rightPanel')).display);
  H.check('phone (390 px): no sideways scrolling; Export, theme and the More menu are on screen', p1.sw <= p1.w && p1.exp && p1.more && p1.theme, p1);
  H.check('phone: the More menu reaches File/Edit/Arrange/View, the figure styles and the tools', ['File…', 'Edit…', 'Arrange…', 'View…'].every(t => items.some(x => x.includes(t))) && items.some(x => /3D/.test(x)) && items.some(x => /Draw by hand/.test(x)) && /New figure/.test(file.join(' ')), { items, file });
  H.check('phone: the component library opens as a drawer; the properties panel can be hidden', drawer && props === 'none', { drawer, props });
  H.check('no errors on the phone layout', ph.errors.length === 0, ph.errors);
  await ph.close();
};
