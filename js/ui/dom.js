/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/dom.js
   Small DOM toolkit shared by the panels: element builder,
   icon set, toasts, modal dialogs, pop-up menus and component
   thumbnails.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib;
const D = RNBX.dom = {};

D.el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
};
D.$ = s => document.querySelector(s);

/* ---------- icons (24×24 stroke) ---------- */
const P = {
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  grid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  magnet: '<path d="M6 3v8a6 6 0 0 0 12 0V3"/><path d="M6 7h4M14 7h4M10 3v8a2 2 0 0 0 4 0V3"/>',
  pol: '<path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/>',
  label: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.5"/>',
  arrows: '<path d="M4 12h14M14 8l4 4-4 4"/>',
  glow: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 13h12l1-13M9 7V4h6v3"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.9-1"/>',
  up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M7 4v16l13-8z" fill="currentColor"/>', pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>',
  key: '<path d="M12 3l9 9-9 9-9-9z"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2l2-3h6l2 3h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="4"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  flip: '<path d="M12 3v18M16 7l4 5-4 5M8 7l-4 5 4 5"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  reset: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/><path d="M12 8v4l2.5 2.5"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20"/>',
  alignL: '<path d="M4 3v18M8 7h10v4H8zM8 14h6v4H8z"/>', alignC: '<path d="M12 3v18M6 7h12v4H6zM8 14h8v4H8z"/>', alignR: '<path d="M20 3v18M6 7h10v4H6zM10 14h6v4h-6z"/>',
  alignT: '<path d="M3 4h18M7 8v10h4V8zM14 8v6h4V8z"/>', alignM: '<path d="M3 12h18M7 6v12h4V6zM14 8v8h4V8z"/>', alignB: '<path d="M3 20h18M7 6v10h4V6zM14 10v6h4v-6z"/>',
  distH: '<path d="M4 3v18M20 3v18M10 8h4v8h-4z"/>', distV: '<path d="M3 4h18M3 20h18M8 10h8v4H8z"/>',
  front: '<rect x="8" y="8" width="12" height="12" rx="1" fill="currentColor" fill-opacity=".25"/><path d="M4 16V5a1 1 0 0 1 1-1h11"/>',
  back: '<rect x="4" y="4" width="12" height="12" rx="1"/><path d="M20 8v11a1 1 0 0 1-1 1H8" />',
  fiber: '<path d="M4 18c4 0 4-12 8-12s4 12 8 12"/>', wire: '<path d="M4 6h8v12h8"/><path d="m17 15 3 3-3 3"/>',
  file: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  wand: '<path d="m15 4 5 5L9 20H4v-5zM13 6l5 5"/>',
};
D.icon = (name, size) => `<svg viewBox="0 0 24 24" ${size ? `width="${size}" height="${size}"` : ''} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
D.iconBtn = (name, title, onclick, extra = {}) => D.el('button', Object.assign({ class: 'icon-btn', title, html: D.icon(name), onclick, type: 'button' }, extra));

/* ---------- toast ---------- */
/* action: optional { label, fn } shown as a button (e.g. Undo) */
RNBX.toast = (msg, kind, action) => {
  const t = D.el('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: msg });
  if (action) t.append(D.el('button', { class: 'toast-act', type: 'button', text: action.label, onclick: () => { t.remove(); action.fn(); } }));
  D.$('#toastRoot').append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 320); }, kind === 'error' ? 4200 : action ? 6500 : 2400);
};

/* ---------- modal ---------- */
D.modal = ({ title, sub, body, foot, wide, onClose }) => {
  const back = D.el('div', { class: 'modal-back' });
  const close = () => { back.remove(); document.removeEventListener('keydown', esc, true); onClose && onClose(); };
  const esc = e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  const m = D.el('div', { class: 'modal' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' },
    D.el('div', { class: 'modal-head' }, D.el('div', {}, D.el('h3', { text: title }), sub ? D.el('div', { class: 'sub', text: sub }) : null), D.iconBtn('close', 'Close', close)),
    D.el('div', { class: 'modal-body' }, body),
    foot ? D.el('div', { class: 'modal-foot' }, foot) : null);
  back.append(m);
  back.addEventListener('mousedown', e => { if (e.target === back) close(); });
  document.addEventListener('keydown', esc, true);
  D.$('#modalRoot').append(back);
  return { close, root: m };
};

/* ---------- pop-up menu ---------- */
let openMenu = null;
D.closeMenu = () => { if (openMenu) { openMenu.el.remove(); openMenu.anchor && openMenu.anchor.classList.remove('open'); openMenu = null; } };
D.menu = (items, x, y, anchor) => {
  D.closeMenu();
  const m = D.el('div', { class: 'menu', role: 'menu' });
  items.forEach(it => {
    if (it === '-') return m.append(D.el('hr'));
    if (it.title) return m.append(D.el('div', { class: 'menu-title', text: it.title }));
    m.append(D.el('button', { type: 'button', disabled: it.disabled, onclick: () => { D.closeMenu(); it.action && it.action(); } },
      it.icon ? D.el('span', { html: D.icon(it.icon, 15), style: { display: 'inline-flex', color: 'var(--muted)' } }) : null,
      D.el('span', { text: it.label }), it.key ? D.el('span', { class: 'k', text: it.key }) : null));
  });
  document.body.append(m);
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
  if (anchor) anchor.classList.add('open');
  openMenu = { el: m, anchor };
  setTimeout(() => {
    const off = e => { if (!m.contains(e.target) && e.target !== anchor) { D.closeMenu(); document.removeEventListener('mousedown', off, true); } };
    document.addEventListener('mousedown', off, true);
  });
  return m;
};

/* ---------- thumbnails ---------- */
D.thumb = (type, props, mode) => {
  const def = lib.get(type);
  if (!def) return '';
  if (type === 'fiber') return `<svg viewBox="0 0 40 28"><path d="M4 22 C 14 22 12 6 22 6 S 30 22 36 22" fill="none" stroke="#f2b705" stroke-width="2.2" stroke-linecap="round"/><circle cx="4" cy="22" r="2" fill="#9aa1ab"/><circle cx="36" cy="22" r="2" fill="#9aa1ab"/></svg>`;
  if (type === 'wire') return `<svg viewBox="0 0 40 28"><path d="M4 6 H 22 V 22 H 32" fill="none" stroke="#3a3d42" stroke-width="1.4"/><path d="M31 18.5 L 36 22 L 31 25.5 Z" fill="#3a3d42"/></svg>`;
  const p = Object.assign(U.deepClone(def.defaults), props || {});
  const doc = RNBX.state.doc;
  const S = lib.style(doc, { mode: mode || 'shaded' });
  let b;
  try { b = def.bbox(p, null, doc); } catch (e) { b = [-5, -5, 5, 5]; }
  const pad = Math.max(1, Math.max(b[2] - b[0], b[3] - b[1]) * 0.12);
  const vb = [b[0] - pad, b[1] - pad, b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad];
  let body = '';
  try { body = def.draw(p, S, { id: 'thumb-' + type }); } catch (e) { body = ''; }
  // a short beam stub makes optics read as optics
  return `<svg viewBox="${vb.map(v => U.round(v, 2)).join(' ')}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
};
})();
