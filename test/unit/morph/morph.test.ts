import { describe, it, expect, afterEach, vi } from 'vitest';
import { unrollChain, unwrapBarrel } from '../../../src/unroll/index.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { buildMorphModel } from '../../../src/morph/model.js';
import { computePose, localProgress } from '../../../src/morph/curtain.js';
import { MorphRenderer, fitLine, findKink } from '../../../src/morph/renderer.js';
import type { MorphScene, MorphSegment, MorphElement } from '../../../src/morph/types.js';
import type { UnrollResult } from '../../../src/unroll/index.js';
import type {
  Calpha,
  ChainData,
  ProteinData,
  SecondaryStructureSegment,
} from '../../../src/types.js';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

const STYLE: MorphScene['style'] = {
  helixFill: '#6e8db6',
  helixStroke: '#3e587a',
  strandFill: '#6ea76d',
  strandStroke: '#3d6d3d',
  coil: '#666',
  membraneFill: '#eaeaea',
  membraneEdge: '#bdbdbd',
  midplane: '#666',
  contact: '#c98a3b',
  background: '#ffffff',
  selectionWidthScale: 2,
  unselectedSaturation: 0.75,
  labelFontFamily: 'sans-serif',
  labelFill: '#333',
  labelFontSize: 11,
  labelGap: 3,
  labelTangentStep: 3,
  halfWidthPx: 4,
  arrowHalfWidthPx: 6,
  arrowLengthPx: 12,
  fadedOpacity: 0.32,
};

/** Two tilted TM helices joined by a loop, with a little xy curvature. */
function hairpinChain(): ChainData {
  const calphas: Calpha[] = [];
  let r = 1;
  for (let i = 0; i < 22; i++) {
    const th = (i * 2 * Math.PI) / 3.6;
    calphas.push({
      resSeq: r++,
      iCode: '',
      x: 2.3 * Math.cos(th) + i * 0.4,
      y: 2.3 * Math.sin(th),
      z: -16 + i * 1.5,
    });
  }
  for (let i = 1; i <= 5; i++) {
    calphas.push({ resSeq: r++, iCode: '', x: 8.8 + i * 2, y: i * 1.5, z: 17 + Math.sin(i) });
  }
  for (let i = 0; i < 22; i++) {
    const th = (i * 2 * Math.PI) / 3.6;
    calphas.push({
      resSeq: r++,
      iCode: '',
      x: 20 + 2.3 * Math.cos(th) - i * 0.2,
      y: 9 + 2.3 * Math.sin(th) + i * 0.3,
      z: 16 - i * 1.5,
    });
  }
  return {
    chainId: 'A',
    residueCount: calphas.length,
    segments: [
      { start: 1, end: 22, type: 'helix' },
      { start: 28, end: 49, type: 'helix' },
    ],
    calphas,
  };
}

/** Elements covering each SS run's samples (residue → sample via sampleIndex). */
function elementsFor(unroll: UnrollResult, ss: SecondaryStructureSegment[]): MorphElement[] {
  const out: MorphElement[] = [];
  let order = 0;
  unroll.segments.forEach((seg, s) => {
    for (const run of ss) {
      if (run.type === 'coil') continue;
      const res = seg.residues.filter((r) => r.resSeq >= run.start && r.resSeq <= run.end);
      if (res.length < 2) continue;
      out.push({
        type: run.type,
        seg: s,
        start: res[0].sampleIndex,
        end: res[res.length - 1].sampleIndex,
        withArrow: run.type === 'strand',
        faded: false,
        order: order++,
      });
    }
  });
  return out;
}

function sceneFor(
  mode: MorphScene['mode'],
  unroll: UnrollResult,
  ss: SecondaryStructureSegment[],
  displayStretch = 1,
): MorphScene {
  const segments: MorphSegment[] = unroll.segments.map((seg) => ({
    display: seg.samples.map((p) => ({ arc: p.arc * displayStretch, z: p.z })),
    positions: seg.positions ?? [],
    unwrapArc: mode === 'cylinder' ? seg.samples.map((p) => p.arc) : undefined,
    cylinder: mode === 'cylinder' ? unroll.cylinder : undefined,
  }));
  let maxArc = 0;
  for (const seg of segments) for (const p of seg.display) maxArc = Math.max(maxArc, p.arc);
  return {
    mode,
    segments,
    elements: elementsFor(unroll, ss),
    loops: [],
    labels: [],
    ties: [],
    slab: { x0: 0, x1: maxArc, half: 15 },
    frame: {
      originX: 40,
      originY: 100,
      minX: 0,
      minY: 0,
      width: maxArc * 2.5 + 80,
      height: 200,
      pxPerA: 2.5,
    },
    gapA: 12,
    style: STYLE,
  };
}

/** Max |d(i,j) − d'(i,j)| over sample pairs — zero for a rigid motion. */
function rigidError(a: number[][], b: number[][]): number {
  let worst = 0;
  for (let i = 0; i < a.length; i += 7) {
    for (let j = i + 7; j < a.length; j += 7) {
      const da = Math.hypot(a[i][0] - a[j][0], a[i][1] - a[j][1], a[i][2] - a[j][2]);
      const db = Math.hypot(b[i][0] - b[j][0], b[i][1] - b[j][1], b[i][2] - b[j][2]);
      worst = Math.max(worst, Math.abs(da - db));
    }
  }
  return worst;
}

/**
 * Sampled tetrahedra whose orientation (sign of signed volume) differs between
 * the two point sets — zero unless one is a mirror image of the other, which
 * pairwise distances (rigidError) cannot tell apart.
 */
function handednessFlips(a: number[][], b: number[][]): { flips: number; checked: number } {
  const vol = (p: number[][], i: number, j: number, k: number, l: number): number => {
    const u = [0, 1, 2].map((c) => p[j][c] - p[i][c]);
    const v = [0, 1, 2].map((c) => p[k][c] - p[i][c]);
    const w = [0, 1, 2].map((c) => p[l][c] - p[i][c]);
    return (
      u[0] * (v[1] * w[2] - v[2] * w[1]) -
      u[1] * (v[0] * w[2] - v[2] * w[0]) +
      u[2] * (v[0] * w[1] - v[1] * w[0])
    );
  };
  const n = a.length;
  let flips = 0;
  let checked = 0;
  for (let i = 0; i + 3 < n; i += 5) {
    const [j, k, l] = [(i + 11) % n, (i + 29) % n, (i + 53) % n];
    const va = vol(a, i, j, k, l);
    const vb = vol(b, i, j, k, l);
    if (Math.abs(vb) < 1) continue; // near-flat: sign not meaningful
    checked++;
    if (Math.sign(va) !== Math.sign(vb)) flips++;
  }
  return { flips, checked };
}

/** Pose positions and real positions of every element sample. */
function elementPoints(
  model: ReturnType<typeof buildMorphModel>,
  scene: MorphScene,
  pose: ReturnType<typeof computePose>,
): { got: number[][]; want: number[][] } {
  const positions = scene.segments.flatMap((s) => s.positions);
  const got: number[][] = [];
  const want: number[][] = [];
  for (const el of model.elements) {
    for (let g = el.g0; g <= el.g1; g++) {
      got.push([pose.w[g * 4], pose.w[g * 4 + 1], pose.w[g * 4 + 2]]);
      want.push([positions[g].x, positions[g].y, positions[g].z]);
    }
  }
  return { got, want };
}

describe('localProgress', () => {
  it('is the global progress without a sweep, and a left-to-right wave with one', () => {
    expect(localProgress(0.3, 0.9, 0)).toBe(0.3);
    expect(localProgress(0, 0, 0.7)).toBe(0);
    expect(localProgress(1, 1, 0.7)).toBe(1);
    expect(localProgress(0.4, 0.1, 0.7)).toBeGreaterThan(localProgress(0.4, 0.9, 0.7));
  });
});

describe('morph pose (arc-length unroll)', () => {
  const chain = hairpinChain();
  const unroll = unrollChain(chain.calphas, { ssSegments: chain.segments });
  const scene = sceneFor('polyline', unroll, chain.segments);
  const model = buildMorphModel(scene);

  it('lays every sample flat on the 2-D picture at t = 0', () => {
    const pose = computePose(model, 0, 0.7);
    const a = model.anchor;
    for (let k = 0; k < model.n; k++) {
      expect(pose.w[k * 4]).toBeCloseTo(model.ud[k] - model.ud[a], 6);
      expect(pose.w[k * 4 + 1]).toBeCloseTo(0, 9);
      expect(pose.w[k * 4 + 2]).toBeCloseTo(model.zd[k], 9);
    }
  });

  it('rolls helices back into their real 3-D shape at t = 1 (a rigid motion)', () => {
    const pose = computePose(model, 1, 0.7);
    const got: number[][] = [];
    const want: number[][] = [];
    for (const el of model.elements) {
      const seg = scene.segments[0];
      for (let g = el.g0; g <= el.g1; g++) {
        got.push([pose.w[g * 4], pose.w[g * 4 + 1], pose.w[g * 4 + 2]]);
        const p = seg.positions[g];
        want.push([p.x, p.y, p.z]);
      }
    }
    expect(got.length).toBeGreaterThan(100);
    expect(rigidError(got, want)).toBeLessThan(1e-6);
    // …and not its mirror image.
    const h = handednessFlips(got, want);
    expect(h.checked).toBeGreaterThan(10);
    expect(h.flips).toBe(0);
  });

  it('leaves the not-yet-rolled end flat and in place during an end-anchored sweep', () => {
    const endModel = buildMorphModel(scene, { anchor: 'end' });
    const pose = computePose(endModel, 0.4, 0.35);
    const a = endModel.anchor;
    let flat = 0;
    for (let k = 0; k < endModel.n; k++) {
      if (pose.t[k] > 0) continue;
      flat++;
      expect(pose.w[k * 4]).toBeCloseTo(endModel.ud[k] - endModel.ud[a], 6);
      expect(pose.w[k * 4 + 1]).toBeCloseTo(0, 6);
    }
    expect(flat).toBeGreaterThan(50);
  });

  it('preserves lengths along an element throughout the roll', () => {
    const el = model.elements[0];
    for (const tau of [0.25, 0.5, 0.75]) {
      const pose = computePose(model, tau, 0);
      let len = 0;
      let lenD = 0;
      for (let g = el.g0; g < el.g1; g++) {
        len += Math.hypot(pose.w[g * 4 + 4] - pose.w[g * 4], pose.w[g * 4 + 5] - pose.w[g * 4 + 1]);
        lenD += model.ud[g + 1] - model.ud[g];
      }
      expect(len).toBeCloseTo(lenD, 6);
    }
  });
});

describe('morph pose (β-barrel unwrap)', () => {
  const chain = syntheticBarrel({ n: 8 });
  const analysis = analyseBarrel(chain.calphas, chain.segments);
  const unroll = unwrapBarrel(chain.calphas, {
    ssSegments: chain.segments,
    centre: analysis.centre,
  });
  // Stretch the display to mimic the strand-spacing layout, which the roll
  // must undo.
  const scene = sceneFor('cylinder', unroll, chain.segments, 1.3);
  const model = buildMorphModel(scene);

  it('exposes the cylinder mapping used by the unwrap', () => {
    expect(unroll.cylinder).toBeDefined();
    expect(unroll.cylinder!.radius).toBeGreaterThan(3);
  });

  it('closes the strip back into the barrel at t = 1', () => {
    const pose = computePose(model, 1, 0.7);
    const got: number[][] = [];
    const want: number[][] = [];
    const positions = scene.segments.flatMap((s) => s.positions);
    for (const el of model.elements) {
      for (let g = el.g0; g <= el.g1; g++) {
        got.push([pose.w[g * 4], pose.w[g * 4 + 1], pose.w[g * 4 + 2]]);
        want.push([positions[g].x, positions[g].y, positions[g].z]);
      }
    }
    expect(got.length).toBeGreaterThan(100);
    expect(rigidError(got, want)).toBeLessThan(0.05);
    const h = handednessFlips(got, want);
    expect(h.checked).toBeGreaterThan(10);
    expect(h.flips).toBe(0);
    // The check itself does catch a mirror image.
    const mirror = handednessFlips(
      got.map(([x, y, z]) => [-x, y, z]),
      want,
    );
    expect(mirror.flips).toBe(mirror.checked);
  });

  it('keeps the barrel’s handedness when it winds the other way (sign −1)', () => {
    // Mirror the barrel: the unwrap then runs the other way round the axis.
    const mirrored = {
      ...chain,
      calphas: chain.calphas.map((c) => ({ ...c, x: -c.x })),
    };
    const a = analyseBarrel(mirrored.calphas, mirrored.segments);
    const u = unwrapBarrel(mirrored.calphas, { ssSegments: mirrored.segments, centre: a.centre });
    expect(u.cylinder!.sign).toBe(-unroll.cylinder!.sign);
    const sc = sceneFor('cylinder', u, mirrored.segments, 1.3);
    const m = buildMorphModel(sc);
    const { got, want } = elementPoints(m, sc, computePose(m, 1, 0.7));
    expect(rigidError(got, want)).toBeLessThan(0.05);
    const h = handednessFlips(got, want);
    expect(h.checked).toBeGreaterThan(10);
    expect(h.flips).toBe(0);
  });

  it('keeps strands on the curtain after a loop that dips inside the barrel', () => {
    // Like OmpF/OmpC's L3: the loop after strand 2 runs along the rim for
    // ~150°, dives in past the axis and comes back out beside strand 3. The
    // 2-D unwrap holds its angle inside the barrel, so it drops the 150°;
    // the curtain must not, or every later strand sits on the wrong side of
    // it and is oriented (lit, turned edge-on) as if it were there.
    const base = syntheticBarrel({ n: 16 });
    const R = (16 * 4.8) / (2 * Math.PI);
    const strands = base.segments.filter((s) => s.type === 'strand');
    const after = strands[2].end;
    const last = base.calphas.find((c) => c.resSeq === after)!;
    const next = base.calphas.find((c) => c.resSeq === strands[3].start)!;
    const th0 = Math.atan2(last.y, last.x);
    const th1 = Math.atan2(next.y, next.x);
    const zTop = last.z > 0 ? Math.max(last.z, next.z) + 3 : Math.min(last.z, next.z) - 3;
    const loop: { x: number; y: number; z: number }[] = [];
    for (let k = 1; k <= 10; k++) {
      const th = th0 + (k / 10) * ((150 * Math.PI) / 180);
      loop.push({ x: R * Math.cos(th), y: R * Math.sin(th), z: zTop });
    }
    const turn = th0 + (150 * Math.PI) / 180;
    for (const r of [0.75, 0.5, 0.25, 0]) {
      loop.push({ x: r * R * Math.cos(turn), y: r * R * Math.sin(turn), z: zTop });
    }
    for (const r of [0.25, 0.5, 0.75]) {
      loop.push({ x: r * R * Math.cos(th1), y: r * R * Math.sin(th1), z: zTop });
    }
    // Drop the original loop and renumber everything after it.
    const kept = base.calphas.filter((c) => c.resSeq <= after || c.resSeq >= next.resSeq);
    const shift = loop.length - (next.resSeq - after - 1);
    const calphas: Calpha[] = [];
    for (const c of kept) {
      if (c.resSeq === next.resSeq)
        loop.forEach((p, i) => calphas.push({ resSeq: after + 1 + i, iCode: '', ...p }));
      calphas.push(c.resSeq > after ? { ...c, resSeq: c.resSeq + shift } : c);
    }
    const segments = strands.map((s) =>
      s.start > after ? { ...s, start: s.start + shift, end: s.end + shift } : s,
    );
    const a = analyseBarrel(calphas, segments);
    const u = unwrapBarrel(calphas, { ssSegments: segments, centre: a.centre });
    expect(u.segments).toHaveLength(1);
    const sc = sceneFor('cylinder', u, segments);
    const m = buildMorphModel(sc);
    let worst = 0;
    for (const el of m.elements) {
      for (let g = el.g0; g <= el.g1; g++) worst = Math.max(worst, Math.hypot(m.nr[g], m.br[g]));
    }
    expect(worst).toBeLessThan(3);
    const { got, want } = elementPoints(m, sc, computePose(m, 1, 0.7));
    expect(rigidError(got, want)).toBeLessThan(0.05);
  });

  it('curls the curtain under each sample by that sample’s own progress mid-roll', () => {
    // With the display stretched, samples slide along the curtain as it rolls;
    // a sample that has finished rolling must still sit on a fully curved
    // curtain (curvature t·sign/R), whatever its neighbours are doing.
    for (const stretch of [1.3, 1.8]) {
      const sc = sceneFor('cylinder', unroll, chain.segments, stretch);
      const m = buildMorphModel(sc, { anchor: 'end' });
      for (const tau of [0.3, 0.5, 0.7]) {
        const pose = computePose(m, tau, 0.35);
        const { U, H } = pose.curtain;
        let worst = 0;
        for (let k = 0; k < m.n; k++) {
          let i = 0;
          while (i < U.length - 2 && U[i + 1] <= pose.u[k]) i++;
          const kappa = (H[i + 1] - H[i]) / (U[i + 1] - U[i]);
          worst = Math.max(worst, Math.abs(kappa * m.radius * m.sign - pose.t[k]));
        }
        expect(worst).toBeLessThan(0.05);
      }
    }
  });

  it('renders every frame without NaN coordinates', () => {
    const r = new MorphRenderer(model);
    r.configure(900, 0);
    // The steadying track starts at the identity, so frame 0 is untouched.
    const rigid0 = (r as unknown as { rigidAt(t: number): { phi: number; tx: number } }).rigidAt(0);
    expect(rigid0.phi).toBe(0);
    expect(rigid0.tx).toBe(0);
    for (const tau of [0.001, 0.3, 0.6, 1]) {
      r.render(tau);
      const ds = [...r.svg.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');
      expect(ds.some((d) => d.length > 0)).toBe(true);
      expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    }
  });
});

describe('helix axis fit', () => {
  /** Samples (stride 4) along a polyline through `corners`, `step` Å apart. */
  function trace(corners: number[][], step = 1.5): Float64Array {
    const pts: number[] = [];
    for (let c = 0; c + 1 < corners.length; c++) {
      const [a, b] = [corners[c], corners[c + 1]];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const n = Math.round(len / step);
      for (let i = c === 0 ? 0 : 1; i <= n; i++) {
        const f = i / n;
        // A little wobble, as the smoothed local-axis trace has.
        pts.push(
          a[0] + f * (b[0] - a[0]) + 0.3 * Math.sin(i),
          a[1] + f * (b[1] - a[1]),
          a[2] + f * (b[2] - a[2]),
          0,
        );
      }
    }
    return Float64Array.from(pts);
  }

  it('fits the axis direction of a wobbly straight trace', () => {
    const w = trace([
      [0, 0, -15],
      [6, 3, 15],
    ]);
    const n = w.length / 4;
    const { d } = fitLine(w, 0, n - 1);
    const len = Math.hypot(6, 3, 30);
    expect(d[0] * (6 / len) + d[1] * (3 / len) + d[2] * (30 / len)).toBeGreaterThan(0.999);
    expect(findKink(w, 0, n - 1)).toBe(-1);
  });

  it('does not take the end hooks of a densely sampled trace for kinks', () => {
    // ~16 samples per residue, as the morph model has, with the local-axis
    // trace hooking ~40° over its last ångström at each end.
    const w = trace(
      [
        [0.8, 0, -15.8],
        [0, 0, -15],
        [0, 0, 15],
        [0.8, 0, 15.8],
      ],
      0.1,
    );
    expect(findKink(w, 0, w.length / 4 - 1)).toBe(-1);
  });

  it('finds a real kink and splits there', () => {
    // Two 15 Å halves meeting at 35°.
    const a = (35 * Math.PI) / 180;
    const w = trace([
      [0, 0, -15],
      [0, 0, 0],
      [15 * Math.sin(a), 0, 15 * Math.cos(a)],
    ]);
    const n = w.length / 4;
    const k = findKink(w, 0, n - 1);
    expect(k).toBeGreaterThan(0);
    // Within two samples of the corner (sample 10).
    expect(Math.abs(k - 10)).toBeLessThanOrEqual(2);
  });
});

describe('<topology-display> 3-D morph', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mount(chain: ChainData): TopologyDisplay {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'tst1', chains: [chain] };
    return el;
  }

  it('offers a 3D toggle and scrubber next to the 2-D view', () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    expect(root.querySelector('.morph-toggle')?.textContent).toBe('3D');
    expect(root.querySelector('.morph-scrub')).not.toBeNull();
    expect(el.morphProgress).toBe(0);
  });

  it('swaps in the morph SVG away from t = 0 and restores the 2-D SVG at t = 0', async () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    const svg2d = root.querySelector('.svg-scroll svg');
    await el.setMorphProgress(0.5);
    const morph = root.querySelector('.svg-scroll svg');
    expect(morph).not.toBe(svg2d);
    expect(morph?.classList.contains('morph-svg')).toBe(true);
    expect(root.querySelector('.morph-toggle')?.getAttribute('aria-pressed')).toBe('true');
    // Loops are drawn as tubes in 3-D; every coordinate stays finite.
    await el.setMorphProgress(1);
    const ds = [...root.querySelectorAll('.svg-scroll svg path')].map((p) => p.getAttribute('d'));
    expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    await el.setMorphProgress(0);
    expect(root.querySelector('.svg-scroll svg')).toBe(svg2d);
    expect(root.querySelector('.morph-toggle')?.getAttribute('aria-pressed')).toBe('false');
  });

  type Internals = {
    _morph: unknown;
    _morphSource: { scene: MorphScene } | null;
  };

  /** Every path coordinate of the shown SVG is finite at each τ. */
  async function expectFiniteFrames(el: TopologyDisplay): Promise<void> {
    for (const tau of [0.3, 0.6, 1]) {
      await el.setMorphProgress(tau);
      const ds = [...el.shadowRoot!.querySelectorAll('.svg-scroll svg path')].map(
        (p) => p.getAttribute('d') ?? '',
      );
      expect(ds.some((d) => d.length > 0)).toBe(true);
      expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    }
  }

  it('loads the morph code only when the 3-D view is first asked for', async () => {
    const el = mount(hairpinChain());
    expect((el as unknown as Internals)._morph).toBeNull();
    await el.setMorphProgress(0.2);
    expect((el as unknown as Internals)._morph).not.toBeNull();
  });

  it('takes the strand ribbon size from morph-strand-width and morph-strand-thickness', () => {
    type WithOptions = { _morphSource: { options: Record<string, number> } | null };
    const el = mount(hairpinChain());
    const opts = () => (el as unknown as WithOptions)._morphSource!.options;
    expect(opts().strandWidth).toBeUndefined();
    el.setAttribute('morph-strand-width', '10');
    el.setAttribute('morph-strand-thickness', '2.5');
    expect(opts().strandWidth).toBe(10);
    expect(opts().strandThickness).toBe(2.5);
    // The arrowhead keeps its default proportion to the ribbon (4.65 / 2.85).
    expect(opts().arrowWidth).toBeCloseTo((10 * 4.65) / 2.85);
    el.setAttribute('morph-strand-width', '-1');
    expect(opts().strandWidth).toBeUndefined();
  });

  it('changes 3-D settings in place, keeping the 3-D view', async () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    await el.setMorphProgress(1);
    const controller = (el as unknown as Internals)._morph;
    const before = root.querySelector('.svg-scroll svg');
    el.setAttribute('morph-projection', 'perspective');
    el.setAttribute('morph-strand-width', '6');
    el.setAttribute('morph-sweep', '0');
    // Same controller and progress; a new 3-D picture.
    expect((el as unknown as Internals)._morph).toBe(controller);
    expect(el.morphProgress).toBe(1);
    const after = root.querySelector('.svg-scroll svg');
    expect(after).not.toBe(before);
    expect(after?.classList.contains('morph-svg')).toBe(true);
    expect(root.querySelectorAll('.svg-scroll svg')).toHaveLength(1);
    const ds = [...root.querySelectorAll('.svg-scroll svg path')].map((p) => p.getAttribute('d'));
    expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    // Back to 2-D shows the original drawing.
    await el.setMorphProgress(0);
    expect(root.querySelector('.svg-scroll svg')?.classList.contains('morph-svg')).toBe(false);
  });

  it('keeps the 3-D view when a 2-D drawing attribute changes', async () => {
    const el = mount(hairpinChain());
    await el.setMorphProgress(0.6);
    el.setAttribute('debug-loops', 'on');
    // The redraw restores the view once the (already loaded) morph code resolves.
    await new Promise((r) => setTimeout(r, 0));
    expect(el.morphProgress).toBeCloseTo(0.6);
    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg?.classList.contains('morph-svg')).toBe(true);
    expect(el.shadowRoot!.querySelector('.morph-scrub')).toHaveProperty('value', '600');
  });

  it('keeps the 3-D view when the selection moves to another chain', async () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = {
      pdbId: 'tst1',
      chains: [hairpinChain(), { ...hairpinChain(), chainId: 'B' }],
    };
    await el.setMorphProgress(1);
    el.setAttribute('selection', 'B');
    await new Promise((r) => setTimeout(r, 0));
    expect(el.selection?.chainId).toBe('B');
    expect(el.morphProgress).toBe(1);
  });

  it('redraws only the chain picker when icon-bandwidth changes', async () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = {
      pdbId: 'tst1',
      chains: [hairpinChain(), { ...hairpinChain(), chainId: 'B' }],
    };
    await el.setMorphProgress(1);
    const root = el.shadowRoot!;
    const picker = root.querySelector('.chain-picker');
    const svg = root.querySelector('.svg-scroll svg');
    root.querySelector<HTMLButtonElement>('.chain-picker button')!.focus();
    el.setAttribute('icon-bandwidth', '4');
    expect(root.querySelector('.chain-picker')).not.toBe(picker);
    expect(root.querySelectorAll('.chain-picker')).toHaveLength(1);
    expect(root.querySelector('.svg-scroll svg')).toBe(svg);
    expect(el.morphProgress).toBe(1);
    expect(root.activeElement).toBe(root.querySelector('.chain-picker button'));
  });

  it('keeps the 3-D view for a new protein until resetView()', async () => {
    const el = mount(hairpinChain());
    await el.setMorphProgress(1);
    el.proteinData = { pdbId: 'tst2', chains: [hairpinChain()] };
    await new Promise((r) => setTimeout(r, 0));
    expect(el.morphProgress).toBe(1);
    el.resetView();
    expect(el.morphProgress).toBe(0);
    expect(el.shadowRoot!.querySelector('.svg-scroll svg')?.classList.contains('morph-svg')).toBe(
      false,
    );
  });

  it('keeps the 3-D view when residue data changes', async () => {
    const el = mount(hairpinChain());
    await el.setMorphProgress(1);
    el.residueColours = { A: { 1: 0.2, 2: 0.8 } };
    el.setAttribute('residue-widths', '{"A":{"1":1.5}}');
    el.setAttribute('colour-label', 'Conservation');
    await new Promise((r) => setTimeout(r, 0));
    expect(el.morphProgress).toBe(1);
  });

  it('ignores re-assigning the same protein data', async () => {
    const el = mount(hairpinChain());
    await el.setMorphProgress(1);
    const controller = (el as unknown as Internals)._morph;
    const data = el.proteinData;
    el.proteinData = data;
    expect((el as unknown as Internals)._morph).toBe(controller);
    expect(el.morphProgress).toBe(1);
  });

  it('jumps straight to 3-D when reduced motion is preferred', async () => {
    const spy = vi
      .spyOn(window, 'matchMedia')
      .mockImplementation(
        (q: string) => ({ matches: q.includes('reduce'), media: q }) as MediaQueryList,
      );
    try {
      const el = mount(hairpinChain());
      await el.toggle3d();
      expect(el.morphProgress).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('rolls up a β-barrel with its loops (cylinder mode)', async () => {
    const el = mount(syntheticBarrel({ n: 8 }));
    const scene = (el as unknown as Internals)._morphSource!.scene;
    expect(scene.mode).toBe('cylinder');
    expect(scene.loops.length).toBeGreaterThan(4);
    // Each loop's real path runs from the end of one element to the start of the next.
    const model = buildMorphModel(scene);
    for (const loop of model.loops) {
      if (loop.fromG >= 0) expect(loop.real[0]).toBe(loop.fromG);
      if (loop.toG >= 0) expect(loop.real[loop.real.length - 1]).toBe(loop.toG);
      expect(loop.realS[0]).toBe(0);
      expect(loop.realS[loop.realS.length - 1]).toBeCloseTo(1, 9);
    }
    await expectFiniteFrames(el);
  });

  it('rolls up a chain with a break, drawing the gap as dashes', async () => {
    // The hairpin without its loop: a 3-D jump splits the chain in two.
    const chain = hairpinChain();
    chain.calphas = chain.calphas.filter((c) => c.resSeq <= 22 || c.resSeq >= 28);
    chain.residueCount = chain.calphas.length;
    const el = mount(chain);
    const scene = (el as unknown as Internals)._morphSource!.scene;
    expect(scene.segments.length).toBeGreaterThan(1);
    const gap = scene.loops.find((l) => l.discontinuous);
    expect(gap).toBeDefined();
    await expectFiniteFrames(el);
    // At τ = 1 the break is drawn as several separate dashes.
    const dashed = [...el.shadowRoot!.querySelectorAll('.svg-scroll svg path')].filter(
      (p) =>
        (p.getAttribute('d')?.match(/M/g) ?? []).length > 2 && p.getAttribute('fill') === 'none',
    );
    expect(dashed.length).toBeGreaterThan(0);
  });

  it('fades neighbouring protomers of an assembly barrel to opaque as it rolls', async () => {
    const full = syntheticBarrel({ n: 8 });
    const per = Math.ceil(full.residueCount / 4);
    const chains: ChainData[] = [];
    for (let p = 0; p < 4; p++) {
      const lo = p * per + 1;
      const hi = Math.min((p + 1) * per, full.residueCount);
      const calphas = full.calphas.filter((c) => c.resSeq >= lo && c.resSeq <= hi);
      chains.push({
        chainId: String.fromCharCode(65 + p),
        residueCount: calphas.length,
        segments: full.segments.filter((s) => s.start >= lo && s.end <= hi).map((s) => ({ ...s })),
        calphas,
      });
    }
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'asm', chains } as ProteinData;
    const scene = (el as unknown as Internals)._morphSource!.scene;
    expect(scene.elements.some((e) => e.faded)).toBe(true);
    expect(scene.elements.some((e) => !e.faded)).toBe(true);
    const groupOpacities = (): string[] =>
      [...el.shadowRoot!.querySelectorAll('.svg-scroll svg g')]
        .filter((g) => g.getAttribute('display') !== 'none')
        .map((g) => g.getAttribute('opacity'))
        .filter((o): o is string => o !== null);
    await el.setMorphProgress(0.05);
    expect(groupOpacities().length).toBeGreaterThan(0);
    await el.setMorphProgress(1);
    expect(groupOpacities()).toEqual([]);
    await expectFiniteFrames(el);
  });
});
