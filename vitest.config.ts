import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
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
