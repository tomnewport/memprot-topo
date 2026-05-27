import { describe, it, expect } from 'vitest';
import { projectHelixAxis } from '../../../src/unroll/helix-axis.js';
import type { Vec } from '../../../src/unroll/catmull-rom.js';

const DEG = Math.PI / 180;

/**
 * Generate ideal alpha-helix Cα positions around z-axis:
 *   radius ≈ 2.3 Å, rise ≈ 1.5 Å/residue, twist ≈ 100°/residue.
 */
function helixCa(n: number, radius = 2.3, rise = 1.5, twist = 100): Vec[] {
  return Array.from({ length: n }, (_, i) => ({
    x: radius * Math.cos(i * twist * DEG),
    y: radius * Math.sin(i * twist * DEG),
    z: i * rise,
  }));
}

describe('projectHelixAxis', () => {
  it('returns unchanged positions for non-helix residues', () => {
    const pts: Vec[] = [
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
    ];
    const result = projectHelixAxis(pts, [false, false]);
    expect(result[0]).toMatchObject({ x: 1, y: 2, z: 3 });
    expect(result[1]).toMatchObject({ x: 4, y: 5, z: 6 });
  });

  it('projects helix Cα close to the helix axis (xy near 0)', () => {
    const n = 20;
    const pts = helixCa(n);
    const isHelix = new Array(n).fill(true);
    const result = projectHelixAxis(pts, isHelix);

    // All residues project well inside the original 2.3 Å helix radius.
    for (let i = 0; i < n; i++) {
      const r = Math.sqrt(result[i].x ** 2 + result[i].y ** 2);
      // Boundary residues have smaller windows (fewer turns → larger centroid
      // error); interior residues have near-zero error.  1.0 Å is well within
      // the original 2.3 Å radius in all cases.
      expect(r).toBeLessThan(1.0);
    }
  });

  it('preserves z ordering: projected z values are monotonically increasing', () => {
    const n = 20;
    const pts = helixCa(n);
    const isHelix = new Array(n).fill(true);
    const result = projectHelixAxis(pts, isHelix);

    for (let i = 1; i < n; i++) {
      expect(result[i].z).toBeGreaterThan(result[i - 1].z);
    }
  });

  it('leaves fewer than 3-point windows unchanged', () => {
    // Single helix residue surrounded by coil — window has only 1 helix point.
    const pts: Vec[] = [
      { x: 0, y: 0, z: 0 },
      { x: 2.3, y: 0, z: 1.5 }, // helix
      { x: 0, y: 0, z: 3 },
    ];
    const isHelix = [false, true, false];
    const result = projectHelixAxis(pts, isHelix, 4);
    // Only 1 helix point in window — should not project, keep original.
    expect(result[1]).toMatchObject({ x: 2.3, y: 0, z: 1.5 });
  });

  it('reduces high-frequency xy variation within a helix', () => {
    // Before: Ca spiral wildly in xy.  After: projected points cluster near axis.
    const n = 24;
    const pts = helixCa(n);
    const isHelix = new Array(n).fill(true);

    const xyVarBefore = pts.reduce((sum, p) => sum + p.x ** 2 + p.y ** 2, 0) / n;

    const result = projectHelixAxis(pts, isHelix);
    const xyVarAfter = result.reduce((sum, p) => sum + p.x ** 2 + p.y ** 2, 0) / n;

    expect(xyVarAfter).toBeLessThan(xyVarBefore * 0.05); // >95% reduction
  });

  it('does not project coil residues flanking a helix', () => {
    const helixPts = helixCa(16);
    const pts: Vec[] = [
      { x: 10, y: 10, z: -5 }, // coil before
      ...helixPts,
      { x: 20, y: 20, z: 30 }, // coil after
    ];
    const isHelix = [false, ...new Array(16).fill(true), false];
    const result = projectHelixAxis(pts, isHelix);

    expect(result[0]).toMatchObject({ x: 10, y: 10, z: -5 });
    expect(result[result.length - 1]).toMatchObject({ x: 20, y: 20, z: 30 });
  });
});
