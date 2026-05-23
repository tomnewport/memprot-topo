/**
 * Offline preview of the chain picker with a multi-chain synthetic protein
 * (TM bundle + soluble fusion partner). Writes preview-picker.png.
 */
import { writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';

async function main() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
  const g = globalThis;
  g.window = dom.window;
  g.document = dom.window.document;
  g.HTMLElement = dom.window.HTMLElement;
  g.customElements = dom.window.customElements;

  const { register } = await import('tsx/esm/api');
  register();
  const { TopologyDisplay } = await import('../src/components/topology-display.ts');

  const tmCalphas = [];
  const tmSegments = [];
  let res = 1;
  for (let h = 0; h < 7; h++) {
    const theta = (h * 2 * Math.PI) / 7;
    const cx = 8 * Math.cos(theta);
    const cy = 8 * Math.sin(theta);
    const goingUp = h % 2 === 0;
    const z0 = goingUp ? -18 : 18;
    const z1 = goingUp ? 18 : -18;
    const len = 24;
    tmSegments.push({ start: res, end: res + len - 1, type: 'helix' });
    for (let i = 0; i < len; i++) {
      const t = i / (len - 1);
      const rotation = (i * 2 * Math.PI) / 3.6;
      tmCalphas.push({
        resSeq: res + i,
        iCode: '',
        x: cx + 2.3 * Math.cos(theta + rotation),
        y: cy + 2.3 * Math.sin(theta + rotation),
        z: z0 + t * (z1 - z0),
      });
    }
    res += len;
    if (h < 6) {
      for (let i = 0; i < 6; i++) {
        tmCalphas.push({
          resSeq: res + i,
          iCode: '',
          x: 0,
          y: 0,
          z: (goingUp ? 22 : -22) + Math.sin(((i + 1) * Math.PI) / 7) * 4,
        });
      }
      res += 6;
    }
  }

  const protein = {
    pdbId: 'fusion',
    chains: [
      { chainId: 'A', residueCount: tmCalphas.length, segments: tmSegments, calphas: tmCalphas },
      {
        chainId: 'S',
        residueCount: 60,
        segments: [
          { start: 1, end: 12, type: 'helix' },
          { start: 18, end: 26, type: 'strand' },
          { start: 32, end: 40, type: 'strand' },
          { start: 46, end: 56, type: 'helix' },
        ],
        calphas: Array.from({ length: 60 }, (_, i) => ({
          resSeq: i + 1,
          iCode: '',
          x: i * 0.5,
          y: 0,
          z: 30 + 4 * Math.sin(i / 3),
        })),
      },
    ],
  };

  const el = new TopologyDisplay();
  dom.window.document.getElementById('root').appendChild(el);
  el.proteinData = protein;

  const shadow = el.shadowRoot;
  console.log('Violins:', shadow.querySelectorAll('.chain-violin').length);
  console.log(
    'Selected aria-label:',
    shadow.querySelector('.chain-violin.selected')?.getAttribute('aria-label'),
  );
  console.log('Main chain label:', shadow.querySelector('.chain-label')?.textContent);

  const picker = shadow.querySelector('.chain-picker');
  const mainSvg = shadow.querySelector('.svg-scroll svg');
  const mainW = parseFloat(mainSvg.getAttribute('width'));
  const mainH = parseFloat(mainSvg.getAttribute('height'));

  // Compose a single illustrative SVG: picker row on top, main SVG below.
  const violins = picker.querySelectorAll('.chain-violin');
  const violinW = 64;
  const violinH = 180;
  const labelH = 30;
  const gap = 12;
  const pickerH = violinH + labelH;
  const totalW = Math.max(mainW, violins.length * (violinW + gap) + gap);
  const totalH = pickerH + 20 + mainH + 20;

  let combined = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}">`;
  combined += `<rect width="${totalW}" height="${totalH}" fill="#fafafa"/>`;
  let x = gap;
  for (const violin of violins) {
    const sel = violin.classList.contains('selected');
    const aria = violin.getAttribute('aria-label') ?? '';
    const id = aria.match(/chain (\w)/)?.[1] ?? '?';
    if (sel) {
      combined += `<rect x="${x - 4}" y="6" width="${violinW + 8}" height="${pickerH + 4}" fill="#e6f2ff" stroke="#1f77b4" stroke-width="1.5" rx="4"/>`;
    }
    const innerSvg = violin.querySelector('svg');
    combined += `<g transform="translate(${x},10)">${innerSvg.innerHTML}</g>`;
    combined += `<text x="${x + violinW / 2}" y="${10 + violinH + 18}" text-anchor="middle" font-family="monospace" font-size="11" fill="#333">${id}</text>`;
    x += violinW + gap;
  }
  combined += `<g transform="translate(20, ${pickerH + 30})">${mainSvg.innerHTML}</g>`;
  combined += `</svg>`;

  writeFileSync('./preview-picker.svg', combined);
  const png = new Resvg(combined).render().asPng();
  writeFileSync('./preview-picker.png', png);
  console.log('Wrote preview-picker.png (' + totalW.toFixed(0) + 'x' + totalH.toFixed(0) + ')');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
