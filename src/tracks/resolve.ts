/**
 * Turn a data-tracks configuration (issue #83) into what the sequence view
 * draws for one chain: each track's values per residue, its colours and
 * scales. DOM-free, so it can be tested directly.
 */

import { scaleLinear } from 'd3-scale';
import { residueKey, parseResidueKey } from '../residue-key.js';
import type { SecondaryStructureType } from '../types.js';
import { resolveEntry, resolveSeries, type ResolvedSeries, type SeriesContext } from './series.js';
import type { Cell } from './sources.js';
import type { TrackConfig, TracksConfig } from './types.js';

/** Plasma, sampled at 9 stops. */
export const PLASMA: readonly string[] = Object.freeze([
  '#0d0887',
  '#4c02a1',
  '#7e03a8',
  '#a92395',
  '#cc4778',
  '#e66c5c',
  '#f89540',
  '#fdc527',
  '#f0f921',
]);

/** Lesk's amino-acid colours: small, hydrophobic, polar, negative, positive. */
export const LESK_COLOURS: Readonly<Record<string, string>> = Object.freeze({
  ...Object.fromEntries([...'GAST'].map((a) => [a, '#e8930c'])),
  ...Object.fromEntries([...'CVILPFYMW'].map((a) => [a, '#22a03c'])),
  ...Object.fromEntries([...'NQH'].map((a) => [a, '#c02bc8'])),
  ...Object.fromEntries([...'DE'].map((a) => [a, '#e0263b'])),
  ...Object.fromEntries([...'KR'].map((a) => [a, '#2f5fe0'])),
});

/** Colours and scales a resolved track needs from the theme. */
export interface TrackPalette {
  /** The default numerical scale, low → high. */
  dataScale: readonly string[];
  /** Colours for series without one of their own. */
  dataCategories: readonly string[];
  viridis: readonly string[];
  /** Amino-acid colours by chemistry (`chemistry` scheme). */
  aminoAcids: Readonly<Record<string, string>>;
}

/** A colour bar: stops low → high over `domain`. */
export interface ColourBar {
  stops: readonly string[];
  domain: [number, number];
  unit?: string;
}

export type HeatmapRowData = { label: string; colours: (string | undefined)[] } | 'divider';

interface Base {
  label?: string;
  residueAxis: boolean;
}

export interface HeatmapTrack extends Base {
  kind: 'heatmap';
  rows: HeatmapRowData[];
  rowHeight: number;
  legend: ColourBar | null;
}

export interface AreaLayer {
  label: string;
  colour: string;
  side: 'above' | 'below';
  /** Stack bottom and top per residue, in data units (below the baseline negative). */
  y0: number[];
  y1: number[];
}

export interface AreaTrack extends Base {
  kind: 'area';
  height: number;
  layers: AreaLayer[];
  /** y extent: [−max, max] with layers below the baseline, else [0, max]. */
  domain: [number, number];
  curve: 'step' | 'smooth';
  axis: boolean;
  legend: boolean;
}

export interface LineSeries {
  label: string;
  colour: string;
  values: number[];
}

export interface LineTrack extends Base {
  kind: 'line';
  height: number;
  lines: LineSeries[];
  references: { label?: string; values: number[] }[];
  domain: [number, number];
  ticks: number[];
  unit?: string;
  curve: 'step' | 'smooth';
  axis: boolean;
  legend: boolean;
}

export interface FeatureBar {
  /** Residue indices (inclusive). */
  from: number;
  to: number;
  label?: string;
  colour: string;
  lane: number;
}

export interface FeaturesTrack extends Base {
  kind: 'features';
  features: FeatureBar[];
  lanes: number;
}

export interface SsTrack extends Base {
  kind: 'ss';
  types: (SecondaryStructureType | undefined)[];
}

export type RenderTrack = HeatmapTrack | AreaTrack | LineTrack | FeaturesTrack | SsTrack;

/** What the sequence view draws for the configuration. */
export interface ResolvedTracks {
  /** Tracks above the letters and cartoon, then those below, each top to bottom. */
  above: RenderTrack[];
  below: RenderTrack[];
  /** Whether the one-letter codes are drawn. */
  letters: boolean;
  /** Colour of residue `i`'s letter (the theme's text colour where undefined). */
  letterColour: ((i: number) => string | undefined) | null;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Stops of a named scale, or the given list; the default scale otherwise. */
export function scaleStops(
  scale: string | string[] | undefined,
  palette: TrackPalette,
  warn: (m: string) => void,
): readonly string[] {
  if (Array.isArray(scale)) return scale;
  if (scale === undefined) return palette.dataScale;
  switch (scale.toLowerCase()) {
    case 'viridis':
      return palette.viridis;
    case 'plasma':
      return PLASMA;
    case 'data':
      return palette.dataScale;
  }
  warn(`unknown scale "${scale}" (use viridis, plasma, or a list of colours)`);
  return palette.dataScale;
}

/** Map numbers over `domain` onto colour `stops`, clamped at the ends. */
export function colourScale(
  stops: readonly string[],
  domain: [number, number],
): (v: number) => string {
  const [lo, hi] = domain;
  if (stops.length === 1) return () => stops[0];
  const scale = scaleLinear<string>()
    .domain(stops.map((_, i) => lo + ((hi - lo) * i) / (stops.length - 1)))
    .range([...stops])
    .clamp(true);
  return hi > lo ? (v) => scale(v) : () => stops[Math.floor((stops.length - 1) / 2)];
}

/** [min, max] of the finite numbers in `lists`, or [0, 1] when there are none. */
function extent(lists: (Cell | undefined)[][]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const list of lists)
    for (const v of list) {
      if (!isNum(v)) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  return lo <= hi ? [lo, hi] : [0, 1];
}

const numbers = (values: (Cell | undefined)[]): number[] => values.map((v) => (isNum(v) ? v : NaN));

function heatmap(
  t: Extract<TrackConfig, { type: 'heatmap' }>,
  ctx: SeriesContext,
  palette: TrackPalette,
): HeatmapTrack | null {
  const rows: ({ series: ResolvedSeries } | 'divider')[] = [];
  for (const entry of t.series) {
    if (entry === 'divider') rows.push('divider');
    else for (const { series } of resolveEntry(entry, ctx)) rows.push({ series });
  }
  const data = rows.filter((r): r is { series: ResolvedSeries } => r !== 'divider');
  if (data.length === 0) return null;
  const stops = scaleStops(t.scale, palette, ctx.warn);
  const domain = t.domain ?? extent(data.map((r) => r.series.values));
  const colour = colourScale(stops, domain);
  const anyNumber = data.some((r) => r.series.values.some(isNum));
  return {
    kind: 'heatmap',
    residueAxis: !!t.residueAxis,
    rowHeight: t.rowHeight ?? 10,
    rows: rows.map((r) =>
      r === 'divider'
        ? 'divider'
        : {
            // A one-row heatmap is labelled with the track's label, if it has one.
            label: data.length === 1 && t.label !== undefined ? t.label : r.series.label,
            colours: r.series.values.map((v) =>
              isNum(v) ? colour(v) : typeof v === 'string' ? v : undefined,
            ),
          },
    ),
    legend:
      t.legend !== false && anyNumber
        ? { stops, domain, ...(data[0].series.unit ? { unit: data[0].series.unit } : {}) }
        : null,
  };
}

function area(
  t: Extract<TrackConfig, { type: 'area' }>,
  ctx: SeriesContext,
  palette: TrackPalette,
): AreaTrack | null {
  const entries = t.series.flatMap((e) => resolveEntry(e, ctx));
  if (entries.length === 0) return null;
  const n = ctx.residues.length;
  const values = entries.map((e) => numbers(e.series.values).map((v) => (v > 0 ? v : 0)));
  const sides = entries.map((e) => e.side ?? 'above');
  if (t.normalise) {
    // Each residue's layers, both sides together, sum to 1.
    for (let i = 0; i < n; i++) {
      const total = values.reduce((s, v) => s + v[i], 0);
      if (total > 0) values.forEach((v) => (v[i] /= total));
    }
  }
  // Stack each side away from the baseline, in list order.
  const top = { above: new Array<number>(n).fill(0), below: new Array<number>(n).fill(0) };
  const layers: AreaLayer[] = entries.map((e, k) => {
    const side = sides[k];
    const sign = side === 'below' ? -1 : 1;
    const y0 = top[side].slice();
    for (let i = 0; i < n; i++) top[side][i] += values[k][i];
    return {
      label: e.series.label,
      colour: e.colour ?? palette.dataCategories[k % palette.dataCategories.length],
      side,
      y0: y0.map((v) => sign * v),
      y1: top[side].map((v) => sign * v),
    };
  });
  const hasBelow = sides.includes('below');
  const max =
    t.domain?.[1] ??
    (scaleLinear()
      .domain([0, Math.max(1e-9, ...top.above, ...top.below)])
      .nice(2)
      .domain()[1] as number);
  return {
    kind: 'area',
    ...(t.label !== undefined ? { label: t.label } : {}),
    residueAxis: !!t.residueAxis,
    height: t.height ?? 40,
    layers,
    domain: hasBelow ? [-max, max] : [0, max],
    curve: t.curve ?? 'step',
    axis: t.axis !== false,
    legend: t.legend !== false,
  };
}

function line(
  t: Extract<TrackConfig, { type: 'line' }>,
  ctx: SeriesContext,
  palette: TrackPalette,
): LineTrack | null {
  const entries = t.series.flatMap((e) => resolveEntry(e, ctx));
  if (entries.length === 0) return null;
  const n = ctx.residues.length;
  const references = (t.reference ?? []).flatMap((r) => {
    if (r.ref !== undefined) {
      const s = resolveSeries(r.ref, ctx);
      return s ? [{ label: r.label ?? s.label, values: numbers(s.values) }] : [];
    }
    return [
      { ...(r.label !== undefined ? { label: r.label } : {}), values: new Array(n).fill(r.value) },
    ];
  });
  const lines = entries.map((e, k) => ({
    label: e.series.label,
    colour: e.colour ?? palette.dataCategories[k % palette.dataCategories.length],
    values: numbers(e.series.values),
  }));
  const y = scaleLinear().domain(
    t.domain ?? extent([...lines, ...references].map((l) => l.values)),
  );
  if (!t.domain) y.nice(4);
  const domain = y.domain() as [number, number];
  return {
    kind: 'line',
    ...(t.label !== undefined ? { label: t.label } : {}),
    residueAxis: !!t.residueAxis,
    height: t.height ?? 56,
    lines,
    references,
    domain,
    ticks: y.ticks(4),
    ...(entries[0].series.unit ? { unit: entries[0].series.unit } : {}),
    curve: t.curve ?? 'step',
    axis: t.axis !== false,
    legend: t.legend !== false && lines.length > 1,
  };
}

function features(
  t: Extract<TrackConfig, { type: 'features' }>,
  ctx: SeriesContext,
  palette: TrackPalette,
): FeaturesTrack | null {
  const index = new Map(ctx.residues.map((r, i) => [residueKey(r), i]));
  const listed = (t.features ?? []).map((f) => ({ ...f }));
  if (t.source) {
    const table = ctx.tables.get(t.source);
    if (!table) ctx.warn(`features: no source "${t.source}"`);
    else {
      // Rows keyed by chain and residue: a feature per row, at that residue,
      // unless it gives `from`/`to`.
      for (const [key, rows] of table.residues(ctx.chainId)) {
        for (const r of rows) {
          listed.push({
            chain: ctx.chainId,
            from: (r.from as number | string | undefined) ?? key,
            to: (r.to as number | string | undefined) ?? (r.from as number | undefined) ?? key,
            ...(r.label !== undefined ? { label: String(r.label) } : {}),
            ...(typeof r.colour === 'string' ? { colour: r.colour } : {}),
          });
        }
      }
    }
  }
  const at = (v: number | string | undefined): number | undefined => {
    const key = v === undefined ? null : parseResidueKey(v);
    return key === null ? undefined : index.get(key);
  };
  const bars: FeatureBar[] = [];
  listed.forEach((f, k) => {
    if (f.chain !== ctx.chainId) return;
    const from = at(f.at ?? f.from);
    const to = at(f.at ?? f.to);
    if (from === undefined || to === undefined) return;
    bars.push({
      from: Math.min(from, to),
      to: Math.max(from, to),
      ...(f.label !== undefined ? { label: f.label } : {}),
      colour: f.colour ?? palette.dataCategories[k % palette.dataCategories.length],
      lane: 0,
    });
  });
  // Overlapping features go to the first lane that is free (labels count as
  // part of the bar, roughly a residue per character).
  bars.sort((a, b) => a.from - b.from || b.to - a.to);
  const laneEnd: number[] = [];
  for (const b of bars) {
    const end = Math.max(b.to, b.from + Math.ceil((b.label?.length ?? 0) * 0.55));
    let lane = laneEnd.findIndex((e) => e < b.from);
    if (lane < 0) lane = laneEnd.length;
    laneEnd[lane] = end;
    b.lane = lane;
  }
  return {
    kind: 'features',
    ...(t.label !== undefined ? { label: t.label } : {}),
    residueAxis: !!t.residueAxis,
    features: bars,
    lanes: Math.max(1, laneEnd.length),
  };
}

const SS_VALUES: SecondaryStructureType[] = ['helix', 'strand', 'coil'];

function ss(
  t: Extract<TrackConfig, { type: 'secondary-structure' }>,
  ctx: SeriesContext,
): SsTrack | null {
  const s = resolveSeries(t.series!, ctx);
  if (!s) return null;
  return {
    kind: 'ss',
    ...(t.label !== undefined ? { label: t.label } : { label: s.label }),
    residueAxis: !!t.residueAxis,
    types: s.values.map((v) => {
      const type = String(v ?? '').toLowerCase() as SecondaryStructureType;
      return SS_VALUES.includes(type) ? type : v === undefined ? undefined : 'coil';
    }),
  };
}

/** Whether a `secondary-structure` entry is the layout's own (drawn by the chain itself). */
const isOwnSs = (t: TrackConfig): boolean =>
  t.type === 'secondary-structure' && (t.series === undefined || t.series === 'structure.ss');

/**
 * Resolve every track of `config` for the context's chain. Tracks listed
 * before the sequence (the `sequence` track, or the structure's own
 * `secondary-structure`) go above the letters and cartoon, the rest below.
 * With neither listed, all tracks go above.
 */
export function resolveTracks(
  config: TracksConfig,
  ctx: SeriesContext,
  palette: TrackPalette,
  /** One-letter code of residue `i`, for letter colour schemes. */
  codeAt: (i: number) => string,
): ResolvedTracks {
  const list = (config.tracks ?? []).filter((t) => !t.views || t.views.includes('1d'));
  const anchor = list.findIndex((t) => t.type === 'sequence' || isOwnSs(t));
  const out: ResolvedTracks = { above: [], below: [], letters: true, letterColour: null };
  const listsSequence = list.some((t) => t.type === 'sequence');
  if (anchor >= 0 && !listsSequence) out.letters = false;
  list.forEach((t, k) => {
    const where = anchor < 0 || k < anchor ? out.above : out.below;
    let track: RenderTrack | null = null;
    switch (t.type) {
      case 'heatmap':
        track = heatmap(t, ctx, palette);
        break;
      case 'area':
        track = area(t, ctx, palette);
        break;
      case 'line':
        track = line(t, ctx, palette);
        break;
      case 'features':
        track = features(t, ctx, palette);
        break;
      case 'secondary-structure':
        if (!isOwnSs(t)) track = ss(t, ctx);
        break;
      case 'sequence':
        out.letterColour = letterColours(t.colour, ctx, palette, codeAt);
        break;
    }
    if (track) where.push(track);
  });
  return out;
}

function letterColours(
  colour: string | undefined,
  ctx: SeriesContext,
  palette: TrackPalette,
  codeAt: (i: number) => string,
): ((i: number) => string | undefined) | null {
  if (colour === undefined || colour === 'none') return null;
  if (colour === 'lesk') return (i) => LESK_COLOURS[codeAt(i)];
  if (colour === 'chemistry') return (i) => palette.aminoAcids[codeAt(i)];
  const s = resolveSeries(colour, ctx);
  if (!s) return null;
  const colourOf = colourScale(palette.dataScale, extent([s.values]));
  return (i) => {
    const v = s.values[i];
    return isNum(v) ? colourOf(v) : typeof v === 'string' ? v : undefined;
  };
}
