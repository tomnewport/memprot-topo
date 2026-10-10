# AI Transparency Policy

MemProt2D is developed with the assistance of AI tools, including Claude Code (Anthropic). This document describes how AI assistance is used and how it is disclosed.

## Policy

All significant AI-assisted contributions must be disclosed in the pull request description. Commit messages for AI-assisted changes may include a `Co-authored-by: Claude (Anthropic)` trailer.

## Component Status

| Component                        | Status       | Notes                                                                             |
| -------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `src/contacts/`                  | AI-generated | β-sheet partner detection and β-barrel geometry (n, shear, tilt). Human-reviewed. |
| `src/unroll/barrel.ts`           | AI-generated | Cylindrical unwrap so barrel strands render parallel (issue #12). Human-reviewed. |
| `src/morph/`                     | AI-generated | 2-D → 3-D morph into a Richardson-style diagram (issue #22). Human-reviewed.      |
| `src/components/ss-outline.ts`   | AI-generated | Helix/strand outline geometry shared by the 2-D view and the morph.               |
| `src/components/chain-icon.ts`   | AI-generated | Chain-picker icons on a 5 × 6 membrane grid (issue #20).                          |
| `src/components/scroll-box.ts`   | AI-generated | Scrolling diagram box with edge gradients and arrows (issue #21).                 |
| `src/components/residue-data.ts` | AI-generated | Per-residue colour/width data series and colour legend (issue #23).               |
| `src/membrane/`                  | AI-generated | Leaflet positions, MemProtMD distortions files, membrane profile (issue #24).     |
| `src/demo-distortions.ts`        | AI-generated | Demo toggle for the sample distortions files, with OPM → MemProtMD registration.  |
| `src/theme/`                     | AI-generated | Themes: tokens, built-in light/dark, registry and in-place repaint (issue #26).   |
| `src/sequence/`                  | AI-generated | 1-D sequence view and its transition to the 2-D topology.                         |
| `src/layout/`                    | AI-generated | Pure chain layout; the 2-D, 3-D and sequence views are built from it (issue #34). |
| `src/components/render-2d.ts`    | AI-generated | Paints a chain layout as the 2-D topology SVG (issue #34).                        |

## Disclosure Guidelines

- PR descriptions should state when Claude Code was used to generate or substantially revise code.
- Commit messages may include the trailer `Co-authored-by: Claude (Anthropic)` where appropriate.
- Reviewers should apply the same scrutiny to AI-generated code as to human-written code.
