import { Camera } from './camera.js';
import { computePose, type Pose, type Rigid } from './curtain.js';
import type { MorphModel } from './model.js';
import { blendFishnet, discRadius, sameNetShape, type Fishnet } from './net.js';
import { clamp01, FOG, hexRgb, lerp, type RGB, smooth } from './colour.js';
import { Pooled, type Prim } from './engine.js';
import { DEFAULT_MORPH_OPTIONS, type MorphOptions } from './options.js';
import { sheetsIn, SURFACE_BANDS, Veil } from './membrane-layer.js';
import type { FrameCtx } from './prims/frame.js';
import { helixPrims } from './prims/helix.js';
import { loopPrims, tiePrims } from './prims/loop.js';
import { strandPrims } from './prims/strand.js';
import type { PrimColours, PrimEnv } from './prims/env.js';
import { findKink, fitLine, SPLIT_ANGLE } from './prims/kinks.js';
import { CONTEXT_ID, mergeRuns, RunWriter } from './engine.js';
import type { RunLook } from './engine.js';
import {
  type BackLayer,
  buildNet,
  drawBackRim,
  drawDiscs,
  type MembraneEnv,
  netPrims,
  rimPrims,
  surfaceShading,
} from './membrane-layer.js';
import type { ContextChain } from './prims/frame.js';

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

/** Progress over which the context chains fade in. */
const CONTEXT_FADE: [number, number] = [0.5, 0.95];

/**
 * Renders the morph between the 2-D topology view (τ = 0) and a 3-D
 * Richardson-style diagram (τ = 1) as plain SVG, so the first frame is the
 * 2-D picture itself and every frame stays vector.
 */
export class MorphRenderer {
  readonly svg: SVGSVGElement;
  private readonly defs: SVGDefsElement;
  private readonly back: BackLayer;
  private readonly runsG: SVGGElement;
  /** Writes each frame's runs into the runs group, reusing its elements. */
  private readonly writer: RunWriter;
  private readonly labelsG: SVGGElement;
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
  /** What the membrane layer reads from this renderer. */
  private readonly membrane: MembraneEnv;

  constructor(
    readonly model: MorphModel,
    readonly options: MorphOptions = DEFAULT_MORPH_OPTIONS,
    idPrefix = 'mp',
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
    this.writer = new RunWriter(this.runsG, this.defs, idPrefix);
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
    this.membrane = {
      model,
      options,
      ground: this.ground,
      tmp: this.tmp,
      back: this.back,
      context: this.context,
      get drawnNet() {
        return self.drawnNet;
      },
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
    this.net ??= buildNet(this.membrane, pose, dcx, dcy, dr);
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
      ? surfaceShading(
          this.membrane,
          this.drawnNet!.heightAt,
          mesh,
          discR / F.disc1.r,
          upper,
          lower,
        )
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
    drawBackRim(this.membrane, cam, discX, discY, discR, upper, lower, sigma, keepProfile);
    drawDiscs(this.membrane, cam, discX, discY, discR, upper, lower, planesOn ? eDisc : 0, surface);

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
      rimPrims(this.membrane, ctx, discX, discY, discR, upper, lower, eDisc);
      netPrims(this.membrane, ctx, discX, discY, discR / F.disc1.r, upper, lower, eDisc);
    }

    // Near t = 0 everything is (almost) level, so depths are snapped to keep
    // the 2-D drawing order; the snap fades out as depth becomes meaningful,
    // since in 3-D it would make near-level pieces swap back and forth.
    const quantum = DEPTH_SNAP * (1 - smooth(0, 0.3, tau));
    if (quantum > 1e-6) for (const p of prims) p.depth = Math.round(p.depth / quantum);
    prims.sort((a, b) => b.depth - a.depth || a.order - b.order || a.sub - b.sub);

    const look: RunLook = {
      style: model.scene.style,
      ground: this.ground,
      fadeOpacity: this.fadeOpacity,
      contextOpacity: this.contextOpacity,
      coordScale: this.coordScale,
      selected: this.selected,
      typeOf: (id) => this.typeOf(id),
    };
    this.writer.emit(mergeRuns(prims, width, height, look), look);
    this.drawLabels(ctx, labelAlpha);

    this.svg.setAttribute('viewBox', `0 0 ${width.toFixed(2)} ${height.toFixed(2)}`);
    this.svg.setAttribute('width', width.toFixed(2));
    this.svg.setAttribute('height', height.toFixed(2));
    return { width, height, scrollLeft };
  }

  // ── Primitive builders ────────────────────────────────────────────────

  // ── Helpers ───────────────────────────────────────────────────────────

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
