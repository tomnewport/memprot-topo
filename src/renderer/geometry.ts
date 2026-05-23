import type { SecondaryStructureSegment, SecondaryStructureType } from '../types.js';
import type { ProjectedResidue } from './projection.js';

export interface SecondaryRun {
  type: SecondaryStructureType;
  /** Projected Cα residues that belong to this run, in chain order. */
  residues: ProjectedResidue[];
}

/**
 * Classify each projected residue against the secondary structure annotation,
 * producing a contiguous list of runs. Residues that fall outside any helix
 * or strand are emitted as coil runs.
 *
 * Unresolved gaps in the residue numbering (missing density) implicitly split
 * coil runs at the gap, so the renderer can draw a dashed connector across
 * the break instead of an unrealistic straight line.
 */
export function buildRuns(
  residues: readonly ProjectedResidue[],
  segments: readonly SecondaryStructureSegment[],
): SecondaryRun[] {
  if (residues.length === 0) return [];

  const types = classifyResidues(residues, segments);
  const runs: SecondaryRun[] = [];

  let current: SecondaryRun = { type: types[0], residues: [residues[0]] };
  for (let i = 1; i < residues.length; i++) {
    const type = types[i];
    const prev = residues[i - 1];
    const r = residues[i];
    const gap = r.resSeq - prev.resSeq > 1;

    if (type === current.type && !(gap && type === 'coil')) {
      current.residues.push(r);
    } else {
      runs.push(current);
      current = { type, residues: [r] };
    }
  }
  runs.push(current);
  return runs;
}

function classifyResidues(
  residues: readonly ProjectedResidue[],
  segments: readonly SecondaryStructureSegment[],
): SecondaryStructureType[] {
  const out: SecondaryStructureType[] = new Array(residues.length).fill('coil');
  for (const seg of segments) {
    for (let i = 0; i < residues.length; i++) {
      const n = residues[i].resSeq;
      if (n >= seg.start && n <= seg.end) out[i] = seg.type;
    }
  }
  return out;
}

export interface BoundingBox {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

export function boundingBox(residues: readonly ProjectedResidue[]): BoundingBox {
  if (residues.length === 0) return { minU: 0, maxU: 0, minV: 0, maxV: 0 };
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const r of residues) {
    if (r.u < minU) minU = r.u;
    if (r.u > maxU) maxU = r.u;
    if (r.v < minV) minV = r.v;
    if (r.v > maxV) maxV = r.v;
  }
  return { minU, maxU, minV, maxV };
}
