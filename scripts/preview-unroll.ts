/**
 * Offline preview: build a synthetic 7-TM bundle, render with TopologyDisplay
 * through jsdom, and write the resulting SVG to disk so we can inspect the
 * unrolled visual without needing network access to MemProtMD.
 *
 * Run: npx tsx scripts/preview-unroll.ts
 */

import { writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import type { Calpha, ProteinData } from '../src/types.js';

function helix(
  startRes: number,
  nResidues: number,
  centre: { x: number; y: number },
  zStart: number,
  zEnd: number,
  phase = 0,
): Calpha[] {
  // Idealised TM helix: 3.6 residues/turn, radius 2.3 Å, rise = (zEnd-zStart)/(n-1).
  const out: Calpha[] = [];
  const radius = 2.3;
  for (let i = 0; i < nResidues; i++) {
    const theta = phase + (i * 2 * Math.PI) / 3.6;
    out.push({
      resSeq: startRes + i,
      iCode: '',
      x: centre.x + radius * Math.cos(theta),
      y: centre.y + radius * Math.sin(theta),
      z: zStart + (i * (zEnd - zStart)) / (nResidues - 1),
    });
  }
  return out;
}

function loop(
  startRes: number,
  startPos: { x: number; y: number; z: number },
  endPos: { x: number; y: number; z: number },
  nResidues: number,
): Calpha[] {
  // Smoothly arc between endpoints, lifting away from the membrane.
  const out: Calpha[] = [];
  const zSign = startPos.z > 0 ? 1 : -1;
  const lift = 6;
  for (let i = 0; i < nResidues; i++) {
    const t = (i + 1) / (nResidues + 1);
    const x = startPos.x + (endPos.x - startPos.x) * t;
    const y = startPos.y + (endPos.y - startPos.y) * t;
    const arch = Math.sin(t * Math.PI) * lift * zSign;
    const z = startPos.z + (endPos.z - startPos.z) * t + arch;
    out.push({ resSeq: startRes + i, iCode: '', x, y, z });
  }
  return out;
}

function syntheticGPCR(): ProteinData {
  // 7 helices on a ring of radius 8 Å, alternating direction with loops linking
  // them on the appropriate side of the bilayer.
  const ringR = 8;
  const helixLen = 24;
  const loopLen = 6;
  const calphas: Calpha[] = [];
  const segments: { start: number; end: number; type: 'helix' }[] = [];

  let res = 1;
  for (let h = 0; h < 7; h++) {
    const theta = (h * 2 * Math.PI) / 7;
    const centre = { x: ringR * Math.cos(theta), y: ringR * Math.sin(theta) };
    const goingUp = h % 2 === 0;
    const zStart = goingUp ? -18 : 18;
    const zEnd = goingUp ? 18 : -18;

    const helResidues = helix(res, helixLen, centre, zStart, zEnd, theta);
    segments.push({ start: res, end: res + helixLen - 1, type: 'helix' });
    calphas.push(...helResidues);
    res += helixLen;

    if (h < 6) {
      const last = helResidues[helResidues.length - 1];
      const nextTheta = ((h + 1) * 2 * Math.PI) / 7;
      const nextCentre = { x: ringR * Math.cos(nextTheta), y: ringR * Math.sin(nextTheta) };
      const nextGoingUp = (h + 1) % 2 === 0;
      const nextZStart = nextGoingUp ? -18 : 18;
      const loopResidues = loop(
        res,
        { x: last.x, y: last.y, z: last.z },
        { x: nextCentre.x + 1, y: nextCentre.y + 1, z: nextZStart },
        loopLen,
      );
      calphas.push(...loopResidues);
      res += loopLen;
    }
  }

  return {
    pdbId: 'synth-gpcr',
    chains: [{ chainId: 'A', residueCount: calphas.length, segments, calphas }],
  };
}

function syntheticBarrel(): ProteinData {
  // 16-strand β-barrel, radius 11 Å, strands tilted ~37° to membrane normal.
  const n = 16;
  const ringR = 11;
  const strandLen = 12;
  const loopLen = 5;
  const calphas: Calpha[] = [];
  const segments: { start: number; end: number; type: 'strand' }[] = [];

  let res = 1;
  // β-strand residues are spaced ~3.4 Å along the strand axis.
  const riseTotal = 30; // z span across the membrane
  const xyShear = riseTotal * Math.tan((37 * Math.PI) / 180); // ~22 Å of tangential shift
  for (let s = 0; s < n; s++) {
    const theta0 = (s * 2 * Math.PI) / n;
    const goingUp = s % 2 === 0;
    const zStart = goingUp ? -15 : 15;
    const zEnd = goingUp ? 15 : -15;
    // Sweep tangentially along the barrel surface as we traverse z (gives the
    // ~37° tilt).
    const segResidues: Calpha[] = [];
    for (let i = 0; i < strandLen; i++) {
      const t = i / (strandLen - 1);
      const theta = theta0 + (goingUp ? 1 : -1) * (xyShear / ringR) * (t - 0.5);
      segResidues.push({
        resSeq: res + i,
        iCode: '',
        x: ringR * Math.cos(theta),
        y: ringR * Math.sin(theta),
        z: zStart + t * (zEnd - zStart),
      });
    }
    segments.push({ start: res, end: res + strandLen - 1, type: 'strand' });
    calphas.push(...segResidues);
    res += strandLen;

    if (s < n - 1) {
      const last = segResidues[segResidues.length - 1];
      const nextTheta0 = ((s + 1) * 2 * Math.PI) / n;
      const nextGoingUp = (s + 1) % 2 === 0;
      const nextZStart = nextGoingUp ? -15 : 15;
      const loopResidues = loop(
        res,
        { x: last.x, y: last.y, z: last.z },
        { x: ringR * Math.cos(nextTheta0), y: ringR * Math.sin(nextTheta0), z: nextZStart },
        loopLen,
      );
      calphas.push(...loopResidues);
      res += loopLen;
    }
  }

  return {
    pdbId: 'synth-barrel',
    chains: [{ chainId: 'A', residueCount: calphas.length, segments, calphas }],
  };
}

async function main(): Promise<void> {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><div id="gpcr"></div><div id="barrel"></div></body></html>',
  );
  // Wire up the minimal DOM globals so the web component can register itself
  // when imported. Node's globalThis is intentionally loose-typed here.
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = dom.window;
  g.document = dom.window.document;
  g.HTMLElement = dom.window.HTMLElement;
  g.customElements = dom.window.customElements;

  await import('../src/components/topology-display.js');
  const { TopologyDisplay } = await import('../src/components/topology-display.js');

  for (const [id, data] of [
    ['gpcr', syntheticGPCR()],
    ['barrel', syntheticBarrel()],
  ] as const) {
    const el = new TopologyDisplay();
    dom.window.document.getElementById(id)!.appendChild(el);
    el.proteinData = data;
    const svg = el.shadowRoot!.querySelector('svg')!;
    writeFileSync(`./preview-${id}.svg`, svg.outerHTML);
    console.log(`Wrote preview-${id}.svg`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
