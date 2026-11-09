/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/sensor.js
   "Show what it records": a camera, beam profiler, photodiode or
   screen draws, beside itself, the light that the tracer delivers
   to it — spot positions, beam size and interference fringes.

   Every beam arriving at the part is a Gaussian spot on a virtual
   sensor plane perpendicular to the mean arrival direction:
     amplitude  a_k = √(2P_k / π w_u w_v) · exp(−(u−u_k)²/w_u² − v²/w_v²)
   with w the 1/e² intensity radius (Gaussian model: from the beam's q
   parameter; otherwise the drawn width scaled to the figure). Beams
   from the same source at the same wavelength add as fields:
     I = Σ a_k² + 2 Σ_{j<k} a_j a_k Re[(ê_j·ê_k*) e^{i(Δk_u u + Δφ)}] · sinc(Δk_u p/2)
   Δk_u comes from the beams' real angles, Δφ from their optical path
   lengths, ê from their polarisation, and the sinc factor is the
   average over one image pixel p (fringes finer than a pixel wash out,
   as on a real camera). Beams from different sources or wavelengths
   add as intensities.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, C = RNBX.complex || null, lib = RNBX.lib, n = v => U.round(v, 3);
const SN = RNBX.sensor = {};
const N = 96;                       // image pixels across
const MAPS = {
  gray: [[0, 0, 0], [255, 255, 255]],
  viridis: [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]],
};
const hex2rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); const v = m ? parseInt(m[1], 16) : 0xff3030; return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
const lerpMap = (stops, t) => {
  t = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t)), f = t - i, a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
};

SN.enabled = o => !!(o && o.props && o.props.showImage);

/* the spots on the virtual sensor (physical mm) */
SN.beams = (hit, doc) => {
  const list = (hit && hit.img) || [];
  if (!list.length) return null;
  const scale = doc.style.scale || 10;
  let P = 0, c = [0, 0], dm = [0, 0];
  list.forEach(b => { P += b.P; c = V.add(c, V.mul(b.o, b.P)); dm = V.add(dm, V.mul(b.d, b.P)); });
  if (!(P > 0)) return null;
  c = V.mul(c, 1 / P); dm = V.norm(dm);
  const t = [-dm[1], dm[0]];
  const bs = list.filter(b => b.P > P * 1e-4).sort((a, b) => b.P - a.P).slice(0, 24).map(b => {
    const lamMm = b.lambda * 1e-6, cos = Math.max(0.2, Math.abs(V.dot(b.d, dm)));
    let w = isFinite(b.w) && b.w > 0 ? b.w : 0.05;
    w = Math.max(w, 2e-3);
    const e = b.E ? b.E : [{ re: 1, im: 0 }, { re: 0, im: 0 }];
    const en = Math.sqrt(e[0].re * e[0].re + e[0].im * e[0].im + e[1].re * e[1].re + e[1].im * e[1].im) || 1;
    return { P: b.P, u: V.dot(V.sub(b.o, c), t) * scale, wu: w / cos, wv: w, ku: 2 * Math.PI / lamMm * V.dot(b.d, t), ph: b.ph || 0,
      e: [{ re: e[0].re / en, im: e[0].im / en }, { re: e[1].re / en, im: e[1].im / en }], key: b.src + '|' + U.round(b.lambda, 4), lambda: b.lambda, d: b.d, color: b.color, w };
  });
  return { bs, P, dm };
};

/* intensity image; returns { I (Float64Array N×N), F (half field, mm), px, period, w } */
SN.image = (B, fov) => {
  const bs = B.bs;
  let F = 0;
  bs.forEach(b => { F = Math.max(F, Math.abs(b.u) + 2.2 * b.wu, 2.2 * b.wv); });
  F = fov > 0 ? fov / 2 : Math.max(F, 0.01);
  const px = 2 * F / N;
  // interfering pairs: same source and wavelength
  const pairs = [];
  for (let j = 0; j < bs.length; j++) for (let k = j + 1; k < bs.length; k++) {
    const a = bs[j], b = bs[k];
    if (a.key !== b.key) continue;
    // ê_j·ê_k*: s components share a direction (normal to the figure plane); p components are tilted by the angle between the beams
    const cosA = V.dot(a.d, b.d);
    const re = (a.e[0].re * b.e[0].re + a.e[0].im * b.e[0].im) * cosA + a.e[1].re * b.e[1].re + a.e[1].im * b.e[1].im;
    const im = (a.e[0].im * b.e[0].re - a.e[0].re * b.e[0].im) * cosA + a.e[1].im * b.e[1].re - a.e[1].re * b.e[1].im;
    const dk = a.ku - b.ku, x = dk * px / 2, sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x;
    if (Math.abs(sinc) < 1e-3 || Math.hypot(re, im) < 1e-6) continue;
    pairs.push({ j, k, re, im, dk, dph: a.ph - b.ph, sinc });
  }
  const I = new Float64Array(N * N), amp = new Float64Array(bs.length);
  for (let iy = 0; iy < N; iy++) {
    const v = F - (iy + 0.5) * px;
    for (let ix = 0; ix < N; ix++) {
      const u = -F + (ix + 0.5) * px;
      let s = 0;
      for (let k = 0; k < bs.length; k++) {
        const b = bs[k];
        const a = Math.sqrt(2 * b.P / (Math.PI * b.wu * b.wv)) * Math.exp(-Math.pow(u - b.u, 2) / (b.wu * b.wu) - v * v / (b.wv * b.wv));
        amp[k] = a; s += a * a;
      }
      for (const q of pairs) {
        const arg = q.dk * u + q.dph;
        s += 2 * amp[q.j] * amp[q.k] * (q.re * Math.cos(arg) - q.im * Math.sin(arg)) * q.sinc;
      }
      I[iy * N + ix] = Math.max(0, s);
    }
  }
  // the most visible fringe period, if any survives the pixel average
  let period = null, best = 0;
  const Ptot = bs.reduce((a, b) => a + b.P, 0);
  for (const q of pairs) {
    const a = bs[q.j], b = bs[q.k], ov = Math.exp(-Math.pow(a.u - b.u, 2) / (a.wu * a.wu + b.wu * b.wu)) * Math.sqrt(2 * a.wv * b.wv / (a.wv * a.wv + b.wv * b.wv));
    const vis = Math.abs(q.sinc) * Math.hypot(q.re, q.im) * Math.sqrt(a.P * b.P) * ov;
    if (vis > 0.05 * Ptot && vis > best && Math.abs(q.dk) > 1e-9 && 2 * Math.PI / Math.abs(q.dk) > 2 * px && 2 * Math.PI / Math.abs(q.dk) < 2 * F) { best = vis; period = 2 * Math.PI / Math.abs(q.dk); }
  }
  return { I, F, px, period, w: bs[0].w };
};

const cache = new Map();
SN.png = (B, p, colHex) => {
  const key = JSON.stringify([p.imgFov || 0, p.imgMap || 'beam', colHex, B.bs.map(b => [U.round(b.P, 6), U.round(b.u, 5), U.round(b.wu, 5), U.round(b.wv, 5), U.round(b.ku, 3), U.round(b.ph % (2 * Math.PI), 3), b.key, b.e.map(z => [U.round(z.re, 4), U.round(z.im, 4)]), b.color])]);
  if (cache.has(key)) return cache.get(key);
  const im = SN.image(B, p.imgFov || 0);
  let mx = 0; for (let i = 0; i < im.I.length; i++) if (im.I[i] > mx) mx = im.I[i];
  const col = hex2rgb(colHex);
  const map = p.imgMap === 'gray' ? MAPS.gray : p.imgMap === 'viridis' ? MAPS.viridis : [[0, 0, 0], col, col.map(c => c + (255 - c) * 0.85)];
  let url = '';
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas'); cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d'), data = ctx.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const t = mx > 0 ? im.I[i] / mx : 0;
      const c = map.length === 3 && p.imgMap !== 'viridis' && p.imgMap !== 'gray' ? (t < 0.75 ? lerpMap([map[0], map[1]], t / 0.75) : lerpMap([map[1], map[2]], (t - 0.75) / 0.25)) : lerpMap(map, t);
      data.data[i * 4] = c[0]; data.data[i * 4 + 1] = c[1]; data.data[i * 4 + 2] = c[2]; data.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    url = cv.toDataURL('image/png');
  }
  const out = { url, F: im.F, period: im.period, w: im.w, max: mx };
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(key, out);
  return out;
};

const fmtLen = mm => mm >= 1 ? U.fmt(mm, mm >= 10 ? 1 : 2) + ' mm' : mm >= 0.001 ? U.fmt(mm * 1000, mm >= 0.01 ? 0 : 1) + ' µm' : U.fmt(mm * 1e6, 0) + ' nm';

/* the image beside the part: { img, caption } in page coordinates */
SN.draw = (o, doc, trace, I) => {
  const p = o.props, s = Math.max(3, p.imgSize || 14), gap = 2;
  const bb = lib.worldBox(o), side = p.imgSide || 'right';
  const cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  let x, y;
  if (side === 'left') { x = bb[0] - gap - s; y = cy - s / 2; }
  else if (side === 'above') { x = cx - s / 2; y = bb[1] - gap - s - (doc.style.showLabels ? 0 : 0); }
  else if (side === 'below') { x = cx - s / 2; y = bb[3] + gap; }
  else { x = bb[2] + gap; y = cy - s / 2; }
  // keep clear of the part's own label: move further out on the chosen side
  if (o.label && o.label.show && doc.style.showLabels && o.label.text && RNBX.labels) {
    const sz = RNBX.labels.size(o, doc), lx = o.x + (o.label.dx || 0), ly = o.y + (o.label.dy || 0);
    const L = [lx - sz.w / 2 - 0.5, ly - sz.h / 2 - 0.5, lx + sz.w / 2 + 0.5, ly + sz.h / 2 + 0.5];
    if (L[0] < x + s && L[2] > x && L[1] < y + s && L[3] > y) {
      if (side === 'below') y = L[3]; else if (side === 'above') y = L[1] - s; else if (side === 'left') x = L[0] - s; else x = L[2];
    }
  }
  const dark = RNBX.isDarkPage && RNBX.isDarkPage(doc.page);
  const frame = dark ? '#c9d1dc' : '#3a3f46', lw = n(Math.max(0.1, U.pt2mm(doc.style.lineWidthPt || 0.5) * 0.6));
  const B = SN.beams(trace.hits[o.id], doc);
  const fs = U.pt2mm(Math.max(4, (doc.style.fontSizePt || 7) * 0.8));
  const tag = I ? ` data-id="${o.id}"` : '';
  if (!B) {
    return { img: `<g${tag}><rect x="${n(x)}" y="${n(y)}" width="${n(s)}" height="${n(s)}" fill="#000000" stroke="${frame}" stroke-width="${lw}"/></g>`,
      caption: `<text x="${n(x + s / 2)}" y="${n(y + s + fs * 1.1)}" text-anchor="middle" font-family="${U.esc(doc.style.font)}" font-size="${n(fs)}" fill="${frame}">no light</text>` };
  }
  const r = SN.png(B, p, lib.colorOf(doc, B.bs[0].lambda, B.bs[0].color));
  const img = `<g${tag}><rect x="${n(x)}" y="${n(y)}" width="${n(s)}" height="${n(s)}" fill="#000000"/>` +
    (r.url ? `<image x="${n(x)}" y="${n(y)}" width="${n(s)}" height="${n(s)}" preserveAspectRatio="none" href="${r.url}" xlink:href="${r.url}"/>` : '') +
    `<rect x="${n(x)}" y="${n(y)}" width="${n(s)}" height="${n(s)}" fill="none" stroke="${frame}" stroke-width="${lw}"/></g>`;
  const bits = [fmtLen(2 * r.F) + ' field'];
  if (r.period) bits.push('fringes ' + fmtLen(r.period));
  else if (B.bs.length === 1) bits.push('w = ' + fmtLen(r.w));
  const caption = `<text x="${n(x + s / 2)}" y="${n(y + s + fs * 1.1)}" text-anchor="middle" font-family="${U.esc(doc.style.font)}" font-size="${n(fs)}" fill="${frame}">${bits.join(' · ')}</text>`;
  return { img, caption, info: { F: r.F, period: r.period, w: r.w, beams: B.bs.length, url: r.url } };
};

})();
