/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/signs.js
   Safety signs: GHS hazard pictograms (red diamond), warning
   triangles (yellow) and mandatory signs (blue circle), with an
   optional caption underneath.

   The pictograms are drawn on a 100-unit frame and scaled to the
   chosen size. Schematic style is flat; Shaded adds a soft gloss
   and shadow. Figure graphics: no part in the ray tracing.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, n = lib.H.n;
const CAT = 'Safety signs';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);
const ann = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

const pth = (d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`;
const ln = (x1, y1, x2, y2, c, w, cap = 'round') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
const circ = (cx, cy, r, fill, stroke = 'none', w = 0) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
const flame = (c, x = 0, y = 0, k = 1) => pth(`M ${x - 13 * k} ${y + 14 * k} C ${x - 22 * k} ${y + 2 * k} ${x - 12 * k} ${y - 8 * k} ${x - 7 * k} ${y - 22 * k} C ${x - 3 * k} ${y - 12 * k} ${x + 2 * k} ${y - 12 * k} ${x + 1 * k} ${y - 30 * k} C ${x + 14 * k} ${y - 18 * k} ${x + 22 * k} ${y - 2 * k} ${x + 13 * k} ${y + 14 * k} C ${x + 10 * k} ${y + 4 * k} ${x + 5 * k} ${y + 2 * k} ${x + 3 * k} ${y - 6 * k} C ${x - 2 * k} ${y + 2 * k} ${x - 9 * k} ${y + 4 * k} ${x - 13 * k} ${y + 14 * k} Z`, c);
const bangMark = (c, cy = 0, k = 1) => pth(`M ${-5 * k} ${cy - 24 * k} L ${5 * k} ${cy - 24 * k} L ${3 * k} ${cy + 8 * k} L ${-3 * k} ${cy + 8 * k} Z`, c, 'stroke-linejoin="round"') + circ(0, n(cy + 16 * k), n(4.2 * k), c);

/* ================= GHS pictograms ================= */
const GHS = {
  flammable: ['Flammable (GHS02)', c => flame(c, 0, 0) + `<rect x="-20" y="17" width="40" height="5" fill="${c}"/>`],
  oxidiser: ['Oxidiser (GHS03)', c => flame(c, 0, -6, 0.8) + circ(0, 12, 9, 'none', c, 4.5) + `<rect x="-20" y="23" width="40" height="4.5" fill="${c}"/>`],
  explosive: ['Explosive (GHS01)', c => { let s = circ(-4, 10, 10, c); const rays = [[-40, 20], [-18, 22], [5, 20], [30, 18], [55, 22], [-140, 16], [-165, 18], [170, 14]]; rays.forEach(([a, L]) => { const r = a * Math.PI / 180, x = -4 + Math.cos(r) * 12, y = 10 + Math.sin(r) * 12; s += ln(n(x), n(y), n(x + Math.cos(r) * L * 0.9), n(y + Math.sin(r) * L * 0.9), c, 3.2); }); [[18, -18, 4], [-24, -8, 3], [10, -26, 3.2], [26, 0, 3]].forEach(([x, y, r]) => { s += circ(x, y, r, c); }); return s; }],
  gas: ['Gas under pressure (GHS04)', c => `<g transform="rotate(-35)"><rect x="-27" y="-10" width="50" height="20" rx="10" fill="${c}"/><rect x="23" y="-4.5" width="7" height="9" fill="${c}"/><rect x="29" y="-7" width="3" height="14" fill="${c}"/></g>`],
  corrosive: ['Corrosive (GHS05)', c => `<g transform="rotate(30 -14 -16)"><rect x="-20" y="-28" width="9" height="20" fill="none" stroke="${c}" stroke-width="2.6"/></g><g transform="rotate(-30 14 -16)"><rect x="11" y="-28" width="9" height="20" fill="none" stroke="${c}" stroke-width="2.6"/></g>`
      + circ(-10, -2, 1.8, c) + circ(-9, 4, 1.8, c) + circ(10, -2, 1.8, c) + circ(9, 4, 1.8, c)
      + pth('M -26 10 L -4 10 L -4 18 L -10 14 L -14 18 L -18 14 L -26 18 Z', c) + pth('M 2 12 L 22 10 C 27 10 27 16 22 16 L 18 16 L 18 22 L 6 22 C 3 22 2 18 2 16 Z', c) + `<rect x="-28" y="24" width="56" height="5" fill="${c}"/>`],
  toxic: ['Acute toxicity (GHS06)', c => circ(0, -10, 14, c) + `<rect x="-8" y="0" width="16" height="9" rx="2" fill="${c}"/>` + circ(-5.5, -10, 4, '#fff') + circ(5.5, -10, 4, '#fff') + pth('M 0 -5 L -2.5 -1 L 2.5 -1 Z', '#fff')
      + ln(-20, 12, 20, 26, c, 5) + ln(-20, 26, 20, 12, c, 5) + [[-21, 11], [-21, 27], [21, 11], [21, 27]].map(([x, y]) => circ(x, y, 3.3, c)).join('')],
  health: ['Health hazard (GHS08)', c => circ(0, -18, 8, c) + pth('M -22 26 L -22 6 C -22 -4 -14 -8 0 -8 C 14 -8 22 -4 22 6 L 22 26 Z', c)
      + pth(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * 2 * Math.PI - Math.PI / 2, r = i % 2 ? 4 : 10; return (i ? 'L ' : 'M ') + n(Math.cos(a) * r) + ' ' + n(10 + Math.sin(a) * r); }).join(' ') + ' Z', '#fff')],
  exclamation: ['Irritant / harmful (GHS07)', c => bangMark(c, -2, 1.1)],
  environment: ['Hazardous to the environment (GHS09)', c => ln(-12, 4, -12, -26, c, 3.4) + ln(-12, -14, -24, -24, c, 2.6) + ln(-12, -8, 0, -20, c, 2.6) + ln(-12, -20, -4, -28, c, 2.2) + ln(-28, 6, 26, 6, c, 3)
      + pth('M -2 14 C 6 8 18 8 22 14 C 18 20 6 20 -2 14 Z M 22 14 L 28 9 L 28 19 Z', c) + circ(4, 13, 1.4, '#fff') + `<path d="M 4 10 l 2 2 m 0 -2 l -2 2" stroke="#fff" stroke-width="0.9"/>` + ln(-28, 24, 28, 24, c, 2.4)],
};
/* ================= warning triangles ================= */
const WARN = {
  general: ['General warning', c => bangMark(c, 10, 0.9)],
  laser: ['Laser radiation', c => { let s = circ(-6, 12, 5, c); for (let i = 0; i < 12; i++) { const a = i / 12 * 2 * Math.PI, L = i % 2 ? 10 : 15; s += ln(n(-6 + Math.cos(a) * 7.5), n(12 + Math.sin(a) * 7.5), n(-6 + Math.cos(a) * (7.5 + L)), n(12 + Math.sin(a) * (7.5 + L)), c, 2.2); } return s + ln(-6, 12, 30, 12, c, 3.2, 'butt'); }],
  radiation: ['Ionising radiation', c => { let s = circ(0, 14, 4.5, c); for (let i = 0; i < 3; i++) { const a0 = (i * 120 - 120) * Math.PI / 180, a1 = a0 + Math.PI / 3, r0 = 7.5, r1 = 22, P = (r, a) => n(Math.cos(a) * r) + ' ' + n(14 + Math.sin(a) * r); s += pth(`M ${P(r0, a0)} L ${P(r1, a0)} A ${r1} ${r1} 0 0 1 ${P(r1, a1)} L ${P(r0, a1)} A ${r0} ${r0} 0 0 0 ${P(r0, a0)} Z`, c); } return s; }],
  biohazard: ['Biological hazard', c => { let s = ''; for (let i = 0; i < 3; i++) { const a = (i * 120 - 90) * Math.PI / 180; s += circ(n(Math.cos(a) * 10), n(14 + Math.sin(a) * 10), 11, 'none', c, 4); } return s + circ(0, 14, 6, 'none', c, 3) + circ(0, 14, 2, '#fff'); }],
  voltage: ['High voltage / electrical hazard', c => pth('M 8 -14 L -9 14 L 2 14 L -6 36 L 13 6 L 2 6 L 14 -14 Z', c, 'stroke-linejoin="round"')],
  magnetic: ['Magnetic field', c => '<g transform="translate(0 10) scale(0.8)">' + pth('M -16 -6 L -16 14 A 16 16 0 0 0 16 14 L 16 -6 L 7 -6 L 7 14 A 7 7 0 0 1 -7 14 L -7 -6 Z', c) + `<rect x="-16" y="-6" width="9" height="7" fill="#fff" stroke="${c}" stroke-width="1.6"/><rect x="7" y="-6" width="9" height="7" fill="#fff" stroke="${c}" stroke-width="1.6"/>`
      + [4, 9].map(r => `<path d="M ${-11.5 - r} -8 A ${r + 11.5} ${n((r + 11.5) * 0.6)} 0 0 1 ${11.5 + r} -8" fill="none" stroke="${c}" stroke-width="1.8" stroke-dasharray="3 2.5"/>`).join('') + '</g>'],
  hot: ['Hot surface', c => [-12, 0, 12].map(x => `<path d="M ${x} 22 C ${x - 6} 16 ${x + 6} 10 ${x} 4 C ${x - 6} -2 ${x + 6} -8 ${x} -12" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`).join('') + `<rect x="-24" y="27" width="48" height="5" fill="${c}"/>`],
  cryogenic: ['Low temperature / cryogenic', c => { let s = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * 2 * Math.PI - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), X = r => n(ca * r), Y = r => n(14 + sa * r); s += ln(0, 14, X(22), Y(22), c, 3); [[11, 6], [17, 5]].forEach(([r, b]) => { [1, -1].forEach(sg => { const bx = ca * r, by = 14 + sa * r, ang = a + sg * Math.PI / 4; s += ln(n(bx), n(by), n(bx + Math.cos(ang) * b), n(by + Math.sin(ang) * b), c, 2.4); }); }); } return s + circ(0, 14, 3, c); }],
  chemical: ['Toxic substance', c => GHS.toxic[1](c).replace(/^/, '<g transform="translate(0 14) scale(0.72)">') + '</g>'],
};
/* ================= mandatory (blue circle) ================= */
const MAND = {
  goggles: ['Wear eye protection', c => pth('M -34 -6 C -34 -14 -26 -16 -16 -16 L 16 -16 C 26 -16 34 -14 34 -6 L 34 6 C 34 14 26 16 18 16 C 10 16 8 6 0 6 C -8 6 -10 16 -18 16 C -26 16 -34 14 -34 6 Z', c)
      + pth('M -26 -6 L -8 -6 C -6 -6 -6 -4 -7 -2 C -9 4 -13 8 -18 8 C -24 8 -27 2 -27 -3 C -27 -5 -27 -6 -26 -6 Z M 26 -6 L 8 -6 C 6 -6 6 -4 7 -2 C 9 4 13 8 18 8 C 24 8 27 2 27 -3 C 27 -5 27 -6 26 -6 Z', '#1f5fa8') + ln(-34, -4, -42, -10, c, 4) + ln(34, -4, 42, -10, c, 4)],
  gloves: ['Wear protective gloves', c => pth('M -12 34 L -12 14 L -22 0 C -25 -4 -20 -8 -16 -4 L -10 2 L -10 -22 C -10 -27 -3 -27 -3 -22 L -3 -4 L -2 -4 L -2 -28 C -2 -33 5 -33 5 -28 L 5 -4 L 6 -4 L 6 -24 C 6 -29 13 -29 13 -24 L 13 -2 L 14 -2 L 14 -16 C 14 -21 21 -21 21 -16 L 21 12 C 21 20 16 26 14 28 L 14 34 Z', c, 'stroke-linejoin="round"')],
  coat: ['Wear a lab coat', c => pth('M -10 -30 L 0 -18 L 10 -30 L 22 -26 L 34 4 L 26 8 L 20 -6 L 20 34 L 2 34 L 0 -14 L -2 34 L -20 34 L -20 -6 L -26 8 L -34 4 L -22 -26 Z', c, 'stroke-linejoin="round"') + circ(4, 2, 1.8, '#1f5fa8') + circ(4, 12, 1.8, '#1f5fa8') + circ(4, 22, 1.8, '#1f5fa8')],
  faceshield: ['Wear a face shield', c => circ(0, -4, 22, c) + pth('M -24 -12 L 24 -12 L 22 26 C 12 34 -12 34 -22 26 Z', 'rgba(255,255,255,0.55)', `stroke="${c}" stroke-width="2.5"`) + `<rect x="-26" y="-18" width="52" height="7" rx="2" fill="${c}"/>`],
  mask: ['Wear respiratory protection', c => circ(0, -6, 24, c) + pth('M -16 0 C -16 -8 16 -8 16 0 L 14 14 C 8 22 -8 22 -14 14 Z', '#1f5fa8') + circ(-9, 9, 4.5, c) + circ(9, 9, 4.5, c) + ln(-16, 2, -26, -6, '#1f5fa8', 2.2) + ln(16, 2, 26, -6, '#1f5fa8', 2.2)],
  manual: ['Refer to the instructions', c => pth('M -26 -24 C -14 -28 -4 -26 -1 -20 L -1 28 C -4 22 -14 20 -26 24 Z M 26 -24 C 14 -28 4 -26 1 -20 L 1 28 C 4 22 14 20 26 24 Z', c) + bangMark('#1f5fa8', 2, 0.55).replace(/^/, '<g transform="translate(-13 0)">') + '</g>'],
};

const shadow = (S, d) => S.shaded ? `<path d="${d}" fill="#000" opacity="0.18" transform="translate(1.6 2.4)"/>` : '';
const gloss = (S, d, id) => S.shaded ? `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.38"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.06"/><stop offset="1" stop-color="#000" stop-opacity="0.12"/></linearGradient></defs><path d="${d}" fill="url(#${id})"/>` : '';
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const idOf = (obj, p, tag) => 'rbx-sign-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const caption = (S, p, y) => p.caption ? `<text x="0" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(U.pt2mm(p.capSize))}" fill="${S.ink}" text-anchor="middle" dominant-baseline="hanging" font-weight="700">${RNBX.text.markup(String(p.caption), U.pt2mm(p.capSize))}</text>` : '';
const capH = p => (p.caption ? U.pt2mm(p.capSize) * 1.4 + 1 : 0); // pt → mm, plus gap

const sizeParams = [{ key: 'size', label: 'Size', type: 'number', unit: 'mm', min: 4, max: 200, step: 0.5 },
  { key: 'caption', label: 'Caption (below)', type: 'text', placeholder: 'e.g. Class 4 laser, Wear goggles' }, { key: 'capSize', label: 'Caption size', type: 'number', unit: 'pt', min: 4, max: 40, step: 0.5, show: p => !!p.caption }];

const mkSign = (type, name, keywords, table, def, frame) => ann({ type, name, keywords: keywords + ' ' + Object.values(table).map(v => v[0].toLowerCase()).join(' '),
  defaults: { symbol: def, size: 20, caption: '', capSize: 8 },
  params: [{ key: 'symbol', label: 'Symbol', type: 'select', options: Object.keys(table).map(k => [k, table[k][0]]) }].concat(sizeParams),
  bbox: p => [-p.size / 2 - 0.5, -p.size / 2 - 0.5, p.size / 2 + 0.5, p.size / 2 + 0.5 + capH(p)],
  draw(p, S, obj) {
    const k = p.size / 100, sym = (table[p.symbol] || table[def])[1];
    const g = frame(S, idOf(obj, p, type), sym);
    return `<g transform="scale(${n(k)})">${g}</g>` + caption(S, p, p.size / 2 + 1);
  } });

const DIAMOND = 'M 0 -49 L 49 0 L 0 49 L -49 0 Z', DIAMOND_IN = 'M 0 -42 L 42 0 L 0 42 L -42 0 Z';
mkSign('ghs', 'GHS hazard pictogram', 'ghs hazard pictogram chemical safety sign diamond clp coshh', GHS, 'flammable',
  (S, id, sym) => shadow(S, DIAMOND) + `<path d="${DIAMOND}" fill="#fff" stroke="#d7191c" stroke-width="7" stroke-linejoin="miter"/>` + sym('#111') + gloss(S, DIAMOND_IN, id));
const TRI = 'M 0 -44 L 50 42 L -50 42 Z', TRI_IN = 'M 0 -32 L 40 37 L -40 37 Z';
mkSign('warnsign', 'Warning sign (triangle)', 'warning sign triangle hazard caution laser radiation biohazard voltage magnetic hot cryogenic', WARN, 'laser',
  (S, id, sym) => shadow(S, TRI) + `<path d="${TRI}" fill="#111" stroke="#111" stroke-width="6" stroke-linejoin="round"/><path d="${TRI_IN}" fill="#f9c80e" stroke="#f9c80e" stroke-width="2" stroke-linejoin="round"/>` + `<g transform="translate(0 2) scale(0.92)">${sym('#111')}</g>` + gloss(S, TRI_IN, id));
const CIRC = 'M -48 0 A 48 48 0 1 1 48 0 A 48 48 0 1 1 -48 0 Z';
mkSign('mandsign', 'Mandatory sign (PPE)', 'mandatory sign ppe blue circle wear goggles gloves lab coat face shield mask respirator', MAND, 'goggles',
  (S, id, sym) => shadow(S, CIRC) + `<path d="${CIRC}" fill="#1f5fa8" stroke="#fff" stroke-width="2.5"/>` + `<g transform="scale(1.05)">${sym('#fff')}</g>` + gloss(S, CIRC, id));

lib.SIGN_SYMBOLS = { ghs: Object.keys(GHS), warnsign: Object.keys(WARN), mandsign: Object.keys(MAND) };
})();
