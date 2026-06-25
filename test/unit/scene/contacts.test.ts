import { describe, it, expect } from 'vitest';
import { contactLines, type ContactLayout } from '../../../src/scene/geometry/contacts.js';
import type { BarrelAnalysis } from '../../../src/contacts/index.js';

/** Minimal analysis stub: two ring strands (0,1) paired, one off-ring strand (2). */
function analysisStub(): BarrelAnalysis {
  return {
    strands: [],
    pairings: [
      { a: 0, b: 1, contacts: [{ aResSeq: 10, bResSeq: 20 }] },
      // pairing touching off-ring strand 2 — must be skipped.
      { a: 1, b: 2, contacts: [{ aResSeq: 21, bResSeq: 30 }] },
    ],
    closed: true,
    ringOrder: [0, 1],
    strandCount: 2,
    shear: 0,
    tiltDeg: 0,
    axis: { x: 0, y: 0, z: 1 },
    centre: { x: 0, y: 0, z: 0 },
    radius: 5,
    cylindrical: true,
  } as unknown as BarrelAnalysis;
}

const layouts: ContactLayout[] = [
  {
    residues: [
      { resSeq: 10, arc: 1, z: 2 },
      { resSeq: 20, arc: 8, z: 3 },
      { resSeq: 21, arc: 9, z: 3 },
      { resSeq: 30, arc: 40, z: 1 },
    ],
  },
];

describe('contactLines', () => {
  it('ties only ring↔ring pairings and resolves endpoint (arc,z)', () => {
    const lines = contactLines(analysisStub(), layouts);
    expect(lines).toHaveLength(1); // the 1↔2 pairing is skipped (2 off-ring)
    expect(lines[0].a).toMatchObject({ resSeq: 10, arc: 1, z: 2 });
    expect(lines[0].b).toMatchObject({ resSeq: 20, arc: 8, z: 3 });
  });

  it('skips contacts whose residues are absent from the layout', () => {
    const sparse: ContactLayout[] = [{ residues: [{ resSeq: 10, arc: 1, z: 2 }] }];
    expect(contactLines(analysisStub(), sparse)).toHaveLength(0);
  });
});
