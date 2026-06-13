/**
 * Project Cα positions in a secondary-structure region onto their local
 * element axis.
 *
 * For each Cα flagged in the mask, a sliding window of neighbouring flagged
 * Cα is used to estimate the local element axis via the dominant eigenvector
 * of the position covariance matrix (power iteration).  The Cα is then
 * projected onto the axis through the window centroid, giving its axial
 * footprint.  Un-flagged Cα are returned unchanged.
 *
 * Why this helps: both regular secondary structures carry a periodic
 * oscillation about their axis that is noise under a 2-D projection.
 * Alpha-helix Cα spiral ~2.3 Å around the axis at 100°/residue (period ~3.6
 * residues); beta-strand Cα pleat ~1 Å either side of the axis (period 2
 * residues).  Fitting a spline directly through them inherits that
 * oscillation.  Projecting onto the axis first removes it, leaving only the
 * smooth trajectory of the element — its tilt, curvature and kinks.  The axis
 * orientation itself (e.g. a strand's membrane crossing angle) is preserved.
 *
 * See `docs/rendering.md` for the geometry and the comparison with how PyMOL
 * and VMD handle the same problem.
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

function dominantEigenvector(
  M: number[][],
  seed: [number, number, number],
): [number, number, number] {
  let v: [number, number, number] = seed;
  let norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (norm < 1e-10) v = [1, 1, 1];
  else v = [v[0] / norm, v[1] / norm, v[2] / norm];
  for (let iter = 0; iter < 40; iter++) {
    const w = matVec(M, v);
    norm = Math.sqrt(w[0] * w[0] + w[1] * w[1] + w[2] * w[2]);
    if (norm < 1e-10) break;
    const vNew: [number, number, number] = [w[0] / norm, w[1] / norm, w[2] / norm];
    const dot = Math.abs(vNew[0] * v[0] + vNew[1] * v[1] + vNew[2] * v[2]);
    v = vNew;
    if (1 - dot < 1e-8) break;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a copy of `pts` in which every masked position has been projected
 * onto the local element axis estimated from a sliding window of masked
 * neighbours.
 *
 * @param pts        3-D Cα positions (already membrane-frame, in the same
 *                   order as `mask`).
 * @param mask       Boolean mask — true for each position belonging to the
 *                   secondary-structure element being projected.
 * @param windowHalf Half-width of the sliding window.  Choose roughly two
 *                   periods of the element's oscillation: ~4 for helices
 *                   (period ~3.6 residues), ~2 for strands (period 2).  At
 *                   least 3 points in the window are required to estimate an
 *                   axis.
 */
export function projectLocalAxis(pts: Vec[], mask: boolean[], windowHalf = 4): Vec[] {
  const n = pts.length;
  const result: Vec[] = pts.map((p) => ({ ...p }));

  for (let i = 0; i < n; i++) {
    if (!mask[i]) continue;

    // Collect masked neighbours within the window.
    const window: Vec[] = [];
    for (let j = Math.max(0, i - windowHalf); j <= Math.min(n - 1, i + windowHalf); j++) {
      if (mask[j]) window.push(pts[j]);
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

    // Helix axis direction: seed from the window chord so power iteration
    // converges correctly even for helices whose axis lies in the xy plane.
    const last = window[window.length - 1];
    const seed: [number, number, number] = [
      last.x - window[0].x,
      last.y - window[0].y,
      last.z - window[0].z,
    ];
    const [ex, ey, ez] = dominantEigenvector(M, seed);

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

/**
 * Project helix Cα onto their local helix axis.  Thin wrapper over
 * {@link projectLocalAxis} with the helix-appropriate default window
 * (~2.5 turns).  Retained for callers and tests that target helices
 * specifically.
 */
export function projectHelixAxis(pts: Vec[], isHelix: boolean[], windowHalf = 4): Vec[] {
  return projectLocalAxis(pts, isHelix, windowHalf);
}
