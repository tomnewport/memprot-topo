/**
 * The rigid transform that takes a structure (e.g. OPM's) into the frame of a
 * MemProtMD simulation, so it lines up with that simulation's distortions
 * file. Superposes the structure's Cα on the Cα of MemProtMD's own model of the
 * same protein (its structure, head-contacts or other PDB written in the
 * simulation box).
 *
 * MemProtMD renumbers residues and may keep every chain in one, in a different
 * order, so chains are matched by residue sequence: each chain of the
 * structure is found as a run of identical residue names in MemProtMD's model,
 * and among the possible matches for an oligomer's identical chains the
 * assignment that superposes best is kept.
 *
 *   npx tsx scripts/register-memprotmd.ts <structure.pdb | URL> <memprotmd.pdb>
 *
 * Prints `{ rotation, translation, rmsd, matched }`: x_md = rotation · x + translation.
 */
import { readFileSync } from 'node:fs';

interface Ca {
  chain: string;
  resName: string;
  p: [number, number, number];
}

function parseCa(text: string): Ca[] {
  const out: Ca[] = [];
  const seen = new Set<string>();
  for (const line of text.split('\n')) {
    if (line.startsWith('ENDMDL')) break;
    if (!line.startsWith('ATOM') || line.slice(12, 16).trim() !== 'CA') continue;
    const alt = line[16];
    const key = `${line[21]}:${line.slice(22, 27)}`;
    if ((alt !== ' ' && alt !== 'A') || seen.has(key)) continue;
    seen.add(key);
    out.push({
      chain: line[21],
      resName: line.slice(17, 20),
      p: [Number(line.slice(30, 38)), Number(line.slice(38, 46)), Number(line.slice(46, 54))],
    });
  }
  return out;
}

type Mat3 = number[][];

/** Least-squares rotation R and translation t with R·a + t ≈ b (Kabsch, via Horn's quaternion). */
function superpose(a: number[][], b: number[][]): { R: Mat3; t: number[]; rmsd: number } {
  const n = a.length;
  const ca = [0, 1, 2].map((k) => a.reduce((s, p) => s + p[k], 0) / n);
  const cb = [0, 1, 2].map((k) => b.reduce((s, p) => s + p[k], 0) / n);
  const S = [0, 1, 2].map(() => [0, 0, 0]);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++) S[j][k] += (a[i][j] - ca[j]) * (b[i][k] - cb[k]);
  const [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]] = S;
  const N = [
    [xx + yy + zz, yz - zy, zx - xz, xy - yx],
    [yz - zy, xx - yy - zz, xy + yx, zx + xz],
    [zx - xz, xy + yx, -xx + yy - zz, yz + zy],
    [xy - yx, zx + xz, yz + zy, -xx - yy + zz],
  ];
  // Largest eigenvector of N by power iteration on N + cI (shifted to be positive definite).
  const c = Math.abs(xx) + Math.abs(yy) + Math.abs(zz) + Math.abs(xy) + Math.abs(xz) + Math.abs(yz);
  let q = [1, 0, 0, 0];
  for (let it = 0; it < 2000; it++) {
    const next = N.map((row, i) => row.reduce((s, v, j) => s + v * q[j], 0) + c * q[i]);
    const len = Math.hypot(...next);
    q = next.map((v) => v / len);
  }
  const [w, x, y, z] = q;
  const R = [
    [w * w + x * x - y * y - z * z, 2 * (x * y - w * z), 2 * (x * z + w * y)],
    [2 * (x * y + w * z), w * w - x * x + y * y - z * z, 2 * (y * z - w * x)],
    [2 * (x * z - w * y), 2 * (y * z + w * x), w * w - x * x - y * y + z * z],
  ];
  const t = [0, 1, 2].map((k) => cb[k] - (R[k][0] * ca[0] + R[k][1] * ca[1] + R[k][2] * ca[2]));
  let sq = 0;
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      const v = R[k][0] * a[i][0] + R[k][1] * a[i][1] + R[k][2] * a[i][2] + t[k] - b[i][k];
      sq += v * v;
    }
  }
  return { R, t, rmsd: Math.sqrt(sq / n) };
}

function apply(R: Mat3, t: number[], p: number[]): number[] {
  return [0, 1, 2].map((k) => R[k][0] * p[0] + R[k][1] * p[1] + R[k][2] * p[2] + t[k]);
}

async function readText(src: string): Promise<string> {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${src}`);
    return res.text();
  }
  return readFileSync(src, 'utf8');
}

async function main(): Promise<void> {
  const [structureSrc, mdSrc] = process.argv.slice(2);
  if (!structureSrc || !mdSrc) {
    console.error('usage: register-memprotmd.ts <structure.pdb | URL> <memprotmd.pdb>');
    process.exit(1);
  }
  const structure = parseCa(await readText(structureSrc));
  const md = parseCa(await readText(mdSrc));
  const mdSeq = md.map((c) => c.resName);

  // Chains of the structure, each with every place its sequence occurs in MemProtMD's model.
  const chains = [...new Set(structure.map((c) => c.chain))].map((id) => {
    const cas = structure.filter((c) => c.chain === id);
    const seq = cas.map((c) => c.resName);
    const starts: number[] = [];
    for (let i = 0; i + seq.length <= mdSeq.length; i++) {
      let ok = true;
      for (let j = 0; j < seq.length && ok; j++) ok = mdSeq[i + j] === seq[j];
      if (ok) starts.push(i);
    }
    return { id, cas, starts };
  });
  const usable = chains.filter((c) => c.starts.length > 0 && c.cas.length >= 10);
  for (const c of chains) {
    if (!usable.includes(c)) console.warn(`chain ${c.id}: no exact sequence match, skipped`);
  }
  if (usable.length === 0) throw new Error('no chain of the structure matches MemProtMD’s model');

  // Try each placement of the anchor chain; give every other chain its best
  // unused placement under that superposition; keep the best overall.
  const anchor = usable.reduce((a, b) => (b.cas.length > a.cas.length ? b : a));
  let best: { pairs: [number[], number[]][]; rmsd: number } | null = null;
  for (const start of anchor.starts) {
    const fit = superpose(
      anchor.cas.map((c) => c.p),
      anchor.cas.map((_, j) => md[start + j].p),
    );
    const used = new Set<number>([start]);
    const pairs: [number[], number[]][] = anchor.cas.map((c, j) => [c.p, md[start + j].p]);
    for (const chain of usable) {
      if (chain === anchor) continue;
      let pick = -1;
      let pickSq = Infinity;
      for (const s of chain.starts) {
        if (used.has(s)) continue;
        let sq = 0;
        chain.cas.forEach((c, j) => {
          const q = apply(fit.R, fit.t, c.p);
          const r = md[s + j].p;
          sq += (q[0] - r[0]) ** 2 + (q[1] - r[1]) ** 2 + (q[2] - r[2]) ** 2;
        });
        if (sq < pickSq) {
          pickSq = sq;
          pick = s;
        }
      }
      if (pick < 0) continue;
      used.add(pick);
      chain.cas.forEach((c, j) => pairs.push([c.p, md[pick + j].p]));
    }
    const all = superpose(
      pairs.map((p) => p[0]),
      pairs.map((p) => p[1]),
    );
    if (!best || all.rmsd < best.rmsd) best = { pairs, rmsd: all.rmsd };
  }
  const final = superpose(
    best!.pairs.map((p) => p[0]),
    best!.pairs.map((p) => p[1]),
  );
  const round = (v: number) => Math.round(v * 1e6) / 1e6;
  console.log(
    JSON.stringify(
      {
        rotation: final.R.map((row) => row.map(round)),
        translation: final.t.map(round),
        rmsd: Math.round(final.rmsd * 1000) / 1000,
        matched: best!.pairs.length,
      },
      null,
      2,
    ),
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
