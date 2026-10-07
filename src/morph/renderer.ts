import { ssOutline, type OutlinePoint, type OutlineSection } from '../components/ss-outline.js';
import { Camera } from './camera.js';
import { computePose, type Pose, type Rigid } from './curtain.js';
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
  /**
   * Diagonal field of view of the finished 3-D view; 0 keeps the projection
   * parallel (isometric) throughout, 63.4° is a 35 mm-equivalent perspective.
   */
  fov: number;
  /**
   * Width of the rolling wave as a fraction of the chain: 0 rolls the whole
   * chain up at once; > 0 rolls from the N-terminal end to the C-terminal end.
   */
  sweep: number;
}

export { PROJECTIONS } from './projections.js';

export const DEFAULT_MORPH_OPTIONS: MorphOptions = {
  helixRadius: 2.3,
  strandWidth: 2.85,
  arrowWidth: 4.65,
  arrowLength: 5,
  strandThickness: 1.0,
  coilRadius: 0.42,
  // Isometric: parallel projection, looking down at atan(1/√2) ≈ 35.26°.
  elevation: Math.atan(1 / Math.SQRT2),
  fov: 0,
  sweep: 0.35,
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

/** Compact coordinate formatting to `scale` steps per px — much cheaper than toFixed. */
function fmt(v: number, scale: number): string {
  return String(Math.round(v * scale) / scale);
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

/** A drawable piece of the scene, depth-sorted as a unit. */
interface Prim {
  id: number;
  order: number;
  sub: number;
  depth: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  faded: boolean;
  /** Screen footprint points (flat x, y); absent = overlaps everything. */
  pts?: number[];
  /** Convex hull of `pts`, computed only when an overlap test needs it. */
  hull?: number[];
  /** Extra footprint margin (stroke half-width), px. */
  pad?: number;
  /**
   * Position along its element (Å) and the distance within which pieces of
   * the same element are expected to overlap on screen (neighbours along the
   * curve). Pieces further apart that overlap — an element crossing itself —
   * must not share a run, since a run draws all its fills before its lines.
   * Absent: the element cannot cross itself.
   */
  along?: number;
  reach?: number;
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

/** An explicit screen-space linear gradient (stops at offsets 0 … 1). */
interface GradientDef {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: { o: number; c: RGB }[];
  /** Representative colour, used when the gradient collapses to flat. */
  mean: RGB;
}

interface Op {
  spec: OpSpec;
  seq: number;
  /** Explicit gradient (cylinders); ribbons build theirs from `stops`. */
  grad?: GradientDef;
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
}

class Run {
  readonly ops = new Map<string, Op>();
  private seq = 0;
  constructor(
    readonly id: number,
    readonly faded: boolean,
    /** Overlap strip ends to hide seams (only safe for opaque runs). */
    private readonly extend = true,
    /** Coordinate precision, steps per px. */
    private readonly scale = 100,
  ) {}

  private f(v: number): string {
    return fmt(v, this.scale);
  }

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
      };
      this.ops.set(k, op);
    }
    return op;
  }

  fill(spec: OpSpec, pts: number[], c: RGB, opacity = 1): void {
    if (pts.length < 6) return;
    const op = this.op(spec);
    let d = 'M' + this.f(pts[0]) + ',' + this.f(pts[1]);
    for (let i = 2; i < pts.length; i += 2) d += 'L' + this.f(pts[i]) + ',' + this.f(pts[i + 1]);
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
    if (this.extend) {
      extendEnd(s.L, 0, 2);
      extendEnd(s.R, 0, 2);
      extendEnd(s.L, s.L.length - 2, s.L.length - 4);
      extendEnd(s.R, s.R.length - 2, s.R.length - 4);
    }
    let d = 'M' + this.f(s.L[0]) + ',' + this.f(s.L[1]);
    for (let i = 2; i < s.L.length; i += 2) d += 'L' + this.f(s.L[i]) + ',' + this.f(s.L[i + 1]);
    for (let i = s.R.length - 2; i >= 0; i -= 2)
      d += 'L' + this.f(s.R[i]) + ',' + this.f(s.R[i + 1]);
    op.d.push(d + 'Z');
    op.strip = null;
  }

  setGradient(spec: OpSpec, g: GradientDef): void {
    const op = this.op(spec);
    if (!op.grad) op.grad = g;
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
    let d = 'M' + this.f(line[0]) + ',' + this.f(line[1]);
    for (let i = 2; i < line.length; i += 2) d += 'L' + this.f(line[i]) + ',' + this.f(line[i + 1]);
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

/**
 * A gradient along a run of colour samples placed on screen: from the first
 * sample to the last, each placed by its projection onto that line.
 */
function gradientAlong(samples: { x: number; y: number; c: RGB }[]): GradientDef {
  const n = samples.length;
  const mean: RGB = [0, 0, 0];
  for (const s of samples) {
    mean[0] += s.c[0] / Math.max(1, n);
    mean[1] += s.c[1] / Math.max(1, n);
    mean[2] += s.c[2] / Math.max(1, n);
  }
  if (n < 2) {
    const s = samples[0] ?? { x: 0, y: 0, c: mean };
    return { x1: s.x, y1: s.y, x2: s.x, y2: s.y, stops: [{ o: 0, c: s.c }], mean };
  }
  const a = samples[0];
  const b = samples[n - 1];
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const vl2 = vx * vx + vy * vy || 1;
  const stops = samples
    .map((s) => ({ o: clamp01(((s.x - a.x) * vx + (s.y - a.y) * vy) / vl2), c: s.c }))
    .sort((p, q) => p.o - q.o);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stops, mean };
}

/** Dash pattern of discontinuous loops, as in 2-D: 3 px on, 5 px off. */
const DASH_ON = 3;
const DASH_PERIOD = 8;

/**
 * Cut a polyline section into its "on" dash pieces. `phases` gives each
 * point's position (px) along the dash pattern, `on` and `period` its on
 * length and period. With phases laid along the loop's 2-D length the dashes
 * match the 2-D figure at t = 0; laid along a view-independent length they
 * stay pinned to the curve as the view moves.
 */
function dashPieces(pts: number[], phases: number[], on: number, period: number): number[][] {
  const pieces: number[][] = [];
  let cur: number[] | null = null;
  const phaseAt = (q: number): number => phases[q];
  const n = pts.length / 2;
  for (let q = 0; q < n - 1; q++) {
    const u0 = phaseAt(q);
    const u1 = phaseAt(q + 1);
    // Breakpoints inside this segment, where the pattern switches on/off.
    const cuts = [u0];
    for (let k = Math.floor(u0 / period); k * period <= u1; k++) {
      for (const b of [k * period, k * period + on]) if (b > u0 && b < u1) cuts.push(b);
    }
    cuts.push(u1);
    for (let j = 0; j < cuts.length - 1; j++) {
      const a = (cuts[j] - u0) / (u1 - u0 || 1);
      const b = (cuts[j + 1] - u0) / (u1 - u0 || 1);
      const mid = (cuts[j] + cuts[j + 1]) / 2;
      const isOn = ((mid % period) + period) % period < on;
      const ax = lerp(pts[q * 2], pts[q * 2 + 2], a);
      const ay = lerp(pts[q * 2 + 1], pts[q * 2 + 3], a);
      const bx = lerp(pts[q * 2], pts[q * 2 + 2], b);
      const by = lerp(pts[q * 2 + 1], pts[q * 2 + 3], b);
      if (isOn) {
        if (!cur) {
          cur = [ax, ay];
          pieces.push(cur);
        }
        cur.push(bx, by);
      } else cur = null;
    }
  }
  return pieces;
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
  /**
   * Extra zoom-out (≤ 1) sampled at τ = 0, 0.1, … 1 so the half-rolled
   * protein stays in frame; the end framing alone only fits τ = 1.
   */
  zoomTrack: number[];
}

/** Samples either side used for a helix's on-screen axis direction in 3-D. */
const AXIS_BASELINE = 8;
/** A cylinder gradient group spans at most this turn on screen (cos 2.5°). */
const GROUP_COS = Math.cos((2.5 * Math.PI) / 180);
/** A strand face gradient spans at most this turn on screen (cos 10°). */
const STRAND_GROUP_COS = Math.cos((10 * Math.PI) / 180);

/** Depth snap (Å) used near t = 0 to preserve the 2-D drawing order. */
const DEPTH_SNAP = 0.05;

/** Number of intervals in the steadying track. */
const STEADY_STEPS = 80;

/** Number of intervals in the zoom track. */
const ZOOM_STEPS = 10;
/** Screen margin (px) the zoom track keeps clear. */
const ZOOM_MARGIN = 12;

/**
 * Renders the morph between the 2-D topology view (τ = 0) and a 3-D
 * Richardson-style diagram (τ = 1) as plain SVG, so the first frame is the
 * 2-D picture itself and every frame stays vector.
 */
export class MorphRenderer {
  readonly svg: SVGSVGElement;
  private readonly defs: SVGDefsElement;
  private readonly back: {
    rim: Pooled<SVGPathElement>;
    mid: Pooled<SVGPathElement>;
    /** Leaflet surfaces, far one first. */
    discs: [Pooled<SVGPathElement>, Pooled<SVGPathElement>];
  };
  private readonly runsG: SVGGElement;
  private readonly labelsG: SVGGElement;
  private readonly slots: RunSlot[] = [];
  private readonly grads: {
    el: Pooled<SVGLinearGradientElement>;
    stops: Pooled<SVGStopElement>[];
  }[] = [];
  private readonly texts: Pooled<SVGTextElement>[] = [];
  private framing: Framing | null = null;
  /**
   * Opacity of faded (neighbouring-chain) elements this frame. They start at
   * the 2-D figure's translucency and become opaque — with colours lightened
   * so they look the same over white — as the protein rolls up: translucent
   * pieces of one element that overlap where it is split for depth sorting
   * would otherwise show darker lines.
   */
  private fadeOpacity = 1;
  /** Coordinate precision of the current frame, steps per px. */
  private coordScale = 100;
  /** Kink of each helix (sample index, −1 = straight), from the real structure. */
  private kinks: Map<number, number> | null = null;
  /** Steadying rigid motion sampled at τ = i / STEADY_STEPS. */
  private steady: Rigid[] = [];
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
    const disc0 = document.createElementNS(SVG_NS, 'path');
    const disc1 = document.createElementNS(SVG_NS, 'path');
    backG.append(rim, mid, disc0, disc1);
    this.back = {
      rim: new Pooled(rim),
      mid: new Pooled(mid),
      discs: [new Pooled(disc0), new Pooled(disc1)],
    };
    this.runsG = document.createElementNS(SVG_NS, 'g');
    this.labelsG = document.createElementNS(SVG_NS, 'g');
    this.labelsG.setAttribute('font-family', 'sans-serif');
    svg.append(this.defs, backG, this.runsG, this.labelsG);
  }

  /**
   * The set-up that depends only on the model and options — the steadying
   * track and the helix kinks — done once per renderer, so it can be run
   * ahead of time and isn't repeated each time the view is shown.
   */
  precompute(): void {
    if (this.steady.length === 0) this.steady = this.fitSteadyTrack();
    if (!this.kinks) {
      this.kinks = new Map();
      const real = computePose(this.model, 1, 0);
      for (const e of this.model.elements) {
        if (e.type === 'helix') this.kinks.set(e.id, findKink(real.w, e.g0, e.g1));
      }
    }
  }

  /**
   * Fix the start and end framing. `clientWidth` is the visible width of the
   * scroll container and `scroll0` its scroll offset at the 2-D end.
   */
  configure(clientWidth: number, scroll0: number): void {
    const { model, options } = this;
    const fr = model.scene.frame;
    const half = model.scene.slab.half;
    this.precompute();
    const pose = computePose(model, 1, options.sweep, this.rigidAt(1));
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
      zoomTrack: new Array<number>(ZOOM_STEPS + 1).fill(1),
    };
    this.framing.zoomTrack = this.fitZoomTrack();
  }

  /**
   * Keep the morph steady on screen. The curtain is integrated from a fixed
   * anchor, so whichever end isn't rolling yet tends to swing round like a
   * lever. Step through the morph and, at each step, find the rotation about
   * the membrane normal and the shift that best line the samples up with the
   * previous step (least squares); applying that track leaves only the
   * motion the roll itself needs. Sampled once, so scrubbing is repeatable.
   */
  private fitSteadyTrack(): Rigid[] {
    const { model, options } = this;
    const track: Rigid[] = [{ phi: 0, tx: 0, ty: 0 }];
    const stride = Math.max(1, Math.floor(model.n / 600));
    let prev: number[] = [];
    {
      const p0 = computePose(model, 0, options.sweep);
      for (let k = 0; k < model.n; k += stride) prev.push(p0.w[k * 4], p0.w[k * 4 + 1]);
    }
    let phiPrev = 0;
    for (let i = 1; i <= STEADY_STEPS; i++) {
      const pose = computePose(model, i / STEADY_STEPS, options.sweep);
      const cur: number[] = [];
      for (let k = 0; k < model.n; k += stride) cur.push(pose.w[k * 4], pose.w[k * 4 + 1]);
      const m = cur.length / 2;
      let qx = 0,
        qy = 0,
        px = 0,
        py = 0;
      for (let j = 0; j < m; j++) {
        qx += cur[j * 2];
        qy += cur[j * 2 + 1];
        px += prev[j * 2];
        py += prev[j * 2 + 1];
      }
      qx /= m;
      qy /= m;
      px /= m;
      py /= m;
      let dot = 0;
      let crs = 0;
      for (let j = 0; j < m; j++) {
        const ax = cur[j * 2] - qx;
        const ay = cur[j * 2 + 1] - qy;
        const bx = prev[j * 2] - px;
        const by = prev[j * 2 + 1] - py;
        dot += ax * bx + ay * by;
        crs += ax * by - ay * bx;
      }
      let phi = Math.atan2(crs, dot);
      // Keep the angle continuous from step to step.
      while (phi - phiPrev > Math.PI) phi -= 2 * Math.PI;
      while (phi - phiPrev < -Math.PI) phi += 2 * Math.PI;
      phiPrev = phi;
      const c = Math.cos(phi);
      const sn = Math.sin(phi);
      const tx = px - (c * qx - sn * qy);
      const ty = py - (sn * qx + c * qy);
      track.push({ phi, tx, ty });
      const next: number[] = [];
      for (let j = 0; j < m; j++) {
        const x = cur[j * 2];
        const y = cur[j * 2 + 1];
        next.push(c * x - sn * y + tx, sn * x + c * y + ty);
      }
      prev = next;
    }
    return track;
  }

  /** Steadying rigid motion at τ (linear between the sampled steps). */
  private rigidAt(tau: number): Rigid | undefined {
    const tr = this.steady;
    if (tr.length < 2) return undefined;
    const x = Math.max(0, Math.min(1, tau)) * (tr.length - 1);
    const i = Math.min(tr.length - 2, Math.floor(x));
    const f = x - i;
    const a = tr[i];
    const b = tr[i + 1];
    return { phi: lerp(a.phi, b.phi, f), tx: lerp(a.tx, b.tx, f), ty: lerp(a.ty, b.ty, f) };
  }

  /**
   * Simulate the morph at a few steps and work out how far to zoom out so the
   * rolled-up part, and the full height of everything, stays on screen. The
   * still-flat strip may run off the sides (the 2-D view scrolls anyway).
   */
  private fitZoomTrack(): number[] {
    const F = this.framing!;
    const track = new Array<number>(ZOOM_STEPS + 1).fill(1);
    const tmp = new Float64Array(4);
    for (let i = 1; i < ZOOM_STEPS; i++) {
      const tau = i / ZOOM_STEPS;
      const pose = computePose(this.model, tau, this.options.sweep, this.rigidAt(tau));
      const v = this.view(tau, { az: 0, el: 0 }, 1);
      const { cx, cy } = v.cam.p;
      const left = v.scrollLeft + ZOOM_MARGIN;
      const right = v.scrollLeft + Math.min(F.clientWidth, v.width) - ZOOM_MARGIN;
      const top = ZOOM_MARGIN;
      const bottom = v.height - ZOOM_MARGIN;
      let need = 1;
      for (let k = 0; k < this.model.n; k += 3) {
        v.cam.project(pose.w[k * 4], pose.w[k * 4 + 1], pose.w[k * 4 + 2], tmp);
        const dy = tmp[1] - cy;
        if (dy > 0 && bottom > cy) need = Math.max(need, dy / (bottom - cy));
        if (dy < 0 && cy > top) need = Math.max(need, -dy / (cy - top));
        if (pose.t[k] < 0.5) continue;
        const dx = tmp[0] - cx;
        if (dx > 0 && right > cx) need = Math.max(need, dx / (right - cx));
        if (dx < 0 && cx > left) need = Math.max(need, -dx / (cx - left));
      }
      track[i] = 1 / need;
    }
    return track;
  }

  /** Zoom-track value at τ (Catmull–Rom through the samples, never above 1). */
  private zoomAt(tau: number): number {
    const tr = this.framing!.zoomTrack;
    const x = Math.max(0, Math.min(1, tau)) * ZOOM_STEPS;
    const i = Math.min(ZOOM_STEPS - 1, Math.floor(x));
    const f = x - i;
    const p0 = tr[Math.max(0, i - 1)];
    const p1 = tr[i];
    const p2 = tr[i + 1];
    const p3 = tr[Math.min(ZOOM_STEPS, i + 2)];
    const v =
      0.5 *
      (2 * p1 +
        (-p0 + p2) * f +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f +
        (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    return Math.min(1, v);
  }

  /** Camera and picture size at progress `tau`. */
  private view(
    tau: number,
    orbit: Orbit,
    zoom: number,
  ): { cam: Camera; width: number; height: number; scrollLeft: number } {
    const F = this.framing!;
    const { options } = this;
    const eCam = smooth(0, 1, tau);
    const eFov = smooth(0.05, 0.9, tau);
    const eEl = smooth(0.0, 0.8, tau);
    const width = lerp(F.width0, F.width1, eCam);
    const height = lerp(F.height0, F.height1, eCam);
    const scrollLeft = lerp(F.scroll0, 0, eCam);
    const cx = scrollLeft + lerp(F.vx0, F.width1 / 2, eCam);
    const cy = lerp(F.cy0, F.height1 / 2, eCam);
    const scale = Math.exp(lerp(Math.log(F.scale0), Math.log(F.scale1), eCam)) * zoom;
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
    return { cam, width, height, scrollLeft };
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
    const sigma = smooth(0.02, 0.65, tau);
    // Coordinate precision: 0.01 px while the picture is still the 2-D figure,
    // 0.1 px once it is 3-D (shorter path strings, faster frames).
    this.coordScale = sigma > 0.05 ? 10 : 100;
    this.fadeOpacity = lerp(st.fadedOpacity, 1, smooth(0.02, 0.3, tau));
    const eW = smooth(0.0, 0.55, tau);
    const eLoop = smooth(0.0, 0.7, tau);
    const eDisc = smooth(0.35, 0.95, tau);
    const labelAlpha = 1 - smooth(0, 0.22, tau);
    const tieAlpha = 1 - smooth(0, 0.3, tau);

    const { cam, width, height, scrollLeft } = this.view(tau, orbit, this.zoomAt(tau));
    const scale = cam.p.scale;

    const pose = computePose(model, tau, options.sweep, this.rigidAt(tau));

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

    // Membrane: the leaflet sheets' fills go behind the protein, which takes
    // their tint where it is seen through them (see Veil); only their rims are
    // depth-sorted with the protein.
    const half = model.scene.slab.half;
    const discX = lerp((model.slabX0 + model.slabX1) / 2, F.disc1.x, eCam);
    const discY = lerp(0, F.disc1.y, eCam);
    const discR = lerp((model.slabX1 - model.slabX0) / 2, F.disc1.r, eCam);
    const planesOn = eDisc > 0.001 && Math.abs(cam.p.el) > 1e-3;
    const veil = new Veil(
      cam,
      discX,
      discY,
      discR,
      half,
      planesOn ? eDisc : 0,
      hexRgb(st.membraneFill),
    );
    this.drawBackRim(cam, discX, discY, discR, half, sigma);
    this.drawDiscs(cam, discX, discY, discR, half, planesOn ? eDisc : 0);

    const prims: Prim[] = [];
    const ctx: FrameCtx = {
      model,
      pose,
      cam,
      proj,
      scale,
      sigma,
      eW,
      eLoop,
      fogAt,
      pxA,
      prims,
      veil,
      endShift: new Map(),
    };

    for (const el of model.elements) {
      if (el.type === 'helix') this.helixPrims(ctx, el);
      else this.strandPrims(ctx, el);
    }
    for (const loop of model.loops) this.loopPrims(ctx, loop);
    if (tieAlpha > 0.001) this.tiePrims(ctx, tieAlpha * 0.5);
    if (planesOn) this.rimPrims(ctx, discX, discY, discR, half, eDisc);

    // Near t = 0 everything is (almost) level, so depths are snapped to keep
    // the 2-D drawing order; the snap fades out as depth becomes meaningful,
    // since in 3-D it would make near-level pieces swap back and forth.
    const quantum = DEPTH_SNAP * (1 - smooth(0, 0.3, tau));
    if (quantum > 1e-6) for (const p of prims) p.depth = Math.round(p.depth / quantum);
    prims.sort((a, b) => b.depth - a.depth || a.order - b.order || a.sub - b.sub);

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
    const { pose, cam, scale, sigma, eW, pxA, prims } = ctx;
    const st = this.model.scene.style;
    const g0 = el.g0;
    const g1 = el.g1;
    if (g1 - g0 < 1) return;
    const rA = lerp(st.halfWidthPx / pxA, this.options.helixRadius, eW);
    const idx = this.downsample(ctx, g0, g1, lerp(0.5, 1.0, ctx.eW));
    const m0 = idx.length;

    // Axis: the sample trace bends with the local-axis smoothing (and hooks
    // at the ends, where its window is one-sided), so in 3-D it is pulled onto
    // a straight line fitted to the samples — two lines meeting at a real
    // kink — as the cylinder grows.
    const nh = g1 - g0 + 1;
    const hw = new Float64Array(nh * 3);
    const hp = new Float64Array(nh * 4);
    for (let g = g0; g <= g1; g++)
      for (let k = 0; k < 3; k++) hw[(g - g0) * 3 + k] = pose.w[g * 4 + k];
    if (eW > 0) {
      this.precompute();
      const kink = this.kinks!.get(el.id) ?? -1;
      const straight = new Float64Array(nh * 3);
      /**
       * The segment of the line fitted to samples a..b that spans them, and
       * each sample's fraction of the way along the trace. Samples are spread
       * along the segment by that fraction, so they stay in order even where
       * the trace hooks back (projecting them would fold the cylinder).
       */
      const axis = (a: number, b: number): { from: number[]; to: number[]; frac: number[] } => {
        const { c, d } = fitLine(pose.w, a, b);
        let lo = Infinity;
        let hi = -Infinity;
        const frac = [0];
        for (let g = a; g <= b; g++) {
          const t =
            (pose.w[g * 4] - c[0]) * d[0] +
            (pose.w[g * 4 + 1] - c[1]) * d[1] +
            (pose.w[g * 4 + 2] - c[2]) * d[2];
          lo = Math.min(lo, t);
          hi = Math.max(hi, t);
          if (g > a) {
            frac.push(
              frac[frac.length - 1] +
                Math.hypot(
                  pose.w[g * 4] - pose.w[g * 4 - 4],
                  pose.w[g * 4 + 1] - pose.w[g * 4 - 3],
                  pose.w[g * 4 + 2] - pose.w[g * 4 - 2],
                ),
            );
          }
        }
        const total = frac[frac.length - 1] || 1;
        return {
          from: c.map((x, k) => x + lo * d[k]),
          to: c.map((x, k) => x + hi * d[k]),
          frac: frac.map((f) => f / total),
        };
      };
      const place = (g: number, p: number[], q: number[], f: number): void => {
        for (let k = 0; k < 3; k++) straight[(g - g0) * 3 + k] = p[k] + f * (q[k] - p[k]);
      };
      if (kink < 0) {
        const L = axis(g0, g1);
        for (let g = g0; g <= g1; g++) place(g, L.from, L.to, L.frac[g - g0]);
      } else {
        // Two lines meeting at the joint (the mean of their kink ends).
        const L1 = axis(g0, kink);
        const L2 = axis(kink, g1);
        const joint = L1.to.map((x, k) => (x + L2.from[k]) / 2);
        for (let g = g0; g <= kink; g++) place(g, L1.from, joint, L1.frac[g - g0]);
        for (let g = kink + 1; g <= g1; g++) place(g, joint, L2.to, L2.frac[g - kink]);
      }
      for (let i = 0; i < nh * 3; i++) hw[i] = lerp(hw[i], straight[i], eW);
      for (const g of [g0, g1]) {
        const o = (g - g0) * 3;
        ctx.endShift.set(g, [
          hw[o] - pose.w[g * 4],
          hw[o + 1] - pose.w[g * 4 + 1],
          hw[o + 2] - pose.w[g * 4 + 2],
        ]);
      }
    }
    for (let i = 0; i < nh; i++) cam.project(hw[i * 3], hw[i * 3 + 1], hw[i * 3 + 2], hp, i * 4);

    // Silhouette frame per kept point: screen centre, perpendicular, radius.
    // The 2-D outline takes its tangent from the neighbouring samples; in 3-D
    // that is noisy for a helix seen nearly end-on, so blend towards the
    // projected axis direction over a wider (~1 Å) baseline.
    const sx0 = new Float64Array(m0);
    const sy0 = new Float64Array(m0);
    const ppx0 = new Float64Array(m0);
    const ppy0 = new Float64Array(m0);
    const rs0 = new Float64Array(m0);
    const dep0 = new Float64Array(m0);
    const unit = (x: number, y: number): [number, number] => {
      const l = Math.hypot(x, y);
      return l > 1e-12 ? [x / l, y / l] : [0, 0];
    };
    for (let i = 0; i < m0; i++) {
      const g = idx[i];
      const [fx, fy] = unit(
        hp[(Math.min(g1, g + 1) - g0) * 4] - hp[(Math.max(g0, g - 1) - g0) * 4],
        hp[(Math.min(g1, g + 1) - g0) * 4 + 1] - hp[(Math.max(g0, g - 1) - g0) * 4 + 1],
      );
      const [wx, wy] = unit(
        hp[(Math.min(g1, g + AXIS_BASELINE) - g0) * 4] -
          hp[(Math.max(g0, g - AXIS_BASELINE) - g0) * 4],
        hp[(Math.min(g1, g + AXIS_BASELINE) - g0) * 4 + 1] -
          hp[(Math.max(g0, g - AXIS_BASELINE) - g0) * 4 + 1],
      );
      const [ux, ty] = unit(lerp(fx, wx, eW), lerp(fy, wy, eW));
      const tx = ux === 0 && ty === 0 ? 1 : ux;
      sx0[i] = hp[(g - g0) * 4];
      sy0[i] = hp[(g - g0) * 4 + 1];
      ppx0[i] = -ty;
      ppy0[i] = tx;
      rs0[i] = rA * scale * hp[(g - g0) * 4 + 3];
      dep0[i] = hp[(g - g0) * 4 + 2];
    }

    // Cut where the membrane tint starts or stops (see strandPrims): extra
    // points on the axis polyline, interpolated between their neighbours.
    const veil = ctx.veil;
    const sxL: number[] = [];
    const syL: number[] = [];
    const ppxL: number[] = [];
    const ppyL: number[] = [];
    const rsL: number[] = [];
    const depL: number[] = [];
    const wL: number[] = [];
    const point = (i: number, j: number, u: number): void => {
      sxL.push(lerp(sx0[i], sx0[j], u));
      syL.push(lerp(sy0[i], sy0[j], u));
      const px = lerp(ppx0[i], ppx0[j], u);
      const py = lerp(ppy0[i], ppy0[j], u);
      const pl = Math.hypot(px, py) || 1;
      ppxL.push(px / pl);
      ppyL.push(py / pl);
      rsL.push(lerp(rs0[i], rs0[j], u));
      depL.push(lerp(dep0[i], dep0[j], u));
      for (let k = 0; k < 3; k++)
        wL.push(lerp(hw[(idx[i] - g0) * 3 + k], hw[(idx[j] - g0) * 3 + k], u));
    };
    for (let i = 0; i < m0; i++) {
      point(i, i, 0);
      if (i + 1 >= m0 || veil.on <= 0) continue;
      const a = (idx[i] - g0) * 3;
      const b = (idx[i + 1] - g0) * 3;
      const lvAt = (u: number): number =>
        veil.level(
          lerp(hw[a], hw[b], u),
          lerp(hw[a + 1], hw[b + 1], u),
          lerp(hw[a + 2], hw[b + 2], u),
        );
      let la = lvAt(0);
      const lb = lvAt(1);
      let from = 0;
      for (let guard = 0; guard < 3 && la !== lb; guard++) {
        const u = veilBoundary(lvAt, from, 1, la);
        if (u <= from + 1e-3 || u >= 1 - 1e-3) break;
        point(i, i + 1, u);
        from = u;
        la = lvAt(lerp(u, 1, 1e-3));
      }
    }
    const m = sxL.length;
    const sx = Float64Array.from(sxL);
    const sy = Float64Array.from(syL);
    const ppx = Float64Array.from(ppxL);
    const ppy = Float64Array.from(ppyL);
    const rs = Float64Array.from(rsL);
    const dep = Float64Array.from(depL);
    /** Membrane sheets in front of each section's midpoint. */
    const lvSec = new Int32Array(Math.max(0, m - 1));
    for (let i = 0; i < m - 1; i++) {
      lvSec[i] = veil.level(
        (wL[i * 3] + wL[i * 3 + 3]) / 2,
        (wL[i * 3 + 1] + wL[i * 3 + 4]) / 2,
        (wL[i * 3 + 2] + wL[i * 3 + 5]) / 2,
      );
    }

    // Smooth shading: a linear gradient across the cylinder. A gradient is
    // straight in screen space, so the cylinder is split into groups whose
    // on-screen direction stays within a few degrees, each with its own.
    const group = new Int32Array(Math.max(0, m - 1));
    let gid = 0;
    let refX = ppx[0];
    let refY = ppy[0];
    for (let i = 0; i < m - 1; i++) {
      if (ppx[i + 1] * refX + ppy[i + 1] * refY < GROUP_COS) {
        gid++;
        refX = ppx[i];
        refY = ppy[i];
      } else if (i > 0 && lvSec[i] !== lvSec[i - 1]) gid++;
      group[i] = gid;
    }
    const base = this.colours.helix;
    const edge = hexRgb(this.colours.helixEdge);
    // Outline colour per element, not per section (see strandPrims).
    let depthSum = 0;
    for (let i = 0; i < m0; i++) depthSum += dep0[i];
    const edgeC = shadeEdge(edge, sigma, ctx.fogAt(depthSum / Math.max(1, m0)));
    const grads: GradientDef[] = [];
    for (let k = 0, i = 0; k <= gid; k++) {
      let j = i;
      while (j + 1 < m - 1 && group[j + 1] === k) j++;
      const pm = Math.min(m - 1, Math.round((i + j + 1) / 2));
      const g = this.cylinderGradient(
        sx[pm],
        sy[pm],
        ppx[pm],
        ppy[pm],
        rs[pm],
        base,
        sigma,
        ctx.fogAt(dep[pm]),
      );
      const lv = lvSec[Math.min(i, m - 2)] ?? 0;
      grads.push({
        ...g,
        stops: g.stops.map((t) => ({ o: t.o, c: veil.apply(t.c, lv) })),
        mean: veil.apply(g.mean, lv),
      });
      i = j + 1;
    }

    for (let i = 0; i < m - 1; i++) {
      const depth = (dep[i] + dep[i + 1]) / 2;
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
      const body = [left[0], left[1], right[0], right[1], left[2], left[3], right[2], right[3]];
      const xs = [left[0], left[2], right[0], right[2]];
      const ys = [left[1], left[3], right[1], right[3]];
      const grad = grads[group[i]];
      const spec: OpSpec = { layer: 1, key: `cyl${group[i]}`, kind: 'gradient' };
      const silL = veiled(SILHOUETTE, lvSec[i]);
      const silR = veiled(SILHOUETTE_R, lvSec[i]);
      const lineC = veil.apply(edgeC, lvSec[i]);
      prims.push({
        id: el.id,
        order: el.order,
        sub: i + 1,
        depth,
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: [left[0], left[1], left[2], left[3], right[2], right[3], right[0], right[1]],
        pad: 0.75,
        emit: (run) => {
          run.strip(spec, body, grad.mean);
          run.setGradient(spec, grad);
          run.stroke(silL, left, lineC, 1.5);
          run.stroke(silR, right, lineC, 1.5);
        },
      });
    }

    // End caps.
    for (const end of [0, m - 1]) {
      const g = idx[end === 0 ? 0 : m0 - 1];
      const gIn = idx[end === 0 ? Math.min(m0 - 1, 1) : Math.max(0, m0 - 2)];
      const o = (g - g0) * 3;
      const oIn = (gIn - g0) * 3;
      const lv = veil.level(hw[o], hw[o + 1], hw[o + 2]);
      const lineC = veil.apply(edgeC, lv);
      const ox = hw[o] - hw[oIn];
      const oy = hw[o + 1] - hw[oIn + 1];
      const oz = hw[o + 2] - hw[oIn + 2];
      const ol = Math.hypot(ox, oy, oz) || 1;
      cam.toEye(hw[o], hw[o + 1], hw[o + 2], this.tmp);
      const facing = (ox * this.tmp[0] + oy * this.tmp[1] + oz * this.tmp[2]) / ol;
      // Outward axis direction on screen (the tangent, from the stable
      // perpendicular), pointing away from the body.
      let qx = ppy[end];
      let qy = -ppx[end];
      if (end === 0) {
        qx = -qx;
        qy = -qy;
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
      const capC = veil.apply(shade(base, AMBIENT + DIFFUSE * lam, 0, sigma, fog), lv);
      // The far end shows only as the rounded end of the cylinder's side, so
      // it takes the side's own gradient (a flat dark disc read as a second,
      // detached cap when the helix is seen nearly end-on).
      const gi = group[end === 0 ? 0 : Math.max(0, m - 2)];
      const sideSpec: OpSpec = { layer: 1, key: `cyl${gi}`, kind: 'gradient' };
      const sideGrad = grads[gi] ?? grads[0];
      const xs = ring.filter((_, k) => k % 2 === 0);
      const ys = ring.filter((_, k) => k % 2 === 1);
      prims.push({
        id: el.id,
        order: el.order,
        sub: near ? 1e6 + end : -1 - end,
        depth: dep[end] + (near ? -1e-3 : 1e-3),
        x0: Math.min(...xs) - 1,
        y0: Math.min(...ys) - 1,
        x1: Math.max(...xs) + 1,
        y1: Math.max(...ys) + 1,
        faded: el.faded,
        pts: ring,
        pad: 0.75,
        emit: (run) => {
          if (near) {
            run.fill({ layer: 3, key: `cap${end}`, kind: 'fill' }, ring, capC);
            run.stroke(
              { layer: 4, key: `cap-edge${end}`, kind: 'stroke', linecap: 'round' },
              ring,
              lineC,
              1.5,
            );
          } else {
            run.fill(sideSpec, ring, sideGrad.mean);
            run.setGradient(sideSpec, sideGrad);
            run.stroke(
              { layer: 2, key: `cap-arc${end}`, kind: 'stroke', linecap: 'round' },
              arc,
              lineC,
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
    // The arrowhead is one section from its base to the tip, much longer than
    // a body section: depth-sorted as one piece, it could be painted over a
    // strand lying in front of part of it. Cut it into pieces as long as body
    // sections (it also follows the strand's curve round the barrel then).
    const tip = sections[sections.length - 1];
    const head = sections[sections.length - 2];
    if (eW > 0 && tip.hw === 0 && tip.fi > head.fi) {
      const pieces = Math.max(1, Math.round(opt.arrowLength / 1.3));
      const inner: OutlineSection[] = [];
      for (let k = 1; k < pieces; k++) {
        const f = k / pieces;
        inner.push({ ...head, fi: lerp(head.fi, tip.fi, f), hw: head.hw * (1 - f) });
      }
      sections.splice(sections.length - 1, 0, ...inner);
    }
    const veil = ctx.veil;
    const kept = this.keepSections(sections, pts, lerp(0.5, 1.3, eW) * pxA);
    /** Membrane sheets in front of the centre line at outline index `fi`. */
    const levelAt = (fi: number): number => {
      const ga = Math.min(g1, Math.floor(g0 + fi));
      const gb = Math.min(g1, ga + 1);
      const f = g0 + fi - ga;
      return veil.level(
        lerp(pose.w[ga * 4], pose.w[gb * 4], f),
        lerp(pose.w[ga * 4 + 1], pose.w[gb * 4 + 1], f),
        lerp(pose.w[ga * 4 + 2], pose.w[gb * 4 + 2], f),
      );
    };
    // Cut the strand where the membrane tint starts or stops, so each
    // section is wholly in front of or behind a sheet.
    const secs: OutlineSection[] = [];
    const added: boolean[] = [];
    for (let k = 0; k < kept.length; k++) {
      const a = kept[k];
      secs.push(a);
      added.push(false);
      const b = kept[k + 1];
      if (veil.on <= 0 || !b || b.fi - a.fi < 1e-9) continue;
      let from = a;
      let la = levelAt(a.fi);
      const lb = levelAt(b.fi);
      for (let guard = 0; guard < 3 && la !== lb; guard++) {
        const fi = veilBoundary(levelAt, from.fi, b.fi, la);
        const u = (fi - a.fi) / (b.fi - a.fi);
        if (u <= 1e-3 || u >= 1 - 1e-3) break;
        const px = lerp(a.px, b.px, u);
        const py = lerp(a.py, b.py, u);
        const pl = Math.hypot(px, py) || 1;
        from = { fi, hw: lerp(a.hw, b.hw, u), px: px / pl, py: py / pl };
        secs.push(from);
        added.push(true);
        la = levelAt(lerp(fi, b.fi, 1e-3));
      }
    }

    // 3-D cross-sections: centre, width vector, normal; projected corners.
    const m = secs.length;
    const C = new Float64Array(m * 3);
    const W = new Float64Array(m * 3);
    const N = new Float64Array(m * 3);
    const corners = new Float64Array(m * 16); // TL, TR, BL, BR × (x, y, depth, k)
    const hT = opt.strandThickness / 2;
    const tmp = this.tmp;
    for (let i = 0; i < m; i++) {
      const s = secs[i];
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
    // Colours that don't vary along the strand are worked out once for the
    // whole element: if they were averaged over whichever sections share a
    // depth-sorted run, they would shimmer as the runs change with the view.
    // (Over the kept sections only, so the membrane cuts don't move them.)
    let depthSum = 0;
    for (let i = 0; i < m; i++) if (!added[i]) depthSum += corners[i * 16 + 2];
    const elFog = ctx.fogAt(depthSum / Math.max(1, kept.length));
    const sideC = shade(base, AMBIENT * 0.82, 0, sigma, elFog);
    const edgeC = shadeEdge(edge, sigma, elFog);
    // Face shading does vary along the strand: one gradient per stretch that
    // runs straight on screen, built from every section's own colour.
    const groupStops: { x: number; y: number; c: RGB }[][] = [[]];
    const groupDefs: GradientDef[] = [];
    let gid = 0;
    let refDx = NaN;
    let refDy = NaN;
    let groupLv = -1;
    const P = (i: number, c: number): [number, number] => [
      corners[i * 16 + c * 4],
      corners[i * 16 + c * 4 + 1],
    ];

    // Next centre distinct from centre i (skipping zero-length sections).
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

    /** A shoulder section waiting to be drawn with the section after it. */
    let held: { pts: number[]; emit: (run: Run) => void } | null = null;
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
      // A zero-length section is an arrowhead shoulder. Its walls (facing back
      // along the strand) are left out: seen face-on while the arrowhead
      // itself is edge-on, they showed as small detached rectangles.
      const shoulder =
        Math.hypot(C[j * 3] - C[i * 3], C[j * 3 + 1] - C[i * 3 + 1], C[j * 3 + 2] - C[i * 3 + 2]) <=
        1e-6;
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
        if ((cxw - mx) * wx + (cyw - my) * wy + (czw - mz) * wz < 0) {
          wx = -wx;
          wy = -wy;
          wz = -wz;
        }
        return wx * ex + wy * ey + wz * ez > EPS;
      };
      const visL = !shoulder && wallVis(1);
      const visR = !shoulder && wallVis(-1);

      // Start wall (first section only): faces back along the strand.
      let visStart = false;
      const nS = [0, 0, 0];
      if (i === 0) {
        const k = distinct(0);
        if (k > 0) {
          const al = Math.hypot(C[0] - C[k * 3], C[1] - C[k * 3 + 1], C[2] - C[k * 3 + 2]) || 1;
          nS[0] = (C[0] - C[k * 3]) / al;
          nS[1] = (C[1] - C[k * 3 + 1]) / al;
          nS[2] = (C[2] - C[k * 3 + 2]) / al;
          visStart = nS[0] * ex + nS[1] * ey + nS[2] * ez > EPS;
        }
      }

      const depth = (corners[i * 16 + 2] + corners[j * 16 + 2]) / 2;
      const fog = ctx.fogAt(depth);
      /** Lambert + specular shade of a surface with unit world normal n. */
      const lit = (n0: number, n1: number, n2: number): RGB => {
        cam.toCam(n0, n1, n2, tmp, 4);
        const lam = Math.max(0, tmp[4] * LIGHT[0] + tmp[5] * LIGHT[1] + tmp[6] * LIGHT[2]);
        const hv = Math.max(0, tmp[4] * HALF[0] + tmp[5] * HALF[1] + tmp[6] * HALF[2]);
        return shade(base, AMBIENT + DIFFUSE * lam, Math.pow(hv, 30) * 0.3, sigma, fog);
      };
      const lv = veil.level(mx, my, mz);
      // Two-sided Lambert on the ribbon face.
      const sgn = (vN >= 0 ? 1 : -1) / nl;
      const faceC = veil.apply(lit(nx * sgn, ny * sgn, nz * sgn), lv);
      // The side walls keep one dark tone that reads as the ribbon's
      // thickness; the blunt start wall is lit like a face, as in that dark
      // tone it read as a stray rectangle.
      const wallC = veil.apply(sideC, lv);
      const lineC = veil.apply(edgeC, lv);
      const startC = veil.apply(visStart ? lit(nS[0], nS[1], nS[2]) : sideC, lv);

      const TL0 = P(i, 0),
        TR0 = P(i, 1),
        BL0 = P(i, 2),
        BR0 = P(i, 3);
      const TL1 = P(j, 0),
        TR1 = P(j, 1),
        BL1 = P(j, 2),
        BR1 = P(j, 3);
      // Gradient group: start a new one when the strand turns on screen, or
      // passes behind a membrane sheet.
      if (lv !== groupLv) {
        if (groupLv >= 0) {
          gid++;
          groupStops.push([]);
          refDx = NaN;
        }
        groupLv = lv;
      }
      {
        const dx = (TL1[0] + TR1[0] - TL0[0] - TR0[0]) / 2;
        const dy = (TL1[1] + TR1[1] - TL0[1] - TR0[1]) / 2;
        const dl = Math.hypot(dx, dy);
        if (dl > 0.5) {
          if (Number.isNaN(refDx)) {
            refDx = dx / dl;
            refDy = dy / dl;
          } else if ((dx * refDx + dy * refDy) / dl < STRAND_GROUP_COS) {
            gid++;
            groupStops.push([]);
            refDx = dx / dl;
            refDy = dy / dl;
          }
        }
      }
      const g = gid;
      groupStops[g].push({
        x: (TL0[0] + TR0[0] + TL1[0] + TR1[0]) / 4,
        y: (TL0[1] + TR0[1] + TL1[1] + TR1[1]) / 4,
        c: faceC,
      });
      const faceTop: OpSpec = { layer: 1, key: `face-t${g}`, kind: 'gradient' };
      const faceBot: OpSpec = { layer: 1, key: `face-b${g}`, kind: 'gradient' };
      // Quads as (start-left, start-right, end-left, end-right).
      const faces: { spec: OpSpec; q: number[]; c: RGB }[] = [];
      if (visTop) faces.push({ spec: faceTop, q: [...TL0, ...TR0, ...TL1, ...TR1], c: faceC });
      if (visBot) faces.push({ spec: faceBot, q: [...BL0, ...BR0, ...BL1, ...BR1], c: faceC });
      const sideL = veiled(SIDE_L, lv);
      const sideR = veiled(SIDE_R, lv);
      if (visL) faces.push({ spec: sideL, q: [...TL0, ...BL0, ...TL1, ...BL1], c: wallC });
      if (visR) faces.push({ spec: sideR, q: [...TR0, ...BR0, ...TR1, ...BR1], c: wallC });
      const startWall = visStart ? [...TL0, ...TR0, ...BR0, ...BL0] : null;
      const edges: { spec: OpSpec; pts: number[] }[] = [];
      const edge = (spec: OpSpec, pts: number[]): void => {
        edges.push({ spec: veiled(spec, lv), pts });
      };
      if (visTop !== visL) edge(EDGE_TL, [...TL0, ...TL1]);
      if (visTop !== visR) edge(EDGE_TR, [...TR0, ...TR1]);
      if (visBot !== visL) edge(EDGE_BL, [...BL0, ...BL1]);
      if (visBot !== visR) edge(EDGE_BR, [...BR0, ...BR1]);
      if (i === 0) {
        if (visStart !== visTop) edge(EDGE_X, [...TL0, ...TR0]);
        if (visStart !== visBot) edge(EDGE_X, [...BL0, ...BR0]);
        if (visStart !== visL) edge(EDGE_X, [...TL0, ...BL0]);
        if (visStart !== visR) edge(EDGE_X, [...TR0, ...BR0]);
      }
      // Where two visible faces meet there is no outline, and the two
      // abutting polygons would leave a light anti-aliasing hairline: cover
      // the shared edge with a thin line in the wall's colour.
      const seams: { spec: OpSpec; pts: number[]; c: RGB }[] = [];
      const seam = (spec: OpSpec, pts: number[], c: RGB): void => {
        seams.push({ spec: veiled(spec, lv), pts, c });
      };
      if (visTop && visL) seam(SEAM_TL, [...TL0, ...TL1], wallC);
      if (visTop && visR) seam(SEAM_TR, [...TR0, ...TR1], wallC);
      if (visBot && visL) seam(SEAM_BL, [...BL0, ...BL1], wallC);
      if (visBot && visR) seam(SEAM_BR, [...BR0, ...BR1], wallC);
      if (visStart) {
        if (visTop) seam(SEAM_X, [...TL0, ...TR0], startC);
        if (visBot) seam(SEAM_X, [...BL0, ...BR0], startC);
        if (visL) seam(SEAM_X, [...TL0, ...BL0], startC);
        if (visR) seam(SEAM_X, [...TR0, ...BR0], startC);
      }
      const startSpec = veiled(SIDE_START, lv);
      const pts = [...TL0, ...TR0, ...BL0, ...BR0, ...TL1, ...TR1, ...BL1, ...BR1];
      const emit = (run: Run): void => {
        for (const f of faces) {
          run.strip(f.spec, f.q, f.c);
          if (f.spec.kind === 'gradient') run.setGradient(f.spec, groupDefs[g]);
        }
        if (startWall) run.fill(startSpec, startWall, startC);
        for (const e of seams) run.stroke(e.spec, e.pts, e.c, 1);
        for (const e of edges) run.stroke(e.spec, e.pts, lineC, 1.5);
      };
      // A shoulder (now just its outline) is depth-sorted with the arrowhead
      // section after it: on its own, its tiny footprint could be painted over
      // a neighbouring strand that hides the rest of the arrowhead.
      if (shoulder && j < m - 1) {
        held = { pts, emit };
        continue;
      }
      const before = held;
      held = null;
      const all = before ? [...before.pts, ...pts] : pts;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let k = 0; k < all.length; k += 2) {
        x0 = Math.min(x0, all[k]);
        y0 = Math.min(y0, all[k + 1]);
        x1 = Math.max(x1, all[k]);
        y1 = Math.max(y1, all[k + 1]);
      }
      prims.push({
        id: el.id,
        order: el.order,
        sub: i,
        depth,
        x0: x0 - 1,
        y0: y0 - 1,
        x1: x1 + 1,
        y1: y1 + 1,
        faded: el.faded,
        pts: all,
        pad: 0.75,
        emit: before
          ? (run) => {
              before.emit(run);
              emit(run);
            }
          : emit,
      });
    }
    for (const stops of groupStops) groupDefs.push(gradientAlong(stops));
  }

  private loopPrims(ctx: FrameCtx, loop: ModelLoop): void {
    const { model, pose, cam, scale, sigma, eW, eLoop, prims } = ctx;
    const { ud, zd } = model;
    // Fine sampling near t = 0 keeps the curve faithful to the 2-D Bézier;
    // coarser in 3-D where the tube is smooth anyway.
    const spacing = lerp(0.35, 1.2, eW);
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
    const wx = new Float64Array(count);
    const wy = new Float64Array(count);
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
      wx[c] = this.tmp[0];
      wy[c] = this.tmp[1];
      wz[c] = this.tmp[2];
    }
    // Length along the loop in space (Å), independent of the view.
    const arc = new Float64Array(count);
    for (let c = 1; c < count; c++) {
      arc[c] = arc[c - 1] + Math.hypot(wx[c] - wx[c - 1], wy[c] - wy[c - 1], wz[c] - wz[c - 1]);
    }
    // Follow element ends drawn away from their pose (straightened helices),
    // easing back to the loop's own path within a few Å.
    for (const [g, fromEnd] of [
      [loop.fromG, true],
      [loop.toG, false],
    ] as const) {
      const shift = g >= 0 ? ctx.endShift.get(g) : undefined;
      if (!shift) continue;
      for (let c = 0; c < count; c++) {
        const d = fromEnd ? arc[c] : arc[count - 1] - arc[c];
        if (d >= END_EASE) continue;
        const f = 1 - smooth(0, END_EASE, d);
        wx[c] += shift[0] * f;
        wy[c] += shift[1] * f;
        wz[c] += shift[2] * f;
      }
    }
    for (let c = 0; c < count; c++) {
      cam.project(wx[c], wy[c], wz[c], this.tmp, 4);
      sx[c] = this.tmp[4];
      sy[c] = this.tmp[5];
      sd[c] = this.tmp[6];
      sk[c] = this.tmp[7];
    }
    const coil = this.colours.coil;
    // One set of colours and one width per loop: averaging them over whichever
    // pieces share a depth-sorted run would make them shimmer as the view moves.
    let dAvg = 0;
    let kAvg = 0;
    for (let c = 0; c < count; c++) {
      dAvg += sd[c] / count;
      kAvg += sk[c] / count;
    }
    const fog = ctx.fogAt(dAvg);
    const core = lerp(1.8, 2 * this.options.coilRadius * scale * kAvg, eW);
    const outer = core + 1.8 * sigma;
    // Pieces closer than this along the loop overlap anyway (see Prim.reach).
    const reach =
      3 + 2 * Math.max(2 * this.options.coilRadius, outer / Math.max(1e-6, scale * kAvg));
    const coreC = fogged(mixRgb(coil, [150, 150, 150], sigma), fog);
    const outC = fogged(mixRgb(coil, [52, 52, 52], sigma), fog);
    const shineC = mixRgb(coreC, WHITE, 0.45);

    // In 3-D a solid loop is drawn as a filled tube with edge lines and a
    // highlight, so the joins between depth-sorted pieces are invisible. Near
    // t = 0 (and for dashed loops) it stays a stroke, matching the 2-D curve;
    // dashes are cut as separate pieces pinned to the curve so they don't
    // crawl when the loop is split differently from frame to frame.
    const tube = sigma >= 0.05 && !loop.discontinuous;
    const cap = loop.discontinuous || !tube ? 'round' : 'butt';
    const coreSpec: OpSpec = { layer: 2, key: 'tube', kind: 'stroke', linecap: cap };
    const outSpec: OpSpec = { layer: 1, key: 'tube-o', kind: 'stroke', linecap: cap };
    // Dashes of a chain break: as in 2-D at t = 0; in 3-D laid along the
    // loop's length on screen (laid along its length in space, a stretch
    // pointing at the viewer bunches them into a clump) and sized to the
    // line, which is much wider than in 2-D.
    const dashPx = loop.discontinuous ? loop.synLength * ctx.pxA : 0;
    const dashOn = lerp(DASH_ON, core, sigma);
    const dashPeriod = lerp(DASH_PERIOD, 3.5 * core, sigma);
    const onScreen = new Float64Array(count);
    for (let c = 1; c < count; c++) {
      onScreen[c] = onScreen[c - 1] + Math.hypot(sx[c] - sx[c - 1], sy[c] - sy[c - 1]);
    }
    const edgeAlpha = clamp01((sigma - 0.05) / 0.3);
    const rb = outer / 2;
    const edgeW = 1.2;
    // Per-point screen perpendicular (smoothed over a few points).
    const ppx = new Float64Array(count);
    const ppy = new Float64Array(count);
    const shine = new Float64Array(count);
    if (tube) {
      const lx = LIGHT[0];
      const ly = -LIGHT[1];
      for (let c = 0; c < count; c++) {
        const a = Math.max(0, c - 2);
        const b = Math.min(count - 1, c + 2);
        let tx = sx[b] - sx[a];
        let ty = sy[b] - sy[a];
        const tl = Math.hypot(tx, ty);
        if (tl > 1e-9) {
          tx /= tl;
          ty /= tl;
        } else {
          tx = 1;
          ty = 0;
        }
        ppx[c] = -ty;
        ppy[c] = tx;
        // Highlight offset towards the light, continuous along the tube.
        const ls = Math.hypot(lx, ly) || 1;
        shine[c] = 0.32 * rb * ((ppx[c] * lx + ppy[c] * ly) / ls);
      }
    }

    // Depth-sorted pieces of about 1.2 Å, cut where the membrane tint starts
    // or stops (see strandPrims).
    const veil = ctx.veil;
    const lvS = new Int32Array(count);
    for (let c = 0; c < count; c++) lvS[c] = veil.level(wx[c], wy[c], wz[c]);
    interface LoopPoint {
      x: number;
      y: number;
      d: number;
      px: number;
      py: number;
      sh: number;
      s: number;
      /** Length along the loop in space (Å) and on screen (px). */
      a: number;
      scr: number;
    }
    const at = (q: number, r: number, u: number): LoopPoint => {
      let px = lerp(ppx[q], ppx[r], u);
      let py = lerp(ppy[q], ppy[r], u);
      const pl = Math.hypot(px, py);
      if (pl > 1e-12) {
        px /= pl;
        py /= pl;
      }
      return {
        x: lerp(sx[q], sx[r], u),
        y: lerp(sy[q], sy[r], u),
        d: lerp(sd[q], sd[r], u),
        px,
        py,
        sh: lerp(shine[q], shine[r], u),
        s: lerp(q, r, u) / (count - 1),
        a: lerp(arc[q], arc[r], u),
        scr: lerp(onScreen[q], onScreen[r], u),
      };
    };
    const piece = (P: LoopPoint[], lv: number, sub: number): void => {
      const pts: number[] = [];
      let dSum = 0;
      let x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;
      for (const p of P) {
        pts.push(p.x, p.y);
        dSum += p.d;
        x0 = Math.min(x0, p.x);
        y0 = Math.min(y0, p.y);
        x1 = Math.max(x1, p.x);
        y1 = Math.max(y1, p.y);
      }
      const pad = outer / 2 + 1;
      const cC = veil.apply(coreC, lv);
      const oC = veil.apply(outC, lv);
      let emit: (run: Run) => void;
      if (tube) {
        const quads: number[][] = [];
        const left: number[] = [];
        const right: number[] = [];
        const hi: number[] = [];
        const re = rb - edgeW / 2;
        for (let q = 0; q < P.length; q++) {
          const p = P[q];
          left.push(p.x + re * p.px, p.y + re * p.py);
          right.push(p.x - re * p.px, p.y - re * p.py);
          hi.push(p.x + p.sh * p.px, p.y + p.sh * p.py);
          const n = P[q + 1];
          if (n) {
            quads.push([
              p.x + rb * p.px,
              p.y + rb * p.py,
              p.x - rb * p.px,
              p.y - rb * p.py,
              n.x + rb * n.px,
              n.y + rb * n.py,
              n.x - rb * n.px,
              n.y - rb * n.py,
            ]);
          }
        }
        const hC = veil.apply(shineC, lv);
        const bodyS = veiled(TUBE_BODY, lv);
        const shineS = veiled(TUBE_SHINE, lv);
        const edgeL = veiled(TUBE_EDGE_L, lv);
        const edgeR = veiled(TUBE_EDGE_R, lv);
        emit = (run) => {
          for (const quad of quads) run.strip(bodyS, quad, cC);
          run.stroke(shineS, hi, hC, rb * 0.55, edgeAlpha);
          run.stroke(edgeL, left, oC, edgeW, edgeAlpha);
          run.stroke(edgeR, right, oC, edgeW, edgeAlpha);
        };
      } else {
        const phases = P.map((p) => lerp(p.s * dashPx, p.scr, sigma));
        const coreS = veiled(coreSpec, lv);
        const outS = veiled(outSpec, lv);
        emit = (run) => {
          const pieces = dashPx > 0 ? dashPieces(pts, phases, dashOn, dashPeriod) : [pts];
          for (const pc of pieces) {
            if (sigma > 0) run.stroke(outS, pc, oC, outer, sigma);
            run.stroke(coreS, pc, cC, core);
          }
        };
      }
      prims.push({
        id: loop.id,
        order: loop.order,
        sub,
        depth: dSum / P.length,
        x0: x0 - pad,
        y0: y0 - pad,
        x1: x1 + pad,
        y1: y1 + pad,
        faded: loop.faded,
        pts,
        pad: outer / 2,
        along: (P[0].a + P[P.length - 1].a) / 2,
        reach,
        emit,
      });
    };
    const STEP = Math.max(1, Math.round(((count - 1) * 1.2) / Math.max(loop.length, 1e-6)));
    for (let c = 0; c < count - 1; c += STEP) {
      const e = Math.min(count - 1, c + STEP);
      const parts: { pts: LoopPoint[]; lv: number }[] = [];
      let cur: LoopPoint[] = [at(c, c, 0)];
      let lv = lvS[c];
      for (let q = c; q < e; q++) {
        if (lvS[q + 1] !== lvS[q]) {
          const lvAt = (u: number): number =>
            veil.level(
              lerp(wx[q], wx[q + 1], u),
              lerp(wy[q], wy[q + 1], u),
              lerp(wz[q], wz[q + 1], u),
            );
          let from = 0;
          for (let guard = 0; guard < 3 && lv !== lvS[q + 1]; guard++) {
            const u = veilBoundary(lvAt, from, 1, lv);
            const b = at(q, q + 1, u);
            cur.push(b);
            parts.push({ pts: cur, lv });
            cur = [b];
            lv = lvAt(lerp(u, 1, 1e-3));
            from = u;
          }
          lv = lvS[q + 1];
        }
        cur.push(at(q + 1, q + 1, 0));
      }
      parts.push({ pts: cur, lv });
      parts.forEach((part, k) => piece(part.pts, part.lv, c + k / 16));
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

  /**
   * Fills of the two leaflet sheets, far one first, behind the protein. The
   * upper sheet reads as translucent; the lower one is kept faint so the
   * cytoplasmic side stays legible.
   */
  private drawDiscs(
    cam: Camera,
    cxw: number,
    cyw: number,
    r: number,
    half: number,
    eDisc: number,
  ): void {
    const st = this.model.scene.style;
    const [far, near] = this.back.discs;
    if (eDisc <= 0) {
      far.set('display', 'none');
      near.set('display', 'none');
      return;
    }
    // Seen from above, the lower leaflet is the far one.
    const eyeZ = Number.isFinite(cam.dist) ? cam.eye[2] : cam.p.el;
    const fromAbove = eyeZ > 0;
    for (const which of ['top', 'bottom'] as const) {
      const zp = which === 'top' ? half : -half;
      let d = '';
      for (let a = 0; a < 64; a++) {
        const th = (a / 64) * 2 * Math.PI;
        cam.project(cxw + r * Math.cos(th), cyw + r * Math.sin(th), zp, this.tmp);
        d += (a === 0 ? 'M' : 'L') + this.tmp[0].toFixed(2) + ',' + this.tmp[1].toFixed(2);
      }
      const path = (which === 'top') === fromAbove ? near : far;
      path.set('display', null);
      path.set('d', d + 'Z');
      path.set('fill', st.membraneFill);
      path.set('fill-opacity', (SHEET_ALPHA[which === 'top' ? 0 : 1] * eDisc).toFixed(3));
    }
  }

  /** Rims of the leaflet sheets, depth-sorted with the protein. */
  private rimPrims(
    ctx: FrameCtx,
    cxw: number,
    cyw: number,
    r: number,
    half: number,
    alpha: number,
  ): void {
    const { cam, prims } = ctx;
    const edge = hexRgb(this.model.scene.style.membraneEdge);
    const N = 64;
    for (const [k, zp] of [
      [0, half],
      [1, -half],
    ]) {
      const ring = new Float64Array((N + 1) * 3);
      for (let a = 0; a <= N; a++) {
        const th = (a / N) * 2 * Math.PI;
        cam.project(cxw + r * Math.cos(th), cyw + r * Math.sin(th), zp, this.tmp);
        ring[a * 3] = this.tmp[0];
        ring[a * 3 + 1] = this.tmp[1];
        ring[a * 3 + 2] = this.tmp[2];
      }
      for (let a = 0; a < N; a++) {
        const pts = [ring[a * 3], ring[a * 3 + 1], ring[a * 3 + 3], ring[a * 3 + 4]];
        prims.push({
          id: -11 - k,
          order: -1,
          sub: a,
          depth: (ring[a * 3 + 2] + ring[a * 3 + 5]) / 2,
          x0: Math.min(pts[0], pts[2]) - 1,
          y0: Math.min(pts[1], pts[3]) - 1,
          x1: Math.max(pts[0], pts[2]) + 1,
          y1: Math.max(pts[1], pts[3]) + 1,
          faded: false,
          pts,
          pad: 0.5,
          emit: (run) => run.stroke(RIM, pts, edge, 1, alpha),
        });
      }
    }
  }

  private mergeRuns(prims: Prim[], width: number, height: number): Run[] {
    // A primitive joins its element's latest run only if nothing drawn since
    // that run started overlaps it on screen, and no piece of the run from
    // further along the element does (see Prim.reach) — merged runs then never
    // break the back-to-front order where it matters. A coarse grid finds the
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
            if (newest[cell] < ri) continue;
            for (const q of cells[cell]) {
              const qr = q.run ?? -1;
              if (qr < ri || stamp.get(q) === visit) continue;
              if (
                qr === ri &&
                (p.reach === undefined ||
                  q.along === undefined ||
                  Math.abs((p.along ?? 0) - q.along) <= p.reach)
              ) {
                continue;
              }
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
        runs.push(new Run(p.id, p.faded, !p.faded || this.fadeOpacity >= 0.999, this.coordScale));
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
    const fadeA = this.fadeOpacity;
    // Lighten faded colours so that, drawn at `fadeA`, they look as they did
    // at the 2-D opacity over a white ground.
    const k = fadedOpacity / fadeA;
    const lighten = (c: RGB): RGB => [
      255 - k * (255 - c[0]),
      255 - k * (255 - c[1]),
      255 - k * (255 - c[2]),
    ];
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
      slot.g.set('opacity', run.faded && fadeA < 0.999 ? fadeA.toFixed(3) : null);
      const tint = run.faded ? lighten : (c: RGB): RGB => c;
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
        const avg: RGB = tint([op.rgb[0] / n, op.rgb[1] / n, op.rgb[2] / n]);
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
          const grad =
            op.spec.kind === 'gradient' && op.grad ? this.gradientFromDef(op.grad, gi, tint) : null;
          if (grad) {
            gi++;
            path.set('fill', grad);
          } else path.set('fill', rgbStr(op.grad ? tint(op.grad.mean) : avg));
        }
      }
      for (let j = ops.length; j < slot.paths.length; j++) slot.paths[j].set('display', 'none');
    }
    for (let i = runs.length; i < this.slots.length; i++) this.slots[i].g.set('display', 'none');
  }

  /** Lighting profile across a cylinder at one point, as a gradient. */
  private cylinderGradient(
    cx: number,
    cy: number,
    px: number,
    py: number,
    r: number,
    base: RGB,
    sigma: number,
    fog: number,
  ): GradientDef {
    // Surface normal at fraction f across the silhouette (camera space):
    // f·P + √(1−f²)·(towards the viewer), with P the on-screen perpendicular.
    const Px = px;
    const Py = -py;
    const stops: { o: number; c: RGB }[] = [];
    const K = 9;
    let sum: RGB = [0, 0, 0];
    for (let k = 0; k < K; k++) {
      const f = Math.sin(-Math.PI / 2 + (k * Math.PI) / (K - 1));
      const q = Math.sqrt(Math.max(0, 1 - f * f));
      const nx = f * Px;
      const ny = f * Py;
      const nz = -q;
      const lam = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]);
      const hv = Math.max(0, nx * HALF[0] + ny * HALF[1] + nz * HALF[2]);
      const c = shade(base, AMBIENT + DIFFUSE * lam, 0.35 * Math.pow(hv, 24), sigma, fog);
      stops.push({ o: (f + 1) / 2, c });
      sum = [sum[0] + c[0] / K, sum[1] + c[1] / K, sum[2] + c[2] / K];
    }
    return { x1: cx - r * px, y1: cy - r * py, x2: cx + r * px, y2: cy + r * py, stops, mean: sum };
  }

  /** Emit an explicit gradient, or null when its stops are all one colour. */
  private gradientFromDef(g: GradientDef, gi: number, tint: (c: RGB) => RGB): string | null {
    const a = g.stops[0].c;
    let flat = true;
    for (const s of g.stops) {
      if (Math.abs(s.c[0] - a[0]) + Math.abs(s.c[1] - a[1]) + Math.abs(s.c[2] - a[2]) > 1.5) {
        flat = false;
        break;
      }
    }
    if (flat || Math.hypot(g.x2 - g.x1, g.y2 - g.y1) < 0.5) return null;
    const stops = g.stops.map((s) => ({ o: s.o, c: tint(s.c) }));
    return this.writeGradient(gi, g.x1, g.y1, g.x2, g.y2, stops);
  }

  private writeGradient(
    gi: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    sorted: { o: number; c: RGB }[],
  ): string {
    let slot = this.grads[gi];
    if (!slot) {
      const el = document.createElementNS(SVG_NS, 'linearGradient');
      el.setAttribute('id', `${this.idPrefix}-g${gi}`);
      el.setAttribute('gradientUnits', 'userSpaceOnUse');
      this.defs.appendChild(el);
      slot = { el: new Pooled(el), stops: [] };
      this.grads.push(slot);
    }
    slot.el.set('x1', fmt(x1, this.coordScale));
    slot.el.set('y1', fmt(y1, this.coordScale));
    slot.el.set('x2', fmt(x2, this.coordScale));
    slot.el.set('y2', fmt(y2, this.coordScale));
    for (let k = 0; k < sorted.length; k++) {
      let st = slot.stops[k];
      if (!st) {
        const el = document.createElementNS(SVG_NS, 'stop');
        slot.el.el.appendChild(el);
        st = new Pooled(el);
        slot.stops.push(st);
      }
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
  veil: Veil;
  /**
   * World displacement of element end samples whose drawn position differs
   * from the pose (straightened helices), so loops can stay attached.
   */
  endShift: Map<number, [number, number, number]>;
}

const RIM: OpSpec = { layer: 0, key: 'rim', kind: 'stroke', linecap: 'round' };
const SILHOUETTE: OpSpec = { layer: 2, key: 'sil-l', kind: 'stroke', linecap: 'round' };
const SILHOUETTE_R: OpSpec = { layer: 2, key: 'sil-r', kind: 'stroke', linecap: 'round' };
const TUBE_BODY: OpSpec = { layer: 1, key: 'tube-body', kind: 'fill' };
const TUBE_SHINE: OpSpec = { layer: 2, key: 'tube-shine', kind: 'stroke', linecap: 'round' };
const TUBE_EDGE_L: OpSpec = { layer: 3, key: 'tube-l', kind: 'stroke', linecap: 'round' };
const TUBE_EDGE_R: OpSpec = { layer: 3, key: 'tube-r', kind: 'stroke', linecap: 'round' };
const SIDE_L: OpSpec = { layer: 1, key: 'side-l', kind: 'fill' };
const SIDE_R: OpSpec = { layer: 1, key: 'side-r', kind: 'fill' };
const SIDE_START: OpSpec = { layer: 1, key: 'side-s', kind: 'fill' };
const EDGE_TL: OpSpec = { layer: 2, key: 'e-tl', kind: 'stroke', linecap: 'round' };
const EDGE_TR: OpSpec = { layer: 2, key: 'e-tr', kind: 'stroke', linecap: 'round' };
const EDGE_BL: OpSpec = { layer: 2, key: 'e-bl', kind: 'stroke', linecap: 'round' };
const EDGE_BR: OpSpec = { layer: 2, key: 'e-br', kind: 'stroke', linecap: 'round' };
const EDGE_X: OpSpec = { layer: 2, key: 'e-x', kind: 'stroke', linecap: 'round' };
const SEAM_TL: OpSpec = { layer: 1, key: 's-tl', kind: 'stroke', linecap: 'butt' };
const SEAM_TR: OpSpec = { layer: 1, key: 's-tr', kind: 'stroke', linecap: 'butt' };
const SEAM_BL: OpSpec = { layer: 1, key: 's-bl', kind: 'stroke', linecap: 'butt' };
const SEAM_BR: OpSpec = { layer: 1, key: 's-br', kind: 'stroke', linecap: 'butt' };
const SEAM_X: OpSpec = { layer: 1, key: 's-x', kind: 'stroke', linecap: 'butt' };

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

/** Distance (Å) over which a loop eases from a moved element end to its own path. */
const END_EASE = 5;

/** A helix bends into two straight cylinders only at a kink sharper than this. */
const KINK_ANGLE = (20 * Math.PI) / 180;
/** Fewest samples either side of a helix kink. */
const KINK_MIN = 5;

/**
 * Best-fit line through samples a..b of `w` (stride 4): centroid and unit
 * direction (principal axis, pointing from sample a towards sample b).
 */
export function fitLine(w: Float64Array, a: number, b: number): { c: number[]; d: number[] } {
  const n = b - a + 1;
  const c = [0, 0, 0];
  for (let g = a; g <= b; g++) for (let k = 0; k < 3; k++) c[k] += w[g * 4 + k] / n;
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let g = a; g <= b; g++) {
    const q = [w[g * 4] - c[0], w[g * 4 + 1] - c[1], w[g * 4 + 2] - c[2]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] += q[i] * q[j];
  }
  // Power iteration from the end-to-end direction.
  let d = [w[b * 4] - w[a * 4], w[b * 4 + 1] - w[a * 4 + 1], w[b * 4 + 2] - w[a * 4 + 2]];
  for (let it = 0; it < 24; it++) {
    const e = [0, 1, 2].map((i) => m[i * 3] * d[0] + m[i * 3 + 1] * d[1] + m[i * 3 + 2] * d[2]);
    const l = Math.hypot(e[0], e[1], e[2]);
    if (l < 1e-12) break;
    d = e.map((x) => x / l);
  }
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  d = d.map((x) => x / l);
  const ex = [w[b * 4] - w[a * 4], w[b * 4 + 1] - w[a * 4 + 1], w[b * 4 + 2] - w[a * 4 + 2]];
  if (d[0] * ex[0] + d[1] * ex[1] + d[2] * ex[2] < 0) d = d.map((x) => -x);
  return { c, d };
}

/**
 * Sample index at which helix g0..g1 bends by more than KINK_ANGLE (the split
 * with the sharpest angle between the two halves' axes), or -1 if straight.
 */
export function findKink(w: Float64Array, g0: number, g1: number): number {
  let best = -1;
  let bestAngle = KINK_ANGLE;
  for (let k = g0 + KINK_MIN; k <= g1 - KINK_MIN; k++) {
    const p = fitLine(w, g0, k).d;
    const q = fitLine(w, k, g1).d;
    const angle = Math.acos(Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
    if (angle > bestAngle) {
      bestAngle = angle;
      best = k;
    }
  }
  return best;
}

/** Opacity of the upper and lower leaflet sheets. */
const SHEET_ALPHA: [number, number] = [0.22, 0.1];

/**
 * The two leaflet surfaces as translucent sheets. Painting a sheet over the
 * protein would need every piece split by the planes in drawing order, and a
 * piece straddling a plane can only go on one side of it. Instead the sheet
 * fills are drawn behind the protein, and any piece seen through a sheet takes
 * the sheet's tint in its own colour; pieces are cut exactly where that
 * changes, so the boundary is where the line of sight meets the sheet's edge
 * or the piece passes through the plane.
 */
class Veil {
  private readonly alpha: [number, number];

  constructor(
    private readonly cam: Camera,
    private readonly cx: number,
    private readonly cy: number,
    private readonly r: number,
    private readonly half: number,
    /** Sheet fade-in (0 = no sheets). */
    readonly on: number,
    private readonly fill: RGB,
  ) {
    this.alpha = [SHEET_ALPHA[0] * on, SHEET_ALPHA[1] * on];
  }

  /** Sheets between world point (x, y, z) and the eye: bit 1 upper, bit 2 lower. */
  level(x: number, y: number, z: number): number {
    if (this.on <= 0) return 0;
    const cam = this.cam;
    // Ray towards the eye: P + s·d, reaching the eye at s = 1 (perspective).
    let dx: number;
    let dy: number;
    let dz: number;
    let reach = Infinity;
    if (Number.isFinite(cam.dist)) {
      dx = cam.eye[0] - x;
      dy = cam.eye[1] - y;
      dz = cam.eye[2] - z;
      reach = 1;
    } else {
      dx = -cam.v[0];
      dy = -cam.v[1];
      dz = -cam.v[2];
    }
    if (Math.abs(dz) < 1e-12) return 0;
    let lv = 0;
    for (let k = 0; k < 2; k++) {
      const s = ((k === 0 ? this.half : -this.half) - z) / dz;
      if (s <= 0 || s >= reach) continue;
      const qx = x + s * dx - this.cx;
      const qy = y + s * dy - this.cy;
      if (qx * qx + qy * qy <= this.r * this.r) lv |= 1 << k;
    }
    return lv;
  }

  /** Colour `c` as seen through sheets `lv`. */
  apply(c: RGB, lv: number): RGB {
    if (lv === 0) return c;
    let keep = 1;
    if (lv & 1) keep *= 1 - this.alpha[0];
    if (lv & 2) keep *= 1 - this.alpha[1];
    return mixRgb(c, this.fill, 1 - keep);
  }
}

/**
 * Parameter in (a, b) where `level` changes from `la` (its value at a), by
 * bisection; assumes a single change in the interval.
 */
function veilBoundary(level: (t: number) => number, a: number, b: number, la: number): number {
  let lo = a;
  let hi = b;
  for (let k = 0; k < 20; k++) {
    const mid = (lo + hi) / 2;
    if (level(mid) === la) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

const veiledSpecs = new WeakMap<OpSpec, OpSpec[]>();

/** `spec` for pieces seen through sheets `lv`: its own op, so its own colour. */
function veiled(spec: OpSpec, lv: number): OpSpec {
  if (lv === 0) return spec;
  let list = veiledSpecs.get(spec);
  if (!list) {
    list = [];
    veiledSpecs.set(spec, list);
  }
  return (list[lv] ??= { ...spec, key: `${spec.key}~${lv}` });
}
