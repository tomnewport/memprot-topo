import type {
  ChainData,
  ProteinData,
  SecondaryStructureSegment,
  SecondaryStructureType,
} from '../types.js';
import {
  unrollChain,
  sampleCurve,
  type UnrolledSegment,
  type UnrolledPoint,
  type Vec,
} from '../unroll/index.js';
import { selectTransmembraneChains } from '../orientation/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STYLES = `
  :host {
    display: block;
    font-family: sans-serif;
    padding: 0.5rem;
    max-width: 100%;
  }
  .protein-id {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }
  .chain-block { margin-top: 0.75rem; }
  .chain-label {
    font-family: monospace;
    font-size: 0.85rem;
    color: #444;
    margin-bottom: 0.25rem;
  }
  .chain-note {
    font-size: 0.8rem;
    color: #6c757d;
    font-style: italic;
    margin-top: 0.25rem;
  }
  .chain-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: #fafafa;
    border-radius: 4px;
    border: 1px solid #efefef;
  }
  .chain-violin {
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    padding: 0.25rem 0.4rem 0.3rem;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: inherit;
  }
  .chain-violin:hover { background: #eef3f8; }
  .chain-violin.selected {
    background: #e6f2ff;
    border-color: #1f77b4;
  }
  .chain-violin:focus-visible {
    outline: 2px solid #1f77b4;
    outline-offset: 1px;
  }
  .violin-label {
    font-family: monospace;
    font-size: 0.75rem;
    color: #333;
    margin-top: 0.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
  }
  .violin-label .residues { color: #777; font-size: 0.7rem; }
  .chain-picker-label {
    font-size: 0.75rem;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  .svg-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  svg {
    display: block;
    max-width: none;
    /* no height: auto — inside overflow-x:auto containers it causes the browser
       to compute height from container width, producing a huge whitespace gap */
  }
  .placeholder { font-style: italic; color: #888; }
`;

const PLOT = {
  width: 1200,
  // Top/bottom/right padded enough for residue-number labels that sit just
  // past the membrane-facing tips of helix/strand polygons.
  margin: { top: 36, right: 40, bottom: 36, left: 40 },
  // Membrane bilayer half-thickness (Å) for visual reference.
  membraneHalf: 15,
  /** Maximum |z| (Å) shown on the y-axis — auto-expands if data exceeds. */
  zRangeMin: 25,
  /**
   * Å per pixel on the x-axis (arc length).  Set equal to `zPxPerA` for a
   * 1:1 aspect ratio so that tilt angles in the 2-D plot faithfully match
   * the true 3-D tilt.  The previous 1.6/4 ratio produced 2.5× vertical
   * exaggeration that inflated apparent helix angles once the unroller
   * started reporting geometrically accurate arc lengths.
   */
  arcPxPerA: 2.5,
  /** Å per pixel on the y-axis (real z).  Equal to arcPxPerA for 1:1 aspect ratio. */
  zPxPerA: 2.5,
};

const COLOURS = {
  membraneFill: '#eaeaea',
  membraneEdge: '#bdbdbd',
  zAxis: '#666',
  coil: '#666',
  helix: '#6e8db6',
  helixEdge: '#3e587a',
  strand: '#6ea76d',
  strandEdge: '#3d6d3d',
  break: '#aaa',
};

const LOOP = {
  /**
   * Fixed horizontal distance (screen px) between adjacent SS elements, measured
   * centre-of-path to centre-of-path (end of the previous element to the start
   * of the next).  SS elements are repositioned so every inter-element gap is
   * exactly this wide, regardless of the loop's real arc length.
   */
  elementGapPx: 30,
  /**
   * Distance (screen px) to follow each element's end/start tangent when placing
   * the loop's tangent control points (points 2 and 6 in the sequence).
   */
  tangentMagPx: 10,
  /**
   * If the loop's vertical extreme lies more than this fraction of the
   * tangent-points' z-range beyond that range, three extra control points are
   * placed at the extreme to pull the curve out to the real excursion.
   */
  extremeThreshold: 0.2,
  /** Horizontal spacing (screen px) between the three vertical-extreme points. */
  extremeSpacingPx: 5,
  /** Samples per Catmull-Rom segment when rasterising the loop curve. */
  curveSamples: 12,
};

function isBetaBarrel(chain: ChainData): boolean {
  let helixRes = 0,
    strandRes = 0;
  for (const seg of chain.segments) {
    const len = seg.end - seg.start + 1;
    if (seg.type === 'helix') helixRes += len;
    else if (seg.type === 'strand') strandRes += len;
  }
  return strandRes > helixRes && strandRes > 0;
}

function ssTypeAt(segments: SecondaryStructureSegment[], resSeq: number): SecondaryStructureType {
  for (const s of segments) {
    if (resSeq >= s.start && resSeq <= s.end) return s.type;
  }
  return 'coil';
}

interface SsRun {
  type: SecondaryStructureType;
  /** Sample indices defining the polygon body (may extend to the start of the next run). */
  startSample: number;
  endSample: number;
  /** Actual first and last residue numbers of this run. */
  startResSeq: number;
  endResSeq: number;
  /** Sample index of the actual last residue (used for label placement). */
  endResSampleIdx: number;
  /** Index of the first residue in this run within the parent `residues` array. */
  residueStart: number;
  /** Index of the last residue in this run within the parent `residues` array. */
  residueEnd: number;
}

/** Group consecutive residue indices that share the same SS type into runs. */
function runsBySs(
  residues: { resSeq: number; sampleIndex: number }[],
  segments: SecondaryStructureSegment[],
): SsRun[] {
  if (residues.length === 0) return [];
  const runs: SsRun[] = [];
  let runType = ssTypeAt(segments, residues[0].resSeq);
  let runStartSample = residues[0].sampleIndex;
  let runStartResIdx = 0;

  for (let i = 1; i < residues.length; i++) {
    const t = ssTypeAt(segments, residues[i].resSeq);
    if (t !== runType) {
      runs.push({
        type: runType,
        startSample: runStartSample,
        endSample: residues[i].sampleIndex,
        startResSeq: residues[runStartResIdx].resSeq,
        endResSeq: residues[i - 1].resSeq,
        endResSampleIdx: residues[i - 1].sampleIndex,
        residueStart: runStartResIdx,
        residueEnd: i - 1,
      });
      runType = t;
      runStartSample = residues[i].sampleIndex;
      runStartResIdx = i;
    }
  }
  const lastIdx = residues.length - 1;
  runs.push({
    type: runType,
    startSample: runStartSample,
    endSample: residues[lastIdx].sampleIndex,
    startResSeq: residues[runStartResIdx].resSeq,
    endResSeq: residues[lastIdx].resSeq,
    endResSampleIdx: residues[lastIdx].sampleIndex,
    residueStart: runStartResIdx,
    residueEnd: lastIdx,
  });
  return runs;
}

const SS_BODY = {
  /** Body half-width in screen pixels (full SS element width = 8 px). */
  halfWidthPx: 4,
  /** Arrow wing half-width — 1.5× the body so the wings flare visibly. */
  arrowHalfWidthPx: 6,
  /** Distance from the tip back to the arrow's base, in screen pixels. */
  arrowLengthPx: 12,
};

const SS_STYLE: Record<'helix' | 'strand', { fill: string; stroke: string }> = {
  helix: { fill: COLOURS.helix, stroke: COLOURS.helixEdge },
  strand: { fill: COLOURS.strand, stroke: COLOURS.strandEdge },
};

const LABEL = {
  fontSizePx: 11,
  /** Gap (screen pixels) between the polygon tip and the nearest label edge. */
  gapPx: 3,
  /** How many samples to step across when computing the endpoint tangent.
   * Stepping > 1 averages out the helix curl that makes single-sample
   * tangents jitter at the ends. */
  tangentStepSamples: 3,
  fill: '#333',
};

interface LabelBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/** Rough text width for sans-serif digits: ~0.6 em average per character. */
function approxTextWidth(text: string, fontSizePx: number): number {
  return text.length * fontSizePx * 0.6;
}

/**
 * Render a residue-number label just past the start or end of a helix/strand
 * polygon. The label sits along the outward direction of the SS's local
 * tangent so it reads as a continuation of the element. The distance from the
 * endpoint is chosen so the label's nearest edge clears the polygon tip by
 * `LABEL.gapPx` regardless of the tangent angle — keeping every label snug to
 * the feature it identifies.
 */
function placeResidueLabel(
  labelsGroup: SVGGElement,
  samples: UnrolledPoint[],
  sampleIdx: number,
  resSeq: number,
  isStart: boolean,
  placedBoxes: LabelBox[],
): void {
  if (samples.length < 2) return;

  const sx = samples[sampleIdx].arc * PLOT.arcPxPerA;
  const sy = -samples[sampleIdx].z * PLOT.zPxPerA;

  // Tangent (a→b) of the SS at this endpoint, in screen pixels. For the start
  // endpoint we look forward into the body; for the end we look backward.
  const step = LABEL.tangentStepSamples;
  const a = isStart ? sampleIdx : Math.max(0, sampleIdx - step);
  const b = isStart ? Math.min(samples.length - 1, sampleIdx + step) : sampleIdx;
  if (a === b) return;
  const tdx = (samples[b].arc - samples[a].arc) * PLOT.arcPxPerA;
  const tdy = -(samples[b].z - samples[a].z) * PLOT.zPxPerA;
  const tlen = Math.hypot(tdx, tdy);
  if (tlen < 1e-9) return;

  // Outward = away from SS body. At the start endpoint that's −tangent, at
  // the end endpoint it's +tangent.
  const sign = isStart ? -1 : 1;
  const outX = (sign * tdx) / tlen;
  const outY = (sign * tdy) / tlen;

  const text = String(resSeq);
  const fontSize = LABEL.fontSizePx;
  const w = approxTextWidth(text, fontSize);
  const h = fontSize;

  // Distance from endpoint to label centre such that the label's inner edge
  // sits `gapPx` past the endpoint. The label box projects half-width along x
  // and half-height along y onto the outward unit vector.
  const projHalf = Math.abs(outX) * (w / 2) + Math.abs(outY) * (h / 2);
  const offset = projHalf + LABEL.gapPx;

  const cx = sx + outX * offset;
  const cy = sy + outY * offset;

  placedBoxes.push({ cx, cy, w, h });

  const textEl = document.createElementNS(SVG_NS, 'text');
  textEl.setAttribute('x', cx.toFixed(2));
  textEl.setAttribute('y', cy.toFixed(2));
  textEl.setAttribute('text-anchor', 'middle');
  textEl.setAttribute('dominant-baseline', 'central');
  textEl.setAttribute('font-size', `${fontSize}`);
  textEl.setAttribute('fill', LABEL.fill);
  textEl.textContent = text;
  labelsGroup.appendChild(textEl);
}

/**
 * Render a helix or strand run as one filled+stroked polygon: a uniform-width
 * body with butt ends, terminated at the C-terminal end by an integrated
 * arrowhead when `withArrow` is true. Sharing one outline (rather than
 * overlaying a separate arrow on a stroked path) is what gives the element
 * its single-shape appearance.
 *
 * Widths are specified in screen pixels and back-projected into user space so
 * the polygon stays consistent under the plot group's non-uniform scale.
 */
function drawSsPolygon(
  plot: SVGGElement,
  samples: UnrolledPoint[],
  startIdx: number,
  endIdx: number,
  type: 'helix' | 'strand',
  withArrow: boolean,
): void {
  if (endIdx <= startIdx) return;

  const screen: { sx: number; sy: number }[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    screen.push({ sx: samples[i].arc * PLOT.arcPxPerA, sy: -samples[i].z * PLOT.zPxPerA });
  }
  if (screen.length < 2) return;

  // Unit tangent in screen space at each sample (averaged across adjacent
  // segments at interior points so the perpendicular offsets transition smoothly).
  const tx = new Array<number>(screen.length).fill(0);
  const ty = new Array<number>(screen.length).fill(0);
  for (let i = 0; i < screen.length; i++) {
    let dx = 0,
      dy = 0;
    if (i > 0) {
      dx += screen[i].sx - screen[i - 1].sx;
      dy += screen[i].sy - screen[i - 1].sy;
    }
    if (i < screen.length - 1) {
      dx += screen[i + 1].sx - screen[i].sx;
      dy += screen[i + 1].sy - screen[i].sy;
    }
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 1e-9) {
      tx[i] = dx / len;
      ty[i] = dy / len;
    }
  }

  const halfW = SS_BODY.halfWidthPx;
  const arrowHalfW = SS_BODY.arrowHalfWidthPx;
  const arrowLen = SS_BODY.arrowLengthPx;
  const lastIdx = screen.length - 1;

  // Arrow base = a point `arrowLen` screen pixels back from the tip along the
  // polyline. `bodyLast` is the last sample fully part of the body before the
  // arrow base; sample indices > bodyLast sit inside the arrowhead.
  let bodyLast = lastIdx;
  let baseSx = screen[lastIdx].sx;
  let baseSy = screen[lastIdx].sy;
  let basePx = -ty[lastIdx];
  let basePy = tx[lastIdx];

  if (withArrow) {
    let remaining = arrowLen;
    let baseSegEnd = lastIdx;
    let baseFrac = 0;
    let walkedOff = true;
    for (let i = lastIdx; i > 0; i--) {
      const dx = screen[i].sx - screen[i - 1].sx;
      const dy = screen[i].sy - screen[i - 1].sy;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      if (segLen <= 0) continue;
      if (remaining <= segLen) {
        baseSegEnd = i;
        baseFrac = 1 - remaining / segLen;
        walkedOff = false;
        break;
      }
      remaining -= segLen;
    }

    if (walkedOff) {
      // Strand shorter than the arrow length — collapse body to a single point
      // at the start and render as a pure arrowhead from start to tip.
      bodyLast = -1;
      baseSx = screen[0].sx;
      baseSy = screen[0].sy;
      basePx = -ty[0];
      basePy = tx[0];
    } else {
      bodyLast = baseSegEnd - 1;
      baseSx =
        screen[baseSegEnd - 1].sx + baseFrac * (screen[baseSegEnd].sx - screen[baseSegEnd - 1].sx);
      baseSy =
        screen[baseSegEnd - 1].sy + baseFrac * (screen[baseSegEnd].sy - screen[baseSegEnd - 1].sy);
      let btx = (1 - baseFrac) * tx[baseSegEnd - 1] + baseFrac * tx[baseSegEnd];
      let bty = (1 - baseFrac) * ty[baseSegEnd - 1] + baseFrac * ty[baseSegEnd];
      const btLen = Math.sqrt(btx * btx + bty * bty);
      if (btLen > 1e-9) {
        btx /= btLen;
        bty /= btLen;
      }
      basePx = -bty;
      basePy = btx;
    }
  }

  // Walk the left edge forward, traverse the end cap (arrowhead or butt), then
  // the right edge backward. When `!withArrow`, the natural transition between
  // the last left-edge vertex and the first right-edge vertex at `lastIdx`
  // forms the perpendicular butt end.
  const vertsS: [number, number][] = [];
  for (let i = 0; i <= bodyLast; i++) {
    vertsS.push([screen[i].sx + halfW * -ty[i], screen[i].sy + halfW * tx[i]]);
  }

  if (withArrow) {
    vertsS.push([baseSx + halfW * basePx, baseSy + halfW * basePy]);
    vertsS.push([baseSx + arrowHalfW * basePx, baseSy + arrowHalfW * basePy]);
    vertsS.push([screen[lastIdx].sx, screen[lastIdx].sy]);
    vertsS.push([baseSx - arrowHalfW * basePx, baseSy - arrowHalfW * basePy]);
    vertsS.push([baseSx - halfW * basePx, baseSy - halfW * basePy]);
  }

  for (let i = bodyLast; i >= 0; i--) {
    vertsS.push([screen[i].sx - halfW * -ty[i], screen[i].sy - halfW * tx[i]]);
  }

  const points = vertsS
    .map(([sx, sy]) => `${(sx / PLOT.arcPxPerA).toFixed(3)},${(-sy / PLOT.zPxPerA).toFixed(3)}`)
    .join(' ');

  const poly = document.createElementNS(SVG_NS, 'polygon');
  poly.setAttribute('points', points);
  poly.setAttribute('fill', SS_STYLE[type].fill);
  poly.setAttribute('stroke', SS_STYLE[type].stroke);
  poly.setAttribute('stroke-width', '1.5');
  poly.setAttribute('stroke-linejoin', 'round');
  poly.setAttribute('vector-effect', 'non-scaling-stroke');
  plot.appendChild(poly);
}

/** A loop control point in plot (arc, z) Ångström coordinates, tagged for debug colouring. */
interface LoopControlPoint {
  arc: number;
  z: number;
  kind: 'endpoint' | 'tangent' | 'extreme';
}

const LOOP_DEBUG_FILL: Record<LoopControlPoint['kind'], string> = {
  endpoint: '#1f77b4',
  tangent: '#2ca02c',
  extreme: '#d62728',
};

/** Unit (arc, z) tangent between two display samples; falls back to +arc. */
function unitTangent(samples: UnrolledPoint[], from: number, to: number): { a: number; z: number } {
  const da = samples[to].arc - samples[from].arc;
  const dz = samples[to].z - samples[from].z;
  const len = Math.sqrt(da * da + dz * dz);
  if (len < 1e-9) return { a: 1, z: 0 };
  return { a: da / len, z: dz / len };
}

/**
 * Render a loop (coil) as a smooth Catmull-Rom spline through an explicit
 * control-point sequence:
 *   1. previous element end (centre of path)            — if a previous element exists
 *   2. point 1 + previous element end-tangent × tangentMag
 *   3-5. three points at the loop's vertical extreme    — only if the loop reaches
 *        more than `extremeThreshold` of the tangent-points' z-range beyond it
 *   6. next element start − next element start-tangent × tangentMag
 *   7. next element start (centre of path)              — if a next element exists
 *
 * Loops with sequence gaps (missing residue numbers) are dashed.  When
 * `showPoints` is set, each control point is marked with a small circle for
 * debugging.  Distances quoted in pixels assume a 1:1 arc/z aspect ratio.
 */
function drawLoop(
  plot: SVGGElement,
  markers: SVGGElement,
  samples: UnrolledPoint[],
  loopRun: SsRun,
  prevRun: SsRun | null,
  nextRun: SsRun | null,
  loopResidues: { resSeq: number }[],
  showPoints: boolean,
): void {
  const magA = LOOP.tangentMagPx / PLOT.arcPxPerA;
  const gapA = LOOP.elementGapPx / PLOT.arcPxPerA;
  const extremeSpacingA = LOOP.extremeSpacingPx / PLOT.arcPxPerA;

  const points: LoopControlPoint[] = [];

  // Points 1 & 2: previous element end and its outward tangent.
  let prevEnd: { arc: number; z: number } | null = null;
  if (prevRun) {
    const i = prevRun.endResSampleIdx;
    prevEnd = { arc: samples[i].arc, z: samples[i].z };
    const t = unitTangent(samples, Math.max(0, i - 1), i);
    points.push({ ...prevEnd, kind: 'endpoint' });
    points.push({ arc: prevEnd.arc + magA * t.a, z: prevEnd.z + magA * t.z, kind: 'tangent' });
  }

  // Points 6 & 7: next element start and its inward tangent (added after extremes).
  let nextStart: { arc: number; z: number } | null = null;
  let nextTangent: LoopControlPoint | null = null;
  if (nextRun) {
    const i = nextRun.startSample;
    nextStart = { arc: samples[i].arc, z: samples[i].z };
    const t = unitTangent(samples, i, Math.min(samples.length - 1, i + 1));
    nextTangent = { arc: nextStart.arc - magA * t.a, z: nextStart.z - magA * t.z, kind: 'tangent' };
  }

  // Vertical extreme of the loop's real path (z is unaffected by the layout shift).
  let loopMaxZ = -Infinity;
  let loopMinZ = Infinity;
  for (let i = loopRun.startSample; i <= loopRun.endSample; i++) {
    if (samples[i].z > loopMaxZ) loopMaxZ = samples[i].z;
    if (samples[i].z < loopMinZ) loopMinZ = samples[i].z;
  }

  // z-range spanned by the tangent control points placed so far (points 1, 2, 6, 7).
  const tangentZs = [...points.map((p) => p.z)];
  if (nextStart) tangentZs.push(nextStart.z);
  if (nextTangent) tangentZs.push(nextTangent.z);
  const rangeMin = Math.min(...tangentZs);
  const rangeMax = Math.max(...tangentZs);
  const span = rangeMax - rangeMin;
  const margin = LOOP.extremeThreshold * span;

  // Decide whether the loop escapes the tangent-points' z-range, and on which side.
  let extremeZ: number | null = null;
  const aboveBy = loopMaxZ - rangeMax;
  const belowBy = rangeMin - loopMinZ;
  if (aboveBy > margin && aboveBy >= belowBy) extremeZ = loopMaxZ;
  else if (belowBy > margin) extremeZ = loopMinZ;

  if (extremeZ !== null) {
    // Centre the extreme triple horizontally between the two elements.
    const centreArc = prevEnd ? prevEnd.arc + gapA / 2 : nextStart ? nextStart.arc - gapA / 2 : 0;
    points.push({ arc: centreArc - extremeSpacingA, z: extremeZ, kind: 'extreme' });
    points.push({ arc: centreArc, z: extremeZ, kind: 'extreme' });
    points.push({ arc: centreArc + extremeSpacingA, z: extremeZ, kind: 'extreme' });
  }

  if (nextTangent) points.push(nextTangent);
  if (nextStart) points.push({ ...nextStart, kind: 'endpoint' });

  if (points.length < 2) return;

  // Detect sequence gaps within the loop (missing residues).
  let discontinuous = false;
  for (let i = 1; i < loopResidues.length; i++) {
    if (loopResidues[i].resSeq - loopResidues[i - 1].resSeq > 1) {
      discontinuous = true;
      break;
    }
  }

  // Smooth the control polygon with a centripetal Catmull-Rom spline.
  const curveInput: Vec[] = points.map((p) => ({ x: p.arc, y: p.z, z: 0 }));
  const curve = sampleCurve(curveInput, LOOP.curveSamples).samples;
  const d =
    `M${curve[0].x.toFixed(2)},${curve[0].y.toFixed(2)} ` +
    curve
      .slice(1)
      .map((s) => `L${s.x.toFixed(2)},${s.y.toFixed(2)}`)
      .join(' ');

  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', COLOURS.coil);
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  if (discontinuous) path.setAttribute('stroke-dasharray', '3 5');
  plot.appendChild(path);

  if (showPoints) {
    for (const p of points) {
      const dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('class', 'loop-debug-point');
      dot.setAttribute('cx', (p.arc * PLOT.arcPxPerA).toFixed(2));
      dot.setAttribute('cy', (-p.z * PLOT.zPxPerA).toFixed(2));
      dot.setAttribute('r', '2.5');
      dot.setAttribute('fill', LOOP_DEBUG_FILL[p.kind]);
      dot.setAttribute('stroke', '#fff');
      dot.setAttribute('stroke-width', '0.5');
      markers.appendChild(dot);
    }
  }
}

/** A chain segment with its samples repositioned into display (fixed-gap) space. */
interface SegmentLayout {
  /** Samples with arc shifted into display space; z is unchanged. */
  samples: UnrolledPoint[];
  /** One entry per input Cα (unchanged from the unroll). */
  residues: UnrolledSegment['residues'];
  runs: SsRun[];
}

/**
 * Reposition SS elements so the horizontal gap between consecutive elements is
 * a fixed `LOOP.elementGapPx`, regardless of each loop's real arc length. Each
 * SS element keeps its own internal arc geometry; only the offset between
 * elements changes. Loops (and chain breaks) collapse to the fixed gap width.
 */
function layoutSegments(
  segments: UnrolledSegment[],
  ssSegments: SecondaryStructureSegment[],
): { layouts: SegmentLayout[]; totalArc: number } {
  const gapA = LOOP.elementGapPx / PLOT.arcPxPerA;
  const layouts: SegmentLayout[] = [];
  let cursor = 0;
  let maxArc = 0;

  for (const segment of segments) {
    const runs = runsBySs(segment.residues, ssSegments);
    const n = segment.samples.length;

    if (runs.length === 0) {
      const base = segment.samples[0]?.arc ?? 0;
      const sh = cursor - base;
      const display = segment.samples.map((p) => ({ arc: p.arc + sh, z: p.z }));
      const end = cursor + ((segment.samples[n - 1]?.arc ?? base) - base);
      layouts.push({ samples: display, residues: segment.residues, runs });
      if (end > maxArc) maxArc = end;
      cursor = end + gapA;
      continue;
    }

    const shift = new Array<number>(n).fill(NaN);
    let firstShift = 0;
    for (let r = 0; r < runs.length; r++) {
      const run = runs[r];
      const sh = cursor - segment.samples[run.startSample].arc;
      if (r === 0) firstShift = sh;
      const ownEnd = r < runs.length - 1 ? runs[r + 1].startSample : n;
      for (let i = run.startSample; i < ownEnd; i++) shift[i] = sh;
      if (run.type === 'helix' || run.type === 'strand') {
        cursor += segment.samples[run.endResSampleIdx].arc - segment.samples[run.startSample].arc;
      } else {
        cursor += gapA;
      }
    }
    // Forward-fill any samples outside a run's owned range (leading/interior gaps).
    let last = firstShift;
    for (let i = 0; i < n; i++) {
      if (!Number.isNaN(shift[i])) last = shift[i];
      else shift[i] = last;
    }

    const displaySamples = segment.samples.map((p, i) => ({ arc: p.arc + shift[i], z: p.z }));
    layouts.push({ samples: displaySamples, residues: segment.residues, runs });
    if (cursor > maxArc) maxArc = cursor;
    cursor += gapA;
  }

  return { layouts, totalArc: maxArc };
}

function renderChainSvg(chain: ChainData, showPoints: boolean): SVGSVGElement {
  const unroll = unrollChain(chain.calphas, { ssSegments: chain.segments });
  const { layouts, totalArc } = layoutSegments(unroll.segments, chain.segments);

  const zRange = Math.max(PLOT.zRangeMin, Math.abs(unroll.zMin), Math.abs(unroll.zMax));
  const plotWidth = Math.max(200, totalArc * PLOT.arcPxPerA);
  const plotHeight = zRange * 2 * PLOT.zPxPerA;
  const svgWidth = PLOT.margin.left + plotWidth + PLOT.margin.right;
  const svgHeight = PLOT.margin.top + plotHeight + PLOT.margin.bottom;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  // Intrinsic pixel size matches the viewBox so 1 user unit = 1 device px by
  // default. The host container can override with CSS, but most embeddings —
  // gallery screenshots, PR comment images — should see the natural width so
  // long chains (β-barrels) don't get compressed to fit a parent.
  svg.setAttribute('width', `${svgWidth}`);
  svg.setAttribute('height', `${svgHeight}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Chain ${chain.chainId} membrane unrolling`);

  // Inner plot group with a transform that flips z so positive z is up and
  // applies the user-space scale. Inside this group, coordinates are (arc, z)
  // in Ångström, with the origin at (0, 0) — bilayer midplane.
  const plot = document.createElementNS(SVG_NS, 'g');
  const cx = PLOT.margin.left;
  const cy = PLOT.margin.top + plotHeight / 2;
  plot.setAttribute(
    'transform',
    `translate(${cx}, ${cy}) scale(${PLOT.arcPxPerA}, ${-PLOT.zPxPerA})`,
  );
  svg.appendChild(plot);

  // Membrane slab. Drawn first so the trace appears on top; kept faint and
  // semi-transparent so the in-membrane portion of the trace remains clearly
  // visible (β-strand sections in particular spend most of their length here).
  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('x', '0');
  slab.setAttribute('y', `${-PLOT.membraneHalf}`);
  slab.setAttribute('width', `${totalArc.toFixed(2)}`);
  slab.setAttribute('height', `${PLOT.membraneHalf * 2}`);
  slab.setAttribute('fill', COLOURS.membraneFill);
  slab.setAttribute('fill-opacity', '0.55');
  slab.setAttribute('stroke', COLOURS.membraneEdge);
  // Stroke gets multiplied by the (non-uniform) scale, so use vector-effect to
  // keep it 1px regardless of zoom.
  slab.setAttribute('vector-effect', 'non-scaling-stroke');
  plot.appendChild(slab);

  // Zero (z = 0) reference line — membrane midplane.
  const mid = document.createElementNS(SVG_NS, 'line');
  mid.setAttribute('x1', '0');
  mid.setAttribute('x2', `${totalArc.toFixed(2)}`);
  mid.setAttribute('y1', '0');
  mid.setAttribute('y2', '0');
  mid.setAttribute('stroke', COLOURS.zAxis);
  mid.setAttribute('stroke-dasharray', '4 4');
  mid.setAttribute('vector-effect', 'non-scaling-stroke');
  plot.appendChild(mid);

  const barrel = isBetaBarrel(chain);

  // Labels group: same origin as `plot` but no scale, so text isn't
  // y-flipped or stretched by the plot transform. Appended after the plot
  // group below so labels render on top of polygons.
  const labelsGroup = document.createElementNS(SVG_NS, 'g');
  labelsGroup.setAttribute('transform', `translate(${cx}, ${cy})`);
  labelsGroup.setAttribute('font-family', 'sans-serif');
  const placedBoxes: LabelBox[] = [];

  // Debug markers for loop control points. Non-scaled (translate only) so the
  // dots stay circular; drawn last so they sit on top.
  const markersGroup = document.createElementNS(SVG_NS, 'g');
  markersGroup.setAttribute('transform', `translate(${cx}, ${cy})`);

  // For each contiguous chain segment, draw the smoothed (arc, z) trace,
  // segmented by secondary structure type for colouring.
  for (let s = 0; s < layouts.length; s++) {
    const layout = layouts[s];
    drawSegment(plot, labelsGroup, markersGroup, layout, barrel, placedBoxes, showPoints);
    // Dashed connector across chain breaks.
    if (s > 0) {
      const prev = layouts[s - 1].samples;
      const a = prev[prev.length - 1];
      const b = layout.samples[0];
      const connector = document.createElementNS(SVG_NS, 'line');
      connector.setAttribute('x1', `${a.arc}`);
      connector.setAttribute('y1', `${a.z}`);
      connector.setAttribute('x2', `${b.arc}`);
      connector.setAttribute('y2', `${b.z}`);
      connector.setAttribute('stroke', COLOURS.break);
      connector.setAttribute('stroke-dasharray', '2 3');
      connector.setAttribute('vector-effect', 'non-scaling-stroke');
      plot.appendChild(connector);
    }
  }

  svg.appendChild(labelsGroup);
  svg.appendChild(markersGroup);

  // Expand viewBox to fit all placed labels if they extend beyond the current bounds.
  let minX = 0,
    maxX = svgWidth,
    minY = 0,
    maxY = svgHeight;
  for (const box of placedBoxes) {
    const left = box.cx - box.w / 2;
    const right = box.cx + box.w / 2;
    const top = box.cy - box.h / 2;
    const bottom = box.cy + box.h / 2;
    if (left < minX) minX = left;
    if (right > maxX) maxX = right;
    if (top < minY) minY = top;
    if (bottom > maxY) maxY = bottom;
  }

  const finalWidth = maxX - minX;
  const finalHeight = maxY - minY;
  if (finalWidth > svgWidth || finalHeight > svgHeight) {
    svg.setAttribute('viewBox', `${minX} ${minY} ${finalWidth} ${finalHeight}`);
    svg.setAttribute('width', `${finalWidth}`);
    svg.setAttribute('height', `${finalHeight}`);
  }

  return svg;
}

function isSs(run: SsRun | undefined): run is SsRun {
  return !!run && (run.type === 'helix' || run.type === 'strand');
}

function drawSegment(
  plot: SVGGElement,
  labelsGroup: SVGGElement,
  markersGroup: SVGGElement,
  layout: SegmentLayout,
  isBarrel: boolean,
  placedBoxes: LabelBox[],
  showPoints: boolean,
): void {
  const { samples, residues, runs } = layout;
  for (let j = 0; j < runs.length; j++) {
    const run = runs[j];
    if (run.type === 'helix' || run.type === 'strand') {
      const withArrow = isBarrel && run.type === 'strand';
      drawSsPolygon(plot, samples, run.startSample, run.endResSampleIdx, run.type, withArrow);
      placeResidueLabel(labelsGroup, samples, run.startSample, run.startResSeq, true, placedBoxes);
      if (run.endResSeq !== run.startResSeq) {
        placeResidueLabel(
          labelsGroup,
          samples,
          run.endResSampleIdx,
          run.endResSeq,
          false,
          placedBoxes,
        );
      }
      continue;
    }
    const prevRun = isSs(runs[j - 1]) ? runs[j - 1] : null;
    const nextRun = isSs(runs[j + 1]) ? runs[j + 1] : null;
    const loopResidues = residues.slice(run.residueStart, run.residueEnd + 1);
    drawLoop(plot, markersGroup, samples, run, prevRun, nextRun, loopResidues, showPoints);
  }
}

const VIOLIN = {
  width: 64,
  height: 180,
  margin: { top: 6, right: 6, bottom: 6, left: 6 },
  /** Minimum z half-range shown (Å); auto-expands to fit data. */
  zRangeMin: 30,
  /**
   * Number of z-bins for the density estimate. Higher = smoother curve at
   * the cost of more vertices in the SVG.
   */
  bins: 60,
  /** Gaussian smoothing kernel σ, in bins. */
  smoothingSigma: 1.8,
};

interface ChainSsBins {
  helix: number[];
  strand: number[];
  coil: number[];
  total: number[];
  maxBinTotal: number;
}

function smoothBins(values: number[], sigma: number): number[] {
  if (sigma <= 0 || values.length === 0) return values.slice();
  const half = Math.max(1, Math.ceil(sigma * 3));
  const kernel: number[] = [];
  for (let i = -half; i <= half; i++) {
    kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  }
  const ksum = kernel.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kernel.length; i++) kernel[i] /= ksum;

  const out = new Array<number>(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    let acc = 0;
    let weight = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j < 0 || j >= values.length) continue;
      const w = kernel[k + half];
      acc += values[j] * w;
      weight += w;
    }
    // Renormalise at edges so the boundary doesn't pull the density to zero.
    out[i] = weight > 0 ? acc / weight : 0;
  }
  return out;
}

function binChainBySs(chain: ChainData, bins: number, zMin: number, zMax: number): ChainSsBins {
  const helixRaw = new Array<number>(bins).fill(0);
  const strandRaw = new Array<number>(bins).fill(0);
  const coilRaw = new Array<number>(bins).fill(0);
  const range = zMax - zMin;
  if (range > 0) {
    for (const ca of chain.calphas) {
      if (ca.z < zMin || ca.z > zMax) continue;
      const t = (ca.z - zMin) / range;
      const b = Math.min(bins - 1, Math.max(0, Math.floor(t * bins)));
      const ss = ssTypeAt(chain.segments, ca.resSeq);
      if (ss === 'helix') helixRaw[b]++;
      else if (ss === 'strand') strandRaw[b]++;
      else coilRaw[b]++;
    }
  }

  const sigma = VIOLIN.smoothingSigma;
  const helix = smoothBins(helixRaw, sigma);
  const strand = smoothBins(strandRaw, sigma);
  const coil = smoothBins(coilRaw, sigma);
  const total = new Array<number>(bins);
  let maxBinTotal = 0;
  for (let i = 0; i < bins; i++) {
    total[i] = helix[i] + strand[i] + coil[i];
    if (total[i] > maxBinTotal) maxBinTotal = total[i];
  }
  return { helix, strand, coil, total, maxBinTotal };
}

/**
 * Build a smooth half-violin polygon path: outer envelope walks one side from
 * bottom to top through the density values, then closes along the centreline.
 *
 * `side` = -1 for the left half, +1 for the right half. `widths[i]` is the
 * unsigned width of the violin at bin i. `centreOffset` lets us push the
 * envelope outwards by another density (e.g. coil) so layers stack cleanly.
 */
function halfViolinPath(
  widths: number[],
  centreOffset: number[],
  side: -1 | 1,
  yForBin: (b: number) => number,
): string {
  const bins = widths.length;
  if (bins === 0) return '';
  const parts: string[] = [];
  parts.push(`M ${side * centreOffset[0]} ${yForBin(-0.5)}`);
  for (let b = 0; b < bins; b++) {
    parts.push(`L ${side * (centreOffset[b] + widths[b])} ${yForBin(b)}`);
  }
  parts.push(`L ${side * (centreOffset[bins - 1] + widths[bins - 1])} ${yForBin(bins - 0.5)}`);
  parts.push(`L ${side * centreOffset[bins - 1]} ${yForBin(bins - 0.5)}`);
  for (let b = bins - 1; b >= 0; b--) {
    parts.push(`L ${side * centreOffset[b]} ${yForBin(b)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function renderViolin(
  binned: ChainSsBins,
  maxBinTotal: number,
  zMin: number,
  zMax: number,
): SVGSVGElement {
  const { width: W, height: H, margin, bins } = VIOLIN;
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', `${W}`);
  svg.setAttribute('height', `${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-hidden', 'true');

  const yScale = plotH / (zMax - zMin);
  const xScale = maxBinTotal > 0 ? plotW / 2 / maxBinTotal : 0;
  const cx = margin.left + plotW / 2;
  const cy = margin.top + plotH / 2;

  const plot = document.createElementNS(SVG_NS, 'g');
  plot.setAttribute('transform', `translate(${cx}, ${cy})`);
  svg.appendChild(plot);

  // Membrane band — faint grey slab so membrane-spanning chains are obvious
  // vs. soluble ones.
  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('x', `${-plotW / 2}`);
  slab.setAttribute('y', `${-PLOT.membraneHalf * yScale}`);
  slab.setAttribute('width', `${plotW}`);
  slab.setAttribute('height', `${PLOT.membraneHalf * 2 * yScale}`);
  slab.setAttribute('fill', '#e8edf3');
  plot.appendChild(slab);

  // Midplane.
  const mid = document.createElementNS(SVG_NS, 'line');
  mid.setAttribute('x1', `${-plotW / 2}`);
  mid.setAttribute('x2', `${plotW / 2}`);
  mid.setAttribute('y1', '0');
  mid.setAttribute('y2', '0');
  mid.setAttribute('stroke', '#bdbdbd');
  mid.setAttribute('stroke-dasharray', '2 3');
  plot.appendChild(mid);

  // Density-bin centres in z, mapped to SVG y.
  const binCentreY = (b: number) => -(zMin + ((b + 0.5) * (zMax - zMin)) / bins) * yScale;

  // Each side of the violin is the stacked total density of helix + strand +
  // coil. Helix goes innermost (against the centreline), strand next, coil
  // outermost as a faint outline — so the dominant SS type drives the colour
  // and the outer envelope is always the *total* residue density.
  const helixW = binned.helix.map((v) => v * xScale);
  const strandW = binned.strand.map((v) => v * xScale);
  const coilW = binned.coil.map((v) => v * xScale);
  const zeroes = new Array<number>(bins).fill(0);
  const helixOffsets = zeroes;
  const strandOffsets = helixW;
  const coilOffsets = helixW.map((h, i) => h + strandW[i]);

  for (const side of [-1, 1] as const) {
    // Coil — drawn first as a faint outer envelope.
    const coilPath = document.createElementNS(SVG_NS, 'path');
    coilPath.setAttribute('d', halfViolinPath(coilW, coilOffsets, side, binCentreY));
    coilPath.setAttribute('fill', COLOURS.coil);
    coilPath.setAttribute('opacity', '0.35');
    plot.appendChild(coilPath);

    // Strand.
    const strandPath = document.createElementNS(SVG_NS, 'path');
    strandPath.setAttribute('d', halfViolinPath(strandW, strandOffsets, side, binCentreY));
    strandPath.setAttribute('fill', COLOURS.strand);
    plot.appendChild(strandPath);

    // Helix — innermost so the colour reads as "blue body" for helical bundles.
    const helixPath = document.createElementNS(SVG_NS, 'path');
    helixPath.setAttribute('d', halfViolinPath(helixW, helixOffsets, side, binCentreY));
    helixPath.setAttribute('fill', COLOURS.helix);
    plot.appendChild(helixPath);
  }

  // Subtle outline around the total density envelope to make small violins
  // (soluble chains) easier to see.
  const totalW = binned.total.map((v) => v * xScale);
  const outlinePath = document.createElementNS(SVG_NS, 'path');
  outlinePath.setAttribute(
    'd',
    halfViolinPath(totalW, zeroes, 1, binCentreY) +
      ' ' +
      halfViolinPath(totalW, zeroes, -1, binCentreY),
  );
  outlinePath.setAttribute('fill', 'none');
  outlinePath.setAttribute('stroke', '#5b6f8a');
  outlinePath.setAttribute('stroke-width', '0.8');
  outlinePath.setAttribute('stroke-linejoin', 'round');
  plot.appendChild(outlinePath);

  return svg;
}

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < vals.length; i++)
    while (n >= vals[i]) {
      out += syms[i];
      n -= vals[i];
    }
  return out;
}

interface ChainLabel {
  /** The protomer letter shown as the base, e.g. "A" */
  base: string;
  /** Roman numeral suffix when multiple chains share the same residue count, else null */
  suffix: string | null;
  /** Plain-text representation for aria labels etc., e.g. "A(II)" */
  text: string;
}

/**
 * When chains share the same residue count they are almost certainly identical
 * monomers. Rather than showing arbitrary letters (A, B, C for a trimer) we
 * label them A(I), A(II), A(III) — the base letter is that of the first chain
 * in the group, and the suffix is a Roman numeral copy index.
 */
function buildChainLabels(chains: ChainData[]): Map<string, ChainLabel> {
  const groups = new Map<number, ChainData[]>();
  for (const c of chains) {
    const g = groups.get(c.residueCount) ?? [];
    g.push(c);
    groups.set(c.residueCount, g);
  }
  const labels = new Map<string, ChainLabel>();
  for (const group of groups.values()) {
    for (let i = 0; i < group.length; i++) {
      const c = group[i];
      if (group.length > 1) {
        const roman = toRoman(i + 1);
        labels.set(c.chainId, {
          base: group[0].chainId,
          suffix: roman,
          text: `${group[0].chainId}(${roman})`,
        });
      } else {
        labels.set(c.chainId, { base: c.chainId, suffix: null, text: c.chainId });
      }
    }
  }
  return labels;
}

function chainLabelNode(lbl: ChainLabel): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = lbl.base;
  if (lbl.suffix) {
    const sub = document.createElement('sub');
    sub.textContent = lbl.suffix;
    span.appendChild(sub);
  }
  return span;
}

function renderChainPicker(
  chains: ChainData[],
  chainLabels: Map<string, ChainLabel>,
  selectedId: string,
  onSelect: (chainId: string) => void,
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'chain-picker';
  container.setAttribute('role', 'group');

  let zMin = Infinity;
  let zMax = -Infinity;
  for (const chain of chains) {
    for (const ca of chain.calphas) {
      if (ca.z < zMin) zMin = ca.z;
      if (ca.z > zMax) zMax = ca.z;
    }
  }
  if (!Number.isFinite(zMin)) {
    zMin = -VIOLIN.zRangeMin;
    zMax = VIOLIN.zRangeMin;
  }
  zMin = Math.min(zMin, -VIOLIN.zRangeMin);
  zMax = Math.max(zMax, VIOLIN.zRangeMin);

  const binData = chains.map((c) => binChainBySs(c, VIOLIN.bins, zMin, zMax));
  const maxBinTotal = Math.max(0, ...binData.map((b) => b.maxBinTotal));

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    const lbl = chainLabels.get(chain.chainId)!;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chain-violin' + (chain.chainId === selectedId ? ' selected' : '');
    button.setAttribute('aria-pressed', chain.chainId === selectedId ? 'true' : 'false');
    button.setAttribute('aria-label', `Select chain ${lbl.text} (${chain.residueCount} residues)`);
    button.appendChild(renderViolin(binData[i], maxBinTotal, zMin, zMax));

    const label = document.createElement('div');
    label.className = 'violin-label';
    const idNode = chainLabelNode(lbl);
    const residues = document.createElement('span');
    residues.className = 'residues';
    residues.textContent = `${chain.residueCount} aa`;
    label.append(idNode, residues);
    button.appendChild(label);

    button.addEventListener('click', () => onSelect(chain.chainId));
    container.appendChild(button);
  }

  return container;
}

let _instanceCounter = 0;

export class TopologyDisplay extends HTMLElement {
  static observedAttributes = ['protein-data', 'debug-loops'];

  private readonly _instanceId = ++_instanceCounter;
  private _data: ProteinData | null = null;
  private _selectedChainId: string | null = null;
  private _styleEl: HTMLStyleElement;
  private _contentEl: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = STYLES;
    this._contentEl = document.createElement('div');
    shadow.append(this._styleEl, this._contentEl);
  }

  get proteinData(): ProteinData | null {
    return this._data;
  }

  set proteinData(value: ProteinData | null) {
    this._data = value;
    this._selectedChainId = null;
    this.render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'debug-loops') {
      this.render();
      return;
    }
    if (name !== 'protein-data') return;
    if (value === null) {
      this._data = null;
    } else {
      try {
        this._data = JSON.parse(value) as ProteinData;
      } catch {
        this._data = null;
      }
    }
    this._selectedChainId = null;
    this.render();
  }

  /**
   * Whether loop control points are drawn for debugging. Shown by default;
   * set the `debug-loops` attribute to "off"/"false"/"hidden"/"0" to hide them.
   */
  private get showLoopPoints(): boolean {
    const v = this.getAttribute('debug-loops');
    return v === null || !['off', 'false', 'hidden', '0'].includes(v.toLowerCase());
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    this._contentEl.replaceChildren();

    if (!this._data) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Loading…';
      this._contentEl.appendChild(placeholder);
      return;
    }

    const region = document.createElement('div');
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Protein topology');

    const titleEl = document.createElement('div');
    titleEl.className = 'protein-id';
    titleEl.textContent = this._data.pdbId;
    region.appendChild(titleEl);

    // Don't mutate the caller's proteinData — build a normalised local view
    // so consumers can safely share or memoise the input. Drops chains whose
    // `calphas` field is missing or empty.
    const chainsWithCoords = this._data.chains.filter(
      (c) => Array.isArray(c.calphas) && c.calphas.length > 0,
    );

    if (chainsWithCoords.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No Cα coordinates available for this protein.';
      region.appendChild(placeholder);
      this._contentEl.appendChild(region);
      return;
    }

    // Pick a default chain: largest transmembrane chain, falling back to the
    // largest chain overall if nothing crosses the bilayer.
    const autoPick = selectTransmembraneChains(chainsWithCoords, { max: 1 });
    const defaultId = autoPick.selected[0]?.chainId ?? chainsWithCoords[0]?.chainId ?? null;
    const selectedId =
      (this._selectedChainId &&
        chainsWithCoords.find((c) => c.chainId === this._selectedChainId)?.chainId) ||
      defaultId;

    const displayLabels = buildChainLabels(chainsWithCoords);

    // Chain picker — only shown when there are multiple chains to choose between.
    // A single-chain protein has nothing to pick, and the violin would look like
    // a standalone protein figure rather than a UI control.
    if (chainsWithCoords.length > 1 && selectedId) {
      const labelId = `chain-picker-label-${this._instanceId}`;
      const pickerLabel = document.createElement('div');
      pickerLabel.className = 'chain-picker-label';
      pickerLabel.id = labelId;
      pickerLabel.textContent = 'Select chain';
      region.appendChild(pickerLabel);
      const picker = renderChainPicker(chainsWithCoords, displayLabels, selectedId, (chainId) => {
        this._selectedChainId = chainId;
        this.render();
      });
      picker.setAttribute('aria-labelledby', labelId);
      region.appendChild(picker);
    }

    const selectedChain =
      chainsWithCoords.find((c) => c.chainId === selectedId) ?? chainsWithCoords[0];

    if (!selectedChain) {
      this._contentEl.appendChild(region);
      return;
    }

    const selectedLabel = displayLabels.get(selectedChain.chainId) ?? {
      base: selectedChain.chainId,
      suffix: null,
      text: selectedChain.chainId,
    };

    // Note when the user is viewing a non-TM chain — useful for double-checking
    // why a chain doesn't look "right" in the unrolled view.
    if (
      !autoPick.fellBackToLargest &&
      autoPick.selected[0] &&
      selectedChain.chainId !== autoPick.selected[0].chainId
    ) {
      const note = document.createElement('div');
      note.className = 'chain-note';
      note.textContent = `Chain ${selectedLabel.text} does not appear to span the membrane.`;
      region.appendChild(note);
    } else if (autoPick.fellBackToLargest) {
      const note = document.createElement('div');
      note.className = 'chain-note';
      note.textContent = 'No chain in this protein crosses the bilayer.';
      region.appendChild(note);
    }

    const block = document.createElement('div');
    block.className = 'chain-block';

    const label = document.createElement('div');
    label.className = 'chain-label';
    const helices = selectedChain.segments.filter((s) => s.type === 'helix').length;
    const strands = selectedChain.segments.filter((s) => s.type === 'strand').length;
    label.append(
      'Chain ',
      chainLabelNode(selectedLabel),
      ` · ${selectedChain.residueCount} residues · ${helices} helices · ${strands} strands`,
    );
    block.appendChild(label);

    const scroll = document.createElement('div');
    scroll.className = 'svg-scroll';
    // renderChainSvg now sizes itself from the smoothed-curve arc length so
    // the membrane slab and the trace stay aligned (the slab used to be drawn
    // out to `unroll.totalArcLength` but the plot width was sized from the raw
    // chord sum, which is strictly shorter, so the slab over-extended).
    scroll.appendChild(renderChainSvg(selectedChain, this.showLoopPoints));
    block.appendChild(scroll);
    region.appendChild(block);

    this._contentEl.appendChild(region);
  }
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
