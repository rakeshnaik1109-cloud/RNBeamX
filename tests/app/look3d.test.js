/* Realistic 3D: distinct laser bodies, lab mounts (post holder, post, slotted base),
   per-part body and mount colours, and the one-click photo look */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · 3D look: laser bodies, mounts and colours');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const out = {};
    const mk = (type, props, extra) => Object.assign(RNBX.createObject(type, 50, 40), extra || {}, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const doc = o => { const d = RNBX.newDocument(); d.objects = [o]; d.style.mode = '3d'; return d; };
    const faces = o => RNBX.render3d.objectFaces(o, doc(o));
    // every body is its own shape and renders cleanly in all styles
    const bodies = ['head', 'tube', 'diode', 'ultrafast', 'fibre', 'qcl', 'tunable'];
    out.sig = bodies.map(b => { const f = faces(mk('laser', { body: b })); return f.length + ':' + f.map(q => q.m.color).sort().join(); });
    out.bad = bodies.filter(b => { const d = doc(mk('laser', { body: b })); return !['schematic', 'shaded', '3d'].every(m => { d.style.mode = m; const s = RNBX.render.build(d).svg; return s.length > 300 && !/NaN|undefined/.test(s); }); });
    // "Automatic" picks a fitting body from the older props
    out.auto = [{ lambda: 632.8 }, { L: 8, lambda: 785 }, { text: 'Ti:Sa', pulsed: true }, { text: 'QCL', lambda: 4500 }, { text: 'fibre' }, { text: 'tunable' }, {}].map(p => RNBX.lib.laserBody(Object.assign(RNBX.createObject('laser', 0, 0).props, p)));
    // mounts: none < simple < lab; a pedestal is its own thing; a mirror gets kinematic knobs in lab style
    const n = post => faces(mk('lens', {}, { post })).length;
    out.mounts = { none: n('none'), simple: n('simple'), lab: n('lab'), pedestal: n('pedestal') };
    const mir = st => { const o = mk('mirror', {}, { post: st }); return faces(o).filter(q => q.m.color === '#1f2226').length; };
    out.knobs = [mir('lab'), mir('simple')];
    // body colour: 3D housings and 2D fills take it, glass keeps its colour; mount colour goes to the holder
    const t = mk('mirror', {}, { tint: '#b8343a', mountColor: '#2f5f9e', post: 'lab' });
    const f3 = faces(t);
    out.tint3d = f3.some(q => q.m.color === '#b8343a') && f3.some(q => q.m.color === '#2f5f9e') && f3.some(q => q.m.color === '#dfe5ec');
    const d2 = doc(mk('laser', { body: 'head' }, { tint: '#b8343a' })); d2.style.mode = 'schematic'; const s2 = RNBX.render.build(d2).svg; d2.style.mode = 'shaded'; const s3 = RNBX.render.build(d2).svg;
    out.tint2d = /#b8343a/i.test(s2) && /rbx-tint-/.test(s3);
    const lz = mk('laser', { body: 'head' }, { tint: '#2f5f9e' }), fl = faces(lz).map(q => q.m.color);
    out.twoTone = fl.includes('#2f5f9e') && fl.some(c => c !== '#2f5f9e' && /^#[0-9a-f]{6}$/i.test(c) && c !== '#c3c8cf');
    // a raised beam puts the laser body on a riser
    const lo = mk('laser', { body: 'head' }), d6 = doc(lo); d6.view3d.beamHeight = 6; const d14 = doc(lo); d14.view3d.beamHeight = 14;
    out.riser = RNBX.render3d.objectFaces(lo, d14).length > RNBX.render3d.objectFaces(lo, d6).length;
    return out;
  });
  H.check('seven laser bodies, each a different 3D shape', new Set(r.sig).size === 7, r.sig.map(s => s.split(':')[0]));
  H.check('every laser body renders in schematic, shaded and 3D', r.bad.length === 0, r.bad);
  H.check('"Automatic" body: He–Ne → tube, small → diode, Ti:Sa → ultrafast, QCL, fibre, tunable, else laser head', r.auto.join() === 'tube,diode,ultrafast,qcl,fibre,tunable,head', r.auto);
  H.check('mount styles: none < simple post < post holder + slotted base; pedestal differs', r.mounts.none < r.mounts.simple && r.mounts.simple < r.mounts.lab && r.mounts.pedestal !== r.mounts.simple, r.mounts);
  H.check('lab style turns a mirror plate into a kinematic mount with knobs', r.knobs[0] > r.knobs[1], r.knobs);
  H.check('body colour in 3D (mirror stays a mirror), mount colour on the holder', r.tint3d);
  H.check('body colour in 2D (laser housing): flat in schematic, a gradient in shaded', r.tint2d);
  H.check('a coloured laser keeps a darker trim in the same colour', r.twoTone);
  H.check('with a higher beam the laser sits on a riser', r.riser);

  // inspector: Colour & mount section, presets apply, photo look sets the scene
  const ui = await page.evaluate(async () => {
    const d = RNBX.templates.list.find(t => t.id === 'michelson').build(); d.style.mode = '3d'; RNBX.setDocument(RNBX.normalizeDocument(d));
    const m = RNBX.state.doc.objects.find(o => o.type === 'mirror'); RNBX.select([m.id]); RNBX.inspector.build();
    await new Promise(res => setTimeout(res, 30));
    const has = [...document.querySelectorAll('#inspector h4')].some(e => /Colour & mount/.test(e.textContent));
    document.querySelector('#inspector .swatch-btn[title="Blue anodised"]').click();
    await new Promise(res => setTimeout(res, 30));
    const tint = RNBX.getObj(m.id).tint;
    RNBX.select([]); RNBX.inspector.photoLook();
    const v = RNBX.state.doc.view3d, pg = RNBX.state.doc.page;
    return { has, tint, bh: v.beamHeight, style: v.mountStyle, bg: pg.background, dark: RNBX.isDarkPage(pg) };
  });
  H.check('inspector has a Colour & mount section; a colour swatch sets the body colour', ui.has && ui.tint === '#2f5f9e', ui);
  H.check('photo look: dark studio backdrop, lab mounts, beam high enough for post holders', ui.bg === 'gradient' && ui.dark && ui.style === 'lab' && ui.bh >= 12, ui);
  await page.waitForTimeout(150); await H.shot(page, 'look3d-photo', '#stage');
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
