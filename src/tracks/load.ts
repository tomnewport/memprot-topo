/**
 * Fetch and read the sources of a data-tracks configuration (issue #83).
 */

import { csvTable, pdbTable, valuesTable, type SourceTable } from './sources.js';
import type { SourceConfig, TracksConfig } from './types.js';

/** Read every source of `config`, fetching those given by URL. Sources that fail are left out with a warning. */
export async function loadSources(
  config: TracksConfig,
  warn: (message: string) => void,
  signal?: AbortSignal,
  fetchText: (url: string, signal?: AbortSignal) => Promise<string> = defaultFetch,
): Promise<Map<string, SourceTable>> {
  const entries = Object.entries(config.sources ?? {});
  const text = new Map<string, Promise<string | null>>();
  for (const [name, s] of entries) {
    if (s.type === 'values') continue;
    const load = s.text !== undefined ? Promise.resolve(s.text) : fetchText(s.url!, signal);
    text.set(
      name,
      load.catch((err: unknown) => {
        if ((err as { name?: string })?.name !== 'AbortError') {
          warn(`source "${name}": ${err instanceof Error ? err.message : String(err)}`);
        }
        return null;
      }),
    );
  }
  const tables = new Map<string, SourceTable>();
  // PDB files first: a per-atom CSV may look its serial numbers up in one.
  const order = (s: SourceConfig) => (s.type === 'csv' ? 1 : 0);
  for (const [name, s] of [...entries].sort((a, b) => order(a[1]) - order(b[1]))) {
    if (s.type === 'values') {
      tables.set(name, valuesTable(s.data));
      continue;
    }
    const body = await text.get(name)!;
    if (body === null) continue;
    if (s.type === 'pdb') {
      tables.set(name, pdbTable(body));
      continue;
    }
    let atoms: SourceTable | null = null;
    if (s.atoms !== undefined) {
      atoms = tables.get(s.atoms) ?? null;
      if (!atoms || atoms.per !== 'atom') warn(`source "${name}": atoms must name a pdb source`);
    }
    const table = csvTable(body, s, atoms);
    if (table.skipped > 0) {
      warn(`source "${name}": ${table.skipped} rows had no chain and residue, and were skipped`);
    }
    tables.set(name, table);
  }
  return tables;
}

async function defaultFetch(url: string, signal?: AbortSignal): Promise<string> {
  const resp = await fetch(url, { signal });
  if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText} fetching ${url}`);
  return resp.text();
}
