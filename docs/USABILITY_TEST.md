# RNBeamX usability test kit

A 30-minute session per person finds most of the problems that code review
cannot. Run it with 3–4 lab members who have **not** used RNBeamX before; five
users typically uncover about 80 % of usability problems.

## Before the session

- One laptop with Chrome or Edge, a mouse, and RNBeamX open on an empty figure
  (File ▸ New figure). Optionally one iPad for task 6.
- Screen recording on (with consent), or a second person taking notes.
- Do **not** demo the tool first. Say: *"We are testing the software, not you.
  Please think aloud. If you get stuck, that is exactly what we need to see."*

## Tasks

Read each task aloud. Do not explain *how*. Note the time, every hesitation,
wrong click, and anything they say.

| # | Task | Success looks like | Time budget |
|---|------|--------------------|-------------|
| 1 | "Draw a 532 nm laser whose beam is turned 90° upward by a mirror and hits a detector." | Laser, mirror at 45°, detector receiving light | 3 min |
| 2 | "Make the mirror send the beam downward instead." | Uses **F** / Flip or rotates the mirror | 1 min |
| 3 | "Put a lens in front of the detector so the beam focuses on it." | Lens on the beam; focus near the detector | 3 min |
| 4 | "Change the laser to 633 nm and label the lens *f = 100 mm*." | Inspector edit; label text | 2 min |
| 5 | "Make it look like a figure for Nature Photonics and export it as a PDF at single-column width." | Style preset / Shaded, preset 89 mm, Export ▸ PDF | 4 min |
| 6 | (iPad) "Zoom in on the mirror and move it slightly." | Pinch-zoom, drag | 2 min |
| 7 | "Start from the Michelson template and make the fringes move." | Template, timeline, keyframe the piezo (or play) | 5 min |
| 8 | "Add your own spectrum as panel b." (give them a CSV) | File ▸ Add data panel, Import CSV | 4 min |
| 9 | "Show the same setup in 3D and tidy the labels." | 3D button, Auto-arrange labels | 3 min |

## Observation sheet (one per participant)

```
Participant:            Role (MSc / PhD / postdoc):       Date:
Prior tools (Illustrator / Inkscape / PowerPoint / other):

Task | Done? (Y / help / N) | Time | Where they hesitated or clicked wrong | Quote
1    |                      |      |                                       |
2    |                      |      |                                       |
…
```

Classify every problem you see:

- **Blocker**: could not finish without help.
- **Major**: finished, but with a long detour or visible frustration.
- **Minor**: small hesitation or cosmetic.

## After the tasks: System Usability Scale (SUS)

Ask each person to rate 1 (strongly disagree) to 5 (strongly agree):

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

Score: for odd items subtract 1, for even items subtract the answer from 5, sum,
multiply by 2.5. Above 68 is above average; above 80 is excellent.

Then ask three open questions:

- What was the most frustrating moment?
- What would you use this for in your own work?
- What is missing before you would make your next paper figure with it?

## Turning findings into fixes

Collect all problems in one table, merge duplicates, and sort by
(number of participants affected × severity). Fix blockers first. Send the
table back and the fixes can be made directly.

## Issues already found in scripted walkthroughs (fixed in this version)

| Finding | Fix |
|---|---|
| On tablets the "Components" button dimmed the canvas although the library was already visible | On wide screens it now shows / hides the docked library; the drawer is only used on phones |
| Clicking several library items stacked them on top of each other | New parts slide along the beam until they clear existing parts |
| A new component's label could land on another part | Each new label is placed automatically; **Shift+L** re-arranges all labels |
| Crowded 3D views had overlapping labels | Auto-arrange works in 3D too, with leader lines when a label must move away |
| No undo or delete on touch devices without a keyboard | Touch toolbar: components, undo, redo, rotate, flip, duplicate, delete, keyframe, play |
