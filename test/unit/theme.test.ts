import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  DARK_THEME,
  LIGHT_THEME,
  getTheme,
  paint,
  registerTheme,
  repaint,
  resolveThemeName,
  themeCss,
  themeNames,
  themeVar,
} from '../../src/theme/index.js';
import { TopologyDisplay } from '../../src/components/topology-display.js';
import { TopologyLoader } from '../../src/components/topology-loader.js';
import type { ChainData } from '../../src/types.js';
import { syntheticBarrel } from './fixtures/barrel.js';

describe('theme registry', () => {
  it('has built-in light and dark themes with the same tokens', () => {
    expect(themeNames()).toEqual(expect.arrayContaining(['light', 'dark']));
    expect(Object.keys(DARK_THEME).sort()).toEqual(Object.keys(LIGHT_THEME).sort());
    // The light theme keeps the diagram's original colours.
    expect(LIGHT_THEME.helix).toBe('#6e8db6');
    expect(LIGHT_THEME.strand).toBe('#6ea76d');
  });

  it('registers a theme on top of a base theme', () => {
    const t = registerTheme('test-extends', { extends: 'dark', helix: '#123456' });
    expect(t.helix).toBe('#123456');
    expect(t.strand).toBe(DARK_THEME.strand);
    expect(getTheme('test-extends')).toBe(t);
    // Light is the default base.
    expect(registerTheme('test-default', { loopWidth: 3 }).helix).toBe(LIGHT_THEME.helix);
  });

  it('rejects an unknown base theme', () => {
    expect(() => registerTheme('x', { extends: 'nope' })).toThrow(/unknown base theme/);
  });

  it('exposes every token as a --mp-* custom property', () => {
    expect(themeVar('helixEdge')).toBe('--mp-helix-edge');
    const css = themeCss(LIGHT_THEME);
    expect(css).toContain('--mp-helix: #6e8db6;');
    expect(css).toContain('--mp-outline-width: 1.5px;');
    expect(css).toContain('--mp-corner-radius: 4px;');
    expect(css).toContain('--mp-data-categories: #4e79a7, #f28e2b');
  });

  it('resolves theme, then theme-light / theme-dark, then the built-ins', () => {
    registerTheme('test-a', {});
    const none = { theme: null, light: null, dark: null };
    expect(resolveThemeName(none, false)).toBe('light');
    expect(resolveThemeName(none, true)).toBe('dark');
    expect(resolveThemeName({ ...none, dark: 'test-a' }, true)).toBe('test-a');
    expect(resolveThemeName({ ...none, dark: 'test-a' }, false)).toBe('light');
    expect(resolveThemeName({ theme: 'dark', light: 'test-a', dark: 'test-a' }, false)).toBe(
      'dark',
    );
    // Unknown names fall through.
    expect(resolveThemeName({ theme: 'missing', light: 'missing', dark: null }, false)).toBe(
      'light',
    );
  });

  it('paints elements from tokens and repaints them in place', () => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    g.appendChild(p);
    paint(p, { stroke: 'loop', 'stroke-width': 'loopWidth' }, LIGHT_THEME);
    expect(p.getAttribute('stroke')).toBe(LIGHT_THEME.loop);
    expect(p.getAttribute('stroke-width')).toBe('1.8');
    repaint(g, DARK_THEME);
    expect(p.getAttribute('stroke')).toBe(DARK_THEME.loop);
  });
});

function twoHelixChain(chainId: string): ChainData {
  const calphas = [];
  for (let i = 0; i < 24; i++) {
    const t = (i * 2 * Math.PI) / 3.6;
    calphas.push({
      resSeq: i + 1,
      iCode: '',
      x: 2.3 * Math.cos(t),
      y: 2.3 * Math.sin(t),
      z: -20 + i * (40 / 23),
    });
  }
  for (let i = 0; i < 4; i++)
    calphas.push({ resSeq: 25 + i, iCode: '', x: 5 + i * 3, y: 0, z: 22 });
  return {
    chainId,
    residueCount: 28,
    segments: [{ start: 1, end: 24, type: 'helix' }],
    calphas,
  };
}

/** Stub the system colour scheme; returns a function that flips it. */
function stubScheme(dark: boolean): (dark: boolean) => void {
  const listeners = new Set<() => void>();
  const state = { dark };
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return q.includes('dark') ? state.dark : false;
    },
    addEventListener: (_: string, f: () => void) => listeners.add(f),
    removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  }));
  return (next) => {
    state.dark = next;
    for (const f of listeners) f();
  };
}

describe('<topology-display> theming', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.unstubAllGlobals();
  });

  function mount(chains: ChainData[], attrs: Record<string, string> = {}): TopologyDisplay {
    const el = new TopologyDisplay();
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'thm1', chains };
    return el;
  }

  const helix = (el: TopologyDisplay): SVGElement =>
    el.shadowRoot!.querySelector<SVGElement>('.svg-scroll svg .ss-element')!;
  const themeCssOf = (el: TopologyDisplay): string =>
    el.shadowRoot!.querySelector('style')!.textContent ?? '';

  it('uses the light theme by default and the dark theme when the system is dark', () => {
    const light = mount([twoHelixChain('A')]);
    expect(light.activeThemeName).toBe('light');
    expect(helix(light).getAttribute('fill')).toBe(LIGHT_THEME.helix);

    stubScheme(true);
    const dark = mount([twoHelixChain('A')]);
    expect(dark.activeThemeName).toBe('dark');
    expect(helix(dark).getAttribute('fill')).toBe(DARK_THEME.helix);
    expect(helix(dark).getAttribute('stroke')).toBe(DARK_THEME.helixEdge);
    expect(themeCssOf(dark)).toContain(`--mp-background: ${DARK_THEME.background};`);
  });

  it('follows a change of system colour scheme in place', () => {
    const flip = stubScheme(false);
    const el = mount([twoHelixChain('A')]);
    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    flip(true);
    expect(el.activeThemeName).toBe('dark');
    // Same drawing, recoloured: nothing was re-rendered.
    expect(el.shadowRoot!.querySelector('.svg-scroll svg')).toBe(svg);
    expect(helix(el).getAttribute('fill')).toBe(DARK_THEME.helix);
  });

  it('uses theme-light and theme-dark for the two schemes, and theme over both', () => {
    registerTheme('test-night', { extends: 'dark', helix: '#010203' });
    const flip = stubScheme(false);
    const el = mount([twoHelixChain('A')], { 'theme-dark': 'test-night' });
    expect(el.activeThemeName).toBe('light');
    flip(true);
    expect(el.activeThemeName).toBe('test-night');
    expect(helix(el).getAttribute('fill')).toBe('#010203');
    el.setAttribute('theme', 'light');
    expect(el.activeThemeName).toBe('light');
    expect(helix(el).getAttribute('fill')).toBe(LIGHT_THEME.helix);
  });

  it('warns about and ignores an unknown theme', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount([twoHelixChain('A')], { theme: 'no-such-theme' });
    expect(el.activeThemeName).toBe('light');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('no-such-theme'));
    warn.mockRestore();
  });

  it('restyles in place: keeps the drawing, scroll position and selection', () => {
    const el = mount([twoHelixChain('A')], { selection: 'A:1-24' });
    const root = el.shadowRoot!;
    const svg = root.querySelector('.svg-scroll svg');
    const scroll = root.querySelector<HTMLElement>('.svg-scroll')!;
    scroll.scrollLeft = 40;
    const events: unknown[] = [];
    el.addEventListener('theme-change', (e) => events.push((e as CustomEvent).detail));
    el.setAttribute('theme', 'dark');
    expect(root.querySelector('.svg-scroll svg')).toBe(svg);
    expect(root.querySelector('.svg-scroll')).toBe(scroll);
    expect(scroll.scrollLeft).toBe(40);
    expect(helix(el).classList.contains('selected')).toBe(true);
    expect(events).toEqual([{ name: 'dark' }]);
    // Every themed attribute follows the theme.
    const slab = root.querySelector('.svg-scroll svg path.membrane')!;
    expect(slab.getAttribute('fill')).toBe(DARK_THEME.membrane);
  });

  it('applies line widths, typeface and rounding tokens', () => {
    registerTheme('test-shape', {
      outlineWidth: 3,
      loopWidth: 4,
      fontFamily: 'Inter, sans-serif',
      lineJoin: 'miter',
      cornerRadius: 0,
    });
    const el = mount([twoHelixChain('A')], { theme: 'test-shape' });
    const root = el.shadowRoot!;
    expect(helix(el).getAttribute('stroke-width')).toBe('3');
    expect(helix(el).getAttribute('stroke-linejoin')).toBe('miter');
    expect(root.querySelector('.svg-scroll svg .loop')!.getAttribute('stroke-width')).toBe('4');
    expect(root.querySelector('.svg-scroll svg g[font-family]')!.getAttribute('font-family')).toBe(
      'Inter, sans-serif',
    );
    expect(themeCssOf(el)).toContain('--mp-corner-radius: 0px;');
  });

  it('redraws the chain-picker icons in the theme, keeping the picked chain', () => {
    // A shorter chain B, so it isn't drawn as a copy of A.
    const b = twoHelixChain('B');
    b.calphas = b.calphas.slice(0, 26);
    b.residueCount = 26;
    const el = mount([twoHelixChain('A'), b]);
    const root = el.shadowRoot!;
    const iconHelix = (): string | null =>
      root.querySelector('.chain-violin.selected .icon-helix')!.getAttribute('fill');
    expect(iconHelix()).toBe(LIGHT_THEME.helix);
    root.querySelectorAll<HTMLButtonElement>('.chain-violin')[1].click();
    const picked = root.querySelector('.chain-violin.selected')!.getAttribute('aria-label');
    el.setAttribute('theme', 'dark');
    expect(iconHelix()).toBe(DARK_THEME.helix);
    expect(root.querySelector('.chain-violin.selected')!.getAttribute('aria-label')).toBe(picked);
  });

  it('restyles a registered theme that is in use', () => {
    registerTheme('test-live', { helix: '#111111' });
    const el = mount([twoHelixChain('A')], { theme: 'test-live' });
    registerTheme('test-live', { helix: '#222222' });
    expect(helix(el).getAttribute('fill')).toBe('#222222');
  });

  it('builds the 3-D shading from the same tokens and keeps the 3-D view', async () => {
    registerTheme('test-3d', { extends: 'dark', strand: '#ff0000', strandEdge: '#00ff00' });
    const el = mount([syntheticBarrel({ n: 8 })]);
    await el.setTransitionProgress(1);
    const root = el.shadowRoot!;
    const before = root.querySelector('.svg-scroll svg')!;
    expect(before.classList.contains('morph-svg')).toBe(true);
    el.setAttribute('theme', 'test-3d');
    expect(el.transitionProgress).toBe(1);
    const after = root.querySelector('.svg-scroll svg')!;
    expect(after.classList.contains('morph-svg')).toBe(true);
    const scene = (el as unknown as { _morphSource: { scene: { style: Record<string, string> } } })
      ._morphSource.scene;
    expect(scene.style.strandFill).toBe('#ff0000');
    expect(scene.style.background).toBe(DARK_THEME.background);
    // Shaded strand faces are reds now (lit and fogged towards the dark ground).
    const fills = [...after.querySelectorAll('path')]
      .map((p) => p.getAttribute('fill') ?? '')
      .filter((f) => f.startsWith('rgb('));
    const reddish = fills.filter((f) => {
      const [r, g, b] = f.slice(4, -1).split(',').map(Number);
      return r > g + 40 && r > b + 40;
    });
    expect(reddish.length).toBeGreaterThan(0);
  });

  it('passes theme attributes through <topology-loader>', () => {
    const loader = new TopologyLoader();
    loader.setAttribute('theme', 'dark');
    document.body.appendChild(loader);
    // No pdb-id: nothing loads; render the inner display directly.
    (loader as unknown as { renderData: (d: unknown) => void }).renderData({
      pdbId: 'thm1',
      chains: [twoHelixChain('A')],
    });
    const inner = loader.shadowRoot!.querySelector('topology-display') as TopologyDisplay;
    expect(inner.activeThemeName).toBe('dark');
    loader.setAttribute('theme', 'light');
    expect(inner.activeThemeName).toBe('light');
  });
});
