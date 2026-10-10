import type { ChainData } from '../types.js';
import {
  unrollChain,
  unwrapBarrel,
  type CylinderMapping,
  type UnrollResult,
  type Vec,
} from '../unroll/index.js';
import type { BarrelAnalysis } from '../contacts/index.js';
import {
  MEMBRANE_REACH_A,
  membraneProfile,
  reachWeight,
  type LeafletPair,
  type Membrane,
  type MembraneProfile,
  type ProfileAnchor,
} from '../membrane/index.js';
import type { MorphFrame, ResidueSpan, SampleRef } from '../morph/types.js';
import { ssOutline, type OutlinePoint, type OutlineSection } from '../components/ss-outline.js';
import { BARREL, PLOT, SS_BODY } from './constants.js';
import { firstSsRunOf, isBetaBarrel, isSs, lastSsRunOf } from './runs.js';
import {
  barrelLayout,
  barrelWallSegments,
  layoutSegments,
  residueDisplayX,
  trimStrandEnd,
  unwrapAssembly,
  type AssemblyContext,
  type SegmentLayout,
} from './segments.js';
import {
  buildLoopPoints,
  type LoopControlPoint,
  type LoopEnd,
  type LoopExtreme,
  type LoopRenderOptions,
} from './loops.js';
import { residueLabelBox, type LabelBox } from './labels.js';

/** A laid-out chain segment, with the 3-D geometry behind it. */
export interface LayoutSegment extends SegmentLayout {
  /** False for a neighbouring protomer of an assembly barrel (drawn faded, as context). */
  focal: boolean;
  /** Real 3-D membrane-frame position of each sample, when known. */
  positions?: Vec[];
  /** Raw (pre-layout) unwrap arc of each sample — cylinder mode only. */
  unwrapArc?: number[];
  /** Arc → angle mapping of the unwrap this segment came from — cylinder mode only. */
  cylinder?: CylinderMapping;
}

/** A helix or strand, drawn as one outline. */
export interface LayoutElement {
  type: 'helix' | 'strand';
  seg: number;
  /** Inclusive sample range of the element body (a strand's curled end trimmed). */
  start: number;
  end: number;
  withArrow: boolean;
  faded: boolean;
  /** Position in the draw order, shared with {@link LayoutLoop.order}. */
  order: number;
  /** Index range of its residues in the segment's `residues`. */
  residueStart: number;
  residueEnd: number;
  /** Centreline in screen px from the plot origin, one point per sample. */
  centreline: OutlinePoint[];
  /** Outline sections along the centreline (see {@link ssOutline}); empty when there is nothing to draw. */
  sections: OutlineSection[];
  /** Author residue range it stands for in the selection; absent for faded (context) elements. */
  selectable?: ResidueSpan;
}

/** A loop between elements, or the dashed connector across a chain break. */
export interface LayoutLoop {
  /** Control points of the loop curve, in (arc, z) Å. */
  points: LoopControlPoint[];
  discontinuous: boolean;
  faded: boolean;
  /** The dashed connector across a chain break (residue data isn't drawn on it). */
  connector: boolean;
  /** Element end the loop leaves from (null for a leading stub). */
  from: SampleRef | null;
  /** Element start the loop arrives at (null for a trailing stub). */
  to: SampleRef | null;
  /** Segment a stub belongs to (used when one end is null). */
  seg: number;
  order: number;
  /** Residue numbers the loop stands for, in order. */
  residues: number[];
  /** Author residue range it stands for in the selection; absent when it takes no part. */
  selectable?: ResidueSpan;
}

/** A residue-number label at an element end. */
export interface LayoutLabel {
  seg: number;
  sample: number;
  text: string;
  isStart: boolean;
  /** Where it is drawn; null when it has no direction to sit in (not drawn). */
  box: LabelBox | null;
}

/** A β-sheet residue contact between two paired strands. */
export interface LayoutTie {
  a: SampleRef & { arc: number; z: number };
  b: SampleRef & { arc: number; z: number };
}

/**
 * Everything the views need to draw one chain, with no DOM and no theme: the
 * laid-out segments in display (arc, z) Å, the elements, loops and labels in
 * draw order, the membrane profile and the picture's frame. The 2-D painter,
 * the 3-D scene and the sequence view are all built from this.
 */
export interface ChainLayout {
  chainId: string;
  /** `polyline`: arc-length unroll. `cylinder`: cylindrical unwrap about a β-barrel axis. */
  mode: 'polyline' | 'cylinder';
  /** Strands in the multi-chain assembly barrel this chain is drawn in; null otherwise. */
  assemblyStrands: number | null;
  segments: LayoutSegment[];
  elements: LayoutElement[];
  loops: LayoutLoop[];
  labels: LayoutLabel[];
  /** β-sheet contacts, when shown; null when the contacts layer isn't drawn. */
  ties: LayoutTie[] | null;
  membrane: { bulk: LeafletPair; annular: LeafletPair; profile: MembraneProfile };
  /** The picture's frame: plot origin and viewBox, before any legend. */
  frame: MorphFrame;
  /** Whether every sample has a 3-D position, so the chain can be shown in 3-D. */
  morphable: boolean;
}

/**
 * Per residue of the diagram: its x, the local leaflet heights under it (with
 * a distortions file), and how far the protein's hold on the membrane reaches
 * there ({@link MEMBRANE_REACH_A}). The annular weight comes from the
 * residue's distance along the membrane plane to the nearest `core` Cα (the
 * transmembrane segments of every chain); the local weight from its distance
 * to the bilayer between the local surfaces (0 inside it). Segments without
 * 3-D positions contribute nothing.
 */
function membraneAnchors(
  layouts: SegmentLayout[],
  unroll: UnrollResult,
  membrane: Membrane,
  core: readonly { x: number; y: number }[],
): ProfileAnchor[] {
  const { surfaces, annular } = membrane;
  const full2 = MEMBRANE_REACH_A.annular.full ** 2;
  const anchors: ProfileAnchor[] = [];
  layouts.forEach((layout, s) => {
    const positions = unroll.segments[s]?.positions;
    if (!positions || positions.length !== layout.samples.length) return;
    const xs = residueDisplayX(layout);
    layout.residues.forEach((r, i) => {
      const x = xs[i];
      const p = positions[r.sampleIndex];
      if (x === null || !p) return;
      const upper = surfaces ? surfaces.upper.heightAt(p.x, p.y) : null;
      const lower = surfaces ? surfaces.lower.heightAt(p.x, p.y) : null;
      let near2 = Infinity;
      for (const c of core) {
        near2 = Math.min(near2, (p.x - c.x) ** 2 + (p.y - c.y) ** 2);
        if (near2 <= full2) break;
      }
      const toBilayer = Math.max(0, p.z - (upper ?? annular.upper), (lower ?? annular.lower) - p.z);
      anchors.push({
        x,
        upper,
        lower,
        annularWeight: reachWeight(Math.sqrt(near2), MEMBRANE_REACH_A.annular),
        localWeight: reachWeight(toBilayer, MEMBRANE_REACH_A.local),
      });
    });
  });
  return anchors;
}

/** Whether a loop's residue numbers skip any (missing residues). */
function hasSequenceGap(residues: { resSeq: number }[]): boolean {
  for (let i = 1; i < residues.length; i++) {
    if (residues[i].resSeq - residues[i - 1].resSeq > 1) return true;
  }
  return false;
}

/**
 * Lay out one chain: unroll (or unwrap) it, place its elements a fixed gap
 * apart, route the loops, place the residue-number labels and fit the
 * membrane profile under it. Pure: same inputs, same layout.
 */
export function layoutChain(
  chain: ChainData,
  opts: LoopRenderOptions,
  analysis: BarrelAnalysis,
  showContacts: boolean,
  membrane: Membrane,
  /** xy of every chain's membrane-core Cα: the transmembrane segments. */
  core: readonly { x: number; y: number }[],
  assembly?: AssemblyContext,
): ChainLayout {
  // Assembly barrels (multi-chain, e.g. α-hemolysin's heptameric stem) unwrap
  // every protomer around a shared cylinder; a single closed cylindrical barrel
  // unwraps by angle; everything else uses the arc-length unroll.
  const asm = assembly
    ? unwrapAssembly(assembly.chains, assembly.analysis, assembly.focalChainId)
    : null;
  const useUnwrap = asm !== null || analysis.cylindrical;
  // In barrel mode only the wall strands are drawn as strands; any β-strands
  // that fold inside the barrel (e.g. OmpF's L3) sit near the axis where the
  // unwrap angle is meaningless, so they read as part of the connecting loop.
  const ssSegments = asm
    ? asm.wallSegments
    : analysis.cylindrical
      ? barrelWallSegments(analysis, chain.segments)
      : chain.segments;
  const unroll: UnrollResult = asm
    ? { segments: asm.segments, totalArcLength: 0, zMin: asm.zMin, zMax: asm.zMax }
    : analysis.cylindrical
      ? unwrapBarrel(chain.calphas, { ssSegments, centre: analysis.centre })
      : unrollChain(chain.calphas, { ssSegments });
  const { layouts, totalArc } = asm
    ? barrelLayout(unroll.segments, ssSegments, true)
    : analysis.cylindrical
      ? barrelLayout(unroll.segments, ssSegments)
      : layoutSegments(unroll.segments, ssSegments);

  // In barrel mode, hairpin loops leave each strand parallel to it (long tangent
  // handles following the strand tilt) and skip the centred vertical-extreme
  // points, so they lean over cleanly instead of rising straight up.
  const loopOpts: LoopRenderOptions = useUnwrap
    ? { ...opts, extremePoints: false, tangentMagPx: BARREL.loopTangentPx }
    : opts;

  // Membrane behind the diagram: bulk at its ends; under the residues, the
  // annular leaflets near the transmembrane segments and the local surface
  // near the bilayer, when a distortions file gives one.
  const profile = membraneProfile({
    x0: 0,
    x1: totalArc,
    bulk: membrane.bulk,
    annular: membrane.annular,
    anchors: membraneAnchors(layouts, unroll, membrane, core),
    pxPerA: PLOT.arcPxPerA,
  });
  const membraneReach = Math.max(...profile.upper.map(Math.abs), ...profile.lower.map(Math.abs));
  const zRange = Math.max(
    PLOT.zRangeMin,
    Math.abs(unroll.zMin),
    Math.abs(unroll.zMax),
    membraneReach,
  );
  const plotWidth = Math.max(200, totalArc * PLOT.arcPxPerA);
  const plotHeight = zRange * 2 * PLOT.zPxPerA;
  const svgWidth = PLOT.margin.left + plotWidth + PLOT.margin.right;
  const svgHeight = PLOT.margin.top + plotHeight + PLOT.margin.bottom;
  const originX = PLOT.margin.left;
  const originY = PLOT.margin.top + plotHeight / 2;

  const segments: LayoutSegment[] = layouts.map((layout, s) => ({
    ...layout,
    focal: asm ? asm.focal[s] : true,
    positions: unroll.segments[s]?.positions,
    unwrapArc: useUnwrap ? unroll.segments[s]?.samples.map((p) => p.arc) : undefined,
    cylinder: useUnwrap ? (asm ? asm.cylinders[s] : unroll.cylinder) : undefined,
  }));

  const barrel = asm !== null || isBetaBarrel(chain);
  const elements: LayoutElement[] = [];
  const loops: LayoutLoop[] = [];
  const labels: LayoutLabel[] = [];
  let order = 0;

  // β-sheet contact ties. (Assembly barrels pool several chains that may share
  // residue numbers, so the single-chain contact map doesn't apply.)
  const ties = showContacts && useUnwrap && !asm ? contactTies(analysis, layouts) : null;

  const label = (seg: number, sample: number, resSeq: number, isStart: boolean): void => {
    const samples = segments[seg].samples;
    if (samples.length < 2) return;
    const text = String(resSeq);
    labels.push({
      seg,
      sample,
      text,
      isStart,
      box: residueLabelBox(samples, sample, text, isStart),
    });
  };

  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s];
    const { samples, residues } = segment;
    const faded = !segment.focal;
    // In an assembly barrel each segment is a separate protomer (separate
    // polypeptide), so there are no cross-segment loops and no leading/trailing
    // coil stubs to absorb — every segment stands alone.
    const hasBreakBefore = !asm && s > 0;
    const hasBreakAfter = !asm && s < segments.length - 1;

    // For barrel strand arrows, trim C-terminal samples that curl away from the
    // strand core axis (DSSP extends boundaries into adjacent turns). The trimmed
    // endResSampleIdx is used for both the polygon tip and the loop start so that
    // the arrowhead lands on the straight β-body and the loop Bezier exits cleanly.
    const runs = barrel
      ? segment.runs.map((run) => {
          if (run.type !== 'strand') return run;
          const trimmed = trimStrandEnd(samples, run.startSample, run.endResSampleIdx);
          return trimmed === run.endResSampleIdx ? run : { ...run, endResSampleIdx: trimmed };
        })
      : segment.runs;

    for (let j = 0; j < runs.length; j++) {
      const run = runs[j];
      if (run.type === 'helix' || run.type === 'strand') {
        const withArrow = barrel && run.type === 'strand';
        if (run.endResSampleIdx > run.startSample) {
          const centreline: OutlinePoint[] = [];
          for (let i = run.startSample; i <= run.endResSampleIdx; i++) {
            centreline.push({
              sx: samples[i].arc * PLOT.arcPxPerA,
              sy: -samples[i].z * PLOT.zPxPerA,
            });
          }
          const sections = ssOutline(centreline, withArrow, {
            halfWidth: SS_BODY.halfWidthPx,
            arrowHalfWidth: SS_BODY.arrowHalfWidthPx,
            arrowLength: SS_BODY.arrowLengthPx,
          });
          elements.push({
            type: run.type,
            seg: s,
            start: run.startSample,
            end: run.endResSampleIdx,
            withArrow,
            faded,
            order: order++,
            residueStart: run.residueStart,
            residueEnd: run.residueEnd,
            centreline,
            sections,
            // Focal-chain elements act as buttons.
            selectable:
              sections.length > 0 && !faded
                ? { start: run.startResSeq, end: run.endResSeq }
                : undefined,
          });
        }
        // Faded neighbouring protomers are context only — don't clutter with labels.
        if (!faded) {
          label(s, run.startSample, run.startResSeq, true);
          if (run.endResSeq !== run.startResSeq)
            label(s, run.endResSampleIdx, run.endResSeq, false);
        }
        continue;
      }
      const prevRun = isSs(runs[j - 1]) ? runs[j - 1] : null;
      const nextRun = isSs(runs[j + 1]) ? runs[j + 1] : null;
      // Skip a leading coil stub at the start of a segment that follows a chain
      // break — the cross-break connector will cover it from the previous SS end.
      if (prevRun === null && hasBreakBefore) continue;
      // Skip a trailing coil stub at the end of a segment followed by a chain
      // break — the cross-break connector will cover it to the next SS start.
      if (nextRun === null && hasBreakAfter) continue;
      const loopResidues = residues.slice(run.residueStart, run.residueEnd + 1);
      const prev: LoopEnd | null = prevRun ? { samples, index: prevRun.endResSampleIdx } : null;
      const next: LoopEnd | null = nextRun ? { samples, index: nextRun.startSample } : null;
      const extreme: LoopExtreme = {
        samples,
        startSample: run.startSample,
        endSample: run.endSample,
      };
      const points = buildLoopPoints(prev, next, extreme, loopOpts);
      // Neighbouring protomers are context only, so only the focal chain's loops
      // take part in the selection.
      const selectable = points.length >= 2 && !faded && loopResidues.length > 0;
      loops.push({
        points,
        discontinuous: hasSequenceGap(loopResidues),
        faded,
        connector: false,
        from: prevRun ? { seg: s, sample: prevRun.endResSampleIdx } : null,
        to: nextRun ? { seg: s, sample: nextRun.startSample } : null,
        seg: s,
        order: order++,
        residues: loopResidues.map((r) => r.resSeq),
        selectable: selectable
          ? { start: loopResidues[0].resSeq, end: loopResidues[loopResidues.length - 1].resSeq }
          : undefined,
      });
    }

    // Dashed connector across a chain break. Anchor at the nearest SS endpoint
    // on each side so that any trailing/leading coil in the adjacent segments is
    // absorbed into this single curve rather than appearing as a separate stub.
    // Assembly protomers are independent chains — no connector between them.
    if (!asm && s > 0) {
      const prevLayout = segments[s - 1];
      const lastSs = lastSsRunOf(prevLayout);
      const firstSs = firstSsRunOf(segment);
      const prev: LoopEnd = lastSs
        ? { samples: prevLayout.samples, index: lastSs.endResSampleIdx }
        : { samples: prevLayout.samples, index: prevLayout.samples.length - 1 };
      const next: LoopEnd = firstSs
        ? { samples, index: firstSs.startSample }
        : { samples, index: 0 };
      const points = buildLoopPoints(prev, next, null, loopOpts);
      // The connector stands for the residues between the two SS ends.
      const from = lastSs
        ? lastSs.endResSeq + 1
        : prevLayout.residues[prevLayout.residues.length - 1]?.resSeq;
      const to = firstSs ? firstSs.startResSeq - 1 : residues[0]?.resSeq;
      const marked = points.length >= 2 && from !== undefined && to !== undefined && from <= to;
      loops.push({
        points,
        discontinuous: true,
        faded: false,
        connector: true,
        from: { seg: s - 1, sample: prev.index },
        to: { seg: s, sample: next.index },
        seg: s,
        order: order++,
        residues: [
          ...prevLayout.residues
            .filter((r) => !lastSs || r.resSeq > lastSs.endResSeq)
            .map((r) => r.resSeq),
          ...residues
            .filter((r) => !firstSs || r.resSeq < firstSs.startResSeq)
            .map((r) => r.resSeq),
        ],
        selectable: marked ? { start: from, end: to } : undefined,
      });
    }
  }

  // Expand the frame to fit all placed labels if they extend beyond it.
  let minX = 0,
    maxX = svgWidth,
    minY = 0,
    maxY = svgHeight;
  for (const { box } of labels) {
    if (!box) continue;
    const left = box.cx - box.w / 2;
    const right = box.cx + box.w / 2;
    const top = box.cy - box.h / 2;
    const bottom = box.cy + box.h / 2;
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  }

  return {
    chainId: chain.chainId,
    mode: useUnwrap ? 'cylinder' : 'polyline',
    assemblyStrands: assembly ? assembly.analysis.strandCount : null,
    segments,
    elements,
    loops,
    labels,
    ties,
    membrane: { bulk: membrane.bulk, annular: membrane.annular, profile },
    frame: {
      originX,
      originY,
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY,
      pxPerA: PLOT.arcPxPerA,
    },
    // Every displayed sample needs its 3-D position, or it would roll up to the
    // origin: without them the chain gets no 3-D view.
    morphable: layouts.every(
      (layout, s) => unroll.segments[s]?.positions?.length === layout.samples.length,
    ),
  };
}

/**
 * The detected β-sheet residue contacts, as ties between paired strands. Only
 * meaningful in the cylindrical-unwrap layout, where residue (arc, z)
 * positions reflect true 3-D adjacency, so a tie reads as "these two residues
 * hydrogen-bond across the sheet".
 */
function contactTies(analysis: BarrelAnalysis, layouts: SegmentLayout[]): LayoutTie[] {
  const pos = new Map<number, { arc: number; z: number; seg: number; sample: number }>();
  for (let s = 0; s < layouts.length; s++) {
    for (const r of layouts[s].residues) {
      pos.set(r.resSeq, { arc: r.arc, z: r.z, seg: s, sample: r.sampleIndex });
    }
  }
  // Only tie pairings between barrel-wall (ring) strands. Strands that fold
  // inside the barrel render as coil at an unreliable arc near the axis, so a
  // tie to them would land at an arbitrary position and read oddly.
  const ring = new Set(analysis.ringOrder);
  const ties: LayoutTie[] = [];
  for (const pairing of analysis.pairings) {
    if (!ring.has(pairing.a) || !ring.has(pairing.b)) continue;
    for (const c of pairing.contacts) {
      const a = pos.get(c.aResSeq);
      const b = pos.get(c.bResSeq);
      if (!a || !b) continue;
      ties.push({
        a: { seg: a.seg, sample: a.sample, arc: a.arc, z: a.z },
        b: { seg: b.seg, sample: b.sample, arc: b.arc, z: b.z },
      });
    }
  }
  return ties;
}
