import { describe, expect, it } from 'vitest';
import { layoutSequence, residuesPerRow, rowPoint, SEQ } from '../../../src/sequence/layout.js';
import { pointAt, SequenceTransition } from '../../../src/sequence/transition.js';
import { oneLetter } from '../../../src/sequence/amino-acids.js';
import type { TracePoint } from '../../../src/sequence/types.js';

describe('sequence layout', () => {
  it('fits whole ten-residue blocks to the width', () => {
    const block = SEQ.blockSize * SEQ.cellPx + SEQ.blockGapPx;
    const width = SEQ.gutterLeftPx + SEQ.gutterRightPx + 3 * block - SEQ.blockGapPx;
    expect(residuesPerRow(width, null)).toBe(30);
    expect(residuesPerRow(width - 1, null)).toBe(20);
    expect(residuesPerRow(10, null)).toBe(10);
    expect(residuesPerRow(width, 25)).toBe(25);
  });

  it('wraps residues into rows with a gap between blocks', () => {
    const l = layoutSequence(25, 20, 1);
    expect(l.rows.map((r) => [r.first, r.last])).toEqual([
      [0, 19],
      [20, 24],
    ]);
    expect(l.x[1] - l.x[0]).toBe(SEQ.cellPx);
    expect(l.x[10] - l.x[9]).toBe(SEQ.cellPx + SEQ.blockGapPx);
    expect(l.x[20]).toBe(l.x[0]);
    expect(l.rows[1].y).toBeGreaterThan(l.rows[0].y);
  });
});

describe('one-letter codes', () => {
  it('maps standard and modified residues', () => {
    expect(oneLetter('ALA')).toBe('A');
    expect(oneLetter('MSE')).toBe('M');
    expect(oneLetter('HOH')).toBe('X');
    expect(oneLetter(undefined)).toBe('X');
  });
});

describe('sequence ↔ topology transition', () => {
  // A zig-zag (helix up, loop, helix down) over 30 residues, densely sampled.
  const trace: TracePoint[] = [];
  for (let k = 0; k <= 290; k++) {
    const f = k / 10;
    const x = 100 + f * 4;
    const y = 200 - 120 * Math.abs(Math.sin((f / 30) * Math.PI * 1.5));
    trace.push({ x, y, f });
  }
  const layout = layoutSequence(30, 20, 0, 400);

  it('is exactly the 2-D trace at progress 1', () => {
    const t = new SequenceTransition(trace, layout);
    for (const fr of t.frame(1, 0.5)) {
      for (const p of fr.pts) {
        const q = pointAt(trace, p.f);
        expect(p.x).toBeCloseTo(q.x, 6);
        expect(p.y).toBeCloseTo(q.y, 6);
      }
    }
  });

  it('is exactly the rows at progress 0', () => {
    const t = new SequenceTransition(trace, layout);
    for (const fr of t.frame(0, 0.5)) {
      for (const p of fr.pts) {
        const q = rowPoint(layout, fr.row, p.f);
        expect(p.x).toBeCloseTo(q.x, 6);
        expect(p.y).toBeCloseTo(q.y, 6);
      }
    }
  });

  it('keeps every frame finite and staggers the rows', () => {
    const t = new SequenceTransition(trace, layout);
    const mid = t.frame(0.4, 0.5);
    expect(mid[0].e).toBeGreaterThan(mid[1].e);
    for (const fr of mid) for (const p of fr.pts) expect(Number.isFinite(p.x + p.y)).toBe(true);
  });
});
