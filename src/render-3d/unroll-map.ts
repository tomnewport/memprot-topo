/**
 * The 2-D rolling-unroll map (issue #22). Pure, no three.js — unit-testable.
 *
 * The unroll lives entirely in the view XZ plane (horizontal × depth) about the
 * vertical membrane-normal axis: every centreline sample has a flat position
 * `F = (Fx, Fz=0)` (the SVG strip) and an honest real cross-section position
 * `S = (Sx, Sz)`. `curlXZ` moves a sample from F (β=0) to S (β=1).
 *
 * A straight F→S chord makes the structure look like it *deflates inward* — many
 * samples cut across the axis. Instead we route each sample along a quadratic
 * Bézier whose control point is pushed radially OUT to ~`ringR`, so the path
 * bulges *around* the axis rather than through it: the flat sheet visibly curls
 * up onto the cylinder. Endpoints are exact (β=0 → F, β=1 → S) so the t=0 frame
 * still matches the SVG diagram and the t=1 frame is the real structure.
 *
 * Combined with the N→C travelling wavefront in the renderer, this reads as the
 * diagram rolling up rather than morphing.
 */

export interface XZ {
  x: number;
  z: number;
}

const hyp = Math.hypot;

/**
 * Curl a sample from its flat point `(Fx, Fz)` to its real point `(Sx, Sz)` at
 * roll fraction `β ∈ [0,1]`. `ringR` is the structure's mean cross-section radius
 * about the axis; `kCap` sets how far the curl bulges out (≈1.25·ringR). Exact at
 * the endpoints.
 */
export function curlXZ(
  Fx: number,
  Fz: number,
  Sx: number,
  Sz: number,
  beta: number,
  ringR: number,
  kCap = 1.25,
): XZ {
  if (beta <= 0) return { x: Fx, z: Fz };
  if (beta >= 1) return { x: Sx, z: Sz };

  const rS = hyp(Sx, Sz);
  // Control radius needed to clear the axis (so the path bows around, not through,
  // the centre), but not out to the wide flat strip radius so far ends curl in
  // cleanly. Capped to the cross-section, not the strip width.
  const want = Math.max(rS * 1.1, ringR * kCap);

  let mx = (Fx + Sx) / 2;
  let mz = (Fz + Sz) / 2;
  let mr = hyp(mx, mz);
  if (mr < 1e-3) {
    // Flat and real points ~antipodal: push the control perpendicular to the
    // chord so the path still bows clear of the axis.
    const dx = Sx - Fx;
    const dz = Sz - Fz;
    const dl = hyp(dx, dz) || 1;
    mx = -dz / dl;
    mz = dx / dl;
    mr = 1;
  }
  // Only ever push the control OUTWARD (s ≥ 1). When the chord midpoint already
  // sits beyond `want` (far same-side samples), keep it on the chord so the path
  // never bends *toward* the axis — there it degenerates to the straight chord,
  // which for same-side samples already stays clear.
  const s = Math.max(want, mr) / mr;
  const Cx = mx * s;
  const Cz = mz * s;

  const w = 1 - beta;
  const a = w * w;
  const b2 = 2 * w * beta;
  const c = beta * beta;
  return { x: a * Fx + b2 * Cx + c * Sx, z: a * Fz + b2 * Cz + c * Sz };
}

/** Mean cross-section radius (rms) of real XZ points about the axis (origin). */
export function ringRadius(points: ReadonlyArray<{ x: number; z: number }>): number {
  if (points.length === 0) return 1;
  let s = 0;
  for (const p of points) s += p.x * p.x + p.z * p.z;
  return Math.sqrt(s / points.length) || 1;
}
