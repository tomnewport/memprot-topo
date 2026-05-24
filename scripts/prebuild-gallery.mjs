/**
 * Fetch real PDB data from OPM for gallery reference proteins.
 *
 * Extracts Cα coordinates and HELIX/SHEET secondary structure records from
 * the OPM membrane-positioned PDB files. The output matches the ProteinData
 * shape used by topology-display, producing renders that closely resemble the
 * live Pages UI rather than the idealised synthetic coordinates.
 *
 * Run: node scripts/prebuild-gallery.mjs
 * Output: scripts/gallery-prebuilt-data.json (gitignored, regenerated in CI)
 */

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PROTEINS } from './gallery-data.mjs';

// Some OPM PDB files omit HELIX/SHEET records (7ahl is one example). For those
// proteins we fall back to hand-curated TM segment ranges so the topology
// display still has secondary structure to work with.
const FALLBACK_SEGMENTS = {
  '7ahl': [
    { start: 106, end: 116, type: 'strand' },
    { start: 124, end: 134, type: 'strand' },
    { start: 256, end: 266, type: 'strand' },
    { start: 274, end: 284, type: 'strand' },
  ],
};

const MAX_ATTEMPTS = 3;

async function fetchWithRetry(url) {
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) {
        const delay = 2 ** attempt * 1000;
        process.stderr.write(
          `  attempt ${attempt} failed (${err.message}), retrying in ${delay / 1000}s…\n`,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw new Error(`Failed to fetch ${url} after ${MAX_ATTEMPTS} attempts: ${lastErr.message}`);
}

async function fetchOpmPdb(pdbId) {
  const url = `https://opm-assets.storage.googleapis.com/pdb/${pdbId.toLowerCase()}.pdb`;
  return fetchWithRetry(url);
}

/**
 * Parse Cα coordinates from an OPM PDB file.
 *
 * Mirrors the logic in src/parser/pdb.ts so the gallery uses identical
 * coordinate extraction to the Pages demo. Returns one entry per chain.
 */
function parseCalphas(pdbText) {
  const chainMap = new Map(); // chainId -> { residues: Set, calphas: [] }

  for (const line of pdbText.split('\n')) {
    if (line.length < 54) continue;
    const record = line.slice(0, 6);
    if (record !== 'ATOM  ' && record !== 'HETATM') continue;

    const atomName = line.slice(12, 16).trim();
    if (atomName !== 'CA') continue;

    const chainId = line[21];
    if (!chainId || chainId === ' ') continue;

    const resSeqStr = line.slice(22, 26).trim();
    if (!resSeqStr) continue;
    const resSeq = parseInt(resSeqStr, 10);
    if (!Number.isFinite(resSeq)) continue;

    const iCode = line[26] === ' ' ? '' : line[26];
    const resKey = `${resSeqStr}${iCode}`;

    const x = parseFloat(line.slice(30, 38));
    const y = parseFloat(line.slice(38, 46));
    const z = parseFloat(line.slice(46, 54));
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

    let acc = chainMap.get(chainId);
    if (!acc) {
      acc = { residues: new Set(), calphas: [] };
      chainMap.set(chainId, acc);
    }

    if (acc.residues.has(resKey)) continue;
    acc.residues.add(resKey);
    acc.calphas.push({ resSeq, iCode, x, y, z });
  }

  return chainMap;
}

/**
 * Parse HELIX records from a PDB file.
 *
 * Column offsets are empirically verified against OPM-format PDB files
 * (the official PDB format doc has a 1-column discrepancy in some fields).
 *
 * Returns an array of { chainId, start, end, type: 'helix' }.
 */
function parseHelices(pdbText) {
  const segments = [];

  for (const line of pdbText.split('\n')) {
    if (!line.startsWith('HELIX ')) continue;
    if (line.length < 37) continue;

    const chainId = line[19];
    if (!chainId || chainId === ' ') continue;

    // initSeqNum: 4 chars right-justified starting at index 21
    const start = parseInt(line.slice(21, 25), 10);
    // endSeqNum: 4 chars right-justified starting at index 33
    const end = parseInt(line.slice(33, 37), 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    segments.push({ chainId, start, end, type: 'helix' });
  }

  return segments;
}

/**
 * Parse SHEET records from a PDB file.
 *
 * Each SHEET record is a single β-strand; multiple strands in the same sheet
 * share a sheetID but are independent rows. We emit one segment per record.
 *
 * Returns an array of { chainId, start, end, type: 'strand' }.
 */
function parseStrands(pdbText) {
  const segments = [];

  for (const line of pdbText.split('\n')) {
    if (!line.startsWith('SHEET ')) continue;
    if (line.length < 37) continue;

    const chainId = line[21];
    if (!chainId || chainId === ' ') continue;

    // initSeqNum: 4 chars right-justified starting at index 22
    const start = parseInt(line.slice(22, 26), 10);
    // endSeqNum: 4 chars right-justified starting at index 33
    const end = parseInt(line.slice(33, 37), 10);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    segments.push({ chainId, start, end, type: 'strand' });
  }

  return segments;
}

function buildProteinData(pdbId, pdbText) {
  const chainMap = parseCalphas(pdbText);
  const allHelices = parseHelices(pdbText);
  const allStrands = parseStrands(pdbText);
  const fallback = FALLBACK_SEGMENTS[pdbId] ?? null;

  const chains = Array.from(chainMap.entries()).map(([chainId, acc]) => {
    let segments = [
      ...allHelices.filter((s) => s.chainId === chainId),
      ...allStrands.filter((s) => s.chainId === chainId),
    ]
      .map(({ start, end, type }) => ({ start, end, type }))
      .sort((a, b) => a.start - b.start);

    if (segments.length === 0 && fallback) {
      segments = fallback;
    }

    return {
      chainId,
      residueCount: acc.residues.size,
      segments,
      calphas: acc.calphas,
    };
  });

  return { pdbId, chains };
}

async function main() {
  const entries = await Promise.all(
    PROTEINS.map(async ({ pdbId, label }) => {
      process.stdout.write(`Fetching ${pdbId} (${label})… `);
      const pdbText = await fetchOpmPdb(pdbId);
      const data = buildProteinData(pdbId, pdbText);
      const summary = data.chains.map((c) => `${c.chainId}:${c.residueCount}aa`).join(', ');
      console.log(`done (${summary})`);
      return [pdbId, data];
    }),
  );

  const results = Object.fromEntries(entries);

  const outPath = fileURLToPath(new URL('./gallery-prebuilt-data.json', import.meta.url));
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log('Wrote scripts/gallery-prebuilt-data.json');
}

main().catch((err) => {
  console.error('prebuild-gallery failed:', err);
  process.exit(1);
});
