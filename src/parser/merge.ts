import type { BetaLadder, ProteinData, ChainData, SecondaryStructureSegment } from '../types.js';
import type { RawChain, RawSSSegment } from './types.js';

export function mergeProteinData(
  pdbId: string,
  chains: RawChain[],
  ssSegments: RawSSSegment[],
  /** DSSP β-ladders (`parseDsspLadders`); each chain keeps those touching it. */
  ladders: BetaLadder[] = [],
): ProteinData {
  const result: ChainData[] = chains.map((chain) => {
    const chainSegments = ssSegments
      .filter((s) => s.chainId === chain.chainId)
      .map((s): SecondaryStructureSegment => ({ start: s.start, end: s.end, type: s.type }))
      .sort((a, b) => a.start - b.start);

    const chainLadders = ladders.filter(
      (l) => l.a.start.chainId === chain.chainId || l.b.start.chainId === chain.chainId,
    );

    return {
      chainId: chain.chainId,
      residueCount: chain.residues.size,
      segments: chainSegments,
      calphas: chain.calphas,
      ...(chainLadders.length > 0 ? { ladders: chainLadders } : {}),
    };
  });

  return { pdbId, chains: result };
}
