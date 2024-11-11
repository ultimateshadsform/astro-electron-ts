import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['__tests__/setup.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/src/__tests__/**'],
    },
  },
});