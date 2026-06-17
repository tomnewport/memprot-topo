import { describe, it, expect } from 'vitest';
import { TopologyDisplay } from '../../src/components/topology-display.js';
import { syntheticBarrel } from './fixtures/barrel.js';
import type { ChainData } from '../../src/types.js';

// Add per-atom jitter to a synthetic barrel to simulate the off-axis terminal
// Ca positions that occur in real proteins (pleat projection is only partial).
function jitter(chain: ChainData, amp: number): ChainData {
  let seed = 99173;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed / 0x7fffffff - 0.5) * 2 * amp;
  };
  return {
    ...chain,
    calphas: chain.calphas.map((c) => ({ ...c, x: c.x + rnd(), y: c.y + rnd(), z: c.z + rnd() })),
  };
}

// Count strands where the left shoulder is on the WRONG side of the body axis
// (i.e., the perpendicular has flipped). This is the geometry that produces the
// "270-degree turn" visual artifact: the polygon self-intersects at the base.
function flippedWingCount(el: TopologyDisplay): number {
  const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
  const polys = Array.from(svg!.querySelectorAll('polygon')).filter(
    (p) => p.getAttribute('fill') === '#6ea76d',
  );
  let flipped = 0;
  for (const poly of polys) {
    const pts = poly
      .getAttribute('points')!
      .trim()
      .split(/\s+/)
      .map((p) => p.split(',').map(Number));
    const n = pts.length;
    const arrowStart = (n - 5) >> 1;
    if (arrowStart < 1) continue;
    const bodyLastLeft = pts[arrowStart - 1];
    const leftShoulder = pts[arrowStart];
    const rightShoulder = pts[arrowStart + 4];
    const bodyLastRight = pts[n - arrowStart];
    const baseC = [
      (leftShoulder[0] + rightShoulder[0]) / 2,
      (leftShoulder[1] + rightShoulder[1]) / 2,
    ];
    const bodyC = [
      (bodyLastLeft[0] + bodyLastRight[0]) / 2,
      (bodyLastLeft[1] + bodyLastRight[1]) / 2,
    ];
    // Body-axis direction (body centre -> base centre), in arc/z plot space.
    const ax = baseC[0] - bodyC[0];
    const az = baseC[1] - bodyC[1];
    // Left shoulder offset from base centre.
    const lx = leftShoulder[0] - baseC[0];
    const lz = leftShoulder[1] - baseC[1];
    // 2-D cross product: positive means lhs is to the LEFT of the body direction
    // (correct), negative means it has flipped to the right (the bug).
    const cross = ax * lz - az * lx;
    if (cross >= 0) flipped++;
  }
  return flipped;
}

describe('arrowhead geometry', () => {
  it('wings are never flipped relative to the body axis under realistic Ca jitter', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    // 11-residue, 40-degree-tilt strands with 0.8 Angstrom rms jitter --
    // representative of real protein backbone deviation from the ideal strand
    // axis after pleat projection.
    el.proteinData = {
      pdbId: 'barl',
      chains: [jitter(syntheticBarrel({ n: 16, tiltDeg: 40, strandLen: 11 }), 0.8)],
    };
    expect(flippedWingCount(el)).toBe(0);
    el.remove();
  });
});
