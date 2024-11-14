import fs from 'fs/promises';
import path from 'path';
import vitePluginElectron from 'vite-plugin-electron/simple';
import { type RendererOptions } from 'vite-plugin-electron-renderer';
import type { AstroIntegration, AstroConfig, RouteData } from 'astro';
import type { UserConfig as ViteUserConfig } from 'vite';

interface ElectronIntegrationConfig {
  main?: {
    entry?: string;
    vite?: Partial<ViteUserConfig>;
  };
  preload?: {
    input?: string;
    vite?: Partial<ViteUserConfig>;
  };
  renderer?: Partial<RendererOptions>;
}

export const integration = (
  integrationConfig: ElectronIntegrationConfig = {}
): AstroIntegration => ({
  name: 'astro-electron-ts',
  hooks: {
    'astro:config:setup': ({
      config,
      command,
      updateConfig,
    }: {
      config: AstroConfig;
      command: string;
      updateConfig: (newConfig: Partial<AstroConfig>) => void;
    }) => {
      if (command === 'build') {
        updateConfig({
          base: './',
        });
      }

      // Add Vite plugin for Electron
      updateConfig({
        vite: {
          base: './',
          plugins: [
            vitePluginElectron({
              main: {
                entry: integrationConfig?.main?.entry || 'electron/main.ts',
                vite: integrationConfig?.main?.vite || config.vite,
              },
              preload: {
                input:
                  integrationConfig?.preload?.input || 'electron/preload.ts',
                vite: integrationConfig?.preload?.vite || config.vite,
              },
              renderer: integrationConfig?.renderer as RendererOptions,
            }),
          ],
        },
      });
    },
    'astro:build:done': async ({
      dir,
      routes,
    }: {
      dir: URL;
      routes: RouteData[];
    }) => {
      await Promise.all(
        routes.map(async (route) => {
          if (route.distURL) {
            const filePath = route.distURL.pathname;
            const normalizedPath = filePath
              .replace(/^\/([A-Za-z]:)/, '$1')
              .replace(/^\//, '')
              .replace(/\\/g, '/');

            try {
              const file = await fs.readFile(normalizedPath, 'utf-8');
              const localDir = path.dirname(normalizedPath);
              const rootDir = new URL(dir).pathname
                .replace(/^\/([A-Za-z]:)/, '$1')
                .replace(/\/$/, '');

              const relativePath = path
                .relative(localDir, rootDir)
                .replace(/\\/g, '/')
                .replace(/\/$/, '');

              const updatedContent = file.replace(
                /(href|src)="([^"]*?)"/g,
                (_match, attr, pathname) => {
                  // Don't modify hash routes at all
                  if (pathname.includes('#')) {
                    return `${attr}="${pathname}"`;
                  }

                  // Don't modify relative paths
                  if (!pathname.startsWith('/')) {
                    return `${attr}="${pathname}"`;
                  }

                  const prefix = relativePath ? relativePath : '.';

                  // Handle assets and HTML files
                  const isAsset = pathname.match(
                    /\.(js|css|png|jpg|jpeg|gif|svg|ico)$/
                  );
                  const adjustedPath = isAsset
                    ? pathname
                    : pathname.endsWith('/')
                    ? pathname + 'index.html'
                    : pathname.endsWith('.html')
                    ? pathname
                    : pathname + '/index.html';

                  return `${attr}="${prefix}${adjustedPath}"`;
                }
              );

              await fs.writeFile(normalizedPath, updatedContent);
            } catch (error) {
              console.error(`Error processing file ${normalizedPath}:`, error);
              throw error;
            }
          }
        })
      );
    },
  },
});
