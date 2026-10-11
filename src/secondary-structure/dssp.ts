/**
 * DSSP secondary structure (Kabsch & Sander, 1983,
 * https://doi.org/10.1002/bip.360221211) computed in the browser on the
 * coordinates that are drawn (issue #79), so the loader needs no secondary
 * structure from elsewhere.
 *
 * Written from the paper and the conventions of DSSP 4 (the program behind
 * PDB-REDO's DSSP files): backbone hydrogen bonds by the electrostatic energy
 * with the 2 best partners per residue kept, n-turns, α helices, 3₁₀ and π
 * helices (π taking priority over α, as in DSSP 4), β-bridges, ladders and
 * β-bulges. Turns, bends and polyproline are not assigned: nothing here draws
 * them.
 */

import type { BetaLadder } from '../types.js';
import type { BackboneChain, RawSSSegment } from '../parser/types.js';

type Vec = { x: number; y: number; z: number };

/** One-letter DSSP codes this implementation assigns; ' ' is anything else. */
export type DsspCode = 'H' | 'G' | 'I' | 'E' | 'B' | ' ';

export interface DsspResidue {
  chainId: string;
  resSeq: number;
  iCode: string;
  ss: DsspCode;
}

export interface DsspResult {
  /** Every residue with a complete backbone (N, Cα, C, O), in input order. */
  residues: DsspResidue[];
  /** β-ladders (bulges joined; isolated bridges too), like `_dssp_struct_ladder`. */
  ladders: BetaLadder[];
}

export interface DsspSegmentOptions {
  /** Draw 3₁₀ helices (G) as helices. Off by default, as for `parseDsspMmcif`. */
  helix310?: boolean;
}

/** Hydrogen-bond energy threshold (kcal/mol) and floor, as in DSSP. */
const MAX_HBOND_ENERGY = -0.5;
const MIN_HBOND_ENERGY = -9.9;
/** Cα–Cα distance beyond which no hydrogen bond is tried (Å). */
const MIN_CA_DISTANCE = 9;
/** C(i)–N(i+1) distance above which the chain is broken (Å). */
const MAX_PEPTIDE_BOND = 2.5;
/** q1·q2·f of the DSSP energy: 0.42 e · 0.20 e · 332 kcal Å / (mol e²). */
const COUPLING = 0.084 * 332;

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

interface Res {
  chainId: string;
  resSeq: number;
  iCode: string;
  n: Vec;
  ca: Vec;
  c: Vec;
  o: Vec;
  h: Vec;
  proline: boolean;
  /** No break between this residue and the previous one. */
  linked: boolean;
  /** The two lowest-energy acceptors (O of residue `to`) of this residue's N–H. */
  acceptors: { to: number; e: number }[];
}

/** DSSP's hydrogen-bond energy of N–H of `d` to C=O of `a` (kcal/mol). */
function energy(d: Res, a: Res): number {
  if (d.proline) return 0;
  const dHO = dist(d.h, a.o);
  const dHC = dist(d.h, a.c);
  const dNC = dist(d.n, a.c);
  const dNO = dist(d.n, a.o);
  if (dHO < 0.5 || dHC < 0.5 || dNC < 0.5 || dNO < 0.5) return MIN_HBOND_ENERGY;
  const e = COUPLING * (1 / dNO + 1 / dHC - 1 / dHO - 1 / dNC);
  return Math.max(MIN_HBOND_ENERGY, Math.round(e * 1000) / 1000);
}

function keep(list: { to: number; e: number }[], to: number, e: number): void {
  if (e >= MAX_HBOND_ENERGY) return;
  list.push({ to, e });
  list.sort((p, q) => p.e - q.e);
  if (list.length > 2) list.length = 2;
}

interface Ladder {
  type: 'parallel' | 'antiparallel';
  /** Residue indices of the first side, increasing. */
  i: number[];
  /** Partners: parallel increasing with `i`; antiparallel stored increasing, so j[0] pairs with i[last]. */
  j: number[];
}

/**
 * DSSP on a structure's backbone. Residues missing any of N, Cα, C or O are
 * left out (and break the chain).
 */
export function computeDssp(chains: readonly BackboneChain[]): DsspResult {
  const res: Res[] = [];
  for (const chain of chains) {
    let first = true;
    for (const r of chain.residues) {
      if (!r.n || !r.ca || !r.c || !r.o) {
        first = true;
        continue;
      }
      const prev = res[res.length - 1];
      const linked = !first && dist(prev.c, r.n) <= MAX_PEPTIDE_BOND;
      let h = r.n;
      if (linked) {
        // H sits 1 Å from N, opposite the previous carbonyl's C=O.
        const dx = prev.c.x - prev.o.x;
        const dy = prev.c.y - prev.o.y;
        const dz = prev.c.z - prev.o.z;
        const l = Math.hypot(dx, dy, dz) || 1;
        h = { x: r.n.x + dx / l, y: r.n.y + dy / l, z: r.n.z + dz / l };
      }
      res.push({
        chainId: chain.chainId,
        resSeq: r.resSeq,
        iCode: r.iCode,
        n: r.n,
        ca: r.ca,
        c: r.c,
        o: r.o,
        h,
        proline: r.resName === 'PRO',
        linked,
        acceptors: [],
      });
      first = false;
    }
  }
  const n = res.length;

  // Hydrogen bonds between residues whose Cα are within 9 Å (grid search).
  const cell = (v: number) => Math.floor(v / MIN_CA_DISTANCE);
  const grid = new Map<string, number[]>();
  res.forEach((r, i) => {
    const k = `${cell(r.ca.x)},${cell(r.ca.y)},${cell(r.ca.z)}`;
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  });
  for (let i = 0; i < n; i++) {
    const a = res[i];
    const cx = cell(a.ca.x);
    const cy = cell(a.ca.y);
    const cz = cell(a.ca.z);
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          for (const j of grid.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
            if (j <= i || dist(a.ca, res[j].ca) > MIN_CA_DISTANCE) continue;
            keep(a.acceptors, j, energy(a, res[j]));
            // Residue i's C=O to the next residue's own N–H is the peptide bond.
            if (j !== i + 1) keep(res[j].acceptors, i, energy(res[j], a));
          }
        }
  }

  /** N–H of `d` bonds to C=O of `a`. */
  const bond = (d: number, a: number): boolean =>
    d >= 0 && a >= 0 && d < n && a < n && res[d].acceptors.some((h) => h.to === a);
  /** No chain break from residue `a` through `b`. */
  const unbroken = (a: number, b: number): boolean => {
    if (a < 0 || b >= n) return false;
    for (let k = a + 1; k <= b; k++) if (!res[k].linked) return false;
    return true;
  };

  const ss: DsspCode[] = new Array<DsspCode>(n).fill(' ');

  // β-bridges between any residues whose Cα are within 9 Å (as DSSP 4; the
  // classic program skipped |i − j| < 3), grown into ladders as found.
  const ladders: Ladder[] = [];
  for (let i = 1; i + 2 < n; i++) {
    for (let j = i + 1; j + 1 < n; j++) {
      if (dist(res[i].ca, res[j].ca) > MIN_CA_DISTANCE) continue;
      if (!unbroken(i - 1, i + 1) || !unbroken(j - 1, j + 1)) continue;
      let type: Ladder['type'] | null = null;
      if ((bond(i + 1, j) && bond(j, i - 1)) || (bond(j + 1, i) && bond(i, j - 1))) {
        type = 'parallel';
      } else if ((bond(i + 1, j - 1) && bond(j + 1, i - 1)) || (bond(j, i) && bond(i, j))) {
        type = 'antiparallel';
      }
      if (!type) continue;
      const grow = ladders.find(
        (l) =>
          l.type === type &&
          l.i[l.i.length - 1] + 1 === i &&
          (type === 'parallel' ? l.j[l.j.length - 1] + 1 === j : l.j[0] - 1 === j),
      );
      if (grow) {
        grow.i.push(i);
        if (type === 'parallel') grow.j.push(j);
        else grow.j.unshift(j);
      } else {
        ladders.push({ type, i: [i], j: [j] });
      }
    }
  }

  // Join ladders across β-bulges: same type, gaps of < 6 residues on one side
  // and < 3 on the other (DSSP's rule). DSSP takes these differences unsigned,
  // so a negative one (the second ladder before the first) never counts as a gap.
  const gap = (to: number, from: number): number => (to >= from ? to - from : Infinity);
  ladders.sort((p, q) => p.i[0] - q.i[0] || p.j[0] - q.j[0]);
  for (let a = 0; a < ladders.length; a++) {
    for (let b = a + 1; b < ladders.length; b++) {
      const A = ladders[a];
      const B = ladders[b];
      const ibi = A.i[0];
      const iei = A.i[A.i.length - 1];
      const jbi = A.j[0];
      const jei = A.j[A.j.length - 1];
      const ibj = B.i[0];
      const iej = B.i[B.i.length - 1];
      const jbj = B.j[0];
      const jej = B.j[B.j.length - 1];
      if (
        A.type !== B.type ||
        !unbroken(Math.min(ibi, ibj), Math.max(iei, iej)) ||
        !unbroken(Math.min(jbi, jbj), Math.max(jei, jej)) ||
        gap(ibj, iei) >= 6 ||
        (iei >= ibj && ibi <= iej)
      ) {
        continue;
      }
      const bulge =
        A.type === 'parallel'
          ? (gap(jbj, jei) < 6 && gap(ibj, iei) < 3) || gap(jbj, jei) < 3
          : (gap(jbi, jej) < 6 && gap(ibj, iei) < 3) || gap(jbi, jej) < 3;
      if (!bulge) continue;
      A.i.push(...B.i);
      if (A.type === 'parallel') A.j.push(...B.j);
      else A.j.unshift(...B.j);
      ladders.splice(b, 1);
      b--;
    }
  }
  for (const l of ladders) {
    const code: DsspCode = l.i.length > 1 ? 'E' : 'B';
    for (const [lo, hi] of [
      [l.i[0], l.i[l.i.length - 1]],
      [l.j[0], l.j[l.j.length - 1]],
    ]) {
      for (let k = lo; k <= hi; k++) if (ss[k] !== 'E') ss[k] = code;
    }
  }

  // n-turns: C=O of i bonds to N–H of i + n.
  const turn = (i: number, k: number): boolean =>
    i >= 0 && i + k < n && unbroken(i, i + k) && bond(i + k, i);
  // α helices: two consecutive 4-turns.
  for (let i = 1; i + 4 < n; i++) {
    if (turn(i, 4) && turn(i - 1, 4)) for (let k = i; k <= i + 3; k++) ss[k] = 'H';
  }
  // 3₁₀ helices, where nothing else is.
  for (let i = 1; i + 3 < n; i++) {
    if (!turn(i, 3) || !turn(i - 1, 3)) continue;
    let empty = true;
    for (let k = i; k <= i + 2; k++) if (ss[k] !== ' ' && ss[k] !== 'G') empty = false;
    if (empty) for (let k = i; k <= i + 2; k++) ss[k] = 'G';
  }
  // π helices, over α helices too (DSSP 4).
  for (let i = 1; i + 5 < n; i++) {
    if (!turn(i, 5) || !turn(i - 1, 5)) continue;
    let empty = true;
    for (let k = i; k <= i + 4; k++)
      if (ss[k] !== ' ' && ss[k] !== 'I' && ss[k] !== 'H') empty = false;
    if (empty) for (let k = i; k <= i + 4; k++) ss[k] = 'I';
  }

  const ref = (k: number) => ({
    chainId: res[k].chainId,
    resSeq: res[k].resSeq,
    iCode: res[k].iCode,
  });
  return {
    residues: res.map((r, k) => ({
      chainId: r.chainId,
      resSeq: r.resSeq,
      iCode: r.iCode,
      ss: ss[k],
    })),
    ladders: ladders.map((l, k): BetaLadder => {
      const last = l.i.length - 1;
      const jLast = l.j.length - 1;
      return {
        id: `L${k + 1}`,
        type: l.type,
        a: { start: ref(l.i[0]), end: ref(l.i[last]) },
        b:
          l.type === 'parallel'
            ? { start: ref(l.j[0]), end: ref(l.j[jLast]) }
            : { start: ref(l.j[jLast]), end: ref(l.j[0]) },
      };
    }),
  };
}

/**
 * Helix and strand segments from DSSP codes, as `parseDsspMmcif` gives them:
 * α (H) and π (I) helices are helices, 3₁₀ (G) only with `helix310`, and
 * ladder residues (E) are strands. Each segment is a run of one class within
 * a chain, unbroken in residue order.
 */
export function dsspSegments(
  residues: readonly DsspResidue[],
  options: DsspSegmentOptions = {},
): RawSSSegment[] {
  const cls = (code: DsspCode): 'helix' | 'strand' | null =>
    code === 'H' || code === 'I' || (code === 'G' && options.helix310)
      ? 'helix'
      : code === 'E'
        ? 'strand'
        : null;
  const out: RawSSSegment[] = [];
  let open: RawSSSegment | null = null;
  for (const r of residues) {
    const c = cls(r.ss);
    if (open && (c !== open.type || r.chainId !== open.chainId)) open = null;
    if (!c) continue;
    if (open) open.end = r.resSeq;
    else {
      open = { chainId: r.chainId, start: r.resSeq, end: r.resSeq, type: c };
      out.push(open);
    }
  }
  return out;
}
