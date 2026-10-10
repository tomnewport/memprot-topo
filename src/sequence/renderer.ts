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
import {
  compactCentre,
  compactHeight,
  laneTop,
  layoutSequence,
  NO_EXTRAS,
  residuesPerRow,
  rowHeight,
  SEQ,
  type RowExtras,
  type SequenceLayout,
} from './layout.js';
import { gutterFor, stackHeight, TRACK, type Gutter } from '../tracks/geometry.js';
import { drawTracks } from './tracks-draw.js';
import {
  ease,
  expandAt,
  EXPAND_END,
  indexAt,
  pointAt,
  SequenceTransition,
  UNWRAP_END,
  type ChunkFrame,
} from './transition.js';
import type { SeqLane, SequenceSource, TracePoint } from './types.js';
import { residueKey } from '../residue-key.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface SequenceOptions {
  /** Residues per row; null fits whole ten-residue blocks to the width. */
  wrap: number | null;
}

export const DEFAULT_SEQUENCE_OPTIONS: SequenceOptions = { wrap: null };

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
  /** The 2-D trace in the transition's coordinates. */
  private trace: TracePoint[] = [];
  private width = 0;
  private readonly elementRanges: Range[];
  private readonly dashed: Range[];
  /** The stretch of the sequence the topology draws. */
  private readonly drawn: Range;
  /** Row room for the data tracks, and the gutter's columns. */
  private readonly extras: RowExtras;
  private readonly gutter: Gutter | null;
  /** Membrane shading, row numbers, lanes and tracks: built once per layout and theme. */
  private furniture: SVGGElement | null = null;
  /** The furniture of each row, moved as the rows collapse and expand. */
  private furnitureRows: SVGGElement[] = [];

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
    const tracks = src.tracks;
    if (tracks && tracks.above.length + tracks.below.length > 0) {
      this.gutter = gutterFor([...tracks.above, ...tracks.below]);
      const above = stackHeight(tracks.above);
      const below = stackHeight(tracks.below);
      this.extras = {
        above: above > 0 ? above + TRACK.gapPx : 0,
        below: below > 0 ? below + TRACK.gapPx : 0,
        gutterLeft: this.gutter.width,
      };
    } else {
      this.gutter = null;
      this.extras = NO_EXTRAS;
    }
  }

  /** Fit to a container `width` with the 2-D picture scrolled to `scroll0`. */
  configure(width: number, scroll0: number): void {
    this.width = width;
    const n = this.src.residues.length;
    const perRow = residuesPerRow(width, this.options.wrap, this.extras.gutterLeft);
    this.layout = layoutSequence(n, perRow, this.src.lanes.length, width, this.extras);
    this.furniture = null;
    this.offset = { x: -(this.src.frame2d.minX + scroll0), y: -this.src.frame2d.minY };
    const trace = this.src.trace.map((p) => ({
      x: p.x + this.offset.x,
      y: p.y + this.offset.y,
      f: p.f,
    }));
    this.trace = trace;
    // The rows unwrap onto one line, squeezed to fit the membrane slab where
    // it is on screen, otherwise the box.
    const o = this.src.origin2d;
    const slabX0 = o.x + this.src.slab.x0 * o.pxPerA + this.offset.x;
    const slabX1 = o.x + this.src.slab.x1 * o.pxPerA + this.offset.x;
    const right = this.layout.width - SEQ.gutterRightPx;
    this.transition = new SequenceTransition(trace, this.layout, {
      x0: slabX0 >= 0 && slabX0 < right ? slabX0 : SEQ.gutterRightPx,
      x1: Math.min(slabX1, right),
      // The first (collapsed) row stays put and the others snake up to join it.
      y: this.layout.rows.length > 0 ? compactCentre(0) : o.y + this.offset.y,
    });
  }

  setOptions(options: SequenceOptions): void {
    this.options = options;
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    this.furniture = null;
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
    const frames = transition.frame(t);
    const h2 = this.src.frame2d.height;
    const width = layout.width;
    // The picture shrinks to the collapsed rows' height as they close up, then
    // to the topology's height as the last row joins the line, so no row is
    // cut off on its way.
    const grow = expandAt(t);
    const lastUnwrap = frames.length > 0 ? frames[frames.length - 1].unwrap : 1;
    const h1 = compactHeight(layout.rows.length);
    const height = t < EXPAND_END ? h1 + (layout.height - h1) * grow : h1 + (h2 - h1) * lastUnwrap;
    svg.setAttribute('viewBox', `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`);
    svg.setAttribute('width', width.toFixed(2));
    svg.setAttribute('height', height.toFixed(2));

    const v = (t - UNWRAP_END) / (1 - UNWRAP_END);
    if (v > 0) this.drawSlab(ease(v / 0.3), transition.waveFront(t));
    // Tracks and letters fade out early in the collapse (in late, as the rows
    // expand), so rows that overlap while they move are not drawn over.
    const a1 = Math.max(0, Math.min(1, (grow - 0.4) / 0.6));
    if (a1 > 0.01) this.drawRowFurniture(layout, a1, (r) => transition.rowShift(r, t));
    this.drawChain(frames, t);
    if (a1 > 0.01) this.drawLetters(layout, frames, a1);
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

  /** The membrane slab, revealed from the left up to the folding wave. */
  private drawSlab(alpha: number, front: number): void {
    const { origin2d: o, slab, membrane } = this.src;
    const x0 = o.x + slab.x0 * o.pxPerA + this.offset.x;
    const last = this.trace.length - 1;
    const full = o.x + slab.x1 * o.pxPerA + this.offset.x;
    const x1 =
      last < 0 || front >= this.trace[last].f
        ? full
        : Math.max(x0, Math.min(full, pointAt(this.trace, front).x));
    const g = this.add(el('g', { opacity: alpha.toFixed(3) }));
    const rect = el('rect', {
      x: x0,
      y: o.y - membrane.upper * o.pxPerA + this.offset.y,
      width: Math.max(0, x1 - x0),
      height: Math.max(0, membrane.upper - membrane.lower) * o.pxPerA,
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

  /** Membrane shading, row numbers, the data lanes and the data tracks. */
  private drawRowFurniture(
    layout: SequenceLayout,
    alpha: number,
    shift: (row: number) => number,
  ): void {
    // Built once per layout and theme: a heatmap can be thousands of cells,
    // and the furniture is redrawn every frame while it fades.
    if (!this.furniture) {
      this.furniture = el('g');
      this.furniture.setAttribute('pointer-events', 'none');
      this.buildFurniture(this.furniture, layout);
    }
    this.furniture.setAttribute('opacity', alpha.toFixed(3));
    this.furnitureRows.forEach((g, r) => {
      const dy = shift(r);
      if (Math.abs(dy) < 1e-3) g.removeAttribute('transform');
      else g.setAttribute('transform', `translate(0, ${dy.toFixed(2)})`);
    });
    this.svg.appendChild(this.furniture);
  }

  private buildFurniture(parent: SVGGElement, layout: SequenceLayout): void {
    const { residues, z, membrane, lanes, tracks } = this.src;
    const cell = SEQ.cellPx;
    const gutterLeft = layout.extras.gutterLeft;
    this.furnitureRows = [];
    for (const row of layout.rows) {
      const g = el('g');
      parent.appendChild(g);
      this.furnitureRows.push(g);
      // Membrane: residues the 2-D layout puts inside the slab.
      let start = -1;
      for (let i = row.first; i <= row.last + 1; i++) {
        const inside = i <= row.last && z[i] >= membrane.lower && z[i] <= membrane.upper;
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
        x: gutterLeft - 8,
        y: row.y + SEQ.letterBaselinePx,
        'text-anchor': 'end',
        'font-size': 10,
      });
      num.textContent = String(residues[row.first].resSeq);
      this.add(num, { fill: 'textMuted', 'font-family': 'fontFamily' }, g);
      lanes.forEach((lane, k) =>
        this.drawLane(g, layout, row.first, row.last, row.y + laneTop(k), lane),
      );
      if (tracks && this.gutter) {
        const frame = { theme: this.theme, layout, row, residues, gutter: this.gutter };
        drawTracks(g, tracks.above, row.y - layout.extras.above, frame);
        drawTracks(g, tracks.below, row.y + rowHeight(lanes.length) + TRACK.gapPx, frame);
      }
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
      x: layout.extras.gutterLeft - 8,
      y: top + H / 2 + 3,
      'text-anchor': 'end',
      'font-size': 8.5,
    });
    label.textContent = lane.label.length > 9 ? `${lane.label.slice(0, 8)}…` : lane.label;
    const title = el('title');
    title.textContent = lane.label;
    label.appendChild(title);
    this.add(label, { fill: 'textMuted', 'font-family': 'fontFamily' }, g);

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
  }

  /** Loops, then helices and strands, row by row; connectors join the rows near the topology. */
  private drawChain(frames: ChunkFrame[], t: number): void {
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

    // Joins between rows while they unwrap: a carriage-return curve from the
    // end of one row to the start of the next, shrinking to nothing as they
    // meet on the line.
    const join = t >= UNWRAP_END ? 0 : ease((t - EXPAND_END) / 0.04);
    for (let r = 0; join > 0.01 && r + 1 < frames.length; r++) {
      const a = frames[r];
      const b = frames[r + 1];
      const p = a.pts[a.pts.length - 1];
      const q = b.pts[0];
      const gap = Math.hypot(q.x - p.x, q.y - p.y);
      if (gap < 0.5) continue;
      const h = Math.min(30, gap / 2);
      const d = `M${p.x.toFixed(2)},${p.y.toFixed(2)} C${(p.x + h).toFixed(2)},${p.y.toFixed(2)} ${(q.x - h).toFixed(2)},${q.y.toFixed(2)} ${q.x.toFixed(2)},${q.y.toFixed(2)}`;
      loops.appendChild(el('path', { d, opacity: (join * 0.4).toFixed(3) }));
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
          const alpha = 1 - ease((t - UNWRAP_END) / (1 - UNWRAP_END) / 0.5);
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

  /** One-letter codes above the chain, fading as the rows collapse to the cartoon. */
  private drawLetters(layout: SequenceLayout, frames: ChunkFrame[], alpha: number): void {
    if (this.src.tracks && !this.src.tracks.letters) return;
    const colourAt = this.src.tracks?.letterColour ?? null;
    const g = this.add(el('g', { 'text-anchor': 'middle', 'font-size': SEQ.letterFontPx }), {
      fill: 'text',
      'font-family': 'monoFontFamily',
    });
    if (colourAt) g.setAttribute('font-weight', '600');
    const lift = SEQ.cartoonPx - SEQ.letterBaselinePx;
    g.setAttribute('opacity', alpha.toFixed(3));
    for (const fr of frames) {
      const row = layout.rows[fr.row];
      const rg = el('g');
      for (let i = row.first; i <= row.last; i++) {
        const p = pointAt(fr.pts, i);
        const res = this.src.residues[i];
        const text = el('text', { x: p.x.toFixed(2), y: (p.y - lift).toFixed(2) });
        text.textContent = res.code;
        text.dataset.res = residueKey(res);
        const c = colourAt?.(i);
        if (c) text.setAttribute('fill', c);
        const title = el('title');
        title.textContent = `${res.code} ${res.resSeq}${res.iCode}`;
        text.appendChild(title);
        rg.appendChild(text);
      }
      g.appendChild(rg);
    }
  }
}
