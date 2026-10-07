/**
 * Horizontal scroll box for the diagram (issue #21).
 *
 * Wraps the scrolling element in a frame that adds, at each edge with hidden
 * content, a shaded gradient and an arrow button that scrolls half a viewport.
 * The gradients and arrows sit on the frame, not in the scrolled content, so
 * they stay put while the diagram moves under them.
 */

/** Below this many px of hidden content an edge counts as fully shown. */
const EDGE_EPSILON = 1;

export interface ScrollMetrics {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}

/** Which edges have content scrolled out of view. */
export function hiddenEdges(m: ScrollMetrics): { left: boolean; right: boolean } {
  const max = m.scrollWidth - m.clientWidth;
  return {
    left: m.scrollLeft > EDGE_EPSILON,
    right: max - m.scrollLeft > EDGE_EPSILON,
  };
}

/** scrollLeft after paging half a viewport left (-1) or right (+1), clamped. */
export function halfPageTarget(m: ScrollMetrics, dir: -1 | 1): number {
  const max = Math.max(0, m.scrollWidth - m.clientWidth);
  return Math.max(0, Math.min(max, m.scrollLeft + (dir * m.clientWidth) / 2));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const SCROLL_BOX_STYLES = `
  .scroll-frame {
    position: relative;
    /* Edge shading: the text colour, so it shows on light and dark grounds. */
    --scroll-shade: color-mix(in srgb, var(--mp-text, #000) 16%, transparent);
  }
  .scroll-fade {
    position: absolute;
    top: 1px;
    bottom: 1px;
    width: 1.75rem;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .scroll-fade-left {
    left: 1px;
    border-radius: 3px 0 0 3px;
    background: linear-gradient(to right, var(--scroll-shade), transparent);
  }
  .scroll-fade-right {
    right: 1px;
    border-radius: 0 3px 3px 0;
    background: linear-gradient(to left, var(--scroll-shade), transparent);
  }
  .scroll-frame.hidden-left .scroll-fade-left,
  .scroll-frame.hidden-right .scroll-fade-right { opacity: 1; }
  .scroll-arrow {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid var(--mp-border, #c8c8c8);
    border-radius: 50%;
    background: color-mix(in srgb, var(--mp-background, #fff) 92%, transparent);
    color: var(--mp-text, #333);
    font: inherit;
    font-size: 1.1rem;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .scroll-arrow:hover {
    background: var(--mp-background, #fff);
    color: var(--mp-accent, #1f77b4);
  }
  .scroll-arrow:focus-visible {
    outline: 2px solid var(--mp-accent, #1f77b4);
    outline-offset: 1px;
  }
  .scroll-arrow-left { left: 0.35rem; }
  .scroll-arrow-right { right: 0.35rem; }
  .scroll-arrow[hidden] { display: none; }
  @media (prefers-reduced-motion: reduce) {
    .scroll-fade { transition: none; }
  }
`;

export class ScrollBox {
  /** Positioned frame holding the scroller and its edge overlays. */
  readonly frame: HTMLDivElement;
  /** The element that scrolls; put the diagram in here. */
  readonly scroll: HTMLDivElement;
  private readonly arrows: { left: HTMLButtonElement; right: HTMLButtonElement };
  private readonly resize: ResizeObserver | null = null;
  private readonly onScroll = (): void => this.update();

  constructor(scrollClass: string) {
    this.frame = document.createElement('div');
    this.frame.className = 'scroll-frame';
    this.scroll = document.createElement('div');
    this.scroll.className = scrollClass;
    this.scroll.addEventListener('scroll', this.onScroll, { passive: true });

    const fade = (side: 'left' | 'right'): HTMLDivElement => {
      const el = document.createElement('div');
      el.className = `scroll-fade scroll-fade-${side}`;
      el.setAttribute('aria-hidden', 'true');
      return el;
    };
    const arrow = (side: 'left' | 'right'): HTMLButtonElement => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `scroll-arrow scroll-arrow-${side}`;
      el.textContent = side === 'left' ? '‹' : '›';
      el.setAttribute('aria-label', `Scroll diagram ${side}`);
      el.hidden = true;
      el.addEventListener('click', () => this.page(side === 'left' ? -1 : 1));
      return el;
    };
    this.arrows = { left: arrow('left'), right: arrow('right') };
    this.frame.append(
      this.scroll,
      fade('left'),
      fade('right'),
      this.arrows.left,
      this.arrows.right,
    );

    // Content or container width changes (window resize, the diagram being
    // swapped, a hidden container shown) change what is hidden. The observer
    // also fires once on first layout.
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(() => this.update());
      this.resize.observe(this.scroll);
    }
  }

  /** Also re-check the edges when `el` (the scrolled content) changes size. */
  observe(el: Element): void {
    this.resize?.observe(el);
  }

  /** Re-check which edges have hidden content. */
  update(): void {
    const { left, right } = hiddenEdges(this.scroll);
    this.frame.classList.toggle('hidden-left', left);
    this.frame.classList.toggle('hidden-right', right);
    this.arrows.left.hidden = !left;
    this.arrows.right.hidden = !right;
  }

  /** Scroll half a viewport left (-1) or right (+1). */
  page(dir: -1 | 1): void {
    const left = halfPageTarget(this.scroll, dir);
    if (typeof this.scroll.scrollTo === 'function') {
      this.scroll.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    } else {
      this.scroll.scrollLeft = left;
    }
    // Smooth scrolling reports through scroll events; a jump may not.
    this.update();
  }

  dispose(): void {
    this.resize?.disconnect();
    this.scroll.removeEventListener('scroll', this.onScroll);
  }
}
