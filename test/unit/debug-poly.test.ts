import { describe, it } from 'vitest';
import { TopologyDisplay } from '../../src/components/topology-display.js';
import { syntheticBarrel } from './fixtures/barrel.js';

describe('debug polygon', () => {
  it('prints arrowhead vertices for n=16 barrel (2omf-like)', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    // 2omf has 16 strands per monomer, tilted ~40 degrees
    el.proteinData = {
      pdbId: 'barl',
      chains: [syntheticBarrel({ n: 16, tiltDeg: 40, strandLen: 16 })],
    };

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    const polys = Array.from(svg!.querySelectorAll('polygon')).filter(
      (p) => p.getAttribute('fill') === '#6ea76d',
    );

    for (let i = 0; i < Math.min(4, polys.length); i++) {
      const pts = polys[i]
        .getAttribute('points')!
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map(Number));
      const n = pts.length;
      const arrowStart = (n - 5) >> 1; // bodyLast + 1 is arrowStart
      console.log(`Strand ${i}: ${n} vertices, arrowhead at [${arrowStart}..${arrowStart + 4}]`);
      // Print last 2 body vertices, all 5 arrowhead cap vertices, first 2 body-right vertices
      for (let j = arrowStart - 2; j <= arrowStart + 6; j++) {
        if (j < 0 || j >= n) continue;
        const v = pts[j];
        const labels: Record<number, string> = {
          [arrowStart]: '← left shoulder',
          [arrowStart + 1]: '← left wing',
          [arrowStart + 2]: '← TIP',
          [arrowStart + 3]: '← right wing',
          [arrowStart + 4]: '← right shoulder',
          [arrowStart + 5]: '← body right (bodyLast)',
        };
        const label = labels[j] ?? '';
        console.log(`  [${j}] arc=${v[0].toFixed(3)}, z=${v[1].toFixed(3)}${label}`);
      }

      // Check if arrowhead is self-intersecting by checking wing positions vs body
      const bodyLastLeft = pts[arrowStart - 1];
      const leftShoulder = pts[arrowStart];
      const leftWing = pts[arrowStart + 1];
      const tip = pts[arrowStart + 2];
      const bodyLastRight = pts[arrowStart + 5];

      // The TIP should be "further along" the strand direction from the base
      // Check by seeing if the strand direction from base is consistent with tip
      const bodyCenter_arc = (bodyLastLeft[0] + bodyLastRight[0]) / 2;
      const bodyCenter_z = (bodyLastLeft[1] + bodyLastRight[1]) / 2;
      console.log(
        `  Body center at bodyLast: arc=${bodyCenter_arc.toFixed(3)}, z=${bodyCenter_z.toFixed(3)}`,
      );
      console.log(`  TIP: arc=${tip[0].toFixed(3)}, z=${tip[1].toFixed(3)}`);
      console.log(
        `  Left-shoulder to left-wing delta: darc=${(leftWing[0] - leftShoulder[0]).toFixed(3)}, dz=${(leftWing[1] - leftShoulder[1]).toFixed(3)}`,
      );
      console.log(
        `  Left-wing to TIP delta: darc=${(tip[0] - leftWing[0]).toFixed(3)}, dz=${(tip[1] - leftWing[1]).toFixed(3)}`,
      );
      console.log();
    }

    el.remove();
  });
});
