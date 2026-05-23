import { describe, it, expect } from 'vitest';
import { parsePdb } from '../../../src/parser/pdb.js';

const SAMPLE_PDB = `\
ATOM      1  N   GLY A   1       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  GLY A   1       1.000   0.000   0.000  1.00  0.00           C
ATOM      3  CA  ALA A   2       3.800   0.000   0.000  1.00  0.00           C
ATOM      4  CA  LEU A   3       7.600   0.000   0.000  1.00  0.00           C
HETATM  100  CA  MSE A   4      10.000   0.000   0.000  1.00  0.00           C
HETATM  200  O   HOH A 999       0.000   0.000  20.000  1.00  0.00           O
ATOM      5  CA  GLY B   1       0.000   0.000  10.000  1.00  0.00           C
ATOM      6  CA  ALA B   2       3.800   0.000  10.000  1.00  0.00           C
`;

describe('parsePdb', () => {
  it('returns two chains', () => {
    const chains = parsePdb(SAMPLE_PDB);
    expect(chains).toHaveLength(2);
  });

  it('chain A has 4 residues (GLY+ALA+LEU+MSE)', () => {
    const chains = parsePdb(SAMPLE_PDB);
    const chainA = chains.find((c) => c.chainId === 'A');
    expect(chainA).toBeDefined();
    expect(chainA!.residues.size).toBe(4);
  });

  it('chain B has 2 residues', () => {
    const chains = parsePdb(SAMPLE_PDB);
    const chainB = chains.find((c) => c.chainId === 'B');
    expect(chainB).toBeDefined();
    expect(chainB!.residues.size).toBe(2);
  });

  it('includes HETATM modified residues with CA (MSE) but skips waters/ligands', () => {
    const chains = parsePdb(SAMPLE_PDB);
    const chainA = chains.find((c) => c.chainId === 'A');
    expect(chainA!.residues.has('4')).toBe(true); // MSE included
    expect(chainA!.residues.has('999')).toBe(false); // HOH excluded (no CA atom)
  });

  it('returns empty array for empty content', () => {
    expect(parsePdb('')).toHaveLength(0);
  });

  it('deduplicates the same residue across multiple atom rows', () => {
    const content = `\
ATOM      1  N   ALA A   5       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   5       1.000   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   5       2.000   0.000   0.000  1.00  0.00           C
`;
    const chains = parsePdb(content);
    expect(chains).toHaveLength(1);
    expect(chains[0].residues.size).toBe(1);
    expect(chains[0].residues.has('5')).toBe(true);
  });

  it('assigns blank chain IDs to chain A (MemProtMD-style stripped PDBs)', () => {
    const content = `\
ATOM      1  CA  ALA     1      83.420  74.130  47.160  1.00  0.00
ATOM      2  CA  GLY     2      85.000  74.000  47.500  1.00  0.00
`;
    const chains = parsePdb(content);
    expect(chains).toHaveLength(1);
    expect(chains[0].chainId).toBe('A');
    expect(chains[0].residues.size).toBe(2);
  });

  it('keeps insertion-coded residues distinct from base resSeq', () => {
    const content = `\
ATOM      1  CA  GLY A 100       0.000   0.000   0.000  1.00  0.00           C
ATOM      2  CA  ALA A 100A      1.000   0.000   0.000  1.00  0.00           C
ATOM      3  CA  LEU A 100B      2.000   0.000   0.000  1.00  0.00           C
ATOM      4  CA  VAL A 101       3.000   0.000   0.000  1.00  0.00           C
`;
    const chains = parsePdb(content);
    expect(chains).toHaveLength(1);
    expect(chains[0].residues.size).toBe(4);
    expect(chains[0].residues.has('100')).toBe(true);
    expect(chains[0].residues.has('100A')).toBe(true);
    expect(chains[0].residues.has('100B')).toBe(true);
    expect(chains[0].residues.has('101')).toBe(true);
  });
});
