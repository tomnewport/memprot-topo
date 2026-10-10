import { describe, it, expect } from 'vitest';
import {
  mmcifCategory,
  mmcifRecords,
  parseMmcifLoops,
  tokenizeMmcif,
} from '../../../src/parser/mmcif-tokenizer.js';
import OMF_DSSP from '../../../examples/2omf.dssp.cif?raw';
import G53_DSSP from '../../../examples/5g53.dssp.cif?raw';
import AHL_DSSP from '../../../examples/7ahl.dssp.cif?raw';

describe('tokenizeMmcif', () => {
  it('classifies data headers, loop_, tags and values, dropping comments', () => {
    const tokens = tokenizeMmcif('data_X\n# a comment\nloop_\n_a.b\n1 2 # trailing\n');
    expect(tokens.map((t) => [t.kind, t.text, t.line])).toEqual([
      ['data', 'X', 1],
      ['loop', 'loop_', 3],
      ['tag', '_a.b', 4],
      ['value', '1', 5],
      ['value', '2', 5],
    ]);
  });

  it('closes a quote only when followed by whitespace', () => {
    const texts = tokenizeMmcif(`"O5'" 'it's here' 'a b'`).map((t) => t.text);
    expect(texts).toEqual(["O5'", "it's here", 'a b']);
  });

  it('keeps # inside quotes and bare words', () => {
    const texts = tokenizeMmcif(`'a # b' x#y`).map((t) => t.text);
    expect(texts).toEqual(['a # b', 'x#y']);
  });

  it('reads ; text fields across lines and tracks line numbers after them', () => {
    const tokens = tokenizeMmcif('_a.b\n;line one\nline two\n;\n_a.c 3\n');
    expect(tokens[1]).toMatchObject({ kind: 'value', text: 'line one\nline two', line: 2 });
    expect(tokens[2]).toMatchObject({ kind: 'tag', text: '_a.c', line: 5 });
  });

  it('treats ; mid-line as an ordinary value', () => {
    expect(tokenizeMmcif('x ;y').map((t) => t.text)).toEqual(['x', ';y']);
  });

  it('handles CRLF line endings', () => {
    const texts = tokenizeMmcif('loop_\r\n_a.b\r\n1\r\n;t\r\n;\r\n').map((t) => t.text);
    expect(texts).toEqual(['loop_', '_a.b', '1', 't']);
  });

  it('ends an unterminated quote at end of line', () => {
    expect(tokenizeMmcif("'abc\nnext").map((t) => t.text)).toEqual(['abc', 'next']);
  });
});

describe('parseMmcifLoops', () => {
  const SAMPLE = `\
data_TEST
_entry.id   1ABC
#
loop_
_struct_conf.conf_type_id
_struct_conf.beg_auth_seq_id
_struct_conf.details
HELX_P 10 'first helix'
HELX_P 30 .
TURN_P
50 ?
#
_cell.length_a 10.0
_cell.length_b 20.0
_symmetry.space_group_name_H-M 'P 1'
`;

  it('returns loops and key-value categories in file order', () => {
    const loops = parseMmcifLoops(SAMPLE);
    expect(loops.map((l) => l.category)).toEqual(['_entry', '_struct_conf', '_cell', '_symmetry']);
  });

  it('splits loop values into rows regardless of line breaks', () => {
    const conf = parseMmcifLoops(SAMPLE).find((l) => l.category === '_struct_conf')!;
    expect(conf.fields).toEqual(['conf_type_id', 'beg_auth_seq_id', 'details']);
    expect(conf.rows).toEqual([
      ['HELX_P', '10', 'first helix'],
      ['HELX_P', '30', '.'],
      ['TURN_P', '50', '?'],
    ]);
  });

  it('groups consecutive key-value pairs of one category into a single row', () => {
    const cell = parseMmcifLoops(SAMPLE).find((l) => l.category === '_cell')!;
    expect(cell).toEqual({
      category: '_cell',
      fields: ['length_a', 'length_b'],
      rows: [['10.0', '20.0']],
    });
  });

  it('drops an incomplete trailing row', () => {
    const [loop] = parseMmcifLoops('loop_\n_a.x\n_a.y\n1 2 3\n');
    expect(loop.rows).toEqual([['1', '2']]);
  });

  it('ends a loop at the next tag even without a # separator', () => {
    const loops = parseMmcifLoops('loop_\n_a.x\n1\n2\nloop_\n_b.y\n3\n_c.z 4\n');
    expect(loops.map((l) => [l.category, l.rows])).toEqual([
      ['_a', [['1'], ['2']]],
      ['_b', [['3']]],
      ['_c', [['4']]],
    ]);
  });

  it('keeps text fields as single values', () => {
    const [loop] = parseMmcifLoops('loop_\n_a.x\n_a.y\n1\n;multi\nline\n;\n');
    expect(loop.rows).toEqual([['1', 'multi\nline']]);
  });
});

describe('mmcifRecords / mmcifCategory', () => {
  const loops = parseMmcifLoops('loop_\n_A.x\n_A.y\n1 2\n3 4\n_b.z 5\n');

  it('keys rows by field name', () => {
    expect(mmcifRecords(loops[0])).toEqual([
      { x: '1', y: '2' },
      { x: '3', y: '4' },
    ]);
  });

  it('looks up a category case-insensitively and returns [] when absent', () => {
    expect(mmcifCategory(loops, '_a')).toHaveLength(2);
    expect(mmcifCategory(loops, '_b')).toEqual([{ z: '5' }]);
    expect(mmcifCategory(loops, '_missing')).toEqual([]);
  });
});

describe('real DSSP output', () => {
  const files: Record<string, string> = { '2omf': OMF_DSSP, '5g53': G53_DSSP, '7ahl': AHL_DSSP };
  for (const [id, text] of Object.entries(files)) {
    it(`leaves no stray values in any loop of ${id}`, () => {
      const loops = parseMmcifLoops(text);
      const valueCount = tokenizeMmcif(text).filter((t) => t.kind === 'value').length;
      const tabled = loops.reduce((sum, l) => sum + l.rows.length * l.fields.length, 0);
      expect(tabled).toBe(valueCount);
    });
  }

  it('reads strand-pairing ladders from 2OMF', () => {
    const ladders = mmcifCategory(parseMmcifLoops(OMF_DSSP), '_dssp_struct_ladder');
    expect(ladders.length).toBeGreaterThan(0);
    for (const l of ladders) {
      expect(['parallel', 'anti-parallel']).toContain(l.type);
      expect(Number(l.beg_1_auth_seq_id)).not.toBeNaN();
    }
  });
});
