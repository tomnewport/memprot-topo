import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';
import demoConfig from './vite.config.demo';

/**
 * The demo page for the E2E tests: the same as the demo build, but with the
 * protein data read from `examples/` (written by `npm run prebuild:e2e`)
 * instead of fetched from OPM and PDB-REDO, so the tests run offline.
 */
export default mergeConfig(
  demoConfig,
  defineConfig({
    resolve: {
      alias: [
        {
          find: /^\.\/demo-data\.js$/,
          replacement: fileURLToPath(
            new URL('./test/e2e/.generated/demo-data.ts', import.meta.url),
          ),
        },
      ],
    },
    server: { port: 5179, strictPort: true },
  }),
);
