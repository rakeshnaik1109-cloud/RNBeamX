/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/styles.js
   One-click figure styles, plus your own "house style": save the
   current look under a name, export it as a small .json file and
   share it with your group so every figure matches.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state;
const St = RNBX.styles = {};
const KEY = 'rnbx_house_styles';

/* style keys that define a look (page size and content are never touched) */
St.KEYS = ['mode', 'lineWidthPt', 'outline', 'font', 'fontSizePt', 'labelColor', 'showLabels', 'beamStyle', 'ribbonWidth', 'beamWidth', 'beamGlow', 'beamArrows', 'beamFade', 'beamOpacity', 'colorMode', 'polarization', 'fiberColor', 'wireColor', 'beamModel', 'gaussMag', 'waistLabels', 'ghosts'];

St.BUILTIN = [
  { id: 'lineart', name: 'Classic line art', desc: 'Optics Express / Optics Letters look: flat parts, uniform beams with arrows',
    style: { mode: 'schematic', beamStyle: 'line', beamArrows: true, beamGlow: false, lineWidthPt: 0.5, fontSizePt: 7, font: 'Arial, Helvetica, sans-serif', colorMode: 'physical', beamWidth: 0.6 } },
  { id: 'nature', name: 'High-impact journal', desc: 'Shaded parts, true beam widths, 7 pt Arial: the Nature Photonics look',
    style: { mode: 'shaded', beamStyle: 'envelope', beamArrows: false, beamGlow: false, lineWidthPt: 0.5, fontSizePt: 7, font: 'Arial, Helvetica, sans-serif', colorMode: 'physical', beamWidth: 0.7, beamFade: true } },
  { id: 'render3d', name: '3D rendered', desc: 'Optical table, posts and glowing beams for covers and abstracts',
    style: { mode: '3d', beamGlow: true, beamStyle: 'envelope', fontSizePt: 7, lineWidthPt: 0.5 } },
  { id: 'mono', name: 'Monochrome print', desc: 'Black beams with arrows for black-and-white printing',
    style: { mode: 'schematic', colorMode: 'mono', beamStyle: 'line', beamArrows: true, beamGlow: false, lineWidthPt: 0.5, fontSizePt: 7, beamWidth: 0.45 } },
  { id: 'safe', name: 'Colour-blind safe', desc: 'Okabe–Ito beam colours with wavelength-ordered hues',
    style: { colorMode: 'safe' } },
  { id: 'talk', name: 'Presentation', desc: 'Large text, heavier lines and glowing beams that read from the back of a room',
    style: { mode: 'shaded', fontSizePt: 14, lineWidthPt: 1, beamWidth: 1.4, beamGlow: true, beamArrows: false } },
  { id: 'dark', name: 'Dark graphical abstract', desc: 'Deep-navy page, 3D table and glow', page: { background: 'dark' },
    style: { mode: '3d', beamGlow: true, fontSizePt: 8 } },
];

St.house = () => U.store.get(KEY, []);
St.all = () => St.BUILTIN.concat(St.house().map(h => Object.assign({ house: true }, h)));

St.apply = id => {
  const p = St.all().find(x => x.id === id);
  if (!p) return;
  RNBX.history.checkpoint();
  Object.assign(S.doc.style, p.style);
  if (p.page) Object.assign(S.doc.page, p.page);
  RNBX.emit('styleMode', S.doc.style.mode);
  RNBX.changed();
  RNBX.menus && RNBX.menus.syncTools();
  RNBX.inspector.build();
  RNBX.toast('Style: ' + p.name);
};
St.current = () => { const o = {}; St.KEYS.forEach(k => { if (S.doc.style[k] !== undefined) o[k] = S.doc.style[k]; }); return o; };
St.saveHouse = name => {
  const list = St.house();
  list.push({ id: 'h' + U.uid(), name, desc: 'Your saved style', style: St.current(), page: { background: S.doc.page.background, bg: S.doc.page.bg, bg2: S.doc.page.bg2 } });
  U.store.set(KEY, list);
};
St.removeHouse = id => U.store.set(KEY, St.house().filter(h => h.id !== id));
St.exportHouse = () => {
  const data = { app: 'RNBeamX', kind: 'house-style', styles: St.house().length ? St.house() : [{ id: 'h' + U.uid(), name: 'My group style', style: St.current() }] };
  U.download(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), 'rnbeamx-house-style.json');
};
St.importHouse = file => file.text().then(t => {
  const d = JSON.parse(t);
  const list = (d.styles || []).filter(x => x && x.style);
  if (!list.length) throw new Error('No styles in this file');
  const mine = St.house();
  list.forEach(x => mine.push(Object.assign({}, x, { id: 'h' + U.uid() })));
  U.store.set(KEY, mine);
  RNBX.toast(`Imported ${list.length} style${list.length > 1 ? 's' : ''}`);
  RNBX.inspector.build();
}).catch(e => RNBX.toast(e.message || 'Could not read the style file', 'error'));
})();
