/**
 * Draws the data tracks (issue #83) of one row of the sequence view: heatmaps,
 * stacked areas, line plots, feature bars and secondary-structure strips,
 * with their labels, legends and axes in the left gutter.
 */

import { area as d3area, curveLinear, curveMonotoneX, line as d3line } from 'd3-shape';
import { paint, type Paint, type Theme } from '../theme/index.js';
import { TRACK, plotHeight, trackHeight, wrapLabel, type Gutter } from '../tracks/geometry.js';
import type {
  AreaTrack,
  ColourBar,
  FeaturesTrack,
  HeatmapTrack,
  LineTrack,
  RenderTrack,
  SsTrack,
} from '../tracks/resolve.js';
import { SEQ, type SeqRow, type SequenceLayout } from './layout.js';
import type { SeqResidue } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** A tick or legend number: three significant figures, no float noise. */
export function formatNumber(v: number): string {
  const r = Number(v.toPrecision(3));
  return String(Object.is(r, -0) ? 0 : r);
}

/** What every track of a row is drawn against. */
interface RowFrame {
  g: Element;
  theme: Theme;
  layout: SequenceLayout;
  row: SeqRow;
  residues: SeqResidue[];
  gutter: Gutter;
}

function add<E extends Element>(f: RowFrame, e: E, tokens?: Paint, parent: Element = f.g): E {
  if (tokens) paint(e, tokens, f.theme);
  parent.appendChild(e);
  return e;
}

function text(
  f: RowFrame,
  x: number,
  y: number,
  s: string,
  anchor: 'start' | 'middle' | 'end' = 'end',
  size = TRACK.fontPx,
): SVGTextElement {
  const t = el('text', {
    x: x.toFixed(2),
    y: y.toFixed(2),
    'text-anchor': anchor,
    'font-size': size,
  });
  t.textContent = s;
  return add(f, t, { fill: 'textMuted', 'font-family': 'fontFamily' });
}

/** Left and right edge of residue `i`'s step: halfway to its neighbours in the row. */
function edges(f: RowFrame, i: number): [number, number] {
  const { x } = f.layout;
  const half = SEQ.cellPx / 2;
  const l = i > f.row.first ? (x[i - 1] + x[i]) / 2 : x[i] - half;
  const r = i < f.row.last ? (x[i] + x[i + 1]) / 2 : x[i] + half;
  return [l, r];
}

/** A label right-aligned in the gutter, wrapped and centred on `cy`. */
function label(f: RowFrame, s: string, cy: number): void {
  const lines = wrapLabel(s);
  const t = text(f, f.gutter.labelRight, 0, '');
  t.removeAttribute('y');
  const y0 = cy - ((lines.length - 1) * TRACK.lineHeightPx) / 2 + 3;
  lines.forEach((line, k) => {
    const span = el('tspan', {
      x: f.gutter.labelRight.toFixed(2),
      y: (y0 + k * TRACK.lineHeightPx).toFixed(2),
    });
    span.textContent = line;
    t.appendChild(span);
  });
  const title = el('title');
  title.textContent = s;
  t.appendChild(title);
}

/** Plot extent of the row (px). */
function rowSpan(f: RowFrame): [number, number] {
  const { x } = f.layout;
  return [x[f.row.first] - SEQ.cellPx / 2, x[f.row.last] + SEQ.cellPx / 2];
}

function colourBar(f: RowFrame, bar: ColourBar, top: number, height: number): void {
  const x = f.gutter.legendX;
  const n = 24;
  const h = height / n;
  // Low at the bottom: segments rather than a gradient, which would need a document-unique id.
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const pos = t * (bar.stops.length - 1);
    const c = bar.stops[Math.round(pos)];
    f.g.appendChild(
      el('rect', {
        x,
        y: (top + height - (k + 1) * h).toFixed(2),
        width: TRACK.barPx,
        height: (h + 0.3).toFixed(2),
        fill: c,
      }),
    );
  }
  const unit = bar.unit ? ` ${bar.unit}` : '';
  text(f, x + TRACK.barPx + 3, top + 6, `${formatNumber(bar.domain[1])}${unit}`, 'start', 7.5);
  text(f, x + TRACK.barPx + 3, top + height, formatNumber(bar.domain[0]), 'start', 7.5);
}

function swatches(f: RowFrame, items: { label: string; colour: string }[], top: number): void {
  items.forEach((item, k) => {
    const y = top + k * TRACK.lineHeightPx;
    f.g.appendChild(
      el('rect', {
        x: f.gutter.legendX,
        y: y.toFixed(2),
        width: TRACK.swatchPx,
        height: TRACK.swatchPx - 2,
        fill: item.colour,
      }),
    );
    text(
      f,
      f.gutter.legendX + TRACK.swatchPx + 3,
      y + TRACK.swatchPx - 2,
      item.label,
      'start',
      7.5,
    );
  });
}

/** A y-axis at the plot's left edge with labelled ticks. */
function yAxis(
  f: RowFrame,
  ticks: { v: number; y: number; label: string }[],
  top: number,
  height: number,
): void {
  const x = rowSpan(f)[0] - 3;
  add(f, el('line', { x1: x, x2: x, y1: top, y2: top + height }), {
    stroke: 'textMuted',
  }).setAttribute('stroke-width', '0.75');
  for (const t of ticks) {
    add(f, el('line', { x1: x - 3, x2: x, y1: t.y.toFixed(2), y2: t.y.toFixed(2) }), {
      stroke: 'textMuted',
    }).setAttribute('stroke-width', '0.75');
    text(f, f.gutter.axisRight, t.y + 3, t.label, 'end', 7.5);
  }
}

function residueAxis(f: RowFrame, top: number): void {
  const [xa, xb] = rowSpan(f);
  const y = top + 2;
  add(f, el('line', { x1: xa, x2: xb, y1: y, y2: y }), { stroke: 'textMuted' }).setAttribute(
    'stroke-width',
    '0.75',
  );
  for (let i = f.row.first; i <= f.row.last; i++) {
    const r = f.residues[i];
    const major = r.resSeq % 10 === 0 && r.iCode === '';
    if (!major && r.resSeq % 2 !== 0) continue;
    const x = f.layout.x[i];
    add(f, el('line', { x1: x, x2: x, y1: y, y2: y + (major ? 4 : 2) }), {
      stroke: 'textMuted',
    }).setAttribute('stroke-width', '0.75');
    if (major) text(f, x, y + 12, String(r.resSeq), 'middle', 8);
  }
}

function heatmap(f: RowFrame, t: HeatmapTrack, top: number): void {
  const [xa, xb] = rowSpan(f);
  const height = plotHeight(t);
  const bg = el('rect', { x: xa, y: top, width: xb - xa, height, 'fill-opacity': 0.6 });
  add(f, bg, { fill: 'surface', stroke: 'border' }).setAttribute('stroke-width', '0.5');
  let y = top;
  for (const r of t.rows) {
    if (r === 'divider') {
      add(f, el('line', { x1: xa, x2: xb, y1: y + 1.5, y2: y + 1.5 }), {
        stroke: 'textMuted',
      }).setAttribute('stroke-width', '0.75');
      y += 3;
      continue;
    }
    for (let i = f.row.first; i <= f.row.last; i++) {
      const c = r.colours[i];
      if (!c) continue;
      f.g.appendChild(
        el('rect', {
          x: (f.layout.x[i] - SEQ.cellPx / 2).toFixed(2),
          y: y.toFixed(2),
          width: SEQ.cellPx,
          height: t.rowHeight,
          fill: c,
        }),
      );
    }
    if (t.rowHeight >= 6) label(f, r.label, y + t.rowHeight / 2);
    y += t.rowHeight;
  }
  if (t.legend) colourBar(f, t.legend, top, height);
}

/** Points along the row for values `v`: a flat step per residue, or a smooth curve through centres. */
function rowPoints(f: RowFrame, v: number[], curve: 'step' | 'smooth'): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = f.row.first; i <= f.row.last; i++) {
    if (curve === 'smooth') pts.push([f.layout.x[i], v[i]]);
    else {
      const [l, r] = edges(f, i);
      pts.push([l, v[i]], [r, v[i]]);
    }
  }
  return pts;
}

function yScale(domain: [number, number], top: number, height: number): (v: number) => number {
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  return (v) => top + height - ((v - lo) / span) * height;
}

function areaTrack(f: RowFrame, t: AreaTrack, top: number): void {
  const y = yScale(t.domain, top, t.height);
  const curve = t.curve === 'smooth' ? curveMonotoneX : curveLinear;
  for (const layer of t.layers) {
    const lo = rowPoints(f, layer.y0, t.curve);
    const hi = rowPoints(f, layer.y1, t.curve);
    const path = d3area<number>()
      .x((k) => lo[k][0])
      .y0((k) => y(lo[k][1]))
      .y1((k) => y(hi[k][1]))
      .curve(curve)(lo.map((_, k) => k));
    if (!path) continue;
    f.g.appendChild(
      el('path', {
        d: path,
        fill: layer.colour,
        'fill-opacity': 0.85,
        stroke: layer.colour,
        'stroke-width': 0.5,
      }),
    );
  }
  if (t.domain[0] < 0) {
    const [xa, xb] = rowSpan(f);
    add(f, el('line', { x1: xa, x2: xb, y1: y(0), y2: y(0) }), {
      stroke: 'textMuted',
    }).setAttribute('stroke-width', '0.5');
  }
  if (t.axis) {
    const ends = t.domain[0] < 0 ? [t.domain[0], 0, t.domain[1]] : [0, t.domain[1]];
    yAxis(
      f,
      ends.map((v) => ({ v, y: y(v), label: formatNumber(Math.abs(v)) })),
      top,
      t.height,
    );
  }
  if (t.label) label(f, t.label, top + t.height / 2);
  if (t.legend)
    swatches(
      f,
      t.layers.map((l) => ({ label: l.label, colour: l.colour })),
      top,
    );
}

function lineTrack(f: RowFrame, t: LineTrack, top: number): void {
  const y = yScale(t.domain, top, t.height);
  const clamp = (v: number) => Math.max(top, Math.min(top + t.height, y(v)));
  const curve = t.curve === 'smooth' ? curveMonotoneX : curveLinear;
  const draw = (
    values: number[],
    tokens: Paint | null,
    colour: string | null,
    width: number,
  ): void => {
    const pts = rowPoints(f, values, t.curve);
    const d = d3line<[number, number]>()
      .defined((p) => Number.isFinite(p[1]))
      .x((p) => p[0])
      .y((p) => clamp(p[1]))
      .curve(curve)(pts);
    if (!d) return;
    const path = el('path', { d, fill: 'none', 'stroke-width': width, 'stroke-linejoin': 'round' });
    if (colour) path.setAttribute('stroke', colour);
    if (tokens) add(f, path, tokens);
    else f.g.appendChild(path);
  };
  for (const r of t.references) {
    draw(r.values, { stroke: 'textMuted' }, null, 1);
    // The reference's label sits on it at the start of the row.
    const first = r.values.slice(f.row.first, f.row.last + 1).findIndex(Number.isFinite);
    if (r.label && first >= 0) {
      const i = f.row.first + first;
      text(f, f.layout.x[i] + 2, clamp(r.values[i]) - 2, r.label, 'start', 7.5);
    }
  }
  for (const l of t.lines) draw(l.values, null, l.colour, 1.5);
  if (t.axis)
    yAxis(
      f,
      t.ticks.map((v) => ({ v, y: y(v), label: formatNumber(v) })),
      top,
      t.height,
    );
  if (t.label) label(f, t.label, top + t.height / 2);
  if (t.legend)
    swatches(
      f,
      t.lines.map((l) => ({ label: l.label, colour: l.colour })),
      top,
    );
}

function featuresTrack(f: RowFrame, t: FeaturesTrack, top: number): void {
  for (const b of t.features) {
    if (b.to < f.row.first || b.from > f.row.last) continue;
    const from = Math.max(b.from, f.row.first);
    const to = Math.min(b.to, f.row.last);
    const xa = f.layout.x[from] - SEQ.cellPx / 2;
    const xb = f.layout.x[to] + SEQ.cellPx / 2;
    const y = top + b.lane * TRACK.featureLanePx;
    f.g.appendChild(
      el('rect', {
        x: xa.toFixed(2),
        y: (y + 8).toFixed(2),
        width: (xb - xa).toFixed(2),
        height: 5,
        rx: 1.5,
        fill: b.colour,
      }),
    );
    // The label goes where the feature starts (or carries on, on later rows).
    if (b.label && (from === b.from || from === f.row.first))
      text(f, xa, y + 7, b.label, 'start', 7.5);
  }
  if (t.label) label(f, t.label, top + plotHeight(t) / 2);
}

function ssTrack(f: RowFrame, t: SsTrack, top: number): void {
  const cy = top + TRACK.ssPx / 2;
  let i = f.row.first;
  while (i <= f.row.last) {
    const type = t.types[i];
    let j = i;
    while (j + 1 <= f.row.last && t.types[j + 1] === type) j++;
    const xa = f.layout.x[i] - SEQ.cellPx / 2;
    const xb = f.layout.x[j] + SEQ.cellPx / 2;
    if (type === 'helix') {
      add(f, el('rect', { x: xa, y: cy - 4, width: xb - xa, height: 8, rx: 2 }), {
        fill: 'helix',
        stroke: 'helixEdge',
        'stroke-width': 'outlineWidth',
      });
    } else if (type === 'strand') {
      const head = Math.min(6, (xb - xa) / 2);
      const pts = [
        [xa, cy - 3],
        [xb - head, cy - 3],
        [xb - head, cy - 6],
        [xb, cy],
        [xb - head, cy + 6],
        [xb - head, cy + 3],
        [xa, cy + 3],
      ];
      add(
        f,
        el('polygon', { points: pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ') }),
        {
          fill: 'strand',
          stroke: 'strandEdge',
          'stroke-width': 'outlineWidth',
        },
      );
    } else if (type === 'coil') {
      add(f, el('line', { x1: xa, x2: xb, y1: cy, y2: cy }), {
        stroke: 'loop',
        'stroke-width': 'loopWidth',
      });
    }
    i = j + 1;
  }
  if (t.label) label(f, t.label, cy);
}

/**
 * Draw `tracks` for `row`, top to bottom from `top`, into `g`. Returns the
 * height used.
 */
export function drawTracks(
  g: Element,
  tracks: RenderTrack[],
  top: number,
  frame: Omit<RowFrame, 'g'>,
): number {
  const f: RowFrame = { ...frame, g };
  let y = top;
  tracks.forEach((t, k) => {
    if (k > 0) y += TRACK.gapPx;
    switch (t.kind) {
      case 'heatmap':
        heatmap(f, t, y);
        break;
      case 'area':
        areaTrack(f, t, y);
        break;
      case 'line':
        lineTrack(f, t, y);
        break;
      case 'features':
        featuresTrack(f, t, y);
        break;
      case 'ss':
        ssTrack(f, t, y);
        break;
    }
    if (t.residueAxis) residueAxis(f, y + plotHeight(t));
    y += trackHeight(t);
  });
  return y - top;
}
