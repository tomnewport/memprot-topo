import type { BarrelAnalysis, Strand, Vec3 } from '../contacts/index.js';

/**
 * Open β-sheets (issue #54): strands that pair with each other but don't close
 * into a barrel. The 2-D view draws each sheet as one block of parallel bars,
 * a flat projection of the sheet, instead of strand by strand along the
 * chain; the 3-D view turns each strand's face to its sheet.
 */

/** One strand of an open sheet. */
export interface SheetStrand {
  /** Author residue range (merged strand segment). */
  start: number;
  end: number;
  /**
   * Unit normal of the sheet at this strand, in the membrane frame: across
   * the strand and its partners, so it follows the sheet's twist.
   */
  normal: Vec3;
}

/** An open β-sheet and the flat projection it is drawn with. */
export interface Sheet {
  /** Member strands in sequence order. */
  strands: SheetStrand[];
  /** Centroid of the strands' Cα. */
  centre: Vec3;
  /** Unit normal of the best-fit plane through the strands' Cα. */
  normal: Vec3;
  /** Unit direction drawn left to right. */
  across: Vec3;
  /**
   * Unit in-plane direction drawn upwards for a sheet lying within 30° of the
   * membrane plane, which is drawn face-on; null for a steeper sheet, which
   * is drawn at its real height (z), seen along its normal's horizontal part.
   */
  up: Vec3 | null;
}

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a: Vec3, k: number): Vec3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
function unit(a: Vec3): Vec3 {
  const l = Math.hypot(a.x, a.y, a.z);
  return l > 1e-12 ? scale(a, 1 / l) : { x: 0, y: 0, z: 0 };
}

/** Sheets within 30° of the membrane plane are drawn face-on. */
const FACE_ON_MAX_TILT_SIN = 0.5;

/**
 * Unit eigenvector of the smallest eigenvalue of a symmetric 3×3 matrix
 * (cyclic Jacobi rotations).
 */
function smallestEigenvector(m: number[][]): Vec3 {
  const a = m.map((r) => [...r]);
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let sweep = 0; sweep < 50; sweep++) {
    const off = a[0][1] ** 2 + a[0][2] ** 2 + a[1][2] ** 2;
    if (off < 1e-18) break;
    for (const [p, q] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ]) {
      if (Math.abs(a[p][q]) < 1e-15) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p];
        const akq = a[k][q];
        a[k][p] = c * akp - s * akq;
        a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k];
        const aqk = a[q][k];
        a[p][k] = c * apk - s * aqk;
        a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p];
        const vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq;
        v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  let best = 0;
  for (let i = 1; i < 3; i++) if (a[i][i] < a[best][best]) best = i;
  return unit({ x: v[0][best], y: v[1][best], z: v[2][best] });
}

/**
 * The open sheets of a chain that isn't drawn as a barrel: connected groups
 * of two or more paired strands, from the chain's β-sheet analysis.
 */
export function findSheets(analysis: BarrelAnalysis): Sheet[] {
  const { strands, pairings } = analysis;
  const partners = new Map<number, number[]>();
  for (const s of strands) partners.set(s.index, []);
  for (const p of pairings) {
    partners.get(p.a)?.push(p.b);
    partners.get(p.b)?.push(p.a);
  }
  const byIndex = new Map(strands.map((s) => [s.index, s]));

  const sheets: Sheet[] = [];
  const seen = new Set<number>();
  for (const s of strands) {
    if (seen.has(s.index) || partners.get(s.index)!.length === 0) continue;
    // Walk the component, giving each strand the sign that aligns its axis
    // with the first strand's.
    const sign = new Map<number, number>([[s.index, 1]]);
    const queue = [s.index];
    seen.add(s.index);
    while (queue.length) {
      const i = queue.shift()!;
      for (const j of partners.get(i)!) {
        if (seen.has(j)) continue;
        seen.add(j);
        const d = dot(byIndex.get(i)!.axis, byIndex.get(j)!.axis);
        sign.set(j, sign.get(i)! * (d >= 0 ? 1 : -1));
        queue.push(j);
      }
    }
    const members = [...sign.keys()].map((i) => byIndex.get(i)!).sort((a, b) => a.index - b.index);
    sheets.push(sheetOf(members, sign, partners, byIndex));
  }
  return sheets;
}

function sheetOf(
  members: Strand[],
  sign: Map<number, number>,
  partners: Map<number, number[]>,
  byIndex: Map<number, Strand>,
): Sheet {
  let centre: Vec3 = { x: 0, y: 0, z: 0 };
  let count = 0;
  for (const s of members)
    for (const c of s.calphas) {
      centre = add(centre, c);
      count++;
    }
  centre = scale(centre, 1 / count);
  const cov = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const s of members)
    for (const c of s.calphas) {
      const d = [c.x - centre.x, c.y - centre.y, c.z - centre.z];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) cov[i][j] += d[i] * d[j];
    }
  let normal = smallestEigenvector(cov);
  if (normal.z < 0) normal = scale(normal, -1);

  // Mean strand direction, antiparallel strands flipped to agree.
  let along: Vec3 = { x: 0, y: 0, z: 0 };
  for (const s of members) along = add(along, scale(s.axis, sign.get(s.index)!));
  along = unit(sub(along, scale(normal, dot(along, normal))));

  const first = members[0];
  const horizontal = Math.sqrt(Math.max(0, 1 - normal.z * normal.z));
  let up: Vec3 | null = null;
  let across: Vec3;
  if (horizontal >= FACE_ON_MAX_TILT_SIN) {
    across = unit(cross(normal, { x: 0, y: 0, z: 1 }));
  } else {
    up = dot(first.axis, along) >= 0 ? along : scale(along, -1);
    across = unit(cross(up, normal));
  }
  // Read the sheet from the side the chain enters it: the first strand left
  // of the sheet's middle.
  const firstU = dot(sub(first.centroid, centre), across);
  const meanU =
    members.reduce((sum, s) => sum + dot(sub(s.centroid, centre), across), 0) / members.length;
  if (firstU > meanU) across = scale(across, -1);

  const strands = members.map((s): SheetStrand => {
    // Local normal: strand axis × direction to each partner, averaged.
    let n: Vec3 = { x: 0, y: 0, z: 0 };
    for (const j of partners.get(s.index)!) {
      const to = sub(byIndex.get(j)!.centroid, s.centroid);
      let local = unit(cross(s.axis, to));
      if (dot(local, normal) < 0) local = scale(local, -1);
      n = add(n, local);
    }
    n = unit(sub(n, scale(s.axis, dot(n, s.axis))));
    if (n.x === 0 && n.y === 0 && n.z === 0) n = normal;
    return { start: s.segment.start, end: s.segment.end, normal: n };
  });

  return { strands, centre, normal, across, up };
}

/** The sheet and strand holding residue `resSeq`, or null. */
export function sheetStrandAt(
  sheets: readonly Sheet[],
  resSeq: number,
): { sheet: number; strand: SheetStrand } | null {
  for (let k = 0; k < sheets.length; k++) {
    for (const strand of sheets[k].strands) {
      if (resSeq >= strand.start && resSeq <= strand.end) return { sheet: k, strand };
    }
  }
  return null;
}

/**
 * Where a point is drawn in its sheet's flat projection: `u` across the sheet
 * (Å from the sheet's centre) and the height `z`, the real one for a steep
 * sheet and the sheet's own for a face-on one.
 */
export function projectToSheet(sheet: Sheet, p: Vec3): { u: number; z: number } {
  const d = sub(p, sheet.centre);
  return {
    u: dot(d, sheet.across),
    z: sheet.up ? sheet.centre.z + dot(d, sheet.up) : p.z,
  };
}
