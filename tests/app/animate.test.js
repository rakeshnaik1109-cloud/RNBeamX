/* One-click animation presets, Record mode, readable timeline rows and GIF export */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · animation presets');
  const page = await H.openApp(await getBrowser(), base);
  // every preset on a template that has what it needs: it must change the picture between two times
  const res = await page.evaluate(async () => {
    const out = {};
    const where = { flow: 'michelson', pulses: 'pumpprobe', switchon: 'michelson', wavelength: 'michelson', blink: 'michelson', waveplate: 'polarization', polariser: 'spr',
      scan: 'confocal', fringes: 'fringes', delay: 'pumpprobe', focus: 'gaussian', shutter: null, aom: null, field: 'fourf', binding: 'spr',
      orbit: 'confocal', zoom: 'confocal', build: 'confocal', spotlight: 'michelson', lift: 'michelson' };
    const P = RNBX.animPresets;
    for (const p of P.list) {
      let tpl = where[p.id];
      let d = tpl ? RNBX.templates.list.find(t => t.id === tpl).build() : RNBX.newDocument();
      if (!tpl) {   // shutter / AOM: a small setup with the part
        const mk = (type, x, y, props) => Object.assign(RNBX.createObject(type, x, y), { props: Object.assign(RNBX.createObject(type, 0, 0).props, props || {}) });
        d.objects = [mk('laser', 20, 50), mk(p.id === 'shutter' ? 'shutter' : 'aom', 60, 50), mk('screen', 120, 50, { d: 30 })];
      }
      d = RNBX.normalizeDocument(d);
      d.animation.tracks = {}; d.animation.camera = []; d.animation.flow = false; d.animation.pulses = false;
      RNBX.setDocument(d); RNBX.select([]);
      const ok = P.available(p, RNBX.state.doc);
      if (!ok) { out[p.id] = { ok: false }; continue; }
      const target = P.target(p, RNBX.state.doc, []);
      const o = {}; p.params.forEach(q => { o[q.key] = q.def ? q.def(RNBX.state.doc, target) : 0; });
      P.apply(p, target, o);
      const D = RNBX.state.doc.animation.duration;
      const svgAt = t => RNBX.render.build(RNBX.state.doc, { time: t, motion: true }).svg;
      const a = svgAt(D * 0.05), b = svgAt(D * 0.3), c = svgAt(D * 0.6);
      out[p.id] = { ok: true, target: target ? target.type : null, moves: a !== b || b !== c, applied: (RNBX.state.doc.animation.applied || []).length, mode: RNBX.state.doc.style.mode };
      // remove brings the figure back to still
      const uid = RNBX.state.doc.animation.applied[0].uid;
      P.remove(uid);
      const an = RNBX.state.doc.animation;
      out[p.id].removed = !RNBX.anim.hasAnimation(RNBX.state.doc) && !an.flow && !an.pulses && !an.reveal && !(an.applied || []).length;
    }
    return out;
  });
  Object.entries(res).forEach(([id, r]) => H.check(`preset "${id}" animates the figure and can be removed`, r.ok && r.moves && r.applied === 1 && r.removed, r));
  H.check('20 presets in three groups', Object.keys(res).length === 20, Object.keys(res).length);

  // the 3D turntable turns the whole setup a full circle and stays framed
  const orbit = await page.evaluate(() => {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'tower').build());
    const p = RNBX.animPresets.list.find(q => q.id === 'orbit');
    RNBX.animPresets.apply(p, null, { kind: 'full', pitch: 30, dir: '1', dur: 8 });
    const cam = RNBX.state.doc.animation.camera, d = RNBX.state.doc;
    const yaw = t => RNBX.anim.evaluate(d, t).view3d.yaw;
    return { n: cam.length, turn: yaw(8) - yaw(0), half: yaw(4) - yaw(0), mode: d.style.mode, loop: d.animation.loop };
  });
  H.check('3D rotation: a full 360° turn, linear, looping, in the 3D view', orbit.turn === 360 && Math.abs(orbit.half - 180) < 1e-6 && orbit.mode === '3d' && orbit.loop, orbit);

  // presets combine on one part without undoing each other (scan + fade)
  const combo = await page.evaluate(() => {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'confocal').build());
    const P = RNBX.animPresets, g = RNBX.state.doc.objects.find(o => o.type === 'galvo');
    P.apply(P.list.find(q => q.id === 'scan'), g, { amp: 2, dur: 4 });
    P.apply(P.list.find(q => q.id === 'build'), null, { grow: 3, dur: 4 });
    const d = RNBX.state.doc, ev = t => RNBX.anim.evaluate(d, t).objects.find(o => o.id === g.id);
    return { scan1: ev(1).props.scan, op0: ev(0).opacity, op4: ev(4).opacity, applied: d.animation.applied.length };
  });
  H.check('presets combine: the galvo still scans while the build-up fades it in', Math.abs(combo.scan1 - 2) < 1e-6 && combo.op0 === 0 && combo.op4 === 1 && combo.applied === 2, combo);

  // Record mode: with the timeline open, moving a part at a later time makes it animate from where it was
  const rec = await page.evaluate(async () => {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'michelson').build());
    RNBX.anim.record = true; RNBX.timeline.show();
    const m = RNBX.state.doc.objects.find(o => o.type === 'mirror'), x0 = m.x;
    RNBX.anim.setTime(2);
    RNBX.history.checkpoint(); m.x = x0 + 5; RNBX.anim.touch([m.id]); RNBX.changed();
    await new Promise(r => setTimeout(r, 50));
    const keys = RNBX.state.doc.animation.tracks[m.id] || [];
    const row = [...document.querySelectorAll('.tl-nm small')].map(s => s.textContent).join(' | ');
    RNBX.timeline.toggle();
    return { n: keys.length, x0: keys[0] && keys[0].x, x1: keys[1] && keys[1].x, start: x0, row };
  });
  H.check('Record mode: an edit at 2 s becomes a step, the part animates from its old place', rec.n === 2 && rec.x0 === rec.start && Math.abs(rec.x1 - rec.start - 5) < 1e-9, rec);
  H.check('timeline rows say in words what changes', /moves/.test(rec.row), rec.row);

  // the Animate dialog: cards, unavailable ones greyed, apply plays
  const dlg = await page.evaluate(async () => {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'michelson').build());
    RNBX.animateUI.open('orbit');
    const cards = document.querySelectorAll('.anim-card').length, off = document.querySelectorAll('.anim-card.off').length;
    [...document.querySelectorAll('.anim-side button')].find(b => b.textContent === 'Apply and play').click();
    await new Promise(r => setTimeout(r, 120));
    const playing = RNBX.state.playing; RNBX.anim.pause();
    return { cards, off, playing, mode: RNBX.state.doc.style.mode, open: !!document.querySelector('.modal') };
  });
  H.check('Animate dialog: 20 cards, missing parts greyed, Apply plays it', dlg.cards === 20 && dlg.off > 0 && dlg.playing && dlg.mode === '3d' && !dlg.open, dlg);

  // pulse shapes: wave packet (default), Gaussian, bar; the packet's carrier follows the wavelength
  const ps = await page.evaluate(() => {
    const d = RNBX.templates.list.find(t => t.id === 'pumpprobe').build(); d.animation.pulses = true; RNBX.setDocument(RNBX.normalizeDocument(d));
    const doc = RNBX.state.doc, svg = shape => { doc.animation.pulseShape = shape; return RNBX.render.build(doc, { time: 0.7, motion: true }).svg; };
    const out = { def: RNBX.beams.pulseShape(RNBX.newDocument()), packet: svg('packet'), gauss: svg('gauss'), bar: svg('bar') };
    const seg = l => ({ lambda: l, len: 100 });
    const crests = l => { const o = RNBX.beams.pulseOutline('packet', seg(l), 50, 0.7).line; let c = 0; for (let i = 1; i < o.length - 1; i++) if (o[i][1] > o[i - 1][1] && o[i][1] >= o[i + 1][1] && o[i][1] > 0.05) c++; return c / (o[o.length - 1][0] - o[0][0]); };
    doc.style.mode = '3d'; doc.animation.pulseShape = 'gauss'; const s3 = RNBX.render.build(doc, { time: 0.7, motion: true }).svg;
    return { def: out.def, differ: new Set([out.packet, out.gauss, out.bar]).size === 3, clean: [out.packet, out.gauss, s3].every(x => !/NaN|undefined/.test(x)), filled: /fill-opacity="0.45"/.test(out.gauss), dens: [crests(400), crests(800)] };
  });
  H.check('pulse shapes: wave packet is the default; packet, Gaussian and bar each draw differently (2D and 3D)', ps.def === 'packet' && ps.differ && ps.clean && ps.filled, ps);
  H.check('wave packet: a 400 nm pump has a faster carrier than an 800 nm probe', ps.dens[0] > ps.dens[1] * 1.5, ps.dens);

  // Stop & show figure: after playing a build-up and a 3D turn, the figure comes back exactly as before
  const still = await page.evaluate(async () => {
    RNBX.setDocument(RNBX.normalizeDocument(RNBX.templates.list.find(t => t.id === 'michelson').build()));
    const doc = RNBX.state.doc; doc.style.mode = '3d'; const yaw0 = doc.view3d.yaw;
    const before = RNBX.render.build(doc).svg;
    const P = RNBX.animPresets;
    P.apply(P.list.find(q => q.id === 'build'), null, { grow: 2, dur: 4 });
    P.apply(P.list.find(q => q.id === 'orbit'), null, { kind: 'full', pitch: 30, dir: '1', dur: 4 });
    RNBX.anim.play(); await new Promise(r => setTimeout(r, 350));
    const pill = !document.getElementById('playPill').hidden;
    RNBX.anim.setTime(1.3);
    const during = { yaw: doc.view3d.yaw, faded: doc.objects.some(o => o.opacity === 0) };
    RNBX.anim.play(); await new Promise(r => setTimeout(r, 100));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 60));
    const after = RNBX.render.build(doc).svg, canvasStill = !RNBX.anim.isLive(doc) || RNBX.state.stillView === doc;
    return { pill, during, playing: RNBX.state.playing, pillAfter: !document.getElementById('playPill').hidden, yaw: [yaw0, doc.view3d.yaw], same: before === after, canvasStill, visible: doc.objects.every(o => o.opacity == null || o.opacity === 1) };
  });
  H.check('while playing, a "Stop & show figure" pill is shown on the canvas', still.pill && still.during.faded && still.during.yaw !== still.yaw[0], still);
  H.check('Esc / Stop & show figure stops playback and restores the figure exactly as before the animation (3D view and parts)', !still.playing && !still.pillAfter && still.yaw[0] === still.yaw[1] && still.visible && still.same && still.canvasStill, still);

  // GIF export makes a valid looping GIF
  const gif = await page.evaluate(async () => {
    RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'michelson').build());
    RNBX.animPresets.apply(RNBX.animPresets.list.find(q => q.id === 'flow'), null, { speed: 25, dur: 1 });
    let blob = null; const keep = RNBX.util.download; RNBX.util.download = b => { blob = b; };
    await RNBX.exporter.gif({ width: 240, fps: 8 });
    RNBX.util.download = keep;
    const b = new Uint8Array(await blob.arrayBuffer()), s = String.fromCharCode(...b.slice(0, 6));
    // walk the GIF blocks and count image descriptors
    let i = 13 + 768, frames = 0;
    const skipSub = () => { while (b[i]) i += b[i] + 1; i++; };
    while (i < b.length && b[i] !== 0x3B) { if (b[i] === 0x21) { i += 2; skipSub(); } else if (b[i] === 0x2C) { frames++; i += 10; i++; skipSub(); } else break; }
    const img = await new Promise(r => { const im = new Image(); im.onload = () => r([im.naturalWidth, im.naturalHeight]); im.onerror = () => r(null); im.src = URL.createObjectURL(blob); });
    return { sig: s, size: blob.size, loop: new TextDecoder().decode(b.slice(0, 900)).includes('NETSCAPE2.0'), frames, img, end: b[b.length - 1] };
  });
  H.check('GIF export: a valid looping GIF89a the browser can open', gif.sig === 'GIF89a' && gif.loop && gif.end === 0x3B && gif.img && gif.img[0] === 240, gif);
  H.check('GIF export: one frame per 1/fps', gif.frames === 8, gif.frames);

  await page.evaluate(() => { RNBX.setDocument(RNBX.templates.list.find(t => t.id === 'confocal').build()); RNBX.animateUI.open('orbit'); });
  await page.waitForTimeout(200); await H.shot(page, 'animate-dialog');
  H.check('no errors', page.errors.length === 0, page.errors.join(' | '));
  await page.context().close();
};
