import './index.js';
import { TopologyDisplay } from './components/topology-display.js';
import { proteins } from './demo-data.js';
import { mountDemoControls } from './demo-controls.js';
import { mountDistortionsToggle, type DistortionsTarget } from './demo-distortions.js';
import { KYTE_DOOLITTLE, oneLetter } from './sequence/amino-acids.js';
import type { ProteinData } from './types.js';

/** Kyte–Doolittle hydropathy, averaged over a 9-residue window: a sample sequence-view lane. */
function hydropathy(data: ProteinData): Record<string, Record<number, number>> {
  const out: Record<string, Record<number, number>> = {};
  for (const chain of data.chains) {
    const codes = chain.calphas.map((c) => oneLetter(c.resName));
    const values: Record<number, number> = {};
    chain.calphas.forEach((c, i) => {
      const window = codes.slice(Math.max(0, i - 4), i + 5).map((a) => KYTE_DOOLITTLE[a]);
      const known = window.filter((v): v is number => v !== undefined);
      if (known.length > 0) values[c.resSeq] = known.reduce((a, b) => a + b, 0) / known.length;
    });
    out[chain.chainId] = values;
  }
  return out;
}

declare const __COMMIT__: string;
declare const __BUILD_DATE__: string;

function populate(elementId: string, pdbId: string): DistortionsTarget | null {
  const el = document.getElementById(elementId);
  if (!(el instanceof TopologyDisplay)) return null;
  const data = proteins[pdbId];
  if (!data) return null;
  el.proteinData = data;
  el.sequenceTracks = [
    {
      label: 'Hydropathy',
      values: hydropathy(data),
      // Hydrophilic blue → hydrophobic orange (Kyte–Doolittle, ±4.5).
      scale: ['#2166ac', '#f7f7f7', '#d6604d'],
      domain: [-3, 3],
    },
  ];
  return { pdbId, el, data };
}

document.addEventListener('DOMContentLoaded', () => {
  const targets = [
    populate('td-3k19', '3k19'),
    populate('td-2omf', '2omf'),
    populate('td-7ahl', '7ahl'),
    populate('td-2j1n', '2j1n'),
    populate('td-5g53', '5g53'),
  ].filter((t): t is DistortionsTarget => t !== null);

  const toggle = document.getElementById('distortions');
  const status = document.getElementById('distortions-status');
  const resetDistortions =
    toggle instanceof HTMLInputElement && status
      ? mountDistortionsToggle(toggle, status, targets)
      : () => {};

  const panel = document.getElementById('controls');
  if (panel) {
    const displays = Array.from(document.querySelectorAll<HTMLElement>('topology-display'));
    const reset = mountDemoControls(panel, displays);
    document.getElementById('controls-reset')?.addEventListener('click', () => {
      reset();
      resetDistortions();
    });
  }

  // The page follows the diagrams' theme (#26).
  const markTheme = (): void => {
    const first = document.querySelector('topology-display');
    const bg = first instanceof TopologyDisplay ? first.activeTheme.background : '#fff';
    // Dark when the diagram's background is (a #rrggbb) below mid-grey.
    const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(bg);
    const dark = !!m && m.slice(1).reduce((sum, h) => sum + parseInt(h, 16), 0) < 3 * 128;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  };
  document.addEventListener('theme-change', markTheme);
  markTheme();

  const buildInfo = document.getElementById('build-info');
  if (buildInfo) {
    buildInfo.textContent = `Built ${__BUILD_DATE__.slice(0, 10)} · ${__COMMIT__}`;
  }
});
