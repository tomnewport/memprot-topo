import type { ChainData, SecondaryStructureSegment, SecondaryStructureType } from '../types.js';

export interface SsMinLengths {
  helix: number;
  strand: number;
}

/** Drop helix/strand assignments shorter than `min` so they read as coil. */
export function effectiveSsSegments(
  segments: SecondaryStructureSegment[],
  min: SsMinLengths,
): SecondaryStructureSegment[] {
  return segments.filter((s) => s.type === 'coil' || s.end - s.start + 1 >= min[s.type]);
}

export function isBetaBarrel(chain: ChainData): boolean {
  let helixRes = 0,
    strandRes = 0;
  for (const seg of chain.segments) {
    const len = seg.end - seg.start + 1;
    if (seg.type === 'helix') helixRes += len;
    else if (seg.type === 'strand') strandRes += len;
  }
  return strandRes > helixRes && strandRes > 0;
}

export function ssTypeAt(
  segments: SecondaryStructureSegment[],
  resSeq: number,
): SecondaryStructureType {
  for (const s of segments) {
    if (resSeq >= s.start && resSeq <= s.end) return s.type;
  }
  return 'coil';
}

export interface SsRun {
  type: SecondaryStructureType;
  /** Sample indices defining the polygon body (may extend to the start of the next run). */
  startSample: number;
  endSample: number;
  /** Actual first and last residue numbers of this run. */
  startResSeq: number;
  endResSeq: number;
  /** Sample index of the actual last residue (used for label placement). */
  endResSampleIdx: number;
  /** Index of the first residue in this run within the parent `residues` array. */
  residueStart: number;
  /** Index of the last residue in this run within the parent `residues` array. */
  residueEnd: number;
}

/** Group consecutive residue indices that share the same SS type into runs. */
export function runsBySs(
  residues: { resSeq: number; sampleIndex: number }[],
  segments: SecondaryStructureSegment[],
): SsRun[] {
  if (residues.length === 0) return [];
  const runs: SsRun[] = [];
  let runType = ssTypeAt(segments, residues[0].resSeq);
  let runStartSample = residues[0].sampleIndex;
  let runStartResIdx = 0;

  for (let i = 1; i < residues.length; i++) {
    const t = ssTypeAt(segments, residues[i].resSeq);
    if (t !== runType) {
      runs.push({
        type: runType,
        startSample: runStartSample,
        endSample: residues[i].sampleIndex,
        startResSeq: residues[runStartResIdx].resSeq,
        endResSeq: residues[i - 1].resSeq,
        endResSampleIdx: residues[i - 1].sampleIndex,
        residueStart: runStartResIdx,
        residueEnd: i - 1,
      });
      runType = t;
      runStartSample = residues[i].sampleIndex;
      runStartResIdx = i;
    }
  }
  const lastIdx = residues.length - 1;
  runs.push({
    type: runType,
    startSample: runStartSample,
    endSample: residues[lastIdx].sampleIndex,
    startResSeq: residues[runStartResIdx].resSeq,
    endResSeq: residues[lastIdx].resSeq,
    endResSampleIdx: residues[lastIdx].sampleIndex,
    residueStart: runStartResIdx,
    residueEnd: lastIdx,
  });
  return runs;
}

export function isSs(run: SsRun | undefined): run is SsRun {
  return !!run && (run.type === 'helix' || run.type === 'strand');
}

export function lastSsRunOf(layout: { runs: SsRun[] }): SsRun | null {
  for (let i = layout.runs.length - 1; i >= 0; i--) {
    if (isSs(layout.runs[i])) return layout.runs[i];
  }
  return null;
}

export function firstSsRunOf(layout: { runs: SsRun[] }): SsRun | null {
  for (const run of layout.runs) {
    if (isSs(run)) return run;
  }
  return null;
}
