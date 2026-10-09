import { describe, it, expect } from 'vitest';
import {
  blendFishnet,
  buildFishnet,
  fishnetSpacing,
  fitRigid2d,
  sameNetShape,
  type FishnetInput,
  type MembraneStyle,
} from '../../../src/morph/net.js';

const BULK = { upper: 20, lower: -20 };
const CENTRE = { x: 10, y: -5 };

/** Every drawn (ox, oy, z) node of a leaflet's net (open ones, z NaN, left out). */
function nodes(lines: Float64Array[]): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (const l of lines)
    for (let i = 0; i < l.length; i += 3)
      if (!Number.isNaN(l[i + 2])) out.push([l[i], l[i + 1], l[i + 2]]);
  return out;
}

/** Number of open (NaN) points in a leaflet's net. */
function open(lines: Float64Array[]): number {
  let n = 0;
  for (const l of lines) for (let i = 2; i < l.length; i += 3) if (Number.isNaN(l[i])) n++;
  return n;
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
      // Interpolated from a 2 Å lattice (less closely next to the pore).
      if (rho <= 0.8 && Math.hypot(ox - 15, oy) > 7)
        expect(z).toBeCloseTo(20 + bump(CENTRE.x + ox, CENTRE.y + oy), 1);
      if (rho > 0.999) expect(z).toBe(20);
      // No node inside the pore.
      expect(Math.hypot(ox - 15, oy)).toBeGreaterThanOrEqual(5);
    }
    expect(up.find(([x, y]) => x === 0 && y === 0)![2]).toBeCloseTo(26, 9);
    // The lines through the pore are open there.
    expect(open(net.upper)).toBeGreaterThan(0);
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
    // Unbroken: one polyline per grid line, as with no gap, and none open.
    expect(net.upper).toHaveLength(2 * 15);
    expect(open(net.upper)).toBe(0);
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
    expect(open(net.upper)).toBe(0);
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
    for (const [, , z] of inner) expect(z).toBeCloseTo(23, 2);
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

  it('leaves a ring of flat bulk at the rim', () => {
    const net = buildFishnet({
      centre: CENTRE,
      radius: 40,
      bulk: BULK,
      annular: BULK,
      protein: [CENTRE.x, CENTRE.y],
      local: { upper: () => 26, lower: () => -26, radius: 6 },
      margin: 5,
    });
    for (const [x, y, z] of nodes(net.upper)) {
      const d = Math.hypot(x, y);
      if (d >= 35) expect(z).toBe(20);
      // A lattice step inside the fade.
      if (d <= 0.8 * 35 - 2) expect(z).toBeCloseTo(26, 9);
      if (d > 0.8 * 35 && d < 35) expect(z).toBeGreaterThan(20);
    }
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

describe('membrane styles', () => {
  const bump = (x: number, y: number) =>
    6 * Math.exp(-((x - CENTRE.x) ** 2 + (y - CENTRE.y) ** 2) / 200);
  const pore = (x: number, y: number) => Math.hypot(x - CENTRE.x - 15, y - CENTRE.y) < 5;
  // A barrel of radius 8 around the pore, 15 Å from the disc centre.
  const barrel = Array.from({ length: 64 }, (_, i) => [
    CENTRE.x + 15 + 8 * Math.cos((i * Math.PI) / 32),
    CENTRE.y + 8 * Math.sin((i * Math.PI) / 32),
  ]).flat();
  const input = (style: MembraneStyle, local = true): FishnetInput => ({
    centre: CENTRE,
    radius: 40,
    margin: 5,
    spacing: 4,
    style,
    bulk: BULK,
    annular: BULK,
    protein: barrel,
    local: local
      ? {
          upper: (x, y) => (pore(x, y) ? null : 20 + bump(x, y)),
          lower: (x, y) => (pore(x, y) ? null : -20 - bump(x, y)),
          radius: 6,
        }
      : undefined,
  });
  /** Distance (Å) from a point about the disc centre to the nearest barrel sample. */
  const fromProtein = (ox: number, oy: number) => {
    let d = Infinity;
    for (let i = 0; i < barrel.length; i += 2)
      d = Math.min(d, Math.hypot(CENTRE.x + ox - barrel[i], CENTRE.y + oy - barrel[i + 1]));
    return d;
  };
  const closed = (l: Float64Array) => l[0] === l[l.length - 3] && l[1] === l[l.length - 2];

  it('draws polar rings that keep their distance from the protein near it and are circles further out', () => {
    const net = buildFishnet(input('polar'));
    expect(net.style).toBe('polar');
    expect(net.mesh).toBeNull();
    const up = nodes(net.upper);
    // Nothing inside the protein-lipid interface, 4 Å out from the samples.
    for (const [ox, oy] of up) expect(fromProtein(ox, oy)).toBeGreaterThan(3.9);
    // Rings at the interface and 4 Å further out follow the protein's outline.
    const rings = net.upper.filter(closed);
    const along = (l: Float64Array) => {
      const d: number[] = [];
      for (let i = 0; i < l.length; i += 3) d.push(fromProtein(l[i], l[i + 1]));
      return [Math.min(...d), Math.max(...d)];
    };
    for (const k of [4, 8]) {
      expect(rings.some((l) => along(l).every((d) => Math.abs(d - k) < 0.1))).toBe(true);
    }
    // The last ring is the circle where the bulk starts (5 Å in from the rim).
    expect(
      net.upper.some((l) => {
        for (let i = 0; i < l.length; i += 3)
          if (Math.abs(Math.hypot(l[i], l[i + 1]) - 35) > 1e-6) return false;
        return true;
      }),
    ).toBe(true);
    // Spokes run in from the rim.
    const spokes = net.upper.filter((l) => !closed(l));
    // Each starts on the rim, at the bulk.
    const atRim = spokes.filter((l) => Math.abs(Math.hypot(l[0], l[1]) - 40) < 1e-6);
    expect(atRim.length).toBeGreaterThan(20);
    for (const l of atRim) expect(l[2]).toBe(20);
    // Heights follow the local surface.
    for (const [ox, oy, z] of up) {
      if (Math.hypot(ox, oy) <= 30 && Math.hypot(ox - 15, oy) > 13)
        expect(Math.abs(z - 20 - bump(CENTRE.x + ox, CENTRE.y + oy))).toBeLessThan(0.3);
    }
  });

  it('closes the polar rings round crevices and keeps them off the solver noise in a pocket', () => {
    // Eight helices on a 270° arc: crevices between them, and a pocket that
    // only reaches the bulk past the rings.
    const helices: number[] = [];
    for (let i = 0; i < 8; i++) {
      const th = (i / 7) * 1.5 * Math.PI - 0.75 * Math.PI;
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * 2 * Math.PI;
        helices.push(18 * Math.cos(th) + 2.3 * Math.cos(a), 18 * Math.sin(th) + 2.3 * Math.sin(a));
      }
    }
    const net = buildFishnet({
      centre: { x: 0, y: 0 },
      radius: 50,
      margin: 5,
      spacing: 4,
      style: 'polar',
      bulk: BULK,
      annular: BULK,
      protein: helices,
    });
    const dist = (x: number, y: number) => {
      let d = Infinity;
      for (let i = 0; i < helices.length; i += 2)
        d = Math.min(d, Math.hypot(x - helices[i], y - helices[i + 1]));
      return d;
    };
    let rings = 0;
    for (const l of net.upper) {
      const ds: number[] = [];
      for (let i = 0; i < l.length; i += 3) ds.push(dist(l[i], l[i + 1]));
      // The interface ring, 4 Å out, is closed.
      if (ds.every((d) => Math.abs(d - 4) < 0.6)) {
        rings++;
        expect(closed(l)).toBe(true);
      }
      // A closed line near the last constant-distance ring (12 Å) follows it.
      if (closed(l) && Math.min(...ds) > 10.5 && Math.min(...ds) < 13.5)
        for (const d of ds) expect(Math.abs(d - 12)).toBeLessThan(1);
    }
    expect(rings).toBeGreaterThan(0);
  });

  it('builds a surface mesh with the leaflet heights, open over the pore', () => {
    const net = buildFishnet(input('surface'));
    expect(net.style).toBe('surface');
    expect(net.upper).toHaveLength(0);
    const mesh = net.mesh!;
    const nv = mesh.xy.length / 2;
    expect(nv).toBeGreaterThan(1000);
    expect(mesh.upper).toHaveLength(nv);
    expect(Math.max(...mesh.quads)).toBeLessThan(nv);
    let inPore = 0;
    for (let v = 0; v < nv; v++) {
      const [ox, oy] = [mesh.xy[v * 2], mesh.xy[v * 2 + 1]];
      expect(Math.hypot(ox, oy)).toBeLessThanOrEqual(40 + 1e-9);
      expect(mesh.upper[v]).toBe(net.heightAt('upper', ox, oy));
      expect(mesh.lower[v]).toBe(net.heightAt('lower', ox, oy));
      if (Math.hypot(ox - 15, oy) < 3) {
        inPore++;
        expect(mesh.upper[v]).toBeNaN();
      }
      if (Math.hypot(ox, oy) > 40 - 1e-9) expect(mesh.upper[v]).toBe(20);
    }
    expect(inPore).toBeGreaterThan(0);
  });

  it('tells nets that share their points, so they can be blended', () => {
    for (const style of ['grid', 'polar', 'surface'] as const) {
      expect(sameNetShape(buildFishnet(input(style, false)), buildFishnet(input(style)))).toBe(
        true,
      );
    }
    const grid = buildFishnet(input('grid'));
    expect(sameNetShape(grid, buildFishnet(input('polar')))).toBe(false);
    expect(sameNetShape(grid, buildFishnet({ ...input('grid'), spacing: 5 }))).toBe(false);
  });

  it('blends the heights of two nets, opening a pore halfway', () => {
    for (const style of ['grid', 'surface'] as const) {
      const flat = buildFishnet(input(style, false));
      const local = buildFishnet(input(style));
      const zs = (n: typeof flat) => (n.mesh ? [n.mesh.upper] : n.upper).flatMap((l) => [...l]);
      const [a, b] = [zs(flat), zs(local)];
      const at = (t: number) => zs(blendFishnet(flat, local, t));
      const [t0, t4, t5, t6, t1] = [0, 0.4, 0.5, 0.6, 1].map(at);
      let pores = 0;
      for (let i = 0; i < a.length; i++) {
        if (Number.isNaN(b[i])) {
          pores++;
          // Open for the half nearer the net where it is open.
          expect(t4[i]).toBe(a[i]);
          expect(t6[i]).toBeNaN();
          continue;
        }
        expect(t0[i]).toBe(a[i]);
        expect(t1[i]).toBeCloseTo(b[i], 12);
        expect(t5[i]).toBeCloseTo((a[i] + b[i]) / 2, 12);
      }
      expect(pores).toBeGreaterThan(0);
      const mid = blendFishnet(flat, local, 0.5);
      expect(mid.heightAt('upper', 0, 0)).toBeCloseTo(
        (flat.heightAt('upper', 0, 0) + local.heightAt('upper', 0, 0)) / 2,
        12,
      );
    }
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
