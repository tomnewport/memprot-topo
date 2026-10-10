import type { MembraneProfile } from '../membrane/index.js';
import { paint, repaint, type Theme } from '../theme/index.js';
import { catmullRomBezier, type Vec } from '../unroll/index.js';
import { FADED_OPACITY, LABEL, PLOT, SS_BODY } from '../layout/constants.js';
import { flattenLoop, type LoopControlPoint } from '../layout/loops.js';
import type { ChainLayout, LayoutElement, LayoutLoop } from '../layout/chain-layout.js';
import { outlinePolygon, outlineSlice, type OutlinePoint } from './ss-outline.js';
import { residueKey, type ResidueKey } from '../residue-key.js';
import {
  measure,
  monotoneCubic,
  renderLegend,
  residueSpans,
  ribbon,
  ribbonSlice,
  slicePolyline,
  widthProfile,
  type Colouring,
} from './residue-data.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Per-residue data styling for the displayed chain (issue #23). */
export interface ResidueStyle {
  /** Colour of a residue, or undefined where it has no value; null when not colouring. */
  colour: ((key: ResidueKey) => string | undefined) | null;
  /** Width multiplier per residue (absent = 1). */
  widths: Map<ResidueKey, number>;
}

/**
 * Render a helix or strand run as one filled+stroked polygon: a uniform-width
 * body with butt ends, terminated at the C-terminal end by an integrated
 * arrowhead when `withArrow` is true. Sharing one outline (rather than
 * overlaying a separate arrow on a stroked path) is what gives the element
 * its single-shape appearance. The geometry lives in {@link ssOutline} so the
 * 3-D morph can rebuild exactly the same shape.
 *
 * Widths are specified in screen pixels and back-projected into user space so
 * the polygon stays consistent under the plot group's non-uniform scale.
 */
function drawSsPolygon(
  plot: SVGGElement,
  element: LayoutElement,
  data: ResidueStyle | undefined,
  residues: { resSeq: number; iCode?: string; sampleIndex: number }[],
): SVGPolygonElement | null {
  const { type, faded, centreline: screen, start: startIdx, end: endIdx } = element;
  let sections = element.sections;
  if (sections.length === 0) return null;
  const toPoints = (verts: OutlinePoint[]): string =>
    verts
      .map(({ sx, sy }) => `${(sx / PLOT.arcPxPerA).toFixed(3)},${(-sy / PLOT.zPxPerA).toFixed(3)}`)
      .join(' ');

  // Per-residue width: scale the body by a smooth profile through the
  // residues' factors. Arrow wings keep their flare beyond the body, so a
  // strand still shows its direction at zero width. A sliver of width is kept
  // so the outline doesn't collapse; its stroke then draws the bare line.
  if (data && data.widths.size > 0) {
    const profile = widthProfile(residues, data.widths);
    const flare = SS_BODY.arrowHalfWidthPx - SS_BODY.halfWidthPx;
    sections = sections.map((s) => {
      if (s.hw === 0) return s; // arrow tip
      const body = Math.max(0.05, SS_BODY.halfWidthPx * profile(startIdx + s.fi));
      return { ...s, hw: s.hw === SS_BODY.arrowHalfWidthPx ? body + flare : body };
    });
  }

  // Per-residue colour: one fill slice per residue under the outline, which is
  // then drawn unfilled on top so the edge and hit area stay one shape.
  const coloured =
    !!data?.colour && residues.some((r) => data.colour!(residueKey(r)) !== undefined);
  if (coloured) {
    const slices = document.createElementNS(SVG_NS, 'g');
    slices.setAttribute('class', 'residue-fill');
    slices.setAttribute('pointer-events', 'none');
    if (faded) slices.setAttribute('opacity', String(FADED_OPACITY));
    for (const span of residueSpans(residues, startIdx, endIdx)) {
      const verts = outlineSlice(screen, sections, span.from - startIdx, span.to - startIdx);
      if (verts.length < 3) continue;
      const fill = data!.colour!(span.key);
      const slice = document.createElementNS(SVG_NS, 'polygon');
      slice.setAttribute('points', toPoints(verts));
      // A hairline of the same colour hides anti-aliasing seams between slices.
      if (fill) {
        slice.setAttribute('fill', fill);
        slice.setAttribute('stroke', fill);
      } else {
        paint(slice, { fill: type, stroke: type });
      }
      slice.setAttribute('stroke-width', '0.5');
      slice.setAttribute('vector-effect', 'non-scaling-stroke');
      slice.dataset.res = span.key;
      slices.appendChild(slice);
    }
    plot.appendChild(slices);
  }

  const points = toPoints(outlinePolygon(screen, sections));

  const poly = document.createElementNS(SVG_NS, 'polygon');
  poly.setAttribute('points', points);
  paint(poly, {
    fill: type,
    stroke: type === 'helix' ? 'helixEdge' : 'strandEdge',
    'stroke-width': 'outlineWidth',
    'stroke-linejoin': 'lineJoin',
  });
  // Still painted (so the interior is clickable) but see-through to the slices.
  if (coloured) poly.setAttribute('fill-opacity', '0');
  poly.setAttribute('vector-effect', 'non-scaling-stroke');
  // Neighbouring-chain elements (assembly barrels) are desaturated so the focal
  // protomer reads as the subject.
  if (faded) poly.setAttribute('opacity', String(FADED_OPACITY));
  plot.appendChild(poly);
  return poly;
}

const LOOP_DEBUG_FILL: Record<LoopControlPoint['kind'], string> = {
  endpoint: '#1f77b4',
  tangent: '#2ca02c',
  extreme: '#d62728',
};

/**
 * Rasterise a loop control-polygon as a centripetal Catmull-Rom spline and
 * append it to `plot`. Discontinuous loops (sequence gaps, chain breaks) are
 * dashed. When `showPoints` is set, each control point gets a debug circle.
 */
function renderLoopCurve(
  plot: SVGGElement,
  markers: SVGGElement,
  points: LoopControlPoint[],
  discontinuous: boolean,
  showPoints: boolean,
  faded = false,
): SVGPathElement | null {
  if (points.length < 2) return null;

  // Express the centripetal Catmull-Rom curve as native cubic Bézier segments
  // so the SVG path stays smooth and compact (one `C` per segment).
  const curveInput: Vec[] = points.map((p) => ({ x: p.arc, y: p.z, z: 0 }));
  const bez = catmullRomBezier(curveInput);
  let d = `M${bez.start.x.toFixed(2)},${bez.start.y.toFixed(2)}`;
  for (const seg of bez.segments) {
    d +=
      ` C${seg.c1.x.toFixed(2)},${seg.c1.y.toFixed(2)}` +
      ` ${seg.c2.x.toFixed(2)},${seg.c2.y.toFixed(2)}` +
      ` ${seg.end.x.toFixed(2)},${seg.end.y.toFixed(2)}`;
  }

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  paint(path, { stroke: 'loop', 'stroke-width': 'loopWidth', 'stroke-linejoin': 'lineJoin' });
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  if (discontinuous) path.setAttribute('stroke-dasharray', '3 5');
  if (faded) path.setAttribute('opacity', String(FADED_OPACITY));
  plot.appendChild(path);

  if (showPoints) {
    for (const p of points) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'loop-debug-point');
      dot.setAttribute('cx', (p.arc * PLOT.arcPxPerA).toFixed(2));
      dot.setAttribute('cy', (-p.z * PLOT.zPxPerA).toFixed(2));
      dot.setAttribute('r', '2.5');
      dot.setAttribute('fill', LOOP_DEBUG_FILL[p.kind]);
      paint(dot, { stroke: 'background' });
      dot.setAttribute('stroke-width', '0.5');
      markers.appendChild(dot);
    }
  }
  return path;
}

/** Loop stroke width in screen pixels. */
const LOOP_STROKE_PX = 1.8;

/** Narrowest a loop is drawn (screen px), at a width factor of 0: a hairline. */
const LOOP_MIN_WIDTH_PX = 0.5;

/**
 * Draw a loop's residues as consecutive pieces over the loop curve, each
 * coloured and sized by its residue's data. Residues share the curve's length
 * equally, in sequence order, since the loop is a smoothed connector rather
 * than a residue-by-residue trace. With width data the loop becomes a filled
 * ribbon whose width follows a smooth profile through the residue centres;
 * otherwise (and for dashed loops) each residue is a stroke piece. Returns
 * false when no residue has data (the plain curve then stands alone).
 */
function drawLoopData(
  plot: SVGGElement,
  points: LoopControlPoint[],
  loopResidues: ResidueKey[],
  data: ResidueStyle,
  discontinuous: boolean,
): boolean {
  const n = loopResidues.length;
  if (n === 0 || points.length < 2) return false;
  const hasData = loopResidues.some(
    (key) => data.widths.has(key) || data.colour?.(key) !== undefined,
  );
  if (!hasData) return false;

  const poly = measure(flattenLoop(points));
  const total = poly[poly.length - 1].d;
  if (total <= 0) return false;

  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'residue-stroke');
  group.setAttribute('pointer-events', 'none');
  const widthPx = (f: number): number => Math.max(LOOP_MIN_WIDTH_PX, LOOP_STROKE_PX * f);

  if (!discontinuous && loopResidues.some((key) => data.widths.has(key))) {
    const profile = monotoneCubic(
      loopResidues.map((_, k) => ((k + 0.5) / n) * total),
      loopResidues.map((key) => data.widths.get(key) ?? 1),
    );
    // Plot units are Å; the plot scale is uniform (1:1 aspect).
    const rib = ribbon(poly, (d) => widthPx(profile(d)) / 2 / PLOT.arcPxPerA);
    for (let k = 0; k < n; k++) {
      const key = loopResidues[k];
      const colour = data.colour?.(key);
      const piece = document.createElementNS(SVG_NS, 'polygon');
      piece.setAttribute(
        'points',
        ribbonSlice(rib, (k / n) * total, ((k + 1) / n) * total)
          .map((q) => `${q.x.toFixed(3)},${q.y.toFixed(3)}`)
          .join(' '),
      );
      // A hairline of the same colour hides anti-aliasing seams between pieces.
      if (colour) {
        piece.setAttribute('fill', colour);
        piece.setAttribute('stroke', colour);
      } else {
        paint(piece, { fill: 'loop', stroke: 'loop' });
      }
      piece.setAttribute('stroke-width', '0.4');
      piece.setAttribute('stroke-linejoin', 'round');
      piece.setAttribute('vector-effect', 'non-scaling-stroke');
      piece.dataset.res = key;
      group.appendChild(piece);
    }
    plot.appendChild(group);
    return true;
  }

  for (let k = 0; k < n; k++) {
    const piece = slicePolyline(poly, (k / n) * total, ((k + 1) / n) * total);
    const key = loopResidues[k];
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute(
      'd',
      piece.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(''),
    );
    path.setAttribute('fill', 'none');
    const colour = data.colour?.(key);
    if (colour) path.setAttribute('stroke', colour);
    else paint(path, { stroke: 'loop' });
    const w = widthPx(data.widths.get(key) ?? 1);
    path.setAttribute('stroke-width', w.toFixed(2));
    // Round caps join the pieces without gaps at bends.
    path.setAttribute('stroke-linecap', discontinuous ? 'butt' : 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    if (discontinuous) path.setAttribute('stroke-dasharray', '3 5');
    path.dataset.res = key;
    group.appendChild(path);
  }
  plot.appendChild(group);
  return true;
}

/** Tag a loop path with the residue range it stands for, for selection styling. */
function markLoop(path: SVGPathElement, start: number, end: number): void {
  path.classList.add('loop');
  path.dataset.start = String(start);
  path.dataset.end = String(end);
}

/**
 * Make a helix/strand polygon behave as a button: focusable, labelled, and
 * tagged with its residue range. Events are wired by the component.
 */
function markSsElement(
  poly: SVGPolygonElement,
  type: 'helix' | 'strand',
  start: number,
  end: number,
): void {
  poly.classList.add('ss-element');
  poly.dataset.type = type;
  poly.dataset.start = String(start);
  poly.dataset.end = String(end);
  poly.setAttribute('role', 'button');
  poly.setAttribute('tabindex', '0');
  poly.setAttribute('aria-pressed', 'false');
  poly.setAttribute('aria-label', `${type === 'helix' ? 'Helix' : 'Strand'} ${start}–${end}`);
}

/**
 * SVG path data for the membrane between the two leaflet profiles: along the
 * upper leaflet, back along the lower one, closed. Plot units (Å).
 */
function membranePath(profile: MembraneProfile): string {
  const n = profile.x.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    d += `${i === 0 ? 'M' : 'L'}${profile.x[i].toFixed(2)},${profile.upper[i].toFixed(2)}`;
  }
  for (let i = n - 1; i >= 0; i--) {
    d += `L${profile.x[i].toFixed(2)},${profile.lower[i].toFixed(2)}`;
  }
  return d + 'Z';
}

/** Residue data for the chain being drawn: its styling and the legend to show. */
export interface ChainDisplayData {
  style: ResidueStyle;
  /** Colour scale for the legend; null when the chain isn't coloured. */
  colouring: Colouring | null;
  /** Unique prefix for ids inside the svg (legend gradient). */
  idPrefix: string;
}

/** How {@link render2d} draws a layout, beyond the theme. */
export interface Render2dOptions {
  /** Draw a debug circle at each loop control point (`debug-loops`). */
  showLoopPoints?: boolean;
  /** Residue data to style the chain with, and its legend. */
  display?: ChainDisplayData;
}

/**
 * Paint a chain layout as the 2-D topology SVG: membrane band, contact ties,
 * elements and loops in draw order, residue-number labels, debug markers and
 * the colour legend. Returns the svg and its 2-D-only decorations (labels and
 * legend), which the sequence view fades.
 */
export function render2d(
  layout: ChainLayout,
  theme: Theme,
  { showLoopPoints = false, display }: Render2dOptions = {},
): { svg: SVGSVGElement; decor2d: Element[] } {
  const { frame, segments } = layout;
  const { profile } = layout.membrane;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `${frame.minX} ${frame.minY} ${frame.width} ${frame.height}`);
  // Intrinsic pixel size matches the viewBox so 1 user unit = 1 device px by
  // default. The host container can override with CSS, but most embeddings —
  // gallery screenshots, PR comment images — should see the natural width so
  // long chains (β-barrels) don't get compressed to fit a parent.
  svg.setAttribute('width', `${frame.width}`);
  svg.setAttribute('height', `${frame.height}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute(
    'aria-label',
    layout.assemblyStrands !== null
      ? `Chain ${layout.chainId} highlighted in a ${layout.assemblyStrands}-strand assembly β-barrel`
      : `Chain ${layout.chainId} membrane unrolling`,
  );

  // Inner plot group with a transform that flips z so positive z is up and
  // applies the user-space scale. Inside this group, coordinates are (arc, z)
  // in Ångström, with the origin at (0, 0) — bilayer midplane.
  const plot = document.createElementNS(SVG_NS, 'g');
  const cx = frame.originX;
  const cy = frame.originY;
  plot.setAttribute(
    'transform',
    `translate(${cx}, ${cy}) scale(${PLOT.arcPxPerA}, ${-PLOT.zPxPerA})`,
  );
  svg.appendChild(plot);

  // Membrane. Drawn first so the trace appears on top; kept faint and
  // semi-transparent so the in-membrane portion of the trace remains clearly
  // visible (β-strand sections in particular spend most of their length here).
  const slab = document.createElementNS(SVG_NS, 'path');
  slab.setAttribute('class', 'membrane');
  slab.setAttribute('d', membranePath(profile));
  paint(slab, { fill: 'membrane', stroke: 'membraneEdge', 'stroke-width': 'membraneEdgeWidth' });
  slab.setAttribute('fill-opacity', '0.55');
  // Stroke gets multiplied by the (non-uniform) scale, so use vector-effect to
  // keep it 1px regardless of zoom.
  slab.setAttribute('vector-effect', 'non-scaling-stroke');
  slab.setAttribute('stroke-linejoin', 'round');
  plot.appendChild(slab);

  // Zero (z = 0) reference line — bulk membrane midplane.
  const mid = document.createElementNS(SVG_NS, 'line');
  mid.setAttribute('x1', `${profile.x[0].toFixed(2)}`);
  mid.setAttribute('x2', `${profile.x[profile.x.length - 1].toFixed(2)}`);
  mid.setAttribute('y1', '0');
  mid.setAttribute('y2', '0');
  paint(mid, { stroke: 'midplane', 'stroke-width': 'midplaneWidth' });
  mid.setAttribute('stroke-dasharray', '4 4');
  mid.setAttribute('vector-effect', 'non-scaling-stroke');
  plot.appendChild(mid);

  // β-sheet contact ties, drawn first so the strand polygons sit on top of them.
  if (layout.ties) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', 'contact-ties');
    for (const { a, b } of layout.ties) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', a.arc.toFixed(3));
      line.setAttribute('y1', a.z.toFixed(3));
      line.setAttribute('x2', b.arc.toFixed(3));
      line.setAttribute('y2', b.z.toFixed(3));
      paint(line, { stroke: 'contact', 'stroke-width': 'contactWidth' });
      line.setAttribute('stroke-opacity', '0.5');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      group.appendChild(line);
    }
    plot.appendChild(group);
  }

  // Labels group: same origin as `plot` but no scale, so text isn't
  // y-flipped or stretched by the plot transform. Appended after the plot
  // group below so labels render on top of polygons.
  const labelsGroup = document.createElementNS(SVG_NS, 'g');
  labelsGroup.setAttribute('transform', `translate(${cx}, ${cy})`);
  paint(labelsGroup, { 'font-family': 'fontFamily' });

  // Debug markers for loop control points. Non-scaled (translate only) so the
  // dots stay circular; drawn last so they sit on top.
  const markersGroup = document.createElementNS(SVG_NS, 'g');
  markersGroup.setAttribute('transform', `translate(${cx}, ${cy})`);

  // Data is keyed by chain, so it styles only the focal chain's segments.
  const dataOf = (seg: number): ResidueStyle | undefined =>
    segments[seg].focal ? display?.style : undefined;

  const items: (LayoutElement | LayoutLoop)[] = [...layout.elements, ...layout.loops].sort(
    (a, b) => a.order - b.order,
  );
  for (const item of items) {
    if ('type' in item) {
      const residues = segments[item.seg].residues.slice(item.residueStart, item.residueEnd + 1);
      const poly = drawSsPolygon(plot, item, dataOf(item.seg), residues);
      // Focal-chain elements act as buttons (see TopologyDisplay.bindElements).
      if (poly && item.selectable) {
        markSsElement(poly, item.type, item.selectable.start, item.selectable.end);
      }
      continue;
    }
    const path = renderLoopCurve(
      plot,
      markersGroup,
      item.points,
      item.discontinuous,
      showLoopPoints,
      item.faded,
    );
    // Residue data is drawn over the curve, which stays as the hit area and the
    // selection halo (hidden otherwise; see `.loop.has-data`).
    const data = item.connector ? undefined : dataOf(item.seg);
    if (path && data && drawLoopData(plot, item.points, item.residues, data, item.discontinuous)) {
      path.classList.add('has-data');
    }
    if (path && item.selectable) markLoop(path, item.selectable.start, item.selectable.end);
  }

  for (const { box, text } of layout.labels) {
    if (!box) continue;
    const textEl = document.createElementNS(SVG_NS, 'text');
    textEl.setAttribute('x', box.cx.toFixed(2));
    textEl.setAttribute('y', box.cy.toFixed(2));
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('font-size', `${LABEL.fontSizePx}`);
    paint(textEl, { fill: 'label' });
    textEl.textContent = text;
    labelsGroup.appendChild(textEl);
  }

  svg.appendChild(labelsGroup);
  svg.appendChild(markersGroup);
  const decor2d: Element[] = [labelsGroup];

  // Colour legend under the plot. The 3-D view replaces the whole picture,
  // legend included, so it is not part of the layout's frame.
  if (display?.colouring) {
    const vb = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const legendX = vb[0] + PLOT.margin.left;
    const legendY = vb[1] + vb[3] + 4;
    const { group, height } = renderLegend(
      display.colouring,
      vb[2] - PLOT.margin.left - PLOT.margin.right,
      display.idPrefix,
    );
    group.setAttribute('transform', `translate(${legendX}, ${legendY})`);
    svg.appendChild(group);
    decor2d.push(group);
    const h = vb[3] + 4 + height + 12;
    svg.setAttribute('viewBox', `${vb[0]} ${vb[1]} ${vb[2]} ${h}`);
    svg.setAttribute('height', `${h}`);
  }

  repaint(svg, theme);
  return { svg, decor2d };
}
