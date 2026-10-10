// @vitest-environment node
// Direct tests of the modules split out of view3d/renderer.ts (#84). The
// builders, the engine's merging and the colour helpers need no DOM.
import { describe, it, expect } from 'vitest';
import type { ChainData } from '../../../src/types.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { resolveMembrane } from '../../../src/membrane/index.js';
import { getTheme } from '../../../src/theme/index.js';
import { build3d, layoutChain } from '../../../src/layout/index.js';
import { buildView3DModel, type View3DModel } from '../../../src/view3d/model.js';
import { computePose } from '../../../src/view3d/curtain.js';
import { Camera } from '../../../src/view3d/camera.js';
import { DEFAULT_VIEW3D_OPTIONS } from '../../../src/view3d/options.js';
import { hexRgb, mixRgb, saturate, shade, smooth, type RGB } from '../../../src/view3d/colour.js';
import {
  CONTEXT_ID,
  Run,
  convexHull,
  dashPieces,
  mergeRuns,
  separated,
  type OpSpec,
  type Prim,
} from '../../../src/view3d/engine.js';
import { Veil, buildNet, rimPrims, type MembraneEnv } from '../../../src/view3d/membrane-layer.js';
import type { PrimEnv } from '../../../src/view3d/prims/env.js';
import type { FrameCtx } from '../../../src/view3d/prims/frame.js';
import { cylinderGradient, downsample, helixPrims } from '../../../src/view3d/prims/helix.js';
import { strandPrims } from '../../../src/view3d/prims/strand.js';
import { loopPrims, tiePrims } from '../../../src/view3d/prims/loop.js';
import { threeHelixChain } from '../fixtures/helices.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

function modelOf(chain: ChainData, showContacts = false): View3DModel {
  const membrane = resolveMembrane({}, null, []);
  const layout = layoutChain(
    chain,
    { showPoints: false, extremePoints: true, extremeThreshold: 0.2 },
    analyseBarrel(chain.calphas, chain.segments),
    showContacts,
    membrane,
    chain.calphas.filter((c) => Math.abs(c.z) < 12),
  );
  return buildView3DModel(build3d(layout, getTheme('light'))!);
}

const WHITE: RGB = [255, 255, 255];

function envOf(model: View3DModel): PrimEnv {
  return {
    model,
    options: DEFAULT_VIEW3D_OPTIONS,
    colours: {
      helix: [200, 80, 80],
      helixEdge: '#802020',
      strand: [80, 80, 200],
      strandEdge: '#202080',
      coil: [90, 90, 90],
    },
    ground: WHITE,
    tmp: new Float64Array(8),
    kinks: new Map(),
    sharpKinks: new Set(),
    precompute: () => {},
  };
}

/** A frame at `tau`, viewed from above at elevation `el` once it is 3-D. */
function frameAt(model: View3DModel, tau: number, el = 0.6): FrameCtx {
  const pose = computePose(model, tau, 0);
  const pxA = model.scene.frame.pxPerA;
  const cam = new Camera({
    target: [0, 0, 0],
    az: 0,
    el: tau > 0 ? el : 0,
    scale: pxA,
    fov: 0,
    diag: 1000,
    cx: 400,
    cy: 300,
  });
  const proj = new Float64Array(model.n * 4);
  for (let k = 0; k < model.n; k++) {
    cam.project(pose.w[k * 4], pose.w[k * 4 + 1], pose.w[k * 4 + 2], proj, k * 4);
  }
  return {
    model,
    pose,
    cam,
    proj,
    scale: pxA,
    sigma: smooth(0.02, 0.65, tau),
    eW: smooth(0, 0.55, tau),
    eLoop: smooth(0, 0.7, tau),
    fogAt: () => 0,
    pxA,
    prims: [],
    veil: new Veil(cam, 0, 0, 1, 20, -20, 0, [220, 220, 220], null),
    endShift: new Map(),
  };
}

function opsOf(prims: Prim[]): ReturnType<Run['sortedOps']> {
  const run = new Run(0, false, true, 100);
  for (const p of prims) p.emit(run);
  return run.sortedOps();
}

describe('colour', () => {
  it('parses hex and rgb() colours', () => {
    expect(hexRgb('#f00')).toEqual([255, 0, 0]);
    expect(hexRgb('#336699')).toEqual([0x33, 0x66, 0x99]);
    expect(hexRgb('rgb(1, 2, 3)')).toEqual([1, 2, 3]);
  });

  it('mixes, desaturates and shades', () => {
    expect(mixRgb([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25]);
    const grey = saturate([200, 100, 0], 0);
    expect(grey[0]).toBeCloseTo(grey[1], 6);
    expect(grey[1]).toBeCloseTo(grey[2], 6);
    // σ = 0 is the flat 2-D colour; fog mixes towards the ground.
    expect(shade([10, 20, 30], 0.5, 0, 0, 0, WHITE)).toEqual([10, 20, 30]);
    expect(shade([0, 0, 0], 1, 0, 0, 1, WHITE)).toEqual(WHITE);
  });
});

describe('engine', () => {
  it('finds convex hulls and separating axes', () => {
    const hull = convexHull([0, 0, 1, 0, 1, 1, 0, 1, 0.5, 0.5]);
    expect(hull.length).toBe(8);
    const far = convexHull([5, 5, 6, 5, 6, 6, 5, 6]);
    expect(separated(hull, far, 0.5)).toBe(true);
    expect(separated(hull, convexHull([0.5, 0.5, 2, 0.5, 2, 2]), 0)).toBe(false);
  });

  it('cuts a polyline into dash pieces along its phases', () => {
    const pieces = dashPieces([0, 0, 16, 0], [0, 16], 3, 8);
    expect(pieces.map((p) => [p[0], p[2]])).toEqual([
      [0, 3],
      [8, 11],
    ]);
  });

  it('merges pieces of one element into one run unless another element lies between', () => {
    const spec: OpSpec = { layer: 0, key: 'f', kind: 'fill' };
    const prim = (id: number, x: number): Prim => ({
      id,
      order: id,
      sub: x,
      depth: 0,
      x0: x,
      y0: 0,
      x1: x + 10,
      y1: 10,
      faded: false,
      pts: [x, 0, x + 10, 0, x + 10, 10, x, 10],
      emit: (run) => run.fill(spec, [x, 0, x + 10, 0, x + 10, 10, x, 10], [1, 2, 3]),
    });
    const frame = { fadeOpacity: 1, contextOpacity: 1, coordScale: 100 };
    expect(mergeRuns([prim(1, 0), prim(1, 50)], 200, 50, frame).length).toBe(1);
    // A different element drawn over the first piece blocks the merge.
    expect(mergeRuns([prim(1, 0), prim(2, 5), prim(1, 8)], 200, 50, frame).length).toBe(3);
    expect(CONTEXT_ID).toBeGreaterThan(1000);
  });
});

describe('prims', () => {
  const helices = modelOf(threeHelixChain());
  const barrel = modelOf(syntheticBarrel(), true);

  it('builds each helix from pieces tagged with its id', () => {
    for (const tau of [0, 1]) {
      const ctx = frameAt(helices, tau);
      for (const el of helices.elements) helixPrims(envOf(helices), ctx, el);
      const ids = new Set(ctx.prims.map((p) => p.id));
      expect(ids).toEqual(new Set(helices.elements.map((e) => e.id)));
      expect(ctx.prims.every((p) => Number.isFinite(p.depth) && p.x1 >= p.x0)).toBe(true);
      expect(opsOf(ctx.prims).length).toBeGreaterThan(0);
    }
  });

  it('shades a 3-D helix with a cylinder gradient', () => {
    const ctx = frameAt(helices, 1);
    helixPrims(envOf(helices), ctx, helices.elements[0]);
    expect(opsOf(ctx.prims).some((op) => op.spec.kind === 'gradient')).toBe(true);
    const g = cylinderGradient(WHITE, 0, 0, 1, 0, 10, [200, 0, 0], 1, 0);
    expect(g.stops.length).toBeGreaterThan(2);
    expect(g.x2 - g.x1).toBeCloseTo(20, 6);
  });

  it('thins samples to a minimum on-screen step', () => {
    const ctx = frameAt(helices, 0);
    const { g0, g1 } = helices.elements[0];
    const all = downsample(ctx, g0, g1, 0);
    const few = downsample(ctx, g0, g1, 5);
    expect(all[0]).toBe(g0);
    expect(all[all.length - 1]).toBe(g1);
    expect(few.length).toBeLessThan(all.length);
  });

  it('builds strands, loops and contact ties', () => {
    const ctx = frameAt(barrel, 0.5);
    const env = envOf(barrel);
    for (const el of barrel.elements) strandPrims(env, ctx, el);
    const strandIds = new Set(ctx.prims.map((p) => p.id));
    expect(strandIds.size).toBe(barrel.elements.length);
    for (const loop of barrel.loops) loopPrims(env, ctx, loop);
    expect(new Set(ctx.prims.map((p) => p.id)).size).toBeGreaterThan(strandIds.size);
    const before = ctx.prims.length;
    tiePrims(env, ctx, 0.5);
    expect(ctx.prims.length).toBeGreaterThan(before);
  });
});

describe('membrane layer', () => {
  it('fits a fishnet to the finished pose and draws the leaflet rims', () => {
    const model = modelOf(threeHelixChain());
    const pose = computePose(model, 1, 0);
    const env: MembraneEnv = {
      model,
      options: DEFAULT_VIEW3D_OPTIONS,
      ground: WHITE,
      tmp: new Float64Array(8),
      back: null as unknown as MembraneEnv['back'],
      context: [],
      drawnNet: null,
    };
    const net = buildNet(env, pose, 0, 0, 40);
    expect(net.upper.length).toBeGreaterThan(0);
    expect(net.lower.length).toBeGreaterThan(0);
    const ctx = frameAt(model, 1);
    rimPrims(env, ctx, 0, 0, 40, 20, -20, 1);
    expect(ctx.prims.length).toBeGreaterThan(0);
  });
});
