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
import { sampleCurve, type Vec } from '../unroll/index.js';
import { contactLines } from './geometry/contacts.js';
import { buildLoopPoints, type LoopRenderOptions } from './geometry/loop-path.js';
import {
  effectiveSsSegments,
  planChainLayout,
  trimStrandEnd,
  PLOT,
  SS_BODY,
  LOOP,
  LOOP_GEOM,
  BARREL,
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

/** Number of samples per loop control-segment when tracing the schematic bézier. */
const LOOP_SAMPLE_DENSITY = 8;

/** Slice an SS run's body samples (start → residue end) into scene samples. */
function ssSamples(layout: SegmentLayout, startSample: number, endSample: number): SceneSample[] {
  const out: SceneSample[] = [];
  for (let i = startSample; i <= endSample && i < layout.samples.length; i++) {
    const p = layout.samples[i];
    out.push({ arc: p.arc, z: p.z, pos3d: pos3dOf(p) });
  }
  return out;
}

function isSs(run: SsRun | undefined): run is SsRun {
  return !!run && (run.type === 'helix' || run.type === 'strand');
}

/** Linearly resample a 3-D path to exactly `count` points. */
function resample(path: Vec[], count: number): Vec[] {
  if (path.length === 0) return Array.from({ length: count }, () => ({ x: 0, y: 0, z: 0 }));
  if (path.length === 1) return Array.from({ length: count }, () => ({ ...path[0] }));
  const out: Vec[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / (count - 1)) * (path.length - 1);
    const lo = Math.floor(t);
    const f = t - lo;
    const a = path[lo];
    const b = path[Math.min(lo + 1, path.length - 1)];
    out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f });
  }
  return out;
}

/**
 * Build a loop element between two SS runs. Its flat path is the SVG's schematic
 * bézier (so the 2-D and 3-D views overlay at t=0); its 3-D path is the real
 * backbone from the previous SS end through the coil to the next SS start.
 */
function loopElement(
  layout: SegmentLayout,
  loopRun: SsRun,
  prevRun: SsRun | null,
  nextRun: SsRun | null,
  opts: LoopRenderOptions,
  faded: boolean,
): LoopElement | null {
  const prev = prevRun ? { samples: layout.samples, index: prevRun.endResSampleIdx } : null;
  const next = nextRun ? { samples: layout.samples, index: nextRun.startSample } : null;
  const extreme = {
    samples: layout.samples,
    startSample: loopRun.startSample,
    endSample: loopRun.endSample,
  };
  const control = buildLoopPoints(prev, next, extreme, opts, LOOP_GEOM);
  if (control.length < 2) return null;

  // Flat path = the schematic bézier sampled densely (matches the SVG curve).
  const flat = sampleCurve(
    control.map((c) => ({ x: c.arc, y: c.z, z: 0 })),
    LOOP_SAMPLE_DENSITY,
  ).samples;

  // Real 3-D path along the actual backbone over the same span, resampled to pair.
  const realStart = prev ? prev.index : loopRun.startSample;
  const realEnd = next ? next.index : loopRun.endSample;
  const realPath: Vec[] = [];
  for (let i = realStart; i <= realEnd && i < layout.samples.length; i++) {
    realPath.push(pos3dOf(layout.samples[i]));
  }
  const solid = resample(realPath, flat.length);

  const samples: SceneSample[] = flat.map((fp, i) => ({
    arc: fp.x,
    z: fp.y,
    pos3d: solid[i],
  }));
  return { type: 'loop', samples, residues: [], faded, control, dashed: false };
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
  barrel: boolean,
  isAssembly: boolean,
): {
  elements: SceneElement[];
  helices: number;
  strands: number;
} {
  const elements: SceneElement[] = [];
  let helices = 0;
  let strands = 0;
  // Loop curvature options mirror renderChainSvg: barrel hairpins lean over with
  // long tangents and no vertical-extreme points; arc-length loops bulge out.
  const loopOpts: LoopRenderOptions = barrel
    ? {
        showPoints: false,
        extremePoints: false,
        extremeThreshold: LOOP.extremeThreshold,
        tangentMagPx: BARREL.loopTangentPx,
      }
    : { showPoints: false, extremePoints: true, extremeThreshold: LOOP.extremeThreshold };

  for (let s = 0; s < layouts.length; s++) {
    const layout = layouts[s];
    const faded = focalFlags ? !focalFlags[s] : false;
    // Trim barrel strand ends exactly as drawSegment does so SS bodies and the
    // loops that join them line up with the SVG.
    const runs = barrel
      ? layout.runs.map((run) =>
          run.type === 'strand'
            ? {
                ...run,
                endResSampleIdx: trimStrandEnd(
                  layout.samples,
                  run.startSample,
                  run.endResSampleIdx,
                ),
              }
            : run,
        )
      : layout.runs;
    const hasBreakBefore = !isAssembly && s > 0;
    const hasBreakAfter = !isAssembly && s < layouts.length - 1;

    for (let j = 0; j < runs.length; j++) {
      const run = runs[j];
      if (run.type === 'helix' || run.type === 'strand') {
        const samples = ssSamples(layout, run.startSample, run.endResSampleIdx);
        if (samples.length < 2) continue;
        const residues = runResidues(layout, run);
        if (run.type === 'helix') {
          helices++;
          elements.push({ type: 'helix', samples, residues, faded, arrow: false } as HelixElement);
        } else {
          strands++;
          elements.push({ type: 'strand', samples, residues, faded, arrow: true } as RibbonElement);
        }
        continue;
      }
      // Coil run → loop connector between the flanking SS elements.
      const prevRun = isSs(runs[j - 1]) ? runs[j - 1] : null;
      const nextRun = isSs(runs[j + 1]) ? runs[j + 1] : null;
      // Leading/trailing coil at a chain break is covered by the cross-break
      // connector in the SVG (omitted from the 3-D scene), so skip it here.
      if (prevRun === null && hasBreakBefore) continue;
      if (nextRun === null && hasBreakAfter) continue;
      const loop = loopElement(layout, run, prevRun, nextRun, loopOpts, faded);
      if (loop) elements.push(loop);
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

  const useUnwrap = !!asm || cylindrical;
  const { elements, helices, strands } = elementsFromLayouts(layouts, focalFlags, useUnwrap, !!asm);
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
