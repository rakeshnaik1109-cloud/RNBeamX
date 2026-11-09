/* Studio structures in the beam path: absorption, RCWA diffraction orders, mixed white-light colour */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · Studio structures: R, T, A and diffraction in the beam path');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const run = (objs, style) => { const d = RNBX.newDocument(); d.objects = objs; Object.assign(d.style, style || {}); return { t: RNBX.trace(d), d }; };
    const out = {}, D = Math.PI / 180;
    // 1. a 45 nm gold film under white light: blue is absorbed, red reflected; R + T + A = 1 for every wavelength
    { const lay = mk('layers', 80, 50, -90, { layers: [{ name: 'Glass', mat: 'glass:N-BK7', t: 6, nm: 0, color: '#cfe3ef' }, { name: 'Au', mat: 'Au', t: 2, nm: 45, color: '#e0a82e' }] });
      const { t } = run([mk('lamp', 20, 50, 0, { lmin: 450, lmax: 700, count: 6, power: 6, pol: 'unpol' }), lay]);
      const st = t.hits[lay.id].stack, ls = Object.keys(st).map(Number).sort((a, b) => a - b);
      out.gold = ls.map(l => { const q = st[l]; return { l, R: q.R / q.in, T: q.T / q.in, A: q.A / q.in }; });
      out.goldSum = Math.max(...out.gold.map(q => Math.abs(q.R + q.T + q.A - 1))); }
    // 2. a lamellar TiO₂ grating (period 1000 nm) at normal incidence, 633 nm: orders at ±asin(0.633)
    { const pat = { name: 'g', period: 1000, ambient: 'air', ambientN: 1, side: 'top', orders: 15, slices: 12, substrate: { mat: 'glass:N-BK7' },
        layers: [{ name: 'Lines', mat: 'air', nm: 200, shapes: [{ kind: 'trap', x: 500, wb: 500, wt: 500, shift: 0, mat: 'TiO2' }] }] };
      const uc = mk('ucell', 80, 50, -90, { pattern: pat });
      const { t } = run([mk('laser', 20, 50, 0, { lambda: 633, power: 1, pol: 'V' }), uc]);
      const angs = t.segments.filter(s => s.len > 3 && s.b[0] < s.a[0] - 0.5).map(s => { const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1]; return Math.round(Math.atan2(Math.abs(dy), -dx) / D * 10) / 10; });
      const st = t.hits[uc.id].stack[633];
      // the same structure solved directly
      const geo = RNBX.lib.get('ucell').grating(uc.props), sol = RNBX.rcwa.core.solve(RNBX.rcwa.problemAt(geo, 633), 633, 0, 's');
      const r1 = sol.Rn.filter(o => Math.abs(o.m) === 1).reduce((a, o) => a + o.eff, 0);
      out.grating = { angs: [...new Set(angs)].sort((a, b) => a - b), expect: Math.asin(0.633) / D, orders: st.orders, in: st.in, R: st.R, T: st.T, A: st.A, r1, sum: (st.R + st.T + st.A + st.lost) / st.in }; }
    // 3. mixed colour: white light reflected by gold looks yellow-orange, not white
    { const lay = mk('layers', 80, 50, -90, { layers: [{ name: 'Glass', mat: 'glass:N-BK7', t: 6, nm: 0 }, { name: 'Au', mat: 'Au', t: 2, nm: 120 }] });
      const { t, d } = run([mk('lamp', 20, 50, 0, { lmin: 420, lmax: 680, count: 7, power: 7, pol: 'unpol' }), lay], { spectralMix: true });
      const back = t.segments.filter(s => s.b[0] < s.a[0] - 1);
      const g = RNBX.beams.groups(t.segments), grp = back.map(s => g.get(s)).find(x => x && x.list);
      out.mix = grp ? RNBX.beams.mixed(d, grp.list).col : null;
      out.mixSvg = RNBX.beams.draw2D(t, d).includes(out.mix); }
    // 4. a lit structure is drawn under the beams, with a landing spot on its surface
    { const lay = mk('layers', 80, 50, -90, { layers: [{ name: 'Glass', mat: 'glass:N-BK7', t: 6, nm: 0 }, { name: 'Au', mat: 'Au', t: 2, nm: 50 }] });
      const d = RNBX.newDocument(); d.objects = [mk('laser', 20, 50, 0, { lambda: 633 }), lay];
      const svg = RNBX.render.build(d, {}).svg || RNBX.render.build(d, {}), str = typeof svg === 'string' ? svg : JSON.stringify(svg);
      const iBeams = str.indexOf('rbx-beams'), iSpot = str.indexOf('fill="#ffffff" fill-opacity');
      const t = RNBX.trace(d); out.spot = { spots: (t.hits[lay.id].spots || []).length, beamsAt: iBeams, spotAfterBeams: iSpot > iBeams }; }
    // 5. a data panel with an invalid point still draws its curve and axis numbers
    { const pl = mk('plot', 100, 100, 0, { w: 80, h: 50, series: [{ name: 'R', x: [400, 500, 600, 700], y: [0.2, NaN, 0.5, 0.4] }, { name: 'T', x: [400, 500, 600, 700], y: [0.7, 0.6, 0.4, 0.5] }] });
      const d = RNBX.newDocument(); d.objects = [pl]; const svg = RNBX.lib.get('plot').draw(pl.props, RNBX.lib.style(d, { mode: 'schematic' }));
      out.nanPlot = { nan: /NaN|Infinity/.test(svg), ticks: (svg.match(/text-anchor="end">0\.\d/g) || []).length, skipped: svg.includes('invalid points skipped') }; }
    // 6. turning interaction off makes the structure an illustration again
    { const uc = mk('ucell', 80, 50, -90, { traced: false }); out.off = run([mk('laser', 20, 50, 0, { lambda: 633 }), uc]).t.segments.length; }
    return out;
  });
  const g = r.gold, blue = g[0], red = g[g.length - 1];
  H.check('gold film: R + T + A = 1 at every wavelength of a white source', r.goldSum < 1e-6, r.goldSum);
  H.check('gold film absorbs blue more than red, and reflects red more than blue', blue.A > red.A && red.R > blue.R && blue.A > 0.2, g.map(q => `${q.l}: R ${q.R.toFixed(2)} A ${q.A.toFixed(2)}`).join(' | '));
  H.check('grating: reflected first orders leave at the grating-equation angle', r.grating.angs.some(a => Math.abs(a - r.grating.expect) < 0.3), r.grating);
  H.check('grating: order powers come from the RCWA solution and the budget closes', Math.abs((r.grating.orders['R+1'] + r.grating.orders['R-1']) / r.grating.in - r.grating.r1) < 1e-6 && Math.abs(r.grating.sum - 1) < 1e-3, r.grating);
  const hex = r.mix || '#000000', rr = parseInt(hex.slice(1, 3), 16), bb = parseInt(hex.slice(5, 7), 16);
  H.check('white light off gold, shown as one beam: mixed colour is warm (red > blue) and drawn', rr > bb + 40 && r.mixSvg, hex);
  H.check('a lit structure gets a landing spot drawn with the beams (structure underneath)', r.spot.spots > 0 && r.spot.beamsAt > 0 && r.spot.spotAfterBeams, r.spot);
  H.check('a data panel with an invalid (NaN) point still draws curves and axis numbers', !r.nanPlot.nan && r.nanPlot.ticks > 0 && r.nanPlot.skipped, r.nanPlot);
  H.check('"Beams interact" off on a patterned structure: the beam passes', r.off === 1, r.off);
  await page.close();
};
