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
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Project Creation', () => {
    it('should create a new project when no package.json exists', async () => {
      // Mock no package.json
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(select).mockResolvedValueOnce('npm');

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

      const { main } = await import('../src/cli');
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

      const { main } = await import('../src/cli');
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

      const { main } = await import('../src/cli');
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

      const { isElectronProject } = await import('../src/cli');
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

      const { isElectronProject } = await import('../src/cli');
      const result = await isElectronProject();

      expect(result).toBe(true);
    });
  });

  describe('Package Manager Detection', () => {
    it('should use detected package manager without prompting if not npm', async () => {
      vi.mocked(detect).mockResolvedValue('pnpm');
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // No package.json
      vi.mocked(input).mockResolvedValue('new-project');

      const { main } = await import('../src/cli');
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

      // Mock hasPackageJson check
      vi.mocked(fs.access).mockRejectedValue(error);

      // Mock readFile to fail with permission error
      vi.mocked(readFile).mockRejectedValue(error);

      const { main } = await import('../src/cli');

      // The error should be thrown and logged
      await main();
      expect(console.error).toHaveBeenCalledWith('Error:', 'Permission denied');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

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

      const { main } = await import('../src/cli');

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

      const { main } = await import('../src/cli');
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

      const { main } = await import('../src/cli');
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

      const { addElectronIntegration } = await import('../src/cli');
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

      const { addElectronIntegration } = await import('../src/cli');
      await addElectronIntegration();

      // Verify full config with paths is used
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('/electron/main.js'),
        expect.any(String)
      );
      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('/electron/preload.js'),
        expect.any(String)
      );
    });
  });

  describe('Package Installation', () => {
    it('should install astro-electron-ts along with other dependencies', async () => {
      // Mock package.json exists with Astro
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          devDependencies: { astro: '^1.0.0' },
        })
      );
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      // Verify that both electron and astro-electron-ts are installed
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('electron'),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('astro-electron-ts'),
        expect.any(Object)
      );
    });

    it('should install TypeScript types for TypeScript projects', async () => {
      // Mock package.json with Astro and TypeScript
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
                typescript: '^4.0.0', // TypeScript project
              },
            })
          );
        }
        return Promise.resolve('');
      });
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      // Verify @types/electron is installed
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining('@types/electron'),
        expect.any(Object)
      );
    });

    it('should not install TypeScript types for JavaScript projects', async () => {
      // Mock package.json with Astro but no TypeScript
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0', // JavaScript project (no TypeScript)
              },
            })
          );
        }
        return Promise.resolve('');
      });
      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      // Verify @types/electron is not installed
      expect(execSync).not.toHaveBeenCalledWith(
        expect.stringContaining('@types/electron'),
        expect.any(Object)
      );
    });
  });

  describe('Template Selection', () => {
    it('should use TypeScript template when TypeScript is selected', async () => {
      // Mock no package.json
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('new-project');
      vi.mocked(select).mockImplementation((options: any) => {
        const promise = Promise.resolve(
          options.message.includes('package manager')
            ? 'npm'
            : options.message.includes('language')
            ? 'typescript'
            : ''
        ) as Promise<string> & { cancel: () => void };
        promise.cancel = () => {};
        return promise;
      });

      const { main } = await import('../src/cli');
      await main();

      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('typescript'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use JavaScript template when JavaScript is selected', async () => {
      // Mock no package.json
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('new-project');
      vi.mocked(select).mockImplementation((options: any) => {
        const promise = Promise.resolve(
          options.message.includes('package manager')
            ? 'npm'
            : options.message.includes('language')
            ? 'javascript'
            : ''
        ) as Promise<string> & { cancel: () => void };
        promise.cancel = () => {};
        return promise;
      });

      const { main } = await import('../src/cli');
      await main();

      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('javascript'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should default to TypeScript when selection is cancelled', async () => {
      // Mock no package.json
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValue('new-project');

      // Track which prompt is being called
      let promptCount = 0;
      vi.mocked(select).mockImplementation(() => {
        promptCount++;
        if (promptCount === 1) {
          // First prompt is package manager
          const promise = Promise.resolve('npm') as Promise<string> & {
            cancel: () => void;
          };
          promise.cancel = () => {};
          return promise;
        } else {
          // Second prompt is language selection - simulate cancellation
          const error = new Error('User force closed the prompt');
          (error as any).code = 'EXIT';
          return Promise.reject(error) as Promise<string> & {
            cancel: () => void;
          };
        }
      });

      const { main } = await import('../src/cli');
      await main();

      // Verify the template was copied with typescript
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('typescript'),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Template Path', () => {
    it('should use correct template path when creating new project', async () => {
      // Mock no package.json
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(select).mockResolvedValueOnce('npm');

      const { main } = await import('../src/cli');
      await main();

      // Verify template path includes 'templates' directory
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining('templates'),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use correct template path when adding electron files', async () => {
      // Mock package.json with Astro but no Electron
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined); // Other files exist
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: { astro: '^1.0.0' },
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

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select).mockResolvedValue('npm');

      const { main } = await import('../src/cli');
      await main();

      // Update expectation to match the actual path structure
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining(
          path.join('templates', 'javascript', 'electron')
        ),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use correct electron files based on project type', async () => {
      // Mock package.json with Astro and TypeScript
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined); // Other files exist
      });

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
        if (path.toString().includes('astro.config')) {
          return Promise.resolve(`
            import { defineConfig } from 'astro/config';
            export default defineConfig({});
          `);
        }
        return Promise.resolve('');
      });

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select).mockResolvedValue('npm');

      const { main } = await import('../src/cli');
      await main();

      // Verify typescript electron files are copied
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining(
          path.join('templates', 'typescript', 'electron')
        ),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use javascript electron files for js projects', async () => {
      // Mock package.json with Astro but no TypeScript
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined); // Other files exist
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: { astro: '^1.0.0' },
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

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select).mockResolvedValue('npm');

      const { main } = await import('../src/cli');
      await main();

      // Verify javascript electron files are copied
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining(
          path.join('templates', 'javascript', 'electron')
        ),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use correct template path when adding electron files to TypeScript project', async () => {
      // Mock package.json with Astro and TypeScript
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined); // Other files exist
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
                typescript: '^4.0.0', // TypeScript project
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

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select).mockResolvedValue('npm');

      const { main } = await import('../src/cli');
      await main();

      // Verify TypeScript electron files are copied
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining(
          path.join('templates', 'typescript', 'electron')
        ),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should use correct template path when adding electron files to JavaScript project', async () => {
      // Mock package.json with Astro but no TypeScript
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined); // Other files exist
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
                // No TypeScript = JavaScript project
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

      vi.mocked(confirm).mockResolvedValue(true);
      vi.mocked(select).mockResolvedValue('npm');

      const { main } = await import('../src/cli');
      await main();

      // Verify JavaScript electron files are copied
      expect(fs.cp).toHaveBeenCalledWith(
        expect.stringContaining(
          path.join('templates', 'javascript', 'electron')
        ),
        expect.any(String),
        expect.any(Object)
      );
    });
  });

  describe('Package.json Configuration', () => {
    it('should set correct main field for TypeScript projects', async () => {
      // Mock package.json with TypeScript
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined);
      });

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
        if (path.toString().includes('astro.config')) {
          return Promise.resolve(`
            import { defineConfig } from 'astro/config';
            export default defineConfig({});
          `);
        }
        return Promise.resolve('');
      });

      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      // Get the last writeFile call arguments
      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const lastWriteFileCall = writeFileCalls[writeFileCalls.length - 1];

      // Parse the JSON to verify the main field
      const writtenContent = JSON.parse(lastWriteFileCall[1] as string);
      expect(writtenContent.main).toBe('dist-electron/main.js');
    });

    it('should set correct main field for JavaScript projects', async () => {
      // Mock package.json without TypeScript
      vi.mocked(fs.access).mockImplementation((path) => {
        if (path.toString().includes('electron/')) {
          throw new Error('ENOENT'); // Make electron files not exist
        }
        return Promise.resolve(undefined);
      });

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().endsWith('package.json')) {
          return Promise.resolve(
            JSON.stringify({
              dependencies: {
                astro: '^1.0.0',
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

      vi.mocked(confirm).mockResolvedValue(true);

      const { main } = await import('../src/cli');
      await main();

      // Get the last writeFile call arguments
      const writeFileCalls = vi.mocked(writeFile).mock.calls;
      const lastWriteFileCall = writeFileCalls[writeFileCalls.length - 1];

      // Parse the JSON to verify the main field
      const writtenContent = JSON.parse(lastWriteFileCall[1] as string);
      expect(writtenContent.main).toBe('electron/main.js');
    });
  });
});
