import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { input, select } from '@inquirer/prompts';
import fs from 'fs/promises';
import { detect } from 'detect-package-manager';

vi.mock('@inquirer/prompts');
vi.mock('fs/promises');
vi.mock('detect-package-manager');

describe('Package Manager Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock fs.access to simulate no existing package.json
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    // Mock input for project name
    vi.mocked(input).mockResolvedValue('new-project');

    // Mock project checks
    vi.mock('../../bin/project-checks', () => ({
      isAstroProject: vi.fn().mockResolvedValue(false),
      isElectronProject: vi.fn().mockResolvedValue(false),
      hasMainField: vi.fn().mockResolvedValue(false),
      hasPackageJson: vi.fn().mockResolvedValue(false),
      isJavaScriptProject: vi.fn().mockResolvedValue(false),
    }));
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should use detected package manager without prompting if not npm', async () => {
    vi.mocked(detect).mockResolvedValue('pnpm');
    vi.mocked(select).mockResolvedValueOnce('typescript'); // Only language prompt

    const { main } = await import('../../bin/cli');
    await main();

    // Get all calls to select
    const selectCalls = vi.mocked(select).mock.calls;
    expect(selectCalls).toHaveLength(1); // Should only have language prompt
    expect(selectCalls[0][0].message).toBe(
      'Which language would you like to use?'
    );
  });

  it('should prompt for package manager when npm is detected', async () => {
    vi.mocked(detect).mockResolvedValue('npm');
    vi.mocked(select)
      .mockResolvedValueOnce('typescript')
      .mockResolvedValueOnce('npm');

    const { main } = await import('../../bin/cli');
    await main();

    expect(select).toHaveBeenCalledTimes(2);
    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Which package manager would you like to use?',
      })
    );
  });
});
