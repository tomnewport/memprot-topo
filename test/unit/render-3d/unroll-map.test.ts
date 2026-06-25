import { describe, it, expect } from 'vitest';
import { curlXZ, ringRadius } from '../../../src/render-3d/unroll-map.js';

const hyp = Math.hypot;

describe('curlXZ', () => {
  it('is exact at the endpoints (β=0 → flat, β=1 → real)', () => {
    const cases: [number, number, number][] = [
      [20, 3.5, -11.4],
      [-130, 12, 5],
      [0, -6, 8],
      [55, -9, -9],
    ];
    for (const [Fx, Sx, Sz] of cases) {
      const f = curlXZ(Fx, 0, Sx, Sz, 0, 12);
      expect(hyp(f.x - Fx, f.z - 0)).toBeLessThan(1e-12);
      const g = curlXZ(Fx, 0, Sx, Sz, 1, 12);
      expect(hyp(g.x - Sx, g.z - Sz)).toBeLessThan(1e-12);
    }
  });

  it('does not implode in the realistic regime (flat-x sign tracks the real side)', () => {
    // On real barrels arc (=Fx sign) correlates with the real angular side, so a
    // far flat sample rolls in to a same-side wall position. A straight chord
    // dips toward the axis; the curl keeps it out near the wall.
    const R = 12;
    for (const [Fx, ang] of [
      [120, 0.3],
      [60, 0.8],
      [-120, Math.PI - 0.3],
      [-60, Math.PI + 0.6],
    ] as const) {
      const Sx = R * Math.cos(ang);
      const Sz = R * Math.sin(ang);
      let minR = Infinity;
      let minChord = Infinity;
      for (let b = 0.02; b <= 0.98; b += 0.02) {
        const p = curlXZ(Fx, 0, Sx, Sz, b, R);
        minR = Math.min(minR, hyp(p.x, p.z));
        minChord = Math.min(minChord, hyp(Fx + (Sx - Fx) * b, Sz * b));
      }
      expect(minR).toBeGreaterThan(0.5 * R);
      expect(minR).toBeGreaterThanOrEqual(minChord - 1e-9); // never worse than the chord
    }
  });

  it('stays finite and bounded even for an adversarial near-antipodal pair', () => {
    const R = 12;
    for (let b = 0; b <= 1.0001; b += 0.05) {
      const p = curlXZ(130, 0, R * Math.cos(Math.PI - 0.2), R * Math.sin(Math.PI - 0.2), b, R);
      expect(Number.isFinite(p.x)).toBe(true);
      expect(Number.isFinite(p.z)).toBe(true);
      expect(hyp(p.x, p.z)).toBeLessThan(200); // never flies off
    }
  });

  it('is continuous across the arc seam (no tear at Fx = 0)', () => {
    // Two neighbouring flat samples straddling x=0 must stay close at every β
    // (the polar-wrap map tore here; the curl must not).
    const R = 10;
    const Sx = -7;
    const Sz = 3;
    for (let b = 0; b <= 1.0001; b += 0.05) {
      const left = curlXZ(-0.5, 0, Sx + 0.1, Sz, b, R);
      const right = curlXZ(0.5, 0, Sx - 0.1, Sz, b, R);
      expect(hyp(left.x - right.x, left.z - right.z)).toBeLessThan(3);
    }
  });

  it('bows outward at the midpoint rather than chording inward', () => {
    // A sample whose flat point is near the axis: the curl should push it out,
    // not leave it stranded near the centre.
    const R = 12;
    const mid = curlXZ(1, 0, R * 0.7, R * 0.5, 0.5, R);
    const chordMid = { x: (1 + R * 0.7) / 2, z: (0 + R * 0.5) / 2 };
    expect(hyp(mid.x, mid.z)).toBeGreaterThan(hyp(chordMid.x, chordMid.z));
  });

  it('ringRadius is the rms radius about the axis', () => {
    expect(
      ringRadius([
        { x: 3, z: 4 },
        { x: 3, z: 4 },
      ]),
    ).toBeCloseTo(5, 6);
    expect(ringRadius([])).toBe(1);
  });
});
