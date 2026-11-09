/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/a11y.js
   Keyboard and screen-reader access to the canvas.

   With the canvas focused:
     Tab / Shift+Tab   select the next / previous object (after the
                       last one, Tab leaves the canvas as usual)
     Enter             move focus to the selected object's settings
     Arrow keys, R, F, O, Delete   as everywhere (move, rotate, flip,
                       orient to the beam, delete)
   Every change of selection is announced in a polite live region:
   what the object is, where it is, and whether light reaches it.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, lib = RNBX.lib;
const A = RNBX.a11y = {};
let live = null, lastMsg = '';

A.say = msg => {
  if (!live) return;
  // toggling the text makes repeated messages announce again
  live.textContent = msg === lastMsg ? msg + ' ' : msg;
  lastMsg = msg;
};

const nameOf = o => { const def = lib.get(o.type); const lab = o.label && o.label.show && o.label.text ? RNBX.text.fill(o.label.text, o.props).replace(/[_^{}*\\]/g, '') : ''; return (o.kindName || (def && def.name) || o.type) + (lab && lab !== ((def && def.name) || '') ? ' “' + lab + '”' : ''); };
A.describe = o => {
  const parts = [nameOf(o) + ' selected', 'x ' + U.fmt(o.x, 1) + ' mm, y ' + U.fmt(o.y, 1) + ' mm'];
  if (o.rot) parts.push('rotated ' + U.fmt(o.rot, 0) + '°');
  try {
    const t = RNBX.render && RNBX.render._trace, h = t && t.hits && t.hits[o.id];
    if (h && h.P > 0) parts.push('light arriving: ' + U.fmt(h.P, 2) + ' mW');
  } catch (e) { /* no trace yet */ }
  if (o.locked) parts.push('locked');
  return parts.join(', ') + '.';
};

const ordered = () => S.doc.objects.filter(o => !o.hidden && lib.get(o.type) && !lib.get(o.type).connection);

A.init = () => {
  live = document.createElement('div');
  live.className = 'sr-only'; live.id = 'a11yLive';
  live.setAttribute('aria-live', 'polite'); live.setAttribute('role', 'status');
  document.body.append(live);
  const help = document.createElement('p');
  help.className = 'sr-only'; help.id = 'canvasHelp';
  help.textContent = 'Figure canvas. Tab and Shift+Tab select objects; arrow keys move the selection, R rotates, F flips, O turns it to face the beam, Delete removes it; Enter opens its settings. Add parts from the component library.';
  document.body.append(help);
  const svg = document.getElementById('canvas');
  if (!svg) return;
  svg.setAttribute('aria-describedby', 'canvasHelp');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-roledescription', 'figure canvas');
  const search = document.getElementById('libSearch'); if (search) search.setAttribute('aria-label', 'Search components');

  svg.addEventListener('keydown', e => {
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const list = ordered(); if (!list.length) return;
      const cur = S.selection.length ? list.findIndex(o => o.id === S.selection[S.selection.length - 1]) : -1;
      const next = cur + (e.shiftKey ? -1 : 1);
      if (next < 0 || next >= list.length) { if (cur >= 0) RNBX.select([]); return; }   // let focus leave the canvas
      e.preventDefault();
      RNBX.select([list[next].id]);
    } else if (e.key === 'Enter' && S.selection.length) {
      const f = document.querySelector('#inspector input, #inspector select, #inspector textarea, .panel.right input, .panel.right select');
      if (f) { e.preventDefault(); f.focus(); }
    }
  });
  let prev = '';
  RNBX.on('selection', sel => {
    const key = sel.join(',');
    if (key === prev) return; prev = key;
    if (!sel.length) { A.say('Nothing selected.'); return; }
    if (sel.length > 1) { A.say(sel.length + ' objects selected.'); return; }
    const o = RNBX.getObj(sel[0]); if (o) A.say(A.describe(o));
  });
  // reflect the reduced-motion preference: animations start paused
  try { if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('reduce-motion'); } catch (e) { /* ignore */ }
};
})();
