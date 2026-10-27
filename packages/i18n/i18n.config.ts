import { fileURLToPath } from 'node:url';
import type { CompilerOptions } from '@inlang/paraglide-js';

export const PARAGLIDE = {
  project: fileURLToPath(new URL('./project.inlang', import.meta.url)),
  outdir: fileURLToPath(new URL('./src/paraglide', import.meta.url)),
  strategy: ['globalVariable', 'baseLocale'],
  outputStructure: 'locale-modules',
  emitGitIgnore: false,
  emitPrettierIgnore: false,
  emitReadme: false,
  includeEslintDisableComment: false,
} as const satisfies CompilerOptions;
