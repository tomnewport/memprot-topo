import { describe, it, expect } from 'vitest';
import {
  ribbonOutline,
  type RibbonOutlineParams,
} from '../../../src/scene/geometry/ribbon-outline.js';

const P: RibbonOutlineParams = {
  halfWidthPx: 4,
  arrowHalfWidthPx: 6,
  arrowLengthPx: 12,
  arcPxPerA: 2.5,
  zPxPerA: 2.5,
};

/** A straight horizontal element along arc at z = 0. */
function straight(n: number): { arc: number; z: number }[] {
  return Array.from({ length: n }, (_, i) => ({ arc: i * 2, z: 0 }));
}

describe('ribbonOutline', () => {
  it('returns no vertices for a degenerate span', () => {
    expect(ribbonOutline(straight(5), 2, 2, false, P)).toEqual([]);
    expect(ribbonOutline(straight(5), 0, 0, true, P)).toEqual([]);
  });

  it('a butt-ended body is a closed band of body half-width', () => {
    const verts = ribbonOutline(straight(6), 0, 5, false, P);
    // No arrow: 6 left-edge + 6 right-edge vertices.
    expect(verts).toHaveLength(12);
    // Band sits at ±halfWidth (4 px / 2.5 = 1.6 Å) about z = 0.
    const zs = verts.map((v) => v[1]);
    expect(Math.max(...zs)).toBeCloseTo(1.6, 6);
    expect(Math.min(...zs)).toBeCloseTo(-1.6, 6);
  });

  it('an arrow adds a flared head whose tip is the last sample', () => {
    const verts = ribbonOutline(straight(8), 0, 7, true, P);
    // Arrowhead introduces wings wider than the body half-width.
    const maxAbsZ = Math.max(...verts.map((v) => Math.abs(v[1])));
    expect(maxAbsZ).toBeCloseTo(6 / 2.5, 6); // arrowHalfWidthPx → 2.4 Å
    // The tip vertex sits on the centreline at the final sample's arc (14 Å).
    const tip = verts.find((v) => Math.abs(v[1]) < 1e-6 && v[0] > 13.9);
    expect(tip).toBeDefined();
    expect(tip![0]).toBeCloseTo(14, 6);
  });
});
