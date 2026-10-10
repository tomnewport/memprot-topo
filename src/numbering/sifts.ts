import { parseResidueKey, type ResidueKey } from '../residue-key.js';
import type { ResidueNumbering } from './renumber.js';

/** One structure residue and its UniProt position, from a SIFTS file. */
export interface SiftsResidue {
  /** Author chain ID. */
  chainId: string;
  /** Author residue number and insertion code. */
  residue: ResidueKey;
  /** UniProt accession. */
  accession: string;
  /** Position in the UniProt sequence. */
  uniprot: number;
}

/** PDBe's residue-level SIFTS file for a PDB entry (gzipped XML). */
export function siftsUrl(pdbId: string): string {
  return `https://www.ebi.ac.uk/pdbe/files/sifts/${pdbId.toLowerCase()}.xml.gz`;
}

const ATTR_RE = /([A-Za-z]+)="([^"]*)"/g;
const PDB_REF_RE = /<crossRefDb\s[^>]*dbSource="PDB"[^>]*>/;
const UNP_REF_RE = /<crossRefDb\s[^>]*dbSource="UniProt"[^>]*>/;

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(ATTR_RE)) out[m[1]] = m[2];
  return out;
}

/**
 * The structure residues of a SIFTS XML file that map to a UniProt position.
 * Residues not observed in the structure (author number `null`) and residues
 * with no UniProt counterpart (tags, linkers) are left out.
 */
export function parseSifts(xml: string): SiftsResidue[] {
  const out: SiftsResidue[] = [];
  let at = 0;
  for (;;) {
    const start = xml.indexOf('<residue ', at);
    if (start < 0) break;
    const end = xml.indexOf('</residue>', start);
    if (end < 0) break;
    at = end;
    const block = xml.slice(start, end);
    const pdbTag = PDB_REF_RE.exec(block);
    const unpTag = UNP_REF_RE.exec(block);
    if (!pdbTag || !unpTag) continue;
    const pdb = attributes(pdbTag[0]);
    const unp = attributes(unpTag[0]);
    const residue = parseResidueKey(pdb.dbResNum ?? '');
    const uniprot = Number(unp.dbResNum);
    if (residue === null || !pdb.dbChainId || !unp.dbAccessionId || !Number.isInteger(uniprot)) {
      continue;
    }
    out.push({ chainId: pdb.dbChainId, residue, accession: unp.dbAccessionId, uniprot });
  }
  return out;
}

/**
 * UniProt numbering → the structure's, per chain. A chain that maps to more
 * than one UniProt entry (a fusion such as a receptor with T4 lysozyme) uses
 * the entry covering most of its residues; the rest of the chain has no
 * UniProt number.
 */
export function uniprotNumbering(residues: SiftsResidue[]): ResidueNumbering {
  const counts = new Map<string, Map<string, number>>();
  for (const r of residues) {
    let c = counts.get(r.chainId);
    if (!c) counts.set(r.chainId, (c = new Map()));
    c.set(r.accession, (c.get(r.accession) ?? 0) + 1);
  }
  const main = new Map<string, string>();
  for (const [chainId, c] of counts) {
    main.set(chainId, [...c].reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
  }
  const out: ResidueNumbering = new Map();
  for (const r of residues) {
    if (r.accession !== main.get(r.chainId)) continue;
    let m = out.get(r.chainId);
    if (!m) out.set(r.chainId, (m = new Map()));
    const key = String(r.uniprot);
    if (!m.has(key)) m.set(key, r.residue);
  }
  return out;
}

async function gunzipText(buffer: ArrayBuffer): Promise<string> {
  // The file is served as application/octet-stream, so the browser does not
  // decompress it; a proxy that already did leaves plain XML.
  const bytes = new Uint8Array(buffer, 0, Math.min(2, buffer.byteLength));
  if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return new TextDecoder().decode(buffer);
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** A PDB ID SIFTS has files for: four characters, starting with a digit. */
export function isPdbId(id: string): boolean {
  return /^[0-9][A-Za-z0-9]{3}$/.test(id);
}

/**
 * Fetch PDBe's SIFTS file for `pdbId` and build its UniProt numbering (see
 * {@link uniprotNumbering}). Rejects on a network or HTTP error.
 */
export async function fetchUniprotNumbering(
  pdbId: string,
  init: { signal?: AbortSignal } = {},
): Promise<ResidueNumbering> {
  if (!isPdbId(pdbId)) throw new Error(`not a PDB ID: "${pdbId}"`);
  const resp = await fetch(siftsUrl(pdbId), { signal: init.signal });
  if (!resp.ok) throw new Error(`SIFTS fetch failed: ${resp.status} ${resp.statusText}`);
  const xml = await gunzipText(await resp.arrayBuffer());
  return uniprotNumbering(parseSifts(xml));
}
