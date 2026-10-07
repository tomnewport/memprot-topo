import { describe, it, expect, afterEach, vi } from 'vitest';
import { TopologyDisplay } from '../../../src/components/topology-display.js';
import { MEMBRANE_OVERHANG_PX } from '../../../src/membrane/index.js';
import type { ProteinData } from '../../../src/types.js';
import type { MorphScene } from '../../../src/morph/types.js';
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
    const slab = (el as unknown as { _morphSource: { scene: { slab: MorphScene['slab'] } } })
      ._morphSource.scene.slab;
    expect(slab.annular).toEqual(m.annular);
    expect(slab.surface!.upper(60, 60, 6)).toBeLessThan(15);
    expect(slab.surface!.upper(95, 60, 6)).toBeCloseTo(19, 1);
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
