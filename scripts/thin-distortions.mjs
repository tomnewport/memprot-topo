#!/usr/bin/env node
/**
 * Thin a MemProtMD bilayer-distortions PDB for shipping with the demo: keeps
 * every header and colour-scale record, every `rim-every`-th rim point (`O` and
 * `I` mesh positions) and one interior point per `grid` Å square per leaflet.
 *
 *   node scripts/thin-distortions.mjs <in.pdb> <out.pdb> [grid=2] [rim-every=2]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [input, output, gridArg = '2', rimArg = '2'] = process.argv.slice(2);
if (!input || !output) {
  console.error('usage: thin-distortions.mjs <in.pdb> <out.pdb> [grid=2] [rim-every=2]');
  process.exit(1);
}
const grid = Number(gridArg);
const rimEvery = Number(rimArg);

const seen = new Set();
let rim = 0;
let kept = 0;
let points = 0;
const out = [];
for (const line of readFileSync(input, 'utf8').split('\n')) {
  if (!line.startsWith('ATOM') && !line.startsWith('HETATM')) {
    if (line) out.push(line);
    continue;
  }
  const resName = line.slice(17, 20);
  if (resName.endsWith('CC')) {
    out.push(line);
    continue;
  }
  points++;
  if (resName[1] === 'O' || resName[1] === 'I') {
    if (rim++ % rimEvery !== 0) continue;
  } else {
    const x = Number(line.slice(30, 38));
    const y = Number(line.slice(38, 46));
    const key = `${resName[0]} ${Math.round(x / grid)} ${Math.round(y / grid)}`;
    if (seen.has(key)) continue;
    seen.add(key);
  }
  kept++;
  out.push(line);
}
writeFileSync(output, out.join('\n') + '\n');
console.log(`${input}: kept ${kept} of ${points} points`);
