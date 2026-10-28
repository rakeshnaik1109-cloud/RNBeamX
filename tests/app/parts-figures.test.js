/* Parts for lab-figure illustrations: fibre-output laser, fibre ends, benchtop boxes,
   electromagnet, probe head, tilted optics, block arrows, nanostructure options */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · illustration parts for lab figures');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const out = {};
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const link = (type, a, b, props) => Object.assign(RNBX.createObject(type, 0, 0), { props: Object.assign(RNBX.createObject(type, 0, 0).props, { from: a.id, to: b.id }, props || {}) });
    const run = objs => { const d = RNBX.newDocument(); d.objects = objs; return { t: RNBX.trace(d), d }; };
    // benchtop laser through a fibre: the light leaves at the fibre end, diverging, with the fibre's efficiency
    { const lz = mk('benchlaser', 20, 80, 0, { lambda: 650, power: 10 }), tip = mk('coupler', 60, 60, -90, { look: 'tip', divergence: 8, beamWidth: 0.1 }), fib = link('fiber', lz, tip, { eff: 0.7 }), scr = mk('screen', 60, 20, -90, { d: 30 });
      const { t } = run([lz, tip, fib, scr]); const s0 = t.segments.find(q => q.src === lz.id);
      out.fiber = { start: s0 && [+s0.a[0].toFixed(2), +s0.a[1].toFixed(2)], dir: s0 && [+(s0.b[0] - s0.a[0]).toFixed(2), Math.sign(s0.b[1] - s0.a[1])], P: t.hits[scr.id] && t.hits[scr.id].P, light: t.fiberLight[fib.id], dw: s0 && s0.dw }; }
    // free-space output, and a fibre-output laser without a fibre still shines
    { const lz = mk('benchlaser', 20, 50, 0, { output: 'free' }), scr = mk('screen', 70, 50, 0, { d: 20 }); out.free = run([lz, scr]).t.hits[scr.id] ? 1 : 0; }
    { const lz = mk('benchlaser', 20, 50, 0, {}), scr = mk('screen', 70, 50, 0, { d: 20 }); out.nofiber = run([lz, scr]).t.hits[scr.id] ? 1 : 0; }
    // the beam keeps the laser colour, not the box colour
    { const lz = mk('benchlaser', 20, 50, 0, { output: 'free', boxColor: '#123456' }); out.col = run([lz]).t.segments[0].color; }
    // probe head: a beam through it is focused at the set distance below the nose
    { const las = mk('laser', 10, 50, 0, {}), pr = mk('module', 40, 50, 0, { inside: 'probe', L: 20, H: 12, snout: true, f: 6, title: '' }), d = RNBX.newDocument(); d.objects = [las, pr];
      const t = RNBX.trace(d), seg = t.segments.filter(q => q.a[0] > 50 && Math.abs(q.dw) > 1e-6)[0]; out.probe = seg ? +(-seg.w0 / seg.dw).toFixed(3) : null; }
    // every new look renders (2D shaded, schematic and 3D) without problems
    const looks = [['instrument', { look: 'box3d', text: 'Power supply', knob: true }], ['instrument', { look: 'pc' }], ['camera', { look: 'photo' }], ['emagnet', { field: true }], ['emagnet', { pole: 'none', gap: 12, coilL: 3, coilR: 9 }],
      ['lens', { look: 'tilted' }], ['filter', { look: 'tilted', tintColor: '#999999' }], ['arrow', { style: 'block', dx: 0, dy: 12, head: 'both' }], ['coupler', { look: 'tip' }], ['module', { inside: 'probe', snout: true, f: 5 }],
      ['narray', { shape: 'flake', layout: 'random', count: 30, h: 3, tilt: 30 }], ['nridges', { fill: '#a9d1ef' }], ['nslab', { alpha: 0.4 }], ['benchlaser', {}],
      ['instrument', { look: 'laptop', screen: 'plot', curves: 7 }], ['instrument', { look: 'brick', text: 'USB' }], ['cageplate3d', { insert: 'fiber' }], ['cageplate3d', { insert: 'iris' }], ['cagecube', { look: 'box3d' }], ['cagerods', {}], ['hotplate', {}]];
    out.looks = looks.map(([type, props]) => {
      const d = RNBX.newDocument(); d.objects = [mk(type, 60, 40, 0, props)];
      try { return ['schematic', 'shaded', '3d'].every(m => { d.style.mode = m; const svg = RNBX.render.build(d).svg; return svg.length > 300 && !/NaN|undefined/.test(svg); }) ? 'ok' : type + ' bad'; } catch (e) { return type + ': ' + e.message; }
    }).filter(x => x !== 'ok');
    // tilted lens and filter keep their optics
    { const las = mk('laser', 10, 50, 0, {}), L = mk('lens', 40, 50, 0, { f: 200, look: 'tilted' }), d = RNBX.newDocument(); d.objects = [las, L]; const t = RNBX.trace(d); out.tilted = t.segments.some(q => q.a[0] >= 39.9 && q.dw < -1e-3); }
    // the electromagnet's gap is centred on the part, so a sample at its position sits between the poles
    { const em = RNBX.lib.get('emagnet'), g = em.geo(RNBX.createObject('emagnet', 0, 0).props); out.gap = [g.x1 > 0, em.bbox(RNBX.createObject('emagnet', 0, 0).props)[0] < -g.x2]; }
    // cage plate with a fibre adapter is a fibre end: light goes down the cage, through a lens, onto the sample on a hot plate
    { const lz = mk('benchlaser', 20, 10, 0, { lambda: 600 }), top = mk('cageplate3d', 80, 30, 90, { insert: 'fiber', s: 20 }), fib = link('fiber', lz, top, { boots: true, width: 2.2 }),
        lens = mk('cageplate3d', 80, 55, 90, { insert: 'lens', f: 250, s: 20 }), hp = mk('hotplate', 78, 95, 0, { w: 30 });
      const { t } = run([lz, top, fib, lens, hp]);
      const after = t.segments.find(q => q.src === lz.id && q.a[1] > 54.9 && q.a[1] < 56 && q.b[1] > q.a[1]);
      out.cage = { start: t.segments.find(q => q.src === lz.id).a.map(v => +v.toFixed(2)), hp: t.hits[hp.id] ? +t.hits[hp.id].P.toFixed(3) : 0, collimated: after ? Math.abs(after.dw) < 0.1 * Math.abs(t.segments.find(q => q.src === lz.id).dw) : null }; }
    // hanging cable route draws a smooth curve
    { const a = mk('instrument', 20, 20, 0, { look: 'laptop' }), c = mk('instrument', 60, 40, 0, { look: 'brick' }), w = link('wire', a, c, { route: 'curve', width: 2.5 }), d = RNBX.newDocument(); d.objects = [a, c, w];
      out.cable = / C /.test(RNBX.lib.get('wire').geometry(w, d).d); }
    // block arrow is a filled shape
    { const d = RNBX.newDocument(); d.objects = [mk('arrow', 20, 20, 0, { style: 'block', dx: 20, dy: 0, shaft: 3, color: '#d9704a' })]; out.block = /<path d="M [^"]+Z" fill="#d9704a"/.test(RNBX.render.build(d).svg); }
    return out;
  });
  H.check('fibre-output laser: the light leaves at the fibre end, along it, diverging', r.fiber.start && Math.abs(r.fiber.start[0] - 60) < 0.01 && r.fiber.dir[1] === -1 && r.fiber.dw > 0.1, r.fiber);
  H.near('fibre-output laser: power after the fibre (efficiency 0.7)', r.fiber.P, 7, 1e-6);
  H.check('fibre-output laser: the fibre is drawn in the colour of the light inside', r.fiber.light && r.fiber.light[650] === 10, r.fiber.light);
  H.check('benchtop laser: free-space output works, and without a fibre it still shines', r.free === 1 && r.nofiber === 1, [r.free, r.nofiber]);
  H.check('benchtop laser: the beam keeps the laser colour (box colour is separate)', r.col == null || r.col === '', r.col);
  H.near('probe head: the beam focuses the set distance below the nose (drawn mm)', r.probe, 6, 0.05);
  H.check('new looks render in schematic, shaded and 3D', r.looks.length === 0, r.looks);
  H.check('tilted (3D-look) lens still focuses', r.tilted);
  H.check('electromagnet: the gap is at the part position', r.gap.every(Boolean), r.gap);
  H.check('block arrow is drawn as a filled shape', r.block);
  H.check('cage plate with a fibre adapter is a fibre end; the light goes down the cage onto the hot-plate sample', Math.abs(r.cage.start[0] - 80) < 0.01 && Math.abs(r.cage.start[1] - 30) < 0.5 && r.cage.hp > 0 && r.cage.collimated === true, r.cage);
  H.check('hanging cable route is a smooth curve', r.cable);
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
