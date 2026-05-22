import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MemProt2D',
      fileName: 'memprot2d',
      formats: ['cjs', 'es'],
    },
    rollupOptions: {
      external: [],
    },
  },
});
