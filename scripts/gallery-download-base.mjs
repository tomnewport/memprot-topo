/**
 * Download the latest gallery artifact from the base branch (for PR comparisons).
 *
 * Required env vars:
 *   GITHUB_TOKEN  — GitHub Actions token
 *   BASE_REF      — base branch name (e.g. "main")
 *   REPO          — repository in "owner/repo" format
 *
 * On success: extracts gallery PNGs to gallery-output/previous/
 * On failure / no artifact: creates gallery-output/previous/ with a no-base.txt marker
 */
import { mkdir, writeFile } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { resolve } from 'path';
import { pipeline } from 'stream/promises';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '..');
const PREV_DIR = join(ROOT, 'gallery-output', 'previous');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const BASE_REF = process.env.BASE_REF;
const REPO = process.env.REPO;

async function githubFetch(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API ${path} -> ${res.status}: ${body}`);
  }
  return res.json();
}

async function noBaseline(reason) {
  await mkdir(PREV_DIR, { recursive: true });
  await writeFile(join(PREV_DIR, 'no-base.txt'), reason + '\n', 'utf-8');
  console.log('No baseline available:', reason);
}

async function main() {
  await mkdir(PREV_DIR, { recursive: true });

  if (!GITHUB_TOKEN || !BASE_REF || !REPO) {
    await noBaseline('Missing GITHUB_TOKEN, BASE_REF, or REPO env vars');
    return;
  }

  console.log(`Looking for gallery artifact on branch: ${BASE_REF}`);

  // List workflow runs for the gallery workflow on the base branch
  let runs;
  try {
    const data = await githubFetch(
      `/repos/${REPO}/actions/workflows/gallery.yml/runs?branch=${encodeURIComponent(BASE_REF)}&status=success&per_page=5`,
    );
    runs = data.workflow_runs ?? [];
  } catch (err) {
    await noBaseline(`Failed to list workflow runs: ${err.message}`);
    return;
  }

  if (runs.length === 0) {
    await noBaseline(`No successful gallery runs found on branch ${BASE_REF}`);
    return;
  }

  const latestRun = runs[0];
  console.log(`Found run #${latestRun.run_number} (id=${latestRun.id})`);

  // List artifacts for that run
  let artifacts;
  try {
    const data = await githubFetch(`/repos/${REPO}/actions/runs/${latestRun.id}/artifacts`);
    artifacts = data.artifacts ?? [];
  } catch (err) {
    await noBaseline(`Failed to list artifacts: ${err.message}`);
    return;
  }

  const galleryArtifact = artifacts.find((a) => a.name === 'gallery');
  if (!galleryArtifact) {
    await noBaseline(`No "gallery" artifact in run ${latestRun.id}`);
    return;
  }

  console.log(`Downloading artifact ${galleryArtifact.id}...`);

  // Download artifact ZIP
  const downloadRes = await fetch(
    `https://api.github.com/repos/${REPO}/actions/artifacts/${galleryArtifact.id}/zip`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      redirect: 'follow',
    },
  );

  if (!downloadRes.ok) {
    await noBaseline(`Failed to download artifact: ${downloadRes.status}`);
    return;
  }

  const zipPath = join(ROOT, 'gallery-output', 'base-gallery.zip');
  const ws = createWriteStream(zipPath);
  await pipeline(downloadRes.body, ws);
  console.log(`Downloaded ZIP to ${zipPath}`);

  // Extract PNG files from the ZIP using the system unzip command
  const { execFileSync } = await import('child_process');
  try {
    execFileSync('unzip', ['-o', zipPath, 'current/*.png', '-d', PREV_DIR], {
      stdio: 'inherit',
    });
    // Move current/ subdirectory contents up if nested
    const nestedDir = join(PREV_DIR, 'current');
    if (existsSync(nestedDir)) {
      execFileSync('sh', ['-c', `mv "${nestedDir}"/*.png "${PREV_DIR}/" 2>/dev/null || true`]);
      execFileSync('rmdir', [nestedDir]);
    }
  } catch (err) {
    // Try without subdirectory filter
    try {
      execFileSync('unzip', ['-o', zipPath, '*.png', '-d', PREV_DIR], { stdio: 'inherit' });
    } catch {
      await noBaseline(`Failed to extract ZIP: ${err.message}`);
      return;
    }
  }

  console.log('Base gallery extracted to', PREV_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(0); // Non-fatal: missing base is acceptable
});
