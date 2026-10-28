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
