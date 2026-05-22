export interface RawChain {
  chainId: string;
  residues: Set<number>;
}

export interface RawSSSegment {
  chainId: string;
  start: number;
  end: number;
  type: 'helix' | 'strand';
}
