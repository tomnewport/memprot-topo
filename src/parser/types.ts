import type { Calpha } from '../types.js';

export interface RawChain {
  chainId: string;
  residues: Set<string>;
  calphas: Calpha[];
}

export interface RawSSSegment {
  chainId: string;
  start: number;
  end: number;
  type: 'helix' | 'strand';
}
