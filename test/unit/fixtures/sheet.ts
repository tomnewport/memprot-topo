import type { Calpha, ChainData } from '../../../src/types.js';
import { helixCalphas } from './distortions.js';

export interface SheetChainOptions {
  /** `flat`: the sheet lies in the membrane plane above it; `upright`: it stands across it. */
  plane: 'flat' | 'upright';
}

/**
 * A TM helix (1–25) followed by an open three-stranded antiparallel sheet
 * (strands 30–36, 39–45, 48–54, joined by two-residue turns), 4.8 Å between
 * strands, either lying flat 25 Å above the midplane or standing upright
 * beside the helix with its strands tilted 30° from the membrane normal.
 */
export function helixAndSheetChain({ plane }: SheetChainOptions): ChainData {
  const helix = helixCalphas(0, 0, -18, 18, 1);
  const tilt = (30 * Math.PI) / 180;
  // Point i along strand k, in the sheet's own (along, across) frame.
  const at = (along: number, across: number): Omit<Calpha, 'resSeq' | 'iCode'> =>
    plane === 'flat'
      ? { x: 15 + along, y: across, z: 25 }
      : {
          x: 15 + across + along * Math.sin(tilt),
          y: 0,
          z: along * Math.cos(tilt),
        };
  const calphas: Calpha[] = [...helix];
  const strandStarts = [30, 39, 48];
  for (let k = 0; k < 3; k++) {
    const dir = k % 2 === 0 ? 1 : -1;
    for (let i = 0; i < 7; i++) {
      const along = dir * (i - 3) * 3.3;
      calphas.push({ resSeq: strandStarts[k] + i, iCode: '', ...at(along, k * 4.8) });
    }
    if (k < 2) {
      const end = dir * 3 * 3.3 + dir * 2;
      for (let j = 0; j < 2; j++) {
        calphas.push({
          resSeq: strandStarts[k] + 7 + j,
          iCode: '',
          ...at(end, k * 4.8 + 1.6 + j * 1.6),
        });
      }
    }
  }
  // Loop 26–29 from the helix top to the first strand.
  const top = helix[helix.length - 1];
  const first = calphas.find((c) => c.resSeq === 30)!;
  for (let j = 0; j < 4; j++) {
    const t = (j + 1) / 5;
    calphas.push({
      resSeq: 26 + j,
      iCode: '',
      x: top.x + (first.x - top.x) * t,
      y: top.y + (first.y - top.y) * t,
      z: top.z + (first.z - top.z) * t,
    });
  }
  calphas.sort((a, b) => a.resSeq - b.resSeq);
  return {
    chainId: 'A',
    residueCount: calphas.length,
    segments: [
      { start: 1, end: 25, type: 'helix' },
      { start: 30, end: 36, type: 'strand' },
      { start: 39, end: 45, type: 'strand' },
      { start: 48, end: 54, type: 'strand' },
    ],
    calphas: calphas.map((c) => ({ ...c, resName: 'ALA' })),
  };
}
