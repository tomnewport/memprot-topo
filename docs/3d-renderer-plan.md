# 3D renderer & 2D⇄3D morph — implementation plan (issue #22)

Status: **approved, ready to implement.** Supersedes the Phase 0 spike under
[`src/spike/`](../src/spike/README.md), which validated the concept and is
throwaway. This document is the build plan for the production feature.

---

## 1. Goal

Two renderers driven by **one** topology layout:

1. **SVG renderer** — the canonical, vector, paper-quality 2-D output. Stays the
   default and the export format (PDF/figures/posters). Non-negotiable.
2. **3-D renderer** (Three.js, lazy-loaded) — an interactive view that the user
   can morph to/from the 2-D diagram. Starting at the N-terminus and progressing
   along the chain, the flat diagram **rolls up** into the real 3-D structure;
   the camera eases from orthographic (locked, looking down the membrane) to a
   ~35 mm-equivalent perspective.

The two must be provably consistent: at the flat (t=0) end the 3-D view
reproduces the 2-D diagram, because **both consume the same scene model**. The
toggle between them is itself a validation tool and a publication-worthy feature.

### Locked decisions

- **Three.js**, **lazy-loaded / code-split** so the core SVG component bundle is
  unaffected for embedders who only want 2-D.
- **3-D target is the real Cα structure** in the membrane frame (not an idealised
  shape) — this is what makes the morph validate the unrolling.
- **Representations:** β-strands → ribbons, α-helices → cylinders, coil → tubes.
  **No helical spirals yet** (deferred; may never come to SVG — accepted).
- **SVG stays the canonical export.**

### Deferred / out of scope here

- Helical spirals in either view.
- Re-entrant loops (already out of scope project-wide).
- Polished shading/outline/material work beyond what Phase 4 specifies.

---

## 2. Where the code is today

```
Cα (membrane frame)
   └─ unrollChain / unwrapBarrel / unwrapAssembly      src/unroll/, topology-display.ts
        → UnrolledSegment[] : { samples:{arc,z,x3?,y3?}[], residues[] }
   └─ layoutSegments / barrelLayout                    topology-display.ts
        → SegmentLayout[]   : display-space (arc,z) + SsRun[]
   └─ renderChainSvg + drawSsPolygon + drawLoop + …     topology-display.ts
        → SVGSVGElement      ← ALL geometry is computed inline here
```

The first two stages are already renderer-agnostic. The **third stage is the
problem**: `drawSsPolygon` (ribbon/arrow vertices), `drawLoop`/`buildLoopPoints`
(loop béziers + extreme points), `drawContacts`, and residue-label placement all
compute geometry _inside_ the SVG DOM calls. There is no shared geometry model.

Phase 1 extracts that geometry into a renderer-agnostic **`TopologyScene`** and
moves the SVG renderer onto it with **zero visual change**.

Key existing symbols the refactor touches (all in
`src/components/topology-display.ts` unless noted):

- Constants: `PLOT`, `SS_BODY` (`halfWidthPx 4`, `arrowHalfWidthPx 6`,
  `arrowLengthPx 12`), `SS_STYLE`, `COLOURS`, `LOOP`, `BARREL`, `MIN_SS_RESIDUES`.
- Geometry fns: `drawSsPolygon`, `buildLoopPoints`, `renderLoopCurve`, `drawLoop`,
  `drawContacts`, `placeResidueLabel`, `unitTangent`, `runsBySs`, `layoutSegments`,
  `barrelLayout`, `barrelWallSegments`, `unwrapAssembly`.
- Entry: `renderChainSvg`, `TopologyDisplay.render`.
- Analysis: `analyseBarrel`, `analyseAssemblyBarrel`, `BarrelAnalysis`
  (`src/contacts/`).

---

## 3. The shared model: `TopologyScene`

New module `src/scene/`. Pure, no DOM, no Three.js. The single source of truth for
"which elements go where." Each centreline sample carries **both** its flat
display position and its real 3-D position, so the morph is per-sample
interpolation and both renderers read identical placement.

```ts
// src/scene/types.ts
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One point on an element centreline, in BOTH frames. */
export interface SceneSample {
  arc: number; // display-space arc length (post-layout), Å
  z: number; // membrane depth, Å  (flat vertical axis)
  pos3d: Vec3; // real membrane-frame coordinate, Å (morph target)
}

export type SceneElementType = 'helix' | 'strand' | 'loop';

export interface SceneElementBase {
  type: SceneElementType;
  /** Dense centreline, N→C. */
  samples: SceneSample[];
  /** Per-input-Cα anchors for labels / picking. */
  residues: SceneResidue[];
  /** Neighbour-protomer element in an assembly barrel → rendered desaturated. */
  faded: boolean;
}

export interface RibbonElement extends SceneElementBase {
  type: 'strand';
  arrow: true; // C-terminal arrowhead
}
export interface HelixElement extends SceneElementBase {
  type: 'helix';
  arrow: false;
}
export interface LoopElement extends SceneElementBase {
  type: 'loop';
  /** Resolved 2-D control points (the schematic bézier) in display (arc,z). */
  control: { arc: number; z: number; kind: 'endpoint' | 'tangent' | 'extreme' }[];
  /** True for the dashed cross-break / inter-protomer connector. */
  dashed: boolean;
}

export interface SceneResidue {
  resSeq: number;
  iCode: string;
  arc: number;
  z: number;
  pos3d: Vec3;
  sampleIndex: number; // into the owning element's samples
}

export interface SceneContact {
  // β-sheet tie between paired strands
  a: { arc: number; z: number; pos3d: Vec3 };
  b: { arc: number; z: number; pos3d: Vec3 };
}

export interface TopologyScene {
  chainId: string;
  kind: 'helical' | 'barrel' | 'assembly';
  membrane: { half: number }; // bilayer half-thickness, Å
  arcSpan: number; // total display arc, Å
  zRange: { min: number; max: number };
  elements: SceneElement[]; // ordered N→C across segments
  contacts: SceneContact[];
  /** Ribbon/helix cross-section dimensions (shared so both renderers agree). */
  style: {
    ribbonHalfWidth: number;
    ribbonArrowHalfWidth: number;
    ribbonArrowLen: number;
    helixRadius: number;
    loopRadius: number;
    ribbonThickness: number;
  };
  /** For labels / aria summary. */
  meta: {
    helices: number;
    strands: number;
    strandCount?: number;
    tiltDeg?: number;
    shear?: number;
  };
}
```

**Frame convention** matches the spike: membrane normal is the vertical axis in
both spaces. Flat position = `(arc, z, 0)`; solid position = `pos3d` remapped so
the membrane normal stays vertical. `pos3d` is the de-spiralled smooth backbone
axis (what `unrollChain` already computes and now retains as `x3/y3`; `z` is the
real depth).

---

## 4. Phase 1 — extract `TopologyScene`, move SVG onto it (no visual change)

The load-bearing refactor. Ships on its own, user-invisible, guarded by the
Playwright gallery visual-regression snapshots. Done in small PRs, each green.

### 4.1 Scene builder

New `src/scene/build.ts`: `buildScene(chain, analysis, opts, assembly?) → TopologyScene`.
Absorbs the geometry-deciding half of `renderChainSvg`:

- Run the existing `unrollChain` / `unwrapBarrel` / `unwrapAssembly` and
  `layoutSegments` / `barrelLayout` (unchanged).
- Reuse `runsBySs` to split each segment into SS runs → `RibbonElement` /
  `HelixElement`; coil/connector spans → `LoopElement`.
- Populate `samples` with `{arc, z, pos3d}`:
  - `arc, z` from the laid-out display samples.
  - `pos3d` from the retained `x3/y3` + `z` (helical) — see §4.4 for barrels.
- Resolve loop control points by calling the **moved** `buildLoopPoints` logic
  (now in scene space, see §4.3).
- Build `contacts` from `analyseBarrel` + the **moved** `drawContacts` geometry.
- Fill `meta`, `style` (from `SS_BODY` etc.), `faded` from assembly focal flags.

### 4.2 Ribbon/arrow outline → pure function

Extract the vertex math in `drawSsPolygon` (screen-space tangents, arrowhead
base walk, left/right edge traversal) into
`src/scene/geometry/ribbonOutline.ts`:
`ribbonOutline(samples, style, {arrow}) → {x,y}[]` in display (arc,z) units. The
SVG renderer maps these to a `<polygon>`; the 3-D renderer sweeps the same
half-width profile. Unit-test vertex coordinates against current output.

### 4.3 Loop path → pure function

Move `buildLoopPoints` + `unitTangent` + extreme-point logic into
`src/scene/geometry/loopPath.ts`, returning the control-point list (already the
`LoopControlPoint` shape). `renderLoopCurve` stays in the SVG renderer but reads
the control points from the scene. The Catmull-Rom→bézier conversion
(`catmullRomBezier`) is reused by both.

### 4.4 3-D positions for every centreline sample

- **Helical:** done — `unrollChain` retains `x3/y3`; `pos3d = {x3, y3, z}`. Thread
  through `layoutSegments` (currently drops extra fields — spread `...p` then
  override `arc`).
- **Barrel (`unwrapBarrel`):** retain the real Cα-derived 3-D path. Two options,
  **decision needed (§7):** (a) reconstruct on the cylinder from the _un-shifted_
  unwrap angle `θ = u/R` → `pos3d = (cx + R cosθ, cy + R sinθ, z)` (idealised,
  clean roll), or (b) retain the real de-spiralled `proj` coords sampled in
  lockstep (honest, shows real barrel deformation). Recommend **(b)** for
  consistency with the project's "geometry from real coordinates" ethos; (a) is
  the prettier fallback.
- **Assembly (`unwrapAssembly`):** same as barrel, per protomer.
- **Loops:** `pos3d` from the residues' real coordinates (dense via the same
  spline parameterisation). The 2-D schematic bézier and the 3-D real path do not
  correspond 1:1; the morph blends each loop sample between its scheduled 2-D
  control-curve position and its real `pos3d` (acceptable — loops are secondary).

### 4.5 SVG renderer reads the scene

Rewrite `renderChainSvg` as `renderSceneSvg(scene, opts) → SVGSVGElement`:
membrane slab, midline, then per element draw polygon/loop/labels from
`scene.elements`, contacts from `scene.contacts`, viewBox expansion for labels.
**No geometry computed here** — only DOM creation + styling + label collision
placement (`placeResidueLabel`, which stays SVG-side as it's screen-space).
`TopologyDisplay.render` calls `buildScene` then `renderSceneSvg`. Chain picker,
violins, chain labels, notes stay in the component (per-protein UI, not per-chain
scene).

### 4.6 Tests & gate

- New unit tests for `ribbonOutline`, `loopPath`, `buildScene` (assert element
  counts, sample continuity, pos3d presence).
- **All existing unit tests stay green** (154 today).
- **Playwright gallery snapshots unchanged** — the definition of done for Phase 1.
- Sequencing: (1) types + `buildScene` calling existing code; (2) ribbon outline;
  (3) loop path; (4) contacts + label anchors; (5) flip `renderChainSvg`, delete
  dead inline geometry. Each step a green PR.

---

## 5. Phase 2 — production Three.js backend (static 3-D)

`src/render-3d/` consuming `TopologyScene`. **Lazy-loaded**: the component does
`await import('../render-3d/index.js')` only when the user switches to 3-D, so
Three.js never enters the core bundle.

- `buildMeshes(scene)` — swept ribbons (strands), cylinders (helices), tubes
  (loops/coil), membrane slab; parallel-transport frames with the camera-facing
  ribbon normal from the spike (`src/spike/three-view.ts` is the reference).
- Render the two static endpoints first: t=0 (flat) and t=1 (solid). Verify t=0
  reproduces the SVG (shared scene ⇒ identical placement by construction; add a
  Playwright check comparing the SVG and a t=0 WebGL screenshot within tolerance).
- **Bundle gate:** assert via the build that `three` is in a separate chunk and
  absent from the core entry (`src/index.ts`).

---

## 6. Phase 3 — morph, camera, toggle UI

- Morph parameter `t∈[0,1]` with the N→C travelling wavefront
  `tLocal = smoothstep(clamp((t·(1+w) − arcFrac)/w))` (spike-proven).
- Camera: locked dead-on near-orthographic at t=0 → eased to ~35 mm perspective
  3/4 view; OrbitControls active only when fully 3-D (spike-proven).
- `TopologyDisplay`: add a 2-D/3-D toggle + scrub/play, **defaulting to 2-D/SVG**.
  3-D is opt-in. Honour `prefers-reduced-motion` (jump to endpoints, no auto-run).
- SVG export path untouched and always available regardless of view.

---

## 7. Phase 4 — polish, docs, tests

- Materials/shading, geometry outlines (e.g. an outline pass or `EdgesGeometry`),
  proper ribbon arrowhead caps and end caps, anti-aliasing, colour parity with
  `SS_STYLE`. (The spike is deliberately rough — this is where it gets to release
  quality.)
- `docs/rendering-3d.md`: the scene model, the real-structure morph, wavefront +
  camera model, and the explicit spiral limitation.
- Update `AI.md`; gallery additions for the 3-D endpoints; unit + visual tests.

---

## 8. Risks & mitigations

| Risk                                               | Mitigation                                                                     |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| SVG-refactor visual regressions (Phase 1, biggest) | Incremental PRs; gallery snapshots are the gate; keep all constants identical. |
| Three.js leaking into core bundle                  | Dynamic `import()`; build-time chunk assertion.                                |
| Barrel/assembly `pos3d` correctness                | Decide §7 option (a)/(b); unit-test the cylinder/real reconstruction.          |
| Loop 2-D↔3-D non-correspondence                    | Accept schematic-vs-real blend for loops; document it.                         |
| Performance on large assemblies (α-hemolysin)      | Build meshes once; morph by vertex update; cap sample density.                 |
| Label placement differs 2-D vs 3-D                 | Keep 2-D collision placement SVG-side; 3-D uses billboards (Phase 3+).         |

## 9. Open questions for Tom

1. **Barrel 3-D target:** idealised cylinder roll (clean) vs real de-spiralled
   coords (honest, shows deformation)? _Recommend honest (§4.4b)._
2. **3-D as first-class or feature-flagged** for the first release that includes
   it?
3. **Toggle UX:** a per-diagram 2-D/3-D switch with a scrubber + play, defaulting
   to 2-D — confirm that's the shape you want.

---

## 10. Definition of done (per phase)

- **P1:** `TopologyScene` exists; SVG renders entirely from it; all unit tests +
  gallery snapshots unchanged. No user-visible change.
- **P2:** 3-D backend renders static t=0/t=1 from the scene; t=0 matches SVG
  within tolerance; `three` confirmed out of the core bundle.
- **P3:** in-component 2-D/3-D toggle with morph + camera ease; 2-D default; SVG
  export intact; reduced-motion respected.
- **P4:** release-quality 3-D look; docs + tests; `AI.md` updated.
