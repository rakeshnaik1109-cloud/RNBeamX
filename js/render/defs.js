/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/defs.js
   Shared SVG paint servers for the "shaded" style. Gradients use
   objectBoundingBox units, so they follow each part's own size
   and rotation. No filters are used for the figure itself, which
   keeps exports identical in browsers, Illustrator and PDF.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX;

const lin = (id, stops, dir = 'v') => {
  const xy = dir === 'v' ? 'x1="0" y1="0" x2="0" y2="1"' : dir === 'h' ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="1" y2="1"';
  return `<linearGradient id="${id}" ${xy}>${stops.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('')}</linearGradient>`;
};

RNBX.renderDefs = () => [
  lin('rbx-glass', [[0, '#eef7fd', 0.92], [0.42, '#c3ddf1', 0.82], [0.58, '#d9eaf7', 0.82], [1, '#a7c8e4', 0.9]], 'd'),
  lin('rbx-mirror', [[0, '#f7f9fb'], [0.42, '#c3cad3'], [0.55, '#8d97a4'], [1, '#e2e6ea']]),
  lin('rbx-metal', [[0, '#f1f3f5'], [0.48, '#c7ccd3'], [0.52, '#a4abb5'], [1, '#d9dde2']]),
  lin('rbx-dark', [[0, '#5d646f'], [0.45, '#353a42'], [0.55, '#272b31'], [1, '#41474f']]),
  lin('rbx-black', [[0, '#41464e'], [0.5, '#1f2226'], [1, '#2c3036']]),
  lin('rbx-body', [[0, '#ffffff'], [0.6, '#eef0f3'], [1, '#dde1e6']]),
  lin('rbx-crystal', [[0, '#fde6f1'], [0.5, '#f1abcb'], [1, '#fbd2e4']], 'd'),
  lin('rbx-gold', [[0, '#fff2c7'], [0.45, '#e4bb55'], [0.6, '#c9982e'], [1, '#f3d98b']]),
  lin('rbx-wph', [[0, '#f3ecfc'], [0.5, '#cdb6ec'], [1, '#e5d9f6']]),
  lin('rbx-wpq', [[0, '#e9f8fb'], [0.5, '#a6d7e3'], [1, '#d3eef4']]),
  lin('rbx-polar', [[0, '#d9dde2'], [0.5, '#8e96a1'], [1, '#c3c8cf']]),
  lin('rbx-nd', [[0, '#a3a8af'], [0.5, '#5f646b'], [1, '#8e939a']]),
  lin('rbx-anod', [[0, '#5a606a'], [1, '#2a2e34']]),
  lin('rbx-sensor', [[0, '#9fb7d6'], [0.5, '#3b5a85'], [1, '#7f9cc4']]),
  lin('rbx-wafer', [[0, '#c9c4e0'], [0.5, '#7d77a0'], [1, '#aaa4c6']], 'd'),
  lin('rbx-sample', [[0, '#f7f0e2'], [1, '#e0d3b8']]),
  lin('rbx-screen', [[0, '#ffffff'], [1, '#e9e9e4']]),
  lin('rbx-rainbow', [[0, '#7a5cff'], [0.2, '#2f8cff'], [0.4, '#22c38e'], [0.6, '#e8d84a'], [0.8, '#ff8a3d'], [1, '#e8455a']]),
  lin('rbx-sheen', [[0, '#ffffff', 0.55], [1, '#ffffff', 0]]),
].join('');

/* page backgrounds, including the dark styles favoured for
   graphical abstracts and cover art */
RNBX.renderBackground = (page, transparent) => {
  if (transparent || page.background === 'transparent') return '';
  const W = page.width, H = page.height;
  switch (page.background) {
    case 'dark': return `<rect x="0" y="0" width="${W}" height="${H}" fill="#0b1020"/>`;
    case 'gradient':
      return `<defs><radialGradient id="rbx-bg" cx="0.5" cy="0.45" r="0.75"><stop offset="0" stop-color="${page.bg}"/><stop offset="1" stop-color="${page.bg2}"/></radialGradient></defs><rect x="0" y="0" width="${W}" height="${H}" fill="url(#rbx-bg)"/>`;
    case 'linear':
      return `<defs><linearGradient id="rbx-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${page.bg}"/><stop offset="1" stop-color="${page.bg2}"/></linearGradient></defs><rect x="0" y="0" width="${W}" height="${H}" fill="url(#rbx-bg)"/>`;
    case 'custom': return `<rect x="0" y="0" width="${W}" height="${H}" fill="${page.bg}"/>`;
    default: return `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`;
  }
};
RNBX.isDarkPage = page => page.background === 'dark' || ((page.background === 'gradient' || page.background === 'linear' || page.background === 'custom') && (() => {
  const c = RNBX.util.hexToRgb(page.bg); return (c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11) < 110;
})());
})();
