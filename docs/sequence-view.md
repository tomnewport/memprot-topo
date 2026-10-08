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

Each row is a stretch of the chain. Going from Topology to Sequence every
stretch is pulled taut like a string: its pieces keep their order and blend
their length from the 2-D picture's to one cell per residue, and every bend
along it relaxes by the same fraction, so the zig-zag of helices straightens
into a line rather than residues flying about independently. The stretch's
centre travels from where it sat in the topology to its row. Rows move one
after another, N- to C-terminal (half the transition is stagger). At the ends
every point is exactly where the other view draws it (unit-tested), and the
static 2-D SVG is swapped back in at the topology end.

The membrane slab, residue-number labels and legend fade in near the
topology; letters, row numbers, membrane shading and lanes fade in near the
sequence. Residues the topology leaves out (an assembly barrel's cap) fade
as they shrink into the drawn chain's end.

## Known limitations (prototype)

- No residue selection or hover in the sequence view yet.
- Missing residues show as a dashed stretch one cell per resolved neighbour,
  not as a gap of their real length.
- Residue widths are drawn as a lane, not as cartoon width.
- While rows are mid-flight they overlap; near the topology end the cartoon
  shows faint seams where a helix crosses a row break.
