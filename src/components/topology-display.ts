import type {
  ChainData,
  ProteinData,
  SecondaryStructureSegment,
  SecondaryStructureType,
} from '../types.js';
import { unrollChain, type UnrolledSegment, type UnrolledPoint } from '../unroll/index.js';
import { selectTransmembraneChains } from '../orientation/index.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const STYLES = `
  :host {
    display: block;
    font-family: sans-serif;
    padding: 0.5rem;
  }
  .protein-id {
    font-size: 1.1rem;
    font-weight: bold;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
  }
  .chain-block { margin-top: 0.75rem; }
  .chain-label {
    font-family: monospace;
    font-size: 0.85rem;
    color: #444;
    margin-bottom: 0.25rem;
  }
  .chain-note {
    font-size: 0.8rem;
    color: #6c757d;
    font-style: italic;
    margin-top: 0.25rem;
  }
  .chain-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: #fafafa;
    border-radius: 4px;
    border: 1px solid #efefef;
  }
  .chain-violin {
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    padding: 0.25rem 0.4rem 0.3rem;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: inherit;
  }
  .chain-violin:hover { background: #eef3f8; }
  .chain-violin.selected {
    background: #e6f2ff;
    border-color: #1f77b4;
  }
  .chain-violin:focus-visible {
    outline: 2px solid #1f77b4;
    outline-offset: 1px;
  }
  .violin-label {
    font-family: monospace;
    font-size: 0.75rem;
    color: #333;
    margin-top: 0.2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
  }
  .violin-label .residues { color: #777; font-size: 0.7rem; }
  .chain-picker-label {
    font-size: 0.75rem;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  .svg-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  svg {
    display: block;
    max-width: none;
  }
  .placeholder { font-style: italic; color: #888; }
`;

const PLOT = {
  width: 1200,
  margin: { top: 24, right: 24, bottom: 24, left: 40 },
  // Membrane bilayer half-thickness (Å) for visual reference.
  membraneHalf: 15,
  /** Maximum |z| (Å) shown on the y-axis — auto-expands if data exceeds. */
  zRangeMin: 25,
  /** Å per pixel on the x-axis (arc length). Higher = more zoomed-in. */
  arcPxPerA: 1.6,
  /** Å per pixel on the y-axis (real z). */
  zPxPerA: 4,
};

const COLOURS = {
  membraneFill: '#eaeaea',
  membraneEdge: '#bdbdbd',
  zAxis: '#666',
  coil: '#666',
  helix: '#1f77b4',
  strand: '#2ca02c',
  break: '#aaa',
};

function ssTypeAt(segments: SecondaryStructureSegment[], resSeq: number): SecondaryStructureType {
  for (const s of segments) {
    if (resSeq >= s.start && resSeq <= s.end) return s.type;
  }
  return 'coil';
}

/** Group consecutive residue indices that share the same SS type into runs. */
function runsBySs(
  residues: { resSeq: number; sampleIndex: number }[],
  segments: SecondaryStructureSegment[],
): { type: SecondaryStructureType; startSample: number; endSample: number }[] {
  if (residues.length === 0) return [];
  const runs: { type: SecondaryStructureType; startSample: number; endSample: number }[] = [];
  let runType = ssTypeAt(segments, residues[0].resSeq);
  let runStart = residues[0].sampleIndex;

  for (let i = 1; i < residues.length; i++) {
    const t = ssTypeAt(segments, residues[i].resSeq);
    if (t !== runType) {
      runs.push({ type: runType, startSample: runStart, endSample: residues[i].sampleIndex });
      runType = t;
      runStart = residues[i].sampleIndex;
    }
  }
  runs.push({
    type: runType,
    startSample: runStart,
    endSample: residues[residues.length - 1].sampleIndex,
  });
  return runs;
}

function pathFromPoints(samples: UnrolledPoint[], startIdx: number, endIdx: number): string {
  if (endIdx < startIdx) return '';
  const parts: string[] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const s = samples[i];
    parts.push(`${i === startIdx ? 'M' : 'L'}${s.arc.toFixed(2)},${s.z.toFixed(2)}`);
  }
  return parts.join(' ');
}

function renderChainSvg(chain: ChainData): SVGSVGElement {
  const unroll = unrollChain(chain.calphas);

  const zRange = Math.max(PLOT.zRangeMin, Math.abs(unroll.zMin), Math.abs(unroll.zMax));
  const plotWidth = Math.max(200, unroll.totalArcLength * PLOT.arcPxPerA);
  const plotHeight = zRange * 2 * PLOT.zPxPerA;
  const svgWidth = PLOT.margin.left + plotWidth + PLOT.margin.right;
  const svgHeight = PLOT.margin.top + plotHeight + PLOT.margin.bottom;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
  // Intrinsic pixel size matches the viewBox so 1 user unit = 1 device px by
  // default. The host container can override with CSS, but most embeddings —
  // gallery screenshots, PR comment images — should see the natural width so
  // long chains (β-barrels) don't get compressed to fit a parent.
  svg.setAttribute('width', `${svgWidth}`);
  svg.setAttribute('height', `${svgHeight}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Chain ${chain.chainId} membrane unrolling`);

  // Inner plot group with a transform that flips z so positive z is up and
  // applies the user-space scale. Inside this group, coordinates are (arc, z)
  // in Ångström, with the origin at (0, 0) — bilayer midplane.
  const plot = document.createElementNS(SVG_NS, 'g');
  const cx = PLOT.margin.left;
  const cy = PLOT.margin.top + plotHeight / 2;
  plot.setAttribute(
    'transform',
    `translate(${cx}, ${cy}) scale(${PLOT.arcPxPerA}, ${-PLOT.zPxPerA})`,
  );
  svg.appendChild(plot);

  // Membrane slab. Drawn first so the trace appears on top; kept faint and
  // semi-transparent so the in-membrane portion of the trace remains clearly
  // visible (β-strand sections in particular spend most of their length here).
  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('x', '0');
  slab.setAttribute('y', `${-PLOT.membraneHalf}`);
  slab.setAttribute('width', `${unroll.totalArcLength.toFixed(2)}`);
  slab.setAttribute('height', `${PLOT.membraneHalf * 2}`);
  slab.setAttribute('fill', COLOURS.membraneFill);
  slab.setAttribute('fill-opacity', '0.55');
  slab.setAttribute('stroke', COLOURS.membraneEdge);
  // Stroke gets multiplied by the (non-uniform) scale, so use vector-effect to
  // keep it 1px regardless of zoom.
  slab.setAttribute('vector-effect', 'non-scaling-stroke');
  plot.appendChild(slab);

  // Zero (z = 0) reference line — membrane midplane.
  const mid = document.createElementNS(SVG_NS, 'line');
  mid.setAttribute('x1', '0');
  mid.setAttribute('x2', `${unroll.totalArcLength.toFixed(2)}`);
  mid.setAttribute('y1', '0');
  mid.setAttribute('y2', '0');
  mid.setAttribute('stroke', COLOURS.zAxis);
  mid.setAttribute('stroke-dasharray', '4 4');
  mid.setAttribute('vector-effect', 'non-scaling-stroke');
  plot.appendChild(mid);

  // For each contiguous chain segment, draw the smoothed (arc, z) trace,
  // segmented by secondary structure type for colouring.
  for (let s = 0; s < unroll.segments.length; s++) {
    const segment = unroll.segments[s];
    drawSegment(plot, segment, chain.segments);
    // Dashed connector across chain breaks.
    if (s > 0) {
      const prev = unroll.segments[s - 1];
      const a = prev.samples[prev.samples.length - 1];
      const b = segment.samples[0];
      const connector = document.createElementNS(SVG_NS, 'line');
      connector.setAttribute('x1', `${a.arc}`);
      connector.setAttribute('y1', `${a.z}`);
      connector.setAttribute('x2', `${b.arc}`);
      connector.setAttribute('y2', `${b.z}`);
      connector.setAttribute('stroke', COLOURS.break);
      connector.setAttribute('stroke-dasharray', '2 3');
      connector.setAttribute('vector-effect', 'non-scaling-stroke');
      plot.appendChild(connector);
    }
  }

  return svg;
}

function drawSegment(
  plot: SVGGElement,
  segment: UnrolledSegment,
  ssSegments: SecondaryStructureSegment[],
): void {
  const runs = runsBySs(segment.residues, ssSegments);
  for (const run of runs) {
    const d = pathFromPoints(segment.samples, run.startSample, run.endSample);
    if (!d) continue;
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', COLOURS[run.type]);
    path.setAttribute('stroke-width', run.type === 'coil' ? '1.2' : '2.2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('vector-effect', 'non-scaling-stroke');
    plot.appendChild(path);
  }
}

const VIOLIN = {
  width: 64,
  height: 180,
  margin: { top: 6, right: 6, bottom: 6, left: 6 },
  /** Minimum z half-range shown (Å); auto-expands to fit data. */
  zRangeMin: 30,
  /**
   * Number of z-bins for the density estimate. Higher = smoother curve at
   * the cost of more vertices in the SVG.
   */
  bins: 60,
  /** Gaussian smoothing kernel σ, in bins. */
  smoothingSigma: 1.8,
};

interface ChainSsBins {
  helix: number[];
  strand: number[];
  coil: number[];
  total: number[];
  maxBinTotal: number;
}

function smoothBins(values: number[], sigma: number): number[] {
  if (sigma <= 0 || values.length === 0) return values.slice();
  const half = Math.max(1, Math.ceil(sigma * 3));
  const kernel: number[] = [];
  for (let i = -half; i <= half; i++) {
    kernel.push(Math.exp(-(i * i) / (2 * sigma * sigma)));
  }
  const ksum = kernel.reduce((a, b) => a + b, 0);
  for (let i = 0; i < kernel.length; i++) kernel[i] /= ksum;

  const out = new Array<number>(values.length).fill(0);
  for (let i = 0; i < values.length; i++) {
    let acc = 0;
    let weight = 0;
    for (let k = -half; k <= half; k++) {
      const j = i + k;
      if (j < 0 || j >= values.length) continue;
      const w = kernel[k + half];
      acc += values[j] * w;
      weight += w;
    }
    // Renormalise at edges so the boundary doesn't pull the density to zero.
    out[i] = weight > 0 ? acc / weight : 0;
  }
  return out;
}

function binChainBySs(chain: ChainData, bins: number, zMin: number, zMax: number): ChainSsBins {
  const helixRaw = new Array<number>(bins).fill(0);
  const strandRaw = new Array<number>(bins).fill(0);
  const coilRaw = new Array<number>(bins).fill(0);
  const range = zMax - zMin;
  if (range > 0) {
    for (const ca of chain.calphas) {
      if (ca.z < zMin || ca.z > zMax) continue;
      const t = (ca.z - zMin) / range;
      const b = Math.min(bins - 1, Math.max(0, Math.floor(t * bins)));
      const ss = ssTypeAt(chain.segments, ca.resSeq);
      if (ss === 'helix') helixRaw[b]++;
      else if (ss === 'strand') strandRaw[b]++;
      else coilRaw[b]++;
    }
  }

  const sigma = VIOLIN.smoothingSigma;
  const helix = smoothBins(helixRaw, sigma);
  const strand = smoothBins(strandRaw, sigma);
  const coil = smoothBins(coilRaw, sigma);
  const total = new Array<number>(bins);
  let maxBinTotal = 0;
  for (let i = 0; i < bins; i++) {
    total[i] = helix[i] + strand[i] + coil[i];
    if (total[i] > maxBinTotal) maxBinTotal = total[i];
  }
  return { helix, strand, coil, total, maxBinTotal };
}

/**
 * Build a smooth half-violin polygon path: outer envelope walks one side from
 * bottom to top through the density values, then closes along the centreline.
 *
 * `side` = -1 for the left half, +1 for the right half. `widths[i]` is the
 * unsigned width of the violin at bin i. `centreOffset` lets us push the
 * envelope outwards by another density (e.g. coil) so layers stack cleanly.
 */
function halfViolinPath(
  widths: number[],
  centreOffset: number[],
  side: -1 | 1,
  yForBin: (b: number) => number,
): string {
  const bins = widths.length;
  if (bins === 0) return '';
  const parts: string[] = [];
  parts.push(`M ${side * centreOffset[0]} ${yForBin(-0.5)}`);
  for (let b = 0; b < bins; b++) {
    parts.push(`L ${side * (centreOffset[b] + widths[b])} ${yForBin(b)}`);
  }
  parts.push(`L ${side * (centreOffset[bins - 1] + widths[bins - 1])} ${yForBin(bins - 0.5)}`);
  parts.push(`L ${side * centreOffset[bins - 1]} ${yForBin(bins - 0.5)}`);
  for (let b = bins - 1; b >= 0; b--) {
    parts.push(`L ${side * centreOffset[b]} ${yForBin(b)}`);
  }
  parts.push('Z');
  return parts.join(' ');
}

function renderViolin(
  binned: ChainSsBins,
  maxBinTotal: number,
  zMin: number,
  zMax: number,
): SVGSVGElement {
  const { width: W, height: H, margin, bins } = VIOLIN;
  const plotW = W - margin.left - margin.right;
  const plotH = H - margin.top - margin.bottom;

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', `${W}`);
  svg.setAttribute('height', `${H}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-hidden', 'true');

  const yScale = plotH / (zMax - zMin);
  const xScale = maxBinTotal > 0 ? plotW / 2 / maxBinTotal : 0;
  const cx = margin.left + plotW / 2;
  const cy = margin.top + plotH / 2;

  const plot = document.createElementNS(SVG_NS, 'g');
  plot.setAttribute('transform', `translate(${cx}, ${cy})`);
  svg.appendChild(plot);

  // Membrane band — faint grey slab so membrane-spanning chains are obvious
  // vs. soluble ones.
  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('x', `${-plotW / 2}`);
  slab.setAttribute('y', `${-PLOT.membraneHalf * yScale}`);
  slab.setAttribute('width', `${plotW}`);
  slab.setAttribute('height', `${PLOT.membraneHalf * 2 * yScale}`);
  slab.setAttribute('fill', '#e8edf3');
  plot.appendChild(slab);

  // Midplane.
  const mid = document.createElementNS(SVG_NS, 'line');
  mid.setAttribute('x1', `${-plotW / 2}`);
  mid.setAttribute('x2', `${plotW / 2}`);
  mid.setAttribute('y1', '0');
  mid.setAttribute('y2', '0');
  mid.setAttribute('stroke', '#bdbdbd');
  mid.setAttribute('stroke-dasharray', '2 3');
  plot.appendChild(mid);

  // Density-bin centres in z, mapped to SVG y.
  const binCentreY = (b: number) => -(zMin + ((b + 0.5) * (zMax - zMin)) / bins) * yScale;

  // Each side of the violin is the stacked total density of helix + strand +
  // coil. Helix goes innermost (against the centreline), strand next, coil
  // outermost as a faint outline — so the dominant SS type drives the colour
  // and the outer envelope is always the *total* residue density.
  const helixW = binned.helix.map((v) => v * xScale);
  const strandW = binned.strand.map((v) => v * xScale);
  const coilW = binned.coil.map((v) => v * xScale);
  const zeroes = new Array<number>(bins).fill(0);
  const helixOffsets = zeroes;
  const strandOffsets = helixW;
  const coilOffsets = helixW.map((h, i) => h + strandW[i]);

  for (const side of [-1, 1] as const) {
    // Coil — drawn first as a faint outer envelope.
    const coilPath = document.createElementNS(SVG_NS, 'path');
    coilPath.setAttribute('d', halfViolinPath(coilW, coilOffsets, side, binCentreY));
    coilPath.setAttribute('fill', COLOURS.coil);
    coilPath.setAttribute('opacity', '0.35');
    plot.appendChild(coilPath);

    // Strand.
    const strandPath = document.createElementNS(SVG_NS, 'path');
    strandPath.setAttribute('d', halfViolinPath(strandW, strandOffsets, side, binCentreY));
    strandPath.setAttribute('fill', COLOURS.strand);
    plot.appendChild(strandPath);

    // Helix — innermost so the colour reads as "blue body" for helical bundles.
    const helixPath = document.createElementNS(SVG_NS, 'path');
    helixPath.setAttribute('d', halfViolinPath(helixW, helixOffsets, side, binCentreY));
    helixPath.setAttribute('fill', COLOURS.helix);
    plot.appendChild(helixPath);
  }

  // Subtle outline around the total density envelope to make small violins
  // (soluble chains) easier to see.
  const totalW = binned.total.map((v) => v * xScale);
  const outlinePath = document.createElementNS(SVG_NS, 'path');
  outlinePath.setAttribute(
    'd',
    halfViolinPath(totalW, zeroes, 1, binCentreY) +
      ' ' +
      halfViolinPath(totalW, zeroes, -1, binCentreY),
  );
  outlinePath.setAttribute('fill', 'none');
  outlinePath.setAttribute('stroke', '#5b6f8a');
  outlinePath.setAttribute('stroke-width', '0.8');
  outlinePath.setAttribute('stroke-linejoin', 'round');
  plot.appendChild(outlinePath);

  return svg;
}

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < vals.length; i++)
    while (n >= vals[i]) {
      out += syms[i];
      n -= vals[i];
    }
  return out;
}

interface ChainLabel {
  /** The protomer letter shown as the base, e.g. "A" */
  base: string;
  /** Roman numeral suffix when multiple chains share the same residue count, else null */
  suffix: string | null;
  /** Plain-text representation for aria labels etc., e.g. "A(II)" */
  text: string;
}

/**
 * When chains share the same residue count they are almost certainly identical
 * monomers. Rather than showing arbitrary letters (A, B, C for a trimer) we
 * label them A(I), A(II), A(III) — the base letter is that of the first chain
 * in the group, and the suffix is a Roman numeral copy index.
 */
function buildChainLabels(chains: ChainData[]): Map<string, ChainLabel> {
  const groups = new Map<number, ChainData[]>();
  for (const c of chains) {
    const g = groups.get(c.residueCount) ?? [];
    g.push(c);
    groups.set(c.residueCount, g);
  }
  const labels = new Map<string, ChainLabel>();
  for (const c of chains) {
    const g = groups.get(c.residueCount)!;
    if (g.length > 1) {
      const roman = toRoman(g.indexOf(c) + 1);
      labels.set(c.chainId, {
        base: g[0].chainId,
        suffix: roman,
        text: `${g[0].chainId}(${roman})`,
      });
    } else {
      labels.set(c.chainId, { base: c.chainId, suffix: null, text: c.chainId });
    }
  }
  return labels;
}

function chainLabelNode(lbl: ChainLabel): HTMLSpanElement {
  const span = document.createElement('span');
  span.textContent = lbl.base;
  if (lbl.suffix) {
    const sub = document.createElement('sub');
    sub.textContent = lbl.suffix;
    span.appendChild(sub);
  }
  return span;
}

function renderChainPicker(
  chains: ChainData[],
  selectedId: string,
  onSelect: (chainId: string) => void,
): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'chain-picker';
  container.setAttribute('role', 'group');
  container.setAttribute('aria-label', 'Chain selector');

  const chainLabels = buildChainLabels(chains);

  let zMin = Infinity;
  let zMax = -Infinity;
  for (const chain of chains) {
    for (const ca of chain.calphas) {
      if (ca.z < zMin) zMin = ca.z;
      if (ca.z > zMax) zMax = ca.z;
    }
  }
  if (!Number.isFinite(zMin)) {
    zMin = -VIOLIN.zRangeMin;
    zMax = VIOLIN.zRangeMin;
  }
  zMin = Math.min(zMin, -VIOLIN.zRangeMin);
  zMax = Math.max(zMax, VIOLIN.zRangeMin);

  const binData = chains.map((c) => binChainBySs(c, VIOLIN.bins, zMin, zMax));
  const maxBinTotal = Math.max(0, ...binData.map((b) => b.maxBinTotal));

  for (let i = 0; i < chains.length; i++) {
    const chain = chains[i];
    const lbl = chainLabels.get(chain.chainId)!;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chain-violin' + (chain.chainId === selectedId ? ' selected' : '');
    button.setAttribute('aria-pressed', chain.chainId === selectedId ? 'true' : 'false');
    button.setAttribute('aria-label', `Select chain ${lbl.text} (${chain.residueCount} residues)`);
    button.appendChild(renderViolin(binData[i], maxBinTotal, zMin, zMax));

    const label = document.createElement('div');
    label.className = 'violin-label';
    const idNode = chainLabelNode(lbl);
    const residues = document.createElement('span');
    residues.className = 'residues';
    residues.textContent = `${chain.residueCount} aa`;
    label.append(idNode, residues);
    button.appendChild(label);

    button.addEventListener('click', () => onSelect(chain.chainId));
    container.appendChild(button);
  }

  return container;
}

export class TopologyDisplay extends HTMLElement {
  static observedAttributes = ['protein-data'];

  private _data: ProteinData | null = null;
  private _selectedChainId: string | null = null;
  private _styleEl: HTMLStyleElement;
  private _contentEl: HTMLDivElement;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    this._styleEl = document.createElement('style');
    this._styleEl.textContent = STYLES;
    this._contentEl = document.createElement('div');
    shadow.append(this._styleEl, this._contentEl);
  }

  get proteinData(): ProteinData | null {
    return this._data;
  }

  set proteinData(value: ProteinData | null) {
    this._data = value;
    this._selectedChainId = null;
    this.render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name !== 'protein-data') return;
    if (value === null) {
      this._data = null;
    } else {
      try {
        this._data = JSON.parse(value) as ProteinData;
      } catch {
        this._data = null;
      }
    }
    this._selectedChainId = null;
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    this._contentEl.replaceChildren();

    if (!this._data) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'Loading…';
      this._contentEl.appendChild(placeholder);
      return;
    }

    const region = document.createElement('div');
    region.setAttribute('role', 'region');
    region.setAttribute('aria-label', 'Protein topology');

    const titleEl = document.createElement('div');
    titleEl.className = 'protein-id';
    titleEl.textContent = this._data.pdbId;
    region.appendChild(titleEl);

    // Don't mutate the caller's proteinData — build a normalised local view
    // so consumers can safely share or memoise the input. Drops chains whose
    // `calphas` field is missing or empty.
    const chainsWithCoords = this._data.chains.filter(
      (c) => Array.isArray(c.calphas) && c.calphas.length > 0,
    );

    if (chainsWithCoords.length === 0) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No Cα coordinates available for this protein.';
      region.appendChild(placeholder);
      this._contentEl.appendChild(region);
      return;
    }

    // Pick a default chain: largest transmembrane chain, falling back to the
    // largest chain overall if nothing crosses the bilayer.
    const autoPick = selectTransmembraneChains(chainsWithCoords, { max: 1 });
    const defaultId = autoPick.selected[0]?.chainId ?? chainsWithCoords[0]?.chainId ?? null;
    const selectedId =
      (this._selectedChainId &&
        chainsWithCoords.find((c) => c.chainId === this._selectedChainId)?.chainId) ||
      defaultId;

    // Chain picker — only shown when there are multiple chains to choose between.
    // A single-chain protein has nothing to pick, and the violin would look like
    // a standalone protein figure rather than a UI control.
    if (chainsWithCoords.length > 1 && selectedId) {
      const pickerLabel = document.createElement('div');
      pickerLabel.className = 'chain-picker-label';
      pickerLabel.textContent = 'Select chain';
      region.appendChild(pickerLabel);
      region.appendChild(
        renderChainPicker(chainsWithCoords, selectedId, (chainId) => {
          this._selectedChainId = chainId;
          this.render();
        }),
      );
    }

    const selectedChain =
      chainsWithCoords.find((c) => c.chainId === selectedId) ?? chainsWithCoords[0];

    if (!selectedChain) {
      this._contentEl.appendChild(region);
      return;
    }

    const displayLabels = buildChainLabels(chainsWithCoords);
    const selectedLabel = displayLabels.get(selectedChain.chainId)!;

    // Note when the user is viewing a non-TM chain — useful for double-checking
    // why a chain doesn't look "right" in the unrolled view.
    if (
      !autoPick.fellBackToLargest &&
      autoPick.selected[0] &&
      selectedChain.chainId !== autoPick.selected[0].chainId
    ) {
      const note = document.createElement('div');
      note.className = 'chain-note';
      note.textContent = `Chain ${selectedLabel.text} does not appear to span the membrane.`;
      region.appendChild(note);
    } else if (autoPick.fellBackToLargest) {
      const note = document.createElement('div');
      note.className = 'chain-note';
      note.textContent = 'No chain in this protein crosses the bilayer.';
      region.appendChild(note);
    }

    const block = document.createElement('div');
    block.className = 'chain-block';

    const label = document.createElement('div');
    label.className = 'chain-label';
    const helices = selectedChain.segments.filter((s) => s.type === 'helix').length;
    const strands = selectedChain.segments.filter((s) => s.type === 'strand').length;
    label.append(
      'Chain ',
      chainLabelNode(selectedLabel),
      ` · ${selectedChain.residueCount} residues · ${helices} helices · ${strands} strands`,
    );
    block.appendChild(label);

    const scroll = document.createElement('div');
    scroll.className = 'svg-scroll';
    // renderChainSvg now sizes itself from the smoothed-curve arc length so
    // the membrane slab and the trace stay aligned (the slab used to be drawn
    // out to `unroll.totalArcLength` but the plot width was sized from the raw
    // chord sum, which is strictly shorter, so the slab over-extended).
    scroll.appendChild(renderChainSvg(selectedChain));
    block.appendChild(scroll);
    region.appendChild(block);

    this._contentEl.appendChild(region);
  }
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
