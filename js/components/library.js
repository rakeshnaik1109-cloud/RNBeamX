/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/library.js
   Component registry and the drawing toolkit every component
   module uses.

   A component definition:
   {
     type, name, abbr, category, keywords,
     params:   [{key,label,type,unit,min,max,step,options,show(p)}],
     defaults: {…props},
     bbox(p)            → [x0,y0,x1,y1] in local mm (selection box)
     draw(p, S, obj)    → SVG markup in local mm, optical axis +x
     optics(p, obj)     → surfaces for the tracer (local coords)
     source(p, obj)     → rays emitted (local coords)
     solid(p, bh)       → parts for the 3D renderer
     snap               → how to orient when dropped on a beam
     labelPos           → default label offset
     variants           → extra palette entries with preset props
   }
   Local frame: beams travel along +x, rotation is applied by the
   renderer, so drawings never have to think about orientation.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX = window.RNBX || {};
const U = RNBX.util;

const registry = {}, order = [];
const lib = RNBX.lib = {
  CATEGORIES: [
    'Sources', 'Mirrors & splitters', 'Lenses & objectives', 'Polarisation',
    'Filters & dispersion', 'Modulators & nonlinear', 'Fibre optics', 'Detectors',
    'Samples & mechanics', 'Electronics', 'Connections', 'Annotations', 'Graphical abstract',
  ],
  register(def) {
    def.params = def.params || [];
    def.defaults = def.defaults || {};
    if (!registry[def.type]) order.push(def.type);
    registry[def.type] = def;
  },
  get: type => registry[type],
  all: () => order.map(t => registry[t]),
  /* palette entries = definitions + their preset variants */
  entries() {
    const out = [];
    order.forEach(t => {
      const d = registry[t];
      if (d.hidden) return;
      if (!d.hideBase) out.push({ type: t, name: d.name, category: d.category, props: null, def: d, keywords: d.keywords || '' });
      (d.variants || []).forEach(v => out.push({ type: t, name: v.name, category: v.category || d.category, props: v.props, abbr: v.abbr, def: d, keywords: (v.keywords || '') + ' ' + (d.keywords || '') }));
    });
    return out;
  },
};

/* ---------- style context ----------
   Translates the document style into what draw() needs. In
   "schematic" mode fills are flat, print-safe tints in the
   tradition of textbook line art; in "shaded" mode the same
   shapes use gradients (metal, glass, anodised bodies). */
const FLAT = {
  glass: '#d4e6f5', mirror: '#a3acb7', mirrorFace: '#4f5965', metal: '#cfd3d9', dark: '#3d434b',
  body: '#ffffff', black: '#26292e', crystal: '#f6cde0', gold: '#e8c96f', wph: '#dccbf2',
  wpq: '#c7e6ee', sample: '#efe6d2', anod: '#3a3f46', screen: '#f7f7f4', polar: '#b7bec7',
  nd: '#8c9198', rainbow: '#c9b46a',
};
lib.style = (doc, overrides = {}) => {
  const st = doc.style;
  const mode = overrides.mode || (st.mode === '3d' ? 'shaded' : st.mode);
  const shaded = mode === 'shaded';
  return {
    mode, shaded, doc,
    lw: U.pt2mm(st.lineWidthPt || 0.5),
    ink: st.outline || '#1d1f23',
    font: st.font, fs: U.pt2mm(st.fontSizePt || 7),
    fill: name => shaded ? `url(#rbx-${name})` : (FLAT[name] || name),
    flat: name => FLAT[name] || name,
  };
};

/* ---------- drawing helpers (all coordinates in mm) ---------- */
const n = v => U.round(v, 3);
const H = lib.H = {
  n,
  stroke: (S, k = 1, color) => `stroke="${color || S.ink}" stroke-width="${n(S.lw * k)}" stroke-linejoin="round" stroke-linecap="round"`,
  rect: (S, x, y, w, h, fill, extra = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}" ${H.stroke(S)} ${extra}/>`,
  path: (S, d, fill, extra = '') => `<path d="${d}" fill="${fill}" ${H.stroke(S)} ${extra}/>`,
  line: (S, x1, y1, x2, y2, extra = '', k = 1, color) => `<line x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}" ${H.stroke(S, k, color)} ${extra}/>`,
  circle: (S, cx, cy, r, fill, extra = '') => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}" ${H.stroke(S)} ${extra}/>`,
  text: (S, x, y, str, opt = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${U.esc(S.font)}" font-size="${n(opt.size || S.fs * 0.8)}" fill="${opt.color || S.ink}" text-anchor="${opt.anchor || 'middle'}" dominant-baseline="central" ${opt.bold ? 'font-weight="700"' : ''} ${opt.extra || ''}>${U.esc(str)}</text>`,
  /* a highlight streak that sells the "shaded" look on bodies */
  sheen: (S, x, y, w, h, rx = 0) => S.shaded ? `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${n(rx)}" fill="url(#rbx-sheen)" stroke="none" pointer-events="none"/>` : '',
  /* box edges as absorbing surfaces */
  boxAbsorb: (x0, y0, x1, y1, kind = 'absorb') => [
    { kind, a: [x0, y0], b: [x1, y0] }, { kind, a: [x1, y0], b: [x1, y1] },
    { kind, a: [x1, y1], b: [x0, y1] }, { kind, a: [x0, y1], b: [x0, y0] },
  ],
  /* biconvex / concave lens outline, centred on x = 0 */
  lensPath(kind, r, t) {
    const e = Math.max(0.12, t * 0.08);       // half edge thickness
    const h = t / 2;                           // half centre thickness
    // a quadratic Bézier peaks halfway between its ends and control,
    // so the control sits at 2·peak − edge
    switch (kind) {
      case 'planoconvex': {
        const x0 = -h, xe = -h + 2 * e, cx = 2 * h - xe;
        return `M ${n(x0)} ${n(-r)} L ${n(xe)} ${n(-r)} Q ${n(cx)} 0 ${n(xe)} ${n(r)} L ${n(x0)} ${n(r)} Z`;
      }
      case 'biconcave': {
        const E = h + 0.35, m = 0.18, cx = 2 * m - E;
        return `M ${n(-E)} ${n(-r)} L ${n(E)} ${n(-r)} Q ${n(cx)} 0 ${n(E)} ${n(r)} L ${n(-E)} ${n(r)} Q ${n(-cx)} 0 ${n(-E)} ${n(-r)} Z`;
      }
      case 'planoconcave': {
        const E = h + 0.35, m = -E + 0.45, cx = 2 * m - E;
        return `M ${n(-E)} ${n(-r)} L ${n(E)} ${n(-r)} Q ${n(cx)} 0 ${n(E)} ${n(r)} L ${n(-E)} ${n(r)} Z`;
      }
      default: {
        const cx = 2 * h - e;
        return `M ${n(-e)} ${n(-r)} L ${n(e)} ${n(-r)} Q ${n(cx)} 0 ${n(e)} ${n(r)} L ${n(-e)} ${n(r)} Q ${n(-cx)} 0 ${n(-e)} ${n(-r)} Z`;
      }
    }
  },
};

/* ---------- shared parameter groups ---------- */
lib.P = {
  diameter: (def = 8) => ({ key: 'd', label: 'Clear aperture', type: 'number', unit: 'mm', min: 1, max: 60, step: 0.5, def }),
  thick: (def = 1.2) => ({ key: 't', label: 'Thickness', type: 'number', unit: 'mm', min: 0.2, max: 20, step: 0.1, def }),
  material: () => ({ key: 'mat', label: 'Material', type: 'select', options: Object.keys(RNBX.optics.MATERIALS).map(k => [k, RNBX.optics.MATERIALS[k].name]) }),
};
})();
