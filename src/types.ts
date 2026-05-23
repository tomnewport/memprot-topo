export type SecondaryStructureType = 'helix' | 'strand' | 'coil';

export interface SecondaryStructureSegment {
  start: number;
  end: number;
  type: SecondaryStructureType;
}

export interface CAResidue {
  resSeq: number;
  iCode: string;
  x: number;
  y: number;
  z: number;
}

/** Lower/upper z bound of the bilayer slab, in Ångström, in the membrane frame. */
export interface MembraneBounds {
  lower: number;
  upper: number;
}

export interface ChainData {
  chainId: string;
  residueCount: number;
  segments: SecondaryStructureSegment[];
  /** Ordered Cα coordinates, when available. Required for SVG rendering. */
  residues?: CAResidue[];
}

export interface ProteinData {
  pdbId: string;
  chains: ChainData[];
  /** Bilayer bounds in the membrane frame (z). Defaults applied by the renderer when omitted. */
  membrane?: MembraneBounds;
}
