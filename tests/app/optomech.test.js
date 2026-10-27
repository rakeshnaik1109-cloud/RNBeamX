/* Optomechanics and imaging parts: they trace like the optics they hold */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · optomechanics and imaging parts');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const out = {};
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const run = objs => { const d = RNBX.newDocument(); d.objects = objs; return RNBX.trace(d); };
    const P = (t, o) => t.hits[o.id] ? t.hits[o.id].P : 0;
    const after = (t, x) => t.segments.filter(s => !s.ghost && s.kind === 'beam' && s.a[0] > x);
    // right-angle prism: a 90° turn by total internal reflection
    { const t = run([mk('laser', 20, 50, 0, { power: 1 }), mk('rprism', 60, 50, 0, {})]);
      const s = t.segments.filter(q => !q.ghost && q.kind === 'beam' && q.a[1] > 53)[0];
      out.prism = s ? [+(s.b[0] - s.a[0]).toFixed(3), +Math.sign(s.b[1] - s.a[1])] : null; }
    // shutter: open passes, closed blocks
    for (const open of [true, false]) { const D = mk('pd', 100, 50, 0, {}); out['shutter' + open] = P(run([mk('laser', 20, 50, 0, { power: 1 }), mk('shutter', 60, 50, 0, { open }), D]), D); }
    // flip mount: reflects when in, lets the beam through when flipped out
    for (const flipped of [false, true]) { const D = mk('pd', 100, 50, 0, {}); out['flip' + flipped] = P(run([mk('laser', 20, 50, 0, { power: 1 }), mk('kmount', 60, 50, 135, { style: 'flip', flipped }), D]), D); }
    // kinematic mount: a fine tilt of θ steers the beam by 2θ
    { const t = run([mk('laser', 20, 50, 0, { power: 1 }), mk('kmount', 60, 50, 135, { tilt: 1 })]);
      const s = t.segments.filter(q => !q.ghost && q.kind === 'beam' && q.a[1] < 49)[0] || t.segments[t.segments.length - 1];
      out.steer = Math.abs(90 - Math.abs(Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) * 180 / Math.PI)); }
    // lens tube beam expander: the beam comes out mag× wider and collimated
    { const t = run([mk('laser', 20, 50, 0, { power: 1, beamWidth: 1 }), mk('lenstube', 60, 50, 0, { content: 'expander', L: 22, mag: 3 })]);
      const s = after(t, 67)[0]; out.expander = s ? [s.w0 / t.segments[0].w0, s.dw] : null; }
    // fluorescence cube: excitation in from the left goes up; emission coming down reaches the bottom; laser light coming down does not
    { const up = mk('pd', 60, 20, 90, {}); out.cubeExc = P(run([mk('laser', 20, 50, 0, { lambda: 488, power: 1 }), mk('filtercube', 60, 50, 0, {}), up]), up); }
    for (const lambda of [525, 488]) { const dn = mk('pd', 60, 85, -90, {}); out['cubeEm' + lambda] = P(run([mk('laser', 60, 20, 90, { lambda, power: 1 }), mk('filtercube', 60, 50, 0, {}), dn]), dn); }
    // cage cube with a turning mirror; cage plate iris; integrating sphere absorbs
    { const up = mk('pd', 60, 20, 90, {}); out.cage = P(run([mk('laser', 20, 50, 0, { power: 1 }), mk('cagecube', 60, 50, 0, { insert: 'mirror' }), up]), up); }
    { const D = mk('pd', 100, 50, 0, {}); out.sphere = P(run([mk('laser', 20, 50, 0, { power: 1 }), mk('intsphere', 60, 50, 0, {}), D]), D); }
    // every new part draws in the 3D view too
    const types = ['kmount', 'galvo', 'lenstube', 'cagecube', 'cageplate', 'shutter', 'breadboard', 'rail', 'posstage', 'rprism', 'diffuser', 'filtercube', 'eyepiece', 'cameralens', 'intsphere'];
    const d = RNBX.newDocument(); types.forEach((ty, i) => d.objects.push(mk(ty, 20 + (i % 5) * 30, 25 + Math.floor(i / 5) * 30, 0, ty === 'breadboard' ? { w: 20, h: 14 } : ty === 'rail' ? { L: 22 } : {})));
    RNBX.setDocument(d);
    out.lib = types.filter(t => !RNBX.lib.get(t));
    return out;
  });
  H.check('right-angle prism turns the beam by 90°', r.prism && Math.abs(r.prism[0]) < 1e-3 && r.prism[1] === 1, r.prism);
  H.check('shutter: open passes the beam, closed blocks it', r.shuttertrue > 0.9 && r.shutterfalse === 0, [r.shuttertrue, r.shutterfalse]);
  H.check('flip mount: in the beam it reflects, flipped out it lets the beam pass', r.flipfalse === 0 && r.fliptrue > 0.99, [r.flipfalse, r.fliptrue]);
  H.near('kinematic mount: 1° of fine tilt steers the beam by 2°', r.steer, 2, 0.05);
  H.check('lens-tube expander: 3× wider (inverted, Keplerian) and collimated', r.expander && Math.abs(Math.abs(r.expander[0]) - 3) < 0.05 * 3 && Math.abs(r.expander[1]) < 1e-3, r.expander);
  H.check('filter cube: excitation is sent up to the objective', r.cubeExc > 0.8, r.cubeExc);
  H.check('filter cube: emission passes down to the camera, laser light does not', r.cubeEm525 > 0.8 && r.cubeEm488 < 0.05, [r.cubeEm525, r.cubeEm488]);
  H.check('cage cube with a turning mirror sends the beam up', r.cage > 0.99, r.cage);
  H.check('integrating sphere collects the beam', r.sphere === 0, r.sphere);
  H.check('all new parts are registered', r.lib.length === 0, r.lib);
  for (const mode of ['schematic', 'shaded', '3d']) {
    await page.evaluate(m => { RNBX.state.doc.style.mode = m; RNBX.changed(); }, mode);
    await page.waitForTimeout(250);
    await H.shot(page, 'optomech-' + mode, '#stage');
  }
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
