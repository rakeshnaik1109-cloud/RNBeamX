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
  const pr = new Promise((res, rej) => { const img = new Image(); img.onload = () => res(img); img.onerror = () => rej(new Error('Could not read the image')); img.src = href; });
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
    sb: true, sbLen: 0, sbPos: 'br', sbColor: '#ffffff', sbThick: 0.6, sbSize: 7, sbText: 'above', sbBox: '', sbBold: true,
    letter: 'a', letterPos: 'tl', letterColor: '#ffffff', letterSize: 8, letterBox: '',
    note: '', noteColor: '#ffffff', noteSize: 6,
    frame: '', frameW: 0.5,
    cbar: false, cbMin: 0, cbMax: 1, cbLabel: '', cbSize: 6,
    zoom: false, zx: 0.5, zy: 0.5, zf: 3, zs: 0.38, zPos: 'tr', zColor: '#ffd23f', zLines: true, zLabel: true,
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
    { key: 'sbPos', label: 'Position', type: 'select', options: POS, show: p => isCal(p) && p.sb },
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
    head('Frame'),
    { key: 'frame', label: 'Frame colour', type: 'color', allowEmpty: true },
    { key: 'frameW', label: 'Frame weight', type: 'number', unit: 'pt', min: 0.1, max: 6, step: 0.05, show: p => !!p.frame },
  ],
  resizable: true, keepAspect: true,
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
      const im = (extra = '') => `<image href="${U.esc(href)}" x="${n(ix)}" y="${n(iy)}" width="${n(FW)}" height="${n(FH)}" preserveAspectRatio="none"${rend}${extra}/>`;
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
      s += '</g>';
    }
    const m = Math.max(0.8, Math.min(w, h) * 0.035);
    // scale bar
    if (isCal(p) && p.sb && G.visNm > 0) {
      const nm = IP.barNm(p), L = nm * G.mmPerNm, fs = U.pt2mm(p.sbSize), th = p.sbThick, txt = p.sbText !== 'none';
      const bh = th + (txt ? fs * 1.15 : 0), pad = p.sbBox ? 0.6 : 0, bw = Math.max(L, txt ? U.pt2mm(p.sbSize) * 0.6 * IP.lengthLabel(nm, p.unit).length : 0);
      const [x0, y0] = corner(p.sbPos, w, h, m + pad, bw, bh);
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

/* fill a micrograph from an image file (keeps its calibration and look) */
IP.fill = (obj, file) => RNBX.project.readImage(file).then(r => {
  RNBX.history.checkpoint();
  Object.assign(obj.props, { href: r.href, aspect: r.aspect, pxW: r.pxW || 1000, pxH: r.pxH || Math.round(1000 / r.aspect), cx0: 0, cy0: 0, cx1: 1, cy1: 1 });
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
