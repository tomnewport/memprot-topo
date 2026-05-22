import type { ProteinData } from '../types.js';
import { parsePdb } from '../parser/pdb.js';
import { parseDsspMmcif } from '../parser/dssp-mmcif.js';
import { mergeProteinData } from '../parser/merge.js';
import { TopologyDisplay } from './topology-display.js';

const STYLES = `
  :host { display: block; font-family: sans-serif; padding: 0.5rem; }
  .loading { color: #666; font-style: italic; }
  .error { color: #c00; }
  .error-detail { font-size: 0.85rem; color: #800; margin-top: 0.25rem; }
`;

export class TopologyLoader extends HTMLElement {
  static observedAttributes = ['pdb-id', 'sim-id'];

  private _pdbId: string | null = null;
  private _simId: string | null = null;
  private _generation = 0;
  private _abortController: AbortController | null = null;
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

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null) {
    if (oldValue === value) return;
    if (name === 'pdb-id') this._pdbId = value;
    else if (name === 'sim-id') this._simId = value;
    if (this.isConnected) this.load();
  }

  connectedCallback() {
    this.load();
  }

  disconnectedCallback() {
    this._abortController?.abort();
    this._abortController = null;
  }

  private renderLoading() {
    const div = document.createElement('div');
    div.className = 'loading';
    div.setAttribute('aria-live', 'polite');
    div.textContent = `Loading ${this._pdbId ?? ''}…`;
    this._contentEl.replaceChildren(div);
  }

  private renderError(detail: string) {
    const errDiv = document.createElement('div');
    errDiv.className = 'error';
    errDiv.textContent = `Failed to load ${this._pdbId ?? 'protein'}`;

    const detailDiv = document.createElement('div');
    detailDiv.className = 'error-detail';
    detailDiv.textContent = detail;

    this._contentEl.replaceChildren(errDiv, detailDiv);
  }

  private renderData(data: ProteinData) {
    const display = document.createElement('topology-display') as TopologyDisplay;
    display.proteinData = data;
    this._contentEl.replaceChildren(display);
  }

  private async load() {
    if (!this._pdbId) return;

    this._abortController?.abort();
    const controller = new AbortController();
    this._abortController = controller;
    const myGen = ++this._generation;

    this.renderLoading();

    const pdbId = this._pdbId;
    const simId = this._simId ?? `${pdbId}_default_dppc`;
    const pdbUrl = `https://memprotmd.bioch.ox.ac.uk/data/memprotmd/simulations/${simId}/files/structures/at.pdb`;
    const dsspUrl = `https://pdb-redo.eu/dssp/get?pdb-id=${pdbId}&format=mmcif`;

    try {
      const [pdbResp, dsspResp] = await Promise.all([
        fetch(pdbUrl, { signal: controller.signal }),
        fetch(dsspUrl, { signal: controller.signal }),
      ]);

      if (!pdbResp.ok) {
        throw new Error(`PDB fetch failed: ${pdbResp.status} ${pdbResp.statusText}`);
      }
      if (!dsspResp.ok) {
        throw new Error(`DSSP fetch failed: ${dsspResp.status} ${dsspResp.statusText}`);
      }

      const [pdbText, dsspText] = await Promise.all([pdbResp.text(), dsspResp.text()]);

      if (myGen !== this._generation || !this.isConnected) return;

      const chains = parsePdb(pdbText);
      const ssSegments = parseDsspMmcif(dsspText);
      const proteinData = mergeProteinData(pdbId, chains, ssSegments);

      this.renderData(proteinData);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (myGen !== this._generation || !this.isConnected) return;
      const message = err instanceof Error ? err.message : String(err);
      this.renderError(message);
    }
  }
}

if (!customElements.get('topology-loader')) {
  customElements.define('topology-loader', TopologyLoader);
}
