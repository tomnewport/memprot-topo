import { describe, it, expect } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import type { ProteinData } from '../../../src/types.js';

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

describe('TopologyDisplay (unrolled SVG)', () => {
  it('renders an SVG with a helix-coloured path for a TM helix chain', () => {
    const el = new TopologyDisplay();
    document.body.appendChild(el);
    el.proteinData = tmHelixProtein();

    const svg = el.shadowRoot!.querySelector('.svg-scroll svg');
    expect(svg).not.toBeNull();
    const paths = svg!.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
    const colours = Array.from(paths).map((p) => p.getAttribute('stroke'));
    expect(colours).toContain('#1f77b4'); // helix
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
