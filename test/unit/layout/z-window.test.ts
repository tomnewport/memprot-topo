// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { zWindow } from '../../../src/layout/index.js';

const BULK = { upper: 20, lower: -20 };

describe('zWindow (issue #27)', () => {
  it('defaults to the membrane plus 1.5 thicknesses each side, about the midplane', () => {
    expect(zWindow(BULK, { zMin: -30, zMax: 30 })).toEqual({ top: 80, bottom: -80 });
  });

  it('follows the bulk membrane thickness', () => {
    expect(zWindow({ upper: 15, lower: -15 }, { zMin: 0, zMax: 0 })).toEqual({
      top: 60,
      bottom: -60,
    });
  });

  it('takes an explicit height in Å, still centred on the membrane', () => {
    expect(zWindow(BULK, { zMin: -30, zMax: 30 }, 100)).toEqual({ top: 50, bottom: -50 });
  });

  it('re-centres upwards to take in a protein reaching above the box', () => {
    const w = zWindow(BULK, { zMin: -25, zMax: 110 });
    expect(w).toEqual({ top: 110, bottom: -50 });
  });

  it('re-centres downwards to take in a protein reaching below the box', () => {
    const w = zWindow(BULK, { zMin: -100, zMax: 25 });
    expect(w).toEqual({ top: 60, bottom: -100 });
  });

  it('keeps at least a quarter of the membrane in view however far the protein reaches', () => {
    const up = zWindow(BULK, { zMin: 0, zMax: 400 });
    // A quarter of 40 Å: the window's bottom stops 10 Å below the upper leaflet.
    expect(up.bottom).toBeCloseTo(10);
    expect(up.top - up.bottom).toBeCloseTo(160);
    const down = zWindow(BULK, { zMin: -400, zMax: 0 });
    expect(down.top).toBeCloseTo(-10);
  });

  it('centres on a protein taller than the window, within the same limit', () => {
    expect(zWindow(BULK, { zMin: -100, zMax: 120 })).toEqual({ top: 90, bottom: -70 });
    const w = zWindow(BULK, { zMin: -300, zMax: 60 }, 80);
    expect(w.top).toBeCloseTo(-10);
    expect(w.bottom).toBeCloseTo(-90);
  });
});
