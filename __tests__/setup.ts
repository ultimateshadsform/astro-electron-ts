import { vi } from 'vitest';
import { Readable, Writable, Duplex } from 'stream';
import path from 'path';

// Mock all external modules used across tests
vi.mock('fs/promises', () => ({
  access: vi.fn(),
  cp: vi.fn(),
  readFile: vi.fn().mockResolvedValue(
    JSON.stringify({
      name: 'test-project',
      dependencies: {},
      devDependencies: {},
      scripts: {},
    })
  ),
  writeFile: vi.fn(),
}));

// Mock path with all required methods
vi.mock('path', async (importOriginal) => {
  const actual = (await importOriginal()) as typeof path;
  return {
    ...actual,
    join: vi.fn((...args: string[]) => args.join('/')),
    dirname: vi.fn((p: string) => p.split('/').slice(0, -1).join('/')),
    relative: vi.fn((_from: string, to: string) => to),
    resolve: vi.fn((...args: string[]) => args.join('/')),
  };
});

vi.mock('@inquirer/prompts', () => ({
  input: vi.fn(),
  select: vi.fn(),
  confirm: vi.fn(),
}));

// Create base mock process for execa
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

// Mock execa with proper error handling
vi.mock('execa', () => ({
  execa: vi.fn().mockImplementation(() => {
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
      message: '',
    };
    const promise = Promise.resolve(execaResult);
    return Object.assign(promise, mockProcess);
  }),
}));

vi.mock('detect-package-manager', () => ({
  detect: vi.fn().mockResolvedValue('npm'),
}));

// Mock URL and import.meta
vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.replace('file://', '')),
}));

// Mock process.cwd()
vi.spyOn(process, 'cwd').mockImplementation(() => '/mock/cwd');

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock process.exit
vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
