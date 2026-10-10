import { expect, test } from '@playwright/test';
import { membraneZ, openDemo } from './helpers';

test.beforeEach(async ({ page }) => {
  await openDemo(page);
});

test.describe('example proteins', () => {
  const cases = [
    // [display, chains in the picker, the chain drawn by default]
    { id: '5g53', chains: 2, chain: 'A' },
    { id: '2omf', chains: 3, chain: 'A' },
    { id: '7ahl', chains: 7, chain: 'A' },
  ];
  for (const { id, chains, chain } of cases) {
    test(`${id.toUpperCase()} draws its chains and secondary structure`, async ({ page }) => {
      const display = page.locator(`#td-${id}`);
      await expect(display.locator('.protein-id')).toHaveText(id);
      // One violin per chain; identical copies share a group with a picker.
      const copies = await display.locator('select.chain-copy option').count();
      const violins = await display.locator('button.chain-violin').count();
      expect(Math.max(violins, copies)).toBe(chains);
      const svg = display.locator('.svg-scroll > svg').first();
      await expect(svg).toHaveAttribute('aria-label', new RegExp(`^Chain ${chain} `));
      expect(await display.locator('polygon.ss-element').count()).toBeGreaterThan(0);
      expect(await display.locator('path.loop').count()).toBeGreaterThan(0);
    });
  }

  test('5G53 chain A is drawn with its seven transmembrane helices', async ({ page }) => {
    // The A2A receptor: 7 TM helices plus helix 8 and short ECL/ICL helices.
    const n = await page.locator('#td-5g53 polygon.ss-element').count();
    expect(n).toBeGreaterThanOrEqual(7);
  });
});

test.describe('membrane band', () => {
  test('is the flat ±20 Å bulk headgroup planes without distortions', async ({ page }) => {
    await page.locator('#distortions').uncheck();
    await expect
      .poll(async () => new Set((await membraneZ(page, 'td-5g53')).map((z) => Math.abs(z))))
      .toEqual(new Set([20]));
  });

  test('follows the MemProtMD distortions profile when they are on', async ({ page }) => {
    await expect(page.locator('#distortions')).toBeChecked();
    await expect(page.locator('#distortions-status')).toContainText('5G53');
    const z = await membraneZ(page, 'td-5g53');
    const upper = z.filter((v) => v > 0);
    const lower = z.filter((v) => v < 0);
    // Bulk headgroup planes about 20 Å either side (5G53: ±20.03 Å) …
    expect(Math.max(...upper)).toBeGreaterThan(19);
    expect(Math.min(...lower)).toBeLessThan(-19);
    // … with the local profile bending away from them near the protein.
    expect(new Set(z.map((v) => v.toFixed(2))).size).toBeGreaterThan(4);
    expect(upper.some((v) => Math.abs(v - 20) > 1)).toBe(true);
  });
});

test('the chain picker switches the drawn chain', async ({ page }) => {
  const display = page.locator('#td-5g53');
  const svg = display.locator('.svg-scroll > svg').first();
  await expect(svg).toHaveAttribute('aria-label', /^Chain A /);
  const other = display.locator('button.chain-violin:not(.selected)');
  await expect(other).toHaveCount(1);
  await other.click();
  await expect(svg).toHaveAttribute('aria-label', /^Chain C /);
  await expect(display.locator('button.chain-violin.selected')).toHaveCount(1);
  // The mini-Gs chain does not span the membrane, and the display says so.
  await expect(display.locator('.chain-note')).toContainText('does not appear to span');
});
