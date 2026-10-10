/**
 * Regenerate the figures in docs/figures/ from the example structures.
 *
 *   npm run docs:figures
 *
 * The diagrams are drawn by the real `<topology-display>` under jsdom (as in
 * the unit tests), so they show exactly what the component draws; the plots
 * are drawn here from the parsed structures.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'figures');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
const g = globalThis as Record<string, unknown>;
for (const key of [
  'window',
  'document',
  'customElements',
  'HTMLElement',
  'SVGElement',
  'Node',
  'Element',
  'DocumentFragment',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'CustomEvent',
  'Event',
  'MutationObserver',
]) {
  // Overwrite Node's own Event classes too: jsdom only dispatches its own.
  g[key] = (dom.window as unknown as Record<string, unknown>)[key];
}

const { parsePdb, parseDsspMmcif, mergeProteinData } = await import('../src/parser/index.js');
await import('../src/index.js');
const { isTransmembrane } = await import('../src/orientation/index.js');
const { DEMO_DISTORTIONS, inSimulationFrame } = await import('../src/demo-distortions.js');
type TopologyDisplay = import('../src/components/topology-display.js').TopologyDisplay;
type ProteinData = import('../src/types.js').ProteinData;

const tick = () => new Promise((r) => setTimeout(r, 0));

function protein(id: string): ProteinData {
  return mergeProteinData(
    id,
    parsePdb(read(`examples/${id}.pdb`)),
    parseDsspMmcif(read(`examples/${id}.dssp.cif`)),
  );
}

/** The chain-picker icons of the last {@link diagram}. */
let icons: SVGSVGElement[] = [];

/** The 2-D topology svg the component draws for `data`, with `attrs` set. */
async function diagram(
  data: ProteinData,
  attrs: Record<string, string>,
  distortions?: string,
): Promise<SVGSVGElement> {
  const el = document.createElement('topology-display') as TopologyDisplay;
  el.setAttribute('theme', 'light');
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  if (distortions) el.distortions = distortions;
  el.proteinData = data;
  await tick();
  icons = [...el.shadowRoot!.querySelectorAll('.chain-violin svg')].map(
    (i) => i.cloneNode(true) as SVGSVGElement,
  );
  const svg = el.shadowRoot!.querySelector(
    'svg[aria-label*="unrolling"], svg[aria-label*="highlighted"]',
  ) as SVGSVGElement;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  el.remove();
  return copy;
}

/** Wrap svg bodies, stacked vertically with a caption above each, on a white page. */
function stack(
  panels: { title: string; svg: SVGSVGElement; crop?: [number, number] }[],
  footer?: { height: number; body: (y: number) => string },
): string {
  const pad = 8;
  const titleH = 18;
  let y = 0;
  let width = 0;
  const parts: string[] = [];
  for (const { title, svg, crop } of panels) {
    const [minX, minY, w, h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const x0 = crop ? crop[0] : minX;
    const cw = crop ? crop[1] - crop[0] : w;
    parts.push(
      `<text x="${pad}" y="${y + titleH - 4}" font-family="sans-serif" font-size="13" fill="#222">${title}</text>`,
    );
    svg.setAttribute('x', `${pad}`);
    svg.setAttribute('y', `${y + titleH}`);
    svg.setAttribute('width', `${cw}`);
    svg.setAttribute('height', `${h}`);
    svg.setAttribute('viewBox', `${x0} ${minY} ${cw} ${h}`);
    parts.push(svg.outerHTML);
    y += titleH + h + pad;
    width = Math.max(width, cw + 2 * pad);
  }
  if (footer) {
    parts.push(footer.body(y));
    y += footer.height;
  }
  return page(width, y, parts.join('\n'));
}

/** A row of coloured dots naming the loop control-point kinds (render-2d's debug fills). */
function loopLegend(x: number, y: number): string {
  const kinds: [string, string][] = [
    ['#1f77b4', 'end of element'],
    ['#2ca02c', 'tangent point'],
    ['#d62728', 'extreme point'],
  ];
  return kinds
    .map(
      ([fill, label], i) =>
        `<circle cx="${x + i * 130}" cy="${y}" r="4" fill="${fill}"/>` +
        `<text x="${x + i * 130 + 8}" y="${y + 4}" font-family="sans-serif" font-size="12" fill="#222">${label}</text>`,
    )
    .join('');
}

function page(width: number, height: number, body: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(width)}" height="${Math.ceil(height)}" ` +
    `viewBox="0 0 ${Math.ceil(width)} ${Math.ceil(height)}">\n` +
    `<rect width="100%" height="100%" fill="#fff"/>\n${body}\n</svg>\n`
  );
}

/** Cα height against residue index for each chain, with the ±threshold lines. */
function chainSelectionPlot(data: ProteinData, threshold: number): string {
  const W = 640;
  const panelH = 150;
  const left = 46;
  const right = 12;
  const top = 10;
  const zMax =
    10 *
    Math.ceil(Math.max(...data.chains.flatMap((c) => c.calphas.map((ca) => Math.abs(ca.z)))) / 10);
  const parts: string[] = [];
  let y0 = top;
  for (const chain of data.chains) {
    const n = chain.calphas.length;
    const tm = isTransmembrane(chain.calphas, { threshold });
    const sx = (i: number) => left + (i / Math.max(1, n - 1)) * (W - left - right);
    const sy = (z: number) =>
      y0 + ((zMax - Math.max(-zMax, Math.min(zMax, z))) / (2 * zMax)) * panelH;
    parts.push(
      `<rect x="${left}" y="${sy(threshold)}" width="${W - left - right}" height="${sy(-threshold) - sy(threshold)}" fill="#e8eef6"/>`,
    );
    for (const z of [threshold, -threshold]) {
      parts.push(
        `<line x1="${left}" x2="${W - right}" y1="${sy(z)}" y2="${sy(z)}" stroke="#4a6fa5" stroke-dasharray="4 3"/>`,
      );
    }
    parts.push(
      `<line x1="${left}" x2="${W - right}" y1="${sy(0)}" y2="${sy(0)}" stroke="#999" stroke-width="0.5"/>`,
    );
    const pts = chain.calphas.map((c, i) => `${sx(i).toFixed(1)},${sy(c.z).toFixed(1)}`).join(' ');
    parts.push(
      `<polyline points="${pts}" fill="none" stroke="${tm ? '#c0392b' : '#777'}" stroke-width="1.2"/>`,
    );
    for (const z of [zMax, threshold, 0, -threshold, -zMax]) {
      parts.push(
        `<text x="${left - 4}" y="${sy(z) + 4}" text-anchor="end" font-family="sans-serif" font-size="10" fill="#444">${z}</text>`,
      );
    }
    parts.push(
      `<text x="${left + 6}" y="${y0 + 12}" font-family="sans-serif" font-size="12" fill="#222">` +
        `Chain ${chain.chainId} (${n} Cα): ${tm ? 'transmembrane' : 'not transmembrane'}</text>`,
    );
    parts.push(
      `<rect x="${left}" y="${y0}" width="${W - left - right}" height="${panelH}" fill="none" stroke="#bbb"/>`,
    );
    y0 += panelH + 24;
  }
  parts.push(
    `<text x="${(left + W - right) / 2}" y="${y0 - 8}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#444">residue (in file order)</text>`,
  );
  parts.push(
    `<text transform="translate(12 ${(top + y0) / 2}) rotate(-90)" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#444">Cα z (Å)</text>`,
  );
  return page(W, y0, parts.join('\n'));
}

mkdirSync(OUT, { recursive: true });
const write = (name: string, text: string) => {
  writeFileSync(join(OUT, name), text);
  console.log(`wrote docs/figures/${name}`);
};

const g53 = protein('5g53');

write('chain-selection-5g53.svg', chainSelectionPlot(g53, 12));

{
  const svg = await diagram(g53, { debug: 'loops' });
  const [minX, , w] = svg.getAttribute('viewBox')!.split(' ').map(Number);
  write(
    'loops-5g53.svg',
    stack([{ title: '5G53 chain A, debug="loops"', svg, crop: [minX, minX + Math.min(w, 560)] }], {
      height: 20,
      body: (y) => loopLegend(16, y + 8),
    }),
  );
}

{
  const reg = DEMO_DISTORTIONS['5g53']?.registration;
  if (!reg) throw new Error('no 5G53 registration in src/demo-distortions.ts');
  const moved = inSimulationFrame(g53, reg);
  const text = read('demo/distortions/5g53.pdb');
  const panels = [];
  for (const detail of ['bulk', 'annular', 'local'] as const) {
    const svg = await diagram(moved, { 'membrane-detail': detail }, text);
    panels.push({ title: `membrane-detail="${detail}"`, svg });
  }
  write('membrane-detail-5g53.svg', stack(panels));
}

{
  await diagram(g53, {});
  const parts: string[] = [];
  let x = 8;
  for (const icon of icons) {
    const size = 120;
    icon.setAttribute('x', `${x}`);
    icon.setAttribute('y', '8');
    icon.setAttribute('width', `${size}`);
    icon.setAttribute('height', `${size}`);
    parts.push(icon.outerHTML);
    x += size + 16;
  }
  write('chain-icons-5g53.svg', page(x - 8, 120 + 16, parts.join('\n')));
}
