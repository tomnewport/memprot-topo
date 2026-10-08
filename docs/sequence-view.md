# Sequence view (1-D)

The view switch puts the three views on one spectrum: **Sequence** (1-D) →
**Topology** (2-D) → **Structure** (3-D). The scrubber runs along the whole
spectrum, and going from Sequence to Structure passes through Topology. The
`view` attribute (`sequence`, `topology`, `structure`; default `topology`)
picks the view from the page.

## Layout

The chain is word-wrapped into rows of whole ten-residue blocks: one-letter
codes on top, the secondary-structure cartoon (the 2-D view's helix bars and
strand arrows, at the same size) below them, and one lane per data series
under that. Residues the 2-D layout puts inside the membrane are shaded.

- `sequence-wrap`: residues per row. Absent (or `auto`) fits as many whole
  blocks as the box is wide, and re-wraps when the box changes width.
- Lanes: `residueColours` gives a colour strip and `residueWidths` a bar lane;
  `sequenceTracks` (a JS property) adds more:

  ```js
  el.sequenceTracks = [
    { label: 'Hydropathy', values: { A: { 45: 1.8, 46: -0.4 } }, type: 'line' },
    { label: 'Contacts', values: { A: { 45: 0.7 } }, colour: '#d62728', domain: [0, 1] },
  ];
  ```

  Values are keyed by chain, then residue number, like the other series.
  `type` is `bar` (default) or `line`; the domain defaults to the data's,
  widened to include 0.

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
- Residue widths are drawn as a lane, not as cartoon width.
- Near the topology end the cartoon shows faint seams where a helix crosses
  a row break.
