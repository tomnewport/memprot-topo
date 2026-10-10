# Residue data: colours and widths

`<topology-display>` can draw a data series along the chain (issue #23). Each
residue can get a colour from a category or a number, and a change in drawn
width. The helix/strand fill and the loop line take the residue's colour and
width.

```html
<topology-display colour-label="Conservation"></topology-display>
<script type="module">
  const view = document.querySelector('topology-display');
  view.residueColours = { A: { 45: 0.7, 46: 0.2 } }; // numerical colour scale
  view.residueWidths = { A: { 45: 1.5, 46: 0 } }; // 1.5× width, line only
</script>
```

The [data tracks](data-tracks.md) configuration's `chain` part sets the same
series from a file column, e.g. a PDB file's `tempFactor`.

## Input

Both series are keyed by chain ID, then author residue number (`resSeq`, as in
the PDB file). A residue with an insertion code is keyed by the number and the
code, as a string: `{ H: { 100: 1, "100A": 2 } }` gives residues 100 and 100A
their own values. A bare number only matches the residue without an insertion
code. Codes are case-insensitive (`"100a"` is `100A`).

| Property         | Attribute (JSON)  | Values                                |
| ---------------- | ----------------- | ------------------------------------- |
| `residueColours` | `residue-colours` | category names (strings) or numbers   |
| `residueWidths`  | `residue-widths`  | width factor: 1 normal, 0 a bare line |

Set the property with an object, or the attribute with the same object as
JSON. Changing either redraws the chain but keeps the scroll position and 3-D
view. Residues with no value keep the normal style (helix/strand colour, plain
loop width). Widths are factors of the normal width: 1.5 is half as wide
again, 0 draws the element as a bare line (its outline; a hairline for loops),
and negative values count as 0. To map another quantity, scale it first, e.g.
`2 × contact fraction`. Data for chains other than the one shown is kept, so switching
chain shows that chain's values with the same colour mapping.

## UniProt numbering

Data from UniProt-based sources (variants, conservation, sequence features) is
numbered along the UniProt sequence, which usually differs from the
structure's author numbering. Set `residue-numbering="uniprot"` (or the
`residueNumbering` property) to give `residueColours`, `residueWidths` and
`sequenceTracks` in UniProt numbering:

```html
<topology-display residue-numbering="uniprot"></topology-display>
<script type="module">
  const view = document.querySelector('topology-display');
  view.proteinData = data; // data.pdbId names the PDB entry, e.g. '5g53'
  view.residueColours = { C: { 166: 1 } }; // UniProt 166 is author residue 40 in 5G53
</script>
```

The map comes from PDBe's residue-level SIFTS file for `proteinData.pdbId`
(`https://www.ebi.ac.uk/pdbe/files/sifts/<id>.xml.gz`), fetched once per
entry and shared by every display on the page. Until it arrives no residue
data is drawn, and if it can't be fetched (no network, or a `pdbId` that is
not a PDB ID) none is drawn and a warning is logged, so no value lands on the
wrong residue. Residues with no UniProt counterpart (tags, linkers, residues
not observed) get no value. A chain fused to another protein (e.g. a receptor
with T4 lysozyme or BRIL) is mapped through the UniProt entry covering most of
its residues; the fusion partner has no UniProt numbers.

Chain IDs stay the structure's author chain IDs. The default,
`residue-numbering="author"`, needs no network. `selection` is always in
author numbering. `<topology-loader>` does not offer UniProt numbering, as
MemProtMD renumbers its structures from 1 (#77).

The map is also available on its own: `fetchUniprotNumbering(pdbId)` returns
it per chain (UniProt position → residue key), and `renumberSeries(series,
map)` moves a series into the structure's numbering.

## Colour modes

The mode follows the values. When every value is a number, colours come from a
**numerical colour scale**. Otherwise values are **categories**; a number
mixed in with strings counts as a category name.

| Attribute       | Numerical mode                               | Categorical mode                         |
| --------------- | -------------------------------------------- | ---------------------------------------- |
| `colour-scale`  | colour stops low → high, e.g. `#fff, #c00`   | `key:colour` pairs, e.g. `K:#00f, D:red` |
| `colour-domain` | `min,max` of the scale (default: data range) | not used                                 |
| `colour-label`  | legend title                                 | legend title                             |

Numerical stops must be hex or `rgb()` colours (they are interpolated);
categorical colours can be any CSS colour. Values outside `colour-domain` take
the end colour.

Categories without a colour of their own:

- if every category is a one-letter amino-acid code, they use amino-acid
  colours grouped by chemistry (exported as `AMINO_ACID_COLOURS`);
- otherwise they take the theme palette in sorted order.

## Theme

Until theming (#26) lands, default colours are CSS custom properties read from
the element when it renders, so a page or theme can set them:

| Custom property        | Default           |
| ---------------------- | ----------------- |
| `--mp-data-scale`      | viridis (9 stops) |
| `--mp-data-categories` | Tableau 10        |

```css
topology-display {
  --mp-data-scale: #f7fbff, #08306b;
}
```

## Legend

When the shown chain has colour data, a legend is drawn inside the SVG under
the diagram: a gradient bar with min, mid and max ticks for a numerical scale,
or a swatch per category. It is part of the SVG, so it is kept when the figure
is exported. Width changes have no legend.

## Drawing

- Helices and strands are filled residue by residue: each residue owns the
  stretch of the element from halfway after the previous residue to halfway
  before the next. Widths follow a smooth curve through the residues' values
  (monotone cubic, so it never overshoots between them). A strand arrowhead
  keeps its flare beyond the body, so its direction shows at zero width.
- Loops are smoothed connectors rather than residue-by-residue traces, so
  their residues share the loop's length equally, in sequence order. With
  width data a loop is drawn as a ribbon whose width follows the same kind of
  smooth curve through the residue centres.
- Residues absorbed into a dashed chain-break connector, and neighbouring
  protomers in an assembly barrel, are not styled.
- The 3-D view (`3D` button) does not show residue data yet.
