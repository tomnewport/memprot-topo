/**
 * Build a {@link TopologyScene} from a chain (issue #22, Phase 1).
 *
 * Both renderers now share one placement pipeline: `buildScene` and the SVG
 * `renderChainSvg` both call {@link planChainLayout}, so the scene reflects
 * exactly the same element placement the SVG draws. Covers all three paths —
 * helical (arc-length), single-chain β-barrel, and multi-chain assembly barrel —
 * with dual flat+3-D centrelines, residues, β-sheet contacts, style and meta.
 * Still TODO: resolved loop control points (§4.3).
 *
 * NOTE: the imports from `../components/topology-display.js` are transitional.
 * The plan (`docs/3d-renderer-plan.md` §4.6) inverts this dependency in a later
 * cleanup, when the placement pipeline moves into `src/scene/` and the component
 * imports it rather than the reverse.
 */
import type { ChainData } from '../types.js';
import { analyseBarrel, type BarrelAnalysis } from '../contacts/index.js';
import { contactLines } from './geometry/contacts.js';
import {
  effectiveSsSegments,
  planChainLayout,
  PLOT,
  SS_BODY,
  type AssemblyContext,
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

/** 3-D cross-section dimensions (Å). */
const SCENE_3D = {
  ribbonThickness: 1.4,
  helixRadius: 2.4,
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
 * Build scene elements from laid-out segments. `focalFlags` (assembly only)
 * marks which segments are the focal protomer; the rest render desaturated.
 */
function elementsFromLayouts(
  layouts: SegmentLayout[],
  focalFlags: boolean[] | null,
): {
  elements: SceneElement[];
  helices: number;
  strands: number;
} {
  const elements: SceneElement[] = [];
  let helices = 0;
  let strands = 0;
  for (let s = 0; s < layouts.length; s++) {
    const layout = layouts[s];
    const faded = focalFlags ? !focalFlags[s] : false;
    for (const run of layout.runs) {
      const samples = runSamples(layout, run);
      if (samples.length < 2) continue;
      const residues = runResidues(layout, run);
      if (run.type === 'helix') {
        helices++;
        elements.push({ type: 'helix', samples, residues, faded, arrow: false } as HelixElement);
      } else if (run.type === 'strand') {
        strands++;
        elements.push({ type: 'strand', samples, residues, faded, arrow: true } as RibbonElement);
      } else {
        // Coil run → loop. Schematic control points are resolved in a later
        // increment; for now the loop carries its real centreline only.
        const el: LoopElement = {
          type: 'loop',
          samples,
          residues,
          faded,
          control: [],
          dashed: false,
        };
        elements.push(el);
      }
    }
  }
  return { elements, helices, strands };
}

// Ribbon body/arrow dimensions are the SVG's screen-pixel sizes converted to Å
// (the scene's coordinate space) so a renderer that knows nothing of the SVG
// pixel scale still draws an element matching the 2-D diagram at the flat end.
const STYLE: SceneStyle = {
  ribbonHalfWidth: SS_BODY.halfWidthPx / PLOT.arcPxPerA,
  ribbonArrowHalfWidth: SS_BODY.arrowHalfWidthPx / PLOT.arcPxPerA,
  ribbonArrowLen: SS_BODY.arrowLengthPx / PLOT.arcPxPerA,
  ribbonThickness: SCENE_3D.ribbonThickness,
  helixRadius: SCENE_3D.helixRadius,
  loopRadius: SCENE_3D.loopRadius,
};

/** Options for {@link buildScene}; both are optional and computed if omitted. */
export interface BuildSceneOptions {
  /** β-sheet analysis for the chain (recomputed from Cα if absent). */
  analysis?: BarrelAnalysis;
  /** Assembly-barrel context, when this chain is one protomer of a shared ring. */
  assembly?: AssemblyContext;
}

/**
 * Build the renderer-agnostic {@link TopologyScene} for a chain, via the shared
 * {@link planChainLayout} pipeline so it reflects exactly the same element
 * placement the SVG renderer draws. Handles the helical, single-chain β-barrel,
 * and multi-chain assembly-barrel paths (the last when `assembly` is supplied).
 */
export function buildScene(chain: ChainData, options: BuildSceneOptions = {}): TopologyScene {
  const analysis =
    options.analysis ?? analyseBarrel(chain.calphas, effectiveSsSegments(chain.segments));
  const plan = planChainLayout(chain, analysis, options.assembly);
  const { layouts, totalArc, focalFlags, zMin, zMax, asm, cylindrical } = plan;

  const kind: TopologyScene['kind'] = asm ? 'assembly' : cylindrical ? 'barrel' : 'helical';
  const meta: TopologyScene['meta'] = { helices: 0, strands: 0 };
  if (asm && options.assembly) {
    meta.strandCount = options.assembly.analysis.strandCount;
    meta.tiltDeg = options.assembly.analysis.tiltDeg;
  } else if (cylindrical) {
    meta.strandCount = analysis.strandCount;
    meta.tiltDeg = analysis.tiltDeg;
    meta.shear = analysis.shear;
  }

  const { elements, helices, strands } = elementsFromLayouts(layouts, focalFlags);
  meta.helices = helices;
  meta.strands = strands;

  return {
    chainId: chain.chainId,
    kind,
    membrane: { half: MEMBRANE_HALF },
    arcSpan: totalArc,
    zRange: { min: zMin, max: zMax },
    elements,
    // Single-chain barrel contacts only (matches the SVG's `useUnwrap && !asm`).
    contacts: cylindrical && !asm ? barrelContacts(analysis, layouts) : [],
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
