/**
 * Draws the sequence view and every frame of the 1-D ↔ 2-D transition as SVG.
 * Frame 1 is the topology (the static 2-D picture is swapped back in there);
 * frame 0 is the sequence view itself, so the transition and the view are one
 * drawing.
 */

import {
  ssOutline,
  outlinePolygon,
  outlineSlice,
  type OutlinePoint,
} from '../components/ss-outline.js';
import { paint, type Paint, type Theme } from '../theme/index.js';
import { laneTop, layoutSequence, residuesPerRow, SEQ, type SequenceLayout } from './layout.js';
import { ease, indexAt, pointAt, SequenceTransition, type ChunkFrame } from './transition.js';
import type { SeqLane, SequenceSource, TracePoint } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SequenceOptions {
  /** Residues per row; null fits whole ten-residue blocks to the width. */
  wrap: number | null;
  /** Stagger of the rows during the transition (0 = all at once). */
  sweep: number;
}

export const DEFAULT_SEQUENCE_OPTIONS: SequenceOptions = { wrap: null, sweep: 0.5 };

type Range = [number, number];

/** `ranges` (sorted, disjoint) clipped to [a, b]. */
function clip(ranges: Range[], a: number, b: number): Range[] {
  const out: Range[] = [];
  for (const [lo, hi] of ranges) {
    const l = Math.max(lo, a);
    const h = Math.min(hi, b);
    if (h > l) out.push([l, h]);
  }
  return out;
}

/** [a, b] minus `ranges` (sorted, disjoint). */
function subtract(a: number, b: number, ranges: Range[]): Range[] {
  const out: Range[] = [];
  let cur = a;
  for (const [lo, hi] of clip(ranges, a, b)) {
    if (lo > cur) out.push([cur, lo]);
    cur = Math.max(cur, hi);
  }
  if (b > cur) out.push([cur, b]);
  return out;
}

/** The part of a chunk's polyline between `a` and `b`, with interpolated ends. */
function slice(pts: TracePoint[], a: number, b: number): TracePoint[] {
  const out: TracePoint[] = [{ ...pointAt(pts, a), f: a }];
  for (const p of pts) if (p.f > a + 1e-6 && p.f < b - 1e-6) out.push(p);
  out.push({ ...pointAt(pts, b), f: b });
  return out;
}

function el<K extends keyof SVGElementTagNameMap>(
  name: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

const polyPoints = (pts: { x: number; y: number }[]): string =>
  pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

export class SequenceRenderer {
  readonly svg: SVGSVGElement;
  private layout: SequenceLayout | null = null;
  private transition: SequenceTransition | null = null;
  /** Where the 2-D picture sits in the transition's coordinates. */
  private offset = { x: 0, y: 0 };
  private width = 0;
  private readonly elementRanges: Range[];
  private readonly dashed: Range[];
  /** The stretch of the sequence the topology draws. */
  private readonly drawn: Range;

  constructor(
    private readonly src: SequenceSource,
    private options: SequenceOptions,
    private theme: Theme,
    /** 2-D decorations (residue-number labels, legend) faded in near the topology. */
    private readonly decor2d: Element[] = [],
  ) {
    this.svg = el('svg', { xmlns: SVG_NS });
    this.svg.style.display = 'block';
    this.svg.classList.add('sequence-view');
    this.elementRanges = src.elements
      .map((e) => [e.from, e.to] as Range)
      .sort((a, b) => a[0] - b[0]);
    this.dashed = [...src.dashed].sort((a, b) => a[0] - b[0]);
    const n = src.trace.length;
    this.drawn = n > 0 ? [src.trace[0].f, src.trace[n - 1].f] : [0, 0];
  }

  /** Fit to a container `width` with the 2-D picture scrolled to `scroll0`. */
  configure(width: number, scroll0: number): void {
    this.width = width;
    const n = this.src.residues.length;
    const perRow = residuesPerRow(width, this.options.wrap);
    this.layout = layoutSequence(n, perRow, this.src.lanes.length, width);
    this.offset = { x: -(this.src.frame2d.minX + scroll0), y: -this.src.frame2d.minY };
    const trace = this.src.trace.map((p) => ({
      x: p.x + this.offset.x,
      y: p.y + this.offset.y,
      f: p.f,
    }));
    this.transition = new SequenceTransition(trace, this.layout);
  }

  setOptions(options: SequenceOptions): void {
    this.options = options;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
  }

  /** The configured layout (after {@link configure}). */
  get sequenceLayout(): SequenceLayout | null {
    return this.layout;
  }

  /** Draw progress `u` (0 = sequence, 1 = topology). */
  render(u: number): void {
    const layout = this.layout;
    const transition = this.transition;
    if (!layout || !transition) return;
    const t = Math.max(0, Math.min(1, u));
    const svg = this.svg;
    svg.replaceChildren();

    // The picture grows or shrinks between the two heights; the width is the container's.
    const h2 = this.src.frame2d.height;
    const width = layout.width;
    const height = layout.height + (h2 - layout.height) * ease(t);
    svg.setAttribute('viewBox', `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`);
    svg.setAttribute('width', width.toFixed(2));
    svg.setAttribute('height', height.toFixed(2));

    const a1 = 1 - ease(t / 0.45); // sequence-only furniture
    const a2 = ease((t - 0.45) / 0.55); // topology-only furniture
    const frames = transition.frame(t, this.options.sweep);

    if (a2 > 0) this.drawSlab(a2);
    if (a1 > 0) this.drawRowFurniture(layout, a1);
    this.drawChain(frames);
    this.drawLetters(layout, frames);
    const a3 = ease((t - 0.8) / 0.2);
    if (a3 > 0) {
      const g = el('g', {
        opacity: a3.toFixed(3),
        transform: `translate(${this.offset.x}, ${this.offset.y})`,
      });
      g.setAttribute('pointer-events', 'none');
      for (const d of this.decor2d) g.appendChild(d.cloneNode(true));
      svg.appendChild(g);
    }
  }

  private add<E extends Element>(e: E, tokens?: Paint, parent: Element = this.svg): E {
    if (tokens) paint(e, tokens, this.theme);
    parent.appendChild(e);
    return e;
  }

  private drawSlab(alpha: number): void {
    const { origin2d: o, slab, membraneHalf } = this.src;
    const x0 = o.x + slab.x0 * o.pxPerA + this.offset.x;
    const x1 = o.x + slab.x1 * o.pxPerA + this.offset.x;
    const g = this.add(el('g', { opacity: alpha.toFixed(3) }));
    const rect = el('rect', {
      x: x0,
      y: o.y - membraneHalf * o.pxPerA + this.offset.y,
      width: Math.max(0, x1 - x0),
      height: membraneHalf * 2 * o.pxPerA,
      'fill-opacity': 0.55,
    });
    this.add(
      rect,
      { fill: 'membrane', stroke: 'membraneEdge', 'stroke-width': 'membraneEdgeWidth' },
      g,
    );
    const mid = el('line', {
      x1: x0,
      x2: x1,
      y1: o.y + this.offset.y,
      y2: o.y + this.offset.y,
      'stroke-dasharray': '4 4',
    });
    this.add(mid, { stroke: 'midplane', 'stroke-width': 'midplaneWidth' }, g);
  }

  /** Membrane shading, row numbers and the data lanes. */
  private drawRowFurniture(layout: SequenceLayout, alpha: number): void {
    const g = this.add(el('g', { opacity: alpha.toFixed(3) }));
    g.setAttribute('pointer-events', 'none');
    const { residues, z, membraneHalf, lanes } = this.src;
    const cell = SEQ.cellPx;
    for (const row of layout.rows) {
      // Membrane: residues the 2-D layout puts inside the slab.
      let start = -1;
      for (let i = row.first; i <= row.last + 1; i++) {
        const inside = i <= row.last && Math.abs(z[i]) <= membraneHalf;
        if (inside && start < 0) start = i;
        if (!inside && start >= 0) {
          const xa = layout.x[start] - cell / 2;
          const xb = layout.x[i - 1] + cell / 2;
          const band = el('rect', {
            x: xa.toFixed(2),
            y: row.y + SEQ.bandTopPx,
            width: (xb - xa).toFixed(2),
            height: SEQ.bandHeightPx,
            'fill-opacity': 0.55,
          });
          this.add(band, { fill: 'membrane' }, g);
          start = -1;
        }
      }
      const num = el('text', {
        x: SEQ.gutterLeftPx - 8,
        y: row.y + SEQ.letterBaselinePx,
        'text-anchor': 'end',
        'font-size': 10,
      });
      num.textContent = String(residues[row.first].resSeq);
      this.add(num, { fill: 'textMuted', 'font-family': 'fontFamily' }, g);
      lanes.forEach((lane, k) =>
        this.drawLane(g, layout, row.first, row.last, row.y + laneTop(k), lane),
      );
    }
  }

  private drawLane(
    g: Element,
    layout: SequenceLayout,
    first: number,
    last: number,
    top: number,
    lane: SeqLane,
  ): void {
    const cell = SEQ.cellPx;
    const H = SEQ.laneHeightPx;
    const xa = layout.x[first] - cell / 2;
    const xb = layout.x[last] + cell / 2;
    const bg = el('rect', { x: xa, y: top, width: xb - xa, height: H, 'fill-opacity': 0.6 });
    this.add(bg, { fill: 'surface', stroke: 'border' }, g);
    bg.setAttribute('stroke-width', '0.5');
    const label = el('text', {
      x: SEQ.gutterLeftPx - 8,
      y: top + H / 2 + 3,
      'text-anchor': 'end',
      'font-size': 8.5,
    });
    label.textContent = lane.label.length > 9 ? `${lane.label.slice(0, 8)}…` : lane.label;
    const title = el('title');
    title.textContent = lane.label;
    label.appendChild(title);
    this.add(label, { fill: 'textMuted', 'font-family': 'fontFamily' }, g);

    if (lane.kind === 'colour') {
      for (let i = first; i <= last; i++) {
        const c = lane.colourAt(i);
        if (!c) continue;
        const r = el('rect', {
          x: (layout.x[i] - cell / 2).toFixed(2),
          y: top + 1,
          width: cell,
          height: H - 2,
          fill: c,
        });
        g.appendChild(r);
      }
      return;
    }
    const [lo, hi] = lane.domain;
    const span = hi - lo || 1;
    const yOf = (v: number): number =>
      top + H - 1 - ((Math.max(lo, Math.min(hi, v)) - lo) / span) * (H - 2);
    const base = yOf(Math.max(lo, Math.min(hi, 0)));
    if (lo < 0 && hi > 0) {
      const zero = el('line', { x1: xa, x2: xb, y1: base, y2: base, 'stroke-width': 0.5 });
      this.add(zero, { stroke: 'border' }, g);
    }
    const colour = lane.colour;
    if (lane.kind === 'bar') {
      for (let i = first; i <= last; i++) {
        const v = lane.valueAt(i);
        if (v === undefined || !Number.isFinite(v)) continue;
        const y = yOf(v);
        const r = el('rect', {
          x: (layout.x[i] - cell / 2 + 1).toFixed(2),
          y: Math.min(y, base).toFixed(2),
          width: cell - 2,
          height: Math.max(0.5, Math.abs(base - y)).toFixed(2),
        });
        if (colour) r.setAttribute('fill', colour);
        this.add(r, colour ? undefined : { fill: 'accent' }, g);
      }
      return;
    }
    let d = '';
    let pen = false;
    for (let i = first; i <= last; i++) {
      const v = lane.valueAt(i);
      if (v === undefined || !Number.isFinite(v)) {
        pen = false;
        continue;
      }
      d += `${pen ? 'L' : 'M'}${layout.x[i].toFixed(2)},${yOf(v).toFixed(2)}`;
      pen = true;
    }
    if (!d) return;
    const path = el('path', { d, fill: 'none', 'stroke-width': 1.5, 'stroke-linejoin': 'round' });
    if (colour) path.setAttribute('stroke', colour);
    this.add(path, colour ? undefined : { stroke: 'accent' }, g);
  }

  /** Loops, then helices and strands, row by row; connectors join the rows near the topology. */
  private drawChain(frames: ChunkFrame[]): void {
    const src = this.src;
    const dims = {
      halfWidth: src.halfWidthPx,
      arrowHalfWidth: src.arrowHalfWidthPx,
      arrowLength: src.arrowLengthPx,
    };
    const loops = this.add(el('g', { fill: 'none', 'stroke-linecap': 'round' }), {
      stroke: 'loop',
      'stroke-width': 'loopWidth',
      'stroke-linejoin': 'lineJoin',
    });
    const elements = this.add(el('g'));

    // Joins between rows: zero length in the topology, gone in the sequence view.
    for (let r = 0; r + 1 < frames.length; r++) {
      const a = frames[r];
      const b = frames[r + 1];
      const alpha = Math.min(a.e, b.e) ** 2;
      if (alpha <= 0.01) continue;
      const p = a.pts[a.pts.length - 1];
      const q = b.pts[0];
      const line = el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, opacity: alpha.toFixed(3) });
      loops.appendChild(line);
    }

    for (const fr of frames) {
      const fa = fr.pts[0].f;
      const fb = fr.pts[fr.pts.length - 1].f;
      for (const [lo, hi] of subtract(fa, fb, this.elementRanges)) {
        const parts = [
          ...clip(this.dashed, lo, hi).map((r) => ({ r, dashed: true })),
          ...subtract(lo, hi, this.dashed).map((r) => ({ r, dashed: false })),
        ];
        for (const { r, dashed } of parts) {
          // Residues the topology leaves out (e.g. an assembly barrel's cap)
          // shrink into the drawn chain's end as they fade.
          for (const [a, b] of clip([this.drawn], r[0], r[1])) {
            this.drawLoop(loops, slice(fr.pts, a, b), dashed);
          }
          const hidden = subtract(r[0], r[1], [this.drawn]);
          const alpha = 1 - ease(fr.e / 0.6);
          if (hidden.length === 0 || alpha <= 0.01) continue;
          const g = el('g', { opacity: alpha.toFixed(3) });
          loops.appendChild(g);
          for (const [a, b] of hidden) this.drawLoop(g, slice(fr.pts, a, b), dashed);
        }
      }
      for (const e of src.elements) {
        const lo = Math.max(e.from, fa);
        const hi = Math.min(e.to, fb);
        if (hi - lo < 1e-6) continue;
        const pts = slice(fr.pts, lo, hi);
        const screen: OutlinePoint[] = pts.map((p) => ({ sx: p.x, sy: p.y }));
        const sections = ssOutline(screen, e.withArrow && e.to <= fb + 1e-6, dims);
        if (sections.length === 0) continue;
        const coloured = src.colourAt !== null;
        if (coloured) {
          for (let i = Math.ceil(lo - 0.5); i <= Math.floor(hi + 0.5); i++) {
            const c = src.colourAt!(i);
            const a = Math.max(lo, i - 0.5);
            const b = Math.min(hi, i + 0.5);
            if (!c || b <= a) continue;
            const verts = outlineSlice(screen, sections, indexAt(pts, a), indexAt(pts, b));
            if (verts.length < 3) continue;
            elements.appendChild(
              el('polygon', {
                points: polyPoints(verts.map((v) => ({ x: v.sx, y: v.sy }))),
                fill: c,
                stroke: c,
                'stroke-width': 0.5,
              }),
            );
          }
        }
        const poly = el('polygon', {
          points: polyPoints(outlinePolygon(screen, sections).map((v) => ({ x: v.sx, y: v.sy }))),
        });
        this.add(
          poly,
          {
            fill: e.type,
            stroke: e.type === 'helix' ? 'helixEdge' : 'strandEdge',
            'stroke-width': 'outlineWidth',
            'stroke-linejoin': 'lineJoin',
          },
          elements,
        );
        if (coloured) poly.setAttribute('fill-opacity', '0');
      }
    }
  }

  private drawLoop(g: Element, pts: TracePoint[], dashed: boolean): void {
    if (pts.length < 2) return;
    const colourAt = this.src.colourAt;
    if (!colourAt || dashed) {
      const line = el('polyline', { points: polyPoints(pts) });
      if (dashed) line.setAttribute('stroke-dasharray', '3 5');
      g.appendChild(line);
      return;
    }
    // One stroke piece per residue, in its colour (the plain loop colour where it has none).
    const a = pts[0].f;
    const b = pts[pts.length - 1].f;
    for (let i = Math.round(a); i <= Math.round(b); i++) {
      const lo = Math.max(a, i - 0.5);
      const hi = Math.min(b, i + 0.5);
      if (hi - lo < 1e-6) continue;
      const piece = el('polyline', { points: polyPoints(slice(pts, lo, hi)) });
      const c = colourAt(i);
      if (c) piece.setAttribute('stroke', c);
      g.appendChild(piece);
    }
  }

  /** One-letter codes above the chain, peeling away as each row leaves for the topology. */
  private drawLetters(layout: SequenceLayout, frames: ChunkFrame[]): void {
    const g = this.add(el('g', { 'text-anchor': 'middle', 'font-size': SEQ.letterFontPx }), {
      fill: 'text',
      'font-family': 'monoFontFamily',
    });
    const lift = SEQ.cartoonPx - SEQ.letterBaselinePx;
    for (const fr of frames) {
      const alpha = 1 - ease(fr.e / 0.5);
      if (alpha <= 0.01) continue;
      const row = layout.rows[fr.row];
      const rg = el('g', { opacity: alpha.toFixed(3) });
      for (let i = row.first; i <= row.last; i++) {
        const p = pointAt(fr.pts, i);
        const res = this.src.residues[i];
        const text = el('text', { x: p.x.toFixed(2), y: (p.y - lift).toFixed(2) });
        text.textContent = res.code;
        text.dataset.res = String(res.resSeq);
        const title = el('title');
        title.textContent = `${res.code} ${res.resSeq}${res.iCode}`;
        text.appendChild(title);
        rg.appendChild(text);
      }
      g.appendChild(rg);
    }
  }
}
