/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/menus.js
   Top-bar menus and tool buttons, the figure-style switch,
   the context menu and all keyboard shortcuts.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el;
const M = RNBX.menus = {};
const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

const toggleStyle = (key, label) => { RNBX.history.checkpoint(); S.doc.style[key] = !S.doc.style[key]; RNBX.changed(); M.syncTools(); RNBX.inspector.build(); RNBX.toast(label + (S.doc.style[key] ? ' on' : ' off')); };
const toggleUi = (key, label) => { S.ui[key] = !S.ui[key]; U.store.set('rnbx_ui', { grid: S.ui.grid, snap: S.ui.snap }); RNBX.changed(); M.syncTools(); RNBX.toast(label + (S.ui[key] ? ' on' : ' off')); };
M.setMode = mode => {
  if (S.doc.style.mode === mode) return;
  RNBX.history.checkpoint();
  S.doc.style.mode = mode;
  RNBX.emit('styleMode', mode);
  RNBX.changed();
  M.syncTools();
  RNBX.inspector.build();
};
M.newDoc = () => {
  if (S.doc.objects.length && !confirm('Start a new, empty figure? (Undo with Ctrl+Z.)')) return;
  RNBX.history.checkpoint();
  const d = RNBX.newDocument(S.doc.page.preset !== 'custom' ? S.doc.page.preset : 'nature-2');
  RNBX.setDocument(d, true);
};
/* One-click reset: empty default figure, default view and tools.
   It is a single undo step, so nothing is ever lost. */
M.resetAll = () => {
  if (RNBX.anim && S.playing) RNBX.anim.stop();
  RNBX.history.checkpoint();
  RNBX.setDocument(RNBX.newDocument('nature-2'), true);
  Object.assign(S.ui, { grid: true, snap: true, gridSize: 2.5, tool: 'select', connectFrom: null });
  const tl = D.$('#timeline'); if (tl && !tl.hidden) RNBX.timeline.toggle();
  D.$('#app').classList.remove('lib-hidden', 'drawer-open');
  RNBX.emit('tool', 'select');
  M.syncTools(); RNBX.inspector.build();
  setTimeout(() => RNBX.canvas.fit(), 30);
  RNBX.toast('Everything reset to the start', '', { label: 'Undo', fn: () => RNBX.history.undo() });
};
const sel = () => S.selection.length > 0;

M.items = {
  File: () => [
    { label: 'New figure', icon: 'file', action: M.newDoc },
    { label: 'Reset everything', icon: 'reset', action: M.resetAll },
    { label: 'Templates…', icon: 'grid', action: () => RNBX.dialogs.templates() },
    { label: 'Open project…', key: mod + 'O', action: () => RNBX.project.pickFile('.json,application/json', f => RNBX.project.openFile(f)) },
    { label: 'Save project', key: mod + 'S', action: () => RNBX.project.save() },
    '-',
    { label: 'Import image…', action: () => RNBX.project.pickFile('image/*', f => RNBX.project.importImage(f)) },
    { label: 'Add data panel (plot)…', icon: 'plus', action: () => RNBX.arrange.addDataPanel() },
    { label: 'Add data panel from RNSpectraX', action: () => { const d = RNBX.plotData.readHandoff(); if (d) { RNBX.arrange.addDataPanel(d); RNBX.toast('Spectrum from RNSpectraX added as panel'); } else RNBX.toast('Nothing received yet: in RNSpectraX open Export ▾ and press “→ RNBeamX”.'); } },
    { label: 'Export…', icon: 'download', key: mod + 'E', action: () => RNBX.dialogs.exporter() },
    '-',
    { label: 'Journal check', action: () => RNBX.dialogs.check() },
    { label: 'Caption helper', action: () => RNBX.dialogs.caption() },
    '-',
    { label: 'Guide ↗ (illustrated)', icon: 'book', action: () => window.open(RNBX.links.guide, '_blank', 'noopener') },
    { label: 'User manual ↗', action: () => window.open(RNBX.links.manual, '_blank', 'noopener') },
    { label: 'Open RNSpectraX ↗ (spectra)', action: () => window.open(RNBX.links.spectrax, '_blank', 'noopener') },
    { label: 'Rakesh Naik — website ↗', action: () => window.open(RNBX.links.home, '_blank', 'noopener') },
  ],
  Edit: () => [
    { label: 'Undo', icon: 'undo', key: mod + 'Z', disabled: !RNBX.history.undoStack.length, action: () => RNBX.history.undo() },
    { label: 'Redo', icon: 'redo', key: mod + '⇧Z', disabled: !RNBX.history.redoStack.length, action: () => RNBX.history.redo() },
    '-',
    { label: 'Cut', key: mod + 'X', disabled: !sel(), action: () => { RNBX.project.copy(); RNBX.removeObjects(S.selection.slice()); } },
    { label: 'Copy', key: mod + 'C', disabled: !sel(), action: () => RNBX.project.copy() },
    { label: 'Paste', key: mod + 'V', action: () => RNBX.project.paste() },
    { label: 'Duplicate', icon: 'copy', key: mod + 'D', disabled: !sel(), action: () => RNBX.project.duplicate() },
    { label: 'Delete', icon: 'trash', key: 'Del', disabled: !sel(), action: () => RNBX.removeObjects(S.selection.slice()) },
    '-',
    { label: 'Select all', key: mod + 'A', action: () => RNBX.select(S.doc.objects.filter(o => !o.hidden).map(o => o.id)) },
    { label: 'Deselect', key: 'Esc', action: () => RNBX.select([]) },
  ],
  Arrange: () => [
    { label: 'Bring to front', icon: 'front', key: mod + ']', disabled: !sel(), action: () => RNBX.layers.order('front') },
    { label: 'Bring forward', disabled: !sel(), action: () => RNBX.layers.order('forward') },
    { label: 'Send backward', disabled: !sel(), action: () => RNBX.layers.order('backward') },
    { label: 'Send to back', icon: 'back', key: mod + '[', disabled: !sel(), action: () => RNBX.layers.order('back') },
    '-',
    { label: 'Rotate +15°', icon: 'rotate', key: 'R', disabled: !sel(), action: () => RNBX.inspector.rotateBy(15) },
    { label: 'Rotate −15°', key: '⇧R', disabled: !sel(), action: () => RNBX.inspector.rotateBy(-15) },
    { label: 'Flip', icon: 'flip', key: 'F', disabled: !sel(), action: () => RNBX.inspector.flip() },
    { label: 'Orient to beam', icon: 'wand', key: 'O', disabled: !sel(), action: () => RNBX.canvas.orientToBeam() },
    { label: 'Auto-arrange labels', icon: 'label', key: '⇧L', action: () => RNBX.labels.arrange() },
    '-',
    { label: 'Align left', icon: 'alignL', disabled: S.selection.length < 2, action: () => RNBX.arrange.align('left') },
    { label: 'Align centres (horizontal)', icon: 'alignC', disabled: S.selection.length < 2, action: () => RNBX.arrange.align('cx') },
    { label: 'Align centres (vertical)', icon: 'alignM', disabled: S.selection.length < 2, action: () => RNBX.arrange.align('cy') },
    { label: 'Distribute horizontally', icon: 'distH', disabled: S.selection.length < 3, action: () => RNBX.arrange.distribute('x') },
    { label: 'Distribute vertically', icon: 'distV', disabled: S.selection.length < 3, action: () => RNBX.arrange.distribute('y') },
  ],
  View: () => [
    { label: 'Fit page', icon: 'fit', key: '0', action: () => RNBX.canvas.fit() },
    { label: 'Zoom in', key: '+', action: () => RNBX.canvas.zoomBy(1.25) },
    { label: 'Zoom out', key: '−', action: () => RNBX.canvas.zoomBy(0.8) },
    '-',
    { label: (S.ui.grid ? '✓ ' : '') + 'Grid', key: 'G', action: () => toggleUi('grid', 'Grid') },
    { label: (S.ui.snap ? '✓ ' : '') + 'Snapping', action: () => toggleUi('snap', 'Snapping') },
    { label: (S.doc.style.showLabels ? '✓ ' : '') + 'Component labels', key: 'L', action: () => toggleStyle('showLabels', 'Labels') },
    { label: (S.doc.style.polarization ? '✓ ' : '') + 'Polarisation marks', key: 'P', action: () => toggleStyle('polarization', 'Polarisation marks') },
    { label: (S.doc.style.beamArrows ? '✓ ' : '') + 'Beam direction arrows', action: () => toggleStyle('beamArrows', 'Arrows') },
    { label: (S.doc.style.beamGlow ? '✓ ' : '') + 'Beam glow', action: () => toggleStyle('beamGlow', 'Glow') },
    '-',
    { label: 'Animation timeline', key: 'T', action: () => RNBX.timeline.toggle() },
    { label: 'Help & shortcuts', icon: 'help', key: '?', action: () => RNBX.dialogs.help() },
  ],
};

M.syncTools = () => {
  document.querySelectorAll('#styleSwitch button').forEach(b => b.classList.toggle('active', b.dataset.mode === S.doc.style.mode));
  const st = S.doc.style;
  const set = (id, on) => { const b = document.getElementById(id); if (b) b.classList.toggle('on', !!on); };
  set('tGrid', S.ui.grid); set('tSnap', S.ui.snap); set('tLabels', st.showLabels); set('tPol', st.polarization); set('tArrows', st.beamArrows); set('tGlow', st.beamGlow);
  const u = document.getElementById('tUndo'), r = document.getElementById('tRedo');
  if (u) u.disabled = !RNBX.history.undoStack.length;
  if (r) r.disabled = !RNBX.history.redoStack.length;
  const tu = document.getElementById('tbUndo'), tr = document.getElementById('tbRedo');
  if (tu) tu.disabled = !RNBX.history.undoStack.length;
  if (tr) tr.disabled = !RNBX.history.redoStack.length;
  const hud = D.$('#view3dHud');
  hud.hidden = st.mode !== '3d';
  if (st.mode === '3d') { D.$('#hudYaw').value = S.doc.view3d.yaw; D.$('#hudPitch').value = S.doc.view3d.pitch; }
  D.$('#btnTheme').innerHTML = D.icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon');
};

M.init = () => {
  const nav = D.$('#menus');
  Object.keys(M.items).forEach(name => {
    const b = el('button', { type: 'button', text: name });
    b.onclick = () => { const r = b.getBoundingClientRect(); D.menu(M.items[name](), r.left, r.bottom + 4, b); };
    b.onmouseenter = () => { const open = nav.querySelector('.open'); if (open && open !== b) b.click(); };
    nav.append(b);
  });
  const tools = D.$('#topTools');
  tools.append(
    D.iconBtn('undo', 'Undo (' + mod + 'Z)', () => RNBX.history.undo(), { id: 'tUndo' }),
    D.iconBtn('redo', 'Redo (' + mod + 'Shift+Z)', () => RNBX.history.redo(), { id: 'tRedo' }),
    D.iconBtn('reset', 'Reset everything to the start (undo brings it back)', () => M.resetAll(), { id: 'tReset' }),
    el('span', { class: 'sep' }),
    D.iconBtn('grid', 'Grid (G)', () => toggleUi('grid', 'Grid'), { id: 'tGrid' }),
    D.iconBtn('magnet', 'Snap to grid, guides and beams', () => toggleUi('snap', 'Snapping'), { id: 'tSnap' }),
    D.iconBtn('label', 'Component labels (L)', () => toggleStyle('showLabels', 'Labels'), { id: 'tLabels' }),
    D.iconBtn('pol', 'Polarisation marks (P)', () => toggleStyle('polarization', 'Polarisation marks'), { id: 'tPol' }),
    D.iconBtn('arrows', 'Beam direction arrows', () => toggleStyle('beamArrows', 'Arrows'), { id: 'tArrows' }),
    D.iconBtn('glow', 'Beam glow', () => toggleStyle('beamGlow', 'Glow'), { id: 'tGlow' }),
    el('span', { class: 'sep' }),
    D.iconBtn('fit', 'Fit page (0)', () => RNBX.canvas.fit()),
  );
  document.querySelectorAll('#styleSwitch button').forEach(b => b.onclick = () => M.setMode(b.dataset.mode));
  D.$('#btnExport').onclick = () => RNBX.dialogs.exporter();
  // links to the companion app and the authors' site (addresses in js/config.js)
  D.$('#lnkSpectrax').href = RNBX.links.spectrax;
  D.$('#lnkHome').href = RNBX.links.home;
  D.$('#lnkGuide').href = RNBX.links.guide;
  D.$('#lnkManual').href = RNBX.links.manual;
  D.$('#btnTemplates').onclick = () => RNBX.dialogs.templates();
  D.$('#btnHelp').innerHTML = D.icon('help');
  D.$('#btnHelp').onclick = () => RNBX.dialogs.help();
  D.$('#btnTheme').onclick = () => {
    const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    U.store.set('rnbx_theme', dark ? 'dark' : 'light');
    M.syncTools();
  };
  const hudSet = (k, inp) => inp.addEventListener('input', () => { RNBX.history.checkpoint('hud' + k); S.doc.view3d[k] = +inp.value; RNBX.anim.touch([]); RNBX.changed(); RNBX.inspector.sync(); });
  hudSet('yaw', D.$('#hudYaw')); hudSet('pitch', D.$('#hudPitch'));
  document.querySelectorAll('[data-empty]').forEach(b => b.onclick = () => {
    if (b.dataset.empty === 'template') RNBX.dialogs.templates();
    else RNBX.canvas.placeNew({ type: 'laser' }, [S.doc.page.width * 0.18, S.doc.page.height * 0.5], false);
  });
  RNBX.on('history', M.syncTools);
  RNBX.on('document', M.syncTools);
  RNBX.on('contextmenu', e => {
    const idEl = e.target.closest && e.target.closest('#figure [data-id]');
    if (idEl && !S.selection.includes(idEl.getAttribute('data-id'))) RNBX.select([idEl.getAttribute('data-id')]);
    const items = sel() ? M.items.Arrange().slice(0, 9).concat(['-', { label: 'Duplicate', key: mod + 'D', action: () => RNBX.project.duplicate() }, { label: 'Add keyframe', key: 'I', action: () => { RNBX.anim.addKey(S.selection); RNBX.timeline.show(); } }, { label: 'Delete', key: 'Del', action: () => RNBX.removeObjects(S.selection.slice()) }])
      : [{ label: 'Paste', action: () => RNBX.project.paste() }, { label: 'Fit page', action: () => RNBX.canvas.fit() }, { label: 'Templates…', action: () => RNBX.dialogs.templates() }];
    D.menu(items, e.clientX, e.clientY);
  });
  document.addEventListener('keydown', onKey);
  // touch toolbar: the essentials within thumb reach on tablets and phones
  const app = D.$('#app');
  const scrim = el('div', { class: 'drawer-scrim', onclick: () => app.classList.remove('drawer-open') });
  app.append(scrim);
  // narrow screens: slide-out drawer; wider screens: show / hide the docked library
  M.toggleDrawer = force => {
    if (innerWidth < 820) app.classList.toggle('drawer-open', force);
    else { app.classList.remove('drawer-open'); app.classList.toggle('lib-hidden', force === undefined ? undefined : !force); setTimeout(() => RNBX.canvas.fit(), 30); }
  };
  const tb = D.$('#touchBar');
  tb.append(
    D.iconBtn('grid', 'Components', () => M.toggleDrawer()),
    D.iconBtn('undo', 'Undo', () => RNBX.history.undo(), { id: 'tbUndo' }),
    D.iconBtn('redo', 'Redo', () => RNBX.history.redo(), { id: 'tbRedo' }),
    D.iconBtn('reset', 'Reset everything', () => M.resetAll()),
    D.iconBtn('rotate', 'Rotate 15°', () => RNBX.inspector.rotateBy(15)),
    D.iconBtn('flip', 'Flip', () => RNBX.inspector.flip()),
    D.iconBtn('copy', 'Duplicate', () => RNBX.project.duplicate()),
    D.iconBtn('trash', 'Delete', () => RNBX.removeObjects(S.selection.slice())),
    D.iconBtn('key', 'Add keyframe', () => { if (S.selection.length) { RNBX.anim.addKey(S.selection); RNBX.timeline.show(); } else RNBX.toast('Select an object first'); }),
    D.iconBtn('play', 'Play / pause', () => RNBX.anim.toggle(), { id: 'tbPlay' }));
  RNBX.on('playstate', pl => { const b = D.$('#tbPlay'); if (b) b.innerHTML = D.icon(pl ? 'pause' : 'play'); });
  // picking a component from the drawer closes it
  RNBX.on('selection', () => { if (app.classList.contains('drawer-open')) app.classList.remove('drawer-open'); });
  M.syncTools();
};

function onKey(e) {
  const t = document.activeElement;
  const typing = t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable);
  const c = e.ctrlKey || e.metaKey;
  if (D.$('#modalRoot').children.length) return;
  if (c && !typing) {
    const k = e.key.toLowerCase();
    if (k === 'z') { e.preventDefault(); e.shiftKey ? RNBX.history.redo() : RNBX.history.undo(); return; }
    if (k === 'y') { e.preventDefault(); RNBX.history.redo(); return; }
    if (k === 'c') { RNBX.project.copy(); return; }
    if (k === 'x') { RNBX.project.copy(); RNBX.removeObjects(S.selection.slice()); return; }
    if (k === 'v') { e.preventDefault(); RNBX.project.paste(); return; }
    if (k === 'd') { e.preventDefault(); RNBX.project.duplicate(); return; }
    if (k === 'a') { e.preventDefault(); RNBX.select(S.doc.objects.filter(o => !o.hidden).map(o => o.id)); return; }
    if (k === ']') { e.preventDefault(); RNBX.layers.order('front'); return; }
    if (k === '[') { e.preventDefault(); RNBX.layers.order('back'); return; }
  }
  if (c) {
    const k = e.key.toLowerCase();
    if (k === 's') { e.preventDefault(); RNBX.project.save(); return; }
    if (k === 'o') { e.preventDefault(); RNBX.project.pickFile('.json,application/json', f => RNBX.project.openFile(f)); return; }
    if (k === 'e') { e.preventDefault(); RNBX.dialogs.exporter(); return; }
    return;
  }
  if (typing) return;
  const selObjs = RNBX.selected().filter(o => !o.locked);
  const nudge = (dx, dy) => {
    if (!selObjs.length) return;
    RNBX.history.checkpoint('nudge');
    selObjs.forEach(o => { o.x += dx; o.y += dy; });
    RNBX.anim.touch(selObjs.map(o => o.id));
    RNBX.changed();
  };
  const step = e.shiftKey ? 5 : 0.5;
  switch (e.key) {
    case 'Delete': case 'Backspace': if (S.selection.length) { e.preventDefault(); RNBX.removeObjects(S.selection.slice()); } break;
    case 'Escape': if (S.ui.tool !== 'select') RNBX.canvas.setTool('select'); else RNBX.select([]); RNBX.palette.build(); break;
    case 'ArrowLeft': e.preventDefault(); nudge(-step, 0); break;
    case 'ArrowRight': e.preventDefault(); nudge(step, 0); break;
    case 'ArrowUp': e.preventDefault(); nudge(0, -step); break;
    case 'ArrowDown': e.preventDefault(); nudge(0, step); break;
    case 'r': case 'R': RNBX.inspector.rotateBy((e.shiftKey ? -1 : 1) * (e.altKey ? 1 : 15)); break;
    case 'f': case 'F': RNBX.inspector.flip(); break;
    case 'o': case 'O': RNBX.canvas.orientToBeam(); break;
    case 'g': case 'G': toggleUi('grid', 'Grid'); break;
    case 'l': case 'L': if (e.shiftKey) RNBX.labels.arrange(); else toggleStyle('showLabels', 'Labels'); break;
    case 'p': case 'P': toggleStyle('polarization', 'Polarisation marks'); break;
    case 't': case 'T': RNBX.timeline.toggle(); break;
    case 'k': case 'K': RNBX.anim.toggle(); break;
    case 'i': case 'I': if (S.selection.length) { RNBX.anim.addKey(S.selection); RNBX.timeline.show(); } break;
    case '1': M.setMode('schematic'); break;
    case '2': M.setMode('shaded'); break;
    case '3': M.setMode('3d'); break;
    case '0': RNBX.canvas.fit(); break;
    case '+': case '=': RNBX.canvas.zoomBy(1.25); break;
    case '-': case '_': RNBX.canvas.zoomBy(0.8); break;
    case '?': RNBX.dialogs.help(); break;
    default:
  }
}
})();
