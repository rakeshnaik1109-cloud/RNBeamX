/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/gif.js
   Small animated-GIF writer (GIF89a, no libraries):
   • one shared 255-colour palette from a median cut of pixels
     sampled across the animation, with a 32k-entry lookup table;
   • index 255 is transparent: pixels that did not change since the
     previous frame are written as transparent, so mostly static
     figures (only the light moves) stay small;
   • LZW compression as in the GIF specification; loops forever.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX;
const G = RNBX.gif = {};

/* ---- palette: median cut on RGB samples ---- */
G.palette = (samples, n = 255) => {
  // samples: Uint8Array of r,g,b triples
  let boxes = [{ idx: Array.from({ length: samples.length / 3 }, (_, i) => i) }];
  const range = b => { const lo = [255, 255, 255], hi = [0, 0, 0]; b.idx.forEach(i => { for (let c = 0; c < 3; c++) { const v = samples[i * 3 + c]; if (v < lo[c]) lo[c] = v; if (v > hi[c]) hi[c] = v; } }); b.lo = lo; b.hi = hi; b.span = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); b.ch = [0, 1, 2].reduce((m, c) => (hi[c] - lo[c] > hi[m] - lo[m] ? c : m), 0); };
  boxes.forEach(range);
  while (boxes.length < n) {
    boxes.sort((a, b) => b.span * Math.sqrt(b.idx.length) - a.span * Math.sqrt(a.idx.length));
    const b = boxes[0];
    if (b.idx.length < 2 || b.span === 0) break;
    const c = b.ch;
    b.idx.sort((i, j) => samples[i * 3 + c] - samples[j * 3 + c]);
    const mid = b.idx.length >> 1, A = { idx: b.idx.slice(0, mid) }, B = { idx: b.idx.slice(mid) };
    range(A); range(B);
    boxes.splice(0, 1, A, B);
  }
  const pal = boxes.map(b => { const s = [0, 0, 0]; b.idx.forEach(i => { s[0] += samples[i * 3]; s[1] += samples[i * 3 + 1]; s[2] += samples[i * 3 + 2]; }); return s.map(v => Math.round(v / b.idx.length)); });
  while (pal.length < n) pal.push([0, 0, 0]);
  return pal;
};
/* nearest palette entry for every 15-bit colour */
G.lookup = pal => {
  const lut = new Uint8Array(32768);
  for (let k = 0; k < 32768; k++) {
    const r = ((k >> 10) & 31) * 8 + 4, g = ((k >> 5) & 31) * 8 + 4, b = (k & 31) * 8 + 4;
    let best = 0, bd = Infinity;
    for (let i = 0; i < pal.length; i++) { const p = pal[i], d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 3; if (d < bd) { bd = d; best = i; } }
    lut[k] = best;
  }
  return lut;
};

/* growable byte buffer */
G.bytes = () => {
  let buf = new Uint8Array(1 << 16), n = 0;
  return {
    push(...b) { if (n + b.length > buf.length) { const nb = new Uint8Array(Math.max(buf.length * 2, n + b.length)); nb.set(buf); buf = nb; } for (let i = 0; i < b.length; i++) buf[n++] = b[i]; },
    data: () => buf.subarray(0, n),
  };
};

/* ---- LZW (GIF variant) ---- */
function lzw(indices, minCode, out) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1, dict = new Map();
  let bitBuf = 0, bitCnt = 0;
  const block = [];
  const flushByte = b => { block.push(b); if (block.length === 255) { out.push(255, ...block); block.length = 0; } };
  const emit = code => { bitBuf |= code << bitCnt; bitCnt += codeSize; while (bitCnt >= 8) { flushByte(bitBuf & 255); bitBuf >>>= 8; bitCnt -= 8; } };
  out.push(minCode);
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = prefix * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix);
    if (next < 4096) { dict.set(key, next++); if (next > (1 << codeSize) && codeSize < 12) codeSize++; }
    else { emit(clear); dict = new Map(); codeSize = minCode + 1; next = eoi + 1; }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (bitCnt > 0) flushByte(bitBuf & 255);
  if (block.length) out.push(block.length, ...block);
  out.push(0);
}

/* frames: array of Uint8ClampedArray RGBA, all w × h; delay in 1/100 s */
G.encode = (frames, w, h, delayCs, onProgress) => {
  // shared palette from samples of up to 12 frames
  const pick = Math.max(1, Math.floor(frames.length / 12)), samples = [];
  for (let f = 0; f < frames.length; f += pick) { const d = frames[f]; for (let i = 0; i < d.length; i += 4 * 37) samples.push(d[i], d[i + 1], d[i + 2]); }
  const pal = G.palette(new Uint8Array(samples), 255), lut = G.lookup(pal);
  const out = G.bytes();
  const str = s => { for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); };
  const u16 = v => out.push(v & 255, (v >> 8) & 255);
  str('GIF89a'); u16(w); u16(h); out.push(0xF7, 0, 0);                         // global table of 256 colours
  for (let i = 0; i < 256; i++) { const p = pal[i] || [0, 0, 0]; out.push(p[0], p[1], p[2]); }
  out.push(0x21, 0xFF, 11); str('NETSCAPE2.0'); out.push(3, 1, 0, 0, 0);       // loop forever
  let prev = null;
  const N = w * h;
  frames.forEach((d, f) => {
    const idx = new Uint8Array(N);
    for (let p = 0, q = 0; p < N; p++, q += 4) {
      const k = ((d[q] >> 3) << 10) | ((d[q + 1] >> 3) << 5) | (d[q + 2] >> 3);
      const v = lut[k];
      idx[p] = prev && prev[p] === v ? 255 : v;
    }
    // remember the colours actually shown, for the next frame's comparison
    const shown = prev ? Uint8Array.from(idx, (v, p) => (v === 255 ? prev[p] : v)) : idx.slice();
    out.push(0x21, 0xF9, 4, prev ? 0x05 : 0x04, delayCs & 255, (delayCs >> 8) & 255, prev ? 255 : 0, 0);   // keep previous frame; index 255 transparent
    out.push(0x2C); u16(0); u16(0); u16(w); u16(h); out.push(0);
    lzw(idx, 8, out);
    prev = shown;
    if (onProgress) onProgress((f + 1) / frames.length);
  });
  out.push(0x3B);
  return new Blob([out.data()], { type: 'image/gif' });
};
})();
