# β-barrels: tertiary structure and the parallel-strand unwrap

This document explains how MemProt2D recognises a transmembrane β-barrel from
Cα coordinates and renders its strands running parallel — the feature requested
in [issue #12](https://github.com/tomnewport/memprot-topo/issues/12). It is
written to be read alongside [`rendering.md`](./rendering.md), which covers the
secondary-structure smoothing the barrel view reuses.

---

## 1. How a β-barrel comes about

A transmembrane β-barrel is a single β-sheet **closed onto itself into a
cylinder**: the last strand hydrogen-bonds back to the first, so the sheet has
no free edge. Almost all TM barrels (porins, OmpA, FadL, autotransporters, …)
are **all-antiparallel** — the chain meanders up and down through the bilayer,
so consecutive strands point in opposite N→C directions.

Two integers describe the whole structure
([Murzin, Lesk & Chothia, 1994](https://doi.org/10.1006/jmbi.1994.1110)):

- **n** — the number of strands. Even, from 8 (OmpA) up to ~22–26 for the large
  porins.
- **S** — the **shear number**: start on a residue, follow its hydrogen-bonded
  partner across to the next strand, and again, once around all `n` strands.
  You arrive back on the first strand displaced **S** residues along the strand
  axis. `S` is the coiling stagger of the sheet.

From `(n, S)` the rest of the geometry follows. The strand tilt `α` to the
barrel axis obeys, to a good approximation,

```
tan α ≈ (S · a) / (n · b)
```

with rise-per-residue along the strand `a ≈ 3.3 Å` and inter-strand spacing
`b ≈ 4.4–4.8 Å`. TM barrels sit around **30–45°** tilt. Crucially, although the
N→C direction alternates between neighbours, **the shear coils every strand the
same way**, so the strand _axes_ are all parallel. That is the key fact the
rendering exploits.

---

## 2. Detecting the barrel — `src/contacts/`

[`analyseBarrel`](../src/contacts/beta-sheet.ts) recovers the picture above from
Cα alone (no atoms beyond Cα, in keeping with the project's input contract):

1. **Extract strands.** One strand per `strand` segment; its axis is the
   dominant principal component of its Cα (PCA / power iteration), oriented N→C.
2. **Pair strands.** For every pair, the median nearest-neighbour Cα–Cα distance
   is computed. A pair counts as β-sheet neighbours when that spacing falls in
   the sheet range (3.5–6.5 Å), there are enough residue contacts, and the axes
   are roughly (anti)parallel. The sign of the axis dot product gives
   **parallel vs antiparallel**; the per-residue contacts give the register and
   drive the optional contact overlay.
3. **Close the ring.** The pairing graph is walked: a clean barrel is a single
   cycle in which every strand has exactly two neighbours and the first strand
   pairs with the last (`closed`). A flat sheet is an open path instead.
4. **Report geometry.** Strand count `n`, mean tilt, the barrel frame
   (axis = membrane normal, centre, radius) and the shear number `S` — derived
   from the measured tilt, `n` and spacing via the relation above.

The analysis also reports **`cylindrical`**: true only when the strand
centroids genuinely wrap the axis (large angular coverage), as opposed to lying
in a plane. This guards the renderer — a planar strand bundle, or an open
sheet, is _not_ unwrapped.

---

## 3. Rendering strands parallel — the cylindrical unwrap

The ordinary [`unrollChain`](../src/unroll/unroll.ts) lays the membrane-plane
path out as a single **cumulative arc length**. That is right for a helical
bundle, but it throws away the _sign_ of circumferential travel: a strand that
runs back **down** the bilayer still advances the always-positive arc, so
antiparallel neighbours fan out into a **chevron** instead of the parallel bars
a real unrolled barrel shows.

[`unwrapBarrel`](../src/unroll/barrel.ts) fixes this by literally unwrapping the
cylinder. Each Cα is described by its angle `θ` about the barrel axis (the
membrane normal, +z) and its height `z`. The circumferential coordinate
`u = R·θ`, with `θ` unwrapped continuously along the chain, becomes the
horizontal axis; `z` stays vertical. Then:

- a strand tilted at `α` on the cylinder maps to a **straight line at `α`** in
  the plot;
- because every strand inherits the **same winding sense**, the sheet's shear
  makes them **parallel** — the chevron disappears;
- neighbours land at their **true inter-strand spacing** automatically, with no
  fixed gap and no idealisation (the "kerning" of issue #12). Vertical register
  is correct for free, because `z` is the real membrane height, so
  hydrogen-bonded residues line up across strands.

This is the geometrically honest "cut the barrel and lay it flat" view
anticipated in [`PROJECT.md`](../PROJECT.md). Strands are de-pleated with a
low-order B-spline (as §3.2 of `rendering.md` recommends) so each renders as a
clean slanted bar. The output reuses `UnrollResult`'s shape, so the display
draws barrels with the same polygon/loop/label machinery as everything else;
only `arc` carries a different meaning (signed circumferential position rather
than cumulative arc length).

The display ([`topology-display.ts`](../src/components/topology-display.ts))
switches to the unwrap **only** for a chain that `analyseBarrel` reports as a
closed, cylindrical barrel; helical bundles and planar sheets keep the existing
arc-length layout.

---

## 4. Contact overlay

Setting the `show-contacts` attribute overlays the detected β-sheet residue
contacts as faint ties between paired strands. Because the unwrap places
residues at their true `(arc, z)`, each tie reads as "these two residues
hydrogen-bond across the sheet". It is off by default to keep the diagram
clean, and is only drawn in the cylindrical-unwrap layout where the positions
are meaningful.

---

## 5. References

- Murzin AG, Lesk AM, Chothia C (1994). Principles determining the structure of
  β-sheet barrels in proteins. _J. Mol. Biol._ 236(5):1369–1400 (two-part).
  https://doi.org/10.1006/jmbi.1994.1110
- Schulz GE (2002). The structure of bacterial outer membrane proteins.
  _Biochim. Biophys. Acta_ 1565(2):308–317.
  https://doi.org/10.1016/S0005-2736(02)00577-1
- See also the helix/strand smoothing rationale in
  [`rendering.md`](./rendering.md).
