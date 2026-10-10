# Architecture

How MemProt2D turns a structure file into the 1-D, 2-D and 3-D views: the
pipeline, where each stage lives, and the design decisions behind it. The
detailed notes on individual stages are linked from each section.

## Pipeline

```
PDB (Cα) + DSSP (mmCIF)            MemProtMD distortions file (optional)
        │  parser/                          │  membrane/distortions.ts
        ▼                                   ▼
   ProteinData ──────────────► membrane/model.ts: resolveMembrane → Membrane
        │                                   │
        │  orientation/: pick the transmembrane chain to show
        │  contacts/:    β-sheet pairing, β-barrel analysis
        ▼                                   │
   layout/: layoutChain(chain, options, analysis, membrane) ◄┘
        │    (unroll/ does the arc-length unroll or the barrel unwrap)
        ▼
   ChainLayout  (pure, DOM-free, memoised)
        ├─► components/render-2d.ts: render2d       → 2-D topology SVG
        ├─► layout/scene.ts: build3d → morph/        → 3-D view and 2-D ↔ 3-D morph
        └─► layout/sequence.ts: buildSequence → sequence/ → 1-D view and 1-D ↔ 2-D transition
                                                  theme/ repaints all three in place
```

### 1. Input

- `<topology-loader>` ([`components/topology-loader.ts`](../src/components/topology-loader.ts))
  fetches a MemProtMD simulation's `at.pdb` and PDB-REDO's DSSP for the entry,
  and optionally a distortions file, then hands the result to a
  `<topology-display>`.
- `<topology-display>` ([`components/topology-display.ts`](../src/components/topology-display.ts))
  can also be given `ProteinData` directly (the `protein-data` attribute or
  property). The demo does this with data pre-parsed at build time by
  `scripts/prebuild-demo.ts`.
- [`parser/`](../src/parser/) reads Cα coordinates from PDB files
  (`parsePdb`) and secondary-structure ranges from DSSP mmCIF
  (`parseDsspMmcif`); `mergeProteinData` combines them into the
  `ProteinData` / `ChainData` types in [`src/types.ts`](../src/types.ts).

Coordinates must already be in the membrane frame (z along the bilayer
normal, z = 0 at the midplane), as OPM and MemProtMD files are. Orienting an
arbitrary structure is not implemented.

### 2. Membrane

[`membrane/`](../src/membrane/) resolves the membrane drawn behind the chain:
bulk leaflet positions by default, plus annular and local headgroup surfaces
when a MemProtMD distortions file is given and the structure is in its frame
(`resolveMembrane`, `alignToDistortions`). `membrane-detail` chooses how much
of this is drawn (`membraneAtDetail`). `membrane/profile.ts` turns it into the
2-D membrane band under the laid-out chain. See [membrane.md](membrane.md).

### 3. Chain choice and structure analysis

- [`orientation/`](../src/orientation/) decides which chains cross the
  bilayer; the display shows the largest transmembrane chain unless
  `selection` names another.
- [`contacts/`](../src/contacts/) pairs β-strands from Cα geometry and
  measures β-barrels (strand number, shear, tilt, axis), for single chains and
  for multi-chain assembly barrels. Whether a chain is a closed barrel decides
  how it is unrolled. See [beta-barrels.md](beta-barrels.md).

### 4. Layout

[`layout/`](../src/layout/) is the centre of the pipeline. `layoutChain`
produces a `ChainLayout`: the chain's segments in plot (arc, z) coordinates,
its helix and strand elements, routed loops, residue-number labels, β-sheet
contact ties, the membrane profile and the picture's frame. It is pure (same
inputs, same layout) and touches no DOM, so it can be tested directly
(`test/unit/layout/`).

Geometry comes from [`unroll/`](../src/unroll/):

- **arc-length unroll** (`unrollChain`, helical bundles and anything that is
  not a closed barrel): the smoothed Cα path is projected onto the membrane
  plane and laid out by cumulative arc length against the real z. Helix and
  strand Cα are projected onto their local axis and the trace is fitted with a clamped
  cubic B-spline, so elements are drawn as their axes rather than as the
  periodic backbone. See [rendering.md](rendering.md).
- **cylindrical unwrap** (`unwrapBarrel`, β-barrels; `unwrapAssembly` in
  `layout/segments.ts` for multi-chain barrels such as α-hemolysin's stem): residues are placed by
  angle round the barrel axis, so neighbouring strands are drawn parallel.
  See [beta-barrels.md](beta-barrels.md).

Short helix and strand assignments are dropped first (`min-helix-length`,
`min-strand-length`; see [secondary-structure.md](secondary-structure.md)).

`<topology-display>` memoises layouts per chain for the current data and
membrane, so a change that only restyles the diagram (theme, residue data,
selection) reuses them.

### 5. Views

All three views are SVG and are built from the same `ChainLayout`:

- **2-D topology**: `render2d` ([`components/render-2d.ts`](../src/components/render-2d.ts))
  paints the layout. Helix and strand outlines come from
  [`components/ss-outline.ts`](../src/components/ss-outline.ts), shared with
  the 3-D view so both draw the same shapes. Per-residue colours and widths
  come from [`components/residue-data.ts`](../src/components/residue-data.ts)
  ([residue-data.md](residue-data.md)).
- **3-D view**: `build3d` ([`layout/scene.ts`](../src/layout/scene.ts))
  records the scene the 2-D view draws, with the real 3-D geometry behind it.
  [`view3d/`](../src/view3d/) rolls that scene up into a 3-D Richardson-style
  diagram: `model.ts` puts every sample on a developable "curtain",
  `prims/` builds helices, strands and loops, `membrane-layer.ts` and `net.ts`
  draw the leaflets, and `engine.ts` depth-sorts the primitives and writes
  them as pooled SVG elements each frame. `controller.ts` runs the animation
  and orbit. The 3-D code is loaded with a dynamic `import()` the first time
  it is needed. See [view-3d.md](view-3d.md).
- **1-D sequence view**: `buildSequence` ([`layout/sequence.ts`](../src/layout/sequence.ts))
  gives each residue its position in the 2-D picture; [`sequence/`](../src/sequence/)
  word-wraps the sequence with its secondary-structure cartoon and data lanes,
  and animates the transition between it and the topology. See
  [sequence-view.md](sequence-view.md).

The `dimension` attribute moves between the three (1 → 2 → 3).

### 6. Around the views

- [`theme/`](../src/theme/) holds the colour, line and type tokens. A theme
  change repaints the existing SVG in place (`repaint`) without laying out
  again. See [theming.md](theming.md).
- The rest of [`components/`](../src/components/) is the component chrome:
  the chain picker and its icons (`chain-picker.ts`, `chain-icon.ts`;
  [chain-icons.md](chain-icons.md)), the scrolling diagram box
  (`scroll-box.ts`; [sizing.md](sizing.md)), and the shadow-DOM styles
  (`topology-styles.ts`). Selection is described in
  [selection.md](selection.md).
- [`secondary-structure/`](../src/secondary-structure/) is reserved for
  computing DSSP in the browser on the coordinates actually drawn (#79); it
  has no code yet.

## Module map

| Directory                                                 | Role                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| [`src/parser/`](../src/parser/)                           | PDB Cα and DSSP mmCIF parsing; merge into `ProteinData`.              |
| [`src/numbering/`](../src/numbering/)                     | UniProt → structure residue numbering from SIFTS.                     |
| [`src/membrane/`](../src/membrane/)                       | Leaflet positions, distortions files, the 2-D membrane profile.       |
| [`src/orientation/`](../src/orientation/)                 | Which chains are transmembrane.                                       |
| [`src/contacts/`](../src/contacts/)                       | β-strand pairing and β-barrel geometry.                               |
| [`src/unroll/`](../src/unroll/)                           | Arc-length unroll, barrel unwrap, splines and helix-axis projection.  |
| [`src/layout/`](../src/layout/)                           | `layoutChain` → `ChainLayout`; `build3d` and `buildSequence` from it. |
| [`src/components/`](../src/components/)                   | The web components, the 2-D painter, residue data and chrome.         |
| [`src/view3d/`](../src/view3d/)                           | The 3-D view and the 2-D ↔ 3-D morph, drawn as SVG.                   |
| [`src/sequence/`](../src/sequence/)                       | The 1-D sequence view and the 1-D ↔ 2-D transition.                   |
| [`src/theme/`](../src/theme/)                             | Theme tokens, built-in themes, registry and in-place repaint.         |
| [`src/secondary-structure/`](../src/secondary-structure/) | Reserved for in-browser DSSP (#79).                                   |

Top-level files: [`src/index.ts`](../src/index.ts) is the library entry
(the public exports), [`src/types.ts`](../src/types.ts) the shared
input types, [`src/residue-key.ts`](../src/residue-key.ts) the residue key
(author number plus insertion code) that residue data, loops, contacts and
the sequence view are keyed by, and `src/demo*.ts` the demo page served by
`index.html`. Every public attribute, property and event is listed in
[attributes.md](attributes.md).

## Design decisions

- **One layout, three views.** The 2-D, 3-D and sequence views are all built
  from the pure `ChainLayout`, so they stay in step, the layout can be tested
  without a DOM, and restyling does not re-run it.
- **SVG throughout.** The 3-D view is drawn with a small painter's-algorithm
  engine in SVG rather than WebGL, so every view stays exportable as vector
  graphics.
- **Draw element axes, not backbone periodicity.** Under projection onto the
  membrane plane, helical and pleat oscillation reads as noise, so the trace
  is smoothed to the element axis ([rendering.md](rendering.md)).
- **Barrels are unwrapped, not unrolled.** Arc-length unrolling fans
  antiparallel barrel strands into chevrons; unwrapping by angle keeps them
  parallel ([beta-barrels.md](beta-barrels.md)).
- **No server.** Everything runs in the browser; data comes from MemProtMD and
  PDB-REDO, or from `ProteinData` the page supplies.

## Tests

Unit tests (Vitest, jsdom) live in `test/unit/`, one directory per `src/`
module, with shared structures in `test/unit/fixtures/`. End-to-end tests
(Playwright) are in `test/e2e/`. Example input files (PDB, DSSP and MemProtMD
files) are in `examples/`.
