import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import type { Calpha, SecondaryStructureSegment } from '../src/types.js';

// Minimal DOM so the custom element renders.
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
const g = globalThis as unknown as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.customElements = dom.window.customElements;
g.SVGElement = dom.window.SVGElement;
g.Node = dom.window.Node;

const { TopologyDisplay } = await import('../src/components/topology-display.js');

const pdb = readFileSync('/tmp/2omf.pdb', 'utf8').split('\n');
const calphas: Calpha[] = [];
const seg: SecondaryStructureSegment[] = [];
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
    if (!Number.isNaN(start) && !Number.isNaN(end)) seg.push({ start, end, type: 'strand' });
  }
}

const el = new TopologyDisplay();
dom.window.document.body.appendChild(el);
el.proteinData = {
  pdbId: '2omf',
  chains: [{ chainId: 'A', residueCount: calphas.length, segments: seg, calphas }],
};

const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
const polys = Array.from(svg!.querySelectorAll('polygon')).filter(
  (p) => p.getAttribute('fill') === '#6ea76d',
);
console.log(`green polygons: ${polys.length}`);

// Dump the arrowhead vertices for every strand polygon and flag self-crossing
// or barbed (concave) joins between the body edge and the arrowhead shoulder.
for (let pi = 0; pi < polys.length; pi++) {
  const pts = polys[pi]
    .getAttribute('points')!
    .trim()
    .split(/\s+/)
    .map((p) => p.split(',').map(Number));
  const n = pts.length;
  if (n < 7) continue;
  const arrowStart = (n - 5) >> 1;
  const blL = pts[arrowStart - 1]; // body-last left
  const ls = pts[arrowStart]; // left shoulder
  const lw = pts[arrowStart + 1]; // left wing
  const tip = pts[arrowStart + 2];
  const rs = pts[arrowStart + 4];
  const blR = pts[n - arrowStart]; // body-last right

  // Arrow axis = base centre -> tip.  Body axis = body centre -> base centre.
  const baseC = [(ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2];
  const bodyC = [(blL[0] + blR[0]) / 2, (blL[1] + blR[1]) / 2];
  const bodyAng = (Math.atan2(baseC[1] - bodyC[1], baseC[0] - bodyC[0]) * 180) / Math.PI;
  const arrowAng = (Math.atan2(tip[1] - baseC[1], tip[0] - baseC[0]) * 180) / Math.PI;
  const skew = ((arrowAng - bodyAng + 540) % 360) - 180;
  // Wing flare: is the left wing farther from the axis than the shoulder? (normal)
  // Is the wing BEHIND the shoulder along the axis (barb pokes back into body)?
  const axx = tip[0] - baseC[0];
  const axy = tip[1] - baseC[1];
  const axl = Math.hypot(axx, axy) || 1;
  const wingAxial = ((lw[0] - baseC[0]) * axx + (lw[1] - baseC[1]) * axy) / axl;
  const shoulderAxial = ((ls[0] - baseC[0]) * axx + (ls[1] - baseC[1]) * axy) / axl;
  const flag = Math.abs(skew) > 20 ? '  <<< SKEWED' : '';
  console.log(
    `poly ${pi}: bodyAng=${bodyAng.toFixed(0)} arrowAng=${arrowAng.toFixed(0)} skew=${skew.toFixed(0)}deg  wingAxial=${wingAxial.toFixed(1)} shoulderAxial=${shoulderAxial.toFixed(1)}${flag}`,
  );
}
