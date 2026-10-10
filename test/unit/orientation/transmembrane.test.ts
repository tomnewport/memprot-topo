import { describe, it, expect } from 'vitest';
import {
  isTransmembrane,
  selectTransmembraneChains,
} from '../../../src/orientation/transmembrane.js';
import { membraneCore } from '../../../src/membrane/model.js';
import type { Calpha, ChainData } from '../../../src/types.js';

function ca(z: number, i = 0): Calpha {
  return { resSeq: i + 1, iCode: '', x: 0, y: 0, z };
}

function chain(id: string, residueCount: number, calphas: Calpha[]): ChainData {
  return { chainId: id, residueCount, segments: [], calphas };
}

describe('isTransmembrane', () => {
  it('returns true when Cα span both sides of the bilayer', () => {
    const calphas = [ca(-15), ca(0), ca(15)];
    expect(isTransmembrane(calphas)).toBe(true);
  });

  it('returns false for a chain that sits entirely on one side', () => {
    const calphas = [ca(20), ca(22), ca(25), ca(30)];
    expect(isTransmembrane(calphas)).toBe(false);
  });

  it('returns false for a chain inside the bilayer but not crossing the threshold', () => {
    const calphas = [ca(-10), ca(-5), ca(0), ca(5), ca(10)];
    expect(isTransmembrane(calphas, { threshold: 12 })).toBe(false);
  });

  it('honours a custom threshold', () => {
    const calphas = [ca(-8), ca(0), ca(8)];
    expect(isTransmembrane(calphas, { threshold: 5 })).toBe(true);
    expect(isTransmembrane(calphas, { threshold: 10 })).toBe(false);
  });

  it('returns false for an empty chain', () => {
    expect(isTransmembrane([])).toBe(false);
  });

  it('uses the given membrane core over the threshold', () => {
    const calphas = [ca(-8), ca(0), ca(8)];
    expect(isTransmembrane(calphas, { core: { upper: 7, lower: -7 }, threshold: 12 })).toBe(true);
  });

  it('follows the core of a thin (30 Å) membrane', () => {
    // Core ±7 Å: a chain reaching ±8 Å crosses it, though not the default ±12 Å.
    const calphas = [ca(-8), ca(0), ca(8)];
    const core = membraneCore({ upper: 15, lower: -15 });
    expect(isTransmembrane(calphas, { core })).toBe(true);
    expect(isTransmembrane(calphas)).toBe(false);
  });

  it('follows the core of a thick (50 Å) membrane', () => {
    // Core ±17 Å: a chain reaching ±15 Å crosses the default core, not this one.
    const calphas = [ca(-15), ca(0), ca(15)];
    const core = membraneCore({ upper: 25, lower: -25 });
    expect(isTransmembrane(calphas, { core })).toBe(false);
    expect(isTransmembrane(calphas)).toBe(true);
  });

  it('tests each leaflet of an asymmetric membrane separately', () => {
    // Leaflets at +26 and −14 Å: core edges at +18 and −6 Å.
    const core = membraneCore({ upper: 26, lower: -14 });
    expect(isTransmembrane([ca(-7), ca(19)], { core })).toBe(true);
    expect(isTransmembrane([ca(-13), ca(13)], { core })).toBe(false);
  });
});

describe('selectTransmembraneChains', () => {
  const tmA = chain('A', 300, [ca(-18), ca(0), ca(18)]);
  const tmB = chain('B', 300, [ca(-18), ca(0), ca(18)]);
  const tmC = chain('C', 300, [ca(-18), ca(0), ca(18)]);
  const soluble = chain('S', 150, [ca(30), ca(35), ca(40)]);

  it('keeps only TM chains by default and returns one representative', () => {
    const { selected, nonTransmembrane } = selectTransmembraneChains([tmA, soluble]);
    expect(selected.map((c) => c.chainId)).toEqual(['A']);
    expect(nonTransmembrane.map((c) => c.chainId)).toEqual(['S']);
  });

  it('picks the largest TM chain when max=1', () => {
    const small = chain('S', 200, [ca(-18), ca(0), ca(18)]);
    const big = chain('B', 400, [ca(-18), ca(0), ca(18)]);
    const { selected } = selectTransmembraneChains([small, big], { max: 1 });
    expect(selected.map((c) => c.chainId)).toEqual(['B']);
  });

  it('returns multiple TM chains when max > 1', () => {
    const { selected } = selectTransmembraneChains([tmA, tmB, tmC], { max: 3 });
    expect(selected).toHaveLength(3);
  });

  it('does not put TM chains dropped by the max cap into nonTransmembrane', () => {
    // With max=1, only chain A is selected — but B and C are still TM, so
    // they must not appear in nonTransmembrane (only the truly soluble one).
    const { nonTransmembrane } = selectTransmembraneChains([tmA, tmB, tmC, soluble], { max: 1 });
    expect(nonTransmembrane.map((c) => c.chainId)).toEqual(['S']);
  });

  it('lists soluble chains in nonTransmembrane for a multi-chain selection', () => {
    const { nonTransmembrane, selected } = selectTransmembraneChains([tmA, tmB, soluble], {
      max: 2,
    });
    expect(selected.map((c) => c.chainId).sort()).toEqual(['A', 'B']);
    expect(nonTransmembrane.map((c) => c.chainId)).toEqual(['S']);
  });

  it('falls back to the largest non-TM chain when no chain crosses the membrane', () => {
    const a = chain('A', 100, [ca(30), ca(35)]);
    const b = chain('B', 200, [ca(40), ca(50)]);
    const result = selectTransmembraneChains([a, b]);
    expect(result.fellBackToLargest).toBe(true);
    expect(result.selected.map((c) => c.chainId)).toEqual(['B']);
  });

  it('returns empty selection when fallback disabled and no TM chains exist', () => {
    const a = chain('A', 100, [ca(30), ca(35)]);
    const result = selectTransmembraneChains([a], { fallbackToLargest: false });
    expect(result.selected).toHaveLength(0);
    expect(result.fellBackToLargest).toBe(false);
  });
});
