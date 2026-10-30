/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/solids3d.js
   Detailed 3D bodies for parts that were plain blocks: housings
   with front panels, ports, knobs, connectors, fins, magnet rings,
   clamps, cage rods and micrometers, so the 3D table reads like a
   real lab. Local frame as everywhere in 3D: the optical axis is
   +x, y runs across, z is height (the beam at z = bh). The optics
   and the 2D drawings are not touched.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib;

/* building blocks */
const box = (x0, x1, y0, y1, z0, z1, mat, extra) => Object.assign({ kind: 'box', x: [x0, x1], y: [y0, y1], z: [z0, z1], mat }, extra || {});
const cylX = (x0, x1, r, cz, mat, cy, r1) => ({ kind: 'cyl', x: [x0, x1], r: [r, r1 == null ? r : r1], cz, cy: cy || 0, mat });
const vcyl = (cx, cy, r, z0, z1, mat) => ({ kind: 'vcyl', cx, cy, r, z: [z0, z1], mat });
const disk = (c, nrm, r, t, mat) => ({ kind: 'disk3', c, nrm, r, t, mat });
const knob = (c, nrm, r) => [disk(c, nrm, r * 0.55, r * 0.5, 'metal'), disk(c.map((v, i) => v + nrm[i] * r * 0.55), nrm, r, r * 0.7, 'black')];
const feet = (x0, x1, y0, y1, h) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => { const sx = x < 0 ? 1 : -1, sy = y < 0 ? 1 : -1; return box(Math.min(x, x + sx * 1.1), Math.max(x, x + sx * 1.1), Math.min(y, y + sy * 1.1), Math.max(y, y + sy * 1.1), 0, h, 'black'); });
const SMA = (x, y, z) => [vcyl(x, y, 0.55, z, z + 0.35, 'metal'), vcyl(x, y, 0.35, z + 0.35, z + 1.2, { color: '#d6b45c', spec: 0.8 })];
const set = (type, solid) => { const d = lib.get(type); if (d) d.solid = solid; };

/* ---------- benchtop instruments ---------- */
// fibre-output benchtop laser: body on feet, dark display and knob on the front, status lights, fibre port on the side
set('benchlaser', (p, bh) => {
  const w = p.w, h = p.h, H = Math.max(h * 0.75, 4), x0 = -w / 2, x1 = w / 2, y0 = -h / 2, y1 = h / 2, zb = 0.45;
  return [
    ...feet(x0, x1, y0, y1, zb),
    box(x0, x1, y0, y1, zb, H, { color: p.boxColor || '#c9ced6', spec: 0.35 }),
    box(x0 + 0.4, x1 - 0.4, y0 + 0.4, y1 - 0.4, H, H + 0.25, { color: U.lighten(p.boxColor || '#c9ced6', 0.12), spec: 0.4 }),
    box(x0 + w * 0.1, x0 + w * 0.6, y1, y1 + 0.06, zb + (H - zb) * 0.45, zb + (H - zb) * 0.85, { color: '#1f2a37', spec: 0.9 }),
    ...knob([x1 - w * 0.18, y1, zb + (H - zb) * 0.62], [0, 1, 0], Math.min(1.1, H * 0.16)),
    ...['#e5484d', '#e6c44a', '#30a46c'].map((c, i) => disk([x0 + w * 0.12 + i * 0.9, y1 + 0.03, zb + (H - zb) * 0.22], [0, 1, 0], 0.28, 0.12, { color: c, spec: 0.8 })),
    ...[0.25, 0.4, 0.55, 0.7].map(f => box(x0 + w * f, x0 + w * f + 0.35, y0 + 1, y1 - 1, H + 0.25, H + 0.27, 'black', { decal: true })),
    cylX(x1, x1 + 0.7, 0.75, zb + (H - zb) * 0.4, 'metal', y1 * 0.35),
    cylX(x1 + 0.7, x1 + 1.3, 0.45, zb + (H - zb) * 0.4, { color: '#d6b45c', spec: 0.8 }, y1 * 0.35),
  ];
});

// broadband lamp: housing with a finned chimney on top and a lens tube at the output
set('lamp', (p, bh) => {
  const L = p.L, h = p.H, x0 = -L / 2, x1 = L / 2, top = bh + h * 0.5, out = [
    box(x0, x1, -h / 2, h / 2, 0, top, 'laser'),
    box(x0 - 0.2, x1 + 0.2, -h / 2 - 0.2, h / 2 + 0.2, 0, 0.6, 'black'),
    vcyl(-L * 0.12, 0, Math.min(h, L) * 0.3, top, top + 1.2, 'dark'),
    cylX(x1, x1 + 1.6, 1.45, bh, 'dark'), cylX(x1 + 1.6, x1 + 1.9, 1.6, bh, 'black'),
    box(x0 + L * 0.08, x0 + L * 0.42, h / 2, h / 2 + 0.05, bh - h * 0.2, bh + h * 0.15, { color: '#1f2a37', spec: 0.9 }),
    ...knob([x0 + L * 0.65, h / 2, bh - h * 0.05], [0, 1, 0], 0.7),
  ];
  for (let i = 0; i < 5; i++) { const z = top + 1.2 + i * 0.55; out.push(vcyl(-L * 0.12, 0, Math.min(h, L) * 0.36, z, z + 0.25, 'dark')); }
  out.push(vcyl(-L * 0.12, 0, Math.min(h, L) * 0.22, top + 1.2, top + 1.2 + 5 * 0.55, 'black'));
  return out;
});

// spectrometer: optical bench housing on feet, SMA fibre input and slit plate on the entrance face, a label strip
set('spectrometer', (p, bh) => {
  const L = p.L, h = p.H, top = bh + 3, x0 = -L / 2, x1 = L / 2;
  return [
    ...feet(x0, x1, -h / 2, h / 2, 0.4),
    box(x0, x1, -h / 2, h / 2, 0.4, top, 'body'),
    box(x0 + 0.5, x1 - 0.5, -h / 2 + 0.5, h / 2 - 0.5, top, top + 0.2, { color: '#dfe3e9', spec: 0.5 }),
    box(x0 + L * 0.1, x0 + L * 0.55, -h * 0.15, h * 0.15, top + 0.2, top + 0.22, { color: '#3a3f46', spec: 0.2 }, { decal: true }),
    box(x0 - 0.25, x0, -1.3, 1.3, bh - 1.3, bh + 1.3, 'anod'),
    cylX(x0 - 1.2, x0 - 0.25, 0.55, bh, { color: '#d6b45c', spec: 0.8 }),
    cylX(x0 - 1.7, x0 - 1.2, 0.75, bh, 'metal'),
    box(x0 + L * 0.62, x0 + L * 0.9, h / 2, h / 2 + 0.05, top * 0.35, top * 0.75, { color: '#26323f', spec: 0.9 }),
  ];
});

// electronics box: front panel with display, knobs, buttons and status light; ventilation on top
set('instrument', (p, bh) => {
  const w = p.w, d = p.h, H = Math.max(bh + 2, p.h * 0.6), x0 = -w / 2, x1 = w / 2, y1 = d / 2, col = p.color || '#c9ced6';
  const out = [
    ...feet(x0, x1, -d / 2, y1, 0.4),
    box(x0, x1, -d / 2, y1, 0.4, H, { color: col, spec: 0.3 }),
    box(x0 - 0.15, x1 + 0.15, y1, y1 + 0.3, 0.3, H + 0.1, { color: U.darken(col, 0.25), spec: 0.4 }),
    box(x0 + w * 0.08, x0 + w * 0.55, y1 + 0.3, y1 + 0.36, H * 0.42, H * 0.85, { color: p.displayColor || '#1f2a37', spec: 0.95 }),
    ...knob([x0 + w * 0.75, y1 + 0.3, H * 0.62], [0, 1, 0], Math.min(1, H * 0.13)),
    ...[0, 1, 2].map(i => box(x0 + w * (0.1 + i * 0.1), x0 + w * (0.1 + i * 0.1) + w * 0.06, y1 + 0.3, y1 + 0.55, H * 0.18, H * 0.3, 'black')),
    disk([x0 + w * 0.6, y1 + 0.32, H * 0.24], [0, 1, 0], 0.3, 0.15, { color: p.led || '#30a46c', spec: 0.9 }),
  ];
  for (let i = 0; i < 6; i++) out.push(box(x0 + w * (0.2 + i * 0.1), x0 + w * (0.2 + i * 0.1) + w * 0.04, -d / 2 + 1, y1 - 1.5, H, H + 0.02, 'black', { decal: true }));
  return out;
});

/* ---------- in-beam devices (on posts) ---------- */
// Faraday rotator: black magnet housing with ring bands, steel end caps, small clear apertures
set('faraday', (p, bh) => {
  const L = p.L, r = p.H / 2 * 0.95;
  return [
    cylX(-L / 2 + 0.7, L / 2 - 0.7, r, bh, 'black'),
    ...[-0.22, 0.22].map(f => cylX(L * f - 0.5, L * f + 0.5, r + 0.08, bh, { color: '#3d68b8', spec: 0.6 })),
    cylX(-L / 2, -L / 2 + 0.7, r * 0.82, bh, 'metal'), cylX(L / 2 - 0.7, L / 2, r * 0.82, bh, 'metal'),
    disk([-L / 2 - 0.01, 0, bh], [1, 0, 0], r * 0.25, 0.05, 'black'), disk([L / 2 + 0.01, 0, bh], [1, 0, 0], r * 0.25, 0.05, 'black'),
  ];
});
// optical isolator: polariser flanges at both ends of a magnet tube, with a white direction band
set('isolator', (p, bh) => {
  const L = p.L, r = p.H / 2 * 0.85;
  return [
    cylX(-L / 2 + 1, L / 2 - 1, r, bh, 'black'),
    cylX(-L / 2, -L / 2 + 1, r * 1.12, bh, 'anod'), cylX(L / 2 - 1, L / 2, r * 1.12, bh, 'anod'),
    cylX(-L * 0.1, L * 0.1, r + 0.06, bh, { color: '#e9edf2', spec: 0.5 }),
    disk([-L / 2 - 0.01, 0, bh], [1, 0, 0], r * 0.3, 0.05, 'glass'), disk([L / 2 + 0.01, 0, bh], [1, 0, 0], r * 0.3, 0.05, 'glass'),
  ];
});
// electro-optic modulator: cylindrical housing with an SMA RF connector on top and crystal windows
set('eom', (p, bh) => {
  const L = p.L, r = p.H / 2;
  return [
    cylX(-L / 2 + 0.6, L / 2 - 0.6, r, bh, { color: '#b9bec6', spec: 0.7 }),
    cylX(-L / 2, -L / 2 + 0.6, r * 0.9, bh, 'black'), cylX(L / 2 - 0.6, L / 2, r * 0.9, bh, 'black'),
    cylX(-L * 0.3, -L * 0.22, r + 0.05, bh, 'black'),
    ...SMA(L * 0.1, 0, bh + r - 0.1),
    disk([-L / 2 - 0.01, 0, bh], [1, 0, 0], r * 0.28, 0.05, 'crystal'), disk([L / 2 + 0.01, 0, bh], [1, 0, 0], r * 0.28, 0.05, 'crystal'),
  ];
});
// acousto-optic modulator: dark housing, gold transducer edge, SMA input, heat-sink fins, clear apertures
set('aom', (p, bh) => {
  const L = p.L, h = p.H, out = [
    box(-L / 2, L / 2, -h / 2, h / 2, bh - h / 2, bh + h * 0.35, 'dark'),
    box(-L / 2 + 0.3, L / 2 - 0.3, -h / 2 + 0.3, h / 2 - 0.3, bh + h * 0.35, bh + h * 0.42, 'gold'),
    ...SMA(0, h / 2 - 0.9, bh + h * 0.42),
    disk([-L / 2 - 0.01, 0, bh], [1, 0, 0], 0.55, 0.05, 'glass'), disk([L / 2 + 0.01, 0, bh], [1, 0, 0], 0.55, 0.05, 'glass'),
  ];
  for (let i = 0; i < 5; i++) { const x = -L / 2 + 0.8 + i * (L - 1.6) / 4; out.push(box(x - 0.15, x + 0.15, -h / 2 - 0.9, -h / 2, bh - h / 2 + 0.3, bh + h * 0.25, 'metal')); }
  return out;
});
// nonlinear crystal: the crystal itself, held in a black clamp on a base plate (both visible)
set('crystal', (p, bh) => {
  const L = p.L, h = p.H, cl = L * 0.6, ch = h * 0.5;
  return [
    box(-cl / 2, cl / 2, -ch / 2, ch / 2, bh - ch / 2, bh + ch / 2, 'crystal'),
    box(-L / 2, L / 2, -h / 2, h / 2, bh - h / 2, bh - ch / 2, 'anod'),
    box(-L / 2, -cl / 2 - 0.05, -h / 2, h / 2, bh - ch / 2, bh + ch / 2 + 0.6, 'anod'),
    box(cl / 2 + 0.05, L / 2, -h / 2, h / 2, bh - ch / 2, bh + ch / 2 + 0.6, 'anod'),
    box(-L / 2, L / 2, -h * 0.15, h * 0.15, bh + ch / 2 + 0.6, bh + ch / 2 + 0.9, 'anod'),
    vcyl(0, 0, 0.35, bh + ch / 2 + 0.9, bh + ch / 2 + 1.5, 'metal'),
  ];
});
// OPO / OPA: sealed enclosure with a lighter lid, handles, and steel input / output ports
set('opo', (p, bh) => {
  const L = p.L, h = p.H, top = bh + h * 0.55;
  return [
    box(-L / 2, L / 2, -h * 0.75, h * 0.75, bh - h * 0.6, top, 'laser'),
    box(-L / 2 + 0.4, L / 2 - 0.4, -h * 0.75 + 0.4, h * 0.75 - 0.4, top, top + 0.3, 'laserhead'),
    ...[-1, 1].map(s => box(-L * 0.25, L * 0.25, s * h * 0.42 - 0.2, s * h * 0.42 + 0.2, top + 0.3, top + 0.8, 'black')),
    cylX(-L / 2 - 0.7, -L / 2, 0.9, bh, 'metal'), cylX(L / 2, L / 2 + 0.7, 0.9, bh, 'metal'),
    box(-L * 0.42, -L * 0.1, h * 0.75, h * 0.75 + 0.05, bh - h * 0.3, bh + h * 0.2, { color: '#1f2a37', spec: 0.9 }),
  ];
});
// supercontinuum fibre: housing with the photonic-crystal fibre coiled on top, and collimators at both ends
set('scfiber', (p, bh) => {
  const L = p.L, h = p.H, top = bh + h * 0.3, R = Math.min(L * 0.3, h * 0.8);
  return [
    box(-L / 2, L / 2, -h * 0.7, h * 0.7, bh - h / 2, top, 'metal'),
    vcyl(0, 0, R, top, top + 0.55, { color: '#e8b739', spec: 0.6 }),
    vcyl(0, 0, R * 0.72, top + 0.02, top + 0.58, 'metal'),
    cylX(-L / 2 - 1, -L / 2, 0.7, bh, 'metal'), cylX(L / 2, L / 2 + 1, 0.7, bh, 'metal'),
  ];
});

/* ---------- detectors ---------- */
// camera: body with cooling fins, a C-mount ring at the front and a connector at the back
set('camera', (p, bh) => {
  const L = p.L, h = p.H, fx = -L / 2 + Math.min(2.2, L * 0.25), out = [
    box(fx, L / 2, -h / 2, h / 2, bh - h / 2, bh + h / 2, 'dark'),
    cylX(-L / 2, fx, h * 0.3, bh, 'black'), cylX(fx - 0.35, fx, h * 0.36, bh, 'metal'),
    cylX(L / 2, L / 2 + 0.6, 0.55, bh - h * 0.2, 'metal'),
    box(fx + 0.4, fx + (L / 2 - fx) * 0.5, h / 2 - 0.02, h / 2 + 0.04, bh + h * 0.05, bh + h * 0.3, { color: '#3a86ff', spec: 0.5 }),
  ];
  for (let i = 0; i < 5; i++) { const x = fx + 0.6 + i * (L / 2 - fx - 1.2) / 4; out.push(box(x - 0.14, x + 0.14, -h / 2 + 0.4, h / 2 - 0.4, bh + h / 2, bh + h / 2 + 0.8, 'dark')); }
  return out;
});
// beam profiler: camera-style head with an aperture ring and a cable connector
set('profiler', (p, bh) => {
  const L = p.L, h = p.H;
  return [
    box(-L / 2 + 0.8, L / 2, -h / 2, h / 2, bh - h / 2, bh + h / 2, 'dark'),
    cylX(-L / 2, -L / 2 + 0.8, h * 0.32, bh, 'metal'),
    disk([-L / 2 - 0.01, 0, bh], [1, 0, 0], h * 0.2, 0.05, { color: '#3b5a85', spec: 0.9 }),
    cylX(L / 2, L / 2 + 0.6, 0.5, bh, 'metal'),
    box(-L * 0.1, L * 0.35, -h * 0.3, h * 0.3, bh + h / 2, bh + h / 2 + 0.03, { color: '#e2566e', spec: 0.4 }, { decal: true }),
  ];
});
// photomultiplier: tube with a glass window at the front and a socket at the back
set('pmt', (p, bh) => [
  cylX(-p.L / 2 + 0.6, p.L / 2 - 1.2, p.D / 2, bh, 'dark'),
  cylX(-p.L / 2, -p.L / 2 + 0.6, p.D / 2 * 0.92, bh, 'glass'),
  cylX(p.L / 2 - 1.2, p.L / 2, p.D / 2 * 1.08, bh, 'black'),
  cylX(p.L / 2, p.L / 2 + 0.6, 0.5, bh, 'metal'),
]);

/* ---------- optomechanics ---------- */
const rods = (x0, x1, s, bh) => [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]) => ({ kind: 'cyl', x: [x0, x1], r: [s * 0.045, s * 0.045], cy: a * s * 0.36, cz: bh + b * s * 0.36, mat: 'metal' }));
// cage cube: anodised cube with the four cage rods through it and a cover screw
set('cagecube', (p, bh) => [
  box(-p.s / 2, p.s / 2, -p.s / 2, p.s / 2, bh - p.s / 2, bh + p.s / 2, 'anod'),
  ...rods(-p.s / 2 - 1.4, p.s / 2 + 1.4, p.s, bh),
  disk([-p.s / 2 - 0.01, 0, bh], [1, 0, 0], p.s * 0.28, 0.05, 'black'), disk([p.s / 2 + 0.01, 0, bh], [1, 0, 0], p.s * 0.28, 0.05, 'black'),
  vcyl(0, 0, p.s * 0.22, bh + p.s / 2, bh + p.s / 2 + 0.3, 'metal'),
]);
// cage plate: thin plate on four rods, with the optic in a retaining ring
set('cageplate', (p, bh) => [
  box(-0.9, 0.9, -p.s / 2, p.s / 2, bh - p.s / 2, bh + p.s / 2, 'anod'),
  ...rods(-2.5, 2.5, p.s, bh),
  cylX(-1, 1, p.s * 0.3, bh, 'black'),
  disk([0, 0, bh], [1, 0, 0], p.s * 0.24, 2.05, p.content === 'iris' ? 'black' : p.content === 'filter' ? { color: '#7fbf7a', alpha: 0.6 } : 'glass'),
]);
// beam shutter: housing with a round aperture and the solenoid on top
set('shutter', (p, bh) => [
  box(-1.4, 1.4, -p.d / 2 - 1.2, p.d / 2 + 1.2, bh - p.d / 2 - 1.2, bh + p.d / 2 + 1.2, 'dark'),
  disk([-1.41, 0, bh], [1, 0, 0], p.d * 0.3, 0.05, p.open ? 'black' : 'metal'), disk([1.41, 0, bh], [1, 0, 0], p.d * 0.3, 0.05, p.open ? 'black' : 'metal'),
  vcyl(0, p.d * 0.2, 1, bh + p.d / 2 + 1.2, bh + p.d / 2 + 2.6, 'metal'),
  vcyl(0, p.d * 0.2, 0.4, bh + p.d / 2 + 2.6, bh + p.d / 2 + 3.2, 'black'),
]);
// translation stage: base, moving carriage with a mounting grid, micrometer with thimble
set('stage', (p, bh) => {
  const L = p.L, W = p.W, out = [
    box(-L / 2, L / 2, -W / 2, W / 2, 0, 1, 'anod'),
    box(-L / 2 + 1, L / 2 - 1.5, -W / 2 + 0.5, W / 2 - 0.5, 1, 2.1, 'metal'),
    cylX(L / 2, L / 2 + 1.6, 0.55, 1.4, 'metal'), cylX(L / 2 + 1.6, L / 2 + 3, 0.85, 1.4, 'metal'), cylX(L / 2 + 3, L / 2 + 3.3, 0.95, 1.4, 'black'),
  ];
  for (let i = 1; i < 4; i++) for (let j = 1; j < 3; j++) out.push(vcyl(-L / 2 + 1 + i * (L - 2.5) / 4, -W / 2 + 0.5 + j * (W - 1) / 3, 0.25, 2.1, 2.12, 'black'));
  return out;
});
// rotation stage: round base, graduated platter and an adjuster knob (other kinds keep a plate with a micrometer)
set('posstage', (p, bh) => {
  const s = p.s;
  if (p.kind === 'rotation') return [
    vcyl(0, 0, s / 2, 0, 1.2, 'anod'),
    vcyl(0, 0, s / 2 * 0.86, 1.2, 2.1, 'metal'),
    vcyl(0, 0, s / 2 * 0.9, 1.15, 1.25, { color: '#e9edf2', spec: 0.4 }),
    vcyl(0, 0, s * 0.12, 2.1, 2.3, 'black'),
    disk([s / 2 + 0.6, 0, 0.6], [1, 0, 0], 0.7, 1.2, 'black'),
  ];
  return [
    box(-s / 2, s / 2, -s / 2, s / 2, 0, 1, 'anod'), box(-s / 2 + 0.6, s / 2 - 0.6, -s / 2 + 0.6, s / 2 - 0.6, 1, 2, 'metal'),
    cylX(s / 2, s / 2 + 2, 0.5, 1.2, 'metal'), cylX(s / 2 + 2, s / 2 + 2.8, 0.75, 1.2, 'black'),
    disk([0, s / 2 + 1, 1.2], [0, 1, 0], 0.5, 2, 'metal'),
  ];
});

/* ---------- fibre parts ---------- */
const pig = (x0, x1, cz, cy) => [cylX(x0, x1, 0.32, cz, { color: '#e8b739', spec: 0.5 }, cy)];
// fibre circulator: steel tube with three yellow pigtails (port 1 in, port 2 out, port 3 to the side)
set('circulator', (p, bh) => [
  cylX(-p.L / 2, p.L / 2, p.H * 0.32, bh, 'metal'),
  cylX(-p.L / 2 - 0.2, -p.L / 2 + 0.4, p.H * 0.36, bh, 'black'), cylX(p.L / 2 - 0.4, p.L / 2 + 0.2, p.H * 0.36, bh, 'black'),
  ...pig(-p.L / 2 - 2, -p.L / 2 - 0.2, bh, 0), ...pig(p.L / 2 + 0.2, p.L / 2 + 2, bh, 0),
  disk([0, -p.H * 0.32 - 0.9, bh], [0, 1, 0], 0.32, 1.8, { color: '#e8b739', spec: 0.5 }),
  box(-p.L * 0.2, p.L * 0.2, -0.05, 0.05, bh + p.H * 0.32, bh + p.H * 0.33, 'black', { decal: true }),
]);
// fibre splitter / WDM: steel tube housing with pigtails, straight through and to the side
set('fibersplit', (p, bh) => [
  cylX(-p.L / 2, p.L / 2, p.H * 0.3, bh, 'metal'),
  cylX(-p.L / 2 - 0.2, -p.L / 2 + 0.4, p.H * 0.34, bh, 'black'), cylX(p.L / 2 - 0.4, p.L / 2 + 0.2, p.H * 0.34, bh, 'black'),
  ...pig(-p.L / 2 - 2, -p.L / 2 - 0.2, bh, 0), ...pig(p.L / 2 + 0.2, p.L / 2 + 2, bh, 0),
  disk([0, -p.H * 0.3 - 0.9, bh], [0, 1, 0], 0.32, 1.8, { color: '#e8b739', spec: 0.5 }),
]);
// fluorescence filter cube: black cube with the excitation and emission filters in their ports and the dichroic seen through the top window
set('filtercube', (p, bh) => {
  const s = p.s, ce = U.wavelengthColor(p.exc || 488), cm = U.wavelengthColor(p.em || 525);
  return [
    box(-s / 2, s / 2, -s / 2, s / 2, bh - s / 2, bh + s / 2, 'anod'),
    disk([-s / 2 - 0.01, 0, bh], [1, 0, 0], s * 0.3, 0.1, { color: ce, spec: 0.7, alpha: 0.85 }),
    disk([0, s / 2 + 0.01, bh], [0, 1, 0], s * 0.3, 0.1, { color: cm, spec: 0.7, alpha: 0.85 }),
    disk([0, -s / 2 - 0.01, bh], [0, 1, 0], s * 0.3, 0.1, 'glass'),
    box(-s * 0.36, s * 0.36, -s * 0.36, s * 0.36, bh + s / 2, bh + s / 2 + 0.03, { color: '#1b1e22', spec: 0.9 }, { decal: true }),
    { kind: 'poly', pts: [[-s * 0.32, s * 0.27], [-s * 0.27, s * 0.32], [s * 0.32, -s * 0.27], [s * 0.27, -s * 0.32]], z: [bh + s / 2 + 0.03, bh + s / 2 + 0.06], mat: { color: '#e8913a', spec: 0.8 }, decal: true },
  ];
});

/* ---------- fibre Raman probe ----------
   working probe: a see-through housing with the real inner optics (the same geometry the tracer
   uses), the fibre ferrules at the back and the focusing nose; the closed variant is a dark body */
const moduleSolid = lib.get('module').solid;
set('module', (p, bh) => {
  if (!(p.inside === 'probe' && p.model === 'full')) return moduleSolid(p, bh);
  const g = lib.probeGeo(p), k = g.k, zt = k * 1.9, dark = /^#[0-4]/.test(p.color);
  const sl = p.snout ? Math.min(p.H * 0.35, 5) : 0, sw = p.H * 0.3;
  const slab = (xa, ya, xb, yb, mat) => { const dx = xb - xa, dy = yb - ya, l = Math.hypot(dx, dy), nx = -dy / l * 0.14, ny = dx / l * 0.14;
    return { kind: 'poly', pts: [[xa - nx, ya - ny], [xb - nx, yb - ny], [xb + nx, yb + ny], [xa + nx, ya + ny]], z: [bh - k, bh + k], mat }; };
  const out = [
    box(-p.L / 2, p.L / 2, -p.H / 2, p.H / 2, bh - zt, bh + zt, dark ? { color: p.color, spec: 0.4 } : { color: p.color, alpha: 0.2, spec: 0.6, edge: '#7f93a8' }),
    ...[-0.32, 0.32].map(f => box(p.L * f - 1.2, p.L * f + 1.2, -p.H * 0.3, p.H * 0.3, 0, bh - zt, 'anod')),
    ...[0, g.yc].map(y => cylX(g.xl - 1, g.xl + 0.25, 0.42, bh, 'black', y)),
    ...[0, g.yc].map(y => cylX(g.xl - 2.2, g.xl - 1, 0.3, bh, { color: '#e8b739', spec: 0.5 }, y)),
  ];
  if (sl) out.push(cylX(p.L / 2, p.L / 2 + sl, sw / 2, bh, 'dark', 0, sw / 2 * 0.7), disk([p.L / 2 + sl + 0.01, 0, bh], [1, 0, 0], sw * 0.28, 0.05, 'glass'));
  if (dark) return out;
  return out.concat([
    disk([g.xc, 0, bh], [1, 0, 0], k, 0.35, 'glass'), disk([g.xc, g.yc, bh], [1, 0, 0], k, 0.35, 'glass'),
    disk([g.xf, 0, bh], [1, 0, 0], k, 0.2, { color: U.wavelengthColor(p.ex), alpha: 0.8, spec: 0.7 }),
    disk([g.xf, g.yc, bh], [1, 0, 0], k, 0.2, { color: '#e8913a', alpha: 0.8, spec: 0.7 }),
    slab(g.xd - k, -k, g.xd + k, k, { color: '#e77f6d', alpha: 0.75, spec: 0.8 }),
    slab(g.xd - k, g.yc - k, g.xd + k, g.yc + k, 'mirror'),
  ]);
});
})();
