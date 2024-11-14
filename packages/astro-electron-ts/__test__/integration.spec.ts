import type { AstroConfig, AstroIntegrationLogger, RouteData } from 'astro';
import fs from 'node:fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integration } from '../src/integration';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock vite-plugin-electron
vi.mock('vite-plugin-electron/simple', () => ({
  default: vi.fn(() => ({ name: 'vite-plugin-electron' })),
}));

// Mock minimal AstroConfig
const mockAstroConfig: AstroConfig = {
  root: new URL('file:///project/'),
  srcDir: new URL('file:///project/src/'),
  publicDir: new URL('file:///project/public/'),
  outDir: new URL('file:///project/dist/'),
  cacheDir: new URL('file:///project/.astro/'),
  scopedStyleStrategy: 'where',
  devToolbar: {
    enabled: true,
  },
  security: {
    checkOrigin: true,
  },
  legacy: {
    astroFlavoredMarkdown: false,
  },
  experimental: {
    directRenderScript: false,
    contentCollectionCache: false,
    clientPrerender: false,
    globalRoutePriority: false,
    contentIntellisense: false,
    contentLayer: false,
    serverIslands: false,
  },
  i18n: undefined,
  build: {
    format: 'directory',
    client: new URL('file:///project/dist/client/'),
    server: new URL('file:///project/dist/server/'),
    assets: 'assets',
    serverEntry: 'entry.mjs',
    redirects: false,
    inlineStylesheets: 'auto',
    concurrency: 5,
  },
  server: {
    host: true,
    port: 3000,
    open: false,
  },
  integrations: [],
  redirects: {},
  site: 'http://localhost:3000',
  base: '/',
  trailingSlash: 'ignore',
  output: 'static',
  adapter: undefined,
  image: {
    service: { entrypoint: 'astro/assets/services/sharp', config: {} },
    domains: [],
    remotePatterns: [],
  },
  compressHTML: true,
  vite: {},
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      langs: [],
      theme: 'github-dark',
      wrap: true,
      langAlias: {},
      themes: {},
      transformers: [],
    },
    remarkPlugins: [],
    rehypePlugins: [],
    remarkRehype: {},
    gfm: true,
    smartypants: true,
  },
};

// Mock RouteData
const mockRouteData: RouteData = {
  route: '/',
  component: '',
  generate: () => '',
  params: [],
  pattern: /\//,
  segments: [[]],
  type: 'page',
  prerender: false,
  distURL: new URL('file:///project/dist/index.html'),
  pathname: '/',
  fallbackRoutes: [],
  isIndex: false,
};

// Create mock logger
const mockLogger: AstroIntegrationLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  options: {
    level: 'info',
    dest: {
      write: () => true,
    },
  },
  label: 'astro',
  fork: () => mockLogger,
};

describe('astro Electron Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('astro:config:setup hook', () => {
    it('should set base path in build command', () => {
      const updateConfig = vi.fn();
      const electronIntegration = integration();

      electronIntegration.hooks['astro:config:setup']?.({
        config: mockAstroConfig,
        command: 'build',
        updateConfig,
        isRestart: false,
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
        addMiddleware: vi.fn(),
        addDevToolbarApp: vi.fn(),
        addClientDirective: vi.fn(),
        addDevOverlayPlugin: vi.fn(),
      });

      expect(updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          base: '/astro-electron-ts',
        }),
      );
    });

    it('should use default entry points when no config provided', () => {
      const updateConfig = vi.fn();
      const electronIntegration = integration();

      electronIntegration.hooks['astro:config:setup']?.({
        config: mockAstroConfig,
        command: 'dev',
        updateConfig,
        isRestart: false,
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
        addMiddleware: vi.fn(),
        addDevToolbarApp: vi.fn(),
        addClientDirective: vi.fn(),
        addDevOverlayPlugin: vi.fn(),
      });

      expect(updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          vite: {
            plugins: [
              expect.objectContaining({
                name: 'vite-plugin-electron',
              }),
            ],
          },
        }),
      );
    });

    it('should use custom entry points when provided', () => {
      const updateConfig = vi.fn();
      const customConfig = {
        main: {
          entry: 'custom/main.ts',
        },
        preload: {
          input: 'custom/preload.ts',
        },
      };

      const electronIntegration = integration(customConfig);
      electronIntegration.hooks['astro:config:setup']?.({
        config: mockAstroConfig,
        command: 'dev',
        updateConfig,
        isRestart: false,
        addRenderer: vi.fn(),
        addWatchFile: vi.fn(),
        injectScript: vi.fn(),
        injectRoute: vi.fn(),
        logger: mockLogger,
        addMiddleware: vi.fn(),
        addDevToolbarApp: vi.fn(),
        addClientDirective: vi.fn(),
        addDevOverlayPlugin: vi.fn(),
      });

      expect(updateConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          vite: {
            plugins: [
              expect.objectContaining({
                name: 'vite-plugin-electron',
              }),
            ],
          },
        }),
      );
    });
  });

  describe('astro:build:done hook', () => {
    it('should process routes and update file contents', async () => {
      const mockFileContent
        = 'content with /astro-electron-ts/path and /public/assets';
      const expectedContent = 'content with ./path and ./assets';

      (fs.readFile as any).mockResolvedValue(mockFileContent);

      const electronIntegration = integration();
      await electronIntegration.hooks['astro:build:done']?.({
        dir: new URL('file:///project/dist/'),
        routes: [mockRouteData],
        pages: [{ pathname: '/' }],
        logger: mockLogger,
        cacheManifest: false,
      });

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        'utf-8',
      );

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        expectedContent,
      );
    });

    it('should handle errors gracefully', async () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      (fs.readFile as any).mockRejectedValue(new Error('Test error'));

      const electronIntegration = integration();
      await electronIntegration.hooks['astro:build:done']?.({
        dir: new URL('file:///project/dist/'),
        routes: [mockRouteData],
        pages: [{ pathname: '/' }],
        logger: mockLogger,
        cacheManifest: false,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error processing route'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it('should skip routes without distURL', async () => {
      const routeWithoutDistURL: RouteData = {
        ...mockRouteData,
        distURL: undefined,
      };

      const electronIntegration = integration();
      await electronIntegration.hooks['astro:build:done']?.({
        dir: new URL('file:///project/dist/'),
        routes: [routeWithoutDistURL],
        pages: [{ pathname: '/' }],
        logger: mockLogger,
        cacheManifest: false,
      });

      expect(fs.readFile).not.toHaveBeenCalled();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });
});
