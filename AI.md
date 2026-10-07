# AI Transparency Policy

MemProt2D is developed with the assistance of AI tools, including Claude Code (Anthropic). This document describes how AI assistance is used and how it is disclosed.

## Policy

All significant AI-assisted contributions must be disclosed in the pull request description. Commit messages for AI-assisted changes may include a `Co-authored-by: Claude (Anthropic)` trailer.

## Component Status

| Component                      | Status       | Notes                                                                             |
| ------------------------------ | ------------ | --------------------------------------------------------------------------------- |
| `src/contacts/`                | AI-generated | β-sheet partner detection and β-barrel geometry (n, shear, tilt). Human-reviewed. |
| `src/unroll/barrel.ts`         | AI-generated | Cylindrical unwrap so barrel strands render parallel (issue #12). Human-reviewed. |
| `src/morph/`                   | AI-generated | 2-D → 3-D morph into a Richardson-style diagram (issue #22). Human-reviewed.      |
| `src/components/ss-outline.ts` | AI-generated | Helix/strand outline geometry shared by the 2-D view and the morph.               |

## Disclosure Guidelines

- PR descriptions should state when Claude Code was used to generate or substantially revise code.
- Commit messages may include the trailer `Co-authored-by: Claude (Anthropic)` where appropriate.
- Reviewers should apply the same scrutiny to AI-generated code as to human-written code.
