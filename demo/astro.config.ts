import { defineConfig } from 'astro/config';
import electron from '../src/index';

export default defineConfig({
  integrations: [electron()],
});
