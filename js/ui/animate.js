/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/animate.js
   The "Animate" dialog: a gallery of one-click animations
   (anim/presets.js). Pick one, check its two or three settings,
   press Apply: it plays at once. Applied animations are listed
   and can be removed one by one; everything stays editable in the
   timeline, and every step can be undone.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, lib = RNBX.lib;
const AN = RNBX.animateUI = {};
const P = () => RNBX.animPresets;

const HINT = {
  wavelength: 'Add a laser or LED first.', blink: 'Add a laser, LED or lamp first.', waveplate: 'Add a λ/2 or λ/4 plate first.',
  polariser: 'Add a polariser first.', scan: 'Add a galvo, kinematic mount or mirror first.', fringes: 'Add a mirror in an interferometer first.',
  delay: 'Add a retroreflector (delay line) first.', focus: 'Add a screen, camera, sample or lens first.', shutter: 'Add a beam shutter first.',
  aom: 'Add an acousto-optic modulator first.', field: 'Add a Ray bundle / object first.', binding: 'Add an SPR prism with a chip, or a coating block.',
  switchon: 'Add a light source first.', build: 'Add a light source first.', spotlight: 'Add a few parts first.', zoom: 'Add some parts first.',
};

AN.open = (focusId) => {
  const doc = S.doc;
  let chosen = null;
  const right = el('div', { class: 'anim-side' });
  const applied = el('div', { class: 'anim-applied' });
  const gallery = el('div', { class: 'anim-gallery' });

  const showApplied = () => {
    const list = S.doc.animation.applied || [];
    applied.innerHTML = '';
    const other = RNBX.anim.hasAnimation(S.doc) || S.doc.animation.flow || S.doc.animation.pulses;
    applied.append(el('b', { text: list.length ? 'In this figure:' : other ? 'This figure already moves (its own animation steps).' : 'Nothing animated yet: pick one below.' }));
    list.forEach(a => applied.append(el('span', { class: 'anim-chip' }, a.name, el('button', { type: 'button', title: 'Remove this animation', text: '×', onclick: () => { P().remove(a.uid); showApplied(); } }))));
    if (list.length || RNBX.anim.hasAnimation(S.doc)) applied.append(el('button', { class: 'btn small ghost', type: 'button', text: 'Remove all animation', onclick: () => { P().clearAll(); showApplied(); } }));
  };

  const settings = p => {
    chosen = p;
    gallery.querySelectorAll('.anim-card').forEach(c => c.classList.toggle('on', c.dataset.id === p.id));
    right.innerHTML = '';
    const avail = P().available(p, S.doc);
    right.append(el('div', { class: 'anim-side-head', html: P().icon(p.icon) }, el('div', {}, el('b', { text: p.name }), el('small', { text: p.desc }))));
    if (!avail) { right.append(el('div', { class: 'note', text: HINT[p.id] || 'This figure has nothing this animation can move.' })); return; }
    const vals = {};
    let target = null;
    const form = el('div', { class: 'anim-form' });
    const build = () => {
      form.innerHTML = '';
      if (p.types) {
        const c = P().candidates(p, S.doc);
        target = target && c.includes(target) ? target : P().target(p, S.doc, S.selection);
        const sel = el('select', {}, c.map(o => el('option', { value: o.id, text: P().labelOf(o) })));
        sel.value = target.id;
        sel.onchange = () => { target = c.find(o => o.id === sel.value); Object.keys(vals).forEach(k => delete vals[k]); build(); };
        form.append(el('label', { class: 'field' }, el('span', { text: 'Animate' }), sel));
      }
      p.params.forEach(q => {
        if (vals[q.key] === undefined) vals[q.key] = q.def ? q.def(S.doc, target) : 0;
        let input;
        if (q.type === 'bool') { input = el('input', { type: 'checkbox', checked: !!vals[q.key], onchange: () => { vals[q.key] = input.checked; } }); form.append(el('label', { class: 'field row' }, input, el('span', { text: q.label }))); return; }
        if (q.type === 'select') { input = el('select', { onchange: () => { vals[q.key] = input.value; } }, q.options.map(([v, t]) => el('option', { value: v, text: t }))); input.value = vals[q.key]; }
        else if (q.type === 'part') {
          const parts = S.doc.objects.filter(o => { const d = lib.get(o.type); return d && !o.hidden && !d.annotation && !d.connection && !d.special; });
          input = el('select', { onchange: () => { vals[q.key] = input.value; } }, parts.map(o => el('option', { value: o.id, text: P().labelOf(o) })));
          input.value = vals[q.key];
        } else input = el('input', { type: 'number', min: q.min, max: q.max, step: q.step, value: vals[q.key], oninput: () => { const v = parseFloat(input.value); if (isFinite(v)) vals[q.key] = U.clamp(v, q.min, q.max); } });
        form.append(el('label', { class: 'field' }, el('span', { text: q.label + (q.unit ? ` (${q.unit})` : '') }), input));
      });
    };
    build();
    const go = el('button', { class: 'btn primary', type: 'button', text: 'Apply and play', onclick: () => {
      const o = Object.assign({}, vals);
      P().apply(p, target, o);
      m.close();
      RNBX.anim.play();
      const extra = ['orbit', 'zoom', 'lift'].includes(p.id) ? ' (switched to the 3D view)' : '';
      RNBX.toast(`${p.name} added${extra}. Add more with Animate, fine-tune in the timeline, export from Export ▸ Video / GIF. Ctrl+Z to undo.`);
    } });
    right.append(form, el('div', { class: 'row', style: { gap: '8px', marginTop: '12px', flexWrap: 'wrap' } }, go));
    if (RNBX.anim.hasAnimation(S.doc) || S.doc.animation.flow || S.doc.animation.reveal) right.append(el('div', { class: 'note', style: { marginTop: '10px' }, text: 'It is added to the animations already in the figure; the length grows if needed.' }));
  };

  P().GROUPS.forEach(g => {
    gallery.append(el('h4', { class: 'tpl-head', text: g }));
    const grid = el('div', { class: 'anim-grid' });
    P().list.filter(p => p.group === g).forEach(p => {
      const ok = P().available(p, doc);
      const card = el('button', { class: 'anim-card' + (ok ? '' : ' off'), type: 'button', 'data-id': p.id, title: ok ? p.desc : (HINT[p.id] || '') },
        el('span', { class: 'ic', html: P().icon(p.icon) }), el('span', { class: 'nm', text: p.name }));
      card.onclick = () => settings(p);
      grid.append(card);
    });
    gallery.append(grid);
  });

  showApplied();
  const body = el('div', {}, applied, el('div', { class: 'anim-wrap' }, gallery, right));
  const m = D.modal({ title: 'Animate', sub: 'One click animates your figure. Everything stays editable in the timeline and can be undone.', wide: true, body,
    foot: [el('button', { class: 'btn ghost', type: 'button', text: 'Open timeline (manual)', onclick: () => { m.close(); RNBX.timeline.show(); } }),
      el('button', { class: 'btn ghost', type: 'button', text: 'Export video / GIF', onclick: () => { m.close(); RNBX.dialogs.exporter('video'); } })] });
  const first = (focusId && P().list.find(p => p.id === focusId)) || P().list.find(p => p.id === 'orbit');
  settings(first);
};

AN.init = () => { const b = D.$('#btnAnimate'); if (b) b.onclick = () => AN.open(); };
})();
