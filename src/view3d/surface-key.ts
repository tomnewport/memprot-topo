/**
 * Colour key for the surface membrane style: the colour bands, the thickness
 * change at which the colour saturates, and the range the membrane actually
 * spans, so a strongly distorted bilayer that reads as one solid colour says
 * how far past the end of the scale it goes.
 */

import { mixRgb, type RGB, rgbStr } from './colour.js';
import { Pooled } from './engine.js';
import {
  SURFACE_ALPHA,
  SURFACE_BANDS,
  SURFACE_RANGE,
  type SurfaceShading,
} from './membrane-layer.js';
import type { View3DStyle } from './types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Swatch size and the key's padding, inset from the view's corner and line gap (px). */
const SWATCH = { w: 9, h: 8 };
const PAD = 6;
const INSET = 8;
const LINE = 12;
const FONT_PX = 10;
const CAPTION = 'Thickness vs bulk (Å)';

/** Rough width (px) of key text: the key's box only needs to cover it. */
function textW(s: string): number {
  return s.length * FONT_PX * 0.56;
}

/** Lowest and highest thickness change (Å) over both leaflets; null if none is finite. */
export function changeRange(surface: SurfaceShading): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const zs of [surface.change.upper, surface.change.lower]) {
    for (const z of zs) {
      if (z < lo) lo = z;
      if (z > hi) hi = z;
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

/** A thickness change for the key: whole Å, with a real minus sign and an explicit plus. */
export function signedA(v: number): string {
  const r = Math.round(v);
  return r > 0 ? `+${r}` : r < 0 ? `−${-r}` : '0';
}

/**
 * The key's caption for the range a membrane spans: says which end runs past
 * the saturated colour, or null when the whole range is on the scale.
 */
export function rangeNote(range: [number, number] | null): string | null {
  if (!range) return null;
  const [lo, hi] = range;
  if (lo >= -SURFACE_RANGE && hi <= SURFACE_RANGE) return null;
  return `spans ${signedA(lo)} to ${signedA(hi)} Å`;
}

/** The key, drawn in the bottom-left corner of the visible picture. */
export class SurfaceKey {
  readonly el: SVGGElement;
  private readonly g: Pooled<SVGGElement>;
  private readonly back: Pooled<SVGRectElement>;
  private readonly swatches: Pooled<SVGRectElement>[];
  private readonly caption: Pooled<SVGTextElement>;
  private readonly ticks: Pooled<SVGTextElement>[];
  private readonly note: Pooled<SVGTextElement>;

  constructor() {
    const make = <K extends 'rect' | 'text'>(tag: K, parent: Element) => {
      const el = document.createElementNS(SVG_NS, tag);
      parent.append(el);
      return new Pooled(el as SVGElementTagNameMap[K]);
    };
    this.el = document.createElementNS(SVG_NS, 'g');
    this.el.setAttribute('class', 'surface-key');
    this.g = new Pooled(this.el);
    this.g.set('display', 'none');
    this.back = make('rect', this.el);
    this.back.set('rx', '3');
    this.swatches = Array.from({ length: SURFACE_BANDS }, () => make('rect', this.el));
    this.caption = make('text', this.el);
    this.caption.el.textContent = CAPTION;
    // Saturated ends and the bulk.
    this.ticks = [make('text', this.el), make('text', this.el), make('text', this.el)];
    this.ticks[0].el.textContent = `≤ ${signedA(-SURFACE_RANGE)}`;
    this.ticks[1].el.textContent = '0';
    this.ticks[2].el.textContent = `≥ ${signedA(SURFACE_RANGE)}`;
    this.note = make('text', this.el);
  }

  /**
   * Show the key at opacity `alpha` for `surface` (hidden when null), in the
   * corner of the visible picture: `left` is its scroll offset, `height` the
   * picture's height.
   */
  draw(
    surface: SurfaceShading | null,
    alpha: number,
    style: View3DStyle,
    ground: RGB,
    left: number,
    height: number,
  ): void {
    if (!surface || alpha < 0.001) {
      this.g.set('display', 'none');
      return;
    }
    this.g.set('display', null);
    const note = rangeNote(changeRange(surface));
    const barW = SURFACE_BANDS * SWATCH.w;
    const w = Math.max(barW, textW(CAPTION), note ? textW(note) : 0) + 2 * PAD;
    const h = PAD + LINE + SWATCH.h + LINE + (note ? LINE : 0) + PAD - 2;
    const x0 = left + INSET;
    const y0 = height - INSET - h;
    this.g.set('transform', `translate(${x0.toFixed(1)},${y0.toFixed(1)})`);
    this.g.set('opacity', alpha.toFixed(3));
    this.g.set('font-family', style.labelFontFamily);
    this.g.set('font-size', String(FONT_PX));
    this.g.set('fill', style.labelFill);
    this.back.set('width', String(w));
    this.back.set('height', String(h));
    this.back.set('fill', rgbStr(ground));
    this.back.set('fill-opacity', '0.85');
    // Each band as it looks on the upper leaflet over the background.
    const barY = PAD + LINE - 2;
    this.swatches.forEach((s, i) => {
      s.set('x', String(PAD + i * SWATCH.w));
      s.set('y', String(barY));
      s.set('width', String(SWATCH.w));
      s.set('height', String(SWATCH.h));
      s.set('fill', rgbStr(mixRgb(ground, surface.colours[i], SURFACE_ALPHA.upper)));
    });
    this.caption.set('x', String(PAD));
    this.caption.set('y', String(PAD + FONT_PX - 2));
    const tickY = String(barY + SWATCH.h + FONT_PX);
    const anchors = ['start', 'middle', 'end'];
    const xs = [PAD, PAD + barW / 2, PAD + barW];
    this.ticks.forEach((t, i) => {
      t.set('x', String(xs[i]));
      t.set('y', tickY);
      t.set('text-anchor', anchors[i]);
    });
    if (note) {
      this.note.set('display', null);
      this.note.set('x', String(PAD));
      this.note.set('y', String(barY + SWATCH.h + FONT_PX + LINE));
      if (this.note.el.textContent !== note) this.note.el.textContent = note;
    } else {
      this.note.set('display', 'none');
    }
  }
}
