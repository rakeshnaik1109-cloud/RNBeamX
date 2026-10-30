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

/* Part colours. "Body colour" recolours housings and mounts (the body, dark,
   anodised and black fills); "Optic colour" recolours the optical element
   itself (glass, mirror coatings, crystals, wave plates, polarisers, gold).
   Shaded mode gets matching gradients. A part drawn without any of those
   fills is recoloured as a whole, keeping its light and dark shading. */
const TINTED = { body: 0, dark: 1, anod: 1, black: 1, metal: 2 };
const OPTIC = { glass: 1, mirror: 1, mirrorFace: 1, crystal: 1, wph: 1, wpq: 1, polar: 1, gold: 1, nd: 1, rainbow: 1, sensor: 1, wafer: 1 };
R.tintStyle = (S, obj) => {
  const ids = {};
  const T = Object.assign({}, S, { tintDefs: '' });
  const pick = name => (obj.tint && name in TINTED) ? (TINTED[name] === 2 ? U.lighten(obj.tint, 0.35) : TINTED[name] ? U.darken(obj.tint, 0.12) : obj.tint) : (obj.optic && name in OPTIC) ? obj.optic : null;
  T.flat = name => pick(name) || S.flat(name);
  T.fill = name => {
    const b = pick(name);
    if (!b) return S.fill(name);
    if (!S.shaded) return b;
    const id = `rbx-tint-${obj.id}-${name}`, a = name in OPTIC && name !== 'mirror' && name !== 'gold' ? 0.88 : 1;
    if (!ids[id]) { ids[id] = 1; T.tintDefs += `<linearGradient id="${id}" x1="0" y1="0" x2="${name in OPTIC ? 1 : 0}" y2="1"><stop offset="0" stop-color="${U.lighten(b, 0.35)}" stop-opacity="${a}"/><stop offset="0.5" stop-color="${b}" stop-opacity="${a}"/><stop offset="1" stop-color="${U.darken(b, 0.25)}" stop-opacity="${a}"/></linearGradient>`; }
    return `url(#${id})`;
  };
  return T;
};
/* whole-part recolour: grey levels of the drawing mapped onto the colour (black stays black, white turns pale) */
R.colorizeFilter = (id, c) => {
  const rgb = U.hexToRgb ? U.hexToRgb(c) : [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const row = v => { const k = 2 * v / 255; return `${n(0.2126 * k)} ${n(0.7152 * k)} ${n(0.0722 * k)} 0 0`; };
  return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${row(rgb[0])} ${row(rgb[1])} ${row(rgb[2])} 0 0 0 1 0"/></filter>`;
};

R.object2D = (obj, S, interactive) => {
  const def = lib.get(obj.type);
  if (!def || !def.draw) return '';
  let inner = '';
  const draw = St => { try { return RNBX.isVertical(obj) ? lib.topView(obj, St) : def.draw(obj.props, St, obj); } catch (e) { console.error(obj.type, e); return ''; } };
  if (obj.tint || obj.optic) {
    const T = R.tintStyle(S, obj);
    inner = draw(T);
    let defs = T.tintDefs;
    // a body colour that changed nothing (no housing fills in this drawing): recolour the whole part
    if (obj.tint && !obj.optic && !defs && inner === draw(S)) {
      const fid = `rbx-cz-${obj.id}`;
      defs += R.colorizeFilter(fid, obj.tint);
      inner = `<g filter="url(#${fid})">${inner}</g>`;
    }
    if (defs) inner = `<defs>${defs}</defs>` + inner;
  } else inner = draw(S);
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
  const op = R.connOpacity(obj, doc);
  if (op <= 0.001) return '';
  return `<g ${interactive ? `data-id="${obj.id}"` : ''}${op < 1 ? ` opacity="${n(op)}"` : ''}>${body}${hit}</g>`;
};
/* a fibre or wire is only as visible as the fainter of its two ends (so it appears with them in a build-up) */
R.connOpacity = (obj, doc) => {
  const o = x => x && x.opacity != null ? x.opacity : 1;
  return Math.min(o(obj), o(RNBX.getObjIn(doc, obj.props.from)), o(RNBX.getObjIn(doc, obj.props.to)));
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
  S.time = time; S.live = I;   // panels that follow the animation (sensorgram)
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
