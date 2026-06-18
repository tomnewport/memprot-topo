import { describe, it, expect } from 'vitest';
import { buildScene } from '../../../src/scene/build.js';
import { syntheticBarrel } from '../fixtures/barrel.js';
import type { Calpha, ChainData, SecondaryStructureSegment } from '../../../src/types.js';

/**
 * A synthetic two-helix-hairpin chain: helix down→up across the membrane, a loop
 * over the top, then helix back. Coordinates need only be contiguous (Cα–Cα <
 * 5.5 Å) and span the membrane; SS type drives the run splitting.
 */
function hairpinChain(): ChainData {
  const calphas: Calpha[] = [];
  let resSeq = 1;
  const push = (x: number, y: number, z: number): void => {
    calphas.push({ resSeq: resSeq++, iCode: '', x, y, z });
  };
  // Helix 1: z −15 → +15 over 12 residues, gentle x drift + small spiral.
  for (let i = 0; i < 12; i++) {
    const t = i;
    push(2 + t * 0.4 + Math.cos(t) * 0.6, Math.sin(t) * 0.6, -15 + t * 2.7);
  }
  // Loop over the top: 6 residues arcing in x, z bulging above the bilayer.
  for (let i = 0; i < 6; i++) {
    push(7 + i * 1.4, 0, 15 + Math.sin((i / 5) * Math.PI) * 4);
  }
  // Helix 2: z +15 → −15 over 12 residues.
  for (let i = 0; i < 12; i++) {
    const t = i;
    push(16 + t * 0.4 + Math.cos(t) * 0.6, Math.sin(t) * 0.6, 15 - t * 2.7);
  }
  const segments: SecondaryStructureSegment[] = [
    { start: 1, end: 12, type: 'helix' },
    { start: 19, end: 30, type: 'helix' },
  ];
  return { chainId: 'A', residueCount: calphas.length, segments, calphas };
}

describe('buildScene (plain/helical path)', () => {
  const scene = buildScene(hairpinChain());

  it('reports the chain and a helical kind', () => {
    expect(scene.chainId).toBe('A');
    expect(scene.kind).toBe('helical');
    expect(scene.membrane.half).toBe(15);
    expect(scene.arcSpan).toBeGreaterThan(0);
  });

  it('emits two helix elements and at least one loop', () => {
    const helices = scene.elements.filter((e) => e.type === 'helix');
    const loops = scene.elements.filter((e) => e.type === 'loop');
    expect(helices).toHaveLength(2);
    expect(loops.length).toBeGreaterThanOrEqual(1);
    expect(scene.meta.helices).toBe(2);
    expect(scene.meta.strands).toBe(0);
  });

  it('every sample carries a finite flat and 3-D position', () => {
    for (const el of scene.elements) {
      expect(el.samples.length).toBeGreaterThanOrEqual(2);
      for (const s of el.samples) {
        expect(Number.isFinite(s.arc)).toBe(true);
        expect(Number.isFinite(s.z)).toBe(true);
        for (const k of ['x', 'y', 'z'] as const) expect(Number.isFinite(s.pos3d[k])).toBe(true);
        // pos3d.z is the real membrane depth, i.e. equals the flat z.
        expect(s.pos3d.z).toBeCloseTo(s.z, 6);
      }
    }
  });

  it('retains real in-plane 3-D coords (not collapsed to the origin)', () => {
    const helix = scene.elements.find((e) => e.type === 'helix')!;
    const spread = helix.samples.some((s) => Math.abs(s.pos3d.x) > 1 || Math.abs(s.pos3d.y) > 0.1);
    expect(spread).toBe(true);
  });

  it('arc is non-decreasing within each element', () => {
    for (const el of scene.elements) {
      for (let i = 1; i < el.samples.length; i++) {
        expect(el.samples[i].arc).toBeGreaterThanOrEqual(el.samples[i - 1].arc - 1e-6);
      }
    }
  });

  it('residue sampleIndex is re-based into its own element', () => {
    for (const el of scene.elements) {
      for (const r of el.residues) {
        expect(r.sampleIndex).toBeGreaterThanOrEqual(0);
        expect(r.sampleIndex).toBeLessThan(el.samples.length);
      }
    }
  });

  it('exposes shared style dimensions for both renderers', () => {
    expect(scene.style.ribbonHalfWidth).toBeGreaterThan(0);
    expect(scene.style.helixRadius).toBeGreaterThan(0);
    expect(scene.style.ribbonArrowLen).toBeGreaterThan(0);
  });
});

describe('buildScene (β-barrel path)', () => {
  const n = 8;
  const interStrand = 4.8;
  const scene = buildScene(syntheticBarrel({ n, strandLen: 10, interStrand }));

  it('classifies the chain as a barrel with ring metadata', () => {
    expect(scene.kind).toBe('barrel');
    expect(scene.meta.strandCount).toBe(n);
    expect(Number.isFinite(scene.meta.tiltDeg!)).toBe(true);
  });

  it('emits the wall strands as strand elements', () => {
    const strands = scene.elements.filter((e) => e.type === 'strand');
    expect(strands.length).toBe(n);
  });

  it('rolls up honestly: strand 3-D positions lie on the barrel radius', () => {
    const R = (n * interStrand) / (2 * Math.PI);
    const strand = scene.elements.find((e) => e.type === 'strand')!;
    // De-spiralled strand Cα sit ~on the cylinder of radius R about the axis.
    const radii = strand.samples.map((s) => Math.hypot(s.pos3d.x, s.pos3d.y));
    const mean = radii.reduce((a, b) => a + b, 0) / radii.length;
    expect(mean).toBeGreaterThan(R * 0.6);
    expect(mean).toBeLessThan(R * 1.4);
  });

  it('every barrel sample carries a finite 3-D position', () => {
    for (const el of scene.elements) {
      for (const s of el.samples) {
        for (const k of ['x', 'y', 'z'] as const) expect(Number.isFinite(s.pos3d[k])).toBe(true);
      }
    }
  });

  it('resolves β-sheet contact ties with finite flat and 3-D endpoints', () => {
    expect(scene.contacts.length).toBeGreaterThan(0);
    for (const c of scene.contacts) {
      for (const end of [c.a, c.b]) {
        expect(Number.isFinite(end.arc)).toBe(true);
        expect(Number.isFinite(end.z)).toBe(true);
        for (const k of ['x', 'y', 'z'] as const) expect(Number.isFinite(end.pos3d[k])).toBe(true);
      }
    }
  });
});
