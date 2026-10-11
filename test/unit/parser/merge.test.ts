import { describe, it, expect } from 'vitest';
import { mergeProteinData } from '../../../src/parser/merge.js';
import type { RawChain, RawSSSegment } from '../../../src/parser/types.js';
import type { BetaLadder } from '../../../src/types.js';

describe('mergeProteinData', () => {
  const chainA: RawChain = {
    chainId: 'A',
    residues: new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']),
    calphas: [],
  };
  const chainB: RawChain = {
    chainId: 'B',
    residues: new Set(['1', '2', '3', '4', '5']),
    calphas: [],
  };

  const ssSegments: RawSSSegment[] = [
    { chainId: 'A', start: 2, end: 5, type: 'helix' },
    { chainId: 'A', start: 7, end: 9, type: 'helix' },
    { chainId: 'B', start: 1, end: 3, type: 'strand' },
  ];

  it('produces correct pdbId', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments);
    expect(result.pdbId).toBe('1abc');
  });

  it('produces correct number of chains', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments);
    expect(result.chains).toHaveLength(2);
  });

  it('chain A has correct residue count', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments);
    const a = result.chains.find((c) => c.chainId === 'A');
    expect(a!.residueCount).toBe(10);
  });

  it('chain B has correct residue count', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments);
    const b = result.chains.find((c) => c.chainId === 'B');
    expect(b!.residueCount).toBe(5);
  });

  it('chain A has 2 helices', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments);
    const a = result.chains.find((c) => c.chainId === 'A');
    expect(a!.segments).toHaveLength(2);
    expect(a!.segments.every((s) => s.type === 'helix')).toBe(true);
  });

  it('chain B has 1 strand', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments);
    const b = result.chains.find((c) => c.chainId === 'B');
    expect(b!.segments).toHaveLength(1);
    expect(b!.segments[0].type).toBe('strand');
  });

  it('segments are sorted by start position', () => {
    const unsortedSegments: RawSSSegment[] = [
      { chainId: 'A', start: 7, end: 9, type: 'helix' },
      { chainId: 'A', start: 2, end: 5, type: 'helix' },
    ];
    const result = mergeProteinData('1abc', [chainA], unsortedSegments);
    const a = result.chains.find((c) => c.chainId === 'A');
    expect(a!.segments[0].start).toBe(2);
    expect(a!.segments[1].start).toBe(7);
  });

  it('chain with no segments has empty segments array', () => {
    const result = mergeProteinData('1abc', [chainA, chainB], []);
    const a = result.chains.find((c) => c.chainId === 'A');
    expect(a!.segments).toHaveLength(0);
  });

  it('handles empty chains array', () => {
    const result = mergeProteinData('1abc', [], ssSegments);
    expect(result.chains).toHaveLength(0);
  });

  it('gives each chain the ladders touching it, and none to a chain without', () => {
    const r = (chainId: string, resSeq: number) => ({ chainId, resSeq, iCode: '' });
    const ladders: BetaLadder[] = [
      {
        id: 'A',
        type: 'antiparallel',
        a: { start: r('A', 2), end: r('A', 3) },
        b: { start: r('A', 9), end: r('A', 8) },
      },
      {
        id: 'B',
        type: 'parallel',
        a: { start: r('A', 5), end: r('A', 5) },
        b: { start: r('C', 1), end: r('C', 1) },
      },
    ];
    const result = mergeProteinData('1abc', [chainA, chainB], ssSegments, ladders);
    expect(result.chains[0].ladders!.map((l) => l.id)).toEqual(['A', 'B']);
    expect(result.chains[1].ladders).toBeUndefined();
  });
});
