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
    num('flowSpeed', 'Speed', 1, 500, 1),
    el('button', { class: 'btn small', type: 'button', html: D.icon('key', 14) + ' Key selected', disabled: !S.selection.length, onclick: () => RNBX.anim.addKey(S.selection) }),
    S.doc.style.mode === '3d' ? el('button', { class: 'btn small', type: 'button', html: D.icon('camera', 14) + ' Key camera', onclick: () => RNBX.anim.addCameraKey() }) : null,
    el('button', { class: 'btn small primary', type: 'button', html: D.icon('download', 14) + ' Export video', onclick: () => RNBX.dialogs.exporter('video') }));
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
  if (an.camera.length) rows.push({ id: '__camera', name: '3D camera', keys: an.camera });
  Object.keys(an.tracks).forEach(id => {
    const o = RNBX.getObj(id);
    if (!o || !an.tracks[id].length) return;
    const def = lib.get(o.type);
    rows.push({ id, name: (o.label && o.label.text ? RNBX.text.fill(o.label.text, o.props).replace(/\n/g, ' ') : '') || o.kindName || def.name, keys: an.tracks[id] });
  });
  // ruler
  const ruler = el('div', { class: 'tl-row' }, el('div', { class: 'tl-name muted', text: rows.length ? 'Tracks' : '' }), el('div', { class: 'tl-track tl-ruler' }));
  const rt = ruler.lastChild;
  const step = Dur <= 4 ? 0.5 : Dur <= 12 ? 1 : Dur <= 40 ? 5 : 10;
  for (let t = 0; t <= Dur + 1e-6; t += step) rt.append(el('span', { style: { left: (t / Dur * 100) + '%' }, text: U.fmt(t, 1) + 's' }));
  bodyEl.append(ruler);
  headEl = el('div', { class: 'tl-head' });
  if (!rows.length) {
    bodyEl.append(el('div', { class: 'tl-empty', html: 'No keyframes yet. Select an object, move the playhead, then press <b>Key selected</b> (or <kbd>I</kbd>). Adjust the object at another time and add a second key: RNBeamX interpolates and re-traces the beams on every frame. Tick <b>Light flow</b> or <b>Pulses</b> to animate the light itself.' }));
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
    const name = el('div', { class: 'tl-name', title: r.name }, r.name, D.iconBtn('trash', 'Remove all keys', () => RNBX.anim.clearTrack(r.id)));
    name.addEventListener('click', e => { if (r.id !== '__camera' && e.target === name) RNBX.select([r.id]); });
    bodyEl.append(el('div', { class: 'tl-row' }, name, track));
  });
  bodyEl.append(headEl);
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
  RNBX.on('time', T.sync);
  RNBX.on('animation', () => { T.buildRows(); T.sync(); });
  RNBX.on('document', () => T.build());
  RNBX.on('selection', () => { if (!D.$('#timeline').hidden) T.build(); });
  RNBX.on('playstate', p => { if (playBtn) playBtn.innerHTML = D.icon(p ? 'pause' : 'play'); });
};
})();
