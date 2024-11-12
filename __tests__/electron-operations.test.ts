import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import {
  addElectronIntegration,
  isElectronProject,
  installElectronDependencies,
  // ... other exports
} from '../bin/electron-operations';

vi.mock('fs/promises');
vi.mock('path');
vi.mock('child_process');

describe('Electron Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  describe('isElectronProject', () => {
    it('should detect complete electron setup', async () => {
      vi.mocked(fs.readFile).mockImplementation((path) => {
        if (path.toString().includes('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                electron: '^1.0.0',
                'astro-electron-ts': '^1.0.0',
              },
            })
          );
        }
        if (path.toString().includes('astro.config')) {
          return Promise.resolve(`
            import electron from 'astro-electron-ts';
            export default {
              integrations: [electron()]
            };
          `);
        }
        return Promise.resolve('');
      });

      const result = await isElectronProject();
      expect(result).toBe(true);
    });

    it('should return false for incomplete setup', async () => {
      vi.mocked(fs.readFile).mockImplementation((path) => {
        if (path.toString().includes('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {},
            })
          );
        }
        return Promise.resolve('');
      });

      const result = await isElectronProject();
      expect(result).toBe(false);
    });
  });

  describe('addElectronIntegration', () => {
    it('should add electron integration to config', async () => {
      await addElectronIntegration();

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('astro.config'),
        expect.stringContaining('electron()'),
        'utf-8'
      );
    });
  });

  describe('installElectronDependencies', () => {
    it('should install required dependencies', async () => {
      await installElectronDependencies('npm');

      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('electron'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('astro-electron-ts'),
        expect.any(Object)
      );
    });

    it('should handle installation errors', async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Installation failed');
      });

      await expect(installElectronDependencies('npm')).rejects.toThrow(
        'Installation failed'
      );
    });
  });
});
