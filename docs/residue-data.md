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
  view.residueWidths = { A: { 45: 30, 46: -20 } }; // +30 %, −20 % width
</script>
```

## Input

Both series are keyed by chain ID, then author residue number (`resSeq`, as in
the PDB file):

| Property         | Attribute (JSON)  | Values                                    |
| ---------------- | ----------------- | ----------------------------------------- |
| `residueColours` | `residue-colours` | category names (strings) or numbers       |
| `residueWidths`  | `residue-widths`  | percentage width change, floored at −90 % |

Set the property with an object, or the attribute with the same object as
JSON. Residues with no value keep the normal style (helix/strand colour, plain
loop width). Data for chains other than the one shown is kept, so switching
chain shows that chain's values with the same colour mapping.

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
  before the next. Widths are interpolated between residues, so the outline
  stays smooth; strand arrowheads scale with their last residue.
- Loops are smoothed connectors rather than residue-by-residue traces, so
  their residues share the loop's length equally, in sequence order.
- Residues absorbed into a dashed chain-break connector, and neighbouring
  protomers in an assembly barrel, are not styled.
- The 3-D view (`3D` button) does not show residue data yet.
