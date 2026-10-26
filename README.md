# RNBeamX (Optical Setup Designer)

RNBeamX designs publication-ready optical experiment figures and graphical
abstracts in your web browser. You place lasers, mirrors, splitters, lenses and
detectors, and **the light is traced for you**: beams reflect, split, focus,
diffract and disperse, and they update live as you move or rotate anything.

There is nothing to install, no account, and your designs never leave your
computer.

**Version 1.0** · **Author:** Rakesh Naik · © 2026 Rakesh Naik. All rights reserved.

---

## Why another drawing tool?

Optical setup figures are usually drawn by hand in Illustrator or Inkscape with
a symbol library. That looks good, but every change means redrawing the beams,
and nothing checks that the light could actually go where it is drawn.
RNBeamX keeps the look of hand-made journal figures but makes the beam path
computed and editable.

| You want… | RNBeamX gives you |
|---|---|
| Clean line-art schematics (Optics Express, Opt. Lett., APL style) | **Schematic** style: flat fills, true line weights in pt |
| Polished figures (Nature Photonics, Light: Sci. Appl. style) | **Shaded** style: metal, glass and anodised gradients |
| Eye-catching 3D figures and graphical abstracts | **3D** style: optical table, posts, shadows, glowing beams, any camera angle |
| Animation for talks and social media | Keyframes on any property, light flow, pulses, camera orbits, MP4 / WebM export |
| Files journals accept | SVG and PDF (vector, editable text), TIFF and PNG with DPI written in, JPEG |

## Physics inside

The tracer is a real 2D optical model, not just a line router:

- **Mirrors, beam splitters, retroreflectors, SLMs**: reflection with set reflectance; concave mirrors focus.
- **Thin lenses and objectives**: paraxial focusing. Off-axis beams converge to the focal point, and the beam envelope pinches at the focus.
- **Polarisation (Jones calculus)**: wave plates at any angle and retardance, polarisers, PBS cubes, Faraday rotators, one-way isolators, EOMs. Optional ↕ / • / ↻ polarisation marks along the beams.
- **Wavelength**: dichroic mirrors, band-pass, long-pass, short-pass, notch and ND filters.
- **Dispersion**: prisms refract with Sellmeier glass data (N-BK7, fused silica, SF11, CaF₂, sapphire); gratings use the grating equation for any orders.
- **Nonlinear and active**: SHG / THG crystals, AOM diffraction orders, samples that emit Raman or fluorescence light back through the optics.
- **Fibres**: couplers joined by a fibre carry light to the far end.
- **Power bookkeeping**: click any detector to see how much light, and which wavelengths, reach it.

## Built for reviewers and editors

- **Journal presets** at final print size (Nature, APS/AIP, ACS, Elsevier, IEEE), graphical-abstract presets (Elsevier 5 : 2, ACS TOC, square) and slide sizes.
- **Journal check** flags text under 5 pt, hairlines, non-standard widths, non-Arial fonts, beams that leave the figure, dark detectors, unlabelled optics, red/green beam pairs and off-page objects.
- **Caption helper** writes a caption starter, with the abbreviations list taken from your labels. An **abbreviation key** can be placed in the figure too.
- **Colour-blind-safe** beam palette (Okabe–Ito), and labels that can show live values (`f = {f} mm`, `λ/2 ({angle}°)`).
- Text stays **real text** in SVG and PDF, with markup for subscripts, superscripts and Greek letters.

## Getting started

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari), or use
the single-file build `dist/rnbeamx-standalone.html`, which also works offline.

1. **Templates** → pick a setup (Michelson, Mach–Zehnder, confocal Raman/SERS,
   pump–probe, polarisation, spectrometer, spatial filter, 3D graphical abstract), or
2. add a **laser**, then click or drag optics from the library. Optics snap onto the beam and turn
   to the right angle. Press **F** to flip the turn direction, **R** to rotate.
3. Switch style with **1 / 2 / 3**, and use **Export** for the file you need.

See [docs/USER_MANUAL.md](docs/USER_MANUAL.md) for the full guide and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organised.

## Project layout

```
index.html              application shell
css/                    style.css (tokens, controls) · layout.css (panels, canvas)
js/core/                utils (vectors, colour, complex) · state (document, events, undo)
js/engine/              optics (Jones, Sellmeier, filters) · tracer (beam tracing)
js/components/          library (registry, drawing kit) · sources · optics · detectors · annotations
js/render/              text markup · defs (gradients) · beams · renderer (2D/SVG) · renderer3d
js/anim/                animation (keyframes, easing, playback)
js/io/                  project (save/open/autosave) · export (SVG/PDF/PNG/TIFF/video) · templates
js/ui/                  dom · canvas · palette · inspector · layers · timeline · dialogs · menus
js/vendor/              jsPDF + svg2pdf (MIT), loaded only for PDF export
dist/                   single-file build (python3 build-standalone.py)
```

## Licence

© 2026 Rakesh Naik. All rights reserved. See [LICENSE](LICENSE).
Bundled third-party libraries keep their own licences
(see [js/vendor/THIRD_PARTY_LICENSES.txt](js/vendor/THIRD_PARTY_LICENSES.txt)).
