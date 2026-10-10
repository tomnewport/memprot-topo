import type { RGB } from '../colour.js';
import type { View3DModel } from '../model.js';
import type { View3DOptions } from '../options.js';

/** Colours the element builders shade from, parsed from the scene's style. */
export interface PrimColours {
  helix: RGB;
  helixEdge: string;
  strand: RGB;
  strandEdge: string;
  coil: RGB;
}

/** What the helix, strand and loop builders read from the renderer. */
export interface PrimEnv {
  readonly model: View3DModel;
  readonly options: View3DOptions;
  readonly colours: PrimColours;
  /** The background: fog and faded elements mix towards it. */
  readonly ground: RGB;
  /** Scratch buffer for projected points. */
  readonly tmp: Float64Array;
  /** Kink of each helix (sample index, −1 = straight); null until precomputed. */
  readonly kinks: Map<number, number> | null;
  /** Helices whose kink is sharp enough to draw as two cylinders. */
  readonly sharpKinks: ReadonlySet<number>;
  /** The renderer's one-off set-up, which finds the kinks. */
  precompute(): void;
}
