# MemProt2D — Protein Topology Viewer

_(Working name — a play on MemProtMD. Designed to be easy to rename and rebrand later.)_

A modern, accessible web component for visualising membrane protein secondary structure topology, intended as an open source tool for the structural bioinformatics community.

---

## Vision

A standalone, browser-based SVG web component that renders 2D membrane protein topology diagrams from PDB/mmCIF structure files. No server-side dependencies. Output quality suitable for direct use in publications. Designed to eventually replace the topology viewer in MemProtMD and to be usable as a standalone tool by the wider community.

Target publication: **OUP Bioinformatics Applications Note** (requires live public deployment).

The component is distributed via npm and available via jsDelivr CDN, so any researcher can embed it on a webpage with a single script tag:

```html
<script src="https://cdn.jsdelivr.net/npm/memprot2d/dist/memprot2d.min.js"></script>
<membrane-topology pdb-id="1IWG"></membrane-topology>
```

---

## Modules

Development proceeds in this order. Each module accepts parameters explicitly, with convenience functions to compute those parameters added later.

### M1 — Renderer (`topology-renderer`)

The core web component. Accepts:

- Cα coordinates (from parser)
- Secondary structure annotation: array of `{start, end, type}` where type is `helix | strand | coil`
- Orientation matrix: 4×4 transform into membrane frame (identity by default)
- Membrane bounds: two z-values defining the bilayer slab (initially two straight lines)

Renders a 2D SVG topology diagram with B-spline curves preserving helix tilt and kinks. This is the first thing to build and the primary design problem to solve.

### M2 — PDB/mmCIF Parser

Extracts Cα coordinates, residue index, and chain ID from PDB and mmCIF files in the browser. Uses the **Mol\*** data parsing layer (`mol-io`) as a dependency (Apache 2.0). If Mol\* proves too heavy to import standalone, fall back to `ciftools-js`.

### M3 — Orientation (`orientation`)

Transforms protein coordinates into the membrane frame of reference. Initially accepts a manually specified correction matrix. Later: a convenience function inferring orientation from Cα coordinates or GRO box vectors.

### M4 — Secondary Structure (`secondary-structure`)

Initially accepts DSSP-style annotation as a parameter. Later: a JS/TS implementation of DSSP or Stride — licensing must be verified carefully before implementation.

### M5 — Membrane Surface (`membrane`)

Accepts per-residue or per-position bilayer thickness data (e.g. from MemProtMD simulation output). Renders a variable-thickness membrane rather than a flat slab.

### M6 — Contacts (`contacts`)

Accepts a contact map as a parameter. Highlights close contacts, initially focused on β-barrel strand pairing.

---

## Milestone 0 — Green pipelines, no code

The first thing to get right before any domain code is written. Goal: a GitHub repo with all tooling wired up and all CI pipelines passing on an essentially empty project.

**Deliverables:**

1. GitHub repo created (`memprot2d` or similar)
2. Vite + TypeScript project scaffolded with the agreed directory structure
3. ESLint + Prettier configured and passing
4. Husky + lint-staged pre-commit hooks running locally
5. Commitlint enforcing conventional commit format
6. Vitest configured with V8 coverage — zero tests, 0% coverage, pipeline passes
7. Playwright configured — no tests yet, harness only, pipeline passes
8. GitHub Actions workflows all present and green:
   - `lint.yml` — ESLint + Prettier check
   - `test.yml` — Vitest + coverage report upload
   - `e2e.yml` — Playwright (stub)
   - `gallery.yml` — protein gallery render (stub: produces a placeholder PNG)
   - `release.yml` — semantic-release on merge to `main`
9. README with live CI/coverage badges
10. `CONTRIBUTING.md` stub explaining commit format

**Definition of done:** open a PR with a trivial change (e.g. update README), all workflows run and pass, badges are green, semantic-release is ready to fire on merge to main, and the npm publish step is wired up so that a release to main would push to npm and be immediately available via jsDelivr.

## Milestone 1 — Parser

Verify `mol-io` standalone import feasibility, then implement PDB/mmCIF → Cα coordinate extraction. Green unit tests. No rendering yet.

---

## Tech Stack

| Concern                 | Choice                    | Rationale                                               |
| ----------------------- | ------------------------- | ------------------------------------------------------- |
| Language                | TypeScript                | Type safety, developer tooling, browser-native          |
| Build                   | Vite                      | Zero config, fast, clean single-bundle output           |
| Rendering               | SVG                       | Paper-quality output, exportable, no pixelation         |
| PDB parsing             | Mol\* mol-io (Apache 2.0) | Battle-tested, pure TS, browser-compatible              |
| Unit testing            | Vitest                    | Native Vite integration                                 |
| E2E / visual regression | Playwright                | Render correctness, button tests, screenshot diffs      |
| CI                      | GitHub Actions            | Standard for open source; runs on PR                    |
| Hosting / demo          | GitHub Pages              | Pure client-side, free, stable URL for publication      |
| Licence                 | MIT                       | Simple, permissive, compatible with dependencies        |
| CDN distribution        | jsDelivr + npm            | Automatic CDN from npm publish; single script tag embed |

---

## Non-Functional Requirements

### Testing

- Full unit tests for all complex functions (coordinate transforms, B-spline generation, parser logic)
- E2E tests covering: load structure → correct render, helix angles, membrane placement, UI controls
- Visual regression tests via Playwright screenshots for render correctness
- All tests must pass on PR before merge

### Developer Experience

- Clone → `npm install` → `npm run dev` must work with no additional setup
- `npm test` runs full unit + E2E suite
- Clear contribution guide (`CONTRIBUTING.md`)
- Modular architecture: each module independently testable and replaceable

### Documentation

- Thorough inline TSDoc comments on all public APIs
- `docs/` folder covering architecture, module interfaces, and how to extend
- Example usage with sample data included in the repo

### Accessibility

- ARIA labels on all SVG structural elements
- Text summary of topology for screen readers (e.g. "Chain A: 7 transmembrane alpha helices, N-terminus extracellular")
- Data table fallback representing the same information as the diagram
- Default colour palette: Okabe-Ito colorblind-safe set; no red/green distinctions
- Keyboard navigable controls

### Browser Support

- Modern browsers only: Chrome, Firefox, Safari, Edge — last 2 years of releases
- No IE11, no legacy polyfills

### Output

- SVG serialisation: component exposes a method to export the current diagram as an SVG file suitable for figures and PDF conversion

---

## Repository Structure (proposed)

```
/
├── src/
│   ├── components/        # Web components
│   ├── parser/            # PDB/mmCIF parsing
│   ├── orientation/       # Coordinate transforms
│   ├── secondary-structure/
│   ├── membrane/
│   ├── contacts/
│   └── utils/
├── test/
│   ├── unit/
│   └── e2e/
├── docs/
├── examples/              # Sample PDB/mmCIF files + usage
├── index.html             # Dev/demo page
├── PROJECT.md             # This document
├── CONTRIBUTING.md
└── README.md
```

---

## Rendering Design Notes

### Conceptual framing: an unwrapped Richardson diagram

The visual lineage of this tool runs through Jane Richardson's seminal 1981 paper "The Anatomy and Taxonomy of Protein Structure" (_Advances in Protein Chemistry_ 34: 167–339), which established the conventions still used in every protein structure figure today: helices as cylinders/ribbons, β-strands as directional arrows, loops as smooth coils. The novelty here is _unwrapping_ that 3D representation onto a 2D membrane reference frame while preserving the geometric information (tilt, curvature, kink, loop excursion) that ordinary Richardson diagrams capture but conventional snake-diagram topology viewers discard. Richardson's work should be cited as foundational in the publication.

### Alpha helices

The established approach is a B-spline fit through Cα coordinates projected onto the membrane plane, which naturally captures tilt, kink, and curvature. This is what Ptuba (GPL, Python) and the original MemProtMD viewer both do, and it is the right approach. Helix geometry should always be derived from actual coordinates rather than idealised, since TM helices exhibit complex motions including tilt, bend, torque, and winding that are biologically meaningful.

### Beta barrels

Two representation strategies, both worth supporting:

**Unrolled/linear layout** — the conventional approach. The barrel is cut along one strand edge and laid flat, with strands as vertical bars alternating up/down across the membrane slab. Geometrically lossy but familiar and comparable to existing published figures. This should be the default.

**Cylindrical projection** — geometrically honest. Strands are rendered on a cylinder surface and projected, preserving the curvature of the barrel. Note that β-strands in transmembrane barrels are tilted at ~37° to the membrane normal, which the projection should reflect. No existing tool does this for 2D publication figures — it is a potential novel contribution of this project.

The toggle between both modes is itself a publication-worthy feature.

### Loops

Loop representation is an unsolved problem in the field — existing tools (Protter, TMRPres2D etc.) use uniform bezier arcs scaled to residue count with no geometric information. Three tiers, to be implemented progressively:

**Tier 1 (v1) — Schematic:** bezier arc whose height above/below the membrane slab is scaled by the z-displacement of the loop's highest/lowest Cα from the membrane surface. This is what MemProtMD did and is already more informative than most tools.

**Tier 2 — Projected path:** spline through the actual projected Cα coordinates of the loop. Captures re-entrant loops (which dip back into the membrane — biologically important, completely invisible in current tools), and structured extracellular loops in beta barrels whose path carries meaningful information.

**Tier 3 — Annotated:** highlight secondary structure elements within loops — β-turns, 3₁₀ helices, structured hairpins. Requires secondary structure assignment (M4).

### General principle

The secondary structure elements relative to the membrane plane are the primary information to get right. Loops are secondary but worth doing properly in later iterations, particularly re-entrant loops and the long structured extracellular loops of beta barrels.

## Ecosystem Landscape

### Tools to compare against in the paper

| Tool                          | Approach                                        | Limitations vs this project                                                                            |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **Protter** (2013)            | Sequence → predicted topology → snake diagram   | No 3D coordinate input, no helix geometry or tilt, no membrane thickness, server-dependent             |
| **MembraneFold** (2022)       | AlphaFold structure + DeepTMHMM prediction      | Prediction-driven not structure-driven, not embeddable                                                 |
| **TMVisDB** (2025)            | AlphaFold + TMbed, database-oriented            | Not a standalone embeddable component                                                                  |
| **PDBe topology viewer**      | 3D coordinates → 2D secondary structure diagram | Not membrane-aware, no helix tilt, no bilayer context, effectively inactive (~2 downloads/week on npm) |
| **MemProtMD topology viewer** | MD simulation data → 2D topology with membrane  | The direct predecessor; old tech, not a reusable component                                             |

### Compatibility target: Mol\*

Mol\* is the dominant structural biology web viewer — it is the default 3D viewer at both RCSB PDB and PDBe/EMBL-EBI, actively developed, and has become the platform on which third-party tools are built.

Two specific Mol\* ecosystem components are relevant:

**MolViewSpec** — a standardised, declarative approach for defining molecular visualisation scenes, decoupled from rendering. Designing this tool's data interfaces to be MolViewSpec-compatible would allow the 2D topology view to function as a complementary panel alongside Mol\*'s 3D viewer, e.g. within RCSB or PDBe workflows.

**pdbe-molstar** — the Mol\* implementation used by PDBe, AlphaFold DB and PDBe-KB, available as a JS web component with attribute-based customisation. A natural integration point.

**Design implication:** the component's data interfaces should be designed so that Mol\*-derived coordinate and annotation data is a natural input path — even if v1 just accepts raw arrays. This positions the tool as a complementary 2D membrane topology panel to Mol\*'s 3D view, which is both a strong adoption story and a good framing for the paper.

### Code quality and formatting

- **ESLint** with TypeScript rules (`@typescript-eslint`) — linting enforced in CI, blocks merge on errors
- **Prettier** — auto-formatter for TypeScript, JSON, Markdown. Formatting checked in CI; developers can run `npm run format` locally to auto-fix. No manual formatting debates.
- Both run as pre-commit hooks via **Husky** + **lint-staged** so formatting issues are caught before they hit CI
- TypeScript strict mode enabled (`strict: true` in `tsconfig.json`)

### Test coverage

- Vitest configured with V8 coverage provider
- Coverage reports generated on every CI run (HTML + lcov)
- **Coverage badges** in README via shields.io or a coverage service (Codecov or Coveralls)
- Branch coverage tracked — target to be set once initial modules are in place, but aiming for meaningful coverage on all geometry/maths functions
- Standard GitHub badges in README: CI status, coverage, npm version, license

### Releases and versioning

- **Conventional Commits** enforced — commit messages must follow `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:` etc. format
- **Commitlint** + Husky pre-commit hook enforces this locally
- **semantic-release** configured to run on merge to `main` — automatically determines version bump (major/minor/patch) from commit history, creates GitHub release, tags, and generates CHANGELOG.md
- Release job runs after CI passes on `main`; no manual version bumping

### Onboarding documentation

- `README.md` — quick start (clone → install → dev → test in under 5 minutes), badges, brief description, link to full docs
- `CONTRIBUTING.md` — branch strategy, commit message format with examples, how to run tests, how to run the protein gallery locally, PR checklist
- `docs/architecture.md` — module map, data flow, key design decisions (links back to this PROJECT.md)
- `docs/rendering.md` — the rendering design rationale (Richardson lineage, B-spline approach, barrel projection options) for scientific contributors who may not be developers
- All docs written to be readable by a structural biologist who has never contributed to an open source project before

## AI Transparency

This project is developed with significant AI assistance (primarily Claude, Anthropic) and is transparent about that. This is both an ethical position and a practical one — AI-assisted development is increasingly normal in open source, and being open about it is more useful to the community than obscuring it.

### In the repository

- `AI.md` in the repo root — a living document noting which parts of the codebase were AI-generated, AI-assisted, or human-written. Updated as part of the PR process.
- PR descriptions should note where Claude Code was used to generate or substantially assist with the code in that PR.
- Commit messages may include a `co-authored-by: Claude (Anthropic)` trailer where appropriate.

### In the publication

- The Applications Note will include a transparent statement in the methods or acknowledgements section disclosing AI assistance in code generation and project planning.
- This is consistent with emerging journal policies (OUP Bioinformatics included) which require disclosure of AI tool use rather than prohibiting it.

### What this does not mean

- All code is reviewed and understood by a human contributor before merge. AI-generated code is not merged blindly.
- Scientific and design decisions are human-led. AI assists implementation and surfaces options; it does not set the research direction.

## Ways of Working

### Repository and project management

- Hosted on GitHub. Backlog managed as GitHub Issues — one issue per feature, bug, or design question.
- Pull requests are the unit of review, both technical and scientific. PRs should be small and focused enough that a non-developer scientist can understand what changed.

### CI pipeline

- Every PR triggers the full test suite (unit + E2E).
- CI also renders a **standard protein gallery** — a fixed library of reference proteins (at minimum: A2A adenosine receptor, OmpF, CFTR, alpha-hemolysin) rendered as SVG/PNG images and attached to the PR as build artefacts.
- This allows non-technical scientific reviewers to comment directly on visual quality, anatomical accuracy, and readability without needing to run the code. Rendering regressions become visible immediately.
- The gallery images should also be linkable from relevant backlog issues, so design discussions can reference concrete visual examples.

### Claude Code integration

- Claude Code to assist with implementation, particularly for complex geometry and test scaffolding.
- Longer term: explore having Claude Code propose PRs in response to open issues. Not committed to this yet — evaluate once the project is running and the issue structure is established.
- Claude Code will need GitHub credentials at that point. To be set up when development starts.

### Branch strategy

- `main` is always deployable to GitHub Pages (public demo).
- Feature branches per issue, merged via PR with at least one review.
- CI must pass before merge.

## Publication Plan

**Target:** OUP Bioinformatics Applications Note (~1300 words)

Requirements to hit before submission:

- Live public deployment on GitHub Pages
- Comparison to existing tools: original MemProtMD topology viewer, Protter, TMRWeb, TOPO2
- Demonstrated use on at least one well-characterised membrane protein (A2A adenosine receptor is the natural candidate given MemProtMD history)

Consider involving Sansom / Stansfeld groups as co-authors given prior MemProtMD work.

---

## Open Questions

### Resolved

- **Project name** — MemProt2D (working name, deliberately easy to rename; codebase should avoid hard-coding the name in user-facing strings, package metadata, or repo references where possible)
- **Multi-chain rendering** — v1 renders a single selected chain. Show neighbouring chains' secondary structure elements _only where they are in close contact_ with the focal chain, faded/desaturated. Other chains hidden.
- **Coordinate input** — Cα only. Sufficient for the geometric problems we care about.
- **Membrane plane** — treat as bulk. Thickness can vary across the protein (M5), but orientation is uniform. No per-residue membrane normal.
- **Cylindrical projection for barrels** — prototype it, then take it to scientists for feedback before committing to it as a flagship feature.
- **Re-entrant loops** — out of scope for now. Revisit later.
- **Co-authorship** — approach Phil Stansfeld. Mark Sansom is retired but Phil may want to involve him.
- **Demo proteins** — A2A adenosine receptor (helical, MemProtMD continuity); OmpF (canonical β-barrel); plus CFTR and alpha-hemolysin as more interesting cases (membrane-deforming, flippase activity).
- **Benchmarking approach** — side-by-side rendering of the same protein in MemProt2D vs Protter vs PDBe topology viewer vs original MemProtMD viewer. Not aiming to replicate them — aiming to improve on them.
- **Accessibility** — iterative, work on it as we go. Screen reader format and data table fallback are low priority for v1.

### Still open

#### Technical / dependencies

- **Mol\* `mol-io` standalone import** — can it be pulled in without the full 3D renderer? If not, fall back to `ciftools-js` or write a minimal parser. To be verified in Claude Code.
- **DSSP licensing** — DSSP itself is now BSD-2-Clause, but most JS ports are unmaintained. Is a clean-room reimplementation in TS feasible? Note: user has stated server-side dependencies are undesirable, so a server-side DSSP fallback is unlikely to be acceptable.
- **Stride as alternative** — Stride has more permissive licensing in some forks. Worth comparing for browser implementation feasibility.

#### Implementation specifics requiring prototyping

- **Cylindrical barrel projection** — visual readability at publication scale. To be prototyped and shown to scientists.
- **Adjacent-chain fade rendering** — distance threshold for "close contact" (e.g. any Cα within 6Å? 8Å?), and the visual treatment (opacity? grayscale? thin outline only?). Worth exploring during M1.

#### Publication

- **Comparison figure** — which exact proteins to render across all four tools for the side-by-side?
