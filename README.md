# MemProt2D

> A browser-based SVG web component for visualising membrane protein 2D topology

[![Lint](https://github.com/tomnewport/memprot-topo/actions/workflows/lint.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/lint.yml)
[![Test](https://github.com/tomnewport/memprot-topo/actions/workflows/test.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/test.yml)
[![E2E](https://github.com/tomnewport/memprot-topo/actions/workflows/e2e.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/e2e.yml)
[![Release](https://github.com/tomnewport/memprot-topo/actions/workflows/release.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/tomnewport/memprot-topo/branch/main/graph/badge.svg)](https://codecov.io/gh/tomnewport/memprot-topo)
[![npm version](https://img.shields.io/npm/v/memprot2d.svg)](https://www.npmjs.com/package/memprot2d)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://tomnewport.github.io/memprot-topo/)

MemProt2D is a standalone, browser-based SVG web component that renders 2D membrane protein topology diagrams from PDB/mmCIF structure files. It requires no server-side dependencies and produces publication-quality output.

## Quick Start

```bash
git clone https://github.com/tomnewport/memprot-topo.git
cd memprot-topo
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Embed via CDN

Once released, you can embed MemProt2D in any web page with a single script tag:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/memprot2d/dist/memprot2d.js"></script>
```

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md) — how to contribute
- [PROJECT.md](PROJECT.md) — project specification and roadmap
- [docs/architecture.md](docs/architecture.md) — the pipeline from structure file to the 1-D, 2-D and 3-D views, and a module map
- [docs/rendering.md](docs/rendering.md) — how Cα traces are smoothed into helix and strand axes
- [docs/beta-barrels.md](docs/beta-barrels.md) — β-barrel detection and the cylindrical unwrap
- [docs/attributes.md](docs/attributes.md) — every `<topology-display>` attribute, property and event
- [docs/chain-icons.md](docs/chain-icons.md) — chain-picker icons and `chain-icon-bandwidth`
- [docs/sizing.md](docs/sizing.md) — `fit` attribute and the scrolling diagram box
- [docs/selection.md](docs/selection.md) — the `selection` attribute and selection events
- [docs/secondary-structure.md](docs/secondary-structure.md) — `min-helix-length` and `min-strand-length`
- [docs/residue-data.md](docs/residue-data.md) — per-residue colours, widths and the colour legend
- [docs/membrane.md](docs/membrane.md) — membrane leaflet positions and MemProtMD distortions files
- [docs/theming.md](docs/theming.md) — light/dark and custom themes: `theme`, `theme-light`, `theme-dark`, `registerTheme`
- [docs/view-3d.md](docs/view-3d.md) — the 3-D view and the 2-D → 3-D morph
- [docs/sequence-view.md](docs/sequence-view.md) — the 1-D sequence view and the `dimension` attribute
