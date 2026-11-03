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
      let doc;
      try { doc = JSON.parse(r.result); } catch (e) { throw new Error(file.name + ' is not an RNBeamX project file (.rnbx.json).'); }
      if (!doc || !Array.isArray(doc.objects)) throw new Error(file.name + ' is not an RNBeamX project (it may be a component, style or Layer Studio file: use the matching Import).');
      RNBX.setDocument(doc);
      RNBX.toast('Opened ' + file.name);
      res();
    } catch (e) { RNBX.toast(e.message || 'Could not read the file', 'error'); rej(e); }
  };
  r.onerror = () => rej(r.error);
  r.readAsText(file);
});

/* file types the pickers offer: TIFF and others listed by extension too, since some systems
   leave them out of image/* or give .json files no type */
P.IMAGE_ACCEPT = 'image/*,.tif,.tiff,.png,.jpg,.jpeg,.gif,.bmp,.webp,.svg';
P.JSON_ACCEPT = '.json,application/json';
P.isImageFile = f => !!f && (/^image\//.test(f.type) || /\.(tiff?|png|jpe?g|gif|bmp|webp|svg|avif)$/i.test(f.name || ''));
P.pickFile = (accept, cb, multiple) => {
  // the input stays in the page until it is used: some browsers (Safari, mobile) drop the
  // change event of a detached input, and a fresh input lets the same file be chosen again
  const old = document.getElementById('rnbxFilePick'); if (old) old.remove();
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = accept === 'image/*' ? P.IMAGE_ACCEPT : accept; inp.multiple = !!multiple; inp.id = 'rnbxFilePick';
  inp.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0';
  inp.addEventListener('change', () => {
    const files = inp.files ? [...inp.files] : [];
    inp.remove();
    if (!files.length) return;
    try { const r = cb(multiple ? files : files[0]); if (r && r.catch) r.catch(e => RNBX.toast(e.message || String(e), 'error')); }
    catch (e) { RNBX.toast(e.message || String(e), 'error'); }
  });
  document.body.append(inp);
  inp.click();
};

/* an image file → { href (data URL), aspect, pxW, pxH, calib? }. TIFF is decoded here (browsers
   cannot show it); anything the browser cannot decode is reported instead of giving a blank image */
P.readImage = async file => {
  const buf = await file.arrayBuffer(), head = new Uint8Array(buf, 0, Math.min(16, buf.byteLength));
  if (RNBX.tiff && RNBX.tiff.isTiff(head)) {
    const r = await RNBX.tiff.decode(buf);
    if (r.pages > 1) RNBX.toast(`${file.name}: a ${r.pages}-page TIFF — the first page is used.`);
    return r;
  }
  const isSvg = /svg/i.test(file.type) || /\.svg$/i.test(file.name || '');
  const type = file.type || (isSvg ? 'image/svg+xml' : /\.png$/i.test(file.name) ? 'image/png' : /\.jpe?g$/i.test(file.name) ? 'image/jpeg' : 'application/octet-stream');
  const href = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error('Could not read ' + file.name)); r.readAsDataURL(new Blob([buf], { type })); });
  const img = new Image();
  const ok = await new Promise(res => { img.onload = () => res(true); img.onerror = () => res(false); img.src = href; });
  if (!ok) throw new Error(`${file.name} could not be opened as an image. PNG, JPEG, TIFF, GIF, BMP, WebP and SVG work.`);
  const w = img.naturalWidth || 300, h = img.naturalHeight || 200;
  return { href, aspect: w / h || 1, pxW: w, pxH: h };
};

P.importImage = (file, x, y) => P.readImage(file).catch(e => { RNBX.toast(e.message, 'error'); throw e; }).then(({ href, aspect }) => {
  const W = S.doc.page.width;
  const w = Math.min(W * 0.4, 50), h = w / aspect;
  const o = RNBX.createObject('image', x == null ? S.doc.page.width / 2 : x, y == null ? S.doc.page.height / 2 : y);
  Object.assign(o.props, { href, w, h, aspect });
  RNBX.addObject(o);
});

/* ---------- autosave ---------- */
/* Figures with images easily pass the ~5 MB a browser allows in localStorage, so the
   autosave also goes to IndexedDB; localStorage then keeps a small pointer to it. */
const idb = (mode, fn) => new Promise((res, rej) => {
  if (!window.indexedDB) return rej(new Error('no IndexedDB'));
  const rq = indexedDB.open('rnbeamx', 1);
  rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
  rq.onerror = () => rej(rq.error);
  rq.onsuccess = () => { const db = rq.result, tx = db.transaction('kv', mode), r = fn(tx.objectStore('kv')); tx.oncomplete = () => { db.close(); res(r && r.result); }; tx.onerror = () => { db.close(); rej(tx.error); }; };
});
P.autosaveNow = () => {
  const rec = { t: Date.now(), doc: S.doc };
  let small = true;
  try { localStorage.setItem(AUTOSAVE, JSON.stringify(rec)); } catch (e) { small = false; try { localStorage.setItem(AUTOSAVE, JSON.stringify({ t: rec.t, idb: true })); } catch (e2) { /* storage unavailable */ } }
  if (!small) idb('readwrite', st => st.put(JSON.parse(JSON.stringify(rec)), AUTOSAVE)).catch(() => {});
  return small;
};
P.autosave = U.debounce(P.autosaveNow, 800);
P.restore = () => {
  const a = U.store.get(AUTOSAVE, null);
  if (a && a.doc && Array.isArray(a.doc.objects) && a.doc.objects.length) { RNBX.setDocument(a.doc); return true; }
  if (a && a.idb) {
    // the figure was too large for localStorage: bring it back from IndexedDB, unless work has started
    const t0 = RNBX.history && RNBX.history.undoStack ? RNBX.history.undoStack.length : 0;
    idb('readonly', st => st.get(AUTOSAVE)).then(rec => {
      const fresh = !(RNBX.history && RNBX.history.undoStack && RNBX.history.undoStack.length > t0) && !S.doc.objects.length;
      if (rec && rec.doc && Array.isArray(rec.doc.objects) && fresh) { RNBX.setDocument(rec.doc); RNBX.toast('Your last figure was restored.'); }
    }).catch(() => {});
  }
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
