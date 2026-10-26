/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/inspector.js
   Properties panel. With a selection it edits the object (its
   optical parameters, label, transform, animation); with no
   selection it edits the figure (page, journal preset, style,
   beams, 3D camera). Controls are generated from each
   component's parameter list, so new components need no UI code.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, S = RNBX.state, D = RNBX.dom, el = D.el;
const Ins = RNBX.inspector = {};
let syncs = [];

/* ---------- generic controls ---------- */
function control(param, get, set, ctx = {}) {
  const id = 'f_' + Math.random().toString(36).slice(2, 8);
  const wrap = el('div', { class: 'field' });
  const lab = el('label', { for: id }, param.label);
  if (param.hint) lab.append(el('span', { class: 'hint', text: '· ' + param.hint }));
  let input, sync;
  const val = () => get(param.key);
  switch (param.type) {
    case 'bool': {
      input = el('input', { type: 'checkbox', id, onchange: () => set(param.key, input.checked, true) });
      sync = () => { input.checked = !!val(); };
      const row = el('label', { class: 'check', for: id }, input, param.label);
      sync(); syncs.push(() => document.activeElement !== input && sync());
      return row;
    }
    case 'select': {
      const opts = typeof param.options === 'function' ? param.options() : param.options;
      input = el('select', { id, onchange: () => { const o = opts.find(x => String(x[0]) === input.value); set(param.key, o ? o[0] : input.value, true); } },
        opts.map(o => el('option', { value: o[0], text: o[1] })));
      sync = () => { input.value = String(val()); };
      break;
    }
    case 'range': {
      const num = el('input', { type: 'number', min: param.min, max: param.max, step: param.step });
      input = el('input', { type: 'range', id, min: param.min, max: param.max, step: param.step });
      input.oninput = () => { num.value = input.value; set(param.key, parseFloat(input.value)); };
      num.onchange = () => { const v = U.clamp(parseFloat(num.value), param.min, param.max); if (isFinite(v)) { input.value = v; set(param.key, v); } };
      sync = () => { const v = val(); input.value = v; if (document.activeElement !== num) num.value = U.round(v, 3); };
      sync(); syncs.push(() => document.activeElement !== input && sync());
      wrap.append(lab, el('div', { class: 'range-row' }, input, num));
      return wrap;
    }
    case 'color': {
      const auto = param.allowEmpty ? el('label', { class: 'check', style: { margin: 0, fontSize: '11.5px' } }) : null;
      const cb = auto ? el('input', { type: 'checkbox' }) : null;
      input = el('input', { type: 'color', id });
      const txt = el('input', { type: 'text', spellcheck: 'false' });
      input.oninput = () => { txt.value = input.value; if (cb) cb.checked = false; set(param.key, input.value); };
      txt.onchange = () => { if (/^#[0-9a-f]{3,8}$/i.test(txt.value.trim())) { input.value = txt.value.trim(); if (cb) cb.checked = false; set(param.key, txt.value.trim()); } else if (!txt.value.trim() && param.allowEmpty) set(param.key, ''); };
      if (cb) { cb.onchange = () => set(param.key, cb.checked ? '' : input.value, true); auto.append(cb, 'Auto'); }
      sync = () => { const v = val(); if (v) { input.value = v.length === 4 ? '#' + v.slice(1).split('').map(c => c + c).join('') : v.slice(0, 7); txt.value = v; } else txt.value = ''; if (cb) cb.checked = !v; };
      sync(); syncs.push(() => document.activeElement !== txt && sync());
      wrap.append(lab, el('div', { class: 'color-row' }, input, txt, auto || el('span')));
      return wrap;
    }
    case 'textarea': {
      input = el('textarea', { id, rows: 2, spellcheck: 'false', oninput: () => set(param.key, input.value) });
      sync = () => { input.value = val() == null ? '' : val(); };
      break;
    }
    case 'text': {
      input = el('input', { type: 'text', id, spellcheck: 'false', placeholder: param.placeholder || '', oninput: () => set(param.key, input.value) });
      sync = () => { input.value = val() == null ? '' : val(); };
      break;
    }
    case 'image': {
      const btn = el('button', { class: 'btn small', type: 'button', text: 'Choose image…' });
      btn.onclick = () => RNBX.project.pickFile('image/*', f => RNBX.project.readImage(f).then(({ href, aspect }) => {
        ctx.obj && RNBX.history.checkpoint();
        if (ctx.obj) { ctx.obj.props.href = href; ctx.obj.props.aspect = aspect; ctx.obj.props.h = U.round(ctx.obj.props.w / aspect, 2); RNBX.changed(); Ins.build(); }
      }));
      wrap.append(lab, btn);
      return wrap;
    }
    default: { // number / wavelength
      input = el('input', { type: 'number', id, min: param.min, max: param.max, step: param.step || 'any' });
      input.oninput = () => { const v = parseFloat(input.value); if (isFinite(v)) set(param.key, v); };
      input.onchange = () => { let v = parseFloat(input.value); if (!isFinite(v)) return sync(); if (param.min != null) v = Math.max(param.min, v); if (param.max != null) v = Math.min(param.max, v); input.value = v; set(param.key, v); };
      sync = () => { const v = val(); input.value = v == null ? '' : U.round(v, 4); if (sw) sw.style.background = U.wavelengthColor(v); if (band) band.textContent = U.bandName(v); };
      let sw = null, band = null;
      const uw = el('div', { class: 'unit-wrap' }, input, param.unit ? el('span', { class: 'unit', text: param.unit }) : null);
      if (param.type === 'wavelength') {
        sw = el('span', { class: 'swatch' }); band = el('span', { class: 'hint' });
        lab.append(sw, band);
      }
      sync(); syncs.push(() => document.activeElement !== input && sync());
      wrap.append(lab, uw);
      return wrap;
    }
  }
  sync(); syncs.push(() => document.activeElement !== input && sync());
  wrap.append(lab, input);
  return wrap;
}
Ins.control = control;

const sec = (title, ...kids) => el('div', { class: 'sec' }, el('h4', {}, title), ...kids);
const secActs = (title, acts, ...kids) => el('div', { class: 'sec' }, el('h4', {}, title, el('span', { class: 'acts' }, acts)), ...kids);

/* object property setters with undo coalescing and auto-key */
const objSetter = objs => (key, v, rebuild) => {
  RNBX.history.checkpoint('p:' + objs.map(o => o.id).join(',') + ':' + key);
  objs.forEach(o => { o.props[key] = v; });
  RNBX.anim.touch(objs.map(o => o.id));
  RNBX.changed();
  if (rebuild) setTimeout(Ins.build, 0);
};
const fieldSetter = (objs, path) => (key, v, rebuild) => {
  RNBX.history.checkpoint('f:' + objs.map(o => o.id).join(',') + ':' + path + key);
  objs.forEach(o => { const t = path ? (o[path] = o[path] || {}) : o; t[key] = v; });
  RNBX.anim.touch(objs.map(o => o.id));
  RNBX.changed();
  if (rebuild) setTimeout(Ins.build, 0);
};

/* ---------- readouts (physics feedback) ---------- */
function readout(obj) {
  const tr = RNBX.canvas.trace;
  if (!tr) return null;
  const def = lib.get(obj.type);
  const h = tr.hits[obj.id];
  const fmtP = P => P >= 1000 ? U.fmt(P / 1000, 3) + ' W' : P >= 1 ? U.fmt(P, 3) + ' mW' : P >= 1e-3 ? U.fmt(P * 1000, 3) + ' µW' : U.fmt(P * 1e6, 3) + ' nW';
  if (def.source) {
    const segs = tr.segments.filter(s => s.src === obj.id);
    const ls = [...new Set(segs.map(s => s.lambda))];
    return el('div', { class: 'readout', html: `Emits <b>${U.esc(ls.map(l => U.fmt(l, 1)).join(', ') || '—')} nm</b> · ${segs.length} traced segments` });
  }
  if (obj.type === 'fiber') {
    const fl = tr.fiberLight[obj.id];
    if (!fl) return el('div', { class: 'readout', text: 'No light reaches the input coupler yet.' });
    return el('div', { class: 'readout', html: 'Carries ' + Object.keys(fl).map(l => `<b>${U.fmt(Number(l), 1)} nm</b> (${fmtP(fl[l])})`).join(', ') });
  }
  if (h) return el('div', { class: 'readout', html: `Receives <b>${fmtP(h.P)}</b><br>` + Object.keys(h.lambdas).map(l => `${U.fmt(Number(l), 1)} nm: ${fmtP(h.lambdas[l])}`).join(' · ') });
  if (def.category === 'Detectors') return el('div', { class: 'readout', text: 'No light reaches this detector.' });
  return null;
}

/* ---------- object inspector ---------- */
function objectPanel(obj) {
  const def = lib.get(obj.type);
  const root = [];
  const mode = S.doc.style.mode === 'schematic' ? 'schematic' : 'shaded';
  root.push(el('div', { class: 'insp-title' },
    el('div', { class: 'thumb', html: D.thumb(obj.type, obj.props, mode) }),
    el('div', {}, el('b', { text: obj.kindName || def.name }), el('small', { text: def.category + (obj.locked ? ' · locked' : '') }))));
  const ro = readout(obj);
  const params = def.params.filter(p => !p.show || p.show(obj.props));
  const set = objSetter([obj]);
  const body = [];
  if (ro) { body.push(ro); syncs.push(() => { const n = readout(obj); if (n) ro.innerHTML = n.innerHTML; }); }
  if (def.hint) body.push(el('div', { class: 'note', text: def.hint }));
  params.forEach(p => body.push(control(p, k => obj.props[k], set, { obj })));
  if (body.length) root.push(sec(def.connection ? 'Connection' : 'Parameters', ...body));

  if (obj.label) {
    const lset = fieldSetter([obj], 'label');
    const tokens = Object.keys(obj.props).filter(k => typeof obj.props[k] === 'number').slice(0, 6);
    root.push(secActs('Label', [D.iconBtn('fit', 'Reset label position', () => { const lp = def.labelPos || [0, 7]; lset('dx', lp[0]); lset('dy', lp[1]); })],
      control({ key: 'text', label: 'Text', type: 'textarea', hint: tokens.length ? 'tokens: ' + tokens.map(t => '{' + t + '}').join(' ') : '' }, k => obj.label[k], lset),
      el('div', { class: 'grid2' },
        control({ key: 'show', label: 'Show label', type: 'bool' }, k => obj.label[k], lset),
        control({ key: 'bold', label: 'Bold', type: 'bool' }, k => obj.label[k], lset)),
      el('div', { class: 'grid2' },
        control({ key: 'size', label: 'Size', type: 'number', unit: 'pt', min: 3, max: 48, step: 0.5 }, k => obj.label[k] || S.doc.style.fontSizePt, lset),
        control({ key: 'color', label: 'Colour', type: 'color', allowEmpty: true }, k => obj.label[k] || '', lset))));
  }

  if (!def.connection) {
    const tset = fieldSetter([obj], '');
    root.push(secActs('Position', [
      D.iconBtn('rotate', 'Rotate −15° (Shift+R)', () => Ins.rotateBy(-15)),
      D.iconBtn('flip', 'Flip (F)', () => Ins.flip()),
      def.snap ? D.iconBtn('wand', 'Orient to beam (O)', () => RNBX.canvas.orientToBeam()) : null,
    ].filter(Boolean),
    el('div', { class: 'grid2' },
      control({ key: 'x', label: 'x', type: 'number', unit: 'mm', step: 0.1 }, k => obj[k], tset),
      control({ key: 'y', label: 'y', type: 'number', unit: 'mm', step: 0.1 }, k => obj[k], tset)),
    el('div', { class: 'grid2' },
      control({ key: 'rot', label: 'Rotation', type: 'number', unit: '°', step: 1 }, k => obj[k] || 0, tset),
      control({ key: 'scale', label: 'Scale', type: 'number', unit: '×', min: 0.05, max: 20, step: 0.05 }, k => obj[k] || 1, tset)),
    control({ key: 'opacity', label: 'Opacity', type: 'range', min: 0, max: 1, step: 0.01 }, k => obj[k] == null ? 1 : obj[k], tset)));
  }
  const keys = (S.doc.animation.tracks[obj.id] || []).length;
  root.push(sec('Animation',
    el('div', { class: 'note', text: keys ? `${keys} keyframe${keys === 1 ? '' : 's'}. Edits at the playhead update the key there.` : 'Move the playhead, set this object up, then add a keyframe. Beams follow in every frame.' }),
    el('div', { class: 'row' },
      el('button', { class: 'btn small', type: 'button', html: D.icon('key', 14) + ' Add keyframe at ' + U.fmt(S.time, 2) + ' s', onclick: () => { RNBX.anim.addKey([obj.id]); RNBX.timeline.show(); Ins.build(); } }),
      keys ? el('button', { class: 'btn small ghost danger', type: 'button', text: 'Clear', onclick: () => { RNBX.anim.clearTrack(obj.id); Ins.build(); } }) : null)));

  root.push(el('div', { class: 'sec' }, el('div', { class: 'row', style: { marginBottom: '12px' } },
    el('button', { class: 'btn small', type: 'button', html: D.icon('copy', 14) + ' Duplicate', onclick: () => RNBX.project.duplicate() }),
    el('button', { class: 'btn small', type: 'button', html: D.icon(obj.locked ? 'unlock' : 'lock', 14) + (obj.locked ? ' Unlock' : ' Lock'), onclick: () => { fieldSetter([obj], '')('locked', !obj.locked, true); } }),
    el('button', { class: 'btn small danger', type: 'button', html: D.icon('trash', 14) + ' Delete', onclick: () => RNBX.removeObjects([obj.id]) }))));
  return root;
}

/* ---------- multi-selection ---------- */
function multiPanel(objs) {
  const root = [el('div', { class: 'insp-title' }, el('div', {}, el('b', { text: objs.length + ' objects selected' }), el('small', { text: 'Shift-click to add or remove' })))];
  const A = RNBX.arrange;
  root.push(sec('Align & distribute', el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '2px', marginBottom: '10px' } },
    D.iconBtn('alignL', 'Align left', () => A.align('left')), D.iconBtn('alignC', 'Align centres horizontally', () => A.align('cx')), D.iconBtn('alignR', 'Align right', () => A.align('right')),
    D.iconBtn('alignT', 'Align top', () => A.align('top')), D.iconBtn('alignM', 'Align centres vertically', () => A.align('cy')), D.iconBtn('alignB', 'Align bottom', () => A.align('bottom')),
    D.iconBtn('distH', 'Distribute horizontally', () => A.distribute('x')), D.iconBtn('distV', 'Distribute vertically', () => A.distribute('y')))));
  const types = [...new Set(objs.map(o => o.type))];
  if (types.length === 1) {
    const def = lib.get(types[0]);
    const set = objSetter(objs);
    const params = def.params.filter(p => (!p.show || p.show(objs[0].props)) && p.type !== 'image');
    if (params.length) root.push(sec('Shared parameters (' + def.name + ')', ...params.map(p => control(p, k => objs[0].props[k], set))));
  }
  root.push(el('div', { class: 'sec' }, el('div', { class: 'row', style: { marginBottom: '12px' } },
    el('button', { class: 'btn small', type: 'button', html: D.icon('key', 14) + ' Keyframe', onclick: () => { RNBX.anim.addKey(objs.map(o => o.id)); RNBX.timeline.show(); } }),
    el('button', { class: 'btn small', type: 'button', html: D.icon('copy', 14) + ' Duplicate', onclick: () => RNBX.project.duplicate() }),
    el('button', { class: 'btn small danger', type: 'button', html: D.icon('trash', 14) + ' Delete', onclick: () => RNBX.removeObjects(objs.map(o => o.id)) }))));
  return root;
}

/* ---------- figure (document) inspector ---------- */
function docPanel() {
  const doc = S.doc, root = [];
  const dset = (target, rebuild) => (key, v, rb) => {
    RNBX.history.checkpoint('d:' + target + key);
    doc[target][key] = v;
    if (target === 'style' && key === 'mode') RNBX.emit('styleMode', v);
    RNBX.changed();
    if (rebuild || rb) setTimeout(Ins.build, 0);
  };
  root.push(el('div', { class: 'insp-title' }, el('div', {}, el('b', { text: 'Figure' }), el('small', { text: `${U.fmt(doc.page.width, 1)} × ${U.fmt(doc.page.height, 1)} mm · ${doc.objects.length} objects` }))));
  root.push(sec('Document', control({ key: 'title', label: 'Title (used for file names)', type: 'text' }, k => doc.meta[k], (k, v) => { doc.meta[k] = v; RNBX.changed(); })));

  // page & presets
  const groups = {};
  RNBX.PRESETS.forEach(p => { (groups[p.group] = groups[p.group] || []).push(p); });
  const presetSel = el('select', {}, Object.keys(groups).map(g => el('optgroup', { label: g }, groups[g].map(p => el('option', { value: p.id, text: p.name + (p.w ? ` — ${U.fmt(p.w, 1)} mm` : '') })))));
  presetSel.value = doc.page.preset || 'custom';
  presetSel.onchange = () => {
    const p = RNBX.PRESETS.find(x => x.id === presetSel.value);
    RNBX.history.checkpoint();
    doc.page.preset = p.id;
    if (p.w) { RNBX.arrange.resizePage(p.w, p.h); }
    if (p.group === 'Graphical abstract' && doc.page.background === 'white') { /* keep the user's choice; hint only */ }
    RNBX.changed(); RNBX.canvas.fit(); Ins.build();
  };
  const pset = (k, v) => { RNBX.history.checkpoint('page' + k); doc.page.preset = 'custom'; RNBX.arrange.resizePage(k === 'width' ? v : doc.page.width, k === 'height' ? v : doc.page.height); RNBX.changed(); };
  root.push(sec('Page & journal preset',
    el('div', { class: 'field' }, el('label', {}, 'Preset'), presetSel),
    el('div', { class: 'grid2' },
      control({ key: 'width', label: 'Width', type: 'number', unit: 'mm', min: 10, max: 2000, step: 0.5 }, k => doc.page[k], pset),
      control({ key: 'height', label: 'Height', type: 'number', unit: 'mm', min: 10, max: 2000, step: 0.5 }, k => doc.page[k], pset)),
    control({ key: 'background', label: 'Background', type: 'select', options: [['white', 'White'], ['transparent', 'Transparent'], ['dark', 'Deep navy (graphical abstract)'], ['gradient', 'Radial gradient'], ['linear', 'Linear gradient'], ['custom', 'Solid colour']] }, k => doc.page[k], dset('page', true)),
    ...(['gradient', 'linear', 'custom'].includes(doc.page.background) ? [el('div', { class: 'grid2' },
      control({ key: 'bg', label: 'Colour 1', type: 'color' }, k => doc.page[k], dset('page')),
      doc.page.background !== 'custom' ? control({ key: 'bg2', label: 'Colour 2', type: 'color' }, k => doc.page[k], dset('page')) : el('span'))] : [])));

  // style
  const st = doc.style;
  root.push(sec('Figure style',
    control({ key: 'mode', label: 'Style', type: 'select', options: [['schematic', 'Schematic (line art)'], ['shaded', 'Shaded (gradients)'], ['3d', '3D optical table']] }, k => st[k], dset('style', true)),
    el('div', { class: 'grid2' },
      control({ key: 'lineWidthPt', label: 'Line weight', type: 'number', unit: 'pt', min: 0.1, max: 4, step: 0.05 }, k => st[k], dset('style')),
      control({ key: 'fontSizePt', label: 'Label size', type: 'number', unit: 'pt', min: 4, max: 36, step: 0.5 }, k => st[k], dset('style'))),
    control({ key: 'font', label: 'Font', type: 'select', options: [['Arial, Helvetica, sans-serif', 'Arial / Helvetica (journal default)'], ['"Helvetica Neue", Helvetica, Arial, sans-serif', 'Helvetica Neue'], ['"Times New Roman", Times, serif', 'Times New Roman'], ['Calibri, Carlito, sans-serif', 'Calibri'], ['"Segoe UI", Roboto, sans-serif', 'Segoe UI / Roboto'], ['Georgia, serif', 'Georgia']] }, k => st[k], dset('style')),
    el('div', { class: 'grid2' },
      control({ key: 'labelColor', label: 'Label colour', type: 'color' }, k => st[k], dset('style')),
      control({ key: 'outline', label: 'Outline colour', type: 'color' }, k => st[k], dset('style'))),
    control({ key: 'showLabels', label: 'Show component labels', type: 'bool' }, k => st[k], dset('style'))));

  root.push(sec('Beams',
    control({ key: 'beamStyle', label: 'Drawing', type: 'select', options: [['envelope', 'True width (focus, divergence)'], ['line', 'Uniform line (classic)']] }, k => st[k], dset('style')),
    control({ key: 'beamWidth', label: 'Default beam diameter', type: 'number', unit: 'mm', min: 0.05, max: 10, step: 0.05, hint: 'new sources' }, k => st[k], dset('style')),
    control({ key: 'beamOpacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: 0.01 }, k => st[k], dset('style')),
    control({ key: 'colorMode', label: 'Colours', type: 'select', options: [['physical', 'From wavelength'], ['safe', 'Colour-blind safe (Okabe–Ito)']] }, k => st[k], dset('style')),
    el('div', { class: 'grid2' },
      control({ key: 'beamGlow', label: 'Glow', type: 'bool' }, k => st[k], dset('style')),
      control({ key: 'beamArrows', label: 'Direction arrows', type: 'bool' }, k => st[k], dset('style'))),
    el('div', { class: 'grid2' },
      control({ key: 'beamFade', label: 'Fade weak beams', type: 'bool' }, k => st[k], dset('style')),
      control({ key: 'polarization', label: 'Polarisation marks', type: 'bool' }, k => st[k], dset('style'))),
    control({ key: 'scale', label: 'Figure scale (physical mm per drawn mm)', type: 'number', min: 0.001, max: 100000, step: 1, hint: 'sets drawn focal lengths' }, k => st[k], dset('style')),
    el('div', { class: 'grid2' },
      control({ key: 'fiberColor', label: 'Fibre jacket', type: 'color' }, k => st[k], dset('style')),
      control({ key: 'wireColor', label: 'Wires', type: 'color' }, k => st[k], dset('style')))));

  if (st.mode === '3d') {
    const v3 = doc.view3d;
    const vset = (key, v, rb) => { RNBX.history.checkpoint('v3' + key); v3[key] = v; RNBX.changed(); if (rb) setTimeout(Ins.build, 0); };
    root.push(secActs('3D camera & table', [D.iconBtn('camera', 'Add camera keyframe', () => { RNBX.anim.addCameraKey(); RNBX.timeline.show(); })],
      control({ key: 'yaw', label: 'Orbit (yaw)', type: 'range', min: -180, max: 180, step: 1 }, k => v3[k], vset),
      control({ key: 'pitch', label: 'Elevation (tilt)', type: 'range', min: 8, max: 90, step: 1 }, k => v3[k], vset),
      control({ key: 'zoom', label: 'Zoom', type: 'range', min: 0.3, max: 4, step: 0.01 }, k => v3[k], vset),
      el('div', { class: 'grid2' },
        control({ key: 'panX', label: 'Pan x', type: 'number', unit: 'mm', step: 0.5 }, k => v3[k], vset),
        control({ key: 'panY', label: 'Pan y', type: 'number', unit: 'mm', step: 0.5 }, k => v3[k], vset)),
      control({ key: 'beamHeight', label: 'Beam height', type: 'number', unit: 'mm', min: 1, max: 40, step: 0.5 }, k => v3[k], vset),
      el('div', { class: 'grid2' },
        control({ key: 'table', label: 'Optical table', type: 'bool' }, k => v3[k], vset),
        control({ key: 'holes', label: 'Tapped holes', type: 'bool' }, k => v3[k], vset)),
      el('div', { class: 'grid2' },
        control({ key: 'posts', label: 'Posts & bases', type: 'bool' }, k => v3[k], vset),
        control({ key: 'shadow', label: 'Shadows', type: 'bool' }, k => v3[k], vset)),
      control({ key: 'tableColor', label: 'Table colour', type: 'color' }, k => v3[k], vset)));
  }
  root.push(sec('Publishing tools', el('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '12px' } },
    el('button', { class: 'btn small', type: 'button', text: 'Caption helper', onclick: () => RNBX.dialogs.caption() }),
    el('button', { class: 'btn small', type: 'button', text: 'Journal check', onclick: () => RNBX.dialogs.check() }))));
  return root;
}

Ins.build = () => {
  const host = D.$('#inspector');
  const scroll = host.scrollTop;
  syncs = [];
  host.innerHTML = '';
  const sel = RNBX.selected();
  const parts = sel.length === 0 ? docPanel() : sel.length === 1 ? objectPanel(sel[0]) : multiPanel(sel);
  parts.forEach(p => host.append(p));
  host.scrollTop = scroll;
};
Ins.sync = () => syncs.forEach(f => f());

Ins.rotateBy = d => {
  const sel = RNBX.selected().filter(o => !o.locked);
  if (!sel.length) return;
  RNBX.history.checkpoint();
  sel.forEach(o => { o.rot = U.normDeg((o.rot || 0) + d); });
  RNBX.anim.touch(sel.map(o => o.id));
  RNBX.changed();
};
Ins.flip = () => {
  const sel = RNBX.selected().filter(o => !o.locked);
  if (!sel.length) return;
  RNBX.history.checkpoint();
  // reflective optics flip their turn direction (+90°); others reverse (180°)
  sel.forEach(o => { const def = lib.get(o.type); o.rot = U.normDeg((o.rot || 0) + (def.snap === 'mirror' ? 90 : 180)); });
  RNBX.anim.touch(sel.map(o => o.id));
  RNBX.changed();
};

Ins.init = () => {
  RNBX.on('selection', Ins.build);
  RNBX.on('document', Ins.build);
  RNBX.on('animation', () => { if (S.selection.length) Ins.build(); });
  RNBX.on('render', Ins.sync);
  RNBX.on('objectsEdited', () => Ins.sync());
  RNBX.on('focusText', id => {
    if (!S.selection.includes(id)) RNBX.select([id]);
    setTimeout(() => { const t = D.$('#inspector textarea, #inspector input[type=text]'); if (t) { t.focus(); t.select && t.select(); } }, 30);
  });
  document.querySelectorAll('#rightPanel .tab').forEach(t => t.addEventListener('click', () => {
    document.querySelectorAll('#rightPanel .tab').forEach(x => x.classList.toggle('active', x === t));
    D.$('#inspector').hidden = t.dataset.tab !== 'inspector';
    D.$('#layers').hidden = t.dataset.tab !== 'layers';
    if (t.dataset.tab === 'layers') RNBX.layers.build();
  }));
  Ins.build();
};

/* ---------- arrangement helpers ---------- */
const A = RNBX.arrange = {};
A.align = how => {
  const objs = RNBX.selected().filter(o => !o.locked && !lib.get(o.type).connection);
  if (objs.length < 2) return;
  RNBX.history.checkpoint();
  const boxes = objs.map(o => lib.worldBox(o));
  const minX = Math.min(...boxes.map(b => b[0])), maxX = Math.max(...boxes.map(b => b[2]));
  const minY = Math.min(...boxes.map(b => b[1])), maxY = Math.max(...boxes.map(b => b[3]));
  objs.forEach((o, i) => {
    const b = boxes[i];
    if (how === 'left') o.x += minX - b[0];
    if (how === 'right') o.x += maxX - b[2];
    if (how === 'top') o.y += minY - b[1];
    if (how === 'bottom') o.y += maxY - b[3];
    if (how === 'cx') o.x = objs[0].x;
    if (how === 'cy') o.y = objs[0].y;
  });
  RNBX.anim.touch(objs.map(o => o.id));
  RNBX.changed();
};
A.distribute = axis => {
  const objs = RNBX.selected().filter(o => !o.locked && !lib.get(o.type).connection).sort((a, b) => a[axis] - b[axis]);
  if (objs.length < 3) return;
  RNBX.history.checkpoint();
  const a = objs[0][axis], b = objs[objs.length - 1][axis];
  objs.forEach((o, i) => { o[axis] = a + (b - a) * i / (objs.length - 1); });
  RNBX.anim.touch(objs.map(o => o.id));
  RNBX.changed();
};
/* change page size, keeping the content centred */
A.resizePage = (w, h) => {
  const doc = S.doc, dx = (w - doc.page.width) / 2, dy = (h - doc.page.height) / 2;
  doc.page.width = w; doc.page.height = h;
  doc.objects.forEach(o => { if (!lib.get(o.type) || !lib.get(o.type).connection) { o.x += dx; o.y += dy; } });
  Object.values(doc.animation.tracks).forEach(keys => keys.forEach(k => { k.x += dx; k.y += dy; }));
};
})();
