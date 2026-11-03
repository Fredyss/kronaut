import { appFile, isBase, tierOf, WIRING_FOLDERS } from './folders.ts';
import { type ImportGraph, isTesting } from './structure.ts';

const CATALOGS = 'web/i18n';

function folderOf(file: string): { app: string; folder: string | undefined } | undefined {
  const found = appFile(file);
  return found === undefined || isTesting(file) ? undefined : found;
}

function breaksOrder(source: string, tier: number, target: string): boolean {
  const node = folderOf(target);
  if (node === undefined || node.folder === source || !source.startsWith(`${node.app}/`)) {
    return false;
  }
  if (node.folder === undefined || WIRING_FOLDERS.has(node.folder)) {
    return node.folder !== CATALOGS;
  }
  if (isBase(node.folder)) return false;
  return (tierOf(node.folder) ?? Number.POSITIVE_INFINITY) <= tier;
}

export function tierBreaks(graph: ImportGraph): string[] {
  return [...graph]
    .flatMap(([file, targets]) => {
      const source = folderOf(file)?.folder;
      const tier = source === CATALOGS ? Number.POSITIVE_INFINITY : tierOf(source ?? '');
      if (source === undefined || tier === undefined) return [];
      return targets
        .filter((target) => breaksOrder(source, tier, target))
        .map((target) => `${file} -> ${target}`);
    })
    .sort();
}

export function untieredFolders(graph: ImportGraph): string[] {
  const folders = new Set([...graph.keys()].flatMap((file) => folderOf(file)?.folder ?? []));
  return [...folders]
    .filter((f) => tierOf(f) === undefined && !WIRING_FOLDERS.has(f))
    .filter((f) => !isBase(f) || f.split('/').length !== 3)
    .sort();
}
