/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/templates.js
   Ready-made setups. Each is an ordinary document: the beams
   are traced live, so every template is also a working optical
   model you can edit.

   Mirror orientation for a 90° turn from direction din to dout:
   rot = angle(din − dout)  (the body sits behind the face).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib;
const T = RNBX.templates = { list: [] };

const ang = (din, dout) => U.round(U.v.angle([din[0] - dout[0], din[1] - dout[1]]), 3);
const R = [1, 0], L = [-1, 0], UP = [0, -1], DN = [0, 1];

function mk(type, x, y, rot, props, label, lab, extra) {
  const def = lib.get(type);
  const lp = lab || def.labelPos || [0, 7];
  const o = { id: U.uid(), type, x, y, rot: rot || 0, scale: 1, props: Object.assign(U.deepClone(def.defaults), props || {}) };
  if (!def.annotation && !def.connection) o.label = { text: label || '', dx: lp[0], dy: lp[1], show: !!label };
  return Object.assign(o, extra || {});
}
function base(preset, w, h, title, style) {
  const d = RNBX.newDocument(preset);
  d.page.width = w; d.page.height = h; d.meta.title = title;
  Object.assign(d.style, style || {});
  return d;
}
const link = (type, a, b, props) => mk(type, 0, 0, 0, Object.assign({ from: a.id, to: b.id }, props || {}));

/* ---------- Michelson interferometer ---------- */
T.list.push({
  id: 'michelson', name: 'Michelson interferometer', desc: 'He–Ne laser, cube splitter, scanning mirror, fringe camera',
  build() {
    const d = base('nature-15', 120, 74, 'Michelson interferometer');
    const laser = mk('laser', 20, 42, 0, { lambda: 632.8, L: 20, H: 5.5 }, 'He–Ne laser\n632.8 nm', [0, 7.5]);
    const bs = mk('bscube', 60, 42, 0, {}, 'BS', [-6.5, 6]);
    const m1 = mk('mirror', 60, 14, ang(UP, DN), {}, 'M1', [7, 0]);
    const m2 = mk('mirror', 96, 42, ang(R, L), {}, 'M2', [0, -9]);
    const st = mk('stage', 99, 42, 0, { L: 9, W: 13 });
    const lens = mk('lens', 60, 54, 90, { f: 70 }, 'L', [7, 0]);
    const cam = mk('camera', 60, 66, 90, { L: 9, H: 8 }, 'Camera', [10, 0]);
    const txt = mk('text', 104, 54, 0, { text: 'scan', size: 6, color: '#555555', italic: true });
    d.objects.push(st, laser, bs, m1, m2, lens, cam, txt);
    return d;
  },
});

/* ---------- Mach–Zehnder ---------- */
T.list.push({
  id: 'mzi', name: 'Mach–Zehnder interferometer', desc: 'Two balanced outputs, sample in one arm',
  build() {
    const d = base('nature-2', 183, 72, 'Mach–Zehnder interferometer', { beamArrows: true });
    const laser = mk('laser', 22, 52, 0, { lambda: 532 }, 'Laser 532 nm', [0, 7]);
    const bs1 = mk('bscube', 62, 52, 0, {}, 'BS1', [0, 7]);
    const ma = mk('mirror', 62, 20, ang(UP, R), {}, 'M1', [-7, -3]);
    const mb = mk('mirror', 130, 52, ang(R, UP), {}, 'M2', [5, 6]);
    const smp = mk('sample', 96, 20, 0, { look: 'cuvette', w: 6, h: 6, T: 1, spot: '#9ad1d4' }, 'Sample', [0, 7]);
    const bs2 = mk('bscube', 130, 20, 0, {}, 'BS2', [-7, -5]);
    const pd1 = mk('pd', 160, 20, 0, {}, 'PD1', [0, 6]);
    const pd2 = mk('pd', 130, 6, -90, {}, 'PD2', [7, 0]);
    const pnl = mk('panel', 4, 7, 0, { text: 'a' });
    d.objects.push(laser, bs1, ma, mb, smp, bs2, pd1, pd2, pnl);
    return d;
  },
});

/* ---------- Confocal Raman / SERS microscope ---------- */
T.list.push({
  id: 'raman', name: 'Confocal Raman / SERS microscope', desc: 'Epi-detection, dichroic, fibre-coupled spectrometer, zoom inset',
  build() {
    const d = base('nature-2', 183, 100, 'Confocal Raman microscope', { polarization: false });
    const laser = mk('laser', 22, 72, 0, { lambda: 532, power: 20 }, 'Laser\n532 nm', [0, 8.5]);
    const bp = mk('filter', 44, 72, 0, { mode: 'bandpass', center: 532, width: 4 }, 'BP', [0, 7]);
    const hwp = mk('hwp', 56, 72, 0, { angle: 0 }, 'λ/2', [0, 7]);
    const dm = mk('dichroic', 95, 72, ang(R, UP), { edge: 550, mode: 'longpass' }, 'DM', [8, 2]);
    const obj = mk('objective', 95, 42, -90, { fd: 3, mag: '50×' }, 'Objective\n50×, NA 0.75', [15, 0]);
    obj.label.dx3 = 16; obj.label.dy3 = 6;
    const smp = mk('sample', 95, 33.8, -90, { look: 'chip', w: 1.4, h: 12, T: 0, emit: true, emitLambda: 575, emitFrac: 0.6 }, 'SERS substrate', [-17, 0]);
    const m2 = mk('mirror', 95, 90, ang(DN, R), {}, 'M', [-6, 2]);
    const lp = mk('filter', 110, 90, 0, { mode: 'longpass', edge: 545 }, 'LP', [0, -6.5]);
    const l3 = mk('lens', 123, 90, 0, { f: 140 }, 'L', [0, -6.5]);
    const fc1 = mk('coupler', 140.5, 90, 180, {}, 'FC', [0, 5]);
    const fc2 = mk('coupler', 140, 58, 0, {}, '', null);
    const spec = mk('spectrometer', 159, 58, 0, { L: 20, H: 11 }, 'Spectrometer', [0, -8.5]);
    const pc = mk('instrument', 159, 80, 0, { text: 'PC', icon: 'computer', w: 13, h: 10 });
    const fib = link('fiber', fc1, fc2, { bend: 0.55 });
    const w1 = link('wire', spec, pc, { route: 'straight' });
    const inset = mk('inset', 95, 34, 0, { r: 3.2, dx: -42, dy: -12, R: 13 });
    const pa = mk('panel', 4, 7, 0, { text: 'a' });
    const t1 = mk('text', 100, 56, 0, { text: 'Raman signal', size: 6, color: '#8a7a00', italic: true, anchor: 'start' });
    d.objects.push(laser, bp, hwp, dm, obj, smp, m2, lp, l3, fc1, fc2, spec, pc, fib, w1, inset, pa, t1);
    return d;
  },
});

/* ---------- Pump–probe ---------- */
T.list.push({
  id: 'pumpprobe', name: 'Pump–probe with delay line', desc: 'fs laser, SHG pump, retroreflector delay (animated), lock-in',
  build() {
    const d = base('nature-2', 183, 98, 'Pump–probe spectroscopy');
    const laser = mk('laser', 20, 22, 0, { lambda: 800, pulsed: true, text: 'fs', L: 18 }, 'Ti:sapphire\n800 nm, 100 fs', [0, 8]);
    const bs = mk('bscube', 48, 22, 90, { R: 0.3 }, 'BS', [0, -6.5]);
    const shg = mk('crystal', 66, 22, 0, { eff: 0.45 }, 'BBO', [0, -6]);
    const sp = mk('filter', 79, 22, 0, { mode: 'shortpass', edge: 600 }, 'SP', [0, -6]);
    const ch = mk('chopper', 100, 22, 0, { r: 4.5 }, 'Chopper', [0, 7]);
    const m1 = mk('mirror', 150, 22, ang(R, DN), {}, 'M1', [6, -4]);
    const l1 = mk('lens', 150, 58, 90, { f: 220 }, 'L1', [7, 0]);
    const m2 = mk('mirror', 48, 52, ang(DN, R), {}, 'M2', [-7, 2]);
    const retro = mk('retro', 100, 56, 0, {}, 'RR', [3, -10.5]);
    const stage = mk('stage', 103, 56, 0, { L: 16, W: 15 });
    const m3 = mk('mirror', 72, 60, ang(L, DN), {}, 'M3', [-7, 0]);
    const m4 = mk('mirror', 72, 80, ang(DN, R), {}, 'M4', [-7, 2]);
    const l2 = mk('lens', 128, 80, 0, { f: 220 }, 'L2', [0, 7]);
    const smp = mk('sample', 150, 80, 0, { look: 'slide', T: 1, w: 1, h: 9 }, 'Sample', [8, -5]);
    const pd = mk('pd', 172, 80, 0, {}, 'PD', [0, 6]);
    const bd = mk('beamdump', 150, 93, 90, {});
    const lock = mk('instrument', 172, 45, 0, { text: 'Lock-in', icon: 'meter', w: 15, h: 9 });
    const w1 = link('wire', pd, lock, { route: 'straight' });
    const w2 = link('wire', ch, lock, { route: 'vh', dashed: true });
    const tlab = mk('text', 103, 68, 0, { text: 'delay τ', size: 6.5, italic: true, color: '#333333' });
    const tp = mk('text', 125, 16, 0, { text: 'pump 400 nm', size: 6, color: '#6236d8', italic: true });
    const tq = mk('text', 112, 86, 0, { text: 'probe 800 nm', size: 6, color: '#82001a', italic: true });
    d.objects.push(stage, laser, bs, shg, sp, ch, m1, l1, m2, retro, m3, m4, l2, smp, pd, bd, lock, w1, w2, tlab, tp, tq);
    d.animation.duration = 6;
    d.animation.tracks[retro.id] = [{ t: 0, ease: 'inout', x: 100, y: 56, rot: 0, scale: 1, opacity: 1, props: U.deepClone(retro.props) }, { t: 3, ease: 'inout', x: 116, y: 56, rot: 0, scale: 1, opacity: 1, props: U.deepClone(retro.props) }, { t: 6, ease: 'inout', x: 100, y: 56, rot: 0, scale: 1, opacity: 1, props: U.deepClone(retro.props) }];
    d.animation.tracks[stage.id] = [{ t: 0, ease: 'inout', x: 103, y: 56, rot: 0, scale: 1, opacity: 1, props: U.deepClone(stage.props) }, { t: 3, ease: 'inout', x: 119, y: 56, rot: 0, scale: 1, opacity: 1, props: U.deepClone(stage.props) }, { t: 6, ease: 'inout', x: 103, y: 56, rot: 0, scale: 1, opacity: 1, props: U.deepClone(stage.props) }];
    return d;
  },
});

/* ---------- Polarisation analysis (animated) ---------- */
T.list.push({
  id: 'polarization', name: 'Polarisation splitting (animated)', desc: 'Rotating λ/2 plate before a PBS; live polarisation marks',
  build() {
    const d = base('nature-1', 89, 58, 'Polarisation control', { polarization: true });
    const laser = mk('laser', 14, 40, 0, { lambda: 633, pol: 'H', L: 15 }, 'Laser', [0, 6]);
    const hwp = mk('hwp', 37, 40, 0, { angle: 0 }, 'λ/2 ({angle}°)', [0, 7]);
    const pbs = mk('pbs', 56, 40, 0, {}, 'PBS', [-7, 6]);
    const pd1 = mk('pd', 78, 40, 0, {}, 'PD1 (p)', [0, 6]);
    const pd2 = mk('pd', 56, 12, -90, {}, 'PD2 (s)', [10, 0]);
    d.objects.push(laser, hwp, pbs, pd1, pd2);
    d.animation.duration = 6;
    const k = a => ({ x: 37, y: 40, rot: 0, scale: 1, opacity: 1, props: Object.assign(U.deepClone(hwp.props), { angle: a }) });
    d.animation.tracks[hwp.id] = [Object.assign({ t: 0, ease: 'inout' }, k(0)), Object.assign({ t: 3, ease: 'inout' }, k(45)), Object.assign({ t: 6, ease: 'inout' }, k(0))];
    return d;
  },
});

/* ---------- Grating spectrometer ---------- */
T.list.push({
  id: 'spectro', name: 'Grating spectrometer', desc: 'White light dispersed by a 600 l/mm grating onto a camera',
  build() {
    const d = base('nature-15', 120, 72, 'Grating spectrometer');
    const lamp = mk('lamp', 16, 30, 0, { count: 7, beamWidth: 1.4 }, 'White light', [0, 7.5]);
    const slit = mk('iris', 34, 30, 0, { r: 0.9, d: 8 }, 'Slit', [0, 7]);
    const g = mk('grating', 50, 30, 0, { transmit: true, t: 0.8, G: 600, orders: '0,1', eff0: 0.12 }, 'Grating\n600 l/mm', [0, -9]);
    const th = U.deg(Math.asin(0.55 * 0.6));
    const cx = (r) => 50 + r * Math.cos(U.rad(th)), cy = (r) => 30 + r * Math.sin(U.rad(th));
    const lens = mk('lens', cx(30), cy(30), th, { f: 250, d: 12 }, 'L (f = 250 mm)', [-2, 10]);
    const cam = mk('camera', cx(60), cy(60), th, { L: 10, H: 13 }, 'Camera', [0, 10.5]);
    const bd = mk('beamdump', 86, 30, 0, {});
    const tz = mk('text', 74, 26.5, 0, { text: '0th order', size: 5.5, color: '#666666', italic: true });
    d.objects.push(lamp, slit, g, lens, cam, bd, tz);
    return d;
  },
});

/* ---------- Beam expander / spatial filter ---------- */
T.list.push({
  id: 'expander', name: 'Spatial filter & beam expander', desc: 'Keplerian telescope with a pinhole at the common focus',
  build() {
    const d = base('nature-1', 89, 42, 'Spatial filter');
    const laser = mk('laser', 12, 20, 0, { lambda: 488, L: 14, H: 5 }, 'Laser 488 nm', [0, 7]);
    const l1 = mk('lens', 30, 20, 0, { f: 50, d: 6 }, 'L1 (f = {f} mm)', [0, -6.5]);
    const ph = mk('iris', 35, 20, 0, { r: 0.25, d: 7 }, 'Pinhole', [0, 7]);
    const l2 = mk('lens', 50, 20, 0, { f: 150, d: 9 }, 'L2 (f = {f} mm)', [0, -8]);
    const scr = mk('screen', 80, 20, 0, { d: 12 }, 'Screen', [0, 9]);
    const dim = mk('arrow', 30, 31, 0, { dx: 20, dy: 0, head: 'both', headSize: 1.1, width: 0.4, color: '#555555' });
    const dt = mk('text', 40, 34.5, 0, { text: 'f_1 + f_2', size: 6, italic: true, color: '#555555' });
    d.objects.push(laser, l1, ph, l2, scr, dim, dt);
    return d;
  },
});

/* ---------- Microscope tower (vertical beam path) ---------- */
T.list.push({
  id: 'tower', name: 'Upright Raman microscope (vertical path)', desc: 'Fold mirror sends the beam up to an objective and sample above the table',
  build() {
    const d = base('nature-2', 183, 92, 'Upright Raman microscope', { mode: '3d' });
    Object.assign(d.view3d, { yaw: -32, pitch: 30, zoom: 1.05, beamHeight: 6 });
    const laser = mk('laser', 22, 58, 0, { lambda: 532, power: 20 }, 'Laser 532 nm', [0, 7]);
    const bp = mk('filter', 42, 58, 0, { mode: 'bandpass', center: 532, width: 4 }, 'BP', [0, 7]);
    const dm = mk('dichroic', 78, 58, 45, { edge: 550, mode: 'shortpass' }, 'DM', [8, -3]);
    const fold = mk('vfold', 120, 58, 180, { dir: 'up' }, 'FM', [-7, 5]);
    const obj = mk('objective', 120, 58, 0, { fd: 3, mag: '100×' }, 'Objective 100×', [14, -4], { axis: 'up', z: 16 });
    const smp = mk('sample', 120, 58, 0, { look: 'chip', w: 1.4, h: 12, T: 0, emit: true, emitLambda: 575, emitFrac: 0.6 }, 'Sample', [12, -9], { axis: 'up', z: 16 + 4.5 + 3 + 0.7 });
    const lp = mk('filter', 78, 70, 90, { mode: 'longpass', edge: 545 }, 'LP', [7, 0]);
    const spec = mk('spectrometer', 78, 82, 90, { L: 12, H: 9 }, 'Spectrometer', [18, 0]);
    const note = mk('text', 120, 80, 0, { text: 'objective and sample stacked above the fold mirror\n(z = 16–24 mm, optical axis vertical)', size: 5.5, color: '#555555', italic: true });
    d.objects.push(laser, bp, dm, fold, obj, smp, lp, spec, note);
    return d;
  },
});

/* ---------- Michelson with live fringes (interference) ---------- */
T.list.push({
  id: 'fringes', name: 'Michelson with live fringes (animated)', desc: 'Piezo-driven mirror; the fringe panel follows the computed phase',
  build() {
    const d = base('nature-15', 120, 74, 'Michelson interferometer with fringes');
    const laser = mk('laser', 18, 42, 0, { lambda: 632.8, L: 18, H: 5.5 }, 'He–Ne 632.8 nm', [0, 7]);
    const bs = mk('bscube', 55, 42, 0, {}, 'BS', [-6.5, 6]);
    const m1 = mk('mirror', 55, 14, ang(UP, DN), {}, 'M1', [7, 0]);
    const m2 = mk('mirror', 84, 42, ang(R, L), { piezo: 0 }, 'M2 (piezo)', [0, -8]);
    const cam = mk('camera', 55, 64, 90, { L: 9, H: 8 }, 'Camera', [-11, 0]);
    const fr = mk('fringes', 95, 62, 0, { detector: cam.id, size: 16, density: 4 });
    const t = mk('text', 95, 50.5, 0, { text: 'camera image', size: 6, color: '#555555', italic: true });
    d.objects.push(laser, bs, m1, m2, cam, fr, t);
    d.animation.duration = 4;
    const k = (tt, nm) => ({ t: tt, ease: 'linear', x: m2.x, y: m2.y, rot: m2.rot, scale: 1, opacity: 1, props: Object.assign(U.deepClone(m2.props), { piezo: nm }) });
    d.animation.tracks[m2.id] = [k(0, 0), k(4, 632.8)];
    return d;
  },
});

/* ---------- Gaussian beam focusing ---------- */
T.list.push({
  id: 'gaussian', name: 'Gaussian beam telescope', desc: 'True waists and Rayleigh ranges (Gaussian model), labelled foci',
  build() {
    const d = base('nature-15', 120, 46, 'Gaussian beam telescope', { beamModel: 'gaussian', waistLabels: true, gaussMag: 10 });
    const laser = mk('laser', 14, 22, 0, { lambda: 1064, beamWidth: 1.6, L: 16, M2: 1.1 }, 'Laser 1064 nm, M² = 1.1', [0, 7.5]);
    const l1 = mk('lens', 34, 22, 0, { f: 200, d: 8 }, 'L1 (f = {f} mm)', [0, 7.5]);
    const l2 = mk('lens', 64, 22, 0, { f: 100, d: 8 }, 'L2 (f = {f} mm)', [0, 7.5]);
    const prof = mk('profiler', 104, 22, 0, {}, 'Beam profiler', [0, 7.5]);
    d.objects.push(laser, l1, l2, prof);
    return d;
  },
});

/* ---------- Ring resonator (integrated photonics) ---------- */
T.list.push({
  id: 'ring', name: 'Microring resonator scan (animated)', desc: 'Tunable laser through an add–drop ring; through and drop ports',
  build() {
    const d = base('nature-15', 120, 56, 'Microring resonator');
    const laser = mk('laser', 16, 25, 0, { lambda: 1550, L: 16, power: 1 }, 'Tunable laser\n1550 nm', [0, 8]);
    const chip = mk('ringchip', 60, 25 + 0.22 * 9, 0, { w: 18, h: 9, drop: true, kappa: 0.08, loss: 0.99, lam0: 1550, fsr: 4, detune: 0 }, 'Si₃N₄ microring', [0, -8.5]);
    const pd1 = mk('pd', 94, 25, 0, {}, 'PD (through)', [0, 6]);
    const yDrop = chip.y + (-0.22 * 9 + 2 * Math.min(0.22 * 9, 18 * 0.14) + 0.7);
    const m = mk('mirror', 38, yDrop, ang(L, DN), {}, 'M', [-6, 0]);
    const pd2 = mk('pd', 38, 46, 90, {}, 'PD (drop)', [11, 0]);
    d.objects.push(laser, chip, pd1, m, pd2);
    d.animation.duration = 6;
    const k = (tt, det) => ({ t: tt, ease: 'linear', x: chip.x, y: chip.y, rot: 0, scale: 1, opacity: 1, props: Object.assign(U.deepClone(chip.props), { detune: det }) });
    d.animation.tracks[chip.id] = [k(0, -0.5), k(6, 0.5)];
    return d;
  },
});

/* ---------- Device sketch: metasurface absorber ---------- */
T.list.push({
  id: 'absorber', name: 'Device sketch · metasurface absorber', desc: 'MIM grating stack with Λ and a, layer key, incident light, detector',
  build() {
    const d = base('nature-2', 150, 72, 'Metasurface absorber', { polarization: false });
    const stack = mk('layers', 62, 52, 0, { W: 52, D: 26, period: 10, amp: 1.6, duty: 0.32 });
    const bulb = mk('bulb', 16, 18, 0, { r: 5 });
    const inc = mk('arrow', 24, 22, 0, { dx: 22, dy: 16, width: 1.4, headSize: 2.4, color: '#c0392b', label: 'Incident light', labelSize: 6.5 });
    const th = mk('angle', 47, 39, 0, { r: 7, a1: -90, a2: -144, label: 'θ_i', refLen: 16 });
    const cyl = mk('cylinder3d', 128, 22, 0, { L: 22, r: 8, text: 'Detector' });
    const out = mk('arrow', 96, 26, 0, { dx: 18, dy: -4, width: 1, headSize: 2, color: '#555b66', dash: true, label: 'Reflected', labelSize: 6 });
    const pa = mk('panel', 4, 7, 0, { text: 'a' });
    d.objects.push(stack, bulb, inc, th, cyl, out, pa);
    return d;
  },
});

/* ---------- Instrument sketch: FTIR beam path (ribbon beams) ---------- */
T.list.push({
  id: 'ftir', name: 'FTIR beam path (ribbon beams)', desc: 'Source → Michelson box → flat, cylindrical and parabolic mirrors → detector',
  build() {
    const d = base('nature-2', 150, 80, 'FTIR beam path', { beamStyle: 'ribbon', ribbonWidth: 3.6, beamArrows: true, polarization: false });
    const src = mk('lamp', 14, 18, 0, { lmin: 640, lmax: 700 }, 'IR source', [0, 7]);
    const mod = mk('module', 46, 18, 0, { title: 'Michelson\ninterferometer', inside: 'michelson', L: 26, H: 18, color: '#ffffff' });
    const m1 = mk('mirror', 82, 18, ang(R, DN), { d: 10 }, 'Flat mirror', [9, -4]);
    const cm = mk('cmirror', 82, 52, ang(DN, R), { d: 12, t: 1.8, f: 2000 }, 'Cylindrical mirror', [-12, 6]);
    const pm = mk('oap', 122, 52, ang(R, UP), { d: 16, f: 4000 }, 'Parabolic mirror', [4, 13]);
    const det = mk('pd', 122, 20, -90, {}, 'Detector (MCT)', [10, -2]);
    const pa = mk('panel', 4, 7, 0, { text: 'b' });
    d.objects.push(src, mod, m1, cm, pm, det, pa);
    RNBX.labels.arrange2D(d);
    return d;
  },
});

/* ---------- Thermal emission measurement ---------- */
T.list.push({
  id: 'thermal', name: 'Thermal emission setup (illustration)', desc: 'Hot plate, sample on a tilt stage, IR camera and 0–70° observation fan',
  build() {
    const d = base('nature-2', 150, 88, 'Thermal emission setup', { polarization: false });
    const jack = mk('labjack', 44, 78, 0, { W: 34, Hh: 22, tilt: 0, tiltTop: false });
    const hp = mk('hotplate', 44, 52, 0, { W: 30, Hh: 8, D: 20, temp: '100 °C' });
    const smp = mk('block3d', 47, 41.5, 0, { W: 12, Hh: 1.6, D: 9, color: '#9c1d1d', text: '' });
    const lab1 = mk('text', 40, 33, 0, { text: 'MSA', size: 7, bold: true, anchor: 'middle' });
    const fan = mk('fan', 50, 40, 0, { r: 30, zero: 0, sense: 'cw', angles: '0,10,20,30,40,50,60,70' });
    const cam = mk('ircam', 128, 26, 0, { W: 16, Hh: 9, D: 12 });
    const pa = mk('panel', 4, 7, 0, { text: 'c' });
    d.objects.push(jack, hp, smp, lab1, fan, cam, pa);
    return d;
  },
});

/* ---------- SPR sensor (Kretschmann) ---------- */
T.list.push({
  id: 'spr', name: 'SPR sensor (Kretschmann prism)', desc: 'Halogen lamp, polariser, inverted prism with sensor chip and flow cell, fibre to spectrometer',
  build() {
    const d = base('nature-2', 160, 92, 'SPR sensor setup', { polarization: true });
    const a = -35, dir = [Math.cos(U.rad(a)), Math.sin(U.rad(a))];
    const at = (p0, t) => [U.round(p0[0] + dir[0] * t, 2), U.round(p0[1] + dir[1] * t, 2)];
    const p0 = [16, 76];
    const lamp = mk('lamp', p0[0], p0[1], a, { lmin: 610, lmax: 690 }, 'THL', [0, 8]);
    const l1 = mk('lens', ...at(p0, 14), a, { f: 400 }, 'Fibre lens', [-3, 8]);
    const ap = mk('iris', ...at(p0, 26), a, { r: 1 }, 'Aperture', [-3, 8]);
    const pol = mk('polarizer', ...at(p0, 38), a, { angle: 0 }, 'Polariser', [-3, 8]);
    const prism = mk('prism', 74, 40, 0, { s: 20, apex: 90, inverted: true, chip: true, mat: 'SF11' }, 'Prism', [0, 13]);
    const fc = mk('flowcell', 74, 28.6, 0, { W: 26, Hh: 4, D: 12, title: '' });
    d.objects.push(lamp, l1, ap, pol, prism, fc);
    // the exit beam leaves the prism heading down-right: place the collection optics on it
    const tr = RNBX.trace(d), last = tr.segments.filter(s => !s.ghost && s.b[0] > 82).sort((x, y) => y.len - x.len)[0];
    const e = last ? last.a : [90, 45], ed = last ? U.v.norm(U.v.sub(last.b, last.a)) : [0.8, 0.6], er = U.round(U.deg(Math.atan2(ed[1], ed[0])), 2);
    const q = t => [U.round(e[0] + ed[0] * t, 2), U.round(e[1] + ed[1] * t, 2)];
    const obj = mk('objective', ...q(10), er, {}, 'Objective', [9, -5]);
    const fc1 = mk('coupler', ...q(22), er + 180, {}, 'Fibre', [9, -4]);
    const fc2 = mk('coupler', 112, 84, 0, {}, '', null);
    const spec = mk('spectrometer', 132, 84, 0, { L: 18, H: 9 }, 'Spectrometer', [0, -7.5]);
    const pc = mk('laptop', 138, 58, 0, { W: 22 });
    const fib = link('fiber', fc1, fc2, { bend: 0.4 });
    const usb = link('wire', spec, pc, { route: 'straight' });
    const pa = mk('panel', 4, 7, 0, { text: 'd' });
    d.objects.push(obj, fc1, fc2, spec, pc, fib, usb, pa);
    RNBX.labels.arrange2D(d);
    return d;
  },
});

/* ---------- Graphical abstract: SHG in 3D ---------- */
T.list.push({
  id: 'ga-shg', name: 'Graphical abstract · SHG in 3D', desc: 'Dark 3D table, glowing beams, orbiting camera animation',
  build() {
    const d = base('ga-els', 112.4, 44.96, 'Frequency doubling graphical abstract', { mode: '3d', beamGlow: true, fontSizePt: 6, polarization: false });
    d.page.background = 'dark';
    Object.assign(d.view3d, { yaw: -24, pitch: 30, zoom: 1.12, panY: 2.5, beamHeight: 5, tableColor: '#232733' });
    const laser = mk('laser', 14, 26, 0, { lambda: 1064, pulsed: false, L: 16, H: 6, text: '' }, 'Nd:YAG 1064 nm', [0, 7]);
    const l1 = mk('lens', 36, 26, 0, { f: 150 }, 'L1', [0, 7]);
    const nc = mk('crystal', 51, 26, 0, { eff: 0.5, L: 4.5, H: 4.5 }, 'BBO', [0, 7]);
    const l2 = mk('lens', 66, 26, 0, { f: 150 }, 'L2', [0, 7]);
    const dm = mk('dichroic', 80, 26, 45, { mode: 'shortpass', edge: 800 }, 'DM', [0, 7]);
    const bd = mk('beamdump', 80, 9, -90, { s: 4 });
    const cam = mk('camera', 101, 26, 0, { L: 9, H: 8 }, 'Camera', [0, 7]);
    const title = mk('text', 4, 6, 0, { text: 'Second-harmonic generation', size: 10, bold: true, color: '#ffffff', anchor: 'start' });
    const sub = mk('text', 4, 11.2, 0, { text: 'ω + ω → 2ω   ·   1064 nm → 532 nm', size: 6.5, color: '#b9c3d6', anchor: 'start' });
    d.objects.push(laser, l1, nc, l2, dm, bd, cam, title, sub);
    d.animation.duration = 8;
    d.animation.flow = true;
    d.animation.flowSpeed = 30;
    d.animation.camera = [{ t: 0, ease: 'inout', yaw: -34, pitch: 28, zoom: 1.12, panX: 0, panY: 2.5 }, { t: 4, ease: 'inout', yaw: -10, pitch: 36, zoom: 1.2, panX: 0, panY: 2.5 }, { t: 8, ease: 'inout', yaw: -34, pitch: 28, zoom: 1.12, panX: 0, panY: 2.5 }];
    return d;
  },
});
})();
