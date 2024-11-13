import { defineConfig, Options } from 'tsup';
import packageJson from './package.json';

// Shared base configuration
const baseConfig: Options = {
  dts: true,
  clean: true,
  bundle: true,
  shims: true,
  platform: 'node',
  target: ['node18', 'node20', 'node22'],
};

export default defineConfig([
  // Main library build
  {
    ...baseConfig,
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: 'esm',
    external: ['astro', 'electron'],
  },
  // CLI build
  {
    ...baseConfig,
    entry: ['bin/index.ts'],
    outDir: 'dist/bin',
    format: ['cjs'],
    external: [
      /^node:/,
      'events',
      'util',
      'stream',
      'buffer',
      'path',
      'fs',
      'os',
    ],
    define: {
      VERSION: JSON.stringify(packageJson.version),
    },
  },
]);
