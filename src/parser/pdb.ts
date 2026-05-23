import type { CAResidue, RawChain } from './types.js';

/**
 * Parse a PDB structure file and return per-chain Cα residues.
 *
 * Counts a residue when it has a Cα atom, regardless of whether the row is
 * ATOM or HETATM — this includes modified amino acids (MSE, SEC, etc.)
 * while excluding ligands, waters, and lipids.
 *
 * Residues are keyed by `resSeq + iCode` so insertion codes (e.g. 100A vs 100B)
 * are not collapsed. Coordinates are stored in source-file order.
 */
export function parsePdb(content: string): RawChain[] {
  const residueSets = new Map<string, Set<string>>();
  const caLists = new Map<string, CAResidue[]>();

  for (const line of content.split('\n')) {
    if (line.length < 54) continue;

    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;

    const atomName = line.slice(12, 16).trim();
    if (atomName !== 'CA') continue;

    // Some pipelines (notably MemProtMD's back-mapped at.pdb) strip the chain ID
    // column. Treat a blank chain as 'A', the default for single-chain entries.
    const chainId = line[21] === ' ' || !line[21] ? 'A' : line[21];

    const resSeqStr = line.slice(22, 26).trim();
    if (!resSeqStr) continue;
    const resSeq = parseInt(resSeqStr, 10);
    if (Number.isNaN(resSeq)) continue;

    const iCode = line[26] === ' ' ? '' : line[26];
    const resKey = `${resSeqStr}${iCode}`;

    const set = residueSets.get(chainId) ?? new Set<string>();
    if (set.has(resKey)) continue; // first Cα row wins on duplicates
    set.add(resKey);
    residueSets.set(chainId, set);

    const x = parseFloat(line.slice(30, 38));
    const y = parseFloat(line.slice(38, 46));
    const z = parseFloat(line.slice(46, 54));
    if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(z)) continue;

    const list = caLists.get(chainId) ?? [];
    list.push({ resSeq, iCode, x, y, z });
    caLists.set(chainId, list);
  }

  return Array.from(residueSets.entries()).map(([chainId, residues]) => ({
    chainId,
    residues,
    caResidues: caLists.get(chainId) ?? [],
  }));
}
