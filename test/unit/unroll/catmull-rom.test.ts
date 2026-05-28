import { describe, it, expect } from 'vitest';
import {
  evaluate,
  sampleCurve,
  catmullRomBezier,
  type Vec,
} from '../../../src/unroll/catmull-rom.js';

function cubicBezier(p0: Vec, c1: Vec, c2: Vec, p3: Vec, u: number): Vec {
  const v = 1 - u;
  const a = v * v * v;
  const b = 3 * v * v * u;
  const c = 3 * v * u * u;
  const d = u * u * u;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
    z: a * p0.z + b * c1.z + c * c2.z + d * p3.z,
  };
}

const STRAIGHT = [
  { x: 0, y: 0, z: 0 },
  { x: 1, y: 0, z: 0 },
  { x: 2, y: 0, z: 0 },
  { x: 3, y: 0, z: 0 },
];

describe('catmull-rom evaluate', () => {
  it('passes exactly through every control point at integer t', () => {
    for (let i = 0; i < STRAIGHT.length; i++) {
      const p = evaluate(STRAIGHT, i);
      expect(p.x).toBeCloseTo(STRAIGHT[i].x, 10);
      expect(p.y).toBeCloseTo(STRAIGHT[i].y, 10);
      expect(p.z).toBeCloseTo(STRAIGHT[i].z, 10);
    }
  });

  it('clamps t outside [0, N-1] to the endpoint', () => {
    const a = evaluate(STRAIGHT, -1);
    const b = evaluate(STRAIGHT, 100);
    expect(a).toEqual(STRAIGHT[0]);
    expect(b).toEqual(STRAIGHT[STRAIGHT.length - 1]);
  });

  it('interpolates linearly along a straight line', () => {
    const p = evaluate(STRAIGHT, 1.5);
    expect(p.x).toBeCloseTo(1.5, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.z).toBeCloseTo(0, 6);
  });

  it('handles single-point input', () => {
    const p = evaluate([{ x: 5, y: 6, z: 7 }], 0);
    expect(p).toEqual({ x: 5, y: 6, z: 7 });
  });

  it('handles two-point input as a linear interpolation', () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 10, y: 0, z: 0 },
    ];
    expect(evaluate(pts, 0.5).x).toBeCloseTo(5, 6);
  });
});

describe('catmull-rom sampleCurve', () => {
  it('returns one control index per input point, in order', () => {
    const { samples, controlIndex } = sampleCurve(STRAIGHT, 8);
    expect(controlIndex).toHaveLength(STRAIGHT.length);
    for (let i = 0; i < STRAIGHT.length; i++) {
      const s = samples[controlIndex[i]];
      expect(s.x).toBeCloseTo(STRAIGHT[i].x, 6);
      expect(s.y).toBeCloseTo(STRAIGHT[i].y, 6);
    }
  });

  it('produces (N-1)*samplesPerSegment + 1 samples', () => {
    const { samples } = sampleCurve(STRAIGHT, 8);
    expect(samples).toHaveLength((STRAIGHT.length - 1) * 8 + 1);
  });

  it('passes through a curved control net', () => {
    const pts = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 3, y: -1, z: 0 },
    ];
    const { samples, controlIndex } = sampleCurve(pts, 4);
    for (let i = 0; i < pts.length; i++) {
      const s = samples[controlIndex[i]];
      expect(s.x).toBeCloseTo(pts[i].x, 6);
      expect(s.y).toBeCloseTo(pts[i].y, 6);
    }
  });
});

describe('catmull-rom catmullRomBezier', () => {
  const PTS = [
    { x: 0, y: 0, z: 0 },
    { x: 1, y: 2, z: 0 },
    { x: 3, y: 1, z: 1 },
    { x: 4, y: -1, z: 2 },
    { x: 6, y: 0, z: 0 },
  ];

  it('yields one Bézier segment per interval, starting at the first point', () => {
    const path = catmullRomBezier(PTS);
    expect(path.segments).toHaveLength(PTS.length - 1);
    expect(path.start).toEqual(PTS[0]);
    expect(path.segments[path.segments.length - 1].end).toEqual(PTS[PTS.length - 1]);
  });

  it('reproduces the centripetal Catmull-Rom curve exactly', () => {
    const path = catmullRomBezier(PTS);
    let prev = path.start;
    for (let i = 0; i < path.segments.length; i++) {
      const seg = path.segments[i];
      for (const u of [0, 0.25, 0.5, 0.75, 1]) {
        const b = cubicBezier(prev, seg.c1, seg.c2, seg.end, u);
        const ref = evaluate(PTS, i + u);
        expect(b.x).toBeCloseTo(ref.x, 6);
        expect(b.y).toBeCloseTo(ref.y, 6);
        expect(b.z).toBeCloseTo(ref.z, 6);
      }
      prev = seg.end;
    }
  });

  it('handles single- and two-point inputs', () => {
    expect(catmullRomBezier([]).segments).toHaveLength(0);
    expect(catmullRomBezier([{ x: 1, y: 2, z: 3 }]).segments).toHaveLength(0);
    const two = catmullRomBezier([
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
    ]);
    expect(two.segments).toHaveLength(1);
    // Midpoint of the degenerate cubic lies on the straight line.
    const mid = cubicBezier(
      two.start,
      two.segments[0].c1,
      two.segments[0].c2,
      two.segments[0].end,
      0.5,
    );
    expect(mid.x).toBeCloseTo(1.5, 6);
  });
});
