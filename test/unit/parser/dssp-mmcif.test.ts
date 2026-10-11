import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isHelixConfType,
  parseDsspLadders,
  parseDsspMmcif,
} from '../../../src/parser/dssp-mmcif.js';

const SAMPLE_MMCIF = `\
data_DSSP
#
loop_
_struct_conf.conf_type_id
_struct_conf.id
_struct_conf.beg_auth_asym_id
_struct_conf.beg_auth_seq_id
_struct_conf.pdbx_beg_PDB_ins_code
_struct_conf.end_auth_asym_id
_struct_conf.end_auth_seq_id
_struct_conf.pdbx_end_PDB_ins_code
HELX_P H1 A 10 . A 24 .
HELX_P H2 A 30 . A 45 .
#
loop_
_struct_sheet_range.sheet_id
_struct_sheet_range.id
_struct_sheet_range.beg_auth_asym_id
_struct_sheet_range.beg_auth_seq_id
_struct_sheet_range.pdbx_beg_PDB_ins_code
_struct_sheet_range.end_auth_asym_id
_struct_sheet_range.end_auth_seq_id
_struct_sheet_range.pdbx_end_PDB_ins_code
A 1 B 5 . B 12 .
A 2 B 15 . B 22 .
A 3 B 25 . B 32 .
#
`;

describe('parseDsspMmcif', () => {
  it('finds 2 helices in chain A', () => {
    const segments = parseDsspMmcif(SAMPLE_MMCIF);
    const helices = segments.filter((s) => s.type === 'helix' && s.chainId === 'A');
    expect(helices).toHaveLength(2);
  });

  it('finds 3 strands in chain B', () => {
    const segments = parseDsspMmcif(SAMPLE_MMCIF);
    const strands = segments.filter((s) => s.type === 'strand' && s.chainId === 'B');
    expect(strands).toHaveLength(3);
  });

  it('helix 1 has correct start and end', () => {
    const segments = parseDsspMmcif(SAMPLE_MMCIF);
    const helix1 = segments.find((s) => s.type === 'helix' && s.start === 10);
    expect(helix1).toBeDefined();
    expect(helix1!.end).toBe(24);
    expect(helix1!.chainId).toBe('A');
  });

  it('helix 2 has correct start and end', () => {
    const segments = parseDsspMmcif(SAMPLE_MMCIF);
    const helix2 = segments.find((s) => s.type === 'helix' && s.start === 30);
    expect(helix2).toBeDefined();
    expect(helix2!.end).toBe(45);
  });

  it('strand 1 has correct start and end', () => {
    const segments = parseDsspMmcif(SAMPLE_MMCIF);
    const strand1 = segments.find((s) => s.type === 'strand' && s.start === 5);
    expect(strand1).toBeDefined();
    expect(strand1!.end).toBe(12);
    expect(strand1!.chainId).toBe('B');
  });

  it('returns empty array for empty content', () => {
    expect(parseDsspMmcif('')).toHaveLength(0);
  });

  it('returns empty array when no loops present', () => {
    expect(parseDsspMmcif('data_TEST\n#\n')).toHaveLength(0);
  });

  it('filters out non-helix _struct_conf entries (TURN_P, etc.)', () => {
    const mmcif = `\
data_TEST
#
loop_
_struct_conf.conf_type_id
_struct_conf.id
_struct_conf.beg_auth_asym_id
_struct_conf.beg_auth_seq_id
_struct_conf.pdbx_beg_PDB_ins_code
_struct_conf.end_auth_asym_id
_struct_conf.end_auth_seq_id
_struct_conf.pdbx_end_PDB_ins_code
HELX_P  H1 A 10 . A 24 .
TURN_P  T1 A 25 . A 27 .
HELX_RH_3T_P H2 A 30 . A 33 .
TURN_P  T2 A 40 . A 42 .
#
`;
    const segments = parseDsspMmcif(mmcif);
    expect(segments.map((s) => s.start)).toEqual([10]);
    const with310 = parseDsspMmcif(mmcif, { helix310: true });
    expect(with310.every((s) => s.type === 'helix')).toBe(true);
    expect(with310.map((s) => s.start).sort((a, b) => a - b)).toEqual([10, 30]);
  });

  it('maps DSSP conformation types to helix or coil (#79)', () => {
    expect(isHelixConfType('HELX_P')).toBe(true);
    expect(isHelixConfType('HELX_RH_AL_P')).toBe(true);
    expect(isHelixConfType('HELX_RH_PI_P')).toBe(true);
    expect(isHelixConfType('HELX_RH_3T_P')).toBe(false);
    expect(isHelixConfType('HELX_RH_3T_P', { helix310: true })).toBe(true);
    expect(isHelixConfType('HELX_LH_PP_P')).toBe(false);
    expect(isHelixConfType('HELX_LH_PP_P', { helix310: true })).toBe(false);
    expect(isHelixConfType('TURN_P')).toBe(false);
    expect(isHelixConfType('')).toBe(false);
  });

  it('draws 5G53 chain A 263-266 (polyproline II) as coil', () => {
    const text = readFileSync(resolve(__dirname, '../../../examples/5g53.dssp.cif'), 'utf8');
    const helices = parseDsspMmcif(text).filter((s) => s.chainId === 'A' && s.type === 'helix');
    const covers = (resSeq: number) => helices.some((s) => s.start <= resSeq && resSeq <= s.end);
    for (let r = 263; r <= 266; r++) expect(covers(r)).toBe(false);
    // π helix 176-187 and 285-290 are kept; 3₁₀ 138-141 only on request.
    expect(covers(180)).toBe(true);
    expect(covers(288)).toBe(true);
    expect(covers(139)).toBe(false);
  });

  it('handles absent/unknown values (. and ?)', () => {
    const mmcif = `\
data_TEST
#
loop_
_struct_conf.conf_type_id
_struct_conf.id
_struct_conf.beg_auth_asym_id
_struct_conf.beg_auth_seq_id
_struct_conf.pdbx_beg_PDB_ins_code
_struct_conf.end_auth_asym_id
_struct_conf.end_auth_seq_id
_struct_conf.pdbx_end_PDB_ins_code
HELX_P H1 . 10 . . 24 .
HELX_P H2 A 5 . A 15 .
#
`;
    const segments = parseDsspMmcif(mmcif);
    // First row has chainId '.' — should be skipped
    expect(segments).toHaveLength(1);
    expect(segments[0].chainId).toBe('A');
  });
});

describe('parseDsspLadders', () => {
  const omf = readFileSync(resolve(__dirname, '../../../examples/2omf.dssp.cif'), 'utf8');
  const ahl = readFileSync(resolve(__dirname, '../../../examples/7ahl.dssp.cif'), 'utf8');

  it("reads 2OMF's ladders in author numbering, antiparallel sides reversed", () => {
    const ladders = parseDsspLadders(omf);
    expect(ladders).toHaveLength(22);
    expect(ladders[0]).toEqual({
      id: 'A',
      type: 'antiparallel',
      a: {
        start: { chainId: 'A', resSeq: 2, iCode: '' },
        end: { chainId: 'A', resSeq: 6, iCode: '' },
      },
      b: {
        start: { chainId: 'A', resSeq: 12, iCode: '' },
        end: { chainId: 'A', resSeq: 9, iCode: '' },
      },
    });
  });

  it("keeps 7AHL's ladders between chains", () => {
    const first = parseDsspLadders(ahl)[0];
    expect(first.type).toBe('parallel');
    expect(first.a.start).toEqual({ chainId: 'A', resSeq: 7, iCode: '' });
    expect(first.b.start).toEqual({ chainId: 'B', resSeq: 14, iCode: '' });
  });

  it('returns nothing for a file without ladders', () => {
    expect(parseDsspLadders(SAMPLE_MMCIF)).toEqual([]);
  });
});
