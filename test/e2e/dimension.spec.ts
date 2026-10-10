import { expect, test } from '@playwright/test';
import { expectDimension, pixelDifference, openDemo } from './helpers';

// Each move animates at the default 2.5 s per dimension.
test.describe.configure({ timeout: 60_000 });

test.beforeEach(async ({ page }) => {
  await openDemo(page);
});

test('the view buttons move between sequence, topology and structure', async ({ page }) => {
  const display = page.locator('#td-5g53');
  const button = (d: number) => display.locator(`.view-button[data-dimension="${d}"]`);
  await expect(button(2)).toHaveAttribute('aria-pressed', 'true');

  await button(3).click();
  await expectDimension(page, 'td-5g53', 3);
  await expect(display.locator('svg.morph-svg')).toBeVisible();
  await expect(button(3)).toHaveAttribute('aria-pressed', 'true');

  await button(1).click();
  await expectDimension(page, 'td-5g53', 1);
  await expect(display.locator('svg.sequence-view')).toBeVisible();
  await expect(button(1)).toHaveAttribute('aria-pressed', 'true');

  await button(2).click();
  await expectDimension(page, 'td-5g53', 2);
  await expect(display.locator('polygon.ss-element').first()).toBeVisible();
});

test('the dimension control drives every display', async ({ page }) => {
  const input = page.locator('#controls input[id^="ctl-dimension-"]');
  await input.fill('3');
  for (const id of ['td-5g53', 'td-2omf', 'td-7ahl']) {
    await expectDimension(page, id, 3);
    await expect(page.locator(`#${id}`)).toHaveAttribute('dimension', '3');
  }
  await input.fill('1');
  for (const id of ['td-5g53', 'td-2omf', 'td-7ahl']) {
    await expectDimension(page, id, 1);
    await expect(page.locator(`#${id} svg.sequence-view`)).toBeVisible();
  }
  // Part-way: 1.5 is half-way from the sequence to the topology.
  await input.fill('1.5');
  await expectDimension(page, 'td-5g53', 1.5);
});

test('the 3-D view resolves its gradients inside the shadow DOM', async ({ page }) => {
  const display = page.locator('#td-5g53');
  await display.locator('.view-button[data-dimension="3"]').click();
  await expectDimension(page, 'td-5g53', 3);
  const morph = display.locator('svg.morph-svg');
  await expect(morph).toBeVisible();

  // Every url(#…) the 3-D view uses names an element in the same shadow root.
  const missing = await page.evaluate(() => {
    const root = document.getElementById('td-5g53')!.shadowRoot!;
    const svg = root.querySelector('svg.morph-svg')!;
    const refs = new Set<string>();
    for (const el of svg.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        for (const m of attr.value.matchAll(/url\(#([^)]+)\)/g)) refs.add(m[1]);
      }
    }
    return { count: refs.size, missing: [...refs].filter((id) => !root.getElementById(id)) };
  });
  expect(missing.count).toBeGreaterThan(0);
  expect(missing.missing).toEqual([]);

  // And the browser paints them. A url(#…) that does not resolve paints
  // nothing, so swapping every reference for `none` must change the picture;
  // if the browser could not resolve them in the first place, it would not.
  // The swap rewrites the referring attributes so every engine repaints:
  // renaming the gradients' ids instead left WebKit's picture unchanged.
  const painted = await morph.screenshot({ animations: 'disabled' });
  await page.evaluate(() => {
    const svg = document.getElementById('td-5g53')!.shadowRoot!.querySelector('svg.morph-svg')!;
    for (const el of svg.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.value.includes('url(#')) {
          el.setAttribute(attr.name, attr.value.replace(/url\(#[^)]+\)/g, 'none'));
        }
      }
    }
  });
  const unresolved = await morph.screenshot({ animations: 'disabled' });
  expect(await pixelDifference(page, painted, unresolved)).toBeGreaterThan(0.01);
});
