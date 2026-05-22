import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MemProt2D',
      fileName: 'memprot2d',
      formats: ['cjs', 'es'],
    },
  },
});
