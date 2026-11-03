/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/tiff.js
   TIFF reader. Most browsers cannot show TIFF, so microscope
   images (SEM, TEM, AFM, fluorescence) are decoded here and
   turned into PNG. Handles 1/8/16/32-bit and float grey,
   RGB(A) and palette images; uncompressed, LZW, PackBits and
   Deflate; strips or tiles; either byte order. The first page
   of a multi-page file is used.

   Calibration is read when the file carries it: FEI / Thermo
   Fisher (PixelWidth), Zeiss (Image Pixel Size) and ImageJ
   (unit and resolution).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const TF = RNBX.tiff = {};

TF.isTiff = u8 => u8.length > 8 && ((u8[0] === 0x49 && u8[1] === 0x49 && u8[2] === 42 && u8[3] === 0) || (u8[0] === 0x4d && u8[1] === 0x4d && u8[2] === 0 && u8[3] === 42));

const SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };
const TEXT_TAGS = new Set([270, 305, 34682, 34118, 50839]);

/* ---------- decompressors ---------- */
const lzw = (src, maxOut) => {
  const out = new Uint8Array(maxOut), prefix = new Int32Array(4096), suffix = new Uint8Array(4096), first = new Uint8Array(4096), len = new Uint16Array(4096);
  for (let i = 0; i < 256; i++) { prefix[i] = -1; suffix[i] = i; first[i] = i; len[i] = 1; }
  let op = 0, next = 258, width = 9, bp = 0, old = -1;
  const nbits = src.length * 8;
  const read = () => {
    if (bp + width > nbits) return 257;
    let c = 0;
    for (let i = 0; i < width; i++, bp++) c = (c << 1) | ((src[bp >> 3] >> (7 - (bp & 7))) & 1);
    return c;
  };
  const emit = code => {
    const L = len[code];
    let p = op + L - 1, c = code;
    while (c >= 0 && p >= op) { if (p < maxOut) out[p] = suffix[c]; p--; c = prefix[c]; }
    op += L;
  };
  for (;;) {
    const code = read();
    if (code === 257 || op >= maxOut) break;
    if (code === 256) { next = 258; width = 9; old = -1; continue; }
    if (old < 0) { if (code > 255) break; emit(code); old = code; continue; }
    if (code < next) {
      emit(code);
      if (next < 4096) { prefix[next] = old; suffix[next] = first[code]; first[next] = first[old]; len[next] = len[old] + 1; next++; }
    } else {
      if (next < 4096) { prefix[next] = old; suffix[next] = first[old]; first[next] = first[old]; len[next] = len[old] + 1; next++; }
      emit(next - 1);
    }
    old = code < 4096 ? code : old;
    if (next + 1 >= (1 << width) && width < 12) width++;
  }
  return out;
};
const packbits = (src, maxOut) => {
  const out = new Uint8Array(maxOut);
  let i = 0, o = 0;
  while (i < src.length && o < maxOut) {
    const n = (src[i++] << 24) >> 24;
    if (n >= 0) { for (let k = 0; k <= n && i < src.length; k++) out[o++] = src[i++]; }
    else if (n !== -128) { const v = src[i++]; for (let k = 0; k < 1 - n; k++) out[o++] = v; }
  }
  return out;
};
const inflate = async src => {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot read Deflate-compressed TIFF. Save the image as PNG or as an uncompressed / LZW TIFF.');
  const ds = new DecompressionStream('deflate'), w = ds.writable.getWriter();
  w.write(src); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
};

/* ---------- reading ---------- */
TF.decode = async buffer => {
  const u8 = new Uint8Array(buffer), dv = new DataView(buffer);
  if (!TF.isTiff(u8)) throw new Error('Not a TIFF file');
  const le = u8[0] === 0x49, u16 = o => dv.getUint16(o, le), u32 = o => dv.getUint32(o, le);
  // walk the chain of image directories (pages)
  const ifds = [];
  for (let off = u32(4), guard = 0; off && off + 2 <= u8.length && guard < 4096; guard++) { ifds.push(off); const n = u16(off); off = off + 2 + n * 12 + 4 <= u8.length ? u32(off + 2 + n * 12) : 0; }
  if (!ifds.length) throw new Error('This TIFF has no image');
  const val = (type, o) => {
    switch (type) {
      case 1: case 2: case 7: return u8[o];
      case 3: return u16(o); case 4: return u32(o);
      case 5: return u32(o) / (u32(o + 4) || 1);
      case 6: return dv.getInt8(o); case 8: return dv.getInt16(o, le); case 9: return dv.getInt32(o, le);
      case 10: return dv.getInt32(o, le) / (dv.getInt32(o + 4, le) || 1);
      case 11: return dv.getFloat32(o, le); case 12: return dv.getFloat64(o, le);
      default: return 0;
    }
  };
  const tags = {}, ifd = ifds[0], n = u16(ifd);
  for (let i = 0; i < n; i++) {
    const e = ifd + 2 + i * 12, tag = u16(e), type = u16(e + 2), count = u32(e + 4), sz = (SIZE[type] || 1) * count;
    const base = sz <= 4 ? e + 8 : u32(e + 8);
    if (base + sz > u8.length) continue;
    if (type === 2 || (type === 7 && TEXT_TAGS.has(tag)) || (type === 1 && TEXT_TAGS.has(tag))) { let s = ''; for (let k = 0; k < count; k++) { const c = u8[base + k]; if (c) s += String.fromCharCode(c); } tags[tag] = s; continue; }
    if (count > 1e7) continue;
    const arr = new Array(count);
    for (let k = 0; k < count; k++) arr[k] = val(type, base + k * (SIZE[type] || 1));
    tags[tag] = arr;
  }
  const g = (t, d) => (tags[t] == null ? d : Array.isArray(tags[t]) ? tags[t][0] : tags[t]);
  const W = g(256, 0), H = g(257, 0), spp = g(277, 1), bps = (tags[258] || [1])[0], comp = g(259, 1), photo = g(262, spp >= 3 ? 2 : 1), planar = g(284, 1), pred = g(317, 1), fmt = g(339, 1);
  if (!W || !H) throw new Error('This TIFF has no image size');
  if (comp === 6 || comp === 7) throw new Error('JPEG-compressed TIFF is not supported: save the image as PNG, JPEG or an uncompressed / LZW TIFF.');
  if (![1, 5, 8, 32946, 32773].includes(comp)) throw new Error('This TIFF uses a compression RNBeamX cannot read (code ' + comp + '). Save it as PNG or as an uncompressed / LZW TIFF.');
  if (![1, 8, 16, 32, 64].includes(bps)) throw new Error(bps + '-bit TIFF is not supported');
  const B = bps / 8, tiled = tags[322] != null;
  const tw = tiled ? g(322) : W, th = tiled ? g(323) : Math.min(H, g(278, H));
  const offs = tiled ? tags[324] : tags[273], cnts = tiled ? tags[325] : tags[279];
  if (!offs) throw new Error('This TIFF has no image data');
  const planes = planar === 2 ? spp : 1, chunkSpp = planar === 2 ? 1 : spp;
  const rowBytes = bps === 1 ? Math.ceil(tw * chunkSpp / 8) : tw * chunkSpp * B;
  const across = tiled ? Math.ceil(W / tw) : 1, down = Math.ceil(H / th), perPlane = across * down;
  // samples as numbers, plane-interleaved into one array per sample
  const total = W * H, samples = Array.from({ length: spp }, () => (bps === 1 ? new Uint8Array(total) : new Float64Array(total)));
  for (let k = 0; k < offs.length; k++) {
    const plane = Math.floor(k / perPlane), idx = k % perPlane, cx = idx % across, cy = Math.floor(idx / across);
    const raw = u8.subarray(offs[k], offs[k] + (cnts ? cnts[k] : rowBytes * th)), need = rowBytes * th;
    let data = comp === 1 ? raw : comp === 5 ? lzw(raw, need) : comp === 32773 ? packbits(raw, need) : await inflate(raw);
    if (pred === 2 && bps === 8) { for (let r = 0; r < th; r++) for (let x = chunkSpp; x < tw * chunkSpp; x++) data[r * rowBytes + x] = (data[r * rowBytes + x] + data[r * rowBytes + x - chunkSpp]) & 255; }
    const cdv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    if (pred === 2 && bps === 16) { for (let r = 0; r < th; r++) for (let x = chunkSpp; x < tw * chunkSpp; x++) { const o = r * rowBytes + x * 2; if (o + 2 <= data.length) cdv.setUint16(o, (cdv.getUint16(o, le) + cdv.getUint16(o - chunkSpp * 2, le)) & 65535, le); } }
    for (let r = 0; r < th; r++) {
      const y = cy * th + r; if (y >= H) break;
      for (let x0 = 0; x0 < tw; x0++) {
        const x = cx * tw + x0; if (x >= W) break;
        for (let s = 0; s < chunkSpp; s++) {
          const si = planar === 2 ? plane : s, at = r * rowBytes + (x0 * chunkSpp + s) * B, pi = y * W + x;
          let v;
          if (bps === 1) { const bit = r * rowBytes * 8 + x0 * chunkSpp + s; v = (data[bit >> 3] >> (7 - (bit & 7))) & 1; }
          else if (at + B > data.length) v = 0;
          else if (bps === 8) v = fmt === 2 ? cdv.getInt8(at) : data[at];
          else if (bps === 16) v = fmt === 2 ? cdv.getInt16(at, le) : cdv.getUint16(at, le);
          else if (bps === 32) v = fmt === 3 ? cdv.getFloat32(at, le) : fmt === 2 ? cdv.getInt32(at, le) : cdv.getUint32(at, le);
          else v = cdv.getFloat64(at, le);
          samples[si][pi] = v;
        }
      }
    }
  }
  // to 8-bit RGBA
  const rgba = new Uint8ClampedArray(total * 4), maxv = (1 << Math.min(bps, 16)) - 1;
  const scaleOf = arr => {
    if (bps === 8 && fmt !== 2) return v => v;
    if (bps === 1) return v => v * 255;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < arr.length; i++) { const v = arr[i]; if (Number.isFinite(v)) { if (v < lo) lo = v; if (v > hi) hi = v; } }
    const span = hi > lo ? hi - lo : 1;
    return v => (Number.isFinite(v) ? (v - lo) / span * 255 : 0);
  };
  if (photo === 3 && tags[320]) {
    const cm = tags[320], N = cm.length / 3;
    for (let i = 0; i < total; i++) { const k = Math.min(N - 1, samples[0][i] | 0); rgba[i * 4] = cm[k] >> 8; rgba[i * 4 + 1] = cm[N + k] >> 8; rgba[i * 4 + 2] = cm[2 * N + k] >> 8; rgba[i * 4 + 3] = 255; }
  } else if (spp >= 3 && photo === 2) {
    const sc = bps === 8 ? (v => v) : bps === 16 ? (v => v / 257) : scaleOf(samples[0]);
    for (let i = 0; i < total; i++) { rgba[i * 4] = sc(samples[0][i]); rgba[i * 4 + 1] = sc(samples[1][i]); rgba[i * 4 + 2] = sc(samples[2][i]); rgba[i * 4 + 3] = spp >= 4 ? sc(samples[3][i]) : 255; }
  } else {
    const sc = scaleOf(samples[0]), inv = photo === 0;
    for (let i = 0; i < total; i++) { let v = sc(samples[0][i]); if (inv) v = 255 - v; rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = v; rgba[i * 4 + 3] = spp === 2 ? sc(samples[1][i]) : 255; }
  }
  void maxv;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  cv.getContext('2d').putImageData(new ImageData(rgba, W, H), 0, 0);
  return { href: cv.toDataURL('image/png'), pxW: W, pxH: H, aspect: W / H, pages: ifds.length, bits: bps, calib: TF.calibration(tags) };
};

/* pixel size from instrument metadata: { pix, unit } in nm or µm, or null */
TF.calibration = tags => {
  const num = s => { const v = parseFloat(String(s).replace(',', '.')); return Number.isFinite(v) && v > 0 ? v : 0; };
  const fromMetres = m => (m < 1e-6 ? { pix: +(m * 1e9).toPrecision(6), unit: 'nm', source: 'instrument' } : { pix: +(m * 1e6).toPrecision(6), unit: 'µm', source: 'instrument' });
  // FEI / Thermo Fisher: INI text with PixelWidth=… (metres)
  const fei = tags[34682] || '';
  let m = /PixelWidth\s*=\s*([0-9.eE+-]+)/.exec(fei);
  if (m && num(m[1])) return Object.assign(fromMetres(num(m[1])), { source: 'FEI / Thermo Fisher metadata' });
  // Zeiss: "Image Pixel Size = 2.345 nm"
  const z = tags[34118] || '';
  m = /Image Pixel Size\s*=\s*([0-9.,]+)\s*(pm|nm|µm|um|mm)/i.exec(z);
  if (m && num(m[1])) { const u = m[2].toLowerCase() === 'um' ? 'µm' : m[2].replace('M', 'm'); return { pix: num(m[1]), unit: u, source: 'Zeiss metadata' }; }
  // ImageJ: "unit=micron" (or nm) and XResolution = pixels per unit
  const d = tags[270] || '';
  m = /unit=([^\s\n]+)/.exec(d);
  const xr = Array.isArray(tags[282]) ? tags[282][0] : 0;
  if (m && xr > 0 && /^ImageJ/m.test(d)) {
    const u = m[1].replace(/\\u00B5/g, 'µ').toLowerCase(), map = { micron: 'µm', microns: 'µm', um: 'µm', 'µm': 'µm', nm: 'nm', nanometer: 'nm', nanometers: 'nm', mm: 'mm', pm: 'pm', 'å': 'Å', angstrom: 'Å' };
    if (map[u]) return { pix: +(1 / xr).toPrecision(6), unit: map[u], source: 'ImageJ metadata' };
  }
  return null;
};
})();

/* ---------- image references while drawing ----------
   RNBX.imgURL(href, live): on screen, large data URLs are swapped for in-memory object URLs,
   so a redraw does not copy and re-decode megabytes of image each time. A TIFF stored in an
   older project (which no browser can show) is converted to PNG once, in the background. */
(function () {
const RNBX = window.RNBX, blobs = new Map(), tiffs = new Map();
const toBytes = href => { const i = href.indexOf(','), b = atob(href.slice(i + 1)), u = new Uint8Array(b.length); for (let k = 0; k < b.length; k++) u[k] = b.charCodeAt(k); return u; };
RNBX.imgURL = (href, live) => {
  if (!href || typeof href !== 'string' || !href.startsWith('data:')) return href;
  if (/^data:image\/tiff/i.test(href) || (href.startsWith('data:application/octet-stream') && /^(SUkq|TU0A)/.test(href.slice(href.indexOf(',') + 1, href.indexOf(',') + 5)))) {
    const t = tiffs.get(href);
    if (t && t !== 'busy') href = t;
    else {
      if (!t) { tiffs.set(href, 'busy'); try { RNBX.tiff.decode(toBytes(href).buffer).then(r => { tiffs.set(href, r.href); RNBX.emit('render'); }).catch(() => tiffs.delete(href)); } catch (e) { tiffs.delete(href); } }
      return href;
    }
  }
  if (!live || href.length < 100000) return href;
  let u = blobs.get(href);
  if (!u) {
    try { u = URL.createObjectURL(new Blob([toBytes(href)], { type: href.slice(5, href.indexOf(';')) || 'image/png' })); } catch (e) { return href; }
    blobs.set(href, u);
    if (blobs.size > 40) { const k = blobs.keys().next().value; URL.revokeObjectURL(blobs.get(k)); blobs.delete(k); }
  }
  return u;
};
})();
