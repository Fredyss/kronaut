export const TIERS: Readonly<Record<string, readonly string[]>> = {
  server: ['actors', 'flow', 'steps', 'records', 'policy', 'access', 'identity', 'infrastructure'],
  web: ['pages', 'views', 'actions', 'lists', 'composer', 'content', 'records'],
};
export const WIRING_FOLDERS = new Set(['web/i18n', 'web/routes']);
const BASE_FOLDERS = new Set([
  'server/base/config',
  'server/base/crypto',
  'server/base/http',
  'server/base/providers',
  'web/base/api',
  'web/base/locale',
  'web/base/providers',
  'web/base/ui',
]);
const APP_FILE = /^apps\/(server|web)\/src\/(.+)$/;

export interface AppFile {
  readonly app: string;
  readonly folder: string | undefined;
  readonly path: string;
}

export function isGroup(app: string, name: string): boolean {
  return name === 'base' || (TIERS[app]?.includes(name) ?? false);
}

export function appFile(file: string): AppFile | undefined {
  const [, app, path] = APP_FILE.exec(file) ?? [];
  if (app === undefined || path === undefined) return undefined;
  const [first = '', second, third] = path.split('/');
  if (second === undefined) return { app, folder: undefined, path };
  const nested = isGroup(app, first) && third !== undefined;
  return { app, folder: nested ? `${app}/${first}/${second}` : `${app}/${first}`, path };
}

export function isBase(folder: string): boolean {
  return BASE_FOLDERS.has(folder);
}

export function tierOf(folder: string): number | undefined {
  const [app = '', group = ''] = folder.split('/');
  const index = TIERS[app]?.indexOf(group) ?? -1;
  return index === -1 || folder.split('/').length !== 3 ? undefined : index + 1;
}
