# RNBeamX User Manual

## 1. The workspace

| Area | What it does |
|---|---|
| **Top bar** | File / Edit / Arrange / View menus, figure style (Schematic · Shaded · 3D), view toggles, Templates, Export |
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

## 3. Labels and text

Every component gets a label (M1, L2, PBS…). Drag a label to move it, double-click
it to edit, and reset it from the inspector. Labels and text boxes accept:

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

## 5. Graphical abstracts and cover art

Choose a graphical-abstract preset (Elsevier 5 : 2, ACS TOC, square) and a dark or
gradient background. Add titles, curved arrows, glows, wave packets, photons
(hν), nanoparticles and images from *Graphical abstract* and *Annotations*.
The 3D style with beam glow is a quick route to an eye-catching abstract.

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
autosaved in your browser.

## 8. Before you submit

Run **File ▸ Journal check**. It flags small text, thin lines, non-standard
widths, fonts, stray beams, detectors without light, unlabelled optics, red/green
beam pairs and objects outside the page. Then open the **Caption helper** to copy
a caption starter with every abbreviation defined.

## 9. Keyboard shortcuts

Press **?** inside the app for the full list.
