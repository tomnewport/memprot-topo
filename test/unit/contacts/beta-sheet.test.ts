import { describe, it, expect } from 'vitest';
import {
  extractStrands,
  pairStrands,
  analyseBarrel,
  analyseAssemblyBarrel,
  pairStrandsFromLadders,
  chainLadders,
} from '../../../src/contacts/beta-sheet.js';
import type {
  BetaLadder,
  Calpha,
  ChainData,
  SecondaryStructureSegment,
} from '../../../src/types.js';
import { parsePdb } from '../../../src/parser/pdb.js';
import { parseDsspLadders, parseDsspMmcif } from '../../../src/parser/dssp-mmcif.js';
import { mergeProteinData } from '../../../src/parser/merge.js';
import OMF_PDB from '../../../examples/2omf.pdb?raw';
import OMF_DSSP from '../../../examples/2omf.dssp.cif?raw';
import AHL_PDB from '../../../examples/7ahl.pdb?raw';
import AHL_DSSP from '../../../examples/7ahl.dssp.cif?raw';
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

const ref = (resSeq: number, chainId = 'A') => ({ chainId, resSeq, iCode: '' });
const ladder = (
  id: string,
  type: BetaLadder['type'],
  a: [number, number],
  b: [number, number],
): BetaLadder => ({
  id,
  type,
  a: { start: ref(a[0]), end: ref(a[1]) },
  b: { start: ref(b[0]), end: ref(b[1]) },
});

describe('pairStrandsFromLadders', () => {
  // Residues 1–8 and 9–16, antiparallel: 1 pairs with 16, 8 with 9.
  const anti = twoStrands(4.8, true);
  const strands = extractStrands(anti.calphas, anti.segments);

  it('pairs residues along the ladder, reversed for an antiparallel one', () => {
    const [p] = pairStrandsFromLadders(strands, [ladder('A', 'antiparallel', [2, 6], [15, 11])]);
    expect(p.orientation).toBe('antiparallel');
    expect(p.contacts.map((c) => [c.aResSeq, c.bResSeq])).toEqual([
      [2, 15],
      [3, 14],
      [4, 13],
      [5, 12],
      [6, 11],
    ]);
    expect(p.spacing).toBeGreaterThan(4.7);
  });

  it('orders a pair by strand index whichever side the ladder lists first', () => {
    const [p] = pairStrandsFromLadders(strands, [ladder('A', 'antiparallel', [11, 15], [6, 2])]);
    expect([p.a, p.b]).toEqual([0, 1]);
    expect(p.contacts[0]).toMatchObject({ aResSeq: 2, bResSeq: 15 });
  });

  it('pairs a bulged ladder end to end and pools ladders between the same strands', () => {
    const [p] = pairStrandsFromLadders(strands, [
      ladder('A', 'antiparallel', [1, 3], [16, 13]),
      ladder('B', 'antiparallel', [5, 6], [12, 11]),
    ]);
    expect(p.contacts.map((c) => [c.aResSeq, c.bResSeq])).toEqual([
      [1, 16],
      [2, 15],
      [3, 13],
      [5, 12],
      [6, 11],
    ]);
  });

  it('drops isolated bridges and ladders outside the strands', () => {
    expect(
      pairStrandsFromLadders(strands, [ladder('A', 'antiparallel', [3, 3], [14, 14])]),
    ).toEqual([]);
    expect(
      pairStrandsFromLadders(strands, [ladder('A', 'antiparallel', [20, 22], [14, 12])]),
    ).toEqual([]);
  });
});

describe('analyseBarrel with DSSP ladders', () => {
  it('uses the ladders when they pair the strands, else the Cα geometry', () => {
    const anti = twoStrands(4.8, true);
    const ladders = [ladder('A', 'antiparallel', [2, 6], [15, 11])];
    expect(analyseBarrel(anti.calphas, anti.segments, { ladders }).pairingSource).toBe('dssp');
    expect(analyseBarrel(anti.calphas, anti.segments).pairingSource).toBe('geometry');
    const stray = [ladder('A', 'antiparallel', [40, 44], [60, 56])];
    expect(analyseBarrel(anti.calphas, anti.segments, { ladders: stray }).pairingSource).toBe(
      'geometry',
    );
  });

  it("finds 2OMF's 16-strand barrel with shear 20 from its ladders", () => {
    const data = mergeProteinData(
      '2omf',
      parsePdb(OMF_PDB),
      parseDsspMmcif(OMF_DSSP),
      parseDsspLadders(OMF_DSSP),
    );
    const chain = data.chains[0];
    const a = analyseBarrel(chain.calphas, chain.segments, { ladders: chainLadders(chain) });
    expect(a.pairingSource).toBe('dssp');
    expect(a.cylindrical).toBe(true);
    expect(a.strandCount).toBe(16);
    // OmpF is a (16, 20) barrel; the Cα-geometry pairing gives 21.
    expect(Math.round(a.shear)).toBe(20);
  });

  it("finds 7AHL's 14-strand assembly barrel with shear 14 from the cross-chain ladders", () => {
    const data = mergeProteinData(
      '7ahl',
      parsePdb(AHL_PDB),
      parseDsspMmcif(AHL_DSSP),
      parseDsspLadders(AHL_DSSP),
    );
    const a = analyseAssemblyBarrel(data.chains);
    expect(a.pairingSource).toBe('dssp');
    expect(a.cylindrical).toBe(true);
    expect(a.strandCount).toBe(14);
    expect(Math.round(a.shear)).toBe(14);
    expect(new Set(a.ringOrder.map((i) => a.strands[i].chainId)).size).toBe(7);
  });
});
