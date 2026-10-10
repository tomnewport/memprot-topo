/**
 * Data sources for the data tracks (issue #83): PDB files, CSV files and inline
 * values, read into tables of rows keyed by chain and residue. Columns keep
 * the file format's own names (`tempFactor`, `occupancy`, a CSV's headers);
 * what they mean is said by the series that use them.
 */

import { csvParseRows } from 'd3-dsv';
import { parseResidueKey, residueKey, type ResidueKey } from '../residue-key.js';
import type { CsvSourceConfig, InlineValues } from './types.js';

/** A cell: a number, or text where the value isn't numeric. */
export type Cell = number | string;
export type Row = Record<string, Cell>;

/** A source read into rows, looked up by chain ID and residue key. */
export interface SourceTable {
  /** Whether a row is a residue or an atom (several rows per residue). */
  per: 'residue' | 'atom';
  /** Columns in file order. */
  columns: string[];
  /** Rows of a residue (one for per-residue tables); empty when it has none. */
  rows(chainId: string, key: ResidueKey): Row[];
  /** Chain IDs with rows. */
  chains(): string[];
  /** Every residue of a chain with its rows, in file order. */
  residues(chainId: string): [ResidueKey, Row[]][];
}

/** A table from rows grouped by chain and residue key. */
export function tableOf(
  per: 'residue' | 'atom',
  columns: string[],
  byChain: Map<string, Map<ResidueKey, Row[]>>,
): SourceTable {
  return {
    per,
    columns,
    rows: (chainId, key) => byChain.get(chainId)?.get(key) ?? [],
    chains: () => [...byChain.keys()],
    residues: (chainId) => [...(byChain.get(chainId) ?? [])],
  };
}

function push(
  byChain: Map<string, Map<ResidueKey, Row[]>>,
  chainId: string,
  key: ResidueKey,
  row: Row,
): void {
  let chain = byChain.get(chainId);
  if (!chain) byChain.set(chainId, (chain = new Map()));
  const rows = chain.get(key);
  if (rows) rows.push(row);
  else chain.set(key, [row]);
}

/** PDB ATOM/HETATM fields a `pdb` source exposes as columns. */
export const PDB_COLUMNS = [
  'serial',
  'name',
  'resName',
  'x',
  'y',
  'z',
  'occupancy',
  'tempFactor',
  'element',
] as const;

/**
 * Every ATOM/HETATM record of a PDB file, by chain and residue. A blank chain
 * ID is kept as `''`.
 */
export function pdbTable(text: string): SourceTable {
  const byChain = new Map<string, Map<ResidueKey, Row[]>>();
  const num = (s: string): Cell => {
    const t = s.trim();
    const n = Number(t);
    return t !== '' && Number.isFinite(n) ? n : t;
  };
  for (const line of text.split(/\r?\n/)) {
    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;
    const resSeq = Number.parseInt(line.slice(22, 26), 10);
    if (!Number.isFinite(resSeq)) continue;
    const iCode = (line[26] ?? ' ').trim();
    const row: Row = {
      serial: num(line.slice(6, 11)),
      name: line.slice(12, 16).trim(),
      resName: line.slice(17, 20).trim(),
      x: num(line.slice(30, 38)),
      y: num(line.slice(38, 46)),
      z: num(line.slice(46, 54)),
      occupancy: num(line.slice(54, 60)),
      tempFactor: num(line.slice(60, 66)),
      element: line.slice(76, 78).trim(),
    };
    push(byChain, (line[21] ?? ' ').trim(), residueKey({ resSeq, iCode }), row);
  }
  return tableOf('atom', [...PDB_COLUMNS], byChain);
}

/** A CSV cell as a number where it is one; `True`/`False` as 1/0; empty as missing. */
function csvCell(s: string): Cell | undefined {
  const t = s.trim();
  if (t === '') return undefined;
  const n = Number(t);
  if (Number.isFinite(n)) return n;
  const lower = t.toLowerCase();
  if (lower === 'true') return 1;
  if (lower === 'false') return 0;
  return t;
}

/** Default key columns: MemProtMD's and MDAnalysis' names. */
const DEFAULT_KEYS = {
  chain: 'chainID',
  residue: 'resSeq',
  iCode: 'iCode',
  atom: 'name',
  serial: 'serial',
};

/**
 * A CSV file as a table. Rows are keyed by chain and residue columns, or for
 * per-atom files keyed only by atom serial number, by looking the serial up
 * in `atoms` (a PDB table). An unnamed first column (a pandas index) is
 * dropped. Rows that can't be keyed are skipped, and counted in `skipped`.
 */
export function csvTable(
  text: string,
  config: Pick<CsvSourceConfig, 'per' | 'keys'>,
  atoms: SourceTable | null = null,
): SourceTable & { skipped: number } {
  const keys = { ...DEFAULT_KEYS, ...config.keys };
  const [header = [], ...body] = csvParseRows(text.replace(/^\uFEFF/, ''));
  const names = header.map((h) => h.trim());
  const keep = names.map((n, i) => !(i === 0 && n === ''));
  const columns = names.filter((n, i) => keep[i]);
  const col = (name: string) => names.indexOf(name);
  const chainCol = col(keys.chain);
  const resCol = col(keys.residue);
  const iCodeCol = col(keys.iCode);
  const serialCol = col(keys.serial);

  // For per-atom rows keyed by serial: where each serial is in `atoms`.
  let bySerial: Map<number, { chain: string; key: ResidueKey }> | null = null;
  if (config.per === 'atom' && (chainCol < 0 || resCol < 0) && serialCol >= 0 && atoms) {
    bySerial = new Map();
    for (const chain of atoms.chains()) {
      for (const [key, rows] of atoms.residues(chain)) {
        for (const r of rows)
          if (typeof r.serial === 'number') bySerial.set(r.serial, { chain, key });
      }
    }
  }

  const byChain = new Map<string, Map<ResidueKey, Row[]>>();
  let skipped = 0;
  for (const cells of body) {
    if (cells.length === 1 && cells[0].trim() === '') continue;
    const row: Row = {};
    names.forEach((n, i) => {
      if (!keep[i]) return;
      const v = csvCell(cells[i] ?? '');
      if (v !== undefined) row[n] = v;
    });
    let chain: string | null = null;
    let key: ResidueKey | null = null;
    if (chainCol >= 0 && resCol >= 0) {
      chain = (cells[chainCol] ?? '').trim();
      const iCode = iCodeCol >= 0 ? (cells[iCodeCol] ?? '').trim() : '';
      key = parseResidueKey(`${(cells[resCol] ?? '').trim()}${iCode}`);
    } else if (bySerial) {
      const hit = bySerial.get(Number((cells[serialCol] ?? '').trim()));
      if (hit) ({ chain, key } = hit);
    }
    if (chain === null || key === null) {
      skipped++;
      continue;
    }
    push(byChain, chain, key, row);
  }
  return { ...tableOf(config.per, columns, byChain), skipped };
}

/** Inline values as a per-residue table with one column, `value`. */
export function valuesTable(data: InlineValues): SourceTable {
  const byChain = new Map<string, Map<ResidueKey, Row[]>>();
  for (const [chain, values] of Object.entries(data ?? {})) {
    if (!values || typeof values !== 'object') continue;
    for (const [k, v] of Object.entries(values)) {
      const key = parseResidueKey(k);
      const ok =
        (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v !== '');
      if (key !== null && ok) push(byChain, chain, key, { value: v });
    }
  }
  return tableOf('residue', ['value'], byChain);
}

/**
 * Parse the column tags of a header like `leaflet=a;resname=DPPC;bead=Choline`
 * (or `group=Tail`); null for a header that isn't one.
 */
export function columnTags(column: string): Record<string, string> | null {
  if (!column.includes('=')) return null;
  const tags: Record<string, string> = {};
  for (const part of column.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) return null;
    tags[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return tags;
}
