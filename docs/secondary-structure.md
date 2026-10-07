# Minimum helix and strand length

Secondary-structure assignment (HELIX/SHEET records or DSSP) often reports
helices and strands only a few residues long. Drawn as separate elements, they
break a loop into short stubs, so `<topology-display>` treats any helix or
strand shorter than a minimum as coil.

| Attribute           | Default | Meaning                                          |
| ------------------- | ------- | ------------------------------------------------ |
| `min-helix-length`  | 4       | Shortest helix, in residues, drawn as a helix.   |
| `min-strand-length` | 4       | Shortest strand, in residues, drawn as a strand. |

Values are whole residue counts; invalid or negative values fall back to the
default, and `0` or `1` keeps every assignment. Changing either attribute
redraws the chain, keeping the scroll position and 3-D view.

```html
<topology-display min-helix-length="6" min-strand-length="5"></topology-display>
```

## Where the filter applies

The filter runs once on each chain's segments, before anything else reads
them, so every part of the component sees the same elements:

- **β-barrel detection** ([beta-barrels.md](beta-barrels.md)), for single
  chains and multi-chain assembly barrels. A higher `min-strand-length` can
  drop strands from the sheet and so change the strand count, the shear
  number, or whether a barrel is detected at all.
- the 2-D diagram, the helix and strand counts in the chain label, and the 3-D
  morph;
- the chain-picker icons.

On the gallery proteins (3K19, 2OMF, 2J1N, 5G53, 7AHL) raising the default
from 3 to 4 changes no barrel result; it drops one 3-residue helix each from
3K19 and 2J1N.
