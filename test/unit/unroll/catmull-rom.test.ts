import { describe, it, expect } from 'vitest';
import { evaluate, sampleCurve } from '../../../src/unroll/catmull-rom.js';

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
