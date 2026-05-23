# AI Transparency Policy

MemProt2D is developed with the assistance of AI tools, including Claude Code (Anthropic). This document describes how AI assistance is used and how it is disclosed.

## Policy

All significant AI-assisted contributions must be disclosed in the pull request description. Commit messages for AI-assisted changes may include a `Co-authored-by: Claude (Anthropic)` trailer.

## Component Status

| Component                             | Status      | Notes                                                                                                |
| ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `src/parser/pdb.ts`                   | AI-assisted | Cα coordinate + chain extraction, including the blank-chain-ID fallback for MemProtMD-stripped PDBs. |
| `src/parser/dssp-mmcif.ts`            | AI-assisted | Loop-block parser for DSSP mmCIF output.                                                             |
| `src/parser/merge.ts`                 | AI-assisted | Combines parsed chains with secondary-structure segments into `ProteinData`.                         |
| `src/renderer/projection.ts`          | AI-assisted | 4×4 matrix transform + drop-y projection; `centeringMatrix` helper.                                  |
| `src/renderer/geometry.ts`            | AI-assisted | Secondary-structure run classifier with missing-density gap detection.                               |
| `src/renderer/svg.ts`                 | AI-assisted | First-pass SVG renderer (membrane slab, oriented helix/strand bars, smoothed coils).                 |
| `src/components/topology-display.ts`  | AI-assisted | Text/accessible summary component.                                                                   |
| `src/components/topology-loader.ts`   | AI-assisted | Network loader binding MemProtMD + PDB-REDO to the renderer and summary.                             |
| `src/components/topology-renderer.ts` | AI-assisted | First-pass `<topology-renderer>` web component (M1).                                                 |

## Disclosure Guidelines

- PR descriptions should state when Claude Code was used to generate or substantially revise code.
- Commit messages may include the trailer `Co-authored-by: Claude (Anthropic)` where appropriate.
- Reviewers should apply the same scrutiny to AI-generated code as to human-written code.
