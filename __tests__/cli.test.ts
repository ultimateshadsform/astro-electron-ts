import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { select, confirm } from '@inquirer/prompts';
import fs from 'fs/promises';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import { detect } from 'detect-package-manager';

// Mock external modules
vi.mock('@inquirer/prompts');
vi.mock('fs/promises');
vi.mock('path');
vi.mock('child_process');
vi.mock('detect-package-manager');

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Default mocks
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(detect).mockResolvedValue('npm');
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        name: 'test-project',
        dependencies: {},
        devDependencies: {},
      })
    );
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Project Detection', () => {
    it('should detect Astro + Electron project correctly', async () => {
      // Mock a fully configured project
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          name: 'test-project',
          main: 'dist-electron/main.js',
          dependencies: { electron: '^1.0.0' },
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(fs.access).mockResolvedValue(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        '✨ Astro + Electron project detected!'
      );
      expect(console.log).toHaveBeenCalledWith(
        "You're all set! Run your dev command to get started."
      );
    });

    it('should detect missing Electron files', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          dependencies: { electron: '^1.0.0' },
          devDependencies: { astro: '^1.0.0' },
          main: 'dist-electron/main.js',
        })
      );

      // Mock file checks to fail
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Required Electron files missing')
      );
    });

    it('should detect missing main field', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          dependencies: { electron: '^1.0.0' },
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(fs.access).mockResolvedValue(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Main field missing in package.json')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Mock readFile to fail with a file system error
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES'; // Now TypeScript knows this is allowed
      vi.mocked(readFile).mockRejectedValue(error);
      vi.mocked(fs.access).mockRejectedValue(error);

      const { main } = await import('../src/cli');
      await expect(main()).rejects.toThrow('Permission denied');
    });

    it('should handle package.json parse errors', async () => {
      // Mock readFile to return invalid JSON
      vi.mocked(readFile).mockResolvedValue('{ invalid json }');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      const { main } = await import('../src/cli');
      await expect(main()).rejects.toThrow('Invalid package.json format');
    });

    it('should handle dependency installation errors', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(execSync).mockImplementationOnce(() => {
        throw new Error('Installation failed');
      });

      const { main } = await import('../src/cli');
      await expect(main()).rejects.toThrow('Installation failed');
    });
  });

  describe('Auto-configuration', () => {
    it('should only add main field if everything else exists', async () => {
      // Mock Astro + Electron installed but missing main field
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          dependencies: { electron: '^1.0.0' },
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('dist-electron/main.js')
      );
      expect(fs.cp).not.toHaveBeenCalled();
      expect(execSync).not.toHaveBeenCalled();
    });

    it('should only copy electron files if missing', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          main: 'dist-electron/main.js',
          dependencies: { electron: '^1.0.0' },
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      expect(fs.cp).toHaveBeenCalled();
      expect(writeFile).not.toHaveBeenCalled();
      expect(execSync).not.toHaveBeenCalled();
    });

    it('should install electron if not present', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          main: 'dist-electron/main.js',
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('electron'),
        expect.any(Object)
      );
    });
  });

  describe('Package Manager Detection', () => {
    it('should use detected package manager without prompting', async () => {
      vi.mocked(detect).mockResolvedValue('pnpm');
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Which package manager would you like to use?',
        })
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('pnpm add'),
        expect.any(Object)
      );
    });

    it('should prompt for package manager only when detection defaults to npm', async () => {
      vi.mocked(detect).mockResolvedValue('npm');
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select).mockResolvedValueOnce('pnpm');

      const { main } = await import('../src/cli');
      await main();

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Which package manager would you like to use?',
        })
      );
    });
  });
});
