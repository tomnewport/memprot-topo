/**
 * Gallery screenshot script.
 *
 * Serves dist-demo/ on a local HTTP server, then uses Playwright to open
 * a self-contained page for each reference protein (using <topology-display>
 * with inline JSON data — no network fetching required).
 *
 * Screenshots are saved to gallery-output/current/{pdb-id}.png, with the
 * 3-D morph views (MORPH_VIEWS) alongside as {pdb-id}{suffix}.png and, when
 * ffmpeg can write WebP, the animated transition as {pdb-id}-morph.webp.
 */
import { chromium } from '@playwright/test';
import { GALLERY_PROTEINS, MORPH_ANIM, MORPH_VIEWS } from './gallery-data.mjs';
import { mkdir, mkdtemp, rm } from 'fs/promises';
import { existsSync, readFileSync, statSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { tmpdir } from 'os';
import { createServer } from 'http';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const DIST_DIR = join(ROOT, 'dist-demo');
const OUT_DIR = join(ROOT, 'gallery-output', 'current');

/** Frames per second of the transition animation. */
const ANIM_FPS = 15;

/** Whether ffmpeg is installed with its animated-WebP encoder. */
function canEncodeWebp() {
  try {
    const encoders = execFileSync('ffmpeg', ['-hide_banner', '-encoders'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString();
    return encoders.includes('libwebp_anim');
  } catch {
    return false;
  }
}

const easeInOut = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);

/**
 * Record the 2-D → 3-D transition of the displayed chain as a looping animated
 * WebP: hold in 2-D, roll up, turn once round, unroll. Uses a viewport of a
 * typical page width, so the 2-D strip scrolls as it does for users.
 */
async function recordTransition(page, outPath) {
  await page.setViewportSize({ width: 1000, height: 1300 });
  await page.waitForTimeout(150);
  const display = page.locator('topology-display');
  const scroll = page.locator('topology-display .svg-scroll');
  const setTau = (tau) => display.evaluate((e, t) => e.setMorphProgress(t), tau);

  // A fixed frame that holds both ends of the morph.
  let box = null;
  for (const tau of [0, 0.5, 1, 0]) {
    await setTau(tau);
    const b = await scroll.boundingBox();
    if (!b) continue;
    box = box
      ? {
          x: Math.min(box.x, b.x),
          y: Math.min(box.y, b.y),
          right: Math.max(box.right, b.x + b.width),
          bottom: Math.max(box.bottom, b.y + b.height),
        }
      : { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
  }
  if (!box) return false;
  const clip = {
    x: Math.floor(box.x),
    y: Math.floor(box.y),
    width: Math.ceil(box.right - box.x),
    height: Math.ceil(box.bottom - box.y),
  };

  const dir = await mkdtemp(join(tmpdir(), 'morph-anim-'));
  let n = 0;
  const frame = async () => {
    await page.screenshot({ path: join(dir, `f${String(n++).padStart(3, '0')}.png`), clip });
  };
  const hold = async (seconds) => {
    for (let i = 0; i < Math.round(seconds * ANIM_FPS); i++) await frame();
  };
  try {
    await hold(0.6);
    const roll = Math.round(2.8 * ANIM_FPS); // the component's own duration
    for (let i = 1; i <= roll; i++) {
      await setTau(easeInOut(i / roll));
      await frame();
    }
    await hold(0.6);
    // One turn round with the arrow keys (0.1 rad a press).
    await page.focus('topology-display .svg-scroll svg');
    for (let i = 0; i < 31; i++) {
      for (let k = 0; k < 2; k++) await page.keyboard.press('ArrowLeft');
      await frame();
    }
    await hold(0.6);
    const unroll = Math.round(2 * ANIM_FPS);
    for (let i = 1; i <= unroll; i++) {
      await setTau(1 - easeInOut(i / unroll));
      await frame();
    }
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-framerate',
        String(ANIM_FPS),
        '-i',
        join(dir, 'f%03d.png'),
        '-vf',
        'scale=800:-2:flags=lanczos',
        '-c:v',
        'libwebp_anim',
        '-quality',
        '75',
        '-compression_level',
        '4',
        '-loop',
        '0',
        outPath,
      ],
      { stdio: 'inherit' },
    );
    return true;
  } finally {
    await rm(dir, { recursive: true, force: true });
    await setTau(0);
    await page.setViewportSize({ width: 1800, height: 600 });
  }
}

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
  const animate = canEncodeWebp();
  if (!animate) console.warn('ffmpeg with WebP not found: skipping the transition animations.');

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

    // The 2-D → 3-D morph, halfway and finished.
    for (const view of MORPH_VIEWS) {
      await el.evaluate((e, tau) => e.setMorphProgress(tau), view.tau);
      await page.waitForTimeout(100);
      const morphPath = join(OUT_DIR, `${protein.pdbId}${view.suffix}.png`);
      await el.screenshot({ path: morphPath });
      console.log(`  Saved: ${morphPath}`);
    }

    if (animate) {
      await el.evaluate((e) => e.setMorphProgress(0));
      const animPath = join(OUT_DIR, `${protein.pdbId}${MORPH_ANIM.suffix}`);
      if (await recordTransition(page, animPath)) console.log(`  Saved: ${animPath}`);
    }
  }

  await browser.close();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
