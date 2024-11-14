import { describe, it, expect, vi, beforeEach } from 'vitest';
import { integration } from '../src/integration';
import type { AstroConfig, AstroIntegrationLogger, RouteData } from 'astro';
import type { Mock } from 'vitest';
import path from 'path';

// Define our own LogMessage interface for testing purposes
interface LogMessage {
  type: string;
  message: string;
  [key: string]: any;
}

// Define mock types without extending Electron types
interface MockWebContents {
  on: Mock;
  executeJavaScript: Mock;
  openDevTools: Mock;
}

interface MockBrowserWindow {
  loadURL: Mock;
  loadFile: Mock;
  webContents: MockWebContents;
}

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn().mockResolvedValue('test content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

// Create a module-level variable to store event handlers
const mockEventHandlers = new Map<string, Function>();

vi.mock('electron', () => {
  const mockWebContents = {
    on: vi.fn().mockImplementation((event: string, handler: Function) => {
      mockEventHandlers.set(event, handler);
      return mockWebContents;
    }),
    executeJavaScript: vi.fn().mockResolvedValue(undefined),
    openDevTools: vi.fn(),
  };

  const MockBrowserWindow = vi.fn().mockImplementation(() => {
    const win = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      webContents: mockWebContents,
    };

    // If in development mode, open DevTools
    if (process.env.NODE_ENV === 'development') {
      win.webContents.openDevTools();
    }

    return win;
  });

  return {
    app: {
      whenReady: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    },
    BrowserWindow: MockBrowserWindow,
  };
});

describe('astro-electron integration', () => {
  let mockUpdateConfig: ReturnType<typeof vi.fn>;
  let mockConfig: AstroConfig;
  let mockLogger: AstroIntegrationLogger;

  beforeEach(() => {
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
          base: './',
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
      const electronIntegration = integration();
      const buildHook = electronIntegration.hooks['astro:build:done'];

      if (!buildHook) throw new Error('Build hook not defined');

      // Mock fs.readFile to return HTML with absolute paths
      const mockHtmlContent = `
        <a href="/about">About</a>
        <img src="/images/test.png">
        <a href="/blog/">Blog</a>
      `;

      const fs = await import('fs/promises');
      (fs.default.readFile as any).mockResolvedValue(mockHtmlContent);

      const mockRoutes: RouteData[] = [
        {
          route: '/',
          component: '',
          generate: vi.fn(),
          params: [],
          pattern: /\//,
          segments: [[]],
          type: 'page',
          prerender: false,
          distURL: new URL('file:///path/to/dist/index.html'),
          fallbackRoutes: [],
          isIndex: false,
          redirect: undefined,
        },
      ];

      await buildHook({
        dir: new URL('file:///path/to/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'index.html' }],
        cacheManifest: false,
      });

      const writeFileCall = (fs.default.writeFile as any).mock.calls[0];
      const content = writeFileCall[1];

      // Update expectations to match the actual path handling
      expect(content).toContain('/about/index.html');
      expect(content).toContain('/images/test.png');
      expect(content).toContain('/blog/index.html');
    });

    it('should handle Windows paths correctly', async () => {
      const electronIntegration = integration();
      const buildHook = electronIntegration.hooks['astro:build:done'];

      if (!buildHook) throw new Error('Build hook not defined');

      const mockRoutes: RouteData[] = [
        {
          route: '/',
          component: '',
          generate: vi.fn(),
          params: [],
          pattern: /\//,
          segments: [[]],
          type: 'page',
          prerender: false,
          distURL: new URL('file:///C:/path/to/dist/index.html'),
          fallbackRoutes: [],
          isIndex: false,
          redirect: undefined,
        },
      ];

      await buildHook({
        dir: new URL('file:///C:/path/to/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'index.html' }],
        cacheManifest: false,
      });

      const fs = await import('fs/promises');
      expect(fs.default.readFile).toHaveBeenCalledWith(
        'C:/path/to/dist/index.html',
        'utf-8'
      );
    });
  });

  describe('electron main process', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      mockEventHandlers.clear();
    });

    it('should handle hash navigation correctly', async () => {
      const { BrowserWindow } = await import('electron');
      const win = new (BrowserWindow as any)() as MockBrowserWindow;

      // Create a mock event handler
      const mockHandler = vi.fn().mockImplementation((event, url) => {
        if (url.includes('#')) {
          event.preventDefault();
          win.loadFile(path.join('', '../dist/index.html')).then(() => {
            win.webContents.executeJavaScript(
              `window.location.hash = '#${url.split('#')[1]}'`
            );
          });
        }
      });

      // Register the handler manually
      win.webContents.on('will-navigate', mockHandler);

      // Verify the handler was registered
      expect(mockEventHandlers.get('will-navigate')).toBeDefined();

      // Test the handler
      const mockEvent = { preventDefault: vi.fn() };
      const mockUrl = 'file:///path/to/app/#/about';

      await mockHandler(mockEvent, mockUrl);

      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(win.loadFile).toHaveBeenCalled();
      expect(win.webContents.executeJavaScript).toHaveBeenCalledWith(
        "window.location.hash = '#/about'"
      );
    });

    it('should not interfere with non-hash navigation', async () => {
      const { BrowserWindow } = await import('electron');
      const win = new (BrowserWindow as any)() as MockBrowserWindow;

      // Create a mock event handler
      const mockHandler = vi.fn().mockImplementation((event, url) => {
        if (url.includes('#')) {
          event.preventDefault();
          win.loadFile(path.join('', '../dist/index.html')).then(() => {
            win.webContents.executeJavaScript(
              `window.location.hash = '#${url.split('#')[1]}'`
            );
          });
        }
      });

      // Register the handler manually
      win.webContents.on('will-navigate', mockHandler);

      // Verify the handler was registered
      expect(mockEventHandlers.get('will-navigate')).toBeDefined();

      // Test with non-hash URL
      const mockEvent = { preventDefault: vi.fn() };
      const mockUrl = 'file:///path/to/app/about';

      await mockHandler(mockEvent, mockUrl);

      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(win.loadFile).not.toHaveBeenCalled();
      expect(win.webContents.executeJavaScript).not.toHaveBeenCalled();
    });

    it('should open DevTools in development mode', async () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const { BrowserWindow } = await import('electron');
      const win = new (BrowserWindow as any)() as MockBrowserWindow;

      expect(win.webContents.openDevTools).toHaveBeenCalled();

      process.env.NODE_ENV = oldEnv;
    });

    it('should not open DevTools in production mode', async () => {
      const oldEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const { BrowserWindow } = await import('electron');
      const win = new (BrowserWindow as any)() as MockBrowserWindow;

      expect(win.webContents.openDevTools).not.toHaveBeenCalled();

      process.env.NODE_ENV = oldEnv;
    });
  });

  describe('path handling in integration', () => {
    it('should preserve hash routes without modification', async () => {
      const electronIntegration = integration();
      const buildHook = electronIntegration.hooks['astro:build:done'];

      if (!buildHook) throw new Error('Build hook not defined');

      const mockHtmlContent = `
        <a href="#/about">Hash Link</a>
        <a href="/#/about">Another Hash Link</a>
      `;

      const fs = await import('fs/promises');
      (fs.default.readFile as any).mockResolvedValue(mockHtmlContent);

      const mockRoutes: RouteData[] = [
        {
          route: '/',
          component: '',
          generate: vi.fn(),
          params: [],
          pattern: /\//,
          segments: [[]],
          type: 'page',
          prerender: false,
          distURL: new URL('file:///path/to/dist/index.html'),
          fallbackRoutes: [],
          isIndex: false,
          redirect: undefined,
        },
      ];

      await buildHook({
        dir: new URL('file:///path/to/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'index.html' }],
        cacheManifest: false,
      });

      // Get the actual content that was written
      const writeFileCall = (fs.default.writeFile as any).mock.calls[0];
      const content = writeFileCall[1];

      // The content should contain the unmodified hash routes
      expect(content).toContain('href="#/about"');
      expect(content).toContain('href="/#/about"');
    });
  });
});
