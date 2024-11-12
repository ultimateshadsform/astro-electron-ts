import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  createNewProject,
  setupProjectFiles,
  validateProjectName,
  // ... other exports
} from '../bin/project-operations';

// Mock external modules
vi.mock('@inquirer/prompts');
vi.mock('fs/promises');
vi.mock('path');
vi.mock('child_process');
vi.mock('detect-package-manager');

describe('Project Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(fs.readFile).mockResolvedValue('{}');
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.cp).mockResolvedValue(undefined);
  });

  describe('createNewProject', () => {
    it('should create project with valid name', async () => {
      const projectName = 'valid-project';
      await createNewProject(projectName, 'npm');

      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates/base'),
        expect.any(String),
        { recursive: true }
      );
    });

    it('should throw on invalid project name', async () => {
      const invalidName = 'invalid/project';
      await expect(createNewProject(invalidName, 'npm')).rejects.toThrow();
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project names', () => {
      expect(validateProjectName('my-project')).toBe(true);
      expect(validateProjectName('project123')).toBe(true);
      expect(validateProjectName('@scope/project')).toBe(true);
    });

    it('should reject invalid project names', () => {
      expect(validateProjectName('invalid/')).toBe(false);
      expect(validateProjectName('')).toBe(false);
      expect(validateProjectName('.')).toBe(false);
    });
  });

  describe('setupProjectFiles', () => {
    it('should setup TypeScript project correctly', async () => {
      // Mock package.json content
      vi.mocked(fs.readFile).mockResolvedValueOnce(
        JSON.stringify({
          name: 'test-project',
          dependencies: {},
          devDependencies: {},
          scripts: {},
        })
      );

      await setupProjectFiles('my-project', 'typescript');

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const packageJsonCall = writeFileCalls.find((call) =>
        String(call[0]).includes('package.json')
      );

      expect(packageJsonCall).toBeTruthy();
      expect(packageJsonCall?.[0]).toMatch(/package\.json$/);
      expect(packageJsonCall?.[1]).toEqual(
        expect.stringContaining('"dependencies"')
      );
    });

    it('should setup JavaScript project correctly', async () => {
      await setupProjectFiles('my-project', 'javascript');

      const writeFileCalls = vi.mocked(fs.writeFile).mock.calls;
      const packageJsonWrite = writeFileCalls.find((call) =>
        (call[0] as string).endsWith('package.json')
      );

      expect(packageJsonWrite?.[1]).not.toContain('"typescript"');
      expect(packageJsonWrite?.[1]).not.toContain('"@astrojs/check"');
    });
  });
});
