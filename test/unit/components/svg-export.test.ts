import { describe, it, expect, afterEach, vi } from 'vitest';
import '../../../src/index.js';
import type { TopologyDisplay } from '../../../src/components/topology-display.js';
import { exportSvg, exportSvgElement } from '../../../src/components/svg-export.js';
import { renderExportPanel } from '../../../src/components/export-panel.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { resolveMembrane } from '../../../src/membrane/index.js';
import { getTheme, LIGHT_THEME, DARK_THEME } from '../../../src/theme/index.js';
import { layoutChain } from '../../../src/layout/index.js';
import { threeHelixChain } from '../fixtures/helices.js';

function layout() {
  const chain = threeHelixChain();
  return layoutChain(
    chain,
    { showPoints: false, extremePoints: true, extremeThreshold: 0.2 },
    analyseBarrel(chain.calphas, chain.segments),
    false,
    resolveMembrane({}, null, []),
    chain.calphas.filter((c) => Math.abs(c.z) < 12),
  );
}

const parse = (text: string) =>
  new DOMParser().parseFromString(text, 'image/svg+xml').documentElement;

describe('exportSvg (2-D)', () => {
  it('is a standalone SVG file of the topology, painted in the theme', () => {
    const text = exportSvg({ dimension: 2, layout: layout() }, getTheme('light')!);
    expect(text.startsWith('<?xml')).toBe(true);
    const svg = parse(text);
    expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(svg.querySelector('parsererror')).toBeNull();
    expect(svg.querySelector('style')).toBeNull();
    expect(svg.querySelector('title')?.textContent).toContain('Chain A');
    expect(svg.querySelector('rect.background')?.getAttribute('fill')).toBe(LIGHT_THEME.background);
    const fills = [...svg.querySelectorAll('polygon')].map((p) => p.getAttribute('fill'));
    expect(fills).toContain(LIGHT_THEME.helix);
    // No interactive or theme-bookkeeping markup.
    for (const attr of ['data-mp-paint', 'tabindex', 'role', 'aria-pressed']) {
      expect(svg.querySelector(`[${attr}]`)).toBeNull();
    }
  });

  it('draws in the theme asked for, and can leave the background transparent', () => {
    const svg = exportSvgElement({ dimension: 2, layout: layout() }, DARK_THEME, {
      background: false,
    });
    expect(svg.querySelector('rect.background')).toBeNull();
    const fills = [...svg.querySelectorAll('polygon')].map((p) => p.getAttribute('fill'));
    expect(fills).toContain(DARK_THEME.helix);
    expect(fills).not.toContain(LIGHT_THEME.helix);
  });

  it('keeps the picture at its own size and puts chain icons over it', () => {
    const l = layout();
    const bare = exportSvgElement({ dimension: 2, layout: l }, LIGHT_THEME);
    expect(Number(bare.getAttribute('width'))).toBeCloseTo(l.frame.width, 1);
    expect(Number(bare.getAttribute('height'))).toBeCloseTo(l.frame.height, 1);

    const icons = {
      maxDensity: 1,
      icons: [
        { shape: null, label: { base: 'A', suffix: null }, selected: true },
        { shape: null, label: { base: 'B', suffix: null }, selected: false },
      ],
    };
    const svg = exportSvgElement({ dimension: 2, layout: l }, LIGHT_THEME, { icons });
    const drawn = svg.querySelectorAll('.chain-icons > svg');
    expect(drawn).toHaveLength(2);
    // The grid shows on the selected chain's icon only.
    expect(drawn[0].querySelector('.icon-grid')).not.toBeNull();
    expect(drawn[1].querySelector('.icon-grid')).toBeNull();
    const picture = svg.querySelector(':scope > svg')!;
    expect(Number(picture.getAttribute('y'))).toBeGreaterThan(0);
    expect(Number(svg.getAttribute('height'))).toBeGreaterThan(l.frame.height);
  });
});

describe('<topology-display> exportSvg', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function mount(chains = [threeHelixChain()]): TopologyDisplay {
    const el = document.createElement('topology-display') as TopologyDisplay;
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'tst3', chains };
    return el;
  }

  it('returns null before a chain is shown', () => {
    const el = document.createElement('topology-display') as TopologyDisplay;
    document.body.appendChild(el);
    expect(el.exportSvg()).toBeNull();
  });

  it('exports the 2-D topology by default and the 1-D sequence when asked', () => {
    const el = mount();
    const two = parse(el.exportSvg()!);
    expect(two.querySelector('path.membrane')).not.toBeNull();
    const one = parse(el.exportSvg({ dimension: 1 })!);
    expect(one.querySelector('path.membrane')).toBeNull();
    // The sequence view spells the chain out in one-letter codes.
    expect(one.querySelectorAll('text').length).toBeGreaterThan(20);
    expect(one.querySelector('[data-mp-paint]')).toBeNull();
  });

  it('follows the view shown, and the theme asked for', () => {
    const el = mount();
    el.setAttribute('transition-time', '0');
    el.dimension = 1;
    const one = parse(el.exportSvg()!);
    expect(one.querySelector('path.membrane')).toBeNull();
    const dark = parse(el.exportSvg({ theme: 'dark', dimension: 2 })!);
    expect(dark.querySelector('rect.background')?.getAttribute('fill')).toBe(DARK_THEME.background);
  });

  it('draws chain icons when the picker is shown, unless turned off', () => {
    const a = threeHelixChain();
    const el = mount([a, { ...a, chainId: 'B' }]);
    // One icon per picker button: the copies of a chain share one.
    const buttons = el.shadowRoot!.querySelectorAll('.chain-violin').length;
    expect(buttons).toBeGreaterThan(0);
    expect(parse(el.exportSvg()!).querySelectorAll('.chain-icons > svg')).toHaveLength(buttons);
    expect(parse(el.exportSvg({ chainIcons: false })!).querySelector('.chain-icons')).toBeNull();
    expect(parse(mount().exportSvg()!).querySelector('.chain-icons')).toBeNull();
  });

  it('downloads from the view bar’s panel, and disables export in 3-D', () => {
    const created: Blob[] = [];
    // jsdom has no object URLs.
    Object.assign(URL, {
      createObjectURL: (b: Blob) => (created.push(b), 'blob:x'),
      revokeObjectURL: () => undefined,
    });
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });
    const el = mount();
    const root = el.shadowRoot!;
    const button = root.querySelector<HTMLButtonElement>('.export-button')!;
    button.click();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    const panel = root.querySelector<HTMLFormElement>('.export-panel')!;
    panel.querySelector<HTMLSelectElement>('select')!.value = 'dark';
    panel.requestSubmit();
    expect(clicks).toEqual(['tst3-A-2d.svg']);
    expect(created[0].type).toBe('image/svg+xml');
    expect(root.querySelector('.export-panel')).toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');

    // Toggling closes it again.
    button.click();
    button.click();
    expect(root.querySelector('.export-panel')).toBeNull();
  });
});

describe('renderExportPanel', () => {
  it('offers the themes, and cancels on Escape or Cancel', () => {
    const onClose = vi.fn();
    const onExport = vi.fn();
    const panel = renderExportPanel({
      themes: ['light', 'dark'],
      initial: { theme: 'dark', chainIcons: false, background: true },
      onExport,
      onClose,
    });
    const select = panel.querySelector('select')!;
    expect([...select.options].map((o) => o.value)).toEqual(['light', 'dark']);
    expect(select.value).toBe('dark');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    panel.querySelector<HTMLButtonElement>('.export-cancel')!.click();
    expect(onClose).toHaveBeenCalledTimes(2);
    panel.dispatchEvent(new Event('submit'));
    expect(onExport).toHaveBeenCalledWith({ theme: 'dark', chainIcons: false, background: true });
  });
});
