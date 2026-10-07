import { describe, it, expect } from 'vitest';
import { ssOutline, outlinePolygon, outlineCentre } from '../../../src/components/ss-outline.js';

const DIMS = { halfWidth: 4, arrowHalfWidth: 6, arrowLength: 12 };

function straight(n: number, step = 5): { sx: number; sy: number }[] {
  return Array.from({ length: n }, (_, i) => ({ sx: i * step, sy: 0 }));
}

describe('ssOutline', () => {
  it('returns nothing for fewer than two points', () => {
    expect(ssOutline([{ sx: 0, sy: 0 }], false, DIMS)).toEqual([]);
  });

  it('gives a uniform-width body with one section per point when there is no arrow', () => {
    const pts = straight(5);
    const sections = ssOutline(pts, false, DIMS);
    expect(sections).toHaveLength(5);
    for (const s of sections) {
      expect(s.hw).toBe(4);
      expect(s.px).toBeCloseTo(0);
      expect(Math.abs(s.py)).toBeCloseTo(1);
    }
    const poly = outlinePolygon(pts, sections);
    // Left edge forward then right edge back: a 20 × 8 rectangle.
    expect(poly).toHaveLength(10);
    const ys = new Set(poly.map((p) => Math.round(p.sy)));
    expect([...ys].sort()).toEqual([-4, 4].sort());
    expect(Math.min(...poly.map((p) => p.sx))).toBe(0);
    expect(Math.max(...poly.map((p) => p.sx))).toBe(20);
  });

  it('ends in an arrowhead whose base sits arrowLength back from the tip', () => {
    const pts = straight(9); // 0 … 40
    const sections = ssOutline(pts, true, DIMS);
    const n = sections.length;
    const tip = sections[n - 1];
    const wing = sections[n - 2];
    const shoulder = sections[n - 3];
    expect(tip.hw).toBe(0);
    expect(outlineCentre(pts, tip.fi).sx).toBeCloseTo(40);
    expect(wing.hw).toBe(6);
    expect(shoulder.hw).toBe(4);
    expect(wing.fi).toBe(shoulder.fi);
    expect(outlineCentre(pts, wing.fi).sx).toBeCloseTo(28);
    // The tip contributes a single vertex to the polygon.
    const poly = outlinePolygon(pts, sections);
    expect(poly).toHaveLength(2 * n - 1);
  });

  it('collapses to a pure arrowhead when the element is shorter than the arrow', () => {
    const pts = straight(3, 2); // 4 px long
    const sections = ssOutline(pts, true, DIMS);
    expect(sections).toHaveLength(3);
    expect(sections[0].fi).toBe(0);
    expect(sections[1].hw).toBe(6);
  });
});
