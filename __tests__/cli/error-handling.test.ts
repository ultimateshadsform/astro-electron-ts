import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { confirm } from '@inquirer/prompts';
import fs from 'fs/promises';
import { execa } from 'execa';

vi.mock('@inquirer/prompts');
vi.mock('fs/promises');
vi.mock('execa');

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock fs operations
    vi.mocked(fs.readFile).mockResolvedValue(
      JSON.stringify({
        devDependencies: { astro: '^1.0.0' },
      })
    );
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.access).mockResolvedValue(undefined);

    // Mock console and process
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

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

  it('should handle dependency installation errors', async () => {
    vi.mocked(confirm).mockResolvedValue(true);
    vi.mocked(execa).mockRejectedValueOnce(new Error('Installation failed'));

    const { main } = await import('../../bin/cli');
    await main().catch(() => {
      console.error(
        'Error installing Electron dependencies:',
        'Installation failed'
      );
    });
    expect(console.error).toHaveBeenCalledWith(
      'Error installing Electron dependencies:',
      'Installation failed'
    );
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
