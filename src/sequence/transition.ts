/**
 * Geometry of the 1-D ↔ 2-D transition, in three stages.
 *
 * 1. Collapse (progress 0 → {@link EXPAND_END}): the rows close up to just the
 *    height of the secondary-structure cartoon, their letters, lanes and data
 *    tracks fading out. Run backwards, the lines expand.
 * 2. Unwrap (→ {@link UNWRAP_END}): the rows snake together into one line,
 *    N-terminal row first: the first row stays where it is and the others
 *    rise to join its end. The x-axis shrinks as they go, so the whole chain
 *    fits on the line.
 * 3. Fold (→ 1): a wave runs from the left-most residue to the right; as it
 *    passes, each part of the line rises into its place in the topology.
 *
 * At progress 0 every point is exactly on its row, at {@link EXPAND_END} on
 * its collapsed row, at {@link UNWRAP_END} on the line, and at 1 exactly where
 * the 2-D picture drew it.
 */

import { compactCentre, rowPoint, SEQ, type SequenceLayout } from './layout.js';
import type { TracePoint } from './types.js';

/** Progress at which the rows have collapsed to the cartoon's height. */
export const EXPAND_END = 0.15;

/** Progress at which the rows have become one line. */
export const UNWRAP_END = 0.45;

/** How expanded the rows are at progress `u` (1 = full height, 0 = collapsed). */
export function expandAt(u: number): number {
  return 1 - ease(u / EXPAND_END);
}

/** Width of the folding wave, as a fraction of the line. */
export const WAVE = 0.35;

/** Stagger of the rows while they unwrap (0 = all at once, 1 = one after another). */
const ROW_STAGGER = 0.6;

export function ease(x: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
}

/** Point on a polyline with non-decreasing `f`, at `f` (clamped to its ends). */
export function pointAt(pts: TracePoint[], f: number): { x: number; y: number } {
  const n = pts.length;
  if (n === 0) return { x: 0, y: 0 };
  if (f <= pts[0].f) return { x: pts[0].x, y: pts[0].y };
  if (f >= pts[n - 1].f) return { x: pts[n - 1].x, y: pts[n - 1].y };
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].f <= f) lo = mid;
    else hi = mid;
  }
  const a = pts[lo];
  const b = pts[hi];
  const t = b.f > a.f ? (f - a.f) / (b.f - a.f) : 0;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

/** Fractional index into `pts` at `f` (for slicing outlines by residue). */
export function indexAt(pts: TracePoint[], f: number): number {
  const n = pts.length;
  if (n === 0 || f <= pts[0].f) return 0;
  if (f >= pts[n - 1].f) return n - 1;
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].f <= f) lo = mid;
    else hi = mid;
  }
  const df = pts[hi].f - pts[lo].f;
  return lo + (df > 0 ? (f - pts[lo].f) / df : 0);
}

/**
 * The `f` values a row's stretch is cut at: its ends, every residue centre
 * (so the row's block gaps fall between vertices) and every 2-D trace vertex
 * in between (so curves keep their shape).
 */
function chunkFs(trace: TracePoint[], fa: number, fb: number): number[] {
  const fs: number[] = [fa];
  for (let i = Math.ceil(fa); i <= fb; i++) fs.push(i);
  for (const p of trace) if (p.f > fa && p.f < fb) fs.push(p.f);
  fs.push(fb);
  fs.sort((a, b) => a - b);
  const out: number[] = [];
  for (const f of fs) if (out.length === 0 || f - out[out.length - 1] > 1e-6) out.push(f);
  return out;
}

/** The single line the rows unwrap onto: from x0 to x1 at height y. */
export interface SequenceLine {
  x0: number;
  x1: number;
  y: number;
}

interface Chunk {
  row: number;
  fs: number[];
  /** How far the full row sits below its collapsed place (px). */
  dy: number;
  /** Positions on the collapsed row, on the line and in the topology. */
  p1: { x: number; y: number }[];
  pl: { x: number; y: number }[];
  p2: { x: number; y: number }[];
}

export interface ChunkFrame {
  row: number;
  /** How far this row has unwrapped onto the line (0 → 1). */
  unwrap: number;
  pts: TracePoint[];
}

export class SequenceTransition {
  private readonly chunks: Chunk[];
  private readonly count: number;

  /**
   * `trace` is the 2-D drawn chain in the transition's coordinates (already
   * offset from the 2-D SVG's); `layout` is the sequence view's.
   */
  constructor(trace: TracePoint[], layout: SequenceLayout, line: SequenceLine) {
    const n = Math.max(1, layout.x.length);
    this.count = n;
    const onLine = (f: number): { x: number; y: number } => ({
      x: line.x0 + ((f + 0.5) / n) * (line.x1 - line.x0),
      y: line.y,
    });
    this.chunks = layout.rows.map((row, r) => {
      const fs = chunkFs(trace, row.first - 0.5, row.last + 0.5);
      const dy = row.y + SEQ.cartoonPx - compactCentre(r);
      return {
        row: r,
        fs,
        dy,
        p1: fs.map((f) => {
          const p = rowPoint(layout, r, f);
          return { x: p.x, y: p.y - dy };
        }),
        pl: fs.map(onLine),
        p2: fs.map((f) => pointAt(trace, f)),
      };
    });
  }

  /** The folding wave's progress at sequence position `f` (0 = on the line, 1 = folded). */
  foldAt(u: number, f: number): number {
    const v = (u - UNWRAP_END) / (1 - UNWRAP_END);
    if (v <= 0) return 0;
    const s = (f + 0.5) / this.count;
    return ease((v * (1 + WAVE) - s) / WAVE);
  }

  /** Sequence position (`f`) of the folding wave's middle at progress `u`. */
  waveFront(u: number): number {
    const v = Math.max(0, (u - UNWRAP_END) / (1 - UNWRAP_END));
    return (v * (1 + WAVE) - WAVE / 2) * this.count - 0.5;
  }

  /** The chain at progress `u` (0 = sequence, 1 = topology). */
  frame(u: number): ChunkFrame[] {
    const rows = this.chunks.length;
    const grow = expandAt(u);
    const a = Math.max(0, Math.min(1, (u - EXPAND_END) / (UNWRAP_END - EXPAND_END)));
    const delay = rows > 1 ? ROW_STAGGER / (rows - 1) : 0;
    const span = 1 - delay * (rows - 1);
    return this.chunks.map((c, r) => {
      const unwrap = ease((a - r * delay) / span);
      const pts = c.fs.map((f, j) => {
        const q = {
          x: c.p1[j].x + (c.pl[j].x - c.p1[j].x) * unwrap,
          y: c.p1[j].y + (c.pl[j].y - c.p1[j].y) * unwrap + c.dy * grow,
        };
        const e = this.foldAt(u, f);
        return { x: q.x + (c.p2[j].x - q.x) * e, y: q.y + (c.p2[j].y - q.y) * e, f };
      });
      return { row: c.row, unwrap, pts };
    });
  }

  /** How far row `r`'s furniture is shifted from its full-height place at progress `u` (px). */
  rowShift(r: number, u: number): number {
    return -(this.chunks[r]?.dy ?? 0) * (1 - expandAt(u));
  }
}
