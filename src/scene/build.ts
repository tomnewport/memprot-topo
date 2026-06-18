/**
 * Build a {@link TopologyScene} from a chain (issue #22, Phase 1).
 *
 * This wraps the existing unroll + layout pipeline and emits the renderer-
 * agnostic scene. It is **not yet consumed by the SVG renderer** (that is
 * increment 5), so it cannot change any rendered output.
 *
 * Covers the plain (helical / arc-length) and single-chain β-barrel paths —
 * elements with dual flat+3-D centrelines, residues, β-sheet contacts, style and
 * meta. Still TODO (later increments): multi-chain assembly barrels
 * (`unwrapAssembly`) and resolved loop control points (§4.3).
 *
 * NOTE: the imports from `../components/topology-display.js` are transitional.
 * The plan (`docs/3d-renderer-plan.md` §4.6) inverts this dependency at increment
 * 5, when the layout helpers move into `src/scene/` and the component consumes
 * the scene rather than the reverse.
 */
import type { ChainData, SecondaryStructureSegment } from '../types.js';
import { unrollChain, unwrapBarrel } from '../unroll/index.js';
import { analyseBarrel } from '../contacts/index.js';
import { contactLines } from './geometry/contacts.js';
import {
  effectiveSsSegments,
  layoutSegments,
  barrelLayout,
  barrelWallSegments,
  SS_BODY,
  type SegmentLayout,
  type SsRun,
} from '../components/topology-display.js';
import type {
  HelixElement,
  LoopElement,
  RibbonElement,
  SceneContact,
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

/** Build scene elements from laid-out segments. Shared by both pipeline paths. */
function elementsFromLayouts(layouts: SegmentLayout[]): {
  elements: SceneElement[];
  helices: number;
  strands: number;
} {
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
  return { elements, helices, strands };
}

const STYLE: SceneStyle = {
  ribbonHalfWidth: SS_BODY.halfWidthPx,
  ribbonArrowHalfWidth: SS_BODY.arrowHalfWidthPx,
  ribbonArrowLen: SS_BODY.arrowLengthPx,
  ribbonThickness: SCENE_3D.ribbonThickness,
  helixRadius: SCENE_3D.helixRadius,
  loopRadius: SCENE_3D.loopRadius,
};

/**
 * Build the topology scene for a single chain.
 *
 * Handles the plain (helical / arc-length) path and the closed single-chain
 * β-barrel path (cylindrical unwrap), including β-sheet contacts. Multi-chain
 * assembly barrels and loop control points are added in later increments.
 */
export function buildScene(chain: ChainData): TopologyScene {
  const effective = effectiveSsSegments(chain.segments);
  const analysis = analyseBarrel(chain.calphas, effective);

  let layouts: SegmentLayout[];
  let totalArc: number;
  let zRange: { min: number; max: number };
  let kind: TopologyScene['kind'];
  const meta: TopologyScene['meta'] = { helices: 0, strands: 0 };

  if (analysis.cylindrical) {
    const ssSegments: SecondaryStructureSegment[] = barrelWallSegments(analysis, effective);
    const unroll = unwrapBarrel(chain.calphas, { ssSegments, centre: analysis.centre });
    ({ layouts, totalArc } = barrelLayout(unroll.segments, ssSegments));
    zRange = { min: unroll.zMin, max: unroll.zMax };
    kind = 'barrel';
    meta.strandCount = analysis.strandCount;
    meta.tiltDeg = analysis.tiltDeg;
    meta.shear = analysis.shear;
  } else {
    const unroll = unrollChain(chain.calphas, { ssSegments: effective });
    ({ layouts, totalArc } = layoutSegments(unroll.segments, effective));
    zRange = { min: unroll.zMin, max: unroll.zMax };
    kind = 'helical';
  }

  const { elements, helices, strands } = elementsFromLayouts(layouts);
  meta.helices = helices;
  meta.strands = strands;

  return {
    chainId: chain.chainId,
    kind,
    membrane: { half: MEMBRANE_HALF },
    arcSpan: totalArc,
    zRange,
    elements,
    contacts: analysis.cylindrical ? barrelContacts(analysis, layouts) : [],
    style: STYLE,
    meta,
  };
}

/** Resolve β-sheet contact ties with 3-D positions from the laid-out residues. */
function barrelContacts(
  analysis: ReturnType<typeof analyseBarrel>,
  layouts: SegmentLayout[],
): SceneContact[] {
  // resSeq → real 3-D position, via each residue's display sample.
  const pos3dByRes = new Map<number, Vec3>();
  for (const layout of layouts) {
    for (const r of layout.residues) {
      const s = layout.samples[r.sampleIndex];
      if (s) pos3dByRes.set(r.resSeq, { x: s.x3 ?? 0, y: s.y3 ?? 0, z: s.z });
    }
  }
  return contactLines(analysis, layouts).map((ln) => ({
    a: {
      arc: ln.a.arc,
      z: ln.a.z,
      pos3d: pos3dByRes.get(ln.a.resSeq) ?? { x: 0, y: 0, z: ln.a.z },
    },
    b: {
      arc: ln.b.arc,
      z: ln.b.z,
      pos3d: pos3dByRes.get(ln.b.resSeq) ?? { x: 0, y: 0, z: ln.b.z },
    },
  }));
}
