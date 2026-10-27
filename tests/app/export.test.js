/* Exports and sharing: SVG, PDF, PNG, PowerPoint, TikZ, share links */
'use strict';
const fs = require('fs'), path = require('path');
const zipNames = buf => { const out = []; for (let i = 0; i < buf.length - 30; i++) if (buf.readUInt32LE(i) === 0x02014b50) { const n = buf.readUInt16LE(i + 28); out.push(buf.slice(i + 46, i + 46 + n).toString()); } return out; };
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · export and sharing');
  const browser = await getBrowser(), page = await H.openApp(browser, base);
  const r = await page.evaluate(async () => {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'raman').build());
    const X = RNBX.exporter, out = {};
    out.svg = X.svgString({}).length;
    out.pdf = (await X.pdfBlob()).size;
    const c = await X.rasterize(X.svgString({}), 400, 220, '#fff'); out.png = c.width + 'x' + c.height;
    out.pptx = Array.from(new Uint8Array(await (await RNBX.share.pptx()).arrayBuffer()));
    out.tikz = RNBX.share.tikz();
    out.link = await RNBX.share.link();
    const back = await RNBX.share.decode(out.link.split('#fig=')[1]);
    out.round = JSON.stringify(back.objects.map(o => [o.type, o.x, o.y])) === JSON.stringify(RNBX.state.doc.objects.map(o => [o.type, o.x, o.y]));
    out.videoTypes = X.videoTypes().length;
    return out;
  });
  H.check('SVG export', r.svg > 5000, r.svg + ' chars');
  H.check('PDF export (vector)', r.pdf > 5000, r.pdf + ' bytes');
  H.check('raster export (PNG / TIFF / JPEG path)', r.png === '400x220', r.png);
  const pptx = Buffer.from(r.pptx), names = zipNames(pptx);
  fs.writeFileSync(path.join(H.OUT, 'export.pptx'), pptx);
  H.check('PowerPoint file is a valid package with slide, SVG and PNG', ['[Content_Types].xml', 'ppt/presentation.xml', 'ppt/slides/slide1.xml', 'ppt/media/figure.svg', 'ppt/media/figure.png'].every(n => names.includes(n)), names.length + ' parts');
  fs.writeFileSync(path.join(H.OUT, 'export.tex'), r.tikz);
  H.check('TikZ export: a complete tikzpicture with paths and labels', /\\begin\{tikzpicture\}[\s\S]*\\path\[[\s\S]*\\node\[[\s\S]*\\end\{tikzpicture\}/.test(r.tikz) && !/NaN/.test(r.tikz), (r.tikz.match(/\\path\[/g) || []).length + ' paths');
  H.check('TikZ export includes the zoom inset (clip scope)', /\\begin\{scope\}\s*\n\\clip/.test(r.tikz));
  H.check('share link round-trips the figure exactly', r.round, r.link.length + ' chars');
  H.check('video formats available', r.videoTypes > 0, r.videoTypes);
  // open the link in a fresh page
  const p2 = await H.openApp(browser, base, { hash: '#fig=' + r.link.split('#fig=')[1], keepStorage: true });
  await p2.waitForTimeout(500);
  const opened = await p2.evaluate(() => ({ title: RNBX.state.doc.meta.title, n: RNBX.state.doc.objects.length }));
  H.check('opening a share link loads the figure', opened.title === 'Confocal Raman microscope' && opened.n > 10, opened);
  H.check('no errors', page.errors.length === 0 && p2.errors.length === 0, page.errors.concat(p2.errors).join(' | '));
  await page.context().close(); await p2.context().close();
};
