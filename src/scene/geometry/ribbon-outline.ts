/**
 * Pure ribbon/arrow outline geometry (issue #22, Phase 1).
 *
 * Extracted verbatim from the SVG renderer's `drawSsPolygon` so both the SVG and
 * 3-D renderers build identical secondary-structure polygons from a shared
 * function. Given an element's centreline samples in display `(arc, z)` Å, it
 * returns the closed polygon outline (a "spaghetti" body with an optional
 * arrowhead) as a list of `[arc, z]` vertices in Å.
 *
 * The half-widths are screen-pixel quantities, so the maths is done in screen
 * space (Å × px-per-Å) and converted back to Å on the way out — exactly as the
 * original inline code did.
 */
import type { UnrolledPoint } from '../../unroll/index.js';

export interface RibbonOutlineParams {
  /** Body half-width, screen px. */
  halfWidthPx: number;
  /** Arrowhead wing half-width, screen px. */
  arrowHalfWidthPx: number;
  /** Arrowhead length from base to tip, screen px. */
  arrowLengthPx: number;
  /** Å → px scale on the arc axis. */
  arcPxPerA: number;
  /** Å → px scale on the z axis. */
  zPxPerA: number;
}

/**
 * Build the ribbon outline for samples `[startIdx, endIdx]`. Returns `[arc, z]`
 * vertices in Å, or `[]` when the span is too short to draw.
 */
export function ribbonOutline(
  samples: Pick<UnrolledPoint, 'arc' | 'z'>[],
  startIdx: number,
  endIdx: number,
  withArrow: boolean,
  p: RibbonOutlineParams,
): [number, number][] {
  if (endIdx <= startIdx) return [];

  const screen: { sx: number; sy: number }[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    screen.push({ sx: samples[i].arc * p.arcPxPerA, sy: -samples[i].z * p.zPxPerA });
  }
  if (screen.length < 2) return [];

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

  const halfW = p.halfWidthPx;
  const arrowHalfW = p.arrowHalfWidthPx;
  const arrowLen = p.arrowLengthPx;
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
      // Derive the arrowhead perpendicular from the smoothed body-axis tangent at
      // bodyLast rather than from the interpolated local tangent at the base.
      // The terminal Cα is projected with a one-sided window during unrolling and
      // can land off-axis, which rotates the interpolated tangent and produces a
      // visible kink where the body meets the head.  tx/ty[bodyLast] is a
      // two-sided interior tangent and stays reliably axis-aligned. The tip vertex
      // is kept at screen[lastIdx] so loop connections are not displaced.
      const bLen = Math.sqrt(tx[bodyLast] * tx[bodyLast] + ty[bodyLast] * ty[bodyLast]);
      if (bLen > 1e-9) {
        basePx = -ty[bodyLast] / bLen;
        basePy = tx[bodyLast] / bLen;
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
    vertsS.push([screen[lastIdx].sx, screen[lastIdx].sy]);
    vertsS.push([baseSx - arrowHalfW * basePx, baseSy - arrowHalfW * basePy]);
    vertsS.push([baseSx - halfW * basePx, baseSy - halfW * basePy]);
  }

  for (let i = bodyLast; i >= 0; i--) {
    vertsS.push([screen[i].sx - halfW * -ty[i], screen[i].sy - halfW * tx[i]]);
  }

  // Back to Å. (Caller formats; keeping raw numbers preserves precision.)
  return vertsS.map(([sx, sy]) => [sx / p.arcPxPerA, -sy / p.zPxPerA]);
}
