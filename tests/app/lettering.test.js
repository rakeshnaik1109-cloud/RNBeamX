/* Unlabelled export and the Labels layer; scalar grating order efficiencies */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · lettering layer, unlabelled export, scalar grating efficiencies');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const out = {};
    // 1. a labelled laser + lens + free text + panel letter
    { const d = RNBX.newDocument();
      const las = mk('laser', 20, 50, 0, { lambda: 633 }), lens = mk('lens', 60, 50, 0, {});
      las.label = Object.assign({}, las.label, { show: true, text: 'LaserXYZ' });
      d.objects = [las, lens, mk('text', 40, 20, 0, { text: 'FreeTextQ' }), mk('panel', 5, 5, 0, { text: 'a' })];
      d.style.showLabels = true;
      const withL = RNBX.render.build(d, { layers: true }).svg, without = RNBX.render.build(d, { labels: false, layers: true }).svg, plain = RNBX.render.build(d, {}).svg;
      const labelsLayer = (withL.match(/<g id="rbx-labels"[^>]*>([\s\S]*)<\/g><\/g>/) || [])[1] || '';
      out.lt = { layer: /inkscape:groupmode="layer" inkscape:label="Labels"/.test(withL) && /xmlns:inkscape=/.test(withL),
        inLayer: labelsLayer.includes('LaserXYZ') && labelsLayer.includes('FreeTextQ'),
        cleanHasNone: !/LaserXYZ|FreeTextQ/.test(without) && !/<text/.test(without),
        cleanKeepsBeams: without.includes('rbx-beams') || (without.match(/<path/g) || []).length > 5,
        plainNoNs: !/inkscape/.test(plain) && plain.includes('LaserXYZ'),
        parses: !new DOMParser().parseFromString(withL, 'image/svg+xml').querySelector('parsererror') };
    }
    // 2. scalar efficiencies: closed forms
    { const O = RNBX.optics;
      const J1 = O.besselJn(1, 1.8411838), J0 = O.besselJn(0, 2.404825558);
      const sin = { profile: 'sinus', depth: 0, transmit: true, nG: 1.5 };
      // transmission sinus grating with Δφ such that Δφ/2 = 1.8412 (J1 max): sum over all orders = 1
      const lam = 633, dphi = 2 * 1.8411838, h = dphi * lam / (2 * Math.PI * 0.5);
      const p = Object.assign({}, sin, { depth: h });
      let sum = 0; for (let m = -30; m <= 30; m++) sum += O.gratingEff(p, m, lam);
      const bin = { profile: 'binary', transmit: true, nG: 1.5, depth: lam / 2 / 0.5 * 1 };   // Δφ = π
      const bl = { profile: 'blazed', blazeNm: 500 };
      out.eff = { J1, J0, sum, e1: O.gratingEff(p, 1, lam), bin0: O.gratingEff(bin, 0, lam), bin1: O.gratingEff(bin, 1, lam), bin2: O.gratingEff(bin, 2, lam),
        blAt: O.gratingEff(bl, 1, 500), bl0At: O.gratingEff(bl, 0, 500), blOff: O.gratingEff(bl, 1, 700) };
    }
    // 3. traced: a blazed reflection grating puts nearly all power in +1 at its blaze wavelength, so the other orders are faint
    { const d = RNBX.newDocument();
      const g = mk('grating', 70, 50, 0, { profile: 'blazed', blazeNm: 633, G: 600, orders: '-1,0,1' });
      d.objects = [mk('laser', 20, 50, 0, { lambda: 633, power: 1 }), g];
      const t = RNBX.trace(d), refl = t.segments.filter(s => s.b[0] < s.a[0] - 1 || Math.abs(s.b[1] - s.a[1]) > 1).filter(s => s.a[0] > 60);
      const Ps = refl.map(s => s.P / (s.P0 || 1)).sort((a, b) => b - a);
      out.tr = { n: refl.length, top: Ps[0], rest: Ps.slice(1).reduce((a, b) => a + b, 0), opTop: RNBX.beams.opacity(d, refl.find(s => s.P / (s.P0 || 1) === Ps[0])) };
      g.props.profile = 'manual'; const t2 = RNBX.trace(d); out.tr.manualSegs = t2.segments.length; }
    return out;
  });
  H.check('SVG export: lettering in its own Inkscape "Labels" layer (labels and free text inside it)', r.lt.layer && r.lt.inLayer && r.lt.parses, r.lt);
  H.check('unlabelled export: no text at all, figure and beams kept', r.lt.cleanHasNone && r.lt.cleanKeepsBeams, r.lt);
  H.check('canvas rendering unchanged (no layer markup without the export option)', r.lt.plainNoNs, r.lt);
  const e = r.eff;
  H.check('Bessel J_m: J1 maximum 0.5819 at 1.8412, J0 zero at 2.4048', Math.abs(e.J1 - 0.581865) < 1e-5 && Math.abs(e.J0) < 1e-6, e);
  H.check('sinusoidal phase grating: orders sum to 1 and η±1 = J1²(Δφ/2) = 33.9 %', Math.abs(e.sum - 1) < 1e-4 && Math.abs(e.e1 - 0.338567) < 1e-4, e);
  H.check('binary π grating: no zero order, η±1 = 4/π² = 40.5 %, even orders 0', e.bin0 < 1e-9 && Math.abs(e.bin1 - 4 / Math.PI ** 2) < 1e-6 && e.bin2 === 0, e);
  H.check('blazed grating: 100 % in +1 at the blaze wavelength, less away from it', Math.abs(e.blAt - 1) < 1e-9 && e.bl0At < 1e-9 && e.blOff < 0.9 && e.blOff > 0.3, e);
  H.check('traced blazed grating: +1 order carries the power, the other orders are faint', r.tr.top > 0.95 && r.tr.rest < 0.05 && r.tr.manualSegs > 0, r.tr);
  await page.close();
};
