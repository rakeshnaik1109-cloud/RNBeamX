/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/export.js
   Exporters. Every format is rendered from the same SVG the
   canvas shows.
     SVG  — vector, text kept as editable text
     PDF  — vector (jsPDF + svg2pdf, bundled, loaded on demand)
     PNG  — any DPI, with the DPI written into the file (pHYs)
     TIFF — uncompressed RGB(A) with resolution tags
     MP4 / WebM — the animation, rendered frame by frame
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state;
const X = RNBX.exporter = {};

X.svgString = (opt = {}) => RNBX.render.build(S.doc, { time: opt.time != null ? opt.time : (RNBX.anim.isLive(S.doc) ? S.time : null), transparent: opt.transparent }).svg;

X.svg = opt => {
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + X.svgString(opt);
  U.download(new Blob([svg], { type: 'image/svg+xml' }), U.slug(S.doc.meta.title) + '.svg');
};

/* rasterise the figure SVG onto a canvas */
X.rasterize = (svg, wpx, hpx, bg) => new Promise((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = wpx; c.height = hpx;
    const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, wpx, hpx); }
    ctx.drawImage(img, 0, 0, wpx, hpx);
    URL.revokeObjectURL(url);
    res(c);
  };
  img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Rendering failed')); };
  img.src = url;
});
const pxSize = dpi => [Math.max(1, Math.round(S.doc.page.width / 25.4 * dpi)), Math.max(1, Math.round(S.doc.page.height / 25.4 * dpi))];

/* ---------- PNG with DPI metadata ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = bytes => { let c = 0xffffffff; for (let i = 0; i < bytes.length; i++) c = CRC[(c ^ bytes[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
X.pngWithDpi = async (blob, dpi) => {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const dv = new DataView(chunk.buffer);
  dv.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);      // "pHYs"
  dv.setUint32(8, ppm); dv.setUint32(12, ppm); chunk[16] = 1;
  dv.setUint32(17, crc32(chunk.subarray(4, 17)));
  const ihdrEnd = 8 + 25;                       // signature + IHDR chunk
  const out = new Uint8Array(buf.length + 21);
  out.set(buf.subarray(0, ihdrEnd), 0); out.set(chunk, ihdrEnd); out.set(buf.subarray(ihdrEnd), ihdrEnd + 21);
  return new Blob([out], { type: 'image/png' });
};
X.png = async (opt = {}) => {
  const dpi = opt.dpi || 600, [w, h] = pxSize(dpi);
  const c = await X.rasterize(X.svgString(opt), w, h, opt.transparent ? null : null);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  U.download(await X.pngWithDpi(blob, dpi), U.slug(S.doc.meta.title) + `_${dpi}dpi.png`);
};
X.jpeg = async (opt = {}) => {
  const dpi = opt.dpi || 600, [w, h] = pxSize(dpi);
  const c = await X.rasterize(X.svgString(Object.assign({}, opt, { transparent: false })), w, h, '#ffffff');
  const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.95));
  U.download(blob, U.slug(S.doc.meta.title) + `_${dpi}dpi.jpg`);
};

/* ---------- TIFF (baseline, uncompressed) ---------- */
X.tiffBlob = (canvas, dpi, alpha) => {
  const w = canvas.width, h = canvas.height;
  const rgba = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const spp = alpha ? 4 : 3;
  const tags = [];
  const tag = (id, type, count, value) => tags.push({ id, type, count, value });
  const nTags = alpha ? 14 : 13;
  const ifdOff = 8, ifdLen = 2 + nTags * 12 + 4;
  const bpsOff = ifdOff + ifdLen, xresOff = bpsOff + spp * 2, yresOff = xresOff + 8, dataOff = yresOff + 8;
  const dataLen = w * h * spp;
  tag(256, 4, 1, w); tag(257, 4, 1, h); tag(258, 3, spp, bpsOff); tag(259, 3, 1, 1); tag(262, 3, 1, 2);
  tag(273, 4, 1, dataOff); tag(277, 3, 1, spp); tag(278, 4, 1, h); tag(279, 4, 1, dataLen);
  tag(282, 5, 1, xresOff); tag(283, 5, 1, yresOff); tag(284, 3, 1, 1); tag(296, 3, 1, 2);
  if (alpha) tag(338, 3, 1, 2);
  const buf = new ArrayBuffer(dataOff + dataLen), dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint16(0, 0x4949, true); dv.setUint16(2, 42, true); dv.setUint32(4, ifdOff, true);
  dv.setUint16(ifdOff, nTags, true);
  tags.forEach((t, i) => {
    const o = ifdOff + 2 + i * 12;
    dv.setUint16(o, t.id, true); dv.setUint16(o + 2, t.type, true); dv.setUint32(o + 4, t.count, true);
    if (t.type === 3 && t.count === 1) dv.setUint16(o + 8, t.value, true); else dv.setUint32(o + 8, t.value, true);
  });
  dv.setUint32(ifdOff + 2 + nTags * 12, 0, true);
  for (let i = 0; i < spp; i++) dv.setUint16(bpsOff + i * 2, 8, true);
  dv.setUint32(xresOff, dpi, true); dv.setUint32(xresOff + 4, 1, true);
  dv.setUint32(yresOff, dpi, true); dv.setUint32(yresOff + 4, 1, true);
  let p = dataOff;
  for (let i = 0; i < w * h; i++) {
    u8[p++] = rgba[i * 4]; u8[p++] = rgba[i * 4 + 1]; u8[p++] = rgba[i * 4 + 2];
    if (alpha) u8[p++] = rgba[i * 4 + 3];
  }
  return new Blob([buf], { type: 'image/tiff' });
};
X.tiff = async (opt = {}) => {
  const dpi = opt.dpi || 600, [w, h] = pxSize(dpi);
  if (w * h > 60e6) throw new Error('That size is too large for TIFF in the browser; lower the DPI.');
  const c = await X.rasterize(X.svgString(opt), w, h, opt.transparent ? null : '#ffffff');
  U.download(X.tiffBlob(c, dpi, !!opt.transparent), U.slug(S.doc.meta.title) + `_${dpi}dpi.tif`);
};

/* ---------- PDF (vector) ----------
   The 14 standard PDF fonts cannot show Greek, so Greek letters
   and a few maths symbols are mapped onto the standard Symbol
   font. Everything stays vector and selectable. */
const SYMBOL = {
  'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'h', 'θ': 'q', 'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'π': 'p', 'ρ': 'r', 'σ': 's', 'τ': 't', 'υ': 'u', 'φ': 'j', 'χ': 'c', 'ψ': 'y', 'ω': 'w',
  'Γ': 'G', 'Δ': 'D', 'Θ': 'Q', 'Λ': 'L', 'Ξ': 'X', 'Π': 'P', 'Σ': 'S', 'Φ': 'F', 'Ψ': 'Y', 'Ω': 'W',
  '→': '®', '←': '¬', '↑': '­', '↓': '¯', '↔': '«', '≈': '»', '≤': '£', '≥': '³', '≠': '¹', '∞': '¥', '∂': '¶', '∇': 'Ñ', '√': 'Ö', '∝': 'µ', '′': '¢',
};
X.pdfPrepare = svgText => {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const re = new RegExp('[' + Object.keys(SYMBOL).join('') + ']');
  doc.querySelectorAll('text, tspan').forEach(el => {
    [...el.childNodes].forEach(node => {
      if (node.nodeType !== 3 || !re.test(node.data)) return;
      const frag = doc.createDocumentFragment();
      let buf = '';
      const flush = () => { if (buf) { frag.appendChild(doc.createTextNode(buf)); buf = ''; } };
      for (const ch of node.data) {
        if (SYMBOL[ch]) {
          flush();
          const t = doc.createElementNS('http://www.w3.org/2000/svg', 'tspan');
          t.setAttribute('font-family', 'symbol');   // svg2pdf matches jsPDF's lower-case name
          t.setAttribute('font-style', 'normal');
          t.setAttribute('font-weight', 'normal');
          t.textContent = SYMBOL[ch];
          frag.appendChild(t);
        } else if (ch !== '​') buf += ch;
      }
      flush();
      node.replaceWith(frag);
    });
  });
  // svg2pdf cannot follow <use> to a group: inline a copy for zoom insets
  const content = doc.getElementById('rbx-content');
  doc.querySelectorAll('use').forEach(u => {
    const ref = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace('#', '');
    if (ref !== 'rbx-content' || !content) return;
    const g = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', u.getAttribute('transform') || '');
    const copy = content.cloneNode(true);
    copy.removeAttribute('id');
    g.appendChild(copy);
    u.replaceWith(g);
  });
  return doc.documentElement;
};
X.loadPdfLibs = async () => {
  if (window.jspdf && window.svg2pdf) return;
  const base = (document.querySelector('script[src*="js/app.js"]') || {}).src || location.href;
  const root = base.replace(/js\/app\.js.*$/, '');
  if (!window.jspdf) await U.loadScript(root + 'js/vendor/jspdf.umd.min.js');
  if (!window.svg2pdf) await U.loadScript(root + 'js/vendor/svg2pdf.umd.min.js');
};
X.pdfBlob = async (opt = {}) => {
  await X.loadPdfLibs();
  const W = S.doc.page.width, H = S.doc.page.height;
  const pdf = new window.jspdf.jsPDF({ orientation: W > H ? 'l' : 'p', unit: 'mm', format: [W, H], compress: true });
  pdf.setProperties({ title: S.doc.meta.title || 'RNBeamX figure', creator: 'RNBeamX ' + RNBX.VERSION });
  const el = X.pdfPrepare(X.svgString(opt));
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:10px;height:10px;overflow:hidden';
  host.appendChild(el);
  document.body.appendChild(host);
  try { await pdf.svg(el, { x: 0, y: 0, width: W, height: H }); }
  finally { host.remove(); }
  return pdf.output('blob');
};
X.pdf = async (opt = {}) => U.download(await X.pdfBlob(opt), U.slug(S.doc.meta.title) + '.pdf');

/* ---------- clipboard ---------- */
X.copyPng = async (dpi = 300) => {
  const [w, h] = pxSize(dpi);
  const c = await X.rasterize(X.svgString(), w, h, null);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
};
X.copySvg = async () => navigator.clipboard.writeText(X.svgString());

/* ---------- animated GIF (LinkedIn, websites, slides) ---------- */
X.gif = async (opt = {}, onProgress) => {
  const an = S.doc.animation, fps = U.clamp(opt.fps || 15, 4, 30), D = an.duration || 6;
  const W = S.doc.page.width, H = S.doc.page.height;
  const wpx = Math.round(opt.width || 960), hpx = Math.round(wpx * H / W);
  const c = document.createElement('canvas'); c.width = wpx; c.height = hpx;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const frames = [], N = Math.max(1, Math.round(D * fps));
  const bg = S.doc.page.background === 'transparent' ? '#ffffff' : null;
  for (let i = 0; i < N; i++) {
    if (X.cancelVideo) { X.cancelVideo = false; return; }
    const img = await new Promise((res, rej) => {
      const im = new Image(), url = URL.createObjectURL(new Blob([RNBX.render.build(S.doc, { time: i / fps, motion: true }).svg], { type: 'image/svg+xml' }));
      im.onload = () => { URL.revokeObjectURL(url); res(im); }; im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Frame rendering failed')); }; im.src = url;
    });
    ctx.fillStyle = bg || '#ffffff'; ctx.fillRect(0, 0, wpx, hpx);
    ctx.drawImage(img, 0, 0, wpx, hpx);
    frames.push(ctx.getImageData(0, 0, wpx, hpx).data);
    if (onProgress) onProgress(0.6 * (i + 1) / N);
    if (i % 4 === 3) await new Promise(r => setTimeout(r, 0));
  }
  await new Promise(r => setTimeout(r, 0));
  const blob = RNBX.gif.encode(frames, wpx, hpx, Math.round(100 / fps), f => onProgress && onProgress(0.6 + 0.4 * f));
  U.download(blob, U.slug(S.doc.meta.title) + '.gif');
  return blob;
};

/* ---------- video ---------- */
X.videoTypes = () => {
  const cands = [['video/mp4;codecs=avc1.42E01E', 'mp4'], ['video/mp4', 'mp4'], ['video/webm;codecs=vp9', 'webm'], ['video/webm;codecs=vp8', 'webm'], ['video/webm', 'webm']];
  return window.MediaRecorder ? cands.filter(c => MediaRecorder.isTypeSupported(c[0])) : [];
};
X.video = async (opt = {}, onProgress) => {
  const types = X.videoTypes().filter(t => !opt.container || t[1] === opt.container);
  if (!types.length) throw new Error(opt.container === 'mp4' ? 'This browser cannot record MP4. Choose WebM (or use Chrome / Edge / Safari).' : 'This browser cannot record video.');
  const an = S.doc.animation, fps = U.clamp(opt.fps || an.fps || 30, 5, 60), D = an.duration || 6;
  const W = S.doc.page.width, H = S.doc.page.height;
  let wpx = opt.width || 1920; wpx -= wpx % 2;
  let hpx = Math.round(wpx * H / W); hpx -= hpx % 2;
  const c = document.createElement('canvas');
  c.width = wpx; c.height = hpx;
  const ctx = c.getContext('2d');
  const stream = c.captureStream(0);
  const track = stream.getVideoTracks()[0];
  const rec = new MediaRecorder(stream, { mimeType: types[0][0], videoBitsPerSecond: opt.bitrate || 12e6 });
  const chunks = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise(r => { rec.onstop = r; });
  const frames = Math.max(1, Math.round(D * fps));
  const load = svg => new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Frame rendering failed')); };
    img.src = url;
  });
  const bg = S.doc.page.background === 'transparent' ? '#ffffff' : null;
  rec.start();
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    if (X.cancelVideo) break;
    const t = i / fps;
    const img = await load(RNBX.render.build(S.doc, { time: t, motion: true }).svg);
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, wpx, hpx); } else ctx.clearRect(0, 0, wpx, hpx);
    ctx.drawImage(img, 0, 0, wpx, hpx);
    track.requestFrame && track.requestFrame();
    if (onProgress) onProgress((i + 1) / frames);
    // keep recorder timestamps in real time so the video plays at the right speed
    const due = t0 + (i + 1) * 1000 / fps, wait = due - performance.now();
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }
  rec.stop();
  await done;
  const cancelled = X.cancelVideo; X.cancelVideo = false;
  if (cancelled) return;
  U.download(new Blob(chunks, { type: types[0][0].split(';')[0] }), U.slug(S.doc.meta.title) + '.' + types[0][1]);
};
})();
