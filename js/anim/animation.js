/* ═══════════════════════════════════════════════════════════
   RNBeamX — anim/animation.js
   Keyframe animation. Any object can carry a track of keys
   {t, x, y, rot, scale, props}; numbers are interpolated with
   easing, everything else steps. Because the beam tracer runs on
   every frame, animating a mirror, a wave-plate angle or a
   grating sweeps the light physically. The 3D camera has its own
   track for orbit / zoom moves. Light "flow" and pulses are
   driven by time as well.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state;
const A = RNBX.anim = { editing: new Set() };

const EASE = {
  linear: u => u,
  inout: u => u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
  in: u => u * u,
  out: u => 1 - (1 - u) * (1 - u),
  step: u => (u < 1 ? 0 : 1),           // hold, then jump (shutters, blinking)
};
A.EASINGS = [['inout', 'Ease in-out'], ['linear', 'Linear'], ['in', 'Ease in'], ['out', 'Ease out'], ['step', 'Hold, then jump']];

/* numbers blend; nested settings (e.g. a stack's layers or its calculation
   angle) blend field by field when both keys have the same shape */
const lerpVal = (a, b, u) => {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a !== b) return a.map((v, i) => lerpVal(v, b[i], u));
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && a !== b) { const o = {}; Object.keys(a).forEach(k => { o[k] = k in b ? lerpVal(a[k], b[k], u) : a[k]; }); return o; }
  return u < 1 ? a : b;
};
/* shortest-way interpolation for angles */
const lerpAngle = (a, b, u) => a + (b - a) * u;

function sample(keys, t, fields) {
  if (!keys || !keys.length) return null;
  if (t <= keys[0].t) return keys[0];
  const last = keys[keys.length - 1];
  if (t >= last.t) return last;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t < t) i++;
  const k0 = keys[i], k1 = keys[i + 1];
  const u = EASE[k1.ease || 'inout']((t - k0.t) / Math.max(1e-9, k1.t - k0.t));
  const out = { t };
  fields.forEach(f => { if (k0[f] !== undefined) out[f] = f === 'rot' || f === 'yaw' ? lerpAngle(k0[f], k1[f] == null ? k0[f] : k1[f], u) : lerpVal(k0[f], k1[f] == null ? k0[f] : k1[f], u); });
  if (k0.props) {
    out.props = {};
    Object.keys(k0.props).forEach(p => { out.props[p] = lerpVal(k0.props[p], k1.props ? k1.props[p] : k0.props[p], u); });
  }
  return out;
}

A.hasAnimation = doc => Object.keys(doc.animation.tracks || {}).some(k => doc.animation.tracks[k].length) || (doc.animation.camera || []).length > 0;

/* the document as it looks at time t */
A.evaluate = (doc, t) => {
  const an = doc.animation;
  const tracks = an.tracks || {};
  const anyTrack = Object.keys(tracks).some(k => tracks[k] && tracks[k].length);
  const camKeys = an.camera || [];
  if (!anyTrack && !camKeys.length) return doc;
  const out = Object.assign({}, doc);
  if (anyTrack) {
    out.objects = doc.objects.map(o => {
      const keys = tracks[o.id];
      if (!keys || !keys.length || A.editing.has(o.id)) return o;
      const s = sample(keys, t, ['x', 'y', 'rot', 'scale', 'opacity']);
      const c = Object.assign({}, o, { x: s.x, y: s.y, rot: s.rot, scale: s.scale == null ? o.scale : s.scale });
      if (s.opacity != null) c.opacity = s.opacity;
      if (s.props) c.props = Object.assign({}, o.props, s.props);
      return c;
    });
  }
  if (camKeys.length) {
    const s = sample(camKeys, t, ['yaw', 'pitch', 'zoom', 'panX', 'panY']);
    out.view3d = Object.assign({}, doc.view3d, s);
  }
  return out;
};

A.sample = (keys, t) => sample(keys, t, ['x', 'y', 'rot', 'scale', 'opacity']);
const snapshot = o => ({ x: o.x, y: o.y, rot: o.rot || 0, scale: o.scale || 1, opacity: o.opacity == null ? 1 : o.opacity, props: U.deepClone(o.props) });
const frameTol = () => 0.5 / (S.doc.animation.fps || 30);

function upsert(keys, t, data) {
  const k = keys.find(q => Math.abs(q.t - t) <= frameTol());
  if (k) Object.assign(k, data);
  else { keys.push(Object.assign({ t: U.round(t, 4), ease: 'inout' }, data)); keys.sort((a, b) => a.t - b.t); }
}

/* record the current state of objects as a key at the playhead */
A.addKey = (ids, t = S.time) => {
  const tracks = S.doc.animation.tracks;
  RNBX.history.checkpoint();
  ids.forEach(id => {
    const o = RNBX.getObj(id);
    if (!o) return;
    const keys = tracks[id] = tracks[id] || [];
    // first key on an object: also pin its state at t = 0 so it animates *from* somewhere
    if (!keys.length && t > frameTol()) upsert(keys, 0, snapshot(o));
    upsert(keys, t, snapshot(o));
  });
  RNBX.emit('animation');
  RNBX.changed();
};
A.addCameraKey = (t = S.time) => {
  RNBX.history.checkpoint();
  const v = S.doc.view3d, keys = S.doc.animation.camera;
  const data = { yaw: v.yaw, pitch: v.pitch, zoom: v.zoom, panX: v.panX || 0, panY: v.panY || 0 };
  if (!keys.length && t > frameTol()) upsert(keys, 0, Object.assign({}, data));
  upsert(keys, t, data);
  RNBX.emit('animation');
  RNBX.changed();
};
A.removeKey = (id, t) => {
  RNBX.history.checkpoint();
  const arr = id === '__camera' ? S.doc.animation.camera : S.doc.animation.tracks[id];
  if (!arr) return;
  const i = arr.findIndex(k => Math.abs(k.t - t) <= frameTol());
  if (i >= 0) arr.splice(i, 1);
  if (id !== '__camera' && !arr.length) delete S.doc.animation.tracks[id];
  RNBX.emit('animation');
  RNBX.changed();
};
A.clearTrack = id => {
  RNBX.history.checkpoint();
  if (id === '__camera') S.doc.animation.camera = []; else delete S.doc.animation.tracks[id];
  RNBX.emit('animation');
  RNBX.changed();
};

/* Merge a short animation ("curve": keys that set only some fields) into an
   object's track. Existing keys keep everything else, so several presets can
   animate the same part (e.g. a scan and a fade) without undoing each other. */
const FIELDS = ['x', 'y', 'rot', 'scale', 'opacity'];
A.applyCurve = (id, curve) => {
  const o = RNBX.getObj(id);
  if (!o || !curve.length) return;
  const tracks = S.doc.animation.tracks, old = tracks[id] && tracks[id].length ? tracks[id].map(k => U.deepClone(k)) : null;
  const base = snapshot(o);
  curve = curve.map(k => Object.assign({}, k, { t: U.round(k.t, 4) })).sort((a, b) => a.t - b.t);
  const times = [...new Set((old || []).map(k => k.t).concat(curve.map(k => k.t)).map(t => U.round(t, 4)))].sort((a, b) => a - b);
  const keys = times.map(t => {
    const ok = old && old.find(k => Math.abs(k.t - t) < 1e-6), ck = curve.find(k => Math.abs(k.t - t) < 1e-6);
    const st = old ? U.deepClone(ok || sample(old, t, FIELDS)) : U.deepClone(base);
    const c = sample(curve, t, Object.keys(curve[0]).filter(f => FIELDS.includes(f)));
    FIELDS.forEach(f => { if (c[f] !== undefined) st[f] = c[f]; });
    st.props = Object.assign({}, base.props, st.props || {}, c.props || {});
    FIELDS.forEach(f => { if (st[f] === undefined) st[f] = base[f]; });
    delete st.t;
    return Object.assign({ t, ease: (ck && ck.ease) || (ok && ok.ease) || 'inout' }, st);
  });
  tracks[id] = keys;
};
/* take one field (e.g. "opacity" or "props.angle") out of a track again */
A.removeField = (id, field) => {
  const o = RNBX.getObj(id), keys = S.doc.animation.tracks[id];
  if (!o || !keys) return;
  const [a, b] = field.split('.');
  const v = keys[0] ? (b ? keys[0].props[b] : keys[0][a]) : undefined;
  keys.forEach(k => { if (b) k.props[b] = v; else k[a] = v; });
  if (b) o.props[b] = v; else if (v !== undefined) o[a] = v;
  const sig = k => JSON.stringify(Object.assign({}, k, { t: 0, ease: '' }));
  if (keys.every(k => sig(k) === sig(keys[0]))) delete S.doc.animation.tracks[id];
};

/* Record mode: with the timeline open, any edit becomes a step at the playhead,
   also on parts that were not animated yet (their earlier state is kept at 0 s). */
A.record = true;
A.recording = () => A.record && S.ui && S.ui.timeline;
A.recordEdit = ids => {
  if (!A.recording()) return false;
  const tracks = S.doc.animation.tracks;
  let prev = null;
  try { const h = RNBX.history.undoStack; prev = h.length ? JSON.parse(h[h.length - 1]) : null; } catch (e) { prev = null; }
  let any = false;
  ids.forEach(id => {
    if (tracks[id] && tracks[id].length) return;
    const o = RNBX.getObj(id);
    if (!o || RNBX.lib.get(o.type).connection) return;
    const was = prev && prev.objects.find(q => q.id === id);
    const keys = tracks[id] = [];
    if (S.time > frameTol()) upsert(keys, 0, snapshot(was || o));
    upsert(keys, S.time, snapshot(o));
    any = true;
  });
  return any;
};

/* auto-key: editing an animated object updates its key at the playhead */
A.touch = ids => {
  const tracks = S.doc.animation.tracks;
  let any = A.recordEdit(ids);
  ids.forEach(id => {
    if (!tracks[id] || !tracks[id].length) return;
    const o = RNBX.getObj(id);
    if (o) { upsert(tracks[id], S.time, snapshot(o)); any = true; }
  });
  if (any) RNBX.emit('animation');
};
/* when the playhead moves, the base objects take the animated values,
   so that the inspector and drags start from what is on screen */
A.syncBase = () => {
  const tracks = S.doc.animation.tracks;
  Object.keys(tracks).forEach(id => {
    const o = RNBX.getObj(id), keys = tracks[id];
    if (!o || !keys.length) return;
    const s = sample(keys, S.time, ['x', 'y', 'rot', 'scale', 'opacity']);
    o.x = s.x; o.y = s.y; o.rot = s.rot; if (s.scale != null) o.scale = s.scale; if (s.opacity != null) o.opacity = s.opacity;
    if (s.props) Object.assign(o.props, s.props);
  });
  const ck = S.doc.animation.camera;
  if (ck.length) Object.assign(S.doc.view3d, sample(ck, S.time, ['yaw', 'pitch', 'zoom', 'panX', 'panY']));
};

/* ---------- playback ---------- */
let raf = 0, t0 = 0, start = 0;
A.setTime = t => {
  const D = S.doc.animation.duration || 6;
  S.time = U.clamp(t, 0, D);
  A.syncBase();
  RNBX.emit('time', S.time);
  RNBX.changed('time');
};
A.play = () => {
  if (S.playing) return;
  S.playing = true;
  const D = S.doc.animation.duration || 6;
  if (S.time >= D - 1e-3) S.time = 0;
  t0 = S.time; start = performance.now();
  const tick = now => {
    if (!S.playing) return;
    let t = t0 + (now - start) / 1000;
    const Dn = S.doc.animation.duration || 6;
    if (t > Dn) {
      if (S.doc.animation.loop) { t0 = 0; start = now; t = 0; } else { A.setTime(Dn); A.pause(); return; }
    }
    S.time = t;
    A.syncBase();
    RNBX.emit('time', t);
    RNBX.changed('time');
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  RNBX.emit('playstate', true);
};
A.pause = () => { S.playing = false; cancelAnimationFrame(raf); RNBX.emit('playstate', false); };
A.toggle = () => (S.playing ? A.pause() : A.play());
A.stop = () => { A.pause(); A.setTime(0); };

/* is the scene time-dependent at all? (decides whether frames differ) */
A.isLive = doc => A.hasAnimation(doc) || doc.animation.flow || doc.animation.pulses || !!doc.animation.reveal || doc.objects.some(o => o.props && o.props.pulsed);

/* "switch on": the light grows out of the sources along the beam path
   between reveal.t0 and reveal.t1 (path length shown grows linearly) */
A.pathLength = trace => trace.segments.reduce((m, s) => (s.ghost ? m : Math.max(m, (s.s0 || 0) + (s.len || 0))), 0);
A.revealTrace = (doc, trace, t) => {
  const rv = doc.animation.reveal;
  if (!rv || t == null) return trace;
  const L = A.pathLength(trace), u = U.clamp((t - rv.t0) / Math.max(1e-6, rv.t1 - rv.t0), 0, 1), sMax = L * u;
  if (u >= 1) return trace;
  const segments = [];
  trace.segments.forEach(s => {
    const s0 = s.s0 || 0;
    if (s0 >= sMax || s.len <= 0) return;
    if (s0 + s.len <= sMax) { segments.push(s); return; }
    const f = (sMax - s0) / s.len;
    segments.push(Object.assign({}, s, { b: [s.a[0] + (s.b[0] - s.a[0]) * f, s.a[1] + (s.b[1] - s.a[1]) * f], len: s.len * f, zb: s.za + (s.zb - s.za) * f, end: 'open' }));
  });
  return Object.assign({}, trace, { segments });
};
/* how far along the light path (drawn mm) each part is first reached; sources are 0 */
A.arrival = (doc, trace) => {
  const out = {};
  doc.objects.forEach(o => {
    const def = RNBX.lib.get(o.type);
    if (!def || def.annotation || def.connection || o.hidden) return;
    if (def.source) { out[o.id] = 0; return; }
    let box; try { box = RNBX.lib.worldBox(o); } catch (e) { return; }
    const pad = 0.8;
    let best = Infinity;
    trace.segments.forEach(s => {
      if (s.ghost) return;
      const e = s.b, end = (s.s0 || 0) + s.len;
      if (e[0] >= box[0] - pad && e[0] <= box[2] + pad && e[1] >= box[1] - pad && e[1] <= box[3] + pad) best = Math.min(best, end);
      const a = s.a;
      if (a[0] >= box[0] - pad && a[0] <= box[2] + pad && a[1] >= box[1] - pad && a[1] <= box[3] + pad) best = Math.min(best, s.s0 || 0);
    });
    if (isFinite(best)) out[o.id] = best;
  });
  return out;
};
})();
