# Examples

Sample inputs for MemProt2D that work offline. The demo's E2E tests read them
too (`npm run prebuild:e2e`, then `npm run test:e2e`).

| Files                                                                      | Protein                                                     | What it shows                                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `5g53.pdb`, `5g53.dssp.cif`                                                | 5G53: adenosine A2A receptor with mini-Gs (chains A, C)     | α-helical: seven transmembrane helices; a non-membrane partner chain            |
| `2omf.pdb`, `2omf.dssp.cif`                                                | 2OMF: OmpF porin trimer (chains A–C)                        | β-barrel, with identical copies of a chain                                      |
| `7ahl.pdb`, `7ahl.dssp.cif`                                                | 7AHL: α-hemolysin heptamer (chains A–G)                     | Multi-chain complex: a 14-strand barrel built from seven chains                 |
| `5g53_default_dppc-head-contacts.pdb`, `5g53_default_dppc-distortions.pdb` | 5G53 after coarse-grained self-assembly in DPPC (MemProtMD) | The `<topology-loader>` path: a MemProtMD structure and its bilayer distortions |

Load a structure and its DSSP into a `<topology-display>`:

```ts
import { parsePdb } from './src/parser/pdb.js';
import { parseDsspMmcif } from './src/parser/dssp-mmcif.js';
import { mergeProteinData } from './src/parser/merge.js';

const data = mergeProteinData('5g53', parsePdb(pdbText), parseDsspMmcif(dsspText));
document.querySelector('topology-display').proteinData = data;
```

## Sources

- **`<id>.pdb`**: from [OPM](https://opm.phar.umich.edu/) (`https://opm-assets.storage.googleapis.com/pdb/<id>.pdb`), so the coordinates are already in the membrane frame (bilayer normal along z, midplane at z = 0). Trimmed: OPM's membrane dummy atoms (`DUM`), waters and the `SEQRES`, `SITE`, `HETNAM`, `HETSYN`, `FORMUL`, `LINK`, `SSBOND`, `CONECT` and `MASTER` records are removed. Every other record, including protein atoms, ligands, `HELIX`/`SHEET` and the header, is as downloaded.
- **`<id>.dssp.cif`**: DSSP secondary structure for the deposited entry, from [PDB-REDO](https://pdb-redo.eu/dssp) (`https://pdb-redo.eu/dssp/get?pdb-id=<id>&format=mmcif`). Trimmed to the `_entry`, `_audit_conform`, `_struct_conf_type`, `_struct_conf`, `_struct_sheet`, `_struct_sheet_order`, `_struct_sheet_range` and `_dssp_struct_ladder` categories, which is what `parseDsspMmcif` reads plus the strand ladders. Coordinates and per-residue DSSP summaries are dropped.
- **`5g53_default_dppc-head-contacts.pdb`**: [MemProtMD](https://memprotmd.bioch.ox.ac.uk/) simulation `5g53_default_dppc`, file `structures/group_head.contacts.pdb`, unmodified. Protein only, in the simulation-box frame; the B-factor column is the fraction of frames with a DPPC headgroup contact. MemProtMD renumbers residues from 1, so they do not line up with the DSSP file's author numbering.
- **`5g53_default_dppc-distortions.pdb`**: the MemProtMD bilayer-distortions file for the same simulation, thinned with `scripts/thin-distortions.mjs` (the same file as `demo/distortions/5g53.pdb`). See `docs/membrane.md` for the format.

Each `.pdb` header names the original depositors and publication. Cite OPM (Lomize _et al._, _Nucleic Acids Res._ 2012), PDB-REDO (Joosten _et al._, _IUCrJ_ 2014) and MemProtMD (Newport _et al._, _Nucleic Acids Res._ 2019) when you use these files.
