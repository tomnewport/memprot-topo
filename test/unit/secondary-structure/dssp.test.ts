import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parsePdb, parsePdbBackbone } from '../../../src/parser/pdb.js';
import { parseDsspLadders, parseDsspMmcif } from '../../../src/parser/dssp-mmcif.js';
import { mmcifCategory, parseMmcifLoops } from '../../../src/parser/mmcif-tokenizer.js';
import type { BetaLadder } from '../../../src/types.js';
import type { RawSSSegment } from '../../../src/parser/types.js';
import {
  computeDssp,
  dsspSegments,
  structureSecondaryStructure,
  type DsspResidue,
} from '../../../src/secondary-structure/index.js';

const example = (name: string) =>
  readFileSync(resolve(__dirname, '../../../examples', name), 'utf8');

/** PDB-REDO's per-residue codes, keyed `chain:resSeq`, as computeDssp writes them. */
function referenceCodes(dsspText: string): Map<string, string> {
  const loops = parseMmcifLoops(dsspText);
  const scheme = new Map<string, string>();
  for (const r of mmcifCategory(loops, '_pdbx_poly_seq_scheme')) {
    const ins = r['pdb_ins_code'];
    const iCode = !ins || ins === '.' || ins === '?' ? '' : ins;
    scheme.set(
      `${r['asym_id']}:${r['seq_id']}`,
      `${r['pdb_strand_id']}:${r['pdb_seq_num']}${iCode}`,
    );
  }
  const codes = new Map<string, string>();
  for (const r of mmcifCategory(loops, '_dssp_struct_summary')) {
    const key = scheme.get(`${r['label_asym_id']}:${r['label_seq_id']}`);
    const ss = r['secondary_structure'];
    if (key) codes.set(key, 'HGIEB'.includes(ss) && ss !== '' ? ss : ' ');
  }
  return codes;
}

/** Share of residues whose code matches PDB-REDO's, and how many were compared. */
function agreement(residues: readonly DsspResidue[], codes: Map<string, string>) {
  let n = 0;
  let same = 0;
  for (const r of residues) {
    const want = codes.get(`${r.chainId}:${r.resSeq}${r.iCode}`);
    if (want === undefined) continue;
    n++;
    if (want === r.ss) same++;
  }
  return { n, share: same / n };
}

/** A ladder as a string: its type and two residue ranges, in either order. */
const ladderKey = (l: BetaLadder) => {
  const side = (s: BetaLadder['a']) =>
    [s.start, s.end]
      .sort((p, q) => p.resSeq - q.resSeq)
      .map((r) => `${r.chainId}${r.resSeq}${r.iCode}`)
      .join('-');
  return `${l.type} ${[side(l.a), side(l.b)].sort().join(' ')}`;
};

/** Residues inside helix segments, as `chain:resSeq`. */
const helixResidues = (segments: readonly RawSSSegment[]) =>
  new Set(
    segments
      .filter((s) => s.type === 'helix')
      .flatMap((s) =>
        Array.from({ length: s.end - s.start + 1 }, (_, k) => `${s.chainId}:${s.start + k}`),
      ),
  );

describe('computeDssp', () => {
  it("matches PDB-REDO's per-residue DSSP on 2OMF's coordinates", () => {
    const { residues } = computeDssp(parsePdbBackbone(example('2omf.pdb')));
    const { n, share } = agreement(residues, referenceCodes(example('2omf.dssp.cif')));
    expect(n).toBeGreaterThan(300);
    expect(share).toBe(1);
  });

  it.each(['2omf', '5g53', '7ahl'])(
    "finds %s's helices and ladders as PDB-REDO lists them",
    (id) => {
      const dssp = computeDssp(parsePdbBackbone(example(`${id}.pdb`)));
      const text = example(`${id}.dssp.cif`);
      // Only chains in both: OPM's 2OMF carries the trimer the entry lists as one chain.
      const listed = new Set(parseDsspMmcif(text).map((s) => s.chainId));
      const chains = new Set(dssp.residues.map((r) => r.chainId).filter((c) => listed.has(c)));
      const ours = (l: BetaLadder) =>
        [l.a.start, l.a.end, l.b.start, l.b.end].every((r) => chains.has(r.chainId));
      const want = parseDsspLadders(text).filter(ours).map(ladderKey).sort();
      expect(want.length).toBeGreaterThan(5);
      expect(dssp.ladders.filter(ours).map(ladderKey).sort()).toEqual(want);

      const helices = helixResidues(parseDsspMmcif(text).filter((s) => chains.has(s.chainId)));
      const drawn = dsspSegments(dssp.residues.filter((r) => chains.has(r.chainId)));
      expect(helixResidues(drawn)).toEqual(helices);
    },
  );

  it('skips residues without a full backbone and gives a Cα trace nothing', () => {
    const ca = (i: number) =>
      `ATOM  ${String(i).padStart(5)}  CA  ALA A${String(i).padStart(4)}    ${(i * 3.8).toFixed(3).padStart(8)}   0.000   0.000  1.00  0.00           C`;
    const backbone = parsePdbBackbone([1, 2, 3, 4].map(ca).join('\n'));
    expect(backbone[0].residues).toHaveLength(4);
    expect(computeDssp(backbone)).toEqual({ residues: [], ladders: [] });
  });
});

describe('dsspSegments', () => {
  const res = (resSeq: number, ss: DsspResidue['ss'], chainId = 'A'): DsspResidue => ({
    chainId,
    resSeq,
    iCode: '',
    ss,
  });

  it('draws H and I as helix, G only on request, E as strand, B as coil', () => {
    const residues = [
      res(1, 'H'),
      res(2, 'H'),
      res(3, 'I'),
      res(4, 'G'),
      res(5, 'G'),
      res(6, 'B'),
      res(7, 'E'),
      res(8, 'E'),
      res(9, 'E', 'B'),
    ];
    expect(dsspSegments(residues)).toEqual([
      { chainId: 'A', start: 1, end: 3, type: 'helix' },
      { chainId: 'A', start: 7, end: 8, type: 'strand' },
      { chainId: 'B', start: 9, end: 9, type: 'strand' },
    ]);
    expect(dsspSegments(residues, { helix310: true })[0]).toEqual({
      chainId: 'A',
      start: 1,
      end: 5,
      type: 'helix',
    });
  });
});

describe('structureSecondaryStructure', () => {
  it("numbers 5G53's assignment as the chains it is drawn with", () => {
    const text = example('5g53.pdb');
    const chains = parsePdb(text).map((c) => ({
      ...c,
      calphas: c.calphas.map((ca) => ({ ...ca, resSeq: ca.resSeq + 1000 })),
    }));
    const plain = structureSecondaryStructure(parsePdbBackbone(text), parsePdb(text))!;
    const shifted = structureSecondaryStructure(parsePdbBackbone(text), chains)!;
    expect(plain.segments.length).toBeGreaterThan(10);
    expect(shifted.segments).toEqual(
      plain.segments.map((s) => ({ ...s, start: s.start + 1000, end: s.end + 1000 })),
    );
    expect(shifted.ladders.length).toBe(plain.ladders.length);
  });

  it("gives up on a Cα-only structure, or one that doesn't line up with the chains", () => {
    const at = example('2omf_default_dppc-at.pdb');
    expect(structureSecondaryStructure(parsePdbBackbone(at), parsePdb(at))).toBeNull();
    const text = example('5g53.pdb');
    const chains = parsePdb(text);
    chains[0] = { ...chains[0], calphas: chains[0].calphas.slice(1) };
    expect(structureSecondaryStructure(parsePdbBackbone(text), chains)).toBeNull();
  });
});
