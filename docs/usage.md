# Usage

How to put a MemProt2D diagram in a web page. This page covers installing,
the two elements, the data format and the events. Every attribute, with its
default, is in [attributes.md](attributes.md); each feature has its own page,
listed at the end.

## Quickstart

### Script tag

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/memprot2d/dist/memprot2d.js"></script>

<topology-loader pdb-id="5g53"></topology-loader>
```

The CDN URL works once the package is published to npm (from 0.1.0). Until
then, build it yourself with `npm run build` and serve `dist/`.

### npm

```bash
npm install memprot2d
```

```ts
import 'memprot2d'; // defines <topology-display> and <topology-loader>
```

Importing the package defines both custom elements; nothing else needs
calling. The package has no runtime dependencies and ships ES and CommonJS
builds with type declarations (`dist/types/index.d.ts`). The 3-D view's code
is a separate chunk, loaded the first time the 3-D view is shown.

## The two elements

### `<topology-loader>`: from a PDB ID

```html
<topology-loader
  pdb-id="5g53"
  distortions="/data/5g53_default_dppc-distortions.pdb"
  membrane-detail="annular"
  theme="dark"
></topology-loader>
```

| Attribute     | Meaning                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------- |
| `pdb-id`      | PDB entry. Required; nothing loads without it.                                                             |
| `sim-id`      | MemProtMD simulation ID. Default `<pdb-id>_default_dppc`.                                                  |
| `distortions` | URL of a MemProtMD bilayer-distortions file. Optional; if it fails to load, the default membrane is drawn. |
| `ss-310`      | `helix` draws DSSP's 3₁₀ helices as helices. By default they are coil, as are polyproline II stretches.    |
| `ss-source`   | `pdb-redo` draws PDB-REDO's DSSP for the deposited entry. By default DSSP is computed on `at.pdb` itself.  |

The loader fetches the simulation's `at.pdb` from
`memprotmd.bioch.ox.ac.uk` and the entry's DSSP from `pdb-redo.eu`. The
helices, strands and β-ladders are computed with DSSP on the simulated
structure's own backbone (see
[secondary-structure.md](secondary-structure.md#dssp-on-the-drawn-structure)),
so they match the coordinates drawn; PDB-REDO's file is used for the deposited
chains and numbering, and for the secondary structure only with
`ss-source="pdb-redo"` or when `at.pdb` has no full backbone. If PDB-REDO
can't be reached, the structure is still drawn, in MemProtMD's numbering, with
a console warning; with `ss-source="pdb-redo"` or a Cα-only file that is an
error. While loading it shows "Loading …"; on failure it shows the error.
Changing `pdb-id`, `sim-id`, `distortions`, `ss-310` or `ss-source` reloads.

MemProtMD renumbers residues from 1 and writes every protomer on one chain,
often with a blank chain ID. The loader matches the residues against the
deposited entry's (from the DSSP file's per-residue records), so the drawing
has the deposited chains and author numbering, and each copy of a chain in the
simulated assembly gets the next chain ID the entry doesn't use (2OMF's trimer
is drawn as chains A–C, each numbered as chain A). If the residues don't match,
the structure is drawn as MemProtMD numbered it, with a console warning. The
structure is centred on the bilayer simulated with it, read from the lipids in
`at.pdb` (see [membrane.md](membrane.md#the-structure-files-own-membrane)), so
no distortions file is needed to place it.

`theme`, `theme-light`, `theme-dark`, `membrane-detail`, `transition-time`,
`transition-sweep` and the `structure-*` attributes are passed through to the
`<topology-display>` it creates. Other display attributes are not; to use
them, or to listen for events with typed details, reach the inner element:
`loader.shadowRoot.querySelector('topology-display')`. Events bubble out of
the loader's shadow root, so a listener on the loader also hears them.

### `<topology-display>`: from your own data

```html
<topology-display selection="A" dimension="2"></topology-display>

<script type="module">
  import { parsePdb, parseDsspMmcif, parseDsspLadders, mergeProteinData } from 'memprot2d';

  const [pdb, dssp] = await Promise.all([
    fetch('/data/5g53.pdb').then((r) => r.text()),
    fetch('/data/5g53.dssp.cif').then((r) => r.text()),
  ]);
  const view = document.querySelector('topology-display');
  view.proteinData = mergeProteinData(
    '5g53',
    parsePdb(pdb),
    parseDsspMmcif(dssp),
    parseDsspLadders(dssp),
  );
</script>
```

[`examples/`](../examples/) has structure and DSSP files that work offline.

**Coordinates must already be in the membrane frame**: z along the bilayer
normal, z = 0 at the midplane. OPM and MemProtMD files are; an arbitrary PDB
entry is not, and orienting one is not implemented.

The display shows the largest transmembrane chain, unless `selection` names
another. The chain picker switches chains.

## `proteinData`

`proteinData` (or the `protein-data` attribute, as JSON) is a `ProteinData`
object. The types are exported from the package.

```ts
interface ProteinData {
  pdbId: string;
  chains: ChainData[];
}

interface ChainData {
  chainId: string; // author chain ID
  residueCount: number; // residues with a Cα
  segments: SecondaryStructureSegment[];
  calphas: Calpha[]; // in chain order
  ladders?: BetaLadder[]; // DSSP's β-ladders touching this chain
}

interface SecondaryStructureSegment {
  start: number; // author residue number (resSeq), inclusive
  end: number; // inclusive
  type: 'helix' | 'strand' | 'coil';
}

interface Calpha {
  resSeq: number; // author residue number
  iCode: string; // insertion code, '' if none
  resName?: string; // e.g. 'ALA'
  x: number; // Å, membrane frame
  y: number;
  z: number; // Å along the bilayer normal, 0 at the midplane
}
```

Residue numbers in `segments`, `calphas`, `selection`, `residueColours` and
the event details are all author numbering, as in the PDB file.
`parseDsspMmcif` reads the `auth_*` columns so that it matches `parsePdb`.
It keeps DSSP's α and π helices and its strands; 3₁₀ helices only with
`parseDsspMmcif(text, { helix310: true })`, and polyproline II never.
`parseDsspLadders` reads DSSP's β-ladders (`_dssp_struct_ladder`), the
hydrogen-bonded strand pairs; with them, strands are paired from DSSP rather
than from Cα spacing ([beta-barrels.md](beta-barrels.md)). They are optional.

Re-assigning the same object is a no-op; assign a new object to redraw.

## Properties and methods

| Name                                                                    | Type                                    | Meaning                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `proteinData`                                                           | `ProteinData \| null`                   | The protein. See above.                                                                                                                                                                                                                                                                                                                        |
| `residueColours`, `residueWidths`                                       | `{ [chainId]: { [resSeq]: value } }`    | Per-residue data. See [residue-data.md](residue-data.md).                                                                                                                                                                                                                                                                                      |
| `sequenceTracks`                                                        | `SequenceTrack[]`                       | Extra colour strips in the sequence view. See [sequence-view.md](sequence-view.md).                                                                                                                                                                                                                                                            |
| `distortions`                                                           | `MembraneDistortions \| string \| null` | A MemProtMD distortions file, as text or parsed. See [membrane.md](membrane.md).                                                                                                                                                                                                                                                               |
| `membraneDetail`                                                        | `'bulk' \| 'annular' \| 'local'`        | Mirrors `membrane-detail`.                                                                                                                                                                                                                                                                                                                     |
| `membrane`                                                              | `Membrane \| null`, read-only           | The membrane as drawn: leaflet positions (Å), any local surfaces, the z shift applied. See [membrane.md](membrane.md).                                                                                                                                                                                                                         |
| `selection`                                                             | `TopologySelection \| string \| null`   | Mirrors `selection`. Reads back resolved: a whole chain gives its residue bounds. See [selection.md](selection.md).                                                                                                                                                                                                                            |
| `dimension`                                                             | `number`                                | 1 sequence, 2 topology, 3 structure. Reads the live value mid-animation; setting it animates there.                                                                                                                                                                                                                                            |
| `transitionProgress`                                                    | `number`, read-only                     | 2-D ↔ 3-D progress: 0 is 2-D, 1 is 3-D.                                                                                                                                                                                                                                                                                                        |
| `setTransitionProgress(tau)`                                            | `Promise<void>`                         | Jump the 2-D ↔ 3-D morph to `tau` without animating.                                                                                                                                                                                                                                                                                           |
| `fullscreen`                                                            | `boolean`, read-only                    | Whether the element is full screen.                                                                                                                                                                                                                                                                                                            |
| `requestFullscreenView()`, `exitFullscreenView()`, `toggleFullscreen()` | `Promise<void>`                         | Enter or leave full screen.                                                                                                                                                                                                                                                                                                                    |
| `exportSvg({ dimension?, theme?, chainIcons?, background? })`           | `string \| null`                        | The 1-D sequence or 2-D topology as a standalone SVG file's text, drawn in any registered theme; the view bar's SVG button does the same. `dimension` defaults to the 1-D or 2-D view nearest the one shown, `theme` to the one in use, `chainIcons` to whether the chain picker is shown, `background` to true. The 3-D view is not exported. |
| `resetView()`                                                           | `void`                                  | Undo the user's changes: back to 2-D on the default chain, dropping their chain pick, selection and 3-D orbit. Attributes the page set are kept.                                                                                                                                                                                               |
| `activeThemeName`, `activeTheme`                                        | read-only                               | The theme in use. See [theming.md](theming.md).                                                                                                                                                                                                                                                                                                |
| `TopologyDisplay.registerTheme(name, theme)`                            | static                                  | Add or replace a named theme. See [theming.md](theming.md).                                                                                                                                                                                                                                                                                    |

## Events

All events are `CustomEvent`s that bubble and cross shadow roots
(`composed`). `TopologyDisplayEventMap` gives their detail types.

| Event               | `detail`                                             | When                                                                                      |
| ------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `chain-select`      | `{ chainId, start, end }`                            | A chain is picked in the chain picker.                                                    |
| `element-click`     | `{ chainId, start, end, type: 'helix' \| 'strand' }` | A helix or strand is clicked, or activated with Enter or Space. It becomes the selection. |
| `element-hover`     | the same, or `null` when the pointer leaves          | The pointer or keyboard focus moves onto or off a helix or strand.                        |
| `dimension-change`  | `{ dimension }`                                      | The view's dimension changes. See [sequence-view.md](sequence-view.md).                   |
| `theme-change`      | `{ name }`                                           | The theme in use changes.                                                                 |
| `fullscreen-change` | `{ fullscreen }`                                     | The element enters or leaves full screen.                                                 |

```js
view.addEventListener('element-click', (e) => {
  const { chainId, start, end, type } = e.detail;
  console.log(`${type} ${chainId}:${start}-${end}`);
});
```

## Attributes

[attributes.md](attributes.md) lists every `<topology-display>` attribute
with its default. Boolean attributes are on when present and off when absent
or set to `off`, `false`, `none` or `0`.

The [live demo](https://tomnewport.github.io/memprot-topo/) has a control for
most attributes, each labelled with the attribute it sets.

## Feature guides

| Page                                             | Covers                                                           |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| [sizing.md](sizing.md)                           | `fit`, and the scrolling diagram box                             |
| [selection.md](selection.md)                     | `selection` and the selection events                             |
| [secondary-structure.md](secondary-structure.md) | DSSP classes, `ss-310`, `min-helix-length`, `min-strand-length`  |
| [residue-data.md](residue-data.md)               | `residue-colours`, `residue-widths`, `colour-*` and the legend   |
| [membrane.md](membrane.md)                       | `membrane-*`, `distortions` and the MemProtMD distortions format |
| [theming.md](theming.md)                         | `theme`, `theme-light`, `theme-dark`, `registerTheme`            |
| [sequence-view.md](sequence-view.md)             | The 1-D view, `dimension`, `sequence-wrap`, `sequenceTracks`     |
| [view-3d.md](view-3d.md)                         | The 3-D view, `structure-*`, `transition-*`                      |
| [beta-barrels.md](beta-barrels.md)               | β-barrel detection, the unwrap and `show-contacts`               |
| [chain-icons.md](chain-icons.md)                 | The chain picker and `chain-icon-bandwidth`                      |
| [rendering.md](rendering.md)                     | How Cα traces become helix and strand axes                       |
| [architecture.md](architecture.md)               | The pipeline and module map, for contributors                    |
