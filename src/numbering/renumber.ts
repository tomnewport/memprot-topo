import { parseResidueKey, type ResidueKey } from '../residue-key.js';

/**
 * A map from another residue numbering (e.g. UniProt's) to the structure's:
 * per chain ID, a residue key in the other numbering → the structure's
 * residue key.
 */
export type ResidueNumbering = Map<string, Map<ResidueKey, ResidueKey>>;

/**
 * `series` (`{ chainId: { residue: value } }`) with each residue moved from
 * the numbering `numbering` maps from to the structure's. Residues and chains
 * the map does not cover are dropped, so no value lands on a wrong residue.
 */
export function renumberSeries<T>(
  series: Record<string, Record<string | number, T>>,
  numbering: ResidueNumbering,
): Record<string, Record<string, T>> {
  const out: Record<string, Record<string, T>> = {};
  for (const [chainId, values] of Object.entries(series)) {
    const map = numbering.get(chainId);
    if (!map || !values || typeof values !== 'object') continue;
    const moved: Record<string, T> = {};
    for (const [k, v] of Object.entries(values)) {
      const key = parseResidueKey(k);
      const to = key === null ? undefined : map.get(key);
      if (to !== undefined && !(to in moved)) moved[to] = v;
    }
    out[chainId] = moved;
  }
  return out;
}
