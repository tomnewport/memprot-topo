/**
 * The membrane's leaflets in the 3-D view. Each leaflet's height over a disc
 * around the protein is one field: the local surface from a distortions file
 * (with gaps filled in) or the annular height easing to the bulk, eased to
 * the bulk before the rim. It is drawn as a fishnet of lines (a square grid,
 * or polar rings and spokes around the protein) or as a solid surface, so the
 * membrane and its local rises and drops stay visible without hiding the
 * protein. Built once for the finished (τ = 1) view; the renderer projects it
 * each frame.
 */

import { levelLines, resample } from './contour.js';
import { DEFAULT_MEMBRANE_STYLE, type MembraneStyle } from './membrane-style.js';

/**
 * Leaflet height (Å) at a world point, averaged over `radius` Å, or null
 * where there is no lipid that close.
 */
export type HeightAt = (x: number, y: number, radius: number) => number | null;

export type Leaf = 'upper' | 'lower';

export { DEFAULT_MEMBRANE_STYLE, MEMBRANE_STYLES, type MembraneStyle } from './membrane-style.js';

export interface FishnetInput {
  /** Disc centre (world Å) and radius. */
  centre: { x: number; y: number };
  radius: number;
  bulk: { upper: number; lower: number };
  /** Leaflets next to the protein; used where there are no local heights. */
  annular: { upper: number; lower: number };
  /** World xy of the membrane-spanning samples, flat (x, y) pairs. */
  protein: ArrayLike<number>;
  /**
   * Local leaflet heights, when a distortions file gives them, and the radius
   * (Å) they are averaged over.
   */
  local?: { upper: HeightAt; lower: HeightAt; radius: number };
  /** Line spacing (Å). Default {@link fishnetSpacing} of the radius. */
  spacing?: number;
  /** Width (Å) of the flat bulk ring at the rim. Default 0. */
  margin?: number;
  /** Default {@link DEFAULT_MEMBRANE_STYLE}. */
  style?: MembraneStyle;
}

/** The surface style's mesh over the disc. */
export interface SurfaceMesh {
  /** Vertices (ox, oy) relative to the disc centre. */
  xy: Float64Array;
  /** Each leaflet's height at each vertex; NaN in a pore. */
  upper: Float64Array;
  lower: Float64Array;
  /** Quads as vertex index quadruples, in order round each. */
  quads: Uint32Array;
}

/** Each leaflet as drawn, relative to the disc centre. */
export interface Fishnet {
  /** Line spacing (Å). */
  spacing: number;
  style: MembraneStyle;
  /**
   * Each leaflet's lines as (ox, oy, z) per point; z is NaN where the net is
   * open (a pore). Empty for the surface.
   */
  upper: Float64Array[];
  lower: Float64Array[];
  /** The surface style's mesh, else null. */
  mesh: SurfaceMesh | null;
  /** A leaflet's height at (ox, oy): NaN in a pore, the bulk past the disc. */
  heightAt(leaf: Leaf, ox: number, oy: number): number;
}

/** Grid spacing as a fraction of the disc radius, kept within 4–8 Å. */
const SPACING_PER_RADIUS = 1 / 8;
/** The annular leaflet holds within this distance (Å) of the protein … */
const ANNULAR_REACH = 4;
/** … then eases to the bulk over this distance (Å). */
const ANNULAR_FADE = 10;
/**
 * Fraction of the radius inside the bulk ring beyond which every height eases
 * to the bulk, so the net meets it.
 */
const RIM_FADE = 0.8;
/**
 * Flat bulk (Å) the 3-D disc shows at its edge, beyond where the membrane has
 * relaxed to the bulk.
 */
export const BULK_MARGIN = 5;

/**
 * Radius (Å) of the membrane disc around membrane-spanning samples reaching
 * `extent` Å from its centre: room for the annular leaflet to ease to the
 * bulk, then {@link BULK_MARGIN} of bulk.
 */
export function discRadius(extent: number): number {
  return Math.max(extent, 10) + ANNULAR_REACH + ANNULAR_FADE + BULK_MARGIN;
}
/**
 * A point with no lipid within this distance (Å), or the averaging radius if
 * smaller, is in a pore when the drawn protein surrounds it.
 */
const PORE_RADIUS = 6;
/**
 * A point counts as enclosed by the protein when membrane-spanning samples lie
 * in every one of this many equal sectors around it.
 */
const ENCLOSING_SECTORS = 12;
/** Shortest distance (Å) between points along a shaped line. */
const MIN_STEP = 2;
/** Lattice spacing (Å) of the height field; points between are interpolated. */
const FIELD_STEP = 2;
/** Over-relaxation, tolerance and iteration limit of the gap fill and the polar field. */
const FILL_OMEGA = 1.8;
const FILL_TOLERANCE = 1e-3;
const FILL_MAX_ITERATIONS = 2000;
/** Polar rings: the protein-lipid interface lies this far (Å) out from the samples … */
const INTERFACE_PAD = 4;
/** … rings keep a constant distance from it up to about this far (Å) … */
const ISO_REACH = 10;
/** … and the polar field is solved on a lattice this fine (Å). */
const POLAR_STEP = 1;

/** Node states in a leaflet with local heights. */
const KNOWN = 0;
const GAP = 1;
const PORE = 2;

function smoothstep(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/** Grid spacing (Å) of the fishnet over a disc of radius `r`. */
export function fishnetSpacing(r: number): number {
  return Math.min(8, Math.max(4, r * SPACING_PER_RADIUS));
}

export function buildFishnet(input: FishnetInput): Fishnet {
  const { radius: r } = input;
  const spacing = input.spacing ?? fishnetSpacing(r);
  const style = input.style ?? DEFAULT_MEMBRANE_STYLE;
  const shape = proteinShape(input.protein, input.centre);
  const inner = r - Math.min(r, input.margin ?? 0);
  const field = heightField(input, shape, inner);
  const heightAt = (leaf: Leaf, ox: number, oy: number) => field[leaf](ox, oy);
  const net: Fishnet = { spacing, style, upper: [], lower: [], mesh: null, heightAt };
  if (style === 'surface') {
    const { xy, quads } = surfaceMesh(r, MIN_STEP);
    const z = (leaf: Leaf) => {
      const out = new Float64Array(xy.length / 2);
      for (let v = 0; v < out.length; v++) out[v] = heightAt(leaf, xy[v * 2], xy[v * 2 + 1]);
      return out;
    };
    net.mesh = { xy, quads, upper: z('upper'), lower: z('lower') };
    return net;
  }
  const lines = style === 'polar' ? polarLines(r, inner, spacing, shape) : gridLines(r, spacing);
  for (const leaf of ['upper', 'lower'] as const) {
    for (const pts of lines) {
      const m = pts.length / 2;
      const line = new Float64Array(m * 3);
      for (let p = 0; p < m; p++) {
        line[p * 3] = pts[p * 2];
        line[p * 3 + 1] = pts[p * 2 + 1];
        line[p * 3 + 2] = heightAt(leaf, pts[p * 2], pts[p * 2 + 1]);
      }
      net[leaf].push(line);
    }
  }
  return net;
}

/**
 * Whether two nets share their points (style, spacing and every line and
 * vertex), so their heights can be blended point by point.
 */
export function sameNetShape(a: Fishnet, b: Fishnet): boolean {
  if (a.style !== b.style || a.spacing !== b.spacing) return false;
  if (a.mesh || b.mesh) {
    if (!a.mesh || !b.mesh || a.mesh.xy.length !== b.mesh.xy.length) return false;
    for (let i = 0; i < a.mesh.xy.length; i++) if (a.mesh.xy[i] !== b.mesh.xy[i]) return false;
    return true;
  }
  if (a.upper.length !== b.upper.length) return false;
  for (let l = 0; l < a.upper.length; l++) {
    const p = a.upper[l];
    const q = b.upper[l];
    if (p.length !== q.length) return false;
    for (let i = 0; i < p.length; i += 3) if (p[i] !== q[i] || p[i + 1] !== q[i + 1]) return false;
  }
  return true;
}

/**
 * The membrane a fraction `t` of the way from net `a` to net `b`, which must
 * share their points ({@link sameNetShape}). A point open over a pore in one
 * of them takes the other's height, and is open for the half nearer the one
 * where it is open.
 */
export function blendFishnet(a: Fishnet, b: Fishnet, t: number): Fishnet {
  const mix = (p: number, q: number) => {
    if (Number.isNaN(p)) return t < 0.5 ? NaN : q;
    if (Number.isNaN(q)) return t < 0.5 ? p : NaN;
    return p + t * (q - p);
  };
  const lines = (pa: Float64Array[], pb: Float64Array[]) =>
    pa.map((line, l) => {
      const out = Float64Array.from(line);
      for (let i = 2; i < out.length; i += 3) out[i] = mix(line[i], pb[l][i]);
      return out;
    });
  const heights = (za: Float64Array, zb: Float64Array) => za.map((z, v) => mix(z, zb[v]));
  return {
    spacing: b.spacing,
    style: b.style,
    upper: lines(a.upper, b.upper),
    lower: lines(a.lower, b.lower),
    mesh:
      a.mesh && b.mesh
        ? {
            ...b.mesh,
            upper: heights(a.mesh.upper, b.mesh.upper),
            lower: heights(a.mesh.lower, b.mesh.lower),
          }
        : b.mesh,
    heightAt: (leaf, ox, oy) => mix(a.heightAt(leaf, ox, oy), b.heightAt(leaf, ox, oy)),
  };
}

/** Nearest-sample distances and the enclosure test for the drawn protein. */
interface ProteinShape {
  /** Number of membrane-spanning samples. */
  n: number;
  /** Distance (Å) in xy from (ox, oy), relative to the centre, to the nearest sample; ∞ with none. */
  distance(ox: number, oy: number): number;
  /** Whether the samples surround (ox, oy) on every side. */
  enclosed(ox: number, oy: number): boolean;
  /** Whether (ox, oy) is inside the samples' convex hull (needed to be enclosed). */
  inHull(ox: number, oy: number): boolean;
  /** Farthest sample's distance (Å) from the centre. */
  extent: number;
}

function proteinShape(protein: ArrayLike<number>, centre: { x: number; y: number }): ProteinShape {
  const n = Math.floor(protein.length / 2);
  const xy = new Float64Array(n * 2);
  let extent = 0;
  for (let i = 0; i < n; i++) {
    xy[i * 2] = protein[i * 2] - centre.x;
    xy[i * 2 + 1] = protein[i * 2 + 1] - centre.y;
    extent = Math.max(extent, Math.hypot(xy[i * 2], xy[i * 2 + 1]));
  }
  // Samples binned on a coarse grid, searched outwards ring by ring.
  const C = 4;
  const B = Math.ceil(extent / C) + 1;
  const NB = 2 * B;
  const bins: number[][] = Array.from({ length: NB * NB }, () => []);
  for (let i = 0; i < n; i++)
    bins[(Math.floor(xy[i * 2] / C) + B) * NB + Math.floor(xy[i * 2 + 1] / C) + B].push(i);
  const distance = (ox: number, oy: number): number => {
    if (n === 0) return Infinity;
    const bi = Math.floor(ox / C) + B;
    const bj = Math.floor(oy / C) + B;
    let best2 = Infinity;
    const scan = (i: number, j: number) => {
      for (const s of bins[i * NB + j]) {
        const dx = xy[s * 2] - ox;
        const dy = xy[s * 2 + 1] - oy;
        best2 = Math.min(best2, dx * dx + dy * dy);
      }
    };
    // Square rings of bins outwards from the point's, from the first that
    // overlaps the grid; anything in ring k is at least (k − 1)·C away.
    const k0 = Math.max(0, bi - NB + 1, -bi, bj - NB + 1, -bj);
    for (let k = k0; k <= k0 + NB; k++) {
      if (k > 0 && ((k - 1) * C) ** 2 > best2) break;
      const [i0, i1, j0, j1] = [bi - k, bi + k, bj - k, bj + k];
      for (let i = Math.max(0, i0); i <= Math.min(NB - 1, i1); i++) {
        if (i === i0 || i === i1) {
          for (let j = Math.max(0, j0); j <= Math.min(NB - 1, j1); j++) scan(i, j);
        } else {
          if (j0 >= 0) scan(i, j0);
          if (j1 <= NB - 1) scan(i, j1);
        }
      }
    }
    return Math.sqrt(best2);
  };
  // Samples can only surround a point inside their convex hull.
  const hull = convexHull(xy, n);
  const inHull = (x: number, y: number): boolean => {
    if (hull.length < 6) return false;
    for (let i = 0; i < hull.length; i += 2) {
      const [ax, ay] = [hull[i], hull[i + 1]];
      const j = (i + 2) % hull.length;
      if ((hull[j] - ax) * (y - ay) - (hull[j + 1] - ay) * (x - ax) <= 0) return false;
    }
    return true;
  };
  // Visit samples in a scattered order, so a surrounded point sees every side early.
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => ((a * 7919) % n) - ((b * 7919) % n) || a - b,
  );
  const enclosed = (x: number, y: number): boolean => {
    if (!inHull(x, y)) return false;
    const all = (1 << ENCLOSING_SECTORS) - 1;
    let seen = 0;
    for (const i of order) {
      const dx = xy[i * 2] - x;
      const dy = xy[i * 2 + 1] - y;
      if (dx === 0 && dy === 0) continue;
      const t = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
      seen |= 1 << Math.min(ENCLOSING_SECTORS - 1, Math.floor(t * ENCLOSING_SECTORS));
      if (seen === all) return true;
    }
    return false;
  };
  return { n, distance, enclosed, inHull, extent };
}

/** One leaflet's height at (ox, oy) from the disc centre. */
type Field = (ox: number, oy: number) => number;

/**
 * Each leaflet's height over the disc, on a lattice of {@link FIELD_STEP} and
 * interpolated between.
 *
 * With local heights, a point with no lipid near it is left open (NaN) if the
 * drawn protein surrounds it (a pore). Elsewhere the lipid is missing because
 * of protein the view doesn't draw (other subunits), the drawn protein's own
 * footprint, or the file's edge; there the field is filled in as a stretched
 * membrane would be, each point the mean of its neighbours, held by the lipid
 * around and the bulk past the disc, so it is neither torn nor stepped.
 * Without local heights it holds the annular height next to the protein,
 * easing to the bulk. Either way it eases to the bulk before `inner`.
 */
function heightField(input: FishnetInput, shape: ProteinShape, inner: number): Record<Leaf, Field> {
  const { radius: r, bulk, annular, local } = input;
  const h = FIELD_STEP;
  const M = Math.ceil(r / h) + 1;
  const W = 2 * M + 1;
  const toRim = (ox: number, oy: number) =>
    inner > 0 ? smoothstep((Math.hypot(ox, oy) / inner - RIM_FADE) / (1 - RIM_FADE)) : 1;
  const node = (a: number): [number, number] => [(Math.floor(a / W) - M) * h, ((a % W) - M) * h];
  const inside = new Uint8Array(W * W);
  for (let a = 0; a < W * W; a++) {
    const [ox, oy] = node(a);
    inside[a] = Math.hypot(ox, oy) < inner ? 1 : 0;
  }

  /** Interpolates lattice values, keeping open (NaN) only what is nearest an open node. */
  const sampler =
    (leaf: Leaf, v: Float64Array): Field =>
    (ox, oy) => {
      if (Math.hypot(ox, oy) >= inner - 1e-9) return bulk[leaf];
      const fi = ox / h + M;
      const fj = oy / h + M;
      const i = Math.min(W - 2, Math.max(0, Math.floor(fi)));
      const j = Math.min(W - 2, Math.max(0, Math.floor(fj)));
      const ti = fi - i;
      const tj = fj - j;
      const corners: [number, number][] = [
        [v[i * W + j], (1 - ti) * (1 - tj)],
        [v[(i + 1) * W + j], ti * (1 - tj)],
        [v[i * W + j + 1], (1 - ti) * tj],
        [v[(i + 1) * W + j + 1], ti * tj],
      ];
      const nearest = corners[(ti < 0.5 ? 0 : 1) + (tj < 0.5 ? 0 : 2)][0];
      if (Number.isNaN(nearest)) return NaN;
      let sum = 0;
      let wSum = 0;
      for (const [z, w] of corners) {
        if (Number.isNaN(z) || w === 0) continue;
        sum += w * z;
        wSum += w;
      }
      return wSum > 0 ? sum / wSum : nearest;
    };

  /** Heights without local ones: annular next to the protein, easing to the bulk. */
  const plain = (leaf: Leaf, ox: number, oy: number) => {
    const dP = shape.distance(ox, oy);
    const toBulk = Math.max(toRim(ox, oy), smoothstep((dP - ANNULAR_REACH) / ANNULAR_FADE));
    return annular[leaf] + toBulk * (bulk[leaf] - annular[leaf]);
  };

  if (!local) {
    const out = {} as Record<Leaf, Field>;
    for (const leaf of ['upper', 'lower'] as const) {
      if (annular[leaf] === bulk[leaf]) {
        out[leaf] = () => bulk[leaf];
        continue;
      }
      const v = new Float64Array(W * W);
      for (let a = 0; a < W * W; a++) v[a] = inside[a] ? plain(leaf, ...node(a)) : bulk[leaf];
      out[leaf] = sampler(leaf, v);
    }
    return out;
  }

  const poreRadius = Math.min(PORE_RADIUS, local.radius);
  const enclosedAt = new Int8Array(W * W).fill(-1);
  const isEnclosed = (a: number) => {
    if (enclosedAt[a] < 0) enclosedAt[a] = shape.enclosed(...node(a)) ? 1 : 0;
    return enclosedAt[a] === 1;
  };
  const steps = [-W, W, -1, 1];
  const out = {} as Record<Leaf, Field>;
  for (const leaf of ['upper', 'lower'] as const) {
    const at = local[leaf];
    const value = new Float64Array(W * W);
    const state = new Uint8Array(W * W);
    const queue: number[] = [];
    for (let a = 0; a < W * W; a++) {
      if (!inside[a]) {
        value[a] = bulk[leaf];
        continue;
      }
      const [ox, oy] = node(a);
      const x = input.centre.x + ox;
      const y = input.centre.y + oy;
      const z = at(x, y, local.radius);
      const noLipid =
        z === null ||
        (poreRadius < local.radius && shape.inHull(ox, oy) && at(x, y, poreRadius) === null);
      if (noLipid && isEnclosed(a)) {
        state[a] = PORE;
        continue;
      }
      if (z === null) {
        state[a] = GAP;
        value[a] = NaN;
      } else {
        state[a] = KNOWN;
        value[a] = z;
        queue.push(a);
      }
    }
    // Start each gap point from the nearest lipid (or the plain heights
    // where it reaches none), then relax.
    for (let q = 0; q < queue.length; q++) {
      for (const s of steps) {
        const b = queue[q] + s;
        if (inside[b] && state[b] === GAP && Number.isNaN(value[b])) {
          value[b] = value[queue[q]];
          queue.push(b);
        }
      }
    }
    const gaps: number[] = [];
    for (let a = 0; a < W * W; a++) {
      if (!inside[a] || state[a] !== GAP) continue;
      gaps.push(a);
      if (Number.isNaN(value[a])) value[a] = plain(leaf, ...node(a));
    }
    // Neighbours past the disc hold the bulk; pores are left out.
    relax(value, gaps, (a, visit) => {
      for (const s of steps) if (state[a + s] !== PORE) visit(a + s);
    });
    for (let a = 0; a < W * W; a++) {
      if (!inside[a]) continue;
      if (state[a] === PORE) value[a] = NaN;
      else value[a] += toRim(...node(a)) * (bulk[leaf] - value[a]);
    }
    out[leaf] = sampler(leaf, value);
  }
  return out;
}

/**
 * Gauss–Seidel with over-relaxation: each of `free` becomes the mean of its
 * neighbours (as listed by `neighbours`) until nothing moves.
 */
function relax(
  value: Float64Array,
  free: number[],
  neighbours: (a: number, visit: (b: number) => void) => void,
): void {
  let sum = 0;
  let count = 0;
  const visit = (b: number) => {
    sum += value[b];
    count++;
  };
  for (let it = 0; it < FILL_MAX_ITERATIONS && free.length; it++) {
    let change = 0;
    for (const a of free) {
      sum = 0;
      count = 0;
      neighbours(a, visit);
      if (!count) continue;
      const d = FILL_OMEGA * (sum / count - value[a]);
      value[a] += d;
      change = Math.max(change, Math.abs(d));
    }
    if (change < FILL_TOLERANCE) break;
  }
}

/**
 * The square grid: lines `spacing` apart both ways, each as (ox, oy) pairs
 * from rim to rim, with a point between crossings unless that would put
 * points under {@link MIN_STEP} apart.
 */
function gridLines(r: number, spacing: number): number[][] {
  const per = spacing < 2 * MIN_STEP ? 1 : 2;
  const step = spacing / per;
  const K = Math.floor((r - 1e-6) / spacing);
  const lines: number[][] = [];
  for (const across of [0, 1]) {
    for (let k = -K; k <= K; k++) {
      const off = k * spacing;
      const half = Math.sqrt(r * r - off * off);
      const along: number[] = [-half];
      for (let j = Math.ceil(-half / step + 1e-9); j * step < half - 1e-9; j++)
        along.push(j * step);
      along.push(half);
      lines.push(along.flatMap((a) => (across ? [a, off] : [off, a])));
    }
  }
  return lines;
}

/**
 * Polar rings and spokes. Rings run at constant distance from the
 * protein–lipid interface ({@link INTERFACE_PAD} out from the samples) for
 * the first {@link ISO_REACH} Å or so; beyond that they are level lines of a
 * field that is harmonic between the last of those rings and the circle
 * where the bulk ring starts, so they turn smoothly into that circle. Spokes
 * run across the rings, from the rim in towards the protein, and stop where
 * they would crowd one another. Nothing is drawn inside the protein or in its
 * pores (space outside the interface with no way out to the bulk).
 */
function polarLines(r: number, inner: number, spacing: number, shape: ProteinShape): number[][] {
  const h = POLAR_STEP;
  const M = Math.ceil(inner / h) + 2;
  const W = 2 * M + 1;
  const pos = (a: number): [number, number] => [(Math.floor(a / W) - M) * h, ((a % W) - M) * h];
  const iso = spacing * Math.max(1, Math.floor(ISO_REACH / spacing));
  // d: distance (Å) out from the interface; NaN in the protein's pores,
  // which no path outside the interface joins to the bulk.
  const d = new Float64Array(W * W);
  const rho = new Float64Array(W * W);
  const reached = new Uint8Array(W * W);
  const queue: number[] = [];
  for (let a = 0; a < W * W; a++) {
    const [ox, oy] = pos(a);
    rho[a] = Math.hypot(ox, oy);
    d[a] = shape.n ? shape.distance(ox, oy) - INTERFACE_PAD : rho[a] - INTERFACE_PAD;
    if (rho[a] >= inner) {
      reached[a] = 1;
      queue.push(a);
    }
  }
  const steps = [-W, W, -1, 1];
  for (let q = 0; q < queue.length; q++) {
    for (const s of steps) {
      const b = queue[q] + s;
      if (b < 0 || b >= W * W || reached[b] || !(d[b] > 0)) continue;
      reached[b] = 1;
      queue.push(b);
    }
  }
  for (let a = 0; a < W * W; a++) if (d[a] > 0 && !reached[a]) d[a] = NaN;
  // u: 0 on the last constant-distance ring, 1 on the inner circle.
  const u = new Float64Array(W * W);
  const free: number[] = [];
  for (let a = 0; a < W * W; a++) {
    if (rho[a] >= inner) u[a] = 1;
    else if (Number.isNaN(d[a])) u[a] = NaN;
    else if (d[a] <= iso) u[a] = 0;
    else {
      free.push(a);
      u[a] = (d[a] - iso) / (d[a] - iso + inner - rho[a]);
    }
  }
  relax(u, free, (a, visit) => {
    for (const s of steps) if (!Number.isNaN(u[a + s])) visit(a + s);
  });
  // How far the harmonic band reaches, on average: its rings are spread over that.
  let gap = 0;
  let edge = 0;
  for (const a of free) {
    if (steps.some((s) => !Number.isNaN(d[a + s]) && d[a + s] <= iso && rho[a + s] < inner)) {
      gap += inner - rho[a];
      edge++;
    }
  }
  const span = edge ? gap / edge : 0;
  const phi = new Float64Array(W * W);
  for (let a = 0; a < W * W; a++) {
    if (Number.isNaN(d[a])) phi[a] = NaN;
    else if (rho[a] >= inner) phi[a] = iso + span;
    else if (d[a] <= iso) phi[a] = d[a];
    else phi[a] = iso + u[a] * span;
  }

  const lineStep = Math.max(MIN_STEP, spacing / 2);
  const toO = (pts: number[]) => pts.map((v) => (v - M) * h);
  const lines: number[][] = [];
  const levels: number[] = [];
  for (let k = 0; k * spacing <= iso + 1e-9; k++) levels.push(k * spacing);
  const nBand = Math.max(1, Math.round(span / spacing));
  if (span > 0) for (let j = 1; j < nBand; j++) levels.push(iso + (j / nBand) * span);
  for (const level of levels)
    for (const line of levelLines(phi, W, level)) lines.push(resample(toO(line), lineStep));
  // The circle where the bulk ring starts.
  const nCircle = Math.max(12, Math.round((2 * Math.PI * inner) / lineStep));
  const circle: number[] = [];
  for (let q = 0; q <= nCircle; q++) {
    const th = (q / nCircle) * 2 * Math.PI;
    circle.push(inner * Math.cos(th), inner * Math.sin(th));
  }
  if (inner > 0 && inner < r) lines.push(circle);

  // Spokes, traced down the field from the circle, then out to the rim.
  const sample = (ox: number, oy: number) => {
    const fi = ox / h + M;
    const fj = oy / h + M;
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= W - 1 || j >= W - 1) return NaN;
    const ti = fi - i;
    const tj = fj - j;
    return (
      (1 - ti) * (1 - tj) * phi[i * W + j] +
      ti * (1 - tj) * phi[(i + 1) * W + j] +
      (1 - ti) * tj * phi[i * W + j + 1] +
      ti * tj * phi[(i + 1) * W + j + 1]
    );
  };
  const nSpokes = Math.max(8, Math.round((2 * Math.PI * inner) / spacing));
  const cell = spacing / 2;
  const owner = new Map<string, number>();
  const stepLen = h / 2;
  for (let s = 0; s < nSpokes; s++) {
    const th = (s / nSpokes) * 2 * Math.PI;
    const [c, sn] = [Math.cos(th), Math.sin(th)];
    const pts = [r * c, r * sn, inner * c, inner * sn];
    let [x, y] = [inner * c, inner * sn];
    for (let k = 0; k < (4 * inner) / stepLen; k++) {
      const gx = sample(x + 0.5, y) - sample(x - 0.5, y);
      const gy = sample(x, y + 0.5) - sample(x, y - 0.5);
      const g = Math.hypot(gx, gy);
      if (!(g > 1e-9)) break;
      const nx = x - (stepLen * gx) / g;
      const ny = y - (stepLen * gy) / g;
      const f = sample(nx, ny);
      if (!(f > 0)) break;
      const key = `${Math.floor(nx / cell)},${Math.floor(ny / cell)}`;
      const o = owner.get(key);
      if (o !== undefined && o !== s) break;
      owner.set(key, s);
      [x, y] = [nx, ny];
      pts.push(x, y);
    }
    lines.push(resample(pts, lineStep));
  }
  return lines;
}

/**
 * Quads covering the disc: a square lattice of `step`, with vertices past the
 * rim moved onto it.
 */
function surfaceMesh(r: number, step: number): { xy: Float64Array; quads: Uint32Array } {
  const M = Math.ceil(r / step) + 1;
  const W = 2 * M + 1;
  const index = new Int32Array(W * W).fill(-1);
  const xy: number[] = [];
  const vertex = (i: number, j: number) => {
    const a = i * W + j;
    if (index[a] < 0) {
      let ox = (i - M) * step;
      let oy = (j - M) * step;
      const rho = Math.hypot(ox, oy);
      if (rho > r) [ox, oy] = [(ox * r) / rho, (oy * r) / rho];
      index[a] = xy.length / 2;
      xy.push(ox, oy);
    }
    return index[a];
  };
  const within = (i: number, j: number) => Math.hypot((i - M) * step, (j - M) * step) < r;
  const quads: number[] = [];
  for (let i = 0; i < W - 1; i++) {
    for (let j = 0; j < W - 1; j++) {
      if (!within(i, j) && !within(i + 1, j) && !within(i, j + 1) && !within(i + 1, j + 1))
        continue;
      const [a, b, c, d] = [vertex(i, j), vertex(i + 1, j), vertex(i + 1, j + 1), vertex(i, j + 1)];
      quads.push(a, b, c, d);
    }
  }
  return { xy: Float64Array.from(xy), quads: Uint32Array.from(quads) };
}

/**
 * Convex hull of the first `n` (x, y) pairs, anticlockwise, as flat pairs
 * (Andrew's monotone chain).
 */
function convexHull(xy: ArrayLike<number>, n: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => xy[a * 2] - xy[b * 2] || xy[a * 2 + 1] - xy[b * 2 + 1],
  );
  const cross = (o: number, a: number, b: number) =>
    (xy[a * 2] - xy[o * 2]) * (xy[b * 2 + 1] - xy[o * 2 + 1]) -
    (xy[a * 2 + 1] - xy[o * 2 + 1]) * (xy[b * 2] - xy[o * 2]);
  const chain = (ids: number[]) => {
    const out: number[] = [];
    for (const p of ids) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  const ids = [...chain(order), ...chain([...order].reverse())];
  return ids.flatMap((i) => [xy[i * 2], xy[i * 2 + 1]]);
}

/**
 * The rotation about z and shift taking `from` onto `to` (flat x, y pairs)
 * in the least-squares sense, as a map back from `to` to `from`, with the
 * RMS misfit (Å). Null with fewer than three points.
 */
export function fitRigid2d(
  from: ArrayLike<number>,
  to: ArrayLike<number>,
): { invert: (x: number, y: number) => [number, number]; rms: number } | null {
  const n = Math.floor(Math.min(from.length, to.length) / 2);
  if (n < 3) return null;
  let fx = 0,
    fy = 0,
    tx = 0,
    ty = 0;
  for (let i = 0; i < n; i++) {
    fx += from[i * 2] / n;
    fy += from[i * 2 + 1] / n;
    tx += to[i * 2] / n;
    ty += to[i * 2 + 1] / n;
  }
  let sc = 0;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const ax = from[i * 2] - fx;
    const ay = from[i * 2 + 1] - fy;
    const bx = to[i * 2] - tx;
    const by = to[i * 2 + 1] - ty;
    sc += ax * bx + ay * by;
    ss += ax * by - ay * bx;
  }
  const th = Math.atan2(ss, sc);
  const c = Math.cos(th);
  const s = Math.sin(th);
  let sq = 0;
  for (let i = 0; i < n; i++) {
    const ax = from[i * 2] - fx;
    const ay = from[i * 2 + 1] - fy;
    const dx = tx + c * ax - s * ay - to[i * 2];
    const dy = ty + s * ax + c * ay - to[i * 2 + 1];
    sq += dx * dx + dy * dy;
  }
  return {
    invert: (x, y) => {
      const bx = x - tx;
      const by = y - ty;
      return [fx + c * bx + s * by, fy - s * bx + c * by];
    },
    rms: Math.sqrt(sq / n),
  };
}
