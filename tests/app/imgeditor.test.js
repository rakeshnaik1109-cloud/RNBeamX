/* Image editor for the Image part: background removal, geometry, colour, size and format */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · image editor');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(async () => {
    document.querySelectorAll('.modal-back').forEach(m => m.remove()); RNBX.setDocument(RNBX.newDocument());
    const IE = RNBX.imgEdit, ED = RNBX.imageEditor, out = {}, wait = ms => new Promise(res => setTimeout(res, ms));
    // a logo-like picture: white background, a blue disk, a red square inside a white ring
    const c = document.createElement('canvas'); c.width = 400; c.height = 300; const g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 400, 300); g.fillStyle = '#1f6fd6'; g.beginPath(); g.arc(120, 150, 80, 0, 7); g.fill();
    g.fillStyle = '#d62728'; g.fillRect(250, 90, 120, 120); g.fillStyle = '#ffffff'; g.fillRect(290, 130, 40, 40);   // white hole inside the red square
    const href = c.toDataURL('image/png');
    const o = RNBX.createObject('image', 90, 60); Object.assign(o.props, { href, w: 80, h: 60, aspect: 4 / 3 }); RNBX.addObject(o);
    const alphaAt = (cv, x, y) => cv.getContext('2d').getImageData(x, y, 1, 1).data[3];
    const img = await RNBX.imgproc.decode(href), S0 = IE.source(img);
    // colour key: all white goes, including the hole
    const e1 = IE.DEFAULT(); e1.ops.push({ op: 'key', color: [255, 255, 255], tol: 10 });
    const k1 = IE.render(S0.c, e1); out.key = [alphaAt(k1, 5, 5), alphaAt(k1, 120, 150), alphaAt(k1, 310, 150), alphaAt(k1, 260, 100)];
    // magic wand at a corner: the outside goes, the enclosed hole stays
    const e2 = IE.DEFAULT(); e2.ops.push({ op: 'wand', x: 3, y: 3, tol: 10 });
    const k2 = IE.render(S0.c, e2); out.wand = [alphaAt(k2, 5, 5), alphaAt(k2, 395, 295), alphaAt(k2, 310, 150), alphaAt(k2, 120, 150)];
    // eraser and restore
    const e3 = IE.DEFAULT(); e3.ops.push({ op: 'brush', mode: 'erase', r: 20, hard: 0.9, pts: [[120, 150]] }); const k3 = IE.render(S0.c, e3);
    e3.ops.push({ op: 'brush', mode: 'restore', r: 20, hard: 0.9, pts: [[120, 150]] }); const k4 = IE.render(S0.c, e3);
    out.brush = [alphaAt(k3, 120, 150), alphaAt(k4, 120, 150)];
    // geometry: a quarter turn swaps the size; a point maps back to the original
    const e4 = IE.DEFAULT(); e4.rot90 = 1; const k5 = IE.render(S0.c, e4); out.rot = [k5.width, k5.height];
    const back = IE.toOriginal(e4, 400, 300, [150, 120]); out.map = back.map(v => Math.round(v));
    // crop to the red square and resize
    const e5 = IE.DEFAULT(); e5.crop = [250 / 400, 90 / 300, 370 / 400, 210 / 300]; let k6 = IE.render(S0.c, e5); out.crop = [k6.width, k6.height, k6.getContext('2d').getImageData(5, 5, 1, 1).data[0]];
    k6 = IE.resize(k6, 60); out.resized = [k6.width, k6.height];
    // colour: greyscale and exposure
    const e6 = IE.DEFAULT(); e6.col.effect = 'grey'; const k7 = IE.render(S0.c, e6), px = k7.getContext('2d').getImageData(120, 150, 1, 1).data; out.grey = px[0] === px[1] && px[1] === px[2];
    out.trim = IE.contentBox(k2, 0); out.trimExpect = [40 / 400, 70 / 300, 370 / 400, 230 / 300];   // after the wand: the blue disk and the red square
    // formats: a JPEG of a photo-like image is smaller than the PNG
    const big = document.createElement('canvas'); big.width = 600; big.height = 400; const bg = big.getContext('2d'), bd = bg.createImageData(600, 400); let sd = 5; const rn = () => { sd = (sd * 1103515245 + 12345) % 2147483648; return sd / 2147483648; }; for (let i = 0; i < 600 * 400; i++) { const x = i % 600, y = Math.floor(i / 600); bd.data[i * 4] = 120 + 80 * Math.sin(x / 40) + 20 * rn(); bd.data[i * 4 + 1] = 110 + 70 * Math.cos(y / 30) + 20 * rn(); bd.data[i * 4 + 2] = 100 + 60 * Math.sin((x + y) / 50) + 20 * rn(); bd.data[i * 4 + 3] = 255; } bg.putImageData(bd, 0, 0);
    const pe = IE.encode(big, { format: 'png' }), je = IE.encode(big, { format: 'jpeg', quality: 0.7 }); out.fmt = [pe.bytes, je.bytes, je.type];
    // the dialog: open, auto background, apply → the figure gets a transparent image; the original is kept
    ED.open(o); await wait(400);
    [...document.querySelectorAll('.ie-side button')].find(b => /background colour \(auto\)/.test(b.textContent)).click();
    await wait(200);
    out.dialogOps = ED._t.e.ops.length;
    await ED._t.apply(); await wait(100);
    out.applied = { orig: o.props.orig === href, alpha: o.props.hasAlpha, sil: /^data:image\/png/.test(o.props.silhouette || ''), info: o.props.fileInfo };
    o.props.shadow = true; const svg = RNBX.render.build(RNBX.state.doc, {}).svg; out.shadowSil = (svg.match(/<image/g) || []).length >= 2;
    // revert
    const inspBtn = () => [...document.querySelectorAll('.inspector button, #inspector button, button')].find(b => b.textContent === 'Revert to original');
    RNBX.select([o.id]); RNBX.inspector.build(); await wait(50);
    const rb = inspBtn(); if (rb) rb.click(); await wait(300);
    out.reverted = o.props.href === href && !o.props.edit;
    return out;
  });
  H.check('colour key: the white background and the white hole become transparent, colours stay', r.key[0] === 0 && r.key[1] === 255 && r.key[2] === 0 && r.key[3] === 255, r.key);
  H.check('magic wand: the connected outside goes, the enclosed white hole stays', r.wand[0] === 0 && r.wand[1] === 0 && r.wand[2] === 255 && r.wand[3] === 255, r.wand);
  H.check('eraser clears, restore brings back', r.brush[0] === 0 && r.brush[1] === 255, r.brush);
  H.check('a quarter turn swaps width and height; points map back to the original', r.rot.join() === '300,400' && Math.abs(r.map[0] - 120) <= 1 && Math.abs(r.map[1] - 150) <= 1, [r.rot, r.map]);
  H.check('crop to the red square, then resize to 60 px', r.crop[0] === 120 && r.crop[1] === 120 && r.crop[2] > 200 && r.resized.join() === '60,60', [r.crop, r.resized]);
  H.check('greyscale effect', r.grey);
  H.check('trim empty edges: the crop hugs the remaining picture', r.trim && r.trim.every((v, i) => Math.abs(v - r.trimExpect[i]) < 0.006), [r.trim, r.trimExpect]);
  H.check('JPEG is smaller than PNG for a photo-like image', r.fmt[1] < r.fmt[0] && r.fmt[2] === 'image/jpeg', r.fmt);
  H.check('editor: auto background removal applies; the original is kept', r.dialogOps === 1 && r.applied.orig && r.applied.alpha && r.applied.info && r.applied.info.type === 'image/png', r.applied);
  H.check('a cut-out casts a shadow of its own shape', r.applied.sil && r.shadowSil, r);
  H.check('“Revert to original” restores the picture', r.reverted, r.reverted);
  H.check('no errors', !page.errors.length, page.errors);
  await page.close();
};
