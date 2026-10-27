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
        opts.map(o => el('option', { value: o[0], text: o[1], disabled: !!o[2] })));
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
    case 'series': {
      // data editor for plot panels
      const o = ctx.obj;
      wrap.append(lab);
      if (!o) return wrap;
      if (o.props.link) {
        const src = RNBX.getObj(o.props.link);
        wrap.append(el('div', { class: 'readout', text: src ? `Calculated live from “${src.kindName || lib.get(src.type).name}”. Change its layers or settings and this panel follows.` : 'The linked stack was deleted.' }),
          el('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '8px' } },
            src ? el('button', { class: 'btn small', type: 'button', text: 'Select the stack', onclick: () => RNBX.select([src.id]) }) : null,
            el('button', { class: 'btn small', type: 'button', text: 'Unlink (keep these curves)', onclick: () => {
              const res = src && RNBX.plotData.calcResult(src);
              RNBX.history.checkpoint();
              if (res) { o.props.series = RNBX.plotData.calcSeries(res).map(q => Object.assign({}, q, { x: q.x.slice(), y: q.y.slice() })); o.props.xlabel = res.xlabel; o.props.ylabel = RNBX.plotData.calcYLabel(res); }
              o.props.link = ''; RNBX.changed(); Ins.build();
            } })));
        return wrap;
      }
      const set = d => { RNBX.history.checkpoint(); RNBX.plotData.apply(o, d); RNBX.changed(); Ins.build(); };
      const fail = e => RNBX.toast(e.message || String(e), 'error');
      const row = el('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '8px' } },
        el('button', { class: 'btn small', type: 'button', text: 'Import CSV / TXT…', onclick: () => RNBX.project.pickFile('.csv,.txt,.dat,.tsv,text/plain', f => f.text().then(t => set(RNBX.plotData.parse(t))).catch(fail)) }),
        el('button', { class: 'btn small', type: 'button', text: 'Paste…', onclick: () => {
          const ta = el('textarea', { rows: 10, placeholder: 'x, y1, y2 …  (one row per line; a header row is optional)', style: { width: '100%', fontFamily: 'var(--mono)' } });
          const m = D.modal({ title: 'Paste data', sub: 'Columns: x then one or more y', body: ta, foot: [el('button', { class: 'btn primary', type: 'button', text: 'Use data', onclick: () => { try { set(RNBX.plotData.parse(ta.value)); m.close(); } catch (e) { fail(e); } } })] });
          setTimeout(() => ta.focus(), 30);
        } }),
        el('button', { class: 'btn small', type: 'button', text: 'From RNSpectraX', title: 'Uses the plot last sent with “→ RNBeamX” in RNSpectraX', onclick: () => { const d = RNBX.plotData.readHandoff(); if (d) set(d); else RNBX.toast('Nothing received yet: in RNSpectraX open Export ▾ and press “→ RNBeamX”, or import its Plotted CSV.'); } }));
      wrap.append(row);
      (o.props.series || []).forEach((sr, i) => {
        const c = el('input', { type: 'color', value: (sr.color || '#1f77b4').slice(0, 7), oninput: () => { RNBX.history.checkpoint('sc' + o.id + i); sr.color = c.value; RNBX.changed(); } });
        const nm = el('input', { type: 'text', value: sr.name, oninput: () => { RNBX.history.checkpoint('sn' + o.id + i); sr.name = nm.value; RNBX.changed(); } });
        const dash = el('select', { onchange: () => { RNBX.history.checkpoint(); sr.dash = dash.value; RNBX.changed(); } }, [['solid', '—'], ['dash', '– –'], ['dot', '···']].map(q => el('option', { value: q[0], text: q[1] })));
        dash.value = sr.dash || 'solid';
        wrap.append(el('div', { class: 'color-row', style: { gridTemplateColumns: '34px 1fr 56px auto', marginBottom: '4px' } }, c, nm, dash,
          D.iconBtn('trash', 'Remove series', () => { RNBX.history.checkpoint(); o.props.series.splice(i, 1); RNBX.changed(); Ins.build(); })));
      });
      if ((o.props.series || []).length) wrap.append(el('div', { class: 'hint', text: o.props.series.map(q => `${q.name}: ${q.x.length} points`).join(' · ') }));
      return wrap;
    }
    case 'layers': {
      // layer stack editor (bottom → top): colour, name, thickness, tag
      const o = ctx.obj;
      wrap.append(lab);
      if (!o) return wrap;
      const L = o.props[param.key] = o.props[param.key] || [];
      const edit = (fn, key) => { RNBX.history.checkpoint(key); fn(); RNBX.changed(); };
      const rebuild = fn => { RNBX.history.checkpoint(); fn(); RNBX.changed(); Ins.build(); };
      const TF = param.simple ? null : RNBX.thinfilm, matOpts = TF ? TF.options() : [];
      L.slice().reverse().forEach((ly, ri) => {
        const i = L.length - 1 - ri;
        const c = el('input', { type: 'color', value: (ly.color || '#888888').slice(0, 7), oninput: () => edit(() => { ly.color = c.value; }, 'lc' + o.id + i) });
        const nm = el('input', { type: 'text', value: ly.name || '', title: 'Layer name', oninput: () => edit(() => { ly.name = nm.value; }, 'ln' + o.id + i) });
        const th = el('input', { type: 'number', value: ly.t, min: 0.05, step: 0.1, title: 'Drawn thickness (mm)', oninput: () => { const v = parseFloat(th.value); if (isFinite(v) && v > 0) edit(() => { ly.t = v; }, 'lt' + o.id + i); } });
        const tg = el('input', { type: 'text', value: ly.tag || '', title: 'Tag in the layer key, e.g. M₁', placeholder: 'tag', oninput: () => edit(() => { ly.tag = tg.value; }, 'lg' + o.id + i) });
        const up = D.iconBtn('up', 'Move up', () => { if (i < L.length - 1) rebuild(() => L.splice(i + 1, 0, L.splice(i, 1)[0])); });
        const rm = D.iconBtn('trash', 'Remove layer', () => { if (L.length > 1) rebuild(() => L.splice(i, 1)); });
        const card = el('div', { class: 'layer-card' }, param.simple ? el('div', { class: 'color-row', style: { gridTemplateColumns: '26px minmax(70px, 1fr) 40px auto auto' } }, c, nm, tg, up, rm) : el('div', { class: 'color-row', style: { gridTemplateColumns: '26px minmax(70px, 1fr) 44px 34px auto auto' } }, c, nm, th, tg, up, rm));
        if (TF) {
          // second line: what the layer is made of, for the thin-film calculation
          const cur = ly.mat || lib.guessMat(ly.name);
          const ms = el('select', { title: 'Material (measured n, k)', onchange: () => rebuild(() => { ly.mat = ms.value; }) }, matOpts.map(q => el('option', { value: q[0], text: q[1], disabled: !!q[2] })));
          ms.value = cur;
          const substrate = i === 0 && o.props.bottomMode !== 'film';
          const dn = el('input', { type: 'number', value: substrate ? '' : (ly.nm || 0), min: 0, step: 1, disabled: substrate, placeholder: substrate ? 'substrate' : '', title: substrate ? 'Bottom layer: thick substrate' : 'Real thickness (nm)', oninput: () => { const v = parseFloat(dn.value); if (isFinite(v) && v >= 0) edit(() => { ly.nm = v; }, 'lnm' + o.id + i); } });
          const row2 = el('div', { class: 'color-row', style: { gridTemplateColumns: '1fr 70px 22px', marginTop: '3px' } }, ms, dn, el('span', { class: 'hint', text: 'nm', style: { margin: 0 } }));
          card.append(row2);
          if (cur === 'custom') {
            const ni = el('input', { type: 'number', value: ly.n == null ? 1.5 : ly.n, step: 0.001, title: 'n', oninput: () => { const v = parseFloat(ni.value); if (isFinite(v)) edit(() => { ly.n = v; }, 'lnn' + o.id + i); } });
            const ki = el('input', { type: 'number', value: ly.k || 0, step: 0.001, min: 0, title: 'k', oninput: () => { const v = parseFloat(ki.value); if (isFinite(v)) edit(() => { ly.k = Math.max(0, v); }, 'lnk' + o.id + i); } });
            card.append(el('div', { class: 'color-row', style: { gridTemplateColumns: '18px 1fr 18px 1fr', marginTop: '3px' } }, el('span', { text: 'n' }), ni, el('span', { text: 'k' }), ki));
          }
        }
        wrap.append(card);
      });
      wrap.append(el('div', { class: 'row', style: { marginTop: '4px' } },
        el('button', { class: 'btn small', type: 'button', text: param.simple ? '+ Row' : '+ Layer on top', onclick: () => rebuild(() => param.simple ? L.push({ name: 'Layer', color: '#d9b84a', tag: '' }) : L.push({ name: 'New layer', color: '#d9b84a', t: 1, tag: '', mat: 'SiO2', nm: 100 })) })));
      wrap.append(el('div', { class: 'hint', text: param.simple ? 'Top of the list = top row. Colour, name and tag (e.g. M₁).' : 'Top of the list = top of the stack. First line: colour, name, drawn thickness (mm), tag. Second line: material and real thickness, used by Optical response.' }));
      return wrap;
    }
    case 'image': {
      const btn = el('button', { class: 'btn small', type: 'button', text: 'Choose image…' });
      btn.onclick = () => RNBX.project.pickFile('image/*,.svg', f => {
        const o = ctx.obj;
        if (!o) return;
        // SVG drawings for custom components are inlined so they stay vector everywhere
        if (o.type === 'custom' && (f.type === 'image/svg+xml' || /\.svg$/i.test(f.name))) {
          f.text().then(txt => {
            try {
              const { svg, vb } = lib.importSvg(txt, 'c' + o.id + '-');
              RNBX.history.checkpoint();
              Object.assign(o.props, { svg, vb, href: '', h: U.round(o.props.w * vb[3] / vb[2], 2), title: f.name.replace(/\.svg$/i, '') });
              RNBX.changed(); Ins.build();
            } catch (e) { RNBX.toast(e.message, 'error'); }
          });
          return;
        }
        RNBX.project.readImage(f).then(({ href, aspect }) => {
          RNBX.history.checkpoint();
          Object.assign(o.props, { href, svg: '', vb: null, aspect, h: U.round(o.props.w / aspect, 2) });
          RNBX.changed(); Ins.build();
        });
      });
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

/* ---------- lens focus (drawn mm, along the lens's own +x axis) ----------
   real lenses: paraxial y–nu trace through the designed surfaces at 587.6 nm */
function lensFocus(obj) {
  const p = obj.props, sc = S.doc.style.scale || 10;
  if (obj.type === 'objective') return { real: false, efl: p.fd, at: p.L / 2 + p.fd };
  const geo = lib.lensReal ? lib.lensReal(p, S.doc) : null;
  if (!geo) { const f = (/concave/.test(p.shape) ? -Math.abs(p.f) : p.f) / sc; return f ? { real: false, efl: f, at: f } : null; }
  let y = 1, nu = 0, nPrev = 1;
  geo.forEach((g, i) => {
    const n2 = g.matB === 'air' ? 1 : RNBX.optics.index(g.matB, 587.56, p.n || 1.5), c = g.R ? 1 / g.R : 0;
    nu -= y * (n2 - nPrev) * c;
    if (i < geo.length - 1) y += (geo[i + 1].x - g.x) * nu / n2;
    nPrev = n2;
  });
  if (!nu) return null;
  const last = geo[geo.length - 1].x, bfd = -y / nu;
  return { real: true, efl: -1 / nu, bfd, at: last + bfd, radii: geo.map(g => g.R) };
}
Ins.focusDetector = obj => {
  // the nearest screen / camera / detector in front of the lens goes to its (paraxial) focus
  const f = lensFocus(obj);
  if (!f || f.at <= 0) { RNBX.toast('This lens has no real focus in front of it.'); return; }
  const ax = U.dirToWorld(obj, [1, 0]), side = U.dirToWorld(obj, [0, 1]);
  const cands = S.doc.objects.filter(o => o !== obj && !o.locked && lib.get(o.type) && lib.get(o.type).category === 'Detectors').map(o => {
    const v = [o.x - obj.x, o.y - obj.y], along = v[0] * ax[0] + v[1] * ax[1], off = Math.abs(v[0] * side[0] + v[1] * side[1]);
    return { o, along, off };
  }).filter(c => c.along > 0 && c.off < Math.max(4, obj.props.d));
  if (!cands.length) { RNBX.toast('Place a screen, camera or detector in front of the lens first.'); return; }
  const c = cands.sort((a, b) => a.along - b.along)[0], k = (obj.scale || 1);
  RNBX.history.checkpoint();
  const off = (c.o.x - obj.x) * side[0] + (c.o.y - obj.y) * side[1];
  c.o.x = U.round(obj.x + ax[0] * f.at * k + side[0] * off, 3); c.o.y = U.round(obj.y + ax[1] * f.at * k + side[1] * off, 3);
  RNBX.anim.touch([c.o.id]);
  RNBX.changed();
  RNBX.toast(`${lib.get(c.o.type).name} moved to the ${f.real ? 'paraxial ' : ''}focus. Ctrl+Z to undo.`);
};

Ins.raySpotCsv = obj => {
  const h = RNBX.canvas.trace && RNBX.canvas.trace.hits[obj.id];
  if (!h || !h.rays) return;
  const sc = S.doc.style.scale || 10, name = (obj.label && obj.label.text) || lib.get(obj.type).name;
  const rows = ['# RNBeamX ray spot: ' + name.replace(/\n/g, ' '), '# position across the detector (its own y axis), from its centre', 'ray,wavelength_nm,position_mm,position_drawn_mm'];
  h.rays.forEach((r, i) => rows.push([i + 1, U.round(r.lambda, 3), U.round(r.y * sc, 6), U.round(r.y, 6)].join(',')));
  U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(name) + '_ray_spot.csv');
  U.track('ray-spot-csv');
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
  if (obj.type === 'lens') {
    const f = lensFocus(obj);
    if (!f) return null;
    const sc = S.doc.style.scale || 10;
    let html = f.real
      ? `Real ${U.esc(RNBX.optics.MATERIALS[obj.props.mat] ? RNBX.optics.MATERIALS[obj.props.mat].name : obj.props.mat)} lens: focal length <b>${U.fmt(f.efl * sc, 4)} mm</b> at 587.6 nm · back focal distance <b>${U.fmt(f.bfd * sc, 4)} mm</b> (paraxial)`
      : `Ideal thin lens: focus <b>${U.fmt(f.efl * sc, 4)} mm</b> from the lens`;
    if (f.real && obj.props.shape !== 'ball') html += `<br>${f.radii.map((R, i) => `R${i + 1} = ${R ? U.fmt(R * sc, 4) + ' mm' : '∞'}`).join(' · ')}`;
    return el('div', { class: 'readout', html });
  }
  if (obj.type === 'fiber') {
    const fl = tr.fiberLight[obj.id];
    if (!fl) return el('div', { class: 'readout', text: 'No light reaches the input coupler yet.' });
    return el('div', { class: 'readout', html: 'Carries ' + Object.keys(fl).map(l => `<b>${U.fmt(Number(l), 1)} nm</b> (${fmtP(fl[l])})`).join(', ') });
  }
  if (h) {
    let html = `Receives <b>${fmtP(h.P)}</b><br>` + Object.keys(h.lambdas).map(l => `${U.fmt(Number(l), 1)} nm: ${fmtP(h.lambdas[l])}`).join(' · ');
    if (h.interf) {
      const I = h.interf, dphi = U.deg(I.dphi);
      html += `<br><b>Interference</b> (${U.fmt(I.lambda, 1)} nm): coherent ${fmtP(h.Pcoh)} · Δφ = ${U.fmt(dphi, 1)}° · visibility ${U.fmt(I.vis, 2)}`;
      if (I.overlap < 0.99) html += ` · polarisation overlap ${U.fmt(I.overlap, 2)}`;
    }
    if (h.rays && h.rays.length > 1) {
      // ray bundle: spread of the ray landing points (RMS about their mean), per wavelength and in total
      const sc = (S.doc.style.scale || 10), rms = a => { const m = a.reduce((x, r) => x + r.y, 0) / a.length; return Math.sqrt(a.reduce((x, r) => x + (r.y - m) * (r.y - m), 0) / a.length); };
      const ls = [...new Set(h.rays.map(r => r.lambda))].sort((a, b) => a - b);
      const fmtL = mm => mm >= 1 ? U.fmt(mm, 3) + ' mm' : U.fmt(mm * 1000, 3) + ' µm';
      html += `<br><b>Ray spot</b> (${h.rays.length} rays): RMS ${fmtL(rms(h.rays) * sc)}` + (ls.length > 1 ? ' · ' + ls.map(l => `${U.fmt(l, 1)} nm ${fmtL(rms(h.rays.filter(r => r.lambda === l)) * sc)}`).join(' · ') : '') + ' <span class="muted">(at the figure scale)</span>';
    }
    if (h.w) html += `<br>Gaussian beam radius here: <b>${h.w >= 1 ? U.fmt(h.w, 3) + ' mm' : U.fmt(h.w * 1000, 1) + ' µm'}</b>`;
    return el('div', { class: 'readout', html });
  }
  if (def.category === 'Detectors') return el('div', { class: 'readout', text: 'No light reaches this detector.' });
  return null;
}

/* ---------- optical response (thin-film calculation) ---------- */
function responseSection(obj, def, set) {
  const TF = RNBX.thinfilm, p = obj.props;
  p.calc = Object.assign({}, TF.DEFAULT_CALC, p.calc || {});
  const c = p.calc;
  const cset = (key, v, rebuild) => { RNBX.history.checkpoint('calc:' + obj.id + key); obj.props.calc = Object.assign({}, obj.props.calc, { [key]: v }); RNBX.changed(); if (rebuild) setTimeout(Ins.build, 0); };
  const cget = k => obj.props.calc[k];
  const kids = [];
  (def.calcParams || []).filter(q => !q.show || q.show(p)).forEach(q => kids.push(control(q, k => obj.props[k], (k, v, rb) => set(k, v, rb || q.type === 'select'), { obj })));
  kids.push(control({ key: 'scan', label: 'Calculate against', type: 'select', options: [['wl', 'Wavelength'], ['angle', 'Angle of incidence']] }, cget, (k, v) => cset(k, v, true)));
  if (c.scan === 'wl') {
    kids.push(el('div', { class: 'grid2' },
      control({ key: 'lmin', label: 'From', type: 'number', unit: 'nm', min: 190, max: 30000, step: 10 }, cget, cset),
      control({ key: 'lmax', label: 'To', type: 'number', unit: 'nm', min: 200, max: 30000, step: 10 }, cget, cset)));
    kids.push(el('div', { class: 'grid2' },
      control({ key: 'angle', label: 'Angle of incidence', type: 'number', unit: '°', min: 0, max: 89.9, step: 0.5, animatable: true }, cget, cset),
      control({ key: 'unit', label: 'Axis unit', type: 'select', options: [['nm', 'nm'], ['um', 'µm']] }, cget, cset)));
  } else {
    kids.push(el('div', { class: 'grid2' },
      control({ key: 'amin', label: 'From', type: 'number', unit: '°', min: 0, max: 89.9, step: 0.5 }, cget, cset),
      control({ key: 'amax', label: 'To', type: 'number', unit: '°', min: 0.1, max: 89.99, step: 0.5 }, cget, cset)));
    kids.push(control({ key: 'lambda', label: 'Wavelength', type: 'wavelength', unit: 'nm', min: 190, max: 30000, step: 1 }, cget, cset));
  }
  const geo = def.grating ? def.grating(obj.props, obj, S.doc) : null;
  if (geo) {
    kids.push(control({ key: 'method', label: 'Method', type: 'select', options: [['auto', 'Grating (RCWA), rigorous'], ['tmm', 'Flat films only (fast)']] }, k => cget(k) === 'tmm' ? 'tmm' : 'auto', (k, v) => cset(k, v, true)));
    if (c.method !== 'tmm') kids.push(el('div', { class: 'grid2' },
      control({ key: 'orders', label: 'Diffraction orders ±', type: 'number', min: 1, max: 60, step: 1, hint: 'more = slower, more exact' }, k => cget(k) || 20, cset),
      control({ key: 'slices', label: 'Profile slices', type: 'number', min: 4, max: 60, step: 1, hint: 'for curved profiles' }, k => cget(k) || 16, cset)),
      control({ key: 'rpoints', label: 'Points in the curve', type: 'number', min: 11, max: 1001, step: 10 }, k => cget(k) || 101, cset),
      el('div', { class: 'hint', text: `One period: ${U.fmt(geo.period, 0)} nm, ${geo.slices.length} slice${geo.slices.length > 1 ? 's' : ''}, ${2 * geo.orders + 1} orders. Runs in the background.` }),
      el('button', { class: 'btn small', type: 'button', text: 'Check convergence', title: 'Recalculate a few points with 1.5× the orders and compare', onclick: ev => {
        const btn = ev.currentTarget, RC = RNBX.rcwa, cc = Object.assign({}, TF.DEFAULT_CALC, obj.props.calc);
        btn.disabled = true; btn.textContent = 'Checking…';
        setTimeout(() => {
          const wl = cc.scan === 'wl', lo = wl ? +cc.lmin : +cc.amin, hi = wl ? +cc.lmax : +cc.amax, pts = [0.2, 0.5, 0.8].map(f => lo + (hi - lo) * f);
          const g1 = def.grating(obj.props, obj, S.doc), g2 = Object.assign({}, g1, { orders: Math.min(60, Math.round(g1.orders * 1.5)) });
          let worst = 0;
          pts.forEach(v => {
            const lam = wl ? v : +cc.lambda, th = wl ? +cc.angle || 0 : Math.min(89.9, v), pol = cc.pol === 'avg' ? 'p' : cc.pol;
            const a = RC.solve(RC.problemAt(g1, lam), lam, th, pol), b = RC.solve(RC.problemAt(g2, lam), lam, th, pol);
            worst = Math.max(worst, Math.abs(a.R - b.R), Math.abs(a.T - b.T));
          });
          btn.disabled = false; btn.textContent = 'Check convergence';
          RNBX.toast(worst < 0.01 ? `Converged: ±${g1.orders} and ±${g2.orders} orders agree within ${U.fmt(worst * 100, 2)} %` : `Not converged yet: results change by up to ${U.fmt(worst * 100, 1)} % with ±${g2.orders} orders. Increase the orders (metal gaps and thin metal walls need many).`, worst < 0.01 ? '' : 'error');
        }, 30);
      } }));
  }
  kids.push(el('div', { class: 'grid2' },
    control({ key: 'pol', label: 'Polarisation', type: 'select', options: [['avg', 'Unpolarised'], ['p', 'p (TM)'], ['s', 's (TE)']] }, cget, cset),
    control({ key: 'show', label: 'Curves', type: 'select', options: [['R', 'R'], ['T', 'T'], ['A', 'A'], ['RT', 'R, T'], ['RA', 'R, A'], ['RTA', 'R, T, A']] }, cget, cset)));
  // live readout: dip / peak, warnings, data sources
  const out = el('div', { class: 'readout' });
  const update = () => {
    let res;
    try { res = RNBX.plotData.calcResult(obj, S.doc); } catch (e) { out.textContent = 'Calculation failed: ' + e.message; return; }
    if (!res) return;
    if (res.pending && !res.x) { out.textContent = `Calculating the grating (RCWA)… ${Math.round((res.progress || 0) * 100)} %`; return; }
    const lines = TF.summary(res);
    if (res.method === 'rcwa') lines.unshift(res.pending ? `RCWA: updating… ${Math.round((res.progress || 0) * 100)} %` : 'Rigorous grating calculation (RCWA)');
    const note = def.calcNote ? def.calcNote(obj.props, obj) : '';
    out.innerHTML = (lines.length ? lines.map(U.esc).join('<br>') : 'No dip or peak inside this range.') +
      (res.warn.length ? `<br><span style="color:var(--warn,#b26a00)">Outside the measured data range: ${U.esc(res.warn.join(', '))}. End values are used.</span>` : '') +
      (note ? `<br><span class="hint" style="margin:0">${U.esc(note)}</span>` : '');
  };
  update(); syncs.push(update);
  kids.push(out);
  const linked = S.doc.objects.find(o => o.type === 'plot' && o.props.link === obj.id);
  kids.push(el('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '10px' } },
    el('button', { class: 'btn small primary', type: 'button', text: linked ? 'Its panel' : 'Add panel', title: linked ? 'Select the linked data panel' : 'Add a data panel that follows this calculation', onclick: () => linked ? RNBX.select([linked.id]) : RNBX.plotData.addCalcPanel(obj) }),
    el('button', { class: 'btn small', type: 'button', text: 'CSV', title: 'Download the curves as CSV', onclick: () => RNBX.plotData.downloadCsv(obj) }),
    el('button', { class: 'btn small ghost', type: 'button', text: 'Sources', title: 'Where the n, k data come from', onclick: () => RNBX.plotData.sourcesDialog(obj) })));
  return sec('Optical response (thin-film calculation)', ...kids);
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
  // ray bundles: download where every ray lands on this detector
  { const h0 = RNBX.canvas.trace && RNBX.canvas.trace.hits[obj.id];
    if (h0 && h0.rays && h0.rays.length) body.push(el('div', { class: 'row', style: { marginBottom: '10px' } }, el('button', { class: 'btn small', type: 'button', text: 'Ray spot CSV', title: 'Where each ray lands across this detector, per wavelength', onclick: () => Ins.raySpotCsv(obj) }))); }
  if (obj.type === 'raysource') {
    // one-click colour sets and the ray width (a figure-wide setting) next to them
    const preset = (label, props) => el('button', { class: 'btn small', type: 'button', text: label, onclick: () => { RNBX.history.checkpoint(); Object.assign(obj.props, props); RNBX.anim.touch([obj.id]); RNBX.changed(); setTimeout(Ins.build, 0); } });
    body.push(el('div', { class: 'row', style: { flexWrap: 'wrap', gap: '6px', marginBottom: '8px' } },
      preset('F · d · C', { colors: 'fdc', color: '' }), preset('RGB', { colors: 'rgb', color: '' }), preset('Single colour', { colors: 'single' }), preset('Black (print)', { colors: 'single', color: '#1d1f23' })));
    body.push(control({ key: 'rayWidth', label: 'Ray width (whole figure)', type: 'range', min: 0.04, max: 0.8, step: 0.02 }, () => S.doc.style.rayWidth == null ? 0.16 : S.doc.style.rayWidth, (k, v) => { RNBX.history.checkpoint('rayWidth'); S.doc.style.rayWidth = v; RNBX.changed(); }));
  }
  if (obj.type === 'lens' || obj.type === 'objective') body.push(el('div', { class: 'row', style: { marginBottom: '10px' } }, el('button', { class: 'btn small', type: 'button', text: 'Move screen to focus', title: 'Puts the nearest screen, camera or detector in front of the lens at its focus', onclick: () => Ins.focusDetector(obj) })));
  if (def.hint) body.push(el('div', { class: 'note', text: def.hint }));
  if (def.stackable) {
    const below = obj.props.on && RNBX.getObj(obj.props.on);
    body.push(below ? el('div', { class: 'readout' }, 'Stacked on ', el('b', { text: below.props.name || lib.get(below.type).name }), ' (size and view follow it). ',
      el('button', { class: 'btn small ghost', type: 'button', text: 'Detach', onclick: () => { RNBX.history.checkpoint(); obj.y -= lib.surfMax(obj.props.base) * (obj.scale || 1); obj.props.on = ''; obj.props.base = null; RNBX.changed(); Ins.build(); } }))
      : el('div', { class: 'hint', text: 'Building block: click another block in the library while this one is selected to stack it on top, or drag blocks onto each other.' }));
  }
  params.forEach(p => body.push(control(p, k => obj.props[k], set, { obj })));
  if (body.length) root.push(sec(def.connection ? 'Connection' : 'Parameters', ...body));
  if (def.stack && RNBX.thinfilm && (!def.calcShow || def.calcShow(obj.props))) root.push(responseSection(obj, def, set));
  if (obj.type === 'group' || obj.type === 'custom') {
    const kids = obj.type === 'group' ? (obj.props.children || []) : [];
    root.push(sec(obj.type === 'group' ? 'Group' : 'Share',
      obj.type === 'group' ? el('div', { class: 'readout', text: `${kids.length} parts: ` + [...new Set(kids.map(c => (lib.get(c.type) || {}).name || c.type))].slice(0, 6).join(', ') + '. Optical parts inside still act on beams.' }) : null,
      el('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '10px' } },
        obj.type === 'group' ? el('button', { class: 'btn small', type: 'button', text: 'Ungroup', title: 'Ctrl+Shift+G', onclick: () => RNBX.groups.ungroup([obj.id]) }) : null,
        el('button', { class: 'btn small primary', type: 'button', text: 'Save to My components', onclick: () => { const nm = prompt('Name for this component:', obj.props.name || obj.props.title || 'My component'); if (nm) { RNBX.groups.save(obj, nm); RNBX.toast('Saved to My components (in this browser)'); } } }),
        el('button', { class: 'btn small', type: 'button', text: 'Export file', title: 'A small file to share with your group; import it with File ▸ Import component file', onclick: () => RNBX.groups.exportFile(obj) }))));
  }

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
    ...(def.annotation ? [] : [el('div', { class: 'grid2' },
      control({ key: 'z', label: 'Height z', type: 'number', unit: 'mm', step: 0.5, hint: 'above the beam plane' }, k => obj[k] || 0, tset),
      lib.canVertical(obj.type) ? control({ key: 'axis', label: 'Optical axis', type: 'select', options: [['h', 'In table plane'], ['up', 'Vertical, facing up'], ['down', 'Vertical, facing down']] }, k => obj[k] || 'h', (k, v) => tset(k, v, true)) : el('span'))]),
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

  // one-click looks and house styles
  const styleSel = el('select', {}, el('option', { value: '', text: 'Apply a style…' }),
    el('optgroup', { label: 'Built-in' }, RNBX.styles.BUILTIN.map(x => el('option', { value: x.id, text: x.name, title: x.desc }))),
    RNBX.styles.house().length ? el('optgroup', { label: 'House styles' }, RNBX.styles.house().map(x => el('option', { value: x.id, text: x.name }))) : null);
  styleSel.onchange = () => { if (styleSel.value) RNBX.styles.apply(styleSel.value); };
  root.push(sec('Style presets', el('div', { class: 'field' }, styleSel),
    el('div', { class: 'row', style: { flexWrap: 'wrap', marginBottom: '12px' } },
      el('button', { class: 'btn small', type: 'button', text: 'Save as house style…', onclick: () => { const nm = prompt('Name for this style (e.g. your group name):', 'Group style'); if (nm) { RNBX.styles.saveHouse(nm); RNBX.toast('Saved house style “' + nm + '”'); Ins.build(); } } }),
      el('button', { class: 'btn small', type: 'button', text: 'Export', title: 'Download your house styles to share with your group', onclick: () => RNBX.styles.exportHouse() }),
      el('button', { class: 'btn small', type: 'button', text: 'Import', onclick: () => RNBX.project.pickFile('.json,application/json', f => RNBX.styles.importHouse(f)) }),
      RNBX.styles.house().length ? el('button', { class: 'btn small ghost danger', type: 'button', text: 'Remove…', onclick: ev => {
        const items = RNBX.styles.house().map(h => ({ label: h.name, icon: 'trash', action: () => { RNBX.styles.removeHouse(h.id); Ins.build(); } }));
        const r = ev.currentTarget.getBoundingClientRect(); D.menu(items, r.left, r.bottom + 4);
      } }) : null)));

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
    control({ key: 'showLabels', label: 'Show component labels', type: 'bool' }, k => st[k], dset('style')),
    el('button', { class: 'btn small', type: 'button', style: { marginBottom: '12px' }, html: D.icon('label', 14) + ' Auto-arrange labels', title: 'Shift+L', onclick: () => RNBX.labels.arrange() })));

  root.push(sec('Beams',
    control({ key: 'beamStyle', label: 'Drawing', type: 'select', options: [['envelope', 'True width (focus, divergence)'], ['line', 'Uniform line (classic)'], ['ribbon', 'Wide translucent ribbon (instrument sketch)']] }, k => st[k], dset('style', true)),
    ...(st.beamStyle === 'ribbon' ? [control({ key: 'ribbonWidth', label: 'Ribbon width', type: 'number', unit: 'mm', min: 0.3, max: 30, step: 0.1 }, k => st[k] || 3, dset('style'))] : []),
    control({ key: 'beamModel', label: 'Beam model', type: 'select', options: [['geometric', 'Geometric cone'], ['gaussian', 'Gaussian beam (waist, Rayleigh range, M²)']] }, k => st[k] || 'geometric', dset('style', true)),
    ...(st.beamModel === 'gaussian' ? [el('div', { class: 'grid2' },
      control({ key: 'gaussMag', label: 'Width exaggeration', type: 'number', unit: '×', min: 0.1, max: 1000, step: 1, hint: 'drawn ÷ physical, after scale' }, k => st[k] || 10, dset('style')),
      control({ key: 'waistLabels', label: 'Label foci (2w₀)', type: 'bool' }, k => st[k], dset('style')))] : []),
    control({ key: 'ghosts', label: 'Surface reflections (ghosts)', type: 'select', options: [['off', 'Off'], ['uncoated', 'Uncoated glass (Fresnel)'], ['ar', 'AR-coated (0.25 % per surface)']] }, k => st[k] || 'off', dset('style')),
    control({ key: 'beamWidth', label: 'Default beam diameter', type: 'number', unit: 'mm', min: 0.05, max: 10, step: 0.05, hint: 'new sources' }, k => st[k], dset('style')),
    control({ key: 'rayWidth', label: 'Ray width (ray bundles)', type: 'number', unit: 'mm', min: 0.02, max: 2, step: 0.02 }, k => st[k] == null ? 0.16 : st[k], dset('style')),
    control({ key: 'beamOpacity', label: 'Opacity', type: 'range', min: 0.1, max: 1, step: 0.01 }, k => st[k], dset('style')),
    control({ key: 'colorMode', label: 'Colours', type: 'select', options: [['physical', 'From wavelength'], ['safe', 'Colour-blind safe (Okabe–Ito)'], ['mono', 'Monochrome (black)']] }, k => st[k], dset('style')),
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
      el('div', { class: 'grid2' },
        control({ key: 'tableFinish', label: 'Table top', type: 'select', options: Object.entries(RNBX.render3d.TABLE_FINISHES).map(([id, f]) => [id, f.name]).concat([['custom', 'Custom colour']]) }, k => v3[k] || 'custom',
          (k, v) => { const f = RNBX.render3d.TABLE_FINISHES[v]; RNBX.history.checkpoint('v3finish'); v3.tableFinish = v; if (f) { v3.tableColor = f.color; v3.holes = f.holes !== false; } RNBX.changed(); setTimeout(Ins.build, 0); }),
        control({ key: 'tableColor', label: 'Table colour', type: 'color' }, k => v3[k],
          (k, v) => { const f = RNBX.render3d.TABLE_FINISHES[v3.tableFinish]; RNBX.history.checkpoint('v3tableColor'); v3.tableColor = v; if (!f || f.color.toLowerCase() !== String(v).toLowerCase()) { if (!(f && f.brushed)) v3.tableFinish = 'custom'; } RNBX.changed(); }))));
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
/* Add a data plot as a second panel (a: setup, b: data). Wide pages
   get it on the right; narrow ones grow downwards. */
A.addDataPanel = data => {
  const doc = S.doc, W = doc.page.width, H = doc.page.height;
  RNBX.history.checkpoint();
  let x, y, w, h;
  // where does the existing content end?
  const boxes = doc.objects.filter(o => lib.get(o.type) && !lib.get(o.type).connection && o.type !== 'panel').map(o => lib.worldBox(o));
  const right = boxes.length ? Math.max(...boxes.map(b => b[2])) : 0;
  const free = W - right - 4;
  if (free >= Math.max(45, W * 0.3)) {
    // room beside the setup
    w = Math.round(Math.min(free - 2, W * 0.45)); h = Math.round(Math.min(H * 0.8, w * 0.72)); x = W - w / 2 - 3; y = H / 2;
  } else {
    // no room: the page grows downwards and the plot becomes panel b below
    w = Math.round(Math.min(W - 10, Math.max(80, W * 0.55))); h = Math.round(w * 0.6);
    doc.page.height = H + h + 8; doc.page.preset = 'custom'; x = W / 2; y = H + 4 + h / 2;
  }
  const plot = RNBX.createObject('plot', x, y);
  plot.props.w = w; plot.props.h = h;
  if (data) RNBX.plotData.apply(plot, data);
  doc.objects.push(plot);
  const panels = doc.objects.filter(o => o.type === 'panel');
  if (!panels.length) { const a = RNBX.createObject('panel', 0, 0); a.props.text = 'a'; a.x = 3; a.y = 5; doc.objects.push(a); }
  const b = RNBX.createObject('panel', 0, 0);
  b.props.text = 'abcdefghij'[Math.min(9, doc.objects.filter(o => o.type === 'panel').length)];
  b.x = x - w / 2; b.y = y - h / 2 + 1; doc.objects.push(b);
  RNBX.select([plot.id]);
  RNBX.canvas.fit();
  return plot;
};

/* change page size, keeping the content centred */
A.resizePage = (w, h) => {
  const doc = S.doc, dx = (w - doc.page.width) / 2, dy = (h - doc.page.height) / 2;
  doc.page.width = w; doc.page.height = h;
  doc.objects.forEach(o => { if (!lib.get(o.type) || !lib.get(o.type).connection) { o.x += dx; o.y += dy; } });
  Object.values(doc.animation.tracks).forEach(keys => keys.forEach(k => { k.x += dx; k.y += dy; }));
};
})();
