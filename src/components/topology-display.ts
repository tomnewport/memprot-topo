import type {
  ChainData,
  ProteinData,
  SecondaryStructureSegment,
  SecondaryStructureType,
} from '../types.js';
import {
  unrollChain,
  unwrapBarrel,
  catmullRomBezier,
  type UnrolledSegment,
  type UnrolledPoint,
  type UnrollResult,
  type Vec,
} from '../unroll/index.js';
import { selectTransmembraneChains } from '../orientation/index.js';
import { analyseBarrel, analyseAssemblyBarrel, type BarrelAnalysis } from '../contacts/index.js';

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
  contact: '#c98a3b',
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
   * tangent-points' z-range beyond that range, two extra control points are
   * placed at the extreme to pull the curve out to the real excursion.
   */
  extremeThreshold: 0.2,
  /** Horizontal spacing (screen px) between the two vertical-extreme points. */
  extremeSpacingPx: 5,
};

const BARREL = {
  /**
   * Target closest distance between two adjacent SS elements, expressed in
   * strand widths. Each element keeps its true tilt; the next element is slid in
   * until the shortest centreline-to-centreline distance to the previously
   * placed elements hits this target, so neighbours sit a fixed clearance apart
   * however they tilt. The same value is the minimum centre-to-centre spacing
   * used to keep elements ordered left to right.
   */
  minStrandWidths: 2,
  /**
   * Loop span (strand widths) from a barrel element's C-terminus to the next
   * non-barrel element's start at a transition — i.e. how long the connecting
   * loop is. Measured from where the loop actually leaves, then the element is
   * nudged further only if it would otherwise crowd something.
   */
  transitionGapWidths: 4,
  /**
   * Tangent-handle length (screen px) for barrel hairpin loops. Long enough that
   * the loop leaves each strand parallel to it (following the tilt) before
   * curving to the next, for a clean leaning hairpin rather than a vertical rise.
   */
  loopTangentPx: 14,
  /**
   * Residues of the focal protomer's chain to include each side of its stem in
   * an assembly barrel, so the backbone visibly continues off the strand tops
   * toward the extramembrane cap. Kept small so the cap stub stays near the
   * membrane and doesn't blow up the z-range.
   */
  capHintResidues: 5,
};

/**
 * Minimum residue count for a helix/strand to be drawn as a discrete SS
 * element. Shorter assignments (1-2 residues) are folded into the surrounding
 * loop so they don't fragment it into multiple stubs.
 */
const MIN_SS_RESIDUES = 3;

/** Drop sub-`MIN_SS_RESIDUES` helix/strand assignments so they read as coil. */
function effectiveSsSegments(segments: SecondaryStructureSegment[]): SecondaryStructureSegment[] {
  return segments.filter((s) => s.type === 'coil' || s.end - s.start + 1 >= MIN_SS_RESIDUES);
}

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
  faded = false,
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
  // Arrowhead apex. Defaults to the final sample, but for a normal body+arrow it
  // is slid onto the body axis (see below) so the head stays aligned with the
  // strand instead of chasing the noisy terminal Cα.
  let tipSx = screen[lastIdx].sx;
  let tipSy = screen[lastIdx].sy;

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
      // at the start and render as a pure arrowhead from start to tip. With no
      // body to align to, aim the head straight from the start at the real tip.
      bodyLast = -1;
      baseSx = screen[0].sx;
      baseSy = screen[0].sy;
      const ax = tipSx - baseSx;
      const ay = tipSy - baseSy;
      const aLen = Math.sqrt(ax * ax + ay * ay);
      if (aLen > 1e-9) {
        basePx = -ay / aLen;
        basePy = ax / aLen;
      }
    } else {
      bodyLast = baseSegEnd - 1;
      baseSx =
        screen[baseSegEnd - 1].sx + baseFrac * (screen[baseSegEnd].sx - screen[baseSegEnd - 1].sx);
      baseSy =
        screen[baseSegEnd - 1].sy + baseFrac * (screen[baseSegEnd].sy - screen[baseSegEnd - 1].sy);
      // Align the arrowhead with the smoothed body axis at the base rather than
      // aiming it at the final sample. The terminal Cα is projected with a
      // one-sided window during unrolling, so it often lands a little off the
      // strand axis; pointing the head at it swings the whole arrowhead away
      // from the body (a sharp, unnatural "turn" at the tip) and notches the
      // body↔head join. `tx/ty[bodyLast]` is an interior, two-sided tangent and
      // is stable. We keep the apex on that axis, at the strand's true axial
      // reach (the on-axis projection of the real tip), so the head reads as a
      // clean continuation of the strand.
      let dx = tx[bodyLast];
      let dy = ty[bodyLast];
      const dLen = Math.sqrt(dx * dx + dy * dy);
      if (dLen > 1e-9) {
        dx /= dLen;
        dy /= dLen;
        const axial = (screen[lastIdx].sx - baseSx) * dx + (screen[lastIdx].sy - baseSy) * dy;
        tipSx = baseSx + axial * dx;
        tipSy = baseSy + axial * dy;
        basePx = -dy;
        basePy = dx;
      }
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
    vertsS.push([tipSx, tipSy]);
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
  // Neighbouring-chain elements (assembly barrels) are desaturated so the focal
  // protomer reads as the subject.
  if (faded) poly.setAttribute('opacity', '0.32');
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

/** Runtime-tunable loop rendering options, sourced from component attributes. */
interface LoopRenderOptions {
  /** Draw debug circles at each control point. */
  showPoints: boolean;
  /** Whether to add vertical-extreme control points when a loop overshoots. */
  extremePoints: boolean;
  /** Fraction of the tangent-points' z-range beyond which extreme points appear. */
  extremeThreshold: number;
  /**
   * Tangent-handle length (screen px) for the loop's end control points.
   * Longer handles make the loop leave parallel to the SS element it exits
   * (used for barrel hairpins). Defaults to {@link LOOP.tangentMagPx}.
   */
  tangentMagPx?: number;
}

/** One end of a loop: the samples array and the boundary sample index within it. */
interface LoopEnd {
  samples: UnrolledPoint[];
  index: number;
}

/** The path whose vertical extreme may pull extra control points out of range. */
interface LoopExtreme {
  samples: UnrolledPoint[];
  startSample: number;
  endSample: number;
}

/**
 * Build the explicit control-point sequence for a loop / connector curve:
 *   1. previous element end (centre of path)            — if a previous end exists
 *   2. point 1 + previous element end-tangent × tangentMag
 *   3-4. two points at the loop's vertical extreme      — only when `extremePoints`
 *        is set and the loop reaches more than `extremeThreshold` of the
 *        tangent-points' z-range beyond it
 *   5. next element start − next element start-tangent × tangentMag
 *   6. next element start (centre of path)              — if a next end exists
 *
 * `prev`/`next` may carry samples from different chain segments (used for the
 * dashed connector across chain breaks). Distances in pixels assume a 1:1
 * arc/z aspect ratio.
 */
function buildLoopPoints(
  prev: LoopEnd | null,
  next: LoopEnd | null,
  extreme: LoopExtreme | null,
  opts: LoopRenderOptions,
): LoopControlPoint[] {
  const magA = (opts.tangentMagPx ?? LOOP.tangentMagPx) / PLOT.arcPxPerA;
  const gapA = LOOP.elementGapPx / PLOT.arcPxPerA;
  const extremeSpacingA = LOOP.extremeSpacingPx / PLOT.arcPxPerA;

  const points: LoopControlPoint[] = [];

  // Points 1 & 2: previous element end and its outward tangent.
  let prevEnd: { arc: number; z: number } | null = null;
  if (prev) {
    const i = prev.index;
    prevEnd = { arc: prev.samples[i].arc, z: prev.samples[i].z };
    const t = unitTangent(prev.samples, Math.max(0, i - 1), i);
    points.push({ ...prevEnd, kind: 'endpoint' });
    points.push({ arc: prevEnd.arc + magA * t.a, z: prevEnd.z + magA * t.z, kind: 'tangent' });
  }

  // Points 5 & 6: next element start and its inward tangent (added after extremes).
  let nextStart: { arc: number; z: number } | null = null;
  let nextTangent: LoopControlPoint | null = null;
  if (next) {
    const i = next.index;
    nextStart = { arc: next.samples[i].arc, z: next.samples[i].z };
    const t = unitTangent(next.samples, i, Math.min(next.samples.length - 1, i + 1));
    nextTangent = { arc: nextStart.arc - magA * t.a, z: nextStart.z - magA * t.z, kind: 'tangent' };
  }

  if (opts.extremePoints && extreme) {
    // Vertical extreme of the loop's real path (z is unaffected by the layout shift).
    let loopMaxZ = -Infinity;
    let loopMinZ = Infinity;
    for (let i = extreme.startSample; i <= extreme.endSample; i++) {
      if (extreme.samples[i].z > loopMaxZ) loopMaxZ = extreme.samples[i].z;
      if (extreme.samples[i].z < loopMinZ) loopMinZ = extreme.samples[i].z;
    }

    // z-range spanned by the tangent control points placed so far.
    const tangentZs = [...points.map((p) => p.z)];
    if (nextStart) tangentZs.push(nextStart.z);
    if (nextTangent) tangentZs.push(nextTangent.z);
    const rangeMin = Math.min(...tangentZs);
    const rangeMax = Math.max(...tangentZs);
    const span = rangeMax - rangeMin;
    const margin = opts.extremeThreshold * span;

    // Decide whether the loop escapes the tangent-points' z-range, and on which side.
    let extremeZ: number | null = null;
    const aboveBy = loopMaxZ - rangeMax;
    const belowBy = rangeMin - loopMinZ;
    if (aboveBy > margin && aboveBy >= belowBy) extremeZ = loopMaxZ;
    else if (belowBy > margin) extremeZ = loopMinZ;

    if (extremeZ !== null) {
      // Two points at the extreme z give the interpolating curve a flat plateau
      // there; centre the pair horizontally between the two elements.
      const centreArc = prevEnd ? prevEnd.arc + gapA / 2 : nextStart ? nextStart.arc - gapA / 2 : 0;
      points.push({ arc: centreArc - extremeSpacingA / 2, z: extremeZ, kind: 'extreme' });
      points.push({ arc: centreArc + extremeSpacingA / 2, z: extremeZ, kind: 'extreme' });
    }
  }

  if (nextTangent) points.push(nextTangent);
  if (nextStart) points.push({ ...nextStart, kind: 'endpoint' });

  return points;
}

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
): void {
  if (points.length < 2) return;

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
  path.setAttribute('stroke', COLOURS.coil);
  path.setAttribute('stroke-width', '1.8');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  if (discontinuous) path.setAttribute('stroke-dasharray', '3 5');
  if (faded) path.setAttribute('opacity', '0.32');
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

/** Render a single in-segment loop (coil run) between two SS elements. */
function drawLoop(
  plot: SVGGElement,
  markers: SVGGElement,
  samples: UnrolledPoint[],
  loopRun: SsRun,
  prevRun: SsRun | null,
  nextRun: SsRun | null,
  loopResidues: { resSeq: number }[],
  opts: LoopRenderOptions,
  faded = false,
): void {
  const prev: LoopEnd | null = prevRun ? { samples, index: prevRun.endResSampleIdx } : null;
  const next: LoopEnd | null = nextRun ? { samples, index: nextRun.startSample } : null;
  const extreme: LoopExtreme = {
    samples,
    startSample: loopRun.startSample,
    endSample: loopRun.endSample,
  };
  const points = buildLoopPoints(prev, next, extreme, opts);

  // Detect sequence gaps within the loop (missing residues).
  let discontinuous = false;
  for (let i = 1; i < loopResidues.length; i++) {
    if (loopResidues[i].resSeq - loopResidues[i - 1].resSeq > 1) {
      discontinuous = true;
      break;
    }
  }

  renderLoopCurve(plot, markers, points, discontinuous, opts.showPoints, faded);
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

/**
 * Lay the cylindrical unwrap out so strands sit a fixed clearance apart without
 * altering any strand's shape or angle. At realistic barrel tilts (~40°) a
 * strand sweeps far more horizontally than the true inter-strand spacing, so
 * the honest unwrap draws tilted bars on top of one another.
 *
 * Each strand keeps its exact geometry — a rigid horizontal shift only — and is
 * placed left to right by the algorithm:
 *   1. take the next strand,
 *   2. find the shortest distance between its centreline and the previously
 *      placed strands' centrelines,
 *   3. slide it along until that shortest distance equals a fixed target
 *      (default two strand widths).
 * Barrel-wall strands are packed tight (the part that works well — left as is).
 * A helix — anything not part of the barrel — is packed too. At a transition to
 * or from it the gap is measured from the previous element's C-terminus, where
 * the loop actually leaves (not its rightmost point), so the connecting loop
 * stays short; the element is then nudged forward only as far as needed to keep
 * a clearance from everything already placed. So nothing crosses, no loop
 * doubles back, and the helix sits close to its strand. A helix also reads
 * forward (lowest residue on the left). Coils ride the loop ramp between
 * elements. Membrane depth (z) is never touched.
 */
function barrelLayout(
  segments: UnrolledSegment[],
  wallSegments: SecondaryStructureSegment[],
  continuous = false,
): { layouts: SegmentLayout[]; totalArc: number } {
  const strandWidthPx = SS_BODY.halfWidthPx * 2;
  const targetA = (BARREL.minStrandWidths * strandWidthPx) / PLOT.arcPxPerA;
  const transitionGapA = (BARREL.transitionGapWidths * strandWidthPx) / PLOT.arcPxPerA;
  // Minimum element-to-element clearance used to nudge a transition element
  // forward if anchoring it to the loop-exit point would crowd anything.
  const clearanceA = (BARREL.minStrandWidths * strandWidthPx) / PLOT.arcPxPerA;

  // Placement state. In `continuous` mode (multi-chain assembly barrels) it
  // persists across segments so each protomer packs tight against the previous
  // one around the shared ring; otherwise it resets per segment.
  const placed: { arc: number; z: number }[][] = [];
  let prevCentre = -Infinity; // laid-out centre of the previous element
  let prevExitArc = -Infinity; // laid arc of the previous element's C-terminus
  let prevHelix = false; // was the previous placed element a helix?

  const built = segments.map((segment) => {
    const runs = runsBySs(segment.residues, wallSegments);
    const n = segment.samples.length;
    const newArc = new Array<number>(n).fill(NaN);
    if (!continuous) {
      placed.length = 0;
      prevCentre = -Infinity;
      prevExitArc = -Infinity;
      prevHelix = false;
    }

    // Barrel-wall strands are packed tight (closest centreline distance); helices
    // — anything that isn't part of the barrel — are packed too, but a transition
    // to or from a helix advances generously so the loops on each side and the
    // helix itself render with plenty of space. Every element is placed entirely
    // to the right of all earlier ones at such a transition, so nothing crosses
    // and no loop doubles back. Coils ride the loop ramp.
    for (const run of runs) {
      if (run.type !== 'strand' && run.type !== 'helix') continue;
      const curHelix = run.type === 'helix';

      // This element's centreline points (one per residue), in raw unwrap arc.
      const pts: { arc: number; z: number }[] = [];
      for (let ri = run.residueStart; ri <= run.residueEnd; ri++) {
        const r = segment.residues[ri];
        pts.push({ arc: r.arc, z: r.z });
      }
      let rawMin = Infinity;
      let rawMax = -Infinity;
      for (const p of pts) {
        if (p.arc < rawMin) rawMin = p.arc;
        if (p.arc > rawMax) rawMax = p.arc;
      }
      const rawCentre = (rawMin + rawMax) / 2;
      const width = rawMax - rawMin;
      const m = pts.length - 1;
      // Per-residue offset from the element's left edge. A helix reads forward
      // (lowest residue on the left) as a straight bar; a strand keeps its
      // natural — possibly reversed — direction.
      const rel = pts.map((p, i) => (curHelix ? (m > 0 ? (i / m) * width : 0) : p.arc - rawMin));

      // `anchor` is the laid arc of the element's left edge (its minimum).
      let anchor = rawMin;
      if (placed.length > 0) {
        if (curHelix || prevHelix) {
          // Transition to/from a non-barrel element. Measure the gap from the
          // previous element's C-terminus (where the loop actually leaves), not
          // its rightmost point, so the loop stays short. Then nudge forward
          // only as far as needed to keep this element clear of everything.
          const fromExit = prevExitArc + transitionGapA - rel[0];
          let clear = -Infinity;
          for (const prev of placed) {
            for (let i = 0; i < pts.length; i++) {
              for (const q of prev) {
                const dz = pts[i].z - q.z;
                if (Math.abs(dz) >= clearanceA) continue;
                const need = Math.sqrt(clearanceA * clearanceA - dz * dz) + q.arc - rel[i];
                if (need > clear) clear = need;
              }
            }
          }
          anchor = Math.max(fromExit, Number.isFinite(clear) ? clear : -Infinity);
        } else {
          // Wall-to-wall: the existing tight barrel packing — unchanged.
          let smin = -Infinity;
          for (const prev of placed) {
            for (const p of pts) {
              for (const q of prev) {
                const dz = p.z - q.z;
                if (Math.abs(dz) >= targetA) continue;
                const need = Math.sqrt(targetA * targetA - dz * dz) + q.arc - p.arc;
                if (need > smin) smin = need;
              }
            }
          }
          const shift = Math.max(
            Number.isFinite(smin) ? smin : -Infinity,
            prevCentre + targetA - rawCentre, // ordering: never flung backwards
          );
          anchor = rawMin + shift;
        }
      }

      if (curHelix) {
        // Straight bar, residue order, across its own width (forward).
        const span = run.endResSampleIdx - run.startSample;
        for (let i = run.startSample; i <= run.endResSampleIdx; i++) {
          newArc[i] = anchor + (span > 0 ? (i - run.startSample) / span : 0) * width;
        }
      } else {
        // Rigid shift, preserving the strand's own geometry and direction.
        const shift = anchor - rawMin;
        for (let i = run.startSample; i <= run.endResSampleIdx; i++) {
          newArc[i] = segment.samples[i].arc + shift;
        }
      }

      placed.push(pts.map((p, i) => ({ arc: anchor + rel[i], z: p.z })));
      prevCentre = anchor + width / 2;
      prevExitArc = anchor + rel[m]; // C-terminal residue → where the next loop leaves
      prevHelix = curHelix;
    }

    const firstAssigned = newArc.findIndex((v) => !Number.isNaN(v));
    if (firstAssigned === -1) {
      // No strands in this segment — fall back to the raw unwrap positions.
      for (let i = 0; i < n; i++) newArc[i] = segment.samples[i].arc;
    } else {
      // Leading gap: hold the first strand's edge.
      for (let i = 0; i < firstAssigned; i++) newArc[i] = newArc[firstAssigned];
      // Interior gaps (loops): linear ramp between the bracketing strand edges.
      let lastAssigned = firstAssigned;
      for (let j = firstAssigned + 1; j < n; j++) {
        if (Number.isNaN(newArc[j])) continue;
        if (j > lastAssigned + 1) {
          const va = newArc[lastAssigned];
          const vb = newArc[j];
          for (let m = lastAssigned + 1; m < j; m++) {
            newArc[m] = va + ((vb - va) * (m - lastAssigned)) / (j - lastAssigned);
          }
        }
        lastAssigned = j;
      }
      // Trailing gap: hold the last strand's edge.
      for (let j = lastAssigned + 1; j < n; j++) newArc[j] = newArc[lastAssigned];
    }

    return { segment, runs, newArc };
  });

  // Shift everything so the leftmost point sits at arc 0, then report extent.
  let minArc = Infinity;
  let maxArc = -Infinity;
  for (const b of built)
    for (const v of b.newArc) {
      if (v < minArc) minArc = v;
      if (v > maxArc) maxArc = v;
    }
  const shift = Number.isFinite(minArc) ? -minArc : 0;

  const layouts = built.map(({ segment, runs, newArc }) => ({
    samples: segment.samples.map((p, i) => ({ arc: newArc[i] + shift, z: p.z })),
    residues: segment.residues.map((rr) => ({ ...rr, arc: newArc[rr.sampleIndex] + shift })),
    runs,
  }));
  const totalArc = Number.isFinite(maxArc) ? maxArc - minArc : 0;
  return { layouts, totalArc };
}

/**
 * Overlay the detected β-sheet residue contacts as faint ties between paired
 * strands. Only meaningful in the cylindrical-unwrap layout, where residue
 * (arc, z) positions reflect true 3-D adjacency, so a tie reads as "these two
 * residues hydrogen-bond across the sheet".
 */
function drawContacts(plot: SVGGElement, analysis: BarrelAnalysis, layouts: SegmentLayout[]): void {
  const pos = new Map<number, { arc: number; z: number }>();
  for (const layout of layouts) {
    for (const r of layout.residues) pos.set(r.resSeq, { arc: r.arc, z: r.z });
  }
  // Only tie pairings between barrel-wall (ring) strands. Strands that fold
  // inside the barrel render as coil at an unreliable arc near the axis, so a
  // tie to them would land at an arbitrary position and read oddly.
  const ring = new Set(analysis.ringOrder);
  const group = document.createElementNS(SVG_NS, 'g');
  group.setAttribute('class', 'contact-ties');
  for (const pairing of analysis.pairings) {
    if (!ring.has(pairing.a) || !ring.has(pairing.b)) continue;
    for (const c of pairing.contacts) {
      const a = pos.get(c.aResSeq);
      const b = pos.get(c.bResSeq);
      if (!a || !b) continue;
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', a.arc.toFixed(3));
      line.setAttribute('y1', a.z.toFixed(3));
      line.setAttribute('x2', b.arc.toFixed(3));
      line.setAttribute('y2', b.z.toFixed(3));
      line.setAttribute('stroke', COLOURS.contact);
      line.setAttribute('stroke-width', '1');
      line.setAttribute('stroke-opacity', '0.5');
      line.setAttribute('vector-effect', 'non-scaling-stroke');
      group.appendChild(line);
    }
  }
  plot.appendChild(group);
}

/**
 * Secondary-structure segments for barrel-unwrap rendering: the barrel-wall
 * strands (in ring order, merged ranges) plus any helices. β-strands that fold
 * inside the barrel are omitted, so they fall through to coil and render as
 * part of the connecting loop rather than as spurious bars near the axis.
 */
function barrelWallSegments(
  analysis: BarrelAnalysis,
  effective: SecondaryStructureSegment[],
): SecondaryStructureSegment[] {
  const wall = analysis.ringOrder.map((i) => analysis.strands[i].segment);
  const helices = effective.filter((s) => s.type === 'helix');
  return [...wall, ...helices].sort((a, b) => a.start - b.start);
}

/**
 * Unwrap a multi-chain assembly barrel: each protomer's β-hairpin is unwrapped
 * around the *shared* cylinder centre as its own segment, so barrelLayout
 * (continuous) packs all protomers tight around one ring. Returns the segments
 * in ring order, a per-segment focal flag, and the wall strand segments.
 */
function unwrapAssembly(
  chains: ChainData[],
  analysis: BarrelAnalysis,
  focalChainId: string,
): {
  segments: UnrolledSegment[];
  focal: boolean[];
  wallSegments: SecondaryStructureSegment[];
  zMin: number;
  zMax: number;
} {
  const chainById = new Map(chains.map((c) => [c.chainId, c]));
  // Protomer order = chains in order of first appearance around the ring.
  const order: string[] = [];
  for (const i of analysis.ringOrder) {
    const cid = analysis.strands[i].chainId;
    if (cid && !order.includes(cid)) order.push(cid);
  }
  const segments: UnrolledSegment[] = [];
  const focal: boolean[] = [];
  const wallSet = new Map<string, SecondaryStructureSegment>();
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const cid of order) {
    const chain = chainById.get(cid);
    if (!chain) continue;
    const strandSegs = analysis.ringOrder
      .map((i) => analysis.strands[i])
      .filter((s) => s.chainId === cid)
      .map((s) => s.segment);
    if (strandSegs.length === 0) continue;
    const lo = Math.min(...strandSegs.map((s) => s.start));
    const hi = Math.max(...strandSegs.map((s) => s.end));
    // For the focal protomer, include a few cap-proximal residues each side of
    // the stem so the chain visibly continues off the strand tops toward the
    // extramembrane cap — a hint that the barrel is part of a larger fold.
    const margin = cid === focalChainId ? BARREL.capHintResidues : 0;
    const stem = chain.calphas.filter((c) => c.resSeq >= lo - margin && c.resSeq <= hi + margin);
    const ssSegs = strandSegs.map((s) => ({ ...s }));
    for (const s of ssSegs) wallSet.set(`${s.start}-${s.end}`, s);
    const u = unwrapBarrel(stem, { ssSegments: ssSegs, centre: analysis.centre });
    for (const seg of u.segments) {
      segments.push(seg);
      focal.push(cid === focalChainId);
    }
    zMin = Math.min(zMin, u.zMin);
    zMax = Math.max(zMax, u.zMax);
  }
  if (!Number.isFinite(zMin)) {
    zMin = 0;
    zMax = 0;
  }
  return { segments, focal, wallSegments: [...wallSet.values()], zMin, zMax };
}

interface AssemblyContext {
  chains: ChainData[];
  analysis: BarrelAnalysis;
  focalChainId: string;
}

function renderChainSvg(
  chain: ChainData,
  opts: LoopRenderOptions,
  analysis: BarrelAnalysis,
  showContacts: boolean,
  assembly?: AssemblyContext,
): SVGSVGElement {
  // Assembly barrels (multi-chain, e.g. α-hemolysin's heptameric stem) unwrap
  // every protomer around a shared cylinder; a single closed cylindrical barrel
  // unwraps by angle; everything else uses the arc-length unroll.
  const asm = assembly
    ? unwrapAssembly(assembly.chains, assembly.analysis, assembly.focalChainId)
    : null;
  const useUnwrap = asm !== null || analysis.cylindrical;
  // In barrel mode only the wall strands are drawn as strands; any β-strands
  // that fold inside the barrel (e.g. OmpF's L3) sit near the axis where the
  // unwrap angle is meaningless, so they read as part of the connecting loop.
  const effective = effectiveSsSegments(chain.segments);
  const ssSegments = asm
    ? asm.wallSegments
    : analysis.cylindrical
      ? barrelWallSegments(analysis, effective)
      : effective;
  const unroll: UnrollResult = asm
    ? { segments: asm.segments, totalArcLength: 0, zMin: asm.zMin, zMax: asm.zMax }
    : analysis.cylindrical
      ? unwrapBarrel(chain.calphas, { ssSegments, centre: analysis.centre })
      : unrollChain(chain.calphas, { ssSegments });
  const { layouts, totalArc } = asm
    ? barrelLayout(unroll.segments, ssSegments, true)
    : analysis.cylindrical
      ? barrelLayout(unroll.segments, ssSegments)
      : layoutSegments(unroll.segments, ssSegments);
  // Per-segment focal flag (assembly only): neighbour protomers render faded.
  const focalFlags = asm ? asm.focal : null;

  // In barrel mode, hairpin loops leave each strand parallel to it (long tangent
  // handles following the strand tilt) and skip the centred vertical-extreme
  // points, so they lean over cleanly instead of rising straight up.
  const loopOpts: LoopRenderOptions = useUnwrap
    ? { ...opts, extremePoints: false, tangentMagPx: BARREL.loopTangentPx }
    : opts;

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
  svg.setAttribute(
    'aria-label',
    assembly
      ? `Chain ${chain.chainId} highlighted in a ${assembly.analysis.strandCount}-strand assembly β-barrel`
      : `Chain ${chain.chainId} membrane unrolling`,
  );

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

  const barrel = asm !== null || isBetaBarrel(chain);

  // β-sheet contact ties, drawn first so the strand polygons sit on top of them.
  // (Assembly barrels pool several chains that may share residue numbers, so the
  // single-chain contact map doesn't apply.)
  if (showContacts && useUnwrap && !asm) drawContacts(plot, analysis, layouts);

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
    // In an assembly barrel each segment is a separate protomer (separate
    // polypeptide), so there are no cross-segment loops and no leading/trailing
    // coil stubs to absorb — every segment stands alone.
    const hasBreakBefore = !asm && s > 0;
    const hasBreakAfter = !asm && s < layouts.length - 1;
    drawSegment(
      plot,
      labelsGroup,
      markersGroup,
      layout,
      barrel,
      placedBoxes,
      loopOpts,
      hasBreakBefore,
      hasBreakAfter,
      focalFlags ? !focalFlags[s] : false,
    );
    // Dashed connector across a chain break. Anchor at the nearest SS endpoint
    // on each side so that any trailing/leading coil in the adjacent segments is
    // absorbed into this single curve rather than appearing as a separate stub.
    // Assembly protomers are independent chains — no connector between them.
    if (!asm && s > 0) {
      const prevLayout = layouts[s - 1];
      const lastSs = lastSsRunOf(prevLayout);
      const firstSs = firstSsRunOf(layout);
      const prev: LoopEnd = lastSs
        ? { samples: prevLayout.samples, index: lastSs.endResSampleIdx }
        : { samples: prevLayout.samples, index: prevLayout.samples.length - 1 };
      const next: LoopEnd = firstSs
        ? { samples: layout.samples, index: firstSs.startSample }
        : { samples: layout.samples, index: 0 };
      const points = buildLoopPoints(prev, next, null, loopOpts);
      renderLoopCurve(plot, markersGroup, points, true, loopOpts.showPoints);
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

function lastSsRunOf(layout: SegmentLayout): SsRun | null {
  for (let i = layout.runs.length - 1; i >= 0; i--) {
    if (isSs(layout.runs[i])) return layout.runs[i];
  }
  return null;
}

function firstSsRunOf(layout: SegmentLayout): SsRun | null {
  for (const run of layout.runs) {
    if (isSs(run)) return run;
  }
  return null;
}

function drawSegment(
  plot: SVGGElement,
  labelsGroup: SVGGElement,
  markersGroup: SVGGElement,
  layout: SegmentLayout,
  isBarrel: boolean,
  placedBoxes: LabelBox[],
  opts: LoopRenderOptions,
  hasBreakBefore = false,
  hasBreakAfter = false,
  faded = false,
): void {
  const { samples, residues, runs } = layout;
  for (let j = 0; j < runs.length; j++) {
    const run = runs[j];
    if (run.type === 'helix' || run.type === 'strand') {
      const withArrow = isBarrel && run.type === 'strand';
      drawSsPolygon(
        plot,
        samples,
        run.startSample,
        run.endResSampleIdx,
        run.type,
        withArrow,
        faded,
      );
      // Faded neighbouring protomers are context only — don't clutter with labels.
      if (!faded) {
        placeResidueLabel(
          labelsGroup,
          samples,
          run.startSample,
          run.startResSeq,
          true,
          placedBoxes,
        );
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
      }
      continue;
    }
    const prevRun = isSs(runs[j - 1]) ? runs[j - 1] : null;
    const nextRun = isSs(runs[j + 1]) ? runs[j + 1] : null;
    // Skip a leading coil stub at the start of a segment that follows a chain
    // break — the cross-break connector will cover it from the previous SS end.
    if (prevRun === null && hasBreakBefore) continue;
    // Skip a trailing coil stub at the end of a segment followed by a chain
    // break — the cross-break connector will cover it to the next SS start.
    if (nextRun === null && hasBreakAfter) continue;
    const loopResidues = residues.slice(run.residueStart, run.residueEnd + 1);
    drawLoop(plot, markersGroup, samples, run, prevRun, nextRun, loopResidues, opts, faded);
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
  static observedAttributes = [
    'protein-data',
    'debug-loops',
    'loop-extreme-points',
    'loop-extreme-threshold',
    'show-contacts',
  ];

  private readonly _instanceId = ++_instanceCounter;
  private _data: ProteinData | null = null;
  private _selectedChainId: string | null = null;
  private _styleEl: HTMLStyleElement;
  private _contentEl: HTMLDivElement;
  // Cached multi-chain assembly-barrel analysis; depends only on proteinData, so
  // it survives cosmetic re-renders (chain pick, show-contacts, debug-loops).
  private _assemblyCache: { data: ProteinData; analysis: BarrelAnalysis } | null = null;

  /** Assembly-barrel analysis for the current proteinData, memoised. */
  private assemblyAnalysis(chains: ChainData[]): BarrelAnalysis {
    if (this._assemblyCache && this._assemblyCache.data === this._data) {
      return this._assemblyCache.analysis;
    }
    const analysis = analyseAssemblyBarrel(chains);
    if (this._data) this._assemblyCache = { data: this._data, analysis };
    return analysis;
  }

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
    if (
      name === 'debug-loops' ||
      name === 'loop-extreme-points' ||
      name === 'loop-extreme-threshold' ||
      name === 'show-contacts'
    ) {
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
   * Whether loop control points are drawn for debugging. Hidden by default;
   * set the `debug-loops` attribute to "on"/"true"/"show"/"1" to display them.
   */
  private get showLoopPoints(): boolean {
    const v = this.getAttribute('debug-loops');
    return v !== null && ['on', 'true', 'show', '1'].includes(v.toLowerCase());
  }

  /**
   * Whether β-sheet residue contacts are overlaid as ties between paired
   * strands. Off by default; set `show-contacts` to "on"/"true"/"show"/"1".
   */
  private get showContacts(): boolean {
    const v = this.getAttribute('show-contacts');
    return v !== null && ['on', 'true', 'show', '1'].includes(v.toLowerCase());
  }

  /** Assemble the loop rendering options from the component's attributes. */
  private get loopOptions(): LoopRenderOptions {
    const ext = this.getAttribute('loop-extreme-points');
    const extremePoints =
      ext === null || !['off', 'false', 'none', '0'].includes(ext.toLowerCase());
    const parsed = Number.parseFloat(this.getAttribute('loop-extreme-threshold') ?? '');
    const extremeThreshold = Number.isFinite(parsed) ? parsed : LOOP.extremeThreshold;
    return { showPoints: this.showLoopPoints, extremePoints, extremeThreshold };
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
    const effective = effectiveSsSegments(selectedChain.segments);
    const helices = effective.filter((s) => s.type === 'helix').length;
    // Analyse the β-sheet topology once: it drives both the summary label and
    // the parallel-strand unwrap inside renderChainSvg.
    const analysis = analyseBarrel(selectedChain.calphas, effective);
    // Count physical strands from the analysis (overlapping SHEET records are
    // merged there); raw segment counts over-report on real structures.
    const strands = analysis.strands.length;
    label.append(
      'Chain ',
      chainLabelNode(selectedLabel),
      ` · ${selectedChain.residueCount} residues · ${helices} helices · ${strands} strands`,
    );

    // If this chain isn't itself a barrel, it may be one protomer of a
    // multi-chain assembly barrel (e.g. α-hemolysin's heptameric stem).
    let assembly: AssemblyContext | undefined;
    if (!analysis.cylindrical && chainsWithCoords.length > 1) {
      const asmAnalysis = this.assemblyAnalysis(chainsWithCoords);
      const focalInRing = asmAnalysis.ringOrder.some(
        (i) => asmAnalysis.strands[i].chainId === selectedChain.chainId,
      );
      if (asmAnalysis.cylindrical && focalInRing) {
        assembly = {
          chains: chainsWithCoords,
          analysis: asmAnalysis,
          focalChainId: selectedChain.chainId,
        };
      }
    }

    if (analysis.cylindrical) {
      const shear = Number.isFinite(analysis.shear) ? `, shear ${Math.round(analysis.shear)}` : '';
      label.append(
        ` · β-barrel (${analysis.strandCount} strands${shear}, ${Math.round(analysis.tiltDeg)}° tilt)`,
      );
    } else if (assembly) {
      const nChains = new Set(
        assembly.analysis.ringOrder.map((i) => assembly!.analysis.strands[i].chainId),
      ).size;
      label.append(
        ` · β-barrel (${assembly.analysis.strandCount} strands across ${nChains} chains, ` +
          `${Math.round(assembly.analysis.tiltDeg)}° tilt)`,
      );
    }
    block.appendChild(label);

    const scroll = document.createElement('div');
    scroll.className = 'svg-scroll';
    // renderChainSvg now sizes itself from the smoothed-curve arc length so
    // the membrane slab and the trace stay aligned (the slab used to be drawn
    // out to `unroll.totalArcLength` but the plot width was sized from the raw
    // chord sum, which is strictly shorter, so the slab over-extended).
    scroll.appendChild(
      renderChainSvg(selectedChain, this.loopOptions, analysis, this.showContacts, assembly),
    );
    block.appendChild(scroll);
    region.appendChild(block);

    this._contentEl.appendChild(region);
  }
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
