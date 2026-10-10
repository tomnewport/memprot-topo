import type { Calpha, ChainData } from '../../../src/types.js';
import { helixCalphas } from './distortions.js';

/** Loop residues `resSeqs` evenly between Cα `a` and `b`, bulging `bulge` Å further out in z. */
function bridge(a: Calpha, b: Calpha, resSeqs: number[], bulge: number): Calpha[] {
  const n = resSeqs.length + 1;
  return resSeqs.map((resSeq, i) => {
    const t = (i + 1) / n;
    return {
      resSeq,
      iCode: '',
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t + bulge * Math.sin(Math.PI * t),
    };
  });
}

/** Three TM helices joined by short loops, crossing the membrane up, down, up. */
export function threeHelixChain(): ChainData {
  const up1 = helixCalphas(0, 0, -18, 18, 1); // 1–25
  const down = helixCalphas(10, 0, -18, 18)
    .reverse()
    .map((ca, i) => ({ ...ca, resSeq: 29 + i })); // 29–53
  const up2 = helixCalphas(20, 0, -18, 18, 57); // 57–81
  const loop1 = bridge(up1[up1.length - 1], down[0], [26, 27, 28], 3);
  const loop2 = bridge(down[down.length - 1], up2[0], [54, 55, 56], -3);
  const calphas = [...up1, ...loop1, ...down, ...loop2, ...up2].map((c) => ({
    ...c,
    resName: 'ALA',
  }));
  return {
    chainId: 'A',
    residueCount: calphas.length,
    segments: [
      { start: 1, end: 25, type: 'helix' },
      { start: 29, end: 53, type: 'helix' },
      { start: 57, end: 81, type: 'helix' },
    ],
    calphas,
  };
}
