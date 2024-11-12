import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { input, select, confirm } from '@inquirer/prompts';
import fs from 'fs/promises';
import path from 'path';
import { readFile, writeFile } from 'fs/promises';
import { execSync } from 'child_process';
import { detect } from 'detect-package-manager';

// Import the type from cli.ts
type ExitPromptError = Error & {
  code?: string;
  exitCode?: number;
};

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

    // Add process.exit mock
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Add missing mock for fs.cp
    vi.mocked(fs.cp).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Project Creation', () => {
    it('should create a new project when no package.json exists', async () => {
      // Mock no package.json
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(select)
        .mockResolvedValueOnce('npm') // Package manager selection
        .mockResolvedValueOnce('typescript'); // Language selection

      const { main } = await import('../bin/cli');
      await main();

      // Update expectation to use BASE_TEMPLATE_PATH
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates/base'),
        expect.any(String),
        { recursive: true }
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Project created successfully!')
      );
    });

    it('should handle existing directory with overwrite confirmation', async () => {
      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('existing-project');
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(confirm).mockResolvedValueOnce(true);

      const { main } = await import('../bin/cli');
      await main();

      expect(fs.cp).toHaveBeenCalled();
    });

    it('should cancel when user declines overwrite', async () => {
      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('existing-project');
      vi.mocked(fs.access).mockResolvedValueOnce(undefined);
      vi.mocked(confirm).mockResolvedValueOnce(false);

      const { main } = await import('../bin/cli');
      await main();

      expect(fs.cp).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Operation cancelled');
    });
  });

  describe('Project Detection', () => {
    it('should detect complete Astro + Electron setup', async () => {
      // Mock package.json exists
      vi.mocked(fs.access).mockResolvedValue(undefined);

      // Mock package.json with complete setup
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
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
        return Promise.resolve(''); // For any other files
      });

      // Mock electron files exist
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          return Promise.resolve(undefined);
        }
        return Promise.resolve(undefined);
      });

      const { main } = await import('../bin/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith(
        '✨ Astro + Electron project detected!'
      );
    });

    it('should offer to configure Electron in existing Astro project', async () => {
      // Mock package.json exists with only Astro
      vi.mocked(fs.access).mockResolvedValue(undefined);

      // Mock hasPackageJson check
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(undefined);
        }
        // Mock electron files don't exist
        return Promise.reject(new Error('ENOENT'));
      });

      // Mock package.json with Astro only
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: { astro: '^1.0.0' },
            })
          );
        }
        return Promise.reject(new Error('ENOENT'));
      });

      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../bin/cli');
      await main();

      // Check for both messages in order
      expect(console.log).toHaveBeenCalledWith('✨ Astro project detected!');
      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('add Electron'),
        })
      );
    });

    it('should create new project when no Astro is detected', async () => {
      // Mock package.json exists but no Astro
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          dependencies: {},
        })
      );

      vi.mocked(input).mockResolvedValue('new-project');
      vi.mocked(select).mockResolvedValue('npm');

      const { main } = await import('../bin/cli');
      await main();

      expect(fs.cp).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Project created successfully!')
      );
    });

    it('should detect missing electron integration in config', async () => {
      // Mock package.json with electron but no integration in config
      vi.mocked(fs.access).mockResolvedValue(undefined);
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

      const { isElectronProject } = await import('../bin/cli');
      const result = await isElectronProject();

      expect(result).toBe(false);
    });

    it('should detect complete electron setup including integration', async () => {
      // Mock package.json and config with complete setup
      vi.mocked(fs.access).mockResolvedValue(undefined);
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

      const { isElectronProject } = await import('../bin/cli');
      const result = await isElectronProject();

      expect(result).toBe(true);
    });
  });

  describe('Package Manager Detection', () => {
    it('should use detected package manager without prompting if not npm', async () => {
      vi.mocked(detect).mockResolvedValue('pnpm');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // No package.json
      vi.mocked(input).mockResolvedValue('new-project');

      const { main } = await import('../bin/cli');
      await main();

      expect(select).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Which package manager would you like to use?',
        })
      );
    });

    it('should prompt for package manager when npm is detected', async () => {
      vi.mocked(detect).mockResolvedValue('npm');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // No package.json
      vi.mocked(input).mockResolvedValue('new-project');
      vi.mocked(select).mockResolvedValue('pnpm');

      const { main } = await import('../bin/cli');
      await main();

      expect(select).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Which package manager would you like to use?',
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle dependency installation errors', async () => {
      // Mock package.json exists with Astro
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );
      vi.mocked(confirm).mockResolvedValue(true);

      // Mock execSync to throw
      const installError = new Error('Installation failed');
      vi.mocked(execSync).mockImplementation(() => {
        throw installError;
      });

      const { main } = await import('../bin/cli');

      await main().catch(() => {
        console.error('Installation failed');
      });

      // Check for both error messages in order
      expect(console.error).toHaveBeenNthCalledWith(
        1,
        'Failed to install electron:',
        installError
      );
      expect(console.error).toHaveBeenNthCalledWith(
        2,
        'Error:',
        'Installation failed'
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('User Interruption', () => {
    it('should handle Ctrl+C gracefully during project selection', async () => {
      const exitError = new Error(
        'User force closed the prompt'
      ) as ExitPromptError;
      exitError.code = 'EXIT';
      vi.mocked(select).mockRejectedValueOnce(exitError);

      const { main } = await import('../bin/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith('\nOperation cancelled');
    });

    it('should handle Ctrl+C gracefully during confirmation', async () => {
      vi.mocked(select).mockResolvedValueOnce('add');
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );

      const exitError = new Error(
        'User force closed the prompt'
      ) as ExitPromptError;
      exitError.code = 'EXIT';
      vi.mocked(confirm).mockRejectedValueOnce(exitError);

      const { main } = await import('../bin/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith('\nOperation cancelled');
    });
  });

  describe('Electron Integration', () => {
    it('should add simple electron integration for TypeScript projects', async () => {
      // Mock package.json with TypeScript
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                typescript: '^4.0.0',
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
        return Promise.resolve('');
      });

      const { addElectronIntegration } = await import('../bin/cli');
      await addElectronIntegration();

      // Verify simple electron config is used
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('electron()'),
        expect.any(String)
      );
      // Verify no explicit path config is added
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.stringContaining('entry:'),
        expect.any(String)
      );
    });

    it('should add configured electron integration for JavaScript projects', async () => {
      // Mock package.json without TypeScript
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {},
            })
          );
        }
        if (path.toString().includes('astro.config')) {
          return Promise.resolve(`
            import { defineConfig } from 'astro/config';
            export default defineConfig({});
          `);
        }
        return Promise.resolve('');
      });

      const { addElectronIntegration } = await import('../bin/cli');
      await addElectronIntegration();

      // Verify full config with paths is used
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('electron/main.js'),
        expect.any(String)
      );
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('electron/preload.js'),
        expect.any(String)
      );
    });
  });

  describe('Package Installation', () => {
    it('should install same dependencies for both TypeScript and JavaScript projects', async () => {
      // Mock package.json with TypeScript
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
                typescript: '^4.0.0',
              },
            })
          );
        }
        return Promise.resolve('');
      });
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../bin/cli');
      await main();

      // Verify core dependencies are installed
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('electron'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('astro-electron-ts'),
        expect.any(Object)
      );
      // Verify only electron-builder is installed as dev dependency
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('-D electron-builder'),
        expect.any(Object)
      );
      // Verify @types/electron is NOT installed
      expect(execSync).not.toHaveBeenCalledWith(
        expect.stringContaining('@types/electron'),
        expect.any(Object)
      );
    });
  });

  describe('Template Selection', () => {
    it('should use TypeScript template when TypeScript is selected', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('new-project');
      vi.mocked(select)
        .mockResolvedValueOnce('npm')
        .mockResolvedValueOnce('typescript');

      // Mock package.json read for the new project
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().includes('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {},
              scripts: { build: 'astro check && astro build' },
            })
          );
        }
        return Promise.resolve('');
      });

      const { main } = await import('../bin/cli');
      await main();

      // Verify base template is copied
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates/base'),
        expect.any(String),
        { recursive: true }
      );

      // Verify TypeScript dependencies are kept
      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const packageJsonWrite = writeFileCalls.find((call) =>
        (call[0] as string).endsWith('package.json')
      );

      if (packageJsonWrite) {
        const content = JSON.parse(packageJsonWrite[1] as string);
        expect(content.dependencies['typescript']).toBeDefined();
        expect(content.scripts.build).toContain('astro check');
      }
    });

    it('should use JavaScript template when JavaScript is selected', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('new-project');
      vi.mocked(select)
        .mockResolvedValueOnce('npm')
        .mockResolvedValueOnce('javascript');

      // Mock package.json read for the new project
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().includes('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                '@astrojs/check': '^1.0.0',
                typescript: '^5.0.0',
              },
              scripts: { build: 'astro check && astro build' },
            })
          );
        }
        return Promise.resolve('');
      });

      const { main } = await import('../bin/cli');
      await main();

      // Verify base template is copied
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates/base'),
        expect.any(String),
        { recursive: true }
      );

      // Verify TypeScript dependencies are removed
      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const packageJsonWrite = writeFileCalls.find((call) =>
        (call[0] as string).endsWith('package.json')
      );

      if (packageJsonWrite) {
        const content = JSON.parse(packageJsonWrite[1] as string);
        expect(content.dependencies['typescript']).toBeUndefined();
        expect(content.dependencies['@astrojs/check']).toBeUndefined();
        expect(content.scripts.build).not.toContain('astro check');
      }
    });

    it('should handle template selection cancellation', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('new-project');

      // Mock the first select call (package manager) to succeed
      // and the second one (template type) to throw
      const exitError = new Error('User force closed the prompt');
      (exitError as any).code = 'EXIT';

      let selectCallCount = 0;
      vi.mocked(select).mockImplementation(() => {
        const promise = new Promise((resolve, reject) => {
          if (selectCallCount++ === 0) {
            resolve('npm');
          } else {
            reject(exitError);
          }
        });
        (promise as any).cancel = () => {}; // Add cancel method to the promise
        return promise as any;
      });

      const { main } = await import('../bin/cli');
      await main();

      expect(console.log).toHaveBeenCalledWith('\nOperation cancelled');
      expect(fs.cp).not.toHaveBeenCalled();
    });
  });

  describe('Template Path', () => {
    it('should use correct template path when creating new project', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('my-project');
      vi.mocked(select)
        .mockResolvedValueOnce('npm')
        .mockResolvedValueOnce('typescript');

      const { main } = await import('../bin/cli');
      await main();

      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates/base'),
        expect.any(String),
        { recursive: true }
      );
    });

    it('should copy base template when adding electron files', async () => {
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT');
        }
        return Promise.resolve(undefined);
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: { astro: '^1.0.0' },
            })
          );
        }
        return Promise.resolve('');
      });

      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../bin/cli');
      await main();

      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates/base'),
        expect.stringContaining('electron'),
        { recursive: true }
      );
    });
  });

  describe('Package.json Configuration', () => {
    it('should set main field to dist-electron/main.js', async () => {
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('package.json')) {
          return Promise.resolve(undefined);
        }
        return Promise.reject(new Error('ENOENT'));
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: { astro: '^1.0.0' },
            })
          );
        }
        return Promise.resolve('');
      });

      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../bin/cli');
      await main();

      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const lastWriteFileCall = writeFileCalls[writeFileCalls.length - 1];
      const writtenContent = JSON.parse(lastWriteFileCall[1] as string);
      expect(writtenContent.main).toBe('dist-electron/main.js');
    });
  });

  describe('JavaScript Project Setup', () => {
    it('should modify package.json for JavaScript projects', async () => {
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('my-project');
      vi.mocked(select)
        .mockResolvedValueOnce('npm')
        .mockResolvedValueOnce('javascript');

      // Mock initial package.json content
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().includes('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                '@astrojs/check': '^1.0.0',
                typescript: '^5.0.0',
              },
              scripts: {
                build: 'astro check && astro build',
              },
            })
          );
        }
        return Promise.resolve('');
      });

      const { main } = await import('../bin/cli');
      await main();

      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const packageJsonWrite = writeFileCalls.find((call) =>
        (call[0] as string).endsWith('package.json')
      );

      expect(
        packageJsonWrite,
        'No package.json write operation found'
      ).toBeTruthy();

      if (packageJsonWrite) {
        const content = JSON.parse(packageJsonWrite[1] as string);
        expect(content.dependencies['@astrojs/check']).toBeUndefined();
        expect(content.dependencies['typescript']).toBeUndefined();
        expect(content.scripts.build).not.toContain('astro check');
      }
    });
  });
});
