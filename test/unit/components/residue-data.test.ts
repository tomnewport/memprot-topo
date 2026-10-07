import { describe, it, expect, afterEach, vi } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import {
  AMINO_ACID_COLOURS,
  DEFAULT_CATEGORIES,
  DEFAULT_SCALE,
  formatTick,
  interpolateStops,
  monotoneCubic,
  parseColour,
  readDataTheme,
  residueSpans,
  ribbon,
  ribbonSlice,
  resolveColouring,
  widthFactors,
  widthProfile,
} from '../../../src/components/residue-data.js';
import { outlinePolygon, outlineSlice, ssOutline } from '../../../src/components/ss-outline.js';
import type { ProteinData } from '../../../src/types.js';

/** Two 5-residue helices joined by a 4-residue loop (6–9). */
function hairpin(): ProteinData {
  const calphas = [
    ...[-12, -9, -6, -3, 0].map((z, i) => ({ resSeq: i + 1, iCode: '', x: 0, y: 0, z })),
    { resSeq: 6, iCode: '', x: 1, y: 0, z: 3 },
    { resSeq: 7, iCode: '', x: 4, y: 0, z: 5 },
    { resSeq: 8, iCode: '', x: 8, y: 0, z: 5 },
    { resSeq: 9, iCode: '', x: 11, y: 0, z: 3 },
    ...[0, -3, -6, -9, -12].map((z, i) => ({ resSeq: i + 10, iCode: '', x: 12, y: 0, z })),
  ];
  return {
    pdbId: 'dat1',
    chains: [
      {
        chainId: 'A',
        residueCount: 14,
        segments: [
          { start: 1, end: 5, type: 'helix' },
          { start: 10, end: 14, type: 'helix' },
        ],
        calphas,
      },
    ],
  };
}

const SEQ = 'MKLVAGEDRSTFWY';

function mount(): TopologyDisplay {
  const el = new TopologyDisplay();
  document.body.appendChild(el);
  el.proteinData = hairpin();
  return el;
}

const svgOf = (el: TopologyDisplay) => el.shadowRoot!.querySelector('.svg-scroll svg')!;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const theme = { scale: DEFAULT_SCALE, categories: DEFAULT_CATEGORIES };
const noOpts = { scale: null, domain: null, label: null };

describe('resolveColouring', () => {
  it('maps all-number data through the scale over the data range', () => {
    const c = resolveColouring({ A: { 1: 0, 2: 5, 3: 10 } }, noOpts, theme)!;
    expect(c.kind).toBe('numerical');
    expect(c.residueColour('A', 1)).toBe(DEFAULT_SCALE[0]);
    expect(c.residueColour('A', 3)).toBe(DEFAULT_SCALE[DEFAULT_SCALE.length - 1]);
    expect(c.residueColour('A', 2)).toBe(DEFAULT_SCALE[4]);
    expect(c.residueColour('A', 4)).toBeUndefined();
    expect(c.residueColour('B', 1)).toBeUndefined();
  });

  it('honours colour-domain (clamping outside it) and a custom scale', () => {
    const c = resolveColouring(
      { A: { 1: -5, 2: 0.5, 3: 9 } },
      { scale: '#000000, rgb(255, 255, 255)', domain: '0,1', label: 'Score' },
      theme,
    )!;
    expect(c.kind === 'numerical' && [c.min, c.max]).toEqual([0, 1]);
    expect(c.residueColour('A', 1)).toBe('#000000');
    expect(c.residueColour('A', 2)).toBe('#808080');
    expect(c.residueColour('A', 3)).toBe('#ffffff');
    expect(c.label).toBe('Score');
  });

  it('uses amino-acid colours when every category is a residue letter', () => {
    const c = resolveColouring({ A: { 1: 'K', 2: 'L', 3: 'K' } }, noOpts, theme)!;
    expect(c.kind).toBe('categorical');
    expect(c.residueColour('A', 1)).toBe(AMINO_ACID_COLOURS.K);
    expect(c.residueColour('A', 2)).toBe(AMINO_ACID_COLOURS.L);
    // Legend order follows the palette's chemistry grouping (L before K).
    expect(c.kind === 'categorical' && c.categories).toEqual(['L', 'K']);
  });

  it('takes other categories from the theme palette, with key:colour overrides', () => {
    const c = resolveColouring(
      { A: { 1: 'core', 2: 'lipid', 3: 'water' } },
      { scale: 'water: steelblue', domain: null, label: null },
      theme,
    )!;
    expect(c.residueColour('A', 1)).toBe(DEFAULT_CATEGORIES[0]);
    expect(c.residueColour('A', 2)).toBe(DEFAULT_CATEGORIES[1]);
    expect(c.residueColour('A', 3)).toBe('steelblue');
  });

  it('treats mixed numbers and strings as categories, and spans every chain', () => {
    const c = resolveColouring({ A: { 1: 1, 2: 'x' }, B: { 1: 'y' } }, noOpts, theme)!;
    expect(c.kind === 'categorical' && c.categories).toEqual(['1', 'x', 'y']);
  });

  it('returns null with no usable data', () => {
    expect(resolveColouring(null, noOpts, theme)).toBeNull();
    expect(
      resolveColouring({ A: { x: 1, 2: null as unknown as number } }, noOpts, theme),
    ).toBeNull();
  });
});

describe('residue-data helpers', () => {
  it('parses and interpolates colours', () => {
    expect(parseColour('#f00')).toEqual([255, 0, 0]);
    expect(parseColour('rgba(1, 2, 3, 0.5)')).toEqual([1, 2, 3]);
    expect(parseColour('red')).toBeNull();
    expect(
      interpolateStops(
        [
          [0, 0, 0],
          [255, 255, 255],
        ],
        0.25,
      ),
    ).toBe('#404040');
  });

  it('reads width factors, with negative values counting as 0', () => {
    const f = widthFactors({ A: { 1: 1.5, 2: -2, 3: 'x' as unknown as number } }, 'A');
    expect(f.get(1)).toBe(1.5);
    expect(f.get(2)).toBe(0);
    expect(f.has(3)).toBe(false);
  });

  it('interpolates widths smoothly without overshooting', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [0, 1, 0, 1, 0];
    const f = monotoneCubic(xs, ys);
    for (let i = 0; i < xs.length; i++) expect(f(xs[i])).toBeCloseTo(ys[i]);
    for (let x = 0; x <= 4; x += 0.05) {
      expect(f(x)).toBeGreaterThanOrEqual(-1e-9);
      expect(f(x)).toBeLessThanOrEqual(1 + 1e-9);
    }
    // Flat at a peak (no corner) and held beyond the ends.
    expect(f(1.01)).toBeCloseTo(1, 3);
    expect(f(-3)).toBe(0);
    expect(f(9)).toBe(0);
  });

  it('builds a ribbon whose slices tile it', () => {
    const poly = [
      { x: 0, y: 0, d: 0 },
      { x: 10, y: 0, d: 10 },
    ];
    const rib = ribbon(poly, (d) => 1 + d / 10);
    expect(rib[1].l).toEqual({ x: 10, y: 2 });
    expect(rib[1].r).toEqual({ x: 10, y: -2 });
    const piece = ribbonSlice(rib, 0, 5);
    expect(piece[0]).toEqual({ x: 0, y: 1 });
    expect(piece[1]).toEqual({ x: 5, y: 1.5 });
  });

  it('splits samples between residues at the midpoints', () => {
    const res = [
      { resSeq: 1, sampleIndex: 0 },
      { resSeq: 2, sampleIndex: 4 },
      { resSeq: 3, sampleIndex: 8 },
    ];
    expect(residueSpans(res, 0, 8)).toEqual([
      { resSeq: 1, from: 0, to: 2 },
      { resSeq: 2, from: 2, to: 6 },
      { resSeq: 3, from: 6, to: 8 },
    ]);
    const profile = widthProfile(res, new Map([[3, 2]]));
    expect(profile(4)).toBe(1);
    expect(profile(8)).toBe(2);
    expect(profile(10)).toBe(2);
  });

  it('reads theme tokens from CSS custom properties', () => {
    const el = document.createElement('div');
    el.style.setProperty('--mp-data-scale', '#000, #fff');
    document.body.appendChild(el);
    expect(readDataTheme(el).scale).toEqual(['#000', '#fff']);
    expect(readDataTheme(el).categories).toEqual(DEFAULT_CATEGORIES);
  });

  it('slices an outline so the pieces tile the whole element', () => {
    const pts = Array.from({ length: 11 }, (_, i) => ({ sx: i * 10, sy: 0 }));
    const sections = ssOutline(pts, true, { halfWidth: 4, arrowHalfWidth: 6, arrowLength: 12 });
    const area = (v: { sx: number; sy: number }[]) =>
      Math.abs(
        v.reduce((a, p, i) => {
          const q = v[(i + 1) % v.length];
          return a + p.sx * q.sy - q.sx * p.sy;
        }, 0) / 2,
      );
    const whole = area(outlinePolygon(pts, sections));
    const parts = [0, 2.5, 5, 8.2, 10];
    let sum = 0;
    for (let i = 0; i < parts.length - 1; i++) {
      sum += area(outlineSlice(pts, sections, parts[i], parts[i + 1]));
    }
    expect(sum).toBeCloseTo(whole, 6);
  });
});

describe('<topology-display> residue data', () => {
  it('fills helices residue by residue from categorical data, with a legend', () => {
    const el = mount();
    el.residueColours = { A: Object.fromEntries([...SEQ].map((aa, i) => [i + 1, aa])) };
    const svg = svgOf(el);
    const slices = svg.querySelectorAll('.residue-fill polygon');
    // Two helices, five residues each.
    expect(slices).toHaveLength(10);
    expect(slices[1].getAttribute('fill')).toBe(AMINO_ACID_COLOURS.K);
    // The outline stays clickable but shows the slices through it.
    const helix = svg.querySelector('.ss-element')!;
    expect(helix.getAttribute('fill-opacity')).toBe('0');
    // The loop is drawn as one piece per residue in the residue's colour.
    const pieces = [...svg.querySelectorAll<SVGPathElement>('.residue-stroke path')];
    expect(pieces.map((p) => p.dataset.res)).toEqual(['6', '7', '8', '9']);
    expect(pieces[0].getAttribute('stroke')).toBe(AMINO_ACID_COLOURS.G);
    expect(svg.querySelector('.loop')!.classList.contains('has-data')).toBe(true);
    // Legend under the plot with one swatch per category.
    const legend = svg.querySelector('.colour-legend')!;
    expect(legend.querySelectorAll('rect')).toHaveLength(new Set(SEQ).size);
  });

  it('colours from a numerical scale and draws a gradient legend', () => {
    const el = mount();
    el.setAttribute('colour-label', 'Conservation');
    el.setAttribute('residue-colours', JSON.stringify({ A: { 1: 0, 2: 1, 7: 0.5 } }));
    const svg = svgOf(el);
    const fills = [...svg.querySelectorAll('.residue-fill polygon')].map((p) =>
      p.getAttribute('fill'),
    );
    expect(fills[0]).toBe(DEFAULT_SCALE[0]);
    expect(fills[1]).toBe(DEFAULT_SCALE[8]);
    // Residues with no value keep the helix colour.
    expect(fills[2]).toBe('#6e8db6');
    const legend = svg.querySelector('.colour-legend')!;
    expect(legend.querySelectorAll('stop')).toHaveLength(DEFAULT_SCALE.length);
    expect(legend.textContent).toContain('Conservation');
    expect(legend.getAttribute('aria-label')).toBe('Conservation: 0 to 1');
    // The legend extends the picture downwards.
    const [, , , h] = svg.getAttribute('viewBox')!.split(' ').map(Number);
    expect(Number(svg.getAttribute('height'))).toBe(h);
  });

  it('scales helix and loop widths by the residue factors', () => {
    const el = mount();
    const plain = svgOf(el).querySelector('.ss-element')!.getAttribute('points');
    el.residueWidths = { A: { 1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 7: 0 } };
    const svg = svgOf(el);
    const span = (pts: string | null) => {
      const xs = pts!.split(' ').map((p) => Number(p.split(',')[0]));
      return Math.max(...xs) - Math.min(...xs);
    };
    // A vertical helix: its width is the x extent of the outline.
    expect(span(svg.querySelector('.ss-element')!.getAttribute('points'))).toBeCloseTo(
      2 * span(plain),
      1,
    );
    // The loop becomes a filled ribbon, one piece per residue, narrowest at
    // the zero-width residue.
    const pieces = [...svg.querySelectorAll<SVGPolygonElement>('.residue-stroke polygon')];
    expect(pieces.map((p) => p.dataset.res)).toEqual(['6', '7', '8', '9']);
    const widest = (p: SVGPolygonElement) => {
      const v = p
        .getAttribute('points')!
        .split(' ')
        .map((q) => q.split(',').map(Number));
      const half = v.length / 2;
      // Left edge vertex i pairs with right edge vertex (len − 1 − i).
      return Math.max(
        ...v
          .slice(0, half)
          .map((l, i) => Math.hypot(l[0] - v[v.length - 1 - i][0], l[1] - v[v.length - 1 - i][1])),
      );
    };
    const w = pieces.map(widest);
    expect(w[1]).toBeLessThan(w[0]);
    expect(w[1]).toBeLessThan(w[2]);
    // The zero-width residue narrows to the hairline minimum (in Å: px / 2.5).
    const minW = Math.min(
      ...pieces.flatMap((p) => {
        const v = p
          .getAttribute('points')!
          .split(' ')
          .map((q) => q.split(',').map(Number));
        return v.map((l, i) =>
          Math.hypot(l[0] - v[v.length - 1 - i][0], l[1] - v[v.length - 1 - i][1]),
        );
      }),
    );
    expect(minW).toBeLessThan(0.5);
    // Width alone draws no fill slices and no legend.
    expect(svg.querySelector('.residue-fill')).toBeNull();
    expect(svg.querySelector('.colour-legend')).toBeNull();
  });

  it('ignores data for other chains and invalid attribute JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount();
    el.residueColours = { B: { 1: 'K' } };
    expect(svgOf(el).querySelector('.residue-fill, .residue-stroke, .colour-legend')).toBeNull();
    el.setAttribute('residue-colours', '{not json');
    expect(el.residueColours).toBeNull();
    expect(warn).toHaveBeenCalled();
  });
});

describe('formatTick', () => {
  it('rounds to the scale range', () => {
    expect(formatTick(-0.0000532, 2)).toBe('0');
    expect(formatTick(0.12345, 1)).toBe('0.12');
    expect(formatTick(1234.5, 2000)).toBe('1235');
  });
});
