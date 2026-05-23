import type { Calpha } from '../types.js';
import type { RawChain } from './types.js';

interface ChainAccumulator {
  residues: Set<string>;
  calphas: Calpha[];
}

/**
 * Parse a PDB structure file and return per-chain Cα coordinates.
 *
 * Counts a residue when it has a Cα atom, regardless of whether the row is
 * ATOM or HETATM — this includes modified amino acids (MSE, SEC, etc.)
 * while excluding ligands, waters, and lipids.
 *
 * Residues are keyed by `resSeq + iCode` so insertion codes (e.g. 100A vs 100B)
 * are not collapsed. Cα order in the output preserves PDB file order.
 */
export function parsePdb(content: string): RawChain[] {
  const chainMap = new Map<string, ChainAccumulator>();

  for (const line of content.split('\n')) {
    if (line.length < 54) continue;

    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;

    const atomName = line.slice(12, 16).trim();
    if (atomName !== 'CA') continue;

    const chainId = line[21];
    if (!chainId || chainId === ' ') continue;

    const resSeqStr = line.slice(22, 26).trim();
    if (!resSeqStr) continue;
    const resSeq = Number.parseInt(resSeqStr, 10);
    if (!Number.isFinite(resSeq)) continue;

    const iCode = line[26] === ' ' ? '' : line[26];
    // Build the dedup key from the *raw* PDB string so the column 22–26 slice
    // is preserved verbatim. `${resSeq}${iCode}` would collapse e.g. " 100"
    // and "100" — they're equivalent here, but the string form is canonical.
    const resKey = `${resSeqStr}${iCode}`;

    const x = Number.parseFloat(line.slice(30, 38));
    const y = Number.parseFloat(line.slice(38, 46));
    const z = Number.parseFloat(line.slice(46, 54));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

    let acc = chainMap.get(chainId);
    if (!acc) {
      acc = { residues: new Set(), calphas: [] };
      chainMap.set(chainId, acc);
    }

    if (acc.residues.has(resKey)) continue;
    acc.residues.add(resKey);
    acc.calphas.push({ resSeq, iCode, x, y, z });
  }

  return Array.from(chainMap.entries()).map(([chainId, acc]) => ({
    chainId,
    residues: acc.residues,
    calphas: acc.calphas,
  }));
}
