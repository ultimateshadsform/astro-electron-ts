import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: [],
    exclude: ['**/node_modules/**', '**/dist/**', '.idea', '.git', '.cache'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        'coverage/**',
      ],
    },
  },
});
