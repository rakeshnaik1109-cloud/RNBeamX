/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/share.js
   Sharing and more export formats.

   • Share link: the whole figure, compressed into the address
     (index.html#fig=…). Nothing is uploaded; whoever opens the
     link gets an editable copy.
   • PowerPoint (.pptx): one slide the size of the figure with the
     figure as a vector picture (SVG, PNG fallback). In PowerPoint,
     right-click ▸ Convert to Shape makes every part editable.
   • TikZ (.tex): the figure as TikZ commands (paths, text, colours,
     line styles) for LaTeX documents; compile with LuaLaTeX or
     XeLaTeX for Unicode text such as Greek letters.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, S = RNBX.state;
const SH = RNBX.share = {};

/* ================= share link ================= */
const b64url = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64url = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); const out = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i); return out; };
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
SH.encode = async doc => {
  const json = new TextEncoder().encode(JSON.stringify(doc));
  if (window.CompressionStream) return 'z' + b64url(await pipe(json, new CompressionStream('deflate-raw')));
  return 'j' + b64url(json);
};
SH.decode = async code => {
  const kind = code[0], bytes = unb64url(code.slice(1));
  const json = kind === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
  return JSON.parse(new TextDecoder().decode(json));
};
SH.link = async () => {
  const code = await SH.encode(S.doc);
  return location.origin + location.pathname + '#fig=' + code;
};
SH.copyLink = async () => {
  try {
    const url = await SH.link();
    if (/^file:/.test(location.href)) RNBX.toast('Note: this link points to a file on your computer; share links work from the online RNBeamX.');
    await navigator.clipboard.writeText(url);
    RNBX.toast(url.length > 60000 ? `Link copied (${Math.round(url.length / 1000)} k characters: very long, some apps may cut it; Save project is safer)` : 'Share link copied: whoever opens it gets an editable copy of this figure');
    U.track('share-link');
  } catch (e) { RNBX.toast('Could not copy the link: ' + e.message, 'error'); }
};
/* opened from a share link */
SH.openFromHash = async () => {
  const m = /[#&]fig=([^&]+)/.exec(location.hash);
  if (!m) return false;
  try {
    const doc = await SH.decode(m[1]);
    RNBX.history.checkpoint();
    RNBX.setDocument(RNBX.normalizeDocument(doc), true);
    history.replaceState(null, '', location.pathname + location.search);
    setTimeout(() => RNBX.canvas.fit(), 30);
    RNBX.toast('Shared figure opened. Your previous figure is one undo away (Ctrl+Z).');
    return true;
  } catch (e) { RNBX.toast('This share link could not be read: ' + e.message, 'error'); return false; }
};

/* ================= minimal ZIP writer (stored) ================= */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
SH.zip = files => {
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  files.forEach(f => {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
    h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
    c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  });
  const csize = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
  return new Blob(parts.concat(central, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
};

/* ================= PowerPoint ================= */
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main', NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', NS_P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const rels = list => XML + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list.map(r => `<Relationship Id="${r[0]}" Type="${REL}/${r[1]}" Target="${r[2]}"/>`).join('')}</Relationships>`;
const THEME = XML + `<a:theme xmlns:a="${NS_A}" name="RNBeamX"><a:themeElements><a:clrScheme name="RNBeamX"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="1F2937"/></a:dk2><a:lt2><a:srgbClr val="F3F4F6"/></a:lt2><a:accent1><a:srgbClr val="5B4BDB"/></a:accent1><a:accent2><a:srgbClr val="1F77B4"/></a:accent2><a:accent3><a:srgbClr val="2CA02C"/></a:accent3><a:accent4><a:srgbClr val="D62728"/></a:accent4><a:accent5><a:srgbClr val="FF7F0E"/></a:accent5><a:accent6><a:srgbClr val="9467BD"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="RNBeamX"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="RNBeamX"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
const SPTREE_EMPTY = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
SH.pptx = async () => {
  const X = RNBX.exporter, doc = S.doc, EMU = 36000;
  const cx = Math.max(914400, Math.round(doc.page.width * EMU)), cy = Math.max(914400, Math.round(doc.page.height * EMU));
  const fx = Math.round(doc.page.width * EMU), fy = Math.round(doc.page.height * EMU);
  const ox = Math.round((cx - fx) / 2), oy = Math.round((cy - fy) / 2);
  const svg = '<?xml version="1.0" encoding="UTF-8"?>\n' + X.svgString({});
  const dpi = 300, wpx = Math.round(doc.page.width / 25.4 * dpi), hpx = Math.round(doc.page.height / 25.4 * dpi);
  const canvas = await X.rasterize(X.svgString({}), wpx, hpx, '#ffffff');
  const png = new Uint8Array(await (await new Promise(r => canvas.toBlob(r, 'image/png'))).arrayBuffer());
  const title = U.esc(doc.meta.title || 'RNBeamX figure');
  const files = [
    { name: '[Content_Types].xml', data: XML + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="svg" ContentType="image/svg+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: rels([['rId1', 'officeDocument', 'ppt/presentation.xml'], ['rId2', '../package/2006/relationships/metadata/core-properties', 'docProps/core.xml'], ['rId3', 'extended-properties', 'docProps/app.xml']]).replace(`${REL}/../package/2006/relationships/metadata/core-properties`, 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties') },
    { name: 'docProps/core.xml', data: XML + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title}</dc:title><dc:creator>RNBeamX</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: XML + `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>RNBeamX</Application><Slides>1</Slides></Properties>` },
    { name: 'ppt/presentation.xml', data: XML + `<p:presentation xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId2"/></p:sldIdLst><p:sldSz cx="${cx}" cy="${cy}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>` },
    { name: 'ppt/_rels/presentation.xml.rels', data: rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'slide', 'slides/slide1.xml'], ['rId3', 'theme', 'theme/theme1.xml']]) },
    { name: 'ppt/theme/theme1.xml', data: THEME },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: XML + `<p:sldMaster xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${SPTREE_EMPTY}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst></p:sldMaster>` },
    { name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels', data: rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']]) },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: XML + `<p:sldLayout xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${SPTREE_EMPTY}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>` },
    { name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', data: rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']]) },
    { name: 'ppt/slides/slide1.xml', data: XML + `<p:sld xmlns:a="${NS_A}" xmlns:r="${NS_R}" xmlns:p="${NS_P}"><p:cSld><p:spTree>${SPTREE_EMPTY}<p:pic><p:nvPicPr><p:cNvPr id="2" name="${title}" descr="${title} (made with RNBeamX)"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId2"><a:extLst><a:ext uri="{96DAC541-7B7A-43D3-8B79-37D633B846F1}"><asvg:svgBlip xmlns:asvg="http://schemas.microsoft.com/office/drawing/2016/SVG/main" r:embed="rId3"/></a:ext></a:extLst></a:blip><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${ox}" y="${oy}"/><a:ext cx="${fx}" cy="${fy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>` },
    { name: 'ppt/slides/_rels/slide1.xml.rels', data: rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'image', '../media/figure.png'], ['rId3', 'image', '../media/figure.svg']]) },
    { name: 'ppt/media/figure.png', data: png },
    { name: 'ppt/media/figure.svg', data: svg },
  ];
  return SH.zip(files);
};

/* ================= TikZ ================= */
const parseColor = c => {
  if (!c || c === 'none' || c === 'transparent') return null;
  c = c.trim();
  if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); return h.slice(0, 6).toUpperCase(); }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (m) return m[1].split(',').slice(0, 3).map(v => Math.round(+v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const named = { white: 'FFFFFF', black: '000000', red: 'FF0000', blue: '0000FF', green: '008000', gray: '808080', grey: '808080' };
  return named[c.toLowerCase()] || null;
};
const matMul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const parseTransform = t => {
  let m = [1, 0, 0, 1, 0, 0];
  if (!t) return m;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let x;
  while ((x = re.exec(t))) {
    const v = x[2].split(/[\s,]+/).filter(Boolean).map(Number);
    let n2 = [1, 0, 0, 1, 0, 0];
    if (x[1] === 'matrix') n2 = v;
    else if (x[1] === 'translate') n2 = [1, 0, 0, 1, v[0] || 0, v[1] || 0];
    else if (x[1] === 'scale') n2 = [v[0], 0, 0, v[1] == null ? v[0] : v[1], 0, 0];
    else if (x[1] === 'rotate') {
      const a = (v[0] || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      n2 = [c, s, -s, c, 0, 0];
      if (v.length > 2) n2 = matMul(matMul([1, 0, 0, 1, v[1], v[2]], n2), [1, 0, 0, 1, -v[1], -v[2]]);
    } else if (x[1] === 'skewX') n2 = [1, 0, Math.tan(v[0] * Math.PI / 180), 1, 0, 0];
    else if (x[1] === 'skewY') n2 = [1, Math.tan(v[0] * Math.PI / 180), 0, 1, 0, 0];
    m = matMul(m, n2);
  }
  return m;
};
const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
/* SVG path data → absolute segments: ['M',x,y] ['L',x,y] ['C',x1,y1,x2,y2,x,y] ['Z'] */
const pathSegs = d => {
  const toks = String(d).match(/[a-zA-Z]|-?(?:\d*\.\d+|\d+\.?)(?:e[-+]?\d+)?/g) || [];
  const out = [];
  let i = 0, cmd = '', cx = 0, cy = 0, sx = 0, sy = 0, lc = null;
  const num = () => parseFloat(toks[i++]);
  const arc = (x1, y1, rx, ry, phi, fa, fs, x2, y2) => {
    // endpoint → centre parametrisation, then ≤ 90° cubic pieces
    if (!rx || !ry) { out.push(['L', x2, y2]); return; }
    rx = Math.abs(rx); ry = Math.abs(ry);
    const p = phi * Math.PI / 180, cp = Math.cos(p), sp = Math.sin(p);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2, x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
    let lam = x1p * x1p / (rx * rx) + y1p * y1p / (ry * ry); if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
    const sgn = fa === fs ? -1 : 1, num2 = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p, den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    const co = sgn * Math.sqrt(Math.max(0, num2 / den)), cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
    const ccx = cp * cxp - sp * cyp + (x1 + x2) / 2, ccy = sp * cxp + cp * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= 2 * Math.PI; else if (fs && dt < 0) dt += 2 * Math.PI;
    const nseg = Math.ceil(Math.abs(dt) / (Math.PI / 2)), h = dt / nseg, k = 4 / 3 * Math.tan(h / 4);
    const P = t => [ccx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, ccy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp];
    const D = t => [-rx * Math.sin(t) * cp - ry * Math.cos(t) * sp, -rx * Math.sin(t) * sp + ry * Math.cos(t) * cp];
    for (let s = 0; s < nseg; s++) {
      const a = t1 + s * h, b = a + h, pa = P(a), pb = P(b), da = D(a), db = D(b);
      out.push(['C', pa[0] + k * da[0], pa[1] + k * da[1], pb[0] - k * db[0], pb[1] - k * db[1], pb[0], pb[1]]);
    }
  };
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase(), bx = rel ? cx : 0, by = rel ? cy : 0;
    if (C === 'Z') { out.push(['Z']); cx = sx; cy = sy; lc = null; continue; }
    if (i >= toks.length || /[a-zA-Z]/.test(toks[i])) { if (C !== 'Z') i++; continue; }
    if (C === 'M') { cx = bx + num(); cy = by + num(); sx = cx; sy = cy; out.push(['M', cx, cy]); cmd = rel ? 'l' : 'L'; lc = null; }
    else if (C === 'L') { cx = bx + num(); cy = by + num(); out.push(['L', cx, cy]); lc = null; }
    else if (C === 'H') { cx = bx + num(); out.push(['L', cx, cy]); lc = null; }
    else if (C === 'V') { cy = (rel ? cy : 0) + num(); out.push(['L', cx, cy]); lc = null; }
    else if (C === 'C') { const a = [bx + num(), by + num(), bx + num(), by + num(), bx + num(), by + num()]; out.push(['C'].concat(a)); lc = [a[2], a[3]]; cx = a[4]; cy = a[5]; }
    else if (C === 'S') { const r1 = lc ? [2 * cx - lc[0], 2 * cy - lc[1]] : [cx, cy]; const a = [bx + num(), by + num(), bx + num(), by + num()]; out.push(['C', r1[0], r1[1]].concat(a)); lc = [a[0], a[1]]; cx = a[2]; cy = a[3]; }
    else if (C === 'Q') { const q = [bx + num(), by + num()], e = [bx + num(), by + num()]; out.push(['C', cx + 2 / 3 * (q[0] - cx), cy + 2 / 3 * (q[1] - cy), e[0] + 2 / 3 * (q[0] - e[0]), e[1] + 2 / 3 * (q[1] - e[1]), e[0], e[1]]); lc = null; cx = e[0]; cy = e[1]; }
    else if (C === 'A') { const rx = num(), ry = num(), phi = num(), fa = num(), fs = num(), x2 = bx + num(), y2 = by + num(); arc(cx, cy, rx, ry, phi, fa, fs, x2, y2); cx = x2; cy = y2; lc = null; }
    else i++;
  }
  return out;
};
const texEsc = s => String(s).replace(/\\/g, '\\textbackslash{}').replace(/([%&#$_{}])/g, '\\$1').replace(/~/g, '\\textasciitilde{}').replace(/\^/g, '\\textasciicircum{}');
SH.tikz = () => {
  const svgText = RNBX.exporter.svgString({});
  const dom = new DOMParser().parseFromString(svgText, 'image/svg+xml');
  const root = dom.documentElement, grads = {};
  root.querySelectorAll('linearGradient, radialGradient').forEach(g => {
    const stops = [...g.querySelectorAll('stop')].map(s => parseColor(s.getAttribute('stop-color') || (s.getAttribute('style') || '').replace(/.*stop-color:\s*([^;]+).*/, '$1'))).filter(Boolean);
    if (stops.length) {
      const avg = [0, 1, 2].map(k => Math.round(stops.reduce((a, h) => a + parseInt(h.slice(k * 2, k * 2 + 2), 16), 0) / stops.length).toString(16).padStart(2, '0')).join('').toUpperCase();
      grads[g.id] = avg;
    }
  });
  const colors = new Map(), lines = [];
  const col = hex => { if (!colors.has(hex)) colors.set(hex, 'rbx' + colors.size); return colors.get(hex); };
  const f = v => U.round(v, 3);
  const paint = (v, inh) => {
    if (v == null) return inh;
    const m = /url\(#([^)]+)\)/.exec(v);
    if (m) return grads[m[1]] || null;
    return parseColor(v);
  };
  const shapeSegs = el => {
    const a = n => el.getAttribute(n), tag = el.tagName;
    if (tag === 'rect') { const x = +a('x') || 0, y = +a('y') || 0, w = +a('width') || 0, h = +a('height') || 0; return [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']]; }
    if (tag === 'circle' || tag === 'ellipse') { const cx = +a('cx') || 0, cy = +a('cy') || 0, rx = tag === 'circle' ? +a('r') : +a('rx'), ry = tag === 'circle' ? +a('r') : +a('ry'); return pathSegs(`M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`); }
    if (tag === 'path') return pathSegs(a('d'));
    return null;
  };
  const segsToTikz = (segs, mm) => {
    let d = '';
    segs.forEach(sg => {
      if (sg[0] === 'M') { const q = ap(mm, sg[1], sg[2]); d += ` (${f(q[0])},${f(q[1])})`; }
      else if (sg[0] === 'L') { const q = ap(mm, sg[1], sg[2]); d += ` -- (${f(q[0])},${f(q[1])})`; }
      else if (sg[0] === 'C') { const a1 = ap(mm, sg[1], sg[2]), a2 = ap(mm, sg[3], sg[4]), e = ap(mm, sg[5], sg[6]); d += ` .. controls (${f(a1[0])},${f(a1[1])}) and (${f(a2[0])},${f(a2[1])}) .. (${f(e[0])},${f(e[1])})`; }
      else if (sg[0] === 'Z') d += ' -- cycle';
    });
    return d;
  };
  const walk = (el, m, st) => {
    const tag = el.tagName;
    if (!tag || ['defs', 'clipPath', 'title', 'desc', 'linearGradient', 'radialGradient', 'mask', 'pattern'].includes(tag)) return;
    const a = n => el.getAttribute(n);
    const mm = matMul(m, parseTransform(a('transform')));
    const s = Object.assign({}, st);
    if (a('fill') != null) s.fill = paint(a('fill'));
    if (a('stroke') != null) s.stroke = paint(a('stroke'));
    if (a('stroke-width') != null) s.sw = parseFloat(a('stroke-width'));
    if (a('stroke-dasharray') != null) s.dash = a('stroke-dasharray') === 'none' ? null : a('stroke-dasharray');
    if (a('stroke-linecap') != null) s.cap = a('stroke-linecap');
    if (a('stroke-linejoin') != null) s.join = a('stroke-linejoin');
    if (a('opacity') != null) s.op *= parseFloat(a('opacity'));
    if (a('fill-opacity') != null) s.fop = parseFloat(a('fill-opacity'));
    if (a('stroke-opacity') != null) s.sop = parseFloat(a('stroke-opacity'));
    if (a('font-size') != null) s.fs = parseFloat(a('font-size'));
    if (a('font-weight') != null) s.bold = /bold|700/.test(a('font-weight'));
    if (a('font-style') != null) s.italic = /italic/.test(a('font-style'));
    if (a('text-anchor') != null) s.anchor = a('text-anchor');
    if (a('dominant-baseline') != null) s.base = a('dominant-baseline');
    // clip paths become TikZ \clip scopes (the zoom insets use them)
    const cp = /url\(#([^)]+)\)/.exec(a('clip-path') || '');
    if (cp && !st.inClip) {
      const cpEl = dom.getElementById(cp[1]), shp = cpEl && cpEl.firstElementChild;
      const cs = shp ? shapeSegs(shp) : null;
      if (cs && cs.length) {
        lines.push('\\begin{scope}', '\\clip' + segsToTikz(cs, mm) + ';');
        el.removeAttribute('clip-path');
        walk(el, m, Object.assign({}, st));
        lines.push('\\end{scope}');
        return;
      }
    }
    if (tag === 'use') {
      const id = (a('href') || a('xlink:href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '').replace('#', '');
      const target = id && dom.getElementById(id);
      if (target && (s.depth || 0) < 3) walk(target, mm, Object.assign({}, s, { depth: (s.depth || 0) + 1 }));
      return;
    }
    if (tag === 'g' || tag === 'svg') { [...el.children].forEach(c => walk(c, mm, s)); return; }
    let segs = null;
    if (tag === 'path') segs = pathSegs(a('d'));
    else if (tag === 'rect') {
      const x = +a('x') || 0, y = +a('y') || 0, w = +a('width') || 0, h = +a('height') || 0;
      if (tag === 'rect' && el.parentNode && el.parentNode.tagName === 'clipPath') return;
      segs = [['M', x, y], ['L', x + w, y], ['L', x + w, y + h], ['L', x, y + h], ['Z']];
    } else if (tag === 'line') segs = [['M', +a('x1') || 0, +a('y1') || 0], ['L', +a('x2') || 0, +a('y2') || 0]];
    else if (tag === 'circle' || tag === 'ellipse') {
      const cx = +a('cx') || 0, cy = +a('cy') || 0, rx = tag === 'circle' ? +a('r') : +a('rx'), ry = tag === 'circle' ? +a('r') : +a('ry');
      segs = pathSegs(`M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`);
    } else if (tag === 'polygon' || tag === 'polyline') {
      const p = (a('points') || '').trim().split(/[\s,]+/).map(Number);
      segs = []; for (let k = 0; k + 1 < p.length; k += 2) segs.push([k ? 'L' : 'M', p[k], p[k + 1]]);
      if (tag === 'polygon') segs.push(['Z']);
    } else if (tag === 'text') {
      const x = parseFloat(a('x')) || 0, y = parseFloat(a('y')) || 0, q = ap(mm, x, y);
      let body = '';
      el.childNodes.forEach(nd => {
        if (nd.nodeType === 3) body += texEsc(nd.textContent);
        else if (nd.tagName === 'tspan') {
          const bs = nd.getAttribute('baseline-shift') || '', t = texEsc(nd.textContent);
          body += /sub|-/.test(bs) ? `\\textsubscript{${t}}` : /super|^\d/.test(bs) ? `\\textsuperscript{${t}}` : /italic/.test(nd.getAttribute('font-style') || '') ? `\\textit{${t}}` : t;
        }
      });
      if (!body.trim()) return;
      const rot = -Math.atan2(mm[1], mm[0]) * 180 / Math.PI, sc = Math.hypot(mm[0], mm[1]);
      const fsPt = (s.fs || 3) * sc / 0.3528;
      const anc = s.base === 'central' || s.base === 'middle' ? (s.anchor === 'start' ? 'west' : s.anchor === 'end' ? 'east' : 'center') : (s.anchor === 'start' ? 'base west' : s.anchor === 'end' ? 'base east' : 'base');
      const fillHex = s.fill || '000000';
      lines.push(`\\node[anchor=${anc}, inner sep=0pt, text=${col(fillHex)}${s.op < 1 ? `, opacity=${f(s.op)}` : ''}${Math.abs(rot) > 0.01 ? `, rotate=${f(rot)}` : ''}, font=\\fontsize{${f(fsPt)}}{${f(fsPt * 1.2)}}\\selectfont${s.bold ? '\\bfseries' : ''}${s.italic ? '\\itshape' : ''}] at (${f(q[0])},${f(q[1])}) {${body}};`);
      return;
    } else if (tag === 'image') { lines.push('% (embedded image omitted)'); return; }
    if (!segs || !segs.length) return;
    const fill = s.fill, stroke = s.stroke;
    if (!fill && !stroke) return;
    const scl = Math.sqrt(Math.abs(mm[0] * mm[3] - mm[1] * mm[2]));
    const opts = [];
    if (fill) opts.push(`fill=${col(fill)}`);
    if (stroke) { opts.push(`draw=${col(stroke)}`, `line width=${f((s.sw == null ? 1 : s.sw) * scl)}mm`); if (s.cap) opts.push(`line cap=${s.cap === 'square' ? 'rect' : s.cap}`); if (s.join) opts.push(`line join=${s.join}`); if (s.dash) { const dd = s.dash.split(/[\s,]+/).map(Number).filter(isFinite); if (dd.length) opts.push('dash pattern=' + dd.map((v, k) => `${k % 2 ? 'off' : 'on'} ${f(v * scl)}mm`).join(' ')); } }
    const fo = (s.fop == null ? 1 : s.fop) * s.op, so = (s.sop == null ? 1 : s.sop) * s.op;
    if (fill && fo < 0.999) opts.push(`fill opacity=${f(fo)}`);
    if (stroke && so < 0.999) opts.push(`draw opacity=${f(so)}`);
    lines.push(`\\path[${opts.join(', ')}]${segsToTikz(segs, mm)};`);
  };
  walk(root, [1, 0, 0, 1, 0, 0], { fill: '000000', stroke: null, sw: 1, op: 1 });
  const W = S.doc.page.width, H = S.doc.page.height;
  const head = `% ${S.doc.meta.title || 'RNBeamX figure'} — made with RNBeamX ${RNBX.VERSION}
% Compile with LuaLaTeX or XeLaTeX (Unicode text such as Greek letters).
% Coordinates in millimetres from the top-left corner (y points down).
% Gradients are approximated by their average colour.
\\documentclass[tikz,border=0pt]{standalone}
\\usepackage{fontspec}
\\setmainfont{Arial}[Scale=1]
`;
  const defs = [...colors].map(([hex, name]) => `\\definecolor{${name}}{HTML}{${hex}}`).join('\n');
  return `${head}${defs}\n\\begin{document}\n\\begin{tikzpicture}[x=1mm, y=-1mm]\n\\useasboundingbox (0,0) rectangle (${f(W)},${f(H)});\n${lines.join('\n')}\n\\end{tikzpicture}\n\\end{document}\n`;
};
})();
