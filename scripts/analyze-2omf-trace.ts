import { readFileSync } from 'node:fs';
import { unrollChain } from '../src/unroll/index.js';
import type { Calpha, SecondaryStructureSegment } from '../src/types.js';

const pdb = readFileSync('/tmp/2omf.pdb', 'utf8').split('\n');

// Membrane half-thickness from OPM REMARK (z is already membrane normal).
const calphas: Calpha[] = [];
const sheets: SecondaryStructureSegment[] = [];
for (const line of pdb) {
  if (line.startsWith('ATOM') && line.substr(12, 4).trim() === 'CA' && line.substr(21, 1) === 'A') {
    calphas.push({
      resSeq: parseInt(line.substr(22, 4)),
      iCode: line.substr(26, 1).trim(),
      x: parseFloat(line.substr(30, 8)),
      y: parseFloat(line.substr(38, 8)),
      z: parseFloat(line.substr(46, 8)),
    });
  }
  if (line.startsWith('SHEET') && line.substr(21, 1) === 'A') {
    const start = parseInt(line.substr(22, 4));
    const end = parseInt(line.substr(33, 4));
    if (!Number.isNaN(start) && !Number.isNaN(end)) sheets.push({ start, end, type: 'strand' });
  }
}
console.log(`chain A: ${calphas.length} CA, ${sheets.length} strands`);

const unroll = unrollChain(calphas, { ssSegments: sheets });
console.log(`segments: ${unroll.segments.length}`);

// For each strand, find its dense samples and measure the bend angle of the
// trace at each interior sample (turn per ~Angstrom). A real beta strand should
// be near-straight (<~10 deg total). Flag big local turns near the termini.
const seg = unroll.segments[0];
const samples = seg.samples;
const res = seg.residues;

function strandSampleRange(s: SecondaryStructureSegment): [number, number] | null {
  const inside = res.filter((r) => r.resSeq >= s.start && r.resSeq <= s.end);
  if (inside.length < 2) return null;
  return [inside[0].sampleIndex, inside[inside.length - 1].sampleIndex];
}

let worstStrand = -1;
let worstTurn = 0;
for (const s of sheets) {
  const range = strandSampleRange(s);
  if (!range) continue;
  const [a, b] = range;
  // total direction change across the strand body, and worst single-step turn
  let prevAng: number | null = null;
  let maxTurn = 0;
  let net = 0;
  for (let i = a + 1; i <= b; i++) {
    const dx = samples[i].arc - samples[i - 1].arc;
    const dz = samples[i].z - samples[i - 1].z;
    if (Math.hypot(dx, dz) < 1e-9) continue;
    const ang = (Math.atan2(dz, dx) * 180) / Math.PI;
    if (prevAng !== null) {
      const t = ((ang - prevAng + 540) % 360) - 180;
      net += t;
      if (Math.abs(t) > Math.abs(maxTurn)) maxTurn = t;
    }
    prevAng = ang;
  }
  if (Math.abs(net) > Math.abs(worstTurn)) {
    worstTurn = net;
    worstStrand = s.start;
  }
  console.log(
    `strand ${s.start}-${s.end}: net turn ${net.toFixed(1)} deg, worst step ${maxTurn.toFixed(1)} deg`,
  );
}
console.log(
  `\nWorst-bending strand starts at residue ${worstStrand}, net ${worstTurn.toFixed(1)} deg`,
);
