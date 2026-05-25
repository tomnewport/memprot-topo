import type { Calpha, SecondaryStructureSegment } from '../types.js';
import { sampleCurve, type Vec } from './catmull-rom.js';
import { fitBSpline, sampleBSpline } from './bspline.js';
import { projectHelixAxis } from './helix-axis.js';

/**
 * One point on the unrolled trace: `arc` is the cumulative arc length of the
 * smoothed Cα path projected onto the membrane plane (xy), `z` is the real
 * z-coordinate in the membrane frame.
 */
export interface UnrolledPoint {
  arc: number;
  z: number;
}

/**
 * One residue's position on the unrolled trace.
 */
export interface UnrolledResidue extends UnrolledPoint {
  resSeq: number;
  iCode: string;
  /** Index of this residue within the input Cα array. */
  index: number;
  /** Index into the dense `samples` array where this Cα sits. */
  sampleIndex: number;
}

/**
 * A contiguous chain segment between detected chain breaks.
 */
export interface UnrolledSegment {
  /** Densely-sampled smooth trace between control Cα. */
  samples: UnrolledPoint[];
  /** One entry per input Cα in this segment. */
  residues: UnrolledResidue[];
}

export interface UnrollResult {
  /** One entry per contiguous chain segment (split on detected breaks). */
  segments: UnrolledSegment[];
  /** Total arc length of the smoothed xy path across all segments. */
  totalArcLength: number;
  /** Observed z range across input Cα. */
  zMin: number;
  zMax: number;
}

export interface UnrollOptions {
  /**
   * Sample density along each curve segment between control Cα.
   * Used when falling back to Catmull–Rom for very short segments.
   */
  samplesPerSegment?: number;
  /** Threshold (Å) on 3-D Cα–Cα distance above which a chain break is inferred. */
  breakDistance?: number;
  /** Z-coordinate to use as the membrane midplane (subtracted from all z). */
  membraneCentre?: number;
  /**
   * Secondary-structure annotation for the chain.  When provided, helix
   * segments are projected onto the local helix axis before spline fitting,
   * eliminating the high-frequency arc-length oscillations caused by helical
   * twist.
   */
  ssSegments?: SecondaryStructureSegment[];
  /**
   * Number of amino acids per B-spline degree of freedom.  Controls curve
   * smoothness: higher values produce smoother (fewer control-point) curves.
   * The number of control points for a segment of n residues is
   * max(4, ceil(n / aminosPerDof)).
   *
   * @default 4
   */
  aminosPerDof?: number;
}

const DEFAULTS = {
  samplesPerSegment: 16,
  breakDistance: 5.5,
  membraneCentre: 0,
  aminosPerDof: 4,
};

function splitOnBreaks(calphas: Calpha[], breakDistance: number): Calpha[][] {
  const groups: Calpha[][] = [];
  let current: Calpha[] = [];
  const thr2 = breakDistance * breakDistance;

  for (const ca of calphas) {
    if (current.length === 0) {
      current.push(ca);
      continue;
    }
    const prev = current[current.length - 1];
    const dx = ca.x - prev.x;
    const dy = ca.y - prev.y;
    const dz = ca.z - prev.z;
    if (dx * dx + dy * dy + dz * dz > thr2) {
      groups.push(current);
      current = [ca];
    } else {
      current.push(ca);
    }
  }
  if (current.length) groups.push(current);
  return groups;
}

function ssTypeFor(
  resSeq: number,
  segments: SecondaryStructureSegment[],
): 'helix' | 'strand' | 'coil' {
  for (const seg of segments) {
    if (resSeq >= seg.start && resSeq <= seg.end) return seg.type;
  }
  return 'coil';
}

interface SSSubGroup {
  calphas: Calpha[];
  type: 'helix' | 'strand' | 'coil';
  /** Index of the first residue in this sub-group within the parent chain group. */
  startGroupIndex: number;
}

/**
 * Split a contiguous chain group into runs of the same SS type.
 * Without SS annotation each run is a single 'coil' covering the whole group.
 */
function splitBySSType(
  group: Calpha[],
  ssSegments: SecondaryStructureSegment[] | undefined,
): SSSubGroup[] {
  if (!ssSegments || group.length === 0) {
    return [{ calphas: group, type: 'coil', startGroupIndex: 0 }];
  }

  const result: SSSubGroup[] = [];
  let currentCalphas: Calpha[] = [group[0]];
  let currentType = ssTypeFor(group[0].resSeq, ssSegments);
  let startIdx = 0;

  for (let i = 1; i < group.length; i++) {
    const type = ssTypeFor(group[i].resSeq, ssSegments);
    if (type !== currentType) {
      result.push({ calphas: currentCalphas, type: currentType, startGroupIndex: startIdx });
      startIdx = i;
      currentCalphas = [group[i]];
      currentType = type;
    } else {
      currentCalphas.push(group[i]);
    }
  }
  if (currentCalphas.length > 0) {
    result.push({ calphas: currentCalphas, type: currentType, startGroupIndex: startIdx });
  }
  return result;
}

/**
 * Unroll a chain's Cα coordinates into the (arc, z) "membrane-side view".
 *
 * **Coordinate frame.** The input Cα must already be in the membrane frame —
 * z is interpreted as height relative to the bilayer midplane, with the
 * membrane normal aligned to z. MemProtMD prebuilt structures are pre-aligned
 * this way. For raw RCSB PDB input you must first apply an orientation
 * transform (see the `orientation` module) or the output will be meaningless.
 *
 * Algorithm:
 *  1. Split the Cα list on long jumps (chain breaks).
 *  2. For each contiguous run:
 *     a. Classify each Cα by secondary structure type.
 *     b. Project helix Cα onto the local helix axis (sliding-window PCA),
 *        removing the ~100°/residue twist.
 *     c. Fit a clamped cubic B-spline to the (possibly pre-processed)
 *        positions using max(4, ceil(n / aminosPerDof)) control points.
 *        For very short runs (≤ 3 Cα) fall back to Catmull–Rom.
 *     d. Densely sample the spline and accumulate xy chord lengths for arc.
 *  3. Each residue's arc is taken from the spline; its z is the actual Cα z
 *     (not the smoothed spline z) so membrane depth is physically accurate.
 *
 * Arc length is continuous across segment boundaries (we just keep accumulating).
 */
export function unrollChain(calphas: Calpha[], options: UnrollOptions = {}): UnrollResult {
  const { samplesPerSegment, breakDistance, membraneCentre, ssSegments, aminosPerDof } = {
    ...DEFAULTS,
    ...options,
  };

  if (calphas.length === 0) {
    return { segments: [], totalArcLength: 0, zMin: 0, zMax: 0 };
  }

  const groups = splitOnBreaks(calphas, breakDistance);
  const segments: UnrolledSegment[] = [];

  let arcOffset = 0;
  let zMin = Infinity;
  let zMax = -Infinity;

  for (const group of groups) {
    // Sub-split by SS type so each region gets the right fitting strategy:
    //   helix  → axis projection + smooth B-spline
    //   strand → interpolating Catmull-Rom (preserves xy displacement, encodes strand angle)
    //   coil   → smooth B-spline (same as helix but no axis projection)
    const subGroups = splitBySSType(group, ssSegments);

    const allSamples: UnrolledPoint[] = [];
    const allResidues: UnrolledResidue[] = [];
    let sampleOffset = 0;
    let arc = arcOffset;
    let prevPt: Vec | null = null;

    for (const sub of subGroups) {
      const subN = sub.calphas.length;

      // Translate to membrane frame.
      const pts: Vec[] = sub.calphas.map((c) => ({
        x: c.x,
        y: c.y,
        z: c.z - membraneCentre,
      }));

      // Project helix Cα onto the local helix axis; leave others unchanged.
      const isHelixMask: boolean[] = pts.map(() => sub.type === 'helix');
      const fittingPts = sub.type === 'helix' ? projectHelixAxis(pts, isHelixMask) : pts;

      // DOF selection: strands use DOF=1 which forces k≥n → Catmull-Rom fallback,
      // interpolating through every Cα and preserving the xy displacement that
      // encodes the strand's crossing angle in the membrane.
      const effectiveDof = sub.type === 'strand' ? 1 : aminosPerDof;
      const totalSamples = (subN - 1) * samplesPerSegment + 1;
      const k = Math.max(4, Math.ceil(subN / effectiveDof));

      let splineSamples: Vec[];
      let controlIndex: number[];

      if (subN <= 3 || k >= subN) {
        const cr = sampleCurve(fittingPts, samplesPerSegment);
        splineSamples = cr.samples;
        controlIndex = cr.controlIndex;
      } else {
        const spline = fitBSpline(fittingPts, k);
        const sampled = sampleBSpline(spline, totalSamples);
        splineSamples = sampled.samples;
        controlIndex = sampled.controlIndex;
      }

      // Accumulate xy arc lengths, continuing from the previous sub-group.
      const subUnrolled: UnrolledPoint[] = [];
      for (const s of splineSamples) {
        if (prevPt) {
          const dx = s.x - prevPt.x;
          const dy = s.y - prevPt.y;
          arc += Math.sqrt(dx * dx + dy * dy);
        }
        prevPt = s;
        subUnrolled.push({ arc, z: s.z });
      }

      // Each residue's arc from the spline; z from actual Cα (physically accurate depth).
      for (let i = 0; i < sub.calphas.length; i++) {
        const ca = sub.calphas[i];
        const si = controlIndex[i];
        const z = ca.z - membraneCentre;
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
        allResidues.push({
          resSeq: ca.resSeq,
          iCode: ca.iCode,
          arc: subUnrolled[si].arc,
          z,
          index: sub.startGroupIndex + i,
          sampleIndex: sampleOffset + si,
        });
      }

      sampleOffset += splineSamples.length;
      allSamples.push(...subUnrolled);
    }

    arcOffset = allSamples.length > 0 ? allSamples[allSamples.length - 1].arc : arcOffset;
    // Reset prevPt across chain-break boundaries (no phantom arc step for the gap).
    prevPt = null;
    segments.push({ samples: allSamples, residues: allResidues });
  }

  if (!Number.isFinite(zMin)) {
    zMin = 0;
    zMax = 0;
  }

  return { segments, totalArcLength: arcOffset, zMin, zMax };
}
