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

  const buildInfo = document.getElementById('build-info');
  if (buildInfo) {
    buildInfo.textContent = `Built ${__BUILD_DATE__.slice(0, 10)} · ${__COMMIT__}`;
  }
});
