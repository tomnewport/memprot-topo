export interface RawChain {
  chainId: string;
  residues: Set<string>;
}

export interface RawSSSegment {
  chainId: string;
  start: number;
  end: number;
  type: 'helix' | 'strand';
}
