import type { RawSSSegment } from './types.js';

/**
 * Tokenise a single mmcif data line into individual tokens.
 * Handles single-quoted, double-quoted, and bare tokens.
 */
function tokeniseLine(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    // Skip whitespace
    while (i < line.length && /\s/.test(line[i])) i++;
    if (i >= line.length) break;

    const ch = line[i];
    if (ch === "'") {
      // Single-quoted string
      i++;
      const start = i;
      while (i < line.length && line[i] !== "'") i++;
      tokens.push(line.slice(start, i));
      i++; // skip closing quote
    } else if (ch === '"') {
      // Double-quoted string
      i++;
      const start = i;
      while (i < line.length && line[i] !== '"') i++;
      tokens.push(line.slice(start, i));
      i++; // skip closing quote
    } else {
      // Bare token
      const start = i;
      while (i < line.length && !/\s/.test(line[i])) i++;
      tokens.push(line.slice(start, i));
    }
  }
  return tokens;
}

/**
 * Parse a loop_ block for a given mmcif category (e.g. '_struct_conf').
 * Returns an array of row objects keyed by the field name (part after the dot).
 */
function parseMmcifLoop(content: string, category: string): Array<Record<string, string>> {
  const lines = content.split('\n');
  const categoryPrefix = category + '.';
  const results: Array<Record<string, string>> = [];

  let i = 0;
  // Find the loop_ that introduces this category
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === 'loop_') {
      // Check if the next non-empty line starts with our category
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && lines[j].trim().startsWith(categoryPrefix)) {
        // Found our loop block
        i = j;
        break;
      }
    }
    i++;
  }

  if (i >= lines.length) return results;

  // Collect column names
  const fields: string[] = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith(categoryPrefix)) {
      // Extract the field name (after the dot)
      const dotIdx = trimmed.indexOf('.');
      fields.push(trimmed.slice(dotIdx + 1));
      i++;
    } else {
      break;
    }
  }

  if (fields.length === 0) return results;

  // Collect data tokens — handle multi-line text blocks (;...;)
  const allTokens: string[] = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    // Loop or category end markers
    if (
      trimmed === '#' ||
      trimmed === 'loop_' ||
      (trimmed.startsWith('_') && !trimmed.startsWith(categoryPrefix))
    ) {
      break;
    }
    // Multi-line text block
    if (trimmed.startsWith(';')) {
      // Read lines until a line that is just ';'
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== ';') {
        textLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ';'
      allTokens.push(textLines.join('\n'));
      continue;
    }
    // Skip comment lines
    if (trimmed.startsWith('#')) {
      i++;
      continue;
    }
    // Skip empty lines
    if (trimmed === '') {
      i++;
      continue;
    }
    const lineTokens = tokeniseLine(lines[i]);
    allTokens.push(...lineTokens);
    i++;
  }

  // Group tokens into rows
  const numFields = fields.length;
  for (let t = 0; t + numFields <= allTokens.length; t += numFields) {
    const row: Record<string, string> = {};
    for (let f = 0; f < numFields; f++) {
      row[fields[f]] = allTokens[t + f];
    }
    results.push(row);
  }

  return results;
}

export function parseDsspMmcif(content: string): RawSSSegment[] {
  const segments: RawSSSegment[] = [];

  // Parse helices from _struct_conf
  const confRows = parseMmcifLoop(content, '_struct_conf');
  for (const row of confRows) {
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
  const sheetRows = parseMmcifLoop(content, '_struct_sheet_range');
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
