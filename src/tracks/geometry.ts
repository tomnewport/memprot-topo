/**
 * Sizes of the data tracks in the sequence view (issue #83): how tall each
 * track is and how wide the left gutter must be for their labels, legends
 * and axes. Text widths are estimated from character counts, so this stays
 * DOM-free.
 */

import type { RenderTrack } from './resolve.js';

export const TRACK = {
  /** Space between tracks, and between the tracks and the letters. */
  gapPx: 6,
  /** A residue-number axis under a track. */
  axisPx: 14,
  /** Label font size, and the estimated width of one character in it. */
  fontPx: 8.5,
  charPx: 4.8,
  lineHeightPx: 10,
  /** Labels wrap at about this many characters. */
  wrapChars: 24,
  /** Room for a y-axis's tick labels. */
  yAxisPx: 24,
  /** Colour bar width, and swatch size. */
  barPx: 6,
  swatchPx: 8,
  /** One lane of a features track. */
  featureLanePx: 14,
  /** Secondary-structure track. */
  ssPx: 14,
  /** The gutter is never narrower than the plain sequence view's. */
  minGutterPx: 52,
  maxLabelPx: 150,
};

/** Split a label into lines of about `TRACK.wrapChars`, at spaces where it can. */
export function wrapLabel(text: string, chars = TRACK.wrapChars): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && cur.length + 1 + w.length > chars) {
      lines.push(cur);
      cur = w;
    } else cur = cur ? `${cur} ${w}` : w;
  }
  if (cur) lines.push(cur);
  return lines;
}

const textPx = (s: string): number => s.length * TRACK.charPx;

/** Height of a track's plot (without its residue axis). */
export function plotHeight(t: RenderTrack): number {
  switch (t.kind) {
    case 'heatmap':
      return t.rows.reduce((h, r) => h + (r === 'divider' ? 3 : t.rowHeight), 0);
    case 'area':
    case 'line':
      return t.height;
    case 'features':
      return t.lanes * TRACK.featureLanePx;
    case 'ss':
      return TRACK.ssPx;
  }
}

/** Height of a track including its residue axis. */
export function trackHeight(t: RenderTrack): number {
  return plotHeight(t) + (t.residueAxis ? TRACK.axisPx : 0);
}

/** Height of a stack of tracks with gaps between them (0 for none). */
export function stackHeight(tracks: RenderTrack[]): number {
  if (tracks.length === 0) return 0;
  return tracks.reduce((h, t) => h + trackHeight(t), 0) + (tracks.length - 1) * TRACK.gapPx;
}

/** Labels shown beside a track: its own, or one per heatmap row. */
export function trackLabels(t: RenderTrack): string[] {
  if (t.kind === 'heatmap') {
    return t.rows.filter((r) => r !== 'divider').map((r) => (r as { label: string }).label);
  }
  return t.label ? [t.label] : [];
}

/** Width of a track's legend in the gutter (0 when it has none). */
export function legendWidth(t: RenderTrack): number {
  const fmt = (v: number) => String(Number(v.toPrecision(3)));
  if (t.kind === 'heatmap' && t.legend) {
    const [lo, hi] = t.legend.domain;
    return (
      TRACK.barPx + 3 + Math.max(textPx(fmt(lo)), textPx(fmt(hi)), textPx(t.legend.unit ?? ''))
    );
  }
  if ((t.kind === 'area' && t.legend) || (t.kind === 'line' && t.legend)) {
    const labels = t.kind === 'area' ? t.layers.map((l) => l.label) : t.lines.map((l) => l.label);
    return TRACK.swatchPx + 3 + Math.max(0, ...labels.map(textPx));
  }
  return 0;
}

/** Left-gutter columns: legends, then labels, then y-axis ticks, then the plot. */
export interface Gutter {
  /** Total width. */
  width: number;
  /** Left edge of the legends. */
  legendX: number;
  /** Right edge of the labels (they are right-aligned). */
  labelRight: number;
  /** Right edge of the y-axis tick labels. */
  axisRight: number;
}

export function gutterFor(tracks: RenderTrack[]): Gutter {
  const legend = Math.max(0, ...tracks.map(legendWidth));
  const label = Math.min(
    TRACK.maxLabelPx,
    Math.max(
      0,
      ...tracks.flatMap((t) =>
        (t.kind === 'heatmap' ? trackLabels(t) : trackLabels(t).flatMap((l) => wrapLabel(l))).map(
          textPx,
        ),
      ),
    ),
  );
  const axis = tracks.some((t) => (t.kind === 'area' || t.kind === 'line') && t.axis)
    ? TRACK.yAxisPx
    : 0;
  const legendX = 4;
  const labelRight = legendX + legend + (legend > 0 ? 8 : 0) + label;
  const axisRight = labelRight + (axis > 0 ? 4 + axis : 0);
  const width = Math.max(TRACK.minGutterPx, Math.ceil(axisRight + 8));
  // Labels hug the plot when the gutter's minimum width leaves room.
  const shift = width - Math.ceil(axisRight + 8);
  return {
    width,
    legendX: legendX + shift,
    labelRight: labelRight + shift,
    axisRight: axisRight + shift,
  };
}
