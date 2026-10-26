/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/layers.js
   Object list in stacking order (top first): select, rename via
   the inspector, show / hide, lock, and drag to reorder.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom, el = D.el;
const L = RNBX.layers = {};
let dragId = null;

const nameOf = o => {
  const def = lib.get(o.type);
  const lab = o.label && o.label.text ? RNBX.text.fill(o.label.text, o.props).replace(/\n/g, ' ') : '';
  if (o.type === 'text' || o.type === 'panel') return '“' + String(o.props.text).slice(0, 24) + '”';
  if (def.connection) {
    const a = RNBX.getObj(o.props.from), b = RNBX.getObj(o.props.to);
    const n = x => x ? (x.label && x.label.text ? RNBX.text.fill(x.label.text, x.props) : lib.get(x.type).name) : '?';
    return `${def.name}: ${n(a)} → ${n(b)}`;
  }
  return lab || o.kindName || def.name;
};

L.build = () => {
  const host = D.$('#layers');
  if (host.hidden) return;
  host.innerHTML = '';
  const objs = S.doc.objects.slice().reverse();
  if (!objs.length) { host.append(el('div', { class: 'lib-empty', text: 'No objects yet.' })); return; }
  const mode = S.doc.style.mode === 'schematic' ? 'schematic' : 'shaded';
  objs.forEach(o => {
    const def = lib.get(o.type);
    if (!def) return;
    const row = el('div', { class: 'layer' + (S.selection.includes(o.id) ? ' sel' : ''), draggable: 'true' },
      el('div', { class: 'lt', html: D.thumb(o.type, o.props, mode) }),
      el('div', { class: 'ln' }, nameOf(o), el('small', { text: def.name !== nameOf(o) ? def.name : '' })),
      D.iconBtn(o.hidden ? 'eyeOff' : 'eye', o.hidden ? 'Show' : 'Hide', e => { e.stopPropagation(); RNBX.history.checkpoint(); o.hidden = !o.hidden; RNBX.changed(); L.build(); }),
      D.iconBtn(o.locked ? 'lock' : 'unlock', o.locked ? 'Unlock' : 'Lock', e => { e.stopPropagation(); RNBX.history.checkpoint(); o.locked = !o.locked; RNBX.changed(); L.build(); }));
    row.addEventListener('click', e => RNBX.select([o.id], e.shiftKey || e.metaKey || e.ctrlKey));
    row.addEventListener('dragstart', e => { dragId = o.id; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', o.id); });
    row.addEventListener('dragover', e => { e.preventDefault(); row.classList.add('dragover'); });
    row.addEventListener('dragleave', () => row.classList.remove('dragover'));
    row.addEventListener('drop', e => {
      e.preventDefault(); row.classList.remove('dragover');
      if (!dragId || dragId === o.id) return;
      RNBX.history.checkpoint();
      const arr = S.doc.objects, from = arr.findIndex(x => x.id === dragId);
      const [m] = arr.splice(from, 1);
      // dropping on a row places the dragged object just above it
      const to = arr.findIndex(x => x.id === o.id);
      arr.splice(to + 1, 0, m);
      dragId = null;
      RNBX.changed(); L.build();
    });
    host.append(row);
  });
};

/* z-order commands */
L.order = how => {
  const ids = new Set(S.selection);
  if (!ids.size) return;
  RNBX.history.checkpoint();
  const arr = S.doc.objects, sel = arr.filter(o => ids.has(o.id)), rest = arr.filter(o => !ids.has(o.id));
  if (how === 'front') S.doc.objects = rest.concat(sel);
  else if (how === 'back') S.doc.objects = sel.concat(rest);
  else {
    const step = how === 'forward' ? 1 : -1;
    const a = arr.slice();
    const idx = a.map((o, i) => ids.has(o.id) ? i : -1).filter(i => i >= 0);
    (step > 0 ? idx.reverse() : idx).forEach(i => { const j = i + step; if (j >= 0 && j < a.length && !ids.has(a[j].id)) { [a[i], a[j]] = [a[j], a[i]]; } });
    S.doc.objects = a;
  }
  RNBX.changed(); L.build();
};

L.init = () => {
  RNBX.on('selection', L.build);
  RNBX.on('document', L.build);
  RNBX.on('change', k => { if (k === 'doc') L.buildSoon(); });
};
L.buildSoon = RNBX.util.debounce(() => L.build(), 250);
})();
