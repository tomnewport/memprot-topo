# Rendering secondary structure: the geometry behind the diagram

This document explains how MemProt2D turns raw Cα coordinates into the smoothed
2D traces that represent α-helices and β-strands, why the chosen methods are
appropriate, and how they differ from the approaches taken by the established
3D molecular viewers (PyMOL, VMD) and the classic ribbon algorithms. It is
written to be readable by a structural biologist and is intended to be detailed
enough to support the methods section of a publication.

It assumes the conceptual framing set out in [`PROJECT.md`](../PROJECT.md): the
diagram is an **unwrapped Richardson diagram**, projecting a 3D structure into a
2D membrane reference frame while preserving the geometric information (tilt,
curvature, kink, loop excursion) that conventional snake-diagram topology
viewers discard.

---

## 1. The problem: periodicity is not the information we want

A secondary structure element is, geometrically, a regular repeating motif with
a well-defined axis. The repeat itself — the helical spiral, the β-pleat — is
_not_ structurally informative at the level this tool cares about: every
well-formed α-helix spirals the same way, and every well-formed β-strand pleats
the same way. What _is_ informative is how the **axis** of that element behaves:
its tilt relative to the membrane, its curvature, and any kinks. The design goal
is therefore to render each element like a piece of spaghetti — a smooth line
that is **straight when the element is straight** and bends only where the real
backbone bends.

This makes the periodic component actively harmful in our representation, and
for a reason that is specific to this tool. PyMOL and VMD render in 3D, where
the periodic motion is visible and reads naturally: a helix _looks_ like a
helix, a sheet _looks_ pleated, and the eye interprets them correctly.
MemProt2D **projects the structure onto the membrane plane**. Under projection,
a 3D periodic oscillation does not read as a helix — it reads as a sine wave or
a jagged zigzag superimposed on the trace. The periodic component, harmless or
even helpful in 3D, becomes visual noise that obscures the axis information we
are trying to show. Removing it is therefore not merely an aesthetic choice (as
it is in PyMOL/VMD) but a correctness requirement of the 2D projection.

The two element types carry two different periodic signals, and they must be
treated differently.

### 1.1 α-helix geometry

The canonical right-handed α-helix ([Pauling, Corey & Branson,
1951](https://doi.org/10.1073/pnas.37.4.205)) has:

- **3.6 residues per turn**
- **~100° of twist per residue**
- **~1.5 Å rise per residue** (5.4 Å pitch per turn)
- **Cα atoms ~2.3 Å from the helix axis**

The consequence for a Cα trace is a spiral of radius ~2.3 Å with a period of
3.6 residues. Projected onto an arbitrary plane, that spiral becomes an
oscillation of up to ~4.6 Å peak-to-peak — comparable to the rise over more
than a full turn, and large enough to dominate the apparent path. A spline
fitted directly through the Cα atoms inherits this oscillation.

### 1.2 β-strand geometry

A β-strand is an extended backbone with a **two-residue repeat** ([Pauling &
Corey, 1951](https://doi.org/10.1073/pnas.37.5.251); see also the [Birkbeck PPS
β-sheet notes](https://www.cryst.bbk.ac.uk/PPS95/course/3_geometry/sheet.html)
and [Wikipedia: Beta sheet](https://en.wikipedia.org/wiki/Beta_sheet)):

- **~3.4–3.5 Å rise per residue** (~3.2 Å parallel, ~3.4 Å antiparallel)
- **~6.8–7 Å pitch** per two-residue repeat
- a **pleat**: successive Cα alternate to either side of the strand axis,
  because of the tetrahedral geometry at each Cα. With a ~3.8 Å virtual
  Cα–Cα bond and only ~3.4 Å of that projecting onto the axis as rise, the
  remaining ~1.7 Å resolves into a perpendicular zigzag of ~1.7 Å peak-to-peak
  (≈ ±0.85 Å about the axis).

The pleat is a period-2 oscillation — the highest frequency a residue-sampled
signal can carry (the Nyquist frequency). It is what makes a β-strand Cα trace
"zigzag". Crucially, **the pleat is not the strand's crossing angle.** The
crossing angle — the strand's tilt across the membrane, which is the
information we want to keep — is the orientation of the strand _axis_. The pleat
is an oscillation _about_ that axis. Removing the pleat preserves the crossing
angle; it does not destroy it. (This corrects an earlier assumption in the
codebase that the zigzag had to be retained to encode the crossing angle.)

---

## 2. Prior art: how PyMOL, VMD, and the classic ribbon algorithms do it

The modern ribbon/cartoon representation descends from [Richardson's 1981
taxonomy](<https://doi.org/10.1016/S0065-3233(08)60520-3>) and the first ribbon
drawing algorithm of [Carson & Bugg
(1986)](<https://doi.org/10.1016/0263-7855(86)80010-8>) (later the RIBBONS
program). Carson & Bugg derive closely spaced **guide coordinates** from the
peptide planes and pass B-spline curves through them, with the sheet surface
"smoothed both along the strands and perpendicular to them" — i.e. the
flattening of the pleat is built into the foundational algorithm, not a later
addition. See also the overview in [Wikipedia: Ribbon
diagram](https://en.wikipedia.org/wiki/Ribbon_diagram).

### 2.1 PyMOL — iterated neighbour averaging

PyMOL's behaviour is controlled by
[`cartoon_flat_sheets`](https://pymolwiki.org/index.php/Cartoon_flat_sheets)
(on by default) and
[`cartoon_flat_cycles`](https://pymolwiki.org/index.php/Cartoon_flat_cycles)
(default 4). The wiki documents the settings but not the operation; the actual
algorithm is in
[`RepCartoonFlattenSheets`](https://github.com/schrodinger/pymol-open-source/blob/master/layer2/RepCartoon.cpp)
in `layer2/RepCartoon.cpp` (function around lines 3901–3985 at the time of
writing). Each of the `cartoon_flat_cycles` iterations does this to every
β-sheet run, with the run's endpoints held fixed:

```c
f = 1;                                            /* window half-width = 1 */
for (c = 0; c < flat_cycles; c++) {               /* default flat_cycles = 4 */
  for (b = first + f; b <= last - f; b++) {        /* iterative averaging  */
    zero3f(t0);
    for (e = -f; e <= f; e++)
      add3f(pv + 3 * (b + e), t0, t0);             /* sum of b-1, b, b+1   */
    scale3f(t0, 1.0F / (f * 2 + 1), tmp + b * 3);  /* divide by 3          */
  }
  /* ... copy tmp -> pv (the guide Cα path) ...                            */
  /* ... apply the same 3-point average to the orientation vectors pvo ... */
  /* ... then re-orthogonalise pvo against the local tangent ...           */
}
```

In other words: **iterated uniform 3-point neighbour averaging** — a box
low-pass filter with a ±1 window applied four times — on the guide path and on
the ribbon-normal vectors. The strand tips are biased back outwards separately
(`RepCartoonFlattenSheetsRefineTips`, `cartoon_refine_tips`). Loops get the same
treatment via `cartoon_smooth_cycles` (default 2). A ±1 box filter reduces a
period-2 (pleat) amplitude to one third per pass, so after four passes the pleat
is ~99% gone while lower-frequency curvature survives.

Notably, **PyMOL does not de-spiral helices** with this routine — the loop only
accumulates `ss == SHEET` runs. It does not need to: in 3D the helix coil reads
correctly. This is the key point of departure for a 2D projection (see §3.1).

### 2.2 VMD — filtered Cα, then a spline

VMD's `NewCartoon` representation
([docs](https://www.ks.uiuc.edu/Research/vmd/current/ug/node70.html)) fits a
spline (Catmull-Rom or B-spline, selectable) through the Cα guide points and
uses [STRIDE](<https://en.wikipedia.org/wiki/STRIDE_(algorithm)>) only to choose
the cross-section shape per residue. For sheets, the VMD developers' notes
([VMD-L mailing
list](https://www.ks.uiuc.edu/Research/vmd/mailing_list/vmd-l/12081.html))
describe **pre-filtering the Cα positions to "smooth them out, mostly
eliminating ripple"** before splining, and building the solid β-ribbon spline
through the **midpoints between consecutive Cα** — itself a period-2 killer,
since the midpoint of two adjacent pleated Cα lies on the strand axis. (VMD is
distributed under a registration licence rather than a public repository, so
this section relies on the developers' published notes and documentation rather
than direct inspection of the source.)

### 2.3 Summary of prior art

| Tool               | Sheet pleat           | Helix spiral        | Mechanism                                     |
| ------------------ | --------------------- | ------------------- | --------------------------------------------- |
| Carson & Bugg /    | removed               | preserved as radius | B-spline through peptide-plane guide points,  |
| RIBBONS (1986)     |                       |                     | smoothed along & across strands               |
| PyMOL              | removed (flat_sheets) | preserved (3D coil) | iterated ±1 box average of guide Cα + normals |
| VMD NewCartoon     | removed (Cα filtered) | preserved (3D coil) | low-pass filter then Catmull-Rom; ribbon      |
|                    |                       |                     | through Cα midpoints                          |
| **MemProt2D (2D)** | **must be removed**   | **must be removed** | see §3 — projection forces both               |

The universal pattern: **every serious tool removes the β-pleat before
drawing.** The difference for MemProt2D is that the 2D projection forces us to
remove the helix spiral as well, which the 3D tools never do.

---

## 3. How MemProt2D does it

The pipeline lives in [`src/unroll/`](../src/unroll). `unrollChain`
([`unroll.ts`](../src/unroll/unroll.ts)) converts a chain's Cα into a sequence
of `(arc, z)` points — `arc` is cumulative arc length along the membrane plane
(the projected xy path), `z` is the real height relative to the bilayer
midplane. The display component ([`topology-display.ts`](../src/components/topology-display.ts))
draws polygons along those points.

### 3.1 α-helices — local-axis projection by PCA

**How it works.** Before any spline is fitted, each helix Cα is projected onto a
**local helix axis** estimated from a sliding window of neighbouring helix Cα
([`helix-axis.ts`](../src/unroll/helix-axis.ts)). The window's covariance matrix
is formed and its dominant eigenvector — the direction of greatest variance,
which for a helix is the axis — is found by power iteration. Each Cα is then
replaced by its projection onto that axis through the window centroid. This
removes the ~2.3 Å spiral while leaving the smooth trajectory of the axis
intact. The de-spiralled points are then fitted with a clamped cubic B-spline
([`bspline.ts`](../src/unroll/bspline.ts)) whose number of control points scales
with helix length (`aminosPerDof`, default one control point per 4 residues), so
a long straight helix is represented by a near-straight low-order curve.

**Why this method.** The projection is what makes a straight helix render as a
straight line — exactly the spaghetti behaviour the tool requires — while a bent
or kinked helix retains its bend because the local axis itself curves. A sliding
**local** axis (rather than one global axis per helix) is essential for
transmembrane helices, which routinely bend, kink at prolines, and tilt; a
single global axis would straighten out real curvature that is biologically
meaningful. Estimating the axis as the dominant principal component is the
standard approach to fitting a helix axis from Cα alone and is robust to the
spiral phase. This is the deliberate point of departure from PyMOL and VMD
(§2.1): because those tools render in 3D they keep the spiral, whereas under our
2D projection the spiral must go.

**Alternatives considered.**

- **Idealised cylinder / straight rod** (original VMD `Cartoon`, classic
  topology cartoons): replace the helix with a perfectly straight cylinder
  between its endpoints. Simple, but discards exactly the curvature and kink
  information this tool exists to show. Rejected.
- **Iterated neighbour averaging** (PyMOL's sheet method, §2.1): a ±1 box filter
  barely attenuates a period-3.6 helix spiral (it is tuned to the period-2
  Nyquist frequency), so it cannot de-spiral a helix without many cycles that
  would also erode real curvature. Wrong tool for this frequency. Rejected for
  helices (but see §3.2 for strands).
- **Rotational / least-squares axis methods** ([Kahn,
  1989](<https://doi.org/10.1016/0097-8485(89)85005-3>); [Christopher, Swanson &
  Baldwin, 1996](<https://doi.org/10.1016/0097-8485(95)00075-5>)) and
  per-residue local-axis characterisation ([HELANAL; Bansal, Kumar & Velavan,
  2000](https://doi.org/10.1080/07391102.2000.10506570)): more sophisticated
  helix-axis estimators that also classify helices as linear/curved/kinked.
  These are attractive future refinements for the axis estimate, but the PCA
  dominant-eigenvector approach captures the same axis direction for the smooth
  projection we need, at much lower complexity. A candidate upgrade, not a
  current requirement.

### 3.2 β-strands — current state and the chosen direction

**How it currently works (and why that is the defect).** At present strands are
_not_ de-pleated. The unroller forces strands down a Catmull-Rom path that
interpolates through **every** Cα (`DOF_PER_TYPE.strand = 1` in
[`unroll.ts`](../src/unroll/unroll.ts)), faithfully tracing the period-2 pleat.
The original rationale was that the zigzag "encodes the strand crossing angle" —
but as §1.2 explains, the crossing angle is the axis orientation, which survives
flattening; the zigzag is just the pleat. The result is that strands render as
visibly wiggly lines, which is the opposite of the intended spaghetti
representation. (A unit test comment in `test/unit/unroll/unroll.test.ts`
already describes the _desired_ behaviour — "without the per-residue zigzag
noise" — even though the implementation does not yet deliver it.)

**The chosen direction.** A β-strand should be flattened to its axis exactly as
a helix is, so a straight strand becomes a straight line and only genuine
curvature or kinks survive. Two equally defensible mechanisms achieve this:

1. **PCA local-axis projection**, reusing the helix machinery with a smaller
   window (the pleat period is 2, versus 3.6 for the helix, so a window of ±2
   residues spans ~2 repeats). Projecting each Cα onto the local axis through
   the window centroid preserves the strand axis — hence the crossing angle —
   _exactly_, and keeps strands and helices on one shared code path.
2. **Iterated neighbour averaging**, exactly PyMOL's sheet method (§2.1). A
   single `[1, 2, 1]/4` pass annihilates a period-2 signal exactly; PyMOL's
   uniform ±1 box filter over four passes achieves ~99% removal. This is the
   battle-tested choice of the reference tools and is trivially simple.

**These two mechanisms are the same operation.** For the component
_perpendicular_ to a straight axis, projecting onto that axis replaces each
coordinate with the mean over the window — i.e. a box low-pass filter. So a
sliding-window axis projection (option 1) and neighbour averaging (option 2)
differ only in window length and iteration count. A single pass with a 5-point
window (`windowHalf = 2`) leaves ~1/5 of a period-2 signal — an ~80% reduction
of the ~±0.85 Å pleat to ~±0.17 Å (well under a pixel at publication scale),
with interior residues collapsing furthest and the strand tips retaining a
little more (their windows are one-sided, exactly as PyMOL pins sheet
endpoints). The 5-point window is odd, so it cannot null the period-2 signal
exactly; an even window would cancel it perfectly but centres between residues.
Stronger removal, if ever wanted, comes from a wider window, an even-length
window, or a second pass — but it trades against eroding genuine short-range
curvature.

The project leans toward **(1) PCA projection** for consistency with the
existing helix path, with **(2)** documented as the proven reference-tool
fallback. Either way the fix is to stop interpolating through the raw pleat.
This is implemented in a follow-up change.

**Caveats of the projection approach.**

- **Strand↔coil junctions are arc-continuous, not position-continuous.**
  Projecting the whole chain group _before_ splitting it by SS type keeps the
  accumulated arc length continuous across the boundary (no phantom step in the
  unrolled coordinate). But the strand's terminal Cα is itself moved by up to
  the pleat amplitude (~±0.85 Å) perpendicular to its axis, so a small cosmetic
  kink can remain where the flattened strand meets the unprojected coil. This
  is purely visual; it does not break arc continuity.
- **Degenerate short strands.** A strand of 1–2 residues has too few Cα to
  express a pleat at all, and the renderer folds sub-3-residue SS assignments
  into the surrounding coil anyway (`MIN_SS_RESIDUES`), so they never reach the
  projection. Strands of 3+ residues have ≥3 masked neighbours in every window
  and are flattened normally — a 3-residue strand de-pleats to a straight
  segment. There is therefore no length at which a real strand keeps its full
  zigzag.

**Alternatives considered.**

- **Spline through Cα midpoints** (VMD's solid β-ribbon, §2.2): the midpoint of
  two adjacent pleated Cα lies on the axis, so a curve through midpoints is
  inherently de-pleated. Equivalent in spirit to a `[1,1]/2` filter; a clean
  option, slightly awkward to reconcile with per-residue labelling because the
  control points no longer coincide with residues.
- **Idealised flat arrow between endpoints**: as with the idealised helix
  cylinder, discards curvature. Rejected.
- **Keep the pleat** (current behaviour, and PyMOL with `cartoon_flat_sheets`
  off): only defensible in 3D, where the viewer can interpret the pleat. Under
  2D projection it is noise. Rejected — this is the defect being corrected.

### 3.3 The straight-line guarantee — MemProt2D's differentiator

Removing periodicity makes a well-behaved element _nearly_ straight, but a
low-order spline can still carry a gentle residual wobble. Both PyMOL and VMD
deliberately keep such gentle wiggles, because organic-looking ribbons are
desirable in a 3D scene. For a 2D topology diagram the opposite is true: a
well-behaved element should be **exactly** a straight line, so that any
deviation the reader sees is real.

The intended mechanism is a **curvature-adaptive simplification** of the
projected axis — e.g. the [Ramer–Douglas–Peucker
algorithm](https://doi.org/10.3138/FM57-6770-U75U-7727) with a tolerance of
~1–1.5 Å — applied after projection. A straight element collapses to its two
endpoints (a line); only vertices at genuine kinks or bends are retained. No
existing membrane-topology tool does this, and it is a deliberate design choice
worth highlighting in the publication: the diagram promises that **a straight
line means a straight element, and every visible bend is a real bend.**

---

## 4. References

**Foundational structure and representation**

- Pauling L, Corey RB, Branson HR (1951). The structure of proteins: two
  hydrogen-bonded helical configurations of the polypeptide chain. _PNAS_
  37(4):205–211. https://doi.org/10.1073/pnas.37.4.205
- Pauling L, Corey RB (1951). The pleated sheet, a new layer configuration of
  polypeptide chains. _PNAS_ 37(5):251–256.
  https://doi.org/10.1073/pnas.37.5.251
- Richardson JS (1981). The anatomy and taxonomy of protein structure. _Adv.
  Protein Chem._ 34:167–339.
  https://doi.org/10.1016/S0065-3233(08)60520-3
- Carson M, Bugg CE (1986). Algorithm for ribbon models of proteins. _J. Mol.
  Graphics_ 4(2):121–122. https://doi.org/10.1016/0263-7855(86)80010-8
- [Wikipedia: Ribbon diagram](https://en.wikipedia.org/wiki/Ribbon_diagram);
  [Wikipedia: Beta sheet](https://en.wikipedia.org/wiki/Beta_sheet);
  [Birkbeck PPS β-sheet geometry](https://www.cryst.bbk.ac.uk/PPS95/course/3_geometry/sheet.html)

**Secondary structure assignment**

- Kabsch W, Sander C (1983). Dictionary of protein secondary structure
  (DSSP). _Biopolymers_ 22(12):2577–2637.
  https://doi.org/10.1002/bip.360221211
- Frishman D, Argos P (1995). Knowledge-based protein secondary structure
  assignment (STRIDE). _Proteins_ 23(4):566–579.
  https://doi.org/10.1002/prot.340230412 ·
  [Wikipedia: STRIDE](<https://en.wikipedia.org/wiki/STRIDE_(algorithm)>)

**Helix-axis estimation**

- Kahn PC (1989). Defining the axis of a helix. _Computers & Chemistry_
  13(3):185–189. https://doi.org/10.1016/0097-8485\(89\)85005-3
- Christopher JA, Swanson R, Baldwin TO (1996). Algorithms for finding the axis
  of a helix: fast rotational and parametric least-squares methods. _Computers &
  Chemistry_ 20(3):339–345.
  https://doi.org/10.1016/0097-8485\(95\)00075-5
- Bansal M, Kumar S, Velavan R (2000). HELANAL: a program to characterize helix
  geometry in proteins. _J. Biomol. Struct. Dyn._ 17(5):811–819.
  https://doi.org/10.1080/07391102.2000.10506570

**Renderer implementations**

- PyMOL (open source): sheet flattening in
  [`layer2/RepCartoon.cpp`](https://github.com/schrodinger/pymol-open-source/blob/master/layer2/RepCartoon.cpp)
  (`RepCartoonFlattenSheets`); settings
  [`cartoon_flat_sheets`](https://pymolwiki.org/index.php/Cartoon_flat_sheets),
  [`cartoon_flat_cycles`](https://pymolwiki.org/index.php/Cartoon_flat_cycles),
  [`setting:cartoon`](https://pymol.org/dokuwiki/doku.php?id=setting:cartoon).
- VMD: [`NewCartoon`
  representation](https://www.ks.uiuc.edu/Research/vmd/current/ug/node70.html);
  β-sheet Cα filtering described on the [VMD-L mailing
  list](https://www.ks.uiuc.edu/Research/vmd/mailing_list/vmd-l/12081.html).

**Simplification**

- Douglas DH, Peucker TK (1973). Algorithms for the reduction of the number of
  points required to represent a digitized line or its caricature.
  _Cartographica_ 10(2):112–122.
  https://doi.org/10.3138/FM57-6770-U75U-7727
  </content>
  </invoke>
