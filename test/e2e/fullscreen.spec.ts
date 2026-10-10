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
  const viewport = page.viewportSize()!;
  await expect
    .poll(async () => {
      const box = await display.boundingBox();
      return box && [Math.round(box.width), Math.round(box.height)];
    })
    .toEqual([viewport.width, viewport.height]);
  // The diagram is still drawn while full screen.
  await expect(display.locator('polygon.ss-element').first()).toBeVisible();

  await button.click();
  await expect(display).not.toHaveAttribute('fullscreen', '');
  await expect(button).toHaveText('Full screen');
  const box = await display.boundingBox();
  expect(box!.width).toBeLessThan(viewport.width);
});
