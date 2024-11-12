// @ts-check
import { defineConfig } from 'astro/config';
import electron from 'astro-electron-ts';

// https://astro.build/config
export default defineConfig({
  integrations: [
    electron({
      main: {
        entry: '/electron/main.ts', // Path to your Electron main file
        vite: {}, // Vite-specific configurations
      },
      preload: {
        input: '/electron/preload.ts', // Path to your Electron preload file
        vite: {}, // Vite-specific configurations
      },
    }),
  ],
});
