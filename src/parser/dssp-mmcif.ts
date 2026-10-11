import { mmcifCategory, parseMmcifLoops } from './mmcif-tokenizer.js';
import type { BetaLadder, ResidueRef } from '../types.js';
import type { RawSSSegment } from './types.js';

export interface DsspParseOptions {
  /**
   * Draw DSSP's 3₁₀ helices (`HELX_RH_3T_P`) as helices. Off by default:
   * they are usually three or four residues of a loop or a helix cap.
   */
  helix310?: boolean;
}

/**
 * Whether a `_struct_conf.conf_type_id` is drawn as a helix (issue #79).
 * α (`HELX_RH_AL_P`, or the generic `HELX_P`) and π (`HELX_RH_PI_P`; DSSP 4
 * gives π priority inside α helices) are helices; 3₁₀ only with `helix310`.
 * Polyproline II (`HELX_LH_PP_P`), turns and anything else are coil.
 */
export function isHelixConfType(confType: string, options: DsspParseOptions = {}): boolean {
  switch (confType) {
    case 'HELX_P':
    case 'HELX_RH_AL_P':
    case 'HELX_RH_PI_P':
      return true;
    case 'HELX_RH_3T_P':
      return options.helix310 === true;
    default:
      return false;
  }
}

export function parseDsspMmcif(content: string, options: DsspParseOptions = {}): RawSSSegment[] {
  const segments: RawSSSegment[] = [];
  const loops = parseMmcifLoops(content);

  // Parse helices from _struct_conf, which also lists turns and
  // polyproline II stretches; see isHelixConfType for which rows count.
  const confRows = mmcifCategory(loops, '_struct_conf');
  for (const row of confRows) {
    if (!isHelixConfType(row['conf_type_id'] ?? '', options)) continue;

    const chainId = row['beg_auth_asym_id'];
    const startStr = row['beg_auth_seq_id'];
    const endStr = row['end_auth_seq_id'];

    if (!chainId || chainId === '.' || chainId === '?') continue;
    if (!startStr || startStr === '.' || startStr === '?') continue;
    if (!endStr || endStr === '.' || endStr === '?') continue;

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) continue;

    segments.push({ chainId, start, end, type: 'helix' });
  }

  // Parse strands from _struct_sheet_range
  const sheetRows = mmcifCategory(loops, '_struct_sheet_range');
  for (const row of sheetRows) {
    const chainId = row['beg_auth_asym_id'];
    const startStr = row['beg_auth_seq_id'];
    const endStr = row['end_auth_seq_id'];

    if (!chainId || chainId === '.' || chainId === '?') continue;
    if (!startStr || startStr === '.' || startStr === '?') continue;
    if (!endStr || endStr === '.' || endStr === '?') continue;

    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) continue;

    segments.push({ chainId, start, end, type: 'strand' });
  }

  return segments;
}

/** A residue from a ladder row's `<end>_<side>` auth columns, or null if any is missing. */
function ladderResidue(
  row: Record<string, string>,
  end: 'beg' | 'end',
  side: 1 | 2,
): ResidueRef | null {
  const chainId = row[`${end}_${side}_auth_asym_id`];
  const seq = parseInt(row[`${end}_${side}_auth_seq_id`] ?? '', 10);
  if (!chainId || chainId === '.' || chainId === '?' || isNaN(seq)) return null;
  const ins = row[`pdbx_${end}_${side}_PDB_ins_code`];
  return { chainId, resSeq: seq, iCode: !ins || ins === '?' || ins === '.' ? '' : ins };
}

/**
 * DSSP's β-ladders (`_dssp_struct_ladder`), in author numbering: the
 * hydrogen-bonded strand pairs DSSP found (#79). Empty when the file has no
 * ladder records (PDB-REDO's DSSP mmCIF has them; deposited mmCIF does not).
 */
export function parseDsspLadders(content: string): BetaLadder[] {
  const ladders: BetaLadder[] = [];
  for (const row of mmcifCategory(parseMmcifLoops(content), '_dssp_struct_ladder')) {
    const type = row['type'];
    if (type !== 'parallel' && type !== 'anti-parallel') continue;
    const a0 = ladderResidue(row, 'beg', 1);
    const a1 = ladderResidue(row, 'end', 1);
    const b0 = ladderResidue(row, 'beg', 2);
    const b1 = ladderResidue(row, 'end', 2);
    if (!a0 || !a1 || !b0 || !b1) continue;
    ladders.push({
      id: row['id'] ?? String(ladders.length),
      type: type === 'parallel' ? 'parallel' : 'antiparallel',
      a: { start: a0, end: a1 },
      b: { start: b0, end: b1 },
    });
  }
  return ladders;
}
