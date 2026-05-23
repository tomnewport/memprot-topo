import './index.js';
import { TopologyDisplay } from './components/topology-display.js';
import { proteins } from './demo-data.js';

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
});
