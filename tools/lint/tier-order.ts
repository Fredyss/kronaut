import { BASE_FOLDERS, type ImportGraph, isTesting, WIRING_FOLDERS } from './structure.ts';

const TIERS: Readonly<Record<string, readonly (readonly string[])[]>> = {
  server: [
    ['series', 'evergreen', 'post-import', 'destinations', 'media', 'meta', 'cli', 'system'],
    ['posts'],
    ['approvals', 'queue', 'tags', 'saved-texts', 'publish'],
    ['analytics', 'notifications'],
    ['approval-policy'],
    ['post-access', 'audit', 'channels'],
    ['auth', 'webhooks'],
    ['jobs', 'credentials', 'quota'],
  ],
  web: [
    ['post-page', 'channels-page', 'shell', 'settings'],
    ['calendar', 'approvals', 'evergreen'],
    ['post-actions', 'post-import', 'notifications'],
    ['inbox', 'media', 'system'],
    ['compose'],
    ['saved-texts', 'tags', 'series'],
    ['posts', 'channels', 'approval-policy', 'analytics', 'auth', 'theme'],
  ],
};
const TIER_OF = new Map<string, number>(
  Object.entries(TIERS).flatMap(([app, tiers]) =>
    tiers.flatMap((folders, index) => folders.map((f) => [`${app}/${f}`, index + 1] as const)),
  ),
);
const CATALOGS = 'web/i18n';
const APP_FILE = /^apps\/(server|web)\/src\/(?:([^/]+)\/.+|[^/]+)$/;

function nodeOf(file: string): { app: string; folder: string | undefined } | undefined {
  const [, app, folder] = APP_FILE.exec(file) ?? [];
  if (app === undefined || isTesting(file)) return undefined;
  return { app, folder: folder === undefined ? undefined : `${app}/${folder}` };
}

function breaksOrder(source: string, tier: number, target: string): boolean {
  const node = nodeOf(target);
  if (node === undefined || node.folder === source || !source.startsWith(`${node.app}/`)) {
    return false;
  }
  if (node.folder === undefined || WIRING_FOLDERS.has(node.folder)) {
    return node.folder !== CATALOGS;
  }
  if (BASE_FOLDERS.has(node.folder)) return false;
  return (TIER_OF.get(node.folder) ?? Number.POSITIVE_INFINITY) <= tier;
}

export function tierBreaks(graph: ImportGraph): string[] {
  return [...graph]
    .flatMap(([file, targets]) => {
      const source = nodeOf(file)?.folder;
      const tier = source === CATALOGS ? Number.POSITIVE_INFINITY : TIER_OF.get(source ?? '');
      if (source === undefined || tier === undefined) return [];
      return targets
        .filter((target) => breaksOrder(source, tier, target))
        .map((target) => `${file} -> ${target}`);
    })
    .sort();
}

export function untieredFolders(graph: ImportGraph): string[] {
  const folders = new Set([...graph.keys()].flatMap((file) => nodeOf(file)?.folder ?? []));
  return [...folders]
    .filter((f) => !TIER_OF.has(f) && !BASE_FOLDERS.has(f) && !WIRING_FOLDERS.has(f))
    .sort();
}
