import { describe, it, expect, beforeEach, vi } from 'vitest';
import { main } from '../../bin/cli';
import { confirm, input, select } from '@inquirer/prompts';
import fs from 'node:fs/promises';

// Mock utils module
vi.mock('../../bin/utils', () => ({
  isTest: () => true,
  isExitPromptError: (error: unknown) => false,
  getPackageManager: vi.fn().mockResolvedValue('npm'),
  getRunCommand: vi.fn().mockReturnValue('npm run dev'),
  getInstallCommand: vi.fn().mockReturnValue('npm install'),
}));

// Mock project-operations
vi.mock('../../bin/project-operations', () => ({
  createNewProject: vi.fn().mockImplementation(async () => {
    throw new Error('Installation failed');
  }),
}));

// Mock project checks to trigger new project creation path
vi.mock('../../bin/project-checks', () => ({
  isAstroProject: vi.fn().mockResolvedValue(false),
  isElectronProject: vi.fn().mockResolvedValue(false),
  hasMainField: vi.fn().mockResolvedValue(false),
  isJavaScriptProject: vi.fn().mockResolvedValue(false),
  hasElectronFiles: vi.fn().mockResolvedValue(false),
}));

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  input: vi.fn().mockResolvedValue('test-project'),
  select: vi.fn().mockResolvedValue('npm'),
}));

describe('Error Handling', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    vi.clearAllMocks();
  });

  it('should handle dependency installation errors', async () => {
    const mockExit = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    const mockConsoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    // The error should be thrown and caught
    await expect(main()).rejects.toThrow('Installation failed');

    expect(mockConsoleError).toHaveBeenCalledWith(
      'Failed to run CLI:',
      'Installation failed'
    );

    // process.exit should not be called in test mode
    expect(mockExit).not.toHaveBeenCalled();

    mockExit.mockRestore();
    mockConsoleError.mockRestore();
  });
});
