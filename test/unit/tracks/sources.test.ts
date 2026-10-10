import { describe, expect, it, vi } from 'vitest';
import { columnTags, csvTable, pdbTable, valuesTable } from '../../../src/tracks/sources.js';
import { loadSources } from '../../../src/tracks/load.js';

const atom = (
  serial: number,
  name: string,
  chain: string,
  resSeq: number,
  temp: number,
  iCode = ' ',
) =>
  `ATOM  ${String(serial).padStart(5)} ${name.padEnd(4)} ALA ${chain}${String(resSeq).padStart(4)}${iCode}   ` +
  `${'1.000'.padStart(8)}${'2.000'.padStart(8)}${'3.000'.padStart(8)}${'1.00'.padStart(6)}${temp.toFixed(2).padStart(6)}           C`;

const PDB = [
  'HEADER    TEST',
  atom(1, 'N', 'A', 1, 0.1),
  atom(2, 'CA', 'A', 1, 0.5),
  atom(3, 'N', 'A', 2, 0.2),
  atom(4, 'CA', 'A', 2, 0.9, 'A'),
  atom(5, 'CA', ' ', 7, 0.3),
  'ATOM      6  CA  ALA A   X       1.000   2.000   3.000',
  'END',
].join('\n');

describe('pdbTable', () => {
  it('reads every atom by chain and residue, keeping a blank chain as ""', () => {
    const t = pdbTable(PDB);
    expect(t.per).toBe('atom');
    expect(t.chains()).toEqual(['A', '']);
    expect(t.rows('A', '1').map((r) => r.name)).toEqual(['N', 'CA']);
    expect(t.rows('A', '2A')[0]).toMatchObject({
      serial: 4,
      tempFactor: 0.9,
      occupancy: 1,
      x: 1,
      element: 'C',
    });
    expect(t.rows('', '7')).toHaveLength(1);
    expect(t.rows('B', '1')).toEqual([]);
    expect(t.residues('A').map(([k]) => k)).toEqual(['1', '2', '2A']);
    expect(t.residues('Z')).toEqual([]);
  });
});

describe('csvTable', () => {
  it('reads per-residue rows, dropping a pandas index and skipping rows without keys', () => {
    const t = csvTable(
      '﻿,chainID,resSeq,iCode,flag,leaflet=a;bead=Head,name\n0,A,1,,True,0.5,x\n1,A,2,B,false,,y\n2,,,,1,1,z\n\n',
      { per: 'residue' },
    );
    expect(t.columns).toEqual([
      'chainID',
      'resSeq',
      'iCode',
      'flag',
      'leaflet=a;bead=Head',
      'name',
    ]);
    expect(t.rows('A', '1')[0]).toEqual({
      chainID: 'A',
      resSeq: 1,
      flag: 1,
      'leaflet=a;bead=Head': 0.5,
      name: 'x',
    });
    expect(t.rows('A', '2B')[0]).toEqual({
      chainID: 'A',
      resSeq: 2,
      iCode: 'B',
      flag: 0,
      name: 'y',
    });
    // The third row has a blank chain but a resSeq of "" too: unkeyable.
    expect(t.skipped).toBe(1);
  });

  it('uses the configured key columns', () => {
    const t = csvTable('ch,res,v\nB,4,9', {
      per: 'residue',
      keys: { chain: 'ch', residue: 'res' },
    });
    expect(t.rows('B', '4')[0].v).toBe(9);
  });

  it('keys per-atom rows by serial number through a pdb table', () => {
    const t = csvTable('serial,contacts\n2,5\n4,7\n99,1', { per: 'atom' }, pdbTable(PDB));
    expect(t.per).toBe('atom');
    expect(t.rows('A', '1')).toEqual([{ serial: 2, contacts: 5 }]);
    expect(t.rows('A', '2A')).toEqual([{ serial: 4, contacts: 7 }]);
    expect(t.skipped).toBe(1);
    // Without the atoms, nothing can be keyed.
    expect(csvTable('serial,contacts\n2,5', { per: 'atom' }).skipped).toBe(1);
  });
});

describe('valuesTable', () => {
  it('keeps finite numbers and non-empty text by residue key', () => {
    const t = valuesTable({
      A: { 1: 0.5, '2A': 'x', 3: '', 4: Number.NaN, bad: 1 },
      B: null as unknown as Record<string, number>,
    });
    expect(t.residues('A').map(([k, r]) => [k, r[0].value])).toEqual([
      ['1', 0.5],
      ['2A', 'x'],
    ]);
    expect(t.chains()).toEqual(['A']);
  });
});

describe('columnTags', () => {
  it('parses k=v;k=v headers', () => {
    expect(columnTags('leaflet=a;resname=DPPC;bead=Choline')).toEqual({
      leaflet: 'a',
      resname: 'DPPC',
      bead: 'Choline',
    });
    expect(columnTags('group=Tail')).toEqual({ group: 'Tail' });
    expect(columnTags('z')).toBeNull();
    expect(columnTags('a=1;b')).toBeNull();
  });
});

describe('loadSources', () => {
  it('reads inline, given and fetched sources, pdb before csv', async () => {
    const fetchText = vi.fn(async (url: string) => {
      if (url === 'gone.csv') throw new Error('404');
      if (url === 'aborted.csv') throw Object.assign(new Error('x'), { name: 'AbortError' });
      return 'serial,c\n2,1\n99,1';
    });
    const warn = vi.fn();
    const tables = await loadSources(
      {
        sources: {
          contacts: { type: 'csv', url: 'c.csv', per: 'atom', atoms: 'pdb' },
          wrongAtoms: {
            type: 'csv',
            text: 'chainID,resSeq,v\nA,1,2',
            per: 'residue',
            atoms: 'nope',
          },
          pdb: { type: 'pdb', text: PDB },
          gone: { type: 'csv', url: 'gone.csv', per: 'residue' },
          aborted: { type: 'csv', url: 'aborted.csv', per: 'residue' },
          vals: { type: 'values', data: { A: { 1: 3 } } },
        },
      },
      warn,
      undefined,
      fetchText,
    );
    expect([...tables.keys()].sort()).toEqual(['contacts', 'pdb', 'vals', 'wrongAtoms']);
    expect(tables.get('contacts')!.rows('A', '1')).toEqual([{ serial: 2, c: 1 }]);
    expect(warn.mock.calls.map((c) => c[0])).toEqual([
      'source "gone": 404',
      'source "contacts": 1 rows had no chain and residue, and were skipped',
      'source "wrongAtoms": atoms must name a pdb source',
    ]);
  });

  it('fetches with fetch() by default and reports HTTP errors', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === 'ok.csv'
        ? new Response('chainID,resSeq,v\nA,1,2')
        : new Response('', { status: 404, statusText: 'Not Found' }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const warn = vi.fn();
    const tables = await loadSources(
      {
        sources: {
          ok: { type: 'csv', url: 'ok.csv', per: 'residue' },
          missing: { type: 'csv', url: 'missing.csv', per: 'residue' },
        },
      },
      warn,
    );
    vi.unstubAllGlobals();
    expect(tables.get('ok')!.rows('A', '1')[0].v).toBe(2);
    expect(warn).toHaveBeenCalledWith('source "missing": 404 Not Found fetching missing.csv');
  });
});
