import { describe, it, expect } from 'vitest';
import { buildRuns, boundingBox } from '../../../src/renderer/geometry.js';
import type { ProjectedResidue } from '../../../src/renderer/projection.js';

function makeResidues(seqs: number[]): ProjectedResidue[] {
  return seqs.map((n) => ({ resSeq: n, iCode: '', u: n, v: 0 }));
}

describe('buildRuns', () => {
  it('assigns residues outside any segment to coil', () => {
    const runs = buildRuns(makeResidues([1, 2, 3]), []);
    expect(runs).toHaveLength(1);
    expect(runs[0].type).toBe('coil');
    expect(runs[0].residues.map((r) => r.resSeq)).toEqual([1, 2, 3]);
  });

  it('produces coil–helix–coil for a chain with a single helix in the middle', () => {
    const runs = buildRuns(makeResidues([1, 2, 3, 4, 5, 6, 7]), [
      { start: 3, end: 5, type: 'helix' },
    ]);
    expect(runs.map((r) => r.type)).toEqual(['coil', 'helix', 'coil']);
    expect(runs[1].residues.map((r) => r.resSeq)).toEqual([3, 4, 5]);
  });

  it('splits a coil run at a residue-number gap (missing density)', () => {
    const runs = buildRuns(makeResidues([1, 2, 5, 6]), []);
    expect(runs).toHaveLength(2);
    expect(runs[0].residues.map((r) => r.resSeq)).toEqual([1, 2]);
    expect(runs[1].residues.map((r) => r.resSeq)).toEqual([5, 6]);
  });

  it('does not split a helix run across a gap', () => {
    // Pathological: declared helix with missing residue. Render as one run; gap is silent.
    const runs = buildRuns(makeResidues([1, 2, 5, 6]), [{ start: 1, end: 6, type: 'helix' }]);
    expect(runs).toHaveLength(1);
    expect(runs[0].type).toBe('helix');
  });

  it('returns [] for an empty residue list', () => {
    expect(buildRuns([], [{ start: 1, end: 5, type: 'helix' }])).toEqual([]);
  });
});

describe('boundingBox', () => {
  it('computes min/max across u and v', () => {
    const box = boundingBox([
      { resSeq: 1, iCode: '', u: -3, v: 10 },
      { resSeq: 2, iCode: '', u: 7, v: -2 },
      { resSeq: 3, iCode: '', u: 0, v: 4 },
    ]);
    expect(box).toEqual({ minU: -3, maxU: 7, minV: -2, maxV: 10 });
  });

  it('returns zeros for an empty input', () => {
    expect(boundingBox([])).toEqual({ minU: 0, maxU: 0, minV: 0, maxV: 0 });
  });
});
