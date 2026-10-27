import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { PARAGLIDE } from '@kronaut/i18n/config';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const api = process.env.KRONAUT_DEV_API ?? 'http://localhost:3000';

// i18n.ts awaits the English catalog at top level; without a hint the browser finds it only after the shell runs.
function preloadEnglish(): Plugin {
  return {
    name: 'kronaut:preload-en',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, { bundle }) {
        const chunk = Object.values(bundle ?? {}).find(
          (output) => output.type === 'chunk' && output.name === 'en',
        );
        if (chunk === undefined) throw new Error('the English catalog chunk is missing');
        return [
          {
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${chunk.fileName}` },
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  plugins: [paraglideVitePlugin(PARAGLIDE), react(), tailwindcss(), preloadEnglish()],
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
