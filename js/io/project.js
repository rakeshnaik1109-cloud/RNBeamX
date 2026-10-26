/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/project.js
   Project files (.rnbx.json), crash-safe autosave in this
   browser, image import and clipboard copy/paste of objects.
   Nothing is ever uploaded.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state;
const P = RNBX.project = {};
const AUTOSAVE = 'rnbx_autosave_v1';

P.save = () => {
  const blob = new Blob([JSON.stringify(S.doc, null, 1)], { type: 'application/json' });
  U.download(blob, U.slug(S.doc.meta.title) + '.rnbx.json');
  P.dirty = false;
  RNBX.toast('Project saved to your downloads');
};

P.openFile = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => {
    try {
      const doc = JSON.parse(r.result);
      if (!doc || !Array.isArray(doc.objects)) throw new Error('This file is not an RNBeamX project.');
      RNBX.setDocument(doc);
      RNBX.toast('Opened ' + file.name);
      res();
    } catch (e) { RNBX.toast(e.message || 'Could not read the file', 'error'); rej(e); }
  };
  r.onerror = () => rej(r.error);
  r.readAsText(file);
});

P.pickFile = (accept, cb) => {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept;
  inp.onchange = () => { if (inp.files && inp.files[0]) cb(inp.files[0]); };
  inp.click();
};

P.readImage = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => res({ href: r.result, aspect: img.naturalWidth / img.naturalHeight || 1 });
    img.onerror = () => res({ href: r.result, aspect: 1.5 });
    img.src = r.result;
  };
  r.onerror = () => rej(r.error);
  r.readAsDataURL(file);
});

P.importImage = (file, x, y) => P.readImage(file).then(({ href, aspect }) => {
  const W = S.doc.page.width;
  const w = Math.min(W * 0.4, 50), h = w / aspect;
  const o = RNBX.createObject('image', x == null ? S.doc.page.width / 2 : x, y == null ? S.doc.page.height / 2 : y);
  Object.assign(o.props, { href, w, h, aspect });
  RNBX.addObject(o);
});

/* ---------- autosave ---------- */
P.autosave = U.debounce(() => { U.store.set(AUTOSAVE, { t: Date.now(), doc: S.doc }); }, 800);
P.restore = () => {
  const a = U.store.get(AUTOSAVE, null);
  if (a && a.doc && Array.isArray(a.doc.objects) && a.doc.objects.length) { RNBX.setDocument(a.doc); return true; }
  return false;
};

/* ---------- object clipboard (within the app) ---------- */
let clip = null;
P.copy = () => {
  const objs = RNBX.selected();
  if (!objs.length) return;
  const ids = new Set(objs.map(o => o.id));
  // keep connections whose both ends are copied
  const conns = S.doc.objects.filter(o => o.props && o.props.from && ids.has(o.props.from) && ids.has(o.props.to) && !ids.has(o.id));
  clip = U.deepClone(objs.concat(conns));
  U.store.set('rnbx_clip', clip);
};
P.paste = (offset = 4) => {
  const src = clip || U.store.get('rnbx_clip', null);
  if (!src || !src.length) return;
  RNBX.history.checkpoint();
  const map = {};
  const copies = U.deepClone(src).map(o => { const id = U.uid(); map[o.id] = id; o.id = id; return o; });
  copies.forEach(o => {
    if (o.props && o.props.from) { o.props.from = map[o.props.from] || o.props.from; o.props.to = map[o.props.to] || o.props.to; }
    else { o.x += offset; o.y += offset; }
    S.doc.objects.push(o);
  });
  clip = U.deepClone(copies);
  RNBX.select(copies.filter(o => !(o.props && o.props.from)).map(o => o.id));
};
P.duplicate = () => { P.copy(); P.paste(4); };
})();
