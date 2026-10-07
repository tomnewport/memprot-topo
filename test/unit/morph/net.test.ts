import { describe, it, expect } from 'vitest';
import { buildFishnet, fishnetSpacing, fitRigid2d } from '../../../src/morph/net.js';

const BULK = { upper: 20, lower: -20 };
const CENTRE = { x: 10, y: -5 };

/** Every (ox, oy, z) node of a leaflet's net. */
function nodes(lines: Float64Array[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const l of lines) for (let i = 0; i < l.length; i += 3) out.push([l[i], l[i + 1], l[i + 2]]);
  return out;
}

describe('buildFishnet', () => {
  it('lays a flat square grid at the bulk planes, ends on the rim', () => {
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: [CENTRE.x, CENTRE.y],
    });
    expect(net.spacing).toBe(fishnetSpacing(40));
    expect(net.spacing).toBe(5);
    // 2 × (2·⌊40/5⌋ + 1) lines across, one polyline each.
    expect(net.upper).toHaveLength(2 * 15);
    expect(nodes(net.upper).every(([, , z]) => z === 20)).toBe(true);
    expect(nodes(net.lower).every(([, , z]) => z === -20)).toBe(true);
    for (const l of net.upper) {
      expect(Math.hypot(l[0], l[1])).toBeCloseTo(40, 6);
      expect(Math.hypot(l[l.length - 3], l[l.length - 2])).toBeCloseTo(40, 6);
    }
  });

  it('holds the annular leaflets next to the protein and the bulk at the rim', () => {
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: { upper: 14, lower: -12 },
      protein: [CENTRE.x, CENTRE.y],
    });
    const up = nodes(net.upper);
    const at = (ox: number, oy: number) =>
      up.find(([x, y]) => Math.abs(x - ox) < 1e-9 && Math.abs(y - oy) < 1e-9)![2];
    expect(at(0, 0)).toBe(14);
    expect(nodes(net.lower).find(([x, y]) => x === 0 && y === 0)![2]).toBe(-12);
    // Beyond the annular zone (4 + 10 Å) it is back to the bulk.
    expect(at(20, 0)).toBe(20);
    // Heights only ever lie between the two.
    expect(up.every(([, , z]) => z >= 14 && z <= 20)).toBe(true);
  });

  it('follows local heights, meets the bulk at the rim and leaves holes open', () => {
    const bump = (x: number, y: number) =>
      6 * Math.exp(-((x - CENTRE.x) ** 2 + (y - CENTRE.y) ** 2) / 200);
    const pore = (x: number, y: number) => Math.hypot(x - CENTRE.x - 15, y - CENTRE.y) < 5;
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: [CENTRE.x, CENTRE.y],
      local: {
        upper: (x, y) => (pore(x, y) ? null : 20 + bump(x, y)),
        lower: (x, y) => (pore(x, y) ? null : -20 - bump(x, y)),
      },
    });
    const up = nodes(net.upper);
    for (const [ox, oy, z] of up) {
      const rho = Math.hypot(ox, oy) / 40;
      if (rho <= 0.8) expect(z).toBeCloseTo(20 + bump(CENTRE.x + ox, CENTRE.y + oy), 9);
      if (rho > 0.999) expect(z).toBe(20);
      // No node inside the pore.
      expect(Math.hypot(ox - 15, oy)).toBeGreaterThanOrEqual(5);
    }
    expect(up.find(([x, y]) => x === 0 && y === 0)![2]).toBeCloseTo(26, 9);
    // The lines through the pore are broken in two.
    expect(net.upper.length).toBeGreaterThan(2 * 15);
  });
});

describe('fitRigid2d', () => {
  it('recovers a turn about z and a shift', () => {
    const from = [0, 0, 10, 0, 10, 5, -3, 8, 4, -6];
    const th = 0.7;
    const to: number[] = [];
    for (let i = 0; i < from.length; i += 2) {
      const [x, y] = [from[i], from[i + 1]];
      to.push(Math.cos(th) * x - Math.sin(th) * y + 12, Math.sin(th) * x + Math.cos(th) * y - 4);
    }
    const fit = fitRigid2d(from, to)!;
    expect(fit.rms).toBeLessThan(1e-9);
    const [x, y] = fit.invert(to[6], to[7]);
    expect(x).toBeCloseTo(-3, 9);
    expect(y).toBeCloseTo(8, 9);
  });

  it('needs three points', () => {
    expect(fitRigid2d([0, 0, 1, 1], [0, 0, 1, 1])).toBeNull();
  });
});
