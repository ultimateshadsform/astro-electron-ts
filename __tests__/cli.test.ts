import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { input, select, confirm } from '@inquirer/prompts';
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
    vi.mocked(select).mockResolvedValue('create');
    vi.mocked(input).mockResolvedValue('test-project');
    vi.mocked(confirm).mockResolvedValue(true);

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Project Creation', () => {
    it('should create a new project when selected', async () => {
      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));

      const { main } = await import('../src/cli');
      await main();

      expect(fs.cp).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Project created successfully!')
      );
    });

    it('should handle existing directory with overwrite confirmation', async () => {
      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('existing-project');
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(confirm).mockResolvedValueOnce(true);

      const { main } = await import('../src/cli');
      await main();

      expect(fs.cp).toHaveBeenCalled();
    });

    it('should cancel when user declines overwrite', async () => {
      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('existing-project');
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(confirm).mockResolvedValueOnce(false);

      const { main } = await import('../src/cli');
      await main();

      expect(fs.cp).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Operation cancelled');
    });
  });

  describe('Project Detection', () => {
    beforeEach(() => {
      vi.mocked(select).mockResolvedValueOnce('add');
    });

    it('should detect Astro + Electron project correctly', async () => {
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
    });

    it('should detect non-Astro project and show create suggestion', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          name: 'test-project',
          dependencies: {},
          devDependencies: {},
        })
      );

      const { main } = await import('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('create an Astro project')
      );
    });

    it('should detect missing Electron components', async () => {
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Electron not detected')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Main field missing')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Required Electron files missing')
      );
    });
  });

  describe('Package Manager Detection', () => {
    beforeEach(() => {
      vi.mocked(select).mockResolvedValueOnce('add');
    });

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

    it('should prompt for package manager when detection fails', async () => {
      vi.mocked(detect).mockResolvedValue('npm');
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );
      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select)
        .mockResolvedValueOnce('add')
        .mockResolvedValueOnce('pnpm');

      const { main } = await import('../src/cli');
      await main();

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Which package manager would you like to use?',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException;
      error.code = 'EACCES';

      // Mock select to choose 'add' to trigger Astro check
      vi.mocked(select).mockResolvedValueOnce('add');

      // Mock readFile to fail with permission error
      vi.mocked(readFile).mockRejectedValueOnce(error);

      // Mock fs.access to also fail with same error
      vi.mocked(fs.access).mockRejectedValueOnce(error);

      const { main } = await import('../src/cli');
      await expect(main()).rejects.toThrow('Permission denied');
    });

    it('should handle invalid package.json', async () => {
      vi.mocked(readFile).mockResolvedValue('{ invalid json }');
      vi.mocked(select).mockResolvedValueOnce('add');

      const { main } = await import('../src/cli');
      await expect(main()).rejects.toThrow('Invalid package.json format');
    });

    it('should handle dependency installation errors', async () => {
      vi.mocked(select).mockResolvedValueOnce('add');
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
});
