# RNBeamX User Manual

> New here? The illustrated [Guide](https://rakeshnaik1109-cloud.github.io/RNBeamX/guide.html)
> (also the **Guide** button in the top bar) walks through a first figure in five steps.

## 1. The workspace

| Area | What it does |
|---|---|
| **Top bar** | File / Edit / Arrange / View menus, figure style (Schematic · Shaded · 3D), undo · redo · **↺ reset**, view toggles, Guide, Templates (grouped by topic, searchable; Enter opens the first match), Export |
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

### Optomechanics and imaging parts

The *Optomechanics* and *Imaging* groups hold generic lab hardware, drawn in the
app's own style (they are not copies of any maker's catalogue drawings). Each one
traces like the optic it holds:

| Part | Behaviour in the beam |
|---|---|
| Kinematic, gimbal and flip mirror mounts | Mirror. *Fine tilt* turns the mirror (a tilt of θ steers the beam by 2θ, and it can be keyframed). A flip mount that is flipped out lets the beam pass. |
| Galvo scanning mirror | Mirror with a *scan angle*; keyframe it to scan the beam. |
| Lens tube | Empty, a lens, a band-pass filter or a **beam expander**: a Keplerian pair whose focal lengths fit the drawn tube length, so the beam leaves *mag*× wider and collimated. |
| Cage cube, cage plate | A beam splitter, PBS, turning mirror or dichroic in a cube; a lens, an iris or nothing in a plate. |
| Beam shutter | Open passes the beam, closed blocks it (keyframe *Open* to switch it in an animation). |
| Breadboard, rail with carriers, rotation / XYZ stage, tilt platform | Drawn under the optics; no effect on the beam. |
| Right-angle, Dove and wedge prisms, axicon (*Filters & dispersion*) | Glass with real refraction and total internal reflection: the right-angle prism turns the beam by 90°. |
| Diffuser | Opens the beam up to the set full angle. |
| Fluorescence filter cube | Excitation filter on the left face, long-pass dichroic on the diagonal, emission filter on the bottom face. Excitation entering from the left goes up towards the objective; fluorescence coming back down passes to the camera, and laser light does not. |
| Eyepiece, camera lens, telecentric lens | Thin lenses with the set focal length. |
| Integrating sphere (*Detectors*) | Collects the beam. |

More types of existing parts are listed with them: tunable, fibre, Ti:sapphire,
quantum-cascade and diode-module lasers; xenon and halogen lamps; achromatic
doublet, cylindrical, ball, aspheric, tube, condenser and scan lenses; wave
plates and polarisers in rotation mounts; D-shaped pick-off mirrors, pellicle
and wedged beam samplers, hot and cold mirrors; quadrant and balanced
photodiodes, a wavefront sensor and a scientific camera; and lab electronics
(lock-in amplifier, laser-diode driver, temperature controller, photodiode
amplifier, motion controller, power supply, DAQ). Search the library by name.

### Parts for lab-setup illustrations

| Part | Where | What it does |
|---|---|---|
| **Laser source (benchtop, fibre output)** | Sources | A benchtop box with display and knob. With *Output ▸ Through a fibre*, connect it with the Fibre tool to a fibre end or collimator: the light leaves there (diverging as set on the fibre end), and the fibre is drawn in the colour of the light. Without a fibre, or with *Free-space*, it shines from its side. |
| **Bare fibre end** | Fibre optics | A ferrule with a glowing tip; set the output divergence (fibre NA). |
| **Benchtop boxes** | Electronics | *Instrument ▸ Looks like ▸ Benchtop box (3D look)*: power supply, spectrometer, controller, with box, display and text colours and an optional knob. *Computer (monitor and tower)* draws a desktop PC. |
| **Photo camera** | Detectors | *Camera ▸ Looks like ▸ Photo camera*. |
| **Electromagnet (pole pieces)** | Samples & mechanics | Two coils on a frame with tapered or flat pole pieces; the gap is at the part's position, so a sample placed there sits between the poles. Optional field lines; a Helmholtz coil pair variant. |
| **Fibre-optic probe head** | Samples & mechanics | An *Optical module* with the excitation and collection paths drawn inside and a focusing nose: the beam focuses the set distance below it. |
| **Tilted disc look** | Lens, filter | *Drawn as ▸ Tilted disc (3D look)* draws round optics as seen at an angle, for perspective illustrations; filters take any glass colour. The optics are unchanged. |
| **Block arrow** | Graphical abstract | Wide filled arrows (light in / out). |
| **Laptop** | Electronics | *Instrument ▸ Looks like ▸ Laptop*: the screen shows a small plot of spectra (1–12 curves), nothing, or your text. |
| **Compact box seen from above** | Electronics | USB spectrometer or compact light source: a box seen from above with a status light. |
| **Hanging cable** | Connections | *Electrical connection ▸ Routing ▸ Hanging cable* draws a smooth curve with adjustable sag (negative arches up); set the line weight for thick cables. Fibres can have **connector boots** at both ends. |
| **Cage plate (perspective)** | Optomechanics | A cage plate seen at an angle holding a lens, filter, iris, nothing, or a **fibre adapter**. With the fibre adapter it is a fibre end: connect a fibre-output laser to it and the light leaves along the cage axis. Turn it 90° for a vertical cage. |
| **Cage cube (3D look)** and **Cage rods** | Optomechanics | A metal cube with its diagonal insert (it still splits or turns the beam), and pairs of rods to run along a cage. |
| **Hot plate / heating stage** | Samples & mechanics | Body, top and round heating plate with a sample, a temperature display and a knob, all colours editable. Light from above stops on the sample. |
| **Groove fill, see-through cover, nanoflakes** | Nanostructures & films | *Grating ridges ▸ Fill the grooves with*; *Transparent cover / superstrate* (slab opacity); *Tilted nanoflakes / nanosheets* (random standing plates with a lean angle). |

### Ray bundles and real glass lenses

For imaging figures, light can be drawn as individual rays instead of one beam:

- **Ray bundle / object** (*Imaging*): an object arrow (a ray fan from its tip
  and its base), a point source, or a parallel bundle (object at infinity). Set
  the number of rays, the fan angle, a field angle (tilt, animatable) and one
  wavelength or the blue, yellow and red F, d, C lines.
- Any laser, LED or lamp can also be drawn as parallel rays: set **Draw as a ray
  bundle** to the number of rays.
- **Lens ▸ Optics model ▸ Real glass surfaces** replaces the ideal thin lens by
  spherical surfaces in real glass (N-BK7 by default; N-SF5, N-F2, SF11, fused
  silica, CaF₂, sapphire or a custom index), traced exactly with Snell's law at
  each wavelength. The radii are chosen so that the paraxial focal length at
  587.6 nm is the one you set, and the lens is drawn with its true shape. You then
  see spherical aberration (edge rays focus short) and chromatic aberration (a
  singlet focuses blue about f/V before red). The achromatic doublet is an
  N-BK7 / N-SF5 pair designed so that blue and red share one focus; a ball lens
  takes its focal length from its size and glass. Tick *Aspheric* for an
  aberration-free lens.
- Select a lens to read its focal length; a real lens also shows its back focal
  distance, surface radii, its focal length at the F, d and C lines and the
  colour focal shift (C − F). Every lens also shows its f-number, NA and the
  diffraction-limited Airy radius (1.22 λN at 587.6 nm), to compare with the ray
  spot (the diameter is read at the figure scale). **Move screen to focus** puts the nearest screen,
  camera or detector in front of the lens (or objective) at its focus (the
  paraxial focus for real lenses), keeping its sideways position. Ctrl+Z undoes it.
- A screen, camera or detector hit by rays reports the **ray spot**: the RMS
  spread of where the rays land, per wavelength and in total, at the figure scale.
- *Beams ▸ Ray width* sets the drawn line width of rays; the same slider sits
  under a selected ray bundle, next to one-click colour sets: **F · d · C**,
  **RGB** (450, 520, 638 nm), **Single colour** and **Black (print)**.
- **Ray spot CSV** (on a detector hit by rays) downloads where each ray lands:
  ray number, wavelength, and position across the detector in physical and drawn mm.
  The file starts with the RMS spot per wavelength and for all rays.
- **Move to best focus** (same place) slides the detector along its axis to where
  the RMS ray spot is smallest (the circle of least confusion for an aberrated
  lens), and reports that spot size.

### Active, nonlinear and fibre parts

| Part | Behaviour |
|---|---|
| Optical parametric oscillator / amplifier | The pump splits into a signal (set) and an idler from 1/λp = 1/λs + 1/λi, sharing the converted power by photon energy. |
| Supercontinuum fibre | Turns part of the input into a broadband spectrum (range and number of drawn lines adjustable). |
| Acousto-optic modulator | Deflection set directly, or from the RF frequency and acoustic velocity (Bragg angle θ = λf / v, so it depends on the wavelength). |
| Pockels cell (EOM variant) | A voltage-controlled wave plate; keyframe the retardance to switch it. |
| Fibre circulator | Port 1 → port 2; light coming back into port 2 leaves at port 3. |
| Fibre splitter / WDM | A power splitter with any ratio (e.g. 99:1 tap), or a wavelength splitter. |
| Spatial filter assembly | Objective, pinhole and collimating lens in one part: expands the beam and stops light that does not pass the pinhole. |

Optical isolators, Faraday rotators, AOMs, EOMs, SHG / THG crystals, pinholes and
slits were already in the library and are unchanged.

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
  **Table top** picks the table finish: matte black, brushed stainless steel,
  aluminium breadboard, grey, anodised blue, white (for light slides) or a wood
  bench (no holes). *Table colour* tints it to any colour; brushed finishes keep
  their texture when tinted.
  **Mount style** sets how mounted optics stand: a post holder with a steel post
  on a slotted base (the default, like lab optomechanics), a simple post on a
  round foot, or a solid pedestal; *Mount colour* recolours holders and bases.
  Mirrors get kinematic mounts with two adjuster knobs. **Apply photo look**
  (Properties, with nothing selected) sets a dark studio backdrop, a black
  table, a higher beam so the post holders show, and glow, like a product photo.
- **Lasers** have their own bodies in 3D (and in the side view): laser head,
  He–Ne tube on cradles, diode module with a finned heat sink, ultrafast
  oscillator enclosure, fibre laser with collimator, QCL on a heat sink and a
  tunable laser with a knob. *Body (look)* chooses one; *Automatic* picks it from
  the wavelength, the text on the body and the size. With a high beam the body
  sits on a riser block.
- **Colour & mount** (Properties of any part, or of several selected parts):
  *Body colour* recolours the housing and mount in 2D and 3D (glass, mirrors and
  coatings keep their own colour); ten swatches give common anodised colours.
  *Mount colour (3D)* and *Post in 3D* override the figure's mount settings for
  that part, and any part can stand on a post.

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

## 5b2. Device sketches

The *Structures* group covers figures that are more than an optical table. These
parts are illustrations: beams are not traced through them (use the optical
parts for that).

| Part | Notes |
|---|---|
| **Multilayer / grating stack** | Edit the layers bottom → top in the inspector: colour, name, drawn thickness, tag; ↑ reorders, the bin removes, **+ Layer on top** adds. Surface profile flat, sinusoidal, trapezoid or square; period, ridge fraction and depth; period and ridge dimension labels; layer key; view angle and depth (oblique projection). Variants: MIM grating stack, corrugated film stack, sensor chip. For stacks built part by part, see the building blocks below |
| **3D cylinder**, **3D block / slab** | Detector housings with coaxial face rings, substrates, chips |
| **Angle marker (θ)** | Arc between two directions with an optional dashed normal |
| **Dimension line (Λ = …)** | Arrows or ticks, label follows the line |

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

### Shapes

For anything else (an instrument housing, a stage, a lamp, an analyte molecule),
combine the generic parts in the *Shapes* group:

| Part | Notes |
|---|---|
| **3D shape** | Box, cylinder (upright or lying), tube, cone, pyramid, sphere, hemisphere or wedge; width, height, depth, colour, opacity, gloss, outline and text on the front; same oblique view as the building blocks |
| **Atom** | Shaded ball with an optional element symbol |
| **Bond (stick)** | Single, double or triple, or dashed (e.g. a hydrogen bond); drag its end handle from atom to atom |
| **Free polygon / path** | Any outline from x, y points in mm, straight or smoothed, open or closed, plain or shaded fill |

Use **Arrange** (align, distribute, bring to front / back) and **Duplicate** to
assemble and repeat parts; select several and move them together.

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

**Gratings (RCWA).** When a stack of building blocks contains *Grating ridges*,
**Method ▸ Grating (RCWA)** calculates it rigorously over one period, using the
ridges' real period, height and residual layer and the coatings' real thicknesses
(conformal coatings on rectangular ridges keep vertical walls for the calculation).
It is the Fourier modal method with Li's inverse rule for TM and stable scattering
matrices; R, T and A include every diffraction order. It runs in the background
with a progress readout; the panel updates when it is done. Set the **diffraction
orders** (more is slower and more exact), the **profile slices** (for curved
profiles) and the points in the curve. **Check convergence** recalculates a few
points with 1.5× the orders: metal gratings with thin walls or narrow gaps need
many orders, and the check tells you when the result has settled. Nano-object
arrays and 2D sheets are not periodic in one direction and are left out.

**What it is and is not.** For flat layers the calculation is the transfer-matrix
method, exact for planar stacks, Kretschmann SPR, Fabry–Pérot and
metal–insulator–metal films, antireflection coatings and Bragg mirrors. The quick
one-piece *Multilayer / grating stack* is always calculated as flat films; build the
grating from blocks for RCWA. Two-dimensional metasurfaces need FDTD, whose spectra
you can import as data. Materials (n, k from the refractiveindex.info database, public
domain): Ag, Au, Al, Cu, Cr, Ti, Ni, Pt, W, SiO₂, TiO₂, Al₂O₃, HfO₂, MgF₂, Si₃N₄,
ZnO, ZnS, CaF₂, Si, Ge, water, ethanol, methanol, acetone, PDMS, PMMA, the optical
glasses, and custom n, k. Ag and Au also come as UV–mid-IR datasets (to 25 µm).
Outside a dataset's range the end value is used and the readout warns you.

## 5c. Your own components and styles

- **Groups.** Select parts and press **Ctrl+G** (Arrange ▸ Group): they move,
  rotate and scale as one object; **Ctrl+Shift+G** ungroups. Optical parts inside a
  group keep acting on beams, so a grouped source module still works.
- **My components.** Select a group (or a custom component) and press **Save to
  My components**: it appears at the top of the library in this browser. **Export
  file** saves it as a small `.rnbxc.json` file to share with your group;
  **File ▸ Import component file** adds such files to My components. Right-click a
  tile in My components to export or remove it.
- **Custom component** (*Samples & mechanics*): choose an SVG (kept as vector)
  or a photo, then an optical behaviour (mirror, splitter, lens, filter, sample,
  detector, source…).
- **Style presets** (Figure ▸ Style presets): classic line art, high-impact
  journal, 3D rendered, monochrome print, colour-blind safe, presentation, dark
  graphical abstract. **Save as house style** stores your current look;
  **Export / Import** shares it with your group as a small file.

## 5c2. Layout helpers

- **Tidy setup** (Arrange ▸ Tidy setup, **Shift+T**): parts sitting slightly off
  their beam are put exactly on it, parts along one straight beam that are almost
  evenly spaced (within 15 %) become evenly spaced, and labels are re-placed. Parts
  never move further than that, so lens distances stay as you set them.
- **Equal-spacing guides**: while you drag, the part snaps to the middle of its
  two neighbours in a row or column, or repeats the gap of the pair next to it; a
  green guide shows the equal gaps.
- **Fit to a journal width** (Arrange menu): scales the whole figure to a column
  width (Nature, APS, ACS, Elsevier, IEEE or your own). Type sizes and line weights
  stay as they are, so text keeps its printed size, and the figure scale changes so
  focal lengths and beams stay physically the same.

## 5d. Tablets and phones

Pinch to zoom, drag with two fingers to pan, or drag the empty canvas with one
finger. Long-press opens the context menu. The touch toolbar (bottom of the
canvas) has components, undo, redo, rotate, flip, duplicate, delete, keyframe
and play.

## 6. Animation

### One click: Animate (A)

Press **Animate** in the top bar (or **A**). Pick a card, check its two or three
settings and press **Apply and play**. Cards the figure can't use yet are greyed,
with a hint about which part to add. If a suitable part is selected, the preset
animates that part; otherwise it picks the obvious one and you can change it in
the *Animate* list.

| Group | Presets |
|---|---|
| Presentation | **3D rotation (turntable)**: the whole setup turns on its table (full 360°, a swing, or turn-and-rise). Labels follow their parts or hide while it turns. · **Zoom to a part** · **Build-up** (parts appear as the light reaches them) · **Spotlight tour** (each part lights up in beam order) · **2D → 3D reveal** |
| Light | **Light flow** · **Pulse train** · **Switch on** (the beam grows out of the source) · **Wavelength sweep** · **Laser on / off** |
| Optics | **Rotate wave plate** · **Rotate polariser** · **Mirror / galvo scan** · **Piezo fringes** · **Delay-line scan** · **Focus sweep** · **Shutter open / close** · **AOM frequency sweep** · **Field-angle sweep** (ray bundles) · **Binding / film growth** (SPR analyte index or a coating thickness) |

Presets combine (e.g. 3D rotation + light flow, or a galvo scan + build-up): each
one only changes what it animates. Applied presets are listed at the top of the
Animate dialog; **×** removes one, **Remove all animation** clears everything. The
first preset sets the length; later ones extend it if needed. Ctrl+Z undoes any
of this.

### By hand: the timeline (T)

1. Open the timeline (**T**). **● Record** is on by default.
2. Drag the time slider to a later time, then move, rotate or change any part (for
   example a wave-plate angle). That change is saved as a step, and the part
   animates from where it was at 0 s.
3. Repeat at other times for more steps. **Add step** (**I**) saves the selected
   parts as they are, and in 3D **Add camera step** saves the current view.
4. Each row says in words what changes ("turns 0 → 45°", "moves", "appears"). Drag
   a step's diamond to retime it, double-click to delete it, or press the bin to
   remove a part's whole animation.

Presets write ordinary steps, so you can fine-tune a preset in the timeline. The
tracer runs on every frame, so moving a mirror sweeps its beam and rotating a wave
plate changes the light after a PBS.

### Export

*Export ▸ Video* records MP4 (H.264) or WebM at up to 4K. *Export ▸ Animated GIF*
makes a looping GIF (480–1200 px, 10–25 fps) for LinkedIn, websites and slides.
GIFs have 256 colours, so a full 3D rotation at 720 px is a few MB; use a smaller
width or frame rate for smaller files.

## 7. Export

| Format | Use |
|---|---|
| SVG | Final editing in Illustrator / Inkscape / Affinity; text stays editable |
| PDF | Vector figure for LaTeX and submission |
| TIFF | Journals that require raster files; DPI tags included |
| PNG / JPEG | Slides, web, quick previews (PNG includes DPI) |
| MP4 / WebM | Talks, supplementary videos, social media |
| PowerPoint (.pptx) | One slide the size of the figure with the figure as a vector picture (PNG fallback); right-click ▸ Convert to Shape makes every part editable |
| TikZ (.tex) | LaTeX drawing commands for every path and label, in mm; compile with LuaLaTeX or XeLaTeX (Unicode text); gradients become their average colour |
| Project (.rnbx.json) | Continue editing later or share with co-authors |

**Share link** (File ▸ Copy share link) packs the whole figure into the web
address. Whoever opens it gets an editable copy; nothing is uploaded. Very large
figures (many data points) give very long links; send the project file instead.

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
