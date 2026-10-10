import type { View3DModel } from './model.js';

/**
 * The curtain at one moment of the morph: a vertical developable surface given
 * by its xy base curve, sampled at nodes with curtain coordinate `U`, position
 * (`X`, `Y`) and heading `H` (radians). At t = 0 it is the flat 2-D plane
 * (heading 0 everywhere, y = 0); at t = 1 it is the real chain path (or barrel
 * cylinder). In between, every turn is scaled by t, so the strip bends like
 * paper — lengths along it are preserved.
 *
 * World frame: x right, y away from the viewer, z up (membrane normal).
 */
export class Curtain {
  constructor(
    readonly U: Float64Array,
    readonly X: Float64Array,
    readonly Y: Float64Array,
    readonly H: Float64Array,
  ) {}

  private seek(u: number): number {
    const U = this.U;
    let lo = 0;
    let hi = U.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (U[mid] <= u) lo = mid;
      else hi = mid;
    }
    return lo;
  }

  /**
   * World position of curtain point (u, z) offset by `n` along the normal and
   * `b` along the tangent. Writes x, y, z, heading into `out`.
   */
  place(u: number, z: number, n: number, b: number, out: Float64Array, o = 0): void {
    const { U, X, Y, H } = this;
    const last = U.length - 1;
    let x: number;
    let y: number;
    let h: number;
    if (last <= 0) {
      h = last === 0 ? H[0] : 0;
      x = (last === 0 ? X[0] : 0) + (u - (last === 0 ? U[0] : 0)) * Math.cos(h);
      y = (last === 0 ? Y[0] : 0) + (u - (last === 0 ? U[0] : 0)) * Math.sin(h);
    } else if (u <= U[0]) {
      h = H[0];
      x = X[0] + (u - U[0]) * Math.cos(h);
      y = Y[0] + (u - U[0]) * Math.sin(h);
    } else if (u >= U[last]) {
      h = H[last];
      x = X[last] + (u - U[last]) * Math.cos(h);
      y = Y[last] + (u - U[last]) * Math.sin(h);
    } else {
      const k = this.seek(u);
      const du = U[k + 1] - U[k];
      const f = du > 1e-12 ? (u - U[k]) / du : 0;
      x = X[k] + f * (X[k + 1] - X[k]);
      y = Y[k] + f * (Y[k + 1] - Y[k]);
      h = H[k] + f * (H[k + 1] - H[k]);
    }
    const c = Math.cos(h);
    const s = Math.sin(h);
    // Tangent (c, s); normal = tangent × ẑ = (s, −c).
    out[o] = x + n * s + b * c;
    out[o + 1] = y - n * c + b * s;
    out[o + 2] = z;
    out[o + 3] = h;
  }
}

/** Per-sample state of the morph at one moment. */
export interface Pose {
  /** Curtain coordinates of every sample. */
  u: Float64Array;
  z: Float64Array;
  n: Float64Array;
  b: Float64Array;
  /** World x, y, z and curtain heading of every sample (stride 4). */
  w: Float64Array;
  curtain: Curtain;
  /** Per-sample morph progress (differs from τ only while sweeping). */
  t: Float64Array;
}

function smoothstep(x: number): number {
  const c = x < 0 ? 0 : x > 1 ? 1 : x;
  return c * c * (3 - 2 * c);
}

/**
 * Progress of a sample at normalised display position `p` when the global
 * progress is `tau`. With `sweep` > 0 the roll travels from the N-terminal
 * (left) end to the C-terminal end as a wave `sweep` wide; 0 rolls uniformly.
 */
export function localProgress(tau: number, p: number, sweep: number): number {
  if (sweep <= 0) return tau;
  return smoothstep((tau * (1 + sweep) - p) / sweep);
}

function applyRigid(X: Float64Array, Y: Float64Array, H: Float64Array, r: Rigid): void {
  const c = Math.cos(r.phi);
  const s = Math.sin(r.phi);
  for (let k = 0; k < X.length; k++) {
    const x = X[k];
    const y = Y[k];
    X[k] = c * x - s * y + r.tx;
    Y[k] = s * x + c * y + r.ty;
    H[k] += r.phi;
  }
}

/** Curtain-grid spacing (Å) for the cylinder mode. */
const GRID = 0.5;
/** Extra curtain beyond the samples (Å), for loop curves and widths. */
const GRID_MARGIN = 60;

/**
 * A rigid motion in the membrane plane (rotation `phi` about +z, then a
 * shift), applied to the whole curtain so the morph can be kept steady on
 * screen without changing its shape.
 */
export interface Rigid {
  phi: number;
  tx: number;
  ty: number;
}

/**
 * Pose of every sample at progress `tau`.
 *
 * Each joint of the curtain bends by its own share of the final turn (scaled
 * by its local progress), so a sweeping roll curls up like a carpet: the
 * finished part is a rigid copy of the real structure, the rest is still flat,
 * and curvature never exceeds the final curvature. `rigid` places the result.
 */
export function computePose(model: View3DModel, tau: number, sweep: number, rigid?: Rigid): Pose {
  const { n, ud, zd, ua, zr, nr, br, pos, anchor } = model;
  const t = new Float64Array(n);
  for (let k = 0; k < n; k++) t[k] = localProgress(tau, pos[k], sweep);
  const u = new Float64Array(n);
  const z = new Float64Array(n);
  const nn = new Float64Array(n);
  const bb = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    z[k] = zd[k] + t[k] * (zr[k] - zd[k]);
    nn[k] = t[k] * nr[k];
    bb[k] = t[k] * br[k];
  }
  const w = new Float64Array(n * 4);
  let curtain: Curtain;

  if (model.scene.mode === 'polyline') {
    // Nodes are the samples themselves. Step length eases from the 2-D gap to
    // the real chord; step direction is the real direction scaled by t.
    const U = new Float64Array(n);
    const X = new Float64Array(n);
    const Y = new Float64Array(n);
    const H = new Float64Array(n);
    const psi = new Float64Array(Math.max(0, n - 1));
    const lam = new Float64Array(Math.max(0, n - 1));
    const th = model.stepTheta;
    for (let k = 0; k < n - 1; k++) {
      const ts = 0.5 * (t[k] + t[k + 1]);
      const d = ud[k + 1] - ud[k];
      const r = ua[k + 1] - ua[k];
      lam[k] = Math.max(0, d + ts * (r - d));
    }
    // Step headings: the anchor step stays horizontal; every joint turns by
    // its real turn scaled by the progress at that joint.
    const a = Math.min(anchor, n - 2);
    if (a >= 0) {
      psi[a] = 0;
      for (let k = a + 1; k < n - 1; k++) psi[k] = psi[k - 1] + t[k] * (th[k] - th[k - 1]);
      for (let k = a - 1; k >= 0; k--) psi[k] = psi[k + 1] - t[k + 1] * (th[k + 1] - th[k]);
    }
    if (n > 0) U[anchor] = ud[anchor] + t[anchor] * (ua[anchor] - ud[anchor]);
    for (let k = anchor; k < n - 1; k++) {
      U[k + 1] = U[k] + lam[k];
      X[k + 1] = X[k] + lam[k] * Math.cos(psi[k]);
      Y[k + 1] = Y[k] + lam[k] * Math.sin(psi[k]);
    }
    for (let k = anchor - 1; k >= 0; k--) {
      U[k] = U[k + 1] - lam[k];
      X[k] = X[k + 1] - lam[k] * Math.cos(psi[k]);
      Y[k] = Y[k + 1] - lam[k] * Math.sin(psi[k]);
    }
    for (let k = 0; k < n; k++) {
      if (n === 1) H[k] = 0;
      else if (k === 0) H[k] = psi[0];
      else if (k === n - 1) H[k] = psi[n - 2];
      else H[k] = 0.5 * (psi[k - 1] + psi[k]);
    }
    if (rigid) applyRigid(X, Y, H, rigid);
    curtain = new Curtain(U, X, Y, H);
    for (let k = 0; k < n; k++) {
      u[k] = U[k];
      w[k * 4] = X[k];
      w[k * 4 + 1] = Y[k];
      w[k * 4 + 2] = z[k];
      w[k * 4 + 3] = H[k];
    }
  } else {
    // Cylinder: samples slide along a uniform curtain whose curvature grows
    // from 0 (flat) to 1/R (the barrel).
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < n; k++) {
      u[k] = ud[k] + t[k] * (ua[k] - ud[k]);
      if (u[k] < lo) lo = u[k];
      if (u[k] > hi) hi = u[k];
    }
    if (n === 0) {
      lo = 0;
      hi = 0;
    }
    const ua0 = n > 0 ? u[anchor] : 0;
    const kBack = Math.ceil((ua0 - (lo - GRID_MARGIN)) / GRID);
    const kFwd = Math.ceil((hi + GRID_MARGIN - ua0) / GRID);
    const m = kBack + kFwd + 1;
    const U = new Float64Array(m);
    const X = new Float64Array(m);
    const Y = new Float64Array(m);
    const H = new Float64Array(m);
    // Curvature at each point of the curtain follows the progress of the
    // samples sitting there, so a sample that has finished rolling sits on a
    // fully curved curtain even while samples slide from their 2-D spacing to
    // their real one: progress interpolated over the samples sorted by u.
    const order = Array.from({ length: n }, (_, k) => k).sort((a, b) => u[a] - u[b]);
    const su = Float64Array.from(order, (k) => u[k]);
    const st = Float64Array.from(order, (k) => t[k]);
    const progressAt = (uu: number): number => {
      if (n === 0) return tau;
      if (uu <= su[0]) return st[0];
      if (uu >= su[n - 1]) return st[n - 1];
      let a = 0;
      let b = n - 1;
      while (b - a > 1) {
        const mid = (a + b) >> 1;
        if (su[mid] <= uu) a = mid;
        else b = mid;
      }
      const du = su[b] - su[a];
      return du > 1e-12 ? st[a] + ((uu - su[a]) / du) * (st[b] - st[a]) : st[b];
    };
    const kappaAt = (uu: number): number => (progressAt(uu) * model.sign) / model.radius;
    const K = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      U[k] = ua0 + (k - kBack) * GRID;
      K[k] = kappaAt(U[k]);
    }
    for (let k = kBack; k < m - 1; k++) {
      H[k + 1] = H[k] + (GRID * (K[k] + K[k + 1])) / 2;
      const hm = 0.5 * (H[k] + H[k + 1]);
      X[k + 1] = X[k] + GRID * Math.cos(hm);
      Y[k + 1] = Y[k] + GRID * Math.sin(hm);
    }
    for (let k = kBack - 1; k >= 0; k--) {
      H[k] = H[k + 1] - (GRID * (K[k] + K[k + 1])) / 2;
      const hm = 0.5 * (H[k] + H[k + 1]);
      X[k] = X[k + 1] - GRID * Math.cos(hm);
      Y[k] = Y[k + 1] - GRID * Math.sin(hm);
    }
    if (rigid) applyRigid(X, Y, H, rigid);
    curtain = new Curtain(U, X, Y, H);
    for (let k = 0; k < n; k++) curtain.place(u[k], z[k], nn[k], bb[k], w, k * 4);
  }

  return { u, z, n: nn, b: bb, w, curtain, t };
}
