/**
 * The membrane's leaflets in the 3-D view, as a fishnet: a square grid of
 * lines over each leaflet's disc that follows the leaflet's height, so the
 * membrane and its local rises and drops stay visible without hiding the
 * protein. Built once for the finished (τ = 1) view; the renderer projects it
 * each frame.
 */

/** Leaflet height (Å) at a world point, or null where there is no lipid. */
export type HeightAt = (x: number, y: number) => number | null;

export interface FishnetInput {
  /** Disc centre (world Å) and radius. */
  centre: { x: number; y: number };
  radius: number;
  bulk: { upper: number; lower: number };
  /** Leaflets next to the protein; used where there are no local heights. */
  annular: { upper: number; lower: number };
  /** World xy of the membrane-spanning samples, flat (x, y) pairs. */
  protein: ArrayLike<number>;
  /** Local leaflet heights, when a distortions file gives them. */
  local?: { upper: HeightAt; lower: HeightAt };
}

/**
 * Each leaflet's net as polylines of (ox, oy, z): position relative to the
 * disc centre and height, broken where there is no lipid (e.g. a pore).
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
/** Fraction of the radius beyond which every height eases to the bulk, so the net meets the rim. */
const RIM_FADE = 0.8;

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
  const spacing = fishnetSpacing(r);
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

  const height = (leaf: 'upper' | 'lower', x: number, y: number, rho: number, dP: number) => {
    const toRim = smoothstep((rho - RIM_FADE) / (1 - RIM_FADE));
    if (local) {
      if (toRim >= 1) return bulk[leaf];
      const h = local[leaf](x, y);
      if (h === null) return NaN;
      return h + toRim * (bulk[leaf] - h);
    }
    const toBulk = Math.max(toRim, smoothstep((dP - ANNULAR_REACH) / ANNULAR_FADE));
    return annular[leaf] + toBulk * (bulk[leaf] - annular[leaf]);
  };

  const flat = !local && annular.upper === bulk.upper && annular.lower === bulk.lower;
  // A flat net only needs splitting for depth order; a shaped one follows its heights.
  const step = flat ? spacing : spacing / 2;
  const net: Fishnet = { spacing, upper: [], lower: [] };
  const K = Math.floor((r - 1e-6) / spacing);
  for (const across of [0, 1]) {
    for (let k = -K; k <= K; k++) {
      const off = k * spacing;
      const half = Math.sqrt(r * r - off * off);
      // Points along the line: both ends on the rim, the rest on the grid.
      const along: number[] = [-half];
      for (let j = Math.ceil(-half / step + 1e-9); j * step < half - 1e-9; j++)
        along.push(j * step);
      along.push(half);
      for (const leaf of ['upper', 'lower'] as const) {
        let line: number[] = [];
        const flush = () => {
          if (line.length >= 6) net[leaf].push(Float64Array.from(line));
          line = [];
        };
        for (const a of along) {
          const ox = across ? a : off;
          const oy = across ? off : a;
          const x = centre.x + ox;
          const y = centre.y + oy;
          const rho = Math.hypot(ox, oy) / r;
          const z = flat ? bulk[leaf] : height(leaf, x, y, rho, local ? Infinity : toProtein(x, y));
          if (Number.isNaN(z)) {
            flush();
            continue;
          }
          line.push(ox, oy, z);
        }
        flush();
      }
    }
  }
  return net;
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
