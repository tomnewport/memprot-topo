/**
 * Word-wrapped layout of the sequence view: residues in rows of a whole
 * number of ten-residue blocks, each row carrying the one-letter codes, the
 * secondary-structure cartoon, and one lane per data series beneath.
 */

/** Fixed geometry of a row (px). */
export const SEQ = {
  /** Width of one residue. */
  cellPx: 11,
  /** Residues per block, and the extra gap between blocks. */
  blockSize: 10,
  blockGapPx: 7,
  /** Room for the row's first residue number (and lane labels). */
  gutterLeftPx: 52,
  gutterRightPx: 12,
  topPx: 10,
  /** One-letter codes: baseline below the row top, font size. */
  letterBaselinePx: 10,
  letterFontPx: 11,
  /** Centre of the cartoon below the row top. */
  cartoonPx: 21,
  /** Membrane shading behind the letters and cartoon, from the row top. */
  bandTopPx: -1,
  bandHeightPx: 29,
  /** Data lanes start this far below the row top. */
  lanesPx: 32,
  laneHeightPx: 16,
  laneGapPx: 3,
  rowGapPx: 14,
  /** Residues per row when the width is unknown. */
  fallbackPerRow: 50,
};

/** One row of the wrapped sequence. */
export interface SeqRow {
  /** First and last residue index in the row. */
  first: number;
  last: number;
  /** Top of the row's letters and cartoon (px); data tracks may sit above it. */
  y: number;
}

/** Room around each row for data tracks (issue #83), and the left gutter's width. */
export interface RowExtras {
  /** Height of the tracks above the letters (px, gap included). */
  above: number;
  /** Height of the tracks below the lanes (px, gap included). */
  below: number;
  gutterLeft: number;
}

export const NO_EXTRAS: RowExtras = { above: 0, below: 0, gutterLeft: SEQ.gutterLeftPx };

export interface SequenceLayout {
  perRow: number;
  rows: SeqRow[];
  /** Centre x of each residue's cell, and its row. */
  x: number[];
  row: number[];
  laneCount: number;
  width: number;
  height: number;
  /** Track room and gutter the layout was made with. */
  extras: RowExtras;
}

/**
 * Residues per row: `wrap` when given (rounded up to a whole block where it is
 * at least a block), otherwise as many whole blocks as fit in `width`.
 */
export function residuesPerRow(
  width: number | null,
  wrap: number | null,
  gutterLeft = SEQ.gutterLeftPx,
): number {
  if (wrap !== null && Number.isFinite(wrap) && wrap >= 1) return Math.round(wrap);
  if (width === null || !(width > 0)) return SEQ.fallbackPerRow;
  const usable = width - gutterLeft - SEQ.gutterRightPx;
  const blockPx = SEQ.blockSize * SEQ.cellPx + SEQ.blockGapPx;
  const blocks = Math.max(1, Math.floor((usable + SEQ.blockGapPx) / blockPx));
  return blocks * SEQ.blockSize;
}

/** Row height for `laneCount` data lanes. */
export function rowHeight(laneCount: number): number {
  return laneCount > 0
    ? SEQ.lanesPx + laneCount * (SEQ.laneHeightPx + SEQ.laneGapPx) - SEQ.laneGapPx
    : SEQ.cartoonPx + 8;
}

/** Top of lane `k` below the row top. */
export function laneTop(k: number): number {
  return SEQ.lanesPx + k * (SEQ.laneHeightPx + SEQ.laneGapPx);
}

/**
 * Lay out `count` residues in rows of `perRow`. `width` is the width the
 * picture is given (at least what the rows need).
 */
export function layoutSequence(
  count: number,
  perRow: number,
  laneCount: number,
  width = 0,
  extras: RowExtras = NO_EXTRAS,
): SequenceLayout {
  const rows: SeqRow[] = [];
  const x: number[] = [];
  const row: number[] = [];
  const h = extras.above + rowHeight(laneCount) + extras.below;
  let maxRight = 0;
  for (let first = 0, r = 0; first < count; first += perRow, r++) {
    const last = Math.min(count - 1, first + perRow - 1);
    const y = SEQ.topPx + r * (h + SEQ.rowGapPx) + extras.above;
    rows.push({ first, last, y });
    for (let i = first; i <= last; i++) {
      const col = i - first;
      const cx =
        extras.gutterLeft +
        (col + 0.5) * SEQ.cellPx +
        Math.floor(col / SEQ.blockSize) * SEQ.blockGapPx;
      x.push(cx);
      row.push(r);
      maxRight = Math.max(maxRight, cx + SEQ.cellPx / 2);
    }
  }
  const height =
    rows.length > 0
      ? rows[rows.length - 1].y - extras.above + h + SEQ.topPx
      : SEQ.topPx * 2 + SEQ.cartoonPx;
  return {
    perRow,
    rows,
    x,
    row,
    laneCount,
    width: Math.max(width, maxRight + SEQ.gutterRightPx),
    height,
    extras,
  };
}

/**
 * Position along the sequence (`f`, fractional residue index) on row `r`:
 * between cell centres it runs straight; past the row's ends it carries on
 * half a cell, so a row spans `f ∈ [first − ½, last + ½]`.
 */
export function rowPoint(layout: SequenceLayout, r: number, f: number): { x: number; y: number } {
  const { first, last, y } = layout.rows[r];
  const yc = y + SEQ.cartoonPx;
  if (last === first || f <= first) return { x: layout.x[first] + (f - first) * SEQ.cellPx, y: yc };
  if (f >= last) return { x: layout.x[last] + (f - last) * SEQ.cellPx, y: yc };
  const i = Math.floor(f);
  const t = f - i;
  return { x: layout.x[i] + t * (layout.x[i + 1] - layout.x[i]), y: yc };
}
