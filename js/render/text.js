/* ═══════════════════════════════════════════════════════════
   RNBeamX — render/text.js
   Lightweight scientific text markup → SVG <tspan>s.
   Text stays real, editable text in exported SVG/PDF (a common
   journal requirement), unlike rasterised equation images.

     x_2  x^2  x_{sub}  x^{sup}   \lambda \omega \Delta …
     *italic*   **bold**   \deg → °   \pm → ±   \to → →
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util;
const T = RNBX.text = {};

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ', tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  deg: '°', pm: '±', times: '×', cdot: '·', infty: '∞', hbar: 'ħ', to: '→', approx: '≈', leq: '≤', geq: '≥', neq: '≠',
  propto: '∝', partial: '∂', nabla: '∇', sqrt: '√', AA: 'Å', degree: '°', prime: '′', uparrow: '↑', downarrow: '↓', leftrightarrow: '↔',
};
T.GREEK = GREEK;
T.symbols = s => String(s).replace(/\\([A-Za-z]+)/g, (m, k) => GREEK[k] || m);

/* parse into runs {t, sh: -1 sub | 0 | 1 sup, b, i} */
T.parse = src => {
  const s = T.symbols(src);
  const runs = [];
  let i = 0, bold = false, ital = false;
  const push = (t, sh) => { if (!t) return; const last = runs[runs.length - 1]; if (last && last.sh === sh && last.b === bold && last.i === ital) last.t += t; else runs.push({ t, sh, b: bold, i: ital }); };
  while (i < s.length) {
    const c = s[i];
    if (c === '\\' && (s[i + 1] === '_' || s[i + 1] === '^' || s[i + 1] === '*' || s[i + 1] === '{' || s[i + 1] === '}')) { push(s[i + 1], 0); i += 2; continue; }
    if (c === '*' && s[i + 1] === '*') { bold = !bold; i += 2; continue; }
    if (c === '*') { ital = !ital; i++; continue; }
    if ((c === '_' || c === '^') && i + 1 < s.length) {
      const sh = c === '_' ? -1 : 1;
      if (s[i + 1] === '{') {
        const j = s.indexOf('}', i + 2);
        const end = j < 0 ? s.length : j;
        push(s.slice(i + 2, end), sh);
        i = end + 1;
      } else { push(s[i + 1], sh); i += 2; }
      continue;
    }
    push(c, 0);
    i++;
  }
  return runs;
};

T.markup = (src, fs = 2.5) => {
  const runs = T.parse(src == null ? '' : String(src));
  if (runs.length === 1 && runs[0].sh === 0 && !runs[0].b && !runs[0].i) return U.esc(runs[0].t);
  let out = '', cur = 0;
  const shift = sh => sh > 0 ? -0.38 * fs : sh < 0 ? 0.22 * fs : 0;
  for (const r of runs) {
    const target = shift(r.sh), dy = U.round(target - cur, 3);
    cur = target;
    const a = [];
    if (dy) a.push(`dy="${dy}"`);
    if (r.sh) a.push(`font-size="${U.round(fs * 0.7, 3)}"`);
    if (r.b) a.push('font-weight="700"');
    if (r.i) a.push('font-style="italic"');
    out += `<tspan ${a.join(' ')}>${U.esc(r.t)}</tspan>`;
  }
  if (cur) out += `<tspan dy="${U.round(-cur, 3)}">​</tspan>`;
  return out;
};

/* Approximate Helvetica/Arial advance widths (em) for layout. */
const W = {};
'iljI|!.,:;\''.split('').forEach(c => { W[c] = 0.26; });
'ftr()[]{} '.split('').forEach(c => { W[c] = 0.31; });
'mwMW'.split('').forEach(c => { W[c] = 0.86; });
T.measure = (src, fs) => {
  let w = 0;
  for (const r of T.parse(String(src || ''))) {
    const k = r.sh ? 0.7 : 1;
    for (const ch of r.t) {
      let e = W[ch];
      if (e == null) e = /[A-Z]/.test(ch) ? 0.68 : /[0-9]/.test(ch) ? 0.556 : 0.54;
      w += e * fs * k * (r.b ? 1.06 : 1);
    }
  }
  return w;
};

/* {key} tokens in component labels are replaced with live values */
T.fill = (tpl, props) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => {
  const v = props ? props[k] : undefined;
  if (v === undefined || v === null) return m;
  return typeof v === 'number' ? U.fmt(v, 1) : String(v);
});
})();
