import { describe, it, expect } from 'vitest';
import {
  extractStrands,
  pairStrands,
  analyseBarrel,
  analyseAssemblyBarrel,
} from '../../../src/contacts/beta-sheet.js';
import type { Calpha, ChainData, SecondaryStructureSegment } from '../../../src/types.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

/** Two parallel vertical strands a fixed distance apart in x (planar sheet). */
function twoStrands(
  spacing: number,
  antiparallel: boolean,
): {
  calphas: Calpha[];
  segments: SecondaryStructureSegment[];
} {
  const calphas: Calpha[] = [];
  const segments: SecondaryStructureSegment[] = [];
  let resSeq = 1;
  // Strand A: z from -6 to +6.
  const aStart = resSeq;
  for (let j = 0; j < 8; j++)
    calphas.push({ resSeq: resSeq++, iCode: '', x: 0, y: 0, z: -6 + j * (12 / 7) });
  segments.push({ start: aStart, end: resSeq - 1, type: 'strand' });
  // Strand B: same z span (parallel) or reversed (antiparallel).
  const bStart = resSeq;
  for (let j = 0; j < 8; j++) {
    const z = -6 + j * (12 / 7);
    calphas.push({ resSeq: resSeq++, iCode: '', x: spacing, y: 0, z: antiparallel ? -z : z });
  }
  segments.push({ start: bStart, end: resSeq - 1, type: 'strand' });
  return { calphas, segments };
}

describe('extractStrands', () => {
  it('builds one strand per strand segment with an N→C-oriented axis', () => {
    const { calphas, segments } = twoStrands(5, false);
    const strands = extractStrands(calphas, segments);
    expect(strands).toHaveLength(2);
    // Strand A climbs in +z, so its axis should point along +z.
    expect(strands[0].axis.z).toBeGreaterThan(0.9);
    expect(strands[0].calphas).toHaveLength(8);
  });

  it('skips strands with fewer than two resolved Cα', () => {
    const calphas: Calpha[] = [{ resSeq: 1, iCode: '', x: 0, y: 0, z: 0 }];
    const segments: SecondaryStructureSegment[] = [{ start: 1, end: 3, type: 'strand' }];
    expect(extractStrands(calphas, segments)).toHaveLength(0);
  });
});

describe('pairStrands', () => {
  it('pairs two strands at β-sheet spacing and reads their orientation', () => {
    const anti = twoStrands(4.8, true);
    const pairings = pairStrands(extractStrands(anti.calphas, anti.segments));
    expect(pairings).toHaveLength(1);
    expect(pairings[0].orientation).toBe('antiparallel');
    expect(pairings[0].spacing).toBeCloseTo(4.8, 1);
    expect(pairings[0].contacts.length).toBeGreaterThanOrEqual(3);

    const par = twoStrands(4.8, false);
    const pp = pairStrands(extractStrands(par.calphas, par.segments));
    expect(pp[0].orientation).toBe('parallel');
  });

  it('does not pair strands that sit too far apart', () => {
    const far = twoStrands(12, true);
    expect(pairStrands(extractStrands(far.calphas, far.segments))).toHaveLength(0);
  });
});

describe('analyseBarrel', () => {
  it('recognises a closed cylindrical barrel and its strand count', () => {
    const chain = syntheticBarrel({ n: 8 });
    const a = analyseBarrel(chain.calphas, chain.segments);
    expect(a.closed).toBe(true);
    expect(a.cylindrical).toBe(true);
    expect(a.strandCount).toBe(8);
    expect(a.ringOrder).toHaveLength(8);
    // Every adjacent pair in a TM barrel is antiparallel; closure (0–last) too.
    expect(a.pairings).toHaveLength(8);
    expect(a.pairings.every((p) => p.orientation === 'antiparallel')).toBe(true);
  });

  it('reports a positive tilt and a finite shear number for a barrel', () => {
    const chain = syntheticBarrel({ n: 8, tiltDeg: 30 });
    const a = analyseBarrel(chain.calphas, chain.segments);
    expect(a.tiltDeg).toBeGreaterThan(10);
    expect(Number.isFinite(a.shear)).toBe(true);
    expect(a.shear).toBeGreaterThan(0);
  });

  it('scales the strand count with the number of strands built', () => {
    const a = analyseBarrel(
      syntheticBarrel({ n: 12 }).calphas,
      syntheticBarrel({ n: 12 }).segments,
    );
    expect(a.strandCount).toBe(12);
    expect(a.closed).toBe(true);
    expect(a.cylindrical).toBe(true);
  });

  it('classifies a flat (planar, open) strand sheet as non-cylindrical', () => {
    // Four parallel strands in a plane: an open sheet, not a closed cylinder.
    const calphas: Calpha[] = [];
    const segments: SecondaryStructureSegment[] = [];
    let resSeq = 1;
    for (let s = 0; s < 4; s++) {
      const start = resSeq;
      for (let j = 0; j < 8; j++)
        calphas.push({ resSeq: resSeq++, iCode: '', x: s * 4.8, y: 0, z: -6 + j * (12 / 7) });
      segments.push({ start, end: resSeq - 1, type: 'strand' });
    }
    const a = analyseBarrel(calphas, segments);
    expect(a.closed).toBe(false);
    expect(a.cylindrical).toBe(false);
    // The open sheet is still a connected path of three adjacent pairs…
    expect(a.pairings).toHaveLength(3);
    // …but only the two interior strands have a partner on each side, so the
    // ring walk (which runs over wall strands) does not wrap shut.
    expect(a.ringOrder).toEqual([1, 2]);
  });

  it('merges duplicated/overlapping SHEET records into one strand each', () => {
    // Real PDB/DSSP annotation lists a barrel strand once per sheet
    // relationship, so each physical strand appears several times as
    // overlapping ranges (the OmpF failure mode). Detection must still recover
    // the 8-strand closed barrel.
    const chain = syntheticBarrel({ n: 8 });
    const dup = chain.segments.flatMap((s) =>
      s.type === 'strand'
        ? [
            s,
            { ...s },
            { start: s.start, end: Math.floor((s.start + s.end) / 2), type: 'strand' as const },
          ]
        : [s],
    );
    const a = analyseBarrel(chain.calphas, dup);
    expect(a.strands).toHaveLength(8);
    expect(a.closed).toBe(true);
    expect(a.cylindrical).toBe(true);
    expect(a.strandCount).toBe(8);
  });

  it('returns an empty analysis when there are too few strands', () => {
    const a = analyseBarrel([], []);
    expect(a.cylindrical).toBe(false);
    expect(a.strands).toHaveLength(0);
  });
});

describe('analyseAssemblyBarrel', () => {
  // Split one barrel's strands across several chains (like α-hemolysin's
  // heptamer): each chain carries a contiguous slice of the residues, so no
  // single chain is a closed barrel, but pooled they are.
  function splitIntoChains(chain: ChainData, parts: number): ChainData[] {
    const per = Math.ceil(chain.residueCount / parts);
    const chains: ChainData[] = [];
    for (let p = 0; p < parts; p++) {
      const lo = p * per + 1;
      const hi = Math.min((p + 1) * per, chain.residueCount);
      const calphas = chain.calphas.filter((c) => c.resSeq >= lo && c.resSeq <= hi);
      const segments = chain.segments
        .filter((s) => s.start >= lo && s.end <= hi)
        .map((s) => ({ ...s }));
      if (calphas.length) {
        chains.push({
          chainId: String.fromCharCode(65 + p),
          residueCount: calphas.length,
          segments,
          calphas,
        });
      }
    }
    return chains;
  }

  it('detects a barrel pooled across chains that no single chain forms', () => {
    const chains = splitIntoChains(syntheticBarrel({ n: 8 }), 4);
    // Each chain alone has too few strands to be a barrel…
    for (const c of chains) expect(analyseBarrel(c.calphas, c.segments).cylindrical).toBe(false);
    // …but pooled they close the cylinder.
    const a = analyseAssemblyBarrel(chains);
    expect(a.cylindrical).toBe(true);
    expect(a.strandCount).toBe(8);
    expect(a.ringOrder).toHaveLength(8);
    // Ring strands are tagged with their source chain.
    expect(a.ringOrder.every((i) => a.strands[i].chainId !== undefined)).toBe(true);
  });
});
