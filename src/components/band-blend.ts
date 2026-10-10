import { prefersReducedMotion } from './dimension-controller.js';

/** A number in SVG path data. */
const PATH_NUMBER = /-?\d+(?:\.\d+)?/g;

/**
 * Blends the 2-D membrane band from the one drawn before a `membrane-detail`
 * change to the one drawn now.
 */
export class BandBlend {
  private _band: { raf: number; path: Element; to: string } | null = null;

  /**
   * Blend the band in `svg` from path data `from` to the band drawn there
   * now, over `ms`. The first frame changes on the next animation frame, so
   * until then the new band shows.
   */
  start(svg: SVGSVGElement, from: string, ms: number): void {
    const path = svg.querySelector('path.membrane');
    const to = path?.getAttribute('d');
    if (!path || !to || to === from || ms <= 0 || prefersReducedMotion()) return;
    // Both are membranePath output over the same x samples: blend the heights.
    const a = from.match(PATH_NUMBER)?.map(Number);
    const b = to.match(PATH_NUMBER)?.map(Number);
    if (!a || !b || a.length !== b.length || a.some((v, i) => i % 2 === 0 && v !== b[i])) return;
    const start = performance.now();
    const band = { raf: 0, path, to };
    const step = (now: number): void => {
      const f = Math.max(0, Math.min(1, (now - start) / ms));
      if (f >= 1) {
        this.finish();
        return;
      }
      const t = 0.5 - 0.5 * Math.cos(Math.PI * f);
      let d = '';
      for (let i = 0; i < a.length; i += 2) {
        d += `${i === 0 ? 'M' : 'L'}${a[i]},${(a[i + 1] + t * (b[i + 1] - a[i + 1])).toFixed(2)}`;
      }
      path.setAttribute('d', d + 'Z');
      band.raf = requestAnimationFrame(step);
    };
    band.raf = requestAnimationFrame(step);
    this._band = band;
  }

  /** End any blend, showing the band it was heading for. */
  finish(): void {
    const band = this._band;
    if (!band) return;
    cancelAnimationFrame(band.raf);
    band.path.setAttribute('d', band.to);
    this._band = null;
  }
}
