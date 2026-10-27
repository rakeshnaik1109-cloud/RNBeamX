/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/dialogs.js
   Export dialog, template gallery, journal check, caption
   helper and help / shortcuts.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom, el = D.el;
const Dl = RNBX.dialogs = {};

/* ---------- export ---------- */
const FORMATS = [
  { id: 'svg', name: 'SVG', desc: 'Vector · editable text · Illustrator / Inkscape' },
  { id: 'pdf', name: 'PDF', desc: 'Vector · for LaTeX and journal submission' },
  { id: 'tiff', name: 'TIFF', desc: 'Raster with DPI tags · many journals' },
  { id: 'png', name: 'PNG', desc: 'Raster with DPI · slides, web' },
  { id: 'jpeg', name: 'JPEG', desc: 'Raster · small files' },
  { id: 'video', name: 'Video (MP4 / WebM)', desc: 'Animation · talks, social media' },
  { id: 'project', name: 'Project (.rnbx.json)', desc: 'Save to edit later or share' },
];
Dl.exporter = (initial = 'svg') => {
  let fmt = initial;
  const opts = { dpi: 600, transparent: S.doc.page.background === 'transparent', container: 'mp4', width: 1920 };
  const list = el('div', { class: 'fmt-list' });
  const right = el('div');
  const go = el('button', { class: 'btn primary', type: 'button', text: 'Export' });
  const prog = el('div', { class: 'progress', hidden: true }, el('i'));
  const renderList = () => {
    list.innerHTML = '';
    FORMATS.forEach(f => list.append(el('button', { class: 'fmt' + (f.id === fmt ? ' active' : ''), type: 'button', onclick: () => { fmt = f.id; renderList(); renderRight(); } },
      el('div', {}, el('b', { text: f.name }), el('small', { text: f.desc })))));
  };
  const renderRight = () => {
    right.innerHTML = '';
    const W = S.doc.page.width, H = S.doc.page.height;
    const prev = el('div', { class: 'exp-preview', html: RNBX.render.build(S.doc, { time: RNBX.anim.isLive(S.doc) ? S.time : null, transparent: opts.transparent }).svg });
    right.append(prev);
    const info = el('div', { class: 'note' });
    if (['png', 'tiff', 'jpeg'].includes(fmt)) {
      const dpiSel = el('select', { onchange: () => { opts.dpi = +dpiSel.value; upd(); } }, [300, 600, 900, 1200].map(d => el('option', { value: d, text: d + ' dpi' + (d === 300 ? ' (colour minimum)' : d === 600 ? ' (recommended)' : d === 1200 ? ' (line art)' : '') })));
      dpiSel.value = opts.dpi;
      const upd = () => { const w = Math.round(W / 25.4 * opts.dpi), h = Math.round(H / 25.4 * opts.dpi); info.textContent = `${w} × ${h} px at ${opts.dpi} dpi · prints at ${U.fmt(W, 1)} × ${U.fmt(H, 1)} mm`; };
      upd();
      right.append(el('div', { class: 'field' }, el('label', {}, 'Resolution'), dpiSel), info);
    }
    if (['svg', 'png', 'tiff', 'pdf'].includes(fmt)) {
      const cb = el('input', { type: 'checkbox', checked: opts.transparent, onchange: () => { opts.transparent = cb.checked; renderRight(); } });
      right.append(el('label', { class: 'check' }, cb, 'Transparent background'));
    }
    if (fmt === 'svg') right.append(el('div', { class: 'note', text: 'Text stays as live text in Arial/Helvetica, so editors and journals can restyle it. Open in Illustrator, Inkscape or Affinity for final touches.' }));
    if (fmt === 'pdf') right.append(el('div', { class: 'note', text: 'Vector PDF. Greek letters are set in the standard Symbol font so they display correctly everywhere.' }));
    if (fmt === 'video') {
      const types = RNBX.exporter.videoTypes();
      const hasMp4 = types.some(t => t[1] === 'mp4'), hasWebm = types.some(t => t[1] === 'webm');
      if (!hasMp4) opts.container = 'webm';
      const cont = el('select', { onchange: () => { opts.container = cont.value; } },
        el('option', { value: 'mp4', text: 'MP4 (H.264) · PowerPoint, Keynote' + (hasMp4 ? '' : ' (not supported here)'), disabled: !hasMp4 }),
        el('option', { value: 'webm', text: 'WebM · web, Google Slides' + (hasWebm ? '' : ' (not supported here)'), disabled: !hasWebm }));
      cont.value = opts.container;
      const res = el('select', { onchange: () => { opts.width = +res.value; } }, [[1280, '1280 px (720p)'], [1920, '1920 px (1080p)'], [2560, '2560 px (1440p)'], [3840, '3840 px (4K)']].map(r => el('option', { value: r[0], text: r[1] })));
      res.value = opts.width;
      const an = S.doc.animation;
      const live = RNBX.anim.isLive(S.doc);
      right.append(el('div', { class: 'grid2' }, el('div', { class: 'field' }, el('label', {}, 'Format'), cont), el('div', { class: 'field' }, el('label', {}, 'Width'), res)),
        el('div', { class: 'note', text: live ? `${U.fmt(an.duration, 1)} s at ${an.fps} fps. Recording runs in real time, so keep this tab visible.` : 'Nothing is animated yet. Add keyframes, or tick “Light flow” in the timeline, to make the video move.' }), prog);
    }
    if (fmt === 'project') right.append(el('div', { class: 'note', text: 'A small JSON file with everything needed to continue editing: components, labels, styles, 3D camera and animation.' }));
    if (fmt !== 'video' && fmt !== 'project') right.append(el('div', { class: 'row', style: { marginTop: '6px' } },
      el('button', { class: 'btn small', type: 'button', text: 'Copy as PNG', onclick: () => RNBX.exporter.copyPng(300).then(() => RNBX.toast('Copied: paste into slides or documents'), e => RNBX.toast('Clipboard not available: ' + e.message, 'error')) }),
      el('button', { class: 'btn small', type: 'button', text: 'Copy SVG code', onclick: () => RNBX.exporter.copySvg().then(() => RNBX.toast('SVG copied')) })));
  };
  renderList(); renderRight();
  const m = D.modal({ title: 'Export figure', sub: `${U.fmt(S.doc.page.width, 1)} × ${U.fmt(S.doc.page.height, 1)} mm`, wide: true, body: el('div', { class: 'exp-grid' }, list, right), foot: [el('button', { class: 'btn', type: 'button', text: 'Close', onclick: () => m.close() }), go] });
  go.onclick = async () => {
    const X = RNBX.exporter;
    go.disabled = true;
    try {
      if (fmt === 'svg') X.svg(opts);
      else if (fmt === 'pdf') await X.pdf(opts);
      else if (fmt === 'png') await X.png(opts);
      else if (fmt === 'tiff') await X.tiff(opts);
      else if (fmt === 'jpeg') await X.jpeg(opts);
      else if (fmt === 'project') RNBX.project.save();
      else if (fmt === 'video') {
        prog.hidden = false;
        go.textContent = 'Recording…';
        await X.video(opts, f => { prog.firstChild.style.width = (f * 100).toFixed(1) + '%'; });
      }
      if (fmt !== 'project') RNBX.toast('Exported ' + FORMATS.find(f => f.id === fmt).name);
      U.track('export-' + fmt);
    } catch (e) { console.error(e); RNBX.toast(e.message || 'Export failed', 'error'); }
    go.disabled = false; go.textContent = 'Export';
  };
};

/* ---------- templates ---------- */
Dl.templates = () => {
  const grid = el('div', { class: 'tpl-grid' });
  RNBX.templates.list.forEach(t => {
    const doc = RNBX.normalizeDocument(t.build());
    const card = el('button', { class: 'tpl', type: 'button' },
      el('div', { class: 'tp', html: RNBX.render.build(doc).svg, style: { background: RNBX.isDarkPage(doc.page) ? '#0b1020' : '#fff' } }),
      el('div', { class: 'tt' }, el('b', { text: t.name }), el('small', { text: t.desc })));
    card.onclick = () => {
      if (S.doc.objects.length && !confirm('Replace the current figure with this template? (You can undo with Ctrl+Z.)')) return;
      RNBX.history.checkpoint();
      RNBX.setDocument(RNBX.normalizeDocument(t.build()), true);
      m.close();
      RNBX.toast(t.name + ' loaded. Drag anything; the beams follow.');
      U.track('template-' + t.id);
    };
    grid.append(card);
  });
  const m = D.modal({ title: 'Templates', sub: 'Complete, physically traced setups to start from', wide: true, body: grid });
};

/* ---------- journal check ---------- */
Dl.checks = () => {
  const doc = S.doc, st = doc.style, out = [];
  const tr = RNBX.canvas.trace || RNBX.trace(doc);
  const add = (lvl, text) => out.push({ lvl, text });
  const W = doc.page.width;
  const cols = RNBX.PRESETS.filter(p => p.group === 'Journal figure').map(p => p.w);
  if (cols.some(w => Math.abs(w - W) < 0.6)) add('ok', `Width ${U.fmt(W, 1)} mm matches a standard journal column width.`);
  else if (RNBX.PRESETS.some(p => p.group !== 'Journal figure' && p.w && Math.abs(p.w - W) < 0.6)) add('ok', `Width ${U.fmt(W, 1)} mm matches a graphical-abstract or presentation preset.`);
  else add('warn', `Width ${U.fmt(W, 1)} mm is not a standard column width. Design at final size (e.g. 89 or 183 mm) so fonts and lines print at their true sizes.`);
  const sizes = [st.fontSizePt];
  doc.objects.forEach(o => { if (o.label && o.label.size) sizes.push(o.label.size); if (o.type === 'text' || o.type === 'panel' || o.type === 'scalebar' || o.type === 'legend') sizes.push(o.props.size); });
  const minPt = Math.min(...sizes), maxPt = Math.max(...sizes);
  if (minPt < 5) add('bad', `Smallest text is ${U.fmt(minPt, 1)} pt. Most journals require at least 5–6 pt at final size.`);
  else add('ok', `Text sizes ${U.fmt(minPt, 1)}–${U.fmt(maxPt, 1)} pt (minimum 5 pt).`);
  if (st.lineWidthPt < 0.25) add('bad', `Line weight ${st.lineWidthPt} pt is below 0.25 pt and may vanish in print.`);
  else add('ok', `Line weight ${st.lineWidthPt} pt prints reliably.`);
  if (!/Arial|Helvetica/i.test(st.font)) add('warn', 'Many journals (e.g. Nature, Optica, ACS) ask for Arial or Helvetica in figures.');
  else add('ok', 'Sans-serif font (Arial / Helvetica).');
  const open = tr.segments.filter(s => s.kind === 'beam' && s.end === 'open' && s.P > s.P0 * 0.02);
  if (open.length) add('warn', `${open.length} beam${open.length > 1 ? 's leave' : ' leaves'} the figure without ending on a component. Reviewers often ask where stray beams go: add a beam dump or detector, or crop deliberately.`);
  else add('ok', 'Every beam ends on a component.');
  const dets = doc.objects.filter(o => lib.get(o.type) && lib.get(o.type).category === 'Detectors' && !o.hidden);
  const dark = dets.filter(o => !tr.hits[o.id]);
  if (dark.length) add('warn', `${dark.length} detector${dark.length > 1 ? 's receive' : ' receives'} no light: ${dark.map(o => o.label ? RNBX.text.fill(o.label.text, o.props) : lib.get(o.type).name).join(', ')}.`);
  else if (dets.length) add('ok', 'All detectors receive light.');
  const unl = doc.objects.filter(o => { const d = lib.get(o.type); return d && !d.annotation && !d.connection && o.label && (!o.label.show || !o.label.text) && d.autoLabel !== false && o.type !== 'beamdump'; });
  if (unl.length) add('warn', `${unl.length} component${unl.length > 1 ? 's have' : ' has'} no label. Label every optic or define it in the caption.`);
  else add('ok', 'All optical components are labelled.');
  const ls = [...new Set(tr.segments.map(s => s.lambda))];
  const hasRed = ls.some(l => l >= 600 && l < 750), hasGreen = ls.some(l => l >= 495 && l < 570);
  if (st.colorMode === 'physical' && hasRed && hasGreen) add('warn', 'Red and green beams appear together, which ~8% of male readers cannot tell apart. Label the wavelengths or switch beams to the colour-blind-safe palette.');
  else add('ok', 'Beam colours are distinguishable for colour-blind readers.');
  const outside = doc.objects.filter(o => { const d = lib.get(o.type); if (!d || d.connection) return false; const b = lib.worldBox(o); return b[2] < 0 || b[0] > W || b[3] < 0 || b[1] > doc.page.height; });
  if (outside.length) add('warn', `${outside.length} object${outside.length > 1 ? 's are' : ' is'} outside the page and will not be exported.`);
  if (doc.objects.some(o => o.type === 'image')) add('warn', 'The figure contains raster images. Make sure they are at least 300 dpi at their printed size.');
  const abbr = RNBX.abbreviations(doc);
  if (abbr.length) add('ok', `${abbr.length} abbreviations used. Use the caption helper to define them.`);
  return out;
};
Dl.check = () => {
  const items = Dl.checks();
  const ul = el('ul', { class: 'check-list' }, items.map(i => el('li', {}, el('i', { class: i.lvl, text: i.lvl === 'ok' ? '✓' : i.lvl === 'warn' ? '!' : '×' }), el('span', { text: i.text }))));
  D.modal({ title: 'Journal check', sub: 'What a reviewer or figure editor will look at', body: ul, foot: [el('button', { class: 'btn', type: 'button', text: 'Caption helper', onclick: () => Dl.caption() })] });
};

/* ---------- caption helper ---------- */
Dl.captionText = () => {
  const doc = S.doc, tr = RNBX.canvas.trace || RNBX.trace(doc);
  const srcs = doc.objects.filter(o => lib.get(o.type) && lib.get(o.type).source && !o.hidden);
  const ls = [...new Set(tr.segments.map(s => U.round(s.lambda, 1)))].sort((a, b) => a - b);
  const abbr = RNBX.abbreviations(doc);
  let s = 'Schematic of the experimental setup.';
  if (srcs.length) s += ` Light source${srcs.length > 1 ? 's' : ''}: ${srcs.map(o => { const d = lib.get(o.type); return d.type === 'lamp' ? `broadband source (${o.props.lmin}–${o.props.lmax} nm)` : `${(o.kindName || d.name).replace(/\s*\(.*?\)/, '').toLowerCase()} at ${o.props.lambda} nm`; }).join('; ')}.`;
  if (ls.length > 1) s += ` Beam colours indicate wavelength (${ls.slice(0, 6).map(l => l + ' nm').join(', ')}${ls.length > 6 ? ', …' : ''}).`;
  if (doc.style.polarization) s += ' Double arrows and dots mark p- (in-plane) and s- (out-of-plane) polarisation.';
  if (abbr.length) s += ' ' + abbr.map(a => `${a[0]}, ${a[1]}`).join('; ') + '.';
  return s;
};
Dl.caption = () => {
  const txt = Dl.captionText();
  const box = el('div', { class: 'caption-box', text: txt });
  D.modal({
    title: 'Caption helper', sub: 'A starting point for your figure caption, built from the figure itself', body: [box, el('div', { class: 'note', style: { marginTop: '10px' }, text: 'Abbreviations are taken from the component labels. Rename a label and this text follows.' })],
    foot: [
      el('button', { class: 'btn', type: 'button', text: 'Insert abbreviation key into figure', onclick: () => { const o = RNBX.createObject('legend', 4, S.doc.page.height - 18); RNBX.addObject(o); } }),
      el('button', { class: 'btn primary', type: 'button', text: 'Copy caption', onclick: () => navigator.clipboard.writeText(txt).then(() => RNBX.toast('Caption copied')) }),
    ],
  });
};

/* ---------- help ---------- */
const KEYS = [
  ['Drop optic on a beam', 'snaps & orients'], ['Move', 'drag · arrows (Shift = 5 mm)'], ['Rotate', 'R / Shift+R (±15°), Alt for 1°'], ['Flip / turn the other way', 'F'],
  ['Orient to beam', 'O'], ['Free move (no snapping)', 'hold Alt'], ['Constrain to axis', 'hold Shift'], ['Duplicate', 'Ctrl+D'],
  ['Copy / paste', 'Ctrl+C / Ctrl+V'], ['Delete', 'Del / Backspace'], ['Select all', 'Ctrl+A'], ['Undo / redo', 'Ctrl+Z / Ctrl+Shift+Z'],
  ['Pan', 'Space+drag · middle mouse · trackpad'], ['Zoom', 'wheel · Ctrl+wheel · + / −'], ['Fit page', '0'], ['Styles', '1 schematic · 2 shaded · 3 3D'],
  ['Grid', 'G'], ['Labels on / off', 'L'], ['Auto-arrange labels', 'Shift+L'], ['Polarisation marks', 'P'], ['Timeline', 'T'],
  ['Play / pause', 'K'], ['Keyframe selection', 'I'], ['Save project', 'Ctrl+S'], ['Export', 'Ctrl+E'],
  ['Reset everything (undoable)', '↺ toolbar button'], ['Bring to front / back', 'Ctrl+] / Ctrl+['], ['Edit label', 'double-click'], ['Cancel tool', 'Esc'], ['This help', '?'],
];
Dl.help = () => {
  const grid = el('div', { class: 'help-grid' }, KEYS.map(k => el('div', {}, el('span', { text: k[0] }), el('kbd', { text: k[1] }))));
  D.modal({
    title: 'RNBeamX ' + RNBX.VERSION, sub: 'Optical setup designer · © 2026 Rakesh Naik and Sachin Kumar Srivastava. All rights reserved.', wide: true,
    body: [
      el('div', { class: 'note', html: '<b>How it works.</b> Lasers emit beams that are traced through every component: mirrors reflect, splitters split, lenses focus (paraxial, with focal length ÷ figure scale), wave plates and PBS cubes act on the polarisation (Jones calculus), prisms refract with Sellmeier dispersion, gratings diffract by the grating equation, dichroics and filters act on wavelength, and samples can emit Raman / fluorescence light. Fold mirrors and periscopes take beams off the table; Gaussian beams, Fresnel ghosts, cavities, ring resonators and interference (with piezo-driven fringes) are modelled too. Click any detector to see the power, phase and beam size that reach it.' }),
      el('div', { class: 'note', html: `<b>Companion app.</b> <a href="${RNBX.links.spectrax}" target="_blank" rel="noopener noreferrer">RNSpectraX</a> processes and plots your spectra; press <b>→ RNBeamX</b> under its Export menu to bring a plot into this figure as panel b. · <a href="${RNBX.links.home}" target="_blank" rel="noopener noreferrer">Rakesh Naik — website</a> · <a href="${RNBX.links.guide}" target="_blank" rel="noopener">Illustrated guide</a> · <a href="${RNBX.links.manual}" target="_blank" rel="noopener noreferrer">User manual</a> · <a href="${RNBX.links.code}" target="_blank" rel="noopener noreferrer">Source</a>` }),
      el('div', { class: 'note', html: '<b>Text markup</b> in labels: <code>λ/2</code>, <code>\\lambda</code>, <code>x_2</code>, <code>x^{2+}</code>, <code>*italic*</code>, <code>**bold**</code>, and live values such as <code>f = {f} mm</code>.' }),
      grid,
    ],
  });
};
})();
