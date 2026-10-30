/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/canvas.js
   The interactive canvas: zoom/pan, selection, dragging with
   grid / alignment / beam snapping, rotation and resize
   handles, label dragging, connection tools (fibre, wire),
   marquee selection and drag-and-drop from the library.

   Coordinates: the SVG viewBox is in page millimetres, so every
   pointer position converts straight into figure coordinates.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom;
const C = RNBX.canvas = {};
const NS = 'http://www.w3.org/2000/svg';

let svg, figure, overlay, vb = { x: -10, y: -10, w: 200, h: 120 };
let drag = null, spaceDown = false, lastBuild = null, hoverId = null;
/* touch state: active fingers, pinch gesture, long-press timer */
const touches = new Map();
let pinch = null, longPress = null;
C.pointerType = 'mouse';

const pxPerMm = () => svg.clientWidth / vb.w;
const MM_PX = 96 / 25.4;
C.zoomPct = () => Math.round(pxPerMm() / MM_PX * 100);

C.toPage = (cx, cy) => {
  const r = svg.getBoundingClientRect();
  return [vb.x + (cx - r.left) / r.width * vb.w, vb.y + (cy - r.top) / r.height * vb.h];
};
const setVB = () => {
  const r = svg.getBoundingClientRect();
  vb.h = vb.w * (r.height / Math.max(1, r.width));
  svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  D.$('#zoomLabel').textContent = C.zoomPct() + '%';
  drawOverlay();
};
C.fit = () => {
  const r = svg.getBoundingClientRect(), W = S.doc.page.width, H = S.doc.page.height;
  const m = 0.08;
  const k = Math.min(r.width / (W * (1 + 2 * m)), r.height / (H * (1 + 2 * m)));
  vb.w = r.width / k;
  vb.h = r.height / k;
  vb.x = W / 2 - vb.w / 2; vb.y = H / 2 - vb.h / 2;
  setVB();
};
C.zoomBy = (f, cx, cy) => {
  const r = svg.getBoundingClientRect();
  const p = cx == null ? [vb.x + vb.w / 2, vb.y + vb.h / 2] : C.toPage(cx, cy);
  const nw = U.clamp(vb.w / f, 4, 4000);
  const k = nw / vb.w;
  vb.x = p[0] - (p[0] - vb.x) * k; vb.y = p[1] - (p[1] - vb.y) * k; vb.w = nw;
  void r;
  setVB();
};
C.center = () => [vb.x + vb.w / 2, vb.y + vb.h / 2];
C.visibleCenter = () => {
  const c = C.center(), W = S.doc.page.width, H = S.doc.page.height;
  return [U.clamp(c[0], 8, W - 8), U.clamp(c[1], 8, H - 8)];
};

/* ---------- rendering ---------- */
C.render = () => {
  const doc = S.doc, W = doc.page.width, H = doc.page.height;
  const live = RNBX.anim.isLive(doc) && S.stillView !== doc;
  lastBuild = RNBX.render.build(doc, { interactive: true, time: live ? S.time : null, motion: S.playing });
  figure.innerHTML = lastBuild.inner;
  C.trace = lastBuild.trace;
  ['pageShadowRect', 'gridRect', 'pageOutline'].forEach(id => {
    const e = document.getElementById(id);
    e.setAttribute('x', 0); e.setAttribute('y', 0); e.setAttribute('width', W); e.setAttribute('height', H);
  });
  document.getElementById('gridRect').style.display = S.ui.grid && doc.style.mode !== '3d' ? '' : 'none';
  const minor = svg.querySelector('#gridMinor'), major = svg.querySelector('#gridMajor');
  const g = S.ui.gridSize || 2.5;
  minor.setAttribute('width', g); minor.setAttribute('height', g);
  minor.querySelector('path').setAttribute('d', `M ${g} 0 L 0 0 0 ${g}`);
  major.setAttribute('width', g * 4); major.setAttribute('height', g * 4);
  major.querySelector('rect').setAttribute('width', g * 4); major.querySelector('rect').setAttribute('height', g * 4);
  major.querySelector('path').setAttribute('d', `M ${g * 4} 0 L 0 0 0 ${g * 4}`);
  const nb = C.trace.segments.length;
  D.$('#stBeams').textContent = nb ? `${nb} beam segment${nb === 1 ? '' : 's'}${C.trace.truncated ? ' (limit reached)' : ''}` : '';
  drawOverlay();
};

/* ---------- overlay: selection, handles, guides ---------- */
const sv = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const is3d = () => S.doc.style.mode === '3d';
const isPageSpace = obj => { const d = lib.get(obj.type); return d && (d.annotation || d.special); };

function localBox(obj) {
  const def = lib.get(obj.type);
  if (!def || !def.bbox) return [-2, -2, 2, 2];
  try { return lib.objBox(obj, S.doc); } catch (e) { return [-2, -2, 2, 2]; }
}
function boxPath(obj) {
  const b = localBox(obj);
  const pad = 0.6 / Math.max(0.5, obj.scale || 1);
  const pts = [[b[0] - pad, b[1] - pad], [b[2] + pad, b[1] - pad], [b[2] + pad, b[3] + pad], [b[0] - pad, b[3] + pad]].map(p => U.toWorld(obj, p));
  return 'M ' + pts.map(p => U.round(p[0], 3) + ' ' + U.round(p[1], 3)).join(' L ') + ' Z';
}
/* screen-space box of a rendered element (used in 3D and for connections) */
function domBox(id) {
  const el = figure.querySelector(`[data-id="${id}"]`);
  if (!el) return null;
  try { const b = el.getBBox(); return b.width || b.height ? b : null; } catch (e) { return null; }
}

function drawOverlay() {
  if (!overlay) return;
  overlay.innerHTML = '';
  const k = 1 / pxPerMm();                       // mm per screen pixel
  const sel = RNBX.selected();
  const multi = sel.length > 1;
  const space3d = is3d();
  const addBox = (obj, cls) => {
    const def = lib.get(obj.type);
    if (def.connection || (space3d && !isPageSpace(obj))) {
      const b = domBox(obj.id);
      if (b) overlay.append(sv('rect', { x: b.x - 0.6, y: b.y - 0.6, width: b.width + 1.2, height: b.height + 1.2, class: cls, rx: 0.5 }));
    } else overlay.append(sv('path', { d: boxPath(obj), class: cls }));
  };
  if (hoverId && !S.selection.includes(hoverId) && !drag) { const h = RNBX.getObj(hoverId); if (h) addBox(h, 'hover-box'); }
  sel.forEach(o => addBox(o, 'sel-box' + (multi ? ' multi' : '')));
  if (sel.length === 1 && !multi) {
    const o = sel[0], def = lib.get(o.type);
    if (!def.connection && !(space3d && !isPageSpace(o)) && !o.locked) {
      const b = localBox(o), s = o.scale || 1;
      const hr = (C.pointerType === 'touch' ? 11 : 5) * k;
      const canRotate = !(def.handles) && o.type !== 'legend';
      if (canRotate) {
        const top = U.toWorld(o, [(b[0] + b[2]) / 2, b[1] - 0.6 / s]);
        const rh = U.toWorld(o, [(b[0] + b[2]) / 2, b[1] - 0.6 / s - 22 * k / s]);
        overlay.append(sv('line', { x1: top[0], y1: top[1], x2: rh[0], y2: rh[1], class: 'handle-line' }));
        overlay.append(sv('circle', { cx: rh[0], cy: rh[1], r: hr, class: 'handle rot', 'data-handle': 'rotate' }));
      }
      if (def.handles) def.handles(o.props).forEach(h => {
        const p = [o.x + h.x, o.y + h.y];
        overlay.append(sv('circle', { cx: p[0], cy: p[1], r: hr, class: 'handle', 'data-handle': 'pt:' + h.key }));
      });
      else if (o.type !== 'legend') {
        const c = U.toWorld(o, [b[2] + 0.6 / s, b[3] + 0.6 / s]);
        overlay.append(sv('rect', { x: c[0] - hr * 0.8, y: c[1] - hr * 0.8, width: hr * 1.6, height: hr * 1.6, class: 'handle', 'data-handle': 'scale', rx: hr * 0.2 }));
      }
    }
  }
  if (drag && drag.guides) drag.guides.forEach(g => { const { eq, ...geo } = g; overlay.append(sv('line', Object.assign({ class: eq ? 'guide eq' : 'guide' }, geo))); });
  if (drag && drag.snapPt) overlay.append(sv('circle', { cx: drag.snapPt[0], cy: drag.snapPt[1], r: 3.5 * k, class: 'snap-dot' }));
  if (drag && drag.angleTip) overlay.append(Object.assign(sv('text', { x: drag.angleTip.x, y: drag.angleTip.y, class: 'angle-tip', 'font-size': 11 * k, 'stroke-width': 3 * k }), { textContent: drag.angleTip.text }));
  if (drag && drag.kind === 'marquee') {
    const r = rectOf(drag.p0, drag.p1);
    overlay.append(sv('rect', { x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1], class: 'marquee' }));
  }
}
C.drawOverlay = drawOverlay;
const rectOf = (a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];

/* ---------- snapping ---------- */
C.orientFor = (def, ang) => {
  switch (def.snap) {
    case 'mirror': return U.normDeg(ang + 45);
    case 'cube': case 'perp': return U.normDeg(ang);
    case 'face': return U.normDeg(ang + 180);
    case 'grating': return U.normDeg(ang + 150);
    default: return null;
  }
};
/* nearest beam to p, computed without the objects being moved */
C.beamSnap = (p, segs, tolMm) => {
  let best = null;
  for (const s of segs) {
    if (s.kind !== 'beam' || s.len < 0.5) continue;
    const q = U.pointSeg(p, s.a, s.b);
    if (q.d < tolMm && (!best || q.d < best.d)) best = { d: q.d, q: q.q, ang: V.angle(V.sub(s.b, s.a)), seg: s };
  }
  return best;
};
const traceWithout = ids => {
  const set = new Set(ids);
  return RNBX.trace(Object.assign({}, S.doc, { objects: S.doc.objects.filter(o => !set.has(o.id)) })).segments;
};
const snapGrid = v => { const g = S.ui.gridSize || 2.5; return Math.round(v / g) * g; };

/* ---------- pointer handling ---------- */
function startPinch() {
  const pts = [...touches.values()];
  const r = svg.getBoundingClientRect();
  const mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
  pinch = { d0: Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) || 1, vb0: Object.assign({}, vb), w0: [vb.x + (mid[0] - r.left) / r.width * vb.w, vb.y + (mid[1] - r.top) / r.height * vb.h] };
}
function movePinch() {
  const pts = [...touches.values()];
  if (pts.length < 2) return;
  const r = svg.getBoundingClientRect();
  const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]) || 1;
  const mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
  vb.w = U.clamp(pinch.vb0.w * pinch.d0 / d, 4, 4000);
  vb.h = vb.w * (r.height / Math.max(1, r.width));
  vb.x = pinch.w0[0] - (mid[0] - r.left) / r.width * vb.w;
  vb.y = pinch.w0[1] - (mid[1] - r.top) / r.height * vb.h;
  setVB();
}
const cancelLongPress = () => { if (longPress) { clearTimeout(longPress.t); longPress = null; } };

function onDown(e) {
  svg.focus({ preventScroll: true });
  D.closeMenu();
  C.pointerType = e.pointerType || 'mouse';
  if (e.pointerType === 'touch') {
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      // second finger: abandon the one-finger action and start pinch / pan
      cancelLongPress();
      if (drag && drag.moved) { const ids = drag.ids || (drag.id ? [drag.id] : []); RNBX.anim.touch(ids); ids.forEach(id => RNBX.anim.editing.delete(id)); S.dragging = false; }
      drag = null;
      startPinch();
      drawOverlay();
      return;
    }
    if (touches.size > 2) return;
    // long press opens the context menu
    const tgt = e.target, cx = e.clientX, cy = e.clientY;
    longPress = { x: cx, y: cy, t: setTimeout(() => { longPress = null; if (drag && drag.moved) return; drag = null; RNBX.emit('contextmenu', { target: tgt, clientX: cx, clientY: cy, preventDefault() {} }); }, 550) };
  }
  const p = C.toPage(e.clientX, e.clientY);
  if (e.button === 1 || e.button === 2 && false || spaceDown) { startPan(e); return; }
  if (e.button !== 0) return;
  const hEl = e.target.closest && e.target.closest('[data-handle]');
  const idEl = e.target.closest && e.target.closest('#figure [data-id]');
  const lbEl = e.target.closest && e.target.closest('#figure [data-label]');
  const tool = S.ui.tool;

  if (tool === 'fiber' || tool === 'wire') {
    if (idEl) connectClick(idEl.getAttribute('data-id'));
    return;
  }
  if (hEl) { startHandle(e, hEl.getAttribute('data-handle'), p); return; }
  if (lbEl) {
    const id = lbEl.getAttribute('data-label'), o = RNBX.getObj(id);
    if (o && !o.locked) {
      if (!S.selection.includes(id)) RNBX.select([id]);
      // the 3D view keeps its own label offsets, so 2D layouts are untouched
      const k3 = is3d() && !isPageSpace(o);
      drag = { kind: 'label', id, p0: p, k3, start: k3 ? { dx: o.label.dx3 || 0, dy: o.label.dy3 || 0 } : { dx: o.label.dx, dy: o.label.dy }, moved: false };
      capture(e);
      return;
    }
  }
  if (idEl) {
    const id = idEl.getAttribute('data-id');
    if (e.shiftKey || e.metaKey || e.ctrlKey) { RNBX.select([id], true); return; }
    if (!S.selection.includes(id)) RNBX.select([id]);
    startMove(e, p);
    return;
  }
  if (!e.shiftKey) RNBX.select([]);
  // one finger on empty canvas pans (a marquee is awkward on touch screens)
  if (e.pointerType === 'touch') { startPan(e); return; }
  drag = { kind: 'marquee', p0: p, p1: p, additive: e.shiftKey };
  capture(e);
}
function capture(e) { try { svg.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }

function startPan(e) {
  drag = { kind: 'pan', c0: [e.clientX, e.clientY], vb0: Object.assign({}, vb) };
  svg.classList.add('panning');
  capture(e);
}
function startMove(e, p) {
  const objs = RNBX.selected().filter(o => !o.locked && !lib.get(o.type).connection);
  if (!objs.length) return;
  const ids = objs.map(o => o.id);
  drag = {
    kind: 'move', p0: p, moved: false, ids,
    // an attached block starts from where its bottom is drawn, so dragging it off a stack does not jump
    starts: objs.map(o => ({ id: o.id, x: o.x, y: o.y - (lib.get(o.type).stackable && o.props.on && lib.surfMax ? lib.surfMax(o.props.base) * (o.scale || 1) : 0) })),
    snapSegs: null,
    others: S.doc.objects.filter(o => !ids.includes(o.id) && !lib.get(o.type).connection && !lib.get(o.type).annotation),
  };
  if (is3d()) drag.p3d0 = RNBX.render.last3d ? RNBX.render.last3d.unproject(p[0], p[1], S.doc.view3d.beamHeight) : p;
  capture(e);
}
function startHandle(e, h, p) {
  const o = RNBX.selected()[0];
  if (!o) return;
  const b = localBox(o);
  drag = { kind: 'handle', h, id: o.id, p0: p, moved: false, start: U.deepClone({ x: o.x, y: o.y, rot: o.rot || 0, scale: o.scale || 1, props: o.props }), box: b };
  capture(e);
}

function firstMove() {
  if (drag.moved) return;
  drag.moved = true;
  RNBX.history.checkpoint();
  S.dragging = true;
  if (drag.ids) drag.ids.forEach(id => RNBX.anim.editing.add(id)); else if (drag.id) RNBX.anim.editing.add(drag.id);
}

function onMove(e) {
  if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (longPress && Math.hypot(e.clientX - longPress.x, e.clientY - longPress.y) > 8) cancelLongPress();
    if (pinch && touches.size >= 2) { movePinch(); return; }
  }
  const p = C.toPage(e.clientX, e.clientY);
  D.$('#stCursor').textContent = `x ${U.fmt(p[0], 1)} · y ${U.fmt(p[1], 1)} mm`;
  if (!drag) {
    const idEl = e.target.closest && e.target.closest('#figure [data-id]');
    const id = idEl ? idEl.getAttribute('data-id') : null;
    if (id !== hoverId) { hoverId = id; drawOverlay(); }
    return;
  }
  const k = 1 / pxPerMm();
  if (drag.kind === 'pan') {
    const r = svg.getBoundingClientRect();
    vb.x = drag.vb0.x - (e.clientX - drag.c0[0]) / r.width * vb.w;
    vb.y = drag.vb0.y - (e.clientY - drag.c0[1]) / r.height * vb.h;
    setVB();
    return;
  }
  if (drag.kind === 'marquee') { drag.p1 = p; drawOverlay(); return; }
  const dist = Math.hypot(p[0] - drag.p0[0], p[1] - drag.p0[1]);
  if (!drag.moved && dist < 2.5 * k) return;
  firstMove();

  if (drag.kind === 'label') {
    const o = RNBX.getObj(drag.id);
    o.label[drag.k3 ? 'dx3' : 'dx'] = U.round(drag.start.dx + p[0] - drag.p0[0], 2);
    o.label[drag.k3 ? 'dy3' : 'dy'] = U.round(drag.start.dy + p[1] - drag.p0[1], 2);
    RNBX.changed();
    return;
  }
  if (drag.kind === 'move') return moveSelection(p, e, k);
  if (drag.kind === 'handle') return moveHandle(p, e, k);
}

function moveSelection(p, e, k) {
  let dx = p[0] - drag.p0[0], dy = p[1] - drag.p0[1];
  const space3d = is3d();
  if (space3d && RNBX.render.last3d && drag.p3d0) {
    const q = RNBX.render.last3d.unproject(p[0], p[1], S.doc.view3d.beamHeight);
    drag.d3 = [q[0] - drag.p3d0[0], q[1] - drag.p3d0[1]];
  }
  if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
  drag.guides = []; drag.snapPt = null;
  const single = drag.starts.length === 1 ? RNBX.getObj(drag.starts[0].id) : null;
  drag.starts.forEach(st => {
    const o = RNBX.getObj(st.id);
    const d = space3d && !isPageSpace(o) && drag.d3 ? drag.d3 : [dx, dy];
    o.x = st.x + d[0]; o.y = st.y + d[1];
  });
  if (single && !e.altKey) {
    const def = lib.get(single.type);
    let snapped = false;
    // 0. building blocks stack onto the top of other blocks
    if (def.stackable && S.ui.snap && lib.stackAnchor) {
      const hit = lib.stackAnchor(single, [single.x, single.y], S.doc, Math.max(2.5, 10 * k));
      if (hit) { single.props.on = hit.o.id; drag.snapPt = hit.pt; snapped = true; }
      else if (single.props.on) { single.props.on = ''; single.props.base = null; }
    }
    // 1. snap optics onto beams
    if (def.snap && S.ui.snap) {
      if (!drag.snapSegs) drag.snapSegs = traceWithout([single.id]);
      const hit = C.beamSnap([single.x, single.y], drag.snapSegs, Math.max(1.2, 9 * k));
      if (hit) { single.x = hit.q[0]; single.y = hit.q[1]; single.z = hit.seg.za || 0; drag.snapPt = hit.q; snapped = true; drag.snapAng = hit.ang; }
    }
    // 2. alignment guides against other components (2D)
    if (!snapped && !space3d) {
      const tol = 6 * k;
      let gx = null, gy = null;
      for (const o of drag.others) {
        if (gx == null && Math.abs(o.x - single.x) < tol) gx = o;
        if (gy == null && Math.abs(o.y - single.y) < tol) gy = o;
      }
      if (gx) { single.x = gx.x; drag.guides.push({ x1: gx.x, y1: Math.min(gx.y, single.y) - 6, x2: gx.x, y2: Math.max(gx.y, single.y) + 6 }); }
      if (gy) { single.y = gy.y; drag.guides.push({ x1: Math.min(gy.x, single.x) - 6, y1: gy.y, x2: Math.max(gy.x, single.x) + 6, y2: gy.y }); }
      // 2b. equal spacing with neighbours in the same row / column
      let ex = false, ey = false;
      if (S.ui.snap && RNBX.layout) { const r = RNBX.layout.smartSnap(single, drag.others, tol, { x: !gx, y: !gy }); ex = r.sx; ey = r.sy; drag.guides.push(...r.guides); }
      // 3. grid
      if (S.ui.snap && S.ui.grid) { if (!gx && !ex) single.x = snapGrid(single.x); if (!gy && !ey) single.y = snapGrid(single.y); }
    }
  } else if (!e.altKey && S.ui.snap && S.ui.grid && !space3d) {
    // move groups on the grid by their first member
    const f = RNBX.getObj(drag.starts[0].id), st = drag.starts[0];
    const ox = snapGrid(f.x) - f.x, oy = snapGrid(f.y) - f.y;
    drag.starts.forEach(s => { const o = RNBX.getObj(s.id); o.x += ox; o.y += oy; });
    void st;
  }
  RNBX.changed();
}

function moveHandle(p, e, k) {
  const o = RNBX.getObj(drag.id), def = lib.get(o.type), st = drag.start;
  if (drag.h === 'rotate') {
    let a = V.angle(V.sub(p, [o.x, o.y])) + 90;
    a = e.shiftKey ? Math.round(a) : Math.round(a / 15) * 15;
    o.rot = U.normDeg(a);
    drag.angleTip = { x: p[0] + 8 * k, y: p[1] - 8 * k, text: U.fmt(o.rot, 1) + '°' };
  } else if (drag.h === 'scale') {
    const b = drag.box;
    if (def.resizable) {
      // resize w/h in the object's local frame, keeping the opposite corner fixed
      const loc = V.rot(V.sub(p, [st.x, st.y]), -(st.rot || 0));
      const x0 = -st.props.w / 2, y0 = -st.props.h / 2;
      let w = Math.max(0.5, loc[0] - x0), h = Math.max(0.5, loc[1] - y0);
      if (def.keepAspect || e.shiftKey) { const a = st.props.w / st.props.h; if (w / h > a) h = w / a; else w = h * a; }
      o.props.w = U.round(w, 2); o.props.h = U.round(h, 2);
      const c = V.add([st.x, st.y], V.rot([x0 + w / 2, y0 + h / 2], st.rot || 0));
      o.x = c[0]; o.y = c[1];
      drag.angleTip = { x: p[0] + 8 * k, y: p[1] + 8 * k, text: `${U.fmt(w, 1)} × ${U.fmt(h, 1)} mm` };
    } else {
      const corner = U.toWorld(Object.assign({}, o, { scale: st.scale }), [b[2], b[3]]);
      const d0 = V.dist(corner, [st.x, st.y]), d1 = V.dist(p, [st.x, st.y]);
      let s = st.scale * d1 / Math.max(0.1, d0);
      s = e.shiftKey ? U.round(s, 3) : Math.round(s * 20) / 20;
      o.scale = U.clamp(s, 0.1, 20);
      drag.angleTip = { x: p[0] + 8 * k, y: p[1] + 8 * k, text: '× ' + U.fmt(o.scale, 2) };
    }
  } else if (drag.h.startsWith('pt:')) {
    let dx = p[0] - o.x, dy = p[1] - o.y;
    if (e.shiftKey) { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(dx, dy); dx = Math.cos(a) * L; dy = Math.sin(a) * L; }
    o.props.dx = U.round(dx, 2); o.props.dy = U.round(dy, 2);
  }
  RNBX.changed();
}

function onUp(e) {
  if (e.pointerType === 'touch') {
    touches.delete(e.pointerId);
    cancelLongPress();
    if (touches.size < 2) pinch = null;
  }
  if (!drag) return;
  const d = drag;
  drag = null;
  svg.classList.remove('panning');
  try { svg.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  if (d.kind === 'marquee') {
    const r = rectOf(d.p0, d.p1);
    if (r[2] - r[0] > 0.5 || r[3] - r[1] > 0.5) {
      const cam = is3d() ? RNBX.render.last3d : null;
      const ids = S.doc.objects.filter(o => {
        if (o.hidden || lib.get(o.type).connection) return false;
        let c = [o.x, o.y];
        if (cam && !isPageSpace(o)) { const q = cam.p(o.x, o.y, S.doc.view3d.beamHeight); c = [q[0], q[1]]; }
        return c[0] >= r[0] && c[0] <= r[2] && c[1] >= r[1] && c[1] <= r[3];
      }).map(o => o.id);
      RNBX.select(ids, d.additive);
    }
    drawOverlay();
    return;
  }
  S.dragging = false;
  if (d.moved) {
    const ids = d.ids || [d.id];
    RNBX.anim.touch(ids);
    ids.forEach(id => RNBX.anim.editing.delete(id));
    RNBX.changed();
    RNBX.emit('objectsEdited', ids);
  }
  drawOverlay();
}

/* ---------- connection tools ---------- */
C.setTool = tool => {
  S.ui.tool = tool || 'select';
  S.ui.connectFrom = null;
  svg.classList.toggle('connecting', tool === 'fiber' || tool === 'wire');
  const hint = D.$('#connectHint');
  hint.hidden = !(tool === 'fiber' || tool === 'wire');
  hint.textContent = tool === 'fiber' ? 'Fibre: click the input coupler (Esc to cancel)' : 'Wire: click the first object (Esc to cancel)';
  RNBX.emit('tool', S.ui.tool);
};
function connectClick(id) {
  const tool = S.ui.tool, o = RNBX.getObj(id);
  if (!o) return;
  const od = RNBX.lib.get(o.type);
  if (tool === 'fiber' && !(od && od.fiberPort && (!od.fiberOk || od.fiberOk(o.props)))) { RNBX.toast('Fibres connect fibre couplers, fibre ends and fibre-output lasers. Add them from Fibre optics or Sources.'); return; }
  if (!S.ui.connectFrom) {
    S.ui.connectFrom = id;
    D.$('#connectHint').textContent = tool === 'fiber' ? 'Now click the output coupler' : 'Now click the second object';
    RNBX.select([id]);
    return;
  }
  if (S.ui.connectFrom === id) return;
  const c = RNBX.createObject(tool, 0, 0);
  c.props.from = S.ui.connectFrom; c.props.to = id;
  RNBX.addObject(c);
  C.setTool('select');
}

/* ---------- drop from the library ---------- */
C.placeNew = (entry, p, fromDrop) => {
  const def = lib.get(entry.type);
  if (def.tool) { C.setTool(def.tool); return null; }
  const o = RNBX.createObject(entry.type, p[0], p[1]);
  if (entry.props) Object.assign(o.props, U.deepClone(entry.props));
  if (entry.abbr && o.label) o.label.text = RNBX.nextLabel(entry.abbr);
  if (entry.name && entry.props) o.kindName = entry.name;
  if (is3d() && !def.annotation && RNBX.render.last3d) {
    const q = RNBX.render.last3d.unproject(p[0], p[1], S.doc.view3d.beamHeight);
    o.x = q[0]; o.y = q[1];
  }
  // building blocks: clicked → on top of the selected stack; dropped → onto a stack nearby
  if (def.stackable && lib.stackTop) {
    const sel = RNBX.selected().find(q => lib.get(q.type).stackable);
    const target = !fromDrop && sel ? lib.stackTop(sel) : fromDrop ? (lib.stackAnchor(o, [o.x, o.y], S.doc, 8) || {}).o : null;
    if (target) {
      o.props.on = target.id; o.x = target.x; o.y = target.y;
      RNBX.addObject(o);
      RNBX.toast('Stacked on ' + (target.props.name || lib.get(target.type).name) + '. Drag it away to detach.');
      return o;
    }
  }
  // clicked (not dropped) optics go onto the open end of the beam, so a
  // setup can be built just by clicking library items in order
  if (def.snap && !fromDrop && C.trace) {
    const open = C.trace.segments.filter(s => s.kind === 'beam' && s.end === 'open' && s.len > 6 && s.P > s.P0 * 0.05);
    if (open.length) {
      const seg = open.reduce((a, b) => (b.s0 > a.s0 ? b : a));
      const d = V.norm(V.sub(seg.b, seg.a)), dist = Math.min(22, seg.len * 0.5);
      const q = V.add(seg.a, V.mul(d, dist));
      o.x = q[0]; o.y = q[1]; o.z = seg.za || 0;
      const r = C.orientFor(def, V.angle(d)); if (r != null) o.rot = r;
      C.avoidOverlap(o);
      RNBX.addObject(o);
      if (!is3d() && o.label && RNBX.labels) { RNBX.labels.placeOne(S.doc, o); RNBX.changed(); }
      return o;
    }
  }
  // otherwise avoid stacking on top of an existing object
  if (!fromDrop) {
    let guard = 0;
    while (guard++ < 20 && S.doc.objects.some(q => Math.hypot(q.x - o.x, q.y - o.y) < 4)) o.x += 12;
  }
  if (def.snap) {
    const k = 1 / pxPerMm();
    const hit = C.beamSnap([o.x, o.y], C.trace ? C.trace.segments : [], fromDrop ? Math.max(2, 14 * k) : 6);
    if (hit) { o.x = hit.q[0]; o.y = hit.q[1]; o.z = hit.seg.za || 0; const r = C.orientFor(def, hit.ang); if (r != null) o.rot = r; }
    else if (S.ui.snap && S.ui.grid && !is3d()) { o.x = snapGrid(o.x); o.y = snapGrid(o.y); }
  } else if (S.ui.snap && S.ui.grid && !def.annotation && !is3d()) { o.x = snapGrid(o.x); o.y = snapGrid(o.y); }
  C.avoidOverlap(o);
  RNBX.addObject(o);
  if (!is3d() && o.label && RNBX.labels) { RNBX.labels.placeOne(S.doc, o); RNBX.changed(); }
  return o;
};

/* nudge a newly placed object along its beam (or sideways) until it
   no longer overlaps an existing part */
C.avoidOverlap = o => {
  const def = lib.get(o.type);
  if (def.annotation || def.connection) return;
  const boxes = S.doc.objects.filter(q => !lib.get(q.type).annotation && !lib.get(q.type).connection && !lib.get(q.type).under).map(q => lib.worldBox(q));
  const m = 1.5;   // clearance between parts
  const hits = () => { const b = lib.worldBox(o); return boxes.some(q => b[0] - m < q[2] && b[2] + m > q[0] && b[1] - m < q[3] && b[3] + m > q[1]); };
  if (!hits()) return;
  const segs = C.trace ? C.trace.segments.filter(s => s.kind === 'beam' && !s.vertical) : [];
  const on = def.snap ? C.beamSnap([o.x, o.y], segs, 0.3) : null;
  const dir = on ? V.norm(V.sub(on.seg.b, on.seg.a)) : [1, 0];
  const x0 = o.x, y0 = o.y;
  for (let k = 1; k <= 24; k++) {
    for (const sg of [1, -1]) {
      o.x = x0 + dir[0] * 3 * k * sg; o.y = y0 + dir[1] * 3 * k * sg;
      if (!hits()) return;
    }
  }
  o.x = x0; o.y = y0;
};

/* orient the selection to the beam it sits on */
C.orientToBeam = () => {
  const sel = RNBX.selected().filter(o => lib.get(o.type).snap);
  if (!sel.length) return;
  RNBX.history.checkpoint();
  sel.forEach(o => {
    const segs = traceWithout([o.id]);
    const hit = C.beamSnap([o.x, o.y], segs, 3);
    if (hit) { const r = C.orientFor(lib.get(o.type), hit.ang); if (r != null) o.rot = r; }
  });
  RNBX.anim.touch(sel.map(o => o.id));
  RNBX.changed();
};

/* ---------- init ---------- */
C.init = () => {
  svg = D.$('#canvas'); figure = D.$('#figure'); overlay = D.$('#overlay');
  svg.addEventListener('pointerdown', onDown);
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointercancel', onUp);
  svg.addEventListener('pointerleave', () => { if (hoverId && !drag) { hoverId = null; drawOverlay(); } });
  svg.addEventListener('contextmenu', e => { e.preventDefault(); RNBX.emit('contextmenu', e); });
  svg.addEventListener('dblclick', e => {
    const el = e.target.closest('#figure [data-id], #figure [data-label]');
    if (el) RNBX.emit('focusText', el.getAttribute('data-id') || el.getAttribute('data-label'));
  });
  svg.addEventListener('wheel', e => {
    e.preventDefault();
    const mouseLike = e.deltaMode === 1 || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY) && e.deltaX === 0);
    if (e.ctrlKey || e.metaKey || mouseLike) C.zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0018)), e.clientX, e.clientY);
    else {
      const r = svg.getBoundingClientRect();
      vb.x += e.deltaX / r.width * vb.w; vb.y += e.deltaY / r.height * vb.h;
      setVB();
    }
  }, { passive: false });
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (!spaceDown) { spaceDown = true; svg.classList.add('space'); } e.preventDefault(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') { spaceDown = false; svg.classList.remove('space'); } });
  // drag & drop from the library and from the file system
  const stage = D.$('#stage');
  stage.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  stage.addEventListener('drop', e => {
    e.preventDefault();
    const p = C.toPage(e.clientX, e.clientY);
    const data = e.dataTransfer.getData('text/rnbx');
    if (data) { C.placeNew(JSON.parse(data), p, true); return; }
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    if (/\.json$/i.test(f.name)) RNBX.project.openFile(f);
    else if (/^image\//.test(f.type)) RNBX.project.importImage(f, p[0], p[1]);
  });
  new ResizeObserver(() => setVB()).observe(svg);
  D.$('#zoomIn').onclick = () => C.zoomBy(1.25);
  D.$('#zoomOut').onclick = () => C.zoomBy(0.8);
  D.$('#zoomLabel').onclick = () => C.fit();
  RNBX.on('render', C.render);
  RNBX.on('selection', () => drawOverlay());
  RNBX.on('document', () => setTimeout(C.fit, 0));
  C.fit();
};
})();
