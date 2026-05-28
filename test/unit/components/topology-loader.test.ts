import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TopologyLoader } from '../../../src/components/topology-loader.js';

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

  it('renders an error when the DSSP fetch fails', async () => {
    fetchMock.mockImplementation((url: string) => {
      if ((url as string).includes('pdb-redo.eu')) {
        return Promise.resolve({ ok: false, status: 503, statusText: 'Service Unavailable' });
      }
      return Promise.resolve({ ok: true, text: () => Promise.resolve(MINIMAL_PDB) });
    });

    const el = attach(new TopologyLoader());
    el.setAttribute('pdb-id', '9bad');

    await flushPromises();

    const errorEl = el.shadowRoot!.querySelector('.error');
    expect(errorEl).not.toBeNull();
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
