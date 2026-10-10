// @vitest-environment node
// The layout stage must not need a DOM: these tests run without one.
import { describe, it, expect } from 'vitest';
import type { ChainData } from '../../../src/types.js';
import { analyseBarrel } from '../../../src/contacts/index.js';
import { resolveMembrane } from '../../../src/membrane/index.js';
import { getTheme } from '../../../src/theme/index.js';
import {
  LOOP,
  PLOT,
  build3d,
  buildSequence,
  layoutChain,
  type ChainLayout,
  type LoopRenderOptions,
} from '../../../src/layout/index.js';
import { syntheticBarrel } from '../fixtures/barrel.js';
import { threeHelixChain } from '../fixtures/helices.js';

const OPTS: LoopRenderOptions = { showPoints: false, extremePoints: true, extremeThreshold: 0.2 };
const MEMBRANE = resolveMembrane({}, null, []);

function layoutOf(chain: ChainData, showContacts = false): ChainLayout {
  const core = chain.calphas.filter((c) => Math.abs(c.z) < 12);
  return layoutChain(
    chain,
    OPTS,
    analyseBarrel(chain.calphas, chain.segments),
    showContacts,
    MEMBRANE,
    core,
  );
}

describe('layoutChain', () => {
  it('runs without a DOM and gives plain, serialisable data', () => {
    expect(typeof document).toBe('undefined');
    const layout = layoutOf(threeHelixChain());
    expect(JSON.parse(JSON.stringify(layout))).toEqual(layout);
  });

  it('is pure: the same inputs give the same layout', () => {
    expect(layoutOf(threeHelixChain())).toEqual(layoutOf(threeHelixChain()));
  });

  it('lays out each helix as a selectable element with a label at each end', () => {
    const layout = layoutOf(threeHelixChain());
    expect(layout.mode).toBe('polyline');
    expect(layout.elements.map((e) => [e.type, e.selectable])).toEqual([
      ['helix', { start: 1, end: 25 }],
      ['helix', { start: 29, end: 53 }],
      ['helix', { start: 57, end: 81 }],
    ]);
    expect(layout.elements.every((e) => e.sections.length > 0 && !e.withArrow)).toBe(true);
    expect(layout.labels.map((l) => l.text)).toEqual(['1', '25', '29', '53', '57', '81']);
    expect(layout.labels.every((l) => l.box !== null)).toBe(true);
  });

  it('puts elements and loops in one draw order', () => {
    const layout = layoutOf(threeHelixChain());
    const items = [...layout.elements, ...layout.loops].sort((a, b) => a.order - b.order);
    expect(items.map((i) => i.order)).toEqual(items.map((_, k) => k));
    expect(items.map((i) => ('type' in i ? i.type : 'loop'))).toEqual([
      'helix',
      'loop',
      'helix',
      'loop',
      'helix',
    ]);
    expect(layout.loops.map((l) => l.selectable)).toEqual([
      { start: 26, end: 28 },
      { start: 54, end: 56 },
    ]);
  });

  it('spaces consecutive elements a fixed gap apart', () => {
    const layout = layoutOf(threeHelixChain());
    const [seg] = layout.segments;
    const gapA = LOOP.elementGapPx / PLOT.arcPxPerA;
    for (let k = 1; k < layout.elements.length; k++) {
      const prevEnd = seg.samples[layout.elements[k - 1].end].arc;
      const nextStart = seg.samples[layout.elements[k].start].arc;
      expect(nextStart - prevEnd).toBeCloseTo(gapA, 6);
    }
  });

  it('frames the plot around the membrane and keeps its origin on the midplane', () => {
    const layout = layoutOf(threeHelixChain());
    const { frame, membrane } = layout;
    expect(frame.originX).toBe(PLOT.margin.left);
    expect(frame.width).toBeGreaterThan(0);
    expect(membrane.bulk).toEqual(MEMBRANE.bulk);
    expect(layout.segments.length).toBe(1);
    // The band spans the whole chain.
    const { x } = membrane.profile;
    const lastArc = layout.segments[0].samples[layout.segments[0].samples.length - 1].arc;
    expect(x[0]).toBeLessThanOrEqual(0);
    expect(x[x.length - 1]).toBeGreaterThanOrEqual(lastArc);
    // The plot shows the membrane and 1.5 thicknesses above it (issue #27).
    expect(frame.originY - PLOT.margin.top).toBeCloseTo(80 * PLOT.zPxPerA);
  });

  it('grows the frame only as far as the labels reach', () => {
    const layout = layoutOf(threeHelixChain());
    const { frame } = layout;
    const boxes = layout.labels.flatMap((l) => (l.box ? [l.box] : []));
    const top = Math.min(0, ...boxes.map((b) => frame.originY + b.cy - b.h / 2));
    const left = Math.min(0, ...boxes.map((b) => frame.originX + b.cx - b.w / 2));
    expect(frame.minY).toBeCloseTo(top, 9);
    expect(frame.minX).toBeCloseTo(left, 9);
  });

  it('unwraps a β-barrel: arrowed strands, and contact ties only when asked for', () => {
    const barrel = syntheticBarrel();
    const without = layoutOf(barrel);
    expect(without.mode).toBe('cylinder');
    expect(without.ties).toBeNull();
    expect(without.elements.length).toBe(8);
    expect(without.elements.every((e) => e.type === 'strand' && e.withArrow)).toBe(true);
    expect(without.segments.every((s) => s.unwrapArc && s.cylinder)).toBe(true);
    const withTies = layoutOf(barrel, true);
    expect(withTies.ties!.length).toBeGreaterThan(0);
  });
});

describe('insertion codes', () => {
  /** The three-helix chain with its first loop numbered 26, 26A, 27. */
  function withInsertion(): ChainData {
    const chain = threeHelixChain();
    for (const ca of chain.calphas) {
      if (ca.resSeq === 27) Object.assign(ca, { resSeq: 26, iCode: 'A' });
      else if (ca.resSeq === 28) ca.resSeq = 27;
    }
    return chain;
  }

  it('keeps 26 and 26A apart in loops and the sequence view', () => {
    const chain = withInsertion();
    const layout = layoutOf(chain);
    expect(layout.loops[0].residues).toEqual(['26', '26A', '27']);
    const colours: Record<string, string> = { '26': 'red', '26A': 'blue' };
    const seq = buildSequence(chain, layout, (key) => colours[key]);
    const i26 = seq.residues.findIndex((r) => r.resSeq === 26 && r.iCode === '');
    expect(seq.colourAt!(i26)).toBe('red');
    expect(seq.colourAt!(i26 + 1)).toBe('blue');
    // Each residue lands on its own place along the trace.
    for (let i = 1; i < seq.trace.length; i++) {
      expect(seq.trace[i].f).toBeGreaterThanOrEqual(seq.trace[i - 1].f);
    }
  });
});

describe('views from a layout', () => {
  it('builds the 3-D scene from the layout, in the same draw order', () => {
    const layout = layoutOf(threeHelixChain());
    const scene = build3d(layout, getTheme('light'))!;
    expect(scene).not.toBeNull();
    expect(scene.elements.map((e) => e.order)).toEqual(layout.elements.map((e) => e.order));
    expect(scene.loops.map((l) => l.residues)).toEqual(layout.loops.map((l) => l.residues));
    expect(scene.frame).toEqual(layout.frame);
    expect(scene.segments[0].display).toBe(layout.segments[0].samples);
  });

  it('gives no 3-D scene for a chain without 3-D positions', () => {
    const layout = { ...layoutOf(threeHelixChain()), morphable: false };
    expect(build3d(layout, getTheme('light'))).toBeNull();
  });

  it('builds the sequence source: every residue once, in order along the trace', () => {
    const chain = threeHelixChain();
    const layout = layoutOf(chain);
    const seq = buildSequence(chain, layout);
    expect(seq.residues.map((r) => r.resSeq)).toEqual(chain.calphas.map((c) => c.resSeq));
    expect(seq.elements.map((e) => e.type)).toEqual(['helix', 'helix', 'helix']);
    for (let i = 1; i < seq.trace.length; i++) {
      expect(seq.trace[i].f).toBeGreaterThanOrEqual(seq.trace[i - 1].f);
    }
    expect(seq.z.every((z) => Number.isFinite(z))).toBe(true);
    expect(seq.colourAt).toBeNull();
  });
});

describe('layoutChain plot size (issue #27)', () => {
  const layoutWith = (plot: { pxPerA?: number; heightPx?: number }): ChainLayout => {
    const chain = threeHelixChain();
    const core = chain.calphas.filter((c) => Math.abs(c.z) < 12);
    return layoutChain(
      chain,
      OPTS,
      analyseBarrel(chain.calphas, chain.segments),
      false,
      MEMBRANE,
      core,
      undefined,
      plot,
    );
  };

  it('defaults to 2.5 px/Å and a ±80 Å window about the midplane', () => {
    const { frame } = layoutWith({});
    expect(frame.pxPerA).toBe(PLOT.arcPxPerA);
    expect(frame.originY).toBeCloseTo(PLOT.margin.top + 80 * PLOT.zPxPerA);
    expect(frame.minY).toBe(0);
    expect(frame.height).toBeCloseTo(PLOT.margin.top + 160 * 2.5 + PLOT.margin.bottom);
  });

  it('scales the plot but keeps element sizes in px', () => {
    const base = layoutWith({});
    const big = layoutWith({ pxPerA: 5 });
    expect(big.frame.pxPerA).toBe(5);
    expect(big.frame.originY).toBeCloseTo(PLOT.margin.top + 80 * 5);
    // A helix is drawn about twice as long at twice the scale…
    const len = (l: ChainLayout): number => {
      const c = l.elements[0].centreline;
      return Math.hypot(c[c.length - 1].sx - c[0].sx, c[c.length - 1].sy - c[0].sy);
    };
    expect(len(big) / len(base)).toBeCloseTo(2, 1);
    // …but the fixed px gap between elements is the same number of px, so
    // fewer Å, and the diagram is less than twice as wide.
    expect(big.frame.width).toBeLessThan(2 * base.frame.width);
  });

  it('sets the plot height in px', () => {
    const { frame } = layoutWith({ heightPx: 200, pxPerA: 2 });
    expect(frame.height).toBeCloseTo(PLOT.margin.top + 200 + PLOT.margin.bottom);
    expect(frame.originY).toBeCloseTo(PLOT.margin.top + 100);
  });

  it('re-centres on a protein above the window and keeps a quarter of the membrane', () => {
    const chain = threeHelixChain();
    const lifted: ChainData = {
      ...chain,
      calphas: chain.calphas.map((c) => ({ ...c, z: c.z + 200 })),
    };
    const core = lifted.calphas.filter((c) => Math.abs(c.z - 200) < 12);
    const layout = layoutChain(
      lifted,
      OPTS,
      analyseBarrel(lifted.calphas, lifted.segments),
      false,
      MEMBRANE,
      core,
    );
    const { originY, pxPerA, height } = layout.frame;
    const bottomZ = (originY - (height - PLOT.margin.bottom)) / pxPerA;
    // Window bottom 10 Å below the upper leaflet (20 Å): a quarter of 40 Å.
    expect(bottomZ).toBeCloseTo(10, 0);
  });
});
