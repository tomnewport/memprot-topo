import { mmcifCategory, parseMmcifLoops } from './mmcif-tokenizer.js';
import type { RawSSSegment } from './types.js';

export function parseDsspMmcif(content: string): RawSSSegment[] {
  const segments: RawSSSegment[] = [];
  const loops = parseMmcifLoops(content);

  // Parse helices from _struct_conf. _struct_conf can also contain TURN_P and
  // other non-helix conformations — filter on conf_type_id starting with 'HELX'.
  const confRows = mmcifCategory(loops, '_struct_conf');
  for (const row of confRows) {
    const confType = row['conf_type_id'] ?? '';
    if (!confType.startsWith('HELX')) continue;

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
