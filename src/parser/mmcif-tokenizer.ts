/**
 * Generic mmCIF (CIF 1.1 syntax) reader. Knows nothing about DSSP or any
 * other dictionary: it turns text into tables of string values, one per
 * category, and leaves interpretation of `.` / `?` and numbers to callers.
 */

/** A category's rows, in file order. Values are raw strings (quotes removed). */
export interface MmcifLoop {
  /** Category name including the leading underscore, e.g. `_struct_conf`. */
  category: string;
  /** Item names without the category prefix, e.g. `conf_type_id`. */
  fields: string[];
  /** One array per row, aligned with `fields`. */
  rows: string[][];
}

export interface MmcifToken {
  /** `value` covers bare, quoted and `;` text-field values. */
  kind: 'data' | 'loop' | 'tag' | 'value';
  text: string;
  /** 1-based line on which the token starts. */
  line: number;
}

const isSpace = (ch: string | undefined): boolean =>
  ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r';

/**
 * Split mmCIF text into tokens. Comments are dropped. Quoted values close only
 * on a matching quote followed by whitespace or end of input, so values such
 * as `"O5'"` or `'it's'` survive intact. A `;` at the start of a line opens a
 * text field that runs to the next line starting with `;`.
 */
export function tokenizeMmcif(text: string): MmcifToken[] {
  const tokens: MmcifToken[] = [];
  const n = text.length;
  let i = 0;
  let line = 1;
  let atLineStart = true;

  while (i < n) {
    const ch = text[i];
    if (ch === '\n') {
      line++;
      i++;
      atLineStart = true;
      continue;
    }
    if (isSpace(ch)) {
      i++;
      continue;
    }
    if (ch === '#') {
      while (i < n && text[i] !== '\n') i++;
      continue;
    }

    const startLine = line;
    if (ch === ';' && atLineStart) {
      // Text field: content is everything up to the next "\n;".
      const close = text.indexOf('\n;', i + 1);
      const end = close === -1 ? n : close;
      let value = text.slice(i + 1, end);
      if (value.endsWith('\r')) value = value.slice(0, -1);
      if (value.startsWith('\r\n')) value = value.slice(2);
      else if (value.startsWith('\n')) value = value.slice(1);
      for (let k = i; k < end; k++) if (text[k] === '\n') line++;
      tokens.push({ kind: 'value', text: value, line: startLine });
      i = close === -1 ? n : close + 2;
      if (close !== -1) line++;
      atLineStart = false;
      continue;
    }

    atLineStart = false;
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (
        j < n &&
        text[j] !== '\n' &&
        !(text[j] === ch && (j + 1 >= n || isSpace(text[j + 1])))
      ) {
        j++;
      }
      // An unterminated quote runs to end of line rather than swallowing the file.
      tokens.push({ kind: 'value', text: text.slice(i + 1, j), line: startLine });
      i = j < n && text[j] === ch ? j + 1 : j;
      continue;
    }

    let j = i;
    while (j < n && !isSpace(text[j])) j++;
    const word = text.slice(i, j);
    i = j;
    const lower = word.toLowerCase();
    if (ch === '_') tokens.push({ kind: 'tag', text: word, line: startLine });
    else if (lower === 'loop_') tokens.push({ kind: 'loop', text: word, line: startLine });
    else if (lower.startsWith('data_'))
      tokens.push({ kind: 'data', text: word.slice(5), line: startLine });
    else tokens.push({ kind: 'value', text: word, line: startLine });
  }
  return tokens;
}

/** Split `_cat.item` into its category and item. Tags without a dot are their own category. */
function splitTag(tag: string): [string, string] {
  const dot = tag.indexOf('.');
  return dot === -1 ? [tag, ''] : [tag.slice(0, dot), tag.slice(dot + 1)];
}

/**
 * Parse mmCIF text into one table per category. Both `loop_` tables and
 * single-row key–value categories (`_cat.item value` pairs) are returned as
 * `MmcifLoop`s, in the order their categories first appear. If a file has
 * several `data_` blocks, categories from all of them are returned in order.
 *
 * A loop whose value count is not a multiple of its field count keeps only
 * its complete rows.
 */
export function parseMmcifLoops(text: string): MmcifLoop[] {
  const tokens = tokenizeMmcif(text);
  const loops: MmcifLoop[] = [];
  // Key–value categories being collected; flushed whenever anything else appears.
  let pairs: MmcifLoop | null = null;
  const flushPairs = (): void => {
    if (pairs) loops.push(pairs);
    pairs = null;
  };

  let t = 0;
  while (t < tokens.length) {
    const tok = tokens[t];
    if (tok.kind === 'loop') {
      flushPairs();
      t++;
      const tags: string[] = [];
      while (t < tokens.length && tokens[t].kind === 'tag') tags.push(tokens[t++].text);
      const values: string[] = [];
      while (t < tokens.length && tokens[t].kind === 'value') values.push(tokens[t++].text);
      if (tags.length === 0) continue;
      const [category] = splitTag(tags[0]);
      const fields = tags.map((tag) => splitTag(tag)[1]);
      const rows: string[][] = [];
      for (let v = 0; v + fields.length <= values.length; v += fields.length) {
        rows.push(values.slice(v, v + fields.length));
      }
      loops.push({ category, fields, rows });
    } else if (tok.kind === 'tag') {
      t++;
      const value = t < tokens.length && tokens[t].kind === 'value' ? tokens[t++].text : '?';
      const [category, field] = splitTag(tok.text);
      if (pairs && pairs.category !== category) flushPairs();
      pairs ??= { category, fields: [], rows: [[]] };
      pairs.fields.push(field);
      pairs.rows[0].push(value);
    } else {
      // data_ headers end any pending pairs; stray values are ignored.
      if (tok.kind === 'data') flushPairs();
      t++;
    }
  }
  flushPairs();
  return loops;
}

/** Turn a table's rows into records keyed by field name. */
export function mmcifRecords(loop: MmcifLoop): Array<Record<string, string>> {
  return loop.rows.map((row) => {
    const record: Record<string, string> = {};
    loop.fields.forEach((field, f) => (record[field] = row[f]));
    return record;
  });
}

/**
 * Rows of one category as records, e.g. `mmcifCategory(loops, '_struct_conf')`.
 * Returns an empty array when the category is absent. Matching is
 * case-insensitive, as CIF tags are.
 */
export function mmcifCategory(
  loops: readonly MmcifLoop[],
  category: string,
): Array<Record<string, string>> {
  const wanted = category.toLowerCase();
  return loops.filter((l) => l.category.toLowerCase() === wanted).flatMap(mmcifRecords);
}
