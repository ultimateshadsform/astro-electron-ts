import { vi } from 'vitest';

const { mockReadFile, mockWriteFile } = vi.hoisted(() => {
  return {
    mockReadFile: vi.fn().mockResolvedValue('test content'),
    mockWriteFile: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
  },
  readFile: mockReadFile,
  writeFile: mockWriteFile,
}));

// Now we can import everything else
import { describe, it, expect, beforeEach } from 'vitest';
import { integration } from '../src/integration';
import type { AstroConfig, AstroIntegrationLogger, RouteData } from 'astro';

// Define our own LogMessage interface for testing purposes
interface LogMessage {
  type: string;
  message: string;
  [key: string]: any;
}

describe('astro-electron integration', () => {
  let mockUpdateConfig: ReturnType<typeof vi.fn>;
  let mockConfig: AstroConfig;
  let mockLogger: AstroIntegrationLogger;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    mockReadFile.mockClear();
    mockWriteFile.mockClear();

    mockUpdateConfig = vi.fn();
    mockConfig = {
      vite: {},
    } as AstroConfig;

    // Create a mock writable destination
    const mockDest = {
      write: vi.fn().mockImplementation((message: LogMessage) => {
        console.log(message);
        return Promise.resolve();
      }),
      [Symbol.for('astro.logger.writable')]: true,
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      options: {
        dest: mockDest,
        level: 'info',
      },
      label: 'astro-electron-ts',
      fork: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        options: {
          dest: mockDest,
          level: 'info',
        },
        label: 'astro-electron-ts',
        fork: vi.fn(),
      }),
    };
  });

  it('should have the correct name', () => {
    const electronIntegration = integration();
    expect(electronIntegration.name).toBe('astro-electron-ts');
  });

  describe('astro:config:setup hook', () => {
    it('should set base path during build command', () => {
      const electronIntegration = integration();
      const setupHook = electronIntegration.hooks['astro:config:setup'];

      if (!setupHook) throw new Error('Setup hook not defined');

      setupHook({
        config: mockConfig,
        command: 'build',
        updateConfig: mockUpdateConfig,
        isRestart: false,
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
        addClientDirective: vi.fn(),
        addMiddleware: vi.fn(),
        addDevToolbarApp: vi.fn(),
        addDevOverlayPlugin: vi.fn(),
      });

      expect(mockUpdateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          base: '/astro-electron-ts',
        })
      );
    });

    it('should use default electron entry points when no config provided', async () => {
      const electronIntegration = integration();
      const setupHook = electronIntegration.hooks['astro:config:setup'];

      if (!setupHook) throw new Error('Setup hook not defined');

      await setupHook({
        config: mockConfig,
        command: 'dev',
        updateConfig: mockUpdateConfig,
        isRestart: false,
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
        addClientDirective: vi.fn(),
        addMiddleware: vi.fn(),
        addDevToolbarApp: vi.fn(),
        addDevOverlayPlugin: vi.fn(),
      });

      // Get the first call arguments
      const updateConfigCall = mockUpdateConfig.mock.calls[0][0];
      // Wait for the plugin promise to resolve
      const resolvedPlugins = await updateConfigCall.vite.plugins[0];

      expect(resolvedPlugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'vite-plugin-electron',
            apply: 'serve',
          }),
          expect.objectContaining({
            name: 'vite-plugin-electron',
            apply: 'build',
          }),
        ])
      );
    });

    it('should use custom entry points when provided in config', async () => {
      const customConfig = {
        main: {
          entry: 'custom/main.ts',
        },
        preload: {
          input: 'custom/preload.ts',
        },
      };

      const electronIntegration = integration(customConfig);
      const setupHook = electronIntegration.hooks['astro:config:setup'];

      if (!setupHook) throw new Error('Setup hook not defined');

      await setupHook({
        config: mockConfig,
        command: 'dev',
        updateConfig: mockUpdateConfig,
        isRestart: false,
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
        addClientDirective: vi.fn(),
        addMiddleware: vi.fn(),
        addDevToolbarApp: vi.fn(),
        addDevOverlayPlugin: vi.fn(),
      });

      // Get the first call arguments
      const updateConfigCall = mockUpdateConfig.mock.calls[0][0];
      // Wait for the plugin promise to resolve
      const resolvedPlugins = await updateConfigCall.vite.plugins[0];

      expect(resolvedPlugins).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'vite-plugin-electron',
            apply: 'serve',
          }),
          expect.objectContaining({
            name: 'vite-plugin-electron',
            apply: 'build',
          }),
        ])
      );
    });
  });

  describe('astro:build:done hook', () => {
    it('should process routes and update file paths', async () => {
      const mockRoute: RouteData = {
        route: '/',
        component: '/src/pages/index.astro',
        generate: () => 'test content',
        params: [],
        pattern: /^\/$/,
        prerender: true,
        distURL: new URL('file:///mock/dist/index.html'),
        segments: [[{ content: '', dynamic: false, spread: false }]],
        type: 'page',
        fallbackRoutes: [],
        isIndex: true,
      };

      const electronIntegration = integration();
      const buildHook = electronIntegration.hooks['astro:build:done'];

      if (!buildHook) throw new Error('Build hook not defined');

      // Mock readFile to return content for this specific test
      mockReadFile.mockResolvedValueOnce(
        'test content with /astro-electron-ts/path'
      );

      await buildHook({
        dir: new URL('file:///mock/dist/'),
        routes: [mockRoute],
        logger: mockLogger,
        pages: [{ pathname: '/' }],
        cacheManifest: false,
      });

      // Use mockReadFile and mockWriteFile directly
      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        'utf-8'
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expect.any(String)
      );
    });
  });
});
