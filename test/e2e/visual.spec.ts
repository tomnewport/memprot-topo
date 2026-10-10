import { expect, test } from '@playwright/test';
import { openDemo } from './helpers';

// Screenshots differ in anti-aliasing between engines, so the baseline is
// Chromium's. The other engines are covered by the structural tests.
test('5G53 2-D topology matches the baseline', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'baseline is Chromium-only');
  await openDemo(page);
  await page.locator('#distortions').uncheck();
  const svg = page.locator('#td-5g53 .svg-scroll > svg').first();
  await expect(svg).toHaveScreenshot('5g53-2d.png', {
    // Text depends on the installed fonts; the test is about the drawing.
    mask: [page.locator('#td-5g53 .svg-scroll text')],
    maxDiffPixelRatio: 0.01,
  });
});
