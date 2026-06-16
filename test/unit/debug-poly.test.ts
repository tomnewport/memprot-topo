import { describe, it, expect } from 'vitest';
import { TopologyDisplay } from '../../src/components/topology-display.js';
import { syntheticBarrel } from './fixtures/barrel.js';
import type { ChainData } from '../../src/types.js';

// Add per-atom jitter to a synthetic barrel to simulate the off-axis terminal
// Cα positions that occur in real proteins (β-pleat projection is only partial).
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

// Measure the angle between the body axis (body-last -> arrowhead base) and the
// arrowhead axis (base -> apex). A well-formed arrowhead has this close to 0 degrees.
function maxApexSkewDeg(el: TopologyDisplay): number {
  const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
  const polys = Array.from(svg!.querySelectorAll('polygon')).filter(
    (p) => p.getAttribute('fill') === '#6ea76d',
  );
  let worst = 0;
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
    const tip = pts[arrowStart + 2];
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
    const ax = baseC[0] - bodyC[0];
    const az = baseC[1] - bodyC[1];
    const aLen = Math.hypot(ax, az) || 1;
    const tx = tip[0] - baseC[0];
    const tz = tip[1] - baseC[1];
    const tLen = Math.hypot(tx, tz) || 1;
    const cos = (ax * tx + az * tz) / (aLen * tLen);
    const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (deg > worst) worst = deg;
  }
  return worst;
}

describe('arrowhead geometry', () => {
  it('apex stays aligned with the body axis under realistic Ca jitter', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    // 11-residue, 40 degree-tilt strands with 0.8 A rms jitter -- matches real
    // protein backbone deviation from the ideal strand axis after pleat projection.
    el.proteinData = {
      pdbId: 'barl',
      chains: [jitter(syntheticBarrel({ n: 16, tiltDeg: 40, strandLen: 11 }), 0.8)],
    };
    const skew = maxApexSkewDeg(el);
    expect(skew).toBeLessThan(2);
    el.remove();
  });
});
