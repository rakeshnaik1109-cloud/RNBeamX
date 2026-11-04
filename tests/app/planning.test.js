/* Project planning: Gantt chart, PERT / CPM network, task cards */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · project planning');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const lib = RNBX.lib, U = RNBX.util, P = RNBX.planning, bad = [];
    const types = lib.all().filter(d => d.category === 'Project planning').map(d => d.type);
    ['schematic', 'shaded'].forEach(mode => types.forEach(t => {
      const def = lib.get(t), S = lib.style(RNBX.state.doc, { mode });
      [def.defaults].concat((def.variants || []).map(v => Object.assign({}, def.defaults, v.props))).forEach((p0, k) => {
        const p = U.deepClone(p0);
        try { const b = def.bbox(p), svg = def.draw(p, S, { id: 't' + t + k }); if (!b.every(Number.isFinite) || b[2] <= b[0] || svg.length < 300 || /NaN|undefined|Infinity/.test(svg)) bad.push(mode + ':' + t + k); } catch (e) { bad.push(mode + ':' + t + k + ' ' + e.message); }
      });
    }));
    // critical path method on a textbook network: A3; B2, C4 after A; D2 after B and C
    const net = P.parseNet('A | a | 3 | -\nB | b | 2 | A\nC | c | 4 | A\nD | d | 2 | B, C'), c = P.cpm(net), t = id => net.byId[id];
    const cp = { T: c.T, path: c.path.join(''), es: ['A', 'B', 'C', 'D'].map(k => t(k).es).join(','), lf: ['A', 'B', 'C', 'D'].map(k => t(k).lf).join(','), slackB: t('B').slack, crit: ['A', 'B', 'C', 'D'].filter(k => t(k).crit).join('') };
    const loop = P.cpm(P.parseNet('A | a | 1 | B\nB | b | 1 | A')).cyclic;
    // bar list: headings, progress, colours, milestones
    const rows = P.parseBars('# Phase 1\nOne | 0-6 | 40%\nTwo | 3–9 | #ff0000\n◆ Done | 9\n* Also | 4');
    const bars = { n: rows.length, sec: rows[0].kind, prog: rows[1].progress, col: rows[2].color, ms: rows[3].kind + rows[4].kind, deps: P.parseDeps('1>2, 2 → 3; x').length };
    // drawing: one bar per task, one diamond per milestone, one arrow per dependency
    const g = lib.get('gantt'), S = lib.style(RNBX.state.doc, { mode: 'schematic' });
    const svg = g.draw(Object.assign({}, g.defaults, { tasks: 'One | 0-6\nTwo | 6-12\n◆ End | 12', deps: '1>2, 2>3', grid: false, rowTicks: false, axis: 'bottom' }), S, { id: 'g' });
    const net2 = g.rows(Object.assign({}, g.defaults, { mode: 'net' }));
    const pert = lib.get('pert'), psvg = pert.draw(pert.defaults, S, { id: 'p' });
    return { types, bad, cp, loop, bars, rects: (svg.match(/<rect /g) || []).length, diamonds: (svg.match(/<path d="M [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+ L [-\d.]+ [-\d.]+ Z" fill/g) || []).length,
      netRows: net2.rows.length, netDeps: net2.deps.length, netSorted: net2.rows.every((q, i) => !i || net2.rows[i - 1].a <= q.a), critText: /critical path A → B → E → F → G/.test(psvg), rows: g.rows(Object.assign({}, g.defaults)).rows.length };
  });
  H.check('every planning part (and its variants) draws in Schematic and Shaded', r.types.length === 3 && !r.bad.length, { types: r.types, bad: r.bad });
  H.check('critical path method: times, slack and the critical path of a textbook network', r.cp.T === 9 && r.cp.path === 'ACD' && r.cp.es === '0,3,3,7' && r.cp.lf === '3,7,7,9' && r.cp.slackB === 2 && r.cp.crit === 'ACD', r.cp);
  H.check('a loop in the "after" lists is detected', r.loop === true);
  H.check('task list: phase headings, progress, own colours, milestones, arrows', r.bars.n === 5 && r.bars.sec === 'section' && r.bars.prog === 40 && r.bars.col === '#ff0000' && r.bars.ms === 'milestonemilestone' && r.bars.deps === 2, r.bars);
  H.check('Gantt draws one bar per task and one diamond per milestone', r.rects === 2 && r.diamonds >= 1, { rects: r.rects, diamonds: r.diamonds });
  H.check('Gantt scheduled from durations: every task once, in start order, with its dependency arrows', r.netRows === 9 && r.netDeps === 10 && r.netSorted, r);
  H.check('PERT network names the total duration and the critical path', r.critText);
  // a task card joined to another by the Flow connector stays attached
  const att = await page.evaluate(() => {
    const d = RNBX.newDocument(), a = RNBX.createObject('pertcard', 40, 40), b = RNBX.createObject('pertcard', 120, 40);
    d.objects = [a, b]; RNBX.setDocument(RNBX.normalizeDocument(d));
    const f = RNBX.createObject('flow', 0, 0); f.props.from = a.id; f.props.to = b.id; RNBX.state.doc.objects.push(f);
    const g = RNBX.lib.get('flow').geometry(f, RNBX.state.doc), box = RNBX.lib.worldBox(b);
    return Math.abs(g.pts[g.pts.length - 1][0] - box[0]) < 1e-6;
  });
  H.check('task cards work with the Flow connector', att);
  // the template picker lists the planning templates and they build
  const tp = await page.evaluate(() => ['gantt', 'pertnet', 'workplan'].map(id => { const t = RNBX.templates.list.find(q => q.id === id); return t && t.build().objects.length; }));
  H.check('planning templates build', tp.every(v => v >= 1), tp);
  await page.close();
};
