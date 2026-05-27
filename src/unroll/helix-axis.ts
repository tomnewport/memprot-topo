/**
 * Project Cα positions in helix regions onto the local helix axis.
 *
 * For each Cα that belongs to a helix, a sliding window of neighbouring
 * helix-only Cα is used to estimate the local helix axis via the dominant
 * eigenvector of the position covariance matrix (power iteration).  The Cα
 * is then projected onto the axis through the window centroid, giving its
 * axial footprint.
 *
 * Non-helix Cα are returned unchanged.
 *
 * Why this helps: alpha-helix Cα atoms spiral ~2.3 Å (0.23 nm) around the
 * axis at 100°/residue.  Fitting a spline directly through them produces
 * high-frequency oscillations in the membrane-plane arc length.  Projecting
 * to the axis first removes the twist, leaving only the smooth trajectory of
 * the helix backbone.
 */

import type { Vec } from './catmull-rom.js';

// ---------------------------------------------------------------------------
// 3 × 3 power-iteration dominant eigenvector
// ---------------------------------------------------------------------------

function matVec(M: number[][], v: [number, number, number]): [number, number, number] {
  return [
    M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2],
    M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2],
    M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2],
  ];
}

function dominantEigenvector(M: number[][]): [number, number, number] {
  let v: [number, number, number] = [0, 0, 1];
  for (let iter = 0; iter < 40; iter++) {
    const w = matVec(M, v);
    const norm = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]);
    if (norm < 1e-10) break;
    v = [w[0] / norm, w[1] / norm, w[2] / norm];
  }
  return v;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a copy of `pts` in which every helix position has been projected
 * onto the local helix axis estimated from a sliding window of helix-only
 * neighbours.
 *
 * @param pts       3-D Cα positions (already membrane-frame, in the same
 *                  order as `isHelix`).
 * @param isHelix   Boolean mask — true for each position that belongs to a
 *                  helix secondary-structure segment.
 * @param windowHalf Half-width of the sliding window (default 4, covering
 *                  ~2.5 turns of helix).  At least 3 points in the window
 *                  are required to estimate an axis.
 */
export function projectHelixAxis(pts: Vec[], isHelix: boolean[], windowHalf = 4): Vec[] {
  const n = pts.length;
  const result: Vec[] = pts.map((p) => ({ ...p }));

  for (let i = 0; i < n; i++) {
    if (!isHelix[i]) continue;

    // Collect helix-only neighbours within the window.
    const window: Vec[] = [];
    for (let j = Math.max(0, i - windowHalf); j <= Math.min(n - 1, i + windowHalf); j++) {
      if (isHelix[j]) window.push(pts[j]);
    }
    if (window.length < 3) continue;

    // Centroid.
    const C = { x: 0, y: 0, z: 0 };
    for (const p of window) {
      C.x += p.x;
      C.y += p.y;
      C.z += p.z;
    }
    C.x /= window.length;
    C.y /= window.length;
    C.z /= window.length;

    // Covariance matrix.
    const M = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (const p of window) {
      const d = [p.x - C.x, p.y - C.y, p.z - C.z];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[a][b] += d[a] * d[b];
    }

    // Helix axis direction (dominant eigenvector).
    const [ex, ey, ez] = dominantEigenvector(M);

    // Project pts[i] onto the axis through C.
    const dx = pts[i].x - C.x;
    const dy = pts[i].y - C.y;
    const dz = pts[i].z - C.z;
    const dot = dx * ex + dy * ey + dz * ez;
    result[i] = {
      x: C.x + dot * ex,
      y: C.y + dot * ey,
      z: C.z + dot * ez,
    };
  }

  return result;
}
