/**
 * A camera that blends continuously from orthographic to perspective.
 *
 * The camera orbits `target` at azimuth `az` (about +z) and elevation `el`
 * (positive = looking down). `scale` is pixels per Å at the target's depth and
 * `fov` the diagonal field of view of the viewport: as `fov` → 0 the camera
 * dollies out to infinity while zooming in to keep `scale`, which is exactly
 * an orthographic projection — so the 2-D view is the fov = 0 limit.
 */
export interface CameraParams {
  target: [number, number, number];
  az: number;
  el: number;
  scale: number;
  fov: number;
  /** Viewport diagonal (px), used with `fov` to set the focal length. */
  diag: number;
  /** Screen position (px) of the target. */
  cx: number;
  cy: number;
}

export class Camera {
  readonly r: [number, number, number];
  readonly up: [number, number, number];
  readonly v: [number, number, number];
  /** Camera distance from the target (Å); Infinity when orthographic. */
  readonly dist: number;
  /** Camera position (world), meaningful only when `dist` is finite. */
  readonly eye: [number, number, number];

  constructor(readonly p: CameraParams) {
    const ca = Math.cos(p.az);
    const sa = Math.sin(p.az);
    const ce = Math.cos(p.el);
    const se = Math.sin(p.el);
    this.v = [sa * ce, ca * ce, -se];
    this.r = [ca, -sa, 0];
    this.up = [sa * se, ca * se, ce];
    if (p.fov > 1e-5) {
      const focal = p.diag / 2 / Math.tan(p.fov / 2);
      this.dist = focal / p.scale;
    } else this.dist = Infinity;
    const d = Number.isFinite(this.dist) ? this.dist : 0;
    this.eye = [
      p.target[0] - this.v[0] * d,
      p.target[1] - this.v[1] * d,
      p.target[2] - this.v[2] * d,
    ];
  }

  /**
   * Project a world point. Writes screen x, screen y (y down), depth along the
   * view axis (larger = farther) and the perspective factor into `out`.
   */
  project(x: number, y: number, z: number, out: Float64Array, o = 0): void {
    const { r, up, v, p } = this;
    const qx = x - p.target[0];
    const qy = y - p.target[1];
    const qz = z - p.target[2];
    const xc = qx * r[0] + qy * r[1] + qz * r[2];
    const yc = qx * up[0] + qy * up[1] + qz * up[2];
    const dc = qx * v[0] + qy * v[1] + qz * v[2];
    let k = 1;
    if (Number.isFinite(this.dist)) k = this.dist / Math.max(this.dist * 0.05, this.dist + dc);
    out[o] = p.cx + p.scale * xc * k;
    out[o + 1] = p.cy - p.scale * yc * k;
    out[o + 2] = dc;
    out[o + 3] = k;
  }

  /** Unit vector from a world point towards the eye. */
  toEye(x: number, y: number, z: number, out: Float64Array, o = 0): void {
    if (!Number.isFinite(this.dist)) {
      out[o] = -this.v[0];
      out[o + 1] = -this.v[1];
      out[o + 2] = -this.v[2];
      return;
    }
    const dx = this.eye[0] - x;
    const dy = this.eye[1] - y;
    const dz = this.eye[2] - z;
    const l = Math.hypot(dx, dy, dz) || 1;
    out[o] = dx / l;
    out[o + 1] = dy / l;
    out[o + 2] = dz / l;
  }

  /** World direction → camera space (x right, y up, d away from viewer). */
  toCam(x: number, y: number, z: number, out: Float64Array, o = 0): void {
    const { r, up, v } = this;
    out[o] = x * r[0] + y * r[1] + z * r[2];
    out[o + 1] = x * up[0] + y * up[1] + z * up[2];
    out[o + 2] = x * v[0] + y * v[1] + z * v[2];
  }
}
