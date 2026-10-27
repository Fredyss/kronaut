import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../contract/openapi.json',
  output: { path: 'src/gen', importFileExtension: '.ts' },
  plugins: [
    { name: '@hey-api/client-fetch', throwOnError: true },
    '@hey-api/typescript',
    '@hey-api/sdk',
  ],
});
