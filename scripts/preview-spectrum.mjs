/**
 * Screenshots (or a video) of the Sequence → Topology → Structure spectrum,
 * from the gallery data (run `npm run prebuild:gallery` first).
 *
 *   node scripts/preview-spectrum.mjs <pdbId> <outPrefix> [positions 0–2...]
 *
 * Env: W / H viewport, TRACKS=1 (hydropathy lane), COLOURS=1 (residue colours),
 * THEME, VIDEO=<dir> with SEQ=0,2,0 (views to animate to), RESIZE=500,1300
 * (sequence view re-wrapped at each body width).
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { build } from 'esbuild';
const repo = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const tmp = mkdtempSync(join(tmpdir(), 'spectrum-'));
const [pdbId, out, ...pos] = process.argv.slice(2);
const positions = pos.length ? pos.map(Number) : [0, 0.25, 0.5, 0.75, 1];
const all = JSON.parse(readFileSync(`${repo}/scripts/gallery-prebuilt-data.json`, 'utf8'));
const data = all[pdbId];
const width = Number(process.env.W || 900);
const entry = `
import '${repo}/src/index.ts';
import { TopologyDisplay } from '${repo}/src/components/topology-display.ts';
import { KYTE_DOOLITTLE, oneLetter } from '${repo}/src/sequence/amino-acids.ts';
window.__render = (data, opts) => {
  const el = new TopologyDisplay();
  el.id = 'td';
  if (opts.theme) el.setAttribute('theme', opts.theme);
  document.body.appendChild(el);
  el.proteinData = data;
  if (opts.tracks) {
    const values = {};
    for (const c of data.chains) {
      const v = {};
      const codes = c.calphas.map((a) => oneLetter(a.resName));
      c.calphas.forEach((a, i) => {
        let s = 0, n = 0;
        for (let k = i - 4; k <= i + 4; k++) { const h = KYTE_DOOLITTLE[codes[k]]; if (h !== undefined) { s += h; n++; } }
        if (n) v[a.resSeq] = s / n;
      });
      values[c.chainId] = v;
    }
    el.sequenceTracks = [{ label: 'Hydropathy', values, type: 'line' }];
  }
  if (opts.colours) {
    const cols = {};
    for (const c of data.chains) { const v = {}; c.calphas.forEach((a) => v[a.resSeq] = oneLetter(a.resName)); cols[c.chainId] = v; }
    el.residueColours = cols;
  }
};
`;
writeFileSync(`${tmp}/entry.ts`, entry);
const result = await build({
  entryPoints: [`${tmp}/entry.ts`],
  bundle: true,
  format: 'iife',
  write: false,
  absWorkingDir: repo,
  define: { __COMMIT__: '"dev"', __BUILD_DATE__: '"2026-01-01"' },
});
const js = result.outputFiles[0].text;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const video = process.env.VIDEO;
const ctx = await browser.newContext({
  viewport: { width: width + 40, height: Number(process.env.H || 900) },
  deviceScaleFactor: video ? 1 : 2,
  ...(video
    ? {
        recordVideo: {
          dir: video,
          size: { width: width + 40, height: Number(process.env.H || 900) },
        },
      }
    : {}),
});
const page = await ctx.newPage();
page.on('console', (m) => console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.setContent(
  `<html><body style="margin:0;padding:10px;width:${width}px;background:${process.env.THEME === 'dark' ? '#111' : '#fff'}"></body></html>`,
);
await page.addScriptTag({ content: js });
await page.evaluate(
  ([d, o]) => window.__render(d, o),
  [
    data,
    { tracks: !!process.env.TRACKS, colours: !!process.env.COLOURS, theme: process.env.THEME },
  ],
);
await page.waitForTimeout(300);
if (video) {
  const seq = (process.env.SEQ || '0,2,0').split(',').map(Number);
  await page.evaluate(() => document.getElementById('td').setViewPosition(1));
  await page.waitForTimeout(600);
  for (const v of seq) {
    await page.evaluate((v) => document.getElementById('td').goToView(v), v);
    await page.waitForTimeout(v === 2 || v === 1 ? 3600 : 2800);
    await page.waitForTimeout(800);
  }
  await ctx.close();
} else if (process.env.RESIZE) {
  // Sequence view at each body width in turn (checks the re-wrap).
  await page.evaluate(() => document.getElementById('td').setViewPosition(0));
  for (const w of process.env.RESIZE.split(',').map(Number)) {
    await page.evaluate((w) => (document.body.style.width = `${w}px`), w);
    await page.waitForTimeout(200);
    const perRow = await page.evaluate(
      () => document.getElementById('td')._seq.renderer.sequenceLayout.perRow,
    );
    console.log(`width ${w}: ${perRow} per row`);
    await (await page.$('#td')).screenshot({ path: `${out}-w${w}.png` });
  }
} else {
  for (const p of positions) {
    await page.evaluate((p) => document.getElementById('td').setViewPosition(p), p);
    await page.waitForTimeout(p > 1 ? 800 : 100);
    const box = await page.$('#td');
    await box.screenshot({ path: `${out}-${String(p).replace('.', '_')}.png` });
  }
}
await browser.close();
