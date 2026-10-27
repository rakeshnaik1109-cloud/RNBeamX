/* Beam tracing: physics of the optical parts and templates */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · beam-tracing physics');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const out = {};
    const mk = (type, x, y, rot, props, extra) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, extra || {}, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const run = (objs, style) => { const d = RNBX.newDocument(); d.objects = objs; Object.assign(d.style, style || {}); return RNBX.trace(d); };
    const nB = RNBX.optics.index('N-BK7', 633), thB = RNBX.util.deg(Math.atan(nB));
    for (const pol of ['H', 'V']) { const t = run([mk('laser', 20, 50, 0, { lambda: 633, pol, power: 1 }), mk('window', 60, 50, thB, { t: 3, d: 10 })], { ghosts: 'uncoated' }); out['ghost' + pol] = t.segments.filter(s => s.ghost).reduce((a, s) => Math.max(a, s.P), 0); }
    { const t = run([mk('laser', 20, 50, 0, { lambda: 1064, beamWidth: 1.0, power: 1 }), mk('lens', 60, 50, 0, { f: 100 }), mk('screen', 140, 50, 0, {})], { beamModel: 'gaussian', scale: 10, gaussMag: 10 });
      const sg = t.segments.find(s => s.a[0] > 59 && s.a[0] < 61 && !s.ghost), info = RNBX.optics.qWaistInfo(sg.q0, 1064e-6, 1, 1);
      out.waist = info.w0 * 1000; out.waistExpected = 1064e-6 * 100 / (Math.PI * 0.5) * 1000; out.focus = info.zToWaist; }
    const mich = piezo => { const cam = mk('screen', 60, 66, 90, {}); const t = run([mk('laser', 20, 42, 0, { lambda: 632.8, L: 20, H: 5.5, power: 1 }), mk('bscube', 60, 42, 0, {}), mk('mirror', 60, 14, -90, {}), mk('mirror', 96, 42, 0, { piezo }), cam]); return t.hits[cam.id].interf.dphi * 180 / Math.PI; };
    out.dphi = mich(632.8 / 4) - mich(0);
    for (const det of [0, 0.5]) { const D = mk('pd', 100, 50, 0, {}); const t = run([mk('laser', 20, 50, 0, { lambda: 1064, power: 1 }), mk('cavity', 60, 50, 0, { detune: det, R1: 0.9, R2: 0.9, lam0: 1064 }), D]); out['cav' + det] = t.hits[D.id] ? t.hits[D.id].P : 0; }
    { const ps = mk('periscope', 50, 50, 0, { rise: 12 }), lowM = mk('mirror', 80, 50, 45, {}), D = mk('pd', 120, 50, 0, {}, { z: 12 }); const t = run([mk('laser', 15, 50, 0, { power: 1 }), ps, lowM, D]); out.periscope = [t.hits[D.id] ? t.hits[D.id].P : 0, !!t.hits[lowM.id]]; }
    // templates
    const T = id => { RNBX.setDocument(RNBX.templates.list.find(t => t.id === id).build()); return RNBX.trace(RNBX.state.doc); };
    { RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'fringes').build()); const ph = [0, 1, 2].map(tt => { RNBX.anim.setTime(tt); const c = RNBX.state.doc.objects.find(o => o.type === 'camera'); return RNBX.trace(RNBX.state.doc).hits[c.id].interf.dphi * 180 / Math.PI; }); out.fringes = ph; }
    { const t = T('ring'), byLabel = l => { const o = RNBX.state.doc.objects.find(q => q.label && q.label.text.includes(l)); return t.hits[o.id] ? t.hits[o.id].P : 0; }; out.ring = [byLabel('through'), byLabel('drop')]; }
    { const t = T('spr'), sp = RNBX.state.doc.objects.find(o => o.type === 'spectrometer'), L = t.hits[sp.id].lambdas, ks = Object.keys(L).map(Number).sort((a, b) => a - b); out.spr = ks.map(k => L[k]); }
    { const t = T('polarization'); out.polSegs = t.segments.length; }
    return out;
  });
  H.check('Brewster window: no reflection for p-polarised light', r.ghostH < 1e-4, r.ghostH);
  H.check('Brewster window: s-polarised light is reflected', r.ghostV > 0.1, r.ghostV);
  H.near('Gaussian focus waist close to λf/(πw) (µm)', r.waist, r.waistExpected, r.waistExpected * 0.05);
  H.near('Gaussian focus near the focal plane (mm from the lens)', r.focus, 100, 6);
  H.near('Michelson: a λ/4 piezo step changes the phase by 180°', Math.abs(r.dphi), 180, 1);
  H.check('Fabry–Pérot: transmits on resonance, blocks off resonance', r.cav0 > 0.99 && r['cav0.5'] < 0.01, [r.cav0, r['cav0.5']]);
  H.check('periscope: beam passes over the low mirror and reaches the raised detector', r.periscope[0] > 0.99 && !r.periscope[1], r.periscope);
  H.check('live fringes: the phase changes with the piezo over time', Math.abs(r.fringes[1] - r.fringes[0]) > 90 && Math.abs(r.fringes[2] - r.fringes[0]) < 1, r.fringes.map(v => v.toFixed(0)));
  H.check('microring on resonance: most light at the drop port', r.ring[1] > 10 * r.ring[0], r.ring);
  const min = Math.min(...r.spr), max = Math.max(...r.spr);
  H.check('SPR template: the traced beam carries the plasmon dip to the spectrometer', min < 0.5 * max, r.spr.map(v => v.toFixed(3)).join(' '));
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
