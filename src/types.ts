import type { StructureMembrane } from './membrane/structure.js';

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
  /** The Cα's occupancy and temperature factor (B-factor) columns, when the file has them. */
  occupancy?: number;
  tempFactor?: number;
}

/** One residue named by chain and author numbering. */
export interface ResidueRef {
  chainId: string;
  resSeq: number;
  iCode: string;
}

/**
 * A DSSP β-ladder: a run of consecutive bridges between two strands
 * (`_dssp_struct_ladder`). Side `a` runs `start` → `end` in sequence order;
 * side `b` lists the residues paired with them, so for an antiparallel ladder
 * `b.start` is the higher-numbered end.
 */
export interface BetaLadder {
  /** The ladder's id in the DSSP file (unique within the file). */
  id: string;
  type: 'parallel' | 'antiparallel';
  a: { start: ResidueRef; end: ResidueRef };
  b: { start: ResidueRef; end: ResidueRef };
}

export interface ChainData {
  chainId: string;
  residueCount: number;
  segments: SecondaryStructureSegment[];
  calphas: Calpha[];
  /**
   * DSSP's β-ladders with at least one side in this chain, when the DSSP file
   * has them. Strand pairing uses them in place of the Cα geometry (#79).
   */
  ladders?: BetaLadder[];
}

export interface ProteinData {
  pdbId: string;
  chains: ChainData[];
  /**
   * What the structure file says about its membrane (`parseStructureMembrane`):
   * the bilayer from its lipids (MemProtMD's `at.pdb`), placing a
   * simulation-box structure on its midplane, and OPM's half-thickness.
   */
  membrane?: StructureMembrane;
}
