import { fileURLToPath } from 'node:url';
import type { CompilerOptions } from '@inlang/paraglide-js';

const COMPILER = {
  strategy: ['globalVariable', 'baseLocale'],
  outputStructure: 'locale-modules',
  emitGitIgnore: false,
  emitPrettierIgnore: false,
  emitReadme: false,
  includeEslintDisableComment: false,
} as const satisfies Omit<CompilerOptions, 'project' | 'outdir'>;

export const PARAGLIDE = {
  project: fileURLToPath(new URL('./project.inlang', import.meta.url)),
  outdir: fileURLToPath(new URL('./src/paraglide', import.meta.url)),
  ...COMPILER,
} as const satisfies CompilerOptions;

export const PARAGLIDE_CLI = {
  project: fileURLToPath(new URL('./cli.inlang', import.meta.url)),
  outdir: fileURLToPath(new URL('./src/paraglide-cli', import.meta.url)),
  ...COMPILER,
} as const satisfies CompilerOptions;
