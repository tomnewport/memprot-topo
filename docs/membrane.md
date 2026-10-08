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

`membrane-detail` (or the `membraneDetail` property) chooses how far down that
list the diagram goes:

| `membrane-detail` | Drawn                                                          |
| ----------------- | -------------------------------------------------------------- |
| `bulk`            | One flat band at the bulk leaflets (annular settings ignored). |
| `annular`         | Bulk at the ends, the annular leaflets along the protein.      |
| `local` (default) | All three, when a distortions file gives local heights.        |

The 3-D view follows the same choice, and `element.membrane` reports the
membrane as drawn. A structure lined up with a distortions file stays lined
up whatever the detail. `<topology-loader>` passes the attribute on.

The 10 px widths are in diagram units (SVG px at the drawing's own scale), so
they keep their on-screen size if the Å-to-px scale changes. Every switch is a
smoothstep, and the local heights are averaged along x with a Gaussian
(σ = 12 px), so rises and drops are smooth.

The chain-picker icons use the bulk positions: their membrane band is centred
on the bulk midplane and is as thick as the bulk bilayer.

In the 2-D → 3-D morph the band's local rises and drops flatten onto the bulk
planes during the first 30 % of the transition. In 3-D each leaflet is a
fishnet over a disc around the protein: it follows the local surface when a
distortions file gives one (averaged over at least 6 Å; pores stay open), and
otherwise holds the annular position next to the protein, easing to the bulk
4–14 Å away. It eases to the bulk at the disc's rim. The translucent leaflet
sheets behind it stay at the bulk planes.

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
| `membrane-detail`        | `local`                 | `bulk`, `annular` or `local` (see above) |

The default ±20 Å is the phosphate-to-phosphate thickness of a DPPC bilayer:
the five MemProtMD files described below have bulk thicknesses of 39.2–40.5 Å.
It is the headgroup surface, not the hydrophobic boundary (OPM's ±12–15 Å).

The membrane as drawn, at `membrane-detail`, is readable as `element.membrane`
(`{ bulk, annular, surfaces, shift }`); at the default `local` detail that is
the membrane resolved as above.

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

## In the demo

The demo's "MemProtMD bilayer distortions" checkbox loads thinned copies of
the five sample files (`demo/distortions/`, made with
`scripts/thin-distortions.mjs`: every second rim point and one interior point
per 2 Å square, about a quarter of the points). The demo's structures are
OPM's, which fit neither frame above. OPM's membrane differs from
MemProtMD's by a shift along the normal and a tilt, which vary by protein:

| PDB  | OPM centre above MemProtMD's midplane | Tilt between normals | Cα RMSD of the superposition |
| ---- | ------------------------------------- | -------------------- | ---------------------------- |
| 7AHL | 11.3 Å                                | 6.6°                 | 0.35 Å (2051 Cα)             |
| 2J1N | 5.3 Å                                 | 1.0°                 | 0.12 Å (1038 Cα)             |
| 2OMF | −11.4 Å                               | 1.1°                 | 0.20 Å (1020 Cα)             |
| 3K19 | 3.1 Å                                 | 1.2°                 | 0.17 Å (1020 Cα)             |
| 5G53 | 0.5 Å                                 | 9.6°                 | 0.36 Å (479 Cα)              |

A radial or z-only correction does not fix that, so each structure is moved
into the simulation's frame by the rigid transform that superposes it on
MemProtMD's own model (`src/demo-distortions.ts`), and then drawn as a
box-frame structure. The structure is moved before the file is set, and moved
back when the box is unchecked. Once moved, every structure passes the frame
check above (shift = −midplane), and in the 2J1N, 2OMF and 3K19 files the
centre of the hole in each leaflet's surface (the trimer's footprint) is within
1.5 Å in xy of the moved protein's Cα centroid.

`scripts/register-memprotmd.ts` finds that transform from the structure and
any MemProtMD PDB of the same simulation: its head-contacts file or the
final-frame `at.pdb` (the two give the same transform). MemProtMD renumbers
residues and may put every chain in one, in another order, so chains are
matched by residue-name sequence and, for identical chains, the assignment
that superposes best is kept. A demo protein without a transform would be left
unchanged, and the demo says so.
