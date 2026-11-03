/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/panels.js
   Multi-panel figures from images and plots: lay out panels in
   rows of equal height at a journal width with letters a, b, c…,
   import several microscope images at once, empty panel grids to
   drop images into, and the calibrate / crop dialog of an image
   panel (measure a burnt-in scale bar, crop off the info bar).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom, el = D.el, IP = RNBX.imgproc;
const PN = RNBX.panels = {};

const LETTERS = { a: i => 'abcdefghijklmnopqrstuvwxyz'[i % 26], A: i => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i % 26], pa: i => '(' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + ')', ab: i => 'abcdefghijklmnopqrstuvwxyz'[i % 26] + ')', none: () => '' };
PN.LETTERS = LETTERS;
const PANEL_TYPES = ['micrograph', 'image', 'plot'];
const box = o => lib.worldBox(o);

/* resize one item so its box is `wt` wide (micrographs and images keep their aspect) */
const sizeTo = (o, wt) => {
  const b = box(o), f = wt / Math.max(0.1, b[2] - b[0]);
  if (o.type === 'micrograph') { o.props.w = U.round(o.props.w * f, 3); lib.get('micrograph').bbox(o.props); }
  else if (lib.get(o.type).resizable && o.props.w) { o.props.w = U.round(o.props.w * f, 3); o.props.h = U.round(o.props.h * f, 3); }
  else o.scale = U.round((o.scale || 1) * f, 4);
};
const moveTo = (o, x, y) => { const b = box(o); o.x += x - b[0]; o.y += y - b[1]; };

/* reading order: rows from top to bottom, then left to right */
PN.readingOrder = objs => {
  const items = objs.map(o => ({ o, b: box(o) }));
  items.sort((p, q) => (p.b[1] + p.b[3]) / 2 - (q.b[1] + q.b[3]) / 2);
  const rows = [];
  items.forEach(it => {
    const cy = (it.b[1] + it.b[3]) / 2, r = rows.find(r => Math.abs(r.cy - cy) < Math.max(3, (it.b[3] - it.b[1]) * 0.35));
    if (r) r.items.push(it); else rows.push({ cy, items: [it] });
  });
  return rows.flatMap(r => r.items.sort((p, q) => p.b[0] - q.b[0]).map(it => it.o));
};

/* lay out panels in rows of equal height across the page width
   opt: { width, cols, gap, margin, letters, matchBars, preset } */
PN.layout = (objs, opt = {}) => {
  if (!objs.length) return;
  const doc = S.doc, W = opt.width || doc.page.width, gap = opt.gap == null ? 2 : opt.gap, m = opt.margin == null ? 1 : opt.margin;
  const cols = Math.max(1, Math.min(objs.length, opt.cols || (objs.length <= 3 ? objs.length : objs.length === 4 ? 2 : 3)));
  if (!opt.noCheckpoint) RNBX.history.checkpoint();
  // the page first, so resizing keeps content where it is
  doc.page.width = W; doc.page.preset = opt.preset || 'custom';
  // equal scale-bar lengths: the automatic length of the smallest field, in every panel
  if (opt.matchBars) {
    const mg = objs.filter(o => o.type === 'micrograph' && o.props.calib !== 'none' && IP.geom(o.props).visNm > 0);
    if (mg.length > 1) { const nm = Math.min(...mg.map(o => IP.nice(IP.geom(o.props).visNm * 0.22))); mg.forEach(o => { o.props.sbLen = U.round(nm / IP.toNm(1, o.props.unit), 6); }); }
  }
  const asp = o => { const b = box(o); return (b[2] - b[0]) / Math.max(0.1, b[3] - b[1]); };
  const rows = [];
  for (let i = 0; i < objs.length; i += cols) rows.push(objs.slice(i, i + cols));
  const full = W - 2 * m - gap * (cols - 1), meanA = objs.reduce((s, o) => s + asp(o), 0) / objs.length;
  let y = m;
  rows.forEach(row => {
    const avail = W - 2 * m - gap * (row.length - 1);
    let hr = avail / row.reduce((s, o) => s + asp(o), 0);
    if (row.length < cols) hr = Math.min(hr, full / (cols * meanA));
    // two passes: parts with fixed-size extras (a colour bar's text) settle on the second
    for (let pass = 0; pass < 2; pass++) row.forEach(o => sizeTo(o, hr * asp(o)));
    const used = row.reduce((s, o) => { const b = box(o); return s + b[2] - b[0]; }, 0) + gap * (row.length - 1);
    let x = (W - used) / 2;
    row.forEach(o => { moveTo(o, x, y); const b = box(o); x = b[2] + gap; });
    y += Math.max(...row.map(o => { const b = box(o); return b[3] - b[1]; })) + gap;
  });
  doc.page.height = U.round(y - gap + m, 2);
  // letters: inside image panels, as panel-letter objects for the rest
  const style = LETTERS[opt.letters || 'a'] || LETTERS.a;
  objs.forEach((o, i) => {
    const t = style(i);
    if (o.type === 'micrograph') { o.props.letter = t; return; }
    let pl = doc.objects.find(q => q.type === 'panel' && q.props.of === o.id);
    if (!t) { if (pl) doc.objects.splice(doc.objects.indexOf(pl), 1); return; }
    if (!pl) { pl = RNBX.createObject('panel', 0, 0); pl.props.of = o.id; doc.objects.push(pl); }
    const b = box(o); pl.props.text = t; pl.x = b[0] + 0.6; pl.y = b[1] + U.pt2mm(pl.props.size) * 0.85 + 0.4;
  });
  RNBX.changed();
  if (RNBX.canvas && RNBX.canvas.fit) setTimeout(RNBX.canvas.fit, 0);
};

/* a grid of empty image panels to drop images into */
PN.grid = (rows, cols, opt = {}) => {
  RNBX.history.checkpoint();
  const made = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const o = RNBX.createObject('micrograph', 20 + c * 45, 20 + r * 36);
    S.doc.objects.push(o); made.push(o);
  }
  PN.layout(made, Object.assign({}, opt, { cols, noCheckpoint: true }));
  RNBX.select(made.map(o => o.id));
  return made;
};

/* several image files → image panels, laid out at the current width */
PN.importFiles = (files, opt = {}) => {
  files = files.filter(f => RNBX.project.isImageFile(f));
  if (!files.length) return Promise.resolve([]);
  RNBX.history.checkpoint();
  let made = files.map((f, i) => { const o = RNBX.createObject('micrograph', 20 + i * 45, 20); S.doc.objects.push(o); return o; });
  const hc = RNBX.history.checkpoint;
  RNBX.history.checkpoint = () => {};   // one undo step for the whole import
  return Promise.allSettled(made.map((o, i) => IP.fill(o, files[i]))).finally(() => { RNBX.history.checkpoint = hc; }).then(res => {
    // panels whose file could not be read are taken out again (the reason was shown)
    res.forEach((r, i) => { if (r.status === 'rejected') S.doc.objects.splice(S.doc.objects.indexOf(made[i]), 1); });
    made = made.filter((o, i) => res[i].status === 'fulfilled');
    if (!made.length) { RNBX.changed(); return made; }
    PN.layout(made, Object.assign({ noCheckpoint: true }, opt));
    RNBX.select(made.map(o => o.id));
    return made;
  });
};

/* ---------- the "Lay out panels" dialog ---------- */
PN.dialog = () => {
  let objs = RNBX.selected().filter(o => !lib.get(o.type).connection && o.type !== 'panel');
  if (objs.length < 1) objs = S.doc.objects.filter(o => PANEL_TYPES.includes(o.type) && !o.hidden);
  objs = PN.readingOrder(objs);
  const presets = RNBX.PRESETS.filter(p => p.group === 'Journal figure');
  const wSel = el('select', {}, presets.map(p => el('option', { value: p.id, text: `${p.name} — ${p.w} mm` })), el('option', { value: 'custom', text: 'Custom width…' }));
  const cur = presets.find(p => Math.abs(p.w - S.doc.page.width) < 0.6);
  wSel.value = cur ? cur.id : 'nature-2';
  const wCustom = el('input', { type: 'number', min: 20, max: 500, step: 0.5, value: U.round(S.doc.page.width, 1), style: { display: wSel.value === 'custom' ? '' : 'none' } });
  wSel.onchange = () => { wCustom.style.display = wSel.value === 'custom' ? '' : 'none'; };
  const n = Math.max(1, objs.length);
  const cols = el('input', { type: 'number', min: 1, max: 12, step: 1, value: n <= 3 ? n : n === 4 ? 2 : 3 });
  const gap = el('input', { type: 'number', min: 0, max: 20, step: 0.25, value: 2 });
  const letters = el('select', {}, [['a', 'a, b, c'], ['A', 'A, B, C'], ['pa', '(a), (b), (c)'], ['ab', 'a), b), c)'], ['none', 'No letters']].map(o => el('option', { value: o[0], text: o[1] })));
  const match = el('input', { type: 'checkbox', checked: true });
  const rows = el('input', { type: 'number', min: 1, max: 8, step: 1, value: 2 }), gcols = el('input', { type: 'number', min: 1, max: 8, step: 1, value: 2 });
  const opt = () => { const p = presets.find(q => q.id === wSel.value); return { width: p ? p.w : +wCustom.value, preset: p ? p.id : 'custom', cols: +cols.value, gap: +gap.value, letters: letters.value, matchBars: match.checked }; };
  const field = (label, ...c) => el('div', { class: 'field' }, el('label', {}, label), ...c);
  const mdl = D.modal({
    title: 'Lay out figure panels', sub: objs.length ? `${objs.length} panel${objs.length === 1 ? '' : 's'}, in reading order` : 'No panels yet: make an empty grid, or import images',
    body: [
      field('Figure width', wSel, wCustom),
      el('div', { class: 'grid2' }, field('Columns', cols), field('Gap between panels (mm)', gap)),
      field('Panel letters', letters),
      el('label', { class: 'check' }, match, 'Same scale-bar length in every image panel'),
      el('div', { class: 'note', text: 'Panels in a row get the same height and the row fills the width; the page height follows. Type sizes and line weights are not scaled, so text prints at the size you set.' }),
      el('hr'),
      el('div', { class: 'note', text: 'Or start from an empty grid of image panels and drop an image onto each:' }),
      el('div', { class: 'grid2' }, field('Rows', rows), field('Columns', gcols)),
      el('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } },
        el('button', { class: 'btn small', type: 'button', text: 'Make empty grid', onclick: () => { PN.grid(+rows.value, +gcols.value, opt()); mdl.close(); } }),
        el('button', { class: 'btn small', type: 'button', text: 'Import images as panels…', onclick: () => { mdl.close(); RNBX.project.pickFile('image/*', fs => PN.importFiles(fs, opt()), true); } })),
    ],
    foot: [el('button', { class: 'btn primary', type: 'button', text: 'Lay out', disabled: !objs.length, onclick: () => { PN.layout(objs, opt()); mdl.close(); RNBX.toast('Panels laid out. Ctrl+Z to undo.'); } })],
  });
  return mdl;
};

/* ---------- calibrate / crop dialog of one image panel ---------- */
PN.calibrate = obj => {
  const p = obj.props;
  if (!p.href) { RNBX.toast('Choose an image first'); return; }
  const cv = el('canvas', { style: { maxWidth: '100%', maxHeight: '56vh', margin: '0 auto', display: 'block', cursor: 'crosshair', background: '#000', borderRadius: '6px', touchAction: 'none' } });
  const mode = el('select', {}, el('option', { value: 'measure', text: 'Measure a known length (e.g. the burnt-in scale bar)' }), el('option', { value: 'crop', text: 'Crop (drag a rectangle)' }));
  const horiz = el('input', { type: 'checkbox', checked: true });
  const len = el('input', { type: 'number', min: 0, step: 'any', value: '' }), unit = el('select', {}, IP.UNITS.map(u => el('option', { value: u, text: u })));
  unit.value = p.unit || 'nm';
  const info = el('div', { class: 'readout', text: 'Drag along the scale bar printed in the image, then type its length.' });
  let line = null, crop = [p.cx0 || 0, p.cy0 || 0, p.cx1 == null ? 1 : p.cx1, p.cy1 == null ? 1 : p.cy1], drag = null, img = null, k = 1;
  const draw = () => {
    if (!img) return;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    const [a, b, c, d] = crop.map((v, i) => v * (i % 2 ? cv.height : cv.width));
    ctx.fillRect(0, 0, cv.width, b); ctx.fillRect(0, d, cv.width, cv.height - d); ctx.fillRect(0, b, a, d - b); ctx.fillRect(c, b, cv.width - c, d - b);
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(a, b, c - a, d - b); ctx.setLineDash([]);
    if (line) {
      ctx.strokeStyle = '#2bd4ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(line[0], line[1]); ctx.lineTo(line[2], line[3]); ctx.stroke();
      [[line[0], line[1]], [line[2], line[3]]].forEach(q => { ctx.beginPath(); ctx.moveTo(q[0], q[1] - 7); ctx.lineTo(q[0], q[1] + 7); ctx.stroke(); });
    }
  };
  const pxLen = () => line ? Math.hypot(line[2] - line[0], line[3] - line[1]) / k : 0;
  const upd = () => {
    if (mode.value === 'measure') {
      const L = pxLen(), v = parseFloat(len.value);
      info.textContent = L ? `${U.fmt(L, 1)} px` + (v > 0 ? ` = ${v} ${unit.value}  →  pixel size ${U.fmt(v / L, 5)} ${unit.value}, image width ${IP.lengthLabel(IP.toNm(v / L, unit.value) * p.pxW, unit.value)}` : ' — now type the length it stands for') : 'Drag along the scale bar printed in the image, then type its length.';
    } else info.textContent = `Crop: x ${U.fmt(crop[0] * 100, 1)}–${U.fmt(crop[2] * 100, 1)} %, y ${U.fmt(crop[1] * 100, 1)}–${U.fmt(crop[3] * 100, 1)} % (${Math.round((crop[2] - crop[0]) * p.pxW)} × ${Math.round((crop[3] - crop[1]) * p.pxH)} px)`;
    draw();
  };
  const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
  cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); drag = at(e); if (mode.value === 'measure') line = [drag[0], drag[1], drag[0], drag[1]]; });
  cv.addEventListener('pointermove', e => {
    if (!drag) return;
    const q = at(e);
    if (mode.value === 'measure') line = [drag[0], drag[1], q[0], horiz.checked ? drag[1] : q[1]];
    else crop = [Math.min(drag[0], q[0]) / cv.width, Math.min(drag[1], q[1]) / cv.height, Math.max(drag[0], q[0]) / cv.width, Math.max(drag[1], q[1]) / cv.height].map(v => U.round(U.clamp(v, 0, 1), 4));
    upd();
  });
  cv.addEventListener('pointerup', () => { drag = null; if (mode.value === 'crop' && (crop[2] - crop[0] < 0.02 || crop[3] - crop[1] < 0.02)) crop = [0, 0, 1, 1]; upd(); });
  len.oninput = upd; unit.onchange = upd; mode.onchange = upd;
  IP.decode(p.href).then(im => {
    img = im; const W = Math.min(900, im.naturalWidth * 4); k = W / im.naturalWidth;
    cv.width = Math.round(W); cv.height = Math.round(im.naturalHeight * k); upd();
  });
  const apply = () => {
    RNBX.history.checkpoint();
    const L = pxLen(), v = parseFloat(len.value);
    if (L > 0 && v > 0) Object.assign(p, { calib: 'pixel', pix: U.round(v / L, 8), unit: unit.value });
    const w0 = p.w;
    Object.assign(p, { cx0: crop[0], cy0: crop[1], cx1: crop[2], cy1: crop[3] });
    p.w = w0; lib.get('micrograph').bbox(p);
    RNBX.changed(); RNBX.inspector.build(); mdl.close();
  };
  const mdl = D.modal({
    title: 'Calibrate and crop', sub: `${p.pxW} × ${p.pxH} px`, wide: true,
    body: [el('div', { class: 'field' }, el('label', {}, 'Tool'), mode), cv,
      el('div', { class: 'row', style: { gap: '10px', alignItems: 'end', flexWrap: 'wrap', marginTop: '10px' } },
        el('div', { class: 'field', style: { margin: 0 } }, el('label', {}, 'Measured length'), el('div', { class: 'row', style: { gap: '4px' } }, len, unit)),
        el('label', { class: 'check', style: { margin: 0 } }, horiz, 'Keep the line horizontal'),
        el('button', { class: 'btn small', type: 'button', text: 'Crop off the bottom 12 % (info bar)', onclick: () => { crop = [crop[0], crop[1], crop[2], Math.min(crop[3], 0.88)]; mode.value = 'crop'; upd(); } }),
        el('button', { class: 'btn small ghost', type: 'button', text: 'No crop', onclick: () => { crop = [0, 0, 1, 1]; upd(); } })),
      info],
    foot: [el('button', { class: 'btn primary', type: 'button', text: 'Apply', onclick: apply })],
  });
  PN._cal = { setLine: (l) => { line = l.map(v => v * k); upd(); }, setLen: (v, u) => { len.value = v; unit.value = u; upd(); }, setCrop: c => { crop = c; upd(); }, apply, ready: () => !!img };
  return mdl;
};

/* buttons in the inspector of an image panel */
lib.get('micrograph').tools = obj => el('div', {}, (() => { const G = IP.geom(obj.props); const st = (obj.props.meas || []).length ? IP.measStats(obj.props) : [], ms = IP.summaryText(st), ar = st.length ? IP.aspect(st) : null; return el('div', { class: 'readout', style: { marginBottom: '8px', whiteSpace: 'pre-line' } }, obj.props.href ? `${obj.props.pxW} × ${obj.props.pxH} px · ` + (G.visNm ? `field ${IP.lengthLabel(G.visNm, obj.props.unit)} wide · scale bar ${IP.lengthLabel(IP.barNm(obj.props), obj.props.unit)}` : obj.props.calib === 'none' ? 'no calibration' : 'not calibrated yet: set the pixel size or measure a scale bar') + (ms.length ? '\nMeasured — ' + ms.join(' · ') + (ar ? ` · aspect ratio ${ar.r.toFixed(2)} ± ${ar.se.toFixed(2)}` : '') : '') + (obj.props.poro && obj.props.poro.result ? `\nPorosity ${(obj.props.poro.result.porosity * 100).toFixed(1)} % · ${obj.props.poro.result.n} pores · diameter ${IP.fmtN(obj.props.poro.result.eqd)} ± ${IP.fmtSD(obj.props.poro.result.eqdSd, obj.props.poro.result.eqd)} ${obj.props.poro.result.unit}` : '') : 'No image yet'); })(),
 el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px', marginBottom: '10px' } },
  el('button', { style: { flex: '0 0 auto' }, class: 'btn small primary', type: 'button', text: obj.props.href ? 'Replace image…' : 'Choose image…', onclick: () => RNBX.project.pickFile('image/*', f => IP.fill(obj, f)) }),
  obj.props.href ? el('button', { style: { flex: '0 0 auto' }, class: 'btn small', type: 'button', text: 'Porosity…', title: 'Pore area fraction, pore count and size distribution (threshold segmentation)', onclick: () => RNBX.porosity.open(obj) }) : null,
  obj.props.href ? el('button', { style: { flex: '0 0 auto' }, class: 'btn small primary', type: 'button', text: 'Measure…', title: 'Lengths, widths, diameters, areas, angles and counts, with mean ± SD and histograms', onclick: () => RNBX.measure.open(obj) }) : null,
  obj.props.href ? el('button', { style: { flex: '0 0 auto' }, class: 'btn small', type: 'button', text: 'Calibrate / crop…', title: 'Measure a scale bar printed in the image; crop off the info bar', onclick: () => PN.calibrate(obj) }) : null,
  obj.props.href ? el('button', { style: { flex: '0 0 auto' }, class: 'btn small', type: 'button', text: 'Auto contrast', title: 'Black and white points that clip 0.5 % of the pixels at each end', onclick: () => IP.autoLevels(obj.props.href).then(r => { RNBX.history.checkpoint(); Object.assign(obj.props, r); RNBX.changed(); RNBX.inspector.build(); }) }) : null,
  obj.props.href ? el('button', { style: { flex: '0 0 auto' }, class: 'btn small ghost', type: 'button', text: 'Reset look', onclick: () => { RNBX.history.checkpoint(); Object.assign(obj.props, { lo: 0, hi: 1, gamma: 1, invert: false, cmap: '' }); RNBX.changed(); RNBX.inspector.build(); } }) : null,
  el('button', { style: { flex: '0 0 auto' }, class: 'btn small', type: 'button', text: 'Lay out panels…', onclick: () => PN.dialog() })));
})();
