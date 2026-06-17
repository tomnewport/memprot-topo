import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';

// Bundle the component + a tiny bootstrap that injects real 2omf data.
const pdb = readFileSync('/tmp/2omf.pdb', 'utf8').split('\n');
const calphas = [];
const seg = [];
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
// Optionally widen strands to mimic DSSP's more generous E-assignment, pushing
// the termini into the curved β-turn region (env EXT=2).
const EXT = parseInt(process.env.EXT || '0');
if (EXT) for (const s of seg) { s.start -= EXT; s.end += EXT; }
const data = {
  pdbId: '2omf',
  chains: [{ chainId: 'A', residueCount: calphas.length, segments: seg, calphas }],
};

const entry = `
import '${process.cwd()}/src/index.ts';
import { TopologyDisplay } from '${process.cwd()}/src/components/topology-display.ts';
window.__render = () => {
  const el = new TopologyDisplay();
  el.id = 'td';
  document.body.appendChild(el);
  el.proteinData = ${JSON.stringify(data)};
};
`;
writeFileSync('/tmp/entry.ts', entry);

const result = await build({
  entryPoints: ['/tmp/entry.ts'],
  bundle: true,
  format: 'iife',
  write: false,
  absWorkingDir: process.cwd(),
  define: { __COMMIT__: '"dev"', __BUILD_DATE__: '"2026-01-01"' },
});
const js = result.outputFiles[0].text;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1400, height: 700 } });
await page.setContent('<!DOCTYPE html><html><body></body></html>');
await page.addScriptTag({ content: js });
await page.evaluate(() => window.__render());
await page.waitForTimeout(500);

// Screenshot the whole strip.
const el = await page.$('#td');
await el.screenshot({ path: '/tmp/2omf-full.png' });
console.log('wrote /tmp/2omf-full.png');

// Pull every green polygon + every grey loop path in absolute plot-group coords,
// then re-render a tight high-res crop around a chosen arc/z window.
const scene = await page.evaluate(() => {
  const td = document.getElementById('td');
  const root = td.shadowRoot;
  const plot = root.querySelector('svg g[transform*="scale"]');
  const ctm = plot.getAttribute('transform');
  const grab = (sel) =>
    Array.from(root.querySelectorAll(sel)).map((e) => ({
      tag: e.tagName,
      points: e.getAttribute('points'),
      d: e.getAttribute('d'),
      fill: e.getAttribute('fill'),
      stroke: e.getAttribute('stroke'),
    }));
  return { ctm, polys: grab('polygon'), paths: grab('path') };
});
console.log('plot transform:', scene.ctm);

// Render a standalone SVG with the same plot transform, zoomed into a window.
import('node:fs').then(({ writeFileSync }) => {});
const { writeFileSync: wf } = await import('node:fs');
const body = [...scene.polys, ...scene.paths]
  .map((e) => {
    if (e.tag === 'polygon')
      return `<polygon points="${e.points}" fill="${e.fill}" stroke="${e.stroke || '#3a6b39'}" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`;
    if (e.tag === 'path' && e.d)
      return `<path d="${e.d}" fill="none" stroke="${e.stroke || '#888'}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;
    return '';
  })
  .join('\n');
// Compute bbox of all green polygons in svg-root coords using the plot transform
// translate(tx,ty) scale(sx,sy).
const m = scene.ctm.match(/translate\(([-\d.]+),\s*([-\d.]+)\)\s*scale\(([-\d.]+),\s*([-\d.]+)\)/);
const [tx, ty, sx, sy] = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4])];
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
for (const p of scene.polys) {
  if (p.fill !== '#6ea76d' || !p.points) continue;
  for (const pair of p.points.trim().split(/\s+/)) {
    const [a, b] = pair.split(',').map(Number);
    const X = tx + sx * a;
    const Y = ty + sy * b;
    if (X < minX) minX = X;
    if (X > maxX) maxX = X;
    if (Y < minY) minY = Y;
    if (Y > maxY) maxY = Y;
  }
}
const pad = 10;
const vbX = minX - pad, vbY = minY - pad, vbW = maxX - minX + 2 * pad, vbH = maxY - minY + 2 * pad;
const scale = 4;
const cropSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(vbW * scale)}" height="${Math.round(vbH * scale)}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}"><rect x="${vbX}" y="${vbY}" width="${vbW}" height="${vbH}" fill="white"/><g transform="${scene.ctm}">${body}</g></svg>`;
wf('/tmp/2omf-crop.svg', cropSvg);
console.log(`viewBox ${vbX.toFixed(0)} ${vbY.toFixed(0)} ${vbW.toFixed(0)} ${vbH.toFixed(0)}`);

const page2 = await browser.newPage({ viewport: { width: Math.round(vbW * scale), height: Math.round(vbH * scale) } });
await page2.setContent(`<!DOCTYPE html><html><body style="margin:0">${cropSvg}</body></html>`);
await page2.waitForTimeout(150);
await page2.screenshot({ path: '/tmp/2omf-zoom.png' });
console.log('wrote /tmp/2omf-zoom.png');
await browser.close();
