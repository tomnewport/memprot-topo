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
const { parseMmcifLoops, mmcifCategory } = await import('../src/parser/mmcif-tokenizer.js');
const { effectiveSsSegments } = await import('../src/layout/runs.js');
const { DEFAULT_MIN_HELIX_LENGTH, DEFAULT_MIN_STRAND_LENGTH } =
  await import('../src/layout/constants.js');
const { projectLocalAxis } = await import('../src/unroll/helix-axis.js');
const { fitBSpline, sampleBSpline } = await import('../src/unroll/bspline.js');
const { analyseBarrel } = await import('../src/contacts/beta-sheet.js');
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
  panels: {
    title: string;
    svg: SVGSVGElement;
    crop?: [number, number];
    cropY?: [number, number];
  }[],
  footer?: { height: number; body: (y: number) => string },
): string {
  const pad = 8;
  const titleH = 18;
  let y = 0;
  let width = 0;
  const parts: string[] = [];
  for (const { title, svg, crop, cropY } of panels) {
    const [minX, vMinY, w, vh] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    const x0 = crop ? crop[0] : minX;
    const cw = crop ? crop[1] - crop[0] : w;
    const minY = cropY ? cropY[0] : vMinY;
    const h = cropY ? cropY[1] - cropY[0] : vh;
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

type Vec = { x: number; y: number; z: number };
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;

/** Centroid and principal axes (largest variance first) of `pts`, by power iteration. */
function principalAxes(pts: Vec[]): { centre: Vec; axes: Vec[] } {
  const n = pts.length;
  const centre = pts.reduce((c, p) => ({ x: c.x + p.x / n, y: c.y + p.y / n, z: c.z + p.z / n }), {
    x: 0,
    y: 0,
    z: 0,
  });
  const d = pts.map((p) => sub(p, centre));
  const k = ['x', 'y', 'z'] as const;
  const M = k.map((a) => k.map((b) => d.reduce((s, v) => s + v[a] * v[b], 0)));
  const axes: Vec[] = [];
  for (let e = 0; e < 2; e++) {
    let v: Vec = e === 0 ? sub(pts[n - 1], pts[0]) : { x: 0.3, y: 0.5, z: 0.8 };
    for (let it = 0; it < 200; it++) {
      for (const a of axes) {
        const t = dot(v, a);
        v = { x: v.x - t * a.x, y: v.y - t * a.y, z: v.z - t * a.z };
      }
      const w = { x: dot(v, vec(M[0])), y: dot(v, vec(M[1])), z: dot(v, vec(M[2])) };
      const len = Math.hypot(w.x, w.y, w.z);
      v = { x: w.x / len, y: w.y / len, z: w.z / len };
    }
    axes.push(v);
  }
  return { centre, axes };
}
const vec = (r: number[]): Vec => ({ x: r[0], y: r[1], z: r[2] });

/**
 * One secondary-structure element seen side-on: its Cα (grey), the same Cα
 * projected onto the sliding-window local axis (as `unrollChain` does), and
 * the B-spline the unroller fits through the projected points.
 */
function elementAxisPanel(pts: Vec[], windowHalf: number, colour: string): SVGSVGElement {
  const S = 14;
  const pad = 14;
  const projected = projectLocalAxis(
    pts,
    pts.map(() => true),
    windowHalf,
  );
  const k = Math.max(4, Math.ceil(pts.length / 4));
  const spline = sampleBSpline(fitBSpline(projected, k), (pts.length - 1) * 16 + 1).samples;
  const { centre, axes } = principalAxes(pts);
  const [e1, e2] = axes;
  const flip = dot(sub(pts[pts.length - 1], pts[0]), e1) < 0 ? -1 : 1;
  const uv = (p: Vec): [number, number] => [
    flip * dot(sub(p, centre), e1),
    dot(sub(p, centre), e2),
  ];
  const all = [...pts, ...projected, ...spline].map(uv);
  const uMin = Math.min(...all.map((p) => p[0]));
  const uMax = Math.max(...all.map((p) => p[0]));
  const vMax = Math.max(...all.map((p) => Math.abs(p[1])));
  const w = (uMax - uMin) * S + 2 * pad;
  const h = 2 * vMax * S + 2 * pad;
  const xy = (p: Vec) => {
    const [u, v] = uv(p);
    return [pad + (u - uMin) * S, pad + (vMax - v) * S].map((n) => n.toFixed(1));
  };
  const line = (ps: Vec[], attrs: string) =>
    `<polyline points="${ps.map((p) => xy(p).join(',')).join(' ')}" fill="none" ${attrs}/>`;
  const dots = (ps: Vec[], fill: string, r: number) =>
    ps
      .map((p) => {
        const [x, y] = xy(p);
        return `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
      })
      .join('');
  const body =
    line(pts, 'stroke="#aaa" stroke-width="1"') +
    dots(pts, '#888', 2.5) +
    line(spline, `stroke="${colour}" stroke-width="2.5"`) +
    dots(projected, colour, 2);
  const doc = new JSDOM(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(1)} ${h.toFixed(1)}">${body}</svg>`,
    { contentType: 'image/svg+xml' },
  ).window.document;
  return doc.documentElement as unknown as SVGSVGElement;
}

/** A legend row of coloured swatches. */
function swatches(x: number, y: number, items: [string, string][], step = 120): string {
  return items
    .map(
      ([fill, label], i) =>
        `<rect x="${x + i * step}" y="${y - 9}" width="12" height="12" fill="${fill}" stroke="#999" stroke-width="0.5"/>` +
        `<text x="${x + i * step + 16}" y="${y + 1}" font-family="sans-serif" font-size="11" fill="#222">${label}</text>`,
    )
    .join('');
}

const DSSP_CLASSES: [prefix: string, fill: string, label: string][] = [
  ['HELX_RH_AL', '#c0392b', 'α helix (H)'],
  ['HELX_RH_PI', '#e67e22', 'π helix (I)'],
  ['HELX_RH_3T', '#f4d03f', '3₁₀ helix (G)'],
  ['HELX_LH_PP', '#8e44ad', 'PPII (P)'],
  ['STRN', '#2471a3', 'strand, bridge (E, B)'],
  ['TURN', '#aab7b8', 'turn (T)'],
  ['BEND', '#d5dbdb', 'bend (S)'],
];

/**
 * One chain's residues, coloured by the DSSP class in `_struct_conf` and
 * `_struct_sheet_range`, above what the component draws by default and with
 * `ss-310="helix"`.
 */
function dsspClassStrip(cif: string, data: ProteinData, chainId: string): string {
  const chain = data.chains.find((c) => c.chainId === chainId)!;
  const res = chain.calphas.map((c) => c.resSeq);
  const r0 = Math.min(...res);
  const r1 = Math.max(...res);
  const left = 92;
  const px = 2;
  const W = left + (r1 - r0 + 1) * px + 12;
  const rowH = 16;
  const loops = parseMmcifLoops(cif);
  const cls = new Map<number, string>();
  for (const row of mmcifCategory(loops, '_struct_conf')) {
    if (row['beg_auth_asym_id'] !== chainId) continue;
    const c = DSSP_CLASSES.find(([p]) => row['conf_type_id'].startsWith(p));
    if (!c) continue;
    for (let r = +row['beg_auth_seq_id']; r <= +row['end_auth_seq_id']; r++) cls.set(r, c[1]);
  }
  for (const row of mmcifCategory(loops, '_struct_sheet_range')) {
    if (row['beg_auth_asym_id'] !== chainId) continue;
    for (let r = +row['beg_auth_seq_id']; r <= +row['end_auth_seq_id']; r++) cls.set(r, '#2471a3');
  }
  const min = { helix: DEFAULT_MIN_HELIX_LENGTH, strand: DEFAULT_MIN_STRAND_LENGTH };
  const drawn = (segs: typeof chain.segments) => {
    const m = new Map<number, string>();
    for (const s of effectiveSsSegments(segs, min)) {
      if (s.type === 'coil') continue;
      for (let r = s.start; r <= s.end; r++) m.set(r, s.type === 'helix' ? '#c0392b' : '#2471a3');
    }
    return m;
  };
  const with310 = mergeProteinData(
    data.pdbId,
    parsePdb(read(`examples/${data.pdbId}.pdb`)),
    parseDsspMmcif(cif, { helix310: true }),
  ).chains.find((c) => c.chainId === chainId)!;
  const rows: [string, Map<number, string>][] = [
    ['DSSP', cls],
    ['drawn', drawn(chain.segments)],
    ['ss-310="helix"', drawn(with310.segments)],
  ];
  const parts: string[] = [];
  let y = 8;
  for (const [label, m] of rows) {
    parts.push(
      `<text x="${left - 6}" y="${y + rowH - 4}" text-anchor="end" font-family="sans-serif" font-size="11" fill="#222">${label}</text>`,
    );
    parts.push(
      `<rect x="${left}" y="${y}" width="${(r1 - r0 + 1) * px}" height="${rowH}" fill="#fff" stroke="#bbb" stroke-width="0.5"/>`,
    );
    let r = r0;
    while (r <= r1) {
      const fill = m.get(r);
      let e = r;
      while (e + 1 <= r1 && m.get(e + 1) === fill) e++;
      if (fill)
        parts.push(
          `<rect x="${left + (r - r0) * px}" y="${y}" width="${(e - r + 1) * px}" height="${rowH}" fill="${fill}"/>`,
        );
      r = e + 1;
    }
    y += rowH + 6;
  }
  for (let t = Math.ceil(r0 / 50) * 50; t <= r1; t += 50) {
    const x = left + (t - r0 + 0.5) * px;
    parts.push(`<line x1="${x}" x2="${x}" y1="${y - 4}" y2="${y}" stroke="#444"/>`);
    parts.push(
      `<text x="${x}" y="${y + 11}" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#444">${t}</text>`,
    );
  }
  y += 30;
  parts.push(
    swatches(
      left,
      y,
      DSSP_CLASSES.slice(0, 4).map(([, f, l]) => [f, l]),
    ),
  );
  parts.push(
    swatches(
      left,
      y + 18,
      DSSP_CLASSES.slice(4).map(([, f, l]) => [f, l]),
      160,
    ),
  );
  return page(W, y + 30, parts.join('\n'));
}

/** A β-barrel chain from above: every Cα, the wall strands in ring order and the fitted cylinder. */
function barrelTopView(data: ProteinData, chainId: string): string {
  const chain = data.chains.find((c) => c.chainId === chainId)!;
  const segs = effectiveSsSegments(chain.segments, {
    helix: DEFAULT_MIN_HELIX_LENGTH,
    strand: DEFAULT_MIN_STRAND_LENGTH,
  });
  const a = analyseBarrel(chain.calphas, segs);
  const S = 6;
  const ext = Math.max(...chain.calphas.map((c) => Math.hypot(c.x - a.centre.x, c.y - a.centre.y)));
  const half = ext * S + 12;
  const W = 2 * half;
  const xy = (p: { x: number; y: number }) =>
    [half + (p.x - a.centre.x) * S, half - (p.y - a.centre.y) * S].map((n) => n.toFixed(1));
  const parts: string[] = [];
  parts.push(
    `<polyline points="${chain.calphas.map((c) => xy(c).join(',')).join(' ')}" fill="none" stroke="#ccc" stroke-width="1"/>`,
  );
  parts.push(
    `<circle cx="${half}" cy="${half}" r="${(a.radius * S).toFixed(1)}" fill="none" stroke="#4a6fa5" stroke-dasharray="5 4"/>`,
  );
  const wall = new Set(a.ringOrder);
  for (const s of a.strands) {
    const on = wall.has(s.index);
    parts.push(
      `<polyline points="${s.calphas.map((c) => xy(c).join(',')).join(' ')}" fill="none" stroke="${on ? '#2471a3' : '#999'}" stroke-width="${on ? 3 : 2}"/>`,
    );
  }
  a.ringOrder.forEach((idx, i) => {
    const [x, y] = xy(a.strands[idx].centroid);
    const r = Math.hypot(+x - half, +y - half);
    const lx = half + ((+x - half) / r) * (r + 16);
    const ly = half + ((+y - half) / r) * (r + 16);
    parts.push(
      `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#2471a3">${i + 1}</text>`,
    );
  });
  const lines = [
    `${data.pdbId.toUpperCase()} chain ${chainId}, seen down the membrane normal`,
    `n = ${a.strandCount}, S ≈ ${Math.round(a.shear)}, mean tilt ${a.tiltDeg.toFixed(0)}°, R = ${a.radius.toFixed(1)} Å`,
  ];
  lines.forEach((t, i) =>
    parts.push(
      `<text x="8" y="${W + 16 + i * 16}" font-family="sans-serif" font-size="12" fill="#222">${t}</text>`,
    ),
  );
  return page(W, W + 44, parts.join('\n'));
}

/** Apply an SVG `transform` made of translate() and scale() to a point. */
function applyTransform(t: string, [x, y]: [number, number]): [number, number] {
  const ops = [...t.matchAll(/(translate|scale)\(\s*([-\d.e]+)(?:[ ,]+([-\d.e]+))?\s*\)/g)];
  for (const [, op, a, b] of ops.reverse()) {
    const u = +a;
    const v = b === undefined ? (op === 'scale' ? u : 0) : +b;
    [x, y] = op === 'translate' ? [x + u, y + v] : [x * u, y * v];
  }
  return [x, y];
}

/**
 * Bounding box of the paths in `svg`, padded by `pad`. Both views draw paths
 * with absolute commands only, some inside translated or scaled groups.
 */
function pathBox(svg: SVGSVGElement, pad = 6): { crop: [number, number]; cropY: [number, number] } {
  let x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;
  for (const path of svg.querySelectorAll('path')) {
    const transforms: string[] = [];
    for (let n: Element | null = path; n && n !== svg; n = n.parentElement) {
      transforms.push(n.getAttribute('transform') ?? '');
    }
    const nums = (path.getAttribute('d') ?? '').match(/-?[\d.]+(?:e-?\d+)?/g)?.map(Number) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      let p: [number, number] = [nums[i], nums[i + 1]];
      for (const t of transforms) p = applyTransform(t, p);
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
  }
  return { crop: [x0 - pad, x1 + pad], cropY: [y0 - pad, y1 + pad] };
}

/** The diagram rolled into 3-D at each progress in `taus`. */
async function view3d(data: ProteinData, taus: number[]) {
  const name = `${data.pdbId.toUpperCase()} chain ${data.chains[0].chainId}`;
  const out: Parameters<typeof stack>[0] = [];
  for (const tau of taus) {
    const el = document.createElement('topology-display') as TopologyDisplay;
    el.setAttribute('theme', 'light');
    el.setAttribute('transition-time', '0');
    document.body.appendChild(el);
    el.proteinData = data;
    await tick();
    await el.setTransitionProgress(tau);
    await tick();
    const svg = el.shadowRoot!.querySelector('.svg-scroll svg') as SVGSVGElement;
    const copy = svg.cloneNode(true) as SVGSVGElement;
    out.push({ title: `${name}, progress ${tau}`, svg: copy, ...pathBox(copy) });
    el.remove();
  }
  return out;
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

write('dssp-classes-5g53.svg', dsspClassStrip(read('examples/5g53.dssp.cif'), g53, 'A'));

const omf = protein('2omf');
{
  const pick = (data: ProteinData, type: 'helix' | 'strand', minLen: number) => {
    const chain = data.chains[0];
    const seg = chain.segments.find((s) => s.type === type && s.end - s.start + 1 >= minLen)!;
    return {
      seg,
      pts: chain.calphas.filter((c) => c.resSeq >= seg.start && c.resSeq <= seg.end),
    };
  };
  const helix = pick(g53, 'helix', 20);
  const strand = pick(omf, 'strand', 12);
  write(
    'element-axis.svg',
    stack(
      [
        {
          title: `5G53 helix ${helix.seg.start}–${helix.seg.end}, window ±4`,
          svg: elementAxisPanel(helix.pts, 4, '#c0392b'),
        },
        {
          title: `2OMF strand ${strand.seg.start}–${strand.seg.end}, window ±2`,
          svg: elementAxisPanel(strand.pts, 2, '#2471a3'),
        },
      ],
      {
        height: 20,
        body: (y) =>
          `<circle cx="16" cy="${y + 8}" r="3" fill="#888"/>` +
          `<text x="24" y="${y + 12}" font-family="sans-serif" font-size="12" fill="#222">Cα</text>` +
          `<circle cx="70" cy="${y + 8}" r="3" fill="#555"/><line x1="80" x2="100" y1="${y + 8}" y2="${y + 8}" stroke="#555" stroke-width="2.5"/>` +
          `<text x="106" y="${y + 12}" font-family="sans-serif" font-size="12" fill="#222">projected onto the local axis, and the B-spline through them</text>`,
      },
    ),
  );
}

write('barrel-top-2omf.svg', barrelTopView(omf, 'A'));
{
  const svg = await diagram(omf, { 'show-contacts': '' });
  write(
    'barrel-unwrap-2omf.svg',
    stack([{ title: '2OMF chain A, show-contacts', svg, ...pathBox(svg, 16) }]),
  );
}

write('view3d.svg', stack([...(await view3d(g53, [0.5, 1])), ...(await view3d(omf, [1]))]));

{
  const el = document.createElement('topology-display') as TopologyDisplay;
  el.setAttribute('theme', 'light');
  el.setAttribute('dimension', '1');
  el.setAttribute('sequence-wrap', '60');
  document.body.appendChild(el);
  el.proteinData = g53;
  await tick();
  const svg = el.shadowRoot!.querySelector('svg.sequence-view') as SVGSVGElement;
  const copy = svg.cloneNode(true) as SVGSVGElement;
  el.remove();
  write(
    'sequence-view-5g53.svg',
    stack([{ title: '5G53 chain A, sequence-wrap="60"', svg: copy }]),
  );
}
