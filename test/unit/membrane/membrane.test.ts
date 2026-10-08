import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BULK,
  LeafletSurface,
  MEMBRANE_EDGE_PX,
  MEMBRANE_OVERHANG_PX,
  alignToDistortions,
  membraneAtDetail,
  membraneProfile,
  parseDistortions,
  resolveMembrane,
} from '../../../src/membrane/index.js';
import { syntheticDistortions, helixCalphas } from '../fixtures/distortions.js';
import { AHL_SIM_CALPHA } from '../fixtures/7ahl-sim.js';
import AHL_DISTORTIONS from '../fixtures/7ahl-distortions.pdb?raw';

function ahlCalphas() {
  const out = [];
  for (let i = 0; i < AHL_SIM_CALPHA.length; i += 3) {
    out.push({ x: AHL_SIM_CALPHA[i], y: AHL_SIM_CALPHA[i + 1], z: AHL_SIM_CALPHA[i + 2] });
  }
  return out;
}

/** A patch centred on (60, 60) with its midplane at z = 50. */
const PATCH = { midplane: 50, half: 20, centre: { x: 60, y: 60 }, radius: 40 };

/** Four TM helices round (60, 60), in the patch's box frame. */
function boxFrameBundle() {
  return [
    ...helixCalphas(55, 55, 25, 75, 1),
    ...helixCalphas(65, 55, 25, 75, 101),
    ...helixCalphas(65, 65, 25, 75, 201),
    ...helixCalphas(55, 65, 25, 75, 301),
  ];
}

describe('parseDistortions', () => {
  it('reads the bulk planes from the B-factor displacements of the real 7AHL file', () => {
    const d = parseDistortions(AHL_DISTORTIONS);
    // z − B (upper) and z + B (lower) of every unclamped point: 57.674 and 18.486.
    expect(d.midplane).toBeCloseTo(38.08, 2);
    expect(d.bulk.upper).toBeCloseTo(19.594, 2);
    expect(d.bulk.lower).toBeCloseTo(-19.594, 2);
    expect(d.upper.size).toBeGreaterThan(1000);
    expect(d.lower.size).toBeGreaterThan(400);
    // The patch is centred on the heptamer's axis.
    expect(Math.hypot(d.centre.x - 70, d.centre.y - 78)).toBeLessThan(6);
  });

  it('recentres the surfaces on the bulk midplane and skips the colour-scale records', () => {
    const d = parseDistortions(syntheticDistortions(PATCH));
    expect(d.midplane).toBeCloseTo(50, 5);
    expect(d.bulk).toEqual({ upper: 20, lower: -20 });
    expect(Math.max(...d.upper.z)).toBeCloseTo(20, 5);
    expect(Math.min(...d.lower.z)).toBeCloseTo(-20, 5);
    // LCC/UCC sit at (0..2, 0, 0); no surface point does.
    expect([...d.upper.x].some((x, i) => x < 5 && d.upper.y[i] < 5)).toBe(false);
    expect(d.centre.x).toBeCloseTo(60, 1);
    expect(d.radius).toBeGreaterThan(35);
  });

  it('takes the bulk from the B-factor reference even when the rim itself is displaced', () => {
    // Thinned by 3 Å everywhere, rim included: the rim says ±17, the B column ±20.
    const d = parseDistortions(syntheticDistortions({ ...PATCH, bump: () => -3 }));
    expect(d.bulk.upper).toBeCloseTo(20, 5);
    expect(d.bulk.lower).toBeCloseTo(-20, 5);
  });

  it('falls back to the outer rim when there is no B-factor column', () => {
    const bump = (x: number, y: number) => (Math.hypot(x - 60, y - 60) < 15 ? -6 : 0);
    const d = parseDistortions(syntheticDistortions({ ...PATCH, bump, bFactors: false }));
    expect(d.midplane).toBeCloseTo(50, 5);
    expect(d.bulk.upper).toBeCloseTo(20, 5);
  });

  it('rejects a file without both leaflets', () => {
    const upperOnly = syntheticDistortions(PATCH)
      .split('\n')
      .filter((l) => !l.startsWith('ATOM') || l.slice(17, 18) !== 'L')
      .join('\n');
    expect(() => parseDistortions(upperOnly)).toThrow(/both leaflets/);
  });
});

describe('LeafletSurface.heightAt', () => {
  const plane = (fn: (x: number, y: number) => number) => {
    const pts = [];
    for (let x = 0; x <= 40; x++) for (let y = 0; y <= 40; y++) pts.push({ x, y, z: fn(x, y) });
    return new LeafletSurface(pts);
  };

  it('reproduces a flat or sloping surface', () => {
    expect(plane(() => 7).heightAt(20.3, 11.7)).toBeCloseTo(7, 9);
    // Symmetric weights: a linear surface is reproduced away from the edges.
    expect(plane((x, y) => 0.5 * x - 0.25 * y).heightAt(20.5, 20.25)).toBeCloseTo(
      0.5 * 20.5 - 0.25 * 20.25,
      2,
    );
  });

  it('reaches across a hole and gives up far off the patch', () => {
    const pts = [];
    for (let x = 0; x <= 40; x++)
      for (let y = 0; y <= 40; y++) if (Math.hypot(x - 20, y - 20) > 5) pts.push({ x, y, z: 3 });
    const s = new LeafletSurface(pts);
    expect(s.heightAt(20, 20)).toBeCloseTo(3, 9);
    expect(s.heightAt(100, 100)).toBeNull();
    // With a fixed radius smaller than the hole, the hole stays open.
    expect(s.heightAt(20, 20, 4)).toBeNull();
    expect(s.heightAt(20, 20, 6)).toBeCloseTo(3, 9);
  });

  it('changes smoothly as the query point moves', () => {
    const s = plane((x, y) => Math.sin(x / 4) + Math.cos(y / 5));
    let worst = 0;
    let prev = s.heightAt(10, 20)!;
    for (let x = 10.05; x < 30; x += 0.05) {
      const h = s.heightAt(x, 20)!;
      worst = Math.max(worst, Math.abs(h - prev));
      prev = h;
    }
    expect(worst).toBeLessThan(0.05);
  });
});

describe('alignToDistortions', () => {
  const d = parseDistortions(syntheticDistortions(PATCH));

  it('recognises a structure in the box frame and one centred on the midplane', () => {
    const box = boxFrameBundle();
    expect(alignToDistortions(box, d)).toBeCloseTo(-50, 9);
    const centred = box.map((c) => ({ ...c, z: c.z - 50 }));
    expect(alignToDistortions(centred, d)).toBe(0);
  });

  it('rejects a structure in another frame', () => {
    // Centred on the origin in xy, as OPM places it.
    const opm = boxFrameBundle().map((c) => ({ x: c.x - 60, y: c.y - 60, z: c.z - 50 }));
    expect(alignToDistortions(opm, d)).toBeNull();
    // Too few Cα near either candidate midplane.
    expect(alignToDistortions([{ x: 60, y: 60, z: 50 }], d)).toBeNull();
  });

  it('lines the MemProtMD 7AHL structure up with its own distortions file', () => {
    const ahl = parseDistortions(AHL_DISTORTIONS);
    const ca = ahlCalphas();
    expect(alignToDistortions(ca, ahl)).toBeCloseTo(-38.08, 2);
    // The same structure as OPM would give it: centred on the origin and turned.
    const cx = ca.reduce((s, c) => s + c.x, 0) / ca.length;
    const cy = ca.reduce((s, c) => s + c.y, 0) / ca.length;
    const turned = ca.map((c) => ({
      x: (c.x - cx) * Math.cos(0.7) - (c.y - cy) * Math.sin(0.7),
      y: (c.x - cx) * Math.sin(0.7) + (c.y - cy) * Math.cos(0.7),
      z: c.z - 38.08,
    }));
    expect(alignToDistortions(turned, ahl)).toBeNull();
  });
});

describe('resolveMembrane — the three ways of placing the membrane', () => {
  it('1. defaults: bulk at ±20 Å, annular the same, no shift', () => {
    const m = resolveMembrane({}, null, boxFrameBundle());
    expect(m.bulk).toEqual(DEFAULT_BULK);
    expect(m.annular).toEqual(DEFAULT_BULK);
    expect(m.surfaces).toBeNull();
    expect(m.shift).toBe(0);
  });

  it('2. explicit leaflets: bulk and annular as given; annular follows a given bulk', () => {
    const all = resolveMembrane(
      { bulk: { upper: 18, lower: -22 }, annular: { upper: 14, lower: -16 } },
      null,
      [],
    );
    expect(all.bulk).toEqual({ upper: 18, lower: -22 });
    expect(all.annular).toEqual({ upper: 14, lower: -16 });
    const bulkOnly = resolveMembrane({ bulk: { upper: 18 } }, null, []);
    expect(bulkOnly.bulk).toEqual({ upper: 18, lower: -20 });
    expect(bulkOnly.annular).toEqual({ upper: 18, lower: -20 });
  });

  it('3. distortions file: bulk from the file, annular and local surfaces under the protein', () => {
    // Thinned by up to 6 Å next to the protein, back to bulk 25 Å out.
    const bump = (x: number, y: number) => {
      const r = Math.hypot(x - 60, y - 60);
      return r < 25 ? -6 * (1 - r / 25) : 0;
    };
    const d = parseDistortions(syntheticDistortions({ ...PATCH, half: 19, bump }));
    const m = resolveMembrane({}, d, boxFrameBundle());
    expect(m.shift).toBeCloseTo(-50, 9);
    expect(m.bulk.upper).toBeCloseTo(19, 5);
    expect(m.surfaces).not.toBeNull();
    // The helices sit ~7 Å from the centre: about 4.3 Å thinner per leaflet.
    expect(m.annular.upper).toBeGreaterThan(13.5);
    expect(m.annular.upper).toBeLessThan(16);
    expect(m.annular.lower).toBeCloseTo(-m.annular.upper, 5);
    // Explicit settings still win over the file.
    const over = resolveMembrane(
      { bulk: { upper: 21 }, annular: { lower: -12 } },
      d,
      boxFrameBundle(),
    );
    expect(over.bulk.upper).toBe(21);
    expect(over.annular.lower).toBe(-12);
  });

  it('membraneAtDetail: local as is, annular without surfaces, bulk flat', () => {
    const d = parseDistortions(
      syntheticDistortions({
        ...PATCH,
        half: 19,
        bump: (x, y) => (Math.hypot(x - 60, y - 60) < 25 ? -4 : 0),
      }),
    );
    const m = resolveMembrane({}, d, boxFrameBundle());
    expect(membraneAtDetail(m, 'local')).toBe(m);
    const annular = membraneAtDetail(m, 'annular');
    expect(annular).toEqual({ ...m, surfaces: null });
    const bulk = membraneAtDetail(m, 'bulk');
    expect(bulk).toEqual({ bulk: m.bulk, annular: m.bulk, surfaces: null, shift: m.shift });
    expect(bulk.annular).not.toBe(m.bulk);
    // The input is left alone.
    expect(m.surfaces).not.toBeNull();
    expect(m.annular.upper).toBeLessThan(18);
  });

  it('uses only the file’s bulk positions when the structure is in another frame', () => {
    const d = parseDistortions(syntheticDistortions({ ...PATCH, half: 19 }));
    const opm = boxFrameBundle().map((c) => ({ x: c.x - 60, y: c.y - 60, z: c.z - 50 }));
    const m = resolveMembrane({}, d, opm);
    expect(m.shift).toBe(0);
    expect(m.surfaces).toBeNull();
    expect(m.bulk.upper).toBeCloseTo(19, 5);
    expect(m.annular.upper).toBeCloseTo(19, 5);
  });
});

describe('membraneProfile', () => {
  const pxPerA = 2.5;
  const bulk = { upper: 20, lower: -20 };
  const annular = { upper: 14, lower: -16 };
  const at = (p: ReturnType<typeof membraneProfile>, x: number) => {
    let best = 0;
    for (let i = 0; i < p.x.length; i++)
      if (Math.abs(p.x[i] - x) < Math.abs(p.x[best] - x)) best = i;
    return { upper: p.upper[best], lower: p.lower[best] };
  };

  it('runs bulk → annular → steady annular, overhanging the protein at each end', () => {
    const p = membraneProfile({ x0: 0, x1: 100, bulk, annular, pxPerA });
    const overhang = MEMBRANE_OVERHANG_PX / pxPerA;
    expect(p.x[0]).toBeCloseTo(-overhang, 9);
    expect(p.x[p.x.length - 1]).toBeCloseTo(100 + overhang, 9);
    // Bulk across the outer 10 px at both ends.
    for (const x of [-overhang, -overhang + 3.9, 100 + overhang - 3.9]) {
      expect(at(p, x)).toEqual(bulk);
    }
    // Annular from 20 px in, and steady through the middle.
    for (const x of [-overhang + 8.1, 0, 50, 100]) {
      expect(at(p, x).upper).toBeCloseTo(14, 9);
      expect(at(p, x).lower).toBeCloseTo(-16, 9);
    }
    // Part-way round the switch.
    const mid = at(p, -overhang + 6);
    expect(mid.upper).toBeGreaterThan(14);
    expect(mid.upper).toBeLessThan(20);
  });

  it('follows the local heights under the residues, smoothly', () => {
    const anchors = [];
    for (let x = 0; x <= 100; x += 1) {
      const dip = x > 40 && x < 60 ? -5 : 0;
      anchors.push({ x, upper: 18 + dip, lower: -18 - dip });
    }
    const p = membraneProfile({ x0: 0, x1: 100, bulk, annular, anchors, pxPerA });
    expect(at(p, 20).upper).toBeCloseTo(18, 3);
    // The 20 Å-wide, 5 Å-deep dip, Gaussian-smoothed (σ = 12 px = 4.8 Å).
    expect(at(p, 50).upper).toBeCloseTo(13, 0);
    expect(at(p, 50).lower).toBeCloseTo(-13, 0);
    // No steps: under the protein neighbouring samples (2 px apart) differ by
    // < 0.5 Å; the edge switches are no steeper than a 10 px smoothstep
    // (peak slope 1.5 × the change over the switch).
    const edgeStep = 1.5 * Math.max(6, 4) * (2 / MEMBRANE_EDGE_PX.toAnnular) + 1e-9;
    for (let i = 1; i < p.x.length; i++) {
      const limit = p.x[i - 1] >= 0 && p.x[i] <= 100 ? 0.5 : edgeStep;
      expect(Math.abs(p.upper[i] - p.upper[i - 1])).toBeLessThan(limit);
      expect(Math.abs(p.lower[i] - p.lower[i - 1])).toBeLessThan(limit);
    }
    // A leaflet with no known heights stays annular.
    const upperOnly = anchors.map((a) => ({ ...a, lower: null }));
    const q = membraneProfile({ x0: 0, x1: 100, bulk, annular, anchors: upperOnly, pxPerA });
    expect(at(q, 50).lower).toBeCloseTo(-16, 9);
  });

  it('sizes its edge zones in diagram units, so they keep their size when the scale changes', () => {
    for (const scale of [2.5, 5]) {
      const p = membraneProfile({ x0: 0, x1: 100, bulk, annular, pxPerA: scale });
      const bulkA = MEMBRANE_EDGE_PX.bulk / scale;
      const lastBulk = p.x.filter((x, i) => x <= 0 && p.upper[i] === bulk.upper).pop()!;
      expect((lastBulk - p.x[0]) * scale).toBeGreaterThan(MEMBRANE_EDGE_PX.bulk - 2.01);
      expect(lastBulk - p.x[0]).toBeLessThanOrEqual(bulkA + 1e-9);
    }
  });
});
