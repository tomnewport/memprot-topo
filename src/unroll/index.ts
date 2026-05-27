export { unrollChain } from './unroll.js';
export type {
  UnrollOptions,
  UnrollResult,
  UnrolledSegment,
  UnrolledResidue,
  UnrolledPoint,
} from './unroll.js';
export { evaluate, sampleCurve } from './catmull-rom.js';
export type { Vec, SampledCurve } from './catmull-rom.js';
export { fitBSpline, evaluateBSpline, sampleBSpline } from './bspline.js';
export type { FittedBSpline } from './bspline.js';
export { projectHelixAxis } from './helix-axis.js';
