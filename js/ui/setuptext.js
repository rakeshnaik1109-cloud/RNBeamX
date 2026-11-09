/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/setuptext.js
   Setup from text. Type the beam path as a chain,
     HeNe → Pol 0° → L1 f=50 → L2 f=200 → M → SLM → L3 f=200 → SF → L4 f=200 → CCD
   and RNBeamX places the parts, orients them to the beam and traces it.

   Spacing (along the beam, so folds do not change it):
     lens f₁ → lens f₂            f₁ + f₂     (telescope, 4f)
     lens f → focal-plane part     f           (pinhole, iris, SLM, camera, sample …)
     anything else                 a default step
   Mirrors, plates and filters between two of these share that span.
   A distance on its own ("→ 150 mm →") fixes the gap there.
   Mirrors fold the path: up by default, then back (a U); "M down",
   "M left" … choose. A further line starting with a splitter's label,
   e.g. "BS1 down → M → PD", follows its reflected beam.

   Layout is trace-driven: every part is placed on the traced beam, and
   the chain continues along the beam that really leaves it, so gratings,
   cubes and splitters behave as they do in the figure.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, V = U.v, lib = RNBX.lib, S = RNBX.state;
const ST = RNBX.setupText = {};

/* names people write → part type (and preset properties) */
const ALIAS = {
  laser: ['laser'], 'laser diode': ['laser'], hene: ['laser', { lambda: 633 }], 'he-ne': ['laser', { lambda: 633 }], 'nd:yag': ['laser', { lambda: 1064 }],
  lamp: ['lamp'], 'white light': ['lamp'], wl: ['lamp'], led: ['led'],
  l: ['lens'], lens: ['lens'], obj: ['objective'], objective: ['objective'], ep: ['eyepiece'], eyepiece: ['eyepiece'],
  m: ['mirror'], mirror: ['mirror'], fm: ['mirror'], cm: ['cmirror'], 'concave mirror': ['cmirror'], oap: ['oap'],
  bs: ['bsplate'], 'beam splitter': ['bsplate'], beamsplitter: ['bsplate'], cube: ['bscube'], bsc: ['bscube'], 'bs cube': ['bscube'], pbs: ['pbs'],
  dm: ['dichroic'], dichroic: ['dichroic'],
  hwp: ['hwp'], 'λ/2': ['hwp'], 'half-wave plate': ['hwp'], 'half wave plate': ['hwp'], qwp: ['qwp'], 'λ/4': ['qwp'], 'quarter-wave plate': ['qwp'], 'quarter wave plate': ['qwp'],
  p: ['polarizer'], pol: ['polarizer'], polarizer: ['polarizer'], polariser: ['polarizer'], lp: ['polarizer'], analyser: ['polarizer'], analyzer: ['polarizer'],
  iso: ['isolator'], isolator: ['isolator'], fr: ['faraday'], faraday: ['faraday'],
  i: ['iris'], iris: ['iris'], ph: ['iris', { r: 0.25 }], pinhole: ['iris', { r: 0.25 }], sf: ['iris', { r: 0.35 }], mask: ['iris', { r: 0.35 }], 'spatial filter': ['spatialfilter'],
  g: ['grating'], grating: ['grating'], slm: ['slm'], f: ['filter'], filter: ['filter'], nd: ['filter', { mode: 'nd' }], w: ['window'], window: ['window'],
  d: ['diffuser'], diffuser: ['diffuser'], sh: ['shutter'], shutter: ['shutter'], aom: ['aom'], eom: ['eom'], bbo: ['crystal'], shg: ['crystal'], crystal: ['crystal'],
  cam: ['camera'], camera: ['camera'], ccd: ['camera'], cmos: ['camera'], scmos: ['camera'], emccd: ['camera'],
  pd: ['pd'], photodiode: ['pd'], detector: ['pd'], det: ['pd'], apd: ['pd'], pm: ['powermeter'], 'power meter': ['powermeter'], powermeter: ['powermeter'],
  spec: ['spectrometer'], spectrometer: ['spectrometer'], pmt: ['pmt'], scr: ['screen'], screen: ['screen'], card: ['screen'],
  bd: ['beamdump'], dump: ['beamdump'], 'beam dump': ['beamdump'], block: ['beamdump'], bp: ['profiler'], profiler: ['profiler'], 'beam profiler': ['profiler'],
  s: ['sample'], sample: ['sample'], fc: ['coupler'], coupler: ['coupler'], fiber: ['coupler'], fibre: ['coupler'], collimator: ['coupler'],
};
const MIRRORISH = new Set(['mirror', 'cmirror', 'oap', 'slm', 'kmount', 'galvo']);
const SPLITTERS = new Set(['bsplate', 'dichroic', 'bscube', 'pbs', 'cagecube', 'filtercube']);
const CUBES = new Set(['bscube', 'pbs', 'cagecube', 'filtercube']);
const PLANE = new Set(['iris', 'slm', 'camera', 'screen', 'pd', 'profiler', 'sample', 'coupler', 'spectrometer', 'pmt', 'powermeter', 'beamdump', 'spatialfilter', 'grating', 'diffuser', 'crystal']);
const POWER = new Set(['lens', 'objective', 'eyepiece', 'cameralens', 'cmirror', 'oap']);
const DIRS = { up: -90, '↑': -90, north: -90, down: 90, '↓': 90, south: 90, left: 180, '←': 180, west: 180, right: 0, '→': 0, east: 0 };
const D0 = 22, MARGIN = 8;   // default step and page margin (figure mm)

const resolve = word => {
  const w = word.toLowerCase();
  if (ALIAS[w]) return { type: ALIAS[w][0], props: ALIAS[w][1] || {}, label: null };
  // "L1", "M2", "BS1", "L2P": the alias with a tag; the whole word becomes the label
  const m = /^([a-zλ/]+?)(\d+[a-z′']*|['′]+)$/i.exec(word);
  if (m && ALIAS[m[1].toLowerCase()]) { const a = ALIAS[m[1].toLowerCase()]; return { type: a[0], props: a[1] || {}, label: word }; }
  const defs = lib.all().filter(d => !d.annotation && !d.connection);
  const byAbbr = defs.find(d => d.abbr && d.abbr.toLowerCase() === w);
  if (byAbbr) return { type: byAbbr.type, props: {}, label: null };
  const byName = defs.find(d => d.type === w || (d.name || '').toLowerCase() === w) || defs.find(d => (d.name || '').toLowerCase().split(/[^a-z]+/).includes(w)) || defs.find(d => (' ' + (d.keywords || '') + ' ').toLowerCase().includes(' ' + w + ' '));
  return byName ? { type: byName.type, props: {}, label: null } : null;
};

/* one element: "L1 f=100", "Laser 633 nm", "QWP 45°", "M down", 'CCD "Camera"' */
const parseElement = (raw, warn) => {
  let txt = raw.trim(), label = null;
  const q = /["“](.+?)["”]/.exec(txt); if (q) { label = q[1]; txt = txt.replace(q[0], ' '); }
  const words = txt.split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  // longest leading phrase that names a part ("beam dump", "half wave plate")
  let r = null, used = 0;
  for (let k = Math.min(3, words.length); k >= 1 && !r; k--) { const ph = words.slice(0, k).join(' '); if (/=/.test(ph)) continue; const x = resolve(ph); if (x) { r = x; used = k; } }
  if (!r) { warn(`“${raw.trim()}”: no part of that name — skipped.`); return null; }
  const el = { type: r.type, props: Object.assign({}, r.props), label: label || r.label, dir: null, reflect: false, raw: raw.trim() };
  const def = lib.get(el.type), keys = new Set((def.params || []).map(p => p.key).concat(Object.keys(def.defaults || {})));
  const set = (k, v) => { if (keys.has(k)) { el.props[k] = v; return true; } return false; };
  const rest = words.slice(used).join(' ').replace(/(\d)\s+(nm|µm|um|°|deg)\b/g, '$1$2').split(/[\s,]+/).filter(Boolean);
  for (const t of rest) {
    let m;
    const tl = t.toLowerCase();
    if (DIRS[tl] != null) { el.dir = DIRS[tl]; continue; }
    if (/^(r|refl|reflect|reflected)$/.test(tl)) { el.reflect = true; continue; }
    if ((m = /^(-?[\d.]+)(nm|µm|um)$/i.exec(t))) { const nm = parseFloat(m[1]) * (/nm/i.test(m[2]) ? 1 : 1000); set('lambda', nm) || set('center', nm) || set('edge', nm) || set('lam0', nm); continue; }
    if ((m = /^(-?[\d.]+)(°|deg)$/i.exec(t))) { set('angle', parseFloat(m[1])) || set('polAngle', parseFloat(m[1])); continue; }
    if ((m = /^([a-zλ0-9]+)\s*=\s*(.+)$/i.exec(t))) {
      let k = m[1], v = m[2].replace(/(mm|nm|°)$/i, ''); const num = parseFloat(v);
      if (/^(λ|lambda|wl|wavelength)$/i.test(k)) k = keys.has('lambda') ? 'lambda' : keys.has('center') ? 'center' : 'edge';
      if (/^(label|name|tag)$/i.test(k)) { el.label = m[2]; continue; }
      if (k === 'f' && el.type === 'objective' && !keys.has('f')) k = 'fd';
      if (k === 'D' || /^dia(meter)?$/i.test(k)) k = 'd';
      if (!set(k, isFinite(num) && /^-?[\d.]+$/.test(v) ? num : v)) warn(`${el.label || def.abbr || def.name}: “${k}” is not a setting of ${def.name} — ignored.`);
      continue;
    }
    if (/^-?[\d.]+$/.test(t) && keys.has('f')) { set('f', parseFloat(t)); continue; }
    warn(`${el.label || def.abbr || def.name}: “${t}” not understood — ignored.`);
  }
  return el;
};

/* text → { chains: [ { from: label|null, dir, items: [element | {gap}] } ], warnings } */
ST.parse = text => {
  const warnings = [], warn = w => warnings.push(w), chains = [];
  const lines = String(text || '').split(/\n|;/).map(l => l.replace(/#.*$/, '').trim()).filter(Boolean);
  lines.forEach((line, li) => {
    const toks = line.split(/\s*(?:→|->|⟶|➔|=>|—>|>)\s*/).map(t => t.trim()).filter(Boolean);
    const ch = { from: null, dir: null, items: [] };
    toks.forEach((t, ti) => {
      let m;
      if ((m = /^\(?\s*([\d.]+)\s*(mm|cm|m)\s*\)?$/i.exec(t))) { ch.items.push({ gap: parseFloat(m[1]) * ({ mm: 1, cm: 10, m: 1000 })[m[2].toLowerCase()] }); return; }
      if (li > 0 && ti === 0) {
        // a branch: starts at a splitter named earlier
        const w = t.split(/\s+/), lab = w[0];
        const known = chains.some(c => c.items.some(e => e.label && e.label.toLowerCase() === lab.toLowerCase()));
        if (known) { ch.from = lab; const d = w.slice(1).map(x => DIRS[x.toLowerCase()]).find(x => x != null); ch.dir = d == null ? null : d; return; }
      }
      const e = parseElement(t, warn); if (e) ch.items.push(e);
    });
    if (ch.items.some(e => !e.gap)) chains.push(ch);
  });
  return { chains, warnings };
};

/* gaps (figure mm) before each element of a chain */
const gapsFor = (items, scale, startsAtSource) => {
  const els = [], explicit = [];
  let pend = null;
  items.forEach(it => { if (it.gap != null) pend = (pend || 0) + it.gap; else { els.push(it); explicit.push(pend); pend = null; } });
  const kind = e => POWER.has(e.type) && isFinite(+e.f) ? 'power' : PLANE.has(e.type) ? 'plane' : lib.get(e.type).category === 'Sources' ? 'src' : 'passive';
  els.forEach(e => { e.f = e.props.f != null ? +e.props.f : e.props.fd != null ? +e.props.fd : (POWER.has(e.type) ? +(lib.get(e.type).defaults || {}).f || null : null); });
  const gaps = els.map(() => null), anchors = [];
  els.forEach((e, i) => { if (i === 0 || kind(e) !== 'passive') anchors.push(i); });
  if (anchors[anchors.length - 1] !== els.length - 1) anchors.push(els.length - 1);
  for (let a = 0; a < anchors.length - 1; a++) {
    const i = anchors[a], j = anchors[a + 1], steps = j - i;
    const fi = kind(els[i]) === 'power' ? els[i].f : 0, fj = kind(els[j]) === 'power' ? els[j].f : 0;
    let G = (Math.abs(fi || 0) + Math.abs(fj || 0)) / scale;
    if (kind(els[i]) === 'src' || kind(els[i]) === 'passive') G = 0;   // nothing focuses from a source
    const fixed = [];
    let fixedSum = 0, free = 0;
    for (let k = i + 1; k <= j; k++) { if (explicit[k] != null) { fixed[k] = explicit[k] / scale; fixedSum += fixed[k]; } else free++; }
    const each = G > 0 ? Math.max(0, G - fixedSum) / Math.max(1, free) : D0;
    for (let k = i + 1; k <= j; k++) gaps[k] = fixed[k] != null ? fixed[k] : (G > 0 && each < 4 ? Math.max(each, 0.5) : each);
    if (G > 0 && free === 0 && Math.abs(fixedSum - G) > 1e-6) els[j].focusNote = true;
  }
  return { els, gaps };
};

const sideTurn = (a, want) => { let t = U.normDeg(want - a); if (t > 180) t -= 360; return t; };
const turnFor = (a, el, lastH) => {
  if (el.dir != null) { const t = sideTurn(a, el.dir); if (Math.abs(Math.abs(t) - 90) < 1) return t; }
  const horiz = Math.abs(Math.cos(U.rad(a))) > 0.5;
  if (horiz) return sideTurn(a, -90);
  return sideTurn(a, lastH === 0 ? 180 : 0);
};
const rotFor = (el, a, turn) => {
  const def = lib.get(el.type);
  if (CUBES.has(el.type)) return U.normDeg(a + (turn < 0 ? 0 : 90));
  if (MIRRORISH.has(el.type) || SPLITTERS.has(el.type)) return U.normDeg(a + turn / 2 + 90);
  if (def.snap === 'face') return U.normDeg(a + 180);
  if (def.snap === 'grating') return U.normDeg(a + 150);
  return U.normDeg(a);
};
const angOf = s => U.deg(Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]));
const angDiff = (x, y) => Math.abs(sideTurn(x, y));

/* beams leaving a part (traced) */
const outgoing = (tr, o, aIn) => {
  const bb = lib.worldBox(o), pad = 1.6;
  return tr.segments.filter(s => s.kind === 'beam' && !s.vertical && s.len > 0.8 && !s.ghost &&
    s.a[0] >= bb[0] - pad && s.a[0] <= bb[2] + pad && s.a[1] >= bb[1] - pad && s.a[1] <= bb[3] + pad && angDiff(angOf(s), aIn + 180) > 5)
    .map(s => ({ s, ang: angOf(s), P: s.P || 0 }));
};

/* place one chain on the document, starting at p heading a */
const placeChain = (doc, els, gaps, start, warn, ctx) => {
  let p = start.p, a = start.a, lastH = Math.abs(Math.cos(U.rad(a))) > 0.5 ? (Math.cos(U.rad(a)) > 0 ? 0 : 180) : ctx.lastH;
  let stopped = null;
  for (let i = start.skipFirst ? 1 : 0; i < els.length; i++) {
    const el = els[i], def = lib.get(el.type), g = i === 0 ? 0 : gaps[i];
    if (stopped && !ctx.warnedStop) { warn(`The beam ends at ${stopped}; ${el.label || def.abbr || def.name} and the parts after it were placed on the same line without light.`); ctx.warnedStop = true; }
    const pos = V.add(p, V.mul([Math.cos(U.rad(a)), Math.sin(U.rad(a))], g));
    const o = RNBX.createObject(el.type, U.round(pos[0], 2), U.round(pos[1], 2));
    o.props = Object.assign(o.props, el.props);
    const reflectHere = MIRRORISH.has(el.type) || (SPLITTERS.has(el.type) && el.reflect);
    const turn = MIRRORISH.has(el.type) || SPLITTERS.has(el.type) ? turnFor(a, el, lastH) : 0;
    o.rot = rotFor(el, a, turn);
    if (el.label != null) { o.label = Object.assign({}, o.label, { text: el.label, show: true }); }
    doc.objects.push(o);
    el.obj = o; el.aIn = a; el.turn = turn;
    if (el.focusNote) warn(`${el.label || def.abbr}: the distances you gave differ from the focal spacing (f₁ + f₂).`);
    if (stopped) continue;
    const tr = RNBX.trace(doc), outs = outgoing(tr, o, a);
    let want = reflectHere ? a + turn : a;
    let pick = null;
    if (def.snap === 'grating') {
      // skip the zero order (every wavelength leaves at the same angle); follow the centre of the brightest diffracted fan
      const groups = {}; outs.forEach(x => { const k = Math.round(x.ang); (groups[k] = groups[k] || []).push(x); });
      const zero = Object.values(groups).sort((g1, g2) => new Set(g2.map(x => x.s.lambda)).size - new Set(g1.map(x => x.s.lambda)).size)[0];
      const nz = outs.filter(x => !(zero && zero.length > 1 && zero.includes(x)) && x.P > 0);
      if (nz.length) {
        const top = nz.slice().sort((x, y) => y.P - x.P)[0], fan = nz.filter(x => angDiff(x.ang, top.ang) < 35);
        let sx = 0, sy = 0; fan.forEach(x => { sx += x.P * Math.cos(U.rad(x.ang)); sy += x.P * Math.sin(U.rad(x.ang)); });
        want = U.deg(Math.atan2(sy, sx));
        const c = [o.x, o.y];
        pick = { s: { a: c }, ang: want, P: 1 };
      } else want = a + 180;
    }
    if (!pick) pick = outs.filter(x => x.P > 0).sort((x, y) => angDiff(x.ang, want) - angDiff(y.ang, want) || y.P - x.P)[0];
    if (!pick || angDiff(pick.ang, want) > 60 && !(def.snap === 'grating')) {
      if (i < els.length - 1) stopped = el.label || def.abbr || def.name;
      p = [o.x, o.y]; a = want; continue;
    }
    // continue on the beam that leaves the part, measured from the part's centre
    const c = [o.x, o.y], back = Math.max(0, V.dot(V.sub(c, pick.s.a), [Math.cos(U.rad(pick.ang)), Math.sin(U.rad(pick.ang))]));
    p = V.add(pick.s.a, V.mul([Math.cos(U.rad(pick.ang)), Math.sin(U.rad(pick.ang))], -back));
    a = U.round(pick.ang, 3);
    if (Math.abs(Math.cos(U.rad(a))) > 0.5) lastH = Math.cos(U.rad(a)) > 0 ? 0 : 180;
  }
  ctx.lastH = lastH;
  return els;
};

/* lay everything out at one figure scale */
const layoutAt = (parsed, base, scale) => {
  const doc = JSON.parse(JSON.stringify(base));
  doc.objects = []; doc.style.scale = scale;
  // lay out on a large working page (the tracer stops at the page edge), then move onto the real one
  const page = doc.page; doc.page = Object.assign({}, page, { width: 6000, height: 6000 });
  const O0 = [3000, 3000];
  const warnings = [], warn = w => { if (!warnings.includes(w)) warnings.push(w); };
  const ctx = { lastH: 0 }, placed = {};
  parsed.chains.forEach((ch, ci) => {
    if (ch.from) {
      // branch: the reflected beam of a splitter placed earlier
      const sp = Object.values(placed).flat().find(e => e.label && e.label.toLowerCase() === ch.from.toLowerCase());
      if (!sp || !sp.obj) { warn(`Branch “${ch.from}”: no such part above.`); return; }
      if (!SPLITTERS.has(sp.type) && !MIRRORISH.has(sp.type)) warn(`Branch “${ch.from}”: ${lib.get(sp.type).name} has no second output; following its beam anyway.`);
      let t = ch.dir != null ? sideTurn(sp.aIn, ch.dir) : (sp.turn || -90);
      if (Math.abs(Math.abs(t) - 90) > 1) t = -90;
      if (SPLITTERS.has(sp.type)) sp.obj.rot = rotFor(sp, sp.aIn, t);
      const tr = RNBX.trace(doc), outs = outgoing(tr, sp.obj, sp.aIn);
      const want = sp.aIn + t, pick = outs.sort((x, y) => angDiff(x.ang, want) - angDiff(y.ang, want))[0];
      if (!pick || angDiff(pick.ang, want) > 30) { warn(`Branch “${ch.from}”: no light leaves on that side.`); }
      const ang = pick ? pick.ang : want;
      const { els, gaps } = gapsFor([sp].concat(ch.items), scale);
      placed[ci] = placeChain(doc, els, gaps, { p: [sp.obj.x, sp.obj.y], a: ang, skipFirst: true }, warn, ctx);
      return;
    }
    const { els, gaps } = gapsFor(ch.items, scale);
    if (!els.length) return;
    if (ci === 0 && lib.get(els[0].type).category !== 'Sources') warn('The first part is not a light source, so there is no beam to follow. Start with Laser, HeNe, Lamp or LED.');
    placed[ci] = placeChain(doc, els, gaps, { p: O0, a: 0 }, warn, ctx);
  });
  // move onto the page
  doc.page = page;
  if (!doc.objects.length) return { doc, warnings, fits: true, fill: 0 };
  let bb = [Infinity, Infinity, -Infinity, -Infinity];
  doc.objects.forEach(o => { const b = lib.worldBox(o); bb = [Math.min(bb[0], b[0]), Math.min(bb[1], b[1]), Math.max(bb[2], b[2]), Math.max(bb[3], b[3])]; });
  const W = doc.page.width - 2 * MARGIN, H = doc.page.height - 2 * MARGIN - 6;   // room for labels underneath
  const dx = MARGIN + (W - (bb[2] - bb[0])) / 2 - bb[0], dy = MARGIN + (H - (bb[3] - bb[1])) / 2 - bb[1];
  doc.objects.forEach(o => { o.x = U.round(o.x + dx, 2); o.y = U.round(o.y + dy, 2); });
  const fits = bb[2] - bb[0] <= W && bb[3] - bb[1] <= H;
  return { doc, warnings, fits, fill: Math.max((bb[2] - bb[0]) / W, (bb[3] - bb[1]) / H) };
};

const SCALES = [1, 2, 2.5, 4, 5, 8, 10, 15, 20, 25, 40, 50, 75, 100, 150, 200, 250, 400, 500, 1000];
/* text → { doc, warnings, scale } — the largest drawing (smallest scale) that fits the page */
ST.build = (text, opt = {}) => {
  const base = opt.base || S.doc;
  const parsed = ST.parse(text);
  const fixedScale = opt.scale || null;
  let best = null;
  const order = fixedScale ? [fixedScale] : SCALES;
  for (const sc of order) { const r = layoutAt(parsed, base, sc); r.scale = sc; best = r; if (r.fits) break; }
  if (!best.fits && !fixedScale) best.warnings.push('The setup does not fit the page even at 1:1000: add mirrors to fold it, or make the page larger.');
  if (RNBX.labels && best.doc.objects.length) { try { RNBX.labels.arrange2D(best.doc); } catch (e) { /* labels stay at their defaults */ } }
  return { doc: best.doc, warnings: parsed.warnings.concat(best.warnings), scale: best.scale, count: best.doc.objects.length };
};

ST.EXAMPLES = [
  ['4f filtering with an SLM', 'HeNe → Pol 0° → L1 f=50 → L2 f=200 → M → SLM → L3 f=200 → M → SF → L4 f=200 → CCD'],
  ['Beam expander and camera', 'Laser 532 nm → L1 f=25 → L2 f=100 → I → CAM'],
  ['Polarisation analysis', 'Laser 633 nm → Pol 0° → QWP 45° → Pol 90° → PD'],
  ['Branch at a beam splitter', 'Laser 633 nm → BS1 → L1 f=100 → CCD\nBS1 down → M → PD'],
  ['Grating spectrometer', 'Lamp → L1 f=50 → PH → L2 f=100 → Grating G=300 → L3 f=100 → CCD'],
];

/* ---------- the dialog ---------- */
ST.open = () => {
  const D = RNBX.dom, el = D.el;
  const ta = el('textarea', { class: 'st-text', rows: 5, spellcheck: 'false', placeholder: 'Laser 633 nm → L1 f=100 → L2 f=200 → M → I → CCD' });
  ta.value = U.store.get('rnbx_setuptext') || ST.EXAMPLES[0][1];
  const ex = el('select', { onchange: () => { if (ex.value !== '') { ta.value = ST.EXAMPLES[+ex.value][1]; ex.value = ''; upd(); } } },
    el('option', { value: '', text: 'Examples…' }), ST.EXAMPLES.map((e, i) => el('option', { value: i, text: e[0] })));
  const prev = el('div', { class: 'exp-preview st-preview' }), notes = el('div', { class: 'note' });
  let last = null, timer = null;
  const upd = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        last = ST.build(ta.value);
        prev.innerHTML = last.count ? RNBX.render.build(last.doc).svg : '';
        notes.innerHTML = '';
        notes.append(el('div', { text: `${last.count} part${last.count === 1 ? '' : 's'} · figure scale 1:${U.fmt(last.scale, 1)} (focal spacings to scale along the beam)` }));
        last.warnings.forEach(w => notes.append(el('div', { class: 'st-warn', text: '⚠ ' + w })));
      } catch (e) { console.error(e); notes.textContent = 'Could not build: ' + e.message; }
    }, 250);
  };
  ta.addEventListener('input', upd);
  const help = el('div', { class: 'note', html: 'Separate parts with <b>→</b> (or <b>-&gt;</b>). Settings follow the name: <code>f=100</code> (mm), <code>633 nm</code>, <code>45°</code>, <code>R=0.3</code>, or any setting name. Tags like <b>L1</b>, <b>M2</b>, <b>BS1</b> become the labels; <code>"text"</code> sets a label. Lenses are spaced by their focal lengths along the beam; a distance on its own (<code>→ 150 mm →</code>) fixes a gap. <b>M</b> folds the path (up, then back); add <code>up</code>, <code>down</code>, <code>left</code> or <code>right</code> to choose. A new line starting with a splitter’s tag follows its reflected beam: <code>BS1 down → M → PD</code>.' });
  const go = el('button', { class: 'btn primary', type: 'button', text: 'Build figure' });
  const replace = el('input', { type: 'checkbox', checked: true });
  const m = D.modal({ title: 'Setup from text', sub: 'Type the beam path; RNBeamX places, orients and traces it', wide: true,
    body: el('div', { class: 'st-grid' }, el('div', {}, el('div', { class: 'row' }, ex), ta, help, el('label', { class: 'check' }, replace, 'Replace the current figure (otherwise the parts are added to it)')), el('div', {}, prev, notes)),
    foot: [el('button', { class: 'btn', type: 'button', text: 'Cancel', onclick: () => m.close() }), go] });
  go.onclick = () => {
    const r = last && last.doc ? last : ST.build(ta.value);
    if (!r.count) { RNBX.toast('Nothing to build yet', 'error'); return; }
    U.store.set('rnbx_setuptext', ta.value);
    RNBX.history.checkpoint();
    if (replace.checked) {
      const d = JSON.parse(JSON.stringify(S.doc)); d.objects = r.doc.objects; d.style.scale = r.scale;
      RNBX.setDocument(RNBX.normalizeDocument ? RNBX.normalizeDocument(d) : d, true);
    } else {
      r.doc.objects.forEach(o => S.doc.objects.push(o));
      RNBX.changed();
    }
    m.close();
    if (RNBX.canvas && RNBX.canvas.fit) RNBX.canvas.fit();
    RNBX.toast(`${r.count} parts placed and traced. Drag anything; the beams follow.`);
    U.track && U.track('setup-from-text');
  };
  upd();
  setTimeout(() => ta.focus(), 30);
};
})();
