# AI Transparency Policy

MemProt2D is developed with the assistance of AI tools, including Claude Code (Anthropic). This document describes how AI assistance is used and how it is disclosed.

## Policy

All significant AI-assisted contributions must be disclosed in the pull request description. Commit messages for AI-assisted changes may include a `Co-authored-by: Claude (Anthropic)` trailer.

## Component Status

| Component                            | Status       | Notes                                                                               |
| ------------------------------------ | ------------ | ----------------------------------------------------------------------------------- |
| `src/parser/`                        | AI-generated | PDB Cα and DSSP mmCIF parsers, merged into `ProteinData`.                           |
| `src/orientation/`                   | AI-generated | Transmembrane chain detection and default chain choice.                             |
| `src/unroll/`                        | AI-generated | Arc-length unroll, B-spline fit and helix/strand axis projection (not `barrel.ts`). |
| `src/contacts/`                      | AI-generated | β-sheet partner detection and β-barrel geometry (n, shear, tilt). Human-reviewed.   |
| `src/unroll/barrel.ts`               | AI-generated | Cylindrical unwrap so barrel strands render parallel (issue #12). Human-reviewed.   |
| `src/morph/`                         | AI-generated | 2-D → 3-D morph into a Richardson-style diagram (issue #22). Human-reviewed.        |
| `src/components/ss-outline.ts`       | AI-generated | Helix/strand outline geometry shared by the 2-D view and the morph.                 |
| `src/components/chain-icon.ts`       | AI-generated | Chain-picker icons on a 5 × 6 membrane grid (issue #20).                            |
| `src/components/scroll-box.ts`       | AI-generated | Scrolling diagram box with edge gradients and arrows (issue #21).                   |
| `src/components/residue-data.ts`     | AI-generated | Per-residue colour/width data series and colour legend (issue #23).                 |
| `src/membrane/`                      | AI-generated | Leaflet positions, MemProtMD distortions files, membrane profile (issue #24).       |
| `src/demo-distortions.ts`            | AI-generated | Demo toggle for the sample distortions files, with OPM → MemProtMD registration.    |
| `src/theme/`                         | AI-generated | Themes: tokens, built-in light/dark, registry and in-place repaint (issue #26).     |
| `src/sequence/`                      | AI-generated | 1-D sequence view and its transition to the 2-D topology.                           |
| `src/layout/`                        | AI-generated | Pure chain layout; the 2-D, 3-D and sequence views are built from it (issue #34).   |
| `src/components/render-2d.ts`        | AI-generated | Paints a chain layout as the 2-D topology SVG (issue #34).                          |
| `src/components/topology-display.ts` | AI-generated | The `<topology-display>` web component: attributes, chain choice and the views.     |
| `src/components/topology-loader.ts`  | AI-generated | The `<topology-loader>` web component: fetches MemProtMD and PDB-REDO data.         |
| `src/components/chain-picker.ts`     | AI-generated | Chain-picker labels and markup.                                                     |
| `src/components/topology-styles.ts`  | AI-generated | Shadow-DOM styles of `<topology-display>`.                                          |
| `src/demo-controls.ts`               | AI-generated | Demo-page controls for every `<topology-display>` attribute (issue #15).            |
| `src/residue-key.ts`                 | AI-generated | Residue keys (number plus insertion code) used for residue data (A3).               |
| `src/demo.ts`, `src/demo-data.ts`    | AI-generated | Demo page and its build-time pre-parsed data.                                       |

## Disclosure Guidelines

- PR descriptions should state when Claude Code was used to generate or substantially revise code.
- Commit messages may include the trailer `Co-authored-by: Claude (Anthropic)` where appropriate.
- Reviewers should apply the same scrutiny to AI-generated code as to human-written code.
