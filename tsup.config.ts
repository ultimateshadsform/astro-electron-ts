import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'bin/cli': 'bin/cli.ts',
  },
  format: ['esm'],
  dts: true,
  external: [
    'node:tty',
    'node:fs',
    'node:path',
    'node:process',
    '@inquirer/prompts',
  ],
  clean: true,
  bundle: true,
  shims: true,
});
