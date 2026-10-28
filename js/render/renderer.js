/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/renderer.js
   Composes the complete figure as one SVG document, used both
   by the live canvas and by every exporter, so what you see is
   exactly what you export.

   Layer order (bottom → top):
     background · under-layer items (stages, regions) ·
     fibres & wires · beams · components · annotations ·
     component labels · zoom insets
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, n = v => U.round(v, 3);
const R = RNBX.render = {};

R.transform = o => `translate(${n(o.x)} ${n(o.y)})${o.rot ? ` rotate(${n(o.rot)})` : ''}${o.scale && o.scale !== 1 ? ` scale(${n(o.scale)})` : ''}`;

R.labelText = obj => RNBX.text.fill(obj.label.text, obj.props);

R.labelColor = doc => {
  const c = doc.style.labelColor || '#111111';
  return RNBX.isDarkPage(doc.page) && c.toLowerCase() === '#111111' ? '#f1f3f5' : c;
};

/* one component label (supports multi-line and markup) */
R.label = (obj, doc, x, y, interactive) => {
  if (!obj.label || !obj.label.show || !doc.style.showLabels || !obj.label.text) return '';
  const fs = U.pt2mm(obj.label.size || doc.style.fontSizePt || 7);
  const lines = R.labelText(obj).split('\n');
  const col = obj.label.color || R.labelColor(doc);
  const y0 = y - (lines.length - 1) * fs * 0.6;
  const body = lines.map((l, i) => `<text x="${n(x)}" y="${n(y0 + i * fs * 1.2)}" text-anchor="middle" dominant-baseline="central">${RNBX.text.markup(l, fs)}</text>`).join('');
  let lead = '';
  if (obj.label.leader && RNBX.labels) {
    const sz = RNBX.labels.size(obj, doc);
    lead = RNBX.labels.leader(lib.worldBox(obj), [x - sz.w / 2, y - sz.h / 2, x + sz.w / 2, y + sz.h / 2], RNBX.isDarkPage(doc.page) ? '#c9d1dc' : '#4b5563', n(Math.max(0.12, U.pt2mm(doc.style.lineWidthPt || 0.5) * 0.7)));
  }
  const lop = obj.opacity != null && obj.opacity < 1 ? ` opacity="${obj.opacity}"` : '';
  return (lop ? `<g${lop}>` : '') + lead + `<g ${interactive ? `data-label="${obj.id}"` : ''} font-family="${U.esc(doc.style.font)}" font-size="${n(fs)}" fill="${col}" ${obj.label.bold ? 'font-weight="700"' : ''} ${obj.label.italic ? 'font-style="italic"' : ''}>${body}</g>` + (lop ? '</g>' : '');
};

R.object2D = (obj, S, interactive) => {
  const def = lib.get(obj.type);
  if (!def || !def.draw) return '';
  let inner = '';
  try { inner = RNBX.isVertical(obj) ? lib.topView(obj, S) : def.draw(obj.props, S, obj); } catch (e) { console.error(obj.type, e); }
  const op = obj.opacity != null && obj.opacity < 1 ? ` opacity="${obj.opacity}"` : '';
  return `<g ${interactive ? `data-id="${obj.id}"` : ''} transform="${R.transform(obj)}"${op}>${inner}</g>`;
};

R.connection = (obj, doc, S, trace, interactive) => {
  const def = lib.get(obj.type);
  const body = def.drawConn(obj, doc, S, trace);
  if (!body) return '';
  // an invisible fat stroke makes thin connections easy to click
  const g = def.geometry(obj, doc);
  const hit = interactive && g ? `<path d="${g.d}" fill="none" stroke="transparent" stroke-width="2.5"/>` : '';
  return `<g ${interactive ? `data-id="${obj.id}"` : ''}>${body}${hit}</g>`;
};

R.inset = (obj, doc) => {
  const p = obj.props, k = p.R / p.r, w = U.pt2mm(p.width);
  const sx = obj.x, sy = obj.y, tx = obj.x + p.dx, ty = obj.y + p.dy;
  const cid = 'rbx-inset-' + obj.id;
  const shape = (cx, cy, r, extra) => p.shape === 'square'
    ? `<rect x="${n(cx - r)}" y="${n(cy - r)}" width="${n(2 * r)}" height="${n(2 * r)}" ${extra}/>`
    : `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${extra}/>`;
  // tangent connector lines between the two circles
  const d = Math.hypot(tx - sx, ty - sy) || 1, a = Math.atan2(ty - sy, tx - sx);
  const beta = Math.acos(U.clamp((p.R - p.r) / d, -1, 1));
  const lines = [1, -1].map(sg => {
    const ang = a + sg * beta;
    const p1 = [sx - Math.cos(ang) * p.r, sy - Math.sin(ang) * p.r], p2 = [tx - Math.cos(ang) * p.R, ty - Math.sin(ang) * p.R];
    return `<line x1="${n(p1[0])}" y1="${n(p1[1])}" x2="${n(p2[0])}" y2="${n(p2[1])}" stroke="${p.color}" stroke-width="${n(w * 0.8)}"/>`;
  }).join('');
  const bg = RNBX.isDarkPage(doc.page) ? '#0b1020' : '#ffffff';
  return `<g data-inset="${obj.id}">${p.shape === 'square' ? '' : lines}<defs><clipPath id="${cid}">${shape(tx, ty, p.R, '')}</clipPath></defs>` +
    shape(tx, ty, p.R, `fill="${bg}" stroke="none"`) +
    `<g clip-path="url(#${cid})"><use href="#rbx-content" xlink:href="#rbx-content" transform="translate(${n(tx)} ${n(ty)}) scale(${n(k)}) translate(${n(-sx)} ${n(-sy)})"/></g>` +
    shape(tx, ty, p.R, `fill="none" stroke="${p.color}" stroke-width="${n(w)}"`) +
    shape(sx, sy, p.r, `fill="none" stroke="${p.color}" stroke-width="${n(w)}" stroke-dasharray="${n(w * 3)} ${n(w * 2)}"`) + '</g>';
};

/* ---------- full build ---------- */
R.build = (srcDoc, opt = {}) => {
  const time = opt.time != null ? opt.time : null;
  const doc = time != null && RNBX.anim ? RNBX.anim.evaluate(srcDoc, time) : srcDoc;
  const W = doc.page.width, H = doc.page.height;
  const full = RNBX.trace(doc);
  // during a "switch on" animation the beams grow out of the sources
  const trace = RNBX.anim && doc.animation && doc.animation.reveal ? RNBX.anim.revealTrace(doc, full, time) : full;
  const mode = opt.mode || doc.style.mode;
  const S = lib.style(doc, { mode: mode === '3d' ? 'shaded' : mode });
  S.trace = trace;
  const I = !!opt.interactive;
  const objs = doc.objects.filter(o => !o.hidden && lib.get(o.type));

  let scene = '', over = '', labels = '', insets = '';
  if (mode === '3d' && RNBX.render3d) {
    const r3 = RNBX.render3d.scene(doc, trace, S, { interactive: I, time, motion: opt.motion });
    scene = r3.markup;
    labels = r3.labels;
    R.last3d = r3.camera;
  } else {
    let under = '', conns = '', comps = '';
    for (const o of objs) {
      const def = lib.get(o.type);
      if (def.annotation || def.special) continue;
      if (def.connection) conns += R.connection(o, doc, S, trace, I);
      else if (def.under) under += R.object2D(o, S, I);
      else comps += R.object2D(o, S, I);
      if (!def.connection) labels += R.label(o, doc, o.x + (o.label ? o.label.dx : 0), o.y + (o.label ? o.label.dy : 0), I);
    }
    scene = under + conns + RNBX.beams.draw2D(trace, doc, { time, motion: opt.motion }) + comps;
  }
  // annotations always in page space
  let annUnder = '';
  for (const o of objs) {
    const def = lib.get(o.type);
    if (def.special === 'inset' && mode === '3d' && !o.props.show3d) continue;
    if (def.special === 'inset') { insets += I ? `<g data-id="${o.id}">${R.inset(o, doc)}</g>` : R.inset(o, doc); continue; }
    if (!def.annotation) continue;
    if (def.under) annUnder += R.object2D(o, S, I); else over += R.object2D(o, S, I);
  }

  const inner =
    `<defs>${RNBX.renderDefs()}<clipPath id="rbx-page"><rect x="0" y="0" width="${n(W)}" height="${n(H)}"/></clipPath></defs>` +
    RNBX.renderBackground(doc.page, opt.transparent) +
    `<g clip-path="url(#rbx-page)"><g id="rbx-content">${annUnder}${scene}${over}${labels}</g>${insets}</g>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${n(W)}mm" height="${n(H)}mm" viewBox="0 0 ${n(W)} ${n(H)}">` +
    `<title>${U.esc(doc.meta.title || 'RNBeamX figure')}</title><desc>Created with RNBeamX ${RNBX.VERSION}</desc>${inner}</svg>`;
  return { svg, inner, trace, doc };
};

/* abbreviations actually used in the figure (for keys and captions) */
RNBX.abbreviations = doc => {
  const seen = new Map();
  for (const o of doc.objects) {
    const def = lib.get(o.type);
    if (!def || def.annotation || def.connection || !o.label || !o.label.show || !o.label.text) continue;
    const key = RNBX.text.fill(o.label.text, o.props).replace(/[\d′'″]+$/, '').trim();
    if (!key || key.length > 7 || /\s/.test(key)) continue;
    let name = (o.kindName || def.name).replace(/\s*\(.*?\)\s*/g, ' ').trim();
    name = name.replace(/^[A-Z][a-z]/, m => m.toLowerCase());
    if (!seen.has(key)) seen.set(key, name);
  }
  return [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]));
};
})();
