/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/versions.js
   Version history of the figure, kept in this browser
   (IndexedDB; nothing is uploaded): versions you name, and
   automatic ones every few minutes while you work (the last 20
   are kept). Each has a small picture; restoring one is a single
   step that Ctrl+Z takes back.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state;
const VS = RNBX.versions = {};
const AUTO_MIN = 5, AUTO_KEEP = 20;

const db = () => new Promise((res, rej) => {
  if (!window.indexedDB) return rej(new Error('This browser cannot keep versions (no IndexedDB).'));
  const rq = indexedDB.open('rnbeamx-versions', 1);
  rq.onupgradeneeded = () => { const st = rq.result.createObjectStore('v', { keyPath: 'id' }); st.createIndex('t', 't'); };
  rq.onerror = () => rej(rq.error);
  rq.onsuccess = () => res(rq.result);
});
const tx = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction('v', mode), r = fn(t.objectStore('v')); t.oncomplete = () => { d.close(); res(r && r.result); }; t.onerror = () => { d.close(); rej(t.error); }; }));

/* a small JPEG of the figure for the list */
VS.thumb = async () => {
  try {
    const svg = RNBX.exporter.svgString(), W = 220, H = Math.max(40, Math.round(W * S.doc.page.height / S.doc.page.width));
    const c = await RNBX.exporter.rasterize(svg, W, Math.min(H, 260), RNBX.isDarkPage(S.doc.page) ? '#0b1020' : '#ffffff');
    return c.toDataURL('image/jpeg', 0.72);
  } catch (e) { return ''; }
};
VS.list = () => tx('readonly', st => st.getAll()).then(a => (a || []).sort((x, y) => y.t - x.t));
VS.save = async (name, auto = false) => {
  const rec = { id: U.uid(), t: Date.now(), name: name || (auto ? 'Automatic' : 'Version'), auto, title: S.doc.meta.title, n: S.doc.objects.length, doc: JSON.parse(JSON.stringify(S.doc)), thumb: await VS.thumb() };
  await tx('readwrite', st => st.put(rec));
  if (auto) { const all = (await VS.list()).filter(v => v.auto); await Promise.all(all.slice(AUTO_KEEP).map(v => VS.remove(v.id))); }
  return rec;
};
VS.remove = id => tx('readwrite', st => st.delete(id));
VS.rename = async (id, name) => { const all = await VS.list(), v = all.find(q => q.id === id); if (!v) return; v.name = name; v.auto = false; await tx('readwrite', st => st.put(v)); };
VS.restore = async id => {
  const v = (await VS.list()).find(q => q.id === id);
  if (!v) throw new Error('That version is gone');
  RNBX.history.checkpoint();
  RNBX.setDocument(v.doc, true);
  RNBX.toast(`Restored “${v.name}” from ${new Date(v.t).toLocaleString()}. Ctrl+Z goes back.`);
};

/* automatic versions: every few minutes, if the figure changed since the last one */
let lastSig = '', lastAuto = Date.now(), timer = 0;
const sig = () => { const j = JSON.stringify(S.doc.objects); return j.length + ':' + j.slice(0, 200) + j.slice(-200); };
VS.tick = async (force) => {
  if (!S.doc.objects.length) return null;
  const s = sig();
  if (s === lastSig || (!force && Date.now() - lastAuto < AUTO_MIN * 60000)) return null;
  lastSig = s; lastAuto = Date.now();
  try { return await VS.save('Automatic', true); } catch (e) { return null; }
};
VS.init = () => {
  lastSig = sig();
  RNBX.on('change', kind => { if (kind === 'selection' || kind === 'time') return; clearTimeout(timer); timer = setTimeout(() => VS.tick(), 4000); });
};

/* ---------- the dialog ---------- */
VS.dialog = async () => {
  const D = RNBX.dom, el = D.el;
  const name = el('input', { type: 'text', placeholder: 'Name this version, e.g. “before reviewer changes”', style: { flex: '1 1 auto', minWidth: '0', width: 'auto' } });
  const listHost = el('div', { class: 'vs-list' });
  const draw = async () => {
    let all;
    try { all = await VS.list(); } catch (e) { listHost.textContent = e.message; return; }
    listHost.innerHTML = '';
    if (!all.length) { listHost.append(el('div', { class: 'note', text: 'No versions yet. Name one above, or keep working: a version is kept automatically every few minutes while the figure changes.' })); return; }
    all.forEach(v => {
      const when = new Date(v.t);
      const row = el('div', { class: 'vs-row' + (v.auto ? ' auto' : '') },
        el('div', { class: 'vs-thumb', html: v.thumb ? `<img src="${v.thumb}" alt="">` : '' }),
        el('div', { class: 'vs-info' }, el('b', { text: v.name }), el('small', { text: `${when.toLocaleDateString()} ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${v.title || 'Untitled'} · ${v.n} object${v.n === 1 ? '' : 's'}${v.auto ? ' · automatic' : ''}` })),
        el('div', { class: 'vs-acts' },
          el('button', { class: 'btn small primary', type: 'button', text: 'Restore', onclick: async () => { await VS.restore(v.id); m.close(); } }),
          el('button', { class: 'btn small ghost', type: 'button', text: v.auto ? 'Keep…' : 'Rename…', title: v.auto ? 'Give it a name so it is not replaced by newer automatic versions' : 'Rename', onclick: async () => { const nn = prompt('Name of this version:', v.auto ? '' : v.name); if (nn) { await VS.rename(v.id, nn); draw(); } } }),
          D.iconBtn('trash', 'Delete this version', async () => { await VS.remove(v.id); draw(); })));
      listHost.append(row);
    });
  };
  const saveBtn = el('button', { class: 'btn primary', type: 'button', style: { flex: '0 0 auto' }, text: 'Save version', onclick: async () => { await VS.save(name.value.trim() || 'Version ' + new Date().toLocaleString()); name.value = ''; RNBX.toast('Version saved in this browser.'); draw(); } });
  name.onkeydown = e => { if (e.key === 'Enter') saveBtn.click(); };
  const m = D.modal({ title: 'Versions', sub: 'Kept in this browser only — save the project file (Ctrl+S) to keep it elsewhere', wide: true,
    body: [el('div', { class: 'row', style: { gap: '8px', marginBottom: '12px' } }, name, saveBtn), listHost] });
  draw();
  setTimeout(() => name.focus(), 30);
  return m;
};
})();
