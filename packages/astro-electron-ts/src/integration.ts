import type { AstroConfig, AstroIntegration, RouteData } from 'astro';
import type { UserConfig as ViteUserConfig } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import vitePluginElectron from 'vite-plugin-electron/simple';

interface ElectronIntegrationConfig {
  main?: {
    entry?: string;
    vite?: Partial<ViteUserConfig>;
  };
  preload?: {
    input?: string;
    vite?: Partial<ViteUserConfig>;
  };
  renderer?: Partial<ViteUserConfig>;
}

export function integration(integrationConfig: ElectronIntegrationConfig = {}): AstroIntegration {
  return {
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
            base: '/astro-electron-ts',
          });
        }

        // Add Vite plugin for Electron
        updateConfig({
          vite: {
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
                renderer: integrationConfig?.renderer || undefined,
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
            if (!route.distURL)
              return;

            try {
              const filePath = new URL(route.distURL).pathname;
              const fileContent = await fs.readFile(filePath, 'utf-8');
              if (!fileContent)
                return;

              const localDir = path.dirname(filePath);
              const relativePath = path.relative(localDir, new URL(dir).pathname);

              await fs.writeFile(
                filePath,
                fileContent.replaceAll(
                  /\/(astro-electron-ts|public)/g,
                  relativePath || '.',
                ),
              );
            }
            catch (error) {
              console.error(`Error processing route ${route.distURL}:`, error);
            }
          }),
        );
      },
    },
  };
}
