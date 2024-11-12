import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import path from 'path';

// Mock external modules
vi.mock('fs/promises');
vi.mock('path');

describe('Project Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Default mocks
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Electron Project Detection', () => {
    it('should detect missing electron integration in config', async () => {
      // Mock package.json with electron but no integration in config
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
                electron: '^1.0.0',
              },
            })
          );
        }
        if (path.toString().includes('astro.config')) {
          return Promise.resolve(`
            import { defineConfig } from 'astro/config';
            export default defineConfig({});
          `);
        }
        return Promise.reject(new Error('File not found'));
      });

      const { isElectronProject } = await import('../bin/project-checks');
      const result = await isElectronProject();

      expect(result).toBe(false);
    });

    it('should detect complete electron setup including integration', async () => {
      // Mock package.json and config with complete setup
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
                electron: '^1.0.0',
              },
            })
          );
        }
        if (path.toString().includes('astro.config')) {
          return Promise.resolve(`
            import electron from 'astro-electron-ts';
            import { defineConfig } from 'astro/config';
            export default defineConfig({
              integrations: [electron()]
            });
          `);
        }
        return Promise.reject(new Error('File not found'));
      });

      const { isElectronProject } = await import('../bin/project-checks');
      const result = await isElectronProject();

      expect(result).toBe(true);
    });
  });
});
