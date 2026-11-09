/* Polarisation conventions: handedness labels, reflection, and elements crossed backwards */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · polarisation conventions (handedness, mirrors, double passes)');
  const page = await H.openApp(await getBrowser(), base);
  const r = await page.evaluate(() => {
    const mk = (type, x, y, rot, props) => Object.assign(RNBX.createObject(type, x, y), { rot: rot || 0 }, { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
    const run = objs => { const d = RNBX.newDocument(); d.objects = objs; return RNBX.trace(d); };
    const st = (t, o) => RNBX.optics.stokes(t.hits[o.id]);
    const back = t => t.segments.filter(s => s.b[0] < s.a[0] - 1 && s.a[0] < 62).map(s => RNBX.optics.describe(s.E));
    const out = {};
    // marker label and Stokes readout agree: (1, −i)/√2 is right circular, S3 = +1
    out.markerR = RNBX.optics.describe(RNBX.optics.jones('R')).hand; out.markerL = RNBX.optics.describe(RNBX.optics.jones('L')).hand;
    let D = mk('pd', 100, 50, 0); out.directR = st(run([mk('laser', 20, 50, 0, { pol: 'R' }), D]), D).s[2];
    // one 45° mirror reverses the handedness, two restore it
    D = mk('pd', 60, 20, -90); out.oneMirror = st(run([mk('laser', 20, 50, 0, { pol: 'R' }), mk('mirror', 60, 50, 45), D]), D).s[2];
    const M2 = mk('mirror', 60, 20, 45); D = mk('pd', 100, 20, 0); out.twoMirrors = st(run([mk('laser', 20, 50, 0, { pol: 'R' }), mk('mirror', 60, 50, 45), M2, D]), D).s[2];
    // double passes
    out.qwp = back(run([mk('laser', 10, 50, 0, { pol: 'H' }), mk('qwp', 50, 50, 0, { angle: 45 }), mk('mirror', 80, 50, 0)]))[0].kind;
    out.faraday = back(run([mk('laser', 10, 50, 0, { pol: 'H' }), mk('faraday', 50, 50, 0, { angle: 45 }), mk('mirror', 80, 50, 0)]))[0].kind;
    out.hwp = back(run([mk('laser', 10, 50, 0, { pol: 'H' }), mk('hwp', 50, 50, 0, { angle: 22.5 }), mk('mirror', 80, 50, 0)]))[0].kind;
    // total internal reflection gives r_p and r_s different phases (Fresnel rhomb: two TIRs at 54.6° in n = 1.51 ≈ 90°)
    const f = RNBX.optics.fresnelC(Math.cos(54.6 * Math.PI / 180), 1.51, 1), ph = z => Math.atan2(z.im, z.re);
    out.tir = { mod: [Math.hypot(f.rp.re, f.rp.im), Math.hypot(f.rs.re, f.rs.im)], dphi2: Math.abs(2 * (ph(f.rp) - ph(f.rs))) * 180 / Math.PI };
    return out;
  });
  H.check('beam markers and the Stokes readout agree: (1, −i)/√2 is right circular (S₃ = +1)', r.markerR === 'R' && r.markerL === 'L' && Math.abs(r.directR - 1) < 1e-9, r);
  H.check('a mirror turns right circular into left circular; a second mirror turns it back', Math.abs(r.oneMirror + 1) < 1e-6 && Math.abs(r.twoMirrors - 1) < 1e-6, r);
  H.check('double passes: QWP at 45° and a 45° Faraday rotator return H as V; a HWP returns H as H', r.qwp === 's' && r.faraday === 's' && r.hwp === 'p', r);
  const d = Math.abs(((r.tir.dphi2 % 360) + 360) % 360);
  H.check('total internal reflection: |r_p| = |r_s| = 1, two reflections at 54.6° (n = 1.51) add ≈ 90° of retardance', Math.abs(r.tir.mod[0] - 1) < 1e-9 && Math.abs(r.tir.mod[1] - 1) < 1e-9 && (Math.abs(d - 90) < 1.5 || Math.abs(d - 270) < 1.5), r.tir);
  await page.close();
};
