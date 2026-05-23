import type { ChainData, ProteinData } from '../types.js';
import {
  buildRuns,
  centeringMatrix,
  projectResidues,
  renderTopologySvg,
  type RenderOptions,
} from '../renderer/index.js';

const STYLES = `
  :host {
    display: block;
    font-family: sans-serif;
  }
  .empty {
    padding: 1rem;
    font-style: italic;
    color: #888;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
    max-width: 100%;
  }
`;

export class TopologyRenderer extends HTMLElement {
  static observedAttributes = ['protein-data', 'chain-id'];

  private _data: ProteinData | null = null;
  private _chainId: string | null = null;
  private _renderOptions: RenderOptions = {};
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

  get renderOptions(): RenderOptions {
    return this._renderOptions;
  }
  set renderOptions(value: RenderOptions) {
    this._renderOptions = value;
    this.render();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'protein-data') {
      if (value === null) {
        this._data = null;
      } else {
        try {
          this._data = JSON.parse(value) as ProteinData;
        } catch {
          this._data = null;
        }
      }
    } else if (name === 'chain-id') {
      this._chainId = value;
    }
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  private pickChain(): ChainData | null {
    if (!this._data || this._data.chains.length === 0) return null;
    if (this._chainId) {
      return this._data.chains.find((c) => c.chainId === this._chainId) ?? null;
    }
    return this._data.chains[0];
  }

  private render() {
    this._contentEl.replaceChildren();
    const chain = this.pickChain();
    if (!chain) {
      this._contentEl.appendChild(this.emptyMessage('No protein data'));
      return;
    }
    if (!chain.residues || chain.residues.length === 0) {
      this._contentEl.appendChild(this.emptyMessage('No Cα coordinates available'));
      return;
    }

    // Auto-center the structure if the user hasn't supplied an orientation.
    // MemProtMD's at.pdb leaves coordinates in simulation-box space, so the
    // membrane slab at z = 0 would otherwise sit far below the protein.
    const orientation = centeringMatrix(chain.residues);
    const projected = projectResidues(chain.residues, orientation);
    const runs = buildRuns(projected, chain.segments);
    const opts: RenderOptions = {
      ...this._renderOptions,
      membrane: this._renderOptions.membrane ?? this._data?.membrane,
    };
    const svg = renderTopologySvg(runs, opts);
    svg.setAttribute(
      'aria-label',
      `Topology diagram for ${this._data?.pdbId ?? 'protein'} chain ${chain.chainId}`,
    );
    this._contentEl.appendChild(svg);
  }

  private emptyMessage(text: string): HTMLDivElement {
    const div = document.createElement('div');
    div.className = 'empty';
    div.textContent = text;
    return div;
  }
}

if (!customElements.get('topology-renderer')) {
  customElements.define('topology-renderer', TopologyRenderer);
}
