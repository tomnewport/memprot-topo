import { describe, it, expect } from 'vitest';
import { fitBSpline, evaluateBSpline, sampleBSpline } from '../../../src/unroll/bspline.js';
import type { Vec } from '../../../src/unroll/catmull-rom.js';

function pts(xs: number[]): Vec[] {
  return xs.map((x, i) => ({ x, y: i * 0.1, z: 0 }));
}

describe('fitBSpline', () => {
  it('returns single control point for single input', () => {
    const s = fitBSpline([{ x: 3, y: 4, z: 5 }], 4);
    expect(s.controlPoints).toHaveLength(1);
    expect(s.controlPoints[0]).toMatchObject({ x: 3, y: 4, z: 5 });
  });

  it('fixes endpoints to first and last input points', () => {
    const points = pts([0, 2, 5, 9, 14, 20, 27, 35]);
    const s = fitBSpline(points, 4);
    expect(s.controlPoints[0].x).toBeCloseTo(0, 10);
    expect(s.controlPoints[s.controlPoints.length - 1].x).toBeCloseTo(35, 10);
  });

  it('fits a straight line exactly', () => {
    // Collinear points — any cubic B-spline can represent a line exactly.
    const points: Vec[] = Array.from({ length: 8 }, (_, i) => ({ x: i * 3.8, y: 0, z: 0 }));
    const s = fitBSpline(points, 4);
    // Evaluate at a mid-parameter and expect it to lie on the line.
    const mid = evaluateBSpline(s, 0.5);
    expect(mid.x).toBeCloseTo(3.8 * 3.5, 4);
    expect(mid.y).toBeCloseTo(0, 4);
    expect(mid.z).toBeCloseTo(0, 4);
  });

  it('produces k control points', () => {
    const points: Vec[] = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0, z: 0 }));
    const s = fitBSpline(points, 6);
    expect(s.controlPoints).toHaveLength(6);
  });

  it('clamps k to m when k > m (m ≥ 4)', () => {
    // Cubic B-spline needs at least 4 control points; m=6 here.
    const points: Vec[] = Array.from({ length: 6 }, (_, i) => ({ x: i * 3.8, y: 0, z: 0 }));
    const s = fitBSpline(points, 100);
    expect(s.controlPoints.length).toBeLessThanOrEqual(6);
  });

  it('chord-length params are in [0, 1] and strictly increasing', () => {
    const points: Vec[] = Array.from({ length: 6 }, (_, i) => ({ x: i * 3.8, y: 0, z: i * 0.5 }));
    const s = fitBSpline(points, 4);
    expect(s.params[0]).toBeCloseTo(0, 10);
    expect(s.params[s.params.length - 1]).toBeCloseTo(1, 5);
    for (let i = 1; i < s.params.length; i++) {
      expect(s.params[i]).toBeGreaterThan(s.params[i - 1]);
    }
  });
});

describe('evaluateBSpline', () => {
  it('returns first control point at t = 0', () => {
    const points: Vec[] = Array.from({ length: 8 }, (_, i) => ({ x: i, y: i * 2, z: 0 }));
    const s = fitBSpline(points, 4);
    const p = evaluateBSpline(s, 0);
    expect(p.x).toBeCloseTo(points[0].x, 4);
    expect(p.y).toBeCloseTo(points[0].y, 4);
  });

  it('returns last control point at t = 1', () => {
    const points: Vec[] = Array.from({ length: 8 }, (_, i) => ({ x: i, y: 0, z: i }));
    const s = fitBSpline(points, 4);
    const p = evaluateBSpline(s, 1);
    expect(p.x).toBeCloseTo(points[7].x, 4);
    expect(p.z).toBeCloseTo(points[7].z, 4);
  });
});

describe('sampleBSpline', () => {
  it('returns the requested number of samples', () => {
    const points: Vec[] = Array.from({ length: 10 }, (_, i) => ({ x: i * 3.8, y: 0, z: 0 }));
    const s = fitBSpline(points, 4);
    const { samples } = sampleBSpline(s, 100);
    expect(samples).toHaveLength(100);
  });

  it('control index for first point is 0', () => {
    const points: Vec[] = Array.from({ length: 8 }, (_, i) => ({ x: i, y: 0, z: 0 }));
    const s = fitBSpline(points, 4);
    const { controlIndex } = sampleBSpline(s, 113);
    expect(controlIndex[0]).toBe(0);
  });

  it('control index for last point is totalSamples - 1', () => {
    const points: Vec[] = Array.from({ length: 8 }, (_, i) => ({ x: i, y: 0, z: 0 }));
    const s = fitBSpline(points, 4);
    const totalSamples = 113;
    const { controlIndex } = sampleBSpline(s, totalSamples);
    expect(controlIndex[controlIndex.length - 1]).toBe(totalSamples - 1);
  });

  it('control indices are strictly increasing', () => {
    const points: Vec[] = Array.from({ length: 10 }, (_, i) => ({ x: i * 3.8, y: 0, z: i }));
    const s = fitBSpline(points, 4);
    const { controlIndex } = sampleBSpline(s, 145);
    for (let i = 1; i < controlIndex.length; i++) {
      expect(controlIndex[i]).toBeGreaterThan(controlIndex[i - 1]);
    }
  });

  it('arc length along straight line equals total distance', () => {
    // 8 Cα at 3.8 Å spacing, z=0 — expected arc = 7 * 3.8 = 26.6.
    const n = 8;
    const points: Vec[] = Array.from({ length: n }, (_, i) => ({ x: i * 3.8, y: 0, z: 0 }));
    const s = fitBSpline(points, 4);
    const { samples } = sampleBSpline(s, (n - 1) * 16 + 1);
    let arc = 0;
    for (let j = 1; j < samples.length; j++) {
      const dx = samples[j].x - samples[j - 1].x;
      const dy = samples[j].y - samples[j - 1].y;
      arc += Math.sqrt(dx * dx + dy * dy);
    }
    expect(arc).toBeCloseTo(7 * 3.8, 3);
  });
});
