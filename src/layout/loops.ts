import { catmullRomBezier, type UnrolledPoint } from '../unroll/index.js';
import { LOOP, PLOT } from './constants.js';

/** A loop control point in plot (arc, z) Ångström coordinates, tagged for debug colouring. */
export interface LoopControlPoint {
  arc: number;
  z: number;
  kind: 'endpoint' | 'tangent' | 'extreme';
}

/** Unit (arc, z) tangent between two display samples; falls back to +arc. */
export function unitTangent(
  samples: UnrolledPoint[],
  from: number,
  to: number,
): { a: number; z: number } {
  const da = samples[to].arc - samples[from].arc;
  const dz = samples[to].z - samples[from].z;
  const len = Math.sqrt(da * da + dz * dz);
  if (len < 1e-9) return { a: 1, z: 0 };
  return { a: da / len, z: dz / len };
}

/** Runtime-tunable loop rendering options, sourced from component attributes. */
export interface LoopRenderOptions {
  /** Draw debug circles at each control point. */
  showPoints: boolean;
  /** Whether to add vertical-extreme control points when a loop overshoots. */
  extremePoints: boolean;
  /** Fraction of the tangent-points' z-range beyond which extreme points appear. */
  extremeThreshold: number;
  /**
   * Tangent-handle length (screen px) for the loop's end control points.
   * Longer handles make the loop leave parallel to the SS element it exits
   * (used for barrel hairpins). Defaults to {@link LOOP.tangentMagPx}.
   */
  tangentMagPx?: number;
}

/** One end of a loop: the samples array and the boundary sample index within it. */
export interface LoopEnd {
  samples: UnrolledPoint[];
  index: number;
}

/** The path whose vertical extreme may pull extra control points out of range. */
export interface LoopExtreme {
  samples: UnrolledPoint[];
  startSample: number;
  endSample: number;
}

/**
 * Build the explicit control-point sequence for a loop / connector curve:
 *   1. previous element end (centre of path)            — if a previous end exists
 *   2. point 1 + previous element end-tangent × tangentMag
 *   3-4. two points at the loop's vertical extreme      — only when `extremePoints`
 *        is set and the loop reaches more than `extremeThreshold` of the
 *        tangent-points' z-range beyond it
 *   5. next element start − next element start-tangent × tangentMag
 *   6. next element start (centre of path)              — if a next end exists
 *
 * `prev`/`next` may carry samples from different chain segments (used for the
 * dashed connector across chain breaks). Distances in pixels assume a 1:1
 * arc/z aspect ratio.
 */
export function buildLoopPoints(
  prev: LoopEnd | null,
  next: LoopEnd | null,
  extreme: LoopExtreme | null,
  opts: LoopRenderOptions,
): LoopControlPoint[] {
  const magA = (opts.tangentMagPx ?? LOOP.tangentMagPx) / PLOT.arcPxPerA;
  const gapA = LOOP.elementGapPx / PLOT.arcPxPerA;
  const extremeSpacingA = LOOP.extremeSpacingPx / PLOT.arcPxPerA;

  const points: LoopControlPoint[] = [];

  // Points 1 & 2: previous element end and its outward tangent.
  let prevEnd: { arc: number; z: number } | null = null;
  if (prev) {
    const i = prev.index;
    prevEnd = { arc: prev.samples[i].arc, z: prev.samples[i].z };
    const t = unitTangent(prev.samples, Math.max(0, i - 1), i);
    points.push({ ...prevEnd, kind: 'endpoint' });
    points.push({ arc: prevEnd.arc + magA * t.a, z: prevEnd.z + magA * t.z, kind: 'tangent' });
  }

  // Points 5 & 6: next element start and its inward tangent (added after extremes).
  let nextStart: { arc: number; z: number } | null = null;
  let nextTangent: LoopControlPoint | null = null;
  if (next) {
    const i = next.index;
    nextStart = { arc: next.samples[i].arc, z: next.samples[i].z };
    const t = unitTangent(next.samples, i, Math.min(next.samples.length - 1, i + 1));
    nextTangent = { arc: nextStart.arc - magA * t.a, z: nextStart.z - magA * t.z, kind: 'tangent' };
  }

  if (opts.extremePoints && extreme) {
    // Vertical extreme of the loop's real path (z is unaffected by the layout shift).
    let loopMaxZ = -Infinity;
    let loopMinZ = Infinity;
    for (let i = extreme.startSample; i <= extreme.endSample; i++) {
      if (extreme.samples[i].z > loopMaxZ) loopMaxZ = extreme.samples[i].z;
      if (extreme.samples[i].z < loopMinZ) loopMinZ = extreme.samples[i].z;
    }

    // z-range spanned by the tangent control points placed so far.
    const tangentZs = [...points.map((p) => p.z)];
    if (nextStart) tangentZs.push(nextStart.z);
    if (nextTangent) tangentZs.push(nextTangent.z);
    const rangeMin = Math.min(...tangentZs);
    const rangeMax = Math.max(...tangentZs);
    const span = rangeMax - rangeMin;
    const margin = opts.extremeThreshold * span;

    // Decide whether the loop escapes the tangent-points' z-range, and on which side.
    let extremeZ: number | null = null;
    const aboveBy = loopMaxZ - rangeMax;
    const belowBy = rangeMin - loopMinZ;
    if (aboveBy > margin && aboveBy >= belowBy) extremeZ = loopMaxZ;
    else if (belowBy > margin) extremeZ = loopMinZ;

    if (extremeZ !== null) {
      // Two points at the extreme z give the interpolating curve a flat plateau
      // there; centre the pair horizontally between the two elements.
      const centreArc = prevEnd ? prevEnd.arc + gapA / 2 : nextStart ? nextStart.arc - gapA / 2 : 0;
      points.push({ arc: centreArc - extremeSpacingA / 2, z: extremeZ, kind: 'extreme' });
      points.push({ arc: centreArc + extremeSpacingA / 2, z: extremeZ, kind: 'extreme' });
    }
  }

  if (nextTangent) points.push(nextTangent);
  if (nextStart) points.push({ ...nextStart, kind: 'endpoint' });

  return points;
}

/**
 * A loop curve (centripetal Catmull-Rom through its control points) as a dense
 * polyline in (arc, z) Å, 16 points per Bézier piece.
 */
export function flattenLoop(points: { arc: number; z: number }[]): { x: number; y: number }[] {
  const bez = catmullRomBezier(points.map((p) => ({ x: p.arc, y: p.z, z: 0 })));
  const flat: { x: number; y: number }[] = [{ x: bez.start.x, y: bez.start.y }];
  let p0 = bez.start;
  for (const seg of bez.segments) {
    for (let i = 1; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      const b0 = u * u * u;
      const b1 = 3 * u * u * t;
      const b2 = 3 * u * t * t;
      const b3 = t * t * t;
      flat.push({
        x: b0 * p0.x + b1 * seg.c1.x + b2 * seg.c2.x + b3 * seg.end.x,
        y: b0 * p0.y + b1 * seg.c1.y + b2 * seg.c2.y + b3 * seg.end.y,
      });
    }
    p0 = seg.end;
  }
  return flat;
}
