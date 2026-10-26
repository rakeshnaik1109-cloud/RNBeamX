/* ═══════════════════════════════════════════════════════════
   RNBeamX — app.js
   Boot: shared paint servers, saved preferences, the last
   autosaved figure, then every UI module.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom;

document.addEventListener('DOMContentLoaded', () => {
  // gradients used by library thumbnails live once in the page
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  defs.setAttribute('width', '0'); defs.setAttribute('height', '0');
  defs.setAttribute('aria-hidden', 'true');
  defs.style.position = 'absolute';
  defs.innerHTML = '<defs>' + RNBX.renderDefs() + '</defs>';
  document.body.prepend(defs);

  const ui = U.store.get('rnbx_ui', null);
  if (ui) { S.ui.grid = ui.grid !== false; S.ui.snap = ui.snap !== false; }
  D.$('#versionPill').textContent = 'v' + RNBX.VERSION;

  RNBX.canvas.init();
  RNBX.palette.init();
  RNBX.inspector.init();
  RNBX.layers.init();
  RNBX.timeline.init();
  RNBX.menus.init();

  RNBX.on('change', kind => { if (kind !== 'selection' && kind !== 'time') RNBX.project.autosave(); });
  RNBX.on('change', () => { document.title = (S.doc.meta.title && S.doc.meta.title !== 'Untitled setup' ? S.doc.meta.title + ' · ' : '') + 'RNBeamX'; });

  const params = new URLSearchParams(location.search);
  const tpl = params.get('template');
  if (tpl && RNBX.templates.list.some(t => t.id === tpl)) {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === tpl).build());
  } else if (!RNBX.project.restore()) {
    RNBX.changed();
  }
  RNBX.inspector.build();
  setTimeout(() => RNBX.canvas.fit(), 0);
  window.addEventListener('beforeunload', () => U.store.set('rnbx_autosave_v1', { t: Date.now(), doc: S.doc }));
});
})();
