import { ssOutline, type OutlinePoint, type OutlineSection } from '../components/ss-outline.js';
import { Camera } from './camera.js';
import { computePose, type Pose } from './curtain.js';
import type { MorphModel, ModelElement, ModelLoop } from './model.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Tunable 3-D appearance. Lengths in Å, angles in radians. */
export interface MorphOptions {
  /** Helix cylinder radius. */
  helixRadius: number;
  /** Full width of a strand ribbon. */
  strandWidth: number;
  /** Full width of a strand arrowhead at its base. */
  arrowWidth: number;
  /** Length of a strand arrowhead. */
  arrowLength: number;
  /** Ribbon thickness. */
  strandThickness: number;
  /** Loop tube radius. */
  coilRadius: number;
  /** Camera elevation of the finished 3-D view (positive = looking down). */
  elevation: number;
  /** Diagonal field of view of the finished 3-D view (35 mm ≈ 63.4°). */
  fov: number;
  /**
   * Width of the rolling wave as a fraction of the chain: 0 rolls the whole
   * chain up at once; > 0 rolls from the N-terminal end to the C-terminal end.
   */
  sweep: number;
}

export const DEFAULT_MORPH_OPTIONS: MorphOptions = {
  helixRadius: 2.3,
  strandWidth: 3.8,
  arrowWidth: 6.2,
  arrowLength: 5,
  strandThickness: 1.0,
  coilRadius: 0.42,
  elevation: (16 * Math.PI) / 180,
  fov: 2 * Math.atan(Math.hypot(36, 24) / 2 / 35),
  sweep: 0.7,
};

/** User orbit applied on top of the scripted camera (radians). */
export interface Orbit {
  az: number;
  el: number;
}

/** What the host must apply to the scroll container after a frame. */
export interface FrameLayout {
  width: number;
  height: number;
  scrollLeft: number;
}

type RGB = [number, number, number];

/** Compact coordinate formatting (0.01 px) — much cheaper than toFixed. */
function f2(v: number): string {
  return String(Math.round(v * 100) / 100);
}

function hexRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  const f =
    h.length === 3 ? h.split('').map((c) => c + c) : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  return [parseInt(f[0], 16), parseInt(f[1], 16), parseInt(f[2], 16)];
}

function rgbStr(c: RGB): string {
  const r = Math.max(0, Math.min(255, Math.round(c[0])));
  const g = Math.max(0, Math.min(255, Math.round(c[1])));
  const b = Math.max(0, Math.min(255, Math.round(c[2])));
  return `rgb(${r},${g},${b})`;
}

function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: RGB = [255, 255, 255];

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smooth(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Light direction in camera space (x right, y up, d away from the viewer). */
const LIGHT = ((): [number, number, number] => {
  const v: [number, number, number] = [-0.45, 0.62, -0.64];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const HALF = ((): [number, number, number] => {
  const v: [number, number, number] = [LIGHT[0], LIGHT[1], LIGHT[2] - 1];
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
})();
const AMBIENT = 0.58;
const DIFFUSE = 0.55;
/** Maximum fog (mix towards white) at the far end of the scene. */
const FOG = 0.38;

/**
 * Cylinder shading bands: angular half-widths about the brightest line. Each
 * band is drawn over the previous one so there are no seams between them.
 */
const BAND_HALF = [10, 1.2, 0.9, 0.62, 0.36, 0.15];
const BAND_LEVEL = [0.05, 0.5, 0.72, 0.87, 0.96, 1.0];
const BAND_SPEC = [0, 0, 0, 0.04, 0.14, 0.32];

/** A drawable piece of the scene, depth-sorted as a unit. */
interface Prim {
  id: number;
  order: number;
  sub: number;
  depth: number;
  /** World z for membrane layering. */
  zc: number;
  /** Membrane layer rank (filled in before sorting). */
  rank: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  faded: boolean;
  /** Membrane discs pin themselves to a layer. */
  plane?: 'top' | 'bottom';
  /** Screen footprint points (flat x, y); absent = overlaps everything. */
  pts?: number[];
  /** Convex hull of `pts`, computed only when an overlap test needs it. */
  hull?: number[];
  /** Extra footprint margin (stroke half-width), px. */
  pad?: number;
  /** Run this primitive was emitted into (set while merging). */
  run?: number;
  emit: (run: Run) => void;
}

/** Convex hull (Andrew's monotone chain) of flat x, y points. */
function convexHull(pts: number[]): number[] {
  const n = pts.length / 2;
  if (n <= 2) return pts.slice();
  const idx = Array.from({ length: n }, (_, i) => i).sort(
    (a, b) => pts[a * 2] - pts[b * 2] || pts[a * 2 + 1] - pts[b * 2 + 1],
  );
  const cross = (o: number, a: number, b: number): number =>
    (pts[a * 2] - pts[o * 2]) * (pts[b * 2 + 1] - pts[o * 2 + 1]) -
    (pts[a * 2 + 1] - pts[o * 2 + 1]) * (pts[b * 2] - pts[o * 2]);
  const lower: number[] = [];
  for (const i of idx) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], i) <= 0)
      lower.pop();
    lower.push(i);
  }
  const upper: number[] = [];
  for (let k = idx.length - 1; k >= 0; k--) {
    const i = idx[k];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], i) <= 0)
      upper.pop();
    upper.push(i);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const out: number[] = [];
  for (const i of hull) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out.length >= 2 ? out : pts.slice(0, 2);
}

function hullOf(p: Prim): number[] | undefined {
  if (!p.hull && p.pts) p.hull = convexHull(p.pts);
  return p.hull;
}

/** Separating-axis test between two convex footprints with a margin. */
function separated(a: number[], b: number[], margin: number): boolean {
  for (const [P, Q] of [
    [a, b],
    [b, a],
  ]) {
    const m = P.length / 2;
    for (let i = 0; i < m; i++) {
      const j = (i + 1) % m;
      let ax = -(P[j * 2 + 1] - P[i * 2 + 1]);
      let ay = P[j * 2] - P[i * 2];
      const al = Math.hypot(ax, ay);
      if (al < 1e-9) continue;
      ax /= al;
      ay /= al;
      let pMin = Infinity,
        pMax = -Infinity,
        qMin = Infinity,
        qMax = -Infinity;
      for (let k = 0; k < P.length; k += 2) {
        const v = P[k] * ax + P[k + 1] * ay;
        if (v < pMin) pMin = v;
        if (v > pMax) pMax = v;
      }
      for (let k = 0; k < Q.length; k += 2) {
        const v = Q[k] * ax + Q[k + 1] * ay;
        if (v < qMin) qMin = v;
        if (v > qMax) qMax = v;
      }
      if (pMax + margin < qMin || qMax + margin < pMin) return true;
    }
  }
  return false;
}

interface OpSpec {
  layer: number;
  key: string;
  kind: 'fill' | 'stroke' | 'gradient';
  dash?: string;
  linecap?: string;
  fillOpacity?: number;
  strokeColour?: string;
  strokeWidth?: number;
}

interface Op {
  spec: OpSpec;
  seq: number;
  d: string[];
  /** Open polyline (stroke ops) awaiting continuation. */
  line: number[] | null;
  /**
   * Open strip (fill ops): left and right edge points of consecutive
   * sections. Emitted as one outline polygon so adjacent sections share no
   * internal edge — abutting polygons leave anti-aliasing seams.
   */
  strip: { L: number[]; R: number[] } | null;
  rgb: [number, number, number, number];
  width: [number, number];
  opacity: [number, number];
  stops: { x: number; y: number; c: RGB }[];
}

class Run {
  readonly ops = new Map<string, Op>();
  private seq = 0;
  constructor(
    readonly id: number,
    readonly faded: boolean,
  ) {}

  private op(spec: OpSpec): Op {
    const k = `${spec.layer}|${spec.key}`;
    let op = this.ops.get(k);
    if (!op) {
      op = {
        spec,
        seq: this.seq++,
        d: [],
        line: null,
        strip: null,
        rgb: [0, 0, 0, 0],
        width: [0, 0],
        opacity: [0, 0],
        stops: [],
      };
      this.ops.set(k, op);
    }
    return op;
  }

  fill(spec: OpSpec, pts: number[], c: RGB, opacity = 1): void {
    if (pts.length < 6) return;
    const op = this.op(spec);
    let d = 'M' + f2(pts[0]) + ',' + f2(pts[1]);
    for (let i = 2; i < pts.length; i += 2) d += 'L' + f2(pts[i]) + ',' + f2(pts[i + 1]);
    op.d.push(d + 'Z');
    op.rgb[0] += c[0];
    op.rgb[1] += c[1];
    op.rgb[2] += c[2];
    op.rgb[3] += 1;
    op.opacity[0] += opacity;
    op.opacity[1] += 1;
  }

  /**
   * Append a quad section given as its start (l0, r0) and end (l1, r1) edge
   * points; it extends the open strip when it starts where that strip ends.
   */
  strip(spec: OpSpec, q: number[], c: RGB, opacity = 1): void {
    const op = this.op(spec);
    const s = op.strip;
    const [l0x, l0y, r0x, r0y, l1x, l1y, r1x, r1y] = q;
    if (
      s &&
      Math.abs(s.L[s.L.length - 2] - l0x) < 1e-6 &&
      Math.abs(s.L[s.L.length - 1] - l0y) < 1e-6 &&
      Math.abs(s.R[s.R.length - 2] - r0x) < 1e-6 &&
      Math.abs(s.R[s.R.length - 1] - r0y) < 1e-6
    ) {
      s.L.push(l1x, l1y);
      s.R.push(r1x, r1y);
    } else {
      this.flushStrip(op);
      op.strip = { L: [l0x, l0y, l1x, l1y], R: [r0x, r0y, r1x, r1y] };
    }
    op.rgb[0] += c[0];
    op.rgb[1] += c[1];
    op.rgb[2] += c[2];
    op.rgb[3] += 1;
    op.opacity[0] += opacity;
    op.opacity[1] += 1;
  }

  private flushStrip(op: Op): void {
    const s = op.strip;
    if (!s) return;
    // Nudge both ends of the strip outwards by half a pixel so that where an
    // element is split across runs the pieces overlap instead of leaving an
    // anti-aliased seam. (The outline stroke covers the overhang at real ends.)
    extendEnd(s.L, 0, 2);
    extendEnd(s.R, 0, 2);
    extendEnd(s.L, s.L.length - 2, s.L.length - 4);
    extendEnd(s.R, s.R.length - 2, s.R.length - 4);
    let d = 'M' + f2(s.L[0]) + ',' + f2(s.L[1]);
    for (let i = 2; i < s.L.length; i += 2) d += 'L' + f2(s.L[i]) + ',' + f2(s.L[i + 1]);
    for (let i = s.R.length - 2; i >= 0; i -= 2) d += 'L' + f2(s.R[i]) + ',' + f2(s.R[i + 1]);
    op.d.push(d + 'Z');
    op.strip = null;
  }

  gradientStop(spec: OpSpec, x: number, y: number, c: RGB): void {
    this.op(spec).stops.push({ x, y, c });
  }

  stroke(spec: OpSpec, pts: number[], c: RGB, width: number, opacity = 1): void {
    if (pts.length < 4) return;
    const op = this.op(spec);
    const line = op.line;
    if (
      line &&
      Math.abs(line[line.length - 2] - pts[0]) < 1e-6 &&
      Math.abs(line[line.length - 1] - pts[1]) < 1e-6
    ) {
      for (let i = 2; i < pts.length; i++) line.push(pts[i]);
    } else {
      this.flush(op);
      op.line = pts.slice();
    }
    op.rgb[0] += c[0];
    op.rgb[1] += c[1];
    op.rgb[2] += c[2];
    op.rgb[3] += 1;
    op.width[0] += width;
    op.width[1] += 1;
    op.opacity[0] += opacity;
    op.opacity[1] += 1;
  }

  flush(op: Op): void {
    const line = op.line;
    if (!line) return;
    let d = 'M' + f2(line[0]) + ',' + f2(line[1]);
    for (let i = 2; i < line.length; i += 2) d += 'L' + f2(line[i]) + ',' + f2(line[i + 1]);
    op.d.push(d);
    op.line = null;
  }

  sortedOps(): Op[] {
    for (const op of this.ops.values()) {
      this.flush(op);
      this.flushStrip(op);
    }
    return [...this.ops.values()].sort((a, b) => a.spec.layer - b.spec.layer || a.seq - b.seq);
  }
}

/** Push point `i` of a flat x, y array 0.5 px further from point `j`. */
function extendEnd(a: number[], i: number, j: number): void {
  if (j < 0 || j >= a.length) return;
  const dx = a[i] - a[j];
  const dy = a[i + 1] - a[j + 1];
  const l = Math.hypot(dx, dy);
  if (l < 1e-6) return;
  a[i] += (0.5 * dx) / l;
  a[i + 1] += (0.5 * dy) / l;
}

/** Pooled SVG element with cached attributes. */
class Pooled<T extends SVGElement> {
  private cache = new Map<string, string>();
  constructor(readonly el: T) {}
  set(name: string, value: string | null): void {
    const prev = this.cache.get(name);
    if (value === null) {
      if (prev !== undefined) {
        this.el.removeAttribute(name);
        this.cache.delete(name);
      }
      return;
    }
    if (prev === value) return;
    this.el.setAttribute(name, value);
    this.cache.set(name, value);
  }
}

interface RunSlot {
  g: Pooled<SVGGElement>;
  paths: Pooled<SVGPathElement>[];
}

interface Framing {
  clientWidth: number;
  scroll0: number;
  width0: number;
  height0: number;
  width1: number;
  height1: number;
  scale0: number;
  scale1: number;
  target0: [number, number, number];
  target1: [number, number, number];
  cx0: number;
  cy0: number;
  /** Viewport-relative x of the camera centre at t = 0. */
  vx0: number;
  disc1: { x: number; y: number; r: number };
}

/**
 * Renders the morph between the 2-D topology view (τ = 0) and a 3-D
 * Richardson-style diagram (τ = 1) as plain SVG, so the first frame is the
 * 2-D picture itself and every frame stays vector.
 */
export class MorphRenderer {
  readonly svg: SVGSVGElement;
  private readonly defs: SVGDefsElement;
  private readonly back: { rim: Pooled<SVGPathElement>; mid: Pooled<SVGPathElement> };
  private readonly runsG: SVGGElement;
  private readonly labelsG: SVGGElement;
  private readonly slots: RunSlot[] = [];
  private readonly grads: {
    el: Pooled<SVGLinearGradientElement>;
    stops: Pooled<SVGStopElement>[];
  }[] = [];
  private readonly texts: Pooled<SVGTextElement>[] = [];
  private framing: Framing | null = null;
  private readonly tmp = new Float64Array(8);
  private readonly colours: {
    helix: RGB;
    helixEdge: string;
    strand: RGB;
    strandEdge: string;
    coil: RGB;
  };

  constructor(
    readonly model: MorphModel,
    readonly options: MorphOptions = DEFAULT_MORPH_OPTIONS,
    private readonly idPrefix = 'mp',
  ) {
    const st = model.scene.style;
    this.colours = {
      helix: hexRgb(st.helixFill),
      helixEdge: st.helixStroke,
      strand: hexRgb(st.strandFill),
      strandEdge: st.strandStroke,
      coil: hexRgb(st.coil),
    };
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('class', 'morph-svg');
    svg.setAttribute('role', 'img');
    this.svg = svg;
    this.defs = document.createElementNS(SVG_NS, 'defs');
    const backG = document.createElementNS(SVG_NS, 'g');
    const rim = document.createElementNS(SVG_NS, 'path');
    const mid = document.createElementNS(SVG_NS, 'path');
    backG.append(rim, mid);
    this.back = { rim: new Pooled(rim), mid: new Pooled(mid) };
    this.runsG = document.createElementNS(SVG_NS, 'g');
    this.labelsG = document.createElementNS(SVG_NS, 'g');
    this.labelsG.setAttribute('font-family', 'sans-serif');
    svg.append(this.defs, backG, this.runsG, this.labelsG);
  }

  /**
   * Fix the start and end framing. `clientWidth` is the visible width of the
   * scroll container and `scroll0` its scroll offset at the 2-D end.
   */
  configure(clientWidth: number, scroll0: number): void {
    const { model, options } = this;
    const fr = model.scene.frame;
    const half = model.scene.slab.half;
    const pose = computePose(model, 1, 0);
    let x0 = Infinity,
      x1 = -Infinity,
      y0 = Infinity,
      y1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity;
    let tx0 = Infinity,
      tx1 = -Infinity,
      ty0 = Infinity,
      ty1 = -Infinity;
    for (let k = 0; k < model.n; k++) {
      const x = pose.w[k * 4];
      const y = pose.w[k * 4 + 1];
      const z = pose.w[k * 4 + 2];
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
      z0 = Math.min(z0, z);
      z1 = Math.max(z1, z);
    }
    // The membrane disc is centred on (and sized to) the transmembrane
    // helices and strands; loops are allowed to stray outside it.
    for (const el of model.elements) {
      for (let k = el.g0; k <= el.g1; k++) {
        if (Math.abs(pose.w[k * 4 + 2]) > half + 2) continue;
        tx0 = Math.min(tx0, pose.w[k * 4]);
        tx1 = Math.max(tx1, pose.w[k * 4]);
        ty0 = Math.min(ty0, pose.w[k * 4 + 1]);
        ty1 = Math.max(ty1, pose.w[k * 4 + 1]);
      }
    }
    if (!Number.isFinite(x0)) {
      x0 = y0 = z0 = -10;
      x1 = y1 = z1 = 10;
    }
    if (!Number.isFinite(tx0)) {
      tx0 = x0;
      tx1 = x1;
      ty0 = y0;
      ty1 = y1;
    }
    const dcx = (tx0 + tx1) / 2;
    const dcy = (ty0 + ty1) / 2;
    let dr = 0;
    for (const el of model.elements) {
      for (let k = el.g0; k <= el.g1; k++) {
        if (Math.abs(pose.w[k * 4 + 2]) > half + 2) continue;
        dr = Math.max(dr, Math.hypot(pose.w[k * 4] - dcx, pose.w[k * 4 + 1] - dcy));
      }
    }
    dr = Math.max(dr, 10) + 8;
    x0 = Math.min(x0, dcx - dr);
    x1 = Math.max(x1, dcx + dr);
    y0 = Math.min(y0, dcy - dr);
    y1 = Math.max(y1, dcy + dr);
    z0 = Math.min(z0, -half);
    z1 = Math.max(z1, half);
    const target1: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];

    // Fit the finished view: content extent seen from the final camera.
    const width0 = fr.width;
    const height0 = fr.height;
    const width1 = Math.max(200, clientWidth);
    const margin = 28;
    const pts: [number, number, number][] = [];
    for (let k = 0; k < model.n; k += 4)
      pts.push([pose.w[k * 4], pose.w[k * 4 + 1], pose.w[k * 4 + 2]]);
    for (let a = 0; a < 24; a++) {
      const c = Math.cos((a / 24) * 2 * Math.PI);
      const s = Math.sin((a / 24) * 2 * Math.PI);
      pts.push([dcx + dr * c, dcy + dr * s, half], [dcx + dr * c, dcy + dr * s, -half]);
    }
    const extent = (scale: number, height: number): [number, number] => {
      const cam = new Camera({
        target: target1,
        az: 0,
        el: options.elevation,
        scale,
        fov: options.fov,
        diag: Math.hypot(width1, height),
        cx: 0,
        cy: 0,
      });
      let ex = 0,
        ey = 0;
      for (const p of pts) {
        cam.project(p[0], p[1], p[2], this.tmp);
        ex = Math.max(ex, Math.abs(this.tmp[0]));
        ey = Math.max(ey, Math.abs(this.tmp[1]));
      }
      return [ex, ey];
    };
    const [ex1, ey1] = extent(1, 500);
    const sw = (width1 - 2 * margin) / (2 * ex1);
    const height1 = Math.round(
      Math.min(640, Math.max(height0, 360, Math.min(2 * ey1 * sw + 2 * margin, 640))),
    );
    let scale1 = Math.min(sw, (height1 - 2 * margin) / (2 * ey1), 9);
    for (let i = 0; i < 3; i++) {
      const [ex, ey] = extent(scale1, height1);
      const f = Math.min((width1 / 2 - margin) / ex, (height1 / 2 - margin) / ey);
      scale1 *= Math.min(1.25, Math.max(0.6, f));
    }

    const vx0 = Math.min(clientWidth, width0) / 2;
    const cx0 = scroll0 + vx0;
    const cy0 = fr.originY - fr.minY;
    const ua0 = model.n > 0 ? model.ud[model.anchor] : 0;
    const target0: [number, number, number] = [
      (cx0 - (fr.originX - fr.minX)) / fr.pxPerA - ua0,
      0,
      0,
    ];
    this.framing = {
      clientWidth,
      scroll0,
      width0,
      height0,
      width1,
      height1,
      scale0: fr.pxPerA,
      scale1,
      target0,
      target1,
      cx0,
      cy0,
      vx0,
      disc1: { x: dcx, y: dcy, r: dr },
    };
  }

  /** Render the morph at progress `tau` ∈ [0, 1]. */
  render(tau: number, orbit: Orbit = { az: 0, el: 0 }): FrameLayout {
    if (!this.framing) this.configure(this.model.scene.frame.width, 0);
    const F = this.framing!;
    const { model, options } = this;
    const st = model.scene.style;
    const pxA = model.scene.frame.pxPerA;

    // Easing channels.
    const eCam = smooth(0, 1, tau);
    const eFov = smooth(0.05, 0.9, tau);
    const eEl = smooth(0.0, 0.8, tau);
    const sigma = smooth(0.02, 0.65, tau);
    const eW = smooth(0.0, 0.55, tau);
    const eLoop = smooth(0.0, 0.7, tau);
    const eDisc = smooth(0.35, 0.95, tau);
    const labelAlpha = 1 - smooth(0, 0.22, tau);
    const tieAlpha = 1 - smooth(0, 0.3, tau);

    const width = lerp(F.width0, F.width1, eCam);
    const height = lerp(F.height0, F.height1, eCam);
    const scrollLeft = lerp(F.scroll0, 0, eCam);
    const cx = scrollLeft + lerp(F.vx0, F.width1 / 2, eCam);
    const cy = lerp(F.cy0, F.height1 / 2, eCam);
    const scale = Math.exp(lerp(Math.log(F.scale0), Math.log(F.scale1), eCam));
    const cam = new Camera({
      target: [
        lerp(F.target0[0], F.target1[0], eCam),
        lerp(F.target0[1], F.target1[1], eCam),
        lerp(F.target0[2], F.target1[2], eCam),
      ],
      az: orbit.az * eCam,
      el: options.elevation * eEl + orbit.el * eCam,
      scale,
      fov: options.fov * eFov,
      diag: Math.hypot(F.width1, F.height1),
      cx,
      cy,
    });

    const pose = computePose(model, tau, options.sweep);

    // Project every sample once.
    const n = model.n;
    const proj = new Float64Array(n * 4);
    let dMin = Infinity;
    let dMax = -Infinity;
    for (let k = 0; k < n; k++) {
      cam.project(pose.w[k * 4], pose.w[k * 4 + 1], pose.w[k * 4 + 2], proj, k * 4);
      if (proj[k * 4 + 2] < dMin) dMin = proj[k * 4 + 2];
      if (proj[k * 4 + 2] > dMax) dMax = proj[k * 4 + 2];
    }
    const fogAt = (d: number): number =>
      dMax - dMin > 1e-6 ? FOG * sigma * clamp01((d - dMin) / (dMax - dMin)) : 0;

    const prims: Prim[] = [];
    const ctx: FrameCtx = { model, pose, cam, proj, scale, sigma, eW, eLoop, fogAt, pxA, prims };

    for (const el of model.elements) {
      if (el.type === 'helix') this.helixPrims(ctx, el);
      else this.strandPrims(ctx, el);
    }
    for (const loop of model.loops) this.loopPrims(ctx, loop);
    if (tieAlpha > 0.001) this.tiePrims(ctx, tieAlpha * 0.5);

    // Membrane.
    const half = model.scene.slab.half;
    const discX = lerp((model.slabX0 + model.slabX1) / 2, F.disc1.x, eCam);
    const discY = lerp(0, F.disc1.y, eCam);
    const discR = lerp((model.slabX1 - model.slabX0) / 2, F.disc1.r, eCam);
    this.drawBackRim(cam, discX, discY, discR, half, sigma);
    const planesOn = eDisc > 0.001 && Math.abs(cam.p.el) > 1e-3;
    if (planesOn) {
      for (const which of ['top', 'bottom'] as const) {
        const zp = which === 'top' ? half : -half;
        const ring: number[] = [];
        let dSum = 0;
        for (let a = 0; a < 64; a++) {
          const th = (a / 64) * 2 * Math.PI;
          cam.project(discX + discR * Math.cos(th), discY + discR * Math.sin(th), zp, this.tmp);
          ring.push(this.tmp[0], this.tmp[1]);
          dSum += this.tmp[2];
        }
        const fill = hexRgb(st.membraneFill);
        prims.push({
          id: -10 - (which === 'top' ? 1 : 2),
          order: -1,
          sub: 0,
          depth: dSum / 64,
          zc: zp,
          rank: 0,
          x0: -1e9,
          y0: -1e9,
          x1: 1e9,
          y1: 1e9,
          faded: false,
          plane: which,
          emit: (run) => {
            // The upper leaflet surface reads as a translucent sheet; the lower
            // one is kept faint so the cytoplasmic side stays legible.
            const alpha = which === 'top' ? 0.28 : 0.1;
            run.fill({ layer: 0, key: 'disc', kind: 'fill' }, ring, fill, alpha * eDisc);
            run.stroke(
              {
                layer: 1,
                key: 'disc-edge',
                kind: 'stroke',
                linecap: 'round',
              },
              [...ring, ring[0], ring[1]],
              hexRgb(st.membraneEdge),
              1,
              eDisc,
            );
          },
        });
      }
    }

    // Membrane layering (a BSP split on the two bilayer planes), then depth.
    const eyeZ = Number.isFinite(cam.dist) ? cam.eye[2] : cam.p.el > 0 ? Infinity : -Infinity;
    for (const p of prims) {
      if (!planesOn) {
        p.rank = 0;
        continue;
      }
      const side = p.plane ? null : p.zc > half ? 'above' : p.zc < -half ? 'below' : 'inside';
      if (eyeZ > half) {
        p.rank =
          p.plane === 'bottom'
            ? 1
            : p.plane === 'top'
              ? 3
              : side === 'below'
                ? 0
                : side === 'inside'
                  ? 2
                  : 4;
      } else if (eyeZ < -half) {
        p.rank =
          p.plane === 'top'
            ? 1
            : p.plane === 'bottom'
              ? 3
              : side === 'above'
                ? 0
                : side === 'inside'
                  ? 2
                  : 4;
      } else {
        p.rank =
          p.plane === 'top'
            ? 1
            : p.plane === 'bottom'
              ? 3
              : side === 'above'
                ? 0
                : side === 'below'
                  ? 2
                  : 4;
      }
    }
    for (const p of prims) p.depth = Math.round(p.depth * 20);
    prims.sort(
      (a, b) => a.rank - b.rank || b.depth - a.depth || a.order - b.order || a.sub - b.sub,
    );

    const runs = this.mergeRuns(prims, width, height);
    this.emitRuns(runs);
    this.drawLabels(ctx, labelAlpha);

    this.svg.setAttribute('viewBox', `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`);
    this.svg.setAttribute('width', width.toFixed(2));
    this.svg.setAttribute('height', height.toFixed(2));
    return { width, height, scrollLeft };
  }

  // ── Primitive builders ────────────────────────────────────────────────

  private helixPrims(ctx: FrameCtx, el: ModelElement): void {
    const { pose, cam, proj, scale, sigma, eW, pxA, prims } = ctx;
    const st = this.model.scene.style;
    const g0 = el.g0;
    const g1 = el.g1;
    if (g1 - g0 < 1) return;
    const rA = lerp(st.halfWidthPx / pxA, this.options.helixRadius, eW);
    const idx = this.downsample(ctx, g0, g1, lerp(0.5, 1.0, ctx.eW));
    const m = idx.length;

    // Silhouette frame per kept point: screen centre, perpendicular, radius.
    const sx = new Float64Array(m);
    const sy = new Float64Array(m);
    const ppx = new Float64Array(m);
    const ppy = new Float64Array(m);
    const rs = new Float64Array(m);
    const dep = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      const g = idx[i];
      const a = Math.max(g0, g - 1);
      const b = Math.min(g1, g + 1);
      let tx = proj[b * 4] - proj[a * 4];
      let ty = proj[b * 4 + 1] - proj[a * 4 + 1];
      const tl = Math.hypot(tx, ty);
      if (tl > 1e-9) {
        tx /= tl;
        ty /= tl;
      } else {
        tx = 1;
        ty = 0;
      }
      sx[i] = proj[g * 4];
      sy[i] = proj[g * 4 + 1];
      ppx[i] = -ty;
      ppy[i] = tx;
      rs[i] = rA * scale * proj[g * 4 + 3];
      dep[i] = proj[g * 4 + 2];
    }

    // Shading bands at each kept point: the brightest line sits where the
    // surface normal best faces the light.
    const nb = BAND_HALF.length;
    const fLo = new Float64Array(m * nb);
    const fHi = new Float64Array(m * nb);
    const strength = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      const a = ppx[i] * LIGHT[0] - ppy[i] * LIGHT[1];
      const b = -LIGHT[2];
      strength[i] = Math.hypot(a, b);
      const phi = Math.atan2(a, b);
      for (let j = 0; j < nb; j++) {
        const lo = Math.max(-Math.PI / 2, phi - BAND_HALF[j]);
        const hi = Math.min(Math.PI / 2, phi + BAND_HALF[j]);
        fLo[i * nb + j] = Math.sin(lo);
        fHi[i * nb + j] = Math.sin(Math.max(lo, hi));
      }
    }
    const base = this.colours.helix;
    const edge = hexRgb(this.colours.helixEdge);

    for (let i = 0; i < m - 1; i++) {
      const depth = (dep[i] + dep[i + 1]) / 2;
      const fog = ctx.fogAt(depth);
      const s = (strength[i] + strength[i + 1]) / 2;
      const bands: { pts: number[]; c: RGB }[] = [];
      // Flat (2-D) shading needs only the silhouette band; stacking identical
      // bands would darken the anti-aliased edge.
      const bandCount = sigma > 1e-6 ? nb : 1;
      for (let j = 0; j < bandCount; j++) {
        const intensity = AMBIENT + DIFFUSE * s * BAND_LEVEL[j];
        const c = shade(base, intensity, BAND_SPEC[j], sigma, fog);
        const pts = [
          sx[i] + fLo[i * nb + j] * rs[i] * ppx[i],
          sy[i] + fLo[i * nb + j] * rs[i] * ppy[i],
          sx[i] + fHi[i * nb + j] * rs[i] * ppx[i],
          sy[i] + fHi[i * nb + j] * rs[i] * ppy[i],
          sx[i + 1] + fLo[(i + 1) * nb + j] * rs[i + 1] * ppx[i + 1],
          sy[i + 1] + fLo[(i + 1) * nb + j] * rs[i + 1] * ppy[i + 1],
          sx[i + 1] + fHi[(i + 1) * nb + j] * rs[i + 1] * ppx[i + 1],
          sy[i + 1] + fHi[(i + 1) * nb + j] * rs[i + 1] * ppy[i + 1],
        ];
        bands.push({ pts, c });
      }
      const left = [
        sx[i] + rs[i] * ppx[i],
        sy[i] + rs[i] * ppy[i],
        sx[i + 1] + rs[i + 1] * ppx[i + 1],
        sy[i + 1] + rs[i + 1] * ppy[i + 1],
      ];
      const right = [
        sx[i] - rs[i] * ppx[i],
        sy[i] - rs[i] * ppy[i],
        sx[i + 1] - rs[i + 1] * ppx[i + 1],
        sy[i + 1] - rs[i + 1] * ppy[i + 1],
      ];
      const xs = [left[0], left[2], right[0], right[2]];
      const ys = [left[1], left[3], right[1], right[3]];
      const edgeC = shadeEdge(edge, sigma, fog);
      prims.push({
        id: el.id,
        order: el.order,
        sub: i + 1,
        depth,
        zc: (pose.w[idx[i] * 4 + 2] + pose.w[idx[i + 1] * 4 + 2]) / 2,
        rank: 0,
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: [left[0], left[1], left[2], left[3], right[2], right[3], right[0], right[1]],
        pad: 0.75,
        emit: (run) => {
          for (let j = 0; j < bands.length; j++) run.strip(BAND_SPECS[j], bands[j].pts, bands[j].c);
          run.stroke(SILHOUETTE, left, edgeC, 1.5);
          run.stroke(SILHOUETTE_R, right, edgeC, 1.5);
        },
      });
    }

    // End caps.
    for (const end of [0, m - 1]) {
      const g = idx[end];
      const gIn = idx[end === 0 ? Math.min(m - 1, 1) : Math.max(0, m - 2)];
      const ox = pose.w[g * 4] - pose.w[gIn * 4];
      const oy = pose.w[g * 4 + 1] - pose.w[gIn * 4 + 1];
      const oz = pose.w[g * 4 + 2] - pose.w[gIn * 4 + 2];
      const ol = Math.hypot(ox, oy, oz) || 1;
      cam.toEye(pose.w[g * 4], pose.w[g * 4 + 1], pose.w[g * 4 + 2], this.tmp);
      const facing = (ox * this.tmp[0] + oy * this.tmp[1] + oz * this.tmp[2]) / ol;
      // Outward axis direction on screen.
      let qx = sx[end] - sx[end === 0 ? Math.min(m - 1, 1) : Math.max(0, m - 2)];
      let qy = sy[end] - sy[end === 0 ? Math.min(m - 1, 1) : Math.max(0, m - 2)];
      const ql = Math.hypot(qx, qy);
      if (ql > 1e-9) {
        qx /= ql;
        qy /= ql;
      } else {
        qx = ppy[end];
        qy = -ppx[end];
      }
      const minor = rs[end] * Math.abs(facing);
      const ring: number[] = [];
      const arc: number[] = [];
      for (let a = 0; a <= 24; a++) {
        const th = (a / 24) * 2 * Math.PI;
        const x = sx[end] + Math.cos(th) * rs[end] * ppx[end] + Math.sin(th) * minor * qx;
        const y = sy[end] + Math.cos(th) * rs[end] * ppy[end] + Math.sin(th) * minor * qy;
        if (a < 24) ring.push(x, y);
        if (a <= 12) arc.push(x, y);
      }
      ring.push(ring[0], ring[1]);
      const near = facing >= -1e-6;
      const fog = ctx.fogAt(dep[end]);
      // Cap normal = outward axis; light it in camera space.
      cam.toCam(ox / ol, oy / ol, oz / ol, this.tmp, 4);
      const lam = Math.max(
        0,
        this.tmp[4] * LIGHT[0] + this.tmp[5] * LIGHT[1] + this.tmp[6] * LIGHT[2],
      );
      const capC = shade(base, AMBIENT + DIFFUSE * lam, 0, sigma, fog);
      const sideC = shade(base, AMBIENT + DIFFUSE * 0.05, 0, sigma, fog);
      const edgeC = shadeEdge(edge, sigma, fog);
      const xs = ring.filter((_, k) => k % 2 === 0);
      const ys = ring.filter((_, k) => k % 2 === 1);
      prims.push({
        id: el.id,
        order: el.order,
        sub: near ? 1e6 + end : -1 - end,
        depth: dep[end] + (near ? -1e-3 : 1e-3),
        zc: pose.w[g * 4 + 2],
        rank: 0,
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: ring,
        pad: 0.75,
        emit: (run) => {
          if (near) {
            run.fill({ layer: 3, key: 'cap', kind: 'fill' }, ring, capC);
            run.stroke(
              { layer: 4, key: `cap-edge${end}`, kind: 'stroke', linecap: 'round' },
              ring,
              edgeC,
              1.5,
            );
          } else {
            run.fill({ layer: 0, key: 'cap-back', kind: 'fill' }, ring, sideC);
            run.stroke(
              { layer: 2, key: `cap-arc${end}`, kind: 'stroke', linecap: 'round' },
              arc,
              edgeC,
              1.5,
            );
          }
        },
      });
    }
  }

  private strandPrims(ctx: FrameCtx, el: ModelElement): void {
    const { pose, cam, sigma, eW, pxA, prims } = ctx;
    const st = this.model.scene.style;
    const opt = this.options;
    const g0 = el.g0;
    const g1 = el.g1;
    if (g1 - g0 < 1) return;

    // Outline in curtain coordinates, exactly as the 2-D renderer computes it.
    const pts: OutlinePoint[] = [];
    for (let g = g0; g <= g1; g++) pts.push({ sx: pose.u[g] * pxA, sy: -pose.z[g] * pxA });
    const withArrow = el.withArrow || eW > 0;
    const sections = ssOutline(pts, withArrow, {
      halfWidth: lerp(st.halfWidthPx, (opt.strandWidth / 2) * pxA, eW),
      arrowHalfWidth: lerp(
        el.withArrow ? st.arrowHalfWidthPx : st.halfWidthPx,
        (opt.arrowWidth / 2) * pxA,
        eW,
      ),
      arrowLength: lerp(el.withArrow ? st.arrowLengthPx : 0, opt.arrowLength * pxA, eW),
    });
    if (sections.length < 2) return;
    const kept = this.keepSections(sections, pts, lerp(0.5, 1.3, eW) * pxA);

    // 3-D cross-sections: centre, width vector, normal; projected corners.
    const m = kept.length;
    const C = new Float64Array(m * 3);
    const W = new Float64Array(m * 3);
    const N = new Float64Array(m * 3);
    const corners = new Float64Array(m * 16); // TL, TR, BL, BR × (x, y, depth, k)
    const hT = opt.strandThickness / 2;
    const tmp = this.tmp;
    for (let i = 0; i < m; i++) {
      const s = kept[i];
      const fi = g0 + s.fi;
      const ga = Math.min(g1, Math.floor(fi));
      const gb = Math.min(g1, ga + 1);
      const f = fi - ga;
      for (let k = 0; k < 3; k++) C[i * 3 + k] = lerp(pose.w[ga * 4 + k], pose.w[gb * 4 + k], f);
      const h = lerp(pose.w[ga * 4 + 3], pose.w[gb * 4 + 3], f);
      const ch = Math.cos(h);
      const sh = Math.sin(h);
      const hwA = s.hw / pxA;
      // Curtain-plane perpendicular: (pu, pz) = (px, −py) in curtain coords.
      W[i * 3] = hwA * s.px * ch;
      W[i * 3 + 1] = hwA * s.px * sh;
      W[i * 3 + 2] = hwA * -s.py;
      N[i * 3] = sh;
      N[i * 3 + 1] = -ch;
      N[i * 3 + 2] = 0;
      for (let c = 0; c < 4; c++) {
        const ws = c === 0 || c === 2 ? 1 : -1;
        const ns = c < 2 ? 1 : -1;
        cam.project(
          C[i * 3] + ws * W[i * 3] + ns * hT * N[i * 3],
          C[i * 3 + 1] + ws * W[i * 3 + 1] + ns * hT * N[i * 3 + 1],
          C[i * 3 + 2] + ws * W[i * 3 + 2] + ns * hT * N[i * 3 + 2],
          corners,
          i * 16 + c * 4,
        );
      }
    }
    const base = this.colours.strand;
    const edge = hexRgb(this.colours.strandEdge);
    const P = (i: number, c: number): [number, number] => [
      corners[i * 16 + c * 4],
      corners[i * 16 + c * 4 + 1],
    ];

    // Interior reference for a degenerate (zero-length) section: the next
    // distinct centre, so the shoulder walls of an arrowhead face backwards.
    const distinct = (i: number): number => {
      for (let j = i + 1; j < m; j++) {
        const d = Math.hypot(
          C[j * 3] - C[i * 3],
          C[j * 3 + 1] - C[i * 3 + 1],
          C[j * 3 + 2] - C[i * 3 + 2],
        );
        if (d > 1e-6) return j;
      }
      return -1;
    };

    for (let i = 0; i < m - 1; i++) {
      const j = i + 1;
      const mx = (C[i * 3] + C[j * 3]) / 2;
      const my = (C[i * 3 + 1] + C[j * 3 + 1]) / 2;
      const mz = (C[i * 3 + 2] + C[j * 3 + 2]) / 2;
      cam.toEye(mx, my, mz, tmp);
      const ex = tmp[0];
      const ey = tmp[1];
      const ez = tmp[2];
      const nx = N[i * 3] + N[j * 3];
      const ny = N[i * 3 + 1] + N[j * 3 + 1];
      const nz = N[i * 3 + 2] + N[j * 3 + 2];
      const nl = Math.hypot(nx, ny, nz) || 1;
      const vN = (nx * ex + ny * ey + nz * ez) / nl;
      const EPS = 1e-4;
      const visTop = vN > EPS;
      const visBot = vN < -EPS;

      // Side walls: outward normal = edge × N, oriented away from the inside.
      const ref =
        Math.hypot(C[j * 3] - C[i * 3], C[j * 3 + 1] - C[i * 3 + 1], C[j * 3 + 2] - C[i * 3 + 2]) >
        1e-6
          ? -1
          : distinct(i);
      const wallVis = (side: 1 | -1): boolean => {
        const ax = C[i * 3] + side * W[i * 3];
        const ay = C[i * 3 + 1] + side * W[i * 3 + 1];
        const az = C[i * 3 + 2] + side * W[i * 3 + 2];
        const bx = C[j * 3] + side * W[j * 3];
        const by = C[j * 3 + 1] + side * W[j * 3 + 1];
        const bz = C[j * 3 + 2] + side * W[j * 3 + 2];
        const qx = bx - ax;
        const qy = by - ay;
        const qz = bz - az;
        let wx = qy * nz - qz * ny;
        let wy = qz * nx - qx * nz;
        let wz = qx * ny - qy * nx;
        const wl = Math.hypot(wx, wy, wz);
        if (wl < 1e-9) return false;
        wx /= wl;
        wy /= wl;
        wz /= wl;
        const cxw = (ax + bx) / 2;
        const cyw = (ay + by) / 2;
        const czw = (az + bz) / 2;
        const rx = ref < 0 ? mx : C[ref * 3];
        const ry = ref < 0 ? my : C[ref * 3 + 1];
        const rz = ref < 0 ? mz : C[ref * 3 + 2];
        if ((cxw - rx) * wx + (cyw - ry) * wy + (czw - rz) * wz < 0) {
          wx = -wx;
          wy = -wy;
          wz = -wz;
        }
        return wx * ex + wy * ey + wz * ez > EPS;
      };
      const visL = wallVis(1);
      const visR = wallVis(-1);

      // Start wall (first section only): faces back along the strand.
      let visStart = false;
      if (i === 0) {
        const k = distinct(0);
        if (k > 0) {
          const ax = C[0] - C[k * 3];
          const ay = C[1] - C[k * 3 + 1];
          const az = C[2] - C[k * 3 + 2];
          const al = Math.hypot(ax, ay, az) || 1;
          visStart = (ax * ex + ay * ey + az * ez) / al > EPS;
        }
      }

      const depth = (corners[i * 16 + 2] + corners[j * 16 + 2]) / 2;
      const fog = ctx.fogAt(depth);
      // Two-sided Lambert on the ribbon face.
      cam.toCam(nx / nl, ny / nl, nz / nl, tmp, 4);
      const sgn = vN >= 0 ? 1 : -1;
      const nc0 = tmp[4] * sgn;
      const nc1 = tmp[5] * sgn;
      const nc2 = tmp[6] * sgn;
      const lam = Math.max(0, nc0 * LIGHT[0] + nc1 * LIGHT[1] + nc2 * LIGHT[2]);
      const spec = Math.pow(Math.max(0, nc0 * HALF[0] + nc1 * HALF[1] + nc2 * HALF[2]), 30) * 0.3;
      const faceC = shade(base, AMBIENT + DIFFUSE * lam, spec, sigma, fog);
      const sideC = shade(base, AMBIENT * 0.82, 0, sigma, fog);
      const edgeC = shadeEdge(edge, sigma, fog);

      const TL0 = P(i, 0),
        TR0 = P(i, 1),
        BL0 = P(i, 2),
        BR0 = P(i, 3);
      const TL1 = P(j, 0),
        TR1 = P(j, 1),
        BL1 = P(j, 2),
        BR1 = P(j, 3);
      // Quads as (start-left, start-right, end-left, end-right).
      const faces: { spec: OpSpec; q: number[]; c: RGB }[] = [];
      if (visTop) faces.push({ spec: FACE_TOP, q: [...TL0, ...TR0, ...TL1, ...TR1], c: faceC });
      if (visBot) faces.push({ spec: FACE_BOT, q: [...BL0, ...BR0, ...BL1, ...BR1], c: faceC });
      if (visL) faces.push({ spec: SIDE_L, q: [...TL0, ...BL0, ...TL1, ...BL1], c: sideC });
      if (visR) faces.push({ spec: SIDE_R, q: [...TR0, ...BR0, ...TR1, ...BR1], c: sideC });
      const startWall = visStart ? [...TL0, ...TR0, ...BR0, ...BL0] : null;
      const edges: { spec: OpSpec; pts: number[] }[] = [];
      if (visTop !== visL) edges.push({ spec: EDGE_TL, pts: [...TL0, ...TL1] });
      if (visTop !== visR) edges.push({ spec: EDGE_TR, pts: [...TR0, ...TR1] });
      if (visBot !== visL) edges.push({ spec: EDGE_BL, pts: [...BL0, ...BL1] });
      if (visBot !== visR) edges.push({ spec: EDGE_BR, pts: [...BR0, ...BR1] });
      if (i === 0) {
        if (visStart !== visTop) edges.push({ spec: EDGE_X, pts: [...TL0, ...TR0] });
        if (visStart !== visBot) edges.push({ spec: EDGE_X, pts: [...BL0, ...BR0] });
        if (visStart !== visL) edges.push({ spec: EDGE_X, pts: [...TL0, ...BL0] });
        if (visStart !== visR) edges.push({ spec: EDGE_X, pts: [...TR0, ...BR0] });
      }
      const xs = [TL0[0], TR0[0], BL0[0], BR0[0], TL1[0], TR1[0], BL1[0], BR1[0]];
      const ys = [TL0[1], TR0[1], BL0[1], BR0[1], TL1[1], TR1[1], BL1[1], BR1[1]];
      const midX = (xs[0] + xs[1] + xs[4] + xs[5]) / 4;
      const midY = (ys[0] + ys[1] + ys[4] + ys[5]) / 4;
      prims.push({
        id: el.id,
        order: el.order,
        sub: i,
        depth,
        zc: mz,
        rank: 0,
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: [...TL0, ...TR0, ...BL0, ...BR0, ...TL1, ...TR1, ...BL1, ...BR1],
        pad: 0.75,
        emit: (run) => {
          for (const f of faces) {
            run.strip(f.spec, f.q, f.c);
            if (f.spec.kind === 'gradient') run.gradientStop(f.spec, midX, midY, f.c);
          }
          if (startWall) run.fill(SIDE_START, startWall, sideC);
          for (const e of edges) run.stroke(e.spec, e.pts, edgeC, 1.5);
        },
      });
    }
  }

  private loopPrims(ctx: FrameCtx, loop: ModelLoop): void {
    const { model, pose, cam, scale, sigma, eW, eLoop, prims } = ctx;
    const { ud, zd } = model;
    // Fine sampling near t = 0 keeps the curve faithful to the 2-D Bézier;
    // coarser in 3-D where the tube is smooth anyway.
    const spacing = lerp(0.35, 0.7, eW);
    const count = Math.max(12, Math.min(900, Math.ceil(loop.length / spacing))) + 1;
    const dAu = loop.fromG >= 0 ? pose.u[loop.fromG] - ud[loop.fromG] : NaN;
    const dAz = loop.fromG >= 0 ? pose.z[loop.fromG] - zd[loop.fromG] : NaN;
    const dBu = loop.toG >= 0 ? pose.u[loop.toG] - ud[loop.toG] : NaN;
    const dBz = loop.toG >= 0 ? pose.z[loop.toG] - zd[loop.toG] : NaN;
    const aU = Number.isNaN(dAu) ? (Number.isNaN(dBu) ? 0 : dBu) : dAu;
    const aZ = Number.isNaN(dAz) ? (Number.isNaN(dBz) ? 0 : dBz) : dAz;
    const bU = Number.isNaN(dBu) ? aU : dBu;
    const bZ = Number.isNaN(dBz) ? aZ : dBz;

    const sx = new Float64Array(count);
    const sy = new Float64Array(count);
    const sd = new Float64Array(count);
    const sk = new Float64Array(count);
    const wz = new Float64Array(count);
    let js = 0;
    let jr = 0;
    const { syn, synS, real, realS } = loop;
    const nSyn = synS.length;
    const nReal = realS.length;
    for (let c = 0; c < count; c++) {
      const s = c / (count - 1);
      while (js < nSyn - 2 && synS[js + 1] < s) js++;
      const fsd = synS[js + 1] - synS[js];
      const fs = nSyn > 1 && fsd > 1e-12 ? clamp01((s - synS[js]) / fsd) : 0;
      const su = nSyn > 1 ? lerp(syn[js * 2], syn[js * 2 + 2], fs) : syn[0];
      const sz = nSyn > 1 ? lerp(syn[js * 2 + 1], syn[js * 2 + 3], fs) : syn[1];
      while (jr < nReal - 2 && realS[jr + 1] < s) jr++;
      const frd = nReal > 1 ? realS[jr + 1] - realS[jr] : 0;
      const fr = frd > 1e-12 ? clamp01((s - realS[jr]) / frd) : 0;
      const ra = real[jr];
      const rb = real[Math.min(nReal - 1, jr + 1)];
      const ru = lerp(pose.u[ra], pose.u[rb], fr);
      const rz = lerp(pose.z[ra], pose.z[rb], fr);
      const rn = lerp(pose.n[ra], pose.n[rb], fr);
      const rbb = lerp(pose.b[ra], pose.b[rb], fr);
      const cu = lerp(su + lerp(aU, bU, s), ru, eLoop);
      const cz = lerp(sz + lerp(aZ, bZ, s), rz, eLoop);
      pose.curtain.place(cu, cz, rn * eLoop, rbb * eLoop, this.tmp);
      wz[c] = this.tmp[2];
      cam.project(this.tmp[0], this.tmp[1], this.tmp[2], this.tmp, 4);
      sx[c] = this.tmp[4];
      sy[c] = this.tmp[5];
      sd[c] = this.tmp[6];
      sk[c] = this.tmp[7];
    }
    const coil = this.colours.coil;
    const dash = loop.discontinuous ? '3 5' : undefined;
    const coreSpec: OpSpec = { layer: 2, key: 'tube', kind: 'stroke', linecap: 'round', dash };
    const outSpec: OpSpec = { layer: 1, key: 'tube-o', kind: 'stroke', linecap: 'round', dash };
    // Depth-sorted pieces of about 1.2 Å.
    const STEP = Math.max(1, Math.round(((count - 1) * 1.2) / Math.max(loop.length, 1e-6)));
    for (let c = 0; c < count - 1; c += STEP) {
      const e = Math.min(count - 1, c + STEP);
      const pts: number[] = [];
      let dSum = 0;
      let kSum = 0;
      let zSum = 0;
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (let q = c; q <= e; q++) {
        pts.push(sx[q], sy[q]);
        dSum += sd[q];
        kSum += sk[q];
        zSum += wz[q];
        x0 = Math.min(x0, sx[q]);
        y0 = Math.min(y0, sy[q]);
        x1 = Math.max(x1, sx[q]);
        y1 = Math.max(y1, sy[q]);
      }
      const cnt = e - c + 1;
      const depth = dSum / cnt;
      const fog = ctx.fogAt(depth);
      const core = lerp(1.8, 2 * this.options.coilRadius * scale * (kSum / cnt), eW);
      const outer = core + 1.8 * sigma;
      const coreC = fogged(mixRgb(coil, [150, 150, 150], sigma), fog);
      const outC = fogged(mixRgb(coil, [52, 52, 52], sigma), fog);
      const pad = outer / 2 + 1;
      prims.push({
        id: loop.id,
        order: loop.order,
        sub: c,
        depth,
        zc: zSum / cnt,
        rank: 0,
        x0: x0 - pad,
        y0: y0 - pad,
        x1: x1 + pad,
        y1: y1 + pad,
        faded: loop.faded,
        pts: pts,
        pad: outer / 2,
        emit: (run) => {
          if (sigma > 0) run.stroke(outSpec, pts, outC, outer, sigma);
          run.stroke(coreSpec, pts, coreC, core);
        },
      });
    }
  }

  private tiePrims(ctx: FrameCtx, alpha: number): void {
    const { model, pose, cam, prims } = ctx;
    const contact = hexRgb(model.scene.style.contact);
    const spec: OpSpec = { layer: 0, key: 'tie', kind: 'stroke' };
    for (const tie of model.ties) {
      const ends: number[] = [];
      let depth = 0;
      for (const [g, z0] of [
        [tie.a, tie.az],
        [tie.b, tie.bz],
      ]) {
        const z = lerp(z0, pose.w[g * 4 + 2], pose.t[g]);
        cam.project(pose.w[g * 4], pose.w[g * 4 + 1], z, this.tmp);
        ends.push(this.tmp[0], this.tmp[1]);
        depth += this.tmp[2] / 2;
      }
      prims.push({
        id: -100,
        order: -1,
        sub: 0,
        depth,
        zc: 0,
        rank: 0,
        x0: Math.min(ends[0], ends[2]) - 1,
        y0: Math.min(ends[1], ends[3]) - 1,
        x1: Math.max(ends[0], ends[2]) + 1,
        y1: Math.max(ends[1], ends[3]) + 1,
        faded: false,
        pts: ends,
        pad: 0.5,
        emit: (run) => run.stroke(spec, ends, contact, 1, alpha),
      });
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /** Sample indices in [g0, g1] at least `minStep` Å apart (display arc). */
  private downsample(ctx: FrameCtx, g0: number, g1: number, minStep: number): number[] {
    const { pose } = ctx;
    const out = [g0];
    let last = g0;
    for (let g = g0 + 1; g < g1; g++) {
      if (Math.hypot(pose.u[g] - pose.u[last], pose.z[g] - pose.z[last]) >= minStep) {
        out.push(g);
        last = g;
      }
    }
    out.push(g1);
    return out;
  }

  /** Drop body sections closer than `minStep` (outline units); keep arrow sections. */
  private keepSections(
    sections: OutlineSection[],
    pts: OutlinePoint[],
    minStep: number,
  ): OutlineSection[] {
    const out: OutlineSection[] = [];
    let lastFi = -Infinity;
    const isBody = (s: OutlineSection, k: number): boolean =>
      Number.isInteger(s.fi) && k + 1 < sections.length && sections[k + 1].fi !== s.fi && s.hw > 0;
    for (let k = 0; k < sections.length; k++) {
      const s = sections[k];
      const nextIsArrow = k + 1 < sections.length && !isBody(sections[k + 1], k + 1);
      if (k === 0 || !isBody(s, k) || nextIsArrow || k === sections.length - 1) {
        out.push(s);
        lastFi = s.fi;
        continue;
      }
      const a = pts[Math.round(lastFi)];
      const b = pts[s.fi];
      if (a && Math.hypot(b.sx - a.sx, b.sy - a.sy) >= minStep) {
        out.push(s);
        lastFi = s.fi;
      }
    }
    return out;
  }

  private drawBackRim(
    cam: Camera,
    cxw: number,
    cyw: number,
    r: number,
    half: number,
    sigma: number,
  ): void {
    const st = this.model.scene.style;
    // Angle (about the disc centre) of the eye, and the half-angle to the
    // silhouette tangents; the far arc lies between them, round the back.
    let ex: number;
    let ey: number;
    let beta = Math.PI / 2;
    if (Number.isFinite(cam.dist)) {
      ex = cam.eye[0] - cxw;
      ey = cam.eye[1] - cyw;
      const d = Math.hypot(ex, ey);
      if (d > r) beta = Math.acos(r / d);
    } else {
      ex = -cam.v[0];
      ey = -cam.v[1];
    }
    if (Math.hypot(ex, ey) < 1e-9) {
      ex = 0;
      ey = -1;
    }
    const dirE = Math.atan2(ey, ex);
    const a0 = dirE + beta;
    const a1 = dirE + 2 * Math.PI - beta;
    const N = 48;
    const top: number[] = [];
    const bot: number[] = [];
    const midPts: number[] = [];
    for (let i = 0; i <= N; i++) {
      const a = a0 + ((a1 - a0) * i) / N;
      const x = cxw + r * Math.cos(a);
      const y = cyw + r * Math.sin(a);
      cam.project(x, y, half, this.tmp);
      top.push(this.tmp[0], this.tmp[1]);
      cam.project(x, y, -half, this.tmp);
      bot.push(this.tmp[0], this.tmp[1]);
      // Midplane runs the other way round, so at t = 0 its dashes start at
      // the left end like the 2-D line.
      const am = a1 - ((a1 - a0) * i) / N;
      cam.project(cxw + r * Math.cos(am), cyw + r * Math.sin(am), 0, this.tmp);
      midPts.push(this.tmp[0], this.tmp[1]);
    }
    let d = `M${top[0].toFixed(2)},${top[1].toFixed(2)}`;
    for (let i = 2; i < top.length; i += 2) d += `L${top[i].toFixed(2)},${top[i + 1].toFixed(2)}`;
    for (let i = bot.length - 2; i >= 0; i -= 2)
      d += `L${bot[i].toFixed(2)},${bot[i + 1].toFixed(2)}`;
    d += 'Z';
    const rim = this.back.rim;
    rim.set('d', d);
    rim.set('fill', st.membraneFill);
    rim.set('fill-opacity', (0.55 - 0.15 * sigma).toFixed(3));
    rim.set('stroke', st.membraneEdge);
    rim.set('stroke-width', '1');
    rim.set('stroke-linejoin', 'round');
    let md = `M${midPts[0].toFixed(2)},${midPts[1].toFixed(2)}`;
    for (let i = 2; i < midPts.length; i += 2)
      md += `L${midPts[i].toFixed(2)},${midPts[i + 1].toFixed(2)}`;
    const mid = this.back.mid;
    mid.set('d', md);
    mid.set('fill', 'none');
    mid.set('stroke', st.midplane);
    mid.set('stroke-width', '1');
    mid.set('stroke-dasharray', '4 4');
  }

  private mergeRuns(prims: Prim[], width: number, height: number): Run[] {
    // A primitive joins its element's latest run only if nothing drawn since
    // that run started overlaps it on screen — merged runs then never break
    // the back-to-front order where it matters. A coarse grid finds the
    // candidates; convex footprints decide.
    const CELL = 32;
    const cols = Math.max(1, Math.ceil(width / CELL) + 2);
    const rows = Math.max(1, Math.ceil(height / CELL) + 2);
    const cells: Prim[][] = Array.from({ length: cols * rows }, () => []);
    /** Newest run index touching each cell, for a cheap early accept. */
    const newest = new Int32Array(cols * rows).fill(-1);
    const stamp = new Map<Prim, number>();
    let visit = 0;
    const open = new Map<number, number>();
    const runs: Run[] = [];
    for (const p of prims) {
      const c0 = Math.max(0, Math.min(cols - 1, Math.floor(p.x0 / CELL) + 1));
      const c1 = Math.max(0, Math.min(cols - 1, Math.floor(p.x1 / CELL) + 1));
      const r0 = Math.max(0, Math.min(rows - 1, Math.floor(p.y0 / CELL) + 1));
      const r1 = Math.max(0, Math.min(rows - 1, Math.floor(p.y1 / CELL) + 1));
      let ri = open.get(p.id);
      if (ri !== undefined) {
        let blocked = false;
        visit++;
        for (let r = r0; r <= r1 && !blocked; r++) {
          for (let c = c0; c <= c1 && !blocked; c++) {
            const cell = r * cols + c;
            if (newest[cell] <= ri) continue;
            for (const q of cells[cell]) {
              if ((q.run ?? -1) <= ri || stamp.get(q) === visit) continue;
              stamp.set(q, visit);
              const margin = (p.pad ?? 0) + (q.pad ?? 0) + 1;
              if (
                p.x1 + margin < q.x0 ||
                q.x1 + margin < p.x0 ||
                p.y1 + margin < q.y0 ||
                q.y1 + margin < p.y0
              ) {
                continue;
              }
              const hp = hullOf(p);
              const hq = hullOf(q);
              if (!hp || !hq || !separated(hp, hq, margin)) {
                blocked = true;
                break;
              }
            }
          }
        }
        if (blocked) ri = undefined;
      }
      if (ri === undefined) {
        ri = runs.length;
        runs.push(new Run(p.id, p.faded));
        open.set(p.id, ri);
      }
      p.run = ri;
      p.emit(runs[ri]);
      for (let r = r0; r <= r1; r++) {
        for (let c = c0; c <= c1; c++) {
          const cell = r * cols + c;
          cells[cell].push(p);
          if (newest[cell] < ri) newest[cell] = ri;
        }
      }
    }
    return runs;
  }

  private emitRuns(runs: Run[]): void {
    const fadedOpacity = this.model.scene.style.fadedOpacity;
    let gi = 0;
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      let slot = this.slots[i];
      if (!slot) {
        const g = document.createElementNS(SVG_NS, 'g');
        this.runsG.appendChild(g);
        slot = { g: new Pooled(g), paths: [] };
        this.slots.push(slot);
      }
      slot.g.set('display', null);
      slot.g.set('opacity', run.faded ? String(fadedOpacity) : null);
      const ops = run.sortedOps();
      for (let j = 0; j < ops.length; j++) {
        const op = ops[j];
        let path = slot.paths[j];
        if (!path) {
          const el = document.createElementNS(SVG_NS, 'path');
          slot.g.el.appendChild(el);
          path = new Pooled(el);
          slot.paths.push(path);
        }
        path.set('display', null);
        path.set('d', op.d.join(''));
        const n = Math.max(1, op.rgb[3]);
        const avg: RGB = [op.rgb[0] / n, op.rgb[1] / n, op.rgb[2] / n];
        const alpha = op.opacity[1] > 0 ? op.opacity[0] / op.opacity[1] : 1;
        if (op.spec.kind === 'stroke') {
          path.set('fill', 'none');
          path.set('stroke', rgbStr(avg));
          path.set('stroke-width', (op.width[0] / Math.max(1, op.width[1])).toFixed(2));
          path.set('stroke-linecap', op.spec.linecap ?? 'round');
          path.set('stroke-linejoin', 'round');
          path.set('stroke-dasharray', op.spec.dash ?? null);
          path.set('fill-rule', null);
          path.set('opacity', alpha < 0.999 ? alpha.toFixed(3) : null);
        } else {
          path.set('stroke', null);
          path.set('stroke-width', null);
          path.set('stroke-linecap', null);
          path.set('stroke-linejoin', null);
          path.set('stroke-dasharray', null);
          path.set('fill-rule', 'nonzero');
          path.set('opacity', alpha < 0.999 ? alpha.toFixed(3) : null);
          const grad = op.spec.kind === 'gradient' ? this.gradientFor(op, gi) : null;
          if (grad) {
            gi++;
            path.set('fill', grad);
          } else path.set('fill', rgbStr(avg));
        }
      }
      for (let j = ops.length; j < slot.paths.length; j++) slot.paths[j].set('display', 'none');
    }
    for (let i = runs.length; i < this.slots.length; i++) this.slots[i].g.set('display', 'none');
  }

  /** A linear gradient along a ribbon run, or null when a flat fill will do. */
  private gradientFor(op: Op, gi: number): string | null {
    const stops = op.stops;
    if (stops.length < 2) return null;
    const a = stops[0];
    const b = stops[stops.length - 1];
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const vl2 = vx * vx + vy * vy;
    let flat = true;
    for (const s of stops) {
      if (Math.abs(s.c[0] - a.c[0]) + Math.abs(s.c[1] - a.c[1]) + Math.abs(s.c[2] - a.c[2]) > 1.5) {
        flat = false;
        break;
      }
    }
    if (flat || vl2 < 4) return null;
    let slot = this.grads[gi];
    if (!slot) {
      const el = document.createElementNS(SVG_NS, 'linearGradient');
      el.setAttribute('id', `${this.idPrefix}-g${gi}`);
      el.setAttribute('gradientUnits', 'userSpaceOnUse');
      this.defs.appendChild(el);
      slot = { el: new Pooled(el), stops: [] };
      this.grads.push(slot);
    }
    slot.el.set('x1', a.x.toFixed(2));
    slot.el.set('y1', a.y.toFixed(2));
    slot.el.set('x2', b.x.toFixed(2));
    slot.el.set('y2', b.y.toFixed(2));
    const sorted = stops
      .map((s) => ({ o: clamp01(((s.x - a.x) * vx + (s.y - a.y) * vy) / vl2), c: s.c }))
      .sort((p, q) => p.o - q.o);
    for (let k = 0; k < sorted.length; k++) {
      let st = slot.stops[k];
      if (!st) {
        const el = document.createElementNS(SVG_NS, 'stop');
        slot.el.el.appendChild(el);
        st = new Pooled(el);
        slot.stops.push(st);
      }
      st.set('display', null);
      st.set('offset', sorted[k].o.toFixed(4));
      st.set('stop-color', rgbStr(sorted[k].c));
    }
    for (let k = sorted.length; k < slot.stops.length; k++) {
      // Surplus stops repeat the last colour at offset 1.
      slot.stops[k].set('offset', '1');
      slot.stops[k].set('stop-color', rgbStr(sorted[sorted.length - 1].c));
    }
    return `url(#${this.idPrefix}-g${gi})`;
  }

  private drawLabels(ctx: FrameCtx, alpha: number): void {
    const { model, proj } = ctx;
    const st = model.scene.style;
    const labels = model.labels;
    // Same translate as the 2-D label group, so the glyphs rasterise
    // identically on the first frame.
    const fr = model.scene.frame;
    const ox = fr.originX - fr.minX;
    const oy = fr.originY - fr.minY;
    this.labelsG.setAttribute('transform', `translate(${ox}, ${oy})`);
    for (let i = 0; i < labels.length; i++) {
      let t = this.texts[i];
      if (!t) {
        const el = document.createElementNS(SVG_NS, 'text');
        el.setAttribute('text-anchor', 'middle');
        el.setAttribute('dominant-baseline', 'central');
        el.setAttribute('font-size', String(st.labelFontSize));
        el.setAttribute('fill', st.labelFill);
        this.labelsG.appendChild(el);
        t = new Pooled(el);
        this.texts.push(t);
      }
      if (alpha <= 0.001) {
        t.set('display', 'none');
        continue;
      }
      const l = labels[i];
      const step = st.labelTangentStep;
      const a = l.isStart ? l.g : Math.max(l.segLo, l.g - step);
      const b = l.isStart ? Math.min(l.segHi, l.g + step) : l.g;
      const tdx = proj[b * 4] - proj[a * 4];
      const tdy = proj[b * 4 + 1] - proj[a * 4 + 1];
      const tlen = Math.hypot(tdx, tdy);
      if (a === b || tlen < 1e-9) {
        t.set('display', 'none');
        continue;
      }
      const sign = l.isStart ? -1 : 1;
      const outX = (sign * tdx) / tlen;
      const outY = (sign * tdy) / tlen;
      const w = l.text.length * st.labelFontSize * 0.6;
      const h = st.labelFontSize;
      const offset = Math.abs(outX) * (w / 2) + Math.abs(outY) * (h / 2) + st.labelGap;
      t.set('display', null);
      t.set('x', (proj[l.g * 4] + outX * offset - ox).toFixed(2));
      t.set('y', (proj[l.g * 4 + 1] + outY * offset - oy).toFixed(2));
      t.set('opacity', alpha < 0.999 ? alpha.toFixed(3) : null);
      if (t.el.textContent !== l.text) t.el.textContent = l.text;
    }
  }
}

interface FrameCtx {
  model: MorphModel;
  pose: Pose;
  cam: Camera;
  proj: Float64Array;
  scale: number;
  sigma: number;
  eW: number;
  eLoop: number;
  fogAt: (depth: number) => number;
  pxA: number;
  prims: Prim[];
}

const SILHOUETTE: OpSpec = { layer: 2, key: 'sil-l', kind: 'stroke', linecap: 'round' };
const SILHOUETTE_R: OpSpec = { layer: 2, key: 'sil-r', kind: 'stroke', linecap: 'round' };
const FACE_TOP: OpSpec = { layer: 1, key: 'face-t', kind: 'gradient' };
const FACE_BOT: OpSpec = { layer: 1, key: 'face-b', kind: 'gradient' };
const SIDE_L: OpSpec = { layer: 1, key: 'side-l', kind: 'fill' };
const SIDE_R: OpSpec = { layer: 1, key: 'side-r', kind: 'fill' };
const SIDE_START: OpSpec = { layer: 1, key: 'side-s', kind: 'fill' };
const BAND_SPECS: OpSpec[] = BAND_HALF.map((_, j) => ({ layer: 1, key: `band${j}`, kind: 'fill' }));
const EDGE_TL: OpSpec = { layer: 2, key: 'e-tl', kind: 'stroke', linecap: 'round' };
const EDGE_TR: OpSpec = { layer: 2, key: 'e-tr', kind: 'stroke', linecap: 'round' };
const EDGE_BL: OpSpec = { layer: 2, key: 'e-bl', kind: 'stroke', linecap: 'round' };
const EDGE_BR: OpSpec = { layer: 2, key: 'e-br', kind: 'stroke', linecap: 'round' };
const EDGE_X: OpSpec = { layer: 2, key: 'e-x', kind: 'stroke', linecap: 'round' };

/** Lit colour, blended in by `sigma` (0 = flat 2-D colour), then fogged. */
function shade(base: RGB, intensity: number, spec: number, sigma: number, fog: number): RGB {
  let lit: RGB = [base[0] * intensity, base[1] * intensity, base[2] * intensity];
  if (spec > 0) lit = mixRgb(lit, WHITE, spec);
  return fogged(mixRgb(base, lit, sigma), fog);
}

function shadeEdge(edge: RGB, sigma: number, fog: number): RGB {
  return fogged(mixRgb(edge, [edge[0] * 0.8, edge[1] * 0.8, edge[2] * 0.8], sigma), fog);
}

function fogged(c: RGB, fog: number): RGB {
  return fog > 0 ? mixRgb(c, WHITE, fog) : c;
}
