/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/command.js
   Command palette (Ctrl+K or Ctrl+Shift+P): type a few letters
   to run any menu command, add any component, open a template,
   switch the figure style or open a Studio tab. ↑ ↓ to choose,
   Enter to run, Esc to close.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, lib = RNBX.lib;
const CP = RNBX.command = {};

/* every command: { group, label, key, keywords, run } */
CP.commands = () => {
  const out = [], M = RNBX.menus;
  Object.keys(M.items || {}).forEach(group => {
    let items = [];
    try { items = M.items[group](); } catch (e) { items = []; }
    items.forEach(it => { if (it && it !== '-' && it.label && it.action && !it.disabled) out.push({ group, label: it.label.replace(/^✓ /, ''), key: it.key || '', run: it.action }); });
  });
  out.push({ group: 'File', label: 'Versions… (history of this figure)', key: '', keywords: 'history snapshot restore backup', run: () => RNBX.versions.dialog() });
  [['schematic', 'Schematic'], ['shaded', 'Shaded'], ['3d', '3D']].forEach(([m, n]) => out.push({ group: 'View', label: 'Figure style: ' + n, run: () => RNBX.menus.setMode(m) }));
  [['layers', 'Layers (thin films, ellipsometry, guided modes)'], ['pattern', 'Pattern (gratings, metasurfaces)'], ['particles', 'Particles (Mie, NPoM, colour)'], ['part', 'Part Builder']].forEach(([m, n]) => out.push({ group: 'Studio', label: 'Open Layer Studio ▸ ' + n, keywords: 'studio', run: () => RNBX.studio.open(null, m) }));
  RNBX.templates.list.forEach(t => out.push({ group: 'Template', label: t.name, keywords: t.desc + ' template', run: () => {
    if (S.doc.objects.length && !confirm('Replace the current figure with this template? (Ctrl+Z brings it back.)')) return;
    RNBX.history.checkpoint(); RNBX.setDocument(RNBX.normalizeDocument(t.build()), true); RNBX.toast(t.name + ' loaded.');
  } }));
  lib.entries().forEach(e => out.push({ group: 'Add', label: e.name, keywords: (e.keywords || '') + ' ' + (e.category || ''), sub: e.category, run: () => RNBX.canvas.placeNew({ type: e.type, props: e.props || undefined }, [S.doc.page.width / 2, S.doc.page.height / 2], false) }));
  return out;
};
/* all query words must appear; label matches rank above keyword matches, starts above contains */
CP.search = (cmds, q) => {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return cmds.filter(c => c.group !== 'Add' && c.group !== 'Template').slice(0, 40);
  return cmds.map(c => {
    const L = c.label.toLowerCase(), all = (c.group + ' ' + L + ' ' + (c.keywords || '') + ' ' + (c.sub || '')).toLowerCase();
    if (!words.every(w => all.includes(w))) return null;
    let s = 0; words.forEach(w => { s += L.startsWith(w) ? 6 : L.includes(' ' + w) ? 4 : L.includes(w) ? 3 : 1; });
    if (c.group !== 'Add') s += 0.5;
    return { c, s };
  }).filter(Boolean).sort((a, b) => b.s - a.s || a.c.label.length - b.c.label.length).slice(0, 60).map(x => x.c);
};
CP.open = () => {
  if (document.querySelector('.cmd-pal')) return;
  const cmds = CP.commands();
  const input = el('input', { type: 'search', class: 'cmd-input', placeholder: 'Type a command, a component or a template…  (↑ ↓, Enter)' });
  const list = el('div', { class: 'cmd-list', role: 'listbox' });
  let shown = [], idx = 0;
  const draw = () => {
    shown = CP.search(cmds, input.value); idx = Math.min(idx, Math.max(0, shown.length - 1));
    list.innerHTML = '';
    if (!shown.length) list.append(el('div', { class: 'note', text: 'Nothing matches.' }));
    shown.forEach((c, i) => {
      const row = el('button', { type: 'button', class: 'cmd-row' + (i === idx ? ' on' : ''), role: 'option', onclick: () => run(c), onmousemove: () => { if (idx !== i) { idx = i; mark(); } } },
        el('span', { class: 'cmd-group', text: c.group }), el('span', { class: 'cmd-label', text: c.label }), c.sub ? el('span', { class: 'cmd-sub', text: c.sub }) : null, c.key ? el('kbd', { text: c.key }) : null);
      list.append(row);
    });
  };
  const mark = () => { [...list.children].forEach((r, i) => r.classList.toggle('on', i === idx)); const r = list.children[idx]; if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' }); };
  const run = c => { m.close(); setTimeout(() => { try { c.run(); } catch (e) { RNBX.toast(e.message || String(e), 'error'); } }, 0); };
  input.oninput = () => { idx = 0; draw(); };
  input.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(shown.length - 1, idx + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(0, idx - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (shown[idx]) run(shown[idx]); }
  };
  const m = D.modal({ title: 'Command palette', sub: `${cmds.length} commands, components and templates · Ctrl+K`, body: [input, list] });
  m.root.classList.add('cmd-pal');
  draw();
  input.focus();
  setTimeout(() => input.focus(), 20);
  return m;
};
CP.init = () => {
  document.addEventListener('keydown', e => {
    const c = e.ctrlKey || e.metaKey, k = (e.key || '').toLowerCase();
    if (c && (k === 'k' || (e.shiftKey && k === 'p'))) { e.preventDefault(); e.stopPropagation(); CP.open(); }
  }, true);
};
})();
