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
      // One script: the gallery inlines it into a page with no base URL, where
      // the lazily loaded 3-D chunk could not be fetched.
      output: { inlineDynamicImports: true },
    },
  },
  define: {
    __COMMIT__: JSON.stringify(commit),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
});
