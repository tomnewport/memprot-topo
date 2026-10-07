/**
 * Generate the sticky PR comment markdown for the gallery report.
 *
 * Reads screenshots from gallery-images branch via the GitHub API to check
 * which images exist, then writes markdown to ./gallery-comment.md for
 * the sticky-pull-request-comment action to consume.
 *
 * Env vars:
 *   GITHUB_TOKEN  — for API auth
 *   REPO          — "owner/repo"
 *   HEAD_BRANCH   — source branch (PR head)
 *   BASE_BRANCH   — target branch (PR base)
 *   ARTIFACT_URL  — optional; URL to the uploaded artifact
 */
import { writeFile } from 'fs/promises';
import { GALLERY_PROTEINS, MORPH_ANIM, MORPH_VIEWS } from './gallery-data.mjs';

const { GITHUB_TOKEN, REPO, HEAD_BRANCH, BASE_BRANCH, ARTIFACT_URL } = process.env;

if (!REPO || !HEAD_BRANCH) {
  console.error('REPO and HEAD_BRANCH env vars are required');
  process.exit(1);
}

function sanitize(branch) {
  return branch.replace(/\//g, '-');
}

async function pathExists(branch, path) {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${branch}`;
  const headers = { Accept: 'application/vnd.github+json' };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  return res.ok;
}

function imgTag(sanitizedBranch, name, alt, file = `${name}.png`) {
  const url = `https://github.com/${REPO}/raw/gallery-images/${sanitizedBranch}/${file}`;
  // Use the comment's full width — the unrolled view is fundamentally
  // wide-and-short and cramping it into a narrow table cell makes β-barrels
  // unreadable.
  return `<img src="${url}" alt="${alt}" style="max-width:100%;" />`;
}

async function main() {
  const sanitizedHead = sanitize(HEAD_BRANCH);
  const sanitizedBase = BASE_BRANCH ? sanitize(BASE_BRANCH) : null;

  const sections = [];
  for (const protein of GALLERY_PROTEINS) {
    let prev = '<em>(no baseline yet)</em>';
    if (sanitizedBase) {
      const exists = await pathExists('gallery-images', `${sanitizedBase}/${protein.pdbId}.png`);
      if (exists) {
        prev = imgTag(sanitizedBase, protein.pdbId, `${protein.pdbId} on ${BASE_BRANCH}`);
      }
    }
    const curr = imgTag(sanitizedHead, protein.pdbId, `${protein.pdbId} on ${HEAD_BRANCH}`);
    // The animated transition, base branch and this branch side by side.
    const anim = `${protein.pdbId}${MORPH_ANIM.suffix}`;
    let transition = [];
    if (await pathExists('gallery-images', `${sanitizedHead}/${anim}`)) {
      const animTag = (branch, label) =>
        imgTag(branch, anim, `${anim} on ${label}`, anim).replace(
          'style="max-width:100%;"',
          'width="420"',
        );
      let animPrev = '<em>(no baseline yet)</em>';
      if (sanitizedBase && (await pathExists('gallery-images', `${sanitizedBase}/${anim}`))) {
        animPrev = animTag(sanitizedBase, BASE_BRANCH);
      }
      transition = [
        '',
        `**${MORPH_ANIM.label}:**`,
        '',
        '<table><tr>',
        `<th>Previous (<code>${BASE_BRANCH || 'n/a'}</code>)</th>`,
        `<th>Current (<code>${HEAD_BRANCH}</code>)</th>`,
        '</tr><tr>',
        `<td>${animPrev}</td>`,
        `<td>${animTag(sanitizedHead, HEAD_BRANCH)}</td>`,
        '</tr></table>',
      ];
    }
    // The 3-D morph views, folded away to keep the comment short.
    const morph = [];
    for (const view of MORPH_VIEWS) {
      const name = `${protein.pdbId}${view.suffix}`;
      let viewPrev = '<em>(no baseline yet)</em>';
      if (sanitizedBase && (await pathExists('gallery-images', `${sanitizedBase}/${name}.png`))) {
        viewPrev = imgTag(sanitizedBase, name, `${name} on ${BASE_BRANCH}`);
      }
      morph.push(
        `**${view.label}, current:**`,
        '',
        imgTag(sanitizedHead, name, `${name} on ${HEAD_BRANCH}`),
        '',
        `**${view.label}, previous:**`,
        '',
        viewPrev,
        '',
      );
    }
    sections.push(
      [
        `### ${protein.label} \`${protein.pdbId.toUpperCase()}\``,
        '',
        `**Current (\`${HEAD_BRANCH}\`):**`,
        '',
        curr,
        '',
        `**Previous (\`${BASE_BRANCH || 'n/a'}\`):**`,
        '',
        prev,
        ...transition,
        '',
        '<details><summary>3-D morph</summary>',
        '',
        ...morph,
        '</details>',
      ].join('\n'),
    );
  }

  const artifactLine = ARTIFACT_URL
    ? `\n[Download full artifact](${ARTIFACT_URL}) for the standalone HTML report.`
    : '';

  const markdown = `## Gallery Report

Reference proteins rendered with this PR's \`<topology-display>\` component.

> **Note:** Gallery screenshots use real OPM Cα coordinates and PDB
> HELIX/SHEET secondary structure (from \`scripts/gallery-prebuilt-data.json\`)
> so the renders should closely match the live Pages UI.

${sections.join('\n\n---\n\n')}
${artifactLine}
`;

  await writeFile('gallery-comment.md', markdown, 'utf-8');
  console.log('Wrote gallery-comment.md');
  console.log(markdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
