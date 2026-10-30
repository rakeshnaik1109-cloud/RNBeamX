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
  RNBX.animateUI.init();
  RNBX.learn.init();
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
  // arriving from a Learn page: open its demo, or add the part (Ctrl+Z brings the previous figure back)
  const lid = params.get('learn'), add = params.get('add');
  if (lid && RNBX.learnContent && RNBX.learnContent.entries[lid]) {
    const nd = RNBX.learn.demoDoc(lid);
    if (nd) { RNBX.history.checkpoint(); nd.meta.title = RNBX.learn.title(lid); RNBX.setDocument(nd, true); setTimeout(() => RNBX.toast('Demo from Learn opened: change any setting and watch the beams. Ctrl+Z brings back your previous figure.'), 60); }
    history.replaceState(null, '', location.pathname);
  } else if (add && RNBX.lib.get(add)) {
    setTimeout(() => { RNBX.canvas.placeNew({ type: add }, [S.doc.page.width / 2, S.doc.page.height / 2], false); RNBX.toast(RNBX.lib.get(add).name + ' added from Learn. Ctrl+Z to undo.'); }, 80);
    history.replaceState(null, '', location.pathname);
  }
  // arriving from RNSpectraX's "→ RNBeamX": add the spectrum as a new panel
  if (params.get('from') === 'rnspectrax') {
    const d = RNBX.plotData.readHandoff();
    if (d) setTimeout(() => { RNBX.arrange.addDataPanel(d); RNBX.toast('Plot from RNSpectraX added as a panel. Ctrl+Z to undo.'); }, 50);
    history.replaceState(null, '', location.pathname);
  }
  // opened from a share link (#fig=…)
  if (/[#&]fig=/.test(location.hash)) RNBX.share.openFromHash();
  window.addEventListener('hashchange', () => { if (/[#&]fig=/.test(location.hash)) RNBX.share.openFromHash(); });
  RNBX.inspector.build();
  setTimeout(() => RNBX.canvas.fit(), 0);
  window.addEventListener('beforeunload', () => U.store.set('rnbx_autosave_v1', { t: Date.now(), doc: S.doc }));
});
})();
