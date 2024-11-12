import { defineConfig, Options } from 'tsup';
import packageJson from './package.json';

// Shared base configuration
const baseConfig: Options = {
  dts: true,
  clean: true,
  bundle: true,
  shims: true,
  external: [
    'node:tty',
    'node:fs',
    'node:path',
    'node:process',
    'node:url',
    'node:fs/promises',
  ],
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
    noExternal: ['detect-package-manager', 'commander', '@inquirer/prompts'],
    outDir: 'dist/bin',
    format: 'esm',
    define: {
      VERSION: JSON.stringify(packageJson.version),
    },
  },
]);
