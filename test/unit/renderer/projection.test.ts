import { describe, it, expect } from 'vitest';
import {
  centeringMatrix,
  projectResidues,
  IDENTITY_MATRIX,
  type Matrix4,
} from '../../../src/renderer/projection.js';
import type { CAResidue } from '../../../src/types.js';

const RESIDUES: CAResidue[] = [
  { resSeq: 1, iCode: '', x: 1, y: 2, z: 3 },
  { resSeq: 2, iCode: '', x: -4, y: 5, z: -6 },
];

describe('projectResidues', () => {
  it('drops y under identity orientation, keeping x→u and z→v', () => {
    const result = projectResidues(RESIDUES);
    expect(result).toEqual([
      { resSeq: 1, iCode: '', u: 1, v: 3 },
      { resSeq: 2, iCode: '', u: -4, v: -6 },
    ]);
  });

  it('applies translation from the matrix', () => {
    const m: Matrix4 = [1, 0, 0, 10, 0, 1, 0, 0, 0, 0, 1, -2, 0, 0, 0, 1];
    const [a] = projectResidues([RESIDUES[0]], m);
    expect(a.u).toBe(11);
    expect(a.v).toBe(1);
  });

  it('applies a 90° rotation about z (swaps x and y signs)', () => {
    // R_z(90°): x' = -y, y' = x, z' = z
    const m: Matrix4 = [0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const [a] = projectResidues([{ resSeq: 1, iCode: '', x: 1, y: 2, z: 3 }], m);
    expect(a.u).toBe(-2);
    expect(a.v).toBe(3);
  });

  it('uses the identity matrix by default', () => {
    const a = projectResidues(RESIDUES);
    const b = projectResidues(RESIDUES, IDENTITY_MATRIX);
    expect(a).toEqual(b);
  });
});

describe('centeringMatrix', () => {
  it('returns identity for an empty input', () => {
    expect(centeringMatrix([])).toEqual(IDENTITY_MATRIX);
  });

  it('translates the mean of a residue set to the origin', () => {
    const residues: CAResidue[] = [
      { resSeq: 1, iCode: '', x: 10, y: 20, z: 30 },
      { resSeq: 2, iCode: '', x: 20, y: 40, z: 60 },
    ];
    const m = centeringMatrix(residues);
    const projected = projectResidues(residues, m);
    const meanU = (projected[0].u + projected[1].u) / 2;
    const meanV = (projected[0].v + projected[1].v) / 2;
    expect(meanU).toBeCloseTo(0);
    expect(meanV).toBeCloseTo(0);
  });
});
