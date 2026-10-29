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

function project(name: string, outdir: string) {
  return {
    project: fileURLToPath(new URL(`./${name}.inlang`, import.meta.url)),
    outdir: fileURLToPath(new URL(`./src/${outdir}`, import.meta.url)),
    ...COMPILER,
  } as const satisfies CompilerOptions;
}

export const PARAGLIDE = project('project', 'paraglide');

export const PARAGLIDE_CLI = project('cli', 'paraglide-cli');

export const ROUTE_GROUPS = ['compose', 'calendar', 'media', 'inbox', 'settings'] as const;

export type RouteGroup = (typeof ROUTE_GROUPS)[number];

export const PARAGLIDE_GROUPS: Readonly<Record<RouteGroup, ReturnType<typeof project>>> = {
  compose: project('compose', 'paraglide-compose'),
  calendar: project('calendar', 'paraglide-calendar'),
  media: project('media', 'paraglide-media'),
  inbox: project('inbox', 'paraglide-inbox'),
  settings: project('settings', 'paraglide-settings'),
};
