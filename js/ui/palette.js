/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/palette.js
   The component library: searchable, grouped tiles with live
   thumbnails in the current figure style. Drag a tile onto the
   canvas, or click it to drop it at the centre of the view
   (optics snap onto a nearby beam automatically).
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom;
const Pal = RNBX.palette = {};
let collapsed = U.store.get('rnbx_collapsed', {});

Pal.build = () => {
  const root = D.$('#palette'), q = D.$('#libSearch').value.trim().toLowerCase();
  root.innerHTML = '';
  const mode = S.doc.style.mode === 'schematic' ? 'schematic' : 'shaded';
  // the user's own saved components come first
  const mine = U.store.get('rnbx_mylib', []).filter(m => lib.get(m.type || 'custom')).map(m => ({ type: m.type || 'custom', name: m.name, category: 'My components', props: m.props, def: lib.get(m.type || 'custom'), keywords: 'my custom group ' + m.name, mineId: m.id }));
  const entries = mine.concat(lib.entries()).filter(e => !q || (e.name + ' ' + e.keywords + ' ' + (e.def.abbr || '') + ' ' + e.category).toLowerCase().includes(q));
  if (!entries.length) { root.append(D.el('div', { class: 'lib-empty', text: 'No components match “' + q + '”.' })); return; }
  ['My components'].concat(lib.CATEGORIES).forEach(cat => {
    const items = entries.filter(e => e.category === cat);
    if (!items.length) return;
    const isCol = !q && collapsed[cat];
    const box = D.el('div', { class: 'cat' + (isCol ? ' collapsed' : '') });
    box.append(D.el('button', {
      class: 'cat-head', type: 'button', onclick: () => { collapsed[cat] = box.classList.toggle('collapsed'); U.store.set('rnbx_collapsed', collapsed); },
    }, cat, D.el('span', { class: 'chev', html: D.icon('down', 14) })));
    const grid = D.el('div', { class: 'cat-items' });
    items.forEach(e => {
      const tile = D.el('div', {
        class: 'tile' + (e.def.tool && S.ui.tool === e.def.tool ? ' active-tool' : ''), draggable: e.def.tool ? 'false' : 'true', title: e.name + (e.def.hint ? ' · ' + e.def.hint : ''), role: 'button', tabindex: '0',
        html: D.thumb(e.type, e.props, mode) + `<span>${U.esc(e.name)}</span>`,
      });
      const payload = JSON.stringify({ type: e.type, props: e.props, abbr: e.abbr, name: e.name });
      if (e.mineId) tile.title = e.name + ' · right-click to remove';
      tile.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/rnbx', payload); ev.dataTransfer.effectAllowed = 'copy'; });
      const add = () => {
        if (e.def.tool) { RNBX.canvas.setTool(S.ui.tool === e.def.tool ? 'select' : e.def.tool); Pal.build(); return; }
        RNBX.canvas.placeNew(JSON.parse(payload), RNBX.canvas.visibleCenter(), false);
      };
      tile.addEventListener('click', add);
      if (e.mineId) tile.addEventListener('contextmenu', ev => {
        ev.preventDefault();
        RNBX.dom.menu([{ label: 'Export as component file', icon: 'download', action: () => { const m = U.store.get('rnbx_mylib', []).find(q => q.id === e.mineId); if (m) RNBX.groups.exportFile({ type: m.type || 'custom', props: Object.assign({}, m.props, { name: m.name, title: m.name }) }); } }, { label: 'Remove from My components', icon: 'trash', action: () => { U.store.set('rnbx_mylib', U.store.get('rnbx_mylib', []).filter(m => m.id !== e.mineId)); Pal.build(); } }], ev.clientX, ev.clientY);
      });
      tile.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); add(); } });
      grid.append(tile);
    });
    box.append(grid);
    root.append(box);
  });
};

Pal.init = () => {
  D.$('#libSearch').addEventListener('input', U.debounce(Pal.build, 120));
  RNBX.on('styleMode', Pal.build);
  RNBX.on('tool', Pal.build);
  Pal.build();
};
})();
