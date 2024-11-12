import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { input, select, confirm } from '@inquirer/prompts';
import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';

vi.mock('@inquirer/prompts');
vi.mock('fs/promises');
vi.mock('path');
vi.mock('execa');

describe('Project Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock path.join
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));

    // Mock fs operations
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({
        name: 'test-project',
        dependencies: {},
        scripts: {},
      })
    );
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.cp).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT')); // Default to file not existing

    // Mock console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock execa
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      failed: false,
      killed: false,
      signal: null,
      command: '',
      timedOut: false,
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create a new project when no package.json exists', async () => {
    vi.mocked(fs.access).mockRejectedValueOnce(new Error('ENOENT'));
    vi.mocked(input).mockResolvedValueOnce('my-project');
    vi.mocked(select)
      .mockResolvedValueOnce('npm')
      .mockResolvedValueOnce('typescript');

    const { main } = await import('../../bin/cli');
    await main();

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
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);
    vi.mocked(confirm).mockResolvedValueOnce(true);
    vi.mocked(input).mockResolvedValueOnce('existing-project');
    vi.mocked(select)
      .mockResolvedValueOnce('npm')
      .mockResolvedValueOnce('typescript');

    const { main } = await import('../../bin/cli');
    await main();

    expect(fs.cp).toHaveBeenCalled();
  });
});
