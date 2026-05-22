import type { ProteinData, SecondaryStructureSegment } from '../types.js';

function countSegments(segments: SecondaryStructureSegment[], type: 'helix' | 'strand'): number {
  return segments.filter((s) => s.type === type).length;
}

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
  .chain-line {
    font-family: monospace;
    font-size: 0.9rem;
    margin: 0.2rem 0 0.2rem 1rem;
    color: #333;
  }
  .placeholder {
    font-style: italic;
    color: #888;
  }
`;

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
    region.setAttribute('aria-label', 'Protein topology summary');

    const titleEl = document.createElement('div');
    titleEl.className = 'protein-id';
    titleEl.textContent = this._data.pdbId;
    region.appendChild(titleEl);

    for (const chain of this._data.chains) {
      const helices = countSegments(chain.segments, 'helix');
      const strands = countSegments(chain.segments, 'strand');
      const line = document.createElement('div');
      line.className = 'chain-line';
      line.textContent = `Chain ${chain.chainId}: ${helices} alpha ${
        helices === 1 ? 'helix' : 'helices'
      }, ${strands} beta ${strands === 1 ? 'strand' : 'strands'} (${chain.residueCount} residues)`;
      region.appendChild(line);
    }

    this._contentEl.appendChild(region);
  }
}

if (!customElements.get('topology-display')) {
  customElements.define('topology-display', TopologyDisplay);
}
