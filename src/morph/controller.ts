import { buildMorphModel } from './model.js';
import { DEFAULT_MORPH_OPTIONS, MorphRenderer, type MorphOptions, type Orbit } from './renderer.js';
import type { MorphScene, ResidueSpan } from './types.js';

/** Duration (ms) of a full 2-D → 3-D transition. */
const DURATION_MS = 2800;

/** Orbit step (radians) per arrow-key press. */
const KEY_AZ = 0.1;
const KEY_EL = 0.08;

/** What a re-rendered component restores: progress, heading, orbit and 2-D scroll. */
export interface MorphView {
  tau: number;
  goal: number;
  animating: boolean;
  orbit: Orbit;
  scroll0: number;
}

function easeInOut(x: number): number {
  return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, x)));
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Drives the 2-D ↔ 3-D morph inside a scroll container: swaps the static 2-D
 * SVG for the morph SVG while away from τ = 0 (the morph's first frame is the
 * 2-D picture, so the swap is invisible), animates or scrubs τ, and lets the
 * user orbit the 3-D view by dragging or with the arrow keys.
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
  /** Container width the current framing was fitted to. */
  private framedWidth = 0;
  /** Last scrollLeft we applied (writing it forces a layout, so skip no-ops). */
  private appliedScroll = NaN;
  private readonly orbit: Orbit = { az: 0, el: 0 };
  private drag: { x: number; y: number; id: number; touch: boolean } | null = null;
  private options: MorphOptions;
  /** Model ids of the selected elements and loops. */
  private selectedIds: number[] = [];
  private readonly resize: ResizeObserver | null = null;
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
    // Re-fit the 3-D framing when the container changes width (window
    // resize, phone rotation, or a container that was hidden when shown).
    if (typeof ResizeObserver !== 'undefined') {
      this.resize = new ResizeObserver(() => this.refit());
      this.resize.observe(scroll);
    }
  }

  /** Current morph progress: 0 = 2-D, 1 = 3-D. */
  get progress(): number {
    return this.tau;
  }

  /** Where the morph is heading (0 or 1). */
  get target(): number {
    return this.goal;
  }

  /**
   * Do the set-up that doesn't depend on the view — the model, the
   * steadying track — ahead of time, so the first frame doesn't stall.
   */
  precompute(): void {
    this.ensureRenderer().precompute();
  }

  /** Jump to progress `tau` (cancels any running animation). */
  setProgress(tau: number): void {
    this.cancel();
    this.goal = tau >= 0.5 ? 1 : 0;
    this.show(tau);
  }

  /**
   * Animate to 3-D (1) or back to 2-D (0), then call `done`; jumps there if
   * reduced motion is preferred.
   */
  animateTo(goal: 0 | 1, done?: () => void): void {
    this.cancel();
    this.goal = goal;
    const from = this.tau;
    if (from === goal || prefersReducedMotion()) {
      this.show(goal);
      done?.();
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
      if (f < 1) {
        this.raf = requestAnimationFrame(step);
      } else {
        this.raf = 0;
        done?.();
      }
    };
    this.raf = requestAnimationFrame(step);
  }

  toggle(): void {
    this.animateTo(this.goal >= 0.5 ? 0 : 1);
  }

  /** The current view, to carry over to a controller for a re-rendered chain. */
  get view(): MorphView {
    return {
      tau: this.tau,
      goal: this.goal,
      animating: this.raf !== 0,
      orbit: { ...this.orbit },
      scroll0: this.mounted ? this.scroll0 : this.scroll.scrollLeft,
    };
  }

  /** Show `view` (from another controller of the same chain), resuming any animation. */
  restore(view: MorphView): void {
    this.cancel();
    this.scroll.scrollLeft = view.scroll0;
    if (view.tau <= 0 && !view.animating) return;
    this.orbit.az = view.orbit.az;
    this.orbit.el = view.orbit.el;
    this.setProgress(view.tau);
    if (view.animating) this.animateTo(view.goal >= 0.5 ? 1 : 0);
  }

  /**
   * Change the options (projection, sweep, strand size) in place: the view
   * keeps its progress, orbit and any running animation.
   */
  setOptions(options: Partial<MorphOptions>): void {
    this.options = { ...DEFAULT_MORPH_OPTIONS, ...options };
    const old = this.renderer;
    if (!old) return;
    this.renderer = null;
    this.prepared = false;
    if (!this.mounted) return;
    const focused = old.svg.matches(':focus');
    const renderer = this.ensureRenderer();
    renderer.configure(this.framedWidth, this.scroll0);
    this.prepared = true;
    this.label(renderer.svg);
    old.svg.replaceWith(renderer.svg);
    this.appliedScroll = NaN;
    // A new projection has a new base elevation: keep the orbit in range.
    this.orbit.el = this.clampElevation(this.orbit.el);
    if (!this.raf) this.show(this.tau);
    if (focused) renderer.svg.focus();
  }

  /**
   * Redraw with the scene's current style (a new theme), keeping progress,
   * orbit, focus and any running animation.
   */
  restyle(): void {
    this.setOptions(this.options);
  }

  /**
   * Show the elements and loops with a residue in `range` as selected (null:
   * none), redrawing the current frame.
   */
  setSelection(range: ResidueSpan | null): void {
    const { elements, loops } = this.scene;
    const hit = (r: ResidueSpan | undefined): boolean =>
      !!range && !!r && r.start <= range.end && r.end >= range.start;
    const ids: number[] = [];
    elements.forEach((e, i) => hit(e.selectable) && ids.push(i));
    // Model ids number loops after the elements (see buildMorphModel).
    loops.forEach((l, i) => hit(l.selectable) && ids.push(elements.length + i));
    this.selectedIds = ids;
    this.renderer?.setSelected(ids);
    if (this.mounted && !this.raf) this.show(this.tau);
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

  private ensureRenderer(): MorphRenderer {
    if (!this.renderer) {
      // A sweeping roll is anchored at the end it reaches last (the renderer
      // then steadies the whole morph on screen).
      const anchor = this.options.sweep > 0 ? 'end' : 'centre';
      this.renderer = new MorphRenderer(
        buildMorphModel(this.scene, { anchor }),
        this.options,
        this.idPrefix,
      );
      this.renderer.setSelected(this.selectedIds);
      this.bindOrbit(this.renderer.svg);
    }
    return this.renderer;
  }

  /** Build and frame the renderer for the current scroll state (once per mount). */
  private prepare(): MorphRenderer {
    const renderer = this.ensureRenderer();
    if (!this.mounted && !this.prepared) {
      this.scroll0 = this.scroll.scrollLeft;
      this.framedWidth = this.scroll.clientWidth;
      renderer.configure(this.framedWidth, this.scroll0);
      this.prepared = true;
    }
    return renderer;
  }

  /** Re-fit the framing to a new container width while the 3-D view is shown. */
  private refit(): void {
    const width = this.scroll.clientWidth;
    if (!this.mounted || !this.renderer || width === this.framedWidth || width <= 0) return;
    this.framedWidth = width;
    this.renderer.configure(width, this.scroll0);
    this.appliedScroll = NaN;
    if (!this.raf) this.show(this.tau);
  }

  private mount(): MorphRenderer {
    const renderer = this.prepare();
    if (!this.mounted) {
      this.label(renderer.svg);
      this.svg2d.replaceWith(renderer.svg);
      this.mounted = true;
      this.appliedScroll = NaN;
    }
    return renderer;
  }

  /** The 2-D figure's label, so assistive technology still knows what is shown. */
  private label(svg: SVGSVGElement): void {
    const label = this.svg2d.getAttribute('aria-label');
    svg.setAttribute('aria-label', `${label ? `${label}, ` : ''}3-D view (arrow keys rotate)`);
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

  /** Turn the view by (daz, del), keeping the elevation short of straight up or down. */
  private turn(daz: number, del: number): void {
    this.orbit.az += daz;
    this.orbit.el = this.clampElevation(this.orbit.el + del);
    if (!this.raf && this.renderer) this.renderer.render(this.tau, this.orbit);
  }

  /** Orbit elevation offset kept short of looking straight up or down. */
  private clampElevation(el: number): number {
    const base = this.options.elevation;
    return Math.max(-1.45 - base, Math.min(1.45 - base, el));
  }

  private bindOrbit(svg: SVGSVGElement): void {
    svg.style.cursor = 'grab';
    // Touch: a horizontal drag turns the view, a vertical swipe still scrolls
    // the page (the diagram can fill most of a phone's screen).
    svg.style.touchAction = 'pan-y';
    svg.setAttribute('tabindex', '0');
    svg.addEventListener('pointerdown', (e) => {
      if (this.tau <= 0) return;
      this.drag = { x: e.clientX, y: e.clientY, id: e.pointerId, touch: e.pointerType === 'touch' };
      svg.setPointerCapture(e.pointerId);
      svg.style.cursor = 'grabbing';
    });
    svg.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const dx = e.clientX - this.drag.x;
      const dy = e.clientY - this.drag.y;
      this.drag.x = e.clientX;
      this.drag.y = e.clientY;
      this.turn(-dx * 0.01, this.drag.touch ? 0 : dy * 0.008);
    });
    const end = (e: PointerEvent): void => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      svg.style.cursor = 'grab';
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('keydown', (e) => {
      if (this.tau <= 0) return;
      const step: Record<string, [number, number]> = {
        ArrowLeft: [KEY_AZ, 0],
        ArrowRight: [-KEY_AZ, 0],
        ArrowUp: [0, -KEY_EL],
        ArrowDown: [0, KEY_EL],
      };
      const d = step[e.key];
      if (!d) return;
      e.preventDefault();
      this.turn(d[0], d[1]);
    });
  }
}
