/* ═══════════════════════════════════════════════════════════
   RNBeamX — anim/presets.js
   One-click animations. Each preset finds a suitable part in the
   figure (or uses the selected one), asks for two or three plain
   settings, and writes ordinary keyframes, so the result can be
   played, exported, combined with other presets, fine-tuned in the
   timeline by hand, and undone with Ctrl+Z.

   A preset:
     { id, group, name, desc, icon,
       types: part types it can animate (omit for whole-figure presets),
       params: [{ key, label, type, min, max, step, unit, def(doc, target) }],
       apply(doc, target, o) → list of what it changed (for "remove") }
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, A = RNBX.anim, S = RNBX.state, lib = RNBX.lib;
const P = RNBX.animPresets = { list: [] };
const add = p => P.list.push(p);
P.GROUPS = ['Presentation', 'Light', 'Optics'];

/* ---------- helpers ---------- */
const dur = { key: 'dur', label: 'Length', type: 'number', unit: 's', min: 0.5, max: 120, step: 0.5, def: d => (isStill(d) ? 6 : d.animation.duration) };
const bounce = { key: 'bounce', label: 'Back and forth', type: 'bool', def: () => true };
const isStill = doc => { const an = doc.animation; return !A.hasAnimation(doc) && !an.flow && !an.pulses && !an.reveal; };
/* the first animation sets the length; later ones only extend it */
const fitDuration = (doc, D, fresh) => { const an = doc.animation; an.duration = fresh ? D : Math.max(an.duration, D); an.loop = true; };
/* keys for a value that goes a → b (→ a) over D seconds */
const sweep = (D, a, b, back, make) => back
  ? [Object.assign({ t: 0 }, make(a)), Object.assign({ t: D / 2 }, make(b)), Object.assign({ t: D }, make(a))]
  : [Object.assign({ t: 0 }, make(a)), Object.assign({ t: D, ease: 'linear' }, make(b))];
const propCurve = (id, key, keys) => { A.applyCurve(id, keys); return [{ kind: 'field', id, field: 'props.' + key }]; };
const camOf = doc => doc.view3d;
const optical = doc => doc.objects.filter(o => { const d = lib.get(o.type); return d && !o.hidden && !d.annotation && !d.connection && !d.special && !d.under; });
/* parts in the order the light reaches them */
const beamOrder = doc => {
  const tr = RNBX.trace(doc), arr = A.arrival(doc, tr), L = A.pathLength(tr) || 1;
  const parts = optical(doc).filter(o => arr[o.id] != null).sort((a, b) => arr[a.id] - arr[b.id]);
  return { parts, arr, L, rest: optical(doc).filter(o => arr[o.id] == null) };
};
const along = (o, d) => { const ax = U.dirToWorld(o, [1, 0]); return [o.x + ax[0] * d, o.y + ax[1] * d]; };
const to3d = doc => { if (doc.style.mode !== '3d') { doc.style.mode = '3d'; return true; } return false; };
const labelOf = o => (o.label && o.label.text ? RNBX.text.fill(o.label.text, o.props).replace(/\n/g, ' ') : '') || lib.get(o.type).name;
P.labelOf = labelOf;

/* which part a preset will animate: the selected one if it fits, else the first suitable one */
P.candidates = (p, doc) => (p.types ? doc.objects.filter(o => !o.hidden && p.types.includes(o.type) && (!p.accept || p.accept(o))) : []);
P.target = (p, doc, sel) => {
  if (!p.types) return null;
  const c = P.candidates(p, doc);
  const s = (sel || []).map(id => c.find(o => o.id === id)).find(Boolean);
  return s || (p.prefer ? p.prefer(c) : c[0]) || null;
};
P.available = (p, doc) => (p.types ? P.candidates(p, doc).length > 0 : (p.ok ? p.ok(doc) : true));

/* apply one preset (one undo step) and remember it so it can be listed and removed */
P.apply = (p, target, o) => {
  const doc = S.doc;
  RNBX.history.checkpoint();
  if (S.playing) A.pause();
  A.capture();
  const D = o.dur || 6, fresh = isStill(doc);
  const changes = p.apply(doc, target, o, D) || [];
  fitDuration(doc, D, fresh);
  doc.animation.applied = (doc.animation.applied || []).concat([{ uid: U.uid(), preset: p.id, name: p.name + (target ? ' · ' + labelOf(target) : ''), changes }]);
  A.setTime(0);
  RNBX.emit('document');
  RNBX.emit('animation');
  RNBX.changed();
  U.track('anim-' + p.id);
};
P.remove = uid => {
  const an = S.doc.animation, i = (an.applied || []).findIndex(a => a.uid === uid);
  if (i < 0) return;
  RNBX.history.checkpoint();
  if (S.playing) A.pause();
  an.applied[i].changes.forEach(c => {
    if (c.kind === 'field') A.removeField(c.id, c.field);
    else if (c.kind === 'flag') an[c.key] = c.was;
    else if (c.kind === 'camera') an.camera = [];
    else if (c.kind === 'reveal') delete an.reveal;
    else if (c.kind === 'mode') S.doc.style.mode = c.was;
    else if (c.kind === 'object') S.doc.objects = S.doc.objects.filter(o => o.id !== c.id);
    else if (c.kind === 'prop') { const o = S.doc.objects.find(q => q.id === c.id); if (o) o.props[c.key] = c.was; }
    else if (c.kind === 'page') Object.assign(S.doc.page, c.was);
  });
  an.applied.splice(i, 1);
  A.setTime(0);
  RNBX.emit('document'); RNBX.emit('animation'); RNBX.changed();
};
P.clearAll = () => {
  RNBX.history.checkpoint();
  if (S.playing) A.pause();
  const an = S.doc.animation;
  an.tracks = {}; an.camera = []; an.flow = false; an.pulses = false; delete an.reveal; an.applied = [];
  A.setTime(0);
  RNBX.emit('document'); RNBX.emit('animation'); RNBX.changed();
};

/* small line icons (24 × 24) */
const I = {
  flow: '<path d="M3 12h13"/><path d="M13 8l4 4-4 4"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="10" cy="12" r="1" fill="currentColor"/>',
  pulse: '<path d="M2 14h4l2-6 2 10 2-8 2 4h8"/>',
  on: '<path d="M4 12h6"/><path d="M10 12h10" stroke-dasharray="2 2"/><rect x="2" y="9" width="3" height="6" rx="1"/>',
  rainbow: '<path d="M4 18a8 8 0 0 1 16 0"/><path d="M7 18a5 5 0 0 1 10 0"/><path d="M10 18a2 2 0 0 1 4 0"/>',
  blink: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/><circle cx="12" cy="12" r="3"/>',
  rotate: '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/><path d="M12 7v10"/>',
  polar: '<circle cx="12" cy="12" r="8"/><path d="M8 6v12M12 4v16M16 6v12"/>',
  scan: '<path d="M4 18L12 6l8 12"/><path d="M12 6v12" stroke-dasharray="2 2"/>',
  fringes: '<path d="M5 4v16M9 4v16M13 4v16M17 4v16"/>',
  delay: '<path d="M4 8h12l3 4-3 4H4"/><path d="M8 20h8M8 20l2-2M8 20l2 2"/>',
  focus: '<path d="M3 6l9 6-9 6"/><path d="M21 6l-9 6 9 6"/>',
  shutter: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 12h16"/>',
  aom: '<rect x="7" y="6" width="10" height="12"/><path d="M2 12h5M17 12h5M17 12l5-4"/>',
  field: '<path d="M4 6l16 6M4 12h16M4 18l16-6"/>',
  sensor: '<path d="M3 20h18M3 4v16"/><path d="M5 16h4c2 0 2-8 5-8h5"/><circle cx="19" cy="8" r="1.4" fill="currentColor"/>',
  binding: '<path d="M3 18h18"/><circle cx="7" cy="15" r="2"/><circle cx="12" cy="13" r="2"/><circle cx="17" cy="15" r="2"/>',
  orbit: '<ellipse cx="12" cy="12" rx="9" ry="4"/><path d="M12 3v18"/><path d="M19 9l2 3-3 1"/>',
  zoom: '<circle cx="10" cy="10" r="6"/><path d="M15 15l6 6M10 7v6M7 10h6"/>',
  build: '<rect x="3" y="14" width="5" height="5"/><rect x="10" y="9" width="5" height="10"/><rect x="17" y="4" width="4" height="15"/>',
  spot: '<path d="M12 2l3 7H9z"/><ellipse cx="12" cy="18" rx="7" ry="3"/>',
  lift: '<path d="M3 16l9 4 9-4-9-4z"/><path d="M12 12V3M9 6l3-3 3 3"/>',
};
P.icon = id => `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[id] || ''}</svg>`;

/* ================= Light ================= */
add({ id: 'flow', group: 'Light', name: 'Light flow', icon: 'flow', desc: 'Light streams along every beam.',
  params: [{ key: 'speed', label: 'Speed', type: 'number', unit: 'mm/s', min: 1, max: 500, step: 1, def: d => d.animation.flowSpeed || 25 }, dur],
  apply(doc, t, o) { const an = doc.animation, ch = [{ kind: 'flag', key: 'flow', was: !!an.flow }]; an.flow = true; an.flowSpeed = o.speed; return ch; } });
add({ id: 'pulses', group: 'Light', name: 'Pulse train', icon: 'pulse', desc: 'Short pulses travel through the setup (ultrafast look).',
  params: [{ key: 'speed', label: 'Speed', type: 'number', unit: 'mm/s', min: 1, max: 500, step: 1, def: d => d.animation.flowSpeed || 25 },
    { key: 'shape', label: 'Pulse shape', type: 'select', options: RNBX.beams.PULSE_SHAPES, def: d => RNBX.beams.pulseShape(d) }, dur],
  apply(doc, t, o) { const an = doc.animation, ch = [{ kind: 'flag', key: 'pulses', was: !!an.pulses }]; an.pulses = true; an.flowSpeed = o.speed; if (o.shape) an.pulseShape = o.shape; return ch; } });
add({ id: 'switchon', group: 'Light', name: 'Switch on', icon: 'on', desc: 'The beam grows out of the source and runs through the setup.',
  ok: d => d.objects.some(o => lib.get(o.type) && lib.get(o.type).source),
  params: [{ key: 'grow', label: 'Growing time', type: 'number', unit: 's', min: 0.5, max: 60, step: 0.5, def: () => 3 }, dur],
  apply(doc, t, o, D) { doc.animation.reveal = { t0: 0.2, t1: Math.min(D, 0.2 + o.grow) }; return [{ kind: 'reveal' }]; } });
add({ id: 'wavelength', group: 'Light', name: 'Wavelength sweep', icon: 'rainbow', desc: 'A tunable source sweeps its colour; prisms and gratings fan out live.', types: ['laser', 'led'],
  params: [{ key: 'a', label: 'From', type: 'number', unit: 'nm', min: 150, max: 12000, step: 1, def: () => 450 }, { key: 'b', label: 'To', type: 'number', unit: 'nm', min: 150, max: 12000, step: 1, def: () => 700 }, bounce, dur],
  apply(doc, t, o, D) { return propCurve(t.id, 'lambda', sweep(D, o.a, o.b, o.bounce, v => ({ props: { lambda: v } }))); } });
add({ id: 'blink', group: 'Light', name: 'Laser on / off', icon: 'blink', desc: 'The source switches off and on again (blinks).', types: ['laser', 'led', 'lamp'],
  params: [{ key: 'n', label: 'Blinks', type: 'number', min: 1, max: 20, step: 1, def: () => 2 }, dur],
  apply(doc, t, o, D) {
    const P0 = t.props.power || 1, keys = [{ t: 0, props: { power: P0 } }], n = Math.max(1, Math.round(o.n)), dt = D / n;
    for (let i = 0; i < n; i++) { keys.push({ t: i * dt + dt * 0.45, ease: 'step', props: { power: 0 } }); keys.push({ t: i * dt + dt * 0.9, ease: 'step', props: { power: P0 } }); }
    return propCurve(t.id, 'power', keys);
  } });

/* ================= Optics ================= */
add({ id: 'waveplate', group: 'Optics', name: 'Rotate wave plate', icon: 'rotate', desc: 'A λ/2 or λ/4 plate turns: power moves between the outputs of a PBS.', types: ['hwp', 'qwp', 'eom'],
  params: [{ key: 'a', label: 'From', type: 'number', unit: '°', min: -360, max: 360, step: 1, def: (d, t) => (t ? t.props.angle || 0 : 0) }, { key: 'b', label: 'To', type: 'number', unit: '°', min: -360, max: 360, step: 1, def: (d, t) => (t ? (t.props.angle || 0) + (t.type === 'qwp' ? 90 : 45) : 45) }, bounce, dur],
  apply(doc, t, o, D) { return propCurve(t.id, 'angle', sweep(D, o.a, o.b, o.bounce, v => ({ props: { angle: v } }))); } });
add({ id: 'polariser', group: 'Optics', name: 'Rotate polariser', icon: 'polar', desc: 'The transmitted power follows Malus’s law as the polariser turns.', types: ['polarizer'],
  params: [{ key: 'a', label: 'From', type: 'number', unit: '°', min: -360, max: 360, step: 1, def: (d, t) => (t ? t.props.angle || 0 : 0) }, { key: 'b', label: 'To', type: 'number', unit: '°', min: -360, max: 360, step: 1, def: (d, t) => (t ? (t.props.angle || 0) + 90 : 90) }, bounce, dur],
  apply(doc, t, o, D) { return propCurve(t.id, 'angle', sweep(D, o.a, o.b, o.bounce, v => ({ props: { angle: v } }))); } });
add({ id: 'scan', group: 'Optics', name: 'Mirror / galvo scan', icon: 'scan', desc: 'A scanning mirror sweeps the beam across the sample.', types: ['galvo', 'kmount', 'mirror'],
  prefer: c => c.find(o => o.type === 'galvo') || c.find(o => o.type === 'kmount') || c[0],
  params: [{ key: 'amp', label: 'Scan angle ±', type: 'number', unit: '°', min: 0.05, max: 20, step: 0.05, def: () => 1 }, dur],
  apply(doc, t, o, D) {
    const a = o.amp;
    if (t.type === 'galvo') { const c = t.props.scan || 0; return propCurve(t.id, 'scan', [{ t: 0, props: { scan: c } }, { t: D / 4, props: { scan: c + a } }, { t: 3 * D / 4, props: { scan: c - a } }, { t: D, props: { scan: c } }]); }
    if (t.type === 'kmount') { const c = t.props.tilt || 0; return propCurve(t.id, 'tilt', [{ t: 0, props: { tilt: c } }, { t: D / 4, props: { tilt: c + a } }, { t: 3 * D / 4, props: { tilt: c - a } }, { t: D, props: { tilt: c } }]); }
    const r = t.rot || 0; A.applyCurve(t.id, [{ t: 0, rot: r }, { t: D / 4, rot: r + a }, { t: 3 * D / 4, rot: r - a }, { t: D, rot: r }]); return [{ kind: 'field', id: t.id, field: 'rot' }];
  } });
add({ id: 'fringes', group: 'Optics', name: 'Piezo fringes', icon: 'fringes', desc: 'A piezo moves a mirror by a wavelength: interference fringes run across the detector.', types: ['mirror', 'kmount', 'retro'],
  prefer: c => c.find(o => o.props.piezo) || c[0],
  params: [{ key: 'nm', label: 'Travel', type: 'number', unit: 'nm', min: 10, max: 100000, step: 10, def: d => { const l = d.objects.find(q => q.type === 'laser'); return l ? l.props.lambda : 633; } }, bounce, dur],
  apply(doc, t, o, D) { const c = t.props.piezo || 0; return propCurve(t.id, 'piezo', sweep(D, c, c + o.nm, o.bounce, v => ({ props: { piezo: v } }))); } });
add({ id: 'delay', group: 'Optics', name: 'Delay-line scan', icon: 'delay', desc: 'The retroreflector (and its stage) moves back and forth, changing the path length.', types: ['retro'],
  params: [{ key: 'd', label: 'Travel', type: 'number', unit: 'mm', min: 0.5, max: 200, step: 0.5, def: () => 15 }, dur],
  apply(doc, t, o, D) {
    const ax = U.dirToWorld(t, [-1, 0]), ch = [];
    const move = q => { A.applyCurve(q.id, [{ t: 0, x: q.x, y: q.y }, { t: D / 2, x: q.x + ax[0] * o.d, y: q.y + ax[1] * o.d }, { t: D, x: q.x, y: q.y }]); ch.push({ kind: 'field', id: q.id, field: 'x' }, { kind: 'field', id: q.id, field: 'y' }); };
    move(t);
    doc.objects.filter(q => q.type === 'stage' && Math.hypot(q.x - t.x, q.y - t.y) < 8).forEach(move);
    return ch;
  } });
add({ id: 'focus', group: 'Optics', name: 'Focus sweep', icon: 'focus', desc: 'A screen, camera, sample or lens moves along the beam through the focus.', types: ['screen', 'camera', 'profiler', 'sample', 'pd', 'lens', 'objective'],
  prefer: c => c.find(o => ['screen', 'camera', 'profiler'].includes(o.type)) || c[0],
  params: [{ key: 'd', label: 'Travel ±', type: 'number', unit: 'mm', min: 0.1, max: 100, step: 0.1, def: () => 4 }, dur],
  apply(doc, t, o, D) { const p1 = along(t, -o.d), p2 = along(t, o.d); A.applyCurve(t.id, [{ t: 0, x: t.x, y: t.y }, { t: D / 4, x: p1[0], y: p1[1] }, { t: 3 * D / 4, x: p2[0], y: p2[1] }, { t: D, x: t.x, y: t.y }]); return [{ kind: 'field', id: t.id, field: 'x' }, { kind: 'field', id: t.id, field: 'y' }]; } });
add({ id: 'shutter', group: 'Optics', name: 'Shutter open / close', icon: 'shutter', desc: 'The beam shutter closes and opens.', types: ['shutter'],
  params: [{ key: 'n', label: 'Closings', type: 'number', min: 1, max: 20, step: 1, def: () => 2 }, dur],
  apply(doc, t, o, D) { const keys = [{ t: 0, props: { open: true } }], n = Math.max(1, Math.round(o.n)), dt = D / n; for (let i = 0; i < n; i++) { keys.push({ t: i * dt + dt * 0.4, ease: 'step', props: { open: false } }); keys.push({ t: i * dt + dt * 0.85, ease: 'step', props: { open: true } }); } return propCurve(t.id, 'open', keys); } });
add({ id: 'aom', group: 'Optics', name: 'AOM frequency sweep', icon: 'aom', desc: 'The RF drive changes, so the diffracted beam steers.', types: ['aom'],
  params: [{ key: 'a', label: 'From', type: 'number', unit: 'MHz', min: 1, max: 2000, step: 1, def: () => 60 }, { key: 'b', label: 'To', type: 'number', unit: 'MHz', min: 1, max: 2000, step: 1, def: () => 140 }, bounce, dur],
  apply(doc, t, o, D) { t.props.drive = 'rf'; return propCurve(t.id, 'rf', sweep(D, o.a, o.b, o.bounce, v => ({ props: { rf: v, drive: 'rf' } }))); } });
add({ id: 'field', group: 'Optics', name: 'Field-angle sweep', icon: 'field', desc: 'A ray bundle tilts, so the image point moves (imaging diagrams).', types: ['raysource'],
  params: [{ key: 'amp', label: 'Angle ±', type: 'number', unit: '°', min: 0.1, max: 45, step: 0.5, def: () => 6 }, dur],
  apply(doc, t, o, D) { const c = t.props.tilt || 0; return propCurve(t.id, 'tilt', [{ t: 0, props: { tilt: c } }, { t: D / 4, props: { tilt: c + o.amp } }, { t: 3 * D / 4, props: { tilt: c - o.amp } }, { t: D, props: { tilt: c } }]); } });
add({ id: 'binding', group: 'Optics', name: 'Binding / film growth', icon: 'binding', desc: 'An SPR chip sees the analyte index rise (the dip shifts), or a coating grows.', types: ['prism', 'ncoat', 'nslab'],
  accept: o => (o.type === 'prism' ? !!o.props.chip : true),
  prefer: c => c.find(o => o.type === 'prism') || c.find(o => o.type === 'ncoat') || c[0],
  params: [{ key: 'b', label: 'Change to', type: 'number', min: 0, max: 5000, step: 0.001, def: (d, t) => (t && t.type === 'prism' ? 1.36 : t ? Math.round((t.props.nm || 50) * 2) : 100) }, bounce, dur],
  apply(doc, t, o, D) {
    if (t.type === 'prism') { const a = t.props.analyte === 'custom' ? t.props.analyteN : 1.333; t.props.analyte = 'custom'; t.props.analyteN = a; return propCurve(t.id, 'analyteN', sweep(D, a, o.b, o.bounce, v => ({ props: { analyteN: v, analyte: 'custom' } }))); }
    const a = t.props.nm || 50; return propCurve(t.id, 'nm', sweep(D, a, o.b, o.bounce, v => ({ props: { nm: v } })));
  } });

/* SPR real-time sensing: the analyte index follows a measurement-like
   profile; a sensorgram panel tracks the resonance while it plays */
add({ id: 'sprsense', group: 'Optics', name: 'SPR sensing (sensorgram)', icon: 'sensor', desc: 'A sensing run on the SPR chip: the analyte index changes (binding, calibration steps or a sweep) and a sensorgram tracks the resonance shift live.', types: ['prism'],
  accept: o => !!o.props.chip,
  params: [{ key: 'profile', label: 'Run', type: 'select', options: [['binding', 'Binding: baseline, association, dissociation'], ['steps', 'Calibration steps (injections)'], ['sweep', 'Linear index sweep']], def: () => 'binding' },
    { key: 'n0', label: 'Baseline index', type: 'number', min: 1, max: 2, step: 0.0001, def: (d, t) => { const v = t ? RNBX.plotData.analyteN(t) : 1.333; return U.round(v == null ? 1.333 : v, 4); } },
    { key: 'dn', label: 'Index change Δn', type: 'number', min: -0.5, max: 0.5, step: 0.0005, def: () => 0.01 },
    { key: 'steps', label: 'Injections (steps only)', type: 'number', min: 1, max: 10, step: 1, def: () => 4 },
    { key: 'panel', label: 'Panels', type: 'select', options: [['add', 'Add a sensorgram and mark the dip'], ['none', 'Keyframes only']], def: () => 'add' },
    Object.assign({}, dur, { def: d => (isStill(d) ? 12 : d.animation.duration) })],
  apply(doc, t, o, D) {
    const n0 = +o.n0, dn = +o.dn, k = (tt, v, ease) => ({ t: U.round(tt, 4), ease: ease || 'linear', props: { analyteN: U.round(v, 6), analyte: 'custom' } });
    const keys = [];
    if (o.profile === 'sweep') keys.push(k(0, n0), k(D, n0 + dn));
    else if (o.profile === 'steps') {
      const m = Math.max(1, Math.round(o.steps)), dt = D / (m + 1), ramp = Math.min(0.4, dt * 0.2);
      keys.push(k(0, n0));
      for (let i = 1; i <= m; i++) { keys.push(k(i * dt, n0 + dn * (i - 1) / m), k(i * dt + ramp, n0 + dn * i / m, 'inout')); }
      keys.push(k(D, n0 + dn));
    } else {
      // Langmuir-like: rise 1 − e^(−t/τ) while analyte flows, then e^(−t/τ) decay in buffer
      const t1 = D * 0.12, t2 = D * 0.55, tau1 = (t2 - t1) / 3.2, tau2 = (D - t2) / 2.2, sat = 1 - Math.exp(-(t2 - t1) / tau1), N = 24;
      keys.push(k(0, n0), k(t1, n0));
      for (let i = 1; i <= N; i++) { const tt = t1 + (t2 - t1) * i / N; keys.push(k(tt, n0 + dn * (1 - Math.exp(-(tt - t1) / tau1)))); }
      for (let i = 1; i <= N; i++) { const tt = t2 + (D - t2) * i / N; keys.push(k(tt, n0 + dn * sat * (0.25 + 0.75 * Math.exp(-(tt - t2) / tau2)))); }
    }
    t.props.analyte = 'custom'; t.props.analyteN = n0;
    const ch = propCurve(t.id, 'analyteN', keys);
    if (o.panel === 'add') ch.push(...sensorPanels(doc, t));
    return ch;
  } });
/* a sensorgram for the chip (and the live dip marker on its curve panel) */
const sensorPanels = (doc, t) => {
  const ch = [], curve = doc.objects.find(q => q.type === 'plot' && q.props.link === t.id && q.props.mode !== 'sensor');
  if (curve && !curve.props.mark) { curve.props.mark = true; ch.push({ kind: 'prop', id: curve.id, key: 'mark', was: false }); }
  if (!doc.objects.some(q => q.type === 'plot' && q.props.link === t.id && q.props.mode === 'sensor') && RNBX.plotData.addSensorPanel) {
    const before = new Set(doc.objects.map(q => q.id)), page = { width: doc.page.width, height: doc.page.height, preset: doc.page.preset };
    RNBX.plotData.addSensorPanel(t, { quiet: true });
    doc.objects.filter(q => !before.has(q.id)).forEach(q => ch.push({ kind: 'object', id: q.id }));
    if (doc.page.height !== page.height || doc.page.width !== page.width) ch.push({ kind: 'page', was: page });
  }
  return ch;
};

/* ================= Presentation ================= */
add({ id: 'orbit', group: 'Presentation', name: '3D rotation (turntable)', icon: 'orbit', desc: 'The whole setup turns on its optical table: a full 360° turn or a gentle swing.',
  params: [{ key: 'kind', label: 'Motion', type: 'select', options: [['full', 'Full 360° turn'], ['swing', 'Swing left and right'], ['rise', 'Turn and rise (top view at the end)']], def: () => 'full' },
    { key: 'pitch', label: 'Elevation', type: 'number', unit: '°', min: 10, max: 85, step: 1, def: d => Math.round(d.view3d.pitch || 34) },
    { key: 'dir', label: 'Direction', type: 'select', options: [['1', 'Anticlockwise'], ['-1', 'Clockwise']], def: () => '1' },
    { key: 'labels', label: 'Labels while turning', type: 'select', options: [['follow', 'Above each part'], ['hide', 'Hidden'], ['keep', 'As placed']], def: d => d.animation.labels3d || 'follow' },
    Object.assign({}, dur, { def: () => 12 })],
  apply(doc, t, o, D) {
    const ch = [{ kind: 'camera' }], was = doc.style.mode;
    if (to3d(doc)) ch.push({ kind: 'mode', was });
    const v = camOf(doc), y0 = v.yaw || -28, s = +o.dir || 1, z = v.zoom || 1, base = { pitch: o.pitch, zoom: z, panX: 0, panY: 0 };
    ch.push({ kind: 'flag', key: 'labels3d', was: doc.animation.labels3d }); doc.animation.labels3d = o.labels || 'follow';
    if (o.kind === 'swing') doc.animation.camera = [Object.assign({ t: 0, yaw: y0 }, base), Object.assign({ t: D / 2, yaw: y0 + 50 * s }, base), Object.assign({ t: D, yaw: y0 }, base)];
    else if (o.kind === 'rise') doc.animation.camera = [Object.assign({ t: 0, yaw: y0 }, base), Object.assign({ t: D * 0.7, yaw: y0 + 270 * s, ease: 'inout' }, base), Object.assign({ t: D, yaw: y0 + 360 * s }, base, { pitch: 88 })];
    else doc.animation.camera = [Object.assign({ t: 0, yaw: y0 }, base), Object.assign({ t: D, yaw: y0 + 360 * s, ease: 'linear' }, base)];
    return ch;
  } });
add({ id: 'zoom', group: 'Presentation', name: 'Zoom to a part', icon: 'zoom', desc: 'The 3D view flies in to one part (e.g. the objective) and back out.',
  types: null, ok: d => optical(d).length > 0,
  params: [{ key: 'part', label: 'Part', type: 'part', def: (d) => { const sel = S.selection.map(id => optical(d).find(o => o.id === id)).find(Boolean); const c = sel || optical(d).find(o => ['objective', 'sample', 'filtercube'].includes(o.type)) || optical(d)[0]; return c ? c.id : ''; } },
    { key: 'z', label: 'Magnify', type: 'number', unit: '×', min: 1.2, max: 8, step: 0.1, def: () => 2.6 }, dur],
  apply(doc, t, o, D) {
    const ch = [{ kind: 'camera' }], was = doc.style.mode;
    if (to3d(doc)) ch.push({ kind: 'mode', was });
    const target = doc.objects.find(q => q.id === o.part) || optical(doc)[0];
    const v = camOf(doc), W = doc.page.width, H = doc.page.height, bh = v.beamHeight || 6;
    const c0 = { yaw: v.yaw, pitch: v.pitch, zoom: v.zoom || 1, panX: v.panX || 0, panY: v.panY || 0 };
    const zin = c0.zoom * o.z, cam = RNBX.render3d.camera(Object.assign({}, doc, { view3d: Object.assign({}, v, { zoom: zin, panX: 0, panY: 0 }) }));
    const pt = cam.p(target.x, target.y, bh + (target.z || 0));
    const ac = cam.area ? [(cam.area.x0 + cam.area.x1) / 2, (cam.area.y0 + cam.area.y1) / 2] : [W / 2, H / 2];
    const cin = Object.assign({}, c0, { zoom: zin, panX: U.round(ac[0] - pt[0], 3), panY: U.round(ac[1] - pt[1], 3) });
    doc.animation.camera = [Object.assign({ t: 0 }, c0), Object.assign({ t: D * 0.35 }, cin), Object.assign({ t: D * 0.65 }, cin), Object.assign({ t: D }, c0)];
    return ch;
  } });
add({ id: 'build', group: 'Presentation', name: 'Build-up', icon: 'build', desc: 'Parts appear one by one as the light reaches them: ideal for talks.',
  ok: d => d.objects.some(o => lib.get(o.type) && lib.get(o.type).source),
  params: [{ key: 'grow', label: 'Build time', type: 'number', unit: 's', min: 1, max: 60, step: 0.5, def: () => 5 }, dur],
  apply(doc, t, o, D) {
    const { parts, arr, L, rest } = beamOrder(doc), t0 = 0.3, t1 = Math.min(D, t0 + o.grow), ch = [{ kind: 'reveal' }];
    doc.animation.reveal = { t0, t1 };
    const fade = Math.min(0.4, (t1 - t0) / 8);
    parts.forEach(q => {
      const ta = t0 + (t1 - t0) * arr[q.id] / L, keys = [{ t: 0, opacity: 0 }];
      if (ta - fade > 0) keys.push({ t: Math.max(0.01, ta - fade), opacity: 0 });
      keys.push({ t: Math.max(0.02, ta), opacity: 1 });
      A.applyCurve(q.id, keys); ch.push({ kind: 'field', id: q.id, field: 'opacity' });
    });
    rest.forEach(q => { A.applyCurve(q.id, [{ t: 0, opacity: 0 }, { t: t1, opacity: 0 }, { t: Math.min(D, t1 + 0.5), opacity: 1 }]); ch.push({ kind: 'field', id: q.id, field: 'opacity' }); });
    return ch;
  } });
add({ id: 'spotlight', group: 'Presentation', name: 'Spotlight tour', icon: 'spot', desc: 'Each part lights up in turn along the beam while the rest is dimmed.',
  ok: d => optical(d).length > 1,
  params: [{ key: 'dim', label: 'Dimmed to', type: 'number', unit: '%', min: 0, max: 90, step: 5, def: () => 20 }, Object.assign({}, dur, { def: d => Math.max(4, Math.min(30, beamOrder(d).parts.length * 1.2)) })],
  apply(doc, t, o, D) {
    const { parts, rest } = beamOrder(doc), all = parts.concat(rest), n = all.length, lo = o.dim / 100, ch = [];
    const slot = D / (n + 1);
    all.forEach((q, i) => {
      const a = slot * (i + 0.5), keys = [{ t: 0, opacity: 1 }, { t: Math.min(0.4, slot / 2), opacity: lo }];
      keys.push({ t: Math.max(keys[1].t + 0.01, a - slot * 0.25), opacity: lo }, { t: a, opacity: 1 }, { t: a + slot * 0.6, opacity: 1 }, { t: a + slot * 0.85, opacity: lo });
      keys.push({ t: D - slot * 0.5, opacity: lo }, { t: D, opacity: 1 });
      const ks = keys.filter((k, j) => j === 0 || k.t > keys[j - 1].t + 1e-3 && k.t <= D);
      A.applyCurve(q.id, ks); ch.push({ kind: 'field', id: q.id, field: 'opacity' });
    });
    return ch;
  } });
add({ id: 'lift', group: 'Presentation', name: '2D → 3D reveal', icon: 'lift', desc: 'Starts as the flat figure seen from above, then tilts into the 3D table view.',
  params: [{ key: 'pitch', label: 'End elevation', type: 'number', unit: '°', min: 10, max: 80, step: 1, def: d => Math.round(d.view3d.pitch || 34) }, Object.assign({}, dur, { def: () => 5 })],
  apply(doc, t, o, D) {
    const ch = [{ kind: 'camera' }], was = doc.style.mode;
    if (to3d(doc)) ch.push({ kind: 'mode', was });
    const v = camOf(doc), y = v.yaw || -28, z = v.zoom || 1;
    doc.animation.camera = [{ t: 0, yaw: 0, pitch: 90, zoom: z, panX: 0, panY: 0 }, { t: D * 0.15, yaw: 0, pitch: 90, zoom: z, panX: 0, panY: 0 }, { t: D * 0.85, yaw: y, pitch: o.pitch, zoom: z, panX: 0, panY: 0 }, { t: D, yaw: y, pitch: o.pitch, zoom: z, panX: 0, panY: 0 }];
    return ch;
  } });
})();
