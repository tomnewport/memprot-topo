import type { ProteinData } from '../types.js';
import { parsePdb } from '../parser/pdb.js';
import { parseDsspMmcif } from '../parser/dssp-mmcif.js';
import { mergeProteinData } from '../parser/merge.js';

export class TopologyLoader extends HTMLElement {
  static observedAttributes = ['pdb-id', 'sim-id'];

  private _pdbId: string | null = null;
  private _simId: string | null = null;
  private _loading = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null) {
    if (name === 'pdb-id') {
      this._pdbId = value;
    } else if (name === 'sim-id') {
      this._simId = value;
    }
    if (this.isConnected) {
      this.load();
    }
  }

  connectedCallback() {
    this._pdbId = this.getAttribute('pdb-id');
    this._simId = this.getAttribute('sim-id');
    this.load();
  }

  private renderLoading() {
    const shadow = this.shadowRoot;
    if (!shadow) return;
    shadow.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; padding: 0.5rem; }
        .loading { color: #666; font-style: italic; }
      </style>
      <div class="loading">Loading ${this._pdbId ?? ''}…</div>
    `;
  }

  private renderError(detail: string) {
    const shadow = this.shadowRoot;
    if (!shadow) return;
    shadow.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; padding: 0.5rem; }
        .error { color: #c00; }
        .error-detail { font-size: 0.85rem; color: #800; margin-top: 0.25rem; }
      </style>
      <div class="error">Failed to load ${this._pdbId ?? 'protein'}</div>
      <div class="error-detail">${detail}</div>
    `;
  }

  private renderData(data: ProteinData) {
    const shadow = this.shadowRoot;
    if (!shadow) return;

    // Import topology-display — it is registered as a side-effect of importing the components index
    const display = document.createElement('topology-display');
    display.setAttribute('protein-data', JSON.stringify(data));

    shadow.innerHTML = '';
    shadow.appendChild(display);
  }

  private async load() {
    if (!this._pdbId) return;
    if (this._loading) return;

    this._loading = true;
    this.renderLoading();

    const pdbId = this._pdbId;
    const simId = this._simId ?? `${pdbId}_default_dppc`;

    const pdbUrl = `https://memprotmd.bioch.ox.ac.uk/data/memprotmd/simulations/${simId}/files/structures/at.pdb`;
    const dsspUrl = `https://pdb-redo.eu/dssp/get?pdb-id=${pdbId}&format=mmcif`;

    try {
      const [pdbResp, dsspResp] = await Promise.all([fetch(pdbUrl), fetch(dsspUrl)]);

      if (!pdbResp.ok) {
        throw new Error(`PDB fetch failed: ${pdbResp.status} ${pdbResp.statusText}`);
      }
      if (!dsspResp.ok) {
        throw new Error(`DSSP fetch failed: ${dsspResp.status} ${dsspResp.statusText}`);
      }

      const [pdbText, dsspText] = await Promise.all([pdbResp.text(), dsspResp.text()]);

      const chains = parsePdb(pdbText);
      const ssSegments = parseDsspMmcif(dsspText);
      const proteinData = mergeProteinData(pdbId, chains, ssSegments);

      this.renderData(proteinData);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.renderError(message);
    } finally {
      this._loading = false;
    }
  }
}

customElements.define('topology-loader', TopologyLoader);
