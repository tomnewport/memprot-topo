import { expect, type Page } from '@playwright/test';

/** The demo page with every example protein drawn. */
export async function openDemo(page: Page): Promise<void> {
  await page.goto('/');
  // Each example protein shows its 2-D topology once its data is in.
  for (const id of ['5g53', '2omf', '7ahl']) {
    await expect(page.locator(`#td-${id} polygon.ss-element`).first()).toBeAttached();
  }
}

/** The z values (Å) of the drawn membrane slab outline in a display's 2-D view. */
export async function membraneZ(page: Page, displayId: string): Promise<number[]> {
  const d = await page.locator(`#${displayId} path.membrane`).getAttribute('d');
  expect(d).toBeTruthy();
  // `M x,z L x,z …`: plot coordinates are (arc, z) in Å.
  return [...d!.matchAll(/[ML]\s*(-?[\d.]+),\s*(-?[\d.]+)/g)].map((m) => Number(m[2]));
}

/**
 * Wait until a display's `dimension` animation has arrived at `target`. At the
 * default 2.5 s per dimension, sequence → structure takes 5 s.
 */
export async function expectDimension(
  page: Page,
  displayId: string,
  target: number,
): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(
          (id) => (document.getElementById(id) as unknown as { dimension: number }).dimension,
          displayId,
        ),
      { timeout: 15_000 },
    )
    .toBeCloseTo(target, 3);
}

/**
 * The fraction of pixels that differ between two same-sized PNGs, decoded in
 * the page so this works the same in every browser.
 */
export async function pixelDifference(page: Page, a: Buffer, b: Buffer): Promise<number> {
  return page.evaluate(
    async ([a64, b64]) => {
      const pixels = async (b64: string): Promise<Uint8ClampedArray> => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [pa, pb] = await Promise.all([pixels(a64), pixels(b64)]);
      if (pa.length !== pb.length) return 1;
      let differ = 0;
      for (let i = 0; i < pa.length; i += 4) {
        if (pa[i] !== pb[i] || pa[i + 1] !== pb[i + 1] || pa[i + 2] !== pb[i + 2]) differ++;
      }
      return differ / (pa.length / 4);
    },
    [a.toString('base64'), b.toString('base64')],
  );
}
