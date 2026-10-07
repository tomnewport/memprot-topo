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

/** Local leaflet heights under one residue, at its x in the diagram. */
export interface ProfileAnchor {
  /** Diagram x (Å). */
  x: number;
  /** Local surface height (Å), or null where the surface isn't known. */
  upper: number | null;
  lower: number | null;
}

export interface ProfileOptions {
  /** Diagram x extent of the protein (Å). */
  x0: number;
  x1: number;
  bulk: LeafletPair;
  annular: LeafletPair;
  /** Per-residue local heights; without any, the middle stays annular. */
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
 * Gaussian-weighted (Nadaraya–Watson) average of the anchors' heights at x;
 * null if no anchor has a height for this leaflet. Weights are taken
 * relative to the nearest anchor, so far from every anchor the result
 * settles on the nearest ones rather than underflowing.
 */
function localAt(
  x: number,
  xs: Float64Array,
  vs: Float64Array,
  inv2s2: number,
  window: number,
): number | null {
  const n = xs.length;
  if (n === 0) return null;
  // xs is sorted: find the first anchor at or right of x.
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  const dRight = lo < n ? xs[lo] - x : Infinity;
  const dLeft = lo > 0 ? x - xs[lo - 1] : Infinity;
  const dMin = Math.min(dLeft, dRight);
  // Anchors further than dMin + window weigh < e^-8 of the nearest one.
  const reach = dMin + window;
  let wSum = 0;
  let vSum = 0;
  for (let i = lo - 1; i >= 0 && x - xs[i] <= reach; i--) {
    const d = x - xs[i];
    const w = Math.exp(-(d * d - dMin * dMin) * inv2s2);
    wSum += w;
    vSum += w * vs[i];
  }
  for (let i = lo; i < n && xs[i] - x <= reach; i++) {
    const d = xs[i] - x;
    const w = Math.exp(-(d * d - dMin * dMin) * inv2s2);
    wSum += w;
    vSum += w * vs[i];
  }
  return vSum / wSum;
}

/**
 * The membrane drawn behind a diagram: the upper and lower leaflet heights
 * from {@link MEMBRANE_OVERHANG_PX} before the protein to as far past it.
 * Each end shows the bulk positions, switches smoothly to the annular ones,
 * then to the local surface under the residues (smoothed along x); without
 * local heights the middle stays annular. Every switch is a smoothstep and
 * the local heights are Gaussian-smoothed, so rises and drops are smooth.
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

  const series = (leaf: keyof LeafletPair) => {
    const pts = (opts.anchors ?? [])
      .filter((a) => a[leaf] !== null && Number.isFinite(a[leaf]) && Number.isFinite(a.x))
      .sort((a, b) => a.x - b.x);
    return {
      xs: Float64Array.from(pts, (a) => a.x),
      vs: Float64Array.from(pts, (a) => a[leaf] as number),
    };
  };
  const up = series('upper');
  const low = series('lower');
  const inv2s2 = 1 / (2 * sigmaA * sigmaA);
  const window = 4 * sigmaA;

  const n = Math.max(2, Math.ceil((end - start) / stepA) + 1);
  const out: MembraneProfile = { x: [], upper: [], lower: [] };
  for (let i = 0; i < n; i++) {
    const x = i === n - 1 ? end : start + i * stepA;
    // Distance in from the nearer end of the membrane.
    const e = Math.min(x - start, end - x);
    const sAnnular = smoothstep((e - bulkA) / toAnnularA);
    const sLocal = smoothstep((e - bulkA - toAnnularA) / toLocalA);
    for (const [leaf, s] of [
      ['upper', up],
      ['lower', low],
    ] as const) {
      const edge = bulk[leaf] + sAnnular * (annular[leaf] - bulk[leaf]);
      const local = localAt(x, s.xs, s.vs, inv2s2, window) ?? annular[leaf];
      out[leaf].push(edge + sLocal * (local - edge));
    }
    out.x.push(x);
  }
  return out;
}
