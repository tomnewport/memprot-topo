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
 * cut at the chain's extreme Cα. A chain lying entirely beyond ±2h is drawn
 * instead as a rounded box filling the top or bottom row.
 */

import type { ChainData, SecondaryStructureSegment } from '../types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export const ICON = {
  columns: 5,
  rows: 6,
  /** Grid cell size (px). */
  cell: 10,
  /** Padding around the grid (px). */
  pad: 2,
  /** Columns the protein may occupy (centred). */
  proteinColumns: 3,
  /** Violin samples per grid row. */
  samplesPerRow: 8,
  /** Corner radius (px) of the box used for chains entirely outside the membrane. */
  boxRadius: 3,
};

/** Membrane geometry the icon is drawn against, in Å. */
export interface IconMembrane {
  /** z of the membrane centre (the datum all rows are measured from). */
  centre: number;
  /** Full bilayer thickness. */
  thickness: number;
}

export type ChainIconShape =
  | { kind: 'box'; row: 'top' | 'bottom' }
  | {
      kind: 'violin';
      /** Grid-row y (0 = top of row 1, 6 = bottom of row 6) and raw KDE density. */
      samples: { gy: number; density: number }[];
    };

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
  const zs = chain.calphas.map((ca) => ca.z - membrane.centre);
  if (zs.length === 0) return null;
  const half = membrane.thickness / 2;
  const zMin = Math.min(...zs);
  const zMax = Math.max(...zs);
  if (zMin > 2 * half) return { kind: 'box', row: 'top' };
  if (zMax < -2 * half) return { kind: 'box', row: 'bottom' };

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
  const samples: { gy: number; density: number }[] = [];
  for (let i = 0; i < n; i++) {
    const gy = gyTop + ((gyBot - gyTop) * i) / (n - 1);
    const z = gridYToZ(gy, half, zOuter);
    let d = 0;
    for (const zi of zs) d += Math.exp(-((z - zi) * (z - zi)) / twoSigmaSq);
    samples.push({ gy, density: d / (bandwidth * Math.sqrt(2 * Math.PI)) });
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

/** Colour by the chain's dominant secondary structure (helix wins ties). */
function iconFill(
  segments: SecondaryStructureSegment[],
  colours: { helix: string; strand: string; coil: string },
): string {
  let helix = 0;
  let strand = 0;
  for (const s of segments) {
    const len = s.end - s.start + 1;
    if (s.type === 'helix') helix += len;
    else if (s.type === 'strand') strand += len;
  }
  if (helix === 0 && strand === 0) return colours.coil;
  return helix >= strand ? colours.helix : colours.strand;
}

export interface IconColours {
  helix: string;
  strand: string;
  coil: string;
  outline: string;
  membrane: string;
  midline: string;
}

/** Render one chain icon as an SVG element. */
export function renderChainIcon(
  chain: ChainData,
  shape: ChainIconShape | null,
  maxDensity: number,
  colours: IconColours,
): SVGSVGElement {
  const { columns, rows, cell, pad } = ICON;
  const gridW = columns * cell;
  const gridH = rows * cell;
  const W = gridW + 2 * pad;
  const H = gridH + 2 * pad;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', `${W}`);
  svg.setAttribute('height', `${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-hidden', 'true');

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `translate(${pad}, ${pad})`);
  svg.appendChild(g);

  // Membrane: the middle two rows, split by the centre line.
  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('class', 'icon-membrane');
  slab.setAttribute('x', '0');
  slab.setAttribute('y', `${2 * cell}`);
  slab.setAttribute('width', `${gridW}`);
  slab.setAttribute('height', `${2 * cell}`);
  slab.setAttribute('fill', colours.membrane);
  g.appendChild(slab);

  const mid = document.createElementNS(SVG_NS, 'line');
  mid.setAttribute('x1', '0');
  mid.setAttribute('x2', `${gridW}`);
  mid.setAttribute('y1', `${3 * cell}`);
  mid.setAttribute('y2', `${3 * cell}`);
  mid.setAttribute('stroke', colours.midline);
  mid.setAttribute('stroke-dasharray', '2 2');
  g.appendChild(mid);

  if (!shape) return svg;

  const fill = iconFill(chain.segments, colours);
  const maxHalf = (ICON.proteinColumns * cell) / 2;
  const cx = gridW / 2;

  if (shape.kind === 'box') {
    const box = document.createElementNS(SVG_NS, 'rect');
    box.setAttribute('class', `icon-box icon-box-${shape.row}`);
    box.setAttribute('x', `${cx - maxHalf}`);
    box.setAttribute('y', shape.row === 'top' ? '0' : `${(rows - 1) * cell}`);
    box.setAttribute('width', `${2 * maxHalf}`);
    box.setAttribute('height', `${cell}`);
    box.setAttribute('rx', `${ICON.boxRadius}`);
    box.setAttribute('fill', fill);
    box.setAttribute('stroke', colours.outline);
    box.setAttribute('stroke-width', '0.8');
    g.appendChild(box);
    return svg;
  }

  const scale = maxDensity > 0 ? maxHalf / maxDensity : 0;
  const pts = shape.samples.map((p) => ({ y: p.gy * cell, w: p.density * scale }));
  const fmt = (v: number) => v.toFixed(2);
  const right = pts.map((p) => `${fmt(cx + p.w)} ${fmt(p.y)}`);
  const left = pts
    .slice()
    .reverse()
    .map((p) => `${fmt(cx - p.w)} ${fmt(p.y)}`);
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('class', 'icon-violin');
  path.setAttribute('d', `M ${right.join(' L ')} L ${left.join(' L ')} Z`);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', colours.outline);
  path.setAttribute('stroke-width', '0.8');
  path.setAttribute('stroke-linejoin', 'round');
  g.appendChild(path);
  return svg;
}
