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

  it('follows local heights, meets the bulk at the rim and leaves pores in the protein open', () => {
    const bump = (x: number, y: number) =>
      6 * Math.exp(-((x - CENTRE.x) ** 2 + (y - CENTRE.y) ** 2) / 200);
    const pore = (x: number, y: number) => Math.hypot(x - CENTRE.x - 15, y - CENTRE.y) < 5;
    // A barrel of radius 8 around the pore, sampled every ~0.8 Å.
    const barrel = Array.from({ length: 64 }, (_, i) => [
      CENTRE.x + 15 + 8 * Math.cos((i * Math.PI) / 32),
      CENTRE.y + 8 * Math.sin((i * Math.PI) / 32),
    ]).flat();
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: barrel,
      local: {
        upper: (x, y) => (pore(x, y) ? null : 20 + bump(x, y)),
        lower: (x, y) => (pore(x, y) ? null : -20 - bump(x, y)),
        radius: 6,
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

  it('carries on across a gap in the lipid that the drawn protein doesn’t surround', () => {
    // No lipid within 12 Å of (−15, 0) — say another subunit, not drawn —
    // with the protein drawn at the centre. The surface tilts along x.
    const gap = { x: CENTRE.x - 15, y: CENTRE.y };
    const GAP_R = 12;
    const lipid = (sign: number) => (x: number, y: number, radius: number) =>
      Math.hypot(x - gap.x, y - gap.y) + radius <= GAP_R
        ? null
        : sign * (20 + 0.1 * (x - CENTRE.x));
    const protein = Array.from({ length: 8 }, (_, i) => [
      CENTRE.x + 5 * Math.cos((i * Math.PI) / 4),
      CENTRE.y + 5 * Math.sin((i * Math.PI) / 4),
    ]).flat();
    const input = {
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein,
      local: { upper: lipid(1), lower: lipid(-1), radius: 6 },
    };
    const net = buildFishnet(input);
    const up = nodes(net.upper);
    // Unbroken: one polyline per grid line, as with no gap.
    expect(net.upper).toHaveLength(2 * 15);
    // Across the gap the heights come from the lipid around it.
    const mid = up.find(([x, y]) => x === -15 && y === 0)!;
    expect(mid[2]).toBeCloseTo(20 + 0.1 * -15, 3);
    // The same gap inside a ring of drawn protein (a pore) stays open.
    const ring = Array.from({ length: 96 }, (_, k) => [
      gap.x + 13 * Math.cos((k * Math.PI) / 48),
      gap.y + 13 * Math.sin((k * Math.PI) / 48),
    ]).flat();
    const pore = buildFishnet({ ...input, protein: [...protein, ...ring] });
    expect(nodes(pore.upper).some(([x, y]) => x === -15 && y === 0)).toBe(false);
  });

  it('fills a gap that only partly wraps the drawn protein, as beside a trimer’s other subunits', () => {
    // A barrel of radius 8 with no lipid within 12 Å of its axis: the lumen
    // is a pore, but the lipid-free band outside the wall is not.
    const ring = Array.from({ length: 96 }, (_, k) => [
      CENTRE.x + 8 * Math.cos((k * Math.PI) / 48),
      CENTRE.y + 8 * Math.sin((k * Math.PI) / 48),
    ]).flat();
    const lipid = (sign: number) => (x: number, y: number, radius: number) =>
      Math.hypot(x - CENTRE.x, y - CENTRE.y) + radius <= 18
        ? null
        : sign * (20 + 0.1 * (x - CENTRE.x));
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: ring,
      local: { upper: lipid(1), lower: lipid(-1), radius: 6 },
    });
    const up = nodes(net.upper);
    const at = (ox: number, oy: number) =>
      up.find(([x, y]) => Math.abs(x - ox) < 1e-9 && Math.abs(y - oy) < 1e-9)?.[2];
    // Just outside the wall, where the ring fills a third of the view.
    for (const [ox, oy] of [
      [10, 0],
      [-10, 0],
      [0, 10],
      [0, -10],
    ])
      expect(at(ox, oy)).toBeCloseTo(20 + 0.1 * ox, 0);
    expect(at(0, 0)).toBeUndefined();
  });

  it('lies at the bulk planes, untorn, where there is no lipid at all', () => {
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: [CENTRE.x, CENTRE.y],
      local: { upper: () => null, lower: () => null, radius: 6 },
    });
    expect(net.upper).toHaveLength(2 * 15);
    expect(nodes(net.upper).every(([, , z]) => Math.abs(z - 20) < 1e-3)).toBe(true);
    expect(nodes(net.lower).every(([, , z]) => Math.abs(z + 20) < 1e-3)).toBe(true);
  });

  it('fills a gap from the lipid at its edge, without steps', () => {
    // Lookups wider than the averaging radius would give other heights (as a
    // wider average over real lipid does); the fill doesn't use them.
    const gap = { x: CENTRE.x - 15, y: CENTRE.y };
    const lipid = (x: number, y: number, radius: number) =>
      Math.hypot(x - gap.x, y - gap.y) + radius <= 14 ? null : 20 + radius / 2;
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: [CENTRE.x, CENTRE.y],
      local: { upper: lipid, lower: (x, y, r) => -lipid(x, y, r)!, radius: 6 },
    });
    const inner = nodes(net.upper).filter(([x, y]) => Math.hypot(x, y) <= 32);
    expect(inner.some(([x, y]) => Math.hypot(x + 15, y) < 8)).toBe(true);
    for (const [, , z] of inner) expect(z).toBeCloseTo(23, 3);
  });

  it('keeps a pore open however wide the averaging', () => {
    // No lipid within 10 Å of the pore's centre, inside a ring of protein.
    const pore = { x: CENTRE.x + 12, y: CENTRE.y };
    const lipid = (sign: number) => (x: number, y: number, radius: number) =>
      Math.hypot(x - pore.x, y - pore.y) + radius <= 10 ? null : sign * 20;
    const ring = Array.from({ length: 96 }, (_, k) => [
      pore.x + 9 * Math.cos((k * Math.PI) / 48),
      pore.y + 9 * Math.sin((k * Math.PI) / 48),
    ]).flat();
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: ring,
      local: { upper: lipid(1), lower: lipid(-1), radius: 12 },
      spacing: 2,
    });
    const all = [...nodes(net.upper), ...nodes(net.lower)];
    // Nothing with no lipid within 6 Å; the rest of the lumen is drawn.
    expect(all.some(([x, y]) => Math.hypot(x - 12, y) < 4)).toBe(false);
    expect(all.some(([x, y]) => Math.hypot(x - 12, y) < 7)).toBe(true);
  });

  it('takes a set grid spacing', () => {
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: [CENTRE.x, CENTRE.y],
      spacing: 2.5,
    });
    expect(net.spacing).toBe(2.5);
    // 2 × (2·⌊(40 − ε)/2.5⌋ + 1) lines.
    expect(net.upper).toHaveLength(2 * (2 * 15 + 1));
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
