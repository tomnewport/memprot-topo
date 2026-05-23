import type {
  ChainData,
  ProteinData,
  SecondaryStructureSegment,
  SecondaryStructureType,
} from '../types.js';
import { unrollChain, type UnrolledSegment, type UnrolledPoint } from '../unroll/index.js';

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
  .svg-scroll {
    overflow-x: auto;
    background: #fff;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }
  svg {
    display: block;
    max-width: none;
    height: auto;
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

function renderChainSvg(chain: ChainData, totalArcMax: number): SVGSVGElement {
  const unroll = unrollChain(chain.calphas);

  const zRange = Math.max(PLOT.zRangeMin, Math.abs(unroll.zMin), Math.abs(unroll.zMax));
  const plotWidth = Math.max(200, totalArcMax * PLOT.arcPxPerA);
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

  // Membrane slab.
  const slab = document.createElementNS(SVG_NS, 'rect');
  slab.setAttribute('x', '0');
  slab.setAttribute('y', `${-PLOT.membraneHalf}`);
  slab.setAttribute('width', `${unroll.totalArcLength.toFixed(2)}`);
  slab.setAttribute('height', `${PLOT.membraneHalf * 2}`);
  slab.setAttribute('fill', COLOURS.membraneFill);
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

export class TopologyDisplay extends HTMLElement {
  static observedAttributes = ['protein-data'];

  private _data: ProteinData | null = null;
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

    // Defensive: external callers may pass chains without coordinates (e.g.
    // older JSON payloads). Treat missing calphas as an empty array so the
    // component renders an empty topology rather than throwing.
    for (const chain of this._data.chains) {
      if (!Array.isArray(chain.calphas)) chain.calphas = [];
    }

    const allEmpty = this._data.chains.every((c) => c.calphas.length === 0);
    if (allEmpty) {
      const placeholder = document.createElement('div');
      placeholder.className = 'placeholder';
      placeholder.textContent = 'No Cα coordinates available for this protein.';
      region.appendChild(placeholder);
      this._contentEl.appendChild(region);
      return;
    }

    // Pre-compute the max arc length across chains so all chains in the same
    // protein render at the same horizontal scale.
    const arcMaxByChain = this._data.chains.map((c) => {
      if (c.calphas.length < 2) return 0;
      let arc = 0;
      for (let i = 1; i < c.calphas.length; i++) {
        const a = c.calphas[i - 1];
        const b = c.calphas[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        arc += Math.sqrt(dx * dx + dy * dy);
      }
      return arc;
    });
    const arcMax = Math.max(0, ...arcMaxByChain);

    for (const chain of this._data.chains) {
      if (chain.calphas.length === 0) continue;
      const block = document.createElement('div');
      block.className = 'chain-block';

      const label = document.createElement('div');
      label.className = 'chain-label';
      const helices = chain.segments.filter((s) => s.type === 'helix').length;
      const strands = chain.segments.filter((s) => s.type === 'strand').length;
      label.textContent = `Chain ${chain.chainId} · ${chain.residueCount} residues · ${helices} helices · ${strands} strands`;
      block.appendChild(label);

      const scroll = document.createElement('div');
      scroll.className = 'svg-scroll';
      scroll.appendChild(renderChainSvg(chain, arcMax));
      block.appendChild(scroll);
      region.appendChild(block);
    }

    this._contentEl.appendChild(region);
  }
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
