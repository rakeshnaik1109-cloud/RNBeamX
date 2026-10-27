/* ═══════════════════════════════════════════════════════════
   RNBeamX tests — shared harness
   check() records a pass or a failure; suites never throw on a
   failed check, so one run reports everything that is wrong.
═══════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'output');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
let current = '';
const suite = name => { current = name; console.log(`\n▸ ${name}`); };
const check = (name, ok, detail) => {
  results.push({ suite: current, name, ok: !!ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail != null ? '  ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`);
  return !!ok;
};
const near = (name, v, exp, tol) => check(name, Number.isFinite(v) && Math.abs(v - exp) <= tol, `${Number.isFinite(v) ? +v.toPrecision(6) : v} (expected ${+(+exp).toPrecision(6)} ± ${tol})`);

/* the engine in Node, without a browser (for the physics suites) */
const loadEngine = (files = ['core/utils.js', 'engine/optics.js', 'engine/nkdata.js', 'engine/thinfilm.js', 'engine/rcwa.js']) => {
  const ctx = { console, Math, JSON, Date, Float64Array, Uint8Array, Uint32Array, Array, Object, Number, String, Map, Set, isFinite, parseFloat, parseInt, setTimeout, clearTimeout };
  ctx.window = ctx; ctx.localStorage = { getItem: () => null, setItem() {} };
  vm.createContext(ctx);
  files.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f }));
  return ctx.RNBX;
};

/* a page of the app, with errors collected and outside requests blocked */
const openApp = async (browser, base, opts = {}) => {
  const ctx = opts.context || await browser.newContext(Object.assign({ viewport: { width: 1400, height: 900 } }, opts.device || {}));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.route(/goatcounter|gc\.zgo\.at/, r => r.abort());
  await page.goto(base + '/index.html' + (opts.hash || ''));
  if (!opts.keepStorage) { await page.evaluate(() => localStorage.clear()); await page.reload(); }
  await page.waitForFunction(() => window.RNBX && RNBX.templates && RNBX.state);
  await page.waitForTimeout(300);
  page.errors = errors;
  return page;
};
const shot = (page, name, sel) => (sel ? page.locator(sel).first() : page).screenshot({ path: path.join(OUT, name + '.png') });

module.exports = { ROOT, OUT, results, suite, check, near, loadEngine, openApp, shot };
