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
vi.mock('detect-package-manager', () => ({
  detect: vi.fn().mockResolvedValue('npm'),
}));

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    // Mock readFile to return valid package.json content
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        name: 'test-project',
        scripts: {
          dev: 'astro dev',
        },
      })
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Package Manager Detection', () => {
    beforeEach(() => {
      // Clear the user agent before each test
      delete process.env.npm_config_user_agent;
    });

    it('should default to npm when no user agent is present', async () => {
      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npm install')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npm run dev')
      );
    });

    it('should detect Bun', async () => {
      vi.mocked(detect).mockResolvedValueOnce('bun');

      const selectMock = vi.mocked(select);
      selectMock.mockResolvedValueOnce('create').mockResolvedValueOnce('bun');

      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const consoleOutput = mockConsoleLog.mock.calls
        .map((call) => call[0])
        .join('\n');
      expect(consoleOutput).toContain('bun install');
      expect(consoleOutput).toContain('bun run dev');
    });

    it('should detect pnpm', async () => {
      vi.mocked(detect).mockResolvedValueOnce('pnpm');

      const selectMock = vi.mocked(select);
      selectMock.mockResolvedValueOnce('create').mockResolvedValueOnce('pnpm');

      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const consoleOutput = mockConsoleLog.mock.calls
        .map((call) => call[0])
        .join('\n');
      expect(consoleOutput).toContain('pnpm install');
      expect(consoleOutput).toContain('pnpm run dev');
    });

    it('should detect Yarn', async () => {
      vi.mocked(detect).mockResolvedValueOnce('yarn');

      const selectMock = vi.mocked(select);
      selectMock.mockResolvedValueOnce('create').mockResolvedValueOnce('yarn');

      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const consoleOutput = mockConsoleLog.mock.calls
        .map((call) => call[0])
        .join('\n');
      expect(consoleOutput).toContain('yarn');
      expect(consoleOutput).toContain('yarn dev');
    });

    it('should default to npm', async () => {
      process.env.npm_config_user_agent = 'something-else/1.0.0';

      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npm install')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npm run dev')
      );
    });

    it('should use correct install command for npm', async () => {
      vi.mocked(detect).mockResolvedValueOnce('npm');
      vi.mocked(select)
        .mockResolvedValueOnce('add')
        .mockResolvedValueOnce('npm');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const execSyncMock = vi.mocked(execSync);
      expect(execSyncMock).toHaveBeenCalledWith(
        'npm install electron',
        expect.any(Object)
      );
    });

    it('should use correct install command for yarn', async () => {
      vi.mocked(detect).mockResolvedValueOnce('yarn');
      vi.mocked(select)
        .mockResolvedValueOnce('add')
        .mockResolvedValueOnce('yarn');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const execSyncMock = vi.mocked(execSync);
      expect(execSyncMock).toHaveBeenCalledWith(
        'yarn add electron',
        expect.any(Object)
      );
    });

    it('should use correct install command for pnpm', async () => {
      vi.mocked(detect).mockResolvedValueOnce('pnpm');
      vi.mocked(select)
        .mockResolvedValueOnce('add')
        .mockResolvedValueOnce('pnpm');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const execSyncMock = vi.mocked(execSync);
      expect(execSyncMock).toHaveBeenCalledWith(
        'pnpm add electron',
        expect.any(Object)
      );
    });

    it('should use correct install command for bun', async () => {
      vi.mocked(detect).mockResolvedValueOnce('bun');
      vi.mocked(select)
        .mockResolvedValueOnce('add')
        .mockResolvedValueOnce('bun');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      const execSyncMock = vi.mocked(execSync);
      expect(execSyncMock).toHaveBeenCalledWith(
        'bun add electron',
        expect.any(Object)
      );
    });

    it('should use correct run command for npm', async () => {
      vi.mocked(detect).mockResolvedValueOnce('npm');
      vi.mocked(select)
        .mockResolvedValueOnce('create')
        .mockResolvedValueOnce('npm');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npm run dev')
      );
    });

    it('should use correct run command for yarn', async () => {
      vi.mocked(detect).mockResolvedValueOnce('yarn');

      // Mock both select calls explicitly
      const selectMock = vi.mocked(select);
      selectMock
        .mockResolvedValueOnce('create') // First call - action selection
        .mockResolvedValueOnce('yarn'); // Second call - package manager selection

      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      // Check the actual console output
      const consoleOutput = mockConsoleLog.mock.calls.join('\n');
      expect(consoleOutput).toContain('yarn dev');
    });
  });

  it('should create a new project successfully', async () => {
    // Mock user inputs
    vi.mocked(select).mockResolvedValueOnce('create');
    vi.mocked(input).mockResolvedValueOnce('my-project');
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT')); // Directory doesn't exist
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

    const { main } = await import('../src/cli');
    await main();

    expect(select).toHaveBeenCalledWith({
      message: 'What would you like to do?',
      choices: [
        { value: 'create', name: 'Create new Astro + Electron project' },
        { value: 'add', name: 'Add Electron to existing Astro project' },
      ],
    });

    expect(input).toHaveBeenCalledWith({
      message: 'What is your project name?',
      default: 'astro-electron-app',
    });

    expect(fs.cp).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Project created successfully!')
    );
  });

  it('should handle existing directory with overwrite confirmation', async () => {
    vi.mocked(select).mockResolvedValueOnce('create');
    vi.mocked(input).mockResolvedValueOnce('existing-project');
    vi.mocked(fs.access).mockResolvedValueOnce(undefined); // Directory exists
    vi.mocked(confirm).mockResolvedValueOnce(true); // User confirms overwrite
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

    const { main } = await import('../src/cli');
    await main();

    expect(confirm).toHaveBeenCalledWith({
      message: 'Directory already exists. Overwrite?',
      default: false,
    });
    expect(fs.cp).toHaveBeenCalled();
  });

  it('should cancel operation when user declines overwrite', async () => {
    vi.mocked(select).mockResolvedValueOnce('create');
    vi.mocked(input).mockResolvedValueOnce('existing-project');
    vi.mocked(fs.access).mockResolvedValueOnce(undefined); // Directory exists
    vi.mocked(confirm).mockResolvedValueOnce(false); // User declines overwrite

    const { main } = await import('../src/cli');
    await main();

    expect(mockConsoleLog).toHaveBeenCalledWith('Operation cancelled');
    expect(fs.cp).not.toHaveBeenCalled();
  });

  it('should add Electron to existing project', async () => {
    // Mock both select calls explicitly
    const selectMock = vi.mocked(select);
    selectMock
      .mockResolvedValueOnce('add') // First call - action selection
      .mockResolvedValueOnce('npm'); // Second call - package manager selection

    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

    const { main } = await import('../src/cli');
    await main();

    expect(confirm).toHaveBeenCalledWith({
      message:
        'This will add Electron to your existing Astro project. Continue?',
      default: true,
    });
  });

  it('should handle file system errors gracefully', async () => {
    vi.mocked(select).mockResolvedValueOnce('create');
    vi.mocked(input).mockResolvedValueOnce('my-project');
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(fs.cp).mockRejectedValueOnce(new Error('Permission denied'));

    const { main } = await import('../src/cli');

    await expect(main()).rejects.toThrow('Permission denied');

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Error copying template:',
      'Permission denied'
    );
  });
});

describe('Adding Electron to existing project', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.npm_config_user_agent;

    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({
        name: 'test-project',
        scripts: {
          dev: 'astro dev',
        },
      })
    );
    vi.mocked(writeFile).mockResolvedValue(undefined);
    vi.mocked(execSync).mockImplementation(() => Buffer.from(''));
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
  });

  it('should modify package.json and install dependencies', async () => {
    // Set npm as the package manager
    process.env.npm_config_user_agent = 'npm/8.0.0';

    vi.mocked(select).mockResolvedValueOnce('add');
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

    const { main } = await import('../src/cli');
    await main();

    // Check if package.json was modified correctly
    const writeCalls = vi.mocked(writeFile).mock.calls;
    expect(writeCalls[0][1]).toContain('dist-electron/main.js');

    // Verify dependency installation commands
    const execCalls = vi.mocked(execSync).mock.calls;
    expect(execCalls[0][0]).toBe('npm install electron');
    expect(execCalls[1][0]).toBe('npm install -D @types/electron');
    expect(execCalls[2][0]).toBe('npm install -D electron-builder');
  });

  it('should handle package.json read error', async () => {
    vi.mocked(select).mockResolvedValueOnce('add');
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);
    vi.mocked(readFile).mockRejectedValueOnce(
      new Error('Failed to read package.json')
    );

    const { main } = await import('../src/cli');
    await expect(main()).rejects.toThrow('Failed to read package.json');
  });

  it('should handle dependency installation errors', async () => {
    vi.mocked(select).mockResolvedValueOnce('add');
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);
    vi.mocked(execSync).mockImplementationOnce(() => {
      throw new Error('Failed to install dependency');
    });

    const { main } = await import('../src/cli');
    await expect(main()).rejects.toThrow('Failed to install dependency');
  });

  it('should use correct package manager for installations', async () => {
    // Mock both select calls explicitly
    const selectMock = vi.mocked(select);
    selectMock
      .mockResolvedValueOnce('add') // First call - action selection
      .mockResolvedValueOnce('yarn'); // Second call - package manager selection

    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

    const { main } = await import('../src/cli');
    await main();

    const execCalls = vi.mocked(execSync).mock.calls;
    expect(execCalls[0][0]).toBe('yarn add electron');
    expect(execCalls[1][0]).toBe('yarn add -D @types/electron');
    expect(execCalls[2][0]).toBe('yarn add -D electron-builder');
  });

  it('should handle package.json write error', async () => {
    vi.mocked(select).mockResolvedValueOnce('add');
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);
    vi.mocked(writeFile).mockRejectedValueOnce(
      new Error('Failed to write package.json')
    );

    const { main } = await import('../src/cli');
    await expect(main()).rejects.toThrow('Failed to write package.json');
  });
});
