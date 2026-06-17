/**
 * Compact Cα-only secondary-structure assignment (THROWAWAY — Phase 0 spike).
 *
 * The OPM-processed PDBs carry unreliable HELIX/SHEET records, and the pdb-redo
 * DSSP endpoint is blocked in this environment, so the spike derives SS straight
 * from the Cα geometry. This is a simplified P-SEA-style classifier (Labesse et
 * al. 1997): α-helices are compact (small Cα(i)→Cα(i+3/＋4) distances), β-strands
 * are extended (large ones). Good enough to colour the morph; production uses
 * real DSSP.
 */
import type { Calpha, SecondaryStructureSegment } from '../types.js';

function dist(a: Calpha, b: Calpha): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Per-residue raw label from local Cα compactness. */
function rawLabel(ca: Calpha[], i: number): 'helix' | 'strand' | 'coil' {
  const n = ca.length;
  if (i < 2 || i + 4 >= n) return 'coil';
  const d3 = dist(ca[i], ca[i + 3]);
  const d4 = dist(ca[i], ca[i + 4]);
  if (d3 >= 4.5 && d3 <= 6.1 && d4 >= 5.0 && d4 <= 7.2) return 'helix';
  if (d3 >= 8.5 && d3 <= 11.2 && d4 >= 11.0 && d4 <= 15.0) return 'strand';
  return 'coil';
}

/**
 * Assign SS segments for one chain from Cα geometry. Smooths the raw per-residue
 * labels into runs and drops runs shorter than the minimum length for their
 * type (helix ≥ 5, strand ≥ 3).
 */
export function assignCaSecondaryStructure(ca: Calpha[]): SecondaryStructureSegment[] {
  const n = ca.length;
  if (n < 6) return [];
  const labels: ('helix' | 'strand' | 'coil')[] = ca.map((_, i) => rawLabel(ca, i));

  // The (i+3)/(i+4) probes label the START of a motif; extend each helix/strand
  // label forward by 3 residues so the run covers the whole element.
  const extended = labels.slice();
  for (let i = 0; i < n; i++) {
    if (labels[i] === 'coil') continue;
    for (let j = i + 1; j <= i + 3 && j < n; j++) {
      if (extended[j] === 'coil') extended[j] = labels[i];
    }
  }

  // Group into runs, dropping short ones.
  const minLen = { helix: 5, strand: 3, coil: 1 } as const;
  const segments: SecondaryStructureSegment[] = [];
  let start = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || extended[i] !== extended[start]) {
      const type = extended[start];
      const len = i - start;
      if (type !== 'coil' && len >= minLen[type]) {
        segments.push({ start: ca[start].resSeq, end: ca[i - 1].resSeq, type });
      }
      start = i;
    }
  }
  return segments;
}
