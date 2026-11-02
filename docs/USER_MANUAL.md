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

## Fibres

Draw a fibre with the *Fibre* tool between two fibre couplers (or a fibre-output
laser and a fibre end). **Fibre type** sets both the look and the physics:

| Type | Look | Light at the far end |
|---|---|---|
| Single-mode (SMF) | thin, yellow jacket | clean Gaussian beam (M² = 1); polarisation scrambled |
| Multimode OM1/OM2, OM3/OM4 | orange / aqua | larger beam, M² ≈ 10–12; polarisation scrambled |
| Large-core multimode | thick, dark orange | much larger beam, M² ≈ 40 |
| Polarisation-maintaining (PANDA) | blue with a key stripe | Gaussian beam; **keeps the polarisation** |
| Photonic-crystal / hollow-core | purple, double wall | near-Gaussian beam |
| Fibre bundle | thick black, ribbed | large, incoherent beam |
| Armoured patch cable | thick steel spiral | single-mode light inside |
| Plastic optical fibre (POF) | black, 1 mm | very large, incoherent beam |

*Colour ▸ Jacket colour* shows the standard jacket colours; *Colour of the light
inside* (default) colours the fibre by the light it carries. In a build-up
animation a fibre appears together with the parts it connects.

## Fibre Raman probe

*Samples & mechanics ▸ Fibre-optic Raman probe (working optics)* is a probe head
whose inside is traced like the rest of the figure, as in commercial probes:

- **Laser in** (fibre) → collimating lens → **band-pass** filter on the laser line →
  **dichroic** (passes the laser) → focusing nose → sample.
- The nose collects the back-scattered **Raman** light; the dichroic reflects it to
  a **fold mirror**, a **long-pass** filter blocks the laser line, and a lens focuses
  it into the **signal-out** fibre to the spectrometer.

Connect a fibre from a fibre-output laser to the probe, and one from the probe to
a spectrometer (spectrometers now take a fibre input). Set the laser and Raman
wavelengths on the probe: the band-pass follows the laser line and the dichroic
and long-pass edges sit between the two. Put a SERS chip (or a sample with
*Emits* on) at the focus. *Name the inner parts* labels every element; the light
paths show through the body. The template *Fibre Raman probe (inside view)* is a
ready example. The closed variant draws a dark probe body with the same optics.

## Learn optics

The **Learn** button (top bar, after *Guide*) opens **Learn optics** in a new tab
(`learn.html`, like the guide; each page has its own address, e.g. `learn.html#pbs`,
so it can be bookmarked or shared). It has a page for every optical part
and for the basics: light and wavelength, Gaussian beams, polarisation,
reflection and refraction, interference and diffraction. Each page has

- a plain explanation of what the part does and how it works;
- a **live demo** traced by RNBeamX, with the power each detector receives
  (e.g. a polariser at 60° passes 10 mW × cos² 60° = 2.5 mW);
- **the physics**: the equations, with every symbol explained;
- typical numbers, the templates that use the part, and related pages.

*Open this demo in RNBeamX* opens the editor with the demo loaded (Ctrl+Z brings
your previous figure back); *Add this part to my figure* opens the editor and
places the part. Search finds parts by
name or by what they do (e.g. "focus", "Raman", "polarisation").

## 4. Figure styles

- **Schematic**: textbook line art with flat tints; best for Optics Express / APL-type figures.
- **Shaded**: gradient metals, glass and anodised bodies; best for high-impact journals.
- **3D**: the same layout on an optical table. Set orbit, tilt, zoom, beam height,
  table, holes, posts and shadows under *3D camera & table*, or use the sliders
  on the canvas. Labels can be dragged in 3D without disturbing the 2D layout.
  **Table top** picks the table finish (new figures start with brushed stainless
  steel; figures saved earlier keep their table): matte black, brushed stainless steel,
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

**SPR real-time sensing.** A linked panel can follow the resonance as it moves:

- **Mark the resonance (live)** in a linked panel draws a dashed line and a dot at
  the dip (or the absorptance peak) and writes its position, e.g. λ<sub>res</sub> or
  θ<sub>res</sub>, with the analyte index *n*. Tick **Sensitivity S** to add the bulk
  sensitivity S = Δλ<sub>res</sub>/Δn (nm/RIU, or °/RIU for an angle scan), worked
  out from the calculation at the current index.
- **Sensorgram** (button next to *Add panel*, or *Show ▸ Sensorgram* in a linked
  panel) plots the resonance against time while the figure animates, like a
  real SPR instrument. The axes are fixed to the whole run so the trace grows
  smoothly; the x axis can be the analyte index instead of time, and the y axis
  the shift from the start. **Sensorgram CSV** downloads time, index, resonance
  and shift.
- **Animate ▸ SPR sensing** writes the analyte index for a run: *Binding*
  (baseline, association 1 − e<sup>−t/τ</sup>, dissociation in buffer),
  *Calibration steps* (equal injections) or a *Linear index sweep*. It adds a
  sensorgram and marks the dip on the curve panel unless you choose *Keyframes
  only*. Play it or export it as MP4 / GIF; removing the animation removes the
  panels it added. The older *Binding / film growth* preset is unchanged.

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

## 5b4. Layer Studio: design thin films and multilayers

**Studio** (top bar) opens a full-screen workspace for flat multilayers: MIM and
MIMIM absorbers, Fabry–Pérot filters, Bragg mirrors, microcavities, Tamm
structures, antireflection coatings and SPR chips. Select a *Multilayer stack* and
press **Open in Layer Studio** (Optical response section) to edit one that is
already in the figure.

- **Structure** (left). Films are listed from the top down, between the medium
  above and the substrate (or air for a free-standing film). Each film has a
  material from the measured database (or your own n, k), a real thickness in nm,
  a colour, a name and an optional tag (M₁, I, M₂…). **λ/4** and **λ/2** set a
  quarter- or half-wave thickness at the design wavelength λ₀. Tick films and
  press **Repeat ticked** to make a periodic group, e.g. (TiO₂ / SiO₂) × 8; change
  its number of periods at any time, or **Ungroup** it. *Light arrives from* sets
  whether light comes from above or through the substrate.
- **Start from** loads a ready design: single film, λ/4 MgF₂ coating, MIM
  absorber (Ni / SiO₂ / Al, R ≈ 0 at 625 nm), MIMIM broadband absorber, Ag MIM
  filter, metal Fabry–Pérot, Bragg mirror, microcavity (LH)⁵ 2L (HL)⁵, Tamm
  structure and a Kretschmann SPR chip.
- **Cross-section and field** (middle). The stack drawn to scale (very thin films
  are widened so they stay readable) or with equal heights, with |E|²/|E₀|² through
  it at a chosen wavelength, angle and polarisation, and the share of the light
  absorbed in each film. The absorbed shares add up to A.
- **Optical response** (right). R, T and A against wavelength or angle (up to 4001
  points, for sharp cavity modes), with the dip / peak and its width. Click the
  curve to see the field at that point.
- **Wavelength × angle map**. R, T or A over wavelength and angle of incidence;
  bands that bend with angle are cavity, guided or plasmonic modes. Click it to see
  the field there.
- **Insert into figure** adds a *Multilayer stack* drawing (drawn thicknesses
  compressed, proportional or equal; with a layer key if you like), and optionally
  a linked R, T, A panel, the field profile and the map. When you opened a stack
  from the figure the button reads **Update the stack** (or *Insert as a new
  stack*). The stack keeps its repeat groups, so it reopens as you built it.
- **Save** / **Open…** keep designs as `.rnbxlayers.json` files; **CSV** writes the
  spectrum, the field profile and the absorption in each film. Ctrl+Z / Ctrl+Y undo
  inside the Studio; Esc closes it and the design is kept for next time.

The calculation is the same exact transfer-matrix method as *Optical response*
(planar, isotropic films; measured n, k from refractiveindex.info). Gratings and
patterned layers are not part of the Studio yet.

### Pattern: periodic structures (one unit cell)

The **Pattern** tab of Layer Studio designs gratings and metasurfaces that are
periodic in one direction, and calculates them rigorously (RCWA, the Fourier
modal method with Li's rule for TM).

- **Unit cell** (left). Set the period Λ, the medium above, the substrate and the
  layers from the top down. Each layer is a film of its own material (air for
  free-standing lines) with shapes in it: a **ridge** (rectangle, trapezoid with a
  different top width, or slanted by moving its top sideways), a **sinusoid** or a
  **sawtooth** (blazed, either direction). A shape has its own material; a shape
  of air in a solid film is a groove. Shapes that cross the cell edge wrap round.
  *Orders ±N* sets the number of diffraction orders kept; *Profile slices* how
  finely sloped and curved profiles are cut into flat slices.
- **Cross-section** (middle). Several periods, to scale or with heights
  stretched. Drag a shape to move it; drag its round handles to change the
  bottom and top widths, the square one to slant it, the triangle to change the
  height of its layer.
- **Diffraction orders**: the efficiency of every reflected and transmitted order
  at one wavelength, angle and polarisation, with its angle from the grating
  equation n sin θₘ = n₁ sin θ + m λ / Λ.
- **Optical response**: R, T and A against wavelength or angle, calculated in the
  background. **Check convergence** compares with 1.5× the orders (metal edges
  need many). Click the curve to see the orders there.
- **Near field |E|²** at the chosen wavelength, angle and polarisation: a colour
  map of |E|² / |E₀|² through one or more periods, with the structure outlined
  (linear or logarithmic scale; *Field CSV* exports it). It is rebuilt from the
  same calculation (fields of every order in every layer; E = D / ε point by point
  for TM), so the power absorbed in the structure from the field equals A.
- **Wavelength × angle map** on request (*Calculate map*): each point is a full
  grating calculation, so it takes from a few seconds to about a minute.

**2D arrays (crossed gratings).** Set *Structure ▸ 2D array* for structures
periodic in x and y: a rectangular cell Λx × Λy (a hexagonal lattice is a
rectangular cell with two shapes, as in the preset). Shapes are **disks /
ellipses, rectangles, rings and crosses** with vertical walls; a shape of air in
a solid film is a hole. *Orders ±Mx / ±My* set the Fourier orders kept in each
direction ((2Mx+1)(2My+1) in all); *Azimuth φ* turns the plane of incidence.
- **Top view** of the selected layer: drag a shape to move it, its handles to
  resize it, and the dashed *cut* line to choose where the **side view** and the
  side cut of the near field are taken. Click a layer in the side view to edit it.
- **Near field** in a side cut (x–z) or in a plane at any depth (x–y).
- **Diffraction orders (m, n)** with their efficiencies and directions (θ from
  the normal, φ from x).
- Presets: TiO₂ nanodisks, hexagonal Si pillars, elliptical pillars, a
  photonic-crystal slab, a hole array in Au, an Au cross absorber, Ag nanopatches,
  Si rings.

The 2D solver is RCWA in the formulation of Rumpf with the plain Fourier
(Laurent) rule. It is slower than 1D (about 0.4 s per wavelength at ±3 × ±3
orders, spread over several background workers) and metal shapes converge
slowly: start with ±3, then use *Check convergence*. Inserted 2D arrays are
drawn as rows of pillars, holes or rings and keep their linked RCWA panel.
- **Start from**: lamellar grating, guided-mode resonance filter, Al wire-grid
  polariser, gap-plasmon absorber (Au strips / 10 nm SiO₂ / Au, R ≈ 1 % at
  1270 nm), sinusoidal Au grating, blazed Al grating (1200 lines/mm), slanted
  grating, trapezoid Si ridges, two ridges per period, two-level steps.
**Multilayers with patterned layers.** Any number of layers can be stacked, and
any of them can be patterned, so a grating can sit on, in or under a multilayer
(1D and 2D alike). All patterned layers share the cell's period.
- **Repeat groups.** Tick films in the list and press **Repeat ticked**: they
  become a group, for example (TiO₂ 62 nm / SiO₂ 103 nm) × 6. Change the number
  of repeats in the group's header; edit one film and every repeat follows.
  **Ungroup** writes the repeats out as separate layers. Shapes inside a group are
  repeated too (stacked gratings).
- **+ Stack from the Layers tab** adds the films and repeat groups designed in the
  *Layers* tab under the unit cell, with its substrate. Typical use: design a
  Bragg mirror or MIM stack in *Layers*, then put a grating on top in *Pattern*.
- **Coat…** (on a patterned layer) deposits a film over it, written out as
  ordinary editable layers:
  - *From above* (evaporation, line of sight): a cap on the tops of the ridges
    and a film in the bottom of the gaps; side walls stay bare. Ridges keep their
    shape; this is the geometry behind lift-off.
  - *Conformal* (ALD, CVD, sputtering): the same thickness on every surface, so
    ridges grow a shell (holes shrink) and the cap is wider.
  - *Fill the gaps* (spin coating, planarising): the open parts of the layer
    become the coating, plus an optional film over the top.
  Pillars and holes in 2D arrays are grown or shrunk by the coating thickness.
  Sinusoidal and sawtooth profiles can only be filled.
- Presets: grating on a Bragg mirror (Bloch surface wave), grating-coupled SPR
  (Au grating on Au film), grating coupler on a Si₃N₄ waveguide, Au evaporated
  over SiO₂ ridges (made with the coating helper), and Au nanodisks on a Bragg
  mirror (2D).

- **Insert into figure** adds a *Patterned structure* (a few periods, or a few
  rows of a 2D array, in the oblique device-sketch view), optionally with a linked RCWA panel and the map.
  Select it and press **Open in Layer Studio** to edit it again (**Update the
  structure**). **Save / Open…** keep `.rnbxpattern.json` files; **CSV** writes the
  spectrum and the orders.

### Particles: nanoparticles, dimers and SERS hot spots

The **Particles** tab of Layer Studio calculates spheres, core–shell particles and
dimers exactly (Mie theory; for dimers, multi-sphere Mie theory with the full
coupling between the two particles).

- **Particle.** One particle or a dimer of two identical particles with a gap
  *g* (surface to surface). A particle is a core (material, diameter) with any
  number of shells (**+ Shell**: material, thickness), in a medium (water by
  default). Polarisation along the dimer axis (the hot-spot polarisation) or
  across it; light travels along x.
- **Extinction, scattering, absorption** against wavelength, as cross-sections
  (nm²) or efficiencies Q = C / πR². Click the plot to choose the wavelength of
  the near field.
- **Near field |E|²** around the particles (x–z plane, logarithmic or linear
  scale).
- **Hot spot and SERS enhancement.** |E|² at the hot spot (the centre of the gap,
  or 0.5 nm from the surface of a single particle on the polarisation axis)
  against wavelength, with |E|⁴; at the chosen wavelength and **Raman shift**,
  the enhancement |E(λ)|²·|E(λ_Raman)|² (electromagnetic; chemical enhancement is
  not included).
- **Field against the gap** (dimers): the hot-spot field and the enhancement for
  gaps from the smallest to the largest you set. Below about 0.5 nm electron
  tunnelling, which is not included, quenches the field.
- **Multipole orders** are chosen automatically (more for narrow gaps: about
  1 % on the gap field); set more to check convergence.
- Presets: Au and Ag nanospheres, an Au nanoshell, Au@Ag, shell-isolated
  Au@SiO₂ (SHINERS), and Au and Ag dimers with 1–5 nm gaps.
- **Insert into figure** adds the spectrum, the hot-spot curves and the gap sweep
  as data panels, and the near-field map as a picture. **CSV** writes them all.

The solver was checked against classical Mie theory (identical to 10⁻⁸ for one
particle), the Rayleigh limit, the optical theorem, energy conservation for
lossless particles, and two far-apart particles (twice one particle).

## 5b5. Part Builder: design your own component

**Studio ▸ Part** draws a component of your own and makes it work with the light
like the built-in parts. Select a *Built part* in the figure and press **Open in
the Part Builder** to change it.

- **Body.** Combine *rectangles* (with rounded corners), *ellipses*, *polygons*
  (click points in the drawing; click the first point, double-click or press Enter
  to close) and *lens profiles* (diameter, centre thickness, radii R₁ and R₂: +
  convex, − concave, 0 flat). Each shape is **added** to the body or **cut away**
  from it, in order, so housings with bores, windows with holes or lenses with
  flats are easy. Shapes can be moved and turned.
- **Thin surfaces**: flat, spherical (radius and aperture) and parabolic (focal
  length, aperture and off-axis offset) surfaces acting as a mirror, a beam
  splitter (reflectance R), an absorber, or drawing only.
- **What the body does to light**: glass of a real material (Sellmeier data) or a
  custom index, opaque (absorbs), mirror (every face reflects) or nothing. The
  **Faces** list names every face (e.g. *Lens profile 1 · front surface*); give a
  face its own job: mirror coating, blackened, beam-splitter coating. Click a face
  in the drawing to find it in the list.
- **Light sources**: beams that leave the part (position, direction, wavelength,
  power, diameter), for lasers or LEDs of your own.
- **Test beam**: parallel rays or a fan from a point, at any angle, height and
  wavelength, traced through the part as you edit, with where the rays meet.
- **3D**: extruded (a block of the chosen height) or turned about the axis (lenses,
  balls, cones); finish (glass, metal, matte, mirror), colour and opacity.
- **Start from**: plano-convex, biconvex and plano-concave lenses, ball lens,
  axicon, right-angle prism, cube beam splitter, light pipe, off-axis parabola,
  concave mirror, roof mirror, housing with a bore, laser head.
- **Insert into figure**, **To My components** (the parts list, this browser) and
  **Save** / **Open…** (`.rnbxpart.json`, to share).

Curved faces are traced as smooth surfaces: the outline is made of short facets,
but the normal at a hit follows the true curve, so a built lens focuses like a
real one (a plano-convex lens gives the textbook back focal length f − t/n, a
spherical mirror focuses at R/2, an off-axis parabola sends every ray through its
focus).

## 5b6. Labware & chemistry

The **Labware & chemistry** group in the parts list draws lab scenes next to the
optics: sample preparation, syntheses, assays.

- **Glassware**: beaker (with an optional stir bar), graduated cylinder, test tube
  (with stopper), Erlenmeyer flask, round-bottom flask, volumetric flask (with its
  mark and stopper), cuvette (frosted sides, cap), screw-cap vial, reagent bottle
  (clear or amber), 1.5 mL microcentrifuge tube (lid open or closed), 15 / 50 mL
  conical tube, burette (stopcock, drop), funnel (filter paper), petri dish (side
  view) and Liebig condenser (cooling water in / out).
- **Liquids** in every vessel: how full, colour and opacity, meniscus, a lower
  second phase (two immiscible liquids), bubbles, particles (e.g. a nanoparticle
  colloid) and a precipitate. *Filled* can be keyframed, so a vessel can fill or
  empty in an animation.
- **Labels on the glass** with markup (HAuCl_4, 1 M NaCl), graduation marks with
  optional numbers, glass tint, wall thickness and sizes.
- **Liquid handling**: micropipette (volume display, tip with liquid, drop),
  Pasteur pipette, syringe (plunger follows the fill, graduations, needle).
- **Plates and cultures**: 6 / 24 / 96-well plates from above or tilted, filled
  as a dilution series, one colour per row, or listed wells (`A1-A6, B3=#ff0000`);
  petri dish from above with colonies; test-tube rack with a colour per tube.
- **Fluid tubing** (Connections): click two objects, like the electrical cable;
  tube colour and diameter, the liquid inside, flow arrows in either direction, or
  dashed for a gas line.

Everything follows the figure style: **Schematic** gives clean line art with flat
colours, **Shaded** gives tinted glass with highlights and liquid gradients. These
parts are figure graphics: light does not interact with them (use *Sample* or a
Part Builder part for that). Template: **Lab & chemistry ▸ Gold nanoparticle
synthesis → samples**.

## 5b7. Diagrams & AI

The **Diagrams & AI** group draws networks and flowcharts from a few settings.

- **Neural network (fully connected)**: type the nodes per layer (`3, 5, 5, 2`;
  an autoencoder is `8, 4, 2, 4, 8`), the layer names and colours, left-to-right or
  bottom-to-top. Layers larger than *Nodes shown* fold with ⋮ and show their size
  (n = 784). Connections: every node to every node, none, or one band per layer pair;
  *Weights* colour them blue (+) and red (−) with thickness by size. Input labels
  x₁…xₙ, output labels ŷ₁…ŷₙ, a symbol in hidden nodes (σ, Σ) and bias nodes (+1).
- **Convolutional network (CNN)**: write the layers as
  `Input: 32x32x3, Conv: 30x30x16, Pool: 15x15x16, …, FC: 128, Output: 10`; feature
  maps are drawn as blocks (height from the map size, depth from the channels on a
  log scale), coloured by type (Input, Conv, Pool, Norm, Flatten, FC / Dense,
  Output), with kernel projections and the sizes underneath.
- **Transformer (block diagram)**: encoder and decoder, encoder only or decoder
  only, with attention, add & norm and feed-forward blocks, residual paths,
  positional encoding, the encoder output going into cross-attention, and the
  N× repeat.
- **Flowchart box**: process, rounded, start / end, decision, input / output,
  document, database, sub-process, preparation and circle, with text (several
  lines, markup), fill, outline and a soft shadow in the Shaded style.
- **Flow connector**: pick it, click the first box, then the second. It stays
  attached when boxes move. *Automatic* routing draws a straight line when the
  boxes line up and right angles otherwise; or choose the route, a curve, a label
  (yes / no), arrowheads, dashes and colour.

Template: **Diagrams & AI ▸ Spectra → CNN → classes**.

## 5b8. Lab instruments & computing

The **Lab instruments & computing** group puts the rest of the lab next to the
optics. Each instrument is drawn from the front in 2D (Schematic or Shaded) and
stands on the table in 3D (width, height and depth are settings), so electrical
cables and fluid tubing connect to it.

- **Electronics**: oscilloscope (1–4 channels; sine, square, triangle, pulses,
  decaying or noisy signals), function generator (display, waveform), DC power
  supply (voltage and current displays, terminals), lock-in amplifier (rack unit),
  DAQ / USB interface (terminal block).
- **Computers**: laptop, and desktop with monitor, tower and keyboard. The screen
  shows spectra, code, text, oscilloscope traces, or **a data plot from this
  figure**, drawn live inside the screen.
- **Bench equipment**: hot plate / magnetic stirrer (temperature and speed, a
  glowing plate, and a beaker or flask with liquid on it), centrifuge, analytical
  balance with draft shield, syringe pump (the syringe empties when *filled* is
  animated), peristaltic pump.
- **Gases and vacuum**: gas cylinder with regulator and gauges (N₂, Ar, He, O₂,
  CO₂, H₂, air), rotary-vane vacuum pump, vacuum chamber with viewport and gauge.
- **Preparation and safety**: ultrasonic bath, fume hood (sash height, airflow),
  glovebox (antechamber, O₂ readout), freezer / fridge, retort stand with clamp or
  ring.

Template: **Lab & chemistry ▸ Lock-in measurement (optics + instruments)**.

## 5b9. Biology & medicine, safety signs

The **Biology & medicine** group draws life-science figures from a few settings,
in Schematic (flat colours, ink lines) or Shaded (gradients and highlights). They
are page graphics: they do not take part in the ray tracing.

- **Brain** (side view): each lobe its own colour, one colour, or one region
  highlighted (frontal, parietal, temporal, occipital, cerebellum, brainstem);
  number of folds and a fold pattern; optional lobe labels.
- **Neuron** (dendrites, soma, myelinated axon, terminals), **cells** (animal or
  plant, with nucleus and organelles), **bacteria** (rod, coccus, spiral; flagella
  and pili), **viruses**, **DNA** double helix (turns, base pairs, a sequence),
  **antibody** (with or without antigen), **protein** ribbon (helices, β-sheets and
  loops in colours you choose), **blood cells** (red, red edge-on, white, platelet).
- **Eye** in cross-section, optionally with light focused on the retina and labels;
  **lab mouse**; **human figure** (standing or arms raised).

The **Safety signs** group has three signs, each with a *Symbol* menu, a size and
an optional caption underneath (e.g. *Class 4 laser*):

- **GHS hazard pictogram** (red diamond): flammable, oxidiser, explosive, gas under
  pressure, corrosive, acute toxicity, health hazard, irritant, environment.
- **Warning sign** (yellow triangle): general, laser radiation, ionising radiation,
  biological hazard, high voltage, magnetic field, hot surface, cryogenic, toxic.
- **Mandatory sign** (blue circle): eye protection, gloves, lab coat, face shield,
  respiratory protection, refer to the instructions.

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
| Optics | **Rotate wave plate** · **Rotate polariser** · **Mirror / galvo scan** · **Piezo fringes** · **Delay-line scan** · **Focus sweep** · **Shutter open / close** · **AOM frequency sweep** · **Field-angle sweep** (ray bundles) · **Binding / film growth** (SPR analyte index or a coating thickness) · **SPR sensing** (binding, calibration steps or a sweep, with a live sensorgram) |

**Stop & show figure.** While an animation plays, a *Playing* pill at the top of
the canvas offers **Pause** (freeze at the current frame) and **■ Stop & show
figure**, which stops playback and brings back the figure exactly as it was
before the animation ran: the parts, their visibility and the 3D view. The same
is on the timeline bar (*Show figure*) and on **Esc** while playing. Press play
again to resume the animation; nothing in it is lost.

**Pulse shape** (timeline bar, or the *Pulse train* animation): pulses are drawn as a
*wave packet* (a few optical cycles under a Gaussian envelope; the carrier follows
the wavelength, so a 400 nm pump oscillates faster than an 800 nm probe), as a
smooth *Gaussian* bump, or as the older *bar*. The choice applies in 2D, 3D and
exported videos and GIFs.

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
