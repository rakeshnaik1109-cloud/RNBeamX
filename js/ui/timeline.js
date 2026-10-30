/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/timeline.js
   Animation timeline: transport, duration / fps, light flow and
   pulses, keyframe rows per animated object and for the 3D
   camera. Keys can be clicked (jump), dragged (retime) and
   double-clicked (delete).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom, el = D.el;
const T = RNBX.timeline = {};
let bodyEl, headEl, timeEl, playBtn, scrub;

T.show = () => { if (D.$('#timeline').hidden) T.toggle(); };
T.toggle = () => {
  const tl = D.$('#timeline');
  tl.hidden = !tl.hidden;
  S.ui.timeline = !tl.hidden;
  D.$('#btnTimeline').textContent = tl.hidden ? '▶ Animation' : '▼ Animation';
  if (!tl.hidden) T.build();
  setTimeout(() => RNBX.canvas.fit(), 30);
};

T.build = () => {
  const tl = D.$('#timeline');
  if (tl.hidden) return;
  const an = S.doc.animation;
  tl.innerHTML = '';
  playBtn = D.iconBtn(S.playing ? 'pause' : 'play', 'Play / pause (K)', () => RNBX.anim.toggle());
  timeEl = el('span', { class: 'time' });
  scrub = el('input', { type: 'range', min: 0, max: an.duration, step: 1 / (an.fps || 30), value: S.time, style: { flex: '1', minWidth: '120px' }, oninput: () => RNBX.anim.setTime(parseFloat(scrub.value)) });
  const num = (key, label, min, max, step, after) => {
    const i = el('input', { type: 'number', min, max, step, value: an[key], onchange: () => { const v = U.clamp(parseFloat(i.value), min, max); if (!isFinite(v)) return; RNBX.history.checkpoint('an' + key); an[key] = v; i.value = v; if (after) after(); RNBX.changed(); T.build(); } });
    return el('label', {}, label, i);
  };
  const chk = (key, label, title) => {
    const i = el('input', { type: 'checkbox', checked: !!an[key], onchange: () => { RNBX.history.checkpoint(); an[key] = i.checked; RNBX.changed(); } });
    return el('label', { title }, i, label);
  };
  const bar = el('div', { class: 'tl-bar' },
    D.iconBtn('stop', 'Back to start', () => RNBX.anim.stop()), playBtn, timeEl, scrub,
    num('duration', 'Length (s)', 0.5, 600, 0.5, () => { if (S.time > an.duration) RNBX.anim.setTime(an.duration); }),
    num('fps', 'fps', 5, 60, 1),
    chk('loop', 'Loop'),
    chk('flow', 'Light flow', 'Animate light travelling along every beam'),
    chk('pulses', 'Pulses', 'Draw all beams as travelling pulses'),
    el('label', { title: 'How pulses are drawn: a wave packet (optical cycles under a Gaussian envelope), a smooth Gaussian bump, or a bar' }, 'Pulse',
      el('select', { onchange: e => { RNBX.history.checkpoint(); an.pulseShape = e.target.value; RNBX.changed(); } }, RNBX.beams.PULSE_SHAPES.map(([v, t]) => el('option', { value: v, text: t, selected: RNBX.beams.pulseShape(S.doc) === v })))),
    num('flowSpeed', 'Speed', 1, 500, 1),
    el('button', { class: 'btn small primary', type: 'button', text: 'Animate…', title: 'One-click animations (A)', onclick: () => RNBX.animateUI.open() }),
    el('label', { title: 'Record: with this on, any change you make (move, rotate, edit a setting) is saved as a step at the current time. Change the time, change the part again: it animates between the two.' },
      el('input', { type: 'checkbox', checked: RNBX.anim.record, onchange: e => { RNBX.anim.record = e.target.checked; U.store.set('rnbx_record', RNBX.anim.record); T.build(); } }), el('span', { class: RNBX.anim.record ? 'rec on' : 'rec', text: '● Record' })),
    el('button', { class: 'btn small', type: 'button', html: D.icon('key', 14) + ' Add step', title: 'Save the selected parts as they are now, at this time (I)', disabled: !S.selection.length, onclick: () => RNBX.anim.addKey(S.selection) }),
    S.doc.style.mode === '3d' ? el('button', { class: 'btn small', type: 'button', html: D.icon('camera', 14) + ' Add camera step', title: 'Save the current 3D view at this time', onclick: () => RNBX.anim.addCameraKey() }) : null,
    el('button', { class: 'btn small', type: 'button', html: D.icon('download', 14) + ' Video / GIF', onclick: () => RNBX.dialogs.exporter('video') }));
  bodyEl = el('div', { class: 'tl-body' });
  tl.append(bar, bodyEl);
  T.buildRows();
  T.sync();
};

T.buildRows = () => {
  if (!bodyEl) return;
  const an = S.doc.animation, Dur = an.duration || 6;
  bodyEl.innerHTML = '';
  const rows = [];
  if (an.camera.length) rows.push({ id: '__camera', name: '3D camera', keys: an.camera, what: T.describeCam(an.camera) });
  Object.keys(an.tracks).forEach(id => {
    const o = RNBX.getObj(id);
    if (!o || !an.tracks[id].length) return;
    const def = lib.get(o.type);
    rows.push({ id, name: (o.label && o.label.text ? RNBX.text.fill(o.label.text, o.props).replace(/\n/g, ' ') : '') || o.kindName || def.name, keys: an.tracks[id], what: T.describe(o, an.tracks[id]) });
  });
  // ruler
  const ruler = el('div', { class: 'tl-row' }, el('div', { class: 'tl-name muted', text: rows.length ? 'Tracks' : '' }), el('div', { class: 'tl-track tl-ruler' }));
  const rt = ruler.lastChild;
  const step = Dur <= 4 ? 0.5 : Dur <= 12 ? 1 : Dur <= 40 ? 5 : 10;
  for (let t = 0; t <= Dur + 1e-6; t += step) rt.append(el('span', { style: { left: (t / Dur * 100) + '%' }, text: U.fmt(t, 1) + 's' }));
  bodyEl.append(ruler);
  headEl = el('div', { class: 'tl-head' });
  if (!rows.length) {
    bodyEl.append(el('div', { class: 'tl-empty', html: '<b>Quickest:</b> press <b>Animate…</b> and pick a ready-made animation (3D rotation, switch-on, scans, build-up…).<br><b>By hand</b> (with <b>● Record</b> on): drag the time slider to a later time, then move, rotate or change any part. That change becomes a step, and RNBeamX animates smoothly from the start to it, re-tracing the beams on every frame. Repeat at other times for more steps.' }));
  }
  rows.forEach(r => {
    const track = el('div', { class: 'tl-track' });
    if (r.keys.length > 1) track.append(el('div', { class: 'tl-span', style: { left: (r.keys[0].t / Dur * 100) + '%', width: ((r.keys[r.keys.length - 1].t - r.keys[0].t) / Dur * 100) + '%' } }));
    r.keys.forEach(k => {
      const key = el('div', { class: 'tl-key', title: `${U.fmt(k.t, 2)} s · drag to retime, double-click to delete`, style: { left: (k.t / Dur * 100) + '%' } });
      key.addEventListener('pointerdown', e => {
        e.stopPropagation();
        const rect = track.getBoundingClientRect();
        let moved = false;
        const mv = ev => {
          const t = U.clamp((ev.clientX - rect.left) / rect.width * Dur, 0, Dur);
          if (!moved) { RNBX.history.checkpoint(); moved = true; }
          k.t = U.round(Math.round(t * an.fps) / an.fps, 4);
          key.style.left = (k.t / Dur * 100) + '%';
        };
        const up = () => {
          window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up);
          r.keys.sort((a, b) => a.t - b.t);
          if (!moved) RNBX.anim.setTime(k.t); else { RNBX.changed(); T.buildRows(); }
        };
        window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
      });
      key.addEventListener('dblclick', e => { e.stopPropagation(); RNBX.anim.removeKey(r.id, k.t); });
      track.append(key);
    });
    track.addEventListener('pointerdown', e => { const rect = track.getBoundingClientRect(); RNBX.anim.setTime((e.clientX - rect.left) / rect.width * Dur); });
    const name = el('div', { class: 'tl-name', title: r.name + (r.what ? ' · ' + r.what : '') }, el('span', { class: 'tl-nm' }, el('span', { text: r.name }), r.what ? el('small', { text: r.what }) : null), D.iconBtn('trash', 'Remove this part’s animation', () => RNBX.anim.clearTrack(r.id)));
    name.addEventListener('click', e => { if (r.id !== '__camera' && e.target === name) RNBX.select([r.id]); });
    bodyEl.append(el('div', { class: 'tl-row' }, name, track));
  });
  bodyEl.append(headEl);
};

/* what a track changes, in words: "angle 0 → 45 → 0°", "moves", "fades in" */
T.describe = (o, keys) => {
  if (!keys || keys.length < 2) return keys && keys.length ? 'one step (add another at a different time)' : '';
  const def = lib.get(o.type), out = [];
  const vals = f => keys.map(f);
  const varies = a => a.some(v => JSON.stringify(v) !== JSON.stringify(a[0]));
  const seq = (a, unit = '') => { const c = a.filter((v, i) => i === 0 || v !== a[i - 1]); const f = v => (typeof v === 'number' ? U.fmt(v, 3) : typeof v === 'boolean' ? (v ? 'on' : 'off') : String(v)); return (c.length > 4 ? [c[0], '…', c[c.length - 1]] : c).map(v => (v === '…' ? v : f(v))).join(' → ') + unit; };
  if (varies(vals(k => [k.x, k.y]))) out.push('moves');
  if (varies(vals(k => k.rot))) out.push('turns ' + seq(vals(k => U.round(k.rot || 0, 2)), '°'));
  if (varies(vals(k => k.scale))) out.push('size ' + seq(vals(k => U.round(k.scale || 1, 3)), '×'));
  if (varies(vals(k => (k.opacity == null ? 1 : k.opacity)))) { const a = vals(k => (k.opacity == null ? 1 : k.opacity)); out.push(a[0] < 0.5 && a[a.length - 1] > 0.5 ? 'appears' : 'fades ' + seq(a.map(v => U.round(v * 100, 0)), '%')); }
  const props = keys[0].props ? Object.keys(keys[0].props) : [];
  props.forEach(p => {
    const a = vals(k => (k.props ? k.props[p] : undefined));
    if (!varies(a) || a.some(v => v && typeof v === 'object')) return;
    const prm = def && def.params && def.params.find(q => q.key === p);
    out.push((prm ? prm.label.replace(/\s*\(.*\)$/, '').toLowerCase() : p) + ' ' + seq(a.map(v => (typeof v === 'number' ? U.round(v, 3) : v)), prm && prm.unit ? ' ' + prm.unit : ''));
  });
  return out.join(' · ') || 'no change between steps';
};

T.describeCam = keys => {
  if (keys.length < 2) return 'one view (add another at a different time)';
  const out = [], a = f => keys.map(k => k[f] || 0), span = v => Math.max(...v) - Math.min(...v);
  const yaw = a('yaw'), turn = yaw[yaw.length - 1] - yaw[0];
  if (Math.abs(turn) >= 1) out.push(`turns ${U.fmt(Math.abs(turn), 3)}° ${turn > 0 ? 'anticlockwise' : 'clockwise'}`); else if (span(yaw) >= 1) out.push(`swings ±${U.fmt(span(yaw) / 2, 3)}°`);
  if (span(a('pitch')) >= 1) out.push(`tilts ${U.fmt(a('pitch')[0], 3)} → ${U.fmt(a('pitch')[keys.length - 1], 3)}°`);
  if (span(keys.map(k => k.zoom || 1)) > 0.01) out.push(`zooms to ${U.fmt(Math.max(...keys.map(k => k.zoom || 1)), 3)}×`);
  return out.join(' · ') || 'no change between views';
};

T.sync = () => {
  if (!timeEl || D.$('#timeline').hidden) return;
  const an = S.doc.animation, Dur = an.duration || 6;
  timeEl.textContent = `${U.fmt(S.time, 2).padStart(4)} / ${U.fmt(Dur, 1)} s`;
  if (document.activeElement !== scrub) scrub.value = S.time;
  if (headEl) {
    const tr = bodyEl.querySelector('.tl-track');
    if (tr) {
      const off = tr.offsetLeft;
      headEl.style.left = (off + S.time / Dur * tr.clientWidth) + 'px';
    }
  }
};

T.init = () => {
  D.$('#btnTimeline').onclick = T.toggle;
  RNBX.anim.record = U.store.get('rnbx_record', true) !== false;
  RNBX.on('time', T.sync);
  RNBX.on('animation', () => { T.buildRows(); T.sync(); });
  RNBX.on('document', () => T.build());
  RNBX.on('selection', () => { if (!D.$('#timeline').hidden) T.build(); });
  RNBX.on('playstate', p => { if (playBtn) playBtn.innerHTML = D.icon(p ? 'pause' : 'play'); });
};
})();
