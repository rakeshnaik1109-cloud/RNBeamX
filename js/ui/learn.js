/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/learn.js
   "Learn": what every component does. A searchable list of the
   basics and the parts; each page shows a live demo traced by
   the app (with the power on each detector), the physics with
   equations, typical numbers and related pages. The demo opens
   as a figure in one click.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, lib = RNBX.lib;
const LN = RNBX.learn = {};
const C = () => RNBX.learnContent;
const GROUPS = ['Basics', 'Sources', 'Mirrors & splitters', 'Lenses & objectives', 'Polarisation', 'Filters & dispersion', 'Modulators & nonlinear',
  'Fibre optics', 'Detectors', 'Samples & mechanics', 'Optomechanics', 'Imaging', 'Electronics'];
const DETECT = new Set(['pd', 'camera', 'spectrometer', 'pmt', 'powermeter', 'screen', 'profiler', 'intsphere', 'beamdump']);

LN.title = id => { const e = C().entries[id]; return e.title || (lib.get(id) ? lib.get(id).name : id); };
LN.ids = () => C().order.filter(id => C().entries[id] && (id.startsWith('c-') || lib.get(id)));

/* the demo document for a page (or the part on its own) */
LN.demoDoc = id => {
  const e = C().entries[id];
  let d = null;
  try { d = e.demo ? e.demo() : null; } catch (err) { console.error(err); }
  if (!d && lib.get(id)) {
    const T = RNBX.templates.helpers;
    d = T.base('nature-15', 60, 34, '');
    const o = T.mk(id, 30, 17, 0, {});
    const b = lib.get(id).bbox ? lib.get(id).bbox(o.props) : [-5, -5, 5, 5], k = Math.min(1.8, 40 / Math.max(4, b[2] - b[0]), 24 / Math.max(4, b[3] - b[1]));
    o.scale = U.round(k, 2); o.x = 30 - (b[0] + b[2]) / 2 * k; o.y = 17 - (b[1] + b[3]) / 2 * k;
    d.objects.push(o);
  }
  if (!d) return null;
  d = RNBX.normalizeDocument(d);
  d.style.mode = 'schematic';
  Object.assign(d.style, e.demoMode || {});
  d.style.showLabels = true;
  return d;
};

/* what the detectors in a demo read */
LN.readings = d => {
  const t = RNBX.trace(d), out = [];
  d.objects.forEach(o => {
    if (!DETECT.has(o.type) || o.type === 'screen' || o.type === 'beamdump') return;
    const h = t.hits[o.id];
    const name = (o.label && o.label.show && o.label.text ? o.label.text.split('\n')[0] : lib.get(o.type).name);
    out.push([name, h ? h.P : 0]);
  });
  return out;
};
const fmtP = P => P >= 1 ? U.fmt(P, 3) + ' mW' : P >= 1e-3 ? U.fmt(P * 1000, 3) + ' µW' : P > 0 ? U.fmt(P * 1e6, 3) + ' nW' : '0';

LN.open = (startId) => {
  const C0 = C(), list = el('div', { class: 'learn-list' }), art = el('article', { class: 'learn-art' });
  const search = el('input', { type: 'search', class: 'learn-search', placeholder: 'Search: polariser, focus, Raman…' });
  const btns = {};
  let current = null;
  const show = id => {
    if (!C0.entries[id]) return;
    current = id;
    Object.entries(btns).forEach(([k, b]) => b.classList.toggle('on', k === id));
    if (btns[id]) btns[id].scrollIntoView({ block: 'nearest' });
    const e = C0.entries[id], def = lib.get(id);
    art.innerHTML = '';
    art.scrollTop = 0;
    const head = el('div', { class: 'learn-head' });
    if (def && !def.annotation) {
      const T = RNBX.templates.helpers, pd = T.base('nature-15', 24, 16, ''), o = T.mk(id, 12, 8, 0, {});
      const b = def.bbox ? def.bbox(o.props) : [-5, -5, 5, 5], k = Math.min(2, 20 / Math.max(2, b[2] - b[0]), 13 / Math.max(2, b[3] - b[1]));
      o.scale = U.round(k, 2); o.x = 12 - (b[0] + b[2]) / 2 * k; o.y = 8 - (b[1] + b[3]) / 2 * k; pd.objects.push(o); pd.style.mode = 'shaded'; pd.style.showLabels = false;
      try { head.append(el('div', { class: 'learn-icon', html: RNBX.render.build(RNBX.normalizeDocument(pd)).svg })); } catch (err) { /* icon is optional */ }
    }
    head.append(el('div', {}, el('small', { class: 'learn-group', text: e.group }), el('h2', { text: LN.title(id) }), el('p', { class: 'learn-one', text: e.one })));
    art.append(head);
    const d = LN.demoDoc(id);
    if (d) {
      const fig = el('figure', { class: 'learn-fig' });
      fig.append(el('div', { class: 'learn-svg', html: RNBX.render.build(d).svg }));
      const rd = LN.readings(d);
      const cap = el('figcaption', {}, el('span', { text: e.demo ? 'Live demo, traced by RNBeamX.' : 'The part as drawn in RNBeamX.' }));
      if (rd.length) cap.append(el('span', { class: 'learn-read' }, ...rd.map(([n, P]) => el('span', { class: 'chip', text: `${n}: ${fmtP(P)}` }))));
      fig.append(cap);
      art.append(fig);
      const acts = el('div', { class: 'row learn-acts' });
      if (e.demo) acts.append(el('button', { class: 'btn small primary', type: 'button', text: 'Open this demo as a figure', onclick: () => {
        if (S.doc.objects.length && !confirm('Replace the current figure with this demo? (Ctrl+Z brings yours back.)')) return;
        RNBX.history.checkpoint(); const nd = LN.demoDoc(id); nd.meta.title = LN.title(id); RNBX.setDocument(nd, true); m.close(); RNBX.toast('Demo opened: change any setting and watch the beams. Ctrl+Z to undo.'); U.track('learn-open-' + id);
      } }));
      if (def && !def.annotation) acts.append(el('button', { class: 'btn small', type: 'button', text: 'Add this part to my figure', onclick: () => { m.close(); RNBX.canvas.placeNew({ type: id }, [S.doc.page.width / 2, S.doc.page.height / 2], false); } }));
      art.append(acts);
    }
    if (e.how && e.how.length) art.append(el('h3', { text: 'How it works' }), ...e.how.map(p => el('p', { html: p })));
    if (e.math && e.math.length) art.append(el('h3', { text: 'The physics' }), el('div', { class: 'learn-math' }, ...e.math.map(([eq, note]) => el('div', { class: 'learn-eq' }, el('div', { class: 'eq', html: eq }), el('div', { class: 'note-t', html: note })))));
    if (e.numbers && e.numbers.length) art.append(el('h3', { text: 'Typical numbers' }), el('ul', {}, ...e.numbers.map(t => el('li', { html: t }))));
    const tpls = LN.usedIn(id);
    if (tpls.length) art.append(el('h3', { text: 'Used in these templates' }), el('div', { class: 'learn-see' }, ...tpls.map(t => el('span', { class: 'chip', text: t.name }))));
    if (e.see && e.see.length) art.append(el('h3', { text: 'See also' }), el('div', { class: 'learn-see' }, ...e.see.filter(s => C0.entries[s]).map(s => el('button', { class: 'chip link', type: 'button', text: LN.title(s), onclick: () => show(s) }))));
    U.track('learn-' + id);
  };
  const build = () => {
    const q = search.value.trim().toLowerCase();
    list.innerHTML = '';
    GROUPS.forEach(g => {
      const ids = LN.ids().filter(id => C0.entries[id].group === g && (!q || (LN.title(id) + ' ' + C0.entries[id].one + ' ' + (C0.entries[id].how || []).join(' ') + ' ' + ((lib.get(id) || {}).keywords || '')).toLowerCase().includes(q)));
      if (!ids.length) return;
      list.append(el('h4', { text: g }));
      ids.forEach(id => { const b = el('button', { type: 'button', class: id === current ? 'on' : '', text: LN.title(id), onclick: () => show(id) }); btns[id] = b; list.append(b); });
    });
    if (!list.children.length) list.append(el('div', { class: 'note', text: 'Nothing found.' }));
  };
  search.oninput = build;
  // Enter opens the best match: a title match first, then any match
  search.onkeydown = e => {
    if (e.key !== 'Enter') return;
    const q = search.value.trim().toLowerCase(), bs = [...list.querySelectorAll('button')];
    const b = bs.find(x => x.textContent.toLowerCase().includes(q)) || bs[0];
    if (b) b.click();
  };
  build();
  const body = el('div', { class: 'learn' }, el('div', { class: 'learn-side' }, search, list), art);
  const m = D.modal({ title: 'Learn optics', sub: 'What every part does, with a live demo, the physics and the equations. New to optics? Start with the Basics.', wide: true, body });
  m.root.classList.add('learn-modal');
  show(startId && C0.entries[startId] ? startId : 'c-light');
  setTimeout(() => search.focus(), 30);
};

/* templates that use a part (computed once) */
let usage = null;
LN.usedIn = id => {
  if (!usage) { usage = {}; RNBX.templates.list.forEach(t => { try { new Set(t.build().objects.map(o => o.type)).forEach(ty => { (usage[ty] = usage[ty] || []).push(t); }); } catch (e) { /* skip */ } }); }
  return (usage[id] || []).slice(0, 8);
};

LN.init = () => { const b = D.$('#btnLearn'); if (b) b.onclick = () => LN.open(); };
})();
