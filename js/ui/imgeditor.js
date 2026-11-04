/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/imgeditor.js
   "Edit image…" for the Image part (photos, logos, artwork; not
   for data images — the microscope panel keeps to the global,
   documented adjustments journals allow). Background removal
   (colour key, magic wand, eraser / restore brush, soft edges),
   crop / rotate / mirror, colour controls and effects, output
   size and file format with the file size. Before / after split
   view, undo; the original is kept, so every edit can be
   changed again or reverted.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, lib = RNBX.lib, IE = RNBX.imgEdit;
const ED = RNBX.imageEditor = {};
const decode = href => (RNBX.imgproc ? RNBX.imgproc.decode(href) : new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = href; }));

ED.open = obj => {
  const p = obj.props;
  if (!p.href) { RNBX.toast('Choose an image first'); return null; }
  const orig = p.orig || p.href;
  let e = Object.assign(IE.DEFAULT(), JSON.parse(JSON.stringify(p.edit || {})));
  e.col = Object.assign(IE.DEFAULT().col, e.col || {});
  const hist = [], redoS = [], snap = () => { hist.push(JSON.stringify(e)); if (hist.length > 150) hist.shift(); redoS.length = 0; };
  let img = null, src = null, k = 1, W0 = 0, H0 = 0, out = null, before = null, alphaKey = '', alphaC = null, tool = 'move', split = 0, brush = 22, hard = 0.6, tolW = 18, cur = null, view = { s: 1, ox: 0, oy: 0 };
  const cv = el('canvas', { class: 'ms-canvas', tabindex: 0 }), host = el('div', { class: 'ms-view ie-view' }, cv), info = el('div', { class: 'hint' }), sizeInfo = el('div', { class: 'readout' });

  /* ---------- rendering the preview ---------- */
  const cropTool = () => tool === 'crop';
  const renderNow = () => {
    if (!src) return;
    const ak = JSON.stringify([e.ops, e.feather]);
    if (ak !== alphaKey) { alphaC = IE.applyAlpha(src, e.ops, e.feather, k); alphaKey = ak; }
    const e2 = cropTool() ? Object.assign({}, e, { crop: [0, 0, 1, 1] }) : e;
    let c = IE.applyGeom(alphaC, e2); c = IE.applyColour(c, e2.col, k); out = IE.applyCrop(c, e2.crop);
    before = split > 0 ? IE.applyCrop(IE.applyGeom(src, e2), e2.crop) : null;
    draw(); estimate();
  };
  let rt = 0; const render = (now) => { clearTimeout(rt); if (now) renderNow(); else rt = setTimeout(renderNow, 40); };
  const fit = () => { const W = cv.clientWidth, H = cv.clientHeight; view.s = Math.min(W / out.width, H / out.height) * 0.94; view.ox = (W - out.width * view.s) / 2; view.oy = (H - out.height * view.s) / 2; };
  let fitted = false, lastSize = '';
  function draw() {
    if (!out) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight, ctx = cv.getContext('2d');
    const sz = out.width + 'x' + out.height + tool; if (!fitted || sz !== lastSize) { fit(); fitted = true; lastSize = sz; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#e9ebef'; ctx.fillRect(0, 0, W, H);
    // a checkerboard shows transparency
    const { s, ox, oy } = view, iw = out.width * s, ih = out.height * s;
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, iw, ih); ctx.clip();
    for (let y = 0; y < ih; y += 10) for (let x = 0; x < iw; x += 10) { ctx.fillStyle = ((x + y) / 10) % 2 ? '#ffffff' : '#d5d9e0'; ctx.fillRect(ox + x, oy + y, 10, 10); }
    ctx.restore();
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(out, ox, oy, iw, ih);
    if (before && split > 0) { const xs = ox + iw * split; ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, xs - ox, ih); ctx.clip(); ctx.fillStyle = '#fff'; ctx.fillRect(ox, oy, iw, ih); ctx.drawImage(before, ox, oy, iw, ih); ctx.restore(); ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(xs, oy); ctx.lineTo(xs, oy + ih); ctx.stroke(); ctx.font = 'bold 11px Arial'; ctx.fillStyle = '#ffd23f'; ctx.fillText('before', xs - 46, oy + 14); ctx.fillText('after', xs + 6, oy + 14); }
    if (cropTool()) {
      const c = cur && cur.crop ? cur.crop : e.crop, X0 = ox + c[0] * iw, Y0 = oy + c[1] * ih, X1 = ox + c[2] * iw, Y1 = oy + c[3] * ih;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(ox, oy, iw, Y0 - oy); ctx.fillRect(ox, Y1, iw, oy + ih - Y1); ctx.fillRect(ox, Y0, X0 - ox, Y1 - Y0); ctx.fillRect(X1, Y0, ox + iw - X1, Y1 - Y0);
      ctx.strokeStyle = '#ffd23f'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.strokeRect(X0, Y0, X1 - X0, Y1 - Y0); ctx.setLineDash([]);
    }
    if (cur && cur.brush) { ctx.strokeStyle = cur.brush.mode === 'restore' ? '#1f9d3a' : '#d62728'; ctx.lineWidth = 1.5; const q = cur.screen; if (q) { ctx.beginPath(); ctx.arc(q[0], q[1], brush, 0, 2 * Math.PI); ctx.stroke(); } }
  }

  /* ---------- pointer: screen → original pixels ---------- */
  const scr = ev => { const r = cv.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  const toWork = q => [(q[0] - view.ox) / view.s, (q[1] - view.oy) / view.s];   // pixels of the displayed (cropped) result
  const toOrig = q => {
    const w = toWork(q), [GW, GH] = IE.geomSize(src.width, src.height, e), c = cropTool() ? [0, 0, 1, 1] : e.crop;
    return IE.toOriginal(e, W0, H0, [(w[0] + c[0] * GW) * k, (w[1] + c[1] * GH) * k]);
  };
  const pixelAt = q => { const o = toOrig(q), x = Math.round(o[0] / k), y = Math.round(o[1] / k); if (x < 0 || y < 0 || x >= src.width || y >= src.height) return null; const d = src.getContext('2d').getImageData(x, y, 1, 1).data; return [d[0], d[1], d[2]]; };
  cv.addEventListener('contextmenu', ev => ev.preventDefault());
  cv.addEventListener('pointerdown', ev => {
    cv.setPointerCapture(ev.pointerId); const q = scr(ev);
    if (tool === 'move' || ev.button === 1 || ev.button === 2) { cur = { pan: { x: q[0], y: q[1], ox: view.ox, oy: view.oy } }; return; }
    if (tool === 'wand') { snap(); const o = toOrig(q); e.ops.push({ op: 'wand', x: U.round(o[0], 1), y: U.round(o[1], 1), tol: tolW }); render(true); return; }
    if (tool === 'pick') { const c = pixelAt(q); if (c) { snap(); e.ops.push({ op: 'key', color: c, tol: tolW, soft: 6 }); render(true); setTool('move'); } return; }
    if (tool === 'erase' || tool === 'restore') { snap(); const o = toOrig(q); cur = { brush: { op: 'brush', mode: tool === 'restore' ? 'restore' : 'erase', r: U.round(brush / view.s * k, 2), hard, pts: [[U.round(o[0], 1), U.round(o[1], 1)]] }, screen: q }; e.ops.push(cur.brush); render(true); return; }
    if (tool === 'crop') { const w = toWork(q); cur = { crop: null, a: [U.clamp(w[0] / out.width, 0, 1), U.clamp(w[1] / out.height, 0, 1)] }; }
  });
  cv.addEventListener('pointermove', ev => {
    const q = scr(ev);
    if (cur && cur.pan) { view.ox = cur.pan.ox + q[0] - cur.pan.x; view.oy = cur.pan.oy + q[1] - cur.pan.y; draw(); return; }
    if (cur && cur.brush) { const o = toOrig(q); cur.brush.pts.push([U.round(o[0], 1), U.round(o[1], 1)]); cur.screen = q; render(); return; }
    if (cur && cur.a) { const w = toWork(q), b = [U.clamp(w[0] / out.width, 0, 1), U.clamp(w[1] / out.height, 0, 1)]; let c = [Math.min(cur.a[0], b[0]), Math.min(cur.a[1], b[1]), Math.max(cur.a[0], b[0]), Math.max(cur.a[1], b[1])];
      const ar = ratioOf(); if (ar) { const wpx = (c[2] - c[0]) * out.width, hpx = wpx / ar; c[3] = Math.min(1, c[1] + hpx / out.height); if (b[1] < cur.a[1]) { c[1] = Math.max(0, cur.a[1] - hpx / out.height); c[3] = cur.a[1]; } }
      cur.crop = c.map(v => U.round(v, 4)); draw(); return; }
    if (tool === 'erase' || tool === 'restore') { cur = cur && cur.brush ? cur : { screen: q, brush: { mode: tool } }; cur.screen = q; draw(); if (!ev.buttons) cur = null; }
  });
  cv.addEventListener('pointerup', () => {
    if (cur && cur.crop) { if (cur.crop[2] - cur.crop[0] > 0.01 && cur.crop[3] - cur.crop[1] > 0.01) { snap(); e.crop = cur.crop; } }
    cur = null; render(true);
  });
  cv.addEventListener('wheel', ev => { ev.preventDefault(); const q = scr(ev), f = Math.exp(-ev.deltaY * 0.0015), ns = U.clamp(view.s * f, 0.02, 40); view.ox = q[0] - (q[0] - view.ox) * ns / view.s; view.oy = q[1] - (q[1] - view.oy) * ns / view.s; view.s = ns; draw(); }, { passive: false });

  /* ---------- controls ---------- */
  const sec = (title, ...kids) => el('div', { class: 'ie-sec' }, el('h4', { text: title }), ...kids);
  const row = (...kids) => el('div', { class: 'row ie-row' }, ...kids);
  const btn = (text, fn, o = {}) => el('button', Object.assign({ class: 'btn small' + (o.primary ? ' primary' : '') + (o.ghost ? ' ghost' : ''), type: 'button', text, onclick: fn }, o.title ? { title: o.title } : {}));
  const slider = (label, get, set, min, max, step, fmtv) => {
    const val = el('span', { class: 'ie-val' }), r = el('input', { type: 'range', min, max, step, value: get() });
    const show = () => { val.textContent = fmtv ? fmtv(+r.value) : r.value; };
    r.addEventListener('pointerdown', () => snap()); r.addEventListener('keydown', () => snap());
    r.oninput = () => { set(+r.value); show(); render(); }; show();
    sliders.push(() => { r.value = get(); show(); });
    return el('label', { class: 'ie-slider' }, el('span', { text: label }), r, val);
  };
  const sliders = [];
  const toolBtns = {};
  const setTool = t => { tool = t; Object.entries(toolBtns).forEach(([k2, b]) => b.classList.toggle('primary', k2 === t)); cv.style.cursor = t === 'move' ? 'grab' : 'crosshair'; info.textContent = { move: 'Drag to move around; wheel to zoom.', wand: 'Click an area to make it transparent (connected pixels of similar colour).', pick: 'Click the background colour to remove it everywhere.', erase: 'Paint over what should become transparent.', restore: 'Paint to bring back what was removed.', crop: 'Drag a rectangle to keep.' }[t] + ' Ctrl+Z: undo.'; fitted = false; render(true); };
  const T = (id, text) => (toolBtns[id] = btn(text, () => setTool(id)));

  // background
  const autoWhite = () => { if (!src) return; const c = src.getContext('2d'), w = src.width, h = src.height, px = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]].map(([x, y]) => c.getImageData(x, y, 1, 1).data), col = [0, 1, 2].map(i => Math.round(px.reduce((a, d) => a + d[i], 0) / 4)); snap(); e.ops.push({ op: 'key', color: col, tol: tolW, soft: 6 }); render(true); RNBX.toast('Background colour from the corners removed (' + col.join(', ') + ').'); };
  const bgSec = sec('Background',
    row(btn('Remove the background colour (auto)', autoWhite, { primary: true, title: 'Takes the colour of the corners and makes it transparent everywhere' })),
    row(T('pick', 'Pick colour'), T('wand', 'Magic wand'), T('erase', 'Eraser'), T('restore', 'Restore')),
    slider('Tolerance', () => tolW, v => { tolW = v; }, 1, 60, 1),
    slider('Brush size', () => brush, v => { brush = v; }, 3, 120, 1, v => v + ' px'),
    slider('Brush hardness', () => hard * 100, v => { hard = v / 100; }, 0, 95, 5, v => v + ' %'),
    slider('Soften edges', () => e.feather, v => { e.feather = v; }, 0, 8, 0.5, v => v + ' px'),
    row(btn('Undo last background step', () => { if (e.ops.length) { snap(); e.ops.pop(); render(true); } }, { ghost: true }), btn('Reset background', () => { snap(); e.ops = []; e.feather = 0; render(true); }, { ghost: true })));
  // crop and rotate
  const ratioSel = el('select', {}, [['free', 'Free'], ['1', '1 : 1'], ['1.3333', '4 : 3'], ['1.5', '3 : 2'], ['1.7778', '16 : 9'], ['0.75', '3 : 4']].map(q => el('option', { value: q[0], text: q[1] })));
  const ratioOf = () => (ratioSel.value === 'free' ? 0 : +ratioSel.value);
  const geoSec = sec('Crop, rotate, mirror',
    row(T('crop', 'Crop'), ratioSel, btn('Trim empty edges', () => { if (!alphaC) return; const full = IE.applyColour(IE.applyGeom(alphaC, e), e.col, k), b = IE.contentBox(full); if (!b) return; snap(); e.crop = b; fitted = false; render(true); }, { title: 'Crop to the picture after its background was removed' }), btn('No crop', () => { snap(); e.crop = [0, 0, 1, 1]; render(true); }, { ghost: true })),
    row(btn('⟲ 90°', () => { snap(); e.rot90 = (e.rot90 + 3) % 4; e.crop = [0, 0, 1, 1]; fitted = false; render(true); }), btn('⟳ 90°', () => { snap(); e.rot90 = (e.rot90 + 1) % 4; e.crop = [0, 0, 1, 1]; fitted = false; render(true); }),
      btn('Mirror ↔', () => { snap(); e.flipH = !e.flipH; render(true); }), btn('Mirror ↕', () => { snap(); e.flipV = !e.flipV; render(true); })),
    slider('Straighten', () => e.rot, v => { e.rot = v; fitted = false; }, -45, 45, 0.1, v => v.toFixed(1) + '°'));
  // colour
  const c = () => e.col;
  const effSel = el('select', { onchange: () => { snap(); c().effect = effSel.value; c1.parentNode.style.display = /duotone|tint/.test(effSel.value) ? '' : 'none'; c2.style.display = effSel.value === 'duotone' ? '' : 'none'; render(true); } },
    [['none', 'No effect'], ['grey', 'Greyscale'], ['sepia', 'Sepia'], ['invert', 'Invert'], ['duotone', 'Duotone (two colours)'], ['tint', 'One colour (icons, logos)']].map(q => el('option', { value: q[0], text: q[1] })));
  effSel.value = c().effect;
  const c1 = el('input', { type: 'color', value: c().c1, oninput: () => { c().c1 = c1.value; render(); } }), c2 = el('input', { type: 'color', value: c().c2, oninput: () => { c().c2 = c2.value; render(); } });
  const colRow = row(el('span', { class: 'hint', style: { margin: 0 }, text: 'colours' }), c1, c2);
  colRow.style.display = /duotone|tint/.test(c().effect) ? '' : 'none'; c2.style.display = c().effect === 'duotone' ? '' : 'none';
  const colSec = sec('Colour',
    row(btn('Auto levels', () => { if (!out) return; snap(); const l = IE.autoLevels(IE.applyGeom(alphaC || src, e)); c().lo = l.lo; c().hi = l.hi; render(true); sliders.forEach(f => f()); }, { title: 'Stretch the darkest and brightest 0.5 % to black and white' }),
      btn('Reset colour', () => { snap(); e.col = IE.DEFAULT().col; effSel.value = 'none'; colRow.style.display = 'none'; sliders.forEach(f => f()); render(true); }, { ghost: true })),
    slider('Exposure', () => c().exposure, v => { c().exposure = v; }, -2, 2, 0.05, v => (v > 0 ? '+' : '') + v.toFixed(2) + ' EV'),
    slider('Brightness', () => c().brightness, v => { c().brightness = v; }, -100, 100, 1),
    slider('Contrast', () => c().contrast, v => { c().contrast = v; }, -100, 100, 1),
    slider('Gamma', () => c().gamma, v => { c().gamma = v; }, 0.3, 3, 0.01, v => v.toFixed(2)),
    slider('Saturation', () => c().saturation, v => { c().saturation = v; }, -100, 100, 1),
    slider('Temperature', () => c().temp, v => { c().temp = v; }, -100, 100, 1, v => (v < 0 ? 'cooler ' : v > 0 ? 'warmer ' : '') + v),
    slider('Tint', () => c().tint, v => { c().tint = v; }, -100, 100, 1, v => (v < 0 ? 'green ' : v > 0 ? 'magenta ' : '') + v),
    slider('Sharpen', () => c().sharpen, v => { c().sharpen = v; }, 0, 100, 1),
    slider('Blur', () => c().blur, v => { c().blur = v; }, 0, 20, 0.5, v => v + ' px'),
    row(el('span', { class: 'hint', style: { margin: 0 }, text: 'Effect' }), effSel), colRow);
  // size and file
  const fmtSel = el('select', { onchange: () => { snap(); e.format = fmtSel.value; qRow.style.display = e.format === 'png' ? 'none' : ''; bgRow.style.display = e.format === 'jpeg' ? '' : 'none'; estimate(true); } }, [['png', 'PNG (lossless, transparency)'], ['jpeg', 'JPEG (photos, smallest)'], ['webp', 'WebP (small, transparency)']].map(q => el('option', { value: q[0], text: q[1] })));
  fmtSel.value = e.format;
  const qIn = el('input', { type: 'range', min: 0.3, max: 1, step: 0.01, value: e.quality, oninput: () => { e.quality = +qIn.value; qVal.textContent = Math.round(e.quality * 100) + ' %'; estimate(); } }), qVal = el('span', { class: 'ie-val', text: Math.round(e.quality * 100) + ' %' });
  const qRow = el('label', { class: 'ie-slider' }, el('span', { text: 'Quality' }), qIn, qVal); qRow.style.display = e.format === 'png' ? 'none' : '';
  const jb = el('input', { type: 'color', value: e.jpegBg, oninput: () => { e.jpegBg = jb.value; estimate(); } }), bgRow = row(el('span', { class: 'hint', style: { margin: 0 }, text: 'JPEG has no transparency; background' }), jb); bgRow.style.display = e.format === 'jpeg' ? '' : 'none';
  const wIn = el('input', { type: 'number', min: 16, max: 8000, step: 1, style: { width: '86px' }, placeholder: 'original', value: e.outW || '', onchange: () => { snap(); e.outW = Math.max(0, Math.round(+wIn.value || 0)); estimate(true); } });
  const dpiBtn = dpi => btn(dpi + ' dpi', () => { snap(); e.outW = Math.max(16, Math.round(p.w / 25.4 * dpi)); wIn.value = e.outW; estimate(true); }, { title: `Pixels for ${dpi} dpi at the printed width (${U.fmt(p.w, 1)} mm)` });
  const fileSec = sec('Size and file',
    row(el('span', { class: 'hint', style: { margin: 0 }, text: 'Width (px)' }), wIn, dpiBtn(300), dpiBtn(600), btn('Original', () => { snap(); e.outW = 0; wIn.value = ''; estimate(true); }, { ghost: true })),
    row(el('span', { class: 'hint', style: { margin: 0 }, text: 'Format' }), fmtSel), qRow, bgRow, sizeInfo,
    row(btn('Download the edited image', async () => { const r = await IE.bake(orig, e, decode); const a = document.createElement('a'); a.href = r.url; a.download = U.slug(S.doc.meta.title || 'image') + '_edited.' + (e.format === 'jpeg' ? 'jpg' : e.format); a.click(); })));
  // before / after, undo
  const splitIn = el('input', { type: 'range', min: 0, max: 1, step: 0.01, value: 0, oninput: () => { split = +splitIn.value; render(true); } });
  const viewSec = el('div', { class: 'row ie-row ie-top' }, T('move', 'Move / zoom'), el('label', { class: 'ie-slider', style: { flex: '1 1 160px' } }, el('span', { text: 'Before | after' }), splitIn),
    btn('↶', undo, { title: 'Undo (Ctrl+Z)' }), btn('↷', redo, { title: 'Redo (Ctrl+Y)' }), btn('Fit', () => { fitted = false; draw(); }, { ghost: true }));
  function undo() { if (!hist.length) return; redoS.push(JSON.stringify(e)); e = JSON.parse(hist.pop()); syncAll(); render(true); }
  function redo() { if (!redoS.length) return; hist.push(JSON.stringify(e)); e = JSON.parse(redoS.pop()); syncAll(); render(true); }
  const syncAll = () => { sliders.forEach(f => f()); effSel.value = e.col.effect; fmtSel.value = e.format; wIn.value = e.outW || ''; qIn.value = e.quality; qRow.style.display = e.format === 'png' ? 'none' : ''; bgRow.style.display = e.format === 'jpeg' ? '' : 'none'; fitted = false; };

  /* the final pixel size and file size (at full resolution, after a short pause) */
  let et = 0, estTok = 0;
  function estimate(now) {
    clearTimeout(et);
    et = setTimeout(async () => {
      const tok = ++estTok; sizeInfo.textContent = 'Working out the file size…';
      try {
        const r = await IE.bake(orig, e, decode); if (tok !== estTok) return;
        const was = IE.bytesOf(orig), dpi = r.w / (p.w / 25.4);
        sizeInfo.innerHTML = `<b>${r.w} × ${r.h} px</b> · ${U.esc(r.type.replace('image/', '').toUpperCase())} · <b>${IE.fmtBytes(r.bytes)}</b> (original ${IE.fmtBytes(was)}) · ${Math.round(dpi)} dpi at ${U.fmt(p.w, 1)} mm wide${r.alpha ? ' · transparent background' : ''}` + (dpi < 300 ? '<br><span style="color:var(--danger)">Below 300 dpi at its printed size: journals usually ask for 300 dpi (photos) or more.</span>' : '');
      } catch (err) { sizeInfo.textContent = 'Could not work out the size: ' + err.message; }
    }, now ? 30 : 500);
  }

  /* apply: the edited image goes into the figure, the original is kept */
  const apply = async () => {
    const r = await IE.bake(orig, e, decode);
    RNBX.history.checkpoint();
    if (IE.isIdentity(e) && e.format === 'png' && !p.orig) { m.close(); return; }
    p.orig = orig; p.edit = JSON.parse(JSON.stringify(e)); p.href = r.url; p.aspect = r.w / r.h; p.h = U.round(p.w / p.aspect, 2);
    p.hasAlpha = r.alpha; p.silhouette = r.silhouette; p.fileInfo = { w: r.w, h: r.h, bytes: r.bytes, type: r.type };
    RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build();
    RNBX.toast(`Image edited: ${r.w} × ${r.h} px, ${IE.fmtBytes(r.bytes)}. The original is kept (Revert to original in the inspector); Ctrl+Z undoes.`);
    m.close();
  };
  const side = el('div', { class: 'ms-side ie-side' }, bgSec, geoSec, colSec, fileSec);
  const onKey = ev => {
    if (!document.body.contains(cv)) return;
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'range') return;
    const k2 = ev.key.toLowerCase();
    if ((ev.ctrlKey || ev.metaKey) && k2 === 'z') { ev.preventDefault(); ev.stopPropagation(); ev.shiftKey ? redo() : undo(); }
    else if ((ev.ctrlKey || ev.metaKey) && k2 === 'y') { ev.preventDefault(); ev.stopPropagation(); redo(); }
  };
  window.addEventListener('keydown', onKey, true);
  const m = D.modal({ title: 'Edit image', sub: 'Photos, logos and artwork — for microscope data use the image panel, which keeps to the adjustments journals allow', wide: true,
    body: el('div', { class: 'ms-wrap ie-wrap' }, el('div', {}, viewSec, host, info), side),
    foot: [btn('Reset everything', () => { snap(); e = IE.DEFAULT(); syncAll(); render(true); }, { ghost: true }), el('span', { style: { flex: '1 1 auto' } }), btn('Cancel', () => m.close(), { ghost: true }), btn('Apply', apply, { primary: true })],
    onClose: () => window.removeEventListener('keydown', onKey, true) });
  m.root.classList.add('ms-modal');
  setTool('move');
  decode(orig).then(im => {
    img = im; const S0 = IE.source(im, 1400); src = S0.c; k = S0.k; W0 = S0.W0; H0 = S0.H0;
    const r = host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    cv.width = Math.max(320, Math.round(r.width)) * dpr; cv.height = Math.max(260, Math.round(r.height)) * dpr;
    render(true); estimate(true);
  }).catch(err => RNBX.toast('Could not open the image: ' + err.message, 'error'));
  ED._t = { get e() { return e; }, set: v => { e = Object.assign(IE.DEFAULT(), v); syncAll(); render(true); }, apply, setTool, toOrig, scr: q => q, view: () => view, close: () => m.close(), out: () => out };
  return m;
};

/* inspector buttons of the Image part */
lib.get('image').tools = obj => {
  const p = obj.props; if (!p.href) return null;
  const fi = p.fileInfo, row = el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px', marginBottom: '10px' } },
    el('button', { class: 'btn small primary', type: 'button', style: { flex: '0 0 auto' }, text: 'Edit image…', title: 'Transparent background, crop, rotate, colour, size and file format', onclick: () => ED.open(obj) }),
    p.orig ? el('button', { class: 'btn small ghost', type: 'button', style: { flex: '0 0 auto' }, text: 'Revert to original', onclick: () => { RNBX.history.checkpoint(); RNBX.imgEdit && decode(p.orig).then(im => { p.href = p.orig; p.aspect = (im.naturalWidth || 1) / (im.naturalHeight || 1); p.h = U.round(p.w / p.aspect, 2); delete p.edit; delete p.orig; delete p.fileInfo; p.hasAlpha = false; p.silhouette = ''; RNBX.changed(); RNBX.inspector.build(); }); } }) : null);
  return el('div', {}, fi ? el('div', { class: 'readout', style: { marginBottom: '8px' }, text: `${fi.w} × ${fi.h} px · ${fi.type.replace('image/', '').toUpperCase()} · ${IE.fmtBytes(fi.bytes)} · ${Math.round(fi.w / (p.w / 25.4))} dpi at this size${p.hasAlpha ? ' · transparent background' : ''}` }) : null, row);
};
})();
