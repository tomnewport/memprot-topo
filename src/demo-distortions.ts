/**
 * Demo: MemProtMD bilayer-distortions files for the demo proteins (#24).
 *
 * The demo's structures are OPM's, but a distortions file is in the frame of
 * MemProtMD's simulation, which places the membrane differently (for 7AHL its
 * midplane is 11 Å lower on the protein and its normal 6.6° off OPM's). So a
 * structure is first moved into the simulation's frame, with the rigid
 * transform that superposes it on MemProtMD's own model
 * (`scripts/register-memprotmd.ts`). Proteins without one are left as they
 * are. The files are thinned copies (`scripts/thin-distortions.mjs`).
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
  '2j1n': { url: () => new URL('../demo/distortions/2j1n.pdb', import.meta.url).href },
  '2omf': { url: () => new URL('../demo/distortions/2omf.pdb', import.meta.url).href },
  '3k19': { url: () => new URL('../demo/distortions/3k19.pdb', import.meta.url).href },
  '5g53': { url: () => new URL('../demo/distortions/5g53.pdb', import.meta.url).href },
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
