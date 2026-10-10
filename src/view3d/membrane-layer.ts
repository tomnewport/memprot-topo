/**
 * The membrane in the 3-D view: the rim and midplane behind the protein, the
 * leaflet sheets (and the surface style's colour bands), the fishnet lines,
 * and the veil that tints the protein where a leaflet is in front of it.
 */

import { Camera } from './camera.js';
import { mixRgb, type RGB, smooth } from './colour.js';
import type { OpSpec } from './engine.js';
import type { Leaf, SurfaceMesh } from './net.js';
import { fogged, hexRgb, rgbStr, sampleProfile } from './colour.js';
import type { Pose } from './curtain.js';
import { Pooled } from './engine.js';
import type { View3DModel } from './model.js';
import {
  buildFishnet,
  BULK_MARGIN,
  type Fishnet,
  fishnetSpacing,
  fitRigid2d,
  type HeightAt,
} from './net.js';
import type { View3DOptions } from './options.js';
import type { ContextChain, FrameCtx } from './prims/frame.js';

/** The renderer's pooled paths behind the protein: rim, midplane and leaflets. */
export interface BackLayer {
  rim: Pooled<SVGPathElement>;
  mid: Pooled<SVGPathElement>;
  /** Leaflet surfaces, far one first. */
  discs: [Pooled<SVGPathElement>, Pooled<SVGPathElement>];
  /** The surface style's leaflets, far one first: one path per colour band. */
  surface: [Pooled<SVGPathElement>[], Pooled<SVGPathElement>[]];
}

/** What the membrane layer reads from the renderer. */
export interface MembraneEnv {
  readonly model: View3DModel;
  readonly options: View3DOptions;
  /** The background: fog mixes towards it. */
  readonly ground: RGB;
  /** Scratch buffer for projected points. */
  readonly tmp: Float64Array;
  readonly back: BackLayer;
  /** The structure's other chains, which the membrane is fitted around too. */
  readonly context: readonly ContextChain[];
  /** The membrane as drawn this frame (blended while a blend runs). */
  readonly drawnNet: Fishnet | null;
}

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

/**
 * Far half of the membrane's rim, with the midplane on it. `keepProfile`
 * (1 at t = 0) is how much of the 2-D membrane's local rises and drops the
 * rim still shows; at 0 it is the flat bulk band.
 */
export function drawBackRim(
  env: MembraneEnv,
  cam: Camera,
  cxw: number,
  cyw: number,
  r: number,
  upper: number,
  lower: number,
  sigma: number,
  keepProfile: number,
): void {
  const st = env.model.scene.style;
  const slab = env.model.scene.slab;
  const profile = keepProfile > 1e-3 ? slab.profile : undefined;
  // Angle (about the disc centre) of the eye, and the half-angle to the
  // silhouette tangents; the far arc lies between them, round the back.
  let ex: number;
  let ey: number;
  let beta = Math.PI / 2;
  if (Number.isFinite(cam.dist)) {
    ex = cam.eye[0] - cxw;
    ey = cam.eye[1] - cyw;
    const d = Math.hypot(ex, ey);
    if (d > r) beta = Math.acos(r / d);
  } else {
    ex = -cam.v[0];
    ey = -cam.v[1];
  }
  if (Math.hypot(ex, ey) < 1e-9) {
    ex = 0;
    ey = -1;
  }
  const dirE = Math.atan2(ey, ex);
  const a0 = dirE + beta;
  const a1 = dirE + 2 * Math.PI - beta;
  // While the 2-D profile shows, sample the arc as densely as the profile
  // and evenly in x at t = 0 (when the arc is seen edge-on), so the first
  // frame matches the 2-D path.
  const N = profile ? Math.max(48, Math.min(profile.x.length, 1200)) : 48;
  const top: number[] = [];
  const bot: number[] = [];
  const midPts: number[] = [];
  for (let i = 0; i <= N; i++) {
    const a = profile
      ? a0 + ((a1 - a0) * Math.acos(1 - (2 * i) / N)) / Math.PI
      : a0 + ((a1 - a0) * i) / N;
    const c = Math.cos(a);
    const x = cxw + r * c;
    const y = cyw + r * Math.sin(a);
    let zTop = upper;
    let zBot = lower;
    if (profile) {
      // Edge-on, the arc spans the 2-D membrane from x0 to x1.
      const xd = slab.x0 + ((c + 1) / 2) * (slab.x1 - slab.x0);
      zTop += keepProfile * (sampleProfile(profile.x, profile.upper, xd) - upper);
      zBot += keepProfile * (sampleProfile(profile.x, profile.lower, xd) - lower);
    }
    cam.project(x, y, zTop, env.tmp);
    top.push(env.tmp[0], env.tmp[1]);
    cam.project(x, y, zBot, env.tmp);
    bot.push(env.tmp[0], env.tmp[1]);
    // Midplane runs the other way round, so at t = 0 its dashes start at
    // the left end like the 2-D line.
    const am = a1 - ((a1 - a0) * i) / N;
    cam.project(cxw + r * Math.cos(am), cyw + r * Math.sin(am), 0, env.tmp);
    midPts.push(env.tmp[0], env.tmp[1]);
  }
  let d = `M${top[0].toFixed(2)},${top[1].toFixed(2)}`;
  for (let i = 2; i < top.length; i += 2) d += `L${top[i].toFixed(2)},${top[i + 1].toFixed(2)}`;
  for (let i = bot.length - 2; i >= 0; i -= 2)
    d += `L${bot[i].toFixed(2)},${bot[i + 1].toFixed(2)}`;
  d += 'Z';
  const rim = env.back.rim;
  rim.set('d', d);
  rim.set('fill', st.membraneFill);
  rim.set('fill-opacity', (0.55 - 0.15 * sigma).toFixed(3));
  rim.set('stroke', st.membraneEdge);
  rim.set('stroke-width', '1');
  rim.set('stroke-linejoin', 'round');
  let md = `M${midPts[0].toFixed(2)},${midPts[1].toFixed(2)}`;
  for (let i = 2; i < midPts.length; i += 2)
    md += `L${midPts[i].toFixed(2)},${midPts[i + 1].toFixed(2)}`;
  const mid = env.back.mid;
  mid.set('d', md);
  mid.set('fill', 'none');
  mid.set('stroke', st.midplane);
  mid.set('stroke-width', '1');
  mid.set('stroke-dasharray', '4 4');
}

/**
 * Fills of the two leaflet sheets, far one first, behind the protein. The
 * upper sheet reads as translucent; the lower one is kept faint so the
 * cytoplasmic side stays legible. In the surface style each leaflet is its
 * mesh instead, at its own heights and coloured by them.
 */
export function drawDiscs(
  env: MembraneEnv,
  cam: Camera,
  cxw: number,
  cyw: number,
  r: number,
  upper: number,
  lower: number,
  eDisc: number,
  surface: SurfaceShading | null,
): void {
  const st = env.model.scene.style;
  const [far, near] = env.back.discs;
  const hideBands = () => {
    for (const bands of env.back.surface) for (const b of bands) b.set('display', 'none');
  };
  if (eDisc <= 0 || surface) {
    far.set('display', 'none');
    near.set('display', 'none');
  }
  if (eDisc <= 0 || !surface) hideBands();
  if (eDisc <= 0) return;
  // Seen from above, the lower leaflet is the far one.
  const fromAbove = seenFromAbove(cam);
  if (surface) {
    for (const leaf of ['upper', 'lower'] as const) {
      const bands = env.back.surface[(leaf === 'upper') === fromAbove ? 1 : 0];
      const d = surfacePaths(
        env,
        cam,
        cxw,
        cyw,
        leaf,
        leaf === 'upper' ? upper : lower,
        eDisc,
        surface,
      );
      d.forEach((path, i) => {
        const band = bands[i];
        if (!path) {
          band.set('display', 'none');
          return;
        }
        band.set('display', null);
        band.set('d', path);
        band.set('fill', rgbStr(surface.colours[i]));
        band.set('fill-opacity', (SURFACE_ALPHA[leaf] * eDisc).toFixed(3));
      });
    }
    return;
  }
  for (const which of ['top', 'bottom'] as const) {
    const zp = which === 'top' ? upper : lower;
    let d = '';
    for (let a = 0; a < 64; a++) {
      const th = (a / 64) * 2 * Math.PI;
      cam.project(cxw + r * Math.cos(th), cyw + r * Math.sin(th), zp, env.tmp);
      d += (a === 0 ? 'M' : 'L') + env.tmp[0].toFixed(2) + ',' + env.tmp[1].toFixed(2);
    }
    const path = (which === 'top') === fromAbove ? near : far;
    path.set('display', null);
    path.set('d', d + 'Z');
    path.set('fill', st.membraneFill);
    path.set('fill-opacity', (SHEET_ALPHA[which === 'top' ? 0 : 1] * eDisc).toFixed(3));
  }
}

/**
 * One leaflet's mesh as a path per colour band, growing out of the bulk
 * plane with `grow`. Each quad is split into two triangles and each
 * triangle cut where the thickness change crosses a band edge (it varies
 * linearly across it), so the bands meet along smooth contours. Every piece is wound
 * the same way on screen, so pieces that meet or overlap within a band fill
 * once, with no seams.
 */
export function surfacePaths(
  env: MembraneEnv,
  cam: Camera,
  cxw: number,
  cyw: number,
  leaf: Leaf,
  bulk: number,
  grow: number,
  surface: SurfaceShading,
): string[] {
  const { k, mesh } = surface;
  const zs = mesh[leaf];
  const dt = surface.change[leaf];
  const nv = zs.length;
  const p = new Float64Array(nv * 2);
  for (let v = 0; v < nv; v++) {
    if (Number.isNaN(zs[v])) continue;
    cam.project(
      cxw + k * mesh.xy[v * 2],
      cyw + k * mesh.xy[v * 2 + 1],
      bulk + grow * (zs[v] - bulk),
      env.tmp,
    );
    p[v * 2] = env.tmp[0];
    p[v * 2 + 1] = env.tmp[1];
  }
  const out: string[] = new Array<string>(SURFACE_BANDS).fill('');
  const emit = (band: number, poly: number[]) => {
    const m = poly.length / 3;
    if (m < 3) return;
    let area = 0;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      area += poly[i * 3] * poly[j * 3 + 1] - poly[j * 3] * poly[i * 3 + 1];
    }
    let d = '';
    for (let q = 0; q < m; q++) {
      const i = area >= 0 ? q : m - 1 - q;
      d += (q === 0 ? 'M' : 'L') + poly[i * 3].toFixed(1) + ',' + poly[i * 3 + 1].toFixed(1);
    }
    out[band] += d + 'Z';
  };
  // A triangle as flat (screen x, screen y, thickness change) triples.
  const triangle = (poly: number[]) => {
    const lo = surfaceBand(Math.min(poly[2], poly[5], poly[8]));
    const hi = surfaceBand(Math.max(poly[2], poly[5], poly[8]));
    for (let band = lo; band <= hi; band++) {
      let piece = poly;
      if (band > lo) piece = clipHeight(piece, SURFACE_EDGES[band - 1], 1);
      if (band < hi) piece = clipHeight(piece, SURFACE_EDGES[band], -1);
      emit(band, piece);
    }
  };
  const vertex = (v: number) => [p[v * 2], p[v * 2 + 1], dt[v]];
  // A point of a quad at final (ox, oy), height h and thickness change c, as a triple.
  const point = (ox: number, oy: number, h: number, c: number) => {
    cam.project(cxw + k * ox, cyw + k * oy, bulk + grow * (h - bulk), env.tmp);
    return [env.tmp[0], env.tmp[1], c];
  };
  const q = mesh.quads;
  const xy = mesh.xy;
  for (let i = 0; i < q.length; i += 4) {
    const corners = [q[i], q[i + 1], q[i + 2], q[i + 3]];
    const open = corners.map((v) => Number.isNaN(zs[v]));
    if (!open.includes(true)) {
      const [a, b, c, e] = corners.map(vertex);
      triangle([...a, ...b, ...c]);
      triangle([...a, ...c, ...e]);
      continue;
    }
    // Next to a pore, the quarter of the quad nearest each lipid corner,
    // with heights as the sampler gives them (open corners left out of the
    // bilinear mean), so the hole matches where the tint stops.
    const finite = corners.filter((_, j) => !open[j]);
    if (!finite.length) continue;
    const mx = corners.reduce((sum, v) => sum + xy[v * 2], 0) / 4;
    const my = corners.reduce((sum, v) => sum + xy[v * 2 + 1], 0) / 4;
    const mean = (a: Float64Array) => finite.reduce((sum, v) => sum + a[v], 0) / finite.length;
    const centre = point(mx, my, mean(zs), mean(dt));
    const half = (v: number, w: number) => {
      const pore = Number.isNaN(zs[w]);
      return point(
        (xy[v * 2] + xy[w * 2]) / 2,
        (xy[v * 2 + 1] + xy[w * 2 + 1]) / 2,
        pore ? zs[v] : (zs[v] + zs[w]) / 2,
        pore ? dt[v] : (dt[v] + dt[w]) / 2,
      );
    };
    corners.forEach((v, j) => {
      if (open[j]) return;
      const c = vertex(v);
      const toNext = half(v, corners[(j + 1) % 4]);
      const toPrev = half(v, corners[(j + 3) % 4]);
      triangle([...c, ...toNext, ...centre]);
      triangle([...c, ...centre, ...toPrev]);
    });
  }
  return out;
}

/** The surface style's colours and heights, for the sheets and the veil. */
export function surfaceShading(
  env: MembraneEnv,
  heightAt: Fishnet['heightAt'],
  mesh: SurfaceMesh,
  k: number,
  upper: number,
  lower: number,
): SurfaceShading {
  const st = env.model.scene.style;
  const fill = hexRgb(st.membraneFill);
  const thinned = hexRgb(st.membraneThinned);
  const thickened = hexRgb(st.membraneThickened);
  const half = (SURFACE_BANDS - 1) / 2;
  const colours = Array.from({ length: SURFACE_BANDS }, (_, i) => {
    const t = (i - half) / half;
    return t >= 0 ? mixRgb(fill, thickened, t) : mixRgb(fill, thinned, -t);
  });
  const bulk = { upper, lower };
  const changeAt = (leaf: Leaf, ox: number, oy: number) =>
    thicknessChange(leaf, heightAt(leaf, ox, oy), heightAt(other(leaf), ox, oy), bulk);
  const change = (leaf: Leaf) =>
    mesh[leaf].map((z, v) => thicknessChange(leaf, z, mesh[other(leaf)][v], bulk));
  const range = (zs: Float64Array): [number, number] => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const z of zs) {
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
    return lo <= hi ? [lo, hi] : [0, 0];
  };
  return {
    heightAt,
    mesh,
    range: { upper: range(mesh.upper), lower: range(mesh.lower) },
    change: { upper: change('upper'), lower: change('lower') },
    changeAt,
    k,
    colours,
  };
}

/** Rims of the leaflet sheets, depth-sorted with the protein. */
export function rimPrims(
  env: MembraneEnv,
  ctx: FrameCtx,
  cxw: number,
  cyw: number,
  r: number,
  upper: number,
  lower: number,
  alpha: number,
): void {
  const { cam, prims } = ctx;
  const edge = hexRgb(env.model.scene.style.membraneEdge);
  const N = 64;
  for (const [k, zp] of [
    [0, upper],
    [1, lower],
  ]) {
    const ring = new Float64Array((N + 1) * 3);
    for (let a = 0; a <= N; a++) {
      const th = (a / N) * 2 * Math.PI;
      cam.project(cxw + r * Math.cos(th), cyw + r * Math.sin(th), zp, env.tmp);
      ring[a * 3] = env.tmp[0];
      ring[a * 3 + 1] = env.tmp[1];
      ring[a * 3 + 2] = env.tmp[2];
    }
    for (let a = 0; a < N; a++) {
      const pts = [ring[a * 3], ring[a * 3 + 1], ring[a * 3 + 3], ring[a * 3 + 4]];
      prims.push({
        id: -11 - k,
        order: -1,
        sub: a,
        depth: (ring[a * 3 + 2] + ring[a * 3 + 5]) / 2,
        x0: Math.min(pts[0], pts[2]) - 1,
        y0: Math.min(pts[1], pts[3]) - 1,
        x1: Math.max(pts[0], pts[2]) + 1,
        y1: Math.max(pts[1], pts[3]) + 1,
        faded: false,
        pts,
        pad: 0.5,
        emit: (run) => run.stroke(RIM, pts, edge, 1, alpha),
      });
    }
  }
}

/**
 * The leaflets' fishnets for the finished view (see net.ts). Local heights
 * are looked up in the frame of the scene's sample positions, which the
 * finished pose holds up to a turn about z and a shift; that motion is
 * fitted from the helix and strand samples.
 */
export function buildNet(
  env: MembraneEnv,
  pose: Pose,
  dcx: number,
  dcy: number,
  dr: number,
): Fishnet {
  const { model } = env;
  const slab = model.scene.slab;
  const segOf: number[] = [];
  const sampleOf: number[] = [];
  model.scene.segments.forEach((seg, s) => {
    for (let i = 0; i < seg.display.length; i++) {
      segOf.push(s);
      sampleOf.push(i);
    }
  });
  const protein: number[] = [];
  const real: number[] = [];
  const world: number[] = [];
  for (const el of model.elements) {
    for (let k = el.g0; k <= el.g1; k++) {
      const x = pose.w[k * 4];
      const y = pose.w[k * 4 + 1];
      const z = pose.w[k * 4 + 2];
      if (z <= slab.upper + 2 && z >= slab.lower - 2) protein.push(x, y);
      const p = model.scene.segments[segOf[k]]?.positions[sampleOf[k]];
      if (!p) continue;
      real.push(p.x, p.y);
      world.push(x, y);
    }
  }
  const spacing =
    env.options.gridSpacing > 0
      ? Math.min(dr, Math.max(MIN_GRID_SPACING, env.options.gridSpacing))
      : fishnetSpacing(dr);
  let local: { upper: HeightAt; lower: HeightAt; radius: number } | undefined;
  const surface = slab.surface;
  const fit = surface ? fitRigid2d(real, world) : null;
  // A misfit means the sample positions aren't the structure's own frame.
  if (surface && fit && fit.rms < NET_FIT_RMS) {
    // Averaged over about a grid cell, so single-frame noise doesn't
    // show as spikes, but not so wide that the shape is lost.
    local = {
      upper: (x, y, radius) => surface.upper(...fit.invert(x, y), radius),
      lower: (x, y, radius) => surface.lower(...fit.invert(x, y), radius),
      radius: Math.min(NET_SMOOTHING_MAX, Math.max(NET_SMOOTHING, 1.5 * spacing)),
    };
  }
  // The context chains hold the membrane back too.
  for (const c of env.context) {
    if (!c.pose) continue;
    for (const el of c.model.elements) {
      for (let k = el.g0; k <= el.g1; k++) {
        const z = c.pose.w[k * 4 + 2];
        if (z <= slab.upper + 2 && z >= slab.lower - 2)
          protein.push(c.pose.w[k * 4], c.pose.w[k * 4 + 1]);
      }
    }
  }
  return buildFishnet({
    centre: { x: dcx, y: dcy },
    radius: dr,
    bulk: { upper: slab.upper, lower: slab.lower },
    annular: slab.annular ?? { upper: slab.upper, lower: slab.lower },
    protein,
    local,
    spacing,
    margin: BULK_MARGIN,
    style: env.options.membraneStyle,
  });
}

/**
 * The leaflets' fishnets, depth-sorted with the protein. They grow out of
 * the bulk planes as the sheets fade in (`alpha`); `k` scales the final
 * disc onto the current one.
 */
export function netPrims(
  env: MembraneEnv,
  ctx: FrameCtx,
  cxw: number,
  cyw: number,
  k: number,
  upper: number,
  lower: number,
  alpha: number,
): void {
  const net = env.drawnNet;
  if (!net) return;
  const { cam, prims, fogAt } = ctx;
  const st = env.model.scene.style;
  const edge = mixRgb(hexRgb(st.membraneEdge), hexRgb(st.midplane), NET_DARKEN);
  const ground = env.ground;
  let sub = 0;
  for (const [leaf, bulk, id] of [
    ['upper', upper, -13],
    ['lower', lower, -14],
  ] as const) {
    const opacity = NET_ALPHA[leaf] * alpha;
    for (const line of net[leaf]) {
      const m = line.length / 3;
      const p = new Float64Array(m * 3);
      for (let i = 0; i < m; i++) {
        const z = bulk + alpha * (line[i * 3 + 2] - bulk);
        cam.project(cxw + k * line[i * 3], cyw + k * line[i * 3 + 1], z, env.tmp);
        p[i * 3] = env.tmp[0];
        p[i * 3 + 1] = env.tmp[1];
        p[i * 3 + 2] = env.tmp[2];
      }
      for (let i = 0; i < m - 1; i++) {
        // Open over pores.
        if (Number.isNaN(line[i * 3 + 2] + line[i * 3 + 5])) continue;
        const pts = [p[i * 3], p[i * 3 + 1], p[i * 3 + 3], p[i * 3 + 4]];
        const depth = (p[i * 3 + 2] + p[i * 3 + 5]) / 2;
        const c = fogged(edge, fogAt(depth), ground);
        prims.push({
          id,
          order: -1,
          sub: sub++,
          depth,
          x0: Math.min(pts[0], pts[2]) - 1,
          y0: Math.min(pts[1], pts[3]) - 1,
          x1: Math.max(pts[0], pts[2]) + 1,
          y1: Math.max(pts[1], pts[3]) + 1,
          faded: false,
          pts,
          pad: 0.5,
          emit: (run) => run.stroke(NET, pts, c, NET_WIDTH, opacity),
        });
      }
    }
  }
}
