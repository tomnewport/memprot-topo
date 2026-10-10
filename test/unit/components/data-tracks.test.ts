import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataTracks } from '../../../src/components/data-tracks.js';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import type { TrackPalette } from '../../../src/tracks/resolve.js';
import type { ChainData, ProteinData } from '../../../src/types.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

const PALETTE: TrackPalette = {
  dataScale: ['#000000', '#ffffff'],
  dataCategories: ['#111111'],
  viridis: ['#000000', '#ffffff'],
  aminoAcids: {},
};

const flush = () => new Promise((r) => setTimeout(r, 0));

const chain: ChainData = {
  chainId: 'A',
  residueCount: 3,
  segments: [{ start: 1, end: 3, type: 'helix' }],
  calphas: [1, 2, 3].map((resSeq) => ({
    resSeq,
    iCode: '',
    x: 0,
    y: 0,
    z: resSeq,
    tempFactor: resSeq / 10,
  })),
};
const residues = chain.calphas!.map((c) => ({ ...c, code: 'A' }));

function host() {
  return { redraw: vi.fn(), warn: vi.fn() };
}

describe('DataTracks', () => {
  it('resolves a configuration without sources at once', () => {
    const h = host();
    const t = new DataTracks(h);
    expect(t.active).toBe(false);
    expect(
      t.resolve('A', residues, [chain], [0, 0, 0], { upper: 20, lower: -20 }, PALETTE),
    ).toBeNull();
    const cfg = {
      tracks: [
        {
          type: 'line' as const,
          series: ['structure.tempFactor'],
          reference: [{ ref: 'membrane.upper' }],
        },
      ],
    };
    t.set(cfg);
    expect(t.value).toBe(cfg);
    expect(t.active).toBe(true);
    expect(h.redraw).toHaveBeenCalledOnce();
    t.set(cfg);
    expect(h.redraw).toHaveBeenCalledOnce();
    const r = t.resolve('A', residues, [chain], [0, 0, 0], { upper: 20, lower: -20 }, PALETTE)!;
    expect(r.above[0]).toMatchObject({ kind: 'line', lines: [{ values: [0.1, 0.2, 0.3] }] });
    t.set(null);
    expect(t.active).toBe(false);
    expect(t.value).toBeNull();
  });

  it('waits for its sources, and reports each warning once', async () => {
    const h = host();
    const t = new DataTracks(h);
    t.set(
      JSON.stringify({
        bogus: 1,
        sources: { v: { type: 'values', data: { A: { 1: 5, 2: 6 } } } },
        tracks: [{ type: 'heatmap', series: ['v.value', 'nope'] }],
      }),
    );
    expect(h.warn).toHaveBeenCalledWith('unknown key "bogus"');
    const args = ['A', residues, [chain], [0, 0, 0], { upper: 20, lower: -20 }, PALETTE] as const;
    expect(t.resolve(...args)).toBeNull();
    expect(t.chainStyle([chain])).toEqual({ colours: null, widths: null });
    await flush();
    expect(h.redraw).toHaveBeenCalledOnce();
    expect(t.resolve(...args)!.above).toHaveLength(1);
    t.resolve(...args);
    expect(h.warn.mock.calls.filter((c) => c[0] === 'no series "nope"')).toHaveLength(1);
  });

  it('drops the sources of a configuration replaced while they load', async () => {
    const h = host();
    const t = new DataTracks(h);
    t.set({ sources: { v: { type: 'values', data: { A: { 1: 1 } } } } });
    t.set({ tracks: [] });
    await flush();
    expect(h.redraw).toHaveBeenCalledOnce();
    t.dispose();
  });

  it('styles every chain from chain.colour and chain.width, memoised per data', async () => {
    const h = host();
    const t = new DataTracks(h);
    t.set({
      sources: { v: { type: 'values', data: { A: { 1: 2, 3: 4 } } } },
      chain: { colour: 'structure.tempFactor', width: 'v.value' },
    });
    await flush();
    const chains = [chain];
    const style = t.chainStyle(chains);
    expect(style.colours).toEqual({ A: { 1: 0.1, 2: 0.2, 3: 0.3 } });
    expect(style.widths).toEqual({ A: { 1: 2, 3: 4 } });
    expect(t.chainStyle(chains)).toBe(style);
    t.set({ chain: { colour: 'nope.x' } });
    expect(t.chainStyle(chains)).toEqual({ chains, colours: null, widths: null });
    t.set({ tracks: [] });
    expect(t.chainStyle(chains)).toEqual({ colours: null, widths: null });
  });
});

describe('<topology-display> tracks', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const protein = (): ProteinData => ({ pdbId: 'tst1', chains: [syntheticBarrel()] });
  const config = {
    tracks: [
      { type: 'heatmap', series: ['structure.z'], scale: ['#010203', '#010203'] },
      { type: 'sequence', colour: 'none' },
    ],
  };

  function oneD(el: TopologyDisplay): ShadowRoot {
    el.setAttribute('transition-time', '0');
    el.dimension = 1;
    return el.shadowRoot!;
  }

  it('draws tracks in the sequence view from the property', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = protein();
    el.tracks = config;
    expect(el.tracks).toBe(config);
    const root = oneD(el);
    expect(root.querySelectorAll('rect[fill="rgb(1, 2, 3)"]').length).toBeGreaterThan(0);
  });

  it('reads the attribute and a script child, the property winning over both', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = new TopologyDisplay();
    const script = document.createElement('script');
    script.type = 'application/json';
    script.slot = 'tracks';
    script.textContent = JSON.stringify(config);
    el.appendChild(script);
    document.body.appendChild(el);
    expect(el.tracks).toBe(script.textContent);
    el.setAttribute('tracks', '{"tracks":[]}');
    expect(el.tracks).toBe('{"tracks":[]}');
    el.tracks = { tracks: [] };
    el.setAttribute('tracks', '{"chain":{}}');
    expect(el.tracks).toEqual({ tracks: [] });
    // Back to the attribute, then the script once the attribute goes.
    el.tracks = null;
    expect(el.tracks).toBe('{"chain":{}}');
    el.removeAttribute('tracks');
    expect(el.tracks).toBe(script.textContent);
    el.tracks = null;
    expect(el.tracks).toBe(script.textContent);
    el.setAttribute('tracks', '{');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringMatching(/^topology-display: tracks: not valid JSON/),
    );
  });

  it('colours the chain from chain.colour unless the page sets residue colours', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = protein();
    const before = el.shadowRoot!.querySelector('.svg-scroll svg')!.innerHTML;
    el.tracks = { chain: { colour: 'structure.z' } };
    const coloured = el.shadowRoot!.querySelector('.svg-scroll svg')!.innerHTML;
    expect(coloured).not.toBe(before);
    el.residueColours = { [el.proteinData!.chains[0].chainId]: { 1: '#ff0000' } };
    expect(el.shadowRoot!.querySelector('.svg-scroll svg')!.innerHTML).not.toBe(coloured);
  });
});
