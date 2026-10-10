# Attributes, properties and events

The public surface of `<topology-display>` and `<topology-loader>`. Names are
grouped by prefix: `transition-*` for the animation between views,
`structure-*` for the 3-D view, `membrane-*`, `loop-*`, `sequence-*`,
`colour-*` and `theme*`.

**Boolean attributes** are on when present and off when absent or set to
`off`, `false`, `none` or `0` (any case). So `show-contacts` and
`show-contacts="on"` both turn contacts on, and `loop-extremes="off"` turns
off a flag that is on by default.

## `<topology-display>` attributes

| Attribute                                                                                                 | Default     | Meaning                                                                          |
| --------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `protein-data`                                                                                            | none        | Protein data as JSON. The `proteinData` property is the usual route.             |
| `selection`                                                                                               | none        | `A`, `A:45` or `A:45-60`. See [selection.md](selection.md).                      |
| `residue-colours`, `residue-widths`                                                                       | none        | Per-residue values. See [residue-data.md](residue-data.md).                      |
| `tracks`                                                                                                  | none        | Data tracks as JSON. See [data-tracks.md](data-tracks.md).                       |
| `colour-scale`, `colour-domain`, `colour-label`                                                           | data range  | Residue colour scale and legend.                                                 |
| `dimension`                                                                                               | `2`         | `1` sequence, `2` topology, `3` structure; fractions are part-way.               |
| `fit`                                                                                                     | `width`     | `width` or `content`. See [sizing.md](sizing.md).                                |
| `transition-time`                                                                                         | 2500 ms     | Time to animate one whole dimension.                                             |
| `transition-sweep`                                                                                        | `0.35`      | Rolling-wave width of the 2-D → 3-D transition. See [view-3d.md](view-3d.md).    |
| `structure-projection`                                                                                    | `isometric` | `isometric` or `perspective`.                                                    |
| `structure-strand-width`, `structure-strand-thickness`                                                    | 2.85, 1.0 Å | Strand ribbon size in 3-D.                                                       |
| `structure-grid-spacing`                                                                                  | auto        | Membrane grid spacing in 3-D, Å.                                                 |
| `structure-membrane-style`                                                                                | `grid`      | `grid`, `polar` or `surface`.                                                    |
| `membrane-upper`, `membrane-lower`, `membrane-annular-upper`, `membrane-annular-lower`, `membrane-detail` | from data   | See [membrane.md](membrane.md).                                                  |
| `min-helix-length`, `min-strand-length`                                                                   | 4           | See [secondary-structure.md](secondary-structure.md).                            |
| `loop-extremes`                                                                                           | on          | Boolean. Pull loops out to their real vertical extreme.                          |
| `loop-extreme-threshold`                                                                                  | `0.2`       | How far a loop must overshoot to get extreme points.                             |
| `show-contacts`                                                                                           | off         | Boolean. Overlay β-sheet contacts. See [beta-barrels.md](beta-barrels.md).       |
| `sequence-wrap`                                                                                           | auto        | Residues per row in the sequence view.                                           |
| `chain-icon-bandwidth`                                                                                    | `0`         | Smoothing of the chain-picker icons. See [chain-icons.md](chain-icons.md).       |
| `theme`, `theme-light`, `theme-dark`                                                                      | auto        | See [theming.md](theming.md).                                                    |
| `debug`                                                                                                   | none        | Space-separated debug tokens; `loops` draws loop control points. Not stable API. |

## `<topology-loader>` attributes

`pdb-id`, `sim-id` and `distortions` choose what to load. `theme*`,
`membrane-detail`, `transition-*`, `structure-*` and `tracks` are passed through to the
inner `<topology-display>`. The loader also takes the `tracks` property and a
`<script type="application/json" slot="tracks">` child.

## Properties and methods

`proteinData`, `residueColours`, `residueWidths`, `tracks`, `sequenceTracks`,
`distortions`, `membraneDetail`, `selection`, `dimension`, `fullscreen`,
`transitionProgress` (read-only, 0 = 2-D, 1 = 3-D) and
`setTransitionProgress(tau)`, `resetView()`, and the static `registerTheme`.

## Events

`chain-select`, `element-click`, `element-hover`, `dimension-change`,
`theme-change` and `fullscreen-change`.
