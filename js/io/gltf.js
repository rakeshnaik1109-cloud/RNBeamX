/* ═══════════════════════════════════════════════════════════
   RNBeamX — io/gltf.js
   3D export as binary glTF 2.0 (.glb), for Blender and other 3D tools.

   The scene is the one the 3D view draws: every part's solid mesh
   (R3.objectFaces, with its mount), the traced beams as glowing tubes
   whose radius follows the drawn beam width (Gaussian waists included),
   the optical table, an orthographic camera matching the 3D view and a
   sun light. Materials are PBR: glass and crystals use transmission and
   an index of refraction (KHR_materials_transmission, KHR_materials_ior),
   mirrors and metal are metallic, beams are emissive
   (KHR_materials_emissive_strength), so they glow in Cycles and Eevee.

   Axes: RNBeamX works in page millimetres with x to the right, y down
   the page and z up from the table. glTF is right-handed with y up and
   metres: (x, y, z) → (x, z, y) × 0.001, so the figure keeps its layout.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX, U = RNBX.util, lib = RNBX.lib;
const G = RNBX.gltf = {};
const MM = 0.001;

const toG = p => [p[0] * MM, p[2] * MM, p[1] * MM];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const srgb2lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
const rgbOf = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim()); if (m) { const v = parseInt(m[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255].map(x => srgb2lin(x / 255)); }
  const r = /rgb\((\d+),\s*(\d+),\s*(\d+)/.exec(String(hex)); return r ? [r[1], r[2], r[3]].map(x => srgb2lin(+x / 255)) : [0.6, 0.6, 0.6]; };

/* a growing set of triangles per material */
function Mesh() { this.prims = new Map(); }
Mesh.prototype.add = function (matKey, tri, nrm) {
  const p = this.prims.get(matKey) || (this.prims.set(matKey, { pos: [], nor: [] }).get(matKey));
  // keep counter-clockwise winding about the outward normal
  let [a, b, c] = tri; if (dot(cross(sub(b, a), sub(c, a)), nrm) < 0) { const t = b; b = c; c = t; }
  [a, b, c].forEach(q => { p.pos.push(q[0], q[1], q[2]); p.nor.push(nrm[0], nrm[1], nrm[2]); });
};
Mesh.prototype.face = function (matKey, pts, nrm) {   // convex polygon, already in glTF space
  for (let i = 1; i < pts.length - 1; i++) this.add(matKey, [pts[0], pts[i], pts[i + 1]], nrm);
};
Mesh.prototype.empty = function () { return !this.prims.size; };

/* materials, keyed by their look */
const matKeyOf = m => {
  const glass = !!m.alpha && m.alpha < 0.95;
  const metal = !glass && (m.spec || 0) >= 0.75;
  return JSON.stringify({ c: m.color || '#9aa1ab', glass, metal, a: glass ? +(m.alpha).toFixed(2) : 1, iri: !!m.iri });
};
const materialOf = (key, name) => {
  const k = JSON.parse(key), rgb = rgbOf(k.c), mat = { name, pbrMetallicRoughness: { baseColorFactor: [rgb[0], rgb[1], rgb[2], 1], metallicFactor: 0, roughnessFactor: 0.55 } };
  if (k.glass) { mat.pbrMetallicRoughness.roughnessFactor = 0.04; mat.extensions = { KHR_materials_transmission: { transmissionFactor: 0.92 }, KHR_materials_ior: { ior: 1.5 } }; mat.alphaMode = 'BLEND'; mat.pbrMetallicRoughness.baseColorFactor[3] = Math.max(0.25, k.a); mat.doubleSided = true; }
  else if (k.metal) { mat.pbrMetallicRoughness.metallicFactor = 1; mat.pbrMetallicRoughness.roughnessFactor = k.iri ? 0.25 : 0.12; }
  return mat;
};
const beamMaterial = (rgb, strength) => ({ name: 'beam', pbrMetallicRoughness: { baseColorFactor: [rgb[0], rgb[1], rgb[2], 1], metallicFactor: 0, roughnessFactor: 0.5 }, emissiveFactor: rgb, extensions: { KHR_materials_emissive_strength: { emissiveStrength: strength } } });

/* a tube of varying radius along a straight piece of beam (page mm in, glTF out) */
const tube = (mesh, key, p0, p1, r0, r1, sides) => {
  const ax = norm(sub(p1, p0)), ref = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0], u = norm(cross(ax, ref)), v = cross(ax, u);
  const ring = (c, r) => { const out = []; for (let i = 0; i < sides; i++) { const t = i / sides * 2 * Math.PI; out.push([c[0] + r * (Math.cos(t) * u[0] + Math.sin(t) * v[0]), c[1] + r * (Math.cos(t) * u[1] + Math.sin(t) * v[1]), c[2] + r * (Math.cos(t) * u[2] + Math.sin(t) * v[2])]); } return out; };
  const A = ring(p0, r0), B = ring(p1, r1);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides, t = (i + 0.5) / sides * 2 * Math.PI, nn = toN([Math.cos(t) * u[0] + Math.sin(t) * v[0], Math.cos(t) * u[1] + Math.sin(t) * v[1], Math.cos(t) * u[2] + Math.sin(t) * v[2]]);
    mesh.face(key, [A[i], A[j], B[j], B[i]].map(toG), nn);
  }
};
const toN = n => norm([n[0], n[2], n[1]]);

/* the scene → glTF JSON + binary buffer */
G.build = (doc, opt = {}) => {
  const o = Object.assign({ table: true, beams: true, glow: 6, camera: true, light: true }, opt);
  const trace = RNBX.trace(doc), R3 = RNBX.render3d, bh = (doc.view3d && doc.view3d.beamHeight) || 6;
  const nodes = [], meshes = [], materials = [], matIndex = new Map(), scene = [];
  const bin = []; let binLen = 0;
  const accessors = [], bufferViews = [];
  const pushArray = (arr, type, target) => {
    const ta = type === 'u32' ? new Uint32Array(arr) : new Float32Array(arr);
    const bytes = new Uint8Array(ta.buffer); const pad = (4 - (binLen % 4)) % 4; if (pad) { bin.push(new Uint8Array(pad)); binLen += pad; }
    bufferViews.push(Object.assign({ buffer: 0, byteOffset: binLen, byteLength: bytes.length }, target ? { target } : {}));
    bin.push(bytes); binLen += bytes.length; return bufferViews.length - 1;
  };
  const matFor = (key, name, factory) => { if (!matIndex.has(key)) { materials.push(factory ? factory() : materialOf(key, name)); matIndex.set(key, materials.length - 1); } return matIndex.get(key); };
  const emitMesh = (mesh, name, matName) => {
    if (mesh.empty()) return null;
    const prims = [];
    mesh.prims.forEach((p, key) => {
      const n = p.pos.length / 3, mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { const v = p.pos[3 * i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
      const pv = pushArray(p.pos, 'f32', 34962), nv = pushArray(p.nor, 'f32', 34962), idx = []; for (let i = 0; i < n; i++) idx.push(i); const iv = pushArray(idx, 'u32', 34963);
      accessors.push({ bufferView: pv, componentType: 5126, count: n, type: 'VEC3', min: mn, max: mx }); const pa = accessors.length - 1;
      accessors.push({ bufferView: nv, componentType: 5126, count: n, type: 'VEC3' }); const na = accessors.length - 1;
      accessors.push({ bufferView: iv, componentType: 5125, count: n, type: 'SCALAR' }); const ia = accessors.length - 1;
      prims.push({ attributes: { POSITION: pa, NORMAL: na }, indices: ia, material: typeof key === 'number' ? key : matFor(key, matName) });
    });
    meshes.push({ name, primitives: prims }); return meshes.length - 1;
  };
  // parts
  const objs = (lib.expandIfNeeded ? lib.expandIfNeeded(doc.objects) : doc.objects).filter(ob => { const def = lib.get(ob.type); return def && !ob.hidden && !def.annotation && !def.special && !def.connection; });
  objs.forEach(ob => {
    let faces = []; try { faces = R3.objectFaces(ob, doc); } catch (e) { faces = []; }
    if (!faces.length) return;
    const mesh = new Mesh();
    faces.forEach(f => { const key = matKeyOf(f.m || {}); mesh.face(key, f.pts.map(toG), toN(f.n)); });
    const def = lib.get(ob.type), name = ((ob.label && ob.label.show && ob.label.text) ? RNBX.text.fill(ob.label.text, ob.props).replace(/[_^{}*\\\n]/g, ' ').trim() + ' · ' : '') + (ob.kindName || def.name);
    const mi = emitMesh(mesh, name, def.name);
    if (mi != null) { nodes.push({ name, mesh: mi }); scene.push(nodes.length - 1); }
  });
  // beams: one mesh per colour, tubes following the drawn width
  if (o.beams) {
    RNBX.beams.setContext(doc);
    const byCol = new Map();
    trace.segments.forEach(s => {
      if (s.kind !== 'beam' && s.kind !== 'vertical') return;
      if (s.ghost || s.len < 0.05) return;
      const col = lib.colorOf(doc, s.lambda, s.color), m = byCol.get(col) || (byCol.set(col, new Mesh()).get(col));
      const key = matFor('beam|' + col, 'beam', () => beamMaterial(rgbOf(col), o.glow));
      const at = u => s.vertical ? [s.a[0], s.a[1], bh + s.za + (s.zb - s.za) * u / (s.len || 1)] : [s.a[0] + (s.b[0] - s.a[0]) * u / s.len, s.a[1] + (s.b[1] - s.a[1]) * u / s.len, bh + (s.za || 0)];
      const hw = u => { let w = 0.15; try { w = RNBX.beams.hw(s, u); } catch (e) { /* default */ } if (s.ray) w = Math.min(w, 0.08); return Math.max(0.05, Math.min(w, 20)); };
      const nseg = s.q0 ? Math.min(24, Math.max(2, Math.ceil(s.len / 3))) : 1;
      for (let i = 0; i < nseg; i++) { const u0 = s.len * i / nseg, u1 = s.len * (i + 1) / nseg; tube(m, key, at(u0), at(u1), hw(u0), hw(u1), s.ray ? 6 : 12); }
    });
    const beamNodes = [];
    byCol.forEach((m, col) => { const mi = emitMesh(m, 'beam ' + col); if (mi != null) { nodes.push({ name: 'beam ' + col, mesh: mi }); beamNodes.push(nodes.length - 1); } });
    if (beamNodes.length) { nodes.push({ name: 'Beams', children: beamNodes }); scene.push(nodes.length - 1); }
  }
  // optical table
  let TA = null; try { TA = R3.tableArea(doc); } catch (e) { TA = null; }
  if (o.table && TA) {
    const mesh = new Mesh(), key = JSON.stringify({ c: (doc.view3d && doc.view3d.tableColor) || '#2c3036', glass: false, metal: false, a: 1 }), t = 2.5;
    const P = (x, y, z) => toG([x, y, z]), box = [[TA.x0, TA.y0], [TA.x1, TA.y0], [TA.x1, TA.y1], [TA.x0, TA.y1]];
    mesh.face(key, box.map(q => P(q[0], q[1], 0)), [0, 1, 0]);
    mesh.face(key, box.slice().reverse().map(q => P(q[0], q[1], -t)), [0, -1, 0]);
    for (let i = 0; i < 4; i++) { const a = box[i], b = box[(i + 1) % 4], nrm = toN(norm([b[1] - a[1], -(b[0] - a[0]), 0])); mesh.face(key, [P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0], b[1], -t), P(a[0], a[1], -t)], nrm); }
    materials.push(Object.assign(materialOf(key, 'optical table'), { name: 'optical table' })); matIndex.set(key, materials.length - 1);
    const mi = emitMesh(mesh, 'Optical table'); nodes.push({ name: 'Optical table', mesh: mi }); scene.push(nodes.length - 1);
  }
  // camera matching the 3D view (orthographic), looking at the table
  const cameras = [];
  if (o.camera && TA) {
    const v3 = doc.view3d || {}, phi = U.rad(v3.yaw == null ? 0 : v3.yaw), th = U.rad(v3.pitch == null ? 40 : v3.pitch);
    const right = [Math.cos(phi), -Math.sin(phi), 0], down = [Math.sin(phi) * Math.sin(th), Math.cos(phi) * Math.sin(th), -Math.cos(th)], toward = [Math.sin(phi) * Math.cos(th), Math.cos(phi) * Math.cos(th), Math.sin(th)];
    let X = toN(right), Y = toN(down.map(v => -v)), Z = toN(toward);
    if (dot(cross(X, Y), Z) < 0) X = X.map(v => -v);   // the axis swap mirrors: keep the frame right-handed
    const c = [(TA.x0 + TA.x1) / 2, (TA.y0 + TA.y1) / 2, bh], dist = Math.max(TA.x1 - TA.x0, TA.y1 - TA.y0) * 2;
    const pos = toG([c[0] + toward[0] * dist, c[1] + toward[1] * dist, c[2] + toward[2] * dist]);
    const m = [X, Y, Z], tr = m[0][0] + m[1][1] + m[2][2]; let q;
    if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; q = [(m[1][2] - m[2][1]) / s, (m[2][0] - m[0][2]) / s, (m[0][1] - m[1][0]) / s, 0.25 * s]; }
    else if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; q = [0.25 * s, (m[1][0] + m[0][1]) / s, (m[2][0] + m[0][2]) / s, (m[1][2] - m[2][1]) / s]; }
    else if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; q = [(m[1][0] + m[0][1]) / s, 0.25 * s, (m[2][1] + m[1][2]) / s, (m[2][0] - m[0][2]) / s]; }
    else { const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; q = [(m[2][0] + m[0][2]) / s, (m[2][1] + m[1][2]) / s, 0.25 * s, (m[0][1] - m[1][0]) / s]; }
    const ql = Math.hypot(q[0], q[1], q[2], q[3]); q = q.map(v => v / ql);
    const half = Math.max(TA.x1 - TA.x0, TA.y1 - TA.y0) * MM * 0.6;
    cameras.push({ name: 'RNBeamX 3D view', type: 'orthographic', orthographic: { xmag: half, ymag: half * 0.62, znear: 0.001, zfar: dist * MM * 4 } });
    nodes.push({ name: 'Camera', camera: 0, translation: pos, rotation: q }); scene.push(nodes.length - 1);
  }
  const json = {
    asset: { version: '2.0', generator: 'RNBeamX ' + (RNBX.VERSION || '') },
    scene: 0, scenes: [{ name: (doc.meta && doc.meta.title) || 'RNBeamX figure', nodes: scene }],
    nodes, meshes, materials, accessors, bufferViews, buffers: [{ byteLength: binLen }],
  };
  if (cameras.length) json.cameras = cameras;
  if (o.light) {
    json.extensions = { KHR_lights_punctual: { lights: [{ name: 'Sun', type: 'directional', intensity: 3, color: [1, 0.98, 0.95] }] } };
    nodes.push({ name: 'Sun', rotation: [-0.40, 0.25, 0.10, 0.876].map((v, i, a) => v / Math.hypot(...a)), extensions: { KHR_lights_punctual: { light: 0 } } }); scene.push(nodes.length - 1);
  }
  const used = new Set();
  materials.forEach(m => Object.keys(m.extensions || {}).forEach(k => used.add(k)));
  if (o.light) used.add('KHR_lights_punctual');
  if (used.size) json.extensionsUsed = [...used];
  // pack the buffer
  const buf = new Uint8Array(binLen); let off = 0; bin.forEach(b => { buf.set(b, off); off += b.length; });
  return { json, bin: buf };
};

/* .glb container: header, JSON chunk (space-padded), BIN chunk (zero-padded) */
G.glb = (doc, opt) => {
  const { json, bin } = G.build(doc, opt);
  let js = new TextEncoder().encode(JSON.stringify(json));
  const jpad = (4 - js.length % 4) % 4; if (jpad) { const t = new Uint8Array(js.length + jpad); t.set(js); t.fill(0x20, js.length); js = t; }
  const bpad = (4 - bin.length % 4) % 4, binP = new Uint8Array(bin.length + bpad); binP.set(bin);
  const total = 12 + 8 + js.length + 8 + binP.length, out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, js.length, true); dv.setUint32(16, 0x4E4F534A, true); out.set(js, 20);
  const o2 = 20 + js.length; dv.setUint32(o2, binP.length, true); dv.setUint32(o2 + 4, 0x004E4942, true); out.set(binP, o2 + 8);
  return out;
};
G.download = (doc, opt) => { const g = G.glb(doc, opt); U.download(new Blob([g], { type: 'model/gltf-binary' }), U.slug((doc.meta && doc.meta.title) || 'rnbeamx') + '.glb'); U.track && U.track('export-glb'); };
})();
