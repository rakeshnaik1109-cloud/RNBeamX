# RNBeamX (Optical Setup Designer)

RNBeamX designs publication-ready optical experiment figures and graphical
abstracts in your web browser. You place lasers, mirrors, splitters, lenses and
detectors, and **the light is traced for you**: beams reflect, split, focus,
diffract and disperse, and they update live as you move or rotate anything.

There is nothing to install, no account, and your designs never leave your
computer.

**Version 1.1** · **Authors:** [Rakesh Naik](https://scholar.google.com/citations?user=xDMzlr0AAAAJ&hl=en "Google Scholar")<sup>1</sup>, Sachin Kumar Srivastava<sup>1,2</sup>
<sup>1</sup>Centre for Photonics and Quantum Communication Technology, IIT Roorkee ·
<sup>2</sup>Department of Physics, IIT Roorkee
© 2026 Rakesh Naik and Sachin Kumar Srivastava. All rights reserved.

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
- **Beams off the table**: fold mirrors and periscopes send light up microscope towers or to a new height; lenses, objectives, samples and detectors can lie flat with a vertical axis.
- **Gaussian beams**: true waists, Rayleigh ranges and M², with focus labels (2w₀).
- **Ghost reflections**: Fresnel reflections at glass surfaces (s and p, so Brewster windows work), uncoated or AR-coated.
- **Interference**: optical path and phase are tracked, so detectors report coherent power and fringe phase; a piezo on any mirror moves live fringes.
- **Resonators and photonic chips**: Fabry–Pérot cavities (Airy transmission) and add–drop ring resonators that can be tuned and animated.
- **Power bookkeeping**: click any detector to see how much light, and which wavelengths, reach it.

## Built for reviewers and editors

- **Journal presets** at final print size (Nature, APS/AIP, ACS, Elsevier, IEEE), graphical-abstract presets (Elsevier 5 : 2, ACS TOC, square) and slide sizes.
- **Journal check** flags text under 5 pt, hairlines, non-standard widths, non-Arial fonts, beams that leave the figure, dark detectors, unlabelled optics, red/green beam pairs and off-page objects.
- **Caption helper** writes a caption starter, with the abbreviations list taken from your labels. An **abbreviation key** can be placed in the figure too.
- **Colour-blind-safe** beam palette (Okabe–Ito), and labels that can show live values (`f = {f} mm`, `λ/2 ({angle}°)`).
- Text stays **real text** in SVG and PDF, with markup for subscripts, superscripts and Greek letters.

## Figure-making extras

- **Multi-panel figures**: add a vector data plot as panel b. Import CSV/TXT, paste data, or press **→ RNBeamX** in RNSpectraX to send a processed spectrum across.
- **Automatic label placement** (Shift+L), with leader lines, in 2D and 3D.
- **Custom components**: import your own SVG drawing (stays vector) or photo, give it an optical behaviour, and keep it in *My components*.
- **Style presets and house styles**: one-click journal looks, plus your group's own style saved and shared as a file.
- **Touch and tablets**: pinch-zoom, two-finger pan, long-press menus and a touch toolbar.
- **Building blocks for device sketches**: substrate and film slabs, grating ridges, conformal coatings, nano-object arrays (disks, pillars, cones, spheres, core–shell, rods) and 2D-material sheets that stack onto each other and can be calculated as a stack.
- **Device sketches and lab illustration**: multilayer / grating stacks with a layer key, IR camera, laptop, pipette, flow cell, angle fans and dimension lines; an SPR (Kretschmann) prism, a pass-through instrument box (e.g. an FTIR Michelson), and wide translucent ribbon beams.
- **One-click reset** (↺ next to undo) that is itself undoable.
- **Calculated spectra**: layer stacks and the SPR prism compute reflectance, transmittance and absorptance against wavelength or angle (transfer-matrix method, measured n, k for metals, oxides, semiconductors, liquids and polymers), shown in a data panel that updates live, and the traced beam carries the SPR dip.

## Getting started

Open `index.html` in a modern browser (Chrome, Edge, Firefox or Safari), or use
the single-file build `dist/rnbeamx-standalone.html`, which also works offline.

1. **Templates** → pick a setup (Michelson, Mach–Zehnder, confocal Raman/SERS,
   pump–probe, polarisation, spectrometer, spatial filter, upright microscope,
   live fringes, Gaussian telescope, microring, coated grating, FTIR beam
   path, SPR sensor, 3D graphical abstract), or
2. add a **laser**, then click or drag optics from the library. Optics snap onto the beam and turn
   to the right angle. Press **F** to flip the turn direction, **R** to rotate.
3. Switch style with **1 / 2 / 3**, and use **Export** for the file you need.

See the illustrated [Guide](https://rakeshnaik1109-cloud.github.io/RNBeamX/guide.html) (`guide.html`),
[docs/USER_MANUAL.md](docs/USER_MANUAL.md) for the full manual,
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the code is organised, and
[docs/USABILITY_TEST.md](docs/USABILITY_TEST.md) for a ready-made user test with lab members.

## Companion: RNSpectraX

[RNSpectraX](https://rakeshnaik1109-cloud.github.io/RNSpectra_X/) is the
spectral analysis suite from the same authors (Raman/SERS processing, XY
plotting and fitting). Press **→ RNBeamX** under its *Export* menu to send a
processed spectrum here as panel b of your figure, or import its *Plotted
CSV*. Author website: [rakeshnaik1109-cloud.github.io/RakeshNaik](https://rakeshnaik1109-cloud.github.io/RakeshNaik/).

## Project layout

```
index.html              application shell
css/                    style.css (tokens, controls) · layout.css (panels, canvas)
js/core/                utils (vectors, colour, complex) · state (document, events, undo)
js/engine/              optics (Jones, Sellmeier, filters) · tracer (beam tracing)
js/components/          library (registry, drawing kit) · sources · optics · detectors · vertical · photonics · plot · annotations
js/render/              text markup · defs (gradients) · beams · renderer (2D/SVG) · renderer3d · labels (auto placement)
js/anim/                animation (keyframes, easing, playback)
js/io/                  project (save/open/autosave) · export (SVG/PDF/PNG/TIFF/video) · templates · styles
js/ui/                  dom · canvas · palette · inspector · layers · timeline · dialogs · menus
js/vendor/              jsPDF + svg2pdf (MIT), loaded only for PDF export
dist/                   single-file build (python3 build-standalone.py)
```

## Privacy

Your figures stay in your browser: nothing you draw is uploaded. The only thing
recorded is an anonymous visit count, plus which features were used (for example
"template-spr", "export-pdf" or "style-3d"), sent with
[GoatCounter](https://www.goatcounter.com): no cookies, no personal data, and
nothing about your figures or files. Opened from a local file (the offline
single-file build), RNBeamX is not counted.

## Licence

© 2026 Rakesh Naik and Sachin Kumar Srivastava. All rights reserved. See [LICENSE](LICENSE).
Bundled third-party libraries keep their own licences
(see [js/vendor/THIRD_PARTY_LICENSES.txt](js/vendor/THIRD_PARTY_LICENSES.txt)).
