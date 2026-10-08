/**
 * Geometry of the 1-D ↔ 2-D transition.
 *
 * Each row of the sequence view is a stretch of the chain. Going from the
 * topology to the sequence, every stretch is pulled taut like a string: its
 * pieces keep their order and blend their lengths from the 2-D picture's to
 * one cell per residue, while every bend along it relaxes by the same
 * fraction, so a zig-zag of helices straightens out into a line instead of
 * its residues flying about independently. The stretch's centre travels from
 * where it sat in the topology to its row. At progress 1 every point is
 * exactly where the 2-D picture drew it; at 0 exactly on its row.
 */

import { rowPoint, type SequenceLayout } from './layout.js';
import type { TracePoint } from './types.js';

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

interface Chunk {
  row: number;
  fs: number[];
  /** Segment lengths and headings in 1-D and 2-D. */
  len1: number[];
  len2: number[];
  head2: number[];
  c1: { x: number; y: number };
  c2: { x: number; y: number };
}

export interface ChunkFrame {
  row: number;
  /** This row's own (eased) progress: 0 = on its row, 1 = in the topology. */
  e: number;
  pts: TracePoint[];
}

/** Length-weighted centroid of a polyline (vertex mean when it has no length). */
function centroid(xs: number[], ys: number[]): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let total = 0;
  for (let j = 0; j + 1 < xs.length; j++) {
    const l = Math.hypot(xs[j + 1] - xs[j], ys[j + 1] - ys[j]);
    sx += l * (xs[j] + xs[j + 1]) * 0.5;
    sy += l * (ys[j] + ys[j + 1]) * 0.5;
    total += l;
  }
  if (total > 1e-9) return { x: sx / total, y: sy / total };
  const n = xs.length;
  return {
    x: xs.reduce((a, b) => a + b, 0) / n,
    y: ys.reduce((a, b) => a + b, 0) / n,
  };
}

export class SequenceTransition {
  private readonly chunks: Chunk[];

  /**
   * `trace` is the 2-D drawn chain in the transition's coordinates (already
   * offset from the 2-D SVG's); `layout` is the sequence view's.
   */
  constructor(trace: TracePoint[], layout: SequenceLayout) {
    this.chunks = layout.rows.map((row, r) => {
      const fs = chunkFs(trace, row.first - 0.5, row.last + 0.5);
      const p2 = fs.map((f) => pointAt(trace, f));
      const p1 = fs.map((f) => rowPoint(layout, r, f));
      const len1: number[] = [];
      const len2: number[] = [];
      const head2: number[] = [];
      let prev: number | null = null;
      for (let j = 0; j + 1 < fs.length; j++) {
        len1.push(Math.abs(p1[j + 1].x - p1[j].x));
        const dx = p2[j + 1].x - p2[j].x;
        const dy = p2[j + 1].y - p2[j].y;
        const l = Math.hypot(dx, dy);
        len2.push(l);
        let h: number | null = l > 1e-6 ? Math.atan2(dy, dx) : prev;
        // Unwrap so consecutive headings never jump by more than half a turn.
        if (h !== null && prev !== null) {
          while (h - prev > Math.PI) h -= 2 * Math.PI;
          while (h - prev < -Math.PI) h += 2 * Math.PI;
        }
        head2.push(h ?? NaN);
        if (h !== null) prev = h;
      }
      // Leading zero-length pieces take the first real heading.
      const firstReal = head2.find((h) => !Number.isNaN(h)) ?? 0;
      for (let j = 0; j < head2.length && Number.isNaN(head2[j]); j++) head2[j] = firstReal;
      return {
        row: r,
        fs,
        len1,
        len2,
        head2,
        c1: centroid(
          p1.map((p) => p.x),
          p1.map((p) => p.y),
        ),
        c2: centroid(
          p2.map((p) => p.x),
          p2.map((p) => p.y),
        ),
      };
    });
  }

  /**
   * The chain at progress `u` (0 = sequence, 1 = topology). With `sweep` > 0
   * the rows move one after another, N- to C-terminal, each starting
   * `sweep / (rows − 1)` of the way after the previous.
   */
  frame(u: number, sweep = 0): ChunkFrame[] {
    const n = this.chunks.length;
    const delay = n > 1 ? Math.min(0.9, Math.max(0, sweep)) / (n - 1) : 0;
    const span = 1 - delay * (n - 1);
    return this.chunks.map((c, r) => {
      const e = ease((u - r * delay) / span);
      const xs = [0];
      const ys = [0];
      for (let j = 0; j < c.len1.length; j++) {
        const l = c.len1[j] + (c.len2[j] - c.len1[j]) * e;
        const h = c.head2[j] * e;
        xs.push(xs[j] + l * Math.cos(h));
        ys.push(ys[j] + l * Math.sin(h));
      }
      const c0 = centroid(xs, ys);
      const tx = c.c1.x + (c.c2.x - c.c1.x) * e - c0.x;
      const ty = c.c1.y + (c.c2.y - c.c1.y) * e - c0.y;
      return {
        row: c.row,
        e,
        pts: c.fs.map((f, j) => ({ x: xs[j] + tx, y: ys[j] + ty, f })),
      };
    });
  }
}
