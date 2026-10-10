import type { ProteinData } from '../types.js';
import { parsePdb } from '../parser/pdb.js';
import { parseDsspMmcif } from '../parser/dssp-mmcif.js';
import { mergeProteinData } from '../parser/merge.js';
import { parseDistortions, type MembraneDistortions } from '../membrane/distortions.js';
import { TopologyDisplay } from './topology-display.js';

const STYLES = `
  :host { display: block; font-family: sans-serif; padding: 0.5rem; }
  .loading { color: #666; font-style: italic; }
  .error { color: #c00; }
  .error-detail { font-size: 0.85rem; color: #800; margin-top: 0.25rem; }
`;

/** Attributes passed through to the inner `<topology-display>`. */
const FORWARDED = [
  'theme',
  'theme-light',
  'theme-dark',
  'membrane-detail',
  'transition-time',
  'transition-sweep',
  'structure-projection',
  'structure-strand-width',
  'structure-strand-thickness',
  'structure-grid-spacing',
  'structure-membrane-style',
];

export class TopologyLoader extends HTMLElement {
  static observedAttributes = ['pdb-id', 'sim-id', 'distortions', ...FORWARDED];

  private _pdbId: string | null = null;
  private _simId: string | null = null;
  /** URL of a MemProtMD bilayer-distortions file for the structure. */
  private _distortionsUrl: string | null = null;
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
    if (FORWARDED.includes(name)) {
      const display = this._contentEl.querySelector('topology-display');
      if (display) forward(this, display, name);
      return;
    }
    if (name === 'pdb-id') this._pdbId = value;
    else if (name === 'sim-id') this._simId = value;
    else if (name === 'distortions') this._distortionsUrl = value;
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

  private renderData(data: ProteinData, distortions: MembraneDistortions | null) {
    const display = document.createElement('topology-display') as TopologyDisplay;
    for (const name of FORWARDED) forward(this, display, name);
    if (distortions) display.distortions = distortions;
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

    // The distortions file is optional: if it can't be fetched or parsed the
    // structure is still drawn, against the default membrane.
    const distortionsUrl = this._distortionsUrl;
    const distortionsLoad: Promise<MembraneDistortions | null> = distortionsUrl
      ? fetch(distortionsUrl, { signal: controller.signal })
          .then(async (resp) => {
            if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
            return parseDistortions(await resp.text());
          })
          .catch((err: unknown) => {
            if ((err as { name?: string })?.name !== 'AbortError') {
              const message = err instanceof Error ? err.message : String(err);
              console.warn(`topology-loader: ignoring distortions file: ${message}`);
            }
            return null;
          })
      : Promise.resolve(null);

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

      const [pdbText, dsspText, distortions] = await Promise.all([
        pdbResp.text(),
        dsspResp.text(),
        distortionsLoad,
      ]);

      if (myGen !== this._generation || !this.isConnected) return;

      const chains = parsePdb(pdbText);
      const ssSegments = parseDsspMmcif(dsspText);
      const proteinData = mergeProteinData(pdbId, chains, ssSegments);

      this.renderData(proteinData, distortions);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      if (myGen !== this._generation || !this.isConnected) return;
      const message = err instanceof Error ? err.message : String(err);
      this.renderError(message);
    }
  }
}

function forward(from: Element, to: Element, name: string): void {
  const value = from.getAttribute(name);
  if (value === null) to.removeAttribute(name);
  else to.setAttribute(name, value);
}

declare global {
  interface HTMLElementTagNameMap {
    'topology-loader': TopologyLoader;
  }
}

if (!customElements.get('topology-loader')) {
  customElements.define('topology-loader', TopologyLoader);
}
