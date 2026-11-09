/* 3D export as binary glTF (.glb) */
'use strict';
module.exports = async ({ base, getBrowser, H }) => {
  H.suite('app · 3D export (glTF .glb)');
  const page = await H.openApp(await getBrowser(), base);
  const res = await page.evaluate(() => {
    const t = RNBX.templates.list.find(x => x.id === 'michelson') || RNBX.templates.list[0];
    const d = RNBX.normalizeDocument(t.build());
    const nParts = d.objects.filter(o => { const def = RNBX.lib.get(o.type); return def && !o.hidden && !def.annotation && !def.special && !def.connection; }).length;
    return { bytes: Array.from(RNBX.gltf.glb(d, {})), nParts, bare: RNBX.gltf.glb(d, { table: false, beams: false, camera: false, light: false }).length };
  });
  const buf = Buffer.from(res.bytes);
  const magic = buf.readUInt32LE(0), ver = buf.readUInt32LE(4), total = buf.readUInt32LE(8);
  const jlen = buf.readUInt32LE(12), jtype = buf.readUInt32LE(16), json = JSON.parse(buf.slice(20, 20 + jlen).toString('utf8'));
  const blen = buf.readUInt32LE(20 + jlen), btype = buf.readUInt32LE(24 + jlen), bin = buf.slice(28 + jlen, 28 + jlen + blen);
  H.check('GLB container: magic "glTF", version 2, JSON and BIN chunks, lengths consistent and 4-byte aligned', magic === 0x46546C67 && ver === 2 && total === buf.length && jtype === 0x4E4F534A && btype === 0x004E4942 && jlen % 4 === 0 && blen % 4 === 0 && json.buffers[0].byteLength <= blen, { magic, ver, total, len: buf.length, jlen, blen });
  // every accessor fits its buffer view, positions carry min/max, indices stay in range
  let ok = true, why = '';
  json.accessors.forEach((a, i) => { const bv = json.bufferViews[a.bufferView], per = a.type === 'VEC3' ? 12 : 4; if (bv.byteOffset + bv.byteLength > blen || a.count * per > bv.byteLength) { ok = false; why = 'accessor ' + i + ' overflows'; } });
  json.meshes.forEach(m => m.primitives.forEach(p => {
    const pa = json.accessors[p.attributes.POSITION], ia = json.accessors[p.indices], bv = json.bufferViews[ia.bufferView];
    if (!pa.min || !pa.max) { ok = false; why = 'no min/max'; }
    for (let k = 0; k < ia.count; k++) if (bin.readUInt32LE(bv.byteOffset + 4 * k) >= pa.count) { ok = false; why = 'index out of range'; break; }
    if (json.accessors[p.attributes.NORMAL].count !== pa.count) { ok = false; why = 'normal count'; }
  }));
  H.check('every accessor fits the buffer; positions have bounds; indices are in range', ok, why || json.accessors.length + ' accessors');
  const names = json.nodes.map(n => n.name);
  const glass = json.materials.filter(m => m.extensions && m.extensions.KHR_materials_transmission), beams = json.materials.filter(m => m.extensions && m.extensions.KHR_materials_emissive_strength), metal = json.materials.filter(m => m.pbrMetallicRoughness.metallicFactor === 1);
  H.check('one named node per part, plus beams, the optical table, a camera and a sun', json.nodes.filter(n => n.mesh != null && !/^beam |Optical table/.test(n.name)).length === res.nParts && names.includes('Beams') && names.includes('Optical table') && json.cameras && json.cameras[0].type === 'orthographic' && names.includes('Sun'), names);
  H.check('materials: glass with transmission and IOR, metallic mirrors and mounts, emissive beams; extensions declared', glass.length > 0 && glass.every(m => m.extensions.KHR_materials_ior) && metal.length > 0 && beams.length > 0 && ['KHR_materials_transmission', 'KHR_materials_ior', 'KHR_materials_emissive_strength', 'KHR_lights_punctual'].every(e => json.extensionsUsed.includes(e)), { glass: glass.length, metal: metal.length, beams: beams.length, used: json.extensionsUsed });
  // the table lies at y = 0 (glTF y up, metres) and the scene spans about the page size
  const tbl = json.meshes[json.nodes.find(n => n.name === 'Optical table').mesh].primitives[0], ta = json.accessors[tbl.attributes.POSITION];
  H.check('axes and units: y up, table top at y = 0, page millimetres as metres × 0.001', Math.abs(ta.max[1]) < 1e-9 && ta.min[1] < 0 && ta.max[0] - ta.min[0] > 0.05 && ta.max[0] - ta.min[0] < 1, { min: ta.min, max: ta.max });
  H.check('options: without table, beams, camera and light the file is smaller', res.bare < buf.length, { full: buf.length, bare: res.bare });
  // the export dialog offers it
  const dlg = await page.evaluate(() => { RNBX.dialogs.exporter('glb'); const t = document.querySelector('.modal').innerText; document.querySelector('.modal .icon-btn').click(); return /3D scene \(\.glb\)/.test(t) && /Blender/.test(t); });
  H.check('Export dialog lists “3D scene (.glb)” with Blender instructions', dlg, dlg);
  H.check('no errors', page.errors.length === 0, page.errors);
  await page.close();
};
