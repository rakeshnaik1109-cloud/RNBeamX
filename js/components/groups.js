/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/groups.js
   Groups: several parts that move, rotate and scale as one
   object (Ctrl+G, Ctrl+Shift+G to ungroup), and can be saved to
   "My components" or shared as a small component file.

   A group keeps its parts in props.children, positioned relative
   to the group's origin. Optical parts inside keep working: the
   tracer and the 3D view see the group's children in world
   coordinates (lib.expand), so a grouped mirror still reflects.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib;

/* children of a group in world coordinates (recursive) */
const place = (g, c, root) => {
  const s = g.scale || 1, q = U.toWorld(g, [c.x || 0, c.y || 0]);
  return Object.assign({}, c, { x: q[0], y: q[1], rot: U.normDeg((g.rot || 0) + (c.rot || 0)), scale: s * (c.scale || 1), z: (g.z || 0) + (c.z || 0) * s, _group: root });
};
lib.expand = objs => {
  const out = [];
  const walk = (o, root) => {
    if (o.type === 'group') { if (!o.hidden) (o.props.children || []).forEach(c => walk(place(o, c, root || o.id), root || o.id)); return; }
    out.push(o);
  };
  objs.forEach(o => walk(o, null));
  return out;
};
const hasGroups = objs => objs.some(o => o.type === 'group');
lib.expandIfNeeded = objs => hasGroups(objs) ? lib.expand(objs) : objs;

lib.register({
  type: 'group', name: 'Group', category: 'Shapes', hidden: true, abbr: '', autoLabel: false,
  defaults: { children: [], name: 'Group' },
  params: [{ key: 'name', label: 'Name', type: 'text' }],
  bbox(p) {
    const bs = (p.children || []).map(c => { try { return lib.worldBox(c); } catch (e) { return null; } }).filter(Boolean);
    if (!bs.length) return [-2, -2, 2, 2];
    return [Math.min(...bs.map(b => b[0])), Math.min(...bs.map(b => b[1])), Math.max(...bs.map(b => b[2])), Math.max(...bs.map(b => b[3]))];
  },
  draw(p, S) {
    const R = RNBX.render, doc = S.doc || RNBX.state.doc;
    let s = '', labels = '';
    (p.children || []).forEach(c => {
      const def = lib.get(c.type);
      if (!def || c.hidden || def.connection) return;
      let inner = '';
      try { inner = c.type === 'group' ? def.draw(c.props, S, c) : def.draw(c.props, S, c); } catch (e) { console.error(c.type, e); }
      const op = c.opacity != null && c.opacity < 1 ? ` opacity="${c.opacity}"` : '';
      s += `<g transform="${R.transform(c)}"${op}>${inner}</g>`;
      if (c.label && !def.annotation) labels += R.label(c, doc, c.x + c.label.dx, c.y + c.label.dy, false);
    });
    return s + labels;
  },
  // the 3D view draws the children (see renderer3d), so the group itself has no solid
});

/* ---------- group / ungroup ---------- */
const A = RNBX.groups = {};
A.group = (ids, name) => {
  const S = RNBX.state, doc = S.doc;
  const objs = doc.objects.filter(o => ids.includes(o.id) && lib.get(o.type) && !lib.get(o.type).connection);
  if (objs.length < 2) { RNBX.toast('Select two or more parts to group'); return null; }
  RNBX.history.checkpoint();
  const boxes = objs.map(o => lib.worldBox(o));
  const cx = U.round((Math.min(...boxes.map(b => b[0])) + Math.max(...boxes.map(b => b[2]))) / 2, 2);
  const cy = U.round((Math.min(...boxes.map(b => b[1])) + Math.max(...boxes.map(b => b[3]))) / 2, 2);
  const set = new Set(objs.map(o => o.id));
  // connections to grouped parts cannot reach inside a group
  const conns = doc.objects.filter(o => lib.get(o.type) && lib.get(o.type).connection && (set.has(o.props.from) || set.has(o.props.to)));
  const children = objs.map(o => { const c = U.deepClone(o); c.x = U.round(o.x - cx, 3); c.y = U.round(o.y - cy, 3); delete c._group; return c; });
  const g = RNBX.createObject('group', cx, cy);
  g.props.children = children; g.props.name = name || 'Group';
  const first = Math.min(...objs.map(o => doc.objects.indexOf(o)));
  doc.objects = doc.objects.filter(o => !set.has(o.id) && !conns.includes(o));
  doc.objects.splice(Math.min(first, doc.objects.length), 0, g);
  objs.forEach(o => { delete doc.animation.tracks[o.id]; });
  RNBX.select([g.id]);
  RNBX.toast(`Grouped ${objs.length} parts` + (conns.length ? ` (${conns.length} fibre/wire connection${conns.length > 1 ? 's' : ''} to them removed)` : '') + '. Ctrl+Shift+G ungroups.');
  return g;
};
A.ungroup = ids => {
  const S = RNBX.state, doc = S.doc;
  const groups = doc.objects.filter(o => ids.includes(o.id) && o.type === 'group');
  if (!groups.length) return;
  RNBX.history.checkpoint();
  const sel = [];
  groups.forEach(g => {
    const kids = (g.props.children || []).map(c => { const w = place(g, c, null); delete w._group; w.id = doc.objects.some(o => o.id === w.id) ? U.uid() : w.id; return w; });
    const i = doc.objects.indexOf(g);
    doc.objects.splice(i, 1, ...kids);
    delete doc.animation.tracks[g.id];
    kids.forEach(k => sel.push(k.id));
  });
  RNBX.select(sel);
};

/* ---------- My components (this browser) and component files ---------- */
const KEY = 'rnbx_mylib';
A.save = (obj, name) => {
  const list = U.store.get(KEY, []);
  list.push({ id: U.uid(), name, type: obj.type, props: Object.assign(U.deepClone(obj.props), obj.type === 'group' ? { name } : { title: name }) });
  U.store.set(KEY, list);
  if (RNBX.palette) RNBX.palette.build();
};
A.exportFile = obj => {
  const name = obj.props.name || obj.props.title || lib.get(obj.type).name;
  const data = { format: 'rnbeamx-component', version: 1, name, type: obj.type, props: obj.props, created: new Date().toISOString() };
  U.download(new Blob([JSON.stringify(data)], { type: 'application/json' }), U.slug(name) + '.rnbxc.json');
};
A.importFile = file => file.text().then(t => {
  const d = JSON.parse(t);
  const items = Array.isArray(d) ? d : [d];
  let n = 0;
  items.forEach(c => {
    if (!c || c.format !== 'rnbeamx-component' || !lib.get(c.type)) return;
    const list = U.store.get(KEY, []);
    list.push({ id: U.uid(), name: c.name || 'Component', type: c.type, props: c.props });
    U.store.set(KEY, list); n++;
  });
  if (!n) throw new Error('This is not an RNBeamX component file');
  if (RNBX.palette) RNBX.palette.build();
  RNBX.toast(`${n} component${n > 1 ? 's' : ''} added to My components`);
});
})();
