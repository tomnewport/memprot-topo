import type { UnrolledPoint } from '../unroll/index.js';
import { LABEL, PLOT } from './constants.js';

/** A residue-number label's box, in screen px from the plot origin. */
export interface LabelBox {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/** Rough text width for sans-serif digits: ~0.6 em average per character. */
export function approxTextWidth(text: string, fontSizePx: number): number {
  return text.length * fontSizePx * 0.6;
}

/**
 * Where a residue-number label goes, just past the start or end of a
 * helix/strand polygon. The label sits along the outward direction of the
 * SS's local tangent so it reads as a continuation of the element. The
 * distance from the endpoint is chosen so the label's nearest edge clears the
 * polygon tip by `LABEL.gapPx` regardless of the tangent angle — keeping every
 * label snug to the feature it identifies. Null when the tangent is undefined
 * (the label is then not drawn).
 */
export function residueLabelBox(
  samples: UnrolledPoint[],
  sampleIdx: number,
  text: string,
  isStart: boolean,
): LabelBox | null {
  const sx = samples[sampleIdx].arc * PLOT.arcPxPerA;
  const sy = -samples[sampleIdx].z * PLOT.zPxPerA;

  // Tangent (a→b) of the SS at this endpoint, in screen pixels. For the start
  // endpoint we look forward into the body; for the end we look backward.
  const step = LABEL.tangentStepSamples;
  const a = isStart ? sampleIdx : Math.max(0, sampleIdx - step);
  const b = isStart ? Math.min(samples.length - 1, sampleIdx + step) : sampleIdx;
  if (a === b) return null;
  const tdx = (samples[b].arc - samples[a].arc) * PLOT.arcPxPerA;
  const tdy = -(samples[b].z - samples[a].z) * PLOT.zPxPerA;
  const tlen = Math.hypot(tdx, tdy);
  if (tlen < 1e-9) return null;

  // Outward = away from SS body. At the start endpoint that's −tangent, at
  // the end endpoint it's +tangent.
  const sign = isStart ? -1 : 1;
  const outX = (sign * tdx) / tlen;
  const outY = (sign * tdy) / tlen;

  const fontSize = LABEL.fontSizePx;
  const w = approxTextWidth(text, fontSize);
  const h = fontSize;

  // Distance from endpoint to label centre such that the label's inner edge
  // sits `gapPx` past the endpoint. The label box projects half-width along x
  // and half-height along y onto the outward unit vector.
  const projHalf = Math.abs(outX) * (w / 2) + Math.abs(outY) * (h / 2);
  const offset = projHalf + LABEL.gapPx;

  return { cx: sx + outX * offset, cy: sy + outY * offset, w, h };
}
