import type { ScrollBox } from './scroll-box.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** 'native' (Fullscreen API) or 'overlay' (fixed-position fallback). */
export type FullscreenMode = 'native' | 'overlay';

/** `detail` of `fullscreen-change` events. */
export interface FullscreenChangeDetail {
  fullscreen: boolean;
}

/** What the full-screen controller needs from the element it serves. */
export interface FullscreenHost {
  /** The element shown full screen; it gets the `fullscreen` attribute and events. */
  element: HTMLElement;
  /** The diagram box to scale, while one is shown. */
  box(): ScrollBox | null;
  /** The 2-D svg on screen, whose natural size sets the scale. */
  svg(): SVGSVGElement | null;
  /** The height the 3-D view should fill changed (Infinity: not full screen). */
  onFillHeight(height: number): void;
}

/**
 * Scale for a `w` × `h` picture in a `fw` × `fh` full-screen frame: as large
 * as fits, at most 4×; never smaller than natural size for the width (it
 * scrolls sideways instead), but shrunk, to a point, to fit the height.
 */
export function fullscreenScale(w: number, h: number, fw: number, fh: number): number {
  // Leave the border and a little slack, so rounding adds no scrollbars.
  const aw = fw - 4;
  const ah = fh - 4;
  const floor = Math.max(0.6, Math.min(1, ah / h));
  return Math.min(4, Math.max(floor, Math.min(aw / w, ah / h)));
}

/**
 * Shows an element full screen, with its diagram scaled to fit: the
 * Fullscreen API where the browser allows it (not iPhone Safari), else an
 * overlay covering the window. Escape, or the button, leaves.
 */
export class FullscreenController {
  private _mode: FullscreenMode | null = null;
  /** Height the 3-D view fills while full screen (Infinity otherwise). */
  private _fillHeight = Infinity;
  /** The button in the view bar, while one is shown. */
  button: HTMLButtonElement | null = null;
  /** Undo the full-screen listeners and page changes. */
  private _cleanup: (() => void) | null = null;

  constructor(private readonly host: FullscreenHost) {}

  /** Whether the element is shown full screen. */
  get active(): boolean {
    return this._mode !== null;
  }

  get fillHeight(): number {
    return this._fillHeight;
  }

  /** Show the element full screen (see the class comment). */
  async request(): Promise<void> {
    const el = this.host.element;
    if (this._mode || !el.isConnected) return;
    let mode: FullscreenMode = 'overlay';
    if (document.fullscreenEnabled && typeof el.requestFullscreen === 'function') {
      try {
        await el.requestFullscreen({ navigationUI: 'hide' });
        mode = 'native';
      } catch {
        // Refused (e.g. not from a user gesture): fall back to the overlay.
      }
    }
    this.enter(mode);
  }

  /** Leave full screen, and the browser's full screen too. */
  async exit(): Promise<void> {
    const native = this._mode === 'native' && document.fullscreenElement === this.host.element;
    this.leave();
    if (native) await document.exitFullscreen().catch(() => undefined);
  }

  /** Enter full screen, or leave it. */
  toggle(): Promise<void> {
    return this._mode ? this.exit() : this.request();
  }

  private enter(mode: FullscreenMode): void {
    const el = this.host.element;
    this._mode = mode;
    el.setAttribute('fullscreen', '');
    const offs: (() => void)[] = [];
    const on = <K extends keyof DocumentEventMap>(
      type: K,
      fn: (e: DocumentEventMap[K]) => void,
    ): void => {
      document.addEventListener(type, fn);
      offs.push(() => document.removeEventListener(type, fn));
    };
    if (mode === 'native') {
      // The browser's own Escape (or the page leaving full screen).
      on('fullscreenchange', () => {
        if (document.fullscreenElement !== el) this.leave();
      });
    } else {
      on('keydown', (e) => {
        if (e.key === 'Escape') this.leave();
      });
      // The page under the overlay shouldn't scroll.
      const root = document.documentElement;
      const overflow = root.style.overflow;
      root.style.overflow = 'hidden';
      offs.push(() => (root.style.overflow = overflow));
    }
    if (typeof ResizeObserver !== 'undefined') {
      const resize = new ResizeObserver(() => this.fit());
      resize.observe(el);
      offs.push(() => resize.disconnect());
    }
    this._cleanup = () => offs.forEach((off) => off());
    this.fit();
    this.syncButton();
    this.dispatchChange();
  }

  /** Leave full screen without asking the browser (it has left already, or never entered). */
  leave(): void {
    if (!this._mode) return;
    this._mode = null;
    this._cleanup?.();
    this._cleanup = null;
    this.host.element.removeAttribute('fullscreen');
    this.fit();
    this.syncButton();
    this.dispatchChange();
  }

  private dispatchChange(): void {
    this.host.element.dispatchEvent(
      new CustomEvent<FullscreenChangeDetail>('fullscreen-change', {
        detail: { fullscreen: this.active },
        bubbles: true,
        composed: true,
      }),
    );
  }

  /**
   * Scale the diagram box to the screen: the 2-D topology as large as fits
   * (see {@link fullscreenScale}), with the 1-D and 3-D views at the same
   * scale; the 3-D view fills the box's height. Undoes it all when not full
   * screen.
   *
   * The box is laid out at the frame's size divided by the scale and then
   * scaled up with a transform, so the views, which fit themselves to the
   * box's width, see the smaller width. (CSS `zoom` would be simpler, but
   * stray lines were seen across a zoomed 3-D view in Firefox.)
   */
  fit(): void {
    const box = this.host.box();
    const svg = this.host.svg();
    if (!box) return;
    const style = box.scroll.style;
    let fill = Infinity;
    if (this._mode && svg) {
      const w = Number(svg.getAttribute('width')) || 1;
      const h = Number(svg.getAttribute('height')) || 1;
      const fw = box.frame.clientWidth;
      const fh = box.frame.clientHeight;
      const scale = fullscreenScale(w, h, fw, fh);
      style.width = `${fw / scale}px`;
      style.height = `${fh / scale}px`;
      style.transform = scale === 1 ? '' : `scale(${scale})`;
      fill = box.scroll.clientHeight;
    } else {
      style.width = style.height = style.transform = '';
    }
    this._fillHeight = fill > 0 ? fill : Infinity;
    this.host.onFillHeight(this._fillHeight);
    box.update();
  }

  /** A new full-screen button for the view bar; it becomes {@link button}. */
  createButton(): HTMLButtonElement {
    const fs = document.createElement('button');
    fs.type = 'button';
    fs.className = 'fullscreen-button';
    fs.addEventListener('click', () => void this.toggle());
    this.button = fs;
    this.syncButton();
    return fs;
  }

  private syncButton(): void {
    const b = this.button;
    if (!b) return;
    const on = this.active;
    const label = on ? 'Exit full screen' : 'Full screen';
    b.title = on ? 'Exit full screen (Esc)' : 'Show full screen';
    b.replaceChildren(fullscreenIcon(on), label);
  }
}

/** Four corners pointing out (enter full screen) or in (leave). */
function fullscreenIcon(exit: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    exit ? 'M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5' : 'M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5',
  );
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  svg.appendChild(path);
  return svg;
}
