/**
 * The 3-D view's tunable options and their defaults, in a module of their own
 * so pages can read them without loading the renderer.
 */

import { DEFAULT_MEMBRANE_STYLE, type MembraneStyle } from './membrane-style.js';

/** Tunable 3-D appearance. Lengths in Å, angles in radians. */
export interface View3DOptions {
  /** Helix cylinder radius. */
  helixRadius: number;
  /** Full width of a strand ribbon. */
  strandWidth: number;
  /** Full width of a strand arrowhead at its base. */
  arrowWidth: number;
  /** Length of a strand arrowhead. */
  arrowLength: number;
  /** Ribbon thickness. */
  strandThickness: number;
  /** Loop tube radius. */
  coilRadius: number;
  /** Camera elevation of the finished 3-D view (positive = looking down). */
  elevation: number;
  /**
   * Diagonal field of view of the finished 3-D view; 0 keeps the projection
   * parallel (isometric) throughout, 63.4° is a 35 mm-equivalent perspective.
   */
  fov: number;
  /**
   * Width of the rolling wave as a fraction of the chain: 0 rolls the whole
   * chain up at once; > 0 rolls from the N-terminal end to the C-terminal end.
   */
  sweep: number;
  /**
   * Spacing (Å) of the membrane's grid lines; 0 picks it from the size of
   * the membrane disc ({@link fishnetSpacing}).
   */
  gridSpacing: number;
  /** How the leaflets are drawn: grid or polar lines, or a coloured surface. */
  membraneStyle: MembraneStyle;
}

export const DEFAULT_VIEW3D_OPTIONS: View3DOptions = {
  helixRadius: 2.3,
  strandWidth: 2.85,
  arrowWidth: 4.65,
  arrowLength: 5,
  strandThickness: 1.0,
  coilRadius: 0.42,
  // Isometric: parallel projection, looking down at atan(1/√2) ≈ 35.26°.
  elevation: Math.atan(1 / Math.SQRT2),
  fov: 0,
  sweep: 0.35,
  gridSpacing: 0,
  membraneStyle: DEFAULT_MEMBRANE_STYLE,
};
