# Sequence view (1-D)

The view switch puts the three views on one scale: **1D** (sequence) →
**2D** (topology) → **3D** (structure). Going from 1D to 3D passes through 2D.

- `dimension` (attribute and property): `1`, `2` (default) or `3`, or
  anything in between: `1.3` is 30% of the way from the sequence to the
  topology. Setting it animates there from wherever the view is. Reading the
  property gives the live value, mid-animation included, and every change
  fires a `dimension-change` event (`detail.dimension`), so a page can drive
  its own slider.
- `transition-time`: milliseconds to move one whole dimension (default 2500;
  going from 1 to 3 takes twice that). `0` jumps straight there. With
  `prefers-reduced-motion: reduce` the view always jumps.
- The 1D / 2D / 3D buttons set `dimension`.

## Layout

The chain is word-wrapped into rows of whole ten-residue blocks: one-letter
codes on top, the secondary-structure cartoon (the 2-D view's helix bars and
strand arrows, at the same size) below them, and one lane per data series
under that. Residues the 2-D layout puts inside the membrane are shaded.

- `sequence-wrap`: residues per row. Absent (or `auto`) fits as many whole
  blocks as the box is wide, and re-wraps when the box changes width.
- Data lanes are colour strips: `residueColours` gives one, and
  `sequenceTracks` (a JS property) adds more:

  ```js
  el.sequenceTracks = [
    { label: 'Hydropathy', values: { A: { 45: 1.8, 46: -0.4 } }, domain: [-3, 3] },
    { label: 'Contacts', values: { A: { 45: 0.7 } }, scale: ['#ffffff', '#d62728'] },
  ];
  ```

  Values are keyed by chain, then residue number (with the insertion code
  where there is one, e.g. `"100A"`), like the other series.
  Numbers are coloured on `scale` (the theme's data scale by default) over
  `domain` (the data's range by default); strings are taken as CSS colours.
  `residueWidths` is not shown in the sequence view.

- `sequenceTracks` only draws colour strips. The `tracks` configuration
  ([data-tracks.md](data-tracks.md)) supersedes it, reading data from PDB and
  CSV files and drawing heatmaps, stacked areas, line plots and feature
  bars above or below the letters.

One-letter codes come from the residue names in the structure file
(`Calpha.resName`); residues without one show as `X`.

## Transition

Sequence → Topology runs in two stages (reversed on the way back):

1. **Unwrap.** The rows snake together into one line, first row first: the
   first row stays where it is and shrinks along x, and each following row
   rises to join the end of the one before, so the whole chain ends up on one
   line that fits the box (or the membrane slab, where that is on screen).
   While they move, a faint curve joins each row's end to the next row's
   start. Letters, row numbers, membrane shading and lanes fade out.
2. **Fold.** A wave runs from the left-most residue to the right; as it
   passes, each part of the line rises into its place in the topology, and the
   membrane slab is revealed behind it. Residue-number labels and the legend
   fade in at the end.

At the ends every point is exactly where the other view draws it, and at the
end of the unwrap every point is on the line in sequence order (all
unit-tested). The static 2-D SVG is swapped back in at the topology end.
Residues the topology leaves out (an assembly barrel's cap) fade as they
shrink into the drawn chain's end.

## Known limitations (prototype)

- No residue selection or hover in the sequence view yet.
- Missing residues show as a dashed stretch one cell per resolved neighbour,
  not as a gap of their real length.
- Near the topology end the cartoon shows faint seams where a helix crosses
  a row break.
