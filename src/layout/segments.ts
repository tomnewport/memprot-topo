import type { ChainData, SecondaryStructureSegment } from '../types.js';
import {
  unwrapBarrel,
  type CylinderMapping,
  type UnrolledSegment,
  type UnrolledPoint,
} from '../unroll/index.js';
import type { BarrelAnalysis } from '../contacts/index.js';
import { BARREL, LOOP, PLOT, SS_BODY } from './constants.js';
import { isSs, runsBySs, type SsRun } from './runs.js';

/**
 * Walk the C-terminal samples of a strand backward and return the index of the
 * last sample whose local tangent is still within 25° of the strand's core
 * axis direction.  Residues that DSSP assigns to the strand but that actually
 * sit in the adjacent β-turn curl away from the core axis; trimming them lets
 * the arrowhead sit on the genuinely straight portion of the body.
 *
 * Returns `endIdx` unchanged when no trimming is needed (or when the strand is
 * too short to estimate a reliable axis direction).
 */
export function trimStrandEnd(samples: UnrolledPoint[], startIdx: number, endIdx: number): number {
  const n = endIdx - startIdx + 1;
  if (n < 6) return endIdx;

  // Core axis from first 2/3 of the strand body, in screen-pixel space so the
  // test is scale-independent.
  const coreEnd = startIdx + Math.floor((n * 2) / 3);
  const coreDx = (samples[coreEnd].arc - samples[startIdx].arc) * PLOT.arcPxPerA;
  const coreDy = -(samples[coreEnd].z - samples[startIdx].z) * PLOT.zPxPerA;
  const coreLen = Math.sqrt(coreDx * coreDx + coreDy * coreDy);
  if (coreLen < 1e-9) return endIdx;
  const cux = coreDx / coreLen;
  const cuy = coreDy / coreLen;

  const COS_THR = Math.cos((25 * Math.PI) / 180); // dot-product threshold ≈ 0.906
  const maxTrim = Math.floor(n * 0.4);

  // Walk from the end backward; the first aligned sample is the new endpoint.
  for (let i = endIdx; i > endIdx - maxTrim && i > startIdx + 1; i--) {
    const tdx = (samples[i].arc - samples[i - 1].arc) * PLOT.arcPxPerA;
    const tdy = -(samples[i].z - samples[i - 1].z) * PLOT.zPxPerA;
    const tLen = Math.sqrt(tdx * tdx + tdy * tdy);
    const dot = tLen > 1e-9 ? (tdx * cux + tdy * cuy) / tLen : 1;
    if (dot >= COS_THR) return i;
  }
  return endIdx;
}

/** A chain segment with its samples repositioned into display (fixed-gap) space. */
export interface SegmentLayout {
  /** Samples with arc shifted into display space; z is unchanged. */
  samples: UnrolledPoint[];
  /** One entry per input Cα (unchanged from the unroll). */
  residues: UnrolledSegment['residues'];
  runs: SsRun[];
}

/**
 * Reposition SS elements so the horizontal gap between consecutive elements is
 * a fixed `LOOP.elementGapPx`, regardless of each loop's real arc length. Each
 * SS element keeps its own internal arc geometry; only the offset between
 * elements changes. Loops (and chain breaks) collapse to the fixed gap width.
 */
export function layoutSegments(
  segments: UnrolledSegment[],
  ssSegments: SecondaryStructureSegment[],
): { layouts: SegmentLayout[]; totalArc: number } {
  const gapA = LOOP.elementGapPx / PLOT.arcPxPerA;
  const layouts: SegmentLayout[] = [];
  let cursor = 0;
  let maxArc = 0;

  for (const segment of segments) {
    const runs = runsBySs(segment.residues, ssSegments);
    const n = segment.samples.length;

    if (runs.length === 0) {
      const base = segment.samples[0]?.arc ?? 0;
      const sh = cursor - base;
      const display = segment.samples.map((p) => ({ arc: p.arc + sh, z: p.z }));
      const end = cursor + ((segment.samples[n - 1]?.arc ?? base) - base);
      layouts.push({ samples: display, residues: segment.residues, runs });
      if (end > maxArc) maxArc = end;
      cursor = end + gapA;
      continue;
    }

    const shift = new Array<number>(n).fill(NaN);
    let firstShift = 0;
    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      const sh = cursor - segment.samples[run.startSample].arc;
      if (r === 0) firstShift = sh;
      const ownEnd = r < runs.length - 1 ? runs[r + 1].startSample : n;
      for (let i = run.startSample; i < ownEnd; i++) shift[i] = sh;
      if (run.type === 'helix' || run.type === 'strand') {
        cursor += segment.samples[run.endResSampleIdx].arc - segment.samples[run.startSample].arc;
      } else {
        cursor += gapA;
      }
    }
    // Forward-fill any samples outside a run's owned range (leading/interior gaps).
    let last = firstShift;
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(shift[i])) last = shift[i];
      else shift[i] = last;
    }

    const displaySamples = segment.samples.map((p, i) => ({ arc: p.arc + shift[i], z: p.z }));
    layouts.push({ samples: displaySamples, residues: segment.residues, runs });
    if (cursor > maxArc) maxArc = cursor;
    cursor += gapA;
  }

  return { layouts, totalArc: maxArc };
}

/**
 * Lay the cylindrical unwrap out so strands sit a fixed clearance apart without
 * altering any strand's shape or angle. At realistic barrel tilts (~40°) a
 * strand sweeps far more horizontally than the true inter-strand spacing, so
 * the honest unwrap draws tilted bars on top of one another.
 *
 * Each strand keeps its exact geometry — a rigid horizontal shift only — and is
 * placed left to right by the algorithm:
 *   1. take the next strand,
 *   2. find the shortest distance between its centreline and the previously
 *      placed strands' centrelines,
 *   3. slide it along until that shortest distance equals a fixed target
 *      (default two strand widths).
 * Barrel-wall strands are packed tight (the part that works well — left as is).
 * A helix — anything not part of the barrel — is packed too. At a transition to
 * or from it the gap is measured from the previous element's C-terminus, where
 * the loop actually leaves (not its rightmost point), so the connecting loop
 * stays short; the element is then nudged forward only as far as needed to keep
 * a clearance from everything already placed. So nothing crosses, no loop
 * doubles back, and the helix sits close to its strand. A helix also reads
 * forward (lowest residue on the left). Coils ride the loop ramp between
 * elements. Membrane depth (z) is never touched.
 */
export function barrelLayout(
  segments: UnrolledSegment[],
  wallSegments: SecondaryStructureSegment[],
  continuous = false,
): { layouts: SegmentLayout[]; totalArc: number } {
  const strandWidthPx = SS_BODY.halfWidthPx * 2;
  const targetA = (BARREL.minStrandWidths * strandWidthPx) / PLOT.arcPxPerA;
  const transitionGapA = (BARREL.transitionGapWidths * strandWidthPx) / PLOT.arcPxPerA;
  // Minimum element-to-element clearance used to nudge a transition element
  // forward if anchoring it to the loop-exit point would crowd anything.
  const clearanceA = (BARREL.minStrandWidths * strandWidthPx) / PLOT.arcPxPerA;

  // Placement state. In `continuous` mode (multi-chain assembly barrels) it
  // persists across segments so each protomer packs tight against the previous
  // one around the shared ring; otherwise it resets per segment.
  const placed: { arc: number; z: number }[][] = [];
  let prevCentre = -Infinity; // laid-out centre of the previous element
  let prevExitArc = -Infinity; // laid arc of the previous element's C-terminus
  let prevHelix = false; // was the previous placed element a helix?

  const built = segments.map((segment) => {
    const runs = runsBySs(segment.residues, wallSegments);
    const n = segment.samples.length;
    const newArc = new Array<number>(n).fill(NaN);
    if (!continuous) {
      placed.length = 0;
      prevCentre = -Infinity;
      prevExitArc = -Infinity;
      prevHelix = false;
    }

    // Barrel-wall strands are packed tight (closest centreline distance); helices
    // — anything that isn't part of the barrel — are packed too, but a transition
    // to or from a helix advances generously so the loops on each side and the
    // helix itself render with plenty of space. Every element is placed entirely
    // to the right of all earlier ones at such a transition, so nothing crosses
    // and no loop doubles back. Coils ride the loop ramp.
    for (const run of runs) {
      if (run.type !== 'strand' && run.type !== 'helix') continue;
      const curHelix = run.type === 'helix';

      // This element's centreline points (one per residue), in raw unwrap arc.
      const pts: { arc: number; z: number }[] = [];
      for (let ri = run.residueStart; ri <= run.residueEnd; ri++) {
        const r = segment.residues[ri];
        pts.push({ arc: r.arc, z: r.z });
      }
      let rawMin = Infinity;
      let rawMax = -Infinity;
      for (const p of pts) {
        if (p.arc < rawMin) rawMin = p.arc;
        if (p.arc > rawMax) rawMax = p.arc;
      }
      const rawCentre = (rawMin + rawMax) / 2;
      const width = rawMax - rawMin;
      const m = pts.length - 1;
      // Per-residue offset from the element's left edge. A helix reads forward
      // (lowest residue on the left) as a straight bar; a strand keeps its
      // natural — possibly reversed — direction.
      const rel = pts.map((p, i) => (curHelix ? (m > 0 ? (i / m) * width : 0) : p.arc - rawMin));

      // `anchor` is the laid arc of the element's left edge (its minimum).
      let anchor = rawMin;
      if (placed.length > 0) {
        if (curHelix || prevHelix) {
          // Transition to/from a non-barrel element. Measure the gap from the
          // previous element's C-terminus (where the loop actually leaves), not
          // its rightmost point, so the loop stays short. Then nudge forward
          // only as far as needed to keep this element clear of everything.
          const fromExit = prevExitArc + transitionGapA - rel[0];
          let clear = -Infinity;
          for (const prev of placed) {
            for (let i = 0; i < pts.length; i++) {
              for (const q of prev) {
                const dz = pts[i].z - q.z;
                if (Math.abs(dz) >= clearanceA) continue;
                const need = Math.sqrt(clearanceA * clearanceA - dz * dz) + q.arc - rel[i];
                if (need > clear) clear = need;
              }
            }
          }
          anchor = Math.max(fromExit, Number.isFinite(clear) ? clear : -Infinity);
        } else {
          // Wall-to-wall: the existing tight barrel packing — unchanged.
          let smin = -Infinity;
          for (const prev of placed) {
            for (const p of pts) {
              for (const q of prev) {
                const dz = p.z - q.z;
                if (Math.abs(dz) >= targetA) continue;
                const need = Math.sqrt(targetA * targetA - dz * dz) + q.arc - p.arc;
                if (need > smin) smin = need;
              }
            }
          }
          const shift = Math.max(
            Number.isFinite(smin) ? smin : -Infinity,
            prevCentre + targetA - rawCentre, // ordering: never flung backwards
          );
          anchor = rawMin + shift;
        }
      }

      if (curHelix) {
        // Straight bar, residue order, across its own width (forward).
        const span = run.endResSampleIdx - run.startSample;
        for (let i = run.startSample; i <= run.endResSampleIdx; i++) {
          newArc[i] = anchor + (span > 0 ? (i - run.startSample) / span : 0) * width;
        }
      } else {
        // Rigid shift, preserving the strand's own geometry and direction.
        const shift = anchor - rawMin;
        for (let i = run.startSample; i <= run.endResSampleIdx; i++) {
          newArc[i] = segment.samples[i].arc + shift;
        }
      }

      placed.push(pts.map((p, i) => ({ arc: anchor + rel[i], z: p.z })));
      prevCentre = anchor + width / 2;
      prevExitArc = anchor + rel[m]; // C-terminal residue → where the next loop leaves
      prevHelix = curHelix;
    }

    const firstAssigned = newArc.findIndex((v) => !Number.isNaN(v));
    if (firstAssigned === -1) {
      // No strands in this segment — fall back to the raw unwrap positions.
      for (let i = 0; i < n; i++) newArc[i] = segment.samples[i].arc;
    } else {
      // Leading gap: hold the first strand's edge.
      for (let i = 0; i < firstAssigned; i++) newArc[i] = newArc[firstAssigned];
      // Interior gaps (loops): linear ramp between the bracketing strand edges.
      let lastAssigned = firstAssigned;
      for (let j = firstAssigned + 1; j < n; j++) {
        if (Number.isNaN(newArc[j])) continue;
        if (j > lastAssigned + 1) {
          const va = newArc[lastAssigned];
          const vb = newArc[j];
          for (let m = lastAssigned + 1; m < j; m++) {
            newArc[m] = va + ((vb - va) * (m - lastAssigned)) / (j - lastAssigned);
          }
        }
        lastAssigned = j;
      }
      // Trailing gap: hold the last strand's edge.
      for (let j = lastAssigned + 1; j < n; j++) newArc[j] = newArc[lastAssigned];
    }

    return { segment, runs, newArc };
  });

  // Shift everything so the leftmost point sits at arc 0, then report extent.
  let minArc = Infinity;
  let maxArc = -Infinity;
  for (const b of built)
    for (const v of b.newArc) {
      if (v < minArc) minArc = v;
      if (v > maxArc) maxArc = v;
    }
  const shift = Number.isFinite(minArc) ? -minArc : 0;

  const layouts = built.map(({ segment, runs, newArc }) => ({
    samples: segment.samples.map((p, i) => ({ arc: newArc[i] + shift, z: p.z })),
    residues: segment.residues.map((rr) => ({ ...rr, arc: newArc[rr.sampleIndex] + shift })),
    runs,
  }));
  const totalArc = Number.isFinite(maxArc) ? maxArc - minArc : 0;
  return { layouts, totalArc };
}

/**
 * Secondary-structure segments for barrel-unwrap rendering: the barrel-wall
 * strands (in ring order, merged ranges) plus any helices. β-strands that fold
 * inside the barrel are omitted, so they fall through to coil and render as
 * part of the connecting loop rather than as spurious bars near the axis.
 */
export function barrelWallSegments(
  analysis: BarrelAnalysis,
  effective: SecondaryStructureSegment[],
): SecondaryStructureSegment[] {
  const wall = analysis.ringOrder.map((i) => analysis.strands[i].segment);
  const helices = effective.filter((s) => s.type === 'helix');
  return [...wall, ...helices].sort((a, b) => a.start - b.start);
}

/**
 * Unwrap a multi-chain assembly barrel: each protomer's β-hairpin is unwrapped
 * around the *shared* cylinder centre as its own segment, so barrelLayout
 * (continuous) packs all protomers tight around one ring. Returns the segments
 * in ring order, a per-segment focal flag, and the wall strand segments.
 */
export function unwrapAssembly(
  chains: ChainData[],
  analysis: BarrelAnalysis,
  focalChainId: string,
): {
  segments: UnrolledSegment[];
  focal: boolean[];
  /** Unwrap mapping of each segment (each protomer is unwrapped separately). */
  cylinders: (CylinderMapping | undefined)[];
  wallSegments: SecondaryStructureSegment[];
  zMin: number;
  zMax: number;
} {
  const chainById = new Map(chains.map((c) => [c.chainId, c]));
  // Protomer order = chains in order of first appearance around the ring.
  const order: string[] = [];
  for (const i of analysis.ringOrder) {
    const cid = analysis.strands[i].chainId;
    if (cid && !order.includes(cid)) order.push(cid);
  }
  const segments: UnrolledSegment[] = [];
  const focal: boolean[] = [];
  const cylinders: (CylinderMapping | undefined)[] = [];
  const wallSet = new Map<string, SecondaryStructureSegment>();
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const cid of order) {
    const chain = chainById.get(cid);
    if (!chain) continue;
    const strandSegs = analysis.ringOrder
      .map((i) => analysis.strands[i])
      .filter((s) => s.chainId === cid)
      .map((s) => s.segment);
    if (strandSegs.length === 0) continue;
    const lo = Math.min(...strandSegs.map((s) => s.start));
    const hi = Math.max(...strandSegs.map((s) => s.end));
    // For the focal protomer, include a few cap-proximal residues each side of
    // the stem so the chain visibly continues off the strand tops toward the
    // extramembrane cap — a hint that the barrel is part of a larger fold.
    const margin = cid === focalChainId ? BARREL.capHintResidues : 0;
    const stem = chain.calphas.filter((c) => c.resSeq >= lo - margin && c.resSeq <= hi + margin);
    const ssSegs = strandSegs.map((s) => ({ ...s }));
    for (const s of ssSegs) wallSet.set(`${s.start}-${s.end}`, s);
    const u = unwrapBarrel(stem, { ssSegments: ssSegs, centre: analysis.centre });
    for (const seg of u.segments) {
      segments.push(seg);
      focal.push(cid === focalChainId);
      cylinders.push(u.cylinder);
    }
    zMin = Math.min(zMin, u.zMin);
    zMax = Math.max(zMax, u.zMax);
  }
  if (!Number.isFinite(zMin)) {
    zMin = 0;
    zMax = 0;
  }
  return { segments, focal, cylinders, wallSegments: [...wallSet.values()], zMin, zMax };
}

export interface AssemblyContext {
  chains: ChainData[];
  analysis: BarrelAnalysis;
  focalChainId: string;
}

/**
 * Diagram x of every residue of a laid-out segment, or null where it has
 * none. Helix and strand residues sit on their element. Loops are drawn as
 * curves across a fixed gap rather than at their samples' x, so a loop
 * residue is placed along that gap by its position in the loop; coil before
 * the first or after the last element has nowhere to sit. A segment with no
 * elements at all is drawn at its samples' x.
 */
export function residueDisplayX(layout: SegmentLayout): (number | null)[] {
  const { residues, samples, runs } = layout;
  const xs: (number | null)[] = residues.map(() => null);
  if (!runs.some(isSs)) {
    return residues.map((r) => samples[r.sampleIndex]?.arc ?? null);
  }
  for (const run of runs) {
    if (!isSs(run)) continue;
    for (let i = run.residueStart; i <= run.residueEnd; i++) {
      xs[i] = samples[residues[i].sampleIndex]?.arc ?? null;
    }
  }
  let prev = -1;
  for (let i = 0; i < residues.length; i++) {
    if (xs[i] === null) continue;
    if (prev >= 0 && i > prev + 1) {
      const a = xs[prev]!;
      const b = xs[i]!;
      for (let k = prev + 1; k < i; k++) xs[k] = a + ((b - a) * (k - prev)) / (i - prev);
    }
    prev = i;
  }
  return xs;
}
