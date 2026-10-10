import { describe, it, expect, afterEach, vi } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

describe('TopologyDisplay full screen (issue #73)', () => {
  const mounted: TopologyDisplay[] = [];
  function mount(): TopologyDisplay {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    mounted.push(el);
    el.proteinData = { pdbId: 'barl', chains: [syntheticBarrel({ n: 8 })] };
    return el;
  }
  const button = (el: TopologyDisplay): HTMLButtonElement =>
    el.shadowRoot!.querySelector<HTMLButtonElement>('.fullscreen-button')!;
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    for (const el of mounted) el.remove();
    mounted.length = 0;
    cleanups.splice(0).forEach((f) => f());
  });

  it('has a full-screen button beside the view switch', () => {
    const el = mount();
    const b = button(el);
    expect(b).not.toBeNull();
    expect(b.closest('.dimension-bar')).not.toBeNull();
    expect(b.textContent).toBe('Full screen');
    expect(el.fullscreen).toBe(false);
  });

  it('covers the window when the Fullscreen API is unavailable, and Escape leaves', async () => {
    const el = mount();
    const events: boolean[] = [];
    el.addEventListener('fullscreen-change', (e) =>
      events.push((e as CustomEvent<{ fullscreen: boolean }>).detail.fullscreen),
    );
    // jsdom has no element full screen, so this takes the overlay fallback.
    await el.requestFullscreenView();
    expect(el.fullscreen).toBe(true);
    expect(el.hasAttribute('fullscreen')).toBe(true);
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(button(el).textContent).toBe('Exit full screen');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(el.fullscreen).toBe(false);
    expect(el.hasAttribute('fullscreen')).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect(button(el).textContent).toBe('Full screen');
    expect(events).toEqual([true, false]);
  });

  it('uses the Fullscreen API when the browser offers it', async () => {
    const el = mount();
    // jsdom has no Fullscreen API: stand one in for this test.
    let fsElement: Element | null = null;
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fsElement,
    });
    cleanups.push(() => {
      delete (document as { fullscreenEnabled?: boolean }).fullscreenEnabled;
      delete (document as { fullscreenElement?: Element | null }).fullscreenElement;
      delete (document as { exitFullscreen?: unknown }).exitFullscreen;
    });
    el.requestFullscreen = vi.fn(async () => {
      fsElement = el;
    });
    document.exitFullscreen = vi.fn(async () => {
      fsElement = null;
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    button(el).click();
    await vi.waitFor(() => expect(el.fullscreen).toBe(true));
    expect(el.requestFullscreen).toHaveBeenCalled();
    // The overlay's page lock is not needed in real full screen.
    expect(document.documentElement.style.overflow).toBe('');

    // Leaving through the browser (its own Escape) is followed.
    fsElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    expect(el.fullscreen).toBe(false);
  });

  it('keeps full screen across a redraw, and leaves it when removed', async () => {
    const el = mount();
    await el.toggleFullscreen();
    el.setAttribute('show-contacts', '');
    expect(el.fullscreen).toBe(true);
    expect(button(el).textContent).toBe('Exit full screen');
    el.remove();
    expect(el.fullscreen).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
  });
});
