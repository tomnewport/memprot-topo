import type { SecondaryStructureType } from '../types.js';

/** One residue of the displayed chain, in chain order. */
export interface SeqResidue {
  resSeq: number;
  iCode: string;
  /** One-letter amino-acid code (`X` when unknown). */
  code: string;
  ss: SecondaryStructureType;
}

/**
 * A point on the 2-D drawn chain, in the 2-D SVG's user units, tagged with
 * where it falls along the sequence: `f` is a (fractional) index into the
 * residue list, so residue `i` sits at `f = i`.
 */
export interface TracePoint {
  x: number;
  y: number;
  f: number;
}

/** A helix or strand, as a range along the sequence (`f` units). */
export interface SeqElement {
  type: 'helix' | 'strand';
  from: number;
  to: number;
  /** Whether it ends in an arrowhead (barrel strands, as in 2-D). */
  withArrow: boolean;
}

/** A data series drawn as a lane under each row of the sequence. */
export type SeqLane =
  | {
      kind: 'colour';
      label: string;
      /** Colour of residue `i`, or undefined where it has no value. */
      colourAt: (i: number) => string | undefined;
    }
  | {
      kind: 'bar' | 'line';
      label: string;
      /** Value of residue `i`, or undefined where it has no value. */
      valueAt: (i: number) => number | undefined;
      /** Value range of the lane (the zero line is drawn when it is inside). */
      domain: [number, number];
      /** Bar / line colour (CSS); the theme's accent when absent. */
      colour?: string;
    };

/**
 * Everything the sequence view and the 1-D ↔ 2-D transition are built from:
 * the residues, where the 2-D picture drew each of them, and the data lanes.
 */
export interface SequenceSource {
  residues: SeqResidue[];
  /**
   * The 2-D drawn chain as a dense polyline with `f` non-decreasing. Residues
   * the 2-D picture leaves out (outside the drawn range) take its nearest end.
   */
  trace: TracePoint[];
  /** Ranges (`f`) that are drawn dashed: chain breaks and gaps. */
  dashed: [number, number][];
  elements: SeqElement[];
  /** Residue depth in the 2-D layout (Å, + up), or NaN where it wasn't drawn. */
  z: number[];
  membraneHalf: number;
  /** The 2-D SVG's viewBox and the (arc 0, z 0) origin in it. */
  frame2d: { minX: number; minY: number; width: number; height: number };
  origin2d: { x: number; y: number; pxPerA: number };
  /** The 2-D membrane slab, from x0 to x1 in display Å. */
  slab: { x0: number; x1: number };
  /** Per-residue colour of the chain itself (as in 2-D), if any. */
  colourAt: ((i: number) => string | undefined) | null;
  lanes: SeqLane[];
  /** Element body geometry in px (the 2-D view's). */
  halfWidthPx: number;
  arrowHalfWidthPx: number;
  arrowLengthPx: number;
}
