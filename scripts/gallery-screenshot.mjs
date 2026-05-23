/**
 * Gallery screenshot script.
 *
 * Serves dist-demo/ on a local HTTP server, then uses Playwright to open
 * a self-contained page for each reference protein (using <topology-display>
 * with inline JSON data — no network fetching required).
 *
 * Screenshots are saved to gallery-output/current/{pdb-id}.png.
 */
import { chromium } from '@playwright/test';
import { GALLERY_PROTEINS } from './gallery-data.mjs';
import { mkdir } from 'fs/promises';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { createServer } from 'http';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST_DIR = join(ROOT, 'dist-demo');
const OUT_DIR = join(ROOT, 'gallery-output', 'current');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Start a simple static file server serving files from `dir`.
 * Returns { server, port }.
 */
function startServer(dir, port) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';

      const filePath = join(dir, urlPath);

      if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + urlPath);
        return;
      }

      const ext = extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(readFileSync(filePath));
    });

    server.on('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({ server, port }));
  });
}

/**
 * Find the built JS bundle in dist-demo/assets/.
 * Returns file contents as a string.
 */
function readBuiltBundle() {
  const assetsDir = join(DIST_DIR, 'assets');
  if (!existsSync(assetsDir)) {
    throw new Error(`dist-demo/assets/ not found. Run npm run build:demo first.`);
  }
  const files = readdirSync(assetsDir);
  const jsFile = files.find((f) => f.endsWith('.js') && !f.endsWith('.map'));
  if (!jsFile) {
    throw new Error(`No JS bundle found in dist-demo/assets/. Files: ${files.join(', ')}`);
  }
  return readFileSync(join(assetsDir, jsFile), 'utf-8');
}

/**
 * Build a self-contained HTML page that renders a <topology-display>
 * element with the given protein data. The JS bundle is inlined so no
 * network requests are needed.
 */
function buildGalleryHtml(jsContent, protein) {
  const dataJson = JSON.stringify(protein.data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Gallery: ${protein.label}</title>
  <style>
    body { margin: 16px; font-family: sans-serif; background: #fff; }
    h2 { font-size: 1rem; color: #495057; margin: 0 0 0.75rem; }
  </style>
  <script type="module">
${jsContent}
  </script>
</head>
<body>
  <h2>${protein.label} (${protein.pdbId.toUpperCase()})</h2>
  <topology-display id="display"></topology-display>
  <script type="module">
    // Wait for custom elements to be defined before setting data
    customElements.whenDefined('topology-display').then(() => {
      const el = document.getElementById('display');
      el.setAttribute('protein-data', ${JSON.stringify(dataJson)});
      document.body.dataset.ready = 'true';
    });
  </script>
</body>
</html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Reading built JS bundle...');
  const jsContent = readBuiltBundle();

  const browser = await chromium.launch();
  const page = await browser.newPage();
  // Viewport wide enough to fit the natural-width unrolled SVGs of long
  // β-barrels (~1500 user units) without horizontal scroll, so element.screenshot()
  // captures the full diagram rather than a cropped portion.
  await page.setViewportSize({ width: 1800, height: 600 });

  for (const protein of GALLERY_PROTEINS) {
    console.log(`Screenshotting ${protein.pdbId}...`);
    const html = buildGalleryHtml(jsContent, protein);

    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Wait until the component signals it is ready
    await page.waitForFunction(() => document.body.dataset.ready === 'true', {
      timeout: 10_000,
    });

    // Give the shadow DOM a moment to paint
    await page.waitForTimeout(200);

    const el = await page.$('topology-display');
    if (!el) throw new Error(`topology-display not found for ${protein.pdbId}`);

    const outPath = join(OUT_DIR, `${protein.pdbId}.png`);
    await el.screenshot({ path: outPath });
    console.log(`  Saved: ${outPath}`);
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
