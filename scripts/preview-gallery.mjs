/**
 * Offline gallery preview: render each protein in GALLERY_PROTEINS through
 * the TopologyDisplay component (via jsdom) and write the resulting SVGs to
 * disk so we can eyeball them without Chromium / Playwright.
 *
 * Run: node scripts/preview-gallery.mjs
 */
import { writeFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { GALLERY_PROTEINS } from './gallery-data.mjs';

async function main() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>');
  const g = globalThis;
  g.window = dom.window;
  g.document = dom.window.document;
  g.HTMLElement = dom.window.HTMLElement;
  g.customElements = dom.window.customElements;

  // Build the TS source via tsx so we can load it from a .mjs entrypoint.
  const { register } = await import('tsx/esm/api');
  register();
  const mod = await import('../src/components/topology-display.ts');
  const { TopologyDisplay } = mod;

  for (const protein of GALLERY_PROTEINS) {
    const el = new TopologyDisplay();
    dom.window.document.getElementById('root').appendChild(el);
    el.proteinData = protein.data;
    const svg = el.shadowRoot.querySelector('svg');
    if (!svg) {
      console.log(`${protein.pdbId}: NO SVG (placeholder?)`);
      continue;
    }
    writeFileSync(`./preview-gallery-${protein.pdbId}.svg`, svg.outerHTML);
    console.log(`Wrote preview-gallery-${protein.pdbId}.svg (${svg.outerHTML.length} bytes)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
