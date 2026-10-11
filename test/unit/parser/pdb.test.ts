import { describe, it, expect } from 'vitest';
import { parsePdb, parsePdbBackbone } from '../../../src/parser/pdb.js';
import MEMPROTMD_AT from '../../../examples/2omf_default_dppc-at.pdb?raw';

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

  it('does not treat a calcium ion as a Cα atom', () => {
    const calcium = `HETATM 9000 CA   CA A 501       0.000   0.000   0.000  1.00  0.00          CA`;
    const chains = parsePdb(`${SAMPLE_PDB}\n${calcium}`);
    const chainA = chains.find((c) => c.chainId === 'A');

    expect(chainA!.residues.has('501')).toBe(false);
    expect(chainA!.calphas).toHaveLength(4);
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

  it('extracts Cα coordinates in PDB file order', () => {
    const chains = parsePdb(SAMPLE_PDB);
    const chainA = chains.find((c) => c.chainId === 'A')!;
    expect(chainA.calphas).toHaveLength(4);
    expect(chainA.calphas[0]).toEqual({
      resSeq: 1,
      iCode: '',
      resName: 'GLY',
      x: 1,
      y: 0,
      z: 0,
      occupancy: 1,
      tempFactor: 0,
    });
    expect(chainA.calphas[2]).toMatchObject({
      resSeq: 3,
      iCode: '',
      resName: 'LEU',
      x: 7.6,
      y: 0,
      z: 0,
    });
    expect(chainA.calphas[3]).toMatchObject({
      resSeq: 4,
      iCode: '',
      resName: 'MSE',
      x: 10,
      y: 0,
      z: 0,
    });
  });

  it('records insertion codes on the Cα entry', () => {
    const content = `\
ATOM      1  CA  GLY A 100       0.000   0.000   0.000  1.00  0.00           C
ATOM      2  CA  ALA A 100A      1.000   2.000   3.000  1.00  0.00           C
`;
    const chains = parsePdb(content);
    expect(chains[0].calphas[1]).toEqual({
      resSeq: 100,
      iCode: 'A',
      resName: 'ALA',
      x: 1,
      y: 2,
      z: 3,
      occupancy: 1,
      tempFactor: 0,
    });
  });
});

describe('parsePdb with a blank chain column', () => {
  it('reads a real MemProtMD at.pdb (2OMF): blank chain, simulation-box frame', () => {
    const chains = parsePdb(MEMPROTMD_AT);
    // The trimer runs together on one blank chain, numbered 1–1020.
    expect(chains.map((c) => c.chainId)).toEqual(['A']);
    const [chain] = chains;
    expect(chain.calphas).toHaveLength(1020);
    expect(chain.calphas[0]).toMatchObject({ resSeq: 1, resName: 'ALA', x: 65.94, y: 65.47 });
    expect(chain.calphas[0].z).toBeCloseTo(38.93, 5);
    expect(chain.calphas.at(-1)).toMatchObject({ resSeq: 1020, resName: 'PHE' });
    // Box frame: every Cα is above z = 0 (30.6–85.3 Å).
    expect(Math.min(...chain.calphas.map((c) => c.z))).toBeGreaterThan(30);
  });

  it('names a blank chain by the first letter no other chain uses', () => {
    const text = [
      'ATOM      1  CA  GLY A   1       0.000   0.000   0.000  1.00  0.00           C',
      'ATOM      2  CA  GLY     1       0.000   0.000  10.000  1.00  0.00           C',
      'ATOM      3  CA  GLY C   1       0.000   0.000  20.000  1.00  0.00           C',
    ].join('\n');
    expect(parsePdb(text).map((c) => c.chainId)).toEqual(['A', 'B', 'C']);
  });
});

describe('parsePdbBackbone', () => {
  it('reads N, Cα, C and O per residue: first altloc, terminal OT1 as O, Cα-less residues dropped', () => {
    const text = [
      'ATOM      1  N   GLY A   1       0.000   0.000   0.000  1.00  0.00           N',
      'ATOM      2  CA  GLY A   1       1.000   0.000   0.000  1.00  0.00           C',
      'ATOM      3  C   GLY A   1       2.000   0.000   0.000  1.00  0.00           C',
      'ATOM      4  O   GLY A   1       2.000   1.000   0.000  1.00  0.00           O',
      'ATOM      5  N  ASER A   2       3.000   0.000   0.000  0.50  0.00           N',
      'ATOM      6  N  BSER A   2       9.000   9.000   9.000  0.50  0.00           N',
      'ATOM      7  CA  SER A   2       4.000   0.000   0.000  1.00  0.00           C',
      'ATOM      8  C   SER A   2       5.000   0.000   0.000  1.00  0.00           C',
      'ATOM      9  OT1 SER A   2       5.000   1.000   0.000  1.00  0.00           O',
      'HETATM   10  O   HOH A 900       0.000   0.000  20.000  1.00  0.00           O',
    ].join('\n');
    const [chain] = parsePdbBackbone(text);
    expect(chain.chainId).toBe('A');
    expect(chain.residues.map((r) => [r.resSeq, r.resName])).toEqual([
      [1, 'GLY'],
      [2, 'SER'],
    ]);
    expect(chain.residues[1].n).toEqual({ x: 3, y: 0, z: 0 });
    expect(chain.residues[1].o).toEqual({ x: 5, y: 1, z: 0 });
  });

  it("lists the same residues as parsePdb for 2OMF's MemProtMD file", () => {
    const backbone = parsePdbBackbone(MEMPROTMD_AT);
    const chains = parsePdb(MEMPROTMD_AT);
    expect(backbone.map((c) => [c.chainId, c.residues.length])).toEqual(
      chains.map((c) => [c.chainId, c.calphas.length]),
    );
  });
});
