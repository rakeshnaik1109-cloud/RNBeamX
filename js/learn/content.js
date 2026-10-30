/* ═══════════════════════════════════════════════════════════
   RNBeamX — learn/content.js
   The "Learn" pages: what each component does, for someone new
   to optics. Every page has a plain explanation, the physics
   (equations with every symbol explained), typical numbers and
   a small live demo that the app itself traces, so the reader
   sees the effect and can open it as a figure to play with.
═══════════════════════════════════════════════════════════ */
(function () {
'use strict';
const RNBX = window.RNBX;
const LC = RNBX.learnContent = { entries: {}, order: [] };

/* typeset helpers: fractions, roots, variables */
const fr = (a, b) => `<span class="fr"><span>${a}</span><span>${b}</span></span>`;
const rt = x => `√<span class="ov">${x}</span>`;
const v = s => `<i>${s}</i>`;

/* a demo is a small document built with the template helpers */
const demo = (w, h, build) => () => {
  const T = RNBX.templates.helpers;
  const d = T.base('nature-15', w, h, '');
  const add = (type, x, y, rot, props, label, lab) => { const o = T.mk(type, x, y, rot, props, label, lab); d.objects.push(o); return o; };
  build(add, T, d);
  return d;
};
const E = (id, o) => { LC.entries[id] = Object.assign({ id }, o); LC.order.push(id); };

/* ================= Basics ================= */
const B = 'Basics';
E('c-light', { group: B, title: 'Light, wavelength and colour',
  one: 'Light is an electromagnetic wave; its wavelength sets its colour and the energy of each photon.',
  how: ['Light is an oscillating electric and magnetic field that travels at the speed of light. The distance between two crests is the <b>wavelength</b> λ. Our eyes see about 400 nm (violet) to 700 nm (red); ultraviolet is shorter, infrared longer.',
    'Light also comes in packets of energy called <b>photons</b>. Shorter wavelength means more energy per photon: one blue photon carries more energy than one red photon. That is why UV light can break chemical bonds and IR light mostly warms things.',
    'In RNBeamX every beam has a wavelength, and its colour on the figure is computed from it. Wavelengths you cannot see are drawn in a muted false colour.'],
  math: [[`${v('c')} = ${v('λ')} ${v('ν')}`, 'speed of light c ≈ 3×10⁸ m/s equals wavelength λ times frequency ν'],
    [`${v('E')} = ${v('h')}${v('ν')} = ${fr(v('hc'), v('λ'))}`, 'photon energy; h = 6.626×10⁻³⁴ J s (Planck constant)'],
    [`${v('E')} [eV] ≈ ${fr('1240', v('λ') + ' [nm]')}`, 'handy form: a 532 nm photon has 2.33 eV'],
    [`${v('λ')}<sub>medium</sub> = ${fr(v('λ'), v('n'))}`, 'inside glass (refractive index n) the wavelength is shorter; the frequency stays the same']],
  numbers: ['Violet 405 nm · blue 488 nm · green 532 nm · red 633 nm · near-IR 800–1064 nm · telecom 1550 nm', '1 mW of 532 nm light ≈ 2.7×10¹⁵ photons per second'],
  demo: demo(110, 56, a => { [[405, 12], [532, 28], [633, 44]].forEach(([l, y]) => { a('laser', 16, y, 0, { lambda: l }, l + ' nm', [0, 6]); a('screen', 96, y, 0, { d: 8 }); }); }),
  see: ['laser', 'lamp', 'led'] });

E('c-gauss', { group: B, title: 'Gaussian laser beams',
  one: 'A laser beam is brightest in the middle and fades smoothly to the sides; it has a narrowest point (waist) and spreads slowly.',
  how: ['A laser beam is not a perfect pencil of light. Its brightness across the beam follows a bell curve (a <b>Gaussian</b>). The radius where the brightness drops to 13.5 % (1/e²) is called the <b>beam radius</b> w.',
    'Every beam has a narrowest point, the <b>waist</b> w₀. Close to it the beam is almost parallel; far away it spreads at a constant angle. The distance over which it stays roughly parallel is the <b>Rayleigh range</b> z<sub>R</sub>.',
    'A lens can make a smaller waist (focus) but then the beam spreads faster: small focus and low divergence cannot both be had. Real beams are a little worse than a perfect Gaussian; the factor M² says by how much.',
    'Choose <i>Beams ▸ Drawing ▸ True width</i> in RNBeamX to see the computed beam envelope with its foci.'],
  math: [[`${v('I')}(${v('r')}) = ${v('I')}<sub>0</sub> exp(−${fr('2' + v('r') + '²', v('w') + '²')})`, 'intensity across the beam'],
    [`${v('w')}(${v('z')}) = ${v('w')}<sub>0</sub> ${rt('1 + (' + v('z') + '/' + v('z') + '<sub>R</sub>)²')}`, 'beam radius at distance z from the waist'],
    [`${v('z')}<sub>R</sub> = ${fr('π' + v('w') + '<sub>0</sub>²', 'M² ' + v('λ'))}`, 'Rayleigh range'],
    [`${v('θ')} = ${fr('M² ' + v('λ'), 'π' + v('w') + '<sub>0</sub>')}`, 'far-field half-angle divergence'],
    [`${v('w')}<sub>f</sub> ≈ ${fr('M² ' + v('λ') + v('f'), 'π' + v('w') + '<sub>in</sub>')}`, 'focused spot radius for a lens of focal length f and input radius w<sub>in</sub>']],
  numbers: ['He–Ne laser: w₀ ≈ 0.4 mm, θ ≈ 0.5 mrad', 'A 1 mm beam focused by f = 100 mm at 532 nm: spot radius ≈ 17 µm'],
  demo: demo(110, 50, a => { a('laser', 16, 25, 0, { lambda: 532, beamWidth: 3 }, 'Laser', [0, 6]); a('lens', 45, 25, 0, { f: 250, d: 9 }, 'Lens', [0, 7]); a('screen', 98, 25, 0, { d: 12 }); }),
  demoMode: { beamStyle: 'envelope' },
  see: ['lens', 'objective', 'profiler'] });

E('c-pol', { group: B, title: 'Polarisation',
  one: 'Polarisation is the direction in which the electric field of light oscillates.',
  how: ['In a beam the electric field oscillates across the direction of travel. If it always swings along one line the light is <b>linearly polarised</b> (horizontal H, vertical V, diagonal D …). If the field rotates as the wave moves it is <b>circularly</b> (or elliptically) polarised. Sunlight and lamps are <b>unpolarised</b>: the direction changes randomly.',
    'Polarisation matters because many parts treat the two directions differently: polarisers pass one, polarising beam splitters separate them, wave plates convert one into another, and reflections from glass prefer one (s) over the other (p).',
    'RNBeamX follows the polarisation of every beam with <b>Jones calculus</b>: the light is a two-number vector and each part is a 2×2 matrix that acts on it.'],
  math: [[`${v('E')} = (${v('E')}<sub>x</sub>, ${v('E')}<sub>y</sub>)`, 'Jones vector: field along x and y (complex numbers carry the phase)'],
    [`H = (1, 0) · V = (0, 1) · D = ${fr('1', '√2')}(1, 1) · R = ${fr('1', '√2')}(1, −i)`, 'common states'],
    [`${v('E')}<sub>out</sub> = ${v('M')} ${v('E')}<sub>in</sub>`, 'each component is a 2×2 Jones matrix M'],
    [`${v('I')} = ${v('I')}<sub>0</sub> cos²${v('θ')}`, 'Malus’s law: linear light through a polariser at angle θ to it']],
  numbers: ['A polariser at 45° to linear light passes 50 %; at 90° almost nothing (extinction 10⁻³ to 10⁻⁶)'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 633, pol: 'H' }, 'H-polarised', [0, 6]); a('polarizer', 52, 20, 0, { angle: 60 }, 'Polariser 60°', [0, 7.5]); a('pd', 96, 20, 0, {}, 'Detector', [0, 6]); }),
  see: ['polarizer', 'hwp', 'qwp', 'pbs'] });

E('c-refr', { group: B, title: 'Reflection and refraction',
  one: 'At a surface light partly reflects (angle in = angle out) and partly enters, bending according to Snell’s law.',
  how: ['When light meets a boundary between two materials, part of it bounces back. The <b>law of reflection</b>: it leaves at the same angle to the surface normal as it came in.',
    'The rest goes in and changes direction because light is slower in glass than in air. The ratio of speeds is the <b>refractive index</b> n (air 1.0, water 1.33, glass about 1.5). Going into a denser material the beam bends toward the normal.',
    'How much reflects is given by the <b>Fresnel equations</b>: about 4 % per uncoated glass surface at normal incidence. Anti-reflection coatings bring it below 0.5 %.',
    'Going from glass to air at a steep angle, the light cannot get out at all: <b>total internal reflection</b>. Prisms and fibres use it.',
    'A tilted plate (window) shifts a beam sideways without changing its direction; the demo shows it.'],
  math: [[`${v('θ')}<sub>r</sub> = ${v('θ')}<sub>i</sub>`, 'law of reflection'],
    [`${v('n')}<sub>1</sub> sin ${v('θ')}<sub>1</sub> = ${v('n')}<sub>2</sub> sin ${v('θ')}<sub>2</sub>`, 'Snell’s law of refraction'],
    [`${v('R')} = (${fr(v('n') + '<sub>1</sub> − ' + v('n') + '<sub>2</sub>', v('n') + '<sub>1</sub> + ' + v('n') + '<sub>2</sub>')})²`, 'reflectance at normal incidence (glass: 4 %)'],
    [`sin ${v('θ')}<sub>c</sub> = ${fr(v('n') + '<sub>2</sub>', v('n') + '<sub>1</sub>')}`, 'critical angle for total internal reflection (glass→air: 41.8°)'],
    [`${v('d')} = ${v('t')} sin ${v('θ')} (1 − ${fr('cos ' + v('θ'), rt(v('n') + '² − sin²' + v('θ')))})`, 'sideways shift of a beam through a plate of thickness t']],
  numbers: ['n: air 1.000 · water 1.333 · fused silica 1.46 · N-BK7 1.517 · sapphire 1.77 · silicon 3.5 (IR)'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 532 }, 'Laser', [0, 6]); a('window', 55, 20, 35, { t: 6, n: 1.5, d: 12 }, 'Tilted plate', [0, 9]); a('screen', 98, 20, 0, { d: 10 }); }),
  see: ['window', 'prism', 'rprism', 'mirror'] });

E('c-interf', { group: B, title: 'Interference',
  one: 'Two beams from the same laser add up wave by wave: crests on crests make light, crests on troughs make darkness.',
  how: ['Light is a wave, so when two beams overlap their fields add, not their brightnesses. If they arrive in step (in phase) they reinforce; half a wavelength out of step they cancel. Bright and dark <b>fringes</b> appear.',
    'The phase difference comes from the difference in path length. Moving a mirror by only λ/2 (a quarter of a micrometre for green light) changes bright into dark. That is why interferometers can measure tiny distances.',
    'Interference only works if the light is <b>coherent</b>: the path difference must be shorter than the coherence length of the source (metres for a stable laser, micrometres for a lamp).',
    'The demo is a Michelson interferometer: the beam splitter divides the light, two mirrors send it back, and the two returns interfere on the camera. Set a <i>piezo displacement</i> on a mirror to move the fringes.'],
  math: [[`${v('I')} = ${v('I')}<sub>1</sub> + ${v('I')}<sub>2</sub> + 2${rt(v('I') + '<sub>1</sub>' + v('I') + '<sub>2</sub>')} cos Δ${v('φ')}`, 'two-beam interference'],
    [`Δ${v('φ')} = ${fr('2π', v('λ'))} ${v('n')} Δ${v('L')}`, 'phase difference from an optical path difference ΔL'],
    [`${v('V')} = ${fr(v('I') + '<sub>max</sub> − ' + v('I') + '<sub>min</sub>', v('I') + '<sub>max</sub> + ' + v('I') + '<sub>min</sub>')}`, 'fringe visibility (1 = perfect contrast)'],
    [`${v('L')}<sub>c</sub> ≈ ${fr(v('λ') + '²', 'Δ' + v('λ'))}`, 'coherence length for a source of spectral width Δλ']],
  numbers: ['One fringe = λ/2 of mirror movement (316 nm for a He–Ne laser)', 'Coherence length: He–Ne ~ 20 cm, laser diode ~ 1 mm, LED ~ 10 µm'],
  demo: () => RNBX.templates.list.find(t => t.id === 'michelson').build(),
  see: ['bscube', 'mirror', 'cavity', 'retro'] });

E('c-diff', { group: B, title: 'Diffraction',
  one: 'Light spreads when it passes small openings, and a periodic structure (a grating) sends each colour into its own direction.',
  how: ['When light passes an opening or edge comparable to its wavelength it bends and spreads: <b>diffraction</b>. The smaller the opening, the wider the spread. This sets the smallest spot a lens can make and the resolution of a microscope.',
    'A <b>grating</b> has thousands of fine lines. Light from each line interferes with the others, and only in certain directions (the <b>orders</b> m = 0, ±1, ±2 …) do they all add up. The angle depends on wavelength, so a grating spreads white light into a spectrum: the heart of most spectrometers.'],
  math: [[`${v('d')} (sin ${v('θ')}<sub>m</sub> − sin ${v('θ')}<sub>i</sub>) = ${v('m')} ${v('λ')}`, 'grating equation; d = line spacing (1/lines per mm), m = order'],
    [`sin ${v('θ')} ≈ 1.22 ${fr(v('λ'), v('D'))}`, 'first dark ring behind a round aperture of diameter D (Airy pattern)'],
    [`${fr(v('λ'), 'Δ' + v('λ'))} = ${v('m')} ${v('N')}`, 'resolving power of a grating with N illuminated lines'],
    [`${v('r')}<sub>Airy</sub> = 0.61 ${fr(v('λ'), 'NA')}`, 'smallest resolvable distance of a microscope objective']],
  numbers: ['1200 lines/mm grating at 532 nm: first order at about 40° from the zeroth', 'A 100× / NA 1.4 objective resolves about 230 nm at 532 nm'],
  demo: demo(110, 56, a => { a('laser', 16, 28, 0, { lambda: 532 }, 'Laser', [0, 6]); a('grating', 50, 28, 0, { transmit: true, G: 300, orders: '-1,0,1', w: 10 }, 'Grating', [0, 9]); a('screen', 100, 28, 0, { d: 30 }); }),
  see: ['grating', 'spectrometer', 'iris'] });

/* ================= Sources ================= */
const S0 = 'Sources';
E('laser', { group: S0,
  one: 'A laser makes a narrow, single-colour, coherent beam of light.',
  how: ['LASER stands for Light Amplification by Stimulated Emission of Radiation. Inside, a <b>gain medium</b> (a gas, crystal, fibre or semiconductor) is pumped with energy. Two mirrors around it form a <b>cavity</b>: light bounces back and forth and is amplified on each pass. One mirror lets a little out: that is the beam.',
    'Because every photon is a copy of the one that stimulated it, laser light has one colour (narrow linewidth), travels in one direction (low divergence) and is <b>coherent</b> (it can interfere).',
    'A <b>continuous-wave (CW)</b> laser shines steadily. A <b>pulsed</b> or ultrafast laser (e.g. Ti:sapphire) emits a train of very short flashes, femtoseconds long, with huge peak power, used for nonlinear optics and pump–probe experiments.',
    'In RNBeamX set the wavelength, power, polarisation, beam diameter and divergence; extra lines (e.g. 1064 and 532) make a multi-line source. <i>Body (look)</i> chooses how it appears in 3D.'],
  math: [[`${v('P')}<sub>peak</sub> ≈ ${fr(v('E') + '<sub>pulse</sub>', v('τ'))} = ${fr(v('P') + '<sub>avg</sub>', v('f') + '<sub>rep</sub> ' + v('τ'))}`, 'peak power of a pulsed laser (τ = pulse length, f<sub>rep</sub> = repetition rate)'],
    [`Δ${v('ν')} Δ${v('t')} ≥ 0.44`, 'time–bandwidth product: a 100 fs pulse at 800 nm is at least ~9 nm wide'],
    [`${v('ν')}<sub>q</sub> = ${v('q')} ${fr(v('c'), '2' + v('L'))}`, 'the cavity only supports frequencies that fit a whole number q of half-waves in its length L']],
  numbers: ['He–Ne 632.8 nm, 1–20 mW · DPSS green 532 nm · Ti:sapphire 700–1000 nm, 100 fs, 80 MHz · Nd:YAG 1064 nm', 'Class 3B/4 lasers can blind instantly: wear the right goggles'],
  demo: demo(110, 34, a => { a('laser', 18, 17, 0, { lambda: 532, power: 10 }, 'Laser 532 nm', [0, 6]); a('powermeter', 96, 17, 0, {}, 'Power meter', [0, 7]); }),
  see: ['c-gauss', 'benchlaser', 'crystal', 'opo'] });
E('benchlaser', { group: S0,
  one: 'A benchtop laser in a box, often delivering its light through an optical fibre.',
  how: ['Many lab lasers (diode lasers, fibre-coupled modules) come as a box with a display and a fibre output. The fibre carries the light to wherever it is needed; a collimator at the fibre end turns the spreading light back into a beam.',
    'In RNBeamX connect its output to a fibre end with the <i>Fibre</i> tool; the light then leaves at the fibre end, with the fibre’s efficiency. Choose <i>Free space</i> to emit directly.'],
  math: [[`NA = ${v('n')} sin ${v('θ')} = ${rt(v('n') + '<sub>core</sub>² − ' + v('n') + '<sub>clad</sub>²')}`, 'numerical aperture: the cone of light a fibre accepts and emits'],
    [`${v('w')}<sub>coll</sub> ≈ ${v('f')} · NA`, 'beam radius after a collimating lens of focal length f']],
  numbers: ['Single-mode fibre NA ≈ 0.12; a f = 11 mm collimator gives a beam about 2 mm across'],
  demo: demo(110, 34, a => { a('benchlaser', 20, 17, 0, { output: 'free', lambda: 650 }, 'Benchtop laser', [0, 9]); a('screen', 96, 17, 0, {}); }),
  see: ['coupler', 'laser'] });
E('lamp', { group: S0,
  one: 'A broadband source shines many wavelengths at once: white light.',
  how: ['Lamps (halogen, xenon arc) and supercontinuum sources emit a wide spectrum. Halogen lamps glow because they are hot (thermal radiation); arc lamps add sharp emission lines; a supercontinuum source sends ultrafast pulses through a special fibre that broadens them into a laser-bright rainbow.',
    'Broadband light is not coherent over long distances, so it is used for absorption spectroscopy, illumination in microscopes, and white-light interferometry.',
    'RNBeamX samples the spectrum with several wavelengths (set the range and number). The demo sends white light through a green band-pass filter: only green gets through.'],
  math: [[`${v('B')}<sub>λ</sub>(${v('T')}) = ${fr('2' + v('hc') + '²', v('λ') + '⁵')} ${fr('1', 'e<sup>' + v('hc') + '/' + v('λ') + v('k') + v('T') + '</sup> − 1')}`, 'Planck’s law: spectrum of a hot filament at temperature T'],
    [`${v('λ')}<sub>peak</sub> = ${fr('2898 µm·K', v('T'))}`, 'Wien’s law: a 3000 K halogen filament peaks near 1 µm (infrared)']],
  numbers: ['Halogen ~3000 K · xenon arc ~6000 K (daylight-like) · supercontinuum 450–2400 nm'],
  demo: demo(110, 34, a => { a('lamp', 18, 17, 0, {}, 'White light', [0, 7]); a('filter', 55, 17, 0, { mode: 'bandpass', center: 532, width: 30 }, 'Green filter', [0, 7]); a('screen', 96, 17, 0, {}); }),
  see: ['filter', 'prism', 'spectrometer'] });
E('led', { group: S0,
  one: 'A light-emitting diode: a cheap, efficient, single-colour source that spreads its light widely.',
  how: ['In an LED, electrons and holes recombine in a semiconductor junction and emit photons. The colour is set by the material’s band gap. Its spectrum is about 20–40 nm wide (much wider than a laser) and the light leaves in a wide cone.',
    'A lens can collect and collimate it. In the demo the lens turns the diverging LED light into a near-parallel beam.'],
  math: [[`${v('λ')} ≈ ${fr('1240', v('E') + '<sub>g</sub> [eV]')} nm`, 'emission wavelength from the band-gap energy E<sub>g</sub>'],
    [`Δ${v('λ')} ≈ ${fr('1.8 ' + v('k') + v('T') + ' ' + v('λ') + '²', v('hc'))}`, 'typical spectral width (≈ 25 nm for a blue LED at room temperature)']],
  numbers: ['Blue 470 nm (InGaN) · red 630 nm (AlGaInP) · near-IR 850 nm (GaAs)'],
  demo: demo(110, 40, a => { a('led', 16, 20, 0, { divergence: 14 }, 'LED', [0, 6]); a('lens', 34, 20, 0, { f: 150, d: 11 }, 'Lens', [0, 8]); a('screen', 96, 20, 0, { d: 14 }); }),
  see: ['lens', 'lamp'] });

/* ================= Mirrors & splitters ================= */
const M0 = 'Mirrors & splitters';
E('mirror', { group: M0,
  one: 'A flat mirror reflects a beam; turning it by an angle α turns the beam by 2α.',
  how: ['A mirror has a metal coating (silver, aluminium, gold) or a stack of thin dielectric layers that reflect almost all the light. It sends the beam off at the same angle to its normal that it came in.',
    'Mirrors steer beams around the table. Two mirrors in a row let you set both the position and the angle of a beam (“walking the beam”).',
    'Metal mirrors work for all colours (silver ~97 %, gold best in the IR); dielectric mirrors reach 99.9 % but only in their design band.'],
  math: [[`${v('θ')}<sub>out</sub> = ${v('θ')}<sub>in</sub>`, 'law of reflection'],
    [`Δ${v('θ')}<sub>beam</sub> = 2 Δ${v('α')}<sub>mirror</sub>`, 'tilting the mirror by α deflects the beam by 2α'],
    [`${v('r')} = ${v('d')} − 2(${v('d')}·${v('n')}) ${v('n')}`, 'reflected direction vector for incoming d and surface normal n']],
  numbers: ['Protected silver ~97 % · aluminium ~90 % (visible) · gold ~98 % (IR) · dielectric > 99.5 %'],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 44, 0, { lambda: 633 }, 'Laser', [0, 6]); a('mirror', 64, 44, T.ang(T.R, T.UP), {}, 'Mirror', [8, 2]); a('screen', 64, 8, 90, {}); }),
  see: ['kmount', 'cmirror', 'galvo'] });
E('cmirror', { group: M0,
  one: 'A curved (concave) mirror reflects and focuses at the same time, like a lens without colour error.',
  how: ['A concave mirror brings a parallel beam to a focus at its focal length f, which is half its radius of curvature. Because nothing passes through glass, it has no chromatic aberration: every colour focuses at the same place. Telescopes, spectrometers and laser cavities use curved mirrors.',
    'Used off-axis (at an angle) a spherical mirror adds astigmatism; an off-axis parabola avoids that.'],
  math: [[`${v('f')} = ${fr(v('R'), '2')}`, 'focal length from the radius of curvature R'],
    [`${fr('1', v('s') + '<sub>o</sub>')} + ${fr('1', v('s') + '<sub>i</sub>')} = ${fr('1', v('f'))}`, 'mirror (and thin-lens) imaging equation'],
    [`${v('f')}<sub>t</sub> = ${v('f')} cos ${v('θ')} · ${v('f')}<sub>s</sub> = ${fr(v('f'), 'cos ' + v('θ'))}`, 'tangential and sagittal focal lengths at incidence angle θ (astigmatism)']],
  numbers: ['A 1-inch concave mirror with R = 200 mm has f = 100 mm'],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 46, 0, { lambda: 532, beamWidth: 2.5 }, 'Laser', [0, 6]); a('cmirror', 70, 46, T.ang(T.R, T.UP), { f: 300 }, 'Concave mirror', [12, 2]); a('screen', 70, 10, 90, {}); }),
  demoMode: { beamStyle: 'envelope' },
  see: ['oap', 'lens'] });
E('bsplate', { group: M0,
  one: 'A plate beam splitter reflects part of the light and lets the rest through.',
  how: ['A thin glass plate with a partially reflecting coating on one side splits a beam into two: reflected (R) and transmitted (T). With 50:50 coating, each gets half. The back side is usually anti-reflection coated or wedged to avoid a ghost beam.',
    'Plates are cheap and light; cubes are easier to align but add glass to the path. A <b>pellicle</b> is a micrometre-thin membrane that splits without shifting the beam.'],
  math: [[`${v('R')} + ${v('T')} + ${v('A')} = 1`, 'reflected, transmitted and absorbed fractions add up to all the light'],
    [`${v('P')}<sub>R</sub> = ${v('R')} ${v('P')}, ${v('P')}<sub>T</sub> = ${v('T')} ${v('P')}`, 'powers in the two outputs']],
  numbers: ['Common ratios 50:50, 70:30, 90:10; a wedged sampler picks off ~1–4 % for monitoring'],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 44, 0, { lambda: 532, power: 10 }, 'Laser', [0, 6]); a('bsplate', 56, 44, T.ang(T.R, T.UP), { R: 0.5 }, 'BS 50:50', [9, 4]); a('pd', 56, 8, 90, {}, 'R', [6, 0]); a('pd', 94, 44, 0, {}, 'T', [0, 6]); }),
  see: ['bscube', 'pbs', 'dichroic'] });
E('bscube', { group: M0,
  one: 'A beam-splitter cube: two prisms glued together with a partially reflecting layer on the diagonal.',
  how: ['Light entering the cube is split at the diagonal: part continues straight, part turns by 90°. A non-polarising cube splits both polarisations about equally.',
    'Cubes are the heart of interferometers (Michelson, Mach–Zehnder): the same cube that splits the light also recombines it. Then the outputs depend on the phase of the returning beams.'],
  math: [[`${v('E')}<sub>3</sub> = ${v('t')}${v('E')}<sub>1</sub> + ${v('r')}${v('E')}<sub>2</sub> · ${v('E')}<sub>4</sub> = ${v('r')}${v('E')}<sub>1</sub> + ${v('t')}${v('E')}<sub>2</sub>`, 'field amplitudes; for a lossless 50:50 cube |r|² = |t|² = ½'],
    [`|${v('r')}|² + |${v('t')}|² = 1`, 'energy conservation']],
  numbers: ['10 mW in → 5 mW + 5 mW out (minus ~1 % loss)'],
  demo: demo(100, 56, a => { a('laser', 18, 44, 0, { lambda: 532, power: 10 }, 'Laser', [0, 6]); a('bscube', 56, 44, 0, {}, 'BS', [-7, 6]); a('pd', 56, 8, 90, {}, 'Reflected', [9, 0]); a('pd', 94, 44, 0, {}, 'Transmitted', [0, 6]); }),
  see: ['c-interf', 'pbs', 'bsplate'] });
E('pbs', { group: M0,
  one: 'A polarising beam splitter sends horizontal (p) light straight through and reflects vertical (s) light.',
  how: ['The diagonal of a PBS carries a multilayer coating that transmits p-polarised light and reflects s-polarised light. Light at 45° is split equally; light that is purely H goes all the way through.',
    'Combined with a half-wave plate in front, a PBS becomes a <b>variable attenuator</b>: turn the plate and the power in each output changes smoothly. Combined with a quarter-wave plate it makes an optical isolator for returning light.',
    'The demo sends 45° light in: half goes each way, and each output is purely polarised.'],
  math: [[`${v('P')}<sub>T</sub> = ${v('P')} cos²${v('θ')} · ${v('P')}<sub>R</sub> = ${v('P')} sin²${v('θ')}`, 'for linear light at angle θ from horizontal'],
    [`${v('M')}<sub>T</sub> = (1 0; 0 0) · ${v('M')}<sub>R</sub> = (0 0; 0 1)`, 'ideal Jones matrices of the two outputs'],
    [`ER = ${fr(v('T') + '<sub>p</sub>', v('T') + '<sub>s</sub>')}`, 'extinction ratio (typically 1000:1)']],
  numbers: ['Extinction > 1000:1 in transmission, ~ 20–100:1 in reflection'],
  demo: demo(100, 56, a => { a('laser', 18, 44, 0, { lambda: 633, power: 10, pol: 'D' }, 'Laser at 45°', [0, 6]); a('pbs', 56, 44, 0, {}, 'PBS', [-7, 6]); a('pd', 56, 8, 90, {}, 's (V)', [8, 0]); a('pd', 94, 44, 0, {}, 'p (H)', [0, 6]); }),
  see: ['hwp', 'qwp', 'c-pol', 'isolator'] });
E('dichroic', { group: M0,
  one: 'A dichroic mirror sorts light by colour: it reflects some wavelengths and transmits others.',
  how: ['A dichroic is a beam splitter whose thin-film coating has a sharp edge in wavelength. A <b>long-pass</b> dichroic transmits wavelengths longer than the edge and reflects shorter ones; a short-pass does the opposite.',
    'In fluorescence and Raman microscopes the dichroic reflects the laser onto the sample and lets the longer-wavelength emission pass to the detector. The demo separates 488 nm and 633 nm.'],
  math: [[`${v('T')}(${v('λ')}) ≈ ${fr('1', '1 + e<sup>−(' + v('λ') + ' − ' + v('λ') + '<sub>edge</sub>)/' + v('w') + '</sup>')}`, 'idealised long-pass edge of width w'],
    [`${v('λ')}<sub>edge</sub>(${v('θ')}) ≈ ${v('λ')}<sub>0</sub> ${rt('1 − sin²' + v('θ') + '/' + v('n') + '<sub>eff</sub>²')}`, 'the edge moves to shorter wavelength when tilted (design angle usually 45°)']],
  numbers: ['Edge steepness ~ 1 % of the wavelength; > 90 % transmission in the pass band'],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 44, 0, { lambda: 488, extra: '633' }, '488 + 633 nm', [0, 6]); a('dichroic', 56, 44, T.ang(T.R, T.UP), { edge: 550, mode: 'longpass' }, 'Dichroic', [9, 4]); a('screen', 56, 8, 90, {}); a('screen', 94, 44, 0, {}); }),
  see: ['filter', 'filtercube'] });
E('retro', { group: M0,
  one: 'A retroreflector sends light straight back where it came from, whatever its angle.',
  how: ['A corner cube (three mutually perpendicular mirrors or a glass corner) reflects a beam three times, which reverses its direction exactly. The returning beam is parallel to the incoming one, shifted sideways.',
    'Mounted on a translation stage it is a <b>delay line</b>: moving it by Δx lengthens the path by 2Δx, which is how pump–probe experiments set the time delay between pulses. Retroreflectors left on the Moon are used to measure its distance by laser.'],
  math: [[`${v('r')} = −${v('d')}`, 'the reflected direction is exactly reversed'],
    [`Δ${v('t')} = ${fr('2Δ' + v('x'), v('c'))}`, 'time delay from moving the retroreflector by Δx: 1 µm ↔ 6.67 fs']],
  numbers: ['A 150 mm delay stage gives up to 1 ns of delay'],
  demo: () => RNBX.templates.list.find(t => t.id === 'pumpprobe').build(),
  see: ['stage', 'c-interf'] });
E('slm', { group: M0,
  one: 'A spatial light modulator is a pixelated screen that shapes a beam’s phase or amplitude.',
  how: ['An SLM is a liquid-crystal display (or an array of micromirrors, a DMD) that changes the light differently at every pixel. Writing a pattern onto it can steer the beam, split it into many spots, correct aberrations or make special beams (vortices, Bessel beams).',
    'A phase SLM changes the delay of each pixel; a <b>blazed grating</b> pattern deflects the beam, a <b>lens</b> pattern focuses it. The phase only needs to go from 0 to 2π and then wraps around.'],
  math: [[`${v('E')}<sub>out</sub>(${v('x')},${v('y')}) = ${v('E')}<sub>in</sub>(${v('x')},${v('y')}) e<sup>i${v('φ')}(${v('x')},${v('y')})</sup>`, 'each pixel multiplies the field by a phase factor'],
    [`${v('φ')}(${v('x')}) = ${fr('2π' + v('x'), v('Λ'))} mod 2π → sin ${v('θ')} = ${fr(v('λ'), v('Λ'))}`, 'a blazed phase ramp of period Λ deflects by θ'],
    [`${v('φ')}(${v('r')}) = −${fr('π' + v('r') + '²', v('λ') + v('f'))}`, 'phase pattern of a lens with focal length f']],
  numbers: ['Typical: 1920×1080 pixels of 8 µm, 8-bit phase, 60–400 Hz'],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 44, 0, { lambda: 633 }, 'Laser', [0, 6]); a('slm', 64, 44, T.ang(T.R, T.UP), {}, 'SLM', [10, 2]); a('screen', 64, 8, 90, {}); }),
  see: ['grating', 'mirror'] });
E('vfold', { group: M0,
  one: 'A fold mirror turns a beam up or down, off the table plane, e.g. into an upright microscope.',
  how: ['Most setups run parallel to the table, but microscopes and some experiments need the beam to go vertically. A mirror at 45° sends it up or down. In the 2D view the beam leaves the drawing; the 3D view shows where it goes.'],
  math: [[`${v('θ')}<sub>out</sub> = ${v('θ')}<sub>in</sub> (90° fold at 45° incidence)`, 'same law of reflection, just in the vertical plane']],
  demo: () => RNBX.templates.list.find(t => t.id === 'tower') ? RNBX.templates.list.find(t => t.id === 'tower').build() : null,
  see: ['periscope', 'mirror'] });
E('periscope', { group: M0,
  one: 'A periscope lifts (or lowers) a beam to a new height with two mirrors.',
  how: ['Two parallel 45° mirrors one above the other move a beam up or down while keeping its direction. They match beam heights between instruments, and if the top mirror is turned by 90° they also rotate the polarisation plane by 90°.'],
  math: [[`Δ${v('h')} = rise between the two mirrors`, 'the beam keeps its direction; only its height changes']],
  demo: demo(100, 34, a => { a('laser', 18, 17, 0, {}, 'Laser', [0, 6]); a('periscope', 55, 17, 0, { rise: 12 }, 'Periscope', [0, 9]); a('screen', 92, 17, 0, {}); }),
  see: ['vfold'] });
E('oap', { group: M0,
  one: 'An off-axis parabolic mirror focuses a parallel beam to a perfect point while turning it by 90°.',
  how: ['A parabola is the one shape that brings every ray of a parallel beam to exactly one point. Cutting a section away from the axis gives a mirror that both focuses and turns the beam, with no chromatic aberration and no spherical aberration. Used for broadband and ultrafast beams, terahertz and IR optics.'],
  math: [[`${v('z')} = ${fr(v('r') + '²', '4' + v('f') + '<sub>p</sub>')}`, 'paraboloid with parent focal length f<sub>p</sub>'],
    [`${v('f')}<sub>eff</sub> = ${fr('2' + v('f') + '<sub>p</sub>', '1 + cos ' + v('θ'))}`, 'reflected focal length for off-axis angle θ (90° OAP: f<sub>eff</sub> = 2f<sub>p</sub>)']],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 46, 0, { lambda: 800, beamWidth: 2.5 }, 'Laser', [0, 6]); a('oap', 70, 46, T.ang(T.R, T.UP), { f: 300 }, 'OAP', [10, 2]); a('screen', 70, 10, 90, {}); }),
  demoMode: { beamStyle: 'envelope' },
  see: ['cmirror', 'lens'] });

/* ================= Lenses ================= */
const L0 = 'Lenses & objectives';
E('lens', { group: L0,
  one: 'A lens bends light to focus a beam or form an image.',
  how: ['A lens is a piece of glass with curved surfaces. Light refracts at each surface, so a <b>convex</b> (positive) lens bends parallel rays toward a point, the focus, at its <b>focal length</b> f. A <b>concave</b> (negative) lens spreads them out.',
    'Lenses form images: an object at distance s<sub>o</sub> gives an image at s<sub>i</sub>. Two lenses separated by f<sub>1</sub> + f<sub>2</sub> make a telescope that resizes a beam by f<sub>2</sub>/f<sub>1</sub>.',
    'Real lenses have aberrations: different colours focus at different places (<b>chromatic</b>) and edge rays focus closer than central rays (<b>spherical</b>). Achromatic doublets and aspheres reduce them. In RNBeamX choose <i>Model ▸ Real glass</i> to trace exact surfaces, and use <i>Draw as a ray bundle</i> on the laser to see the aberrations; the lens panel reports f-number, NA and spot size.'],
  math: [[`${fr('1', v('f'))} = (${v('n')} − 1) (${fr('1', v('R') + '<sub>1</sub>')} − ${fr('1', v('R') + '<sub>2</sub>')})`, 'lensmaker’s equation (thin lens; R = surface radii)'],
    [`${fr('1', v('s') + '<sub>o</sub>')} + ${fr('1', v('s') + '<sub>i</sub>')} = ${fr('1', v('f'))}`, 'thin-lens imaging equation'],
    [`${v('M')} = −${fr(v('s') + '<sub>i</sub>', v('s') + '<sub>o</sub>')}`, 'magnification (negative = inverted image)'],
    [`${v('θ')}<sub>out</sub> = ${v('θ')}<sub>in</sub> − ${fr(v('y'), v('f'))}`, 'paraxial ray deflection: a ray at height y is bent by y/f'],
    [`${v('N')} = ${fr(v('f'), v('D'))} · NA ≈ ${fr(v('D'), '2' + v('f'))}`, 'f-number and numerical aperture for clear diameter D']],
  numbers: ['1-inch lenses: f = 25 … 1000 mm · BK7 n = 1.517 at 587 nm'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 532, beamWidth: 5, bundle: 7 }, 'Parallel rays', [0, 7]); a('lens', 45, 20, 0, { f: 300, d: 9 }, 'Lens f', [0, 8]); a('screen', 98, 20, 0, { d: 12 }); }),
  see: ['c-gauss', 'objective', 'raysource', 'lenstube'] });
E('objective', { group: L0,
  one: 'A microscope objective is a multi-lens system that focuses light to a tiny spot and collects light from it.',
  how: ['An objective combines many lenses to give a short focal length with very low aberrations over a wide field. It is labelled with its <b>magnification</b> (e.g. 50×, with a 200 mm tube lens) and its <b>numerical aperture</b> NA, the sine of the half-angle of the light cone it accepts.',
    'The NA sets both the resolution and how much light is collected. Oil or water immersion objectives reach NA above 1 because the medium has n > 1.'],
  math: [[`NA = ${v('n')} sin ${v('θ')}<sub>max</sub>`, 'numerical aperture'],
    [`${v('d')} = ${fr('0.61 ' + v('λ'), 'NA')}`, 'Rayleigh resolution limit (lateral)'],
    [`${v('f')}<sub>obj</sub> = ${fr(v('f') + '<sub>tube</sub>', v('M'))}`, 'focal length from the magnification (Nikon/Thorlabs f<sub>tube</sub> = 200 mm, Olympus 180 mm)'],
    [`DOF ≈ ${fr(v('n') + v('λ'), 'NA²')}`, 'depth of field']],
  numbers: ['10×/0.25 · 50×/0.75 · 100×/1.4 oil (resolves ~0.2 µm)'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 532, beamWidth: 3 }, 'Laser', [0, 6]); a('objective', 60, 20, 0, {}, 'Objective', [0, 8]); a('sample', 72, 20, 0, {}, 'Sample', [0, 8]); }),
  demoMode: { beamStyle: 'envelope' },
  see: ['lens', 'c-diff', 'eyepiece'] });

/* ================= Polarisation ================= */
const P0 = 'Polarisation';
E('hwp', { group: P0,
  one: 'A half-wave plate rotates linear polarisation; turning the plate by θ turns the light by 2θ.',
  how: ['A wave plate is made of a birefringent crystal (e.g. quartz): light polarised along its <b>fast axis</b> travels a little faster than light along its <b>slow axis</b>. A half-wave plate delays one by exactly half a wavelength.',
    'The result: linear light comes out still linear, but mirrored about the fast axis. Rotating the plate by 22.5° turns H into 45°; by 45° turns H into V. Together with a PBS this is the standard way to adjust laser power smoothly (demo).'],
  math: [[`Γ = ${fr('2π', v('λ'))} (${v('n')}<sub>e</sub> − ${v('n')}<sub>o</sub>) ${v('d')} = π`, 'retardance of thickness d of a crystal with indices n<sub>e</sub>, n<sub>o</sub>'],
    [`${v('M')} = (cos 2${v('θ')}  sin 2${v('θ')}; sin 2${v('θ')}  −cos 2${v('θ')})`, 'Jones matrix with the fast axis at θ'],
    [`${v('P')}<sub>T</sub> = ${v('P')} cos²2${v('θ')}`, 'after a PBS, for H input: the power varies with twice the plate angle']],
  numbers: ['Zero-order quartz plates are ~ 1 mm thick; retardance accurate to λ/300'],
  demo: demo(110, 56, a => { a('laser', 16, 44, 0, { lambda: 633, power: 10, pol: 'H' }, 'H light', [0, 6]); a('hwp', 40, 44, 0, { angle: 22.5 }, 'λ/2 at 22.5°', [0, 7.5]); a('pbs', 66, 44, 0, {}, 'PBS', [-7, 6]); a('pd', 66, 8, 90, {}, 'V', [6, 0]); a('pd', 100, 44, 0, {}, 'H', [0, 6]); }),
  see: ['qwp', 'pbs', 'c-pol'] });
E('qwp', { group: P0,
  one: 'A quarter-wave plate turns linear polarisation into circular, and circular back into linear.',
  how: ['A quarter-wave plate delays one axis by a quarter wavelength (90°). Linear light at 45° to its axes comes out <b>circularly polarised</b>; circular light comes out linear.',
    'Passing a quarter-wave plate twice (out and back after a mirror) acts like a half-wave plate: H comes back as V. With a PBS this makes an optical isolator that stops back-reflections reaching the laser.',
    'The demo sends H light through a quarter-wave plate at 45°: the circular light is split 50:50 by the PBS.'],
  math: [[`Γ = π/2`, 'quarter-wave retardance'],
    [`${v('M')}(45°) = ${fr('1', '√2')} (1  −i; −i  1)`, 'Jones matrix with the fast axis at 45° (up to a global phase)'],
    [`H → ${fr('1', '√2')}(1, −i) = circular`, 'linear at 45° to the axes becomes circular']],
  demo: demo(110, 56, a => { a('laser', 16, 44, 0, { lambda: 633, power: 10, pol: 'H' }, 'H light', [0, 6]); a('qwp', 40, 44, 0, { angle: 45 }, 'λ/4 at 45°', [0, 7.5]); a('pbs', 66, 44, 0, {}, 'PBS', [-7, 6]); a('pd', 66, 8, 90, {}, 'V', [6, 0]); a('pd', 100, 44, 0, {}, 'H', [0, 6]); }),
  see: ['hwp', 'pbs', 'isolator'] });
E('polarizer', { group: P0,
  one: 'A linear polariser passes only light polarised along its axis.',
  how: ['Polarisers absorb (film polarisers) or deflect (crystal polarisers such as Glan–Taylor) the light polarised across their axis. Unpolarised light loses half its power; linear light passes according to <b>Malus’s law</b>.',
    'Two crossed polarisers block everything; put something between them that changes polarisation (stressed plastic, a liquid crystal, a Faraday rotator) and light appears. That is how LCD screens work.'],
  math: [[`${v('I')} = ${v('I')}<sub>0</sub> cos²(${v('θ')} − ${v('θ')}<sub>pol</sub>)`, 'Malus’s law'],
    [`${v('M')} = (cos²${v('θ')}  sin${v('θ')}cos${v('θ')}; sin${v('θ')}cos${v('θ')}  sin²${v('θ')})`, 'Jones matrix of a polariser at θ'],
    [`ER = ${fr(v('T') + '<sub>max</sub>', v('T') + '<sub>min</sub>')}`, 'extinction ratio: film ~ 10³, Glan–Taylor ~ 10⁵']],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 633, pol: 'H', power: 10 }, 'H light', [0, 6]); a('polarizer', 52, 20, 0, { angle: 60 }, 'Polariser 60°', [0, 7.5]); a('powermeter', 96, 20, 0, {}, '2.5 mW', [0, 7]); }),
  see: ['c-pol', 'hwp', 'pbs'] });
E('faraday', { group: P0,
  one: 'A Faraday rotator turns the polarisation by a fixed angle, in the same sense for light going either way.',
  how: ['A magneto-optic crystal (e.g. TGG) in a strong magnet rotates the polarisation of light passing along the magnetic field. Unlike a wave plate, the rotation does not undo itself on the way back: it adds up. This <b>non-reciprocal</b> behaviour is what makes optical isolators possible.'],
  math: [[`${v('β')} = ${v('V')} ${v('B')} ${v('L')}`, 'rotation angle: Verdet constant V × magnetic field B × length L'],
    [`${v('β')}<sub>round trip</sub> = 2${v('β')}`, 'rotation doubles after reflection (a wave plate would cancel)']],
  numbers: ['TGG at 1064 nm: V ≈ −40 rad/(T·m); a 45° rotator is ~ 2 cm long in ~1 T'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 1064, pol: 'H', power: 10 }, 'H light', [0, 6]); a('faraday', 46, 20, 0, { angle: 45 }, 'Faraday 45°', [0, 7.5]); a('polarizer', 72, 20, 0, { angle: 45 }, 'Pol. 45°', [0, 7.5]); a('powermeter', 98, 20, 0, {}); }),
  see: ['isolator', 'emagnet'] });
E('isolator', { group: P0,
  one: 'An optical isolator lets light pass one way and blocks it coming back, protecting the laser.',
  how: ['Back-reflections into a laser make it unstable. An isolator is a polariser, a 45° Faraday rotator and a second polariser at 45°. Forward light passes all three. Reflected light is rotated another 45° on its way back, arrives at 90° to the first polariser, and is blocked.'],
  math: [[`forward: 0° → 45° → passes · backward: 45° → 90° → blocked`, 'the non-reciprocal Faraday rotation adds up'],
    [`isolation [dB] = 10 log<sub>10</sub>(${v('P')}<sub>back,in</sub> / ${v('P')}<sub>back,out</sub>)`, 'typically 30–40 dB per stage']],
  demo: demo(110, 34, a => { a('laser', 16, 17, 0, { lambda: 1064 }, 'Laser', [0, 6]); a('isolator', 50, 17, 0, {}, 'Isolator', [0, 7]); a('screen', 96, 17, 0, {}); }),
  see: ['faraday', 'circulator'] });

/* ================= Filters & dispersion ================= */
const F0 = 'Filters & dispersion';
E('filter', { group: F0,
  one: 'An optical filter passes some wavelengths and blocks others, or dims all of them evenly (ND filter).',
  how: ['<b>Band-pass</b> filters pass a narrow band (e.g. 532 ± 5 nm) and are used to clean a laser line or select fluorescence. <b>Long-pass</b> and <b>short-pass</b> filters pass everything above or below an edge. <b>Notch</b> filters block one narrow band, e.g. the laser line in Raman spectroscopy. <b>Neutral density (ND)</b> filters reduce the power by a fixed factor at all wavelengths.',
    'Most modern filters are thin-film interference coatings; they work best at normal incidence.'],
  math: [[`${v('T')} = 10<sup>−OD</sup>`, 'optical density: OD 1 passes 10 %, OD 3 passes 0.1 %'],
    [`OD<sub>total</sub> = OD<sub>1</sub> + OD<sub>2</sub>`, 'stacked ND filters add their ODs'],
    [`${v('λ')}<sub>c</sub>(${v('θ')}) ≈ ${v('λ')}<sub>0</sub> ${rt('1 − (sin ' + v('θ') + '/' + v('n') + '<sub>eff</sub>)²')}`, 'tilting a thin-film filter shifts it to shorter wavelengths']],
  numbers: ['Laser-line filter: 10 nm FWHM, OD > 5 outside · Raman notch: OD 6 at the laser, < 5 nm wide'],
  demo: demo(110, 34, a => { a('lamp', 18, 17, 0, {}, 'White light', [0, 7]); a('filter', 55, 17, 0, { mode: 'bandpass', center: 610, width: 40 }, 'Band-pass 610 nm', [0, 7]); a('screen', 96, 17, 0, {}); }),
  see: ['dichroic', 'filtercube', 'lamp'] });
E('grating', { group: F0,
  one: 'A diffraction grating splits light into its colours, sending each wavelength at a different angle.',
  how: ['A grating has many fine, regularly spaced grooves. Each groove scatters light; only in directions where waves from neighbouring grooves arrive in step (a path difference of a whole number of wavelengths) do they add up. Those directions are the <b>diffraction orders</b>.',
    'Since the angle depends on λ, a grating disperses light into a spectrum, more strongly than a prism and with a nearly linear scale. <b>Blazed</b> gratings put most of the light into one order. In RNBeamX set lines/mm and which orders to show.'],
  math: [[`${v('d')} (sin ${v('θ')}<sub>m</sub> − sin ${v('θ')}<sub>i</sub>) = ${v('m')}${v('λ')}`, 'grating equation (d = 1 / lines per mm)'],
    [`${fr('d' + v('θ'), 'd' + v('λ'))} = ${fr(v('m'), v('d') + ' cos ' + v('θ') + '<sub>m</sub>')}`, 'angular dispersion'],
    [`${v('R')} = ${fr(v('λ'), 'Δ' + v('λ'))} = ${v('m')}${v('N')}`, 'resolving power (N = illuminated grooves)']],
  numbers: ['300, 600, 1200, 1800 lines/mm are common; 1200 l/mm × 25 mm → R = 30 000 in first order'],
  demo: demo(110, 56, a => { a('laser', 16, 28, 0, { lambda: 532, extra: '633' }, '532 + 633 nm', [0, 6]); a('grating', 48, 28, 0, { transmit: true, G: 300, orders: '-1,0,1', w: 10 }, 'Grating', [0, 9]); a('screen', 100, 28, 0, { d: 34 }); }),
  see: ['c-diff', 'spectrometer', 'prism'] });
E('prism', { group: F0,
  one: 'A dispersive prism bends light and spreads white light into a rainbow, because glass bends blue more than red.',
  how: ['The refractive index of glass depends on wavelength (<b>dispersion</b>): higher for blue than for red. A prism refracts at two tilted faces, so the bending adds up and each colour leaves at its own angle.',
    'The <b>minimum deviation</b> occurs when the light passes symmetrically. Flint glasses (SF11) disperse much more than crown glasses (BK7). RNBeamX uses the Sellmeier formula for real glasses. The SPR variant (Kretschmann prism with a gold film) is a sensor whose reflectance dips at a resonance angle.'],
  math: [[`${v('n')}²(${v('λ')}) = 1 + Σ ${fr(v('B') + '<sub>i</sub>' + v('λ') + '²', v('λ') + '² − ' + v('C') + '<sub>i</sub>')}`, 'Sellmeier dispersion formula'],
    [`${v('n')} = ${fr('sin((' + v('A') + ' + ' + v('δ') + '<sub>min</sub>)/2)', 'sin(' + v('A') + '/2)')}`, 'minimum deviation δ<sub>min</sub> for apex angle A'],
    [`${v('V')}<sub>d</sub> = ${fr(v('n') + '<sub>d</sub> − 1', v('n') + '<sub>F</sub> − ' + v('n') + '<sub>C</sub>')}`, 'Abbe number: low V = strong dispersion (BK7 64, SF11 25)']],
  demo: demo(110, 70, a => { a('lamp', 16, 20, 0, { beamWidth: 0.5, count: 7 }, 'White light', [0, 7]); a('prism', 50, 20, 10, { mat: 'N-BK7' }, 'Prism', [0, -9]); a('screen', 96, 58, 41, { d: 12 }, 'Spectrum', [9, -4]); }),
  see: ['grating', 'c-refr', 'rprism'] });
E('window', { group: F0,
  one: 'A flat window or plate: transmits light, but shifts a tilted beam sideways and adds a small reflection.',
  how: ['Windows seal vacuum chambers and cryostats, protect optics, or are tilted on purpose to fine-tune a beam’s position. Each uncoated surface reflects about 4 % (a ghost beam). Tilted at Brewster’s angle, p-polarised light passes without any reflection.'],
  math: [[`${v('d')} = ${v('t')} sin ${v('θ')} (1 − ${fr('cos ' + v('θ'), rt(v('n') + '² − sin²' + v('θ')))})`, 'lateral shift through a plate of thickness t'],
    [`tan ${v('θ')}<sub>B</sub> = ${v('n')}`, 'Brewster angle (glass: 56.3°): no p reflection']],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 532 }, 'Laser', [0, 6]); a('window', 55, 20, 35, { t: 6, d: 12 }, 'Tilted window', [0, 9]); a('screen', 98, 20, 0, {}); }),
  see: ['c-refr', 'chamber'] });
E('iris', { group: F0,
  one: 'An iris (or pinhole, or slit) blocks the outside of a beam and passes the centre.',
  how: ['An adjustable iris clips the beam to a chosen diameter. Irises mark the beam path during alignment, block stray reflections and limit the aperture of an imaging system. A <b>pinhole</b> at a focus blocks out-of-focus light (confocal microscopy) or cleans up a beam’s profile (spatial filter).'],
  math: [[`${fr(v('P'), v('P') + '<sub>0</sub>')} = 1 − e<sup>−2${v('a')}²/${v('w')}²</sup>`, 'power through a round aperture of radius a for a Gaussian beam of radius w'],
    [`${v('a')} = 1.5 ${v('w')} → 99 %`, 'an aperture 1.5× the beam radius passes 99 % of the power']],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 633, beamWidth: 5 }, 'Wide beam', [0, 7]); a('iris', 55, 20, 0, { r: 1 }, 'Iris', [0, 8]); a('screen', 98, 20, 0, {}); }),
  demoMode: { beamStyle: 'envelope' },
  see: ['spatialfilter', 'c-diff'] });
E('rprism', { group: F0,
  one: 'Right-angle, Dove and wedge prisms fold, flip or slightly steer a beam using refraction or total internal reflection.',
  how: ['A <b>right-angle prism</b> used through its hypotenuse turns a beam by 90° with total internal reflection: no coating needed and nearly 100 % reflectance. A <b>Dove prism</b> flips an image; rotating it rotates the image twice as fast. A <b>wedge</b> deflects a beam by a small fixed angle; an <b>axicon</b> (cone) makes a Bessel beam.'],
  math: [[`${v('θ')} > ${v('θ')}<sub>c</sub> = arcsin(1/${v('n')})`, 'total internal reflection when the angle inside exceeds the critical angle'],
    [`${v('δ')} ≈ (${v('n')} − 1) ${v('α')}`, 'deviation by a thin wedge of angle α']],
  demo: demo(100, 56, a => { a('laser', 18, 44, 0, { lambda: 532 }, 'Laser', [0, 6]); a('rprism', 60, 44, 0, { kind: 'wedge' }, 'Wedge', [0, 8]); a('screen', 94, 40, 0, { d: 20 }); }),
  see: ['prism', 'mirror'] });
E('diffuser', { group: F0,
  one: 'A diffuser scatters light into a wide cone, making illumination even.',
  how: ['Ground glass or engineered diffusers have a rough surface that refracts each part of the beam in a slightly different direction. They smooth out hot spots, make even illumination, or turn a laser beam into a soft, spread light. Laser light through a diffuser shows <b>speckle</b>, a grainy interference pattern.'],
  math: [[`${v('θ')}<sub>out</sub> ≈ ${rt(v('θ') + '<sub>in</sub>² + ' + v('θ') + '<sub>d</sub>²')}`, 'the diffuser’s scatter angle θ<sub>d</sub> adds to the beam’s divergence'],
    [`speckle size ≈ ${fr(v('λ') + v('z'), v('D'))}`, 'grain size at distance z behind an illuminated spot of size D']],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 532 }, 'Laser', [0, 6]); a('diffuser', 50, 20, 0, { spread: 12 }, 'Diffuser', [0, 8]); a('screen', 98, 20, 0, { d: 24 }); }),
  see: ['lamp', 'intsphere'] });

/* ================= Modulators & nonlinear ================= */
const N0 = 'Modulators & nonlinear';
E('aom', { group: N0,
  one: 'An acousto-optic modulator uses a sound wave in a crystal to deflect, switch or shift the frequency of a beam.',
  how: ['A piezo transducer drives an RF sound wave (tens of MHz) through a crystal. The sound wave is a moving grating of density, so the light diffracts off it (<b>Bragg diffraction</b>). The first order is deflected by a small angle and shifted in frequency by exactly the RF frequency.',
    'Switching the RF on and off switches the deflected beam within ~100 ns, much faster than a mechanical shutter; changing the RF frequency steers the beam. AOMs are used for fast switching, pulse picking, intensity stabilisation and laser cooling.'],
  math: [[`${v('θ')} ≈ ${fr(v('λ') + v('f'), v('v'))}`, 'deflection between orders (f = RF frequency, v = speed of sound)'],
    [`${v('ν')}<sub>out</sub> = ${v('ν')}<sub>in</sub> + ${v('m')}${v('f')}`, 'frequency shift of order m'],
    [`${v('η')} = sin²(${fr('π', v('λ'))} ${rt(fr(v('M') + '<sub>2</sub>' + v('L') + v('P') + '<sub>a</sub>', '2' + v('H')))})`, 'diffraction efficiency vs. acoustic power P<sub>a</sub>']],
  numbers: ['TeO₂, v = 4200 m/s, 80 MHz at 633 nm → θ ≈ 12 mrad (0.7°); efficiency up to 85 %'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 633 }, 'Laser', [0, 6]); a('aom', 46, 20, 0, { drive: 'rf', rf: 200 }, 'AOM (RF on)', [0, 7]); a('screen', 100, 20, 0, { d: 20 }); }),
  see: ['eom', 'grating'] });
E('eom', { group: N0,
  one: 'An electro-optic modulator changes the phase or polarisation of light with a voltage, extremely fast.',
  how: ['Some crystals (lithium niobate, KDP) change their refractive index in an electric field: the <b>Pockels effect</b>. A voltage across the crystal therefore delays the light. Used directly it modulates the <b>phase</b> (sidebands for laser locking); between polarisers it modulates the <b>amplitude</b>. A Pockels cell with a high voltage acts as a nanosecond optical switch (Q-switching, pulse picking).'],
  math: [[`Δ${v('n')} = ½ ${v('n')}³ ${v('r')} ${v('E')}`, 'Pockels effect (r = electro-optic coefficient)'],
    [`Γ = π ${fr(v('V'), v('V') + '<sub>π</sub>')}`, 'retardance vs. voltage; V<sub>π</sub> = half-wave voltage'],
    [`${v('T')} = sin²(${fr('π' + v('V'), '2' + v('V') + '<sub>π</sub>')})`, 'transmission between crossed polarisers']],
  numbers: ['Bulk LiNbO₃ V<sub>π</sub> ~ 100–300 V · waveguide modulators V<sub>π</sub> ~ 3 V at 40 GHz'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 1064, pol: 'H' }, 'H light', [0, 6]); a('eom', 48, 20, 0, { retardance: 180, angle: 45 }, 'EOM (V = Vπ)', [0, 7]); a('polarizer', 74, 20, 0, { angle: 90 }, 'Pol. V', [0, 7.5]); a('powermeter', 98, 20, 0, {}); }),
  see: ['aom', 'hwp'] });
E('crystal', { group: N0,
  one: 'A nonlinear crystal makes new colours: e.g. it doubles the frequency of a laser (1064 nm → 532 nm).',
  how: ['At high intensity the response of a crystal is no longer proportional to the field. The extra (nonlinear) part oscillates at twice the frequency, so a crystal such as BBO, KTP or LBO generates light at half the wavelength: <b>second-harmonic generation</b> (SHG). Green laser pointers do this.',
    'The new light only builds up if the fundamental and harmonic travel in step: <b>phase matching</b>, achieved by choosing the crystal angle or by periodic poling (PPLN). Efficiency grows with the square of the power, so pulsed lasers work best.'],
  math: [[`${v('P')} = ε<sub>0</sub>(χ<sup>(1)</sup>${v('E')} + χ<sup>(2)</sup>${v('E')}² + …)`, 'nonlinear polarisation of the medium'],
    [`${v('ω')}<sub>SH</sub> = 2${v('ω')} · ${v('λ')}<sub>SH</sub> = ${v('λ')}/2`, 'second harmonic'],
    [`Δ${v('k')} = ${v('k')}<sub>2ω</sub> − 2${v('k')}<sub>ω</sub> = 0`, 'phase-matching condition'],
    [`${v('P')}<sub>2ω</sub> ∝ ${fr(v('d') + '<sub>eff</sub>² ' + v('L') + '² ' + v('P') + '<sub>ω</sub>²', v('A'))} sinc²(${fr('Δ' + v('k') + v('L'), '2')})`, 'SHG power: quadratic in input power and crystal length']],
  numbers: ['BBO, LBO, KTP, PPLN; fs pulses through 1 mm BBO: 30–50 % conversion'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 1064, pulsed: true }, '1064 nm', [0, 6]); a('crystal', 50, 20, 0, { harmonic: 2, eff: 0.4 }, 'SHG crystal', [0, 7]); a('screen', 98, 20, 0, {}); }),
  see: ['opo', 'c-light'] });
E('opo', { group: N0,
  one: 'An optical parametric oscillator converts one laser colour into two new, tunable colours.',
  how: ['In a nonlinear crystal a pump photon can split into two lower-energy photons, the <b>signal</b> and the <b>idler</b>. Energy is conserved, so their frequencies add up to the pump frequency. Placing the crystal in a cavity (OPO) or seeding it (OPA) makes this efficient. Changing the crystal angle or temperature tunes the output across a wide range, often into the mid-infrared.'],
  math: [[`${fr('1', v('λ') + '<sub>p</sub>')} = ${fr('1', v('λ') + '<sub>s</sub>')} + ${fr('1', v('λ') + '<sub>i</sub>')}`, 'energy conservation (ω<sub>p</sub> = ω<sub>s</sub> + ω<sub>i</sub>)'],
    [`${v('k')}<sub>p</sub> = ${v('k')}<sub>s</sub> + ${v('k')}<sub>i</sub>`, 'phase matching (momentum conservation)']],
  numbers: ['532 nm pump → 1550 nm signal + 810 nm idler… (any pair satisfying the equation)'],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 532 }, 'Pump 532 nm', [0, 6]); a('opo', 52, 20, 0, { signal: 800 }, 'OPO', [0, 8]); a('screen', 98, 20, 0, {}); }),
  see: ['crystal', 'scfiber'] });
E('scfiber', { group: N0,
  one: 'A supercontinuum fibre turns intense laser pulses into a very broad, laser-bright spectrum.',
  how: ['Ultrafast pulses travelling through a highly nonlinear fibre (photonic crystal fibre) broaden enormously through self-phase modulation, soliton fission and four-wave mixing. The output looks white but stays as directional as a laser. Used for white-light microscopy, OCT and broadband spectroscopy.'],
  math: [[`Δ${v('ω')}<sub>SPM</sub> ≈ ${v('γ')} ${v('P')}<sub>0</sub> ${v('L')} / ${v('τ')}`, 'spectral broadening from self-phase modulation (γ = fibre nonlinearity)'],
    [`${v('n')} = ${v('n')}<sub>0</sub> + ${v('n')}<sub>2</sub>${v('I')}`, 'Kerr effect: the index rises with intensity']],
  demo: demo(110, 40, a => { a('laser', 16, 20, 0, { lambda: 800, pulsed: true }, 'fs pulses', [0, 6]); a('scfiber', 52, 20, 0, {}, 'PCF', [0, 7]); a('screen', 98, 20, 0, {}); }),
  see: ['lamp', 'opo'] });
E('chopper', { group: N0,
  one: 'An optical chopper is a spinning slotted wheel that switches a beam on and off at a known frequency.',
  how: ['The chopped beam produces a signal at exactly the chopping frequency. A <b>lock-in amplifier</b> referenced to the chopper picks out only that frequency, rejecting room light and noise. This measures signals thousands of times weaker than the background, e.g. the pump-induced change in pump–probe spectroscopy.'],
  math: [[`${v('f')}<sub>chop</sub> = ${v('N')}<sub>slots</sub> × ${v('f')}<sub>rot</sub>`, 'chopping frequency'],
    [`${v('S')} ∝ ⟨${v('V')}(${v('t')}) sin(2π${v('f')}${v('t')} + ${v('φ')})⟩`, 'lock-in detection: multiply by the reference and average']],
  numbers: ['Typical 10 Hz – 10 kHz; lock-in time constant 100 ms'],
  demo: () => RNBX.templates.list.find(t => t.id === 'pumpprobe').build(),
  see: ['instrument', 'pd'] });
E('cavity', { group: N0,
  one: 'A Fabry–Pérot cavity is two facing mirrors; it transmits only wavelengths that fit a whole number of half-waves between them.',
  how: ['Light bouncing between two highly reflective mirrors interferes with itself. At resonance (round trip = whole number of wavelengths) the waves add up and almost all light passes; off resonance it is reflected. The transmission is a comb of sharp peaks separated by the <b>free spectral range</b>. The sharpness is the <b>finesse</b>.',
    'Cavities are used as precise wavelength filters, to stabilise lasers, to enhance light–matter interaction, and as the resonator of every laser.'],
  math: [[`${v('T')} = ${fr('1', '1 + ' + v('F') + ' sin²(' + v('δ') + '/2)')}`, 'Airy transmission; δ = round-trip phase = 4π n L/λ'],
    [`FSR = ${fr(v('c'), '2' + v('n') + v('L'))}`, 'free spectral range'],
    [`ℱ = ${fr('π' + rt(v('R')), '1 − ' + v('R'))} = ${fr('FSR', 'Δ' + v('ν'))}`, 'finesse (R = mirror reflectance): R = 0.99 → ℱ ≈ 310'],
    [`${v('F')} = ${fr('4' + v('R'), '(1 − ' + v('R') + ')²')}`, 'coefficient of finesse']],
  demo: demo(110, 34, a => { a('laser', 16, 17, 0, { lambda: 1064 }, 'Laser', [0, 6]); a('cavity', 54, 17, 0, {}, 'Cavity', [0, 8]); a('pd', 96, 17, 0, {}, 'PD', [0, 6]); }),
  see: ['ringchip', 'c-interf'] });
E('ringchip', { group: N0,
  one: 'A microring resonator: a tiny loop of waveguide on a chip that only lets certain wavelengths couple in.',
  how: ['Light in a straight waveguide couples into a nearby ring. When a whole number of wavelengths fits the ring’s circumference, the light builds up in the ring and leaves through the <b>drop</b> port; the <b>through</b> port shows a dip. Rings are filters, sensors, modulators and sources on photonic chips.'],
  math: [[`${v('m')}${v('λ')} = ${v('n')}<sub>eff</sub> 2π${v('R')}`, 'resonance condition'],
    [`FSR<sub>λ</sub> = ${fr(v('λ') + '²', v('n') + '<sub>g</sub> 2π' + v('R'))}`, 'spacing of resonances'],
    [`${v('Q')} = ${fr(v('λ'), 'Δ' + v('λ'))}`, 'quality factor (10⁴ – 10⁷ on chips)']],
  demo: () => RNBX.templates.list.find(t => t.id === 'ring').build(),
  see: ['cavity'] });

/* ================= Fibre optics ================= */
const FB = 'Fibre optics';
E('coupler', { group: FB,
  one: 'A fibre coupler (collimator) focuses a free-space beam into an optical fibre, or turns the fibre output back into a beam.',
  how: ['An optical fibre guides light in a glass core by total internal reflection. Getting light in needs a lens that focuses the beam onto the tiny core (about 5 µm for single-mode fibre) within the fibre’s acceptance angle. The same part at the other end collimates the diverging output.',
    'In RNBeamX connect two couplers (or a laser and a fibre end) with the <i>Fibre</i> tool: the light goes in at one and comes out of the other.'],
  math: [[`NA = ${rt(v('n') + '<sub>core</sub>² − ' + v('n') + '<sub>clad</sub>²')}`, 'acceptance of the fibre'],
    [`${v('V')} = ${fr('2π' + v('a'), v('λ'))} NA < 2.405`, 'single-mode condition (a = core radius)'],
    [`${v('η')} = (${fr('2' + v('w') + '<sub>1</sub>' + v('w') + '<sub>2</sub>', v('w') + '<sub>1</sub>² + ' + v('w') + '<sub>2</sub>²')})²`, 'coupling efficiency for mismatched spot and mode radii']],
  numbers: ['SMF-28 at 1550 nm: mode diameter 10.4 µm, NA 0.14, loss 0.2 dB/km'],
  demo: demo(110, 56, (a, T, d) => { a('laser', 16, 14, 0, { lambda: 633 }, 'Laser', [0, 6]); const c1 = a('coupler', 50, 14, 180, {}, 'In', [0, 6]); const c2 = a('coupler', 50, 42, 0, {}, 'Out', [0, 6]); d.objects.push(T.link('fiber', c1, c2)); a('screen', 96, 42, 0, {}); }),
  see: ['benchlaser', 'circulator', 'fibersplit'] });
E('fiber', { group: FB,
  one: 'An optical fibre guides light along a flexible glass (or plastic) thread; the type decides how many modes it carries and whether it keeps the polarisation.',
  how: ['Light travels in the <b>core</b>, kept there by total internal reflection at the lower-index <b>cladding</b>. A <b>single-mode</b> fibre (SMF, core ~9 µm) carries one transverse mode, so its output is a clean Gaussian beam; it is the standard for telecom (yellow jacket) and for delivering laser light.',
    '<b>Multimode</b> fibres have bigger cores (50–62.5 µm, orange or aqua jackets; up to 1 mm for large-core and plastic fibres). They accept light easily and carry high power, but the output is a speckled, more divergent beam with poor beam quality (large M²). They are used for collecting light, for spectroscopy and for illumination. A <b>fibre bundle</b> packs many fibres together to collect light or carry an image.',
    'Ordinary fibres scramble the polarisation. A <b>polarisation-maintaining</b> (PM, PANDA) fibre has stress rods that keep light launched along its slow axis linearly polarised. <b>Photonic-crystal</b> and <b>hollow-core</b> fibres guide light with a pattern of air holes: endlessly single-mode, very nonlinear (supercontinuum) or guiding in air with low dispersion.',
    'In RNBeamX choose the <i>Fibre type</i> on a fibre: it changes the look (jacket colour, thickness, stripe or armour) and the physics (PM keeps the polarisation; multimode gives a larger, lower-quality output). The demo sends H-polarised light through three fibres to a polariser: only the PM fibre keeps it.'],
  math: [[`NA = ${rt(v('n') + '<sub>core</sub>² − ' + v('n') + '<sub>clad</sub>²')} = sin ${v('θ')}<sub>max</sub>`, 'numerical aperture: the acceptance cone'],
    [`${v('V')} = ${fr('2π' + v('a'), v('λ'))} NA`, 'V-number (a = core radius); single-mode when V < 2.405'],
    [`${v('N')}<sub>modes</sub> ≈ ${fr(v('V') + '²', '2')}`, 'number of modes in a step-index multimode fibre (50 µm, NA 0.2, 633 nm → ~600)'],
    [`${v('P')}(${v('L')}) = ${v('P')}<sub>0</sub> 10<sup>−α${v('L')}/10</sup>`, 'attenuation α in dB/km: SMF 0.2 dB/km at 1550 nm, POF ~150 dB/km'],
    [`${v('B')} = ${fr('2π', v('L') + '<sub>B</sub>')}`, 'PM fibre birefringence from its beat length L<sub>B</sub> (2–5 mm)']],
  numbers: ['SMF-28: 8.2 µm core, NA 0.14 · OM3: 50 µm, NA 0.2 · 105 µm large-core: NA 0.22 · PANDA PM: extinction > 20 dB'],
  demo: demo(120, 90, (a, T, d) => {
    [['smf', 'Single-mode', 12], ['pm', 'PM fibre', 40], ['mmf', 'Multimode', 68]].forEach(([ft, name, y]) => {
      a('laser', 14, y, 0, { lambda: 633, pol: 'H', power: 10, L: 12, H: 5 }, '', [0, 6]);
      const c1 = a('coupler', 34, y, 180, {}, '', [0, 6]), c2 = a('coupler', 62, y + 8, 0, {}, name, [0, 6]);
      d.objects.push(T.link('fiber', c1, c2, { fiberType: ft, colorMode: 'jacket', bend: 0.5 }));
      a('polarizer', 82, y + 8, 0, { angle: 0 }, '', [0, 7]); a('pd', 106, y + 8, 0, {}, name, [0, 6]);
    });
  }),
  see: ['coupler', 'benchlaser', 'c-pol', 'scfiber'] });
E('circulator', { group: FB,
  one: 'A fibre circulator routes light port 1 → 2 → 3, so light returning from a probe goes to a detector instead of the laser.',
  how: ['Inside, Faraday rotators and polarisation optics make the routing non-reciprocal. Light entering port 1 leaves port 2; light coming back into port 2 leaves port 3. Used in fibre sensors, OCT and fibre Bragg grating readout.'],
  math: [[`1 → 2, 2 → 3`, 'non-reciprocal routing (isolation 1 ← 2 typically > 40 dB)']],
  see: ['isolator', 'coupler'] });
E('fibersplit', { group: FB,
  one: 'A fibre splitter divides light between two fibres; a WDM sorts it by wavelength.',
  how: ['Two fibres fused side by side exchange light through their evanescent fields; the coupled fraction depends on the interaction length. A 50:50 splitter is the fibre version of a beam splitter. Wavelength-division multiplexers (WDM) use the wavelength dependence to separate e.g. 980 nm pump from 1550 nm signal.'],
  math: [[`${v('P')}<sub>2</sub> = ${v('P')}<sub>0</sub> sin²(${v('κ')}${v('L')})`, 'power coupled across after length L with coupling coefficient κ']],
  see: ['coupler', 'bscube', 'dichroic'] });

/* ================= Detectors ================= */
const D0 = 'Detectors';
const det = (id, one, how, math, numbers, extra) => E(id, Object.assign({ group: D0, one, how, math, numbers,
  demo: demo(110, 34, a => { a('laser', 18, 17, 0, { lambda: 633, power: 1 }, 'Laser 1 mW', [0, 6]); a(id, 92, 17, 0, {}, '', [0, 7]); }) }, extra || {}));
det('pd', 'A photodiode turns light into an electric current, proportional to the power.',
  ['A photodiode is a semiconductor junction: each absorbed photon frees an electron, giving a current. It is fast (up to GHz), linear over many decades and cheap. Silicon works from 350 to 1100 nm; InGaAs from 900 to 1700 nm.',
    'Variants: <b>avalanche photodiodes</b> and SPADs multiply the charge for very weak light (down to single photons); <b>quadrant</b> photodiodes measure beam position; <b>balanced</b> detectors subtract two beams to cancel laser noise.'],
  [[`${v('I')} = ℛ ${v('P')} · ℛ = ${fr(v('η') + v('e') + v('λ'), v('hc'))}`, 'photocurrent; responsivity ℛ (η = quantum efficiency)'],
    [`ℛ [A/W] ≈ ${fr(v('η') + ' ' + v('λ') + ' [nm]', '1240')}`, 'silicon at 800 nm: ~0.5 A/W'],
    [`${v('f')}<sub>3dB</sub> = ${fr('1', '2π' + v('R') + v('C'))}`, 'bandwidth set by load resistance and junction capacitance']],
  ['1 mW at 633 nm on silicon ≈ 0.4 mA'], { see: ['pmt', 'powermeter', 'camera'] });
det('camera', 'A camera (CCD / CMOS) records an image: a grid of pixels, each a tiny light detector.',
  ['Each pixel collects photo-electrons during the exposure; the camera reads them out as numbers. Scientific cameras (sCMOS, EMCCD) have low noise for weak signals; a camera at a focus records a beam profile or an interference pattern.'],
  [[`${v('N')}<sub>e</sub> = ${v('η')} ${fr(v('P') + v('t') + '<sub>exp</sub>' + v('λ'), v('hc'))}`, 'photo-electrons per pixel'],
    [`SNR = ${fr(v('N') + '<sub>e</sub>', rt(v('N') + '<sub>e</sub> + ' + v('N') + '<sub>dark</sub> + σ<sub>read</sub>²'))}`, 'signal-to-noise: shot noise, dark current and read noise']],
  ['sCMOS: 6.5 µm pixels, ~1 e⁻ read noise, 80 % QE'], { see: ['profiler', 'pd'] });
det('spectrometer', 'A spectrometer measures how much light there is at each wavelength.',
  ['Light enters through a slit, a mirror collimates it, a grating disperses it, and a second mirror images each wavelength onto a different pixel of a line camera. The result is a spectrum: intensity versus wavelength. Raman, fluorescence and absorption measurements all end in a spectrometer.'],
  [[`Δ${v('λ')} ≈ ${fr(v('w') + '<sub>slit</sub> ' + v('d') + ' cos ' + v('θ'), v('m') + v('f'))}`, 'spectral resolution from slit width, grating period and focal length'],
    [`${v('d')} (sin ${v('θ')}<sub>m</sub> − sin ${v('θ')}<sub>i</sub>) = ${v('m')}${v('λ')}`, 'grating equation inside']],
  ['Compact USB spectrometer: 0.5–2 nm resolution · lab Raman spectrometer: < 0.05 nm'], { see: ['grating', 'c-diff'] });
det('pmt', 'A photomultiplier tube detects extremely weak light, down to single photons, with huge gain.',
  ['A photon knocks an electron out of the photocathode. The electron is accelerated onto a dynode, releasing several electrons; a chain of 10 dynodes multiplies one electron into about a million. PMTs are used in confocal and two-photon microscopes, fluorescence lifetime and photon counting.'],
  [[`${v('G')} = ${v('δ')}<sup>${v('N')}</sup>`, 'gain: δ secondary electrons per dynode, N dynodes (4¹⁰ ≈ 10⁶)'],
    [`${v('I')}<sub>a</sub> = ${v('G')} ${v('η')} ${fr(v('e') + v('P') + v('λ'), v('hc'))}`, 'anode current']],
  ['Quantum efficiency 20–40 %, rise time ~ 1 ns'], { see: ['pd'] });
det('powermeter', 'A power meter reads the total power of a beam in watts.',
  ['A photodiode sensor (accurate, for µW to mW) or a thermal sensor (absorbs everything and measures the heating, for mW to kW) gives the average power. Always the first measurement after aligning a laser.'],
  [[`${v('P')} = ${fr(v('I'), 'ℛ(' + v('λ') + ')')}`, 'photodiode head: needs the wavelength setting'],
    [`${v('E')}<sub>pulse</sub> = ${fr(v('P') + '<sub>avg</sub>', v('f') + '<sub>rep</sub>')}`, 'pulse energy from average power and repetition rate']],
  ['Photodiode head 1 nW–500 mW · thermal head 10 mW–100 W'], { see: ['pd'] });
det('beamdump', 'A beam dump (block) safely absorbs a beam you do not need.',
  ['Every unused beam (the other port of a splitter, the zeroth order of a grating, back-reflections) must end on a dump, not on the wall or in someone’s eye. Good dumps are black, angled or cone-shaped so nothing reflects back.'],
  [[`${v('P')}<sub>reflected</sub> < 10<sup>−4</sup> ${v('P')}`, 'a good dump returns less than 0.01 %']], [], { see: ['iris'] });
det('screen', 'A screen or alignment card shows where the beam is.',
  ['A white or fluorescent card makes the beam visible during alignment (IR viewer cards glow visible under infrared light). In a figure, a screen shows where a beam lands, its size and the fringes or spots.'],
  [], [], { see: ['camera', 'profiler'] });
det('profiler', 'A beam profiler measures the shape and size of a beam.',
  ['A camera without a lens (or a scanning slit) records the intensity across the beam. Software fits a Gaussian and reports the diameter. Measuring at several distances gives the waist and M².'],
  [[`${v('D')}4σ = 4 ${rt('⟨' + v('x') + '²⟩ − ⟨' + v('x') + '⟩²')}`, 'second-moment (ISO) beam diameter; equals 2w for a Gaussian'],
    [`${v('w')}(${v('z')})² = ${v('w')}<sub>0</sub>² + M⁴ ${fr(v('λ') + '²', 'π²' + v('w') + '<sub>0</sub>²')} (${v('z')} − ${v('z')}<sub>0</sub>)²`, 'fit used for an M² measurement']],
  [], { see: ['c-gauss', 'camera'] });
det('intsphere', 'An integrating sphere collects all the light from a source or sample, whatever its direction.',
  ['The inside is coated with a white, perfectly diffuse material. Light entering bounces many times and spreads evenly over the wall, so a detector at a port sees a signal proportional to the total power, independent of beam shape or direction. Used for total power, LED efficiency, reflectance and transmittance including scattering.'],
  [[`${v('E')} = ${fr(v('P'), '4π' + v('R') + '²')} ${fr(v('ρ'), '1 − ' + v('ρ') + '(1 − ' + v('f') + ')')}`, 'wall irradiance (ρ = wall reflectance, f = port fraction)']],
  [], { see: ['powermeter', 'diffuser'] });

/* ================= Samples, mechanics, imaging ================= */
const SM = 'Samples & mechanics';
E('sample', { group: SM,
  one: 'The thing you measure: a slide, cuvette or chip. It can absorb part of the light and emit new light (fluorescence or Raman).',
  how: ['Set the transmission T to make the sample absorb. With <i>Emits</i> on, it sends out light at another wavelength, like fluorescence (Stokes-shifted, longer wavelength) or Raman scattering. That emitted light is what most spectroscopy setups collect.'],
  math: [[`${v('A')} = −log<sub>10</sub>${v('T')} = ε ${v('c')} ${v('l')}`, 'Beer–Lambert law: absorbance from molar absorptivity ε, concentration c, path length l'],
    [`Δ${v('ν̃')} [cm⁻¹] = 10⁷ (${fr('1', v('λ') + '<sub>0</sub>')} − ${fr('1', v('λ') + '<sub>s</sub>')})`, 'Raman shift from laser and scattered wavelengths in nm']],
  demo: demo(110, 34, a => { a('laser', 16, 17, 0, { lambda: 532 }, 'Laser', [0, 6]); a('sample', 55, 17, 0, { look: 'cuvette', T: 0.3, w: 5 }, 'Sample (T = 0.3)', [0, 9]); a('powermeter', 96, 17, 0, {}); }),
  see: ['spectrometer', 'filter', 'objective'] });
E('stage', { group: SM,
  one: 'A translation stage moves a part precisely along one direction.',
  how: ['Linear stages move optics with micrometre (manual) or nanometre (motorised, piezo) precision. Under a retroreflector a stage sets the delay in pump–probe; under a mirror it scans an interferometer; under a sample it scans an image.'],
  math: [[`Δ${v('t')} = 2Δ${v('x')}/${v('c')}`, 'delay from moving a retroreflector']],
  see: ['retro', 'posstage'] });
E('chamber', { group: SM, one: 'A cryostat or vacuum chamber holds a sample at low temperature or in vacuum; the light goes in and out through windows.',
  how: ['Many measurements need cold (4 K–300 K) or vacuum. Optical windows let the beams through; each window adds reflections and some lateral shift.'], see: ['window'] });
E('module', { group: SM, one: 'A boxed optical module: a beam enters, something happens inside, the beam leaves. Use it for any instrument you do not want to draw in detail.',
  how: ['The module can contain a probe head focusing the light at a set distance, or a Michelson (FTIR) interferometer. For a black-box sub-system it keeps the figure simple.'], see: ['custom'] });
E('emagnet', { group: SM, one: 'An electromagnet makes a strong magnetic field between its pole pieces, e.g. for magneto-optics.',
  how: ['Current in the coils magnetises the iron core; the field concentrates in the gap between the poles. Samples in the gap show magneto-optical effects such as Faraday or Kerr rotation. Helmholtz coils make a weaker but very uniform field.'],
  math: [[`${v('B')} ≈ ${fr('μ<sub>0</sub>' + v('N') + v('I'), v('g'))}`, 'field in a gap g for N turns carrying current I (iron core)'],
    [`${v('B')} = (${fr('4', '5')})<sup>3/2</sup> ${fr('μ<sub>0</sub>' + v('N') + v('I'), v('R'))}`, 'centre of a Helmholtz pair of radius R']], see: ['faraday'] });
E('hotplate', { group: SM, one: 'A hot plate or heating stage controls a sample’s temperature during a measurement.', how: ['Temperature changes spectra (peak shifts, phase transitions). A heating stage with a controller sets and holds it.'], see: ['sample', 'instrument'] });
E('instrument', { group: 'Electronics', one: 'Boxes for the electronics around an experiment: lock-in amplifiers, oscilloscopes, controllers, computers.',
  how: ['Connect them with wires to detectors and actuators. A <b>lock-in amplifier</b> extracts a signal at a reference frequency; an <b>oscilloscope</b> shows fast signals; <b>drivers</b> and <b>controllers</b> run lasers, stages and heaters; a <b>DAQ</b> card digitises signals into the computer.'],
  math: [[`${v('X')} + i${v('Y')} = ${fr('2', v('T'))} ∫ ${v('V')}(${v('t')}) e<sup>−i2π${v('f')}<sub>ref</sub>${v('t')}</sup> d${v('t')}`, 'lock-in demodulation over time constant T']], see: ['chopper', 'pd'] });

const OM = 'Optomechanics';
E('kmount', { group: OM, one: 'A kinematic mirror mount holds a mirror and lets you tilt it finely with two screws.', how: ['Three contact points (a cone, a groove and a flat) define the mirror position exactly; two fine screws tilt it about two axes. This is how beams are aligned. Gimbal mounts tilt about the mirror centre; flip mounts swing the mirror in and out of the beam.'],
  math: [[`Δ${v('θ')}<sub>beam</sub> = 2 ${fr(v('p') + ' Δ' + v('φ'), '2π ' + v('a'))}`, 'beam tilt from a screw turn Δφ (pitch p, lever arm a)']],
  demo: demo(100, 56, (a, T) => { a('laser', 18, 44, 0, { lambda: 633 }, 'Laser', [0, 6]); a('kmount', 64, 44, T.ang(T.R, T.UP), {}, 'Kinematic mount', [12, 2]); a('screen', 64, 8, 90, {}); }), see: ['mirror'] });
E('galvo', { group: OM, one: 'A galvo mirror tilts very quickly under electrical control, scanning a beam across a sample.', how: ['A small mirror on a galvanometer motor turns by a few degrees in under a millisecond. Two galvos scan a laser spot in x and y: the basis of confocal and two-photon microscopes and laser marking. Set <i>scan</i> to see the deflected beam; animate it with <i>Animate ▸ Mirror / galvo scan</i>.'],
  math: [[`Δ${v('θ')}<sub>beam</sub> = 2${v('θ')}<sub>mech</sub>`, 'optical scan angle'], [`${v('x')} = ${v('f')} tan 2${v('θ')}`, 'spot position after a scan lens of focal length f']],
  demo: () => RNBX.templates.list.find(t => t.id === 'confocal').build(), see: ['mirror', 'lens', 'objective'] });
E('lenstube', { group: OM, one: 'A lens tube holds lenses on one axis; with two lenses it is a beam expander.', how: ['A Kepler telescope of two lenses separated by f₁ + f₂ resizes a collimated beam by f₂/f₁. Expanding a beam before a lens gives a smaller focus.'],
  math: [[`${v('M')} = ${fr(v('f') + '<sub>2</sub>', v('f') + '<sub>1</sub>')} · ${v('D')}<sub>out</sub> = ${v('M')}${v('D')}<sub>in</sub>`, 'beam-expander magnification'], [`${v('θ')}<sub>out</sub> = ${v('θ')}<sub>in</sub>/${v('M')}`, 'divergence falls by the same factor']],
  demo: demo(110, 34, a => { a('laser', 16, 17, 0, { lambda: 532 }, 'Laser', [0, 6]); a('lenstube', 50, 17, 0, { content: 'expander', mag: 3 }, '3× expander', [0, 7]); a('screen', 96, 17, 0, { d: 12 }); }), demoMode: { beamStyle: 'envelope' }, see: ['lens', 'c-gauss'] });
E('cagecube', { group: OM, one: 'A cage cube holds a beam splitter, mirror or dichroic inside a cage system.', how: ['Cage systems connect optics with four steel rods so everything stays on one axis. A cube turns or splits the beam at 90°.'], see: ['bscube', 'cageplate'] });
E('cageplate', { group: OM, one: 'A cage plate holds a lens, filter or iris in a cage system.', how: ['Plates slide along the rods and lock with screws; the optic stays centred on the axis.'], see: ['lens', 'cagecube'] });
E('cageplate3d', { group: OM, one: 'A cage plate drawn in perspective, holding a lens, filter, iris or a fibre adapter.', how: ['The same as a cage plate, drawn with depth for illustrations. With a fibre adapter it is a working fibre end: connect a fibre to it and the light comes out along the cage axis.'], see: ['cageplate', 'coupler'] });
E('cagerods', { group: OM, one: 'Cage rods: four steel rods that hold cage plates and cubes on one optical axis.', how: ['Plates slide along the rods, so lenses and filters stay centred and parallel without separate alignment. Cage systems are compact and stable, ideal for fibre launches, small microscopes and illumination optics.'], see: ['cageplate', 'cagecube'] });
E('shutter', { group: OM, one: 'A beam shutter blocks or passes the beam on command.', how: ['Mechanical shutters open in milliseconds and protect samples and detectors between measurements. For faster switching use an AOM or EOM.'], math: [[`${v('t')}<sub>open</sub> ~ 1–10 ms`, 'typical opening time']], see: ['aom'] });
E('posstage', { group: OM, one: 'Rotation and XYZ stages turn or position a part precisely.', how: ['Rotation stages set polariser and wave-plate angles or sample orientation; XYZ stages position fibres and samples to micrometres; tilt platforms align optics.'], see: ['stage'] });
E('spatialfilter', { group: OM, one: 'A spatial filter cleans up a laser beam: a lens focuses it through a pinhole that blocks the messy outer light.', how: ['Dust and imperfections add high-angle components to a beam. At the focus of a lens these land away from the centre; a pinhole of the right size passes only the clean Gaussian core, and a second lens re-collimates the beam.'],
  math: [[`${v('D')}<sub>pinhole</sub> ≈ 1.5 × ${fr('4' + v('λ') + v('f'), 'π' + v('D') + '<sub>beam</sub>')}`, 'pinhole about 1.5 times the focused spot diameter']],
  demo: demo(110, 34, a => { a('laser', 16, 17, 0, { lambda: 633 }, 'Laser', [0, 6]); a('spatialfilter', 54, 17, 0, {}, 'Spatial filter', [0, 8]); a('screen', 98, 17, 0, { d: 14 }); }), demoMode: { beamStyle: 'envelope' }, see: ['iris', 'lens'] });

const IM = 'Imaging';
E('raysource', { group: IM, one: 'A ray bundle or object (an arrow) shows how a lens forms an image.', how: ['Rays from each point of the object are traced through the optics. Where they meet again, an image forms. The demo shows an arrow imaged by a lens: object and image distances follow the lens equation, and the image is upside down.'],
  math: [[`${fr('1', v('s') + '<sub>o</sub>')} + ${fr('1', v('s') + '<sub>i</sub>')} = ${fr('1', v('f'))}`, 'lens equation'], [`${v('M')} = −${v('s')}<sub>i</sub>/${v('s')}<sub>o</sub>`, 'magnification']],
  demo: demo(110, 40, a => { a('raysource', 14, 20, 0, { mode: 'arrow', h: 4, rays: 5, fan: 7 }, 'Object', [0, 8]); a('lens', 50, 20, 0, { f: 180, d: 12 }, 'Lens f', [0, 9]); a('screen', 86, 20, 0, { d: 14 }, 'Image', [0, 10]); }), see: ['lens', 'eyepiece'] });
E('eyepiece', { group: IM, one: 'An eyepiece magnifies the intermediate image of a microscope or telescope for the eye.', how: ['The objective forms a real image; the eyepiece acts as a magnifying glass on it. Total microscope magnification = objective × eyepiece.'],
  math: [[`${v('M')}<sub>eye</sub> = ${fr('250 mm', v('f') + '<sub>eye</sub>')}`, 'angular magnification (25 cm = near point of the eye)'], [`${v('M')}<sub>total</sub> = ${v('M')}<sub>obj</sub> × ${v('M')}<sub>eye</sub>`, 'microscope']], see: ['objective', 'raysource'] });
E('cameralens', { group: IM, one: 'A camera lens images a scene onto a camera sensor.', how: ['Photographic and machine-vision lenses are well-corrected multi-element systems with a focus and an aperture. A <b>telecentric</b> lens keeps magnification constant with distance, useful for measurement.'],
  math: [[`${v('N')} = ${v('f')}/${v('D')}`, 'f-number'], [`DOF ≈ 2${v('N')}${v('c')}(${v('M')} + 1)/${v('M')}²`, 'depth of field (c = acceptable blur)']], see: ['camera', 'lens'] });
E('filtercube', { group: IM, one: 'A fluorescence filter cube: excitation filter, dichroic mirror and emission filter in one block.', how: ['In an epifluorescence microscope the excitation filter selects the laser or lamp band, the dichroic reflects it to the sample, and the longer-wavelength fluorescence passes the dichroic and the emission filter to the camera.'],
  math: [[`${v('λ')}<sub>em</sub> > ${v('λ')}<sub>edge</sub> > ${v('λ')}<sub>exc</sub>`, 'Stokes shift: emission at longer wavelength than excitation']], demo: () => RNBX.templates.list.find(t => t.id === 'epifluor') ? RNBX.templates.list.find(t => t.id === 'epifluor').build() : null, see: ['dichroic', 'filter'] });
})();
