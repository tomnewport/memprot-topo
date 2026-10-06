import { buildMorphModel } from './model.js';
import { DEFAULT_MORPH_OPTIONS, MorphRenderer, type MorphOptions, type Orbit } from './renderer.js';
import type { MorphScene } from './types.js';

/** Duration (ms) of a full 2-D → 3-D transition. */
const DURATION_MS = 2800;

function easeInOut(x: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
}

/**
 * Drives the 2-D ↔ 3-D morph inside a scroll container: swaps the static 2-D
 * SVG for the morph SVG while away from τ = 0 (the morph's first frame is the
 * 2-D picture, so the swap is invisible), animates or scrubs τ, and lets the
 * user orbit the 3-D view by dragging.
 */
export class MorphController {
  private tau = 0;
  private goal = 0;
  private renderer: MorphRenderer | null = null;
  private mounted = false;
  /** Renderer framed for the current scroll state but not yet swapped in. */
  private prepared = false;
  private raf = 0;
  private scroll0 = 0;
  /** Last scrollLeft we applied (writing it forces a layout, so skip no-ops). */
  private appliedScroll = NaN;
  private readonly orbit: Orbit = { az: 0, el: 0 };
  private drag: { x: number; y: number; id: number } | null = null;
  private readonly options: MorphOptions;
  /** Called after every rendered frame with the current progress. */
  onChange: ((tau: number, goal: number) => void) | null = null;

  constructor(
    private readonly scroll: HTMLElement,
    private readonly svg2d: SVGSVGElement,
    private readonly scene: MorphScene,
    private readonly idPrefix: string,
    options: Partial<MorphOptions> = {},
  ) {
    this.options = { ...DEFAULT_MORPH_OPTIONS, ...options };
  }

  /** Current morph progress: 0 = 2-D, 1 = 3-D. */
  get progress(): number {
    return this.tau;
  }

  /** Where the morph is heading (0 or 1). */
  get target(): number {
    return this.goal;
  }

  /** Jump to progress `tau` (cancels any running animation). */
  setProgress(tau: number): void {
    this.cancel();
    this.goal = tau >= 0.5 ? 1 : 0;
    this.show(tau);
  }

  /** Animate to 3-D (1) or back to 2-D (0). */
  animateTo(goal: 0 | 1): void {
    this.cancel();
    this.goal = goal;
    const from = this.tau;
    if (from === goal) {
      this.show(goal);
      return;
    }
    // Run the eased curve from wherever we are, at a speed proportional to
    // the remaining distance.
    const x0 = Math.acos(1 - 2 * from) / Math.PI;
    const x1 = goal;
    const duration = DURATION_MS * Math.abs(x1 - x0);
    // Do the one-off set-up (model, framing, steadying track) before the
    // clock starts, so the first frames don't stall.
    this.prepare();
    const start = performance.now();
    const step = (now: number): void => {
      const f = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      const x = x0 + (x1 - x0) * f;
      this.show(f >= 1 ? goal : easeInOut(x));
      if (f < 1) this.raf = requestAnimationFrame(step);
      else this.raf = 0;
    };
    this.raf = requestAnimationFrame(step);
  }

  toggle(): void {
    this.animateTo(this.goal >= 0.5 ? 0 : 1);
  }

  dispose(): void {
    this.cancel();
    this.unmount();
  }

  private cancel(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private show(tau: number): void {
    const t = Math.max(0, Math.min(1, tau));
    this.tau = t;
    if (t <= 0) {
      this.unmount();
    } else {
      const r = this.mount();
      const layout = r.render(t, this.orbit);
      const sl = Math.round(layout.scrollLeft);
      if (sl !== this.appliedScroll) {
        this.scroll.scrollLeft = sl;
        this.appliedScroll = sl;
      }
    }
    this.onChange?.(this.tau, this.goal);
  }

  /** Build and frame the renderer for the current scroll state (once per mount). */
  private prepare(): MorphRenderer {
    if (!this.renderer) {
      // A sweeping roll is anchored at the end it reaches last (the renderer
      // then steadies the whole morph on screen).
      const anchor = this.options.sweep > 0 ? 'end' : 'centre';
      this.renderer = new MorphRenderer(
        buildMorphModel(this.scene, { anchor }),
        this.options,
        this.idPrefix,
      );
      this.bindOrbit(this.renderer.svg);
    }
    if (!this.mounted && !this.prepared) {
      this.scroll0 = this.scroll.scrollLeft;
      this.renderer.configure(this.scroll.clientWidth, this.scroll0);
      this.prepared = true;
    }
    return this.renderer;
  }

  private mount(): MorphRenderer {
    const renderer = this.prepare();
    if (!this.mounted) {
      this.svg2d.replaceWith(renderer.svg);
      this.mounted = true;
      this.appliedScroll = NaN;
    }
    return renderer;
  }

  private unmount(): void {
    if (!this.mounted || !this.renderer) return;
    this.renderer.svg.replaceWith(this.svg2d);
    this.scroll.scrollLeft = this.scroll0;
    this.mounted = false;
    this.prepared = false;
    this.orbit.az = 0;
    this.orbit.el = 0;
  }

  private bindOrbit(svg: SVGSVGElement): void {
    svg.style.cursor = 'grab';
    svg.style.touchAction = 'none';
    svg.addEventListener('pointerdown', (e) => {
      if (this.tau <= 0) return;
      this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      svg.setPointerCapture(e.pointerId);
      svg.style.cursor = 'grabbing';
    });
    svg.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.orbit.az -= dx * 0.01;
      const base = this.options.elevation;
      this.orbit.el = Math.max(-1.45 - base, Math.min(1.45 - base, this.orbit.el + dy * 0.008));
      if (!this.raf && this.renderer) this.renderer.render(this.tau, this.orbit);
    });
    const end = (e: PointerEvent): void => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      svg.style.cursor = 'grab';
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }
}
