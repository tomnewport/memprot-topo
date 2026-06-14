import type { Calpha, ChainData, SecondaryStructureSegment } from '../../../src/types.js';

export interface SyntheticBarrelOptions {
  /** Number of strands (even for a real TM barrel). @default 8 */
  n?: number;
  /** Residues per strand. @default 10 */
  strandLen?: number;
  /** Target inter-strand spacing in Å (sets the radius). @default 4.8 */
  interStrand?: number;
  /** Strand tilt to the barrel axis, degrees. @default 30 */
  tiltDeg?: number;
  /** Residues per connecting loop. @default 3 */
  loopLen?: number;
  /**
   * If set, the loop after this strand index is replaced by one that rises to a
   * short helix sitting high above the membrane (z ≈ `loopHelixZ`) before
   * descending — reproducing an extracellular loop helix (e.g. OmpF's), which
   * is a floating element that must not disturb strand packing.
   */
  loopHelixAfterStrand?: number;
  /** Height (Å) of the injected loop helix above the midplane. @default 28 */
  loopHelixZ?: number;
}

/**
 * Build an idealised antiparallel transmembrane β-barrel: `n` strands placed
 * around a cylinder (axis = z), alternating up/down, tilted by `tiltDeg`, and
 * joined by short loops. The first and last strands sit adjacent so the sheet
 * closes. Mirrors the parametric barrel the gallery uses for synthetic renders.
 */
export function syntheticBarrel(options: SyntheticBarrelOptions = {}): ChainData {
  const { n, strandLen, interStrand, tiltDeg, loopLen, loopHelixAfterStrand, loopHelixZ } = {
    n: 8,
    strandLen: 10,
    interStrand: 4.8,
    tiltDeg: 30,
    loopLen: 3,
    loopHelixAfterStrand: undefined as number | undefined,
    loopHelixZ: 28,
    ...options,
  };

  const calphas: Calpha[] = [];
  const segments: SecondaryStructureSegment[] = [];
  let resSeq = 1;
  const R = (n * interStrand) / (2 * Math.PI);
  const tilt = (tiltDeg * Math.PI) / 180;
  const dzAxis = 3.4 * Math.cos(tilt);
  const dzTang = 3.4 * Math.sin(tilt);

  for (let s = 0; s < n; s++) {
    const dir = s % 2 === 0 ? 1 : -1;
    const baseTheta = (s / n) * 2 * Math.PI;
    const start = resSeq;
    const strandCa: Calpha[] = [];
    for (let j = 0; j < strandLen; j++) {
      const centred = j - (strandLen - 1) / 2;
      const z = dir * centred * dzAxis;
      const theta = baseTheta + (dir * centred * dzTang) / R;
      const ca: Calpha = {
        resSeq: resSeq++,
        iCode: '',
        x: R * Math.cos(theta),
        y: R * Math.sin(theta),
        z,
      };
      strandCa.push(ca);
      calphas.push(ca);
    }
    segments.push({ start, end: resSeq - 1, type: 'strand' });

    if (s < n - 1) {
      const last = strandCa[strandCa.length - 1];
      const nextDir = (s + 1) % 2 === 0 ? 1 : -1;
      const nextBase = ((s + 1) / n) * 2 * Math.PI;
      const nextCentred = -(strandLen - 1) / 2;
      const nextZ = nextDir * nextCentred * dzAxis;
      const nextTheta = nextBase + (nextDir * nextCentred * dzTang) / R;
      const nx = R * Math.cos(nextTheta);
      const ny = R * Math.sin(nextTheta);

      if (s === loopHelixAfterStrand) {
        // Loop that rises to a short helix high above the membrane, then drops
        // to the next strand. The helix shares no z-overlap with the strands.
        // Risers/descenders keep every Cα–Cα step short so no chain break is
        // inferred.
        const mx = (last.x + nx) / 2;
        const my = (last.y + ny) / 2;
        const step = 3.5;

        const riserStart = resSeq;
        for (let z = last.z + step; z < loopHelixZ; z += step) {
          const t = (z - last.z) / (loopHelixZ - last.z);
          calphas.push({
            resSeq: resSeq++,
            iCode: '',
            x: last.x + (mx - last.x) * t,
            y: last.y + (my - last.y) * t,
            z,
          });
        }
        if (resSeq > riserStart)
          segments.push({ start: riserStart, end: resSeq - 1, type: 'coil' });

        const helixStart = resSeq;
        for (let j = 0; j < 6; j++) {
          calphas.push({
            resSeq: resSeq++,
            iCode: '',
            x: mx + Math.cos(j) * 1.5,
            y: my + Math.sin(j) * 1.5,
            z: loopHelixZ + j * 0.4,
          });
        }
        segments.push({ start: helixStart, end: resSeq - 1, type: 'helix' });
        const helixTopZ = loopHelixZ + 5 * 0.4;

        const descStart = resSeq;
        for (let z = helixTopZ - step; z > nextZ; z -= step) {
          const t = (helixTopZ - z) / (helixTopZ - nextZ);
          calphas.push({
            resSeq: resSeq++,
            iCode: '',
            x: mx + (nx - mx) * t,
            y: my + (ny - my) * t,
            z,
          });
        }
        if (resSeq > descStart) segments.push({ start: descStart, end: resSeq - 1, type: 'coil' });
        continue;
      }

      const loopStart = resSeq;
      for (let j = 0; j < loopLen; j++) {
        const t = (j + 1) / (loopLen + 1);
        const lift = Math.sin(t * Math.PI) * 6 * (last.z > 0 ? 1 : -1);
        calphas.push({
          resSeq: resSeq++,
          iCode: '',
          x: last.x + (nx - last.x) * t,
          y: last.y + (ny - last.y) * t,
          z: last.z + (nextZ - last.z) * t + lift,
        });
      }
      segments.push({ start: loopStart, end: resSeq - 1, type: 'coil' });
    }
  }

  return { chainId: 'A', residueCount: resSeq - 1, segments, calphas };
}
