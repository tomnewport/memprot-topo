# Membrane

`<topology-display>` draws the membrane behind the diagram as a band between
the upper and lower leaflet headgroup surfaces, with a dashed line at the bulk
midplane (z = 0). The band runs past the protein at each end and, from the
outside in, shows:

1. **Bulk**: the far-field leaflet positions, for 10 px at each end.
2. **Annular**: a smooth switch to the leaflet positions next to the protein,
   over the next 10 px.
3. **Local**: a smooth switch, over a further 10 px, to the leaflet heights
   under each residue, when a MemProtMD distortions file gives them. Without
   one the band stays at the annular positions along the protein.

The 10 px widths are in diagram units (SVG px at the drawing's own scale), so
they keep their on-screen size if the Å-to-px scale changes. Every switch is a
smoothstep, and the local heights are averaged along x with a Gaussian
(σ = 12 px), so rises and drops are smooth.

The chain-picker icons and the 3-D view use the bulk positions. In the 2-D →
3-D morph the band's local rises and drops flatten onto the bulk planes during
the first 30 % of the transition.

## Placing the membrane

There are three ways, and they combine: each leaflet position comes from the
attribute if set, otherwise from the distortions file, otherwise from the
default.

| Mode             | How                                                    | Bulk                        | Annular                                 | Local               |
| ---------------- | ------------------------------------------------------ | --------------------------- | --------------------------------------- | ------------------- |
| Default          | nothing                                                | ±20 Å                       | = bulk                                  | none                |
| Explicit         | `membrane-upper`, `membrane-lower` and the annular two | as given                    | as given, else = bulk                   | none                |
| Distortions file | the `distortions` property (or the loader's attribute) | the file's reference planes | mean local height under the TM residues | the file's surfaces |

All positions are in Å from the bulk midplane, positive up.

| Attribute                | Default                 | Meaning                                  |
| ------------------------ | ----------------------- | ---------------------------------------- |
| `membrane-upper`         | 20 (or the file's bulk) | Bulk upper-leaflet headgroup surface (Å) |
| `membrane-lower`         | −20                     | Bulk lower-leaflet headgroup surface (Å) |
| `membrane-annular-upper` | the bulk upper          | Upper leaflet next to the protein (Å)    |
| `membrane-annular-lower` | the bulk lower          | Lower leaflet next to the protein (Å)    |

The default ±20 Å is the phosphate-to-phosphate thickness of a DPPC bilayer:
the five MemProtMD files described below have bulk thicknesses of 39.2–40.5 Å.
It is the headgroup surface, not the hydrophobic boundary (OPM's ±12–15 Å).

The resolved membrane is readable as `element.membrane`
(`{ bulk, annular, surfaces, shift }`).

## Distortions files

MemProtMD analyses how each simulated protein deforms the bilayer and writes the
result as `<pdb>_default_dppc-distortions.pdb`. Give it to the component as
text or parsed:

```js
display.distortions = await (await fetch(url)).text(); // or parseDistortions(text)
```

or let the loader fetch it:

```html
<topology-loader pdb-id="7ahl" distortions="https://…/7ahl_default_dppc-distortions.pdb">
</topology-loader>
```

A file that can't be fetched or parsed is ignored with a console warning; the
structure is still drawn.

A trimmed sample is committed at
[`test/unit/fixtures/7ahl-distortions.pdb`](../test/unit/fixtures/7ahl-distortions.pdb)
(α-hemolysin; every other rim point and the interior on a 4 Å grid).

### Format

An MDAnalysis-written PDB with no protein. Every `ATOM` record is a point on a
leaflet's headgroup surface, on a roughly 1 Å grid in x and y, covering a disc
about 45–75 Å in radius centred on the protein. The surface is continuous across
the protein's footprint, with holes over pore lumens.

| Column             | Meaning                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Residue name `XYd` | X: leaflet, `U` upper or `L` lower. Y: place on the surface mesh, `O` outer rim of the disc, `I` rim of a hole, `M` elsewhere. d (0, 1, 2, 5): not used.                       |
| Atom name          | `S{k}S` / `B{ij}`: appear to be bands of distortion and their boundaries. Not used.                                                                                            |
| Residue number     | A running index. Not used.                                                                                                                                                     |
| x, y, z            | The point, in the simulation-box frame (Å).                                                                                                                                    |
| B-factor           | The leaflet's displacement from a flat bulk reference plane (Å), clamped to ±10. Positive means thicker: z − B on the upper leaflet and z + B on the lower one give the plane. |
| `LCC` / `UCC`      | Three records (`MIN`, `MID`, `MAX`, B = −10, 0, +10) that pin a viewer's colour scale. Skipped.                                                                                |

The meanings of the mesh letters, the atom names and the colour-scale records
were worked out from the files, not from MemProtMD documentation.

### What is read from it

- **Bulk planes**: the median of z − B (upper) and z + B (lower) over points not
  clamped at ±10. If those don't agree on one plane (spread over 0.5 Å, e.g. no
  B-factor column), the median z of the outer rim is used instead.
- **Midplane**: halfway between the bulk planes. Surfaces are stored relative
  to it.
- **Local heights**: under a point (x, y), the weighted mean z of the surface
  points within 3 Å, weight (1 − (d/3)²)²; if there are none, within 6 Å, then
  12 Å (to reach across holes). Each residue is looked up at the xy of its
  smoothed trace.
- **Annular positions**: the mean local height under the residues lying
  between the bulk planes.

### Frames

The file is in the simulation-box frame, which is also the frame of
MemProtMD's own structure files for that simulation: the midplane lies
anywhere from z ≈ 38 to 90 Å. The component checks whether the structure shares
that frame, trying in turn:

1. already centred on the midplane (no shift);
2. in the box frame (shifted by −midplane, so that z = 0 is the bulk midplane).

A placement fits when at least 6 Cα lie within 12 Å of the midplane and their
mean xy is within 8 Å (or 15 % of the disc radius, if larger) of the disc
centre. A structure that fits is moved accordingly and drawn against the
local surfaces. One that fits neither (for example OPM coordinates, which are
centred on the origin and rotated) keeps its coordinates and uses only the
file's bulk positions, with a console warning. The check tells frames apart;
it would not notice an xy offset of a few Å.

### The five sample files

From the full files (z in the box frame, Å):

| PDB  | Midplane | Bulk upper / lower | Points (U / L)  |
| ---- | -------- | ------------------ | --------------- |
| 7AHL | 38.08    | ±19.59             | 15 846 / 5 385  |
| 2J1N | 55.00    | ±19.70             | 10 932 / 10 696 |
| 2OMF | 60.59    | ±20.25             | 12 510 / 12 578 |
| 5G53 | 89.57    | ±20.03             | 7 082 / 8 983   |
| 3K19 | 53.36    | ±20.14             | 11 124 / 10 876 |

7AHL is a single frame; the others average a trajectory. In 7AHL 40 % of the
lower-leaflet points are clamped at −10 Å (displaced more than 10 Å toward
the midplane), and its outer rim is only ~42 Å from the axis on the lower
leaflet, so the rim (±17.5 Å) would understate the bulk; the B-factor
reference planes (±19.6 Å) are used.
