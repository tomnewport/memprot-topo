export type SecondaryStructureType = 'helix' | 'strand' | 'coil';

export interface SecondaryStructureSegment {
  start: number;
  end: number;
  type: SecondaryStructureType;
}

export interface Calpha {
  resSeq: number;
  iCode: string;
  /** Residue name as given in the structure file (e.g. `ALA`), when known. */
  resName?: string;
  x: number;
  y: number;
  z: number;
}

export interface ChainData {
  chainId: string;
  residueCount: number;
  segments: SecondaryStructureSegment[];
  calphas: Calpha[];
}

export interface ProteinData {
  pdbId: string;
  chains: ChainData[];
}
