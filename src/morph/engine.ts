/**
 * The 3-D view's drawing engine, in SVG: primitives (depth-sorted pieces of
 * the scene), runs that collect consecutive pieces of one element into
 * fill/stroke/gradient ops, the merging of sorted primitives into runs, and
 * the writer that turns runs into pooled SVG elements each frame.
 */

import { clamp01, fmt, lerp, type RGB } from './colour.js';
import { rgbStr, saturate } from './colour.js';
import type { MorphStyle } from './types.js';

/** A drawable piece of the scene, depth-sorted as a unit. */
export interface Prim {
  id: number;
  order: number;
  sub: number;
  depth: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  faded: boolean;
  /** Screen footprint points (flat x, y); absent = overlaps everything. */
  pts?: number[];
  /** Convex hull of `pts`, computed only when an overlap test needs it. */
  hull?: number[];
  /** Extra footprint margin (stroke half-width), px. */
  pad?: number;
  /**
   * Position along its element (Å) and the distance within which pieces of
   * the same element are expected to overlap on screen (neighbours along the
   * curve). Pieces further apart that overlap — an element crossing itself —
   * must not share a run, since a run draws all its fills before its lines.
   * Absent: the element cannot cross itself.
   */
  along?: number;
  reach?: number;
  /** Run this primitive was emitted into (set while merging). */
  run?: number;
  emit: (run: Run) => void;
}

/** Convex hull (Andrew's monotone chain) of flat x, y points. */
export function convexHull(pts: number[]): number[] {
  const n = pts.length / 2;
  if (n <= 2) return pts.slice();
  const idx = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => pts[a * 2] - pts[b * 2] || pts[a * 2 + 1] - pts[b * 2 + 1],
  );
  const cross = (o: number, a: number, b: number): number =>
    (pts[a * 2] - pts[o * 2]) * (pts[b * 2 + 1] - pts[o * 2 + 1]) -
    (pts[a * 2 + 1] - pts[o * 2 + 1]) * (pts[b * 2] - pts[o * 2]);
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0)
      lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0)
      upper.pop();
    upper.push(i);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const out: number[] = [];
  for (const i of hull) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out.length >= 2 ? out : pts.slice(0, 2);
}

export function hullOf(p: Prim): number[] | undefined {
  if (!p.hull && p.pts) p.hull = convexHull(p.pts);
  return p.hull;
}

/** Separating-axis test between two convex footprints with a margin. */
export function separated(a: number[], b: number[], margin: number): boolean {
  for (const [P, Q] of [
    [a, b],
    [b, a],
  ]) {
    const m = P.length / 2;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      let ax = -(P[j * 2 + 1] - P[i * 2 + 1]);
      let ay = P[j * 2] - P[i * 2];
      const al = Math.hypot(ax, ay);
      if (al < 1e-9) continue;
      ax /= al;
      ay /= al;
      let pMin = Infinity,
        pMax = -Infinity,
        qMin = Infinity,
        qMax = -Infinity;
      for (let k = 0; k < P.length; k += 2) {
        const v = P[k] * ax + P[k + 1] * ay;
        if (v < pMin) pMin = v;
        if (v > pMax) pMax = v;
      }
      for (let k = 0; k < Q.length; k += 2) {
        const v = Q[k] * ax + Q[k + 1] * ay;
        if (v < qMin) qMin = v;
        if (v > qMax) qMax = v;
      }
      if (pMax + margin < qMin || qMax + margin < pMin) return true;
    }
  }
  return false;
}

export interface OpSpec {
  layer: number;
  key: string;
  kind: 'fill' | 'stroke' | 'gradient';
  dash?: string;
  linecap?: string;
  fillOpacity?: number;
  strokeColour?: string;
  strokeWidth?: number;
}

/** An explicit screen-space linear gradient (stops at offsets 0 … 1). */
export interface GradientDef {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { o: number; c: RGB }[];
  /** Representative colour, used when the gradient collapses to flat. */
  mean: RGB;
}

export interface Op {
  spec: OpSpec;
  seq: number;
  /** Explicit gradient (cylinders); ribbons build theirs from `stops`. */
  grad?: GradientDef;
  d: string[];
  /** Open polyline (stroke ops) awaiting continuation. */
  line: number[] | null;
  /**
   * Open strip (fill ops): left and right edge points of consecutive
   * sections. Emitted as one outline polygon so adjacent sections share no
   * internal edge — abutting polygons leave anti-aliasing seams.
   */
  strip: { L: number[]; R: number[] } | null;
  rgb: [number, number, number, number];
  width: [number, number];
  opacity: [number, number];
}

export class Run {
  readonly ops = new Map<string, Op>();
  private seq = 0;
  constructor(
    readonly id: number,
    readonly faded: boolean,
    /** Overlap strip ends to hide seams (only safe for opaque runs). */
    private readonly extend = true,
    /** Coordinate precision, steps per px. */
    private readonly scale = 100,
  ) {}

  private f(v: number): string {
    return fmt(v, this.scale);
  }

  private op(spec: OpSpec): Op {
    const k = `${spec.layer}|${spec.key}`;
    let op = this.ops.get(k);
    if (!op) {
      op = {
        spec,
        seq: this.seq++,
        d: [],
        line: null,
        strip: null,
        rgb: [0, 0, 0, 0],
        width: [0, 0],
        opacity: [0, 0],
      };
      this.ops.set(k, op);
    }
    return op;
  }

  fill(spec: OpSpec, pts: number[], c: RGB, opacity = 1): void {
    if (pts.length < 6) return;
    const op = this.op(spec);
    let d = 'M' + this.f(pts[0]) + ',' + this.f(pts[1]);
    for (let i = 2; i < pts.length; i += 2) d += 'L' + this.f(pts[i]) + ',' + this.f(pts[i + 1]);
    op.d.push(d + 'Z');
    op.rgb[0] += c[0];
    op.rgb[1] += c[1];
    op.rgb[2] += c[2];
    op.rgb[3] += 1;
    op.opacity[0] += opacity;
    op.opacity[1] += 1;
  }

  /**
   * Append a quad section given as its start (l0, r0) and end (l1, r1) edge
   * points; it extends the open strip when it starts where that strip ends.
   */
  strip(spec: OpSpec, q: number[], c: RGB, opacity = 1): void {
    const op = this.op(spec);
    const s = op.strip;
    const [l0x, l0y, r0x, r0y, l1x, l1y, r1x, r1y] = q;
    if (
      s &&
      Math.abs(s.L[s.L.length - 2] - l0x) < 1e-6 &&
      Math.abs(s.L[s.L.length - 1] - l0y) < 1e-6 &&
      Math.abs(s.R[s.R.length - 2] - r0x) < 1e-6 &&
      Math.abs(s.R[s.R.length - 1] - r0y) < 1e-6
    ) {
      s.L.push(l1x, l1y);
      s.R.push(r1x, r1y);
    } else {
      this.flushStrip(op);
      op.strip = { L: [l0x, l0y, l1x, l1y], R: [r0x, r0y, r1x, r1y] };
    }
    op.rgb[0] += c[0];
    op.rgb[1] += c[1];
    op.rgb[2] += c[2];
    op.rgb[3] += 1;
    op.opacity[0] += opacity;
    op.opacity[1] += 1;
  }

  private flushStrip(op: Op): void {
    const s = op.strip;
    if (!s) return;
    // Nudge both ends of the strip outwards by half a pixel so that where an
    // element is split across runs the pieces overlap instead of leaving an
    // anti-aliased seam. (The outline stroke covers the overhang at real ends.)
    if (this.extend) {
      extendEnd(s.L, 0, 2);
      extendEnd(s.R, 0, 2);
      extendEnd(s.L, s.L.length - 2, s.L.length - 4);
      extendEnd(s.R, s.R.length - 2, s.R.length - 4);
    }
    let d = 'M' + this.f(s.L[0]) + ',' + this.f(s.L[1]);
    for (let i = 2; i < s.L.length; i += 2) d += 'L' + this.f(s.L[i]) + ',' + this.f(s.L[i + 1]);
    for (let i = s.R.length - 2; i >= 0; i -= 2)
      d += 'L' + this.f(s.R[i]) + ',' + this.f(s.R[i + 1]);
    op.d.push(d + 'Z');
    op.strip = null;
  }

  setGradient(spec: OpSpec, g: GradientDef): void {
    const op = this.op(spec);
    if (!op.grad) op.grad = g;
  }

  stroke(spec: OpSpec, pts: number[], c: RGB, width: number, opacity = 1): void {
    if (pts.length < 4) return;
    const op = this.op(spec);
    const line = op.line;
    if (
      line &&
      Math.abs(line[line.length - 2] - pts[0]) < 1e-6 &&
      Math.abs(line[line.length - 1] - pts[1]) < 1e-6
    ) {
      for (let i = 2; i < pts.length; i++) line.push(pts[i]);
    } else {
      this.flush(op);
      op.line = pts.slice();
    }
    op.rgb[0] += c[0];
    op.rgb[1] += c[1];
    op.rgb[2] += c[2];
    op.rgb[3] += 1;
    op.width[0] += width;
    op.width[1] += 1;
    op.opacity[0] += opacity;
    op.opacity[1] += 1;
  }

  flush(op: Op): void {
    const line = op.line;
    if (!line) return;
    let d = 'M' + this.f(line[0]) + ',' + this.f(line[1]);
    for (let i = 2; i < line.length; i += 2) d += 'L' + this.f(line[i]) + ',' + this.f(line[i + 1]);
    op.d.push(d);
    op.line = null;
  }

  sortedOps(): Op[] {
    for (const op of this.ops.values()) {
      this.flush(op);
      this.flushStrip(op);
    }
    return [...this.ops.values()].sort((a, b) => a.spec.layer - b.spec.layer || a.seq - b.seq);
  }
}

/**
 * A gradient along a run of colour samples placed on screen: from the first
 * sample to the last, each placed by its projection onto that line.
 */
export function gradientAlong(samples: { x: number; y: number; c: RGB }[]): GradientDef {
  const n = samples.length;
  const mean: RGB = [0, 0, 0];
  for (const s of samples) {
    mean[0] += s.c[0] / Math.max(1, n);
    mean[1] += s.c[1] / Math.max(1, n);
    mean[2] += s.c[2] / Math.max(1, n);
  }
  if (n < 2) {
    const s = samples[0] ?? { x: 0, y: 0, c: mean };
    return { x1: s.x, y1: s.y, x2: s.x, y2: s.y, stops: [{ o: 0, c: s.c }], mean };
  }
  const a = samples[0];
  const b = samples[n - 1];
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const vl2 = vx * vx + vy * vy || 1;
  const stops = samples
    .map((s) => ({ o: clamp01(((s.x - a.x) * vx + (s.y - a.y) * vy) / vl2), c: s.c }))
    .sort((p, q) => p.o - q.o);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stops, mean };
}

/** Dash pattern of discontinuous loops, as in 2-D: 3 px on, 5 px off. */
export const DASH_ON = 3;
export const DASH_PERIOD = 8;

/**
 * Cut a polyline section into its "on" dash pieces. `phases` gives each
 * point's position (px) along the dash pattern, `on` and `period` its on
 * length and period. With phases laid along the loop's 2-D length the dashes
 * match the 2-D figure at t = 0; laid along a view-independent length they
 * stay pinned to the curve as the view moves.
 */
export function dashPieces(
  pts: number[],
  phases: number[],
  on: number,
  period: number,
): number[][] {
  const pieces: number[][] = [];
  let cur: number[] | null = null;
  const phaseAt = (q: number): number => phases[q];
  const n = pts.length / 2;
  for (let q = 0; q < n - 1; q++) {
    const u0 = phaseAt(q);
    const u1 = phaseAt(q + 1);
    // Breakpoints inside this segment, where the pattern switches on/off.
    const cuts = [u0];
    for (let k = Math.floor(u0 / period); k * period <= u1; k++) {
      for (const b of [k * period, k * period + on]) if (b > u0 && b < u1) cuts.push(b);
    }
    cuts.push(u1);
    for (let j = 0; j < cuts.length - 1; j++) {
      const a = (cuts[j] - u0) / (u1 - u0 || 1);
      const b = (cuts[j + 1] - u0) / (u1 - u0 || 1);
      const mid = (cuts[j] + cuts[j + 1]) / 2;
      const isOn = ((mid % period) + period) % period < on;
      const ax = lerp(pts[q * 2], pts[q * 2 + 2], a);
      const ay = lerp(pts[q * 2 + 1], pts[q * 2 + 3], a);
      const bx = lerp(pts[q * 2], pts[q * 2 + 2], b);
      const by = lerp(pts[q * 2 + 1], pts[q * 2 + 3], b);
      if (isOn) {
        if (!cur) {
          cur = [ax, ay];
          pieces.push(cur);
        }
        cur.push(bx, by);
      } else cur = null;
    }
  }
  return pieces;
}

/** Push point `i` of a flat x, y array 0.5 px further from point `j`. */
export function extendEnd(a: number[], i: number, j: number): void {
  if (j < 0 || j >= a.length) return;
  const dx = a[i] - a[j];
  const dy = a[i + 1] - a[j + 1];
  const l = Math.hypot(dx, dy);
  if (l < 1e-6) return;
  a[i] += (0.5 * dx) / l;
  a[i + 1] += (0.5 * dy) / l;
}

/** Pooled SVG element with cached attributes. */
export class Pooled<T extends SVGElement> {
  private cache = new Map<string, string>();
  constructor(readonly el: T) {}
  set(name: string, value: string | null): void {
    const prev = this.cache.get(name);
    if (value === null) {
      if (prev !== undefined) {
        this.el.removeAttribute(name);
        this.cache.delete(name);
      }
      return;
    }
    if (prev === value) return;
    this.el.setAttribute(name, value);
    this.cache.set(name, value);
  }
}

export interface RunSlot {
  g: Pooled<SVGGElement>;
  paths: Pooled<SVGPathElement>[];
}

/** Model ids of the context chains start at this (times the chain's place + 1). */
export const CONTEXT_ID = 1 << 20;

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Group depth-sorted primitives into runs, emitting each into its run. A run
 * holds consecutive pieces of one element and is drawn as one group, all its
 * fills before its lines.
 */
export function mergeRuns(
  prims: Prim[],
  width: number,
  height: number,
  frame: Pick<RunLook, 'fadeOpacity' | 'contextOpacity' | 'coordScale'>,
): Run[] {
  // A primitive joins its element's latest run only if nothing drawn since
  // that run started overlaps it on screen, and no piece of the run from
  // further along the element does (see Prim.reach) — merged runs then never
  // break the back-to-front order where it matters. A coarse grid finds the
  // candidates; convex footprints decide.
  const CELL = 32;
  const cols = Math.max(1, Math.ceil(width / CELL) + 2);
  const rows = Math.max(1, Math.ceil(height / CELL) + 2);
  const cells: Prim[][] = Array.from({ length: cols * rows }, () => []);
  /** Newest run index touching each cell, for a cheap early accept. */
  const newest = new Int32Array(cols * rows).fill(-1);
  const stamp = new Map<Prim, number>();
  let visit = 0;
  const open = new Map<number, number>();
  const runs: Run[] = [];
  for (const p of prims) {
    const c0 = Math.max(0, Math.min(cols - 1, Math.floor(p.x0 / CELL) + 1));
    const c1 = Math.max(0, Math.min(cols - 1, Math.floor(p.x1 / CELL) + 1));
    const r0 = Math.max(0, Math.min(rows - 1, Math.floor(p.y0 / CELL) + 1));
    const r1 = Math.max(0, Math.min(rows - 1, Math.floor(p.y1 / CELL) + 1));
    let ri = open.get(p.id);
    if (ri !== undefined) {
      let blocked = false;
      visit++;
      for (let r = r0; r <= r1 && !blocked; r++) {
        for (let c = c0; c <= c1 && !blocked; c++) {
          const cell = r * cols + c;
          if (newest[cell] < ri) continue;
          for (const q of cells[cell]) {
            const qr = q.run ?? -1;
            if (qr < ri || stamp.get(q) === visit) continue;
            if (
              qr === ri &&
              (p.reach === undefined ||
                q.along === undefined ||
                Math.abs((p.along ?? 0) - q.along) <= p.reach)
            ) {
              continue;
            }
            stamp.set(q, visit);
            const margin = (p.pad ?? 0) + (q.pad ?? 0) + 1;
            if (
              p.x1 + margin < q.x0 ||
              q.x1 + margin < p.x0 ||
              p.y1 + margin < q.y0 ||
              q.y1 + margin < p.y0
            ) {
              continue;
            }
            const hp = hullOf(p);
            const hq = hullOf(q);
            if (!hp || !hq || !separated(hp, hq, margin)) {
              blocked = true;
              break;
            }
          }
        }
      }
      if (blocked) ri = undefined;
    }
    if (ri === undefined) {
      ri = runs.length;
      const opaque =
        !p.faded ||
        (frame.fadeOpacity >= 0.999 && (p.id < CONTEXT_ID || frame.contextOpacity >= 0.999));
      runs.push(new Run(p.id, p.faded, opaque, frame.coordScale));
      open.set(p.id, ri);
    }
    p.run = ri;
    p.emit(runs[ri]);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const cell = r * cols + c;
        cells[cell].push(p);
        if (newest[cell] < ri) newest[cell] = ri;
      }
    }
  }
  return runs;
}

/** What {@link RunWriter.emit} needs to know about the frame besides its runs. */
export interface RunLook {
  style: Pick<MorphStyle, 'fadedOpacity' | 'unselectedSaturation' | 'selectionWidthScale'>;
  /** The background: faded runs are lightened towards it. */
  ground: RGB;
  /** Opacity of faded (neighbouring-chain) runs. */
  fadeOpacity: number;
  /** Opacity of the context chains' runs (on top of `fadeOpacity`). */
  contextOpacity: number;
  /** Coordinate precision, steps per px. */
  coordScale: number;
  /** Ids of the selected elements and loops. */
  selected: ReadonlySet<number>;
  /** `helix`, `strand` or `loop` for a selectable id, else null. */
  typeOf: (id: number) => string | null;
}

/**
 * Writes runs into an SVG group as pooled `<g>`/`<path>` elements (and their
 * gradients into `<defs>`), so a frame only touches attributes that changed.
 */
export class RunWriter {
  private readonly slots: RunSlot[] = [];
  private readonly grads: {
    el: Pooled<SVGLinearGradientElement>;
    stops: Pooled<SVGStopElement>[];
  }[] = [];
  /** Coordinate precision of the frame being written. */
  private coordScale = 100;

  constructor(
    private readonly runsG: SVGGElement,
    private readonly defs: SVGDefsElement,
    private readonly idPrefix: string,
  ) {}

  /** Write `runs` as this frame's picture, hiding elements left over from the last. */
  emit(runs: Run[], look: RunLook): void {
    this.coordScale = look.coordScale;
    const fadedOpacity = look.style.fadedOpacity;
    const fadeA = look.fadeOpacity;
    // Mix faded colours towards the background so that, drawn at `fadeA`,
    // they look as they did at the 2-D opacity over it.
    const k = fadedOpacity / fadeA;
    const bg = look.ground;
    const lighten = (c: RGB): RGB => [
      bg[0] - k * (bg[0] - c[0]),
      bg[1] - k * (bg[1] - c[1]),
      bg[2] - k * (bg[2] - c[2]),
    ];
    const sat = look.style.unselectedSaturation;
    const desaturate = (c: RGB): RGB => saturate(c, sat);
    let gi = 0;
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      let slot = this.slots[i];
      if (!slot) {
        const g = document.createElementNS(SVG_NS, 'g');
        this.runsG.appendChild(g);
        slot = { g: new Pooled(g), paths: [] };
        this.slots.push(slot);
      }
      slot.g.set('display', null);
      const runA = run.faded ? fadeA * (run.id >= CONTEXT_ID ? look.contextOpacity : 1) : 1;
      slot.g.set('opacity', runA < 0.999 ? runA.toFixed(3) : null);
      const sel = look.selected.has(run.id);
      // Everything else is desaturated while there is a selection (as in 2-D,
      // the faded neighbouring chains are left alone).
      const dull = !sel && !run.faded && look.selected.size > 0 && look.typeOf(run.id) !== null;
      slot.g.set('class', sel ? 'selected' : null);
      slot.g.set('data-type', sel ? look.typeOf(run.id) : null);
      const widthScale = sel ? look.style.selectionWidthScale : 1;
      const tint = run.faded ? lighten : dull ? desaturate : (c: RGB): RGB => c;
      const ops = run.sortedOps();
      for (let j = 0; j < ops.length; j++) {
        const op = ops[j];
        let path = slot.paths[j];
        if (!path) {
          const el = document.createElementNS(SVG_NS, 'path');
          slot.g.el.appendChild(el);
          path = new Pooled(el);
          slot.paths.push(path);
        }
        path.set('display', null);
        path.set('d', op.d.join(''));
        const n = Math.max(1, op.rgb[3]);
        const avg: RGB = tint([op.rgb[0] / n, op.rgb[1] / n, op.rgb[2] / n]);
        const alpha = op.opacity[1] > 0 ? op.opacity[0] / op.opacity[1] : 1;
        if (op.spec.kind === 'stroke') {
          path.set('fill', 'none');
          path.set('stroke', rgbStr(avg));
          path.set(
            'stroke-width',
            ((op.width[0] / Math.max(1, op.width[1])) * widthScale).toFixed(2),
          );
          path.set('stroke-linecap', op.spec.linecap ?? 'round');
          path.set('stroke-linejoin', 'round');
          path.set('stroke-dasharray', op.spec.dash ?? null);
          path.set('fill-rule', null);
          path.set('opacity', alpha < 0.999 ? alpha.toFixed(3) : null);
        } else {
          path.set('stroke', null);
          path.set('stroke-width', null);
          path.set('stroke-linecap', null);
          path.set('stroke-linejoin', null);
          path.set('stroke-dasharray', null);
          path.set('fill-rule', 'nonzero');
          path.set('opacity', alpha < 0.999 ? alpha.toFixed(3) : null);
          const grad =
            op.spec.kind === 'gradient' && op.grad ? this.gradientFromDef(op.grad, gi, tint) : null;
          if (grad) {
            gi++;
            path.set('fill', grad);
          } else path.set('fill', rgbStr(op.grad ? tint(op.grad.mean) : avg));
        }
      }
      for (let j = ops.length; j < slot.paths.length; j++) slot.paths[j].set('display', 'none');
    }
    for (let i = runs.length; i < this.slots.length; i++) this.slots[i].g.set('display', 'none');
  }

  /** Emit an explicit gradient, or null when its stops are all one colour. */
  private gradientFromDef(g: GradientDef, gi: number, tint: (c: RGB) => RGB): string | null {
    const a = g.stops[0].c;
    let flat = true;
    for (const s of g.stops) {
      if (Math.abs(s.c[0] - a[0]) + Math.abs(s.c[1] - a[1]) + Math.abs(s.c[2] - a[2]) > 1.5) {
        flat = false;
        break;
      }
    }
    if (flat || Math.hypot(g.x2 - g.x1, g.y2 - g.y1) < 0.5) return null;
    const stops = g.stops.map((s) => ({ o: s.o, c: tint(s.c) }));
    return this.writeGradient(gi, g.x1, g.y1, g.x2, g.y2, stops);
  }

  private writeGradient(
    gi: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    sorted: { o: number; c: RGB }[],
  ): string {
    let slot = this.grads[gi];
    if (!slot) {
      const el = document.createElementNS(SVG_NS, 'linearGradient');
      el.setAttribute('id', `${this.idPrefix}-g${gi}`);
      el.setAttribute('gradientUnits', 'userSpaceOnUse');
      this.defs.appendChild(el);
      slot = { el: new Pooled(el), stops: [] };
      this.grads.push(slot);
    }
    slot.el.set('x1', fmt(x1, this.coordScale));
    slot.el.set('y1', fmt(y1, this.coordScale));
    slot.el.set('x2', fmt(x2, this.coordScale));
    slot.el.set('y2', fmt(y2, this.coordScale));
    for (let k = 0; k < sorted.length; k++) {
      let st = slot.stops[k];
      if (!st) {
        const el = document.createElementNS(SVG_NS, 'stop');
        slot.el.el.appendChild(el);
        st = new Pooled(el);
        slot.stops.push(st);
      }
      st.set('offset', sorted[k].o.toFixed(4));
      st.set('stop-color', rgbStr(sorted[k].c));
    }
    for (let k = sorted.length; k < slot.stops.length; k++) {
      // Surplus stops repeat the last colour at offset 1.
      slot.stops[k].set('offset', '1');
      slot.stops[k].set('stop-color', rgbStr(sorted[sorted.length - 1].c));
    }
    return `url(#${this.idPrefix}-g${gi})`;
  }
}
