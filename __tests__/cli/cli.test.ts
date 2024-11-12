import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { confirm } from '@inquirer/prompts';
import fs from 'fs/promises';

vi.mock('@inquirer/prompts');
vi.mock('fs/promises');

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Mock fs operations with complete setup
    vi.mocked(fs.readFile).mockImplementation((path) => {
      if (path.toString().includes('package.json')) {
        return Promise.resolve(
          JSON.stringify({
            name: 'test-project',
            main: 'dist-electron/main.js',
            dependencies: {
              astro: '^1.0.0',
              electron: '^1.0.0',
              'astro-electron-ts': '^1.0.0',
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
      return Promise.resolve('');
    });

    // Mock project checks
    vi.mock('../../bin/project-checks', () => ({
      isAstroProject: vi.fn().mockResolvedValue(true),
      isElectronProject: vi.fn().mockResolvedValue(false),
      hasMainField: vi.fn().mockResolvedValue(true),
      hasPackageJson: vi.fn().mockResolvedValue(true),
      isJavaScriptProject: vi.fn().mockResolvedValue(false),
    }));

    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Project Detection', () => {
    it('should detect complete Astro + Electron setup', async () => {
      // Mock Electron project check to return true for this test
      const projectChecks = await import('../../bin/project-checks');
      vi.mocked(projectChecks.isElectronProject).mockResolvedValueOnce(true);

      // Reset console.log mock before the test
      vi.mocked(console.log).mockClear();

      const { main } = await import('../../bin/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        '✨ Astro + Electron project detected!'
      );
    });

    it('should offer to configure Electron in existing Astro project', async () => {
      // Reset console.log mock before the test
      vi.mocked(console.log).mockClear();
      vi.mocked(confirm).mockResolvedValueOnce(false);

      // Mock project checks for this test
      const projectChecks = await import('../../bin/project-checks');
      vi.mocked(projectChecks.isElectronProject).mockResolvedValueOnce(false);
      vi.mocked(projectChecks.isAstroProject).mockResolvedValueOnce(true);

      const { main } = await import('../../bin/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith('✨ Astro project detected!');
    });
  });
});
