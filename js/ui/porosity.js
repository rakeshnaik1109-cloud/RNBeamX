/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/porosity.js
   Porosity of a substrate from an SEM image panel (e.g. porous
   SERS substrates, nanoporous gold, anodic alumina): pores are
   segmented by a threshold (Otsu or set by hand, pores dark or
   bright, optional smoothing), inside the cropped region or a
   rectangle you draw. Gives the porosity (pore area fraction),
   the number and density of pores and their size distribution
   (equivalent diameter); the pore map can be shown on the panel.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, IP = RNBX.imgproc;
const PO = RNBX.porosity = {};
PO.DEFAULT = { auto: true, thr: 100, bright: false, sigma: 1, minArea: 4, roiMode: 'crop', roi: null, edge: false, colour: '#ff3b30' };

PO.open = obj => {
  const p = obj.props;
  if (!p.href) { RNBX.toast('Choose an image first'); return null; }
  const o = Object.assign({}, PO.DEFAULT, p.poro || {});
  let G = null, R = null, sum = null, img = null, drag = null, busy = 0;
  const cv = el('canvas', { class: 'ms-canvas' }), host = el('div', { class: 'ms-view' }, cv);
  const res = el('div', { class: 'po-res' }), histHost = el('div', {}), status = el('div', { class: 'hint' });
  const cropRoi = () => [p.cx0 || 0, p.cy0 || 0, p.cx1 == null ? 1 : p.cx1, p.cy1 == null ? 1 : p.cy1];
  const roi = () => (o.roiMode === 'rect' && o.roi ? o.roi : cropRoi());

  /* ---------- view: the image with pores tinted and the region outlined ---------- */
  let s = 1, ox = 0, oy = 0, maskCv = null;
  const draw = () => {
    if (!img) return;
    const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1, W = cv.width / dpr, H = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W, H);
    const iw = img.naturalWidth, ih = img.naturalHeight;
    s = Math.min(W / iw, H / ih) * 0.97; ox = (W - iw * s) / 2; oy = (H - ih * s) / 2;
    ctx.drawImage(img, ox, oy, iw * s, ih * s);
    if (maskCv && o.showMap !== false) ctx.drawImage(maskCv, ox, oy, iw * s, ih * s);
    const r = drag && drag.r ? drag.r : roi();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; ctx.setLineDash([6, 4]);
    ctx.strokeRect(ox + r[0] * iw * s, oy + r[1] * ih * s, (r[2] - r[0]) * iw * s, (r[3] - r[1]) * ih * s); ctx.setLineDash([]);
  };
  const frac = e => { const b = cv.getBoundingClientRect(); return [U.clamp(((e.clientX - b.left) - ox) / (img.naturalWidth * s), 0, 1), U.clamp(((e.clientY - b.top) - oy) / (img.naturalHeight * s), 0, 1)]; };
  cv.addEventListener('pointerdown', e => { if (o.roiMode !== 'rect' || !img) return; cv.setPointerCapture(e.pointerId); const a = frac(e); drag = { a, r: [a[0], a[1], a[0], a[1]] }; });
  cv.addEventListener('pointermove', e => { if (!drag) return; const b = frac(e); drag.r = [Math.min(drag.a[0], b[0]), Math.min(drag.a[1], b[1]), Math.max(drag.a[0], b[0]), Math.max(drag.a[1], b[1])]; draw(); });
  cv.addEventListener('pointerup', () => { if (!drag) return; const r = drag.r; drag = null; if (r[2] - r[0] > 0.02 && r[3] - r[1] > 0.02) { o.roi = r.map(v => U.round(v, 4)); run(); } else draw(); });

  /* ---------- analysis ---------- */
  const run = async () => {
    const tok = ++busy;
    status.textContent = 'Analysing…';
    await new Promise(r2 => setTimeout(r2, 10));
    if (!G) G = await IP.greyOf(p.href);
    if (tok !== busy) return;
    R = IP.porosity(G, { thr: o.auto ? null : o.thr, bright: o.bright, sigma: o.sigma, minArea: o.minArea, roi: roi() });
    if (o.auto) { o.thr = R.thr; thrIn.value = R.thr; thrNum.value = R.thr; }
    sum = IP.poroSummary(p, R, o.edge);
    const url = IP.poreMaskURL(R, o.colour, 0.55), im = new Image();
    im.onload = () => { maskCv = im; draw(); }; im.src = url;
    PO._last = { R, sum, url };
    status.textContent = `Threshold ${R.thr}${o.auto ? ' (Otsu)' : ''} · region ${R.roi[2] - R.roi[0]} × ${R.roi[3] - R.roi[1]} px analysed${G.k > 1 ? ` (image reduced ${G.k.toFixed(2)}× for speed)` : ''}.`;
    drawResults();
  };
  const fmt = IP.fmtN;
  const drawResults = () => {
    if (!sum) return;
    const cal = !!IP.nmPerPx(p);
    res.innerHTML = `<div class="po-big"><b>${(sum.porosity * 100).toFixed(1)} %</b><span>porosity (pore area fraction)</span></div>` +
      `<table class="st-tab ms-tab"><tr><td>Pores</td><td><b>${sum.n}</b>${cal ? ` · ${fmt(sum.density)} per µm²` : ''}</td></tr>` +
      (sum.nStats ? `<tr><td>Equivalent diameter</td><td><b>${fmt(sum.eqd.mean)} ± ${IP.fmtSD(sum.eqd.sd, sum.eqd.mean)} ${U.esc(sum.unit)}</b> (median ${fmt(sum.eqd.median)}, ${fmt(sum.eqd.min)}–${fmt(sum.eqd.max)})</td></tr>` +
        `<tr><td>Pore area</td><td>${fmt(sum.area.mean)} ± ${IP.fmtSD(sum.area.sd, sum.area.mean)} ${U.esc(sum.aunit)}</td></tr>` : '') +
      `<tr><td>Size statistics</td><td>${sum.nStats} pores${sum.edgeExcluded ? `, ${sum.edgeExcluded} cut by the region edge left out` : ''}</td></tr></table>` +
      (cal ? '' : '<div class="hint">Not calibrated: sizes in pixels (Calibrate / crop… sets the scale).</div>');
    histHost.innerHTML = '';
    if (sum.eqdVals.length > 1) {
      const b = RNBX.measure.bins(sum.eqdVals), w = 330, h = 140, ymax = Math.max(...b.counts, 1);
      const X = v => 34 + (v - b.edges[0]) / (b.edges[b.edges.length - 1] - b.edges[0] || 1) * (w - 64), Y = c => h - 24 - c / ymax * (h - 36);
      let svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial" font-size="10" class="st-chart">`;
      b.counts.forEach((c, i) => { svg += `<rect x="${X(b.edges[i]) + 0.5}" y="${Y(c)}" width="${Math.max(0.5, X(b.edges[i + 1]) - X(b.edges[i]) - 1)}" height="${h - 24 - Y(c)}" fill="${o.colour}" fill-opacity="0.75"/>`; });
      svg += `<line x1="34" y1="${h - 24}" x2="${w - 20}" y2="${h - 24}" stroke="currentColor"/><line x1="34" y1="${h - 24}" x2="34" y2="10" stroke="currentColor"/><text x="30" y="${Y(ymax) + 4}" text-anchor="end" fill="currentColor">${ymax}</text>`;
      [b.edges[0], b.edges[b.edges.length - 1]].forEach(v => { svg += `<text x="${X(v)}" y="${h - 11}" text-anchor="middle" fill="currentColor">${fmt(v)}</text>`; });
      svg += `<text x="${(w + 14) / 2}" y="${h - 1}" text-anchor="middle" fill="currentColor">Pore equivalent diameter (${U.esc(sum.unit)})</text></svg>`;
      histHost.append(el('div', { html: svg }));
    }
  };

  /* ---------- controls ---------- */
  const set = (k, v) => { o[k] = v; run(); };
  const pol = el('select', { style: { width: '100%' }, onchange: () => set('bright', pol.value === 'bright') }, [['dark', 'Pores are dark (usual SEM)'], ['bright', 'Pores are bright']].map(q => el('option', { value: q[0], text: q[1] })));
  pol.value = o.bright ? 'bright' : 'dark';
  const thrIn = el('input', { type: 'range', min: 0, max: 255, step: 1, value: o.thr, style: { flex: '1 1 auto' }, oninput: () => { o.auto = false; autoCb.checked = false; thrNum.value = thrIn.value; o.thr = +thrIn.value; clearTimeout(PO._t); PO._t = setTimeout(run, 80); } });
  const thrNum = el('input', { type: 'number', min: 0, max: 255, step: 1, value: o.thr, style: { width: '64px', flex: '0 0 64px' }, onchange: () => { o.auto = false; autoCb.checked = false; thrIn.value = thrNum.value; set('thr', +thrNum.value); } });
  const autoCb = el('input', { type: 'checkbox', checked: o.auto, onchange: () => set('auto', autoCb.checked) });
  const sigIn = el('input', { type: 'number', min: 0, max: 10, step: 0.5, value: o.sigma, style: { width: '64px' }, onchange: () => set('sigma', Math.max(0, +sigIn.value)) });
  const minIn = el('input', { type: 'number', min: 0, max: 100000, step: 1, value: o.minArea, style: { width: '74px' }, onchange: () => set('minArea', Math.max(0, +minIn.value)) });
  const roiSel = el('select', { style: { width: '100%' }, onchange: () => { o.roiMode = roiSel.value; run(); } }, [['crop', 'The cropped image (info bar excluded)'], ['rect', 'A rectangle I draw on the image']].map(q => el('option', { value: q[0], text: q[1] })));
  roiSel.value = o.roiMode;
  const edgeCb = el('input', { type: 'checkbox', checked: o.edge, onchange: () => { o.edge = edgeCb.checked; sum = IP.poroSummary(p, R, o.edge); drawResults(); } });
  const colIn = el('input', { type: 'color', value: o.colour, style: { width: '44px', height: '26px', flex: '0 0 44px', padding: '0' }, onchange: () => set('colour', colIn.value) });
  const fld = (label, ...c) => el('label', { class: 'st-f' }, el('span', { text: label }), el('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, ...c));

  const apply = (show) => {
    if (!R) return;
    RNBX.history.checkpoint();
    p.poro = Object.assign({}, o, { result: { porosity: sum.porosity, n: sum.n, eqd: sum.eqd.mean, eqdSd: sum.eqd.sd, unit: sum.unit, density: sum.density, thr: R.thr } });
    if (show) { p.poroMask = PO._last.url; p.poroShow = true; }
    RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build();
  };
  const csv = () => {
    if (!R) return;
    const s2 = IP.nmPerPx(p), rows = ['# ' + (S.doc.meta.title || 'Figure') + ' — porosity analysis (RNBeamX)', `# porosity ${(sum.porosity * 100).toFixed(3)} %, ${sum.n} pores, threshold ${R.thr}${o.auto ? ' (Otsu)' : ''}, pores ${o.bright ? 'bright' : 'dark'}, smoothing ${o.sigma} px, minimum ${o.minArea} px`, '# calibration: ' + (s2 ? IP.fmtN(s2) + ' nm per pixel' : 'none (pixels)'), 'pore,area,equivalent diameter,centroid x (px),centroid y (px),cut by the edge', ];
    R.pores.forEach((q, i) => { const a = s2 ? q.areaPx * s2 * s2 : q.areaPx; rows.push([i + 1, a.toPrecision(6), (2 * Math.sqrt(a / Math.PI)).toPrecision(6), q.cx.toFixed(1), q.cy.toFixed(1), q.edge ? 'yes' : 'no'].join(',')); });
    rows.splice(4, 0, `# units: ${s2 ? 'nm², nm' : 'px², px'}`);
    U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(S.doc.meta.title || 'image') + '_porosity.csv');
  };
  const addHist = () => {
    if (!sum || sum.eqdVals.length < 2) { RNBX.toast('Too few pores for a histogram'); return; }
    const b = RNBX.measure.bins(sum.eqdVals), x = [], y = [];
    b.counts.forEach((c, i) => { x.push(b.edges[i], b.edges[i], b.edges[i + 1], b.edges[i + 1]); y.push(0, c, c, 0); });
    RNBX.arrange.addDataPanel({ series: [{ name: `Pores: ${IP.fmtN(sum.eqd.mean)} ± ${IP.fmtSD(sum.eqd.sd, sum.eqd.mean)} ${sum.unit} (n = ${sum.nStats})`, x, y, color: o.colour }], xlabel: `Pore diameter (${sum.unit})`, ylabel: 'Count' });
    RNBX.toast('Pore-size histogram added as a data panel.');
  };
  const addText = () => {
    if (!sum) return;
    const t = RNBX.createObject('text', obj.x, obj.y + (p.h || 20) / 2 + 6);
    t.props.text = `Porosity ${(sum.porosity * 100).toFixed(1)} %; ${sum.n} pores` + (IP.nmPerPx(p) ? ` (${IP.fmtN(sum.density)} µm^{−2})` : '') + (sum.nStats ? `; pore diameter ${IP.fmtN(sum.eqd.mean)} ± ${IP.fmtSD(sum.eqd.sd, sum.eqd.mean)} ${sum.unit}` : '');
    t.props.size = 6; RNBX.addObject(t); RNBX.toast('Summary added under the panel.');
  };

  const side = el('div', { class: 'ms-side' },
    fld('Pores', pol), fld('Threshold (grey level 0–255)', thrIn, thrNum), el('label', { class: 'check' }, autoCb, 'Automatic threshold (Otsu’s method)'),
    fld('Smoothing σ (px)', sigIn, el('span', { class: 'hint', style: { margin: 0 }, text: 'against SEM noise' })),
    fld('Smallest pore (px of the image)', minIn),
    fld('Region analysed', roiSel), el('label', { class: 'check' }, edgeCb, 'Include pores cut by the region edge in the size statistics'),
    fld('Pore colour', colIn), status, el('h4', { text: 'Results' }), res, histHost,
    el('div', { class: 'row ms-acts', style: { gap: '6px', flexWrap: 'wrap', margin: '8px 0' } },
      el('button', { class: 'btn small primary', type: 'button', text: 'Show the pore map on the panel', onclick: () => { apply(true); RNBX.toast('Pore map shown on the panel (Inspector ▸ Measurements to hide it).'); } }),
      el('button', { class: 'btn small', type: 'button', text: 'CSV', title: 'Every pore: area, equivalent diameter, position', onclick: csv }),
      el('button', { class: 'btn small', type: 'button', text: 'Add histogram to figure', onclick: addHist }),
      el('button', { class: 'btn small', type: 'button', text: 'Add summary text', onclick: addText })),
    el('div', { class: 'hint', text: 'Porosity here is the area fraction of pores seen from the top in the region analysed (a 2D, surface measure). It depends on the threshold: compare images with the same settings, and check the coloured map follows the pores. For a rough surface, smoothing and a minimum pore size remove noise.' }));
  const m = D.modal({ title: 'Porosity', sub: `${p.pxW} × ${p.pxH} px` + (IP.nmPerPx(p) ? ` · ${IP.fmtN(IP.nmPerPx(p))} nm per pixel` : ' · not calibrated'), wide: true,
    body: el('div', { class: 'ms-wrap' }, host, side),
    foot: [el('button', { class: 'btn primary', type: 'button', text: 'Done', onclick: () => { apply(false); m.close(); } })] });
  m.root.classList.add('ms-modal');
  IP.decode(p.href).then(im => {
    img = im;
    const r = host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, w = Math.max(320, Math.round(r.width)), h = Math.max(260, Math.round(r.height));
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    draw(); run();
  });
  PO._d = { o, run, close: () => m.close(), last: () => PO._last, apply };
  return m;
};
})();
