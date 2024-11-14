import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  bundle: true,
  platform: 'node',
  target: ['node16', 'node18', 'node20'],
  external: ['astro', 'electron', 'vite', 'vite-plugin-electron', /^node:/],
  treeshake: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  outDir: 'dist',
});
