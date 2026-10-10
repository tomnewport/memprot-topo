import { describe, expect, it } from 'vitest';
import { parseTracksConfig } from '../../../src/tracks/config.js';

describe('parseTracksConfig', () => {
  it('reads JSON text and objects alike', () => {
    const cfg = {
      sources: { md: { type: 'csv', url: 'a.csv', per: 'residue' } },
      series: { flip: { from: 'md.leaflet=flip', label: 'Flip/Flops' } },
      tracks: [{ type: 'heatmap', series: ['flip', 'divider'] }],
      chain: { colour: 'flip' },
    };
    const fromText = parseTracksConfig(JSON.stringify(cfg));
    const fromObj = parseTracksConfig(cfg);
    expect(fromText).toEqual(fromObj);
    expect(fromObj.warnings).toEqual([]);
    expect(fromObj.config).toEqual(cfg);
  });

  it('returns an empty configuration for empty, null or bad input, with a warning where bad', () => {
    expect(parseTracksConfig('')).toEqual({ config: {}, warnings: [] });
    expect(parseTracksConfig(null)).toEqual({ config: {}, warnings: [] });
    expect(parseTracksConfig('{').warnings[0]).toMatch(/not valid JSON/);
    expect(parseTracksConfig([1]).warnings).toEqual([
      'expected an object with sources, series and tracks',
    ]);
  });

  it('warns about and drops unusable sources', () => {
    const { config, warnings } = parseTracksConfig({
      other: 1,
      sources: {
        'a.b': { type: 'pdb', url: 'x' },
        structure: { type: 'pdb', url: 'x' },
        nourl: { type: 'pdb' },
        bad: { type: 'xml', url: 'x' },
        notobj: 3,
        noper: { type: 'csv', url: 'x' },
        vals: { type: 'values' },
        ok: { type: 'values', data: { A: { 1: 2 } } },
        keyed: {
          type: 'csv',
          text: 'a',
          per: 'atom',
          keys: { serial: 'id', chain: 5 },
          atoms: 'pdb1',
        },
        badkeys: { type: 'csv', text: 'a', per: 'residue', keys: 3, atoms: 4 },
      },
    });
    expect(Object.keys(config.sources!)).toEqual(['ok', 'keyed', 'badkeys']);
    expect(config.sources!.keyed).toEqual({
      type: 'csv',
      text: 'a',
      per: 'atom',
      keys: { serial: 'id' },
      atoms: 'pdb1',
    });
    expect(warnings).toEqual([
      'unknown key "other"',
      'sources.a.b: source names can\'t contain "."',
      'sources.structure: "structure" is built in',
      'sources.nourl: needs a url or text',
      'sources.bad: type must be "pdb", "csv" or "values"',
      'sources.notobj: expected an object',
      'sources.noper: per must be "residue" or "atom"',
      'sources.vals: "values" needs data {chain: {residue: value}}',
      'sources.keyed.keys.chain: expected a column name',
      'sources.badkeys.keys: expected an object',
      'sources.badkeys.atoms: expected a source name',
    ]);
  });

  it('reads series and selections, warning about bad fields', () => {
    const { config, warnings } = parseTracksConfig({
      sources: 3,
      series: {
        'a.b': { from: 'x.y' },
        good: {
          from: 'pdb.tempFactor',
          reduce: 'max',
          scale: 0.1,
          offset: 1,
          map: { H: 'helix' },
          label: 'L',
          unit: 'u',
        },
        bad: { from: 'x.y', reduce: 'median', scale: 'x', map: 3, label: 4 },
        nofrom: { from: 'nodot' },
        notobj: 'x',
        sel: {
          select: 'md',
          where: { leaflet: ['a', 'b'], bead: 3 },
          label: '{bead}',
          order: ['x'],
        },
        badsel: { select: '', where: 3, label: 3, order: 'x' },
      },
    });
    expect(config.sources).toEqual({});
    expect(config.series!.good).toEqual({
      from: 'pdb.tempFactor',
      reduce: 'max',
      scale: 0.1,
      offset: 1,
      map: { H: 'helix' },
      label: 'L',
      unit: 'u',
    });
    expect(config.series!.bad).toEqual({ from: 'x.y' });
    expect(config.series!.sel).toEqual({
      select: 'md',
      where: { leaflet: ['a', 'b'] },
      label: '{bead}',
      order: ['x'],
    });
    expect(config.series!.nofrom).toBeUndefined();
    expect(config.series!.badsel).toBeUndefined();
    expect(warnings).toEqual(
      expect.arrayContaining([
        'sources: expected an object',
        'series.a.b: series names can\'t contain "." (it separates source and column)',
        'series.bad.reduce: must be one of max, min, mean, sum, ca',
        'series.bad.scale: expected a number',
        'series.bad.map: expected an object',
        'series.bad.label: expected text',
        'series.nofrom: from must be "<source>.<column>"',
        'series.notobj: expected an object with "from"',
        'series.sel.where.bead: expected a value or a list of values',
        'series.badsel: select must name a source',
      ]),
    );
  });

  it('reads every track type and drops what it cannot use', () => {
    const { config, warnings } = parseTracksConfig({
      tracks: [
        {
          type: 'heatmap',
          series: [
            'a.b',
            { ref: 'x.y', label: 'X', colour: 'red', side: 'below' },
            'divider',
            { select: 'md' },
            3,
          ],
          scale: ['#000', '#fff'],
          domain: [0, 1],
          rowHeight: 7,
          label: 'H',
          height: 10,
          legend: false,
          residueAxis: true,
          views: ['1d'],
        },
        {
          type: 'heatmap',
          series: 'x',
          scale: 3,
          rowHeight: -1,
          domain: [1],
          label: 3,
          height: 0,
          legend: 'no',
          views: ['4d'],
        },
        {
          type: 'area',
          series: ['a.b'],
          normalise: true,
          curve: 'smooth',
          axis: false,
          domain: [0, 2],
        },
        { type: 'area', series: [], curve: 'wiggly', normalise: 1 },
        {
          type: 'line',
          series: ['a.z'],
          reference: [{ ref: 'm.upper', label: 'Up' }, { value: 0 }, { label: 'none' }],
        },
        { type: 'line', series: ['a.z'], reference: 3 },
        {
          type: 'features',
          features: [
            { chain: 'A', from: 1, to: '5A', label: 'f', colour: 'red' },
            { chain: 'A', at: 3 },
            { chain: 'A' },
          ],
          source: 'f',
        },
        { type: 'features', source: 3 },
        { type: 'secondary-structure', series: 'md.ss' },
        { type: 'secondary-structure', series: 3 },
        { type: 'sequence', colour: 'lesk' },
        { type: 'sequence', colour: 3 },
        { type: 'sankey' },
        'x',
        { type: 'heatmap', series: [{ ref: 'a.b', side: 'left' }, { nope: 1 }] },
      ],
      chain: { colour: 'x.y', width: 3 },
    });
    const t = config.tracks!;
    expect(t.map((x) => x.type)).toEqual([
      'heatmap',
      'heatmap',
      'area',
      'area',
      'line',
      'line',
      'features',
      'features',
      'secondary-structure',
      'secondary-structure',
      'sequence',
      'sequence',
      'heatmap',
    ]);
    expect(t[0]).toEqual({
      type: 'heatmap',
      series: [
        'a.b',
        { ref: 'x.y', label: 'X', colour: 'red', side: 'below' },
        'divider',
        { select: 'md' },
      ],
      scale: ['#000', '#fff'],
      domain: [0, 1],
      rowHeight: 7,
      label: 'H',
      height: 10,
      legend: false,
      residueAxis: true,
      views: ['1d'],
    });
    expect(t[1]).toEqual({ type: 'heatmap', series: [] });
    expect(t[2]).toEqual({
      type: 'area',
      series: ['a.b'],
      normalise: true,
      curve: 'smooth',
      axis: false,
      domain: [0, 2],
    });
    expect(t[4]).toMatchObject({ reference: [{ ref: 'm.upper', label: 'Up' }, { value: 0 }] });
    expect(t[6]).toMatchObject({
      features: [
        { chain: 'A', from: 1, to: '5A', label: 'f', colour: 'red' },
        { chain: 'A', at: 3 },
      ],
      source: 'f',
    });
    expect(t[8]).toEqual({ type: 'secondary-structure', series: 'md.ss' });
    expect(t[10]).toEqual({ type: 'sequence', colour: 'lesk' });
    expect(t[12]).toEqual({ type: 'heatmap', series: [{ ref: 'a.b' }] });
    expect(config.chain).toEqual({ colour: 'x.y' });
    expect(warnings).toEqual(
      expect.arrayContaining([
        'tracks[0].series[4]: expected a series name or {ref: …}',
        'tracks[1].series: expected a list',
        'tracks[1].scale: expected a scale name or a list of colours',
        'tracks[1].rowHeight: expected a positive number',
        'tracks[1].domain: expected [min, max]',
        'tracks[1].label: expected text',
        'tracks[1].height: expected a positive number',
        'tracks[1].legend: expected true or false',
        'tracks[1].views: expected a list of "1d", "2d", "3d"',
        'tracks[3].curve: must be "step" or "smooth"',
        'tracks[3].normalise: expected true or false',
        'tracks[4].reference[2]: expected {ref} or {value}',
        'tracks[5].reference: expected a list',
        'tracks[6].features[2]: expected {chain, from, to} or {chain, at}',
        'tracks[7].source: expected a source name',
        'tracks[9].series: expected a series name',
        'tracks[11].colour: expected a scheme or a series name',
        'tracks[12]: type must be heatmap, area, line, features, secondary-structure or sequence',
        'tracks[13]: expected an object',
        'tracks[14].series[0].side: must be "above" or "below"',
        'chain.width: expected a series name',
      ]),
    );
  });

  it('warns when tracks or chain have the wrong shape', () => {
    const { config, warnings } = parseTracksConfig({ tracks: {}, chain: 3, series: [] });
    expect(config).toEqual({ tracks: [], series: {} });
    expect(warnings).toEqual([
      'series: expected an object',
      'tracks: expected a list',
      'chain: expected an object',
    ]);
  });
});
