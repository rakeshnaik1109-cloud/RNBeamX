/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/vertical.js
   Beams that leave the table plane.

   • Fold mirror (up / down): a 45° mirror that sends a beam up a
     microscope tower or down to the table. Lenses, objectives,
     samples and detectors whose optical axis is set to vertical
     (Properties ▸ Position ▸ Optical axis) are met on the way.
   • Periscope: changes beam height and optionally direction.

   In the top view a beam going up is marked ⊙, one going down ⊗,
   the standard notation for "out of / into the page".
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;

/* ⊙ (towards the viewer) or ⊗ (away) */
H.axisMark = (S, x, y, r, up, color) => {
  const c = color || S.ink, w = Math.max(0.12, S.lw * 0.9);
  let s = `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="#ffffff" fill-opacity="0.9" stroke="${c}" stroke-width="${n(w)}"/>`;
  if (up) s += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 0.32)}" fill="${c}"/>`;
  else { const k = r * 0.62; s += `<path d="M ${n(x - k)} ${n(y - k)} L ${n(x + k)} ${n(y + k)} M ${n(x - k)} ${n(y + k)} L ${n(x + k)} ${n(y - k)}" stroke="${c}" stroke-width="${n(w)}"/>`; }
  return s;
};

lib.register({
  type: 'vfold', name: 'Fold mirror (up / down)', abbr: 'FM', category: 'Mirrors & splitters', vertical: false,
  keywords: 'fold mirror up down vertical tower microscope periscope 45 turning dichroic',
  defaults: { d: 8, dir: 'up', mode: 'mirror', R: 0.5, edge: 550, foldMode: 'longpass' },
  params: [lib.P.diameter(),
    { key: 'dir', label: 'Sends the beam', type: 'select', options: [['up', 'Up (out of the table plane)'], ['down', 'Down (towards the table)']] },
    { key: 'mode', label: 'Coating', type: 'select', options: [['mirror', 'Mirror'], ['dichroic', 'Dichroic'], ['splitter', 'Beam splitter']] },
    { key: 'R', label: 'Reflectance', type: 'range', min: 0, max: 1, step: 0.01, show: p => p.mode === 'splitter' },
    { key: 'foldMode', label: 'Transmits', type: 'select', options: [['longpass', 'Long wavelengths'], ['shortpass', 'Short wavelengths']], show: p => p.mode === 'dichroic' },
    { key: 'edge', label: 'Edge wavelength', type: 'wavelength', unit: 'nm', min: 200, max: 3000, step: 1, show: p => p.mode === 'dichroic' }],
  hint: 'Beam arrives from the arrow side. Objects stacked above (or below) it need a vertical optical axis and a height z.',
  snap: 'face', mount: true, labelPos: [0, 7],
  bbox: p => [-p.d * 0.36, -p.d / 2, p.d * 0.36 + 2.2, p.d / 2],
  draw(p, S) {
    const r = p.d / 2, hw = p.d * 0.36;
    const fill = p.mode === 'dichroic' ? U.lighten(U.wavelengthColor(p.edge), 0.55) : S.fill('mirror');
    let s = `<rect x="${n(-hw)}" y="${n(-r)}" width="${n(2 * hw)}" height="${n(2 * r)}" rx="${n(hw * 0.9)}" fill="${fill}" ${H.stroke(S)}/>`;
    s += H.sheen(S, -hw, -r, 2 * hw, r * 0.8, hw * 0.9);
    // tilt cue: the near edge of the 45° mirror drawn heavier
    s += H.line(S, hw * 0.7, -r * 0.85, hw * 0.7, r * 0.85, '', 1.8);
    s += H.axisMark(S, 0, 0, Math.min(1.4, hw * 0.55), p.dir === 'up');
    s += H.arrowGlyph(S, hw + 1.1, 0, 2.2);
    return s;
  },
  optics: p => [{ kind: 'vfold', a: [0, -p.d / 2], b: [0, p.d / 2], port: p.dir === 'up' ? 1 : -1, mode: p.mode, R: p.R, edge: p.edge, foldMode: p.foldMode }],
  solid: (p, bh) => [{ kind: 'disk3', c: [0, 0, bh], nrm: [1, 0, p.dir === 'up' ? 1 : -1], r: p.d / 2, t: 1.2, mat: p.mode === 'dichroic' ? { color: U.lighten(U.wavelengthColor(p.edge), 0.35), alpha: 0.65 } : 'mirror' }],
});

lib.register({
  type: 'periscope', name: 'Periscope', abbr: 'PS', category: 'Mirrors & splitters', vertical: false,
  keywords: 'periscope beam height raise lower elevate two mirrors',
  defaults: { s: 7, rise: 12, turn: 'straight' },
  params: [{ key: 'rise', label: 'Height change', type: 'number', unit: 'mm', min: -60, max: 60, step: 0.5, hint: 'downstream optics need the new height z' },
    { key: 'turn', label: 'Output direction', type: 'select', options: [['straight', 'Straight on'], ['left', 'Turn left'], ['right', 'Turn right'], ['back', 'Back (U-turn)']] },
    { key: 's', label: 'Size', type: 'number', unit: 'mm', min: 3, max: 30, step: 0.5 }],
  hint: 'The beam enters the side facing the source and leaves at height z + rise. Optics placed on the new beam take its height automatically.',
  snap: 'perp', labelPos: [0, 7.5],
  bbox: p => [-p.s / 2, -p.s / 2, p.s / 2, p.s / 2],
  draw(p, S) {
    const h = p.s / 2;
    let s = H.rect(S, -h, -h, p.s, p.s, S.shaded ? S.fill('metal') : '#eef0f3', 'rx="0.8"');
    s += H.sheen(S, -h, -h, p.s, p.s * 0.4, 0.8);
    // lower mirror (input) and upper mirror (output), offset as in a perspective sketch
    s += H.line(S, -h * 0.55, -h * 0.55, h * 0.1, h * 0.1, '', 2.2);
    s += H.line(S, -h * 0.1, -h * 0.1, h * 0.55, h * 0.55, '', 1.2, S.shaded ? '#6b7480' : '#9aa1ab');
    s += H.axisMark(S, 0, 0, Math.min(1.2, h * 0.36), (p.rise || 0) >= 0);
    const ang = { straight: 0, left: -90, right: 90, back: 180 }[p.turn] || 0;
    const v = U.v.fromAngle(ang);
    s += `<g transform="rotate(${ang})">${H.arrowGlyph(S, h + 1.4, 0, 2.2)}</g>`;
    void v;
    return s;
  },
  optics: p => [{ kind: 'periscope', a: [-p.s / 2, -p.s / 2], b: [-p.s / 2, p.s / 2] }],
  solid: (p, bh) => {
    const rise = p.rise || 0, ang = U.rad({ straight: 0, left: -90, right: 90, back: 180 }[p.turn] || 0);
    const o = [Math.cos(ang), Math.sin(ang)];
    return [
      { kind: 'disk3', c: [0, 0, bh], nrm: [-1, 0, Math.sign(rise) || 1], r: p.s * 0.38, t: 0.9, mat: 'mirror' },
      { kind: 'disk3', c: [0, 0, bh + rise], nrm: [o[0], o[1], -(Math.sign(rise) || 1)], r: p.s * 0.38, t: 0.9, mat: 'mirror' },
      { kind: 'vcyl', cx: 0, cy: p.s * 0.5, r: 0.6, z: [0, bh + Math.max(0, rise) + p.s * 0.3], mat: 'post' },
      { kind: 'box', x: [-p.s * 0.45, p.s * 0.45], y: [p.s * 0.42, p.s * 0.55], z: [bh - p.s * 0.4, bh + Math.max(0, rise) + p.s * 0.3], mat: 'anod' },
    ];
  },
});
})();
