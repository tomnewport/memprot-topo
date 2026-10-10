/** Colour arithmetic, lighting and fog shared by the 3-D view's layers. */

export type RGB = [number, number, number];

/** Compact coordinate formatting to `scale` steps per px — much cheaper than toFixed. */
export function fmt(v: number, scale: number): string {
  return String(Math.round(v * scale) / scale);
}

/** `#rgb`, `#rrggbb` or `rgb(r, g, b)` as an RGB triple. */
export function hexRgb(hex: string): RGB {
  const m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(hex.trim());
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  const h = hex.trim().replace('#', '');
  const f =
    h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  return [parseInt(f[0], 16), parseInt(f[1], 16), parseInt(f[2], 16)];
}

export function rgbStr(c: RGB): string {
  const r = Math.max(0, Math.min(255, Math.round(c[0])));
  const g = Math.max(0, Math.min(255, Math.round(c[1])));
  const b = Math.max(0, Math.min(255, Math.round(c[2])));
  return `rgb(${r},${g},${b})`;
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export const WHITE: RGB = [255, 255, 255];

/** The CSS `saturate(s)` filter applied to a colour. */
export function saturate([r, g, b]: RGB, s: number): RGB {
  return [
    (0.213 + 0.787 * s) * r + (0.715 - 0.715 * s) * g + (0.072 - 0.072 * s) * b,
    (0.213 - 0.213 * s) * r + (0.715 + 0.285 * s) * g + (0.072 - 0.072 * s) * b,
    (0.213 - 0.213 * s) * r + (0.715 - 0.715 * s) * g + (0.072 + 0.928 * s) * b,
  ];
}

export function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

/** Linear interpolation of ys over sorted xs at x, held flat past either end. */
export function sampleProfile(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (n === 0) return 0;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
  return ys[lo] + t * (ys[hi] - ys[lo]);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Light direction in camera space (x right, y up, d away from the viewer). */
export const LIGHT = ((): [number, number, number] => {
  const v: [number, number, number] = [-0.45, 0.62, -0.64];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
export const HALF = ((): [number, number, number] => {
  const v: [number, number, number] = [LIGHT[0], LIGHT[1], LIGHT[2] - 1];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
export const AMBIENT = 0.58;
export const DIFFUSE = 0.55;
/** Maximum fog (mix towards the background) at the far end of the scene. */
export const FOG = 0.38;

/** Lit colour, blended in by `sigma` (0 = flat 2-D colour), then fogged. */
export function shade(
  base: RGB,
  intensity: number,
  spec: number,
  sigma: number,
  fog: number,
  ground: RGB,
): RGB {
  let lit: RGB = [base[0] * intensity, base[1] * intensity, base[2] * intensity];
  if (spec > 0) lit = mixRgb(lit, WHITE, spec);
  return fogged(mixRgb(base, lit, sigma), fog, ground);
}

export function shadeEdge(edge: RGB, sigma: number, fog: number, ground: RGB): RGB {
  return fogged(mixRgb(edge, [edge[0] * 0.8, edge[1] * 0.8, edge[2] * 0.8], sigma), fog, ground);
}

/** Mix towards the background (the theme's ground) with depth. */
export function fogged(c: RGB, fog: number, ground: RGB): RGB {
  return fog > 0 ? mixRgb(c, ground, fog) : c;
}
