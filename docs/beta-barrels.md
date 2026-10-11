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
the Cα and, when the DSSP file has them, DSSP's own β-ladders:

1. **Extract strands.** One strand per _physical_ strand. Real PDB/DSSP SHEET
   records list a barrel strand once per sheet relationship, so the same strand
   appears several times as overlapping ranges (OmpF's annotation has 42 records
   for 16 strands); these are merged first. Each strand's axis is the dominant
   principal component of its Cα (PCA / power iteration), oriented N→C.
2. **Pair strands.** From DSSP's ladders (`_dssp_struct_ladder`, which
   PDB-REDO's DSSP mmCIF carries) when there are any: each ladder is a run of
   hydrogen-bonded residue pairs between two strands, with its type
   (parallel or antiparallel). Ladders between the same two strands are
   pooled, residues are paired end to end along each ladder (so a β-bulge
   still pairs), and pairs with fewer than two bridges, DSSP's isolated
   bridges, are dropped. Pass a chain's ladders with
   `analyseBarrel(calphas, segments, { ladders: chainLadders(chain) })`;
   `analyseAssemblyBarrel` pools every chain's ladders itself, including the
   ones between chains. `pairingSource` says which method was used.

   Without ladders (or when none of them land on the strands), pairing falls
   back to the Cα geometry: for every pair, the median nearest-neighbour Cα–Cα
   distance is computed, and a pair counts as β-sheet neighbours when that
   spacing falls in the sheet range (3.5–6.5 Å), there are enough residue
   contacts, and the axes are roughly (anti)parallel. The sign of the axis dot
   product gives **parallel vs antiparallel**.

   Either way, the per-residue contacts give the register and drive the
   optional contact overlay. On the demo barrels the ladders give the
   textbook shear numbers, OmpF (2OMF) S = 20 and α-hemolysin's stem (7AHL)
   S = 14, where the Cα geometry gives 21 and 16.

3. **Close the ring.** Only barrel-_wall_ strands — those with a partner on each
   side (≥2 pairings) — carry the ring, which drops short edge strands and any
   strands that fold _inside_ the barrel (OmpF's L3). Each wall strand keeps its
   two closest partners, mutual edges are walked, and the barrel is the largest
   cycle (`closed`); a flat sheet is an open path instead. This tolerance for
   stray β-bridges is what makes detection work on real structures.
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

The layout stage ([`chain-layout.ts`](../src/layout/chain-layout.ts))
switches to the unwrap **only** for a chain that `analyseBarrel` reports as a
closed, cylindrical barrel; helical bundles and planar sheets keep the existing
arc-length layout. In barrel mode only the wall strands are drawn as strands;
β-strands folded inside the barrel sit near the axis, where the unwrap angle is
unstable, so they hold the previous angle and read as part of the connecting
loop rather than as spurious bars.

### Open sheets (issue #54)

Strands that pair but don't close into a barrel, such as the β-sandwich of a
pentameric ligand-gated channel (3EAM, in the gallery) or a hairpin in a
helical protein, would otherwise be drawn strand by strand along the
arc-length unroll, where antiparallel neighbours fan into chevrons.
[`findSheets`](../src/layout/sheets.ts) groups the paired strands of a chain
that isn't drawn as a barrel into sheets (connected groups of two or more),
and fits each a plane. Each strand of a sheet is then drawn as the sheet's
flat projection of its trace, so a sheet's strands are parallel bars with
antiparallel ones pointing the other way:

- a sheet standing more than 30° from the membrane plane is seen along the
  horizontal part of its normal, so heights stay real (`z`);
- a flatter sheet is drawn face-on, its mean strand direction upwards, about
  the height of its centre.

Strands keep their place in sequence order, so loops never double back. A
strand that follows another of the same sheet with only a loop between them
(hairpins, meanders) is packed against it like a barrel-wall strand, two
strand widths apart, and the hairpin loop leans over like a barrel hairpin.
Sheet strands carry arrowheads, as barrel strands do.

In the 3-D view each sheet strand turns its face from the curtain to the
sheet's normal at that strand (the strand's axis crossed with the directions to
its partners, so it follows the sheet's twist) as it rolls up.

---

## 4. Contact overlay

Setting the `show-contacts` attribute overlays the detected β-sheet residue
contacts as faint ties between paired strands. Because the unwrap places
residues at their true `(arc, z)`, each tie reads as "these two residues
hydrogen-bond across the sheet". It is off by default to keep the diagram
clean, and is only drawn in the cylindrical-unwrap layout and on open sheets,
where the positions are meaningful.

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
