/**
 * Reading a data-tracks configuration (issue #83) from a page: JSON text or an
 * object. Entries that don't fit the schema are dropped with a warning, so one
 * mistake doesn't blank the whole view.
 */

import type {
  AreaTrackConfig,
  CsvSourceConfig,
  Feature,
  FeaturesTrackConfig,
  HeatmapRow,
  HeatmapTrackConfig,
  LineTrackConfig,
  ReferenceLine,
  Reduce,
  SecondaryStructureTrackConfig,
  SeriesConfig,
  SeriesRef,
  SeriesSelect,
  SequenceTrackConfig,
  SourceConfig,
  TrackConfig,
  TracksConfig,
} from './types.js';

/** Sources every configuration has without declaring them. */
export const BUILTIN_SOURCES = ['structure', 'membrane'] as const;

const REDUCES: Reduce[] = ['max', 'min', 'mean', 'sum', 'ca'];
const VIEWS = ['1d', '2d', '3d'] as const;

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isRange = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]);

/** A configuration and what was wrong with it. */
export interface ParsedTracks {
  config: TracksConfig;
  warnings: string[];
}

/**
 * Read a configuration from JSON text or an object. Never throws: anything
 * unusable is reported in `warnings` and left out.
 */
export function parseTracksConfig(input: unknown): ParsedTracks {
  const warnings: string[] = [];
  const warn = (msg: string) => warnings.push(msg);
  let raw: unknown = input;
  if (typeof input === 'string') {
    if (input.trim() === '') return { config: {}, warnings };
    try {
      raw = JSON.parse(input);
    } catch (err) {
      warn(`not valid JSON (${err instanceof Error ? err.message : String(err)})`);
      return { config: {}, warnings };
    }
  }
  if (raw === null || raw === undefined) return { config: {}, warnings };
  if (!isObj(raw)) {
    warn('expected an object with sources, series and tracks');
    return { config: {}, warnings };
  }
  for (const key of Object.keys(raw)) {
    if (!['sources', 'series', 'tracks', 'chain'].includes(key)) warn(`unknown key "${key}"`);
  }
  const config: TracksConfig = {};

  if (raw.sources !== undefined) {
    config.sources = {};
    if (!isObj(raw.sources)) warn('sources: expected an object');
    else {
      for (const [name, s] of Object.entries(raw.sources)) {
        const where = `sources.${name}`;
        if (name.includes('.')) warn(`${where}: source names can't contain "."`);
        else if ((BUILTIN_SOURCES as readonly string[]).includes(name))
          warn(`${where}: "${name}" is built in`);
        else {
          const src = parseSource(s, where, warn);
          if (src) config.sources[name] = src;
        }
      }
    }
  }

  if (raw.series !== undefined) {
    config.series = {};
    if (!isObj(raw.series)) warn('series: expected an object');
    else {
      for (const [name, s] of Object.entries(raw.series)) {
        const where = `series.${name}`;
        if (name.includes('.')) {
          warn(`${where}: series names can't contain "." (it separates source and column)`);
          continue;
        }
        const parsed =
          isObj(s) && 'select' in s ? parseSelect(s, where, warn) : parseSeries(s, where, warn);
        if (parsed) config.series[name] = parsed;
      }
    }
  }

  if (raw.tracks !== undefined) {
    config.tracks = [];
    if (!Array.isArray(raw.tracks)) warn('tracks: expected a list');
    else {
      raw.tracks.forEach((t, i) => {
        const track = parseTrack(t, `tracks[${i}]`, warn);
        if (track) config.tracks!.push(track);
      });
    }
  }

  if (raw.chain !== undefined) {
    if (!isObj(raw.chain)) warn('chain: expected an object');
    else {
      config.chain = {};
      for (const k of ['colour', 'width'] as const) {
        const v = raw.chain[k];
        if (v === undefined) continue;
        if (isStr(v)) config.chain[k] = v;
        else warn(`chain.${k}: expected a series name`);
      }
    }
  }
  return { config, warnings };
}

function parseSource(s: unknown, where: string, warn: (m: string) => void): SourceConfig | null {
  if (!isObj(s)) {
    warn(`${where}: expected an object`);
    return null;
  }
  if (s.type === 'values') {
    if (!isObj(s.data)) {
      warn(`${where}: "values" needs data {chain: {residue: value}}`);
      return null;
    }
    return { type: 'values', data: s.data as Record<string, Record<string, number | string>> };
  }
  if (s.type !== 'pdb' && s.type !== 'csv') {
    warn(`${where}: type must be "pdb", "csv" or "values"`);
    return null;
  }
  if (!isStr(s.url) && typeof s.text !== 'string') {
    warn(`${where}: needs a url or text`);
    return null;
  }
  const file = {
    ...(isStr(s.url) ? { url: s.url } : {}),
    ...(typeof s.text === 'string' ? { text: s.text } : {}),
  };
  if (s.type === 'pdb') return { type: 'pdb', ...file };
  if (s.per !== 'residue' && s.per !== 'atom') {
    warn(`${where}: per must be "residue" or "atom"`);
    return null;
  }
  const csv: CsvSourceConfig = { type: 'csv', per: s.per, ...file };
  if (s.keys !== undefined) {
    if (!isObj(s.keys)) warn(`${where}.keys: expected an object`);
    else {
      const keys: NonNullable<CsvSourceConfig['keys']> = {};
      for (const k of ['chain', 'residue', 'iCode', 'atom', 'serial'] as const) {
        const v = s.keys[k];
        if (v === undefined) continue;
        if (isStr(v)) keys[k] = v;
        else warn(`${where}.keys.${k}: expected a column name`);
      }
      csv.keys = keys;
    }
  }
  if (s.atoms !== undefined) {
    if (isStr(s.atoms)) csv.atoms = s.atoms;
    else warn(`${where}.atoms: expected a source name`);
  }
  return csv;
}

function parseSeries(s: unknown, where: string, warn: (m: string) => void): SeriesConfig | null {
  if (!isObj(s)) {
    warn(`${where}: expected an object with "from"`);
    return null;
  }
  if (!isStr(s.from) || !s.from.includes('.')) {
    warn(`${where}: from must be "<source>.<column>"`);
    return null;
  }
  const out: SeriesConfig = { from: s.from };
  if (s.reduce !== undefined) {
    if (REDUCES.includes(s.reduce as Reduce)) out.reduce = s.reduce as Reduce;
    else warn(`${where}.reduce: must be one of ${REDUCES.join(', ')}`);
  }
  for (const k of ['scale', 'offset'] as const) {
    if (s[k] === undefined) continue;
    if (isNum(s[k])) out[k] = s[k] as number;
    else warn(`${where}.${k}: expected a number`);
  }
  if (s.map !== undefined) {
    if (isObj(s.map)) out.map = s.map as Record<string, string | number>;
    else warn(`${where}.map: expected an object`);
  }
  for (const k of ['label', 'unit'] as const) {
    if (s[k] === undefined) continue;
    if (typeof s[k] === 'string') out[k] = s[k] as string;
    else warn(`${where}.${k}: expected text`);
  }
  return out;
}

function parseSelect(s: Obj, where: string, warn: (m: string) => void): SeriesSelect | null {
  if (!isStr(s.select)) {
    warn(`${where}: select must name a source`);
    return null;
  }
  const out: SeriesSelect = { select: s.select };
  if (s.where !== undefined) {
    if (!isObj(s.where)) warn(`${where}.where: expected {tag: value}`);
    else {
      out.where = {};
      for (const [tag, v] of Object.entries(s.where)) {
        if (typeof v === 'string') out.where[tag] = v;
        else if (Array.isArray(v) && v.every((x) => typeof x === 'string')) out.where[tag] = v;
        else warn(`${where}.where.${tag}: expected a value or a list of values`);
      }
    }
  }
  if (s.label !== undefined) {
    if (typeof s.label === 'string') out.label = s.label;
    else warn(`${where}.label: expected text`);
  }
  if (s.order !== undefined) {
    if (Array.isArray(s.order) && s.order.every((x) => typeof x === 'string')) out.order = s.order;
    else warn(`${where}.order: expected a list of tag values`);
  }
  return out;
}

function parseRef(r: unknown, where: string, warn: (m: string) => void): SeriesRef | null {
  if (isStr(r)) return r;
  if (!isObj(r) || !isStr(r.ref)) {
    warn(`${where}: expected a series name or {ref: …}`);
    return null;
  }
  const out: Exclude<SeriesRef, string> = { ref: r.ref };
  if (typeof r.label === 'string') out.label = r.label;
  if (typeof r.colour === 'string') out.colour = r.colour;
  if (r.side !== undefined) {
    if (r.side === 'above' || r.side === 'below') out.side = r.side;
    else warn(`${where}.side: must be "above" or "below"`);
  }
  return out;
}

function parseRefOrSelect(
  r: unknown,
  where: string,
  warn: (m: string) => void,
): SeriesRef | SeriesSelect | null {
  return isObj(r) && 'select' in r ? parseSelect(r, where, warn) : parseRef(r, where, warn);
}

function parseList<T>(
  v: unknown,
  where: string,
  warn: (m: string) => void,
  item: (x: unknown, w: string) => T | null,
): T[] {
  if (!Array.isArray(v)) {
    warn(`${where}: expected a list`);
    return [];
  }
  const out: T[] = [];
  v.forEach((x, i) => {
    const parsed = item(x, `${where}[${i}]`);
    if (parsed !== null) out.push(parsed);
  });
  return out;
}

function parseTrack(t: unknown, where: string, warn: (m: string) => void): TrackConfig | null {
  if (!isObj(t)) {
    warn(`${where}: expected an object`);
    return null;
  }
  const base: Partial<TrackConfig> = {};
  if (t.label !== undefined) {
    if (typeof t.label === 'string') base.label = t.label;
    else warn(`${where}.label: expected text`);
  }
  if (t.height !== undefined) {
    if (isNum(t.height) && t.height > 0) base.height = t.height;
    else warn(`${where}.height: expected a positive number`);
  }
  for (const k of ['legend', 'residueAxis'] as const) {
    if (t[k] === undefined) continue;
    if (typeof t[k] === 'boolean') base[k] = t[k] as boolean;
    else warn(`${where}.${k}: expected true or false`);
  }
  if (t.views !== undefined) {
    if (Array.isArray(t.views) && t.views.every((v) => (VIEWS as readonly unknown[]).includes(v)))
      base.views = t.views as TrackConfig['views'];
    else warn(`${where}.views: expected a list of "1d", "2d", "3d"`);
  }
  const rangeOf = (k: 'domain'): [number, number] | undefined => {
    if (t[k] === undefined) return undefined;
    if (isRange(t[k])) return t[k] as [number, number];
    warn(`${where}.${k}: expected [min, max]`);
    return undefined;
  };
  const curveOf = (): 'step' | 'smooth' | undefined => {
    if (t.curve === undefined) return undefined;
    if (t.curve === 'step' || t.curve === 'smooth') return t.curve;
    warn(`${where}.curve: must be "step" or "smooth"`);
    return undefined;
  };
  const flag = (k: string): boolean | undefined => {
    if (t[k] === undefined) return undefined;
    if (typeof t[k] === 'boolean') return t[k] as boolean;
    warn(`${where}.${k}: expected true or false`);
    return undefined;
  };
  const strip = <T extends object>(o: T): T =>
    Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

  switch (t.type) {
    case 'heatmap': {
      const series = parseList<HeatmapRow>(t.series, `${where}.series`, warn, (x, w) =>
        x === 'divider' ? 'divider' : parseRefOrSelect(x, w, warn),
      );
      let scale: HeatmapTrackConfig['scale'];
      if (t.scale !== undefined) {
        if (isStr(t.scale)) scale = t.scale;
        else if (Array.isArray(t.scale) && t.scale.length >= 1 && t.scale.every(isStr))
          scale = t.scale as string[];
        else warn(`${where}.scale: expected a scale name or a list of colours`);
      }
      let rowHeight: number | undefined;
      if (t.rowHeight !== undefined) {
        if (isNum(t.rowHeight) && t.rowHeight > 0) rowHeight = t.rowHeight;
        else warn(`${where}.rowHeight: expected a positive number`);
      }
      return strip<HeatmapTrackConfig>({
        ...base,
        type: 'heatmap',
        series,
        scale,
        domain: rangeOf('domain'),
        rowHeight,
      });
    }
    case 'area':
      return strip<AreaTrackConfig>({
        ...base,
        type: 'area',
        series: parseList(t.series, `${where}.series`, warn, (x, w) =>
          parseRefOrSelect(x, w, warn),
        ),
        domain: rangeOf('domain'),
        normalise: flag('normalise'),
        curve: curveOf(),
        axis: flag('axis'),
      });
    case 'line': {
      const reference =
        t.reference === undefined
          ? undefined
          : parseList<ReferenceLine>(t.reference, `${where}.reference`, warn, (x, w) => {
              if (!isObj(x) || (!isStr(x.ref) && !isNum(x.value))) {
                warn(`${w}: expected {ref} or {value}`);
                return null;
              }
              return strip<ReferenceLine>({
                ref: isStr(x.ref) ? x.ref : undefined,
                value: isNum(x.value) ? x.value : undefined,
                label: typeof x.label === 'string' ? x.label : undefined,
              });
            });
      return strip<LineTrackConfig>({
        ...base,
        type: 'line',
        series: parseList(t.series, `${where}.series`, warn, (x, w) =>
          parseRefOrSelect(x, w, warn),
        ),
        reference,
        domain: rangeOf('domain'),
        curve: curveOf(),
        axis: flag('axis'),
      });
    }
    case 'features': {
      const features =
        t.features === undefined
          ? undefined
          : parseList<Feature>(t.features, `${where}.features`, warn, (x, w) => {
              const pos = (v: unknown) => isNum(v) || isStr(v);
              if (!isObj(x) || !isStr(x.chain) || !(pos(x.at) || (pos(x.from) && pos(x.to)))) {
                warn(`${w}: expected {chain, from, to} or {chain, at}`);
                return null;
              }
              return strip<Feature>({
                chain: x.chain,
                from: pos(x.from) ? (x.from as number | string) : undefined,
                to: pos(x.to) ? (x.to as number | string) : undefined,
                at: pos(x.at) ? (x.at as number | string) : undefined,
                label: typeof x.label === 'string' ? x.label : undefined,
                colour: typeof x.colour === 'string' ? x.colour : undefined,
              });
            });
      if (t.source !== undefined && !isStr(t.source))
        warn(`${where}.source: expected a source name`);
      return strip<FeaturesTrackConfig>({
        ...base,
        type: 'features',
        features,
        source: isStr(t.source) ? t.source : undefined,
      });
    }
    case 'secondary-structure':
      if (t.series !== undefined && !isStr(t.series))
        warn(`${where}.series: expected a series name`);
      return strip<SecondaryStructureTrackConfig>({
        ...base,
        type: 'secondary-structure',
        series: isStr(t.series) ? t.series : undefined,
      });
    case 'sequence':
      if (t.colour !== undefined && !isStr(t.colour))
        warn(`${where}.colour: expected a scheme or a series name`);
      return strip<SequenceTrackConfig>({
        ...base,
        type: 'sequence',
        colour: isStr(t.colour) ? t.colour : undefined,
      });
    default:
      warn(`${where}: type must be heatmap, area, line, features, secondary-structure or sequence`);
      return null;
  }
}
