import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const example = (name: string) =>
  readFileSync(new URL(`../../examples/${name}`, import.meta.url), 'utf8');

test('<topology-loader> draws a MemProtMD structure with its distortions', async ({ page }) => {
  // Serve the MemProtMD and PDB-REDO downloads from examples/, so the test
  // runs offline. The protein-only head-contacts file stands in for at.pdb.
  await page.route('https://memprotmd.bioch.ox.ac.uk/**', (route) =>
    route.fulfill({ body: example('5g53_default_dppc-head-contacts.pdb') }),
  );
  await page.route('https://pdb-redo.eu/dssp/**', (route) =>
    route.fulfill({ body: example('5g53.dssp.cif') }),
  );

  await page.goto('/test/e2e/loader.html');
  await page.evaluate(() => {
    const el = document.createElement('topology-loader');
    el.setAttribute('pdb-id', '5g53');
    el.setAttribute('distortions', '/examples/5g53_default_dppc-distortions.pdb');
    document.body.append(el);
  });

  const display = page.locator('topology-loader topology-display');
  await expect(display.locator('.protein-id')).toHaveText('5g53');
  await expect(display.locator('.svg-scroll > svg').first()).toHaveAttribute(
    'aria-label',
    /^Chain A /,
  );
  // Re-centred on the distortions file's midplane, so the receptor crosses
  // the bilayer and its membrane profile is the local one.
  await expect(display.locator('.chain-note')).toHaveCount(0);
  await expect(display.locator('path.membrane')).toBeAttached();
  await expect(page.locator('topology-loader .error')).toHaveCount(0);
});

test('<topology-loader> reports a failed download', async ({ page }) => {
  await page.route('https://memprotmd.bioch.ox.ac.uk/**', (route) =>
    route.fulfill({ status: 404, body: 'Not Found' }),
  );
  await page.route('https://pdb-redo.eu/dssp/**', (route) =>
    route.fulfill({ body: example('5g53.dssp.cif') }),
  );
  await page.goto('/test/e2e/loader.html');
  await page.evaluate(() => {
    const el = document.createElement('topology-loader');
    el.setAttribute('pdb-id', '5g53');
    document.body.append(el);
  });
  await expect(page.locator('topology-loader .error')).toHaveText('Failed to load 5g53');
  await expect(page.locator('topology-loader .error-detail')).toContainText('404');
});
