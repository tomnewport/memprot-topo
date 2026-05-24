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
    const n = group.length;

    // Translate to membrane frame.
    const pts: Vec[] = group.map((c) => ({
      x: c.x,
      y: c.y,
      z: c.z - membraneCentre,
    }));

    // Determine per-residue SS type and build helix mask.
    const isHelix: boolean[] = group.map((ca) =>
      ssSegments ? ssTypeFor(ca.resSeq, ssSegments) === 'helix' : false,
    );

    // Project helix Cα onto the local helix axis, leaving others unchanged.
    const fittingPts = projectHelixAxis(pts, isHelix);

    // Fit B-spline (or fall back to Catmull–Rom for tiny segments).
    const totalSamples = (n - 1) * samplesPerSegment + 1;
    const k = Math.max(4, Math.ceil(n / aminosPerDof));

    let splineSamples: Vec[];
    let controlIndex: number[];

    if (n <= 3 || k >= n) {
      // Catmull–Rom interpolates exactly through every point — safe for short runs.
      const cr = sampleCurve(fittingPts, samplesPerSegment);
      splineSamples = cr.samples;
      controlIndex = cr.controlIndex;
    } else {
      const spline = fitBSpline(fittingPts, k);
      const sampled = sampleBSpline(spline, totalSamples);
      splineSamples = sampled.samples;
      controlIndex = sampled.controlIndex;
    }

    // Accumulate xy arc lengths along the spline.
    const unrolledSamples: UnrolledPoint[] = [];
    let arc = arcOffset;
    let prev: Vec | null = null;
    for (const s of splineSamples) {
      if (prev) {
        const dx = s.x - prev.x;
        const dy = s.y - prev.y;
        arc += Math.sqrt(dx * dx + dy * dy);
      }
      prev = s;
      unrolledSamples.push({ arc, z: s.z });
    }

    // Each residue's arc from the spline; z from the actual Cα (physically
    // accurate membrane depth, not the smoothed axis z).
    const residues: UnrolledResidue[] = group.map((ca, i) => {
      const si = controlIndex[i];
      const z = ca.z - membraneCentre;
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
      return {
        resSeq: ca.resSeq,
        iCode: ca.iCode,
        arc: unrolledSamples[si].arc,
        z,
        index: i,
        sampleIndex: si,
      };
    });

    segments.push({ samples: unrolledSamples, residues });
    arcOffset =
      unrolledSamples.length > 0 ? unrolledSamples[unrolledSamples.length - 1].arc : arcOffset;
  }

  if (!Number.isFinite(zMin)) {
    zMin = 0;
    zMax = 0;
  }

  return { segments, totalArcLength: arcOffset, zMin, zMax };
}
