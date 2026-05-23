import type { ProteinData, ChainData, SecondaryStructureSegment } from '../types.js';
import type { RawChain, RawSSSegment } from './types.js';

export function mergeProteinData(
  pdbId: string,
  chains: RawChain[],
  ssSegments: RawSSSegment[],
): ProteinData {
  const result: ChainData[] = chains.map((chain) => {
    const chainSegments = ssSegments
      .filter((s) => s.chainId === chain.chainId)
      .map((s): SecondaryStructureSegment => ({ start: s.start, end: s.end, type: s.type }))
      .sort((a, b) => a.start - b.start);

    return {
      chainId: chain.chainId,
      residueCount: chain.residues.size,
      segments: chainSegments,
      calphas: chain.calphas,
    };
  });

  return { pdbId, chains: result };
}
