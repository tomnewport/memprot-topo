import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // test/e2e holds the Playwright tests (`npm run test:e2e`).
    exclude: [...configDefaults.exclude, 'test/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // A floor a little under the measured figures (#38), so a drop fails CI.
      thresholds: {
        lines: 93,
        statements: 93,
        branches: 86,
        functions: 90,
      },
    },
    reporters: ['default'],
  },
});
