/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/micrograph.js
   Image panels for microscopy and other measured images (SEM,
   TEM, AFM, optical, fluorescence): a calibrated scale bar that
   always matches the printed size, crop, panel letter, a corner
   note, brightness / contrast / gamma, colour maps (LUTs), a
   colour bar and a zoom inset.

   The image is processed in a canvas (levels, gamma, LUT) and
   the result cached in memory; the original stays in the
   project. Crop and zoom are clip paths, so they survive SVG
   and PDF export unchanged.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;

/* ---------- colour maps (perceptual maps sampled from matplotlib's tables) ---------- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const MAPS = {
  gray: { name: 'Grey', c: ['#000000', '#ffffff'] },
  viridis: { name: 'Viridis', c: ['#440154', '#472d7b', '#3b528b', '#2c728e', '#21918c', '#28ae80', '#5ec962', '#addc30', '#fde725'] },
  inferno: { name: 'Inferno', c: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'] },
  magma: { name: 'Magma', c: ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#feca8d', '#fcfdbf'] },
  plasma: { name: 'Plasma', c: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'] },
  cividis: { name: 'Cividis (colour-blind safe)', c: ['#00224e', '#123570', '#3b496c', '#575d6d', '#707173', '#8a8678', '#a59c74', '#c3b369', '#e1cc55', '#fee838'] },
  hot: { name: 'Hot', c: ['#000000', '#e60000', '#ff7a00', '#ffe100', '#ffffff'] },
  afm: { name: 'Gold (AFM height)', c: ['#000000', '#4d1a00', '#a04a00', '#e09530', '#ffd890', '#ffffff'] },
  green: { name: 'Green channel', c: ['#000000', '#00ff00'] },
  red: { name: 'Red channel', c: ['#000000', '#ff0000'] },
  blue: { name: 'Blue channel', c: ['#000000', '#0050ff'] },
  magenta: { name: 'Magenta channel', c: ['#000000', '#ff00ff'] },
  cyan: { name: 'Cyan channel', c: ['#000000', '#00ffff'] },
};
const lut = {};
const getLut = name => {
  if (lut[name]) return lut[name];
  const c = (MAPS[name] || MAPS.gray).c.map(hex), out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * (c.length - 1), k = Math.min(c.length - 2, Math.floor(t)), f = t - k;
    for (let j = 0; j < 3; j++) out[i * 3 + j] = Math.round(c[k][j] + (c[k + 1][j] - c[k][j]) * f);
  }
  return (lut[name] = out);
};
const mapColor = (name, t) => { const L = getLut(name), i = Math.round(U.clamp(t, 0, 1) * 255) * 3; return `rgb(${L[i]},${L[i + 1]},${L[i + 2]})`; };

/* ---------- image processing (levels, gamma, invert, LUT), cached ---------- */
const IP = RNBX.imgproc = { MAPS, getLut, mapColor };
const cache = new Map(), busy = new Set(), decoded = new Map();
const keyOf = (href, o) => href.length + ':' + href.slice(-64) + ':' + [o.lo, o.hi, o.gamma, o.invert, o.cmap].join(',');
IP.identity = p => !p.cmap && !p.invert && (p.lo || 0) === 0 && (p.hi == null ? 1 : p.hi) === 1 && (p.gamma || 1) === 1;
IP.decode = href => {
  if (decoded.has(href)) return decoded.get(href);
  const load = src => new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Could not read the image')); img.src = src; });
  // a TIFF kept in an older project: decode it first (browsers cannot)
  const isTiff = /^data:image\/tiff/i.test(href);
  const pr = isTiff && RNBX.tiff ? fetch(href).then(r => r.arrayBuffer()).then(b => RNBX.tiff.decode(b)).then(r => load(r.href)) : load(href);
  pr.catch(() => decoded.delete(href));
  decoded.set(href, pr);
  return pr;
};
/* draw the image into a canvas (at most 4096 px on the long side) and return its pixels */
IP.pixels = img => {
  const k = Math.min(1, 4096 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
  return { cv, ctx, data: ctx.getImageData(0, 0, w, h), w, h };
};
IP.process = (img, o) => {
  const { cv, ctx, data } = IP.pixels(img), d = data.data;
  const lo = o.lo || 0, hi = o.hi == null ? 1 : o.hi, g = 1 / (o.gamma || 1), span = Math.max(1e-3, hi - lo), inv = !!o.invert;
  const curve = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) { let t = U.clamp((i / 255 - lo) / span, 0, 1); t = Math.pow(t, g); if (inv) t = 1 - t; curve[i] = Math.round(t * 255); }
  const L = o.cmap ? getLut(o.cmap) : null;
  for (let i = 0; i < d.length; i += 4) {
    if (L) { const v = curve[Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])] * 3; d[i] = L[v]; d[i + 1] = L[v + 1]; d[i + 2] = L[v + 2]; }
    else { d[i] = curve[d[i]]; d[i + 1] = curve[d[i + 1]]; d[i + 2] = curve[d[i + 2]]; }
  }
  ctx.putImageData(data, 0, 0);
  return cv.toDataURL('image/png');
};
/* processed href if ready; otherwise the original, and the work starts in the background */
IP.get = (href, o) => {
  if (!href || IP.identity(o)) return href;
  const key = keyOf(href, o);
  if (cache.has(key)) return cache.get(key);
  if (!busy.has(key)) {
    busy.add(key);
    IP.decode(href).then(img => { cache.set(key, IP.process(img, o)); }).catch(() => cache.set(key, href)).finally(() => { busy.delete(key); RNBX.emit('render'); });
  }
  return href;
};
IP.pending = () => busy.size;
IP.ready = () => new Promise(res => { const t = () => busy.size ? setTimeout(t, 30) : res(); t(); });
/* black and white points that clip 0.5 % of the pixels at each end */
IP.autoLevels = href => IP.decode(href).then(img => {
  const { data } = IP.pixels(img), d = data.data, hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) hist[Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])]++;
  const N = d.length / 4, cut = N * 0.005;
  let a = 0, s = 0; while (a < 255 && s + hist[a] <= cut) s += hist[a++];
  let b = 255; s = 0; while (b > 0 && s + hist[b] <= cut) s += hist[b--];
  return b > a ? { lo: U.round(a / 255, 3), hi: U.round(b / 255, 3) } : { lo: 0, hi: 1 };
});

/* ---------- lengths and scale bars ---------- */
const UNIT_NM = { 'pm': 1e-3, 'Å': 0.1, 'nm': 1, 'µm': 1e3, 'mm': 1e6, 'cm': 1e7 };
IP.UNITS = Object.keys(UNIT_NM);
IP.toNm = (v, u) => v * (UNIT_NM[u] || 1);
/* a length in nm as a label: 500 nm, 2 µm, 1.5 mm */
IP.lengthLabel = (nm, pref) => {
  if (pref === 'Å' && nm < 10) return U.fmt(nm * 10, 3) + ' Å';
  if (nm < 1) return U.fmt(nm * 1e3, 3) + ' pm';
  if (nm < 1e3) return U.fmt(nm, 3) + ' nm';
  if (nm < 1e6) return U.fmt(nm / 1e3, 3) + ' µm';
  if (nm < 1e7) return U.fmt(nm / 1e6, 3) + ' mm';
  return U.fmt(nm / 1e7, 3) + ' cm';
};
/* 1, 2 or 5 × 10ⁿ not above x */
IP.nice = x => { const e = Math.pow(10, Math.floor(Math.log10(x))), f = x / e; return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * e; };
const niceTicks = (a, b, want = 4) => {
  const step = IP.nice(Math.abs(b - a) / want) || 1, out = [];
  for (let v = Math.ceil(Math.min(a, b) / step) * step; v <= Math.max(a, b) + step * 1e-6; v += step) out.push(U.round(v, 10));
  return out;
};

/* geometry of a micrograph panel: visible (cropped) part, size, calibration */
IP.geom = p => {
  const cw = U.clamp((p.cx1 == null ? 1 : p.cx1) - (p.cx0 || 0), 0.01, 1), ch = U.clamp((p.cy1 == null ? 1 : p.cy1) - (p.cy0 || 0), 0.01, 1);
  const pxW = p.pxW || 1000, pxH = p.pxH || Math.round((p.pxW || 1000) / (p.aspect || 1.5));
  const w = p.w, h = w * (ch * pxH) / (cw * pxW);
  // physical width of the visible part (nm), or 0 when not calibrated
  const fullNm = p.calib === 'pixel' && p.pix > 0 ? IP.toNm(p.pix, p.unit) * pxW : p.calib === 'fov' && p.fov > 0 ? IP.toNm(p.fov, p.unit) : 0;
  const visNm = fullNm * cw;
  return { cw, ch, pxW, pxH, w, h, fullNm, visNm, mmPerNm: visNm > 0 ? w / visNm : 0 };
};
/* scale-bar length (nm) for a panel: the user's value, or a round number near a fifth of the width */
IP.barNm = p => {
  const G = IP.geom(p);
  if (!G.visNm) return 0;
  return p.sbLen > 0 ? IP.toNm(p.sbLen, p.unit) : IP.nice(G.visNm * 0.22);
};

/* width taken by the colour bar right of the image: gap, bar, ticks, numbers, title */
const tickText = p => niceTicks(+p.cbMin, +p.cbMax).map(v => U.fmt(v, 4));
const numW = p => Math.max(1, ...tickText(p).map(t => t.length)) * U.pt2mm(p.cbSize) * 0.58;
const cbarWidth = p => 1.2 + 2.2 + 0.9 + numW(p) + (p.cbLabel ? U.pt2mm(p.cbSize) * 1.5 : 0) + 0.3;

/* ---------- the component ---------- */
const corner = (pos, w, h, m, bw, bh) => {
  const x = pos[1] === 'l' ? -w / 2 + m : pos[1] === 'c' ? -bw / 2 : w / 2 - m - bw;
  const y = pos[0] === 't' ? -h / 2 + m : h / 2 - m - bh;
  return [x, y];
};
const POS = [['tl', 'Top left'], ['tr', 'Top right'], ['bl', 'Bottom left'], ['br', 'Bottom right'], ['bc', 'Bottom centre']];
const has = p => !!p.href;
const isCal = p => p.calib !== 'none';
const head = label => ({ key: '_h_' + label, label, type: 'heading' });

lib.register({
  type: 'micrograph', name: 'Microscope image panel (scale bar)', category: 'Images & panels', annotation: true, autoLabel: false, abbr: '',
  keywords: 'micrograph sem tem afm stem fluorescence microscope optical image scale bar calibrated pixel size crop colour map lut colour bar zoom inset panel',
  hint: 'Drop an image file onto the panel or choose one below. Set the pixel size (or the width of the field of view) and the scale bar follows any resize or crop. Measure an existing scale bar with “Calibrate / crop…”.',
  defaults: {
    href: '', pxW: 0, pxH: 0, aspect: 4 / 3, w: 40, h: 30,
    calib: 'pixel', pix: 0, unit: 'nm', fov: 0, cx0: 0, cy0: 0, cx1: 1, cy1: 1,
    lo: 0, hi: 1, gamma: 1, invert: false, cmap: '', smooth: true,
    sb: true, sbLen: 0, sbPos: 'br', sbX: 0.8, sbY: 0.9, sbColor: '#ffffff', sbThick: 0.6, sbSize: 7, sbText: 'above', sbBox: '', sbBold: true,
    letter: 'a', letterPos: 'tl', letterColor: '#ffffff', letterSize: 8, letterBox: '',
    note: '', noteColor: '#ffffff', noteSize: 6,
    frame: '', frameW: 0.5,
    cbar: false, cbMin: 0, cbMax: 1, cbLabel: '', cbSize: 6,
    zoom: false, zx: 0.5, zy: 0.5, zf: 3, zs: 0.38, zPos: 'tr', zColor: '#ffd23f', zLines: true, zLabel: true,
    poro: null, poroShow: false, poroMask: '',
    meas: [], measShow: true, measLabels: true, measColor: '#2bd4ff', measW: 0.35, measSize: 5.5, measKeyClass: '',
  },
  params: [
    head('Size and calibration'),
    { key: 'w', label: 'Width on the page', type: 'number', unit: 'mm', min: 3, max: 500, step: 0.5 },
    { key: 'calib', label: 'Calibration', type: 'select', options: [['pixel', 'Pixel size'], ['fov', 'Width of the whole image (field of view)'], ['none', 'None (no scale bar)']] },
    { key: 'pix', label: 'Pixel size', type: 'number', min: 0, step: 'any', show: p => p.calib === 'pixel', hint: 'from the instrument; 0 = not set' },
    { key: 'fov', label: 'Image width', type: 'number', min: 0, step: 'any', show: p => p.calib === 'fov', hint: '0 = not set' },
    { key: 'unit', label: 'Unit', type: 'select', options: () => IP.UNITS.map(u => [u, u]), show: isCal },
    head('Scale bar'),
    { key: 'sb', label: 'Show scale bar', type: 'bool', show: isCal },
    { key: 'sbLen', label: 'Length (0 = automatic)', type: 'number', min: 0, step: 'any', show: p => isCal(p) && p.sb, hint: 'in the unit above' },
    { key: 'sbPos', label: 'Position', type: 'select', options: POS.concat([['free', 'Anywhere (drag the yellow handle)']]), show: p => isCal(p) && p.sb },
    { key: 'sbText', label: 'Length label', type: 'select', options: [['above', 'Above the bar'], ['below', 'Below the bar'], ['none', 'None (give it in the caption)']], show: p => isCal(p) && p.sb },
    { key: 'sbColor', label: 'Colour', type: 'color', show: p => isCal(p) && p.sb },
    { key: 'sbThick', label: 'Bar thickness', type: 'number', unit: 'mm', min: 0.1, max: 5, step: 0.05, show: p => isCal(p) && p.sb },
    { key: 'sbSize', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5, show: p => isCal(p) && p.sb && p.sbText !== 'none' },
    { key: 'sbBold', label: 'Bold text', type: 'bool', show: p => isCal(p) && p.sb && p.sbText !== 'none' },
    { key: 'sbBox', label: 'Box behind the bar', type: 'color', allowEmpty: true, show: p => isCal(p) && p.sb },
    head('Panel letter and note'),
    { key: 'letter', label: 'Letter', type: 'text', hint: 'blank for none' },
    { key: 'letterPos', label: 'Letter position', type: 'select', options: POS.slice(0, 4) },
    { key: 'letterSize', label: 'Letter size', type: 'number', unit: 'pt', min: 4, max: 40, step: 0.5 },
    { key: 'letterColor', label: 'Letter colour', type: 'color' },
    { key: 'letterBox', label: 'Box behind the letter', type: 'color', allowEmpty: true },
    { key: 'note', label: 'Corner note', type: 'text', hint: 'e.g. SEM · 5 kV, or DAPI / actin' },
    { key: 'noteColor', label: 'Note colour', type: 'color', show: p => !!p.note },
    { key: 'noteSize', label: 'Note size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5, show: p => !!p.note },
    head('Brightness, contrast and colour'),
    { key: 'lo', label: 'Black point', type: 'range', min: 0, max: 1, step: 0.005 },
    { key: 'hi', label: 'White point', type: 'range', min: 0, max: 1, step: 0.005 },
    { key: 'gamma', label: 'Gamma', type: 'range', min: 0.2, max: 4, step: 0.01, hint: 'above 1 brightens the mid-tones' },
    { key: 'invert', label: 'Invert', type: 'bool' },
    { key: 'cmap', label: 'Colour map (LUT)', type: 'select', options: () => [['', 'Original colours']].concat(Object.entries(MAPS).map(([k, m]) => [k, m.name])) },
    { key: 'smooth', label: 'Smooth when enlarged', type: 'bool', hint: 'off shows the pixels (small AFM or STM scans)' },
    { key: 'cbar', label: 'Colour bar', type: 'bool' },
    { key: 'cbMin', label: 'Colour bar from', type: 'number', step: 'any', show: p => p.cbar },
    { key: 'cbMax', label: 'Colour bar to', type: 'number', step: 'any', show: p => p.cbar },
    { key: 'cbLabel', label: 'Colour bar title', type: 'text', show: p => p.cbar, hint: 'e.g. Height (nm); markup x^2, \\mu' },
    { key: 'cbSize', label: 'Colour bar text', type: 'number', unit: 'pt', min: 3, max: 20, step: 0.5, show: p => p.cbar },
    head('Zoom inset'),
    { key: 'zoom', label: 'Show a zoomed inset', type: 'bool' },
    { key: 'zx', label: 'Zoom centre x', type: 'range', min: 0, max: 1, step: 0.005, show: p => p.zoom },
    { key: 'zy', label: 'Zoom centre y', type: 'range', min: 0, max: 1, step: 0.005, show: p => p.zoom },
    { key: 'zf', label: 'Magnification', type: 'number', unit: '×', min: 1.2, max: 50, step: 0.1, show: p => p.zoom },
    { key: 'zs', label: 'Inset size (of panel width)', type: 'range', min: 0.15, max: 0.6, step: 0.01, show: p => p.zoom },
    { key: 'zPos', label: 'Inset corner', type: 'select', options: POS.slice(0, 4), show: p => p.zoom },
    { key: 'zColor', label: 'Inset outline', type: 'color', show: p => p.zoom },
    { key: 'zLines', label: 'Connecting lines', type: 'bool', show: p => p.zoom },
    { key: 'zLabel', label: 'Show ×N', type: 'bool', show: p => p.zoom },
    head('Measurements'),
    { key: 'poroShow', label: 'Show the pore map (from Porosity…)', type: 'bool', show: p => !!p.poroMask },
    { key: 'measShow', label: 'Show measurements on the panel', type: 'bool', show: p => (p.meas || []).length > 0 },
    { key: 'measLabels', label: 'Label each with its value', type: 'bool', show: p => p.measShow && (p.meas || []).length > 0 },
    { key: 'measColor', label: 'Colour', type: 'color', show: p => p.measShow && (p.meas || []).length > 0 },
    { key: 'measW', label: 'Line weight', type: 'number', unit: 'mm', min: 0.05, max: 2, step: 0.05, show: p => p.measShow && (p.meas || []).length > 0 },
    { key: 'measSize', label: 'Label size', type: 'number', unit: 'pt', min: 3, max: 20, step: 0.5, show: p => p.measShow && p.measLabels && (p.meas || []).length > 0 },
    head('Frame'),
    { key: 'frame', label: 'Frame colour', type: 'color', allowEmpty: true },
    { key: 'frameW', label: 'Frame weight', type: 'number', unit: 'pt', min: 0.1, max: 6, step: 0.05, show: p => !!p.frame },
  ],
  resizable: true, keepAspect: true,
  /* yellow handles: drag the scale bar anywhere; drag the zoom inset's source box */
  extraHandles(p) {
    const out = [], G = IP.geom(p), w = p.w, h = G.h;
    if (p.href && isCal(p) && p.sb && G.visNm > 0) { const c = IP.sbCentre(p, w, h); out.push({ key: 'sb', x: c[0] - IP.sbHandleDx(p, w, h), y: c[1], title: 'Drag the scale bar' }); }
    if (p.href && p.zoom) out.push({ key: 'zoom', x: -w / 2 + p.zx * w, y: -h / 2 + p.zy * h, title: 'Drag the zoomed region' });
    return out;
  },
  dragHandle(p, key, lp) {
    const G = IP.geom(p), w = p.w, h = G.h, fx = U.round(U.clamp((lp[0] + w / 2) / w, 0, 1), 4), fy = U.round(U.clamp((lp[1] + h / 2) / h, 0, 1), 4);
    if (key === 'sb') { const dx = IP.sbHandleDx(p, w, h); p.sbPos = 'free'; p.sbX = U.round(U.clamp((lp[0] + dx + w / 2) / w, 0, 1), 4); p.sbY = fy; }
    if (key === 'zoom') { p.zx = fx; p.zy = fy; }
  },
  init(obj, doc) {
    const k = doc.objects.filter(o => o.type === 'micrograph' || o.type === 'panel').length;
    obj.props.letter = 'abcdefghijklmnopqrstuvwxyz'[k % 26];
  },
  bbox(p) {
    const G = IP.geom(p);
    p.h = U.round(G.h, 3);   // the height always follows the width and the crop
    let x1 = p.w / 2, y1 = G.h / 2;
    if (p.cbar) x1 += cbarWidth(p);
    return [-p.w / 2, -G.h / 2, x1, y1];
  },
  draw(p, S, obj) {
    const G = IP.geom(p), w = p.w, h = G.h, id = 'rbx-mg-' + (obj ? obj.id : 'x'), font = U.esc(S.font);
    p.h = U.round(h, 3);
    let s = '';
    if (!has(p)) {
      s += `<rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}" fill="#eef0f3" stroke="#9aa1ab" stroke-width="0.2" stroke-dasharray="1 0.8"/>`;
      s += H.text(S, 0, -1.6, 'Drop a microscope image here', { size: Math.min(2.6, w / 16), color: '#5b6470' });
      s += H.text(S, 0, 2, 'or choose one in the inspector', { size: Math.min(2.1, w / 20), color: '#8a919b' });
    } else {
      const href = IP.get(p.href, p), FW = w / G.cw, FH = h / G.ch, ix = -w / 2 - (p.cx0 || 0) * FW, iy = -h / 2 - (p.cy0 || 0) * FH;
      const rend = p.smooth === false ? ' style="image-rendering:pixelated" image-rendering="optimizeSpeed"' : '';
      const shown = RNBX.imgURL ? RNBX.imgURL(href, S.live) : href, im = (extra = '') => `<image href="${U.esc(shown)}" x="${n(ix)}" y="${n(iy)}" width="${n(FW)}" height="${n(FH)}" preserveAspectRatio="none"${rend}${extra}/>`;
      s += `<defs><clipPath id="${id}-c"><rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}"/></clipPath></defs>`;
      s += `<g clip-path="url(#${id}-c)">${im()}`;
      // zoom inset: a square of the image magnified zf times, in a corner
      if (p.zoom) {
        const side = Math.min(w, h) * p.zs, src = side / p.zf;
        const sx = U.clamp(-w / 2 + p.zx * w, -w / 2 + src / 2, w / 2 - src / 2), sy = U.clamp(-h / 2 + p.zy * h, -h / 2 + src / 2, h / 2 - src / 2);
        const [ox, oy] = corner(p.zPos, w, h, 0, side, side), lw = Math.max(0.15, side * 0.012);
        const ins = [ox, oy, side, side], srcB = [sx - src / 2, sy - src / 2, src, src];
        if (p.zLines) {
          // join corresponding corners, choosing the pair whose lines stay outside both boxes
          const pairs = (p.zPos === 'tr' || p.zPos === 'bl') ? [[0, 0], [1, 1]] : [[1, 0], [0, 1]];
          pairs.forEach(([cx, cy]) => { s += `<line x1="${n(srcB[0] + cx * src)}" y1="${n(srcB[1] + cy * src)}" x2="${n(ins[0] + cx * side)}" y2="${n(ins[1] + cy * side)}" stroke="${p.zColor}" stroke-width="${n(lw)}" stroke-opacity="0.85"/>`; });
        }
        s += `<rect x="${n(srcB[0])}" y="${n(srcB[1])}" width="${n(src)}" height="${n(src)}" fill="none" stroke="${p.zColor}" stroke-width="${n(lw)}"/>`;
        s += `<defs><clipPath id="${id}-z"><rect x="${n(ox)}" y="${n(oy)}" width="${n(side)}" height="${n(side)}"/></clipPath></defs>`;
        s += `<g clip-path="url(#${id}-z)"><rect x="${n(ox)}" y="${n(oy)}" width="${n(side)}" height="${n(side)}" fill="#000"/><g transform="translate(${n(ox + side / 2)} ${n(oy + side / 2)}) scale(${n(p.zf)}) translate(${n(-sx)} ${n(-sy)})">${im()}</g></g>`;
        s += `<rect x="${n(ox + lw / 2)}" y="${n(oy + lw / 2)}" width="${n(side - lw)}" height="${n(side - lw)}" fill="none" stroke="${p.zColor}" stroke-width="${n(lw * 1.6)}"/>`;
        if (p.zLabel) { const fs = Math.max(1.4, Math.min(2.5, side * 0.12)); s += `<text x="${n(ox + (p.zPos[1] === 'l' ? side - 1 : 1))}" y="${n(oy + (p.zPos[0] === 't' ? side - 0.9 : fs + 0.6))}" font-family="${font}" font-size="${n(fs)}" font-weight="700" fill="${p.zColor}" text-anchor="${p.zPos[1] === 'l' ? 'end' : 'start'}">×${U.fmt(p.zf, 1)}</text>`; }
      }
      if (p.poroShow && p.poroMask) s += `<image href="${U.esc(RNBX.imgURL ? RNBX.imgURL(p.poroMask, S.live) : p.poroMask)}" x="${n(ix)}" y="${n(iy)}" width="${n(FW)}" height="${n(FH)}" preserveAspectRatio="none"/>`;
      if (p.measShow !== false && (p.meas || []).length) s += IP.measOverlay(p, w, h, ix, iy, FW, FH, font);
      s += '</g>';
    }
    const m = Math.max(0.8, Math.min(w, h) * 0.035);
    // scale bar
    if (isCal(p) && p.sb && G.visNm > 0) {
      const nm = IP.barNm(p), L = nm * G.mmPerNm, fs = U.pt2mm(p.sbSize), th = p.sbThick, txt = p.sbText !== 'none';
      const bh = th + (txt ? fs * 1.15 : 0), pad = p.sbBox ? 0.6 : 0, bw = Math.max(L, txt ? U.pt2mm(p.sbSize) * 0.6 * IP.lengthLabel(nm, p.unit).length : 0);
      const [x0, y0] = p.sbPos === 'free' ? [-w / 2 + U.clamp(+p.sbX, 0, 1) * w - bw / 2, -h / 2 + U.clamp(+p.sbY, 0, 1) * h - bh / 2] : corner(p.sbPos, w, h, m + pad, bw, bh);
      const bx = x0 + (bw - L) / 2, by = p.sbText === 'above' ? y0 + bh - th : y0;
      if (p.sbBox) s += `<rect x="${n(x0 - pad)}" y="${n(y0 - pad)}" width="${n(bw + 2 * pad)}" height="${n(bh + 2 * pad)}" rx="0.3" fill="${p.sbBox}" fill-opacity="0.75"/>`;
      s += `<rect class="mg-bar" x="${n(bx)}" y="${n(by)}" width="${n(L)}" height="${n(th)}" fill="${p.sbColor}"/>`;
      if (txt) s += `<text x="${n(bx + L / 2)}" y="${n(p.sbText === 'above' ? by - fs * 0.25 : by + th + fs * 0.92)}" font-family="${font}" font-size="${n(fs)}" ${p.sbBold ? 'font-weight="700"' : ''} fill="${p.sbColor}" text-anchor="middle">${U.esc(IP.lengthLabel(nm, p.unit))}</text>`;
    }
    // panel letter
    if (p.letter) {
      const fs = U.pt2mm(p.letterSize), tw = fs * 0.62 * String(p.letter).length, pad = p.letterBox ? 0.5 : 0;
      const [x0, y0] = corner(p.letterPos, w, h, m * 0.8 + pad, tw, fs * 0.74);
      if (p.letterBox) s += `<rect x="${n(x0 - pad)}" y="${n(y0 - pad)}" width="${n(tw + 2 * pad)}" height="${n(fs * 0.74 + 2 * pad)}" rx="0.3" fill="${p.letterBox}"/>`;
      s += `<text x="${n(x0)}" y="${n(y0 + fs * 0.74)}" font-family="${font}" font-size="${n(fs)}" font-weight="700" fill="${p.letterColor}">${U.esc(p.letter)}</text>`;
    }
    // corner note: the first corner not taken by the letter, the scale bar or the inset
    if (p.note) {
      const used = [p.letter ? p.letterPos : '', isCal(p) && p.sb ? p.sbPos : '', p.zoom ? p.zPos : ''];
      const flip = c => c[0] + (c[1] === 'l' ? 'r' : 'l');
      const free = [flip(p.letterPos), 'tl', 'tr', 'bl', 'br'].find(c => !used.includes(c) && !(c[0] === 'b' && used.includes('bc'))) || 'tr';
      const fs = U.pt2mm(p.noteSize), right = free[1] === 'r', top = free[0] === 't';
      const x = right ? w / 2 - m : -w / 2 + m, y = top ? -h / 2 + m + fs * 0.74 : h / 2 - m;
      s += `<text x="${n(x)}" y="${n(y)}" font-family="${font}" font-size="${n(fs)}" fill="${p.noteColor}" text-anchor="${right ? 'end' : 'start'}">${RNBX.text ? RNBX.text.markup(p.note, fs) : U.esc(p.note)}</text>`;
    }
    if (p.frame) s += `<rect x="${n(-w / 2)}" y="${n(-h / 2)}" width="${n(w)}" height="${n(h)}" fill="none" stroke="${p.frame}" stroke-width="${n(U.pt2mm(p.frameW))}"/>`;
    // colour bar on the right, outside the image
    if (p.cbar) {
      const fs = U.pt2mm(p.cbSize), x0 = w / 2 + 1.2, bw = 2.2, N = 64, map = p.cmap || 'gray', ink = RNBX.isDarkPage && RNBX.isDarkPage(S.doc.page) ? '#e8ecf2' : S.ink || '#111';
      for (let i = 0; i < N; i++) {
        let t = 1 - (i + 0.5) / N; if (p.invert) t = 1 - t;
        s += `<rect x="${n(x0)}" y="${n(-h / 2 + i * h / N)}" width="${n(bw)}" height="${n(h / N + 0.03)}" fill="${mapColor(map, t)}"/>`;
      }
      s += `<rect x="${n(x0)}" y="${n(-h / 2)}" width="${n(bw)}" height="${n(h)}" fill="none" stroke="${ink}" stroke-width="0.12"/>`;
      const a = +p.cbMin, b = +p.cbMax, span = (b - a) || 1;
      niceTicks(a, b).forEach(v => {
        const y = h / 2 - (v - a) / span * h;
        s += `<line x1="${n(x0 + bw)}" y1="${n(y)}" x2="${n(x0 + bw + 0.6)}" y2="${n(y)}" stroke="${ink}" stroke-width="0.12"/><text x="${n(x0 + bw + 0.9)}" y="${n(y + fs * 0.35)}" font-family="${font}" font-size="${n(fs)}" fill="${ink}">${U.esc(U.fmt(v, 4))}</text>`;
      });
      if (p.cbLabel) { const lx = x0 + bw + 0.9 + numW(p) + fs * 0.9; s += `<text x="${n(lx)}" y="0" font-family="${font}" font-size="${n(fs)}" fill="${ink}" text-anchor="middle" transform="rotate(-90 ${n(lx)} 0)">${RNBX.text ? RNBX.text.markup(p.cbLabel, fs) : U.esc(p.cbLabel)}</text>`; }
    }
    return s;
  },
});

/* centre of the scale bar (panel coordinates), for its drag handle */
IP.sbCentre = (p, w, h) => IP.sbBox(p, w, h).slice(0, 2);
/* centre and size of the scale bar with its label: [cx, cy, bw, bh] */
IP.sbBox = (p, w, h) => {
  const nm = IP.barNm(p), G = IP.geom(p), L = nm * G.mmPerNm, fs = U.pt2mm(p.sbSize), txt = p.sbText !== 'none', m = Math.max(0.8, Math.min(w, h) * 0.035), pad = p.sbBox ? 0.6 : 0;
  const bh = p.sbThick + (txt ? fs * 1.15 : 0), bw = Math.max(L, txt ? fs * 0.6 * IP.lengthLabel(nm, p.unit).length : 0);
  if (p.sbPos === 'free') return [-w / 2 + U.clamp(+p.sbX, 0, 1) * w, -h / 2 + U.clamp(+p.sbY, 0, 1) * h, bw, bh];
  const c = corner(p.sbPos, w, h, m + pad, bw, bh);
  return [c[0] + bw / 2, c[1] + bh / 2, bw, bh];
};
/* the drag handle sits just left of the bar, so it never hides the bar or its length */
IP.sbHandleDx = (p, w, h) => IP.sbBox(p, w, h)[2] / 2 + 2.2;

/* ---------- measurements ----------
   p.meas: [{ type: 'line' | 'poly' | 'diam' | 'area' | 'angle' | 'count', pts: [[u, v], …] (image pixels), cls }]
   Lengths and areas use the calibration (pixels if none). */
IP.MEAS_TYPES = { line: 'Line length', poly: 'Segmented length', diam: 'Diameter', area: 'Area', angle: 'Angle', count: 'Count' };
IP.kind = t => (t === 'area' ? 'area' : t === 'angle' ? 'angle' : t === 'count' ? 'count' : 'length');
IP.nmPerPx = p => { const G = IP.geom(p); return G.fullNm > 0 ? G.fullNm / G.pxW : 0; };
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
/* raw value of one measurement in pixels (lengths), px² (areas) or degrees */
IP.measPx = q => {
  const P = q.pts || [];
  if (q.type === 'line' || q.type === 'diam') return P.length > 1 ? dist(P[0], P[1]) : 0;
  if (q.type === 'poly') { let L = 0; for (let i = 1; i < P.length; i++) L += dist(P[i - 1], P[i]); return L; }
  if (q.type === 'area') { let A = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; A += a[0] * b[1] - b[0] * a[1]; } return Math.abs(A) / 2; }
  if (q.type === 'angle') { if (P.length < 3) return 0; const a = Math.atan2(P[0][1] - P[1][1], P[0][0] - P[1][0]), b = Math.atan2(P[2][1] - P[1][1], P[2][0] - P[1][0]); let d = Math.abs(a - b) * 180 / Math.PI; if (d > 180) d = 360 - d; return d; }
  return 1;
};
/* display unit for a set of lengths (nm): nm, µm or mm by the median */
IP.lenUnit = nmVals => { const v = nmVals.slice().sort((a, b) => a - b)[Math.floor(nmVals.length / 2)] || 0; return v >= 1e6 ? ['mm', 1e6] : v >= 1e3 ? ['µm', 1e3] : ['nm', 1]; };
IP.measValue = (p, q) => {
  const k = IP.kind(q.type), s = IP.nmPerPx(p), raw = IP.measPx(q);
  if (k === 'angle') return { v: raw, unit: '°' };
  if (k === 'count') return { v: 1, unit: '' };
  if (!s) return { v: raw, unit: k === 'area' ? 'px²' : 'px', px: true };
  return k === 'area' ? { v: raw * s * s, unit: 'nm²', nm2: true } : { v: raw * s, unit: 'nm', nm: true };
};
const stat = vals => {
  const n = vals.length, a = vals.slice().sort((x, y) => x - y), mean = vals.reduce((x, y) => x + y, 0) / (n || 1);
  const sd = n > 1 ? Math.sqrt(vals.reduce((x, y) => x + (y - mean) * (y - mean), 0) / (n - 1)) : 0;
  const med = n ? (n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2) : 0;
  const sd0 = sd < Math.abs(mean) * 1e-9 ? 0 : sd;   // identical values: no rounding noise
  return { n, mean, sd: sd0, se: n ? sd0 / Math.sqrt(n) : 0, median: med, min: a[0], max: a[n - 1], cv: mean ? sd0 / mean * 100 : 0 };
};
IP.stat = stat;
/* statistics per class (and kind): values in a readable unit */
IP.measStats = p => {
  const groups = {};
  (p.meas || []).forEach(q => { const k = IP.kind(q.type), key = (q.cls || 'Unnamed') + '|' + k; (groups[key] = groups[key] || { cls: q.cls || 'Unnamed', kind: k, items: [] }).items.push(q); });
  const s = IP.nmPerPx(p), G = IP.geom(p);
  return Object.values(groups).map(g => {
    const raw = g.items.map(q => IP.measValue(p, q));
    let vals = raw.map(r => r.v), unit = raw[0] ? raw[0].unit : '';
    if (g.kind === 'length' && s) { const [u, f] = IP.lenUnit(vals); vals = vals.map(v => v / f); unit = u; }
    if (g.kind === 'area' && s) { const [u, f] = IP.lenUnit(vals.map(Math.sqrt)); vals = vals.map(v => v / (f * f)); unit = u + '²'; }
    const out = Object.assign({ cls: g.cls, kind: g.kind, unit, values: vals }, stat(vals));
    if (g.kind === 'area') { out.eqd = stat(vals.map(a => 2 * Math.sqrt(a / Math.PI))); out.eqdUnit = unit.replace('²', ''); }
    if (g.kind === 'count') { const area = G.fullNm > 0 ? (G.visNm / 1e3) * (G.visNm * G.ch * G.pxH / (G.cw * G.pxW) / 1e3) : 0; out.n = g.items.reduce((a, q) => a + (q.pts || []).length, 0); out.density = area > 0 ? out.n / area : 0; }
    return out;
  });
};
/* aspect ratio from the classes named like “length” and “width” (means, with propagated error) */
IP.aspect = st => {
  const L = st.find(g => g.kind === 'length' && /length|long/i.test(g.cls)), W = st.find(g => g.kind === 'length' && /width|diam|short|thick/i.test(g.cls));
  if (!L || !W || !L.n || !W.n || L.unit !== W.unit || !W.mean) return null;
  const r = L.mean / W.mean, e = r * Math.hypot(L.se / L.mean, W.se / W.mean);
  return { r, se: e, L, W };
};
const fmtN = (v, d = 3) => { if (!isFinite(v)) return '–'; const a = Math.abs(v); return a >= 100 ? v.toFixed(1) : a >= 10 ? v.toFixed(2) : v.toPrecision(d); };
IP.fmtN = fmtN;
/* an SD with as many decimals as its mean is shown with */
IP.fmtSD = (sd, mean) => { const a = Math.abs(mean), dec = a >= 100 ? 1 : a >= 10 ? 2 : Math.max(0, 2 - Math.floor(Math.log10(a || 1))); return (+sd).toFixed(Math.min(6, dec)); };
IP.summaryText = st => st.filter(g => g.kind !== 'count').map(g => `${g.cls}: ${fmtN(g.mean)}${g.n > 1 ? ' ± ' + IP.fmtSD(g.sd, g.mean) : ''}${g.unit === '°' ? '°' : ' ' + g.unit} (n = ${g.n})`).concat(st.filter(g => g.kind === 'count').map(g => `${g.cls}: ${g.n} counted`));
/* the measurements drawn on the panel (in the clipped image group) */
IP.measOverlay = (p, w, h, ix, iy, FW, FH, font) => {
  const X = u => ix + u / (p.pxW || 1) * FW, Y = v => iy + v / (p.pxH || 1) * FH, c = p.measColor || '#2bd4ff', lw = +p.measW || 0.35, fs = U.pt2mm(p.measSize || 5.5);
  const pts = q => (q.pts || []).map(a => [X(a[0]), Y(a[1])]), path = P => 'M ' + P.map(a => n(a[0]) + ' ' + n(a[1])).join(' L ');
  const st = IP.measStats(p);
  let s = '';
  const label = (x, y, t) => p.measLabels ? `<text x="${n(x)}" y="${n(y)}" font-family="${font}" font-size="${n(fs)}" fill="${c}" stroke="#000000" stroke-opacity="0.55" stroke-width="${n(fs * 0.12)}" paint-order="stroke" text-anchor="middle">${U.esc(t)}</text>` : '';
  (p.meas || []).forEach((q, i) => {
    const P = pts(q); if (!P.length) return;
    const g = st.find(x => x.cls === (q.cls || 'Unnamed') && x.kind === IP.kind(q.type)), j = (p.meas || []).filter((r, k) => k < i && (r.cls || 'Unnamed') === (q.cls || 'Unnamed') && IP.kind(r.type) === IP.kind(q.type)).length;
    const val = g && g.values[j] != null ? fmtN(g.values[j]) + (g.kind === 'angle' ? '°' : ' ' + g.unit) : '';
    /* a short end tick across the line at point a (direction towards b) */
    const cap = (a, b) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = -(b[1] - a[1]) / L * lw * 2.2, ny = (b[0] - a[0]) / L * lw * 2.2; return `<path d="M ${n(a[0] - nx)} ${n(a[1] - ny)} L ${n(a[0] + nx)} ${n(a[1] + ny)}" stroke="${c}" stroke-width="${n(lw)}"/>`; };
    if (q.type === 'line' || q.type === 'poly') {
      s += `<path d="${path(P)}" fill="none" stroke="${c}" stroke-width="${n(lw)}" stroke-linejoin="round"/>`; if (P.length > 1) s += cap(P[0], P[1]) + cap(P[P.length - 1], P[P.length - 2]);
      // straight line: the value just beyond its upper end; segmented: beside its middle
      if (q.type === 'line' && P.length > 1) { const [e0, e1] = P[0][1] <= P[1][1] ? [P[0], P[1]] : [P[1], P[0]], L = Math.hypot(e0[0] - e1[0], e0[1] - e1[1]) || 1, ux = (e0[0] - e1[0]) / L, uy = (e0[1] - e1[1]) / L; s += label(e0[0] + ux * fs * 1.6, e0[1] + uy * fs * 0.9 + fs * 0.3, val); }
      else { const a = P[Math.floor((P.length - 1) / 2)], b = P[Math.min(P.length - 1, Math.floor((P.length - 1) / 2) + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L; if (ny > 0) { nx = -nx; ny = -ny; } s += label((a[0] + b[0]) / 2 + nx * fs * 0.9, (a[1] + b[1]) / 2 + ny * fs * 0.9 + fs * 0.3, val); }
    }
    else if (q.type === 'diam' && P.length > 1) { const cx = (P[0][0] + P[1][0]) / 2, cy = (P[0][1] + P[1][1]) / 2, r = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) / 2; s += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${c}" stroke-width="${n(lw)}"/><path d="${path(P)}" stroke="${c}" stroke-width="${n(lw * 0.6)}" stroke-dasharray="${n(lw * 2)} ${n(lw * 1.5)}"/>` + label(cx, cy - r - fs * 0.3, val); }
    else if (q.type === 'area' && P.length > 2) { const cx = P.reduce((a, b) => a + b[0], 0) / P.length, cy = P.reduce((a, b) => a + b[1], 0) / P.length; s += `<path d="${path(P)} Z" fill="${c}" fill-opacity="0.15" stroke="${c}" stroke-width="${n(lw)}"/>` + label(cx, cy, val); }
    else if (q.type === 'angle' && P.length > 2) s += `<path d="${path(P)}" fill="none" stroke="${c}" stroke-width="${n(lw)}"/>` + label(P[1][0], P[1][1] - fs * 0.6, val);
    else if (q.type === 'count') P.forEach(a => { s += `<circle cx="${n(a[0])}" cy="${n(a[1])}" r="${n(lw * 2.4)}" fill="none" stroke="${c}" stroke-width="${n(lw)}"/>`; });
  });
  return s;
};

/* ---------- porosity (pores segmented by a threshold) ----------
   The image is turned into grey levels (at most 2048 px on the long side), smoothed (box blur
   ×3 ≈ Gaussian of σ px), thresholded (Otsu's method or a set level; pores dark or bright),
   and the pores are labelled as 8-connected regions. Porosity = pore pixels / pixels in the
   region of interest; each pore gets its area, equivalent diameter and centroid. */
IP.otsu = hist => {
  let total = 0, sum = 0; for (let i = 0; i < 256; i++) { total += hist[i]; sum += i * hist[i]; }
  let wB = 0, sB = 0, best = 0, thr = 127;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF); if (v > best) { best = v; thr = t; } }
  return thr;
};
const boxBlur = (src, w, h, r) => {
  if (r < 1) return src;
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h), k = 2 * r + 1;
  for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { tmp[y * w + x] = acc / k; const xo = Math.max(0, x - r), xi = Math.min(w - 1, x + r + 1); acc += src[y * w + xi] - src[y * w + xo]; } }
  for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { out[y * w + x] = acc / k; const yo = Math.max(0, y - r), yi = Math.min(h - 1, y + r + 1); acc += tmp[yi * w + x] - tmp[yo * w + x]; } }
  return out;
};
/* grey levels of an image href at most `max` px on the long side: { g (Float32 0–255), w, h, k (px of the original per px here) } */
IP.greyOf = async (href, max = 2048) => {
  const img = await IP.decode(href), k = Math.max(1, Math.max(img.naturalWidth, img.naturalHeight) / max), w = Math.max(1, Math.round(img.naturalWidth / k)), h = Math.max(1, Math.round(img.naturalHeight / k));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data, g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2];
  return { g, w, h, k: img.naturalWidth / w };
};
/* o: { thr (0–255 or null = Otsu), bright (pores brighter than the solid), sigma (px), minArea (px of the original), roi: [x0, y0, x1, y1] fractions, edge: keep pores cut by the ROI edge in the size statistics } */
IP.porosity = (G, o = {}) => {
  const { w, h } = G, sig = Math.max(0, +o.sigma || 0), r = Math.round(sig * 0.87);   // three box passes of radius r ≈ Gaussian of σ
  const roi = o.roi || [0, 0, 1, 1], X0 = Math.max(0, Math.floor(roi[0] * w)), Y0 = Math.max(0, Math.floor(roi[1] * h)), X1 = Math.min(w, Math.ceil(roi[2] * w)), Y1 = Math.min(h, Math.ceil(roi[3] * h));
  // smooth inside the region only, so an info bar or border outside it cannot bleed in
  let g = G.g;
  if (r >= 1) {
    const sw = X1 - X0, sh = Y1 - Y0; let sub = new Float32Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) sub[y * sw + x] = G.g[(y + Y0) * w + x + X0];
    sub = boxBlur(boxBlur(boxBlur(sub, sw, sh, r), sw, sh, r), sw, sh, r);
    g = new Float32Array(w * h); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) g[(y + Y0) * w + x + X0] = sub[y * sw + x];
  }
  const hist = new Uint32Array(256);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) hist[Math.max(0, Math.min(255, Math.round(g[y * w + x])))]++;
  const thr = o.thr == null ? IP.otsu(hist) : +o.thr;
  const mask = new Uint8Array(w * h);
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) { const v = g[y * w + x]; mask[y * w + x] = o.bright ? (v > thr ? 1 : 0) : (v <= thr ? 1 : 0); }
  // 8-connected labelling (union–find)
  const lab = new Int32Array(w * h), par = [0];
  const find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const unite = (a, b) => { a = find(a); b = find(b); if (a !== b) par[Math.max(a, b)] = Math.min(a, b); };
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = y * w + x; if (!mask[i]) continue;
    const nb = [];
    if (x > X0 && lab[i - 1]) nb.push(lab[i - 1]);
    if (y > Y0) { if (lab[i - w]) nb.push(lab[i - w]); if (x > X0 && lab[i - w - 1]) nb.push(lab[i - w - 1]); if (x < X1 - 1 && lab[i - w + 1]) nb.push(lab[i - w + 1]); }
    if (!nb.length) { par.push(par.length); lab[i] = par.length - 1; }
    else { const m = Math.min(...nb); lab[i] = m; nb.forEach(q => unite(m, q)); }
  }
  const k2 = G.k * G.k, min = Math.max(0, +o.minArea || 0) / k2, reg = new Map();
  let porePx = 0;
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = y * w + x; if (!lab[i]) continue;
    const L = find(lab[i]); lab[i] = L;
    let R = reg.get(L); if (!R) { R = { n: 0, sx: 0, sy: 0, edge: false }; reg.set(L, R); }
    R.n++; R.sx += x; R.sy += y; if (x === X0 || y === Y0 || x === X1 - 1 || y === Y1 - 1) R.edge = true;
  }
  const pores = [];
  reg.forEach((R, L) => { if (R.n < min) { R.small = true; return; } porePx += R.n; pores.push({ id: L, areaPx: R.n * k2, cx: (R.sx / R.n + 0.5) * G.k, cy: (R.sy / R.n + 0.5) * G.k, edge: R.edge }); });
  const roiPx = Math.max(1, (X1 - X0) * (Y1 - Y0));
  return { thr, hist, mask, lab, reg, w, h, k: G.k, roi: [X0, Y0, X1, Y1], porosity: porePx / roiPx, roiAreaPx: roiPx * k2, pores };
};
/* calibrated results: sizes in nm (or px) and the pore density */
IP.poroSummary = (p, R, keepEdge) => {
  const s = IP.nmPerPx(p), use = R.pores.filter(q => keepEdge || !q.edge);
  const eqdPx = use.map(q => 2 * Math.sqrt(q.areaPx / Math.PI)), areaPx = use.map(q => q.areaPx);
  let eqd = eqdPx, unit = 'px', area = areaPx, aunit = 'px²';
  if (s) { const nm = eqdPx.map(v => v * s), [u, f] = IP.lenUnit(nm); eqd = nm.map(v => v / f); unit = u; area = areaPx.map(v => v * s * s / (f * f)); aunit = u + '²'; }
  const roiUm2 = s ? R.roiAreaPx * s * s / 1e6 : 0;
  return { porosity: R.porosity, n: R.pores.length, nStats: use.length, edgeExcluded: R.pores.length - use.length, eqd: stat(eqd), eqdVals: eqd, unit, area: stat(area), aunit, density: roiUm2 ? R.pores.length / roiUm2 : 0, thr: R.thr };
};
/* the pore map as a transparent PNG at the analysis resolution (pores coloured) */
IP.poreMaskURL = (R, colour = '#ff3b30', alpha = 0.55) => {
  const cv = document.createElement('canvas'); cv.width = R.w; cv.height = R.h;
  const ctx = cv.getContext('2d'), im = ctx.createImageData(R.w, R.h), c = [parseInt(colour.slice(1, 3), 16), parseInt(colour.slice(3, 5), 16), parseInt(colour.slice(5, 7), 16)], a = Math.round(alpha * 255);
  for (let i = 0; i < R.w * R.h; i++) { const L = R.lab[i]; if (L && !(R.reg.get(L) || {}).small) { im.data[i * 4] = c[0]; im.data[i * 4 + 1] = c[1]; im.data[i * 4 + 2] = c[2]; im.data[i * 4 + 3] = a; } }
  ctx.putImageData(im, 0, 0);
  return cv.toDataURL('image/png');
};

/* fill a micrograph from an image file (keeps its calibration and look) */
IP.fill = (obj, file) => RNBX.project.readImage(file).catch(e => { RNBX.toast(e.message || String(e), 'error'); throw e; }).then(r => {
  RNBX.history.checkpoint();
  Object.assign(obj.props, { href: r.href, aspect: r.aspect, pxW: r.pxW || 1000, pxH: r.pxH || Math.round(1000 / r.aspect), cx0: 0, cy0: 0, cx1: 1, cy1: 1 });
  // calibration stored in the file (SEM / ImageJ TIFF) fills an uncalibrated panel
  if (r.calib && !(obj.props.calib === 'pixel' && obj.props.pix > 0) && !(obj.props.calib === 'fov' && obj.props.fov > 0)) {
    Object.assign(obj.props, { calib: 'pixel', pix: r.calib.pix, unit: r.calib.unit });
    RNBX.toast(`Pixel size ${r.calib.pix} ${r.calib.unit} read from the file (${r.calib.source}).`);
  }
  RNBX.changed();
  if (RNBX.inspector && RNBX.inspector.build) RNBX.inspector.build();
  return obj;
});
/* a new micrograph from a file, at (x, y) */
IP.create = (file, x, y, w) => {
  const S = RNBX.state, o = RNBX.createObject('micrograph', x == null ? S.doc.page.width / 2 : x, y == null ? S.doc.page.height / 2 : y);
  if (w) o.props.w = w;
  return IP.fill(o, file).then(() => { if (!S.doc.objects.includes(o)) S.doc.objects.push(o); RNBX.changed(); return o; });
};
})();
