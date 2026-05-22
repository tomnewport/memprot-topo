import type { ProteinData, SecondaryStructureSegment } from '../types.js';

function countSegments(segments: SecondaryStructureSegment[], type: 'helix' | 'strand'): number {
  return segments.filter((s) => s.type === type).length;
}

export class TopologyDisplay extends HTMLElement {
  static observedAttributes = ['protein-data'];

  private _data: ProteinData | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  get proteinData(): ProteinData | null {
    return this._data;
  }

  set proteinData(value: ProteinData | null) {
    this._data = value;
    this.render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'protein-data' && value) {
      try {
        this._data = JSON.parse(value) as ProteinData;
        this.render();
      } catch {
        this._data = null;
        this.render();
      }
    }
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    const styles = `
      <style>
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
      </style>
    `;

    if (!this._data) {
      shadow.innerHTML = `${styles}<div class="placeholder">Loading…</div>`;
      return;
    }

    const chainLines = this._data.chains
      .map((chain) => {
        const helices = countSegments(chain.segments, 'helix');
        const strands = countSegments(chain.segments, 'strand');
        return `<div class="chain-line">Chain ${chain.chainId}: ${helices} alpha ${helices === 1 ? 'helix' : 'helices'}, ${strands} beta ${strands === 1 ? 'strand' : 'strands'} (${chain.residueCount} residues)</div>`;
      })
      .join('');

    shadow.innerHTML = `
      ${styles}
      <div role="region" aria-label="Protein topology summary">
        <div class="protein-id">${this._data.pdbId}</div>
        ${chainLines}
      </div>
    `;
  }
}

customElements.define('topology-display', TopologyDisplay);
