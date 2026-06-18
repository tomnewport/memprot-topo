/**
 * Build a {@link TopologyScene} from a chain (issue #22, Phase 1 increment 2).
 *
 * This wraps the existing unroll + layout pipeline and emits the renderer-
 * agnostic scene. It is **not yet consumed by the SVG renderer** (that is
 * increment 5), so it cannot change any rendered output.
 *
 * Scope of this increment: the plain (helical / arc-length) path — elements with
 * dual flat+3-D centrelines, residues, style and meta. Still TODO (later
 * increments): β-barrel / assembly layouts (`unwrapBarrel`/`unwrapAssembly`),
 * resolved loop control points (§4.3), and β-sheet contacts (§4.4).
 *
 * NOTE: the imports from `../components/topology-display.js` are transitional.
 * The plan (`docs/3d-renderer-plan.md` §4.6) inverts this dependency at increment
 * 5, when the layout helpers move into `src/scene/` and the component consumes
 * the scene rather than the reverse.
 */
import type { ChainData } from '../types.js';
import { unrollChain } from '../unroll/index.js';
import {
  effectiveSsSegments,
  layoutSegments,
  type SegmentLayout,
  type SsRun,
} from '../components/topology-display.js';
import { SS_BODY } from '../components/topology-display.js';
import type {
  HelixElement,
  LoopElement,
  RibbonElement,
  SceneElement,
  SceneResidue,
  SceneSample,
  SceneStyle,
  TopologyScene,
  Vec3,
} from './types.js';

/** Membrane bilayer half-thickness (Å) — matches the SVG renderer's `PLOT`. */
const MEMBRANE_HALF = 15;

/** 3-D cross-section dimensions (Å). Strand ribbon ~1 nm × 0.25 nm. */
const SCENE_3D = {
  ribbonThickness: 2.5,
  helixRadius: 2.6,
  loopRadius: 0.7,
};

function pos3dOf(p: { z: number; x3?: number; y3?: number }): Vec3 {
  return { x: p.x3 ?? 0, y: p.y3 ?? 0, z: p.z };
}

/** Slice a layout's display samples for one run into scene samples. */
function runSamples(layout: SegmentLayout, run: SsRun): SceneSample[] {
  const out: SceneSample[] = [];
  for (let i = run.startSample; i <= run.endSample && i < layout.samples.length; i++) {
    const p = layout.samples[i];
    out.push({ arc: p.arc, z: p.z, pos3d: pos3dOf(p) });
  }
  return out;
}

/** Map a run's residues to scene residues, re-basing `sampleIndex` to the run. */
function runResidues(layout: SegmentLayout, run: SsRun): SceneResidue[] {
  const out: SceneResidue[] = [];
  for (let r = run.residueStart; r <= run.residueEnd && r < layout.residues.length; r++) {
    const res = layout.residues[r];
    const sample = layout.samples[res.sampleIndex];
    out.push({
      resSeq: res.resSeq,
      iCode: res.iCode,
      arc: sample?.arc ?? 0,
      z: res.z,
      pos3d: sample ? pos3dOf(sample) : { x: 0, y: 0, z: res.z },
      sampleIndex: Math.max(0, res.sampleIndex - run.startSample),
    });
  }
  return out;
}

/**
 * Build the topology scene for a chain. Plain (non-barrel) path only for now.
 */
export function buildScene(chain: ChainData): TopologyScene {
  const ss = effectiveSsSegments(chain.segments);
  const unroll = unrollChain(chain.calphas, { ssSegments: ss });
  const { layouts, totalArc } = layoutSegments(unroll.segments, ss);

  const elements: SceneElement[] = [];
  let helices = 0;
  let strands = 0;

  for (const layout of layouts) {
    for (const run of layout.runs) {
      const samples = runSamples(layout, run);
      if (samples.length < 2) continue;
      const residues = runResidues(layout, run);
      if (run.type === 'helix') {
        helices++;
        const el: HelixElement = { type: 'helix', samples, residues, faded: false, arrow: false };
        elements.push(el);
      } else if (run.type === 'strand') {
        strands++;
        const el: RibbonElement = { type: 'strand', samples, residues, faded: false, arrow: true };
        elements.push(el);
      } else {
        // Coil run → loop. Schematic control points are resolved in increment 3;
        // for now the loop carries its real centreline only.
        const el: LoopElement = {
          type: 'loop',
          samples,
          residues,
          faded: false,
          control: [],
          dashed: false,
        };
        elements.push(el);
      }
    }
  }

  const style: SceneStyle = {
    ribbonHalfWidth: SS_BODY.halfWidthPx,
    ribbonArrowHalfWidth: SS_BODY.arrowHalfWidthPx,
    ribbonArrowLen: SS_BODY.arrowLengthPx,
    ribbonThickness: SCENE_3D.ribbonThickness,
    helixRadius: SCENE_3D.helixRadius,
    loopRadius: SCENE_3D.loopRadius,
  };

  return {
    chainId: chain.chainId,
    kind: 'helical',
    membrane: { half: MEMBRANE_HALF },
    arcSpan: totalArc,
    zRange: { min: unroll.zMin, max: unroll.zMax },
    elements,
    contacts: [],
    style,
    meta: { helices, strands },
  };
}
