import { describe, it, expect } from 'vitest';
import { unrollChain } from '../../../src/unroll/unroll.js';
import type { Calpha } from '../../../src/types.js';

function caRange(n: number, fn: (i: number) => { x: number; y: number; z: number }): Calpha[] {
  return Array.from({ length: n }, (_, i) => ({ resSeq: i + 1, iCode: '', ...fn(i) }));
}

describe('unrollChain', () => {
  it('returns empty result for empty input', () => {
    const r = unrollChain([]);
    expect(r.segments).toHaveLength(0);
    expect(r.totalArcLength).toBe(0);
  });

  it('records correct arc length along a straight horizontal chain', () => {
    // Cα spaced 3.8 Å apart along x, z = 0.
    const calphas = caRange(5, (i) => ({ x: i * 3.8, y: 0, z: 0 }));
    const r = unrollChain(calphas);
    expect(r.segments).toHaveLength(1);
    const seg = r.segments[0];
    expect(seg.residues).toHaveLength(5);
    expect(seg.residues[0].arc).toBeCloseTo(0, 4);
    expect(seg.residues[4].arc).toBeCloseTo(4 * 3.8, 4);
    expect(r.totalArcLength).toBeCloseTo(4 * 3.8, 4);
  });

  it('preserves z exactly at Cα positions when z varies along the chain', () => {
    // Tilted straight chain — z grows with index.
    const calphas = caRange(6, (i) => ({ x: i * 3, y: 0, z: i * 1.5 }));
    const r = unrollChain(calphas);
    const seg = r.segments[0];
    for (let i = 0; i < calphas.length; i++) {
      expect(seg.residues[i].z).toBeCloseTo(i * 1.5, 4);
    }
  });

  it('compresses arc length when chain coils back over itself in xy', () => {
    // A helix-like path: tight xy spiral, residues stack in z.
    // 10 residues looping in a circle of radius 2 in xy, rising in z.
    const calphas = caRange(10, (i) => ({
      x: 2 * Math.cos((i / 10) * 2 * Math.PI),
      y: 2 * Math.sin((i / 10) * 2 * Math.PI),
      z: i * 1.5,
    }));
    const r = unrollChain(calphas);
    // xy footprint of a single coil ≈ circumference 2π*2 ≈ 12.57.
    // Chain end z = 9*1.5 = 13.5. Arc < total 3D length but bigger than 0.
    expect(r.totalArcLength).toBeGreaterThan(5);
    expect(r.totalArcLength).toBeLessThan(20);
    // Each Cα's arc is strictly increasing.
    const seg = r.segments[0];
    for (let i = 1; i < seg.residues.length; i++) {
      expect(seg.residues[i].arc).toBeGreaterThan(seg.residues[i - 1].arc);
    }
  });

  it('subtracts membraneCentre from z', () => {
    const calphas = caRange(3, (i) => ({ x: i * 3, y: 0, z: 20 }));
    const r = unrollChain(calphas, { membraneCentre: 20 });
    for (const ca of r.segments[0].residues) {
      expect(ca.z).toBeCloseTo(0, 4);
    }
  });

  it('splits the chain on long jumps (chain breaks)', () => {
    const calphas: Calpha[] = [
      { resSeq: 1, iCode: '', x: 0, y: 0, z: 0 },
      { resSeq: 2, iCode: '', x: 3.8, y: 0, z: 0 },
      // Big jump — break.
      { resSeq: 10, iCode: '', x: 50, y: 0, z: 0 },
      { resSeq: 11, iCode: '', x: 53.8, y: 0, z: 0 },
    ];
    const r = unrollChain(calphas);
    expect(r.segments).toHaveLength(2);
    expect(r.segments[0].residues.map((c) => c.resSeq)).toEqual([1, 2]);
    expect(r.segments[1].residues.map((c) => c.resSeq)).toEqual([10, 11]);
  });

  it('keeps arc length continuous across chain breaks', () => {
    const calphas: Calpha[] = [
      { resSeq: 1, iCode: '', x: 0, y: 0, z: 0 },
      { resSeq: 2, iCode: '', x: 3.8, y: 0, z: 0 },
      { resSeq: 10, iCode: '', x: 50, y: 0, z: 0 },
      { resSeq: 11, iCode: '', x: 53.8, y: 0, z: 0 },
    ];
    const r = unrollChain(calphas);
    const lastOfFirst = r.segments[0].residues[1].arc;
    const firstOfSecond = r.segments[1].residues[0].arc;
    expect(firstOfSecond).toBeGreaterThanOrEqual(lastOfFirst);
  });
});
