/* ═══════════════════════════════════════════════════════════
   RNBeamX — core/state.js
   The single source of truth: the document model, the current
   selection, the event bus and the page / journal presets.

   Document shape (saved verbatim as a .rnbx.json project):
   {
     version, meta:{title},
     page:{width,height,preset,background,bg,bg2},       // mm
     style:{mode, lineWidthPt, font, fontSizePt, ...},   // figure look
     view3d:{yaw,pitch,zoom,beamHeight,table,...},       // 3D camera
     objects:[{id,type,x,y,rot,scale,props,label,...}],  // z-ordered
     animation:{duration,fps,loop,flow,tracks,camera}
   }
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const U = RNBX.util;

RNBX.VERSION = '1.1.0';

/* ---------- event bus ---------- */
const listeners = {};
RNBX.on = (evt, fn) => { (listeners[evt] = listeners[evt] || []).push(fn); };
RNBX.emit = (evt, data) => { (listeners[evt] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(evt, e); } }); };

/* ---------- page presets ----------
   Widths follow each publisher's author guide at the time of
   writing. Always confirm against the journal's current guide. */
RNBX.PRESETS = [
  { id: 'nature-1', group: 'Journal figure', name: 'Nature family · single column', w: 89, h: 60 },
  { id: 'nature-15', group: 'Journal figure', name: 'Nature family · 1.5 column', w: 120, h: 75 },
  { id: 'nature-2', group: 'Journal figure', name: 'Nature family · double column', w: 183, h: 95 },
  { id: 'aps-1', group: 'Journal figure', name: 'APS / AIP · single column (8.6 cm)', w: 86, h: 58 },
  { id: 'aps-2', group: 'Journal figure', name: 'APS / AIP · double column (17.8 cm)', w: 178, h: 92 },
  { id: 'acs-1', group: 'Journal figure', name: 'ACS · single column (3.25 in)', w: 82.5, h: 56 },
  { id: 'acs-2', group: 'Journal figure', name: 'ACS · double column (7 in)', w: 177.8, h: 92 },
  { id: 'els-1', group: 'Journal figure', name: 'Elsevier · single column', w: 90, h: 60 },
  { id: 'els-2', group: 'Journal figure', name: 'Elsevier · double column', w: 190, h: 98 },
  { id: 'ieee-1', group: 'Journal figure', name: 'IEEE · single column (3.5 in)', w: 88.9, h: 60 },
  { id: 'ieee-2', group: 'Journal figure', name: 'IEEE · double column (7.16 in)', w: 181.9, h: 94 },
  { id: 'ga-els', group: 'Graphical abstract', name: 'Elsevier graphical abstract (5 : 2)', w: 112.4, h: 44.96 },
  { id: 'ga-acs', group: 'Graphical abstract', name: 'ACS TOC graphic (3.25 × 1.75 in)', w: 82.55, h: 44.45 },
  { id: 'ga-sq', group: 'Graphical abstract', name: 'Square abstract / social (1 : 1)', w: 100, h: 100 },
  { id: 'slide', group: 'Presentation', name: 'Slide 16 : 9', w: 254, h: 142.875 },
  { id: 'slide43', group: 'Presentation', name: 'Slide 4 : 3', w: 254, h: 190.5 },
  { id: 'cover', group: 'Presentation', name: 'Cover art (portrait)', w: 210, h: 276 },
  { id: 'custom', group: 'Custom', name: 'Custom size', w: 0, h: 0 },
];

RNBX.defaultStyle = () => ({
  mode: 'schematic',          // schematic | shaded | 3d
  lineWidthPt: 0.5,
  outline: '#1d1f23',
  font: 'Arial, Helvetica, sans-serif',
  fontSizePt: 7,
  labelColor: '#111111',
  showLabels: true,
  beamStyle: 'envelope',      // line | envelope
  beamWidth: 0.7,             // mm, default for new sources
  beamGlow: false,
  beamArrows: false,
  beamFade: true,             // weaker beams drawn fainter
  beamOpacity: 0.92,
  colorMode: 'physical',      // physical | safe | mono
  beamModel: 'geometric',     // geometric | gaussian
  gaussMag: 10,               // Gaussian: drawn width exaggeration
  waistLabels: false,
  ghosts: 'off',              // off | uncoated | ar
  polarization: false,        // draw ↕ / • polarisation markers
  scale: 10,                  // physical mm per drawn mm (focal lengths, gratings)
  fiberColor: '#f2b705',
  wireColor: '#3a3d42',
});

RNBX.defaultView3d = () => ({
  yaw: -28, pitch: 34, zoom: 1, panX: 0, panY: 0,
  beamHeight: 6, table: true, holes: true, posts: true,
  tableColor: '#2c3036', shadow: true,
});

RNBX.newDocument = (presetId = 'nature-2') => {
  const p = RNBX.PRESETS.find(x => x.id === presetId) || RNBX.PRESETS[2];
  return {
    version: 1,
    app: 'RNBeamX',
    meta: { title: 'Untitled setup' },
    page: { width: p.w, height: p.h, preset: p.id, background: 'white', bg: '#ffffff', bg2: '#dfe7f2' },
    style: RNBX.defaultStyle(),
    view3d: RNBX.defaultView3d(),
    objects: [],
    animation: { duration: 6, fps: 30, loop: true, flow: false, flowSpeed: 25, pulses: false, tracks: {}, camera: [] },
  };
};

/* Bring an older or hand-edited project up to the current schema. */
RNBX.normalizeDocument = doc => {
  const fresh = RNBX.newDocument();
  doc = Object.assign({}, fresh, doc);
  doc.page = Object.assign({}, fresh.page, doc.page);
  doc.style = Object.assign({}, fresh.style, doc.style);
  doc.view3d = Object.assign({}, fresh.view3d, doc.view3d);
  doc.animation = Object.assign({}, fresh.animation, doc.animation);
  doc.animation.tracks = doc.animation.tracks || {};
  doc.animation.camera = doc.animation.camera || [];
  doc.objects = (doc.objects || []).filter(o => o && o.type).map(o => {
    const def = RNBX.lib && RNBX.lib.get(o.type);
    const props = Object.assign({}, def ? U.deepClone(def.defaults || {}) : {}, o.props || {});
    return Object.assign({ id: U.uid(), x: 0, y: 0, rot: 0, scale: 1 }, o, { props });
  });
  return doc;
};

/* ---------- live state ---------- */
const S = RNBX.state = {
  doc: RNBX.newDocument(),
  selection: [],
  time: 0,
  playing: false,
  dragging: false,
  ui: { grid: true, snap: true, gridSize: 2.5, tool: 'select', connectFrom: null, timeline: false },
};

RNBX.getObj = id => S.doc.objects.find(o => o.id === id);
RNBX.selected = () => S.selection.map(RNBX.getObj).filter(Boolean);

/* ---------- change notification ----------
   Mutations call RNBX.changed(); rendering is coalesced to one
   frame and panels are told what kind of change happened. */
let pending = false;
RNBX.changed = (kind = 'doc') => {
  RNBX.emit('change', kind);
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; RNBX.emit('render'); });
};

RNBX.select = (ids, additive = false) => {
  ids = (Array.isArray(ids) ? ids : [ids]).filter(Boolean);
  if (additive) {
    const set = new Set(S.selection);
    ids.forEach(id => set.has(id) ? set.delete(id) : set.add(id));
    S.selection = [...set];
  } else S.selection = ids;
  RNBX.emit('selection', S.selection);
  RNBX.changed('selection');
};

/* ---------- object operations ---------- */
RNBX.nextLabel = abbr => {
  if (!abbr) return '';
  const used = S.doc.objects.map(o => o.label && o.label.text).filter(Boolean);
  if (!used.includes(abbr) && !used.includes(abbr + '1')) {
    // first of its kind: keep the bare abbreviation, number later ones
    return abbr;
  }
  let i = 2;
  // renumber the bare one to "…1" so the series reads M1, M2, …
  const bare = S.doc.objects.find(o => o.label && o.label.text === abbr);
  if (bare) bare.label.text = abbr + '1';
  while (used.includes(abbr + i)) i++;
  return abbr + i;
};

RNBX.createObject = (type, x, y, extra = {}) => {
  const def = RNBX.lib.get(type);
  if (!def) throw new Error('Unknown component ' + type);
  const obj = {
    id: U.uid(), type, x, y, rot: 0, scale: 1,
    props: U.deepClone(def.defaults || {}),
  };
  if (def.abbr !== undefined && !def.annotation) {
    const lp = def.labelPos || [0, 7];
    obj.label = { text: def.labelTemplate || (def.autoLabel === false ? '' : RNBX.nextLabel(def.abbr)), dx: lp[0], dy: lp[1], show: def.labelShow !== false };
  }
  if (def.init) def.init(obj, S.doc);
  return Object.assign(obj, extra);
};

RNBX.addObject = (obj, select = true) => {
  RNBX.history.checkpoint();
  S.doc.objects.push(obj);
  if (select) RNBX.select([obj.id]); else RNBX.changed();
  return obj;
};

RNBX.removeObjects = ids => {
  if (!ids.length) return;
  RNBX.history.checkpoint();
  const set = new Set(ids);
  // connections that reference a removed object go with it
  S.doc.objects = S.doc.objects.filter(o => !set.has(o.id) && !(o.props && (set.has(o.props.from) || set.has(o.props.to))));
  ids.forEach(id => delete S.doc.animation.tracks[id]);
  S.selection = S.selection.filter(id => !set.has(id));
  RNBX.emit('selection', S.selection);
  RNBX.changed();
};

RNBX.setDocument = (doc, keepHistory = false) => {
  S.doc = RNBX.normalizeDocument(doc);
  S.selection = [];
  S.time = 0;
  if (!keepHistory) RNBX.history.clear();
  RNBX.emit('document');
  RNBX.emit('selection', []);
  RNBX.changed();
};

/* ---------- undo / redo ----------
   Whole-document snapshots: simple, and robust against every kind
   of edit. checkpoint() is called BEFORE a mutation. */
const H = RNBX.history = {
  undoStack: [], redoStack: [], limit: 150, lastKey: null, lastTime: 0,
  checkpoint(coalesceKey) {
    const now = Date.now();
    // consecutive edits of the same field (typing, slider drags) merge into one step
    if (coalesceKey && coalesceKey === H.lastKey && now - H.lastTime < 1200) { H.lastTime = now; return; }
    H.lastKey = coalesceKey || null; H.lastTime = now;
    H.undoStack.push(JSON.stringify(S.doc));
    if (H.undoStack.length > H.limit) H.undoStack.shift();
    H.redoStack.length = 0;
    RNBX.emit('history');
  },
  undo() {
    if (!H.undoStack.length) return;
    H.redoStack.push(JSON.stringify(S.doc));
    H.restore(H.undoStack.pop());
  },
  redo() {
    if (!H.redoStack.length) return;
    H.undoStack.push(JSON.stringify(S.doc));
    H.restore(H.redoStack.pop());
  },
  restore(json) {
    const sel = S.selection;
    S.doc = JSON.parse(json);
    S.selection = sel.filter(id => RNBX.getObj(id));
    H.lastKey = null;
    RNBX.emit('document');
    RNBX.emit('selection', S.selection);
    RNBX.emit('history');
    RNBX.changed();
  },
  clear() { H.undoStack.length = 0; H.redoStack.length = 0; H.lastKey = null; RNBX.emit('history'); },
};
})();
