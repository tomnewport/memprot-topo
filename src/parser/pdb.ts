import type { RawChain } from './types.js';

/**
 * Parse a PDB structure file and return chain residue sets.
 *
 * Counts a residue when it has a Cα atom, regardless of whether the row is
 * ATOM or HETATM — this includes modified amino acids (MSE, SEC, etc.)
 * while excluding ligands, waters, and lipids.
 *
 * Residues are keyed by `resSeq + iCode` so insertion codes (e.g. 100A vs 100B)
 * are not collapsed.
 */
export function parsePdb(content: string): RawChain[] {
  const chainMap = new Map<string, Set<string>>();

  for (const line of content.split('\n')) {
    if (line.length < 27) continue;

    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;

    const atomName = line.slice(12, 16).trim();
    if (atomName !== 'CA') continue;

    const chainId = line[21];
    if (!chainId || chainId === ' ') continue;

    const resSeq = line.slice(22, 26).trim();
    if (!resSeq) continue;

    const iCode = line[26] === ' ' ? '' : line[26];
    const resKey = `${resSeq}${iCode}`;

    if (!chainMap.has(chainId)) chainMap.set(chainId, new Set());
    chainMap.get(chainId)!.add(resKey);
  }

  return Array.from(chainMap.entries()).map(([chainId, residues]) => ({ chainId, residues }));
}
