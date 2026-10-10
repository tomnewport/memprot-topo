/**
 * The `<topology-display>` side of the data tracks (issue #83): holds the
 * configuration a page set, loads its sources, and resolves it for the chain
 * on screen (the sequence view's tracks) and for every chain (the chain's own
 * colour and width).
 */

import { parseTracksConfig } from '../tracks/config.js';
import { loadSources } from '../tracks/load.js';
import { resolveTracks, type ResolvedTracks, type TrackPalette } from '../tracks/resolve.js';
import {
  membraneTable,
  resolveSeries,
  structureTable,
  type ResidueRef,
  type SeriesContext,
} from '../tracks/series.js';
import type { SourceTable } from '../tracks/sources.js';
import type { TracksConfig } from '../tracks/types.js';
import type { ChainData } from '../types.js';
import { residueKey } from '../residue-key.js';
import type { ResidueColourValues, ResidueWidthValues } from './residue-data.js';

export interface DataTracksHost {
  /** Called when loaded sources (or a new configuration) need a redraw. */
  redraw(): void;
  warn(message: string): void;
}

export class DataTracks {
  private input: TracksConfig | string | null = null;
  private config: TracksConfig | null = null;
  private tables = new Map<string, SourceTable>();
  private abort: AbortController | null = null;
  /** Sources are still loading: nothing is resolved until they are in. */
  private loading = false;
  private generation = 0;
  /** Warnings already shown for this configuration, so a redraw doesn't repeat them. */
  private warned = new Set<string>();
  private structure: { chains: ChainData[]; table: SourceTable } | null = null;
  private chainSeries: {
    chains: ChainData[];
    colours: ResidueColourValues | null;
    widths: ResidueWidthValues | null;
  } | null = null;

  constructor(private readonly host: DataTracksHost) {}

  /** The configuration as the page gave it. */
  get value(): TracksConfig | string | null {
    return this.input;
  }

  /** Whether a configuration with something to draw is set. */
  get active(): boolean {
    return !!this.config;
  }

  /** Set (or clear, with null) the configuration, and load its sources. */
  set(input: TracksConfig | string | null): void {
    if (input === this.input) return;
    this.input = input;
    this.abort?.abort();
    this.abort = null;
    this.warned.clear();
    this.tables = new Map();
    this.chainSeries = null;
    this.loading = false;
    const gen = ++this.generation;
    if (input === null || input === undefined) {
      this.config = null;
      this.host.redraw();
      return;
    }
    const { config, warnings } = parseTracksConfig(input);
    warnings.forEach((w) => this.warn(w));
    this.config = config;
    if (Object.keys(config.sources ?? {}).length === 0) {
      this.host.redraw();
      return;
    }
    const controller = new AbortController();
    this.abort = controller;
    this.loading = true;
    void loadSources(config, (m) => this.warn(m), controller.signal).then((tables) => {
      if (gen !== this.generation) return;
      this.tables = tables;
      this.chainSeries = null;
      this.abort = null;
      this.loading = false;
      this.host.redraw();
    });
  }

  dispose(): void {
    this.abort?.abort();
    this.abort = null;
  }

  private warn(message: string): void {
    if (this.warned.has(message)) return;
    this.warned.add(message);
    this.host.warn(message);
  }

  private structureOf(chains: ChainData[]): SourceTable {
    if (this.structure?.chains !== chains) {
      this.structure = { chains, table: structureTable(chains) };
    }
    return this.structure.table;
  }

  private context(
    chainId: string,
    residues: ResidueRef[],
    chains: ChainData[],
    membrane: SourceTable | null,
  ): SeriesContext {
    const tables = new Map(this.tables);
    tables.set('structure', this.structureOf(chains));
    if (membrane) tables.set('membrane', membrane);
    return {
      chainId,
      residues,
      tables,
      series: this.config?.series ?? {},
      warn: (m) => this.warn(m),
    };
  }

  /**
   * The sequence view's tracks for the chain on screen, or null with no
   * configuration. `depth` and `bulk` feed the built-in `membrane` source.
   */
  resolve(
    chainId: string,
    residues: (ResidueRef & { code: string })[],
    chains: ChainData[],
    depth: number[],
    bulk: { upper: number; lower: number },
    palette: TrackPalette,
  ): ResolvedTracks | null {
    if (!this.config?.tracks?.length || this.loading) return null;
    const ctx = this.context(
      chainId,
      residues,
      chains,
      membraneTable(chainId, residues, depth, bulk),
    );
    return resolveTracks(this.config, ctx, palette, (i) => residues[i]?.code ?? 'X');
  }

  /**
   * `chain.colour` and `chain.width` as residue series for every chain, in
   * the form `residueColours` / `residueWidths` take. Memoised per data.
   */
  chainStyle(chains: ChainData[]): {
    colours: ResidueColourValues | null;
    widths: ResidueWidthValues | null;
  } {
    const spec = this.config?.chain;
    if (!spec || (!spec.colour && !spec.width) || this.loading)
      return { colours: null, widths: null };
    if (this.chainSeries?.chains === chains) return this.chainSeries;
    const series = (name: string | undefined) => {
      if (!name) return null;
      const out: Record<string, Record<string, number | string>> = {};
      for (const chain of chains) {
        const residues = chain.calphas ?? [];
        const s = resolveSeries(name, this.context(chain.chainId, residues, chains, null));
        if (!s) return null;
        const values: Record<string, number | string> = {};
        residues.forEach((r, i) => {
          const v = s.values[i];
          if (v !== undefined) values[residueKey(r)] = v;
        });
        out[chain.chainId] = values;
      }
      return out;
    };
    const widths = series(spec.width);
    this.chainSeries = {
      chains,
      colours: series(spec.colour),
      widths: widths as ResidueWidthValues | null,
    };
    return this.chainSeries;
  }
}
