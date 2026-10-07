/**
 * Per-residue data series drawn along the topology (issue #23): a colour per
 * residue, from a category (categorical colour map) or a number (numerical
 * colour scale), and a drawn width per residue relative to the normal width.
 *
 * Inputs are keyed by chain ID, then by author residue number:
 *
 *   residueColours = { A: { 45: 'K', 46: 'L' } }   // categorical
 *   residueColours = { A: { 45: 0.7, 46: 0.2 } }   // numerical
 *   residueWidths  = { A: { 45: 1.5, 46: 0 } }     // 1.5× width, line only
 *
 * Default colours are theme tokens (#26): the theme's `dataScale` and
 * `dataCategories`, exposed on the component host as CSS custom properties so
 * a page can also override them there.
 */

import { paint, TABLEAU_10, VIRIDIS } from '../theme/index.js';

/** Values keyed by chain ID, then author residue number. */
export type ResidueSeries<T> = Record<string, Record<string | number, T>>;

export type ResidueColourValues = ResidueSeries<string | number>;
export type ResidueWidthValues = ResidueSeries<number>;

/** Theme tokens for data colouring, with their default values. */
export const DATA_THEME_TOKENS = {
  /** Comma-separated colour stops of the default numerical scale (low → high). */
  scale: '--mp-data-scale',
  /** Comma-separated palette for categories with no colour of their own. */
  categories: '--mp-data-categories',
} as const;

/** Viridis, sampled at 9 stops: the built-in themes' numerical scale. */
export const DEFAULT_SCALE: readonly string[] = VIRIDIS;

/** Tableau 10: the built-in themes' categorical palette. */
export const DEFAULT_CATEGORIES: readonly string[] = TABLEAU_10;

/**
 * Colours for one-letter amino-acid codes, grouped by side-chain chemistry
 * (Clustal X-like): hydrophobic blue, aromatic teal, positive red, negative
 * magenta, polar green, Gly orange, Pro yellow, Cys pink. Used when every
 * category is an amino-acid letter and no colour is given for it.
 */
export const AMINO_ACID_COLOURS: Record<string, string> = {
  A: '#80a0f0',
  I: '#80a0f0',
  L: '#80a0f0',
  M: '#80a0f0',
  V: '#80a0f0',
  F: '#3fb5a8',
  W: '#3fb5a8',
  Y: '#3fb5a8',
  H: '#3fb5a8',
  K: '#f01505',
  R: '#f01505',
  D: '#c048c0',
  E: '#c048c0',
  N: '#15c015',
  Q: '#15c015',
  S: '#15c015',
  T: '#15c015',
  G: '#f09048',
  P: '#c0c000',
  C: '#f08080',
};

/** Parse a JSON attribute holding a residue series; null on absence or error. */
export function parseSeriesAttribute<T>(
  value: string | null,
  name: string,
): ResidueSeries<T> | null {
  if (value === null || value.trim() === '') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ResidueSeries<T>;
    }
  } catch {
    // fall through
  }
  console.warn(
    `topology-display: ignoring invalid ${name} (expected JSON {chain: {residue: value}})`,
  );
  return null;
}

/** A chain's values as a residue-number map, dropping unusable entries. */
function chainValues<T>(
  series: ResidueSeries<T> | null,
  chainId: string,
  ok: (v: unknown) => v is T,
): Map<number, T> {
  const out = new Map<number, T>();
  const values = series?.[chainId];
  if (!values || typeof values !== 'object') return out;
  for (const [k, v] of Object.entries(values)) {
    const resSeq = Number(k);
    if (Number.isInteger(resSeq) && ok(v)) out.set(resSeq, v);
  }
  return out;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isColourValue = (v: unknown): v is string | number =>
  isFiniteNumber(v) || (typeof v === 'string' && v !== '');

/**
 * Width multiplier per residue of one chain: 1 is the normal width, 0 a bare
 * line. Negative values count as 0.
 */
export function widthFactors(
  series: ResidueWidthValues | null,
  chainId: string,
): Map<number, number> {
  const out = new Map<number, number>();
  for (const [r, f] of chainValues(series, chainId, isFiniteNumber)) out.set(r, Math.max(0, f));
  return out;
}

// ── Colour parsing / interpolation ─────────────────────────────────────────

type Rgb = [number, number, number];

/** Parse `#rgb`, `#rrggbb` or `rgb(r, g, b)`; null for anything else. */
export function parseColour(c: string): Rgb | null {
  const s = c.trim().toLowerCase();
  let m = /^#([0-9a-f]{3})$/.exec(s);
  if (m) return [0, 1, 2].map((i) => parseInt(m![1][i] + m![1][i], 16)) as Rgb;
  m = /^#([0-9a-f]{6})$/.exec(s);
  if (m) return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16)) as Rgb;
  m = /^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/.exec(s);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return null;
}

function toHex([r, g, b]: Rgb): string {
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Colour at `t` ∈ [0, 1] along evenly spaced `stops` (sRGB interpolation). */
export function interpolateStops(stops: Rgb[], t: number): string {
  if (stops.length === 1) return toHex(stops[0]);
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = stops[i];
  const b = stops[i + 1];
  return toHex([a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]), a[2] + f * (b[2] - a[2])]);
}

/** Split a comma list, keeping commas inside `rgb(…)`. */
function splitList(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of value) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s !== '');
}

// ── Colour scale resolution ────────────────────────────────────────────────

/** Theme defaults, already read from the host's CSS custom properties. */
export interface DataTheme {
  scale: readonly string[];
  categories: readonly string[];
}

/**
 * Read the data-colour tokens from `host`, falling back to `fallback` (the
 * component's theme; the built-in palettes by default).
 */
export function readDataTheme(
  host: Element,
  fallback: DataTheme = { scale: DEFAULT_SCALE, categories: DEFAULT_CATEGORIES },
): DataTheme {
  let style: CSSStyleDeclaration | null = null;
  try {
    style = getComputedStyle(host);
  } catch {
    style = null;
  }
  const token = (name: string, fallback: readonly string[]): readonly string[] => {
    const list = splitList(style?.getPropertyValue(name) ?? '');
    return list.length > 0 ? list : fallback;
  };
  return {
    scale: token(DATA_THEME_TOKENS.scale, fallback.scale),
    categories: token(DATA_THEME_TOKENS.categories, fallback.categories),
  };
}

/** Options from the `colour-scale`, `colour-domain` and `colour-label` attributes. */
export interface ColourOptions {
  /** `colour-scale`: colour stops (numerical) or `key:colour` pairs (categorical). */
  scale: string | null;
  /** `colour-domain`: "min,max" of the numerical scale. */
  domain: string | null;
  /** `colour-label`: legend title. */
  label: string | null;
}

export interface CategoricalColouring {
  kind: 'categorical';
  colourOf: Map<string, string>;
  /** Categories in legend order. */
  categories: string[];
  label: string | null;
}

export interface NumericalColouring {
  kind: 'numerical';
  stops: string[];
  min: number;
  max: number;
  label: string | null;
}

export type Colouring = (CategoricalColouring | NumericalColouring) & {
  /** Residue colour of one chain, or undefined where it has no value. */
  residueColour(chainId: string, resSeq: number): string | undefined;
};

/**
 * Resolve the colour series into a colour per residue. A series is numerical
 * when every value is a number, categorical otherwise (numbers then count as
 * category names). The domain and categories span every chain, so a residue
 * keeps its colour when another chain is shown. Returns null with no data.
 */
export function resolveColouring(
  series: ResidueColourValues | null,
  options: ColourOptions,
  theme: DataTheme,
): Colouring | null {
  if (!series || typeof series !== 'object') return null;
  const perChain = new Map<string, Map<number, string | number>>();
  for (const chainId of Object.keys(series)) {
    const m = chainValues(series, chainId, isColourValue);
    if (m.size > 0) perChain.set(chainId, m);
  }
  if (perChain.size === 0) return null;
  const all = [...perChain.values()].flatMap((m) => [...m.values()]);
  const label = options.label?.trim() || null;

  if (all.every(isFiniteNumber)) {
    const nums = all as number[];
    let min = Math.min(...nums);
    let max = Math.max(...nums);
    const dom = options.domain ? splitList(options.domain).map(Number) : [];
    if (dom.length === 2 && dom.every(Number.isFinite) && dom[0] !== dom[1]) {
      [min, max] = dom;
    } else if (options.domain) {
      console.warn(`topology-display: ignoring invalid colour-domain "${options.domain}"`);
    }
    let stops = theme.scale;
    if (options.scale) {
      const given = splitList(options.scale);
      if (given.length > 0 && given.every((c) => parseColour(c))) stops = given;
      else
        console.warn(
          `topology-display: ignoring colour-scale "${options.scale}" (use hex or rgb() colours)`,
        );
    }
    let rgb = stops.map(parseColour).filter((c): c is Rgb => c !== null);
    if (rgb.length === 0) {
      stops = DEFAULT_SCALE;
      rgb = stops.map((c) => parseColour(c)!);
    }
    const span = max - min;
    return {
      kind: 'numerical',
      stops: rgb.map(toHex),
      min,
      max,
      label,
      residueColour(chainId, resSeq) {
        const v = perChain.get(chainId)?.get(resSeq);
        return v === undefined
          ? undefined
          : interpolateStops(rgb, ((v as number) - min) / span || 0);
      },
    };
  }

  const given = new Map<string, string>();
  if (options.scale) {
    for (const pair of splitList(options.scale)) {
      const i = pair.indexOf(':');
      if (i > 0) given.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim());
    }
  }
  const names = [...new Set(all.map(String))];
  const aminoAcids = names.every((n) => n.toUpperCase() in AMINO_ACID_COLOURS);
  const aaOrder = Object.keys(AMINO_ACID_COLOURS);
  const categories = aminoAcids
    ? names.sort((a, b) => aaOrder.indexOf(a.toUpperCase()) - aaOrder.indexOf(b.toUpperCase()))
    : names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const colourOf = new Map<string, string>();
  let next = 0;
  for (const c of categories) {
    const colour =
      given.get(c) ??
      (aminoAcids
        ? AMINO_ACID_COLOURS[c.toUpperCase()]
        : theme.categories[next++ % theme.categories.length]);
    colourOf.set(c, colour);
  }
  return {
    kind: 'categorical',
    colourOf,
    categories,
    label,
    residueColour(chainId, resSeq) {
      const v = perChain.get(chainId)?.get(resSeq);
      return v === undefined ? undefined : colourOf.get(String(v));
    },
  };
}

// ── Legend ─────────────────────────────────────────────────────────────────

const SVG_NS = 'http://www.w3.org/2000/svg';

const LEGEND = {
  fontSizePx: 11,
  barWidthPx: 160,
  barHeightPx: 10,
  swatchPx: 10,
  rowGapPx: 6,
  itemGapPx: 12,
};

function text(x: number, y: number, s: string, anchor = 'start'): SVGTextElement {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', x.toFixed(1));
  t.setAttribute('y', y.toFixed(1));
  t.setAttribute('font-size', String(LEGEND.fontSizePx));
  t.setAttribute('text-anchor', anchor);
  t.setAttribute('dominant-baseline', 'hanging');
  t.textContent = s;
  return t;
}

/**
 * Tick label for a scale spanning `range`: rounded to about three significant
 * figures of the range, so ticks on [−1, 1] read −1, 0, 1 rather than carrying
 * float noise.
 */
export function formatTick(v: number, range: number): string {
  const decimals = range > 0 ? Math.max(0, 2 - Math.floor(Math.log10(range))) : 3;
  const r = Number(v.toFixed(Math.min(decimals, 20)));
  return String(r === 0 ? 0 : r);
}

/**
 * Draw the colour legend at the origin of a new group, wrapping categorical
 * swatches to `maxWidth`. Returns the group and its height in pixels.
 */
export function renderLegend(
  colouring: Colouring,
  maxWidth: number,
  idPrefix: string,
): { group: SVGGElement; height: number } {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'colour-legend');
  // Painted when the diagram is themed (see paint / repaint).
  paint(g, { fill: 'label', 'font-family': 'fontFamily' });
  g.setAttribute('role', 'img');
  const fs = LEGEND.fontSizePx;
  let y = 0;
  if (colouring.label) {
    const t = text(0, y, colouring.label);
    t.setAttribute('font-weight', 'bold');
    g.appendChild(t);
    y += fs + LEGEND.rowGapPx;
  }

  if (colouring.kind === 'numerical') {
    const id = `${idPrefix}-scale`;
    const defs = document.createElementNS(SVG_NS, 'defs');
    const grad = document.createElementNS(SVG_NS, 'linearGradient');
    grad.setAttribute('id', id);
    colouring.stops.forEach((c, i) => {
      const stop = document.createElementNS(SVG_NS, 'stop');
      const n = colouring.stops.length;
      stop.setAttribute('offset', n > 1 ? `${((i / (n - 1)) * 100).toFixed(1)}%` : '0%');
      stop.setAttribute('stop-color', c);
      grad.appendChild(stop);
    });
    defs.appendChild(grad);
    g.appendChild(defs);
    const w = Math.min(LEGEND.barWidthPx, Math.max(60, maxWidth));
    const bar = document.createElementNS(SVG_NS, 'rect');
    bar.setAttribute('x', '0');
    bar.setAttribute('y', y.toFixed(1));
    bar.setAttribute('width', String(w));
    bar.setAttribute('height', String(LEGEND.barHeightPx));
    bar.setAttribute('fill', `url(#${id})`);
    paint(bar, { stroke: 'label' });
    bar.setAttribute('stroke-width', '0.5');
    g.appendChild(bar);
    y += LEGEND.barHeightPx + 3;
    const range = Math.abs(colouring.max - colouring.min);
    const lo = formatTick(colouring.min, range);
    const hi = formatTick(colouring.max, range);
    g.append(
      text(0, y, lo),
      text(w / 2, y, formatTick((colouring.min + colouring.max) / 2, range), 'middle'),
      text(w, y, hi, 'end'),
    );
    y += fs;
    g.setAttribute('aria-label', `${colouring.label ?? 'Colour scale'}: ${lo} to ${hi}`);
    return { group: g, height: y };
  }

  let x = 0;
  const rowH = Math.max(fs, LEGEND.swatchPx);
  for (const cat of colouring.categories) {
    const w = LEGEND.swatchPx + 4 + cat.length * fs * 0.6;
    if (x > 0 && x + w > maxWidth) {
      x = 0;
      y += rowH + LEGEND.rowGapPx;
    }
    const sw = document.createElementNS(SVG_NS, 'rect');
    sw.setAttribute('x', x.toFixed(1));
    sw.setAttribute('y', (y + (rowH - LEGEND.swatchPx) / 2).toFixed(1));
    sw.setAttribute('width', String(LEGEND.swatchPx));
    sw.setAttribute('height', String(LEGEND.swatchPx));
    sw.setAttribute('fill', colouring.colourOf.get(cat)!);
    paint(sw, { stroke: 'label' });
    sw.setAttribute('stroke-width', '0.5');
    g.append(sw, text(x + LEGEND.swatchPx + 4, y, cat));
    x += w + LEGEND.itemGapPx;
  }
  y += rowH;
  g.setAttribute(
    'aria-label',
    `${colouring.label ?? 'Colour key'}: ${colouring.categories.join(', ')}`,
  );
  return { group: g, height: y };
}

// ── Geometry helpers ───────────────────────────────────────────────────────

/**
 * Per-residue spans of a run of samples: residue k covers the sample-index
 * range from halfway after the previous residue to halfway before the next,
 * clamped to [lo, hi]. Returns spans in fractional sample index; empty spans
 * are dropped.
 */
export function residueSpans(
  residues: { resSeq: number; sampleIndex: number }[],
  lo: number,
  hi: number,
): { resSeq: number; from: number; to: number }[] {
  const out: { resSeq: number; from: number; to: number }[] = [];
  for (let k = 0; k < residues.length; k++) {
    const si = residues[k].sampleIndex;
    const from = k === 0 ? lo : (residues[k - 1].sampleIndex + si) / 2;
    const to = k === residues.length - 1 ? hi : (si + residues[k + 1].sampleIndex) / 2;
    const a = Math.max(lo, from);
    const b = Math.min(hi, to);
    if (b > a) out.push({ resSeq: residues[k].resSeq, from: a, to: b });
  }
  return out;
}

/**
 * Smooth curve through (xs[i], ys[i]) — monotone cubic (Fritsch–Carlson), so
 * it never overshoots between points: widths stay within the residues' range
 * and never dip below 0. Held flat beyond the first and last point. `xs` must
 * be increasing.
 */
export function monotoneCubic(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 0) return () => 1;
  if (n === 1) return () => ys[0];
  const h: number[] = [];
  const delta: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    delta.push(h[i] > 0 ? (ys[i + 1] - ys[i]) / h[i] : 0);
  }
  const m = new Array<number>(n);
  m[0] = delta[0];
  m[n - 1] = delta[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i];
    const b = m[i + 1] / delta[i];
    const r = a * a + b * b;
    if (r > 9) {
      const t = 3 / Math.sqrt(r);
      m[i] = t * a * delta[i];
      m[i + 1] = t * b * delta[i];
    }
  }
  return (x: number): number => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    if (h[i] <= 0) return ys[i];
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h[i] * m[i + 1]
    );
  };
}

/**
 * Smooth width-multiplier profile over sample index, through each residue's
 * factor at its sample (residues with no value count as 1).
 */
export function widthProfile(
  residues: { resSeq: number; sampleIndex: number }[],
  factors: Map<number, number>,
): (sample: number) => number {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const r of residues) {
    // Duplicate sample positions can't carry two values; keep the first.
    if (xs.length > 0 && r.sampleIndex <= xs[xs.length - 1]) continue;
    xs.push(r.sampleIndex);
    ys.push(factors.get(r.resSeq) ?? 1);
  }
  return monotoneCubic(xs, ys);
}

/** A point along a polyline, with its distance from the start. */
interface PolyPoint {
  x: number;
  y: number;
  d: number;
}

/** Cumulative distances along a polyline. */
export function measure(points: { x: number; y: number }[]): PolyPoint[] {
  let d = 0;
  return points.map((p, i) => {
    if (i > 0) d += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    return { x: p.x, y: p.y, d };
  });
}

/** The part of a measured polyline between distances `a` and `b`. */
export function slicePolyline(poly: PolyPoint[], a: number, b: number): { x: number; y: number }[] {
  const at = (d: number): { x: number; y: number } => {
    for (let i = 1; i < poly.length; i++) {
      if (poly[i].d >= d) {
        const s = poly[i].d - poly[i - 1].d;
        const t = s > 0 ? (d - poly[i - 1].d) / s : 0;
        return {
          x: poly[i - 1].x + t * (poly[i].x - poly[i - 1].x),
          y: poly[i - 1].y + t * (poly[i].y - poly[i - 1].y),
        };
      }
    }
    const last = poly[poly.length - 1];
    return { x: last.x, y: last.y };
  };
  const out = [at(a)];
  for (const p of poly) if (p.d > a && p.d < b) out.push({ x: p.x, y: p.y });
  out.push(at(b));
  return out;
}

/** Left and right edges of a ribbon at one vertex of its centreline. */
interface RibbonPoint {
  d: number;
  l: { x: number; y: number };
  r: { x: number; y: number };
}

/**
 * Offset a measured polyline either side by `halfWidthAt(d)` to give a ribbon
 * of varying width, with per-vertex normals averaged across the neighbouring
 * segments so the edges bend smoothly.
 */
export function ribbon(poly: PolyPoint[], halfWidthAt: (d: number) => number): RibbonPoint[] {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[Math.max(0, i - 1)];
    const b = poly[Math.min(n - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const hw = halfWidthAt(p.d);
    return {
      d: p.d,
      l: { x: p.x + nx * hw, y: p.y + ny * hw },
      r: { x: p.x - nx * hw, y: p.y - ny * hw },
    };
  });
}

/**
 * The closed outline of a ribbon between distances `a` and `b`. Slices of
 * adjacent ranges share their boundary edge exactly, so they tile the ribbon.
 */
export function ribbonSlice(rib: RibbonPoint[], a: number, b: number): { x: number; y: number }[] {
  const at = (d: number): { l: { x: number; y: number }; r: { x: number; y: number } } => {
    for (let i = 1; i < rib.length; i++) {
      if (rib[i].d >= d) {
        const s = rib[i].d - rib[i - 1].d;
        const t = s > 0 ? (d - rib[i - 1].d) / s : 0;
        const lerp = (p: { x: number; y: number }, q: { x: number; y: number }) => ({
          x: p.x + t * (q.x - p.x),
          y: p.y + t * (q.y - p.y),
        });
        return { l: lerp(rib[i - 1].l, rib[i].l), r: lerp(rib[i - 1].r, rib[i].r) };
      }
    }
    const last = rib[rib.length - 1];
    return { l: last.l, r: last.r };
  };
  const start = at(a);
  const end = at(b);
  const inner = rib.filter((p) => p.d > a && p.d < b);
  return [
    start.l,
    ...inner.map((p) => p.l),
    end.l,
    end.r,
    ...inner.reverse().map((p) => p.r),
    start.r,
  ];
}
