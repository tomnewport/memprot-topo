import type { MembraneBounds } from '../types.js';
import { boundingBox, type SecondaryRun } from './geometry.js';
import type { ProjectedResidue } from './projection.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export interface RenderOptions {
  /** Bilayer slab bounds in membrane-frame z (Ångström). */
  membrane?: MembraneBounds;
  /** Drawing scale. */
  pixelsPerAngstrom?: number;
  /** Padding around the protein bounding box, in pixels. */
  padding?: number;
  /** Width of helix bars, in Ångström. */
  helixWidthAngstrom?: number;
  /** Width of strand bars, in Ångström. */
  strandWidthAngstrom?: number;
  /** Stroke width of loops, in pixels. */
  coilStrokeWidth?: number;
  /** Color palette (Okabe-Ito where applicable — colorblind-safe). */
  helixColor?: string;
  helixStroke?: string;
  strandColor?: string;
  strandStroke?: string;
  coilColor?: string;
  membraneFill?: string;
  membraneStroke?: string;
  /** Show residue numbers at the endpoints of helices and strands. */
  showResidueLabels?: boolean;
}

type ResolvedRenderOptions = Required<RenderOptions>;

const DEFAULTS: ResolvedRenderOptions = {
  membrane: { lower: -15, upper: 15 },
  pixelsPerAngstrom: 6,
  padding: 32,
  helixWidthAngstrom: 5,
  strandWidthAngstrom: 4,
  coilStrokeWidth: 1.5,
  helixColor: '#7a9cd6',
  helixStroke: '#3d5a8a',
  strandColor: '#f0c674',
  strandStroke: '#a07e2a',
  coilColor: '#666',
  membraneFill: '#eef0f3',
  membraneStroke: '#b8bec7',
  showResidueLabels: true,
};

/**
 * Render a single chain's secondary structure runs as an SVG topology diagram.
 * Membrane normal is the v (vertical) axis; the bilayer slab is drawn between
 * `membrane.lower` and `membrane.upper`. SVG y is flipped so membrane-z increases
 * upward in the rendered image.
 */
export function renderTopologySvg(
  runs: SecondaryRun[],
  options: RenderOptions = {},
): SVGSVGElement {
  const opts = { ...DEFAULTS, ...options, membrane: options.membrane ?? DEFAULTS.membrane };

  const allResidues = runs.flatMap((r) => r.residues);
  const bbox = boundingBox(allResidues);
  const minV = Math.min(bbox.minV, opts.membrane.lower);
  const maxV = Math.max(bbox.maxV, opts.membrane.upper);
  const minU = bbox.minU;
  const maxU = bbox.maxU;

  // Add some Ångström-space buffer so terminal residues aren't flush against the edge.
  const buffer = 4;
  const widthA = maxU - minU + 2 * buffer;
  const heightA = maxV - minV + 2 * buffer;
  const widthPx = widthA * opts.pixelsPerAngstrom + 2 * opts.padding;
  const heightPx = heightA * opts.pixelsPerAngstrom + 2 * opts.padding;

  // Coordinate transforms: Å in the membrane frame → SVG pixels.
  const toX = (u: number): number => (u - minU + buffer) * opts.pixelsPerAngstrom + opts.padding;
  const toY = (v: number): number => (maxV - v + buffer) * opts.pixelsPerAngstrom + opts.padding;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${widthPx} ${heightPx}`);
  svg.setAttribute('width', String(widthPx));
  svg.setAttribute('height', String(heightPx));
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Membrane protein topology diagram');

  svg.appendChild(buildMembrane(opts, widthPx, toY));

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    if (run.type === 'helix') {
      svg.appendChild(buildHelix(run, opts, toX, toY));
    } else if (run.type === 'strand') {
      svg.appendChild(buildStrand(run, opts, toX, toY));
    } else {
      const before = i > 0 ? lastResidue(runs[i - 1]) : null;
      const after = i < runs.length - 1 ? firstResidue(runs[i + 1]) : null;
      svg.appendChild(buildCoil(run, before, after, opts, toX, toY));
    }
  }

  return svg;
}

function buildMembrane(
  opts: ResolvedRenderOptions,
  widthPx: number,
  toY: (v: number) => number,
): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'membrane');

  const yUpper = toY(opts.membrane.upper);
  const yLower = toY(opts.membrane.lower);

  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('x', '0');
  slab.setAttribute('y', String(yUpper));
  slab.setAttribute('width', String(widthPx));
  slab.setAttribute('height', String(yLower - yUpper));
  slab.setAttribute('fill', opts.membraneFill);
  g.appendChild(slab);

  for (const y of [yUpper, yLower]) {
    const line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(widthPx));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', opts.membraneStroke);
    line.setAttribute('stroke-width', '1');
    g.appendChild(line);
  }

  return g;
}

function buildHelix(
  run: SecondaryRun,
  opts: ResolvedRenderOptions,
  toX: (u: number) => number,
  toY: (v: number) => number,
): SVGGElement {
  return buildBar(
    run,
    opts.helixWidthAngstrom * opts.pixelsPerAngstrom,
    opts.helixColor,
    opts.helixStroke,
    opts,
    toX,
    toY,
  );
}

function buildStrand(
  run: SecondaryRun,
  opts: ResolvedRenderOptions,
  toX: (u: number) => number,
  toY: (v: number) => number,
): SVGGElement {
  return buildBar(
    run,
    opts.strandWidthAngstrom * opts.pixelsPerAngstrom,
    opts.strandColor,
    opts.strandStroke,
    opts,
    toX,
    toY,
  );
}

function buildBar(
  run: SecondaryRun,
  barWidthPx: number,
  fill: string,
  stroke: string,
  opts: ResolvedRenderOptions,
  toX: (u: number) => number,
  toY: (v: number) => number,
): SVGGElement {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', `${run.type}`);

  const first = run.residues[0];
  const last = run.residues[run.residues.length - 1];

  // Single-residue run: render a small disc so it stays visible.
  if (first === last) {
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx', String(toX(first.u)));
    dot.setAttribute('cy', String(toY(first.v)));
    dot.setAttribute('r', String(barWidthPx / 2));
    dot.setAttribute('fill', fill);
    dot.setAttribute('stroke', stroke);
    dot.setAttribute('stroke-width', '1');
    g.appendChild(dot);
    return g;
  }

  const x1 = toX(first.u);
  const y1 = toY(first.v);
  const x2 = toX(last.u);
  const y2 = toY(last.v);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;

  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(-length / 2));
  rect.setAttribute('y', String(-barWidthPx / 2));
  rect.setAttribute('width', String(length));
  rect.setAttribute('height', String(barWidthPx));
  rect.setAttribute('rx', String(barWidthPx / 2));
  rect.setAttribute('fill', fill);
  rect.setAttribute('stroke', stroke);
  rect.setAttribute('stroke-width', '1');
  rect.setAttribute('transform', `translate(${cx} ${cy}) rotate(${angleDeg})`);

  const title = document.createElementNS(SVG_NS, 'title');
  title.textContent = `${run.type[0].toUpperCase()}${run.type.slice(1)} ${first.resSeq}–${last.resSeq}`;
  rect.appendChild(title);
  g.appendChild(rect);

  if (opts.showResidueLabels) {
    g.appendChild(buildLabel(first.resSeq, x1, y1, dx, dy, true));
    g.appendChild(buildLabel(last.resSeq, x2, y2, dx, dy, false));
  }
  return g;
}

function buildLabel(
  resSeq: number,
  anchorX: number,
  anchorY: number,
  dx: number,
  dy: number,
  isStart: boolean,
): SVGTextElement {
  // Offset the label perpendicular to the bar axis so it doesn't overlap.
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len; // perpendicular
  const py = dx / len;
  const offset = 8;
  const text = document.createElementNS(SVG_NS, 'text');
  text.setAttribute('x', String(anchorX + px * offset + (isStart ? -2 : 2)));
  text.setAttribute('y', String(anchorY + py * offset + 3));
  text.setAttribute('font-size', '10');
  text.setAttribute('font-family', 'sans-serif');
  text.setAttribute('fill', '#444');
  text.setAttribute('text-anchor', isStart ? 'end' : 'start');
  text.textContent = String(resSeq);
  return text;
}

function buildCoil(
  run: SecondaryRun,
  before: ProjectedResidue | null,
  after: ProjectedResidue | null,
  opts: ResolvedRenderOptions,
  toX: (u: number) => number,
  toY: (v: number) => number,
): SVGPathElement {
  const points: Array<[number, number]> = [];
  if (before) points.push([toX(before.u), toY(before.v)]);
  for (const r of run.residues) points.push([toX(r.u), toY(r.v)]);
  if (after) points.push([toX(after.u), toY(after.v)]);

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', catmullRomPath(points));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', opts.coilColor);
  path.setAttribute('stroke-width', String(opts.coilStrokeWidth));
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('class', 'coil');
  return path;
}

/**
 * Build a smoothed SVG path from a sequence of points using a Catmull-Rom-to-Bezier
 * conversion. Endpoints are duplicated so the curve passes through the first/last point.
 */
function catmullRomPath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M${x} ${y}`;
  }
  if (points.length === 2) {
    const [x0, y0] = points[0];
    const [x1, y1] = points[1];
    return `M${x0} ${y0} L${x1} ${y1}`;
  }
  const d: string[] = [`M${points[0][0]} ${points[0][1]}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? points[i + 1];

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    d.push(`C${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2[0]} ${p2[1]}`);
  }
  return d.join(' ');
}

function firstResidue(run: SecondaryRun): ProjectedResidue {
  return run.residues[0];
}

function lastResidue(run: SecondaryRun): ProjectedResidue {
  return run.residues[run.residues.length - 1];
}
