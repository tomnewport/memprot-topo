import { describe, it, expect, afterEach, vi } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import { MEMBRANE_OVERHANG_PX } from '../../../src/membrane/index.js';
import type { ProteinData } from '../../../src/types.js';
import type { View3DScene } from '../../../src/view3d/types.js';
import { syntheticDistortions, helixCalphas } from '../fixtures/distortions.js';

/** Two TM helices joined by short loops, centred on (60, 60), midplane at z = mid. */
function hairpinProtein(mid: number): ProteinData {
  const up = helixCalphas(57, 60, mid - 24, mid + 24, 1);
  const down = helixCalphas(63, 60, mid - 24, mid + 24, 101)
    .reverse()
    .map((c, i) => ({ ...c, resSeq: up.length + 4 + i }));
  const loop = [1, 2, 3].map((k) => ({
    resSeq: up.length + k,
    iCode: '',
    x: 57 + 1.5 * k,
    y: 60,
    z: mid + 26,
  }));
  const calphas = [...up, ...loop, ...down];
  return {
    pdbId: 'mem1',
    chains: [
      {
        chainId: 'A',
        residueCount: calphas.length,
        segments: [
          { start: 1, end: up.length, type: 'helix' },
          { start: up.length + 4, end: up.length + 3 + down.length, type: 'helix' },
        ],
        calphas,
      },
    ],
  };
}

/** Thinned by up to 6 Å per leaflet at the protein, back to bulk 25 Å out. */
const THINNING = (x: number, y: number) => {
  const r = Math.hypot(x - 60, y - 60);
  return r < 25 ? -6 * (1 - r / 25) : 0;
};

function mount(): TopologyDisplay {
  const el = new TopologyDisplay();
  document.body.appendChild(el);
  return el;
}

/** (x, z) of every point of the membrane band, upper edge first, in plot Å. */
function band(el: TopologyDisplay): { x: number; z: number }[] {
  const d = el.shadowRoot!.querySelector('.svg-scroll svg path.membrane')!.getAttribute('d')!;
  return [...d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    z: Number(m[2]),
  }));
}

/** The upper edge of the band (its first half). */
function upperEdge(el: TopologyDisplay): { x: number; z: number }[] {
  const pts = band(el);
  return pts.slice(0, pts.length / 2);
}

describe('TopologyDisplay membrane', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('1. default: a flat band between the default leaflets at ±20 Å', () => {
    const el = mount();
    el.proteinData = hairpinProtein(0);
    expect(el.membrane).toMatchObject({
      bulk: { upper: 20, lower: -20 },
      annular: { upper: 20, lower: -20 },
      shift: 0,
      surfaces: null,
    });
    const pts = band(el);
    expect(new Set(pts.map((p) => p.z))).toEqual(new Set([20, -20]));
    // The band overhangs the protein by the edge zones at each end.
    expect(pts[0].x).toBeCloseTo(-MEMBRANE_OVERHANG_PX / 2.5, 2);
  });

  it('2. explicit leaflets: bulk at the ends, annular along the protein', () => {
    const el = mount();
    el.setAttribute('membrane-upper', '18');
    el.setAttribute('membrane-lower', '-22');
    el.setAttribute('membrane-annular-upper', '14');
    el.setAttribute('membrane-annular-lower', '-15');
    el.proteinData = hairpinProtein(0);
    expect(el.membrane!.bulk).toEqual({ upper: 18, lower: -22 });
    expect(el.membrane!.annular).toEqual({ upper: 14, lower: -15 });
    const upper = upperEdge(el);
    expect(upper[0].z).toBe(18);
    expect(upper[upper.length - 1].z).toBe(18);
    const middle = upper.filter((p) => p.x >= 0 && p.x <= upper[upper.length - 1].x - 12);
    expect(middle.every((p) => p.z === 14)).toBe(true);
    const lowest = Math.min(...band(el).map((p) => p.z));
    expect(lowest).toBe(-22);

    // Changing a leaflet re-renders the band.
    el.setAttribute('membrane-annular-upper', '16');
    expect(upperEdge(el).some((p) => p.z === 16)).toBe(true);
  });

  it('3. distortions file: moves the structure onto the midplane and draws the local surface', () => {
    const el = mount();
    el.distortions = syntheticDistortions({
      midplane: 50,
      half: 19,
      centre: { x: 60, y: 60 },
      radius: 40,
      bump: THINNING,
    });
    // The structure is in the file's box frame: its midplane is at z = 50.
    el.proteinData = hairpinProtein(50);
    const m = el.membrane!;
    expect(m.shift).toBeCloseTo(-50, 6);
    expect(m.bulk.upper).toBeCloseTo(19, 6);
    expect(m.surfaces).not.toBeNull();
    // Seen as transmembrane once moved (no "doesn't cross" note).
    expect(el.shadowRoot!.querySelector('.chain-note')).toBeNull();

    const upper = upperEdge(el);
    // Bulk at the ends …
    expect(upper[0].z).toBeCloseTo(19, 2);
    // … thinned under the helices, ~3 Å from the centre: ~19 − 6 × (1 − 3/25).
    const under = upper.filter((p) => p.x >= 0 && p.x <= upper[upper.length - 1].x - 12);
    expect(Math.max(...under.map((p) => p.z))).toBeLessThan(15);
    expect(Math.min(...under.map((p) => p.z))).toBeGreaterThan(12.5);

    // The 3-D view's fishnet gets the same local surface.
    const slab = (el as unknown as { _view3dSource: { scene: { slab: View3DScene['slab'] } } })
      ._view3dSource.scene.slab;
    expect(slab.annular).toEqual(m.annular);
    expect(slab.surface!.upper(60, 60, 6)).toBeLessThan(15);
    expect(slab.surface!.upper(95, 60, 6)).toBeCloseTo(19, 1);
  });

  /**
   * `protein` with `tail` Cα appended to its chain; each `helices` entry
   * [first, last] marks tail indices as a helix (the rest are loops).
   */
  function withTail(
    protein: ProteinData,
    tail: { x: number; y: number; z: number }[],
    helices: [number, number][],
  ) {
    const chain = protein.chains[0];
    const last = chain.calphas[chain.calphas.length - 1].resSeq;
    chain.calphas = [
      ...chain.calphas,
      ...tail.map((p, k) => ({ resSeq: last + 1 + k, iCode: '', ...p })),
    ];
    chain.residueCount = chain.calphas.length;
    chain.segments = [
      ...chain.segments,
      ...helices.map(([a, b]) => ({
        start: last + 1 + a,
        end: last + 1 + b,
        type: 'helix' as const,
      })),
    ];
    return protein;
  }

  /** A straight run of `n` Cα 3.8 Å apart from `from` along the unit vector `dir`. */
  const run = (
    n: number,
    from: { x: number; y: number; z: number },
    dir: { x: number; y: number; z: number },
  ) =>
    Array.from({ length: n }, (_, k) => ({
      x: from.x + 3.8 * k * dir.x,
      y: from.y + 3.8 * k * dir.y,
      z: from.z + 3.8 * k * dir.z,
    }));

  /** Points of an edge over the last `from`–`to` Å of the protein (before the overhang). */
  function nearEnd(edge: { x: number; z: number }[], from: number, to: number) {
    const end = edge[edge.length - 1].x - MEMBRANE_OVERHANG_PX / 2.5;
    return edge.filter((p) => p.x > end - from && p.x < end - to);
  }

  it('annular next to the transmembrane segments, back to bulk 10–30 Å away along the plane', () => {
    const el = mount();
    el.setAttribute('membrane-annular-upper', '14');
    el.setAttribute('membrane-annular-lower', '-15');
    // Under the membrane, a loop out to a helix lying 37–67 Å from the TM helices.
    const loop = run(8, { x: 67, y: 60, z: -28 }, { x: 1, y: 0, z: 0 });
    const far = run(9, { x: 97.4, y: 60, z: -28 }, { x: 1, y: 0, z: 0 });
    el.proteinData = withTail(hairpinProtein(0), [...loop, ...far], [[8, 16]]);
    const pts = band(el);
    const upper = pts.slice(0, pts.length / 2);
    const lower = pts.slice(pts.length / 2).reverse();
    // Annular under the TM helices …
    for (const p of upper.filter((q) => q.x >= 0 && q.x <= 4)) expect(p.z).toBeCloseTo(14, 1);
    // … bulk under the far helix.
    expect(nearEnd(upper, 10, 2).length).toBeGreaterThan(0);
    for (const p of nearEnd(upper, 10, 2)) expect(p.z).toBeCloseTo(20, 1);
    for (const p of nearEnd(lower, 10, 2)) expect(p.z).toBeCloseTo(-20, 1);

    // A helix curving round the TM helices 19–22 Å away (annular weight
    // 0.45–0.6) holds the band about halfway between annular and bulk.
    const arc = Array.from({ length: 12 }, (_, k) => {
      const t = (k * 3.8) / 24;
      return { x: 60 + 24 * Math.cos(t), y: 60 + 24 * Math.sin(t), z: -28 };
    });
    el.proteinData = withTail(
      hairpinProtein(0),
      [...run(5, { x: 67, y: 60, z: -28 }, { x: 1, y: 0, z: 0 }), ...arc],
      [[5, 16]],
    );
    const half = nearEnd(upperEdge(el), 8, 0);
    expect(half.length).toBeGreaterThan(0);
    for (const p of half) {
      expect(p.z).toBeGreaterThan(16);
      expect(p.z).toBeLessThan(18);
    }
  });

  it('annular across a chain break between transmembrane helices', () => {
    const el = mount();
    el.setAttribute('membrane-annular-upper', '14');
    el.setAttribute('membrane-annular-lower', '-15');
    // The hairpin without its loop: the chain breaks between the helices.
    const protein = hairpinProtein(0);
    const chain = protein.chains[0];
    const n = chain.calphas.length;
    chain.calphas = chain.calphas.filter((_, i) => i < (n - 3) / 2 || i >= (n + 3) / 2);
    el.proteinData = protein;
    const end = upperEdge(el).at(-1)!.x - MEMBRANE_OVERHANG_PX / 2.5;
    const along = upperEdge(el).filter((p) => p.x >= 0 && p.x <= end);
    expect(along.length).toBeGreaterThan(0);
    for (const p of along) expect(p.z).toBeCloseTo(14, 1);
  });

  it('annular under another chain lying beside the transmembrane segments', () => {
    const el = mount();
    el.setAttribute('membrane-annular-upper', '14');
    el.setAttribute('membrane-annular-lower', '-15');
    // Chain B: a soluble helix under the membrane, 3–8 Å from chain A's TM helices.
    const protein = hairpinProtein(0);
    const b = run(6, { x: 68, y: 50.5, z: -26 }, { x: 0, y: 1, z: 0 }).map((p, k) => ({
      resSeq: k + 1,
      iCode: '',
      ...p,
    }));
    protein.chains.push({
      chainId: 'B',
      residueCount: b.length,
      segments: [{ start: 1, end: b.length, type: 'helix' }],
      calphas: b,
    });
    el.proteinData = protein;
    el.setAttribute('selection', 'B');
    const end = upperEdge(el).at(-1)!.x - MEMBRANE_OVERHANG_PX / 2.5;
    const along = upperEdge(el).filter((p) => p.x >= 0 && p.x <= end);
    expect(along.length).toBeGreaterThan(0);
    for (const p of along) expect(p.z).toBeCloseTo(14, 1);
  });

  it('the local surface only where the protein is near the bilayer, annular 10–30 Å from it', () => {
    const el = mount();
    // Each leaflet 8 Å thicker beyond x = 67, beside the TM helices.
    el.distortions = syntheticDistortions({
      midplane: 50,
      half: 19,
      centre: { x: 60, y: 60 },
      radius: 40,
      bump: (x) => (x > 67 ? 8 : 0),
    });
    el.setAttribute('membrane-annular-lower', '-15');
    // Two helices lying along y beside the TM helices, under the thickened
    // membrane: one 8 Å below its lower leaflet (−27), so 20 Å below the
    // annular one; the other 43 Å below it.
    const down = Array.from({ length: 9 }, (_, k) => ({ x: 70, y: 68, z: 11.2 - 3.8 * k }));
    const tail = [
      { x: 66, y: 57, z: 23 },
      { x: 68, y: 54, z: 19 },
      ...run(5, { x: 70, y: 52, z: 15 }, { x: 0, y: 1, z: 0 }),
      ...down,
      ...run(5, { x: 70, y: 64.2, z: -20 }, { x: 0, y: -1, z: 0 }),
    ];
    el.proteinData = withTail(hairpinProtein(50), tail, [
      [2, 6],
      [16, 20],
    ]);
    const m = el.membrane!;
    expect(m.surfaces).not.toBeNull();
    expect(m.annular.lower).toBe(-15);
    const pts = band(el);
    const lower = pts.slice(pts.length / 2).reverse();
    // The near helix pulls the band down onto the thickened leaflet …
    expect(Math.min(...lower.map((p) => p.z))).toBeLessThan(-26);
    // … the far one leaves it at the annular leaflet.
    expect(nearEnd(lower, 7, 1).length).toBeGreaterThan(0);
    for (const p of nearEnd(lower, 7, 1)) expect(p.z).toBeCloseTo(-15, 0);
  });

  it('membrane-detail: bulk, annular or local, keeping the shift', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount();
    el.distortions = syntheticDistortions({
      midplane: 50,
      half: 19,
      centre: { x: 60, y: 60 },
      radius: 40,
      bump: THINNING,
    });
    el.proteinData = hairpinProtein(50);
    expect(el.membraneDetail).toBe('local');
    const local = el.membrane!;
    expect(local.surfaces).not.toBeNull();
    expect(local.annular.upper).toBeLessThan(18);
    const slab = () =>
      (el as unknown as { _view3dSource: { scene: { slab: View3DScene['slab'] } } })._view3dSource
        .scene.slab;

    // annular: the file's annular leaflets along the protein, no local surface.
    el.membraneDetail = 'annular';
    expect(el.getAttribute('membrane-detail')).toBe('annular');
    expect(el.membrane).toMatchObject({
      shift: local.shift,
      annular: local.annular,
      surfaces: null,
    });
    const upper = upperEdge(el);
    expect(upper[0].z).toBeCloseTo(19, 2);
    const under = upper.filter((p) => p.x >= 0 && p.x <= upper[upper.length - 1].x - 12);
    for (const p of under) expect(p.z).toBeCloseTo(local.annular.upper, 2);
    expect(slab().annular).toEqual(local.annular);
    expect(slab().surface).toBeUndefined();

    // bulk: one flat band, even with explicit annular leaflets.
    el.setAttribute('membrane-annular-upper', '10');
    el.setAttribute('membrane-detail', 'bulk');
    expect(el.membrane).toMatchObject({ shift: local.shift, annular: local.bulk, surfaces: null });
    expect(new Set(band(el).map((p) => p.z.toFixed(2)))).toEqual(new Set(['19.00', '-19.00']));
    expect(slab().annular).toEqual(local.bulk);
    // Still seen as transmembrane, so the structure stayed on the midplane.
    expect(el.shadowRoot!.querySelector('.chain-note')).toBeNull();

    // Unknown values and removal give the default.
    el.setAttribute('membrane-detail', 'wobbly');
    expect(el.membraneDetail).toBe('local');
    el.membraneDetail = null;
    expect(el.hasAttribute('membrane-detail')).toBe(false);
    expect(el.membrane!.surfaces).not.toBeNull();
    // The structure lines up with the file throughout: no frame warning.
    expect(warn).not.toHaveBeenCalled();
  });

  it('uses only the bulk of a distortions file in another frame, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount();
    el.distortions = syntheticDistortions({
      midplane: 50,
      half: 19,
      centre: { x: 60, y: 60 },
      radius: 40,
      bump: THINNING,
    });
    // OPM-style: already on the midplane but centred on the origin in xy.
    const opm = hairpinProtein(0);
    opm.chains[0].calphas = opm.chains[0].calphas.map((c) => ({ ...c, x: c.x - 60, y: c.y - 60 }));
    el.proteinData = opm;
    expect(el.membrane).toMatchObject({ shift: 0, surfaces: null });
    expect(el.membrane!.bulk.upper).toBeCloseTo(19, 6);
    expect(new Set(band(el).map((p) => p.z))).toEqual(new Set([19, -19]));
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/not in the distortions file/));
    // Changing only the detail doesn't resolve the membrane again, or warn again.
    const warnings = warn.mock.calls.length;
    el.membraneDetail = 'annular';
    el.membraneDetail = 'bulk';
    el.membraneDetail = null;
    expect(warn).toHaveBeenCalledTimes(warnings);
  });

  it('ignores distortions text it cannot parse', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const el = mount();
    el.distortions = 'not a pdb file';
    el.proteinData = hairpinProtein(0);
    expect(el.distortions).toBeNull();
    expect(el.membrane!.bulk).toEqual({ upper: 20, lower: -20 });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/ignoring distortions file/));
  });

  it('draws the chain-picker icons against the bulk membrane', () => {
    const el = mount();
    el.setAttribute('membrane-upper', '30');
    el.setAttribute('membrane-lower', '-30');
    const data = hairpinProtein(0);
    data.chains.push({
      ...data.chains[0],
      chainId: 'B',
      residueCount: data.chains[0].residueCount - 1,
    });
    el.proteinData = data;
    // Thicker membrane → the ±24 Å helices stay within the band: one row each side.
    const icon = el.shadowRoot!.querySelector('.chain-violin svg');
    expect(icon).not.toBeNull();
    expect((el as unknown as { iconMembrane: unknown }).iconMembrane).toEqual({
      centre: 0,
      thickness: 60,
    });
  });
});
