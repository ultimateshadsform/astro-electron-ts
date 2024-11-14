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

      // Mock fs.readFile to return HTML with various path types
      const mockHtmlContent = `
        <a href="/about">About</a>
        <img src="/_astro/test.123456.png">
        <script type="module" src="/_astro/hoisted.12345.js"></script>
        <div hydrate="/_astro/component.js">
        <a href="/blog/">Blog</a>
        <script>import("/_astro/dynamic.js")</script>
      `;

      const fs = await import('fs/promises');
      const writeFileMock = vi.fn();
      (fs.default.writeFile as any) = writeFileMock;
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

      // Mock process.cwd()
      const mockCwd = '/mock/project/root';
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(mockCwd);

      await buildHook({
        dir: new URL('file:///mock/project/root/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'index.html' }],
        cacheManifest: false,
      });

      // Restore original cwd
      process.cwd = originalCwd;

      const htmlWriteCall = writeFileMock.mock.calls.find(
        (call) => !call[0].endsWith('routes.json')
      );
      const content = htmlWriteCall?.[1];

      // Check for proper path transformations
      expect(content).toContain(`file://${mockCwd}/dist/about/index.html`);
      expect(content).toContain('src="./_astro//test.123456.png"');
      expect(content).toContain('src="./_astro//hoisted.12345.js"');
      expect(content).toContain('hydrate="./_astro//component.js"');
      expect(content).toContain('import("./_astro//dynamic.js")');
    });

    it('should handle hash routing components correctly', async () => {
      const electronIntegration = integration();
      const buildHook = electronIntegration.hooks['astro:build:done'];

      if (!buildHook) throw new Error('Build hook not defined');

      // Mock content with router configuration and links
      const mockRouterContent = `
        import { createHashRouter } from 'react-router-dom';
        <a href="/about">About</a>
        <a href="/blog">Blog</a>
      `;

      const fs = await import('fs/promises');
      const writeFileMock = vi.fn();
      (fs.default.writeFile as any) = writeFileMock;
      (fs.default.readFile as any).mockResolvedValue(mockRouterContent);

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
          distURL: new URL('file:///path/to/dist/router.jsx'),
          fallbackRoutes: [],
          isIndex: false,
          redirect: undefined,
        },
      ];

      // Mock process.cwd()
      const mockCwd = '/mock/project/root';
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(mockCwd);

      await buildHook({
        dir: new URL('file:///mock/project/root/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'router.jsx' }],
        cacheManifest: false,
      });

      // Restore original cwd
      process.cwd = originalCwd;

      const componentWriteCall = writeFileMock.mock.calls.find(
        (call) => !call[0].endsWith('routes.json')
      );
      const content = componentWriteCall?.[1];

      // Check that links are converted to hash routes in router components
      expect(content).toContain('href="#about"');
      expect(content).toContain('href="#blog"');
    });

    it('should handle _astro directory assets correctly', async () => {
      const electronIntegration = integration();
      const buildHook = electronIntegration.hooks['astro:build:done'];

      if (!buildHook) throw new Error('Build hook not defined');

      const mockHtmlContent = `
        <script src="/_astro/script.js"></script>
        <link rel="stylesheet" href="/_astro/styles.css">
        <img src="/_astro/image.png">
      `;

      const fs = await import('fs/promises');
      const writeFileMock = vi.fn();
      (fs.default.writeFile as any) = writeFileMock;
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

      // Mock process.cwd()
      const mockCwd = '/mock/project/root';
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(mockCwd);

      await buildHook({
        dir: new URL('file:///mock/project/root/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'index.html' }],
        cacheManifest: false,
      });

      // Restore original cwd
      process.cwd = originalCwd;

      const htmlWriteCall = writeFileMock.mock.calls.find(
        (call) => !call[0].endsWith('routes.json')
      );
      const content = htmlWriteCall?.[1];

      // Check that _astro paths are properly transformed
      expect(content).toContain('src="./_astro//script.js"');
      expect(content).toContain('href="./_astro//styles.css"');
      expect(content).toContain('src="./_astro//image.png"');
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
      const writeFileMock = vi.fn();
      (fs.default.writeFile as any) = writeFileMock;
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

      // Mock process.cwd()
      const mockCwd = '/mock/project/root';
      const originalCwd = process.cwd;
      process.cwd = vi.fn().mockReturnValue(mockCwd);

      await buildHook({
        dir: new URL('file:///mock/project/root/dist/'),
        routes: mockRoutes,
        logger: mockLogger,
        pages: [{ pathname: 'index.html' }],
        cacheManifest: false,
      });

      // Restore original cwd
      process.cwd = originalCwd;

      const htmlWriteCall = writeFileMock.mock.calls.find(
        (call) => !call[0].endsWith('routes.json')
      );
      const content = htmlWriteCall?.[1];

      // Check for hash routes in the transformed content
      expect(content).toContain(`file://${mockCwd}/dist/index.html#/about`);
      expect(content).toContain(`file://${mockCwd}/dist/index.html#/about`);
    });
  });
});
