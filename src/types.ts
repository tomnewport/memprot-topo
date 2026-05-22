export type SecondaryStructureType = 'helix' | 'strand' | 'coil';

export interface SecondaryStructureSegment {
  start: number;
  end: number;
  type: SecondaryStructureType;
}

export interface ChainData {
  chainId: string;
  residueCount: number;
  segments: SecondaryStructureSegment[];
}

export interface ProteinData {
  pdbId: string;
  chains: ChainData[];
}
