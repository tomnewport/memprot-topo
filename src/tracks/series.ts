/**
 * Series for the data tracks (issue #83): one value per residue of a chain,
 * read from a source column, reduced from atoms where the source has several
 * rows per residue, and transformed (scale, offset, map).
 */

import { residueKey, type ResidueKey } from '../residue-key.js';
import type { ChainData } from '../types.js';
import { ssTypeAt } from '../layout/runs.js';
import { columnTags, tableOf, type Cell, type Row, type SourceTable } from './sources.js';
import type { Reduce, SeriesConfig, SeriesRef, SeriesSelect } from './types.js';

/** A residue of the chain the series are resolved for. */
export interface ResidueRef {
  resSeq: number;
  iCode: string;
}

/** What series are resolved against: one chain, its residues, and the loaded sources. */
export interface SeriesContext {
  chainId: string;
  residues: ResidueRef[];
  /** Sources by name, the built-in ones included. */
  tables: Map<string, SourceTable>;
  /** Named series from the configuration. */
  series: Record<string, SeriesConfig | SeriesSelect>;
  warn: (message: string) => void;
}

/** A series' values for each residue of the context's chain. */
export interface ResolvedSeries {
  label: string;
  unit?: string;
  /** Value of residue `i`; undefined where it has none. */
  values: (Cell | undefined)[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Split `"<source>.<column>"` at the first dot. */
export function splitRef(ref: string): { source: string; column: string } | null {
  const dot = ref.indexOf('.');
  if (dot <= 0 || dot === ref.length - 1) return null;
  return { source: ref.slice(0, dot), column: ref.slice(dot + 1) };
}

function reduceRows(rows: Row[], column: string, reduce: Reduce | undefined): Cell | undefined {
  if (rows.length === 0) return undefined;
  if (reduce === 'ca') {
    const ca = rows.find((r) => r.name === 'CA') ?? null;
    return ca ? ca[column] : undefined;
  }
  if (rows.length === 1 || reduce === undefined) return rows[0][column];
  const nums = rows.map((r) => r[column]).filter(isNum);
  if (nums.length === 0) return rows[0][column];
  switch (reduce) {
    case 'max':
      return Math.max(...nums);
    case 'min':
      return Math.min(...nums);
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'mean':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}

/** Read `column` of `table` for each residue, then transform it as `cfg` says. */
function columnValues(
  table: SourceTable,
  column: string,
  cfg: Omit<SeriesConfig, 'from'>,
  ctx: SeriesContext,
): (Cell | undefined)[] {
  return ctx.residues.map((r) => {
    let v = reduceRows(table.rows(ctx.chainId, residueKey(r)), column, cfg.reduce);
    if (v === undefined) return undefined;
    if (cfg.map) {
      const mapped = cfg.map[String(v)];
      if (mapped !== undefined) v = mapped;
    }
    if (isNum(v) && (cfg.scale !== undefined || cfg.offset !== undefined)) {
      v = v * (cfg.scale ?? 1) + (cfg.offset ?? 0);
    }
    return v;
  });
}

function resolveConfig(name: string, cfg: SeriesConfig, ctx: SeriesContext): ResolvedSeries | null {
  const ref = splitRef(cfg.from);
  const table = ref && ctx.tables.get(ref.source);
  if (!ref || !table) {
    ctx.warn(`series "${name}": no source "${ref?.source ?? cfg.from}"`);
    return null;
  }
  if (!table.columns.includes(ref.column)) {
    ctx.warn(`series "${name}": source "${ref.source}" has no column "${ref.column}"`);
    return null;
  }
  if (table.per === 'atom' && !cfg.reduce) {
    ctx.warn(`series "${name}": "${ref.source}" has a row per atom, so it needs "reduce"`);
    return null;
  }
  return {
    label: cfg.label ?? name,
    ...(cfg.unit !== undefined ? { unit: cfg.unit } : {}),
    values: columnValues(table, ref.column, cfg, ctx),
  };
}

/**
 * Resolve a series reference: a named series, or `"<source>.<column>"` of a
 * per-residue source. Null (with a warning) when it can't be.
 */
export function resolveSeries(ref: string, ctx: SeriesContext): ResolvedSeries | null {
  const named = ctx.series[ref];
  if (named && 'from' in named) return resolveConfig(ref, named, ctx);
  if (named) {
    ctx.warn(`series "${ref}" is a set of series; use it where a list is expected`);
    return null;
  }
  const split = splitRef(ref);
  if (!split) {
    ctx.warn(`no series "${ref}"`);
    return null;
  }
  return resolveConfig(ref, { from: ref, label: split.column }, ctx);
}

/** Columns of `select` matching `where`, labelled and ordered, as series. */
function expandSelect(sel: SeriesSelect, ctx: SeriesContext): ResolvedSeries[] {
  const table = ctx.tables.get(sel.select);
  if (!table) {
    ctx.warn(`select: no source "${sel.select}"`);
    return [];
  }
  if (table.per === 'atom') {
    ctx.warn(
      `select: "${sel.select}" has a row per atom; name its columns as series with "reduce"`,
    );
    return [];
  }
  const where = sel.where ?? {};
  const matches: { column: string; tags: Record<string, string> }[] = [];
  for (const column of table.columns) {
    const tags = columnTags(column);
    if (!tags) continue;
    // Every `where` tag must match.
    const ok = Object.entries(where).every(([k, v]) =>
      Array.isArray(v) ? v.includes(tags[k]) : tags[k] === v,
    );
    if (ok) matches.push({ column, tags });
  }
  // With `where`, prefer the most specific columns: those with exactly the
  // tag keys the first match has, so aggregates (`leaflet=a`) don't mix with
  // per-bead columns.
  const keyset = (t: Record<string, string>) => Object.keys(t).sort().join(';');
  const first = matches[0] ? keyset(matches[0].tags) : '';
  const chosen = matches.filter((m) => keyset(m.tags) === first);
  if (chosen.length === 0) ctx.warn(`select: no column of "${sel.select}" matches`);
  const free = (t: Record<string, string>) => Object.keys(t).filter((k) => !(k in where));
  if (sel.order) {
    const rank = (m: { tags: Record<string, string> }) => {
      const i = free(m.tags)
        .map((k) => sel.order!.indexOf(m.tags[k]))
        .find((x) => x >= 0);
      return i ?? sel.order!.length;
    };
    // Stable: ties keep file order (so leaflets stay grouped as listed).
    chosen.sort((a, b) => {
      const byWhere = Object.keys(where)
        .map((k) => {
          const v = where[k];
          return Array.isArray(v) ? v.indexOf(a.tags[k]) - v.indexOf(b.tags[k]) : 0;
        })
        .find((d) => d !== 0);
      return byWhere ?? rank(a) - rank(b);
    });
  }
  return chosen.map(({ column, tags }) => {
    const label = sel.label
      ? sel.label.replace(/\{([^}]+)\}/g, (_, k: string) => tags[k] ?? '')
      : free(tags)
          .map((k) => tags[k])
          .join('/') || column;
    return { label, values: columnValues(table, column, {}, ctx) };
  });
}

/** A list entry: one series, or a set (`select`, or a named one) expanded. */
export function resolveEntry(
  entry: SeriesRef | SeriesSelect,
  ctx: SeriesContext,
): { series: ResolvedSeries; colour?: string; side?: 'above' | 'below' }[] {
  if (typeof entry !== 'string' && 'select' in entry) {
    return expandSelect(entry, ctx).map((series) => ({ series }));
  }
  const name = typeof entry === 'string' ? entry : entry.ref;
  const named = ctx.series[name];
  if (named && 'select' in named) return expandSelect(named, ctx).map((series) => ({ series }));
  const series = resolveSeries(name, ctx);
  if (!series) return [];
  if (typeof entry === 'string') return [{ series }];
  return [
    {
      series: entry.label !== undefined ? { ...series, label: entry.label } : series,
      ...(entry.colour !== undefined ? { colour: entry.colour } : {}),
      ...(entry.side !== undefined ? { side: entry.side } : {}),
    },
  ];
}

/**
 * The built-in `structure` source: the loaded structure's Cα records, one row
 * per residue, with the PDB fields the parser kept and `ss`, the secondary
 * structure (`helix`, `strand`, `coil`) the 2-D layout uses.
 */
export function structureTable(chains: ChainData[]): SourceTable {
  const byChain = new Map<string, Map<ResidueKey, Row[]>>();
  for (const chain of chains) {
    const rows = new Map<ResidueKey, Row[]>();
    for (const ca of chain.calphas ?? []) {
      const row: Row = { x: ca.x, y: ca.y, z: ca.z, ss: ssTypeAt(chain.segments, ca.resSeq) };
      if (ca.resName) row.resName = ca.resName;
      if (isNum(ca.tempFactor)) row.tempFactor = ca.tempFactor;
      if (isNum(ca.occupancy)) row.occupancy = ca.occupancy;
      const key = residueKey(ca);
      if (!rows.has(key)) rows.set(key, [row]);
    }
    byChain.set(chain.chainId, rows);
  }
  return tableOf('residue', ['x', 'y', 'z', 'occupancy', 'tempFactor', 'resName', 'ss'], byChain);
}

/**
 * The built-in `membrane` source for one chain: the bulk leaflet headgroup
 * planes (`upper`, `lower`) and each residue's depth in the 2-D layout
 * (`depth`), all in Å with + up.
 */
export function membraneTable(
  chainId: string,
  residues: ResidueRef[],
  depth: number[],
  bulk: { upper: number; lower: number },
): SourceTable {
  const rows = new Map<ResidueKey, Row[]>();
  residues.forEach((r, i) => {
    const row: Row = { upper: bulk.upper, lower: bulk.lower };
    if (isNum(depth[i])) row.depth = depth[i];
    rows.set(residueKey(r), [row]);
  });
  return tableOf('residue', ['upper', 'lower', 'depth'], new Map([[chainId, rows]]));
}
