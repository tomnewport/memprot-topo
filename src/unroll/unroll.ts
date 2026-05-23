import type { Calpha } from '../types.js';
import { sampleCurve, type Vec } from './catmull-rom.js';

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
  /** Sample density along each Catmull–Rom segment between Cα. */
  samplesPerSegment?: number;
  /** Threshold (Å) on 3D Cα–Cα distance above which a chain break is inferred. */
  breakDistance?: number;
  /** Z-coordinate to use as the membrane midplane (subtracted from all z). */
  membraneCentre?: number;
}

const DEFAULTS = {
  samplesPerSegment: 16,
  // 5.5 Å gives comfortable headroom over the canonical 3.8 Å Cα–Cα spacing
  // for trans peptides while still catching real chain breaks (typically
  // ≥ 8 Å). Proline kinks, modified residues, and slightly distorted
  // backbones can push neighbour distances past 4.5 Å in real PDBs without
  // representing a true break.
  breakDistance: 5.5,
  membraneCentre: 0,
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
 *  2. For each contiguous run, fit a centripetal Catmull–Rom curve through the
 *     3D Cα (so z varies smoothly along the same parameter as xy).
 *  3. Sample the curve densely and accumulate xy chord lengths between
 *     consecutive samples — this gives `arc` (the chain's footprint on the
 *     membrane plane) and `z` (the real height) at every sample.
 *  4. Look up the arc length at each Cα via the recorded controlIndex into
 *     the samples.
 *
 * Arc length is continuous across segment boundaries (we just keep accumulating).
 */
export function unrollChain(calphas: Calpha[], options: UnrollOptions = {}): UnrollResult {
  const { samplesPerSegment, breakDistance, membraneCentre } = { ...DEFAULTS, ...options };

  if (calphas.length === 0) {
    return { segments: [], totalArcLength: 0, zMin: 0, zMax: 0 };
  }

  const groups = splitOnBreaks(calphas, breakDistance);
  const segments: UnrolledSegment[] = [];

  let arcOffset = 0;
  let zMin = Infinity;
  let zMax = -Infinity;

  for (const group of groups) {
    const pts: Vec[] = group.map((c) => ({
      x: c.x,
      y: c.y,
      z: c.z - membraneCentre,
    }));

    const { samples, controlIndex } = sampleCurve(pts, samplesPerSegment);

    const unrolledSamples: UnrolledPoint[] = [];
    let arc = arcOffset;
    let prev: Vec | null = null;
    for (const s of samples) {
      if (prev) {
        const dx = s.x - prev.x;
        const dy = s.y - prev.y;
        arc += Math.sqrt(dx * dx + dy * dy);
      }
      prev = s;
      unrolledSamples.push({ arc, z: s.z });
      if (s.z < zMin) zMin = s.z;
      if (s.z > zMax) zMax = s.z;
    }

    const residues: UnrolledResidue[] = group.map((ca, i) => {
      const si = controlIndex[i];
      return {
        resSeq: ca.resSeq,
        iCode: ca.iCode,
        arc: unrolledSamples[si].arc,
        z: unrolledSamples[si].z,
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
