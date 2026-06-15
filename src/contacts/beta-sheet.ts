/**
 * β-sheet partner detection and β-barrel geometry analysis.
 *
 * A transmembrane β-barrel is a single β-sheet closed onto itself into a
 * cylinder: the last strand hydrogen-bonds back to the first.  Two integers
 * describe the whole structure (Murzin, Lesk & Chothia, 1994,
 * https://doi.org/10.1006/jmbi.1994.1110):
 *
 *  - **n** — the number of strands (even; 8 for OmpA up to ~22–26 for the
 *    large porins).
 *  - **S** — the *shear number*: follow hydrogen-bonded partners residue by
 *    residue once around all n strands and you return displaced S residues
 *    along the strand axis.  S is the coiling stagger of the sheet.
 *
 * From (n, S) everything else follows.  The strand tilt α to the barrel axis
 * obeys, to a good approximation,
 *
 *      tan α ≈ (S · a) / (n · b)
 *
 * with rise-per-residue along the strand a ≈ 3.3 Å and inter-strand spacing
 * b ≈ 4.4 Å.  Transmembrane barrels sit around 30–45° tilt and are
 * all-antiparallel: the chain meanders up/down through the membrane, so the
 * N→C direction alternates, but the shear coils every strand the same way, so
 * on the *unrolled* sheet all strands are parallel slanted bars.
 *
 * This module recovers that picture from Cα coordinates alone:
 *  1. extract each β-strand and estimate its axis by PCA,
 *  2. pair strands that sit at β-sheet spacing with enough residue contacts,
 *     classifying each pair parallel / antiparallel,
 *  3. walk the pairing graph to decide whether the sheet closes into a barrel,
 *     and report n, the shear number S, the mean tilt, and the barrel frame.
 *
 * The whole tool works in the membrane frame (z = bilayer normal), so the
 * barrel axis is taken to be z and the analysis is expressed relative to it.
 */

import type { Calpha, ChainData, SecondaryStructureSegment } from '../types.js';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** One β-strand, with its Cα, centroid and PCA axis (oriented N→C). */
export interface Strand {
  /** Index of this strand within the ordered strand list (sequence order). */
  index: number;
  segment: SecondaryStructureSegment;
  calphas: Calpha[];
  centroid: Vec3;
  /** Unit axis direction, oriented from the first to the last residue. */
  axis: Vec3;
  /** Chain this strand belongs to (set for multi-chain assembly analysis). */
  chainId?: string;
}

/** A residue–residue Cα contact across a strand pair. */
export interface ResidueContact {
  aResSeq: number;
  bResSeq: number;
  /** Cα–Cα distance (Å). */
  distance: number;
}

/** Two strands judged to be hydrogen-bonded neighbours in a β-sheet. */
export interface StrandPairing {
  /** Strand index of the first partner. */
  a: number;
  /** Strand index of the second partner. */
  b: number;
  orientation: 'parallel' | 'antiparallel';
  /** Median nearest-neighbour Cα–Cα distance between the strands (Å). */
  spacing: number;
  /** Residue contacts (each `a` residue paired with its nearest `b` residue). */
  contacts: ResidueContact[];
}

export interface BarrelAnalysisOptions {
  /** Minimum acceptable median inter-strand spacing for a pair (Å). @default 3.5 */
  minSpacing?: number;
  /** Maximum acceptable median inter-strand spacing for a pair (Å). @default 6.5 */
  maxSpacing?: number;
  /** Cα–Cα distance below which a residue counts as in contact (Å). @default 5.5 */
  contactCutoff?: number;
  /** Minimum residue contacts for two strands to count as paired. @default 3 */
  minContacts?: number;
  /**
   * Minimum |cos θ| between strand axes for a pair to count (rejects strands
   * that merely pass near each other at a steep angle). @default 0.5 (±60°)
   */
  minAxisDot?: number;
}

export interface BarrelAnalysis {
  strands: Strand[];
  pairings: StrandPairing[];
  /** True when the strands form a single closed cycle (the sheet closes). */
  closed: boolean;
  /** Strand indices in ring (or, for an open sheet, path) order. */
  ringOrder: number[];
  /** Number of strands in the ring/path. */
  strandCount: number;
  /** Shear number S, derived from tilt, n and spacing (NaN if not a barrel). */
  shear: number;
  /** Mean tilt of the strands to the barrel axis, in degrees. */
  tiltDeg: number;
  /** Barrel axis (membrane normal, +z) and centre of the strand Cα. */
  axis: Vec3;
  centre: Vec3;
  /** Mean cylindrical radius of the strand Cα about the axis (Å). */
  radius: number;
  /**
   * True when the strands genuinely wrap a cylinder (centroids spread around
   * the axis), as opposed to lying in a plane.  Only a cylindrical, closed
   * barrel should drive the parallel "unwrap" rendering.
   */
  cylindrical: boolean;
}

const DEFAULTS: Required<BarrelAnalysisOptions> = {
  minSpacing: 3.5,
  maxSpacing: 6.5,
  contactCutoff: 5.5,
  minContacts: 3,
  minAxisDot: 0.5,
};

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function dist(a: Calpha, b: Calpha): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ---------------------------------------------------------------------------
// PCA axis (3×3 covariance dominant eigenvector by power iteration)
// ---------------------------------------------------------------------------

function strandAxis(calphas: Calpha[]): { centroid: Vec3; axis: Vec3 } {
  const n = calphas.length;
  const centroid: Vec3 = { x: 0, y: 0, z: 0 };
  for (const c of calphas) {
    centroid.x += c.x;
    centroid.y += c.y;
    centroid.z += c.z;
  }
  centroid.x /= n;
  centroid.y /= n;
  centroid.z /= n;

  const chord: Vec3 = {
    x: calphas[n - 1].x - calphas[0].x,
    y: calphas[n - 1].y - calphas[0].y,
    z: calphas[n - 1].z - calphas[0].z,
  };
  if (n < 3) {
    const len = Math.hypot(chord.x, chord.y, chord.z) || 1;
    return { centroid, axis: { x: chord.x / len, y: chord.y / len, z: chord.z / len } };
  }

  const M = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const c of calphas) {
    const d = [c.x - centroid.x, c.y - centroid.y, c.z - centroid.z];
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[a][b] += d[a] * d[b];
  }

  let v: [number, number, number] = [chord.x, chord.y, chord.z];
  let norm = Math.hypot(v[0], v[1], v[2]);
  v = norm < 1e-10 ? [1, 0, 0] : [v[0] / norm, v[1] / norm, v[2] / norm];
  for (let iter = 0; iter < 50; iter++) {
    const w: [number, number, number] = [
      M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
      M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
      M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
    ];
    norm = Math.hypot(w[0], w[1], w[2]);
    if (norm < 1e-10) break;
    const next: [number, number, number] = [w[0] / norm, w[1] / norm, w[2] / norm];
    const dot = Math.abs(next[0] * v[0] + next[1] * v[1] + next[2] * v[2]);
    v = next;
    if (1 - dot < 1e-9) break;
  }

  // Orient N→C so antiparallel/parallel classification is meaningful.
  if (v[0] * chord.x + v[1] * chord.y + v[2] * chord.z < 0) v = [-v[0], -v[1], -v[2]];
  return { centroid, axis: { x: v[0], y: v[1], z: v[2] } };
}

/**
 * Merge overlapping strand segments into one range each. PDB/DSSP SHEET records
 * list a barrel strand once per sheet relationship, so the same physical strand
 * routinely appears several times as overlapping ranges (e.g. `9–23` and
 * `9–12`); collapsing them is what turns a 42-record OmpF annotation back into
 * its ~16 physical strands. Distinct strands are always separated by a turn, so
 * merging on overlap (not mere adjacency) never fuses two real strands.
 */
function mergeStrandSegments(segments: SecondaryStructureSegment[]): SecondaryStructureSegment[] {
  const sorted = segments.filter((s) => s.type === 'strand').sort((a, b) => a.start - b.start);
  const merged: SecondaryStructureSegment[] = [];
  for (const seg of sorted) {
    const last = merged[merged.length - 1];
    // Merge only on overlap — distinct strands are always separated by at least
    // a turn (a resSeq gap), whereas duplicated SHEET records of one strand
    // overlap (e.g. `9–23` and `9–12`, or an exact `2–6`/`2–6`).
    if (last && seg.start <= last.end) {
      last.end = Math.max(last.end, seg.end);
    } else {
      merged.push({ ...seg });
    }
  }
  return merged;
}

/**
 * Extract β-strands from a chain's Cα and secondary-structure annotation, one
 * {@link Strand} per *physical* strand (overlapping/duplicate SHEET records are
 * merged first), in sequence order.  Segments with fewer than two resolved Cα
 * are skipped (too short for a meaningful axis).
 */
export function extractStrands(calphas: Calpha[], segments: SecondaryStructureSegment[]): Strand[] {
  const byRes = new Map<number, Calpha>();
  for (const c of calphas) byRes.set(c.resSeq, c);

  const strands: Strand[] = [];
  const strandSegs = mergeStrandSegments(segments);

  for (const seg of strandSegs) {
    const cas: Calpha[] = [];
    for (let r = seg.start; r <= seg.end; r++) {
      const c = byRes.get(r);
      if (c) cas.push(c);
    }
    if (cas.length < 2) continue;
    const { centroid, axis } = strandAxis(cas);
    strands.push({ index: strands.length, segment: seg, calphas: cas, centroid, axis });
  }
  return strands;
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

/**
 * Test whether two strands are β-sheet neighbours and, if so, return the
 * pairing (orientation, spacing, residue contacts).  Returns null otherwise.
 */
function pairOf(a: Strand, b: Strand, opts: Required<BarrelAnalysisOptions>): StrandPairing | null {
  // Nearest neighbour distance for each Cα of `a` into `b`, plus the contact.
  const nearest: number[] = [];
  const contacts: ResidueContact[] = [];
  for (const ca of a.calphas) {
    let best = Infinity;
    let bestCb: Calpha | null = null;
    for (const cb of b.calphas) {
      const d = dist(ca, cb);
      if (d < best) {
        best = d;
        bestCb = cb;
      }
    }
    nearest.push(best);
    if (bestCb && best <= opts.contactCutoff) {
      contacts.push({ aResSeq: ca.resSeq, bResSeq: bestCb.resSeq, distance: best });
    }
  }

  const spacing = median(nearest);
  if (
    !(spacing >= opts.minSpacing && spacing <= opts.maxSpacing) ||
    contacts.length < opts.minContacts ||
    Math.abs(dot3(a.axis, b.axis)) < opts.minAxisDot
  ) {
    return null;
  }

  const orientation = dot3(a.axis, b.axis) >= 0 ? 'parallel' : 'antiparallel';
  return { a: a.index, b: b.index, orientation, spacing, contacts };
}

/** All β-sheet partner pairings among the given strands. */
export function pairStrands(
  strands: Strand[],
  options: BarrelAnalysisOptions = {},
): StrandPairing[] {
  const opts = { ...DEFAULTS, ...options };
  const pairings: StrandPairing[] = [];
  for (let i = 0; i < strands.length; i++) {
    for (let j = i + 1; j < strands.length; j++) {
      const p = pairOf(strands[i], strands[j], opts);
      if (p) pairings.push(p);
    }
  }
  return pairings;
}

/**
 * Recover the barrel's ring order from the pairing graph, robustly enough for
 * real structures that carry a few stray β-bridges alongside the barrel.
 *
 * Each strand keeps only its (up to) two closest partners — in a sheet a strand
 * has exactly two neighbours — and an edge survives only if it is mutual. That
 * reduces the graph to a union of simple paths and cycles; the barrel is the
 * largest cycle. Returns its ordered strand indices, or an open path's order
 * with `closed = false` when nothing wraps shut.
 */
function ringFromPairings(
  nodes: number[],
  pairings: StrandPairing[],
): { order: number[]; closed: boolean } {
  const nodeSet = new Set(nodes);
  // Two closest partners per node.
  const partners = new Map<number, { other: number; spacing: number }[]>();
  for (const i of nodes) partners.set(i, []);
  for (const p of pairings) {
    if (!nodeSet.has(p.a) || !nodeSet.has(p.b)) continue;
    partners.get(p.a)!.push({ other: p.b, spacing: p.spacing });
    partners.get(p.b)!.push({ other: p.a, spacing: p.spacing });
  }
  const top = new Map<number, Set<number>>();
  for (const [i, list] of partners) {
    list.sort((x, y) => x.spacing - y.spacing);
    top.set(i, new Set(list.slice(0, 2).map((e) => e.other)));
  }

  // Keep only mutual edges → every node now has degree ≤ 2.
  const adj = new Map<number, number[]>();
  for (const i of nodes) adj.set(i, []);
  for (const [i, set] of top) {
    for (const j of set) {
      if (i < j && top.get(j)?.has(i)) {
        adj.get(i)!.push(j);
        adj.get(j)!.push(i);
      }
    }
  }

  // Walk each connected component (linear, since degree ≤ 2). A component that
  // returns to its start is a cycle; track the largest cycle and largest path.
  const seen = new Set<number>();
  let bestCycle: number[] = [];
  let bestPath: number[] = [];
  for (const s of nodes) {
    if (seen.has(s) || adj.get(s)!.length === 0) continue;
    const compSeen = new Set<number>();
    const stack = [s];
    while (stack.length) {
      const c = stack.pop()!;
      if (compSeen.has(c)) continue;
      compSeen.add(c);
      for (const m of adj.get(c)!) if (!compSeen.has(m)) stack.push(m);
    }
    for (const n of compSeen) seen.add(n);

    // Start a path at its lowest-index degree-1 end (deterministic); a pure
    // cycle has no end, so start at the lowest-index node.
    const ends = [...compSeen].filter((n) => adj.get(n)!.length === 1).sort((x, y) => x - y);
    const start = ends.length > 0 ? ends[0] : Math.min(...compSeen);

    const order: number[] = [start];
    let prev = -1;
    let cur = start;
    let closedHere = false;
    for (;;) {
      const next = adj.get(cur)!.find((n) => n !== prev);
      if (next === undefined) break;
      if (next === start) {
        closedHere = true;
        break;
      }
      order.push(next);
      prev = cur;
      cur = next;
    }
    if (closedHere && order.length > bestCycle.length) bestCycle = order;
    if (!closedHere && order.length > bestPath.length) bestPath = order;
  }

  return bestCycle.length > 0
    ? { order: bestCycle, closed: true }
    : { order: bestPath, closed: false };
}

/** Mean rise per residue along each strand's own axis (Å). */
function meanRisePerResidue(strands: Strand[]): number {
  let sum = 0;
  let count = 0;
  for (const s of strands) {
    for (let i = 1; i < s.calphas.length; i++) {
      const dx = s.calphas[i].x - s.calphas[i - 1].x;
      const dy = s.calphas[i].y - s.calphas[i - 1].y;
      const dz = s.calphas[i].z - s.calphas[i - 1].z;
      sum += Math.abs(dx * s.axis.x + dy * s.axis.y + dz * s.axis.z);
      count++;
    }
  }
  return count ? sum / count : 3.3;
}

/**
 * Analyse a chain's β-strands: pair them, recover ring order, and — when they
 * close into a cylinder — report the barrel parameters (n, shear, tilt, frame).
 *
 * The barrel axis is taken as the membrane normal (+z); coordinates must
 * already be in the membrane frame (see the `orientation` module).
 */
export function analyseBarrel(
  calphas: Calpha[],
  segments: SecondaryStructureSegment[],
  options: BarrelAnalysisOptions = {},
): BarrelAnalysis {
  return analyseStrandSet(extractStrands(calphas, segments), options);
}

/**
 * Analyse a pre-extracted set of β-strands (which may come from several chains,
 * each tagged with its `chainId`): pair them, recover ring order, and report the
 * barrel frame. Shared by single-chain {@link analyseBarrel} and the multi-chain
 * {@link analyseAssemblyBarrel}.
 */
export function analyseStrandSet(
  strands: Strand[],
  options: BarrelAnalysisOptions = {},
): BarrelAnalysis {
  const pairings = pairStrands(strands, options);
  const axis: Vec3 = { x: 0, y: 0, z: 1 };

  // A barrel-wall strand hydrogen-bonds to a neighbour on each side, so it has
  // ≥2 partners. This filter drops the short edge strands and the loop strands
  // that fold *inside* the barrel (OmpF's L3), leaving just the cylinder wall —
  // which is what should define the frame and carry the ring.
  const degree = new Map<number, number>();
  for (const s of strands) degree.set(s.index, 0);
  for (const p of pairings) {
    degree.set(p.a, (degree.get(p.a) ?? 0) + 1);
    degree.set(p.b, (degree.get(p.b) ?? 0) + 1);
  }
  const wallStrands = strands.filter((s) => (degree.get(s.index) ?? 0) >= 2);
  const { order, closed } = ringFromPairings(
    wallStrands.map((s) => s.index),
    pairings,
  );
  const wall = wallStrands.length >= 3 ? wallStrands : strands;

  const centre: Vec3 = { x: 0, y: 0, z: 0 };
  let nCa = 0;
  for (const s of wall)
    for (const c of s.calphas) {
      centre.x += c.x;
      centre.y += c.y;
      centre.z += c.z;
      nCa++;
    }
  if (nCa) {
    centre.x /= nCa;
    centre.y /= nCa;
    centre.z /= nCa;
  }

  const empty: BarrelAnalysis = {
    strands,
    pairings,
    closed: false,
    ringOrder: order,
    strandCount: strands.length,
    shear: NaN,
    tiltDeg: NaN,
    axis,
    centre,
    radius: 0,
    cylindrical: false,
  };
  if (wall.length < 3) return empty;

  // Mean tilt of the wall strands to the barrel axis.
  let tiltSum = 0;
  for (const s of wall) tiltSum += Math.acos(Math.min(1, Math.abs(dot3(s.axis, axis))));
  const tiltDeg = (tiltSum / wall.length) * (180 / Math.PI);

  // Radius and angular spread of the wall strands about the z-axis through the
  // centre.  A genuine barrel wraps the axis (small max angular gap); a planar
  // strand bundle has its centroids collinear, leaving a ~π gap.
  const radii: number[] = [];
  const angles: number[] = [];
  for (const s of wall) {
    const rx = s.centroid.x - centre.x;
    const ry = s.centroid.y - centre.y;
    radii.push(Math.hypot(rx, ry));
    angles.push(Math.atan2(ry, rx));
  }
  const radius = radii.reduce((a, b) => a + b, 0) / radii.length;
  angles.sort((a, b) => a - b);
  let maxGap = angles[0] + 2 * Math.PI - angles[angles.length - 1];
  for (let i = 1; i < angles.length; i++) maxGap = Math.max(maxGap, angles[i] - angles[i - 1]);
  const cylindrical = closed && wall.length >= 6 && radius > 1 && maxGap < 2.4;

  // Shear S from geometry: tan α = S·a / (n·b)  ⇒  S = n·b·tan α / a, with
  // a = rise per residue along the strand and b = inter-strand spacing.
  const n = order.length > 0 ? order.length : wall.length;
  const a = meanRisePerResidue(wall);
  const ringSet = new Set(order);
  const ringPairs = pairings.filter((p) => ringSet.has(p.a) && ringSet.has(p.b));
  const measuredB = median(ringPairs.map((p) => p.spacing));
  const b = Number.isFinite(measuredB) ? measuredB : (2 * Math.PI * radius) / n;
  const shear = (n * b * Math.tan((tiltDeg * Math.PI) / 180)) / a;

  return {
    strands,
    pairings,
    closed,
    ringOrder: order,
    strandCount: n,
    shear,
    tiltDeg,
    axis,
    centre,
    radius,
    cylindrical,
  };
}

/**
 * Extract β-strands from several chains, each tagged with its `chainId` and
 * given a unique global index, so they can be pooled and analysed together.
 */
export function extractAssemblyStrands(chains: ChainData[]): Strand[] {
  const all: Strand[] = [];
  for (const chain of chains) {
    for (const s of extractStrands(chain.calphas, chain.segments)) {
      all.push({ ...s, index: all.length, chainId: chain.chainId });
    }
  }
  return all;
}

/**
 * Detect a β-barrel formed across several chains — e.g. α-hemolysin's heptameric
 * stem, where each protomer donates a β-hairpin to one shared 14-stranded
 * barrel. Pools the strands from every chain onto one cylinder and analyses them
 * together; the returned ring strands carry their `chainId`.
 */
export function analyseAssemblyBarrel(
  chains: ChainData[],
  options: BarrelAnalysisOptions = {},
): BarrelAnalysis {
  return analyseStrandSet(extractAssemblyStrands(chains), options);
}
