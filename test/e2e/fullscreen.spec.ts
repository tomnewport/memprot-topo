import { expect, test } from '@playwright/test';
import { openDemo } from './helpers';

test('the full-screen button fills the window and comes back', async ({ page }) => {
  await openDemo(page);
  const display = page.locator('#td-2omf');
  const button = display.locator('button.fullscreen-button');
  await expect(button).toHaveText('Full screen');

  await button.click();
  await expect(display).toHaveAttribute('fullscreen', '');
  await expect(button).toHaveText('Exit full screen');
  // The window, not the viewport Playwright set: native full screen in
  // headless Firefox takes the (larger) screen size.
  await expect
    .poll(async () => {
      const box = await display.boundingBox();
      const win = await page.evaluate(() => [window.innerWidth, window.innerHeight]);
      return box && [Math.round(box.width) - win[0], Math.round(box.height) - win[1]];
    })
    .toEqual([0, 0]);
  // The diagram is still drawn while full screen.
  await expect(display.locator('polygon.ss-element').first()).toBeVisible();

  await button.click();
  await expect(display).not.toHaveAttribute('fullscreen', '');
  await expect(button).toHaveText('Full screen');
  const box = await display.boundingBox();
  expect(box!.width).toBeLessThan(page.viewportSize()!.width);
});
