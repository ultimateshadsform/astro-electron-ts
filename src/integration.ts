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

function isHashRoutingComponent(content: string, filePath: string): boolean {
  // Check for common hash-based routing patterns
  const hashRoutingPatterns = [
    'createHashRouter', // react-router
    'createWebHashHistory', // vue-router
    'HashRouter', // react-router-dom
    'useHashRouter', // various frameworks
    'mode: "hash"', // various routers
    'type: "hash"', // various routers
  ];

  return (
    // Check if the file is a router configuration
    filePath.includes('router') ||
    // Or if it contains hash routing patterns
    hashRoutingPatterns.some((pattern) => content.includes(pattern))
  );
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
          vite: {
            base: './',
            build: {
              modulePreload: false,
              cssCodeSplit: true,
              rollupOptions: {
                output: {
                  format: 'es',
                  entryFileNames: '_astro/[name].[hash].js',
                  chunkFileNames: '_astro/[name].[hash].js',
                  assetFileNames: '_astro/[name].[hash][extname]',
                },
              },
            },
          },
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
              renderer: integrationConfig?.renderer as RendererOptions,
            }),
          ],
        },
      });
    },
    'astro:build:done': async ({
      routes,
    }: {
      dir: URL;
      routes: RouteData[];
    }) => {
      await Promise.all(
        routes.map(async (route) => {
          if (route.distURL) {
            const absolutePath = route.distURL.pathname
              .replace(/^\/([A-Za-z]:)/, '$1')
              .replace(/^\//, '');

            const projectRoot = process.cwd();
            const relativePath = path.relative(projectRoot, absolutePath);
            const normalizedPath = relativePath.replace(/\\/g, '/');

            try {
              const file = await fs.readFile(normalizedPath, 'utf-8');
              const isHashRouting = isHashRoutingComponent(
                file,
                normalizedPath
              );

              // First, fix the hydration script paths
              let updatedContent = file.replace(
                /\bhydrate=["']([^"']+)["']/g,
                (_match, hydratePath) => {
                  const cleanPath = hydratePath.replace(/^\/+/, '');
                  if (cleanPath.startsWith('_astro/')) {
                    return `hydrate="./_astro/${cleanPath.slice(6)}"`;
                  }
                  return `hydrate="./_astro/${cleanPath}"`;
                }
              );

              // Then handle all other paths
              updatedContent = updatedContent.replace(
                /(href|src|to)="([^"]*?)"|import\s*\(['"](.*?)['"]\)/g,
                (match, attr, pathname, importPath) => {
                  // Handle dynamic imports
                  if (importPath) {
                    const cleanImportPath = importPath.replace(/^\/+/, '');
                    if (
                      cleanImportPath.startsWith('./') ||
                      cleanImportPath.startsWith('../')
                    ) {
                      return match;
                    }
                    if (cleanImportPath.startsWith('_astro/')) {
                      return `import("./_astro/${cleanImportPath.slice(6)}")`;
                    }
                    return `import("./_astro/${cleanImportPath}")`;
                  }

                  if (!pathname) return match;

                  // Don't modify relative paths
                  if (pathname.startsWith('./') || pathname.startsWith('../')) {
                    return match;
                  }

                  // Clean the path
                  const cleanPath = pathname.replace(/^\/+/, '');

                  // Handle _astro directory assets
                  if (cleanPath.startsWith('_astro/')) {
                    return `${attr}="./_astro/${cleanPath.slice(6)}"`;
                  }

                  // Handle other assets
                  const isAsset = cleanPath.match(
                    /\.(js|css|png|jpg|jpeg|gif|svg|ico)$/
                  );
                  if (isAsset) {
                    return `${attr}="./${cleanPath}"`;
                  }

                  // Handle hash routes specifically
                  if (pathname.startsWith('/#/') || pathname.startsWith('#/')) {
                    // Just preserve the hash route as-is
                    return pathname.startsWith('/#/')
                      ? `${attr}="${pathname.slice(1)}"`
                      : match;
                  }

                  // Convert to hash routes only in hash-routing components
                  if (isHashRouting) {
                    const routePath = cleanPath.replace(/\/+$/, '');
                    return `${attr}="#/${routePath}"`;
                  }

                  // For regular links in production, use absolute paths from dist
                  const distPath = path
                    .join(projectRoot, 'dist')
                    .replace(/\\/g, '/');

                  if (pathname === '/') {
                    return `${attr}="file://${distPath}/index.html"`;
                  }

                  // For other paths, use absolute file:// URLs
                  const targetPath = cleanPath.endsWith('.html')
                    ? cleanPath
                    : `${cleanPath}/index.html`;
                  return `${attr}="file://${distPath}/${targetPath}"`;
                }
              );

              // Fix any remaining absolute paths to _astro directory
              updatedContent = updatedContent.replace(
                /(['"])\/\.?\/_astro\//g,
                '$1./_astro/'
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
