import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../../src/index.js';
import type { TopologyDisplay } from '../../../src/components/topology-display.js';
import { residueNumberingName } from '../../../src/components/data-numbering.js';
import { threeHelixChain } from '../fixtures/helices.js';
import { siftsXml, type SiftsRow } from '../fixtures/sifts.js';

// UniProt is the structure's numbering + 100 for residues 1–81 of chain A.
const XML = siftsXml(
  Array.from({ length: 81 }, (_, i): SiftsRow => ['A', String(i + 1), 'P11111', i + 101]),
);

function mount(pdbId: string, attrs: Record<string, string> = {}): TopologyDisplay {
  const el = document.createElement('topology-display') as TopologyDisplay;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  el.residueColours = { A: { 103: 0, 126: 10 } };
  el.proteinData = { pdbId, chains: [threeHelixChain()] };
  return el;
}

const stroke = (el: TopologyDisplay, res: string) =>
  el.shadowRoot!.querySelector(`[data-res="${res}"]`)?.getAttribute('stroke') ?? null;

describe('residue-numbering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads unset and unknown values as author numbering', () => {
    expect(residueNumberingName(null)).toBe('author');
    expect(residueNumberingName('UniProt ')).toBe('uniprot');
    expect(residueNumberingName('label')).toBe('author');
  });

  it('keys residue data by the structure numbering by default, without fetching', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const el = mount('1aaa');
    expect(el.residueNumbering).toBe('author');
    expect(stroke(el, '3')).toBeNull();
    el.residueColours = { A: { 3: 0, 26: 10 } };
    expect(stroke(el, '3')).not.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('moves UniProt-numbered data onto the structure once SIFTS arrives', async () => {
    const fetchMock = vi.fn(async () => new Response(XML));
    vi.stubGlobal('fetch', fetchMock);
    const el = mount('1aab', { 'residue-numbering': 'uniprot' });
    // Nothing is drawn at a residue before the map is known.
    expect(stroke(el, '3')).toBeNull();
    await vi.waitFor(() => expect(stroke(el, '3')).not.toBeNull());
    expect(stroke(el, '26')).not.toBeNull();
    expect(stroke(el, '3')).not.toBe(stroke(el, '26'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      'https://www.ebi.ac.uk/pdbe/files/sifts/1aab.xml.gz',
      { signal: undefined },
    ]);
  });

  it('renumbers sequence tracks too', async () => {
    vi.stubGlobal('fetch', async () => new Response(XML));
    const el = mount('1aac', { 'residue-numbering': 'uniprot' });
    el.sequenceTracks = [{ label: 'T', values: { A: { 110: 1, 999: 2 } } }];
    const tracks = () =>
      (el as unknown as { numberedTracks(): { values: unknown }[] }).numberedTracks();
    expect(tracks()).toEqual([]);
    await vi.waitFor(() => expect(stroke(el, '3')).not.toBeNull());
    expect(tracks()).toEqual([{ label: 'T', values: { A: { 10: 1 } } }]);
  });

  it('shares one lookup per entry between displays', async () => {
    const fetchMock = vi.fn(async () => new Response(XML));
    vi.stubGlobal('fetch', fetchMock);
    const a = mount('1aad', { 'residue-numbering': 'uniprot' });
    const b = mount('1aad', { 'residue-numbering': 'uniprot' });
    await vi.waitFor(() => expect(stroke(a, '3') && stroke(b, '3')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('draws no residue data and warns when SIFTS has no file', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 404, statusText: 'Not Found' }));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount('1aae', { 'residue-numbering': 'uniprot' });
    await vi.waitFor(() => expect(warn).toHaveBeenCalled());
    expect(String(warn.mock.calls[0][0])).toMatch(/no UniProt numbering for 1aae.*404/);
    expect(stroke(el, '3')).toBeNull();
    // Back to author numbering, the data (now read as author numbers) is drawn.
    el.residueNumbering = 'author';
    el.residueColours = { A: { 3: 0, 26: 10 } };
    expect(stroke(el, '3')).not.toBeNull();
  });
});
