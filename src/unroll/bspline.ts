/**
 * Clamped cubic B-spline fitting and evaluation.
 *
 * Implements least-squares fitting of a clamped degree-3 B-spline to a
 * sequence of 3-D points using the constrained endpoint formulation from
 * Piegl & Tiller "The NURBS Book" §9.4.1 (Algorithm A9.5).  Endpoints are
 * fixed to the first and last input points; interior control points minimise
 * the sum of squared distances to the remaining data points.
 *
 * The knot vector is uniform on the interior.  Parameterisation of the input
 * points uses chord-length (L2 distances between consecutive points), which
 * distributes the parameters proportionally to the actual spacing rather than
 * the index.
 */

import type { Vec } from './catmull-rom.js';

export interface FittedBSpline {
  controlPoints: Vec[];
  /** Clamped knot vector of length k + 4 (k = number of control points). */
  knots: number[];
  /** Chord-length parameter in [0, 1] for each input data point. */
  params: number[];
}

// ---------------------------------------------------------------------------
// Knot vector
// ---------------------------------------------------------------------------

function buildKnotVector(k: number): number[] {
  const p = 3;
  const T = new Array(k + p + 1).fill(0);
  for (let i = k; i <= k + p; i++) T[i] = 1;
  const nInterior = k - p - 1;
  for (let j = 1; j <= nInterior; j++) T[p + j] = j / (nInterior + 1);
  return T;
}

// ---------------------------------------------------------------------------
// de Boor span + basis functions (Algorithm A2.1 / A2.2, NURBS Book)
// ---------------------------------------------------------------------------

function findSpan(T: number[], n: number, t: number): number {
  if (t >= T[n + 1]) return n;
  if (t <= T[3]) return 3;
  let lo = 3,
    hi = n + 1;
  let mid = (lo + hi) >> 1;
  while (t < T[mid] || t >= T[mid + 1]) {
    if (t < T[mid]) hi = mid;
    else lo = mid;
    mid = (lo + hi) >> 1;
  }
  return mid;
}

/**
 * Returns N[0..3] = B_{span-3,3}(t) through B_{span,3}(t) (the 4 non-zero
 * cubic basis functions at the given knot span).
 */
function basisFunctions(T: number[], span: number, t: number): number[] {
  const N = [1, 0, 0, 0];
  const left = [0, 0, 0, 0];
  const right = [0, 0, 0, 0];
  for (let j = 1; j <= 3; j++) {
    left[j] = t - T[span + 1 - j];
    right[j] = T[span + j] - t;
    let saved = 0;
    for (let r = 0; r < j; r++) {
      const denom = right[r + 1] + left[j - r];
      if (denom < 1e-12) continue;
      const temp = N[r] / denom;
      N[r] = saved + right[r + 1] * temp;
      saved = left[j - r] * temp;
    }
    N[j] = saved;
  }
  return N;
}

// ---------------------------------------------------------------------------
// Chord-length parameterisation
// ---------------------------------------------------------------------------

function chordLengthParams(pts: Vec[]): number[] {
  const n = pts.length;
  if (n <= 1) return [0];
  const d = [0];
  for (let i = 1; i < n; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    const dz = pts[i].z - pts[i - 1].z;
    d.push(d[i - 1] + Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  const total = d[n - 1];
  if (total < 1e-10) return pts.map((_, i) => i / (n - 1));
  return d.map((x) => x / total);
}

// ---------------------------------------------------------------------------
// Least-squares via normal equations (Gaussian elimination with partial pivot)
// ---------------------------------------------------------------------------

function gaussianElim(A: number[][], b: number[]): number[] {
  const n = b.length;
  const aug = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) throw new Error('singular');
    for (let row = col + 1; row < n; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = aug[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
    x[i] /= aug[i][i];
  }
  return x;
}

function solveLeastSquares(A: number[][], b: number[]): number[] {
  const m = A.length;
  const k = A[0].length;
  const ATA = Array.from({ length: k }, () => new Array(k).fill(0));
  const ATb = new Array(k).fill(0);
  for (let i = 0; i < m; i++) {
    for (let p = 0; p < k; p++) {
      ATb[p] += A[i][p] * b[i];
      for (let q = 0; q < k; q++) ATA[p][q] += A[i][p] * A[i][q];
    }
  }
  return gaussianElim(ATA, ATb);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fit a clamped cubic B-spline with `k` control points to `points`.
 *
 * A cubic B-spline requires at least 4 control points (degree + 1).  `k` is
 * therefore clamped to [4, m].  When k = m the system is exactly-determined
 * (interpolation); when k < m it is least-squares approximation.  Callers
 * should use Catmull–Rom (or simply pass the raw points) for segments with
 * fewer than 4 points — `unrollChain` does this automatically.
 */
export function fitBSpline(points: Vec[], k: number): FittedBSpline {
  const m = points.length;
  const params = chordLengthParams(points);

  if (m <= 1) {
    const cp = m === 0 ? [{ x: 0, y: 0, z: 0 }] : [{ ...points[0] }];
    return { controlPoints: cp, knots: buildKnotVector(4), params };
  }

  if (m <= 3) {
    // Too few points for a valid degree-3 B-spline.  Return the original
    // points; the caller (unrollChain) should have used Catmull–Rom.
    return { controlPoints: points.map((p) => ({ ...p })), knots: buildKnotVector(4), params };
  }

  // m >= 4: enforce cubic B-spline minimum of 4 control points.
  k = Math.max(4, Math.min(k, m));

  const T = buildKnotVector(k);
  const n = k - 1;

  const intK = k - 2;
  const intM = m - 2;

  if (intK <= 0 || intM <= 0) {
    // Distribute k control points linearly between endpoints.
    const p0 = points[0],
      pm = points[m - 1];
    const controlPoints = Array.from({ length: k }, (_, j) => {
      const f = j / (k - 1);
      return {
        x: p0.x + f * (pm.x - p0.x),
        y: p0.y + f * (pm.y - p0.y),
        z: p0.z + f * (pm.z - p0.z),
      };
    });
    return { controlPoints, knots: T, params };
  }

  const q0 = points[0],
    qm = points[m - 1];

  // Build reduced basis matrix (intM rows × intK cols) and reduced RHS.
  const A: number[][] = [];
  const Qx: number[] = [],
    Qy: number[] = [],
    Qz: number[] = [];

  for (let i = 1; i < m - 1; i++) {
    const t = params[i];
    const span = findSpan(T, n, t);
    const N = basisFunctions(T, span, t);
    const row = new Array(intK).fill(0);
    let rx = points[i].x,
      ry = points[i].y,
      rz = points[i].z;
    for (let r = 0; r <= 3; r++) {
      const j = span - 3 + r;
      const val = N[r];
      if (j === 0) {
        rx -= val * q0.x;
        ry -= val * q0.y;
        rz -= val * q0.z;
      } else if (j === k - 1) {
        rx -= val * qm.x;
        ry -= val * qm.y;
        rz -= val * qm.z;
      } else {
        row[j - 1] = val;
      }
    }
    A.push(row);
    Qx.push(rx);
    Qy.push(ry);
    Qz.push(rz);
  }

  let Px: number[], Py: number[], Pz: number[];
  try {
    Px = solveLeastSquares(A, Qx);
    Py = solveLeastSquares(A, Qy);
    Pz = solveLeastSquares(A, Qz);
  } catch {
    // Singular normal equations — fall back to linear interpolation.
    const p0 = points[0],
      pm = points[m - 1];
    const controlPoints = Array.from({ length: k }, (_, j) => {
      const f = j / (k - 1);
      return {
        x: p0.x + f * (pm.x - p0.x),
        y: p0.y + f * (pm.y - p0.y),
        z: p0.z + f * (pm.z - p0.z),
      };
    });
    return { controlPoints, knots: T, params };
  }

  const controlPoints: Vec[] = [
    { ...q0 },
    ...Px.map((x, j) => ({ x, y: Py[j], z: Pz[j] })),
    { ...qm },
  ];

  return { controlPoints, knots: T, params };
}

/**
 * Evaluate the B-spline at parameter t ∈ [0, 1].
 */
export function evaluateBSpline({ controlPoints, knots }: FittedBSpline, t: number): Vec {
  const k = controlPoints.length;
  const n = k - 1;
  const tc = Math.max(0, Math.min(1, t));
  const span = findSpan(knots, n, tc);
  const N = basisFunctions(knots, span, tc);
  let x = 0,
    y = 0,
    z = 0;
  for (let r = 0; r <= 3; r++) {
    const j = span - 3 + r;
    x += N[r] * controlPoints[j].x;
    y += N[r] * controlPoints[j].y;
    z += N[r] * controlPoints[j].z;
  }
  return { x, y, z };
}

/**
 * Densely sample the B-spline at `totalSamples` uniformly-spaced parameter
 * values, and return the sample index for each original input point.
 *
 * The sample index for input point i is `round(params[i] * (totalSamples-1))`.
 */
export function sampleBSpline(
  spline: FittedBSpline,
  totalSamples: number,
): { samples: Vec[]; controlIndex: number[] } {
  const samples: Vec[] = [];
  for (let j = 0; j < totalSamples; j++) {
    const t = j / (totalSamples - 1);
    samples.push(evaluateBSpline(spline, t));
  }
  // Use floor and enforce strictly non-colliding indices; Math.round can map
  // two close params to the same sample when chord distance is very small.
  const controlIndex: number[] = [];
  let prev = -1;
  for (const t of spline.params) {
    let idx = Math.min(Math.floor(t * (totalSamples - 1)), totalSamples - 1);
    if (idx <= prev) idx = prev + 1;
    if (idx >= totalSamples) idx = totalSamples - 1;
    controlIndex.push(idx);
    prev = idx;
  }
  return { samples, controlIndex };
}
