/**
 * Generate a comparison HTML report from gallery screenshots.
 *
 * Reads:
 *   gallery-output/current/   — screenshots from this branch
 *   gallery-output/previous/  — screenshots from the base branch (may not exist)
 *
 * Writes:
 *   gallery-output/index.html — comparison report
 */
import { mkdir, writeFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { GALLERY_PROTEINS } from './gallery-data.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const CURRENT_DIR = join(ROOT, 'gallery-output', 'current');
const PREV_DIR = join(ROOT, 'gallery-output', 'previous');
const OUT_HTML = join(ROOT, 'gallery-output', 'index.html');

const TODAY = new Date().toISOString().slice(0, 10);

function imgTag(path, alt) {
  return `<img src="${path}" alt="${alt}" style="max-width:100%;border:1px solid #dee2e6;border-radius:4px;" />`;
}

function placeholder(text) {
  return `<div style="display:flex;align-items:center;justify-content:center;height:120px;background:#f8f9fa;border:1px dashed #adb5bd;border-radius:4px;color:#6c757d;font-size:0.85rem;">${text}</div>`;
}

async function main() {
  await mkdir(join(ROOT, 'gallery-output'), { recursive: true });

  const hasPrev = existsSync(PREV_DIR);
  const hasNoPrevMarker = existsSync(join(PREV_DIR, 'no-base.txt'));

  const rows = GALLERY_PROTEINS.map((protein) => {
    const currentFile = `current/${protein.pdbId}.png`;
    const prevFile = `previous/${protein.pdbId}.png`;

    const currentExists = existsSync(join(ROOT, 'gallery-output', currentFile));
    const prevExists =
      hasPrev && !hasNoPrevMarker && existsSync(join(ROOT, 'gallery-output', prevFile));

    const currentCell = currentExists
      ? imgTag(currentFile, `${protein.pdbId} current`)
      : placeholder('Not generated');

    const prevCell = prevExists
      ? imgTag(prevFile, `${protein.pdbId} previous`)
      : placeholder(hasNoPrevMarker ? 'No baseline' : 'Not available');

    return `
    <tr>
      <td style="padding:0.75rem;font-weight:500;vertical-align:top;white-space:nowrap;">
        ${protein.label}<br/>
        <code style="font-size:0.8rem;color:#6c757d;">${protein.pdbId.toUpperCase()}</code>
      </td>
      <td style="padding:0.75rem;vertical-align:top;">${prevCell}</td>
      <td style="padding:0.75rem;vertical-align:top;">${currentCell}</td>
    </tr>`;
  }).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MemProt2D Gallery Report — ${TODAY}</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8f9fa;
      color: #212529;
      line-height: 1.5;
    }
    header {
      background: #1a1a2e;
      color: #fff;
      padding: 1.25rem 2rem;
    }
    header h1 { margin: 0 0 0.2rem; font-size: 1.4rem; }
    header p { margin: 0; opacity: 0.7; font-size: 0.9rem; }
    main { padding: 2rem; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
    }
    thead th {
      background: #e9ecef;
      padding: 0.75rem;
      text-align: left;
      font-size: 0.9rem;
      font-weight: 600;
      border-bottom: 2px solid #dee2e6;
    }
    tbody tr:not(:last-child) td { border-bottom: 1px solid #f1f3f5; }
    tbody tr:hover { background: #f8f9fa; }
    code { font-family: monospace; }
  </style>
</head>
<body>
  <header>
    <h1>MemProt2D Gallery Report</h1>
    <p>Generated: ${TODAY}</p>
  </header>
  <main>
    <table>
      <thead>
        <tr>
          <th style="width:200px;">Protein</th>
          <th>Previous (base branch)</th>
          <th>Current (this branch)</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </main>
</body>
</html>`;

  await writeFile(OUT_HTML, html, 'utf-8');
  console.log('Gallery report written to', OUT_HTML);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
