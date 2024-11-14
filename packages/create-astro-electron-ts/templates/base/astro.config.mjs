// @ts-check
import { defineConfig } from 'astro/config';
import electron from 'astro-electron-ts';

// https://astro.build/config
export default defineConfig({
    integrations: [electron()],
});
