import { describe, it, expect, afterEach, vi } from 'vitest';
import { ScrollBox, halfPageTarget, hiddenEdges } from '../../../src/components/scroll-box.js';

/** jsdom has no layout, so fake the scroller's geometry. */
function setMetrics(el: HTMLElement, clientWidth: number, scrollWidth: number, scrollLeft = 0) {
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(el, 'scrollWidth', { configurable: true, value: scrollWidth });
  el.scrollLeft = scrollLeft;
}

describe('hiddenEdges', () => {
  it('reports nothing hidden when the content fits', () => {
    expect(hiddenEdges({ scrollLeft: 0, clientWidth: 500, scrollWidth: 500 })).toEqual({
      left: false,
      right: false,
    });
  });

  it('reports the right edge at the start and the left edge at the end', () => {
    expect(hiddenEdges({ scrollLeft: 0, clientWidth: 500, scrollWidth: 1200 })).toEqual({
      left: false,
      right: true,
    });
    expect(hiddenEdges({ scrollLeft: 700, clientWidth: 500, scrollWidth: 1200 })).toEqual({
      left: true,
      right: false,
    });
    expect(hiddenEdges({ scrollLeft: 300, clientWidth: 500, scrollWidth: 1200 })).toEqual({
      left: true,
      right: true,
    });
  });

  it('ignores sub-pixel remainders from fractional scroll positions', () => {
    expect(hiddenEdges({ scrollLeft: 699.5, clientWidth: 500, scrollWidth: 1200 }).right).toBe(
      false,
    );
  });
});

describe('halfPageTarget', () => {
  const m = { scrollLeft: 100, clientWidth: 400, scrollWidth: 1000 };
  it('moves half a viewport', () => {
    expect(halfPageTarget(m, 1)).toBe(300);
    expect(halfPageTarget({ ...m, scrollLeft: 500 }, -1)).toBe(300);
  });
  it('clamps at both ends', () => {
    expect(halfPageTarget(m, -1)).toBe(0);
    expect(halfPageTarget({ ...m, scrollLeft: 550 }, 1)).toBe(600);
  });
});

describe('ScrollBox', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the fade and arrow only at edges with hidden content', () => {
    const box = new ScrollBox('svg-scroll');
    const arrowL = box.frame.querySelector<HTMLButtonElement>('.scroll-arrow-left')!;
    const arrowR = box.frame.querySelector<HTMLButtonElement>('.scroll-arrow-right')!;

    setMetrics(box.scroll, 400, 400);
    box.update();
    expect(arrowL.hidden).toBe(true);
    expect(arrowR.hidden).toBe(true);
    expect(box.frame.classList.contains('hidden-right')).toBe(false);

    setMetrics(box.scroll, 400, 1000);
    box.update();
    expect(arrowL.hidden).toBe(true);
    expect(arrowR.hidden).toBe(false);
    expect(box.frame.classList.contains('hidden-right')).toBe(true);

    box.scroll.scrollLeft = 600;
    box.scroll.dispatchEvent(new Event('scroll'));
    expect(arrowL.hidden).toBe(false);
    expect(arrowR.hidden).toBe(true);
    expect(box.frame.classList.contains('hidden-left')).toBe(true);
  });

  it('scrolls half a viewport smoothly when an arrow is clicked', () => {
    const box = new ScrollBox('svg-scroll');
    setMetrics(box.scroll, 400, 1000);
    const scrollTo = vi.fn();
    box.scroll.scrollTo = scrollTo as unknown as typeof box.scroll.scrollTo;
    box.update();
    box.frame.querySelector<HTMLButtonElement>('.scroll-arrow-right')!.click();
    expect(scrollTo).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });
  });

  it('jumps instead of animating when reduced motion is preferred', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }));
    const box = new ScrollBox('svg-scroll');
    setMetrics(box.scroll, 400, 1000, 400);
    const scrollTo = vi.fn();
    box.scroll.scrollTo = scrollTo as unknown as typeof box.scroll.scrollTo;
    box.page(-1);
    expect(scrollTo).toHaveBeenCalledWith({ left: 200, behavior: 'auto' });
  });
});
