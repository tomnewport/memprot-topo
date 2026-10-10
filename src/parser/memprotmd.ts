import type { Calpha } from '../types.js';
import { parseMmcifLoop } from './dssp-mmcif.js';
import type { RawChain, RawSSSegment } from './types.js';

/**
 * Residue names MD force fields use for protonation states and the like,
 * and the standard residue each stands for.
 */
const SAME_RESIDUE: Record<string, string> = {
  HSD: 'HIS',
  HSE: 'HIS',
  HSP: 'HIS',
  HID: 'HIS',
  HIE: 'HIS',
  HIP: 'HIS',
  CYX: 'CYS',
  LYN: 'LYS',
  ASH: 'ASP',
  GLH: 'GLU',
  MSE: 'MET',
};

const canonical = (name: string | undefined): string => {
  const n = (name ?? '').toUpperCase();
  return SAME_RESIDUE[n] ?? n;
};

/** Chain names for copies of a deposited chain, in the order tried. */
const SPARE_IDS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'];

const missing = (v: string | undefined) => v === undefined || v === '.' || v === '?';

interface DepositedResidue {
  name: string;
  resSeq: number;
  iCode: string;
}

interface DepositedChain {
  /** Author chain ID, as the DSSP segments are keyed. */
  chainId: string;
  residues: DepositedResidue[];
}

/**
 * The deposited entry's modelled residues, per chain in file order, from a
 * full PDB-REDO DSSP mmCIF file: `_dssp_struct_summary` lists them (by label
 * chain and number) and `_pdbx_poly_seq_scheme` gives each its author chain,
 * number and insertion code. Null if the file lacks either category.
 */
function depositedChains(dsspText: string): DepositedChain[] | null {
  const summary = parseMmcifLoop(dsspText, '_dssp_struct_summary');
  const scheme = parseMmcifLoop(dsspText, '_pdbx_poly_seq_scheme');
  if (summary.length === 0 || scheme.length === 0) return null;

  const author = new Map<string, { chainId: string; resSeq: number; iCode: string }>();
  for (const row of scheme) {
    const chainId = row['pdb_strand_id'];
    const resSeq = Number.parseInt(row['pdb_seq_num'] ?? '', 10);
    if (missing(chainId) || !Number.isFinite(resSeq)) continue;
    const ins = row['pdb_ins_code'];
    author.set(`${row['asym_id']}:${row['seq_id']}`, {
      chainId,
      resSeq,
      iCode: missing(ins) ? '' : ins,
    });
  }

  const chains: DepositedChain[] = [];
  let current: DepositedChain | null = null;
  let currentAsym = '';
  for (const row of summary) {
    const asym = row['label_asym_id'];
    const a = author.get(`${asym}:${row['label_seq_id']}`);
    if (!a) return null;
    if (!current || asym !== currentAsym) {
      current = { chainId: a.chainId, residues: [] };
      currentAsym = asym;
      chains.push(current);
    }
    current.residues.push({
      name: canonical(row['label_comp_id']),
      resSeq: a.resSeq,
      iCode: a.iCode,
    });
  }
  return chains;
}

/** Does `chain` match the model's residues from `pos`, residue for residue? */
function matchesAt(model: Calpha[], pos: number, chain: DepositedChain): boolean {
  const n = chain.residues.length;
  if (n === 0 || pos + n > model.length) return false;
  for (let i = 0; i < n; i++) {
    if (canonical(model[pos + i].resName) !== chain.residues[i].name) return false;
  }
  return true;
}

/**
 * Put a MemProtMD structure into the deposited entry's chains and author
 * numbering, so the deposited entry's DSSP (and anything else keyed on
 * author numbering) lines up with it.
 *
 * MemProtMD renumbers residues from 1 and writes every protomer on one chain
 * (or none), in the order of the biological assembly it simulated, which may
 * repeat a deposited chain (2OMF's trimer is three copies of chain A) or use
 * a few of many (3K19's trimer, from twelve). Reading the structure's
 * residues in file order, each run that matches a deposited chain's modelled
 * residues exactly (MD names such as HSD and MSE count as their standard
 * residue) becomes that chain, renumbered as deposited; the longest match
 * wins, and among equal ones the first chain not yet used. A copy of a chain
 * already used takes the first chain ID the entry doesn't have, and the DSSP
 * segments of the chain it copies.
 *
 * @param chains the structure as `parsePdb` read it.
 * @param dsspText PDB-REDO's DSSP mmCIF file for the deposited entry, in full
 *   (the trimmed `examples/*.dssp.cif` files have no per-residue records).
 * @param segments the segments `parseDsspMmcif` read from it.
 * @returns null when the file has no per-residue records or some residue
 *   doesn't fall in a matching run.
 */
export function mapToDeposited(
  chains: RawChain[],
  dsspText: string,
  segments: RawSSSegment[],
): { chains: RawChain[]; segments: RawSSSegment[] } | null {
  const deposited = depositedChains(dsspText);
  if (!deposited) return null;
  const model = chains.flatMap((c) => c.calphas);

  const used = new Set<string>();
  const taken = new Set(deposited.map((c) => c.chainId));
  const outChains: RawChain[] = [];
  const outSegments: RawSSSegment[] = [];
  let pos = 0;
  while (pos < model.length) {
    let best: DepositedChain | null = null;
    for (const chain of deposited) {
      if (!matchesAt(model, pos, chain)) continue;
      const longer = !best || chain.residues.length > best.residues.length;
      const fresher =
        best &&
        chain.residues.length === best.residues.length &&
        used.has(best.chainId) &&
        !used.has(chain.chainId);
      if (longer || fresher) best = chain;
    }
    if (!best) return null;

    let chainId = best.chainId;
    if (used.has(chainId)) {
      const spare = SPARE_IDS.find((id) => !taken.has(id));
      if (!spare) return null;
      chainId = spare;
    }
    used.add(best.chainId);
    taken.add(chainId);

    const calphas = best.residues.map(
      (r, i): Calpha => ({ ...model[pos + i], resSeq: r.resSeq, iCode: r.iCode }),
    );
    outChains.push({
      chainId,
      residues: new Set(best.residues.map((r) => `${r.resSeq}${r.iCode}`)),
      calphas,
    });
    for (const s of segments) {
      if (s.chainId === best.chainId) outSegments.push({ ...s, chainId });
    }
    pos += best.residues.length;
  }
  return { chains: outChains, segments: outSegments };
}
