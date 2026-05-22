import { describe, it, expect } from 'vitest';
import { parsePdb } from '../../../src/parser/pdb.js';

const SAMPLE_PDB = `\
ATOM      1  CA  GLY A   1       0.000   0.000   0.000  1.00  0.00           C
ATOM      2  CA  ALA A   2       3.800   0.000   0.000  1.00  0.00           C
ATOM      3  CA  LEU A   3       7.600   0.000   0.000  1.00  0.00           C
HETATM  100  O   HOH A 200       0.000   0.000  20.000  1.00  0.00           O
ATOM      4  CA  GLY B   1       0.000   0.000  10.000  1.00  0.00           C
ATOM      5  CA  ALA B   2       3.800   0.000  10.000  1.00  0.00           C
`;

describe('parsePdb', () => {
  it('returns two chains', () => {
    const chains = parsePdb(SAMPLE_PDB);
    expect(chains).toHaveLength(2);
  });

  it('chain A has 3 residues', () => {
    const chains = parsePdb(SAMPLE_PDB);
    const chainA = chains.find((c) => c.chainId === 'A');
    expect(chainA).toBeDefined();
    expect(chainA!.residues.size).toBe(3);
  });

  it('chain B has 2 residues', () => {
    const chains = parsePdb(SAMPLE_PDB);
    const chainB = chains.find((c) => c.chainId === 'B');
    expect(chainB).toBeDefined();
    expect(chainB!.residues.size).toBe(2);
  });

  it('skips HETATM records', () => {
    const chains = parsePdb(SAMPLE_PDB);
    // HETATM for residue 200 in chain A should be absent from chain A
    const chainA = chains.find((c) => c.chainId === 'A');
    expect(chainA!.residues.has(200)).toBe(false);
  });

  it('returns empty array for empty content', () => {
    expect(parsePdb('')).toHaveLength(0);
  });

  it('deduplicates residue numbers within a chain', () => {
    const content = `\
ATOM      1  N   ALA A   5       0.000   0.000   0.000  1.00  0.00           N
ATOM      2  CA  ALA A   5       1.000   0.000   0.000  1.00  0.00           C
ATOM      3  C   ALA A   5       2.000   0.000   0.000  1.00  0.00           C
`;
    const chains = parsePdb(content);
    expect(chains).toHaveLength(1);
    expect(chains[0].residues.size).toBe(1);
    expect(chains[0].residues.has(5)).toBe(true);
  });
});
