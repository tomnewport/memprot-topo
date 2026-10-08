import type { Theme } from '../theme/index.js';
import { SequenceRenderer, type SequenceOptions } from './renderer.js';
import type { SequenceSource } from './types.js';

/** Duration (ms) of a full sequence ↔ topology transition. */
const DURATION_MS = 2200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Drives the sequence ↔ topology transition inside the scroll container.
 * Progress `u` runs from 0 (sequence) to 1 (topology); away from 1 the static
 * 2-D SVG is swapped for the sequence SVG, whose frame 1 is the 2-D picture.
 */
export class SequenceController {
  private u = 1;
  private goal = 1;
  private raf = 0;
  private mounted = false;
  private scroll0 = 0;
  private framedWidth = 0;
  private readonly renderer: SequenceRenderer;
  private readonly resize: ResizeObserver | null = null;
  /** Called after every frame with the current progress. */
  onChange: ((u: number, goal: number) => void) | null = null;

  constructor(
    private readonly scroll: HTMLElement,
    private readonly svg2d: SVGSVGElement,
    src: SequenceSource,
    options: SequenceOptions,
    theme: Theme,
    decor2d: Element[],
  ) {
    this.renderer = new SequenceRenderer(src, options, theme, decor2d);
    const label = svg2d.getAttribute('aria-label');
    this.renderer.svg.setAttribute('role', 'img');
    this.renderer.svg.setAttribute('aria-label', `${label ? `${label}, ` : ''}sequence view`);
    // Re-wrap the rows when the container changes width.
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(() => this.refit());
      this.resize.observe(scroll);
    }
  }

  /** 0 = sequence, 1 = topology. */
  get progress(): number {
    return this.u;
  }

  get target(): number {
    return this.goal;
  }

  get animating(): boolean {
    return this.raf !== 0;
  }

  get svg(): SVGSVGElement {
    return this.renderer.svg;
  }

  setProgress(u: number): void {
    this.cancel();
    this.goal = u >= 0.5 ? 1 : 0;
    this.show(u);
  }

  /** Animate to the sequence (0) or the topology (1), then call `done`. */
  animateTo(goal: 0 | 1, done?: () => void): void {
    this.cancel();
    this.goal = goal;
    const from = this.u;
    if (from === goal || prefersReducedMotion()) {
      this.show(goal);
      done?.();
      return;
    }
    // The renderer eases each row itself, so time runs linearly here.
    const duration = DURATION_MS * Math.abs(goal - from);
    const start = performance.now();
    const step = (now: number): void => {
      const f = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      this.show(f >= 1 ? goal : from + (goal - from) * f);
      if (f < 1) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.raf = 0;
        done?.();
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  setOptions(options: SequenceOptions): void {
    this.renderer.setOptions(options);
    if (this.mounted) {
      this.renderer.configure(this.framedWidth, this.scroll0);
      if (!this.raf) this.show(this.u);
    }
  }

  restyle(theme: Theme): void {
    this.renderer.setTheme(theme);
    if (this.mounted && !this.raf) this.show(this.u);
  }

  dispose(): void {
    this.cancel();
    this.resize?.disconnect();
    this.unmount();
  }

  private cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private show(u: number): void {
    this.u = Math.max(0, Math.min(1, u));
    if (this.u >= 1) {
      this.unmount();
    } else {
      this.mount();
      this.renderer.render(this.u);
    }
    this.onChange?.(this.u, this.goal);
  }

  private mount(): void {
    if (this.mounted) return;
    this.scroll0 = this.scroll.scrollLeft;
    this.framedWidth = this.scroll.clientWidth || Number(this.svg2d.getAttribute('width')) || 0;
    this.renderer.configure(this.framedWidth, this.scroll0);
    this.svg2d.replaceWith(this.renderer.svg);
    this.scroll.scrollLeft = 0;
    this.mounted = true;
  }

  private unmount(): void {
    if (!this.mounted) return;
    this.renderer.svg.replaceWith(this.svg2d);
    this.scroll.scrollLeft = this.scroll0;
    this.mounted = false;
  }

  private refit(): void {
    const width = this.scroll.clientWidth;
    if (!this.mounted || width === this.framedWidth || width <= 0) return;
    this.framedWidth = width;
    this.renderer.configure(width, this.scroll0);
    if (!this.raf) this.show(this.u);
  }
}
