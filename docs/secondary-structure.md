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
  view;
- the chain-picker icons.

On the gallery proteins (3K19, 2OMF, 2J1N, 5G53, 7AHL) raising the default
from 3 to 4 changes no barrel result; it drops one 3-residue helix each from
3K19 and 2J1N.

## DSSP on the drawn structure

`<topology-loader>` draws a MemProtMD simulation's `at.pdb`, which is not the
deposited model: its atoms have moved during the simulation. PDB-REDO's DSSP
describes the deposited model, so its helix ends and strands can
disagree with the coordinates on screen. The loader therefore computes DSSP
itself on `at.pdb`'s backbone ([`src/secondary-structure/`](../src/secondary-structure/)),
and uses PDB-REDO's file only to put the residues back into the deposited
chains and numbering. `ss-source="pdb-redo"` restores the file's assignment.

`computeDssp` follows DSSP 4 (the program PDB-REDO runs): backbone H-bond
energies with the amide H placed from the previous carbonyl, the two best
acceptors per N–H, bridges between residues whose Cα are within 9 Å, ladders
joined across β-bulges, and α, 3₁₀ and π helices with π taking priority over
α. It assigns H, G, I, E and B only; turns, bends and polyproline II, which
are drawn as coil anyway, are left out. `structureSecondaryStructure` turns
the codes into segments as `parseDsspMmcif` does (3₁₀ only with `ss-310`) and
returns the ladders for strand pairing ([beta-barrels.md](beta-barrels.md)).

Validation against PDB-REDO's files:

| Input                                           | Residues with the same code                    |
| ----------------------------------------------- | ---------------------------------------------- |
| OPM coordinates of 3K19, 2OMF, 2J1N, 5G53, 7AHL | 100% (H/G/I/E/B), ladders identical            |
| MemProtMD `at.pdb` of 2J1N, 2OMF, 3K19, 5G53    | 98.9%, 99.9%, 98.3%, 95.4% (helix/strand/coil) |

The differences on `at.pdb` are the simulation's: helix ends that unwind or
extend by a residue or two, and short strands at loop tips. The computation
takes 40–300 ms for these structures.

A Cα-only file has no backbone to compute on: the loader then falls back to
PDB-REDO's assignment, and shows an error if that can't be fetched.
