export interface CAResidue {
  /** Author-assigned residue number (PDB column 23–26). */
  resSeq: number;
  /** Insertion code (PDB column 27), empty string when absent. */
  iCode: string;
  /** Cartesian Cα coordinates in Ångström, as found in the structure file. */
  x: number;
  y: number;
  z: number;
}

export interface RawChain {
  chainId: string;
  /** Set of residue keys (`resSeq + iCode`) — kept for residueCount / dedup checks. */
  residues: Set<string>;
  /** Ordered Cα coordinates in source-file order. */
  caResidues: CAResidue[];
}

export interface RawSSSegment {
  chainId: string;
  start: number;
  end: number;
  type: 'helix' | 'strand';
}
