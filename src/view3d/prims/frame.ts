/** Per-frame state shared by the element builders and the membrane layer. */

import { Camera } from '../camera.js';
import type { Pose } from '../curtain.js';
import type { Prim } from '../engine.js';
import { Veil } from '../membrane-layer.js';
import type { View3DModel } from '../model.js';

export interface FrameCtx {
  model: View3DModel;
  pose: Pose;
  cam: Camera;
  proj: Float64Array;
  scale: number;
  sigma: number;
  eW: number;
  eLoop: number;
  fogAt: (depth: number) => number;
  pxA: number;
  prims: Prim[];
  veil: Veil;
  /**
   * World displacement of element end samples whose drawn position differs
   * from the pose (straightened helices), so loops can stay attached.
   */
  endShift: Map<number, [number, number, number]>;
}

/** A context chain: shown, rolled up, in its real place around the morphing one. */
export interface ContextChain {
  model: View3DModel;
  /** Fixed pose in the finished view's frame (set by precompute). */
  pose: Pose | null;
}
