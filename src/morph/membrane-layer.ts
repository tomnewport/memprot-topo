import { Camera } from './camera.js';
import { mixRgb, type RGB, smooth } from './colour.js';
import type { OpSpec } from './engine.js';
import type { Leaf, SurfaceMesh } from './net.js';

export const RIM: OpSpec = { layer: 0, key: 'rim', kind: 'stroke', linecap: 'round' };
export const NET: OpSpec = { layer: 0, key: 'net', kind: 'stroke', linecap: 'round' };
/** Fishnet line width (px), opacity per leaflet, and how far its colour leans from the membrane edge towards the midplane's. */
export const NET_WIDTH = 0.75;
export const NET_ALPHA = { upper: 0.9, lower: 0.6 };
export const NET_DARKEN = 0.5;
/** Smallest and largest radii (Å) the fishnet's local heights are averaged over. */
export const NET_SMOOTHING = 6;
export const NET_SMOOTHING_MAX = 12;
/** Finest membrane grid spacing (Å) a page can ask for; finer would slow every frame. */
export const MIN_GRID_SPACING = 2;
/** Largest RMS misfit (Å) between the scene's sample positions and the finished pose for local heights to be used. */
export const NET_FIT_RMS = 1.5;

/** Opacity of the upper and lower leaflet sheets. */
export const SHEET_ALPHA: [number, number] = [0.22, 0.1];
/** The surface style: opacity of each leaflet … */
export const SURFACE_ALPHA = { upper: 0.4, lower: 0.3 };
/** … colour bands (odd, the middle one at the bulk height) … */
export const SURFACE_BANDS = 13;
/** … and the thickening or thinning (Å) at which the colour is strongest. */
export const SURFACE_RANGE = 6;

/** Horizontal step (Å) of the march for where a line of sight meets the surface. */
export const VEIL_STEP = 1;

/** Fade-in (0–1) of the leaflet sheets and the membrane drawn with them, at progress τ. */
export function sheetsIn(tau: number): number {
  return smooth(0.35, 0.95, tau);
}

/** Whether the camera looks down on the membrane (the lower leaflet is the far one). */
export function seenFromAbove(cam: Camera): boolean {
  return (Number.isFinite(cam.dist) ? cam.eye[2] : cam.p.el) > 0;
}

/** Colour band of a change (Å, positive thicker) in the bilayer's thickness from the bulk. */
export function surfaceBand(dz: number): number {
  const half = (SURFACE_BANDS - 1) / 2;
  return Math.max(0, Math.min(SURFACE_BANDS - 1, Math.round((dz / SURFACE_RANGE) * half) + half));
}

/** Thickness change between each colour band and the next. */
export const SURFACE_EDGES = Array.from(
  { length: SURFACE_BANDS - 1 },
  (_, i) => ((i + 0.5 - (SURFACE_BANDS - 1) / 2) * SURFACE_RANGE) / ((SURFACE_BANDS - 1) / 2),
);

/** The other leaflet. */
export function other(leaf: Leaf): Leaf {
  return leaf === 'upper' ? 'lower' : 'upper';
}

/**
 * Change (Å) in the bilayer's thickness from the bulk where a leaflet is at
 * height `z` and the other at `facing`: NaN where the leaflet is open, and
 * twice its own shift from the bulk where only the other is (as if the
 * bilayer were symmetric there).
 */
export function thicknessChange(
  leaf: Leaf,
  z: number,
  facing: number,
  bulk: Record<Leaf, number>,
): number {
  const out = leaf === 'upper' ? z - bulk.upper : bulk.lower - z;
  if (Number.isNaN(facing)) return 2 * out;
  const [up, low] = leaf === 'upper' ? [z, facing] : [facing, z];
  return up - low - (bulk.upper - bulk.lower);
}

/**
 * The part of a convex polygon (flat x, y, h triples, h varying linearly
 * across it) where h is above `level` (`side` 1) or below it (`side` -1).
 */
export function clipHeight(poly: number[], level: number, side: 1 | -1): number[] {
  const out: number[] = [];
  const m = poly.length / 3;
  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const a = side * (poly[i * 3 + 2] - level);
    const b = side * (poly[j * 3 + 2] - level);
    if (a >= 0) out.push(poly[i * 3], poly[i * 3 + 1], poly[i * 3 + 2]);
    if (a >= 0 !== b >= 0) {
      const t = a / (a - b);
      for (let c = 0; c < 3; c++)
        out.push(poly[i * 3 + c] + t * (poly[j * 3 + c] - poly[i * 3 + c]));
    }
  }
  return out;
}

/** The surface style's heights and colours, shared by the sheets and the veil. */
export interface SurfaceShading {
  /** Final height of a leaflet about the final disc centre (NaN in a pore). */
  heightAt: (leaf: Leaf, ox: number, oy: number) => number;
  /** The leaflets' mesh, about the final disc centre. */
  mesh: SurfaceMesh;
  /** Lowest and highest final height of each leaflet. */
  range: Record<Leaf, [number, number]>;
  /** Change (Å) in the bilayer's thickness from the bulk at each mesh vertex, as each leaflet shows it. */
  change: Record<Leaf, Float64Array>;
  /** The same at a point about the final disc centre (NaN where the leaflet is open). */
  changeAt: (leaf: Leaf, ox: number, oy: number) => number;
  /** Scale from the final disc to the current one. */
  k: number;
  /** Colour of each band. */
  colours: RGB[];
}

/**
 * The two leaflet surfaces as translucent sheets. Painting a sheet over the
 * protein would need every piece split by the planes in drawing order, and a
 * piece straddling a plane can only go on one side of it. Instead the sheet
 * fills are drawn behind the protein, and any piece seen through a sheet takes
 * the sheet's tint in its own colour; pieces are cut exactly where that
 * changes, so the boundary is where the line of sight meets the sheet's edge
 * or the piece passes through the plane. In the surface style the sheets
 * follow the leaflets' heights and the tint is the colour where the line of
 * sight crosses them. Exported for tests.
 */
export class Veil {
  private readonly alpha: [number, number];
  /** Whether the eye is above the membrane, so the lower leaflet is the far one. */
  private readonly fromAbove: boolean;

  constructor(
    private readonly cam: Camera,
    private readonly cx: number,
    private readonly cy: number,
    private readonly r: number,
    private readonly upper: number,
    private readonly lower: number,
    /** Sheet fade-in (0 = no sheets). */
    readonly on: number,
    private readonly fill: RGB,
    private readonly surface: SurfaceShading | null = null,
  ) {
    this.fromAbove = seenFromAbove(cam);
    this.alpha = surface
      ? [SURFACE_ALPHA.upper * on, SURFACE_ALPHA.lower * on]
      : [SHEET_ALPHA[0] * on, SHEET_ALPHA[1] * on];
  }

  /**
   * Sheets between world point (x, y, z) and the eye: bit 1 upper, bit 2
   * lower; in the surface style, the colour band crossed in each leaflet
   * (1 + band for the upper, times SURFACE_BANDS + 1 for the lower).
   */
  level(x: number, y: number, z: number): number {
    if (this.on <= 0) return 0;
    const cam = this.cam;
    // Ray towards the eye: P + s·d, reaching the eye at s = 1 (perspective).
    let dx: number;
    let dy: number;
    let dz: number;
    let reach = Infinity;
    if (Number.isFinite(cam.dist)) {
      dx = cam.eye[0] - x;
      dy = cam.eye[1] - y;
      dz = cam.eye[2] - z;
      reach = 1;
    } else {
      dx = -cam.v[0];
      dy = -cam.v[1];
      dz = -cam.v[2];
    }
    if (Math.abs(dz) < 1e-12) return 0;
    let lv = 0;
    for (let k = 0; k < 2; k++) {
      const plane = k === 0 ? this.upper : this.lower;
      if (this.surface) {
        const band = this.bandCrossed(
          k === 0 ? 'upper' : 'lower',
          plane,
          x,
          y,
          z,
          dx,
          dy,
          dz,
          reach,
        );
        if (band >= 0) lv += (1 + band) * (k === 0 ? 1 : SURFACE_BANDS + 1);
        continue;
      }
      const s = (plane - z) / dz;
      if (s > 0 && s < reach && this.inDisc(x + s * dx, y + s * dy)) lv += 1 << k;
    }
    return lv;
  }

  /**
   * The colour band where the ray P + s·d (0 < s < reach) first meets a
   * leaflet's surface (grown out of its bulk plane with the sheets), or -1 if
   * it doesn't, or meets it over a pore or outside the disc. The ray is
   * marched through the leaflet's height range about every
   * {@link VEIL_STEP} Å of horizontal travel and the crossing bisected.
   */
  private bandCrossed(
    leaf: Leaf,
    plane: number,
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
    reach: number,
  ): number {
    const sf = this.surface!;
    const on = this.on;
    const [lo, hi] = sf.range[leaf];
    // Where the ray is within the grown height range, just widened so that a
    // flat leaflet still brackets its crossing.
    let s0 = (plane + on * (lo - plane) - 0.01 - z) / dz;
    let s1 = (plane + on * (hi - plane) + 0.01 - z) / dz;
    if (s0 > s1) [s0, s1] = [s1, s0];
    s0 = Math.max(s0, 0);
    s1 = Math.min(s1, reach);
    if (!(s0 < s1)) return -1;
    const height = (t: number) =>
      sf.heightAt(leaf, (x + t * dx - this.cx) / sf.k, (y + t * dy - this.cy) / sf.k);
    // Height of the ray above the grown surface (NaN over a pore).
    const above = (t: number, h: number) => z + t * dz - plane - on * (h - plane);
    const travel = (Math.hypot(dx, dy) * (s1 - s0)) / sf.k;
    const n = Math.min(64, Math.max(1, Math.ceil(travel / VEIL_STEP)));
    let sa = s0;
    let fa = above(s0, height(s0));
    for (let i = 1; i <= n; i++) {
      const sb = s0 + ((s1 - s0) * i) / n;
      const fb = above(sb, height(sb));
      if (fa <= 0 !== fb <= 0 && !Number.isNaN(fa + fb)) {
        let l = sa;
        let r = sb;
        for (let it = 0; it < 10; it++) {
          const m = (l + r) / 2;
          const fm = above(m, height(m));
          if (Number.isNaN(fm)) return -1;
          if (fm <= 0 === fa <= 0) l = m;
          else r = m;
        }
        const t = (l + r) / 2;
        const [ox, oy] = [(x + t * dx - this.cx) / sf.k, (y + t * dy - this.cy) / sf.k];
        const c = sf.changeAt(leaf, ox, oy);
        if (Number.isNaN(c) || !this.inDisc(x + t * dx, y + t * dy)) return -1;
        return surfaceBand(c);
      }
      sa = sb;
      fa = fb;
    }
    return -1;
  }

  private inDisc(wx: number, wy: number): boolean {
    const qx = wx - this.cx;
    const qy = wy - this.cy;
    return qx * qx + qy * qy <= this.r * this.r;
  }

  /** Colour `c` as seen through sheets `lv`. */
  apply(c: RGB, lv: number): RGB {
    if (lv === 0) return c;
    const surface = this.surface;
    if (surface) {
      // Tint by the leaflet further from the eye first.
      const up = lv % (SURFACE_BANDS + 1);
      const low = Math.floor(lv / (SURFACE_BANDS + 1));
      const tint = (out: RGB, band: number, k: 0 | 1) =>
        band ? mixRgb(out, surface.colours[band - 1], this.alpha[k]) : out;
      return this.fromAbove ? tint(tint(c, low, 1), up, 0) : tint(tint(c, up, 0), low, 1);
    }
    let keep = 1;
    if (lv & 1) keep *= 1 - this.alpha[0];
    if (lv & 2) keep *= 1 - this.alpha[1];
    return mixRgb(c, this.fill, 1 - keep);
  }
}

/**
 * Parameter in (a, b) where `level` changes from `la` (its value at a), by
 * bisection; assumes a single change in the interval.
 */
export function veilBoundary(
  level: (t: number) => number,
  a: number,
  b: number,
  la: number,
): number {
  let lo = a;
  let hi = b;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (level(mid) === la) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export const veiledSpecs = new WeakMap<OpSpec, OpSpec[]>();

/** `spec` for pieces seen through sheets `lv`: its own op, so its own colour. */
export function veiled(spec: OpSpec, lv: number): OpSpec {
  if (lv === 0) return spec;
  let list = veiledSpecs.get(spec);
  if (!list) {
    list = [];
    veiledSpecs.set(spec, list);
  }
  return (list[lv] ??= { ...spec, key: `${spec.key}~${lv}` });
}
