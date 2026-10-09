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
/**
 * Spokes cross the band out from the last constant-distance ring evenly
 * spread round that ring, leaning where that is not their polar angle; this
 * weighs their lean (in radians, as it would be across the band) against
 * uneven spacing round the ring (as a fraction).
 */
const SPOKE_LEAN = 1;
/** A spoke stopping at a ring runs this far (Å) across it … */
const SPOKE_OVERRUN = 0.6;
/** … and one reaching the interface stops this short of it. */
const SPOKE_SHORT = 0.3;
/** Tolerance (radians) of the spokes' angle field, and (Å) of their descent to the interface. */
const ANGLE_TOLERANCE = 1e-4;
const DESCENT_TOLERANCE = 1e-2;

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
    relax(
      value,
      gaps,
      latticeNeighbours(gaps, W, (b) => state[b] !== PORE),
    );
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
 * neighbours (`nb`, four per free node, −1 for none), each less its `off`set
 * if given, until nothing moves by `tolerance`.
 */
function relax(
  value: Float64Array,
  free: number[],
  nb: Int32Array,
  off: Float64Array | null = null,
  tolerance = FILL_TOLERANCE,
): void {
  for (let it = 0; it < FILL_MAX_ITERATIONS && free.length; it++) {
    let change = 0;
    for (let f = 0; f < free.length; f++) {
      let sum = 0;
      let count = 0;
      for (let q = f * 4; q < f * 4 + 4; q++) {
        const b = nb[q];
        if (b < 0) continue;
        sum += off ? value[b] - off[q] : value[b];
        count++;
      }
      if (!count) continue;
      const a = free[f];
      const d = FILL_OMEGA * (sum / count - value[a]);
      value[a] += d;
      if (d > change) change = d;
      else if (-d > change) change = -d;
    }
    if (change < tolerance) break;
  }
}

/**
 * The four lattice neighbours (row width `W`) of each of `nodes`, as
 * {@link relax} takes them: −1 for one `keep` turns down.
 */
function latticeNeighbours(nodes: number[], W: number, keep?: (b: number) => boolean): Int32Array {
  const steps = [-W, W, -1, 1];
  const nb = new Int32Array(nodes.length * 4);
  nodes.forEach((a, f) =>
    steps.forEach((s, q) => (nb[f * 4 + q] = !keep || keep(a + s) ? a + s : -1)),
  );
  return nb;
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
 * run across the rings, from the rim in towards the protein, evenly spread
 * round the circle and round the last constant-distance ring, and stop where
 * they would crowd one another. Nothing is drawn inside the protein or in its
 * pores (space outside the interface with no way out to the bulk).
 */
function polarLines(r: number, inner: number, spacing: number, shape: ProteinShape): number[][] {
  const h = POLAR_STEP;
  const M = Math.ceil(inner / h) + 2;
  const W = 2 * M + 1;
  const pos = (a: number): [number, number] => [(Math.floor(a / W) - M) * h, ((a % W) - M) * h];
  const iso = spacing * Math.max(1, Math.floor(ISO_REACH / spacing));
  // d: distance (Å) out from the interface. The protein's pores, which no
  // path outside the interface joins to the bulk, count as protein (-1), so
  // the interface ring closes past a pore that only touches the outside
  // diagonally.
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
  for (let a = 0; a < W * W; a++) if (d[a] > 0 && !reached[a]) d[a] = -1;
  // u: 0 on the last constant-distance ring, 1 on the inner circle.
  const u = new Float64Array(W * W);
  const free: number[] = [];
  for (let a = 0; a < W * W; a++) {
    if (rho[a] >= inner) u[a] = 1;
    else if (d[a] <= iso) u[a] = 0;
    else {
      free.push(a);
      u[a] = (d[a] - iso) / (d[a] - iso + inner - rho[a]);
    }
  }
  relax(u, free, latticeNeighbours(free, W));
  // How far the harmonic band reaches, on average: its rings are spread over that.
  let gap = 0;
  let edge = 0;
  for (const a of free) {
    if (steps.some((s) => d[a + s] <= iso && rho[a + s] < inner)) {
      gap += inner - rho[a];
      edge++;
    }
  }
  const span = edge ? gap / edge : 0;
  // Free nodes stay above the last constant-distance ring by their distance
  // past it (up to a lattice step), so that ring follows d even in a pocket
  // the circle can't reach, where u is 0 to within the solver's tolerance.
  const phi = new Float64Array(W * W);
  for (let a = 0; a < W * W; a++) {
    if (rho[a] >= inner) phi[a] = iso + span;
    else if (d[a] <= iso) phi[a] = d[a];
    else phi[a] = iso + Math.max(u[a] * span, Math.min(d[a] - iso, h));
  }

  const lineStep = Math.max(MIN_STEP, spacing / 2);
  const toO = (pts: number[]) => pts.map((v) => (v - M) * h);
  const lines: number[][] = [];
  const levels: number[] = [];
  for (let k = 0; k * spacing <= iso + 1e-9; k++) levels.push(k * spacing);
  const nBand = Math.max(1, Math.round(span / spacing));
  if (span > 0) for (let j = 1; j < nBand; j++) levels.push(iso + (j / nBand) * span);
  const isoRings: number[][] = [];
  for (const level of levels)
    for (const line of levelLines(phi, W, level)) {
      const ring = toO(line);
      if (level === iso) isoRings.push(ring);
      lines.push(resample(ring, lineStep));
    }
  // The circle where the bulk ring starts.
  const nCircle = Math.max(12, Math.round((2 * Math.PI * inner) / lineStep));
  const circle: number[] = [];
  for (let q = 0; q <= nCircle; q++) {
    const th = (q / nCircle) * 2 * Math.PI;
    circle.push(inner * Math.cos(th), inner * Math.sin(th));
  }
  if (inner > 0 && inner < r) lines.push(circle);

  // Spokes, from the circle in. Across the band each follows a level line of
  // an angle that is harmonic there: the polar angle on the circle and, round
  // the last constant-distance ring, mostly in proportion to arc length (see
  // ringAngle), so spokes are evenly spread at both and in between. (Where
  // there is no such angle, see bandAngle, they run down phi instead.) Inside
  // that ring each runs down a field that is harmonic between the interface
  // (0) and the ring (iso), so spokes spread over the interface rather than
  // gathering on the nearest samples, with the turn between the two rounded
  // off. Where they close up, the finer ones (see spokeOrder) stop.
  const theta = bandAngle(rho, d, W, M, h, inner, iso, isoRings);
  const down = Float64Array.from(phi, (v) => Math.min(v, iso));
  const zone: number[] = [];
  for (let a = 0; a < W * W; a++) if (rho[a] < inner && d[a] > 0 && d[a] < iso) zone.push(a);
  relax(down, zone, latticeNeighbours(zone, W), null, DESCENT_TOLERANCE);
  const sample = bilinear(phi, W, M, h);
  const descent = bilinear(down, W, M, h);
  const thetaAt = (ox: number, oy: number): number => {
    if (!theta) return NaN;
    const fi = ox / h + M;
    const fj = oy / h + M;
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= W - 1 || j >= W - 1) return NaN;
    const ti = fi - i;
    const tj = fj - j;
    const t0 = theta[i * W + j];
    return (
      t0 +
      ti * (1 - tj) * wrapAngle(theta[(i + 1) * W + j] - t0) +
      (1 - ti) * tj * wrapAngle(theta[i * W + j + 1] - t0) +
      ti * tj * wrapAngle(theta[(i + 1) * W + j + 1] - t0)
    );
  };
  const gradTheta = (x: number, y: number): [number, number] => [
    wrapAngle(thetaAt(x + 0.5, y) - thetaAt(x - 0.5, y)),
    wrapAngle(thetaAt(x, y + 0.5) - thetaAt(x, y - 0.5)),
  ];
  /** Unit direction inwards at (x, y): along the angle's level line in the band, else down. */
  const heading = (x: number, y: number, band: boolean): [number, number] | null => {
    if (band && theta) {
      const [gx, gy] = gradTheta(x, y);
      const g = Math.hypot(gx, gy);
      return g > 1e-9 ? [-gy / g, gx / g] : null;
    }
    const f = band ? sample : descent;
    const gx = f(x + 0.5, y) - f(x - 0.5, y);
    const gy = f(x, y + 0.5) - f(x, y - 0.5);
    const g = Math.hypot(gx, gy);
    return g > 1e-9 ? [-gx / g, -gy / g] : null;
  };
  const nSpokes = 8 * Math.max(1, Math.round((2 * Math.PI * inner) / spacing / 8));
  const stepLen = h / 2;
  const maxSteps = (4 * inner) / stepLen;
  // Points of the spokes drawn so far, binned by `near`, so a later (finer)
  // spoke stops where it comes that close to one.
  const near = spacing / 2;
  const bins = new Map<number, number[]>();
  const bin = (x: number, y: number) =>
    (Math.floor(x / near) + 4096) * 8192 + Math.floor(y / near) + 4096;
  const crowded = (x: number, y: number): boolean => {
    const b0 = bin(x, y);
    for (const di of [-8192, 0, 8192])
      for (const dj of [-1, 0, 1]) {
        const list = bins.get(b0 + di + dj);
        if (!list) continue;
        for (let q = 0; q < list.length; q += 2)
          if ((list[q] - x) ** 2 + (list[q + 1] - y) ** 2 < near * near) return true;
      }
    return false;
  };
  const ringLevels = [...levels, iso + span].sort((a, b) => a - b);
  /**
   * Cuts a spoke (`pts`, about to step to (nx, ny)) back to
   * {@link SPOKE_OVERRUN} past where it last crossed the ring at `level`,
   * if it did since the circle.
   */
  const overrun = (pts: number[], nx: number, ny: number, level: number): void => {
    const path = [...pts, nx, ny];
    let i = path.length - 4;
    while (i >= 2 && !(sample(path[i], path[i + 1]) >= level)) i -= 2;
    if (i < 2) return;
    const fa = sample(path[i], path[i + 1]);
    const fb = sample(path[i + 2], path[i + 3]);
    const t = fa > fb ? (fa - level) / (fa - fb) : 0;
    let [cx, cy] = [
      path[i] + t * (path[i + 2] - path[i]),
      path[i + 1] + t * (path[i + 3] - path[i + 1]),
    ];
    let left = SPOKE_OVERRUN;
    let j = i + 2;
    for (; j < path.length; j += 2) {
      const seg = Math.hypot(path[j] - cx, path[j + 1] - cy);
      if (seg >= left) {
        cx += (left * (path[j] - cx)) / seg;
        cy += (left * (path[j + 1] - cy)) / seg;
        break;
      }
      left -= seg;
      [cx, cy] = [path[j], path[j + 1]];
    }
    pts.length = Math.min(j, pts.length);
    pts.push(cx, cy);
  };
  const spokes: number[][] = new Array(nSpokes);
  for (const s of spokeOrder(nSpokes)) {
    const target = (s / nSpokes) * 2 * Math.PI;
    const [c, sn] = [Math.cos(target), Math.sin(target)];
    const pts = [r * c, r * sn, inner * c, inner * sn];
    let [x, y] = [inner * c, inner * sn];
    // Where the spoke turns from the band's level line to the descent.
    let corner = -1;
    for (let k = 0; k < maxSteps; k++) {
      const f0 = sample(x, y);
      // Once inside the last constant-distance ring, a spoke stays on the descent.
      const band = corner < 0 && f0 > iso;
      if (!band && corner < 0) corner = pts.length / 2 - 1;
      const h0 = heading(x, y, band);
      if (!h0) break;
      const hm = heading(x + (stepLen / 2) * h0[0], y + (stepLen / 2) * h0[1], band);
      if (!hm) break;
      let nx = x + stepLen * hm[0];
      let ny = y + stepLen * hm[1];
      if (band && theta) {
        // Back onto the level line.
        const [gx, gy] = gradTheta(nx, ny);
        const g = Math.hypot(gx, gy);
        const err = wrapAngle(thetaAt(nx, ny) - target);
        if (g > 1e-6) {
          const move = Math.sign(err) * Math.min(stepLen, Math.abs(err) / g);
          nx -= (move * gx) / g;
          ny -= (move * gy) / g;
        }
      }
      const f = sample(nx, ny);
      let last = false;
      if (!(f > SPOKE_SHORT)) {
        // Stop just short of the interface.
        if (!(f0 > SPOKE_SHORT) || Number.isNaN(f)) break;
        const t = (f0 - SPOKE_SHORT) / (f0 - f);
        nx = x + t * (nx - x);
        ny = y + t * (ny - y);
        last = true;
      }
      // A spoke on the descent that stops descending has nowhere to go.
      if (!band && !(descent(nx, ny) < descent(x, y))) break;
      if ((!band || !theta) && crowded(nx, ny)) {
        // Stop here, or just across the ring outside if that is close.
        const fc = sample(nx, ny);
        const up = ringLevels.find((v) => v > fc) ?? Infinity;
        if (up - fc <= near) overrun(pts, nx, ny, up);
        break;
      }
      [x, y] = [nx, ny];
      pts.push(x, y);
      if (last) break;
    }
    const path =
      corner > 1 && corner < pts.length / 2 - 1
        ? roundCorner(pts, corner, Math.min(spacing / 2, iso / 2))
        : pts;
    for (let q = 4; q < path.length; q += 2) {
      const kk = bin(path[q], path[q + 1]);
      const list = bins.get(kk);
      if (list) list.push(path[q], path[q + 1]);
      else bins.set(kk, [path[q], path[q + 1]]);
    }
    spokes[s] = resample(path, lineStep);
  }
  for (const spoke of spokes) lines.push(spoke);
  return lines;
}

/** An angle wrapped into [−π, π]. */
function wrapAngle(a: number): number {
  return a - 2 * Math.PI * Math.round(a / (2 * Math.PI));
}

/** Bilinear interpolation of lattice values (spacing h, node (M, M) at the origin); NaN off it. */
function bilinear(f: Float64Array, W: number, M: number, h: number) {
  return (ox: number, oy: number): number => {
    const fi = ox / h + M;
    const fj = oy / h + M;
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    if (i < 0 || j < 0 || i >= W - 1 || j >= W - 1) return NaN;
    const ti = fi - i;
    const tj = fj - j;
    return (
      (1 - ti) * (1 - tj) * f[i * W + j] +
      ti * (1 - tj) * f[(i + 1) * W + j] +
      (1 - ti) * tj * f[i * W + j + 1] +
      ti * tj * f[(i + 1) * W + j + 1]
    );
  };
}

/**
 * The order to draw `n` spokes in (n a multiple of 8), coarsest first: the
 * eight at multiples of 45°, then in each eighth the one splitting the widest
 * gap left, and so on, so a spoke that stops for crowding is always a finer one.
 */
function spokeOrder(n: number): number[] {
  const m = n / 8;
  const rank = new Array<number>(m).fill(0);
  const picked = [0];
  for (let t = 1; t < m; t++) {
    let best = 0;
    let widest = 0;
    for (let i = 0; i < picked.length; i++) {
      const gap = (i + 1 < picked.length ? picked[i + 1] : m) - picked[i];
      if (gap > widest) [best, widest] = [i, gap];
    }
    const p = picked[best] + Math.floor(widest / 2);
    rank[p] = t;
    picked.splice(best + 1, 0, p);
  }
  return Array.from({ length: n }, (_, k) => k).sort((a, b) => rank[a % m] - rank[b % m] || a - b);
}

/**
 * An angle at each lattice node, harmonic over the band between the last
 * constant-distance ring (`d` ≤ `iso`) and the circle of radius `inner`,
 * where it is the polar angle. On the ring (of `rings`, closed lines in disc
 * coordinates where `d` is `iso`, the one enclosing the most) it is as
 * {@link ringAngle} gives. Elsewhere it is the polar angle. Null where that
 * ring does not go once round the centre, or the band also meets another
 * ring (the protein in pieces far apart), as no one angle then suits.
 */
function bandAngle(
  rho: Float64Array,
  d: Float64Array,
  W: number,
  M: number,
  h: number,
  inner: number,
  iso: number,
  rings: number[][],
): Float64Array | null {
  const FREE = 1;
  const FIXED = 2;
  const theta = new Float64Array(W * W);
  for (let a = 0; a < W * W; a++) theta[a] = Math.atan2((a % W) - M, Math.floor(a / W) - M);
  // The ring round the protein: the closed one enclosing the most.
  let ring: number[] | null = null;
  let most = 0;
  for (const line of rings) {
    const n = line.length / 2;
    if (n < 4 || line[0] !== line[line.length - 2] || line[1] !== line[line.length - 1]) continue;
    let area = 0;
    for (let p = 0; p + 1 < n; p++)
      area += line[p * 2] * line[p * 2 + 3] - line[p * 2 + 2] * line[p * 2 + 1];
    if (Math.abs(area) > most) {
      most = Math.abs(area);
      ring = area > 0 ? line : reversePairs(line);
    }
  }
  if (ring) {
    // Without repeated points (where the line runs through lattice nodes).
    const kept = [ring[0], ring[1]];
    for (let p = 2; p < ring.length; p += 2)
      if (Math.hypot(ring[p] - kept[kept.length - 2], ring[p + 1] - kept[kept.length - 1]) > 1e-6)
        kept.push(ring[p], ring[p + 1]);
    kept[kept.length - 2] = kept[0];
    kept[kept.length - 1] = kept[1];
    ring = kept.length >= 8 ? kept : null;
  }
  if (!ring) return null;
  const n = ring.length / 2;
  const cum = [0];
  for (let p = 1; p < n; p++)
    cum.push(
      cum[p - 1] + Math.hypot(ring[p * 2] - ring[p * 2 - 2], ring[p * 2 + 1] - ring[p * 2 - 1]),
    );
  const L = cum[n - 1];
  if (!(L > 0)) return null;
  // It must go once round the centre.
  let turn = 0;
  for (let p = 0; p + 1 < n; p++)
    turn += wrapAngle(
      Math.atan2(ring[p * 2 + 3], ring[p * 2 + 2]) - Math.atan2(ring[p * 2 + 1], ring[p * 2]),
    );
  if (Math.abs(turn - 2 * Math.PI) > 0.5) return null;
  const param = ringAngle(ring, cum, inner);
  // Band nodes joined to the circle.
  const role = new Uint8Array(W * W);
  const queue: number[] = [];
  for (let a = 0; a < W * W; a++)
    if (rho[a] >= inner) {
      role[a] = FIXED;
      queue.push(a);
    }
  const steps = [-W, W, -1, 1];
  const free: number[] = [];
  for (let q = 0; q < queue.length; q++)
    for (const s of steps) {
      const b = queue[q] + s;
      if (b < 0 || b >= W * W || role[b] || !(rho[b] < inner && d[b] > iso)) continue;
      role[b] = FREE;
      free.push(b);
      queue.push(b);
    }
  if (!free.length) return theta;
  // Nodes just inside the ring take the angle of the nearest point on it,
  // and those next to the band hold it there.
  const reach = 2.5 * h;
  const cellOf = (x: number, y: number) =>
    (Math.floor(x / reach) + 1024) * 2048 + Math.floor(y / reach) + 1024;
  const segs = new Map<number, number[]>();
  for (let p = 0; p + 1 < n; p++) {
    const [x0, x1] = [
      Math.min(ring[p * 2], ring[p * 2 + 2]),
      Math.max(ring[p * 2], ring[p * 2 + 2]),
    ];
    const [y0, y1] = [
      Math.min(ring[p * 2 + 1], ring[p * 2 + 3]),
      Math.max(ring[p * 2 + 1], ring[p * 2 + 3]),
    ];
    for (let i = Math.floor(x0 / reach); i <= Math.floor(x1 / reach); i++)
      for (let j = Math.floor(y0 / reach); j <= Math.floor(y1 / reach); j++) {
        const key = (i + 1024) * 2048 + j + 1024;
        const list = segs.get(key);
        if (list) list.push(p);
        else segs.set(key, [p]);
      }
  }
  const near = new Uint8Array(W * W);
  for (let a = 0; a < W * W; a++) {
    if (role[a] || !(d[a] > iso - reach) || d[a] > iso + reach) continue;
    const x = (Math.floor(a / W) - M) * h;
    const y = ((a % W) - M) * h;
    let best = Infinity;
    let at = 0;
    const c0 = cellOf(x, y);
    for (const dc of [-2049, -2048, -2047, -1, 0, 1, 2047, 2048, 2049]) {
      const list = segs.get(c0 + dc);
      if (!list) continue;
      for (const p of list) {
        const ax = ring[p * 2];
        const ay = ring[p * 2 + 1];
        const ex = ring[p * 2 + 2] - ax;
        const ey = ring[p * 2 + 3] - ay;
        const e2 = ex * ex + ey * ey;
        const t = e2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / e2)) : 0;
        const dd = (ax + t * ex - x) ** 2 + (ay + t * ey - y) ** 2;
        if (dd < best) [best, at] = [dd, param[p] + t * (param[p + 1] - param[p])];
      }
    }
    if (best > reach ** 2) continue;
    near[a] = best <= (1.5 * h) ** 2 ? 2 : 1;
    theta[a] = wrapAngle(at);
  }
  for (const a of free)
    for (const s of steps) {
      const b = a + s;
      if (role[b]) continue;
      if (near[b] !== 2) return null;
      role[b] = FIXED;
    }
  // Harmonic in the band. Neighbours' angles are taken on the branch
  // nearest each node's starting value, so the solve needs no wrapping.
  const nb = latticeNeighbours(free, W);
  const off = new Float64Array(free.length * 4);
  free.forEach((a, f) => {
    for (let q = f * 4; q < f * 4 + 4; q++)
      off[q] = theta[nb[q]] - theta[a] - wrapAngle(theta[nb[q]] - theta[a]);
  });
  relax(theta, free, nb, off, ANGLE_TOLERANCE);
  return theta;
}

/**
 * The spokes' angle at each point of a closed ring round the origin (flat
 * pairs, anticlockwise, last point the first, `cum` the arc length to each),
 * increasing, the last 2π past the first: as near proportional to arc length
 * as it can be while near the polar angle where the ring comes close to the
 * circle of radius `inner`, weighed by {@link SPOKE_LEAN}, so spokes are evenly
 * spread round the ring but need not lean steeply across a narrow band.
 */
function ringAngle(ring: number[], cum: number[], inner: number): number[] {
  const n = ring.length / 2;
  const N = n - 1;
  const L = cum[N];
  // Polar angle, unwound along the ring.
  const polar = [Math.atan2(ring[1], ring[0])];
  for (let p = 1; p < n; p++)
    polar.push(polar[p - 1] + wrapAngle(Math.atan2(ring[p * 2 + 1], ring[p * 2]) - polar[p - 1]));
  // Least squares in arc-length units: springs keep each step its length;
  // weights pull each point to its polar angle by the lean that leaves across
  // the band, and very lightly everywhere, which fixes where the count starts.
  const k: number[] = [];
  for (let p = 0; p < N; p++) k.push(1 / Math.max(1e-6, cum[p + 1] - cum[p]));
  const a: number[] = [];
  const b: number[] = [];
  const c: number[] = [];
  const rhs: number[] = [];
  for (let p = 0; p < N; p++) {
    const q = (p + N - 1) % N;
    const ds = (cum[p + 1] - cum[p] + cum[q + 1] - cum[q]) / 2;
    const gap = inner - Math.hypot(ring[p * 2], ring[p * 2 + 1]);
    const hold = SPOKE_LEAN / Math.max(1, gap) ** 2;
    const w = ds * (1e-6 + hold);
    a.push(-k[q]);
    c.push(-k[p]);
    b.push(k[q] + k[p] + w);
    rhs.push(
      k[q] * (cum[q + 1] - cum[q]) -
        k[p] * (cum[p + 1] - cum[p]) +
        (w * polar[p] * L) / (2 * Math.PI),
    );
  }
  rhs[0] -= k[N - 1] * L;
  rhs[N - 1] += k[N - 1] * L;
  let T = N >= 3 ? cyclicTridiagonal(a, b, c, rhs) : null;
  if (!T || T.some((v, p) => p > 0 && !(v > T![p - 1]))) {
    // Arc length alone, started where it best matches the polar angle.
    let sc = 0;
    let ss = 0;
    for (let p = 0; p < N; p++) {
      const off = polar[p] - (2 * Math.PI * cum[p]) / L;
      sc += Math.cos(off);
      ss += Math.sin(off);
    }
    const origin = (Math.atan2(ss, sc) * L) / (2 * Math.PI);
    T = cum.slice(0, N).map((v) => v + origin);
  }
  const out = T.map((v) => (2 * Math.PI * v) / L);
  out.push(out[0] + 2 * Math.PI);
  return out;
}

/**
 * Solves a cyclic tridiagonal system: row p is a[p]·x[p−1] + b[p]·x[p] +
 * c[p]·x[p+1] = d[p], indices wrapping round (Sherman–Morrison).
 */
function cyclicTridiagonal(a: number[], b: number[], c: number[], d: number[]): number[] | null {
  const n = b.length;
  const alpha = a[0];
  const beta = c[n - 1];
  const gamma = -b[0];
  const bb = b.slice();
  bb[0] -= gamma;
  bb[n - 1] -= (alpha * beta) / gamma;
  const solve = (r: number[]): number[] => {
    const cp = new Array<number>(n);
    const x = new Array<number>(n);
    let m = bb[0];
    cp[0] = c[0] / m;
    x[0] = r[0] / m;
    for (let i = 1; i < n; i++) {
      m = bb[i] - a[i] * cp[i - 1];
      cp[i] = c[i] / m;
      x[i] = (r[i] - a[i] * x[i - 1]) / m;
    }
    for (let i = n - 2; i >= 0; i--) x[i] -= cp[i] * x[i + 1];
    return x;
  };
  const y = solve(d);
  const u = new Array<number>(n).fill(0);
  u[0] = gamma;
  u[n - 1] = beta;
  const z = solve(u);
  const fact = (y[0] + (alpha * y[n - 1]) / gamma) / (1 + z[0] + (alpha * z[n - 1]) / gamma);
  const x = y.map((v, i) => v - fact * z[i]);
  return x.every(Number.isFinite) ? x : null;
}

/**
 * A polyline (flat pairs) with the corner at point `j` rounded off: the
 * stretch within `R` (along it) either side replaced by a quadratic curve,
 * touching the line there. Points before 1 are left alone.
 */
function roundCorner(pts: number[], j: number, R: number): number[] {
  const m = pts.length / 2;
  const len = (i: number) =>
    Math.hypot(pts[i * 2 + 2] - pts[i * 2], pts[i * 2 + 3] - pts[i * 2 + 1]);
  let back = 0;
  for (let i = 1; i < j; i++) back += len(i);
  let fwd = 0;
  for (let i = j; i < m - 1; i++) fwd += len(i);
  R = Math.min(R, back, fwd);
  if (!(R > 0.5)) return pts;
  let i = j;
  let acc = 0;
  while (i > 2 && acc + len(i - 1) < R) acc += len(--i);
  let t = Math.min(1, (R - acc) / (len(i - 1) || 1));
  const ax = pts[i * 2] + t * (pts[i * 2 - 2] - pts[i * 2]);
  const ay = pts[i * 2 + 1] + t * (pts[i * 2 - 1] - pts[i * 2 + 1]);
  let k = j;
  acc = 0;
  while (k < m - 2 && acc + len(k) < R) acc += len(k++);
  t = Math.min(1, (R - acc) / (len(k) || 1));
  const bx = pts[k * 2] + t * (pts[k * 2 + 2] - pts[k * 2]);
  const by = pts[k * 2 + 1] + t * (pts[k * 2 + 3] - pts[k * 2 + 1]);
  const [jx, jy] = [pts[j * 2], pts[j * 2 + 1]];
  const out = pts.slice(0, i * 2);
  const n = Math.max(2, Math.ceil(R / 0.5) * 2);
  for (let q = 0; q <= n; q++) {
    const u = q / n;
    out.push(
      (1 - u) * (1 - u) * ax + 2 * u * (1 - u) * jx + u * u * bx,
      (1 - u) * (1 - u) * ay + 2 * u * (1 - u) * jy + u * u * by,
    );
  }
  for (let q = (k + 1) * 2; q < pts.length; q++) out.push(pts[q]);
  return out;
}

/** Flat (x, y) pairs in reverse order. */
function reversePairs(pts: number[]): number[] {
  const out: number[] = [];
  for (let p = pts.length - 2; p >= 0; p -= 2) out.push(pts[p], pts[p + 1]);
  return out;
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
