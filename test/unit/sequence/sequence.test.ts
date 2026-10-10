import { describe, expect, it } from 'vitest';
import {
  compactCentre,
  layoutSequence,
  residuesPerRow,
  rowPoint,
  SEQ,
} from '../../../src/sequence/layout.js';
import {
  EXPAND_END,
  pointAt,
  SequenceTransition,
  UNWRAP_END,
} from '../../../src/sequence/transition.js';
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

  const line = { x0: 40, x1: 360, y: 150 };

  it('is exactly the 2-D trace at progress 1', () => {
    const t = new SequenceTransition(trace, layout, line);
    for (const fr of t.frame(1)) {
      for (const p of fr.pts) {
        const q = pointAt(trace, p.f);
        expect(p.x).toBeCloseTo(q.x, 6);
        expect(p.y).toBeCloseTo(q.y, 6);
      }
    }
  });

  it('is exactly the rows at progress 0', () => {
    const t = new SequenceTransition(trace, layout, line);
    for (const fr of t.frame(0)) {
      for (const p of fr.pts) {
        const q = rowPoint(layout, fr.row, p.f);
        expect(p.x).toBeCloseTo(q.x, 6);
        expect(p.y).toBeCloseTo(q.y, 6);
      }
    }
  });

  it('first collapses the rows to the cartoon’s height, keeping x', () => {
    const t = new SequenceTransition(trace, layout, line);
    const at0 = t.frame(0);
    t.frame(EXPAND_END).forEach((fr, r) => {
      expect(fr.unwrap).toBe(0);
      fr.pts.forEach((p, j) => {
        expect(p.x).toBeCloseTo(at0[r].pts[j].x, 6);
        expect(p.y).toBeCloseTo(compactCentre(r), 6);
      });
      expect(t.rowShift(r, EXPAND_END)).toBeCloseTo(compactCentre(r) - at0[r].pts[0].y, 6);
      expect(t.rowShift(r, 0)).toBeCloseTo(0, 6);
    });
    expect(t.rowShift(99, 0.1)).toBeCloseTo(0, 6);
  });

  it('unwraps every row onto one line, in sequence order, before folding', () => {
    const t = new SequenceTransition(trace, layout, line);
    const pts = t.frame(UNWRAP_END).flatMap((fr) => fr.pts);
    for (const p of pts) expect(p.y).toBeCloseTo(line.y, 6);
    for (let k = 1; k < pts.length; k++)
      expect(pts[k].x).toBeGreaterThanOrEqual(pts[k - 1].x - 1e-9);
    expect(pts[0].x).toBeCloseTo(line.x0, 6);
    expect(pts[pts.length - 1].x).toBeCloseTo(line.x1, 6);
  });

  it('unwraps the first row first and folds from the left', () => {
    const t = new SequenceTransition(trace, layout, line);
    const mid = t.frame(UNWRAP_END / 2);
    expect(mid[0].unwrap).toBeGreaterThan(mid[1].unwrap);
    const u = UNWRAP_END + (1 - UNWRAP_END) / 2;
    expect(t.foldAt(u, 0)).toBeGreaterThan(t.foldAt(u, 29));
    for (const fr of t.frame(u))
      for (const p of fr.pts) expect(Number.isFinite(p.x + p.y)).toBe(true);
  });
});
