import { describe, it, expect } from 'vitest';
import {
  buildLoopPoints,
  unitTangent,
  type LoopGeom,
} from '../../../src/scene/geometry/loop-path.js';
import type { UnrolledPoint } from '../../../src/unroll/index.js';

const GEOM: LoopGeom = {
  defaultTangentMagPx: 10,
  elementGapPx: 30,
  extremeSpacingPx: 5,
  arcPxPerA: 2.5,
};

const samples = (pts: [number, number][]): UnrolledPoint[] => pts.map(([arc, z]) => ({ arc, z }));

describe('unitTangent', () => {
  it('is a unit vector along the (arc,z) step', () => {
    const s = samples([
      [0, 0],
      [3, 4],
    ]);
    const t = unitTangent(s, 0, 1);
    expect(Math.hypot(t.a, t.z)).toBeCloseTo(1, 9);
    expect(t.a).toBeCloseTo(0.6, 9);
    expect(t.z).toBeCloseTo(0.8, 9);
  });

  it('falls back to +arc on a zero-length step', () => {
    const s = samples([
      [2, 2],
      [2, 2],
    ]);
    expect(unitTangent(s, 0, 1)).toEqual({ a: 1, z: 0 });
  });
});

describe('buildLoopPoints', () => {
  it('emits endpoint+tangent for each present end', () => {
    const prev = {
      samples: samples([
        [0, 0],
        [10, 0],
      ]),
      index: 1,
    };
    const next = {
      samples: samples([
        [20, 0],
        [30, 0],
      ]),
      index: 0,
    };
    const pts = buildLoopPoints(
      prev,
      next,
      null,
      { showPoints: false, extremePoints: false, extremeThreshold: 0.2 },
      GEOM,
    );
    // endpoint, tangent (prev) … tangent, endpoint (next)
    expect(pts[0]).toMatchObject({ kind: 'endpoint', arc: 10, z: 0 });
    expect(pts[pts.length - 1]).toMatchObject({ kind: 'endpoint', arc: 20, z: 0 });
    expect(pts.filter((p) => p.kind === 'tangent')).toHaveLength(2);
    expect(pts.some((p) => p.kind === 'extreme')).toBe(false);
  });

  it('adds vertical-extreme points when the loop overshoots the tangent range', () => {
    const prev = {
      samples: samples([
        [0, 0],
        [10, 0],
      ]),
      index: 1,
    };
    const next = {
      samples: samples([
        [20, 0],
        [30, 0],
      ]),
      index: 0,
    };
    // Loop path bulges to z = 20, far beyond the flat tangent points.
    const extreme = {
      samples: samples([
        [12, 20],
        [15, 20],
        [18, 20],
      ]),
      startSample: 0,
      endSample: 2,
    };
    const pts = buildLoopPoints(
      prev,
      next,
      extreme,
      { showPoints: false, extremePoints: true, extremeThreshold: 0.2 },
      GEOM,
    );
    const extremes = pts.filter((p) => p.kind === 'extreme');
    expect(extremes).toHaveLength(2);
    expect(extremes[0].z).toBeCloseTo(20, 6);
  });
});
