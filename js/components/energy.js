/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/energy.js
   Energy-level and band diagrams for figures: the Jablonski
   diagram (absorption, vibrational relaxation, internal
   conversion, fluorescence, intersystem crossing,
   phosphorescence), Rayleigh / Raman / IR / fluorescence level
   diagram, a general level diagram written as a short text
   (with laser and upconversion presets), and semiconductor band
   diagrams (bulk, p–n junction, Schottky contact with plasmonic
   hot electrons, quantum well, E–k, photocatalysis).
   Figure graphics: they do not take part in the ray tracing.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Energy & band diagrams';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);
const reg = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

/* ---------- drawing helpers ---------- */
const mk = s => (RNBX.text ? s : s);
const T = (S, x, y, str, size, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(size)}" fill="${o.color || S.ink}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central" ${o.bold ? 'font-weight="700"' : ''} ${o.italic ? 'font-style="italic"' : ''} ${o.rot ? `transform="rotate(${n(o.rot)} ${n(x)} ${n(y)})"` : ''}>${RNBX.text ? RNBX.text.markup(mk(String(str)), size) : U.esc(str)}</text>`;
const head = (x, y, a, size, c) => {
  const w = size * 0.45, p1 = [x - Math.cos(a) * size + Math.sin(a) * w, y - Math.sin(a) * size - Math.cos(a) * w], p2 = [x - Math.cos(a) * size - Math.sin(a) * w, y - Math.sin(a) * size + Math.cos(a) * w];
  return `<path d="M ${n(x)} ${n(y)} L ${n(p1[0])} ${n(p1[1])} L ${n(p2[0])} ${n(p2[1])} Z" fill="${c}"/>`;
};
/* straight arrow; dash for energy transfer */
const arrow = (x1, y1, x2, y2, c, w, hs, dash) => {
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1), k = Math.max(0, L - hs * 0.8) / (L || 1);
  return `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x1 + (x2 - x1) * k)}" y2="${n(y1 + (y2 - y1) * k)}" stroke="${c}" stroke-width="${n(w)}" stroke-linecap="round" ${dash ? `stroke-dasharray="${n(w * 3)} ${n(w * 2.2)}"` : ''}/>` + head(x2, y2, a, hs, c);
};
/* wavy arrow (non-radiative steps, photons) */
const wavy = (x1, y1, x2, y2, c, w, hs, amp = 0.45, per = 1.1) => {
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / (L || 1), uy = (y2 - y1) / (L || 1), Lw = Math.max(0.1, L - hs * 0.9), N = Math.max(12, Math.round(Lw / per * 10));
  let d = '';
  for (let i = 0; i <= N; i++) { const t = i / N * Lw, s = Math.sin(t / per * 2 * Math.PI) * amp * Math.min(1, t / per, (Lw - t) / per + 0.3); d += (i ? ' L ' : 'M ') + n(x1 + ux * t - uy * s) + ' ' + n(y1 + uy * t + ux * s); }
  return `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>` + head(x2, y2, Math.atan2(uy, ux), hs, c);
};
const hline = (x1, x2, y, c, w, dash) => `<line x1="${n(x1)}" y1="${n(y)}" x2="${n(x2)}" y2="${n(y)}" stroke="${c}" stroke-width="${n(w)}" stroke-linecap="round" ${dash ? `stroke-dasharray="${n(w * 3)} ${n(w * 2)}"` : ''}/>`;
const ink = S => (RNBX.isDarkPage && RNBX.isDarkPage(S.doc.page) ? '#e8ecf2' : S.ink);
const fsOf = p => U.pt2mm(p.size || 6);
const SIZE = { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 20, step: 0.5 };
const WH = [{ key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 15, max: 400, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 10, max: 300, step: 0.5 }];
const box = p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2];
/* colour of a transition from a wavelength in its label (e.g. "540 nm"), else the fallback */
const lamColor = (label, fb) => { const m = /(\d{3,4}(?:\.\d+)?)\s*nm/.exec(label || ''); if (!m) return fb; const l = +m[1]; return l < 380 ? '#7a3cc8' : l > 720 ? '#8b1a1a' : U.wavelengthColor(l); };

/* ================= Jablonski diagram ================= */
reg({
  type: 'jablonski', name: 'Jablonski diagram', keywords: 'jablonski energy level diagram fluorescence phosphorescence intersystem crossing internal conversion vibrational relaxation singlet triplet photophysics tadf',
  hint: 'Singlet states on the left, triplet on the right. Switch processes on and off; colours and time scales are optional.',
  defaults: { w: 70, h: 46, size: 6, nvib: 4, s2: true, abs: true, vr: true, ic: true, fl: true, nr: false, isc: true, ph: true, risc: false, times: false, absC: '#2f6fd6', flC: '#1f9d3a', phC: '#d23c2a', nrC: '#6b7280' },
  params: [...WH, SIZE, { key: 'nvib', label: 'Vibrational levels per state', type: 'number', min: 0, max: 8, step: 1 },
    { key: 's2', label: 'Show S₂ (and internal conversion)', type: 'bool' }, { key: 'abs', label: 'Absorption', type: 'bool' }, { key: 'vr', label: 'Vibrational relaxation', type: 'bool' },
    { key: 'ic', label: 'Internal conversion', type: 'bool', show: p => p.s2 }, { key: 'fl', label: 'Fluorescence', type: 'bool' }, { key: 'nr', label: 'Non-radiative decay to S₀', type: 'bool' },
    { key: 'isc', label: 'Intersystem crossing', type: 'bool' }, { key: 'ph', label: 'Phosphorescence', type: 'bool' }, { key: 'risc', label: 'Reverse ISC (TADF)', type: 'bool' },
    { key: 'times', label: 'Typical time scales', type: 'bool' },
    { key: 'absC', label: 'Absorption colour', type: 'color' }, { key: 'flC', label: 'Fluorescence colour', type: 'color' }, { key: 'phC', label: 'Phosphorescence colour', type: 'color' }, { key: 'nrC', label: 'Non-radiative colour', type: 'color' }],
  variants: [{ name: 'Jablonski diagram (TADF)', props: { risc: true, s2: false, ph: false, times: false }, keywords: 'tadf thermally activated delayed fluorescence reverse intersystem crossing' }],
  bbox: box,
  draw(p, S) {
    const W = p.w, Hh = p.h, fs = fsOf(p), c = ink(S), lw = Math.max(S.lw, 0.18), aw = lw * 1.5, hs = Math.max(0.9, fs * 0.55);
    const lm = fs * 2.6, y0 = Hh / 2 - fs * (p.times ? 0.6 : 0.4) - 0.8, top = -Hh / 2 + fs * 1.2, Ue = y0 - top;
    const Y = e => y0 - e * Ue, dv = Ue * 0.04, nv = Math.max(0, Math.round(p.nvib));
    const xs0 = -W / 2 + lm, wsing = (W - lm) * 0.56, xs1 = xs0 + wsing, xt0 = xs1 + (W - lm) * 0.1, xt1 = W / 2 - 0.5;
    const E = { S0: 0, S1: 0.6, S2: 0.9, T1: 0.44 };
    let s = '';
    const level = (e, x1, x2, name) => {
      let q = hline(x1, x2, Y(e), c, lw * 2.2);
      for (let v = 1; v <= nv; v++) q += hline(x1, x2, Y(e) - v * dv * (1 - v * 0.06), c, lw * 0.7);
      return q + T(S, x1 - fs * 0.35, Y(e), name, fs * 1.15, { anchor: 'end', color: c });
    };
    s += level(E.S0, xs0, xt1, 'S_{0}') + level(E.S1, xs0, xs1, 'S_{1}') + level(E.T1, xt0, xt1, '');
    s += T(S, xt1, Y(E.T1) + fs * 0.75, 'T_{1}', fs * 1.15, { anchor: 'end', color: c });
    if (p.s2) s += level(E.S2, xs0, xs1, 'S_{2}');
    const topv = e => Y(e) - nv * dv * (1 - nv * 0.06), X = f => xs0 + f * wsing, XT = f => xt0 + f * (xt1 - xt0);
    const lab = (x, y, t, time, col, anchor = 'middle') => T(S, x, y, t, fs, { color: col, anchor, bold: true });
    if (p.times) {
      const rows = [['Abs', '10^{−15} s', p.abs, p.absC], ['VR, IC', '10^{−12}–10^{−10} s', p.vr || p.ic, p.nrC], ['F', '10^{−9}–10^{−7} s', p.fl, p.flC], ['ISC', '10^{−10}–10^{−8} s', p.isc, p.nrC], ['P', '10^{−6}–10^{2} s', p.ph, p.phC]].filter(r => r[2]);
      const tf = fs * 0.8, x = xt0;
      s += T(S, x, top - fs * 0.2, 'Typical time scales', tf, { anchor: 'start', color: c, bold: true });
      rows.forEach((r, i) => { s += T(S, x, top + (i + 1) * tf * 1.35, r[0], tf, { anchor: 'start', color: r[3], bold: true }) + T(S, x + tf * 3.6, top + (i + 1) * tf * 1.35, r[1], tf, { anchor: 'start', color: c }); });
    }
    if (p.abs) {
      s += arrow(X(0.08), Y(0), X(0.08), topv(E.S1), p.absC, aw, hs);
      if (p.s2) s += arrow(X(0.17), Y(0), X(0.17), topv(E.S2), p.absC, aw, hs);
      s += lab(X(0.125), Y(0) + fs * 0.8, 'Abs', '10^{−15} s', p.absC);
    }
    if (p.vr) {
      s += wavy(X(0.24), topv(E.S1), X(0.24), Y(E.S1), p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.8);
      if (p.s2) s += wavy(X(0.3), topv(E.S2), X(0.3), Y(E.S2), p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.8);
      s += lab(X(0.24) + fs * 0.45, (topv(E.S1) + Y(E.S1)) / 2, 'VR', '', p.nrC, 'start');
    }
    if (p.s2 && p.ic) { s += wavy(X(0.38), Y(E.S2), X(0.38), topv(E.S1), p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.8); s += lab(X(0.38) + fs * 0.5, (Y(E.S2) + topv(E.S1)) / 2, 'IC', '10^{−12} s', p.nrC, 'start'); }
    if (p.fl) {
      s += arrow(X(0.5), Y(E.S1), X(0.5), Y(0), p.flC, aw, hs) + arrow(X(0.6), Y(E.S1), X(0.6), Y(0) - 2 * dv, p.flC, aw, hs);
      s += lab(X(0.55), Y(E.S1 * 0.42), 'F', '10^{−9} s', p.flC);
    }
    if (p.nr) { s += wavy(X(0.78), Y(E.S1), X(0.78), Y(0) - dv, p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.8); s += lab(X(0.78) + fs * 0.5, Y(E.S1 * 0.5), 'nr', '', p.nrC, 'start'); }
    if (p.isc) {
      s += wavy(X(p.risc ? 0.7 : 0.88), Y(E.S1), XT(p.risc ? 0.04 : 0.12), topv(E.T1), p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.8);
      if (p.vr) s += wavy(XT(0.22), topv(E.T1), XT(0.22), Y(E.T1), p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.8);
      s += lab((X(0.88) + XT(0.12)) / 2 + fs * 0.3, (Y(E.S1) + topv(E.T1)) / 2 - fs * 1.1, 'ISC', '10^{−8} s', p.nrC);
    }
    if (p.risc) {
      // reverse ISC: dashed, parallel to the ISC arrow and below it, back up to S1
      const ax = XT(0.5), ay = Y(E.T1), bx = X(1), by = Y(E.S1);
      s += arrow(ax, ay, bx, by, '#b8860b', aw, hs, true) + lab((ax + bx) / 2 + fs * 0.8, (ay + by) / 2 + fs * 0.8, 'RISC', '', '#b8860b', 'start');
    }
    if (p.ph) { s += arrow(XT(0.55), Y(E.T1), XT(0.55), Y(0) - dv, p.phC, aw, hs); s += lab(XT(0.55) + fs * 0.5, Y(E.T1 * 0.45), 'P', '10^{−3} s', p.phC, 'start'); }
    return s;
  },
});

/* ================= Rayleigh, Raman, IR and fluorescence ================= */
const RM = [['ir', 'IR absorption'], ['rayleigh', 'Rayleigh'], ['stokes', 'Stokes Raman'], ['anti', 'anti-Stokes Raman'], ['resonance', 'Resonance Raman'], ['fluor', 'Fluorescence']];
reg({
  type: 'ramanlevels', name: 'Raman / Rayleigh / IR level diagram', keywords: 'raman rayleigh stokes anti-stokes infrared ir absorption virtual state resonance raman fluorescence energy level diagram scattering sers',
  defaults: { w: 80, h: 38, size: 6, ir: true, rayleigh: true, stokes: true, anti: true, resonance: false, fluor: false, energies: true, exC: '#1f9d3a', stC: '#d62728', asC: '#1f6fd6', irC: '#8c3b1a', flC: '#e07b00' },
  params: [...WH, SIZE, ...RM.map(([k, l]) => ({ key: k, label: l, type: 'bool' })), { key: 'energies', label: 'Photon energies (hν₀, hν₀ ± hν_m)', type: 'bool' },
    { key: 'exC', label: 'Laser / Rayleigh colour', type: 'color' }, { key: 'stC', label: 'Stokes colour', type: 'color' }, { key: 'asC', label: 'anti-Stokes colour', type: 'color' }, { key: 'irC', label: 'IR colour', type: 'color' }, { key: 'flC', label: 'Fluorescence colour', type: 'color', show: p => p.fluor }],
  variants: [{ name: 'Raman vs fluorescence diagram', props: { ir: false, anti: false, resonance: true, fluor: true } }],
  bbox: box,
  draw(p, S) {
    const on = RM.filter(([k]) => p[k]), fs = fsOf(p), c = ink(S), lw = Math.max(S.lw, 0.18), aw = lw * 1.6, hs = Math.max(0.9, fs * 0.55);
    if (!on.length) return T(S, 0, 0, 'Switch on a process', fs, { color: '#888' });
    const elec = p.resonance || p.fluor, lm = fs * 4.6, W = p.w, y0 = p.h / 2 - fs * 1.9, top = -p.h / 2 + fs * 0.8, Ue = y0 - top;
    const Y = e => y0 - e * Ue, v1 = 0.13, vir = elec ? 0.55 : 0.78, S1 = 0.88, cw = (W - lm) / on.length, x0 = -W / 2 + lm;
    let s = '';
    // ground-state vibrational levels across all columns, electronic state on top when needed
    s += hline(x0, W / 2, Y(0), c, lw * 2) + hline(x0, W / 2, Y(v1), c, lw * 0.9);
    s += T(S, x0 - fs * 0.4, Y(0), 'v = 0', fs, { anchor: 'end', color: c }) + T(S, x0 - fs * 0.4, Y(v1), 'v = 1', fs, { anchor: 'end', color: c });
    if (elec) { s += hline(x0, W / 2, Y(S1), c, lw * 2) + hline(x0, W / 2, Y(S1 + 0.07), c, lw * 0.7); s += T(S, x0 - fs * 0.4, Y(S1 + 0.03), 'S_{1}', fs * 1.1, { anchor: 'end', color: c }); }
    s += T(S, x0 - fs * 0.4, Y(vir), 'virtual', fs * 0.85, { anchor: 'end', color: c, italic: true });
    on.forEach(([k, name], i) => {
      const cx = x0 + (i + 0.5) * cw, a = cx - cw * 0.14, b = cx + cw * 0.14, virt = () => hline(cx - cw * 0.34, cx + cw * 0.34, Y(vir), c, lw * 0.8, true);
      const en = (x, y, t, col, anchor) => p.energies ? T(S, x, y, t, fs * 0.82, { color: col, anchor }) : '';
      if (k === 'ir') { s += arrow(cx, Y(0), cx, Y(v1), p.irC, aw, hs * 0.8); s += en(cx + fs * 0.4, Y(v1 / 2), 'hν_{m}', p.irC, 'start'); }
      if (k === 'rayleigh') { s += virt() + arrow(a, Y(0), a, Y(vir), p.exC, aw, hs) + arrow(b, Y(vir), b, Y(0), p.exC, aw, hs); s += en(a - fs * 0.3, Y(vir / 2), 'hν_{0}', p.exC, 'end') + en(b + fs * 0.3, Y(vir / 2), 'hν_{0}', p.exC, 'start'); }
      if (k === 'stokes') { s += virt() + arrow(a, Y(0), a, Y(vir), p.exC, aw, hs) + arrow(b, Y(vir), b, Y(v1), p.stC, aw, hs); s += en(b + fs * 0.3, Y((vir + v1) / 2), 'h(ν_{0}−ν_{m})', p.stC, 'start'); }
      if (k === 'anti') { s += virt() + arrow(a, Y(v1), a, Y(vir + v1), p.exC, aw, hs) + hline(cx - cw * 0.34, cx + cw * 0.34, Y(vir + v1), c, lw * 0.8, true) + arrow(b, Y(vir + v1), b, Y(0), p.asC, aw, hs); s += en(b + fs * 0.3, Y((vir + v1) / 2), 'h(ν_{0}+ν_{m})', p.asC, 'start'); }
      if (k === 'resonance') { s += arrow(a, Y(0), a, Y(S1 + 0.035), p.exC, aw, hs) + arrow(b, Y(S1 + 0.035), b, Y(v1), p.stC, aw, hs); }
      if (k === 'fluor') { s += arrow(a, Y(0), a, Y(S1 + 0.07), p.exC, aw, hs) + wavy(cx, Y(S1 + 0.07), cx, Y(S1), c, aw * 0.7, hs * 0.7, 0.3, 0.7) + arrow(b, Y(S1), b, Y(v1 * 0.5), p.flC, aw * 1.2, hs); }
      const words = name.split(' '), fit = t => Math.min(fs * 0.9, cw * 0.92 / (t.length * 0.56));
      if (words.length > 1 && name.length * fs * 0.5 > cw) { const l1 = words.slice(0, -1).join(' '), l2 = words[words.length - 1], f = Math.min(fit(l1), fit(l2)); s += T(S, cx, p.h / 2 - fs * 1.35, l1, f, { color: c }) + T(S, cx, p.h / 2 - fs * 0.5, l2, f, { color: c }); }
      else s += T(S, cx, p.h / 2 - fs * 0.8, name, fit(name), { color: c });
    });
    return s;
  },
});

/* ================= general energy-level diagram (written as text) ================= */
/* lines:  level <id> <energy> [col=<n>] <label…>
           up|down|emit <from> <to> [#colour] <label…>     radiative (colour from a wavelength in the label)
           wavy <from> <to> [#colour] <label…>             non-radiative
           transfer <from> <to> [#colour] <label…>         energy transfer (dashed)                         */
const parseLevels = spec => {
  const L = {}, tr = [];
  String(spec || '').split('\n').forEach(raw => {
    const line = raw.trim(); if (!line || line[0] === '#') return;
    const t = line.split(/\s+/), kw = t[0].toLowerCase();
    if (kw === 'level' && t.length >= 3 && isFinite(+t[2])) {
      let col = 0, rest = t.slice(3); if (rest[0] && /^col=\d+$/.test(rest[0])) { col = +rest[0].slice(4); rest = rest.slice(1); }
      L[t[1]] = { id: t[1], e: +t[2], col, label: rest.join(' ') };
    } else if (['up', 'down', 'emit', 'abs', 'wavy', 'transfer', 'et'].includes(kw) && t.length >= 3) {
      let rest = t.slice(3), color = ''; if (rest[0] && /^#[0-9a-f]{3,8}$/i.test(rest[0])) { color = rest[0]; rest = rest.slice(1); }
      tr.push({ kind: kw === 'et' ? 'transfer' : kw === 'wavy' ? 'wavy' : kw === 'transfer' ? 'transfer' : 'rad', a: t[1], b: t[2], color, label: rest.join(' ') });
    }
  });
  return { L, tr: tr.filter(x => L[x.a] && L[x.b]) };
};
RNBX.parseLevels = parseLevels;
const LV = {
  two: 'level g 0 |g⟩\nlevel e 1 |e⟩\nup g e absorption\ndown e g emission',
  ruby: 'level E1 0 E_{1} (ground)\nlevel E3 2.25 E_{3} (pump band)\nlevel E2 1.79 E_{2} (upper laser level)\nup E1 E3 #2f6fd6 pump\nwavy E3 E2 fast decay\ndown E2 E1 694 nm laser',
  ndyag: 'level E0 0 ^{4}I_{9/2}\nlevel E1 0.25 ^{4}I_{11/2}\nlevel E2 1.43 ^{4}F_{3/2}\nlevel E3 1.53 pump band\nup E0 E3 808 nm pump\nwavy E3 E2 \nemit E2 E1 1064 nm laser\nwavy E1 E0 ',
  upconv: 'level Y0 0 col=0 ^{2}F_{7/2}\nlevel Y1 1.27 col=0 ^{2}F_{5/2}\nlevel R0 0 col=1 ^{4}I_{15/2}\nlevel R1 1.27 col=1 ^{4}I_{11/2}\nlevel R3 1.89 col=1 ^{4}F_{9/2}\nlevel R4 2.28 col=1 ^{4}S_{3/2}\nlevel R5 2.53 col=1 ^{4}F_{7/2}\nup Y0 Y1 980 nm\ntransfer Y1 R1 ET\ntransfer R1 R5 ETU\nwavy R5 R4 \nemit R4 R0 540 nm\nemit R3 R0 655 nm',
};
reg({
  type: 'energylevels', name: 'Energy-level diagram (from text)', keywords: 'energy level diagram laser three level four level ruby nd yag upconversion lanthanide erbium ytterbium transition pump emission energy transfer',
  hint: 'One line per level or transition. level <id> <energy> [col=1] <label>;  up / down / emit <from> <to> [#colour] <label>;  wavy <from> <to> (non-radiative);  transfer <from> <to> (energy transfer). A wavelength in a label (e.g. 540 nm) colours the arrow.',
  defaults: { w: 60, h: 42, size: 6, spec: LV.ruby, axis: false, unit: 'eV', lineC: '', radC: '#2f6fd6', nrC: '#6b7280', etC: '#b8860b' },
  params: [...WH, SIZE, { key: 'spec', label: 'Levels and transitions', type: 'textarea' },
    { key: 'axis', label: 'Energy axis', type: 'bool' }, { key: 'unit', label: 'Axis unit', type: 'text', show: p => p.axis },
    { key: 'lineC', label: 'Level colour', type: 'color', allowEmpty: true }, { key: 'radC', label: 'Radiative (default)', type: 'color' }, { key: 'nrC', label: 'Non-radiative', type: 'color' }, { key: 'etC', label: 'Energy transfer', type: 'color' }],
  variants: [
    { name: 'Two-level system', props: { spec: LV.two, w: 40, h: 30 } },
    { name: 'Four-level laser (Nd:YAG)', props: { spec: LV.ndyag, axis: true } },
    { name: 'Upconversion (Yb³⁺ → Er³⁺)', props: { spec: LV.upconv, w: 80, h: 48, axis: true }, keywords: 'upconversion nanoparticles ucnp lanthanide yb er energy transfer etu' },
  ],
  bbox: box,
  draw(p, S) {
    const { L, tr } = parseLevels(p.spec), lv = Object.values(L), fs = fsOf(p), c = p.lineC || ink(S), lw = Math.max(S.lw, 0.18), aw = lw * 1.5, hs = Math.max(0.9, fs * 0.55);
    if (!lv.length) return T(S, 0, 0, 'Write levels in the inspector', fs, { color: '#888' });
    const emin = Math.min(...lv.map(l => l.e)), emax = Math.max(...lv.map(l => l.e)), span = (emax - emin) || 1, ncol = Math.max(...lv.map(l => l.col)) + 1;
    const ax = p.axis ? fs * 3.6 : 0.5, W = p.w, x0 = -W / 2 + ax, y0 = p.h / 2 - fs * 0.6, top = -p.h / 2 + fs * 0.9, Y = e => y0 - (e - emin) / span * (y0 - top);
    const cw = (W - ax) / ncol, lineW = cw * 0.55, X0 = col => x0 + col * cw + cw * 0.04;
    let s = '';
    if (p.axis) {
      const step = (() => { const e = Math.pow(10, Math.floor(Math.log10(span / 4))), f = span / 4 / e; return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * e; })();
      s += arrow(x0 - fs * 1.4, y0, x0 - fs * 1.4, top - fs * 0.5, c, lw, hs * 0.8);
      for (let v = Math.ceil(emin / step) * step; v <= emax + step * 1e-6; v += step) s += hline(x0 - fs * 1.4, x0 - fs * 1.1, Y(v), c, lw) + T(S, x0 - fs * 1.55, Y(v), U.fmt(v, 3), fs * 0.8, { anchor: 'end', color: c });
      s += T(S, x0 - fs * 1.4, top - fs * 1.1, 'E (' + p.unit + ')', fs * 0.85, { color: c });
    }
    lv.forEach(l => { const xa = X0(l.col); s += hline(xa, xa + lineW, Y(l.e), c, lw * 2) + (l.label ? T(S, xa + lineW + fs * 0.35, Y(l.e), l.label, fs * 0.9, { anchor: 'start', color: c }) : ''); });
    // arrows: spread across each column's line in the order written
    const slots = {}; tr.forEach(t => { if (L[t.a].col === L[t.b].col) (slots[L[t.a].col] = slots[L[t.a].col] || []).push(t); });
    Object.entries(slots).forEach(([col, list]) => list.forEach((t, i) => { t.x = X0(+col) + lineW * (i + 1) / (list.length + 1); }));
    tr.forEach(t => {
      const A = L[t.a], B = L[t.b], ya = Y(A.e), yb = Y(B.e);
      if (t.kind === 'transfer' && A.col !== B.col) {
        const xa = X0(A.col) + lineW + (A.label ? fs * 0.35 + A.label.replace(/[_^{}]/g, '').length * fs * 0.42 : 0) + fs * 0.3, xb = X0(B.col), col = t.color || p.etC, mx = (xa + xb) / 2, my = Math.min(ya, yb) - fs * 2.2;
        s += `<path d="M ${n(xa)} ${n(ya)} Q ${n(mx)} ${n(my)} ${n(xb - hs * 0.6)} ${n(yb)}" fill="none" stroke="${col}" stroke-width="${n(aw)}" stroke-dasharray="${n(aw * 3)} ${n(aw * 2)}"/>` + head(xb, yb, Math.atan2(yb - my, xb - mx), hs, col);
        if (t.label) s += T(S, mx, my - fs * 0.2, t.label, fs * 0.85, { color: col });
        return;
      }
      const x = t.x != null ? t.x : X0(A.col) + lineW / 2;
      if (t.kind === 'wavy') s += wavy(x, ya, x, yb, t.color || p.nrC, aw * 0.8, hs * 0.8, 0.35, 0.85);
      else s += arrow(x, ya, x, yb, t.color || (t.kind === 'transfer' ? p.etC : lamColor(t.label, p.radC)), aw * (t.kind === 'transfer' ? 1 : 1.2), hs, t.kind === 'transfer');
      if (t.label) s += T(S, x - fs * 0.55, (ya + yb) / 2, t.label, fs * 0.82, { rot: -90, color: t.color || (t.kind === 'wavy' ? p.nrC : t.kind === 'transfer' ? p.etC : lamColor(t.label, p.radC)) });
    });
    return s;
  },
});

/* ================= semiconductor band diagrams ================= */
const BANDS = [['bulk', 'Bulk semiconductor (doping, absorption, emission)'], ['pn', 'p–n junction'], ['schottky', 'Metal–semiconductor (Schottky) contact'], ['qw', 'Quantum well'], ['ek', 'E–k diagram (direct / indirect gap)'], ['photocat', 'Photocatalysis (band edges vs redox levels)']];
reg({
  type: 'bands', name: 'Semiconductor band diagram', keywords: 'band diagram semiconductor conduction valence band gap fermi level pn junction depletion schottky barrier hot electron plasmon quantum well e-k direct indirect phonon photocatalysis water splitting redox',
  defaults: { mode: 'bulk', w: 64, h: 40, size: 6, doping: 'n', bias: 0, hot: false, gap: 'direct', carriers: true, light: true, cbC: '#2f6fd6', vbC: '#c0392b', fillC: '#dce8f7', vfillC: '#f4dcd8', metalC: '#e3c76a' },
  params: [{ key: 'mode', label: 'Diagram', type: 'select', options: BANDS }, ...WH, SIZE,
    { key: 'doping', label: 'Doping', type: 'select', options: [['i', 'Intrinsic'], ['n', 'n-type (donors)'], ['p', 'p-type (acceptors)']], show: p => p.mode === 'bulk' },
    { key: 'bias', label: 'Bias (forward +, reverse −)', type: 'range', min: -1, max: 0.8, step: 0.05, show: p => p.mode === 'pn' },
    { key: 'hot', label: 'Plasmonic hot-electron injection', type: 'bool', show: p => p.mode === 'schottky' },
    { key: 'gap', label: 'Gap', type: 'select', options: [['direct', 'Direct (GaAs)'], ['indirect', 'Indirect (Si)']], show: p => p.mode === 'ek' },
    { key: 'carriers', label: 'Electrons and holes', type: 'bool' }, { key: 'light', label: 'Light (absorption / emission)', type: 'bool' },
    { key: 'cbC', label: 'Conduction band', type: 'color' }, { key: 'vbC', label: 'Valence band', type: 'color' }, { key: 'fillC', label: 'Conduction-band fill', type: 'color', allowEmpty: true }, { key: 'vfillC', label: 'Valence-band fill', type: 'color', allowEmpty: true },
    { key: 'metalC', label: 'Metal', type: 'color', show: p => p.mode === 'schottky' }],
  variants: [
    { name: 'p–n junction band diagram', props: { mode: 'pn' } },
    { name: 'Schottky contact with plasmonic hot electrons', props: { mode: 'schottky', hot: true }, keywords: 'hot electron injection plasmon schottky barrier metal semiconductor photodetection' },
    { name: 'Quantum well band diagram', props: { mode: 'qw' } },
    { name: 'E–k diagram (indirect gap)', props: { mode: 'ek', gap: 'indirect', w: 50, h: 40 } },
    { name: 'Photocatalytic water splitting (band edges)', props: { mode: 'photocat', w: 64, h: 44 } },
  ],
  bbox: box,
  draw(p, S) {
    const fs = fsOf(p), c = ink(S), lw = Math.max(S.lw, 0.18), aw = lw * 1.5, hs = Math.max(0.9, fs * 0.55), W = p.w, Hh = p.h, er = fs * 0.32;
    const e = (x, y) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(er)}" fill="${p.cbC}" stroke="${U.shadeRgb(p.cbC, 0.6)}" stroke-width="${n(lw * 0.5)}"/>`;
    const h = (x, y) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(er)}" fill="#ffffff" stroke="${p.vbC}" stroke-width="${n(lw * 1.1)}"/>`;
    const photonIn = (x, y, ang = -0.6, L = fs * 3.2) => wavy(x - Math.cos(ang) * L, y - Math.sin(ang) * L, x, y, '#d4a017', aw, hs, 0.4, 0.8) + T(S, x - Math.cos(ang) * L - fs * 0.3, y - Math.sin(ang) * L - fs * 0.5, 'hν', fs, { italic: true, color: '#b8860b', anchor: 'end' });
    const photonOut = (x, y, ang = -0.4, L = fs * 3.2) => wavy(x, y, x + Math.cos(ang) * L, y + Math.sin(ang) * L, '#d4a017', aw, hs, 0.4, 0.8) + T(S, x + Math.cos(ang) * L + fs * 0.2, y + Math.sin(ang) * L - fs * 0.5, 'hν', fs, { italic: true, color: '#b8860b', anchor: 'start' });
    const lab = (x, y, t, o = {}) => T(S, x, y, t, o.size || fs, Object.assign({ color: c }, o));
    /* band edges from a profile: ec(x) for x in [xa, xb] */
    const edges = (xa, xb, ec, gapf, N = 60) => {
      let dc = '', dv = '';
      for (let i = 0; i <= N; i++) { const x = xa + (xb - xa) * i / N, y = ec(x); dc += (i ? ' L ' : 'M ') + n(x) + ' ' + n(y); dv += (i ? ' L ' : 'M ') + n(x) + ' ' + n(y + gapf); }
      let q = '';
      if (p.fillC) q += `<path d="${dc} L ${n(xb)} ${n(-Hh / 2)} L ${n(xa)} ${n(-Hh / 2)} Z" fill="${p.fillC}" opacity="0.8"/>`;
      if (p.vfillC) q += `<path d="${dv} L ${n(xb)} ${n(Hh / 2)} L ${n(xa)} ${n(Hh / 2)} Z" fill="${p.vfillC}" opacity="0.9"/>`;
      return q + `<path d="${dc}" fill="none" stroke="${p.cbC}" stroke-width="${n(lw * 2)}"/><path d="${dv}" fill="none" stroke="${p.vbC}" stroke-width="${n(lw * 2)}"/>`;
    };
    const vgap = (x, y1, y2, t) => arrow(x, y2, x, y1 + 0.1, c, lw, hs * 0.7) + arrow(x, y1, x, y2 - 0.1, c, lw, hs * 0.7) + lab(x + fs * 0.4, (y1 + y2) / 2, t, { anchor: 'start' });
    let s = '';
    if (p.mode === 'bulk') {
      const yc = -Hh * 0.18, gp = Hh * 0.4, yv = yc + gp, xa = -W / 2 + fs * 2.4, xb = W / 2;
      s += edges(xa, xb, () => yc, gp);
      const ef = p.doping === 'n' ? yc + gp * 0.18 : p.doping === 'p' ? yv - gp * 0.18 : yc + gp / 2;
      s += hline(xa, xb, ef, c, lw, true) + lab(xa - fs * 0.3, ef, 'E_{F}', { anchor: 'end' }) + lab(xa - fs * 0.3, yc, 'E_{C}', { anchor: 'end', color: p.cbC }) + lab(xa - fs * 0.3, yv, 'E_{V}', { anchor: 'end', color: p.vbC });
      if (p.doping === 'n') for (let i = 0; i < 7; i++) s += hline(xa + (i + 0.3) * (xb - xa) / 7, xa + (i + 0.6) * (xb - xa) / 7, yc + gp * 0.1, p.cbC, lw);
      if (p.doping === 'p') for (let i = 0; i < 7; i++) s += hline(xa + (i + 0.3) * (xb - xa) / 7, xa + (i + 0.6) * (xb - xa) / 7, yv - gp * 0.1, p.vbC, lw);
      s += vgap(xb - fs * 2.2, yc, yv, 'E_{g}');
      if (p.carriers) { const k = p.doping === 'n' ? 6 : p.doping === 'p' ? 2 : 3, kh = p.doping === 'p' ? 6 : p.doping === 'n' ? 2 : 3; for (let i = 0; i < k; i++) s += e(xa + (i + 0.7) * (xb - xa - fs * 4) / (k + 0.5), yc - er * 1.6); for (let i = 0; i < kh; i++) s += h(xa + (i + 0.4) * (xb - xa - fs * 4) / (kh + 0.5), yv + er * 1.6); }
      if (p.light) {
        const x1 = xa + (xb - xa) * 0.3, x2 = xa + (xb - xa) * 0.55;
        s += photonIn(x1 - fs * 0.6, yv - gp * 0.25) + arrow(x1, yv, x1, yc - er * 2.4, c, aw, hs) + e(x1, yc - er * 3.4) + h(x1, yv + er * 1.6);
        s += arrow(x2, yc, x2, yv, '#d4a017', aw, hs) + photonOut(x2 + fs * 0.4, yc + gp * 0.45);
      }
      s += lab(0, Hh / 2 - fs * 0.6, { n: 'n-type', p: 'p-type', i: 'intrinsic' }[p.doping] + ' semiconductor', { size: fs * 0.9 });
    } else if (p.mode === 'pn') {
      const b = U.clamp(+p.bias || 0, -1, 0.8), vbi = Hh * 0.26 * (1 - b), d = W * 0.13 * Math.sqrt(1 - b * 0.7), gp = Hh * 0.32, base = -Hh * 0.05, xa = -W / 2 + fs * 2.4, xb = W / 2;
      const st = x => x < -d ? 1 : x < 0 ? 1 - 0.5 * Math.pow((x + d) / d, 2) : x < d ? 0.5 * Math.pow((d - x) / d, 2) : 0;
      const ec = x => base - Hh * 0.08 - vbi * st(x) + vbi / 2;   // p side higher in energy (up)
      s += `<rect x="${n(-d)}" y="${n(-Hh / 2)}" width="${n(2 * d)}" height="${n(Hh - fs * 1.6)}" fill="#9aa1ab" opacity="0.13"/>`;
      s += edges(xa, xb, ec, gp, 120);
      const efn = ec(xb) + gp * 0.15, efp = ec(xa) + gp * 0.85;   // E_F near E_C on the n side, near E_V on the p side
      if (Math.abs(b) < 0.02) s += hline(xa, xb, efn, c, lw, true) + lab(xb - fs * 0.2, efn - fs * 0.6, 'E_{F}', { anchor: 'end' });
      else s += hline(-d, xb, efn, c, lw, true) + hline(xa, d, efp, c, lw, true) + lab(xb - fs * 0.2, efn - fs * 0.6, 'E_{Fn}', { anchor: 'end' }) + lab(xa + fs * 0.2, efp - fs * 0.6, 'E_{Fp}', { anchor: 'start' }) + vgap(d * 1.15 + fs, Math.min(efn, efp), Math.max(efn, efp), 'qV');
      s += lab(xa - fs * 0.3, ec(xa), 'E_{C}', { anchor: 'end', color: p.cbC }) + lab(xa - fs * 0.3, ec(xa) + gp, 'E_{V}', { anchor: 'end', color: p.vbC });
      s += vgap(xb - fs * 5.5, ec(xa), ec(xb), b ? 'q(V_{bi}−V)' : 'qV_{bi}');
      if (p.carriers) { for (let i = 0; i < 5; i++) { s += e(d + fs + i * (xb - d - fs * 2) / 5, ec(xb) - er * 1.6); s += h(xa + fs * 4 + i * (-d - xa - fs * 5) / 5, ec(xa) + gp + er * 1.6); } }
      if (p.light && b <= 0.02) { s += photonIn(-d * 0.1 - fs * 0.5, ec(0) + gp * 0.4) + arrow(0, ec(0) + gp, 0, ec(0) + er, c, aw, hs) + arrow(fs * 0.2, ec(fs * 0.2) - er * 1.4, d * 1.3, ec(d * 1.3) - er * 1.4, p.cbC, aw * 0.8, hs * 0.8) + arrow(-fs * 0.2, ec(-fs * 0.2) + gp + er * 1.4, -d * 1.3, ec(-d * 1.3) + gp + er * 1.4, p.vbC, aw * 0.8, hs * 0.8); }
      s += lab((xa - d) / 2, Hh / 2 - fs * 0.6, 'p-type', { size: fs * 0.9 }) + lab((xb + d) / 2, Hh / 2 - fs * 0.6, 'n-type', { size: fs * 0.9 }) + lab(0, -Hh / 2 + fs * 0.6, 'depletion region', { size: fs * 0.8 });
    } else if (p.mode === 'schottky') {
      const xm = -W * 0.18, xb = W / 2, xa = -W / 2, ef = Hh * 0.05, phiB = Hh * 0.27, gp = Hh * 0.34, wd = W * 0.28, dE = Hh * 0.06;
      const ec = x => ef - dE - (phiB - dE) * Math.pow(Math.max(0, 1 - (x - xm) / wd), 2);
      s += `<rect x="${n(xa)}" y="${n(ef)}" width="${n(xm - xa)}" height="${n(Hh / 2 - ef)}" fill="${p.metalC}"/>` + `<line x1="${n(xm)}" y1="${n(-Hh / 2 + fs)}" x2="${n(xm)}" y2="${n(Hh / 2)}" stroke="${c}" stroke-width="${n(lw)}"/>`;
      s += hline(xa, xb, ef, c, lw, true) + lab(xa + fs * 0.3, ef - fs * 0.6, 'E_{F}', { anchor: 'start' });
      s += edges(xm, xb, ec, gp, 80);
      s += lab(xb - fs * 0.2, ec(xb) - fs * 0.6, 'E_{C}', { anchor: 'end', color: p.cbC }) + lab(xb - fs * 0.2, ec(xb) + gp + fs * 0.6, 'E_{V}', { anchor: 'end', color: p.vbC });
      s += vgap(xm + fs * 0.8, ec(xm), ef, 'φ_{B}');
      s += lab((xa + xm) / 2, Hh / 2 - fs * 0.6, 'metal', { size: fs * 0.9 }) + lab((xm + xb) / 2 + fs, Hh / 2 - fs * 0.6, 'n-type semiconductor', { size: fs * 0.9 });
      if (p.hot) {
        const x = (xa + xm) / 2 + fs * 0.5, yh = ec(xm) - fs * 0.9;
        s += photonIn(x - fs * 0.4, ef + fs * 1.2, -0.9, fs * 3) + T(S, (xa + xm) / 2 - fs * 1.2, -Hh / 2 + fs * 1.6, 'plasmon decay', fs * 0.8, { color: '#b8860b' });
        s += arrow(x, ef + fs * 1.2, x, yh, c, aw, hs) + e(x, yh - er) + h(x, ef + fs * 1.2 + er * 1.4);
        s += arrow(x + er * 1.6, yh - er, xm + wd * 0.75, ec(xm + wd * 0.75) - er * 1.2, p.cbC, aw, hs) + e(xm + wd * 0.75 + er * 1.6, ec(xm + wd * 0.75) - er * 1.4);
        s += lab(x + fs * 0.3, yh - fs * 1.1, 'hot e^{−}', { anchor: 'start', size: fs * 0.85 });
      }
    } else if (p.mode === 'qw') {
      const xa = -W / 2 + fs * 2.4, xb = W / 2, ww = W * 0.26, cb = -Hh * 0.28, dc = Hh * 0.16, gp = Hh * 0.5, dv2 = Hh * 0.1;
      const inW = x => Math.abs(x) < ww / 2;
      let dc1 = '', dv1 = '';
      [[xa, -ww / 2], [-ww / 2, ww / 2], [ww / 2, xb]].forEach(([a, b], i) => { const yc = i === 1 ? cb + dc : cb, yv = i === 1 ? cb + gp - dv2 : cb + gp; dc1 += `${i ? ' L' : 'M'} ${n(a)} ${n(yc)} L ${n(b)} ${n(yc)}`; dv1 += `${i ? ' L' : 'M'} ${n(a)} ${n(yv)} L ${n(b)} ${n(yv)}`; });
      if (p.fillC) s += `<path d="${dc1} L ${n(xb)} ${n(-Hh / 2)} L ${n(xa)} ${n(-Hh / 2)} Z" fill="${p.fillC}" opacity="0.8"/>`;
      if (p.vfillC) s += `<path d="${dv1} L ${n(xb)} ${n(Hh / 2)} L ${n(xa)} ${n(Hh / 2)} Z" fill="${p.vfillC}" opacity="0.9"/>`;
      s += `<path d="${dc1}" fill="none" stroke="${p.cbC}" stroke-width="${n(lw * 2)}"/><path d="${dv1}" fill="none" stroke="${p.vbC}" stroke-width="${n(lw * 2)}"/>`;
      const e1 = cb + dc - dc * 0.3, e2 = cb + dc - dc * 0.8, h1 = cb + gp - dv2 + dv2 * 0.3;
      s += hline(-ww / 2, ww / 2, e1, p.cbC, lw, true) + hline(-ww / 2, ww / 2, e2, p.cbC, lw, true) + hline(-ww / 2, ww / 2, h1, p.vbC, lw, true);
      const psi = (y, k, amp, col, flip) => { let d = ''; for (let i = 0; i <= 40; i++) { const x = -ww / 2 + ww * i / 40, v = k === 1 ? Math.sin(Math.PI * i / 40) : Math.sin(2 * Math.PI * i / 40); d += (i ? ' L ' : 'M ') + n(x) + ' ' + n(y - (flip ? -1 : 1) * amp * v); } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(lw * 0.9)}" opacity="0.85"/>`; };
      s += psi(e1, 1, dc * 0.22, p.cbC) + psi(e2, 2, dc * 0.15, p.cbC) + psi(h1, 1, dv2 * 0.5, p.vbC, true);
      s += lab(ww / 2 + fs * 0.3, e1, 'e_{1}', { anchor: 'start', color: p.cbC, size: fs * 0.85 }) + lab(ww / 2 + fs * 0.3, e2, 'e_{2}', { anchor: 'start', color: p.cbC, size: fs * 0.85 }) + lab(ww / 2 + fs * 0.3, h1, 'hh_{1}', { anchor: 'start', color: p.vbC, size: fs * 0.85 });
      if (p.light) s += arrow(-ww * 0.2, e1, -ww * 0.2, h1, '#d4a017', aw, hs) + photonOut(-ww * 0.2 - fs * 0.2, (e1 + h1) / 2, Math.PI + 0.4, fs * 3.4);
      if (p.carriers) s += e(ww * 0.2, e1 - er * 1.2) + h(ww * 0.2, h1 + er * 1.2);
      s += lab(xa - fs * 0.3, cb, 'E_{C}', { anchor: 'end', color: p.cbC }) + lab(xa - fs * 0.3, cb + gp, 'E_{V}', { anchor: 'end', color: p.vbC });
      s += lab((xa - ww / 2) / 2, Hh / 2 - fs * 0.6, 'barrier', { size: fs * 0.85 }) + lab(0, Hh / 2 - fs * 0.6, 'well', { size: fs * 0.85 }) + lab((xb + ww / 2) / 2, Hh / 2 - fs * 0.6, 'barrier', { size: fs * 0.85 });
    } else if (p.mode === 'ek') {
      const xa = -W / 2 + fs * 1.6, xb = W / 2 - fs * 0.6, ya = Hh / 2 - fs * 1.4, yt = -Hh / 2 + fs * 0.8, k0 = 0, kx = p.gap === 'indirect' ? (xb - xa) * 0.32 : 0, mid = (xa + xb) / 2;
      s += arrow(xa, ya, xb, ya, c, lw, hs * 0.8) + arrow(xa, ya, xa, yt, c, lw, hs * 0.8) + lab(xb, ya + fs * 0.8, 'k', { italic: true, anchor: 'end' }) + lab(xa - fs * 0.5, yt + fs * 0.3, 'E', { italic: true, anchor: 'end' });
      const evt = -Hh * 0.0, ect = evt - Hh * 0.3, sc = (Hh * 0.9) / Math.pow((xb - xa) / 2, 2);
      const curve = (cx, y0, sgn, col) => { let d = ''; for (let i = 0; i <= 60; i++) { const x = xa + fs + (xb - xa - fs * 2) * i / 60, y = y0 - sgn * sc * Math.pow(x - cx, 2); if (y < yt || y > ya) continue; d += (d ? ' L ' : 'M ') + n(x) + ' ' + n(y); } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(lw * 2)}"/>`; };
      s += curve(mid + kx, ect, 1, p.cbC) + curve(mid, evt, -1, p.vbC);
      s += lab(mid, ya + fs * 0.8, 'Γ') + (kx ? lab(mid + kx, ya + fs * 0.8, 'X') : '');
      s += lab(xb - fs * 0.2, ect - Hh * 0.08, 'CB', { anchor: 'end', color: p.cbC, size: fs * 0.85 }) + lab(xb - fs * 0.2, evt + Hh * 0.18, 'VB', { anchor: 'end', color: p.vbC, size: fs * 0.85 });
      if (p.light) {
        if (!kx) s += arrow(mid, evt, mid, ect, '#d4a017', aw, hs) + lab(mid + fs * 0.4, (evt + ect) / 2, 'photon', { anchor: 'start', size: fs * 0.85, color: '#b8860b' });
        else s += arrow(mid, evt, mid, ect - Hh * 0.12, '#d4a017', aw, hs) + lab(mid - fs * 0.4, (evt + ect) / 2, 'photon', { anchor: 'end', size: fs * 0.85, color: '#b8860b' }) + arrow(mid + fs * 0.3, ect - Hh * 0.12, mid + kx - fs * 0.3, ect, '#7a5195', aw, hs, true) + lab(mid + kx / 2, ect - Hh * 0.17, 'phonon ħq', { size: fs * 0.85, color: '#7a5195' });
      }
      if (p.carriers) s += e(mid + kx, ect - er * 1.3) + h(mid, evt + er * 1.3);
      s += lab(xa + fs * 1.2, yt + fs * 0.2, p.gap === 'indirect' ? 'indirect gap' : 'direct gap', { size: fs * 0.85, anchor: 'start' });
    } else if (p.mode === 'photocat') {
      // potential vs NHE grows downwards; 1 V = Hh/4.4
      const k = Hh / 4.6, Y = V => -Hh * 0.18 + V * k, xa = -W / 2 + fs * 3.2, xs = xa + W * 0.08, xe = xs + W * 0.26, xr = W / 2 - fs * 0.2;
      const cb = -0.5, vb = 2.6;
      s += arrow(xa - fs * 1.2, Y(3.3), xa - fs * 1.2, Y(-1.1), c, lw, hs * 0.8);
      for (let v = -1; v <= 3; v++) s += hline(xa - fs * 1.2, xa - fs * 0.9, Y(v), c, lw) + lab(xa - fs * 1.4, Y(v), String(v), { anchor: 'end', size: fs * 0.8 });
      s += lab(xa - fs * 2.4, Y(1.1), 'E vs NHE (V)', { rot: -90, size: fs * 0.8 });
      s += `<rect x="${n(xs)}" y="${n(Y(cb) - Hh * 0.12)}" width="${n(xe - xs)}" height="${n(Hh * 0.12)}" fill="${p.fillC || '#dce8f7'}" stroke="${p.cbC}" stroke-width="${n(lw * 1.4)}"/>`;
      s += `<rect x="${n(xs)}" y="${n(Y(vb))}" width="${n(xe - xs)}" height="${n(Hh * 0.12)}" fill="${p.vfillC || '#f4dcd8'}" stroke="${p.vbC}" stroke-width="${n(lw * 1.4)}"/>`;
      s += lab((xs + xe) / 2, Y(cb) - Hh * 0.06, 'CB', { color: p.cbC, size: fs * 0.9, bold: true }) + lab((xs + xe) / 2, Y(vb) + Hh * 0.06, 'VB', { color: p.vbC, size: fs * 0.9, bold: true });
      s += vgap(xs + (xe - xs) * 0.82, Y(cb), Y(vb), 'E_{g}');
      s += hline(xe + fs * 0.4, xr, Y(0), c, lw, true) + lab(xr, Y(0) - fs * 0.6, 'H^{+}/H_{2} (0 V)', { anchor: 'end', size: fs * 0.85 });
      s += hline(xe + fs * 0.4, xr, Y(1.23), c, lw, true) + lab(xr, Y(1.23) - fs * 0.6, 'O_{2}/H_{2}O (1.23 V)', { anchor: 'end', size: fs * 0.85 });
      if (p.light) s += photonIn(xs + (xe - xs) * 0.3 - fs * 0.5, Y(vb) - fs * 0.3, -1.9, fs * 2.6) + arrow(xs + (xe - xs) * 0.3, Y(vb), xs + (xe - xs) * 0.3, Y(cb) + er * 1.5, c, aw, hs);
      if (p.carriers) {
        s += e(xs + (xe - xs) * 0.55, Y(cb) - er * 1.6) + h(xs + (xe - xs) * 0.55, Y(vb) + er * 1.8);
        s += arrow(xe, Y(cb) - er, xe + (xr - xe) * 0.35, Y(0) - 0.2, p.cbC, aw, hs) + lab(xe + (xr - xe) * 0.4, Y(0) + fs * 0.7, 'reduction', { size: fs * 0.8, color: p.cbC, anchor: 'start' });
        s += arrow(xe, Y(vb) + er, xe + (xr - xe) * 0.35, Y(1.23) + 0.2, p.vbC, aw, hs) + lab(xe + (xr - xe) * 0.4, Y(1.23) + fs * 0.7, 'oxidation', { size: fs * 0.8, color: p.vbC, anchor: 'start' });
      }
    }
    return s;
  },
});
})();
