/** Distance (Å) over which a loop eases from a moved element end to its own path. */
export const END_EASE = 5;

/** A helix bends into two straight cylinders only at a kink sharper than this. */
export const KINK_ANGLE = (20 * Math.PI) / 180;
/** A kink sharper than this is drawn as two separate, overlapping cylinders. */
export const SPLIT_ANGLE = (45 * Math.PI) / 180;
/**
 * Shortest stretch of trace (Å, about five residues) either side of a helix
 * kink. Measured along the trace, not in samples: at ~16 samples per residue a
 * sample count let the end hooks of the local-axis trace pass for kinks, and
 * the helix grew a sub-ångström stub cylinder at a sharp angle on its end.
 */
export const KINK_ARM = 7.5;

/**
 * Best-fit line through samples a..b of `w` (stride 4): centroid and unit
 * direction (principal axis, pointing from sample a towards sample b).
 */
export function fitLine(w: Float64Array, a: number, b: number): { c: number[]; d: number[] } {
  const n = b - a + 1;
  const c = [0, 0, 0];
  for (let g = a; g <= b; g++) for (let k = 0; k < 3; k++) c[k] += w[g * 4 + k] / n;
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let g = a; g <= b; g++) {
    const q = [w[g * 4] - c[0], w[g * 4 + 1] - c[1], w[g * 4 + 2] - c[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] += q[i] * q[j];
  }
  // Power iteration from the end-to-end direction.
  let d = [w[b * 4] - w[a * 4], w[b * 4 + 1] - w[a * 4 + 1], w[b * 4 + 2] - w[a * 4 + 2]];
  for (let it = 0; it < 24; it++) {
    const e = [0, 1, 2].map((i) => m[i * 3] * d[0] + m[i * 3 + 1] * d[1] + m[i * 3 + 2] * d[2]);
    const l = Math.hypot(e[0], e[1], e[2]);
    if (l < 1e-12) break;
    d = e.map((x) => x / l);
  }
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  d = d.map((x) => x / l);
  const ex = [w[b * 4] - w[a * 4], w[b * 4 + 1] - w[a * 4 + 1], w[b * 4 + 2] - w[a * 4 + 2]];
  if (d[0] * ex[0] + d[1] * ex[1] + d[2] * ex[2] < 0) d = d.map((x) => -x);
  return { c, d };
}

/**
 * Sample index at which helix g0..g1 bends by more than KINK_ANGLE (the split
 * with the sharpest angle between the two halves' axes), or -1 if straight.
 */

export function findKink(w: Float64Array, g0: number, g1: number): number {
  const s = new Float64Array(g1 - g0 + 1);
  for (let g = g0 + 1; g <= g1; g++) {
    s[g - g0] =
      s[g - g0 - 1] +
      Math.hypot(w[g * 4] - w[g * 4 - 4], w[g * 4 + 1] - w[g * 4 - 3], w[g * 4 + 2] - w[g * 4 - 2]);
  }
  const total = s[g1 - g0];
  let best = -1;
  let bestAngle = KINK_ANGLE;
  for (let k = g0 + 1; k < g1; k++) {
    if (s[k - g0] < KINK_ARM || total - s[k - g0] < KINK_ARM) continue;
    const p = fitLine(w, g0, k).d;
    const q = fitLine(w, k, g1).d;
    const angle = Math.acos(Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
    if (angle > bestAngle) {
      bestAngle = angle;
      best = k;
    }
  }
  return best;
}
