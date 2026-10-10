import type { Calpha, ChainData } from '../types.js';
import { DEFAULT_BULK, membraneCore } from '../membrane/model.js';
import type { LeafletPair } from '../membrane/types.js';

export interface TransmembraneOptions {
  /**
   * Edges (Å, membrane frame) of the membrane core a chain must reach on both
   * sides to count as transmembrane: one Cα at or above `upper` and one at or
   * below `lower`. Usually `membraneCore(membrane.bulk)`. Defaults to the
   * core of {@link DEFAULT_BULK}, ±12 Å.
   */
  core?: LeafletPair;
  /**
   * A symmetric core, ±`threshold` Å about z = 0, for callers without a
   * membrane. Ignored when `core` is given.
   */
  threshold?: number;
}

/**
 * A chain is transmembrane if at least one of its Cα reaches the upper edge
 * of the membrane core and at least one reaches the lower edge (in the
 * membrane frame, where z = 0 is the bulk midplane).
 */
export function isTransmembrane(calphas: Calpha[], options: TransmembraneOptions = {}): boolean {
  const core =
    options.core ??
    (options.threshold !== undefined
      ? { upper: options.threshold, lower: -options.threshold }
      : membraneCore(DEFAULT_BULK));
  let above = false;
  let below = false;
  for (const ca of calphas) {
    if (ca.z >= core.upper) above = true;
    else if (ca.z <= core.lower) below = true;
    if (above && below) return true;
  }
  return false;
}

export interface SelectChainsOptions extends TransmembraneOptions {
  /** Maximum number of chains to return. Default: 1 (one representative chain). */
  max?: number;
  /**
   * If true and no chains pass the transmembrane test, fall back to returning
   * the largest chains regardless. Default: true.
   */
  fallbackToLargest?: boolean;
}

export interface ChainSelectionResult {
  /** Chains chosen for display, ordered largest-first. */
  selected: ChainData[];
  /**
   * Chains that failed the transmembrane test (Cα did not reach both sides
   * of the bilayer). Distinct from "everything that wasn't selected" — TM
   * chains dropped because of the `max` cap do not appear here.
   */
  nonTransmembrane: ChainData[];
  /** True if no TM chains were found and we fell back to the largest chain. */
  fellBackToLargest: boolean;
}

/**
 * Pick representative transmembrane chains for display.
 *
 * Sorts by residue count (largest first), filters to chains that cross the
 * bilayer, and returns up to `max` of them. For homo-oligomers (OmpF trimer,
 * α-hemolysin heptamer) this yields one representative chain; for proteins
 * with a TM chain + soluble fusion partner (e.g. A2A + thermostabilising
 * apocytochrome in 5G53) this excludes the soluble chain.
 */
export function selectTransmembraneChains(
  chains: ChainData[],
  options: SelectChainsOptions = {},
): ChainSelectionResult {
  const max = options.max ?? 1;
  const fallback = options.fallbackToLargest ?? true;

  const byBiggest = [...chains].sort((a, b) => b.residueCount - a.residueCount);
  const tmChains = byBiggest.filter((c) => isTransmembrane(c.calphas, options));
  const tmIds = new Set(tmChains.map((c) => c.chainId));
  const nonTransmembrane = chains.filter((c) => !tmIds.has(c.chainId));

  let fellBackToLargest = false;
  let pool = tmChains;
  if (pool.length === 0 && fallback) {
    pool = byBiggest;
    fellBackToLargest = true;
  }

  const selected = pool.slice(0, max);

  return { selected, nonTransmembrane, fellBackToLargest };
}
