/**
 * The data-tracks configuration (issue #83): where per-residue data comes
 * from (`sources`), what each value means (`series`), and how it is drawn
 * (`tracks`). See docs/data-tracks.md.
 */

/** Per-residue values set directly, keyed by chain ID then residue key (`45`, `'100A'`). */
export type InlineValues = Record<string, Record<string | number, number | string>>;

/** A PDB file: every ATOM/HETATM record, by its standard field names. */
export interface PdbSourceConfig {
  type: 'pdb';
  /** Fetched relative to the page. */
  url?: string;
  /** The file's text, instead of `url`. */
  text?: string;
}

/** A CSV file with one row per residue or one row per atom. */
export interface CsvSourceConfig {
  type: 'csv';
  url?: string;
  text?: string;
  /** What a row describes. */
  per: 'residue' | 'atom';
  /**
   * Columns that key the rows. Defaults: `chainID`, `resSeq`, `iCode`, and for
   * per-atom rows `name` (atom name) or `serial`.
   */
  keys?: { chain?: string; residue?: string; iCode?: string; atom?: string; serial?: string };
  /** For per-atom rows keyed by `serial`: the `pdb` source the serial numbers refer to. */
  atoms?: string;
}

/** Values given in the configuration itself. */
export interface ValuesSourceConfig {
  type: 'values';
  data: InlineValues;
}

export type SourceConfig = PdbSourceConfig | CsvSourceConfig | ValuesSourceConfig;

/** How per-atom values are reduced to one value per residue. */
export type Reduce = 'max' | 'min' | 'mean' | 'sum' | 'ca';

/** A named per-residue series: one source column and what it means. */
export interface SeriesConfig {
  /** `"<source>.<column>"`, split at the first dot. */
  from: string;
  /** Required for per-atom sources. */
  reduce?: Reduce;
  /** `value × scale + offset`, after reducing. */
  scale?: number;
  offset?: number;
  /** Value mapping for categorical series. */
  map?: Record<string, string | number>;
  label?: string;
  unit?: string;
}

/**
 * A set of series: one per column of `select` whose tags (from headers like
 * `leaflet=a;resname=DPPC;bead=Choline`) match `where`.
 */
export interface SeriesSelect {
  select: string;
  where?: Record<string, string | string[]>;
  /** Row label; `{tag}` is replaced by the column's value for that tag. */
  label?: string;
  /** Order by these values of the tag(s) not fixed by `where`, instead of file order. */
  order?: string[];
}

/** A series by name, as `"<source>.<column>"`, or with display overrides. */
export type SeriesRef =
  | string
  | { ref: string; label?: string; colour?: string; side?: 'above' | 'below' };

/** One heatmap row (or a divider line between rows). */
export type HeatmapRow = SeriesRef | SeriesSelect | 'divider';

interface TrackBase {
  label?: string;
  height?: number;
  legend?: boolean;
  /** A residue-number axis under the track. */
  residueAxis?: boolean;
  /** Views that show the track. Only `"1d"` is drawn so far. */
  views?: ('1d' | '2d' | '3d')[];
}

export interface HeatmapTrackConfig extends TrackBase {
  type: 'heatmap';
  series: HeatmapRow[];
  /** A named scale (`viridis`, `plasma`) or colour stops, low → high. */
  scale?: string | string[];
  domain?: [number, number];
  rowHeight?: number;
}

export interface AreaTrackConfig extends TrackBase {
  type: 'area';
  series: (SeriesRef | SeriesSelect)[];
  /** Extent each way from the baseline: `[0, max]`. */
  domain?: [number, number];
  /** Scale each residue's layers (both sides together) to sum to 1. */
  normalise?: boolean;
  curve?: 'step' | 'smooth';
  axis?: boolean;
}

export interface ReferenceLine {
  ref?: string;
  value?: number;
  label?: string;
}

export interface LineTrackConfig extends TrackBase {
  type: 'line';
  series: (SeriesRef | SeriesSelect)[];
  reference?: ReferenceLine[];
  domain?: [number, number];
  curve?: 'step' | 'smooth';
  axis?: boolean;
}

export interface Feature {
  chain: string;
  from?: number | string;
  to?: number | string;
  at?: number | string;
  label?: string;
  colour?: string;
}

export interface FeaturesTrackConfig extends TrackBase {
  type: 'features';
  features?: Feature[];
  /** A CSV source with `chainID`, `from`, `to`, `label` and `colour` columns. */
  source?: string;
}

export interface SecondaryStructureTrackConfig extends TrackBase {
  type: 'secondary-structure';
  /** A categorical series (`helix`, `strand`, `coil`); the structure's own by default. */
  series?: string;
}

export interface SequenceTrackConfig extends TrackBase {
  type: 'sequence';
  /** `lesk`, `chemistry`, `none`, or a series whose colours the letters take. */
  colour?: string;
}

export type TrackConfig =
  | HeatmapTrackConfig
  | AreaTrackConfig
  | LineTrackConfig
  | FeaturesTrackConfig
  | SecondaryStructureTrackConfig
  | SequenceTrackConfig;

/** The whole configuration, as the `tracks` property or attribute takes it. */
export interface TracksConfig {
  sources?: Record<string, SourceConfig>;
  series?: Record<string, SeriesConfig | SeriesSelect>;
  tracks?: TrackConfig[];
  /** Series that style the chain itself in every view, like `residueColours` / `residueWidths`. */
  chain?: { colour?: string; width?: string };
}
