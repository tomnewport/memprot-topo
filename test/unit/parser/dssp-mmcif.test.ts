import { describe, it, expect } from 'vitest';
import { parseDsspMmcif } from '../../../src/parser/dssp-mmcif.js';

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
    expect(segments).toHaveLength(2);
    expect(segments.every((s) => s.type === 'helix')).toBe(true);
    expect(segments.map((s) => s.start).sort((a, b) => a - b)).toEqual([10, 30]);
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
