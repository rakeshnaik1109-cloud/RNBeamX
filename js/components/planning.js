/* ═══════════════════════════════════════════════════════════
   RNBeamX — components/planning.js
   Project planning diagrams for proposals, reports and theses:

   • Gantt chart      — tasks as bars on a time axis, written as
                        plain text ("Task | 0-6"), with phases,
                        milestones, progress, dependencies and a
                        "today" line; or scheduled automatically
                        from durations and predecessors.
   • PERT / CPM network — the same task list laid out as a network,
                        with earliest / latest times, slack and the
                        critical path worked out and highlighted.
   • Task card        — one PERT box (task, duration, title, who)
                        to place by hand and join with the Flow
                        connector.

   All follow the figure style (Schematic or Shaded) and are figure
   graphics: they take no part in the ray tracing.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib, H = lib.H, n = H.n;
const CAT = 'Project planning';
if (!lib.CATEGORIES.includes(CAT)) lib.CATEGORIES.splice(lib.CATEGORIES.indexOf('Annotations'), 0, CAT);
const ann = cfg => lib.register(Object.assign({ category: CAT, annotation: true, autoLabel: false, abbr: '' }, cfg));

const esc = s => U.esc(String(s == null ? '' : s));
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const uidOf = (obj, p, tag) => 'rbx-pl-' + tag + '-' + (obj && obj.id ? obj.id : hash(JSON.stringify(p)));
const measure = (s, fs) => (RNBX.text && RNBX.text.measure) ? RNBX.text.measure(String(s), fs) : String(s).length * fs * 0.52;
const txt = (S, x, y, str, size, o = {}) => `<text x="${n(x)}" y="${n(y)}" font-family="${esc(S.font)}" font-size="${n(size)}" fill="${o.color || S.ink}" text-anchor="${o.anchor || 'middle'}" dominant-baseline="central"${o.bold ? ' font-weight="700"' : ''}${o.italic ? ' font-style="italic"' : ''}>${RNBX.text.markup(String(str), size)}</text>`;
const splitLines = s => String(s == null ? '' : s).split(/\n|\\n/);
/* word-wrap a string to a width (explicit line breaks are kept) */
const wrap = (s, fs, maxW) => {
  const out = [];
  splitLines(s).forEach(par => {
    const words = par.split(/\s+/).filter(Boolean); let line = '';
    if (!words.length) { out.push(''); return; }
    words.forEach(w => { const t = line ? line + ' ' + w : w; if (line && measure(t, fs) > maxW) { out.push(line); line = w; } else line = t; });
    out.push(line);
  });
  return out;
};
const block = (S, x, y, L, fs, o) => L.map((t, i) => txt(S, x, y + (i - (L.length - 1) / 2) * fs * 1.18, t, fs, o)).join('');
const palette = (str, dflt) => { const a = String(str || '').split(',').map(q => q.trim()).filter(q => /^#[0-9a-fA-F]{3,6}$/.test(q)); return a.length ? a : dflt; };
const fmtNum = v => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : String(+v.toFixed(2)));
const readable = col => { const c = String(col || '#888').replace('#', ''), f = c.length === 3 ? c.split('').map(q => q + q).join('') : c.slice(0, 6), r = parseInt(f.slice(0, 2), 16), g = parseInt(f.slice(2, 4), 16), b = parseInt(f.slice(4, 6), 16); return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1d1f23' : '#ffffff'; };
const shadeFill = (S, col, id) => S.shaded ? { defs: `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${U.lighten(col, 0.3)}"/><stop offset="1" stop-color="${U.shadeRgb(col, 0.86)}"/></linearGradient>`, fill: `url(#${id})` } : { defs: '', fill: col };

/* ═══════════ task lists ═══════════ */

/* Network form, one task per line:  ID | name | duration | after | who
   "after" lists predecessor IDs (comma separated, "-" for none);
   "who" lists partners / teams (comma separated). */
const parseNet = str => {
  const tasks = [], byId = {};
  String(str || '').split('\n').forEach(raw => {
    const line = raw.trim(); if (!line || line.startsWith('//')) return;
    const f = line.split('|').map(q => q.trim());
    const id = f[0]; if (!id || byId[id]) return;
    const t = { id, name: f[1] || id, d: Math.max(0, parseFloat(f[2]) || 0), after: (f[3] || '').split(/[,;\s]+/).map(q => q.trim()).filter(q => q && q !== '-'), who: (f[4] || '').split(',').map(q => q.trim()).filter(Boolean) };
    tasks.push(t); byId[id] = t;
  });
  tasks.forEach(t => { t.after = t.after.filter(a => byId[a] && a !== t.id); });
  return { tasks, byId };
};
/* critical path method: earliest / latest start and finish, slack, levels */
const cpm = net => {
  const { tasks, byId } = net, succ = {}, indeg = {};
  tasks.forEach(t => { succ[t.id] = []; indeg[t.id] = 0; });
  tasks.forEach(t => t.after.forEach(a => { succ[a].push(t.id); indeg[t.id]++; }));
  const order = [], q = tasks.filter(t => !indeg[t.id]).map(t => t.id), deg = Object.assign({}, indeg);
  while (q.length) { const id = q.shift(); order.push(id); succ[id].forEach(s => { if (--deg[s] === 0) q.push(s); }); }
  const cyclic = order.length < tasks.length;
  tasks.forEach(t => { if (!order.includes(t.id)) order.push(t.id); });          // a loop: keep the rest in input order
  const pos = {}; order.forEach((id, i) => { pos[id] = i; });
  order.forEach(id => { const t = byId[id], ps = t.after.filter(a => pos[a] < pos[id]); t.es = ps.length ? Math.max(...ps.map(a => byId[a].ef)) : 0; t.ef = t.es + t.d; t.level = ps.length ? 1 + Math.max(...ps.map(a => byId[a].level)) : 0; });
  const T = tasks.length ? Math.max(...tasks.map(t => t.ef)) : 0;
  order.slice().reverse().forEach(id => { const t = byId[id], ss = succ[id].filter(s => pos[s] > pos[id]); t.lf = ss.length ? Math.min(...ss.map(s => byId[s].ls)) : T; t.ls = t.lf - t.d; t.slack = t.ls - t.es; t.crit = Math.abs(t.slack) < 1e-9; });
  const path = []; let cur = tasks.filter(t => t.crit && !t.after.some(a => byId[a].crit && Math.abs(byId[a].ef - t.es) < 1e-9)).sort((a, b) => a.es - b.es)[0];
  while (cur) { path.push(cur.id); const nx = succ[cur.id].map(s => byId[s]).find(s => s.crit && Math.abs(s.es - cur.ef) < 1e-9); cur = nx; }
  return { T, succ, order, cyclic, path };
};

/* Bar form for the Gantt chart, one line each:
     Task name | 0-6            a bar from 0 to 6
     Task name | 3-12 | 40%     with 40 % done
     Task name | 3-12 | #e07b39 in its own colour
     ◆ Review | 12              a milestone (also "* Review | 12")
     # Phase 1                  a phase / section heading          */
const parseBars = str => {
  const rows = []; let sec = -1;
  String(str || '').split('\n').forEach(raw => {
    const line = raw.trim(); if (!line || line.startsWith('//')) return;
    if (line.startsWith('#') && !/^#[0-9a-fA-F]{3,6}\b/.test(line)) { sec++; rows.push({ kind: 'section', name: line.replace(/^#+\s*/, ''), sec }); return; }
    const f = line.split('|').map(q => q.trim()); let name = f[0], ms = false;
    if (/^(◆|\*|♦)/.test(name)) { ms = true; name = name.replace(/^(◆|\*|♦)\s*/, ''); }
    const m = (f[1] || '').match(/^(-?[\d.]+)\s*(?:-|–|—|to)\s*(-?[\d.]+)$/), one = (f[1] || '').match(/^(-?[\d.]+)$/);
    let a, b;
    if (m) { a = +m[1]; b = +m[2]; if (b < a) [a, b] = [b, a]; } else if (one) { a = b = +one[1]; ms = true; } else return;
    const r = { kind: ms ? 'milestone' : 'bar', name, a, b, sec: Math.max(0, sec) };
    f.slice(2).forEach(x => { if (/^\d+(\.\d+)?\s*%$/.test(x)) r.progress = Math.min(100, parseFloat(x)); else if (/^#[0-9a-fA-F]{3,6}$/.test(x)) r.color = x; });
    rows.push(r);
  });
  return rows;
};
const parseDeps = str => String(str || '').split(/[,;\n]+/).map(q => q.trim().match(/^(\d+)\s*(?:>|->|→)\s*(\d+)$/)).filter(Boolean).map(m => [+m[1], +m[2]]);

/* ═══════════ Gantt chart ═══════════ */
const GANTT_TASKS = [
  '# Phase 1 · Preparation',
  'Literature survey | 0-4',
  'Team and equipment | 0-6',
  '# Phase 2 · Development',
  'Design and simulation | 3-10',
  'Build the prototype | 8-18 | 70%',
  '◆ Prototype review | 18',
  '# Phase 3 · Studies',
  'Data collection | 12-30 | 35%',
  'Analysis and modelling | 16-32',
  'Field evaluation | 26-34',
  '# Phase 4 · Dissemination',
  'Papers and reports | 20-36',
  '◆ Final report | 36',
].join('\n');
const GANTT_NET = [
  'A | Planning | 2 | - | Team 1',
  'B | Hardware design | 4 | A | Team 1',
  'C | Software design | 3 | A | Team 2',
  'D | Procurement | 3 | A | Team 1, Team 2',
  'E | Assembly | 2 | B, D | Team 1',
  'F | Software build | 5 | C | Team 2',
  'G | Integration and testing | 3 | E, F | Team 1, Team 2',
  'H | Pilot study | 4 | G | Team 2',
  'I | Final report | 2 | H | Team 1, Team 2',
].join('\n');
const PERT_NET = [
  'A | Planning | 2 | - | Team 1',
  'B | Design | 4 | A | Team 1',
  'C | Procurement | 3 | A | Team 2',
  'D | Build and assembly | 3 | B, C | Team 1',
  'E | Software | 5 | B | Team 2',
  'F | Testing | 3 | D, E | Team 1, Team 2',
  'G | Report | 2 | F | Team 1, Team 2',
].join('\n');
const SECTION_COLS = ['#4e79a7', '#e07b39', '#59a14f', '#b07aa1', '#76b7b2', '#edc948', '#e15759', '#9c755f'];

ann({ type: 'gantt', name: 'Gantt chart', keywords: 'gantt chart timeline schedule project plan work plan tasks months milestones proposal grant phases bar chart activities',
  defaults: { mode: 'bars', tasks: GANTT_TASKS, net: GANTT_NET, deps: '', unit: 'months', taskTitle: 'Task', axisTitle: 'Time (months)', tmin: 0, tmax: 0, step: 6,
    labelW: 52, chartW: 110, rowH: 7, barH: 0.62, size: 7, align: 'right', number: false, axis: 'bottom', grid: true, rowTicks: true, stripes: false, frame: false,
    colorBy: 'single', barColor: '#e07b39', colors: SECTION_COLS.join(', '), msColor: '#d62828', critColor: '#d62828', round: 0.2, durLabels: 'none', now: '', nowLabel: 'Today', depColor: '#5b6470', sectionBands: true },
  params: [
    { key: 'mode', label: 'Tasks given as', type: 'select', options: [['bars', 'Start – end of each task'], ['net', 'Durations and predecessors (scheduled for you)']] },
    { key: 'tasks', label: 'Tasks', type: 'textarea', rows: 10, show: p => p.mode !== 'net', hint: 'one per line — Name | 0-6 ;  add | 40% for progress or | #hex for a colour ;  ◆ Name | 12 for a milestone ;  # Phase for a heading ;  \\n in a name breaks the line' },
    { key: 'net', label: 'Tasks (ID | name | duration | after | who)', type: 'textarea', rows: 10, show: p => p.mode === 'net', hint: 'e.g. E | Assembly | 2 | B, D — each task starts when all the tasks it comes after have finished; the critical path is drawn in its own colour' },
    { key: 'deps', label: 'Arrows between tasks', type: 'text', show: p => p.mode !== 'net', placeholder: 'e.g. 2>3, 3>5 (task numbers, counted from the top)' },
    { key: 'taskTitle', label: 'Heading over the tasks', type: 'text' }, { key: 'axisTitle', label: 'Heading over the time axis', type: 'text' },
    { key: 'unit', label: 'Time unit (for labels)', type: 'text', placeholder: 'months, weeks, days, quarters' },
    { key: 'tmin', label: 'Axis starts at', type: 'number', step: 1 }, { key: 'tmax', label: 'Axis ends at (0 = automatic)', type: 'number', min: 0, step: 1 },
    { key: 'step', label: 'Tick every', type: 'number', min: 0.1, step: 0.5 },
    { key: 'axis', label: 'Axis labels', type: 'select', options: [['bottom', 'Bottom'], ['top', 'Top'], ['both', 'Top and bottom']] },
    { key: 'labelW', label: 'Width of the task column', type: 'number', unit: 'mm', min: 10, max: 200, step: 1 },
    { key: 'chartW', label: 'Width of the time axis', type: 'number', unit: 'mm', min: 20, max: 400, step: 1 },
    { key: 'rowH', label: 'Row height', type: 'number', unit: 'mm', min: 2, max: 40, step: 0.5 },
    { key: 'barH', label: 'Bar thickness (share of a row)', type: 'range', min: 0.2, max: 1, step: 0.01 },
    { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5 },
    { key: 'align', label: 'Task names', type: 'select', options: [['right', 'Right-aligned next to the bars'], ['left', 'Left-aligned'], ['inbar', 'Inside / beside the bars']] },
    { key: 'number', label: 'Number the tasks', type: 'bool' },
    { key: 'colorBy', label: 'Bar colours', type: 'select', show: p => p.mode !== 'net', options: [['single', 'One colour'], ['section', 'By phase'], ['row', 'Each task its own']] },
    { key: 'barColor', label: 'Bar colour', type: 'color' },
    { key: 'colors', label: 'Colours by phase / task (comma separated)', type: 'text', show: p => p.mode !== 'net' && p.colorBy !== 'single' },
    { key: 'critColor', label: 'Critical-path colour', type: 'color', show: p => p.mode === 'net' },
    { key: 'msColor', label: 'Milestone colour', type: 'color', show: p => p.mode !== 'net' },
    { key: 'round', label: 'Rounded bar ends', type: 'range', min: 0, max: 0.5, step: 0.01 },
    { key: 'durLabels', label: 'Duration on the bars', type: 'select', options: [['none', 'None'], ['inside', 'Inside the bar'], ['after', 'After the bar']] },
    { key: 'grid', label: 'Vertical grid lines', type: 'bool' }, { key: 'rowTicks', label: 'Row separators by the names', type: 'bool' },
    { key: 'stripes', label: 'Shade alternate rows', type: 'bool' }, { key: 'sectionBands', label: 'Phase headings as bands', type: 'bool', show: p => p.mode !== 'net' },
    { key: 'frame', label: 'Frame around the chart', type: 'bool' },
    { key: 'now', label: 'Marker line at time', type: 'text', placeholder: 'e.g. 14 (empty = none)' }, { key: 'nowLabel', label: 'Marker label', type: 'text', show: p => String(p.now).trim() !== '' },
    { key: 'depColor', label: 'Arrow colour', type: 'color' },
  ],
  /* rows in drawing order, with times — from either input form */
  rows(p) {
    if (p.mode === 'net') {
      const net = parseNet(p.net), c = cpm(net);
      const rows = c.order.map(id => net.byId[id]).sort((a, b) => a.es - b.es || a.ef - b.ef).map(t => ({ kind: 'bar', name: t.name, id: t.id, a: t.es, b: t.ef, crit: t.crit, slack: t.slack, after: t.after, sec: 0 }));
      const idx = {}; rows.forEach((r, i) => { idx[r.id] = i; });
      const deps = []; rows.forEach((r, i) => r.after.forEach(a => deps.push([idx[a], i])));
      return { rows, deps, T: c.T };
    }
    const rows = parseBars(p.tasks), items = rows.map((r, i) => i).filter(i => rows[i].kind !== 'section');
    const deps = parseDeps(p.deps).map(([a, b]) => [items[a - 1], items[b - 1]]).filter(([a, b]) => a != null && b != null && a !== b);
    return { rows, deps, T: rows.reduce((m, r) => r.kind === 'section' ? m : Math.max(m, r.b), 0) };
  },
  geom(p) {
    const R = this.rows(p), fs = U.pt2mm(p.size || 7), step = Math.max(0.1, +p.step || 1);
    const t0 = +p.tmin || 0, last = Math.max(t0 + step, R.T), t1 = (+p.tmax > t0) ? +p.tmax : t0 + Math.ceil((last - t0) / step - 1e-9) * step;
    const head = (p.taskTitle || p.axisTitle) ? fs * 2.2 : 0, axTop = (p.axis === 'top' || p.axis === 'both') ? fs * 1.9 : 0, axBot = (p.axis === 'bottom' || p.axis === 'both') ? fs * 1.9 : 0;
    const labelW = p.align === 'inbar' ? 0 : p.labelW, W = labelW + p.chartW, Hh = head + axTop + R.rows.length * p.rowH + axBot;
    return { R, fs, step, t0, t1, head, axTop, axBot, labelW, W, H: Hh };
  },
  bbox(p) { const g = this.geom(p), pad = g.fs * 0.6; return [-g.W / 2 - pad, -g.H / 2 - pad, g.W / 2 + pad + (p.durLabels === 'after' || p.align === 'inbar' ? g.fs * 6 : 0), g.H / 2 + pad]; },
  draw(p, S, obj) {
    const g = this.geom(p), { R, fs } = g, uid = uidOf(obj, p, 'gt'), ink = S.ink, net = p.mode === 'net';
    const x0 = -g.W / 2, cx0 = x0 + g.labelW, cx1 = g.W / 2, top = -g.H / 2, rowsTop = top + g.head + g.axTop, rowsBot = rowsTop + R.rows.length * p.rowH;
    const X = t => cx0 + (t - g.t0) / (g.t1 - g.t0) * p.chartW, rowY = i => rowsTop + (i + 0.5) * p.rowH;
    const cols = palette(p.colors, SECTION_COLS), unit = String(p.unit || '').trim();
    let defs = '', back = '', grid = '', s = '', fore = '', k = 0;
    const colorOf = (r, i) => {
      if (r.color) return r.color;
      if (net) return r.crit ? p.critColor : p.barColor;
      if (p.colorBy === 'section') return cols[r.sec % cols.length];
      if (p.colorBy === 'row') return cols[(k++) % cols.length];
      return p.barColor;
    };
    // headings
    if (g.head) {
      if (p.taskTitle && g.labelW) s += txt(S, x0 + g.labelW / 2, top + g.head * 0.45, p.taskTitle, fs * 1.08, { bold: true });
      if (p.axisTitle) s += txt(S, (cx0 + cx1) / 2, top + g.head * 0.45, p.axisTitle, fs * 1.08, { bold: true });
    }
    // row backgrounds
    R.rows.forEach((r, i) => {
      const y = rowsTop + i * p.rowH;
      if (r.kind === 'section' && p.sectionBands && !net) back += `<rect x="${n(x0)}" y="${n(y)}" width="${n(g.W)}" height="${n(p.rowH)}" fill="${cols[r.sec % cols.length]}" fill-opacity="0.12"/>`;
      else if (p.stripes && i % 2 === 1) back += `<rect x="${n(x0)}" y="${n(y)}" width="${n(g.W)}" height="${n(p.rowH)}" fill="${ink}" fill-opacity="0.045"/>`;
    });
    // grid and axis
    const ticks = []; for (let t = g.t0; t <= g.t1 + g.step * 1e-6; t += g.step) ticks.push(+t.toFixed(6));
    const lw = S.lw, gl = Math.max(0.12, lw * 0.6);
    if (p.grid) ticks.forEach(t => { grid += `<line x1="${n(X(t))}" y1="${n(rowsTop)}" x2="${n(X(t))}" y2="${n(rowsBot)}" stroke="${ink}" stroke-opacity="0.35" stroke-width="${n(gl)}"/>`; });
    const axis = (y, up) => `<line x1="${n(cx0)}" y1="${n(y)}" x2="${n(cx1)}" y2="${n(y)}" stroke="${ink}" stroke-width="${n(lw)}"/>` + ticks.map(t => `<line x1="${n(X(t))}" y1="${n(y)}" x2="${n(X(t))}" y2="${n(y + (up ? -1 : 1) * fs * 0.35)}" stroke="${ink}" stroke-width="${n(lw)}"/>` + txt(S, X(t), y + (up ? -1 : 1) * fs * 1.05, fmtNum(t), fs)).join('');
    if (g.axBot) grid += axis(rowsBot, false);
    if (g.axTop) grid += axis(rowsTop, true);
    if (g.labelW) grid += `<line x1="${n(cx0)}" y1="${n(rowsTop)}" x2="${n(cx0)}" y2="${n(rowsBot)}" stroke="${ink}" stroke-width="${n(lw)}"/>`;
    if (p.rowTicks && g.labelW) for (let i = 1; i < R.rows.length; i++) grid += `<line x1="${n(cx0 - fs * 0.45)}" y1="${n(rowsTop + i * p.rowH)}" x2="${n(cx0)}" y2="${n(rowsTop + i * p.rowH)}" stroke="${ink}" stroke-width="${n(lw)}"/>`;
    if (p.frame) grid += `<rect x="${n(x0)}" y="${n(rowsTop)}" width="${n(g.W)}" height="${n(rowsBot - rowsTop)}" fill="none" stroke="${ink}" stroke-width="${n(lw)}"/>`;
    // rows
    let num = 0; const ends = {};
    R.rows.forEach((r, i) => {
      const y = rowY(i), bh = p.rowH * p.barH;
      if (r.kind === 'section') {
        const tx = p.align === 'inbar' ? cx0 + fs * 0.4 : x0 + fs * 0.4;
        s += txt(S, tx, y, r.name, fs * 1.02, { bold: true, anchor: 'start', color: net ? ink : U.shadeRgb(cols[r.sec % cols.length], 0.7) });
        return;
      }
      num++;
      const label = (p.number ? num + '. ' : '') + r.name, col = colorOf(r, i), xa = X(r.a), xb = X(r.b);
      ends[i] = { xa, xb, y, ms: r.kind === 'milestone' };
      if (p.align !== 'inbar') {
        const maxW = g.labelW - fs * 1.2, L = wrap(label, fs, maxW).slice(0, Math.max(1, Math.floor(p.rowH / (fs * 1.18))));
        s += block(S, p.align === 'left' ? x0 + fs * 0.4 : cx0 - fs * 0.8, y, L, fs, { anchor: p.align === 'left' ? 'start' : 'end' });
      }
      if (r.kind === 'milestone') {
        const d = bh * 0.62, c = r.color || (net ? p.barColor : p.msColor), f = shadeFill(S, c, uid + 'm' + i);
        defs += f.defs;
        fore += `<path d="M ${n(xa)} ${n(y - d)} L ${n(xa + d)} ${n(y)} L ${n(xa)} ${n(y + d)} L ${n(xa - d)} ${n(y)} Z" fill="${f.fill}" stroke="${U.shadeRgb(c, 0.6)}" stroke-width="${n(lw * 0.6)}"/>`;
        if (p.align === 'inbar') fore += txt(S, xa + d + fs * 0.5, y, label, fs, { anchor: 'start' });
        return;
      }
      const w = Math.max(0.2, xb - xa), rx = Math.min(bh / 2, bh * p.round), f = shadeFill(S, col, uid + 'b' + i);
      defs += f.defs;
      if (S.shaded) fore += `<rect x="${n(xa + 0.35)}" y="${n(y - bh / 2 + 0.45)}" width="${n(w)}" height="${n(bh)}" rx="${n(rx)}" fill="#000000" fill-opacity="0.14"/>`;
      if (r.progress != null) {
        const pw = w * r.progress / 100, clip = uid + 'c' + i;
        defs += `<clipPath id="${clip}"><rect x="${n(xa)}" y="${n(y - bh / 2)}" width="${n(pw)}" height="${n(bh)}"/></clipPath>`;
        fore += `<rect x="${n(xa)}" y="${n(y - bh / 2)}" width="${n(w)}" height="${n(bh)}" rx="${n(rx)}" fill="${U.lighten(col, 0.55)}" stroke="${col}" stroke-width="${n(lw * 0.5)}"/>`;
        fore += `<rect x="${n(xa)}" y="${n(y - bh / 2)}" width="${n(w)}" height="${n(bh)}" rx="${n(rx)}" fill="${f.fill}" clip-path="url(#${clip})"/>`;
      } else fore += `<rect x="${n(xa)}" y="${n(y - bh / 2)}" width="${n(w)}" height="${n(bh)}" rx="${n(rx)}" fill="${f.fill}"/>`;
      const dur = fmtNum(r.b - r.a) + (unit ? ' ' + unit.replace(/s$/, (r.b - r.a) === 1 ? '' : 's') : ''), fsl = fs * 0.88;
      // text on a part-done bar sits mostly on its pale remainder: use ink there
      const onBar = r.progress != null && r.progress < 50 ? S.ink : readable(col);
      const inLabel = p.durLabels === 'inside' ? (r.progress != null ? dur + ' · ' + fmtNum(r.progress) + '%' : dur) : null;
      if (p.align === 'inbar') {
        const tw = measure(label, fsl);
        fore += tw + fs < w ? txt(S, xa + w / 2, y, label, fsl, { color: onBar }) : txt(S, xb + fs * 0.5, y, label, fsl, { anchor: 'start' });
      } else if (inLabel && measure(inLabel, fsl) + fs * 0.6 < w) fore += txt(S, xa + w / 2, y, inLabel, fsl, { color: onBar });
      if (p.durLabels === 'after' || (inLabel && measure(inLabel, fsl) + fs * 0.6 >= w && p.align !== 'inbar')) fore += txt(S, xb + fs * 0.45, y, inLabel || dur, fsl, { anchor: 'start', color: S.ink });
    });
    // dependency arrows: from the end of one task to the start of another
    const hs = Math.max(0.9, fs * 0.42), dw = Math.max(0.15, lw * 0.7);
    R.deps.forEach(([a, b]) => {
      const A = ends[a], B = ends[b]; if (!A || !B) return;
      const crit = net && R.rows[a].crit && R.rows[b].crit && Math.abs(R.rows[a].b - R.rows[b].a) < 1e-9, col = crit ? p.critColor : p.depColor;
      const xs = A.ms ? A.xa : A.xb, xe = B.ms ? B.xa - p.rowH * p.barH * 0.62 : B.xa, gap = fs * 0.5, dn = B.y > A.y ? 1 : -1, tip = xe - hs * 0.8;
      let d;
      if (B.ms && Math.abs(B.xa - xs) < gap && B.y > A.y) {   // a milestone right under the end of its task: straight down
        const dm = p.rowH * p.barH * 0.62, y0 = A.y + p.rowH * p.barH / 2, y1 = B.y - dm;
        fore += `<path d="M ${n(B.xa)} ${n(y0)} L ${n(B.xa)} ${n(y1 - hs * 0.8)}" fill="none" stroke="${col}" stroke-width="${n(dw)}"/>` + H.arrowHead(B.xa, y1, Math.PI / 2, hs, col);
        return;
      }
      if (xe - xs >= gap * 0.6 + hs * 1.5) { const mx = xs + gap * 0.6; d = `M ${n(xs)} ${n(A.y)} L ${n(mx)} ${n(A.y)} L ${n(mx)} ${n(B.y)} L ${n(tip)} ${n(B.y)}`; }
      else { const yy = A.y + dn * p.rowH / 2, mx = xs + gap * 0.6, bx = xe - gap - hs; d = `M ${n(xs)} ${n(A.y)} L ${n(mx)} ${n(A.y)} L ${n(mx)} ${n(yy)} L ${n(bx)} ${n(yy)} L ${n(bx)} ${n(B.y)} L ${n(tip)} ${n(B.y)}`; }
      fore += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(dw)}" stroke-linejoin="round"/>` + H.arrowHead(xe, B.y, 0, hs, col);
    });
    // a marker line ("today", a review date …)
    const nowV = parseFloat(p.now);
    if (String(p.now).trim() !== '' && isFinite(nowV) && nowV >= g.t0 && nowV <= g.t1) {
      const x = X(nowV), c = '#d62828';
      fore += `<line x1="${n(x)}" y1="${n(rowsTop)}" x2="${n(x)}" y2="${n(rowsBot)}" stroke="${c}" stroke-width="${n(lw * 1.2)}" stroke-dasharray="${n(lw * 5)} ${n(lw * 3)}"/>`;
      // the label sits at the foot of the line, clear of the headings
      if (p.nowLabel) { const lbl = p.nowLabel, fl = fs * 0.85, tw = measure(lbl, fl) + fl * 0.8, ly = rowsBot - fl * 1.1, right = x + tw + fl * 0.4 <= cx1, lx = right ? x + fl * 0.3 : x - fl * 0.3 - tw;
        fore += `<rect x="${n(lx)}" y="${n(ly - fl * 0.65)}" width="${n(tw)}" height="${n(fl * 1.3)}" rx="${n(fl * 0.25)}" fill="#ffffff" fill-opacity="0.9"/>` + txt(S, lx + tw / 2, ly, lbl, fl, { color: c, bold: true }); }
    }
    return (defs ? `<defs>${defs}</defs>` : '') + back + grid + s + fore;
  },
  variants: [
    { name: 'Gantt chart · phases in colour', props: { colorBy: 'section', durLabels: 'inside', stripes: false } },
    { name: 'Gantt chart · scheduled from dependencies', props: { mode: 'net', durLabels: 'inside', taskTitle: 'Task', axisTitle: 'Time (months)', step: 2, barColor: '#4e79a7', grid: true } },
    { name: 'Gantt chart · names on the bars', props: { align: 'inbar', colorBy: 'row', chartW: 140, rowH: 6, grid: true, stripes: true, taskTitle: '' } },
  ] });

/* ═══════════ PERT card (one box) ═══════════ */
const PARTNER_COLS = ['#bcd9f0', '#f6b8b8', '#cde8c3', '#f5e0a6', '#dccdf0', '#c9ece9'];
/* draw one card centred on (cx, cy); returns svg */
const card = (S, cx, cy, o) => {
  const { w, h } = o, lw = S.lw, ink = S.ink, fs = o.fs, x = cx - w / 2, y = cy - h / 2;
  const hh = Math.max(fs * 1.6, h * 0.24), fh = o.who.length ? Math.max(fs * 1.6, h * 0.22) : 0, bodyH = h - hh - fh;
  let s = '';
  if (S.shaded) s += `<rect x="${n(x + 0.5)}" y="${n(y + 0.6)}" width="${n(w)}" height="${n(h)}" fill="#000000" fill-opacity="0.14"/>`;
  s += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${o.bodyFill}"/>`;
  if (o.style === 'aon') {
    // classic activity-on-node box: ES | duration | EF  /  name  /  LS | slack | LF
    const c3 = w / 3, row = (yy, a, b, c, fill) => `<rect x="${n(x)}" y="${n(yy)}" width="${n(w)}" height="${n(hh)}" fill="${fill}"/>` + [a, b, c].map((t, i) => txt(S, x + c3 * (i + 0.5), yy + hh / 2, t, fs * 0.92, { color: readable(fill) })).join('') + [1, 2].map(i => `<line x1="${n(x + c3 * i)}" y1="${n(yy)}" x2="${n(x + c3 * i)}" y2="${n(yy + hh)}" stroke="${ink}" stroke-width="${n(lw * 0.6)}"/>`).join('');
    s += row(y, o.es, o.dur, o.ef, o.headFill) + row(y + h - hh, o.ls, o.slack, o.lf, o.footFill);
    s += block(S, cx, y + h / 2, wrap(o.title, fs, w - fs).slice(0, Math.max(1, Math.floor((h - 2 * hh) / (fs * 1.18)))), fs, { bold: true });
    s += `<line x1="${n(x)}" y1="${n(y + hh)}" x2="${n(x + w)}" y2="${n(y + hh)}" stroke="${ink}" stroke-width="${n(lw * 0.6)}"/><line x1="${n(x)}" y1="${n(y + h - hh)}" x2="${n(x + w)}" y2="${n(y + h - hh)}" stroke="${ink}" stroke-width="${n(lw * 0.6)}"/>`;
  } else {
    const split = w * o.split;
    s += `<rect x="${n(x)}" y="${n(y)}" width="${n(split)}" height="${n(hh)}" fill="${o.idFill}"/><rect x="${n(x + split)}" y="${n(y)}" width="${n(w - split)}" height="${n(hh)}" fill="${o.durFill}"/>`;
    s += txt(S, x + split / 2, y + hh / 2, o.id, fs, { bold: true, color: readable(o.idFill) }) + txt(S, x + split + (w - split) / 2, y + hh / 2, o.dur, fs, { bold: true, color: readable(o.durFill) });
    s += `<line x1="${n(x)}" y1="${n(y + hh)}" x2="${n(x + w)}" y2="${n(y + hh)}" stroke="${ink}" stroke-width="${n(lw * 0.6)}"/>`;
    s += block(S, cx, y + hh + bodyH / 2, wrap(o.title, fs, w - fs).slice(0, Math.max(1, Math.floor(bodyH / (fs * 1.18)))), fs, { bold: true });
    if (fh) {
      const cw = w / o.who.length;
      o.who.forEach((t, i) => { const c = o.whoCol(t); s += `<rect x="${n(x + i * cw)}" y="${n(y + h - fh)}" width="${n(cw)}" height="${n(fh)}" fill="${c}"/>` + txt(S, x + (i + 0.5) * cw, y + h - fh / 2, t, fs * 0.92, { bold: true, color: readable(c) }) + (i ? `<line x1="${n(x + i * cw)}" y1="${n(y + h - fh)}" x2="${n(x + i * cw)}" y2="${n(y + h)}" stroke="${ink}" stroke-width="${n(lw * 0.6)}"/>` : ''); });
      s += `<line x1="${n(x)}" y1="${n(y + h - fh)}" x2="${n(x + w)}" y2="${n(y + h - fh)}" stroke="${ink}" stroke-width="${n(lw * 0.6)}"/>`;
    }
  }
  s += `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="none" stroke="${o.crit ? o.critColor : ink}" stroke-width="${n(o.crit ? lw * 2.2 : lw)}"/>`;
  return s;
};
const whoColour = (list, cols) => { const map = {}; let k = 0; return t => (map[t] = map[t] || cols[(k++) % cols.length]); };

ann({ type: 'pertcard', name: 'Task card (PERT box)', keywords: 'pert task card box activity node project plan duration partner team work package flowchart proposal',
  defaults: { id: 'Task 1', dur: '3 months', title: 'Design and\nsimulation', who: 'Team 1, Team 2', w: 46, h: 24, size: 7, split: 0.5,
    idFill: '#1f9bd7', durFill: '#9bcf6e', bodyFill: '#ffffff', colors: PARTNER_COLS.join(', '), crit: false, critColor: '#d62828' },
  params: [
    { key: 'id', label: 'Task (top left)', type: 'text' }, { key: 'dur', label: 'Duration (top right)', type: 'text' },
    { key: 'title', label: 'Title', type: 'textarea', hint: 'wraps to the width; \\n or Enter breaks the line' },
    { key: 'who', label: 'Partners / teams (bottom, comma separated)', type: 'text', placeholder: 'empty = no bottom row' },
    { key: 'w', label: 'Width', type: 'number', unit: 'mm', min: 10, max: 200, step: 0.5 }, { key: 'h', label: 'Height', type: 'number', unit: 'mm', min: 6, max: 200, step: 0.5 },
    { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5 },
    { key: 'split', label: 'Split of the top row', type: 'range', min: 0.2, max: 0.8, step: 0.01 },
    { key: 'idFill', label: 'Task cell colour', type: 'color' }, { key: 'durFill', label: 'Duration cell colour', type: 'color' }, { key: 'bodyFill', label: 'Body colour', type: 'color' },
    { key: 'colors', label: 'Partner colours (comma separated, in order)', type: 'text' },
    { key: 'crit', label: 'Highlight (e.g. on the critical path)', type: 'bool' }, { key: 'critColor', label: 'Highlight colour', type: 'color', show: p => p.crit },
  ],
  resizable: true,
  bbox: p => [-p.w / 2, -p.h / 2, p.w / 2, p.h / 2],
  draw(p, S) {
    const who = String(p.who || '').split(',').map(q => q.trim()).filter(Boolean);
    return card(S, 0, 0, { w: p.w, h: p.h, fs: U.pt2mm(p.size || 7), style: 'card', split: p.split, id: p.id, dur: p.dur, title: p.title, who, whoCol: whoColour(who, palette(p.colors, PARTNER_COLS)),
      idFill: p.idFill, durFill: p.durFill, bodyFill: p.bodyFill, crit: p.crit, critColor: p.critColor });
  },
  variants: [
    { name: 'Task card · highlighted', props: { id: 'Task 4', dur: '2 months', title: 'Integration and testing', crit: true } },
    { name: 'Task card · one team', props: { id: 'WP 2', dur: '6 months', title: 'Data collection', who: 'Team 2', idFill: '#5b6fb5', durFill: '#f2c14e' } },
  ] });

/* ═══════════ PERT / CPM network ═══════════ */
ann({ type: 'pert', name: 'PERT / CPM network', keywords: 'pert cpm critical path network diagram project plan activity on node schedule dependencies precedence slack float proposal work packages',
  defaults: { net: PERT_NET, style: 'card', unit: 'months', dir: 'lr', w: 28, h: 17, gapX: 8, gapY: 6, size: 6.5, edges: 'elbow', startEnd: true, startText: 'Start', endText: 'Finish',
    showCrit: true, critColor: '#d62828', idFill: '#1f9bd7', durFill: '#9bcf6e', bodyFill: '#ffffff', colors: PARTNER_COLS.join(', '), legend: true, summary: true, edgeColor: '' },
  params: [
    { key: 'net', label: 'Tasks (ID | name | duration | after | who)', type: 'textarea', rows: 10, hint: 'one per line, e.g. G | Integration | 3 | E, F | Team 1, Team 2 — "after" lists the tasks that must finish first ("-" for none); "who" is optional' },
    { key: 'style', label: 'Boxes', type: 'select', options: [['card', 'Task cards (task, duration, title, who)'], ['aon', 'Activity on node (ES · duration · EF / LS · slack · LF)']] },
    { key: 'unit', label: 'Time unit', type: 'text', placeholder: 'months, weeks, days' },
    { key: 'dir', label: 'Direction', type: 'select', options: [['lr', 'Left to right'], ['tb', 'Top to bottom']] },
    { key: 'w', label: 'Box width', type: 'number', unit: 'mm', min: 10, max: 120, step: 0.5 }, { key: 'h', label: 'Box height', type: 'number', unit: 'mm', min: 6, max: 80, step: 0.5 },
    { key: 'gapX', label: 'Gap between columns', type: 'number', unit: 'mm', min: 3, max: 80, step: 0.5 }, { key: 'gapY', label: 'Gap between rows', type: 'number', unit: 'mm', min: 1, max: 60, step: 0.5 },
    { key: 'size', label: 'Text size', type: 'number', unit: 'pt', min: 3, max: 30, step: 0.5 },
    { key: 'edges', label: 'Arrows', type: 'select', options: [['elbow', 'Right angles'], ['curve', 'Curved'], ['straight', 'Straight']] },
    { key: 'edgeColor', label: 'Arrow colour (empty = figure ink)', type: 'color', allowEmpty: true },
    { key: 'startEnd', label: 'Start and finish nodes', type: 'bool' },
    { key: 'startText', label: 'Start text', type: 'text', show: p => p.startEnd }, { key: 'endText', label: 'Finish text', type: 'text', show: p => p.startEnd },
    { key: 'showCrit', label: 'Highlight the critical path', type: 'bool' }, { key: 'critColor', label: 'Critical-path colour', type: 'color', show: p => p.showCrit },
    { key: 'idFill', label: 'Task cell colour', type: 'color', show: p => p.style === 'card' }, { key: 'durFill', label: 'Duration cell colour', type: 'color', show: p => p.style === 'card' },
    { key: 'bodyFill', label: 'Box colour', type: 'color' },
    { key: 'colors', label: 'Partner colours (comma separated, in order of appearance)', type: 'text', show: p => p.style === 'card' },
    { key: 'legend', label: 'Legend of partners', type: 'bool', show: p => p.style === 'card' },
    { key: 'summary', label: 'Total duration and critical path underneath', type: 'bool' },
  ],
  layout(p) {
    const net = parseNet(p.net), c = cpm(net), tb = p.dir === 'tb', fs = U.pt2mm(p.size || 6.5);
    const levels = []; net.tasks.forEach(t => { (levels[t.level] = levels[t.level] || []).push(t); });
    // order each column by the average position of its predecessors (fewer crossings)
    const rank = {};
    levels.forEach((col, li) => {
      if (li) col.sort((a, b) => { const m = t => t.after.length ? t.after.reduce((s, q) => s + (rank[q] || 0), 0) / t.after.length : 0; return m(a) - m(b); });
      col.forEach((t, i) => { rank[t.id] = i - (col.length - 1) / 2; });
    });
    const along = p.w + p.gapX, across = p.h + p.gapY, aStep = tb ? p.h + p.gapY : along, xStep = tb ? p.w + p.gapX : across;
    const lead = p.startEnd ? 1 : 0, nCols = levels.length + 2 * lead, pos = {};
    levels.forEach((col, li) => col.forEach(t => { const a = (li + lead) * aStep, b = rank[t.id] * xStep; pos[t.id] = tb ? [b, a] : [a, b]; }));
    const termW = Math.min(p.w * 0.7, Math.max(fs * 6, 16)), termH = Math.min(p.h * 0.55, fs * 2.6);
    const ends = p.startEnd && net.tasks.length ? { start: tb ? [0, 0] : [0, 0], finish: tb ? [0, (nCols - 1) * aStep] : [(nCols - 1) * aStep, 0] } : null;
    // centre everything on the origin
    const pts = Object.values(pos).concat(ends ? [ends.start, ends.finish] : []);
    const minX = Math.min(...pts.map(q => q[0]), 0), maxX = Math.max(...pts.map(q => q[0]), 0), minY = Math.min(...pts.map(q => q[1]), 0), maxY = Math.max(...pts.map(q => q[1]), 0);
    const ox = (minX + maxX) / 2, oy = (minY + maxY) / 2, mv = q => [q[0] - ox, q[1] - oy];
    Object.keys(pos).forEach(k => { pos[k] = mv(pos[k]); }); if (ends) { ends.start = mv(ends.start); ends.finish = mv(ends.finish); }
    const halfW = (maxX - minX) / 2 + p.w / 2, halfH = (maxY - minY) / 2 + p.h / 2;
    const who = []; net.tasks.forEach(t => t.who.forEach(q => { if (!who.includes(q)) who.push(q); }));
    const below = (p.summary ? fs * 2 : 0) + (p.legend && p.style === 'card' && who.length ? fs * 2 : 0);
    return { net, c, pos, ends, fs, tb, termW, termH, halfW, halfH, below, who };
  },
  bbox(p) { const L = this.layout(p); return [-L.halfW - 1, -L.halfH - 1, L.halfW + 1, L.halfH + 1 + L.below]; },
  draw(p, S) {
    const L = this.layout(p), { net, c, pos, fs, tb } = L, ink = S.ink, ecol = p.edgeColor || ink, lw = S.lw, hs = Math.max(1, fs * 0.5);
    if (!net.tasks.length) return txt(S, 0, 0, 'Add tasks: ID | name | duration | after', fs, { italic: true });
    const unit = String(p.unit || '').trim(), durTxt = d => (unit ? fmtNum(d) + ' ' + unit.replace(/s$/, d === 1 ? '' : 's') : fmtNum(d));
    const cols = palette(p.colors, PARTNER_COLS), whoCol = whoColour(L.who, cols); L.who.forEach(whoCol);
    const crit = t => p.showCrit && t.crit;
    let edges = '', boxes = '', extra = '';
    // box sides for arrows
    const side = (q, w, h, out) => tb ? [q[0], q[1] + (out ? h / 2 : -h / 2)] : [q[0] + (out ? w / 2 : -w / 2), q[1]];
    const arrow = (a, b, col, wd) => {
      let d;
      if (p.edges === 'straight' || Math.abs(tb ? a[0] - b[0] : a[1] - b[1]) < 1e-6) d = `M ${n(a[0])} ${n(a[1])} L ${n(b[0] - (tb ? 0 : hs * 0.8))} ${n(b[1] - (tb ? hs * 0.8 : 0))}`;
      else if (p.edges === 'curve') { const k = (tb ? b[1] - a[1] : b[0] - a[0]) * 0.5; d = tb ? `M ${n(a[0])} ${n(a[1])} C ${n(a[0])} ${n(a[1] + k)} ${n(b[0])} ${n(b[1] - k)} ${n(b[0])} ${n(b[1] - hs * 0.8)}` : `M ${n(a[0])} ${n(a[1])} C ${n(a[0] + k)} ${n(a[1])} ${n(b[0] - k)} ${n(b[1])} ${n(b[0] - hs * 0.8)} ${n(b[1])}`; }
      else { // elbow: turn in the gap just before the target, so long arrows run along their own row
        const m = tb ? b[1] - (p.gapY / 2) : b[0] - (p.gapX / 2);
        d = tb ? `M ${n(a[0])} ${n(a[1])} L ${n(a[0])} ${n(m)} L ${n(b[0])} ${n(m)} L ${n(b[0])} ${n(b[1] - hs * 0.8)}` : `M ${n(a[0])} ${n(a[1])} L ${n(m)} ${n(a[1])} L ${n(m)} ${n(b[1])} L ${n(b[0] - hs * 0.8)} ${n(b[1])}`;
      }
      if (p.edges === 'straight' && Math.abs(tb ? a[0] - b[0] : a[1] - b[1]) >= 1e-6) {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); d = `M ${n(a[0])} ${n(a[1])} L ${n(b[0] - Math.cos(ang) * hs * 0.8)} ${n(b[1] - Math.sin(ang) * hs * 0.8)}`;
        return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(wd)}"/>` + H.arrowHead(b[0], b[1], ang, hs, col);
      }
      return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${n(wd)}" stroke-linejoin="round"/>` + H.arrowHead(b[0], b[1], tb ? Math.PI / 2 : 0, hs, col);
    };
    const ew = Math.max(0.2, lw * 1.1);
    net.tasks.forEach(t => t.after.forEach(a => {
      const A = net.byId[a], cr = crit(A) && crit(t) && Math.abs(A.ef - t.es) < 1e-9;
      edges += arrow(side(pos[a], p.w, p.h, true), side(pos[t.id], p.w, p.h, false), cr ? p.critColor : ecol, cr ? ew * 1.6 : ew);
    }));
    if (L.ends) {
      const first = net.tasks.filter(t => !t.after.length), last = net.tasks.filter(t => !c.succ[t.id].length);
      first.forEach(t => { edges += arrow(side(L.ends.start, L.termW, L.termH, true), side(pos[t.id], p.w, p.h, false), crit(t) ? p.critColor : ecol, crit(t) ? ew * 1.6 : ew); });
      last.forEach(t => { edges += arrow(side(pos[t.id], p.w, p.h, true), side(L.ends.finish, L.termW, L.termH, false), crit(t) ? p.critColor : ecol, crit(t) ? ew * 1.6 : ew); });
      const pill = (q, label, fill) => { const a = L.termW / 2, b = L.termH / 2; return (S.shaded ? `<rect x="${n(q[0] - a + 0.4)}" y="${n(q[1] - b + 0.5)}" width="${n(2 * a)}" height="${n(2 * b)}" rx="${n(b)}" fill="#000" fill-opacity="0.14"/>` : '') + `<rect x="${n(q[0] - a)}" y="${n(q[1] - b)}" width="${n(2 * a)}" height="${n(2 * b)}" rx="${n(b)}" fill="${fill}" stroke="${ink}" stroke-width="${n(lw)}"/>` + txt(S, q[0], q[1], label, fs, { bold: true }); };
      boxes += pill(L.ends.start, p.startText, '#d8f0dc') + pill(L.ends.finish, p.endText, '#f8d6d6');
    }
    net.tasks.forEach(t => {
      const q = pos[t.id];
      boxes += card(S, q[0], q[1], { w: p.w, h: p.h, fs, style: p.style, split: 0.5, id: t.id, dur: durTxt(t.d), title: t.name, who: p.style === 'card' ? t.who : [], whoCol,
        idFill: p.idFill, durFill: p.durFill, bodyFill: p.bodyFill, headFill: crit(t) ? U.lighten(p.critColor, 0.7) : '#e8edf3', footFill: '#f4f5f7', crit: crit(t), critColor: p.critColor,
        es: fmtNum(t.es), ef: fmtNum(t.ef), ls: fmtNum(t.ls), lf: fmtNum(t.lf), slack: fmtNum(t.slack) });
    });
    let yb = L.halfH + fs * 1.1;
    if (p.legend && p.style === 'card' && L.who.length) {
      const sw = fs * 1.6; let x = -L.halfW;
      L.who.forEach(t => { const c0 = whoCol(t); extra += `<rect x="${n(x)}" y="${n(yb - fs * 0.55)}" width="${n(sw)}" height="${n(fs * 1.1)}" fill="${c0}" stroke="${ink}" stroke-width="${n(lw * 0.5)}"/>` + txt(S, x + sw + fs * 0.4, yb, t, fs, { anchor: 'start' }); x += sw + fs * 1.2 + measure(t, fs); });
      yb += fs * 2;
    }
    if (p.summary) {
      const cp = c.path.length ? ' · critical path ' + c.path.join(' → ') : '';
      extra += txt(S, -L.halfW, yb - fs * 0.3, 'Total duration ' + durTxt(c.T) + (p.showCrit ? cp : '') + (c.cyclic ? ' · check the "after" lists: they contain a loop' : ''), fs, { anchor: 'start', italic: true, color: c.cyclic ? '#d62828' : ink });
    }
    return edges + boxes + extra;
  },
  variants: [
    { name: 'PERT network · activity on node (ES/EF/LS/LF)', props: { style: 'aon', w: 30, h: 17, legend: false } },
    { name: 'PERT network · top to bottom', props: { dir: 'tb', w: 30, h: 16, gapX: 6, gapY: 8 } },
  ] });

RNBX.planning = { parseNet, cpm, parseBars, parseDeps };
})();
