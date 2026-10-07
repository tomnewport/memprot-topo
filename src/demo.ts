import './index.js';
import { TopologyDisplay } from './components/topology-display.js';
import { proteins } from './demo-data.js';
import { mountDemoControls } from './demo-controls.js';

declare const __COMMIT__: string;
declare const __BUILD_DATE__: string;

function populate(elementId: string, pdbId: string): void {
  const el = document.getElementById(elementId);
  if (!(el instanceof TopologyDisplay)) return;
  const data = proteins[pdbId];
  if (data) el.proteinData = data;
}

document.addEventListener('DOMContentLoaded', () => {
  populate('td-3k19', '3k19');
  populate('td-2omf', '2omf');
  populate('td-7ahl', '7ahl');
  populate('td-2j1n', '2j1n');
  populate('td-5g53', '5g53');

  const panel = document.getElementById('controls');
  if (panel) {
    const displays = Array.from(document.querySelectorAll<HTMLElement>('topology-display'));
    const reset = mountDemoControls(panel, displays);
    document.getElementById('controls-reset')?.addEventListener('click', reset);
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
