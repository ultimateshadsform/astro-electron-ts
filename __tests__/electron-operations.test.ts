import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ResultPromise, Options } from 'execa';
import { Readable, Writable, Duplex } from 'stream';

// Set up all mocks before any imports
vi.mock('fs/promises');
vi.mock('path');
vi.mock('@inquirer/prompts');
vi.mock('execa');

// Now import the mocked modules
import { access, cp } from 'fs/promises';
import path from 'path';
import { confirm } from '@inquirer/prompts';
import { execa } from 'execa';

// Create base mock process properties
const createMockProcess = (overrides = {}) => ({
  killed: false,
  connected: false,
  exitCode: 0,
  signalCode: null,
  pid: 123,
  stdin: new Writable({ write: () => true }),
  stdout: new Readable({ read: () => {} }),
  stderr: new Readable({ read: () => {} }),
  stdio: [
    new Writable({ write: () => true }),
    new Readable({ read: () => {} }),
    new Readable({ read: () => {} }),
    new Readable({ read: () => {} }),
    new Readable({ read: () => {} }),
  ],
  all: undefined,
  kill: vi.fn(),
  [Symbol.dispose]: () => {},
  [Symbol.asyncIterator]: vi.fn(),
  pipe: vi.fn(),
  spawnargs: [],
  spawnfile: '',
  send: vi.fn(),
  disconnect: vi.fn(),
  unref: vi.fn(),
  ref: vi.fn(),
  iterable: vi.fn(),
  readable: new Readable({ read: () => {} }),
  writable: new Writable({ write: () => true }),
  duplex: new Duplex({ read: () => {}, write: () => true }),
  // Add EventEmitter methods
  addListener: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  prependListener: vi.fn(),
  prependOnceListener: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn(),
  setMaxListeners: vi.fn(),
  getMaxListeners: vi.fn(),
  listeners: vi.fn(),
  rawListeners: vi.fn(),
  listenerCount: vi.fn(),
  eventNames: vi.fn(),
  off: vi.fn(),
  ...overrides,
});

describe('Electron Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Mock implementations
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(access).mockResolvedValue(undefined);
    vi.mocked(cp).mockResolvedValue(undefined);
    vi.mocked(confirm).mockResolvedValue(true);

    // Mock execa with a proper implementation
    vi.mocked(execa).mockImplementation(() => {
      const mockProcess = createMockProcess();
      const execaResult = {
        command: '',
        escapedCommand: '',
        exitCode: 0,
        stdout: '',
        stderr: '',
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false,
        signal: undefined,
      };
      const promise = Promise.resolve(execaResult);
      return Object.assign(
        promise,
        mockProcess
      ) as unknown as ResultPromise<Options>;
    });

    // Mock console
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('installElectronDependencies', () => {
    it('should install correct dependencies with npm', async () => {
      const { installElectronDependencies } = await import(
        '../bin/electron-operations'
      );
      await installElectronDependencies('npm');

      const execaMock = vi.mocked(execa);
      expect(execaMock).toHaveBeenCalledWith(
        'npm',
        ['install', 'electron', 'astro-electron-ts'],
        expect.any(Object)
      );
      expect(execaMock).toHaveBeenCalledWith(
        'npm',
        ['install', '--save-dev', 'electron-builder'],
        expect.any(Object)
      );
    });

    it('should handle installation errors', async () => {
      // Mock execa to reject for this test
      vi.mocked(execa).mockImplementationOnce(() => {
        const mockProcess = createMockProcess({
          exitCode: 1,
          stdio: [
            new Writable({ write: () => true }),
            new Readable({ read: () => {} }),
            new Readable({ read: () => {} }),
            new Readable({ read: () => {} }),
            new Readable({ read: () => {} }),
          ] as const,
        });
        const execaError = new Error('Installation failed');
        Object.assign(execaError, {
          command: '',
          escapedCommand: '',
          exitCode: 1,
          stdout: '',
          stderr: '',
          failed: true,
          timedOut: false,
          isCanceled: false,
          killed: false,
          signal: undefined,
          name: 'ExecaError',
          shortMessage: 'Installation failed',
        });
        const promise = Promise.reject(execaError);
        return Object.assign(
          promise,
          mockProcess
        ) as unknown as ResultPromise<Options>;
      });

      const { installElectronDependencies } = await import(
        '../bin/electron-operations'
      );
      await expect(installElectronDependencies('npm')).rejects.toThrow(
        'Installation failed'
      );

      expect(console.error).toHaveBeenCalledWith(
        'Error installing Electron dependencies:',
        'Installation failed'
      );
    });
  });

  describe('hasElectronFiles', () => {
    it('should return true when all files exist', async () => {
      vi.mocked(access).mockResolvedValue(undefined);

      const { hasElectronFiles } = await import('../bin/electron-operations');
      const result = await hasElectronFiles();

      expect(result).toBe(true);
    });

    it('should return false when files are missing', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const { hasElectronFiles } = await import('../bin/electron-operations');
      const result = await hasElectronFiles();

      expect(result).toBe(false);
    });
  });

  describe('copyElectronFiles', () => {
    it('should copy files when directory does not exist', async () => {
      vi.mocked(access).mockRejectedValueOnce(new Error('ENOENT'));

      const { copyElectronFiles } = await import('../bin/electron-operations');
      await copyElectronFiles('test-path');

      expect(vi.mocked(cp)).toHaveBeenCalledWith(
        expect.stringContaining('electron'),
        expect.stringContaining('test-path/electron'),
        { recursive: true }
      );
    });

    it('should skip copy when user declines overwrite', async () => {
      vi.mocked(confirm).mockResolvedValue(false);

      const { copyElectronFiles } = await import('../bin/electron-operations');
      await copyElectronFiles('test-path');

      expect(vi.mocked(cp)).not.toHaveBeenCalled();
    });

    it('should copy files when user confirms overwrite', async () => {
      vi.mocked(confirm).mockResolvedValue(true);

      const { copyElectronFiles } = await import('../bin/electron-operations');
      await copyElectronFiles('test-path');

      expect(vi.mocked(cp)).toHaveBeenCalledWith(
        expect.stringContaining('electron'),
        expect.stringContaining('test-path/electron'),
        { recursive: true }
      );
    });
  });
});
