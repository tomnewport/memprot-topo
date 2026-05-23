import { describe, it, expect } from 'vitest';
import { parsePdb } from '../../../src/parser/pdb.js';

const SAMPLE_PDB = `\
ATOM      1  N   GLY A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  GLY A   1       1.000   2.000   3.000  1.00  0.00           C
ATOM      3  CA  ALA A   2       3.800   2.500   3.500  1.00  0.00           C
ATOM      4  CA  LEU A   3       7.600   3.000  -4.000  1.00  0.00           C
HETATM  100  CA  MSE A   4      10.000   0.500   1.500  1.00  0.00           C
HETATM  200  O   HOH A 999       0.000   0.000  20.000  1.00  0.00           O
ATOM      5  CA  GLY A   5       0.000   0.000   0.000  1.00  0.00           C
`;

describe('parsePdb Cα coordinates', () => {
  it('captures coordinates for every Cα atom in source order', () => {
    const [chain] = parsePdb(SAMPLE_PDB);
    expect(chain.caResidues).toHaveLength(5);
    expect(chain.caResidues[0]).toMatchObject({ resSeq: 1, x: 1, y: 2, z: 3 });
    expect(chain.caResidues[3]).toMatchObject({ resSeq: 4, x: 10, y: 0.5, z: 1.5 });
  });

  it('does not include water Cα-named oxygen rows', () => {
    const [chain] = parsePdb(SAMPLE_PDB);
    expect(chain.caResidues.find((r) => r.resSeq === 999)).toBeUndefined();
  });

  it('does not re-add a residue when a second Cα row appears', () => {
    const dupPdb = `\
ATOM      1  CA  ALA A   1       0.000   0.000   0.000  1.00  0.00           C
ATOM      2  CA  ALA A   1       9.000   9.000   9.000  1.00  0.00           C
`;
    const [chain] = parsePdb(dupPdb);
    expect(chain.caResidues).toHaveLength(1);
    expect(chain.caResidues[0].x).toBe(0);
  });

  it('parses negative coordinates correctly', () => {
    const [chain] = parsePdb(SAMPLE_PDB);
    expect(chain.caResidues.find((r) => r.resSeq === 3)?.z).toBe(-4);
  });
});
