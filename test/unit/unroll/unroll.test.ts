import { describe, it, expect } from 'vitest';
import { unrollChain } from '../../../src/unroll/unroll.js';
import type { Calpha, SecondaryStructureSegment } from '../../../src/types.js';

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

const DEG = Math.PI / 180;

/** Ideal alpha-helix Cα: radius 2.3 Å, rise 1.5 Å, twist 100°/residue. */
function helixCa(n: number, resSeqStart = 1): Calpha[] {
  return Array.from({ length: n }, (_, i) => ({
    resSeq: resSeqStart + i,
    iCode: '',
    x: 2.3 * Math.cos(i * 100 * DEG),
    y: 2.3 * Math.sin(i * 100 * DEG),
    z: i * 1.5,
  }));
}

describe('unrollChain with ssSegments (helix axis)', () => {
  it('helix arc is strictly increasing', () => {
    const n = 20;
    const calphas = helixCa(n);
    const ssSegments: SecondaryStructureSegment[] = [{ start: 1, end: n, type: 'helix' }];
    const r = unrollChain(calphas, { ssSegments });
    const residues = r.segments[0].residues;
    for (let i = 1; i < residues.length; i++) {
      expect(residues[i].arc).toBeGreaterThan(residues[i - 1].arc);
    }
  });

  it('helix arc is much smoother than raw Catmull–Rom through Cα', () => {
    // Ideal TM helix: Ca spiral in xy, rise in z.
    const n = 24;
    const calphas = helixCa(n);
    const ssSegments: SecondaryStructureSegment[] = [{ start: 1, end: n, type: 'helix' }];

    const withAxis = unrollChain(calphas, { ssSegments });
    const withoutAxis = unrollChain(calphas); // no SS → Catmull–Rom through Cα

    // Compute per-residue arc increments.
    function increments(residues: { arc: number }[]): number[] {
      const d: number[] = [];
      for (let i = 1; i < residues.length; i++) d.push(residues[i].arc - residues[i - 1].arc);
      return d;
    }
    function variance(xs: number[]): number {
      const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
      return xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    }

    const incAxis = increments(withAxis.segments[0].residues);
    const incRaw = increments(withoutAxis.segments[0].residues);

    // Axis-fitted increments should be much more uniform (lower variance).
    expect(variance(incAxis)).toBeLessThan(variance(incRaw) * 0.2);
  });

  it('helix z values are actual Cα z (not spline z)', () => {
    const n = 16;
    const calphas = helixCa(n);
    const ssSegments: SecondaryStructureSegment[] = [{ start: 1, end: n, type: 'helix' }];
    const r = unrollChain(calphas, { ssSegments });
    for (let i = 0; i < n; i++) {
      expect(r.segments[0].residues[i].z).toBeCloseTo(i * 1.5, 4);
    }
  });

  it('strand arc preserves xy displacement (not smoothed away by global spline)', () => {
    // Beta-barrel strand: alternating ±1.0 Å radial (y) plus net circumferential drift.
    // Catmull-Rom (strand) traverses the zigzag; smooth B-spline (no SS) averages it away.
    // Realistic beta-barrel strand geometry:
    //   - net drift 1.2 Å/residue along x (circumferential)
    //   - alternating ±1.0 Å in y (in/out radial)
    //   - rise 3.3 Å/residue (z)
    // 3-D Cα–Cα distance ≈ 4.0 Å — well below the 5.5 Å break threshold.
    const n = 8;
    const strandCa: Calpha[] = Array.from({ length: n }, (_, i) => ({
      resSeq: i + 1,
      iCode: '',
      x: 1.2 * i,
      y: i % 2 === 0 ? 1.0 : -1.0,
      z: i * 3.3,
    }));
    const ssStrand: SecondaryStructureSegment[] = [{ start: 1, end: n, type: 'strand' }];

    const withStrand = unrollChain(strandCa, { ssSegments: ssStrand });
    const noSS = unrollChain(strandCa); // no SS → smooth global B-spline

    // With strand annotation the arc must reflect the actual Cα zigzag (Catmull-Rom).
    // Without SS the smooth spline substantially reduces the perceived lateral travel.
    expect(withStrand.totalArcLength).toBeGreaterThan(noSS.totalArcLength * 1.5);

    // Arc must still be strictly increasing per residue.
    const residues = withStrand.segments[0].residues;
    for (let i = 1; i < residues.length; i++) {
      expect(residues[i].arc).toBeGreaterThan(residues[i - 1].arc);
    }
  });

  it('aminosPerDof=2 gives more control points than aminosPerDof=8', () => {
    // We cannot observe k directly, but a looser spline (more DOF) should track
    // the helix spiral more closely → larger arc-increment variance.
    const n = 40;
    const calphas = helixCa(n);

    function arcIncrements(aminosPerDof: number): number[] {
      const r = unrollChain(calphas, { aminosPerDof });
      const res = r.segments[0].residues;
      const d: number[] = [];
      for (let i = 1; i < res.length; i++) d.push(res[i].arc - res[i - 1].arc);
      return d;
    }
    function variance(xs: number[]): number {
      const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
      return xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
    }

    const varLoose = variance(arcIncrements(2));
    const varTight = variance(arcIncrements(8));
    expect(varLoose).toBeGreaterThan(varTight);
  });
});
