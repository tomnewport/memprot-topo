import type { ChainData } from '../types.js';
import { residueKey, type ResidueKey } from '../residue-key.js';
import type { SeqElement, SeqResidue, SequenceSource, TracePoint } from '../sequence/types.js';
import { oneLetter } from '../sequence/amino-acids.js';
import { measure } from '../components/residue-data.js';
import { PLOT, SS_BODY } from './constants.js';
import { ssTypeAt } from './runs.js';
import { flattenLoop } from './loops.js';
import type { ChainLayout } from './chain-layout.js';

/** The 2-D view's per-sample sequence position: residue `i` of `residues` sits at `f = i`. */
function sampleToF(anchors: { sample: number; f: number }[]): (sample: number) => number {
  return (sample) => {
    const n = anchors.length;
    if (n === 0) return 0;
    if (sample <= anchors[0].sample) return anchors[0].f;
    if (sample >= anchors[n - 1].sample) return anchors[n - 1].f;
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (anchors[mid].sample <= sample) lo = mid;
      else hi = mid;
    }
    const a = anchors[lo];
    const b = anchors[hi];
    return b.sample > a.sample
      ? a.f + ((sample - a.sample) / (b.sample - a.sample)) * (b.f - a.f)
      : a.f;
  };
}

/**
 * Where the 2-D picture drew each residue of `chain`, for the sequence view
 * and its transition: the drawn chain as one dense polyline tagged with
 * sequence position, the elements and dashed stretches along it, and each
 * residue's depth. Neighbouring (faded) protomers are left out.
 */
export function buildSequence(
  chain: ChainData,
  layout: ChainLayout,
  /** Residue colour (issue #23), or null when the chain isn't coloured. */
  colour: ((key: ResidueKey) => string | undefined) | null = null,
): SequenceSource {
  const layouts = layout.segments;
  const { originX, originY, minX, minY, width, height } = layout.frame;
  const origin = { x: originX, y: originY };
  const { profile, bulk } = layout.membrane;
  const residues: SeqResidue[] = chain.calphas.map((c) => ({
    resSeq: c.resSeq,
    iCode: c.iCode,
    code: oneLetter(c.resName),
    ss: ssTypeAt(chain.segments, c.resSeq),
  }));
  const px = PLOT.arcPxPerA;
  const toSvg = (arc: number, z: number): { x: number; y: number } => ({
    x: origin.x + arc * px,
    y: origin.y - z * px,
  });
  const z = residues.map(() => NaN);
  const focal = (s: number): boolean => layouts[s].focal;

  // Match each drawn residue to its place in the chain by its key, so `100`
  // and `100A` land on their own residues.
  const fOf: ((sample: number) => number)[] = [];
  const indexOf = new Map<ResidueKey, number>();
  residues.forEach((r, i) => {
    const key = residueKey(r);
    if (!indexOf.has(key)) indexOf.set(key, i);
  });
  layouts.forEach((layout, s) => {
    if (!focal(s)) {
      fOf.push(() => 0);
      return;
    }
    const anchors: { sample: number; f: number }[] = [];
    for (const r of layout.residues) {
      const i = indexOf.get(residueKey(r));
      if (i === undefined) continue;
      anchors.push({ sample: r.sampleIndex, f: i });
      z[i] = layout.samples[r.sampleIndex]?.z ?? NaN;
    }
    fOf.push(sampleToF(anchors));
  });

  const pieces: TracePoint[][] = [];
  const elements: SeqElement[] = [];
  for (const e of layout.elements) {
    if (!focal(e.seg) || e.faded) continue;
    const samples = layouts[e.seg].samples;
    const pts: TracePoint[] = [];
    for (let k = e.start; k <= e.end; k++)
      pts.push({ ...toSvg(samples[k].arc, samples[k].z), f: fOf[e.seg](k) });
    pieces.push(pts);
    elements.push({
      type: e.type,
      from: pts[0].f,
      to: pts[pts.length - 1].f,
      withArrow: e.withArrow,
    });
  }
  const dashed: [number, number][] = [];
  for (const loop of layout.loops) {
    if (loop.faded || !focal(loop.seg)) continue;
    const idx = loop.residues
      .map((key) => indexOf.get(key))
      .filter((i): i is number => i !== undefined);
    const f0 = loop.from ? fOf[loop.from.seg](loop.from.sample) : (idx[0] ?? 0) - 0.5;
    const f1 = loop.to ? fOf[loop.to.seg](loop.to.sample) : (idx[idx.length - 1] ?? f0) + 0.5;
    // Residues share the curve equally, as in the 2-D drawing.
    const knots = [{ s: 0, f: f0 }];
    idx.forEach((i, k) => knots.push({ s: (k + 0.5) / idx.length, f: i }));
    knots.push({ s: 1, f: Math.max(f1, knots[knots.length - 1].f) });
    for (let k = 1; k < knots.length; k++) knots[k].f = Math.max(knots[k].f, knots[k - 1].f);
    const flat = flattenLoop(loop.points);
    const poly = measure(flat);
    const total = poly[poly.length - 1].d;
    let k = 0;
    const pts = poly.map((p) => {
      const s = total > 0 ? p.d / total : 0;
      while (k < knots.length - 2 && knots[k + 1].s < s) k++;
      const a = knots[k];
      const b = knots[k + 1];
      const f = b.s > a.s ? a.f + ((s - a.s) / (b.s - a.s)) * (b.f - a.f) : a.f;
      return { ...toSvg(p.x, p.y), f };
    });
    pieces.push(pts);
    if (loop.discontinuous) dashed.push([f0, knots[knots.length - 1].f]);
  }
  pieces.sort((a, b) => a[0].f - b[0].f || a[a.length - 1].f - b[b.length - 1].f);
  const trace: TracePoint[] = [];
  for (const piece of pieces) {
    for (const p of piece) {
      const last = trace[trace.length - 1];
      if (last && p.f < last.f) continue;
      if (last && p.f - last.f < 1e-6 && Math.hypot(p.x - last.x, p.y - last.y) < 1e-6) continue;
      trace.push(p);
    }
  }
  return {
    residues,
    trace,
    dashed,
    elements,
    z,
    membrane: { upper: bulk.upper, lower: bulk.lower },
    frame2d: { minX, minY, width, height },
    origin2d: { x: origin.x, y: origin.y, pxPerA: px },
    // The band as drawn, flattened onto the bulk planes.
    slab: { x0: profile.x[0], x1: profile.x[profile.x.length - 1] },
    colourAt: colour ? (i) => colour(residueKey(residues[i])) : null,
    lanes: [],
    halfWidthPx: SS_BODY.halfWidthPx,
    arrowHalfWidthPx: SS_BODY.arrowHalfWidthPx,
    arrowLengthPx: SS_BODY.arrowLengthPx,
  };
}
