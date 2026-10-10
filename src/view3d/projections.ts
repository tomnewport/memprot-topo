/**
 * Projection presets for the finished 3-D view. Kept in their own tiny module
 * so the component can offer them without loading the 3-D code.
 */
export const PROJECTIONS = {
  /** Parallel projection, looking down at atan(1/√2) ≈ 35.26°. */
  isometric: { fov: 0, elevation: Math.atan(1 / Math.SQRT2) },
  /** 35 mm-equivalent perspective. */
  perspective: { fov: 2 * Math.atan(Math.hypot(36, 24) / 2 / 35), elevation: (16 * Math.PI) / 180 },
} as const;
