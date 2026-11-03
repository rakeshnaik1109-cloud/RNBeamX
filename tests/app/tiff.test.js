/* Opening files: TIFF decoding (compressions, bit depths, byte orders, metadata), robust
   image reading, the file picker, drops of other files, and autosave of large figures */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · opening images and files (TIFF, autosave)');
  const page = await H.openApp(await getBrowser(), base);
  await page.evaluate(() => { document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument()); });
  const r = await page.evaluate(async () => {
    const get = name => fetch('tests/fixtures/tiff/' + name).then(x => x.arrayBuffer());
    const px = async href => { const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = href; }); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); return { w: c.width, h: c.height, d: g.getImageData(0, 0, c.width, c.height).data }; };
    const W = 64, Hh = 48, g8 = (x, y) => (x * 4 + y * 2) % 256, out = {};
    const check = async (name, f, tol = 0, ch = [0]) => {
      try {
        const res = await RNBX.tiff.decode(await get(name)), P = await px(res.href);
        let bad = 0;
        for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const e = f(x, y); ch.forEach((c, k) => { const v = P.d[(y * W + x) * 4 + c], want = Array.isArray(e) ? e[k] : e; if (Math.abs(v - want) > tol) bad++; }); }
        out[name] = { ok: P.w === W && P.h === Hh && !bad, bad, calib: res.calib };
      } catch (e) { out[name] = { ok: false, err: e.message }; }
    };
    await check('gray8_raw.tif', g8);
    await check('gray8_lzw.tif', g8);
    await check('gray8_packbits.tif', g8);
    await check('gray8_tiled.tif', g8);
    const rgb = (x, y) => [g8(x, y), 255 - g8(x, y), (x * 8) % 256];
    await check('rgb_raw.tif', rgb, 0, [0, 1, 2]);
    await check('rgb_lzw.tif', rgb, 0, [0, 1, 2]);
    await check('rgb_deflate.tif', rgb, 0, [0, 1, 2]);
    const v16 = (x, y) => (x * 1000 + y * 10) / 63470 * 255;
    await check('gray16_raw.tif', v16, 1);
    await check('gray16_lzw.tif', v16, 1);
    await check('gray16_bigendian.tif', v16, 1);
    await check('float32.tif', (x, y) => (x * 0.5 + y) / 78.5 * 255, 1);
    await check('bilevel.tif', (x, y) => (g8(x, y) > 128 ? 255 : 0));
    await check('palette.tif', g8, 2);
    // a 300 × 200 noisy LZW image overflows the 4096-entry code table several times
    { const res = await RNBX.tiff.decode(await get('noise_lzw.tif')), P = await px(res.href); let sum = 0; for (let i = 0; i < P.w * P.h; i++) sum += P.d[i * 4]; out.noise = { sum, a: P.d[(100 * 300 + 200) * 4], b: P.d[(3 * 300 + 250) * 4] }; }
    out.fei = (await RNBX.tiff.decode(await get('fei_meta.tif'))).calib;
    out.ij = (await RNBX.tiff.decode(await get('imagej_meta.tif'))).calib;
    // through the app: a TIFF dropped into an image panel fills it and calibrates it
    const f = new File([await get('fei_meta.tif')], 'sem.tif', { type: 'image/tiff' });
    const o = await RNBX.imgproc.create(f, 50, 40, 40);
    out.panel = { px: [o.props.pxW, o.props.pxH], calib: [o.props.calib, o.props.pix, o.props.unit], png: /^data:image\/png/.test(o.props.href) };
    // a file that is not an image is reported, not drawn blank
    try { await RNBX.project.readImage(new File(['hello'], 'notes.png', { type: 'image/png' })); out.badImage = 'accepted'; } catch (e) { out.badImage = e.message; }
    out.isImg = [RNBX.project.isImageFile({ name: 'a.TIF', type: '' }), RNBX.project.isImageFile({ name: 'a.json', type: '' })];
    // the picker input is in the page while it waits (Safari / mobile need that)
    const realClick = HTMLInputElement.prototype.click; HTMLInputElement.prototype.click = function () {};
    RNBX.project.pickFile('image/*', () => {});
    const inp = document.getElementById('rnbxFilePick'); out.picker = { inDom: !!inp, accept: inp && inp.accept };
    HTMLInputElement.prototype.click = realClick; if (inp) inp.remove();
    // an old project holding a raw TIFF data URL is shown converted
    const buf = new Uint8Array(await get('gray8_raw.tif')); let bin = ''; buf.forEach(b => { bin += String.fromCharCode(b); });
    const tiffURL = 'data:image/tiff;base64,' + btoa(bin);
    RNBX.imgURL(tiffURL, true); await new Promise(res => setTimeout(res, 300));
    out.oldTiff = /^data:image\/png/.test(RNBX.imgURL(tiffURL, false));
    // large images draw on screen through object URLs; exports keep the data
    const big = o.props.href.length > 100000 ? o.props.href : 'data:image/png;base64,' + 'A'.repeat(200000);
    out.blob = [RNBX.imgURL(big, true).startsWith('blob:'), RNBX.imgURL(big, false) === big];
    // autosave of a figure too big for localStorage goes to IndexedDB and comes back
    const im = RNBX.createObject('image', 30, 30); im.props.href = 'data:image/png;base64,' + 'A'.repeat(6e6); RNBX.state.doc.objects.push(im);
    out.small = RNBX.project.autosaveNow();
    await new Promise(res => setTimeout(res, 800));
    const ids = RNBX.state.doc.objects.map(q => q.id).sort().join();
    RNBX.setDocument(RNBX.newDocument());
    RNBX.project.restore();
    for (let i = 0; i < 40 && !RNBX.state.doc.objects.length; i++) await new Promise(res => setTimeout(res, 50));
    out.restored = RNBX.state.doc.objects.map(q => q.id).sort().join() === ids;
    return out;
  });
  ['gray8_raw', 'gray8_lzw', 'gray8_packbits', 'gray8_tiled', 'rgb_raw', 'rgb_lzw', 'rgb_deflate', 'gray16_raw', 'gray16_lzw', 'gray16_bigendian', 'float32', 'bilevel', 'palette'].forEach(k => H.check('TIFF decodes exactly: ' + k, r[k + '.tif'].ok, r[k + '.tif']));
  H.check('noisy LZW TIFF (code-table resets) matches Pillow', r.noise.sum === 6051073 && r.noise.a === 3 && r.noise.b === 52, r.noise);
  H.check('pixel size read from FEI / Thermo Fisher metadata (2.5 nm)', r.fei && r.fei.pix === 2.5 && r.fei.unit === 'nm', r.fei);
  H.check('pixel size read from ImageJ metadata (0.1 µm)', r.ij && Math.abs(r.ij.pix - 0.1) < 1e-9 && r.ij.unit === 'µm', r.ij);
  H.check('a TIFF fills an image panel as PNG, with its size and calibration', r.panel.png && r.panel.px.join() === '64,48' && r.panel.calib.join() === 'pixel,2.5,nm', r.panel);
  H.check('a file that is not an image is reported with a reason', /could not be opened as an image/.test(r.badImage), r.badImage);
  H.check('images are recognised by extension when the type is missing', r.isImg[0] && !r.isImg[1], r.isImg);
  H.check('the file picker waits in the page and lists TIFF', r.picker.inDom && /\.tif/.test(r.picker.accept), r.picker);
  H.check('a TIFF stored by an older version is shown converted', r.oldTiff);
  H.check('large images: object URL on screen, full data in exports', r.blob[0] && r.blob[1], r.blob);
  H.check('a figure too big for localStorage is autosaved to IndexedDB and restored', r.small === false && r.restored, { small: r.small, restored: r.restored });
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
