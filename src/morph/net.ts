/**
 * The membrane's leaflets in the 3-D view, as a fishnet: a square grid of
 * lines over each leaflet's disc that follows the leaflet's height, so the
 * membrane and its local rises and drops stay visible without hiding the
 * protein. Built once for the finished (τ = 1) view; the renderer projects it
 * each frame.
 */

/**
 * Leaflet height (Å) at a world point, averaged over `radius` Å, or null
 * where there is no lipid that close.
 */
export type HeightAt = (x: number, y: number, radius: number) => number | null;

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
  /** Grid spacing (Å). Default {@link fishnetSpacing} of the radius. */
  spacing?: number;
  /** Width (Å) of the flat bulk ring at the rim. Default 0. */
  margin?: number;
}

/**
 * Each leaflet's net as polylines of (ox, oy, z): position relative to the
 * disc centre and height, broken over pores in the drawn protein.
 */
export interface Fishnet {
  /** Grid spacing (Å). */
  spacing: number;
  upper: Float64Array[];
  lower: Float64Array[];
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
/** Over-relaxation, tolerance (Å) and iteration limit of the gap fill. */
const FILL_OMEGA = 1.8;
const FILL_TOLERANCE = 1e-3;
const FILL_MAX_ITERATIONS = 2000;

/** Neighbour slot values: none, or the line's end on the rim. */
const NONE = -1;
const RIM = -2;
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
  const { centre, radius: r, bulk, annular, protein, local } = input;
  const spacing = input.spacing ?? fishnetSpacing(r);
  const np = Math.floor(protein.length / 2);

  /** Distance (Å) in xy from a world point to the nearest protein sample. */
  const toProtein = (x: number, y: number): number => {
    let best = Infinity;
    for (let i = 0; i < np; i++) {
      const dx = protein[i * 2] - x;
      const dy = protein[i * 2 + 1] - y;
      const d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  };

  // Samples can only surround a point inside their convex hull.
  const hull = convexHull(protein, np);
  const inHull = (x: number, y: number): boolean => {
    if (hull.length < 6) return false;
    for (let i = 0; i < hull.length; i += 2) {
      const [ax, ay] = [hull[i], hull[i + 1]];
      const j = (i + 2) % hull.length;
      if ((hull[j] - ax) * (y - ay) - (hull[j + 1] - ay) * (x - ax) <= 0) return false;
    }
    return true;
  };

  /** Whether the membrane-spanning samples surround (x, y) on every side. */
  const enclosed = (x: number, y: number): boolean => {
    if (!inHull(x, y)) return false;
    const all = (1 << ENCLOSING_SECTORS) - 1;
    let seen = 0;
    for (let i = 0; i < np; i++) {
      const dx = protein[i * 2] - x;
      const dy = protein[i * 2 + 1] - y;
      if (dx === 0 && dy === 0) continue;
      const t = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
      seen |= 1 << Math.min(ENCLOSING_SECTORS - 1, Math.floor(t * ENCLOSING_SECTORS));
      if (seen === all) return true;
    }
    return false;
  };

  const inner = r - Math.min(r, input.margin ?? 0);
  const toRim = (ox: number, oy: number) =>
    inner > 0 ? smoothstep((Math.hypot(ox, oy) / inner - RIM_FADE) / (1 - RIM_FADE)) : 1;

  /** Heights without local ones: annular next to the protein, easing to the bulk. */
  const plain = (leaf: 'upper' | 'lower', ox: number, oy: number) => {
    const dP = toProtein(centre.x + ox, centre.y + oy);
    const toBulk = Math.max(toRim(ox, oy), smoothstep((dP - ANNULAR_REACH) / ANNULAR_FADE));
    return annular[leaf] + toBulk * (bulk[leaf] - annular[leaf]);
  };

  const flat = !local && annular.upper === bulk.upper && annular.lower === bulk.lower;
  // A flat net only needs splitting for depth order; a shaped one follows its
  // heights, with a point between crossings unless that would put points
  // under MIN_STEP apart.
  const per = flat || spacing < 2 * MIN_STEP ? 1 : 2;
  const step = spacing / per;
  const K = Math.floor((r - 1e-6) / spacing);
  // Each line as (ox, oy) pairs: both ends on the rim, the rest on a lattice
  // of `step`, so crossing lines share their points.
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

  const field = local ? localField(local) : null;
  const net: Fishnet = { spacing, upper: [], lower: [] };
  for (const leaf of ['upper', 'lower'] as const) {
    const z = field?.(leaf);
    for (const pts of lines) {
      let line: number[] = [];
      const flush = () => {
        if (line.length >= 6) net[leaf].push(Float64Array.from(line));
        line = [];
      };
      for (let p = 0; p < pts.length; p += 2) {
        const [ox, oy] = [pts[p], pts[p + 1]];
        const onRim = p === 0 || p === pts.length - 2;
        const h = flat || onRim ? bulk[leaf] : z ? z(ox, oy) : plain(leaf, ox, oy);
        if (Number.isNaN(h)) {
          flush();
          continue;
        }
        line.push(ox, oy, h);
      }
      flush();
    }
  }
  return net;

  /**
   * Heights from the local surfaces at the lines' inner points. Where a
   * point has no lipid near it, it is left open (NaN) if the drawn protein
   * surrounds it (a pore). Elsewhere the lipid is missing because of protein
   * the view doesn't draw (other subunits), the drawn protein's own
   * footprint, or the file's edge; there the net is filled in as a stretched
   * membrane would be, each point the mean of its neighbours along the lines,
   * from the lipid around and the bulk at the rim, so it is neither torn nor
   * stepped.
   */
  function localField(
    surfaces: NonNullable<FishnetInput['local']>,
  ): (leaf: 'upper' | 'lower') => (ox: number, oy: number) => number {
    const M = Math.ceil(r / step) + 1;
    const W = 2 * M + 1;
    const slot = (ox: number, oy: number) =>
      (Math.round(ox / step) + M) * W + Math.round(oy / step) + M;
    // The lattice points on the lines, and each one's neighbours along them.
    const nodeAt = new Int32Array(W * W).fill(NONE);
    const ox: number[] = [];
    const oy: number[] = [];
    for (const pts of lines) {
      for (let p = 2; p < pts.length - 2; p += 2) {
        const s = slot(pts[p], pts[p + 1]);
        if (nodeAt[s] !== NONE) continue;
        nodeAt[s] = ox.length;
        ox.push(pts[p]);
        oy.push(pts[p + 1]);
      }
    }
    const n = ox.length;
    const nbr = new Int32Array(n * 4).fill(NONE);
    for (let a = 0; a < n; a++) {
      const i = Math.round(ox[a] / step);
      const j = Math.round(oy[a] / step);
      // Lines run along y where i, and along x where j, is a multiple of `per`.
      const steps = [
        [0, -1, i],
        [0, 1, i],
        [-1, 0, j],
        [1, 0, j],
      ];
      steps.forEach(([di, dj, on], q) => {
        if (on % per !== 0) return;
        const b = nodeAt[(i + di + M) * W + j + dj + M];
        nbr[a * 4 + q] = b === NONE ? RIM : b;
      });
    }
    const poreRadius = Math.min(PORE_RADIUS, surfaces.radius);
    const enclosedAt = new Int8Array(n).fill(-1);
    const isEnclosed = (a: number) => {
      if (enclosedAt[a] < 0) enclosedAt[a] = enclosed(centre.x + ox[a], centre.y + oy[a]) ? 1 : 0;
      return enclosedAt[a] === 1;
    };

    return (leaf) => {
      const at = surfaces[leaf];
      const value = new Float64Array(n);
      const state = new Uint8Array(n);
      const queue: number[] = [];
      for (let a = 0; a < n; a++) {
        const x = centre.x + ox[a];
        const y = centre.y + oy[a];
        const h = at(x, y, surfaces.radius);
        const noLipid =
          h === null ||
          (poreRadius < surfaces.radius && inHull(x, y) && at(x, y, poreRadius) === null);
        if (noLipid && isEnclosed(a)) {
          state[a] = PORE;
          continue;
        }
        if (h === null) {
          state[a] = GAP;
          value[a] = NaN;
        } else {
          state[a] = KNOWN;
          value[a] = h;
          queue.push(a);
        }
      }
      // Start each gap point from the nearest lipid along the lines (or the
      // plain heights where it reaches none), then relax.
      for (let q = 0; q < queue.length; q++) {
        for (let k = 0; k < 4; k++) {
          const b = nbr[queue[q] * 4 + k];
          if (b >= 0 && state[b] === GAP && Number.isNaN(value[b])) {
            value[b] = value[queue[q]];
            queue.push(b);
          }
        }
      }
      const gaps: number[] = [];
      for (let a = 0; a < n; a++) {
        if (state[a] !== GAP) continue;
        gaps.push(a);
        if (Number.isNaN(value[a])) value[a] = plain(leaf, ox[a], oy[a]);
      }
      for (let it = 0; it < FILL_MAX_ITERATIONS && gaps.length; it++) {
        let change = 0;
        for (const a of gaps) {
          let sum = 0;
          let count = 0;
          for (let k = 0; k < 4; k++) {
            const b = nbr[a * 4 + k];
            if (b === RIM) sum += bulk[leaf];
            else if (b >= 0 && state[b] !== PORE) sum += value[b];
            else continue;
            count++;
          }
          if (!count) continue;
          const d = FILL_OMEGA * (sum / count - value[a]);
          value[a] += d;
          change = Math.max(change, Math.abs(d));
        }
        if (change < FILL_TOLERANCE) break;
      }
      return (x, y) => {
        const a = nodeAt[slot(x, y)];
        if (state[a] === PORE) return NaN;
        return value[a] + toRim(x, y) * (bulk[leaf] - value[a]);
      };
    };
  }
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
