/* SPR real-time sensing: live dip marker, sensorgram panel, sensitivity, "SPR sensing" preset */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · SPR sensing');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const P = RNBX.animPresets, D = RNBX.plotData, p = P.list.find(q => q.id === 'sprsense'), out = {};
    const load = () => { RNBX.setDocument(RNBX.normalizeDocument(RNBX.templates.list.find(t => t.id === 'spr').build())); RNBX.select([]); };
    const run = (profile, panel) => {
      load();
      const t = P.target(p, RNBX.state.doc, []), o = {};
      p.params.forEach(q => { o[q.key] = q.def ? q.def(RNBX.state.doc, t) : 0; });
      Object.assign(o, { profile, panel: panel || 'add' });
      P.apply(p, t, o);
      const doc = RNBX.state.doc, src = doc.objects.find(q => q.id === t.id);
      return { doc, src, sg: D.sensorgram(src, doc, null), plots: doc.objects.filter(q => q.type === 'plot'), t };
    };
    // binding: baseline, rise, partial return
    let a = run('binding');
    const rs = a.sg.all.map(q => q.r), r0 = rs[0], rMax = Math.max(...rs), rEnd = rs[rs.length - 1];
    out.binding = { r0, rMax, rEnd, ok: rs.every(v => v != null) };
    out.sensitivity = D.sensitivity(a.src, a.doc);
    out.panels = a.plots.map(q => ({ mode: q.props.mode, mark: q.props.mark }));
    const sens = a.plots.find(q => q.props.mode === 'sensor');
    const svgAt = t => RNBX.render.build(RNBX.state.doc, { time: t }).svg;
    out.grows = svgAt(2) !== svgAt(8);
    out.marker = /stroke-dasharray[^>]*\/><circle[^>]*fill="#d62728"/.test(svgAt(4)) || svgAt(4).includes('stroke="#d62728" stroke-width');
    out.readout = svgAt(6).includes('= ') && svgAt(6).includes('/RIU');
    // remove: keyframes, added sensorgram, and the marker all go back
    const before = RNBX.state.doc.objects.length;
    P.remove(RNBX.state.doc.animation.applied[0].uid);
    out.removed = { gone: !RNBX.state.doc.objects.some(q => q.id === sens.id), fewer: RNBX.state.doc.objects.length < before, mark: RNBX.state.doc.objects.filter(q => q.type === 'plot').every(q => !q.props.mark), still: !RNBX.anim.hasAnimation(RNBX.state.doc) };
    // steps and sweep: the resonance only moves one way
    ['steps', 'sweep'].forEach(pr => {
      const b = run(pr, 'none'), v = b.sg.all.map(q => q.r);
      out[pr] = { mono: v.every((x, i) => i === 0 || x >= v[i - 1] - 1e-6), shift: v[v.length - 1] - v[0], panels: b.plots.length };
    });
    // the sensorgram can run against the analyte index too, and its CSV data match the curve
    a = run('sweep');
    const sp = RNBX.state.doc.objects.find(q => q.type === 'plot' && q.props.mode === 'sensor');
    sp.props.sgX = 'n'; sp.props.sgY = 'shift';
    out.byN = RNBX.render.build(RNBX.state.doc, { time: 6 }).svg.includes('Analyte refractive index');
    // in 3D the table keeps clear of the data panels
    const d3 = RNBX.state.doc, cam = RNBX.render3d.camera(d3), A = cam.area;
    const tableBottom = Math.max(...[[A.x0, A.y0], [A.x1, A.y0], [A.x1, A.y1], [A.x0, A.y1]].map(q => cam.p(q[0], q[1], -2.5)[1]));
    const plotTop = Math.min(...d3.objects.filter(q => q.type === 'plot').map(q => RNBX.lib.worldBox(q)[1]));
    out.clear3d = { tableBottom, plotTop, ok: tableBottom < plotTop };
    // the original binding preset is untouched
    out.bindingPreset = !!P.list.find(q => q.id === 'binding');
    return out;
  });
  H.check('binding run: the resonance red-shifts, then partly returns', r.binding.ok && r.binding.rMax > r.binding.r0 + 20 && r.binding.rEnd < r.binding.rMax && r.binding.rEnd > r.binding.r0, r.binding);
  H.check('bulk sensitivity of a gold chip is a few thousand nm/RIU', r.sensitivity > 1000 && r.sensitivity < 20000, r.sensitivity);
  H.check('preset adds a sensorgram and marks the dip on the curve panel', r.panels.some(q => q.mode === 'sensor') && r.panels.some(q => q.mode === 'curve' && q.mark), r.panels);
  H.check('the sensorgram grows as the animation plays', r.grows);
  H.check('live resonance marker and readout (λres, n, S) are drawn', r.marker && r.readout, { marker: r.marker, readout: r.readout });
  H.check('removing the preset removes its panels, marker and keyframes', Object.values(r.removed).every(Boolean), r.removed);
  H.check('calibration steps and sweep: resonance moves one way only, no panels when asked', r.steps.mono && r.sweep.mono && r.steps.shift > 20 && r.sweep.shift > 20 && r.steps.panels === 1 && r.sweep.panels === 1, { steps: r.steps, sweep: r.sweep });
  H.check('sensorgram against the analyte index', r.byN);
  H.check('3D view: the optical table is fitted above the data panels, not under them', r.clear3d.ok, r.clear3d);
  H.check('the existing binding preset is still there', r.bindingPreset);
  await page.close();
};
