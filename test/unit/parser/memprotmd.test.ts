import { describe, it, expect } from 'vitest';
import { parsePdb } from '../../../src/parser/pdb.js';
import { parseDsspMmcif } from '../../../src/parser/dssp-mmcif.js';
import { mapToDeposited } from '../../../src/parser/memprotmd.js';
import type { RawChain, RawSSSegment } from '../../../src/parser/types.js';
import OMF_AT from '../../../examples/2omf_default_dppc-at.pdb?raw';
import OMF_DSSP from '../../../examples/2omf.dssp.cif?raw';
import AHL_DSSP_TRIMMED from '../../../examples/7ahl.dssp.cif?raw';

/** A DSSP file's per-residue records for the given label chains. */
function dssp(chains: { asym: string; auth: string; names: string[]; first?: number }[]): string {
  const summary = [
    'loop_',
    '_dssp_struct_summary.label_asym_id',
    '_dssp_struct_summary.label_seq_id',
    '_dssp_struct_summary.label_comp_id',
  ];
  const scheme = [
    'loop_',
    '_pdbx_poly_seq_scheme.asym_id',
    '_pdbx_poly_seq_scheme.seq_id',
    '_pdbx_poly_seq_scheme.pdb_seq_num',
    '_pdbx_poly_seq_scheme.pdb_strand_id',
    '_pdbx_poly_seq_scheme.pdb_ins_code',
  ];
  for (const c of chains) {
    c.names.forEach((name, i) => {
      summary.push(`${c.asym} ${i + 1} ${name}`);
      scheme.push(`${c.asym} ${i + 1} ${(c.first ?? 1) + i} ${c.auth} .`);
    });
  }
  return [...summary, '#', ...scheme, '#'].join('\n');
}

/** One MemProtMD-style chain: renumbered from 1, chain `A`. */
function model(names: string[]): RawChain[] {
  const calphas = names.map((resName, i) => ({
    resSeq: i + 1,
    iCode: '',
    resName,
    x: i,
    y: 0,
    z: 50,
  }));
  return [{ chainId: 'A', residues: new Set(calphas.map((c) => `${c.resSeq}`)), calphas }];
}

describe('mapToDeposited', () => {
  it("splits 2OMF's trimer into chains A–C, each in chain A's numbering and with its DSSP", () => {
    const segments = parseDsspMmcif(OMF_DSSP);
    const mapped = mapToDeposited(parsePdb(OMF_AT), OMF_DSSP, segments)!;
    expect(mapped.chains.map((c) => c.chainId)).toEqual(['A', 'B', 'C']);
    for (const chain of mapped.chains) {
      expect(chain.calphas).toHaveLength(340);
      expect(chain.calphas[0].resSeq).toBe(1);
      expect(chain.calphas.at(-1)!.resSeq).toBe(340);
      expect(chain.residues.size).toBe(340);
    }
    // The second protomer keeps its own coordinates.
    expect(mapped.chains[1].calphas[0].x).not.toBe(mapped.chains[0].calphas[0].x);
    const chainA = segments.filter((s) => s.chainId === 'A');
    expect(chainA.length).toBeGreaterThan(10);
    for (const id of ['A', 'B', 'C']) {
      expect(mapped.segments.filter((s) => s.chainId === id)).toEqual(
        chainA.map((s) => ({ ...s, chainId: id })),
      );
    }
  });

  it('takes unused chains of the same sequence before copying one, and the longest match', () => {
    const text = dssp([
      { asym: 'A', auth: 'R', names: ['ALA', 'GLY', 'LEU'], first: 10 },
      { asym: 'B', auth: 'S', names: ['ALA', 'GLY', 'LEU'], first: 10 },
      { asym: 'C', auth: 'G', names: ['ALA', 'GLY'], first: 5 },
    ]);
    const segments: RawSSSegment[] = [{ chainId: 'R', start: 10, end: 12, type: 'helix' }];
    const mapped = mapToDeposited(
      model(['ALA', 'GLY', 'LEU', 'ALA', 'GLY', 'LEU', 'ALA', 'GLY']),
      text,
      segments,
    )!;
    expect(mapped.chains.map((c) => [c.chainId, c.calphas.map((ca) => ca.resSeq)])).toEqual([
      ['R', [10, 11, 12]],
      ['S', [10, 11, 12]],
      ['G', [5, 6]],
    ]);
    expect(mapped.segments).toEqual(segments);
  });

  it('names a further copy by the first chain ID the entry lacks, with the DSSP of the chain it copies', () => {
    const text = dssp([
      { asym: 'A', auth: 'A', names: ['MSE', 'HIS'] },
      { asym: 'B', auth: 'B', names: ['TRP'] },
    ]);
    const segments: RawSSSegment[] = [{ chainId: 'A', start: 1, end: 2, type: 'strand' }];
    // MD names: HSD is histidine; the deposited MSE is read as MET.
    const mapped = mapToDeposited(model(['MET', 'HSD', 'MET', 'HIS']), text, segments)!;
    expect(mapped.chains.map((c) => c.chainId)).toEqual(['A', 'C']);
    expect(mapped.segments.map((s) => s.chainId)).toEqual(['A', 'C']);
  });

  it('gives up when a residue falls outside every deposited chain, or there are no per-residue records', () => {
    const text = dssp([{ asym: 'A', auth: 'A', names: ['ALA', 'GLY'] }]);
    expect(mapToDeposited(model(['ALA', 'GLY', 'TRP']), text, [])).toBeNull();
    expect(mapToDeposited(model(['ALA', 'GLY']), AHL_DSSP_TRIMMED, [])).toBeNull();
  });
});
