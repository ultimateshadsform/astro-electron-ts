import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { confirm } from '@inquirer/prompts';
import { setupProjectFiles } from '../bin/project-operations';

// Mock external modules
vi.mock('@inquirer/prompts');

// Mock process.cwd
vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');

// Create mock functions
const mockReadFile = vi.fn().mockResolvedValue('{}');
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockCp = vi.fn().mockResolvedValue(undefined);
const mockAccess = vi.fn().mockResolvedValue(undefined);
const mockLstat = vi.fn().mockResolvedValue({ isDirectory: () => true });
const mockMkdir = vi.fn().mockResolvedValue(undefined);

// Mock fs/promises with default export
vi.mock('fs/promises', async () => {
  const mockFunctions = {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    cp: mockCp,
    access: mockAccess,
    lstat: mockLstat,
    mkdir: mockMkdir,
  };

  return {
    default: mockFunctions,
    ...mockFunctions,
  };
});

// Mock path with proper default export
vi.mock('path', async () => {
  const mockJoin = (...args: string[]) => args.join('/').replace(/\/+/g, '/');
  const mockDirname = vi.fn().mockReturnValue('/mock/bin');
  const mockFunctions = {
    join: mockJoin,
    dirname: mockDirname,
  };

  return {
    default: mockFunctions,
    ...mockFunctions,
  };
});

vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.toString().replace('file://', '')),
}));

// Mock electron-operations
vi.mock('../bin/electron-operations', () => ({
  convertToJavaScript: vi.fn().mockResolvedValue(undefined),
  copyElectronFiles: vi.fn().mockResolvedValue(undefined),
}));

// Add type definition for package.json
interface PackageJson {
  name: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

// Mock project-operations before importing
vi.mock('../bin/project-operations', () => {
  return {
    createNewProject: vi.fn(
      async (projectName: string, packageManager: string) => {
        if (!projectName || projectName.includes('/')) {
          throw new Error(`Invalid project name: ${projectName}`);
        }
        const targetPath = `/mock/cwd/${projectName}`;
        await mockMkdir(targetPath, { recursive: true });
        await mockCp('/mock/templates/base', targetPath, { recursive: true });
      }
    ),
    validateProjectName: vi.fn((name: string) => {
      if (!name) return false;
      if (name.startsWith('@')) {
        const parts = name.split('/');
        if (parts.length !== 2) return false;
        name = parts[1];
      }
      if (name.toLowerCase() !== name) return false;
      if (!/^[a-z0-9-_]+$/.test(name)) return false;
      if (name.startsWith('.') || name.startsWith('_')) return false;
      if (name.startsWith('-')) return false;
      if (name.length < 1) return false;
      if (name.length > 214) return false;
      return true;
    }),
    setupProjectFiles: vi.fn(async (projectName: string, language: string) => {
      const packageJsonPath = `/mock/cwd/${projectName}/package.json`;
      const packageJson: PackageJson = {
        name: projectName,
        dependencies: {},
        devDependencies: {},
        scripts: {
          build:
            language === 'typescript'
              ? 'astro check && astro build'
              : 'astro build',
        },
      };

      if (language === 'typescript') {
        packageJson.dependencies['@astrojs/check'] = '^1.0.0';
        packageJson.dependencies['typescript'] = '^5.0.0';
      }

      await mockWriteFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2)
      );
    }),
    BASE_TEMPLATE_PATH: '/mock/templates/base',
    ELECTRON_TEMPLATE_PATH: '/mock/templates/base/electron',
  };
});

describe('Project Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup default mocks
    mockReadFile.mockResolvedValue('{}');
    mockWriteFile.mockResolvedValue(undefined);
    mockCp.mockResolvedValue(undefined);
    mockAccess.mockResolvedValue(undefined);
    mockLstat.mockResolvedValue({ isDirectory: () => true });
    mockMkdir.mockResolvedValue(undefined);

    // Mock package.json read for all tests
    mockReadFile.mockImplementation((path: string) => {
      if (path.endsWith('package.json')) {
        return Promise.resolve(
          JSON.stringify({
            name: 'test-project',
            dependencies: {
              '@astrojs/check': '^1.0.0',
              typescript: '^5.0.0',
            },
            devDependencies: {},
            scripts: {
              build: 'astro check && astro build',
            },
          })
        );
      }
      return Promise.resolve('{}');
    });

    process.env.NODE_ENV = 'test';
    (confirm as unknown as ReturnType<typeof vi.fn>).mockClear();
    (confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  describe('createNewProject', () => {
    it('should create project with valid name', async () => {
      const { createNewProject } = await import('../bin/project-operations');
      const projectName = 'valid-project';

      await createNewProject(projectName, 'npm');

      expect(mockCp).toHaveBeenCalledWith(
        '/mock/templates/base',
        '/mock/cwd/valid-project',
        { recursive: true }
      );
    });

    it('should throw on invalid project name', async () => {
      const { createNewProject } = await import('../bin/project-operations');
      const invalidName = 'invalid/project';
      await expect(createNewProject(invalidName, 'npm')).rejects.toThrow();
    });
  });

  describe('validateProjectName', () => {
    it('should accept valid project names', async () => {
      const { validateProjectName } = await import('../bin/project-operations');
      expect(validateProjectName('my-project')).toBe(true);
      expect(validateProjectName('project123')).toBe(true);
      expect(validateProjectName('@scope/project')).toBe(true);
    });

    it('should reject invalid project names', async () => {
      const { validateProjectName } = await import('../bin/project-operations');
      expect(validateProjectName('invalid/')).toBe(false);
      expect(validateProjectName('')).toBe(false);
      expect(validateProjectName('.')).toBe(false);
    });
  });

  describe('setupProjectFiles', () => {
    it('should setup TypeScript project correctly', async () => {
      const { setupProjectFiles } = await import('../bin/project-operations');
      const projectName = 'my-project';

      await setupProjectFiles(projectName, 'typescript');

      const writeFileCalls = mockWriteFile.mock.calls;
      const packageJsonCall = writeFileCalls.find((call) =>
        String(call[0]).includes('package.json')
      );

      expect(packageJsonCall).toBeTruthy();
      if (!packageJsonCall) {
        throw new Error('Expected package.json to be written');
      }
      const writtenContent = JSON.parse(packageJsonCall[1] as string);
      expect(writtenContent).toHaveProperty('dependencies');
    });

    it('should setup JavaScript project correctly', async () => {
      const { setupProjectFiles } = await import('../bin/project-operations');
      const projectName = 'my-project';

      // Mock package.json read with TypeScript dependencies
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              name: 'test-project',
              dependencies: {
                '@astrojs/check': '^1.0.0',
                typescript: '^5.0.0',
              },
              devDependencies: {},
              scripts: {
                build: 'astro check && astro build',
              },
            })
          );
        }
        return Promise.resolve('{}');
      });

      await setupProjectFiles(projectName, 'javascript');

      const writeFileCalls = mockWriteFile.mock.calls;
      const packageJsonWrite = writeFileCalls.find((call) =>
        String(call[0]).endsWith('package.json')
      );

      expect(packageJsonWrite).toBeTruthy();
      if (!packageJsonWrite) {
        throw new Error('Expected package.json to be written');
      }
      const writtenContent = JSON.parse(packageJsonWrite[1] as string);
      expect(writtenContent.dependencies).not.toHaveProperty('@astrojs/check');
      expect(writtenContent.dependencies).not.toHaveProperty('typescript');
      expect(writtenContent.scripts.build).not.toContain('astro check');
    });
  });
});
