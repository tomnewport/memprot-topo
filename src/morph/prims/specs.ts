import type { OpSpec } from '../engine.js';

export const SILHOUETTE: OpSpec = { layer: 2, key: 'sil-l', kind: 'stroke', linecap: 'round' };
export const SILHOUETTE_R: OpSpec = { layer: 2, key: 'sil-r', kind: 'stroke', linecap: 'round' };
export const TUBE_BODY: OpSpec = { layer: 1, key: 'tube-body', kind: 'fill' };
export const TUBE_SHINE: OpSpec = { layer: 2, key: 'tube-shine', kind: 'stroke', linecap: 'round' };
export const TUBE_EDGE_L: OpSpec = { layer: 3, key: 'tube-l', kind: 'stroke', linecap: 'round' };
export const TUBE_EDGE_R: OpSpec = { layer: 3, key: 'tube-r', kind: 'stroke', linecap: 'round' };
export const SIDE_L: OpSpec = { layer: 1, key: 'side-l', kind: 'fill' };
export const SIDE_R: OpSpec = { layer: 1, key: 'side-r', kind: 'fill' };
export const SIDE_START: OpSpec = { layer: 1, key: 'side-s', kind: 'fill' };
export const EDGE_TL: OpSpec = { layer: 2, key: 'e-tl', kind: 'stroke', linecap: 'round' };
export const EDGE_TR: OpSpec = { layer: 2, key: 'e-tr', kind: 'stroke', linecap: 'round' };
export const EDGE_BL: OpSpec = { layer: 2, key: 'e-bl', kind: 'stroke', linecap: 'round' };
export const EDGE_BR: OpSpec = { layer: 2, key: 'e-br', kind: 'stroke', linecap: 'round' };
export const EDGE_X: OpSpec = { layer: 2, key: 'e-x', kind: 'stroke', linecap: 'round' };
export const SEAM_TL: OpSpec = { layer: 1, key: 's-tl', kind: 'stroke', linecap: 'butt' };
export const SEAM_TR: OpSpec = { layer: 1, key: 's-tr', kind: 'stroke', linecap: 'butt' };
export const SEAM_BL: OpSpec = { layer: 1, key: 's-bl', kind: 'stroke', linecap: 'butt' };
export const SEAM_BR: OpSpec = { layer: 1, key: 's-br', kind: 'stroke', linecap: 'butt' };
export const SEAM_X: OpSpec = { layer: 1, key: 's-x', kind: 'stroke', linecap: 'butt' };

/** Samples either side used for a helix's on-screen axis direction in 3-D. */
export const AXIS_BASELINE = 8;
/** A cylinder gradient group spans at most this turn on screen (cos 2.5°). */
export const GROUP_COS = Math.cos((2.5 * Math.PI) / 180);
/** A strand face gradient spans at most this turn on screen (cos 10°). */
export const STRAND_GROUP_COS = Math.cos((10 * Math.PI) / 180);
