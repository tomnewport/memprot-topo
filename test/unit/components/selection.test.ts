import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  TopologyDisplay,
  parseSelection,
  type TopologySelection,
  type TopologyElementDetail,
} from '../../../src/components/topology-display.js';
import type { Calpha, ChainData, ProteinData } from '../../../src/types.js';

/**
 * Chain A: TM helix 1-14 (up), loop 15-18 across the top, TM helix 19-32
 * (down). Chain B: a single TM helix 101-114, offset in x. A is larger, so it
 * is the default chain.
 */
function twoChainProtein(): ProteinData {
  const a: Calpha[] = [];
  for (let i = 0; i < 14; i++) a.push({ resSeq: i + 1, iCode: '', x: 0, y: 0, z: -20 + i * 3 });
  for (let i = 0; i < 4; i++) a.push({ resSeq: 15 + i, iCode: '', x: 3 + i * 3, y: 0, z: 22 });
  for (let i = 0; i < 14; i++) a.push({ resSeq: 19 + i, iCode: '', x: 15, y: 0, z: 19 - i * 3 });
  const b: Calpha[] = [];
  for (let i = 0; i < 14; i++) b.push({ resSeq: 101 + i, iCode: '', x: 40, y: 0, z: -20 + i * 3 });
  const chainA: ChainData = {
    chainId: 'A',
    residueCount: a.length,
    segments: [
      { start: 1, end: 14, type: 'helix' },
      { start: 19, end: 32, type: 'helix' },
    ],
    calphas: a,
  };
  const chainB: ChainData = {
    chainId: 'B',
    residueCount: b.length,
    segments: [{ start: 101, end: 114, type: 'helix' }],
    calphas: b,
  };
  return { pdbId: 'sel1', chains: [chainA, chainB] };
}

function mount(selection?: string): TopologyDisplay {
  const el = new TopologyDisplay();
  if (selection !== undefined) el.setAttribute('selection', selection);
  document.body.appendChild(el);
  el.proteinData = twoChainProtein();
  return el;
}

const svgOf = (el: TopologyDisplay) => el.shadowRoot!.querySelector('.svg-scroll svg')!;
const elements = (el: TopologyDisplay) =>
  Array.from(svgOf(el).querySelectorAll<SVGPolygonElement>('.ss-element'));
const selectedRanges = (el: TopologyDisplay) =>
  Array.from(svgOf(el).querySelectorAll<SVGElement>('.selected')).map(
    (n) => `${n.classList.contains('loop') ? 'loop' : 'ss'}:${n.dataset.start}-${n.dataset.end}`,
  );
const shownChain = (el: TopologyDisplay) =>
  el.shadowRoot!.querySelector('.chain-label')!.textContent!.split('·')[0].trim();

function listen<T>(el: HTMLElement, type: string): T[] {
  const seen: T[] = [];
  el.addEventListener(type, (e) => seen.push((e as CustomEvent<T>).detail));
  return seen;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('parseSelection', () => {
  it('parses a range, a single residue and a whole chain', () => {
    expect(parseSelection('A:45-60')).toEqual({ chainId: 'A', start: 45, end: 60 });
    expect(parseSelection(' A : 45 - 60 ')).toEqual({ chainId: 'A', start: 45, end: 60 });
    expect(parseSelection('A:45')).toEqual({ chainId: 'A', start: 45, end: 45 });
    expect(parseSelection('B')).toEqual({ chainId: 'B', start: null, end: null });
  });

  it('allows negative residue numbers and swaps a reversed range', () => {
    expect(parseSelection('A:-3-10')).toEqual({ chainId: 'A', start: -3, end: 10 });
    expect(parseSelection('A:-10--5')).toEqual({ chainId: 'A', start: -10, end: -5 });
    expect(parseSelection('A:60-45')).toEqual({ chainId: 'A', start: 45, end: 60 });
  });

  it('rejects ranges spanning chains, lists and junk', () => {
    expect(parseSelection('A:45-B:60')).toBeNull();
    expect(parseSelection('A:1-5,B:1-5')).toBeNull();
    expect(parseSelection('A:')).toBeNull();
    expect(parseSelection('')).toBeNull();
    expect(parseSelection(null)).toBeNull();
  });
});

describe('TopologyDisplay selection attribute', () => {
  it('shows the chain named by the selection and styles the overlapping parts', () => {
    const el = mount('B:105-108');
    expect(shownChain(el)).toBe('Chain B');
    expect(selectedRanges(el)).toEqual(['ss:101-114']);
    expect(el.selection).toEqual({ chainId: 'B', start: 105, end: 108 });
  });

  it('selects a loop without its flanking elements', () => {
    const el = mount('A:15-18');
    expect(selectedRanges(el)).toEqual(['loop:15-18']);
  });

  it('resolves a whole-chain selection to the chain bounds and selects everything', () => {
    const el = mount('A');
    expect(el.selection).toEqual({ chainId: 'A', start: 1, end: 32 });
    expect(selectedRanges(el).sort()).toEqual(['loop:15-18', 'ss:1-14', 'ss:19-32']);
  });

  it('shows the default chain and selects nothing for a chain not in the protein', () => {
    const el = mount('Z:1-5');
    expect(shownChain(el)).toBe('Chain A');
    expect(selectedRanges(el)).toEqual([]);
    expect(el.selection).toBeNull();
  });

  it('shows the chain but selects nothing for a range with no residues', () => {
    const el = mount('B:500-600');
    expect(shownChain(el)).toBe('Chain B');
    expect(selectedRanges(el)).toEqual([]);
  });

  it('ignores an invalid selection with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount('A:1-B:5');
    expect(warn).toHaveBeenCalled();
    expect(shownChain(el)).toBe('Chain A');
    expect(selectedRanges(el)).toEqual([]);
  });

  it('restyles in place, without re-rendering, when the chain does not change', () => {
    const el = mount('A:1-3');
    const svg = svgOf(el);
    el.setAttribute('selection', 'A:20-25');
    expect(svgOf(el)).toBe(svg);
    expect(selectedRanges(el)).toEqual(['ss:19-32']);
    el.removeAttribute('selection');
    expect(selectedRanges(el)).toEqual([]);
  });

  it('does not emit events for programmatic changes', () => {
    const el = mount();
    const events = [
      ...listen(el, 'chain-select'),
      ...listen(el, 'element-click'),
      ...listen(el, 'element-hover'),
    ];
    el.selection = { chainId: 'B', start: 101, end: 102 };
    expect(el.getAttribute('selection')).toBe('B:101-102');
    expect(events).toEqual([]);
  });
});

describe('TopologyDisplay selection events', () => {
  it('emits chain-select with the whole chain when a chain is picked', () => {
    const el = mount();
    const seen = listen<TopologySelection>(el, 'chain-select');
    const pickB = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.chain-violin'),
    ).find((b) => b.getAttribute('aria-label')!.includes('chain B'))!;
    pickB.click();
    expect(seen).toEqual([{ chainId: 'B', start: 101, end: 114 }]);
    expect(el.getAttribute('selection')).toBe('B:101-114');
    expect(shownChain(el)).toBe('Chain B');
    expect(selectedRanges(el)).toEqual(['ss:101-114']);
  });

  it('makes SS elements focusable buttons', () => {
    const el = mount();
    const els = elements(el);
    expect(els).toHaveLength(2);
    for (const e of els) {
      expect(e.getAttribute('role')).toBe('button');
      expect(e.getAttribute('tabindex')).toBe('0');
      expect(e.getAttribute('aria-pressed')).toBe('false');
    }
    expect(els[0].getAttribute('aria-label')).toBe('Helix 1–14');
  });

  it('selects an element and emits element-click on click', () => {
    const el = mount();
    const seen = listen<TopologyElementDetail>(el, 'element-click');
    const second = elements(el)[1];
    second.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(seen).toEqual([{ chainId: 'A', start: 19, end: 32, type: 'helix' }]);
    expect(el.getAttribute('selection')).toBe('A:19-32');
    expect(second.classList.contains('selected')).toBe(true);
    expect(second.getAttribute('aria-pressed')).toBe('true');
    // Same chain, so the element (and any focus on it) survives.
    expect(second.isConnected).toBe(true);
  });

  it('activates an element on Enter and Space but not other keys', () => {
    const el = mount();
    const seen = listen<TopologyElementDetail>(el, 'element-click');
    const first = elements(el)[0];
    const key = (k: string) =>
      first.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
      );
    key('a');
    expect(seen).toHaveLength(0);
    expect(key('Enter')).toBe(false); // default prevented
    expect(key(' ')).toBe(false);
    expect(seen.map((d) => d.start)).toEqual([1, 1]);
  });

  it('emits element-hover on enter and null on leave', () => {
    const el = mount();
    const seen = listen<TopologyElementDetail | null>(el, 'element-hover');
    const [first, second] = elements(el);
    first.dispatchEvent(new Event('pointerover', { bubbles: true }));
    first.dispatchEvent(new Event('pointerover', { bubbles: true })); // no repeat
    second.dispatchEvent(new Event('pointerover', { bubbles: true }));
    svgOf(el).dispatchEvent(new Event('pointerleave'));
    expect(seen).toEqual([
      { chainId: 'A', start: 1, end: 14, type: 'helix' },
      { chainId: 'A', start: 19, end: 32, type: 'helix' },
      null,
    ]);
  });
});

describe('TopologyDisplay selection across protein changes', () => {
  it('keeps a page-set selection when the protein data loads later', () => {
    const el = new TopologyDisplay();
    el.setAttribute('selection', 'B:101-104');
    document.body.appendChild(el);
    el.proteinData = twoChainProtein();
    expect(shownChain(el)).toBe('Chain B');
    el.proteinData = twoChainProtein();
    expect(el.getAttribute('selection')).toBe('B:101-104');
    expect(shownChain(el)).toBe('Chain B');
  });

  it("keeps the user's pick across a new protein with that chain; resetView() drops it", () => {
    const el = mount();
    elements(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(el.getAttribute('selection')).toBe('A:1-14');
    el.proteinData = twoChainProtein();
    expect(el.getAttribute('selection')).toBe('A:1-14');
    el.resetView();
    expect(el.hasAttribute('selection')).toBe(false);
  });

  it("drops the user's pick when the new protein lacks its chain", () => {
    const el = mount();
    elements(el)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const other = twoChainProtein();
    other.chains = other.chains.map((c) => ({
      ...c,
      chainId: c.chainId === 'A' ? 'C' : c.chainId,
    }));
    el.proteinData = other;
    expect(el.hasAttribute('selection')).toBe(false);
  });

  it('keeps a selection the page set across resetView()', () => {
    const el = mount('A:1-14');
    el.resetView();
    expect(el.getAttribute('selection')).toBe('A:1-14');
  });
});

describe('TopologyDisplay de-emphasis outside the selection', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('marks the 2-D view while something is selected', () => {
    const el = mount('A:1-14');
    expect(svgOf(el).classList.contains('has-selection')).toBe(true);
    el.setAttribute('selection', 'A:900-950');
    expect(svgOf(el).classList.contains('has-selection')).toBe(false);
    el.removeAttribute('selection');
    expect(svgOf(el).classList.contains('has-selection')).toBe(false);
  });
});

describe('TopologyDisplay selection in the 3-D view', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  const selected3d = (el: TopologyDisplay): (string | null)[] =>
    [...el.shadowRoot!.querySelectorAll('.morph-svg g.selected')].map((g) =>
      g.getAttribute('data-type'),
    );

  it('marks the selected elements and loops, and follows changes in place', async () => {
    const el = mount('A:1-14');
    await el.setTransitionProgress(1);
    const svg = el.shadowRoot!.querySelector('.morph-svg');
    expect(new Set(selected3d(el))).toEqual(new Set(['helix']));
    // Outlines are drawn wider while selected.
    const outlines = (): number =>
      [...el.shadowRoot!.querySelectorAll('.morph-svg path[stroke-width]')]
        .map((p) => Number(p.getAttribute('stroke-width')))
        .reduce((a, b) => a + b, 0);
    const wide = outlines();

    el.setAttribute('selection', 'A:15-18');
    expect(new Set(selected3d(el))).toEqual(new Set(['loop']));
    expect(el.shadowRoot!.querySelector('.morph-svg')).toBe(svg);
    expect(el.transitionProgress).toBe(1);

    el.removeAttribute('selection');
    expect(selected3d(el)).toEqual([]);
    expect(outlines()).toBeLessThan(wide);
  });

  it('desaturates the unselected elements while there is a selection', async () => {
    const el = mount();
    await el.setTransitionProgress(1);
    // Spread between the largest and smallest channel, over every coloured path.
    const chroma = (): number =>
      [...el.shadowRoot!.querySelectorAll('.morph-svg g path')]
        .flatMap((p) => [p.getAttribute('fill'), p.getAttribute('stroke')])
        .filter((c): c is string => !!c && c.startsWith('rgb('))
        .map((c) => {
          const v = c.slice(4, -1).split(',').map(Number);
          return Math.max(...v) - Math.min(...v);
        })
        .reduce((a, b) => a + b, 0);
    const full = chroma();
    el.setAttribute('selection', 'A:1-14');
    expect(chroma()).toBeLessThan(full);
    el.setAttribute('selection', 'A');
    expect(chroma()).toBeCloseTo(full, 0);
  });
});
