import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const setupFile = path.join(__dirname, 'vitest.setup.ts');

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: fs.existsSync(setupFile) ? ['./vitest.setup.ts'] : [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
