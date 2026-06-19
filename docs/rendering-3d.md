# The 3D view and the 2D⇄3D morph

This document explains how MemProt2D renders the optional **3D view** and the
animated transition between it and the flat 2D topology diagram. It complements
[`rendering.md`](./rendering.md) (which covers the 2D SVG geometry) and the
build plan in [`3d-renderer-plan.md`](./3d-renderer-plan.md). It is written for a
contributor — developer or structural biologist — who wants to understand or
extend the 3D side.

---

## 1. Why a 3D view at all

The 2D diagram is an **unwrapped** Richardson diagram: the real structure cut and
laid flat against the membrane plane. That unwrapping is the tool's novelty, but
it is also a transformation a reader has to trust. The 3D view exists to make
that trust earnable: starting from the flat diagram, the structure **rolls back
up into its real coordinates**, so you can watch a β-barrel close into a cylinder
or a helical bundle gather together, and see that the flat picture and the real
structure are the same object. The toggle between the two is itself a validation
tool — and a publication-worthy feature.

The SVG renderer remains the canonical, vector, paper-quality output. The 3D view
is an interactive WebGL companion; it never replaces the 2D diagram.

---

## 2. One topology, two renderers

The key architectural decision is that **both renderers consume the same scene**.
A single pipeline, `planChainLayout`
([`topology-display.ts`](../src/components/topology-display.ts)), decides where
every element goes (path selection → unroll → fixed-gap layout). From its output:

- the **SVG renderer** (`renderChainSvg`) draws the flat diagram, and
- `buildScene` ([`src/scene/build.ts`](../src/scene/build.ts)) maps the same
  layout into a renderer-agnostic [`TopologyScene`](../src/scene/types.ts), which
  the **3D renderer** ([`src/render-3d/`](../src/render-3d/)) consumes.

Because both derive from one placement pass, the two views are consistent by
construction. The shared element geometry — ribbon/arrow outlines
([`ribbon-outline.ts`](../src/scene/geometry/ribbon-outline.ts)), loop béziers
([`loop-path.ts`](../src/scene/geometry/loop-path.ts)) and β-sheet contact ties
([`contacts.ts`](../src/scene/geometry/contacts.ts)) — lives in pure functions in
`src/scene/geometry/` used by both sides.

### The dual-position scene

Every centreline sample in the scene carries **two** positions:

- `(arc, z)` — its flat 2D position in the membrane side-view, and
- `pos3d` — its real 3D coordinate in the membrane frame.

The morph is then nothing more than a per-sample interpolation between the two.
The 3D target is the **real, honest structure** (`pos3d` comes from the
de-spiralled backbone the unroller already computes), not an idealised shape — a
deliberate choice so the roll-up validates the unrolling rather than papering
over it.

---

## 3. The morph

`TopologyView3D` ([`topology-view.ts`](../src/render-3d/topology-view.ts)) builds
each element as a swept solid and animates a single parameter `t ∈ [0, 1]`:

- **t = 0** — the flat 2D diagram (composition matches the SVG; see §5).
- **t = 1** — the real 3D structure.

### Travelling wavefront

The roll proceeds from the N-terminus along the chain rather than all at once.
Each sample's local progress is

```
tLocal = smoothstep( clamp( (t·(1 + w) − arcFraction) / w, 0, 1 ) )
```

with wavefront width `w ≈ 0.35`. Samples nearer the N-terminus (small
`arcFraction`) reach their 3D position first, so the structure visibly _rolls_
up rather than inflating uniformly.

### Representations

- **β-strands** → ribbons (a swept rectangle with a C-terminal arrowhead).
- **α-helices** → cylinders (swept circular tube).
- **coil / loops** → thin tubes.

Helical **spirals are deliberately not drawn** (the 2D projection removes them on
purpose — see [`rendering.md`](./rendering.md) §1 — and the noodle/cylinder
representation is the agreed scope). Adding spirals is possible future work.

### Camera

The camera eases from **dead-on and near-orthographic** at the flat end (so it
reads like the 2D diagram, looking down the membrane) to a **~35 mm-equivalent
perspective** at a gentle 3/4 angle when fully rolled. Field of view interpolates
from ~2° to ~50°; `OrbitControls` only take over once fully 3D (`t = 1`).

When rolling **back down** to 2D, the camera eases to orthographic from whatever
angle the user orbited to: the current orbit azimuth/elevation/zoom are captured
as an anchor and interpolated to dead-on as `t → 0`, so there is never a snap.

### Membrane cutaway

The bilayer slab is rendered as a **cutaway**: it fills only the far half of the
view depth, with its cut face at the protein's mid-plane, revealing the structure
inside. It draws with `depthWrite` off so it neither z-fights with nor occludes
the protein in front. Its width eases from the full flat arc (2D) to the compact
3D footprint, and its colour/opacity match the SVG membrane band at `t = 0`.

---

## 4. The component toggle

`<topology-display>` shows a per-diagram **2D / 3D** control. The resting 2D state
renders as **SVG** (crisp, exportable). Selecting **3D** lazy-loads the renderer
(`import('../render-3d/index.js')`), builds the scene, hides the SVG, and rolls up
to `t = 1`; selecting **2D** rolls back down and, at `t = 0`, unmounts WebGL and
restores the SVG. `prefers-reduced-motion` skips the animation and jumps to the
target state.

**Bundle isolation.** The 3D renderer imports only `three` and the scene types —
nothing from the SVG component — and is dynamically imported, so `three.js`
lands in its own lazily-loaded chunk. Embedders who only use the 2D SVG component
never download it.

---

## 5. Matching the 2D diagram at t = 0

For the toggle to feel like one continuous object, the 3D view at `t = 0` is made
to overlay the 2D diagram closely:

- **Element widths** ease from the SVG-matching flat size (strands flat; helix and
  coil tube radii equal to the SVG widths) to the rounded 3D size as they roll.
- **Loops** carry the SVG's schematic bézier as their _flat_ path (sampled from
  the same `buildLoopPoints` control polygon) and the real backbone as their _3D_
  path, so at `t = 0` they trace the exact smooth hairpins the SVG draws, then
  morph to the true coil.
- **Membrane** matches the SVG slab colour and opacity at the flat end.

The match is close but not pixel-perfect (vector SVG vs rasterised WebGL, stroked
curves vs swept tubes). A few 2D-only annotations are intentionally not drawn in
3D: residue-number labels, and the grey dashed β-sheet **contact ties** (these
indicate 3D proximity, which is directly visible once in 3D, so they live only in
the flat diagram).

---

## 6. Known limitations and future work

- **Spirals** are not drawn (by design, for now).
- **Cross-break connectors** (the dashed inter-segment links the SVG draws across
  chain breaks) are omitted from the 3D scene.
- **Re-entrant loops** remain out of scope project-wide.
- Geometry is rebuilt per frame; for very large assemblies this is the main cost
  to watch. Outline passes / nicer materials are candidate polish.
