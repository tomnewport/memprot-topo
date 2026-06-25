# 2D ⇄ 3D morph spike (issue #22)

**Throwaway Phase 0 prototype** exploring the animated transition between the
flat 2-D topology diagram and a 3-D view of the same elements. This is a
proof-of-concept to evaluate the look and feel before committing to the
production "shared topology scene" refactor — not production code.

## Run it

```bash
npm run prebuild:spike   # fetches OPM structures → src/spike/spike-data.ts (gitignored)
npm run dev              # then open http://localhost:5173/spike.html
```

Drag the slider (or press Play) to roll the flat diagram up into 3-D. Drag to
orbit, scroll to zoom.

## What it demonstrates

- **Shared model.** `scene.ts` builds a renderer-agnostic element list where each
  centreline sample carries **both** its flat 2-D position and its real 3-D
  position. The Three.js view (`three-view.ts`) interpolates between them.
- **Roll-up wavefront.** The morph proceeds from the N-terminus along the chain
  (`tLocal = clamp((t·(1+w) − arcFrac)/w)`), so the structure rolls up from the
  left rather than all at once.
- **3-D targets.** Helical bundles lift the flat trace into the retained real
  backbone axis (`unrollChain` now keeps `x3/y3`). β-barrels wrap the honest
  cylindrical unwrap (`arc = R·θ`) straight back onto the cylinder.
- **Camera ease.** Near-orthographic (long lens) at the flat end → ~35 mm-equiv
  perspective at the 3-D end.
- **Representations.** β-strands → ribbons, α-helices → cylinders, coil → tubes.
  No helical spirals yet (deferred, per the issue).

## Known spike-only shortcuts (production would fix)

- Secondary structure is assigned from Cα geometry (`ca-ss.ts`) because the
  OPM-processed PDBs carry unreliable HELIX/SHEET records and the pdb-redo DSSP
  endpoint is blocked here. Production uses real DSSP.
- The flat layout uses the raw arc-length unroll, **not** the production
  fixed-gap `layoutSegments`/`barrelLayout` placement. Reconciling the two is
  Phase 1 work.
- Geometry is rebuilt each frame; parallel-transport framing is approximate.
