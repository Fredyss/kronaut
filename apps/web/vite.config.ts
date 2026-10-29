import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { PARAGLIDE, PARAGLIDE_GROUPS } from '@kronaut/i18n/config';
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

const ROUTE_CATALOG = /paraglide-(\w+)\/(?:messages\/)?(en|sk|cs|registry)\.js$/;

// Locale modules are named after their file, so route catalogs would collide with the shell's en/sk/cs chunks.
function routeCatalog(id: string | null): string | null {
  const [, group = '', file] = ROUTE_CATALOG.exec(id ?? '') ?? [];
  if (!Object.hasOwn(PARAGLIDE_GROUPS, group)) return null;
  return `messages-${group}-${file === 'registry' ? 'en' : file}`;
}

// sk and cs stay dynamic entries; capturing them in a group leaves a re-export facade behind.
function routeEnglish(id: string): string | null {
  const name = routeCatalog(id);
  return name?.endsWith('-en') === true ? name : null;
}

export default defineConfig({
  plugins: [
    paraglideVitePlugin(PARAGLIDE),
    ...Object.values(PARAGLIDE_GROUPS).map((options) => paraglideVitePlugin(options)),
    react(),
    tailwindcss(),
    preloadEnglish(),
  ],
  build: {
    outDir: 'dist/web',
    sourcemap: false,
    assetsInlineLimit: 0,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: routeEnglish }] },
        chunkFileNames: (chunk) =>
          `assets/${routeCatalog(chunk.facadeModuleId) ?? '[name]'}-[hash].js`,
      },
    },
  },
  server: {
    proxy: {
      '/v1': { target: api },
      '/oauth': { target: api },
    },
  },
});
