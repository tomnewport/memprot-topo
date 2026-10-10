import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // test/e2e holds the Playwright tests (`npm run test:e2e`).
    exclude: [...configDefaults.exclude, 'test/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
    },
    reporters: ['default'],
    passWithNoTests: true,
  },
});
