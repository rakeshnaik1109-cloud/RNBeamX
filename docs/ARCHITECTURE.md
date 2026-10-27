# RNBeamX Architecture

RNBeamX is plain browser JavaScript with no build step and no framework. Modules
attach to one global namespace, `window.RNBX`, and load in dependency order from
`index.html`.

```
state (document) ──► tracer ──► renderer (2D) / renderer3d ──► SVG string
      ▲                                 │
      │                                 ├─► canvas (live, interactive)
 inspector, canvas,                     └─► exporters (SVG, PDF, PNG, TIFF, video)
 timeline, menus
```

## Modules

| Layer | Files | Responsibility |
|---|---|---|
| core | `utils.js`, `state.js` | Vectors, colour, complex numbers; document model, events, selection, undo/redo, page presets |
| engine | `optics.js`, `tracer.js`, `nkdata.js`, `thinfilm.js` | Jones calculus, Sellmeier dispersion, filter models; ray tracing into beam segments plus detector power; measured n, k tables and the transfer-matrix solver for planar films |
| components | `library.js` + catalogue files (`sources`, `optics`, `detectors`, `vertical`, `photonics`, `plot`, `illustration`, `nanostructures`, `shapes`, `annotations`) | The registry and drawing kit; each component declares params, drawing, optical surfaces, sources and 3D parts |
| render | `text.js`, `defs.js`, `beams.js`, `renderer.js`, `renderer3d.js`, `labels.js` | Text markup, gradients, beam drawing, 2D figure assembly, orthographic 3D with painter's sorting, automatic label placement |
| anim | `animation.js` | Keyframes, easing, camera track, playback, auto-key |
| io | `project.js`, `export.js`, `templates.js`, `styles.js` | Files, autosave, clipboard; exporters; built-in setups; style presets and house styles |
| ui | `dom.js`, `canvas.js`, `palette.js`, `inspector.js`, `layers.js`, `timeline.js`, `dialogs.js`, `menus.js` | The application |

## Adding a component

Register it in one of the files in `js/components/`:

```js
lib.register({
  type: 'myoptic', name: 'My optic', abbr: 'MO', category: 'Lenses & objectives',
  defaults: { d: 8, f: 50 },
  params: [{ key: 'f', label: 'Focal length', type: 'number', unit: 'mm' }],
  snap: 'perp',                                   // orientation when dropped on a beam
  bbox: p => [-1, -p.d / 2, 1, p.d / 2],          // local mm, beam along +x
  draw: (p, S) => H.rect(S, -1, -p.d / 2, 2, p.d, S.fill('glass')),
  optics: p => [{ kind: 'lens', a: [0, -p.d / 2], b: [0, p.d / 2], f: p.f }],
  solid: (p, bh) => [{ kind: 'cyl', x: [-1, 1], r: [p.d / 2, p.d / 2], mat: 'glass' }],
  mount: true,                                    // post + base in 3D
});
```

The palette, inspector, tracer, both renderers and all exporters pick it up
automatically.

## Surface kinds understood by the tracer

`mirror` (optional `f`), `splitter`, `pbs`, `dichroic`, `filter`, `lens`,
`waveplate`, `polarizer`, `rotator` (optional `isolator`), `grating`, polygon
refraction (`poly` + `mat`), `aom`, `shg`, `sample` (with emission), `retro`,
`aperture`, `fiberIn`, `vfold`, `periscope`, `cavity`, `ring`, `pass`, `absorb`.

Rays carry a height `z`; while `vz ≠ 0` they travel vertically and meet
objects whose `axis` is `up` / `down` (their first optical surface is reused,
placed at its true height along the object's axis). In Gaussian mode each ray
also carries the complex q parameter; every ray carries its optical path length
and extra phase, and detectors sum fields coherently per source and wavelength.

## Thin-film calculations

A component can declare a planar stack for the solver in `engine/thinfilm.js`:

```js
stack: p => ({ inc: { mat: 'glass:SF11' }, layers: [{ m: { mat: 'Au' }, d: 50 }], sub: { mat: 'H2O' } }),
calcParams: [ /* extra inspector fields shown under "Optical response" */ ],
calcNote: p => '…',          // caveat shown under the result
```

Materials are ids from `nkdata.js` (`'Ag'`, `'TiO2'`, `'H2O'`…), `'glass:<Sellmeier name>'`,
`'air'`, or `{ mat: 'custom', n, k }`; thicknesses are in nm. The inspector adds the
"Optical response" section, a data panel with `props.link = <stack id>` redraws
from `RNBX.thinfilm.cached(stack, calc)` on every change and animation frame, and
a polygon optic whose surface carries `film: { edge, stack }` reflects rays with
the complex rp, rs of that stack (the SPR prism base). `TF.solve` uses
e^(−iωt), N = n + ik, tilted admittances and per-layer scaling, so thick metal
layers cannot overflow. To refresh `nkdata.js`, re-run the extraction against the
refractiveindex.info database (CC0) with the dataset list in its header.

## Stackable building blocks

`components/nanostructures.js` registers blocks with `stackable: true` and a
`top(p)` method returning the surface they leave behind: `{ z, prof, grow }`
(height, periodic profile, conformal growth). A block attached with
`props.on = <id>` is re-placed on every change by `lib.stackRelayout`: same
x, y, rotation, W, D and view as the block below, and `props.base` set to that
block's top surface. Coatings grow the surface by their thickness (Minkowski
growth by a disc, so growths add); slabs flatten it; ridges add a profile.

## Conventions

- Units: millimetres on the printed page; line weights and type sizes in points.
- Local frame: the beam travels along +x; rotation is in degrees, clockwise on screen.
- Jones basis: p (in the table plane) and s (out of it).
- Rendering is pure: `RNBX.render.build(doc, opts)` returns the same SVG for the
  canvas and every exporter.
