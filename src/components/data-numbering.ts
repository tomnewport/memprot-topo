import {
  fetchUniprotNumbering,
  renumberSeries,
  type ResidueNumbering,
} from '../numbering/index.js';
import type { ResidueSeries } from './residue-data.js';

/** Numberings residue data can be given in (the `residue-numbering` attribute). */
export const RESIDUE_NUMBERINGS = ['author', 'uniprot'] as const;
export type ResidueNumberingName = (typeof RESIDUE_NUMBERINGS)[number];
export const DEFAULT_RESIDUE_NUMBERING: ResidueNumberingName = 'author';

/** The numbering an attribute value names; unset or unknown values give `author`. */
export function residueNumberingName(value: string | null): ResidueNumberingName {
  const v = value?.trim().toLowerCase();
  return RESIDUE_NUMBERINGS.find((n) => n === v) ?? DEFAULT_RESIDUE_NUMBERING;
}

/** One lookup per PDB entry, shared by every display on the page. */
const lookups = new Map<string, Promise<ResidueNumbering>>();

function lookup(pdbId: string): Promise<ResidueNumbering> {
  const id = pdbId.toLowerCase();
  let p = lookups.get(id);
  if (!p) lookups.set(id, (p = fetchUniprotNumbering(id)));
  return p;
}

/**
 * Residue data given in UniProt numbering, moved to the structure's. The
 * UniProt map of the shown entry is fetched from SIFTS on first use; until it
 * arrives, and if it can't be had, there is no data to draw.
 */
export class DataNumbering {
  private _pdbId: string | null = null;
  /** The map for `_pdbId`: undefined while loading, null when it failed. */
  private _map: ResidueNumbering | null | undefined = undefined;

  /** `loaded` is called when a map arrives for the entry still shown. */
  constructor(private readonly loaded: () => void) {}

  /**
   * `series` in the structure's numbering: as given for `author`; for
   * `uniprot`, translated with entry `pdbId`'s map, or null until it is known.
   */
  series<T>(
    series: ResidueSeries<T> | null,
    numbering: ResidueNumberingName,
    pdbId: string | undefined,
  ): ResidueSeries<T> | null {
    if (!series || numbering === 'author') return series;
    const map = pdbId ? this.map(pdbId) : null;
    return map ? renumberSeries(series, map) : null;
  }

  private map(pdbId: string): ResidueNumbering | null | undefined {
    if (pdbId === this._pdbId) return this._map;
    this._pdbId = pdbId;
    this._map = undefined;
    lookup(pdbId).then(
      (map) => {
        if (pdbId !== this._pdbId) return;
        this._map = map;
        this.loaded();
      },
      (err: unknown) => {
        if (pdbId !== this._pdbId) return;
        this._map = null;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          `topology-display: no UniProt numbering for ${pdbId} (${message}); residue data is not drawn`,
        );
      },
    );
    return undefined;
  }
}
