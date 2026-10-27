#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════
   RNBeamX tests — runner
     npm test                 all suites
     node tests/run.js rcwa   suites whose file name contains "rcwa"
   Starts a small static server for the app, runs the physics suites
   in Node and the app suites in headless Chromium (Playwright), and
   exits with 1 if any check failed. Screenshots go to tests/output.
═══════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const H = require('./harness');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.md': 'text/markdown' };
const serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
    const f = path.join(H.ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(H.ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end(); return; }
    rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(rsp);
  });
  srv.listen(0, '127.0.0.1', () => res(srv));
});

(async () => {
  const filter = process.argv[2] || '';
  const files = ['physics', 'app'].flatMap(dir => fs.readdirSync(path.join(__dirname, dir)).filter(f => f.endsWith('.test.js')).sort().map(f => path.join(dir, f))).filter(f => f.includes(filter));
  const srv = await serve(), base = `http://127.0.0.1:${srv.address().port}`;
  let browser = null;
  const getBrowser = async () => browser || (browser = await require('playwright').chromium.launch());
  const t0 = Date.now();
  for (const f of files) {
    try { await require(path.join(__dirname, f))({ base, getBrowser, H }); }
    catch (e) { H.suite(f); H.check('suite ran without crashing', false, e.stack || String(e)); }
  }
  if (browser) await browser.close();
  srv.close();
  const failed = H.results.filter(r => !r.ok);
  console.log(`\n${H.results.length - failed.length} passed, ${failed.length} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  failed.forEach(r => console.log(`  ✗ [${r.suite}] ${r.name}`));
  process.exit(failed.length ? 1 : 0);
})();
