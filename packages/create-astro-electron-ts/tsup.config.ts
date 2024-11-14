import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';

const pkg = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
);

export default defineConfig({
  entry: ['src/bin/index.ts'],
  format: ['cjs'],
  dts: false,
  clean: true,
  bundle: true,
  platform: 'node',
  target: ['node16', 'node18', 'node20'],
  noExternal: ['commander', '@inquirer/prompts'],
  external: [/^node:/, 'astro-electron-ts'],
  env: {
    VERSION: pkg.version,
    APP_NAME: pkg.name,
    APP_DESCRIPTION: pkg.description,
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
  outDir: 'dist/bin',
});
