/**
 * Spike scene builder (THROWAWAY — Phase 0 of issue #22).
 *
 * Turns a chain into a renderer-agnostic list of elements, each carrying a
 * centreline sampled in BOTH the flat 2-D frame and the real 3-D frame. The
 * Three.js view interpolates between the two per sample, so this is the shared
 * "topology model" both a flat and a 3-D renderer would consume — a stand-in for
 * the production `TopologyScene` proposed in the plan.
 *
 * Frame convention (view space): the membrane normal is +Y in both frames, so
 * the bilayer stays horizontal throughout the morph.
 *   - flat:  x = arc length (Å), y = membrane depth z (Å), z = 0
 *   - solid: the real membrane-frame coords, remapped (x, z, y) so the normal
 *            (real z) points up.
 */
import type { ChainData, SecondaryStructureSegment } from '../types.js';
import { unrollChain } from '../unroll/unroll.js';
import { unwrapBarrel } from '../unroll/barrel.js';
import { analyseBarrel } from '../contacts/index.js';
import { assignCaSecondaryStructure } from './ca-ss.js';

export type SsType = 'helix' | 'strand' | 'coil';

export interface CentrelineSample {
  /** Flat 2-D position in view space [x, y, z]. */
  flat: [number, number, number];
  /** Real 3-D position in view space [x, y, z]. */
  solid: [number, number, number];
  /** Arc length (Å) along the chain — drives the roll-up wavefront. */
  arc: number;
}

export interface SceneElement {
  type: SsType;
  samples: CentrelineSample[];
  /** Draw an arrowhead at the C-terminal end (β-strands). */
  arrow: boolean;
}

export interface TopologyScene {
  elements: SceneElement[];
  /** Total arc length (Å) — used to normalise the wavefront. */
  arcSpan: number;
  /** Half-thickness of the membrane slab (Å). */
  membraneHalf: number;
  /** Extent of the flat layout in x (Å), for the membrane slab + camera fit. */
  flatHalfWidth: number;
  /** Depth extent of the solid structure (Å), for camera fit. */
  solidRadius: number;
  kind: 'helical' | 'barrel';
}

const MEMBRANE_HALF = 15;

function ssTypeAt(segments: SecondaryStructureSegment[], resSeq: number): SsType {
  for (const s of segments) if (resSeq >= s.start && resSeq <= s.end) return s.type;
  return 'coil';
}

/** Drop sub-3-residue helix/strand assignments so they read as coil. */
function effectiveSs(segments: SecondaryStructureSegment[]): SecondaryStructureSegment[] {
  return segments.filter((s) => s.type === 'coil' || s.end - s.start + 1 >= 3);
}

/** Group consecutive same-type samples into elements. */
function groupRuns(
  samples: CentrelineSample[],
  typeOf: SsType[],
): { type: SsType; from: number; to: number }[] {
  const runs: { type: SsType; from: number; to: number }[] = [];
  let start = 0;
  for (let i = 1; i <= samples.length; i++) {
    if (i === samples.length || typeOf[i] !== typeOf[start]) {
      runs.push({ type: typeOf[start], from: start, to: i - 1 });
      start = i;
    }
  }
  return runs;
}

/**
 * Helical bundle: flat = arc-length unroll, solid = the retained real backbone
 * axis. The flat trace lifts and folds into the true 3-D path.
 */
function buildHelical(chain: ChainData): TopologyScene {
  // Derive SS from Cα geometry (the OPM HELIX/SHEET records are unreliable and
  // DSSP is unavailable offline). Production will use real DSSP.
  const ss = effectiveSs(assignCaSecondaryStructure(chain.calphas));
  const unroll = unrollChain(chain.calphas, { ssSegments: ss });

  // Real-coord centroid so the structure sits at the origin.
  let cx = 0;
  let cy = 0;
  let n = 0;
  for (const seg of unroll.segments) {
    for (const s of seg.samples) {
      if (s.x3 === undefined) continue;
      cx += s.x3;
      cy += s.y3!;
      n++;
    }
  }
  cx /= n || 1;
  cy /= n || 1;

  const arcMid = unroll.totalArcLength / 2;
  let flatHalfWidth = 0;
  let solidRadius = 0;

  const elements: SceneElement[] = [];
  for (const seg of unroll.segments) {
    if (seg.samples.length < 2) continue;
    // Assign an SS type per sample via the nearest residue's resSeq.
    const typeOf: SsType[] = seg.samples.map((_, i) => {
      // nearest residue by sampleIndex
      let best = seg.residues[0];
      let bestD = Infinity;
      for (const r of seg.residues) {
        const d = Math.abs(r.sampleIndex - i);
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      }
      return best ? ssTypeAt(ss, best.resSeq) : 'coil';
    });

    const samples: CentrelineSample[] = seg.samples.map((s) => {
      const fx = s.arc - arcMid;
      flatHalfWidth = Math.max(flatHalfWidth, Math.abs(fx));
      const sx = (s.x3 ?? cx) - cx;
      const sz = (s.y3 ?? cy) - cy;
      solidRadius = Math.max(solidRadius, Math.hypot(sx, sz));
      return { flat: [fx, s.z, 0], solid: [sx, s.z, sz], arc: s.arc };
    });

    for (const run of groupRuns(samples, typeOf)) {
      const slice = samples.slice(run.from, run.to + 1);
      if (slice.length < 2) continue;
      elements.push({ type: run.type, samples: slice, arrow: run.type === 'strand' });
    }
  }

  return {
    elements,
    arcSpan: unroll.totalArcLength,
    membraneHalf: MEMBRANE_HALF,
    flatHalfWidth,
    solidRadius,
    kind: 'helical',
  };
}

/**
 * β-barrel: flat = honest cylindrical unwrap (arc = R·θ), solid = wrap that arc
 * straight back onto the cylinder of radius R. The flat sheet rolls into the
 * barrel — the literal unroll/roll metaphor.
 */
function buildBarrel(chain: ChainData): TopologyScene {
  // Derive SS from Cα geometry (the OPM HELIX/SHEET records are unreliable and
  // DSSP is unavailable offline). Production will use real DSSP.
  const ss = effectiveSs(assignCaSecondaryStructure(chain.calphas));
  const analysis = analyseBarrel(chain.calphas, ss);
  const R = analysis.radius > 1 ? analysis.radius : 10;
  const unroll = unwrapBarrel(chain.calphas, { ssSegments: ss, centre: analysis.centre });

  const arcMid = unroll.totalArcLength / 2;
  let flatHalfWidth = 0;

  const elements: SceneElement[] = [];
  for (const seg of unroll.segments) {
    if (seg.samples.length < 2) continue;
    const typeOf: SsType[] = seg.samples.map((_, i) => {
      let best = seg.residues[0];
      let bestD = Infinity;
      for (const r of seg.residues) {
        const d = Math.abs(r.sampleIndex - i);
        if (d < bestD) {
          bestD = d;
          best = r;
        }
      }
      return best ? ssTypeAt(ss, best.resSeq) : 'coil';
    });

    const samples: CentrelineSample[] = seg.samples.map((s) => {
      const fx = s.arc - arcMid;
      flatHalfWidth = Math.max(flatHalfWidth, Math.abs(fx));
      const theta = fx / R;
      return {
        flat: [fx, s.z, 0],
        solid: [R * Math.sin(theta), s.z, R * Math.cos(theta)],
        arc: s.arc,
      };
    });

    for (const run of groupRuns(samples, typeOf)) {
      const slice = samples.slice(run.from, run.to + 1);
      if (slice.length < 2) continue;
      elements.push({ type: run.type, samples: slice, arrow: run.type === 'strand' });
    }
  }

  return {
    elements,
    arcSpan: unroll.totalArcLength,
    membraneHalf: MEMBRANE_HALF,
    flatHalfWidth,
    solidRadius: R,
    kind: 'barrel',
  };
}

export function buildScene(chain: ChainData, kind: 'helical' | 'barrel'): TopologyScene {
  return kind === 'barrel' ? buildBarrel(chain) : buildHelical(chain);
}
