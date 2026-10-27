import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { PARAGLIDE } from '@kronaut/i18n/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const api = process.env.KRONAUT_DEV_API ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [paraglideVitePlugin(PARAGLIDE), react(), tailwindcss()],
  build: {
    outDir: 'dist/web',
    sourcemap: false,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
  },
  server: {
    proxy: {
      '/v1': { target: api },
      '/oauth': { target: api },
    },
  },
});
