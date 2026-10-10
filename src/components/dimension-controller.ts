import type { MorphController } from '../morph/controller.js';
import type { SequenceController } from '../sequence/controller.js';

/** Default time (ms) to move one whole dimension (see `transition-time`). */
export const DEFAULT_TRANSITION_MS = 2500;

/** Whether the user asks for reduced motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** `detail` of `dimension-change` events: the dimension now shown, 1 to 3. */
export interface DimensionChangeDetail {
  dimension: number;
}

/** What the dimension controller needs from the element it serves. */
export interface DimensionHost {
  /** The element: its `dimension` and `transition-time` attributes, and events. */
  element: HTMLElement;
  /** The displayed chain's sequence ↔ topology transition. */
  seq(): SequenceController | null;
  /** The displayed chain's morph, once loaded. */
  morph(): MorphController | null;
  /** Whether the displayed chain has a 3-D view. */
  has3d(): boolean;
  /** Load the morph code and build the displayed chain's morph. */
  loadMorph(): Promise<MorphController | null>;
  /** Jump the morph to `tau`, loading it first if needed. */
  setTransitionProgress(tau: number): Promise<void>;
  /** The 2-D topology is being left: end any blend on it. */
  leave2d(): void;
  /** The view moved: the picture's size and scroll may have changed. */
  onMove(): void;
}

/**
 * Moves the view between its dimensions: 1 (sequence), 2 (topology) and
 * 3 (structure), animating at `transition-time` per dimension, and keeps the
 * view switch and `dimension-change` events in step.
 *
 * Positions are the dimension minus one: 0 (sequence) → 1 (topology) → 2
 * (structure).
 */
export class DimensionController {
  /** The running animation's frame, and a counter that cancels a pending start. */
  private _raf = 0;
  private _run = 0;
  /** Last position announced in a `dimension-change` event. */
  private _lastPosition = NaN;

  constructor(private readonly host: DimensionHost) {}

  /** Whether an animation between dimensions is running. */
  get animating(): boolean {
    return this._raf !== 0;
  }

  /** Where the view stands now (0–2). */
  get position(): number {
    const u = this.host.seq()?.progress ?? 1;
    return u < 1 ? u : 1 + (this.host.morph()?.progress ?? 0);
  }

  /** Time (ms) to move one whole dimension (`transition-time`; 0 = instant). */
  get transitionTime(): number {
    const v = Number.parseFloat(this.host.element.getAttribute('transition-time') ?? '');
    return Number.isFinite(v) && v >= 0 ? v : DEFAULT_TRANSITION_MS;
  }

  /** Where `dimension` asks to be, as a position (0–2), within what the chain can show. */
  get target(): number {
    const raw = this.host.element.getAttribute('dimension');
    const v = raw === null ? NaN : Number.parseFloat(raw);
    const max = this.host.has3d() ? 2 : 1;
    return Number.isFinite(v) ? Math.max(0, Math.min(max, v - 1)) : 1;
  }

  /** Show position `p` (0–2) at once. */
  apply(p: number): void {
    const seq = this.host.seq();
    if (!seq) return;
    const morph = this.host.morph();
    // Leaving the 2-D topology: its picture is the first frame either way.
    if (p !== 1) this.host.leave2d();
    if (p < 1) {
      if ((morph?.progress ?? 0) > 0) morph?.setProgress(0);
      seq.setProgress(p);
    } else {
      seq.setProgress(1);
      if (morph) morph.setProgress(p - 1);
      else if (p > 1) void this.host.setTransitionProgress(p - 1);
    }
  }

  /** Stop any running or pending animation where it is. */
  cancel(): void {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._run++;
  }

  /**
   * Animate from where the view is to `target` (0–2) at `transition-time` per
   * dimension, passing through the topology between the other two.
   */
  animateTo(target: number): void {
    this.cancel();
    const run = this._run;
    const from = this.position;
    const ms = this.transitionTime * Math.abs(target - from);
    if (ms <= 0 || from === target || prefersReducedMotion()) {
      this.apply(target);
      return;
    }
    const go = (): void => {
      if (run !== this._run) return;
      const start = performance.now();
      const step = (now: number): void => {
        const f = Math.min(1, (now - start) / ms);
        const x = 0.5 - 0.5 * Math.cos(Math.PI * f);
        this.apply(f >= 1 ? target : from + (target - from) * x);
        this._raf = f < 1 ? requestAnimationFrame(step) : 0;
      };
      this._raf = requestAnimationFrame(step);
    };
    // Set the 3-D view up before the clock starts, so the first frames don't stall.
    if (Math.max(from, target) > 1) {
      void this.host.loadMorph().then((m) => {
        m?.precompute();
        go();
      });
    } else {
      go();
    }
  }

  /** Bring the view switch in `bar` in step with the view, and tell the page where it is. */
  sync(bar: HTMLDivElement): void {
    const p = this.position;
    const shown = Math.round(this._raf ? this.target : p) + 1;
    for (const b of bar.querySelectorAll<HTMLButtonElement>('.view-button')) {
      b.setAttribute('aria-pressed', Number(b.dataset.dimension) === shown ? 'true' : 'false');
    }
    bar.classList.toggle('is-3d', p > 1);
    // The views resize and scroll the picture, so the edges change too.
    this.host.onMove();
    if (p !== this._lastPosition) {
      this._lastPosition = p;
      this.host.element.dispatchEvent(
        new CustomEvent<DimensionChangeDetail>('dimension-change', {
          detail: { dimension: 1 + p },
          bubbles: true,
          composed: true,
        }),
      );
    }
  }
}

/**
 * The view bar: the view switch, 1D (sequence), 2D (topology) and 3D
 * (structure), then a hint and `extra` (the full-screen button). 3D is
 * disabled when the chain has no 3-D view; otherwise pointing at or focusing
 * the bar calls `warm` once, ahead of the click.
 */
export function renderViewBar(
  available: boolean,
  onPick: (dimension: number) => void,
  warm: () => void,
  extra: HTMLElement,
): HTMLDivElement {
  const bar = document.createElement('div');
  bar.className = 'morph-bar';
  const group = document.createElement('div');
  group.className = 'view-switch';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Dimensions');
  const views: [string, string][] = [
    ['1D', 'Sequence: the chain flattened into its amino-acid sequence'],
    ['2D', 'Topology: the chain unrolled across the membrane'],
    ['3D', 'Structure: the topology rolled up into the 3-D structure'],
  ];
  const buttons = views.map(([text, label], k) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'view-button';
    if (k === 2) b.classList.add('morph-toggle');
    b.dataset.dimension = String(k + 1);
    b.textContent = text;
    b.title = label;
    b.setAttribute('aria-label', label);
    b.setAttribute('aria-pressed', k === 1 ? 'true' : 'false');
    b.addEventListener('click', () => onPick(k + 1));
    group.appendChild(b);
    return b;
  });
  const hint = document.createElement('span');
  hint.className = 'morph-hint';
  hint.textContent = 'Drag to rotate';
  bar.append(group, hint, extra);
  if (!available) {
    buttons[2].disabled = true;
    buttons[2].title = 'No 3-D view for this chain: its 3-D coordinates are incomplete';
    return bar;
  }
  bar.addEventListener('pointerenter', warm, { once: true });
  bar.addEventListener('focusin', warm, { once: true });
  return bar;
}
