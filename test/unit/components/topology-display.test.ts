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

    // Changing the attribute resets selection back to default
    el.setAttribute('protein-data', JSON.stringify({ pdbId: 'dimer', chains: [tm, tmB] }));
    expect(
      el.shadowRoot!.querySelector('.chain-violin.selected')!.getAttribute('aria-label'),
    ).toContain('A(I)');
  });

  it('shows placeholder for invalid JSON in protein-data attribute', () => {
    const el = attach(new TopologyDisplay());
    el.setAttribute('protein-data', 'not valid json {{{');
    expect(el.shadowRoot!.querySelector('.placeholder')).not.toBeNull();
  });

  it('renders correctly when protein-data attribute is set before connecting to DOM', () => {
    const el = new TopologyDisplay();
    el.setAttribute('protein-data', JSON.stringify(tmHelixProtein()));
    attach(el);
    // connectedCallback triggers render() after the element is inserted
    expect(el.shadowRoot!.querySelector('.svg-scroll svg')).not.toBeNull();
  });
});
