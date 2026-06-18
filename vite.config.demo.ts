import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

const commit = execSync('git rev-parse --short HEAD').toString().trim();
const buildDate = new Date().toISOString();

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist-demo',
    rollupOptions: {
      input: 'index.html',
      // Emit a single JS bundle for the demo. The 3-D renderer (and three.js)
      // are dynamically imported by the component for lazy-loading in the
      // published library, but the gallery screenshot tool inlines one bundle,
      // so the demo build must not code-split. The library build
      // (vite.config.ts, lib mode) is unaffected and keeps the lazy chunks.
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  define: {
    __COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
});
