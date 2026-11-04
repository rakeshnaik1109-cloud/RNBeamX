/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/imgedit.js
   The image editor's pipeline (no UI here). An edit is a recipe
   applied to the kept original, so it can always be changed or
   undone:
     1. background: colour keys, magic-wand fills and eraser /
        restore brush strokes on the alpha channel (in the
        original's pixel coordinates), then edge softening;
     2. geometry: quarter turns, fine rotation, mirror;
     3. colour: exposure, brightness, contrast, gamma, saturation,
        temperature / tint, blur and sharpen, effects (grey,
        sepia, invert, duotone, one-colour tint), auto levels;
     4. crop (fractions of the rotated image);
     5. size (output pixels, smooth downscaling);
     6. file format and quality (PNG, JPEG, WebP).
   Everything runs in the browser.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const IE = RNBX.imgEdit = {};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

IE.DEFAULT = () => ({
  ops: [], feather: 0,
  rot90: 0, rot: 0, flipH: false, flipV: false,
  col: { exposure: 0, brightness: 0, contrast: 0, gamma: 1, saturation: 0, temp: 0, tint: 0, blur: 0, sharpen: 0, effect: 'none', c1: '#1f3b73', c2: '#ffd23f', lo: 0, hi: 255 },
  crop: [0, 0, 1, 1], outW: 0, format: 'png', quality: 0.9, jpegBg: '#ffffff',
});
IE.isIdentity = e => !e || (!e.ops.length && !e.feather && !e.rot90 && !e.rot && !e.flipH && !e.flipV && e.crop.join() === '0,0,1,1' && !e.outW && JSON.stringify(e.col) === JSON.stringify(IE.DEFAULT().col));

const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const canvasOf = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

/* the original as a canvas, at most `max` px on the long side; k = original px per px here */
IE.source = (img, max = 1e9) => {
  const W0 = img.naturalWidth || img.width || 1000, H0 = img.naturalHeight || img.height || 1000, k = Math.max(1, Math.max(W0, H0) / max);
  const c = canvasOf(W0 / k, H0 / k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return { c, k, W0, H0 };
};

/* ---------- 1. background (alpha) ---------- */
const dist2 = (d, i, r, g, b) => { const dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b; return dr * dr + dg * dg + db * db; };
IE.applyAlpha = (src, ops, feather, k) => {
  if (!ops.length && !feather) return src;
  const w = src.width, h = src.height, ctx = src.getContext('2d'), id = ctx.getImageData(0, 0, w, h), d = id.data, a0 = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) a0[i] = d[i * 4 + 3];
  const A = Float32Array.from(a0);
  ops.forEach(op => {
    if (op.op === 'key') {   // a colour everywhere (with a soft edge of `soft` levels)
      const [r, g, b] = op.color, t = op.tol * 4.42, t2 = t * t, s = (op.soft || 0) * 4.42;
      for (let i = 0; i < w * h; i++) { const q = dist2(d, i * 4, r, g, b); if (q <= t2) A[i] = 0; else if (s > 0) { const dd = Math.sqrt(q); if (dd < t + s) A[i] = Math.min(A[i], a0[i] * (dd - t) / s); } }
    } else if (op.op === 'wand') {   // the connected area around a point, of similar colour
      const x0 = Math.round(op.x / k), y0 = Math.round(op.y / k); if (x0 < 0 || y0 < 0 || x0 >= w || y0 >= h) return;
      const i0 = y0 * w + x0, r = d[i0 * 4], g = d[i0 * 4 + 1], b = d[i0 * 4 + 2], t = op.tol * 4.42, t2 = t * t;
      const seen = new Uint8Array(w * h), st = new Int32Array(w * h); let sp = 0; st[sp++] = i0; seen[i0] = 1;
      while (sp) {
        const i = st[--sp]; A[i] = 0; const x = i % w;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w];
        for (let j = 0; j < 4; j++) { const q = nb[j]; if (q < 0 || q >= w * h || seen[q]) continue; seen[q] = 1; if (dist2(d, q * 4, r, g, b) <= t2) st[sp++] = q; }
      }
    } else if (op.op === 'brush') {   // eraser or restore, soft round brush along a path
      const R = Math.max(0.5, op.r / k), hard = clamp(op.hard == null ? 0.6 : op.hard, 0, 0.98), pts = op.pts.map(q => [q[0] / k, q[1] / k]);
      const stamp = (cx, cy) => {
        const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(w - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(h - 1, Math.ceil(cy + R));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R; if (r >= 1) continue;
          const wgt = r <= hard ? 1 : 1 - (r - hard) / (1 - hard), i = y * w + x;
          if (op.mode === 'restore') A[i] = Math.max(A[i], a0[i] * wgt); else A[i] = A[i] * (1 - wgt);
        }
      };
      for (let j = 0; j < pts.length; j++) {
        if (!j) { stamp(pts[0][0], pts[0][1]); continue; }
        const [ax, ay] = pts[j - 1], [bx, by] = pts[j], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / (R * 0.3)));
        for (let s = 1; s <= n; s++) stamp(ax + (bx - ax) * s / n, ay + (by - ay) * s / n);
      }
    }
  });
  // soften the cut-out edge: blur the alpha a little where it changed
  if (feather > 0) {
    const r = Math.max(1, Math.round(feather / k)), B = Float32Array.from(A);
    const pass = (src2, dst, horiz) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, n = 0; for (let t = -r; t <= r; t++) { const xx = horiz ? x + t : x, yy = horiz ? y : y + t; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; s += src2[yy * w + xx]; n++; } dst[y * w + x] = s / n; } };
    const T = new Float32Array(w * h); pass(A, T, true); pass(T, B, false);
    for (let i = 0; i < w * h; i++) A[i] = Math.min(a0[i], B[i]);
  }
  for (let i = 0; i < w * h; i++) d[i * 4 + 3] = A[i];
  const out = canvasOf(w, h); out.getContext('2d').putImageData(id, 0, 0);
  return out;
};

/* ---------- 2. geometry ---------- */
IE.angle = e => ((e.rot90 || 0) * 90 + (+e.rot || 0)) * Math.PI / 180;
IE.geomSize = (w, h, e) => { const t = IE.angle(e), c = Math.abs(Math.cos(t)), s = Math.abs(Math.sin(t)); return [Math.round(w * c + h * s), Math.round(w * s + h * c)]; };
IE.applyGeom = (src, e) => {
  if (!e.rot90 && !e.rot && !e.flipH && !e.flipV) return src;
  const [W, H] = IE.geomSize(src.width, src.height, e), out = canvasOf(W, H), ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(W / 2, H / 2); ctx.rotate(IE.angle(e)); ctx.scale(e.flipH ? -1 : 1, e.flipV ? -1 : 1);
  ctx.drawImage(src, -src.width / 2, -src.height / 2);
  return out;
};
/* a point in the rotated image ↔ the original (both in original pixels) */
IE.toOriginal = (e, W0, H0, p) => {
  const [GW, GH] = IE.geomSize(W0, H0, e), t = -IE.angle(e), x = p[0] - GW / 2, y = p[1] - GH / 2;
  let u = x * Math.cos(t) - y * Math.sin(t), v = x * Math.sin(t) + y * Math.cos(t);
  if (e.flipH) u = -u; if (e.flipV) v = -v;
  return [u + W0 / 2, v + H0 / 2];
};

/* ---------- 3. colour ---------- */
const boxBlurRGBA = (d, w, h, r) => {
  const out = new Float32Array(d.length), tmp = new Float32Array(d.length), k = 2 * r + 1;
  for (let c = 0; c < 4; c++) {
    for (let y = 0; y < h; y++) { let acc = 0; for (let x = -r; x <= r; x++) acc += d[(y * w + clamp(x, 0, w - 1)) * 4 + c]; for (let x = 0; x < w; x++) { tmp[(y * w + x) * 4 + c] = acc / k; acc += d[(y * w + Math.min(w - 1, x + r + 1)) * 4 + c] - d[(y * w + Math.max(0, x - r)) * 4 + c]; } }
    for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[(clamp(y, 0, h - 1) * w + x) * 4 + c]; for (let y = 0; y < h; y++) { out[(y * w + x) * 4 + c] = acc / k; acc += tmp[(Math.min(h - 1, y + r + 1) * w + x) * 4 + c] - tmp[(Math.max(0, y - r) * w + x) * 4 + c]; } }
  }
  return out;
};
/* black and white points that clip 0.5 % of the opaque pixels at each end */
IE.autoLevels = canvas => {
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data, hist = new Uint32Array(256); let N = 0;
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 8) continue; hist[Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])]++; N++; }
  const cut = N * 0.005; let a = 0, s = 0; while (a < 255 && s + hist[a] <= cut) s += hist[a++]; let b = 255; s = 0; while (b > 0 && s + hist[b] <= cut) s += hist[b--];
  return b > a ? { lo: a, hi: b } : { lo: 0, hi: 255 };
};
IE.applyColour = (src, c, k = 1) => {
  const D = IE.DEFAULT().col; if (JSON.stringify(c) === JSON.stringify(D)) return src;
  const w = src.width, h = src.height, id = src.getContext('2d').getImageData(0, 0, w, h), d = id.data;
  let f = d;
  if (c.blur > 0) f = boxBlurRGBA(d, w, h, Math.max(1, Math.round(c.blur / k)));
  if (c.sharpen > 0) { const b = boxBlurRGBA(d, w, h, Math.max(1, Math.round(1.5 / k))), amt = c.sharpen / 50; const g = new Float32Array(d.length); for (let i = 0; i < d.length; i++) g[i] = (i & 3) === 3 ? f[i] : f[i] + amt * (f[i] - b[i]); f = g; }
  const ex = Math.pow(2, c.exposure || 0), br = (c.brightness || 0) * 2.55, ct = (100 + (c.contrast || 0)) / 100, gm = 1 / (c.gamma || 1), sat = 1 + (c.saturation || 0) / 100;
  const lo = c.lo || 0, hi = c.hi == null ? 255 : c.hi, span = Math.max(1, hi - lo), tR = 1 + (c.temp || 0) / 200, tB = 1 - (c.temp || 0) / 200, tG = 1 - (c.tint || 0) / 200;
  const c1 = hexRGB(c.c1 || '#000000'), c2 = hexRGB(c.c2 || '#ffffff');
  for (let i = 0; i < d.length; i += 4) {
    let r = f[i], g = f[i + 1], b = f[i + 2];
    r = (r - lo) / span * 255; g = (g - lo) / span * 255; b = (b - lo) / span * 255;
    r *= ex * tR; g *= ex * tG; b *= ex * tB;
    r = (r - 128) * ct + 128 + br; g = (g - 128) * ct + 128 + br; b = (b - 128) * ct + 128 + br;
    if (gm !== 1) { r = 255 * Math.pow(clamp(r, 0, 255) / 255, gm); g = 255 * Math.pow(clamp(g, 0, 255) / 255, gm); b = 255 * Math.pow(clamp(b, 0, 255) / 255, gm); }
    const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (sat !== 1) { r = Y + (r - Y) * sat; g = Y + (g - Y) * sat; b = Y + (b - Y) * sat; }
    const e = c.effect, t = clamp(Y / 255, 0, 1);
    if (e === 'grey') { r = g = b = Y; }
    else if (e === 'sepia') { const R0 = r, G0 = g, B0 = b; r = 0.393 * R0 + 0.769 * G0 + 0.189 * B0; g = 0.349 * R0 + 0.686 * G0 + 0.168 * B0; b = 0.272 * R0 + 0.534 * G0 + 0.131 * B0; }
    else if (e === 'invert') { r = 255 - r; g = 255 - g; b = 255 - b; }
    else if (e === 'duotone') { r = c1[0] + (c2[0] - c1[0]) * t; g = c1[1] + (c2[1] - c1[1]) * t; b = c1[2] + (c2[2] - c1[2]) * t; }
    else if (e === 'tint') { r = c1[0]; g = c1[1]; b = c1[2]; }   // one colour, shape from the alpha (icons, logos)
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = f === d ? d[i + 3] : clamp(f[i + 3], 0, 255);
  }
  const out = canvasOf(w, h); out.getContext('2d').putImageData(id, 0, 0);
  return out;
};

/* ---------- 4–5. crop and size ---------- */
IE.applyCrop = (src, cr) => {
  if (cr.join() === '0,0,1,1') return src;
  const x = Math.round(cr[0] * src.width), y = Math.round(cr[1] * src.height), w = Math.max(1, Math.round((cr[2] - cr[0]) * src.width)), h = Math.max(1, Math.round((cr[3] - cr[1]) * src.height));
  const out = canvasOf(w, h); out.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h);
  return out;
};
/* smooth downscaling: halve repeatedly, then the last step */
IE.resize = (src, W) => {
  if (!W || Math.abs(W - src.width) < 1) return src;
  const H = Math.max(1, Math.round(src.height * W / src.width));
  let cur = src;
  while (cur.width / 2 >= W) { const c = canvasOf(cur.width / 2, cur.height / 2), x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height); cur = c; }
  const out = canvasOf(W, H), x = out.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, W, H);
  return out;
};

/* the whole recipe: { canvas, hasAlpha } at a working scale (k = original px per px) */
IE.render = (src, e, k = 1, stages = { alpha: true, colour: true }) => {
  let c = stages.alpha ? IE.applyAlpha(src, e.ops, e.feather, k) : src;
  c = IE.applyGeom(c, e);
  if (stages.colour) c = IE.applyColour(c, e.col, k);
  c = IE.applyCrop(c, e.crop);
  return c;
};
/* the box around everything not transparent, as crop fractions (null if nothing to trim) */
IE.contentBox = (canvas, pad = 0.01) => {
  const w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 < 0) return null;
  const px = pad * Math.max(w, h);
  return [Math.max(0, (x0 - px) / w), Math.max(0, (y0 - px) / h), Math.min(1, (x1 + 1 + px) / w), Math.min(1, (y1 + 1 + px) / h)].map(v => Math.round(v * 1e4) / 1e4);
};
IE.hasAlpha = canvas => { const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return true; return false; };
/* encode: JPEG has no transparency, so it goes on the chosen background */
IE.encode = (canvas, e) => {
  let c = canvas;
  if (e.format === 'jpeg') { c = canvasOf(canvas.width, canvas.height); const x = c.getContext('2d'); x.fillStyle = e.jpegBg || '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(canvas, 0, 0); }
  const type = e.format === 'jpeg' ? 'image/jpeg' : e.format === 'webp' ? 'image/webp' : 'image/png';
  const url = c.toDataURL(type, e.format === 'png' ? undefined : clamp(+e.quality || 0.9, 0.3, 1));
  return { url, bytes: IE.bytesOf(url), type: url.slice(5, url.indexOf(';')) };
};
IE.bytesOf = url => { const i = url.indexOf(','); return Math.floor((url.length - i - 1) * 3 / 4) - (url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0); };
IE.fmtBytes = b => (b >= 1048576 ? (b / 1048576).toFixed(2) + ' MB' : b >= 1024 ? Math.round(b / 1024) + ' kB' : b + ' B');
/* a soft black silhouette of a cut-out, for its drop shadow in the figure */
IE.silhouette = canvas => {
  const k = Math.max(1, Math.max(canvas.width, canvas.height) / 400), c = canvasOf(canvas.width / k, canvas.height / k), x = c.getContext('2d');
  x.drawImage(canvas, 0, 0, c.width, c.height);
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) { d[i] = d[i + 1] = d[i + 2] = 0; }
  const bl = boxBlurRGBA(d, c.width, c.height, Math.max(1, Math.round(c.width / 80)));
  for (let i = 3; i < d.length; i += 4) d[i] = bl[i];
  x.putImageData(id, 0, 0);
  return c.toDataURL('image/png');
};
/* full-resolution result of a recipe on an original image href */
IE.bake = async (orig, e, decode) => {
  const img = await decode(orig), S = IE.source(img, 6000);
  let c = IE.render(S.c, e, S.k);
  if (e.outW) c = IE.resize(c, e.outW);
  const enc = IE.encode(c, e), alpha = e.format !== 'jpeg' && IE.hasAlpha(c);
  return Object.assign(enc, { w: c.width, h: c.height, alpha, silhouette: alpha ? IE.silhouette(c) : '' });
};
})();
