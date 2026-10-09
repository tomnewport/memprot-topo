import type { LeafletPair } from './types.js';

/**
 * Widths of the zones at each end of the diagram's membrane, in diagram
 * units (SVG px at the drawing's own scale) so they keep their on-screen
 * size whatever the Å-to-px scale. From the outer end inwards: bulk, a
 * smooth switch to annular, a smooth switch to the local surface. The
 * membrane runs this far past the protein at each end.
 */
export const MEMBRANE_EDGE_PX = {
  bulk: 10,
  toAnnular: 10,
  toLocal: 10,
};

/** Total membrane overhang past the protein at each end (diagram units). */
export const MEMBRANE_OVERHANG_PX =
  MEMBRANE_EDGE_PX.bulk + MEMBRANE_EDGE_PX.toAnnular + MEMBRANE_EDGE_PX.toLocal;

/**
 * How far (Å) the protein's hold on the membrane reaches in the 2-D band: in
 * full up to `full`, fading (smoothstep) to nothing at `none`. The membrane
 * away from the protein relaxes from the local surface to the annular
 * leaflets, and away from the transmembrane segments from those to the bulk.
 * - `local`: the local surface applies under residues within this distance
 *   of the bilayer (0 inside it).
 * - `annular`: the annular leaflets apply under residues within this
 *   distance, along the membrane plane, of the transmembrane segments.
 */
export const MEMBRANE_REACH_A = {
  local: { full: 10, none: 30 },
  annular: { full: 10, none: 30 },
} as const;

/** 1 up to `full`, smoothly down to 0 at `none` (Å). */
export function reachWeight(distance: number, reach: { full: number; none: number }): number {
  if (Number.isNaN(distance)) return 0;
  if (distance <= reach.full) return 1;
  return 1 - smoothstep((distance - reach.full) / (reach.none - reach.full));
}

/** Leaflet heights under one residue, at its x in the diagram. */
export interface ProfileAnchor {
  /** Diagram x (Å). */
  x: number;
  /** Local surface height (Å), or null where the surface isn't known. */
  upper: number | null;
  lower: number | null;
  /**
   * How much the annular leaflets apply here rather than the bulk, 0–1
   * (see {@link MEMBRANE_REACH_A}). Default 1.
   */
  annularWeight?: number;
  /**
   * How much the local surface applies here rather than the annular-to-bulk
   * leaflets, 0–1. Default 1.
   */
  localWeight?: number;
}

export interface ProfileOptions {
  /** Diagram x extent of the protein (Å). */
  x0: number;
  x1: number;
  bulk: LeafletPair;
  annular: LeafletPair;
  /** Per-residue heights and weights; without any, the middle stays annular. */
  anchors?: ProfileAnchor[];
  /** Diagram units per Å along x. */
  pxPerA: number;
  /** Sample spacing (diagram units). Default 2. */
  stepPx?: number;
  /** σ (diagram units) of the Gaussian that smooths the local heights along x. Default 12. */
  smoothPx?: number;
}

/** Upper and lower leaflet z sampled along the diagram x. */
export interface MembraneProfile {
  x: number[];
  upper: number[];
  lower: number[];
}

/** 0 → 1 over t ∈ [0, 1] with zero slope at both ends. */
function smoothstep(t: number): number {
  const c = t <= 0 ? 0 : t >= 1 ? 1 : t;
  return c * c * (3 - 2 * c);
}

/**
 * Gaussian-weighted (Nadaraya–Watson) average of the anchors' heights at x,
 * each also weighted by its own `ws` (how much the local surface applies
 * under it); null if no anchor has a height for this leaflet. Weights are
 * taken relative to the nearest anchor, so far from every anchor the result
 * settles on the nearest ones rather than underflowing.
 */
function localAt(
  x: number,
  xs: Float64Array,
  vs: Float64Array,
  ws: Float64Array,
  inv2s2: number,
  window: number,
): number | null {
  const n = xs.length;
  if (n === 0) return null;
  // xs is sorted: find the first anchor at or right of x.
  const lo = firstAtOrAfter(xs, x);
  const dRight = lo < n ? xs[lo] - x : Infinity;
  const dLeft = lo > 0 ? x - xs[lo - 1] : Infinity;
  const dMin = Math.min(dLeft, dRight);
  // Anchors further than dMin + window weigh < e^-8 of the nearest one.
  const reach = dMin + window;
  let wSum = 0;
  let vSum = 0;
  for (let i = lo - 1; i >= 0 && x - xs[i] <= reach; i--) {
    const d = x - xs[i];
    const w = ws[i] * Math.exp(-(d * d - dMin * dMin) * inv2s2);
    wSum += w;
    vSum += w * vs[i];
  }
  for (let i = lo; i < n && xs[i] - x <= reach; i++) {
    const d = xs[i] - x;
    const w = ws[i] * Math.exp(-(d * d - dMin * dMin) * inv2s2);
    wSum += w;
    vSum += w * vs[i];
  }
  return wSum > 0 ? vSum / wSum : null;
}

/** Index of the first entry of the sorted `xs` at or right of x. */
function firstAtOrAfter(xs: Float64Array, x: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The protein's weight (0–1) at each sample x: its closest approach there,
 * the largest weight among anchors within ±`reach` of x (clamped to the
 * protein's extent), then Gaussian-smoothed along x. Where no anchor is that
 * close (a chain break, or coil at a chain end, which have no x of their
 * own) the nearest anchors stand in. Null without anchors.
 */
function weightSeries(
  samples: number[],
  x0: number,
  x1: number,
  xs: Float64Array,
  ws: Float64Array,
  reach: number,
  sigma: number,
): Float64Array | null {
  const m = xs.length;
  if (m === 0) return null;
  const n = samples.length;
  const nearest = new Float64Array(n);
  for (let j = 0; j < n; j++) {
    const x = Math.min(x1, Math.max(x0, samples[j]));
    const at = firstAtOrAfter(xs, x);
    const dMin = Math.min(at < m ? xs[at] - x : Infinity, at > 0 ? x - xs[at - 1] : Infinity);
    const r = Math.max(reach, dMin);
    let w = 0;
    for (let k = at - 1; k >= 0 && x - xs[k] <= r; k--) if (ws[k] > w) w = ws[k];
    for (let k = at; k < m && xs[k] - x <= r; k++) if (ws[k] > w) w = ws[k];
    nearest[j] = w;
  }
  const out = new Float64Array(n);
  const inv2s2 = 1 / (2 * sigma * sigma);
  for (let j = 0; j < n; j++) {
    let wSum = 0;
    let vSum = 0;
    for (let k = j; k >= 0 && samples[j] - samples[k] <= 4 * sigma; k--) {
      const g = Math.exp(-((samples[j] - samples[k]) ** 2) * inv2s2);
      wSum += g;
      vSum += g * nearest[k];
    }
    for (let k = j + 1; k < n && samples[k] - samples[j] <= 4 * sigma; k++) {
      const g = Math.exp(-((samples[k] - samples[j]) ** 2) * inv2s2);
      wSum += g;
      vSum += g * nearest[k];
    }
    out[j] = vSum / wSum;
  }
  return out;
}

/**
 * The membrane drawn behind a diagram: the upper and lower leaflet heights
 * from {@link MEMBRANE_OVERHANG_PX} before the protein to as far past it.
 * Along the protein the band sits between the bulk and annular leaflets by
 * the annular weight there, and between that and the local surface (the
 * heights under the residues near the bilayer, weighted by how near and
 * Gaussian-smoothed along x) by the local weight. Each weight is the
 * protein's closest approach at that x (the largest among the residues
 * within σ, or the nearest residues where none is), smoothed with the same
 * Gaussian. Each end shows the
 * bulk positions, switches smoothly to the annular part, then to the full
 * heights. Without anchors the middle stays annular. Every switch is a
 * smoothstep, so rises and drops are smooth.
 */
export function membraneProfile(opts: ProfileOptions): MembraneProfile {
  const { bulk, annular, pxPerA } = opts;
  const stepA = (opts.stepPx ?? 2) / pxPerA;
  const sigmaA = (opts.smoothPx ?? 12) / pxPerA;
  const bulkA = MEMBRANE_EDGE_PX.bulk / pxPerA;
  const toAnnularA = MEMBRANE_EDGE_PX.toAnnular / pxPerA;
  const toLocalA = MEMBRANE_EDGE_PX.toLocal / pxPerA;
  const overhang = MEMBRANE_OVERHANG_PX / pxPerA;
  const start = opts.x0 - overhang;
  const end = opts.x1 + overhang;

  const n = Math.max(2, Math.ceil((end - start) / stepA) + 1);
  const samples = Array.from({ length: n }, (_, i) => (i === n - 1 ? end : start + i * stepA));

  const anchors = (opts.anchors ?? [])
    .filter((a) => Number.isFinite(a.x))
    .sort((a, b) => a.x - b.x);
  const weight = (w: number | undefined) =>
    w === undefined ? 1 : Number.isFinite(w) ? Math.min(1, Math.max(0, w)) : 0;
  const xs = Float64Array.from(anchors, (a) => a.x);
  const localWs = Float64Array.from(anchors, (a) => weight(a.localWeight));
  const annularW = weightSeries(
    samples,
    opts.x0,
    opts.x1,
    xs,
    Float64Array.from(anchors, (a) => weight(a.annularWeight)),
    sigmaA,
    sigmaA,
  );
  const localW = weightSeries(samples, opts.x0, opts.x1, xs, localWs, sigmaA, sigmaA);

  // Only residues near the bilayer say which local height is drawn.
  const series = (leaf: keyof LeafletPair) => {
    const pts = anchors
      .map((a, i) => ({ x: a.x, v: a[leaf], w: localWs[i] }))
      .filter((p) => p.v !== null && Number.isFinite(p.v) && p.w > 0);
    return {
      xs: Float64Array.from(pts, (p) => p.x),
      vs: Float64Array.from(pts, (p) => p.v as number),
      ws: Float64Array.from(pts, (p) => p.w),
    };
  };
  const up = series('upper');
  const low = series('lower');
  const inv2s2 = 1 / (2 * sigmaA * sigmaA);
  const window = 4 * sigmaA;

  const out: MembraneProfile = { x: [], upper: [], lower: [] };
  for (let i = 0; i < n; i++) {
    const x = samples[i];
    // Distance in from the nearer end of the membrane.
    const e = Math.min(x - start, end - x);
    const sAnnular = smoothstep((e - bulkA) / toAnnularA);
    const sLocal = smoothstep((e - bulkA - toAnnularA) / toLocalA);
    const a = annularW ? annularW[i] : 1;
    const l = localW ? localW[i] : 1;
    for (const [leaf, s] of [
      ['upper', up],
      ['lower', low],
    ] as const) {
      const base = bulk[leaf] + a * (annular[leaf] - bulk[leaf]);
      const local = localAt(x, s.xs, s.vs, s.ws, inv2s2, window);
      const full = local === null ? base : base + l * (local - base);
      const edge = bulk[leaf] + sAnnular * (base - bulk[leaf]);
      out[leaf].push(edge + sLocal * (full - edge));
    }
    out.x.push(x);
  }
  return out;
}
