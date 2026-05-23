/**
 * Centripetal Catmull–Rom spline interpolation.
 *
 * Given a sequence of N control points and a parameter t in [0, N-1], returns
 * a smooth interpolated point. The curve passes through every control point
 * (unlike a uniform B-spline) and avoids the self-intersections / cusps that
 * uniform Catmull–Rom can produce in tight bends — important for protein
 * backbone curves where consecutive Cα can swing back close to each other.
 *
 * Endpoints are handled by mirroring (P_-1 = 2*P_0 - P_1, similarly at the end).
 */

export interface Vec {
  x: number;
  y: number;
  z: number;
}

const ALPHA = 0.5;
const EPS = 1e-9;

function tauStep(a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const d2 = dx * dx + dy * dy + dz * dz;
  // distance^(2*alpha); for alpha = 0.5 this is distance^1 = sqrt(d2).
  return Math.pow(Math.max(d2, EPS), ALPHA);
}

function lerp(a: Vec, b: Vec, ra: number, rb: number): Vec {
  return {
    x: ra * a.x + rb * b.x,
    y: ra * a.y + rb * b.y,
    z: ra * a.z + rb * b.z,
  };
}

function mirror(a: Vec, b: Vec): Vec {
  return { x: 2 * a.x - b.x, y: 2 * a.y - b.y, z: 2 * a.z - b.z };
}

/**
 * Sample one Catmull–Rom segment between P1 and P2 using neighbours P0, P3.
 * `u` is in [0, 1]; the segment spans from P1 (u=0) to P2 (u=1).
 */
function sampleSegment(P0: Vec, P1: Vec, P2: Vec, P3: Vec, u: number): Vec {
  const t0 = 0;
  const t1 = t0 + tauStep(P0, P1);
  const t2 = t1 + tauStep(P1, P2);
  const t3 = t2 + tauStep(P2, P3);

  const t = t1 + u * (t2 - t1);

  const A1 = lerp(P0, P1, (t1 - t) / (t1 - t0), (t - t0) / (t1 - t0));
  const A2 = lerp(P1, P2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
  const A3 = lerp(P2, P3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2));

  const B1 = lerp(A1, A2, (t2 - t) / (t2 - t0), (t - t0) / (t2 - t0));
  const B2 = lerp(A2, A3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));

  return lerp(B1, B2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1));
}

/**
 * Evaluate a centripetal Catmull–Rom curve through `points` at parameter t in [0, N-1].
 * Integer values of t return the corresponding control point exactly.
 */
export function evaluate(points: Vec[], t: number): Vec {
  const n = points.length;
  if (n === 0) throw new Error('catmull-rom: need at least one point');
  if (n === 1) return { ...points[0] };
  if (n === 2) {
    const u = Math.max(0, Math.min(1, t));
    return lerp(points[0], points[1], 1 - u, u);
  }

  const clamped = Math.max(0, Math.min(n - 1, t));
  const i = Math.min(n - 2, Math.floor(clamped));
  const u = clamped - i;

  const P1 = points[i];
  const P2 = points[i + 1];
  const P0 = i > 0 ? points[i - 1] : mirror(P1, P2);
  const P3 = i + 2 < n ? points[i + 2] : mirror(P2, P1);

  return sampleSegment(P0, P1, P2, P3, u);
}

/**
 * Densely sample the full centripetal Catmull–Rom curve.
 *
 * Returns N-1 stretches of (samplesPerSegment + 1) points each, concatenated,
 * with the join points deduplicated, plus the index of every control point
 * within the returned samples (so callers can locate which sample corresponds
 * to which input residue).
 */
export interface SampledCurve {
  /** All densely-sampled points along the curve, in order. */
  samples: Vec[];
  /** controlIndex[i] is the index into `samples` where input point i sits. */
  controlIndex: number[];
}

export function sampleCurve(points: Vec[], samplesPerSegment = 16): SampledCurve {
  const n = points.length;
  if (n === 0) return { samples: [], controlIndex: [] };
  if (n === 1) return { samples: [{ ...points[0] }], controlIndex: [0] };

  const samples: Vec[] = [];
  const controlIndex: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const P1 = points[i];
    const P2 = points[i + 1];
    const P0 = i > 0 ? points[i - 1] : mirror(P1, P2);
    const P3 = i + 2 < n ? points[i + 2] : mirror(P2, P1);

    controlIndex.push(samples.length);
    samples.push({ ...P1 });
    for (let k = 1; k < samplesPerSegment; k++) {
      const u = k / samplesPerSegment;
      samples.push(sampleSegment(P0, P1, P2, P3, u));
    }
  }
  controlIndex.push(samples.length);
  samples.push({ ...points[n - 1] });

  return { samples, controlIndex };
}
