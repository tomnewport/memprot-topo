import { describe, it, expect, afterEach } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import type { ProteinData, ChainData } from '../../../src/types.js';

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
