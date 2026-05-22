# MemProt2D

> A browser-based SVG web component for visualising membrane protein 2D topology

[![Lint](https://github.com/tomnewport/memprot-topo/actions/workflows/lint.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/lint.yml)
[![Test](https://github.com/tomnewport/memprot-topo/actions/workflows/test.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/test.yml)
[![E2E](https://github.com/tomnewport/memprot-topo/actions/workflows/e2e.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/e2e.yml)
[![Release](https://github.com/tomnewport/memprot-topo/actions/workflows/release.yml/badge.svg)](https://github.com/tomnewport/memprot-topo/actions/workflows/release.yml)
[![codecov](https://codecov.io/gh/tomnewport/memprot-topo/branch/main/graph/badge.svg)](https://codecov.io/gh/tomnewport/memprot-topo)
[![npm version](https://img.shields.io/npm/v/memprot2d.svg)](https://www.npmjs.com/package/memprot2d)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

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
