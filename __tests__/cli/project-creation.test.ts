import { describe, it, expect, beforeEach, vi } from 'vitest';
import { confirm, input, select } from '@inquirer/prompts';
import { main } from '../../bin/cli';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock path to normalize separators
vi.mock('path', () => ({
  default: {
    join: (...args: string[]) => args.join('/').replace(/\\/g, '/'),
    dirname: vi.fn().mockReturnValue('/mock/bin'),
  },
  join: (...args: string[]) => args.join('/').replace(/\\/g, '/'),
  dirname: vi.fn().mockReturnValue('/mock/bin'),
}));

// Mock fs/promises with default export
vi.mock('node:fs/promises', () => {
  return {
    default: {
      access: vi.fn(),
      mkdir: vi.fn(),
      cp: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
    access: vi.fn(),
    mkdir: vi.fn(),
    cp: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
});

vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  input: vi.fn(),
  select: vi.fn(),
}));

// Mock fileURLToPath
vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.replace('file://', '')),
}));

// Mock process.cwd
vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');

describe('Project Creation', () => {
  let mockAccess: ReturnType<typeof vi.fn>;
  let mockMkdir: ReturnType<typeof vi.fn>;
  let mockCp: ReturnType<typeof vi.fn>;
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockAccess = vi.mocked(fs.access);
    mockMkdir = vi.mocked(fs.mkdir);
    mockCp = vi.mocked(fs.cp);
    mockReadFile = vi.mocked(fs.readFile);
    mockWriteFile = vi.mocked(fs.writeFile);

    process.env.NODE_ENV = 'test';
    vi.clearAllMocks();
    (confirm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (input as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      'new-project'
    );
    (select as unknown as ReturnType<typeof vi.fn>).mockResolvedValue('npm');
    mockAccess.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockCp.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('{}');
    mockWriteFile.mockResolvedValue(undefined);
  });

  it('should create a new project when no package.json exists', async () => {
    await main();

    expect(mockCp).toHaveBeenCalledWith(
      expect.stringMatching(/templates\/base$/),
      expect.stringMatching(/mock\/cwd\/new-project$/),
      { recursive: true }
    );
  });
});
