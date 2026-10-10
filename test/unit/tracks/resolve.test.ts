import { describe, expect, it, vi } from 'vitest';
import { csvTable, valuesTable, type SourceTable } from '../../../src/tracks/sources.js';
import type { SeriesContext } from '../../../src/tracks/series.js';
import {
  colourScale,
  LESK_COLOURS,
  PLASMA,
  resolveTracks,
  scaleStops,
  type AreaTrack,
  type FeaturesTrack,
  type HeatmapTrack,
  type LineTrack,
  type SsTrack,
  type TrackPalette,
} from '../../../src/tracks/resolve.js';
import {
  gutterFor,
  legendWidth,
  plotHeight,
  stackHeight,
  trackHeight,
  trackLabels,
  TRACK,
  wrapLabel,
} from '../../../src/tracks/geometry.js';
import type { TracksConfig } from '../../../src/tracks/types.js';

const PALETTE: TrackPalette = {
  dataScale: ['#000000', '#ffffff'],
  dataCategories: ['#111111', '#222222'],
  viridis: ['#440154', '#fde725'],
  aminoAcids: { A: '#aaaaaa' },
};

const CSV = [
  'chainID,resSeq,a,b,c,ss,group=Head,group=Tail,f',
  'A,1,0,1,2,H,1,1,',
  'A,2,1,2,2,E,3,1,',
  'A,3,2,1,2,X,0,0,',
  'A,4,,0,2,,0,0,',
].join('\n');

function ctx(): SeriesContext & { warn: ReturnType<typeof vi.fn> } {
  return {
    chainId: 'A',
    residues: [1, 2, 3, 4].map((resSeq) => ({ resSeq, iCode: '' })),
    tables: new Map<string, SourceTable>([
      ['md', csvTable(CSV, { per: 'residue' })],
      ['col', valuesTable({ A: { 1: '#ff0000' } })],
      [
        'feat',
        csvTable('chainID,resSeq,to,label,colour\nA,1,2,Pore,#00ff00\nA,4,,,', { per: 'residue' }),
      ],
    ]),
    series: {},
    warn: vi.fn(),
  };
}

const resolve = (config: TracksConfig, c = ctx()) =>
  resolveTracks(config, c, PALETTE, (i) => 'AGKX'[i]);

describe('scaleStops and colourScale', () => {
  it('names scales, takes lists, and warns about unknown names', () => {
    const warn = vi.fn();
    expect(scaleStops(undefined, PALETTE, warn)).toBe(PALETTE.dataScale);
    expect(scaleStops('Viridis', PALETTE, warn)).toBe(PALETTE.viridis);
    expect(scaleStops('plasma', PALETTE, warn)).toBe(PLASMA);
    expect(scaleStops('data', PALETTE, warn)).toBe(PALETTE.dataScale);
    expect(scaleStops(['#123'], PALETTE, warn)).toEqual(['#123']);
    expect(scaleStops('jet', PALETTE, warn)).toBe(PALETTE.dataScale);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('clamps at the ends, and copes with one stop or an empty domain', () => {
    const s = colourScale(['#000000', '#ffffff'], [0, 10]);
    expect(s(-5)).toBe('rgb(0, 0, 0)');
    expect(s(5)).toBe('rgb(128, 128, 128)');
    expect(s(50)).toBe('rgb(255, 255, 255)');
    expect(colourScale(['#123456'], [0, 1])(9)).toBe('#123456');
    expect(colourScale(['#000', '#111', '#222'], [1, 1])(1)).toBe('#111');
  });
});

describe('resolveTracks', () => {
  it('builds a heatmap with dividers and one colour scale', () => {
    const { above, below, letters } = resolve({
      tracks: [
        {
          type: 'heatmap',
          series: ['md.a', 'divider', 'md.b', 'md.ss'],
          residueAxis: true,
          rowHeight: 7,
        },
      ],
    });
    expect(letters).toBe(true);
    expect(below).toEqual([]);
    const h = above[0] as HeatmapTrack;
    expect(h.rows).toHaveLength(4);
    expect(h.rows[1]).toBe('divider');
    const [a, , b, ss] = h.rows as { label: string; colours: (string | undefined)[] }[];
    expect(a.label).toBe('a');
    // Domain [0, 2] across every row.
    expect(a.colours).toEqual([
      'rgb(0, 0, 0)',
      'rgb(128, 128, 128)',
      'rgb(255, 255, 255)',
      undefined,
    ]);
    expect(b.colours[1]).toBe('rgb(255, 255, 255)');
    // Text values are taken as colours.
    expect(ss.colours[0]).toBe('H');
    expect(h.legend).toEqual({ stops: PALETTE.dataScale, domain: [0, 2] });
    expect(h.residueAxis).toBe(true);
    expect(h.rowHeight).toBe(7);
  });

  it('labels a one-row heatmap with the track label and carries the unit to the legend', () => {
    const c = ctx();
    c.series = { a: { from: 'md.a', unit: 'frac' } };
    const h = resolve(
      { tracks: [{ type: 'heatmap', series: ['a'], label: 'Contacts', domain: [0, 4] }] },
      c,
    ).above[0] as HeatmapTrack;
    expect((h.rows[0] as { label: string }).label).toBe('Contacts');
    expect(h.legend).toEqual({ stops: PALETTE.dataScale, domain: [0, 4], unit: 'frac' });
    const none = resolve({ tracks: [{ type: 'heatmap', series: ['md.a'], legend: false }] })
      .above[0] as HeatmapTrack;
    expect(none.legend).toBeNull();
    const text = resolve({ tracks: [{ type: 'heatmap', series: ['col.value'] }] })
      .above[0] as HeatmapTrack;
    expect(text.legend).toBeNull();
    expect(resolve({ tracks: [{ type: 'heatmap', series: ['divider', 'nope'] }] }).above).toEqual(
      [],
    );
  });

  it('stacks areas each side of the baseline', () => {
    const t = resolve({
      tracks: [
        {
          type: 'area',
          series: [
            'md.group=Head',
            { ref: 'md.group=Tail', colour: '#abcdef' },
            { ref: 'md.a', side: 'below' },
          ],
        },
      ],
    }).above[0] as AreaTrack;
    expect(t.layers.map((l) => [l.label, l.side, l.colour])).toEqual([
      ['group=Head', 'above', '#111111'],
      ['group=Tail', 'above', '#abcdef'],
      ['a', 'below', '#111111'],
    ]);
    expect(t.layers[1].y0).toEqual([1, 3, 0, 0]);
    expect(t.layers[1].y1).toEqual([2, 4, 0, 0]);
    expect(t.layers[2].y1).toEqual([-0, -1, -2, -0]);
    // max 4, rounded up: symmetric about the baseline.
    expect(t.domain).toEqual([-4, 4]);
    expect(t).toMatchObject({ height: 40, curve: 'step', axis: true, legend: true });
  });

  it('normalises each residue’s layers to sum to 1, and rounds the domain up', () => {
    const t = resolve({
      tracks: [
        {
          type: 'area',
          series: ['md.group=Head', 'md.group=Tail'],
          normalise: true,
          curve: 'smooth',
        },
      ],
    }).above[0] as AreaTrack;
    expect(t.layers[1].y1).toEqual([1, 1, 0, 0]);
    expect(t.layers[0].y1).toEqual([0.5, 0.75, 0, 0]);
    expect(t.domain).toEqual([0, 1]);
    expect(t.curve).toBe('smooth');
    const fixed = resolve({ tracks: [{ type: 'area', series: ['md.a'], domain: [0, 7] }] })
      .above[0] as AreaTrack;
    expect(fixed.domain).toEqual([0, 7]);
    expect(resolve({ tracks: [{ type: 'area', series: ['nope'] }] }).above).toEqual([]);
  });

  it('draws lines with reference lines and a nice domain', () => {
    const c = ctx();
    c.series = { a: { from: 'md.a', unit: 'nm', label: 'A' } };
    const t = resolve(
      {
        tracks: [
          {
            type: 'line',
            series: ['a', 'md.b'],
            reference: [
              { ref: 'md.c', label: 'C' },
              { ref: 'md.c' },
              { value: -1 },
              { ref: 'nope' },
            ],
          },
        ],
      },
      c,
    ).above[0] as LineTrack;
    expect(t.lines.map((l) => l.label)).toEqual(['A', 'b']);
    expect(t.lines[0].values[3]).toBeNaN();
    expect(t.references.map((r) => r.label)).toEqual(['C', 'c', undefined]);
    expect(t.references[2].values).toEqual([-1, -1, -1, -1]);
    expect(t.domain).toEqual([-1, 2]);
    expect(t.ticks.length).toBeGreaterThan(1);
    expect(t.unit).toBe('nm');
    expect(t.legend).toBe(true);
    const fixed = resolve({
      tracks: [{ type: 'line', series: ['md.b'], domain: [0, 3], axis: false }],
    }).above[0] as LineTrack;
    expect(fixed).toMatchObject({ domain: [0, 3], axis: false, legend: false });
    expect(resolve({ tracks: [{ type: 'line', series: [] }] }).above).toEqual([]);
  });

  it('places features in lanes, from the list and from a source', () => {
    const c = ctx();
    const t = resolve(
      {
        tracks: [
          {
            type: 'features',
            features: [
              { chain: 'A', from: 3, to: 1, label: 'Loop' },
              { chain: 'A', at: 2, colour: '#0000ff' },
              { chain: 'B', at: 1 },
              { chain: 'A', at: 99 },
            ],
            source: 'feat',
          },
          { type: 'features', source: 'nope' },
        ],
      },
      c,
    ).above as FeaturesTrack[];
    const bars = t[0].features.map((f) => [f.from, f.to, f.label, f.colour, f.lane]);
    expect(bars).toEqual([
      [0, 2, 'Loop', '#111111', 0],
      [0, 1, 'Pore', '#00ff00', 1],
      [1, 1, undefined, '#0000ff', 2],
      // The labels take room too, so residue 4 can't share a lane until lane 2.
      [3, 3, undefined, '#222222', 2],
    ]);
    expect(t[0].lanes).toBe(3);
    expect(t[1].features).toEqual([]);
    expect(t[1].lanes).toBe(1);
    expect(c.warn).toHaveBeenCalledWith('features: no source "nope"');
  });

  it('splits tracks around the sequence, and hides the letters for the structure’s own SS alone', () => {
    const r = resolve({
      tracks: [
        { type: 'heatmap', series: ['md.a'] },
        { type: 'sequence', colour: 'lesk' },
        { type: 'secondary-structure' },
        { type: 'heatmap', series: ['md.b'] },
        { type: 'heatmap', series: ['md.c'], views: ['2d'] },
      ],
    });
    expect(r.above).toHaveLength(1);
    expect(r.below).toHaveLength(1);
    expect(r.letters).toBe(true);
    expect(r.letterColour!(0)).toBe(LESK_COLOURS.A);
    expect(r.letterColour!(2)).toBe(LESK_COLOURS.K);
    expect(r.letterColour!(3)).toBeUndefined();

    const ssOnly = resolve({
      tracks: [
        { type: 'secondary-structure', series: 'structure.ss' },
        { type: 'heatmap', series: ['md.a'] },
      ],
    });
    expect(ssOnly.letters).toBe(false);
    expect(ssOnly.above).toEqual([]);
    expect(ssOnly.below).toHaveLength(1);
  });

  it('draws another series’ secondary structure as its own track', () => {
    const c = ctx();
    c.series = { md_ss: { from: 'md.ss', map: { H: 'helix', E: 'strand' }, label: 'MD SS' } };
    const [t] = resolve({ tracks: [{ type: 'secondary-structure', series: 'md_ss' }] }, c)
      .above as SsTrack[];
    expect(t.label).toBe('MD SS');
    expect(t.types).toEqual(['helix', 'strand', 'coil', undefined]);
    const labelled = resolve(
      { tracks: [{ type: 'secondary-structure', series: 'md_ss', label: 'S' }] },
      c,
    ).above[0] as SsTrack;
    expect(labelled.label).toBe('S');
    expect(resolve({ tracks: [{ type: 'secondary-structure', series: 'nope' }] }, c).above).toEqual(
      [],
    );
  });

  it('colours letters by chemistry, by a series, or not at all', () => {
    const chem = resolve({ tracks: [{ type: 'sequence', colour: 'chemistry' }] });
    expect(chem.letterColour!(0)).toBe('#aaaaaa');
    expect(resolve({ tracks: [{ type: 'sequence', colour: 'none' }] }).letterColour).toBeNull();
    expect(resolve({ tracks: [{ type: 'sequence' }] }).letterColour).toBeNull();
    expect(resolve({ tracks: [{ type: 'sequence', colour: 'nope' }] }).letterColour).toBeNull();
    const byValue = resolve({ tracks: [{ type: 'sequence', colour: 'md.a' }] }).letterColour!;
    expect([0, 1, 2, 3].map(byValue)).toEqual([
      'rgb(0, 0, 0)',
      'rgb(128, 128, 128)',
      'rgb(255, 255, 255)',
      undefined,
    ]);
    expect(resolve({ tracks: [{ type: 'sequence', colour: 'col.value' }] }).letterColour!(0)).toBe(
      '#ff0000',
    );
  });

  it('resolves to nothing for an empty configuration', () => {
    expect(resolve({})).toEqual({ above: [], below: [], letters: true, letterColour: null });
  });
});

describe('track geometry', () => {
  const tracks = resolve({
    tracks: [
      {
        type: 'heatmap',
        series: ['md.a', 'divider', 'md.b'],
        rowHeight: 5,
        residueAxis: true,
        label: 'H',
      },
      {
        type: 'area',
        series: ['md.group=Head', 'md.group=Tail'],
        label: 'A very long label for the area track',
      },
      { type: 'line', series: ['md.a'], height: 30 },
      { type: 'features', features: [{ chain: 'A', at: 1 }] },
      { type: 'secondary-structure', series: 'md.ss' },
    ],
  }).above;

  it('wraps labels at spaces', () => {
    expect(wrapLabel('Displacement from bilayer centre (nm)')).toEqual([
      'Displacement from',
      'bilayer centre (nm)',
    ]);
    expect(wrapLabel('')).toEqual([]);
  });

  it('measures each track and a stack of them', () => {
    expect(tracks.map(plotHeight)).toEqual([13, 40, 30, TRACK.featureLanePx, TRACK.ssPx]);
    expect(trackHeight(tracks[0])).toBe(13 + TRACK.axisPx);
    expect(stackHeight([])).toBe(0);
    expect(stackHeight(tracks.slice(0, 2))).toBe(13 + TRACK.axisPx + 40 + TRACK.gapPx);
  });

  it('lists labels and measures legends', () => {
    expect(trackLabels(tracks[0])).toEqual(['a', 'b']);
    expect(trackLabels(tracks[3])).toEqual([]);
    expect(legendWidth(tracks[0])).toBeGreaterThan(TRACK.barPx);
    expect(legendWidth(tracks[1])).toBeGreaterThan(TRACK.swatchPx);
    expect(legendWidth(tracks[2])).toBe(0); // one line: no legend
    expect(legendWidth(tracks[3])).toBe(0);
  });

  it('makes a gutter wide enough for legends, labels and axes, never under the minimum', () => {
    const g = gutterFor(tracks);
    expect(g.legendX).toBeLessThan(g.labelRight);
    expect(g.labelRight).toBeLessThan(g.axisRight);
    expect(g.width).toBeGreaterThanOrEqual(g.axisRight);
    const small = gutterFor([tracks[4]]);
    expect(small.width).toBe(TRACK.minGutterPx);
    expect(small.axisRight).toBe(small.labelRight);
    expect(gutterFor([]).width).toBe(TRACK.minGutterPx);
  });
});
