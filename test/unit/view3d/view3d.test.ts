import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { unrollChain, unwrapBarrel } from '../../../src/unroll/index.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { buildView3DModel } from '../../../src/view3d/model.js';
import { computePose, localProgress } from '../../../src/view3d/curtain.js';
import { View3DRenderer } from '../../../src/view3d/renderer.js';
import { DEFAULT_VIEW3D_OPTIONS } from '../../../src/view3d/options.js';
import { Veil, type SurfaceShading } from '../../../src/view3d/membrane-layer.js';
import { fitLine, findKink } from '../../../src/view3d/prims/kinks.js';
import { Camera } from '../../../src/view3d/camera.js';
import { buildFishnet } from '../../../src/view3d/net.js';
import type { View3DScene, View3DSegment, View3DElement } from '../../../src/view3d/types.js';
import type { UnrollResult } from '../../../src/unroll/index.js';
import type {
  Calpha,
  ChainData,
  ProteinData,
  SecondaryStructureSegment,
} from '../../../src/types.js';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

const STYLE: View3DScene['style'] = {
  helixFill: '#6e8db6',
  helixStroke: '#3e587a',
  strandFill: '#6ea76d',
  strandStroke: '#3d6d3d',
  coil: '#666',
  membraneFill: '#eaeaea',
  membraneEdge: '#bdbdbd',
  membraneThinned: '#d6604d',
  membraneThickened: '#4393c3',
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
function elementsFor(unroll: UnrollResult, ss: SecondaryStructureSegment[]): View3DElement[] {
  const out: View3DElement[] = [];
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
  mode: View3DScene['mode'],
  unroll: UnrollResult,
  ss: SecondaryStructureSegment[],
  displayStretch = 1,
): View3DScene {
  const segments: View3DSegment[] = unroll.segments.map((seg) => ({
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
    slab: { x0: 0, x1: maxArc, upper: 15, lower: -15 },
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
  model: ReturnType<typeof buildView3DModel>,
  scene: View3DScene,
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
  const model = buildView3DModel(scene);

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

  it('fades the other chains in, rolled up in their real place, as the view goes 3-D', () => {
    // A second copy of the chain beside it, turned a little.
    const other: ChainData = {
      ...chain,
      chainId: 'B',
      calphas: chain.calphas.map((c) => ({ ...c, x: 30 + 0.9 * c.y, y: 12 - 0.9 * c.x })),
    };
    const oUnroll = unrollChain(other.calphas, { ssSegments: other.segments });
    const oScene = sceneFor('polyline', oUnroll, other.segments);
    const r = new View3DRenderer(model, undefined, 'mp', [buildView3DModel(oScene)]);
    r.configure(900, 0);
    // Both chains' rolled-up helices are one rigid copy of the real structure.
    const placed = r as unknown as {
      context: { model: typeof model; pose: { w: Float64Array } }[];
      rigidAt(t: number): Parameters<typeof computePose>[3];
    };
    const focal = computePose(model, 1, r.options.sweep, placed.rigidAt(1));
    const got: number[][] = [];
    const want: number[][] = [];
    for (const [m, w, sc] of [
      [model, focal.w, scene],
      [placed.context[0].model, placed.context[0].pose.w, oScene],
    ] as const) {
      for (const el of m.elements) {
        for (let g = el.g0; g <= el.g1; g++) {
          got.push([w[g * 4], w[g * 4 + 1], w[g * 4 + 2]]);
          const p = sc.segments[0].positions[g];
          want.push([p.x, p.y, p.z]);
        }
      }
    }
    expect(rigidError(got, want)).toBeLessThan(1e-3);
    // Not drawn early in the roll, drawn by the end.
    const alone = new View3DRenderer(model);
    alone.configure(900, 0);
    const drawn = (x: View3DRenderer, tau: number): number => {
      x.render(tau);
      return [...x.svg.querySelectorAll('path')].filter(
        (p) => p.getAttribute('display') !== 'none' && (p.getAttribute('d') ?? '') !== '',
      ).length;
    };
    expect(drawn(r, 0.2)).toBe(drawn(alone, 0.2));
    expect(drawn(r, 1)).toBeGreaterThan(drawn(alone, 1));
  });

  it('leaves the not-yet-rolled end flat and in place during an end-anchored sweep', () => {
    const endModel = buildView3DModel(scene, { anchor: 'end' });
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

describe('morph membrane', () => {
  const chain = hairpinChain();
  const unroll = unrollChain(chain.calphas, { ssSegments: chain.segments });
  const flat = sceneFor('polyline', unroll, chain.segments);
  // The same scene with a 2-D profile that dips 6 Å in the middle.
  const { x0, x1 } = flat.slab;
  const xs = Array.from({ length: 101 }, (_, i) => x0 + ((x1 - x0) * i) / 100);
  const dip = (x: number) => -6 * Math.exp(-(((x - (x0 + x1) / 2) / 6) ** 2));
  const dipped: View3DScene = {
    ...flat,
    slab: {
      ...flat.slab,
      profile: { x: xs, upper: xs.map((x) => 15 + dip(x)), lower: xs.map((x) => -15 - dip(x)) },
    },
  };

  /** The membrane rim's path data (the first path of the back layer). */
  function rimAt(scene: View3DScene, tau: number): string {
    const r = new View3DRenderer(buildView3DModel(scene));
    r.configure(900, 0);
    r.render(tau);
    return r.svg.querySelector('path')!.getAttribute('d')!;
  }

  /** Spread of the rim's projected y coordinates. */
  function ySpread(d: string): number {
    const ys = [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => Number(m[2]));
    return Math.max(...ys) - Math.min(...ys);
  }

  it('starts from the 2-D membrane profile and flattens it onto the bulk planes', () => {
    // Near t = 0 the rim follows the dip, so its outline differs from the flat one.
    expect(rimAt(dipped, 0.001)).not.toBe(rimAt(flat, 0.001));
    expect(rimAt(dipped, 0.001)).not.toMatch(/NaN|Infinity/);
    // By t = 0.3 the dip is gone and the rim is the flat bulk band.
    expect(rimAt(dipped, 0.35)).toBe(rimAt(flat, 0.35));
    // The flat band edge-on is exactly as tall as the bulk slab.
    expect(ySpread(rimAt(flat, 0))).toBeCloseTo(30 * flat.frame.pxPerA, 0);
  });

  /** The renderer's fishnet heights (upper leaflet) for a scene. */
  function netHeights(scene: View3DScene): number[] {
    const r = new View3DRenderer(buildView3DModel(scene));
    r.configure(900, 0);
    const net = (r as unknown as { net: { upper: Float64Array[] } }).net;
    return net.upper.flatMap((l) => [...l].filter((_, i) => i % 3 === 2));
  }

  /** Stroke paths drawn in the frame at `tau`. */
  function strokeCount(scene: View3DScene, tau: number): number {
    const r = new View3DRenderer(buildView3DModel(scene));
    r.configure(900, 0);
    r.render(tau);
    return [...r.svg.querySelectorAll('path')].filter((p) => p.getAttribute('fill') === 'none')
      .length;
  }

  it('draws a fishnet over each leaflet in 3-D, following the local surface', () => {
    expect(new Set(netHeights(flat))).toEqual(new Set([15]));
    // A 4 Å rise, in the frame of the scene's sample positions.
    const raised: View3DScene = {
      ...flat,
      slab: { ...flat.slab, surface: { upper: () => 19, lower: () => -19 } },
    };
    const zs = netHeights(raised);
    expect(Math.max(...zs)).toBeCloseTo(19, 6);
    expect(Math.min(...zs)).toBeCloseTo(15, 6);
    // Only once the leaflet sheets appear.
    expect(strokeCount(flat, 1)).toBeGreaterThan(strokeCount(flat, 0.2));
  });

  it('averages the local surface over 1.5 grid cells, kept within 6–12 Å', () => {
    const radii = new Set<number>();
    const surface = {
      upper: (_x: number, _y: number, radius: number) => (radii.add(radius), 19),
      lower: () => -19,
    };
    const scene: View3DScene = { ...flat, slab: { ...flat.slab, surface } };
    const radiiAt = (gridSpacing: number) => {
      radii.clear();
      const r = new View3DRenderer(buildView3DModel(scene), {
        ...DEFAULT_VIEW3D_OPTIONS,
        gridSpacing,
      });
      r.configure(900, 0);
      return [...radii].sort((a, b) => a - b);
    };
    // The pore test looks within 6 Å; the heights are averaged wider.
    expect(radiiAt(2)).toEqual([6]);
    expect(radiiAt(6)).toEqual([6, 9]);
    expect(radiiAt(20)).toEqual([6, 12]);
  });

  it('finds the local surface under a rolled-up β-barrel too', () => {
    const chain = syntheticBarrel({ n: 8 });
    const analysis = analyseBarrel(chain.calphas, chain.segments);
    const unroll = unwrapBarrel(chain.calphas, {
      ssSegments: chain.segments,
      centre: analysis.centre,
    });
    const barrel = sceneFor('cylinder', unroll, chain.segments, 1.3);
    // Thicker on the +x side of the structure's own frame.
    const surface = {
      upper: (x: number) => (x > analysis.centre.x ? 19 : 15),
      lower: () => -15,
    };
    const zs = netHeights({ ...barrel, slab: { ...barrel.slab, surface } });
    // About half of the disc inside its bulk ring and rim fade.
    expect(zs.filter((z) => z > 18.9).length).toBeGreaterThan(zs.length / 6);
    expect(zs.filter((z) => z < 15.1).length).toBeGreaterThan(zs.length / 4);
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
  const model = buildView3DModel(scene);

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
    const m = buildView3DModel(sc);
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
    const m = buildView3DModel(sc);
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
      const m = buildView3DModel(sc, { anchor: 'end' });
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
    const r = new View3DRenderer(model);
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

describe('Veil, surface style', () => {
  const BANDS = 13;
  const band = (dz: number) => Math.max(0, Math.min(BANDS - 1, Math.round(dz) + 6));
  /** Surface shading over a disc of radius 30 Å around an 8 Å ring of protein. */
  function shading(annular: { upper: number; lower: number }): SurfaceShading {
    const ring = Array.from({ length: 32 }, (_, i) => [
      8 * Math.cos((i * Math.PI) / 16),
      8 * Math.sin((i * Math.PI) / 16),
    ]).flat();
    const net = buildFishnet({
      centre: { x: 0, y: 0 },
      radius: 30,
      margin: 5,
      style: 'surface',
      bulk: { upper: 20, lower: -20 },
      annular,
      protein: ring,
    });
    const mesh = net.mesh!;
    const range = (zs: Float64Array): [number, number] => [Math.min(...zs), Math.max(...zs)];
    const thickening = (up: number, low: number) => up - low - 40;
    return {
      heightAt: net.heightAt,
      mesh,
      range: { upper: range(mesh.upper), lower: range(mesh.lower) },
      change: {
        upper: mesh.upper.map((z, v) => thickening(z, mesh.lower[v])),
        lower: mesh.lower.map((z, v) => thickening(mesh.upper[v], z)),
      },
      changeAt: (_leaf, ox, oy) =>
        thickening(net.heightAt('upper', ox, oy), net.heightAt('lower', ox, oy)),
      k: 1,
      colours: Array.from({ length: BANDS }, (_, i): [number, number, number] => [i * 10, 0, 0]),
    };
  }
  const camera = (el: number) =>
    new Camera({ target: [0, 0, 0], az: 0.3, el, scale: 4, fov: 0, diag: 1000, cx: 0, cy: 0 });

  /** The level a fine march along the line of sight finds. */
  function marched(cam: Camera, sf: SurfaceShading, x: number, y: number, z: number): number {
    const [dx, dy, dz] = [-cam.v[0], -cam.v[1], -cam.v[2]];
    let lv = 0;
    for (const [leaf, mult] of [
      ['upper', 1],
      ['lower', BANDS + 1],
    ] as const) {
      let prev = NaN;
      for (let s = 0; s < 200; s += 0.04) {
        const [px, py, pz] = [x + s * dx, y + s * dy, z + s * dz];
        if (Math.abs(pz) > 40) break;
        const h = sf.heightAt(leaf, px, py);
        const f = pz - h;
        if (!Number.isNaN(prev) && !Number.isNaN(f) && f <= 0 !== prev <= 0) {
          if (Math.hypot(px, py) <= 30) lv += (1 + band(sf.changeAt(leaf, px, py))) * mult;
          break;
        }
        prev = f;
      }
    }
    return lv;
  }

  it('tints by the thickness band where the line of sight meets the surface', () => {
    for (const annular of [
      { upper: 24, lower: -16 },
      { upper: 15, lower: -25 },
    ]) {
      const sf = shading(annular);
      for (const el of [0.6, 0.28, -0.5]) {
        const cam = camera(el);
        const veil = new Veil(cam, 0, 0, 30, 20, -20, 1, [200, 200, 200], sf);
        let agree = 0;
        let total = 0;
        for (let x = -15; x <= 15; x += 5)
          for (let y = -15; y <= 15; y += 5)
            for (let z = -27; z <= 27; z += 3) {
              total++;
              if (veil.level(x, y, z) === marched(cam, sf, x, y, z)) agree++;
            }
        // Only points within a hair of a band edge may differ.
        expect(agree / total).toBeGreaterThan(0.98);
      }
    }
    // Under a raised upper leaflet but above its bulk plane, seen from above:
    // the bilayer is thicker there.
    const sf = shading({ upper: 24, lower: -20 });
    const veil = new Veil(camera(0.6), 0, 0, 30, 20, -20, 1, [200, 200, 200], sf);
    expect(veil.level(-11, 0, 21) % (BANDS + 1)).toBeGreaterThan(band(0) + 1 + 1);
    // Both leaflets 4 Å up: the same thickness, so the bulk's band wherever
    // the line of sight meets either.
    const shifted = shading({ upper: 24, lower: -16 });
    const flat = new Veil(camera(0.6), 0, 0, 30, 20, -20, 1, [200, 200, 200], shifted);
    const seen = new Set<number>();
    for (let x = -15; x <= 15; x += 5)
      for (let z = -27; z <= 27; z += 3) {
        const lv = flat.level(x, 0, z);
        seen.add(lv % (BANDS + 1)).add(Math.floor(lv / (BANDS + 1)));
      }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1 + band(0)]);
  });

  it('tints by the far leaflet first, from above or below', () => {
    const sf = shading({ upper: 20, lower: -20 });
    const lv = 1 + 9 + (1 + 3) * (BANDS + 1);
    const c: [number, number, number] = [0, 0, 0];
    const from = (el: number) =>
      new Veil(camera(el), 0, 0, 30, 20, -20, 1, [200, 200, 200], sf).apply(c, lv)[0];
    // Upper band 9 (90), lower band 3 (30); upper 40 % opaque, lower 30 %.
    expect(from(0.6)).toBeCloseTo((0.7 * 0 + 0.3 * 30) * 0.6 + 0.4 * 90, 9);
    expect(from(-0.5)).toBeCloseTo((0.6 * 0 + 0.4 * 90) * 0.7 + 0.3 * 30, 9);
  });
});

describe('<topology-display> 3-D view', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mount(chain: ChainData): TopologyDisplay {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'tst1', chains: [chain] };
    return el;
  }

  it('offers a 1D / 2D / 3D switch next to the 2-D view', () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    const labels = [...root.querySelectorAll('.view-button')].map((b) => b.textContent);
    expect(labels).toEqual(['1D', '2D', '3D']);
    expect(root.querySelector('.dimension-toggle')?.textContent).toBe('3D');
    expect(root.querySelector('input[type=range]')).toBeNull();
    expect(el.transitionProgress).toBe(0);
    expect(el.dimension).toBe(2);
  });

  it('goes to a fractional dimension at once with transition-time 0', async () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    const svg2d = root.querySelector('.svg-scroll svg');
    const seen: number[] = [];
    el.addEventListener('dimension-change', (e) =>
      seen.push((e as CustomEvent<{ dimension: number }>).detail.dimension),
    );
    el.setAttribute('transition-time', '0');
    el.dimension = 1.3;
    expect(el.dimension).toBeCloseTo(1.3);
    expect(root.querySelector('.svg-scroll svg')?.classList.contains('sequence-view')).toBe(true);
    expect(seen.at(-1)).toBeCloseTo(1.3);
    el.dimension = 1;
    expect(el.dimension).toBe(1);
    expect(root.querySelector('.view-button[aria-pressed=true]')?.textContent).toBe('1D');
    el.dimension = 2;
    expect(root.querySelector('.svg-scroll svg')).toBe(svg2d);
    // The 3-D code loads on first use.
    el.dimension = 2.5;
    await vi.waitFor(() => expect(el.dimension).toBeCloseTo(2.5));
  });

  it('starts at the dimension the page set', () => {
    const el = new TopologyDisplay();
    el.setAttribute('dimension', '1');
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'tst1', chains: [hairpinChain()] };
    expect(el.dimension).toBe(1);
  });

  it('swaps in the 3-D SVG away from t = 0 and restores the 2-D SVG at t = 0', async () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    const svg2d = root.querySelector('.svg-scroll svg');
    await el.setTransitionProgress(0.5);
    const svg3d = root.querySelector('.svg-scroll svg');
    expect(svg3d).not.toBe(svg2d);
    expect(svg3d?.classList.contains('view3d-svg')).toBe(true);
    expect(root.querySelector('.dimension-toggle')?.getAttribute('aria-pressed')).toBe('true');
    // Loops are drawn as tubes in 3-D; every coordinate stays finite.
    await el.setTransitionProgress(1);
    const ds = [...root.querySelectorAll('.svg-scroll svg path')].map((p) => p.getAttribute('d'));
    expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    await el.setTransitionProgress(0);
    expect(root.querySelector('.svg-scroll svg')).toBe(svg2d);
    expect(root.querySelector('.dimension-toggle')?.getAttribute('aria-pressed')).toBe('false');
  });

  type Internals = {
    _view3d: unknown;
    _view3dSource: { scene: View3DScene } | null;
  };

  /** Every path coordinate of the shown SVG is finite at each τ. */
  async function expectFiniteFrames(el: TopologyDisplay): Promise<void> {
    for (const tau of [0.3, 0.6, 1]) {
      await el.setTransitionProgress(tau);
      const ds = [...el.shadowRoot!.querySelectorAll('.svg-scroll svg path')].map(
        (p) => p.getAttribute('d') ?? '',
      );
      expect(ds.some((d) => d.length > 0)).toBe(true);
      expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    }
  }

  it('loads the 3-D code only when the 3-D view is first asked for', async () => {
    const el = mount(hairpinChain());
    expect((el as unknown as Internals)._view3d).toBeNull();
    await el.setTransitionProgress(0.2);
    expect((el as unknown as Internals)._view3d).not.toBeNull();
  });

  it('takes the strand ribbon size from structure-strand-width and structure-strand-thickness', () => {
    type WithOptions = { _view3dSource: { options: Record<string, number> } | null };
    const el = mount(hairpinChain());
    const opts = () => (el as unknown as WithOptions)._view3dSource!.options;
    expect(opts().strandWidth).toBeUndefined();
    el.setAttribute('structure-strand-width', '10');
    el.setAttribute('structure-strand-thickness', '2.5');
    expect(opts().strandWidth).toBe(10);
    expect(opts().strandThickness).toBe(2.5);
    // The arrowhead keeps its default proportion to the ribbon (4.65 / 2.85).
    expect(opts().arrowWidth).toBeCloseTo((10 * 4.65) / 2.85);
    el.setAttribute('structure-strand-width', '-1');
    expect(opts().strandWidth).toBeUndefined();
  });

  it('sets the membrane grid spacing from structure-grid-spacing, in place', async () => {
    type WithNet = { _view3d: { renderer: { net: { spacing: number } } | null } | null };
    const el = mount(hairpinChain());
    await el.setTransitionProgress(1);
    const spacing = () => (el as unknown as WithNet)._view3d!.renderer!.net.spacing;
    const auto = spacing();
    expect(auto).toBeGreaterThanOrEqual(4);
    expect(auto).toBeLessThanOrEqual(8);
    el.setAttribute('structure-grid-spacing', '3');
    expect(spacing()).toBe(3);
    expect(el.transitionProgress).toBe(1);
    // At least 2 Å.
    el.setAttribute('structure-grid-spacing', '0.5');
    expect(spacing()).toBe(2);
    // At most the disc's radius: two lines across.
    el.setAttribute('structure-grid-spacing', '10000');
    expect(spacing()).toBeLessThan(100);
    expect(
      (el as unknown as { _view3d: { renderer: { net: { upper: unknown[] } } } })._view3d.renderer
        .net.upper,
    ).toHaveLength(2);
    el.setAttribute('structure-grid-spacing', 'auto');
    expect(spacing()).toBe(auto);
  });

  it('draws the membrane as polar lines or a coloured surface from structure-membrane-style, in place', async () => {
    type Net = { style: string; mesh: unknown; upper: unknown[] };
    type WithNet = { _view3d: { renderer: { net: Net } } };
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    // Annular leaflets that differ from the bulk, so the surface has colours.
    el.setAttribute('membrane-annular-upper', '15');
    await el.setTransitionProgress(1);
    const net = () => (el as unknown as WithNet)._view3d.renderer.net;
    const finite = () => {
      const ds = [...root.querySelectorAll('.svg-scroll svg path')].map((p) => p.getAttribute('d'));
      expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    };
    expect(net().style).toBe('grid');
    el.setAttribute('structure-membrane-style', 'polar');
    expect(net().style).toBe('polar');
    expect(net().upper.length).toBeGreaterThan(0);
    expect(el.transitionProgress).toBe(1);
    finite();
    el.setAttribute('structure-membrane-style', 'surface');
    expect(net().style).toBe('surface');
    expect(net().mesh).not.toBeNull();
    finite();
    // Colour bands behind the protein: the bulk, and the thicker bilayer
    // round the protein where the upper leaflet rises.
    const fills = [...root.querySelectorAll('.svg-scroll svg > g:first-of-type path')]
      .filter(
        (p) => p.getAttribute('display') !== 'none' && p.getAttribute('fill')?.startsWith('rgb'),
      )
      .map((p) => p.getAttribute('fill'));
    expect(new Set(fills).size).toBeGreaterThan(2);
    el.setAttribute('structure-membrane-style', 'wobbly');
    expect(net().style).toBe('grid');
  });

  it('colours the surface by how much thinner or thicker the bilayer is than the bulk', async () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    el.setAttribute('membrane-upper', '15');
    el.setAttribute('membrane-lower', '-15');
    el.setAttribute('structure-membrane-style', 'surface');
    await el.setTransitionProgress(1);
    const fills = async (annularUpper: number, annularLower: number) => {
      el.setAttribute('membrane-annular-upper', String(annularUpper));
      el.setAttribute('membrane-annular-lower', String(annularLower));
      await el.setTransitionProgress(1);
      const out = [...root.querySelectorAll('.svg-scroll svg > g:first-of-type path')]
        .filter((p) => p.getAttribute('display') !== 'none')
        .map((p) => p.getAttribute('fill')?.match(/^rgb\((\d+), ?(\d+), ?(\d+)\)$/))
        .filter((m) => m !== null && m !== undefined)
        .map((m) => [Number(m[1]), Number(m[2]), Number(m[3])]);
      expect(out.length).toBeGreaterThan(0);
      return out;
    };
    // Both leaflets 3 Å up round the protein: the same thickness, so no colour.
    for (const [r, g, b] of await fills(18, -12)) expect([r, g, b]).toEqual([234, 234, 234]);
    // 6 Å thicker round the protein: towards membraneThickened (blue) only.
    const thick = (await fills(18, -18)).filter(([r, , b]) => r !== b);
    expect(thick.length).toBeGreaterThan(0);
    for (const [r, , b] of thick) expect(b).toBeGreaterThan(r);
    // 6 Å thinner: towards membraneThinned (red) only.
    const thin = (await fills(12, -12)).filter(([r, , b]) => r !== b);
    expect(thin.length).toBeGreaterThan(0);
    for (const [r, , b] of thin) expect(r).toBeGreaterThan(b);
  });

  describe('membrane-detail blending', () => {
    // Animation frames run by hand, at a clock the test sets.
    let frames: Map<number, FrameRequestCallback>;
    let nextId: number;
    let now: number;
    beforeEach(() => {
      frames = new Map();
      nextId = 1;
      now = 1000;
      vi.spyOn(performance, 'now').mockImplementation(() => now);
      vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        frames.set(nextId, cb);
        return nextId++;
      });
      vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
    });
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
    /** Run the frames asked for so far, at time `t`. */
    const tick = (t: number) => {
      now = t;
      for (const [id, cb] of [...frames]) {
        if (!frames.delete(id)) continue;
        cb(t);
      }
    };
    const settle = () => new Promise((r) => setTimeout(r, 0));
    const BLEND = 625;

    function setUp() {
      const el = mount(hairpinChain());
      el.setAttribute('membrane-annular-upper', '15');
      el.setAttribute('membrane-detail', 'annular');
      tick(now + 10 * BLEND);
      // The 2-D drawing's band, also while the 3-D view stands in for it.
      const tops = () =>
        (el as unknown as { _shown: { svg: SVGSVGElement } })._shown.svg
          .querySelector('path.membrane')!
          .getAttribute('d')!
          .match(/-?\d+(?:\.\d+)?/g)!
          .map(Number)
          .filter((_, i) => i % 2);
      return { el, tops };
    }

    type Net = { upper: Float64Array[] };
    type Internals3d = {
      _view3d: { blending: boolean; renderer: { drawnNet: Net; net: Net } };
    };
    const zs = (net: Net) => net.upper.flatMap((l) => [...l]);

    it('blends the 2-D band, ending on the new one', () => {
      const { el, tops } = setUp();
      const annular = tops();
      now = 5000;
      el.setAttribute('membrane-detail', 'bulk');
      // The new band shows at once; the blend starts on the next frame.
      const bulk = tops();
      expect(bulk).not.toEqual(annular);
      tick(5000 + BLEND / 2);
      tops().forEach((z, i) => expect(z).toBeCloseTo((annular[i] + bulk[i]) / 2, 1));
      tick(5000 + BLEND);
      expect(tops()).toEqual(bulk);
      expect(frames.size).toBe(0);
    });

    it('blends from the band part-way through a blend, and leaves no frames behind', () => {
      const { el, tops } = setUp();
      const annular = tops();
      now = 5000;
      el.setAttribute('membrane-detail', 'bulk');
      const bulk = tops();
      tick(5000 + BLEND / 2);
      const halfway = tops();
      // Back again: from the halfway band to the annular one.
      now = 6000;
      el.setAttribute('membrane-detail', 'annular');
      expect(tops()).toEqual(annular);
      tick(6000);
      tops().forEach((z, i) => expect(z).toBeCloseTo(halfway[i], 1));
      tick(6000 + BLEND);
      expect(tops()).toEqual(annular);
      expect(frames.size).toBe(0);
      expect(halfway).not.toEqual(bulk);
    });

    it('switches at once while the view moves, and finishes a blend when the view leaves 2-D', async () => {
      const { el, tops } = setUp();
      // Have the 3-D code loaded, so the transition starts on the next frame.
      await el.setTransitionProgress(0);
      now = 5000;
      el.setAttribute('membrane-detail', 'bulk');
      const bulk = tops();
      tick(5000 + BLEND / 4);
      expect(tops()).not.toEqual(bulk);
      // Off towards 3-D: the 2-D band is the morph's first frame, so it ends now.
      el.dimension = 3;
      await settle();
      tick(5000 + BLEND / 2);
      expect(tops()).toEqual(bulk);
      // A detail change mid-transition doesn't blend the band.
      el.setAttribute('membrane-detail', 'annular');
      const annular = tops();
      tick(5000 + BLEND);
      expect(tops()).toEqual(annular);
      // Finish the transition at once.
      el.setAttribute('transition-time', '0');
      el.dimension = 2;
      expect(frames.size).toBe(0);
    });

    it('blends the 3-D membrane, and stops cleanly when the style changes', async () => {
      const { el } = setUp();
      await el.setTransitionProgress(1);
      const internals = () => (el as unknown as Internals3d)._view3d;
      const flat = zs(internals().renderer.drawnNet);
      now = 5000;
      el.setAttribute('membrane-detail', 'bulk');
      await settle();
      expect(el.transitionProgress).toBe(1);
      const target = zs(internals().renderer.net);
      expect(target).not.toEqual(flat);
      tick(5000);
      zs(internals().renderer.drawnNet).forEach((z, i) => expect(z).toBeCloseTo(flat[i], 9));
      tick(5000 + BLEND / 2);
      expect(internals().blending).toBe(true);
      // A new style is a new membrane: the blend ends.
      el.setAttribute('structure-membrane-style', 'polar');
      expect(internals().blending).toBe(false);
      expect(internals().renderer.drawnNet).toBe(internals().renderer.net);
      tick(5000 + BLEND);
      expect(frames.size).toBe(0);
      expect(el.transitionProgress).toBe(1);
    });

    it('does not blend with transition-time 0, reduced motion or no change in detail', async () => {
      const { el } = setUp();
      await el.setTransitionProgress(1);
      el.setAttribute('transition-time', '0');
      el.setAttribute('membrane-detail', 'bulk');
      await settle();
      expect(frames.size).toBe(0);
      el.removeAttribute('transition-time');
      // An unknown detail is the default, local: the same as no attribute.
      el.removeAttribute('membrane-detail');
      await settle();
      tick(now + 10 * BLEND);
      el.setAttribute('membrane-detail', 'nonsense');
      await settle();
      expect(frames.size).toBe(0);
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }));
      el.setAttribute('membrane-detail', 'annular');
      await settle();
      await el.setTransitionProgress(0);
      el.setAttribute('membrane-detail', 'bulk');
      await settle();
      expect(frames.size).toBe(0);
    });
  });

  it('changes 3-D settings in place, keeping the 3-D view', async () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    await el.setTransitionProgress(1);
    const controller = (el as unknown as Internals)._view3d;
    const before = root.querySelector('.svg-scroll svg');
    el.setAttribute('structure-projection', 'perspective');
    el.setAttribute('structure-strand-width', '6');
    el.setAttribute('transition-sweep', '0');
    // Same controller and progress; a new 3-D picture.
    expect((el as unknown as Internals)._view3d).toBe(controller);
    expect(el.transitionProgress).toBe(1);
    const after = root.querySelector('.svg-scroll svg');
    expect(after).not.toBe(before);
    expect(after?.classList.contains('view3d-svg')).toBe(true);
    expect(root.querySelectorAll('.svg-scroll svg')).toHaveLength(1);
    const ds = [...root.querySelectorAll('.svg-scroll svg path')].map((p) => p.getAttribute('d'));
    expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    // Back to 2-D shows the original drawing.
    await el.setTransitionProgress(0);
    expect(root.querySelector('.svg-scroll svg')?.classList.contains('view3d-svg')).toBe(false);
  });

  it('keeps the 3-D view when a 2-D drawing attribute changes', async () => {
    const el = mount(hairpinChain());
    await el.setTransitionProgress(0.6);
    el.setAttribute('debug', 'loops');
    // The redraw restores the view once the (already loaded) 3-D code resolves.
    await new Promise((r) => setTimeout(r, 0));
    expect(el.transitionProgress).toBeCloseTo(0.6);
    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg?.classList.contains('view3d-svg')).toBe(true);
    expect(el.dimension).toBeCloseTo(2.6);
  });

  it('keeps the 3-D view when the selection moves to another chain', async () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = {
      pdbId: 'tst1',
      chains: [hairpinChain(), { ...hairpinChain(), chainId: 'B' }],
    };
    await el.setTransitionProgress(1);
    el.setAttribute('selection', 'B');
    await new Promise((r) => setTimeout(r, 0));
    expect(el.selection?.chainId).toBe('B');
    expect(el.transitionProgress).toBe(1);
  });

  it('redraws only the chain picker when chain-icon-bandwidth changes', async () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = {
      pdbId: 'tst1',
      chains: [hairpinChain(), { ...hairpinChain(), chainId: 'B' }],
    };
    await el.setTransitionProgress(1);
    const root = el.shadowRoot!;
    const picker = root.querySelector('.chain-picker');
    const svg = root.querySelector('.svg-scroll svg');
    root.querySelector<HTMLButtonElement>('.chain-picker button')!.focus();
    el.setAttribute('chain-icon-bandwidth', '4');
    expect(root.querySelector('.chain-picker')).not.toBe(picker);
    expect(root.querySelectorAll('.chain-picker')).toHaveLength(1);
    expect(root.querySelector('.svg-scroll svg')).toBe(svg);
    expect(el.transitionProgress).toBe(1);
    expect(root.activeElement).toBe(root.querySelector('.chain-picker button'));
  });

  it('keeps the 3-D view for a new protein until resetView()', async () => {
    const el = mount(hairpinChain());
    await el.setTransitionProgress(1);
    el.proteinData = { pdbId: 'tst2', chains: [hairpinChain()] };
    await new Promise((r) => setTimeout(r, 0));
    expect(el.transitionProgress).toBe(1);
    el.resetView();
    expect(el.transitionProgress).toBe(0);
    expect(el.shadowRoot!.querySelector('.svg-scroll svg')?.classList.contains('view3d-svg')).toBe(
      false,
    );
  });

  it('keeps the 3-D view when residue data changes', async () => {
    const el = mount(hairpinChain());
    await el.setTransitionProgress(1);
    el.residueColours = { A: { 1: 0.2, 2: 0.8 } };
    el.setAttribute('residue-widths', '{"A":{"1":1.5}}');
    el.setAttribute('colour-label', 'Conservation');
    await new Promise((r) => setTimeout(r, 0));
    expect(el.transitionProgress).toBe(1);
  });

  it('keeps the 3-D view when the membrane changes', async () => {
    const el = mount(hairpinChain());
    await el.setTransitionProgress(1);
    el.setAttribute('membrane-upper', '22');
    el.setAttribute('membrane-annular-lower', '-16');
    el.distortions = null;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.transitionProgress).toBe(1);
    expect(el.membrane!.bulk.upper).toBe(22);
  });

  it('ignores re-assigning the same protein data', async () => {
    const el = mount(hairpinChain());
    await el.setTransitionProgress(1);
    const controller = (el as unknown as Internals)._view3d;
    const data = el.proteinData;
    el.proteinData = data;
    expect((el as unknown as Internals)._view3d).toBe(controller);
    expect(el.transitionProgress).toBe(1);
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
      expect(el.transitionProgress).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('rolls up a β-barrel with its loops (cylinder mode)', async () => {
    const el = mount(syntheticBarrel({ n: 8 }));
    const scene = (el as unknown as Internals)._view3dSource!.scene;
    expect(scene.mode).toBe('cylinder');
    expect(scene.loops.length).toBeGreaterThan(4);
    // Each loop's real path runs from the end of one element to the start of the next.
    const model = buildView3DModel(scene);
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
    const scene = (el as unknown as Internals)._view3dSource!.scene;
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
    const scene = (el as unknown as Internals)._view3dSource!.scene;
    expect(scene.elements.some((e) => e.faded)).toBe(true);
    expect(scene.elements.some((e) => !e.faded)).toBe(true);
    const groupOpacities = (): string[] =>
      [...el.shadowRoot!.querySelectorAll('.svg-scroll svg g')]
        .filter((g) => g.getAttribute('display') !== 'none')
        .map((g) => g.getAttribute('opacity'))
        .filter((o): o is string => o !== null);
    await el.setTransitionProgress(0.05);
    expect(groupOpacities().length).toBeGreaterThan(0);
    await el.setTransitionProgress(1);
    expect(groupOpacities()).toEqual([]);
    await expectFiniteFrames(el);
  });
});
