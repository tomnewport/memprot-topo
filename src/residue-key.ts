/**
 * A residue's key within a chain: its author residue number followed by its
 * insertion code, e.g. `100`, `100A` or `-3`. Residue data, loops, contacts and
 * the sequence view are keyed by it, so `100` and `100A` stay apart. A residue
 * without an insertion code is keyed by its bare number, as before.
 */
export type ResidueKey = string;

/** The key of a residue (insertion codes are upper-cased). */
export function residueKey(r: { resSeq: number; iCode?: string }): ResidueKey {
  return `${r.resSeq}${(r.iCode ?? '').toUpperCase()}`;
}

const KEY_RE = /^(-?\d+)([A-Za-z]?)$/;

/**
 * Read a residue key as a page gives it (`45`, `"100A"`, `"100a"`, `" -3 "`);
 * null for anything else.
 */
export function parseResidueKey(text: string | number): ResidueKey | null {
  const m = KEY_RE.exec(String(text).trim());
  return m ? `${Number(m[1])}${m[2].toUpperCase()}` : null;
}
