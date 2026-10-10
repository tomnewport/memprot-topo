import type { LeafletPair } from '../membrane/index.js';

/** Membrane thicknesses shown beyond each leaflet by default (issue #27). */
export const Z_WINDOW_MARGIN_THICKNESSES = 1.5;
/** Fraction of the membrane's thickness that stays in view however far the window moves. */
export const Z_WINDOW_MIN_MEMBRANE_VISIBLE = 0.25;

/** The z-range (Å) the 2-D plot shows: `top` is drawn at the plot's top edge. */
export interface ZWindow {
  top: number;
  bottom: number;
}

/**
 * The vertical window of the 2-D plot (issue #27). It is `heightA` Å tall,
 * by default the membrane plus 1.5 membrane thicknesses beyond each leaflet
 * (±80 Å for a 40 Å membrane), centred on the membrane. When the protein
 * (`extent`) reaches past it, the window slides up or down to take in as much
 * of it as fits, but never so far that less than a quarter of the membrane's
 * thickness stays in view. A protein taller than the window centres it on the
 * protein, under the same limit.
 */
export function zWindow(
  bulk: LeafletPair,
  extent: { zMin: number; zMax: number },
  heightA?: number,
): ZWindow {
  const thickness = Math.max(0, bulk.upper - bulk.lower);
  const height =
    heightA !== undefined && heightA > 0
      ? heightA
      : thickness * (1 + 2 * Z_WINDOW_MARGIN_THICKNESSES);
  const mid = (bulk.upper + bulk.lower) / 2;
  let centre = mid;
  const { zMin, zMax } = extent;
  if (Number.isFinite(zMin) && Number.isFinite(zMax) && zMax >= zMin) {
    if (zMax - zMin > height) centre = (zMin + zMax) / 2;
    else if (zMax > mid + height / 2) centre = zMax - height / 2;
    else if (zMin < mid - height / 2) centre = zMin + height / 2;
  }
  // Keep at least a quarter of the membrane in view: the window's bottom may
  // rise no higher than a quarter-thickness below the upper leaflet, and its
  // top fall no lower than a quarter-thickness above the lower one.
  const keep = Math.min(thickness * Z_WINDOW_MIN_MEMBRANE_VISIBLE, height);
  const hi = bulk.upper - keep + height / 2;
  const lo = bulk.lower + keep - height / 2;
  centre = Math.min(hi, Math.max(lo, centre));
  return { top: centre + height / 2, bottom: centre - height / 2 };
}
