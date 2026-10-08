/**
 * Demo: MemProtMD bilayer-distortions files for the demo proteins (#24).
 *
 * The demo's structures are OPM's, but a distortions file is in the frame of
 * MemProtMD's simulation, which places the membrane differently (for the five
 * demo proteins its midplane sits 0.5–11.4 Å from OPM's along the normal, and
 * its normal is 1–9.6° off OPM's). So a structure is first moved into the
 * simulation's frame, with the rigid transform that superposes it on
 * MemProtMD's own model (`scripts/register-memprotmd.ts`). Proteins without
 * one are left as they are. The files are thinned copies
 * (`scripts/thin-distortions.mjs`).
 */
import type { TopologyDisplay } from './components/topology-display.js';
import type { ProteinData } from './types.js';

/** Rigid transform into a MemProtMD simulation's frame: x′ = rotation · x + translation. */
export interface Registration {
  rotation: number[][];
  translation: number[];
  /** Cα RMSD (Å) of the superposition it came from. */
  rmsd: number;
  /** MemProtMD model it was superposed on. */
  source: string;
}

export interface DemoDistortions {
  /**
   * Where the (thinned) `<pdb>_default_dppc-distortions.pdb` is served.
   * Resolved only when needed: the gallery inlines the demo's script into a
   * page with no base URL, where resolving it would throw.
   */
  url: () => string;
  /** How the demo's OPM structure lines up with it; absent = not yet known. */
  registration?: Registration;
}

export const DEMO_DISTORTIONS: Record<string, DemoDistortions> = {
  '2j1n': {
    url: () => new URL('../demo/distortions/2j1n.pdb', import.meta.url).href,
    registration: {
      rotation: [
        [0.480728, 0.87672, 0.016205],
        [-0.876797, 0.480844, -0.004012],
        [-0.011309, -0.01228, 0.999861],
      ],
      translation: [75.342673, 79.441951, 60.334653],
      rmsd: 0.121,
      source: '2j1n_default_dppc head contacts (1038 Cα)',
    },
  },
  '2omf': {
    url: () => new URL('../demo/distortions/2omf.pdb', import.meta.url).href,
    registration: {
      rotation: [
        [0.150844, -0.988477, 0.01264],
        [0.988494, 0.150677, -0.013239],
        [0.011181, 0.014492, 0.999832],
      ],
      translation: [65.922312, 56.887071, 49.196959],
      rmsd: 0.204,
      source: '2omf_default_dppc head contacts (1020 Cα)',
    },
  },
  '3k19': {
    url: () => new URL('../demo/distortions/3k19.pdb', import.meta.url).href,
    registration: {
      rotation: [
        [-0.863634, -0.503864, -0.016041],
        [0.504061, -0.863582, -0.01223],
        [-0.00769, -0.018648, 0.999797],
      ],
      translation: [74.764384, 77.767787, 56.502292],
      rmsd: 0.174,
      source: '3k19_default_dppc head contacts (1020 Cα)',
    },
  },
  '5g53': {
    url: () => new URL('../demo/distortions/5g53.pdb', import.meta.url).href,
    registration: {
      rotation: [
        [-0.862579, 0.478268, 0.164978],
        [-0.488386, -0.872275, -0.024791],
        [0.13205, -0.101958, 0.985986],
      ],
      translation: [61.210348, 55.185245, 90.056628],
      rmsd: 0.364,
      source: '5g53_default_dppc head contacts (479 Cα)',
    },
  },
  '7ahl': {
    url: () => new URL('../demo/distortions/7ahl.pdb', import.meta.url).href,
    registration: {
      rotation: [
        [-0.246532, 0.96296, 0.109224],
        [-0.969115, -0.244239, -0.034108],
        [-0.006168, -0.11426, 0.993432],
      ],
      translation: [69.634687, 78.785945, 49.361983],
      rmsd: 0.349,
      source: '7ahl_default_dppc head contacts (2051 Cα)',
    },
  },
};

/** A copy of `data` with every Cα moved by `reg`. */
export function inSimulationFrame(data: ProteinData, reg: Registration): ProteinData {
  const [r0, r1, r2] = reg.rotation;
  const [tx, ty, tz] = reg.translation;
  return {
    ...data,
    chains: data.chains.map((chain) => ({
      ...chain,
      calphas: chain.calphas.map((c) => ({
        ...c,
        x: r0[0] * c.x + r0[1] * c.y + r0[2] * c.z + tx,
        y: r1[0] * c.x + r1[1] * c.y + r1[2] * c.z + ty,
        z: r2[0] * c.x + r2[1] * c.y + r2[2] * c.z + tz,
      })),
    })),
  };
}

export interface DistortionsTarget {
  pdbId: string;
  el: TopologyDisplay;
  /** The display's own (OPM) data, restored when distortions are switched off. */
  data: ProteinData;
}

const fetchText = async (url: string): Promise<string> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.text();
};

const label = (ids: string[]): string => {
  const names = ids.map((id) => id.toUpperCase());
  return names.length < 2
    ? names.join('')
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
};

/**
 * Wire a checkbox that loads each target's distortions file and moves its
 * structure into the simulation's frame, or puts both back. Returns a reset
 * that unchecks it.
 */
export function mountDistortionsToggle(
  input: HTMLInputElement,
  status: HTMLElement,
  targets: DistortionsTarget[],
  load: (url: string) => Promise<string> = fetchText,
): () => void {
  const texts = new Map<string, Promise<string>>();
  const usable = targets.filter((t) => DEMO_DISTORTIONS[t.pdbId]?.registration);
  const waiting = targets.filter((t) => !usable.includes(t)).map((t) => t.pdbId);
  let generation = 0;

  const off = (): void => {
    generation++;
    for (const t of usable) {
      t.el.distortions = null;
      t.el.proteinData = t.data;
    }
    status.textContent = '';
  };

  const on = async (): Promise<void> => {
    const gen = ++generation;
    status.textContent = 'Loading…';
    const failed: string[] = [];
    await Promise.all(
      usable.map(async (t) => {
        const { registration } = DEMO_DISTORTIONS[t.pdbId];
        const url = DEMO_DISTORTIONS[t.pdbId].url();
        if (!texts.has(url)) texts.set(url, load(url));
        let text: string;
        try {
          text = await texts.get(url)!;
        } catch {
          texts.delete(url);
          failed.push(t.pdbId);
          return;
        }
        if (gen !== generation) return;
        // Move the structure first, so it is never drawn against a file it
        // doesn't line up with.
        t.el.proteinData = inSimulationFrame(t.data, registration!);
        t.el.distortions = text;
      }),
    );
    if (gen !== generation) return;
    const shown = usable.map((t) => t.pdbId).filter((id) => !failed.includes(id));
    const parts: string[] = [];
    if (shown.length) parts.push(`Shown for ${label(shown)}, in MemProtMD’s frame.`);
    if (failed.length) parts.push(`Couldn’t load ${label(failed)}.`);
    if (waiting.length) {
      parts.push(`${label(waiting)} need MemProtMD’s coordinates to line up, so are unchanged.`);
    }
    status.textContent = parts.join(' ');
  };

  input.addEventListener('change', () => {
    if (input.checked) void on();
    else off();
  });

  return () => {
    if (!input.checked) return;
    input.checked = false;
    off();
  };
}
