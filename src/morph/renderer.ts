import { Camera } from './camera.js';
import { computePose, type Pose, type Rigid } from './curtain.js';
import type { MorphModel } from './model.js';
import {
  BULK_MARGIN,
  blendFishnet,
  buildFishnet,
  discRadius,
  fishnetSpacing,
  fitRigid2d,
  sameNetShape,
  type Fishnet,
  type HeightAt,
  type Leaf,
  type SurfaceMesh,
} from './net.js';
import {
  clamp01,
  fmt,
  FOG,
  fogged,
  hexRgb,
  lerp,
  mixRgb,
  type RGB,
  rgbStr,
  sampleProfile,
  saturate,
  smooth,
} from './colour.js';
import {
  type GradientDef,
  hullOf,
  Pooled,
  type Prim,
  Run,
  type RunSlot,
  separated,
} from './engine.js';
import { DEFAULT_MORPH_OPTIONS, type MorphOptions } from './options.js';
import {
  clipHeight,
  MIN_GRID_SPACING,
  NET,
  NET_ALPHA,
  NET_DARKEN,
  NET_FIT_RMS,
  NET_SMOOTHING,
  NET_SMOOTHING_MAX,
  NET_WIDTH,
  other,
  RIM,
  seenFromAbove,
  SHEET_ALPHA,
  sheetsIn,
  SURFACE_ALPHA,
  SURFACE_BANDS,
  SURFACE_EDGES,
  surfaceBand,
  type SurfaceShading,
  thicknessChange,
  Veil,
} from './membrane-layer.js';
import type { FrameCtx } from './prims/frame.js';
import { helixPrims } from './prims/helix.js';
import { loopPrims, tiePrims } from './prims/loop.js';
import { strandPrims } from './prims/strand.js';
import type { PrimColours, PrimEnv } from './prims/env.js';
import { findKink, fitLine, SPLIT_ANGLE } from './prims/kinks.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export { PROJECTIONS } from './projections.js';
export { DEFAULT_MORPH_OPTIONS, type MorphOptions } from './options.js';

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

/** Depth snap (Å) used near t = 0 to preserve the 2-D drawing order. */
const DEPTH_SNAP = 0.05;

/** Number of intervals in the steadying track. */
const STEADY_STEPS = 80;

/** Number of intervals in the zoom track. */
const ZOOM_STEPS = 10;
/** Screen margin (px) the zoom track keeps clear. */
const ZOOM_MARGIN = 12;

/** Model ids of the context chains start at this (times the chain's place + 1). */
const CONTEXT_ID = 1 << 20;
/** Progress over which the context chains fade in. */
const CONTEXT_FADE: [number, number] = [0.5, 0.95];

/** A context chain: shown, rolled up, in its real place around the morphing one. */
interface ContextChain {
  model: MorphModel;
  /** Fixed pose in the finished view's frame (set by precompute). */
  pose: Pose | null;
}

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
    /** The surface style's leaflets, far one first: one path per colour band. */
    surface: [Pooled<SVGPathElement>[], Pooled<SVGPathElement>[]];
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
  /** The leaflets' fishnets at τ = 1, about the final disc centre. */
  private net: Fishnet | null = null;
  /** A membrane being blended into {@link net}, and how far along (0–1). */
  private blend: { from: Fishnet; t: number; drawn: Fishnet | null } | null = null;
  /**
   * Opacity of faded (neighbouring-chain) elements this frame. They start at
   * the 2-D figure's translucency and become opaque — with colours lightened
   * so they look the same over the background — as the protein rolls up: translucent
   * pieces of one element that overlap where it is split for depth sorting
   * would otherwise show darker lines.
   */
  private fadeOpacity = 1;
  /** Coordinate precision of the current frame, steps per px. */
  private coordScale = 100;
  /** Kink of each helix (sample index, −1 = straight), from the real structure. */
  private kinks: Map<number, number> | null = null;
  /** Helices whose kink is sharp enough to draw as two cylinders. */
  private sharpKinks = new Set<number>();
  /** Steadying rigid motion sampled at τ = i / STEADY_STEPS. */
  private steady: Rigid[] = [];
  private readonly tmp = new Float64Array(8);
  private readonly colours: PrimColours;
  /** The background: fog and faded elements mix towards it. */
  private readonly ground: RGB;
  /** Ids of the selected elements and loops. */
  private selected: ReadonlySet<number> = new Set();
  /** The structure's other chains, faded in as the view becomes 3-D. */
  private readonly context: ContextChain[];
  /** Opacity of the context chains this frame. */
  private contextOpacity = 0;
  /** What the helix, strand and loop builders read from this renderer. */
  private readonly prim: PrimEnv;

  constructor(
    readonly model: MorphModel,
    readonly options: MorphOptions = DEFAULT_MORPH_OPTIONS,
    private readonly idPrefix = 'mp',
    context: readonly MorphModel[] = [],
  ) {
    // Context chains are drawn faded, and their ids are kept clear of the
    // morphing chain's (which selection and depth-sorted runs go by).
    this.context = context.map((m, j) => {
      const base = CONTEXT_ID * (j + 1);
      return {
        model: {
          ...m,
          elements: m.elements.map((e) => ({ ...e, id: e.id + base, faded: true })),
          loops: m.loops.map((l) => ({ ...l, id: l.id + base, faded: true })),
        },
        pose: null,
      };
    });
    const st = model.scene.style;
    this.colours = {
      helix: hexRgb(st.helixFill),
      helixEdge: st.helixStroke,
      strand: hexRgb(st.strandFill),
      strandEdge: st.strandStroke,
      coil: hexRgb(st.coil),
    };
    this.ground = hexRgb(st.background);
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
    const bands = () =>
      Array.from({ length: options.membraneStyle === 'surface' ? SURFACE_BANDS : 0 }, () => {
        const path = new Pooled(document.createElementNS(SVG_NS, 'path'));
        path.set('display', 'none');
        backG.append(path.el);
        return path;
      });
    this.back = {
      rim: new Pooled(rim),
      mid: new Pooled(mid),
      discs: [new Pooled(disc0), new Pooled(disc1)],
      surface: [bands(), bands()],
    };
    this.runsG = document.createElementNS(SVG_NS, 'g');
    this.labelsG = document.createElementNS(SVG_NS, 'g');
    this.labelsG.setAttribute('font-family', st.labelFontFamily);
    svg.append(this.defs, backG, this.runsG, this.labelsG);
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    this.prim = {
      model,
      options,
      colours: this.colours,
      ground: this.ground,
      tmp: this.tmp,
      get kinks() {
        return self.kinks;
      },
      sharpKinks: this.sharpKinks,
      precompute: () => this.precompute(),
    };
  }

  /**
   * Mark elements and loops (by model id) as selected: their runs are drawn
   * with wider strokes and carry `class="selected"` and `data-type`, for the
   * page's glow. Takes effect from the next frame.
   */
  /**
   * The membrane as drawn (blended, while a blend runs), or null before the
   * renderer is first configured.
   */
  get drawnNet(): Fishnet | null {
    const b = this.blend;
    if (!b || !this.net || b.t >= 1) return this.net;
    return (b.drawn ??= blendFishnet(b.from, this.net, b.t));
  }

  /**
   * Blend the membrane from `from` (another renderer's {@link drawnNet} of the
   * same chain) to this one's: false, and no blend, if their points differ.
   * The blend starts at the end (t = 1); null ends it.
   */
  blendNetFrom(from: Fishnet | null): boolean {
    this.blend =
      from && this.net && sameNetShape(from, this.net) ? { from, t: 1, drawn: null } : null;
    return this.blend !== null;
  }

  /** Whether the 3-D membrane (lines or surface) shows at progress τ. */
  showsMembrane(tau: number): boolean {
    return sheetsIn(tau) > 0.001;
  }

  /** How far (0–1) the membrane blend is along, from the next frame. */
  setNetBlend(t: number): void {
    if (this.blend) this.blend = { ...this.blend, t, drawn: null };
  }

  setSelected(ids: Iterable<number>): void {
    this.selected = new Set(ids);
  }

  /** `helix`, `strand` or `loop` for a selectable model id. */
  private typeOf(id: number): string | null {
    const els = this.model.elements;
    if (id < 0) return null;
    return id < els.length ? els[id].type : 'loop';
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
        if (e.type !== 'helix') continue;
        const k = findKink(real.w, e.g0, e.g1);
        this.kinks.set(e.id, k);
        if (k < 0) continue;
        const a = fitLine(real.w, e.g0, k).d;
        const b = fitLine(real.w, k, e.g1).d;
        if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < Math.cos(SPLIT_ANGLE))
          this.sharpKinks.add(e.id);
      }
      this.placeContext();
    }
  }

  /**
   * Pose each context chain, fully rolled up, where it really sits relative
   * to the morphing chain once that has rolled up (both rolled-up structures
   * are rigid copies of the real one, so a rigid motion in the membrane plane
   * fitted over the helix and strand samples lines them up), and find its
   * helix kinks.
   */
  private placeContext(): void {
    if (this.context.length === 0) return;
    const focal = computePose(this.model, 1, this.options.sweep, this.rigidAt(1));
    const fs = fitSamples(this.model);
    const toView = fitRigid(realXY(this.model, fs), poseXY(focal, fs));
    for (const c of this.context) {
      const raw = computePose(c.model, 1, 0);
      const cs = fitSamples(c.model);
      const target = realXY(c.model, cs);
      for (let i = 0; i < target.length; i += 2) {
        const x = target[i];
        const y = target[i + 1];
        target[i] = Math.cos(toView.phi) * x - Math.sin(toView.phi) * y + toView.tx;
        target[i + 1] = Math.sin(toView.phi) * x + Math.cos(toView.phi) * y + toView.ty;
      }
      c.pose = computePose(c.model, 1, 0, fitRigid(poseXY(raw, cs), target));
      for (const e of c.model.elements) {
        if (e.type !== 'helix') continue;
        const k = findKink(c.pose.w, e.g0, e.g1);
        this.kinks!.set(e.id, k);
        if (k < 0) continue;
        const a = fitLine(c.pose.w, e.g0, k).d;
        const b = fitLine(c.pose.w, k, e.g1).d;
        if (a[0] * b[0] + a[1] * b[1] + a[2] * b[2] < Math.cos(SPLIT_ANGLE))
          this.sharpKinks.add(e.id);
      }
    }
  }

  /**
   * Fix the start and end framing. `clientWidth` is the visible width of the
   * scroll container and `scroll0` its scroll offset at the 2-D end. A
   * finite `fillHeight` makes the 3-D view exactly that tall (full screen).
   */
  configure(clientWidth: number, scroll0: number, fillHeight = Infinity): void {
    const { model, options } = this;
    const fr = model.scene.frame;
    const { upper, lower } = model.scene.slab;
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
    // The finished view takes in the context chains too.
    const all: { model: MorphModel; pose: Pose }[] = [{ model, pose }];
    for (const c of this.context) if (c.pose) all.push({ model: c.model, pose: c.pose });
    for (const { model: m, pose: p } of all.slice(1)) {
      for (let k = 0; k < m.n; k++) {
        x0 = Math.min(x0, p.w[k * 4]);
        x1 = Math.max(x1, p.w[k * 4]);
        y0 = Math.min(y0, p.w[k * 4 + 1]);
        y1 = Math.max(y1, p.w[k * 4 + 1]);
        z0 = Math.min(z0, p.w[k * 4 + 2]);
        z1 = Math.max(z1, p.w[k * 4 + 2]);
      }
    }
    // The membrane disc is centred on (and sized to) the transmembrane
    // helices and strands; loops are allowed to stray outside it.
    for (const { model: m, pose: p } of all) {
      for (const el of m.elements) {
        for (let k = el.g0; k <= el.g1; k++) {
          const z = p.w[k * 4 + 2];
          if (z > upper + 2 || z < lower - 2) continue;
          tx0 = Math.min(tx0, p.w[k * 4]);
          tx1 = Math.max(tx1, p.w[k * 4]);
          ty0 = Math.min(ty0, p.w[k * 4 + 1]);
          ty1 = Math.max(ty1, p.w[k * 4 + 1]);
        }
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
    for (const { model: m, pose: p } of all) {
      for (const el of m.elements) {
        for (let k = el.g0; k <= el.g1; k++) {
          const z = p.w[k * 4 + 2];
          if (z > upper + 2 || z < lower - 2) continue;
          dr = Math.max(dr, Math.hypot(p.w[k * 4] - dcx, p.w[k * 4 + 1] - dcy));
        }
      }
    }
    dr = discRadius(dr);
    x0 = Math.min(x0, dcx - dr);
    x1 = Math.max(x1, dcx + dr);
    y0 = Math.min(y0, dcy - dr);
    y1 = Math.max(y1, dcy + dr);
    z0 = Math.min(z0, lower);
    z1 = Math.max(z1, upper);
    const target1: [number, number, number] = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];

    // Fit the finished view: content extent seen from the final camera.
    const width0 = fr.width;
    const height0 = fr.height;
    const width1 = Math.max(200, clientWidth);
    const margin = 28;
    const pts: [number, number, number][] = [];
    for (const { model: m, pose: p } of all)
      for (let k = 0; k < m.n; k += 4) pts.push([p.w[k * 4], p.w[k * 4 + 1], p.w[k * 4 + 2]]);
    for (let a = 0; a < 24; a++) {
      const c = Math.cos((a / 24) * 2 * Math.PI);
      const s = Math.sin((a / 24) * 2 * Math.PI);
      pts.push([dcx + dr * c, dcy + dr * s, upper], [dcx + dr * c, dcy + dr * s, lower]);
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
    const height1 = Number.isFinite(fillHeight)
      ? Math.max(120, Math.round(fillHeight))
      : Math.round(Math.min(640, Math.max(height0, 360, Math.min(2 * ey1 * sw + 2 * margin, 640))));
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
    // The pose and disc don't depend on the width, so a refit keeps the net.
    this.net ??= this.buildNet(pose, dcx, dcy, dr);
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
    this.contextOpacity = smooth(CONTEXT_FADE[0], CONTEXT_FADE[1], tau);
    const eW = smooth(0.0, 0.55, tau);
    const eLoop = smooth(0.0, 0.7, tau);
    const eDisc = sheetsIn(tau);
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
    // The context chains share the depth range always, so the fog doesn't
    // jump when they appear.
    for (const c of this.context) {
      if (!c.pose) continue;
      for (let k = 0; k < c.model.n; k++) {
        cam.project(c.pose.w[k * 4], c.pose.w[k * 4 + 1], c.pose.w[k * 4 + 2], this.tmp);
        if (this.tmp[2] < dMin) dMin = this.tmp[2];
        if (this.tmp[2] > dMax) dMax = this.tmp[2];
      }
    }
    const fogAt = (d: number): number =>
      dMax - dMin > 1e-6 ? FOG * sigma * clamp01((d - dMin) / (dMax - dMin)) : 0;

    // Membrane: the leaflet sheets' fills go behind the protein, which takes
    // their tint where it is seen through them (see Veil); only their rims are
    // depth-sorted with the protein.
    const { upper, lower } = model.scene.slab;
    const discX = lerp((model.slabX0 + model.slabX1) / 2, F.disc1.x, eCam);
    const discY = lerp(0, F.disc1.y, eCam);
    const discR = lerp((model.slabX1 - model.slabX0) / 2, F.disc1.r, eCam);
    const planesOn = eDisc > 0.001 && Math.abs(cam.p.el) > 1e-3;
    const mesh = this.drawnNet?.mesh;
    const surface = mesh
      ? this.surfaceShading(this.drawnNet!.heightAt, mesh, discR / F.disc1.r, upper, lower)
      : null;
    const veil = new Veil(
      cam,
      discX,
      discY,
      discR,
      upper,
      lower,
      planesOn ? eDisc : 0,
      hexRgb(st.membraneFill),
      surface,
    );
    // The 2-D membrane's local rises and drops flatten onto the bulk planes
    // early on, before the leaflet sheets appear.
    const keepProfile = 1 - smooth(0, 0.3, tau);
    this.drawBackRim(cam, discX, discY, discR, upper, lower, sigma, keepProfile);
    this.drawDiscs(cam, discX, discY, discR, upper, lower, planesOn ? eDisc : 0, surface);

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
      if (el.type === 'helix') helixPrims(this.prim, ctx, el);
      else strandPrims(this.prim, ctx, el);
    }
    for (const loop of model.loops) loopPrims(this.prim, ctx, loop);
    if (this.contextOpacity > 0.001) {
      // Already rolled up: drawn at their full 3-D size and shape.
      for (const c of this.context) {
        if (!c.pose) continue;
        const cc: FrameCtx = {
          ...ctx,
          model: c.model,
          pose: c.pose,
          eW: 1,
          eLoop: 1,
          endShift: new Map(),
        };
        for (const el of c.model.elements) {
          if (el.type === 'helix') helixPrims(this.prim, cc, el);
          else strandPrims(this.prim, cc, el);
        }
        for (const loop of c.model.loops) loopPrims(this.prim, cc, loop);
      }
    }
    if (tieAlpha > 0.001) tiePrims(this.prim, ctx, tieAlpha * 0.5);
    if (planesOn) {
      this.rimPrims(ctx, discX, discY, discR, upper, lower, eDisc);
      this.netPrims(ctx, discX, discY, discR / F.disc1.r, upper, lower, eDisc);
    }

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

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Far half of the membrane's rim, with the midplane on it. `keepProfile`
   * (1 at t = 0) is how much of the 2-D membrane's local rises and drops the
   * rim still shows; at 0 it is the flat bulk band.
   */
  private drawBackRim(
    cam: Camera,
    cxw: number,
    cyw: number,
    r: number,
    upper: number,
    lower: number,
    sigma: number,
    keepProfile: number,
  ): void {
    const st = this.model.scene.style;
    const slab = this.model.scene.slab;
    const profile = keepProfile > 1e-3 ? slab.profile : undefined;
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
    // While the 2-D profile shows, sample the arc as densely as the profile
    // and evenly in x at t = 0 (when the arc is seen edge-on), so the first
    // frame matches the 2-D path.
    const N = profile ? Math.max(48, Math.min(profile.x.length, 1200)) : 48;
    const top: number[] = [];
    const bot: number[] = [];
    const midPts: number[] = [];
    for (let i = 0; i <= N; i++) {
      const a = profile
        ? a0 + ((a1 - a0) * Math.acos(1 - (2 * i) / N)) / Math.PI
        : a0 + ((a1 - a0) * i) / N;
      const c = Math.cos(a);
      const x = cxw + r * c;
      const y = cyw + r * Math.sin(a);
      let zTop = upper;
      let zBot = lower;
      if (profile) {
        // Edge-on, the arc spans the 2-D membrane from x0 to x1.
        const xd = slab.x0 + ((c + 1) / 2) * (slab.x1 - slab.x0);
        zTop += keepProfile * (sampleProfile(profile.x, profile.upper, xd) - upper);
        zBot += keepProfile * (sampleProfile(profile.x, profile.lower, xd) - lower);
      }
      cam.project(x, y, zTop, this.tmp);
      top.push(this.tmp[0], this.tmp[1]);
      cam.project(x, y, zBot, this.tmp);
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
   * cytoplasmic side stays legible. In the surface style each leaflet is its
   * mesh instead, at its own heights and coloured by them.
   */
  private drawDiscs(
    cam: Camera,
    cxw: number,
    cyw: number,
    r: number,
    upper: number,
    lower: number,
    eDisc: number,
    surface: SurfaceShading | null,
  ): void {
    const st = this.model.scene.style;
    const [far, near] = this.back.discs;
    const hideBands = () => {
      for (const bands of this.back.surface) for (const b of bands) b.set('display', 'none');
    };
    if (eDisc <= 0 || surface) {
      far.set('display', 'none');
      near.set('display', 'none');
    }
    if (eDisc <= 0 || !surface) hideBands();
    if (eDisc <= 0) return;
    // Seen from above, the lower leaflet is the far one.
    const fromAbove = seenFromAbove(cam);
    if (surface) {
      for (const leaf of ['upper', 'lower'] as const) {
        const bands = this.back.surface[(leaf === 'upper') === fromAbove ? 1 : 0];
        const d = this.surfacePaths(
          cam,
          cxw,
          cyw,
          leaf,
          leaf === 'upper' ? upper : lower,
          eDisc,
          surface,
        );
        d.forEach((path, i) => {
          const band = bands[i];
          if (!path) {
            band.set('display', 'none');
            return;
          }
          band.set('display', null);
          band.set('d', path);
          band.set('fill', rgbStr(surface.colours[i]));
          band.set('fill-opacity', (SURFACE_ALPHA[leaf] * eDisc).toFixed(3));
        });
      }
      return;
    }
    for (const which of ['top', 'bottom'] as const) {
      const zp = which === 'top' ? upper : lower;
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

  /**
   * One leaflet's mesh as a path per colour band, growing out of the bulk
   * plane with `grow`. Each quad is split into two triangles and each
   * triangle cut where the thickness change crosses a band edge (it varies
   * linearly across it), so the bands meet along smooth contours. Every piece is wound
   * the same way on screen, so pieces that meet or overlap within a band fill
   * once, with no seams.
   */
  private surfacePaths(
    cam: Camera,
    cxw: number,
    cyw: number,
    leaf: Leaf,
    bulk: number,
    grow: number,
    surface: SurfaceShading,
  ): string[] {
    const { k, mesh } = surface;
    const zs = mesh[leaf];
    const dt = surface.change[leaf];
    const nv = zs.length;
    const p = new Float64Array(nv * 2);
    for (let v = 0; v < nv; v++) {
      if (Number.isNaN(zs[v])) continue;
      cam.project(
        cxw + k * mesh.xy[v * 2],
        cyw + k * mesh.xy[v * 2 + 1],
        bulk + grow * (zs[v] - bulk),
        this.tmp,
      );
      p[v * 2] = this.tmp[0];
      p[v * 2 + 1] = this.tmp[1];
    }
    const out: string[] = new Array<string>(SURFACE_BANDS).fill('');
    const emit = (band: number, poly: number[]) => {
      const m = poly.length / 3;
      if (m < 3) return;
      let area = 0;
      for (let i = 0; i < m; i++) {
        const j = (i + 1) % m;
        area += poly[i * 3] * poly[j * 3 + 1] - poly[j * 3] * poly[i * 3 + 1];
      }
      let d = '';
      for (let q = 0; q < m; q++) {
        const i = area >= 0 ? q : m - 1 - q;
        d += (q === 0 ? 'M' : 'L') + poly[i * 3].toFixed(1) + ',' + poly[i * 3 + 1].toFixed(1);
      }
      out[band] += d + 'Z';
    };
    // A triangle as flat (screen x, screen y, thickness change) triples.
    const triangle = (poly: number[]) => {
      const lo = surfaceBand(Math.min(poly[2], poly[5], poly[8]));
      const hi = surfaceBand(Math.max(poly[2], poly[5], poly[8]));
      for (let band = lo; band <= hi; band++) {
        let piece = poly;
        if (band > lo) piece = clipHeight(piece, SURFACE_EDGES[band - 1], 1);
        if (band < hi) piece = clipHeight(piece, SURFACE_EDGES[band], -1);
        emit(band, piece);
      }
    };
    const vertex = (v: number) => [p[v * 2], p[v * 2 + 1], dt[v]];
    // A point of a quad at final (ox, oy), height h and thickness change c, as a triple.
    const point = (ox: number, oy: number, h: number, c: number) => {
      cam.project(cxw + k * ox, cyw + k * oy, bulk + grow * (h - bulk), this.tmp);
      return [this.tmp[0], this.tmp[1], c];
    };
    const q = mesh.quads;
    const xy = mesh.xy;
    for (let i = 0; i < q.length; i += 4) {
      const corners = [q[i], q[i + 1], q[i + 2], q[i + 3]];
      const open = corners.map((v) => Number.isNaN(zs[v]));
      if (!open.includes(true)) {
        const [a, b, c, e] = corners.map(vertex);
        triangle([...a, ...b, ...c]);
        triangle([...a, ...c, ...e]);
        continue;
      }
      // Next to a pore, the quarter of the quad nearest each lipid corner,
      // with heights as the sampler gives them (open corners left out of the
      // bilinear mean), so the hole matches where the tint stops.
      const finite = corners.filter((_, j) => !open[j]);
      if (!finite.length) continue;
      const mx = corners.reduce((sum, v) => sum + xy[v * 2], 0) / 4;
      const my = corners.reduce((sum, v) => sum + xy[v * 2 + 1], 0) / 4;
      const mean = (a: Float64Array) => finite.reduce((sum, v) => sum + a[v], 0) / finite.length;
      const centre = point(mx, my, mean(zs), mean(dt));
      const half = (v: number, w: number) => {
        const pore = Number.isNaN(zs[w]);
        return point(
          (xy[v * 2] + xy[w * 2]) / 2,
          (xy[v * 2 + 1] + xy[w * 2 + 1]) / 2,
          pore ? zs[v] : (zs[v] + zs[w]) / 2,
          pore ? dt[v] : (dt[v] + dt[w]) / 2,
        );
      };
      corners.forEach((v, j) => {
        if (open[j]) return;
        const c = vertex(v);
        const toNext = half(v, corners[(j + 1) % 4]);
        const toPrev = half(v, corners[(j + 3) % 4]);
        triangle([...c, ...toNext, ...centre]);
        triangle([...c, ...centre, ...toPrev]);
      });
    }
    return out;
  }

  /** The surface style's colours and heights, for the sheets and the veil. */
  private surfaceShading(
    heightAt: Fishnet['heightAt'],
    mesh: SurfaceMesh,
    k: number,
    upper: number,
    lower: number,
  ): SurfaceShading {
    const st = this.model.scene.style;
    const fill = hexRgb(st.membraneFill);
    const thinned = hexRgb(st.membraneThinned);
    const thickened = hexRgb(st.membraneThickened);
    const half = (SURFACE_BANDS - 1) / 2;
    const colours = Array.from({ length: SURFACE_BANDS }, (_, i) => {
      const t = (i - half) / half;
      return t >= 0 ? mixRgb(fill, thickened, t) : mixRgb(fill, thinned, -t);
    });
    const bulk = { upper, lower };
    const changeAt = (leaf: Leaf, ox: number, oy: number) =>
      thicknessChange(leaf, heightAt(leaf, ox, oy), heightAt(other(leaf), ox, oy), bulk);
    const change = (leaf: Leaf) =>
      mesh[leaf].map((z, v) => thicknessChange(leaf, z, mesh[other(leaf)][v], bulk));
    const range = (zs: Float64Array): [number, number] => {
      let lo = Infinity;
      let hi = -Infinity;
      for (const z of zs) {
        if (z < lo) lo = z;
        if (z > hi) hi = z;
      }
      return lo <= hi ? [lo, hi] : [0, 0];
    };
    return {
      heightAt,
      mesh,
      range: { upper: range(mesh.upper), lower: range(mesh.lower) },
      change: { upper: change('upper'), lower: change('lower') },
      changeAt,
      k,
      colours,
    };
  }

  /** Rims of the leaflet sheets, depth-sorted with the protein. */
  private rimPrims(
    ctx: FrameCtx,
    cxw: number,
    cyw: number,
    r: number,
    upper: number,
    lower: number,
    alpha: number,
  ): void {
    const { cam, prims } = ctx;
    const edge = hexRgb(this.model.scene.style.membraneEdge);
    const N = 64;
    for (const [k, zp] of [
      [0, upper],
      [1, lower],
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

  /**
   * The leaflets' fishnets for the finished view (see net.ts). Local heights
   * are looked up in the frame of the scene's sample positions, which the
   * finished pose holds up to a turn about z and a shift; that motion is
   * fitted from the helix and strand samples.
   */
  private buildNet(pose: Pose, dcx: number, dcy: number, dr: number): Fishnet {
    const { model } = this;
    const slab = model.scene.slab;
    const segOf: number[] = [];
    const sampleOf: number[] = [];
    model.scene.segments.forEach((seg, s) => {
      for (let i = 0; i < seg.display.length; i++) {
        segOf.push(s);
        sampleOf.push(i);
      }
    });
    const protein: number[] = [];
    const real: number[] = [];
    const world: number[] = [];
    for (const el of model.elements) {
      for (let k = el.g0; k <= el.g1; k++) {
        const x = pose.w[k * 4];
        const y = pose.w[k * 4 + 1];
        const z = pose.w[k * 4 + 2];
        if (z <= slab.upper + 2 && z >= slab.lower - 2) protein.push(x, y);
        const p = model.scene.segments[segOf[k]]?.positions[sampleOf[k]];
        if (!p) continue;
        real.push(p.x, p.y);
        world.push(x, y);
      }
    }
    const spacing =
      this.options.gridSpacing > 0
        ? Math.min(dr, Math.max(MIN_GRID_SPACING, this.options.gridSpacing))
        : fishnetSpacing(dr);
    let local: { upper: HeightAt; lower: HeightAt; radius: number } | undefined;
    const surface = slab.surface;
    const fit = surface ? fitRigid2d(real, world) : null;
    // A misfit means the sample positions aren't the structure's own frame.
    if (surface && fit && fit.rms < NET_FIT_RMS) {
      // Averaged over about a grid cell, so single-frame noise doesn't
      // show as spikes, but not so wide that the shape is lost.
      local = {
        upper: (x, y, radius) => surface.upper(...fit.invert(x, y), radius),
        lower: (x, y, radius) => surface.lower(...fit.invert(x, y), radius),
        radius: Math.min(NET_SMOOTHING_MAX, Math.max(NET_SMOOTHING, 1.5 * spacing)),
      };
    }
    // The context chains hold the membrane back too.
    for (const c of this.context) {
      if (!c.pose) continue;
      for (const el of c.model.elements) {
        for (let k = el.g0; k <= el.g1; k++) {
          const z = c.pose.w[k * 4 + 2];
          if (z <= slab.upper + 2 && z >= slab.lower - 2)
            protein.push(c.pose.w[k * 4], c.pose.w[k * 4 + 1]);
        }
      }
    }
    return buildFishnet({
      centre: { x: dcx, y: dcy },
      radius: dr,
      bulk: { upper: slab.upper, lower: slab.lower },
      annular: slab.annular ?? { upper: slab.upper, lower: slab.lower },
      protein,
      local,
      spacing,
      margin: BULK_MARGIN,
      style: this.options.membraneStyle,
    });
  }

  /**
   * The leaflets' fishnets, depth-sorted with the protein. They grow out of
   * the bulk planes as the sheets fade in (`alpha`); `k` scales the final
   * disc onto the current one.
   */
  private netPrims(
    ctx: FrameCtx,
    cxw: number,
    cyw: number,
    k: number,
    upper: number,
    lower: number,
    alpha: number,
  ): void {
    const net = this.drawnNet;
    if (!net) return;
    const { cam, prims, fogAt } = ctx;
    const st = this.model.scene.style;
    const edge = mixRgb(hexRgb(st.membraneEdge), hexRgb(st.midplane), NET_DARKEN);
    const ground = this.ground;
    let sub = 0;
    for (const [leaf, bulk, id] of [
      ['upper', upper, -13],
      ['lower', lower, -14],
    ] as const) {
      const opacity = NET_ALPHA[leaf] * alpha;
      for (const line of net[leaf]) {
        const m = line.length / 3;
        const p = new Float64Array(m * 3);
        for (let i = 0; i < m; i++) {
          const z = bulk + alpha * (line[i * 3 + 2] - bulk);
          cam.project(cxw + k * line[i * 3], cyw + k * line[i * 3 + 1], z, this.tmp);
          p[i * 3] = this.tmp[0];
          p[i * 3 + 1] = this.tmp[1];
          p[i * 3 + 2] = this.tmp[2];
        }
        for (let i = 0; i < m - 1; i++) {
          // Open over pores.
          if (Number.isNaN(line[i * 3 + 2] + line[i * 3 + 5])) continue;
          const pts = [p[i * 3], p[i * 3 + 1], p[i * 3 + 3], p[i * 3 + 4]];
          const depth = (p[i * 3 + 2] + p[i * 3 + 5]) / 2;
          const c = fogged(edge, fogAt(depth), ground);
          prims.push({
            id,
            order: -1,
            sub: sub++,
            depth,
            x0: Math.min(pts[0], pts[2]) - 1,
            y0: Math.min(pts[1], pts[3]) - 1,
            x1: Math.max(pts[0], pts[2]) + 1,
            y1: Math.max(pts[1], pts[3]) + 1,
            faded: false,
            pts,
            pad: 0.5,
            emit: (run) => run.stroke(NET, pts, c, NET_WIDTH, opacity),
          });
        }
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
        const opaque =
          !p.faded ||
          (this.fadeOpacity >= 0.999 && (p.id < CONTEXT_ID || this.contextOpacity >= 0.999));
        runs.push(new Run(p.id, p.faded, opaque, this.coordScale));
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
    // Mix faded colours towards the background so that, drawn at `fadeA`,
    // they look as they did at the 2-D opacity over it.
    const k = fadedOpacity / fadeA;
    const bg = this.ground;
    const lighten = (c: RGB): RGB => [
      bg[0] - k * (bg[0] - c[0]),
      bg[1] - k * (bg[1] - c[1]),
      bg[2] - k * (bg[2] - c[2]),
    ];
    const sat = this.model.scene.style.unselectedSaturation;
    const desaturate = (c: RGB): RGB => saturate(c, sat);
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
      const runA = run.faded ? fadeA * (run.id >= CONTEXT_ID ? this.contextOpacity : 1) : 1;
      slot.g.set('opacity', runA < 0.999 ? runA.toFixed(3) : null);
      const sel = this.selected.has(run.id);
      // Everything else is desaturated while there is a selection (as in 2-D,
      // the faded neighbouring chains are left alone).
      const dull = !sel && !run.faded && this.selected.size > 0 && this.typeOf(run.id) !== null;
      slot.g.set('class', sel ? 'selected' : null);
      slot.g.set('data-type', sel ? this.typeOf(run.id) : null);
      const widthScale = sel ? this.model.scene.style.selectionWidthScale : 1;
      const tint = run.faded ? lighten : dull ? desaturate : (c: RGB): RGB => c;
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
          path.set(
            'stroke-width',
            ((op.width[0] / Math.max(1, op.width[1])) * widthScale).toFixed(2),
          );
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

/**
 * Samples a rolled-up chain is lined up by: its helices and strands (loops are
 * smoothed, so they don't sit exactly on their real path), or every sample of
 * a chain without any.
 */
function fitSamples(model: MorphModel): number[] {
  const out: number[] = [];
  for (const e of model.elements) for (let g = e.g0; g <= e.g1; g++) out.push(g);
  return out.length >= 3 ? out : Array.from({ length: model.n }, (_, g) => g);
}

/** Real xy of the given samples, flat (x, y) pairs. */
function realXY(model: MorphModel, samples: number[]): number[] {
  const out: number[] = [];
  let s = 0;
  for (const g of samples) {
    while (s + 1 < model.segStart.length && model.segStart[s + 1] <= g) s++;
    while (s > 0 && model.segStart[s] > g) s--;
    const p = model.scene.segments[s].positions[g - model.segStart[s]];
    out.push(p?.x ?? 0, p?.y ?? 0);
  }
  return out;
}

/** Posed xy of the given samples, flat (x, y) pairs. */
function poseXY(pose: Pose, samples: number[]): number[] {
  const out: number[] = [];
  for (const g of samples) out.push(pose.w[g * 4], pose.w[g * 4 + 1]);
  return out;
}

/** Rotation about z and shift that best map `src` onto `dst` (least squares). */
function fitRigid(src: number[], dst: number[]): Rigid {
  const m = src.length / 2;
  if (m === 0) return { phi: 0, tx: 0, ty: 0 };
  let qx = 0,
    qy = 0,
    px = 0,
    py = 0;
  for (let j = 0; j < m; j++) {
    qx += src[j * 2] / m;
    qy += src[j * 2 + 1] / m;
    px += dst[j * 2] / m;
    py += dst[j * 2 + 1] / m;
  }
  let dot = 0;
  let crs = 0;
  for (let j = 0; j < m; j++) {
    const ax = src[j * 2] - qx;
    const ay = src[j * 2 + 1] - qy;
    const bx = dst[j * 2] - px;
    const by = dst[j * 2 + 1] - py;
    dot += ax * bx + ay * by;
    crs += ax * by - ay * bx;
  }
  const phi = Math.atan2(crs, dot);
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  return { phi, tx: px - (c * qx - s * qy), ty: py - (s * qx + c * qy) };
}
