import { describe, expect, it, vi } from 'vitest';
import { csvTable, pdbTable, valuesTable, type SourceTable } from '../../../src/tracks/sources.js';
import {
  membraneTable,
  resolveEntry,
  resolveSeries,
  splitRef,
  structureTable,
  type SeriesContext,
} from '../../../src/tracks/series.js';
import type { SeriesConfig, SeriesSelect } from '../../../src/tracks/types.js';

const atom = (serial: number, name: string, resSeq: number, temp: number) =>
  `ATOM  ${String(serial).padStart(5)} ${name.padEnd(4)} ALA A${String(resSeq).padStart(4)}    ` +
  `${'1.000'.padStart(8)}${'2.000'.padStart(8)}${'3.000'.padStart(8)}${'1.00'.padStart(6)}${temp.toFixed(2).padStart(6)}`;

const PDB = [
  atom(1, 'N', 1, 0.1),
  atom(2, 'CA', 1, 0.5),
  atom(3, 'CB', 1, 0.3),
  atom(4, 'N', 2, 0.2),
].join('\n');

const CSV = [
  'chainID,resSeq,z,ss,leaflet=a,leaflet=a;bead=Tail,leaflet=a;bead=Head,leaflet=b;bead=Head,leaflet=b;bead=Tail',
  'A,1,10,H,1,0.1,0.2,0.3,0.4',
  'A,2,-5,E,2,0.5,0.6,0.7,0.8',
].join('\n');

function ctx(
  series: Record<string, SeriesConfig | SeriesSelect> = {},
  extra: [string, SourceTable][] = [],
): SeriesContext & { warn: ReturnType<typeof vi.fn> } {
  return {
    chainId: 'A',
    residues: [
      { resSeq: 1, iCode: '' },
      { resSeq: 2, iCode: '' },
      { resSeq: 3, iCode: '' },
    ],
    tables: new Map<string, SourceTable>([
      ['pdb', pdbTable(PDB)],
      ['md', csvTable(CSV, { per: 'residue' })],
      ...extra,
    ]),
    series,
    warn: vi.fn(),
  };
}

describe('splitRef', () => {
  it('splits at the first dot', () => {
    expect(splitRef('md.leaflet=a;x.y')).toEqual({ source: 'md', column: 'leaflet=a;x.y' });
    expect(splitRef('nodot')).toBeNull();
    expect(splitRef('.x')).toBeNull();
    expect(splitRef('x.')).toBeNull();
  });
});

describe('resolveSeries', () => {
  it('reads a per-residue column directly, labelled by its column', () => {
    const s = resolveSeries('md.z', ctx())!;
    expect(s).toEqual({ label: 'z', values: [10, -5, undefined] });
  });

  it('reduces per-atom rows as configured', () => {
    const c = ctx({
      max: { from: 'pdb.tempFactor', reduce: 'max' },
      min: { from: 'pdb.tempFactor', reduce: 'min' },
      sum: { from: 'pdb.tempFactor', reduce: 'sum' },
      mean: { from: 'pdb.tempFactor', reduce: 'mean' },
      ca: { from: 'pdb.tempFactor', reduce: 'ca', label: 'CA', unit: 'x' },
      text: { from: 'pdb.name', reduce: 'max' },
    });
    expect(resolveSeries('max', c)!.values).toEqual([0.5, 0.2, undefined]);
    expect(resolveSeries('min', c)!.values).toEqual([0.1, 0.2, undefined]);
    expect(resolveSeries('sum', c)!.values[0]).toBeCloseTo(0.9);
    expect(resolveSeries('mean', c)!.values[0]).toBeCloseTo(0.3);
    expect(resolveSeries('ca', c)).toEqual({
      label: 'CA',
      unit: 'x',
      values: [0.5, undefined, undefined],
    });
    // No numbers to reduce: the first row's value.
    expect(resolveSeries('text', c)!.values[0]).toBe('N');
  });

  it('maps, scales and offsets values', () => {
    const c = ctx({
      ss: { from: 'md.ss', map: { H: 'helix', E: 'strand' } },
      nm: { from: 'md.z', scale: 0.1, offset: 1 },
      off: { from: 'md.z', offset: 1 },
    });
    expect(resolveSeries('ss', c)!.values).toEqual(['helix', 'strand', undefined]);
    expect(resolveSeries('nm', c)!.values).toEqual([2, 0.5, undefined]);
    expect(resolveSeries('off', c)!.values).toEqual([11, -4, undefined]);
  });

  it('warns and gives null for what it cannot resolve', () => {
    const c = ctx({ sel: { select: 'md' }, atoms: { from: 'pdb.tempFactor' } });
    expect(resolveSeries('nope', c)).toBeNull();
    expect(resolveSeries('x.y', c)).toBeNull();
    expect(resolveSeries('md.q', c)).toBeNull();
    expect(resolveSeries('atoms', c)).toBeNull();
    expect(resolveSeries('sel', c)).toBeNull();
    expect(c.warn.mock.calls.map((x) => x[0])).toEqual([
      'no series "nope"',
      'series "x.y": no source "x"',
      'series "md.q": source "md" has no column "q"',
      'series "atoms": "pdb" has a row per atom, so it needs "reduce"',
      'series "sel" is a set of series; use it where a list is expected',
    ]);
  });
});

describe('resolveEntry', () => {
  it('passes display overrides through', () => {
    const [e] = resolveEntry({ ref: 'md.z', label: 'Z', colour: 'red', side: 'below' }, ctx());
    expect(e).toEqual({
      series: { label: 'Z', values: [10, -5, undefined] },
      colour: 'red',
      side: 'below',
    });
    const [plain] = resolveEntry({ ref: 'md.z' }, ctx());
    expect(plain).toEqual({ series: { label: 'z', values: [10, -5, undefined] } });
    expect(resolveEntry('nope', ctx())).toEqual([]);
  });

  it('expands a selection to the columns with the first match’s tag keys', () => {
    const rows = resolveEntry({ select: 'md', where: { leaflet: 'a' } }, ctx());
    // `leaflet=a` (an aggregate) matches first, so only it is kept.
    expect(rows.map((r) => r.series.label)).toEqual(['leaflet=a']);
    const beads = resolveEntry({ select: 'md', where: { bead: ['Head', 'Tail'] } }, ctx());
    expect(beads.map((r) => r.series.label)).toEqual(['a', 'a', 'b', 'b']);
  });

  it('orders by the where list, then by the free tags, and fills label templates', () => {
    const c = ctx({
      beads: {
        select: 'md',
        where: { leaflet: ['b', 'a'], bead: ['Head', 'Tail'] },
        label: '{leaflet}/{bead}{missing}',
        order: [],
      },
    });
    expect(resolveEntry('beads', c).map((r) => r.series.label)).toEqual([
      'b/Head',
      'b/Tail',
      'a/Head',
      'a/Tail',
    ]);
    const byBead = resolveEntry(
      { select: 'md', where: { leaflet: 'b' }, order: ['Tail', 'Head'] },
      ctx(),
    );
    expect(byBead.map((r) => r.series.label)).toEqual(['Tail', 'Head']);
    expect(byBead[0].series.values).toEqual([0.4, 0.8, undefined]);
  });

  it('warns when a selection has no source, a per-atom source or no match', () => {
    const c = ctx();
    expect(resolveEntry({ select: 'x' }, c)).toEqual([]);
    expect(resolveEntry({ select: 'pdb' }, c)).toEqual([]);
    expect(resolveEntry({ select: 'md', where: { leaflet: 'z' } }, c)).toEqual([]);
    expect(c.warn.mock.calls.map((x) => x[0])).toEqual([
      'select: no source "x"',
      'select: "pdb" has a row per atom; name its columns as series with "reduce"',
      'select: no column of "md" matches',
    ]);
  });

  it('reads untagged columns of inline values by column name', () => {
    const c = ctx({}, [['v', valuesTable({ A: { 2: 4 } })]]);
    expect(resolveEntry('v.value', c)[0].series.values).toEqual([undefined, 4, undefined]);
  });
});

describe('built-in sources', () => {
  it('structure: one row per residue with the Cα fields and the layout’s secondary structure', () => {
    const t = structureTable([
      {
        chainId: 'A',
        residueCount: 3,
        segments: [{ start: 1, end: 2, type: 'helix' }],
        calphas: [
          { resSeq: 1, iCode: '', x: 1, y: 2, z: 3, resName: 'ALA', tempFactor: 0.5, occupancy: 1 },
          { resSeq: 1, iCode: '', x: 9, y: 9, z: 9 },
          { resSeq: 3, iCode: '', x: 0, y: 0, z: 0 },
        ],
      },
    ]);
    expect(t.rows('A', '1')).toEqual([
      { x: 1, y: 2, z: 3, ss: 'helix', resName: 'ALA', tempFactor: 0.5, occupancy: 1 },
    ]);
    expect(t.rows('A', '3')).toEqual([{ x: 0, y: 0, z: 0, ss: 'coil' }]);
  });

  it('membrane: bulk planes and each residue’s depth', () => {
    const t = membraneTable(
      'A',
      [
        { resSeq: 1, iCode: '' },
        { resSeq: 2, iCode: '' },
      ],
      [5],
      {
        upper: 20,
        lower: -20,
      },
    );
    expect(t.rows('A', '1')).toEqual([{ upper: 20, lower: -20, depth: 5 }]);
    expect(t.rows('A', '2')).toEqual([{ upper: 20, lower: -20 }]);
  });
});
