// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import {
  fetchUniprotNumbering,
  isPdbId,
  parseSifts,
  renumberSeries,
  siftsUrl,
  uniprotNumbering,
} from '../../../src/numbering/index.js';
import { siftsXml } from '../fixtures/sifts.js';

const XML = siftsXml([
  ['A', null, 'P11111', 1], // not observed
  ['A', '5', 'P11111', 20],
  ['A', '6', 'P11111', 21],
  ['A', '6A', 'P11111', 22], // insertion code
  ['A', '7', null], // expression tag: no UniProt position
  ['A', '1001', 'P00720', 2], // fused T4 lysozyme
  ['B', '-2', 'P22222', 3],
]);

describe('parseSifts', () => {
  it('reads observed residues that have a UniProt position', () => {
    expect(parseSifts(XML)).toEqual([
      { chainId: 'A', residue: '5', accession: 'P11111', uniprot: 20 },
      { chainId: 'A', residue: '6', accession: 'P11111', uniprot: 21 },
      { chainId: 'A', residue: '6A', accession: 'P11111', uniprot: 22 },
      { chainId: 'A', residue: '1001', accession: 'P00720', uniprot: 2 },
      { chainId: 'B', residue: '-2', accession: 'P22222', uniprot: 3 },
    ]);
  });

  it('returns nothing for text that is not SIFTS', () => {
    expect(parseSifts('<html>Not found</html>')).toEqual([]);
  });
});

describe('uniprotNumbering', () => {
  it('maps UniProt positions to residue keys, per chain', () => {
    const m = uniprotNumbering(parseSifts(XML));
    expect([...m.get('A')!]).toEqual([
      ['20', '5'],
      ['21', '6'],
      ['22', '6A'],
    ]);
    expect([...m.get('B')!]).toEqual([['3', '-2']]);
  });

  it("keeps a fused chain's main UniProt entry only", () => {
    expect(uniprotNumbering(parseSifts(XML)).get('A')!.has('2')).toBe(false);
  });
});

describe('renumberSeries', () => {
  const numbering = uniprotNumbering(parseSifts(XML));

  it('moves values to the structure numbering', () => {
    expect(renumberSeries({ A: { 20: 1, '22': 'x' }, B: { 3: 0.5 } }, numbering)).toEqual({
      A: { 5: 1, '6A': 'x' },
      B: { '-2': 0.5 },
    });
  });

  it('drops residues and chains the map does not cover', () => {
    expect(renumberSeries({ A: { 2: 1, 99: 1, x: 1 }, C: { 20: 1 } }, numbering)).toEqual({
      A: {},
    });
  });
});

describe('fetchUniprotNumbering', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches and unzips PDBe's SIFTS file", async () => {
    const fetchMock = vi.fn(async () => new Response(gzipSync(XML)));
    vi.stubGlobal('fetch', fetchMock);
    const m = await fetchUniprotNumbering('1ABC');
    expect(fetchMock).toHaveBeenCalledWith(siftsUrl('1abc'), { signal: undefined });
    expect(siftsUrl('1ABC')).toBe('https://www.ebi.ac.uk/pdbe/files/sifts/1abc.xml.gz');
    expect(m.get('A')!.get('22')).toBe('6A');
  });

  it('reads a file that arrives already unzipped', async () => {
    vi.stubGlobal('fetch', async () => new Response(XML));
    expect((await fetchUniprotNumbering('1abc')).get('B')!.get('3')).toBe('-2');
  });

  it('rejects on an HTTP error or an ID that is not a PDB ID', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404, statusText: 'Not Found' }));
    await expect(fetchUniprotNumbering('9zzz')).rejects.toThrow('404');
    await expect(fetchUniprotNumbering('my-protein')).rejects.toThrow('not a PDB ID');
    expect(isPdbId('5g53')).toBe(true);
    expect(isPdbId('g53x')).toBe(false);
  });
});
