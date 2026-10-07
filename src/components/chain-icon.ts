/**
 * Chain-picker icons (issue #20).
 *
 * Each chain is drawn on a 5 × 6 grid. The protein occupies the middle three
 * columns; the membrane occupies the middle two rows. Rows, top to bottom, with
 * h = half the membrane thickness and z measured from the membrane centre:
 *
 *   1. z > 2h          (more than half a thickness above the surface)
 *   2. h < z ≤ 2h      (surface to half a thickness above)
 *   3. 0 < z ≤ h       (upper leaflet)
 *   4. −h < z ≤ 0      (lower leaflet)
 *   5. −2h < z ≤ −h    (surface to half a thickness below)
 *   6. z ≤ −2h         (more than half a thickness below)
 *
 * Rows 2–5 are linear in z. Rows 1 and 6 compress everything beyond ±2h out to
 * a shared outer limit, so icons for chains of one protein stay comparable.
 *
 * A chain is drawn as a mirrored violin: a Gaussian KDE of its Cα z positions,
 * cut at the chain's extreme Cα, stacked by secondary structure (helix
 * innermost, then strand, then coil as a pale outer halo). A chain lying
 * entirely beyond ±2h is drawn instead as a rounded box hanging into the top
 * or bottom row, with the same layering by composition.
 */

import type { ChainData, SecondaryStructureSegment, SecondaryStructureType } from '../types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const ICON = {
  columns: 5,
  rows: 6,
  /** Grid cell size (px). */
  cellW: 12,
  cellH: 10,
  /** Padding around the frame (px). */
  pad: 1,
  /** Corner radius of the frame (px). */
  frameRadius: 4,
  /** Columns the protein may occupy (centred). */
  proteinColumns: 3,
  /** Violin samples per grid row: one keeps the outline to a few smooth curves. */
  samplesPerRow: 1,
  /** Corner radius (px) of the box used for chains entirely outside the membrane. */
  boxRadius: 5,
  /** Inset (px) of each inner layer from the free end of a box. */
  boxLayerInset: 1.2,
  /** Chain label font size (px) and its copy-number suffix. */
  labelSize: 22,
  suffixSize: 9,
};

/** Membrane geometry the icon is drawn against, in Å. */
export interface IconMembrane {
  /** z of the membrane centre (the datum all rows are measured from). */
  centre: number;
  /** Full bilayer thickness. */
  thickness: number;
}

/** Residue density (violin) or fraction (box) by secondary-structure type. */
export interface SsAmounts {
  helix: number;
  strand: number;
  coil: number;
}

export interface IconSample extends SsAmounts {
  /** Grid-row y: 0 = top of row 1, 6 = bottom of row 6. */
  gy: number;
  /** Total density (helix + strand + coil). */
  density: number;
}

export type ChainIconShape =
  | ({ kind: 'box'; row: 'top' | 'bottom' } & SsAmounts)
  | { kind: 'violin'; samples: IconSample[] };

/**
 * Map a z offset from the membrane centre (Å) to a grid y in row units, 0 at
 * the top of the grid and 6 at the bottom.
 */
export function zToGridY(dz: number, half: number, zOuter: number): number {
  const outer = Math.max(zOuter - 2 * half, 1e-6);
  if (dz >= 2 * half) return Math.max(0, 1 - (dz - 2 * half) / outer);
  if (dz <= -2 * half) return Math.min(6, 5 + (-dz - 2 * half) / outer);
  return 3 - dz / half;
}

/** Inverse of {@link zToGridY}. */
export function gridYToZ(gy: number, half: number, zOuter: number): number {
  const outer = Math.max(zOuter - 2 * half, 1e-6);
  if (gy <= 1) return 2 * half + (1 - gy) * outer;
  if (gy >= 5) return -2 * half - (gy - 5) * outer;
  return (3 - gy) * half;
}

/**
 * Outer |z| (Å, from the membrane centre) that rows 1 and 6 compress down to:
 * the furthest Cα across `chains`, but never less than 3h so the outer rows
 * keep a sensible scale for chains that barely leave the membrane.
 */
export function iconZOuter(chains: ChainData[], membrane: IconMembrane): number {
  const half = membrane.thickness / 2;
  let max = 3 * half;
  for (const c of chains) {
    for (const ca of c.calphas) max = Math.max(max, Math.abs(ca.z - membrane.centre));
  }
  return max;
}

function ssAt(segments: SecondaryStructureSegment[], resSeq: number): SecondaryStructureType {
  for (const s of segments) {
    if (s.type !== 'coil' && resSeq >= s.start && resSeq <= s.end) return s.type;
  }
  return 'coil';
}

/**
 * Icon shape for one chain. `bandwidth` is the Gaussian KDE σ in Å. Density is
 * an unnormalised residue count per Å, so a larger chain draws a wider violin
 * once all icons share one width scale.
 */
export function chainIconShape(
  chain: ChainData,
  membrane: IconMembrane,
  bandwidth: number,
  zOuter: number,
): ChainIconShape | null {
  if (chain.calphas.length === 0) return null;
  const residues = chain.calphas.map((ca) => ({
    dz: ca.z - membrane.centre,
    ss: ssAt(chain.segments, ca.resSeq),
  }));
  const half = membrane.thickness / 2;
  const zs = residues.map((r) => r.dz);
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);

  if (zMin > 2 * half || zMax < -2 * half) {
    const counts: SsAmounts = { helix: 0, strand: 0, coil: 0 };
    for (const r of residues) counts[r.ss]++;
    const n = residues.length;
    return {
      kind: 'box',
      row: zMin > 2 * half ? 'top' : 'bottom',
      helix: counts.helix / n,
      strand: counts.strand / n,
      coil: counts.coil / n,
    };
  }

  let gyTop = zToGridY(zMax, half, zOuter);
  let gyBot = zToGridY(zMin, half, zOuter);
  // A chain with no z extent still needs a visible sliver.
  if (gyBot - gyTop < 0.1) {
    const mid = (gyTop + gyBot) / 2;
    gyTop = mid - 0.05;
    gyBot = mid + 0.05;
  }

  const n = Math.max(2, Math.ceil((gyBot - gyTop) * ICON.samplesPerRow) + 1);
  const twoSigmaSq = 2 * bandwidth * bandwidth;
  const norm = bandwidth * Math.sqrt(2 * Math.PI);
  const samples: IconSample[] = [];
  for (let i = 0; i < n; i++) {
    const gy = gyTop + ((gyBot - gyTop) * i) / (n - 1);
    const z = gridYToZ(gy, half, zOuter);
    const d: SsAmounts = { helix: 0, strand: 0, coil: 0 };
    for (const r of residues) d[r.ss] += Math.exp(-((z - r.dz) * (z - r.dz)) / twoSigmaSq) / norm;
    samples.push({ gy, ...d, density: d.helix + d.strand + d.coil });
  }
  return { kind: 'violin', samples };
}

/** Largest violin density across shapes, for a shared width scale. */
export function maxIconDensity(shapes: (ChainIconShape | null)[]): number {
  let max = 0;
  for (const s of shapes) {
    if (s?.kind !== 'violin') continue;
    for (const p of s.samples) max = Math.max(max, p.density);
  }
  return max;
}

/**
 * Smooth open curve through `pts` (uniform Catmull-Rom with clamped ends, as
 * cubic Béziers), continuing an existing path from `pts[0]`.
 */
function smoothThrough(pts: { x: number; y: number }[]): string {
  const f = (v: number) => v.toFixed(2);
  const n = pts.length;
  const p = (i: number) => pts[Math.max(0, Math.min(n - 1, i))];
  const parts: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = p(i - 1);
    const p1 = p(i);
    const p2 = p(i + 1);
    const p3 = p(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    parts.push(`C ${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`);
  }
  return parts.join(' ');
}

/** Corner radius (px) where a violin's smooth side meets its flat cut end. */
const VIOLIN_CORNER = 1.5;

/**
 * Mirrored outline of half-widths `w` at heights `y`, centred on `cx`: smooth
 * sides joined by flat ends (the cut at the chain's extreme Cα) with rounded
 * corners.
 */
function violinOutline(cx: number, y: number[], w: number[]): string {
  const n = y.length;
  const r = Math.min(VIOLIN_CORNER, (y[n - 1] - y[0]) / 4);
  const side = y.map((yi, i) => ({ dx: w[i], y: yi }));
  // Pull the end samples in and round them off so the caps meet the sides softly.
  const rTop = Math.min(r, w[0]);
  const rBot = Math.min(r, w[n - 1]);
  side[0] = { dx: w[0], y: y[0] + rTop };
  side[n - 1] = { dx: w[n - 1], y: y[n - 1] - rBot };
  const right = [
    { x: cx + w[0] - rTop, y: y[0] },
    ...side.map((s) => ({ x: cx + s.dx, y: s.y })),
    { x: cx + w[n - 1] - rBot, y: y[n - 1] },
  ];
  const left = right
    .slice()
    .reverse()
    .map((pt) => ({ x: 2 * cx - pt.x, y: pt.y }));
  const f = (v: number) => v.toFixed(2);
  return [
    `M ${f(right[0].x)} ${f(right[0].y)}`,
    smoothThrough(right),
    `L ${f(left[0].x)} ${f(left[0].y)}`,
    smoothThrough(left),
    'Z',
  ].join(' ');
}

export interface IconColours {
  helix: string;
  strand: string;
  coil: string;
  outline: string;
  frame: string;
  grid: string;
  membraneEdge: string;
  membraneDark: string;
  membraneLight: string;
  label: string;
}

/** Text shown in the icon's lower-left corner: chain letter and copy suffix. */
export interface IconLabel {
  base: string;
  suffix: string | null;
}

let _iconCounter = 0;

/** Render one chain icon as an SVG element. */
export function renderChainIcon(
  shape: ChainIconShape | null,
  maxDensity: number,
  label: IconLabel,
  colours: IconColours,
): SVGSVGElement {
  const { columns, rows, cellW, cellH, pad } = ICON;
  const gridW = columns * cellW;
  const gridH = rows * cellH;
  const W = gridW + 2 * pad;
  const H = gridH + 2 * pad;
  const uid = `chain-icon-${++_iconCounter}`;
  const el = <K extends keyof SVGElementTagNameMap>(
    tag: K,
    attrs: Record<string, string | number>,
    parent: Element,
  ): SVGElementTagNameMap[K] => {
    const node = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, `${v}`);
    parent.appendChild(node);
    return node;
  };

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', `${W}`);
  svg.setAttribute('height', `${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-hidden', 'true');

  const defs = el('defs', {}, svg);
  const clip = el('clipPath', { id: `${uid}-clip` }, defs);
  el('rect', { width: gridW, height: gridH, rx: ICON.frameRadius }, clip);
  const grad = el('linearGradient', { id: `${uid}-membrane`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  el('stop', { offset: '0', 'stop-color': colours.membraneDark }, grad);
  el('stop', { offset: '0.5', 'stop-color': colours.membraneLight }, grad);
  el('stop', { offset: '1', 'stop-color': colours.membraneDark }, grad);

  const g = el('g', { transform: `translate(${pad}, ${pad})` }, svg);
  el('rect', { width: gridW, height: gridH, rx: ICON.frameRadius, fill: '#fff' }, g);
  const inner = el('g', { 'clip-path': `url(#${uid}-clip)` }, g);

  // Membrane: the middle two rows, with dark edges at each surface.
  el(
    'rect',
    {
      class: 'icon-membrane',
      x: 0,
      y: 2 * cellH,
      width: gridW,
      height: 2 * cellH,
      fill: `url(#${uid}-membrane)`,
    },
    inner,
  );
  for (const y of [2 * cellH, 4 * cellH]) {
    el(
      'line',
      { x1: 0, x2: gridW, y1: y, y2: y, stroke: colours.membraneEdge, 'stroke-width': 0.6 },
      inner,
    );
  }

  // Faint layout grid; CSS shows it on hover and for the selected chain.
  const grid = el('g', { class: 'icon-grid', stroke: colours.grid, 'stroke-width': 0.4 }, inner);
  for (let c = 1; c < columns; c++) {
    el('line', { x1: c * cellW, x2: c * cellW, y1: 0, y2: gridH }, grid);
  }
  for (let r = 1; r < rows; r++) {
    el('line', { x1: 0, x2: gridW, y1: r * cellH, y2: r * cellH }, grid);
  }

  const layer = (d: string, fill: string, cls: string) =>
    el(
      'path',
      {
        class: cls,
        d,
        fill,
        stroke: colours.outline,
        'stroke-width': 0.5,
        'stroke-linejoin': 'round',
      },
      inner,
    );

  const maxHalf = (ICON.proteinColumns * cellW) / 2;
  const cx = gridW / 2;

  if (shape?.kind === 'box') {
    // Hangs off the top (or bottom) edge into row 1 (or 6); the frame clips the
    // far end so only the free end's rounded corners show.
    const r = ICON.boxRadius;
    const box = (halfW: number, inset: number, fill: string, cls: string) => {
      if (halfW <= 0) return;
      const top = shape.row === 'top';
      const y = top ? -r : (rows - 1) * cellH + inset;
      const h = cellH + r - inset;
      el(
        'rect',
        {
          class: cls,
          x: cx - halfW,
          y,
          width: 2 * halfW,
          height: h,
          rx: Math.min(r, halfW),
          fill,
          stroke: colours.outline,
          'stroke-width': 0.5,
        },
        inner,
      );
    };
    box(maxHalf, 0, colours.coil, `icon-box icon-box-${shape.row}`);
    box(maxHalf * (shape.helix + shape.strand), ICON.boxLayerInset, colours.strand, 'icon-strand');
    box(maxHalf * shape.helix, 2 * ICON.boxLayerInset, colours.helix, 'icon-helix');
  } else if (shape?.kind === 'violin') {
    const scale = maxDensity > 0 ? maxHalf / maxDensity : 0;
    const ys = shape.samples.map((p) => p.gy * cellH);
    const helixW = shape.samples.map((p) => p.helix * scale);
    const strandW = shape.samples.map((p) => (p.helix + p.strand) * scale);
    const totalW = shape.samples.map((p) => p.density * scale);
    layer(violinOutline(cx, ys, totalW), colours.coil, 'icon-violin');
    if (strandW.some((w, i) => w > helixW[i] + 0.05)) {
      layer(violinOutline(cx, ys, strandW), colours.strand, 'icon-strand');
    }
    if (helixW.some((w) => w > 0.05))
      layer(violinOutline(cx, ys, helixW), colours.helix, 'icon-helix');
  }

  // Chain label in the lower-left corner, drawn over everything.
  const text = el(
    'text',
    {
      class: 'icon-label',
      x: 2,
      y: gridH - 3,
      'font-family': 'Georgia, "Times New Roman", serif',
      'font-size': ICON.labelSize,
      fill: colours.label,
    },
    g,
  );
  text.textContent = label.base;
  if (label.suffix) {
    const sub = el('tspan', { 'font-size': ICON.suffixSize, dx: 0.5 }, text);
    sub.textContent = label.suffix;
  }

  el(
    'rect',
    {
      width: gridW,
      height: gridH,
      rx: ICON.frameRadius,
      fill: 'none',
      stroke: colours.frame,
      'stroke-width': 0.8,
    },
    g,
  );
  return svg;
}
