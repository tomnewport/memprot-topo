import type { CylinderMapping, Vec } from '../unroll/index.js';

/**
 * Everything the 2-D renderer drew, recorded in draw order, plus the real 3-D
 * geometry behind it. The morph rebuilds the same picture from this at t = 0
 * and rolls it up into a 3-D Richardson diagram at t = 1.
 */
export interface MorphScene {
  /**
   * `polyline`: the 2-D view is the arc-length unroll of the chain's xy path.
   * `cylinder`: the 2-D view is a cylindrical unwrap about a β-barrel axis.
   */
  mode: 'polyline' | 'cylinder';
  segments: MorphSegment[];
  elements: MorphElement[];
  loops: MorphLoop[];
  labels: MorphLabel[];
  ties: MorphTie[];
  /** Membrane slab as drawn in 2-D, in display Å (x from x0 to x1, z ±half). */
  slab: { x0: number; x1: number; half: number };
  /** How display Å map to SVG user units in the 2-D picture. */
  frame: MorphFrame;
  /** Fixed display gap between consecutive elements (Å). */
  gapA: number;
  style: MorphStyle;
}

export interface MorphFrame {
  /** SVG user coordinates of display (arc 0, z 0). */
  originX: number;
  originY: number;
  /** 2-D SVG viewBox origin and size (user units = CSS px). */
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** Pixels per Å (equal on both axes). */
  pxPerA: number;
}

export interface MorphSegment {
  /** Laid-out samples, (arc, z) in Å, exactly as drawn in 2-D. */
  display: { arc: number; z: number }[];
  /** Real 3-D membrane-frame position of each sample. */
  positions: Vec[];
  /** Raw (pre-layout) unwrap arc of each sample — cylinder mode only. */
  unwrapArc?: number[];
  /** Arc → angle mapping of the unwrap this segment came from — cylinder mode only. */
  cylinder?: CylinderMapping;
}

export interface SampleRef {
  seg: number;
  sample: number;
}

export interface MorphElement {
  type: 'helix' | 'strand';
  seg: number;
  /** Inclusive sample range drawn as the element body. */
  start: number;
  end: number;
  /** Whether the 2-D view drew an arrowhead. */
  withArrow: boolean;
  faded: boolean;
  /** Position in the 2-D draw order. */
  order: number;
}

export interface MorphLoop {
  /** Control points of the 2-D loop curve (display Å). */
  points: { arc: number; z: number }[];
  discontinuous: boolean;
  faded: boolean;
  /** Element end the loop leaves from (null for a leading stub). */
  from: SampleRef | null;
  /** Element start the loop arrives at (null for a trailing stub). */
  to: SampleRef | null;
  /** Segment a stub belongs to (used when one end is null). */
  seg: number;
  order: number;
}

export interface MorphLabel {
  seg: number;
  sample: number;
  text: string;
  isStart: boolean;
}

export interface MorphTie {
  a: SampleRef & { z: number };
  b: SampleRef & { z: number };
}

export interface MorphStyle {
  helixFill: string;
  helixStroke: string;
  strandFill: string;
  strandStroke: string;
  coil: string;
  membraneFill: string;
  membraneEdge: string;
  midplane: string;
  contact: string;
  /** Diagram background: the 3-D view fogs towards it. */
  background: string;
  labelFill: string;
  labelFontFamily: string;
  labelFontSize: number;
  labelGap: number;
  labelTangentStep: number;
  /** 2-D body / arrow geometry in screen px. */
  halfWidthPx: number;
  arrowHalfWidthPx: number;
  arrowLengthPx: number;
  fadedOpacity: number;
}
