import { describe, it, expect, afterEach } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import type { ProteinData, ChainData } from '../../../src/types.js';
import { syntheticBarrel } from '../fixtures/barrel.js';

function tmHelixProtein(): ProteinData {
  // 28-residue chain: idealised TM helix with z spanning -20 → +20, then a
  // short loop on the periplasmic side that walks back in xy.
  // Rise per residue ≈ 1.5 Å, ≈ 3.6 residues per turn, radius 2.3 Å (real helix
  // params), so xy positions trace a circle while z climbs.
  const calphas = [];
  const R = 2.3;
  for (let i = 0; i < 24; i++) {
    const theta = (i * 2 * Math.PI) / 3.6;
    calphas.push({
      resSeq: i + 1,
      iCode: '',
      x: R * Math.cos(theta),
      y: R * Math.sin(theta),
      z: -20 + i * (40 / 23),
    });
  }
  // Four residues of loop on the periplasmic side.
  for (let i = 0; i < 4; i++) {
    calphas.push({
      resSeq: 25 + i,
      iCode: '',
      x: 5 + i * 3,
      y: 0,
      z: 22,
    });
  }
  return {
    pdbId: 'tst1',
    chains: [
      {
        chainId: 'A',
        residueCount: 28,
        segments: [{ start: 1, end: 24, type: 'helix' }],
        calphas,
      },
    ],
  };
}

function discontinuousLoopProtein(): ProteinData {
  // Two short helices connected by a loop whose residue numbers have gaps
  // (missing residues 5 and 7). All Cα-Cα distances < 5.5 Å (no 3-D break).
  const calphas = [
    { resSeq: 1, iCode: '', x: 0, y: 0, z: -5 },
    { resSeq: 2, iCode: '', x: 0, y: 0, z: -2 },
    { resSeq: 3, iCode: '', x: 0, y: 0, z: 1 },
    { resSeq: 4, iCode: '', x: 0, y: 0, z: 4 },
    // Loop: residues 6, 8, 10 — gaps of 2 (residues 5, 7, 9 are missing).
    { resSeq: 6, iCode: '', x: 3, y: 0, z: 8 },
    { resSeq: 8, iCode: '', x: 6, y: 0, z: 9 },
    { resSeq: 10, iCode: '', x: 9, y: 0, z: 8 },
    { resSeq: 11, iCode: '', x: 12, y: 0, z: 4 },
    { resSeq: 12, iCode: '', x: 12, y: 0, z: 1 },
    { resSeq: 13, iCode: '', x: 12, y: 0, z: -2 },
    { resSeq: 14, iCode: '', x: 12, y: 0, z: -5 },
  ];
  return {
    pdbId: 'dis1',
    chains: [
      {
        chainId: 'A',
        residueCount: 11,
        segments: [
          { start: 1, end: 4, type: 'helix' },
          { start: 6, end: 10, type: 'coil' },
          { start: 11, end: 14, type: 'helix' },
        ],
        calphas,
      },
    ],
  };
}

function tinySsLoopProtein(): ProteinData {
  // Two real helices joined by a loop that the SS assignment splits with a
  // spurious 2-residue "helix" (res 8-9). All Cα-Cα distances < 5.5 Å (no
  // break). The tiny helix should be folded into the loop, leaving one
  // continuous coil run and just two SS polygons.
  const calphas = [
    { resSeq: 1, iCode: '', x: 0, y: 0, z: -12 },
    { resSeq: 2, iCode: '', x: 0, y: 0, z: -9 },
    { resSeq: 3, iCode: '', x: 0, y: 0, z: -6 },
    { resSeq: 4, iCode: '', x: 0, y: 0, z: -3 },
    { resSeq: 5, iCode: '', x: 0, y: 0, z: 0 },
    { resSeq: 6, iCode: '', x: 1, y: 0, z: 3 },
    { resSeq: 7, iCode: '', x: 3, y: 0, z: 5 },
    { resSeq: 8, iCode: '', x: 6, y: 0, z: 6 },
    { resSeq: 9, iCode: '', x: 9, y: 0, z: 6 },
    { resSeq: 10, iCode: '', x: 12, y: 0, z: 5 },
    { resSeq: 11, iCode: '', x: 14, y: 0, z: 3 },
    { resSeq: 12, iCode: '', x: 15, y: 0, z: 0 },
    { resSeq: 13, iCode: '', x: 15, y: 0, z: -3 },
    { resSeq: 14, iCode: '', x: 15, y: 0, z: -6 },
    { resSeq: 15, iCode: '', x: 15, y: 0, z: -9 },
    { resSeq: 16, iCode: '', x: 15, y: 0, z: -12 },
  ];
  return {
    pdbId: 'tny1',
    chains: [
      {
        chainId: 'A',
        residueCount: 16,
        segments: [
          { start: 1, end: 5, type: 'helix' },
          { start: 8, end: 9, type: 'helix' },
          { start: 12, end: 16, type: 'helix' },
        ],
        calphas,
      },
    ],
  };
}

function chainBreakWithCoilProtein(): ProteinData {
  // Two helices each with a dangling coil residue, separated by a large 3-D gap.
  // The trailing coil of segment 1 and the leading coil of segment 2 should be
  // absorbed into a single dashed cross-break connector rather than appearing as
  // separate stubs.
  const calphas = [
    { resSeq: 1, iCode: '', x: 0, y: 0, z: -12 },
    { resSeq: 2, iCode: '', x: 0, y: 0, z: -9 },
    { resSeq: 3, iCode: '', x: 0, y: 0, z: -6 },
    { resSeq: 4, iCode: '', x: 0, y: 0, z: -3 },
    // One coil residue before the break.
    { resSeq: 5, iCode: '', x: 0, y: 0, z: 0 },
    // Large spatial jump → unroller splits here.
    { resSeq: 20, iCode: '', x: 30, y: 0, z: 0 },
    // One coil residue after the break.
    { resSeq: 21, iCode: '', x: 30, y: 0, z: -3 },
    { resSeq: 22, iCode: '', x: 30, y: 0, z: -6 },
    { resSeq: 23, iCode: '', x: 30, y: 0, z: -9 },
    { resSeq: 24, iCode: '', x: 30, y: 0, z: -12 },
  ];
  return {
    pdbId: 'bkc1',
    chains: [
      {
        chainId: 'A',
        residueCount: 10,
        segments: [
          { start: 1, end: 4, type: 'helix' },
          { start: 21, end: 24, type: 'helix' },
        ],
        calphas,
      },
    ],
  };
}

function chainBreakProtein(): ProteinData {
  // Two helices separated by a large 3-D gap (> 5.5 Å between consecutive Cα),
  // so the unroller splits them into separate segments joined by a chain-break
  // connector. Residues 5+ are unmodelled across the break.
  const calphas = [
    { resSeq: 1, iCode: '', x: 0, y: 0, z: -5 },
    { resSeq: 2, iCode: '', x: 0, y: 0, z: -2 },
    { resSeq: 3, iCode: '', x: 0, y: 0, z: 1 },
    { resSeq: 4, iCode: '', x: 0, y: 0, z: 4 },
    // Big spatial jump (Δx = 30 Å) → 3-D break.
    { resSeq: 20, iCode: '', x: 30, y: 0, z: 4 },
    { resSeq: 21, iCode: '', x: 30, y: 0, z: 1 },
    { resSeq: 22, iCode: '', x: 30, y: 0, z: -2 },
    { resSeq: 23, iCode: '', x: 30, y: 0, z: -5 },
  ];
  return {
    pdbId: 'brk1',
    chains: [
      {
        chainId: 'A',
        residueCount: 8,
        segments: [
          { start: 1, end: 4, type: 'helix' },
          { start: 20, end: 23, type: 'helix' },
        ],
        calphas,
      },
    ],
  };
}

function betaBarrelChain(): ChainData {
  // 4-strand antiparallel beta barrel with 3-residue loops.
  // Strands are ~3 Å/residue in z, well within the 5.5 Å break threshold.
  const calphas = [];
  const segments = [];
  let resSeq = 1;

  for (let s = 0; s < 4; s++) {
    const strandStart = resSeq;
    const xBase = s * 5;
    const goingUp = s % 2 === 0;

    for (let j = 0; j < 10; j++) {
      calphas.push({
        resSeq: resSeq++,
        iCode: '',
        x: xBase,
        y: 0,
        z: goingUp ? -15 + j * (30 / 9) : 15 - j * (30 / 9),
      });
    }
    segments.push({ start: strandStart, end: resSeq - 1, type: 'strand' as const });

    if (s < 3) {
      const loopStart = resSeq;
      const loopZ = goingUp ? 18 : -18;
      const nextX = (s + 1) * 5;
      for (let j = 0; j < 3; j++) {
        calphas.push({
          resSeq: resSeq++,
          iCode: '',
          x: xBase + ((j + 1) * (nextX - xBase)) / 4,
          y: 0,
          z: loopZ,
        });
      }
      segments.push({ start: loopStart, end: resSeq - 1, type: 'coil' as const });
    }
  }

  return { chainId: 'A', residueCount: resSeq - 1, segments, calphas };
}

describe('TopologyDisplay (unrolled SVG)', () => {
  it('renders an SVG with a helix-coloured polygon for a TM helix chain', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tmHelixProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg).not.toBeNull();
    const polygons = svg!.querySelectorAll('polygon');
    expect(polygons.length).toBeGreaterThan(0);
    const fills = Array.from(polygons).map((p) => p.getAttribute('fill'));
    expect(fills).toContain('#6e8db6'); // helix
  });

  it('renders a membrane slab rect at z = ±15', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tmHelixProtein();
    const rect = el.shadowRoot!.querySelector('.svg-scroll svg rect');
    expect(rect).not.toBeNull();
    expect(rect!.getAttribute('y')).toBe('-15');
    expect(rect!.getAttribute('height')).toBe('30');
  });

  it('does not render the main unrolled SVG when chain has no Cα', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = {
      pdbId: 'empty',
      chains: [{ chainId: 'A', residueCount: 0, segments: [], calphas: [] }],
    };
    expect(el.shadowRoot!.querySelector('.svg-scroll')).toBeNull();
  });

  it('handles missing proteinData (placeholder text)', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('.placeholder')).not.toBeNull();
  });

  it('renders a violin per chain in the picker and defaults selection to the TM chain', () => {
    const tm = tmHelixProtein().chains[0];
    const solubleChain = {
      chainId: 'S',
      residueCount: 50,
      segments: [],
      calphas: Array.from({ length: 50 }, (_, i) => ({
        resSeq: i + 1,
        iCode: '',
        x: i,
        y: 0,
        z: 35,
      })),
    };
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'fusion', chains: [tm, solubleChain] };

    const violins = el.shadowRoot!.querySelectorAll('.chain-violin');
    expect(violins).toHaveLength(2);

    const selected = el.shadowRoot!.querySelector('.chain-violin.selected');
    expect(selected).not.toBeNull();
    expect(selected!.getAttribute('aria-label')).toContain('chain A');

    const mainLabels = Array.from(el.shadowRoot!.querySelectorAll('.chain-label')).map(
      (n) => n.textContent,
    );
    expect(mainLabels).toHaveLength(1);
    expect(mainLabels[0]).toContain('Chain A');
  });

  it('switches the displayed chain when a different violin is clicked', () => {
    const tm = tmHelixProtein().chains[0];
    const tmB = { ...tm, chainId: 'B' };
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'dimer', chains: [tm, tmB] };

    // Chains A and B share the same residue count → homomeric A(I)/A(II) labels.
    const violinII = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.chain-violin'),
    ).find((b) => b.getAttribute('aria-label')?.includes('A(II)'));
    expect(violinII).toBeDefined();
    violinII!.click();

    const mainLabel = el.shadowRoot!.querySelector('.chain-label')!.textContent ?? '';
    // textContent flattens the DOM so <sub>II</sub> contributes just "II": "Chain AII · …"
    expect(mainLabel).toContain('AII');
    const selected = el.shadowRoot!.querySelector('.chain-violin.selected');
    expect(selected!.getAttribute('aria-label')).toContain('A(II)');
  });

  it('renders one strand polygon per strand run for a beta barrel chain, all with arrowhead vertices', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'brl1', chains: [betaBarrelChain()] };

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg).not.toBeNull();
    const strandPolys = Array.from(svg!.querySelectorAll('polygon')).filter(
      (p) => p.getAttribute('fill') === '#6ea76d',
    );
    // 4 strands → 4 strand polygons.
    expect(strandPolys.length).toBe(4);

    // The body of a strand of N samples contributes 2N vertices (left + right
    // walk). An integrated arrowhead inserts 5 additional vertices (back-left,
    // wing 1, tip, wing 2, back-right), so every strand polygon must have an
    // odd vertex count > 5.
    for (const poly of strandPolys) {
      const count = (poly.getAttribute('points') ?? '').trim().split(/\s+/).length;
      expect(count).toBeGreaterThan(5);
      expect(count % 2).toBe(1);
    }
  });

  it('renders strands as polygons without arrowhead vertices for non-barrel chains', () => {
    // A mostly-helical chain with a small strand insertion — strand should
    // still be a polygon (so it has flat butt ends) but with no arrowhead.
    const tm = tmHelixProtein();
    const ch = tm.chains[0];
    ch.segments = [
      { start: 1, end: 12, type: 'helix' },
      { start: 13, end: 20, type: 'strand' },
      { start: 21, end: 24, type: 'helix' },
    ];

    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tm;

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg).not.toBeNull();
    const strandPolys = Array.from(svg!.querySelectorAll('polygon')).filter(
      (p) => p.getAttribute('fill') === '#6ea76d',
    );
    // Exactly one strand polygon.
    expect(strandPolys.length).toBe(1);
    // Body-only polygon: vertex count is 2N (even).
    const count = (strandPolys[0].getAttribute('points') ?? '').trim().split(/\s+/).length;
    expect(count % 2).toBe(0);
  });

  it('does not render strand polygons for a purely helical chain', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tmHelixProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg).not.toBeNull();
    const strandPolys = Array.from(svg!.querySelectorAll('polygon')).filter(
      (p) => p.getAttribute('fill') === '#6ea76d',
    );
    expect(strandPolys.length).toBe(0);
  });

  it('renders helix polygons with a darker edge stroke for outline', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tmHelixProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    const helixPolys = Array.from(svg!.querySelectorAll('polygon')).filter(
      (p) => p.getAttribute('fill') === '#6e8db6',
    );
    expect(helixPolys.length).toBeGreaterThan(0);
    expect(helixPolys.every((p) => p.getAttribute('stroke') === '#3e587a')).toBe(true);
  });

  it('labels each helix/strand polygon with its start and end residue numbers', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tmHelixProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg')!;
    const texts = Array.from(svg.querySelectorAll('text')).map((t) => t.textContent);
    // tmHelixProtein has one helix from residue 1 to 24.
    expect(texts).toContain('1');
    expect(texts).toContain('24');
  });

  it('labels every strand of a beta barrel with its start and end residue numbers', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'brl1', chains: [betaBarrelChain()] };

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg')!;
    const texts = new Set(Array.from(svg.querySelectorAll('text')).map((t) => t.textContent));
    // Strand boundaries: 1-10, 14-23, 27-36, 40-49 (3-residue coil loops between).
    for (const r of [1, 10, 14, 23, 27, 36, 40, 49]) {
      expect(texts.has(String(r))).toBe(true);
    }
  });

  it('places each residue-number label snug against its SS polygon (not drifted away)', () => {
    // The label for each helix/strand endpoint should sit just past the
    // polygon tip along the tangent — not pushed several tens of pixels
    // away as a collision-avoidance side-effect.
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'brl1', chains: [betaBarrelChain()] };

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg')!;
    // Polygon points are in user-space (Å). Labels live in screen space.
    // Convert vertices to the same scale to compare distances.
    const arcPxPerA = 2.5;
    const zPxPerA = 2.5;
    const polygonVerts = Array.from(svg.querySelectorAll('polygon')).flatMap((p) =>
      (p.getAttribute('points') ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((pt) => {
          const [x, y] = pt.split(',').map(Number);
          return { x: x * arcPxPerA, y: -y * zPxPerA };
        }),
    );

    const labels = Array.from(svg.querySelectorAll('text'));
    expect(labels.length).toBeGreaterThan(0);
    const MAX_DIST_PX = 15;
    for (const label of labels) {
      const cx = parseFloat(label.getAttribute('x') ?? '0');
      const cy = parseFloat(label.getAttribute('y') ?? '0');
      let minDist = Infinity;
      for (const v of polygonVerts) {
        const d = Math.hypot(cx - v.x, cy - v.y);
        if (d < minDist) minDist = d;
      }
      expect(
        minDist,
        `label "${label.textContent}" is ${minDist.toFixed(1)}px from the nearest polygon vertex`,
      ).toBeLessThan(MAX_DIST_PX);
    }
  });

  it('renders each coil run as a smooth spline path through control points', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'brl1', chains: [betaBarrelChain()] };

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    // betaBarrelChain has 3 inter-strand loops → 3 path elements.
    const loopPaths = Array.from(svg!.querySelectorAll('path'));
    expect(loopPaths.length).toBe(3);
    // Each loop is a smooth cubic-Bézier spline: a moveto followed by multiple
    // `C` segments, with no straight `L` rasterisation.
    for (const p of loopPaths) {
      const d = p.getAttribute('d') ?? '';
      expect(d.startsWith('M')).toBe(true);
      expect((d.match(/C/g) ?? []).length).toBeGreaterThan(1);
      expect(d).not.toContain('L');
    }
  });

  it('does not dash continuous loop paths', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'brl1', chains: [betaBarrelChain()] };

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    const loopPaths = svg!.querySelectorAll('path');
    expect(loopPaths.length).toBeGreaterThan(0);
    for (const p of loopPaths) {
      expect(p.getAttribute('stroke-dasharray')).toBeNull();
    }
  });

  it('renders discontinuous loops as dashed paths', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = discontinuousLoopProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    const loopPaths = Array.from(svg!.querySelectorAll('path'));
    // One loop with sequence gaps.
    expect(loopPaths.length).toBe(1);
    expect(loopPaths[0].getAttribute('stroke-dasharray')).toBe('3 5');
  });

  it('hides loop control-point markers by default and shows them via the debug-loops attribute', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'brl1', chains: [betaBarrelChain()] };

    // Default: control-point markers are hidden.
    let markers = el.shadowRoot!.querySelectorAll('.loop-debug-point');
    expect(markers.length).toBe(0);

    // Showing via attribute draws them without affecting the loop paths.
    el.setAttribute('debug-loops', 'on');
    markers = el.shadowRoot!.querySelectorAll('.loop-debug-point');
    expect(markers.length).toBe(12);
    expect(el.shadowRoot!.querySelectorAll('.svg-scroll svg path').length).toBe(3);
  });

  it('adds two vertical-extreme control points when a loop overshoots the tangent range', () => {
    const el = new TopologyDisplay();
    el.setAttribute('debug-loops', 'on');
    document.body.appendChild(el);
    // The loop (z up to 9) reaches above the tangent points (z 8) of the
    // flanking helices, triggering the two extreme points: 4 base + 2 = 6.
    el.proteinData = discontinuousLoopProtein();

    const markers = el.shadowRoot!.querySelectorAll('.loop-debug-point');
    expect(markers.length).toBe(6);
  });

  it('omits vertical-extreme points when loop-extreme-points is off', () => {
    const el = new TopologyDisplay();
    el.setAttribute('debug-loops', 'on');
    el.setAttribute('loop-extreme-points', 'off');
    document.body.appendChild(el);
    el.proteinData = discontinuousLoopProtein();

    // Only the 4 base markers (2 endpoint + 2 tangent); no extreme pair.
    const markers = el.shadowRoot!.querySelectorAll('.loop-debug-point');
    expect(markers.length).toBe(4);
  });

  it('respects a raised loop-extreme-threshold by suppressing the extreme points', () => {
    const el = new TopologyDisplay();
    el.setAttribute('debug-loops', 'on');
    // A large threshold relative to the flanking tangents' narrow z-range
    // suppresses the extreme points (4 base markers, no extreme pair).
    el.setAttribute('loop-extreme-threshold', '50');
    document.body.appendChild(el);
    el.proteinData = discontinuousLoopProtein();

    const markers = el.shadowRoot!.querySelectorAll('.loop-debug-point');
    expect(markers.length).toBe(4);
  });

  it('folds sub-3-residue SS elements into the surrounding loop', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tinySsLoopProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    // The spurious 2-residue helix is dropped: only the two real helices are
    // drawn as SS polygons, joined by a single continuous loop path.
    expect(svg!.querySelectorAll('polygon').length).toBe(2);
    const loopPaths = Array.from(svg!.querySelectorAll('path'));
    expect(loopPaths.length).toBe(1);
    expect(loopPaths[0].getAttribute('stroke-dasharray')).toBeNull();
  });

  it('reports SS counts excluding sub-3-residue elements', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tinySsLoopProtein();

    const label = el.shadowRoot!.querySelector('.chain-label')!.textContent ?? '';
    expect(label).toContain('2 helices');
  });

  it('renders the chain-break connector as a dashed Catmull-Rom curve', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = chainBreakProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    // No in-segment loops; the only path is the break connector.
    const paths = Array.from(svg!.querySelectorAll('path'));
    expect(paths.length).toBe(1);
    const d = paths[0].getAttribute('d') ?? '';
    expect(d.startsWith('M')).toBe(true);
    // A curved connector is a multi-segment cubic-Bézier spline, not a line.
    expect((d.match(/C/g) ?? []).length).toBeGreaterThan(1);
    expect(d).not.toContain('L');
    expect(paths[0].getAttribute('stroke-dasharray')).toBe('3 5');
  });

  it('merges trailing/leading coil stubs into a single cross-break curve', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = chainBreakWithCoilProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    // The trailing coil of segment 1 and the leading coil of segment 2 should
    // NOT appear as separate stub paths — only the one cross-break connector.
    const paths = Array.from(svg!.querySelectorAll('path'));
    expect(paths.length).toBe(1);
    expect(paths[0].getAttribute('stroke-dasharray')).toBe('3 5');
  });

  it('warns when the user views a chain that does not cross the bilayer', () => {
    const tm = tmHelixProtein().chains[0];
    const solubleChain = {
      chainId: 'S',
      residueCount: 50,
      segments: [],
      calphas: Array.from({ length: 50 }, (_, i) => ({
        resSeq: i + 1,
        iCode: '',
        x: i,
        y: 0,
        z: 35,
      })),
    };
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = { pdbId: 'fusion', chains: [tm, solubleChain] };

    const violinS = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.chain-violin'),
    ).find((b) => b.getAttribute('aria-label')?.includes('chain S'));
    violinS!.click();

    const note = el.shadowRoot!.querySelector('.chain-note');
    expect(note).not.toBeNull();
    expect(note!.textContent).toContain('does not appear to span the membrane');
  });
});

describe('TopologyDisplay live attribute updates', () => {
  const attached: HTMLElement[] = [];

  function attach<T extends HTMLElement>(el: T): T {
    document.body.appendChild(el);
    attached.push(el);
    return el;
  }

  afterEach(() => {
    for (const el of attached.splice(0)) document.body.removeChild(el);
  });

  it('renders SVG when protein-data attribute is set after connection', () => {
    const el = attach(new TopologyDisplay());
    expect(el.shadowRoot!.querySelector('.svg-scroll')).toBeNull();

    el.setAttribute('protein-data', JSON.stringify(tmHelixProtein()));

    expect(el.shadowRoot!.querySelector('.svg-scroll svg')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.placeholder')).toBeNull();
  });

  it('re-renders with new protein when protein-data attribute changes', () => {
    const el = attach(new TopologyDisplay());
    el.setAttribute('protein-data', JSON.stringify(tmHelixProtein()));

    const second: ProteinData = {
      pdbId: 'brl1',
      chains: [betaBarrelChain()],
    };
    el.setAttribute('protein-data', JSON.stringify(second));

    const title = el.shadowRoot!.querySelector('.protein-id');
    expect(title).not.toBeNull();
    expect(title!.textContent).toBe('brl1');
  });

  it('shows placeholder when protein-data attribute is removed', () => {
    const el = attach(new TopologyDisplay());
    el.setAttribute('protein-data', JSON.stringify(tmHelixProtein()));
    expect(el.shadowRoot!.querySelector('.svg-scroll')).not.toBeNull();

    el.removeAttribute('protein-data');

    expect(el.shadowRoot!.querySelector('.placeholder')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.svg-scroll')).toBeNull();
  });

  it('resets chain selection when protein-data attribute changes', () => {
    const tm = tmHelixProtein().chains[0];
    const tmB = { ...tm, chainId: 'B' };
    const el = attach(new TopologyDisplay());
    el.setAttribute('protein-data', JSON.stringify({ pdbId: 'dimer', chains: [tm, tmB] }));

    // Switch to chain B via click
    const violins = el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.chain-violin');
    const violinB = Array.from(violins).find((b) =>
      b.getAttribute('aria-label')?.includes('A(II)'),
    );
    violinB!.click();
    expect(
      el.shadowRoot!.querySelector('.chain-violin.selected')!.getAttribute('aria-label'),
    ).toContain('A(II)');

    // Changing the attribute (different JSON — pdbId updated) resets selection back to default
    el.setAttribute('protein-data', JSON.stringify({ pdbId: 'dimer-v2', chains: [tm, tmB] }));
    expect(
      el.shadowRoot!.querySelector('.chain-violin.selected')!.getAttribute('aria-label'),
    ).toContain('A(I)');
  });

  it('shows placeholder for invalid JSON in protein-data attribute', () => {
    const el = attach(new TopologyDisplay());
    el.setAttribute('protein-data', 'not valid json {{{');
    expect(el.shadowRoot!.querySelector('.placeholder')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.svg-scroll')).toBeNull();
  });

  it('renders correctly when protein-data attribute is set before connecting to DOM', () => {
    const el = new TopologyDisplay();
    el.setAttribute('protein-data', JSON.stringify(tmHelixProtein()));
    attach(el);
    // connectedCallback triggers render() after the element is inserted
    expect(el.shadowRoot!.querySelector('.svg-scroll svg')).not.toBeNull();
  });
});

describe('TopologyDisplay (β-barrel cylindrical unwrap)', () => {
  const mounted: HTMLElement[] = [];
  function mount(protein: ProteinData, attrs: Record<string, string> = {}): TopologyDisplay {
    const el = new TopologyDisplay();
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    document.body.appendChild(el);
    mounted.push(el);
    el.proteinData = protein;
    return el;
  }
  afterEach(() => {
    for (const el of mounted) el.remove();
    mounted.length = 0;
  });

  function barrelProtein(): ProteinData {
    return { pdbId: 'barl', chains: [syntheticBarrel({ n: 8 })] };
  }

  it('annotates the chain label with the detected barrel geometry', () => {
    const el = mount(barrelProtein());
    const label = el.shadowRoot!.querySelector('.chain-label')!.textContent ?? '';
    expect(label).toContain('β-barrel');
    expect(label).toContain('8 strands');
  });

  it('draws one arrowed strand polygon per strand of the barrel', () => {
    const el = mount(barrelProtein());
    const strandPolys = Array.from(
      el.shadowRoot!.querySelectorAll('.svg-scroll svg polygon'),
    ).filter((p) => p.getAttribute('fill') === '#6ea76d');
    expect(strandPolys.length).toBe(8);
    // Arrowheads give an odd vertex count > 5.
    for (const poly of strandPolys) {
      const count = (poly.getAttribute('points') ?? '').trim().split(/\s+/).length;
      expect(count % 2).toBe(1);
    }
  });

  it('renders the barrel strands parallel (consistent slant, not a chevron)', () => {
    // Each strand polygon's principal axis should share the same slant sign;
    // a cumulative-arc unroll would alternate the sign between up/down strands.
    const el = mount(barrelProtein());
    const strandPolys = Array.from(
      el.shadowRoot!.querySelectorAll('.svg-scroll svg polygon'),
    ).filter((p) => p.getAttribute('fill') === '#6ea76d');

    const slantSigns = strandPolys.map((poly) => {
      const verts = (poly.getAttribute('points') ?? '')
        .trim()
        .split(/\s+/)
        .map((pt) => pt.split(',').map(Number));
      let minY = Infinity;
      let maxY = -Infinity;
      let xAtMin = 0;
      let xAtMax = 0;
      for (const [x, y] of verts) {
        if (y < minY) {
          minY = y;
          xAtMin = x;
        }
        if (y > maxY) {
          maxY = y;
          xAtMax = x;
        }
      }
      return Math.sign(xAtMax - xAtMin);
    });
    // All strands lean the same way.
    expect(new Set(slantSigns).size).toBe(1);
  });

  it('hides β-sheet contact ties by default, overlaid when show-contacts is on', () => {
    const off = mount(barrelProtein());
    expect(off.shadowRoot!.querySelectorAll('.contact-ties line').length).toBe(0);

    const on = mount(barrelProtein(), { 'show-contacts': 'on' });
    expect(on.shadowRoot!.querySelectorAll('.contact-ties line').length).toBeGreaterThan(0);
  });

  /** Strand polygons' vertex lists (x,y user-space coords) in document order. */
  function strandVerts(el: TopologyDisplay): number[][][] {
    return Array.from(el.shadowRoot!.querySelectorAll('.svg-scroll svg polygon'))
      .filter((p) => p.getAttribute('fill') === '#6ea76d')
      .map((p) =>
        (p.getAttribute('points') ?? '')
          .trim()
          .split(/\s+/)
          .map((pt) => pt.split(',').map(Number)),
      );
  }

  function minVertexDistance(a: number[][], b: number[][]): number {
    let m = Infinity;
    for (const [ax, ay] of a)
      for (const [bx, by] of b) m = Math.min(m, Math.hypot(ax - bx, ay - by));
    return m;
  }

  it('never draws strands tangled — strand centres advance and no two strands overlap', () => {
    const polys = strandVerts(mount(barrelProtein()));
    // Centres strictly left-to-right (no strand slid back over an earlier one).
    let prev = -Infinity;
    for (const v of polys) {
      const xs = v.map((p) => p[0]);
      const centre = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(centre).toBeGreaterThan(prev);
      prev = centre;
    }
    // No two strand polygons come within touching distance of each other.
    for (let i = 0; i < polys.length; i++)
      for (let j = i + 1; j < polys.length; j++)
        expect(minVertexDistance(polys[i], polys[j])).toBeGreaterThan(0.5);
  });

  it('keeps strands untangled when a floating loop helix sits between them', () => {
    // OmpF's L-loop helix sits ~28 Å above the membrane, sharing no z-overlap
    // with the strands. Packing each element against all previously placed ones
    // (not just the immediately previous) stops it from shoving a strand back
    // over an earlier strand.
    const chain = syntheticBarrel({ n: 8, loopHelixAfterStrand: 0, loopHelixZ: 28 });
    const el = mount({ pdbId: 'barh', chains: [chain] });
    const polys = strandVerts(el);
    expect(polys.length).toBe(8);
    let prev = -Infinity;
    for (const v of polys) {
      const xs = v.map((p) => p[0]);
      const centre = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(centre).toBeGreaterThan(prev);
      prev = centre;
    }
    for (let i = 0; i < polys.length; i++)
      for (let j = i + 1; j < polys.length; j++)
        expect(minVertexDistance(polys[i], polys[j])).toBeGreaterThan(0.5);
  });

  it('keeps every helix within the strand span (never flung off on a giant loop)', () => {
    // A helix must not be placed left of the first strand or right of the last:
    // the ordering rule stops an element binding to a far-back strand and being
    // flung backwards on a huge loop to it.
    const chain = syntheticBarrel({ n: 8, loopHelixAfterStrand: 3, loopHelixZ: 18 });
    const el = mount({ pdbId: 'barhx', chains: [chain] });
    const strandCentres = strandVerts(el).map((v) => {
      const xs = v.map((p) => p[0]);
      return (Math.min(...xs) + Math.max(...xs)) / 2;
    });
    const lo = Math.min(...strandCentres);
    const hi = Math.max(...strandCentres);
    const helixCentres = Array.from(el.shadowRoot!.querySelectorAll('.svg-scroll svg polygon'))
      .filter((p) => p.getAttribute('fill') === '#6e8db6')
      .map((p) => {
        const xs = (p.getAttribute('points') ?? '')
          .trim()
          .split(/\s+/)
          .map((pt) => Number(pt.split(',')[0]));
        return (Math.min(...xs) + Math.max(...xs)) / 2;
      });
    for (const c of helixCentres) {
      expect(c).toBeGreaterThanOrEqual(lo);
      expect(c).toBeLessThanOrEqual(hi);
    }
  });

  it('lays helices out forwards — lowest residue number on the left', () => {
    // Every non-barrel element should read N→C left-to-right (only alternate
    // barrel strands may run backwards).
    const chain = syntheticBarrel({ n: 8, loopHelixAfterStrand: 3, loopHelixZ: 4 });
    const helix = chain.segments.find((s) => s.type === 'helix')!;
    const el = mount({ pdbId: 'barfwd', chains: [chain] });
    const labelX = new Map<number, number>();
    for (const t of el.shadowRoot!.querySelectorAll('.svg-scroll svg text')) {
      labelX.set(Number(t.textContent), Number(t.getAttribute('x')));
    }
    const startX = labelX.get(helix.start);
    const endX = labelX.get(helix.end);
    expect(startX).toBeDefined();
    expect(endX).toBeDefined();
    expect(endX!).toBeGreaterThanOrEqual(startX!);
  });

  it('renders a multi-chain assembly barrel with the focal protomer highlighted', () => {
    // Split one 8-strand barrel into 4 two-strand "protomers" (no single chain
    // is a barrel), like α-hemolysin's heptamer.
    const full = syntheticBarrel({ n: 8 });
    const per = Math.ceil(full.residueCount / 4);
    const chains: ChainData[] = [];
    for (let p = 0; p < 4; p++) {
      const lo = p * per + 1;
      const hi = Math.min((p + 1) * per, full.residueCount);
      const calphas = full.calphas.filter((c) => c.resSeq >= lo && c.resSeq <= hi);
      const segments = full.segments
        .filter((s) => s.start >= lo && s.end <= hi)
        .map((s) => ({ ...s }));
      chains.push({
        chainId: String.fromCharCode(65 + p),
        residueCount: calphas.length,
        segments,
        calphas,
      });
    }
    const el = mount({ pdbId: 'asm', chains });

    expect(el.shadowRoot!.querySelector('.chain-label')!.textContent).toContain('across 4 chains');
    const strandPolys = Array.from(
      el.shadowRoot!.querySelectorAll('.svg-scroll svg polygon'),
    ).filter((p) => p.getAttribute('fill') === '#6ea76d');
    expect(strandPolys.length).toBe(8); // all 8 strands of the assembly drawn
    const faded = strandPolys.filter((p) => p.getAttribute('opacity') === '0.32');
    // Some strands faded (neighbours) and some solid (focal protomer).
    expect(faded.length).toBeGreaterThan(0);
    expect(faded.length).toBeLessThan(strandPolys.length);
  });
});
