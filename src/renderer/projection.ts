import type { CAResidue } from '../types.js';

/**
 * A 4×4 row-major transform applied as `[x' y' z' 1]ᵀ = M · [x y z 1]ᵀ`.
 * Element order: [m00, m01, m02, m03, m10, m11, …, m33].
 */
export type Matrix4 = Readonly<
  [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
>;

export const IDENTITY_MATRIX: Matrix4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** A projected 2D residue. `u` is the in-plane axis, `v` is the membrane-normal axis. */
export interface ProjectedResidue {
  resSeq: number;
  iCode: string;
  /** In-plane coordinate (membrane-parallel, x in the transformed frame). */
  u: number;
  /** Membrane-normal coordinate (z in the transformed frame). */
  v: number;
}

function transform(m: Matrix4, x: number, y: number, z: number): [number, number, number] {
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3],
    m[4] * x + m[5] * y + m[6] * z + m[7],
    m[8] * x + m[9] * y + m[10] * z + m[11],
  ];
}

/**
 * Transform Cα coordinates into the membrane frame and drop the `y` axis to
 * produce a 2D layout. The membrane normal is `z`; `u` (horizontal in the
 * diagram) maps to `x`, `v` (vertical) maps to `z`.
 */
export function projectResidues(
  residues: readonly CAResidue[],
  orientation: Matrix4 = IDENTITY_MATRIX,
): ProjectedResidue[] {
  return residues.map((r) => {
    const [x, , z] = transform(orientation, r.x, r.y, r.z);
    return { resSeq: r.resSeq, iCode: r.iCode, u: x, v: z };
  });
}

/**
 * Build a translation matrix that re-centers a set of coordinates so their
 * mean lands at the origin. Useful when the structure file is aligned to
 * the membrane normal but not centered on z = 0 (e.g. MemProtMD `at.pdb`,
 * which leaves coordinates in simulation-box space).
 */
export function centeringMatrix(residues: readonly CAResidue[]): Matrix4 {
  if (residues.length === 0) return IDENTITY_MATRIX;
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const r of residues) {
    sx += r.x;
    sy += r.y;
    sz += r.z;
  }
  const n = residues.length;
  // prettier-ignore
  return [
    1, 0, 0, -sx / n,
    0, 1, 0, -sy / n,
    0, 0, 1, -sz / n,
    0, 0, 0, 1,
  ];
}
