import { describe, it, expect } from 'vitest';
import { unwrapBarrel } from '../../../src/unroll/barrel.js';
import { analyseBarrel } from '../../../src/contacts/beta-sheet.js';
import { syntheticBarrel } from '../fixtures/barrel.js';
import type { SecondaryStructureSegment } from '../../../src/types.js';

function strandSegs(segments: SecondaryStructureSegment[]): SecondaryStructureSegment[] {
  return segments.filter((s) => s.type === 'strand');
}

describe('unwrapBarrel', () => {
  it('returns an empty result for no Cα', () => {
    const r = unwrapBarrel([], { centre: { x: 0, y: 0 } });
    expect(r.segments).toHaveLength(0);
    expect(r.totalArcLength).toBe(0);
  });

  it('lays a closed barrel out as one continuous segment starting at arc 0', () => {
    const chain = syntheticBarrel();
    const { centre } = analyseBarrel(chain.calphas, chain.segments);
    const r = unwrapBarrel(chain.calphas, { ssSegments: chain.segments, centre });
    expect(r.segments).toHaveLength(1);
    const arcs = r.segments[0].samples.map((s) => s.arc);
    expect(Math.min(...arcs)).toBeCloseTo(0, 5);
    // Total arc spans roughly one circumference (n × inter-strand spacing).
    expect(r.totalArcLength).toBeGreaterThan(25);
  });

  it('renders every strand with the same slant — the parallel-strand guarantee', () => {
    // The whole point of the unwrap: antiparallel neighbours (one climbing, one
    // descending in z) must share a slant in the (arc, z) plot rather than
    // fanning into a chevron the way a cumulative-arc unroll would.
    const chain = syntheticBarrel({ n: 8, tiltDeg: 30 });
    const { centre } = analyseBarrel(chain.calphas, chain.segments);
    const r = unwrapBarrel(chain.calphas, { ssSegments: chain.segments, centre });
    const byRes = new Map(r.segments[0].residues.map((res) => [res.resSeq, res]));

    const slants = strandSegs(chain.segments).map((seg) => {
      const a = byRes.get(seg.start)!;
      const b = byRes.get(seg.end)!;
      return (b.arc - a.arc) / (b.z - a.z);
    });

    // All slopes equal (and non-zero): the strands are parallel and tilted.
    const first = slants[0];
    expect(Math.abs(first)).toBeGreaterThan(0.1);
    for (const s of slants) expect(s).toBeCloseTo(first, 1);
  });

  it('places consecutive strands at increasing arc (left-to-right around the barrel)', () => {
    const chain = syntheticBarrel();
    const { centre } = analyseBarrel(chain.calphas, chain.segments);
    const r = unwrapBarrel(chain.calphas, { ssSegments: chain.segments, centre });
    const byRes = new Map(r.segments[0].residues.map((res) => [res.resSeq, res]));

    // Mid-strand arc position per strand should increase monotonically.
    const mids = strandSegs(chain.segments).map((seg) => {
      const mid = Math.floor((seg.start + seg.end) / 2);
      return byRes.get(mid)!.arc;
    });
    for (let i = 1; i < mids.length; i++) expect(mids[i]).toBeGreaterThan(mids[i - 1]);
  });

  it('keeps every residue arc within the sample bounds', () => {
    const chain = syntheticBarrel();
    const { centre } = analyseBarrel(chain.calphas, chain.segments);
    const r = unwrapBarrel(chain.calphas, { ssSegments: chain.segments, centre });
    for (const seg of r.segments) {
      expect(seg.residues.length).toBe(chain.calphas.length);
      for (const res of seg.residues) {
        expect(res.sampleIndex).toBeGreaterThanOrEqual(0);
        expect(res.sampleIndex).toBeLessThan(seg.samples.length);
      }
    }
  });
});
