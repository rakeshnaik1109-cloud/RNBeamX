# RNBeamX User Manual

> New here? The illustrated [Guide](https://rakeshnaik1109-cloud.github.io/RNBeamX/guide.html)
> (also the **Guide** button in the top bar) walks through a first figure in five steps.

## 1. The workspace

| Area | What it does |
|---|---|
| **Top bar** | File / Edit / Arrange / View menus, figure style (Schematic · Shaded · 3D), undo · redo · **↺ reset**, view toggles, Guide, Manual, Templates, Export |
| **Library** (left) | Every component, grouped and searchable. Drag a tile onto the page, or click it |
| **Canvas** (centre) | The page at its true printed size, in millimetres |
| **Properties** (right) | With nothing selected: page, journal preset, style, beams, 3D camera. With a selection: that object |
| **Layers** (right tab) | Stacking order, show/hide, lock; drag rows to reorder |
| **Timeline** (bottom, **T**) | Keyframes, light flow, pulses, video export |

## 2. Building a setup

1. Add a source: **Laser**, a pulsed laser, a white-light source or an LED.
2. **Click** an optic in the library: it is placed on the open end of the beam and
   turned to the correct angle. Clicking items in order builds the setup.
3. **Drag** an optic onto any beam: it snaps to the beam (a pink dot shows the snap)
   and orients itself. Hold **Alt** to place freely, **Shift** to stay on one axis.
4. Fine-tune with the handles (round = rotate in 15° steps, Shift for 1°;
   square = scale or resize), the arrow keys (0.5 mm, Shift = 5 mm), **R** / **Shift+R**,
   **F** (flip a mirror to turn the other way) and **O** (orient to the beam it sits on).
5. Fibres and wires: pick **Optical fibre** or **Electrical connection** in
   *Connections*, then click the two ends. Light entering the first fibre coupler
   leaves the second.

Focal lengths are physical millimetres. The **figure scale** (Properties ▸ Beams)
sets how many physical mm one drawn mm represents (default 10), so a 100 mm lens
focuses 10 mm away on the page.

### Beams that leave the table

- **Fold mirror (up / down)** turns a beam vertical. Anything you stack above it
  must have its **Optical axis** set to *Vertical, facing up* and a **Height z**
  (Properties ▸ Position). Seen from above, such parts are drawn as discs with
  ⊙ (beam towards you) or ⊗ (away). See the *Upright Raman microscope* template.
- **Periscope** changes the beam height (and optionally its direction). Optics
  dropped onto the raised beam take its height automatically; a part at another
  height lets the beam pass over or under it.

## 3. Labels and text

Every component gets a label (M1, L2, PBS…), placed clear of parts and beams.
Drag a label to move it, double-click it to edit, and reset it from the
inspector. **Arrange ▸ Auto-arrange labels** (Shift+L) tidies every label at
once, adding thin leader lines where a label has to move away. In 3D, labels
have their own positions, so tidying the 3D view never disturbs the 2D layout. Labels and text boxes accept:

| Markup | Result |
|---|---|
| `x_2`, `x_{max}` | subscript |
| `x^2`, `x^{2+}` | superscript |
| `\lambda \omega \Delta \mu` … | Greek letters |
| `\deg \pm \times \to \approx` | ° ± × → ≈ |
| `*text*`, `**text**` | italic, bold |
| `{f}`, `{lambda}`, `{angle}` | live value of that component's parameter |

## 4. Figure styles

- **Schematic**: textbook line art with flat tints; best for Optics Express / APL-type figures.
- **Shaded**: gradient metals, glass and anodised bodies; best for high-impact journals.
- **3D**: the same layout on an optical table. Set orbit, tilt, zoom, beam height,
  table, holes, posts and shadows under *3D camera & table*, or use the sliders
  on the canvas. Labels can be dragged in 3D without disturbing the 2D layout.

Beams can be drawn at true width (with foci and divergence) or as uniform lines,
with optional glow, direction arrows, power fading, polarisation marks and a
colour-blind-safe palette. Beams of several wavelengths on one path appear as a
colour ribbon.

### Physics options (Properties ▸ Beams, with nothing selected)

| Option | What it does |
|---|---|
| Beam model: Gaussian | Propagates the complex beam parameter q: true waist size, Rayleigh range and M² (set on the laser). *Label foci* writes 2w₀ at each focus; the beam profiler reports the radius there. *Width exaggeration* scales the drawing only. |
| Surface reflections | Adds Fresnel ghost beams (dashed) at glass surfaces: uncoated (4 % at normal incidence, with correct s/p dependence, so a Brewster window gives no p-ghost) or AR-coated. |
| Interference | Always on: detectors report coherent power, phase difference Δφ and visibility. Give a mirror a **piezo displacement** (nm) to shift the phase; the *Interference fringes* annotation shows the camera image and moves when you animate the piezo. |

Resonators: the **Optical cavity** follows the Airy transmission of its two
mirrors; the **Ring resonator chip** gives through- and drop-port powers. Both
have a resonant wavelength, free spectral range and a *detuning* you can
animate to scan the resonance.

## 5. Graphical abstracts and cover art

Choose a graphical-abstract preset (Elsevier 5 : 2, ACS TOC, square) and a dark or
gradient background. Add titles, curved arrows, glows, wave packets, photons
(hν), nanoparticles and images from *Graphical abstract* and *Annotations*.
The 3D style with beam glow is a quick route to an eye-catching abstract.

## 5b. Multi-panel figures and data

**File ▸ Add data panel** inserts a vector plot as panel b (beside the setup if
there is room, otherwise below it, growing the page). In its inspector:
**Import CSV / TXT** (any x, y1, y2… columns, or RNSpectraX's *Plotted CSV*),
**Paste**, or **From RNSpectraX**. In RNSpectraX, open *Export ▾* and press
**→ RNBeamX**: the plot on screen opens in RNBeamX as a new panel, with its
colours and axis titles. Set axis titles, ranges, a reversed axis, stacked
offsets and legend in the inspector.

## 5b2. Device sketches and lab equipment

Two library groups cover figures that are more than an optical table. These
parts are illustrations: beams are not traced through them (use the optical
parts for that).

| Part | Notes |
|---|---|
| **Multilayer / grating stack** | Edit the layers bottom → top in the inspector: colour, name, drawn thickness, tag; ↑ reorders, the bin removes, **+ Layer on top** adds. Surface profile flat, sinusoidal, trapezoid or square; period, ridge fraction and depth; period and ridge dimension labels; layer key; view angle and depth (oblique projection). Variants: MIM grating stack, corrugated film stack, sensor chip. For stacks built part by part, see the building blocks below |
| **3D cylinder**, **3D block / slab** | Detector housings with coaxial face rings, substrates, chips |
| **Thermal / IR camera**, **Laptop**, **Pipette with droplet**, **Flow cell (inlet / outlet)**, **Light bulb** | Lab equipment for measurement sketches; texts and colours are editable |
| **Angle marker (θ)** | Arc between two directions with an optional dashed normal |
| **Dimension line (Λ = …)** | Arrows or ticks, label follows the line |
| **Angle fan (θ arrows)** | Observation or emission angles, with an arc and label |

Optical parts for these figures:

- **SPR prism (Kretschmann)**, a variant of *Dispersive prism*: apex down, with
  a metal film and sensing layer on the base. The beam is refracted and totally
  internally reflected at the base.
- **Optical module (beam passes through)**, with the variant **Michelson
  interferometer (FTIR)**: a labelled box the beam crosses unchanged, for
  instruments drawn as black boxes.
- **Cylindrical mirror** and **Large parabolic mirror** (Mirrors & splitters).
- **Arrow / line** can carry text along it (*Process arrow with text*), for
  fabrication steps and "Incident light" arrows.
- **Beams ▸ Drawing ▸ Wide translucent ribbon** draws beams as wide bands of
  constant width with a darker edge (set **Ribbon width**), as in FTIR and
  telescope path sketches.

Templates in this style: *Device sketch · coated grating (building blocks)*, *FTIR beam
path (ribbon beams)* and *SPR sensor (Kretschmann prism)*.

### Building blocks (*Nanostructures & films*)

Separate parts that stack onto each other, for building a device sketch one
piece at a time:

| Block | Notes |
|---|---|
| **Substrate / film (slab)** | Flat slab; on a corrugated surface its underside follows the corrugation and its top is flat (a planarising layer). Variants: glass, silicon wafer, polymer, thin film |
| **Grating ridges** | Rectangular, trapezoid, sinusoidal, triangular or blazed profile; period, ridge fraction, height and a residual layer |
| **Conformal coating** | Follows the surface below, sidewalls included (grown along the surface normal). Variants: metal, gold, oxide, silica |
| **Nano-object array** | Disks / pillars, blocks, cones, hemispheres, spheres, core–shell spheres or lying rods; square, hexagonal or random layout |
| **2D material sheet** | Graphene, hBN or MoS₂ with honeycomb geometry |
| **Layer key** | Colour swatches with names and optional bracketed tags, independent of any stack |

**Stacking.** Select a block and click another block in the library: the new one
is placed on top of that stack. Or drag a block onto the top of another; it snaps
on. Attached blocks take the width, depth and view of the stack and follow it when
it moves or is resized. Drag a block away (or press **Detach** in the inspector) to
take it off. Slabs and coatings have a material and a real thickness (shown once
they sit on a stack), and **Optical response** on any block calculates the whole
stack: the bottom slab is the substrate; ridges, arrays and sheets are left out
and named in the readout.

## 5b3. Optical response: calculated spectra

The **multilayer stack** and the **SPR prism** (with *Sensor chip on the base*)
calculate how much light the films reflect (R), transmit (T) and absorb (A).
Select one and open **Optical response (thin-film calculation)** in the inspector.

1. Give every layer its material and real thickness. In the stack's layer editor
   the second line of each layer is the material (measured n, k) and the thickness
   in nm; the drawn thickness on the first line only changes the picture. The
   bottom layer is the thick substrate unless you choose *Thin film, air below*.
   For the SPR prism choose the metal film and thickness, an optional Cr or Ti
   adhesion layer, a sensing layer and the analyte.
2. Choose what to calculate: against **wavelength** (at a fixed angle) or against
   **angle of incidence** (at a fixed wavelength), the polarisation (p, s or
   unpolarised) and the curves (R, T, A).
3. The readout gives the reflectance minimum (an SPR dip, with its FWHM) and the
   absorptance maximum.
4. **Add data panel** places a plot that is linked to the stack: change a layer,
   the analyte or the angle, and the curve follows at once. Numeric settings such
   as the metal thickness, the analyte index or the angle can be keyframed, so a
   binding event can be animated. **Unlink** in the panel keeps the current curves
   as ordinary data. **CSV** downloads R, T and A; **Sources** lists the measured
   data used, with references to cite.

In an SPR setup the traced beam is also reflected at the chip with the calculated
amplitudes, so detector readouts show the dip per wavelength. The *SPR sensor*
template calculates R(λ) at the angle at which its beam actually meets the chip.

**What it is and is not.** The calculation is the transfer-matrix method for flat,
isotropic layers: exact for planar stacks, Kretschmann SPR, Fabry–Pérot and
metal–insulator–metal films, antireflection coatings and Bragg mirrors. It does not
include the lateral structure of gratings or metasurfaces (choose *Flat* to see
what the stack alone does): their resonances need RCWA or FDTD, whose spectra you
can import as data. Materials (n, k from the refractiveindex.info database, public
domain): Ag, Au, Al, Cu, Cr, Ti, Ni, Pt, W, SiO₂, TiO₂, Al₂O₃, HfO₂, MgF₂, Si₃N₄,
ZnO, ZnS, CaF₂, Si, Ge, water, ethanol, methanol, acetone, PDMS, PMMA, the optical
glasses, and custom n, k. Ag and Au also come as UV–mid-IR datasets (to 25 µm).
Outside a dataset's range the end value is used and the readout warns you.

## 5c. Your own components and styles

- **Custom component** (*Samples & mechanics*): choose an SVG (kept as vector)
  or a photo, then an optical behaviour (mirror, splitter, lens, filter, sample,
  detector, source…). **Save to My components** keeps it in the library.
- **Style presets** (Figure ▸ Style presets): classic line art, high-impact
  journal, 3D rendered, monochrome print, colour-blind safe, presentation, dark
  graphical abstract. **Save as house style** stores your current look;
  **Export / Import** shares it with your group as a small file.

## 5d. Tablets and phones

Pinch to zoom, drag with two fingers to pan, or drag the empty canvas with one
finger. Long-press opens the context menu. The touch toolbar (bottom of the
canvas) has components, undo, redo, rotate, flip, duplicate, delete, keyframe
and play.

## 6. Animation

1. Open the timeline (**T**).
2. Select an object, move the playhead and press **Key selected** (or **I**).
3. Move the playhead again, change the object (position, rotation or any numeric
   parameter, such as a wave-plate angle) and add another key.
4. Tick **Light flow** to animate light along every beam, or **Pulses** for wave
   packets. In 3D, **Key camera** records orbit/tilt/zoom for camera moves.
5. **Export video** records MP4 (H.264) or WebM at up to 4K.

The tracer runs on every frame, so moving a mirror sweeps its beam and rotating a
wave plate changes the light after a PBS.

## 7. Export

| Format | Use |
|---|---|
| SVG | Final editing in Illustrator / Inkscape / Affinity; text stays editable |
| PDF | Vector figure for LaTeX and submission |
| TIFF | Journals that require raster files; DPI tags included |
| PNG / JPEG | Slides, web, quick previews (PNG includes DPI) |
| MP4 / WebM | Talks, supplementary videos, social media |
| Project (.rnbx.json) | Continue editing later or share with co-authors |

**Copy as PNG** puts the figure on the clipboard for slides. The work is also
autosaved in your browser and never uploaded. RNBeamX counts visits and which
features are used (feature names only, no figure content, no cookies) with
GoatCounter; the visitor total appears at the bottom right of the window.

## 8. Before you submit

Run **File ▸ Journal check**. It flags small text, thin lines, non-standard
widths, fonts, stray beams, detectors without light, unlabelled optics, red/green
beam pairs and objects outside the page. Then open the **Caption helper** to copy
a caption starter with every abbreviation defined.

## 8b. Reset and undo

**↺ Reset** (top bar, next to undo and redo; also *File ▸ Reset everything* and
the touch toolbar) returns RNBeamX to its first state in one click: an empty
default figure (Nature double column), grid and snapping on, the select tool,
the timeline closed and the view fitted. The reset is a single undo step:
press **Ctrl+Z**, or **Undo** in the notice that appears, to get everything back.
*File ▸ New figure* keeps the current page preset instead.

## 9. Keyboard shortcuts

Press **?** inside the app for the full list.
