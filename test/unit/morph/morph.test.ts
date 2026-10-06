import { describe, it, expect, afterEach } from 'vitest';
import { unrollChain, unwrapBarrel } from '../../../src/unroll/index.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { buildMorphModel } from '../../../src/morph/model.js';
import { computePose, localProgress } from '../../../src/morph/curtain.js';
import { MorphRenderer } from '../../../src/morph/renderer.js';
import type { MorphScene, MorphSegment, MorphElement } from '../../../src/morph/types.js';
import type { UnrollResult } from '../../../src/unroll/index.js';
import type { Calpha, ChainData, SecondaryStructureSegment } from '../../../src/types.js';
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

  it('swaps in the morph SVG away from t = 0 and restores the 2-D SVG at t = 0', () => {
    const el = mount(hairpinChain());
    const root = el.shadowRoot!;
    const svg2d = root.querySelector('.svg-scroll svg');
    el.setMorphProgress(0.5);
    const morph = root.querySelector('.svg-scroll svg');
    expect(morph).not.toBe(svg2d);
    expect(morph?.classList.contains('morph-svg')).toBe(true);
    expect(root.querySelector('.morph-toggle')?.getAttribute('aria-pressed')).toBe('true');
    // Loops are drawn as tubes in 3-D; every coordinate stays finite.
    el.setMorphProgress(1);
    const ds = [...root.querySelectorAll('.svg-scroll svg path')].map((p) => p.getAttribute('d'));
    expect(ds.join('')).not.toMatch(/NaN|Infinity/);
    el.setMorphProgress(0);
    expect(root.querySelector('.svg-scroll svg')).toBe(svg2d);
    expect(root.querySelector('.morph-toggle')?.getAttribute('aria-pressed')).toBe('false');
  });
});
