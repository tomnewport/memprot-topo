import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openDemo } from './helpers';

test('exports the 2-D topology as a standalone SVG file in the theme picked', async ({ page }) => {
  await openDemo(page);
  const display = page.locator('#td-5g53');
  await display.locator('button.export-button').click();
  const panel = display.locator('.export-panel');
  await expect(panel).toBeVisible();
  await panel.locator('select').selectOption('dark');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    panel.locator('button.export-download').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^5g53-\w+-2d\.svg$/);
  const text = await readFile((await download.path())!, 'utf8');
  expect(text).toContain('<svg');
  expect(text).not.toContain('data-mp-paint');
  // It draws on its own, outside the page's styles.
  await page.setContent(text.replace(/^<\?xml[^>]*>/, ''));
  const svg = page.locator('svg').first();
  await expect(svg.locator('polygon').first()).toBeVisible();
  expect(await svg.locator('rect.background').getAttribute('fill')).toBe('#1c1d20');
});
