# RNBeamX tests

```
npm install                          # once: installs Playwright
npx playwright install chromium      # once: the headless browser
npm test                             # everything (about 30 s)
node tests/run.js rcwa               # only suites whose file name contains "rcwa"
```

The runner starts a small web server for the app, runs the **physics** suites in
Node and the **app** suites in headless Chromium, prints every check and exits with
an error if any fails. Screenshots and exported files land in `tests/output/`
(not committed). GitHub runs the same suite on every push
(`.github/workflows/tests.yml`).

| Suite | What it checks |
|---|---|
| `physics/thinfilm` | Transfer-matrix method against Fresnel, Brewster, antireflection, Bragg-mirror closed forms, energy conservation, reciprocity, thick metals, and published SPR angles and sensitivity |
| `physics/rcwa` | Grating solver: identical to the transfer-matrix method for flat layers, R + T = 1 for lossless gratings, effective-medium limit (TE and TM), symmetry, surface-plasmon absorption at the grating-equation wavelength |
| `app/smoke` | The app loads; every library part creates, renders in all styles and has a thumbnail; every template builds, traces and renders; a setup can be built by clicking tiles |
| `app/optics` | Beam tracing: Brewster window, Gaussian focus, Michelson phase, Fabry–Pérot, periscope, live fringes, microring, the SPR dip in the traced beam |
| `app/features` | Reset and undo, groups, My components, stacking blocks, calculated panels, keyframe interpolation, Tidy, Fit to width, equal-spacing guides, old files, SVG sanitising, data panels |
| `app/export` | SVG, PDF, raster, PowerPoint package, TikZ, share links (round trip and opening one), video formats |
| `app/touch` | iPad and phone: drag, pinch-zoom, long press, touch toolbar, library drawer |
| `app/rcwa-ui` | Gratings built from blocks: exact slices, agreement with a hand-written grating, background (Web Worker) scan, physical results |

When you change the physics, add a check with an independent reference (a closed
form, a published value or a limiting case), not just the current output.
