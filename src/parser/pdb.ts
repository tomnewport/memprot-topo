import type { Calpha } from '../types.js';
import type { BackboneChain, BackboneResidue, RawChain } from './types.js';

/** Names tried, in order, for a chain whose chain column is blank. */
const BLANK_CHAIN_IDS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

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
 *
 * A blank chain column (as in MemProtMD's files) is a chain too, named by the
 * first letter from A that no other chain in the file uses.
 */
export function parsePdb(content: string): RawChain[] {
  const chainMap = new Map<string, ChainAccumulator>();

  for (const line of content.split('\n')) {
    if (line.length < 54) continue;

    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;

    // The atom-name columns distinguish a protein alpha carbon (` CA `)
    // from a calcium ion (`CA  `), even though trimming makes both `CA`.
    if (line.slice(12, 16) !== ' CA ') continue;

    const chainId = line[21];
    if (!chainId) continue;

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
    const resName = line.slice(17, 20).trim();
    const ca: Calpha = resName ? { resSeq, iCode, resName, x, y, z } : { resSeq, iCode, x, y, z };
    const occupancy = Number.parseFloat(line.slice(54, 60));
    const tempFactor = Number.parseFloat(line.slice(60, 66));
    if (Number.isFinite(occupancy)) ca.occupancy = occupancy;
    if (Number.isFinite(tempFactor)) ca.tempFactor = tempFactor;
    acc.calphas.push(ca);
  }

  const blankId = BLANK_CHAIN_IDS.find((id) => !chainMap.has(id)) ?? ' ';
  return Array.from(chainMap.entries()).map(([chainId, acc]) => ({
    chainId: chainId === ' ' ? blankId : chainId,
    residues: acc.residues,
    calphas: acc.calphas,
  }));
}

type Atom = { x: number; y: number; z: number };

/**
 * Parse a PDB structure file's protein backbone (N, Cα, C, O) per residue,
 * for computing secondary structure on the coordinates (`computeDssp`).
 * Chains, residue keys and blank chain names follow {@link parsePdb}; only
 * residues with a Cα are kept, and the first copy of each atom (altloc A).
 * A residue's carbonyl oxygen is `O`, or the C-terminal `OT1` / `O1` / `OC1`.
 * Only the first MODEL is read.
 */
export function parsePdbBackbone(content: string): BackboneChain[] {
  const chainMap = new Map<string, Map<string, BackboneResidue & { ot?: Atom }>>();
  for (const line of content.split('\n')) {
    if (line.startsWith('ENDMDL')) break;
    if (line.length < 54) continue;
    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;
    const name = line.slice(12, 16);
    const which =
      name === ' N  '
        ? 'n'
        : name === ' CA '
          ? 'ca'
          : name === ' C  '
            ? 'c'
            : name === ' O  '
              ? 'o'
              : name === ' OT1' || name === ' O1 ' || name === ' OC1'
                ? 'ot'
                : null;
    if (!which) continue;
    const chainId = line[21];
    const resSeqStr = line.slice(22, 26).trim();
    const resSeq = Number.parseInt(resSeqStr, 10);
    if (!chainId || !Number.isFinite(resSeq)) continue;
    const iCode = line[26] === ' ' ? '' : line[26];
    const x = Number.parseFloat(line.slice(30, 38));
    const y = Number.parseFloat(line.slice(38, 46));
    const z = Number.parseFloat(line.slice(46, 54));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

    let residues = chainMap.get(chainId);
    if (!residues) {
      residues = new Map();
      chainMap.set(chainId, residues);
    }
    const key = `${resSeqStr}${iCode}`;
    let r = residues.get(key);
    if (!r) {
      r = { resSeq, iCode, resName: line.slice(17, 20).trim() };
      residues.set(key, r);
    }
    if (r[which] === undefined) r[which] = { x, y, z };
  }

  const blankId = BLANK_CHAIN_IDS.find((id) => !chainMap.has(id)) ?? ' ';
  return Array.from(chainMap.entries()).map(([chainId, residues]) => ({
    chainId: chainId === ' ' ? blankId : chainId,
    residues: [...residues.values()]
      .filter((r) => r.ca)
      .map(({ ot, ...r }) => (r.o || !ot ? r : { ...r, o: ot })),
  }));
}
