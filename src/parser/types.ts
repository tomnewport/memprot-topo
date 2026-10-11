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

/** A residue's backbone atoms, as far as the file has them. */
export interface BackboneResidue {
  resSeq: number;
  iCode: string;
  resName: string;
  n?: { x: number; y: number; z: number };
  ca?: { x: number; y: number; z: number };
  c?: { x: number; y: number; z: number };
  o?: { x: number; y: number; z: number };
}

export interface BackboneChain {
  chainId: string;
  /** Residues in file order. */
  residues: BackboneResidue[];
}
