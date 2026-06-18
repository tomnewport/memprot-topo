/**
 * Phase 2 verification demo: render real proteins through the PRODUCTION
 * pipeline — `buildScene()` → `TopologyView3D` — to confirm the 3-D renderer
 * consumes the topology scene correctly. Throwaway, like the spike.
 */
import { spikeProteins } from '../spike/spike-data.js';
import { buildScene } from '../scene/build.js';
import { TopologyView3D } from './topology-view.js';

const TARGETS = [
  { id: '5g53', chain: 'A', label: 'A2A receptor (5G53) — 7TM helical' },
  { id: '2j1n', chain: 'A', label: 'OmpC (2J1N) — 16-strand β-barrel' },
];

const stage = document.getElementById('stage') as HTMLElement;
const picker = document.getElementById('picker') as HTMLSelectElement;
const slider = document.getElementById('morph') as HTMLInputElement;
const playBtn = document.getElementById('play') as HTMLButtonElement;

const view = new TopologyView3D(stage);

for (const t of TARGETS) {
  const opt = document.createElement('option');
  opt.value = `${t.id}:${t.chain}`;
  opt.textContent = t.label;
  picker.appendChild(opt);
}

function load(): void {
  const [id, chainId] = picker.value.split(':');
  const protein = spikeProteins[id];
  const chain = protein?.chains.find((c) => c.chainId === chainId) ?? protein?.chains[0];
  if (!chain) return;
  view.setScene(buildScene(chain));
  view.setT(Number(slider.value));
}

let playing = false;
let raf = 0;
let dir = 1;
function tick(): void {
  let v = Number(slider.value) + dir * 0.006;
  if (v >= 1) {
    v = 1;
    dir = -1;
  } else if (v <= 0) {
    v = 0;
    dir = 1;
  }
  slider.value = String(v);
  view.setT(v);
  if (playing) raf = requestAnimationFrame(tick);
}

playBtn.addEventListener('click', () => {
  playing = !playing;
  playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
  if (playing) raf = requestAnimationFrame(tick);
  else cancelAnimationFrame(raf);
});
slider.addEventListener('input', () => view.setT(Number(slider.value)));
picker.addEventListener('change', load);
load();
