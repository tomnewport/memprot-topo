/**
 * Cylindrical unwrap of a β-barrel chain.
 *
 * The ordinary {@link unrollChain} lays the membrane-plane path out as a single
 * cumulative arc length.  That is correct for a helical bundle, but it discards
 * the *sign* of circumferential travel: a β-barrel strand that runs back down
 * the bilayer still advances the (always-positive) arc, so antiparallel
 * neighbours fan out into a chevron instead of the parallel slanted bars a real
 * unrolled barrel shows.
 *
 * For a genuine cylinder we instead unwrap it.  Each Cα is described by its
 * angle θ about the barrel axis (the membrane normal, +z) and its height z.
 * The circumferential coordinate `u = R·θ`, with θ unwrapped continuously along
 * the chain, becomes the horizontal axis.  A strand tilted at angle α on the
 * cylinder then maps to a straight line at angle α in the plot, and — crucially
 * — every strand inherits the *same* winding sense, so the sheet's shear makes
 * them parallel.  This is the geometrically honest "cut the barrel and lay it
 * flat" view, and it places neighbouring strands at their true inter-strand
 * spacing automatically (no fixed gap, no idealisation).
 *
 * The output shares {@link UnrollResult}'s shape so the display can draw it with
 * the same polygon / loop / label machinery; only `arc` carries a different
 * meaning (signed circumferential position rather than cumulative arc length).
 */

import type { Calpha, SecondaryStructureSegment } from '../types.js';
import { sampleCurve, type Vec } from './catmull-rom.js';
import { fitBSpline, sampleBSpline } from './bspline.js';
import { projectHelixAxis } from './helix-axis.js';
import type { UnrolledPoint, UnrolledResidue, UnrolledSegment, UnrollResult } from './unroll.js';

export interface UnwrapBarrelOptions {
  /** Barrel axis position in xy (the cylinder centre). Required. */
  centre: { x: number; y: number };
  /** Spline samples per inter-Cα interval. @default 16 */
  sampleDensity?: number;
  /** 3-D Cα–Cα distance (Å) above which a chain break is inferred. @default 5.5 */
  breakDistance?: number;
  /** Z to treat as the membrane midplane (subtracted from all z). @default 0 */
  membraneCentre?: number;
  /** Secondary-structure annotation; runs are smoothed per type. */
  ssSegments?: SecondaryStructureSegment[];
  /** Amino acids per B-spline control point. @default 4 */
  aminosPerDof?: number;
}

const DEFAULTS = {
  sampleDensity: 16,
  breakDistance: 5.5,
  membraneCentre: 0,
  aminosPerDof: 4,
};

/** Bring an angle difference into (−π, π]. */
function wrapPi(d: number): number {
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

function ssTypeAt(
  segments: SecondaryStructureSegment[] | undefined,
  resSeq: number,
): 'helix' | 'strand' | 'coil' {
  if (!segments) return 'coil';
  for (const s of segments) if (resSeq >= s.start && resSeq <= s.end) return s.type;
  return 'coil';
}

interface BreakGroup {
  calphas: Calpha[];
  /** Pre-computed unwrapped (u, z) point per Cα, aligned with `calphas`. */
  pts: Vec[];
  /**
   * Real de-spiralled 3-D coordinate per Cα (honest barrel roll-up target,
   * issue #22), aligned with `calphas`.
   */
  pts3d: Vec[];
}

/**
 * Unwrap a β-barrel chain into the (arc = R·θ, z) cylindrical view.
 *
 * `arc` is the signed circumferential position; consecutive segments keep a
 * continuous arc (no per-element repositioning), so strands sit at their real
 * spacing around the barrel.
 */
export function unwrapBarrel(calphas: Calpha[], options: UnwrapBarrelOptions): UnrollResult {
  const { centre, sampleDensity, breakDistance, membraneCentre, ssSegments, aminosPerDof } = {
    ...DEFAULTS,
    ...options,
  };

  if (calphas.length === 0) {
    return { segments: [], totalArcLength: 0, zMin: 0, zMax: 0 };
  }

  // De-spiral helices first. A helix's Cα coil around its axis; if that axis lies
  // tangential to the barrel (e.g. a helix sitting flat above the membrane) the
  // coil makes the unwrapped angle θ oscillate back and forth, so the drawn
  // helix would double back on itself. Projecting each helix Cα onto its local
  // axis (as unrollChain does) removes the coil, leaving a clean monotonic path.
  const isHelix = ssSegments
    ? calphas.map((c) => ssTypeAt(ssSegments, c.resSeq) === 'helix')
    : calphas.map(() => false);
  const proj = ssSegments
    ? projectHelixAxis(
        calphas.map((c) => ({ x: c.x, y: c.y, z: c.z })),
        isHelix,
      )
    : calphas.map((c) => ({ x: c.x, y: c.y, z: c.z }));

  // Per-Cα cylindrical radius about the axis; the mean sets a single R so the
  // horizontal scale is uniform across strands.
  const r = proj.map((c) => Math.hypot(c.x - centre.x, c.y - centre.y));
  const radius = r.reduce((s, x) => s + x, 0) / r.length || 1;
  // Below this radius a residue sits near the barrel axis (e.g. a loop folded
  // *inside* the barrel, like OmpF's L3), where the unwrap angle is unstable —
  // a tiny xy wobble swings θ wildly. Such residues carry the previous angle
  // forward instead of jumping, so they don't fan into spurious slants or
  // stretch the plot.
  const minRadius = 0.4 * radius;

  // Continuously unwrapped angle along the whole chain, then scaled to arc.
  const u = new Array<number>(calphas.length);
  let theta = Math.atan2(proj[0].y - centre.y, proj[0].x - centre.x);
  u[0] = radius * theta;
  let prevAngle = theta;
  for (let i = 1; i < calphas.length; i++) {
    const a = Math.atan2(proj[i].y - centre.y, proj[i].x - centre.x);
    if (r[i] >= minRadius && r[i - 1] >= minRadius) {
      theta += wrapPi(a - prevAngle);
    }
    // Interior residues hold θ; reliable residues advance prevAngle.
    if (r[i] >= minRadius) prevAngle = a;
    u[i] = radius * theta;
  }
  // Orient so the chain winds in the +arc direction (left-to-right unrolling).
  if (u[u.length - 1] < u[0]) for (let i = 0; i < u.length; i++) u[i] = -u[i];

  // Split on 3-D chain breaks, carrying the unwrapped points alongside.
  const groups: BreakGroup[] = [];
  let current: BreakGroup = { calphas: [], pts: [], pts3d: [] };
  const thr2 = breakDistance * breakDistance;
  for (let i = 0; i < calphas.length; i++) {
    const c = calphas[i];
    // De-spiralled z for the drawn path; real z is kept for residue depth below.
    const pt: Vec = { x: u[i], y: proj[i].z - membraneCentre, z: 0 };
    // Real de-spiralled 3-D coord (the honest roll-up target).
    const pt3d: Vec = { x: proj[i].x, y: proj[i].y, z: proj[i].z - membraneCentre };
    if (current.calphas.length === 0) {
      current.calphas.push(c);
      current.pts.push(pt);
      current.pts3d.push(pt3d);
      continue;
    }
    const prev = current.calphas[current.calphas.length - 1];
    const dx = c.x - prev.x;
    const dy = c.y - prev.y;
    const dz = c.z - prev.z;
    if (dx * dx + dy * dy + dz * dz > thr2) {
      groups.push(current);
      current = { calphas: [c], pts: [pt], pts3d: [pt3d] };
    } else {
      current.calphas.push(c);
      current.pts.push(pt);
      current.pts3d.push(pt3d);
    }
  }
  if (current.calphas.length) groups.push(current);

  const segments: UnrolledSegment[] = [];
  let zMin = Infinity;
  let zMax = -Infinity;
  let globalMaxArc = -Infinity;

  for (const group of groups) {
    const { calphas: groupCa, pts, pts3d } = group;
    const allSamples: UnrolledPoint[] = [];
    const allResidues: UnrolledResidue[] = [];
    let sampleOffset = 0;

    // Sub-split by SS type so each run can be smoothed appropriately.
    let runStart = 0;
    let runType = ssTypeAt(ssSegments, groupCa[0].resSeq);
    const flushRun = (start: number, end: number, type: 'helix' | 'strand' | 'coil'): void => {
      const subPts = pts.slice(start, end + 1);
      const subPts3d = pts3d.slice(start, end + 1);
      const subN = subPts.length;
      const k = Math.max(4, Math.ceil(subN / aminosPerDof));

      let splineSamples: Vec[];
      let controlIndex: number[];
      // The real 3-D centreline is sampled in lockstep with the (u,z) path —
      // same method, same control-point budget, so the parameterisation (hence
      // controlIndex) matches and every sample gets a real position.
      let samples3d: Vec[];
      if (type === 'helix' && subN >= 2) {
        // A helix is drawn as a straight bar between its (de-spiralled) endpoints.
        // This makes an arc reversal — a helix doubling back on itself in the
        // unwrap — impossible by construction, whatever the input geometry.
        const p0 = subPts[0];
        const p1 = subPts[subN - 1];
        const total = (subN - 1) * sampleDensity + 1;
        splineSamples = Array.from({ length: total }, (_, j) => {
          const t = j / (total - 1);
          return { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t, z: 0 };
        });
        const q0 = subPts3d[0];
        const q1 = subPts3d[subN - 1];
        samples3d = Array.from({ length: total }, (_, j) => {
          const t = j / (total - 1);
          return {
            x: q0.x + (q1.x - q0.x) * t,
            y: q0.y + (q1.y - q0.y) * t,
            z: q0.z + (q1.z - q0.z) * t,
          };
        });
        let prev = -1;
        controlIndex = subPts.map((_, i) => {
          let idx = Math.round((i / (subN - 1)) * (total - 1));
          if (idx <= prev) idx = prev + 1;
          prev = idx;
          return Math.min(idx, total - 1);
        });
      } else if (subN <= 3 || k >= subN) {
        const cr = sampleCurve(subPts, sampleDensity);
        splineSamples = cr.samples;
        controlIndex = cr.controlIndex;
        samples3d = sampleCurve(subPts3d, sampleDensity).samples;
      } else {
        // A few control points de-pleat the strand (the small circumferential
        // zigzag) and leave a clean straight or gently curved bar.
        const spline = fitBSpline(subPts, k);
        const sampled = sampleBSpline(spline, (subN - 1) * sampleDensity + 1);
        splineSamples = sampled.samples;
        controlIndex = sampled.controlIndex;
        const spline3d = fitBSpline(subPts3d, k);
        samples3d = sampleBSpline(spline3d, (subN - 1) * sampleDensity + 1).samples;
      }

      for (let j = 0; j < splineSamples.length; j++) {
        const s = splineSamples[j];
        const s3 = samples3d[j];
        allSamples.push({ arc: s.x, z: s.y, x3: s3.x, y3: s3.y });
        if (s.x > globalMaxArc) globalMaxArc = s.x;
      }
      for (let i = 0; i < subN; i++) {
        const ca = groupCa[start + i];
        const z = ca.z - membraneCentre;
        if (z < zMin) zMin = z;
        if (z > zMax) zMax = z;
        allResidues.push({
          resSeq: ca.resSeq,
          iCode: ca.iCode,
          arc: allSamples[sampleOffset + controlIndex[i]].arc,
          z,
          index: start + i,
          sampleIndex: sampleOffset + controlIndex[i],
        });
      }
      sampleOffset += splineSamples.length;
    };

    for (let i = 1; i < groupCa.length; i++) {
      const t = ssTypeAt(ssSegments, groupCa[i].resSeq);
      if (t !== runType) {
        flushRun(runStart, i - 1, runType);
        runStart = i;
        runType = t;
      }
    }
    flushRun(runStart, groupCa.length - 1, runType);

    segments.push({ samples: allSamples, residues: allResidues });
  }

  if (!Number.isFinite(zMin)) {
    zMin = 0;
    zMax = 0;
  }

  // Shift so the smallest arc sits at 0, matching the membrane-slab origin the
  // display expects.
  let minArc = Infinity;
  for (const seg of segments) for (const s of seg.samples) if (s.arc < minArc) minArc = s.arc;
  if (Number.isFinite(minArc) && minArc !== 0) {
    for (const seg of segments) {
      for (const s of seg.samples) s.arc -= minArc;
      for (const r of seg.residues) r.arc -= minArc;
    }
    globalMaxArc -= minArc;
  }

  return {
    segments,
    totalArcLength: Number.isFinite(globalMaxArc) ? globalMaxArc : 0,
    zMin,
    zMax,
  };
}
