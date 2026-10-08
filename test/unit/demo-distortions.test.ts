import { describe, it, expect, afterEach, vi } from 'vitest';
import { TopologyDisplay } from '../../src/components/topology-display.js';
import {
  DEMO_DISTORTIONS,
  inSimulationFrame,
  mountDistortionsToggle,
  type DistortionsTarget,
} from '../../src/demo-distortions.js';
import { alignToDistortions, parseDistortions } from '../../src/membrane/index.js';
import type { ProteinData } from '../../src/types.js';
import AHL_DEMO_DISTORTIONS from '../../demo/distortions/7ahl.pdb?raw';
import { AHL_OPM_CALPHA } from './fixtures/7ahl-opm.js';
import { AHL_SIM_CALPHA } from './fixtures/7ahl-sim.js';

/** OPM 7AHL as the demo loads it: chains A–G of 293 Cα (no secondary structure needed here). */
function opm7ahl(): ProteinData {
  const chains = 'ABCDEFG'.split('').map((chainId, k) => ({
    chainId,
    residueCount: 293,
    segments: [],
    calphas: Array.from({ length: 293 }, (_, i) => {
      const j = (k * 293 + i) * 3;
      return {
        resSeq: i + 1,
        iCode: '',
        x: AHL_OPM_CALPHA[j],
        y: AHL_OPM_CALPHA[j + 1],
        z: AHL_OPM_CALPHA[j + 2],
      };
    }),
  }));
  return { pdbId: '7ahl', chains };
}

const registration = DEMO_DISTORTIONS['7ahl'].registration!;

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('demo distortions', () => {
  it('has a thinned file for every demo protein', () => {
    expect(Object.keys(DEMO_DISTORTIONS).sort()).toEqual(['2j1n', '2omf', '3k19', '5g53', '7ahl']);
    for (const { url } of Object.values(DEMO_DISTORTIONS)) expect(url()).toMatch(/\.pdb$/);
  });

  it('moves every Cα by the registration and leaves the input alone', () => {
    const data = opm7ahl();
    const before = JSON.stringify(data);
    const moved = inSimulationFrame(data, {
      rotation: [
        [0, -1, 0],
        [1, 0, 0],
        [0, 0, 1],
      ],
      translation: [10, 20, 30],
      rmsd: 0,
      source: 'test',
    });
    expect(JSON.stringify(data)).toBe(before);
    const c = data.chains[2].calphas[5];
    expect(moved.chains[2].calphas[5]).toMatchObject({
      resSeq: c.resSeq,
      x: -c.y + 10,
      y: c.x + 20,
      z: c.z + 30,
    });
  });

  it('puts OPM 7AHL onto MemProtMD’s own 7AHL model', () => {
    const moved = inSimulationFrame(opm7ahl(), registration).chains.flatMap((c) => c.calphas);
    // Every moved Cα lands on one of MemProtMD's (fixture rounded to 0.1 Å).
    const sim: number[][] = [];
    for (let i = 0; i < AHL_SIM_CALPHA.length; i += 3) sim.push(AHL_SIM_CALPHA.slice(i, i + 3));
    let worst = 0;
    let sq = 0;
    for (const c of moved) {
      let best = Infinity;
      for (const s of sim)
        best = Math.min(best, (c.x - s[0]) ** 2 + (c.y - s[1]) ** 2 + (c.z - s[2]) ** 2);
      worst = Math.max(worst, Math.sqrt(best));
      sq += best;
    }
    expect(Math.sqrt(sq / moved.length)).toBeLessThan(0.5);
    expect(worst).toBeLessThan(2);
    // … and so lines up with the demo's distortions file, in the box frame.
    const d = parseDistortions(AHL_DEMO_DISTORTIONS);
    expect(d.midplane).toBeCloseTo(38.08, 1);
    expect(alignToDistortions(moved, d)).toBeCloseTo(-d.midplane, 6);
    // Without the registration OPM 7AHL does not.
    expect(
      alignToDistortions(
        opm7ahl().chains.flatMap((c) => c.calphas),
        d,
      ),
    ).toBeNull();
  });

  function setup(ids: string[], load: (url: string) => Promise<string>) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    const status = document.createElement('span');
    const targets: DistortionsTarget[] = ids.map((pdbId) => {
      const el = new TopologyDisplay();
      document.body.appendChild(el);
      const data = { ...opm7ahl(), pdbId };
      el.proteinData = data;
      return { pdbId, el, data };
    });
    const reset = mountDistortionsToggle(input, status, targets, load);
    const toggle = async (on: boolean) => {
      input.checked = on;
      input.dispatchEvent(new Event('change'));
      await vi.waitFor(() => expect(status.textContent).not.toBe('Loading…'));
    };
    return { input, status, targets, reset, toggle };
  }

  it('loads the file and moves registered structures into MemProtMD’s frame, and back', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const load = vi.fn(async () => AHL_DEMO_DISTORTIONS);
    const { status, targets, reset, toggle } = setup(['7ahl', '2j1n'], load);
    const [ahl, other] = targets;

    await toggle(true);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith(DEMO_DISTORTIONS['7ahl'].url());
    expect(ahl.el.distortions).not.toBeNull();
    expect(ahl.el.membrane!.shift).toBeCloseTo(-38.08, 1);
    expect(ahl.el.membrane!.surfaces).not.toBeNull();
    // Unregistered proteins are left as they were.
    expect(other.el.distortions).toBeNull();
    expect(other.el.proteinData).toBe(other.data);
    expect(status.textContent).toBe(
      'Shown for 7AHL, in MemProtMD’s frame. 2J1N need MemProtMD’s coordinates to line up, so are unchanged.',
    );
    // Never drawn against a file it doesn't line up with.
    expect(warn).not.toHaveBeenCalled();

    await toggle(false);
    expect(ahl.el.distortions).toBeNull();
    expect(ahl.el.proteinData).toBe(ahl.data);
    expect(ahl.el.membrane!.shift).toBe(0);
    expect(status.textContent).toBe('');

    // Switching back on reuses the file; reset switches it off.
    await toggle(true);
    expect(load).toHaveBeenCalledTimes(1);
    reset();
    expect(ahl.el.proteinData).toBe(ahl.data);
    expect(ahl.el.distortions).toBeNull();
  });

  it('says when a file can’t be loaded and tries again next time', async () => {
    const load = vi
      .fn<[string], Promise<string>>()
      .mockRejectedValueOnce(new Error('404'))
      .mockResolvedValue(AHL_DEMO_DISTORTIONS);
    const { status, targets, toggle } = setup(['7ahl'], load);
    await toggle(true);
    expect(status.textContent).toBe('Couldn’t load 7AHL.');
    expect(targets[0].el.proteinData).toBe(targets[0].data);
    await toggle(false);
    await toggle(true);
    expect(load).toHaveBeenCalledTimes(2);
    expect(status.textContent).toBe('Shown for 7AHL, in MemProtMD’s frame.');
  });
});
