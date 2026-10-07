import { describe, it, expect } from 'vitest';
import {
  chainIconShape,
  gridYToZ,
  iconZOuter,
  maxIconDensity,
  zToGridY,
} from '../../../src/components/chain-icon.js';
import type { ChainData } from '../../../src/types.js';

const MEMBRANE = { centre: 0, thickness: 30 };

function chainAt(id: string, zs: number[], type: 'helix' | 'coil' = 'helix'): ChainData {
  return {
    chainId: id,
    residueCount: zs.length,
    segments: [{ start: 1, end: zs.length, type }],
    calphas: zs.map((z, i) => ({ resSeq: i + 1, iCode: '', x: i, y: 0, z })),
  };
}

const span = (from: number, to: number, n: number) =>
  Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));

describe('chain icon grid mapping', () => {
  it('places the membrane in rows 3-4 and its surroundings in rows 2 and 5', () => {
    // h = 15 Å, outer limit 45 Å.
    expect(zToGridY(30, 15, 45)).toBeCloseTo(1); // half-thickness above surface
    expect(zToGridY(15, 15, 45)).toBeCloseTo(2); // top surface
    expect(zToGridY(0, 15, 45)).toBeCloseTo(3); // centre
    expect(zToGridY(-15, 15, 45)).toBeCloseTo(4); // bottom surface
    expect(zToGridY(-30, 15, 45)).toBeCloseTo(5);
    expect(zToGridY(45, 15, 45)).toBeCloseTo(0);
    expect(zToGridY(-45, 15, 45)).toBeCloseTo(6);
  });

  it('compresses everything beyond ±2h into the outer rows', () => {
    expect(zToGridY(37.5, 15, 45)).toBeCloseTo(0.5);
    expect(zToGridY(500, 15, 45)).toBe(0);
    expect(zToGridY(-500, 15, 45)).toBe(6);
  });

  it('inverts', () => {
    for (const gy of [0, 0.4, 1, 2.5, 3, 4.2, 5, 5.7, 6]) {
      expect(zToGridY(gridYToZ(gy, 15, 60), 15, 60)).toBeCloseTo(gy);
    }
  });

  it('measures rows from the membrane centre, not z = 0', () => {
    const c = chainAt('A', [40, 45, 50]);
    expect(chainIconShape(c, MEMBRANE, 30, 50)?.kind).toBe('box');
    expect(chainIconShape(c, { centre: 20, thickness: 30 }, 30, 50)?.kind).toBe('violin');
  });

  it('never shrinks the outer limit below 3h', () => {
    expect(iconZOuter([chainAt('A', [-10, 10])], MEMBRANE)).toBe(45);
    expect(iconZOuter([chainAt('A', [-80, 10])], MEMBRANE)).toBe(80);
  });
});

describe('chainIconShape', () => {
  it('draws a chain entirely more than h above the surface as a top-row box', () => {
    expect(chainIconShape(chainAt('A', span(31, 70, 20)), MEMBRANE, 30, 70)).toEqual({
      kind: 'box',
      row: 'top',
      helix: 1,
      strand: 0,
      coil: 0,
    });
  });

  it('draws a chain entirely more than h below the surface as a bottom-row box', () => {
    expect(chainIconShape(chainAt('A', span(-70, -31, 20)), MEMBRANE, 30, 70)).toEqual({
      kind: 'box',
      row: 'bottom',
      helix: 1,
      strand: 0,
      coil: 0,
    });
  });

  it('draws a chain reaching within 2h of the centre as a violin cut at its extremes', () => {
    const shape = chainIconShape(chainAt('A', span(-20, 60, 40)), MEMBRANE, 30, 60);
    expect(shape?.kind).toBe('violin');
    if (shape?.kind !== 'violin') return;
    expect(shape.samples[0].gy).toBeCloseTo(zToGridY(60, 15, 60));
    expect(shape.samples.at(-1)!.gy).toBeCloseTo(zToGridY(-20, 15, 60));
  });

  it('smooths more with a larger bandwidth', () => {
    const zs = [...span(-15, -10, 10), ...span(10, 15, 10)];
    const peakiness = (bw: number) => {
      const s = chainIconShape(chainAt('A', zs), MEMBRANE, bw, 45);
      if (s?.kind !== 'violin') throw new Error('expected violin');
      const d = s.samples.map((p) => p.density);
      return Math.max(...d) / Math.min(...d);
    };
    expect(peakiness(3)).toBeGreaterThan(peakiness(30));
  });

  it('splits violin density by secondary structure', () => {
    const chain: ChainData = {
      ...chainAt('A', span(-15, 15, 20)),
      segments: [{ start: 1, end: 10, type: 'strand' }],
    };
    const shape = chainIconShape(chain, MEMBRANE, 30, 45);
    if (shape?.kind !== 'violin') throw new Error('expected violin');
    for (const p of shape.samples) {
      expect(p.helix).toBe(0);
      expect(p.strand + p.coil).toBeCloseTo(p.density);
    }
    // Strand residues sit low (−15 → 0), coil high: strand dominates the bottom.
    const bottom = shape.samples.at(-1)!;
    expect(bottom.strand).toBeGreaterThan(bottom.coil);
  });

  it('returns null for a chain without coordinates', () => {
    expect(chainIconShape(chainAt('A', []), MEMBRANE, 30, 45)).toBeNull();
  });

  it('shares one width scale so bigger chains draw wider violins', () => {
    const small = chainIconShape(chainAt('A', span(-15, 15, 10)), MEMBRANE, 30, 45);
    const big = chainIconShape(chainAt('B', span(-15, 15, 40)), MEMBRANE, 30, 45);
    const max = maxIconDensity([small, big, null]);
    if (big?.kind !== 'violin') throw new Error('expected violin');
    expect(Math.max(...big.samples.map((p) => p.density))).toBeCloseTo(max);
  });
});
