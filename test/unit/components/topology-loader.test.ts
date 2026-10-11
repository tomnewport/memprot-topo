import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TopologyLoader } from '../../../src/components/topology-loader.js';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import { syntheticDistortions } from '../fixtures/distortions.js';
import OMF_AT from '../../../examples/2omf_default_dppc-at.pdb?raw';
import OMF_DSSP from '../../../examples/2omf.dssp.cif?raw';
import G53_PDB from '../../../examples/5g53.pdb?raw';

// Minimal PDB with 11 CA atoms spanning z = -20 to +20 (simulates a TM helix).
const MINIMAL_PDB = `\
ATOM      1  CA  ALA A   1       0.000   0.000 -20.000  1.00  0.00           C
ATOM      2  CA  ALA A   2       3.800   0.000 -16.000  1.00  0.00           C
ATOM      3  CA  ALA A   3       0.000   0.000 -12.000  1.00  0.00           C
ATOM      4  CA  ALA A   4       3.800   0.000  -8.000  1.00  0.00           C
ATOM      5  CA  ALA A   5       0.000   0.000  -4.000  1.00  0.00           C
ATOM      6  CA  ALA A   6       3.800   0.000   0.000  1.00  0.00           C
ATOM      7  CA  ALA A   7       0.000   0.000   4.000  1.00  0.00           C
ATOM      8  CA  ALA A   8       3.800   0.000   8.000  1.00  0.00           C
ATOM      9  CA  ALA A   9       0.000   0.000  12.000  1.00  0.00           C
ATOM     10  CA  ALA A  10       3.800   0.000  16.000  1.00  0.00           C
ATOM     11  CA  ALA A  11       0.000   0.000  20.000  1.00  0.00           C
`;

const MINIMAL_MMCIF = `\
data_DSSP
#
loop_
_struct_conf.conf_type_id
_struct_conf.id
_struct_conf.beg_auth_asym_id
_struct_conf.beg_auth_seq_id
_struct_conf.pdbx_beg_PDB_ins_code
_struct_conf.end_auth_asym_id
_struct_conf.end_auth_seq_id
_struct_conf.pdbx_end_PDB_ins_code
HELX_P H1 A 1 . A 11 .
#
`;

function makeFetchMock(pdbText: string = MINIMAL_PDB, dsspText: string = MINIMAL_MMCIF) {
  return vi.fn().mockImplementation((url: string) => {
    const text = (url as string).includes('pdb-redo.eu') ? dsspText : pdbText;
    return Promise.resolve({ ok: true, text: () => Promise.resolve(text) });
  });
}

/** Flush all pending microtasks / resolved promises. */
function flushPromises() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('TopologyLoader', () => {
  const attached: HTMLElement[] = [];

  function attach<T extends HTMLElement>(el: T): T {
    document.body.appendChild(el);
    attached.push(el);
    return el;
  }

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = makeFetchMock();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    for (const el of attached.splice(0)) document.body.removeChild(el);
    vi.unstubAllGlobals();
  });

  it('shows loading state immediately when pdb-id attribute is set', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '1abc');

    const loading = el.shadowRoot!.querySelector('.loading');
    expect(loading).not.toBeNull();
    expect(loading!.textContent).toContain('1abc');
  });

  it('fetches from the memprotmd URL with the default sim-id', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '1abc');

    const pdbCall = fetchMock.mock.calls.find(([url]: [string]) => url.includes('memprotmd'));
    expect(pdbCall).toBeDefined();
    expect(pdbCall![0]).toContain('1abc_default_dppc');
  });

  it('fetches from pdb-redo with the correct pdb-id query param', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '1abc');

    const dsspCall = fetchMock.mock.calls.find(([url]: [string]) => url.includes('pdb-redo.eu'));
    expect(dsspCall).toBeDefined();
    expect(dsspCall![0]).toContain('pdb-id=1abc');
  });

  it('uses custom sim-id in the fetch URL when sim-id attribute is set', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '2xyz');
    el.setAttribute('sim-id', 'my_custom_sim');

    const pdbCalls = fetchMock.mock.calls.filter(([url]: [string]) => url.includes('memprotmd'));
    const lastCall = pdbCalls[pdbCalls.length - 1];
    expect(lastCall[0]).toContain('my_custom_sim');
    expect(lastCall[0]).not.toContain('default_dppc');
  });

  it('does not trigger a new load when pdb-id is set to the same value', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '3def');
    const callCount = fetchMock.mock.calls.length;

    el.setAttribute('pdb-id', '3def');

    expect(fetchMock.mock.calls.length).toBe(callCount);
  });

  it('triggers a new load when pdb-id changes to a different value', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '4abc');
    const callsAfterFirst = fetchMock.mock.calls.length;

    el.setAttribute('pdb-id', '5xyz');

    expect(fetchMock.mock.calls.length).toBeGreaterThan(callsAfterFirst);
    const newPdbCall = fetchMock.mock.calls.find(([url]: [string]) => url.includes('5xyz'));
    expect(newPdbCall).toBeDefined();
  });

  it('does not trigger a new load when sim-id is set to the same value', () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '6abc');
    el.setAttribute('sim-id', 'my_sim');
    const callCount = fetchMock.mock.calls.length;

    el.setAttribute('sim-id', 'my_sim');

    expect(fetchMock.mock.calls.length).toBe(callCount);
  });

  it('does not call fetch when pdb-id is set before the element is connected', () => {
    const el = new TopologyLoader();
    el.setAttribute('pdb-id', '7ghi');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renders a topology-display element after data loads successfully', async () => {
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '8abc');

    await flushPromises();

    const display = el.shadowRoot!.querySelector('topology-display');
    expect(display).not.toBeNull();
  });

  it('draws a MemProtMD at.pdb with no distortions file: deposited chains, on its own bilayer', async () => {
    vi.stubGlobal('fetch', makeFetchMock(OMF_AT, OMF_DSSP));
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '2omf');

    await flushPromises();

    const display = el.shadowRoot!.querySelector('topology-display') as TopologyDisplay;
    const data = display.proteinData!;
    // One blank chain of 1020 residues becomes the trimer, in chain A's numbering.
    expect(data.chains.map((c) => [c.chainId, c.residueCount])).toEqual([
      ['A', 340],
      ['B', 340],
      ['C', 340],
    ]);
    expect(data.chains[1].segments.filter((s) => s.type === 'strand').length).toBeGreaterThan(10);
    // Centred on the phosphates' midplane (z = 47.96 in the box).
    expect(display.membrane!.shift).toBeCloseTo(-47.96, 2);
    expect(display.membrane!.bulk.upper).toBeCloseTo(19.97, 2);
    expect(display.shadowRoot!.querySelector('.chain-note')).toBeNull();
  });

  it('fetches the distortions file named by the distortions attribute and hands it on', async () => {
    const DIST_URL = 'https://example.org/1abc_default_dppc-distortions.pdb';
    const distText = syntheticDistortions({
      midplane: 40,
      half: 19,
      centre: { x: 0, y: 0 },
      radius: 30,
    });
    fetchMock.mockImplementation((url: string) => {
      const text =
        url === DIST_URL ? distText : url.includes('pdb-redo.eu') ? MINIMAL_MMCIF : MINIMAL_PDB;
      return Promise.resolve({ ok: true, text: () => Promise.resolve(text) });
    });
    const el = attach(new TopologyLoader());
    el.setAttribute('distortions', DIST_URL);
    el.setAttribute('membrane-detail', 'annular');
    el.setAttribute('structure-projection', 'perspective');
    el.setAttribute('pdb-id', '1abc');

    await flushPromises();

    expect(fetchMock.mock.calls.map((c) => c[0])).toContain(DIST_URL);
    const display = el.shadowRoot!.querySelector('topology-display') as TopologyDisplay;
    expect(display).toBeInstanceOf(TopologyDisplay);
    expect(display.distortions?.midplane).toBeCloseTo(40, 6);
    expect(display.membrane?.bulk.upper).toBeCloseTo(19, 6);

    // membrane-detail is passed through, before and after the display exists.
    expect(display.membraneDetail).toBe('annular');
    const calls = fetchMock.mock.calls.length;
    el.setAttribute('membrane-detail', 'bulk');
    expect(display.membraneDetail).toBe('bulk');
    // So are the 3-D view and transition attributes.
    expect(display.getAttribute('structure-projection')).toBe('perspective');
    el.setAttribute('transition-sweep', '0');
    expect(display.getAttribute('transition-sweep')).toBe('0');
    // … without loading the structure again.
    await flushPromises();
    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(el.shadowRoot!.querySelector('topology-display')).toBe(display);
  });

  it('still draws the structure when the distortions file cannot be fetched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('missing')) {
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
      }
      const text = url.includes('pdb-redo.eu') ? MINIMAL_MMCIF : MINIMAL_PDB;
      return Promise.resolve({ ok: true, text: () => Promise.resolve(text) });
    });
    const el = attach(new TopologyLoader());
    el.setAttribute('distortions', 'https://example.org/missing.pdb');
    el.setAttribute('pdb-id', '1abc');

    await flushPromises();

    const display = el.shadowRoot!.querySelector('topology-display') as TopologyDisplay;
    expect(display).not.toBeNull();
    expect(display.distortions).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/404/));
    warn.mockRestore();
  });

  it('renders an error when the PDB fetch fails', async () => {
    fetchMock.mockImplementation((url: string) => {
      if ((url as string).includes('memprotmd')) {
        return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve(MINIMAL_MMCIF) });
    });

    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '9bad');

    await flushPromises();

    const errorEl = el.shadowRoot!.querySelector('.error');
    expect(errorEl).not.toBeNull();
  });

  it('computes the secondary structure on the coordinates, unless ss-source is pdb-redo', async () => {
    vi.stubGlobal('fetch', makeFetchMock(G53_PDB, MINIMAL_MMCIF));
    const computed = attach(new TopologyLoader());
    computed.setAttribute('pdb-id', '5g53');
    const filed = attach(new TopologyLoader());
    filed.setAttribute('ss-source', 'pdb-redo');
    filed.setAttribute('pdb-id', '5g53');

    await flushPromises();

    const helices = (el: TopologyLoader) =>
      (el.shadowRoot!.querySelector('topology-display') as TopologyDisplay)
        .proteinData!.chains[0].segments.filter((s) => s.type === 'helix')
        .map((s) => [s.start, s.end]);
    // The file names one helix, A 1-11; 5G53's coordinates give its seven TM helices and more.
    expect(helices(filed)).toEqual([[1, 11]]);
    expect(helices(computed).length).toBeGreaterThan(7);
  });

  it("draws a full-backbone structure in its own numbering when PDB-REDO can't be reached", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('pdb-redo.eu')) {
        return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve(G53_PDB) });
    });
    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '5g53');

    await flushPromises();

    const display = el.shadowRoot!.querySelector('topology-display') as TopologyDisplay;
    expect(display.proteinData!.chains[0].segments.length).toBeGreaterThan(7);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/503/));
    warn.mockRestore();
  });

  it('renders an error when the DSSP fetch fails for a Cα-only structure, or ss-source is pdb-redo', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockImplementation((url: string) => {
      if ((url as string).includes('pdb-redo.eu')) {
        return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' });
      }
      const text = url.includes('5g53') ? G53_PDB : MINIMAL_PDB;
      return Promise.resolve({ ok: true, text: () => Promise.resolve(text) });
    });

    const caOnly = attach(new TopologyLoader());
    caOnly.setAttribute('pdb-id', '9bad');
    const filed = attach(new TopologyLoader());
    filed.setAttribute('ss-source', 'pdb-redo');
    filed.setAttribute('pdb-id', '5g53');

    await flushPromises();

    expect(caOnly.shadowRoot!.querySelector('.error')).not.toBeNull();
    expect(filed.shadowRoot!.querySelector('.error-detail')!.textContent).toMatch(
      /DSSP fetch failed/,
    );
    warn.mockRestore();
  });

  it('aborts the previous request when pdb-id changes before fetch completes', () => {
    let aborted = false;
    fetchMock.mockImplementation((_url: string, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts?.signal?.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '1abc');
    el.setAttribute('pdb-id', '2xyz');

    expect(aborted).toBe(true);
  });
});

describe('TopologyLoader tracks', () => {
  beforeEach(() => vi.stubGlobal('fetch', makeFetchMock()));
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  const display = (el: TopologyLoader) =>
    el.shadowRoot!.querySelector<TopologyDisplay>('topology-display')!;

  it('hands the display its property, attribute or script child', async () => {
    const el = new TopologyLoader();
    const script = document.createElement('script');
    script.type = 'application/json';
    script.slot = 'tracks';
    script.textContent = '{"tracks":[]}';
    el.appendChild(script);
    el.setAttribute('pdb-id', '1abc');
    document.body.appendChild(el);
    await flushPromises();
    expect(display(el).tracks).toBe('{"tracks":[]}');

    el.setAttribute('tracks', '{"chain":{}}');
    expect(display(el).tracks).toBe('{"chain":{}}');
    el.removeAttribute('tracks');
    expect(display(el).tracks).toBe('{"tracks":[]}');

    const cfg = { tracks: [] };
    el.tracks = cfg;
    expect(el.tracks).toBe(cfg);
    expect(display(el).tracks).toBe(cfg);
    el.tracks = null;
    expect(el.tracks).toBeNull();
    expect(display(el).tracks).toBe('{"tracks":[]}');
  });

  it('passes a property set before loading to the display it makes', async () => {
    const el = new TopologyLoader();
    const cfg = { tracks: [] };
    el.tracks = cfg;
    el.setAttribute('pdb-id', '1abc');
    document.body.appendChild(el);
    await flushPromises();
    expect(display(el).tracks).toBe(cfg);
  });
});
