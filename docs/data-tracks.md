# Data tracks

`<topology-display>` can draw per-residue data from files as tracks in the
1-D sequence view (issue #83): heatmaps, stacked areas, line plots, feature
bars and secondary-structure strips, with labels, legends and axes in the
left gutter. The same data can colour the chain itself in every view.

The configuration has three parts:

- **`sources`**: where data comes from (a PDB file, a CSV file, or values
  given inline). Columns keep the file format's own names: a PDB file's
  `tempFactor`, a CSV file's headers.
- **`series`**: what a column means. `head.tempFactor` is a number per atom;
  the series says it is shown as "Headgroup contacts", reduced to one value
  per residue by its maximum.
- **`tracks`**: how series are drawn, top to bottom.

Because series are named apart from tracks, a page can change which series
a track draws without touching the sources.

```js
display.tracks = {
  sources: {
    md: { type: 'csv', url: '2j1n-by-resid.csv', per: 'residue' },
  },
  series: {
    z: { from: 'md.z', scale: 0.1, unit: 'nm', label: 'Residue' },
  },
  tracks: [
    {
      type: 'heatmap',
      scale: 'plasma',
      series: [
        { ref: 'md.leaflet=flip', label: 'Flip/Flops' },
        'divider',
        { select: 'md', where: { leaflet: ['a', 'b'] }, label: '{leaflet}/{bead}' },
      ],
    },
    { type: 'line', series: ['z'], reference: [{ value: 0, label: 'Centre' }] },
    { type: 'sequence', colour: 'lesk' },
    { type: 'secondary-structure' },
  ],
};
```

The demo page's 2J1N panel uses a fuller configuration
([`src/demo.ts`](../src/demo.ts)).

## Setting it

| Route                                                  | Takes                   |
| ------------------------------------------------------ | ----------------------- |
| `tracks` property                                      | an object, or JSON text |
| `tracks` attribute                                     | JSON text               |
| `<script type="application/json" slot="tracks">` child | JSON text               |

The property beats the attribute, which beats the script child. Setting the
property to `null` goes back to the attribute, or the script. On
`<topology-loader>` all three work the same way and are handed to the inner
display.

A configuration never throws. Anything it can't use (an unknown track type,
a source that fails to load, a series naming a missing column) is left out,
with a `console.warn` starting `topology-display: tracks:`.

## Sources

Each source has a name (no `.`) and a `type`. File sources take `url`
(fetched relative to the page) or `text` (the file's contents).

| `type`   | Fields                                  | Rows                                                       |
| -------- | --------------------------------------- | ---------------------------------------------------------- |
| `pdb`    | `url` or `text`                         | one per ATOM/HETATM record                                 |
| `csv`    | `url` or `text`, `per`, `keys`, `atoms` | one per residue (`per: 'residue'`) or atom (`per: 'atom'`) |
| `values` | `data`: `{chain: {residue: value}}`     | one per residue, in column `value`                         |

- **PDB columns**: `serial`, `name`, `resName`, `x`, `y`, `z`, `occupancy`,
  `tempFactor`, `element`. A blank chain ID is chain `""`.
- **CSV keys**: rows are keyed by the `chainID`, `resSeq` and `iCode`
  columns (MemProtMD's and MDAnalysis' names). `keys` renames them:
  `{chain: 'chain', residue: 'resid'}`. An unnamed first column (a pandas
  index) is dropped. `True`/`False` read as 1/0, empty cells as missing.
- **Per-atom CSV files keyed by atom number** give `keys.serial` (default
  `serial`) and `atoms`, the name of a `pdb` source to look the numbers up
  in.

Two sources are built in:

- **`structure`**: the loaded structure, one row per residue (its Cα):
  `x`, `y`, `z`, `occupancy`, `tempFactor`, `resName` and `ss`
  (`helix`, `strand` or `coil`, as the 2-D view draws it).
- **`membrane`**: `upper` and `lower` (the bulk headgroup planes, Å) and
  `depth` (each residue's height in the 2-D layout, Å).

## Series

A series is one value per residue of the chain on screen. Anywhere a series
is expected, `"<source>.<column>"` reads a per-residue column directly
(split at the first `.`, so `md.leaflet=a;bead=Head` works). Named series
add meaning:

| Field             | Meaning                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `from`            | `"<source>.<column>"`                                              |
| `reduce`          | `max`, `min`, `mean`, `sum` or `ca`. Needed for per-atom sources.  |
| `scale`, `offset` | `value × scale + offset`, after reducing (e.g. Å → nm)             |
| `map`             | `{value: replacement}`, e.g. DSSP codes to `helix`/`strand`/`coil` |
| `label`, `unit`   | shown in the gutter and legend                                     |

```json
"series": {
  "contacts": { "from": "head.tempFactor", "reduce": "max", "label": "Headgroup contacts" }
}
```

### Selections

CSV headers can carry tags, as MemProtMD's do:
`leaflet=a;resname=DPPC;bead=Choline`. A selection expands to one series per
matching column:

| Field    | Meaning                                                     |
| -------- | ----------------------------------------------------------- |
| `select` | a per-residue source                                        |
| `where`  | `{tag: value}` or `{tag: [values]}`; every tag must match   |
| `label`  | a template; `{tag}` is the column's value for that tag      |
| `order`  | values of the tags `where` doesn't fix, in the order wanted |

When several shapes of header match (`leaflet=a` and
`leaflet=a;resname=DPPC;bead=Choline`), only columns with the same tags as
the first match are kept, so aggregates don't mix with their parts. With
`order`, columns sort by the `where` lists first (so `leaflet: ['a', 'b']`
keeps all of leaflet a before b), then by `order`.

A selection can be named under `series` and used by name in a track's list.

## Tracks

Every track takes `label`, `height`, `legend` (default on), `residueAxis`
(a residue-number axis under it) and `views` (only `"1d"` is drawn so far).

| `type`                | Fields                                                                           |
| --------------------- | -------------------------------------------------------------------------------- |
| `heatmap`             | `series` (with `"divider"` lines between groups), `scale`, `domain`, `rowHeight` |
| `area`                | `series`, `domain`, `normalise`, `curve`, `axis`                                 |
| `line`                | `series`, `reference`, `domain`, `curve`, `axis`                                 |
| `features`            | `features: [{chain, from, to, label, colour}]` or `{chain, at}`, or `source`     |
| `secondary-structure` | `series` (the structure's own by default)                                        |
| `sequence`            | `colour`: `lesk`, `chemistry`, `none`, or a series                               |

- **Series entries** are a series name or `{ref, label, colour, side}`.
  `side: 'below'` puts an area layer under the baseline.
- **`heatmap`**: one colour scale for the whole heatmap: `viridis`,
  `plasma`, `data` (the theme's data scale, the default) or a list of
  colours, low → high, over `domain` (the data's range by default).
  Text values are drawn as CSS colours. Rows under 6 px are not labelled.
  A one-row heatmap is labelled with the track's `label`.
- **`area`**: layers stack away from the baseline in list order, each side
  separately. `normalise` scales each residue's layers, both sides together,
  to sum to 1. `curve` is `step` (default) or `smooth`.
- **`line`**: `reference` lines are `{ref, label}` (a series) or
  `{value, label}`, drawn grey and labelled where the row starts. The y-axis
  is rounded to tidy ticks unless `domain` is given.
- **`features`**: overlapping bars go into lanes. A `source` is a CSV keyed
  by chain and residue with optional `to`, `label` and `colour` columns.
- **`secondary-structure`**: without `series` (or with `structure.ss`) it is
  the chain's own cartoon, which is always drawn; listing it only marks
  where it sits among the tracks. With a series (e.g. DSSP from a
  simulation, mapped to `helix`/`strand`/`coil`) it is a separate strip.
- **`sequence`**: the one-letter codes. `lesk` colours them by Lesk's
  groups; a series colours them on the data scale.

### Order

Tracks listed before `sequence` (or before the structure's own
`secondary-structure`) are drawn above the letters and cartoon, the rest
below. With neither listed, every track is above. Listing
`secondary-structure` without `sequence` hides the letters.

## The chain itself

`chain: {colour, width}` names series that style the chain in every view, as
`residueColours` and `residueWidths` do ([residue-data.md](residue-data.md)).
The page's own `residueColours` / `residueWidths` win when set.

```json
"chain": { "colour": "structure.tempFactor" }
```

## Limits

- The core cartoon can't be hidden: it is the chain that morphs into the
  2-D view.
- Tracks are drawn in the 1-D view only; `views: ["2d"]` tracks are skipped.
- The `structure` source has one row per residue (its Cα). Per-atom data
  needs its own `pdb` source.
- MemProtMD `at.pdb` files have blank chain IDs, which the loader can't yet
  match to most structures (#77).
- Gutter label widths are estimated from character counts, so unusual fonts
  can crowd them; long labels wrap at about 24 characters.
