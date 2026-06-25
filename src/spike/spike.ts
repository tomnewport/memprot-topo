/**
 * Spike entry (THROWAWAY — Phase 0 of issue #22). Wires a protein picker, a
 * morph slider and a play button to the Three.js view.
 */
import { spikeProteins } from './spike-data.js';
import { buildScene } from './scene.js';
import { SpikeView } from './three-view.js';

const TARGETS: { id: string; chain: string; kind: 'helical' | 'barrel'; label: string }[] = [
  { id: '5g53', chain: 'A', kind: 'helical', label: 'A2A receptor (5G53) — 7TM helical' },
  { id: '2j1n', chain: 'A', kind: 'barrel', label: 'OmpC (2J1N) — 16-strand β-barrel' },
];

const stage = document.getElementById('stage') as HTMLElement;
const picker = document.getElementById('picker') as HTMLSelectElement;
const slider = document.getElementById('morph') as HTMLInputElement;
const playBtn = document.getElementById('play') as HTMLButtonElement;

const view = new SpikeView(stage);

for (const t of TARGETS) {
  const opt = document.createElement('option');
  opt.value = `${t.id}:${t.chain}`;
  opt.textContent = t.label;
  picker.appendChild(opt);
}

function load(): void {
  const [id, chainId] = picker.value.split(':');
  const target = TARGETS.find((t) => t.id === id)!;
  const protein = spikeProteins[id];
  const chain = protein?.chains.find((c) => c.chainId === chainId) ?? protein?.chains[0];
  if (!chain) return;
  view.setScene(buildScene(chain, target.kind));
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
