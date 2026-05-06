import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@decyphr/misneach-ui': path.resolve(__dirname, '../../libs/misneach-ui/src/index.ts')
    }
  },
  plugins: [sveltekit()]
});
