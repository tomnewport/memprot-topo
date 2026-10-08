import { catmullRomBezier, type Vec } from '../unroll/index.js';
import type { MorphScene } from './types.js';

/**
 * Pre-computed, frame-independent data for the 2-D → 3-D morph.
 *
 * Every spline sample of the chain gets two descriptions on a common
 * "curtain" — the vertical, developable surface that the 2-D view is the
 * unrolling of:
 *
 *   - display: (ud, zd) — where the 2-D view draws it;
 *   - real:    (ua, zr, nr, br) — its attachment position along the curtain,
 *     height, and offsets along the curtain normal (nr) and tangent (br) that
 *     reproduce its true 3-D position once the curtain is rolled up.
 *
 * For an arc-length unroll the curtain is the chain's own xy path, so every
 * sample lies on it (nr = br = 0). For a β-barrel unwrap the curtain is the
 * barrel cylinder and the offsets carry each residue's departure from it.
 */
export interface MorphModel {
  scene: MorphScene;
  /** Total samples across all segments. */
  n: number;
  /** Global index of each segment's first sample. */
  segStart: number[];
  ud: Float64Array;
  zd: Float64Array;
  ua: Float64Array;
  zr: Float64Array;
  nr: Float64Array;
  br: Float64Array;
  /** Display position normalised to [0, 1] (drives the rolling sweep). */
  pos: Float64Array;
  /** Polyline mode: real xy direction of each step, relative to the anchor step. */
  stepTheta: Float64Array;
  /** Cylinder mode: winding sense and radius of the curtain cylinder. */
  sign: number;
  radius: number;
  /** Sample that stays put while the curtain rolls up around it. */
  anchor: number;
  elements: ModelElement[];
  loops: ModelLoop[];
  labels: ModelLabel[];
  ties: ModelTie[];
  /** Membrane slab x-extent in world units at t = 0. */
  slabX0: number;
  slabX1: number;
}

export interface ModelElement {
  id: number;
  type: 'helix' | 'strand';
  g0: number;
  g1: number;
  withArrow: boolean;
  faded: boolean;
  order: number;
}

export interface ModelLoop {
  id: number;
  /** 2-D loop curve, flattened: (arc, z) pairs in display Å. */
  syn: Float64Array;
  /** Normalised arc-length parameter of each `syn` point. */
  synS: Float64Array;
  /** Global sample indices of the real path, in chain order. */
  real: Int32Array;
  /** Normalised 3-D arc-length parameter of each `real` sample. */
  realS: Float64Array;
  fromG: number;
  toG: number;
  discontinuous: boolean;
  faded: boolean;
  order: number;
  /** Approximate length (Å) of the longer of the two paths. */
  length: number;
  /** Length (Å) of the 2-D loop curve — sets the dash spacing. */
  synLength: number;
}

export interface ModelLabel {
  g: number;
  /** Bounds of the label's segment (global indices) for tangent lookup. */
  segLo: number;
  segHi: number;
  text: string;
  isStart: boolean;
}

export interface ModelTie {
  a: number;
  az: number;
  b: number;
  bz: number;
}

function wrapPi(d: number): number {
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d <= -Math.PI) d += 2 * Math.PI;
  return d;
}

/** Points per cubic Bézier segment when flattening the 2-D loop curves. */
const BEZIER_STEPS = 32;

function flattenLoop(points: { arc: number; z: number }[]): number[] {
  const bez = catmullRomBezier(points.map((p) => ({ x: p.arc, y: p.z, z: 0 })));
  const out: number[] = [bez.start.x, bez.start.y];
  let p0: Vec = bez.start;
  for (const seg of bez.segments) {
    for (let k = 1; k <= BEZIER_STEPS; k++) {
      const t = k / BEZIER_STEPS;
      const u = 1 - t;
      const a = u * u * u;
      const b = 3 * u * u * t;
      const c = 3 * u * t * t;
      const d = t * t * t;
      out.push(
        a * p0.x + b * seg.c1.x + c * seg.c2.x + d * seg.end.x,
        a * p0.y + b * seg.c1.y + c * seg.c2.y + d * seg.end.y,
      );
    }
    p0 = seg.end;
  }
  return out;
}

function normalisedArc(xs: ArrayLike<number>, stride: number, dims: number): Float64Array {
  const count = xs.length / stride;
  const s = new Float64Array(count);
  let acc = 0;
  for (let i = 1; i < count; i++) {
    let d2 = 0;
    for (let k = 0; k < dims; k++) {
      const d = xs[i * stride + k] - xs[(i - 1) * stride + k];
      d2 += d * d;
    }
    acc += Math.sqrt(d2);
    s[i] = acc;
  }
  if (acc > 0) for (let i = 0; i < count; i++) s[i] /= acc;
  else for (let i = 0; i < count; i++) s[i] = count > 1 ? i / (count - 1) : 0;
  return s;
}

/** Gaussian width (in samples, ~16 per residue) used to smooth loop paths. */
const LOOP_SMOOTH_SIGMA = 14;
/** Samples over which an element-to-loop step is blended out. */
const JUMP_FALLOFF = 24;

/**
 * Smooth the 3-D path of everything that is not a helix or strand. Loops are
 * traced through raw Cα, which zigzag, and start a few Å away from where the
 * neighbouring element's axis ends (elements are drawn on their axis); a
 * Richardson diagram draws them as smooth ropes leaving the element ends.
 *
 * Two passes per loop: first the jumps at both ends are blended out so the
 * path is continuous with the elements, then a Gaussian smooths it with the
 * element samples as fixed boundary values. Element samples are untouched and
 * smoothing never crosses a chain break.
 */
function smoothLoops(
  px: Float64Array,
  py: Float64Array,
  pz: Float64Array,
  elements: ModelElement[],
  segStart: number[],
  n: number,
): void {
  const fixed = new Uint8Array(n);
  for (const e of elements) for (let g = e.g0; g <= e.g1; g++) fixed[g] = 1;
  const coords = [px, py, pz];

  // Pass 1: remove the step between an element end and the adjoining loop.
  for (let s = 0; s < segStart.length; s++) {
    const lo = segStart[s];
    const hi = s + 1 < segStart.length ? segStart[s + 1] - 1 : n - 1;
    let g = lo;
    while (g <= hi) {
      if (fixed[g]) {
        g++;
        continue;
      }
      let j = g;
      while (j + 1 <= hi && !fixed[j + 1]) j++;
      const p = g - 1 >= lo ? g - 1 : -1;
      const q = j + 1 <= hi ? j + 1 : -1;
      const span = (q >= 0 ? q : j + 1) - (p >= 0 ? p : g - 1);
      const fall = Math.min(JUMP_FALLOFF, span);
      for (const c of coords) {
        const dp = p >= 0 ? c[p] - c[g] : 0;
        const dq = q >= 0 ? c[q] - c[j] : 0;
        for (let k = g; k <= j; k++) {
          const wp = p >= 0 ? Math.max(0, 1 - (k - p - 1) / fall) : 0;
          const wq = q >= 0 ? Math.max(0, 1 - (q - 1 - k) / fall) : 0;
          // Normalise where the two fall-offs overlap (short loops).
          const sum = wp + wq;
          const f = sum > 1 ? 1 / sum : 1;
          c[k] += dp * wp * f + dq * wq * f;
        }
      }
      g = j + 1;
    }
  }

  // Pass 2: Gaussian smoothing with element samples as fixed boundary data.
  const half = Math.ceil(LOOP_SMOOTH_SIGMA * 3);
  const kernel = new Float64Array(2 * half + 1);
  for (let k = -half; k <= half; k++) {
    kernel[k + half] = Math.exp(-(k * k) / (2 * LOOP_SMOOTH_SIGMA * LOOP_SMOOTH_SIGMA));
  }
  const ox = px.slice();
  const oy = py.slice();
  const oz = pz.slice();
  for (let s = 0; s < segStart.length; s++) {
    const lo = segStart[s];
    const hi = s + 1 < segStart.length ? segStart[s + 1] - 1 : n - 1;
    for (let g = lo; g <= hi; g++) {
      if (fixed[g]) continue;
      let wx = 0,
        wy = 0,
        wz = 0,
        wt = 0;
      for (let k = -half; k <= half; k++) {
        const j = g + k;
        if (j < lo || j > hi) continue;
        const w = kernel[k + half];
        wx += ox[j] * w;
        wy += oy[j] * w;
        wz += oz[j] * w;
        wt += w;
      }
      // Ease the smoothing in over the first few samples so the (now
      // continuous) loop still meets the element exactly.
      let dist = half;
      for (let k = 1; k <= half; k++) {
        if ((g - k >= lo && fixed[g - k]) || (g + k <= hi && fixed[g + k])) {
          dist = k;
          break;
        }
      }
      const a = Math.min(1, dist / 6);
      px[g] = ox[g] + a * (wx / wt - ox[g]);
      py[g] = oy[g] + a * (wy / wt - oy[g]);
      pz[g] = oz[g] + a * (wz / wt - oz[g]);
    }
  }
}

/**
 * Put each sample's curtain angle back where the sample really is round the
 * barrel.
 *
 * The 2-D unwrap holds its angle while the chain dips inside the barrel
 * (e.g. OmpF/OmpC's L3 loop), so the plot doesn't fan out, and drops however
 * far the chain turned in there. Everything after such a dip then sits at the
 * wrong angle on the curtain — up to half a turn — and reaches its true
 * position only through huge normal/tangent offsets. Positions still come out
 * right, but the curtain's heading, which orients strand ribbons and their
 * lighting, belongs to the wrong side of the barrel: front strands turned
 * edge-on and showed as twisted, faceted slivers.
 *
 * The correction is the (continuous) difference between the real angle and the
 * unwrap angle on the barrel wall; samples near the axis, where the real angle
 * is unstable, interpolate it from the wall samples either side. Within a
 * segment it changes smoothly, so the curtain coordinate stays continuous.
 */
function alignToRealAngle(
  theta: Float64Array,
  px: Float64Array,
  py: Float64Array,
  cx: number,
  cy: number,
  minRadius: number,
  segStart: number[],
  n: number,
): void {
  const delta = new Float64Array(n);
  const known = new Uint8Array(n);
  let prev = NaN;
  for (let g = 0; g < n; g++) {
    if (Math.hypot(px[g] - cx, py[g] - cy) < minRadius) continue;
    const raw = wrapPi(Math.atan2(py[g] - cy, px[g] - cx) - theta[g]);
    delta[g] = Number.isNaN(prev) ? raw : prev + wrapPi(raw - prev);
    prev = delta[g];
    known[g] = 1;
  }
  if (Number.isNaN(prev)) return;
  for (let s = 0; s < segStart.length; s++) {
    const lo = segStart[s];
    const hi = s + 1 < segStart.length ? segStart[s + 1] - 1 : n - 1;
    let last = -1;
    for (let g = lo; g <= hi + 1; g++) {
      if (g <= hi && !known[g]) continue;
      // Fill the gap (last, g) between wall samples of this segment.
      for (let k = last + 1 < lo ? lo : last + 1; k < g; k++) {
        if (last >= lo && g <= hi)
          delta[k] = delta[last] + ((k - last) / (g - last)) * (delta[g] - delta[last]);
        else if (last >= lo) delta[k] = delta[last];
        else if (g <= hi) delta[k] = delta[g];
        else delta[k] = prev;
      }
      last = g;
    }
  }
  for (let g = 0; g < n; g++) theta[g] += delta[g];
}

export interface MorphModelOptions {
  /**
   * Which sample stays put while the curtain rolls up around it.
   * `centre`: the middle of the 2-D picture — right for a uniform roll, which
   * then curls in symmetrically from both ends.
   * `end`: the C-terminal end — right for a roll that sweeps from the
   * N-terminus, so the part still to be rolled never moves and the rolled-up
   * part travels along it like a carpet being rolled.
   */
  anchor?: 'centre' | 'end';
}

export function buildMorphModel(scene: MorphScene, options: MorphModelOptions = {}): MorphModel {
  const segStart: number[] = [];
  let n = 0;
  for (const seg of scene.segments) {
    segStart.push(n);
    n += seg.display.length;
  }
  const segOf = (seg: number, sample: number): number => segStart[seg] + sample;
  const segEnd = (seg: number): number => segStart[seg] + scene.segments[seg].display.length - 1;

  const ud = new Float64Array(n);
  const zd = new Float64Array(n);
  const ua = new Float64Array(n);
  const zr = new Float64Array(n);
  const nr = new Float64Array(n);
  const br = new Float64Array(n);
  const px = new Float64Array(n);
  const py = new Float64Array(n);
  {
    let g = 0;
    for (const seg of scene.segments) {
      for (let i = 0; i < seg.display.length; i++, g++) {
        ud[g] = seg.display[i].arc;
        zd[g] = seg.display[i].z;
        const p = seg.positions[i] ?? { x: 0, y: 0, z: seg.display[i].z };
        px[g] = p.x;
        py[g] = p.y;
        zr[g] = p.z;
      }
    }
  }

  const elements: ModelElement[] = scene.elements.map((e, i) => ({
    id: i,
    type: e.type,
    g0: segOf(e.seg, e.start),
    g1: segOf(e.seg, e.end),
    withArrow: e.withArrow,
    faded: e.faded,
    order: e.order,
  }));

  smoothLoops(px, py, zr, elements, segStart, n);

  let stepTheta = new Float64Array(0);
  let sign = 1;
  let radius = 1;

  if (scene.mode === 'polyline') {
    // Real attachment = cumulative xy chord length (breaks included).
    for (let g = 1; g < n; g++)
      ua[g] = ua[g - 1] + Math.hypot(px[g] - px[g - 1], py[g] - py[g - 1]);
    // Display position: element samples keep their laid-out arc; everything in
    // between (loops, breaks, termini) is spread over the 2-D gap in
    // proportion to its real arc length.
    const isAnchor = new Uint8Array(n);
    for (const e of elements) for (let g = e.g0; g <= e.g1; g++) isAnchor[g] = 1;
    let g = 0;
    while (g < n) {
      if (isAnchor[g]) {
        g++;
        continue;
      }
      let j = g;
      while (j + 1 < n && !isAnchor[j + 1]) j++;
      const p = g - 1;
      const q = j + 1;
      if (p >= 0 && q < n) {
        const span = ua[q] - ua[p];
        for (let k = g; k <= j; k++) {
          const f = span > 1e-9 ? (ua[k] - ua[p]) / span : (k - p) / (q - p);
          ud[k] = ud[p] + f * (ud[q] - ud[p]);
        }
      } else if (q < n) {
        const span = ua[q] - ua[g];
        const c = span > 1e-9 ? scene.gapA / span : 0;
        for (let k = g; k <= j; k++) ud[k] = ud[q] - (ua[q] - ua[k]) * c;
      } else if (p >= 0) {
        const span = ua[j] - ua[p];
        const c = span > 1e-9 ? scene.gapA / span : 0;
        for (let k = g; k <= j; k++) ud[k] = ud[p] + (ua[k] - ua[p]) * c;
      } else {
        for (let k = g; k <= j; k++) ud[k] = ua[k];
      }
      g = j + 1;
    }
  } else {
    // Cylinder: angle about the barrel axis from each segment's own unwrap,
    // made continuous along the whole chain (and across protomers).
    const theta = new Float64Array(n);
    let rSum = 0;
    let cx = 0;
    let cy = 0;
    let g = 0;
    for (let s = 0; s < scene.segments.length; s++) {
      const seg = scene.segments[s];
      const m = seg.cylinder ?? { centre: { x: 0, y: 0 }, radius: 1, sign: 1, arcOffset: 0 };
      const arcs = seg.unwrapArc ?? seg.display.map((d) => d.arc);
      for (let i = 0; i < seg.display.length; i++, g++) {
        let th = (m.sign * (arcs[i] + m.arcOffset)) / m.radius;
        if (i === 0 && g > 0) th = theta[g - 1] + wrapPi(th - theta[g - 1]);
        else if (i > 0)
          th = theta[g - 1] + (th - (m.sign * (arcs[i - 1] + m.arcOffset)) / m.radius);
        theta[g] = th;
        rSum += m.radius;
        cx += m.centre.x;
        cy += m.centre.y;
      }
    }
    radius = n > 0 ? rSum / n : 1;
    cx = n > 0 ? cx / n : 0;
    cy = n > 0 ? cy / n : 0;
    alignToRealAngle(theta, px, py, cx, cy, 0.4 * radius, segStart, n);
    sign = n > 1 && theta[n - 1] < theta[0] ? -1 : 1;
    for (let k = 0; k < n; k++) {
      ua[k] = sign * radius * theta[k];
      const c = Math.cos(theta[k]);
      const s = Math.sin(theta[k]);
      // Curtain point, tangent (direction of increasing ua) and normal
      // (tangent × ẑ — the side the 2-D view is seen from).
      const ox = cx + radius * c;
      const oy = cy + radius * s;
      const tx = -sign * s;
      const ty = sign * c;
      const nx = ty;
      const ny = -tx;
      const dx = px[k] - ox;
      const dy = py[k] - oy;
      nr[k] = dx * nx + dy * ny;
      br[k] = dx * tx + dy * ty;
    }
  }

  let udMin = Infinity;
  let udMax = -Infinity;
  for (let k = 0; k < n; k++) {
    if (ud[k] < udMin) udMin = ud[k];
    if (ud[k] > udMax) udMax = ud[k];
  }
  const pos = new Float64Array(n);
  const span = udMax - udMin;
  for (let k = 0; k < n; k++) pos[k] = span > 0 ? (ud[k] - udMin) / span : 0;

  // Anchor: the sample nearest the middle (or right-hand end) of the picture.
  let anchor = 0;
  {
    const mid = options.anchor === 'end' ? udMax : (udMin + udMax) / 2;
    let best = Infinity;
    for (let k = 0; k < n; k++) {
      const d = Math.abs(ud[k] - mid);
      if (d < best) {
        best = d;
        anchor = k;
      }
    }
  }

  if (scene.mode === 'polyline' && n > 1) {
    // Step directions, continuous (unwrapped); degenerate steps inherit.
    const raw = new Float64Array(n - 1);
    let prev = NaN;
    for (let k = 0; k < n - 1; k++) {
      const dx = px[k + 1] - px[k];
      const dy = py[k + 1] - py[k];
      if (dx * dx + dy * dy > 1e-12) {
        const a = Math.atan2(dy, dx);
        raw[k] = Number.isNaN(prev) ? a : prev + wrapPi(a - prev);
        prev = raw[k];
      } else raw[k] = prev;
    }
    // Leading degenerate steps take the first defined direction.
    let first = 0;
    while (first < n - 1 && Number.isNaN(raw[first])) first++;
    for (let k = 0; k < first; k++) raw[k] = first < n - 1 ? raw[first] : 0;
    const a0 = raw[Math.min(anchor, n - 2)];
    stepTheta = new Float64Array(n - 1);
    for (let k = 0; k < n - 1; k++) stepTheta[k] = raw[k] - a0;
  }

  const loops: ModelLoop[] = [];
  for (let i = 0; i < scene.loops.length; i++) {
    const l = scene.loops[i];
    if (l.points.length < 2) continue;
    const syn = Float64Array.from(flattenLoop(l.points));
    const fromG = l.from ? segOf(l.from.seg, l.from.sample) : -1;
    const toG = l.to ? segOf(l.to.seg, l.to.sample) : -1;
    const idx: number[] = [];
    if (l.from && l.to) {
      if (l.from.seg === l.to.seg) for (let g = fromG; g <= toG; g++) idx.push(g);
      else {
        for (let g = fromG; g <= segEnd(l.from.seg); g++) idx.push(g);
        for (let g = segStart[l.to.seg]; g <= toG; g++) idx.push(g);
      }
    } else if (l.to) {
      for (let g = segStart[l.to.seg]; g <= toG; g++) idx.push(g);
    } else if (l.from) {
      for (let g = fromG; g <= segEnd(l.from.seg); g++) idx.push(g);
    } else {
      for (let g = segStart[l.seg]; g <= segEnd(l.seg); g++) idx.push(g);
    }
    if (idx.length === 0) idx.push(fromG >= 0 ? fromG : Math.max(0, toG));
    const real = Int32Array.from(idx);
    const xyz = new Float64Array(real.length * 3);
    for (let k = 0; k < real.length; k++) {
      xyz[k * 3] = px[real[k]];
      xyz[k * 3 + 1] = py[real[k]];
      xyz[k * 3 + 2] = zr[real[k]];
    }
    let realLen = 0;
    for (let k = 1; k < real.length; k++) {
      realLen += Math.hypot(
        xyz[k * 3] - xyz[k * 3 - 3],
        xyz[k * 3 + 1] - xyz[k * 3 - 2],
        xyz[k * 3 + 2] - xyz[k * 3 - 1],
      );
    }
    let synLen = 0;
    for (let k = 2; k < syn.length; k += 2)
      synLen += Math.hypot(syn[k] - syn[k - 2], syn[k + 1] - syn[k - 1]);
    loops.push({
      id: elements.length + i,
      syn,
      synS: normalisedArc(syn, 2, 2),
      real,
      realS: normalisedArc(xyz, 3, 3),
      fromG,
      toG,
      discontinuous: l.discontinuous,
      faded: l.faded,
      order: l.order,
      length: Math.max(realLen, synLen),
      synLength: synLen,
    });
  }

  const labels: ModelLabel[] = scene.labels.map((l) => ({
    g: segOf(l.seg, l.sample),
    segLo: segStart[l.seg],
    segHi: segEnd(l.seg),
    text: l.text,
    isStart: l.isStart,
  }));

  const ties: ModelTie[] = scene.ties.map((t) => ({
    a: segOf(t.a.seg, t.a.sample),
    az: t.a.z,
    b: segOf(t.b.seg, t.b.sample),
    bz: t.b.z,
  }));

  return {
    scene,
    n,
    segStart,
    ud,
    zd,
    ua,
    zr,
    nr,
    br,
    pos,
    stepTheta,
    sign,
    radius,
    anchor,
    elements,
    loops,
    labels,
    ties,
    slabX0: scene.slab.x0 - (n > 0 ? ud[anchor] : 0),
    slabX1: scene.slab.x1 - (n > 0 ? ud[anchor] : 0),
  };
}
