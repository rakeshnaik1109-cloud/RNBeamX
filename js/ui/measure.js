/* ═══════════════════════════════════════════════════════════
   RNBeamX — ui/measure.js
   Measuring on a microscope image panel: lines (nanorod length
   and width), segmented lines (bent rods, wires), diameters
   (particles), areas (with the equivalent diameter), angles and
   counts. Each measurement belongs to a class (Length, Width,
   Diameter …); every class gets n, mean, SD, SE, median, range
   and CV, a histogram, and length / width gives the aspect
   ratio. Values use the panel's calibration (pixels without it).
   Measurements stay on the panel (props.meas) and are drawn
   there; the session is one undo step in the figure.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state, D = RNBX.dom, el = D.el, IP = RNBX.imgproc;
const MS = RNBX.measure = {};

const TOOLS = [['line', 'Line', 'L', 'Length'], ['poly', 'Segmented', 'S', 'Length'], ['diam', 'Diameter', 'D', 'Diameter'], ['area', 'Area', 'A', 'Area'], ['angle', 'Angle', 'G', 'Angle'], ['count', 'Count', 'C', 'Particles'], ['select', 'Select', 'V', '']];
const PALETTE = ['#2bd4ff', '#ffd23f', '#ff6b9a', '#7bd88f', '#c58cff', '#ff9f43', '#5dade2', '#f1948a'];
MS.TOOLS = TOOLS;

/* histogram bins: Freedman–Diaconis width, 4–30 bins */
MS.bins = vals => {
  const n = vals.length; if (!n) return { edges: [], counts: [] };
  const a = vals.slice().sort((x, y) => x - y), q = f => a[Math.min(n - 1, Math.max(0, Math.round(f * (n - 1))))];
  const lo = a[0], hi = a[n - 1], iqr = q(0.75) - q(0.25);
  let k = iqr > 0 ? Math.ceil((hi - lo) / (2 * iqr * Math.pow(n, -1 / 3))) : Math.ceil(Math.sqrt(n));
  k = Math.max(4, Math.min(30, k || 4));
  const span = (hi - lo) || Math.abs(lo) * 0.1 || 1, w = span / k, x0 = hi > lo ? lo : lo - span / 2;
  const edges = Array.from({ length: k + 1 }, (_, i) => x0 + i * w), counts = new Array(k).fill(0);
  vals.forEach(v => { counts[Math.min(k - 1, Math.max(0, Math.floor((v - x0) / w)))]++; });
  return { edges, counts, w };
};

MS.open = obj => {
  const p = obj.props;
  if (!p.href) { RNBX.toast('Choose an image first'); return null; }
  p.meas = Array.isArray(p.meas) ? p.meas : [];
  RNBX.history.checkpoint();
  const local = [];   // undo inside the dialog
  const snap = () => { local.push(JSON.stringify(p.meas)); if (local.length > 200) local.shift(); };
  let tool = 'line', cls = 'Length', img = null, s = 1, ox = 0, oy = 0, cur = null, sel = -1, pan = null, space = false;
  const colours = {};
  const colOf = c => colours[c] || (colours[c] = PALETTE[Object.keys(colours).length % PALETTE.length]);
  (p.meas || []).forEach(q => colOf(q.cls || 'Unnamed'));

  const cv = el('canvas', { class: 'ms-canvas', tabindex: 0 });
  const host = el('div', { class: 'ms-view' }, cv);
  const info = el('div', { class: 'hint ms-info' });
  const statsHost = el('div', { class: 'ms-stats' }), histHost = el('div', { class: 'ms-hist' }), listHost = el('div', { class: 'ms-list' });
  const clsSel = el('select', { onchange: () => { if (clsSel.value === '__new') { const nn = prompt('Name of the new class (e.g. Length, Width, Core, Shell):', ''); if (nn) { cls = nn.trim(); colOf(cls); } fillCls(); } else cls = clsSel.value; } });
  const fillCls = () => { const names = [...new Set(['Length', 'Width', 'Diameter', 'Particles', 'Area', 'Angle'].concat((p.meas || []).map(q => q.cls || 'Unnamed')).concat([cls]))]; clsSel.innerHTML = ''; names.forEach(n => clsSel.append(el('option', { value: n, text: n }))); clsSel.append(el('option', { value: '__new', text: '+ New class…' })); clsSel.value = cls; };
  const toolBtns = TOOLS.map(([t, name, key, def]) => el('button', { class: 'btn small' + (t === tool ? ' primary' : ''), type: 'button', text: `${name} (${key})`, 'data-tool': t, onclick: () => setTool(t) }));
  const setTool = t => { tool = t; cur = null; const d = TOOLS.find(x => x[0] === t)[3]; if (d) { cls = d; colOf(cls); fillCls(); } toolBtns.forEach(b => b.classList.toggle('primary', b.dataset.tool === t)); hint(); draw(); };
  const hint = () => {
    const h = { line: 'Drag along a rod (Shift: horizontal, vertical or 45°).', poly: 'Click points along a bent rod or wire; double-click or Enter to finish, Backspace removes a point.', diam: 'Drag across a particle from edge to edge.', area: 'Click around the outline; double-click or Enter to close it.', angle: 'Click the first arm, the vertex, then the second arm.', count: 'Click every particle to count it.', select: 'Click a measurement to select it; Delete removes it.' }[tool];
    info.textContent = h + ' Wheel: zoom · right-drag or Space-drag: pan · Ctrl+Z: undo.' + (IP.nmPerPx(p) ? '' : ' Not calibrated: values are in pixels (Calibrate / crop… sets the scale).');
  };

  /* ---------- view ---------- */
  const W = () => cv.width / (window.devicePixelRatio || 1), Hh = () => cv.height / (window.devicePixelRatio || 1);
  const fit = () => { const pw = p.pxW || img.naturalWidth, ph = p.pxH || img.naturalHeight; s = Math.min(W() / pw, Hh() / ph) * 0.96; ox = (W() - pw * s) / 2; oy = (Hh() - ph * s) / 2; };
  const toImg = e => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) - ox) / s, ((e.clientY - r.top) - oy) / s]; };
  const scr = a => [ox + a[0] * s, oy + a[1] * s];
  const value = q => { const v = IP.measValue(p, q); if (IP.kind(q.type) === 'angle') return v.v.toFixed(1) + '°'; if (q.type === 'count') return (q.pts || []).length + ' counted'; if (v.px) return IP.fmtN(v.v) + ' ' + v.unit; if (v.nm2) { const [u, f] = IP.lenUnit([Math.sqrt(v.v)]); return IP.fmtN(v.v / (f * f)) + ' ' + u + '²'; } const [u, f] = IP.lenUnit([v.v]); return IP.fmtN(v.v / f) + ' ' + u; };
  function draw() {
    if (!img) return;
    const ctx = cv.getContext('2d'), dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b0d12'; ctx.fillRect(0, 0, W(), Hh());
    const pw = p.pxW || img.naturalWidth, ph = p.pxH || img.naturalHeight;
    ctx.imageSmoothingEnabled = s < 3;
    ctx.drawImage(img, ox, oy, pw * s, ph * s);
    // outside the crop: dimmed
    const c0 = [p.cx0 || 0, p.cy0 || 0], c1 = [p.cx1 == null ? 1 : p.cx1, p.cy1 == null ? 1 : p.cy1];
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const X0 = ox + c0[0] * pw * s, Y0 = oy + c0[1] * ph * s, X1 = ox + c1[0] * pw * s, Y1 = oy + c1[1] * ph * s;
    ctx.fillRect(ox, oy, pw * s, Y0 - oy); ctx.fillRect(ox, Y1, pw * s, oy + ph * s - Y1); ctx.fillRect(ox, Y0, X0 - ox, Y1 - Y0); ctx.fillRect(X1, Y0, ox + pw * s - X1, Y1 - Y0);
    const all = (p.meas || []).map((q, i) => ({ q, i })).concat(cur ? [{ q: cur, i: -2 }] : []);
    all.forEach(({ q, i }) => {
      const col = colOf(q.cls || 'Unnamed'), P = (q.pts || []).map(scr), hi = i === sel;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = hi ? 3 : 1.8; ctx.setLineDash(i === -2 ? [5, 4] : []);
      if (!P.length) return;
      if (q.type === 'count') { P.forEach((a, k) => { ctx.beginPath(); ctx.arc(a[0], a[1], 5, 0, 2 * Math.PI); ctx.stroke(); ctx.font = '10px Arial'; ctx.fillText(String(k + 1), a[0] + 6, a[1] - 6); }); return; }
      if (q.type === 'diam' && P.length > 1) { const cx = (P[0][0] + P[1][0]) / 2, cy = (P[0][1] + P[1][1]) / 2, r = Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) / 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI); ctx.stroke(); }
      ctx.beginPath(); P.forEach((a, k) => (k ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]))); if (q.type === 'area' && i !== -2) ctx.closePath(); ctx.stroke();
      if (q.type === 'area' && i !== -2) { ctx.globalAlpha = 0.15; ctx.fill(); ctx.globalAlpha = 1; }
      P.forEach(a => { ctx.beginPath(); ctx.arc(a[0], a[1], 2.2, 0, 2 * Math.PI); ctx.fill(); });
      if (i !== -2 || P.length > 1) {
        const t = value(q), a = q.type === 'angle' && P.length > 2 ? P[1] : P[Math.floor((P.length - 1) / 2)], b = P[Math.min(P.length - 1, Math.floor((P.length - 1) / 2) + 1)];
        ctx.font = 'bold 12px Arial'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.setLineDash([]);
        // a straight line: the value just beyond its upper end (crossing length and width lines keep apart); otherwise beside the middle
        const tw = ctx.measureText(t).width; let tx, ty;
        if ((q.type === 'line') && P.length > 1) { const [e0, e1] = P[0][1] <= P[1][1] ? [P[0], P[1]] : [P[1], P[0]], L = Math.hypot(e0[0] - e1[0], e0[1] - e1[1]) || 1, ux = (e0[0] - e1[0]) / L, uy = (e0[1] - e1[1]) / L; tx = e0[0] + ux * 12 - tw / 2 + ux * tw / 2; ty = e0[1] + uy * 12 + 4; }
        else { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L; if (ny > 0) { nx = -nx; ny = -ny; } tx = (a[0] + b[0]) / 2 + nx * 14 - tw / 2; ty = (a[1] + b[1]) / 2 + ny * 14 + 4; }
        ctx.strokeText(t, tx, ty); ctx.fillText(t, tx, ty);
      }
    });
    ctx.setLineDash([]);
  }
  const refresh = () => { RNBX.changed(); drawStats(); drawList(); draw(); };

  /* ---------- drawing ---------- */
  const constrain = (a, b, e) => { if (!e.shiftKey) return b; const dx = b[0] - a[0], dy = b[1] - a[1], ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, L = Math.hypot(dx, dy); return [a[0] + Math.cos(ang) * L, a[1] + Math.sin(ang) * L]; };
  const add = q => { snap(); p.meas.push(q); refresh(); };
  const finish = () => { if (!cur) return; const need = cur.type === 'area' ? 3 : 2; if (cur.pts.length >= need) add({ type: cur.type, pts: cur.pts.map(a => [U.round(a[0], 2), U.round(a[1], 2)]), cls }); cur = null; draw(); };
  const nearest = a => { let best = -1, bd = 12 / s; (p.meas || []).forEach((q, i) => { const P = q.pts || []; for (let k = 0; k < P.length; k++) { const b = P[k], c = P[k + 1] || (q.type === 'area' ? P[0] : null); let d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (c) { const vx = c[0] - b[0], vy = c[1] - b[1], L2 = vx * vx + vy * vy || 1, t = U.clamp(((a[0] - b[0]) * vx + (a[1] - b[1]) * vy) / L2, 0, 1); d = Math.min(d, Math.hypot(a[0] - b[0] - t * vx, a[1] - b[1] - t * vy)); } if (d < bd) { bd = d; best = i; } } }); return best; };
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    cv.focus(); cv.setPointerCapture(e.pointerId);
    if (e.button === 1 || e.button === 2 || space) { pan = { x: e.clientX, y: e.clientY, ox, oy }; return; }
    const a = toImg(e);
    if (tool === 'select') { sel = nearest(a); drawList(); draw(); return; }
    if (tool === 'line' || tool === 'diam') { cur = { type: tool, pts: [a, a], cls, drag: true }; draw(); return; }
    if (tool === 'count') { snap(); let q = p.meas.find(m => m.type === 'count' && (m.cls || 'Unnamed') === cls); if (!q) { q = { type: 'count', pts: [], cls }; p.meas.push(q); } q.pts.push([U.round(a[0], 2), U.round(a[1], 2)]); refresh(); return; }
    if (!cur) cur = { type: tool, pts: [a], cls }; else cur.pts.push(a);
    if (tool === 'angle' && cur.pts.length === 3) finish();
    draw();
  });
  cv.addEventListener('pointermove', e => {
    if (pan) { ox = pan.ox + e.clientX - pan.x; oy = pan.oy + e.clientY - pan.y; draw(); return; }
    if (!cur) return;
    const a = toImg(e);
    if (cur.drag) { cur.pts[1] = constrain(cur.pts[0], a, e); draw(); return; }
    cur.preview = a; const P = cur.pts.slice(); draw(); const ctx = cv.getContext('2d'), b = scr(P[P.length - 1]), c = scr(a); ctx.strokeStyle = colOf(cls); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); ctx.setLineDash([]);
  });
  cv.addEventListener('pointerup', e => {
    if (pan) { pan = null; return; }
    if (cur && cur.drag) { const P = cur.pts; if (Math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) * s > 4) { delete cur.drag; finish(); } else { cur = null; draw(); } }
  });
  cv.addEventListener('dblclick', e => { if (cur && (cur.type === 'poly' || cur.type === 'area')) { cur.pts.pop(); finish(); } e.preventDefault(); });
  cv.addEventListener('wheel', e => { e.preventDefault(); const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, f = Math.exp(-e.deltaY * 0.0015), ns = U.clamp(s * f, 0.02, 80); ox = mx - (mx - ox) * ns / s; oy = my - (my - oy) * ns / s; s = ns; draw(); }, { passive: false });
  const onKey = e => {
    if (!document.body.contains(cv)) return;
    if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement !== cv) return;
    const k = e.key;
    if (k === 'Escape' && cur) { e.stopPropagation(); e.preventDefault(); cur = null; draw(); return; }
    if (k === 'Enter' && cur) { e.preventDefault(); finish(); return; }
    if (k === 'Backspace' && cur) { e.preventDefault(); cur.pts.pop(); if (!cur.pts.length) cur = null; draw(); return; }
    if ((k === 'Delete' || k === 'Backspace') && sel >= 0) { e.preventDefault(); snap(); p.meas.splice(sel, 1); sel = -1; refresh(); return; }
    if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); if (cur) { cur = null; draw(); return; } if (local.length) { p.meas = JSON.parse(local.pop()); refresh(); } return; }
    if (k === ' ') { space = true; e.preventDefault(); return; }
    const t = TOOLS.find(x => x[2].toLowerCase() === k.toLowerCase());
    if (t && !e.ctrlKey && !e.metaKey) setTool(t[0]);
  };
  const onKeyUp = e => { if (e.key === ' ') space = false; };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);

  /* ---------- statistics, histogram, list ---------- */
  let histCls = null;
  function drawStats() {
    const st = IP.measStats(p);
    statsHost.innerHTML = '';
    if (!st.length) { statsHost.append(el('div', { class: 'hint', text: 'No measurements yet.' })); histHost.innerHTML = ''; return; }
    const rows = st.map(g => g.kind === 'count'
      ? `<tr><td><span class="ms-dot" style="background:${colOf(g.cls)}"></span>${U.esc(g.cls)}</td><td>${g.n}</td><td colspan="4">${g.density ? IP.fmtN(g.density) + ' per µm²' : 'counted'}</td></tr>`
      : `<tr><td><span class="ms-dot" style="background:${colOf(g.cls)}"></span>${U.esc(g.cls)}</td><td>${g.n}</td><td><b>${IP.fmtN(g.mean)}</b> ± ${IP.fmtSD(g.sd, g.mean)} ${U.esc(g.unit)}</td><td>${IP.fmtN(g.median)}</td><td>${IP.fmtN(g.min)}–${IP.fmtN(g.max)}</td><td>${g.n > 1 ? g.cv.toFixed(1) + ' %' : '–'}</td></tr>` + (g.eqd ? `<tr><td colspan="2" class="muted">↳ equivalent diameter</td><td>${IP.fmtN(g.eqd.mean)} ± ${IP.fmtSD(g.eqd.sd, g.eqd.mean)} ${U.esc(g.eqdUnit)}</td><td colspan="3"></td></tr>` : ''));
    const ar = IP.aspect(st);
    statsHost.innerHTML = `<table class="st-tab ms-tab"><tr><th>Class</th><th>n</th><th>Mean ± SD</th><th>Median</th><th>Range</th><th>CV</th></tr>${rows.join('')}</table>` + (ar ? `<div class="readout">Aspect ratio ${U.esc(ar.L.cls)} / ${U.esc(ar.W.cls)} = <b>${ar.r.toFixed(2)} ± ${ar.se.toFixed(2)}</b> (ratio of the means; ± from their standard errors)</div>` : '');
    const lenClasses = st.filter(g => g.kind !== 'count' && g.n > 1);
    if (!lenClasses.find(g => g.cls + g.kind === histCls)) histCls = lenClasses[0] ? lenClasses[0].cls + lenClasses[0].kind : null;
    histHost.innerHTML = '';
    if (!lenClasses.length) return;
    const hs = el('select', { onchange: () => { histCls = hs.value; drawStats(); } }, lenClasses.map(g => el('option', { value: g.cls + g.kind, text: `${g.cls} (${g.unit})` })));
    hs.value = histCls;
    const g = lenClasses.find(x => x.cls + x.kind === histCls), b = MS.bins(g.values), w = 330, h = 150, ymax = Math.max(...b.counts, 1);
    const X = v => 34 + (v - b.edges[0]) / (b.edges[b.edges.length - 1] - b.edges[0] || 1) * (w - 64), Y = c => h - 24 - c / ymax * (h - 36);
    let svg = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial" font-size="10" class="st-chart">`;
    b.counts.forEach((c, i) => { svg += `<rect x="${X(b.edges[i]) + 0.5}" y="${Y(c)}" width="${Math.max(0.5, X(b.edges[i + 1]) - X(b.edges[i]) - 1)}" height="${h - 24 - Y(c)}" fill="${colOf(g.cls)}" fill-opacity="0.8"/>`; });
    // a normal curve with the same mean and SD, scaled to the counts
    if (g.sd > 0) { let d = ''; for (let i = 0; i <= 60; i++) { const v = b.edges[0] + (b.edges[b.edges.length - 1] - b.edges[0]) * i / 60, y = g.n * b.w / (g.sd * Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * Math.pow((v - g.mean) / g.sd, 2)); d += (i ? ' L ' : 'M ') + X(v).toFixed(1) + ' ' + Math.max(8, Y(y)).toFixed(1); } svg += `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3 2"/>`; }
    svg += `<line x1="34" y1="${h - 24}" x2="${w - 10}" y2="${h - 24}" stroke="currentColor"/><line x1="34" y1="${h - 24}" x2="34" y2="10" stroke="currentColor"/>`;
    [b.edges[0], (b.edges[0] + b.edges[b.edges.length - 1]) / 2, b.edges[b.edges.length - 1]].forEach(v => { svg += `<text x="${X(v)}" y="${h - 11}" text-anchor="middle" fill="currentColor">${IP.fmtN(v)}</text>`; });
    svg += `<text x="30" y="${Y(ymax) + 4}" text-anchor="end" fill="currentColor">${ymax}</text><text x="30" y="${h - 24}" text-anchor="end" fill="currentColor">0</text><text x="${(w + 34) / 2}" y="${h - 1}" text-anchor="middle" fill="currentColor">${U.esc(g.cls)} (${U.esc(g.unit)}) · n = ${g.n}</text></svg>`;
    histHost.append(el('div', { class: 'row', style: { gap: '6px', alignItems: 'center' } }, el('span', { class: 'hint', style: { margin: 0 }, text: 'Histogram' }), hs), el('div', { html: svg }));
  }
  function drawList() {
    listHost.innerHTML = '';
    (p.meas || []).forEach((q, i) => {
      listHost.append(el('div', { class: 'ms-item' + (i === sel ? ' on' : ''), onclick: () => { sel = i; drawList(); draw(); } },
        el('span', { class: 'ms-dot', style: { background: colOf(q.cls || 'Unnamed') } }), el('span', { text: `${i + 1}. ${q.cls || 'Unnamed'} · ${IP.MEAS_TYPES[q.type]}` }), el('b', { text: value(q) }),
        el('button', { class: 'icon-btn', type: 'button', text: '✕', title: 'Remove', onclick: ev => { ev.stopPropagation(); snap(); p.meas.splice(i, 1); sel = -1; refresh(); } })));
    });
  }

  /* ---------- export ---------- */
  const csv = () => {
    const st = IP.measStats(p), rows = ['# ' + (S.doc.meta.title || 'Figure') + ' — measurements on an image panel (RNBeamX)', '# calibration: ' + (IP.nmPerPx(p) ? IP.fmtN(IP.nmPerPx(p)) + ' nm per pixel' : 'none (pixels)'), 'index,class,type,value,unit,points (image pixels)'];
    (p.meas || []).forEach((q, i) => { const g = st.find(x => x.cls === (q.cls || 'Unnamed') && x.kind === IP.kind(q.type)), j = (p.meas || []).filter((r, k) => k < i && (r.cls || 'Unnamed') === (q.cls || 'Unnamed') && IP.kind(r.type) === IP.kind(q.type)).length; rows.push([i + 1, q.cls, q.type, q.type === 'count' ? q.pts.length : g ? g.values[j].toPrecision(6) : '', q.type === 'count' ? 'count' : g ? g.unit : '', '"' + q.pts.map(a => a.join(' ')).join('; ') + '"'].join(',')); });
    rows.push('', 'class,kind,n,mean,SD,SE,median,min,max,CV %,unit');
    st.forEach(g => rows.push([g.cls, g.kind, g.n, g.mean, g.sd, g.se, g.median, g.min, g.max, g.cv].map(v => (typeof v === 'number' ? +v.toPrecision(6) : v)).concat([g.unit]).join(',')));
    const ar = IP.aspect(st); if (ar) rows.push('', `aspect ratio ${ar.L.cls}/${ar.W.cls},${ar.r.toPrecision(5)},± ${ar.se.toPrecision(3)}`);
    U.download(new Blob([rows.join('\n') + '\n'], { type: 'text/csv' }), U.slug(S.doc.meta.title || 'image') + '_measurements.csv');
  };
  const addHist = () => {
    const st = IP.measStats(p).filter(g => g.kind !== 'count' && g.n > 1); if (!st.length) { RNBX.toast('Measure at least two of one kind first'); return; }
    const g = st.find(x => x.cls + x.kind === histCls) || st[0], b = MS.bins(g.values), x = [], y = [];
    b.counts.forEach((c, i) => { x.push(b.edges[i], b.edges[i], b.edges[i + 1], b.edges[i + 1]); y.push(0, c, c, 0); });
    RNBX.arrange.addDataPanel({ series: [{ name: `${g.cls}: ${IP.fmtN(g.mean)} ± ${IP.fmtN(g.sd)} ${g.unit} (n = ${g.n})`, x, y, color: colOf(g.cls) }], xlabel: `${g.cls} (${g.unit})`, ylabel: 'Count' });
    RNBX.toast('Histogram added as a data panel.');
  };
  const addText = () => {
    const lines = IP.summaryText(IP.measStats(p)), ar = IP.aspect(IP.measStats(p)); if (ar) lines.push(`Aspect ratio: ${ar.r.toFixed(2)} ± ${ar.se.toFixed(2)}`);
    if (!lines.length) { RNBX.toast('Nothing measured yet'); return; }
    const t = RNBX.createObject('text', obj.x, obj.y + (p.h || 20) / 2 + 6); t.props.text = lines.join('\n'); t.props.size = 6; RNBX.addObject(t); RNBX.toast('Summary added under the panel.');
  };

  const right = el('div', { class: 'ms-side' },
    el('div', { class: 'ms-tools' }, ...toolBtns),
    el('label', { class: 'st-f' }, el('span', { text: 'Class of new measurements' }), clsSel),
    info, el('h4', { text: 'Statistics' }), statsHost, histHost,
    el('div', { class: 'row ms-acts', style: { gap: '6px', flexWrap: 'wrap', margin: '8px 0' } },
      el('button', { class: 'btn small', type: 'button', text: 'CSV', title: 'Every measurement and the statistics', onclick: csv }),
      el('button', { class: 'btn small', type: 'button', text: 'Add histogram to figure', onclick: addHist }),
      el('button', { class: 'btn small', type: 'button', text: 'Add summary text', onclick: addText }),
      el('button', { class: 'btn small ghost danger', type: 'button', text: 'Clear all', onclick: () => { if ((p.meas || []).length && confirm('Remove all measurements on this panel?')) { snap(); p.meas = []; sel = -1; refresh(); } } })),
    el('h4', { text: 'Measurements' }), listHost);
  const m = D.modal({ title: 'Measure', sub: `${p.pxW} × ${p.pxH} px` + (IP.nmPerPx(p) ? ` · ${IP.fmtN(IP.nmPerPx(p))} nm per pixel` : ' · not calibrated'), wide: true,
    body: el('div', { class: 'ms-wrap' }, host, right),
    foot: [el('span', { class: 'hint', style: { margin: '0 auto 0 0' }, text: 'Everything you measure stays on the panel; Ctrl+Z in the figure removes the whole session.' }), el('button', { class: 'btn primary', type: 'button', text: 'Done', onclick: () => m.close() })],
    onClose: () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', onKeyUp, true); RNBX.changed(); if (RNBX.inspector) RNBX.inspector.build(); } });
  m.root.classList.add('ms-modal');
  fillCls(); hint(); drawStats(); drawList();
  IP.decode(p.href).then(im => {
    img = im;
    const r = host.getBoundingClientRect(), dpr = window.devicePixelRatio || 1, w = Math.max(320, Math.round(r.width)), h = Math.max(260, Math.round(r.height));
    cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px';
    fit(); draw(); cv.focus();
  });
  MS._t = { setTool, add: q => add(Object.assign({ cls }, q)), get: () => p.meas, toImg, scr, close: () => m.close(), fitView: () => { fit(); draw(); }, view: () => ({ s, ox, oy }) };
  return m;
};
})();
