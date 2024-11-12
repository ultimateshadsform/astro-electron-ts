import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { input, select, confirm } from '@inquirer/prompts';
import fs from 'fs/promises';
import path from 'path';

// Mock external modules
vi.mock('@inquirer/prompts');
vi.mock('fs/promises');
vi.mock('path');

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});

describe('CLI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modules before each test
    vi.resetModules();
    // Mock path.join to return predictable paths
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
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
      process.env.npm_config_user_agent = 'bun/1.0.0';

      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('bun install')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('bun run dev')
      );
    });

    it('should detect pnpm', async () => {
      process.env.npm_config_user_agent = 'pnpm/7.0.0';

      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('pnpm install')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('pnpm run dev')
      );
    });

    it('should detect Yarn', async () => {
      process.env.npm_config_user_agent = 'yarn/3.0.0';

      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('yarn')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('yarn dev')
      );
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
      process.env.npm_config_user_agent = 'npm/8.0.0';

      vi.mocked(select).mockResolvedValueOnce('add');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('npm install electron')
      );
    });

    it('should use correct install command for yarn', async () => {
      process.env.npm_config_user_agent = 'yarn/3.0.0';

      vi.mocked(select).mockResolvedValueOnce('add');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('yarn add electron')
      );
    });

    it('should use correct install command for pnpm', async () => {
      process.env.npm_config_user_agent = 'pnpm/7.0.0';

      vi.mocked(select).mockResolvedValueOnce('add');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('pnpm add electron')
      );
    });

    it('should use correct install command for bun', async () => {
      process.env.npm_config_user_agent = 'bun/1.0.0';

      vi.mocked(select).mockResolvedValueOnce('add');
      vi.mocked(confirm).mockResolvedValueOnce(true);
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('bun add electron')
      );
    });

    it('should use correct run command for npm', async () => {
      process.env.npm_config_user_agent = 'npm/8.0.0';

      vi.mocked(select).mockResolvedValueOnce('create');
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
      process.env.npm_config_user_agent = 'yarn/3.0.0';

      vi.mocked(select).mockResolvedValueOnce('create');
      vi.mocked(input).mockResolvedValueOnce('my-project');
      vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
      vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

      const { main } = await import('../src/cli');
      await main();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('yarn dev')
      );
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
    vi.mocked(select).mockResolvedValueOnce('add');
    vi.mocked(confirm).mockResolvedValueOnce(true); // User confirms adding Electron
    vi.mocked(fs.cp).mockResolvedValueOnce(undefined);

    const { main } = await import('../src/cli');
    await main();

    expect(confirm).toHaveBeenCalledWith({
      message:
        'This will add Electron to your existing Astro project. Continue?',
      default: true,
    });
    expect(fs.cp).toHaveBeenCalled();
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('Electron added to your project!')
    );
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
